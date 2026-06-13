import type { Car } from "./types";
import { CLASS_COLOR, manufacturerColor } from "./cars";

function Stat({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="leading-tight">
      <div className="text-[9px] uppercase tracking-widest text-white/40">{label}</div>
      <div className="font-mono text-[13px] font-semibold tabular-nums text-white/90">{value}</div>
    </div>
  );
}

interface Props {
  car: Car;
  follow: boolean;
  onToggleFollow: () => void;
  onClose: () => void;
}

export default function CarDetail({ car, follow, onToggleFollow, onClose }: Props): JSX.Element {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-[3.4rem] z-30 flex justify-center px-3 sm:right-[372px] sm:left-3 sm:justify-start">
      <div className="glass pointer-events-auto w-full max-w-md rounded-xl p-3 shadow-2xl">
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-7 min-w-[34px] items-center justify-center rounded-md px-1.5 font-mono text-sm font-black text-white"
            style={{ background: CLASS_COLOR[car.carClass], border: `2px solid ${manufacturerColor(car.manufacturer)}`, boxShadow: `0 0 12px ${CLASS_COLOR[car.carClass]}66` }}
          >
            {car.number}
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-sm font-bold">{car.currentDriver}</div>
            <div className="truncate text-[11px] text-white/55">{car.team} · {car.car}</div>
          </div>
          {car.fastest && <span className="rounded bg-[#c879ff]/20 px-1.5 py-0.5 text-[10px] font-bold text-[#d9a8ff]">⚡</span>}
          <button
            onClick={onToggleFollow}
            className={`rounded-md px-2 py-1 text-[11px] font-bold transition ${follow ? "bg-hyper/90 text-white" : "bg-white/10 text-white/70 hover:text-white"}`}
            title="Keep the camera locked on this car"
          >
            {follow ? "◉ Following" : "◎ Follow"}
          </button>
          <button onClick={onClose} className="ml-0.5 rounded px-1.5 text-white/50 transition hover:text-white">✕</button>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2">
          <Stat label="Overall" value={`P${car.posOverall}`} />
          <Stat label="Class" value={`P${car.posClass}`} />
          <Stat label="Lap" value={String(car.lap)} />
          <Stat label="Gap" value={car.gapLeader} />
          <Stat label="Last" value={car.lastLap ?? "--"} />
          <Stat label="Best" value={car.bestLap ?? "--"} />
          <Stat label="Speed" value={car.kph ? `${car.kph} kph` : "--"} />
          <Stat label="Pits" value={String(car.pitStops)} />
        </div>
        {car.inPit && <div className="mt-2 inline-block rounded bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold tracking-wide text-amber-300">IN PIT LANE</div>}
      </div>
    </div>
  );
}
