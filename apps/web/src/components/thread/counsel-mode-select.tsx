import {
  ALL_COUNSEL_MODES,
  DEFAULT_COUNSEL_MODE,
  getCounselMode,
  type CounselMode,
} from "@/lib/counsel-mode";
import { X } from "lucide-react";

export function CounselModeSelect({
  mode,
  onChange,
}: {
  mode: CounselMode;
  onChange: (mode: CounselMode) => void;
}) {
  const active = getCounselMode(mode);

  return (
    <div className="flex items-center gap-2 px-3 pt-3">
      <span className="text-muted-foreground text-xs">议题类型</span>
      <label className="bg-background inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium">
        <span className="sr-only">切换议题类型</span>
        <select
          aria-label="切换议题类型"
          value={mode}
          onChange={(event) => onChange(event.target.value as CounselMode)}
          className="cursor-pointer appearance-none bg-transparent pr-1 outline-none"
        >
          {ALL_COUNSEL_MODES.map((item) => (
            <option
              key={item.mode}
              value={item.mode}
            >
              {item.shortLabel}
            </option>
          ))}
        </select>
      </label>
      {mode !== DEFAULT_COUNSEL_MODE && (
        <button
          type="button"
          aria-label={`清除${active.label}模式`}
          onClick={() => onChange(DEFAULT_COUNSEL_MODE)}
          className="text-muted-foreground hover:text-foreground rounded-full p-1"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}
