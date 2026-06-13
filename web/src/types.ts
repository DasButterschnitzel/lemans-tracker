// Mirror of relay/src/types.ts — keep identical.

export type CarClass = "HYPERCAR" | "LMP2" | "LMGT3";
export type FlagState = "GREEN" | "YELLOW" | "RED" | "SC" | "FCY" | "CHEQUERED";

export interface Sectors {
  s1?: string;
  s2?: string;
  s3?: string;
}

export interface PitStop {
  lap: number;
  sec?: number;
}

export interface Car {
  number: string;
  carClass: CarClass;
  team: string;
  car: string;
  manufacturer: string;
  currentDriver: string;
  posOverall: number;
  posClass: number;
  gapLeader: string;
  gapAhead: string;
  lap: number;
  lastLap?: string;
  bestLap?: string;
  sectors?: Sectors;
  topSpeed?: number;
  kph?: number;
  inPit: boolean;
  pitStops: number;
  pitHistory?: PitStop[];
  tyreAge?: number;
  trackPos?: number;
  coord?: [number, number];
  fastest?: boolean;
}

export interface Session {
  name: string;
  flag: FlagState;
  elapsed: string;
  remaining: string;
  trackTemp?: number;
  airTemp?: number;
  weather?: string;
  condition?: string;
  timeOfDay?: string;
  night?: boolean;
}

export interface RaceState {
  session: Session;
  cars: Car[];
  updatedAt: number;
  source: "sim" | "replay" | "live";
}
