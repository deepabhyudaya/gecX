"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  Bold,
  Code2,
  Heading1,
  Italic,
  Link,
  List,
  ListOrdered,
  Pilcrow,
  Quote,
  Send,
  SmilePlus,
  Strikethrough,
  Table,
  Trash2,
  Underline,
  Film,
} from "lucide-react";
import SlashCommandMenu, { SlashCommand } from "./SlashCommandMenu";
import LinkDialog from "./LinkDialog";
import TableDialog from "./TableDialog";
import MediaPicker, { EmojiItem, StickerItem } from "./MediaPicker";
import EmojiPicker from "./LazyEmojiPicker";
import { useTheme } from "next-themes";

type RichMessageInputProps = {
  placeholder: string;
  disabled?: boolean;
  submitDisabled?: boolean;
  onSubmit: (content: string) => Promise<void> | void;
  onSlashCommands?: SlashCommand[];
  onEditorChange?: (content: string) => void;
  appendTextToken?: string | null;
  onTokenConsumed?: () => void;
  serverEmojis?: EmojiItem[];
  serverStickers?: StickerItem[];
};

const QUICK_MARKDOWN_COMMANDS = [
  { id: "header", title: "/header", description: "Heading 1", snippet: "# " },
  { id: "bullets", title: "/bullets", description: "Bullet list", snippet: "- " },
  { id: "numbered", title: "/numbered", description: "Numbered list", snippet: "1. " },
  { id: "quote", title: "/quote", description: "Block quote", snippet: "> " },
  { id: "codeblock", title: "/codeblock", description: "Code block", snippet: "```\ncode\n```" },
  {
    id: "table",
    title: "/table",
    description: "Insert markdown table",
    snippet: "| Column 1 | Column 2 |\n| --- | --- |\n| Value 1 | Value 2 |",
  },
  { id: "ticks", title: "/ticks", description: "Inline code", snippet: "`text`" },
  { id: "link", title: "/link", description: "Insert link", snippet: "[label](https://example.com)" },
  { id: "strike", title: "/strike", description: "Strikethrough", snippet: "~~text~~" },
  { id: "underline", title: "/underline", description: "Underline", snippet: "<u>text</u>" },
  { id: "sup", title: "/sup", description: "Superscript", snippet: "<sup>2</sup>" },
  { id: "sub", title: "/sub", description: "Subscript", snippet: "<sub>2</sub>" },
  { id: "p", title: "/p", description: "Paragraph", snippet: "" },
];

export default function RichMessageInput({
  placeholder,
  disabled,
  submitDisabled,
  onSubmit,
  onSlashCommands = [],
  onEditorChange,
  appendTextToken,
  onTokenConsumed,
  serverEmojis = [],
  serverStickers = [],
}: RichMessageInputProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [markdown, setMarkdown] = useState("");
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [showTableDialog, setShowTableDialog] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [mediaPickerInitialTab, setMediaPickerInitialTab] = useState<"gif" | "emoji" | "sticker">("gif");
  const pickerRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!showMediaPicker) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowMediaPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMediaPicker]);

  useEffect(() => {
    if (!showEmojiPicker) return;
    const handler = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showEmojiPicker]);

  const replaceWithMarkdown = useCallback((nextMarkdown: string) => {
    setMarkdown(nextMarkdown);
    onEditorChange?.(nextMarkdown);
    setShowSlashMenu(nextMarkdown.trimStart().startsWith("/"));
    if (textareaRef.current) {
      textareaRef.current.value = nextMarkdown;
      textareaRef.current.focus();
    }
  }, [onEditorChange]);

  const moveCaretToEnd = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(textareaRef.current.value.length, textareaRef.current.value.length);
    }
  }, []);

  const appendInlineAtEnd = useCallback((text: string) => {
    setMarkdown((prev) => {
      const next = prev + text;
      onEditorChange?.(next);
      if (textareaRef.current) {
        textareaRef.current.value = next;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(textareaRef.current.value.length, textareaRef.current.value.length);
      }
      return next;
    });
  }, [onEditorChange]);

  const handleLink = useCallback(() => {
    setShowLinkDialog(true);
  }, []);

  const handleLinkConfirm = useCallback((url: string) => {
    void appendInlineAtEnd(`[${url}](${url})`);
  }, [appendInlineAtEnd]);

  const handleTable = useCallback(() => {
    setShowTableDialog(true);
  }, []);

  const handleTableConfirm = useCallback(async (rows: number, cols: number) => {
    const generateTableMarkdown = (r: number, c: number) => {
      let markdown = "";

      markdown += "| " + Array.from({ length: c }, (_, i) => `Column ${i + 1}`).join(" | ") + " |\n";

      markdown += "| " + Array.from({ length: c }, () => "---").join(" | ") + " |\n";

      for (let i = 0; i < r - 1; i++) {
        markdown += "| " + Array.from({ length: c }, (_, j) => `Value ${i + 1}-${j + 1}`).join(" | ") + " |\n";
      }
      return markdown.trim();
    };

    const tableMarkdown = generateTableMarkdown(rows, cols);
    const separator = markdown && !/\n$/.test(markdown) ? "\n\n" : "";
    await replaceWithMarkdown(`${markdown}${separator}${tableMarkdown}`);

    moveCaretToEnd();
  }, [markdown, replaceWithMarkdown, moveCaretToEnd]);

  useEffect(() => {
    if (!appendTextToken) return;

    void appendInlineAtEnd(appendTextToken);

    onTokenConsumed?.();
  }, [appendTextToken, onTokenConsumed, appendInlineAtEnd]);

  const submitCurrent = useCallback(async () => {
    const current = markdown.trim();
    console.log("[RichMessageInput] submitCurrent called, markdown:", current, "disabled:", disabled, "submitDisabled:", submitDisabled);
    if (!current || disabled || submitDisabled) {
      console.log("[RichMessageInput] submitCurrent early return");
      return;
    }

    const previousMarkdown = markdown;
    await replaceWithMarkdown("");

    try {
      console.log("[RichMessageInput] calling onSubmit with:", current);
      await onSubmit(current);
    } catch (error) {
      console.error("[RichMessageInput] send failed, restoring text:", error);
      await replaceWithMarkdown(previousMarkdown);
      throw error;
    }
  }, [disabled, markdown, onSubmit, replaceWithMarkdown, submitDisabled]);

  const toggleHeading = useCallback(async () => {
    if (markdown.trimStart().startsWith("# ")) {
      await replaceWithMarkdown(markdown.replace(/^#\s+/, ""));
      return;
    }
    await replaceWithMarkdown(`# ${markdown || "Heading"}`);
  }, [markdown, replaceWithMarkdown]);

  const formattingCommands = useMemo(
    () => [
      { icon: <Bold className="size-4" />, action: () => appendInlineAtEnd("**bold**") },
      { icon: <Italic className="size-4" />, action: () => appendInlineAtEnd("*italic*") },
      { icon: <Underline className="size-4" />, action: () => appendInlineAtEnd("<u>underline</u>") },
      { icon: <Strikethrough className="size-4" />, action: () => appendInlineAtEnd("~~strike~~") },
      { icon: <Code2 className="size-4" />, action: () => appendInlineAtEnd("`code`") },
      { icon: <Heading1 className="size-4" />, action: toggleHeading },
      { icon: <List className="size-4" />, action: () => replaceWithMarkdown(`- ${markdown || "List item"}`) },
      { icon: <ListOrdered className="size-4" />, action: () => replaceWithMarkdown(`1. ${markdown || "List item"}`) },
      { icon: <Quote className="size-4" />, action: () => replaceWithMarkdown(`> ${markdown || "Quote"}`) },
      {
        icon: <Table className="size-4" />,
        action: handleTable,
      },
      { icon: <Pilcrow className="size-4" />, action: () => replaceWithMarkdown(markdown.replace(/^#+\s+/, "")) },
      { icon: <Link className="size-4" />, action: handleLink },
    ],
    [appendInlineAtEnd, markdown, replaceWithMarkdown, toggleHeading, handleLink, handleTable]
  );

  const slashCommands: SlashCommand[] = useMemo(() => {
    const quick = QUICK_MARKDOWN_COMMANDS.map((cmd) => ({
      id: cmd.id,
      title: cmd.title,
      description: cmd.description,
      keywords: ["markdown", "format", cmd.id],
      icon: <Code2 className="size-4" />,
      onSelect: async () => {
        await replaceWithMarkdown(cmd.snippet);
        setShowSlashMenu(false);
      },
    }));
    return [...quick, ...onSlashCommands];
  }, [onSlashCommands, replaceWithMarkdown]);

  return (
    <div ref={wrapperRef} className="relative z-0">
      {showSlashMenu && slashCommands.length > 0 && (
        <div className="absolute bottom-full left-0 right-0 mb-2 z-[9999]">
          <SlashCommandMenu query={markdown.replace(/^\//, "")} commands={slashCommands} />
        </div>
      )}

      {showMediaPicker && (
        <div ref={pickerRef} className="absolute bottom-full right-0 mb-2 z-[9999]">
          <MediaPicker
            key={mediaPickerInitialTab}
            initialTab={mediaPickerInitialTab}
            onGifSelect={(url) => {
              onSubmit(url);
              setShowMediaPicker(false);
            }}
            onEmojiSelect={(syntax) => {
              appendInlineAtEnd(syntax);
              setShowMediaPicker(false);
            }}
            onStickerSelect={(url) => {
              onSubmit(url);
              setShowMediaPicker(false);
            }}
            serverEmojis={serverEmojis}
            serverStickers={serverStickers}
            onClose={() => setShowMediaPicker(false)}
          />
        </div>
      )}
      {showEmojiPicker && (
        <div ref={emojiPickerRef} className="absolute bottom-full right-0 mb-2 z-[9999]">
          <EmojiPicker
            onEmojiClick={(emojiData) => {
              appendInlineAtEnd(emojiData.emoji);
              setShowEmojiPicker(false);
            }}
            width={300}
            height={400}
            theme={resolvedTheme === "dark" ? "dark" : "light"}
          />
        </div>
      )}
      <div className="rounded-md border border-border overflow-hidden">
      <div className="flex items-center gap-0.5 border-b border-border px-1.5 py-0.5 flex-shrink-0">
        {formattingCommands.map((btn, index) => (
          <button
            key={index}
            type="button"
            onClick={btn.action}
            className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            disabled={disabled}
          >
            {btn.icon}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => {
              setShowEmojiPicker(false);
              setShowMediaPicker((v) => !v);
            }}
            disabled={disabled}
            className={`inline-flex h-6 w-6 items-center justify-center rounded transition-colors ${
              showMediaPicker
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
            title="GIFs, Emojis & Stickers (Ctrl+Shift+G / Ctrl+Shift+E)"
          >
            <Film className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setShowMediaPicker(false);
              setShowEmojiPicker((v) => !v);
            }}
            disabled={disabled}
            className={`inline-flex h-6 w-6 items-center justify-center rounded transition-colors ${
              showEmojiPicker
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
            title="Unicode emojis (Ctrl+E)"
          >
            <SmilePlus className="size-3.5" />
          </button>
        </div>
      </div>
      <div className="min-h-[36px] max-h-[160px] overflow-auto px-2 py-1 flex-1 relative">
        <textarea
          ref={textareaRef}
          value={markdown}
          onChange={(e) => {
            setMarkdown(e.target.value);
            onEditorChange?.(e.target.value);
            setShowSlashMenu(e.target.value.trimStart().startsWith("/"));
          }}
          onKeyDown={(e) => {

            if (e.key === "Escape") {
              if (showMediaPicker || showEmojiPicker) {
                e.preventDefault();
                setShowMediaPicker(false);
                setShowEmojiPicker(false);
                return;
              }
              setShowSlashMenu(false);
              return;
            }

            const isMac = navigator.platform?.toLowerCase().includes("mac");
            const modKey = isMac ? e.metaKey : e.ctrlKey;
            if (!showMediaPicker && !showEmojiPicker && !showSlashMenu) {
              if (modKey && e.shiftKey && e.key.toLowerCase() === "e") {
                e.preventDefault();
                setMediaPickerInitialTab("emoji");
                setShowEmojiPicker(false);
                setShowMediaPicker(true);
                return;
              }
              if (modKey && e.shiftKey && e.key.toLowerCase() === "g") {
                e.preventDefault();
                setMediaPickerInitialTab("gif");
                setShowEmojiPicker(false);
                setShowMediaPicker(true);
                return;
              }
              if (modKey && !e.shiftKey && e.key.toLowerCase() === "e") {
                e.preventDefault();
                setShowMediaPicker(false);
                setShowEmojiPicker(true);
                return;
              }
            }

            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void submitCurrent();
            } else if (e.key === "Backspace" || e.key === "Delete") {
              const target = e.target as HTMLTextAreaElement;
              setShowSlashMenu(target.value.trimStart().startsWith("/"));
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full h-full min-h-[36px] max-h-[160px] resize-none bg-transparent outline-none text-[14px] text-foreground"
        />
      </div>

      <LinkDialog
        isOpen={showLinkDialog}
        onClose={() => setShowLinkDialog(false)}
        onConfirm={handleLinkConfirm}
      />

      <TableDialog
        isOpen={showTableDialog}
        onClose={() => setShowTableDialog(false)}
        onConfirm={handleTableConfirm}
      />

      <div className="flex justify-end gap-1.5 px-1.5 pb-1.5">
        <button
          type="button"
          onClick={() => {
            void replaceWithMarkdown("");
          }}
          disabled={!markdown.trim() || disabled}
          className="h-8 w-8 inline-flex items-center justify-center rounded border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
          title="Clear input"
        >
          <Trash2 className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => {
            void submitCurrent();
          }}
          disabled={!markdown.trim() || disabled || submitDisabled}
          className="h-8 w-8 inline-flex items-center justify-center rounded bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <Send className="size-3.5" />
        </button>
      </div>
      </div>
    </div>
  );
}
