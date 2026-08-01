import { isWorkbenchPreviewState } from "@/components/workbench/preview-state";
import { WorkbenchPreview } from "@/components/workbench/workbench-preview";

export default async function WorkbenchPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const { state } = await searchParams;

  return (
    <WorkbenchPreview state={isWorkbenchPreviewState(state) ? state : "new"} />
  );
}
