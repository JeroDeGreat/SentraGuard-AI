from __future__ import annotations

from random import Random
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from simulation.scenarios import INTERACTION_SCENARIOS

from ..database import get_db
from ..deps import get_current_admin
from ..models import AdminUser, Employee
from ..schemas import ControlEmitRequest, ControlEmitResponse, ControlScenarioResponse, EventIngestItem
from ..services.audit_service import AuditService


router = APIRouter(prefix="/api/v1/control", tags=["control"])
audit_service = AuditService()
random = Random(23)


@router.get("/scenarios", response_model=list[ControlScenarioResponse])
def list_control_scenarios(admin: AdminUser = Depends(get_current_admin)) -> list[ControlScenarioResponse]:
    return [
        ControlScenarioResponse(
            id=scenario_id,
            label=payload["label"],
            description=payload["description"],
            category=payload["category"],
            default_mode=payload["default_mode"],
            steps=len(payload["steps"]),
        )
        for scenario_id, payload in INTERACTION_SCENARIOS.items()
    ]


@router.post("/emit", response_model=ControlEmitResponse)
async def emit_control_scenario(
    payload: ControlEmitRequest,
    request: Request,
    db: Session = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin),
) -> ControlEmitResponse:
    scenario = INTERACTION_SCENARIOS.get(payload.scenario_id)
    if scenario is None:
        raise HTTPException(status_code=404, detail="Scenario not found")

    employee = _resolve_employee(db, payload)
    if employee is None:
        raise HTTPException(status_code=404, detail="Employee not found")

    target_mode = (
        request.app.state.simulation_engine.mode if payload.target_mode == "current" else payload.target_mode
    )
    monitoring_service = request.app.state.monitoring_service

    accepted = 0
    alerts_created = 0
    items: list[dict[str, Any]] = []
    high_risk = False

    for _ in range(payload.repeat):
        for step in scenario["steps"]:
            details = _build_step_details(employee, dict(step["details"]))
            item = EventIngestItem(
                employee_code=employee.employee_code,
                employee_name=payload.employee_name or employee.name,
                department=payload.department or employee.department,
                title=payload.title or employee.title,
                event_type=step["event_type"],
                source="control-studio",
                details=details,
            )
            outcome = monitoring_service.record_event(db, item, mode=target_mode)
            employee = outcome.employee
            accepted += 1
            high_risk = high_risk or outcome.employee.current_risk_level == "High"
            if outcome.alert is not None:
                alerts_created += 1

            serialized_employee = monitoring_service.serialize_employee(db, outcome.employee)
            serialized_activity = monitoring_service.serialize_activity(outcome.activity, outcome.employee)
            await request.app.state.realtime_hub.broadcast(
                "activity.created",
                {"employee": serialized_employee, "activity": serialized_activity},
            )
            if outcome.alert is not None:
                await request.app.state.realtime_hub.broadcast(
                    "alert.created",
                    {"alert": monitoring_service.serialize_alert(outcome.alert, outcome.employee)},
                )

            items.append(
                {
                    "event_type": outcome.activity.event_type,
                    "risk_score": serialized_employee["current_risk_score"],
                    "risk_level": serialized_employee["current_risk_level"],
                    "source": "control-studio",
                }
            )

    audit_service.record(
        db,
        admin,
        action="control_scenario_emitted",
        target=payload.scenario_id,
        details={
            "employee_code": employee.employee_code,
            "target_mode": target_mode,
            "repeat": payload.repeat,
        },
    )
    db.commit()

    return ControlEmitResponse(
        scenario_id=payload.scenario_id,
        target_mode=target_mode,
        employee_code=employee.employee_code,
        accepted=accepted,
        alerts_created=alerts_created,
        flagged_high_risk=high_risk,
        items=items,
    )


def _resolve_employee(db: Session, payload: ControlEmitRequest) -> Employee | None:
    if payload.employee_id is not None:
        return db.scalar(select(Employee).where(Employee.id == payload.employee_id))

    if payload.employee_code:
        return db.scalar(select(Employee).where(Employee.employee_code == payload.employee_code))

    employees = db.scalars(select(Employee).order_by(Employee.current_risk_score.asc(), Employee.id.asc())).all()
    if not employees:
        return None
    return random.choice(employees[: min(len(employees), 24)])


def _build_step_details(employee: Employee, details: dict[str, Any]) -> dict[str, Any]:
    department_slug = employee.department.lower().replace(" ", "-")

    resource = details.get("resource")
    if isinstance(resource, str):
        if resource in {"team-workspace", "restricted-archive"}:
            details["resource"] = f"{department_slug}-{resource}"
        elif resource in {"deal-room", "client-dossier", "monthly-reporting", "after-hours-vault"}:
            details["resource"] = f"{department_slug}-{resource}"

    location = details.get("location")
    if location == "HQ-West":
        details["location"] = employee.department == "Sales" and "HQ-East" or "HQ-West"

    return details
