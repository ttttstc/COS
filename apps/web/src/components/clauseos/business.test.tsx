import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { IssueTopbar } from "./business";

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
});
