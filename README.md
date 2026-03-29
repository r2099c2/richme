# Richme

个人股票笔记：FastAPI 后端 + React 前端，PostgreSQL 由 Docker Compose 提供。

## 工具链

| 区域 | 工具 |
|------|------|
| 前端 `apps/web` | **pnpm**（提交 `pnpm-lock.yaml`） |
| 后端 `api` | **uv**（提交 `uv.lock`） |
| 数据库 | Docker：`compose.yaml` 中的 **postgres:16** |

## 快速开始

### 1. 数据库（PostgreSQL）

```bash
docker compose up -d
docker compose ps
# 可选：docker compose exec postgres psql -U richme -d richme -c "SELECT 1"
```

将仓库根目录 [`.env.example`](.env.example) 复制为 `.env`（本地开发可选；步骤 2 起 API 会读 `DATABASE_URL`）。

**云上**：勿把 **5432** 暴露到公网；仅开放 **22 / 80 / 443** 等。数据库与 API 同机时仍可用 `localhost:5432`。

### 2. 后端 API

```bash
cd api
uv sync --all-extras
uv run uvicorn richme_api.main:app --reload --host 0.0.0.0 --port 8000
```

- 健康检查：http://127.0.0.1:8000/health  
- OpenAPI：http://127.0.0.1:8000/docs  

### 3. 前端 Web

```bash
cd apps/web
pnpm install
pnpm dev
```

浏览器打开终端提示的地址（一般为 http://127.0.0.1:5173）。路由：**市场主线** `/`、**后台登录** `/admin/login`、**后台管理** `/admin`。

复制 `apps/web/.env.example` 为 `apps/web/.env`，设置 `VITE_API_BASE_URL`（与 API 同源或可达地址）。

## 实施计划

分步说明见 [docs/plans/](docs/plans/)（步骤 1 完成后可继续步骤 2 ORM）。

## 许可证

见 [LICENSE](LICENSE)。
