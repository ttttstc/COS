# 控件状态与验收矩阵

## 通用状态

| 控件族 | Default | Hover | Focus-visible | Active | Disabled | Error | Loading |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Button | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ |
| IconButton | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ |
| Input/Textarea | ✓ | ✓ | ✓ | — | ✓ | ✓ | — |
| Checkbox/Radio | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Select/Combobox | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| NavItem | ✓ | ✓ | ✓ | ✓ | ✓ | — | — |
| ModeCard | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ |
| Popover/Menu | closed | trigger | trap | open | trigger-disabled | — | ✓ |
| Modal | closed | — | trap | open | — | danger variant | submitting |

## 玻璃效果验收

| 检查项 | 通过条件 |
|---|---|
| 透明本体 | 可感知背景环境，但正文可读 |
| 银白物理边 | 至少一侧有 1px 冷白高光，非均匀灰线 |
| 内部高光 | 上边/左上存在内侧白光，不覆盖正文 |
| 虹彩角光 | 仅右上或右下极小区域出现，面积不超过控件 6% |
| 绿色使用 | 仅选中、运行、确认，不用于普通边框 |
| Hover | 提亮 + 上浮 1–2px，不扩大模糊区域 |
| Focus | 2px 绿色外环，键盘可见 |
| Disabled | 对比度下降但结构仍可识别 |

## 业务状态

| 议题状态 | 图标 | 色彩 | 文案要求 |
|---|---|---|---|
| draft | Circle | neutral | 草稿 |
| analyzing | SpinnerGap | blue/neutral | 分析中 |
| researching | MagnifyingGlass | green | 调研中 |
| waiting_user | UserFocus | warning | 待用户裁决 |
| counsel_ready | SealCheck | green | 已形成建议 |
| adopted | CheckSquareOffset | success | 已采纳 |
| rejected | XSquare | neutral/red | 未采纳 |
| review_due | ClockCounterClockwise | warning | 待复盘 |
| reviewed | ArchiveBox | neutral | 已复盘 |
| failed | WarningOctagon | danger | 处理失败 |

## 截图矩阵

每个 PR 至少上传：

1. 1440×900：新建议题；
2. 1440×900：议题进行中；
3. 1440×900：待用户裁决；
4. 1440×900：已形成建议；
5. 1280×800：三栏压缩；
6. 1024×768：紧凑导航；
7. Control Gallery：全量基础控件；
8. `prefers-reduced-motion` 验证记录；
9. 键盘焦点路径截图或录像。
