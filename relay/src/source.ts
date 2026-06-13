import type { RaceState } from "./types.js";

export interface RaceSource {
  readonly kind: "sim" | "replay" | "live";
  start(emit: (state: RaceState) => void): void | Promise<void>;
  stop(): void;
}
