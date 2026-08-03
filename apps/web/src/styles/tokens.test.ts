import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const runtimeTokens = readFileSync(
  resolve(process.cwd(), "src/styles/tokens.css"),
  "utf8",
);
const canonicalTokens = readFileSync(
  resolve(process.cwd(), "../../design-system/lyl-clauseos-ui.css"),
  "utf8",
);
const primitives = readFileSync(
  resolve(process.cwd(), "src/styles/primitives.css"),
  "utf8",
);

function tokenMap(source: string) {
  return new Map(
    [...source.matchAll(/--lyl-([a-z0-9-]+):\s*([^;]+);/g)].map(
      ([, token, value]) => [token, value] as const,
    ),
  );
}

function normalize(value: string) {
  return value
    .replace(/\s+/g, "")
    .replace(/-?(?:\d*\.)?\d+/g, (number) => Number(number).toString());
}

describe("ClauseOS design tokens", () => {
  const runtimeTokenMap = tokenMap(runtimeTokens);
  const canonicalTokenMap = tokenMap(canonicalTokens);
  const runtimeTokenNames = [...runtimeTokenMap.keys()].sort();

  it("defines every runtime token in the canonical design system", () => {
    expect(
      runtimeTokenNames.filter((token) => !canonicalTokenMap.has(token)),
    ).toEqual([]);
  });

  it.each(runtimeTokenNames)(
    "keeps --lyl-%s synchronized with the canonical design system",
    (token) => {
      expect(normalize(runtimeTokenMap.get(token) ?? "")).toBe(
        normalize(canonicalTokenMap.get(token) ?? ""),
      );
    },
  );

  it("uses generated local caustics instead of a synthetic ellipse", () => {
    const causticRule = [
      ...primitives.matchAll(/\.lyl-glass-caustic::after\s*{([\s\S]*?)\n}/g),
    ]
      .map((match) => match[1])
      .find((rule) => rule.includes("background-size"));

    expect(causticRule).toContain("var(--lyl-caustic-texture)");
    expect(causticRule).toContain("background-size: 420px 236px");
    expect(causticRule).not.toMatch(/background(?:-image)?:\s*radial-gradient/);
  });
});
