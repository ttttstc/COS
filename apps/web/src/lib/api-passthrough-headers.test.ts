import { describe, expect, it } from "vitest";

import { apiPassthroughHeaders } from "./api-passthrough-headers";

describe("apiPassthroughHeaders", () => {
  it("preserves JSON content type for custom business routes", () => {
    expect(
      apiPassthroughHeaders(
        new Headers({ "content-type": "application/json; charset=utf-8" }),
      ),
    ).toEqual({ "content-type": "application/json; charset=utf-8" });
  });

  it("does not invent a content type for bodyless requests", () => {
    expect(apiPassthroughHeaders(new Headers())).toEqual({});
  });
});
