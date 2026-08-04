import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { parseCounselArtifact } from "@/lib/counsel-artifact";

import { CounselPanel } from "./counsel-material-panels";
import { CounselMaterials } from "./counsel-materials";

const artifactValue = {
  artifact_type: "next_action",
  title: "第一版先做什么",
  version: 2,
  status: "final",
  change_reason: "关键约束发生变化",
  tabs: {
    counsel: {
      scope: "local",
      request_scope: "local",
      time_horizon: "today",
      state_delta: "从模糊问题到可验证反馈",
      blocker_type: "information",
      decisive_condition: "完成一次真实访谈",
      recommended_mode: "act",
      current_stage: "形成建议",
      main_contradiction: "验证不足",
      action_title: "访谈用户",
      action_description: "先访谈五位真实用户",
      first_move: "联系第一位用户",
      deliverable: "五次访谈记录",
      done_when: ["完成五次访谈"],
      timebox: "本周内",
      expected_state_change: "获得真实需求信号",
      not_now: ["暂停扩展功能"],
      main_risk: "样本偏差",
      guardrail: "不把单一样本当结论",
      recovery: "扩大样本后重判",
      observe: ["是否出现共同问题"],
      review_when: "完成访谈后复盘",
      confidence_basis: "已有候选用户且动作可逆",
      continuation_status: "new",
      continuation_basis: "本轮为新判断",
      situation_assessment: "当前缺少真实用户反馈，继续扩展功能会放大不确定性。",
      key_judgments: ["先获得行为反馈，再决定是否扩大投入"],
      execution_steps: ["联系用户", "完成访谈", "记录共同问题"],
      risk_controls: ["控制在本周内完成，结果不支持就暂停扩张"],
      why_now: "今天即可获得第一轮信号。",
      completion_criteria: ["完成五次访谈并记录共同问题"],
      pause_or_stop: ["暂停扩展功能"],
      confidence: 74,
      reconsider_when: ["访谈结果与假设相反"],
    },
    evidence: [
      {
        id: "evidence-1",
        title: "当前缺少访谈",
        summary: "现有判断仅来自内部讨论",
        relation: "limit",
        relevance: "high",
        freshness: "high",
        source_name: "议题记录",
      },
    ],
    history: [],
    process: null,
  },
};

describe("structured counsel artifact panels", () => {
  it("renders final counsel and each artifact-backed tab independently", () => {
    render(
      <CounselMaterials
        activeTab="counsel"
        onTabChange={() => undefined}
        value={{ artifact: artifactValue, artifact_versions: [artifactValue] }}
      />,
    );
    expect(screen.getByText("先访谈五位真实用户")).toBeInTheDocument();
    expect(screen.getByText("74%")).toBeInTheDocument();
    expect(screen.getByText("局部下一步")).toBeInTheDocument();
    expect(screen.getByText("卡点：承重事实不足")).toBeInTheDocument();
    expect(screen.getByText("节奏：直接行动")).toBeInTheDocument();
    expect(screen.getByText("决胜条件")).toBeInTheDocument();
    expect(screen.getByText(/联系第一位用户/)).toBeInTheDocument();
    expect(screen.getByText(/样本偏差/)).toBeInTheDocument();
    expect(screen.getByText("态势判断")).toBeInTheDocument();
    expect(screen.getByText("先获得行为反馈，再决定是否扩大投入")).toBeInTheDocument();
    expect(screen.getByText("联系用户")).toBeInTheDocument();
    expect(screen.getByText("控制在本周内完成，结果不支持就暂停扩张")).toBeInTheDocument();
    expect(screen.getByText("完成五次访谈并记录共同问题")).toBeInTheDocument();
    expect(screen.getByText(/改判原因：关键约束发生变化/)).toBeInTheDocument();
  });

  it("shows artifact evidence instead of a misleading empty state", () => {
    render(
      <CounselMaterials
        activeTab="evidence"
        onTabChange={() => undefined}
        value={{ artifact: artifactValue }}
      />,
    );
    expect(screen.getByText("当前缺少访谈")).toBeInTheDocument();
    expect(screen.queryByText("尚无关键证据")).not.toBeInTheDocument();
  });

  it("switches to an old immutable version", async () => {
    const user = userEvent.setup();
    const onVersionChange = vi.fn();
    const current = parseCounselArtifact(artifactValue).artifact!;
    const old = parseCounselArtifact({
      ...artifactValue,
      version: 1,
      status: "superseded",
    }).artifact!;
    render(
      <CounselPanel
        fallbackState={{ messages: [] }}
        artifact={current}
        versions={[old, current]}
        onVersionChange={onVersionChange}
      />,
    );

    await user.selectOptions(screen.getByLabelText("查看建议版本"), "1");
    expect(onVersionChange).toHaveBeenCalledWith(1);
  });

  it("degrades safely when the artifact schema is invalid", () => {
    render(
      <CounselPanel
        fallbackState={{ messages: [] }}
        artifactError="next_action 建议卡 Schema 无效"
      />,
    );
    expect(screen.getByText("建议卡格式异常")).toBeInTheDocument();
    expect(screen.getByText(/已降级展示可用内容/)).toBeInTheDocument();
  });

  it("surfaces a partial schema error without hiding the valid artifact", () => {
    const artifact = parseCounselArtifact(artifactValue).artifact!;
    render(
      <CounselPanel
        fallbackState={{ messages: [] }}
        artifact={artifact}
        artifactError="evidence 字段不完整"
      />,
    );
    expect(screen.getByText("建议卡格式异常")).toBeInTheDocument();
    expect(screen.getByText("先访谈五位真实用户")).toBeInTheDocument();
  });

  it("renders decision options and the opposition review", () => {
    const artifact = parseCounselArtifact({
      artifact_type: "decision",
      title: "如何验证需求",
      version: 1,
      status: "final",
      tabs: {
        counsel: {
          decision_question: "如何验证需求？",
          main_contradiction: "速度与证据质量",
          objectives: ["获得真实反馈"],
          constraints: ["两周内"],
          facts: ["已有候选用户"],
          assumptions: ["用户愿意访谈"],
          unknowns: ["是否愿意付费"],
          options: [
            {
              id: "interview",
              title: "先访谈",
              summary: "快速理解需求",
              benefits: ["成本低"],
              costs: ["耗时"],
              risks: ["样本偏差"],
            },
            {
              id: "prototype",
              title: "先做原型",
              summary: "用行为反馈验证",
              benefits: ["反馈真实"],
              costs: ["成本高"],
              risks: ["可能返工"],
            },
          ],
          recommended_option_id: "interview",
          recommendation_reason: "先访谈，因为可逆且直接减少关键未知。",
          opposition_view: ["访谈结果可能高估付费意愿。"],
          confidence: 78,
          reconsider_when: ["连续访谈不支持"],
        },
      },
    }).artifact!;
    render(
      <CounselPanel
        fallbackState={{ messages: [] }}
        artifact={artifact}
      />,
    );
    expect(screen.getByText("先访谈")).toBeInTheDocument();
    expect(screen.getByText("先做原型")).toBeInTheDocument();
    expect(screen.getByText("反方审查")).toBeInTheDocument();
    expect(screen.getByText("访谈结果可能高估付费意愿。")).toBeInTheDocument();
  });
});
