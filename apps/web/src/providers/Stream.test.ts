import { afterEach, describe, expect, it, vi } from "vitest";

import { checkGraphStatus } from "@/lib/graph-status";

describe("checkGraphStatus", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("handles an unavailable Agent without logging a console error", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(
      new TypeError("Failed to fetch"),
    );
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    await expect(
      checkGraphStatus("http://localhost:2024", null),
    ).resolves.toBe(false);

    expect(consoleError).not.toHaveBeenCalled();
  });
});
