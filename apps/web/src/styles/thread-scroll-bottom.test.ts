import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const threadCss = readFileSync(
  path.resolve(process.cwd(), "src/styles/thread.css"),
  "utf8",
);

describe("thread scroll-bottom control", () => {
  it("keeps the centered anchor when the shared button changes state", () => {
    expect(threadCss).toMatch(
      /\.cos-thread-scroll-bottom:hover:not\(:disabled\)\s*\{[\s\S]*?transform:\s*translateX\(-50%\) translateY\(-1px\)/,
    );
    expect(threadCss).toMatch(
      /\.cos-thread-scroll-bottom:active:not\(:disabled\)\s*\{[\s\S]*?transform:\s*translateX\(-50%\) scale\(0\.98\)/,
    );
  });
});
