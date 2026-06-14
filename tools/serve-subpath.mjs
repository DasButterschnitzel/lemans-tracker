// Serves the built web app under a subpath (like GitHub Pages /lemans-tracker/)
// to reproduce subpath-relative asset loading locally. node tools/serve-subpath.mjs
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync, statSync } from "node:fs";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../web/dist");
const PREFIX = "/lemans-tracker";
const PORT = 4185;
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".geojson": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon" };

createServer(async (req, res) => {
  const url = req.url ?? "/";
  if (url === "/" || url === PREFIX) { res.writeHead(302, { Location: PREFIX + "/" }); res.end(); return; }
  if (!url.startsWith(PREFIX + "/")) { res.writeHead(404); res.end("not found"); return; }
  const rel = decodeURIComponent(url.slice(PREFIX.length + 1).split("?")[0]) || "index.html";
  let file = join(ROOT, normalize(rel || "index.html").replace(/^(\.\.[/\\])+/, ""));
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(ROOT, "index.html");
  res.writeHead(200, { "Content-Type": MIME[extname(file)] ?? "application/octet-stream" });
  res.end(await readFile(file));
}).listen(PORT, () => console.log(`subpath test: http://localhost:${PORT}${PREFIX}/`));
