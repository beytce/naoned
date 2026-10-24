import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Space Mono is the kickers' face (design.md): spaced capitals over a block. A line of text, a
 * figure, a badge or a tab is written in Space Grotesk or Archivo. So `font-mono` goes with
 * `uppercase`, but for the sign-in code's digits and the admin's console.
 */
const SRC = join(__dirname, "..", "src");
const ALLOWED = new Set(["App.tsx", "Admin.tsx"]);

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(join(dir, e.name)) : e.name.endsWith(".tsx") ? [join(dir, e.name)] : [],
  );
}

describe("Space Mono", () => {
  it("writes only the kickers, in capitals", () => {
    const wrong = files(SRC).flatMap((file) => {
      const name = relative(SRC, file);
      if (ALLOWED.has(name)) return [];
      return readFileSync(file, "utf8")
        .split("\n")
        .map((line, i) => [i + 1, line] as const)
        .filter(([, line]) => /\bfont-mono\b/.test(line) && !/\buppercase\b/.test(line))
        .map(([n, line]) => `${name}:${n} ${line.trim().slice(0, 80)}`);
    });
    expect(wrong).toEqual([]);
  });
});
