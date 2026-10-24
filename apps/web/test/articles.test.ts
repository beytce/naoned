import { venice1450 } from "@comptoirs/engine";
import { describe, expect, it } from "vitest";
import { fr } from "../src/i18n.js";

const w = fr.game.workshop;

describe("the articles of the goods", () => {
  it("are known for every good of Venice", () => {
    const missing = venice1450.resources
      .filter((r) => w.the(r.code, r.name) === null || w.some(r.code, r.name) === null)
      .map((r) => r.code);
    expect(missing).toEqual([]);
  });

  it("agree with each good", () => {
    expect(w.the("wheat", "Blé")).toBe("le blé");
    expect(w.the("flour", "Farine")).toBe("la farine");
    expect(w.the("clay", "Argile")).toBe("l'argile");
    expect(w.the("bricks", "Briques")).toBe("les briques");
    expect(w.some("bread", "Pain")).toBe("du pain");
    expect(w.some("flour", "Farine")).toBe("de la farine");
    expect(w.some("spices", "Épices")).toBe("des épices");
    expect(fr.game.advice.company(3, "bread", "Pain")).toContain("attend du pain");
    expect(w.limitedBy(2, "flour", "Farine", 5, 2)).toContain("limité par la farine");
  });

  it("fall back to the bare name for a good not listed", () => {
    expect(w.the("unknown", "Truc")).toBeNull();
    expect(w.limitedBy(1, "unknown", "Truc", 1, 1)).toContain("limité par : truc");
  });
});
