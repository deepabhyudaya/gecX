"use client";

import { useEffect } from "react";
import { GraduationCap } from "lucide-react";

function ThemeRestorer() {
  useEffect(() => {
    try {
      const stored = localStorage.getItem("gecx_equipped_theme");
      if (!stored) return;
      const { vars, mode } = JSON.parse(stored) as {
        vars: Record<string, string>;
        mode: "light" | "dark";
      };
      const htmlEl = document.documentElement;
      Object.entries(vars).forEach(([key, value]) => {
        if (key === "backgroundImage") {
          document.body.style.backgroundImage = value;
        } else {
          htmlEl.style.setProperty(key, value);
        }
      });
      htmlEl.style.colorScheme = mode;
      htmlEl.classList.remove("light", "dark");
      htmlEl.classList.add(mode);
    } catch {

    }
  }, []);
  return null;
}

export default function TicketsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen overflow-y-auto bg-background/90 backdrop-blur-md text-foreground font-sans custom-scrollbar">
      <ThemeRestorer />
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <GraduationCap className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-bold text-[15px] tracking-tight">gecX</span>
              <span className="text-[10px] text-muted-foreground">Support Portal</span>
            </div>
          </div>
          <a
            href="/"
            className="text-sm font-semibold bg-primary text-primary-foreground px-5 py-2 rounded-lg transition-all hover:bg-primary/90 active:scale-95"
          >
            Sign In
          </a>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-10">{children}</main>
    </div>
  );
}
