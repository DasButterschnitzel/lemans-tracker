// Builds accented, proper-case driver rosters per car (ordered by DRIVER_NUMBER)
// from the real FP1 CSV and writes them into web/public/entrylist-2026.json.
// Drivers who did not run FP1 keep their existing entry-list name.
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const csvPath = resolve(__dirname, "../relay/data/le-mans-2026-fp1.csv");
const listPath = resolve(__dirname, "../web/public/entrylist-2026.json");

const PARTICLES = new Set(["de", "del", "della", "van", "von", "der", "di", "da", "dos", "du", "la", "le", "den", "ter", "ten", "bin", "al", "y"]);
const capWord = (w) => w.split("-").map((t) => (t ? t.charAt(0).toLocaleUpperCase() + t.slice(1) : t)).join("-");
export function niceName(raw) {
  const s = (raw ?? "").trim().replace(/\s+/g, " ");
  if (!s) return "";
  return s.split(" ").map((p, i) => {
    const low = p.toLocaleLowerCase();
    return i > 0 && PARTICLES.has(low) ? low : capWord(low);
  }).join(" ");
}

const csv = readFileSync(csvPath, "utf8");
const lines = csv.split(/\r?\n/).filter((l) => l.trim());
const cols = lines[0].split(";").map((c) => c.trim());
const ix = (n) => cols.indexOf(n);
const C = { num: ix("NUMBER"), dnum: ix("DRIVER_NUMBER"), name: ix("DRIVER_NAME") };

// number -> Map(driverNumber -> niceName)
const roster = new Map();
for (const line of lines.slice(1)) {
  const f = line.split(";");
  const num = (f[C.num] ?? "").trim();
  const dn = Number(f[C.dnum]);
  const nm = niceName(f[C.name]);
  if (!num || !nm || !dn) continue;
  if (!roster.has(num)) roster.set(num, new Map());
  roster.get(num).set(dn, nm);
}

const list = JSON.parse(readFileSync(listPath, "utf8"));
let fromCsv = 0, kept = 0;
const lastOf = (full) => full.split(" ").pop().toLocaleLowerCase();
for (const car of list.cars) {
  const m = roster.get(car.number);
  const ordered = m ? [...m.entries()].sort((a, b) => a[0] - b[0]).map((e) => e[1]) : [];
  const csvLast = new Set(ordered.map(lastOf));
  // Supplement with existing names whose last name didn't run FP1.
  for (const old of car.drivers) if (!csvLast.has(lastOf(old))) ordered.push(old);
  fromCsv += ordered.filter((n) => n.includes(" ")).length;
  kept += ordered.filter((n) => !n.includes(" ")).length;
  car.drivers = ordered.slice(0, 3);
}
writeFileSync(listPath, JSON.stringify(list, null, 2) + "\n");
console.log(`updated ${list.cars.length} cars · ${fromCsv} full accented names · ${kept} last-name-only (no FP1 run)`);
const partial = list.cars.filter((c) => c.drivers.some((d) => !d.includes(" ")));
for (const c of partial) console.log(`  #${c.number}: ${c.drivers.join(", ")}`);
