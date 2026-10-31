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

const action = z.discriminatedUnion("type", [
  z.object({ type: z.literal("empireBuildCasa") }),
  z.object({
    type: z.literal("empireBuildWorkshop"),
    workshopType: z.string().max(40),
    recipe: z.string().max(40),
    region: z.string().max(40).optional(),
  }),
  z.object({ type: z.literal("empireUpgrade"), workshopId: z.string().max(32) }),
  z.object({
    type: z.literal("empireRelaunch"),
    workshopId: z.string().max(32),
    recipe: z.string().max(40).optional(),
  }),
  z.object({ type: z.literal("empireRelaunchAll") }),
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
    type: z.literal("empireTransfer"),
    vehicleId: z.string().max(40),
    to: z.string().max(40),
    good: z.string().max(40),
    qty: z.number().int().min(1).max(100_000),
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
  z.object({ type: z.literal("empireBuildArsenal"), cell: z.string().max(12) }),
  z.object({ type: z.literal("empireBuildCamp"), cell: z.string().max(12) }),
  z.object({ type: z.literal("empireBuildDepot"), cell: z.string().max(12) }),
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
  z.object({ type: z.literal("empireUpgradeVehicle"), vehicleType: z.string().max(40) }),
  z.object({ type: z.literal("empireUpgradeCounter"), region: z.string().max(40) }),
  z.object({ type: z.literal("empireBuyVehicle"), vehicleType: z.string().max(40) }),
  z.object({
    type: z.literal("empireVoyage"),
    vehicleId: z.string().max(32),
    from: z.string().max(40),
    to: z.string().max(40),
    good: z.string().max(40),
    qty: z.number().int().min(1).max(100_000),
    insured: z.boolean().optional(),
  }),
  z.object({ type: z.literal("empireResearch"), module: z.string().max(40) }),
  // The sea (CADRAGE-v3 § 3.3): the Arsenal, the Muda, the colleganza.
  z.object({ type: z.literal("empireBuildShip"), vehicleType: z.string().max(40) }),
  z.object({
    type: z.literal("empireFitShip"),
    vehicleId: z.string().max(32),
    slot: z.number().int().min(0).max(8),
    module: z.string().max(40),
  }),
  z.object({
    type: z.literal("empireMudaBid"),
    vehicleId: z.string().max(32),
    amount: z.string().regex(/^\d{1,15}$/),
  }),
  z.object({
    type: z.literal("empireColleganzaOpen"),
    vehicleId: z.string().max(32),
    from: z.string().max(40),
    to: z.string().max(40),
    good: z.string().max(40),
    qty: z.number().int().min(1).max(100_000),
    target: z.string().regex(/^\d{1,15}$/),
  }),
  z.object({
    type: z.literal("empireColleganzaStake"),
    id: z.string().max(40),
    amount: z.string().regex(/^\d{1,15}$/),
  }),
  z.object({ type: z.literal("empireColleganzaWithdraw"), id: z.string().max(40) }),
  z.object({ type: z.literal("empireColleganzaCancel"), id: z.string().max(40) }),
  z.object({
    type: z.literal("empireColleganzaSail"),
    id: z.string().max(40),
    insured: z.boolean().optional(),
  }),
  z.object({ type: z.literal("empireTeam"), depositId: z.string().max(64) }),
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
  perMerchant: (max: number) => object;
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

export function registerEmpireRoutes(app: FastifyInstance, deps: EmpireRouteDeps): void {
  const { world } = deps;
  const isEmpire = () => world.ctx.settings.empire !== undefined;
  const payload = (id: string) => empirePayload(world.ctx, world.current, id, world.now());

  app.get("/api/empire", async (req, reply) => {
    const account = await deps.requireAccount(req, reply);
    if (!account) return;
    if (!isEmpire()) return { kind: "season" };
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
