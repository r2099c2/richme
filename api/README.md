# Richme API

FastAPI 服务。步骤 1：`GET /health`。步骤 2：SQLAlchemy 域模型、Alembic 迁移、`GET /debug/db` 连库验收（见 [docs/plans/02-database-orm.md](../docs/plans/02-database-orm.md)）。

## Prerequisites

- [uv](https://docs.astral.sh/uv/)
- Python 3.12+（见 `pyproject.toml` 的 `requires-python`）
- 本地 PostgreSQL（例如仓库根目录 `docker compose up -d`）

## 环境变量

- `DATABASE_URL`：可选，覆盖默认连接串（与 `richme_api.config.Settings.database_url` 一致，例如 `postgresql+psycopg://user:pass@localhost:5432/dbname`）。

## Setup & run

```bash
cd api
uv sync --all-extras
uv run alembic upgrade head
uv run uvicorn richme_api.main:app --reload --host 0.0.0.0 --port 8000
```

- Docs: http://127.0.0.1:8000/docs  
- Health: http://127.0.0.1:8000/health  
- 临时连库: http://127.0.0.1:8000/debug/db  

依赖变更后请提交 `uv.lock`。

`dev` 可选依赖含 `httpx`，供 `TestClient` / 本地脚本使用。
