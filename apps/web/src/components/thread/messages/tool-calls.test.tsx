import { render, screen } from "@testing-library/react";
import type { AIMessage, ToolMessage } from "@langchain/langgraph-sdk";
import { describe, expect, it } from "vitest";

import { ToolCalls, ToolResult } from "./tool-calls";

function toolCalls(
  calls: Array<{ id: string; name: string }>,
): AIMessage["tool_calls"] {
  return calls.map((call) => ({
    ...call,
    args: {},
    type: "tool_call" as const,
  }));
}

function toolMessage({
  toolCallId,
  status,
}: {
  toolCallId: string;
  status?: "success" | "error";
}): ToolMessage {
  return {
    id: `result-${toolCallId}`,
    type: "tool",
    name: "检索",
    content: "{}",
    tool_call_id: toolCallId,
    status,
  } as ToolMessage;
}

describe("ToolCalls", () => {
  it("maps successful and failed tool results by tool_call_id", () => {
    render(
      <ToolCalls
        toolCalls={toolCalls([
          { id: "successful-call", name: "成功检索" },
          { id: "failed-call", name: "失败检索" },
        ])}
        toolMessages={[
          toolMessage({ toolCallId: "successful-call", status: "success" }),
          toolMessage({ toolCallId: "failed-call", status: "error" }),
        ]}
      />,
    );

    expect(screen.getByText("已完成")).toBeInTheDocument();
    expect(screen.getByText("失败")).toBeInTheDocument();
  });

  it("only marks an unresolved call running while it is streaming", () => {
    const calls = toolCalls([{ id: "pending-call", name: "待处理检索" }]);
    const { rerender } = render(
      <ToolCalls
        toolCalls={calls}
        isStreaming
      />,
    );

    expect(screen.getByText("进行中")).toBeInTheDocument();

    rerender(
      <ToolCalls
        toolCalls={calls}
        isStreaming={false}
      />,
    );
    expect(screen.getByText("等待中")).toBeInTheDocument();
    expect(screen.queryByText("进行中")).not.toBeInTheDocument();
  });

  it("renders an error ToolMessage as failed", () => {
    render(
      <ToolResult
        message={toolMessage({ toolCallId: "failed-call", status: "error" })}
      />,
    );

    expect(screen.getByText("检索执行失败")).toBeInTheDocument();
    expect(screen.getByText("失败")).toBeInTheDocument();
  });
});
