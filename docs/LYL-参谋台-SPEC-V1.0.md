# 刘亚楼参谋台（LYL）技术与交互规格说明 SPEC V1.0

> 更新时间：2026-07-28  
> 范围：MVP / 第一版  
> 前端基线：`langchain-ai/agent-chat-ui`  
> 后端基线：LangGraph 单主 Agent

为便于研发实施和模块评审，SPEC 按主题拆分为以下章节：

1. [总体架构与 Agent Chat UI 改造](spec/01-总体架构与前端改造.md)
2. [主 Agent 与 Skills](spec/02-主Agent与Skills.md)
3. [记忆、检索与输出 Schema](spec/03-记忆检索与输出Schema.md)
4. [接口、工具、Prompt 与安全](spec/04-接口工具Prompt与安全.md)
5. [评测、非功能要求与实施计划](spec/05-评测非功能与实施计划.md)

## 技术收敛

- 复用 Agent Chat UI 的 Thread、Streaming、File Upload、Interrupt 和 Artifact；
- 第一版只实现一个长期主 Agent；
- Workflow 仅作为复杂调研的内部条件分支；
- Skill 是结构化行为协议，不是独立产品；
- 结构化记忆、决策记录与结果反馈构成长期护城河；
- 不展示模型私有思维链，只展示阶段、证据、结论与改判条件。
