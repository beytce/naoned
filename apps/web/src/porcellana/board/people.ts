/**
 * The people of the board (docs/plan-carte-vivante.md, lot 1): who walks where, and why. Porcellana
 * moves nothing without a reason of the game, so each figure stands for something the house built,
 * runs or delivered: porters on the road of a workshop at work, its hands round it, men sitting by
 * the lots that wait for the harvest, builders on a site, a town's people by its size and by how
 * well it knows the house, the house's own people round its Fondaco by its level, travellers on the
 * road to a town it serves. Plain data, pure, tested (test/porcellanaPeople.test.ts); the crowd
 * (porcellana/crowd.ts) draws it.
 */
import { type BoardScene, type BoardTile, WORKSHOP_MODELS } from "./scene.js";

export type Why = "porter" | "worker" | "waiting" | "builder" | "citizen" | "house" | "traveller";

export interface Walk {
  why: Why;
  /** The way, in tiles: a tile's middle stands at its « i,j ». */
  pts: [number, number][];
  /** Round and round, or there and back. */
  mode: "loop" | "ping";
  /** Tiles a second. */
  speed: number;
  /** Where along its way it starts, 0 to 1. */
  phase: number;
  /** A crate of accent carried: on the way out only (a porter), always (a pedlar), or never. */
  load: "out" | "always" | "none";
  /** It stands at its first point, facing its second (it waits for the harvest). */
  still: boolean;
  /** Its glaze: one of three values of porcelain. */
  tone: 0 | 1 | 2;
  /** Its height against a grown man's (a child: smaller, quicker). */
  scale: number;
  /** The side of its way it keeps to, in tiles to the right of its heading. */
  lane: number;
}

/** How many people of each kind a place may have: the board stays a board, not an anthill. */
export const PEOPLE = {
  porters: 4,
  workers: 3,
  waiting: 2,
  builders: 2,
  citizens: 9,
  market: 12,
  house: 10,
  travellers: 4,
} as const;

/** A number from 0 to 1 out of whole numbers, the same at every call. */
function hash(a: number, b = 0): number {
  let x = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) | 0;
  x = Math.imul(x ^ (x >>> 13), 1274126177);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

/** A square round a point, its corners cut: the edge of a tile, walked. */
function ring(i: number, j: number, r: number, reverse = false): [number, number][] {
  const c = r * 0.3;
  const pts: [number, number][] = [
    [-r + c, -r],
    [r - c, -r],
    [r, -r + c],
    [r, r - c],
    [r - c, r],
    [-r + c, r],
    [-r, r - c],
    [-r, -r + c],
  ];
  const out = pts.map(([x, z]): [number, number] => [i + x, j + z]);
  return reverse ? out.reverse() : out;
}

const lengthOf = (pts: [number, number][]) => {
  let n = 0;
  for (let k = 1; k < pts.length; k++) {
    const a = pts[k - 1] as [number, number];
    const b = pts[k] as [number, number];
    n += Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  return n;
};

/** A way without its ends: `a` cut from its start, `b` from its end; null when nothing is left. */
export function trimmed(pts: [number, number][], a: number, b: number): [number, number][] | null {
  const total = lengthOf(pts);
  if (total - a - b < 0.12) return null;
  const at = (d: number): { p: [number, number]; k: number } => {
    let left = d;
    for (let k = 1; k < pts.length; k++) {
      const p = pts[k - 1] as [number, number];
      const q = pts[k] as [number, number];
      const seg = Math.hypot(q[0] - p[0], q[1] - p[1]);
      if (left <= seg || k === pts.length - 1) {
        const u = seg > 0 ? Math.min(1, left / seg) : 0;
        return { p: [p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u], k };
      }
      left -= seg;
    }
    return { p: pts[0] as [number, number], k: 1 };
  };
  const from = at(a);
  const to = at(total - b);
  return [from.p, ...pts.slice(from.k, to.k), to.p];
}

/** What a kind of people looks like on its way, from its own number. */
function figure(
  why: Why,
  pts: [number, number][],
  seed: number,
  n: number,
  over: Partial<Walk> = {},
): Walk {
  const r = hash(seed, n);
  const r2 = hash(seed + 7, n * 3 + 1);
  return {
    why,
    pts,
    mode: "loop",
    speed: 0.05 + r * 0.03,
    phase: r2,
    load: "none",
    still: false,
    tone: (Math.floor(r * 3) % 3) as 0 | 1 | 2,
    scale: 1 + (r2 - 0.5) * 0.16,
    lane: 0,
    ...over,
  };
}

/** The way a workshop's porters walk, in tiles: its road without its two doorsteps; null if none. */
export function portersWay(scene: BoardScene, workshop: string): [number, number][] | null {
  const size = scene.tileSize;
  const road = scene.roads.find((r) => r.from === workshop);
  return road
    ? trimmed(
        road.pts.map(([x, y]): [number, number] => [x / size - 0.5, y / size - 0.5]),
        0.34,
        0.39,
      )
    : null;
}

const workshopId = (t: BoardTile) =>
  t.place?.id.startsWith("workshop:") ? t.place.id.slice("workshop:".length) : null;

/**
 * The people of a board, at most `budget` of them: each place's people first told apart, then taken
 * one from each place in turn, so that a small device keeps someone everywhere rather than a crowd
 * in one town.
 */
export function peopleOf(scene: BoardScene, budget: number): Walk[] {
  const size = scene.tileSize;
  const toTiles = ([x, y]: [number, number]): [number, number] => [x / size - 0.5, y / size - 0.5];
  const roadFrom = new Map(scene.roads.map((r) => [r.from, r]));
  const sources: Walk[][] = [];

  for (const t of scene.tiles) {
    if (t.water || !t.model) continue;
    const seed = t.seed * 13 + 5;
    const id = workshopId(t);

    // A workshop: its hands round it and its porters on its road while it works; men sitting by
    // its crates while its lots wait for the harvest; no one while it stands idle.
    if (id && (WORKSHOP_MODELS.has(t.model) || t.model === "post")) {
      const level = t.level ?? 1;
      const own: Walk[] = [];
      if (t.running) {
        // Its porters first: on a small device, the road that carries is what must be seen.
        const way = portersWay(scene, id);
        if (way) {
          const porters = Math.min(PEOPLE.porters, 1 + Math.floor(level / 4));
          for (let n = 0; n < porters; n++)
            own.push(
              figure("porter", way, seed + 31, n, {
                mode: "ping",
                load: "out",
                lane: 0.035,
                phase: (n + hash(seed, n) * 0.5) / porters,
                speed: 0.06 + hash(seed + 3, n) * 0.02,
              }),
            );
        }
        const hands = Math.min(PEOPLE.workers, 1 + Math.floor(level / 5));
        for (let n = 0; n < hands; n++)
          own.push(figure("worker", ring(t.i, t.j, 0.39 + (n % 2) * 0.035, n % 2 === 1), seed, n));
      } else if ((t.lots ?? 0) > 0) {
        const sitting = Math.min(PEOPLE.waiting, t.lots ?? 0);
        for (let n = 0; n < sitting; n++) {
          const x = t.i - 0.12 + n * 0.09;
          own.push(
            figure(
              "waiting",
              [
                [x, t.j + 0.41],
                [x, t.j + 0.6],
              ],
              seed + 17,
              n,
              { still: true, phase: 0 },
            ),
          );
        }
      }
      if (own.length) sources.push(own);
      continue;
    }

    // A site: its builders round the scaffold.
    if (t.model === "site") {
      sources.push(
        Array.from({ length: PEOPLE.builders }, (_, n) =>
          figure("builder", ring(t.i, t.j, 0.3 + n * 0.04, n % 2 === 1), seed + 41, n, {
            load: n === 0 ? "always" : "none",
          }),
        ),
      );
      continue;
    }

    // A town: its people by its size, more of them the better it knows the house; a town the
    // house cannot serve yet keeps to itself (one soul in its streets).
    if (t.model === "town") {
      const shut = t.place?.badge?.kind === "lock";
      const n = shut ? 1 : Math.min(PEOPLE.citizens, 1 + (t.size ?? 1) + 2 * (t.loyalty ?? 0));
      sources.push(
        Array.from({ length: n }, (_, k) => {
          const child = k % 5 === 4;
          return figure(
            "citizen",
            ring(t.i, t.j, 0.405 + (k % 3) * 0.022, k % 2 === 1),
            seed + 53,
            k,
            child ? { scale: 0.68, speed: 0.11 } : {},
          );
        }),
      );
      continue;
    }

    // San Marco: the piazza fills with the house's stalls.
    if (t.model === "market") {
      const n = Math.min(PEOPLE.market, 4 + 2 * (t.stalls?.length ?? 0));
      // Round the stalls' corner of the piazza, between the campanile, the basilica and the quay.
      const piazza: [number, number][] = [
        [t.i - 0.43, t.j - 0.07],
        [t.i - 0.115, t.j - 0.07],
        [t.i - 0.115, t.j + 0.335],
        [t.i - 0.43, t.j + 0.335],
      ];
      sources.push(
        Array.from({ length: n }, (_, k) =>
          k % 3 === 0
            ? figure("citizen", ring(t.i, t.j, 0.43, k % 2 === 1), seed + 59, k)
            : figure("citizen", k % 2 ? piazza : [...piazza].reverse(), seed + 61, k, {
                load: k % 4 === 1 ? "always" : "none",
                lane: 0.012 * (k % 3),
              }),
        ),
      );
      continue;
    }

    // The Fondaco: the house's own people, one more a level; beyond the first few, they go out
    // along the road to the quay.
    if (t.model === "fondaco") {
      const n = Math.min(PEOPLE.house, 1 + (t.size ?? 1));
      const quay = roadFrom.get("depot");
      const out = quay ? trimmed(quay.pts.map(toTiles), 0.36, 0.4) : null;
      sources.push(
        Array.from({ length: n }, (_, k) =>
          out && k >= 3 && k % 2 === 1
            ? figure("house", out, seed + 67, k, {
                mode: "ping",
                lane: 0.035,
                load: k % 4 === 1 ? "out" : "none",
              })
            : figure("house", ring(t.i, t.j, 0.425 + (k % 2) * 0.03, k % 2 === 1), seed + 71, k, {
                load: k % 3 === 0 ? "always" : "none",
              }),
        ),
      );
    }
  }

  // The travellers: on the road to each town the house has served, more of them the better the
  // town knows it (a road no one was ever paid on stays empty).
  const byPlace = new Map(scene.tiles.flatMap((t) => (t.place ? [[t.place.id, t] as const] : [])));
  for (const r of scene.roads) {
    if (!r.to.startsWith("city:")) continue;
    const town = byPlace.get(r.to);
    if (!town || !(town.served ?? 0)) continue;
    const way = trimmed(r.pts.map(toTiles), 0.42, 0.44);
    if (!way) continue;
    const n = Math.min(PEOPLE.travellers, 1 + (town.loyalty ?? 0));
    sources.push(
      Array.from({ length: n }, (_, k) =>
        figure("traveller", way, town.seed * 29 + 3, k, {
          mode: "ping",
          lane: 0.04,
          load: k % 3 === 1 ? "always" : "none",
          phase: (k + hash(town.seed, k) * 0.6) / n,
        }),
      ),
    );
  }

  // One from each place in turn, up to the budget.
  const out: Walk[] = [];
  for (let k = 0; out.length < budget; k++) {
    let any = false;
    for (const s of sources) {
      const w = s[k];
      if (!w) continue;
      any = true;
      if (out.length < budget) out.push(w);
    }
    if (!any) break;
  }
  return out;
}
