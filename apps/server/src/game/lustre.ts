import {
  type WorldContext,
  type WorldState,
  applyLustre,
  ghostAt,
  pairByLustre,
  sfidaDelta,
  softReset,
  tierOf,
  weekIndex,
  weekStart,
  weeklyStandings,
} from "@comptoirs/engine";
import { and, desc, eq, inArray, isNull, ne, or, sql } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { accounts, players, sfide, weekCurves } from "../db/schema.js";

/**
 * The Lustre on the server (R6, docs/plan-rupture.md): the accounts' rank, the curves of the weeks
 * (hour by hour, the ghosts' matter), the week's Sfide paired at its first tick (and for whoever
 * comes later), settled at its close, and the month's change two tiers down. The rules are the
 * engine's (`lustre.ts`); this file keeps them in the database.
 */

const HOUR_MS = 3_600_000;

type Row = typeof sfide.$inferSelect;

/** The world's people present: not a house of the computer, not retired. */
async function people(db: Db, worldId: string): Promise<{ id: string; lustre: number }[]> {
  return db
    .select({ id: accounts.id, lustre: accounts.lustre })
    .from(players)
    .innerJoin(accounts, eq(accounts.id, players.accountId))
    .where(and(eq(players.worldId, worldId), eq(accounts.isBot, false), isNull(players.retiredAt)));
}

/** The hour of the week `at` falls in. */
function hourOfWeek(ctx: WorldContext, at: number): number {
  return Math.max(0, Math.floor((at - weekStart(ctx, weekIndex(ctx, at))) / HOUR_MS));
}

/**
 * Each hour: every person's net sales of the week so far, added to its curve (the hours missed
 * between two ticks carry the last value).
 */
export async function recordCurves(
  db: Db,
  worldId: string,
  ctx: WorldContext,
  state: WorldState,
  now: number,
): Promise<void> {
  const week = weekIndex(ctx, now);
  const hour = hourOfWeek(ctx, now);
  const field = await people(db, worldId);
  if (field.length === 0) return;
  const gains = new Map(weeklyStandings(ctx, state, now).map((s) => [s.playerId, s.gain]));
  const rows = await db
    .select({ accountId: weekCurves.accountId, gains: weekCurves.gains })
    .from(weekCurves)
    .where(and(eq(weekCurves.worldId, worldId), eq(weekCurves.week, week)));
  const known = new Map(rows.map((r) => [r.accountId, r.gains]));
  for (const p of field) {
    const curve = [...(known.get(p.id) ?? [])];
    const last = curve.at(-1) ?? "0";
    while (curve.length < hour) curve.push(last);
    curve[hour] = (gains.get(p.id) ?? 0n).toString();
    await db
      .insert(weekCurves)
      .values({ worldId, week, accountId: p.id, lustre: p.lustre, gains: curve })
      .onConflictDoUpdate({
        target: [weekCurves.worldId, weekCurves.week, weekCurves.accountId],
        set: { gains: curve, lustre: p.lustre },
      });
  }
}

/** The closed curve of another person nearest in Lustre: a ghost (null: none yet). */
async function ghostFor(
  db: Db,
  accountId: string,
  lustre: number,
): Promise<{ accountId: string; worldId: string; week: number } | null> {
  const [g] = await db
    .select({ accountId: weekCurves.accountId, worldId: weekCurves.worldId, week: weekCurves.week })
    .from(weekCurves)
    .innerJoin(accounts, eq(accounts.id, weekCurves.accountId))
    .where(
      and(
        eq(weekCurves.closed, true),
        ne(weekCurves.accountId, accountId),
        eq(accounts.isBot, false),
      ),
    )
    .orderBy(sql`abs(${weekCurves.lustre} - ${lustre})`, desc(weekCurves.week))
    .limit(1);
  return g ?? null;
}

/** A house of the computer of the world, present, for whoever has no ghost (the launch). */
async function houseFor(db: Db, worldId: string, accountId: string): Promise<string | null> {
  const houses = await db
    .select({ id: accounts.id })
    .from(players)
    .innerJoin(accounts, eq(accounts.id, players.accountId))
    .where(and(eq(players.worldId, worldId), eq(accounts.isBot, true), isNull(players.retiredAt)))
    .orderBy(accounts.id);
  if (houses.length === 0) return null;
  // The same house for the same merchant all week, spread over the houses.
  let h = 0;
  for (const c of accountId) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return houses[h % houses.length]?.id ?? null;
}

/**
 * Pairs the week's Sfide: challenges accepted for it first, then the ladder by neighbouring
 * Lustre, then the ghost (or a house of the computer) for the one left over. People already in a
 * Sfida this week are left alone, so it may run at every tick (a late arrival gets its own).
 * Challenges never accepted by the week's start are dropped. Returns the new rows.
 */
export async function ensureSfide(
  db: Db,
  worldId: string,
  ctx: WorldContext,
  now: number,
): Promise<Row[]> {
  const week = weekIndex(ctx, now);
  await db
    .delete(sfide)
    .where(
      and(
        eq(sfide.worldId, worldId),
        eq(sfide.kind, "challenge"),
        isNull(sfide.acceptedAt),
        sql`${sfide.week} <= ${week}`,
      ),
    );
  const existing = await db
    .select({ a: sfide.a, b: sfide.b })
    .from(sfide)
    .where(and(eq(sfide.worldId, worldId), eq(sfide.week, week)));
  const taken = new Set(existing.flatMap((r) => [r.a, r.b ?? ""]));
  const field = (await people(db, worldId)).filter((p) => !taken.has(p.id));
  if (field.length === 0) return [];
  const { pairs, left } = pairByLustre(field);
  const values: (typeof sfide.$inferInsert)[] = pairs.map(([a, b]) => ({
    worldId,
    week,
    kind: "ladder" as const,
    a,
    b,
  }));
  const lustreOf = new Map(field.map((p) => [p.id, p.lustre]));
  for (const a of left) {
    const ghost = await ghostFor(db, a, lustreOf.get(a) ?? 0);
    if (ghost) {
      values.push({
        worldId,
        week,
        a,
        ghostAccount: ghost.accountId,
        ghostWorld: ghost.worldId,
        ghostWeek: ghost.week,
      });
      continue;
    }
    const house = await houseFor(db, worldId, a);
    if (house) values.push({ worldId, week, a, b: house });
  }
  if (values.length === 0) return [];
  return db.insert(sfide).values(values).returning();
}

/** A ghost's whole curve, as amounts. */
async function ghostCurve(db: Db, row: Row): Promise<bigint[]> {
  if (!row.ghostAccount || !row.ghostWorld || row.ghostWeek === null) return [];
  const [c] = await db
    .select({ gains: weekCurves.gains })
    .from(weekCurves)
    .where(
      and(
        eq(weekCurves.worldId, row.ghostWorld),
        eq(weekCurves.week, row.ghostWeek),
        eq(weekCurves.accountId, row.ghostAccount),
      ),
    );
  return (c?.gains ?? []).map((g) => BigInt(g));
}

/**
 * Settles the week's Sfide at its close (engine event `week_closed`, in the tick's transaction):
 * each side's gain of the week (a ghost's at its end), the Lustre moved for people (a house of
 * the computer has none), the week's curves closed for the ghosts to come.
 */
export async function settleSfide(
  db: Db,
  worldId: string,
  ctx: WorldContext,
  data: Record<string, unknown>,
  at: Date,
): Promise<void> {
  const rules = ctx.settings.lustre;
  const week = Number(data.week);
  await db
    .update(weekCurves)
    .set({ closed: true })
    .where(and(eq(weekCurves.worldId, worldId), eq(weekCurves.week, week)));
  if (!rules) return;
  const gains = new Map(
    ((data.standings ?? []) as { playerId: string; gain: string }[]).map((s) => [
      s.playerId,
      BigInt(s.gain),
    ]),
  );
  const rows = await db
    .select()
    .from(sfide)
    .where(and(eq(sfide.worldId, worldId), eq(sfide.week, week), isNull(sfide.settledAt)));
  const live = rows.filter((r) => r.kind === "ladder" || r.acceptedAt !== null);
  if (live.length === 0) return;
  const ids = [...new Set(live.flatMap((r) => [r.a, r.b ?? ""]))].filter(Boolean);
  const accs = await db
    .select({ id: accounts.id, lustre: accounts.lustre, bot: accounts.isBot })
    .from(accounts)
    .where(inArray(accounts.id, ids));
  const lustre = new Map(accs.filter((a) => !a.bot).map((a) => [a.id, a.lustre]));
  for (const r of live) {
    const aGain = gains.get(r.a) ?? 0n;
    const bGain = r.b ? (gains.get(r.b) ?? 0n) : ghostAt(await ghostCurve(db, r), 10_000);
    const d = sfidaDelta(rules, aGain, bGain, r.stake);
    const moveB = !!r.b && lustre.has(r.b);
    const deltaA = lustre.has(r.a) ? d.a : 0;
    const deltaB = moveB ? d.b : 0;
    if (lustre.has(r.a)) lustre.set(r.a, applyLustre(lustre.get(r.a) ?? 0, deltaA));
    if (moveB && r.b) lustre.set(r.b, applyLustre(lustre.get(r.b) ?? 0, deltaB));
    await db
      .update(sfide)
      .set({ aGain, bGain, deltaA, deltaB, settledAt: at })
      .where(eq(sfide.id, r.id));
  }
  for (const [id, value] of lustre)
    await db.update(accounts).set({ lustre: value }).where(eq(accounts.id, id));
}

/** The month's change: the world's people go two tiers down. */
export async function softResetLustre(db: Db, worldId: string, ctx: WorldContext): Promise<void> {
  const rules = ctx.settings.lustre;
  if (!rules) return;
  for (const p of await people(db, worldId)) {
    const next = softReset(rules, p.lustre);
    if (next !== p.lustre)
      await db.update(accounts).set({ lustre: next }).where(eq(accounts.id, p.id));
  }
}

/** A person as the client shows them. */
type Person = {
  id: string;
  pseudo: string | null;
  crest: { shape: string; color: string; symbol: string } | null;
  bot: boolean;
};

async function persons(db: Db, ids: string[]): Promise<Map<string, Person>> {
  if (ids.length === 0) return new Map();
  const rows = await db
    .select({
      id: accounts.id,
      pseudo: accounts.pseudo,
      crest: accounts.crest,
      bot: accounts.isBot,
    })
    .from(accounts)
    .where(inArray(accounts.id, ids));
  return new Map(rows.map((r) => [r.id, r]));
}

/**
 * The merchant's Sfida of the week and its Lustre: the opponent (a person, a house of the
 * computer, or a ghost and its week), both gains now (the ghost's at the same hour of its week),
 * both curves, the tier and the ladder, the challenges asked and received. Null when off.
 */
export async function sfidaView(
  db: Db,
  worldId: string,
  ctx: WorldContext,
  state: WorldState,
  now: number,
  accountId: string,
) {
  const rules = ctx.settings.lustre;
  if (!rules) return null;
  const week = weekIndex(ctx, now);
  const [me] = await db
    .select({ lustre: accounts.lustre })
    .from(accounts)
    .where(eq(accounts.id, accountId));
  const lustre = me?.lustre ?? 0;
  const rows = await db
    .select()
    .from(sfide)
    .where(
      and(
        eq(sfide.worldId, worldId),
        sql`${sfide.week} in (${week}, ${week + 1})`,
        or(eq(sfide.a, accountId), eq(sfide.b, accountId)),
      ),
    );
  const playing = rows.find(
    (r) => r.week === week && (r.kind === "ladder" || r.acceptedAt !== null),
  );
  const asked = rows.filter((r) => r.week === week + 1 && r.kind === "challenge");
  const ids = [
    ...new Set(
      [...rows.flatMap((r) => [r.a, r.b]), playing?.ghostAccount].filter((x): x is string => !!x),
    ),
  ];
  const who = await persons(db, ids);
  const person = (id: string) => {
    const p = who.get(id);
    return { id, pseudo: p?.pseudo ?? null, crest: p?.crest ?? null, bot: p?.bot ?? false };
  };
  const gains = new Map(weeklyStandings(ctx, state, now).map((s) => [s.playerId, s.gain]));
  const hour = hourOfWeek(ctx, now);
  const curveOf = async (wid: string, w: number, id: string) => {
    const [c] = await db
      .select({ gains: weekCurves.gains })
      .from(weekCurves)
      .where(
        and(eq(weekCurves.worldId, wid), eq(weekCurves.week, w), eq(weekCurves.accountId, id)),
      );
    return c?.gains ?? [];
  };
  let sfida = null;
  if (playing) {
    const mineIsA = playing.a === accountId;
    const other = mineIsA ? playing.b : playing.a;
    const ghost = !other && playing.ghostAccount ? playing : null;
    const theirCurve = ghost
      ? await curveOf(ghost.ghostWorld ?? "", ghost.ghostWeek ?? 0, ghost.ghostAccount ?? "")
      : other
        ? await curveOf(worldId, week, other)
        : [];
    const theirs = ghost
      ? ghostAt(
          theirCurve.map((g) => BigInt(g)),
          hour,
        )
      : (gains.get(other ?? "") ?? 0n);
    sfida = {
      kind: playing.kind,
      stake: playing.stake,
      opponent: other ? person(other) : null,
      ghost: ghost
        ? { ...person(ghost.ghostAccount ?? ""), week: (ghost.ghostWeek ?? 0) + 1 }
        : null,
      mine: (gains.get(accountId) ?? 0n).toString(),
      theirs: theirs.toString(),
      curves: {
        mine: await curveOf(worldId, week, accountId),
        theirs: theirCurve,
      },
      hour,
    };
  }
  const tier = tierOf(rules, lustre);
  return {
    lustre,
    tier,
    tiers: rules.tiers,
    win: rules.win,
    loss: rules.loss,
    maxStake: rules.maxStake,
    sfida,
    challenges: {
      out: asked
        .filter((r) => r.a === accountId)
        .map((r) => ({
          id: r.id,
          to: person(r.b ?? ""),
          stake: r.stake,
          accepted: !!r.acceptedAt,
        })),
      in: asked
        .filter((r) => r.b === accountId)
        .map((r) => ({ id: r.id, from: person(r.a), stake: r.stake, accepted: !!r.acceptedAt })),
    },
  };
}

/** A challenge for next week: one asked a week, to a person of the world, a stake within bounds. */
export async function challenge(
  db: Db,
  worldId: string,
  ctx: WorldContext,
  now: number,
  from: string,
  to: string,
  stake: number,
): Promise<"ok" | "lustre_off" | "self" | "unknown_player" | "already_asked" | "invalid_stake"> {
  const rules = ctx.settings.lustre;
  if (!rules) return "lustre_off";
  if (from === to) return "self";
  if (!Number.isInteger(stake) || stake < 0 || stake > rules.maxStake) return "invalid_stake";
  const field = new Set((await people(db, worldId)).map((p) => p.id));
  if (!field.has(from) || !field.has(to)) return "unknown_player";
  const week = weekIndex(ctx, now) + 1;
  const busy = await db
    .select({ id: sfide.id })
    .from(sfide)
    .where(
      and(
        eq(sfide.worldId, worldId),
        eq(sfide.week, week),
        eq(sfide.kind, "challenge"),
        or(eq(sfide.a, from), eq(sfide.b, from), eq(sfide.a, to), eq(sfide.b, to)),
      ),
    )
    .limit(1);
  if (busy.length > 0) return "already_asked";
  await db.insert(sfide).values({ worldId, week, kind: "challenge", a: from, b: to, stake });
  return "ok";
}

/** The challenged merchant accepts: the two meet next week. */
export async function acceptChallenge(
  db: Db,
  worldId: string,
  accountId: string,
  id: string,
  now: number,
): Promise<"ok" | "unknown_challenge"> {
  const done = await db
    .update(sfide)
    .set({ acceptedAt: new Date(now) })
    .where(
      and(
        eq(sfide.id, id),
        eq(sfide.worldId, worldId),
        eq(sfide.b, accountId),
        eq(sfide.kind, "challenge"),
        isNull(sfide.acceptedAt),
      ),
    )
    .returning({ id: sfide.id });
  return done.length > 0 ? "ok" : "unknown_challenge";
}

/**
 * The Sfida's opponent in the shape of the weekly rival (the HUD's line): its name, its gain now
 * (a ghost's at the same hour of its week) against the merchant's. Null without a Sfida.
 */
export async function sfidaRival(
  db: Db,
  worldId: string,
  ctx: WorldContext,
  state: WorldState,
  now: number,
  accountId: string,
) {
  const v = await sfidaView(db, worldId, ctx, state, now, accountId);
  const s = v?.sfida;
  if (!s) return null;
  const who = s.opponent ?? s.ghost;
  if (!who) return null;
  const mine = BigInt(s.mine);
  const gain = BigInt(s.theirs);
  return {
    pseudo: who.pseudo,
    bot: who.bot,
    character: null,
    gain,
    mine,
    ahead: gain > mine,
    sfida: true,
    ghost: !!s.ghost,
    tier: v.tier.code,
  };
}
