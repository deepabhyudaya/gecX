"use client";

import { useEffect, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, RotateCcw, PartyPopper } from "lucide-react";
import { dismissEventTheme, revertEventTheme, getMyEventThemeState } from "@/actions/event-theme.actions";

interface EventTheme {
  id: string;
  name: string;
  backgroundImage: string | null;
  bannerImage: string | null;
  bannerText: string | null;
  bannerTextColor: string;
  bannerBgColor: string;
  bannerOverlayOpacity: number;
  panelBgOpacity: number;
  greetingMessage: string | null;
  greetingAuthorName: string | null;
  themeVars: string;
  isActive: boolean;
  createdBy: string;
}

interface UserState {
  id: string;
  userId: string;
  eventThemeId: string;
  previousThemeId: string | null;
  dismissedAt: Date | null;
  revertedAt: Date | null;
}

interface MyEventThemeData {
  theme: EventTheme;
  state: UserState;
  isCreator: boolean;
}

export function EventThemeProvider({
  children,
  hasActiveEvent = true,
}: {
  children: React.ReactNode;

  hasActiveEvent?: boolean;
}) {
  const [data, setData] = useState<MyEventThemeData | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [isReverting, setIsReverting] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);

  useEffect(() => {
    if (!hasActiveEvent) return;
    let mounted = true;
    getMyEventThemeState()
      .then((res) => {
        if (!mounted) return;
        if (res && res.theme && res.state) {
          setData(res as MyEventThemeData);
        }
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, [hasActiveEvent]);

  const shouldShowDialog = !!(
    data &&
    !data.isCreator &&
    !data.state.dismissedAt &&
    !data.state.revertedAt
  );

  useEffect(() => {
    if (!shouldShowDialog) return;

    let cancelled = false;
    let rafId: number | null = null;

    const timer = setTimeout(async () => {
      setShowDialog(true);
      try {
        const confettiMod = await import("canvas-confetti");
        if (cancelled) return;
        const confetti = confettiMod.default;

        const duration = 3000;
        const end = Date.now() + duration;
        const colors = ["#ff0000", "#ffa500", "#ffff00", "#00ff00", "#00ffff", "#0000ff", "#ff00ff"];

        const frame = () => {
          if (cancelled) return;
          try {
            confetti({
              particleCount: 5,
              angle: 270,
              spread: 180,
              origin: { x: Math.random(), y: 1 },
              colors,
              startVelocity: 40,
              gravity: 0.8,
              scalar: 1.2,
              drift: 0,
              ticks: 200,
            });
          } catch {

          }
          if (Date.now() < end) {
            rafId = requestAnimationFrame(frame);
          }
        };
        frame();
      } catch {

      }
    }, 800);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [shouldShowDialog]);

  const handleDismiss = useCallback(async () => {
    if (!data) return;
    setIsDismissing(true);
    try {
      await dismissEventTheme(data.theme.id);
      setShowDialog(false);
      setData((prev) =>
        prev
          ? {
              ...prev,
              state: { ...prev.state, dismissedAt: new Date() },
            }
          : prev
      );
    } catch (err) {

    } finally {
      setIsDismissing(false);
    }
  }, [data]);

  const handleRevert = useCallback(async () => {
    if (!data) return;
    setIsReverting(true);
    try {
      await revertEventTheme(data.theme.id);
      setShowDialog(false);
      setData((prev) =>
        prev
          ? {
              ...prev,
              state: { ...prev.state, revertedAt: new Date() },
            }
          : prev
      );

      window.location.reload();
    } catch (err) {

    } finally {
      setIsReverting(false);
    }
  }, [data]);

  return (
    <>
      {children}
      <Dialog open={showDialog} onOpenChange={(o) => { if (!o) handleDismiss(); }}>
        <DialogContent className="sm:max-w-md border-primary/30">
          <DialogHeader className="text-center">
            <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <PartyPopper className="w-6 h-6 text-primary" />
            </div>
            <DialogTitle className="text-xl">{data?.theme.name}</DialogTitle>
            <DialogDescription className="text-base">
              {data?.theme.greetingMessage ? (
                <span>{data.theme.greetingMessage}</span>
              ) : (
                <span>A special event theme has been applied to your interface! Enjoy the festive look.</span>
              )}
            </DialogDescription>
            {data?.theme.greetingAuthorName && (
              <p className="text-sm text-muted-foreground mt-1">
                — {data.theme.greetingAuthorName}
              </p>
            )}
          </DialogHeader>
          <div className="space-y-2 text-sm text-muted-foreground text-center">
            <p>You can revert to your previous theme at any time.</p>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" className="w-full sm:w-auto gap-2" onClick={handleDismiss} disabled={isDismissing}>
              <Sparkles className="w-4 h-4" />
              Keep Theme
            </Button>
            <Button variant="secondary" className="w-full sm:w-auto gap-2" onClick={handleRevert} disabled={isReverting}>
              <RotateCcw className="w-4 h-4" />
              {isReverting ? "Reverting..." : "Revert to Previous"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
