import type { FlagState, Session } from "./types";
import type { ConnStatus } from "./useRaceState";

const FLAG: Record<FlagState, { label: string; color: string }> = {
  GREEN: { label: "GREEN", color: "#25E07A" },
  YELLOW: { label: "YELLOW", color: "#FFD23F" },
  FCY: { label: "FULL COURSE YELLOW", color: "#FF9D2E" },
  SC: { label: "SAFETY CAR", color: "#FF9D2E" },
  RED: { label: "RED FLAG", color: "#FF3B3B" },
  CHEQUERED: { label: "FINISH", color: "#E7EDF5" },
};

interface Props {
  session: Session | undefined;
  status: ConnStatus;
  source: string | undefined;
}

function weatherIcon(condition: string | undefined, night: boolean | undefined): string {
  if (condition && /rain/i.test(condition)) return "🌧️";
  if (night) return "🌙";
  if (condition === "Partly Cloudy") return "⛅";
  if (condition === "Cloudy") return "☁️";
  return "☀️";
}

export default function Hud({ session, status, source }: Props): JSX.Element {
  const flag = FLAG[session?.flag ?? "GREEN"];
  const dot = status === "live" ? "#25E07A" : status === "connecting" ? "#FFD23F" : "#FF3B3B";
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20">
      <div className="glass pointer-events-auto flex items-center justify-between gap-3 px-3 py-2 sm:px-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-hyper/90 text-[11px] font-black tracking-tighter sm:h-8 sm:w-8">24h</div>
          <div className="leading-tight">
            <div className="text-[13px] font-bold tracking-wide sm:text-sm">LE MANS · LIVE</div>
            <div className="flex items-center gap-1.5 text-[10px] text-white/55">
              <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: dot, boxShadow: `0 0 6px ${dot}` }} />
              {status === "live" ? (source ?? "live").toUpperCase() : status.toUpperCase()}
            </div>
          </div>
        </div>

        {session?.condition && (
          <div className="flex items-center gap-2 rounded-lg bg-white/[0.04] px-2 py-1">
            <span className="text-base leading-none sm:text-lg">{weatherIcon(session.condition, session.night)}</span>
            <div className="leading-tight">
              <div className="font-mono text-[12px] font-semibold tabular-nums">{session.timeOfDay ?? "--:--"}</div>
              <div className="hidden text-[9px] text-white/50 sm:block">{session.condition}</div>
            </div>
            <div className="hidden text-right leading-tight sm:block">
              <div className="font-mono text-[12px] font-semibold tabular-nums text-white/85">{session.trackTemp ?? "--"}°</div>
              <div className="text-[9px] text-white/45">track</div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 sm:gap-5">
          <div className="text-right leading-none">
            <div className="font-mono text-lg font-extrabold tabular-nums sm:text-2xl">{session?.remaining ?? "--:--:--"}</div>
            <div className="text-[9px] uppercase tracking-widest text-white/45">remaining</div>
          </div>
          <div className="hidden text-right leading-none sm:block">
            <div className="font-mono text-sm font-semibold tabular-nums text-white/80">{session?.elapsed ?? "--:--:--"}</div>
            <div className="text-[9px] uppercase tracking-widest text-white/45">elapsed</div>
          </div>
        </div>
      </div>

      <div className="flag-strip h-1.5 w-full" style={{ background: `repeating-linear-gradient(135deg, ${flag.color} 0 14px, ${flag.color}99 14px 28px)` }} />
      <div className="pointer-events-auto mx-auto -mt-px w-fit rounded-b-md px-3 py-0.5 text-[10px] font-bold tracking-widest" style={{ background: flag.color, color: "#06080d" }}>
        {flag.label}
      </div>
    </div>
  );
}
