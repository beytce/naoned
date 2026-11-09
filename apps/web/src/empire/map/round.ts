import type { EmpirePayload } from "../types.js";

type Mine = NonNullable<EmpirePayload["view"]>["vehicles"]["mine"][number];

/** A town of the round: its orders loaded, and their pay. */
export interface RoundStop {
  city: string;
  orderIds: string[];
  pay: bigint;
}

/**
 * The round drawn by finger (the gameplay audit, 5 November 2026, P1), as the engine will load it
 * (`empireRound`; pure, tested): the vehicle docked at its fondaco, the towns touched in order; at
 * each, the orders the fondaco's stock still covers, the best paid first, while the hold has room.
 * Also which towns the finger may still go to: served by that fondaco, with an order the stock left
 * covers, not already in the round, and room aboard.
 */
export function planRound(
  p: EmpirePayload,
  vehicleId: string,
  cities: string[],
): { vehicle: Mine | null; stops: RoundStop[]; room: number; pay: bigint; open: string[] } {
  const view = p.view;
  const v = view?.vehicles.mine.find((x) => x.id === vehicleId) ?? null;
  const empty = { vehicle: v, stops: [], room: 0, pay: 0n, open: [] };
  if (!view || !v || !docked(p, v)) return empty;
  const post = v.at;
  const store = view.stores.find((s) => s.post === post)?.goods ?? {};
  const left = new Map<string, number>(Object.entries(store));
  let room = v.capacity - v.loads.length;
  const byPay = (a: { pay: string }, b: { pay: string }) =>
    BigInt(b.pay) > BigInt(a.pay) ? 1 : BigInt(b.pay) < BigInt(a.pay) ? -1 : 0;
  // The Campo is a stop like a town (the supply by road): its orders, paid nothing.
  const towns = [
    ...view.orders,
    ...(view.campo && view.campo.orders.length > 0
      ? [
          {
            city: "campo",
            posts: view.campo.posts,
            orders: view.campo.orders.map((o) => ({ ...o, city: "campo", pay: "0" })),
          },
        ]
      : []),
  ];
  const serves = (city: string) =>
    towns.find((o) => o.city === city && (o.posts ?? []).includes(post));
  const stops: RoundStop[] = [];
  for (const city of cities) {
    const at = serves(city);
    if (!at || stops.some((s) => s.city === city)) continue;
    const ids: string[] = [];
    let pay = 0n;
    for (const o of [...at.orders].sort(byPay)) {
      if (room <= 0) break;
      const have = left.get(o.good) ?? 0;
      if (have < o.qty) continue;
      left.set(o.good, have - o.qty);
      ids.push(o.id);
      pay += BigInt(o.pay);
      room--;
    }
    if (ids.length > 0) stops.push({ city, orderIds: ids, pay });
  }
  const open =
    room <= 0
      ? []
      : towns
          .filter(
            (at) =>
              (at.posts ?? []).includes(post) &&
              !stops.some((s) => s.city === at.city) &&
              at.orders.some((o) => (left.get(o.good) ?? 0) >= o.qty),
          )
          .map((at) => at.city);
  return { vehicle: v, stops, room, pay: stops.reduce((n, s) => n + s.pay, 0n), open };
}

/** A vehicle standing at a fondaco, free to leave: one the finger may take. */
export function docked(p: EmpirePayload, v: Mine): boolean {
  const posts = p.view?.stores.map((s) => s.post) ?? [];
  return (
    v.legs.length === 0 &&
    !(v as { porta?: unknown }).porta &&
    (v.repairUntil ?? 0) <= p.now &&
    posts.includes(v.at)
  );
}
