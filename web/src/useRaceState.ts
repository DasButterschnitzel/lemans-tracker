import { useEffect, useRef, useState } from "react";
import type { RaceState } from "./types";
import { createSimEngine, type Engine } from "./engine";

function relayUrl(): string {
  const env = import.meta.env.VITE_RELAY_WS;
  if (env) return env;
  if (import.meta.env.DEV) return "ws://localhost:8787/ws";
  const proto = location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${location.host}/ws`;
}

export type ConnStatus = "connecting" | "live" | "sim";

// Connects to the relay over WebSocket; if no relay is reachable (e.g. the static
// GitHub Pages build), falls back to the in-browser simulation engine.
export function useRaceState(): { state: RaceState | null; status: ConnStatus } {
  const [state, setState] = useState<RaceState | null>(null);
  const [status, setStatus] = useState<ConnStatus>("connecting");
  const modeRef = useRef<"ws" | "engine">("ws");
  const engineRef = useRef<Engine | null>(null);
  const openedRef = useRef(false);

  useEffect(() => {
    let closed = false;
    let retry = 0;
    let reconnect: ReturnType<typeof setTimeout>;
    let fallback: ReturnType<typeof setTimeout>;
    let ws: WebSocket | null = null;

    const startEngine = (): void => {
      if (engineRef.current || closed) return;
      modeRef.current = "engine";
      setStatus("sim");
      const eng = createSimEngine();
      engineRef.current = eng;
      void eng.start((s) => { if (modeRef.current === "engine" && !closed) setState(s); });
    };

    const connect = (): void => {
      ws = new WebSocket(relayUrl());
      ws.onopen = () => {
        retry = 0;
        openedRef.current = true;
        modeRef.current = "ws";
        engineRef.current?.stop();
        engineRef.current = null;
        clearTimeout(fallback);
        setStatus("live");
      };
      ws.onmessage = (e) => {
        if (modeRef.current !== "ws") return;
        try { setState(JSON.parse(e.data as string) as RaceState); } catch { /* ignore */ }
      };
      ws.onclose = () => {
        if (closed) return;
        startEngine(); // keep the app alive on the client
        retry = Math.min(retry + 1, 6);
        reconnect = setTimeout(connect, 1000 * retry);
      };
      ws.onerror = () => ws?.close();
    };

    connect();
    fallback = setTimeout(() => { if (!openedRef.current) startEngine(); }, 1200);

    return () => {
      closed = true;
      clearTimeout(reconnect);
      clearTimeout(fallback);
      ws?.close();
      engineRef.current?.stop();
    };
  }, []);

  return { state, status };
}
