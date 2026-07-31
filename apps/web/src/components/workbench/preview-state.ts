export const WORKBENCH_PREVIEW_STATES = [
  "new",
  "running",
  "waiting",
  "ready",
] as const;

export type WorkbenchPreviewState = (typeof WORKBENCH_PREVIEW_STATES)[number];

export function isWorkbenchPreviewState(
  value: unknown,
): value is WorkbenchPreviewState {
  return WORKBENCH_PREVIEW_STATES.includes(value as WorkbenchPreviewState);
}
