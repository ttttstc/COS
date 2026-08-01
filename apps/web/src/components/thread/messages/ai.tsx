import { parsePartialJson } from "@langchain/core/output_parsers";
import { useStreamContext } from "@/providers/Stream";
import {
  AIMessage,
  Checkpoint,
  Message,
  ToolMessage,
} from "@langchain/langgraph-sdk";
import { useStream } from "@langchain/langgraph-sdk/react";
import { getContentString } from "../utils";
import { BranchSwitcher, CommandBar } from "./shared";
import { MarkdownText } from "../markdown-text";
import { LoadExternalComponent } from "@langchain/langgraph-sdk/react-ui";
import { cn } from "@/lib/utils";
import { ToolCalls, ToolResult } from "./tool-calls";
import { MessageContentComplex } from "@langchain/core/messages";
import { Fragment } from "react/jsx-runtime";
import { isAgentInboxInterruptSchema } from "@/lib/agent-inbox-interrupt";
import { ThreadView } from "../agent-inbox";
import { useQueryState, parseAsBoolean } from "nuqs";
import { GenericInterruptView } from "./generic-interrupt";
import { useArtifact } from "../artifact";
import {
  CounselMessageRenderer,
  DecisionInterruptCard,
} from "@/components/clauseos";
import {
  buildStructuredInterruptResume,
  parseStructuredDecisionInterrupt,
  type StructuredDecisionInterrupt,
} from "@/lib/decision-interrupt";
import { useRef, useState } from "react";

function CustomComponent({
  message,
  thread,
}: {
  message: Message;
  thread: ReturnType<typeof useStreamContext>;
}) {
  const artifact = useArtifact();
  const { values } = useStreamContext();
  const customComponents = values.ui?.filter(
    (ui) => ui.metadata?.message_id === message.id,
  );

  if (!customComponents?.length) return null;
  return (
    <Fragment key={message.id}>
      {customComponents.map((customComponent) => (
        <LoadExternalComponent
          key={customComponent.id}
          stream={thread as unknown as ReturnType<typeof useStream>}
          message={customComponent}
          meta={{ ui: customComponent, artifact }}
        />
      ))}
    </Fragment>
  );
}

function parseAnthropicStreamedToolCalls(
  content: MessageContentComplex[],
): AIMessage["tool_calls"] {
  const toolCallContents = content.filter((c) => c.type === "tool_use" && c.id);

  return toolCallContents.map((tc) => {
    const toolCall = tc as Record<string, any>;
    let json: Record<string, any> = {};
    if (toolCall?.input) {
      try {
        json = parsePartialJson(toolCall.input) ?? {};
      } catch {
        // Pass
      }
    }
    return {
      name: toolCall.name ?? "",
      id: toolCall.id ?? "",
      args: json,
      type: "tool_call",
    };
  });
}

interface InterruptProps {
  interrupt?: unknown;
  isLastMessage: boolean;
  hasNoAIOrToolMessages: boolean;
}

export function StructuredInterruptView({
  interrupt,
}: {
  interrupt: StructuredDecisionInterrupt;
}) {
  const stream = useStreamContext();
  const [selection, setSelection] = useState<string | undefined>(
    interrupt.recommendedOptionId ?? interrupt.options[0]?.id,
  );
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [cancelAnnouncement, setCancelAnnouncement] = useState("");

  const resume = async (value: string) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      await stream.submit(
        {},
        {
          command: {
            resume: buildStructuredInterruptResume(interrupt, value),
          },
          streamMode: ["values"],
          streamSubgraphs: true,
          streamResumable: true,
        },
      );
      setCancelAnnouncement("");
    } catch (error) {
      submittingRef.current = false;
      setSubmitting(false);
      console.error("Error resuming counsel interrupt", error);
    }
  };

  return (
    <>
      <DecisionInterruptCard
        interruptId={interrupt.interruptId}
        title={interrupt.title}
        question={interrupt.question}
        rationale={interrupt.rationale}
        options={interrupt.options}
        selectedOptionId={selection}
        submitting={submitting}
        allowReportNow={interrupt.allowReportNow}
        onSelect={(value) => {
          setSelection(value);
          setCancelAnnouncement("");
        }}
        onCancel={() => {
          setSelection(undefined);
          setCancelAnnouncement("已取消当前选择，议题仍等待裁决。");
        }}
        onConfirm={resume}
        onReportNow={() => void resume("report_now")}
      />
      <span
        className="lyl-visually-hidden"
        role="status"
      >
        {cancelAnnouncement}
      </span>
    </>
  );
}

function Interrupt({
  interrupt,
  isLastMessage,
  hasNoAIOrToolMessages,
}: InterruptProps) {
  const fallbackValue = Array.isArray(interrupt)
    ? (interrupt as Record<string, any>[])
    : (((interrupt as { value?: unknown } | undefined)?.value ??
        interrupt) as Record<string, any>);
  const structuredInterrupt = parseStructuredDecisionInterrupt(interrupt);
  const shouldRender = isLastMessage || hasNoAIOrToolMessages;

  return (
    <>
      {isAgentInboxInterruptSchema(interrupt) && shouldRender && (
        <ThreadView interrupt={interrupt} />
      )}
      {!isAgentInboxInterruptSchema(interrupt) &&
        structuredInterrupt &&
        shouldRender && (
          <StructuredInterruptView
            key={structuredInterrupt.interruptId}
            interrupt={structuredInterrupt}
          />
        )}
      {interrupt &&
      !isAgentInboxInterruptSchema(interrupt) &&
      !structuredInterrupt &&
      shouldRender ? (
        <GenericInterruptView interrupt={fallbackValue} />
      ) : null}
    </>
  );
}

export function AssistantMessage({
  message,
  isLoading,
  handleRegenerate,
}: {
  message: Message | undefined;
  isLoading: boolean;
  handleRegenerate: (parentCheckpoint: Checkpoint | null | undefined) => void;
}) {
  const content = message?.content ?? [];
  const contentString = getContentString(content);
  const [hideToolCalls] = useQueryState(
    "hideToolCalls",
    parseAsBoolean.withDefault(false),
  );

  const thread = useStreamContext();
  const isLastMessage = thread.messages.at(-1)?.id === message?.id;
  const messageIndex = message
    ? thread.messages.findIndex(
        (candidate) =>
          candidate === message ||
          (Boolean(message.id) && candidate.id === message.id),
      )
    : -1;
  const followingToolMessages =
    messageIndex < 0
      ? []
      : thread.messages
          .slice(messageIndex + 1)
          .filter(
            (candidate): candidate is ToolMessage => candidate.type === "tool",
          );
  const toolCallsAreStreaming = isLoading && isLastMessage;
  const hasNoAIOrToolMessages = !thread.messages.find(
    (m) => m.type === "ai" || m.type === "tool",
  );
  const meta = message ? thread.getMessagesMetadata(message) : undefined;
  const threadInterrupt = thread.interrupt;

  const parentCheckpoint = meta?.firstSeenState?.parent_checkpoint;
  const anthropicStreamedToolCalls = Array.isArray(content)
    ? parseAnthropicStreamedToolCalls(content)
    : undefined;

  const hasToolCalls =
    message &&
    "tool_calls" in message &&
    message.tool_calls &&
    message.tool_calls.length > 0;
  const toolCallsHaveContents =
    hasToolCalls &&
    message.tool_calls?.some(
      (tc) => tc.args && Object.keys(tc.args).length > 0,
    );
  const hasAnthropicToolCalls = !!anthropicStreamedToolCalls?.length;
  const isToolResult = message?.type === "tool";

  if (isToolResult && hideToolCalls) {
    return null;
  }

  return (
    <CounselMessageRenderer
      messageRole={isToolResult ? "system" : "assistant"}
      streaming={isLoading && isLastMessage}
      className="group"
    >
      <div className="flex w-full flex-col gap-2">
        {isToolResult ? (
          <>
            <ToolResult message={message} />
            <Interrupt
              interrupt={threadInterrupt}
              isLastMessage={isLastMessage}
              hasNoAIOrToolMessages={hasNoAIOrToolMessages}
            />
          </>
        ) : (
          <>
            {contentString.length > 0 && (
              <div className="py-1">
                <MarkdownText>{contentString}</MarkdownText>
              </div>
            )}

            {!hideToolCalls && (
              <>
                {(hasToolCalls && toolCallsHaveContents && (
                  <ToolCalls
                    toolCalls={message.tool_calls}
                    toolMessages={followingToolMessages}
                    isStreaming={toolCallsAreStreaming}
                  />
                )) ||
                  (hasAnthropicToolCalls && (
                    <ToolCalls
                      toolCalls={anthropicStreamedToolCalls}
                      toolMessages={followingToolMessages}
                      isStreaming={toolCallsAreStreaming}
                    />
                  )) ||
                  (hasToolCalls && (
                    <ToolCalls
                      toolCalls={message.tool_calls}
                      toolMessages={followingToolMessages}
                      isStreaming={toolCallsAreStreaming}
                    />
                  ))}
              </>
            )}

            {message && (
              <CustomComponent
                message={message}
                thread={thread}
              />
            )}
            <Interrupt
              interrupt={threadInterrupt}
              isLastMessage={isLastMessage}
              hasNoAIOrToolMessages={hasNoAIOrToolMessages}
            />
            <div
              className={cn(
                "mr-auto flex items-center gap-2 transition-opacity",
                "opacity-0 group-focus-within:opacity-100 group-hover:opacity-100",
              )}
            >
              <BranchSwitcher
                branch={meta?.branch}
                branchOptions={meta?.branchOptions}
                onSelect={(branch) => thread.setBranch(branch)}
                isLoading={isLoading}
              />
              <CommandBar
                content={contentString}
                isLoading={isLoading}
                isAiMessage={true}
                handleRegenerate={() => handleRegenerate(parentCheckpoint)}
              />
            </div>
          </>
        )}
      </div>
    </CounselMessageRenderer>
  );
}

export function AssistantMessageLoading() {
  return (
    <CounselMessageRenderer
      messageRole="assistant"
      streaming
    >
      <div
        className="flex h-8 items-center gap-1 px-1"
        aria-label="正在形成建议"
      >
        <div className="cos-thread-loading-dot bg-foreground/50 h-1.5 w-1.5 animate-[pulse_1.5s_ease-in-out_infinite] rounded-full"></div>
        <div className="cos-thread-loading-dot bg-foreground/50 h-1.5 w-1.5 animate-[pulse_1.5s_ease-in-out_0.5s_infinite] rounded-full"></div>
        <div className="cos-thread-loading-dot bg-foreground/50 h-1.5 w-1.5 animate-[pulse_1.5s_ease-in-out_1s_infinite] rounded-full"></div>
      </div>
    </CounselMessageRenderer>
  );
}
