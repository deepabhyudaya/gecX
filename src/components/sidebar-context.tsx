"use client";

import { createContext, useContext, useRef, useState, useEffect, useMemo } from "react";
import { ImperativePanelHandle } from "react-resizable-panels";

type SidebarContextType = {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  toggle: () => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  panelRef: React.RefObject<ImperativePanelHandle> | null;
};

const SidebarCtx = createContext<SidebarContextType>({
  collapsed: false,
  setCollapsed: () => {},
  toggle: () => {},
  mobileOpen: false,
  setMobileOpen: () => {},
  panelRef: null,
});

export function useSidebarCtx() {
  return useContext(SidebarCtx);
}

export function SidebarContextProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value?: SidebarContextType;
}) {

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const panelRef = useRef<ImperativePanelHandle>(null);

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

  useEffect(() => {
    if (value) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "b") {
        e.preventDefault();
        if (window.innerWidth < 768) {
          setMobileOpen((open) => !open);
        } else {
          toggle();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [value]);

  const localValue = useMemo(
    () => ({
      collapsed,
      setCollapsed,
      toggle,
      mobileOpen,
      setMobileOpen,
      panelRef,
    }),
    [collapsed, mobileOpen]
  );

  return (
    <SidebarCtx.Provider value={value ?? localValue}>
      {children}
    </SidebarCtx.Provider>
  );
}
