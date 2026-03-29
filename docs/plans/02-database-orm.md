# 步骤 2：ORM 模型、Alembic 与连接 Docker PostgreSQL

## 目标

在 **`api/`** 内用 **SQLAlchemy 2.x 同步 `Session` + psycopg3** 定义首版表结构；用 **Alembic** 生成并应用迁移；从 FastAPI 用依赖注入拿到 `Session` 并做一次简单读库验证（临时路由，步骤 3 再整理为正式 API）。

**依赖**：步骤 1 已完成，`docker compose up -d` 数据库可连。

## 2.1 增加 Python 依赖

在 `api/pyproject.toml` 增加（版本号按当前稳定版锁定）：

- `sqlalchemy >= 2.0`
- `psycopg[binary]`（psycopg3）
- `alembic`
- `pydantic-settings`

在 `api/` 执行 `uv sync`（或 `uv add` 新增依赖后自动同步），安装后确认：`uv pip show sqlalchemy`（或 `uv tree | head`）。

## 2.2 工程内模块划分（建议）

```text
api/src/richme_api/
  __init__.py
  main.py
  config.py          # Settings(BaseSettings)，读 DATABASE_URL
  db/
    __init__.py
    base.py          # DeclarativeBase
    session.py       # engine, SessionLocal, get_db 生成器
  models/
    __init__.py      # 导出所有模型，供 Alembic env.py 导入
    stock.py         # Stock
    theme.py         # Theme, ThemeStockRole
    concept.py       # Concept, StockConcept（关联表）
```

## 2.3 首版表与字段（MVP，可后续加索引/约束）

**约定**：主题周期与角色区间使用 **`DateTime(timezone=True)`**（PostgreSQL `timestamptz`），便于半日级复盘；若只按交易日维护，可在应用层统一写入日界时刻。金额类字段若后续有按日行情表再用 `Numeric`/`Date`。

### 关系总览

```mermaid
erDiagram
  stocks ||--o{ stock_concepts : "M:N"
  concepts ||--o{ stock_concepts : ""
  themes ||--o{ themes : "parent_id"
  themes ||--o{ theme_stock_roles : ""
  stocks ||--o{ theme_stock_roles : ""
```

### `stocks`

| 列 | 类型 | 说明 |
|----|------|------|
| `code` | `String(16)` PK | 股票代码，如 600519 |
| `name` | `String(64)` | 简称 |
| `region` | `String(64)` nullable | 地域 |
| `region_secondary` | `String(64)` nullable | 二级地域 |
| `industry` | `String(128)` nullable | 行业 |
| `industry_secondary` | `String(128)` nullable | 二级行业 |
| `industry_segment` | `String(128)` nullable | 细分行业 |

本版 **不含** `exchange` 列。

### `themes`（主题 = 一轮炒作周期 + 树）

| 列 | 类型 | 说明 |
|----|------|------|
| `id` | `Integer` PK autoincrement | **不同轮次唯一标识** |
| `parent_id` | `Integer` FK `themes.id` nullable | **NULL = 顶层主线**；非空 = 该父主题下的支线（子节点） |
| `slug` | `String(64)` **不唯一** | 便于筛选/展示；同 slug 多行表示历史上多轮炒作 |
| `name` | `String(128)` | 展示名 |
| `narrative` | `Text` nullable | 核心逻辑等（可选） |
| `started_at` | `DateTime(timezone=True)` | 阶段开始 |
| `ended_at` | `DateTime(timezone=True)` nullable | **NULL = 进行中**；有值 = 阶段已结束 |

**约束与索引建议**：

- `parent_id` 自引用；避免成环（MVP 可仅文档约定，后续可加检查）。
- 索引：`parent_id`；`slug`（非唯一）；按需 `(started_at, ended_at)`。

### `theme_stock_roles`（主题内股票地位，**带时间轴**）

一行表示：在某主题 `theme_id` 下，股票 `stock_code` 在 **连续时间区间** `[valid_from, valid_to)` 内持有 `role_name` 与 `rank`。

| 列 | 类型 | 说明 |
|----|------|------|
| `id` | `Integer` PK autoincrement | |
| `theme_id` | FK `themes.id` | |
| `stock_code` | FK `stocks.code` | |
| `role_name` | `String(64)` | 龙头 / 龙二 / 中军 / 自定义 |
| `rank` | `Integer` | **数值越大地位越高**（同主题、同一时刻比较用） |
| `valid_from` | `DateTime(timezone=True)` | 本段生效起点 |
| `valid_to` | `DateTime(timezone=True)` nullable | **NULL = 本段仍有效**；有值 = 本段结束 |

**语义（维护规则）**：

- **换人**：A 不再是龙头 → 将 A 当前打开行的 `valid_to` 置为变更时刻；为 B **插入**新行，`valid_from` = 该时刻。
- **失位后再回来**：同一 `(theme_id, stock_code)` 允许多段不重叠历史，多行即可。
- **仅改 rank 或 role_name**：**关闭旧行**（写 `valid_to`）+ **插入新行**，禁止覆盖历史。
- **唯一约束**：`UNIQUE(theme_id, stock_code, role_name, valid_from)`，防重复插入。
- **不要**对 `(theme_id, stock_code)` 做全表唯一（与多段历史冲突）。

### `concepts`（股票概念，原「tags」语义）

| 列 | 类型 | 说明 |
|----|------|------|
| `id` | `Integer` PK autoincrement | |
| `code` | `String(64)` **unique** | 稳定键，如 `green_power` |
| `name` | `String(128)` | 展示名，如「绿色电力」 |

可选后续：`category`、`sort_order`（本版可不建列）。

### `stock_concepts`（股票 ↔ 概念，多对多）

| 列 | 类型 | 说明 |
|----|------|------|
| `stock_code` | FK `stocks.code` | 复合主键之一 |
| `concept_id` | FK `concepts.id` | 复合主键之一 |

**唯一约束**：`(stock_code, concept_id)`（即复合主键）。

### 已移除的表（勿再使用）

- **`daily_themes`**、**`daily_stocks`**：已由「主题周期 `themes` + 角色时序 `theme_stock_roles`」替代；按日叙事可放在 `themes.narrative` 或后续扩展。
- **`tags`**、**`daily_stock_tags`**：由 **`concepts` + `stock_concepts`** 替代。

### 后续迭代（可选表，与主题模型解耦）

若仍需 **按日收盘价、连板梯队、画布坐标、手记** 等，可另建表（例如 `stock_daily_quotes`：`trade_date` + `stock_code` + 价格/梯队/坐标等），**不要**与 `theme_stock_roles` 混在同一张「日记账」里强扭。

## 2.4 `config.py` 与 `DATABASE_URL`

- 使用 `pydantic-settings`，从环境变量读取 `DATABASE_URL`（与 `.env` / `.env.example` 一致）。
- **同步 URL**：`postgresql+psycopg://user:pass@host:5432/dbname`。

## 2.5 `session.py`（同步）

- `create_engine(settings.database_url, pool_pre_ping=True)`。
- `sessionmaker(bind=engine, autoflush=False, autocommit=False)`。
- `get_db()`：`Session` 在 `try/finally` 中 `close()`。

## 2.6 初始化 Alembic（在 `api/` 目录执行）

```bash
cd api
uv run alembic init alembic
```

**必改文件**：

1. **`alembic/env.py`**
   - `from richme_api.db.base import Base`
   - `from richme_api.models import *` 确保所有表注册到 `metadata`。
   - `target_metadata = Base.metadata`
   - `run_migrations_offline` / `run_migrations_online` 里使用与 `session.py` **相同**的 `DATABASE_URL`（可从 `Settings` 读取）。

2. **`alembic.ini`**
   - `script_location = alembic`
   - `sqlalchemy.url` 可留占位，**优先在 env.py 用环境变量覆盖**（避免把密码写进 ini 提交 Git）。

**生成首版迁移**：

```bash
cd api
uv run alembic revision --autogenerate -m "initial_schema"
```

人工检查生成的 `alembic/versions/*.py`（外键、唯一约束是否齐全；无多余 drop）。

**应用迁移**：

```bash
cd api
uv run alembic upgrade head
```

**验收**：在 `psql` 中 `\dt` 可见 `stocks`、`themes`、`theme_stock_roles`、`concepts`、`stock_concepts`。

## 2.7 与 FastAPI 的临时联调（可选但推荐）

在 `main.py` 增加 **临时** `GET /debug/db`，`Depends(get_db)` 执行 `select(1)` 或 `session.scalars(select(Stock).limit(1))`；步骤 3 开始前可删除或改为正式路由。

## 2.8 与步骤 3 / 4 文档的联动检查（待对齐）

**说明**：下列两项属于 **步骤 3 / 4** 的文档与实现工作；步骤 2 只需在本节 **登记** 待办（已完成）。实施数据模型后请修订：

- [ ] [03-api.md](03-api.md)：删除基于 `daily_themes` / `daily_stocks` 的 `/days/...` 契约；补充 `themes`、`theme_stock_roles`、`concepts`、`stock_concepts` 的 CRUD/查询草案（含按 `slug`、时间区间、概念筛票等）。
- [ ] [04-web-ui.md](04-web-ui.md)：将「按日主线编辑」调整为「主题树 + 角色时间轴 + 概念维护」等占位描述。

（索引条目同步于 [docs/plans/README.md](README.md) 中「步骤 2 修订」说明。）

## 完成判定（Definition of Done）

**步骤 2 范围**（下列已全部满足；若你本地尚未跑过迁移，请先 `docker compose up -d` 再执行 `uv run alembic upgrade head`）：

- [x] `02-database-orm.md` 本节与当前域模型一致，无已删除表的残留要求。
- [x] `uv run alembic upgrade head` 在数据库可达、配置正确时可无报错执行成功。
- [x] 应用迁移后，PostgreSQL 中表结构与 §2.3 一致（`stocks`、`themes`、`theme_stock_roles`、`concepts`、`stock_concepts`）。
- [x] API 能通过 `get_db` 执行一次读库（`GET /debug/db`）。
- [x] 结构变更路径明确：**只改 models → autogenerate → review → upgrade**。
- [x] §2.8 待对齐项已登记；**03/04 正文修订**在步骤 3、4 中完成（见上表勾选）。

**下一步**：按 §2.8 修订 [03-api.md](03-api.md) 与 [04-web-ui.md](04-web-ui.md)，再实现业务 API；或继续按 [README.md](README.md) 顺序推进。
