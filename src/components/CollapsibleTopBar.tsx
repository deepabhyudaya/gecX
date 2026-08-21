"use client";

import { useState, useCallback, useEffect } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollapsibleTopBarProps {
  children: React.ReactNode;
}

export function CollapsibleTopBar({ children }: CollapsibleTopBarProps) {
  const [collapsed, setCollapsed] = useState(false);

  const toggle = useCallback(() => setCollapsed((v) => !v), []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "t") {
        e.preventDefault();
        toggle();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggle]);

  return (
    <div className="flex flex-col shrink-0 bg-background overflow-hidden">
      <div
        className={cn(
          "w-full flex items-center bg-background border-b border-border transition-all duration-300 ease-in-out overflow-hidden",
          collapsed ? "max-h-0 opacity-0 border-b-0" : "max-h-20 opacity-100"
        )}
      >
        {children}
      </div>

      <div className="flex justify-center -mt-px relative z-10 bg-background w-full">
        <button
          onClick={toggle}
          className={cn(
            "flex items-center justify-center h-5 w-10 rounded-b-md border border-t-0 border-border bg-muted hover:bg-accent text-muted-foreground hover:text-foreground transition-colors duration-200"
          )}
          aria-label={collapsed ? "Expand top bar" : "Collapse top bar"}
        >
          {collapsed ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronUp className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}
