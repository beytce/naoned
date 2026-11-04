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

describe("the motion's tokens (audit of 4 November, motion M7)", () => {
  it("say the same durations and curves in the CSS as in motion.ts", async () => {
    const { CSS_VARS } = await import("../src/motion.js");
    const root = [...CSS.matchAll(/:root \{([^}]*)\}/g)].map((m) => m[1]).join("\n");
    for (const [name, value] of Object.entries(CSS_VARS)) {
      const m = root.match(new RegExp(`${name}:\\s*([^;]+);`));
      expect(m?.[1]?.trim(), name).toBe(value);
    }
  });

  it("give a moment its time (900 ms, not an entry's)", async () => {
    const { T } = await import("../src/motion.js");
    expect(T.moment).toBeGreaterThanOrEqual(900);
    expect(T.quick).toBeLessThan(T.base);
  });

  it("bring an angle round the shortest way, whatever the frame rate", async () => {
    const { dampAngle, damp } = await import("../src/motion.js");
    const a = dampAngle(3, -3, 12, 1 / 60);
    expect(a).toBeGreaterThan(3);
    const twice = damp(damp(0, 1, 8, 1 / 120), 1, 8, 1 / 120);
    expect(twice).toBeCloseTo(damp(0, 1, 8, 1 / 60), 6);
  });
});
