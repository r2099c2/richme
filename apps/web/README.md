# Richme Web

Vite + React + TypeScript + Tailwind CSS v4；**TanStack Query** + **react-router-dom**。包管理：**pnpm**。

## Prerequisites

- Node.js 20+
- [pnpm](https://pnpm.io/installation) 9.x（与 `package.json` 的 `packageManager` 对齐）

## 配置

复制 `.env.example` 为 `.env`，设置后端地址：

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

## Commands

```bash
pnpm install
pnpm dev
```

- 构建：`pnpm build`
- 预览：`pnpm preview`
- 检查：`pnpm lint`

## 路由（步骤 4）

| 路径 | 说明 |
|------|------|
| `/` | 市场主线（公开）：`GET /api/v1/public/themes/by-date/{date}` |
| `/admin/login` | 后台登录 |
| `/admin` | 股票 bulk（单条/JSON 多条）、主题列表与新建/编辑（需 JWT） |

联调时先启动 API（`uvicorn`）与数据库，并配置 CORS。详见 [docs/plans/04-web-ui.md](../docs/plans/04-web-ui.md)。
