---
kind: configuration_system
name: 配置系统 — 环境变量驱动的 Pydantic Settings + Next.js 客户端常量
category: configuration_system
scope:
    - '**'
source_files:
    - apps/agent/src/lyl_agent/settings.py
    - apps/agent/.env
    - apps/agent/.env.example
    - apps/agent/langgraph.json
    - apps/web/.env.example
    - apps/web/next.config.mjs
    - apps/agent/pyproject.toml
---

本仓库采用“按应用拆分、统一以 .env 文件驱动”的配置体系，Python Agent 端使用 pydantic-settings，Next.js Web 端使用 NEXT_PUBLIC_* 前缀的环境变量，LangGraph 运行时通过 langgraph.json 声明式加载 .env。

### 1. 使用的框架与工具
- Python 侧：`pydantic-settings` 的 `BaseSettings` + `SettingsConfigDict`，配合 `SecretStr` 对敏感字段进行类型化保护。
- LangGraph 侧：`langgraph.json` 中的 `"env": ".env"` 字段指定配置文件路径。
- Next.js 侧：Next.js 内置的 `NEXT_PUBLIC_*` 环境变量机制，构建时注入到浏览器可访问的全局变量中。
- 包管理：根目录 pnpm workspace 聚合两个子应用，各自独立维护自己的依赖与配置。

### 2. 核心文件与位置
- `apps/agent/src/lyl_agent/settings.py`：定义 `Settings` 类与 `load_settings()` 加载器，集中管理模型提供者、API Key、Base URL 等。
- `apps/agent/.env` 与 `apps/agent/.env.example`：Agent 运行所需的环境变量模板与实际值。
- `apps/agent/langgraph.json`：LangGraph 运行时配置，声明图入口与 .env 路径。
- `apps/web/.env.example`：Web 端暴露给浏览器的 NEXT_PUBLIC_* 变量模板（API 地址、Assistant ID、认证方案）。
- `apps/web/next.config.mjs`：Next.js 构建期配置（如 bodySizeLimit），非运行时配置。
- `apps/agent/pyproject.toml`：声明 `pydantic-settings>=2.12,<3` 为必需依赖。

### 3. 架构与设计约定
- **分层加载**：`load_settings()` 在首次 chat run 时惰性加载 Settings，避免启动期失败；若缺少必填字段会抛出自定义 `ModelConfigurationError`，提示设置 `LYL_MODEL_PROVIDER` 和 `LYL_MODEL`。
- **命名空间隔离**：所有 Agent 配置以 `LYL_` 为前缀（`model_config.env_prefix="LYL_"`），避免与其他进程环境变量冲突。
- **敏感信息保护**：`model_api_key` 使用 `SecretStr` 类型，防止意外打印或序列化泄露。
- **可选字段默认值**：`model_base_url`、`model_api_key` 允许为空；`stub_response` 提供本地基线回退文本。
- **LangGraph 集成**：`langgraph.json` 通过 `"env": ".env"` 将 .env 注入 LangGraph 运行时，使 graph 节点可直接读取环境变量。
- **Web 端公开变量**：仅 `NEXT_PUBLIC_*` 前缀的变量会被打包进前端 bundle，用于客户端调用后端 API。

### 4. 约定与约束
- Agent 配置必须通过 `.env` 文件或 `LYL_` 前缀的环境变量提供，否则 `load_settings()` 抛出 `ModelConfigurationError`。
- 敏感字段（如 API Key）必须使用 `SecretStr` 类型，禁止明文硬编码。
- Web 端只能使用 `NEXT_PUBLIC_*` 前缀的变量，其他变量不会暴露给浏览器。
- LangGraph 图的 .env 路径必须在 `langgraph.json` 中显式声明，否则运行时无法读取配置。
- 每个子应用独立维护自己的 `.env` 和 `.env.example`，不共享配置源。