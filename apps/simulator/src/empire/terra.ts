import type { Rng } from "@comptoirs/engine";
import type { House, World } from "./model.js";
import { d, takeStock } from "./world.js";

/**
 * The Terraferma's week (CADRAGE-v3 § 8) as a black box, with the game's settings
 * (`empire.terra`): odd weeks, who plays pays the entry in goods (planks) and takes Favour and
 * Seals by a rank drawn in its theatre; even weeks, the Contesa, a company with five partners or
 * more at play sets down a roster of 5, 10 or 15, its members' Seals and the winners' one more.
 * The Republic's ration costs nothing. Never ducats, never production; its share of the
 * progression is read in `terraValue`.
 */

type Tier = "signore" | "podium" | "top10" | "quarter" | "participant";

/** A rank drawn in a theatre of `n`: its tier. */
function tierOf(rng: Rng, n: number): Tier {
  const rank = rng.int(1, Math.max(1, n));
  if (rank === 1) return "signore";
  if (rank <= 3) return "podium";
  if (rank <= 10) return "top10";
  if (rank <= Math.ceil(n / 4)) return "quarter";
  return "participant";
}

function gain(w: World, h: House, favour: number, seals: number) {
  const capped = Math.min(seals, w.s.terra.sealsPerWeek);
  h.favour += favour;
  h.seals += capped;
  h.terraValue += d(favour * w.m.terra.favourValueDucats + capped * w.m.terra.sealValueDucats);
}

export function terraWeek(w: World, rng: Rng, week: number) {
  const s = w.s.terra;
  const plays = (h: House) =>
    h.awayUntil <= w.now && rng.next() * 10_000 < w.m.terra.playBps[h.activity];
  if (week % 2 === 0) {
    // The Contesa: each company's roster, the largest size its players fill.
    for (const c of w.companies) {
      const players = c.members
        .map((id) => w.houses[id])
        .filter((h): h is House => !!h && plays(h));
      const size = [...s.contesa.rosterSizes].reverse().find((n) => players.length >= n);
      if (!size) continue;
      // Two companies a theatre, as often as not: one wins.
      const won = rng.next() < 0.5;
      for (const h of players.slice(0, size)) {
        const tier = tierOf(rng, size * 2);
        gain(w, h, s.favour[tier], s.contesa.sealsPerMember + (won ? s.contesa.winnerSeals : 0));
      }
    }
    return;
  }
  const entry = Object.entries(s.entry);
  for (const h of w.houses) {
    if (!plays(h)) continue;
    if (entry.some(([g, n]) => (h.stock.get(g) ?? 0) < n)) continue;
    for (const [g, n] of entry) takeStock(h, g, n);
    const tier = tierOf(rng, s.theatreMax);
    const seals = tier === "signore" ? s.seals.signore : tier === "podium" ? s.seals.podium : 0;
    gain(w, h, s.favour[tier], seals);
  }
}
