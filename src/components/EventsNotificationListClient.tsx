"use client";

import * as React from "react";
import { NotificationList, type NotificationItem } from "@/components/animate-ui/components/community/notification-list";
import { NotificationCommandDialog } from "@/components/NotificationCommandDialog";

interface Props {

  preview: NotificationItem[];

  all: NotificationItem[];
}

export function EventsNotificationListClient({ preview, all }: Props) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <NotificationList
        notifications={preview}
        onViewAll={() => setOpen(true)}
      />
      <NotificationCommandDialog
        open={open}
        onOpenChange={setOpen}
        items={all}
        heading="Events"
      />
    </>
  );
}
