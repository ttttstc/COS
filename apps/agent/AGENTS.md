# AGENTS.md — apps/agent

Python 3.12 LangGraph 服务 `lyl-agent`，包源码在 `src/lyl_agent/`，
graph ID 为 `lyl_counsel_agent`（见 `langgraph.json`）。

## 命令（本目录内执行；根聚合脚本见根 AGENTS.md）

| 命令 | 作用 |
|---|---|
| `uv sync --dev` | 安装/同步依赖（含 pytest、langgraph-cli） |
| `uv run pytest` | 运行 `tests/` 下全部测试（`-q`，asyncio auto） |
| `uv run langgraph dev` | 启动开发服务器 http://localhost:2024（内存态，重启即清空 Thread） |

## 约定

- 配置用 pydantic-settings，环境变量统一 `LYL_` 前缀，读自本目录 `.env`
  （由 `.env.example` 复制）；密钥只存在这里，绝不提交。
- 默认 `LYL_MODEL_PROVIDER=stub`，无需真实模型密钥即可跑通全部测试与冒烟。
- 新增/修改 graph 行为时同步补 `tests/`；测试需覆盖模式路由与模型降级路径。
