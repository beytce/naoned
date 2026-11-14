/**
 * What a player sees of the board (docs/plan-socle.md A1): its own house whole; of the others,
 * what shows on the board (its level, its island, its threads, its fleet at anchor, its beacon,
 * its stones, its rank), never their secrets: their ruses, the guard laid on their towers, their
 * warehouse, their relics and plans, their purse to the denier, their book, their Livre.
 *
 * Pure: the server sends this, never the board's raw state.
 */

import type { PlancheHouse, PlancheState } from "./planche.js";

const ZERO_BOOK = { sold: 0n, tollPaid: 0n, tollIn: 0n, isle: 0n };

/** Another house, as it shows on the board. */
function seen(h: PlancheHouse): PlancheHouse {
  const {
    ruses: _ruses,
    rusesDay: _day,
    relics: _relics,
    plans: _plans,
    maison: _maison,
    ...shown
  } = h;
  return {
    ...shown,
    ducats: 0n,
    stock: {},
    makeCarry: {},
    book: { ...ZERO_BOOK },
    ...(h.fleet ? { fleet: { ships: h.fleet.ships, yards: [], next: 0 } } : {}),
  };
}

/** The board as a house's player may see it (`me` empty: a watcher, who sees no house whole). */
export function plancheVue(s: PlancheState, me: string): PlancheState {
  const houses: PlancheState["houses"] = {};
  for (const [id, h] of Object.entries(s.houses)) houses[id] = id === me ? h : seen(h);
  const passages: PlancheState["passages"] = {};
  for (const [id, p] of Object.entries(s.passages)) {
    if (p.holder === me) passages[id] = p;
    else {
      const { guard: _guard, guardDay: _day, ...shown } = p;
      passages[id] = shown;
    }
  }
  const view: PlancheState = { ...s, houses, passages };
  // The Muda: what each loaded shows; what it is worth and was paid, only one's own.
  if (s.muda) {
    const mine = <T>(o: Record<string, T> | undefined) =>
      o && Object.hasOwn(o, me) ? { [me]: o[me] as T } : {};
    view.muda = {
      ...s.muda,
      worth: mine(s.muda.worth),
      ...(s.muda.paid ? { paid: mine(s.muda.paid) } : {}),
      ...(s.muda.last ? { last: { ...s.muda.last, paid: mine(s.muda.last.paid) } } : {}),
    };
  }
  return view;
}
