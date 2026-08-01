# COS

COS 是个人战略参谋 Agent「刘亚楼参谋台（LYL）」的产品与技术设计仓库。
当前代码整合 Issue #3 的参谋台品牌入口与 Issue #4 的单主 Agent Graph：前端支持
四种主动模式和自由讨论，Graph 支持五种模式、Run Context 优先路由、阶段状态与
模型降级结果。

### Issue #4 scope

This baseline includes the five nodes named in Issue #4: `intake`, `mode_router`,
`retrieve_context`, `problem_reframe`, and `synthesize_counsel`. It also reserves
the complete `CounselState` shape required by the product specification.

Interrupt/resume, external research execution, evidence review, red-team review,
artifact rendering, and durable memory updates remain intentionally deferred to
their dedicated follow-up issues.

## Repository layout

```text
COS/
├── apps/
│   ├── web/    # Agent Chat UI source baseline
│   └── agent/  # Python 3.12 LangGraph service
├── design-system/ # ClauseOS UI implementation kit
├── docs/       # PRD, SPEC, UI design and Codex handoff
└── .github/workflows/ci.yml
```

## Prerequisites

- Node.js 20 or newer
- pnpm 10.5.1
- Python 3.12 or newer
- uv 0.10 or newer

No paid model account is required for the default local baseline. The example
configuration uses a deterministic streaming stub.

## Start from a clean checkout

### 1. Install dependencies

From the repository root:

```bash
pnpm install
```

Install Agent dependencies:

```bash
cd apps/agent
uv sync --dev
cd ../..
```

### 2. Create local environment files

macOS or Linux:

```bash
cp apps/web/.env.example apps/web/.env.local
cp apps/agent/.env.example apps/agent/.env
```

PowerShell:

```powershell
Copy-Item apps/web/.env.example apps/web/.env.local
Copy-Item apps/agent/.env.example apps/agent/.env
```

The checked-in examples contain no real credentials.

### 3. Start the Agent

In one terminal:

```bash
cd apps/agent
uv run langgraph dev
```

The LangGraph API starts at `http://localhost:2024`. Its graph ID is
`lyl_counsel_agent`.

### 4. Start the Web app

In a second terminal, from the repository root:

```bash
pnpm dev
```

Open `http://localhost:3000`. Create a conversation and send a message. The
stub Agent streams `本地 LangGraph 基线已连接。`

首屏可选择“下一步、决策、调研、诊断”四种模式，也可直接输入进入自由讨论。
所选模式随每次消息作为 LangGraph Run Context 发送，并持久化在 Thread state（旧 Thread metadata 仍作为兼容回退）。

## Production Web configuration

生产构建不会显示 Deployment URL、Assistant ID 或 API Key 配置表单。Web 默认
通过同源 `/api` Proxy 连接 Agent；部署时设置服务端变量：

```dotenv
LANGGRAPH_API_URL=https://your-agent.example.com
LANGSMITH_API_KEY=replace-on-server
```

`LANGSMITH_API_KEY` 不得使用 `NEXT_PUBLIC_` 前缀。需要覆盖默认 Agent ID 时设置
`NEXT_PUBLIC_ASSISTANT_ID`。

## Model configuration

Agent settings use the `LYL_` environment prefix:

| Variable             | Purpose                             |
| -------------------- | ----------------------------------- |
| `LYL_MODEL_PROVIDER` | LangChain provider name, or `stub`  |
| `LYL_MODEL`          | Provider model identifier           |
| `LYL_MODEL_API_KEY`  | Secret key; not needed for `stub`   |
| `LYL_MODEL_BASE_URL` | Optional OpenAI-compatible endpoint |
| `LYL_STUB_RESPONSE`  | Local no-key response               |
| `LYL_MEMORY_DB_PATH` | Local SQLite structured-memory path |

Example for an OpenAI model:

```dotenv
LYL_MODEL_PROVIDER=openai
LYL_MODEL=gpt-4.1-mini
LYL_MODEL_API_KEY=replace-locally
LYL_MODEL_BASE_URL=
```

Secrets stay in `apps/agent/.env`; never put a model key in a `NEXT_PUBLIC_*`
variable.

## Validation

Frontend:

```bash
pnpm lint
pnpm typecheck
pnpm test:ci
pnpm build
```

Agent:

```bash
cd apps/agent
uv run pytest
```

测试覆盖五种模式、手动模式优先、自动模式判断、后续调研提示和模型故障降级。

With the Agent server running, execute the repeatable Thread smoke test:

```bash
pnpm smoke
```

It creates a Thread, submits a message, consumes the streamed response, then
reopens the same Thread through the SDK.

Manual stop check:

1. Send a message in the Web app.
2. While the response is streaming, select **Cancel**.
3. Confirm the composer returns to its idle state and remains usable.

Manual refresh check:

1. Complete a message exchange.
2. Copy the URL containing `threadId`.
3. Refresh the page or reopen that URL.
4. Confirm the same Thread and messages load.

## Local persistence boundary

`langgraph dev` is the official in-memory development server. It keeps Thread
state while the Agent process is running, so browser refresh and URL reopen
work. Restarting the Agent process clears local Threads. Durable production
storage and migrations belong to later issues.

Structured memory uses the separate SQLite file configured by
`LYL_MEMORY_DB_PATH` and survives Agent restarts. The business API is mounted
into the same LangGraph server. Through the Web proxy, its public paths are:

```text
GET/POST       /api/memories
GET/PATCH/DELETE /api/memories/{id}
POST           /api/memories/{id}/confirm
POST           /api/memories/{id}/reject
GET/POST       /api/decisions
GET/PATCH/DELETE /api/decisions/{id}
```

Every business API request requires `X-User-ID`; all reads and writes are
scoped to that value. This is the Issue #5 data-isolation boundary, not final
authentication, which remains Issue #14 work. New memories always start as
`candidate` and require the confirm endpoint before becoming `confirmed`.
Until authentication is implemented, Web runs use the local identity
`local-user`; use the same header value when managing context for the local UI.

Issue #5's MVP snapshot contains goals, matters, decisions, and patterns.
`constraints` is reserved in the schema but is not populated until a dedicated
constraint-writing flow exists. Automatic snapshots include only memories that
are valid at snapshot generation time; explicitly selected IDs remain available
for historical decision records. Search is SQLite JSON text matching (without
Chinese tokenization, embeddings, or semantic conflict clustering), and the
status ordering is confirmed, candidate, stale, then rejected with confidence
and validity recency as tie-breakers.

The repository intentionally uses `CREATE TABLE IF NOT EXISTS` and does not
ship schema migrations in this MVP. When a local SQLite schema must be reset,
stop the Agent and remove the configured `LYL_MEMORY_DB_PATH` file before
restarting it. Each operation opens a short-lived SQLite connection; this is
appropriate for the local single-process MVP, while connection pooling and
multi-worker tuning remain future work. `PATCH` cannot write `confirmed` or
`rejected`; those transitions are explicit `/confirm` and `/reject` endpoints.

## Upstream source

`apps/web` incorporates
[`langchain-ai/agent-chat-ui`](https://github.com/langchain-ai/agent-chat-ui)
at commit `fdc87e65307581b02898d33c62b3f285e56bd85b`.

The upstream MIT license is preserved in `apps/web/LICENSE`; see
`NOTICE.md` for attribution. Thread history, streaming, stop, file upload,
Interrupt, and Artifact foundations remain present. The Issue #3 product shell adds LYL branding and counsel-mode entry points while keeping
upstream interaction foundations intact. Formal counsel behavior remains deferred.

## Product documents

- [PRD V1.0](docs/LYL-参谋台-PRD-V1.0.md)
- [SPEC V1.0](docs/LYL-参谋台-SPEC-V1.0.md)

## ClauseOS desktop UI implementation

Issue [#20](https://github.com/ttttstc/COS/issues/20) contains the Codex-ready
implementation plan for the desktop-only ClauseOS issue workbench.

Required design inputs:

- [Original ClauseOS UI/UX specification](docs/design/reference/ClauseOS-UI-UX-Design-Spec-V2.0.md)
- [LYL desktop implementation specification V2.0](docs/design/LYL-ClauseOS-Desktop-UI-Implementation-Spec-V2.0.md)
- [Control inventory](docs/design/controls/CONTROL-INVENTORY.md)
- [Control state and visual acceptance matrix](docs/design/controls/CONTROL-STATE-MATRIX.md)
- [Design system implementation kit](design-system/README.md)
- [Interactive control gallery](design-system/control-gallery.html)
- [Interactive UCD prototype](docs/design/ucd/lyl-interactive-ucd.html)
- [Codex handoff](docs/codex/CODEX-ISSUE-20-HANDOFF.md)

GitHub does not execute the interactive HTML files in code view. Preview them
from a checkout:

```bash
python -m http.server 8080
```

Then open:

```text
http://localhost:8080/design-system/control-gallery.html
http://localhost:8080/docs/design/ucd/lyl-interactive-ucd.html
```
