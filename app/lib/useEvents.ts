"use client";

import { useRef, useCallback, useEffect } from "react";

interface TrackedEvent {
  type: string;
  piece_id?: string;
  payload?: Record<string, unknown>;
}

const BATCH_INTERVAL = 5000; // 5 seconds

/**
 * Batched event emitter — sends events to /api/events every 5s
 * and on pagehide via sendBeacon. No PII in events.
 */
export function useEvents() {
  const bufferRef = useRef<TrackedEvent[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const flush = useCallback(() => {
    const events = bufferRef.current;
    if (events.length === 0) return;
    bufferRef.current = [];

    const body = JSON.stringify(events);

    // Try fetch first, fall back to sendBeacon
    fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {
      // If fetch fails, try sendBeacon
      try {
        navigator.sendBeacon(
          "/api/events",
          new Blob([body], { type: "application/json" })
        );
      } catch {
        // Events lost — acceptable for analytics
      }
    });
  }, []);

  const emit = useCallback(
    (type: string, pieceId?: string, payload?: Record<string, unknown>) => {
      bufferRef.current.push({
        type,
        piece_id: pieceId,
        payload,
      });
    },
    []
  );

  // Set up interval and pagehide
  useEffect(() => {
    timerRef.current = setInterval(flush, BATCH_INTERVAL);

    const handlePageHide = () => {
      const events = bufferRef.current;
      if (events.length === 0) return;
      bufferRef.current = [];

      try {
        navigator.sendBeacon(
          "/api/events",
          new Blob([JSON.stringify(events)], { type: "application/json" })
        );
      } catch {
        // Best effort
      }
    };

    window.addEventListener("pagehide", handlePageHide);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") handlePageHide();
    });

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      flush();
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [flush]);

  return { emit, flush };
}
