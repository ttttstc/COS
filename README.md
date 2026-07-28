# COS

COS 是个人战略参谋 Agent「刘亚楼参谋台（LYL）」的产品与技术设计仓库。

## 当前文档

- [产品需求文档 PRD V1.0](docs/LYL-参谋台-PRD-V1.0.md)
- [技术与交互规格 SPEC V1.0](docs/LYL-参谋台-SPEC-V1.0.md)

## 第一版技术基线

- 前端：Fork `langchain-ai/agent-chat-ui`
- 后端：LangGraph 单主 Agent
- 核心入口：`ask-lyl`、`decide-lyl`、`research-lyl`、`diagnose-lyl`
- 核心原则：先验证参谋能力，不优先打磨 UI；不建设固定多 Agent 军团和 Workflow 编辑器。
