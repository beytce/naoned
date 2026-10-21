import { describe, expect, it } from "vitest";
import { fr } from "../src/i18n.js";

describe("a skirmish cut short by a restart", () => {
  it("is told in the same words on the bar and in the bell, the ranked match promised or not", () => {
    for (const later of [true, false])
      expect(fr.game.notices.family("skirmish_aborted", { left: later ? "1" : "" })).toBe(
        fr.game.skirmish.interrupted(later),
      );
    expect(fr.game.skirmish.interrupted(false)).toBe(
      "Escarmouche interrompue par une maintenance : aucune Gloire, rien n'est compté.",
    );
    expect(fr.game.skirmish.interrupted(true)).toBe(
      "Escarmouche interrompue par une maintenance : aucune Gloire, rien n'est compté ; votre partie classée du jour reste à jouer.",
    );
  });

  it("never promises the ranked match of the day in the season's notes", () => {
    const note = fr.game.seasonNotes.items.find((n) =>
      n.includes("interrompue par une maintenance"),
    );
    expect(note).toContain("elle ne consomme pas votre partie classée du jour");
    expect(note).not.toContain("reste à jouer");
  });
});
