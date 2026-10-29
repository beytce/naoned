import type { Rng } from "@comptoirs/engine";
import type { World } from "./model.js";
import { d, destroy } from "./world.js";

/**
 * The Terraferma's week (CADRAGE-v3 § 8) as a black box: who plays pays the ration in goods (here
 * its price), and takes Favour and Sceaux by a drawn rank. Never production; its share of the
 * progression is read in `terraValue`.
 */
export function terraWeek(w: World, rng: Rng) {
  const t = w.m.terra;
  for (const h of w.houses) {
    if (h.awayUntil > w.now) continue;
    if (rng.next() * 10_000 >= t.playBps[h.activity]) continue;
    const ration = d(t.rationDucats);
    if (h.cash < ration) continue;
    destroy(w, h, ration, "ration");
    const favour = rng.int(t.favour[0], t.favour[1]);
    const seals = rng.int(t.seals[0], t.seals[1]);
    h.favour += favour;
    h.seals += seals;
    h.terraValue += d(favour * t.favourValueDucats + seals * t.sealValueDucats);
  }
}
