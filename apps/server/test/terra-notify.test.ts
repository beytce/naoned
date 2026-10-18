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
});
