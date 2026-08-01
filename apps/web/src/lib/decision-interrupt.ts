export type StructuredInterruptKind =
  "scope_clarification" | "value_tradeoff" | "research_approval";

export interface StructuredDecisionOption {
  cost?: string;
  description?: string;
  id: string;
  recommended?: boolean;
  title: string;
}

export interface StructuredDecisionInterrupt {
  allowReportNow: boolean;
  interruptId: string;
  kind: StructuredInterruptKind;
  options: StructuredDecisionOption[];
  protocolInterruptId?: string;
  question: string;
  rationale?: string;
  recommendedOptionId?: string;
  resumeValues: string[];
  title: string;
}

type CounselInterruptValue =
  | ScopeClarificationInterrupt
  | ValueTradeoffInterrupt
  | ResearchApprovalInterrupt;

interface ScopeClarificationInterrupt {
  options: Array<{
    description?: string;
    id: string;
    label: string;
  }>;
  question: string;
  recommended?: string;
  type: "scope_clarification";
}

interface ValueTradeoffInterrupt {
  options: Array<{
    cost: string;
    id: string;
    label: string;
  }>;
  question: string;
  recommended?: string;
  type: "value_tradeoff";
  why_needed: string;
}

interface ResearchApprovalInterrupt {
  actions: Array<"approve" | "modify" | "report_now">;
  key_unknowns: string[];
  proposed_angles: string[];
  stop_conditions: string[];
  type: "research_approval";
}

interface InterruptEnvelope {
  id?: string;
  value: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized || undefined;
}

function readStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const parsed = value.flatMap((item) => {
    const text = readString(item);
    return text ? [text] : [];
  });
  return parsed.length === value.length ? parsed : undefined;
}

function readEnvelope(value: unknown): InterruptEnvelope | undefined {
  if (!isRecord(value)) return undefined;
  const protocolId = readString(value.id);
  if ("value" in value) {
    return {
      ...(protocolId ? { id: protocolId } : {}),
      value: value.value,
    };
  }
  return { value };
}

function hasUniqueIds(options: Array<{ id: string }>): boolean {
  return new Set(options.map((option) => option.id)).size === options.length;
}

function parseScopeClarification(
  value: Record<string, unknown>,
): ScopeClarificationInterrupt | undefined {
  const question = readString(value.question);
  if (!question || !Array.isArray(value.options)) return undefined;

  const options = value.options.flatMap((option) => {
    if (!isRecord(option)) return [];
    const id = readString(option.id);
    const label = readString(option.label);
    const description = readString(option.description);
    return id && label
      ? [{ id, label, ...(description ? { description } : {}) }]
      : [];
  });
  if (
    options.length !== value.options.length ||
    options.length < 2 ||
    options.length > 4 ||
    !hasUniqueIds(options)
  ) {
    return undefined;
  }

  const recommended = readString(value.recommended);
  if (recommended && !options.some((option) => option.id === recommended)) {
    return undefined;
  }

  return {
    type: "scope_clarification",
    question,
    options,
    ...(recommended ? { recommended } : {}),
  };
}

function parseValueTradeoff(
  value: Record<string, unknown>,
): ValueTradeoffInterrupt | undefined {
  const question = readString(value.question);
  const whyNeeded = readString(value.why_needed);
  if (!question || !whyNeeded || !Array.isArray(value.options)) {
    return undefined;
  }

  const options = value.options.flatMap((option) => {
    if (!isRecord(option)) return [];
    const id = readString(option.id);
    const label = readString(option.label);
    const cost = readString(option.cost);
    return id && label && cost ? [{ id, label, cost }] : [];
  });
  if (
    options.length !== value.options.length ||
    options.length < 2 ||
    options.length > 4 ||
    !hasUniqueIds(options)
  ) {
    return undefined;
  }

  const recommended = readString(value.recommended);
  if (recommended && !options.some((option) => option.id === recommended)) {
    return undefined;
  }

  return {
    type: "value_tradeoff",
    question,
    why_needed: whyNeeded,
    options,
    ...(recommended ? { recommended } : {}),
  };
}

function parseResearchApproval(
  value: Record<string, unknown>,
): ResearchApprovalInterrupt | undefined {
  const keyUnknowns = readStringArray(value.key_unknowns);
  const proposedAngles = readStringArray(value.proposed_angles);
  const stopConditions = readStringArray(value.stop_conditions);
  if (
    !keyUnknowns ||
    !proposedAngles ||
    !stopConditions ||
    !Array.isArray(value.actions)
  ) {
    return undefined;
  }

  const allowedActions = new Set(["approve", "modify", "report_now"]);
  const actions = value.actions.filter(
    (action): action is "approve" | "modify" | "report_now" =>
      typeof action === "string" && allowedActions.has(action),
  );
  if (
    actions.length === 0 ||
    actions.length !== value.actions.length ||
    new Set(actions).size !== actions.length
  ) {
    return undefined;
  }

  return {
    type: "research_approval",
    key_unknowns: keyUnknowns,
    proposed_angles: proposedAngles,
    stop_conditions: stopConditions,
    actions,
  };
}

function parseCounselInterruptValue(
  value: unknown,
): CounselInterruptValue | undefined {
  if (!isRecord(value)) return undefined;
  if (value.type === "scope_clarification") {
    return parseScopeClarification(value);
  }
  if (value.type === "value_tradeoff") {
    return parseValueTradeoff(value);
  }
  if (value.type === "research_approval") {
    return parseResearchApproval(value);
  }
  return undefined;
}

function toResearchRationale(value: ResearchApprovalInterrupt): string {
  const details = [
    value.key_unknowns.length > 0
      ? `关键未知：${value.key_unknowns.join("；")}`
      : undefined,
    value.proposed_angles.length > 0
      ? `调研角度：${value.proposed_angles.join("；")}`
      : undefined,
    value.stop_conditions.length > 0
      ? `停止条件：${value.stop_conditions.join("；")}`
      : undefined,
  ];
  return details.filter(Boolean).join("。\n");
}

function toPresentation(
  value: CounselInterruptValue,
  envelope: InterruptEnvelope,
  fallbackIndex: number,
): StructuredDecisionInterrupt {
  const protocolInterruptId = envelope.id;
  const interruptId =
    protocolInterruptId ?? `counsel-interrupt-${value.type}-${fallbackIndex}`;

  if (value.type === "scope_clarification") {
    return {
      allowReportNow: true,
      interruptId,
      kind: value.type,
      options: value.options.map((option) => ({
        id: option.id,
        title: option.label,
        ...(option.description ? { description: option.description } : {}),
        ...(option.id === value.recommended ? { recommended: true } : {}),
      })),
      ...(protocolInterruptId ? { protocolInterruptId } : {}),
      question: value.question,
      ...(value.recommended ? { recommendedOptionId: value.recommended } : {}),
      resumeValues: [...value.options.map((option) => option.id), "report_now"],
      title: "确认议题范围",
    };
  }

  if (value.type === "value_tradeoff") {
    return {
      allowReportNow: true,
      interruptId,
      kind: value.type,
      options: value.options.map((option) => ({
        cost: option.cost,
        id: option.id,
        title: option.label,
        ...(option.id === value.recommended ? { recommended: true } : {}),
      })),
      ...(protocolInterruptId ? { protocolInterruptId } : {}),
      question: value.question,
      rationale: value.why_needed,
      ...(value.recommended ? { recommendedOptionId: value.recommended } : {}),
      resumeValues: [...value.options.map((option) => option.id), "report_now"],
      title: "确认价值取舍",
    };
  }

  const optionLabels = {
    approve: {
      description: "按计划继续收集会实质影响判断的证据。",
      title: "批准调研",
    },
    modify: {
      description: "先补充或调整调研范围，再继续执行。",
      title: "修改计划",
    },
  } as const;
  const options = value.actions.flatMap((action) =>
    action === "report_now"
      ? []
      : [
          {
            id: action,
            title: optionLabels[action].title,
            description: optionLabels[action].description,
          },
        ],
  );

  return {
    allowReportNow: value.actions.includes("report_now"),
    interruptId,
    kind: value.type,
    options,
    ...(protocolInterruptId ? { protocolInterruptId } : {}),
    question: "是否按该调研计划继续？",
    rationale: toResearchRationale(value),
    resumeValues: value.actions,
    title: "批准调研计划",
  };
}

export function parseStructuredDecisionInterrupt(
  input: unknown,
): StructuredDecisionInterrupt | undefined {
  if (Array.isArray(input)) return undefined;
  const envelope = readEnvelope(input);
  if (!envelope) return undefined;
  const value = parseCounselInterruptValue(envelope.value);
  return value ? toPresentation(value, envelope, 0) : undefined;
}

export function buildStructuredInterruptResume(
  interrupt: StructuredDecisionInterrupt,
  selection: string,
): string | Record<string, string> {
  if (!interrupt.resumeValues.includes(selection)) {
    throw new Error(`Unsupported interrupt selection: ${selection}`);
  }
  return interrupt.protocolInterruptId
    ? { [interrupt.protocolInterruptId]: selection }
    : selection;
}
