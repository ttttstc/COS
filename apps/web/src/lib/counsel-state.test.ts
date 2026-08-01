import { describe, expect, it } from "vitest";

import {
  parseCounselState,
  toMaterialTabs,
  toStageProgress,
} from "./counsel-state";

describe("counsel state adapter", () => {
  it("conservatively parses supported LangGraph state fields", () => {
    expect(
      parseCounselState({
        messages: [
          { id: "human-1", type: "human", content: "需要判断" },
          { id: "invalid" },
        ],
        ui: [
          { type: "ui", id: "ui-1", name: "counsel-card", props: {} },
          { id: 2, name: "invalid" },
        ],
        stages: [
          {
            id: "retrieve_context",
            title: "恢复上下文",
            status: "completed",
            summary: "已恢复",
          },
          { id: "bad-stage", title: "无效", status: "unknown" },
        ],
        current_stage: " retrieve_context ",
        main_contradiction: " 缺少关键证据 ",
        recommendation: { kind: "response" },
        confidence: 78,
        reconsider_when: ["出现反证", null, " "],
        evidence: [{ id: "evidence-1" }, "invalid"],
        research_plan: { unknowns: ["市场规模"] },
        context_snapshot: { source: "history" },
        historical_patterns: [{ id: "pattern-1" }, null],
        artifact: { type: "decision" },
        error: 404,
      }),
    ).toEqual({
      messages: [{ id: "human-1", type: "human", content: "需要判断" }],
      ui: [{ type: "ui", id: "ui-1", name: "counsel-card", props: {} }],
      stages: [
        {
          id: "retrieve_context",
          title: "恢复上下文",
          status: "completed",
          summary: "已恢复",
        },
      ],
      current_stage: "retrieve_context",
      main_contradiction: "缺少关键证据",
      recommendation: { kind: "response" },
      confidence: 78,
      reconsider_when: ["出现反证"],
      evidence: [{ id: "evidence-1" }],
      research_plan: { unknowns: ["市场规模"] },
      context_snapshot: { source: "history" },
      historical_patterns: [{ id: "pattern-1" }],
      artifact: { type: "decision" },
    });

    expect(parseCounselState(null)).toEqual({ messages: [] });
    expect(parseCounselState({ confidence: 101 })).toEqual({ messages: [] });
    expect(parseCounselState({ confidence: 78.5 })).toEqual({ messages: [] });
  });

  it("maps graph stages to StageProgress states", () => {
    const state = parseCounselState({
      current_stage: "synthesize",
      error: "graph_unavailable",
      stages: [
        { id: "queued", title: "等待", status: "pending" },
        { id: "research", title: "调研", status: "running" },
        { id: "review", title: "裁决", status: "blocked" },
        { id: "unused", title: "跳过", status: "skipped" },
        { id: "synthesize", title: "形成建议", status: "completed" },
      ],
    });

    expect(toStageProgress(state)).toEqual([
      { id: "queued", label: "等待", state: "pending" },
      { id: "research", label: "调研", state: "running" },
      { id: "review", label: "裁决", state: "waiting_user" },
      { id: "unused", label: "跳过", state: "complete" },
      { id: "synthesize", label: "形成建议", state: "failed" },
    ]);
  });

  it("maps the four fixed material tabs and their empty states", () => {
    const tabs = toMaterialTabs({
      current_stage: "synthesize",
      stages: [{ id: "synthesize", title: "形成建议", status: "running" }],
      main_contradiction: "目标与证据不匹配",
      confidence: 0,
      evidence: [{}, { id: "evidence-1" }],
      context_snapshot: {},
    });

    expect(tabs.map(({ id, label, empty }) => ({ id, label, empty }))).toEqual([
      { id: "counsel", label: "参谋结论", empty: false },
      { id: "evidence", label: "关键证据", empty: false },
      { id: "history", label: "历史依据", empty: true },
      { id: "research", label: "调研过程", empty: true },
    ]);
    expect(tabs[0].content).toMatchObject({
      currentStage: "形成建议",
      mainContradiction: "目标与证据不匹配",
      confidence: 0,
    });

    expect(toMaterialTabs({}).every((tab) => tab.empty)).toBe(true);
  });
});
