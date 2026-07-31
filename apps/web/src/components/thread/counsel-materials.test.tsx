import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  CounselMaterials,
  createCounselMaterialView,
} from "./counsel-materials";

describe("CounselMaterials research panel", () => {
  it("renders the real research plan fields as a vertical progress list", () => {
    render(
      <CounselMaterials
        activeTab="research"
        onTabChange={() => undefined}
        value={{
          research_plan: {
            title: "用户验证计划",
            status: "running",
            key_unknowns: ["目标用户是否高频决策"],
            proposed_angles: ["访谈过去 30 天的真实决策"],
            stop_conditions: ["新证据不再改变建议方向"],
          },
        }}
      />,
    );

    expect(screen.getByText("用户验证计划")).toBeInTheDocument();
    const progress = screen.getByRole("list", { name: "调研过程" });
    expect(progress).toHaveClass("cos-research-progress");
    expect(progress).toHaveTextContent("目标用户是否高频决策");
    expect(progress).toHaveTextContent("访谈过去 30 天的真实决策");
    expect(progress).toHaveTextContent("新证据不再改变建议方向");
    expect(
      progress.querySelectorAll(".cos-research-progress__item"),
    ).toHaveLength(3);
    expect(
      progress.querySelectorAll(".cos-research-progress__item--running"),
    ).toHaveLength(3);
  });

  it("keeps the empty state when no supported research plan fields exist", () => {
    render(
      <CounselMaterials
        activeTab="research"
        onTabChange={() => undefined}
        value={{ research_plan: { title: "未识别计划" } }}
      />,
    );

    expect(screen.getByText("尚未生成调研计划")).toBeInTheDocument();
    expect(
      createCounselMaterialView({ research_plan: { title: "未识别计划" } })
        .counts.research,
    ).toBe(0);
    expect(
      screen.queryByRole("list", { name: "调研过程" }),
    ).not.toBeInTheDocument();
  });
});
