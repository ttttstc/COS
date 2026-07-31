# LYL 参谋台 ClauseOS 桌面端 UI 实施规范 V2.0

> 状态：已确认，Issue #20 的强制实施基线  
> 适用范围：LYL 第一版桌面端 UI 与后续桌面端新增控件  
> 上游视觉规范：`docs/design/reference/ClauseOS-UI-UX-Design-Spec-V2.0.md`  
> 产品术语：统一使用“议题”  
> 技术底座：`langchain-ai/agent-chat-ui`

## 0. 本版修订目的

V1 只描述了“暗色 + 玻璃 + 绿色强调”，不足以复刻参考图的真实质感。V2 将参考图拆解成可编码、可截图验收的视觉公式，并提供完整控件实现素材。

**禁止将本规范实现成普通深色 SaaS、磨砂灰卡片或单纯 backdrop-blur。** ClauseOS 风格的辨识度来自以下组合，而不是某一个颜色：

1. 近黑背景与极低对比点阵；
2. 超薄玻璃本体，内部透明而非灰色实心；
3. 2–4px 物理边缘感，银白单线轮廓；
4. 局部白光沿边扫过，不能四周均匀发光；
5. 右上/右下极小面积虹彩折射；
6. 内容层大部分维持低亮度，绿色只做状态点、焦点和行动确认；
7. 大留白、低密度、精细线性图标；
8. 控件 hover 仅轻微提亮与上浮，避免霓虹灯式光污染。

---

## 1. 视觉 DNA：必须同时满足

### 1.1 黑场与点阵

页面基底：

```css
background-color: #050608;
background-image:
  radial-gradient(circle at 1px 1px, rgba(255,255,255,.035) 1px, transparent 0),
  radial-gradient(circle at 70% 10%, rgba(255,255,255,.015), transparent 34%);
background-size: 18px 18px, 100% 100%;
```

要求：

- 点阵只在空白处隐约可见；
- 点阵不穿透长文本内容实体层；
- 禁止星空粒子动画；
- 不使用大面积绿色渐变背景。

### 1.2 超薄玻璃公式

每个核心玻璃控件由四层组成：

```text
背景透明层
+ 内侧柔和高光
+ 银白物理描边
+ 局部边缘光 / 虹彩角光
```

推荐基础实现：

```css
.lyl-glass {
  position: relative;
  background:
    linear-gradient(145deg, rgba(255,255,255,.095), rgba(255,255,255,.025) 35%, rgba(255,255,255,.015) 72%, rgba(255,255,255,.055));
  border: 1px solid rgba(235,242,255,.34);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.16),
    inset 0 -1px 0 rgba(255,255,255,.035),
    0 12px 42px rgba(0,0,0,.42);
  backdrop-filter: blur(22px) saturate(128%);
}

.lyl-glass::before {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  pointer-events: none;
  background:
    radial-gradient(80% 44% at 18% 0%, rgba(255,255,255,.28), transparent 58%),
    radial-gradient(45% 24% at 100% 0%, rgba(101,165,255,.16), transparent 72%),
    radial-gradient(42% 28% at 100% 100%, rgba(255,214,132,.12), transparent 70%);
  mix-blend-mode: screen;
  opacity: .75;
  mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  mask-composite: exclude;
  padding: 1px;
}
```

### 1.3 物理边与局部光

- 轮廓主要是冷白/银灰，不是绿色；
- 上边缘或左上区域存在连续但不均匀的白光；
- 右上或右下允许 8–36px 的虹彩角光；
- 强调态可在底边出现低强度绿色光带；
- 任何控件不得四周同时高亮；
- 同屏高亮玻璃控件不超过 3 个。

### 1.4 绿色使用纪律

| 场景 | 绿色强度 |
|---|---|
| 状态点、选中 checkbox | `#42E384` |
| 主 CTA、确认动作 | `#00C66B` |
| 运行中光带 | `rgba(0,255,157,.22)` |
| 选中项边框 | `rgba(66,227,132,.42)` |
| 普通正文 | 禁止绿色 |
| 大面积面板背景 | 禁止绿色 |

---

## 2. 桌面端信息架构

```text
┌──────────────────┬──────────────────────────────────┬───────────────────────┐
│ 议题导航          │ 议题主区域                        │ 参谋材料               │
│ 272px             │ minmax(600px, 1fr)               │ 392px                  │
│                  │                                  │                       │
│ 新建议题          │ 顶栏 / 对话 / 进度 / 决策中断      │ 结论 / 证据 / 历史 /过程 │
│ 快捷模式          │                                  │                       │
│ 历史议题          │ Composer                         │                       │
└──────────────────┴──────────────────────────────────┴───────────────────────┘
```

断点仅做桌面端：

- `>= 1440px`：272 / flex / 392；
- `1280–1439px`：240 / flex / 360；
- `1024–1279px`：72 / flex / 320；
- `<1024px`：显示“第一版仅支持桌面端”的阻断提示，不实现移动布局。

---

## 3. 控件分层

### 3.1 Layer A：环境层

- `StarGridBackground`
- `AmbientWhiteWash`
- `PrismCornerLight`

### 3.2 Layer B：导航与控制玻璃层

- `GlassSidebar`
- `GlassToolbar`
- `GlassPanel`
- `CommandPalette`
- `FilterPopover`
- `Tooltip`
- `ContextPopover`
- `Modal`
- `Toast`

### 3.3 Layer C：通用交互控件

- Button / IconButton / SplitButton
- Input / SearchInput / Textarea
- Checkbox / Radio / Switch
- Select / SegmentedControl
- Badge / Chip / CountBadge / Keycap
- Tabs / Dropdown / OverflowMenu
- Avatar / PresenceDot
- Table / Pagination / EmptyState / Skeleton

### 3.4 Layer D：LYL 业务控件

- `IssueModeCard`
- `IssueListItem`
- `IssueStatusBadge`
- `IssueTopbar`
- `IssueComposer`
- `StageProgress`
- `DecisionInterruptCard`
- `CounselSummaryCard`
- `EvidenceCard`
- `ContextReferenceCard`
- `ResearchPlanCard`
- `ConfidenceMeter`
- `MaterialTabs`

---

## 4. 核心控件规格

### 4.1 玻璃侧栏

- 宽度：272px；
- 外圆角：24px；
- 边框：银白 1px，左上亮、右下暗；
- 内边距：16px；
- 菜单项：44px；
- 选中态：透明度提升 + 白色聚光 + 绿色状态点；
- 禁止整条菜单使用纯绿色背景。

### 4.2 命令面板

- 触发：`⌘K` / `Ctrl+K`；
- 宽度：760–840px；
- 最大高度：70vh；
- 搜索框高度：54px；
- 最近使用、快捷操作、建议命令分组；
- 当前行使用白色光晕，不使用纯色选中块；
- 上下键选择，Enter 打开，Esc 关闭。

### 4.3 议题模式卡

- 4 张一行，卡高 112px；
- 默认 `glass-thin`；
- 图标 26px，标题 16px，说明 12px；
- hover：上浮 2px、顶部白光增强；
- selected：银白边 + 底部绿色细光带；
- 禁止使用大面积绿色填充。

### 4.4 议题列表项

- 行高 64–72px；
- 标题、模式、状态、更新时间；
- hover 展示更多菜单；
- selected 使用局部白光聚焦和左侧绿色点；
- 待裁决需同时出现黄色状态点和文字。

### 4.5 进度组件

- 横向步骤条用于主流程；
- 纵向进度用于调研子步骤；
- 状态：pending / running / complete / failed / waiting-user；
- running 使用绿色环形点和 1200ms 呼吸；
- reduced-motion 时只保留静态环。

### 4.6 决策中断卡

- `glass-thick`；
- 宽度 560–680px；
- 2–4 个选项；
- 推荐方案使用白光聚焦 + 绿色小标签；
- 必须展示推荐理由和关键代价；
- 操作：取消 / 按现有信息汇报 / 确认选择；
- 危险操作使用红色语义，不使用绿色。

### 4.7 参谋结论卡

内容层使用实体深色，不使用透明正文底：

- 当前阶段；
- 主要矛盾；
- 明确建议；
- 置信度；
- 改判条件；
- 暂缓事项；
- 采纳、反对、请求调研操作。

外壳可以有极薄银边，内部正文不得被高光干扰。

### 4.8 证据卡

- support / oppose / limit / context；
- 摘要、来源、日期、相关性、时效性；
- 证据类型使用图标 + 文案 + 语义色；
- 原文入口使用玻璃次按钮；
- 多证据列表应保持实体内容背景。

---

## 5. 字体、图标、密度

- 中文标题：`Inter, PingFang SC, Microsoft YaHei, sans-serif`，不强制下载字体；
- 英文品牌与数字：Urbanist / Inter；
- 用户可见图标统一 Phosphor Icons，线宽 1.5–1.75；
- 导航 22–24px、工具 18–20px、内联 16px；
- 页面正文 14px / 1.6；
- 辅助信息 12px / 1.45；
- 空间体系：4 / 8 / 12 / 16 / 24 / 32 / 48。

---

## 6. 动效

| 动效 | 时长 | 约束 |
|---|---:|---|
| Hover 提亮 | 120ms | opacity / border / transform only |
| Popover 入场 | 160ms | scale .98 + opacity |
| Modal 入场 | 220ms | scale .96 + opacity |
| Sidebar 折叠 | 250ms | width + content fade |
| Tab 切换 | 140ms | opacity / translateY 2px |
| 运行呼吸 | 1200ms | 单一状态点，不带大面积辉光 |

同时运动元素不超过 5 个。支持 `prefers-reduced-motion`。

---

## 7. Agent Chat UI 改造映射

| 原组件 | 新组件 | 处理 |
|---|---|---|
| ThreadHistory | `IssueNavigator` | 重写视觉和条目语义，保留数据能力 |
| Thread | `IssueWorkspace` | 保留消息流，重建三栏 Shell |
| Composer | `IssueComposer` | 保留上传和发送逻辑，重写外观和模式状态 |
| Artifact | `CounselMaterialPanel` | 改为固定四 Tab |
| Interrupt | `DecisionInterruptCard` | 使用结构化交互，不用 Markdown 模拟 |
| Message | `CounselMessageRenderer` | Agent 正文去聊天气泡化 |
| Tool Call | `StageProgress` / `ToolActivity` | 隐藏低价值调用细节 |

---

## 8. 实施顺序

1. Design Token 与环境背景；
2. 玻璃 Primitive 与全量通用控件；
3. Control Gallery 截图基线；
4. 三栏 Shell；
5. 新建议题页；
6. 议题进行中与进度；
7. 决策中断；
8. 参谋材料面板；
9. 命令面板、筛选与弹窗；
10. Playwright 视觉回归和可访问性检查。

---

## 9. 视觉验收红线

以下任意一项出现即不通过：

- 只设置黑背景、绿色按钮和 `backdrop-blur` 就宣称完成；
- 玻璃面板呈均匀灰色实心块；
- 所有边框都发光；
- 大面积绿色渐变或霓虹光；
- 长文本位于强高光玻璃上；
- Lucide 与 Phosphor 混用；
- 议题、Thread、会商术语混用；
- `<1024px` 被迫挤压成不可用布局而不显示提示；
- 未提供 1440 / 1280 / 1024 三档截图；
- 控件状态缺失 hover / focus / active / disabled / error；
- 破坏 Agent Chat UI 的 Thread、Streaming、File、Interrupt 或 Artifact 能力。

---

## 10. 交付文件

Codex 开工前必须读取：

- `docs/design/reference/ClauseOS-UI-UX-Design-Spec-V2.0.md`
- `docs/design/LYL-ClauseOS-Desktop-UI-Implementation-Spec-V2.0.md`
- `docs/design/controls/CONTROL-INVENTORY.md`
- `docs/design/controls/CONTROL-STATE-MATRIX.md`
- `design-system/lyl-clauseos-ui.css`
- `design-system/ui-contracts.ts`
- `design-system/control-gallery.html`
- `docs/design/ucd/lyl-interactive-ucd.html`
- `docs/codex/CODEX-ISSUE-20-HANDOFF.md`
