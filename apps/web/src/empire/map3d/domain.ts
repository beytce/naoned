/**
 * A fondaco's domain (decision of the owner, 3 November 2026, after the map's audit): touched, the
 * camera plunges into a little scene of its own, the fondaco on its tile in the middle, its
 * workshops on the small tiles around it (a flower of nineteen, the map's own lattice), the lagoon
 * and a quiet dressing beyond. The tiles' points are the chart's, around the fondaco's: the plunge is
 * a zoom, the HTML labels lie on the 3D tiles to the pixel.
 */
import { SLOT_STEP, slotPoint } from "@comptoirs/engine";
import { HEX_SIZE } from "../../art/hexmap.js";
import { orbitOf } from "../Orbit.js";
import type { EmpirePayload } from "../types.js";

const S = { map: { hexSize: HEX_SIZE } } as Parameters<typeof slotPoint>[2];

/** The six steps from a small tile to its neighbours (chart units), in the lattice's turn. */
export const STEPS: [number, number][] = (() => {
  const [cx, cy] = slotPoint("0,0", 0, S);
  return [1, 2, 3, 4, 5, 6].map((k) => {
    const [x, y] = slotPoint("0,0", k, S);
    return [x - cx, y - cy] as [number, number];
  });
})();

/** A small tile's step across (chart units). */
export const STEP = SLOT_STEP * HEX_SIZE;

/** The tiles of the rings around a point, ring by ring (ring 0: the point itself). */
export function rings(at: [number, number], n: number): { x: number; y: number; ring: number }[] {
  const out = [{ x: at[0], y: at[1], ring: 0 }];
  for (let r = 1; r <= n; r++)
    for (let side = 0; side < 6; side++) {
      const a = STEPS[side] as [number, number];
      const b = STEPS[(side + 2) % 6] as [number, number];
      for (let j = 0; j < r; j++)
        out.push({
          x: at[0] + a[0] * r + b[0] * j,
          y: at[1] + a[1] * r + b[1] * j,
          ring: r,
        });
    }
  return out;
}

/** A tile of the domain: the fondaco's, a workshop's, a site's, the one to build on, or bare. */
export type DomainTile = {
  x: number;
  y: number;
  ring: number;
} & (
  | { kind: "fondaco" }
  | { kind: "workshop"; id: string; type: string }
  | { kind: "site"; type: string; endsAt: number }
  | { kind: "free" }
  | { kind: "land" }
  | { kind: "shore" }
);

/**
 * The domain of a fondaco (Venice's Casa, or a region's counter) at its point: the nineteen tiles,
 * the workshops on the first ring then the second (in the order of their chains, as the orbit drew
 * them), their sites, the place to build next; beyond, a ring of shore (the lagoon, a quiet dressing).
 */
export function domainOf(p: EmpirePayload, region: string, at: [number, number]): DomainTile[] {
  const { workshops, sites, free } = orbitOf(p, region);
  const tiles = rings(at, 3);
  const inner = tiles.filter((t) => t.ring >= 1 && t.ring <= 2);
  const out: DomainTile[] = [
    { ...(tiles[0] as { x: number; y: number; ring: number }), kind: "fondaco" },
  ];
  let i = 0;
  const next = () => inner[i++];
  for (const w of workshops) {
    const t = next();
    if (t) out.push({ ...t, kind: "workshop", id: w.id, type: w.type });
  }
  for (const b of sites) {
    const t = next();
    if (t) out.push({ ...t, kind: "site", type: b.workshopType ?? "", endsAt: b.endsAt });
  }
  if (free > 0) {
    const t = next();
    if (t) out.push({ ...t, kind: "free" });
  }
  for (let t = next(); t; t = next()) out.push({ ...t, kind: "land" });
  for (const t of tiles.filter((x) => x.ring === 3)) out.push({ ...t, kind: "shore" });
  return out;
}
