import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { fr } from "../src/i18n.js";

const GAME = join(__dirname, "..", "src", "game");
// The guide's own files read its texts through a short alias (`t.produce`, `c.later`).
const GUIDE = ["Coach.tsx", join("map", "HudTips.tsx")].map((f) =>
  readFileSync(join(GAME, f), "utf8"),
);

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? sources(join(dir, e.name))
      : /\.tsx?$/.test(e.name)
        ? [readFileSync(join(dir, e.name), "utf8")]
        : [],
  );
}
const ALL = sources(GAME);

/** Kept for the « Réinvestir » step of the plan (ftue-2), which reads them again. */
const KEPT = new Set(["goComptoir", "invest", "investLater"]);

describe("Lorenzo's texts", () => {
  it("are each read somewhere: no text left for a step gone", () => {
    const dead = Object.keys(fr.game.coach).filter(
      (key) =>
        !KEPT.has(key) &&
        !GUIDE.some((src) => new RegExp(`\\.${key}\\b`).test(src)) &&
        !ALL.some((src) => src.includes(`coach.${key}`)),
    );
    expect(dead).toEqual([]);
  });
});
