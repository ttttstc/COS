import type { AIMessage, ToolMessage } from "@langchain/langgraph-sdk";

import { ToolActivity, type ActivityState } from "@/components/clauseos";

function displayValue(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function ToolDetail({ value }: { value: unknown }) {
  return <pre className="cos-thread-tool-detail">{displayValue(value)}</pre>;
}

export function ToolCalls({
  toolCalls,
  toolMessages = [],
  isStreaming = false,
}: {
  toolCalls: AIMessage["tool_calls"];
  toolMessages?: readonly ToolMessage[];
  isStreaming?: boolean;
}) {
  if (!toolCalls?.length) return null;

  return (
    <div className="cos-thread-tool-list">
      {toolCalls.map((toolCall, index) => {
        const result = toolCall.id
          ? toolMessages.find(
              (toolMessage) => toolMessage.tool_call_id === toolCall.id,
            )
          : undefined;
        const status: ActivityState = result
          ? result.status === "error"
            ? "failed"
            : "complete"
          : isStreaming
            ? "running"
            : "pending";

        return (
          <ToolActivity
            key={toolCall.id ?? `${toolCall.name}-${index}`}
            tool={toolCall.name || "工具调用"}
            summary={`调用 ${toolCall.name || "工具"}`}
            status={status}
            detail={<ToolDetail value={toolCall.args ?? {}} />}
          />
        );
      })}
    </div>
  );
}

export function ToolResult({ message }: { message: ToolMessage }) {
  const failed = message.status === "error";
  let content: unknown = message.content;
  if (typeof message.content === "string") {
    try {
      content = JSON.parse(message.content);
    } catch {
      content = message.content;
    }
  }

  return (
    <ToolActivity
      tool={message.name || "工具结果"}
      summary={`${message.name || "工具"}${failed ? "执行失败" : "已返回结果"}`}
      status={failed ? "failed" : "complete"}
      detail={<ToolDetail value={content} />}
    />
  );
}
