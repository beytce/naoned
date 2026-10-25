import { describe, expect, it } from "vitest";
import { chronicleLines } from "../src/game/chronicle.js";
import type { Ceremony } from "../src/game/types.js";

const ceremony: Ceremony = {
  worldId: "w",
  season: "Venise 1450 · octobre",
  rank: 3,
  players: 40,
  worth: "120000",
  turnover: "950000",
  tier: "podium",
  award: "Sénateur de la saison",
  milestone: { name: "Négociant", renown: 20 },
  renown: 40,
  titles: [],
  totalRenown: {
    points: 60,
    current: { from: 50, name: "Maison connue" },
  } as Ceremony["totalRenown"],
  podium: [],
};

describe("the season's chronicle", () => {
  it("says who, the rank among how many, the sales, the title and the renown", () => {
    const lines = chronicleLines(ceremony, "Beytce");
    expect(lines[0]).toBe("Beytce, 3e marchand sur 40");
    expect(lines.join(" ")).toContain("Négociant");
    expect(lines.join(" ")).toContain("Maison connue");
    expect(lines.join(" ")).toContain("Sénateur de la saison");
  });
});
