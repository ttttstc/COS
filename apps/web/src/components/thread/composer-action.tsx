import { LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

interface ComposerActionProps {
  canSubmit: boolean;
  streaming: boolean;
  onStop(): void;
}

export function ComposerAction({
  canSubmit,
  streaming,
  onStop,
}: ComposerActionProps) {
  if (streaming) {
    return (
      <Button
        type="button"
        onClick={onStop}
        className="ml-auto"
      >
        <LoaderCircle className="h-4 w-4 animate-spin" />
        Cancel
      </Button>
    );
  }

  return (
    <Button
      type="submit"
      className="ml-auto shadow-md transition-all"
      disabled={!canSubmit}
    >
      Send
    </Button>
  );
}
