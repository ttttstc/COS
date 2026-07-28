---
kind: error_handling
name: 错误处理体系：Pydantic配置校验、LangGraph降级与Next.js错误页
category: error_handling
scope:
    - '**'
source_files:
    - apps/agent/src/lyl_agent/settings.py
    - apps/agent/src/lyl_agent/models.py
    - apps/agent/src/lyl_agent/graph.py
    - apps/agent/src/lyl_agent/state.py
    - apps/web/src/app/error.tsx
    - apps/web/src/app/error.test.tsx
    - apps/web/src/lib/multimodal-utils.ts
    - apps/web/src/components/thread/agent-inbox/utils.ts
---

本仓库的错误处理贯穿 Python Agent（apps/agent）与 Next.js Web（apps/web）两个子应用，采用分层策略：启动期配置校验错误、运行时图节点降级、前端统一错误页与用户提示。

### 1. 使用的系统与模式
- **Python 侧**：基于 Pydantic `BaseSettings` 的环境变量校验，配合自定义异常 `ModelConfigurationError(RuntimeError)` 将配置错误统一暴露；LangGraph 图节点内部使用 `try/except Exception` 捕获模型调用异常并返回降级状态。
- **TypeScript/React 侧**：Next.js App Router 的 `error.tsx` 作为全局错误页面，结合 `console.error` 记录、`toast.error` 弹出提示以及组件内 `catch` 块处理异步错误。

### 2. 关键文件与位置
- `apps/agent/src/lyl_agent/settings.py` — 定义 `ModelConfigurationError` 与 `load_settings()`，将 `pydantic.ValidationError` 包装为可读错误。
- `apps/agent/src/lyl_agent/models.py` — `create_chat_model()` 在缺少 API Key 或初始化失败时抛出 `ModelConfigurationError`。
- `apps/agent/src/lyl_agent/graph.py` — `synthesize_counsel` 节点中 `try/except Exception` 捕获模型调用异常，记录日志并返回含 `error="model_unavailable"` 的降级状态。
- `apps/agent/src/lyl_agent/state.py` — `CounselState` 包含 `error: str` 字段用于传播错误码。
- `apps/web/src/app/error.tsx` — Next.js 全局错误页，显示“无法加载对话”并提供重试按钮。
- `apps/web/src/app/error.test.tsx` — 对错误页的单元测试，验证可恢复操作。
- `apps/web/src/lib/multimodal-utils.ts` — 文件类型不支持时使用 `Promise.reject(new Error(...))` + `toast.error` 提示。
- `apps/web/src/components/thread/agent-inbox/utils.ts` — 表单校验返回 `{ error: string }` 结构，reject 决策路径也携带消息。

### 3. 架构与约定
- **配置错误集中化**：所有环境变量缺失或不合法均通过 `ModelConfigurationError` 抛出，测试中直接断言该异常类型（见 `test_graph.py`），避免 `ValidationError` 泄露到上层。
- **运行时降级优先于崩溃**：LangGraph 的 `synthesize_counsel` 节点在模型不可用时不向上抛错，而是写入 `state.error = "model_unavailable"` 并返回友好消息，保证图流程可继续。
- **前端错误可见性**：Next.js 错误页统一展示错误信息并允许 `reset` 重试；组件级错误通过 `toast.error` 即时反馈，表单校验错误以结构化对象返回供 UI 渲染。
- **状态字段承载错误**：`CounselState.error` 作为字符串错误码（如 `model_unavailable`）在图状态中传播，便于上游消费方判断。

### 4. 约定与约束
- 配置加载必须通过 `load_settings()`，禁止直接实例化 `Settings`，以确保 `ValidationError` 被转换为 `ModelConfigurationError`。
- 非 stub 模式下必须提供 `LYL_MODEL_API_KEY`，否则 `create_chat_model` 会抛出 `ModelConfigurationError`。
- LangGraph 节点遇到外部依赖异常时应记录日志（`logger.exception`）并返回降级状态，而非向上抛出未处理异常。
- 前端错误页需实现 `reset` 回调以支持用户重试，且错误信息应面向最终用户而非技术堆栈。
- 表单校验函数统一返回 `{ decision?, error? }` 结构，由调用方决定渲染错误或提交决策。