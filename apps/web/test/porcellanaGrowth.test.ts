import { Box3, Group, type InstancedMesh, Mesh } from "three";
import { describe, expect, it } from "vitest";
import { BURST, Burst } from "../src/porcellana/burst.js";
import { Crowd } from "../src/porcellana/crowd.js";
import { createPalette } from "../src/porcellana/materials.js";
import { domainTile, site, tierDress, tierOf } from "../src/porcellana/models/domain.js";
import { TERRAINS, terrainDress } from "../src/porcellana/models/terrain.js";
import { BOARD } from "../src/porcellana/tokens.js";

// What grows is seen (docs/plan-carte-vivante.md, lot 2), and the crowd that draws the people.
const P = createPalette();
const sound = (g: Group) => {
  let broken = 0;
  g.traverse((o) => {
    if (!(o instanceof Mesh)) return;
    const pos = o.geometry.getAttribute("position");
    for (let i = 0; i < pos.array.length; i++) if (!Number.isFinite(pos.array[i])) broken++;
  });
  return broken === 0;
};
const within = (g: Group) => {
  const box = new Box3().setFromObject(g);
  return (
    box.min.y > -0.05 &&
    Math.max(-box.min.x, box.max.x, -box.min.z, box.max.z) <= BOARD.tile / 2 + 1e-6
  );
};

describe("a workshop's tier", () => {
  it("rises a step every five levels, up to the fourth", () => {
    expect([1, 4, 5, 9, 10, 14, 15, 19, 20, 25, 40].map(tierOf)).toEqual([
      0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 4,
    ]);
    expect(tierOf(undefined)).toBe(0);
  });

  it("adds nothing before the fifth level, then more at each tier, on its tile", () => {
    expect(tierDress(P, new Group(), 0)).toBeNull();
    let meshes = 0;
    for (let tier = 1; tier <= 4; tier++) {
      const g = new Group();
      const wave = tierDress(P, g, tier);
      expect(wave).not.toBeNull();
      wave?.(1.5);
      let n = 0;
      g.traverse((o) => {
        if (o instanceof Mesh) n++;
      });
      expect(n).toBeGreaterThan(meshes);
      meshes = n;
      expect(within(g)).toBe(true);
      expect(sound(g)).toBe(true);
    }
  });
});

describe("a free tile of the house's", () => {
  it("stands on its tile whatever its seed and the Fondaco's level", () => {
    for (const casa of [1, 3, 7, 12, 20])
      for (let seed = 1; seed <= 12; seed++) {
        const b = domainTile(P, seed, casa);
        expect(within(b.group), `seed ${seed}, level ${casa}`).toBe(true);
        expect(sound(b.group)).toBe(true);
      }
  });

  it("is lived on as the Fondaco rises", () => {
    const meshes = (casa: number) => {
      let n = 0;
      for (let seed = 1; seed <= 12; seed++)
        domainTile(P, seed, casa).group.traverse((o) => {
          if (o instanceof Mesh) n++;
        });
      return n;
    };
    expect(meshes(3)).toBeGreaterThan(meshes(1));
    expect(meshes(7)).toBeGreaterThan(meshes(3));
    expect(meshes(12)).toBeGreaterThan(meshes(7));
  });

  it("keeps its middle clear for its « + », and off its roads", () => {
    const road = (x: number, z: number) => Math.abs(z) < 0.9;
    for (let seed = 1; seed <= 12; seed++) {
      const g = domainTile(P, seed, 12, road).group;
      g.updateMatrixWorld(true);
      g.traverse((o) => {
        if (!(o instanceof Mesh)) return;
        const c = new Box3().setFromObject(o).getCenter(o.position.clone());
        expect(Math.hypot(c.x, c.z), `seed ${seed}`).toBeGreaterThan(0.9);
      });
    }
  });
});

describe("a tile's land drawn", () => {
  const count = (g: Group) => {
    let n = 0;
    g.traverse((o) => {
      if (o instanceof Mesh) n++;
    });
    return n;
  };

  it("stands on its tile, each kind of its own pieces", () => {
    const seen = new Set<number>();
    for (const kind of TERRAINS)
      for (let seed = 1; seed <= 8; seed++) {
        const g = new Group();
        terrainDress(P, g, kind, { seed });
        expect(count(g), kind).toBeGreaterThan(3);
        expect(within(g), `${kind}, seed ${seed}`).toBe(true);
        expect(sound(g)).toBe(true);
        if (seed === 1) seen.add(count(g));
      }
    // No two kinds draw the same.
    expect(seen.size).toBeGreaterThan(3);
  });

  it("keeps a plot's « + » clear, wider than a free tile's middle", () => {
    for (const kind of TERRAINS)
      for (let seed = 1; seed <= 8; seed++) {
        const g = new Group();
        terrainDress(P, g, kind, { seed, sparse: true });
        g.updateMatrixWorld(true);
        g.traverse((o) => {
          if (!(o instanceof Mesh)) return;
          const b = new Box3().setFromObject(o);
          // Nothing over the plus (1.3 across): its nearest side stays off the middle.
          const nearX = Math.max(0, Math.max(b.min.x, -b.max.x));
          const nearZ = Math.max(0, Math.max(b.min.z, -b.max.z));
          expect(Math.hypot(nearX, nearZ), `${kind}, seed ${seed}`).toBeGreaterThan(0.6);
        });
      }
  });

  it("is drawn in full on a free tile of the house's, its houses kept", () => {
    for (const kind of TERRAINS) {
      const b = domainTile(P, 4, 12, () => false, kind);
      expect(within(b.group), kind).toBe(true);
      expect(count(b.group)).toBeGreaterThan(count(domainTile(P, 4, 1, () => false, kind).group));
    }
  });
});

describe("a site", () => {
  it("rises with its work", () => {
    const top = (k: number) => {
      // Its walls, not its scaffold (which stands from the first day).
      let wall = 0;
      site(P, k).group.traverse((o) => {
        if (o instanceof Mesh && o.material === P.m("wall2"))
          wall = Math.max(wall, new Box3().setFromObject(o).max.y);
      });
      return wall;
    };
    expect(top(0.3)).toBeGreaterThan(top(0));
    expect(top(0.6)).toBeGreaterThan(top(0.3));
    expect(top(0.99)).toBeGreaterThan(top(0.6));
    expect(top(1)).toBe(top(0.99));
    expect(within(site(P, 1).group)).toBe(true);
  });
});

describe("the moments", () => {
  const drawn = (b: Burst) => (b.group.children[0] as InstancedMesh).count;

  it("throws its pieces, then nothing is left", () => {
    const b = new Burst(P);
    expect(b.busy).toBe(false);
    b.dust(0, 0, 0, 10);
    b.tick(10.3);
    expect(drawn(b)).toBe(BURST.dust);
    b.petals(6, 0, 0, 10.3);
    b.coins(12, 0, 0, 10.3);
    b.tick(11);
    expect(drawn(b)).toBeGreaterThan(BURST.petals);
    b.tick(20);
    expect(b.busy).toBe(false);
    b.tick(20.1);
    expect(drawn(b)).toBe(0);
  });

  it("never holds more than its share", () => {
    const b = new Burst(P);
    for (let k = 0; k < 20; k++) b.petals(0, 0, 0, 1);
    b.tick(1.5);
    expect(drawn(b)).toBeLessThanOrEqual(BURST.capacity);
  });
});

describe("the crowd", () => {
  const walk = {
    why: "porter" as const,
    pts: [
      [0, 0],
      [1, 0],
    ] as [number, number][],
    mode: "ping" as const,
    speed: 0.1,
    phase: 0,
    load: "out" as const,
    still: false,
    tone: 0 as const,
    scale: 1,
    lane: 0,
  };
  const meshes = (c: Crowd) => c.group.children as InstancedMesh[];

  it("draws every figure in two calls, never more than its capacity", () => {
    const c = new Crowd(P, 5, false);
    expect(meshes(c)).toHaveLength(2);
    c.set(
      Array.from({ length: 9 }, () => walk),
      6,
    );
    c.tick(1, 6, () => 0);
    expect(meshes(c)[0]?.count).toBe(5);
    expect(c.size).toBe(5);
  });

  it("stays out of the way of a touch, and unseen where no tile stands", () => {
    const c = new Crowd(P, 5, false);
    c.set([walk], 6);
    c.tick(1, 6, () => null);
    const hits: unknown[] = [];
    for (const m of meshes(c)) m.raycast(null as never, hits as never);
    expect(hits).toHaveLength(0);
    const el = meshes(c)[0]?.instanceMatrix.array as Float32Array;
    // Scaled to nothing: no tile under it yet.
    expect(el[0]).toBe(0);
  });

  it("sends a file once, which is gone at the end of its way", () => {
    const c = new Crowd(P, 20, false);
    c.send(walk.pts, 3, 6, 0);
    expect(c.size).toBe(3);
    c.tick(2, 6, () => 0);
    expect(c.size).toBe(3);
    c.tick(60, 6, () => 0);
    expect(c.size).toBe(0);
  });

  it("keeps room for those sent when the crowd is full, and never sends without end", () => {
    const c = new Crowd(P, 5, false);
    c.set(
      Array.from({ length: 5 }, () => walk),
      6,
    );
    c.send(walk.pts, 3, 6, 0);
    c.tick(1, 6, () => 0);
    // The five who stay, and the three sent beside them.
    expect(meshes(c)[0]?.count).toBe(8);
    for (let k = 0; k < 20; k++) c.send(walk.pts, 5, 6, 0);
    expect(c.size).toBeLessThanOrEqual(5 + 16);
  });
});
