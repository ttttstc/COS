import { describe, expect, it } from "vitest";

import { canSubmitMessage } from "./composer";

describe("canSubmitMessage", () => {
  it("rejects empty and whitespace-only input", () => {
    expect(canSubmitMessage("", [], false)).toBe(false);
    expect(canSubmitMessage("   ", [], false)).toBe(false);
  });

  it("accepts text or files while idle", () => {
    expect(canSubmitMessage("hello", [], false)).toBe(true);
    expect(
      canSubmitMessage(
        "",
        [
          {
            type: "image",
            mimeType: "image/png",
            data: "data:image/png;base64,AA==",
          },
        ],
        false,
      ),
    ).toBe(true);
  });

  it("rejects submissions while loading", () => {
    expect(canSubmitMessage("hello", [], true)).toBe(false);
  });
});
