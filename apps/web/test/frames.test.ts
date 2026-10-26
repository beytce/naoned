import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const CSS = readFileSync(join(__dirname, "..", "src", "index.css"), "utf8");

describe("cards and chips (Lagune)", () => {
  it("are rounded, never cut: no clip-path left on .cut, .slab or .bevel", () => {
    expect(CSS).toMatch(/\.cut \{\s*border-radius: 1\.125rem;\s*overflow: clip;/);
    expect(CSS).toMatch(/\.slab,\s*\.bevel \{\s*border-radius: 9999px;/);
    expect(CSS).not.toMatch(/\.(cut|slab|bevel) \{\s*clip-path/);
  });
});
