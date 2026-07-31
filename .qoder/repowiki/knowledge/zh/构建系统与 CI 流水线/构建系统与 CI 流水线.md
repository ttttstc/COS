---
kind: build_system
name: 构建系统与 CI 流水线
category: build_system
scope:
    - '**'
source_files:
    - package.json
    - pnpm-workspace.yaml
    - .github/workflows/ci.yml
    - apps/web/package.json
    - apps/web/next.config.mjs
    - apps/agent/pyproject.toml
    - apps/agent/langgraph.json
---

本仓库采用 pnpm workspace 单仓多包架构，聚合两个独立应用：apps/web（Next.js Agent Chat UI）与 apps/agent（Python LangGraph Agent），并通过 GitHub Actions 在 PR 和 main 分支上并行执行 Web 与 Agent 的构建、类型检查与测试。

### 1. 使用的系统/工具
- 前端依赖与构建：pnpm@10.5.1（根 package.json 声明 packageManager），Next.js 15 + TypeScript 5.8，Vitest 4 作为测试框架，ESLint 9 + Prettier 3 做代码质量。
- 后端依赖与构建：Python 3.12 + uv（astral-sh/setup-uv）管理虚拟环境，Hatchling 作为 Python 包构建后端，Pytest 运行测试。
- CI 编排：GitHub Actions .github/workflows/ci.yml，定义 web 与 agent 两个 job，分别在 Node 22 与 Python 3.12 环境中执行。

### 2. 关键文件
- 根级：package.json（workspace 脚本入口）、pnpm-workspace.yaml（声明 apps/web 子包）、.github/workflows/ci.yml（CI 流水线）。
- Web 端：apps/web/package.json（Next.js 脚本、依赖、overrides）、apps/web/next.config.mjs（构建配置）。
- Agent 端：apps/agent/pyproject.toml（Hatch 构建、依赖、pytest 配置）、apps/agent/langgraph.json（LangGraph CLI 图注册与环境变量）。

### 3. 架构与约定
- Workspace 脚本统一入口：根 package.json 的 dev/build/lint/typecheck/test/smoke 等脚本全部通过 pnpm --filter @cos/web 转发到 apps/web，Agent 侧不暴露根级脚本，需进入 apps/agent 目录使用 uv。
- 依赖锁定与覆盖：根 package.json 中集中声明 pnpm.overrides 以对齐 ESLint、PostCSS、sharp 等子依赖版本；apps/web/package.json 额外覆盖 react-is。
- 语言隔离：Web 与 Agent 完全解耦，各自维护独立的依赖锁文件（pnpm-lock.yaml / uv.lock），CI 分别安装并测试，不存在跨语言依赖。
- 构建产物：Web 通过 Next.js 生成静态/SSG 产物；Agent 通过 Hatch 打包 wheel，LangGraph CLI 通过 langgraph.json 发现 lyl_counsel_agent 图。

### 4. 约定与约束
- Node/Python 版本固定：CI 明确使用 Node 22 与 Python 3.12，本地开发应与之保持一致。
- 锁文件严格模式：CI 中 pnpm install --frozen-lockfile 与 uv sync --dev --frozen 要求提交变更时必须同步更新锁文件，禁止隐式升级。
- 测试命令分离：Web 使用 pnpm test:ci（Vitest run），Agent 使用 uv run pytest，两者在 CI 中并行执行，任一失败即整体失败。
- 环境变量：Agent 通过 langgraph.json 的 env: ".env" 指定运行时环境变量来源，Web 通过 .env.example 提供模板。