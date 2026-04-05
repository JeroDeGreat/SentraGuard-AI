from __future__ import annotations

from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import AdminUser, AuditLog
from ..utils import dumps_json, isoformat, loads_json


class AuditService:
    def record(
        self,
        db: Session,
        admin: AdminUser,
        action: str,
        target: str,
        details: dict[str, Any] | None = None,
    ) -> AuditLog:
        entry = AuditLog(
            admin_user_id=admin.id,
            actor_email=admin.email,
            actor_role=admin.role,
            action=action,
            target=target,
            details=dumps_json(details or {}),
        )
        db.add(entry)
        db.flush()
        return entry

    def recent(self, db: Session, limit: int = 12) -> list[AuditLog]:
        return db.scalars(select(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit)).all()

    def serialize(self, entry: AuditLog) -> dict[str, Any]:
        return {
            "id": entry.id,
            "actor_email": entry.actor_email,
            "actor_role": entry.actor_role,
            "action": entry.action,
            "target": entry.target,
            "details": loads_json(entry.details, {}),
            "created_at": isoformat(entry.created_at),
        }
