/** Stable #34 cross-skill contract. Legacy mode names remain readable through
 * counsel-mode.ts until the session controller is wired into routing. */

export const CORE_COUNSEL_MODES = [
  "next_action",
  "deep_research",
  "thinking_coach",
  "historical_reflection",
] as const;

export const COUNSEL_SURFACE_MODES = [
  ...CORE_COUNSEL_MODES,
  "discuss",
] as const;

export type CoreCounselMode = (typeof CORE_COUNSEL_MODES)[number];
export type CounselSurfaceMode = (typeof COUNSEL_SURFACE_MODES)[number];
export type CounselSessionStatus =
  | "active"
  | "awaiting_user"
  | "researching"
  | "ready"
  | "completed"
  | "paused"
  | "superseded";
export type EstimatedDepth = "quick" | "standard" | "deep";

export interface HandoffContract {
  from_mode: CounselSurfaceMode;
  to_mode: CounselSurfaceMode;
  reason: string;
  user_goal: string;
  preserved_context: Record<string, unknown>;
  unresolved_question: string | null;
  expected_output: string;
  estimated_depth: EstimatedDepth;
  needs_user_confirmation: boolean;
  return_to: string | null;
}

export interface CounselSession {
  issue_id: string;
  subject: string;
  user_intent: string;
  desired_outcome: string;
  active_mode: CounselSurfaceMode;
  previous_modes: CounselSurfaceMode[];
  current_stage: string;
  status: CounselSessionStatus;
  context_snapshot_id: string | null;
  active_artifact_id: string | null;
  active_decision_record_id: string | null;
  facts: Record<string, unknown>[];
  assumptions: Record<string, unknown>[];
  unknowns: Record<string, unknown>[];
  user_commitments: Record<string, unknown>[];
  pending_interrupt: Record<string, unknown> | null;
  handoff_reason: string | null;
  review_trigger: Record<string, unknown> | null;
}

export interface ArtifactLineage {
  source_skill: string;
  source_version: string;
  supersedes: string[];
  superseded_by: string[];
}

export function isCounselSurfaceMode(
  value: unknown,
): value is CounselSurfaceMode {
  return COUNSEL_SURFACE_MODES.includes(value as CounselSurfaceMode);
}
