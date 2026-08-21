"use client";

import React, { useMemo } from "react";

interface EmojiEntry {
  name: string;
  imageUrl: string;
}

interface EmojiRendererProps {
  content: string;
  emojiMap: Record<string, string>;
  className?: string;
}

export default function EmojiRenderer({ content, emojiMap, className }: EmojiRendererProps) {
  const parts = useMemo(() => {
    if (!content || Object.keys(emojiMap).length === 0) {
      return [{ type: "text" as const, value: content }];
    }

    const result: Array<{ type: "text" | "emoji"; value: string; imageUrl?: string }> = [];
    const regex = /:([a-z0-9_]{1,64}):/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        result.push({ type: "text", value: content.slice(lastIndex, match.index) });
      }

      const name = match[1];
      const imageUrl = emojiMap[name] ?? emojiMap[`:${name}:`];

      if (imageUrl) {
        result.push({ type: "emoji", value: name, imageUrl });
      } else {
        result.push({ type: "text", value: match[0] });
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < content.length) {
      result.push({ type: "text", value: content.slice(lastIndex) });
    }

    return result;
  }, [content, emojiMap]);

  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (part.type === "emoji" && part.imageUrl) {
          return (
            <img
              key={i}
              src={part.imageUrl}
              alt={`:${part.value}:`}
              title={`:${part.value}:`}
              className="inline-block w-5 h-5 object-contain align-middle mx-0.5"
              loading="lazy"
            />
          );
        }
        return <React.Fragment key={i}>{part.value}</React.Fragment>;
      })}
    </span>
  );
}

export function buildEmojiMap(
  serverEmojis: EmojiEntry[],
  personalEmojis: EmojiEntry[]
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const e of personalEmojis) {
    const key = e.name.replace(/^:+|:+$/g, "");
    map[key] = e.imageUrl;
  }

  for (const e of serverEmojis) {
    const key = e.name.replace(/^:+|:+$/g, "");
    map[key] = e.imageUrl;
  }
  return map;
}
