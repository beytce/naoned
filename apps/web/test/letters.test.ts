import { venice1450Settings } from "@comptoirs/engine/src/themes/venice1450.settings.js";
import { describe, expect, it } from "vitest";
import { lettersEn } from "../src/i18n.letters.en.js";
import { lettersFr } from "../src/i18n.letters.js";

const episodes = venice1450Settings.letters?.episodes ?? [];

describe("the month of letters' words (R10)", () => {
  for (const [lang, words] of [
    ["fr", lettersFr],
    ["en", lettersEn],
  ] as const) {
    it(`gives every letter, choice and consequence its words in ${lang}, none left over`, () => {
      const missing: string[] = [];
      const laters = new Set<string>();
      for (const e of episodes) {
        if (!words.senders[e.sender]) missing.push(`sender ${e.sender}`);
        const w = words.episodes[e.id];
        if (!w?.text) missing.push(e.id);
        for (const c of e.choices) {
          const [label, after] = w?.choices[c.id] ?? ["", ""];
          if (!label || !after) missing.push(`${e.id}.${c.id}`);
          if (c.later) {
            laters.add(c.later.id);
            const [came, missed] = words.followups[c.later.id] ?? ["", ""];
            if (!came) missing.push(`later ${c.later.id}`);
            if ((c.later.chanceBps ?? 10_000) < 10_000 && !missed)
              missing.push(`later ${c.later.id} missed`);
          }
        }
      }
      expect(missing).toEqual([]);
      const ids = new Set(episodes.map((e) => e.id));
      expect(Object.keys(words.episodes).filter((id) => !ids.has(id))).toEqual([]);
      expect(Object.keys(words.followups).filter((id) => !laters.has(id))).toEqual([]);
    });
  }
});
