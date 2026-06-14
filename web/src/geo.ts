export interface Centerline {
  coords: [number, number][];
  cum: number[];
  total: number;
  bounds: [[number, number], [number, number]];
}

function haversine(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const dLat = ((b[1] - a[1]) * Math.PI) / 180;
  const dLon = ((b[0] - a[0]) * Math.PI) / 180;
  const la1 = (a[1] * Math.PI) / 180;
  const la2 = (b[1] * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export async function loadCenterline(url = `${import.meta.env.BASE_URL}sarthe.geojson`): Promise<Centerline> {
  const res = await fetch(url);
  const fc = await res.json();
  const coords: [number, number][] = fc.features[0].geometry.coordinates;
  const cum = [0];
  let minX = 180, minY = 90, maxX = -180, maxY = -90;
  for (let i = 0; i < coords.length; i++) {
    const [x, y] = coords[i]!;
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    if (i > 0) cum[i] = cum[i - 1]! + haversine(coords[i - 1]!, coords[i]!);
  }
  return { coords, cum, total: cum[cum.length - 1]!, bounds: [[minX, minY], [maxX, maxY]] };
}

// Returns [lng,lat] at normalised lap distance t (0..1), interpolating along the line.
export function posAt(cl: Centerline, t: number): [number, number] {
  const target = ((t % 1) + 1) % 1 * cl.total;
  let lo = 0, hi = cl.cum.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (cl.cum[mid]! < target) lo = mid + 1;
    else hi = mid;
  }
  const i = Math.max(1, lo);
  const segStart = cl.cum[i - 1]!;
  const segLen = cl.cum[i]! - segStart || 1e-9;
  const f = (target - segStart) / segLen;
  const a = cl.coords[i - 1]!;
  const b = cl.coords[i]!;
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
}
