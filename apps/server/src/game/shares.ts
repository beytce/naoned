import {
  type WorldContext,
  type WorldState,
  cashAccount,
  councilOf,
  houseBoard,
  listingRefusal,
  sharesHeld,
  turnoverOf,
} from "@comptoirs/engine";
import { inArray } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { accounts } from "../db/schema.js";

/**
 * The parts of a house on the server (R9, docs/plan-rupture.md): the rules are the engine's
 * (`shares.ts`); the server names the holders (a house's register is public), never the authors
 * of the orders on its book, and opens the house's accounts only to its council.
 */

async function namesOf(db: Db, ids: string[]) {
  if (ids.length === 0) return new Map<string, { pseudo: string; crest: unknown; bot: boolean }>();
  const rows = await db
    .select({
      id: accounts.id,
      pseudo: accounts.pseudo,
      crest: accounts.crest,
      bot: accounts.isBot,
    })
    .from(accounts)
    .where(inArray(accounts.id, ids));
  return new Map(rows.map((r) => [r.id, { pseudo: r.pseudo, crest: r.crest, bot: r.bot }]));
}

/** A house's parts, as `viewer` sees them. */
export async function houseSharesView(
  db: Db,
  ctx: WorldContext,
  state: WorldState,
  house: string,
  viewer: string,
  now: number,
) {
  const rules = ctx.settings.shares;
  if (!rules || !state.players[house]) return null;
  const board = houseBoard(state, house);
  const names = await namesOf(db, board?.holders.map((h) => h.playerId) ?? []);
  const own = viewer === house;
  const seat = own || councilOf(ctx, state, house, viewer);
  const order = (o: NonNullable<typeof board>["bids"][number]) => ({
    id: o.id,
    price: o.price.toString(),
    quantity: o.quantity,
    mine: o.player === viewer,
  });
  const offered = board?.asks
    .filter((o) => o.player === viewer)
    .reduce((n, o) => n + o.quantity, 0);
  const held = board?.holders.find((h) => h.playerId === viewer)?.shares ?? 0;
  const dividends = state.shares?.[house]?.dividends ?? {};
  return {
    house,
    listed: !!board,
    // Why the house may not list itself yet, for its founder (null: it may).
    refusal: own && !board ? listingRefusal(ctx, state, house, now) : null,
    lastPrice: board?.lastPrice?.toString() ?? null,
    float: board?.float ?? 0,
    holders: (board?.holders ?? []).map((h) => ({
      id: h.playerId,
      ...(names.get(h.playerId) ?? { pseudo: "", crest: null, bot: false }),
      shares: h.shares,
    })),
    bids: (board?.bids ?? []).map(order),
    asks: (board?.asks ?? []).map(order),
    mine: {
      shares: held,
      // What the viewer may still offer: the founder never under its 51.
      free: Math.max(0, held - (offered ?? 0) - (own ? 100 - rules.float : 0)),
      dividends: (dividends[viewer] ?? 0n).toString(),
    },
    paid: Object.values(dividends)
      .reduce((s, d) => s + d, 0n)
      .toString(),
    council: !own && seat,
    // The house's accounts, to its council only.
    accounts: seat
      ? {
          cash: (state.accounts[cashAccount(house)] ?? 0n).toString(),
          turnover: turnoverOf(state, house).toString(),
          week: (
            turnoverOf(state, house) - (state.weekly?.start[house] ?? turnoverOf(state, house))
          ).toString(),
          stock: Object.entries(state.inventories[house] ?? {})
            .filter(([, l]) => l.available + l.escrow > 0)
            .map(([resource, l]) => ({ resource, quantity: l.available + l.escrow })),
        }
      : null,
    rules: {
      fromDay: rules.fromDay,
      minDays: rules.minDays,
      float: rules.float,
      dividendBps: rules.dividendBps,
      councilShares: rules.councilShares,
      maxOpenOrders: rules.maxOpenOrders,
    },
  };
}

/** The merchant's own house and its parts in the others'. */
export async function sharesView(
  db: Db,
  ctx: WorldContext,
  state: WorldState,
  viewer: string,
  now: number,
) {
  const mine = await houseSharesView(db, ctx, state, viewer, viewer, now);
  if (!mine) return null;
  const held = sharesHeld(state, viewer);
  const names = await namesOf(
    db,
    held.map((h) => h.house),
  );
  return {
    mine,
    held: held.map((h) => ({
      house: h.house,
      ...(names.get(h.house) ?? { pseudo: "", crest: null, bot: false }),
      shares: h.shares,
      lastPrice: h.lastPrice?.toString() ?? null,
      dividends: h.dividends.toString(),
      council: councilOf(ctx, state, h.house, viewer),
    })),
  };
}
