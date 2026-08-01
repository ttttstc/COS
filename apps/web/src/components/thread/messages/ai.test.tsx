import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { StructuredDecisionInterrupt } from "@/lib/decision-interrupt";

const { submit } = vi.hoisted(() => ({ submit: vi.fn() }));

vi.mock("@/providers/Stream", () => ({
  useStreamContext: () => ({ submit }),
}));

import { StructuredInterruptView } from "./ai";

const INTERRUPT: StructuredDecisionInterrupt = {
  allowReportNow: true,
  interruptId: "interrupt-1",
  kind: "research_approval",
  options: [
    { id: "approve", title: "批准调研", recommended: true },
    { id: "modify", title: "修改计划" },
  ],
  question: "是否继续调研？",
  recommendedOptionId: "approve",
  resumeValues: ["approve", "modify", "report_now"],
  title: "批准调研计划",
};

describe("StructuredInterruptView", () => {
  it("cancels only the local choice and keeps the issue waiting", async () => {
    submit.mockClear();
    const user = userEvent.setup();
    render(<StructuredInterruptView interrupt={INTERRUPT} />);

    const confirm = screen.getByRole("button", { name: "确认选择" });
    expect(confirm).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "取消" }));

    expect(confirm).toBeDisabled();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "已取消当前选择，议题仍等待裁决。",
    );
    expect(submit).not.toHaveBeenCalled();

    await user.click(screen.getByRole("radio", { name: "修改计划" }));
    expect(confirm).toBeEnabled();

    await user.click(confirm);
    expect(submit).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        command: { resume: "modify" },
        streamMode: ["values"],
        streamResumable: true,
        streamSubgraphs: true,
      }),
    );
  });
});
