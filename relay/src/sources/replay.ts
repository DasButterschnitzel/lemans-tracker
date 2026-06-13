import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { RaceState } from "../types.js";
import type { RaceSource } from "../source.js";
import { relayDataDir } from "../paths.js";
import { parseAnalysisCsv } from "../csv.js";
import { loadEntryList } from "../entrylist.js";
import { buildStanding } from "../standings.js";
import { scoreTimelineAt } from "../timeline.js";
import { fmtClock } from "../util.js";
import { weatherFor } from "../weather.js";

const TICK_MS = 250;
const SPEED = Number(process.env.REPLAY_SPEED ?? 1);
const FILE = process.env.REPLAY_FILE ?? "le-mans-2026-fp1.csv";

export function createReplaySource(): RaceSource {
  const text = readFileSync(resolve(relayDataDir(), FILE), "utf8");
  const timelines = [...parseAnalysisCsv(text).values()];
  const ids = new Map(loadEntryList().map((e) => [e.number, e]));
  const sessionEnd = Math.max(...timelines.flatMap((c) => c.laps.map((l) => l.elapsedMs)));
  let t = sessionEnd * Number(process.env.REPLAY_START_FRAC ?? 0.12); // begin mid-session: cars already circulating
  let last = Date.now();
  let timer: ReturnType<typeof setInterval> | null = null;

  const buildState = (): RaceState => {
    const w = weatherFor(Date.now(), t / 1000, 14);
    return {
      session: { name: "Le Mans 2026 · Free Practice (replay)", flag: "GREEN", elapsed: fmtClock(t / 1000), remaining: fmtClock((sessionEnd - t) / 1000), trackTemp: w.trackTemp, airTemp: w.airTemp, condition: w.condition, weather: w.condition, timeOfDay: w.timeOfDay, night: w.night },
      cars: buildStanding(timelines.map((tl) => scoreTimelineAt(tl, ids.get(tl.number), t))),
      updatedAt: Date.now(),
      source: "replay",
    };
  };

  return {
    kind: "replay",
    start(emit) {
      last = Date.now();
      timer = setInterval(() => {
        const now = Date.now();
        t = (t + (now - last) * SPEED) % sessionEnd;
        last = now;
        emit(buildState());
      }, TICK_MS);
    },
    stop() {
      if (timer) clearInterval(timer);
      timer = null;
    },
  };
}
