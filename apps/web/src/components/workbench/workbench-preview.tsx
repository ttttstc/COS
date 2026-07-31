"use client";

import { useMemo, useState } from "react";

import {
  Button,
  EmptyState,
  FileUploadTrigger,
  StatusBadge,
  VerticalResearchProgress,
} from "@/components/clauseos/controls";
import {
  ContextReferenceCard,
  CounselMessageRenderer,
  CounselSummaryCard,
  DecisionInterruptCard,
  EvidenceCard,
  IssueComposer,
  IssueModeCard,
  IssueTopbar,
  ResearchPlanCard,
  StageProgress,
  ToolActivity,
} from "@/components/clauseos/business";
import { LYL_ICON_MAP } from "@/components/icons/lyl-icons";
import {
  COUNSEL_MODES,
  type ActiveCounselMode,
  type CounselMode,
} from "@/lib/counsel-mode";
import { useWorkbenchPreferences } from "@/lib/workbench-preferences";
import {
  ClauseOSWorkbench,
  CounselMaterialPanel,
  IssueNavigator,
  IssueWorkspace,
  WorkbenchTopbarIconButton,
  type WorkbenchIssue,
} from "./workbench-shell";
import type { WorkbenchPreviewState } from "./preview-state";

const ISSUES: WorkbenchIssue[] = [
  {
    id: "product-entry",
    title: "个人参谋产品第一版如何切入",
    mode: "research",
    status: "counsel_ready",
    updatedAt: "2026-08-01T09:42:00+08:00",
    updatedLabel: "09:42",
    unreadCount: 1,
  },
  {
    id: "pricing-proof",
    title: "下一阶段如何验证定价",
    mode: "decide",
    status: "waiting_user",
    updatedAt: "2026-08-01T08:26:00+08:00",
    updatedLabel: "08:26",
  },
  {
    id: "interview-plan",
    title: "本周用户访谈先做哪一组",
    mode: "research",
    status: "researching",
    updatedAt: "2026-07-31T20:18:00+08:00",
    updatedLabel: "昨天",
  },
  {
    id: "decision-pattern",
    title: "复盘最近三次产品方向摇摆",
    mode: "diagnose",
    status: "review_due",
    updatedAt: "2026-07-29T16:40:00+08:00",
    updatedLabel: "7 月 29 日",
  },
];

const SCENARIO = {
  new: {
    activeMode: "discuss" as const,
    issueId: undefined,
    mode: "discuss" as const,
    status: "draft" as const,
    title: "新建议题",
    updatedLabel: undefined,
  },
  running: {
    activeMode: "research" as const,
    issueId: "product-entry",
    mode: "research" as const,
    status: "researching" as const,
    title: "本周用户访谈先做哪一组",
    updatedLabel: "刚刚更新",
  },
  waiting: {
    activeMode: "decide" as const,
    issueId: "pricing-proof",
    mode: "decide" as const,
    status: "waiting_user" as const,
    title: "下一阶段如何验证定价",
    updatedLabel: "09:18 更新",
  },
  ready: {
    activeMode: "research" as const,
    issueId: "product-entry",
    mode: "research" as const,
    status: "counsel_ready" as const,
    title: "个人参谋产品第一版如何切入",
    updatedLabel: "09:42 更新",
  },
} satisfies Record<WorkbenchPreviewState, object>;

const STAGES = {
  running: [
    { id: "context", label: "恢复目标与约束", state: "complete" as const },
    { id: "unknown", label: "识别关键未知", state: "complete" as const },
    { id: "research", label: "检索关键证据", state: "running" as const },
    { id: "judgment", label: "形成判断", state: "pending" as const },
  ],
  waiting: [
    { id: "context", label: "恢复目标与约束", state: "complete" as const },
    { id: "options", label: "比较现实方案", state: "complete" as const },
    { id: "decision", label: "关键分歧裁决", state: "waiting_user" as const },
    { id: "judgment", label: "形成正式建议", state: "pending" as const },
  ],
  ready: [
    { id: "context", label: "恢复目标与约束", state: "complete" as const },
    { id: "unknown", label: "识别关键未知", state: "complete" as const },
    { id: "research", label: "核验关键证据", state: "complete" as const },
    { id: "judgment", label: "形成正式建议", state: "complete" as const },
  ],
};

const RESEARCH_PROGRESS = {
  running: [
    {
      id: "research-question",
      label: "确认关键未知",
      detail: "目标用户的真实决策频率",
      state: "complete" as const,
    },
    {
      id: "research-interviews",
      label: "执行目标用户访谈",
      detail: "正在核验付费触发点与现有替代方案",
      state: "running" as const,
    },
    {
      id: "research-stop-check",
      label: "检查停止条件",
      detail: "新证据不再改变建议方向时停止",
      state: "pending" as const,
    },
  ],
  waiting: [
    {
      id: "research-question",
      label: "确认关键未知",
      detail: "真实付费意愿与验证顺序",
      state: "complete" as const,
    },
    {
      id: "research-decision",
      label: "确认调研路径",
      detail: "需要用户决定先访谈还是先完成原型",
      state: "waiting_user" as const,
    },
    {
      id: "research-stop-check",
      label: "检查停止条件",
      detail: "完成路径确认后继续",
      state: "pending" as const,
    },
  ],
  ready: [
    {
      id: "research-question",
      label: "确认关键未知",
      detail: "目标用户的真实决策频率",
      state: "complete" as const,
    },
    {
      id: "research-interviews",
      label: "执行目标用户访谈",
      detail: "已核验付费触发点与现有替代方案",
      state: "complete" as const,
    },
    {
      id: "research-stop-check",
      label: "检查停止条件",
      detail: "已达到本轮调研停止条件",
      state: "complete" as const,
    },
  ],
};

export function WorkbenchPreview({ state }: { state: WorkbenchPreviewState }) {
  const scenario = SCENARIO[state];
  const [activeMode, setActiveMode] = useState<CounselMode>(
    scenario.activeMode,
  );
  const [selectedIssueId, setSelectedIssueId] = useState(scenario.issueId);
  const [composerValue, setComposerValue] = useState("");
  const [decision, setDecision] = useState("interviews-first");
  const {
    materialPanelMaxWidth,
    preferences,
    setMaterialPanelOpen,
    setMaterialPanelTab,
    setMaterialPanelWidth,
    toggleMaterialPanel,
  } = useWorkbenchPreferences();
  const {
    activeTab,
    open: materialOpen,
    width: materialWidth,
  } = preferences.materialPanel;

  const materialPanels = useMemo(() => createMaterialPanels(state), [state]);

  const topbar = (
    <IssueTopbar
      title={scenario.title}
      mode={scenario.mode}
      status={scenario.status}
      updatedAt={
        scenario.updatedLabel ? "2026-08-01T09:42:00+08:00" : undefined
      }
      updatedLabel={scenario.updatedLabel}
      actions={
        <>
          <WorkbenchTopbarIconButton label="搜索议题">
            <LYL_ICON_MAP.search aria-hidden="true" />
          </WorkbenchTopbarIconButton>
          <WorkbenchTopbarIconButton label="更多议题操作">
            <LYL_ICON_MAP.more aria-hidden="true" />
          </WorkbenchTopbarIconButton>
          <WorkbenchTopbarIconButton
            label={materialOpen ? "收起参谋材料" : "展开参谋材料"}
            onClick={toggleMaterialPanel}
          >
            {materialOpen ? (
              <LYL_ICON_MAP.collapse aria-hidden="true" />
            ) : (
              <LYL_ICON_MAP.expand aria-hidden="true" />
            )}
          </WorkbenchTopbarIconButton>
        </>
      }
    />
  );

  const composer = (
    <IssueComposer
      mode={activeMode}
      value={composerValue}
      disabled={state === "waiting"}
      streaming={state === "running"}
      onChange={setComposerValue}
      onSubmit={() => setComposerValue("")}
      onStop={() => undefined}
      attachmentSlot={
        <>
          <input
            id="workbench-preview-file"
            className="cos-workbench__visually-hidden"
            type="file"
            aria-label="添加附件"
            disabled={state === "waiting"}
          />
          <FileUploadTrigger
            inputId="workbench-preview-file"
            label="添加附件"
            disabled={state === "waiting"}
          />
        </>
      }
      statusSlot={
        state === "waiting" ? (
          <StatusBadge tone="warning">先完成裁决</StatusBadge>
        ) : state === "running" ? (
          <StatusBadge tone="success">正在调研</StatusBadge>
        ) : undefined
      }
    />
  );

  return (
    <ClauseOSWorkbench
      materialMaxWidth={materialPanelMaxWidth}
      materialOpen={materialOpen}
      materialWidth={materialWidth}
      onMaterialWidthChange={setMaterialPanelWidth}
      navigator={
        <IssueNavigator
          activeMode={activeMode}
          issues={ISSUES}
          selectedIssueId={selectedIssueId}
          onCreateIssue={() => {
            setSelectedIssueId(undefined);
            setActiveMode("discuss");
          }}
          onModeSelect={(mode) => {
            setActiveMode(mode);
            setSelectedIssueId(undefined);
          }}
          onOpenCommand={() => undefined}
          onSelectIssue={setSelectedIssueId}
        />
      }
      workspace={
        <IssueWorkspace
          topbar={topbar}
          composer={composer}
        >
          <PreviewWorkspace
            state={state}
            activeMode={activeMode}
            decision={decision}
            onDecisionChange={setDecision}
            onModeChange={setActiveMode}
          />
        </IssueWorkspace>
      }
      material={
        <CounselMaterialPanel
          activeTab={activeTab}
          counts={{
            evidence: state === "new" ? 0 : 2,
            history: state === "new" ? 0 : 1,
          }}
          onTabChange={setMaterialPanelTab}
          panels={materialPanels}
          headerAction={
            <WorkbenchTopbarIconButton
              label="收起参谋材料"
              onClick={() => setMaterialPanelOpen(false)}
            >
              <LYL_ICON_MAP.collapse aria-hidden="true" />
            </WorkbenchTopbarIconButton>
          }
        />
      }
    />
  );
}

function PreviewWorkspace({
  activeMode,
  decision,
  onDecisionChange,
  onModeChange,
  state,
}: {
  activeMode: ActiveCounselMode | "discuss";
  decision: string;
  onDecisionChange(value: string): void;
  onModeChange(mode: ActiveCounselMode): void;
  state: WorkbenchPreviewState;
}) {
  if (state === "new") {
    return (
      <section
        className="cos-workbench__welcome"
        aria-labelledby="welcome-title"
      >
        <div className="cos-workbench__welcome-copy">
          <span>LYL STRATEGIC COUNSEL</span>
          <h2 id="welcome-title">今天需要我帮你判断什么？</h2>
          <p>选择模式只会确定思考协议；你仍可用自然语言描述任何议题。</p>
        </div>
        <div className="cos-workbench__mode-grid">
          {COUNSEL_MODES.map((mode) => (
            <IssueModeCard
              key={mode.mode}
              mode={mode.mode}
              title={mode.label}
              description={mode.description}
              selected={activeMode === mode.mode}
              onSelect={onModeChange}
            />
          ))}
        </div>
      </section>
    );
  }

  if (state === "running") {
    return (
      <div className="cos-workbench__conversation">
        <StageProgress items={STAGES.running} />
        <CounselMessageRenderer messageRole="user">
          <p>本周先访谈有战略顾问经验的创业者，还是高频独立决策者？</p>
        </CounselMessageRenderer>
        <CounselMessageRenderer streaming>
          <p>
            当前主要矛盾不是功能完整度，而是缺少足以改变判断的真实用户证据。我正在核验：哪类用户会为持续决策支持付费，以及他们最先需要哪种判断协议。
          </p>
        </CounselMessageRenderer>
        <ToolActivity
          status="running"
          tool="research"
          summary="正在核验高价值用户场景"
          detail="已整理 8 条访谈记录，正在比对付费触发点与决策频率。"
          defaultExpanded
        />
      </div>
    );
  }

  if (state === "waiting") {
    return (
      <div className="cos-workbench__conversation cos-workbench__conversation--interrupt">
        <DecisionInterruptCard
          interruptId="preview-pricing-decision"
          title="先确定验证顺序"
          question="未来两周，你愿意把主要精力投入哪条路径？"
          rationale="当前证据更支持先验证高频决策场景，再收敛价格与功能边界。"
          selectedOptionId={decision}
          onSelect={onDecisionChange}
          onConfirm={() => undefined}
          onCancel={() => undefined}
          onReportNow={() => undefined}
          allowReportNow
          options={[
            {
              id: "interviews-first",
              title: "先完成 5 位目标用户访谈",
              description: "验证高频决策场景、付费触发点与现有替代方案。",
              cost: "会推迟一周功能开发",
              recommended: true,
            },
            {
              id: "prototype-first",
              title: "先完成可用原型",
              description: "用更具体的交互降低用户理解成本，再开始访谈。",
              cost: "可能在错误假设上增加投入",
            },
          ]}
        />
      </div>
    );
  }

  return (
    <div className="cos-workbench__conversation">
      <StageProgress items={STAGES.ready} />
      <CounselMessageRenderer>
        <p>
          正式建议已形成。先用 5
          位高频决策者验证问题强度与持续付费意愿，再决定第一版能力边界。
        </p>
      </CounselMessageRenderer>
      <CounselSummaryCard
        currentStage="正式建议"
        mainContradiction="缺少真实用户证据，而不是方案不完整。"
        recommendation="未来两周只推进 5 位目标用户访谈，并用同一问题框架记录决策频率、现有成本与付费触发点。"
        confidence={78}
        changeConditions={[
          "3 位以上受访者无法复述核心价值",
          "高频决策者已有成本更低且稳定的替代方案",
        ]}
        deferItems={["完整工作流编辑器", "主动式每日训练"]}
        actions={
          <>
            <Button variant="primary">采纳建议</Button>
            <Button variant="secondary">反对建议</Button>
            <Button variant="secondary">请求调研</Button>
          </>
        }
      />
    </div>
  );
}

function createMaterialPanels(state: WorkbenchPreviewState) {
  if (state === "new") {
    return {
      counsel: (
        <EmptyState
          title="尚无参谋结论"
          description="开始议题后，这里会沉淀明确建议与改判条件。"
          compact
        />
      ),
      evidence: (
        <EmptyState
          title="尚无关键证据"
          description="证据会保留来源、时效性与支持关系。"
          compact
        />
      ),
      history: (
        <EmptyState
          title="尚无历史依据"
          description="相关历史议题会在需要时被引用。"
          compact
        />
      ),
      research: (
        <EmptyState
          title="尚未开始调研"
          description="复杂议题会在这里展示阶段，而非私有推理。"
          compact
        />
      ),
    };
  }

  const counsel = (
    <CounselSummaryCard
      currentStage={
        state === "ready"
          ? "正式建议"
          : state === "waiting"
            ? "等待裁决"
            : "形成判断"
      }
      mainContradiction="缺少真实用户证据，而不是方案不完整。"
      recommendation={
        state === "ready"
          ? "先完成 5 位目标用户访谈。"
          : "当前建议仍可能随关键证据变化。"
      }
      confidence={state === "ready" ? 78 : 62}
      changeConditions={["用户决策频率显著低于当前估计"]}
      deferItems={["扩展非核心能力"]}
    />
  );

  return {
    counsel,
    evidence: (
      <div className="cos-workbench__material-stack">
        <EvidenceCard
          id="interview-signal"
          relation="support"
          title="高频决策者愿意持续复用同一判断框架"
          summary="最近 6 次产品讨论均快速进入方案细化，但只有 2 次包含真实用户验证。"
          sourceName="产品讨论记录"
          publishedAt="2026-07-31"
          relevance="high"
          freshness="high"
        />
        <EvidenceCard
          id="sample-limit"
          relation="limit"
          title="当前样本仍不足以支持定价结论"
          summary="现有访谈集中在熟人样本，无法代表陌生用户的付费意愿。"
          sourceName="访谈样本审计"
          publishedAt="2026-08-01"
          relevance="high"
          freshness="high"
        />
      </div>
    ),
    history: (
      <ContextReferenceCard
        id="history-direction"
        title="产品方向多次提前进入架构细化"
        summary="最近三次方向选择中，你都在获得真实用户反馈前开始完善能力边界。"
        sourceName="历史议题 · 产品方向复盘"
        capturedAt="2026-07-28"
        confidence={84}
      />
    ),
    research: (
      <div className="cos-workbench__material-stack">
        <ResearchPlanCard
          status={state === "ready" ? "complete" : "running"}
          unknowns={["目标用户的真实决策频率", "现有替代方案的切换成本"]}
          angles={["访谈过去 30 天的真实决策", "对比顾问、搜索与通用 AI"]}
          stopConditions={["5 位目标用户完成访谈", "新证据不再改变建议方向"]}
        />
        <VerticalResearchProgress
          items={
            RESEARCH_PROGRESS[
              state === "ready"
                ? "ready"
                : state === "waiting"
                  ? "waiting"
                  : "running"
            ]
          }
        />
      </div>
    ),
  };
}
