import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ComposerAction } from "./composer-action";

describe("ComposerAction", () => {
  it("offers a working stop action while streaming", async () => {
    const onStop = vi.fn();
    render(
      <ComposerAction
        canSubmit={false}
        streaming
        onStop={onStop}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(onStop).toHaveBeenCalledOnce();
  });

  it("disables send when there is no valid submission", () => {
    render(
      <ComposerAction
        canSubmit={false}
        streaming={false}
        onStop={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /send/i })).toBeDisabled();
  });
});
