"use client";

import React from "react";

interface EmojiReactionProps {
  emoji: string;
  emojiMap?: Record<string, string>;
  className?: string;
}

export default function EmojiReaction({ emoji, emojiMap = {}, className = "" }: EmojiReactionProps) {

  const match = emoji.match(/^:([a-z0-9_]{1,64}):$/);

  if (match) {
    const name = match[1];
    const imageUrl = emojiMap[name];

    if (imageUrl) {
      return (
        <img
          src={imageUrl}
          alt={emoji}
          title={emoji}
          className={`inline-block w-4 h-4 object-contain ${className}`}
          loading="lazy"
        />
      );
    }
  }

  return <span className={className}>{emoji}</span>;
}
