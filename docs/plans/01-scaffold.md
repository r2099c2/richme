# 步骤 1：项目初始化与 Docker PostgreSQL

## 目标

在仓库中建立 **`api/`**（FastAPI）与 **`apps/web/`**（**pnpm** + Vite + React + TS），并用 **Docker Compose 单独运行 PostgreSQL**；本步结束时 **不强制** 完成 ORM/Alembic（留给步骤 2），但须能起库、起 API 健康检查、起前端开发服务器。

**维护者约定**：若本机 **已安装 pnpm 与 uv**，下列安装说明可跳过，只做 `pnpm -v` / `uv --version` 校验。今后若出现 **同类工具的可选方案**，实装前应先与维护者确认（见 [MAINTAINER.md](MAINTAINER.md)、[.cursor/rules/tooling-and-confirm.md](../../.cursor/rules/tooling-and-confirm.md)）。

## 前置条件

### 前端：pnpm（包管理）

- **Node.js**（建议 20 LTS 或当前 LTS）。
- **pnpm**：维护者通常已安装；未安装时可参考 [pnpm 安装](https://pnpm.io/installation)，例如 `corepack enable && corepack prepare pnpm@9.15.4 --activate`（与 `package.json` 的 `packageManager` 对齐）。
- 验证：`pnpm -v`。

### 后端：uv（Python 环境与依赖）

- **uv**：维护者通常已安装；未安装见 [uv 文档](https://docs.astral.sh/uv/getting-started/installation/)（如 `brew install uv` 或官方安装脚本）。
- 验证：`uv --version`。  
- **用法约定**：`api/` 下用 **`uv sync`** 创建/同步虚拟环境（默认 `.venv`）并安装 `pyproject.toml` 依赖；运行命令用 **`uv run …`**，无需手动 `source .venv/bin/activate`（需要时仍可激活）。  
- 锁文件：执行 `uv sync` 后会生成或更新 **`api/uv.lock`**，**应提交到 Git**，便于本地与 CI/服务器一致。

### Docker

- **Docker Desktop**（macOS）或 **Docker Engine + Compose**（Linux）。
- 验证：`docker compose version`。

## 1.1 目录结构（创建后应类似）

```text
richme/
  compose.yaml
  .env.example
  README.md
  api/
    pyproject.toml
    uv.lock              # uv sync 生成，建议提交
    README.md
    src/
      richme_api/
        __init__.py
        main.py
  apps/
    web/
      package.json
      pnpm-lock.yaml     # pnpm install 生成，提交
      vite.config.ts
      index.html
      src/
      ...
```

## 1.2 Docker Compose（仅 PostgreSQL）

在仓库根目录新增 `compose.yaml`：

- **服务名**：`postgres`（便于步骤 2 文档与 `DATABASE_URL` 说明一致）。
- **镜像**：`postgres:16`（或 `16-alpine`，团队统一即可）。
- **环境变量**（与 `.env.example` 对齐）：
  - `POSTGRES_USER=richme`
  - `POSTGRES_PASSWORD=richme`（示例；本地可弱，**勿用于公网**）
  - `POSTGRES_DB=richme`
- **端口**：`5432:5432`（本机 API 用 `localhost:5432` 连接）。
- **卷**：命名 volume（如 `richme_pg_data`）挂载 `/var/lib/postgresql/data`，避免删容器丢数据。

**验收命令**：

```bash
docker compose up -d
docker compose ps
# 可选：docker compose exec postgres psql -U richme -d richme -c "SELECT 1"
```

## 1.3 根目录 `.env.example`（不写真实密钥）

至少包含（键名固定，值示例）：

```env
# 与 compose 中 POSTGRES_* 一致；SQLAlchemy 同步驱动使用 psycopg3
DATABASE_URL=postgresql+psycopg://richme:richme@localhost:5432/richme

# 步骤 3 才会用到，可先占位
# JWT_SECRET=change-me-in-production
```

复制为本地 `.env`（已 gitignore）后再开发。

## 1.4 Python 后端骨架 `api/`

- 新增 `api/pyproject.toml`：
  - 包名如 `richme-api`，使用 `src` 布局：`packages` 指向 `src`。
  - **本步最少依赖**：`fastapi`、`uvicorn[standard]`（步骤 2 再由 `uv add` 增加 `sqlalchemy`、`psycopg[binary]`、`alembic`、`pydantic-settings` 等）。
- 新增 `api/src/richme_api/main.py`：
  - 创建 `FastAPI()` 实例。
  - 注册 `GET /health`，返回 `{"status": "ok"}`（或带版本号）。
- **本步不要求** 连接数据库；`/health` 无 DB 依赖。

**本地运行（uv）**：

```bash
cd api
uv sync --all-extras    # 安装依赖并生成/更新 uv.lock；无 dev extra 时可写 uv sync
uv run uvicorn richme_api.main:app --reload --host 0.0.0.0 --port 8000
```

说明：`uv sync` 会在 `api/.venv` 创建虚拟环境；**不要**与 `pip install -e` 混用在同一目录，以免两套工具打架。

**验收**：`curl -s http://127.0.0.1:8000/health` 返回 JSON 且 `status` 为 ok。

## 1.5 前端骨架 `apps/web`

- 使用 **pnpm** 创建或维护 Vite React TS 项目（目录 `apps/web`）；`package.json` 中声明 `"packageManager": "pnpm@x.y.z"` 以便 Corepack 锁定版本。
- 安装并配置 **Tailwind CSS**（Vite 官方文档流程即可）。
- 根组件或某页面展示项目名「Richme」占位即可。
- 可选：`apps/web/.env.example` 中写 `VITE_API_BASE_URL=http://127.0.0.1:8000`（步骤 4 正式使用）。

**验收**：

```bash
cd apps/web
pnpm install
pnpm dev
```

浏览器能打开 Vite 默认端口（一般为 5173），无报错。

## 1.6 `.gitignore` 与 `README.md`

- 确保忽略：`.env`、`api/.venv/`、`**/__pycache__`、`apps/web/node_modules`、`dist`、`build`。  
- **不要**忽略：`api/uv.lock`、`apps/web/pnpm-lock.yaml`（锁文件应提交）。
- 根 `README.md` 写清：
  - 如何 `docker compose up -d`
  - 如何启动 API（`cd api` + **`uv sync` + `uv run uvicorn …`**）
  - 如何启动 Web（`cd apps/web` + **`pnpm dev`**）
  - **工具**：前端 **pnpm**，后端 **uv**；**云上注意**：勿将 `5432` 暴露公网；仅 `22/80/443` 等。

## 完成判定（Definition of Done）

- [x] `docker compose up -d` 后，`psql` 或 `SELECT 1` 可连上 `richme` 库。
- [x] `GET /health` 在本机返回成功（通过 `uv run uvicorn`）。
- [x] `apps/web` 下 **`pnpm dev`** 可访问页面。
- [x] `.env.example` 存在且与 compose 中数据库账号一致；`.env` 未提交 Git。
- [x] 根 README 含上述三条启动说明，并写明 **pnpm / uv**。

**下一步**：后续步骤见 [docs/plans/README.md](README.md)（四步总览已交付）。
