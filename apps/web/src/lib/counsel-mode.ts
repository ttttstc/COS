export const COUNSEL_MODES = [
  {
    mode: "ask",
    label: "下一步做什么",
    shortLabel: "下一步",
    description: "从当前局面中找出唯一主行动",
    placeholder: "描述你现在卡住的事情，或直接问“下一步做什么”",
  },
  {
    mode: "decide",
    label: "帮我做决定",
    shortLabel: "决策",
    description: "比较选项，形成明确预决策",
    placeholder: "描述你需要拍板的选择",
  },
  {
    mode: "research",
    label: "调研后判断",
    shortLabel: "调研",
    description: "围绕关键未知调研并更新判断",
    placeholder: "描述需要调研并形成判断的问题",
  },
  {
    mode: "diagnose",
    label: "诊断历史思维",
    shortLabel: "诊断",
    description: "从历史会商中寻找可验证的模式",
    placeholder: "描述要诊断的时间范围或主题",
  },
] as const;

export const COUNSEL_MODE_VALUES = [
  "ask",
  "decide",
  "research",
  "diagnose",
  "discuss",
] as const;

export type ActiveCounselMode = (typeof COUNSEL_MODES)[number]["mode"];
export type CounselMode = ActiveCounselMode | "discuss";

export const DEFAULT_COUNSEL_MODE: CounselMode = "discuss";

const DISCUSS_MODE = {
  mode: DEFAULT_COUNSEL_MODE,
  label: "普通会商",
  shortLabel: "会商",
  description: "自由讨论当前问题",
  placeholder: "和刘亚楼讨论……",
} as const;

export const ALL_COUNSEL_MODES = [...COUNSEL_MODES, DISCUSS_MODE] as const;

export function isCounselMode(value: unknown): value is CounselMode {
  return ALL_COUNSEL_MODES.some(({ mode }) => mode === value);
}

export function getCounselMode(mode: CounselMode) {
  return ALL_COUNSEL_MODES.find((item) => item.mode === mode) ?? DISCUSS_MODE;
}

export function readCounselMode(value: unknown): CounselMode {
  return isCounselMode(value) ? value : DEFAULT_COUNSEL_MODE;
}

export function buildCounselRunContext(
  mode: CounselMode,
  context: Record<string, unknown>,
): Record<string, unknown> & { mode: CounselMode } {
  return { ...context, mode };
}
