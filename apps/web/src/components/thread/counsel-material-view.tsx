import {
  parseCounselArtifact,
  parseCounselArtifactVersions,
  type CounselArtifactView,
} from "@/lib/counsel-artifact";
import {
  CounselPanel,
  EvidencePanel,
  HistoryPanel,
  ResearchPanel,
} from "./counsel-material-panels";
import {
  parseCounselState,
  type CounselRecord,
  type CounselState,
} from "@/lib/counsel-state";

function text(record: CounselRecord | undefined, ...keys: string[]) {
  for (const key of keys) {
    const value = record?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function strings(record: CounselRecord | undefined, ...keys: string[]) {
  for (const key of keys) {
    const value = record?.[key];
    if (
      Array.isArray(value) &&
      value.some((item) => typeof item === "string")
    ) {
      return value.filter(
        (item): item is string => typeof item === "string" && !!item.trim(),
      );
    }
  }
  return [];
}

function getCounselMaterialCounts(
  state: CounselState,
  artifact?: CounselArtifactView,
) {
  const researchFields = [
    strings(state.research_plan, "unknowns", "key_unknowns"),
    strings(
      state.research_plan,
      "angles",
      "research_angles",
      "proposed_angles",
    ),
    strings(state.research_plan, "stop_conditions", "stopping_conditions"),
  ];
  const recommendationText = text(
    state.recommendation,
    "recommendation",
    "summary",
    "decision",
    "text",
  );
  return {
    counsel:
      state.main_contradiction ||
      recommendationText ||
      state.confidence !== undefined ||
      state.reconsider_when?.length ||
      artifact ||
      state.error
        ? 1
        : 0,
    evidence: artifact?.evidence.length ?? state.evidence?.length ?? 0,
    history:
      artifact?.history.length ??
      (state.context_snapshot ? 1 : 0) +
        (state.historical_patterns?.length ?? 0),
    research:
      artifact?.process || researchFields.some((items) => items.length > 0)
        ? 1
        : 0,
  };
}

export function createCounselMaterialView(
  value: unknown,
  selectedVersion?: number,
  onVersionChange?: (version?: number) => void,
) {
  const state = parseCounselState(value);
  const currentResult = state.artifact
    ? parseCounselArtifact(state.artifact)
    : undefined;
  const versions = parseCounselArtifactVersions(state.artifact_versions);
  const current = currentResult?.artifact;
  const selectableVersions =
    current &&
    !versions.some(
      (item) =>
        item.version === current.version && item.status === current.status,
    )
      ? [...versions, current]
      : versions;
  const artifact = selectedVersion
    ? selectableVersions.find((item) => item.version === selectedVersion)
    : current;
  return {
    counts: getCounselMaterialCounts(state, artifact),
    panels: {
      counsel: (
        <CounselPanel
          value={value}
          artifact={artifact}
          artifactError={currentResult?.error}
          versions={selectableVersions}
          onVersionChange={onVersionChange}
        />
      ),
      evidence: (
        <EvidencePanel records={artifact?.evidence ?? state.evidence ?? []} />
      ),
      history: (
        <HistoryPanel
          value={value}
          records={artifact?.history}
        />
      ),
      research: (
        <ResearchPanel record={artifact?.process ?? state.research_plan} />
      ),
    },
  };
}
