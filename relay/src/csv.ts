import type { CarClass } from "./types.js";

export interface LapRow {
  lap: number;
  lapMs: number;
  elapsedMs: number;
  startMs: number; // elapsed at start of this lap
  s1?: string;
  s2?: string;
  s3?: string;
  kph: number;
  topSpeed: number;
  driver: string;
  inPit: boolean;
  pitMs: number;
}

export interface CarTimeline {
  number: string;
  carClass: CarClass;
  team: string;
  manufacturer: string;
  laps: LapRow[];
}

// Parses "H:MM:SS.mmm" / "M:SS.mmm" / "SS.mmm" into milliseconds.
export function parseTime(s: string | undefined): number {
  if (!s) return 0;
  const parts = s.trim().split(":").map(Number);
  if (parts.some((n) => Number.isNaN(n))) return 0;
  let sec = 0;
  for (const p of parts) sec = sec * 60 + p;
  return Math.round(sec * 1000);
}

function mapClass(raw: string): CarClass {
  const u = raw.toUpperCase();
  if (u.includes("HYPER") || u === "HY") return "HYPERCAR";
  if (u.includes("P2")) return "LMP2";
  return "LMGT3";
}

// Parses an Al Kamel "Analysis" CSV into per-car lap timelines (semicolon-delimited,
// columns resolved by header name to tolerate ordering differences).
export function parseAnalysisCsv(text: string): Map<string, CarTimeline> {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length);
  const cols = (lines[0] ?? "").split(";").map((c) => c.trim());
  const ix = (name: string): number => cols.indexOf(name);
  const c = {
    num: ix("NUMBER"), lap: ix("LAP_NUMBER"), time: ix("LAP_TIME"), pit: ix("CROSSING_FINISH_LINE_IN_PIT"),
    s1: ix("S1"), s2: ix("S2"), s3: ix("S3"), kph: ix("KPH"), el: ix("ELAPSED"), top: ix("TOP_SPEED"),
    drv: ix("DRIVER_NAME"), cls: ix("CLASS"), team: ix("TEAM"), man: ix("MANUFACTURER"), pitTime: ix("PIT_TIME"),
  };
  const out = new Map<string, CarTimeline>();
  for (const line of lines.slice(1)) {
    const f = line.split(";");
    const number = (f[c.num] ?? "").trim();
    if (!number) continue;
    const elapsedMs = parseTime(f[c.el]);
    const lapMs = parseTime(f[c.time]);
    const car = out.get(number) ?? { number, carClass: mapClass(f[c.cls] ?? ""), team: (f[c.team] ?? "").trim(), manufacturer: (f[c.man] ?? "").trim(), laps: [] };
    car.laps.push({
      lap: Number(f[c.lap]) || car.laps.length + 1,
      lapMs, elapsedMs, startMs: elapsedMs - lapMs,
      s1: f[c.s1]?.trim(), s2: f[c.s2]?.trim(), s3: f[c.s3]?.trim(),
      kph: Number(f[c.kph]) || 0, topSpeed: Number(f[c.top]) || 0,
      driver: (f[c.drv] ?? "").trim(), inPit: (f[c.pit] ?? "").trim().length > 0,
      pitMs: parseTime(f[c.pitTime]),
    });
    out.set(number, car);
  }
  for (const car of out.values()) car.laps.sort((a, b) => a.lap - b.lap);
  return out;
}
