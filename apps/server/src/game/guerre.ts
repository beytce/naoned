import {
  type AssautFleetShip,
  type AssautPort,
  type AssautState,
  type GuerreWar,
  type IleState,
  assautFleetOf,
  assautInit,
  assautPlay,
  assautPortOf,
  assautResult,
  guerreForm,
  guerreJoin,
  guerrePrestige,
  guerreScore,
  planchePower,
} from "@comptoirs/engine";
import { and, eq } from "drizzle-orm";
import type { Db } from "../db/client.js";
import {
  companies,
  companyMembers,
  guerreAssaults,
  guerreWeeks,
  plancheSeats,
} from "../db/schema.js";
import { companyIdOf } from "./company.js";
import { mondayOf } from "./planche.js";
import { beaconOf } from "./plancheBeacon.js";
import type { PlancheLagoons } from "./plancheLagoons.js";
import { companySigns } from "./plancheSigns.js";
import type { PlancheStore } from "./plancheStore.js";

const DAY = 86_400_000;
/** The flotillas' size before the companies (the owner's choice, 12 November 2026). */
export const FLOTILLA = 6;

/** A house of the War: `<world_id>:<house>`. */
const keyOf = (store: PlancheStore, house: string) => `${store.worldId}:${house}`;

export interface GuerrePort {
  key: string;
  name: string;
  lagoon: string;
  power: number;
  person: boolean;
  /** The best assault on it this week (its seals taken). */
  best: number;
}

export interface GuerreView {
  week: number;
  /** « assauts » Tuesday to Saturday, « lundi » to prepare, « dimanche » the result; « aucune » outside a war. */
  phase: "lundi" | "assauts" | "dimanche" | "aucune";
  me: string | null;
  ours: GuerrePort[];
  theirs: GuerrePort[];
  score: { us: number; them: number };
  /** Whether the player has made today's assault, and the one under way. */
  today: boolean;
  running: { target: string; state: AssautState; ile: IleState | null } | null;
  /** The assaults on the player's port this week, and its own: each may be seen again. */
  suffered: { id: number; by: string; seals: number; at: number }[];
  made: { id: number; target: string; seals: number; at: number }[];
  /** The companies of the two sides, when they are (docs/plan-compagnie.md K3). */
  companies: { us: string | null; them: string | null };
  /** The ports of the other side one's company has reserved with a sign: by whom. */
  reserved: Record<string, string>;
}

interface Running {
  week: number;
  day: number;
  target: string;
  port: AssautPort;
  fleet: AssautFleetShip[];
  state: AssautState;
  moves: Record<number, string>[];
  store: PlancheStore;
  /** The pass whose ruse the company's beacon showed. */
  scouted?: string;
  /** The island attacked, as it stood when the assault began (for the scene). */
  ile: IleState | null;
}

/**
 * What the assailant sees of the port: the ruses not yet played are hidden, but the one its
 * company's beacon showed (docs/plan-compagnie.md K4).
 */
export function hideRuses(s: AssautState, scouted?: string): AssautState {
  const v = structuredClone(s);
  for (const [id, p] of Object.entries(v.passes))
    if (!p.ruseDone && id !== scouted) {
      const { ruse: _secret, ...seen } = p;
      v.passes[id] = seen;
    }
  return v;
}

/**
 * The War of the week on the server (docs/plan-guerre.md W4): the flotillas formed on Monday
 * across every lagoon, one assault a player a day from Tuesday to Saturday (played round by
 * round here, the ruses hidden until they play), the result and the Prestige on Sunday.
 */
export class GuerreHub {
  private readonly running = new Map<string, Running>();

  constructor(
    private readonly db: Db,
    private readonly lagoons: PlancheLagoons,
  ) {}

  private where(key: string): { store: PlancheStore; house: string } | null {
    const [world, house = ""] = key.split(":");
    const store = this.lagoons.all().find((s) => s.worldId === world);
    return store ? { store, house } : null;
  }

  /** The week's wars: formed at the first look of the week (Monday to Saturday). */
  async wars(now: number): Promise<GuerreWar[] | null> {
    const week = mondayOf(now);
    const [row] = await this.db
      .select()
      .from(guerreWeeks)
      .where(eq(guerreWeeks.week, new Date(week)));
    if (row) return row.wars as GuerreWar[];
    if (Math.floor((now - week) / DAY) >= 6) return null;
    const { wars } = guerreForm(await this.candidates(), FLOTILLA);
    await this.db
      .insert(guerreWeeks)
      .values({ week: new Date(week), wars })
      .onConflictDoNothing();
    const [again] = await this.db
      .select()
      .from(guerreWeeks)
      .where(eq(guerreWeeks.week, new Date(week)));
    return (again?.wars as GuerreWar[]) ?? wars;
  }

  /** Every house of every lagoon, with its Power, a person's or the computer's, and its company. */
  private async candidates() {
    const rows = await this.db
      .select({
        world: plancheSeats.worldId,
        house: plancheSeats.house,
        company: companyMembers.companyId,
      })
      .from(plancheSeats)
      .innerJoin(companyMembers, eq(companyMembers.accountId, plancheSeats.accountId));
    const company = new Map(rows.map((r) => [`${r.world}:${r.house}`, r.company]));
    return this.lagoons.all().flatMap((store) => {
      const doc = store.hub.current().doc;
      const S = store.hub.theme.board;
      const people = new Set(Object.values(doc.seats).map((s) => s.house));
      return S.houses.map((h) => ({
        key: keyOf(store, h.id),
        power: planchePower(S, doc.state, h.id),
        person: people.has(h.id),
        ...(company.has(keyOf(store, h.id)) ? { group: company.get(keyOf(store, h.id)) } : {}),
      }));
    });
  }

  /** A house come after the wars were formed joins one (Monday to Saturday). */
  private async join(key: string, wars: GuerreWar[], now: number): Promise<GuerreWar[]> {
    const week = mondayOf(now);
    if (Math.floor((now - week) / DAY) > 5) return wars;
    const all = await this.candidates();
    const me = all.find((c) => c.key === key);
    if (!me) return wars;
    const rows = await this.db
      .select({ by: guerreAssaults.by, target: guerreAssaults.target })
      .from(guerreAssaults)
      .where(eq(guerreAssaults.week, new Date(week)));
    const touched = new Set(rows.flatMap((r) => [r.by, r.target]));
    const next = guerreJoin(wars, { ...me, person: true }, all, FLOTILLA, touched);
    await this.db
      .update(guerreWeeks)
      .set({ wars: next })
      .where(eq(guerreWeeks.week, new Date(week)));
    return next;
  }

  private async assaults(week: number) {
    return this.db
      .select()
      .from(guerreAssaults)
      .where(and(eq(guerreAssaults.week, new Date(week)), eq(guerreAssaults.done, true)));
  }

  private portOf(key: string, best: Record<string, number>, people: Set<string>): GuerrePort {
    const at = this.where(key);
    const doc = at?.store.hub.current().doc;
    const S = at?.store.hub.theme.board;
    const seat = doc ? Object.values(doc.seats).find((s) => s.house === at?.house) : undefined;
    return {
      key,
      name: seat?.name ?? S?.houses.find((h) => h.id === at?.house)?.name ?? key,
      lagoon: at?.store.name ?? "",
      power: S && doc && at ? planchePower(S, doc.state, at.house) : 0,
      person: people.has(key),
      best: best[key] ?? 0,
    };
  }

  /** What a player sees of the War this week. */
  async view(
    account: string,
    store: PlancheStore,
    house: string,
    now: number,
  ): Promise<GuerreView> {
    const week = mondayOf(now);
    const dow = Math.floor((now - week) / DAY);
    const me = keyOf(store, house);
    let wars = (await this.wars(now)) ?? [];
    if (!wars.some((w) => w.a.includes(me) || w.b.includes(me)))
      wars = await this.join(me, wars, now);
    const war = wars.find((w) => w.a.includes(me) || w.b.includes(me));
    const empty: GuerreView = {
      week,
      phase: "aucune",
      me,
      ours: [],
      theirs: [],
      score: { us: 0, them: 0 },
      today: false,
      running: null,
      suffered: [],
      made: [],
      companies: { us: null, them: null },
      reserved: {},
    };
    if (!war) return empty;
    const done = (await this.assaults(week)).map((r) => ({
      id: r.id,
      by: r.by,
      target: r.target,
      seals: r.seals,
      damageBps: r.damageBps,
      at: r.at.getTime(),
    }));
    const score = guerreScore(war, done);
    const side = war.a.includes(me) ? "a" : "b";
    const people = new Set(
      this.lagoons
        .all()
        .flatMap((s) => Object.values(s.hub.current().doc.seats).map((x) => keyOf(s, x.house))),
    );
    const [mine] = await this.db
      .select({ id: guerreAssaults.id })
      .from(guerreAssaults)
      .where(
        and(eq(guerreAssaults.accountId, account), eq(guerreAssaults.day, Math.floor(now / DAY))),
      );
    const run = this.running.get(account);
    // The company of each side: the one its people share, if they share one.
    const groups = new Map((await this.candidates()).map((c) => [c.key, c.group]));
    const companyName = async (keys: string[]) => {
      const gs = new Set(keys.filter((k) => people.has(k)).map((k) => groups.get(k)));
      const [g] = [...gs];
      if (gs.size !== 1 || !g) return null;
      const [row] = await this.db
        .select({ name: companies.name })
        .from(companies)
        .where(eq(companies.id, g));
      return row?.name ?? null;
    };
    const signs = await companySigns(this.db, account, now);
    const reserved = Object.fromEntries(
      signs
        .filter((x) => x.kind === "attaque" && x.target.startsWith("port:"))
        .map((x) => [x.target.slice(5), x.by]),
    );
    return {
      companies: {
        us: await companyName(war[side]),
        them: await companyName(war[side === "a" ? "b" : "a"]),
      },
      reserved,
      week,
      phase: dow === 0 ? "lundi" : dow === 6 ? "dimanche" : "assauts",
      me,
      ours: war[side].map((k) => this.portOf(k, score.best, people)),
      theirs: war[side === "a" ? "b" : "a"].map((k) => this.portOf(k, score.best, people)),
      score: { us: side === "a" ? score.a : score.b, them: side === "a" ? score.b : score.a },
      today: !!mine,
      running:
        run && run.week === week
          ? { target: run.target, state: hideRuses(run.state, run.scouted), ile: run.ile }
          : null,
      suffered: done
        .filter((d) => d.target === me)
        .map((d) => ({
          id: d.id,
          by: this.portOf(d.by, {}, people).name,
          seals: d.seals,
          at: d.at,
        })),
      made: done
        .filter((d) => d.by === me)
        .map((d) => ({
          id: d.id,
          target: this.portOf(d.target, {}, people).name,
          seals: d.seals,
          at: d.at,
        })),
    };
  }

  /** Today's assault begins on a port of the other flotilla (Tuesday to Saturday, once a day). */
  async start(
    account: string,
    store: PlancheStore,
    house: string,
    target: string,
    now: number,
  ): Promise<{ error: string } | { state: AssautState; ile: IleState | null }> {
    const week = mondayOf(now);
    const dow = Math.floor((now - week) / DAY);
    if (dow < 1 || dow > 5) return { error: "guerre_closed" };
    const me = keyOf(store, house);
    const war = ((await this.wars(now)) ?? []).find((w) => w.a.includes(me) || w.b.includes(me));
    if (!war) return { error: "guerre_none" };
    const foes = war.a.includes(me) ? war.b : war.a;
    const at = this.where(target);
    if (!foes.includes(target) || !at) return { error: "guerre_not_foe" };
    const S = store.hub.theme.board;
    const R = S.guerre?.assaut;
    if (!R) return { error: "guerre_none" };
    const fleet = assautFleetOf(S, store.hub.current().doc.state, house);
    if (!fleet.length) return { error: "guerre_no_fleet" };
    const port = assautPortOf(at.store.hub.theme.board, at.store.hub.current().doc.state, at.house);
    // The island attacked: public (everyone sees it on the board), for the scene of the assault.
    const ile = at.store.hub.current().doc.state.houses[at.house]?.ile ?? null;
    const day = Math.floor(now / DAY);
    // The day is spent as the assault begins: leaving it does not give another try.
    const inserted = await this.db
      .insert(guerreAssaults)
      .values({
        week: new Date(week),
        day,
        accountId: account,
        worldId: store.worldId,
        by: me,
        target,
        port,
        fleet,
        moves: [],
        at: new Date(now),
      })
      .onConflictDoNothing()
      .returning({ id: guerreAssaults.id });
    if (!inserted.length) return { error: "guerre_today" };
    const state = assautInit(R, port, fleet);
    // The company's beacon, at its level, shows the first ruse of the port.
    const B = S.compagnie?.beacon;
    const companyId = await companyIdOf(this.db, account);
    const level = companyId ? (await beaconOf(this.db, store.hub.theme, companyId)).level : 0;
    const scouted =
      B && level >= B.scoutLevel
        ? Object.entries(port.passes).find(([, p]) => p.ruse)?.[0]
        : undefined;
    this.running.set(account, {
      week,
      day,
      target,
      port,
      fleet,
      state,
      moves: [],
      store,
      ile,
      ...(scouted ? { scouted } : {}),
    });
    return { state: hideRuses(state, scouted), ile };
  }

  /** A round of the assault under way; the last one writes its result and sends the damaged home. */
  async round(
    account: string,
    player: string,
    moves: Record<number, string>,
    now: number,
  ): Promise<{ error: string } | { state: AssautState; result?: ReturnType<typeof assautResult> }> {
    const run = this.running.get(account);
    const R = run?.store.hub.theme.board.guerre?.assaut;
    if (!run || !R) return { error: "guerre_no_assault" };
    try {
      run.state = assautPlay(R, run.state, moves);
    } catch (e) {
      return { error: (e as Error).message };
    }
    run.moves.push(moves);
    if (run.state.manche <= R.manches) return { state: hideRuses(run.state, run.scouted) };
    const result = assautResult(R, run.state);
    this.running.delete(account);
    await this.db
      .update(guerreAssaults)
      .set({ seals: result.seals, damageBps: result.damageBps, done: true, moves: run.moves })
      .where(and(eq(guerreAssaults.accountId, account), eq(guerreAssaults.day, run.day)));
    for (const id of result.damaged)
      if (run.fleet.some((x) => x.id === id)) await run.store.hub.damage(player, id, now);
    return { state: run.state, result };
  }

  /**
   * Sunday: each war's Prestige given to its people's houses, once. Called at each look; it
   * settles every week that has reached its Sunday and is not settled yet.
   */
  async settle(now: number): Promise<void> {
    const rows = await this.db.select().from(guerreWeeks);
    for (const row of rows) {
      const week = row.week.getTime();
      if (row.settledAt || now < week + 6 * DAY) continue;
      const claimed = await this.db
        .update(guerreWeeks)
        .set({ settledAt: new Date(now) })
        .where(and(eq(guerreWeeks.week, row.week)))
        .returning({ week: guerreWeeks.week });
      if (!claimed.length) continue;
      const done = (await this.assaults(week)).map((r) => ({
        by: r.by,
        target: r.target,
        seals: r.seals,
        damageBps: r.damageBps,
      }));
      for (const war of row.wars as GuerreWar[]) {
        const first = this.where(war.a[0] ?? "");
        const P = first?.store.hub.theme.board.guerre?.prestige;
        if (!P) continue;
        for (const [key, amount] of Object.entries(guerrePrestige(P, war, done))) {
          const at = this.where(key);
          if (!at || amount <= 0) continue;
          const seat = Object.entries(at.store.hub.current().doc.seats).find(
            ([, s]) => s.house === at.house,
          );
          if (seat) await at.store.hub.grant(seat[0], amount, now);
        }
      }
    }
  }

  /**
   * An assault done, to be seen again by its assailant or by the master of the port (its replay):
   * the port and the fleet as they were, the placements of each round, the island attacked.
   */
  async replay(account: string, me: string, id: number) {
    const [row] = await this.db.select().from(guerreAssaults).where(eq(guerreAssaults.id, id));
    if (!row || !row.done || (row.accountId !== account && row.target !== me)) return null;
    const people = new Set(
      this.lagoons
        .all()
        .flatMap((s) => Object.values(s.hub.current().doc.seats).map((x) => keyOf(s, x.house))),
    );
    const at = this.where(row.target);
    return {
      port: row.port as AssautPort,
      fleet: row.fleet as AssautFleetShip[],
      moves: row.moves as Record<number, string>[],
      by: this.portOf(row.by, {}, people).name,
      target: this.portOf(row.target, {}, people).name,
      ile: at?.store.hub.current().doc.state.houses[at.house]?.ile ?? null,
    };
  }
}
