from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import verify_ingest_access
from ..schemas import EventIngestRequest, IngestResult


router = APIRouter(prefix="/api/v1/logs", tags=["ingestion"])


@router.post("/ingest", response_model=IngestResult)
async def ingest_events(
    payload: EventIngestRequest,
    request: Request,
    db: Session = Depends(get_db),
    access: str = Depends(verify_ingest_access),
) -> IngestResult:
    monitoring_service = request.app.state.monitoring_service
    accepted = 0
    flagged_high = 0
    alerts_created = 0
    items: list[dict[str, object]] = []

    for item in payload.events:
        outcome = monitoring_service.record_event(db, item, mode="real")
        accepted += 1
        if outcome.employee.current_risk_level == "High":
            flagged_high += 1
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
                "employee_code": outcome.employee.employee_code,
                "risk_score": outcome.employee.current_risk_score,
                "risk_level": outcome.employee.current_risk_level,
                "event_type": outcome.activity.event_type,
                "source": access,
            }
        )

    return IngestResult(
        accepted=accepted,
        flagged_high_risk=flagged_high,
        alerts_created=alerts_created,
        items=items,
    )
