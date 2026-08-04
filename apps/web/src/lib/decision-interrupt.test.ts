import { describe, expect, it } from "vitest";

import {
  buildStructuredInterruptResume,
  parseStructuredDecisionInterrupt,
} from "./decision-interrupt";

describe("structured counsel interrupts", () => {
  it("maps a scope clarification envelope to the decision card contract", () => {
    const interrupt = parseStructuredDecisionInterrupt({
      id: "interrupt-1",
      value: {
        type: "scope_clarification",
        question: "本次建议覆盖哪个市场？",
        options: [
          { id: "cn", label: "中国市场", description: "先验证国内需求" },
          { id: "global", label: "全球市场" },
        ],
        recommended: "cn",
      },
    });

    expect(interrupt).toMatchObject({
      allowReportNow: true,
      interruptId: "interrupt-1",
      kind: "scope_clarification",
      protocolInterruptId: "interrupt-1",
      question: "本次建议覆盖哪个市场？",
      recommendedOptionId: "cn",
      resumeValues: ["cn", "global", "report_now"],
      title: "确认议题范围",
    });
    expect(interrupt?.options).toEqual([
      {
        id: "cn",
        title: "中国市场",
        description: "先验证国内需求",
        recommended: true,
      },
      { id: "global", title: "全球市场" },
    ]);
    expect(buildStructuredInterruptResume(interrupt!, "cn")).toEqual({
      "interrupt-1": "cn",
    });
  });

  it("maps a value tradeoff without inventing a recommendation", () => {
    expect(
      parseStructuredDecisionInterrupt({
        type: "value_tradeoff",
        question: "更重视速度还是确定性？",
        why_needed: "两者会改变证据门槛。",
        options: [
          { id: "speed", label: "速度", cost: "接受较高不确定性" },
          { id: "certainty", label: "确定性", cost: "延后两周" },
        ],
      }),
    ).toEqual({
      allowReportNow: true,
      interruptId: "counsel-interrupt-value_tradeoff-0",
      kind: "value_tradeoff",
      options: [
        { id: "speed", title: "速度", cost: "接受较高不确定性" },
        { id: "certainty", title: "确定性", cost: "延后两周" },
      ],
      question: "更重视速度还是确定性？",
      rationale: "两者会改变证据门槛。",
      resumeValues: ["speed", "certainty", "report_now"],
      title: "确认价值取舍",
    });
  });

  it("separates report-now from research plan choices", () => {
    const interrupt = parseStructuredDecisionInterrupt({
      value: {
        type: "research_approval",
        key_unknowns: ["真实付费意愿"],
        proposed_angles: ["访谈五位目标用户"],
        stop_conditions: ["出现三个一致反证"],
        actions: ["approve", "modify", "report_now"],
      },
    });

    expect(interrupt).toMatchObject({
      allowReportNow: true,
      kind: "research_approval",
      question: "是否按该调研计划继续？",
      resumeValues: ["approve", "modify", "report_now"],
      title: "批准调研计划",
    });
    expect(interrupt?.options.map((option) => option.id)).toEqual([
      "approve",
      "modify",
    ]);
    expect(interrupt?.rationale).toContain("关键未知：真实付费意愿");
    expect(buildStructuredInterruptResume(interrupt!, "report_now")).toBe(
      "report_now",
    );
  });

  it("maps hard-gate confirmations to a resumable decision card", () => {
    const interrupt = parseStructuredDecisionInterrupt({
      id: "gate-1",
      value: {
        type: "professional_confirmation",
        question: "是否先获得合格专业人士或责任人的确认？",
        reason: "该议题涉及高风险边界。",
        actions: ["confirm_boundary", "report_now"],
      },
    });

    expect(interrupt).toMatchObject({
      allowReportNow: true,
      interruptId: "gate-1",
      kind: "boundary_confirmation",
      question: "是否先获得合格专业人士或责任人的确认？",
      rationale: "该议题涉及高风险边界。",
      resumeValues: ["confirm_boundary", "report_now"],
      title: "确认专业边界",
    });
    expect(interrupt?.options).toEqual([
      {
        id: "confirm_boundary",
        title: "确认已获得专业或责任人确认",
      },
    ]);
    expect(buildStructuredInterruptResume(interrupt!, "confirm_boundary")).toEqual({
      "gate-1": "confirm_boundary",
    });
  });

  it.each([
    [
      "condition_confirmation",
      "确认行动条件",
      "确认关键权限或外部依赖已具备",
    ],
    ["value_tradeoff", "确认价值取舍", "确认本次优先保护的价值"],
  ] as const)(
    "maps %s without options to a boundary confirmation",
    (type, title, optionTitle) => {
      const interrupt = parseStructuredDecisionInterrupt({
        value: {
          type,
          question: "关键条件是否已经确认？",
          reason: "当前行动依赖一个尚未确认的边界。",
          actions: ["confirm_boundary", "report_now"],
        },
      });

      expect(interrupt).toMatchObject({
        allowReportNow: true,
        kind: "boundary_confirmation",
        options: [{ id: "confirm_boundary", title: optionTitle }],
        resumeValues: ["confirm_boundary", "report_now"],
        title,
      });
    },
  );

  it("keeps a report-now-only hard gate resumable", () => {
    const interrupt = parseStructuredDecisionInterrupt({
      value: {
        type: "condition_confirmation",
        question: "是否具备继续条件？",
        reason: "不能假设外部依赖已经满足。",
        actions: ["report_now"],
      },
    });

    expect(interrupt).toMatchObject({
      allowReportNow: true,
      options: [],
      resumeValues: ["report_now"],
    });
    expect(buildStructuredInterruptResume(interrupt!, "report_now")).toBe(
      "report_now",
    );
  });

  it("accepts one envelope and rejects arrays or unknown schemas", () => {
    expect(
      parseStructuredDecisionInterrupt([
        {
          id: "scope",
          value: {
            type: "scope_clarification",
            question: "范围？",
            options: [
              { id: "a", label: "A" },
              { id: "b", label: "B" },
            ],
          },
        },
      ]),
    ).toBeUndefined();
    expect(
      parseStructuredDecisionInterrupt({
        value: { action_requests: [], review_configs: [] },
      }),
    ).toBeUndefined();
    expect(
      parseStructuredDecisionInterrupt({
        value: {
          type: "scope_clarification",
          question: "范围？",
          options: [{ id: "a", label: "A" }],
        },
      }),
    ).toBeUndefined();
  });

  it("rejects selections not declared by the interrupt", () => {
    const interrupt = parseStructuredDecisionInterrupt({
      type: "scope_clarification",
      question: "范围？",
      options: [
        { id: "a", label: "A" },
        { id: "b", label: "B" },
      ],
    });

    expect(() =>
      buildStructuredInterruptResume(interrupt!, "not-declared"),
    ).toThrow("Unsupported interrupt selection");
  });
});
