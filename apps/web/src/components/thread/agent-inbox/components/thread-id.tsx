import { Check, Copy } from "@/components/icons/lyl-icons";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TooltipIconButton } from "../../tooltip-icon-button";

export function ThreadIdTooltip({ threadId }: { threadId: string }) {
  const firstThreeChars = threadId.slice(0, 3);
  const lastThreeChars = threadId.slice(-3);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <p className="rounded-md bg-[var(--lyl-glass-thin)] px-1 py-[2px] font-mono text-[10px] leading-[12px] tracking-tighter text-[var(--lyl-text-2)]">
            {firstThreeChars}...{lastThreeChars}
          </p>
        </TooltipTrigger>
        <TooltipContent>
          <ThreadIdCopyable threadId={threadId} />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function ThreadIdCopyable({
  threadId,
  showUUID = false,
}: {
  threadId: string;
  showUUID?: boolean;
}) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.stopPropagation();
    navigator.clipboard.writeText(threadId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <TooltipIconButton
      onClick={(e) => handleCopy(e)}
      variant="ghost"
      tooltip="复制议题标识"
      className="flex w-fit flex-grow-0 cursor-pointer items-center gap-1 rounded-md border-[1px] border-[var(--lyl-border-control)] p-1 hover:bg-[var(--lyl-glass-thin)]"
    >
      <p className="font-mono text-xs">{showUUID ? threadId : "议题 ID"}</p>
      <AnimatePresence
        mode="wait"
        initial={false}
      >
        {copied ? (
          <motion.div
            key="check"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
          >
            <Check className="h-3 max-h-3 w-3 max-w-3 text-[var(--lyl-green-400)]" />
          </motion.div>
        ) : (
          <motion.div
            key="copy"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
          >
            <Copy className="h-3 max-h-3 w-3 max-w-3 text-[var(--lyl-text-3)]" />
          </motion.div>
        )}
      </AnimatePresence>
    </TooltipIconButton>
  );
}
