"use client";

import * as React from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import type { NotificationItem } from "@/components/animate-ui/components/community/notification-list";
import { Clock } from "lucide-react";

interface NotificationCommandDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: NotificationItem[];
  heading: string;
}

export function NotificationCommandDialog({
  open,
  onOpenChange,
  items,
  heading,
}: NotificationCommandDialogProps) {
  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder={`Search ${heading.toLowerCase()}…`} />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading={heading}>
          {items.map((item) => (
            <CommandItem
              key={item.id}
              value={`${item.title} ${item.subtitle}`}
              className="flex flex-col items-start gap-0.5 py-3 cursor-default"
            >
              <span className="font-medium text-sm leading-tight truncate">
                {item.title}
              </span>
              {item.subtitle && (
                <span className="text-xs text-muted-foreground line-clamp-2 leading-snug">
                  {item.subtitle}
                </span>
              )}
              {item.time && (
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {item.time}
                </span>
              )}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
