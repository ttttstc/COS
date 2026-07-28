---
kind: dependency_management
name: 多语言 Monorepo 依赖管理：pnpm workspace + uv 双栈锁定策略
category: dependency_management
scope:
    - '**'
source_files:
    - package.json
    - pnpm-workspace.yaml
    - apps/web/package.json
    - apps/agent/pyproject.toml
    - apps/agent/uv.lock
---

本仓库采用 pnpm workspace 聚合前端（Next.js）与 uv 管理 Python Agent 的依赖，形成前后端分离但统一版本锁定的 Monorepo 依赖管理体系。

## 1. 使用的系统与工具
- 前端依赖管理：使用 pnpm@10.5.1 作为包管理器，通过根级 package.json 声明 packageManager 字段固定版本；使用 pnpm-workspace.yaml 定义 workspace 范围，仅包含 apps/web 一个子包。
- Python 依赖管理：使用 hatchling 作为构建后端，pyproject.toml 声明运行时依赖与 dependency-groups.dev 开发依赖；使用 uv.lock 作为确定性锁定文件，指向 PyPI 官方源。
- 锁定文件：前端使用根级 pnpm-lock.yaml，Python 使用 apps/agent/uv.lock，两者均提交至版本控制确保可重现构建。

## 2. 关键文件与位置
- package.json（根）：声明 pnpm 版本、workspace 脚本、以及全局 overrides 强制依赖版本对齐。
- pnpm-workspace.yaml（根）：定义 workspace 成员为 apps/web。
- apps/web/package.json：Next.js 应用依赖声明，包含 dependencies 与 devDependencies，并单独声明 overrides.react-is。
- apps/agent/pyproject.toml：Python 项目元数据、运行时依赖（langchain/langgraph 系列）、开发依赖组、pytest 配置。
- apps/agent/uv.lock：Python 依赖的完整锁定快照，包含每个包的精确版本、哈希值与 wheel/sdist 来源。
- .prettierignore：显式忽略 pnpm-lock.yaml 格式化，表明该文件由工具自动生成维护。

## 3. 架构与约定
- Monorepo 结构：通过 pnpm workspace 将前端应用纳入统一工作区，Python Agent 独立于 workspace 之外，各自维护自己的依赖声明与锁定文件。
- 依赖版本策略：
  - 前端使用语义化版本范围（如 ^1.1.44），并通过根级 pnpm.overrides 强制覆盖冲突依赖（如 minimatch、picomatch、postcss、sharp、ajv、prismjs 等），解决生态内版本不一致问题。
  - Python 依赖使用较宽松的范围（如 langchain>=1.2,<2），由 uv.lock 锁定具体解析结果。
- 构建系统解耦：Python 使用 hatchling 构建，不依赖 Node.js；前端使用 Next.js 标准流程，二者通过 API 通信而非共享依赖。
- 无私有注册表：所有依赖均来自公共源（PyPI 与 npm registry），未发现 .npmrc、pypirc 或 uv 自定义源配置。

## 4. 约定与约束
- 包管理器锁定：根 package.json 中 packageManager: pnpm@10.5.1 强制团队使用指定 pnpm 版本，避免解析差异。
- Workspace 最小化：当前 workspace 仅包含 apps/web，Python 工程未纳入 workspace，保持语言边界清晰。
- 依赖覆盖集中管理：所有跨包依赖版本冲突通过根 pnpm.overrides 统一处理，避免在子包中重复声明覆盖规则。
- 锁定文件不可手动编辑：pnpm-lock.yaml 被 Prettier 忽略，uv.lock 由 uv 自动同步生成，禁止人工修改。
- Python 环境隔离：apps/agent/.venv 目录存在且被 gitignore，虚拟环境不纳入版本控制。
- 测试与开发依赖分离：Python 使用 [dependency-groups] 将测试依赖（pytest、pytest-asyncio 等）与运行时依赖分离，便于按需安装。