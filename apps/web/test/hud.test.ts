import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { venice1450Settings } from "@comptoirs/engine/src/themes/venice1450.settings.js";
import { describe, expect, it } from "vitest";
import { leagueOf } from "../src/game/Sfida.js";
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
    // « Mes ateliers » up close is the Ateliers tab (refonte UX, lot 4), and its sheets too.
    expect(activeTab({ sheet: null, layer: "trade", home: true })).toBe("workshops");
    expect(activeTab({ sheet: "produce:b1", layer: "trade", home: true })).toBe("workshops");
    expect(activeTab({ sheet: "buildHere", layer: "trade" })).toBe("workshops");
    expect(activeTab({ sheet: "upgrade:b1", layer: "trade" })).toBe("workshops");
    // Venice up close is the Venise tab (refonte UX, lot 5), and the sheets of its four moons.
    expect(activeTab({ sheet: null, layer: "trade", venice: true })).toBe("venice");
    expect(activeTab({ sheet: "rialto", layer: "trade" })).toBe("venice");
    expect(activeTab({ sheet: "trade:wheat", layer: "trade" })).toBe("venice");
    expect(activeTab({ sheet: "canal", layer: "trade" })).toBe("venice");
    expect(activeTab({ sheet: "broglio", layer: "trade" })).toBe("venice");
    expect(activeTab({ sheet: "ranking", layer: "trade" })).toBe("ranking");
    expect(activeTab({ sheet: "sfida", layer: "terra" })).toBe("ranking");
    expect(activeTab({ sheet: null, layer: "terra" })).toBe("conquest");
    expect(activeTab({ sheet: null, layer: "campaign" })).toBe("conquest");
  });
});

describe("the duel's leagues", () => {
  it("number the tiers from the top: Procuratore is League 1, the newcomers' Popolano League 6", () => {
    // The dictionary's tiers in the engine's order: the league is counted from it.
    const engine = (venice1450Settings.lustre?.tiers ?? []).map((t) => t.code);
    expect(Object.keys(fr.game.lustre.tiers)).toEqual(engine);
    expect(leagueOf("popolano")).toBe("Ligue 6");
    expect(leagueOf("mercante")).toBe("Ligue 4");
    expect(leagueOf("procuratore")).toBe("Ligue 1");
  });
});
