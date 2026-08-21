"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type BigCalendarInner from "./BigCalendarInner";

const LazyBigCalendar = dynamic(() => import("./BigCalendarInner"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-card text-card-foreground rounded-lg border border-border animate-pulse" />
  ),
});

export default function BigCalendar(props: ComponentProps<typeof BigCalendarInner>) {
  return <LazyBigCalendar {...props} />;
}
