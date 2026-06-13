// Downloads a real Al Kamel Analysis CSV from the 2026 Le Mans weekend and bundles
// it for the replay source. Practice sessions have all cars circulating for hours,
// which replays well as "cars on track". Usage: node tools/fetch-sample.mjs
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../relay/data/le-mans-2026-fp1.csv");
const BASE = "https://fiawec.alkamelsystems.com/Results/15_2026/03_LE%20MANS";
const URL = `${BASE}/657_FIA%20WEC/202606101410_Free%20Practice%201/23_Analysis_Free%20Practice%201.CSV`;

const res = await fetch(URL, { headers: { "User-Agent": "lemans-live/0.1" } });
if (!res.ok) throw new Error(`HTTP ${res.status} for ${URL}`);
const text = await res.text();
const rows = text.split(/\r?\n/).filter((r) => r.trim().length);
const cars = new Set();
let maxElapsed = "";
for (const r of rows.slice(1)) {
  const f = r.split(";");
  if (f[0]) cars.add(f[0].trim());
  if (f[13]) maxElapsed = f[13].trim();
}
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, text);
console.log(`saved ${OUT}`);
console.log(`rows=${rows.length - 1}  cars=${cars.size}  lastElapsed=${maxElapsed}`);
