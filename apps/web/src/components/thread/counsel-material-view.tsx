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

function getCounselMaterialCounts(state: CounselState) {
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
      state.artifact ||
      state.error
        ? 1
        : 0,
    evidence: state.evidence?.length ?? 0,
    history:
      (state.context_snapshot ? 1 : 0) +
      (state.historical_patterns?.length ?? 0),
    research: researchFields.some((items) => items.length > 0) ? 1 : 0,
  };
}

export function createCounselMaterialView(value: unknown) {
  const state = parseCounselState(value);
  return {
    counts: getCounselMaterialCounts(state),
    panels: {
      counsel: <CounselPanel value={value} />,
      evidence: <EvidencePanel records={state.evidence ?? []} />,
      history: <HistoryPanel value={value} />,
      research: <ResearchPanel record={state.research_plan} />,
    },
  };
}
