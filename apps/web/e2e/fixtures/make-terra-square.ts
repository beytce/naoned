// A Tuesday of 24 merchants on the Terraferma's square cells, seen by the first house: the view the
// server sends (/api/empire/terra), for the e2e of the way in (its tiles turning over).
//   pnpm --filter @comptoirs/web exec tsx e2e/fixtures/make-terra-square.ts > e2e/fixtures/terra-square.json
import {
  advanceTerra,
  newTerra,
  parseSettings,
  placeOnTerra,
  terraDistance,
  terraNeighbors,
  venice1450Settings,
} from "@comptoirs/engine";
import { labView } from "../../src/porcellana/terra/labView.js";

const START = Date.UTC(2026, 10, 9, 7, 0);
const cfg = parseSettings({
  ...venice1450Settings,
  terraferma: { ...venice1450Settings.terraferma, grid: "square" },
} as typeof venice1450Settings).terraferma;
if (!cfg) throw new Error("Venice has no Terraferma");
const s = newTerra(cfg, "e2e", 30, START);
for (let k = 0; k < 24; k++) {
  let best = -1;
  let far = -1;
  for (let c = 0; c < s.owner.length; c++) {
    if (s.owner[c] !== null || !s.map.land[c]) continue;
    if (terraNeighbors(s.map, c).some((n) => !s.map.land[n] || s.owner[n] !== null)) continue;
    const near = Math.min(
      99,
      ...s.owner.flatMap((o, j) => (o === null ? [] : [terraDistance(s.map, c, j)])),
    );
    const score = near * 10 + ((c * 2654435761) % 7);
    if (score > far) {
      far = score;
      best = c;
    }
  }
  if (best < 0) break;
  try {
    placeOnTerra(s, cfg, `house${k}`, best, START);
  } catch {
    // taken: the next one
  }
}
const now = START + 26 * 3_600_000;
advanceTerra(s, cfg, now);
process.stdout.write(JSON.stringify({ now, view: labView(s, cfg, "house0", now) }));
