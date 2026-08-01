import {
  CounselSummaryCard,
  EmptyState,
  EvidenceCard,
  ContextReferenceCard,
  InlineAlert,
  ResearchPlanCard,
  Select,
  StatusBadge,
  VerticalResearchProgress,
  type EvidenceRelation,
  type ProgressItem,
} from "@/components/clauseos";
import {
  parseCounselState,
  toMaterialTabs,
  type CounselRecord,
} from "@/lib/counsel-state";
import type { CounselArtifactView } from "@/lib/counsel-artifact";

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

interface ArtifactCardProps {
  artifact: CounselArtifactView;
}

function ArtifactSummary({ artifact }: ArtifactCardProps) {
  return (
    <CounselSummaryCard
      currentStage={artifact.currentStage}
      mainContradiction={artifact.mainContradiction}
      recommendation={artifact.recommendation}
      confidence={artifact.confidence}
      changeConditions={artifact.changeConditions}
      deferItems={artifact.deferItems}
    />
  );
}

export function NextActionCard(props: ArtifactCardProps) {
  return <ArtifactSummary {...props} />;
}

export function DecisionCard(props: ArtifactCardProps) {
  return <ArtifactSummary {...props} />;
}

export function DiagnosisCard(props: ArtifactCardProps) {
  return <ArtifactSummary {...props} />;
}

function ResearchCard(props: ArtifactCardProps) {
  return <ArtifactSummary {...props} />;
}

function ArtifactCard({ artifact }: ArtifactCardProps) {
  if (artifact.artifactType === "next_action") {
    return <NextActionCard artifact={artifact} />;
  }
  if (artifact.artifactType === "decision") {
    return <DecisionCard artifact={artifact} />;
  }
  if (artifact.artifactType === "diagnosis") {
    return <DiagnosisCard artifact={artifact} />;
  }
  return <ResearchCard artifact={artifact} />;
}

export function CounselPanel({
  value,
  artifact,
  artifactError,
  versions = [],
  onVersionChange,
}: {
  value: unknown;
  artifact?: CounselArtifactView;
  artifactError?: string;
  versions?: CounselArtifactView[];
  onVersionChange?: (version?: number) => void;
}) {
  const state = parseCounselState(value);
  const material = toMaterialTabs(value).find((tab) => tab.id === "counsel");
  if (artifact) {
    const artifactStatus =
      artifact.status === "draft"
        ? "流式草稿"
        : artifact.status === "final"
          ? "最终版本"
          : "旧版本";
    return (
      <div className="cos-material-stack">
        <div className="cos-artifact-version">
          <StatusBadge
            tone={
              artifact.status === "draft"
                ? "info"
                : artifact.status === "final"
                  ? "success"
                  : "neutral"
            }
          >
            v{artifact.version} · {artifactStatus}
          </StatusBadge>
          {versions.length > 1 && (
            <Select
              aria-label="查看建议版本"
              value={String(artifact.version)}
              options={[...versions]
                .sort((left, right) => right.version - left.version)
                .map((item) => ({
                  value: String(item.version),
                  label: `v${item.version} · ${item.status === "superseded" ? "旧版本" : item.status === "draft" ? "草稿" : "最终版本"}`,
                }))}
              onChange={(event) =>
                onVersionChange?.(Number(event.target.value))
              }
            />
          )}
          {artifact.changeReason && <p>改判原因：{artifact.changeReason}</p>}
        </div>
        <ArtifactCard artifact={artifact} />
      </div>
    );
  }
  if (!material || material.empty) {
    return (
      <div className="cos-material-stack">
        {artifactError && (
          <InlineAlert
            tone="error"
            title="建议卡格式异常"
          >
            {artifactError}，已降级展示可用内容。
          </InlineAlert>
        )}
        <EmptyState
          compact
          title="尚未形成参谋结论"
          description="参谋完成分析后，主要矛盾、明确建议与改判条件会出现在这里。"
        />
      </div>
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

export function EvidencePanel({ records }: { records: CounselRecord[] }) {
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

export function HistoryPanel({
  value,
  records: artifactRecords,
}: {
  value: unknown;
  records?: CounselRecord[];
}) {
  const state = parseCounselState(value);
  const records = artifactRecords ?? [
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

export function ResearchPanel({
  record,
}: {
  record: CounselRecord | undefined;
}) {
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
