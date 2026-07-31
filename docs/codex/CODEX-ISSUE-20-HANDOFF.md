# Codex Handoff：Issue #20 ClauseOS UI 实施

## 任务

在 `langchain-ai/agent-chat-ui` 工程基线上，实现 Issue #20 的桌面端 ClauseOS 风格议题工作台。

## 开工前必读顺序

1. `docs/design/reference/ClauseOS-UI-UX-Design-Spec-V2.0.md`
2. `docs/design/LYL-ClauseOS-Desktop-UI-Implementation-Spec-V2.0.md`
3. `docs/design/controls/CONTROL-INVENTORY.md`
4. `docs/design/controls/CONTROL-STATE-MATRIX.md`
5. `design-system/README.md`
6. `design-system/lyl-clauseos-ui.css`
7. `design-system/ui-contracts.ts`
8. 浏览器打开 `design-system/control-gallery.html`
9. 浏览器打开 `docs/design/ucd/lyl-interactive-ucd.html`
10. GitHub Issue #20

## 不需要再讨论的方案

- 第一版仅桌面端，最小宽度 1024px；
- UI 术语统一为“议题”；
- 暗色单主题；
- 三栏布局；
- 用户可见图标统一 Phosphor；
- 玻璃只用于控制和容器层；
- 正文、证据、报告使用实体深色内容层；
- 不实现 Dashboard、Kanban、Gantt、移动端和亮色主题。

## 必须暂停讨论的情况

- Agent Chat UI 当前版本无法保留 Thread / Stream / File / Interrupt / Artifact 任一能力；
- 需要引入新的 UI Runtime 或更换前端框架；
- CSS 的 backdrop-filter 性能导致 1024px 桌面端无法达到基本流畅度，且无法通过降级策略解决；
- 需要改变三栏信息架构或四个固定材料 Tab；
- 需要删除 Issue 验收标准。

## 实施分支

```text
codex/issue-20-clauseos-desktop-ui
```

## 实施阶段

### Phase 1：视觉 Primitive

- 将 `design-system/lyl-clauseos-ui.css` 按 Token / Primitive / Component 拆入正式样式目录；
- 建立 GlassSurface、EdgeLight、PrismCorner、StarGrid；
- 引入 Phosphor Icons；
- 建立 Control Gallery 路由或 Storybook 等价页；
- 先提交截图，确认玻璃公式正确，再进入页面改造。

### Phase 2：通用控件

- Button、Input、Choice、Badge、Tabs、Popover、Modal、Toast、Table；
- 完成状态矩阵；
- 键盘焦点和 reduced-motion。

### Phase 3：议题工作台 Shell

- IssueNavigator；
- IssueWorkspace；
- CounselMaterialPanel；
- SplitHandle；
- 1440 / 1280 / 1024 布局。

### Phase 4：关键业务组件

- IssueModeCard；
- IssueListItem；
- IssueComposer；
- StageProgress；
- DecisionInterruptCard；
- CounselSummaryCard；
- EvidenceCard。

### Phase 5：视觉回归

- Playwright 截图；
- 关键交互键盘测试；
- axe 或等价可访问性检查；
- 与 Control Gallery 和 UCD 对照。

## 代码约束

- 不把参考 CSS 整文件直接塞进生产入口；按 primitive/component/page 分层；
- 不散落十六进制颜色；统一 Token；
- 业务组件不自行实现玻璃公式，只组合 Primitive；
- 禁止 Lucide 与 Phosphor 混用；
- 不下载或提交未知来源字体二进制；
- 不修改 Agent 协议和后端逻辑；
- 不提前实施其他 Issue。

## PR 验收材料

- Control Gallery 全页截图；
- 新建议题、进行中、待裁决、建议完成四页截图；
- 1440 / 1280 / 1024 三档截图；
- 键盘操作说明；
- reduced-motion 验证；
- 原 Agent Chat UI 能力回归结果；
- 验收项逐条勾选。
