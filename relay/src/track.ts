import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { dataDir } from "./paths.js";
import { haversineKm } from "./util.js";

export interface Track {
  coords: [number, number][];
  lengthKm: number;
  cum: number[];
}

let cached: Track | null = null;

export function loadTrack(): Track {
  if (cached) return cached;
  const raw = readFileSync(resolve(dataDir(), "sarthe.geojson"), "utf8");
  const fc = JSON.parse(raw) as { features: { geometry: { coordinates: [number, number][] } }[] };
  const feature = fc.features[0];
  if (!feature) throw new Error("sarthe.geojson has no features");
  const coords = feature.geometry.coordinates;
  const cum: number[] = [0];
  for (let i = 1; i < coords.length; i++) {
    cum[i] = (cum[i - 1] ?? 0) + haversineKm(coords[i - 1]!, coords[i]!);
  }
  cached = { coords, lengthKm: cum[cum.length - 1] ?? 0, cum };
  return cached;
}
