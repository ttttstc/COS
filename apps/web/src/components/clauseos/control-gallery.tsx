"use client";

import {
  Command,
  DotsThree,
  Funnel,
  Gear,
  MagnifyingGlass,
  Plus,
  SealCheck,
  Sparkle,
  UserFocus,
} from "@phosphor-icons/react";
import { useEffect, useState } from "react";

import {
  ContextReferenceCard,
  CounselMessageRenderer,
  CounselSummaryCard,
  DecisionInterruptCard,
  EvidenceCard,
  IssueComposer,
  IssueListItem,
  IssueModeCard,
  IssueStatusBadge,
  IssueTopbar,
  MaterialTabs,
  ResearchPlanCard,
  StageProgress,
  ToolActivity,
  type MaterialTabId,
} from "./business";
import {
  Accordion,
  Avatar,
  Button,
  CategoryTag,
  Checkbox,
  Combobox,
  CommandPalette,
  ComposerAttachment,
  ConfirmDialog,
  ContextPopover,
  ControlGroup,
  CountBadge,
  DangerDialog,
  Divider,
  EmptyState,
  ErrorState,
  FieldShell,
  FileUploadTrigger,
  FilterChip,
  FilterPopover,
  IconButton,
  InlineAlert,
  Input,
  Keycap,
  NotificationDot,
  OverflowMenu,
  Pagination,
  Popover,
  PriorityLabel,
  Radio,
  SearchInput,
  SegmentedControl,
  Select,
  Skeleton,
  SourceLink,
  SplitButton,
  StatusBadge,
  Switch,
  Table,
  TableCell,
  TableHeader,
  TableRow,
  Tabs,
  Textarea,
  Timeline,
  TimelineItem,
  Toast,
  Tooltip,
  HorizontalStepProgress,
  VerticalResearchProgress,
  type CommandPaletteItem,
} from "./controls";
import {
  AmbientWhiteWash,
  DesktopOnlyGuard,
  GlassSurface,
  ScrollArea,
  SplitHandle,
  StarGridBackground,
} from "./primitives";
import {
  BrandLockup,
  NavItem,
  NavSection,
  NewIssueButton,
} from "../workbench/workbench-shell";

const MODE_OPTIONS = [
  { value: "ask", label: "下一步做什么" },
  { value: "decide", label: "帮我做决定" },
  { value: "research", label: "调研后判断" },
  { value: "diagnose", label: "诊断历史思维" },
];

const COMMAND_ITEMS: CommandPaletteItem[] = [
  {
    id: "search",
    label: "搜索历史议题",
    description: "按标题、状态或材料查找",
    shortcut: ["Ctrl", "F"],
    group: "最近使用",
    icon: <MagnifyingGlass />,
  },
  {
    id: "new",
    label: "新建议题",
    description: "创建一个空白议题",
    shortcut: ["Ctrl", "N"],
    group: "快捷操作",
    icon: <Plus />,
  },
  {
    id: "material",
    label: "打开参谋材料",
    description: "查看结论、证据、历史和调研过程",
    shortcut: ["Ctrl", "M"],
    group: "建议命令",
    icon: <Sparkle />,
  },
  {
    id: "settings",
    label: "参谋台设置",
    description: "调整界面密度与材料面板",
    group: "建议命令",
    icon: <Gear />,
  },
];

function GallerySection({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <GlassSurface
      id={id}
      level="thin"
      className="cos-gallery__section"
    >
      <header className="cos-gallery__section-header">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <StatusBadge tone="neutral">P0</StatusBadge>
      </header>
      {children}
    </GlassSurface>
  );
}

export function ControlGallery() {
  const [switchOn, setSwitchOn] = useState(true);
  const [segment, setSegment] = useState<"comfortable" | "compact">(
    "comfortable",
  );
  const [tab, setTab] = useState<"counsel" | "evidence" | "history">("counsel");
  const [page, setPage] = useState(1);
  const [commandOpen, setCommandOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [dangerDialog, setDangerDialog] = useState<
    "idle" | "submitting" | null
  >(null);
  const [attachmentVisible, setAttachmentVisible] = useState(true);
  const [mode, setMode] = useState<"ask" | "decide" | "research" | "diagnose">(
    "research",
  );
  const [selectedDecision, setSelectedDecision] = useState("interviews");
  const [materialTab, setMaterialTab] = useState<MaterialTabId>("counsel");
  const [splitSampleValue, setSplitSampleValue] = useState(392);
  const [composerValue, setComposerValue] =
    useState("第一版个人参谋产品应该先验证什么？");

  const adjustSplitSample = (delta: -1 | 1) => {
    setSplitSampleValue((current) =>
      Math.max(320, Math.min(560, current + delta * 8)),
    );
  };

  useEffect(() => {
    const openCommandPalette = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
      }
    };
    window.addEventListener("keydown", openCommandPalette);
    return () => window.removeEventListener("keydown", openCommandPalette);
  }, []);

  return (
    <StarGridBackground>
      <main className="cos-gallery-page">
        <div className="cos-gallery">
          <header className="cos-gallery__hero">
            <div>
              <h1>LYL ClauseOS 全量控件 Gallery</h1>
              <p>
                生产 React
                组件、完整状态与键盘交互的阶段门。玻璃只服务于环境、导航、控制和容器；长文本始终落在实体深色内容层。
              </p>
            </div>
            <StatusBadge tone="success">视觉 Primitive 已接入</StatusBadge>
          </header>

          <nav
            className="cos-gallery__nav"
            aria-label="Gallery 分区"
          >
            {[
              ["primitives", "原语"],
              ["actions", "操作"],
              ["forms", "表单"],
              ["status", "状态"],
              ["navigation", "导航"],
              ["overlays", "浮层"],
              ["data", "数据"],
              ["feedback", "反馈"],
              ["business", "业务控件"],
            ].map(([id, label]) => (
              <a
                key={id}
                href={`#${id}`}
              >
                {label}
              </a>
            ))}
          </nav>

          <GallerySection
            id="primitives"
            title="Environment & Layout Primitives"
            description="环境白雾、桌面边界、三栏工作台、分栏控制与滚动容器均直接复用生产原语。"
          >
            <div className="cos-gallery__stack">
              <div className="cos-gallery__primitive-grid">
                <div className="cos-gallery__primitive-demo">
                  <h3>AmbientWhiteWash</h3>
                  <div className="cos-gallery__ambient-sample">
                    <AmbientWhiteWash />
                    <span>低对比环境白雾</span>
                  </div>
                </div>
                <div className="cos-gallery__primitive-demo">
                  <h3>ScrollArea</h3>
                  <ScrollArea
                    label="独立纵向 ScrollArea 示例"
                    className="cos-gallery__scroll-sample"
                  >
                    <p>当前阶段：核对关键未知。</p>
                    <p>主要矛盾：先验证持续委托意愿。</p>
                    <p>明确建议：完成五位目标用户访谈。</p>
                    <p>改判条件：多数用户拒绝保留上下文。</p>
                    <p>暂缓事项：移动端与多人协作。</p>
                    <p>下一步：整理能够改变判断的证据。</p>
                  </ScrollArea>
                </div>
              </div>

              <Divider label="三栏工作台概念" />
              <div className="cos-gallery__primitive-demo">
                <h3>ThreePaneShell / ClauseOSWorkbench</h3>
                <div
                  className="cos-gallery__three-pane-sample"
                  role="group"
                  aria-label="ThreePaneShell / ClauseOSWorkbench 概念样例"
                >
                  <GlassSurface
                    level="regular"
                    className="cos-gallery__three-pane-panel"
                  >
                    <strong>议题导航</strong>
                    <ScrollArea
                      label="三栏概念左侧滚动区"
                      className="cos-gallery__pane-scroll"
                    >
                      <span>产品方向判断</span>
                      <span>定价假设复盘</span>
                      <span>用户访谈计划</span>
                      <span>历史决策诊断</span>
                    </ScrollArea>
                  </GlassSurface>
                  <SplitHandle
                    label="三栏概念左分栏"
                    valueMin={320}
                    valueMax={560}
                    valueNow={splitSampleValue}
                    onStep={adjustSplitSample}
                  />
                  <GlassSurface
                    level="clear"
                    className="cos-gallery__three-pane-panel cos-gallery__three-pane-panel--main"
                  >
                    <strong>议题主区域</strong>
                    <p>对话、阶段与用户裁决在这里持续推进。</p>
                  </GlassSurface>
                  <SplitHandle
                    label="三栏概念右分栏"
                    valueMin={320}
                    valueMax={560}
                    valueNow={splitSampleValue}
                    onStep={adjustSplitSample}
                  />
                  <GlassSurface
                    level="regular"
                    className="cos-gallery__three-pane-panel"
                  >
                    <strong>参谋材料</strong>
                    <ScrollArea
                      label="三栏概念右侧滚动区"
                      className="cos-gallery__pane-scroll"
                    >
                      <span>参谋结论</span>
                      <span>关键证据</span>
                      <span>历史依据</span>
                      <span>调研过程</span>
                    </ScrollArea>
                  </GlassSurface>
                </div>
              </div>

              <Divider label="SplitHandle 与 ScrollArea" />
              <div className="cos-gallery__primitive-grid">
                <div className="cos-gallery__primitive-demo">
                  <h3>SplitHandle states</h3>
                  <div
                    className="cos-gallery__split-states"
                    role="group"
                    aria-label="SplitHandle 状态"
                  >
                    <div className="cos-gallery__split-state">
                      <span>Default</span>
                      <SplitHandle
                        label="Default SplitHandle"
                        valueMin={320}
                        valueMax={560}
                        valueNow={splitSampleValue}
                        onStep={adjustSplitSample}
                      />
                    </div>
                    <div className="cos-gallery__split-state">
                      <span>Dragging</span>
                      <SplitHandle
                        dragging
                        label="Dragging SplitHandle"
                        valueMin={320}
                        valueMax={560}
                        valueNow={splitSampleValue}
                        onStep={adjustSplitSample}
                      />
                    </div>
                    <div className="cos-gallery__split-state">
                      <span>Disabled</span>
                      <SplitHandle
                        disabled
                        label="Disabled SplitHandle"
                        valueMin={320}
                        valueMax={560}
                        valueNow={splitSampleValue}
                      />
                    </div>
                  </div>
                </div>
                <div className="cos-gallery__primitive-demo">
                  <h3>DesktopOnlyGuard</h3>
                  <DesktopOnlyGuard
                    className="cos-gallery__guard-sample"
                    title="第一版仅支持桌面端"
                    description="DesktopOnlyGuard 桌面可见缩略样例"
                  >
                    <span>桌面端工作台内容</span>
                  </DesktopOnlyGuard>
                </div>
              </div>
            </div>
          </GallerySection>

          <GallerySection
            id="actions"
            title="Buttons & Actions"
            description="Primary / secondary / ghost / danger / text，含 loading、active、disabled 与 icon-only。"
          >
            <div className="cos-gallery__stack">
              <div className="cos-gallery__row">
                <Button
                  variant="primary"
                  leadingIcon={<Plus />}
                >
                  新建议题
                </Button>
                <Button>玻璃次按钮</Button>
                <Button variant="ghost">幽灵按钮</Button>
                <Button variant="danger">删除议题</Button>
                <Button variant="text">文字操作</Button>
                <Button
                  loading
                  variant="primary"
                >
                  提交中
                </Button>
                <Button disabled>禁用</Button>
              </div>
              <div className="cos-gallery__row">
                <Tooltip label="创建新议题">
                  <IconButton
                    label="创建新议题"
                    variant="primary"
                  >
                    <Plus />
                  </IconButton>
                </Tooltip>
                <IconButton
                  label="更多操作"
                  shape="square"
                >
                  <DotsThree />
                </IconButton>
                <SplitButton
                  label="形成建议"
                  onClick={() => undefined}
                  items={[
                    {
                      id: "draft",
                      label: "保存草稿",
                      onSelect: () => undefined,
                    },
                    {
                      id: "report",
                      label: "按现有信息汇报",
                      onSelect: () => undefined,
                    },
                  ]}
                />
              </div>
            </div>
          </GallerySection>

          <GallerySection
            id="forms"
            title="Inputs & Choices"
            description="默认、填充、聚焦、禁用、错误和成功状态；placeholder 使用可读对比度。"
          >
            <div className="cos-gallery__grid">
              <FieldShell
                label="搜索"
                hint="支持议题、材料与命令"
              >
                <SearchInput
                  placeholder="搜索议题、资料或命令…"
                  shortcut="Ctrl K"
                />
              </FieldShell>
              <FieldShell
                label="议题标题"
                success="标题可用"
              >
                <Input
                  defaultValue="个人参谋产品第一版如何切入"
                  data-success="true"
                />
              </FieldShell>
              <FieldShell
                label="必要范围"
                error="请说明这次判断覆盖的范围"
              >
                <Input
                  defaultValue="范围过宽"
                  aria-invalid="true"
                />
              </FieldShell>
              <FieldShell
                label="补充背景"
                hint="建议包含目标、约束与当前阻塞"
              >
                <Textarea defaultValue="描述目标、现实约束和已经尝试过的方案。" />
              </FieldShell>
              <FieldShell label="议题模式">
                <Select
                  defaultValue="decide"
                  options={MODE_OPTIONS}
                />
              </FieldShell>
              <FieldShell label="快速查找模式">
                <Combobox
                  label="快速查找议题模式"
                  placeholder="输入模式名称"
                  options={MODE_OPTIONS}
                />
              </FieldShell>
            </div>
            <div className="cos-gallery__demo">
              <h3>Choice controls</h3>
              <div className="cos-gallery__grid cos-gallery__grid--three">
                <div className="cos-gallery__stack">
                  <Checkbox
                    label="保留本次历史依据"
                    description="后续建议可以引用已确认内容"
                    defaultChecked
                  />
                  <Checkbox
                    label="禁用选项"
                    disabled
                  />
                </div>
                <div className="cos-gallery__stack">
                  <Radio
                    name="priority"
                    label="验证真实需求"
                    description="当前参谋推荐"
                    defaultChecked
                  />
                  <Radio
                    name="priority"
                    label="验证技术可行性"
                  />
                </div>
                <div className="cos-gallery__stack">
                  <Switch
                    checked={switchOn}
                    onCheckedChange={setSwitchOn}
                    label="显示调研阶段"
                    description="只展示用户有价值的进度"
                  />
                  <SegmentedControl<"compact" | "comfortable">
                    label="界面密度"
                    value={segment}
                    onValueChange={setSegment}
                    options={[
                      { value: "comfortable", label: "舒适" },
                      { value: "compact", label: "紧凑" },
                    ]}
                  />
                </div>
              </div>
            </div>
          </GallerySection>

          <GallerySection
            id="status"
            title="Badges, Chips & Keycaps"
            description="状态使用图标、形状、文案与颜色共同表达；绿色仅用于选中、运行、完成和确认。"
          >
            <div className="cos-gallery__stack">
              <ControlGroup>
                <StatusBadge>草稿</StatusBadge>
                <StatusBadge tone="success">已形成建议</StatusBadge>
                <StatusBadge tone="warning">待用户裁决</StatusBadge>
                <StatusBadge tone="error">处理失败</StatusBadge>
                <StatusBadge tone="info">分析中</StatusBadge>
                <StatusBadge tone="disabled">不可用</StatusBadge>
              </ControlGroup>
              <ControlGroup>
                <FilterChip>全部议题</FilterChip>
                <FilterChip active>调研中</FilterChip>
                <FilterChip
                  active
                  removable
                  onRemove={() => undefined}
                >
                  待裁决
                </FilterChip>
                <FilterChip disabled>已归档（禁用）</FilterChip>
                <CountBadge>12</CountBadge>
                <Keycap>Ctrl K</Keycap>
                <Keycap>Esc</Keycap>
              </ControlGroup>
              <ControlGroup>
                <NotificationDot
                  count={1}
                  label="有新议题"
                />
                <NotificationDot
                  count={7}
                  tone="info"
                />
                <NotificationDot
                  count={120}
                  label="120 条待处理通知"
                  tone="warning"
                />
                <PriorityLabel priority="low" />
                <PriorityLabel priority="medium" />
                <PriorityLabel priority="high" />
                <PriorityLabel priority="critical" />
              </ControlGroup>
              <ControlGroup>
                <CategoryTag>产品判断</CategoryTag>
                <CategoryTag>外部调研</CategoryTag>
                <CategoryTag>历史依据</CategoryTag>
              </ControlGroup>
            </div>
          </GallerySection>

          <GallerySection
            id="navigation"
            title="Tabs, Accordion & Navigation"
            description="Tab 支持方向键、Home/End；Accordion 使用原生 details/summary 语义。"
          >
            <div className="cos-gallery__grid cos-gallery__grid--two">
              <Tabs<"counsel" | "evidence" | "history">
                value={tab}
                onValueChange={setTab}
                label="参谋材料示例"
                items={[
                  {
                    id: "counsel",
                    label: "参谋结论",
                    icon: <Sparkle />,
                    panel: (
                      <InlineAlert
                        tone="success"
                        title="明确建议"
                      >
                        先完成 5 位目标用户访谈，再决定是否扩展系统方案。
                      </InlineAlert>
                    ),
                  },
                  {
                    id: "evidence",
                    label: "关键证据",
                    icon: <SealCheck />,
                    badge: <CountBadge>3</CountBadge>,
                    panel: <p>三条与当前判断直接相关的证据。</p>,
                  },
                  {
                    id: "history",
                    label: "历史依据",
                    icon: <UserFocus />,
                    panel: <p>最近六次产品议题中的重复模式。</p>,
                  },
                ]}
              />
              <Accordion
                items={[
                  {
                    id: "one",
                    title: "为什么推荐先验证需求？",
                    content:
                      "工程可行性已经有基础证据，当前最可能改变判断的是用户是否持续需要。",
                    open: true,
                  },
                  {
                    id: "two",
                    title: "什么情况下改判？",
                    content: "如果访谈显示需求低频且不可重复，应停止扩大投入。",
                  },
                ]}
              />
            </div>
            <Divider label="工作台导航原语" />
            <div className="cos-gallery__nav-primitives">
              <div
                className="cos-gallery__nav-sample"
                data-gallery-state="expanded"
              >
                <BrandLockup />
                <NewIssueButton onClick={() => undefined} />
                <NavSection
                  className="cos-workbench__quick-modes"
                  title="导航展开状态"
                >
                  <NavItem
                    label="默认议题"
                    icon={<Sparkle aria-hidden="true" />}
                    onClick={() => undefined}
                  />
                  <NavItem
                    selected
                    label="选中议题"
                    icon={<UserFocus aria-hidden="true" />}
                    badge={
                      <NotificationDot
                        count={3}
                        label="3 个待处理议题"
                      />
                    }
                    onClick={() => undefined}
                  />
                  <NavItem
                    disabled
                    label="禁用议题"
                    icon={<Gear aria-hidden="true" />}
                    onClick={() => undefined}
                  />
                </NavSection>
              </div>
              <div
                className="cos-gallery__nav-sample cos-gallery__nav-sample--compact"
                data-gallery-state="collapsed"
              >
                <BrandLockup compact />
                <NewIssueButton
                  disabled
                  onClick={() => undefined}
                />
                <NavSection
                  collapsed
                  className="cos-workbench__quick-modes"
                  title="导航折叠状态"
                >
                  <NavItem
                    label="折叠区议题"
                    icon={<Sparkle aria-hidden="true" />}
                    onClick={() => undefined}
                  />
                </NavSection>
              </div>
            </div>
          </GallerySection>

          <GallerySection
            id="overlays"
            title="Tooltip, Popover, Command Palette & Modal"
            description="浮层具备键盘焦点、Esc 关闭与清晰层级；重要浮层使用 thick glass。"
          >
            <div className="cos-gallery__grid cos-gallery__grid--two">
              <div className="cos-gallery__stack">
                <div className="cos-gallery__popover-stage">
                  <FilterPopover
                    defaultOpen
                    label={
                      <>
                        <Funnel aria-hidden="true" />
                        筛选议题
                      </>
                    }
                  >
                    <div className="cos-gallery__stack">
                      <strong>议题状态</strong>
                      <Checkbox
                        label="调研中"
                        defaultChecked
                      />
                      <Checkbox label="待用户裁决" />
                      <ControlGroup>
                        <Button size="sm">重置</Button>
                        <Button
                          size="sm"
                          variant="primary"
                        >
                          应用筛选
                        </Button>
                      </ControlGroup>
                    </div>
                  </FilterPopover>
                </div>
                <div className="cos-gallery__popover-stage cos-gallery__popover-stage--compact">
                  <ContextPopover
                    defaultOpen
                    label="查看引用上下文"
                  >
                    <div className="cos-gallery__stack">
                      <strong>历史依据</strong>
                      <p>议题 #12：没有真实使用证据前，不扩大产品边界。</p>
                      <SourceLink href="#business">定位历史依据</SourceLink>
                    </div>
                  </ContextPopover>
                </div>
                <ControlGroup>
                  <Popover
                    loading
                    label="加载上下文"
                  >
                    <p>加载完成后展示上下文。</p>
                  </Popover>
                  <Popover
                    disabled
                    label="上下文不可用"
                  >
                    <p>当前没有可用上下文。</p>
                  </Popover>
                </ControlGroup>
              </div>
              <div className="cos-gallery__stack">
                <ControlGroup>
                  <Button
                    leadingIcon={<Command />}
                    onClick={() => setCommandOpen(true)}
                  >
                    打开命令面板
                  </Button>
                  <OverflowMenu
                    items={[
                      {
                        id: "rename",
                        label: "重命名议题",
                        onSelect: () => undefined,
                      },
                      {
                        id: "archive",
                        label: "归档议题",
                        onSelect: () => undefined,
                      },
                      {
                        id: "delete",
                        label: "删除议题",
                        danger: true,
                        onSelect: () => undefined,
                      },
                    ]}
                  />
                  <Button
                    variant="danger"
                    onClick={() => setDangerDialog("idle")}
                  >
                    打开危险确认
                  </Button>
                  <Button onClick={() => setDangerDialog("submitting")}>
                    查看危险提交中
                  </Button>
                </ControlGroup>
                <div className="cos-gallery__modal-stage">
                  <GlassSurface
                    level="thick"
                    className="cos-gallery__modal-sample"
                  >
                    <h3>确认采纳建议？</h3>
                    <p>采纳后将更新议题状态，并记录这次选择与改判条件。</p>
                    <ControlGroup>
                      <Button onClick={() => setModalOpen(true)}>取消</Button>
                      <Button variant="primary">确认采纳</Button>
                    </ControlGroup>
                  </GlassSurface>
                </div>
              </div>
            </div>
            <CommandPalette
              open={commandOpen}
              onOpenChange={setCommandOpen}
              items={COMMAND_ITEMS}
              onSelect={() => undefined}
            />
            <ConfirmDialog
              open={modalOpen}
              onOpenChange={setModalOpen}
              title="确认采纳建议？"
              description="采纳后会记录本次选择，仍可在后续复盘中更新。"
              onConfirm={() => setModalOpen(false)}
              confirmLabel="确认采纳"
            />
            <DangerDialog
              open={dangerDialog !== null}
              onOpenChange={(open) => {
                if (!open) setDangerDialog(null);
              }}
              title="删除这个议题？"
              description="删除后无法恢复；历史依据与材料也会一并移除。"
              onConfirm={() => setDangerDialog("submitting")}
              submitting={dangerDialog === "submitting"}
            />
          </GallerySection>

          <GallerySection
            id="data"
            title="Table, Timeline & Progress"
            description="实体内容层承载高密度数据；表格、时间线与进度均使用可读语义。"
          >
            <Table caption="议题列表">
              <TableHeader>
                <TableRow>
                  <TableCell
                    as="th"
                    scope="col"
                  >
                    议题
                  </TableCell>
                  <TableCell
                    as="th"
                    scope="col"
                  >
                    模式
                  </TableCell>
                  <TableCell
                    as="th"
                    scope="col"
                  >
                    状态
                  </TableCell>
                  <TableCell
                    as="th"
                    scope="col"
                  >
                    更新时间
                  </TableCell>
                  <TableCell
                    as="th"
                    scope="col"
                  >
                    <span className="sr-only">操作</span>
                  </TableCell>
                </TableRow>
              </TableHeader>
              <tbody>
                <TableRow aria-selected="true">
                  <TableCell>
                    <span className="cos-gallery__table-cell-title">
                      个人参谋产品第一版如何切入
                    </span>
                    <span className="cos-gallery__table-cell-meta">
                      当前主要矛盾已识别
                    </span>
                  </TableCell>
                  <TableCell>调研</TableCell>
                  <TableCell>
                    <StatusBadge tone="success">调研中</StatusBadge>
                  </TableCell>
                  <TableCell>刚刚</TableCell>
                  <TableCell>
                    <IconButton
                      label="议题操作"
                      variant="ghost"
                      size="sm"
                    >
                      <DotsThree />
                    </IconButton>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>第一版先验证什么</TableCell>
                  <TableCell>决策</TableCell>
                  <TableCell>
                    <StatusBadge tone="warning">待裁决</StatusBadge>
                  </TableCell>
                  <TableCell>2 小时前</TableCell>
                  <TableCell>
                    <IconButton
                      label="议题操作"
                      variant="ghost"
                      size="sm"
                    >
                      <DotsThree />
                    </IconButton>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>停止继续扩大范围的条件</TableCell>
                  <TableCell>下一步</TableCell>
                  <TableCell>
                    <StatusBadge>草稿</StatusBadge>
                  </TableCell>
                  <TableCell>昨天</TableCell>
                  <TableCell>
                    <IconButton
                      label="议题操作"
                      variant="ghost"
                      size="sm"
                    >
                      <DotsThree />
                    </IconButton>
                  </TableCell>
                </TableRow>
              </tbody>
            </Table>
            <div className="cos-gallery__row">
              <Pagination
                page={page}
                pageCount={4}
                onPageChange={setPage}
              />
            </div>
            <Divider label="来源与时间线" />
            <div className="cos-gallery__grid cos-gallery__grid--two">
              <div className="cos-gallery__stack">
                <SourceLink href="#business">查看当前参谋结论</SourceLink>
                <SourceLink
                  href="https://example.com/evidence"
                  external
                >
                  打开外部证据来源
                </SourceLink>
                <div className="cos-gallery__divider-sample">
                  <span>本地材料</span>
                  <Divider orientation="vertical" />
                  <span>外部来源</span>
                </div>
              </div>
              <Timeline label="议题关键时间线">
                <TimelineItem
                  title="创建议题"
                  dateTime="2026-07-30T09:00:00+08:00"
                  dateLabel="7 月 30 日"
                  status="success"
                >
                  明确第一版验证目标。
                </TimelineItem>
                <TimelineItem
                  title="核对关键未知"
                  dateTime="2026-08-01T10:30:00+08:00"
                  dateLabel="今天 10:30"
                  status="running"
                >
                  正在补充用户委托意愿证据。
                </TimelineItem>
                <TimelineItem
                  title="等待用户裁决"
                  status="waiting"
                />
              </Timeline>
            </div>
            <Divider label="进度组件" />
            <div className="cos-gallery__progress-grid">
              <HorizontalStepProgress
                label="横向议题处理进度"
                items={[
                  { id: "context", label: "恢复上下文", state: "complete" },
                  {
                    id: "unknown",
                    label: "识别未知",
                    state: "running",
                    detail: "正在核对",
                  },
                  { id: "review", label: "反方审查", state: "pending" },
                ]}
              />
              <VerticalResearchProgress
                label="纵向调研过程"
                items={[
                  {
                    id: "source",
                    label: "检索一手来源",
                    state: "complete",
                  },
                  {
                    id: "counter",
                    label: "寻找反例",
                    state: "running",
                    detail: "只保留会改变判断的证据",
                  },
                  {
                    id: "decision",
                    label: "形成建议",
                    state: "waiting_user",
                  },
                ]}
              />
            </div>
          </GallerySection>

          <GallerySection
            id="feedback"
            title="Feedback, Loading & Empty states"
            description="错误不白屏；加载使用 skeleton；空态说明下一步。"
          >
            <div className="cos-gallery__stack">
              <div className="cos-gallery__row">
                <Avatar
                  alt="刘亚楼参谋"
                  initials="LYL"
                  online
                />
                <Avatar
                  alt="用户"
                  initials="NB"
                  size="lg"
                />
                <FileUploadTrigger inputId="gallery-file" />
                <input
                  id="gallery-file"
                  type="file"
                  hidden
                />
                {attachmentVisible && (
                  <ComposerAttachment
                    name="用户访谈摘要.pdf"
                    detail="1.8 MB"
                    onRemove={() => setAttachmentVisible(false)}
                  />
                )}
              </div>
              <InlineAlert
                tone="warning"
                title="仍有关键未知"
              >
                样本量不足，当前建议应保留改判条件。
              </InlineAlert>
              <div className="cos-gallery__toast-stage">
                <Toast
                  title="已采纳建议"
                  description="选择和改判条件已记录。"
                />
              </div>
              <div className="cos-gallery__grid">
                <div className="cos-gallery__stack">
                  <Skeleton style={{ height: 18, width: "64%" }} />
                  <Skeleton style={{ height: 72 }} />
                  <Skeleton style={{ height: 18, width: "42%" }} />
                </div>
                <EmptyState
                  title="尚无关键证据"
                  description="开始调研后，真正会改变判断的证据会出现在这里。"
                  compact
                />
                <ErrorState
                  title="材料加载失败"
                  description="议题仍可继续使用；请重试加载参谋材料。"
                  onRetry={() => undefined}
                />
              </div>
            </div>
          </GallerySection>

          <GallerySection
            id="business"
            title="ClauseOS Business Components"
            description="议题、消息、裁决与四类材料全部复用生产组件；进度只展示可解释阶段，不暴露私有思维链。"
          >
            <div className="cos-gallery__stack">
              <div className="cos-gallery__grid cos-gallery__grid--two">
                {MODE_OPTIONS.map((option) => (
                  <IssueModeCard
                    key={option.value}
                    mode={option.value as typeof mode}
                    title={option.label}
                    description={
                      option.value === "research"
                        ? "先核对关键未知，再给出带改判条件的建议。"
                        : "围绕当前问题形成清晰、可执行的判断。"
                    }
                    selected={mode === option.value}
                    onSelect={setMode}
                  />
                ))}
                <IssueModeCard
                  loading
                  mode="research"
                  title="调研模式加载中"
                  description="正在准备调研协议与历史上下文。"
                  onSelect={() => undefined}
                />
                <IssueModeCard
                  disabled
                  mode="diagnose"
                  title="诊断历史思维（禁用）"
                  description="历史样本不足时暂不可用。"
                  onSelect={() => undefined}
                />
              </div>

              <IssueTopbar
                title="个人参谋产品第一版如何切入"
                mode={mode}
                status="researching"
                updatedAt="2026-08-01T14:20:00+08:00"
                updatedLabel="刚刚更新"
                actions={<Button variant="ghost">更多</Button>}
              />

              <div className="cos-gallery__grid cos-gallery__grid--two">
                <div className="cos-gallery__stack">
                  <IssueListItem
                    id="issue-20"
                    title="个人参谋产品第一版如何切入"
                    mode="research"
                    status="researching"
                    selected
                    unreadCount={2}
                    updatedAt="2026-08-01T14:20:00+08:00"
                    updatedLabel="刚刚"
                    onSelect={() => undefined}
                  />
                  <IssueListItem
                    id="issue-19"
                    title="第一版先验证什么"
                    mode="decide"
                    status="waiting_user"
                    updatedAt="2026-08-01T12:20:00+08:00"
                    updatedLabel="2 小时前"
                    onSelect={() => undefined}
                  />
                  <IssueListItem
                    id="issue-failed"
                    title="证据同步失败"
                    mode="research"
                    status="failed"
                    updatedAt="2026-08-01T11:50:00+08:00"
                    updatedLabel="30 分钟前"
                    onSelect={() => undefined}
                  />
                </div>
                <StageProgress
                  items={[
                    { id: "context", label: "恢复上下文", state: "complete" },
                    { id: "unknown", label: "识别未知", state: "complete" },
                    {
                      id: "research",
                      label: "外部调研",
                      state: "running",
                      detail: "核对高价值证据",
                    },
                    { id: "review", label: "反方审查", state: "pending" },
                  ]}
                />
              </div>

              <div className="cos-gallery__grid cos-gallery__grid--two">
                <CounselMessageRenderer messageRole="user">
                  <p>第一版个人参谋产品应该先验证什么？</p>
                </CounselMessageRenderer>
                <CounselMessageRenderer
                  messageRole="assistant"
                  streaming
                >
                  <p>
                    当前主要矛盾不是功能是否完整，而是用户是否愿意把真实决策交给参谋持续跟进。
                  </p>
                </CounselMessageRenderer>
              </div>

              <ToolActivity
                tool="可信来源核对"
                summary="正在核对高价值证据"
                status="running"
                defaultExpanded
                detail="已检查 3 个一手来源；继续寻找会改变当前判断的反例。"
              />

              <DecisionInterruptCard
                interruptId="gallery-decision"
                title="是否先投入用户访谈？"
                question="选择下一步执行路径"
                rationale="两个方案都可行，但资源边界不同。"
                options={[
                  {
                    id: "interviews",
                    title: "先访谈 5 位目标用户",
                    description: "用最短路径验证真实委托意愿。",
                    cost: "延后两周开发",
                    recommended: true,
                  },
                  {
                    id: "build",
                    title: "直接扩展完整工作台",
                    description: "更快获得可演示产物。",
                    cost: "可能在错误假设上投入开发",
                  },
                ]}
                selectedOptionId={selectedDecision}
                onSelect={setSelectedDecision}
                onConfirm={() => undefined}
                allowReportNow
                onReportNow={() => undefined}
              />

              <MaterialTabs
                activeTab={materialTab}
                onTabChange={setMaterialTab}
                counts={{ counsel: 1, evidence: 2, history: 1, research: 1 }}
                panels={{
                  counsel: (
                    <CounselSummaryCard
                      currentStage="正式建议"
                      mainContradiction="先验证委托意愿，而不是继续堆叠功能。"
                      recommendation="访谈 5 位目标用户；只有 3 位愿意持续使用时才扩展系统。"
                      confidence={78}
                      changeConditions={["用户明确拒绝持续记录决策上下文"]}
                      deferItems={["移动端适配", "多人协作"]}
                    />
                  ),
                  evidence: (
                    <EvidenceCard
                      id="evidence-1"
                      title="连续决策场景比单次问答更能形成留存"
                      summary="访谈记录显示，用户真正需要的是能记住历史取舍的长期参谋。"
                      relation="support"
                      relevance="high"
                      freshness="high"
                      sourceName="目标用户访谈"
                      publishedAt="2026-07-30"
                    />
                  ),
                  history: (
                    <ContextReferenceCard
                      id="context-1"
                      title="此前坚持先验证真实需求"
                      summary="你曾明确要求：没有真实使用证据前，不扩大产品边界。"
                      sourceName="议题 #12"
                      capturedAt="2026-07-18"
                      confidence={92}
                    />
                  ),
                  research: (
                    <ResearchPlanCard
                      status="running"
                      unknowns={["用户是否愿意持续提供决策上下文"]}
                      angles={["委托频率", "改判触发", "人工替代成本"]}
                      stopConditions={["5 位目标用户完成访谈"]}
                    />
                  ),
                }}
              />

              <Divider label="四类证据关系" />
              <div className="cos-gallery__evidence-grid">
                <EvidenceCard
                  id="evidence-support"
                  title="连续委托提升复访率"
                  summary="目标用户在持续记忆上下文时更愿意返回继续讨论。"
                  relation="support"
                  relevance="high"
                  freshness="high"
                  sourceName="目标用户访谈"
                  sourceUrl="https://example.com/evidence/support"
                  publishedAt="2026-07-30"
                />
                <EvidenceCard
                  id="evidence-oppose"
                  title="部分用户只需要单次问答"
                  summary="低频决策用户不愿维护长期上下文，削弱持续参谋价值。"
                  relation="oppose"
                  relevance="high"
                  freshness="medium"
                  sourceName="反方访谈记录"
                  sourceUrl="https://example.com/evidence/oppose"
                  publishedAt="2026-07-28"
                />
                <EvidenceCard
                  id="evidence-limit"
                  title="样本仍集中在早期使用者"
                  summary="当前结论不能直接外推到低频或非技术用户。"
                  relation="limit"
                  relevance="medium"
                  freshness="high"
                  sourceName="样本审查"
                  sourceUrl="https://example.com/evidence/limit"
                  publishedAt="2026-07-31"
                />
                <EvidenceCard
                  id="evidence-context"
                  title="现阶段目标是验证委托意愿"
                  summary="第一版成功标准是持续使用证据，不是功能数量。"
                  relation="context"
                  relevance="medium"
                  freshness="medium"
                  sourceName="议题范围说明"
                  sourceUrl="https://example.com/evidence/context"
                  publishedAt="2026-08-01"
                />
              </div>

              <IssueComposer
                value={composerValue}
                onChange={setComposerValue}
                onSubmit={() => undefined}
                mode={mode}
                attachmentSlot={
                  <FileUploadTrigger inputId="gallery-business-file" />
                }
                statusSlot={<IssueStatusBadge status="draft" />}
              />
              <input
                id="gallery-business-file"
                type="file"
                hidden
              />
            </div>
          </GallerySection>

          <footer className="cos-gallery__footer">
            Issue #20 · Keyboard operable · Phosphor only · Reduced motion ready
          </footer>
        </div>
      </main>
    </StarGridBackground>
  );
}
