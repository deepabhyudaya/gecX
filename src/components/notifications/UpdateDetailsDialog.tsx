"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getNotificationsByTypeAndEntity, dismissNotificationsByTypeAndEntity, dismissNotificationsByType } from "@/actions/notification.actions";
import { ArrowRight, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface FieldChange {
  fieldName: string;
  oldValue: any;
  newValue: any;
}

interface NotificationData {
  id: number;
  title: string;
  message: string;
  type: string;
  entityId: string | null;
  changes?: FieldChange[] | null;
  createdAt: Date;
  isViewed: boolean;
}

interface UpdateDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  types: string[];
  entityId: string;
  entityName: string;
}

export const NOTIFICATION_DISMISSED_EVENT = "notification-counts-changed";

export function UpdateDetailsDialog({
  open,
  onOpenChange,
  types,
  entityId,
  entityName,
}: UpdateDetailsDialogProps) {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || types.length === 0) return;

    let cancelled = false;
    setLoading(true);

    getNotificationsByTypeAndEntity(types, entityId || "").then((data) => {
      if (!cancelled) {

        setNotifications(Array.isArray(data) ? (data as unknown as NotificationData[]) : []);
        setLoading(false);
      }
    }).catch(() => {
      if (!cancelled) {
        setNotifications([]);
        setLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [open, types, entityId]);

  const handleClose = async () => {

    onOpenChange(false);
    setNotifications([]);

    if (types.length > 0) {
      if (entityId) {
        await dismissNotificationsByTypeAndEntity(types, entityId);
      } else {
        await dismissNotificationsByType(types);
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(NOTIFICATION_DISMISSED_EVENT));
      }
    }
  };

  const getIndicator = (type: string) => {
    if (type.endsWith("_CREATED")) return { text: "NEW", className: "bg-green-500 text-white" };
    if (type.endsWith("_DELETED")) return { text: "DELETED", className: "bg-red-500 text-white" };
    if (type.endsWith("_UPDATED")) return { text: "UPDATED", className: "bg-orange-500 text-white" };
    if (type.endsWith("_APPROVED")) return { text: "APPROVED", className: "bg-green-600 text-white" };
    if (type.endsWith("_REJECTED")) return { text: "REJECTED", className: "bg-red-600 text-white" };
    if (type.endsWith("_SUBMITTED")) return { text: "SUBMITTED", className: "bg-primary text-primary-foreground" };
    if (type.endsWith("_EXPIRED")) return { text: "EXPIRED", className: "bg-gray-500 text-white" };
    if (type.endsWith("_POSTED")) return { text: "POSTED", className: "bg-green-600 text-white" };
    if (type.endsWith("_ENROLLMENT")) return { text: "ENROLLED", className: "bg-green-600 text-white" };
    return { text: type, className: "bg-gray-500 text-white" };
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString();
  };

  const formatFieldName = (fieldName: string) => {
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  };

  const notifCount = notifications.length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">{entityName}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {loading ? "Loading…" : `${notifCount} update${notifCount !== 1 ? "s" : ""} available`}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Loading updates...</div>
        ) : notifCount === 0 ? (
          <div className="py-8 text-center text-muted-foreground">No updates found</div>
        ) : (
          <div className="max-h-[400px] overflow-y-auto space-y-4 py-2">
            {notifications.map((notification) => {
              const indicator = getIndicator(notification.type);
              return (
                <div
                  key={notification.id}
                  className={cn(
                    "border-border border rounded-lg p-4 space-y-3 bg-muted/30",
                    !notification.isViewed && "border-white/50"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${indicator.className}`}>
                          {indicator.text}
                        </span>
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(notification.createdAt)}
                        </span>
                      </div>
                      <h4 className="font-medium text-foreground">{notification.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                    </div>
                  </div>

                  {notification.changes && notification.changes.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-border/50">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Field Changes
                      </p>
                      {notification.changes.map((change, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                          <span className="font-medium text-foreground min-w-[100px]">
                            {formatFieldName(change.fieldName)}:
                          </span>
                          <span className="text-muted-foreground line-through">
                            {String(change.oldValue)}
                          </span>
                          <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-foreground font-medium">
                            {String(change.newValue)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
