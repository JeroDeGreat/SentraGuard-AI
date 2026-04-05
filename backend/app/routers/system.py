from __future__ import annotations

import os
import socket

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from ..config import get_settings
from ..database import get_db
from ..deps import get_current_admin
from ..models import AdminUser
from ..schemas import (
    AuditLogResponse,
    ModeUpdateRequest,
    SimulationTempoResponse,
    SimulationTempoUpdateRequest,
    SystemGuideResponse,
)
from ..services.audit_service import AuditService


router = APIRouter(prefix="/api/v1/system", tags=["system"])
audit_service = AuditService()


def _discover_ipv4_addresses() -> list[str]:
    addresses: set[str] = set()

    try:
        hostname = socket.gethostname()
        for info in socket.getaddrinfo(hostname, None, socket.AF_INET, socket.SOCK_STREAM):
            ip_address = info[4][0]
            if not ip_address.startswith("127."):
                addresses.add(ip_address)
    except OSError:
        pass

    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as probe:
            probe.connect(("8.8.8.8", 80))
            ip_address = probe.getsockname()[0]
            if ip_address and not ip_address.startswith("127."):
                addresses.add(ip_address)
    except OSError:
        pass

    return sorted(addresses)


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/guide", response_model=SystemGuideResponse)
def system_guide(
    request: Request,
    admin: AdminUser = Depends(get_current_admin),
) -> SystemGuideResponse:
    settings = get_settings()
    browser_origin = str(request.base_url).rstrip("/")
    docs_url = f"{browser_origin}/docs"
    bind_host = os.getenv("SENTRAGUARD_HOST", "127.0.0.1").strip().lower()
    share_mode_enabled = bind_host not in {"", "127.0.0.1", "localhost"}
    port = request.url.port or (443 if request.url.scheme == "https" else 80)

    local_targets = [
        {
            "label": "Current app",
            "url": browser_origin,
            "note": "Use this on the current machine for the live UI.",
        },
        {
            "label": "API docs",
            "url": docs_url,
            "note": "Swagger docs for testing endpoints and real ingestion payloads.",
        },
    ]

    network_targets = []
    if share_mode_enabled:
        for ip_address in _discover_ipv4_addresses():
            network_targets.append(
                {
                    "label": f"Friend PC target ({ip_address})",
                    "url": f"{request.url.scheme}://{ip_address}:{port}",
                    "note": "Use this URL on another machine on the same network.",
                }
            )

    return SystemGuideResponse(
        mode=request.app.state.simulation_engine.mode,
        environment=settings.environment,
        browser_origin=browser_origin,
        docs_url=docs_url,
        share_mode_enabled=share_mode_enabled,
        simulation_tempo=request.app.state.simulation_engine.tempo,
        available_tempos=request.app.state.simulation_engine.available_tempos(),
        local_targets=local_targets,
        network_targets=network_targets,
    )


@router.get("/mode")
def get_mode(request: Request, admin: AdminUser = Depends(get_current_admin)) -> dict[str, str | bool]:
    return {
        "mode": request.app.state.simulation_engine.mode,
        "simulation_enabled": get_settings().allow_simulation,
    }


@router.get("/tempo", response_model=SimulationTempoResponse)
def get_tempo(
    request: Request,
    admin: AdminUser = Depends(get_current_admin),
) -> SimulationTempoResponse:
    return SimulationTempoResponse(
        tempo=request.app.state.simulation_engine.tempo,
        available_tempos=request.app.state.simulation_engine.available_tempos(),
    )


@router.post("/tempo", response_model=SimulationTempoResponse)
async def set_tempo(
    payload: SimulationTempoUpdateRequest,
    request: Request,
    db: Session = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin),
) -> SimulationTempoResponse:
    await request.app.state.simulation_engine.set_tempo(payload.tempo)
    audit_service.record(
        db,
        admin,
        action="simulation_tempo_changed",
        target="simulation",
        details={"tempo": payload.tempo},
    )
    db.commit()
    return SimulationTempoResponse(
        tempo=request.app.state.simulation_engine.tempo,
        available_tempos=request.app.state.simulation_engine.available_tempos(),
    )


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
