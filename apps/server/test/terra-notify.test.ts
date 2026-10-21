import { describe, expect, it } from "vitest";
import { pushText } from "../src/notify/texts.js";

describe("the Terraferma's notices", () => {
  it("warn of an attack, and tell the week's result", () => {
    expect(pushText("siege", { event: "terra_attacked", troops: 40 }).title).toBe(
      "Vos terres sont attaquées !",
    );
    const signore = pushText("family", {
      event: "terra_result",
      rank: 1,
      signore: true,
      influence: 20,
      decree: "dime",
      conquest: false,
    });
    expect(signore.title).toBe("Vous êtes Signore della Terraferma !");
    expect(signore.body).toContain("la Dîme de la Terraferme");
    expect(
      pushText("family", { event: "terra_result", rank: 4, signore: false, influence: 8 }).body,
    ).toBe("Vous terminez 4e (+8 d'Influence). Une nouvelle carte s'ouvre.");
  });

  it("tell the merchants of a skirmish cut short by a restart what they kept", () => {
    // The same words as the skirmish's bar and the bell (apps/web/src/i18n.ts).
    const kept = pushText("family", { event: "skirmish_aborted", ranked: true, rankedLater: true });
    expect(kept.title).toBe("Escarmouche interrompue");
    expect(kept.body).toBe(
      "Escarmouche interrompue par une maintenance : aucune Gloire, rien n'est compté ; votre partie classée du jour reste à jouer.",
    );
    // No ranked match left today (played, off the map, or past the closing hour): no promise.
    expect(
      pushText("family", { event: "skirmish_aborted", ranked: true, rankedLater: false }).body,
    ).toBe("Escarmouche interrompue par une maintenance : aucune Gloire, rien n'est compté.");
  });
});
