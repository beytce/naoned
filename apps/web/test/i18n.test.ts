import { describe, expect, it } from "vitest";
import { en } from "../src/i18n.en.js";
import { fr, french } from "../src/i18n.js";

/** Paths where English rightly differs in shape: French articles have no English counterpart. */
const SHAPED_APART = new Set([
  "game.workshop.genders",
  // The theme's French names come from the server; only the other languages list theirs.
  "themeNames.resource",
  "themeNames.building",
  "themeNames.city",
  "themeNames.region",
]);

/** Every difference of shape between the two dictionaries: a key missing, a type, a length. */
function differences(a: unknown, b: unknown, path: string, out: string[]): string[] {
  if (SHAPED_APART.has(path)) return out;
  if (typeof a !== typeof b) {
    out.push(`${path}: ${typeof a} / ${typeof b}`);
    return out;
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
      out.push(
        `${path}: ${Array.isArray(a) ? a.length : "?"} / ${Array.isArray(b) ? b.length : "?"} items`,
      );
      return out;
    }
    a.forEach((x, i) => differences(x, b[i], `${path}[${i}]`, out));
    return out;
  }
  if (typeof a === "function" && typeof b === "function") {
    if (a.length !== b.length) out.push(`${path}: ${a.length} / ${b.length} arguments`);
    return out;
  }
  if (a && typeof a === "object" && b && typeof b === "object") {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) {
      const p = path ? `${path}.${k}` : k;
      if (!(k in a)) out.push(`${p}: missing in French`);
      else if (!(k in b)) out.push(`${p}: missing in English`);
      else
        differences((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], p, out);
    }
  }
  return out;
}

describe("the English interface", () => {
  it("has every key of the French one, with the same shape", () => {
    expect(differences(french, en, "", [])).toEqual([]);
  });

  it("is not chosen outside a browser: the tests read French", () => {
    expect(fr).toBe(french);
  });

  it("keeps the Venetian names in Italian", () => {
    expect(en.game.terra.nations.mantova).toContain("Mantova");
    expect(en.game.families.lands.padova).toBe("Padova");
    expect(JSON.stringify(en)).not.toMatch(/Venise|Vérone|Padoue|Mantoue/);
  });

  it("writes ordinals the English way", async () => {
    const { ordinal } = await import("../src/i18n.en.js");
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 101, 111].map(ordinal)).toEqual([
      "1st",
      "2nd",
      "3rd",
      "4th",
      "11th",
      "12th",
      "13th",
      "21st",
      "22nd",
      "101st",
      "111th",
    ]);
  });
});
