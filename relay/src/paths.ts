import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Walks up from this module to locate the web/public data directory, so the relay
// works whether run from src (tsx) or dist (node), and from any cwd.
export function dataDir(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 8; i++) {
    const candidate = resolve(dir, "web", "public");
    if (existsSync(resolve(candidate, "sarthe.geojson"))) return candidate;
    const parent = resolve(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error("Could not locate web/public (sarthe.geojson) — run tools/fetch-track.mjs first");
}

export const webDistDir = (): string => resolve(dataDir(), "..", "dist");

// Locates relay/data (bundled sample CSVs), robust to run-from-src or run-from-dist.
export function relayDataDir(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 8; i++) {
    const candidate = resolve(dir, "data");
    if (existsSync(resolve(candidate, "le-mans-2026-fp1.csv"))) return candidate;
    const parent = resolve(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error("Could not locate relay/data — run tools/fetch-sample.mjs first");
}
