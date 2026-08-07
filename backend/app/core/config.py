from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/ is the package parent of app/
_BACKEND_ROOT = Path(__file__).resolve().parents[2]
_DEFAULT_SQLITE = _BACKEND_ROOT / "data" / "app.db"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "asd-insight-companion"
    app_version: str = "0.0.1"
    # Comma-separated origins allowed by CORS (local Vite default).
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    # Anonymous session store (SQLite file path).
    sqlite_path: Path = _DEFAULT_SQLITE

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
