"use client";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useSidebarCtx } from "./sidebar-context";

export function DashboardResizableLayout({
  sidebar,
  children,
  defaultLayout,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
  defaultLayout?: number[];
}) {
  const { panelRef, setCollapsed } = useSidebarCtx();

  const onLayout = (sizes: number[]) => {

    if (typeof window !== 'undefined' && window.innerWidth < 768) return;
    document.cookie = `react-resizable-panels:layout=${JSON.stringify(sizes)}; path=/; max-age=31536000`;
  };

  return (
    <ResizablePanelGroup
      direction="horizontal"
      className="h-full overflow-hidden"
      onLayout={onLayout}
    >
      <ResizablePanel
        ref={panelRef}
        collapsible={true}
        minSize={12}
        maxSize={25}
        defaultSize={defaultLayout?.[0] ?? 16}
        collapsedSize={0}
        onCollapse={() => setCollapsed(true)}
        onExpand={() => setCollapsed(false)}
        className="hidden md:flex flex-col transition-all duration-300 ease-in-out overflow-y-auto no-scrollbar"
      >
        {sidebar}
      </ResizablePanel>

      <ResizableHandle withHandle className="hidden md:flex" />

      <ResizablePanel
        defaultSize={defaultLayout?.[1] ?? 84}
      >
        <div className="h-full flex flex-col overflow-hidden">
          {children}
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
