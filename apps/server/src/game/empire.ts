import { randomBytes } from "node:crypto";
import {
  type EmpireCommand,
  type WorldContext,
  type WorldState,
  advanceTerra,
  carnetWeek,
  cashAccount,
  empireQuotes,
  empireView,
  terraWeekStart,
} from "@comptoirs/engine";
import { eq, inArray } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import type { Db } from "../db/client.js";
import { accounts, companyMembers } from "../db/schema.js";
import { BattleHub, guestId, isGuest } from "./battle.js";
import { balanceOf } from "./house.js";
import { toJson } from "./serialize.js";
import { type TerraName, terraView } from "./terra.js";
import { terraActionSchemas } from "./terraActions.js";
import type { GameWorld } from "./world.js";

/** The goods of the empire's regions: what their workshops make, and what they make it from. */
function catalogOf(ctx: WorldContext) {
  const regions = ctx.settings.empire?.regions ?? [];
  const goods = new Set(
    regions.flatMap((r) => [...Object.keys(r.produces), ...Object.keys(r.demands)]),
  );
  const useful = ctx.theme.recipes.filter((r) => Object.keys(r.outputs).some((g) => goods.has(g)));
  // One step up the chains: what those recipes need (the flour of the bread).
  for (const r of useful) for (const g of Object.keys(r.inputs)) goods.add(g);
  const recipes = ctx.theme.recipes.filter((r) => Object.keys(r.outputs).some((g) => goods.has(g)));
  return [...new Set(recipes.map((r) => r.building))].map((type) => ({
    type,
    name: ctx.theme.buildings.find((b) => b.type === type)?.name ?? type,
    recipes: recipes
      .filter((r) => r.building === type)
      .map((r) => ({
        code: r.code,
        inputs: r.inputs,
        outputs: r.outputs,
        minutes: r.durationMinutes,
      })),
  }));
}

/** The house's view of the empire: itself, its treasury and stock, Venetia's market. */
export function empirePayload(ctx: WorldContext, state: WorldState, playerId: string, now: number) {
  const view = empireView(ctx, state, playerId, now);
  const inv = state.inventories[playerId] ?? {};
  return toJson({
    kind: "empire",
    now,
    joined: view !== null,
    view,
    cash: state.accounts[cashAccount(playerId)] ?? 0n,
    stock: Object.fromEntries(Object.entries(inv).map(([g, l]) => [g, l.available])),
    market: empireQuotes(ctx, state, now, playerId),
    catalog: catalogOf(ctx),
    casa: (ctx.settings.empire?.casa ?? []).map((c, i) => ({ level: i + 1, opens: c.opens })),
    goods: Object.fromEntries(ctx.theme.resources.map((r) => [r.code, r.name])),
  });
}

const id = z.string().max(32);
const coord = z.number().int().min(0).max(16);
const rot = z.number().int().min(0).max(3);
/** The commands of the workshops' insides: what the client may send, nothing more. */
const interiorActions = [
  z.object({
    type: z.literal("empireInteriorPlace"),
    workshopId: id,
    kind: z.string().max(40),
    x: coord,
    y: coord,
    rot,
  }),
  z.object({
    type: z.literal("empireInteriorMove"),
    workshopId: id,
    stationId: id,
    x: coord,
    y: coord,
    rot,
  }),
  z.object({ type: z.literal("empireInteriorRemove"), workshopId: id, stationId: id }),
  z.object({ type: z.literal("empireInteriorUpgrade"), workshopId: id, stationId: id }),
  z.object({
    type: z.literal("empireInteriorLink"),
    workshopId: id,
    from: id,
    to: id,
    via: z
      .array(z.tuple([coord, coord]))
      .min(1)
      .max(64),
  }),
  z.object({ type: z.literal("empireInteriorUnlink"), workshopId: id, from: id, to: id }),
  z.object({
    type: z.literal("empireInteriorBuffer"),
    workshopId: id,
    link: z.string().max(81),
    size: z.number().int().min(0).max(64),
  }),
  z.object({
    type: z.literal("empireInteriorCare"),
    workshopId: id,
    stationId: id,
    care: z.number().int().min(0).max(10_000),
  }),
  z.object({
    type: z.literal("empireInteriorMaintain"),
    workshopId: id,
    stationId: id.optional(),
  }),
  z.object({ type: z.literal("empireInteriorHire"), workshopId: id, trade: z.string().max(40) }),
  z.object({
    type: z.literal("empireInteriorAssign"),
    workshopId: id,
    handId: id,
    stationId: id.nullable(),
    shift: z.enum(["day", "night"]),
  }),
] as const;

const action = z.discriminatedUnion("type", [
  z.object({ type: z.literal("empireBuildCasa") }),
  z.object({
    type: z.literal("empireBuildWorkshop"),
    workshopType: z.string().max(40),
    recipe: z.string().max(40),
    region: z.string().max(40).optional(),
    /** On square tiles, the house's free tile it stands on (docs/plan-porcellana.md D7). */
    tile: z.string().max(12).optional(),
  }),
  z.object({ type: z.literal("empireUpgrade"), workshopId: z.string().max(32) }),
  z.object({
    type: z.literal("empireRelaunch"),
    workshopId: z.string().max(32),
    recipe: z.string().max(40).optional(),
  }),
  z.object({ type: z.literal("empireRelaunchAll") }),
  z.object({
    type: z.literal("empireSetPriority"),
    workshopId: z.string().max(32),
    priority: z.enum(["high", "normal", "low"]),
  }),
  // The workshops' insides (docs/plan-ateliers.md § 5.5).
  ...interiorActions,
  z.object({
    type: z.literal("empireSell"),
    good: z.string().max(40),
    qty: z.number().int().min(1).max(100_000),
    region: z.string().max(40).optional(),
  }),
  z.object({
    type: z.literal("empireDeliver"),
    good: z.string().max(40),
    qty: z.number().int().min(1).max(100_000),
    region: z.string().max(40).optional(),
    city: z.string().max(40).optional(),
  }),
  z.object({
    type: z.literal("empireMove"),
    vehicleId: z.string().max(40),
    to: z.string().max(60),
  }),
  z.object({ type: z.literal("empireDepartNow"), vehicleId: z.string().max(40) }),
  z.object({
    type: z.literal("empireDeliverCity"),
    city: z.string().max(40),
    orderIds: z.array(z.string().max(60)).max(20).optional(),
  }),
  // A round drawn by finger (the gameplay audit, P1): fifteen stops at most, as the engine.
  z.object({
    type: z.literal("empireRound"),
    vehicleId: z.string().max(40),
    stops: z
      .array(z.object({ city: z.string().max(40), orderIds: z.array(z.string().max(60)).max(20) }))
      .min(1)
      .max(15),
  }),
  z.object({ type: z.literal("empireRecall"), vehicleId: z.string().max(40) }),
  z.object({ type: z.literal("empireSettle") }),
  z.object({ type: z.literal("empireHaste") }),
  z.object({ type: z.literal("empireEmbellish"), code: z.string().max(40) }),
  z.object({ type: z.literal("empireCancelStop"), vehicleId: z.string().max(40) }),
  z.object({
    type: z.literal("empireFitVehicle"),
    vehicleId: z.string().max(40),
    slot: z.number().int().min(0).max(9),
    module: z.string().max(40).nullable(),
  }),
  z.object({
    type: z.literal("empireLoadOrder"),
    vehicleId: z.string().max(40),
    city: z.string().max(40),
    orderId: z.string().max(60),
  }),
  z.object({
    type: z.literal("empireUnloadOrder"),
    vehicleId: z.string().max(40),
    orderId: z.string().max(60),
  }),
  z.object({
    type: z.literal("empireBuy"),
    good: z.string().max(40),
    qty: z.number().int().min(1).max(100_000),
    post: z.string().max(40).optional(),
  }),
  z.object({ type: z.literal("empireClaim"), index: z.number().int().min(0).max(40) }),
  z.object({
    type: z.literal("empirePlaceCounter"),
    cell: z.string().max(12),
    x: z.number().int().min(-10_000).max(10_000).optional(),
    y: z.number().int().min(-10_000).max(10_000).optional(),
  }),
  z.object({ type: z.literal("empireBuildCamp"), cell: z.string().max(12) }),
  z.object({ type: z.literal("empireUnlockCell"), cell: z.string().max(12) }),
  z.object({ type: z.literal("empireBuildDepot"), cell: z.string().max(12) }),
  z.object({ type: z.literal("empireUpgradeDepot") }),
  z.object({
    type: z.literal("empirePlaceHome"),
    cell: z.string().max(12),
    x: z.number().int(),
    y: z.number().int(),
  }),
  // The Porta (docs/plan-porta.md): its arms at the Remise, the building, the way, the antiquarian.
  z.object({ type: z.literal("empireBuyArm"), model: z.string().max(40) }),
  z.object({ type: z.literal("empireUpgradeArm"), model: z.string().max(40) }),
  z.object({ type: z.literal("empireBuyComponent"), code: z.string().max(40) }),
  z.object({ type: z.literal("empireUpgradeComponent"), componentId: z.string().max(32) }),
  z.object({
    type: z.literal("empireFitArm"),
    vehicleId: z.string().max(32),
    slot: z.number().int().min(0).max(8),
    componentId: z.string().max(32).nullable(),
  }),
  z.object({ type: z.literal("empireBuildPorta"), cell: z.string().max(12) }),
  z.object({ type: z.literal("empireUpgradePorta") }),
  z.object({
    type: z.literal("empireSendToPorta"),
    vehicleIds: z.array(z.string().max(32)).min(1).max(10),
  }),
  z.object({
    type: z.literal("empireRecallFromPorta"),
    vehicleIds: z.array(z.string().max(32)).min(1).max(10),
  }),
  z.object({
    type: z.literal("empireSellRelics"),
    rarity: z.enum(["common", "rare", "precious", "legendary"]),
    qty: z.number().int().min(1).max(10_000),
  }),
  z.object({
    type: z.literal("empireDecipherRelic"),
    rarity: z.enum(["common", "rare", "precious", "legendary"]),
    kind: z.enum(["weapon", "defense", "support"]),
  }),
  z.object({ type: z.literal("empireUpgradeVehicle"), vehicleType: z.string().max(40) }),
  z.object({ type: z.literal("empireUpgradeCounter"), region: z.string().max(40) }),
  z.object({ type: z.literal("empireBuyVehicle"), vehicleType: z.string().max(40) }),
  z.object({ type: z.literal("empireResearch"), module: z.string().max(40) }),
  z.object({
    type: z.literal("empireFit"),
    workshopId: z.string().max(32),
    slot: z.number().int().min(0).max(8),
    module: z.string().max(40),
  }),
  z.object({
    type: z.literal("empireCourt"),
    good: z.string().max(60),
    qty: z.number().int().min(1).max(100_000),
  }),
  z.object({ type: z.literal("empireSwap"), a: z.string().max(32), b: z.string().max(32) }),
  z.object({
    type: z.literal("empireChooseArte"),
    arte: z.string().max(40),
    minor: z.boolean().optional(),
  }),
  z.object({ type: z.literal("empireLearn"), code: z.string().max(40) }),
  z.object({ type: z.literal("empireHire"), role: z.string().max(40) }),
  z.object({ type: z.literal("empirePlace"), staffId: z.string().max(32), at: z.string().max(40) }),
  z.object({
    type: z.literal("empireSkill"),
    staffId: z.string().max(32),
    path: z.number().int().min(0).max(8),
  }),
  z.object({ type: z.literal("empireLineage"), trait: z.string().max(40) }),
  z.object({
    type: z.literal("empireAsk"),
    good: z.string().max(60),
    qty: z.number().int().min(1).max(100_000),
  }),
  z.object({ type: z.literal("empireSupply"), requestId: z.string().max(80) }),
  // The Terraferma's theatres (CADRAGE-v3 § 8): the cote comes from the server.
  z.object({ type: z.literal("empireTerraJoin") }),
  z.object({
    type: z.literal("empireTerra"),
    action: z.discriminatedUnion("type", [...terraActionSchemas]),
  }),
]);

export interface EmpireRouteDeps {
  db: Db;
  world: GameWorld;
  requireAccount: (req: FastifyRequest, reply: FastifyReply) => Promise<{ id: string } | null>;
  /** The session's account, or null without one (a public page). */
  accountIfAny?: (req: FastifyRequest) => Promise<{ id: string } | null>;
  perMerchant: (max: number) => object;
  /** The cookies kept to HTTPS (production): the Battle's guest's (B4). */
  secureCookies?: boolean;
}

/** The persistent empire's routes (CADRAGE-v3, the socle); a monthly world answers its kind only. */
/**
 * The account's company as the engine keeps it (CADRAGE-v3 § 7): written by the server on each
 * action, never by the client (the schema drops any `company` it sends).
 */
async function companyTag(db: Db, accountId: string) {
  const [row] = await db
    .select({ id: companyMembers.companyId, since: companyMembers.joinedAt })
    .from(companyMembers)
    .where(eq(companyMembers.accountId, accountId));
  return row ? { id: row.id, since: row.since.getTime() } : null;
}

async function ratingOf(db: Db, accountId: string): Promise<number> {
  const [row] = await db
    .select({ rating: accounts.terraRating })
    .from(accounts)
    .where(eq(accounts.id, accountId));
  return row?.rating ?? 1_000;
}

/**
 * The house's theatre as a map of the Terraferma (CADRAGE-v3 § 8): its map advanced to now on a
 * copy (the reading changes nothing), seen through the Terraferma's own view, its companions
 * marked friends.
 */
async function theatreView(db: Db, world: GameWorld, accountId: string) {
  const t = world.current.empire?.terra;
  const th =
    t?.week === carnetWeek(world.now())
      ? t.theatres.find((x) => x.members.includes(accountId))
      : undefined;
  if (!t || !th) return null;
  const map = structuredClone(th.map) as typeof th.map;
  advanceTerra(map, th.cfg, Math.min(world.now(), terraWeekStart(t.week + 1)));
  const ids = th.members;
  const rows =
    ids.length === 0
      ? []
      : await db
          .select({ id: accounts.id, pseudo: accounts.pseudo, crest: accounts.crest })
          .from(accounts)
          .where(inArray(accounts.id, ids));
  const mine = world.current.empire?.houses[accountId]?.company;
  const names = new Map<string, TerraName>(
    rows.map((r) => [
      r.id,
      {
        pseudo: r.pseudo,
        crest: r.crest,
        bot: false,
        friend: !!mine && world.current.empire?.houses[r.id]?.company === mine,
      },
    ]),
  );
  const ctx: WorldContext = {
    ...world.ctx,
    settings: { ...world.ctx.settings, terraferma: { ...th.cfg, live: true } },
  };
  const state = {
    ...world.current,
    terra: { week: t.week, map },
  } as WorldState;
  const view = terraView(ctx, state, accountId, world.now(), names);
  return view
    ? {
        theatre: { id: th.id, band: th.band, kind: th.kind, companies: th.companies ?? [] },
        view,
      }
    : null;
}

/** The Battle's orders (lot T6b): the week's, on the match's map (no placing, no decree). */
const BATTLE_ORDERS = new Set([
  "terraFront",
  "terraRecall",
  "terraBuild",
  "terraRaise",
  "terraFire",
  "terraAlly",
  "terraAccept",
  "terraBreak",
  "terraSend",
  "terraSignal",
]);

export function registerEmpireRoutes(app: FastifyInstance, deps: EmpireRouteDeps): void {
  const { world } = deps;
  const isEmpire = () => world.ctx.settings.empire !== undefined;
  // The Battle (lot T6b): its lobby always open, its matches in memory.
  const battle = new BattleHub(deps.db, world);
  if (isEmpire()) battle.start();
  app.addHook("onClose", async () => battle.stop());
  // Who plays the Battle (B4): the account of the session, else a guest by its cookie, given on
  // the first read; nobody else may write to a match.
  const GUEST = "fondaco_guest";
  const guestOf = (req: FastifyRequest) => {
    const token = req.cookies[GUEST];
    return token && /^[A-Za-z0-9_-]{20,64}$/.test(token) ? guestId(token) : null;
  };
  const player = async (req: FastifyRequest, reply: FastifyReply, give = false) => {
    const account = (await deps.accountIfAny?.(req)) ?? null;
    if (account) return account.id;
    const guest = guestOf(req);
    if (guest) return guest;
    if (give) {
      const token = randomBytes(24).toString("base64url");
      reply.setCookie(GUEST, token, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: deps.secureCookies ?? false,
        maxAge: 30 * 86_400,
      });
      return guestId(token);
    }
    reply.code(401).send({ error: "unauthenticated" });
    return null;
  };
  app.get("/api/empire/battle", async (req, reply) => {
    if (!isEmpire()) return reply.code(409).send({ error: "not_empire_world" });
    const id = await player(req, reply, true);
    if (!id) return;
    // Signed in from a guest's browser: the account takes its cote, the guest is let go.
    const guest = guestOf(req);
    if (guest && !isGuest(id)) {
      await battle.adopt(guest, id);
      reply.clearCookie(GUEST, { path: "/" });
    }
    const state = await battle.state(id, world.now());
    // A cote just moved is read once written.
    await battle.flush();
    return toJson({ battle: state });
  });
  const answer = async (reply: FastifyReply, id: string, res: string) => {
    if (res === "no_battle_room") return reply.code(404).send({ error: res });
    if (res === "not_host") return reply.code(403).send({ error: res });
    if (res !== "ok") return reply.code(409).send({ error: res });
    return toJson({ battle: await battle.state(id, world.now()) });
  };
  app.post("/api/empire/battle/join", deps.perMerchant(30), async (req, reply) => {
    if (!isEmpire()) return reply.code(409).send({ error: "not_empire_world" });
    const id = await player(req, reply);
    if (!id) return;
    const body = z
      .object({
        room: z
          .string()
          .regex(/^[A-Za-z2-9]{6}$/)
          .optional(),
      })
      .safeParse(req.body ?? {});
    if (!body.success) return reply.code(400).send({ error: "invalid_input" });
    return answer(reply, id, await battle.join(id, world.now(), body.data.room));
  });
  // A private room (B4): opened, its code shared, launched by its host.
  app.post("/api/empire/battle/room", deps.perMerchant(30), async (req, reply) => {
    if (!isEmpire()) return reply.code(409).send({ error: "not_empire_world" });
    const id = await player(req, reply);
    if (!id) return;
    return answer(reply, id, battle.openRoom(id, world.now()));
  });
  app.post("/api/empire/battle/room/start", deps.perMerchant(30), async (req, reply) => {
    const id = await player(req, reply);
    if (!id) return;
    return answer(reply, id, await battle.startRoom(id, world.now()));
  });
  // The public ranking of the Battle's cotes (B3): no account needed to read it.
  app.get("/api/empire/battle/ranking", async (req) => {
    const me = (await deps.accountIfAny?.(req)) ?? null;
    await battle.flush();
    return toJson({ ranking: await battle.ranking(me?.id ?? null) });
  });
  app.post("/api/empire/battle/leave", deps.perMerchant(30), async (req, reply) => {
    const id = await player(req, reply);
    if (!id) return;
    battle.leave(id);
    return toJson({ battle: await battle.state(id, world.now()) });
  });
  app.post("/api/empire/battle/act", deps.perMerchant(120), async (req, reply) => {
    const id = await player(req, reply);
    if (!id) return;
    const parsed = z
      .object({ action: z.discriminatedUnion("type", [...terraActionSchemas]) })
      .safeParse(req.body);
    if (!parsed.success || !BATTLE_ORDERS.has(parsed.data.action.type))
      return reply.code(400).send({ error: "invalid_action" });
    const ok = battle.act(id, parsed.data.action as never, world.now());
    return toJson({ ok, battle: await battle.state(id, world.now()) });
  });
  const payload = (id: string) => empirePayload(world.ctx, world.current, id, world.now());

  app.get("/api/empire", async (req, reply) => {
    const account = await deps.requireAccount(req, reply);
    if (!account) return;
    if (!isEmpire()) return { kind: "season" };
    // A trip that arrived while the house was away is settled at the reading (CADRAGE-v3 § 13,
    // step 4; the players' audit of 7 November 2026, QA-04): the delivery is paid on return.
    const now = world.now();
    const view = empireView(world.ctx, world.current, account.id, now);
    const due = (view?.vehicles?.mine ?? []).some((v) => v.legs.some((l) => l.arrivesAt <= now));
    if (due) await world.execute({ type: "empireSettle", playerId: account.id });
    return payload(account.id);
  });

  app.post("/api/empire/join", deps.perMerchant(30), async (req, reply) => {
    const account = await deps.requireAccount(req, reply);
    if (!account) return;
    if (!isEmpire()) return reply.code(409).send({ error: "not_empire_world" });
    // The Influence of the monthly seasons becomes Favour, one for one (CADRAGE-v3 § 12).
    const { influence } = await balanceOf(deps.db, account.id);
    const res = await world.execute({
      type: "empireJoin",
      playerId: account.id,
      ...(influence > 0 ? { favour: influence } : {}),
      company: await companyTag(deps.db, account.id),
    });
    if (!res.ok) return reply.code(409).send({ error: res.error });
    return payload(account.id);
  });

  app.get("/api/empire/terra", async (req, reply) => {
    const account = await deps.requireAccount(req, reply);
    if (!account) return;
    if (!isEmpire()) return reply.code(409).send({ error: "not_empire_world" });
    return toJson({ terra: await theatreView(deps.db, world, account.id) });
  });

  // The Contesa's roster (CADRAGE-v3 § 7): the Capo or a Consigliere sets it, for partners only.
  app.post("/api/empire/contesa/roster", deps.perMerchant(30), async (req, reply) => {
    const account = await deps.requireAccount(req, reply);
    if (!account) return;
    if (!isEmpire()) return reply.code(409).send({ error: "not_empire_world" });
    const parsed = z
      .object({ members: z.array(z.string().uuid()).min(1).max(30) })
      .safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "roster_size" });
    const rows = await deps.db
      .select({
        id: companyMembers.accountId,
        company: companyMembers.companyId,
        role: companyMembers.role,
      })
      .from(companyMembers)
      .where(inArray(companyMembers.accountId, [account.id, ...parsed.data.members]));
    const me = rows.find((r) => r.id === account.id);
    if (!me || (me.role !== "capo" && me.role !== "consigliere"))
      return reply.code(403).send({ error: "not_capo" });
    const company = await companyTag(deps.db, account.id);
    const res = await world.execute({
      type: "empireContesaRoster",
      playerId: account.id,
      members: parsed.data.members,
      company,
    });
    if (!res.ok)
      return reply.code(422).send({ error: res.error, ...(payload(account.id) as object) });
    return payload(account.id);
  });

  app.post("/api/empire/actions", deps.perMerchant(300), async (req, reply) => {
    const account = await deps.requireAccount(req, reply);
    if (!account) return;
    if (!isEmpire()) return reply.code(409).send({ error: "not_empire_world" });
    const a = action.parse(req.body);
    const company = await companyTag(deps.db, account.id);
    const extra =
      a.type === "empireTerraJoin" ? { rating: await ratingOf(deps.db, account.id) } : {};
    const res = await world.execute({
      ...a,
      ...extra,
      playerId: account.id,
      company,
    } as EmpireCommand);
    if (!res.ok)
      return reply.code(422).send({ error: res.error, ...(payload(account.id) as object) });
    return payload(account.id);
  });
}
