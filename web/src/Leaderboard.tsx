import { useEffect, useState } from "react";
import type { Car, CarClass, RaceState } from "./types";
import { CLASSES, CLASS_COLOR } from "./cars";

interface Props {
  state: RaceState | null;
  active: Set<CarClass>;
  selected: string | null;
  onSelect: (n: string) => void;
}

function Row({ car, selected, onSelect }: { car: Car; selected: boolean; onSelect: (n: string) => void }): JSX.Element {
  return (
    <button
      onClick={() => onSelect(car.number)}
      className={`flex w-full items-center gap-2 px-2.5 py-1.5 text-left transition ${selected ? "bg-white/12" : "hover:bg-white/[0.06]"}`}
    >
      <span className="w-4 text-center font-mono text-[11px] font-bold text-white/55">{car.posClass}</span>
      <span
        className="flex h-5 min-w-[26px] items-center justify-center rounded px-1 font-mono text-[11px] font-black text-white"
        style={{ background: CLASS_COLOR[car.carClass], boxShadow: `0 0 8px ${CLASS_COLOR[car.carClass]}55` }}
      >
        {car.number}
      </span>
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block truncate text-[12px] font-semibold text-white/90">{car.currentDriver}</span>
        <span className="block truncate text-[10px] text-white/45">{car.manufacturer}{car.inPit ? " · PIT" : ""}{car.fastest ? " · ⚡" : ""}</span>
      </span>
      <span className="text-right leading-tight">
        <span className="block font-mono text-[11px] font-semibold tabular-nums text-white/85">{car.gapLeader}</span>
        <span className="block font-mono text-[10px] tabular-nums text-white/45">{car.lastLap ?? "--"}</span>
      </span>
    </button>
  );
}

export default function Leaderboard({ state, active, selected, onSelect }: Props): JSX.Element {
  const [open, setOpen] = useState(false);
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const m = matchMedia("(min-width: 640px)");
    const f = (): void => setDesktop(m.matches);
    f();
    m.addEventListener("change", f);
    return () => m.removeEventListener("change", f);
  }, []);

  const cars = state?.cars ?? [];
  const groups = CLASSES.map((c) => ({ c, cars: cars.filter((x) => x.carClass === c).sort((a, b) => a.posClass - b.posClass) }));
  const leader = cars.find((x) => x.posOverall === 1);
  const maxH = desktop ? undefined : open ? "76vh" : "40vh";

  return (
    <aside className="absolute bottom-0 left-0 right-0 z-20 sm:bottom-3 sm:left-auto sm:right-3 sm:top-[4.5rem] sm:w-[348px]">
      <div className="glass flex flex-col overflow-hidden rounded-t-2xl sm:h-full sm:rounded-xl" style={{ maxHeight: maxH }}>
        <button onClick={() => !desktop && setOpen((o) => !o)} className="flex w-full items-center justify-between px-3 py-2 sm:cursor-default">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-white/55">Standings</span>
            {leader && <span className="font-mono text-[11px] text-white/40">P1 #{leader.number} · L{leader.lap}</span>}
          </div>
          <span className="h-1 w-9 rounded-full bg-white/25 sm:hidden" />
        </button>
        <div className="board-scroll flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom)]">
          {groups.map(({ c, cars }) => (
            <section key={c} className={active.has(c) ? "" : "hidden"}>
              <div className="sticky top-0 z-10 flex items-center justify-between bg-[#0b1018]/95 px-2.5 py-1 backdrop-blur">
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: CLASS_COLOR[c] }}>
                  <span className="inline-block h-2 w-2 rounded-full" style={{ background: CLASS_COLOR[c] }} />
                  {c}
                </span>
                <span className="font-mono text-[10px] text-white/35">{cars.length}</span>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {cars.map((car) => (
                  <Row key={car.number} car={car} selected={selected === car.number} onSelect={onSelect} />
                ))}
              </div>
            </section>
          ))}
          {cars.length === 0 && <div className="px-3 py-8 text-center text-[12px] text-white/40">Waiting for timing data…</div>}
        </div>
      </div>
    </aside>
  );
}
