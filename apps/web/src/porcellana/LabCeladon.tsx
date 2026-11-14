/**
 * The laboratory of the Céladon direction (?lab=celadon, docs/plan-celadon.md): an island laid out
 * for the eye, on the game's own screen. By default a small chain at work (sand and wood to glass,
 * wood to planks); `&vue=tout` lays every building of the rules, at its three levels in turn.
 * Nothing is played here: every gesture is refused.
 */
import "./porcellana.css";
import "./passe/passe.css";
import "./planche/planche.css";
import {
  ILE_FONDACO,
  type IleState,
  type IleTerrain,
  plancheInit,
  venice1450Lagune,
} from "@comptoirs/engine";
import { useMemo } from "react";
import { IleScreen } from "./ile/IleScreen.js";

const NOW = Date.UTC(2026, 10, 14, 10);
type Lay = [at: string, terrain: IleTerrain, type?: string, level?: number];

const CHAIN: Lay[] = [
  ["0,0", "rive", ILE_FONDACO],
  ["1,0", "foret", "lumber_camp", 2],
  ["2,0", "rive", "sawmill", 1],
  ["0,1", "sable", "sand_pit", 2],
  ["1,1", "rive", "glassworks", 2],
  ["2,1", "rive"],
  ["1,2", "pre"],
];

function everything(): Lay[] {
  const S = venice1450Lagune;
  const types = Object.keys(S.ile?.workshops ?? {});
  const out: Lay[] = [["0,0", "rive", ILE_FONDACO]];
  types.forEach((type, n) => {
    const k = n + 1;
    const w = S.ile?.workshops[type];
    out.push([
      `${k % 5},${Math.floor(k / 5)}`,
      w?.terrain ?? "pre",
      type,
      w?.ouvrage ? 1 : (n % 3) + 1,
    ]);
  });
  return out;
}

export default function LabCeladon() {
  const all = new URLSearchParams(window.location.search).get("vue") === "tout";
  const { setup, state, house } = useMemo(() => {
    const setup = venice1450Lagune;
    const state = plancheInit(setup, NOW);
    const house = setup.houses.find((h) => !h.robot)?.id ?? setup.houses[0]?.id ?? "";
    const tiles: IleState["tiles"] = {};
    for (const [at, terrain, type, level] of all ? everything() : CHAIN)
      tiles[at] = {
        terrain,
        ...(type ? { building: { type, level: level ?? 1, readyAt: 0, carry: 0 } } : {}),
      };
    const h = state.houses[house];
    if (h) {
      h.ile = { tiles };
      h.stock = { wood: 170, sand: 84, glass: 60, planks: 52 };
      h.ducats = 705_400n;
    }
    return { setup, state: { ...state, now: NOW }, house };
  }, [all]);
  return (
    <IleScreen
      setup={setup}
      state={state}
      house={house}
      onGesture={() => "planche_poor"}
      onBack={() => window.history.back()}
    />
  );
}
