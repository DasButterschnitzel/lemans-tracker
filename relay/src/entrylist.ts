import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { dataDir } from "./paths.js";
import type { CarClass } from "./types.js";

export interface Entry {
  number: string;
  carClass: CarClass;
  team: string;
  car: string;
  manufacturer: string;
  drivers: string[];
}

interface RawEntry {
  number: string;
  class: CarClass;
  team: string;
  car: string;
  manufacturer: string;
  drivers: string[];
}

export function loadEntryList(): Entry[] {
  const raw = readFileSync(resolve(dataDir(), "entrylist-2026.json"), "utf8");
  const data = JSON.parse(raw) as { cars: RawEntry[] };
  return data.cars.map((c) => ({
    number: c.number,
    carClass: c.class,
    team: c.team,
    car: c.car,
    manufacturer: c.manufacturer,
    drivers: c.drivers,
  }));
}
