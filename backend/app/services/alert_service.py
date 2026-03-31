from __future__ import annotations

import json
import urllib.parse
import urllib.request
from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import get_settings
from ..models import ActivityLog, Alert, Employee
from ..utils import dumps_json, utcnow


class AlertService:
    def __init__(self) -> None:
        self.settings = get_settings()

    def maybe_create_alert(
        self,
        db: Session,
        employee: Employee,
        activity: ActivityLog,
        reasons: list[str],
        risk_score: float,
        risk_level: str,
    ) -> Alert | None:
        if risk_level != "High" or risk_score < self.settings.high_risk_threshold:
            return None

        cutoff = activity.happened_at - timedelta(minutes=self.settings.alert_cooldown_minutes)
        existing = db.scalar(
            select(Alert)
            .where(Alert.employee_id == employee.id, Alert.created_at >= cutoff)
            .order_by(Alert.created_at.desc())
        )
        if existing:
            return None

        message = self._build_message(employee, risk_score, reasons, activity)
        alert = Alert(
            employee_id=employee.id,
            risk_score=risk_score,
            risk_level=risk_level,
            reasons=dumps_json(reasons),
            channel="dashboard",
            status="visible",
            message=message,
        )
        db.add(alert)
        db.flush()

        if self.settings.telegram_bot_token and self.settings.telegram_chat_id:
            delivered = self._send_telegram(message)
            alert.channel = "telegram"
            alert.status = "sent" if delivered else "delivery_failed"
            if delivered:
                alert.sent_at = utcnow()

        return alert

    def _build_message(
        self,
        employee: Employee,
        risk_score: float,
        reasons: list[str],
        activity: ActivityLog,
    ) -> str:
        reasons_text = ", ".join(reasons[:3])
        return (
            f"SentraGuard AI alert\n"
            f"Employee: {employee.employee_code} | {employee.name}\n"
            f"Department: {employee.department}\n"
            f"Risk score: {risk_score:.1f}\n"
            f"Trigger: {reasons_text}\n"
            f"Latest event: {activity.event_type}"
        )

    def _send_telegram(self, message: str) -> bool:
        payload = urllib.parse.urlencode(
            {"chat_id": self.settings.telegram_chat_id, "text": message}
        ).encode("utf-8")
        url = f"https://api.telegram.org/bot{self.settings.telegram_bot_token}/sendMessage"
        request = urllib.request.Request(url, data=payload, method="POST")
        request.add_header("Content-Type", "application/x-www-form-urlencoded")
        try:
            with urllib.request.urlopen(request, timeout=4) as response:
                body = json.loads(response.read().decode("utf-8"))
                return bool(body.get("ok"))
        except Exception:
            return False
