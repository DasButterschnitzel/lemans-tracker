// Fetches the Circuit de la Sarthe (full 24h race lap, ~13.6 km) from OpenStreetMap
// relation 2126739 (name "Circuit des 24 Heures du Mans", operator ACO), stitches
// its member ways into a single ordered closed loop, rotates the ring to start at
// the start/finish line, and writes web/public/sarthe.geojson.
//
// Usage: node tools/fetch-track.mjs [--debug]
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../web/public/sarthe.geojson");
const DEBUG = process.argv.includes("--debug");
const ENDPOINT = process.env.OVERPASS || "https://overpass-api.de/api/interpreter";
const RELATION = 2126739;
// Start/finish line on the Bugatti pit straight (approx), used to orient the ring.
const START = [0.2068, 47.9558];

const key = (p) => `${p[0].toFixed(5)},${p[1].toFixed(5)}`;

async function fetchMembers() {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "lemans-live/0.1 (track geometry fetch)",
      Accept: "application/json",
    },
    body: "data=" + encodeURIComponent(`[out:json][timeout:120];rel(${RELATION});out geom;`),
  });
  if (!res.ok) throw new Error(`Overpass HTTP ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const rel = (data.elements || []).find((e) => e.type === "relation");
  if (!rel) throw new Error("relation not found");
  return (rel.members || [])
    .filter((m) => m.type === "way" && m.geometry && m.geometry.length >= 2)
    .map((m) => ({ id: m.ref, pts: m.geometry.map((g) => [g.lon, g.lat]) }));
}

function stitchFrom(segs, seed) {
  const remaining = new Set(segs.map((_, i) => i));
  const chain = [...segs[seed].pts];
  remaining.delete(seed);
  const extend = (atEnd) => {
    let progress = true;
    while (progress) {
      progress = false;
      const tipKey = key(atEnd ? chain[chain.length - 1] : chain[0]);
      for (const i of remaining) {
        const s = segs[i];
        const a = key(s.pts[0]);
        const b = key(s.pts[s.pts.length - 1]);
        let add = null;
        if (a === tipKey) add = s.pts.slice(1);
        else if (b === tipKey) add = s.pts.slice(0, -1).reverse();
        if (add) {
          if (atEnd) chain.push(...add);
          else chain.unshift(...add.reverse());
          remaining.delete(i);
          progress = true;
          break;
        }
      }
    }
  };
  extend(true);
  extend(false);
  return { chain, leftover: remaining.size };
}

function stitch(segs) {
  let best = null;
  for (let seed = 0; seed < segs.length; seed++) {
    const r = stitchFrom(segs, seed);
    if (!best || r.chain.length > best.chain.length) best = r;
  }
  return best;
}

function lengthKm(pts) {
  const R = 6371;
  let d = 0;
  for (let i = 1; i < pts.length; i++) {
    const [o1, a1] = pts[i - 1];
    const [o2, a2] = pts[i];
    const dLat = ((a2 - a1) * Math.PI) / 180;
    const dLon = ((o2 - o1) * Math.PI) / 180;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos((a1 * Math.PI) / 180) * Math.cos((a2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    d += 2 * R * Math.asin(Math.sqrt(h));
  }
  return d;
}

// Rotate a closed ring so it begins at the point nearest START, keeping winding.
function rotateToStart(ring) {
  const core = ring.slice(0, -1); // drop duplicated closing point
  let best = 0;
  let bestD = Infinity;
  core.forEach((p, i) => {
    const d = (p[0] - START[0]) ** 2 + (p[1] - START[1]) ** 2;
    if (d < bestD) (bestD = d), (best = i);
  });
  const rotated = [...core.slice(best), ...core.slice(0, best)];
  rotated.push([...rotated[0]]);
  return rotated;
}

const segs = await fetchMembers();
console.log(`fetched ${segs.length} member ways from relation ${RELATION}`);
const { chain, leftover } = stitch(segs);
let closed = key(chain[0]) === key(chain[chain.length - 1]);
console.log(`stitched: ${chain.length} pts, ${lengthKm(chain).toFixed(2)} km, closed=${closed}, leftover=${leftover}`);
if (!closed) chain.push([...chain[0]]);
const ring = rotateToStart(chain);

mkdirSync(dirname(OUT), { recursive: true });
const fc = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { name: "Circuit de la Sarthe", length_km: +lengthKm(ring).toFixed(2), source: "OSM relation 2126739 © OpenStreetMap contributors" },
      geometry: { type: "LineString", coordinates: ring },
    },
  ],
};
writeFileSync(OUT, JSON.stringify(fc));
console.log(`wrote ${OUT} (${ring.length} points, start near ${START.join(",")})`);
if (DEBUG && leftover) console.log("WARNING: leftover segments did not stitch");
