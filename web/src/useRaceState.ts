import { useEffect, useRef, useState } from "react";
import type { RaceState } from "./types";

function relayUrl(): string {
  const env = import.meta.env.VITE_RELAY_WS;
  if (env) return env;
  if (import.meta.env.DEV) return "ws://localhost:8787/ws";
  const proto = location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${location.host}/ws`;
}

export type ConnStatus = "connecting" | "live" | "offline";

export function useRaceState(): { state: RaceState | null; status: ConnStatus } {
  const [state, setState] = useState<RaceState | null>(null);
  const [status, setStatus] = useState<ConnStatus>("connecting");
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let closed = false;
    let retry = 0;
    let timer: ReturnType<typeof setTimeout>;

    const connect = (): void => {
      const ws = new WebSocket(relayUrl());
      wsRef.current = ws;
      ws.onopen = () => { retry = 0; setStatus("live"); };
      ws.onmessage = (ev) => {
        try { setState(JSON.parse(ev.data as string) as RaceState); } catch { /* ignore */ }
      };
      ws.onclose = () => {
        if (closed) return;
        setStatus("offline");
        retry = Math.min(retry + 1, 6);
        timer = setTimeout(connect, 400 * retry);
      };
      ws.onerror = () => ws.close();
    };
    connect();

    return () => {
      closed = true;
      clearTimeout(timer);
      wsRef.current?.close();
    };
  }, []);

  return { state, status };
}
