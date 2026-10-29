import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { d } from "../src/game/format.js";
import { unitsKept } from "../src/ui.js";

describe("a slab's capitals", () => {
  it("leave an amount's unit a small « d »", () => {
    const html = renderToStaticMarkup(<span>{unitsKept(`Acheter · ${d(15_000n)}`)}</span>);
    expect(html).toContain('<span class="normal-case">\u00a0d</span>');
    // The whole text in one span: the slab's gap never parts the amount from its unit.
    expect(html.startsWith("<span><span>Acheter · 150")).toBe(true);
    expect(html.endsWith("d</span></span></span>")).toBe(true);
  });

  it("leave a text without amount as it is", () => {
    expect(unitsKept("Partir")).toBe("Partir");
    expect(unitsKept("dans 3 jours")).toBe("dans 3 jours");
  });
});
