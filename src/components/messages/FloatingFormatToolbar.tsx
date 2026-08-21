"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Link,
  Pilcrow,
  Type,
  X,
} from "lucide-react";

interface FloatingFormatToolbarProps {
  position: { x: number; y: number };
  isVisible: boolean;
  onBold: () => void;
  onItalic: () => void;
  onUnderline: () => void;
  onStrikethrough: () => void;
  onLink: () => void;
  onClearFormatting: () => void;
  onClose: () => void;
}

export default function FloatingFormatToolbar({
  position,
  isVisible,
  onBold,
  onItalic,
  onUnderline,
  onStrikethrough,
  onLink,
  onClearFormatting,
  onClose,
}: FloatingFormatToolbarProps) {
  const toolbarRef = useRef<HTMLDivElement>(null);

  if (!isVisible) return null;

  return (
    <div
      ref={toolbarRef}
      className="fixed z-50 flex items-center gap-1 p-1 bg-background border border-border rounded-lg shadow-lg"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: "translateX(-50%)",
        pointerEvents: "auto",
      }}
    >
      <button
        type="button"
        onClick={onBold}
        className="flex items-center justify-center w-7 h-7 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        title="Bold (Ctrl+B)"
      >
        <Bold className="size-4" />
      </button>

      <button
        type="button"
        onClick={onItalic}
        className="flex items-center justify-center w-7 h-7 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        title="Italic (Ctrl+I)"
      >
        <Italic className="size-4" />
      </button>

      <button
        type="button"
        onClick={onUnderline}
        className="flex items-center justify-center w-7 h-7 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        title="Underline (Ctrl+U)"
      >
        <Underline className="size-4" />
      </button>

      <button
        type="button"
        onClick={onStrikethrough}
        className="flex items-center justify-center w-7 h-7 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        title="Strikethrough"
      >
        <Strikethrough className="size-4" />
      </button>

      <div className="w-px h-4 bg-border mx-1" />

      <button
        type="button"
        onClick={onLink}
        className="flex items-center justify-center w-7 h-7 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        title="Add Link"
      >
        <Link className="size-4" />
      </button>

      <button
        type="button"
        onClick={onClearFormatting}
        className="flex items-center justify-center w-7 h-7 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        title="Clear Formatting"
      >
        <Type className="size-4" />
      </button>

      <div className="w-px h-4 bg-border mx-1" />

      <button
        type="button"
        onClick={onClose}
        className="flex items-center justify-center w-7 h-7 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        title="Close Toolbar"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
