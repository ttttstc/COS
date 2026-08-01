import React from "react";
import { File, X } from "@/components/icons/lyl-icons";
import { ContentBlock } from "@langchain/core/messages";
import { cn } from "@/lib/utils";
import Image from "next/image";
export interface MultimodalPreviewProps {
  block: ContentBlock.Multimodal.Data;
  removable?: boolean;
  onRemove?: () => void;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const MultimodalPreview: React.FC<MultimodalPreviewProps> = ({
  block,
  removable = false,
  onRemove,
  className,
  size = "md",
}) => {
  // Image block
  if (
    block.type === "image" &&
    typeof block.mimeType === "string" &&
    block.mimeType.startsWith("image/")
  ) {
    const url = `data:${block.mimeType};base64,${block.data}`;
    return (
      <div
        className={cn(
          "cos-multimodal-attachment cos-multimodal-attachment--image",
          `cos-multimodal-attachment--${size}`,
          className,
        )}
      >
        <Image
          src={url}
          alt={String(block.metadata?.name || "uploaded image")}
          className="cos-multimodal-attachment__preview"
          width={size === "sm" ? 16 : size === "md" ? 32 : 48}
          height={size === "sm" ? 16 : size === "md" ? 32 : 48}
        />
        {removable && (
          <button
            type="button"
            className="cos-multimodal-attachment__remove"
            onClick={onRemove}
            aria-label="移除图片"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  // PDF block
  if (block.type === "file" && block.mimeType === "application/pdf") {
    const filename =
      block.metadata?.filename || block.metadata?.name || "PDF file";
    return (
      <div
        className={cn(
          "cos-multimodal-attachment cos-multimodal-attachment--file",
          `cos-multimodal-attachment--${size}`,
          className,
        )}
      >
        <File
          className="cos-multimodal-attachment__icon"
          aria-hidden="true"
        />
        <span className="cos-multimodal-attachment__name">{String(filename)}</span>
        {removable && (
          <button
            type="button"
            className="cos-multimodal-attachment__remove"
            onClick={onRemove}
            aria-label="移除 PDF"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  // Fallback for unknown types
  return (
    <div
      className={cn(
        "cos-multimodal-attachment cos-multimodal-attachment--file",
        `cos-multimodal-attachment--${size}`,
        className,
      )}
    >
      <File
        className="cos-multimodal-attachment__icon"
        aria-hidden="true"
      />
      <span className="cos-multimodal-attachment__name">不支持的文件类型</span>
      {removable && (
        <button
          type="button"
          className="cos-multimodal-attachment__remove"
          onClick={onRemove}
          aria-label="移除文件"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};
