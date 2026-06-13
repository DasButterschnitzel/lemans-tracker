import type { CarClass } from "./types";
import { CLASSES, CLASS_COLOR, CLASS_SHORT } from "./cars";

interface Props {
  satellite: boolean;
  onSatellite: (v: boolean) => void;
  active: Set<CarClass>;
  onToggle: (c: CarClass) => void;
  counts: Record<CarClass, number>;
}

export default function ControlBar({ satellite, onSatellite, active, onToggle, counts }: Props): JSX.Element {
  return (
    <div className="absolute bottom-3 left-3 z-20 flex flex-col gap-2">
      <div className="glass flex items-center gap-1 rounded-lg p-1">
        {CLASSES.map((c) => {
          const on = active.has(c);
          return (
            <button
              key={c}
              onClick={() => onToggle(c)}
              className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-bold transition ${on ? "text-white" : "text-white/35"}`}
              style={on ? { background: `${CLASS_COLOR[c]}22` } : undefined}
            >
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: CLASS_COLOR[c], opacity: on ? 1 : 0.4 }} />
              {CLASS_SHORT[c]}
              <span className="text-white/40">{counts[c] ?? 0}</span>
            </button>
          );
        })}
      </div>
      <button
        onClick={() => onSatellite(!satellite)}
        className="glass w-fit rounded-lg px-3 py-1.5 text-[11px] font-semibold text-white/80 transition hover:text-white"
      >
        {satellite ? "◉ Satellite" : "◍ Schematic"}
      </button>
    </div>
  );
}
