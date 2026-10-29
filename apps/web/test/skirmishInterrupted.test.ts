import { describe, expect, it } from "vitest";
import { fr } from "../src/i18n.js";

describe("a skirmish cut short by a restart", () => {
  it("is told in the same words on the bar and in the bell, in the past, promising nothing", () => {
    expect(fr.game.notices.family("skirmish_aborted", {})).toBe(fr.game.skirmish.interrupted);
    // True for good: the bell keeps it after the ranked match of the day is played.
    expect(fr.game.skirmish.interrupted).toBe(
      "Partie rapide interrompue par une maintenance : aucune Gloire, rien n'est compté ; elle n'a pas consommé votre partie classée du jour.",
    );
    expect(fr.game.skirmish.interrupted).not.toContain("reste à jouer");
  });

  it("never promises the ranked match of the day in the season's notes", () => {
    const note = fr.game.seasonNotes.items.find((n) =>
      n.includes("interrompue par une maintenance"),
    );
    expect(note).toContain("elle ne consomme pas votre partie classée du jour");
    expect(note).not.toContain("reste à jouer");
  });
});
