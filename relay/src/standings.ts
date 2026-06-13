import type { Car, CarClass } from "./types.js";
import { fmtGap, fmtLap } from "./util.js";

export const CLASS_LAP_REF: Record<CarClass, number> = { HYPERCAR: 210, LMP2: 222, LMGT3: 240 };

export interface Scored {
  number: string;
  carClass: CarClass;
  team: string;
  car: string;
  manufacturer: string;
  driver: string;
  dist: number; // cumulative laps (float)
  lap: number;
  trackPos: number;
  inPit: boolean;
  pitStops: number;
  lastLapMs: number;
  bestLapMs: number;
  kph: number;
  topSpeed: number;
  tyreAge?: number;
}

function mapToCar(s: Scored, posOverall: number, posClass: number, leaderDist: number, aheadDist: number, ref: number, fastestNum: string): Car {
  return {
    number: s.number,
    carClass: s.carClass,
    team: s.team,
    car: s.car,
    manufacturer: s.manufacturer,
    currentDriver: s.driver,
    posOverall,
    posClass,
    gapLeader: posClass === 1 ? "LEADER" : fmtGap(leaderDist - s.dist, ref),
    gapAhead: posClass === 1 ? "—" : fmtGap(aheadDist - s.dist, ref),
    lap: s.lap,
    lastLap: s.lastLapMs > 0 ? fmtLap(s.lastLapMs) : undefined,
    bestLap: s.bestLapMs > 0 ? fmtLap(s.bestLapMs) : undefined,
    topSpeed: s.topSpeed || undefined,
    kph: s.kph,
    inPit: s.inPit,
    pitStops: s.pitStops,
    tyreAge: s.tyreAge,
    trackPos: s.trackPos,
    fastest: s.number === fastestNum && s.bestLapMs > 0,
  };
}

// Ranks cars overall and per class, computing class-relative gaps and the fastest lap.
export function buildStanding(scored: Scored[]): Car[] {
  const fastest = scored.reduce((a, b) => (b.bestLapMs > 0 && (a.bestLapMs <= 0 || b.bestLapMs < a.bestLapMs) ? b : a), scored[0]!);
  const byDist = [...scored].sort((a, b) => b.dist - a.dist);
  const overall = new Map<string, number>();
  byDist.forEach((s, i) => overall.set(s.number, i + 1));
  const groups: Record<string, Scored[]> = {};
  for (const s of byDist) (groups[s.carClass] ??= []).push(s);
  const out: Car[] = [];
  for (const group of Object.values(groups)) {
    const leaderDist = group[0]!.dist;
    group.forEach((s, i) => {
      const ahead = i === 0 ? s.dist : group[i - 1]!.dist;
      out.push(mapToCar(s, overall.get(s.number)!, i + 1, leaderDist, ahead, CLASS_LAP_REF[s.carClass], fastest.number));
    });
  }
  return out;
}
