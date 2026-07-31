"use client";

import { useCallback, useEffect, useState } from "react";

import type { MaterialTabId } from "./counsel-state";

export const WORKBENCH_PREFERENCES_STORAGE_KEY = "lyl:workbench:v1";

export const MATERIAL_PANEL_TABS: readonly MaterialTabId[] = [
  "counsel",
  "evidence",
  "history",
  "research",
];

const MATERIAL_PANEL_MIN_WIDTH = 320;
const MATERIAL_PANEL_MAX_WIDTH = 560;
const WORKSPACE_MIN_WIDTH = 600;
const WORKBENCH_LAYOUT_CHROME = 48;

export interface WorkbenchPreferences {
  materialPanel: {
    activeTab: MaterialTabId;
    open: boolean;
    width: number;
  };
}

export interface WorkbenchPreferencesController {
  hydrated: boolean;
  materialPanelMaxWidth: number;
  preferences: WorkbenchPreferences;
  setMaterialPanelOpen(open: boolean): void;
  setMaterialPanelTab(tab: MaterialTabId): void;
  setMaterialPanelWidth(width: number): void;
  toggleMaterialPanel(): void;
}

type StorageReader = Pick<Storage, "getItem">;
type StorageWriter = Pick<Storage, "setItem">;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isMaterialTab(value: unknown): value is MaterialTabId {
  return (
    typeof value === "string" &&
    MATERIAL_PANEL_TABS.includes(value as MaterialTabId)
  );
}

function getNavigatorWidth(viewportWidth: number): number {
  if (viewportWidth >= 1440) return 272;
  if (viewportWidth >= 1280) return 240;
  return 72;
}

export function getDefaultMaterialPanelWidth(viewportWidth: number): number {
  if (viewportWidth >= 1440) return 392;
  if (viewportWidth >= 1280) return 360;
  return 320;
}

export function getMaterialPanelMaxWidth(viewportWidth: number): number {
  const availableWidth =
    viewportWidth -
    getNavigatorWidth(viewportWidth) -
    WORKSPACE_MIN_WIDTH -
    WORKBENCH_LAYOUT_CHROME;

  return Math.max(
    MATERIAL_PANEL_MIN_WIDTH,
    Math.min(MATERIAL_PANEL_MAX_WIDTH, availableWidth),
  );
}

export function clampMaterialPanelWidth(
  width: number,
  viewportWidth: number,
): number {
  const fallback = getDefaultMaterialPanelWidth(viewportWidth);
  if (!Number.isFinite(width)) return fallback;

  const maximum = getMaterialPanelMaxWidth(viewportWidth);

  return Math.round(
    Math.min(maximum, Math.max(MATERIAL_PANEL_MIN_WIDTH, width)),
  );
}

export function createDefaultWorkbenchPreferences(
  viewportWidth = 1440,
): WorkbenchPreferences {
  return {
    materialPanel: {
      activeTab: "counsel",
      open: true,
      width: getDefaultMaterialPanelWidth(viewportWidth),
    },
  };
}

export function parseWorkbenchPreferences(
  value: unknown,
  viewportWidth = 1440,
): WorkbenchPreferences {
  const defaults = createDefaultWorkbenchPreferences(viewportWidth);
  if (!isRecord(value) || !isRecord(value.materialPanel)) return defaults;

  const panel = value.materialPanel;
  return {
    materialPanel: {
      activeTab: isMaterialTab(panel.activeTab)
        ? panel.activeTab
        : defaults.materialPanel.activeTab,
      open:
        typeof panel.open === "boolean"
          ? panel.open
          : defaults.materialPanel.open,
      width:
        typeof panel.width === "number"
          ? clampMaterialPanelWidth(panel.width, viewportWidth)
          : defaults.materialPanel.width,
    },
  };
}

export function loadWorkbenchPreferences(
  storage: StorageReader,
  viewportWidth = 1440,
): WorkbenchPreferences {
  try {
    const raw = storage.getItem(WORKBENCH_PREFERENCES_STORAGE_KEY);
    if (!raw) return createDefaultWorkbenchPreferences(viewportWidth);
    return parseWorkbenchPreferences(JSON.parse(raw), viewportWidth);
  } catch {
    return createDefaultWorkbenchPreferences(viewportWidth);
  }
}

export function saveWorkbenchPreferences(
  storage: StorageWriter,
  preferences: WorkbenchPreferences,
): void {
  try {
    storage.setItem(
      WORKBENCH_PREFERENCES_STORAGE_KEY,
      JSON.stringify(preferences),
    );
  } catch {
    // Storage can be unavailable in private browsing or a locked-down embed.
  }
}

export function useWorkbenchPreferences(): WorkbenchPreferencesController {
  const [preferences, setPreferences] = useState<WorkbenchPreferences>(() =>
    createDefaultWorkbenchPreferences(),
  );
  const [hydrated, setHydrated] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(1440);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setViewportWidth(window.innerWidth);
      setPreferences(
        loadWorkbenchPreferences(window.localStorage, window.innerWidth),
      );
      setHydrated(true);
    });

    const handleResize = () => {
      setViewportWidth(window.innerWidth);
      setPreferences((previous) => {
        const width = clampMaterialPanelWidth(
          previous.materialPanel.width,
          window.innerWidth,
        );
        if (width === previous.materialPanel.width) return previous;
        const next = {
          ...previous,
          materialPanel: { ...previous.materialPanel, width },
        };
        saveWorkbenchPreferences(window.localStorage, next);
        return next;
      });
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const updatePreferences = useCallback(
    (
      update: (previous: WorkbenchPreferences) => WorkbenchPreferences,
    ): void => {
      setPreferences((previous) => {
        const next = update(previous);
        if (typeof window !== "undefined") {
          saveWorkbenchPreferences(window.localStorage, next);
        }
        return next;
      });
    },
    [],
  );

  const setMaterialPanelOpen = useCallback(
    (open: boolean) => {
      updatePreferences((previous) => ({
        ...previous,
        materialPanel: { ...previous.materialPanel, open },
      }));
    },
    [updatePreferences],
  );

  const setMaterialPanelTab = useCallback(
    (activeTab: MaterialTabId) => {
      updatePreferences((previous) => ({
        ...previous,
        materialPanel: { ...previous.materialPanel, activeTab },
      }));
    },
    [updatePreferences],
  );

  const setMaterialPanelWidth = useCallback(
    (width: number) => {
      updatePreferences((previous) => ({
        ...previous,
        materialPanel: {
          ...previous.materialPanel,
          width: clampMaterialPanelWidth(
            width,
            typeof window === "undefined" ? 1440 : window.innerWidth,
          ),
        },
      }));
    },
    [updatePreferences],
  );

  const toggleMaterialPanel = useCallback(() => {
    updatePreferences((previous) => ({
      ...previous,
      materialPanel: {
        ...previous.materialPanel,
        open: !previous.materialPanel.open,
      },
    }));
  }, [updatePreferences]);

  return {
    hydrated,
    materialPanelMaxWidth: getMaterialPanelMaxWidth(viewportWidth),
    preferences,
    setMaterialPanelOpen,
    setMaterialPanelTab,
    setMaterialPanelWidth,
    toggleMaterialPanel,
  };
}
