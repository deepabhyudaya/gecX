"use client";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useEffect, useState } from "react";

export function DashboardPageLayout({
  leftContent,
  rightContent,
  layoutKey = "dashboard-page-layout",
  defaultLayout = [67, 33],
}: {
  leftContent: React.ReactNode;
  rightContent?: React.ReactNode;
  layoutKey?: string;
  defaultLayout?: number[];
}) {
  const [panelLayout, setPanelLayout] = useState<number[]>(defaultLayout);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const saved = document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${layoutKey}=`))
      ?.split("=")[1];
    if (saved) {
      try {
        setPanelLayout(JSON.parse(saved));
      } catch (e) { }
    }
    setIsHydrated(true);
  }, [layoutKey]);

  const onLayout = (sizes: number[]) => {
    document.cookie = `${layoutKey}=${JSON.stringify(sizes)}; path=/; max-age=31536000`;
  };

  if (!rightContent) {
    return (
      <div className="h-full overflow-y-auto custom-scrollbar">
        <div className="p-4 pb-24">{leftContent}</div>
      </div>
    );
  }

  if (!isHydrated) {
    return (
      <div className="h-full overflow-y-auto custom-scrollbar">
        <div className="p-4 pb-24 flex flex-col gap-8">
          {leftContent}
          {rightContent}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="hidden lg:flex flex-1 min-h-0">
        <ResizablePanelGroup
          direction="horizontal"
          onLayout={onLayout}
          className="h-full"
        >
          <ResizablePanel defaultSize={panelLayout[0]} minSize={30}>
            <div className="h-full overflow-y-auto custom-scrollbar">
              <div className="p-4 pb-24">{leftContent}</div>
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={panelLayout[1]} minSize={20}>
            <div className="h-full overflow-y-auto bg-card/30 custom-scrollbar border-l border-border/50">
              <div className="p-4 pb-24 flex flex-col gap-8">{rightContent}</div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      <div className="lg:hidden flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-4 pb-24 flex flex-col gap-8">
          {leftContent}
          {rightContent}
        </div>
      </div>
    </div>
  );
}
