import { DENIERS_PER_DUCAT, type Deniers, applyBpsCeil } from "../money.js";
import { type EmpireHouse, MINUTE_MS, type PlayerId, SINK_ACCOUNT, cashAccount } from "../state.js";
import { type Tx, fail, transfer } from "../tx.js";
import { empireSettings, ownHouse } from "./house.js";
import type { EmpireSettings } from "./settings.js";

type Branch = EmpireSettings["knowledge"]["branches"][number];

/** A knowledge of the tree: its branch, its depth (1 for the first), whether a capstone. */
export function knowledgeOf(code: string, s: EmpireSettings) {
  for (const branch of s.knowledge.branches) {
    const i = branch.nodes.findIndex((n) => n.code === code);
    if (i >= 0) return { branch, node: branch.nodes[i], depth: i + 1, capstone: false };
    const c = branch.capstones.find((n) => n.code === code);
    if (c) return { branch, node: c, depth: branch.nodes.length + 1, capstone: true };
  }
  return null;
}

/** The places of learning a house has: one by each Casa level that opens one. */
export function learningSlots(h: EmpireHouse, s: EmpireSettings): number {
  return s.knowledge.slotsAt.filter((at) => h.casa >= at).length;
}

/** A knowledge's cost by its depth, in deniers. */
export function knowledgeCost(depth: number, s: EmpireSettings): Deniers {
  let cost = BigInt(s.knowledge.baseCostDucats) * DENIERS_PER_DUCAT;
  for (let n = 2; n <= depth; n++) cost = applyBpsCeil(cost, s.knowledge.costGrowthBps);
  return cost;
}

export function knowledgeMinutes(depth: number, s: EmpireSettings): number {
  const t = s.knowledge.minutes;
  return t[Math.min(depth, t.length) - 1] ?? 0;
}

const known = (h: EmpireHouse, code: string) =>
  (h.knowledge ?? []).includes(code) || (h.learning ?? []).some((l) => l.code === code);

/** Can it be learnt now: the knowledges before it in its branch known; for a capstone, all, and not its rival. */
function ready(h: EmpireHouse, branch: Branch, depth: number, capstone: boolean): boolean {
  const learnt = h.knowledge ?? [];
  if (capstone) return branch.nodes.every((n) => learnt.includes(n.code));
  return branch.nodes.slice(0, depth - 1).every((n) => learnt.includes(n.code));
}

/** Starts learning a knowledge at the Scuola: a place, its cost (destroyed) and its time. */
export function startLearning(tx: Tx, playerId: PlayerId, code: string): void {
  const s = empireSettings(tx.ctx);
  const h = ownHouse(tx, playerId);
  const k = knowledgeOf(code, s);
  if (!k) fail("unknown_choice");
  if (known(h, code)) fail("built");
  if (k.capstone && k.branch.capstones.some((c) => known(h, c.code))) fail("built");
  if ((h.learning ?? []).length >= learningSlots(h, s)) fail("no_build_slot");
  if (!ready(h, k.branch, k.depth, k.capstone)) fail("requirement_unmet");
  transfer(
    tx,
    cashAccount(playerId),
    SINK_ACCOUNT,
    knowledgeCost(k.depth, s),
    "empire_research",
    code,
  );
  const ms = knowledgeMinutes(k.depth, s) * MINUTE_MS;
  h.learning = [...(h.learning ?? []), { code, startedAt: tx.now, endsAt: tx.now + ms }];
}

/** The knowledges learnt by `now` join the house's. */
export function settleLearning(h: EmpireHouse, now: number): void {
  const done = (h.learning ?? []).filter((l) => l.endsAt <= now);
  if (done.length === 0) return;
  h.learning = (h.learning ?? []).filter((l) => l.endsAt > now);
  h.knowledge = [...(h.knowledge ?? []), ...done.map((l) => l.code)];
}

/** What a house's knowledge gives to an effect. */
export function knowledgeEffect(h: EmpireHouse, effect: string, s: EmpireSettings): number {
  let total = 0;
  for (const code of h.knowledge ?? []) total += knowledgeOf(code, s)?.node?.effects[effect] ?? 0;
  return total;
}
