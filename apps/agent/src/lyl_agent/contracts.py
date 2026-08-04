"""Stable cross-skill counsel contracts.

The graph still accepts the legacy mode names while the product converges on
four user-facing core scenarios.  These models are the boundary for future
skill handoffs; they deliberately do not execute routing themselves.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

CoreMode = Literal[
    "next_action",
    "deep_research",
    "thinking_coach",
    "historical_reflection",
]
CounselSurfaceMode = CoreMode | Literal["discuss"]
SessionStatus = Literal[
    "active",
    "awaiting_user",
    "researching",
    "ready",
    "completed",
    "paused",
    "superseded",
]
EstimatedDepth = Literal["quick", "standard", "deep"]


class HandoffContract(BaseModel):
    """Explicit transfer envelope between core counsel skills."""

    model_config = ConfigDict(extra="forbid")

    from_mode: CounselSurfaceMode
    to_mode: CounselSurfaceMode
    reason: str
    user_goal: str
    preserved_context: dict[str, object] = Field(default_factory=dict)
    unresolved_question: str | None = None
    expected_output: str
    estimated_depth: EstimatedDepth = "standard"
    needs_user_confirmation: bool = False
    return_to: str | None = None


class CounselSession(BaseModel):
    """Top-level state shared by a single long-lived counsel thread."""

    model_config = ConfigDict(extra="forbid")

    issue_id: str
    subject: str
    user_intent: str
    desired_outcome: str = ""
    active_mode: CounselSurfaceMode
    previous_modes: list[CounselSurfaceMode] = Field(default_factory=list)
    current_stage: str = "intake"
    status: SessionStatus = "active"
    context_snapshot_id: str | None = None
    active_artifact_id: str | None = None
    active_decision_record_id: str | None = None
    facts: list[dict[str, object]] = Field(default_factory=list)
    assumptions: list[dict[str, object]] = Field(default_factory=list)
    unknowns: list[dict[str, object]] = Field(default_factory=list)
    user_commitments: list[dict[str, object]] = Field(default_factory=list)
    pending_interrupt: dict[str, object] | None = None
    handoff_reason: str | None = None
    review_trigger: dict[str, object] | None = None


LEGACY_MODE_TO_CORE: dict[str, CounselSurfaceMode] = {
    "ask": "next_action",
    "decide": "next_action",
    "research": "deep_research",
    "diagnose": "historical_reflection",
    "discuss": "discuss",
}


def core_mode_for_legacy(mode: str) -> CounselSurfaceMode:
    """Map persisted pre-#34 modes without changing their runtime behavior."""

    return LEGACY_MODE_TO_CORE.get(mode, "discuss")


def artifact_ref(artifact_type: object, version: object) -> str:
    """Return the stable lineage key used by ``supersedes`` relations."""

    kind = artifact_type if isinstance(artifact_type, str) and artifact_type else "counsel"
    number = version if isinstance(version, int) and version > 0 else 1
    return f"{kind}:v{number}"
