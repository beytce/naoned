import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { NavIcon } from "../src/art/icons.js";
import { ACTION_ICONS } from "../src/game/map/actions.js";
import { Icon } from "../src/game/map/icons.js";
import { fr } from "../src/i18n.js";

describe("the panels' icons", () => {
  it("never draw one icon for two words", () => {
    const words = new Map<unknown, string[]>();
    for (const a of Object.values(ACTION_ICONS))
      words.set(a.icon, [...new Set([...(words.get(a.icon) ?? []), a.label])]);
    const shared = [...words.values()].filter((w) => w.length > 1);
    expect(shared).toEqual([]);
  });

  it("never give one word to two actions", () => {
    const labels = Object.values(ACTION_ICONS).map((a) => a.label.toLowerCase());
    expect(labels.filter((l, i) => labels.indexOf(l) !== i)).toEqual([]);
  });
});

describe("the map's icons", () => {
  it("draw each sign once: the troops, a skirmish and the bandits are three pictures", () => {
    const drawn = Object.entries(Icon).map(
      ([name, draw]) => [name, renderToStaticMarkup(createElement(draw))] as const,
    );
    const twice = drawn.filter(([, svg], i) => drawn.findIndex(([, s]) => s === svg) !== i);
    expect(twice.map(([name]) => name)).toEqual([]);
    for (const name of ["troops", "skirmish", "week", "locate"]) expect(Icon).toHaveProperty(name);
  });
});

describe("the help's icons", () => {
  it("draw one subject each, from the game's own icons", () => {
    const icons = fr.game.howTo.map((s) => s.icon);
    expect(icons.filter((x, i) => icons.indexOf(x) !== i)).toEqual([]);
    for (const icon of icons) expect(NavIcon).toHaveProperty(icon);
  });
});
