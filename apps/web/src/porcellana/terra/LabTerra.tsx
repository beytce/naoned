/**
 * The Terraferma in Porcellana's laboratory (?lab=porcellana&vue=terraferme, lot T2): a week of
 * the real engine on the square grid, Venice's settings, two dozen houses of the computer that
 * spread and strike, sped up (an hour and a half of the week a second), to see the board, the glaze
 * pouring from cell to cell and the waves. The merchant seen is the first house. Its texts are
 * examples.
 */
import {
  type TerraState,
  advanceTerra,
  cellsOf,
  isNation,
  launchFront,
  newTerra,
  parseSettings,
  placeOnTerra,
  terraDistance,
  terraNeighbors,
  venice1450Settings,
} from "@comptoirs/engine";
import { useEffect, useMemo, useRef, useState } from "react";
import { TerraScene } from "./TerraScene.js";
import { pictureOfState } from "./picture.js";

const START = Date.UTC(2026, 10, 9, 7, 0); // a Monday, 8 h in Venice
const STEP = 90 * 60_000;
const HOUSES = 24;

function setUp() {
  const cfg = parseSettings({
    ...venice1450Settings,
    terraferma: { ...venice1450Settings.terraferma, grid: "square" },
  } as typeof venice1450Settings).terraferma;
  if (!cfg) throw new Error("Venice has no Terraferma");
  const s = newTerra(cfg, "lab", HOUSES + 6, START);
  const placed: number[] = [];
  for (let k = 0; k < HOUSES; k++) {
    let best = -1;
    let far = -1;
    for (let c = 0; c < s.owner.length; c++) {
      if (s.owner[c] !== null || !s.map.land[c]) continue;
      if (terraNeighbors(s.map, c).some((n) => !s.map.land[n] || s.owner[n] !== null)) continue;
      const near = Math.min(
        99,
        ...s.owner.flatMap((o, j) => (o === null ? [] : [terraDistance(s.map, c, j)])),
      );
      // Spread out, a little by the seed of the cell.
      const score = near * 10 + ((c * 2654435761) % 7);
      if (score > far) {
        far = score;
        best = c;
      }
    }
    if (best < 0) break;
    try {
      placeOnTerra(s, cfg, `house${k}`, best, START);
      placed.push(best);
    } catch {
      // too close or taken: the next one
    }
  }
  return { cfg, s };
}

/** Each house with troops to spare strikes at the nearest cell along its border. */
function play(cfg: NonNullable<ReturnType<typeof setUp>["cfg"]>, s: TerraState, now: number) {
  for (const id of Object.keys(s.players)) {
    if (isNation(id)) continue;
    const p = s.players[id];
    if (!p || p.troops < 25 || s.fronts.some((f) => f.owner === id)) continue;
    const mine = new Set(cellsOf(s, id));
    const targets = s.owner.flatMap((o, c) =>
      o !== id && s.map.land[c] && terraNeighbors(s.map, c).some((n) => mine.has(n)) ? [c] : [],
    );
    // Free land first, then the others.
    targets.sort((a, b) => Number(s.owner[a] !== null) - Number(s.owner[b] !== null) || a - b);
    for (const aim of targets.slice(0, 4)) {
      try {
        launchFront(s, cfg, id, aim, 5_000, now);
        break;
      } catch {
        // not that one
      }
    }
  }
}

export default function LabTerra() {
  const world = useMemo(setUp, []);
  const [clock, setClock] = useState(START);
  const [running, setRunning] = useState(true);
  const [chosen, setChosen] = useState<number | null>(null);
  const tick = useRef(0);
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      setClock((c) => {
        const next = c + STEP;
        play(world.cfg, world.s, c);
        advanceTerra(world.s, world.cfg, next);
        tick.current++;
        return next;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [running, world]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: the state moves in place; the clock says when.
  const pic = useMemo(() => pictureOfState(world.s, "house0"), [world, clock]);
  const flat = new URLSearchParams(window.location.search).get("plat") === "1";
  const day = Math.floor((clock - START) / 86_400_000);
  const hour = new Date(clock + 3_600_000).getUTCHours();
  return (
    <div className="porcellana fixed inset-0" data-porcellana-lab="terraferme">
      <TerraScene
        pic={pic}
        chosen={chosen}
        onCell={setChosen}
        home={world.s.players.house0?.capital ?? null}
        townName={(code) => code.charAt(0).toUpperCase() + code.slice(1)}
        campName={(cell) => {
          const id = pic.ids[pic.owner[cell] ?? -1];
          if (!id) return null;
          if (id === "house0") return "Toi";
          if (id.startsWith("nation:")) return id.slice(7, 8).toUpperCase() + id.slice(8);
          return id === "milan" ? "Milan" : id.replace("house", "Maison ");
        }}
        flat={flat}
      />
      <div className="pc-vignette" />
      <nav className="pc-tools pc-pill" aria-label="Laboratoire">
        <a className="pc-tool" href="?lab=porcellana">
          Plateau
        </a>
        <a className="pc-tool" href="?lab=porcellana&vue=terraferme" aria-current="true">
          Terraferme
        </a>
        <span className="pc-tool">
          {["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"][day % 7]} ·{" "}
          {hour} h
        </span>
        <button
          type="button"
          className="pc-tool"
          aria-pressed={running}
          onClick={() => setRunning((r) => !r)}
        >
          {running ? "En marche" : "À l'arrêt"}
        </button>
      </nav>
    </div>
  );
}
