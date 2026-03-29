# Richme 实施计划索引

总览（选型与顺序）见 Cursor 计划 **Richme Docker 与四步实施**，或仓库内各步详情如下：

| 顺序 | 文档 | 内容 |
|------|------|------|
| 1 | [01-scaffold.md](01-scaffold.md) | 仓库结构、Docker PostgreSQL、api 骨架（**uv**）、apps/web（**pnpm**）、环境变量示例 |
| 2 | [02-database-orm.md](02-database-orm.md) | 域模型：`stocks`、`themes`（树+周期）、`theme_stock_roles`（时序）、`concepts`/`stock_concepts`；§2.8 列出 [03-api](03-api.md)/[04-web](04-web-ui.md) 待对齐项 |
| 3 | [03-api.md](03-api.md) | **已实现**（见 `api/`）；仅后台 JWT + `public` 按日主题；与步骤 4 联调时一并验收 |
| 4 | [04-web-ui.md](04-web-ui.md) | **已实现** `apps/web`：三页 + Query；与 API 浏览器联调待验收 |

执行时 **严格按 1 → 2 → 3 → 4**，每份文档末尾有 **完成判定（Definition of Done）**。

**决策**：工具链已定为 **pnpm**（前端）与 **uv**（Python）。若实装时出现其它等价选型，**先与维护者确认**后再改计划或代码（见 [MAINTAINER.md](MAINTAINER.md)）。
