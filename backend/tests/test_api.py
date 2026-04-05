import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

os.environ.setdefault("SENTRAGUARD_DISABLE_BACKGROUND", "1")

from backend.app.bootstrap import ensure_admin_user
from backend.app.database import SessionLocal, init_database
from backend.app.models import ActivityLog, Alert, AuditLog, Employee
from backend.app.services.monitoring import MonitoringService
from backend.app.main import app


@pytest.fixture(autouse=True)
def reset_state():
    init_database()
    service = MonitoringService()
    with SessionLocal() as db:
        ensure_admin_user(db)
        service.seed_employees_if_needed(db)
        db.query(AuditLog).delete()
        db.query(Alert).delete()
        db.query(ActivityLog).delete()
        for employee in db.scalars(select(Employee)).all():
            employee.current_risk_score = 0
            employee.current_risk_level = "Low"
            employee.last_seen_at = None
        db.commit()


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


def admin_headers(client: TestClient) -> dict[str, str]:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@sentraguard.local", "password": "ChangeMe123!"},
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_login_and_overview(client: TestClient):
    headers = admin_headers(client)
    overview = client.get("/api/v1/overview", headers=headers)

    assert overview.status_code == 200
    payload = overview.json()
    assert payload["total_employees"] == 120
    assert payload["system_mode"] in {"simulation", "real"}
    assert len(payload["employees"]) > 0
    assert "watchlist" in payload
    assert "top_triggers" in payload
    assert "recommended_actions" in payload


def test_ingest_generates_high_risk_alert(client: TestClient):
    events = [
        {
            "employee_code": "EMP-009",
            "event_type": "login_failed",
            "details": {"location": "External IP"},
        },
        {
            "employee_code": "EMP-009",
            "event_type": "login_failed",
            "details": {"location": "External IP"},
        },
        {
            "employee_code": "EMP-009",
            "event_type": "login_failed",
            "details": {"location": "External IP"},
        },
        {
            "employee_code": "EMP-009",
            "event_type": "usb_inserted",
            "details": {"device_label": "Unmanaged USB"},
        },
        {
            "employee_code": "EMP-009",
            "event_type": "data_transfer",
            "details": {"channel": "usb", "destination": "external", "bytes_mb": 1200},
        },
    ]
    response = client.post(
        "/api/v1/logs/ingest",
        headers={"X-Ingest-Token": "sentra-ingest-key"},
        json={"events": events},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["accepted"] == 5
    assert payload["alerts_created"] >= 1
    assert payload["flagged_high_risk"] >= 1


def test_mode_switch(client: TestClient):
    headers = admin_headers(client)
    response = client.post("/api/v1/system/mode", headers=headers, json={"mode": "real"})
    assert response.status_code == 200
    assert response.json()["mode"] == "real"


def test_audit_log_records_admin_actions(client: TestClient):
    headers = admin_headers(client)
    mode_change = client.post("/api/v1/system/mode", headers=headers, json={"mode": "real"})
    assert mode_change.status_code == 200

    audit_response = client.get("/api/v1/system/audit", headers=headers)
    assert audit_response.status_code == 200

    entries = audit_response.json()
    actions = [entry["action"] for entry in entries]
    assert "admin_login" in actions
    assert "mode_changed" in actions


def test_control_scenario_emit(client: TestClient):
    headers = admin_headers(client)
    scenarios = client.get("/api/v1/control/scenarios", headers=headers)
    assert scenarios.status_code == 200
    assert any(item["id"] == "credential_stuffing" for item in scenarios.json())

    emit = client.post(
        "/api/v1/control/emit",
        headers=headers,
        json={"scenario_id": "credential_stuffing", "employee_code": "EMP-012", "target_mode": "real"},
    )
    assert emit.status_code == 200

    payload = emit.json()
    assert payload["scenario_id"] == "credential_stuffing"
    assert payload["accepted"] >= 3


def test_frontend_responses_disable_cache(client: TestClient):
    root = client.get("/")
    static_asset = client.get("/static/app.js?v=20260405c")

    assert root.status_code == 200
    assert static_asset.status_code == 200
    assert root.headers["cache-control"] == "no-store, no-cache, must-revalidate, max-age=0"
    assert static_asset.headers["cache-control"] == "no-store, no-cache, must-revalidate, max-age=0"
