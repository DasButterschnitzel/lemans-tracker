import type { CarClass } from "./types";

export const CLASSES: CarClass[] = ["HYPERCAR", "LMP2", "LMGT3"];

export const CLASS_COLOR: Record<CarClass, string> = {
  HYPERCAR: "#FF2D55",
  LMP2: "#22A7FF",
  LMGT3: "#37D67A",
};

export const CLASS_SHORT: Record<CarClass, string> = {
  HYPERCAR: "HY",
  LMP2: "P2",
  LMGT3: "GT3",
};

// Manufacturer accent colours used for the marker ring / leaderboard tag.
export const MANUFACTURER_COLOR: Record<string, string> = {
  Toyota: "#EB0A1E",
  Ferrari: "#E8112D",
  Cadillac: "#C9A24B",
  BMW: "#2E9BE6",
  Alpine: "#2A6DF4",
  Peugeot: "#13E0C8",
  "Aston Martin": "#00A878",
  Genesis: "#9C7A3C",
  Oreca: "#7C8AA0",
  Porsche: "#D5D5D5",
  McLaren: "#FF8000",
  Corvette: "#F4D03F",
  Mercedes: "#16D6C6",
  Lexus: "#B2B6BC",
  Ford: "#3D7BD6",
};

export const manufacturerColor = (m: string): string => MANUFACTURER_COLOR[m] ?? "#9aa4b2";
