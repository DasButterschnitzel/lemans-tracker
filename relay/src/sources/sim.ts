import type { RaceState, CarClass, FlagState } from "../types.js";
import type { RaceSource } from "../source.js";
import { loadEntryList, type Entry } from "../entrylist.js";
import { loadTrack } from "../track.js";
import { buildStanding, type Scored } from "../standings.js";
import { fmtClock, randIn } from "../util.js";

const TICK_MS = 250;
const START_HOURS = 3; // simulate a race already 3 hours in
const CLASS_LAP: Record<CarClass, number> = { HYPERCAR: 210, LMP2: 222, LMGT3: 240 };

interface SimCar {
  entry: Entry;
  base: number;
  curLapSec: number;
  dist: number;
  lap: number;
  lastCrossTime: number;
  lastLapMs: number;
  bestLapMs: number;
  pitStops: number;
  inPit: boolean;
  pitUntil: number;
  nextPitLap: number;
  driverIdx: number;
}

function buildCar(entry: Entry, now: number): SimCar {
  const base = CLASS_LAP[entry.carClass] * randIn(1.0, 1.035);
  const dist = ((START_HOURS * 3600) / base) * randIn(0.97, 1.0);
  const best = base * 1000 * randIn(0.965, 0.99);
  return {
    entry, base, curLapSec: base * randIn(0.99, 1.03), dist, lap: Math.floor(dist),
    lastCrossTime: now, lastLapMs: best * randIn(1.0, 1.04), bestLapMs: best,
    pitStops: Math.floor(dist / 38), inPit: false, pitUntil: 0,
    nextPitLap: Math.floor(dist) + Math.round(randIn(8, 40)), driverIdx: 0,
  };
}

function crossLine(c: SimCar, now: number): void {
  c.lap = Math.floor(c.dist);
  const lapMs = now - c.lastCrossTime;
  c.lastCrossTime = now;
  if (lapMs > 90000 && lapMs < 600000) {
    c.lastLapMs = lapMs;
    if (lapMs < c.bestLapMs) c.bestLapMs = lapMs;
  }
  c.curLapSec = c.base * randIn(0.985, 1.04);
  if (c.lap >= c.nextPitLap) {
    c.inPit = true;
    c.pitStops++;
    c.pitUntil = now + randIn(38, 70) * 1000;
    c.nextPitLap = c.lap + Math.round(randIn(36, 42));
    c.driverIdx = (c.driverIdx + 1) % c.entry.drivers.length;
  }
}

function advance(c: SimCar, dtSec: number, now: number): void {
  if (c.inPit) {
    if (now < c.pitUntil) return;
    c.inPit = false;
    c.lastCrossTime = now;
  }
  c.dist += dtSec / c.curLapSec;
  if (Math.floor(c.dist) > c.lap) crossLine(c, now);
}

function kphOf(c: SimCar, lapKm: number): number {
  if (c.inPit) return Math.round(randIn(55, 80));
  return Math.round((lapKm / (c.curLapSec / 3600)) * randIn(0.98, 1.02));
}

function scoreCars(cars: SimCar[], lapKm: number): Scored[] {
  return cars.map((c) => ({
    number: c.entry.number, carClass: c.entry.carClass, team: c.entry.team, car: c.entry.car,
    manufacturer: c.entry.manufacturer, driver: c.entry.drivers[c.driverIdx] ?? c.entry.drivers[0]!,
    dist: c.dist, lap: c.lap, trackPos: c.dist - Math.floor(c.dist), inPit: c.inPit, pitStops: c.pitStops,
    lastLapMs: c.lastLapMs, bestLapMs: c.bestLapMs, kph: kphOf(c, lapKm),
    topSpeed: c.entry.carClass === "LMGT3" ? 280 : c.entry.carClass === "LMP2" ? 305 : 330,
    tyreAge: Math.max(0, c.lap - (c.nextPitLap - 39)),
  }));
}

export function createSimSource(): RaceSource {
  const track = loadTrack();
  let cars: SimCar[] = [];
  let timer: ReturnType<typeof setInterval> | null = null;
  let last = Date.now();
  let startTime = 0;
  let flag: FlagState = "GREEN";

  const buildState = (now: number): RaceState => {
    const elapsed = (now - startTime) / 1000;
    return {
      session: { name: "24 Hours of Le Mans", flag, elapsed: fmtClock(elapsed), remaining: fmtClock(24 * 3600 - elapsed), trackTemp: 28, weather: "Dry" },
      cars: buildStanding(scoreCars(cars, track.lengthKm)),
      updatedAt: now,
      source: "sim",
    };
  };

  return {
    kind: "sim",
    start(emit) {
      const now = Date.now();
      startTime = now - START_HOURS * 3600 * 1000;
      cars = loadEntryList().map((e) => buildCar(e, now));
      last = now;
      timer = setInterval(() => {
        const t = Date.now();
        const dt = (t - last) / 1000;
        last = t;
        flag = Math.random() < 0.0008 ? "FCY" : flag === "FCY" && Math.random() < 0.02 ? "GREEN" : flag;
        for (const c of cars) advance(c, dt, t);
        emit(buildState(t));
      }, TICK_MS);
    },
    stop() {
      if (timer) clearInterval(timer);
      timer = null;
    },
  };
}
