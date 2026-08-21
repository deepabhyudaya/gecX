"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as Ably from "ably";

let globalClient: Ably.Realtime | null = null;

function getOrCreateClient(): Ably.Realtime | null {
  if (globalClient) return globalClient;

  if (typeof window === "undefined") return null;

  globalClient = new Ably.Realtime({
    authUrl: "/api/ably/token",
    autoConnect: true,
  });

  return globalClient;
}

export type ChatEvent =
  | { type: "message:new"; message: any }
  | { type: "message:edit"; messageId: string | number; content: string }
  | { type: "message:delete"; messageId: string | number }
  | { type: "reaction:add"; messageId: string | number; emoji: string; userId: string }
  | { type: "reaction:remove"; messageId: string | number; emoji: string; userId: string }
  | { type: "member:muted"; userId: string; isMuted: boolean }
  | { type: "typing:start"; userId: string }
  | { type: "typing:stop"; userId: string };

export function useAbly(channelName: string | null) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<ChatEvent | null>(null);
  const channelRef = useRef<Ably.RealtimeChannel | null>(null);
  const handlersRef = useRef<Set<(event: ChatEvent) => void>>(new Set());
  const batchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingEventsRef = useRef<ChatEvent[]>([]);

  useEffect(() => {
    const client = getOrCreateClient();
    if (!client) return;

    const onConnected = () => setIsConnected(true);
    const onDisconnected = () => setIsConnected(false);

    client.connection.on("connected", onConnected);
    client.connection.on("disconnected", onDisconnected);
    client.connection.on("failed", onDisconnected);

    if (client.connection.state === "connected") {
      setIsConnected(true);
    }

    return () => {
      client.connection.off("connected", onConnected);
      client.connection.off("disconnected", onDisconnected);
      client.connection.off("failed", onDisconnected);
    };
  }, []);

  useEffect(() => {
    if (!channelName || !isConnected) return;

    const client = getOrCreateClient();
    if (!client) return;

    const channel = client.channels.get(channelName);
    channelRef.current = channel;

    const handler = (message: Ably.Message) => {
      const event = message.data as ChatEvent | ChatEvent[];
      if (Array.isArray(event)) {

        event.forEach((e) => {
          setLastEvent(e);
          handlersRef.current.forEach((h) => h(e));
        });
      } else {
        setLastEvent(event);
        handlersRef.current.forEach((h) => h(event));
      }
    };

    channel.subscribe("chat", handler);

    return () => {
      channel.unsubscribe("chat", handler);
      channelRef.current = null;
    };
  }, [channelName, isConnected]);

  const publish = useCallback(
    (event: ChatEvent) => {
      const channel = channelRef.current;
      if (!channel) return false;

      pendingEventsRef.current.push(event);

      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }

      batchTimeoutRef.current = setTimeout(() => {
        if (pendingEventsRef.current.length > 0) {
          try {

            channel.publish("chat", pendingEventsRef.current);
            pendingEventsRef.current = [];
          } catch {

            pendingEventsRef.current = [];
          }
        }
      }, 100);

      return true;
    },
    []
  );

  const subscribe = useCallback((handler: (event: ChatEvent) => void) => {
    handlersRef.current.add(handler);
    return () => {
      handlersRef.current.delete(handler);
    };
  }, []);

  return { isConnected, publish, subscribe, lastEvent };
}
