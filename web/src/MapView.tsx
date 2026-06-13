import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Car, CarClass, RaceState } from "./types";
import { CLASS_COLOR, manufacturerColor } from "./cars";
import { posAt, type Centerline } from "./geo";

const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

interface MarkerRec {
  marker: maplibregl.Marker;
  el: HTMLDivElement;
  disp: number;
  vel: number;
  inPit: boolean;
}

interface Props {
  state: RaceState | null;
  centerline: Centerline;
  satellite: boolean;
  activeClasses: Set<CarClass>;
  selected: string | null;
  onSelect: (n: string) => void;
}

function unwrap(target: number, from: number): number {
  let d = target - from;
  if (d > 0.5) d -= 1;
  if (d < -0.5) d += 1;
  return d;
}

function buildMarkerEl(car: Car, onSelect: (n: string) => void): HTMLDivElement {
  const el = document.createElement("div");
  el.className = `car-marker cls-${car.carClass}`;
  el.style.setProperty("--accent", CLASS_COLOR[car.carClass]);
  el.style.setProperty("--ring", manufacturerColor(car.manufacturer));
  el.innerHTML = `<span class="dot"></span><span class="num">${car.number}</span>`;
  el.addEventListener("click", (e) => { e.stopPropagation(); onSelect(car.number); });
  return el;
}

export default function MapView({ state, centerline, satellite, activeClasses, selected, onSelect }: Props): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const readyRef = useRef(false);
  const markers = useRef<Map<string, MarkerRec>>(new Map());
  const carsRef = useRef<Car[]>([]);

  // Init map once.
  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: { sat: { type: "raster", tiles: [ESRI], tileSize: 256, attribution: "Imagery © Esri, Maxar, Earthstar Geographics" } },
        layers: [
          { id: "bg", type: "background", paint: { "background-color": "#06080D" } },
          { id: "sat", type: "raster", source: "sat", paint: { "raster-brightness-max": 0.82, "raster-saturation": -0.22, "raster-contrast": 0.05, "raster-opacity": 0.95 } },
        ],
      },
      bounds: centerline.bounds,
      fitBoundsOptions: { padding: { top: 96, bottom: 64, left: 40, right: 40 } },
      attributionControl: { compact: true },
      maxZoom: 17,
      minZoom: 10.5,
    });
    mapRef.current = map;
    map.on("load", () => {
      map.addSource("track", { type: "geojson", data: "/sarthe.geojson" });
      const line = { "line-cap": "round", "line-join": "round" } as const;
      map.addLayer({ id: "track-bloom", type: "line", source: "track", layout: line, paint: { "line-color": "#2EE6FF", "line-width": 20, "line-blur": 18, "line-opacity": 0.22 } });
      map.addLayer({ id: "track-glow", type: "line", source: "track", layout: line, paint: { "line-color": "#3AE8FF", "line-width": 8, "line-blur": 6, "line-opacity": 0.6 } });
      map.addLayer({ id: "track-core", type: "line", source: "track", layout: line, paint: { "line-color": "#EAFBFF", "line-width": 2.6, "line-opacity": 0.95 } });
      readyRef.current = true;
    });
    map.on("click", () => onSelect(""));
    return () => { map.remove(); mapRef.current = null; readyRef.current = false; markers.current.clear(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerline]);

  // Toggle satellite vs schematic (dark) base.
  useEffect(() => {
    const map = mapRef.current;
    if (map && map.getLayer("sat")) map.setLayoutProperty("sat", "visibility", satellite ? "visible" : "none");
  }, [satellite, state]);

  // Sync markers + per-car velocity on each state update.
  useEffect(() => {
    if (!state) return;
    carsRef.current = state.cars;
    if (!readyRef.current || !mapRef.current) return;
    const map = mapRef.current;
    for (const car of state.cars) {
      const t = car.trackPos ?? 0;
      let rec = markers.current.get(car.number);
      if (!rec) {
        const el = buildMarkerEl(car, onSelect);
        const marker = new maplibregl.Marker({ element: el, anchor: "center" }).setLngLat(posAt(centerline, t)).addTo(map);
        rec = { marker, el, disp: t, vel: 0, inPit: car.inPit };
        markers.current.set(car.number, rec);
      }
      const err = unwrap(t, rec.disp);
      rec.disp = Math.abs(err) > 0.4 ? t : rec.disp + err * 0.35;
      rec.vel = car.inPit ? 0 : (car.kph ?? 0) / 3600 / centerline.total;
      rec.inPit = car.inPit;
      syncClasses(rec.el, car, activeClasses, selected);
    }
  }, [state, centerline, activeClasses, selected, onSelect]);

  // Center on the selected car.
  useEffect(() => {
    const map = mapRef.current;
    const rec = selected ? markers.current.get(selected) : null;
    if (map && rec) map.easeTo({ center: rec.marker.getLngLat(), zoom: Math.max(map.getZoom(), 14), duration: 700 });
  }, [selected]);

  // Animation loop: dead-reckon positions between updates.
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now: number): void => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      for (const rec of markers.current.values()) {
        if (rec.vel > 0) {
          rec.disp = (rec.disp + rec.vel * dt + 1) % 1;
          rec.marker.setLngLat(posAt(centerline, rec.disp));
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [centerline]);

  return <div ref={containerRef} className="absolute inset-0" />;
}

function syncClasses(el: HTMLDivElement, car: Car, active: Set<CarClass>, selected: string | null): void {
  el.classList.toggle("is-pit", car.inPit);
  el.classList.toggle("is-fastest", !!car.fastest);
  el.classList.toggle("is-leader", car.posClass === 1);
  el.classList.toggle("is-selected", selected === car.number);
  el.classList.toggle("is-dim", !active.has(car.carClass) || (!!selected && selected !== car.number));
}
