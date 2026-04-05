from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from ..config import get_settings
from ..database import get_db
from ..deps import get_current_admin
from ..models import AdminUser
from ..schemas import AuditLogResponse, ModeUpdateRequest
from ..services.audit_service import AuditService


router = APIRouter(prefix="/api/v1/system", tags=["system"])
audit_service = AuditService()


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/mode")
def get_mode(request: Request, admin: AdminUser = Depends(get_current_admin)) -> dict[str, str | bool]:
    return {
        "mode": request.app.state.simulation_engine.mode,
        "simulation_enabled": get_settings().allow_simulation,
    }


@router.post("/mode")
async def set_mode(
    payload: ModeUpdateRequest,
    request: Request,
    db: Session = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin),
) -> dict[str, str]:
    await request.app.state.simulation_engine.set_mode(payload.mode)
    audit_service.record(
        db,
        admin,
        action="mode_changed",
        target="system",
        details={"mode": payload.mode},
    )
    db.commit()
    return {"mode": payload.mode}


@router.get("/audit", response_model=list[AuditLogResponse])
def recent_audit_logs(
    db: Session = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin),
) -> list[AuditLogResponse]:
    entries = audit_service.recent(db, limit=14)
    return [AuditLogResponse(**audit_service.serialize(entry)) for entry in entries]
