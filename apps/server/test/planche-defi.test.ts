import { venice1450Passe } from "@comptoirs/engine";
import { describe, expect, it } from "vitest";
import { PasseHub } from "../src/game/passe.js";
import { PlancheHub, plancheTheme } from "../src/game/planche.js";
import { PlancheDefis } from "../src/game/plancheDefi.js";
import type { PlancheStore } from "../src/game/plancheStore.js";

const T0 = Date.parse("2026-11-16T06:00:00Z");
const pair = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

/** A lagoon with three people, and the duel rooms of the Passe beside it. */
async function lagoon(clock: () => number) {
  const hub = new PlancheHub(plancheTheme(), T0);
  const store = { hub } as unknown as PlancheStore;
  const ana = (await hub.view("ana", "Ca’ Ana", T0)).me ?? "";
  const ben = (await hub.view("ben", "Ca’ Ben", T0)).me ?? "";
  const passe = new PasseHub(venice1450Passe);
  const told: string[][] = [];
  const defis = new PlancheDefis(passe, clock, { notify: (p) => told.push(p) });
  return { hub, store, ana, ben, passe, defis, told };
}

/** Lets the room's clock run out until its round is won, the lieutenant laying every piece. */
function playOut(passe: PasseHub, code: string, from: number): number {
  let now = from;
  for (let k = 0; k < 400; k++) {
    now += 16_000;
    if (passe.view("", code, now)?.state?.winner) return now;
  }
  throw new Error("the round never ended");
}

const settle = () => new Promise((r) => setTimeout(r, 20));

// The challenge by the thread (docs/plan-hex-commerce.md H5).
describe("the challenge by the thread", () => {
  it("is proposed to a player who is there, accepted, played twice, and moves the cote", async () => {
    const { hub, store, ana, ben, passe, defis, told } = await lagoon(() => T0);
    expect(defis.propose(store, "ana", "Ca’ Ana", ben, 0)).toBe("ok");
    expect(told).toEqual([["ben"]]);
    expect(defis.view("ben", 0).incoming).toEqual({ house: ana, name: "Ca’ Ana" });
    expect(defis.view("ana", 0).outgoing).toBe(ben);
    expect(defis.propose(store, "ana", "Ca’ Ana", ben, 0)).toBe("planche_defi_busy");
    expect(defis.answer("ben", "Ca’ Ben", true, 1_000)).toBe("ok");
    const code = defis.view("ana", 1_000).room ?? "";
    expect(code).toHaveLength(6);
    expect(defis.view("ben", 1_000).room).toBe(code);
    // The challenger is the thread of the first Passe.
    expect(passe.view("ana", code, 1_000)?.you).toBe(1);
    let now = playOut(passe, code, 1_000);
    await settle();
    expect(hub.current().doc.state.rank.duels[pair(ana, ben)]).toBe(1);
    passe.again("ana", code, now);
    passe.again("ben", code, now);
    expect(passe.view("ana", code, now)?.you).toBe(2);
    now = playOut(passe, code, now);
    await settle();
    const s = hub.current().doc.state;
    expect(s.rank.duels[pair(ana, ben)]).toBe(2);
    expect((s.houses[ana]?.rank.cote ?? 0) + (s.houses[ben]?.rank.cote ?? 0)).toBe(2 * 1_200);
    // Over: no room any more, and not again this week.
    expect(defis.view("ana", now).room).toBeUndefined();
    expect(defis.propose(store, "ben", "Ca’ Ben", ana, now)).toBe("planche_defi_week");
  });

  it("is refused without a word, lapses unanswered, and is not proposed to one who is away", async () => {
    let t = T0;
    const { store, ana, ben, defis } = await lagoon(() => t);
    expect(defis.propose(store, "ana", "Ca’ Ana", ben, 0)).toBe("ok");
    expect(defis.answer("ben", "Ca’ Ben", false, 1_000)).toBe("ok");
    expect(defis.view("ana", 1_000)).toEqual({});
    expect(defis.propose(store, "ben", "Ca’ Ben", ana, 2_000)).toBe("ok");
    expect(defis.view("ana", 200_000)).toEqual({});
    expect(defis.answer("ana", "Ca’ Ana", true, 200_000)).toBe("planche_defi_none");
    // Ten minutes without looking at the board: away.
    t = T0 + 10 * 60_000;
    expect(defis.propose(store, "ana", "Ca’ Ana", ben, 300_000)).toBe("planche_defi_absent");
    // A house of the computer cannot be challenged.
    expect(defis.propose(store, "ana", "Ca’ Ana", "h40", 300_000)).toBe("planche_not_person");
  });
});
