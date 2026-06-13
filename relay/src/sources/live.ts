import type { RaceState } from "../types.js";
import type { RaceSource } from "../source.js";
import { parseAnalysisCsv, type CarTimeline } from "../csv.js";
import { loadEntryList, type Entry } from "../entrylist.js";
import { buildStanding } from "../standings.js";
import { scoreTimelineAt } from "../timeline.js";
import { fmtClock } from "../util.js";
import { weatherFor } from "../weather.js";
import { createSimSource } from "./sim.js";

const TICK_MS = 250;
const POLL_MS = Number(process.env.LIVE_POLL_SEC ?? 20) * 1000;
const RACE_HOURS = 24 * 3600;

// The live race is served by Al Kamel's "Analysis" CSV, which accumulates per-lap data
// for the session. Point LIVE_CSV at the current race CSV from fiawec.alkamelsystems.com.
const BASE = "https://fiawec.alkamelsystems.com/Results/15_2026/03_LE%20MANS/657_FIA%20WEC";
function candidates(): string[] {
  if (process.env.LIVE_CSV) return [process.env.LIVE_CSV];
  const list: string[] = [];
  for (let h = 24; h >= 1; h--) list.push(`${BASE}/202606131600_Race/23_Analysis_Race_Hour%20${h}.CSV`);
  return list;
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "lemans-live/0.1" } });
    return res.ok ? await res.text() : null;
  } catch {
    return null;
  }
}

async function fetchLatest(): Promise<string | null> {
  for (const url of candidates()) {
    const txt = await fetchText(url);
    if (txt && txt.includes("LAP_NUMBER")) return txt;
  }
  return null;
}

export function createLiveSource(): RaceSource {
  const ids = new Map(loadEntryList().map((e) => [e.number, e] as [string, Entry]));
  let timelines: CarTimeline[] = [];
  let baseElapsed = 0; // max ELAPSED from the latest CSV (ms)
  let fetchedAt = 0; // wall clock of that fetch
  let tick: ReturnType<typeof setInterval> | null = null;
  let poll: ReturnType<typeof setInterval> | null = null;
  let fallback: RaceSource | null = null;

  const ingest = (text: string): void => {
    timelines = [...parseAnalysisCsv(text).values()];
    baseElapsed = Math.max(0, ...timelines.flatMap((c) => c.laps.map((l) => l.elapsedMs)));
    fetchedAt = Date.now();
  };

  const buildState = (): RaceState => {
    const t = baseElapsed + (Date.now() - fetchedAt); // dead-reckon between polls
    const w = weatherFor(Date.now(), t / 1000, 16);
    return {
      session: { name: "24 Hours of Le Mans · LIVE", flag: "GREEN", elapsed: fmtClock(t / 1000), remaining: fmtClock(RACE_HOURS - t / 1000), trackTemp: w.trackTemp, airTemp: w.airTemp, condition: w.condition, weather: w.condition, timeOfDay: w.timeOfDay, night: w.night },
      cars: buildStanding(timelines.map((tl) => scoreTimelineAt(tl, ids.get(tl.number), t))),
      updatedAt: Date.now(),
      source: "live",
    };
  };

  return {
    kind: "live",
    async start(emit) {
      const first = await fetchLatest();
      if (!first) {
        console.warn("[relay] live feed unreachable (no race CSV yet). Set LIVE_CSV to the current");
        console.warn("[relay]   Analysis CSV from fiawec.alkamelsystems.com, or use --source=sim/replay.");
        console.warn("[relay] Falling back to sim so the app stays populated.");
        fallback = createSimSource();
        await fallback.start(emit);
        return;
      }
      ingest(first);
      tick = setInterval(() => emit(buildState()), TICK_MS);
      poll = setInterval(async () => {
        const txt = await fetchLatest();
        if (txt) ingest(txt);
      }, POLL_MS);
      console.log(`[relay] live: polling Al Kamel CSV every ${POLL_MS / 1000}s (${timelines.length} cars)`);
    },
    stop() {
      if (tick) clearInterval(tick);
      if (poll) clearInterval(poll);
      fallback?.stop();
    },
  };
}
