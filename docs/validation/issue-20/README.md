# Issue #20 验收证据

本目录是 ClauseOS 全量控件与桌面端议题工作台的可重现视觉验收记录。生成日期为 2026-08-01（Asia/Shanghai），分支为 `codex/issue-20-clauseos-desktop-ui`。

截图来自 `/control-gallery` 与 `/workbench-preview` 中的生产 React 组件。`workbench-preview` 只提供确定性的本地状态，不复制第二套业务 UI，也不依赖后端数据。

## 重现方式

在已启动 Web 服务时，Windows PowerShell 下执行：

```powershell
$env:PLAYWRIGHT_BASE_URL = "http://127.0.0.1:3001"
pnpm --filter @cos/web evidence:issue20
pnpm --filter @cos/web test:e2e
```

未设置 `PLAYWRIGHT_BASE_URL` 时，Playwright 会自动启动 `http://127.0.0.1:3000`。截图使用系统 Chrome、dark color scheme、device scale factor 1；生成器会拒绝控制台错误、水平溢出、非 PNG 文件和错误尺寸。机读结果见 [manifest.json](./manifest.json)。

## 截图矩阵

| 证据                                               | 路由 / 状态                      |      尺寸 | 验收重点                                             |
| -------------------------------------------------- | -------------------------------- | --------: | ---------------------------------------------------- |
| [Control Gallery](./control-gallery-1440.png)      | `/control-gallery`               | 1440×7622 | P0 控件、业务组件、全状态、ClauseOS primitives       |
| [1440 新建](./workbench-1440-new.png)              | `state=new`                      |  1440×900 | 四种议题模式、欢迎区、编辑器、三栏骨架               |
| [1440 进行中](./workbench-1440-running.png)        | `state=running`                  |  1440×900 | 流式消息、阶段进度、工具活动、停止入口               |
| [1440 待裁决](./workbench-1440-waiting.png)        | `state=waiting`                  |  1440×900 | thick glass Interrupt、推荐/代价、取消/直接汇报/确认 |
| [1440 正式建议](./workbench-1440-formal.png)       | `state=ready`                    |  1440×900 | 实体正文层、主要矛盾、建议、置信度、改判条件         |
| [1280 正式建议](./workbench-1280-formal.png)       | `state=ready`                    |  1280×800 | 240px 导航 / 360px 材料栏，议题行密度                |
| [1024 紧凑桌面](./workbench-1024-formal.png)       | `state=ready`                    |  1024×768 | 72px 图标导航 / 320px 材料栏，无水平溢出             |
| [960 桌面端阻断](./workbench-960-desktop-only.png) | `state=ready`                    |   960×720 | `<1024px` 只展示桌面端提示，不实现移动端             |
| [命令面板](./control-gallery-command-palette.png)  | Ctrl+K                           |  1440×900 | 搜索、分组、快捷键、焦点陷阱、thick glass            |
| [筛选浮层](./control-gallery-filter-popover.png)   | FilterPopover                    |  1440×900 | 复选状态、操作区、边缘高光、无裁切                   |
| [确认弹窗](./control-gallery-modal.png)            | ConfirmDialog                    |  1440×900 | 遮罩、层级、关闭入口、主次操作                       |
| [Toast](./control-gallery-toast.png)               | feedback                         |  1440×900 | 图标 + 文案 + 语义色，不仅依赖颜色                   |
| [键盘焦点](./control-gallery-keyboard-focus.png)   | Tab                              |  1440×900 | 键盘移动后的可见银白焦点环                           |
| [Reduced motion](./workbench-reduced-motion.png)   | `prefers-reduced-motion: reduce` |  1440×900 | 进行态保留静态语义，运行中动画数为 0                 |

## 自动验收结果

- `pnpm --filter @cos/web evidence:issue20`：14/14 张截图生成成功；控制台错误 0，水平溢出 0，尺寸异常 0。
- `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3001 pnpm --filter @cos/web test:e2e`：19/19 通过。
- `pnpm --filter @cos/web test:ci`：18 个测试文件、57/57 通过。
- `pnpm --filter @cos/web typecheck`：通过。
- `uv run pytest`：24/24 通过。
- 真实 LangGraph 浏览器回归：附件上传、发送、停止、恢复发送、Thread 状态刷新、重载恢复和桌面端阻断均通过。
- Axe 扫描：Control Gallery 和正式建议工作台的可检测违规为 0。
- 布局断言：1440px 为 272/392，1280px 为 240/360，1024px 为 72/320；960px 触发 desktop-only guard。
- 交互断言：Cmd/Ctrl+K、筛选键盘开关、Modal Esc/焦点陷阱、四个材料 Tab、材料栏收起/恢复/键盘调宽、议题行 overflow menu 均通过。
- Reduced motion 断言：浏览器报告的 `running` animation 数为 0。

## 人工视觉检查

- [x] 玻璃重要表面具有透明本体、内高光、单层银边、局部白色 sweep 和小范围冷/暖折射，不是统一灰色 blur card。
- [x] 长篇参谋正文、证据和正式结论使用低饱和实体深色内容层。
- [x] 绿色仅用于主 CTA、选中、运行、完成与焦点；警告/待裁决同时使用黄色图标和文字。
- [x] 右栏始终保持“参谋结论 / 关键证据 / 历史依据 / 调研过程”四个主 Tab。
- [x] 1280px 导航中标题、模式、状态和时间可读，议题行不超过 72px。
- [x] 1024px 图标导航、主区和材料栏无重叠、裁切或水平滚动。
- [x] 待裁决卡展示推荐理由、关键代价与三种操作，不用 Markdown 模拟结构化交互。
- [x] Command Palette、Popover、Modal、Toast 完整位于可视区，无 z-index 穿透或裁切。
- [x] 键盘焦点环清晰；reduced-motion 下语义与布局不变。

## 回归边界

这些图像证据证明生产组件的视觉、布局和键盘行为，但不伪造后端 Stream。生产首页仍保持 `ThreadProvider > StreamProvider > ArtifactProvider > Thread`，并继续复用原有 Thread 存储、values streaming、stop、文件上传、Interrupt resume、Artifact portal 和 resumable stream 接线。Artifact portal 由运行时测试覆盖；结构化 Interrupt 的取消、重选、恢复与 resumable stream 由组件测试覆盖；真实 Stream、上传、停止、状态刷新和深链接恢复由 LangGraph 浏览器回归覆盖；其余 Agent Inbox 与自定义 UI 接线由 TypeScript 和代码审查验证。

本轮没有有意设计偏差。
