# 步骤 4：前端展示、录入与 JSON 上传

## 目标

在 **`apps/web`** 用 **React + Vite + TS + Tailwind** 实现：配置 **API 基址**、**JWT 登录态**、**TanStack Query** 拉取/变更数据；页面覆盖 **日期 + 主题选择**、**当日股票表格编辑**、**JSON 导入**；布局 **移动优先、响应式**。

**依赖**：步骤 3 已完成，本机 `http://127.0.0.1:8000`（或文档约定端口）可访问 `/docs`。

## 4.1 环境变量

- `apps/web/.env.example`：

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

- 本地复制为 `.env`（gitignore）。代码中仅使用 `import.meta.env.VITE_API_BASE_URL`，**不要**写死 URL。

## 4.2 依赖安装（pnpm）

```bash
cd apps/web
pnpm add @tanstack/react-query react-router-dom
# 表单可选：react-hook-form；HTTP 可选：原生 fetch 或 ky/axios
```

## 4.3 API 客户端封装（建议）

- 新建 `src/lib/api.ts`（或类似）：
  - `baseURL = VITE_API_BASE_URL`
  - `fetch` 封装：自动加 `Authorization: Bearer <token>`（从 `localStorage` 或 `sessionStorage` 读取；登出清除）。
  - 统一解析 `401` → 跳转登录页。
- **路径前缀**：与步骤 3 一致，如 `/api/v1`。

## 4.4 路由（react-router-dom）

| 路径 | 用途 |
|------|------|
| `/login` | 密码登录，成功后存 token，跳转 `/` |
| `/` | 选择日期、选择主题（下拉或侧栏）；展示当日列表 |
| `/import` | 文本域或文件读取 JSON，调用 `POST /api/v1/days/import`，展示成功/错误 |

（路径名可调整，需在 README 说明。）

## 4.5 TanStack Query

- `QueryClientProvider` 包裹应用。
- 列表页：`useQuery` 拉取 `GET /api/v1/days/{date}/themes/{themeId}`。
- 保存单行：`useMutation` → `PUT .../stocks/{code}`，`onSuccess` 失效相关 query。
- 导入：`useMutation` → `POST .../days/import`。

## 4.6 UI 与响应式

- **移动优先**：表格在窄屏可改为卡片列表或横向滚动容器（`overflow-x-auto`）。
- **Tailwind**：断点 `sm:` / `md:` 调整 padding、侧栏显隐。
- **无障碍**：按钮与输入框带 `label`；焦点可见。

## 4.7 页面功能清单

### 登录页

- 输入密码 → `POST /api/v1/auth/login` → 存 `access_token`。

### 主页（当日编辑）

- 日期选择器（`input type="date"` 或组件库），格式 `YYYY-MM-DD`。
- 主题：从步骤 3 约定的主题列表或 `GET /api/v1/public/themes/by-date/{date}` 等接口填充；支持跳转前记住上次 `themeId`（`localStorage`）。
- 表格列（与 API 字段对齐）：代码、名称（可来自 stocks 或嵌套返回）、收盘价、梯队、地位、备注、标签（多选需 `tags` 列表接口，若步骤 3 未提供 `GET /tags` 则步骤 3 补一个只读列表）。
- 「保存」：每行失焦保存或显式按钮调用 PUT。

### 导入页

- `textarea` 粘贴 JSON 或 `<input type="file" accept="application/json">` 读取。
- 提交前可做前端 JSON.parse 预检；最终以服务端返回为准。
- 展示 `400` 时 `missing_codes` 等明细。

## 4.8 与后端联调检查

- 浏览器 Network：预检请求 `OPTIONS` 返回正确 CORS。
- 带 token 的请求 `200`；清除 token 后 `401` 回登录。

## 完成判定（Definition of Done）

- [ ] `.env.example` 存在且文档说明如何配置 API 地址。
- [ ] 登录后可浏览至少一个受保护页面。
- [ ] 能选择日期与主题并看到当日数据（空态亦可）。
- [ ] 能编辑一行并持久化（刷新后仍在）。
- [ ] JSON 导入页能提交步骤 3 约定格式的 body，并显示错误信息。
- [ ] 窄屏（如 375px 宽）可用，无横向撑破视口（表格除外可用滚动）。

**回溯**：总览与索引见 [README.md](README.md)。
