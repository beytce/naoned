import { useState } from "react";
import { BuildingArt } from "../art/buildings.js";
import { ResourceIcon } from "../art/resources.js";
import { fr } from "../i18n.js";
import { Badge, Big, Label, Panel, Qty, Ribbon, Sheet, Slab, clock } from "../ui.js";
import type { GameProps } from "./Game.js";
import { Ledger } from "./Ledger.js";
import { d } from "./format.js";
import type { BuildingView, Cost, PlayerView, Recipe } from "./types.js";

export function have(view: PlayerView, resource: string) {
  return view.inventory.find((i) => i.resource === resource)?.available ?? 0;
}

export function affordable(view: PlayerView, cost: Cost): boolean {
  if (BigInt(view.cash) < BigInt(cost.ducats)) return false;
  return Object.entries(cost.materials).every(([r, q]) => have(view, r) >= q);
}

function readyOf(b: BuildingView, now: number) {
  if (!b.job) return 0;
  return Math.min(b.job.batches, Math.floor((now - b.job.startedAt) / b.job.batchMs));
}

function recipeOf(props: GameProps, type: string): Recipe | null {
  return props.catalog.buildings.find((x) => x.type === type)?.recipe ?? null;
}

/** Quantity produced per batch, with the regional bonus. */
/** Output of one batch: base × level, with the region's and the level's yield bonuses. */
function outputQty(props: GameProps, resource: string, base: number, level = 1) {
  const region = props.catalog.regions.find((r) => r.code === props.view.player.region);
  let bonus = (level - 1) * props.catalog.rules.levelYieldBonusBps;
  if (region?.bonusResource === resource) bonus += props.catalog.rules.regionBonusBps;
  return Math.floor((base * (10_000 + bonus)) / 10_000);
}

/** "10 [clay] → 6 [bricks]" with icons. */
function RecipeFlow({ recipe, level, props }: { recipe: Recipe; level: number; props: GameProps }) {
  const side = (m: Record<string, number>, out: boolean) =>
    Object.entries(m).map(([r, q]) => (
      <span key={r} className="inline-flex items-center gap-1">
        <span className="font-display text-sm font-semibold tabular-nums">
          {out ? outputQty(props, r, q * level, level) : q * level}
        </span>
        <ResourceIcon code={r} size={22} />
      </span>
    ));
  const inputs = side(recipe.inputs, false);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {inputs.length > 0 && (
        <>
          {inputs}
          <span className="text-gold">→</span>
        </>
      )}
      {side(recipe.outputs, true)}
      {props.view.rations.hungryUntil > props.now ? (
        <span className="label ml-1 text-vermilion">
          {(recipe.durationMinutes * (10_000 + props.catalog.rations.slowdownBps)) / 600_000} h ·{" "}
          {fr.game.rations.slower}
        </span>
      ) : (
        <span className="label ml-1">{recipe.durationMinutes / 60} h</span>
      )}
    </div>
  );
}

export function CostList({ cost, props }: { cost: Cost; props: GameProps }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="font-display text-sm font-semibold">{d(cost.ducats)}</span>
      {Object.entries(cost.materials).map(([r, q]) => {
        const ok = have(props.view, r) >= q;
        return (
          <span key={r} className={`inline-flex items-center gap-1 ${ok ? "" : "text-vermilion"}`}>
            <ResourceIcon code={r} size={20} />
            <span className="font-display text-sm font-semibold tabular-nums">
              {Math.min(have(props.view, r), q)}/{q}
            </span>
          </span>
        );
      })}
    </div>
  );
}

function Hero(props: GameProps) {
  const { view, now } = props;
  const ready = view.buildings.reduce((n, b) => n + readyOf(b, now), 0);
  const running = view.buildings
    .filter((b) => b.job && readyOf(b, now) < b.job.batches)
    .map((b) => {
      const job = b.job;
      if (!job) return { b, at: Number.POSITIVE_INFINITY };
      return { b, at: job.startedAt + (readyOf(b, now) + 1) * job.batchMs };
    })
    .sort((x, y) => x.at - y.at)[0];

  if (ready > 0) {
    return (
      <Panel glow="gold" className="animate-rise">
        <div className="flex items-center gap-3">
          <div className="flex-1 space-y-3">
            <Label className="text-gold">{fr.game.readyNow}</Label>
            <Slab
              size="lg"
              className="w-full"
              coach="harvest-all"
              disabled={props.busy}
              onClick={() => props.act({ type: "collectAndRestart" })}
            >
              {fr.game.harvestAll(ready)}
            </Slab>
          </div>
        </div>
      </Panel>
    );
  }
  if (running) {
    return (
      <div className="relative overflow-hidden py-2 text-center">
        <BuildingArt type={running.b.type} active className="mx-auto h-28 w-40 animate-floaty" />
        <Label className="mt-2">{fr.game.nextBatch}</Label>
        <Big className="mt-1 text-6xl text-cream">{clock(running.at - now)}</Big>
        <p className="mt-2 font-mono text-xs uppercase tracking-widest text-lagoon">
          {props.names.building(running.b.type)}
        </p>
      </div>
    );
  }
  return (
    <Panel>
      <Label className="text-vermilion">{fr.game.idleAll}</Label>
      <p className="mt-2 text-sm text-cream-dim">{fr.game.idleAllHelp}</p>
      {props.view.buildings.some((b) => b.canStart > 0) && (
        <Slab
          className="mt-3 w-full"
          disabled={props.busy}
          onClick={() => props.act({ type: "collectAndRestart" })}
        >
          {fr.game.restartAll}
        </Slab>
      )}
    </Panel>
  );
}

/** The season goal, always in sight: rank, net worth, next title, time left. */
function Goal(props: GameProps) {
  const { standing, netWorth } = props.view;
  const next = standing.title.next;
  return (
    <button type="button" className="block w-full text-left" onClick={() => props.goTo("top")}>
      <Panel glow="gold">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Label className="text-gold">{fr.game.goal.kicker}</Label>
            <p className="mt-1 font-display text-base font-extrabold uppercase leading-tight">
              {fr.game.goal.title}
            </p>
          </div>
          {standing.rank && (
            <span className="slab shrink-0 bg-gold px-2 py-1 font-display text-sm font-extrabold text-ink">
              <span>#{standing.rank}</span>
            </span>
          )}
        </div>
        <div className="mt-3 flex items-end justify-between">
          <div>
            <Label>{fr.game.goal.worth}</Label>
            <Big className="mt-1 text-2xl">{d(netWorth.total)}</Big>
          </div>
          <div className="text-right">
            <Label>{fr.game.goal.left}</Label>
            <Big className="mt-1 text-lg text-lagoon">
              {clock(standing.seasonEndsAt - props.now)}
            </Big>
          </div>
        </div>
        {next && (
          <div className="mt-3">
            <Ribbon
              value={standing.title.progress}
              label={fr.game.goal.nextTitle(next.name, `${next.from.toLocaleString("fr-FR")} d`)}
            />
          </div>
        )}
        {standing.rank && (
          <p className="label mt-2">{fr.game.goal.rank(standing.rank, standing.players)}</p>
        )}
      </Panel>
    </button>
  );
}

const FIRST_STEPS = ["produce", "harvest", "transform", "sell_city", "market_buy", "mission"];

/** The first six steps as a checklist, with why each one matters. */
function FirstSteps(props: GameProps) {
  const done = new Set(props.view.tutorial);
  if (FIRST_STEPS.every((s) => done.has(s))) return null;
  const current = FIRST_STEPS.find((s) => !done.has(s));
  return (
    <Panel>
      <div className="flex items-center justify-between">
        <Label className="text-lagoon">{fr.game.firstSteps.title}</Label>
        <span className="label">
          {FIRST_STEPS.filter((s) => done.has(s)).length}/{FIRST_STEPS.length}
        </span>
      </div>
      <ol className="mt-3 space-y-2.5">
        {FIRST_STEPS.map((s, i) => {
          const [title, why] = fr.game.firstSteps.items[s] ?? [s, ""];
          const ok = done.has(s);
          const now = s === current;
          return (
            <li key={s} className={`flex gap-3 ${ok ? "opacity-50" : ""}`}>
              <span
                className={`slab flex h-6 w-6 shrink-0 items-center justify-center font-display text-xs font-extrabold ${
                  ok ? "bg-lagoon text-on-lagoon" : now ? "bg-gold text-ink" : "bg-night-4 text-muted"
                }`}
              >
                <span>{ok ? "✓" : i + 1}</span>
              </span>
              <div>
                <p className={`text-sm font-semibold ${ok ? "line-through" : ""}`}>{title}</p>
                {now && <p className="text-xs text-cream-dim">{why}</p>}
              </div>
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}

/** Workers eat: how much bread per day, how many days left, and a warning when short. */
function Rations(props: GameProps) {
  const { rations } = props.view;
  if (rations.perDay === 0) return null;
  const stock = have(props.view, rations.resource);
  const days = Math.floor(stock / rations.perDay);
  const hungry = rations.hungryUntil > props.now;
  const tone = hungry ? "text-vermilion" : days < 1 ? "text-gold" : "text-cream-dim";
  return (
    <div
      className={`flex items-start gap-3 ${hungry ? "bg-vermilion/15 p-3 ring-1 ring-vermilion/60" : ""}`}
    >
      <ResourceIcon code={rations.resource} size={30} />
      <div className="text-sm">
        <p className={tone}>{fr.game.rations.line(rations.perDay, days)}</p>
        <p className="mt-1 text-cream-dim">
          {fr.game.rations.nextMeal(clock(rations.nextMealAt - props.now), rations.perDay, stock)}
        </p>
        {hungry && (
          <p className="mt-1 text-vermilion">
            {fr.game.rations.hungry(clock(rations.hungryUntil - props.now))}
          </p>
        )}
        {!hungry && days < 1 && (
          <p className="mt-1 text-gold">{fr.game.rations.low(rations.perDay - stock)}</p>
        )}
      </div>
    </div>
  );
}

function StockStrip(props: GameProps) {
  return (
    <div>
      <Label className="mb-2">{fr.game.stock}</Label>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0">
        {props.view.inventory.map((i) => (
          <div
            key={i.resource}
            className={`slab flex shrink-0 items-center gap-1.5 px-3 py-1.5 ring-1 ring-inset ${i.available > 0 ? "bg-night-3 ring-line" : "bg-night-2 opacity-50 ring-night-3"}`}
          >
            <span className="flex items-center gap-1.5">
              <ResourceIcon code={i.resource} size={24} />
              <span className="font-display text-sm font-semibold tabular-nums">{i.available}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Workshop({ b, props }: { b: BuildingView; props: GameProps }) {
  const recipe = recipeOf(props, b.type);
  const job = b.job;
  const ready = readyOf(b, props.now);
  const running = job !== null && ready < job.batches;
  const current =
    job && running ? (props.now - job.startedAt - ready * job.batchMs) / job.batchMs : 0;
  const nextIn = job && running ? job.startedAt + (ready + 1) * job.batchMs - props.now : 0;

  return (
    <Panel glow={ready > 0 ? "gold" : running ? "lagoon" : undefined}>
      <div className="flex gap-3">
        <div className="-my-1 -ml-1 w-28 shrink-0">
          <BuildingArt type={b.type} active={running} className="h-24 w-28" />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display text-sm font-extrabold uppercase leading-tight">
              {props.names.building(b.type)}
            </h3>
            <Badge tone={b.level >= 3 ? "lagoon" : "gold"}>{fr.game.level(b.level)}</Badge>
          </div>
          {recipe && <RecipeFlow recipe={recipe} level={b.level} props={props} />}
          {job && running && (
            <Ribbon
              value={current}
              tone="lagoon"
              label={`${fr.game.batch(ready + 1, job.batches)} · ${clock(nextIn)}`}
            />
          )}
          {!job && recipe && <p className="label">{fr.game.idle}</p>}
          {!recipe && <p className="text-xs text-muted">{fr.game.palazzoHelp}</p>}
        </div>
      </div>
      <div className="mt-3 flex gap-3">
        {ready > 0 && (
          <Slab
            className="flex-1"
            coach={`harvest-${b.id}`}
            disabled={props.busy}
            onClick={() => props.act({ type: "collect", buildingId: b.id })}
          >
            {fr.game.harvest(ready)}
          </Slab>
        )}
        {recipe && b.canStart > 0 && ready === 0 && (
          <Slab
            className="flex-1"
            tone="lagoon"
            coach={`produce-${b.id}`}
            onClick={() => props.setSheet(`produce:${b.id}`)}
          >
            {fr.game.produce}
          </Slab>
        )}
        {recipe && b.canStart === 0 && !job && Object.keys(recipe.inputs).length > 0 && (
          <p className="flex-1 self-center text-xs text-muted">{fr.game.missingInputs}</p>
        )}
        {b.outOfRegion && (
          <p className="flex-1 self-center text-xs text-muted">{fr.game.outOfRegion}</p>
        )}
        {b.upgradeCost && (
          <Slab
            tone="ghost"
            size="sm"
            coach={`upgrade-${b.id}`}
            onClick={() => props.setSheet(`upgrade:${b.id}`)}
          >
            {fr.game.upgrade}
          </Slab>
        )}
      </div>
    </Panel>
  );
}

function ProduceSheet({ b, props }: { b: BuildingView; props: GameProps }) {
  const learning = !props.view.tutorial.includes("invest");
  const [qty, setQty] = useState(learning ? 1 : Math.max(1, b.canStart));
  const recipe = recipeOf(props, b.type);
  if (!recipe) return null;
  const q = Math.min(qty, Math.max(1, b.canStart));
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <BuildingArt type={b.type} active className="h-20 w-24" />
        <div>
          <Label>{fr.game.produce}</Label>
          <h3 className="font-display text-lg font-extrabold uppercase">
            {props.names.building(b.type)}
          </h3>
        </div>
      </div>
      <RecipeFlow recipe={recipe} level={b.level} props={props} />
      <div className="space-y-2">
        <Label>{fr.game.batchesLabel}</Label>
        <Qty value={q} max={b.canStart} onChange={setQty} />
        <p className="text-sm text-cream-dim">
          {q} × {recipe.durationMinutes / 60} h = {(q * recipe.durationMinutes) / 60} h
        </p>
      </div>
      <Slab
        size="lg"
        tone="lagoon"
        className="w-full"
        coach="sheet-produce"
        disabled={props.busy}
        onClick={async () => {
          if (await props.act({ type: "startProduction", buildingId: b.id, batches: q }))
            props.setSheet(null);
        }}
      >
        {fr.game.produce}
      </Slab>
    </div>
  );
}

function UpgradeSheet({ b, props }: { b: BuildingView; props: GameProps }) {
  const cost = b.upgradeCost;
  if (!cost) return null;
  const recipe = recipeOf(props, b.type);
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <BuildingArt type={b.type} className="h-20 w-24" />
        <div>
          <Label>{fr.game.upgradeTo(b.level + 1)}</Label>
          <h3 className="font-display text-lg font-extrabold uppercase">
            {props.names.building(b.type)}
          </h3>
        </div>
      </div>
      {recipe && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 opacity-60">
            <Badge tone="ghost">{fr.game.level(b.level)}</Badge>
            <RecipeFlow recipe={recipe} level={b.level} props={props} />
          </div>
          <div className="flex items-center gap-2">
            <Badge>{fr.game.level(b.level + 1)}</Badge>
            <RecipeFlow recipe={recipe} level={b.level + 1} props={props} />
          </div>
        </div>
      )}
      <p className="text-sm text-cream-dim">
        {fr.game.upgradeEffect(
          Math.round((b.level * props.catalog.rules.levelYieldBonusBps) / 100),
        )}
      </p>
      <div className="space-y-2">
        <Label>{fr.game.cost}</Label>
        <CostList cost={cost} props={props} />
      </div>
      <Slab
        size="lg"
        className="w-full"
        coach="sheet-upgrade"
        disabled={props.busy || !affordable(props.view, cost)}
        onClick={async () => {
          if (await props.act({ type: "upgrade", buildingId: b.id })) props.setSheet(null);
        }}
      >
        {fr.game.upgrade}
      </Slab>
    </div>
  );
}

function BuildSheet({ type, props }: { type: string; props: GameProps }) {
  const def = props.catalog.buildings.find((b) => b.type === type);
  if (!def) return null;
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <BuildingArt type={type} className="h-24 w-32" />
        <div>
          <Label>{fr.game.buildTitle}</Label>
          <h3 className="font-display text-lg font-extrabold uppercase">{def.name}</h3>
          <p className="label mt-1">{fr.game.upkeep(d(def.upkeepPerDay))}</p>
        </div>
      </div>
      {def.recipe ? (
        <RecipeFlow recipe={def.recipe} level={1} props={props} />
      ) : (
        <p className="text-sm text-cream-dim">{fr.game.palazzoHelp}</p>
      )}
      <div className="space-y-2">
        <Label>{fr.game.cost}</Label>
        <CostList cost={def.cost} props={props} />
      </div>
      <Slab
        size="lg"
        className="w-full"
        disabled={props.busy || !affordable(props.view, def.cost)}
        onClick={async () => {
          if (await props.act({ type: "build", buildingType: type })) props.setSheet(null);
        }}
      >
        {fr.game.build}
      </Slab>
    </div>
  );
}

export function Comptoir(props: GameProps) {
  const { view, catalog } = props;
  const full = view.buildings.length >= catalog.rules.maxBuildings;
  const [kind, id] = (props.sheet ?? "").split(":");
  const sheetBuilding = view.buildings.find((b) => b.id === id);

  return (
    // Phone: one column in reading order. Computer: the workshops on the left, the merchant's
    // dashboard (goal, ledger, rations, stock) in a side column that stays in view.
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-8">
      <div className="contents lg:col-start-1 lg:flex lg:flex-col lg:gap-6">
        <div className="order-2 lg:order-none">
          <Hero {...props} />
        </div>
        <section className="order-7 space-y-3 lg:order-none">
          <Label>{fr.game.workshops}</Label>
          <div className="grid gap-3 xl:grid-cols-2">
            {view.buildings.map((b) => (
              <Workshop key={b.id} b={b} props={props} />
            ))}
          </div>
        </section>
        <section className="order-8 space-y-3 lg:order-none">
          <Label>{fr.game.buildTitle}</Label>
          <p className="text-xs text-muted">
            {fr.game.localRaw(
              catalog.buildings
                .filter((b) => b.regions?.includes(view.player.region))
                .flatMap((b) => Object.keys(b.recipe?.outputs ?? {}))
                .map((r) => props.names.resource(r).toLowerCase())
                .join(", ") || "—",
            )}
          </p>
          {full ? (
            <p className="text-sm text-muted">{fr.game.maxBuildings(catalog.rules.maxBuildings)}</p>
          ) : (
            <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0 xl:grid-cols-6">
              {catalog.buildings
                .filter((b) => !b.regions || b.regions.includes(view.player.region))
                .map((b) => (
                  <button
                    key={b.type}
                    type="button"
                    onClick={() => props.setSheet(`build:${b.type}`)}
                    className={`w-32 shrink-0 rounded-2xl border border-line bg-night-3 p-2 text-left transition hover:border-gold/60 lg:w-auto ${affordable(view, b.cost) ? "" : "opacity-60"}`}
                  >
                    <BuildingArt type={b.type} className="h-16 w-28" />
                    <p className="mt-1 font-display text-[11px] font-extrabold uppercase leading-tight">
                      {b.name}
                    </p>
                    <p className="font-mono text-[11px] text-gold">{d(b.cost.ducats)}</p>
                  </button>
                ))}
            </div>
          )}
        </section>
      </div>
      <aside className="contents lg:sticky lg:top-24 lg:col-start-2 lg:row-start-1 lg:flex lg:max-h-[calc(100dvh-7rem)] lg:flex-col lg:gap-6 lg:overflow-y-auto lg:pb-2">
        <div className="order-1 lg:order-none">
          <Goal {...props} />
        </div>
        <div className="order-3 empty:hidden lg:order-none">
          <FirstSteps {...props} />
        </div>
        <div className="order-4 empty:hidden lg:order-none">
          <Ledger {...props} />
        </div>
        <div className="order-6 lg:order-none">
          <Rations {...props} />
        </div>
        <div className="order-5 lg:order-none">
          <StockStrip {...props} />
        </div>
      </aside>

      <Sheet open={kind === "produce" && !!sheetBuilding} onClose={() => props.setSheet(null)}>
        {sheetBuilding && <ProduceSheet key={sheetBuilding.id} b={sheetBuilding} props={props} />}
      </Sheet>
      <Sheet open={kind === "upgrade" && !!sheetBuilding} onClose={() => props.setSheet(null)}>
        {sheetBuilding && <UpgradeSheet b={sheetBuilding} props={props} />}
      </Sheet>
      <Sheet open={kind === "build"} onClose={() => props.setSheet(null)}>
        {kind === "build" && id && <BuildSheet type={id} props={props} />}
      </Sheet>
    </div>
  );
}
