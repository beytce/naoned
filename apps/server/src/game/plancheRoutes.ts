import { maisonLevel, maisonThreshold, maisonUnlocks } from "@comptoirs/engine";
import { and, count, desc, eq, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import type { Db } from "../db/client.js";
import { accounts, influenceEntries, maisonEvents } from "../db/schema.js";
import type { PasseHub } from "./passe.js";
import { type PlancheAnswer, type PlancheHub, plancheTheme } from "./planche.js";
import { PlancheDefis } from "./plancheDefi.js";
import { PlancheLagoons } from "./plancheLagoons.js";
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
    | Promise<{ lagoons: PlancheLagoons; now: () => number; defis: PlancheDefis | null }>
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
      return { lagoons, now, defis };
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
  const who = async (req: FastifyRequest, reply: FastifyReply): Promise<Player | null> => {
    const account = (await deps.accountIfAny?.(req)) ?? null;
    if (!account) {
      void reply.code(401).send({ error: "not_signed_in" });
      return null;
    }
    const { lagoons, now, defis } = await boards();
    const name = await nameOf(account.id);
    const { store } = await lagoons.seatOf(account.id, name, now());
    return { id: account.id, name, hub: store.hub, store, lagoon: store.name, now, defis };
  };
  const show = async (reply: FastifyReply, p: Player, res: PlancheAnswer = "ok") => {
    if (res !== "ok") return reply.code(STATUS[res] ?? SAID_STATUS).send({ error: res });
    const view = await p.hub.view(p.id, p.name, p.now());
    const defi = p.defis?.view(p.id, deps.now());
    return toJson({ planche: { ...view, lagoon: p.lagoon, ...(defi ? { defi } : {}) } });
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
  gesture("/api/planche/port/remove", z.object({ pass, index: slot }), (p, b) =>
    p.hub.defenseRemove(p.id, b.pass, b.index, p.now()),
  );
}
