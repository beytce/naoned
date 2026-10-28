import { type WorldContext, heirNames, knownTrait } from "@comptoirs/engine";
import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { generations, worlds } from "../db/schema.js";

/**
 * The Dynastie on the server (R4, docs/plan-rupture.md): the account's line, one generation a
 * month. At joining, the month's member is named and takes the heir's trait from the generation
 * before; at the month's close, the traits it earned and its epithet are written; after it, the
 * merchant chooses the trait it leaves. The rules of the traits are the engine's (`dynasty.ts`).
 */

/** The feats of the month that earn a trait, from the events kept in the telemetry. */
const FEATS = ["incanto_won", "podesta_named", "terra_result", "letter_answered", "daily_chest"];
/** Letters answered, chests in a row: what earns the man of letters and the notary's son. */
const LETTERS_FOR_TRAIT = 20;
const STREAK_FOR_TRAIT = 7;
/** The month's best: raised at the Rialto. */
const TOP_FOR_TRAIT = 10;
/** Days played that make « le Constant ». */
const CONSTANT_DAYS = 28;

type Feats = {
  incanto: number;
  podesta: number;
  signore: boolean;
  letters: number;
  streak: number;
};

/** The traits a month earned, in the order the catalog offers them to the heir. */
export function earnedTraits(ctx: WorldContext, rank: number, f: Feats): string[] {
  const earned = [
    f.incanto > 0 && "nato_quai",
    rank <= TOP_FOR_TRAIT && "rialto",
    f.signore && "condottiere",
    f.podesta > 0 && "amico_citta",
    f.streak >= STREAK_FOR_TRAIT && "notaio",
    f.letters >= LETTERS_FOR_TRAIT && "letterato",
  ].filter((x): x is string => !!x);
  return earned.filter((code) => knownTrait(ctx, code));
}

/** The generation's epithet, from its month (none for a quiet one). */
export function epithetOf(rank: number, turnover: bigint | null, f: Feats, days: number) {
  if (rank === 1) return "magnifico";
  if (turnover !== null && turnover < 0n) return "rovinato";
  if (f.podesta > 0) return "podesta";
  if (f.signore) return "condottiere";
  if (days >= CONSTANT_DAYS) return "costante";
  return null;
}

/** The account's latest generation of another month (the heir's parent). */
async function parentOf(db: Db, accountId: string, worldId: string) {
  const [row] = await db
    .select()
    .from(generations)
    .where(and(eq(generations.accountId, accountId), ne(generations.worldId, worldId)))
    .orderBy(desc(generations.year))
    .limit(1);
  return row ?? null;
}

/**
 * The month's member of the house, before joining: its name (one of the three offered, else the
 * first), its year and the trait the heir takes (chosen after the parent's close, else the first
 * it earned).
 */
export async function nextGeneration(
  db: Db,
  ctx: WorldContext,
  worldId: string,
  accountId: string,
  given?: string,
) {
  if (!ctx.settings.dynasty) return null;
  const names = heirNames(ctx, accountId);
  const parent = await parentOf(db, accountId, worldId);
  const trait = knownTrait(ctx, parent ? (parent.heir ?? parent.earned?.[0]) : undefined);
  return {
    given: given && names.includes(given) ? given : (names[0] ?? "Marco"),
    year: parent ? parent.year + 1 : 1450,
    trait: trait ?? null,
  };
}

/** Writes the month's member once it joined. */
export async function startGeneration(
  db: Db,
  worldId: string,
  accountId: string,
  g: { given: string; year: number; trait: string | null },
) {
  await db
    .insert(generations)
    .values({ accountId, worldId, given: g.given, year: g.year, traitIn: g.trait })
    .onConflictDoNothing();
}

/** The feats of the month per account, from the telemetry. */
async function featsOf(db: Db, worldId: string, ids: string[]): Promise<Map<string, Feats>> {
  const feats = new Map<string, Feats>();
  if (ids.length === 0) return feats;
  const rows = await db.execute(sql`
    select account_id as id, type,
      count(*)::int as n,
      max(coalesce((props->>'streak')::int, 0))::int as streak,
      bool_or(coalesce((props->>'signore')::boolean, false)) as signore
    from telemetry
    where world_id = ${worldId}
      and type in (${sql.join(
        FEATS.map((f) => sql`${f}`),
        sql`, `,
      )})
    group by account_id, type`);
  for (const r of (rows as { rows?: Record<string, unknown>[] }).rows ?? []) {
    const id = String(r.id);
    if (!ids.includes(id)) continue;
    const f = feats.get(id) ?? { incanto: 0, podesta: 0, signore: false, letters: 0, streak: 0 };
    const n = Number(r.n);
    if (r.type === "incanto_won") f.incanto += n;
    if (r.type === "podesta_named") f.podesta += n;
    if (r.type === "terra_result") f.signore ||= r.signore === true;
    if (r.type === "letter_answered") f.letters += n;
    if (r.type === "daily_chest") f.streak = Math.max(f.streak, Number(r.streak));
    feats.set(id, f);
  }
  return feats;
}

/**
 * At the month's close: each person's generation gets its rank, the traits it earned and its
 * epithet (a merchant who joined before the Dynastie gets its first generation now).
 */
export async function recordGenerations(
  db: Db,
  worldId: string,
  ctx: WorldContext,
  ranked: { accountId: string; rank: number; turnover: bigint | null; days: number }[],
) {
  if (!ctx.settings.dynasty || ranked.length === 0) return;
  const feats = await featsOf(
    db,
    worldId,
    ranked.map((r) => r.accountId),
  );
  for (const r of ranked) {
    const f = feats.get(r.accountId) ?? {
      incanto: 0,
      podesta: 0,
      signore: false,
      letters: 0,
      streak: 0,
    };
    const set = {
      rank: r.rank,
      earned: earnedTraits(ctx, r.rank, f),
      epithet: epithetOf(r.rank, r.turnover, f, r.days),
    };
    const g = await nextGeneration(db, ctx, worldId, r.accountId);
    if (!g) return;
    await db
      .insert(generations)
      .values({ accountId: r.accountId, worldId, given: g.given, year: g.year, ...set })
      .onConflictDoUpdate({ target: [generations.accountId, generations.worldId], set });
  }
}

/** Raised by the heir's choice when it cannot be taken. */
export class HeirRefused extends Error {}

/** The trait the latest closed generation leaves: one it earned, until the heir joins. */
export async function chooseHeir(db: Db, accountId: string, trait: string): Promise<void> {
  const [latest] = await db
    .select()
    .from(generations)
    .where(eq(generations.accountId, accountId))
    .orderBy(desc(generations.year))
    .limit(1);
  if (!latest?.earned) throw new HeirRefused("no_heir");
  if (!latest.earned.includes(trait)) throw new HeirRefused("trait_not_earned");
  await db
    .update(generations)
    .set({ heir: trait })
    .where(and(eq(generations.accountId, accountId), eq(generations.worldId, latest.worldId)));
}

/**
 * The line for the screens: every generation (oldest first, with its month's name), the heir to
 * name while the latest month is closed and the next not joined, and the three names offered.
 */
export async function dynastyView(db: Db, ctx: WorldContext, worldId: string, accountId: string) {
  if (!ctx.settings.dynasty) return null;
  const rows = await db
    .select({
      worldId: generations.worldId,
      season: worlds.name,
      given: generations.given,
      year: generations.year,
      traitIn: generations.traitIn,
      earned: generations.earned,
      heir: generations.heir,
      epithet: generations.epithet,
      rank: generations.rank,
    })
    .from(generations)
    .innerJoin(worlds, eq(worlds.id, generations.worldId))
    .where(eq(generations.accountId, accountId))
    .orderBy(generations.year);
  const current = rows.find((r) => r.worldId === worldId) ?? null;
  const latest = rows.at(-1) ?? null;
  const naming = !current && latest?.earned ? latest : null;
  return {
    generations: rows,
    current,
    heir: naming ? { earned: naming.earned ?? [], chosen: naming.heir } : null,
    names: current ? [] : heirNames(ctx, accountId),
  };
}

/** The accounts' latest generation, for the façades and the palmarès. */
export async function latestGenerations(db: Db, ids: string[]) {
  if (ids.length === 0) return new Map<string, { given: string; year: number; count: number }>();
  const rows = await db
    .select({
      accountId: generations.accountId,
      given: generations.given,
      year: generations.year,
    })
    .from(generations)
    .where(inArray(generations.accountId, ids))
    .orderBy(generations.year);
  const out = new Map<string, { given: string; year: number; count: number }>();
  for (const r of rows) {
    const prev = out.get(r.accountId);
    out.set(r.accountId, { given: r.given, year: r.year, count: (prev?.count ?? 0) + 1 });
  }
  return out;
}
