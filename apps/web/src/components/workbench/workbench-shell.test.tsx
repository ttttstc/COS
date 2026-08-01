import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  BrandLockup,
  ClauseOSWorkbench,
  CounselMaterialPanel,
  NavItem,
  NavSection,
  NewIssueButton,
} from "./workbench-shell";

describe("workbench navigation controls", () => {
  it("exposes compact, collapsed, selected, badge, and disabled states", () => {
    const onCreate = vi.fn();
    const onSelect = vi.fn();
    const { container } = render(
      <>
        <BrandLockup compact />
        <NewIssueButton
          disabled
          onClick={onCreate}
        />
        <NavSection
          title="折叠分区"
          collapsed
        >
          <span>隐藏内容</span>
        </NavSection>
        <NavItem
          icon={<span aria-hidden="true">●</span>}
          label="调研后判断"
          badge={<span>2</span>}
          selected
          disabled
          onClick={onSelect}
        />
      </>,
    );

    expect(container.querySelector('[data-compact="true"]')).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "新建议题" })).toBeDisabled();
    expect(screen.getByText("隐藏内容").parentElement).toHaveAttribute("hidden");
    expect(screen.getByRole("button", { name: "调研后判断" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "调研后判断" })).toBeDisabled();
  });
});

describe("ClauseOSWorkbench", () => {
  it("keeps the material DOM mounted when collapsed", () => {
    const { container, rerender } = render(
      <ClauseOSWorkbench
        navigator={<nav>议题导航</nav>}
        workspace={<main>议题主区域</main>}
        material={<aside>参谋材料内容</aside>}
      />,
    );

    expect(
      container.querySelector(".cos-workbench__material-slot"),
    ).not.toHaveAttribute("aria-hidden");

    rerender(
      <ClauseOSWorkbench
        materialOpen={false}
        navigator={<nav>议题导航</nav>}
        workspace={<main>议题主区域</main>}
        material={<aside>参谋材料内容</aside>}
      />,
    );

    expect(screen.getByText("参谋材料内容")).toBeInTheDocument();
    expect(
      container.querySelector(".cos-workbench__material-slot"),
    ).toHaveAttribute("aria-hidden", "true");
  });

  it("resizes the material panel from the keyboard", async () => {
    const user = userEvent.setup();
    const onMaterialWidthChange = vi.fn();
    render(
      <ClauseOSWorkbench
        materialWidth={392}
        onMaterialWidthChange={onMaterialWidthChange}
        navigator={<nav>议题导航</nav>}
        workspace={<main>议题主区域</main>}
        material={<aside>参谋材料内容</aside>}
      />,
    );

    const separator = screen.getByRole("separator", {
      name: "调整参谋材料宽度",
    });
    separator.focus();
    await user.keyboard("{ArrowLeft}");

    expect(onMaterialWidthChange).toHaveBeenCalledWith(400);
  });

  it("disables a material handle when the responsive range is fixed", async () => {
    const user = userEvent.setup();
    const onMaterialWidthChange = vi.fn();
    render(
      <ClauseOSWorkbench
        materialMinWidth={320}
        materialMaxWidth={320}
        materialWidth={320}
        onMaterialWidthChange={onMaterialWidthChange}
        navigator={<nav>议题导航</nav>}
        workspace={<main>议题主区域</main>}
        material={<aside>参谋材料内容</aside>}
      />,
    );

    const separator = screen.getByRole("separator", {
      name: "调整参谋材料宽度",
    });
    expect(separator).toHaveAttribute("aria-valuemax", "320");
    expect(separator).toHaveAttribute("tabindex", "-1");
    separator.focus();
    await user.keyboard("{ArrowLeft}{ArrowRight}");
    expect(onMaterialWidthChange).not.toHaveBeenCalled();
  });
});

describe("CounselMaterialPanel", () => {
  it("always exposes the four fixed material tabs", () => {
    render(
      <CounselMaterialPanel
        activeTab="counsel"
        onTabChange={() => undefined}
        panels={{ counsel: <p>结论内容</p> }}
      />,
    );

    expect(
      screen.getByRole("tablist", { name: "参谋材料" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
      "参谋结论",
      "关键证据",
      "历史依据",
      "调研过程",
    ]);
  });
});
