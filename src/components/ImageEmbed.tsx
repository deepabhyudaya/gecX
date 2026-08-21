"use client";

import { useState } from "react";
import { ExternalLink, ImageOff } from "lucide-react";

interface ImageEmbedProps {
  src: string;
  alt?: string;
  className?: string;
  maxHeight?: number;
  size?: 'default' | 'small' | 'sticker';
}

const SIZE_CONFIG = {
  default: { maxWidth: 400, maxHeight: 300 },
  small: { maxWidth: 300, maxHeight: 200 },
  sticker: { maxWidth: 160, maxHeight: 160 },
};

export default function ImageEmbed({
  src,
  alt,
  className = "",
  maxHeight: customMaxHeight,
  size = 'default'
}: ImageEmbedProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const config = SIZE_CONFIG[size];
  const maxHeight = customMaxHeight ?? config.maxHeight;
  const maxWidth = config.maxWidth;

  const domain = (() => {
    try {
      return new URL(src).hostname.replace(/^www\./, "");
    } catch {
      return "external";
    }
  })();

  if (hasError) {
    return (
      <div
        className={`rounded-lg border border-border bg-muted/50 flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground ${className}`}
      >
        <ImageOff className="size-4" />
        <span className="truncate">Failed to load image</span>
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto text-blue-500 hover:underline flex items-center gap-1"
        >
          <ExternalLink className="size-3" />
          Open
        </a>
      </div>
    );
  }

  return (
    <div className={`group/image ${className}`}>
      <div
        className={`relative rounded-lg overflow-hidden bg-muted ${isLoading ? "animate-pulse" : ""} ${size === 'sticker' ? 'rounded-xl' : ''}`}
        style={{
          maxHeight: isExpanded ? undefined : maxHeight,
          maxWidth: isExpanded ? undefined : maxWidth,
        }}
      >
        {isLoading && (
          <div className="absolute inset-0 bg-muted flex items-center justify-center z-10">
            <div className="w-8 h-8 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin" />
          </div>
        )}

        <img
          src={src}
          alt={alt || "Embedded image"}
          className={`w-full h-full object-contain cursor-pointer transition-opacity duration-200 ${
            isLoading ? "opacity-0" : "opacity-100"
          } ${isExpanded ? "" : "hover:brightness-110"}`}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
          onClick={() => setIsExpanded(!isExpanded)}
          loading="lazy"
        />

        {!isLoading && !isExpanded && (
          <div className="absolute bottom-2 right-2 opacity-0 group-hover/image:opacity-100 transition-opacity z-20">
            <span className="text-[10px] bg-black/50 text-white px-2 py-1 rounded-full">
              Click to expand
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-1.5">
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          <ExternalLink className="size-3" />
          <span className="truncate max-w-[200px]">{domain}</span>
        </a>
        {isExpanded && (
          <button
            onClick={() => setIsExpanded(false)}
            className="text-[11px] text-muted-foreground hover:text-foreground"
          >
            Collapse
          </button>
        )}
      </div>
    </div>
  );
}
