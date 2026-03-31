from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from math import exp
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..config import get_settings
from ..models import ActivityLog, Employee
from ..utils import clamp, ensure_utc, loads_json, utcnow


RULES_CATALOG = [
    {"name": "Unusual login time", "points": 20, "description": "Login activity outside the baseline window."},
    {"name": "Repeated failed logins", "points": 30, "description": "Three or more failures within 30 minutes."},
    {"name": "Excessive downloads", "points": 25, "description": "Download volume or velocity exceeded baseline."},
    {"name": "USB usage", "points": 15, "description": "External removable media activity detected."},
    {"name": "External transfer", "points": 20, "description": "Data moved outside normal channels or policy."},
    {"name": "Sensitive resource access", "points": 18, "description": "Restricted data touched by a risky pattern."},
]


@dataclass
class RiskAssessment:
    delta: float
    reasons: list[str]
    severity: str


def risk_level_from_score(score: float) -> str:
    if score >= 70:
        return "High"
    if score >= 35:
        return "Medium"
    return "Low"


def severity_from_delta(delta: float) -> str:
    if delta >= 35:
        return "critical"
    if delta >= 22:
        return "high"
    if delta >= 10:
        return "medium"
    return "low"


class RiskEngine:
    def __init__(self) -> None:
        self.settings = get_settings()

    def assess_event(
        self,
        db: Session,
        employee: Employee,
        event_type: str,
        happened_at: datetime,
        details: dict[str, Any],
    ) -> RiskAssessment:
        baseline = loads_json(employee.baseline_profile, {})
        reasons: list[str] = []
        delta = 0.0
        login_window = baseline.get("login_window", {"start": 8, "end": 18})
        downloads_per_hour = int(baseline.get("downloads_per_hour", 4))
        typical_transfer = float(baseline.get("typical_transfer_mb", 120))
        usb_allowed = bool(baseline.get("usb_allowed", False))

        if event_type == "login_success":
            hour = happened_at.hour
            forced_after_hours = bool(details.get("force_after_hours"))
            if forced_after_hours or hour < int(login_window["start"]) - 1 or hour > int(login_window["end"]) + 1:
                delta += 20
                reasons.append("Unusual login time")
            location = details.get("location")
            if location and location != baseline.get("home_location"):
                delta += 8
                reasons.append("Login from an unexpected location")

        if event_type == "login_failed":
            window_start = happened_at - timedelta(minutes=30)
            recent_failures = db.scalar(
                select(func.count(ActivityLog.id)).where(
                    ActivityLog.employee_id == employee.id,
                    ActivityLog.event_type == "login_failed",
                    ActivityLog.happened_at >= window_start,
                )
            )
            recent_failures = int(recent_failures or 0) + 1
            if recent_failures >= 3:
                delta += 30
                reasons.append(f"{recent_failures} failed logins within 30 minutes")
            else:
                delta += 10
                reasons.append("Failed login attempt recorded")

        if event_type == "file_download":
            bytes_mb = float(details.get("bytes_mb", typical_transfer))
            classification = details.get("classification", "internal")
            window_start = happened_at - timedelta(minutes=15)
            recent_downloads = db.scalar(
                select(func.count(ActivityLog.id)).where(
                    ActivityLog.employee_id == employee.id,
                    ActivityLog.event_type == "file_download",
                    ActivityLog.happened_at >= window_start,
                )
            )
            recent_downloads = int(recent_downloads or 0) + 1
            if recent_downloads >= max(5, downloads_per_hour + 2) or bytes_mb >= max(600, typical_transfer * 3):
                delta += 25
                reasons.append("Excessive downloads")
            elif classification in {"restricted", "secret"}:
                delta += 12
                reasons.append("Restricted file download")

        if event_type == "usb_inserted":
            delta += 6 if usb_allowed else 15
            reasons.append("USB device activity detected")

        if event_type == "data_transfer":
            bytes_mb = float(details.get("bytes_mb", typical_transfer))
            channel = str(details.get("channel", "network")).lower()
            destination = str(details.get("destination", "internal")).lower()
            if channel in {"usb", "external-drive", "personal-cloud"} or destination == "external":
                delta += 20
                reasons.append("External data transfer detected")
            if bytes_mb >= max(320, typical_transfer * 4):
                delta += 10
                reasons.append("Transfer volume exceeded baseline")

        if event_type == "sensitive_access":
            classification = str(details.get("classification", "internal")).lower()
            if classification in {"restricted", "secret"}:
                delta += 18
                reasons.append(f"{classification.title()} resource accessed")
            elif classification == "confidential":
                delta += 10
                reasons.append("Confidential resource accessed")

        if delta > 0:
            burst_window = happened_at - timedelta(hours=1)
            burst_types = db.scalars(
                select(ActivityLog.event_type).where(
                    ActivityLog.employee_id == employee.id,
                    ActivityLog.risk_delta > 0,
                    ActivityLog.happened_at >= burst_window,
                )
            ).all()
            if len(set(burst_types)) >= 2:
                delta += 12
                reasons.append("Multi-vector activity burst")

        delta = round(clamp(delta, 0, 100), 1)
        return RiskAssessment(
            delta=delta,
            reasons=reasons or ["Behavior matched baseline"],
            severity=severity_from_delta(delta),
        )

    def recalculate_employee_risk(
        self,
        db: Session,
        employee: Employee,
        reference_time: datetime | None = None,
    ) -> tuple[float, str]:
        reference = reference_time or utcnow()
        window_start = reference - timedelta(hours=self.settings.risk_window_hours)
        recent_activity = db.scalars(
            select(ActivityLog).where(
                ActivityLog.employee_id == employee.id,
                ActivityLog.happened_at >= window_start,
            )
        ).all()

        weighted_total = 0.0
        recent_high_events = 0
        for activity in recent_activity:
            age_hours = max((ensure_utc(reference) - ensure_utc(activity.happened_at)).total_seconds() / 3600, 0.0)
            decay = max(0.18, exp(-age_hours / 10))
            weighted_total += float(activity.risk_delta) * decay
            if activity.severity in {"high", "critical"} and age_hours <= 1.5:
                recent_high_events += 1

        if recent_high_events >= 2:
            weighted_total += 8

        score = round(clamp(weighted_total, 0, 100), 1)
        return score, risk_level_from_score(score)
