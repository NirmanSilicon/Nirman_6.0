import { useEffect, useRef, useState } from "react";
import type { LiveEvent } from "../api/types";
import { API_BASE, getAccessToken, refreshTokens } from "../api/client";

export function useLiveStream(opts: {
  onEvent: (e: LiveEvent) => void;
  onResync?: () => void;
  enabled?: boolean;
}): { connected: boolean; lastEventAt: number | null } {
  const [connected, setConnected] = useState(false);
  const [lastEventAt, setLastEventAt] = useState<number | null>(null);

  const onEventRef = useRef(opts.onEvent);
  const onResyncRef = useRef(opts.onResync);
  const lastIdRef = useRef<string | null>(null);
  const attemptRef = useRef<number>(0);
  const retried401Ref = useRef<boolean>(false);
  const retryTimerRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    onEventRef.current = opts.onEvent;
  }, [opts.onEvent]);

  useEffect(() => {
    onResyncRef.current = opts.onResync;
  }, [opts.onResync]);

  const enabled = opts.enabled ?? true;

  useEffect(() => {
    if (!enabled) {
      setConnected(false);
      abortControllerRef.current?.abort();
      if (retryTimerRef.current !== null) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      return;
    }

    // Real SSE streaming mode via fetch
    let active = true;

    async function connect() {
      if (!active) return;

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      const token = getAccessToken();
      const headers: Record<string, string> = {
        Accept: "text/event-stream",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      if (lastIdRef.current) {
        headers["Last-Event-ID"] = lastIdRef.current;
      }

      let response: Response;
      try {
        response = await fetch(`${API_BASE}/stream`, {
          headers,
          signal: abortController.signal,
        });
      } catch {
        if (!active || abortController.signal.aborted) return;
        handleDisconnect();
        return;
      }

      if (response.status === 401) {
        if (!retried401Ref.current) {
          retried401Ref.current = true;
          const refreshed = await refreshTokens();
          if (refreshed && active && !abortController.signal.aborted) {
            connect();
            return;
          }
        }
        // Second 401 or refresh failed: stop hook
        setConnected(false);
        return;
      }

      if (!response.ok || !response.body) {
        handleDisconnect();
        return;
      }

      // Connection established
      setConnected(true);
      attemptRef.current = 0;
      retried401Ref.current = false;

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      try {
        while (active) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let boundaryIndex: number;
          while ((boundaryIndex = buffer.search(/\r?\n\r?\n/)) !== -1) {
            const rawFrame = buffer.slice(0, boundaryIndex);
            const match = buffer.slice(boundaryIndex).match(/^(\r?\n)+/);
            const sepLen = match ? match[0].length : 2;
            buffer = buffer.slice(boundaryIndex + sepLen);

            let eventName = "message";
            let dataStr = "";
            let frameId: string | null = null;

            const lines = rawFrame.split(/\r?\n/);
            for (const line of lines) {
              if (line.startsWith(":")) {
                // Ignore comment lines (e.g. heartbeat)
                continue;
              }
              if (line.startsWith("id:")) {
                frameId = line.slice(3).trim();
              } else if (line.startsWith("event:")) {
                eventName = line.slice(6).trim();
              } else if (line.startsWith("data:")) {
                const val = line.slice(5).replace(/^\s/, "");
                dataStr = dataStr ? `${dataStr}\n${val}` : val;
              }
            }

            if (frameId !== null) {
              lastIdRef.current = frameId;
            }

            if (eventName === "auth_expired") {
              try {
                await reader.cancel();
              } catch {
                // Ignore
              }
              const refreshed = await refreshTokens();
              if (refreshed && active && !abortController.signal.aborted) {
                attemptRef.current = 0;
                connect();
              } else {
                setConnected(false);
              }
              return;
            }

            if (eventName === "resync") {
              onResyncRef.current?.();
              continue;
            }

            if (dataStr) {
              try {
                const parsed = JSON.parse(dataStr);
                setLastEventAt(Date.now());
                onEventRef.current({
                  event: eventName,
                  data: parsed,
                } as unknown as LiveEvent);
              } catch {
                // Drop malformed event
              }
            }
          }
        }
      } catch {
        if (!active || abortController.signal.aborted) return;
      } finally {
        try {
          reader.releaseLock();
        } catch {
          // Ignore
        }
      }

      handleDisconnect();
    }

    function handleDisconnect() {
      if (!active) return;
      setConnected(false);
      const delay = Math.min(1000 * Math.pow(2, attemptRef.current), 30000);
      attemptRef.current += 1;
      retryTimerRef.current = window.setTimeout(() => {
        if (active) {
          connect();
        }
      }, delay);
    }

    connect();

    return () => {
      active = false;
      abortControllerRef.current?.abort();
      if (retryTimerRef.current !== null) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      setConnected(false);
    };
  }, [enabled]);

  return { connected, lastEventAt };
}
