"use client";

import {
  useId,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

import {
  Button,
  CountBadge,
  IconButton,
  Keycap,
  OverflowMenu,
} from "@/components/clauseos/controls";
import {
  IssueListItem,
  MaterialTabs,
  type IssueStatus,
  type MaterialTabId,
} from "@/components/clauseos/business";
import {
  DesktopOnlyGuard,
  GlassClear,
  GlassRegular,
  ScrollArea,
  SplitHandle,
  StarGridBackground,
} from "@/components/clauseos/primitives";
import { LYL_ICON_MAP } from "@/components/icons/lyl-icons";
import type { ActiveCounselMode, CounselMode } from "@/lib/counsel-mode";
import { cn } from "@/lib/utils";

export interface WorkbenchIssue {
  id: string;
  mode: CounselMode;
  status: IssueStatus;
  title: string;
  unreadCount?: number;
  updatedAt: string;
  updatedLabel: string;
}

const QUICK_MODES: {
  icon: typeof LYL_ICON_MAP.ask;
  label: string;
  mode: ActiveCounselMode;
}[] = [
  { mode: "ask", label: "下一步做什么", icon: LYL_ICON_MAP.ask },
  { mode: "decide", label: "帮我做决定", icon: LYL_ICON_MAP.decide },
  { mode: "research", label: "调研后判断", icon: LYL_ICON_MAP.research },
  { mode: "diagnose", label: "诊断历史思维", icon: LYL_ICON_MAP.diagnose },
];

export function BrandLockup({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className="cos-workbench__brand"
      data-compact={compact || undefined}
    >
      <span
        className="cos-workbench__brand-mark"
        aria-hidden="true"
      >
        <LYL_ICON_MAP.brand
          size={22}
          weight="duotone"
        />
      </span>
      <span className="cos-workbench__brand-copy">
        <strong>ClauseOS</strong>
        <small>LYL 参谋台</small>
      </span>
    </div>
  );
}

export function NewIssueButton({
  disabled = false,
  onClick,
}: {
  disabled?: boolean;
  onClick(): void;
}) {
  return (
    <Button
      type="button"
      className="cos-workbench__new-issue"
      variant="primary"
      leadingIcon={<LYL_ICON_MAP.newIssue aria-hidden="true" />}
      disabled={disabled}
      onClick={onClick}
    >
      新建议题
    </Button>
  );
}

export function NavSection({
  children,
  className,
  collapsed = false,
  title,
}: {
  children: ReactNode;
  className?: string;
  collapsed?: boolean;
  title: string;
}) {
  const titleId = useId();
  return (
    <section
      className={className}
      aria-labelledby={titleId}
      data-collapsed={collapsed || undefined}
    >
      <h2 id={titleId}>{title}</h2>
      <div hidden={collapsed}>{children}</div>
    </section>
  );
}

export function NavItem({
  badge,
  disabled = false,
  icon,
  label,
  onClick,
  selected = false,
}: {
  badge?: ReactNode;
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  onClick(): void;
  selected?: boolean;
}) {
  return (
    <button
      type="button"
      className="cos-workbench__nav-item"
      aria-pressed={selected}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      {icon}
      <span>{label}</span>
      {badge}
    </button>
  );
}

export interface IssueNavigatorProps {
  activeMode?: CounselMode;
  className?: string;
  issues: WorkbenchIssue[];
  onCreateIssue(): void;
  onModeSelect(mode: ActiveCounselMode): void;
  onOpenCommand?(): void;
  onSelectIssue(id: string): void;
  selectedIssueId?: string;
}

export function IssueNavigator({
  activeMode,
  className,
  issues,
  onCreateIssue,
  onModeSelect,
  onOpenCommand,
  onSelectIssue,
  selectedIssueId,
}: IssueNavigatorProps) {
  return (
    <nav
      className={cn("cos-workbench__navigator", className)}
      aria-label="议题导航"
    >
      <GlassRegular
        className="cos-workbench__navigator-surface"
        optics="shell"
        prismCorners={["top-right"]}
        sweep="top-left"
      >
        <BrandLockup />

        <NewIssueButton onClick={onCreateIssue} />

        <NavSection
          className="cos-workbench__quick-modes"
          title="快捷模式"
        >
          {QUICK_MODES.map(({ icon: Icon, label, mode }) => (
            <NavItem
              key={mode}
              selected={activeMode === mode}
              label={label}
              icon={
                <Icon
                  size={19}
                  aria-hidden="true"
                />
              }
              onClick={() => onModeSelect(mode)}
            />
          ))}
        </NavSection>

        <section
          className="cos-workbench__issue-section"
          aria-labelledby="issue-list-title"
        >
          <div className="cos-workbench__section-heading">
            <h2 id="issue-list-title">最近议题</h2>
            <CountBadge>{issues.length}</CountBadge>
          </div>
          <ScrollArea
            className="cos-workbench__issue-list"
            label="最近议题列表"
          >
            {issues.map((issue) => (
              <IssueListItem
                key={issue.id}
                {...issue}
                selected={selectedIssueId === issue.id}
                onSelect={onSelectIssue}
                actions={
                  <OverflowMenu
                    label={`更多议题操作：${issue.title}`}
                    trigger={
                      <LYL_ICON_MAP.more
                        size={18}
                        aria-hidden="true"
                      />
                    }
                    items={[
                      {
                        id: "open",
                        label: "打开议题",
                        onSelect: () => onSelectIssue(issue.id),
                      },
                    ]}
                  />
                }
              />
            ))}
          </ScrollArea>
        </section>

        <div className="cos-workbench__navigator-footer">
          <button
            type="button"
            className="cos-workbench__command-trigger"
            onClick={onOpenCommand}
            disabled={!onOpenCommand}
            aria-label="打开命令面板"
          >
            <LYL_ICON_MAP.command
              size={18}
              aria-hidden="true"
            />
            <span>命令面板</span>
            <span
              className="cos-workbench__command-keys"
              aria-hidden="true"
            >
              <Keycap>Ctrl</Keycap>
              <Keycap>K</Keycap>
            </span>
          </button>
        </div>
      </GlassRegular>
    </nav>
  );
}

export interface IssueWorkspaceProps {
  children: ReactNode;
  className?: string;
  composer: ReactNode;
  scrollable?: boolean;
  topbar: ReactNode;
}

export function IssueWorkspace({
  children,
  className,
  composer,
  scrollable = true,
  topbar,
}: IssueWorkspaceProps) {
  return (
    <main className={cn("cos-workbench__workspace", className)}>
      <GlassClear
        className="cos-workbench__workspace-surface"
        optics="panel"
        prismCorners={["bottom-right"]}
        sweep="none"
      >
        {topbar}
        {scrollable ? (
          <ScrollArea
            className="cos-workbench__workspace-scroll"
            label="议题内容"
          >
            {children}
          </ScrollArea>
        ) : (
          <div className="cos-workbench__workspace-scroll">{children}</div>
        )}
        <footer className="cos-workbench__composer-wrap">{composer}</footer>
      </GlassClear>
    </main>
  );
}

export interface CounselMaterialPanelProps {
  activeTab: MaterialTabId;
  className?: string;
  counts?: Partial<Record<MaterialTabId, number>>;
  headerAction?: ReactNode;
  onTabChange(tab: MaterialTabId): void;
  panels: Partial<Record<MaterialTabId, ReactNode>>;
}

export function CounselMaterialPanel({
  activeTab,
  className,
  counts,
  headerAction,
  onTabChange,
  panels,
}: CounselMaterialPanelProps) {
  return (
    <section
      className={cn("cos-workbench__material", className)}
      aria-label="参谋材料"
    >
      <GlassRegular
        className="cos-workbench__material-surface"
        optics="shell"
        prismCorners={["top-right", "bottom-right"]}
        sweep="top-left"
      >
        <header className="cos-workbench__material-heading">
          <div>
            <span>议题材料</span>
            <h2>参谋依据与结论</h2>
          </div>
          {headerAction}
        </header>
        <MaterialTabs
          activeTab={activeTab}
          counts={counts}
          onTabChange={onTabChange}
          panels={panels}
        />
      </GlassRegular>
    </section>
  );
}

export interface ClauseOSWorkbenchProps {
  className?: string;
  material: ReactNode;
  materialMaxWidth?: number;
  materialMinWidth?: number;
  materialOpen?: boolean;
  materialWidth?: number;
  navigator: ReactNode;
  onMaterialWidthChange?(width: number): void;
  workspace: ReactNode;
}

export function ClauseOSWorkbench({
  className,
  material,
  materialMaxWidth = 560,
  materialMinWidth = 320,
  materialOpen = true,
  materialWidth,
  navigator,
  onMaterialWidthChange,
  workspace,
}: ClauseOSWorkbenchProps) {
  const [resizing, setResizing] = useState(false);
  const resizeStart = useRef<{ pointerX: number; width: number } | undefined>(
    undefined,
  );
  const style = materialWidth
    ? ({
        "--cos-workbench-material-width": `${materialWidth}px`,
      } as CSSProperties)
    : undefined;

  const getCurrentMaterialWidth = () => {
    return materialWidth ?? 392;
  };

  const resizeMaterial = (width: number) => {
    onMaterialWidthChange?.(
      Math.min(materialMaxWidth, Math.max(materialMinWidth, Math.round(width))),
    );
  };

  const resizeByPointerDelta = (delta: number) => {
    resizeMaterial(
      (resizeStart.current?.width ?? getCurrentMaterialWidth()) + delta,
    );
  };

  const resizeByStep = (direction: -1 | 1) => {
    resizeMaterial(getCurrentMaterialWidth() - direction * 8);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!onMaterialWidthChange || materialMaxWidth <= materialMinWidth) return;
    resizeStart.current = {
      pointerX: event.clientX,
      width: getCurrentMaterialWidth(),
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setResizing(true);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (
      !resizeStart.current ||
      !event.currentTarget.hasPointerCapture(event.pointerId)
    ) {
      return;
    }
    resizeByPointerDelta(resizeStart.current.pointerX - event.clientX);
  };

  const handlePointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    resizeStart.current = undefined;
    setResizing(false);
  };

  return (
    <DesktopOnlyGuard className={cn("cos-workbench", className)}>
      <StarGridBackground className="cos-workbench__environment">
        <div
          className="cos-workbench__layout"
          style={style}
          data-material-open={materialOpen}
        >
          {navigator}
          {workspace}
          <aside
            className="cos-workbench__material-slot"
            aria-label="参谋材料"
            aria-hidden={!materialOpen || undefined}
            inert={!materialOpen || undefined}
          >
            {material}
            {onMaterialWidthChange && materialOpen && (
              <SplitHandle
                className="cos-workbench__material-resizer"
                dragging={resizing}
                label="调整参谋材料宽度"
                disabled={materialMaxWidth <= materialMinWidth}
                valueMin={materialMinWidth}
                valueMax={materialMaxWidth}
                valueNow={materialWidth}
                onStep={resizeByStep}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerEnd}
                onPointerCancel={handlePointerEnd}
              />
            )}
          </aside>
        </div>
      </StarGridBackground>
    </DesktopOnlyGuard>
  );
}

export function WorkbenchTopbarIconButton({
  children,
  label,
  onClick,
}: {
  children: ReactNode;
  label: string;
  onClick?(): void;
}) {
  return (
    <IconButton
      label={label}
      size="sm"
      variant="ghost"
      onClick={onClick}
    >
      {children}
    </IconButton>
  );
}
