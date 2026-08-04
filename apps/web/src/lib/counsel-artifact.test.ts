import { describe, expect, it } from "vitest";

import {
  parseCounselArtifact,
  parseCounselArtifactVersions,
} from "./counsel-artifact";

const nextAction = {
  artifact_type: "next_action",
  title: "先做什么",
  version: 1,
  status: "final",
  tabs: {
    counsel: {
      current_stage: "形成建议",
      main_contradiction: "范围和速度冲突",
      action_title: "验证需求",
      action_description: "访谈五位用户",
      pause_or_stop: ["暂停扩展功能"],
      confidence: 72,
      reconsider_when: ["出现反证"],
    },
    evidence: [],
    history: [],
  },
};

describe("counsel artifact schema", () => {
  it("normalizes a next action artifact", () => {
    expect(parseCounselArtifact(nextAction)).toMatchObject({
      artifact: {
        artifactType: "next_action",
        recommendation: "访谈五位用户",
        mainContradiction: "范围和速度冲突",
        confidence: 72,
        changeConditions: ["出现反证"],
      },
    });
  });

  it("accepts the #34 lineage envelope and future core artifact names", () => {
    const result = parseCounselArtifact({
      artifact_type: "research_report",
      title: "研究报告",
      version: 2,
      status: "final",
      source_skill: "deep_research",
      source_version: "v1",
      supersedes: ["research_report:v1"],
      superseded_by: [],
      tabs: {
        counsel: {
          current_stage: "形成报告",
          main_contradiction: "证据不足",
          recommendation: "先核对一手来源",
          confidence: 70,
          reconsider_when: ["出现反证"],
        },
      },
    });

    expect(result).toMatchObject({
      artifact: {
        artifactType: "research_report",
        sourceSkill: "deep_research",
        supersedes: ["research_report:v1"],
      },
    });
  });

  it.each([
    [
      "decision",
      {
        main_contradiction: "速度与风险冲突",
        recommendation_reason: "选择可逆方案",
        confidence: 68,
        reconsider_when: ["风险变化"],
      },
    ],
    [
      "research",
      {
        current_stage: "形成判断",
        main_contradiction: "证据不足",
        recommendation: "先核对一手来源",
        confidence: 61,
        reconsider_when: ["获得新证据"],
      },
    ],
    [
      "diagnosis",
      {
        main_contradiction: "判断与行动脱节",
        suggested_rule: "缩短反馈周期",
        limitations: ["样本较少"],
        confidence: 65,
        reconsider_when: ["行为模式变化"],
      },
    ],
  ])("parses the %s artifact schema", (artifactType, counsel) => {
    expect(
      parseCounselArtifact({
        artifact_type: artifactType,
        title: "结构化建议",
        version: 1,
        status: "final",
        tabs: { counsel },
      }).artifact?.artifactType,
    ).toBe(artifactType);
  });

  it("rejects malformed type-specific counsel without crashing", () => {
    expect(
      parseCounselArtifact({
        ...nextAction,
        tabs: { counsel: { confidence: 101 } },
      }),
    ).toEqual({ error: "next_action 建议卡 Schema 无效" });
  });

  it("keeps valid old versions and drops invalid entries", () => {
    expect(
      parseCounselArtifactVersions([
        { ...nextAction, status: "superseded" },
        { broken: true },
        { ...nextAction, version: 2 },
      ]).map(({ version, status }) => ({ version, status })),
    ).toEqual([
      { version: 1, status: "superseded" },
      { version: 2, status: "final" },
    ]);
  });
});
