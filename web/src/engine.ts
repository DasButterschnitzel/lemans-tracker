// Self-contained in-browser race simulation. Used when no relay WebSocket is
// available (e.g. the static GitHub Pages build) so the app is fully usable
// stand-alone. Mirrors relay/src/sources/sim.ts.
import type { Car, CarClass, RaceState } from "./types";

const TICK_MS = 250;
const START_HOURS = 3;
const LAP_KM = 13.626;
const CLASS_LAP: Record<CarClass, number> = { HYPERCAR: 210, LMP2: 222, LMGT3: 240 };

interface Entry { number: string; class: CarClass; team: string; car: string; manufacturer: string; drivers: string[] }

interface SimCar {
  e: Entry; base: number; cur: number; dist: number; lap: number; lastCross: number;
  lastLapMs: number; bestLapMs: number; pits: number; inPit: boolean; pitUntil: number; nextPit: number; drv: number;
}

const rnd = (lo: number, hi: number): number => lo + Math.random() * (hi - lo);

function fmtLap(ms: number): string {
  const m = Math.floor(ms / 60000), s = Math.floor((ms % 60000) / 1000), mil = Math.floor(ms % 1000);
  return `${m}:${String(s).padStart(2, "0")}.${String(mil).padStart(3, "0")}`;
}
function fmtClock(sec: number): string {
  const x = Math.max(0, Math.floor(sec));
  return [Math.floor(x / 3600), Math.floor((x % 3600) / 60), x % 60].map((n) => String(n).padStart(2, "0")).join(":");
}
function fmtGap(lapDiff: number, lapSec: number): string {
  if (lapDiff <= 1e-5) return "—";
  if (lapDiff >= 1) return `+${Math.floor(lapDiff)} L`;
  const s = lapDiff * lapSec;
  return s >= 60 ? `+${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}` : `+${s.toFixed(1)}`;
}

function build(e: Entry, now: number): SimCar {
  const base = CLASS_LAP[e.class] * rnd(1.0, 1.035);
  const dist = ((START_HOURS * 3600) / base) * rnd(0.97, 1.0);
  const best = base * 1000 * rnd(0.965, 0.99);
  return { e, base, cur: base * rnd(0.99, 1.03), dist, lap: Math.floor(dist), lastCross: now, lastLapMs: best * rnd(1, 1.04), bestLapMs: best, pits: Math.floor(dist / 38), inPit: false, pitUntil: 0, nextPit: Math.floor(dist) + Math.round(rnd(8, 40)), drv: 0 };
}

function advance(c: SimCar, dt: number, now: number): void {
  if (c.inPit) { if (now < c.pitUntil) return; c.inPit = false; c.lastCross = now; }
  c.dist += dt / c.cur;
  if (Math.floor(c.dist) > c.lap) {
    c.lap = Math.floor(c.dist);
    const lapMs = now - c.lastCross; c.lastCross = now;
    if (lapMs > 90000 && lapMs < 600000) { c.lastLapMs = lapMs; if (lapMs < c.bestLapMs) c.bestLapMs = lapMs; }
    c.cur = c.base * rnd(0.985, 1.04);
    if (c.lap >= c.nextPit) { c.inPit = true; c.pits++; c.pitUntil = now + rnd(38, 70) * 1000; c.nextPit = c.lap + Math.round(rnd(36, 42)); c.drv = (c.drv + 1) % c.e.drivers.length; }
  }
}

function toCars(sim: SimCar[]): Car[] {
  const fast = sim.reduce((a, b) => (b.bestLapMs < a.bestLapMs ? b : a));
  const byDist = [...sim].sort((a, b) => b.dist - a.dist);
  const overall = new Map(byDist.map((c, i) => [c.e.number, i + 1]));
  const groups: Record<string, SimCar[]> = {};
  for (const c of byDist) (groups[c.e.class] ??= []).push(c);
  const out: Car[] = [];
  for (const g of Object.values(groups)) {
    const leader = g[0]!.dist; const ref = CLASS_LAP[g[0]!.e.class];
    g.forEach((c, i) => {
      const ahead = i === 0 ? c.dist : g[i - 1]!.dist;
      out.push({
        number: c.e.number, carClass: c.e.class, team: c.e.team, car: c.e.car, manufacturer: c.e.manufacturer,
        currentDriver: c.e.drivers[c.drv] ?? c.e.drivers[0]!, posOverall: overall.get(c.e.number)!, posClass: i + 1,
        gapLeader: i === 0 ? "LEADER" : fmtGap(leader - c.dist, ref), gapAhead: i === 0 ? "—" : fmtGap(ahead - c.dist, ref),
        lap: c.lap, lastLap: fmtLap(c.lastLapMs), bestLap: fmtLap(c.bestLapMs),
        topSpeed: c.e.class === "LMGT3" ? 280 : c.e.class === "LMP2" ? 305 : 330,
        kph: c.inPit ? Math.round(rnd(55, 80)) : Math.round(LAP_KM / (c.cur / 3600)),
        inPit: c.inPit, pitStops: c.pits, tyreAge: Math.max(0, c.lap - (c.nextPit - 39)),
        trackPos: c.dist - Math.floor(c.dist), fastest: c.e.number === fast.e.number,
      });
    });
  }
  return out;
}

export interface Engine { start(emit: (s: RaceState) => void): Promise<void>; stop(): void }

export function createSimEngine(): Engine {
  let cars: SimCar[] = [];
  let timer: ReturnType<typeof setInterval> | null = null;
  let last = Date.now();
  let startTime = 0;
  let flag: RaceState["session"]["flag"] = "GREEN";

  return {
    async start(emit) {
      const res = await fetch(`${import.meta.env.BASE_URL}entrylist-2026.json`);
      const entries = (await res.json()).cars as Entry[];
      const now = Date.now();
      startTime = now - START_HOURS * 3600 * 1000;
      cars = entries.map((e) => build(e, now));
      last = now;
      timer = setInterval(() => {
        const t = Date.now(); const dt = (t - last) / 1000; last = t;
        flag = Math.random() < 0.0008 ? "FCY" : flag === "FCY" && Math.random() < 0.02 ? "GREEN" : flag;
        for (const c of cars) advance(c, dt, t);
        const elapsed = (t - startTime) / 1000;
        emit({ session: { name: "24 Hours of Le Mans", flag, elapsed: fmtClock(elapsed), remaining: fmtClock(24 * 3600 - elapsed), trackTemp: 28, weather: "Dry" }, cars: toCars(cars), updatedAt: t, source: "sim" });
      }, TICK_MS);
    },
    stop() { if (timer) clearInterval(timer); timer = null; },
  };
}
