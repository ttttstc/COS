/* eslint-disable react-refresh/only-export-components -- panel factory and renderer intentionally share the same field adapters */
import {
  CounselSummaryCard,
  EmptyState,
  EvidenceCard,
  ContextReferenceCard,
  InlineAlert,
  MaterialTabs,
  ResearchPlanCard,
  VerticalResearchProgress,
  type EvidenceRelation,
  type MaterialTabId,
  type ProgressItem,
} from "@/components/clauseos";
import {
  parseCounselState,
  toMaterialTabs,
  type CounselRecord,
} from "@/lib/counsel-state";

function text(record: CounselRecord | undefined, ...keys: string[]) {
  for (const key of keys) {
    const value = record?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function strings(record: CounselRecord | undefined, ...keys: string[]) {
  for (const key of keys) {
    const value = record?.[key];
    if (Array.isArray(value)) {
      const result = value.filter(
        (item): item is string => typeof item === "string" && !!item.trim(),
      );
      if (result.length) return result;
    }
  }
  return [];
}

function researchPlanFields(record: CounselRecord | undefined) {
  return {
    unknowns: strings(record, "unknowns", "key_unknowns"),
    angles: strings(record, "angles", "research_angles", "proposed_angles"),
    stopConditions: strings(record, "stop_conditions", "stopping_conditions"),
  };
}

function level(value: unknown): "high" | "medium" | "low" {
  return value === "high" || value === "low" ? value : "medium";
}

function relation(value: unknown): EvidenceRelation {
  return value === "support" ||
    value === "oppose" ||
    value === "limit" ||
    value === "context"
    ? value
    : "context";
}

function CounselPanel({ value }: { value: unknown }) {
  const state = parseCounselState(value);
  const material = toMaterialTabs(value).find((tab) => tab.id === "counsel");
  if (!material || material.empty) {
    return (
      <EmptyState
        compact
        title="尚未形成参谋结论"
        description="参谋完成分析后，主要矛盾、明确建议与改判条件会出现在这里。"
      />
    );
  }

  const recommendation = state.recommendation;
  const recommendationText = text(
    recommendation,
    "recommendation",
    "summary",
    "decision",
    "text",
  );
  if (!state.main_contradiction || !recommendationText) {
    return (
      <div className="cos-material-stack">
        {state.error && (
          <InlineAlert
            tone="error"
            title="结论生成失败"
          >
            {state.error}
          </InlineAlert>
        )}
        <EmptyState
          compact
          title="结论仍在形成"
          description="当前状态尚不包含完整的主要矛盾与明确建议。"
        />
      </div>
    );
  }

  return (
    <CounselSummaryCard
      currentStage={material.content.currentStage ?? "已形成建议"}
      mainContradiction={state.main_contradiction}
      recommendation={recommendationText}
      confidence={state.confidence}
      changeConditions={state.reconsider_when ?? []}
      deferItems={strings(recommendation, "defer_items", "defer", "not_now")}
    />
  );
}

function EvidencePanel({ records }: { records: CounselRecord[] }) {
  const visible = records.flatMap((record, index) => {
    const title = text(record, "title", "claim", "name");
    const summary = text(record, "summary", "description", "content");
    if (!title || !summary) return [];
    return [
      <EvidenceCard
        key={text(record, "id") ?? `${title}-${index}`}
        id={text(record, "id") ?? `evidence-${index}`}
        title={title}
        summary={summary}
        relation={relation(record.relation)}
        relevance={level(record.relevance)}
        freshness={level(record.freshness)}
        sourceName={
          text(record, "source_name", "source", "publisher") ?? "来源待补充"
        }
        sourceUrl={text(record, "source_url", "url")}
        publishedAt={text(record, "published_at", "date")}
      />,
    ];
  });

  return visible.length ? (
    <div className="cos-material-stack">{visible}</div>
  ) : (
    <EmptyState
      compact
      title="尚无关键证据"
      description="只有真正会改变判断的证据才会进入此处。"
    />
  );
}

function HistoryPanel({ value }: { value: unknown }) {
  const state = parseCounselState(value);
  const records = [
    ...(state.context_snapshot ? [state.context_snapshot] : []),
    ...(state.historical_patterns ?? []),
  ];
  const visible = records.flatMap((record, index) => {
    const title = text(record, "title", "name", "pattern");
    const summary = text(record, "summary", "description", "content");
    if (!title || !summary) return [];
    const confidence = record.confidence;
    return [
      <ContextReferenceCard
        key={text(record, "id") ?? `${title}-${index}`}
        id={text(record, "id") ?? `history-${index}`}
        title={title}
        summary={summary}
        sourceName={text(record, "source_name", "source") ?? "议题历史"}
        capturedAt={text(record, "captured_at", "date")}
        confidence={
          typeof confidence === "number" && confidence >= 0 && confidence <= 100
            ? confidence
            : undefined
        }
      />,
    ];
  });

  return visible.length ? (
    <div className="cos-material-stack">{visible}</div>
  ) : (
    <EmptyState
      compact
      title="暂无历史依据"
      description="可复用的旧议题、长期偏好与历史模式会出现在这里。"
    />
  );
}

function ResearchPanel({ record }: { record: CounselRecord | undefined }) {
  const { unknowns, angles, stopConditions } = researchPlanFields(record);
  const progressState: ProgressItem["state"] =
    record?.status === "complete" || record?.status === "completed"
      ? "complete"
      : record?.status === "running"
        ? "running"
        : record?.status === "failed"
          ? "failed"
          : record?.status === "waiting_user" || record?.status === "blocked"
            ? "waiting_user"
            : "pending";
  const progressItems: ProgressItem[] = [
    ...(unknowns.length
      ? [
          {
            id: "research-unknowns",
            label: "确认关键未知",
            detail: unknowns.join("；"),
            state: progressState,
          },
        ]
      : []),
    ...(angles.length
      ? [
          {
            id: "research-angles",
            label: "执行调研角度",
            detail: angles.join("；"),
            state: progressState,
          },
        ]
      : []),
    ...(stopConditions.length
      ? [
          {
            id: "research-stop-conditions",
            label: "检查停止条件",
            detail: stopConditions.join("；"),
            state: progressState,
          },
        ]
      : []),
  ];

  if (!record || progressItems.length === 0) {
    return (
      <EmptyState
        compact
        title="尚未生成调研计划"
        description="需要外部事实时，关键未知、调研角度与停止条件会出现在这里。"
      />
    );
  }
  return (
    <div className="cos-material-stack">
      <ResearchPlanCard
        title={text(record, "title") ?? "调研计划"}
        status={
          record.status === "complete" || record.status === "completed"
            ? "complete"
            : record.status === "running"
              ? "running"
              : "draft"
        }
        unknowns={unknowns}
        angles={angles}
        stopConditions={stopConditions}
      />
      <VerticalResearchProgress items={progressItems} />
    </div>
  );
}

export function CounselMaterials({
  value,
  activeTab,
  onTabChange,
}: {
  value: unknown;
  activeTab: MaterialTabId;
  onTabChange(tab: MaterialTabId): void;
}) {
  const view = createCounselMaterialView(value);
  return (
    <MaterialTabs
      activeTab={activeTab}
      onTabChange={onTabChange}
      counts={view.counts}
      panels={view.panels}
    />
  );
}

export function createCounselMaterialView(value: unknown) {
  const state = parseCounselState(value);
  const researchFields = researchPlanFields(state.research_plan);
  const hasResearchFields = Object.values(researchFields).some(
    (items) => items.length > 0,
  );
  return {
    counts: {
      counsel: toMaterialTabs(value).find((tab) => tab.id === "counsel")?.empty
        ? 0
        : 1,
      evidence: state.evidence?.length ?? 0,
      history:
        (state.context_snapshot ? 1 : 0) +
        (state.historical_patterns?.length ?? 0),
      research: hasResearchFields ? 1 : 0,
    },
    panels: {
      counsel: <CounselPanel value={value} />,
      evidence: <EvidencePanel records={state.evidence ?? []} />,
      history: <HistoryPanel value={value} />,
      research: <ResearchPanel record={state.research_plan} />,
    },
  };
}
