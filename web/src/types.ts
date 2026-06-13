// Mirror of relay/src/types.ts — keep identical.

export type CarClass = "HYPERCAR" | "LMP2" | "LMGT3";
export type FlagState = "GREEN" | "YELLOW" | "RED" | "SC" | "FCY" | "CHEQUERED";

export interface Sectors {
  s1?: string;
  s2?: string;
  s3?: string;
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
  weather?: string;
}

export interface RaceState {
  session: Session;
  cars: Car[];
  updatedAt: number;
  source: "sim" | "replay" | "live";
}
