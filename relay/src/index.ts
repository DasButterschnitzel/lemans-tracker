import { createServer } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import { webDistDir } from "./paths.js";
import { serveStatic } from "./static.js";
import { createSimSource } from "./sources/sim.js";
import { createReplaySource } from "./sources/replay.js";
import { createLiveSource } from "./sources/live.js";
import type { RaceSource } from "./source.js";
import type { RaceState } from "./types.js";

const PORT = Number(process.env.PORT ?? 8787);

function pickSource(): RaceSource {
  const arg = process.argv.find((a) => a.startsWith("--source="))?.split("=")[1] ?? process.env.SOURCE ?? "sim";
  if (arg === "live") return createLiveSource();
  if (arg === "replay") return createReplaySource();
  if (arg === "sim") return createSimSource();
  console.warn(`[relay] source "${arg}" unknown — falling back to sim`);
  return createSimSource();
}

const source = pickSource();
let latest: RaceState | null = null;
const root = (() => {
  try {
    return webDistDir();
  } catch {
    return "";
  }
})();

const server = createServer(async (req, res) => {
  const url = req.url ?? "/";
  if (url.startsWith("/api/state")) {
    res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
    res.end(JSON.stringify(latest ?? { cars: [], session: null }));
    return;
  }
  if (url.startsWith("/api/health")) {
    res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
    res.end(JSON.stringify({ ok: true, source: source.kind, cars: latest?.cars.length ?? 0 }));
    return;
  }
  await serveStatic(root, url, res);
});

const wss = new WebSocketServer({ server, path: "/ws" });
wss.on("connection", (ws) => {
  if (latest) ws.send(JSON.stringify(latest));
});

function broadcast(state: RaceState): void {
  latest = state;
  const msg = JSON.stringify(state);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) client.send(msg);
  }
}

await source.start(broadcast);
server.listen(PORT, () => {
  console.log(`[relay] source=${source.kind} listening on http://localhost:${PORT}`);
  console.log(`[relay]   state:  http://localhost:${PORT}/api/state`);
  console.log(`[relay]   socket: ws://localhost:${PORT}/ws`);
  if (!root) console.log(`[relay]   (web app not built — use the Vite dev server at http://localhost:5173)`);
});

const shutdown = (): void => {
  source.stop();
  server.close();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
