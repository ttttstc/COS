import { describe, expect, it } from "vitest";
import { resolveApiUrl, resolveStreamConfig } from "./stream-config";

describe("stream configuration", () => {
  it("forces the same-origin proxy without exposing user overrides", () => {
    expect(
      resolveStreamConfig({
        apiUrl: "https://user-controlled.example",
        assistantId: "user-controlled",
        envAssistantId: "production-agent",
        production: true,
      }),
    ).toEqual({
      apiUrl: "/api",
      assistantId: "production-agent",
    });
  });

  it("turns a same-origin proxy path into an SDK-compatible URL", () => {
    expect(resolveApiUrl("/api", "https://counsel.example.com")).toBe(
      "https://counsel.example.com/api",
    );
  });

  it("requires explicit development configuration", () => {
    expect(
      resolveStreamConfig({
        production: false,
      }),
    ).toEqual({
      apiUrl: undefined,
      assistantId: undefined,
    });
  });
});
