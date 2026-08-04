import type { Message } from "@langchain/langgraph-sdk";
import type { UIMessage } from "@langchain/langgraph-sdk/react-ui";
import {
  isCounselSurfaceMode,
  type CounselSession,
  type CounselSessionStatus,
} from "./counsel-contract";

export type CounselRecord = Record<string, unknown>;

export type CounselStageStatus =
  "pending" | "running" | "completed" | "blocked" | "skipped";

export interface CounselStage {
  id: string;
  title: string;
  status: CounselStageStatus;
  summary?: string;
}

// 当前前端仅消费 SPEC §13 子集；其余字段待后续 issue 接入（memory_proposals / decision_record_id / feedback / needs_clarification）
export interface CounselState {
  messages: Message[];
  ui?: UIMessage[];
  stages?: CounselStage[];
  current_stage?: string;
  main_contradiction?: string;
  recommendation?: CounselRecord;
  confidence?: number;
  reconsider_when?: string[];
  evidence?: CounselRecord[];
  research_plan?: CounselRecord;
  context_snapshot?: CounselRecord;
  historical_patterns?: CounselRecord[];
  artifact?: CounselRecord;
  artifact_versions?: CounselRecord[];
  counsel_session?: CounselSession;
  error?: string;
}

export type StageProgressState =
  "pending" | "running" | "complete" | "failed" | "waiting_user";

export interface StageProgressItem {
  id: string;
  label: string;
  state: StageProgressState;
  detail?: string;
}

export type MaterialTabId = "counsel" | "evidence" | "history" | "research";

export interface CounselMaterial {
  currentStage?: string;
  mainContradiction?: string;
  recommendation?: CounselRecord;
  confidence?: number;
  changeConditions: string[];
  artifact?: CounselRecord;
  error?: string;
}

export interface HistoryMaterial {
  contextSnapshot?: CounselRecord;
  patterns: CounselRecord[];
}

export type MaterialTab =
  | MaterialTabBase<"counsel", CounselMaterial>
  | MaterialTabBase<"evidence", CounselRecord[]>
  | MaterialTabBase<"history", HistoryMaterial>
  | MaterialTabBase<"research", CounselRecord | undefined>;

interface MaterialTabBase<Id extends MaterialTabId, Content> {
  id: Id;
  label: string;
  content: Content;
  empty: boolean;
  emptyText: string;
}

const STAGE_STATES: Record<CounselStageStatus, StageProgressState> = {
  pending: "pending",
  running: "running",
  completed: "complete",
  blocked: "waiting_user",
  skipped: "complete",
};

function isRecord(value: unknown): value is CounselRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasEntries(value: CounselRecord | undefined): value is CounselRecord {
  return !!value && Object.keys(value).length > 0;
}

function readString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized || undefined;
}

function readStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.flatMap((item) => {
    const parsed = readString(item);
    return parsed ? [parsed] : [];
  });
}

function readRecordArray(value: unknown): CounselRecord[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter(isRecord);
}

function readCounselSession(value: unknown): CounselSession | undefined {
  if (!isRecord(value)) return undefined;
  const issueId = readString(value.issue_id);
  const subject = readString(value.subject);
  const userIntent = readString(value.user_intent);
  const activeMode = value.active_mode;
  const status = value.status;
  if (
    !issueId ||
    !subject ||
    userIntent === undefined ||
    !isCounselSurfaceMode(activeMode) ||
    (status !== "active" &&
      status !== "awaiting_user" &&
      status !== "researching" &&
      status !== "ready" &&
      status !== "completed" &&
      status !== "paused" &&
      status !== "superseded")
  ) {
    return undefined;
  }

  const previousModes = Array.isArray(value.previous_modes)
    ? value.previous_modes.filter(isCounselSurfaceMode)
    : [];
  const records = (key: string) => readRecordArray(value[key]) ?? [];
  const nullableRecord = (key: string) =>
    value[key] === null || value[key] === undefined || isRecord(value[key])
      ? ((value[key] as CounselRecord | null | undefined) ?? null)
      : null;
  const currentStage = readString(value.current_stage) ?? "intake";
  const desiredOutcome = readString(value.desired_outcome) ?? "";

  return {
    issue_id: issueId,
    subject,
    user_intent: userIntent,
    desired_outcome: desiredOutcome,
    active_mode: activeMode,
    previous_modes: previousModes,
    current_stage: currentStage,
    status: status as CounselSessionStatus,
    context_snapshot_id:
      typeof value.context_snapshot_id === "string"
        ? value.context_snapshot_id
        : null,
    active_artifact_id:
      typeof value.active_artifact_id === "string"
        ? value.active_artifact_id
        : null,
    active_decision_record_id:
      typeof value.active_decision_record_id === "string"
        ? value.active_decision_record_id
        : null,
    facts: records("facts"),
    assumptions: records("assumptions"),
    unknowns: records("unknowns"),
    user_commitments: records("user_commitments"),
    pending_interrupt: nullableRecord("pending_interrupt"),
    handoff_reason:
      typeof value.handoff_reason === "string" ? value.handoff_reason : null,
    review_trigger: nullableRecord("review_trigger"),
  };
}

function isMessage(value: unknown): value is Message {
  return (
    isRecord(value) &&
    (value.type === "human" ||
      value.type === "ai" ||
      value.type === "tool" ||
      value.type === "system" ||
      value.type === "function" ||
      value.type === "remove") &&
    (typeof value.content === "string" || Array.isArray(value.content))
  );
}

function isUiMessage(value: unknown): value is UIMessage {
  return (
    isRecord(value) &&
    value.type === "ui" &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    isRecord(value.props)
  );
}

function readStage(value: unknown): CounselStage | undefined {
  if (!isRecord(value)) return undefined;
  const id = readString(value.id);
  const title = readString(value.title);
  const status = value.status;
  if (
    !id ||
    !title ||
    (status !== "pending" &&
      status !== "running" &&
      status !== "completed" &&
      status !== "blocked" &&
      status !== "skipped")
  ) {
    return undefined;
  }

  const summary = readString(value.summary);
  return { id, title, status, ...(summary ? { summary } : {}) };
}

function readConfidence(value: unknown): number | undefined {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 100
    ? value
    : undefined;
}

export function parseCounselState(value: unknown): CounselState {
  if (!isRecord(value)) return { messages: [] };

  const messages = Array.isArray(value.messages)
    ? value.messages.filter(isMessage)
    : [];
  const ui = Array.isArray(value.ui) ? value.ui.filter(isUiMessage) : undefined;
  const stages = Array.isArray(value.stages)
    ? value.stages.flatMap((stage) => {
        const parsed = readStage(stage);
        return parsed ? [parsed] : [];
      })
    : undefined;
  const currentStage = readString(value.current_stage);
  const mainContradiction = readString(value.main_contradiction);
  const confidence = readConfidence(value.confidence);
  const reconsiderWhen = readStringArray(value.reconsider_when);
  const evidence = readRecordArray(value.evidence);
  const historicalPatterns = readRecordArray(value.historical_patterns);
  const error = readString(value.error);
  const artifactVersions = readRecordArray(value.artifact_versions);
  const counselSession = readCounselSession(value.counsel_session);

  return {
    messages,
    ...(ui ? { ui } : {}),
    ...(stages ? { stages } : {}),
    ...(currentStage ? { current_stage: currentStage } : {}),
    ...(mainContradiction ? { main_contradiction: mainContradiction } : {}),
    ...(isRecord(value.recommendation)
      ? { recommendation: value.recommendation }
      : {}),
    ...(confidence !== undefined ? { confidence } : {}),
    ...(reconsiderWhen ? { reconsider_when: reconsiderWhen } : {}),
    ...(evidence ? { evidence } : {}),
    ...(isRecord(value.research_plan)
      ? { research_plan: value.research_plan }
      : {}),
    ...(isRecord(value.context_snapshot)
      ? { context_snapshot: value.context_snapshot }
      : {}),
    ...(historicalPatterns ? { historical_patterns: historicalPatterns } : {}),
    ...(isRecord(value.artifact) ? { artifact: value.artifact } : {}),
    ...(artifactVersions ? { artifact_versions: artifactVersions } : {}),
    ...(counselSession ? { counsel_session: counselSession } : {}),
    ...(error ? { error } : {}),
  };
}

export function toStageProgress(value: unknown): StageProgressItem[] {
  const state = parseCounselState(value);
  return (state.stages ?? []).map((stage) => ({
    id: stage.id,
    label: stage.title,
    state:
      state.error && stage.id === state.current_stage
        ? "failed"
        : STAGE_STATES[stage.status],
    ...(stage.summary ? { detail: stage.summary } : {}),
  }));
}

export function toMaterialTabs(value: unknown): MaterialTab[] {
  const state = parseCounselState(value);
  const currentStage =
    state.stages?.find((stage) => stage.id === state.current_stage)?.title ??
    state.current_stage;
  const counsel: CounselMaterial = {
    ...(currentStage ? { currentStage } : {}),
    ...(state.main_contradiction
      ? { mainContradiction: state.main_contradiction }
      : {}),
    ...(hasEntries(state.recommendation)
      ? { recommendation: state.recommendation }
      : {}),
    ...(state.confidence !== undefined ? { confidence: state.confidence } : {}),
    changeConditions: state.reconsider_when ?? [],
    ...(hasEntries(state.artifact) ? { artifact: state.artifact } : {}),
    ...(state.error ? { error: state.error } : {}),
  };
  const evidence = (state.evidence ?? []).filter(hasEntries);
  const contextSnapshot = hasEntries(state.context_snapshot)
    ? state.context_snapshot
    : undefined;
  const history: HistoryMaterial = {
    ...(contextSnapshot ? { contextSnapshot } : {}),
    patterns: (state.historical_patterns ?? []).filter(hasEntries),
  };
  const research = hasEntries(state.research_plan)
    ? state.research_plan
    : undefined;

  return [
    {
      id: "counsel",
      label: "参谋结论",
      content: counsel,
      empty:
        !currentStage &&
        !state.main_contradiction &&
        !hasEntries(state.recommendation) &&
        state.confidence === undefined &&
        counsel.changeConditions.length === 0 &&
        !hasEntries(state.artifact) &&
        !state.error,
      emptyText: "尚未形成参谋结论",
    },
    {
      id: "evidence",
      label: "关键证据",
      content: evidence,
      empty: evidence.length === 0,
      emptyText: "尚未收集关键证据",
    },
    {
      id: "history",
      label: "历史依据",
      content: history,
      empty: !history.contextSnapshot && history.patterns.length === 0,
      emptyText: "暂无可用历史依据",
    },
    {
      id: "research",
      label: "调研过程",
      content: research,
      empty: !research,
      emptyText: "尚未生成调研过程",
    },
  ];
}
