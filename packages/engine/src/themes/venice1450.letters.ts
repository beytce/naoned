import type { WorldSettingsInput } from "../settings.js";

/**
 * The Letter of the day of Venice (R10, docs/plan-rupture.md): a month of letters from five
 * figures — Lorenzo the postman, Faraj of Alexandria, the widow Contarini, a secretary of the
 * Senate and a Milanese without a name. Mechanics only (days, flags, what each choice pays and
 * gives, consequences); the words are the interface's (`game.letters`, same ids).
 *
 * Each day has a letter without conditions, after those that need flags, for the merchant who
 * comes in the middle of the month. Days 27 to 29 matter little: a month of 28 days skips them.
 * The last day closes the month by the merchant's choices. Ducats in deniers (the chest of the
 * day is 1 000), all under `maxDucatsPerSeason`.
 */

type Letters = NonNullable<WorldSettingsInput["letters"]>;
type Episode = Letters["episodes"][number];

/** A last letter of the month: a toast to the month, or rest. */
const ending = (id: string, sender: string, needs: string[], without: string[] = []): Episode => ({
  id,
  sender,
  last: true,
  needs,
  without,
  choices: [{ id: "toast", gain: { ducats: 300 } }, { id: "rest" }],
});

export const venice1450Letters: Letters = {
  maxDucatsPerSeason: 10_000,
  episodes: [
    {
      id: "lorenzo_hello",
      sender: "lorenzo",
      day: 0,
      choices: [
        {
          id: "tip",
          pay: { ducats: 200 },
          set: ["lorenzo_friend"],
          later: { id: "lorenzo_tip", days: 5, gain: { goods: { wine: 2 } } },
        },
        { id: "thanks" },
      ],
    },
    {
      id: "faraj_loan",
      sender: "faraj",
      day: 1,
      choices: [
        {
          id: "lend",
          pay: { ducats: 1_500 },
          set: ["faraj_lent"],
          later: {
            id: "faraj_back",
            days: 6,
            chanceBps: 7_500,
            gain: { ducats: 3_000 },
            set: ["faraj_friend"],
          },
        },
        { id: "decline", gain: { goods: { salt: 2 } }, set: ["faraj_declined"] },
      ],
    },
    {
      id: "contarini_dowry",
      sender: "contarini",
      day: 2,
      choices: [
        { id: "give", pay: { ducats: 1_000 }, set: ["contarini_ally"] },
        { id: "regret", set: ["contarini_cold"] },
      ],
    },
    {
      id: "senate_bread",
      sender: "senate",
      day: 3,
      choices: [
        { id: "give", pay: { goods: { bread: 10 } }, gain: { ducats: 800 }, set: ["senate_trust"] },
        { id: "later" },
      ],
    },
    {
      id: "spy_offer",
      sender: "spy",
      day: 4,
      choices: [
        { id: "buy", pay: { ducats: 500 }, set: ["spy_deal"] },
        { id: "burn", set: ["spy_burned"] },
      ],
    },
    {
      id: "lorenzo_gondola",
      sender: "lorenzo",
      day: 5,
      choices: [
        {
          id: "lend",
          pay: { goods: { planks: 4 } },
          set: ["lorenzo_friend"],
          later: { id: "lorenzo_fish", days: 2, gain: { goods: { bread: 8 } } },
        },
        { id: "laugh" },
      ],
    },
    {
      id: "faraj_storm",
      sender: "faraj",
      day: 6,
      needs: ["faraj_lent"],
      choices: [
        { id: "pray" },
        {
          id: "send",
          pay: { ducats: 500 },
          later: { id: "faraj_rope", days: 3, gain: { goods: { silk: 1 } } },
        },
      ],
    },
    {
      id: "faraj_market",
      sender: "faraj",
      day: 6,
      choices: [
        { id: "salt", gain: { goods: { salt: 2 } } },
        { id: "spices", gain: { goods: { spices: 1 } } },
      ],
    },
    {
      id: "senate_tax",
      sender: "senate",
      day: 7,
      choices: [
        { id: "war", gain: { ducats: 300 }, set: ["hawk"] },
        { id: "trade", gain: { ducats: 300 }, set: ["dove"] },
      ],
    },
    {
      id: "contarini_tea",
      sender: "contarini",
      day: 8,
      needs: ["contarini_ally"],
      choices: [{ id: "go", gain: { ducats: 800 }, set: ["noble_circle"] }, { id: "excuse" }],
    },
    {
      id: "contarini_cold_note",
      sender: "contarini",
      day: 8,
      choices: [
        { id: "apologize", pay: { ducats: 300 }, set: ["contarini_ally"] },
        { id: "ignore" },
      ],
    },
    {
      id: "spy_map",
      sender: "spy",
      day: 9,
      needs: ["spy_deal"],
      choices: [
        { id: "keep", set: ["spy_keep"] },
        { id: "hand", gain: { ducats: 1_000 }, set: ["spy_reported", "senate_trust"] },
      ],
    },
    {
      id: "rialto_shadow",
      sender: "lorenzo",
      day: 9,
      choices: [{ id: "warn", gain: { ducats: 200 }, set: ["vigilant"] }, { id: "ignore" }],
    },
    {
      id: "lorenzo_wedding",
      sender: "lorenzo",
      day: 10,
      choices: [
        {
          id: "wine",
          pay: { goods: { wine: 3 } },
          set: ["lorenzo_friend"],
          later: { id: "lorenzo_cake", days: 1, gain: { goods: { bread: 10 } } },
        },
        { id: "wishes" },
      ],
    },
    {
      id: "faraj_spices",
      sender: "faraj",
      day: 11,
      choices: [
        { id: "buy", pay: { ducats: 900 }, gain: { goods: { spices: 3 } } },
        { id: "decline" },
      ],
    },
    {
      id: "senate_census",
      sender: "senate",
      day: 12,
      choices: [
        { id: "honest", gain: { ducats: 400 }, set: ["honest"] },
        { id: "vague", set: ["sly"] },
      ],
    },
    {
      id: "contarini_debt",
      sender: "contarini",
      day: 13,
      needs: ["contarini_ally"],
      choices: [
        {
          id: "pay",
          pay: { ducats: 1_500 },
          later: {
            id: "contarini_repaid",
            days: 7,
            chanceBps: 8_000,
            gain: { ducats: 2_500 },
            set: ["contarini_bound"],
          },
        },
        { id: "senate", set: ["senate_trust"] },
      ],
    },
    {
      id: "contarini_gossip",
      sender: "contarini",
      day: 13,
      choices: [{ id: "listen", gain: { ducats: 200 } }, { id: "leave" }],
    },
    {
      id: "lorenzo_rialto",
      sender: "lorenzo",
      day: 14,
      choices: [
        { id: "round", pay: { ducats: 300 }, set: ["popular"] },
        { id: "work", gain: { ducats: 300 } },
      ],
    },
    {
      id: "spy_silence",
      sender: "spy",
      day: 15,
      needs: ["spy_keep"],
      without: ["spy_reported"],
      choices: [
        { id: "pay", pay: { ducats: 1_000 }, set: ["spy_paid"] },
        { id: "refuse", set: ["spy_exposed"] },
      ],
    },
    {
      id: "senate_thanks",
      sender: "senate",
      day: 15,
      needs: ["spy_reported"],
      choices: [
        { id: "accept", gain: { ducats: 1_200 } },
        { id: "modest", gain: { ducats: 400 }, set: ["senate_friend"] },
      ],
    },
    {
      id: "faraj_poem",
      sender: "faraj",
      day: 15,
      choices: [
        { id: "verse", gain: { goods: { salt: 1 } }, set: ["faraj_poet"] },
        { id: "prose" },
      ],
    },
    {
      id: "faraj_yusuf",
      sender: "faraj",
      day: 16,
      choices: [
        {
          id: "host",
          pay: { goods: { bread: 5 } },
          set: ["yusuf"],
          later: { id: "yusuf_gift", days: 5, gain: { goods: { silk: 2 } } },
        },
        { id: "inn" },
      ],
    },
    {
      id: "senate_muda",
      sender: "senate",
      day: 17,
      choices: [{ id: "promise", gain: { ducats: 300 }, set: ["senate_trust"] }, { id: "decline" }],
    },
    {
      id: "contarini_ball",
      sender: "contarini",
      day: 18,
      needs: ["contarini_ally"],
      choices: [{ id: "dance", gain: { ducats: 600 }, set: ["noble_circle"] }, { id: "excuse" }],
    },
    {
      id: "contarini_doors",
      sender: "contarini",
      day: 18,
      choices: [{ id: "gift", pay: { ducats: 500 }, set: ["contarini_ally"] }, { id: "shrug" }],
    },
    {
      id: "lorenzo_acqua",
      sender: "lorenzo",
      day: 19,
      choices: [
        { id: "help", pay: { goods: { bread: 5 } }, set: ["popular"] },
        { id: "guard", gain: { ducats: 300 }, set: ["prudent"] },
      ],
    },
    {
      id: "spy_taken",
      sender: "senate",
      day: 20,
      needs: ["spy_deal"],
      without: ["spy_reported"],
      choices: [
        { id: "confess", pay: { ducats: 1_000 }, set: ["spy_reported"] },
        { id: "deny", set: ["spy_denied"] },
      ],
    },
    {
      id: "spy_gone",
      sender: "lorenzo",
      day: 20,
      choices: [
        { id: "relief", gain: { ducats: 200 } },
        { id: "drink", pay: { ducats: 100 }, set: ["popular"] },
      ],
    },
    {
      id: "faraj_caravan",
      sender: "faraj",
      day: 21,
      choices: [
        {
          id: "invest",
          pay: { ducats: 2_000 },
          later: { id: "faraj_caravan_back", days: 5, chanceBps: 6_000, gain: { ducats: 3_500 } },
        },
        { id: "decline" },
      ],
    },
    {
      id: "senate_fire",
      sender: "senate",
      day: 22,
      choices: [
        {
          id: "planks",
          pay: { goods: { planks: 5 } },
          gain: { ducats: 500 },
          set: ["senate_trust"],
        },
        { id: "pray" },
      ],
    },
    {
      id: "contarini_lucia",
      sender: "contarini",
      day: 23,
      needs: ["contarini_ally"],
      choices: [
        { id: "toast", gain: { ducats: 1_000 } },
        { id: "gift", pay: { ducats: 300 }, set: ["noble_circle"] },
      ],
    },
    {
      id: "contarini_news",
      sender: "contarini",
      day: 23,
      choices: [{ id: "read", gain: { ducats: 200 } }, { id: "burn" }],
    },
    {
      id: "lorenzo_retire",
      sender: "lorenzo",
      day: 24,
      choices: [
        { id: "stay", pay: { ducats: 300 }, set: ["lorenzo_friend"] },
        { id: "bless", gain: { goods: { wine: 1 } } },
      ],
    },
    {
      id: "yusuf_home",
      sender: "faraj",
      day: 25,
      needs: ["yusuf"],
      choices: [
        { id: "farewell", gain: { goods: { spices: 2 } } },
        { id: "keep", set: ["yusuf_stays"] },
      ],
    },
    {
      id: "faraj_ink",
      sender: "faraj",
      day: 25,
      choices: [{ id: "reply", gain: { goods: { salt: 1 } } }, { id: "silence" }],
    },
    {
      id: "senate_book",
      sender: "senate",
      day: 26,
      needs: ["senate_trust"],
      choices: [
        { id: "accept", gain: { ducats: 1_000 }, set: ["senate_friend"] },
        { id: "decline", set: ["modest"] },
      ],
    },
    {
      id: "senate_note",
      sender: "senate",
      day: 26,
      choices: [{ id: "read", gain: { ducats: 200 } }, { id: "file" }],
    },
    {
      id: "lorenzo_masks",
      sender: "lorenzo",
      day: 27,
      choices: [{ id: "buy", pay: { ducats: 200 }, set: ["masked"] }, { id: "none" }],
    },
    {
      id: "contarini_will",
      sender: "contarini",
      day: 28,
      needs: ["contarini_ally"],
      choices: [
        { id: "thanks", gain: { ducats: 800 } },
        { id: "refuse", set: ["modest"] },
      ],
    },
    {
      id: "contarini_far",
      sender: "contarini",
      day: 28,
      choices: [{ id: "reply", gain: { ducats: 200 } }, { id: "silence" }],
    },
    {
      id: "faraj_moon",
      sender: "faraj",
      day: 29,
      choices: [{ id: "wait" }, { id: "reply", gain: { goods: { salt: 1 } } }],
    },
    // The last day: the month closed by the merchant's choices, the first that fits.
    ending("end_ten", "senate", ["spy_deal"], ["spy_reported"]),
    ending("end_two_shores", "lorenzo", ["faraj_friend", "contarini_ally"]),
    ending("end_senate", "senate", ["senate_friend"]),
    ending("end_faraj", "faraj", ["faraj_friend"]),
    ending("end_palazzo", "contarini", ["contarini_ally"]),
    ending("end_popular", "lorenzo", ["popular"]),
    ending("end_plain", "lorenzo", []),
  ],
};
