# LYL 参谋台 ClauseOS 桌面端 UI 适配规范 V1.0

> 状态：已确认 / 后续 UI 设计默认强制遵循  
> 适用范围：LYL 参谋台第一版及后续桌面端 UI 迭代  
> 视觉基线：ClauseOS UI/UX 设计规范 V2.0  
> 产品技术基线：`langchain-ai/agent-chat-ui`  
> 术语基线：用户发起和持续处理的工作对象统一称为“议题”，不再使用“会商”作为 UI 文案  
> 第一版适配范围：桌面端，不实现移动端和平板端

---

## 1. 规范地位

本文件是 COS/LYL 仓库的 UI 规范性文件。后续新增页面、组件、交互和视觉改动默认必须遵循本文件；若需要偏离，PR 必须明确列出偏离项、原因和替代方案，并经产品确认。

设计优先级：

```text
本适配规范
  > ClauseOS 设计原则与 Token
  > 当前功能 Issue
  > Agent Chat UI 原始样式
  > 开发者个人审美
```

本规范继承 ClauseOS 的核心设计思想：

1. **信息优先**：视觉服务于议题、结论、证据和状态，不与内容竞争。
2. **专业克制**：安静、可信、精确，避免娱乐化和过量科技特效。
3. **透明可见**：议题所处阶段、调研进度、待裁决事项和结论依据必须清晰可追溯。
4. **控制层与内容层分离**：玻璃材质用于导航和控件；长文本、证据和报告使用实体背景。
5. **结构化优于气泡堆积**：正式结论、证据、进度和裁决使用结构化组件，不全部塞入聊天消息。

---

## 2. 产品信息架构

### 2.1 顶层对象

第一版 UI 的核心对象是“议题”。

议题类型：

- 下一步做什么（`ask`）
- 帮我做决定（`decide`）
- 调研后判断（`research`）
- 诊断历史思维（`diagnose`）
- 普通讨论（`discuss`）

议题状态：

- 草稿
- 分析中
- 调研中
- 待裁决
- 已形成建议
- 已采纳
- 未采纳
- 待复盘
- 已复盘
- 失败

### 2.2 桌面端三栏结构

```text
┌────────────────────┬────────────────────────────────┬──────────────────────┐
│ 议题导航            │ 议题主区域                      │ 参谋材料              │
│ 280px / 64px        │ minmax(560px, 1fr)             │ 400px，可折叠          │
│                    │                                │                      │
│ 新建议题            │ 议题标题与状态                  │ 参谋结论              │
│ 四种参谋模式        │ 用户与刘亚楼对话                │ 关键证据              │
│ 历史议题            │ 阶段进度 / 待裁决卡             │ 历史依据              │
│ 用户与设置          │ 输入区                          │ 调研过程              │
└────────────────────┴────────────────────────────────┴──────────────────────┘
```

桌面尺寸规则：

- `>= 1440px`：左栏 280px，中栏自适应，右栏 400px。
- `1280–1439px`：左栏 240px，中栏自适应，右栏 360px。
- `1024–1279px`：左栏默认收起为 64px，右栏 320px，可手动折叠。
- `< 1024px`：第一版不承诺适配；显示“当前版本建议使用桌面端宽屏”提示，不实现移动布局。

分栏之间使用 4–5px 可拖拽手柄；拖拽过程不触发昂贵的大面积模糊动画。

---

## 3. 视觉系统

### 3.1 色彩 Token

第一版只实现暗色主题，亮色主题仅保留扩展位。

```css
:root {
  --bg-primary: #0A0B0F;
  --bg-secondary: #111318;
  --bg-sidebar: #1A1D23;
  --bg-content: #111318;
  --bg-elevated: #171A20;

  --accent-primary: #00C897;
  --accent-highlight: #00FF9D;
  --accent-secondary: #3B82F6;
  --accent-soft: rgba(0, 200, 151, 0.10);

  --semantic-success: #10B981;
  --semantic-warning: #F59E0B;
  --semantic-error: #EF4444;
  --semantic-info: #3B82F6;

  --text-primary: #E5E7EB;
  --text-secondary: #9CA3AF;
  --text-tertiary: #6B7280;
  --text-inverse: #0A0B0F;

  --border-glass: rgba(255,255,255,0.08);
  --border-active: rgba(0,200,151,0.28);
  --border-content: rgba(255,255,255,0.06);
}
```

强调色使用规则：

- `#00C897`：主 CTA、选中态、模式状态、常规焦点。
- `#00FF9D`：仅用于正在运行、完成、高价值提示和弱辉光，不允许大面积填充。
- 蓝色：外部来源、链接、信息提示。
- 黄色：待裁决、风险、限制条件。
- 红色：错误、失败、明确反对证据。

### 3.2 Liquid Glass 四级材质

```css
:root {
  --glass-thin-bg: rgba(255,255,255,0.06);
  --glass-thin-filter: blur(12px) saturate(120%);
  --glass-thin-border: 1px solid rgba(255,255,255,0.06);

  --glass-regular-bg: rgba(255,255,255,0.08);
  --glass-regular-filter: blur(20px) saturate(140%);
  --glass-regular-border: 1px solid rgba(255,255,255,0.10);

  --glass-clear-bg: rgba(255,255,255,0.04);
  --glass-clear-filter: blur(16px) saturate(110%);
  --glass-clear-border: 1px solid rgba(255,255,255,0.04);

  --glass-thick-bg: rgba(255,255,255,0.14);
  --glass-thick-filter: blur(24px) saturate(160%);
  --glass-thick-border: 1px solid rgba(255,255,255,0.18);
}
```

强制规则：

- `thin`：模式卡、标签、次要控件。
- `regular`：左侧导航、输入区外壳、弹出菜单、工具栏。
- `clear`：悬浮图标组、次按钮。
- `thick`：选中项、待裁决模态、关键悬浮层。
- 议题正文、Agent 长文本、证据列表、报告、结论详情不得使用玻璃背景。
- 禁止无目的的玻璃叠玻璃；仅允许选中控件浮于导航玻璃层。

### 3.3 字体

- 品牌、页面标题、导航标题、模式标题：Urbanist。
- 正文、消息、数据、表单：Inter。
- 回退：`-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`。

```css
--font-brand: "Urbanist", -apple-system, sans-serif;
--font-ui: "Inter", -apple-system, sans-serif;
```

字号层级：

- 页面标题：24px / 600。
- 区块标题：20px / 600。
- 卡片标题：16px / 500。
- 正文：14px / 1.6 / 400。
- 辅助正文：13px / 1.5。
- 标签与状态：11–12px / 500。
- 长文本行宽建议不超过 72 个中文字符或 860px。

### 3.4 间距、圆角和阴影

```css
--space-xs: 4px;
--space-sm: 8px;
--space-md: 16px;
--space-lg: 24px;
--space-xl: 32px;
--space-2xl: 48px;

--radius-xs: 4px;
--radius-sm: 6px;
--radius-md: 10px;
--radius-lg: 16px;
--radius-xl: 20px;
--radius-full: 9999px;

--shadow-sm: 0 1px 3px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.03);
--shadow-md: 0 4px 16px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05);
--shadow-lg: 0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06);
--shadow-glow: 0 0 20px rgba(0,200,151,0.15), 0 4px 16px rgba(0,0,0,0.30);
```

### 3.5 动效

```css
--dur-fast: 150ms;
--dur-normal: 250ms;
--dur-slow: 400ms;
--ease-out: cubic-bezier(0.16, 1, 0.3, 1);
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-spring: cubic-bezier(0.25, 0.1, 0.25, 1);
```

- 卡片 Hover：透明度轻微提升、边框增强、Y -2px。
- 按钮点击：scale 0.97，150ms 回弹。
- 菜单：scale 0.95 + opacity 0 到正常，200ms。
- 右侧材料面板展开：250ms。
- 同屏持续动画元素不超过 5 个。
- 必须支持 `prefers-reduced-motion`，降级为透明度瞬切。

---

## 4. 图标系统

Web 端统一使用 Phosphor Icons，不使用 SF Symbols，不混用 Lucide 与 Phosphor。

- 导航：24px，Regular/Medium。
- 工具栏：20px。
- 状态：16px。
- 按钮：16–18px。
- 描边 2px、圆角端点。

状态不得只依靠颜色，必须同时使用图标、文字和形状。

---

## 5. 核心页面与状态

### 5.1 新建议题 / 欢迎状态

欢迎页不做 Dashboard，不展示统计卡片、图表和 Gantt。

内容：

```text
刘亚楼参谋台

今天需要我帮你判断什么？

[下一步做什么] [帮我做决定]
[调研后判断]   [诊断历史思维]

[描述你当前卡住的问题……]
```

四张模式卡：

- `glass-thin`，16px 圆角。
- Hover 升级为 `glass-regular`。
- 选中使用 `glass-thick` 和左/顶部强调线。
- 卡片只表达模式，不使用装饰性 3D 堆叠。

### 5.2 议题进行中

中栏结构：

1. 议题标题、类型、状态和时间。
2. 对话内容。
3. 阶段进度卡。
4. 待裁决卡（如有）。
5. Composer。

Agent 内容采用“角色标识 + 正文 + 结构化卡片”，不把每条回复做成厚重气泡。

### 5.3 调研进度

```text
调研进行中  3 / 5

● 恢复当前目标
● 识别关键未知
◉ 调研外部资料
○ 交叉验证证据
○ 形成参谋建议
```

- 完成：绿色实心圆。
- 进行中：绿色圆环，可使用低频呼吸动画。
- 待执行：灰色空心圆。
- 失败：红色错误图标。
- 外层 `glass-thin`，内部文本区域保持高对比度。

### 5.4 待裁决 Interrupt

必须使用结构化卡片，包含：

- 需要用户裁决的问题。
- 2–4 个选项。
- 参谋推荐。
- 推荐理由。
- 选择各方案的关键代价。
- “按现有信息汇报”出口。

视觉：`glass-thick`、20px 圆角、`shadow-lg`；待处理状态使用黄色状态标识，主推荐按钮使用 Harmony Green。

### 5.5 参谋材料面板

固定 Tab：

1. 参谋结论
2. 关键证据
3. 历史依据
4. 调研过程

主内容背景必须为实体 `--bg-content`。

参谋结论至少展示：

- 当前阶段
- 主要矛盾
- 明确建议
- 置信度
- 改判条件
- 暂缓事项

证据卡至少展示：

- `support / oppose / limit / context`
- 证据摘要
- 来源
- 日期
- 相关性与时效性
- 原文入口

### 5.6 历史议题

左栏条目格式：

```text
产品第一版应该如何切入
决策参谋 · 已形成建议
2 小时前
```

历史条目不得仅显示截断的第一条聊天文本，应显示议题标题、类型、状态和更新时间。

---

## 6. Composer 规范

- 初始高度：72px。
- 最大高度：220px。
- 圆角：16px。
- 外层：`glass-regular`。
- 聚焦：`--accent-primary` 边框 + 3px 弱辉光。
- 输入区顶部展示模式 Chip，可切换或清除。
- 附件、历史范围等辅助操作放左侧；发送按钮放右侧。
- 发送按钮使用圆形或胶囊主 CTA。
- 所有按钮最小点击区域 44×44px。

文案：

- ask：`描述你现在卡住的事情，或直接问“下一步做什么”`
- decide：`描述你需要拍板的选择`
- research：`描述需要调研并形成判断的问题`
- diagnose：`描述要诊断的时间范围或主题`
- discuss：`和刘亚楼讨论当前议题……`

---

## 7. Agent Chat UI 组件映射

保留：

- Thread 创建、切换和持久化
- Streaming
- Stop / Regenerate
- File Upload
- Interrupt
- Artifact
- Resumable Stream
- Error Toast

替换或新增：

```text
ThreadHistory          → IssueSidebar（历史议题）
ThreadHeader           → IssueTopbar
EmptyThread            → IssueWelcome
Composer               → IssueComposer
ArtifactPanel          → CounselMaterialPanel
InterruptRenderer      → DecisionInterruptCard
GenericMessage         → CounselMessageRenderer
```

基础组件：

- `GlassPanel`
- `GlassButton`
- `PillButton`
- `ModeCard`
- `StatusBadge`
- `StageProgress`
- `CounselCard`
- `EvidenceCard`
- `ContextReference`
- `DecisionInterruptCard`
- `ConfidenceMeter`

样式文件：

```text
src/styles/tokens.css
src/styles/glass.css
src/styles/typography.css
src/styles/motion.css
```

禁止在业务组件中散落十六进制颜色和独立阴影值。

---

## 8. 无障碍与性能

- 正文对比度至少 4.5:1。
- 所有可聚焦元素有清晰焦点环。
- 支持 Tab、Shift+Tab、Enter、Esc 和方向键。
- 图标按钮具有 `aria-label`。
- 运行状态使用 `aria-live="polite"`。
- 状态使用颜色 + 图标 + 文字三层表达。
- 大面积内容区禁止 backdrop-filter。
- 同时动画元素不超过 5 个。
- 支持 `prefers-reduced-motion`。

---

## 9. 第一版明确不做

- 移动端和 Tablet 适配。
- 亮色主题。
- 数据 Dashboard。
- Gantt、Kanban、统计图表。
- 复杂 3D 堆叠卡片。
- 粒子背景、持续霓虹动画。
- 多 Agent 角色聊天展示。
- Workflow 编辑器。
- 为视觉效果重写 Agent Chat UI 的 Thread 和 Stream 基础设施。

---

## 10. 验收标准

### 10.1 视觉验收

- [ ] 所有页面使用本文件的 Token，不散落临时颜色值。
- [ ] 默认主题为 Blue Charcoal + Harmony Green 暗色体系。
- [ ] 用户可见图标统一为 Phosphor Icons。
- [ ] 玻璃仅用于导航和控件层。
- [ ] 正文、报告、证据和结论详情使用实体背景。
- [ ] 1440px、1280px、1024px 三个桌面宽度通过视觉回归。
- [ ] 关键页面提供 Playwright 截图基线。
- [ ] 不得仅套深色主题后声明完成。

### 10.2 交互验收

- [ ] 可新建并切换议题。
- [ ] 四种参谋模式入口可选择并进入 Composer。
- [ ] 议题状态、阶段进度和待裁决状态可见。
- [ ] Interrupt 支持键盘和点击选择。
- [ ] 右侧材料面板可折叠、切 Tab、恢复状态。
- [ ] 不破坏 Thread、Streaming、Stop、File Upload、Interrupt、Artifact。

### 10.3 可用性验收

- [ ] 用户在 10 秒内可找到“下一步做什么”入口。
- [ ] 用户无需阅读聊天全文即可在右栏找到当前参谋建议。
- [ ] 用户可区分分析中、调研中、待裁决和已形成建议。
- [ ] 用户能查看当前建议使用的证据和历史依据。
- [ ] 界面不存在仅依赖颜色才能识别的状态。

---

## 11. 后续设计治理

1. 后续所有 UI Issue 和 PR 必须引用本文件。
2. 新组件优先扩展现有设计系统，不允许另建不兼容风格。
3. 如需新增颜色、玻璃级别、字号、圆角或阴影，必须先修改本规范。
4. 后续移动端设计需单独立项，不允许在桌面组件中临时堆砌移动适配代码。
5. UI 评审必须同时检查视觉、交互、可访问性和原有 Agent 能力回归。
