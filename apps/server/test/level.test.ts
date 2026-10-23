import type { WorldState } from "@comptoirs/engine";
import { describe, expect, it } from "vitest";
import { openDatabase } from "../src/db/client.js";
import { LEVEL_STEP, levelFor, levelsOf } from "../src/game/level.js";
import { testDatabase } from "./db.js";

describe("the permanent level", () => {
  it("starts at 1 and takes a step more for each level", () => {
    expect(levelFor(0)).toMatchObject({ level: 1, from: 0, to: LEVEL_STEP, progress: 0 });
    expect(levelFor(LEVEL_STEP - 1).level).toBe(1);
    expect(levelFor(LEVEL_STEP).level).toBe(2);
    // Level 3 at 1 + 2 steps, level 4 at 1 + 2 + 3 steps.
    expect(levelFor(3 * LEVEL_STEP).level).toBe(3);
    expect(levelFor(6 * LEVEL_STEP)).toMatchObject({ level: 4, from: 6 * LEVEL_STEP });
    expect(levelFor(4 * LEVEL_STEP).progress).toBeCloseTo(1 / 3);
  });
});

describe("the level of the season under way", () => {
  it("does not go back when a purchase lowers the net sales", async () => {
    const { url, drop } = await testDatabase();
    const database = openDatabase(url);
    await database.migrate();
    try {
      const id = "00000000-0000-0000-0000-000000000001";
      // 10 steps of ducats sold, then goods bought back for 2 steps.
      const sold = BigInt(10 * LEVEL_STEP * 100);
      const after = {
        turnover: { [id]: sold },
        turnoverPeak: { [id]: sold },
      } as unknown as WorldState;
      const before = (await levelsOf(database.db, after, [id])).get(id)?.level;
      const bought = {
        turnover: { [id]: sold - BigInt(2 * LEVEL_STEP * 100) },
        turnoverPeak: { [id]: sold },
      } as unknown as WorldState;
      expect((await levelsOf(database.db, bought, [id])).get(id)?.level).toBe(before);
      expect(before).toBe(levelFor(10 * LEVEL_STEP).level);
    } finally {
      await database.close();
      await drop();
    }
  });
});
