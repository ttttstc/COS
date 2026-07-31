import { ToolActivity } from "@/components/clauseos";

export function GenericInterruptView({
  interrupt,
}: {
  interrupt: Record<string, unknown> | Record<string, unknown>[];
}) {
  return (
    <ToolActivity
      tool="人工裁决"
      summary="参谋需要你补充或确认信息"
      status="waiting_user"
      defaultExpanded
      detail={
        <pre className="cos-thread-tool-detail">
          {JSON.stringify(interrupt, null, 2)}
        </pre>
      }
    />
  );
}
