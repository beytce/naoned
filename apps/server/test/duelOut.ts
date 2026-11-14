import type { PasseMove } from "@comptoirs/engine";
import type { DuelAsk, DuelView, PlancheHub } from "../src/game/planche.js";

/**
 * A duel against the computer played out on the hub, piece by piece (docs/plan-duels.md B1),
 * without chance: "ok" won, "duel_lost" lost (a duel stopped short is left, so lost), or the
 * refusal. An illegal piece answers "duel_illegal" and leaves the duel, lost.
 */
export async function duelOut(
  hub: PlancheHub,
  player: string,
  ask: DuelAsk,
  moves: PasseMove[],
  t: number,
): Promise<string> {
  hub.useSeeds(() => null);
  let v: DuelView | string = await hub.duelStart(player, ask, t);
  if (typeof v === "string") return v;
  for (const m of moves) {
    if (v.over) break;
    const next: DuelView | string = await hub.duelPlay(player, m, t);
    if (typeof next === "string") {
      await hub.duelQuit(player, t);
      return next;
    }
    v = next;
  }
  const end = v.over ? v : await hub.duelQuit(player, t);
  if (typeof end === "string") return end;
  if (hub.duelOf(player)) await hub.duelQuit(player, t);
  return end.won ? "ok" : "duel_lost";
}
