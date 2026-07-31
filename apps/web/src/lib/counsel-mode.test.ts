import { describe, expect, it } from "vitest";
import {
  ALL_COUNSEL_MODES,
  buildCounselRunContext,
  getCounselMode,
  readCounselMode,
} from "./counsel-mode";

describe("counsel modes", () => {
  it("defines four active modes plus ordinary discussion", () => {
    expect(ALL_COUNSEL_MODES.map(({ mode }) => mode)).toEqual([
      "ask",
      "decide",
      "research",
      "diagnose",
      "discuss",
    ]);
    expect(getCounselMode("research").placeholder).toContain("调研");
  });

  it("falls back unknown thread metadata to discuss", () => {
    expect(readCounselMode("legacy")).toBe("discuss");
  });

  it("places the selected mode in run context", () => {
    expect(buildCounselRunContext("decide", { source: "artifact" })).toEqual({
      source: "artifact",
      mode: "decide",
    });
  });
});
