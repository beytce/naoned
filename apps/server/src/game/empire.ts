import {
  type EmpireCommand,
  type WorldContext,
  type WorldState,
  cashAccount,
  empireQuotes,
  empireView,
} from "@comptoirs/engine";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { toJson } from "./serialize.js";
import type { GameWorld } from "./world.js";

/** Venetia's goods in the socle: what its workshops make, and what they make it from. */
function catalogOf(ctx: WorldContext) {
  const s = ctx.settings.empire;
  const veneto = s?.regions.find((r) => r.code === "veneto");
  if (!veneto) return [];
  const goods = new Set([...Object.keys(veneto.produces), ...Object.keys(veneto.demands)]);
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
    market: empireQuotes(ctx, state, now),
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
  }),
  z.object({
    type: z.literal("empireDeliver"),
    good: z.string().max(40),
    qty: z.number().int().min(1).max(100_000),
  }),
  z.object({ type: z.literal("empireClaim"), index: z.number().int().min(0).max(40) }),
]);

export interface EmpireRouteDeps {
  world: GameWorld;
  requireAccount: (req: FastifyRequest, reply: FastifyReply) => Promise<{ id: string } | null>;
  perMerchant: (max: number) => object;
}

/** The persistent empire's routes (CADRAGE-v3, the socle); a monthly world answers its kind only. */
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
    const res = await world.execute({ type: "empireJoin", playerId: account.id });
    if (!res.ok) return reply.code(409).send({ error: res.error });
    return payload(account.id);
  });

  app.post("/api/empire/actions", deps.perMerchant(300), async (req, reply) => {
    const account = await deps.requireAccount(req, reply);
    if (!account) return;
    if (!isEmpire()) return reply.code(409).send({ error: "not_empire_world" });
    const a = action.parse(req.body);
    const res = await world.execute({ ...a, playerId: account.id } as EmpireCommand);
    if (!res.ok)
      return reply.code(422).send({ error: res.error, ...(payload(account.id) as object) });
    return payload(account.id);
  });
}
