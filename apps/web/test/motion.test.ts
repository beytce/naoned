import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(__dirname, "..", "src");
const CSS = readFileSync(join(SRC, "index.css"), "utf8");
const TAILWIND = readFileSync(join(__dirname, "..", "tailwind.config.js"), "utf8");

/** Every script of the app, read once: where a class or an animation must be used. */
function scripts(dir: string): string {
  return readdirSync(dir)
    .map((name) => {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) return scripts(path);
      return /\.tsx?$/.test(name) ? readFileSync(path, "utf8") : "";
    })
    .join("\n");
}
const CODE = scripts(SRC);

/** The CSS without its keyframes, its rules flattened (the innermost `selector { body }`). */
const KEYFRAMES = [...CSS.matchAll(/@keyframes ([\w-]+)/g)].map((m) => m[1] as string);
const flat = CSS.replace(/@keyframes [\w-]+ \{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, "");
const RULES = [...flat.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({
  selector: (m[1] as string).trim(),
  body: m[2] as string,
}));

describe("the motion (docs/design.md, Mouvement)", () => {
  it("keeps no animated class that no screen uses", () => {
    const dead = RULES.filter((r) => /animation:\s*(?!none)[\w-]/.test(r.body))
      .flatMap((r) => [...r.selector.matchAll(/\.([a-z][\w-]*)/g)].map((m) => m[1] as string))
      .filter((name) => !CODE.includes(name));
    expect([...new Set(dead)]).toEqual([]);
  });

  it("keeps no keyframes that no rule plays", () => {
    const played = RULES.map((r) => r.body).join("\n");
    expect(KEYFRAMES.filter((k) => !new RegExp(`animation[^;]*\\b${k}\\b`).test(played))).toEqual(
      [],
    );
  });

  it("keeps no Tailwind animation that no screen uses", () => {
    const block = TAILWIND.match(/animation: \{([^}]*)\}/)?.[1] ?? "";
    const keys = [...block.matchAll(/^\s*"?([\w-]+)"?:/gm)].map((m) => m[1] as string);
    expect(keys).toContain("sheet");
    expect(keys.filter((k) => !CODE.includes(`animate-${k}`))).toEqual([]);
  });
});
