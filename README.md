# COS

COS 是个人战略参谋 Agent「刘亚楼参谋台（LYL）」的产品与技术设计仓库。
当前代码实现 Issue #3 的产品入口：刘亚楼参谋台品牌、四种主动模式与自由讨论，
底层保留 Agent Chat UI 和最小 LangGraph `messages` Agent。

## Repository layout

```text
COS/
├── apps/
│   ├── web/    # Agent Chat UI source baseline
│   └── agent/  # Python 3.12 LangGraph service
├── docs/       # PRD and SPEC
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
所选模式随每次消息作为 LangGraph Run Context 发送，并记录到新 Thread metadata。

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
