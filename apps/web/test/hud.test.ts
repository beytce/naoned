import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { activeTab } from "../src/game/map/TabBar.js";
import { TABS } from "../src/game/map/actions.js";
import { fr } from "../src/i18n.js";

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

describe("the tabs at the foot of the screen", () => {
  it("are the map, the workshops, Venice, the ranking and the conquest, in that order", () => {
    expect(TABS.map((t) => t.id)).toEqual(["map", "workshops", "venice", "ranking", "conquest"]);
    expect(TABS.map((t) => t.label)).toEqual([
      fr.game.map.nav.map,
      fr.game.map.nav.workshops,
      fr.game.map.nav.venice,
      fr.game.map.nav.ranking,
      fr.game.map.nav.conquest,
    ]);
  });

  it("light the tab of the screen shown: its sheet first, then the map's layer", () => {
    expect(activeTab({ sheet: null, layer: "trade" })).toBe("map");
    expect(activeTab({ sheet: "letter", layer: "trade" })).toBe("map");
    expect(activeTab({ sheet: "workshops", layer: "trade" })).toBe("workshops");
    expect(activeTab({ sheet: "ranking", layer: "trade" })).toBe("ranking");
    expect(activeTab({ sheet: "sfida", layer: "terra" })).toBe("ranking");
    expect(activeTab({ sheet: null, layer: "terra" })).toBe("conquest");
    expect(activeTab({ sheet: null, layer: "campaign" })).toBe("conquest");
  });
});
