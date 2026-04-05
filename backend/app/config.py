from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
import sys

if getattr(sys, "frozen", False):
    BUNDLE_DIR = Path(getattr(sys, "_MEIPASS", Path(sys.executable).resolve().parent))
    APPDATA_ROOT = Path(os.getenv("LOCALAPPDATA", Path.home() / "AppData/Local")) / "SentraGuardAI"
    BASE_DIR = BUNDLE_DIR
    BACKEND_DIR = BUNDLE_DIR / "backend"
    DATA_DIR = Path(os.getenv("SENTRAGUARD_DATA_ROOT", APPDATA_ROOT / "data"))
    FRONTEND_DIR = BUNDLE_DIR / "frontend"
else:
    BASE_DIR = Path(__file__).resolve().parents[2]
    BACKEND_DIR = BASE_DIR / "backend"
    DATA_DIR = Path(os.getenv("SENTRAGUARD_DATA_ROOT", BACKEND_DIR / "data"))
    FRONTEND_DIR = BASE_DIR / "frontend"


def _sqlite_url(path: Path) -> str:
    return f"sqlite:///{path.resolve().as_posix()}"


@dataclass(frozen=True)
class Settings:
    app_name: str = os.getenv("SENTRAGUARD_APP_NAME", "SentraGuard AI")
    environment: str = os.getenv("SENTRAGUARD_ENV", "development")
    database_url: str = os.getenv(
        "SENTRAGUARD_DATABASE_URL",
        _sqlite_url(DATA_DIR / "sentraguard.db"),
    )
    secret_key: str = os.getenv("SENTRAGUARD_SECRET_KEY", "change-this-in-production")
    access_token_ttl_minutes: int = int(os.getenv("SENTRAGUARD_TOKEN_TTL_MINUTES", "480"))
    admin_email: str = os.getenv("SENTRAGUARD_ADMIN_EMAIL", "admin@sentraguard.local")
    admin_password: str = os.getenv("SENTRAGUARD_ADMIN_PASSWORD", "ChangeMe123!")
    admin_role: str = os.getenv("SENTRAGUARD_ADMIN_ROLE", "admin")
    ingest_api_key: str = os.getenv("SENTRAGUARD_INGEST_API_KEY", "sentra-ingest-key")
    allow_simulation: bool = os.getenv("SENTRAGUARD_ENABLE_SIMULATION", "true").lower() == "true"
    default_mode: str = os.getenv("SENTRAGUARD_DEFAULT_MODE", "simulation")
    simulation_employee_count: int = int(os.getenv("SENTRAGUARD_SIM_EMPLOYEE_COUNT", "120"))
    simulation_tick_seconds: float = float(os.getenv("SENTRAGUARD_SIM_TICK_SECONDS", "3.0"))
    high_risk_threshold: float = float(os.getenv("SENTRAGUARD_HIGH_RISK_THRESHOLD", "70"))
    alert_cooldown_minutes: int = int(os.getenv("SENTRAGUARD_ALERT_COOLDOWN_MINUTES", "20"))
    risk_window_hours: int = int(os.getenv("SENTRAGUARD_RISK_WINDOW_HOURS", "24"))
    telemetry_window_hours: int = int(os.getenv("SENTRAGUARD_TELEMETRY_WINDOW_HOURS", "12"))
    telegram_bot_token: str = os.getenv("SENTRAGUARD_TELEGRAM_BOT_TOKEN", "")
    telegram_chat_id: str = os.getenv("SENTRAGUARD_TELEGRAM_CHAT_ID", "")
    websocket_ping_interval_seconds: int = int(
        os.getenv("SENTRAGUARD_WS_PING_INTERVAL_SECONDS", "20")
    )

    @property
    def frontend_dir(self) -> Path:
        return FRONTEND_DIR

    @property
    def data_dir(self) -> Path:
        return DATA_DIR


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    settings = Settings()
    settings.data_dir.mkdir(parents=True, exist_ok=True)
    return settings
