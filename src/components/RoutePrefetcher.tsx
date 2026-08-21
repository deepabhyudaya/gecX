"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";

export function RoutePrefetcher() {
  const router = useRouter();
  const { user } = useUser();

  useEffect(() => {
    const role = (user?.publicMetadata?.role as string) || "student";

    const critical = [
      "/profile",
      "/notifications",
      "/messages",
      "/list/messages",
      "/settings",
    ];

    const secondaryByRole: Record<string, string[]> = {
      admin: ["/admin", "/list/teachers", "/list/students", "/list/announcements", "/list/tickets", "/list/rivalries"],
      teacher: ["/teacher", "/list/lessons", "/list/students", "/list/announcements", "/list/results"],
      student: ["/student", "/student/courses/my", "/list/results", "/list/announcements", "/student/rivalry", "/servers"],
      parent: ["/parent", "/list/results", "/list/announcements", "/list/exams"],
    };

    critical.forEach((r) => router.prefetch(r));

    const idleHandle = (window as any).requestIdleCallback
      ? (window as any).requestIdleCallback(() => {
          (secondaryByRole[role] || []).forEach((r) => router.prefetch(r));
        })
      : setTimeout(() => {
          (secondaryByRole[role] || []).forEach((r) => router.prefetch(r));
        }, 1500);

    return () => {
      if ((window as any).cancelIdleCallback && typeof idleHandle === "number") {
        (window as any).cancelIdleCallback(idleHandle);
      } else {
        clearTimeout(idleHandle as any);
      }
    };
  }, [router, user?.publicMetadata?.role]);

  return null;
}