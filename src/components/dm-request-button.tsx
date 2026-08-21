"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { requestDMAccess, checkDMAccess, cancelDMRequest, revokeDMAccess } from "@/actions/dm-access.actions";
import { startConversation } from "@/actions/message.actions";
import { useRouter } from "next/navigation";
import { MessageCircle, Check, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,

} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface DMRequestButtonProps {
  targetUserId: string;
  username: string;
  bgIsLight?: boolean;
  hasCustomBg?: boolean;
  isPublic?: boolean;
}

export function DMRequestButton({
  targetUserId,
  username,
  bgIsLight = false,
  hasCustomBg = false,
  isPublic = false,
}: DMRequestButtonProps) {
  const [hasAccess, setHasAccess] = useState(isPublic);
  const [isPending, setIsPending] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (isPublic) {
      setHasAccess(true);
      return;
    }
    const checkAccess = async () => {
      const access = await checkDMAccess(targetUserId);
      setHasAccess(access.hasAccess);
      setIsPending(access.isPending);
    };
    checkAccess();
  }, [targetUserId, isPublic]);

  const handleRequest = async () => {
    setIsLoading(true);
    try {
      const result = await requestDMAccess(targetUserId, message || undefined);
      if (result.success) {
        setIsPending(true);
        setDialogOpen(false);
        setMessage("");
      }
      router.refresh();
    } catch (error) {
      console.error("DM request failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    setIsLoading(true);
    try {
      await cancelDMRequest(targetUserId);
      setIsPending(false);
      router.refresh();
    } catch (error) {
      console.error("Cancel DM request failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMessage = async () => {
    setIsLoading(true);
    try {
      const convId = await startConversation(targetUserId);
      router.push(`/messages?convId=${convId}&type=direct`);
    } catch (error) {
      console.error("Failed to start conversation:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getButtonConfig = () => {
    if (isPublic || hasAccess) {
      return { label: "Message", icon: MessageCircle, action: handleMessage };
    }
    if (isPending) {
      return { label: "Request Sent", icon: Check, action: handleCancel };
    }
    return { label: "Request DM", icon: MessageCircle, action: () => setDialogOpen(true) };
  };

  const config = getButtonConfig();
  const Icon = config.icon;

  if (hasCustomBg) {
    const btnStyle: React.CSSProperties = hasAccess || isPending
      ? bgIsLight
        ? { backgroundColor: "rgba(0,0,0,0.08)", border: "1px solid rgba(0,0,0,0.18)", color: "#1a1a1a" }
        : { backgroundColor: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)", color: "#f1f1f1" }
      : { backgroundColor: "#10b981", border: "1px solid #10b981", color: "#ffffff" };

    return (
      <>
        <button
          onClick={config.action}
          disabled={isLoading}
          style={btnStyle}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-3 transition-opacity hover:opacity-80 disabled:opacity-50 gap-2"
        >
          {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Icon size={14} />}
          {config.label}
        </button>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Request DM Access</DialogTitle>
              <DialogDescription>
                Send a request to message @{username}. You can include an optional message.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <Textarea
                placeholder="Optional message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleRequest} disabled={isLoading}>
                {isLoading ? <Loader2 size={14} className="animate-spin mr-2" /> : null}
                Send Request
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <Button
        variant={hasAccess || isPending ? "outline" : "default"}
        size="sm"
        onClick={config.action}
        disabled={isLoading}
        className="gap-2 transition-all duration-150"
        style={!hasAccess && !isPending ? { backgroundColor: "#10b981", borderColor: "#10b981" } : undefined}
      >
        {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Icon size={14} />}
        {config.label}
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Request DM Access</DialogTitle>
            <DialogDescription>
              Send a request to message @{username}. You can include an optional message.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Textarea
              placeholder="Optional message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRequest} disabled={isLoading}>
              {isLoading ? <Loader2 size={14} className="animate-spin mr-2" /> : null}
              Send Request
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
