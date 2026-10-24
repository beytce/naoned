// The Terraferma on a Thursday afternoon of a week of 40 merchants, as GET /api/game/terra and
// /api/game/terra/replay would send it to one of them: played by the simulator's merchants, then
// frozen in terra-midweek.json for the layout test (layout.mjs, step « terraferme-jeudi »).
//   cd apps/server && npx tsx ../web/e2e/fixtures/make-terra-midweek.ts
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  type TerraState,
  cellsOf,
  isNation,
  parseSettings,
  venice1450Settings,
  weekReplay,
} from "../../../../packages/engine/src/index.js";
import { terraView } from "../../../server/src/game/terra.js";
import { TERRA_START, runTerra } from "../../../simulator/src/terra.js";

const DAY = 86_400_000;
/** Thursday, 15 h. */
const DAY_SEEN = 3;
const settings = parseSettings(venice1450Settings);
const cfg = settings.terraferma;
if (!cfg) throw new Error("Venice has no Terraferma");

let snap: TerraState | null = null;
runTerra(cfg, 1, undefined, (day, s) => {
  if (day === DAY_SEEN) snap = structuredClone(s);
});
if (!snap) throw new Error("no Thursday in the week");
const s: TerraState = snap;
const now = TERRA_START + DAY_SEEN * DAY + 15 * 3_600_000;

// The merchant seen: an assiduous one, third of them by land. The layout test gives it the name of
// its own account; a third of the others are houses of the computer.
const me =
  Object.keys(s.players)
    .filter((id) => id.startsWith("active"))
    .sort((a, b) => cellsOf(s, b).length - cellsOf(s, a).length)[2] ?? "active0";
const PSEUDOS = ["Bembo", "Querini", "Zorzi", "Loredan", "Badoer", "Gritti", "Tron", "Venier"];
const names = new Map<string, { pseudo: string; crest: null; bot: boolean }>();
Object.keys(s.players).forEach((id, i) => {
  if (isNation(id)) return;
  names.set(id, {
    pseudo: id === me ? "ME" : `${PSEUDOS[i % PSEUDOS.length]}${i}`,
    crest: null,
    bot: id !== me && i % 3 === 0,
  });
});
const ctx = {
  theme: {},
  settings: { ...settings, terraferma: { ...cfg, live: true } },
  startAt: TERRA_START,
};
const terra = terraView(ctx as never, { terra: { week: 0, map: s } } as never, me, now, names);
const replay = weekReplay(s);
const out = {
  now,
  terra,
  replay: {
    startAt: s.startAt,
    holders: replay.ids.map((id) => ({
      id: isNation(id) ? null : id,
      me: id === me,
      nation: isNation(id) ? id.replace("nation:", "") : null,
      pseudo: names.get(id)?.pseudo ?? null,
    })),
    initial: replay.initial,
    steps: replay.steps,
  },
};
const file = join(dirname(fileURLToPath(import.meta.url)), "terra-midweek.json");
writeFileSync(
  file,
  `${JSON.stringify(out, (_k, v) => (typeof v === "bigint" ? v.toString() : v))}\n`,
);
console.log(
  `${file}: ${terra?.holders.length} holders, ${terra?.me?.cells} cells for the merchant`,
);
