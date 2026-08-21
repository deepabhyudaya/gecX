"use client";

import { Suspense, useRef, useState, useEffect } from "react";
import { ImperativePanelHandle } from "react-resizable-panels";
import { RouteProgress } from "./RouteProgress";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { SidebarContextProvider } from "./sidebar-context";
import { SidebarToggleButton } from "./sidebar-toggle-button";
import { CollapsibleTopBar } from "./CollapsibleTopBar";
import { RoutePrefetcher } from "./RoutePrefetcher";
import EmojiRenderer, { buildEmojiMap } from "@/components/messages/EmojiRenderer";
import { X } from "lucide-react";
import { dismissBanner } from "@/actions/event-theme.actions";

interface EventThemeData {
  id: string;
  name: string;
  backgroundImage: string | null;
  bannerImage: string | null;
  bannerText: string | null;
  bannerTextColor: string;
  bannerBgColor: string;
  bannerOverlayOpacity: number;
  panelBgOpacity: number;
  themeVars: string;
  isActive: boolean;
  createdBy: string;
}

export function DashboardLayoutClient({
  sidebar,
  topBar,
  children,
  defaultLayout,
  eventTheme,
  bannerDismissedAt,
}: {
  sidebar: React.ReactNode;
  topBar: React.ReactNode;
  children: React.ReactNode;
  defaultLayout?: number[];
  eventTheme?: EventThemeData | null;
  bannerDismissedAt?: Date | null;
}) {
  const panelRef = useRef<ImperativePanelHandle>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [emojiMap, setEmojiMap] = useState<Record<string, string>>({});
  const [bannerClosed, setBannerClosed] = useState(!!bannerDismissedAt);

  useEffect(() => {
    fetch("/api/user-emojis")
      .then((res) => res.json())
      .then((data) => {
        const emojis = data.emojis || [];
        const map = buildEmojiMap(emojis, []);
        setEmojiMap(map);
      })
      .catch(() => setEmojiMap({}));
  }, []);

  const toggle = () => {
    const panel = panelRef.current;
    if (panel) {
      if (panel.isCollapsed()) {
        panel.expand();
      } else {
        panel.collapse();
      }
    }
  };

  const onLayout = (sizes: number[]) => {
    if (typeof window !== "undefined" && window.innerWidth < 768) return;
    document.cookie = `react-resizable-panels:layout=${JSON.stringify(sizes)}; path=/; max-age=31536000`;
  };

  const showBanner = (!!eventTheme?.bannerImage || !!eventTheme?.bannerText) && !bannerClosed;

  return (
    <div className="h-screen flex flex-col overflow-hidden relative">
      {eventTheme?.backgroundImage && (
        <div
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat pointer-events-none"
          style={{ backgroundImage: `url(${eventTheme.backgroundImage})` }}
        />
      )}

      <RoutePrefetcher />
      <Suspense fallback={null}>
        <RouteProgress />
      </Suspense>
      <ResizablePanelGroup
        direction="horizontal"
        className="h-full overflow-hidden relative z-10"
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
          <SidebarContextProvider value={{ collapsed, setCollapsed, mobileOpen, setMobileOpen, toggle, panelRef }}>
            {sidebar}
          </SidebarContextProvider>
        </ResizablePanel>

        <ResizableHandle withHandle className="hidden md:flex" />

        <ResizablePanel defaultSize={defaultLayout?.[1] ?? 84}>
          <div className="h-full flex flex-col overflow-hidden relative">
            {showBanner && (
              <div
                className="w-full shrink-0 bg-cover bg-center relative overflow-hidden"
                style={{
                  backgroundImage: eventTheme?.bannerImage ? `url(${eventTheme.bannerImage})` : undefined,
                  minHeight: "2.5rem",
                }}
              >
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundColor: eventTheme?.bannerBgColor || "rgba(0,0,0,0.6)",
                    opacity: eventTheme?.bannerOverlayOpacity ?? 0.4,
                  }}
                />
                {eventTheme?.bannerText && (
                  <div className="relative z-10 flex items-center justify-center px-4 py-2">
                    <span
                      className="font-bold text-sm md:text-base tracking-wide drop-shadow-sm"
                      style={{ color: eventTheme?.bannerTextColor || "#ffffff" }}
                    >
                      <EmojiRenderer content={eventTheme.bannerText} emojiMap={emojiMap} />
                    </span>
                  </div>
                )}
                <button
                  onClick={async () => {
                    setBannerClosed(true);
                    if (eventTheme?.id) {
                      try { await dismissBanner(eventTheme.id); } catch {}
                    }
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-1 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors"
                  title="Close banner"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <CollapsibleTopBar>
              <div className="w-full flex items-center bg-background/80 backdrop-blur-sm shrink-0">
                <SidebarToggleButton
                  collapsed={collapsed}
                  onToggle={toggle}
                  onMobileOpen={() => setMobileOpen(true)}
                />
                <div className="flex-1">{topBar}</div>
              </div>
            </CollapsibleTopBar>
            <div className="flex-1 overflow-hidden relative">
              <main className="h-full overflow-y-auto">{children}</main>
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
