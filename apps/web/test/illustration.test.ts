import { describe, expect, it } from "vitest";
import { artSource, casaArt } from "../src/art/Illustration.js";
import { RASTER } from "../src/art/raster.js";

describe("generated illustrations", () => {
  it("serve an image only when it was integrated", () => {
    const list = { buildings: { farm: "webp" as const }, ships: { cocca: "svg" as const } };
    expect(artSource("buildings", "farm", list)).toEqual({
      src: "/art/buildings/farm.webp",
      srcSet: "/art/buildings/farm.webp 1x, /art/buildings/farm@2x.webp 2x",
    });
    expect(artSource("ships", "cocca", list)).toEqual({ src: "/art/ships/cocca.svg" });
    expect(artSource("buildings", "mill", list)).toBeNull();
    expect(artSource("regions", "veneto", list)).toBeNull();
  });

  it("list only the families and kinds the script writes", () => {
    const families = ["buildings", "ships", "regions", "casa", "people", "world"];
    for (const [family, names] of Object.entries(RASTER)) {
      expect(families).toContain(family);
      for (const [name, kind] of Object.entries(names)) {
        expect(name).toMatch(/^[a-z0-9_-]+$/);
        expect(["webp", "svg"]).toContain(kind);
      }
    }
  });

  it("show a Casa its tier's palace", () => {
    expect([1, 3, 4, 7, 8, 11, 12, 15].map(casaArt)).toEqual([
      "casa-1",
      "casa-1",
      "casa-4",
      "casa-4",
      "casa-8",
      "casa-8",
      "casa-12",
      "casa-12",
    ]);
  });
});
