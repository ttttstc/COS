import {
  useId,
  useState,
  type ClipboardEventHandler,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import {
  CaretDown,
  LYL_ICON_MAP,
  SpinnerGap,
} from "@/components/icons/lyl-icons";
import {
  Button,
  CategoryTag,
  CountBadge,
  IconButton,
  StatusBadge,
  Tabs,
  Textarea,
  type ProgressItem,
  type StatusTone,
} from "@/components/clauseos/controls";
import {
  ContentSurface,
  GlassClear,
  GlassRegular,
  GlassThick,
  GlassThin,
  StatusDot,
  type StatusDotStatus,
} from "@/components/clauseos/primitives";
import {
  getCounselMode,
  type ActiveCounselMode,
  type CounselMode,
} from "@/lib/counsel-mode";
import { cn } from "@/lib/utils";

const MODE_ICONS = {
  ask: LYL_ICON_MAP.ask,
  decide: LYL_ICON_MAP.decide,
  research: LYL_ICON_MAP.research,
  diagnose: LYL_ICON_MAP.diagnose,
} satisfies Record<ActiveCounselMode, typeof LYL_ICON_MAP.ask>;

export interface IssueModeCardProps {
  className?: string;
  description: string;
  disabled?: boolean;
  loading?: boolean;
  mode: ActiveCounselMode;
  onSelect(mode: ActiveCounselMode): void;
  selected?: boolean;
  title: string;
}

export function IssueModeCard({
  className,
  description,
  disabled = false,
  loading = false,
  mode,
  onSelect,
  selected = false,
  title,
}: IssueModeCardProps) {
  const Icon = MODE_ICONS[mode];

  return (
    <button
      type="button"
      className={cn("cos-issue-mode-card", className)}
      data-loading={loading || undefined}
      aria-busy={loading || undefined}
      aria-pressed={selected}
      disabled={disabled || loading}
      onClick={() => onSelect(mode)}
    >
      <GlassThin
        active={selected}
        disabled={disabled}
        interactive={!disabled && !loading}
        className="cos-issue-mode-card__surface"
      >
        <span className="cos-issue-mode-card__icon">
          {loading ? (
            <SpinnerGap
              className="cos-business-spinner"
              size={26}
              aria-hidden="true"
            />
          ) : (
            <Icon
              size={26}
              weight="regular"
              aria-hidden="true"
            />
          )}
        </span>
        <strong>{title}</strong>
        <span>{description}</span>
      </GlassThin>
    </button>
  );
}

export type IssueStatus =
  | "draft"
  | "analyzing"
  | "researching"
  | "waiting_user"
  | "counsel_ready"
  | "adopted"
  | "rejected"
  | "review_due"
  | "reviewed"
  | "failed";

const ISSUE_STATUS_META = {
  draft: {
    label: "草稿",
    tone: "neutral",
    dot: "neutral",
    icon: LYL_ICON_MAP.allIssues,
  },
  analyzing: {
    label: "分析中",
    tone: "info",
    dot: "info",
    icon: SpinnerGap,
  },
  researching: {
    label: "调研中",
    tone: "success",
    dot: "running",
    icon: LYL_ICON_MAP.research,
  },
  waiting_user: {
    label: "待用户裁决",
    tone: "warning",
    dot: "waiting",
    icon: LYL_ICON_MAP.waitingUser,
  },
  counsel_ready: {
    label: "已形成建议",
    tone: "success",
    dot: "success",
    icon: LYL_ICON_MAP.counselReady,
  },
  adopted: {
    label: "已采纳",
    tone: "success",
    dot: "success",
    icon: LYL_ICON_MAP.adopted,
  },
  rejected: {
    label: "未采纳",
    tone: "error",
    dot: "danger",
    icon: LYL_ICON_MAP.rejected,
  },
  review_due: {
    label: "待复盘",
    tone: "warning",
    dot: "warning",
    icon: LYL_ICON_MAP.reviewDue,
  },
  reviewed: {
    label: "已复盘",
    tone: "neutral",
    dot: "neutral",
    icon: LYL_ICON_MAP.archived,
  },
  failed: {
    label: "处理失败",
    tone: "error",
    dot: "failed",
    icon: LYL_ICON_MAP.error,
  },
} as const satisfies Record<
  IssueStatus,
  {
    label: string;
    tone: StatusTone;
    dot: StatusDotStatus;
    icon: typeof LYL_ICON_MAP.ask;
  }
>;

export function IssueStatusBadge({
  status,
  className,
}: {
  status: IssueStatus;
  className?: string;
}) {
  const meta = ISSUE_STATUS_META[status];
  const Icon = meta.icon;

  return (
    <StatusBadge
      tone={meta.tone}
      className={cn("cos-issue-status-badge", className)}
      icon={
        <Icon
          size={14}
          className={
            status === "analyzing" ? "cos-business-spinner" : undefined
          }
          aria-hidden="true"
        />
      }
    >
      {meta.label}
    </StatusBadge>
  );
}

export interface IssueListItemProps {
  actions?: ReactNode;
  className?: string;
  disabled?: boolean;
  id: string;
  mode: CounselMode;
  onSelect(id: string): void;
  selected?: boolean;
  status: IssueStatus;
  title: string;
  unreadCount?: number;
  updatedAt: string;
  updatedLabel?: string;
}

export function IssueListItem({
  actions,
  className,
  disabled = false,
  id,
  mode,
  onSelect,
  selected = false,
  status,
  title,
  unreadCount,
  updatedAt,
  updatedLabel = updatedAt,
}: IssueListItemProps) {
  const statusMeta = ISSUE_STATUS_META[status];
  const ModeIcon =
    mode === "discuss" ? LYL_ICON_MAP.allIssues : MODE_ICONS[mode];

  return (
    <div
      className={cn("cos-issue-list-item", className)}
      data-selected={selected || undefined}
      data-disabled={disabled || undefined}
    >
      <button
        type="button"
        className="cos-issue-list-item__button"
        aria-current={selected ? "page" : undefined}
        title={title}
        disabled={disabled}
        onClick={() => onSelect(id)}
      >
        <StatusDot
          status={statusMeta.dot}
          label={statusMeta.label}
        />
        <span className="cos-issue-list-item__body">
          <span className="cos-issue-list-item__title">{title}</span>
          <span className="cos-issue-list-item__meta">
            <ModeIcon
              size={14}
              aria-hidden="true"
            />
            <span>{getCounselMode(mode).shortLabel}</span>
            <span aria-hidden="true">·</span>
            <IssueStatusBadge status={status} />
          </span>
        </span>
        <span className="cos-issue-list-item__aside">
          {unreadCount ? <CountBadge>{unreadCount}</CountBadge> : null}
          <time dateTime={updatedAt}>{updatedLabel}</time>
        </span>
      </button>
      {actions && <div className="cos-issue-list-item__actions">{actions}</div>}
    </div>
  );
}

export interface IssueTopbarProps {
  actions?: ReactNode;
  className?: string;
  leadingAction?: ReactNode;
  mode: CounselMode;
  status: IssueStatus;
  title: string;
  updatedAt?: string;
  updatedLabel?: string;
}

export function IssueTopbar({
  actions,
  className,
  leadingAction,
  mode,
  status,
  title,
  updatedAt,
  updatedLabel = updatedAt,
}: IssueTopbarProps) {
  const ModeIcon =
    mode === "discuss" ? LYL_ICON_MAP.allIssues : MODE_ICONS[mode];

  return (
    <header className={cn("cos-issue-topbar", className)}>
      <GlassClear className="cos-issue-topbar__surface">
        <div className="cos-issue-topbar__leading">
          {leadingAction}
          <span className="cos-issue-topbar__mode-icon">
            <ModeIcon
              size={20}
              aria-hidden="true"
            />
          </span>
          <div className="cos-issue-topbar__title-block">
            <h1>{title}</h1>
            <div className="cos-issue-topbar__meta">
              <span>{getCounselMode(mode).label}</span>
              <IssueStatusBadge status={status} />
              {updatedAt && <time dateTime={updatedAt}>{updatedLabel}</time>}
            </div>
          </div>
        </div>
        {actions && <div className="cos-issue-topbar__actions">{actions}</div>}
      </GlassClear>
    </header>
  );
}

export interface IssueComposerProps {
  ariaLabel?: string;
  attachmentPreviews?: ReactNode;
  attachmentSlot?: ReactNode;
  canSubmit?: boolean;
  className?: string;
  controlsSlot?: ReactNode;
  disabled?: boolean;
  error?: string;
  maxLength?: number;
  mode?: CounselMode;
  onChange(value: string): void;
  onPaste?: ClipboardEventHandler<HTMLTextAreaElement>;
  onStop?(): void;
  onSubmit(): void;
  placeholder?: string;
  sendSlot?: ReactNode;
  statusSlot?: ReactNode;
  stopSlot?: ReactNode;
  streaming?: boolean;
  value: string;
}

export function IssueComposer({
  ariaLabel = "议题输入",
  attachmentPreviews,
  attachmentSlot,
  canSubmit,
  className,
  controlsSlot,
  disabled = false,
  error,
  maxLength,
  mode = "discuss",
  onChange,
  onPaste,
  onStop,
  onSubmit,
  placeholder = getCounselMode(mode).placeholder,
  sendSlot,
  statusSlot,
  stopSlot,
  streaming = false,
  value,
}: IssueComposerProps) {
  const errorId = useId();
  const submitEnabled = canSubmit ?? value.trim().length > 0;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (disabled || streaming || !submitEnabled) return;
    onSubmit();
  };

  const defaultSend = (
    <IconButton
      type="submit"
      variant="primary"
      label="发送议题"
      disabled={disabled || !submitEnabled}
    >
      <LYL_ICON_MAP.send
        size={18}
        aria-hidden="true"
      />
    </IconButton>
  );
  const defaultStop = (
    <IconButton
      type="button"
      variant="secondary"
      label="停止生成"
      disabled={disabled || !onStop}
      onClick={onStop}
    >
      <LYL_ICON_MAP.stop
        size={18}
        weight="fill"
        aria-hidden="true"
      />
    </IconButton>
  );

  return (
    <GlassRegular
      className={cn("cos-issue-composer", className)}
      data-streaming={streaming || undefined}
    >
      <form onSubmit={handleSubmit}>
        {attachmentPreviews && (
          <div className="cos-issue-composer__attachments">
            {attachmentPreviews}
          </div>
        )}
        <Textarea
          value={value}
          aria-label={ariaLabel}
          aria-describedby={error ? errorId : undefined}
          aria-invalid={Boolean(error)}
          disabled={disabled}
          maxLength={maxLength}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          onPaste={onPaste}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !event.metaKey &&
              !event.ctrlKey &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          className="cos-issue-composer__input"
        />
        {error && (
          <p
            id={errorId}
            className="cos-issue-composer__error"
            role="alert"
          >
            <LYL_ICON_MAP.error
              size={15}
              aria-hidden="true"
            />
            {error}
          </p>
        )}
        <div className="cos-issue-composer__toolbar">
          <div className="cos-issue-composer__leading">
            <CategoryTag>{getCounselMode(mode).shortLabel}</CategoryTag>
            {attachmentSlot}
            {controlsSlot}
          </div>
          <div className="cos-issue-composer__trailing">
            {statusSlot}
            {streaming
              ? stopSlot === undefined
                ? defaultStop
                : stopSlot
              : sendSlot === undefined
                ? defaultSend
                : sendSlot}
          </div>
        </div>
      </form>
    </GlassRegular>
  );
}

export type CounselMessageRole = "assistant" | "user" | "system" | "error";

export function CounselMessageRenderer({
  actions,
  children,
  className,
  label,
  messageRole = "assistant",
  streaming = false,
}: {
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  label?: string;
  messageRole?: CounselMessageRole;
  streaming?: boolean;
}) {
  const meta = {
    assistant: { label: "LYL 参谋", icon: LYL_ICON_MAP.counsel },
    user: { label: "你", icon: LYL_ICON_MAP.user },
    system: { label: "系统信息", icon: LYL_ICON_MAP.context },
    error: { label: "处理失败", icon: LYL_ICON_MAP.error },
  }[messageRole];
  const Icon = meta.icon;

  return (
    <article
      className={cn("cos-counsel-message", className)}
      data-role={messageRole}
      aria-live={streaming ? "polite" : undefined}
      aria-busy={streaming || undefined}
    >
      <div className="cos-counsel-message__heading">
        <Icon
          size={17}
          aria-hidden="true"
        />
        <span>{label ?? meta.label}</span>
        {streaming && (
          <StatusDot
            status="running"
            label="正在形成建议"
            showLabel
          />
        )}
      </div>
      <ContentSurface
        raised={messageRole === "user"}
        className="cos-counsel-message__body"
      >
        {children}
      </ContentSurface>
      {actions && <div className="cos-counsel-message__actions">{actions}</div>}
    </article>
  );
}

export type ActivityState = ProgressItem["state"];

const ACTIVITY_STATUS: Record<
  ActivityState,
  { label: string; dot: StatusDotStatus }
> = {
  pending: { label: "等待中", dot: "neutral" },
  running: { label: "进行中", dot: "running" },
  complete: { label: "已完成", dot: "success" },
  failed: { label: "失败", dot: "failed" },
  waiting_user: { label: "等待用户", dot: "waiting" },
};

export function ToolActivity({
  children,
  className,
  defaultExpanded = false,
  detail,
  expanded,
  onExpandedChange,
  status,
  summary,
  tool,
}: {
  children?: ReactNode;
  className?: string;
  defaultExpanded?: boolean;
  detail?: ReactNode;
  expanded?: boolean;
  onExpandedChange?(expanded: boolean): void;
  status: ActivityState;
  summary: string;
  tool: string;
}) {
  const panelId = useId();
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const isExpanded = expanded ?? internalExpanded;
  const expandable = Boolean(detail || children);
  const statusMeta = ACTIVITY_STATUS[status];

  const setExpanded = (next: boolean) => {
    if (expanded === undefined) setInternalExpanded(next);
    onExpandedChange?.(next);
  };

  return (
    <ContentSurface
      raised
      className={cn("cos-tool-activity", className)}
      aria-live={status === "running" ? "polite" : undefined}
    >
      <button
        type="button"
        className="cos-tool-activity__trigger"
        aria-controls={expandable ? panelId : undefined}
        aria-expanded={expandable ? isExpanded : undefined}
        disabled={!expandable}
        onClick={() => setExpanded(!isExpanded)}
      >
        <span className="cos-tool-activity__icon">
          <LYL_ICON_MAP.researchProcess
            size={18}
            aria-hidden="true"
          />
        </span>
        <span className="cos-tool-activity__copy">
          <strong>{summary}</strong>
          <small>{tool}</small>
        </span>
        <StatusDot
          status={statusMeta.dot}
          label={statusMeta.label}
          showLabel
        />
        {expandable && (
          <CaretDown
            size={16}
            className="cos-tool-activity__caret"
            data-expanded={isExpanded || undefined}
            aria-hidden="true"
          />
        )}
      </button>
      {expandable && (
        <div
          id={panelId}
          className="cos-tool-activity__detail"
          hidden={!isExpanded}
        >
          {detail}
          {children}
        </div>
      )}
    </ContentSurface>
  );
}

export type StageProgressItem = ProgressItem;

const STAGE_STATUS_LABELS: Record<ActivityState, string> = {
  pending: "等待中",
  running: "进行中",
  complete: "已完成",
  failed: "失败",
  waiting_user: "等待用户",
};

export function StageProgress({
  items,
  label = "议题处理进度",
  className,
}: {
  items: StageProgressItem[];
  label?: string;
  className?: string;
}) {
  return (
    <ol
      className={cn("cos-stage-progress", className)}
      aria-label={label}
    >
      {items.map((item) => {
        const statusMeta = ACTIVITY_STATUS[item.state];
        return (
          <li
            key={item.id}
            className="cos-stage-progress__item"
            data-state={item.state}
            aria-current={item.state === "running" ? "step" : undefined}
          >
            <StatusDot
              status={statusMeta.dot}
              label={STAGE_STATUS_LABELS[item.state]}
            />
            <strong>{item.label}</strong>
            <span className="cos-stage-progress__state">
              {STAGE_STATUS_LABELS[item.state]}
            </span>
            {item.detail && <small>{item.detail}</small>}
          </li>
        );
      })}
    </ol>
  );
}

export interface DecisionOption {
  cost?: string;
  description?: string;
  id: string;
  recommended?: boolean;
  title: string;
}

export interface DecisionInterruptCardProps {
  allowReportNow?: boolean;
  className?: string;
  disabled?: boolean;
  interruptId: string;
  onCancel?(): void;
  onConfirm(optionId: string): void;
  onReportNow?(): void;
  onSelect(optionId: string): void;
  options: DecisionOption[];
  question: string;
  rationale?: string;
  selectedOptionId?: string;
  submitting?: boolean;
  title: string;
}

export function DecisionInterruptCard({
  allowReportNow = false,
  className,
  disabled = false,
  interruptId,
  onCancel,
  onConfirm,
  onReportNow,
  onSelect,
  options,
  question,
  rationale,
  selectedOptionId,
  submitting = false,
  title,
}: DecisionInterruptCardProps) {
  const titleId = useId();
  const questionId = useId();

  const handleOptionKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    if (options.length === 0) return;
    if (
      ![
        "ArrowDown",
        "ArrowRight",
        "ArrowUp",
        "ArrowLeft",
        "Home",
        "End",
      ].includes(event.key)
    ) {
      return;
    }
    event.preventDefault();
    const nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? options.length - 1
          : (index +
              (event.key === "ArrowDown" || event.key === "ArrowRight"
                ? 1
                : -1) +
              options.length) %
            options.length;
    onSelect(options[nextIndex].id);
    const optionButtons =
      event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
        '[role="radio"]',
      );
    optionButtons?.[nextIndex]?.focus();
  };

  return (
    <section
      id={interruptId}
      className={cn("cos-decision-interrupt", className)}
      role="alert"
      aria-labelledby={titleId}
      aria-busy={submitting || undefined}
    >
      <GlassThick className="cos-decision-interrupt__surface">
        <div className="cos-decision-interrupt__header">
          <StatusBadge tone="warning">需要你裁决</StatusBadge>
          <h2 id={titleId}>{title}</h2>
          {rationale && <p>{rationale}</p>}
        </div>
        <fieldset disabled={disabled || submitting}>
          <legend id={questionId}>{question}</legend>
          <div
            className="cos-decision-interrupt__options"
            role="radiogroup"
            aria-labelledby={questionId}
          >
            {options.map((option, index) => {
              const selected = option.id === selectedOptionId;
              const descriptionId = option.description
                ? `${questionId}-option-${index}-description`
                : undefined;
              const costId = option.cost
                ? `${questionId}-option-${index}-cost`
                : undefined;
              const describedBy =
                [descriptionId, costId].filter(Boolean).join(" ") || undefined;

              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  className="cos-decision-interrupt__option"
                  data-selected={selected || undefined}
                  aria-checked={selected}
                  aria-describedby={describedBy}
                  tabIndex={
                    selected || (!selectedOptionId && index === 0) ? 0 : -1
                  }
                  onClick={() => onSelect(option.id)}
                  onKeyDown={(event) => handleOptionKeyDown(event, index)}
                >
                  <span className="cos-decision-interrupt__option-title">
                    <strong>{option.title}</strong>
                    {option.recommended && (
                      <StatusBadge tone="success">参谋推荐</StatusBadge>
                    )}
                  </span>
                  {option.description && (
                    <span id={descriptionId}>{option.description}</span>
                  )}
                  {option.cost && (
                    <small id={costId}>
                      <LYL_ICON_MAP.warning
                        size={14}
                        aria-hidden="true"
                      />
                      关键代价：{option.cost}
                    </small>
                  )}
                </button>
              );
            })}
          </div>
        </fieldset>
        <div className="cos-decision-interrupt__actions">
          {onCancel && (
            <Button
              variant="ghost"
              disabled={disabled || submitting}
              onClick={onCancel}
            >
              取消
            </Button>
          )}
          {allowReportNow && onReportNow && (
            <Button
              variant="secondary"
              disabled={disabled || submitting}
              onClick={onReportNow}
            >
              按现有信息汇报
            </Button>
          )}
          <Button
            variant="primary"
            loading={submitting}
            disabled={disabled || !selectedOptionId}
            onClick={() => selectedOptionId && onConfirm(selectedOptionId)}
          >
            确认选择
          </Button>
        </div>
      </GlassThick>
    </section>
  );
}

export function ConfidenceMeter({
  value,
  label = "置信度",
  className,
  showValue = true,
}: {
  value: number;
  label?: string;
  className?: string;
  showValue?: boolean;
}) {
  const normalizedValue = Math.min(100, Math.max(0, Math.round(value)));

  return (
    <div
      className={cn("cos-confidence-meter", className)}
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={normalizedValue}
      aria-valuetext={`${normalizedValue}%`}
    >
      <div className="cos-confidence-meter__label">
        <span>{label}</span>
        {showValue && <strong>{normalizedValue}%</strong>}
      </div>
      <span
        className="cos-confidence-meter__track"
        aria-hidden="true"
      >
        <span style={{ width: `${normalizedValue}%` }} />
      </span>
    </div>
  );
}

export interface CounselSummary {
  changeConditions: string[];
  confidence?: number;
  currentStage: string;
  deferItems: string[];
  mainContradiction: string;
  recommendation: string;
}

export function CounselSummaryCard({
  actions,
  changeConditions,
  className,
  confidence,
  currentStage,
  deferItems,
  mainContradiction,
  recommendation,
}: CounselSummary & { actions?: ReactNode; className?: string }) {
  return (
    <ContentSurface
      raised
      className={cn("cos-counsel-summary", className)}
    >
      <header>
        <h2 className="cos-business-eyebrow">参谋结论</h2>
        <StatusBadge tone="info">{currentStage}</StatusBadge>
      </header>
      <section>
        <h3>主要矛盾</h3>
        <p>{mainContradiction}</p>
      </section>
      <section className="cos-counsel-summary__recommendation">
        <h3>明确建议</h3>
        <p>{recommendation}</p>
      </section>
      {confidence !== undefined && <ConfidenceMeter value={confidence} />}
      <SummaryList
        title="改判条件"
        items={changeConditions}
      />
      <SummaryList
        title="暂缓事项"
        items={deferItems}
        emptyText="无"
      />
      {actions && <footer>{actions}</footer>}
    </ContentSurface>
  );
}

function SummaryList({
  title,
  items,
  emptyText = "暂无",
}: {
  title: string;
  items: string[];
  emptyText?: string;
}) {
  return (
    <section>
      <h3>{title}</h3>
      {items.length ? (
        <ul>
          {items.map((item, index) => (
            <li key={`${item}-${index}`}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="cos-business-empty">{emptyText}</p>
      )}
    </section>
  );
}

export type EvidenceRelation = "support" | "oppose" | "limit" | "context";

const EVIDENCE_RELATION_META = {
  support: {
    label: "支持",
    tone: "success",
    icon: LYL_ICON_MAP.support,
  },
  oppose: { label: "反对", tone: "error", icon: LYL_ICON_MAP.oppose },
  limit: { label: "限制", tone: "warning", icon: LYL_ICON_MAP.limit },
  context: { label: "背景", tone: "info", icon: LYL_ICON_MAP.context },
} as const satisfies Record<
  EvidenceRelation,
  { label: string; tone: StatusTone; icon: typeof LYL_ICON_MAP.ask }
>;

export interface EvidenceItem {
  freshness: "high" | "medium" | "low";
  id: string;
  publishedAt?: string;
  relation: EvidenceRelation;
  relevance: "high" | "medium" | "low";
  sourceName: string;
  sourceUrl?: string;
  summary: string;
  title: string;
}

const LEVEL_LABELS = { high: "高", medium: "中", low: "低" } as const;

export function EvidenceCard({
  className,
  freshness,
  publishedAt,
  relation,
  relevance,
  sourceName,
  sourceUrl,
  summary,
  title,
}: EvidenceItem & { className?: string }) {
  const relationMeta = EVIDENCE_RELATION_META[relation];
  const RelationIcon = relationMeta.icon;

  return (
    <ContentSurface
      raised
      className={cn("cos-evidence-card", className)}
    >
      <header>
        <StatusBadge
          tone={relationMeta.tone}
          icon={
            <RelationIcon
              size={14}
              aria-hidden="true"
            />
          }
        >
          {relationMeta.label}
        </StatusBadge>
        <div className="cos-evidence-card__levels">
          <CategoryTag>相关性 {LEVEL_LABELS[relevance]}</CategoryTag>
          <CategoryTag>时效性 {LEVEL_LABELS[freshness]}</CategoryTag>
        </div>
      </header>
      <h3>{title}</h3>
      <p>{summary}</p>
      <footer>
        <div>
          <strong>{sourceName}</strong>
          {publishedAt && <time dateTime={publishedAt}>{publishedAt}</time>}
        </div>
        {sourceUrl && (
          <GlassClear className="cos-evidence-card__source-control">
            <a
              href={sourceUrl}
              target="_blank"
              rel="noreferrer"
            >
              查看原文
              <LYL_ICON_MAP.externalLink
                size={15}
                aria-hidden="true"
              />
            </a>
          </GlassClear>
        )}
      </footer>
    </ContentSurface>
  );
}

export interface ContextReference {
  capturedAt?: string;
  confidence?: number;
  id: string;
  sourceName: string;
  summary: string;
  title: string;
}

export function ContextReferenceCard({
  capturedAt,
  className,
  confidence,
  sourceName,
  summary,
  title,
}: ContextReference & { className?: string }) {
  return (
    <ContentSurface
      raised
      className={cn("cos-context-reference", className)}
    >
      <header>
        <span className="cos-context-reference__icon">
          <LYL_ICON_MAP.history
            size={18}
            aria-hidden="true"
          />
        </span>
        <div>
          <span className="cos-business-eyebrow">历史依据</span>
          <h3>{title}</h3>
        </div>
      </header>
      <p>{summary}</p>
      <footer>
        <span>{sourceName}</span>
        {capturedAt && <time dateTime={capturedAt}>{capturedAt}</time>}
      </footer>
      {confidence !== undefined && (
        <ConfidenceMeter
          value={confidence}
          label="上下文可信度"
        />
      )}
    </ContentSurface>
  );
}

export interface ResearchPlan {
  angles: string[];
  stopConditions: string[];
  title?: string;
  unknowns: string[];
}

export function ResearchPlanCard({
  angles,
  className,
  status = "draft",
  stopConditions,
  title = "调研计划",
  unknowns,
}: ResearchPlan & {
  className?: string;
  status?: "draft" | "running" | "complete";
}) {
  const statusMeta = {
    draft: { label: "待开始", tone: "neutral" },
    running: { label: "调研中", tone: "success" },
    complete: { label: "已完成", tone: "success" },
  } as const satisfies Record<
    "draft" | "running" | "complete",
    { label: string; tone: StatusTone }
  >;

  return (
    <ContentSurface
      raised
      className={cn("cos-research-plan", className)}
    >
      <header>
        <span className="cos-research-plan__icon">
          <LYL_ICON_MAP.researchProcess
            size={19}
            aria-hidden="true"
          />
        </span>
        <h3>{title}</h3>
        <StatusBadge tone={statusMeta[status].tone}>
          {statusMeta[status].label}
        </StatusBadge>
      </header>
      <ResearchList
        title="关键未知"
        items={unknowns}
      />
      <ResearchList
        title="调研角度"
        items={angles}
      />
      <ResearchList
        title="停止条件"
        items={stopConditions}
      />
    </ContentSurface>
  );
}

function ResearchList({ title, items }: { title: string; items: string[] }) {
  return (
    <section>
      <h4>{title}</h4>
      {items.length ? (
        <ul>
          {items.map((item, index) => (
            <li key={`${item}-${index}`}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="cos-business-empty">暂无</p>
      )}
    </section>
  );
}

export type MaterialTabId = "counsel" | "evidence" | "history" | "research";

const MATERIAL_TAB_META = {
  counsel: { label: "参谋结论", icon: LYL_ICON_MAP.counsel },
  evidence: { label: "关键证据", icon: LYL_ICON_MAP.evidence },
  history: { label: "历史依据", icon: LYL_ICON_MAP.history },
  research: { label: "调研过程", icon: LYL_ICON_MAP.researchProcess },
} satisfies Record<
  MaterialTabId,
  { label: string; icon: typeof LYL_ICON_MAP.ask }
>;

export function MaterialTabs({
  activeTab,
  className,
  counts,
  disabledTabs = [],
  onTabChange,
  panels,
}: {
  activeTab: MaterialTabId;
  className?: string;
  counts?: Partial<Record<MaterialTabId, number>>;
  disabledTabs?: MaterialTabId[];
  onTabChange(tab: MaterialTabId): void;
  panels: Partial<Record<MaterialTabId, ReactNode>>;
}) {
  const items = (Object.keys(MATERIAL_TAB_META) as MaterialTabId[]).map(
    (id) => {
      const meta = MATERIAL_TAB_META[id];
      const Icon = meta.icon;
      return {
        id,
        label: meta.label,
        icon: (
          <Icon
            size={16}
            aria-hidden="true"
          />
        ),
        badge:
          counts?.[id] !== undefined ? (
            <CountBadge>{counts[id]}</CountBadge>
          ) : undefined,
        disabled: disabledTabs.includes(id),
        panel: panels[id] ?? (
          <p className="cos-material-tabs__empty">暂无{meta.label}</p>
        ),
      };
    },
  );

  return (
    <Tabs
      value={activeTab}
      onValueChange={onTabChange}
      items={items}
      label="参谋材料"
      className={cn("cos-material-tabs", className)}
    />
  );
}
