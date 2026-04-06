from __future__ import annotations

import asyncio
from random import Random
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import sessionmaker

from simulation.scenarios import RISK_SCENARIOS

from ..config import get_settings
from ..models import Employee
from ..realtime import RealtimeHub
from ..schemas import EventIngestItem
from ..utils import loads_json, utcnow
from .monitoring import MonitoringService


LOCATION_TIMEZONE_OFFSETS = {
    "HQ-West": -5,
    "HQ-East": 0,
    "Branch-Delta": 5,
    "Remote": 2,
}

SIMULATION_TEMPOS: dict[str, dict[str, float | tuple[int, int] | list[int]]] = {
    "calm": {
        "activity_multiplier": 0.82,
        "scenario_multiplier": 0.74,
        "idle_skip_chance": 0.26,
        "event_budget_weights": [13, 34, 30, 17, 6],
        "cooldown_range": (10, 18),
    },
    "balanced": {
        "activity_multiplier": 1.0,
        "scenario_multiplier": 1.0,
        "idle_skip_chance": 0.18,
        "event_budget_weights": [8, 28, 33, 21, 10],
        "cooldown_range": (8, 16),
    },
    "demo": {
        "activity_multiplier": 1.3,
        "scenario_multiplier": 1.8,
        "idle_skip_chance": 0.08,
        "event_budget_weights": [3, 18, 31, 28, 20],
        "cooldown_range": (4, 9),
    },
}


class SimulationEngine:
    def __init__(
        self,
        session_factory: sessionmaker,
        monitoring_service: MonitoringService,
        realtime_hub: RealtimeHub,
    ) -> None:
        self.settings = get_settings()
        self.session_factory = session_factory
        self.monitoring_service = monitoring_service
        self.realtime_hub = realtime_hub
        self.mode = self.settings.default_mode
        self.tempo = (
            self.settings.simulation_tempo
            if self.settings.simulation_tempo in SIMULATION_TEMPOS
            else "balanced"
        )
        self._task: asyncio.Task[None] | None = None
        self._random = Random(31)
        self._scenario_state: dict[str, dict[str, int | str]] = {}

    async def start(self) -> None:
        if not self.settings.allow_simulation:
            return
        if self._task and not self._task.done():
            return
        self._task = asyncio.create_task(self._run_loop())

    async def stop(self) -> None:
        if self._task is None:
            return
        self._task.cancel()
        try:
            await self._task
        except asyncio.CancelledError:
            pass
        self._task = None

    async def set_mode(self, mode: str) -> None:
        self.mode = mode
        await self.realtime_hub.broadcast("system.mode_changed", {"mode": mode})

    async def set_tempo(self, tempo: str) -> None:
        self.tempo = tempo if tempo in SIMULATION_TEMPOS else "balanced"
        await self.realtime_hub.broadcast("system.tempo_changed", {"tempo": self.tempo})

    async def reset_state(self) -> None:
        self._scenario_state.clear()
        self.mode = self.settings.default_mode
        self.tempo = (
            self.settings.simulation_tempo
            if self.settings.simulation_tempo in SIMULATION_TEMPOS
            else "balanced"
        )
        await self.realtime_hub.broadcast(
            "system.reset",
            {"mode": self.mode, "tempo": self.tempo},
        )

    def available_tempos(self) -> list[str]:
        return list(SIMULATION_TEMPOS.keys())

    async def _run_loop(self) -> None:
        while True:
            if self.mode == "simulation":
                await self._generate_tick()
            await asyncio.sleep(self.settings.simulation_tick_seconds)

    async def _generate_tick(self) -> None:
        with self.session_factory() as db:
            employees = db.scalars(select(Employee).order_by(Employee.id.asc())).all()
            if not employees:
                return

            self._age_scenario_state()
            forced_codes = {
                employee_code
                for employee_code, state in self._scenario_state.items()
                if state.get("scenario")
            }
            forced_employees = [employee for employee in employees if employee.employee_code in forced_codes]
            tempo_profile = self._tempo_profile()

            if not forced_employees and self._random.random() < float(tempo_profile["idle_skip_chance"]):
                return

            active_pool = [
                employee
                for employee in employees
                if employee.employee_code in forced_codes or self._should_emit_for_employee(employee)
            ]
            if not active_pool:
                return

            event_budget = self._random.choices(
                [0, 1, 2, 3, 4],
                weights=list(tempo_profile["event_budget_weights"]),
                k=1,
            )[0]
            event_budget = max(event_budget, len(forced_employees))
            if event_budget == 0:
                return

            selected: list[Employee] = forced_employees[:]
            selected_ids = {employee.id for employee in selected}
            remaining = [employee for employee in active_pool if employee.id not in selected_ids]
            if remaining and len(selected) < event_budget:
                selected.extend(self._random.sample(remaining, min(len(remaining), event_budget - len(selected))))

            for employee in selected:
                payload = self._build_event(employee)
                outcome = self.monitoring_service.record_event(db, payload, mode="simulation")
                serialized_employee = self.monitoring_service.serialize_employee(db, outcome.employee)
                serialized_activity = self.monitoring_service.serialize_activity(outcome.activity, outcome.employee)
                await self.realtime_hub.broadcast(
                    "activity.created",
                    {"employee": serialized_employee, "activity": serialized_activity},
                )
                if outcome.alert is not None:
                    await self.realtime_hub.broadcast(
                        "alert.created",
                        {"alert": self.monitoring_service.serialize_alert(outcome.alert, outcome.employee)},
                    )

    def _age_scenario_state(self) -> None:
        expired_codes: list[str] = []
        for employee_code, state in self._scenario_state.items():
            if not state.get("scenario") and int(state.get("cooldown", 0)) <= 0:
                expired_codes.append(employee_code)
                continue

            if not state.get("scenario") and int(state.get("cooldown", 0)) > 0:
                state["cooldown"] = int(state.get("cooldown", 0)) - 1

        for employee_code in expired_codes:
            self._scenario_state.pop(employee_code, None)

    def _should_emit_for_employee(self, employee: Employee) -> bool:
        baseline = loads_json(employee.baseline_profile, {})
        local_hour = self._employee_local_hour(baseline)
        probability = self._activity_probability(employee, baseline, local_hour)
        return self._random.random() < probability

    def _activity_probability(self, employee: Employee, baseline: dict[str, object], local_hour: int) -> float:
        login_window = baseline.get("login_window", {"start": 8, "end": 18})
        start = int(login_window.get("start", 8))
        end = int(login_window.get("end", 18))
        on_shift = start <= local_hour <= end
        near_shift = local_hour in {(start - 1) % 24, (end + 1) % 24}

        if on_shift:
            probability = 0.13
        elif near_shift:
            probability = 0.055
        elif employee.department == "Operations":
            probability = 0.035
        else:
            probability = 0.018

        multiplier = float(self._tempo_profile()["activity_multiplier"])
        return min(probability * multiplier, 0.42)

    def _build_event(self, employee: Employee) -> EventIngestItem:
        baseline = loads_json(employee.baseline_profile, {})
        local_hour = self._employee_local_hour(baseline)
        state = self._scenario_state.setdefault(employee.employee_code, {"scenario": "", "step_index": 0, "cooldown": 0})
        active_scenario = str(state.get("scenario") or "")

        if active_scenario:
            scenario = RISK_SCENARIOS[active_scenario]
            step_index = int(state.get("step_index", 0))
            payload = self._scenario_event(employee, baseline, active_scenario, step_index)
            next_index = step_index + 1
            if next_index >= len(scenario["steps"]):
                state["scenario"] = ""
                state["step_index"] = 0
            else:
                state["step_index"] = next_index
            self._scenario_state[employee.employee_code] = state
            return payload

        if int(state.get("cooldown", 0)) <= 0 and self._should_start_scenario(employee, baseline, local_hour):
            scenario_name = self._pick_scenario_name(employee, local_hour)
            cooldown_low, cooldown_high = self._tempo_profile()["cooldown_range"]
            state["scenario"] = scenario_name
            state["step_index"] = 0
            state["cooldown"] = self._random.randint(int(cooldown_low), int(cooldown_high))
            self._scenario_state[employee.employee_code] = state
            return self._scenario_event(employee, baseline, scenario_name, 0)

        return self._safe_event(employee, baseline, local_hour)

    def _should_start_scenario(self, employee: Employee, baseline: dict[str, object], local_hour: int) -> bool:
        login_window = baseline.get("login_window", {"start": 8, "end": 18})
        start = int(login_window.get("start", 8))
        end = int(login_window.get("end", 18))
        off_hours = local_hour < start or local_hour > end

        anomaly_rate = 0.01
        if float(employee.current_risk_score) >= 35:
            anomaly_rate += 0.016
        if float(employee.current_risk_score) >= 70:
            anomaly_rate += 0.018
        if off_hours:
            anomaly_rate += 0.008

        anomaly_rate *= float(self._tempo_profile()["scenario_multiplier"])
        return self._random.random() < min(anomaly_rate, 0.18)

    def _pick_scenario_name(self, employee: Employee, local_hour: int) -> str:
        weighted_names: list[str] = []
        for scenario_name, scenario in RISK_SCENARIOS.items():
            base_weight = int(scenario.get("weight", 1))
            departments = set(scenario.get("departments", set()))
            weight = base_weight + (2 if employee.department in departments else 0)
            if scenario_name == "after_hours_access" and (local_hour <= 6 or local_hour >= 20):
                weight += 2
            if scenario_name == "credential_stuffing" and float(employee.current_risk_score) >= 45:
                weight += 1
            weighted_names.extend([scenario_name] * max(weight, 1))

        return self._random.choice(weighted_names or list(RISK_SCENARIOS.keys()))

    def _safe_event(self, employee: Employee, baseline: dict[str, object], local_hour: int) -> EventIngestItem:
        login_window = baseline.get("login_window", {"start": 8, "end": 18})
        start = int(login_window.get("start", 8))
        end = int(login_window.get("end", 18))
        current_hour = utcnow().hour
        can_emit_login = start - 1 <= current_hour <= end + 1

        options = [
            ("file_download", 5),
            ("sensitive_access", 4),
            ("data_transfer", 3),
        ]
        if can_emit_login:
            options.append(("login_success", 3))

        event_type = self._random.choices([option[0] for option in options], weights=[option[1] for option in options], k=1)[0]
        typical_transfer = max(int(baseline.get("typical_transfer_mb", 120)), 40)

        if event_type == "login_success":
            details = {"location": baseline.get("home_location", "HQ-West"), "network_trust": "managed"}
        elif event_type == "file_download":
            details = {
                "bytes_mb": self._random.randint(12, max(int(typical_transfer * 0.75), 24)),
                "classification": "internal",
                "resource": f"{employee.department.lower().replace(' ', '-')}-workspace",
            }
        elif event_type == "data_transfer":
            details = {
                "channel": "managed-share",
                "bytes_mb": self._random.randint(8, max(int(typical_transfer * 0.45), 18)),
                "destination": "internal",
            }
        else:
            details = {
                "classification": "internal",
                "resource": f"{employee.department.lower().replace(' ', '-')}-portal",
            }

        return EventIngestItem(
            employee_code=employee.employee_code,
            employee_name=employee.name,
            department=employee.department,
            title=employee.title,
            event_type=event_type,
            source="simulation-engine",
            details=details,
        )

    def _scenario_event(
        self,
        employee: Employee,
        baseline: dict[str, object],
        scenario_name: str,
        step_index: int,
    ) -> EventIngestItem:
        scenario = RISK_SCENARIOS[scenario_name]
        steps: list[dict[str, Any]] = list(scenario["steps"])
        step = steps[min(step_index, len(steps) - 1)]
        details = dict(step["details"])

        if scenario_name == "download_burst":
            details["resource"] = f"{employee.department.lower().replace(' ', '-')}-archive"
        if scenario_name == "external_transfer":
            details.setdefault("destination", "external")
        if scenario_name == "usb_exfiltration" and baseline.get("usb_allowed"):
            details["device_label"] = "Unknown removable storage"

        return EventIngestItem(
            employee_code=employee.employee_code,
            employee_name=employee.name,
            department=employee.department,
            title=employee.title,
            event_type=str(step["event_type"]),
            source="simulation-engine",
            details=details,
            happened_at=utcnow(),
        )

    def _employee_local_hour(self, baseline: dict[str, object]) -> int:
        reference = utcnow()
        home_location = str(baseline.get("home_location", "HQ-West"))
        offset = LOCATION_TIMEZONE_OFFSETS.get(home_location, 0)
        return int((reference.hour + offset) % 24)

    def _tempo_profile(self) -> dict[str, float | tuple[int, int] | list[int]]:
        return SIMULATION_TEMPOS.get(self.tempo, SIMULATION_TEMPOS["balanced"])
