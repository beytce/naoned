import { venice1450Settings } from "@comptoirs/engine/src/themes/venice1450.settings.js";
import { describe, expect, it } from "vitest";
import { MISSION_GO, MISSION_REFS, SCREEN_WORDS } from "../src/game/missionGo.js";
import { fr } from "../src/i18n.js";

const ids = (venice1450Settings.missions ?? []).map((m) => m.id);

describe("the Livre de compte's missions", () => {
  it("each have a text, and no text is left for a mission gone", () => {
    expect(ids.filter((id) => !fr.game.ledger.items[id])).toEqual([]);
    expect(Object.keys(fr.game.ledger.items).filter((id) => !ids.includes(id))).toEqual([]);
  });

  it("each lead somewhere with « Y aller »", () => {
    expect(ids.filter((id) => !MISSION_GO[id])).toEqual([]);
  });

  it("cite only the game's own words, as written in their text", () => {
    const wrong: string[] = [];
    for (const [id, words] of Object.entries(MISSION_REFS)) {
      const text = fr.game.ledger.items[id]?.[1] ?? "";
      for (const w of words) {
        if (!SCREEN_WORDS.has(w)) wrong.push(`${id}: « ${w} » is no word of the game`);
        if (!text.includes(`« ${w} »`)) wrong.push(`${id}: its text does not cite « ${w} »`);
      }
    }
    expect(wrong).toEqual([]);
  });
});
