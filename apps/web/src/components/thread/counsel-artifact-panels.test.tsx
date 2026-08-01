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
      current_stage: "形成建议",
      main_contradiction: "验证不足",
      action_title: "访谈用户",
      action_description: "先访谈五位真实用户",
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
        value={{}}
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
        value={{}}
        artifactError="next_action 建议卡 Schema 无效"
      />,
    );
    expect(screen.getByText("建议卡格式异常")).toBeInTheDocument();
    expect(screen.getByText(/已降级展示可用内容/)).toBeInTheDocument();
  });
});
