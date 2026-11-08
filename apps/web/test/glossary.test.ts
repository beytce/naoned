import { describe, expect, it } from "vitest";
import { french } from "../src/i18n.js";

// The glossary of the publication plan (docs/plan-publication.md D1): one word for each thing,
// « tu » everywhere in the empire, nothing left of the monthly world on its screens.
function strings(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") out.push(value);
  else if (typeof value === "function") {
    // A sentence built from its arguments: read with plain stand-ins.
    try {
      const r = (value as (...a: unknown[]) => unknown)(2, 3, 4, 5);
      if (typeof r === "string") out.push(r);
    } catch {
      // A sentence that wants another shape of argument: read elsewhere.
    }
  } else if (Array.isArray(value)) for (const v of value) strings(v, out);
  else if (value && typeof value === "object")
    for (const v of Object.values(value)) strings(v, out);
  return out;
}

// The Terraferma's board in the empire speaks with the monthly world's words (`fr.game.terra`).
const empire = [...strings(french.empire), ...strings(french.game.terra)];
const front = strings([french.tagline, french.promises, french.seasonOf(new Date())]);
const all = [...empire, ...front];

describe("the empire's words", () => {
  it("says « tu », never « vous »", () => {
    const said = all.map((x) => x.replace(/rendez-vous/gi, ""));
    expect(said.filter((x) => /\b(vous|votre|vos)\b/i.test(x))).toEqual([]);
  });

  it("names the Terraferma's soldiers « troupes », never « hommes »", () => {
    expect(all.filter((x) => /\bhommes?\b/i.test(x))).toEqual([]);
  });

  it("names the Fondaco by its level, never a « Casa N », and the Market of San Marco", () => {
    expect(all.filter((x) => /\bCasa\b/.test(x))).toEqual([]);
    expect(all.filter((x) => /Dogana/.test(x))).toEqual([]);
    expect(all.filter((x) => /\bramass/i.test(x))).toEqual([]);
  });

  it("keeps nothing of the monthly world, and no placeholder unread", () => {
    expect(front.filter((x) => /saison|un mois|par mois|dort la nuit/i.test(x))).toEqual([]);
    expect(all.filter((x) => /bouton doré/.test(x))).toEqual([]);
    expect(all.filter((x) => /\{(?!(cash|p)\})[a-z]+\}/i.test(x))).toEqual([]);
  });
});
