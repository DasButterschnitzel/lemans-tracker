import { readFile } from "node:fs/promises";
import { existsSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import type { ServerResponse } from "node:http";

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".geojson": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json",
};

// Serves a static file from the built web app; falls back to index.html (SPA).
export async function serveStatic(root: string, urlPath: string, res: ServerResponse): Promise<void> {
  if (!existsSync(root)) {
    res.writeHead(503, { "Content-Type": "text/plain" });
    res.end("Web app not built yet. Run `pnpm --filter web build` (or use the Vite dev server).");
    return;
  }
  const pathname = decodeURIComponent((urlPath.split("?")[0] || "/"));
  const rel = pathname === "/" ? "index.html" : pathname.replace(/^[/\\]+/, "");
  const safe = normalize(rel).replace(/^(\.\.[/\\])+/, "");
  let file = join(root, safe);
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(root, "index.html");
  try {
    const body = await readFile(file);
    res.writeHead(200, { "Content-Type": MIME[extname(file)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
  }
}
