# AGENTS.md

COS 是 pnpm + uv 双子项目 monorepo：`apps/web`（Next.js Agent Chat UI）与
`apps/agent`（Python 3.12 LangGraph 服务）。本文件是编码 Agent 的命令与验证入口；
产品背景见 [README.md](README.md)。

## 前置条件

- Node.js 20+、pnpm 10.5.1（根 `pnpm install` 安装 web 依赖）
- Python 3.12+、uv 0.10+（`uv sync --dev` 安装 agent 依赖）
- 本地环境文件：`apps/web/.env.local`、`apps/agent/.env`（从各自 `.env.example` 复制；
  默认 stub 模式无需真实模型密钥）

## 双子项目命令表

所有 `pnpm` 命令均可在仓库根执行；`uv` 命令默认在 `apps/agent` 目录执行，
根聚合脚本（见下）通过 `--directory` 从根机械触达。

### web（apps/web，根 pnpm 脚本代理）

| 命令（仓库根） | 作用 |
|---|---|
| `pnpm dev` | 启动 Next.js 开发服务器（http://localhost:3000） |
| `pnpm lint` | ESLint 检查 |
| `pnpm typecheck` | `tsc --noEmit` 类型检查 |
| `pnpm test` | Vitest 交互（watch）模式 |
| `pnpm test:ci` | Vitest 单次运行（CI 用） |
| `pnpm build` | Next.js 生产构建 |
| `pnpm smoke` | Thread 冒烟测试（需 Agent 服务已在 :2024 运行） |

### agent（apps/agent）

| 命令（apps/agent 目录内） | 根聚合等价命令 | 作用 |
|---|---|---|
| `uv sync --dev` | `pnpm sync:agent` | 安装/同步 Python 依赖（含 dev 组） |
| `uv run pytest` | `pnpm test:agent` | 运行 Python 测试 |
| `uv run langgraph dev` | `pnpm dev:agent` | 启动 LangGraph 开发服务器（http://localhost:2024，graph ID `lyl_counsel_agent`） |

## 验证矩阵

改动后按涉及范围执行；`pnpm test:all` 一次覆盖两侧测试。

| 改动范围 | 必跑（均在仓库根） | 说明 |
|---|---|---|
| 仅 `apps/web` | `pnpm lint` → `pnpm typecheck` → `pnpm test:ci` → `pnpm build` | CI 同序 |
| 仅 `apps/agent` | `pnpm test:agent` | 等价于 `apps/agent` 内 `uv run pytest` |
| 跨两侧 / 协议（Thread、流式、graph ID） | 上述全部 + `pnpm smoke` | smoke 前先 `pnpm dev:agent` 启动 Agent 服务 |
| 根配置（package.json、CI、workspace） | `pnpm test:all` | 聚合 `test:ci` + `test:agent` |

冒烟完整流程：终端 A `pnpm dev:agent`，终端 B `pnpm smoke`，通过输出
`Smoke passed for thread <id>`。手动停止/刷新检查步骤见 README「Validation」。
若 smoke 无法连接，先确认 `http://localhost:2024/ok` 返回 200，再检查 graph ID。

## 作用域说明

- `apps/web` 与 `apps/agent` 各有嵌套 AGENTS.md，记录目录内约定；就近优先。
- 密钥只放 `apps/agent/.env`（`LYL_` 前缀），严禁进入 `NEXT_PUBLIC_*` 变量或提交。
