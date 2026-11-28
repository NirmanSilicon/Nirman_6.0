import { useEffect, useRef, useState } from "react";
import { SimulationEvent } from "../types";
import { fetchRunEvents } from "../api";

export function useRunStream(
  runId: string | null,
  onEvent: (event: SimulationEvent) => void,
  onComplete?: () => void
) {
  const [isConnected, setIsConnected] = useState(false);
  const lastSequenceRef = useRef<number>(0);
  const activeRunIdRef = useRef<string | null>(runId);

  useEffect(() => {
    activeRunIdRef.current = runId;
    lastSequenceRef.current = 0;

    if (!runId) {
      setIsConnected(false);
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/api/v1/ws/runs/${runId}`;
    let socket: WebSocket | null = null;
    let pollInterval: any = null;

    try {
      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        setIsConnected(true);
      };

      socket.onmessage = async (e) => {
        try {
          const event: SimulationEvent = JSON.parse(e.data);

          // Document G gap handling
          if (
            lastSequenceRef.current > 0 &&
            event.sequence > lastSequenceRef.current + 1
          ) {
            try {
              const missing = await fetchRunEvents(
                runId,
                lastSequenceRef.current + 1,
                event.sequence - 1
              );
              for (const m of missing) {
                onEvent(m);
              }
            } catch (err) {
              console.error("Error fetching missing gap events:", err);
            }
          }

          lastSequenceRef.current = event.sequence;
          onEvent(event);

          if (event.event_type === "simulation_completed" && onComplete) {
            onComplete();
          }
        } catch (err) {
          console.error("Error parsing WebSocket event:", err);
        }
      };

      socket.onclose = () => {
        setIsConnected(false);
      };

      socket.onerror = () => {
        setIsConnected(false);
      };
    } catch (err) {
      console.warn("WebSocket connection failed, falling back to polling", err);
      setIsConnected(false);
    }

    // Fallback polling every 800ms to ensure client doesn't freeze if WS drops
    pollInterval = setInterval(async () => {
      if (!activeRunIdRef.current) return;
      try {
        const events = await fetchRunEvents(activeRunIdRef.current, lastSequenceRef.current + 1);
        if (events && events.length > 0) {
          for (const ev of events) {
            if (ev.sequence > lastSequenceRef.current) {
              lastSequenceRef.current = ev.sequence;
              onEvent(ev);
              if (ev.event_type === "simulation_completed" && onComplete) {
                onComplete();
              }
            }
          }
        }
      } catch (e) {
        // quiet ignore polling error
      }
    }, 1000);

    return () => {
      if (socket) socket.close();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [runId]);

  return { isConnected };
}
