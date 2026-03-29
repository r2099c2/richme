import os

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.orm import Session

from richme_api import __version__
from richme_api.api.v1.router import api_router
from richme_api.db.session import get_db

app = FastAPI(title="Richme API", version=__version__)

# 读环境变量而非 get_settings()，便于测试里 monkeypatch + importlib.reload 后生效
_default_cors = "http://localhost:5173,http://127.0.0.1:5173"
_cors_origins = [
    x.strip() for x in os.environ.get("CORS_ORIGINS", _default_cors).split(",") if x.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "version": __version__}


@app.get("/debug/db")
def debug_db(db: Session = Depends(get_db)) -> dict[str, str]:
    """临时连库验收。"""
    db.scalar(select(1))
    return {"database": "ok"}
