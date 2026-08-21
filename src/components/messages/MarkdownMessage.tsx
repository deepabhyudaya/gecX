"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useTheme } from "next-themes";
import LazySyntaxHighlighter from "./LazySyntaxHighlighter";
import { Copy, Check } from "lucide-react";
import React, { useState, useCallback, memo } from "react";
import { isImageUrl } from "@/lib/image-detection";
import ImageEmbed from "../ImageEmbed";

function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100 text-[12px] leading-none"
      title="Copy code"
    >
      {copied ? <Check className="size-[12px]" /> : <Copy className="size-[12px]" />}
    </button>
  );
}

function MarkdownMessageComponent({
  content,
  emojiMap = {},
  stickerUrls = []
}: {
  content: string;
  emojiMap?: Record<string, string>;
  stickerUrls?: string[];
}) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const processedContent = React.useMemo(() => {
    if (!content || Object.keys(emojiMap).length === 0) return content;

    return content.replace(/:([a-z0-9_]{1,64}):/g, (match, name) => {
      const url = emojiMap[name];
      if (url) {

        return `![emoji_${name}](${url})`;
      }
      return match;
    });
  }, [content, emojiMap]);

  const components = React.useMemo<any>(() => ({
    h1: ({ children }: any) => (
      <h1 className="my-1 text-[20px] font-bold leading-tight text-inherit">{children}</h1>
    ),
    h2: ({ children }: any) => (
      <h2 className="my-1 text-[17px] font-semibold leading-tight text-inherit">{children}</h2>
    ),
    h3: ({ children }: any) => (
      <h3 className="my-1 text-[15px] font-semibold leading-snug text-inherit">{children}</h3>
    ),
    p: ({ children }: any) => <p className="my-1 text-[14px] leading-relaxed text-inherit">{children}</p>,
    ul: ({ children }: any) => <ul className="my-1 ml-5 list-disc text-inherit">{children}</ul>,
    ol: ({ children }: any) => <ol className="my-1 ml-5 list-decimal text-inherit">{children}</ol>,
    li: ({ children }: any) => <li className="my-0.5 text-[14px] leading-relaxed text-inherit">{children}</li>,
    blockquote: ({ children }: any) => (
      <blockquote className="my-1 border-l-2 border-current/40 pl-3 italic text-inherit/90">{children}</blockquote>
    ),
    table: ({ children }: any) => (
      <div className="my-2 overflow-x-auto">
        <table className="w-full border-collapse text-[13px] text-inherit">{children}</table>
      </div>
    ),
    thead: ({ children }: any) => <thead className="bg-foreground/10">{children}</thead>,
    th: ({ children }: any) => <th className="border border-current/20 px-2 py-1 text-left font-semibold">{children}</th>,
    td: ({ children }: any) => <td className="border border-current/20 px-2 py-1 align-top">{children}</td>,
    strong: ({ children }: any) => <strong className="font-semibold text-inherit">{children}</strong>,
    em: ({ children }: any) => <em className="italic text-inherit">{children}</em>,
    del: ({ children }: any) => <del className="text-inherit">{children}</del>,
    sub: ({ children }: any) => <sub className="text-[11px] text-inherit">{children}</sub>,
    sup: ({ children }: any) => <sup className="text-[11px] text-inherit">{children}</sup>,
    code: ({ inline, className, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || "");
      const lang = match ? match[1] : "";
      const code = String(children);

      if (!inline && lang) {
        return (
          <div className="group relative my-2 rounded-lg overflow-hidden border border-border">
            <div className="flex items-center justify-between px-3 py-1.5 bg-muted text-muted-foreground text-xs leading-none">
              <span className="uppercase font-medium">{lang}</span>
              <CopyButton code={code} />
            </div>
            <LazySyntaxHighlighter
              style={isDark ? oneDark : oneLight}
              language={lang}
              PreTag="div"
              customStyle={{
                margin: 0,
                padding: "12px 16px",
                fontSize: "13px",
                lineHeight: "1.5",
                borderRadius: "0 0 8px 8px",
              }}
              {...props}
            >
              {code}
            </LazySyntaxHighlighter>
          </div>
        );
      }

      return inline ? (
        <code className="rounded bg-foreground/10 px-1 py-0.5 text-[13px] text-inherit" {...props}>
          {children}
        </code>
      ) : (
        <code className="block rounded-md bg-foreground/10 p-2 text-[13px] text-inherit overflow-x-auto" {...props}>
          {children}
        </code>
      );
    },
    pre: ({ children }: any) => <>{children}</>,
    input: ({ type, checked, disabled }: any) =>
      type === "checkbox" ? (
        <span className="mr-1.5 opacity-70">•</span>
      ) : (
        <input type={type} disabled={disabled} />
      ),
    a: ({ href, children }: any) => {

      const textContent = String(children);
      const isBareImageUrl = href && isImageUrl(href) && textContent === href;

      if (isBareImageUrl) {
        return <ImageEmbed src={href} className="my-2" />;
      }

      return (
        <a href={href} className="underline underline-offset-2 text-blue-500 hover:text-blue-600 opacity-90 hover:opacity-100">
          {children}
        </a>
      );
    },
    span: ({ children, style }: any) => (
      <span
        style={style}
        className="text-inherit"
      >
        {children}
      </span>
    ),
  }), [isDark]);

  return (
    <div className="max-w-none text-inherit">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          ...components,
          img: ({ src, alt, ...props }: any) => {
            if (alt && alt.startsWith("emoji_")) {
              return (

                <img
                  src={src}
                  alt={alt.replace("emoji_", ":") + ":"}
                  title={alt.replace("emoji_", ":") + ":"}
                  className="inline-block w-5 h-5 object-contain align-middle mx-0.5"
                  loading="lazy"
                  {...props}
                />
              );
            }

            const isSticker = stickerUrls.some(stickerUrl => src?.includes(stickerUrl) || stickerUrl.includes(src));
            return (
              <ImageEmbed
                src={src}
                className="my-2"
                size={isSticker ? 'sticker' : 'default'}
                {...props}
              />
            );
          }
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}

export default memo(MarkdownMessageComponent);
