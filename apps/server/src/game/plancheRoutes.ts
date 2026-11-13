import { maisonLevel, maisonThreshold, maisonUnlocks, plancheStanding } from "@comptoirs/engine";
import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import type { Db } from "../db/client.js";
import {
  accounts,
  influenceEntries,
  maisonEvents,
  plancheAccountLeagues,
  plancheTides,
} from "../db/schema.js";
import { ChatError } from "./chatRules.js";
import { CompanyError } from "./company.js";
import { companyThread, postCompanyMessage, reportCompanyMessage } from "./company.js";
import { GuerreHub } from "./guerre.js";
import type { PasseHub } from "./passe.js";
import { type PlancheAnswer, type PlancheHub, plancheTheme } from "./planche.js";
import { beaconOf, carryBeacon, giveToBeacon, givenToday } from "./plancheBeacon.js";
import {
  compagnieOfCode,
  compagnieView,
  compagniesOnBoard,
  foundCompagnie,
  joinCompagnie,
  leaveCompagnie,
  setCompagnieRole,
} from "./plancheCompany.js";
import { PlancheDefis } from "./plancheDefi.js";
import { gazetteAt, gazetteOf } from "./plancheGazette.js";
import { PlancheLagoons } from "./plancheLagoons.js";
import { companySigns, greet, greetings, laySign, liftSign } from "./plancheSigns.js";
import type { PlancheStore } from "./plancheStore.js";
import { toJson } from "./serialize.js";

export interface PlancheRouteDeps {
  /** The duel rooms of the Passe, where the challenges by the thread are played (H5). */
  passe?: PasseHub;
  /** Told when players should read the board again (the live push). */
  notify?: (players: string[]) => void;
  db: Db;
  now: () => number;
  accountIfAny?: (req: FastifyRequest) => Promise<{ id: string } | null>;
  perMerchant: (max: number) => object;
  secureCookies?: boolean;
  /**
   * Game time against real time: 1 in the game, more to watch a tide go by in a test
   * (`PLANCHE_PACE=60`: an hour of the board a minute).
   */
  pace?: number;
  /** The boards kept in the base; opened here, without their timers, when not given (tests). */
  lagoons?: PlancheLagoons;
}

const STATUS: Record<string, number> = {
  not_seated: 403,
  ile_unknown: 404,
  ile_not_owned: 404,
  planche_unknown: 404,
  planche_no_thread: 404,
  duel_lost: 409,
  duel_illegal: 422,
};
const SAID_STATUS = 409;

/**
 * The shared board on line (docs/plan-planche.md L5, docs/plan-compte.md C3): read one's board,
 * stretch and take back one's threads, set one's toll, build one's island, force a passage by a
 * duel the server replays. With an account only: a house is kept for good.
 */
export function registerPlancheRoutes(app: FastifyInstance, deps: PlancheRouteDeps): void {
  const pace = Math.max(1, deps.pace ?? 1);
  let opened:
    | Promise<{
        lagoons: PlancheLagoons;
        now: () => number;
        defis: PlancheDefis | null;
        guerre: GuerreHub;
      }>
    | undefined;
  /**
   * The boards, and the game's clock: the real one, or faster in a test; it never runs behind
   * what the boards have reached (boards loaded from the base resume where they stopped).
   */
  const boards = () => {
    opened ??= (async () => {
      const lagoons =
        deps.lagoons ?? (await PlancheLagoons.open(deps.db, plancheTheme(), deps.now()));
      const real0 = deps.now();
      const game0 = Math.max(real0, lagoons.reached());
      const now = () => game0 + (deps.now() - real0) * pace;
      // The challenges by the thread (docs/plan-hex-commerce.md H5), on the duel rooms of the Passe.
      const defis = deps.passe
        ? new PlancheDefis(deps.passe, now, deps.notify ? { notify: deps.notify } : {})
        : null;
      // The War of the week (docs/plan-guerre.md W4), across every lagoon.
      const guerre = new GuerreHub(deps.db, lagoons);
      return { lagoons, now, defis, guerre };
    })();
    return opened;
  };
  /** A house is named after its player: Ca' and the account's name. */
  const nameOf = async (id: string) => {
    const [row] = await deps.db
      .select({ pseudo: accounts.pseudo })
      .from(accounts)
      .where(eq(accounts.id, id));
    return `Ca\u2019 ${row?.pseudo ?? "Bembo"}`;
  };
  type Player = {
    id: string;
    name: string;
    hub: PlancheHub;
    store: PlancheStore;
    lagoon: string;
    now: () => number;
    defis: PlancheDefis | null;
  };
  /** The player, with his board and his house (given one if he has none); none without an account. */
  const who = async (
    req: FastifyRequest,
    reply: FastifyReply,
    /** The boards a newcomer is seated on first (its company's lagoons). */
    prefer: string[] = [],
  ): Promise<Player | null> => {
    const account = (await deps.accountIfAny?.(req)) ?? null;
    if (!account) {
      void reply.code(401).send({ error: "not_signed_in" });
      return null;
    }
    const { lagoons, now, defis } = await boards();
    const name = await nameOf(account.id);
    // The leagues of the tides that ended, before the player is seated (docs/plan-maree.md T5).
    await lagoons.turnLeagues(now());
    const { store } = await lagoons.seatOf(account.id, name, now(), prefer);
    return { id: account.id, name, hub: store.hub, store, lagoon: store.name, now, defis };
  };
  const show = async (reply: FastifyReply, p: Player, res: PlancheAnswer = "ok") => {
    if (res !== "ok") return reply.code(STATUS[res] ?? SAID_STATUS).send({ error: res });
    const view = await p.hub.view(p.id, p.name, p.now());
    const defi = p.defis?.view(p.id, deps.now());
    // The companies of the board's houses, for their flags (docs/plan-compagnie.md K1).
    const compagnies = await compagniesOnBoard(deps.db, p.store.worldId);
    // The company's signs of the week, and the greetings received (docs/plan-compagnie.md K2).
    const signs = await companySigns(deps.db, p.id, deps.now());
    const greeted = await greetings(deps.db, p.id, deps.now());
    return toJson({
      planche: {
        ...view,
        lagoon: p.lagoon,
        compagnies,
        signs,
        greeted,
        ...(defi ? { defi } : {}),
      },
    });
  };
  const key = z.string().min(1).max(40);

  app.get("/api/planche", deps.perMerchant(240), async (req, reply) => {
    const p = await who(req, reply);
    return p ? show(reply, p) : reply;
  });
  /**
   * The house's growth (docs/plan-progression-maison.md): its level and title, its Prestige and the
   * week's, what the next levels open, its Livre and its collection.
   */
  app.get("/api/maison", deps.perMerchant(120), async (req, reply) => {
    const p = await who(req, reply);
    if (!p) return reply;
    const M = plancheTheme().board.maison;
    if (!M) return reply.code(404).send({ error: "no_growth" });
    const { doc } = p.hub.current();
    const house = doc.seats[p.id]?.house ?? "";
    const h = doc.state.houses[house];
    const m = h?.maison;
    const prestige = m?.prestige ?? 0;
    const at = maisonLevel(M, prestige);
    const level = h?.level ?? at.level;
    const opens = [];
    for (let n = level + 1; n <= M.maxLevel && opens.length < 4; n++) {
      const before = maisonUnlocks(M, n - 1);
      const after = maisonUnlocks(M, n);
      const what = (Object.keys(after) as (keyof typeof after)[]).filter(
        (k) => after[k] !== before[k],
      );
      if (what.length)
        opens.push({
          level: n,
          at: maisonThreshold(M, n),
          ...Object.fromEntries(what.map((k) => [k, after[k]])),
        });
    }
    const livre = await deps.db
      .select({ kind: maisonEvents.kind, data: maisonEvents.data, at: maisonEvents.at })
      .from(maisonEvents)
      .where(eq(maisonEvents.accountId, p.id))
      .orderBy(desc(maisonEvents.at))
      .limit(30);
    const kept = await deps.db
      .select({ kind: maisonEvents.kind, n: count() })
      .from(maisonEvents)
      .where(eq(maisonEvents.accountId, p.id))
      .groupBy(maisonEvents.kind);
    const [total] = await deps.db
      .select({ sum: sql<number>`coalesce(sum(${influenceEntries.amount}), 0)::int` })
      .from(influenceEntries)
      .where(and(eq(influenceEntries.accountId, p.id), eq(influenceEntries.source, "prestige")));
    return toJson({
      maison: {
        name: p.name,
        house,
        level,
        title: maisonLevel(M, maisonThreshold(M, level)).title,
        prestige,
        from: maisonThreshold(M, level),
        to: level < M.maxLevel ? maisonThreshold(M, level + 1) : null,
        week: m?.week ?? 0,
        carry: m?.carry ?? 0,
        weeklyCap: M.weeklyCap,
        credits: m?.credits ?? [],
        caps: h?.caps ?? maisonUnlocks(M, level),
        opens,
        flags: doc.state.rank.flags[house] ?? [],
        collection: Object.fromEntries(kept.map((k) => [k.kind, Number(k.n)])),
        knots: m?.knots ?? 0,
        // The black straits' relics and the plans not yet spent (docs/plan-muda.md N1).
        relics: h?.relics ?? {},
        plans: h?.plans ?? 0,
        knotToday: !!doc.state.daily?.[Math.floor(p.now() / 86_400_000)]?.[house]?.won,
        /** Every lagoon's Prestige of this account, as its journal of points keeps it. */
        kept: total?.sum ?? 0,
        livre: livre.map((e) => ({ kind: e.kind, data: e.data, at: e.at.getTime() })),
      },
    });
  });
  app.post("/api/planche/thread", deps.perMerchant(60), async (req, reply) => {
    const b = z
      .object({ city: key, good: key, detour: z.boolean().optional() })
      .safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: "invalid_input" });
    const p = await who(req, reply);
    if (!p) return reply;
    return show(
      reply,
      p,
      await p.hub.thread(p.id, b.data.city, b.data.good, p.now(), b.data.detour),
    );
  });
  app.post("/api/planche/unthread", deps.perMerchant(60), async (req, reply) => {
    const b = z.object({ city: key, good: key }).safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: "invalid_input" });
    const p = await who(req, reply);
    if (!p) return reply;
    return show(reply, p, await p.hub.unthread(p.id, b.data.city, b.data.good, p.now()));
  });
  app.post("/api/planche/toll", deps.perMerchant(30), async (req, reply) => {
    const b = z
      .object({ passage: key, tollBps: z.number().int().min(0).max(10_000) })
      .safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: "invalid_input" });
    const p = await who(req, reply);
    if (!p) return reply;
    return show(reply, p, await p.hub.toll(p.id, b.data.passage, b.data.tollBps, p.now()));
  });
  // The island (docs/plan-ile.md I6): its tiles are « x,y » from the Fondaco.
  const tile = z.string().regex(/^-?\d{1,2},-?\d{1,2}$/);
  app.post("/api/planche/ile/buy", deps.perMerchant(60), async (req, reply) => {
    const b = z.object({ at: tile }).safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: "invalid_input" });
    const p = await who(req, reply);
    if (!p) return reply;
    return show(reply, p, await p.hub.buyTile(p.id, b.data.at, p.now()));
  });
  app.post("/api/planche/ile/build", deps.perMerchant(60), async (req, reply) => {
    const b = z.object({ type: key, at: tile }).safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: "invalid_input" });
    const p = await who(req, reply);
    if (!p) return reply;
    return show(reply, p, await p.hub.build(p.id, b.data.type, b.data.at, p.now()));
  });
  app.post("/api/planche/ile/upgrade", deps.perMerchant(60), async (req, reply) => {
    const b = z.object({ at: tile }).safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: "invalid_input" });
    const p = await who(req, reply);
    if (!p) return reply;
    return show(reply, p, await p.hub.upgrade(p.id, b.data.at, p.now()));
  });
  app.post("/api/planche/ile/move", deps.perMerchant(60), async (req, reply) => {
    const b = z.object({ from: tile, to: tile }).safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: "invalid_input" });
    const p = await who(req, reply);
    if (!p) return reply;
    return show(reply, p, await p.hub.move(p.id, b.data.from, b.data.to, p.now()));
  });
  app.post("/api/planche/force", deps.perMerchant(20), async (req, reply) => {
    const b = z
      .object({
        passage: key,
        moves: z
          .array(z.object({ at: z.number().int().min(0).max(400), fire: z.boolean().optional() }))
          .max(200),
      })
      .safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: "invalid_input" });
    const p = await who(req, reply);
    if (!p) return reply;
    const moves = b.data.moves.map((m) =>
      m.fire ? { at: m.at, fire: true as const } : { at: m.at },
    );
    return show(reply, p, await p.hub.force(p.id, b.data.passage, moves, p.now()));
  });
  // A sealed order (docs/plan-hex-commerce.md H2): its position replayed, delivered if won.
  app.post("/api/planche/order", deps.perMerchant(20), async (req, reply) => {
    const b = z
      .object({
        order: key,
        moves: z.array(z.object({ at: z.number().int().min(0).max(400) })).max(40),
      })
      .safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: "invalid_input" });
    const p = await who(req, reply);
    if (!p) return reply;
    const moves = b.data.moves.map((m) => ({ at: m.at }));
    return show(reply, p, await p.hub.order(p.id, b.data.order, moves, p.now()));
  });
  // The problem of the day (docs/plan-hex-commerce.md H3): one try, replayed here.
  app.post("/api/planche/daily", deps.perMerchant(20), async (req, reply) => {
    const b = z
      .object({ moves: z.array(z.object({ at: z.number().int().min(0).max(400) })).max(40) })
      .safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: "invalid_input" });
    const p = await who(req, reply);
    if (!p) return reply;
    const moves = b.data.moves.map((m) => ({ at: m.at }));
    return show(reply, p, await p.hub.daily(p.id, moves, p.now()));
  });
  const duelMoves = z
    .array(z.object({ at: z.number().int().min(0).max(400), fire: z.boolean().optional() }))
    .max(200);
  const asMoves = (ms: z.infer<typeof duelMoves>) =>
    ms.map((m) => (m.fire ? { at: m.at, fire: true as const } : { at: m.at }));
  // A black strait (docs/plan-muda.md N1): a cargo risked, the duel replayed on the day's board.
  app.post("/api/planche/noir", deps.perMerchant(20), async (req, reply) => {
    const b = z
      .object({
        strait: key,
        good: key,
        n: z.number().int().min(1).max(1_000),
        moves: duelMoves,
      })
      .safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: "invalid_input" });
    const p = await who(req, reply);
    if (!p) return reply;
    const { strait, good, n, moves } = b.data;
    return show(reply, p, await p.hub.noir(p.id, strait, { good, n }, asMoves(moves), p.now()));
  });
  // Three relics of a power make a plan.
  app.post("/api/planche/assemble", deps.perMerchant(20), async (req, reply) => {
    const b = z.object({ power: key }).safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: "invalid_input" });
    const p = await who(req, reply);
    if (!p) return reply;
    return show(reply, p, await p.hub.assemble(p.id, b.data.power, p.now()));
  });
  // A sortie met before its hour by the tower's holder (docs/plan-maree.md T5).
  app.post("/api/planche/sortie", deps.perMerchant(20), async (req, reply) => {
    const b = z.object({ id: z.string().min(1).max(80), moves: duelMoves }).safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: "invalid_input" });
    const p = await who(req, reply);
    if (!p) return reply;
    return show(reply, p, await p.hub.sortie(p.id, b.data.id, asMoves(b.data.moves), p.now()));
  });
  // The Doge's decree of the tide (docs/plan-maree.md T5).
  app.post("/api/planche/decret", deps.perMerchant(20), async (req, reply) => {
    const b = z.object({ choice: z.number().int().min(0).max(5) }).safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: "invalid_input" });
    const p = await who(req, reply);
    if (!p) return reply;
    return show(reply, p, await p.hub.decret(p.id, b.data.choice, p.now()));
  });
  // A strait of the Muda (docs/plan-muda.md N2), on Saturday.
  app.post("/api/planche/muda", deps.perMerchant(20), async (req, reply) => {
    const b = z.object({ strait: key, moves: duelMoves }).safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: "invalid_input" });
    const p = await who(req, reply);
    if (!p) return reply;
    return show(reply, p, await p.hub.muda(p.id, b.data.strait, asMoves(b.data.moves), p.now()));
  });
  // The prepared guard (docs/plan-hex-commerce.md H4): links laid in advance on one's tower.
  app.post("/api/planche/guard", deps.perMerchant(20), async (req, reply) => {
    const b = z
      .object({ passage: key, cells: z.array(z.number().int().min(0).max(400)).max(5) })
      .safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: "invalid_input" });
    const p = await who(req, reply);
    if (!p) return reply;
    return show(reply, p, await p.hub.guard(p.id, b.data.passage, b.data.cells, p.now()));
  });
  // The challenge by the thread (docs/plan-hex-commerce.md H5): proposed to a player who is there.
  app.post("/api/planche/defi", deps.perMerchant(20), async (req, reply) => {
    const b = z.object({ house: key }).safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: "invalid_input" });
    const p = await who(req, reply);
    if (!p) return reply;
    if (!p.defis) return reply.code(404).send({ error: "no_defi" });
    return show(reply, p, p.defis.propose(p.store, p.id, p.name, b.data.house, deps.now()));
  });
  app.post("/api/planche/defi/answer", deps.perMerchant(20), async (req, reply) => {
    const b = z.object({ accept: z.boolean() }).safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: "invalid_input" });
    const p = await who(req, reply);
    if (!p) return reply;
    if (!p.defis) return reply.code(404).send({ error: "no_defi" });
    return show(reply, p, p.defis.answer(p.id, p.name, b.data.accept, deps.now()));
  });
  // The Arsenal and the port (docs/plan-arsenal.md A3): goods become ships and defenses.
  const id = z.number().int().min(1).max(1_000_000);
  const pass = z.string().min(1).max(20);
  const slot = z.number().int().min(0).max(10);
  const gesture = <T extends z.ZodTypeAny>(
    path: string,
    schema: T,
    f: (p: Player, b: z.infer<T>) => Promise<PlancheAnswer>,
  ) =>
    app.post(path, deps.perMerchant(60), async (req, reply) => {
      const b = schema.safeParse(req.body);
      if (!b.success) return reply.code(400).send({ error: "invalid_input" });
      const p = await who(req, reply);
      if (!p) return reply;
      return show(reply, p, await f(p, b.data));
    });
  gesture("/api/planche/arsenal/ship", z.object({ kind: key }), (p, b) =>
    p.hub.ship(p.id, b.kind, p.now()),
  );
  gesture("/api/planche/arsenal/refit", z.object({ id }), (p, b) =>
    p.hub.refit(p.id, b.id, p.now()),
  );
  gesture("/api/planche/arsenal/repair", z.object({ id }), (p, b) =>
    p.hub.repair(p.id, b.id, p.now()),
  );
  gesture("/api/planche/port/build", z.object({ pass, kind: key }), (p, b) =>
    p.hub.defense(p.id, b.pass, b.kind, p.now()),
  );
  gesture("/api/planche/port/move", z.object({ from: pass, index: slot, to: pass }), (p, b) =>
    p.hub.defenseMove(p.id, b.from, b.index, b.to, p.now()),
  );
  gesture(
    "/api/planche/port/ruses",
    z.object({ ruses: z.record(pass, z.enum(["chaine", "brulot", "renforts"])) }),
    (p, b) => p.hub.ruses(p.id, b.ruses, p.now()),
  );
  gesture("/api/planche/port/remove", z.object({ pass, index: slot }), (p, b) =>
    p.hub.defenseRemove(p.id, b.pass, b.index, p.now()),
  );
  // The tide and the leagues (docs/plan-maree.md T5): one's league, every lagoon's, the last
  // tide's moves of one's lagoon, the Sérénissime.
  app.get("/api/maree", deps.perMerchant(60), async (req, reply) => {
    const p = await who(req, reply);
    if (!p) return reply;
    const { lagoons } = await boards();
    const [best] = await deps.db
      .select()
      .from(plancheAccountLeagues)
      .where(eq(plancheAccountLeagues.accountId, p.id));
    const tides = await deps.db
      .select()
      .from(plancheTides)
      .where(eq(plancheTides.worldId, p.store.worldId))
      .orderBy(desc(plancheTides.tide))
      .limit(1);
    const last = tides[0];
    const names = async (ids: string[]) =>
      ids.length
        ? (
            await deps.db
              .select({ id: accounts.id, pseudo: accounts.pseudo })
              .from(accounts)
              .where(inArray(accounts.id, ids))
          ).map((a) => `Ca\u2019 ${a.pseudo ?? "Bembo"}`)
        : [];
    const moves = (last?.moves ?? {}) as { up?: string[]; down?: string[] };
    const serenissime = lagoons
      .all()
      .find((s) => lagoons.leagueOf(s) >= lagoons.leagueCount() && lagoons.leagueCount() > 1);
    return toJson({
      maree: {
        league: lagoons.leagueOf(p.store),
        count: lagoons.leagueCount(),
        best: best?.best ?? lagoons.leagueOf(p.store),
        lagoons: lagoons.all().map((s) => ({
          name: s.name,
          league: lagoons.leagueOf(s),
          players: Object.keys(s.hub.current().doc.seats).length,
          mine: s === p.store,
        })),
        last: last
          ? {
              tide: last.tide,
              up: await names(moves.up ?? []),
              down: await names(moves.down ?? []),
              me: moves.up?.includes(p.id) ? "up" : moves.down?.includes(p.id) ? "down" : null,
            }
          : null,
        serenissime: serenissime ? { name: serenissime.name } : null,
      },
    });
  });
  // The Sérénissime, as all may watch it (docs/plan-maree.md T5): its houses, its laurels, its ink.
  app.get("/api/serenissime", deps.perMerchant(60), async (req, reply) => {
    const p = await who(req, reply);
    if (!p) return reply;
    const { lagoons } = await boards();
    const top = lagoons
      .all()
      .find((s) => lagoons.leagueOf(s) >= lagoons.leagueCount() && lagoons.leagueCount() > 1);
    if (!top) return reply.code(404).send({ error: "no_serenissime" });
    const S = top.hub.theme.board;
    const { doc } = top.hub.current();
    const st = doc.state;
    const named = (house: string) =>
      Object.values(doc.seats).find((x) => x.house === house)?.name ??
      S.houses.find((h) => h.id === house)?.name ??
      house;
    return toJson({
      serenissime: {
        name: top.name,
        houses: plancheStanding(S, st)
          .slice(0, 12)
          .map((r) => ({
            name: named(r.house),
            person: st.rank.humans.includes(r.house),
            level: st.houses[r.house]?.level ?? 1,
            place: r.place,
          })),
        laurels: st.rank.laurels
          ? {
              doge: named(st.rank.laurels.doge),
              negoce: st.rank.laurels.negoce ? named(st.rank.laurels.negoce) : null,
              passe: st.rank.laurels.passe ? named(st.rank.laurels.passe) : null,
              garde: st.rank.laurels.garde ? named(st.rank.laurels.garde) : null,
            }
          : null,
        towers: S.passages.map((x) => ({
          name: x.name,
          holder: st.passages[x.id]?.holder.startsWith("corsair:")
            ? null
            : named(st.passages[x.id]?.holder ?? ""),
        })),
        ink: st.encre?.line ?? null,
        players: Object.keys(doc.seats).length,
      },
    });
  });
  // The Gazette of Sunday (docs/plan-muda.md N4): this week's issue, or the last; a past one.
  app.get("/api/gazette", deps.perMerchant(60), async (req, reply) => {
    const p = await who(req, reply);
    if (!p) return reply;
    const g = await gazetteOf(deps.db, p.store, (await boards()).guerre, p.now());
    return toJson({ gazette: { ...g, lagoon: p.lagoon } });
  });
  app.get("/api/gazette/:week", deps.perMerchant(60), async (req, reply) => {
    const w = z.coerce
      .number()
      .int()
      .min(0)
      .safeParse((req.params as { week?: string }).week);
    if (!w.success) return reply.code(400).send({ error: "invalid_input" });
    const p = await who(req, reply);
    if (!p) return reply;
    const issue = await gazetteAt(deps.db, p.store, w.data);
    if (!issue) return reply.code(404).send({ error: "no_gazette" });
    return toJson({ gazette: { issue, lagoon: p.lagoon } });
  });
  // The War of the week (docs/plan-guerre.md W4): the flotillas, today's assault, Sunday.
  const guerreOf = async () => (await boards()).guerre;
  app.get("/api/guerre", deps.perMerchant(120), async (req, reply) => {
    const p = await who(req, reply);
    if (!p) return reply;
    const g = await guerreOf();
    const now = p.now();
    await g.settle(now);
    const house = p.hub.houseOf(p.id) ?? "";
    return toJson({ guerre: await g.view(p.id, p.store, house, now) });
  });
  app.post("/api/guerre/start", deps.perMerchant(20), async (req, reply) => {
    const b = z.object({ target: z.string().min(3).max(80) }).safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: "invalid_input" });
    const p = await who(req, reply);
    if (!p) return reply;
    const g = await guerreOf();
    const res = await g.start(p.id, p.store, p.hub.houseOf(p.id) ?? "", b.data.target, p.now());
    if ("error" in res) return reply.code(409).send(res);
    return toJson({ assaut: res.state, ile: res.ile });
  });
  app.post("/api/guerre/round", deps.perMerchant(60), async (req, reply) => {
    const b = z
      .object({ moves: z.record(z.string().regex(/^\d{1,7}$/), pass) })
      .safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: "invalid_input" });
    const p = await who(req, reply);
    if (!p) return reply;
    const g = await guerreOf();
    const moves = Object.fromEntries(Object.entries(b.data.moves).map(([k, v]) => [Number(k), v]));
    const res = await g.round(p.id, p.id, moves, p.now());
    if ("error" in res) return reply.code(409).send(res);
    return toJson({ assaut: res.state, ...(res.result ? { result: res.result } : {}) });
  });
  // The company on the board (docs/plan-compagnie.md K1, K2): the old game's, taken up.
  const company = async (
    reply: FastifyReply,
    f: () => Promise<unknown>,
  ): Promise<FastifyReply | unknown> => {
    try {
      return await f();
    } catch (e) {
      if (e instanceof CompanyError || e instanceof ChatError)
        return reply.code(e.status).send({ error: e.code });
      throw e;
    }
  };
  /** The company as the player sees it, with its beacon and what the player may still give today. */
  const compagnieOf = async (p: Player) => {
    const c = await compagnieView(deps.db, p.id);
    if (!c) return toJson({ compagnie: null });
    const theme = p.hub.theme;
    return toJson({
      compagnie: {
        ...c,
        phare: {
          ...(await beaconOf(deps.db, theme, c.id)),
          ...(await givenToday(deps.db, theme, p.id, deps.now())),
        },
      },
    });
  };
  app.get("/api/planche/compagnie", deps.perMerchant(120), async (req, reply) => {
    const p = await who(req, reply);
    return p ? compagnieOf(p) : reply;
  });
  app.post("/api/planche/compagnie", deps.perMerchant(10), async (req, reply) => {
    const b = z
      .object({ name: z.string().max(40), flag: z.object({ color: key, symbol: key }) })
      .safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: "invalid_input" });
    const p = await who(req, reply);
    if (!p) return reply;
    return company(reply, async () => {
      await foundCompagnie(deps.db, p.id, b.data.name, b.data.flag, deps.now());
      return compagnieOf(p);
    });
  });
  /** The link of an invitation: the company it names, before joining. */
  app.get("/api/planche/compagnie/invitation/:code", deps.perMerchant(60), async (req, reply) => {
    const c = z.object({ code: z.string().regex(/^[\w-]{4,20}$/) }).safeParse(req.params);
    if (!c.success) return reply.code(400).send({ error: "invalid_input" });
    const found = await compagnieOfCode(deps.db, c.data.code);
    if (!found) return reply.code(404).send({ error: "unknown_company" });
    return toJson({ invitation: { name: found.name } });
  });
  app.post("/api/planche/compagnie/join", deps.perMerchant(10), async (req, reply) => {
    const b = z.object({ code: z.string().regex(/^[\w-]{4,20}$/) }).safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: "invalid_input" });
    // A newcomer is seated in the lagoon of the company that invites it, if it has room.
    const found = await compagnieOfCode(deps.db, b.data.code);
    const p = await who(req, reply, found?.worlds ?? []);
    if (!p) return reply;
    return company(reply, async () => {
      const id = await joinCompagnie(deps.db, p.id, b.data.code, deps.now());
      // The company's beacon is the newcomer's too.
      const { lagoons } = await boards();
      const { level } = await beaconOf(deps.db, p.hub.theme, id);
      await carryBeacon(deps.db, lagoons, id, level, p.now(), p.id);
      return compagnieOf(p);
    });
  });
  app.post("/api/planche/compagnie/leave", deps.perMerchant(10), async (req, reply) => {
    const p = await who(req, reply);
    if (!p) return reply;
    return company(reply, async () => {
      await leaveCompagnie(deps.db, p.id, deps.now());
      const { lagoons } = await boards();
      await carryBeacon(deps.db, lagoons, null, 0, p.now(), p.id);
      return compagnieOf(p);
    });
  });
  app.post("/api/planche/compagnie/role", deps.perMerchant(20), async (req, reply) => {
    const b = z
      .object({
        member: z.string().uuid(),
        role: z.enum(["doge", "capitaine"]).nullable(),
      })
      .safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: "invalid_input" });
    const p = await who(req, reply);
    if (!p) return reply;
    return company(reply, async () => {
      await setCompagnieRole(deps.db, p.id, b.data.member, b.data.role);
      return compagnieOf(p);
    });
  });
  app.get("/api/planche/compagnie/messages", deps.perMerchant(240), async (req, reply) => {
    const p = await who(req, reply);
    if (!p) return reply;
    return company(reply, async () => toJson(await companyThread(deps.db, p.id)));
  });
  app.post("/api/planche/compagnie/messages", deps.perMerchant(60), async (req, reply) => {
    const b = z.object({ body: z.string().max(400) }).safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: "invalid_input" });
    const p = await who(req, reply);
    if (!p) return reply;
    return company(reply, async () => {
      await postCompanyMessage(deps.db, p.id, b.data.body, deps.now());
      return toJson(await companyThread(deps.db, p.id));
    });
  });
  app.post("/api/planche/compagnie/report", deps.perMerchant(30), async (req, reply) => {
    const b = z.object({ message: z.string().uuid() }).safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: "invalid_input" });
    const p = await who(req, reply);
    if (!p) return reply;
    return company(reply, async () => {
      await reportCompanyMessage(deps.db, p.id, b.data.message, deps.now());
      return toJson(await companyThread(deps.db, p.id));
    });
  });
  // The signs (docs/plan-compagnie.md K2): the company's on the board, a neighbour's greetings.
  app.post("/api/planche/sign", deps.perMerchant(30), async (req, reply) => {
    const b = z.object({ kind: key, target: z.string().max(100) }).safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: "invalid_input" });
    const p = await who(req, reply);
    if (!p) return reply;
    return company(reply, async () => {
      await laySign(deps.db, p.id, p.store.worldId, b.data.kind, b.data.target, deps.now());
      return show(reply, p);
    });
  });
  app.post("/api/planche/sign/lift", deps.perMerchant(30), async (req, reply) => {
    const b = z.object({ kind: key }).safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: "invalid_input" });
    const p = await who(req, reply);
    if (!p) return reply;
    await liftSign(deps.db, p.id, b.data.kind);
    return show(reply, p);
  });
  app.post("/api/planche/greet", deps.perMerchant(30), async (req, reply) => {
    const b = z.object({ house: key, kind: key }).safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: "invalid_input" });
    const p = await who(req, reply);
    if (!p) return reply;
    return company(reply, async () => {
      const to = await greet(deps.db, p.id, p.store.worldId, b.data.house, b.data.kind, deps.now());
      deps.notify?.([to]);
      return show(reply, p);
    });
  });
  // The company's beacon (docs/plan-compagnie.md K4): goods given, capped a day.
  app.post("/api/planche/compagnie/phare", deps.perMerchant(30), async (req, reply) => {
    const b = z
      .object({ goods: z.record(key, z.number().int().min(1).max(1_000)) })
      .safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: "invalid_input" });
    const p = await who(req, reply);
    if (!p) return reply;
    return company(reply, async () => {
      const { lagoons } = await boards();
      await giveToBeacon(deps.db, lagoons, p.hub.theme, p.id, b.data.goods, deps.now(), p.now());
      return compagnieOf(p);
    });
  });
  /** An assault of the War seen again (docs/plan-guerre.md): by its assailant or its port's master. */
  app.get("/api/guerre/assault/:id", deps.perMerchant(60), async (req, reply) => {
    const q = z.object({ id: z.coerce.number().int().min(1) }).safeParse(req.params);
    if (!q.success) return reply.code(400).send({ error: "invalid_input" });
    const p = await who(req, reply);
    if (!p) return reply;
    const g = await guerreOf();
    const me = `${p.store.worldId}:${p.hub.houseOf(p.id) ?? ""}`;
    const replay = await g.replay(p.id, me, q.data.id);
    if (!replay) return reply.code(404).send({ error: "unknown_assault" });
    return toJson({ replay });
  });
}
