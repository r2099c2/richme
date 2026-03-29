from fastapi import Depends, FastAPI
from sqlalchemy import select
from sqlalchemy.orm import Session

from richme_api import __version__
from richme_api.db.session import get_db

app = FastAPI(title="Richme API", version=__version__)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "version": __version__}


@app.get("/debug/db")
def debug_db(db: Session = Depends(get_db)) -> dict[str, str]:
    """临时连库验收；步骤 3 前可删除或改为正式路由。"""
    db.scalar(select(1))
    return {"database": "ok"}
