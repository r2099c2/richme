# 步骤 3：API 设计、后台鉴权与最小业务接口

## 目标

在 **`api/src/richme_api`** 中实现版本化 REST（建议前缀 **`/api/v1`**）、**仅面向管理后台的 JWT 鉴权**、**CORS**，以及与本阶段范围一致的最小接口：

| 侧 | 鉴权 | 能力 |
|----|------|------|
| **管理后台** | JWT（登录后） | 上传/维护股票（基础信息 + 概念）；新增或调整主题（`themes` + 可选 `theme_stock_roles`） |
| **前台展示** | **不做用户登录/注册** | 按**自然日**（或交易日，实现时二选一写死并文档化）聚合展示**当前/历史上某日**的顶层主题及关联股票与角色 |

**刻意延后**：终端用户账号体系、除上述外的通用 CRUD、按日行情表、画布坐标等——后续迭代再加。

**依赖**：步骤 2 已完成，域模型为 `stocks`、`themes`、`theme_stock_roles`、`concepts`、`stock_concepts`（无 `daily_*`、无旧 `tags` 表）。

**技术栈**：FastAPI、**同步 `Session`**、Pydantic v2；OpenAPI `/docs` 为联调入口。

## 3.1 路由与文件组织（建议）

按「后台 / 前台」分路由，避免误把管理接口暴露为匿名可写。

```text
api/src/richme_api/
  api/
    deps.py              # get_db, get_current_admin（仅解析 JWT）
    v1/
      __init__.py
      router.py          # include_router：public_* + admin_*
      public_themes.py      # 无鉴权 GET（按日聚合 themes）
      admin_auth.py         # POST login
      admin_stocks.py       # 股票 + 概念上传/维护
      admin_themes.py       # 主题树 + 角色时段
  schemas/
    ...
  services/              # 可选：复杂事务（如 bulk upsert）
```

`main.py`：`app.include_router(v1_router, prefix="/api/v1")`；根路径保留 `GET /health`（或同步挂到 `/api/v1/health`，二选一写进 README）。

**OpenAPI 标签建议**：`public`、`admin`，便于 `/docs` 分组。

## 3.2 环境变量（在 `.env.example` 增补）

| 变量 | 说明 |
|------|------|
| `JWT_SECRET` | 签名密钥，足够长随机串 |
| `JWT_ALGORITHM` | 默认 `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | 如 `60 * 24` |
| `ADMIN_PASSWORD_HASH` 或 `ADMIN_PASSWORD` | 单管理员账号；实现时选「仅哈希比对」或「首次哈希写入」之一并文档化 |

沿用步骤 2 的 `DATABASE_URL`（或 `Settings.database_url`）。

## 3.3 认证（仅后台）

### 设计约定

- **仅管理员**使用 `POST .../login` 获取 JWT；**前台展示接口全部匿名可读**（若日后需防爬，再单独加限流或静态站缓存策略）。
- **不做**终端用户注册、OAuth、多角色 RBAC（后续再加）。

### `POST /api/v1/admin/auth/login`

- **请求体**：`{"password": "..."}`（MVP 单用户，与 `ADMIN_PASSWORD*` 比对）。
- **响应**：`{"access_token": "...", "token_type": "bearer"}`。
- 依赖：`python-jose` 或 `PyJWT` + `passlib[bcrypt]`（或 `argon2-cffi`）。

### 依赖 `get_current_admin`

- 读取 `Authorization: Bearer <token>`，校验签名与过期。
- 失败返回 `401`。

**验收**：`/docs` 中 Authorize 后仅 `admin/*` 写操作可用；`public/*` 无需 Authorize。

## 3.4 CORS

- `CORSMiddleware`：开发环境 `allow_origins` 含 `http://localhost:5173`；生产用环境变量 `CORS_ORIGINS`（逗号分隔）。

## 3.5 前台展示（匿名，`public`）

### 按日聚合语义（须写进实现说明）

给定查询日 **`date`**（建议 ISO `YYYY-MM-DD`，语义为**日历日**；若你改为沪深交易日，须在 README 与接口描述中统一）：

1. **时间窗口**：将该日映射为 `[day_start, day_end)`（如按上海时区日界，或 UTC 日界——**实现选一种并文档化**）。
2. **顶层主题**：`themes.parent_id IS NULL`，且与当日有交集：  
   `started_at < day_end` 且 (`ended_at IS NULL` 或 `ended_at >= day_start`）。
3. **子主题 / 支线（可选是否在首版返回）**：`parent_id` 指向上述顶层 `id`，同样用 `started_at` / `ended_at` 与当日求交；首版可只返回顶层 + 子树嵌套，或只返回顶层（**计划里定一种，建议首版即返回树形**）。
4. **主题下的股票**：对某个 `theme_id`，取 `theme_stock_roles` 在当日**有效**的行：  
   `valid_from < day_end` 且 (`valid_to IS NULL` 或 `valid_to >= day_start`)。  
   同一 `(theme_id, stock_code, role_name)` 若因数据错误出现多段重叠，实现时可按 `valid_from` 最新优先或返回 500/告警——MVP 约定**数据层保证不重叠**。

### 建议路由

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/public/themes/by-date/{date}` | 返回该日顶层主题列表；每条含子主题（若有）、每主题下股票列表（`code`、`name`、`role_name`、`rank` 等展示字段）；可附带股票基础字段、概念列表（若前端需要，首版可只返回 `code`+`name`+角色）。 |

**查询参数（可选）**：`include_concepts=true` 时在每只股票下挂 `concepts[]`（`code`+`name`）。

本阶段 **不再**单独列 `GET /stocks` 分页、`GET /tags` 等通用读接口，除非步骤 4 联调时发现缺项再补。

## 3.6 管理后台（JWT，`admin`）

### 6.1 股票 + 概念（上传/批量维护）

**目标**：一次请求可 upsert 多只股票的基础字段，并同步 `stock_concepts`；`concepts` 可按 `code` upsert（`name` 可更新）。

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/admin/stocks/bulk` | Body：股票数组，每项含 `stocks` 表字段 + `concept_codes: string[]`（可选）。不存在则创建 `Stock`；`concepts` 中缺的 `code` 可自动创建（需提供 `concept_names` 映射或每项内嵌 `{code, name}`——**实现选一种并写进契约**）。关联表按「本次提交的 codes 全量替换该股概念」或「合并追加」二选一文档化。 |

单条 PATCH（如仅改名称）可作为 **可选** 小接口，非本阶段必做：

| 方法 | 路径 | 说明 |
|------|------|------|
| PATCH | `/api/v1/admin/stocks/{code}` | 部分更新基础字段（不含概念时概念不变） |

### 6.2 主题树（`themes`）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/admin/themes` | 创建主题：`parent_id`（`null` = 顶层主题）、`slug`、`name`、`narrative?`、`started_at`、`ended_at?`（`null` = 进行中）。 |
| PATCH | `/api/v1/admin/themes/{theme_id}` | 调整名称、叙事、时间边界（谨慎：改时间影响「按日聚合」结果，需在前端提示）。 |

### 6.3 主题内角色时段（`theme_stock_roles`）

遵循步骤 2 的**关闭旧行 + 插入新行**语义；API 可暴露为「追加一段」或「替换某日后的龙头」等辅助操作，MVP 建议：

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/admin/themes/{theme_id}/roles` | Body：`stock_code`, `role_name`, `rank`, `valid_from`, `valid_to?`；插入一行。若业务需要先关闭同主题同股同角色的上一段，可由服务端根据 `(theme_id, stock_code, role_name)` 查当前 `valid_to IS NULL` 行并写入 `valid_to = valid_from`（**可选自动化，须在文档中写明是否开启**）。 |

批量调整可用多次 POST 或后续再加 `PUT .../roles/bulk`。

## 3.7 本阶段明确不实现（从旧计划中移除）

- ~~`/days/...`~~、`daily_themes`、`daily_stocks`、旧 **tags** 独立 CRUD。
- ~~`POST /days/import`~~ 中与画布、`close_price`、`ladder` 等绑定的 JSON；若需批量导入，以 **§3.6 的 `stocks/bulk` + `themes` + `roles`** 为准另定 schema。
- 终端用户 JWT、注册、权限分级。

## 3.8 错误与 HTTP 状态

- 校验失败：`422`（Pydantic 明细）。
- 业务错误（如 bulk 中引用不存在的 `stock_code` 且策略为禁止自动创建）：`400`，可附 `missing_codes`。
- 未授权访问 admin：`401`。

## 3.9 测试建议（可选）

- `pytest` + `TestClient`：`GET /health`、`POST /admin/auth/login`、admin 路由 401/200、`GET /api/v1/public/themes/by-date/{date}` 200（可造种子数据）。
- 或以 `/docs` 手工验收（MVP 可延后自动化）。

## 完成判定（Definition of Done）

**代码与文档**：已在仓库内实现并通过 `uv run pytest tests/`（见 `api/`）。**浏览器 CORS、与前端联调及端到端验收**：与 **步骤 4** 完成后一并验证。

- [x] `/docs` 中 `public` 与 `admin` 分组清晰；管理员可登录并调用 **§3.6** 路由；匿名可访问 **§3.5**。
- [x] CORS 已配置（dev 默认 5173）；浏览器侧预检与真实联调留待步骤 4 复验。
- [x] `POST /api/v1/admin/stocks/bulk` 在合法负载下事务成功；失败策略与文档一致。
- [x] `GET /api/v1/public/themes/by-date/{date}` 的聚合规则与 §3.5 一致（pytest 覆盖匿名访问；含种子数据断言可后续加强）。
- [x] `api/README.md` 已补充：主要路由、**仅后台 JWT**、前台匿名、环境变量与哈希生成示例。

**下一步**：实现 [04-web-ui.md](04-web-ui.md)（后台上传/维护 + 前台按日主题展示），再与步骤 3 一起做联调验收。
