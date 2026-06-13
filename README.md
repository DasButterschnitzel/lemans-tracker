# Le Mans · Live Tracker

A mobile-first, real-time tracker for the **24 Hours of Le Mans**. It renders the full
**Circuit de la Sarthe** on a top-down satellite map and animates every car as a
class-coloured, numbered dot with a broadcast-style live leaderboard, race clock, flags,
and per-car detail. 100% free / open-source data and tooling — no paid API keys.

## What it shows

- **Satellite track map** (Esri World Imagery, no key) of the real 13.6 km circuit, with a
  glowing OpenStreetMap-derived centerline. Toggle to a dark **schematic** mode.
- **62 cars** in the three 2026 classes with correct numbers, teams, manufacturers and colours
  (Hypercar `red`, LMP2 `blue`, LMGT3 `green`), positioned on track and smoothly animated at 60 fps.
- **Live leaderboard** grouped by class — position, gap, last/best lap, pit & fastest-lap flags.
- Tap any car for a **detail card** (driver, team, car, lap, gap, speed, pit stops).
- Race clock, flag banner, class filters, connection status.

## Quick start

Requires Node 20+ and pnpm (via `corepack`).

```bash
corepack pnpm install

# One command: build the web app and serve everything on one URL
corepack pnpm serve          # → http://localhost:8787

# …or develop with hot reload (two terminals):
corepack pnpm dev            # relay (data) on :8787
corepack pnpm dev:web        # web app on :5173
```

## Data sources (`--source` / `SOURCE`)

The **relay** ingests a data source, normalises it to one `RaceState` schema, and broadcasts it
to the web app over WebSocket. Three sources are built in:

| source   | what it is | how to run |
|----------|------------|-----------|
| `sim`    | **Default.** Physically-plausible 24h race simulation over the real entry list (pit stops, evolving order, fastest laps). Always works offline. | `corepack pnpm dev` |
| `replay` | **Real data.** Replays a bundled real 2026 Le Mans practice session (real cars, lap & sector times) from an Al Kamel *Analysis* CSV. | `SOURCE=replay corepack pnpm dev` |
| `live`   | Polls the live Al Kamel race *Analysis* CSV for the in-progress 24h race and dead-reckons positions between polls. Falls back to `sim` if no race CSV is reachable yet. | `SOURCE=live corepack pnpm dev` |

> On Windows PowerShell set the env var first, e.g. `$env:SOURCE='replay'; corepack pnpm dev`.
> The built server also accepts a flag: `node relay/dist/index.js --source=replay`.

### Going truly real-time

Le Mans live timing is provided by **Al Kamel** and the official Griiip-powered
`livetiming.fiawec.com`. The richest real-time feed (with on-track GPS positions) is a
proprietary WebSocket and is not a documented public API. Two ways to feed real race data:

1. **Al Kamel race CSV (works during the event):** as each race hour completes, Al Kamel
   publishes an *Analysis* CSV under
   `fiawec.alkamelsystems.com/Results/15_2026/03_LE MANS/657_FIA WEC/…`.
   Point the live source straight at the current one:
   ```bash
   LIVE_CSV="https://fiawec.alkamelsystems.com/Results/…/23_Analysis_Race_Hour 6.CSV" \
     SOURCE=live corepack pnpm dev
   ```
2. **Capture the Griiip WebSocket** from `livetiming.fiawec.com` in your browser's DevTools
   (Network → WS) during a live session and add an adapter in `relay/src/sources/` that maps
   its messages onto the `RaceState` schema (`relay/src/types.ts`).

## Hosting on GitHub Pages

The app ships with a GitHub Actions workflow (`.github/workflows/deploy.yml`) that builds the web
app and publishes it to GitHub Pages. The hosted site is **fully self-contained**: when no relay is
reachable it runs the simulation **entirely in your browser** (the `replay`/`live` modes still need
the local relay). The build uses a relative base, so it works at any `…github.io/<repo>/` path.

```bash
# 1. create a PUBLIC repo and push this project to main, e.g. with the GitHub CLI:
gh repo create lemans-live --public --source=. --push
#    …or create an empty repo in the browser, then:
#    git remote add origin https://github.com/<user>/lemans-live.git && git push -u origin main

# 2. in the repo: Settings → Pages → Build and deployment → Source = "GitHub Actions"
# 3. every push to main redeploys → live at https://<user>.github.io/lemans-live/
```

## How positions are drawn

Cars carry a normalised lap distance `trackPos` (0..1). The web app maps that onto the OSM
centerline (`web/public/sarthe.geojson`) and dead-reckons each car forward using its speed
between updates, correcting to the authoritative value on every message — so motion stays
smooth at 60 fps even with ~1 Hz timing data.

## Architecture

```
relay/ (Node + TS)            web/ (Vite + React + TS + Tailwind + MapLibre GL)
  sources/{sim,replay,live}     MapView   – satellite + glow track + animated markers
  csv, timeline, standings      Leaderboard, Hud, ControlBar, CarDetail
  index.ts → WS + REST + static useRaceState – WebSocket hook
```

Backend and frontend are fully decoupled; the relay also hosts the built web app so the whole
thing runs from one process on one port. Strict TypeScript throughout.

## Regenerating data

```bash
corepack pnpm track    # rebuild web/public/sarthe.geojson from OSM (Overpass)
corepack pnpm sample   # re-download the bundled real practice CSV
```

## Credits

- Circuit geometry: **OpenStreetMap** relation 2126739 (operator ACO) — © OpenStreetMap contributors.
- Satellite imagery: **Esri World Imagery** (Esri, Maxar, Earthstar Geographics).
- Timing data & schema: **Al Kamel Systems** (FIA WEC).
- Map rendering: **MapLibre GL JS**. Entry list: 2026 FIA WEC / Le Mans.
