import type { CarTimeline } from "./csv.js";
import type { Entry } from "./entrylist.js";
import type { Scored } from "./standings.js";

// Index of the lap in progress at session time t (ms): first lap not yet completed.
function lapInProgress(laps: CarTimeline["laps"], t: number): number {
  let lo = 0, hi = laps.length;
  while (lo < hi) {
    const m = (lo + hi) >> 1;
    if (laps[m]!.elapsedMs <= t) lo = m + 1;
    else hi = m;
  }
  return lo;
}

function bestUpTo(laps: CarTimeline["laps"], t: number): number {
  let best = 0;
  for (const l of laps) {
    if (l.elapsedMs > t) break;
    if (l.lapMs > 90000 && l.lapMs < 600000 && (best === 0 || l.lapMs < best)) best = l.lapMs;
  }
  return best;
}

// Reconstructs a car's racing state at session time t from its real lap timeline.
export function scoreTimelineAt(tl: CarTimeline, id: Entry | undefined, t: number): Scored {
  const i = lapInProgress(tl.laps, t);
  const prev = tl.laps[i - 1];
  const cur = tl.laps[i];
  const done = i >= tl.laps.length;
  const onTrack = !!cur && t >= cur.startMs;
  const trackPos = onTrack ? Math.min(1, Math.max(0, (t - cur!.startMs) / (cur!.lapMs || 1))) : 0;
  const lap = done ? tl.laps.length : Math.max(0, (cur?.lap ?? 1) - 1);
  const ref = cur ?? prev;
  return {
    number: tl.number, carClass: tl.carClass, team: id?.team ?? tl.team, car: id?.car ?? tl.manufacturer,
    manufacturer: tl.manufacturer || id?.manufacturer || "", driver: ref?.driver || id?.drivers[0] || "",
    dist: lap + trackPos, lap, trackPos,
    inPit: done || !onTrack || !!cur?.inPit, pitStops: tl.laps.filter((l) => l.elapsedMs <= t && l.inPit).length,
    lastLapMs: prev?.lapMs ?? 0, bestLapMs: bestUpTo(tl.laps, t),
    kph: onTrack ? cur!.kph : 0, topSpeed: ref?.topSpeed ?? 0,
  };
}
