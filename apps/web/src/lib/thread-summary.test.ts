import type { Thread } from "@langchain/langgraph-sdk";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getThreadMode,
  getThreadModeLabel,
  getPendingInterruptCount,
  getThreadStatusLabel,
  getThreadUpdatedLabel,
} from "./thread-summary";

function makeThread(overrides: Partial<Thread> = {}): Thread {
  return {
    thread_id: "thread-1",
    created_at: "2026-07-28T04:00:00.000Z",
    updated_at: "2026-07-28T04:05:00.000Z",
    state_updated_at: "2026-07-28T04:05:00.000Z",
    metadata: {},
    status: "idle",
    values: {},
    interrupts: {},
    ...overrides,
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("thread summaries", () => {
  it("reads counsel mode from state and falls back to legacy metadata", () => {
    expect(
      getThreadMode(
        makeThread({ values: { mode: "research" }, metadata: { mode: "ask" } }),
      ),
    ).toBe("research");
    expect(getThreadMode(makeThread({ metadata: { mode: "diagnose" } }))).toBe(
      "diagnose",
    );
    expect(getThreadModeLabel(makeThread())).toBe("讨论");
  });

  it("maps SDK status and updated time to reader-facing labels", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-28T04:10:00.000Z"));

    expect(getThreadStatusLabel("interrupted")).toBe("待用户裁决");
    expect(getThreadUpdatedLabel("2026-07-28T04:05:00.000Z")).toBe("5 分钟前");
  });

  it("counts all pending decisions for issue history", () => {
    expect(
      getPendingInterruptCount(
        makeThread({
          status: "interrupted",
          interrupts: {
            root: [{ id: "one" }, { id: "two" }],
            subgraph: [{ id: "three" }],
          },
        }),
      ),
    ).toBe(3);
  });
});
