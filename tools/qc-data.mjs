// Cross-checks entrylist-2026.json against the REAL bundled FP1 CSV (ground truth
// for number→team/manufacturer/class/drivers). Prints discrepancies.
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const csv = readFileSync(resolve(__dirname, "../relay/data/le-mans-2026-fp1.csv"), "utf8");
const entry = JSON.parse(readFileSync(resolve(__dirname, "../web/public/entrylist-2026.json"), "utf8"));

const lines = csv.split(/\r?\n/).filter((l) => l.trim());
const cols = lines[0].split(";").map((c) => c.trim());
const ix = (n) => cols.indexOf(n);
const C = { num: ix("NUMBER"), drv: ix("DRIVER_NAME"), cls: ix("CLASS"), team: ix("TEAM"), man: ix("MANUFACTURER") };

const real = new Map();
for (const line of lines.slice(1)) {
  const f = line.split(";");
  const num = (f[C.num] ?? "").trim();
  if (!num) continue;
  const r = real.get(num) ?? { team: "", man: "", cls: "", drivers: new Set() };
  r.team = (f[C.team] ?? "").trim();
  r.man = (f[C.man] ?? "").trim();
  r.cls = (f[C.cls] ?? "").trim();
  const d = (f[C.drv] ?? "").trim();
  if (d) r.drivers.add(d);
  real.set(num, r);
}

const last = (name) => name.trim().split(/\s+/).pop().toUpperCase().replace(/[^A-Z]/g, "");
console.log(`CSV cars: ${real.size}  JSON cars: ${entry.cars.length}\n`);

for (const car of entry.cars) {
  const r = real.get(car.number);
  if (!r) { console.log(`#${car.number}: NOT in CSV`); continue; }
  const issues = [];
  const jclass = car.class.replace("LMGT3", "LMGT3");
  if (!r.cls.toUpperCase().includes(car.class === "HYPERCAR" ? "HYPER" : car.class === "LMP2" ? "P2" : "GT3") && r.cls.toUpperCase() !== car.class)
    issues.push(`class JSON=${car.class} CSV=${r.cls}`);
  if (r.man && r.man.toUpperCase() !== car.manufacturer.toUpperCase() && !car.manufacturer.toUpperCase().includes(r.man.toUpperCase()) && !r.man.toUpperCase().includes(car.manufacturer.toUpperCase()))
    issues.push(`manuf JSON=${car.manufacturer} CSV=${r.man}`);
  const csvLast = [...r.drivers].map(last);
  const jsonLast = car.drivers.map(last);
  const missingInJson = [...r.drivers].filter((d) => !jsonLast.includes(last(d)));
  const notRunFp1 = car.drivers.filter((d) => !csvLast.includes(last(d)));
  if (missingInJson.length) issues.push(`CSV drivers NOT in JSON: ${missingInJson.join(", ")}`);
  if (issues.length) {
    console.log(`#${car.number} (${car.team})`);
    for (const i of issues) console.log(`   ⚠ ${i}`);
    console.log(`   CSV drivers: ${[...r.drivers].join(", ") || "(none ran FP1)"}`);
    console.log(`   JSON not in FP1 (ok if reserve): ${notRunFp1.join(", ") || "—"}`);
  }
}
const jsonNums = new Set(entry.cars.map((c) => c.number));
const extra = [...real.keys()].filter((n) => !jsonNums.has(n));
if (extra.length) console.log(`\nIn CSV but NOT in JSON: ${extra.join(", ")}`);
