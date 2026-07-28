---
kind: logging_system
name: 日志系统 — Python 标准 logging + 前端 console 直出
category: logging_system
scope:
    - '**'
source_files:
    - apps/agent/src/lyl_agent/graph.py
    - apps/web/src/app/error.tsx
    - apps/web/src/providers/Stream.tsx
    - apps/web/src/components/thread/agent-inbox/hooks/use-interrupted-actions.tsx
---

本仓库未引入统一的日志框架或集中式日志服务，后端与前端分别使用语言默认输出机制，整体呈现“分散、无级别管理、无结构化配置”的状态。

1. 后端（Python / apps/agent）
- 使用 Python 标准库 `logging`，在 `apps/agent/src/lyl_agent/graph.py` 中通过 `logging.getLogger(__name__)` 创建模块级 logger。
- 仅在模型调用异常路径使用 `logger.exception("agent.counsel.degraded", extra={"error": str(error)})` 记录降级错误，附带自定义事件名和 error 字段。
- 没有统一的日志初始化、日志级别配置、格式化器或输出目标（文件/控制台/远端），也没有在其他业务节点中主动打点日志。

2. 前端（Next.js / apps/web）
- 直接使用浏览器 `console.error` 输出错误信息，分布在多处组件与 hooks 中（如 `error.tsx`、`Stream.tsx`、`inbox-item-input.tsx`、`thread-actions-view.tsx`、`use-interrupted-actions.tsx` 等）。
- 未引入任何前端日志库（如 pino、winston、loglevel），也未对 `console.log/debug/info/warn/error` 做统一封装或过滤策略。
- 错误输出以原始 Error 对象或简单字符串为主，无统一字段约定。

3. 架构与约定
- 后端：仅一处结构化异常日志（事件名 `agent.counsel.degraded` + `extra.error`），其余流程依赖 LangGraph state streaming 的 `stages` 字段向前端推送阶段状态，而非通过日志通道。
- 前端：错误即打点，无分级、无聚合、无上报；调试主要依赖浏览器开发者工具。
- 两者之间不存在日志收集、转发或关联 ID 传递机制。

4. 约束与现状
- 未发现任何日志配置文件（如 `logging.conf`、`.env` 中的日志级别）、CI 中对日志输出的规范检查，或统一的日志门面接口。
- 当前实现属于最小可用 MVP 阶段的“就地打印”，不具备生产环境可观测性能力。