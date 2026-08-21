"use client";

import * as React from "react";
import { Search, X, ArrowRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { usePinnedItems } from "@/hooks/usePinnedItems";
import { Pin } from "lucide-react";

export type SearchItem = {
  id: string | number;
  label: string;
  sublabel?: string;

  href?: string;
};

type Props = {
  items?: SearchItem[];

  entityLabel?: string;
  allowPinning?: boolean;
  role?: string;
};

const TableSearchInner = ({ items = [], entityLabel = "Results", allowPinning = false, role }: Props) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSearch = searchParams.get("search") ?? "";

  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const { isPinned, togglePin } = usePinnedItems(entityLabel.toLowerCase());

  const canPin = allowPinning && role === "admin";

  const handleOpen = () => {
    setQuery(currentSearch);
    setOpen(true);
  };

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "f" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleOpen();
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);

  }, [currentSearch]);

  const applySearch = React.useCallback(
    (value: string) => {
      setOpen(false);
      const params = new URLSearchParams(window.location.search);
      if (value) {
        params.set("search", value);
      } else {
        params.delete("search");
      }
      params.delete("page");
      router.push(`${window.location.pathname}?${params}`);
    },
    [router]
  );

  const navigateTo = React.useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router]
  );

  const clearSearch = (e: React.MouseEvent) => {
    e.stopPropagation();
    applySearch("");
  };

  const filtered = React.useMemo(() => {
    if (!query) return items;
    const q = query.toLowerCase();
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        (item.sublabel?.toLowerCase().includes(q) ?? false)
    );
  }, [items, query]);

  return (
    <>
      <button
        id="table-search-trigger"
        onClick={handleOpen}
        className="flex items-center gap-2 text-xs rounded-full px-3 py-2 w-full md:w-64 bg-secondary hover:bg-secondary/80 transition-all duration-200 text-muted-foreground hover:text-foreground group border border-transparent hover:border-border/50"
        aria-label="Open search"
      >
        <Search className="h-3.5 w-3.5 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" />
        <span className="flex-1 text-left truncate">
          {currentSearch ? (
            <span className="text-foreground font-medium">{currentSearch}</span>
          ) : (
            `Search ${entityLabel.toLowerCase()}…`
          )}
        </span>
        {currentSearch ? (
          <span
            role="button"
            tabIndex={0}
            onClick={clearSearch}
            onKeyDown={(e) =>
              e.key === "Enter" && clearSearch(e as unknown as React.MouseEvent)
            }
            className="ml-auto p-0.5 rounded-full hover:bg-foreground/10 transition-colors"
            aria-label="Clear search"
          >
            <X className="h-3 w-3 opacity-60" />
          </span>
        ) : (
          <kbd className="ml-auto hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-border/40 bg-foreground/5 px-1.5 font-mono text-[10px] font-medium opacity-60">
            <span className="text-xs">⌘</span>F
          </kbd>
        )}
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder={`Search ${entityLabel.toLowerCase()}…`}
          value={query}
          onValueChange={setQuery}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !filtered.length) {
              applySearch(query);
            }
          }}
        />
        <CommandList>
          <CommandEmpty>
            {query ? (
              <button
                onClick={() => applySearch(query)}
                className="w-full py-3 text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-2"
              >
                <Search className="h-4 w-4" />
                Filter table by &ldquo;
                <span className="font-semibold text-foreground">{query}</span>
                &rdquo;
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <span className="text-sm text-muted-foreground">
                Start typing to search…
              </span>
            )}
          </CommandEmpty>

          {filtered.length > 0 && (
            <CommandGroup heading={entityLabel}>
              {filtered.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`${item.label} ${item.sublabel ?? ""} ${item.id}`}
                  onSelect={() => {
                    if (item.href) {
                      navigateTo(item.href);
                    } else {
                      applySearch(item.label);
                    }
                  }}
                  className="cursor-pointer flex items-center gap-3 py-2.5"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold uppercase text-muted-foreground">
                    {item.label.charAt(0)}
                  </span>
                  <span className="flex flex-col min-h-0 flex-1">
                    <span className="font-medium leading-tight text-foreground truncate">
                      {item.label}
                    </span>
                    {item.sublabel && (
                      <span className="text-[11px] text-muted-foreground truncate">
                        {item.sublabel}
                      </span>
                    )}
                  </span>

                  {canPin && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePin({
                          id: item.id,
                          name: item.label,
                          info: item.sublabel || "",
                          type: entityLabel.toLowerCase(),
                        });
                      }}
                      className={`ml-auto shrink-0 p-1.5 rounded-full hover:bg-accent transition-colors ${
                        isPinned(item.id, entityLabel.toLowerCase())
                          ? "text-foreground"
                          : "text-muted-foreground/40 hover:text-muted-foreground"
                      }`}
                    >
                      <Pin className={`size-4 ${isPinned(item.id, entityLabel.toLowerCase()) ? "fill-current" : ""}`} />
                    </button>
                  )}

                  {item.href && (
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50 ml-1" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {filtered.length > 0 && query && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Actions">
                <CommandItem
                  value={`filter-table-${query}`}
                  onSelect={() => applySearch(query)}
                  className="cursor-pointer"
                >
                  <Search className="mr-2 h-4 w-4 text-muted-foreground" />
                  Filter table by &ldquo;
                  <span className="font-semibold mx-1">{query}</span>
                  &rdquo;
                </CommandItem>
              </CommandGroup>
            </>
          )}

          {!query && currentSearch && (
            <CommandGroup heading="Active filter">
              <CommandItem
                value={`clear-${currentSearch}`}
                onSelect={() => applySearch("")}
                className="cursor-pointer"
              >
                <X className="mr-2 h-4 w-4 text-muted-foreground" />
                Clear &ldquo;{currentSearch}&rdquo;
              </CommandItem>
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
};

const TableSearch = (props: Props) => (
  <React.Suspense fallback={null}>
    <TableSearchInner {...props} />
  </React.Suspense>
);

export default TableSearch;
