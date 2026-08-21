"use client";

import { useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";

export type UnreadCountsLive = Record<string, any> & {
  messages?: number;
  notifications?: number;
  tickets?: number;
  requests?: number;
  itemBadges?: Record<string, { count: number; tone: "blue" | "yellow" | "red" }>;
};

const INITIAL: UnreadCountsLive = {
  messages: 0,
  notifications: 0,
  tickets: 0,
  requests: 0,
  itemBadges: {},
};

const RECONNECT_DELAYS_MS = [1000, 2000, 4000, 8000, 16000, 30000];

export function useUnreadCountsSSE() {
  const { user } = useUser();
  const [counts, setCounts] = useState<UnreadCountsLive>(INITIAL);
  const [isConnected, setIsConnected] = useState(false);

  const esRef = useRef<EventSource | null>(null);
  const retryRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!user?.id) return;
    cancelledRef.current = false;

    const connect = () => {
      if (cancelledRef.current) return;

      const es = new EventSource(`/api/sse/unread-counts`);
      esRef.current = es;

      es.onopen = () => {
        setIsConnected(true);
        retryRef.current = 0;
      };

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data && typeof data === "object" && "messages" in data) {
            setCounts(data);
          }
        } catch (e) {

        }
      };

      es.onerror = () => {
        setIsConnected(false);
        try {
          es.close();
        } catch {

        }
        if (cancelledRef.current) return;

        const idx = Math.min(retryRef.current, RECONNECT_DELAYS_MS.length - 1);
        const base = RECONNECT_DELAYS_MS[idx];
        const jitter = Math.floor(Math.random() * 250);
        retryRef.current += 1;

        retryTimerRef.current = setTimeout(connect, base + jitter);
      };
    };

    connect();

    return () => {
      cancelledRef.current = true;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      if (esRef.current) {
        try { esRef.current.close(); } catch {  }
      }
      setIsConnected(false);
    };
  }, [user?.id]);

  return { counts, isConnected };
}