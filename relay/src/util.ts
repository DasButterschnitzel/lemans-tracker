export function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const dLat = ((b[1] - a[1]) * Math.PI) / 180;
  const dLon = ((b[0] - a[0]) * Math.PI) / 180;
  const la1 = (a[1] * Math.PI) / 180;
  const la2 = (b[1] * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Format milliseconds as a lap time "M:SS.mmm". */
export function fmtLap(ms: number): string {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const mil = Math.floor(ms % 1000);
  return `${m}:${String(s).padStart(2, "0")}.${String(mil).padStart(3, "0")}`;
}

/** Format seconds as a clock "HH:MM:SS". */
export function fmtClock(totalSec: number): string {
  const sec = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Gap from a distance difference (in laps) and a reference lap time (sec). */
export function fmtGap(lapDiff: number, lapSec: number): string {
  if (lapDiff <= 0.00001) return "—";
  if (lapDiff >= 1) return `+${Math.floor(lapDiff)} L`;
  const sec = lapDiff * lapSec;
  if (sec >= 60) {
    const m = Math.floor(sec / 60);
    return `+${m}:${(sec % 60).toFixed(1).padStart(4, "0")}`;
  }
  return `+${sec.toFixed(1)}`;
}

export const randIn = (lo: number, hi: number): number => lo + Math.random() * (hi - lo);
