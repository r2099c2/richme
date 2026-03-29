# 步骤 3：API 设计、JWT 与业务接口实现

## 目标

在 **`api/src/richme_api`** 中实现版本化 REST API（建议前缀 `/api/v1`）、**JWT 登录与保护路由**、**CORS**、**股票/主线/当日数据 CRUD** 与 **JSON 批量导入**；以 **OpenAPI `/docs`** 为联调入口；**同步 `Session`** 贯穿。

**依赖**：步骤 2 已完成，迁移已 `upgrade head`。

## 3.1 路由与文件组织（建议）

```text
api/src/richme_api/
  api/
    deps.py          # get_db, get_current_user
    v1/
      __init__.py
      router.py      # 聚合 include_router
      auth.py
      stocks.py
      themes.py
      days.py
      import_bulk.py
  schemas/           # Pydantic v2 模型
    ...
  services/          # 可选：复杂事务放 service 层
```

`main.py`：`app.include_router(v1_router, prefix="/api/v1")`；保留 `GET /health` 在根或 `/api/v1/health`（二选一，文档写清）。

## 3.2 环境变量（在 `.env.example` 增补）

| 变量 | 说明 |
|------|------|
| `JWT_SECRET` | 签名密钥，足够长随机串 |
| `JWT_ALGORITHM` | 默认 `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | 如 `60 * 24` |

## 3.3 认证

### `POST /api/v1/auth/login`

- **请求体**：`{"password": "..."}`（MVP 单用户；密码与服务器环境变量 `ADMIN_PASSWORD_HASH` 比对，或首次用 `ADMIN_PASSWORD` 哈希后写入——实现时选一种并文档化）。
- **响应**：`{"access_token": "...", "token_type": "bearer"}`。
- 使用 `python-jose` 或 `PyJWT` + `passlib[bcrypt]`（或 `argon2-cffi`）处理密码与 JWT。

### 依赖 `get_current_user`

- 读取 `Authorization: Bearer <token>`，校验签名与过期。
- 失败返回 `401`。

**验收**：`/docs` 中 Authorize 后可访问受保护路由。

## 3.4 CORS

- `CORSMiddleware`：`allow_origins` 开发环境包含 `http://localhost:5173`；生产改为前端域名（环境变量 `CORS_ORIGINS` 逗号分隔）。

## 3.5 业务路由（最小集合）

以下均需 **JWT**（除 login 外）。路径与查询参数可微调，但需 **先写 OpenAPI 再让步骤 4 对齐**。

### Stocks

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/stocks` | 分页或全量列表（MVP 可简单 `limit`） |
| POST | `/stocks` | 创建单条 `Stock` |
| GET | `/stocks/{code}` | 详情 |
| PATCH | `/stocks/{code}` | 部分更新 |

### Themes

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/themes` | 列表 |
| POST | `/themes` | 创建 `slug` + `name` |

### Tags（供前端多选）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/tags` | 标签列表（仅 JWT） |
| POST | `/tags` | 创建标签（`name` 唯一；冲突返回 409） |

### Daily（按交易日 + 主线）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/days/{trade_date}/themes/{theme_id}` | 返回当日主线信息 + `daily_stocks` 列表 + 关联 tags |
| PUT | `/days/{trade_date}/themes/{theme_id}` | 更新 `daily_themes.narrative` 等 |
| PUT | `/days/{trade_date}/themes/{theme_id}/stocks/{code}` | 创建或更新 `daily_stocks` 一行 |
| DELETE | `/days/{trade_date}/themes/{theme_id}/stocks/{code}` | 从当日主线移除该股 |

`trade_date` 建议格式 **ISO `YYYY-MM-DD`**（path 或 query 统一一种）。

### JSON 导入

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/days/import` | Body 为 JSON，见下节 |

## 3.6 JSON 导入契约（服务端 Pydantic 校验）

**请求体示例**：

```json
{
  "trade_date": "2026-03-29",
  "theme_slug": "power",
  "narrative": "可选",
  "stocks": [
    {
      "code": "000001",
      "close_price": 12.34,
      "ladder": "3板",
      "role_status": "龙头",
      "tags": ["观察"],
      "memo": "",
      "layout": { "x": 10, "y": 20 }
    }
  ]
}
```

**事务规则**：

1. 解析 `theme_slug` → 找到或创建 `themes`（若策略为「必须已存在」则返回 400，二选一写进 README）。
2. 确保 `daily_themes` 存在 `(trade_date, theme_id)`。
3. 对每条 `stocks[]`：`stock` 必须在 `stocks` 表存在，**否则整单 400** 并列出缺失 `code`（与总览一致）。
4. Upsert `daily_stocks`；同步 `daily_stock_tags`（先删当日该股旧标签再插入，或按 diff 合并——实现选一种并文档化）。

## 3.7 错误与 HTTP 状态

- 校验失败：`422`，body 含 Pydantic 错误明细。
- 业务错误（缺股票代码）：`400`，JSON `{"detail": "...", "missing_codes": ["..."]}`。
- 未授权：`401`。

## 3.8 测试建议（可选）

- `pytest` + `TestClient`：至少覆盖 `GET /health`、`login`、一条受保护路由 401/200。
- 或使用 `/docs` 手工验收（MVP 可延后自动化）。

## 完成判定（Definition of Done）

- [ ] `/docs` 可登录并调用所有上述路由。
- [ ] CORS 下前端 origin（5173）无预检失败（步骤 4 验证亦可）。
- [ ] `POST /days/import` 在合法 JSON 下事务成功；缺 `stock` 时返回 400 且不残留半条数据。
- [ ] README 补充 API 基址、鉴权方式、`.env` 中 JWT 相关变量说明。

**下一步**：打开 [04-web-ui.md](04-web-ui.md)。
