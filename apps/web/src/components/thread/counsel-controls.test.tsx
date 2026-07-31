import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CounselModeSelect } from "./counsel-mode-select";
import { CounselWelcome } from "./counsel-welcome";

describe("counsel entry controls", () => {
  it("offers four independent entry modes", async () => {
    const user = userEvent.setup();
    const onSelectMode = vi.fn();
    render(<CounselWelcome onSelectMode={onSelectMode} />);

    expect(screen.getByText("今天需要参谋什么？")).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(4);

    await user.click(screen.getByRole("button", { name: /调研后判断/ }));
    expect(onSelectMode).toHaveBeenCalledWith("research");
  });

  it("switches and clears the current draft mode", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(
      <CounselModeSelect
        mode="ask"
        onChange={onChange}
      />,
    );

    await user.selectOptions(screen.getByLabelText("切换议题类型"), "decide");
    expect(onChange).toHaveBeenCalledWith("decide");

    await user.click(
      screen.getByRole("button", { name: "清除下一步做什么模式" }),
    );
    expect(onChange).toHaveBeenCalledWith("discuss");

    rerender(
      <CounselModeSelect
        mode="discuss"
        onChange={onChange}
      />,
    );
    expect(
      screen.queryByRole("button", { name: /清除.*模式/ }),
    ).not.toBeInTheDocument();
  });
});
