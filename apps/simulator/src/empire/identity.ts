import {
  type EmpireHouse,
  type EmpireWorkshop,
  applyBpsFloor,
  gainXp,
  houseEffect,
  knowledgeCost,
  knowledgeMinutes,
  learningSlots,
  staffHireCost,
  staffSlots,
  venice1450,
} from "@comptoirs/engine";
import { type Bent, DAY, type House, type World } from "./model.js";
import { destroy, market, receive } from "./world.js";

/**
 * The identity of a house (CADRAGE-v3 § 13, step 5), read by the engine's own `houseEffect` on a
 * shadow of the house: its Arte, its knowledge, its masters, its lineage. The model plays them
 * simply: an Arte for its main chain, the knowledge in its bent's order, a master per place on its
 * workshops in order, a trait a generation; the court takes the fine goods.
 */

const QUARTER = 91 * DAY;

/** The building that makes a good, to read the Arte's chains. */
const BUILDING_OF: Record<string, string> = Object.fromEntries(
  venice1450.recipes.flatMap((r) => Object.keys(r.outputs).map((g) => [g, r.building])),
);

const BRANCHES: Record<Bent, string[]> = {
  trader: ["abaco", "navigazione", "diplomazia", "arti"],
  miner: ["arti", "diplomazia", "abaco", "navigazione"],
  armourer: ["arti", "abaco", "diplomazia", "navigazione"],
  mixed: ["arti", "abaco", "navigazione", "diplomazia"],
};
const TRAITS: Record<Bent, string[]> = {
  trader: ["mercanti", "prudenti", "navigatori", "diplomatici", "artigiani"],
  miner: ["artigiani", "prudenti", "mercanti", "diplomatici", "navigatori"],
  armourer: ["artigiani", "mercanti", "prudenti", "navigatori", "diplomatici"],
  mixed: ["artigiani", "mercanti", "prudenti", "navigatori", "diplomatici"],
};

export function newIdentity(at: number): EmpireHouse {
  return {
    casa: 1,
    joinedAt: at,
    lastActionAt: at,
    workshops: [],
    builds: [],
    favour: 0,
    seals: 0,
    modules: {},
    knowledge: [],
    learning: [],
    staff: [],
    hired: 0,
    heritage: 0,
    lineage: [],
  };
}

/** The shadow, brought up to the house: its Casa, its workshops (by index) and their chains. */
function shadow(h: House): EmpireHouse {
  const id = h.ident;
  id.casa = h.casa;
  id.workshops = h.workshops.map(
    (x, i): EmpireWorkshop => ({
      id: String(i),
      type: BUILDING_OF[x.good] ?? x.good,
      recipe: "",
      level: x.level,
      job: null,
    }),
  );
  return id;
}

/** The effects read, by house: kept until its identity or its workshops change. */
const cache = new WeakMap<House, { workshops: number; values: Map<string, number> }>();

/** An effect of the house's identity, at a workshop (its index) or house-wide. */
export function identityEffect(w: World, h: House, effect: string, workshop?: number): number {
  const at = workshop === undefined || workshop < 0 ? -1 : workshop;
  let c = cache.get(h);
  if (!c || c.workshops !== h.workshops.length) {
    c = { workshops: h.workshops.length, values: new Map() };
    cache.set(h, c);
    shadow(h);
  }
  const key = `${effect}:${at}`;
  let v = c.values.get(key);
  if (v === undefined) {
    v = houseEffect(h.ident, effect, w.s, at < 0 ? undefined : { workshopId: String(at) });
    c.values.set(key, v);
  }
  return v;
}

/**
 * The neighbourhood (profondeur.md § G), as a player who orders its ring well: a workshop gets one
 * link when another of its region makes what it takes in.
 */
export function neighbourEffect(w: World, h: House, workshop: number): number {
  const ws = h.workshops[workshop];
  const recipe = ws ? w.m.recipes[ws.good] : undefined;
  if (!ws || !recipe) return 0;
  const fed = h.workshops.some((o) => o !== ws && o.region === ws.region && o.good in recipe);
  const double = 1 + Math.floor(identityEffect(w, h, "neighbour") / 10_000);
  return fed ? w.s.workshops.neighbourBps * double : 0;
}

/** Its masters grow with the hours their workshop worked (a lot about each half hour). */
export function masterWorked(w: World, h: House, workshop: number, hours: number) {
  for (const m of h.ident.staff ?? [])
    if (m.placedAt === String(workshop)) {
      const level = m.level;
      gainXp(m, Math.floor(hours * 2), w.s);
      if (m.level !== level) cache.delete(h);
    }
}

/** The fine goods made: kept for the court, the exquisite share apart. */
export function makeFine(w: World, h: House, good: string, qty: number, workshop: number): number {
  const q = Math.min(10_000, identityEffect(w, h, "quality", workshop));
  const better = Math.floor((qty * q) / 10_000);
  if (better <= 0) return 0;
  const exquisite = Math.floor((better * w.s.qualities.exquisiteShareBps) / 10_000);
  h.fine.set(`${good}:fine`, (h.fine.get(`${good}:fine`) ?? 0) + better - exquisite);
  h.fine.set(`${good}:exquisite`, (h.fine.get(`${good}:exquisite`) ?? 0) + exquisite);
  return better;
}

/** The court of Venice buys the fine goods, its daily book at the Casa's measure. */
export function sellToCourt(w: World, h: House) {
  const day = Math.floor(w.now / DAY);
  if (h.courtDay !== day) {
    h.courtDay = day;
    h.courtLeft = w.s.qualities.courtPerCasa * h.casa;
  }
  for (const [code, qty] of [...h.fine].sort((a, b) => (a[0] < b[0] ? 1 : -1))) {
    const [good = "", quality] = code.split(":");
    const n = Math.min(qty, h.courtLeft);
    if (n <= 0 || !w.markets.has(`veneto:${good}`)) continue;
    const mult = quality === "exquisite" ? w.s.qualities.exquisiteBps : w.s.qualities.fineBps;
    receive(
      w,
      h,
      applyBpsFloor(market(w, "veneto", good).ref * BigInt(n), mult),
      "court",
      "orders",
    );
    h.fine.set(code, qty - n);
    h.courtLeft -= n;
  }
}

/** The house's identity grows: what was learnt, the generations, the Arte, the knowledge, the staff. */
export function growIdentity(w: World, h: House, spendable: () => bigint) {
  const id = shadow(h);
  const before = signature(id);
  for (const l of id.learning ?? [])
    if (l.endsAt <= w.now) id.knowledge = [...(id.knowledge ?? []), l.code];
  id.learning = (id.learning ?? []).filter((l) => l.endsAt > w.now);

  // A generation a quarter: a rare member of the family joins the staff, a point of Heritage.
  const quarters = Math.floor((w.now - h.joinedAt) / QUARTER);
  while ((id.heritage ?? 0) < quarters) {
    id.heritage = (id.heritage ?? 0) + 1;
    if ((id.staff ?? []).length < staffSlots(id, w.s)) addMaster(w, h, "rare");
    const trait = TRAITS[h.bent].find((t) => !(id.lineage ?? []).includes(t));
    if (trait) id.lineage = [...(id.lineage ?? []), trait];
  }

  // The Arte: the chain it holds the most workshops of; a banker without one.
  if (!id.arte && h.casa >= w.s.arte.fromCasa) {
    const count = (b: string[]) => id.workshops.filter((x) => b.includes(x.type)).length;
    const best = [...w.s.arte.artes].sort((a, b) => count(b.buildings) - count(a.buildings))[0];
    id.arte = best && count(best.buildings) > 0 ? best.code : "banchieri";
  }

  // The knowledge, in its bent's order, the first capstone at a branch's end.
  while ((id.learning ?? []).length < learningSlots(id, w.s)) {
    const next = nextKnowledge(w, h);
    if (!next) break;
    const cost = knowledgeCost(next.depth, w.s);
    if (spendable() < cost) break;
    destroy(w, h, cost, "knowledge");
    const hours = Math.max(1, Math.ceil(knowledgeMinutes(next.depth, w.s) / 60));
    id.learning = [
      ...(id.learning ?? []),
      { code: next.code, startedAt: w.now, endsAt: w.now + hours },
    ];
  }

  // A master for each place, on its workshops in order.
  while (
    (id.staff ?? []).length < staffSlots(id, w.s) &&
    (id.staff ?? []).length < h.workshops.length
  ) {
    const cost = staffHireCost(id, w.s);
    if (spendable() < cost) break;
    destroy(w, h, cost, "staff");
    id.hired = (id.hired ?? 0) + 1;
    addMaster(w, h, "common");
  }
  if (signature(id) !== before) cache.delete(h);
}

/** What the effects read of the identity, to know when they move. */
const signature = (id: EmpireHouse) =>
  `${id.arte}:${id.knowledge?.length}:${id.lineage?.length}:${id.staff?.length}`;

function addMaster(w: World, h: House, rarity: string) {
  const staff = h.ident.staff ?? [];
  const free = h.workshops.findIndex((_, i) => !staff.some((m) => m.placedAt === String(i)));
  staff.push({
    id: String(staff.length),
    role: "master",
    rarity,
    level: 1,
    xp: 0,
    skills: [],
    ...(free >= 0 ? { placedAt: String(free), placedSince: w.now } : {}),
  });
  h.ident.staff = staff;
}

function nextKnowledge(w: World, h: House): { code: string; depth: number } | null {
  const id = h.ident;
  const known = (c: string) =>
    (id.knowledge ?? []).includes(c) || (id.learning ?? []).some((l) => l.code === c);
  for (const code of BRANCHES[h.bent]) {
    const b = w.s.knowledge.branches.find((x) => x.code === code);
    if (!b) continue;
    const i = b.nodes.findIndex((n) => !known(n.code));
    if (i >= 0) {
      if (b.nodes.slice(0, i).every((n) => (id.knowledge ?? []).includes(n.code)))
        return { code: b.nodes[i]?.code ?? "", depth: i + 1 };
      continue;
    }
    const cap = b.capstones[0];
    if (
      cap &&
      !b.capstones.some((c) => known(c.code)) &&
      b.nodes.every((n) => (id.knowledge ?? []).includes(n.code))
    )
      return { code: cap.code, depth: b.nodes.length + 1 };
  }
  return null;
}
