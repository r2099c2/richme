from functools import lru_cache
from pathlib import Path

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# richme_api/config.py → …/api/src/richme_api → api/ 目录 → 仓库根。与 uvicorn 的 cwd 无关。
_API_DIR = Path(__file__).resolve().parent.parent.parent
_REPO_ROOT = _API_DIR.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        # 先根目录、后 api/；后者覆盖前者，便于在 api/.env 里覆盖单项
        env_file=(
            _REPO_ROOT / ".env",
            _API_DIR / ".env",
        ),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = "postgresql+psycopg://richme:richme@localhost:5432/richme"

    jwt_secret: str = Field(
        default="dev-jwt-secret-change-in-production",
        description="HS256 signing secret; override in production",
    )
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24

    # Prefer ADMIN_PASSWORD_HASH (bcrypt); else plain ADMIN_PASSWORD for local dev only.
    admin_password: str | None = None
    admin_password_hash: str | None = None

    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    @field_validator("admin_password", "admin_password_hash", mode="before")
    @classmethod
    def empty_admin_secret_to_none(cls, v: object) -> object:
        if v == "":
            return None
        return v


@lru_cache
def get_settings() -> Settings:
    return Settings()
