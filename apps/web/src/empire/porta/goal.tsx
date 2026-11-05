import { RARITY_HEX } from "./colours.js";
import { pt } from "./texts.js";
import type { BattleSnapshot, PlayerUnitView, Rarity } from "./types.js";

const isMine = (u: BattleSnapshot["units"][number]): u is PlayerUnitView =>
  "mine" in u && u.mine === true;

/**
 * The battle's goal as the player sees it (the refonte claire, lot 4, 5 November 2026; pure,
 * tested): the relics brought out through the gate, those aboard a vehicle still in the field, and
 * those still waiting in the towns, each as its rarity, the best first.
 */
export function battleGoal(battle: BattleSnapshot): {
  home: Rarity[];
  aboard: Rarity[];
  left: Rarity[];
} {
  const order: Rarity[] = ["legendary", "precious", "rare", "common"];
  const sort = (xs: Rarity[]) => [...xs].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  const mine = battle.units.filter(isMine);
  const home = mine.filter((u) => u.outcome === "exited").flatMap((u) => u.cargo);
  const aboard = mine.filter((u) => u.outcome === "in").flatMap((u) => u.cargo);
  const left = battle.cities.flatMap((c) =>
    (Object.entries(c.relics) as [Rarity, number][]).flatMap(([k, n]) =>
      Array.from({ length: n }, () => k),
    ),
  );
  return { home: sort(home), aboard: sort(aboard), left: sort(left) };
}

/**
 * The goal always in sight at the top of the battle: « Rapportez les reliques à la porte », then a
 * gem a relic: full and bright once out, ringed in lapis aboard, hollow still in a town.
 */
export function BattleGoal({ battle }: { battle: BattleSnapshot }) {
  const g = battleGoal(battle);
  const all = g.home.length + g.aboard.length + g.left.length;
  const shown = [
    ...g.home.map((r) => ({ r, s: "home" as const })),
    ...g.aboard.map((r) => ({ r, s: "aboard" as const })),
    ...g.left.map((r) => ({ r, s: "left" as const })),
  ].slice(0, 14);
  return (
    <div className="flex min-w-0 flex-col gap-1" data-battle-goal={`${g.home.length}/${all}`}>
      <p className="flex items-baseline justify-between gap-2 text-xs font-semibold text-cream">
        <span className="truncate">{pt.goal}</span>
        <span className="font-display text-sm font-extrabold tabular-nums">
          {g.home.length}/{all}
        </span>
      </p>
      <span className="flex flex-wrap gap-1" aria-hidden="true">
        {shown.map((x, i) => (
          <svg
            // biome-ignore lint/suspicious/noArrayIndexKey: gems alike
            key={i}
            viewBox="0 0 12 12"
            width="12"
            height="12"
            className={x.s === "left" ? "opacity-70" : ""}
            aria-hidden="true"
          >
            <path
              d="M6 1 L11 5 L6 11 L1 5 Z"
              fill={x.s === "left" ? "none" : RARITY_HEX[x.r]}
              stroke={x.s === "aboard" ? "rgb(var(--info))" : RARITY_HEX[x.r]}
              strokeWidth={x.s === "aboard" ? 2 : 1.4}
            />
          </svg>
        ))}
      </span>
      <p className="truncate text-[0.6875rem] text-cream-dim">
        {pt.goalLine(g.home.length, g.aboard.length, g.left.length)}
      </p>
    </div>
  );
}
