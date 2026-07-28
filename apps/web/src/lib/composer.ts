import type { ContentBlock } from "@langchain/core/messages";

export function canSubmitMessage(
  input: string,
  contentBlocks: ContentBlock.Multimodal.Data[],
  isLoading: boolean,
): boolean {
  return !isLoading && (input.trim().length > 0 || contentBlocks.length > 0);
}
