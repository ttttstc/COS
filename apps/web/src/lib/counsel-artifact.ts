import type { CounselRecord } from "./counsel-state";

export type CounselArtifactType =
  "next_action" | "decision" | "research" | "diagnosis";
export type CounselArtifactStatus = "draft" | "final" | "superseded";

export interface CounselArtifactView {
  artifactType: CounselArtifactType;
  changeConditions: string[];
  changeReason?: string;
  confidence: number;
  counsel: CounselRecord;
  currentStage: string;
  deferItems: string[];
  evidence: CounselRecord[];
  history: CounselRecord[];
  mainContradiction: string;
  process?: CounselRecord;
  recommendation: string;
  status: CounselArtifactStatus;
  title: string;
  version: number;
}

export type CounselArtifactParseResult =
  | { artifact: CounselArtifactView; error?: never }
  | { artifact?: never; error: string };

function isRecord(value: unknown): value is CounselRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(record: CounselRecord, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function strings(record: CounselRecord, key: string): string[] | undefined {
  const value = record[key];
  if (
    !Array.isArray(value) ||
    !value.every((item) => typeof item === "string")
  ) {
    return undefined;
  }
  return value.map((item) => item.trim()).filter(Boolean);
}

function records(value: unknown): CounselRecord[] | undefined {
  return Array.isArray(value) && value.every(isRecord) ? value : undefined;
}

function confidence(record: CounselRecord): number | undefined {
  const value = record.confidence;
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 100
    ? value
    : undefined;
}

function normalizeCounsel(
  artifactType: CounselArtifactType,
  counsel: CounselRecord,
):
  | Pick<
      CounselArtifactView,
      | "changeConditions"
      | "confidence"
      | "currentStage"
      | "deferItems"
      | "mainContradiction"
      | "recommendation"
    >
  | undefined {
  const mainContradiction = text(counsel, "main_contradiction");
  const parsedConfidence = confidence(counsel);
  const changeConditions = strings(counsel, "reconsider_when");
  if (
    !mainContradiction ||
    parsedConfidence === undefined ||
    !changeConditions
  ) {
    return undefined;
  }

  if (artifactType === "next_action") {
    const recommendation =
      text(counsel, "action_description") ?? text(counsel, "action_title");
    if (!recommendation) return undefined;
    return {
      mainContradiction,
      recommendation,
      confidence: parsedConfidence,
      changeConditions,
      currentStage: text(counsel, "current_stage") ?? "形成建议",
      deferItems: strings(counsel, "pause_or_stop") ?? [],
    };
  }
  if (artifactType === "decision") {
    const recommendation = text(counsel, "recommendation_reason");
    if (!recommendation) return undefined;
    return {
      mainContradiction,
      recommendation,
      confidence: parsedConfidence,
      changeConditions,
      currentStage: "形成决策建议",
      deferItems: [],
    };
  }
  if (artifactType === "research") {
    const recommendation = text(counsel, "recommendation");
    if (!recommendation) return undefined;
    return {
      mainContradiction,
      recommendation,
      confidence: parsedConfidence,
      changeConditions,
      currentStage: text(counsel, "current_stage") ?? "形成调研判断",
      deferItems: [],
    };
  }
  const recommendation = text(counsel, "suggested_rule");
  if (!recommendation) return undefined;
  return {
    mainContradiction,
    recommendation,
    confidence: parsedConfidence,
    changeConditions,
    currentStage: "形成诊断建议",
    deferItems: strings(counsel, "limitations") ?? [],
  };
}

export function parseCounselArtifact(
  value: unknown,
): CounselArtifactParseResult {
  if (!isRecord(value)) return { error: "Artifact 不是对象" };
  const artifactType = value.artifact_type;
  const status = value.status;
  const title = typeof value.title === "string" ? value.title.trim() : "";
  const version = value.version;
  if (
    (artifactType !== "next_action" &&
      artifactType !== "decision" &&
      artifactType !== "research" &&
      artifactType !== "diagnosis") ||
    (status !== "draft" && status !== "final" && status !== "superseded") ||
    !title ||
    typeof version !== "number" ||
    !Number.isInteger(version) ||
    version < 1 ||
    !isRecord(value.tabs) ||
    !isRecord(value.tabs.counsel)
  ) {
    return { error: "Artifact 顶层 Schema 无效" };
  }

  const normalized = normalizeCounsel(artifactType, value.tabs.counsel);
  if (!normalized) return { error: `${artifactType} 建议卡 Schema 无效` };
  const evidence = records(value.tabs.evidence) ?? [];
  const history = records(value.tabs.history) ?? [];
  const process = isRecord(value.tabs.process) ? value.tabs.process : undefined;
  const changeReason =
    typeof value.change_reason === "string" && value.change_reason.trim()
      ? value.change_reason.trim()
      : undefined;

  return {
    artifact: {
      artifactType,
      status,
      title,
      version,
      counsel: value.tabs.counsel,
      evidence,
      history,
      ...(process ? { process } : {}),
      ...(changeReason ? { changeReason } : {}),
      ...normalized,
    },
  };
}

export function parseCounselArtifactVersions(
  value: unknown,
): CounselArtifactView[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const result = parseCounselArtifact(item);
    return result.artifact ? [result.artifact] : [];
  });
}
