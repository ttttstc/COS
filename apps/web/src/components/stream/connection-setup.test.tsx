import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { ConnectionHome, ConnectionSettings } from "./connection-setup";

beforeAll(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

afterAll(() => vi.unstubAllGlobals());

describe("ConnectionHome", () => {
  it("keeps the immersive home focused on one entry action", async () => {
    const user = userEvent.setup();
    const onEnter = vi.fn();
    render(<ConnectionHome onEnter={onEnter} />);

    expect(
      screen.getByRole("heading", { name: "刘亚楼参谋台" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "拆解复杂议题、调研关键事实、权衡多方约束，并给出清晰可执行的决策建议。",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "设置" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /进入参谋台/ }));
    expect(onEnter).toHaveBeenCalledOnce();
  });
});

describe("ConnectionSettings", () => {
  it("submits connection values and provides a return path", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    const onSubmit = vi.fn();
    render(
      <ConnectionSettings
        defaultValues={{
          apiUrl: "http://localhost:2024",
          assistantId: "lyl_counsel_agent",
          apiKey: "",
        }}
        isAgentBuilder={false}
        onAgentBuilderChange={() => undefined}
        onBack={onBack}
        onSubmit={onSubmit}
      />,
    );

    await user.clear(screen.getByLabelText(/Agent ID/));
    await user.type(screen.getByLabelText(/Agent ID/), "counsel_v2");
    await user.click(screen.getByRole("button", { name: "保存设置" }));

    expect(onSubmit).toHaveBeenCalledWith({
      apiUrl: "http://localhost:2024",
      assistantId: "counsel_v2",
      apiKey: "",
    });
    await user.click(screen.getByRole("button", { name: "返回" }));
    expect(onBack).toHaveBeenCalledOnce();
  });
});
