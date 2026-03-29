# Richme 实施计划索引

**状态**：步骤 1–4 已按文档交付；Cursor 总览计划 `.cursor/plans/richme_docker与四步实施_d836a99e.plan.md` 已标记 **completed**。

总览（选型与顺序）见上述 Cursor 计划，或仓库内各步详情如下：

| 顺序 | 文档 | 内容 |
|------|------|------|
| 1 | [01-scaffold.md](01-scaffold.md) | 仓库结构、Docker PostgreSQL、api 骨架（**uv**）、apps/web（**pnpm**）、环境变量示例 |
| 2 | [02-database-orm.md](02-database-orm.md) | **已完成**：域模型 + Alembic；§2.8 与 03/04 已对齐 |
| 3 | [03-api.md](03-api.md) | **已完成**：`api/` 后台 JWT + `public` 主题接口 |
| 4 | [04-web-ui.md](04-web-ui.md) | **已完成**：`apps/web` 三页 + Query |

新环境搭建仍建议 **严格按 1 → 2 → 3 → 4** 阅读；每份文档文末有 **完成判定（Definition of Done）**。

**决策**：工具链已定为 **pnpm**（前端）与 **uv**（Python）。若实装时出现其它等价选型，**先与维护者确认**后再改计划或代码（见 [MAINTAINER.md](MAINTAINER.md)）。
