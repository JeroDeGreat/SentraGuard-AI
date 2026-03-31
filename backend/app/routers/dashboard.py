from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_admin
from ..models import AdminUser
from ..schemas import EmployeeDetailResponse, OverviewResponse, RulesResponse
from ..services.risk_engine import RULES_CATALOG


router = APIRouter(prefix="/api/v1", tags=["dashboard"])


@router.get("/overview", response_model=OverviewResponse)
def overview(
    request: Request,
    db: Session = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin),
) -> OverviewResponse:
    state = request.app.state
    payload = state.monitoring_service.build_overview(
        db=db,
        mode=state.simulation_engine.mode,
        websocket_clients=state.realtime_hub.connection_count,
    )
    return OverviewResponse(**payload)


@router.get("/employees/{employee_id}", response_model=EmployeeDetailResponse)
def employee_detail(
    employee_id: int,
    request: Request,
    db: Session = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin),
) -> EmployeeDetailResponse:
    payload = request.app.state.monitoring_service.build_employee_detail(db, employee_id)
    if payload is None:
        raise HTTPException(status_code=404, detail="Employee not found")
    return EmployeeDetailResponse(**payload)


@router.get("/rules", response_model=RulesResponse)
def rules(admin: AdminUser = Depends(get_current_admin)) -> RulesResponse:
    return RulesResponse(threshold=70, rules=RULES_CATALOG)
