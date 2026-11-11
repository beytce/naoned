import { PASSE_EMPTY, type PasseState, passeLegal } from "@comptoirs/engine";
import { describe, expect, it } from "vitest";
import { PasseHub, type PasseTheme } from "../src/game/passe.js";

// A small bare board and a short clock: never Venice's passages.
const theme: PasseTheme = {
  rules: { fire: { thread: 0, chain: 0 }, cargo: { holds: 3, full: 3, step: 1 } },
  boards: {
    petit: { name: "Petit", width: 3, height: 3, cells: new Array(9).fill(PASSE_EMPTY), first: 1 },
  },
  duel: { moveSeconds: 15, roomMinutes: 30, lieutenant: 1 },
};
const T0 = 1_000_000;

function opened() {
  const hub = new PasseHub(theme);
  const res = hub.open("ana", "Ana", "petit", T0);
  if (!("code" in res)) throw new Error("room not opened");
  return { hub, code: res.code };
}
function started() {
  const o = opened();
  expect(o.hub.join("ben", "Ben", o.code, T0 + 1_000)).toBe("ok");
  return o;
}
const stateOf = (hub: PasseHub, who: string, code: string, now: number): PasseState => {
  const s = hub.view(who, code, now)?.state;
  if (!s) throw new Error("no game");
  return s;
};

// The duel on line of the Passe (docs/plan-passe.md P6): a room, a code, two players, a clock.
describe("a room of the Passe", () => {
  it("opens with a code of six letters and waits for the other", () => {
    const { hub, code } = opened();
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    const v = hub.view("ana", code, T0);
    expect(v?.waiting).toBe(true);
    expect(v?.state).toBeNull();
    expect(v?.you).toBe(1);
    expect(v?.deadline).toBeNull();
  });

  it("refuses a board it does not know", () => {
    const hub = new PasseHub(theme);
    expect(hub.open("ana", "Ana", "nulle-part", T0)).toEqual({ error: "no_board" });
  });

  it("starts when the second comes: the host is the thread, the clock runs", () => {
    const { hub, code } = started();
    const a = hub.view("ana", code, T0 + 1_000);
    const b = hub.view("ben", code, T0 + 1_000);
    expect(a?.waiting).toBe(false);
    expect(a?.you).toBe(1);
    expect(b?.you).toBe(2);
    expect(a?.names).toEqual({ thread: "Ana", chain: "Ben" });
    expect(a?.state?.turn).toBe(1);
    expect(a?.deadline).toBe(T0 + 1_000 + 15_000);
  });

  it("is full with two, and unknown under another code", () => {
    const { hub, code } = started();
    expect(hub.join("cleo", "Cleo", code, T0 + 2_000)).toBe("room_full");
    expect(hub.join("cleo", "Cleo", "ZZZZZZ", T0 + 2_000)).toBe("no_room");
    expect(hub.view("cleo", "ZZZZZZ", T0)).toBeNull();
    // a third only watches
    expect(hub.view("cleo", code, T0 + 2_000)?.you).toBe(0);
  });

  it("lets each play in turn only, and only a legal piece", () => {
    const { hub, code } = started();
    expect(hub.play("ben", code, { at: 4 }, T0 + 2_000)).toBe("not_your_turn");
    expect(hub.play("cleo", code, { at: 4 }, T0 + 2_000)).toBe("not_your_turn");
    expect(hub.play("ana", code, { at: 99 }, T0 + 2_000)).toBe("illegal");
    expect(hub.play("ana", code, { at: 4 }, T0 + 2_000)).toBe("ok");
    expect(hub.play("ana", code, { at: 5 }, T0 + 3_000)).toBe("not_your_turn");
    expect(hub.play("ben", code, { at: 4 }, T0 + 3_000)).toBe("illegal");
    expect(hub.play("ben", code, { at: 0 }, T0 + 3_000)).toBe("ok");
    const v = hub.view("ana", code, T0 + 3_000);
    expect(v?.last).toBe(0);
    expect(v?.deadline).toBe(T0 + 3_000 + 15_000);
  });

  it("has the lieutenant play for the one who lets the clock run out", () => {
    const { hub, code } = started();
    // 16 s after the start: Ana's 15 s are over, a piece was laid for her, and it is Ben's turn
    const s = stateOf(hub, "ben", code, T0 + 1_000 + 16_000);
    expect(s.laid).toEqual([1, 0]);
    expect(s.turn).toBe(2);
    const v = hub.view("ben", code, T0 + 1_000 + 16_000);
    expect(v?.late).toEqual({ thread: 1, chain: 0 });
    // Ben's clock started when Ana's ended, not when someone looked
    expect(v?.deadline).toBe(T0 + 1_000 + 30_000);
  });

  it("plays a whole game to its end, then refuses any piece", () => {
    const { hub, code } = started();
    let now = T0 + 2_000;
    const order: [string, number][] = [
      ["ana", 7],
      ["ben", 0],
      ["ana", 4],
      ["ben", 3],
      ["ana", 1],
    ];
    for (const [who, at] of order) {
      expect(hub.play(who, code, { at }, now)).toBe("ok");
      now += 1_000;
    }
    const v = hub.view("ana", code, now);
    expect(v?.state?.winner).toBe(1);
    expect(v?.deadline).toBeNull();
    expect(v?.cargo).toBe(3);
    expect(hub.play("ben", code, { at: 8 }, now)).toBe("over");
  });

  it("gives a return game with the sides swapped once both ask", () => {
    const { hub, code } = started();
    let now = T0 + 2_000;
    for (const [who, at] of [
      ["ana", 7],
      ["ben", 0],
      ["ana", 4],
      ["ben", 3],
      ["ana", 1],
    ] as [string, number][]) {
      hub.play(who, code, { at }, now);
      now += 1_000;
    }
    expect(hub.again("cleo", code, now)).toBe("not_seated");
    expect(hub.again("ana", code, now)).toBe("ok");
    expect(hub.view("ben", code, now)?.again).toEqual({ you: false, other: true });
    expect(hub.view("ben", code, now)?.state?.winner).toBe(1);
    expect(hub.again("ben", code, now)).toBe("ok");
    const v = hub.view("ben", code, now);
    expect(v?.round).toBe(2);
    expect(v?.you).toBe(1);
    expect(v?.names).toEqual({ thread: "Ben", chain: "Ana" });
    expect(v?.state?.winner).toBe(0);
    expect(passeLegal(v?.state as PasseState).length).toBe(9);
    expect(v?.deadline).toBe(now + 15_000);
  });

  it("cannot be asked again while the game runs", () => {
    const { hub, code } = started();
    expect(hub.again("ana", code, T0 + 2_000)).toBe("not_over");
  });

  it("closes a room left alone too long", () => {
    const { hub, code } = started();
    hub.sweep(T0 + 31 * 60_000);
    expect(hub.view("ana", code, T0 + 31 * 60_000)).toBeNull();
  });

  it("lets a player come back into the room they sit in", () => {
    const { hub, code } = started();
    expect(hub.join("ben", "Ben", code, T0 + 5_000)).toBe("ok");
    expect(hub.join("ana", "Ana", code, T0 + 5_000)).toBe("ok");
  });
});
