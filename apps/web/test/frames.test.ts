import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const CSS = readFileSync(join(__dirname, "..", "src", "index.css"), "utf8");

describe("cut cards", () => {
  it("draw their border on the cut corners too, in one place for every card", () => {
    // The corner cut by .cut, and the diagonal drawn again over it: the same 14 px.
    expect(CSS).toMatch(/\.cut \{\s*clip-path: polygon\(\s*14px 0,/);
    expect(CSS).toMatch(
      /\.cut:is\(\.border[^)]*\)::before \{[^}]*top: calc\(14px - var\(--cut-bw\)\);[^}]*rotate\(-45deg\)/,
    );
    expect(CSS).toMatch(
      /\.cut:is\(\.border[^)]*\)::after \{[^}]*calc\(100% \+ var\(--cut-bw\) - 14px\)[^}]*rotate\(135deg\)/,
    );
    expect(CSS).toMatch(/border-top-color: inherit;/);
  });
});
