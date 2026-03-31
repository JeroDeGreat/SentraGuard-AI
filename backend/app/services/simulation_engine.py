from __future__ import annotations

import asyncio
from random import Random

from sqlalchemy import select
from sqlalchemy.orm import sessionmaker

from simulation.scenarios import RISK_SCENARIOS, SAFE_EVENT_TYPES

from ..config import get_settings
from ..models import Employee
from ..realtime import RealtimeHub
from ..schemas import EventIngestItem
from ..utils import loads_json
from .monitoring import MonitoringService


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

            sample_size = min(len(employees), self._random.randint(3, 6))
            selected = self._random.sample(employees, sample_size)

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

    def _build_event(self, employee: Employee) -> EventIngestItem:
        baseline = loads_json(employee.baseline_profile, {})
        active = self._scenario_state.get(employee.employee_code)
        if active and int(active.get("ticks_left", 0)) > 0:
            scenario_name = str(active["scenario"])
            active["ticks_left"] = int(active["ticks_left"]) - 1
            return self._scenario_event(employee, baseline, scenario_name)

        trigger_anomaly = self._random.random() < 0.14 or float(employee.current_risk_score) > 60
        if trigger_anomaly:
            scenario_name = self._random.choice(list(RISK_SCENARIOS.keys()))
            self._scenario_state[employee.employee_code] = {
                "scenario": scenario_name,
                "ticks_left": self._random.randint(1, 3),
            }
            return self._scenario_event(employee, baseline, scenario_name)

        return self._safe_event(employee, baseline)

    def _safe_event(self, employee: Employee, baseline: dict[str, object]) -> EventIngestItem:
        event_type = self._random.choice(SAFE_EVENT_TYPES)
        if event_type == "login_success":
            details = {"location": baseline.get("home_location", "HQ-West"), "network_trust": "managed"}
        elif event_type == "file_download":
            details = {
                "bytes_mb": self._random.randint(20, int(baseline.get("typical_transfer_mb", 120))),
                "classification": "internal",
            }
        else:
            details = {
                "classification": "confidential",
                "resource": f"{employee.department.lower()}-portal",
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
    ) -> EventIngestItem:
        scenario = RISK_SCENARIOS[scenario_name]
        details = dict(scenario["details"])
        if scenario_name == "after_hours_access":
            details["force_after_hours"] = True
            details["location"] = "Untrusted VPN Node"
        if scenario_name == "credential_stuffing":
            details["ip_reputation"] = "suspicious"
        if scenario_name == "download_burst":
            details["resource"] = f"{employee.department.lower()}-archive"
        if scenario_name == "external_transfer":
            details["device_label"] = "Personal USB-C SSD"
        if scenario_name == "usb_exfiltration" and baseline.get("usb_allowed"):
            details["device_label"] = "Unknown removable storage"

        return EventIngestItem(
            employee_code=employee.employee_code,
            employee_name=employee.name,
            department=employee.department,
            title=employee.title,
            event_type=scenario["event_type"],
            source="simulation-engine",
            details=details,
        )
