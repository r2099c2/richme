# 步骤 4：前端 — 市场主线（公开展示）与后台（登录 + 维护）

## 目标

在 **`apps/web`** 用 **React + Vite + TypeScript + Tailwind** 实现：

| 区域 | 说明 |
|------|------|
| **前台（匿名）** | **一个页面**：**市场主线** — 以**列表**展示当前（按所选日期）的 **1 条或多条顶层主题**及其**支线**；每条主题内按**时间维度**组织展示；**股票**在主题（及子主题）区块**下方或区域内**排列展示（与 [03-api §3.5](03-api.md) 返回的树形结构一致）。 |
| **后台（JWT）** | **两个页面**：① **简单登录**（密码 → token）；② **后台管理** — 支持上传 **单条或多条** 股票信息（基础字段 + 概念）；支持主题的 **新增、编辑**（不提供主题删除；结束一轮可 PATCH `ended_at`；与步骤 3 角色时段接口可后续再补 UI）。 |

**页面共 3 个**（对应 3 条路由即可，名称可微调）：

1. **`/`** — 市场主线（公开展示）  
2. **`/admin/login`** — 后台登录（仅表单 + `POST /api/v1/admin/auth/login`）  
3. **`/admin`** — 后台管理（需已登录；股票上传 + 主题维护）

**刻意不做（本版）**：终端用户注册、复杂权限、按日 canvas/JSON 批量导入旧契约；**主题物理删除**（前后端均不提供，将来需要再说）；结束展示可将主题 **PATCH `ended_at`**。

**依赖**：步骤 3 API 可访问（`/docs`）；见 [03-api.md](03-api.md)。

**技术栈**：**TanStack Query** 拉取/变更；`fetch` 或 **ky**；路由 **react-router-dom**；布局 **移动优先、响应式**。

---

## 4.1 信息架构与路由

| 路径 | 鉴权 | 用途 |
|------|------|------|
| `/` | 无 | **市场主线**：日期选择（默认今日，**上海时区自然日**与 public API 一致）→ `GET /api/v1/public/themes/by-date/{date}`；列表展示多主线 + 子主题树；主题内按时间聚合展示；股票列表展示在对应主题节点下（API 已嵌套 `children` / `stocks`）。 |
| `/admin/login` | 无 | 密码登录 → 存 `access_token`（`localStorage` 或 `sessionStorage`）→ 跳转 `/admin`。 |
| `/admin` | 需 Bearer | **后台**：① 股票：**单条表单提交**或**多条批量**（同一契约 `POST /api/v1/admin/stocks/bulk`，单条时 `stocks` 数组长度为 1）；② 主题：列表或卡片 + **新建 / 编辑**（`POST`、`PATCH` `/api/v1/admin/themes/...`；不设删除按钮）。未登录访问应重定向到 `/admin/login`。 |

可选：`/admin/logout` 为按钮清除 token 并回登录页，不必单独路由。

---

## 4.2 页面细化

### 4.2.1 市场主线 `/`

- **顶部**：日期选择器（`YYYY-MM-DD`），`useQuery` 依赖 `date` 拉取 public 接口。
- **主体**：**列表**（非画布）。每一项对应 API 返回的一棵**顶层主题**：
  - 展示：`name`、`slug`、`started_at`～`ended_at`、可选 `narrative` 摘要。
  - **子主题（支线）**：缩进或子列表展示，同样带时间范围。
  - **时间聚合**：同一主题下若有多段角色历史，首版可按 API 当日有效行展示；若需「按日历年/阶段」再分块，可在前端对 `stocks` 按 `role_name` / 时间段分组（**MVP 可先平铺列表**，后续增强）。
  - **股票区**：每个主题（及子主题）节点下展示 `stocks[]`：`code`、`name`、`role_name`、`rank`；可选开关 `include_concepts=true` 展示概念标签。
- **空态**：无数据时提示「当日无进行中的主题」或引导改日期。
- **查询参数（可选）**：`?date=YYYY-MM-DD` 与路由同步，便于分享链接。

### 4.2.2 后台登录 `/admin/login`

- 单字段密码（或用户名+密码占位，步骤 3 仅为单密码）。
- `POST /api/v1/admin/auth/login`，成功写入 token，跳转 `/admin`。
- **401/503**：展示错误文案（与 API `detail` 一致）。

### 4.2.3 后台管理 `/admin`

- **股票**
  - **单条**：表单字段对齐 `stocks` 表 + 概念（`concept_codes` 或内联 `concepts[]`，与 [03-api §3.6](03-api.md) 一致）→ 提交 `POST .../admin/stocks/bulk`，body 为 `{ "stocks": [ { ... } ] }`。
  - **多条**：表格多行编辑或 JSON/CSV 粘贴（实现选一种）；最终仍组装为 **一个 bulk 请求** 或分多次 bulk（文档化策略）。
- **主题**
  - **新增**：表单 — `parent_id`（可选，空=顶层）、`slug`、`name`、`narrative`、`started_at`、`ended_at`。
  - **编辑**：`PATCH .../admin/themes/{id}`（含设置 `ended_at` 以结束一轮主题）。
- **角色时段（可选本版）**：若本版不做 UI，可在后台页放「稍后支持」或链到 `/docs`；要做则调用 `POST .../roles`。

---

## 4.3 环境变量

`apps/web/.env.example`：

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

本地复制为 `.env`；代码只读 `import.meta.env.VITE_API_BASE_URL`，**禁止**写死 URL。

---

## 4.4 依赖安装（pnpm）

```bash
cd apps/web
pnpm add @tanstack/react-query react-router-dom
# 可选：ky、react-hook-form、date-fns（日期展示）
```

---

## 4.5 API 客户端（建议）

- `src/lib/api.ts`（或分包）：
  - `baseURL = VITE_API_BASE_URL`，前缀 `/api/v1`。
  - **仅请求后台接口时**附加 `Authorization: Bearer <token>`；**public 请求不带 token**。
  - `401` on admin → 清 token、跳转 `/admin/login`。
- **OpenAPI**：联调以 `http://127.0.0.1:8000/docs` 为准。

---

## 4.6 TanStack Query（建议）

- `QueryClientProvider` 包裹应用。
- 市场主线：`useQuery(['themes', date], () => fetchPublicThemes(date), { enabled: !!date })`。
- 后台：`useMutation` 提交 bulk、主题 CRUD，`onSuccess` `invalidateQueries` 相关键（若后台也展示列表，可与前台列表键协调）。

---

## 4.7 UI 与响应式

- **移动优先**：列表、表单在窄屏单列；表格可用横向滚动。
- **Tailwind**：`sm:` / `md:` 控制间距与侧栏。
- **无障碍**：`label`、按钮可聚焦、对比度合理。

---

## 4.8 与后端联调检查（与步骤 3 一并验收）

- CORS：`OPTIONS` 预检正常；`5173` 访问 `8000`。
- Public：无 token 可访问 `/`。
- Admin：登录后带 token 可调 bulk 与 themes；PATCH 主题后前台日期视图数据一致。

---

## 完成判定（Definition of Done）

**实现**：`apps/web` 已具备下列能力；与步骤 3 的浏览器联调可一并验收。

- [x] `.env.example` 与 README 说明 API 基址配置。
- [x] **三个页面**路由可用：`/`、`/admin/login`、`/admin`。
- [x] 市场主线：可选日期与 `?concepts=1`，列表展示多主线+支线+股票；空态提示。
- [x] 后台登录：密码登录、token 存 `localStorage`、未登录重定向 `/admin/login`。
- [x] 后台：单条表单与多条 JSON → `stocks/bulk`；主题新建、列表、`GET /admin/themes` + 编辑弹窗（`ended_at` 可清空表示进行中）；无主题删除。
- [x] 布局移动优先；表格可横向滚动。

- [x] 与本机后端、CORS（dev）联调可验收；生产环境与域名策略按需另做。

**回溯**：索引见 [README.md](README.md)。**四步实施**：总览计划已标记完成，见 `.cursor/plans/richme_docker与四步实施_d836a99e.plan.md`。
