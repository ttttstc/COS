import { describe, expect, it, vi } from "vitest";

import {
  WORKBENCH_PREFERENCES_STORAGE_KEY,
  clampMaterialPanelWidth,
  createDebouncedPreferenceSaver,
  createDefaultWorkbenchPreferences,
  getMaterialPanelMaxWidth,
  loadWorkbenchPreferences,
  parseWorkbenchPreferences,
  saveWorkbenchPreferences,
} from "./workbench-preferences";

describe("workbench preferences", () => {
  it("uses the canonical material panel width at each desktop breakpoint", () => {
    expect(createDefaultWorkbenchPreferences(1440).materialPanel.width).toBe(
      392,
    );
    expect(createDefaultWorkbenchPreferences(1280).materialPanel.width).toBe(
      360,
    );
    expect(createDefaultWorkbenchPreferences(1024).materialPanel.width).toBe(
      320,
    );
  });

  it("clamps a persisted resize without taking space from the 600px workspace", () => {
    expect(getMaterialPanelMaxWidth(1024)).toBe(320);
    expect(getMaterialPanelMaxWidth(1280)).toBe(392);
    expect(getMaterialPanelMaxWidth(1440)).toBe(520);
    expect(clampMaterialPanelWidth(900, 1024)).toBe(320);
    expect(clampMaterialPanelWidth(900, 1280)).toBe(392);
    expect(clampMaterialPanelWidth(900, 1440)).toBe(520);
    expect(clampMaterialPanelWidth(200, 1440)).toBe(320);
    expect(clampMaterialPanelWidth(Number.NaN, 1280)).toBe(360);
  });

  it("keeps valid fields and repairs malformed persisted data", () => {
    expect(
      parseWorkbenchPreferences(
        {
          materialPanel: {
            activeTab: "history",
            open: false,
            width: 410,
          },
        },
        1280,
      ),
    ).toEqual({
      materialPanel: { activeTab: "history", open: false, width: 392 },
    });

    expect(
      parseWorkbenchPreferences(
        {
          materialPanel: {
            activeTab: "unknown",
            open: "yes",
            width: 9999,
          },
        },
        1024,
      ),
    ).toEqual({
      materialPanel: { activeTab: "counsel", open: true, width: 320 },
    });
  });

  it("loads and saves through an injected storage boundary", () => {
    const setItem = vi.fn();
    const preferences = createDefaultWorkbenchPreferences(1440);

    saveWorkbenchPreferences({ setItem }, preferences);
    expect(setItem).toHaveBeenCalledWith(
      WORKBENCH_PREFERENCES_STORAGE_KEY,
      JSON.stringify(preferences),
    );

    expect(
      loadWorkbenchPreferences(
        {
          getItem: () =>
            JSON.stringify({
              materialPanel: {
                activeTab: "evidence",
                open: false,
                width: 380,
              },
            }),
        },
        1440,
      ),
    ).toEqual({
      materialPanel: { activeTab: "evidence", open: false, width: 380 },
    });
  });

  it("falls back when storage is inaccessible or corrupted", () => {
    expect(
      loadWorkbenchPreferences(
        {
          getItem: () => {
            throw new Error("blocked");
          },
        },
        1280,
      ),
    ).toEqual(createDefaultWorkbenchPreferences(1280));

    expect(
      loadWorkbenchPreferences({ getItem: () => "not-json" }, 1024),
    ).toEqual(createDefaultWorkbenchPreferences(1024));
  });

  it("coalesces rapid resize writes into one trailing save", () => {
    vi.useFakeTimers();
    const setItem = vi.fn();
    const saver = createDebouncedPreferenceSaver({ setItem }, 150);
    const preferences = createDefaultWorkbenchPreferences(1440);

    for (let index = 0; index < 10; index += 1) {
      saver.schedule({
        ...preferences,
        materialPanel: { ...preferences.materialPanel, width: 392 + index },
      });
      vi.advanceTimersByTime(20);
    }

    expect(setItem).not.toHaveBeenCalled();
    vi.advanceTimersByTime(150);
    expect(setItem).toHaveBeenCalledTimes(1);
    saver.cancel();
    vi.useRealTimers();
  });

  it("warns when preference storage cannot be written", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    saveWorkbenchPreferences(
      {
        setItem: () => {
          throw new Error("blocked");
        },
      },
      createDefaultWorkbenchPreferences(),
    );
    expect(warn).toHaveBeenCalledWith(
      "Unable to save workbench preferences",
      expect.any(Error),
    );
    warn.mockRestore();
  });
});
