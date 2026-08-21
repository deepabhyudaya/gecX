"use client";

import { useState, useEffect, useRef, useCallback, useMemo, forwardRef } from "react";
import { Search, X, Loader2, Smile, Sticker, Film, Lock } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

export interface GifResult {
  id: string;
  title: string;
  url: string;
  preview: string;
  width: number;
  height: number;
}

export interface EmojiItem {
  id: string;
  name: string;
  imageUrl: string;
  packId?: string;
  groupName?: string;
  usable?: boolean;
}

export interface StickerItem {
  id: string;
  name: string;
  imageUrl: string;
  packId?: string;
  groupName?: string;
  usable?: boolean;
}

interface MediaPickerProps {
  onGifSelect: (gifUrl: string) => void;
  onEmojiSelect: (emojiSyntax: string) => void;
  onStickerSelect?: (stickerUrl: string) => void;
  serverEmojis?: EmojiItem[];
  serverStickers?: StickerItem[];
  onClose: () => void;
  hideStickers?: boolean;
  initialTab?: Tab;
  className?: string;
  style?: React.CSSProperties;
}

type Tab = "gif" | "emoji" | "sticker";

export default function MediaPicker({
  onGifSelect,
  onEmojiSelect,
  onStickerSelect,
  serverEmojis = [],
  serverStickers = [],
  onClose,
  hideStickers = false,
  initialTab = "gif",
  className,
  style,
}: MediaPickerProps) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [query, setQuery] = useState("");
  const [gifs, setGifs] = useState<GifResult[]>([]);
  const [loadingGifs, setLoadingGifs] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const searchRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const fetchGifs = useCallback(async (q: string) => {
    setLoadingGifs(true);
    try {
      const res = await fetch(`/api/giphy?q=${encodeURIComponent(q)}&limit=24`);
      const data = await res.json();
      setGifs(data.results || []);
    } catch {
      setGifs([]);
    } finally {
      setLoadingGifs(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "gif") {
      fetchGifs("");
    }
  }, [tab, fetchGifs]);

  useEffect(() => {
    if (tab !== "gif") return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchGifs(query);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, tab, fetchGifs]);

  useEffect(() => {
    setTimeout(() => searchRef.current?.focus(), 50);
  }, []);

  useEffect(() => {
    setSelectedIndex(0);
  }, [tab, query]);

  const allEmojis = serverEmojis;
  const allStickers = serverStickers;

  const filteredEmojis = query
    ? allEmojis.filter((e) => e.name.includes(query.toLowerCase()))
    : allEmojis;
  const filteredStickers = query
    ? allStickers.filter((s) => s.name.includes(query.toLowerCase()))
    : allStickers;

  const groupedEmojis = groupBy(filteredEmojis, (e) => e.groupName || "Other");
  const groupedStickers = groupBy(filteredStickers, (s) => s.groupName || "Other");

  const flatUsableEmojis = filteredEmojis.filter((e) => e.usable !== false);
  const flatUsableStickers = filteredStickers.filter((s) => s.usable !== false);

  const usableEmojiIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    flatUsableEmojis.forEach((e, i) => map.set(e.id, i));
    return map;
  }, [flatUsableEmojis]);

  const usableStickerIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    flatUsableStickers.forEach((s, i) => map.set(s.id, i));
    return map;
  }, [flatUsableStickers]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const items = tab === "gif" ? gifs : tab === "emoji" ? flatUsableEmojis : flatUsableStickers;
      if (items.length === 0) return;

      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % items.length);
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + items.length) % items.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        const item = items[selectedIndex];
        if (!item) return;
        if (tab === "gif") {
          onGifSelect((item as GifResult).url);
          onClose();
        } else if (tab === "emoji") {
          onEmojiSelect(`:${(item as EmojiItem).name}:`);
          onClose();
        } else if (tab === "sticker") {
          onStickerSelect?.((item as StickerItem).imageUrl);
          onClose();
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    const el = containerRef.current;
    if (!el) return;
    el.focus();
    el.addEventListener("keydown", handler);
    return () => el.removeEventListener("keydown", handler);
  }, [tab, gifs, filteredEmojis, filteredStickers, selectedIndex, onGifSelect, onEmojiSelect, onStickerSelect, onClose]);

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "gif", label: "GIFs", icon: <Film className="size-4" /> },
    { key: "emoji", label: "Emojis", icon: <Smile className="size-4" /> },
    ...(hideStickers ? [] : [{ key: "sticker" as Tab, label: "Stickers", icon: <Sticker className="size-4" /> }]),
  ];

  useEffect(() => {
    const el = containerRef.current?.querySelector('[data-selected="true"]');
    if (el) {
      el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [selectedIndex]);

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      className={cn(
        "flex flex-col rounded-xl border border-border shadow-2xl overflow-hidden outline-none",
        className
      )}
      style={{
        width: 360,
        height: 420,
        background: isDark ? "hsl(var(--background))" : "hsl(var(--background))",
        ...style,
      }}
    >
      <div className="flex items-center justify-between px-3 pt-3 pb-2 border-b border-border shrink-0">
        <div className="flex gap-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setQuery(""); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-semibold transition-colors ${
                tab === t.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="px-3 py-2 border-b border-border shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              tab === "gif" ? "Search GIFs..." :
              tab === "emoji" ? "Search emojis..." :
              "Search stickers..."
            }
            className="w-full h-8 pl-8 pr-3 rounded-md text-[13px] bg-muted border-none outline-none text-foreground placeholder:text-muted-foreground"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">

        {tab === "gif" && (
          <div className="p-2">
            {loadingGifs ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : gifs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground">
                <Film className="size-8 opacity-40" />
                <p className="text-[12px]">
                  {query ? "No GIFs found" : "GIPHY API key not configured"}
                </p>
              </div>
            ) : (
              <div className="columns-2 gap-2 space-y-2">
                {gifs.map((gif, idx) => (
                  <button
                    key={gif.id}
                    data-selected={selectedIndex === idx}
                    onClick={() => {
                      onGifSelect(gif.url);
                      onClose();
                    }}
                    className={`block w-full rounded-lg overflow-hidden hover:opacity-80 hover:scale-[1.02] transition-all duration-150 bg-muted ${
                      selectedIndex === idx ? "ring-2 ring-primary ring-offset-1" : ""
                    }`}
                    title={gif.title}
                  >
                    <img
                      src={gif.preview || gif.url}
                      alt={gif.title}
                      className="w-full object-cover"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "emoji" && (
          <div className="p-2 space-y-3">
            {allEmojis.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground">
                <Smile className="size-8 opacity-40" />
                <p className="text-[12px] text-center px-4">
                  No custom emojis yet.
                </p>
              </div>
            ) : filteredEmojis.length === 0 ? (
              <div className="flex items-center justify-center h-24 text-muted-foreground text-[12px]">
                No emojis match &quot;{query}&quot;
              </div>
            ) : (
              <>
                {groupedEmojis.map(([groupName, emojis]) => {
                  const usableInGroup = emojis.filter((e) => e.usable !== false);
                  return (
                    <div key={groupName}>
                      <div className="flex items-center gap-1.5 mb-1 px-0.5">
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">{groupName}</span>
                        <div className="flex-1 h-px bg-border/60" />
                        <span className="text-[10px] text-muted-foreground">{emojis.length}</span>
                      </div>
                      <div className="grid grid-cols-7 gap-1">
                        {emojis.map((emoji) => {
                          const isUsable = emoji.usable !== false;
                          const globalIdx = usableEmojiIndexMap.get(emoji.id);
                          const isSelected = isUsable && globalIdx !== undefined && selectedIndex === globalIdx;
                          return (
                            <EmojiButton
                              key={emoji.id}
                              emoji={emoji}
                              isSelected={isSelected}
                              onClick={() => {
                                if (!isUsable) return;
                                onEmojiSelect(`:${emoji.name}:`);
                                onClose();
                              }}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}

        {tab === "sticker" && (
          <div className="p-2 space-y-3">
            {allStickers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground">
                <Sticker className="size-8 opacity-40" />
                <p className="text-[12px] text-center px-4">
                  No custom stickers yet.
                </p>
              </div>
            ) : filteredStickers.length === 0 ? (
              <div className="flex items-center justify-center h-24 text-muted-foreground text-[12px]">
                No stickers match &quot;{query}&quot;
              </div>
            ) : (
              <>
                {groupedStickers.map(([groupName, stickers]) => {
                  const usableInGroup = stickers.filter((s) => s.usable !== false);
                  return (
                    <div key={groupName}>
                      <div className="flex items-center gap-1.5 mb-1 px-0.5">
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">{groupName}</span>
                        <div className="flex-1 h-px bg-border/60" />
                        <span className="text-[10px] text-muted-foreground">{stickers.length}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {stickers.map((sticker) => {
                          const isUsable = sticker.usable !== false;
                          const globalIdx = usableStickerIndexMap.get(sticker.id);
                          const isSelected = isUsable && globalIdx !== undefined && selectedIndex === globalIdx;
                          return (
                            <button
                              key={sticker.id}
                              data-selected={isSelected}
                              onClick={() => {
                                if (!isUsable) return;
                                onStickerSelect?.(sticker.imageUrl);
                                onClose();
                              }}
                              className={`group relative aspect-square rounded-xl overflow-hidden bg-muted p-2 flex items-center justify-center border transition-all duration-150 ${
                                isUsable
                                  ? "hover:bg-muted/80 hover:scale-105"
                                  : "opacity-50 cursor-not-allowed"
                              } ${
                                isSelected
                                  ? "border-primary ring-1 ring-primary"
                                  : "border-border"
                              }`}
                              title={isUsable ? sticker.name : `${sticker.name} (locked)`}
                            >
                              <img
                                src={sticker.imageUrl}
                                alt={sticker.name}
                                className="w-full h-full object-contain"
                                loading="lazy"
                              />
                              {!isUsable && (
                                <div className="absolute inset-0 flex items-center justify-center bg-background/40">
                                  <Lock className="w-4 h-4 text-muted-foreground" />
                                </div>
                              )}
                              <span className="absolute bottom-0 left-0 right-0 text-[9px] text-center text-muted-foreground bg-background/80 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity truncate px-1">
                                :{sticker.name}:
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}
      </div>

      <div className="px-3 py-2 border-t border-border shrink-0 flex items-center justify-between">
        {tab === "gif" && (
          <p className="text-[10px] text-muted-foreground">
            Powered by <span className="font-semibold">GIPHY</span>
          </p>
        )}
        {(tab === "emoji" || tab === "sticker") && (
          <p className="text-[10px] text-muted-foreground">
            Get more in the <span className="font-semibold text-primary">Shop</span>
          </p>
        )}
        <div />
      </div>
    </div>
  );
}

function groupBy<T>(items: T[], keyFn: (item: T) => string): [string, T[]][] {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return Array.from(map.entries());
}

const EmojiButton = forwardRef<HTMLButtonElement, { emoji: EmojiItem; onClick: () => void; isSelected?: boolean }>(
  function EmojiButton({ emoji, onClick, isSelected }, ref) {
    const isUsable = emoji.usable !== false;
    return (
      <button
        ref={ref}
        data-selected={isSelected}
        onClick={onClick}
        className={`group relative flex items-center justify-center w-full aspect-square rounded-lg transition-colors p-0.5 ${
          isUsable ? "hover:bg-muted" : "opacity-50 cursor-not-allowed"
        } ${
          isSelected ? "ring-2 ring-primary ring-offset-1 bg-muted" : ""
        }`}
        title={isUsable ? `:${emoji.name}:` : `:${emoji.name}: (locked)`}
      >
        <img
          src={emoji.imageUrl}
          alt={emoji.name}
          className="w-full h-full object-contain"
          loading="lazy"
        />
        {!isUsable && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/40 rounded-lg">
            <Lock className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
        )}
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-foreground text-background text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
          :{emoji.name}:
        </div>
      </button>
    );
  }
);
