"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CSRF_COOKIE_NAME } from "@repo/trpc/shared/csrf";

export type AnalyticsDelta = {
  responseId?: string;
  submittedAt?: string;
};

function getWsBaseUrl(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  const url = new URL(apiUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.origin;
}

function readCsrfCookie(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${CSRF_COOKIE_NAME}=([^;]*)`));
  return match?.[1] ? decodeURIComponent(match[1]) : undefined;
}

export function useAnalyticsWs(formId: string) {
  const [delta, setDelta] = useState<AnalyticsDelta | null>(null);
  const [reconnecting, setReconnecting] = useState(false);
  const attemptRef = useRef(0);
  const wsRef = useRef<WebSocket | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    const csrf = readCsrfCookie();
    if (!csrf) return;

    const channel = `analytics:${formId}`;
    const wsUrl = `${getWsBaseUrl()}/ws?channel=${encodeURIComponent(channel)}&csrf=${encodeURIComponent(csrf)}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      attemptRef.current = 0;
      setReconnecting(false);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string) as {
          type?: string;
          delta?: AnalyticsDelta;
        };
        if (msg.type === "response_delta" && msg.delta) {
          setDelta(msg.delta);
        }
      } catch {
        /* ignore malformed messages */
      }
    };

    ws.onclose = () => {
      if (wsRef.current !== ws) return;
      setReconnecting(true);
      const delay = Math.min(30_000, 1000 * 2 ** attemptRef.current);
      attemptRef.current += 1;
      timeoutRef.current = setTimeout(connect, delay);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [formId]);

  useEffect(() => {
    connect();
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect]);

  return { delta, reconnecting };
}
