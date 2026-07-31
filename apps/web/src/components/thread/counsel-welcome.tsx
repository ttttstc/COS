import { COUNSEL_MODES, type ActiveCounselMode } from "@/lib/counsel-mode";
import { Binoculars, BrainCircuit, Compass, Scale } from "lucide-react";

const ICONS = {
  ask: Compass,
  decide: Scale,
  research: Binoculars,
  diagnose: BrainCircuit,
} satisfies Record<ActiveCounselMode, typeof Compass>;

export function CounselWelcome({
  onSelectMode,
}: {
  onSelectMode: (mode: ActiveCounselMode) => void;
}) {
  return (
    <section
      aria-labelledby="counsel-welcome-title"
      className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-1"
    >
      <div className="text-center">
        <p className="text-muted-foreground mb-1 text-sm font-medium">
          刘亚楼参谋台
        </p>
        <h1
          id="counsel-welcome-title"
          className="text-2xl font-semibold tracking-tight sm:text-3xl"
        >
          今天需要参谋什么？
        </h1>
      </div>

      <div className="grid auto-cols-[minmax(220px,78vw)] grid-flow-col gap-3 overflow-x-auto pb-2 sm:grid-flow-row sm:grid-cols-2 sm:overflow-visible">
        {COUNSEL_MODES.map(({ mode, label, description }) => {
          const Icon = ICONS[mode];
          return (
            <button
              key={mode}
              type="button"
              onClick={() => onSelectMode(mode)}
              className="hover:border-foreground/20 hover:bg-muted/70 focus-visible:ring-ring flex min-h-24 items-start gap-3 rounded-xl border bg-white p-4 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              <span className="bg-primary/8 text-primary mt-0.5 rounded-lg p-2">
                <Icon className="size-5" />
              </span>
              <span>
                <span className="block font-medium">{label}</span>
                <span className="text-muted-foreground mt-1 block text-sm leading-5">
                  {description}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
