import { describe, expect, it } from "vitest";
import { magicLinkMail } from "../src/mail/templates.js";
import { NOTIFICATION_KINDS } from "../src/notify/notifier.js";
import { pushTextEn } from "../src/notify/texts.en.js";
import { pushText } from "../src/notify/texts.js";

/** One sample of each kind's data, and of each Terraferma or family event. */
const SAMPLES: [string, Record<string, unknown>][] = [
  ...NOTIFICATION_KINDS.map(
    (k) =>
      [k, { at: 0, arriveAt: 0, rank: 2, gain: "100", quantity: 3 }] as [
        string,
        Record<string, unknown>,
      ],
  ),
  ...[
    "terra_ducats_received",
    "terra_battle_soon",
    "terra_alliance_asked",
    "terra_alliance_made",
    "terra_alliance_broken",
    "skirmish_aborted",
    "terra_troops_received",
    "terra_result",
    "land_lost",
    "work_razed",
    "decree_share",
    "terra_attacked",
    "terra_bombarded",
  ].map(
    (event) =>
      [
        event.startsWith("terra_att") || event === "terra_bombarded" ? "siege" : "family",
        { event },
      ] as [string, Record<string, unknown>],
  ),
];

describe("the pushes and mails in English", () => {
  it("have a text for every kind the French ones have, never the French words", () => {
    for (const [kind, data] of SAMPLES) {
      const fr = pushText(kind, data, {}, 0, "fr");
      const en = pushText(kind, data, {}, 0, "en");
      expect(en).toEqual(pushTextEn(kind, data));
      // A kind the French texts know is known in English too (the fallback says "Fondaco").
      expect(en.title === "Fondaco", kind).toBe(fr.title === "Fondaco");
      expect(`${en.title} ${en.body}`, kind).not.toMatch(/[éèàç]|Vous |votre /);
    }
  });

  it("send the sign-in mail in the account's language", () => {
    const en = magicLinkMail("a@b.c", "https://x/connexion?token=t", "123456", 15, "en");
    expect(en.subject).toBe("123 456: your Fondaco sign-in code");
    expect(en.text).toContain("valid for 15 minutes");
    expect(magicLinkMail("a@b.c", "https://x", "123456", 15).subject).toContain("votre code");
  });
});
