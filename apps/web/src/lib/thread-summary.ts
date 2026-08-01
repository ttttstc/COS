import {
  getCounselMode,
  isCounselMode,
  readCounselMode,
  type CounselMode,
} from "@/lib/counsel-mode";
import type { Thread, ThreadStatus } from "@langchain/langgraph-sdk";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

const STATUS_LABELS: Record<ThreadStatus, string> = {
  busy: "进行中",
  interrupted: "待用户裁决",
  idle: "已形成建议",
  error: "需要处理",
};

export function getThreadMode(thread: Thread): CounselMode {
  const values = thread.values;
  if (typeof values === "object" && values !== null && !Array.isArray(values)) {
    const mode = (values as Record<string, unknown>).mode;
    if (isCounselMode(mode)) return mode;
  }
  return readCounselMode(thread.metadata?.mode);
}

export function getThreadModeLabel(thread: Thread): string {
  return getCounselMode(getThreadMode(thread)).shortLabel;
}

export function getThreadStatusLabel(status: ThreadStatus): string {
  return STATUS_LABELS[status];
}

export function getPendingInterruptCount(thread: Thread): number {
  return Object.values(thread.interrupts ?? {}).reduce(
    (count, interrupts) => count + interrupts.length,
    0,
  );
}

export function getThreadUpdatedLabel(updatedAt: string): string {
  return formatDistanceToNow(new Date(updatedAt), {
    addSuffix: true,
    locale: zhCN,
  });
}
