import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const MAP = join(__dirname, "..", "src", "game", "map");

describe("the map's HUD and panels", () => {
  it('underline no link: a quiet action is a text slab (Slab tone="text")', () => {
    const underlined = readdirSync(MAP)
      .filter((f) => f.endsWith(".tsx"))
      .flatMap((f) =>
        readFileSync(join(MAP, f), "utf8")
          .split("\n")
          .map((line, i) => [f, i + 1, line] as const)
          .filter(([, , line]) => /className=.*\bunderline\b/.test(line))
          .map(([file, n]) => `${file}:${n}`),
      );
    expect(underlined).toEqual([]);
  });
});
