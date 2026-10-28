import {
  DAY_MS,
  type WorldContext,
  type WorldState,
  dayIndex,
  nextMudaIndex,
  rumourBook,
  spiedOn,
  spyReport,
} from "@comptoirs/engine";
import { and, eq, sql } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { accounts } from "../db/schema.js";

/**
 * The Broglio on the server (R8, docs/plan-rupture.md): the rules are the engine's
 * (`broglio.ts`); the server shows a merchant its rumours and the Rialto's offers — sellers never
 * named, a rumour for sale showing only its source and its kind until bought — takes the
 * Influence of a forgery, and takes the Lustre of a liar unmasked.
 */

/** The Broglio for the screens. */
export async function broglioView(
  db: Db,
  ctx: WorldContext,
  state: WorldState,
  accountId: string,
  now: number,
) {
  const rules = ctx.settings.broglio;
  if (!rules) return null;
  const book = rumourBook(ctx, state, accountId, now);
  const offers = Object.values(state.broglio?.offers ?? {}).filter(
    (o) => !o.to || o.to === accountId || o.seller === accountId,
  );
  const spy = spyReport(ctx, state, accountId, now);
  const [target] = spy
    ? await db.select({ pseudo: accounts.pseudo }).from(accounts).where(eq(accounts.id, spy.target))
    : [];
  const day = dayIndex(ctx, now);
  const forged = state.broglio?.forgedToday?.[accountId];
  return {
    today: book.today.map(({ forged: f, ...r }) => ({ ...r, forged: !!f })),
    past: book.past.map(({ forged: f, ...r }) => ({ ...r, forged: !!f })),
    offers: offers.map((o) => {
      const mine = o.seller === accountId;
      const bought = o.buyers.includes(accountId);
      return {
        id: o.id,
        price: o.price.toString(),
        source: o.rumour.source,
        reliabilityBps: o.rumour.reliabilityBps,
        kind: o.rumour.subject.kind,
        // What it says, only to its seller and its buyers.
        subject: mine || bought ? o.rumour.subject : null,
        mine,
        bought,
        forMe: o.to === accountId,
        buyers: mine ? o.buyers.length : null,
      };
    }),
    spy: spy ? { ...spy, pseudo: target?.pseudo ?? null } : null,
    spied: spiedOn(state, accountId, now),
    forgedToday: forged && forged.day === day ? forged.n : 0,
    rules: {
      sources: rules.sources,
      maxOffers: rules.maxOffers,
      forgePerDay: rules.forge.perDay,
      forgeInfluence: rules.forge.influence,
      spyCost: rules.spy.cost.toString(),
      spyDays: rules.spy.days,
    },
    // What a forgery may speak of: the events of the catalog, the cities, the days to come and
    // the next galleys.
    subjects: {
      events: ctx.settings.events.catalog.map((e) => ({ code: e.code, city: e.city ?? null })),
      days: [1, 2, 3, 4]
        .map((n) => day + n)
        .filter((d) => ctx.startAt + d * DAY_MS < (ctx.endAt ?? Number.POSITIVE_INFINITY)),
      mudaArrival: ctx.settings.muda ? nextMudaIndex(ctx, now) : null,
    },
  };
}

/** A liar unmasked loses Lustre (never under nought); a house of the computer has none. */
export async function liarPenalty(db: Db, ctx: WorldContext, accountId: string | undefined) {
  const loss = ctx.settings.broglio?.forge.lustreLoss ?? 0;
  if (!accountId || loss <= 0) return;
  await db
    .update(accounts)
    .set({ lustre: sql`greatest(0, ${accounts.lustre} - ${loss})` })
    .where(and(eq(accounts.id, accountId), eq(accounts.isBot, false)));
}
