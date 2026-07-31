import { cn } from "@/lib/utils";

export function LylMark({ className }: { className?: string }) {
  return (
    <span
      aria-label="刘亚楼参谋台"
      className={cn(
        "bg-primary text-primary-foreground inline-flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-semibold tracking-tight",
        className,
      )}
    >
      LYL
    </span>
  );
}
