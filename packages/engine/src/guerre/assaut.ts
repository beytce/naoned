/**
 * The assault (docs/plan-guerre.md W1; docs/audit-progression-2026-11-11/01-audit-guerre.md § 4):
 * a port has three passes, the assailant three rounds to send its ships in, and each pass that
 * falls breaks a seal. Each round the port tells what its defenses will do; the assailant lays its
 * ships; the round is played pass by pass, both sides at once. The defender's ruses are secret
 * until they play. Nothing is taken: a ship sunk comes home damaged (rule 2).
 *
 * Pure and without chance: the port, the fleet and the three placements give the whole assault,
 * which the server replays and the screen shows again.
 */

export interface AssautRules {
  manches: number;
  /** What a tower fires on one ship, a battery on every ship of its pass. */
  tower: { fire: number };
  battery: { fire: number };
  /** The hull of each defense (a chain's counts in the damage done, when given). */
  hulls: Record<string, number>;
  /** Galleys that break a chain in a round (their round is spent breaking it). */
  chainBreakers: number;
  /** The ships at anchor the ruse « renforts » brings. */
  reinforcements: { n: number; force: number; hull: number };
  /** The round the chain of the ruse rises, and the reinforcements come. */
  ruseManche: { chaine: number; renforts: number };
}

/** A ship of the assailant's fleet, with its force and hull (its level counted). */
export interface AssautFleetShip {
  id: number;
  kind: string;
  force: number;
  hull: number;
  keyword: string;
}

export type AssautRuse = "chaine" | "brulot" | "renforts";

/** A port as its master laid it: each pass's defenses, and its secret ruse. */
export interface AssautPort {
  passes: Record<string, { defenses: string[]; ruse?: AssautRuse }>;
}

interface Piece {
  hull: number;
  max: number;
}

export interface AssautPass {
  towers: Piece[];
  batteries: Piece[];
  chain: boolean;
  /** Ships at anchor on the defender's side (the reinforcements). */
  anchor: (Piece & { force: number })[];
  ruse?: AssautRuse;
  ruseDone: boolean;
  fallen: boolean;
}

export interface AssautShip {
  kind: string;
  force: number;
  hull: number;
  max: number;
  keyword: string;
  /** Its pass, or null while held back. */
  at: string | null;
  /** The order it came in: « the first ship » of a pass. */
  order: number;
  sunk?: true;
}

export type AssautEvent =
  | { manche: number; pass: string; kind: "ruse"; ruse: AssautRuse }
  | { manche: number; pass: string; kind: "burn"; ship: number; what: "chaine" | "ancre" | "rien" }
  | { manche: number; pass: string; kind: "chain"; held: boolean }
  | { manche: number; pass: string; kind: "fire"; from: string; ship: number; damage: number }
  | { manche: number; pass: string; kind: "hit"; ship: number; target: string; damage: number }
  | { manche: number; pass: string; kind: "sunk"; ship: number }
  | { manche: number; pass: string; kind: "down"; what: string }
  | { manche: number; pass: string; kind: "fallen" };

/** An event without its round and its pass (distributed over the union). */
type Told = AssautEvent extends infer E
  ? E extends AssautEvent
    ? Omit<E, "manche" | "pass">
    : never
  : never;

export interface AssautState {
  /** The round to play next (beyond the last: over). */
  manche: number;
  passes: Record<string, AssautPass>;
  ships: Record<number, AssautShip>;
  seals: number;
  /** The hull of every defense at the start, for the damage done. */
  total: number;
  entered: number;
  log: AssautEvent[];
}

const fail = (code: string): never => {
  throw new Error(code);
};

/** The assault at its start: the port as laid, the fleet held back. */
export function assautInit(
  R: AssautRules,
  port: AssautPort,
  fleet: AssautFleetShip[],
): AssautState {
  const passes: Record<string, AssautPass> = {};
  let total = 0;
  for (const [id, p] of Object.entries(port.passes)) {
    const piece = (kind: string) => {
      const max = R.hulls[kind] ?? 1;
      total += max;
      return { hull: max, max };
    };
    const chain = p.defenses.includes("chaine");
    if (chain) total += R.hulls.chaine ?? 0;
    passes[id] = {
      towers: p.defenses.filter((d) => d === "tour").map(piece),
      batteries: p.defenses.filter((d) => d === "batterie").map(piece),
      chain,
      anchor: [],
      ...(p.ruse ? { ruse: p.ruse } : {}),
      ruseDone: false,
      fallen: false,
    };
  }
  const ships: Record<number, AssautShip> = {};
  for (const x of fleet)
    ships[x.id] = {
      kind: x.kind,
      force: x.force,
      hull: x.hull,
      max: x.hull,
      keyword: x.keyword,
      at: null,
      order: 0,
    };
  return { manche: 1, passes, ships, seals: 0, total, entered: 0, log: [] };
}

const afloat = (s: AssautState, pass: string) =>
  Object.entries(s.ships)
    .filter(([, x]) => x.at === pass && !x.sunk)
    .map(([id, x]) => ({ id: Number(id), x }))
    .sort((a, b) => a.x.order - b.x.order || a.id - b.id);

export interface AssautIntent {
  kind: "tour" | "batterie" | "chaine" | "ancre";
  /** It fires on one ship, on every ship, it shuts the pass. */
  does: "fire" | "all" | "shut";
  /** Whom a tower aims at: the galley (« solide ») if there is one, else the first ship in. */
  target?: "solide" | "first";
}

/** What each pass of the port will do this round, as it tells it (its ruse is not told). */
export function assautIntents(_R: AssautRules, s: AssautState): Record<string, AssautIntent[]> {
  const solide = Object.values(s.ships).some((x) => !x.sunk && x.keyword === "solide");
  const out: Record<string, AssautIntent[]> = {};
  for (const [id, p] of Object.entries(s.passes)) {
    const list: AssautIntent[] = [];
    if (p.chain) list.push({ kind: "chaine", does: "shut" });
    for (const _ of p.towers)
      list.push({ kind: "tour", does: "fire", target: solide ? "solide" : "first" });
    for (const _ of p.batteries) list.push({ kind: "batterie", does: "all" });
    for (const _ of p.anchor) list.push({ kind: "ancre", does: "fire" });
    out[id] = list;
  }
  return out;
}

/**
 * A round: the ships laid (a ship held back may come in; a ship laid stays, but a « rapide » one
 * may change its pass), then every pass played, both sides at once.
 */
export function assautPlay(
  R: AssautRules,
  s0: AssautState,
  moves: Record<number, string>,
): AssautState {
  if (s0.manche > R.manches) return fail("assaut_over");
  const s = structuredClone(s0);
  const m = s.manche;
  for (const [key, pass] of Object.entries(moves)) {
    const x = s.ships[Number(key)];
    if (!x || !Object.hasOwn(s.passes, pass)) return fail("assaut_unknown");
    if (x.sunk) return fail("assaut_sunk");
    if (x.at === pass) continue;
    if (x.at !== null && x.keyword !== "rapide") return fail("assaut_fixed");
    if (x.at === null) {
      s.entered += 1;
      x.order = s.entered;
    }
    x.at = pass;
  }
  for (const [id, p] of Object.entries(s.passes)) playPass(R, s, id, p, m);
  s.manche = m + 1;
  return s;
}

function playPass(R: AssautRules, s: AssautState, id: string, p: AssautPass, m: number): void {
  const say = (e: Told) => s.log.push({ manche: m, pass: id, ...e } as AssautEvent);
  // The ruses that come at their round, whether or not a ship is there.
  if (!p.ruseDone && p.ruse === "chaine" && m === R.ruseManche.chaine) {
    p.ruseDone = true;
    if (!p.chain) p.chain = true;
    say({ kind: "ruse", ruse: "chaine" });
  }
  if (!p.ruseDone && p.ruse === "renforts" && m === R.ruseManche.renforts) {
    p.ruseDone = true;
    const r = R.reinforcements;
    for (let k = 0; k < r.n; k++) p.anchor.push({ force: r.force, hull: r.hull, max: r.hull });
    say({ kind: "ruse", ruse: "renforts" });
  }
  let ships = afloat(s, id);
  if (!ships.length) return;
  // The hidden fireship burns the first ship in, once.
  if (!p.ruseDone && p.ruse === "brulot") {
    p.ruseDone = true;
    const first = ships[0];
    if (first) {
      first.x.hull = 0;
      first.x.sunk = true;
      say({ kind: "ruse", ruse: "brulot" });
      say({ kind: "sunk", ship: first.id });
    }
    ships = afloat(s, id);
  }
  // The assailant's fireships: the chain, else a ship at anchor; then they are gone.
  for (const b of ships.filter((y) => y.x.keyword === "brule")) {
    let what: "chaine" | "ancre" | "rien" = "rien";
    if (p.chain) {
      p.chain = false;
      what = "chaine";
    } else if (p.anchor.length) {
      p.anchor.shift();
      what = "ancre";
    }
    b.x.sunk = true;
    say({ kind: "burn", ship: b.id, what });
    if (what !== "rien") say({ kind: "down", what });
  }
  ships = afloat(s, id);
  if (!ships.length) return;
  // The chain: enough galleys break it, spending their round; else it holds them outside.
  let blocked = false;
  if (p.chain) {
    const galleys = ships.filter((y) => y.x.keyword === "solide").length;
    if (galleys >= R.chainBreakers) {
      p.chain = false;
      say({ kind: "chain", held: false });
      say({ kind: "down", what: "chaine" });
    } else say({ kind: "chain", held: true });
    blocked = true;
  }
  // The defense fires, on the round's start (both sides at once).
  const hurt = new Map<number, number>();
  const hit = (ship: number, from: string, damage: number) => {
    hurt.set(ship, (hurt.get(ship) ?? 0) + damage);
    say({ kind: "fire", from, ship, damage });
  };
  const target = (ships.find((y) => y.x.keyword === "solide") ?? ships[0])?.id;
  const first = ships[0]?.id;
  for (const _ of p.towers) if (target !== undefined) hit(target, "tour", R.tower.fire);
  for (const _ of p.batteries) for (const y of ships) hit(y.id, "batterie", R.battery.fire);
  for (const a of p.anchor) if (first !== undefined) hit(first, "ancre", a.force);
  // The assailant fires, unless the chain held it or it spent its round on the chain.
  if (!blocked)
    for (const y of ships) {
      let left = y.x.force;
      while (left > 0) {
        const t = p.anchor[0] ?? p.towers[0] ?? p.batteries[0];
        if (!t) break;
        const what = p.anchor[0] ? "ancre" : p.towers[0] ? "tour" : "batterie";
        const mult = what === "tour" && y.x.keyword === "bombarde" && m >= 2 ? 2 : 1;
        const dealt = Math.min(left * mult, t.hull);
        t.hull -= dealt;
        left -= Math.ceil(dealt / mult);
        say({ kind: "hit", ship: y.id, target: what, damage: dealt });
        if (t.hull <= 0) {
          if (what === "ancre") p.anchor.shift();
          else if (what === "tour") p.towers.shift();
          else p.batteries.shift();
          say({ kind: "down", what });
        }
      }
    }
  // The hurt is taken, the escorts mend their pass, the ships at nothing sink.
  for (const y of ships) y.x.hull -= hurt.get(y.id) ?? 0;
  const mend = ships.filter((y) => y.x.keyword === "repare").length;
  for (const y of ships) y.x.hull = Math.min(y.x.max, y.x.hull + mend);
  for (const y of ships)
    if (y.x.hull <= 0) {
      y.x.sunk = true;
      say({ kind: "sunk", ship: y.id });
    }
  // A pass falls when nothing of it stands and a ship of the assailant is still afloat there.
  if (!p.fallen && !p.towers.length && !p.chain && !p.anchor.length && afloat(s, id).length) {
    p.fallen = true;
    s.seals += 1;
    say({ kind: "fallen" });
  }
}

export interface AssautResult {
  seals: number;
  /** What was knocked down of the port's defenses, in points of base. */
  damageBps: number;
  /** The ships that come home damaged. */
  damaged: number[];
  over: boolean;
}

export function assautResult(R: AssautRules, s: AssautState): AssautResult {
  let left = 0;
  for (const p of Object.values(s.passes)) {
    for (const t of [...p.towers, ...p.batteries]) left += Math.max(0, t.hull);
    if (p.chain) left += R.hulls.chaine ?? 0;
  }
  return {
    seals: s.seals,
    damageBps: s.total ? Math.round(((s.total - left) * 10_000) / s.total) : 0,
    damaged: Object.entries(s.ships)
      .filter(([, x]) => x.sunk)
      .map(([id]) => Number(id))
      .sort((a, b) => a - b),
    over: s.manche > R.manches,
  };
}

/** The whole assault again, from the port, the fleet and each round's placements. */
export function assautReplay(
  R: AssautRules,
  port: AssautPort,
  fleet: AssautFleetShip[],
  moves: Record<number, string>[],
): AssautState {
  let s = assautInit(R, port, fleet);
  for (const m of moves.slice(0, R.manches)) s = assautPlay(R, s, m);
  while (s.manche <= R.manches) s = assautPlay(R, s, {});
  return s;
}
