import { useEffect, useMemo, useState } from "react";
import MapView from "./MapView";
import Hud from "./Hud";
import ControlBar from "./ControlBar";
import Leaderboard from "./Leaderboard";
import CarDetail from "./CarDetail";
import { useRaceState } from "./useRaceState";
import { loadCenterline, type Centerline } from "./geo";
import { CLASSES } from "./cars";
import type { CarClass } from "./types";

export default function App(): JSX.Element {
  const { state, status } = useRaceState();
  const [centerline, setCenterline] = useState<Centerline | null>(null);
  const [satellite, setSatellite] = useState(true);
  const [active, setActive] = useState<Set<CarClass>>(new Set(CLASSES));
  const [selected, setSelected] = useState<string | null>(null);
  const [follow, setFollow] = useState(true);
  const [rosters, setRosters] = useState<Map<string, string[]>>(new Map());

  useEffect(() => {
    loadCenterline().then(setCenterline).catch((e) => console.error("track load failed", e));
    fetch(`${import.meta.env.BASE_URL}entrylist-2026.json`)
      .then((r) => r.json())
      .then((d: { cars: { number: string; drivers: string[] }[] }) => setRosters(new Map(d.cars.map((c) => [c.number, c.drivers]))))
      .catch(() => {});
  }, []);

  const counts = useMemo(() => {
    const c: Record<CarClass, number> = { HYPERCAR: 0, LMP2: 0, LMGT3: 0 };
    for (const car of state?.cars ?? []) c[car.carClass]++;
    return c;
  }, [state]);

  const toggleClass = (cls: CarClass): void =>
    setActive((prev) => {
      const next = new Set(prev);
      next.has(cls) ? next.delete(cls) : next.add(cls);
      return next.size ? next : new Set(CLASSES);
    });

  const onSelect = (n: string): void => {
    setSelected((cur) => (n && n !== cur ? n : null));
    if (n) setFollow(true);
  };
  const selectedCar = selected ? (state?.cars.find((c) => c.number === selected) ?? null) : null;

  return (
    <div className="absolute inset-0">
      {centerline ? (
        <MapView state={state} centerline={centerline} satellite={satellite} activeClasses={active} selected={selected} onSelect={onSelect} follow={follow} onFollowChange={setFollow} night={!!state?.session.night} />
      ) : (
        <div className="absolute inset-0 grid place-items-center text-white/50">
          <div className="animate-pulse text-sm tracking-widest">LOADING CIRCUIT…</div>
        </div>
      )}
      {state?.session.condition && /rain/i.test(state.session.condition) && <div className="rain-overlay pointer-events-none absolute inset-0 z-[5]" />}
      <Hud session={state?.session} status={status} source={state?.source} />
      {selectedCar && <CarDetail car={selectedCar} drivers={rosters.get(selectedCar.number)} follow={follow} onToggleFollow={() => setFollow((f) => !f)} onClose={() => setSelected(null)} />}
      <ControlBar satellite={satellite} onSatellite={setSatellite} active={active} onToggle={toggleClass} counts={counts} />
      <Leaderboard state={state} active={active} selected={selected} onSelect={onSelect} />
    </div>
  );
}
