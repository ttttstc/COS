# LYL ClauseOS 控件全量清单

> Issue #20 实施范围。标记 P0 的控件必须在本 Issue 中实现；P1 可在相关业务 Issue 中实现，但视觉 Primitive 必须预留。

## 1. 环境与布局

| 控件 | 级别 | 必需状态 | 用途 |
|---|---|---|---|
| StarGridBackground | P0 | default | 黑场点阵背景 |
| AmbientWhiteWash | P0 | default | 顶部/角落极弱白光 |
| DesktopOnlyGuard | P0 | default | `<1024px` 阻断提示 |
| ThreePaneShell | P0 | wide/mid/compact | 三栏议题工作台 |
| SplitHandle | P0 | default/hover/dragging/disabled | 左右分栏拖拽 |
| ScrollArea | P0 | idle/scrolling | 自定义低对比滚动条 |

## 2. 导航

| 控件 | 级别 | 必需状态 |
|---|---|---|
| BrandLockup | P0 | default/compact |
| NewIssueButton | P0 | default/hover/active/disabled |
| NavSection | P0 | expanded/collapsed |
| NavItem | P0 | default/hover/selected/disabled/badge |
| IssueListItem | P0 | default/hover/selected/waiting/running/failed |
| UserMenu | P1 | closed/open |

## 3. 输入与选择

- Button：primary / secondary / ghost / danger / text；
- IconButton：circle / square；
- SplitButton；
- Input / SearchInput / Textarea；
- Checkbox / Radio / Switch；
- Select / Combobox；
- SegmentedControl；
- DateInput（P1）；
- FileUploadTrigger；
- ComposerAttachment；
- ValidationHint。

所有表单控件必须覆盖：default / hover / focus / filled / disabled / error / success。

## 4. 标签和状态

- StatusBadge：neutral / success / warning / error / info / disabled；
- FilterChip：default / active / removable / disabled；
- CategoryTag；
- CountBadge；
- NotificationDot；
- PriorityLabel；
- Keycap；
- ConfidenceMeter。

## 5. 反馈与浮层

- Tooltip；
- ContextPopover；
- FilterPopover；
- OverflowMenu；
- CommandPalette；
- Modal；
- ConfirmDialog；
- DangerDialog；
- Toast；
- InlineAlert；
- Skeleton；
- EmptyState；
- ErrorState。

## 6. 数据与展示

- Table / TableHeader / TableRow / TableCell；
- Pagination；
- Tabs；
- Accordion；
- Timeline；
- HorizontalStepProgress；
- VerticalResearchProgress；
- SourceLink；
- Avatar / InitialAvatar / PresenceDot；
- Divider；

## 7. LYL 业务控件

| 控件 | Issue | 核心字段 |
|---|---:|---|
| IssueModeCard | #20/#3 | mode/title/description/selected |
| IssueTopbar | #20 | title/type/status/updatedAt/actions |
| IssueComposer | #20/#3 | text/files/mode/status |
| CounselMessageRenderer | #20 | role/content/structuredUI |
| ToolActivity | #20/#4 | tool/status/summary |
| StageProgress | #20/#10 | stages/current/progress |
| DecisionInterruptCard | #20/#6 | question/options/recommendation/cost |
| CounselSummaryCard | #20/#7 | contradiction/recommendation/confidence/changeConditions |
| EvidenceCard | #20/#10 | relation/source/date/relevance/freshness |
| ContextReferenceCard | #20/#5 | memory/source/time/confidence |
| ResearchPlanCard | #20/#10 | unknowns/angles/stopConditions |
| MaterialTabs | #20/#7 | counsel/evidence/history/research |
| FeedbackBar | #13 | adopt/reject/research/review |

## 8. 不在第一版实现

- 移动端导航、底部 Tab、移动 Drawer；
- 亮色主题；
- Dashboard 指标卡、Gantt、Kanban；
- 团队 Avatar Stack 和多人在线状态；
- 复杂图表库；
- 大面积 3D 卡片堆叠。
