from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from .auth import hash_password
from .config import get_settings
from .models import AdminUser


def ensure_admin_user(db: Session) -> AdminUser:
    settings = get_settings()
    admin = db.scalar(select(AdminUser).where(AdminUser.email == settings.admin_email))
    if admin:
        return admin

    admin = AdminUser(
        email=settings.admin_email,
        password_hash=hash_password(settings.admin_password),
        role=settings.admin_role,
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return admin
