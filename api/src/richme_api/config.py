from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

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

    # Comma-separated; always merged with localhost dev origins in code if needed
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"


@lru_cache
def get_settings() -> Settings:
    return Settings()
