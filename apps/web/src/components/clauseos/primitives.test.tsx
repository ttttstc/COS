import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DesktopOnlyGuard, GlassSurface, SplitHandle } from "./primitives";

describe("GlassSurface", () => {
  it("exposes an optical profile and renders independent physical layers", () => {
    render(
      <GlassSurface
        optics="palette"
        prismCorners={["top-right", "bottom-right"]}
        sweep="dual"
      >
        命令面板
      </GlassSurface>,
    );

    const surface = screen.getByText("命令面板").closest(".lyl-glass-surface");
    expect(surface).toHaveAttribute("data-optics", "palette");
    expect(surface?.querySelector(".lyl-silver-physical-edge")).toBeTruthy();
    expect(surface?.querySelector(".lyl-glass-caustic")).toBeTruthy();
    expect(surface?.querySelector(".lyl-glass-caustic")).toHaveAttribute(
      "data-sweep",
      "dual",
    );
    expect(surface?.querySelectorAll(".lyl-prism-corner-light")).toHaveLength(
      2,
    );
  });
});

describe("SplitHandle", () => {
  it("exposes separator values and converts arrow keys to resize steps", () => {
    const onStep = vi.fn();
    render(
      <SplitHandle
        valueMin={320}
        valueMax={480}
        valueNow={392}
        onStep={onStep}
      />,
    );

    const handle = screen.getByRole("separator", { name: "调整面板宽度" });
    expect(handle).toHaveAttribute("aria-valuemin", "320");
    expect(handle).toHaveAttribute("aria-valuemax", "480");
    expect(handle).toHaveAttribute("aria-valuenow", "392");

    fireEvent.keyDown(handle, { key: "ArrowLeft" });
    fireEvent.keyDown(handle, { key: "ArrowRight" });
    expect(onStep).toHaveBeenNthCalledWith(1, -1);
    expect(onStep).toHaveBeenNthCalledWith(2, 1);
  });

  it("removes disabled handles from the tab order", () => {
    render(<SplitHandle disabled />);

    expect(screen.getByRole("separator")).toHaveAttribute("tabindex", "-1");
    expect(screen.getByRole("separator")).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });
});

describe("DesktopOnlyGuard", () => {
  it("keeps a named desktop notice and the guarded product surface", () => {
    render(
      <DesktopOnlyGuard>
        <main aria-label="议题工作区">工作台</main>
      </DesktopOnlyGuard>,
    );

    expect(screen.getByRole("status")).toHaveTextContent("第一版仅支持桌面端");
    expect(
      screen.getByRole("main", { name: "议题工作区" }),
    ).toBeInTheDocument();
  });
});
