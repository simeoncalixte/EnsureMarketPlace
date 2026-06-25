import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { getApiBase } from '../../lib/api';
import { getAuthToken } from '../../lib/auth';

/**
 * Realtime channel for the social network (messages, notifications,
 * connection events). One websocket per authenticated session, shared through
 * context; consumers subscribe to typed events. Distinct from the
 * GlobalChatProvider (the AI copilot overlay) — this carries human traffic.
 */

export type SocialSocketEventType = 'message.new' | 'notification.new' | 'connection.requested' | 'connection.accepted';

export interface SocialSocketEvent {
  type: SocialSocketEventType;
  payload: Record<string, unknown>;
}

type Handler = (event: SocialSocketEvent) => void;

interface SocialSocketContextValue {
  connected: boolean;
  subscribe: (type: SocialSocketEventType | '*', handler: Handler) => () => void;
}

const SocialSocketContext = createContext<SocialSocketContextValue>({
  connected: false,
  subscribe: () => () => undefined,
});

export function useSocialSocket(): SocialSocketContextValue {
  return useContext(SocialSocketContext);
}

function socketUrl(): string | null {
  const token = getAuthToken();
  if (!token) return null;
  const base = getApiBase() || window.location.origin;
  const url = new URL('/api/social/ws', base);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.searchParams.set('token', token);
  return url.toString();
}

const MAX_BACKOFF_MS = 30_000;

export const SocialSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [connected, setConnected] = useState(false);
  const handlersRef = useRef(new Map<string, Set<Handler>>());
  const socketRef = useRef<WebSocket | null>(null);
  const backoffRef = useRef(1000);
  const closedRef = useRef(false);

  const subscribe = useCallback((type: SocialSocketEventType | '*', handler: Handler) => {
    let set = handlersRef.current.get(type);
    if (!set) {
      set = new Set();
      handlersRef.current.set(type, set);
    }
    set.add(handler);
    return () => {
      set?.delete(handler);
    };
  }, []);

  useEffect(() => {
    closedRef.current = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

    const connect = () => {
      const url = socketUrl();
      if (!url || closedRef.current) return;

      const socket = new WebSocket(url);
      socketRef.current = socket;

      socket.onopen = () => {
        backoffRef.current = 1000;
        setConnected(true);
      };
      socket.onmessage = (raw) => {
        try {
          const event = JSON.parse(String(raw.data)) as SocialSocketEvent;
          for (const handler of handlersRef.current.get(event.type) ?? []) handler(event);
          for (const handler of handlersRef.current.get('*') ?? []) handler(event);
        } catch {
          // Ignore malformed frames.
        }
      };
      socket.onclose = () => {
        setConnected(false);
        if (closedRef.current) return;
        reconnectTimer = setTimeout(connect, backoffRef.current);
        backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF_MS);
      };
      socket.onerror = () => {
        socket.close();
      };
    };

    connect();
    return () => {
      closedRef.current = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socketRef.current?.close();
    };
  }, []);

  return <SocialSocketContext.Provider value={{ connected, subscribe }}>{children}</SocialSocketContext.Provider>;
};

export default SocialSocketProvider;
