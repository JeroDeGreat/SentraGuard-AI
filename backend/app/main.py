from __future__ import annotations

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .bootstrap import ensure_admin_user
from .config import get_settings
from .database import SessionLocal, init_database
from .realtime import RealtimeHub
from .routers import auth, dashboard, ingest, system
from .services.monitoring import MonitoringService
from .services.simulation_engine import SimulationEngine


settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_database()
    with SessionLocal() as db:
        ensure_admin_user(db)
        app.state.monitoring_service.seed_employees_if_needed(db)

    if os.getenv("SENTRAGUARD_DISABLE_BACKGROUND") != "1":
        await app.state.simulation_engine.start()

    yield

    await app.state.simulation_engine.stop()


app = FastAPI(
    title="SentraGuard AI API",
    description="Employee behavior risk analysis and alerting platform.",
    version="1.0.0",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.state.realtime_hub = RealtimeHub()
app.state.monitoring_service = MonitoringService()
app.state.simulation_engine = SimulationEngine(
    session_factory=SessionLocal,
    monitoring_service=app.state.monitoring_service,
    realtime_hub=app.state.realtime_hub,
)

app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(ingest.router)
app.include_router(system.router)

frontend_directory = settings.frontend_dir
frontend_directory.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=frontend_directory), name="static")


@app.get("/", include_in_schema=False)
async def root() -> FileResponse:
    return FileResponse(frontend_directory / "index.html")


@app.get("/favicon.ico", include_in_schema=False)
async def favicon() -> FileResponse:
    return FileResponse(frontend_directory / "assets" / "favicon.svg")


@app.websocket("/ws/live")
async def websocket_live(websocket: WebSocket) -> None:
    hub: RealtimeHub = app.state.realtime_hub
    await hub.connect(websocket)
    try:
        await websocket.send_json(
            {"type": "system.connected", "payload": {"mode": app.state.simulation_engine.mode}}
        )
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        hub.disconnect(websocket)
    except Exception:
        hub.disconnect(websocket)
