# Richme API

FastAPI 服务。步骤 1：`GET /health`。步骤 2：SQLAlchemy 域模型、Alembic 迁移、`GET /debug/db`。步骤 3：仅**后台** JWT、`public` 匿名读主题（见 [docs/plans/03-api.md](../docs/plans/03-api.md)）。

## Prerequisites

- [uv](https://docs.astral.sh/uv/)
- Python 3.12+（见 `pyproject.toml` 的 `requires-python`）
- 本地 PostgreSQL（例如仓库根目录 `docker compose up -d`）

## 环境变量

- `DATABASE_URL`：可选，覆盖默认连接串（与 `richme_api.config.Settings.database_url` 一致，例如 `postgresql+psycopg://user:pass@localhost:5432/dbname`）。
- **步骤 3**：`JWT_SECRET`、`ADMIN_PASSWORD` 或 `ADMIN_PASSWORD_HASH`（二选一，生产用哈希）、`ACCESS_TOKEN_EXPIRE_MINUTES`、`CORS_ORIGINS`（逗号分隔）。详见仓库根目录 `.env.example`。

## Setup & run

```bash
cd api
uv sync --all-extras
uv run alembic upgrade head
uv run uvicorn richme_api.main:app --reload --host 0.0.0.0 --port 8000
```

- Docs: http://127.0.0.1:8000/docs（`/docs` 中 **Authorize** 填 `Bearer <token>` 调 admin 接口）  
- Health: http://127.0.0.1:8000/health  
- 临时连库: http://127.0.0.1:8000/debug/db  

### 步骤 3 主要路由（前缀 `/api/v1`）

| 区域 | 方法 | 路径 | 说明 |
|------|------|------|------|
| public | GET | `/public/themes/by-date/{date}` | 按**上海时区自然日**聚合顶层主题树 + 股票角色；`?include_concepts=true` 带概念 |
| admin | POST | `/admin/auth/login` | Body `{"password":"..."}` → JWT |
| admin | POST | `/admin/stocks/bulk` | 批量 upsert 股票；**全量替换**该股 `stock_concepts` |
| admin | PATCH | `/admin/stocks/{code}` | 部分更新基础字段 |
| admin | POST | `/admin/themes` | 创建主题 |
| admin | PATCH | `/admin/themes/{theme_id}` | 更新主题 |
| admin | POST | `/admin/themes/{theme_id}/roles` | 新增角色时段；默认自动关闭同股同角色上一段 `valid_to` |

生成 bcrypt 哈希（写入 `ADMIN_PASSWORD_HASH`）示例：

```bash
cd api && uv run python -c "from richme_api.security import hash_password; print(hash_password('your-secret'))"
```

依赖变更后请提交 `uv.lock`。

`dev` 含 `httpx`、`pytest`；测试：`uv run pytest tests/ -v`。
