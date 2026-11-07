import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Command } from "../../src/index.js";
import { testEmpire } from "../fixture.js";
import { DAY, World, makeContext } from "../helpers.js";

// The publication plan's first criterion (docs/plan-publication.md): no input of a player makes
// the engine throw anything but a refusal, and the books still balance after the storm.
const types = [
  ...new Set(
    [
      ...readFileSync(new URL("../../src/commands.ts", import.meta.url), "utf8").matchAll(
        /case "(empire[A-Za-z]+)"/g,
      ),
    ].map((m) => m[1] as string),
  ),
].filter((t) => t !== "empireJoin" && t !== "empireContesaRoster");

const reserved = ["__proto__", "constructor", "toString"];
const strings = [
  "",
  "x".repeat(40),
  "wheat",
  "bread",
  "home",
  "padova",
  "city:padova",
  "0,0",
  "1,0",
  "-1,-1",
  "farm",
  "grow_wheat",
  "w1",
  "v1",
];
// What JSON and the server's schemas let through: whole numbers, any strings (no NaN on the wire).
const numbers = [0, 1, -1, 1e12, 2 ** 53, 3, 7, 100_000];
const numeric = new Set(["qty", "slot", "index", "x", "y", "rot", "size", "care", "path"]);
const fields = [
  "good",
  "qty",
  "region",
  "city",
  "workshopId",
  "workshopType",
  "recipe",
  "tile",
  "cell",
  "vehicleId",
  "to",
  "role",
  "staffId",
  "at",
  "module",
  "code",
  "model",
  "componentId",
  "slot",
  "index",
  "orderId",
  "stationId",
  "kind",
  "x",
  "y",
  "rot",
  "trait",
  "arte",
  "a",
  "b",
  "path",
  "requestId",
  "rarity",
  "vehicleType",
  "trade",
  "handId",
  "link",
  "size",
  "care",
  "from",
];

/** A small seeded random, so that a failure plays again. */
function rng(seed: number) {
  let x = seed;
  return () => {
    x = (x * 1_103_515_245 + 12_345) % 2_147_483_648;
    return x / 2_147_483_648;
  };
}

describe("the engine under a storm of nonsense", () => {
  it.each([7, 11, 23, 101])("only ever refuses, and its books balance (seed %i)", (seed) => {
    const w = new World(
      makeContext({ empire: { ...testEmpire, start: { capitalDucats: 5_000, workshops: [] } } }),
    );
    w.do({ type: "empireJoin", playerId: "a" });
    const pick = rng(seed);
    const one = <T>(xs: readonly T[]) => xs[Math.floor(pick() * xs.length)] as T;
    const seen = new Map<string, number>();
    for (let i = 0; i < 4_000; i++) {
      const cmd: Record<string, unknown> = { type: one(types), playerId: "a" };
      for (const f of fields) {
        if (numeric.has(f)) cmd[f] = one(numbers);
        else cmd[f] = pick() < 0.01 ? one(reserved) : one(strings);
      }
      cmd.stops = [{ city: one(strings), orderIds: [one(strings)] }];
      cmd.vehicleIds = [one(strings)];
      cmd.orderIds = [one(strings)];
      cmd.via = [[one(numbers), one(numbers)]];
      w.advance(Math.floor((pick() * DAY) / 50));
      // A refusal or a success; anything thrown fails the test, and each step checks the books.
      const res = w.try(cmd as unknown as Command);
      const key = res.ok ? "ok" : res.error;
      seen.set(key, (seen.get(key) ?? 0) + 1);
    }
    // The storm reached far into the engine: some actions went through, many kinds of refusal.
    expect(seen.get("ok") ?? 0).toBeGreaterThan(20);
    expect(seen.size).toBeGreaterThan(15);
    expect(({} as Record<string, unknown>).available).toBeUndefined();
  });
});
