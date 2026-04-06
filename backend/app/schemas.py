from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in_minutes: int
    admin_email: str


class AdminSummary(BaseModel):
    email: str
    role: str


class EventIngestItem(BaseModel):
    employee_code: str = Field(..., examples=["EMP-023"])
    employee_name: str | None = None
    department: str | None = None
    title: str | None = None
    event_type: Literal[
        "login_success",
        "login_failed",
        "file_download",
        "usb_inserted",
        "data_transfer",
        "sensitive_access",
    ]
    source: str = "real-log-ingestion"
    happened_at: datetime | None = None
    details: dict[str, Any] = Field(default_factory=dict)


class EventIngestRequest(BaseModel):
    events: list[EventIngestItem]


class ModeUpdateRequest(BaseModel):
    mode: Literal["simulation", "real"]


class SimulationTempoUpdateRequest(BaseModel):
    tempo: Literal["calm", "balanced", "demo"]


class SimulationTempoResponse(BaseModel):
    tempo: Literal["calm", "balanced", "demo"]
    available_tempos: list[str]


class SystemResetResponse(BaseModel):
    status: str
    message: str
    mode: str
    tempo: str
    total_employees: int


class SystemEndpointResponse(BaseModel):
    label: str
    url: str
    note: str | None = None


class SystemGuideResponse(BaseModel):
    mode: str
    environment: str
    browser_origin: str
    docs_url: str
    share_mode_enabled: bool
    simulation_tempo: str
    available_tempos: list[str]
    local_targets: list[SystemEndpointResponse]
    network_targets: list[SystemEndpointResponse]


class ControlScenarioResponse(BaseModel):
    id: str
    label: str
    description: str
    category: str
    default_mode: str
    steps: int


class ControlEmitRequest(BaseModel):
    scenario_id: str
    employee_id: int | None = None
    employee_code: str | None = None
    employee_name: str | None = None
    department: str | None = None
    title: str | None = None
    target_mode: Literal["current", "simulation", "real"] = "current"
    repeat: int = Field(default=1, ge=1, le=5)


class ControlEmitResponse(BaseModel):
    scenario_id: str
    target_mode: str
    employee_code: str
    accepted: int
    alerts_created: int
    flagged_high_risk: bool
    items: list[dict[str, Any]]


class EmployeeSummary(BaseModel):
    id: int
    employee_code: str
    name: str
    department: str
    title: str
    current_risk_score: float
    current_risk_level: str
    last_seen_at: str | None
    latest_reasons: list[str] = Field(default_factory=list)


class ActivityLogResponse(BaseModel):
    id: int
    employee_id: int
    employee_code: str
    employee_name: str
    department: str
    event_type: str
    source: str
    mode: str
    severity: str
    risk_delta: float
    risk_reasons: list[str]
    details: dict[str, Any]
    happened_at: str


class AlertResponse(BaseModel):
    id: int
    employee_id: int
    employee_code: str
    employee_name: str
    risk_score: float
    risk_level: str
    reasons: list[str]
    channel: str
    status: str
    message: str
    created_at: str
    sent_at: str | None


class AuditLogResponse(BaseModel):
    id: int
    actor_email: str
    actor_role: str
    action: str
    target: str
    details: dict[str, Any]
    created_at: str


class ChartPoint(BaseModel):
    label: str
    value: float
    secondary: float | None = None


class OverviewResponse(BaseModel):
    system_mode: str
    simulation_enabled: bool
    refreshed_at: str
    websocket_clients: int
    active_alerts: int
    total_employees: int
    average_risk_score: float
    high_risk_employees: int
    recent_events: int
    risk_distribution: list[ChartPoint]
    department_risk: list[ChartPoint]
    risk_trend: list[ChartPoint]
    top_triggers: list[ChartPoint]
    watchlist: list[EmployeeSummary]
    recommended_actions: list[str]
    employees: list[EmployeeSummary]
    activity_feed: list[ActivityLogResponse]
    alerts: list[AlertResponse]


class EmployeeDetailResponse(BaseModel):
    employee: EmployeeSummary
    baseline_profile: dict[str, Any]
    recent_activity: list[ActivityLogResponse]
    alerts: list[AlertResponse]


class RulesResponse(BaseModel):
    threshold: float
    rules: list[dict[str, Any]]


class IngestResult(BaseModel):
    accepted: int
    flagged_high_risk: int
    alerts_created: int
    items: list[dict[str, Any]]
