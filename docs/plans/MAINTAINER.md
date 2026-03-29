# 维护者约定（工具链与决策）

## 已定工具

- 前端：**pnpm**
- Python：**uv**（`uv sync` / `uv run`）

维护者本机 **已安装 pnpm 与 uv** 时，步骤文档里的安装说明可跳过，仅做版本校验。

## 后续变更原则

当出现 **同类工具的可选方案**（例如换包管理器、换 Python 工具链、ORM/迁移等价物、部署方式多选一）时，助手或协作者应 **先向维护者确认** 再改计划或代码。

Cursor 规则：[.cursor/rules/tooling-and-confirm.md](../../.cursor/rules/tooling-and-confirm.md)（frontmatter 含 `alwaysApply: true`）。若你更习惯 `.mdc` 扩展名，可重命名该文件，内容不变。
