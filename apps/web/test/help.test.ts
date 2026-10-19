import { describe, expect, it } from "vitest";
import { fr } from "../src/i18n.js";

describe("the help", () => {
  it("states the rules as they are, never as they changed", () => {
    const history = fr.game.howTo.filter((s) =>
      /\bne\b[^.]*\bplus\b|\bn'[^.]*\bplus\b/.test(s.text),
    );
    expect(history.map((s) => s.title)).toEqual([]);
  });

  it("keeps each card short", () => {
    const long = fr.game.howTo.filter((s) => s.text.length > 320);
    expect(long.map((s) => s.title)).toEqual([]);
  });
});
