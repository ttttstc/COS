export type CounselMode = "ask" | "decide" | "research" | "diagnose" | "discuss";

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

export type VisualState = "default" | "hover" | "focus" | "active" | "disabled" | "error" | "success";
export type GlassLevel = "clear" | "thin" | "regular" | "thick";
export type EvidenceRelation = "support" | "oppose" | "limit" | "context";
export type StageState = "pending" | "running" | "complete" | "failed" | "waiting_user";

export interface IssueSummary {
  id: string;
  title: string;
  mode: CounselMode;
  status: IssueStatus;
  updatedAt: string;
  unreadCount?: number;
}

export interface IssueModeCardProps {
  mode: Exclude<CounselMode, "discuss">;
  title: string;
  description: string;
  selected?: boolean;
  disabled?: boolean;
  onSelect(mode: CounselMode): void;
}

export interface StageProgressItem {
  id: string;
  label: string;
  state: StageState;
  detail?: string;
}

export interface DecisionOption {
  id: string;
  title: string;
  description?: string;
  cost?: string;
  recommended?: boolean;
}

export interface DecisionInterruptCardProps {
  interruptId: string;
  title: string;
  question: string;
  rationale?: string;
  options: DecisionOption[];
  selectedOptionId?: string;
  allowReportNow?: boolean;
  disabled?: boolean;
  onSelect(optionId: string): void;
  onConfirm(optionId: string): void;
  onReportNow?(): void;
  onCancel?(): void;
}

export interface CounselSummary {
  currentStage: string;
  mainContradiction: string;
  recommendation: string;
  confidence: number;
  changeConditions: string[];
  deferItems: string[];
}

export interface EvidenceItem {
  id: string;
  relation: EvidenceRelation;
  title: string;
  summary: string;
  sourceName: string;
  sourceUrl?: string;
  publishedAt?: string;
  relevance: "high" | "medium" | "low";
  freshness: "high" | "medium" | "low";
}

export interface MaterialPanelState {
  open: boolean;
  activeTab: "counsel" | "evidence" | "history" | "research";
  width: number;
}

export interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: string;
  shortcut?: string[];
  group: "recent" | "quick" | "suggested" | "navigation";
  disabled?: boolean;
}

export interface LylUiPreferences {
  sidebarCollapsed: boolean;
  materialPanel: MaterialPanelState;
  reducedMotion: boolean;
  density: "comfortable" | "compact";
}

/**
 * Only Phosphor Icons may be used for user-visible UI in Issue #20.
 * Import from `@phosphor-icons/react` and centralize icon choice here.
 */
export const LYL_ICON_MAP = {
  brand: "Cube",
  newIssue: "Plus",
  ask: "Signpost",
  decide: "Scales",
  research: "MagnifyingGlass",
  diagnose: "Waveform",
  allIssues: "ChatsCircle",
  activeIssues: "Activity",
  waitingUser: "UserFocus",
  counselReady: "SealCheck",
  adopted: "CheckSquareOffset",
  rejected: "XSquare",
  reviewDue: "ClockCounterClockwise",
  archived: "ArchiveBox",
  search: "MagnifyingGlass",
  filter: "Funnel",
  sort: "ArrowsDownUp",
  command: "Command",
  upload: "Paperclip",
  send: "ArrowUp",
  stop: "Stop",
  more: "DotsThree",
  close: "X",
  expand: "ArrowsOutSimple",
  collapse: "ArrowsInSimple",
  counsel: "Sparkle",
  evidence: "FileSearch",
  history: "ClockCounterClockwise",
  researchProcess: "ListChecks",
  support: "ArrowCircleUp",
  oppose: "ArrowCircleDown",
  limit: "WarningCircle",
  context: "Info",
  success: "CheckCircle",
  warning: "Warning",
  error: "WarningOctagon",
  externalLink: "ArrowSquareOut",
  settings: "Gear",
  user: "UserCircle",
  keyboard: "Keyboard",
} as const;

export type LylIconKey = keyof typeof LYL_ICON_MAP;
