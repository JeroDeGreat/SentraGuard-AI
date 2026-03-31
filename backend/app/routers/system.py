from __future__ import annotations

from fastapi import APIRouter, Depends, Request

from ..config import get_settings
from ..deps import get_current_admin
from ..models import AdminUser
from ..schemas import ModeUpdateRequest


router = APIRouter(prefix="/api/v1/system", tags=["system"])


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
    admin: AdminUser = Depends(get_current_admin),
) -> dict[str, str]:
    await request.app.state.simulation_engine.set_mode(payload.mode)
    return {"mode": payload.mode}
