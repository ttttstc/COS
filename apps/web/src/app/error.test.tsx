import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import ErrorPage from "./error";

describe("ErrorPage", () => {
  it("shows a readable recovery action", async () => {
    const reset = vi.fn();
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    render(
      <ErrorPage
        error={new Error("connection failed")}
        reset={reset}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Unable to load this conversation",
    );
    await userEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(reset).toHaveBeenCalledOnce();
  });
});
