import { v4 as uuidv4 } from "uuid";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  type Checkpoint,
  type Message,
  type Thread as LangGraphThread,
  type ThreadStatus,
} from "@langchain/langgraph-sdk";
import { parseAsBoolean, parseAsStringLiteral, useQueryState } from "nuqs";
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom";
import { toast } from "sonner";

import {
  Button,
  CommandPalette,
  ContentSurface,
  FileUploadTrigger,
  IconButton,
  IssueComposer,
  IssueStatusBadge,
  IssueTopbar,
  Select,
  StageProgress,
  StatusBadge,
  Switch,
  type CommandPaletteItem,
  type IssueStatus,
} from "@/components/clauseos";
import { LYL_ICON_MAP } from "@/components/icons/lyl-icons";
import {
  ClauseOSWorkbench,
  CounselMaterialPanel,
  IssueNavigator,
  IssueWorkspace,
  WorkbenchTopbarIconButton,
  type WorkbenchIssue,
} from "@/components/workbench";
import {
  DO_NOT_RENDER_ID_PREFIX,
  ensureToolCallsHaveResponses,
} from "@/lib/ensure-tool-responses";
import { canSubmitMessage } from "@/lib/composer";
import {
  ALL_COUNSEL_MODES,
  COUNSEL_MODE_VALUES,
  DEFAULT_COUNSEL_MODE,
  buildCounselRunContext,
  readCounselMode,
  type ActiveCounselMode,
} from "@/lib/counsel-mode";
import { parseCounselState, toStageProgress } from "@/lib/counsel-state";
import { getThreadMode, getThreadUpdatedLabel } from "@/lib/thread-summary";
import { useWorkbenchPreferences } from "@/lib/workbench-preferences";
import { useFileUpload } from "@/hooks/use-file-upload";
import { useStreamContext } from "@/providers/Stream";
import { useThreads } from "@/providers/Thread";

import {
  ArtifactContent,
  ArtifactTitle,
  useArtifactContext,
  useArtifactOpen,
} from "./artifact";
import { ContentBlocksPreview } from "./ContentBlocksPreview";
import { createCounselMaterialView } from "./counsel-material-view";
import { CounselWelcome } from "./counsel-welcome";
import { AssistantMessage, AssistantMessageLoading } from "./messages/ai";
import { HumanMessage } from "./messages/human";
import { getContentString } from "./utils";

function ScrollToBottom() {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();
  if (isAtBottom) return null;
  return (
    <Button
      variant="secondary"
      className="cos-thread-scroll-bottom"
      leadingIcon={<LYL_ICON_MAP.collapse aria-hidden="true" />}
      onClick={() => scrollToBottom()}
    >
      回到底部
    </Button>
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getThreadTitle(thread: LangGraphThread): string {
  const values = thread.values;
  if (isRecord(values) && Array.isArray(values.messages)) {
    const firstMessage = values.messages[0];
    if (isRecord(firstMessage) && "content" in firstMessage) {
      const title = getContentString(
        firstMessage.content as Message["content"],
      );
      if (title.trim()) return title.trim();
    }
  }
  return "未命名议题";
}

const RESEARCH_STAGE_IDS = new Set(["retrieve_context"]);

function toIssueStatus(
  status: ThreadStatus,
  stageId?: string,
): IssueStatus {
  if (status === "busy")
    return stageId && RESEARCH_STAGE_IDS.has(stageId)
      ? "researching"
      : "analyzing";
  if (status === "interrupted") return "waiting_user";
  if (status === "error") return "failed";
  return "counsel_ready";
}

function toWorkbenchIssue(thread: LangGraphThread): WorkbenchIssue {
  const mode = getThreadMode(thread);
  const state = parseCounselState(thread.values);
  const stageId = state.stages?.at(-1)?.id ?? state.current_stage;
  return {
    id: thread.thread_id,
    mode,
    status: toIssueStatus(thread.status, stageId),
    title: getThreadTitle(thread),
    updatedAt: thread.updated_at,
    updatedLabel: getThreadUpdatedLabel(thread.updated_at),
  };
}

export function Thread() {
  const stream = useStreamContext();
  const messages = stream.messages;
  const isLoading = stream.isLoading;
  const [artifactContext, setArtifactContext] = useArtifactContext();
  const [artifactOpen, closeArtifact] = useArtifactOpen();
  const { getThreads, threads, setThreads, setThreadsLoading } = useThreads();
  const {
    materialPanelMaxWidth,
    preferences,
    setMaterialPanelOpen,
    setMaterialPanelTab,
    setMaterialPanelWidth,
    toggleMaterialPanel,
  } = useWorkbenchPreferences();

  const [threadId, setThreadIdQuery] = useQueryState("threadId");
  // Issue #20 UX extension: keep tool-call visibility in the URL without changing the base counsel protocol.
  const [hideToolCalls, setHideToolCalls] = useQueryState(
    "hideToolCalls",
    parseAsBoolean.withDefault(false),
  );
  const [mode, setMode] = useQueryState(
    "mode",
    parseAsStringLiteral(COUNSEL_MODE_VALUES).withDefault(DEFAULT_COUNSEL_MODE),
  );
  const [input, setInput] = useState("");
  const [commandOpen, setCommandOpen] = useState(false);
  const [firstTokenReceived, setFirstTokenReceived] = useState(false);
  const lastError = useRef<string | undefined>(undefined);
  const modeRestoredForThreads = useRef(new Set<string>());
  const previousMessageLength = useRef(0);

  const {
    contentBlocks,
    setContentBlocks,
    handleFileUpload,
    dropRef,
    removeBlock,
    resetBlocks,
    dragOver,
    handlePaste,
  } = useFileUpload();

  useEffect(() => {
    let cancelled = false;
    setThreadsLoading(true);
    getThreads()
      .then((nextThreads) => {
        if (!cancelled) setThreads(nextThreads);
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setThreadsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [getThreads, setThreads, setThreadsLoading]);

  useEffect(() => {
    if (!threadId || modeRestoredForThreads.current.has(threadId)) return;
    const selected = threads.find((thread) => thread.thread_id === threadId);
    if (!selected) return;

    modeRestoredForThreads.current.add(threadId);
    if (!new URLSearchParams(window.location.search).has("mode")) {
      void setMode(getThreadMode(selected));
    }
  }, [setMode, threadId, threads]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (
        (event.metaKey || event.ctrlKey) &&
        !event.altKey &&
        event.key.toLowerCase() === "k"
      ) {
        event.preventDefault();
        setCommandOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  useEffect(() => {
    if (artifactOpen) {
      setMaterialPanelOpen(true);
      setMaterialPanelTab("counsel");
    }
  }, [artifactOpen, setMaterialPanelOpen, setMaterialPanelTab]);

  useEffect(() => {
    if (!stream.error) {
      lastError.current = undefined;
      return;
    }
    const message =
      stream.error instanceof Error
        ? stream.error.message
        : String(stream.error || "未知错误");
    if (lastError.current === message) return;
    lastError.current = message;
    toast.error("处理失败，请重试。", {
      description: message,
      richColors: true,
      closeButton: true,
    });
  }, [stream.error]);

  useEffect(() => {
    if (
      messages.length !== previousMessageLength.current &&
      messages.at(-1)?.type === "ai"
    ) {
      setFirstTokenReceived(true);
    }
    previousMessageLength.current = messages.length;
  }, [messages]);

  const clearThreadContext = () => {
    closeArtifact();
    setArtifactContext({});
  };

  const startNewIssue = (nextMode = DEFAULT_COUNSEL_MODE) => {
    void setThreadIdQuery(null);
    void setMode(nextMode);
    clearThreadContext();
    setInput("");
    resetBlocks();
  };

  const selectIssue = (id: string) => {
    const selected = threads.find((thread) => thread.thread_id === id);
    if (selected) void setMode(getThreadMode(selected));
    if (id !== threadId) void setThreadIdQuery(id);
  };

  const handleSubmit = () => {
    if (!canSubmitMessage(input, contentBlocks, isLoading)) return;
    setFirstTokenReceived(false);
    const newHumanMessage: Message = {
      id: uuidv4(),
      type: "human",
      content: [
        ...(input.trim() ? [{ type: "text", text: input.trim() }] : []),
        ...contentBlocks,
      ] as Message["content"],
    };
    const toolMessages = ensureToolCallsHaveResponses(messages);
    stream.submit(
      { messages: [...toolMessages, newHumanMessage] },
      {
        context: buildCounselRunContext(mode, artifactContext),
        streamMode: ["values"],
        streamSubgraphs: true,
        streamResumable: true,
        optimisticValues: (previous) => ({
          ...previous,
          messages: [
            ...(previous.messages ?? []),
            ...toolMessages,
            newHumanMessage,
          ],
        }),
      },
    );
    setInput("");
    setContentBlocks([]);
  };

  const handleRegenerate = (
    parentCheckpoint: Checkpoint | null | undefined,
  ) => {
    previousMessageLength.current -= 1;
    setFirstTokenReceived(false);
    stream.submit(undefined, {
      context: buildCounselRunContext(mode, artifactContext),
      checkpoint: parentCheckpoint,
      streamMode: ["values"],
      streamSubgraphs: true,
      streamResumable: true,
    });
  };

  const issues = useMemo(() => threads.map(toWorkbenchIssue), [threads]);
  const selectedIssue = issues.find((issue) => issue.id === threadId);
  const chatStarted = Boolean(threadId || messages.length);
  const firstHumanMessage = messages.find(
    (message) => message.type === "human",
  );
  const currentTitle =
    selectedIssue?.title ||
    (firstHumanMessage
      ? getContentString(firstHumanMessage.content).trim()
      : "") ||
    "新建议题";
  const currentStreamState = parseCounselState(stream.values);
  const currentStageId =
    currentStreamState.stages?.at(-1)?.id ?? currentStreamState.current_stage;
  const currentStatus: IssueStatus = stream.error
    ? "failed"
    : isLoading
      ? toIssueStatus("busy", currentStageId)
      : (selectedIssue?.status ?? "draft");
  const stages = toStageProgress(stream.values);
  const hasNoAIOrToolMessages = !messages.some(
    (message) => message.type === "ai" || message.type === "tool",
  );
  const materialView = createCounselMaterialView(stream.values);
  const materialPanel = preferences.materialPanel;

  const counselPanel = (
    <div className="cos-material-stack">
      {artifactOpen && (
        // Artifact intentionally remains a labeled subsection of the four-tab counsel panel.
        <section
          aria-label="参谋产物"
          className="cos-thread-artifact"
        >
          <ContentSurface raised>
            <header className="cos-thread-artifact__header">
              <ArtifactTitle className="cos-thread-artifact__title" />
              <IconButton
                label="关闭产物"
                size="sm"
                variant="ghost"
                onClick={closeArtifact}
              >
                <LYL_ICON_MAP.close aria-hidden="true" />
              </IconButton>
            </header>
            <ArtifactContent className="cos-thread-artifact__content" />
          </ContentSurface>
        </section>
      )}
      {materialView.panels.counsel}
    </div>
  );

  const commandItems: CommandPaletteItem[] = [
    {
      id: "new",
      label: "新建议题",
      description: "创建一个空白议题",
      shortcut: ["Ctrl", "N"],
      group: "快捷操作",
      icon: <LYL_ICON_MAP.newIssue aria-hidden="true" />,
    },
    {
      id: "counsel",
      label: "打开参谋结论",
      description: "展开材料面板并查看当前结论",
      group: "最近使用",
      icon: <LYL_ICON_MAP.counsel aria-hidden="true" />,
    },
    {
      id: "evidence",
      label: "查看关键证据",
      description: "只保留会改变判断的证据",
      group: "建议命令",
      icon: <LYL_ICON_MAP.evidence aria-hidden="true" />,
    },
    {
      id: "research",
      label: "查看调研过程",
      description: "查看可解释阶段与停止条件",
      group: "建议命令",
      icon: <LYL_ICON_MAP.researchProcess aria-hidden="true" />,
    },
  ];

  const openMaterialTab = (tab: "counsel" | "evidence" | "research") => {
    setMaterialPanelOpen(true);
    setMaterialPanelTab(tab);
  };

  const topbar = (
    <IssueTopbar
      embedded
      title={currentTitle}
      mode={mode}
      status={currentStatus}
      updatedAt={selectedIssue?.updatedAt}
      updatedLabel={selectedIssue?.updatedLabel}
      actions={
        <>
          <WorkbenchTopbarIconButton
            label="新建议题"
            onClick={() => startNewIssue()}
          >
            <LYL_ICON_MAP.newIssue aria-hidden="true" />
          </WorkbenchTopbarIconButton>
          <WorkbenchTopbarIconButton
            label={materialPanel.open ? "收起参谋材料" : "展开参谋材料"}
            onClick={toggleMaterialPanel}
          >
            {materialPanel.open ? (
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
    <div
      ref={dropRef}
      className="cos-thread-composer-drop"
      data-drag-over={dragOver || undefined}
    >
      <IssueComposer
        mode={mode}
        value={input}
        disabled={Boolean(stream.interrupt)}
        streaming={isLoading}
        canSubmit={canSubmitMessage(input, contentBlocks, isLoading)}
        onChange={setInput}
        onPaste={handlePaste}
        onSubmit={handleSubmit}
        onStop={() => stream.stop()}
        attachmentPreviews={
          <ContentBlocksPreview
            blocks={contentBlocks}
            onRemove={removeBlock}
            size="sm"
            className="cos-thread-attachments"
          />
        }
        attachmentSlot={
          <>
            <input
              id="thread-file-input"
              type="file"
              multiple
              accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
              aria-label="选择议题附件"
              disabled={isLoading || Boolean(stream.interrupt)}
              className="cos-workbench__visually-hidden"
              onChange={handleFileUpload}
            />
            <FileUploadTrigger
              inputId="thread-file-input"
              disabled={isLoading || Boolean(stream.interrupt)}
            />
          </>
        }
        controlsSlot={
          <>
            <Select
              aria-label="切换议题类型"
              value={mode}
              options={ALL_COUNSEL_MODES.map((item) => ({
                value: item.mode,
                label: item.shortLabel,
              }))}
              onChange={(event) => setMode(readCounselMode(event.target.value))}
            />
            <Switch
              checked={hideToolCalls}
              onCheckedChange={setHideToolCalls}
              label="隐藏工具调用"
            />
          </>
        }
        statusSlot={
          stream.interrupt ? (
            <IssueStatusBadge status="waiting_user" />
          ) : isLoading ? (
            <StatusBadge tone="success">流式输出中</StatusBadge>
          ) : undefined
        }
      />
    </div>
  );

  return (
    <>
      <ClauseOSWorkbench
        materialMaxWidth={materialPanelMaxWidth}
        materialOpen={materialPanel.open}
        materialWidth={materialPanel.width}
        onMaterialWidthChange={setMaterialPanelWidth}
        navigator={
          <IssueNavigator
            activeMode={mode}
            issues={issues}
            selectedIssueId={threadId ?? undefined}
            onCreateIssue={() => startNewIssue()}
            onModeSelect={(nextMode: ActiveCounselMode) =>
              startNewIssue(nextMode)
            }
            onOpenCommand={() => setCommandOpen(true)}
            onSelectIssue={selectIssue}
          />
        }
        workspace={
          <IssueWorkspace
            className="cos-thread-workspace"
            topbar={topbar}
            composer={composer}
            scrollable={false}
          >
            <StickToBottom className="cos-thread-stream">
              {({ scrollRef, contentRef }) => (
                <>
                  <div
                    ref={scrollRef}
                    className="cos-thread-message-scroll"
                    role="region"
                    aria-label="议题消息"
                    tabIndex={0}
                  >
                    <div
                      ref={contentRef}
                      className="cos-thread-conversation"
                    >
                      <div className="cos-workbench__conversation">
                        {!chatStarted && (
                          <CounselWelcome onSelectMode={setMode} />
                        )}
                        {stages.length > 0 && <StageProgress items={stages} />}
                        {messages
                          .filter(
                            (message) =>
                              !message.id?.startsWith(DO_NOT_RENDER_ID_PREFIX),
                          )
                          .map((message, index) =>
                            message.type === "human" ? (
                              <HumanMessage
                                key={message.id || `${message.type}-${index}`}
                                message={message}
                                isLoading={isLoading}
                              />
                            ) : (
                              <AssistantMessage
                                key={message.id || `${message.type}-${index}`}
                                message={message}
                                isLoading={isLoading}
                                handleRegenerate={handleRegenerate}
                              />
                            ),
                          )}
                        {hasNoAIOrToolMessages && Boolean(stream.interrupt) && (
                          <AssistantMessage
                            key="interrupt-message"
                            message={undefined}
                            isLoading={isLoading}
                            handleRegenerate={handleRegenerate}
                          />
                        )}
                        {isLoading && !firstTokenReceived && (
                          <AssistantMessageLoading />
                        )}
                      </div>
                    </div>
                  </div>
                  <ScrollToBottom />
                </>
              )}
            </StickToBottom>
          </IssueWorkspace>
        }
        material={
          <CounselMaterialPanel
            activeTab={materialPanel.activeTab}
            counts={{
              ...materialView.counts,
              counsel:
                (materialView.counts.counsel ?? 0) + (artifactOpen ? 1 : 0),
            }}
            onTabChange={setMaterialPanelTab}
            panels={{ ...materialView.panels, counsel: counselPanel }}
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
      <CommandPalette
        open={commandOpen}
        onOpenChange={setCommandOpen}
        items={commandItems}
        onSelect={(item) => {
          if (item.id === "new") startNewIssue();
          if (item.id === "counsel") openMaterialTab("counsel");
          if (item.id === "evidence") openMaterialTab("evidence");
          if (item.id === "research") openMaterialTab("research");
        }}
      />
    </>
  );
}
