from __future__ import annotations

from dataclasses import dataclass
from datetime import timedelta
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from simulation.profiles import generate_seed_employees

from ..config import get_settings
from ..models import ActivityLog, Alert, Employee
from ..schemas import EventIngestItem
from ..utils import bucket_time, dumps_json, isoformat, loads_json, utcnow
from .alert_service import AlertService
from .risk_engine import RiskEngine


@dataclass
class EventOutcome:
    employee: Employee
    activity: ActivityLog
    alert: Alert | None


class MonitoringService:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.risk_engine = RiskEngine()
        self.alert_service = AlertService()

    def seed_employees_if_needed(self, db: Session) -> None:
        existing = db.scalar(select(func.count(Employee.id)))
        if existing:
            return

        for seed in generate_seed_employees(self.settings.simulation_employee_count):
            db.add(
                Employee(
                    employee_code=seed.employee_code,
                    name=seed.name,
                    department=seed.department,
                    title=seed.title,
                    baseline_profile=dumps_json(seed.baseline_profile),
                    current_risk_score=0.0,
                    current_risk_level="Low",
                )
            )
        db.commit()

    def record_event(self, db: Session, item: EventIngestItem, mode: str) -> EventOutcome:
        employee = self._resolve_employee(db, item)
        happened_at = item.happened_at or utcnow()
        assessment = self.risk_engine.assess_event(db, employee, item.event_type, happened_at, item.details)
        activity = ActivityLog(
            employee_id=employee.id,
            event_type=item.event_type,
            source=item.source,
            mode=mode,
            severity=assessment.severity,
            risk_delta=assessment.delta,
            risk_reasons=dumps_json(assessment.reasons),
            details=dumps_json(item.details),
            happened_at=happened_at,
        )
        employee.last_seen_at = happened_at
        db.add(activity)
        db.flush()

        score, level = self.risk_engine.recalculate_employee_risk(db, employee, happened_at)
        employee.current_risk_score = score
        employee.current_risk_level = level
        alert = self.alert_service.maybe_create_alert(
            db=db,
            employee=employee,
            activity=activity,
            reasons=assessment.reasons,
            risk_score=score,
            risk_level=level,
        )

        db.commit()
        db.refresh(employee)
        db.refresh(activity)
        if alert is not None:
            db.refresh(alert)
        return EventOutcome(employee=employee, activity=activity, alert=alert)

    def serialize_employee(self, db: Session, employee: Employee) -> dict[str, Any]:
        latest_activity = db.scalar(
            select(ActivityLog)
            .where(ActivityLog.employee_id == employee.id)
            .order_by(ActivityLog.happened_at.desc())
        )
        reasons = loads_json(latest_activity.risk_reasons, []) if latest_activity else []
        return {
            "id": employee.id,
            "employee_code": employee.employee_code,
            "name": employee.name,
            "department": employee.department,
            "title": employee.title,
            "current_risk_score": round(float(employee.current_risk_score), 1),
            "current_risk_level": employee.current_risk_level,
            "last_seen_at": isoformat(employee.last_seen_at),
            "latest_reasons": reasons[:3],
        }

    def serialize_activity(self, activity: ActivityLog, employee: Employee) -> dict[str, Any]:
        return {
            "id": activity.id,
            "employee_id": employee.id,
            "employee_code": employee.employee_code,
            "employee_name": employee.name,
            "department": employee.department,
            "event_type": activity.event_type,
            "source": activity.source,
            "mode": activity.mode,
            "severity": activity.severity,
            "risk_delta": round(float(activity.risk_delta), 1),
            "risk_reasons": loads_json(activity.risk_reasons, []),
            "details": loads_json(activity.details, {}),
            "happened_at": isoformat(activity.happened_at),
        }

    def serialize_alert(self, alert: Alert, employee: Employee) -> dict[str, Any]:
        return {
            "id": alert.id,
            "employee_id": employee.id,
            "employee_code": employee.employee_code,
            "employee_name": employee.name,
            "risk_score": round(float(alert.risk_score), 1),
            "risk_level": alert.risk_level,
            "reasons": loads_json(alert.reasons, []),
            "channel": alert.channel,
            "status": alert.status,
            "message": alert.message,
            "created_at": isoformat(alert.created_at),
            "sent_at": isoformat(alert.sent_at),
        }

    def build_overview(self, db: Session, mode: str, websocket_clients: int) -> dict[str, Any]:
        employees = db.scalars(
            select(Employee).order_by(Employee.current_risk_score.desc(), Employee.last_seen_at.desc())
        ).all()
        activities = db.scalars(
            select(ActivityLog)
            .options(selectinload(ActivityLog.employee))
            .order_by(ActivityLog.happened_at.desc())
            .limit(24)
        ).all()
        alerts = db.scalars(
            select(Alert).options(selectinload(Alert.employee)).order_by(Alert.created_at.desc()).limit(12)
        ).all()

        average_risk = round(
            sum(float(employee.current_risk_score) for employee in employees) / max(len(employees), 1), 1
        )
        high_risk = sum(1 for employee in employees if employee.current_risk_level == "High")
        one_hour_ago = utcnow() - timedelta(hours=1)
        recent_events = db.scalar(
            select(func.count(ActivityLog.id)).where(ActivityLog.happened_at >= one_hour_ago)
        ) or 0

        distribution = {"Low": 0, "Medium": 0, "High": 0}
        department_scores: dict[str, dict[str, float]] = {}
        trigger_counts: dict[str, int] = {}
        for employee in employees:
            distribution[employee.current_risk_level] += 1
            group = department_scores.setdefault(employee.department, {"score": 0.0, "count": 0.0, "high": 0.0})
            group["score"] += float(employee.current_risk_score)
            group["count"] += 1
            if employee.current_risk_level == "High":
                group["high"] += 1

        cutoff = utcnow() - timedelta(hours=self.settings.telemetry_window_hours)
        trend_rows = db.scalars(
            select(ActivityLog).where(ActivityLog.happened_at >= cutoff).order_by(ActivityLog.happened_at.asc())
        ).all()
        buckets: dict[str, dict[str, float]] = {}
        cursor = bucket_time(cutoff)
        now_bucket = bucket_time(utcnow())
        while cursor <= now_bucket:
            label = cursor.strftime("%H:%M")
            buckets[label] = {"value": 0.0, "secondary": 0.0}
            cursor += timedelta(minutes=30)

        for activity in trend_rows:
            label = bucket_time(activity.happened_at).strftime("%H:%M")
            if label in buckets:
                buckets[label]["value"] += float(activity.risk_delta)
                buckets[label]["secondary"] += 1
            for reason in loads_json(activity.risk_reasons, []):
                if reason == "Behavior matched baseline":
                    continue
                trigger_counts[reason] = trigger_counts.get(reason, 0) + 1

        department_chart = [
            {
                "label": department,
                "value": round(values["score"] / max(values["count"], 1), 1),
                "secondary": values["high"],
            }
            for department, values in department_scores.items()
        ]
        department_chart.sort(key=lambda item: item["value"], reverse=True)
        top_triggers = [
            {"label": reason, "value": count, "secondary": None}
            for reason, count in sorted(trigger_counts.items(), key=lambda item: item[1], reverse=True)[:6]
        ]
        watchlist_candidates = [employee for employee in employees if employee.current_risk_score >= 35][:8]
        recommended_actions = self._build_recommended_actions(
            mode=mode,
            high_risk=high_risk,
            recent_events=int(recent_events),
            trigger_counts=trigger_counts,
        )

        return {
            "system_mode": mode,
            "simulation_enabled": self.settings.allow_simulation,
            "refreshed_at": isoformat(utcnow()),
            "websocket_clients": websocket_clients,
            "active_alerts": len(alerts),
            "total_employees": len(employees),
            "average_risk_score": average_risk,
            "high_risk_employees": high_risk,
            "recent_events": int(recent_events),
            "risk_distribution": [
                {"label": label, "value": value, "secondary": None}
                for label, value in distribution.items()
            ],
            "department_risk": department_chart[:6],
            "risk_trend": [
                {"label": label, "value": round(values["value"], 1), "secondary": values["secondary"]}
                for label, values in buckets.items()
            ],
            "top_triggers": top_triggers,
            "watchlist": [self.serialize_employee(db, employee) for employee in watchlist_candidates],
            "recommended_actions": recommended_actions,
            "employees": [self.serialize_employee(db, employee) for employee in employees],
            "activity_feed": [self.serialize_activity(activity, activity.employee) for activity in activities],
            "alerts": [self.serialize_alert(alert, alert.employee) for alert in alerts],
        }

    def build_employee_detail(self, db: Session, employee_id: int) -> dict[str, Any] | None:
        employee = db.scalar(select(Employee).where(Employee.id == employee_id))
        if employee is None:
            return None

        recent_activity = db.scalars(
            select(ActivityLog)
            .where(ActivityLog.employee_id == employee_id)
            .order_by(ActivityLog.happened_at.desc())
            .limit(14)
        ).all()
        alerts = db.scalars(
            select(Alert).where(Alert.employee_id == employee_id).order_by(Alert.created_at.desc()).limit(8)
        ).all()

        return {
            "employee": self.serialize_employee(db, employee),
            "baseline_profile": loads_json(employee.baseline_profile, {}),
            "recent_activity": [self.serialize_activity(item, employee) for item in recent_activity],
            "alerts": [self.serialize_alert(alert, employee) for alert in alerts],
        }

    def _resolve_employee(self, db: Session, item: EventIngestItem) -> Employee:
        employee = db.scalar(select(Employee).where(Employee.employee_code == item.employee_code))
        if employee:
            if item.employee_name:
                employee.name = item.employee_name
            if item.department:
                employee.department = item.department
            if item.title:
                employee.title = item.title
            return employee

        baseline = self._default_baseline(item.department or "Operations")
        employee = Employee(
            employee_code=item.employee_code,
            name=item.employee_name or f"Employee {item.employee_code}",
            department=item.department or "Operations",
            title=item.title or "System Imported User",
            baseline_profile=dumps_json(baseline),
            current_risk_score=0.0,
            current_risk_level="Low",
        )
        db.add(employee)
        db.flush()
        return employee

    def _default_baseline(self, department: str) -> dict[str, Any]:
        sensitive_departments = {"Finance", "Legal", "Research"}
        return {
            "login_window": {"start": 8, "end": 18},
            "downloads_per_hour": 4,
            "typical_transfer_mb": 120,
            "usb_allowed": department in {"Operations", "Research"},
            "sensitive_access_level": "high" if department in sensitive_departments else "medium",
            "home_location": "HQ-West",
        }

    def _build_recommended_actions(
        self,
        mode: str,
        high_risk: int,
        recent_events: int,
        trigger_counts: dict[str, int],
    ) -> list[str]:
        actions: list[str] = []

        if high_risk:
            actions.append(
                "Review the watchlist first and lock down the highest-risk employees before investigating lower-signal activity."
            )

        if any("failed logins" in reason.lower() for reason in trigger_counts):
            actions.append(
                "Force password resets for impacted users and review source IPs behind repeated failed authentication bursts."
            )

        if any("usb" in reason.lower() for reason in trigger_counts):
            actions.append(
                "Audit removable media usage and temporarily block unmanaged USB devices on flagged endpoints."
            )

        if any("external data transfer" in reason.lower() for reason in trigger_counts):
            actions.append(
                "Inspect outbound transfer paths and disable personal cloud or external-drive channels until the incident is triaged."
            )

        if any("restricted" in reason.lower() or "confidential" in reason.lower() for reason in trigger_counts):
            actions.append(
                "Validate access approvals for sensitive resources and compare current behavior against the employee's normal baseline."
            )

        if mode == "real" and recent_events == 0:
            actions.append(
                "Real monitoring mode is active with no fresh events; verify log forwarders and ingestion tokens before the demo."
            )

        if not actions:
            actions.append("No urgent action is recommended right now; continue monitoring the live feed and alert queue.")

        return actions[:5]
