export interface Weather {
  condition: string;
  airTemp: number;
  trackTemp: number;
  night: boolean;
  timeOfDay: string;
}

const CONDS = ["Clear", "Clear", "Partly Cloudy", "Cloudy", "Cloudy", "Light Rain"];

// Deterministic, stateless weather + time-of-day for the race clock (starts at
// startHour, default 16:00 at Le Mans). Condition steps every ~2.5 min.
export function weatherFor(now: number, elapsedSec: number, startHour = 16): Weather {
  const bucket = Math.floor(now / 150000);
  const condition = CONDS[((bucket * 2654435761) >>> 0) % CONDS.length]!;
  const minOfDay = (((startHour * 60 + elapsedSec / 60) % 1440) + 1440) % 1440;
  const hour = minOfDay / 60;
  const night = hour >= 22 || hour < 6;
  const base = 18 + 7 * Math.cos(((minOfDay - 15 * 60) / 1440) * 2 * Math.PI);
  const wet = condition.includes("Rain");
  const airTemp = Math.round(base - (wet ? 3 : 0));
  const trackTemp = Math.round(airTemp + (night ? 2 : wet ? 4 : 11));
  const timeOfDay = `${String(Math.floor(hour)).padStart(2, "0")}:${String(Math.floor(minOfDay % 60)).padStart(2, "0")}`;
  return { condition, airTemp, trackTemp, night, timeOfDay };
}
