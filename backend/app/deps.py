from __future__ import annotations

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .auth import decode_access_token
from .config import get_settings
from .database import get_db
from .models import AdminUser


bearer_scheme = HTTPBearer(auto_error=False)


def get_current_admin(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> AdminUser:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")

    payload = decode_access_token(credentials.credentials)
    admin = db.query(AdminUser).filter(AdminUser.email == payload["sub"]).first()
    if admin is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unknown administrator")
    return admin


def verify_ingest_access(
    x_ingest_token: str | None = Header(default=None, alias="X-Ingest-Token"),
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> str:
    settings = get_settings()
    if x_ingest_token and x_ingest_token == settings.ingest_api_key:
        return "ingest"

    if credentials is not None:
        payload = decode_access_token(credentials.credentials)
        admin = db.query(AdminUser).filter(AdminUser.email == payload["sub"]).first()
        if admin is not None:
            return "admin"

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid ingestion credentials")
