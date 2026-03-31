from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import create_access_token, verify_password
from ..database import get_db
from ..deps import get_current_admin
from ..models import AdminUser
from ..schemas import AdminSummary, LoginRequest, TokenResponse
from ..utils import utcnow


router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    admin = db.scalar(select(AdminUser).where(AdminUser.email == payload.email))
    if admin is None or not verify_password(payload.password, admin.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    admin.last_login_at = utcnow()
    db.commit()
    token = create_access_token(admin.email, admin.role)
    return TokenResponse(
        access_token=token,
        expires_in_minutes=480,
        admin_email=admin.email,
    )


@router.get("/me", response_model=AdminSummary)
def me(admin: AdminUser = Depends(get_current_admin)) -> AdminSummary:
    return AdminSummary(email=admin.email, role=admin.role)
