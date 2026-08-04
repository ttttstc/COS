import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { IssueTopbar, StageProgress } from "./business";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("IssueTopbar", () => {
  it("does not restart glass optics when embedded in the workbench shell", () => {
    render(
      <IssueTopbar
        embedded
        mode="ask"
        status="draft"
        title="嵌入式议题顶栏"
      />,
    );

    const surface = screen
      .getByText("嵌入式议题顶栏")
      .closest(".lyl-glass-surface");
    expect(surface).toBeInTheDocument();
    expect(surface?.querySelector(".lyl-silver-physical-edge")).toBeNull();
    expect(surface?.querySelector(".lyl-glass-caustic")).toBeNull();
    expect(surface?.querySelector(".lyl-prism-corner-light")).toBeNull();
  });

  it("renders repeated graph stages without duplicate React keys", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    render(
      <StageProgress
        items={[
          { id: "request_decision", label: "等待裁决", state: "complete" },
          { id: "request_decision", label: "等待裁决", state: "waiting_user" },
        ]}
      />,
    );

    expect(screen.getAllByText("等待裁决")).toHaveLength(2);
    expect(consoleError).not.toHaveBeenCalledWith(
      expect.stringContaining("same key"),
      expect.anything(),
    );
  });
});
