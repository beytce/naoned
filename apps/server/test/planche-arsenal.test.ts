import { maisonUnlocks } from "@comptoirs/engine";
import { describe, expect, it } from "vitest";
import { PlancheHub, plancheTheme } from "../src/game/planche.js";

const HOUR = 3_600_000;
const T0 = Date.parse("2026-11-16T06:00:00Z");

// The Arsenal and the port on line (docs/plan-arsenal.md A3): each gesture a command of the board.
describe("the Arsenal on line", () => {
  it("builds the Arsenal, lays a ship, launches it, and mans the port", async () => {
    const theme = plancheTheme();
    const hub = new PlancheHub(theme, T0);
    const me = (await hub.view("ana", "Ca’ Ana", T0)).me ?? "";
    // A house of level 6, rich in wood and hemp (as a few weeks of play would leave it).
    const h = hub.current().doc.state.houses[me];
    if (!h || !theme.board.maison) throw new Error("no house");
    h.level = 6;
    h.caps = maisonUnlocks(theme.board.maison, 6);
    h.stock = { wood: 200, hemp: 200 };
    h.ducats += 10_000_000n;
    hub.current().doc.state.minted += 10_000_000n;
    expect(await hub.ship("ana", "galere", T0)).toBe("planche_no_arsenal");
    expect(await hub.build("ana", "arsenal", "1,0", T0)).toBe("ok");
    expect(await hub.ship("ana", "galere", T0 + HOUR)).toBe("ok");
    expect(await hub.ship("ana", "galeasse", T0 + HOUR)).toBe("planche_level");
    const v = await hub.view("ana", "Ca’ Ana", T0 + 5 * HOUR);
    expect(v.state.houses[me]?.fleet?.ships.map((x) => x.kind)).toEqual(["galere"]);
    expect(await hub.repair("ana", 1, T0 + 5 * HOUR)).toBe("planche_not_damaged");
    expect(await hub.defense("ana", "bouche", "chaine", T0 + 5 * HOUR)).toBe("ok");
    expect(await hub.defenseMove("ana", "bouche", 0, "sud", T0 + 5 * HOUR)).toBe("ok");
    const w = await hub.view("ana", "Ca’ Ana", T0 + 5 * HOUR);
    expect(w.state.houses[me]?.port).toEqual({ bouche: [], nord: [], sud: ["chaine"] });
    expect(await hub.defenseRemove("ana", "sud", 0, T0 + 5 * HOUR)).toBe("ok");
    expect(await hub.refit("ana", 1, T0 + 5 * HOUR)).toBe("ok");
    expect((await hub.view("ana", "Ca’ Ana", T0 + 5 * HOUR)).ok).toBe(true);
  });
});
