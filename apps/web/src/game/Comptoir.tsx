import { useState } from "react";
import { BuildingArt } from "../art/buildings.js";
import { ResourceIcon } from "../art/resources.js";
import { fr } from "../i18n.js";
import { Badge, Big, Label, Panel, Qty, Ribbon, Sheet, Slab, clock } from "../ui.js";
import { BaleScreen, BaleTile } from "./Bales.js";
import { Daily } from "./Daily.js";
import { Domain } from "./Domain.js";
import type { GameProps } from "./Game.js";
import { Ledger } from "./Ledger.js";
import { MasteryTile } from "./Mastery.js";
import { d, duration, minutesLabel } from "./format.js";
import { store } from "./store.js";
import type { BuildingView, Cost, PlayerView, Recipe } from "./types.js";
import { have, outputQty, readyOf, recipeOf, workshopState } from "./workshops.js";

export { have };

export function affordable(view: PlayerView, cost: Cost): boolean {
  if (BigInt(view.cash) < BigInt(cost.ducats)) return false;
  return Object.entries(cost.materials).every(([r, q]) => have(view, r) >= q);
}

/** "10 [clay] → 6 [bricks]" with icons. */
/**
 * What a batch takes and gives, and how long it lasts. A batch keeps the duration it was started
 * with (rations, older settings): the running one shows its own, and the next ones theirs.
 */
function RecipeFlow({
  recipe,
  level,
  props,
  runningMs,
}: { recipe: Recipe; level: number; props: GameProps; runningMs?: number }) {
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
      {(() => {
        const hungry = props.view.rations.hungryUntil > props.now;
        const nextMinutes = hungry
          ? Math.round(
              (recipe.durationMinutes * (10_000 + props.catalog.rations.slowdownBps)) / 10_000,
            )
          : recipe.durationMinutes;
        const running = runningMs !== undefined ? Math.round(runningMs / 60_000) : undefined;
        if (running !== undefined && running !== nextMinutes) {
          // A tutorial batch lasts seconds.
          const now =
            runningMs !== undefined && runningMs < 60_000
              ? `${runningMs / 1000} s`
              : minutesLabel(running);
          return (
            <span className="label ml-1">
              {fr.game.batchNow(now)}
              <span className={hungry ? "text-vermilion" : "text-lagoon"}>
                {" · "}
                {fr.game.batchNext(minutesLabel(nextMinutes))}
                {hungry && ` ${fr.game.rations.slower}`}
              </span>
            </span>
          );
        }
        return (
          <span className={`label ml-1 ${hungry ? "text-vermilion" : ""}`}>
            {minutesLabel(nextMinutes)}
            {hungry && ` · ${fr.game.rations.slower}`}
          </span>
        );
      })()}
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

const FIRST_STEPS = ["produce", "harvest", "transform", "sell_city", "market_buy", "mission"];

function FirstSteps(props: GameProps & { inSheet?: boolean }) {
  const done = new Set(props.view.tutorial);
  if (FIRST_STEPS.every((s) => done.has(s))) return null;
  // While Lorenzo guides, he already says what to do next: the list stands in when he is paused.
  if (!props.inSheet && store.get("guideDone") !== "1" && store.get("guideHidden") !== "1")
    return null;
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
                  ok
                    ? "bg-lagoon text-on-lagoon"
                    : now
                      ? "bg-gold text-ink"
                      : "bg-night-4 text-muted"
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
      className={`flex items-start gap-3 ${hungry ? "rounded-2xl bg-vermilion/15 p-3 ring-1 ring-vermilion/60" : ""}`}
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
  // Fresh produce: the latest batch done, collected soon, yields a little more.
  const fresh = props.view.fresh;
  const freshLeft =
    job && ready > 0 && fresh.minutes > 0
      ? job.startedAt + ready * job.batchMs + fresh.minutes * 60_000 - props.now
      : 0;

  return (
    <Panel glow={ready > 0 ? "gold" : running ? "lagoon" : undefined}>
      <div className="flex gap-3">
        <div className="-my-1 -ml-1 w-20 shrink-0 min-[360px]:w-28">
          <BuildingArt type={b.type} active={running} className="h-24 w-full" />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display text-sm font-extrabold uppercase leading-tight">
              {props.names.building(b.type)}
            </h3>
            <Badge tone={b.level >= 3 ? "lagoon" : "gold"}>{fr.game.level(b.level)}</Badge>
          </div>
          {recipe && (
            <RecipeFlow
              recipe={recipe}
              level={b.level}
              props={props}
              runningMs={b.job ? b.job.batchMs : undefined}
            />
          )}
          {job && running && (
            <Ribbon
              value={current}
              tone="lagoon"
              label={`${fr.game.batch(ready + 1, job.batches)} · ${clock(nextIn)}`}
            />
          )}
          {freshLeft > 0 && (
            <p className="label text-lagoon">
              {fr.game.fresh(fresh.bonusBps / 100, clock(freshLeft))}
            </p>
          )}
          {!job && recipe && <p className="label">{fr.game.idle}</p>}
          {!recipe && <p className="text-xs text-muted">{fr.game.palazzoHelp}</p>}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-3">
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

/** Minutes from now to the evening (21 h in Paris), or to the morning (8 h) once evening has come. */
function untilRest(now: number): { minutes: number; night: boolean } {
  const parts = new Intl.DateTimeFormat("fr-FR", {
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
    timeZone: "Europe/Paris",
  }).formatToParts(new Date(now));
  const part = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const at = part("hour") * 60 + part("minute");
  const night = at >= 20 * 60 || at < 8 * 60;
  const target = night ? (at < 8 * 60 ? 8 * 60 : 32 * 60) : 21 * 60;
  return { minutes: target - at, night };
}

/**
 * One sheet per workshop, opened from its plot on the domain or from the list: what it is doing,
 * collecting, producing (with quick choices), what it lacks, and upgrading.
 */
function WorkshopSheet({
  b,
  props,
  focus,
}: { b: BuildingView; props: GameProps; focus: "produce" | "upgrade" }) {
  const learning = !props.view.tutorial.includes("invest");
  const [qty, setQty] = useState(learning ? 1 : Math.max(1, b.canStart));
  const recipe = recipeOf(props, b.type);
  const st = workshopState(props, b);
  const t = fr.game.workshop;
  const cost = b.upgradeCost;
  const canUpgrade = cost !== null && affordable(props.view, cost);
  const q = Math.min(qty, Math.max(1, b.canStart));
  const rest = untilRest(props.now);
  const evening = recipe
    ? Math.max(1, Math.min(b.canStart, Math.floor(rest.minutes / recipe.durationMinutes)))
    : 1;
  const status =
    st.state === "ready"
      ? t.ready(st.quantity ?? 0, props.names.resource(st.resource ?? ""))
      : st.state === "running" && b.job
        ? t.running(st.ready + 1, b.job.batches, clock(st.left ?? 0))
        : st.state === "idle"
          ? t.idle
          : st.state === "blocked"
            ? t.blocked
            : "";
  const missing = st.state === "blocked" ? st.resource : undefined;
  const maker = missing
    ? props.view.buildings.find((x) => recipeOf(props, x.type)?.outputs[missing] !== undefined)
    : undefined;
  const upgrade = cost && (
    <div className="space-y-3">
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
      <CostList cost={cost} props={props} />
      <Slab
        className="w-full"
        coach="sheet-upgrade"
        disabled={props.busy || !canUpgrade}
        onClick={async () => {
          if (await props.act({ type: "upgrade", buildingId: b.id })) props.setSheet(null);
        }}
      >
        {fr.game.upgradeTo(b.level + 1)}
      </Slab>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <BuildingArt type={b.type} active={st.state === "running"} className="h-20 w-24" />
        <div className="min-w-0">
          <Label>{fr.game.level(b.level)}</Label>
          <h3 className="font-display text-lg font-extrabold uppercase">
            {props.names.building(b.type)}
          </h3>
          {status && (
            <p
              className={`text-sm ${st.state === "ready" ? "text-gold" : st.state === "blocked" ? "text-vermilion" : "text-lagoon"}`}
            >
              {status}
            </p>
          )}
        </div>
      </div>
      {st.state === "running" && b.job && (
        <Ribbon value={st.progress ?? 0} tone="lagoon" label={clock(st.left ?? 0)} />
      )}
      {st.ready > 0 && (
        <Slab
          size="lg"
          className="w-full"
          disabled={props.busy}
          onClick={() => props.act({ type: "collect", buildingId: b.id })}
        >
          {fr.game.harvest(st.ready)}
        </Slab>
      )}
      {!recipe && <p className="text-sm text-cream-dim">{fr.game.palazzoHelp}</p>}
      {recipe && <RecipeFlow recipe={recipe} level={b.level} props={props} />}
      {recipe && b.canStart > 0 && !(b.job && st.ready < b.job.batches) && (
        <div className="space-y-3">
          <Label>{fr.game.batchesLabel}</Label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: t.one, n: 1 },
              { label: rest.night ? t.night : t.evening, n: evening },
              { label: t.max, n: b.canStart },
            ].map((o) => (
              <button
                key={o.label}
                type="button"
                aria-pressed={q === o.n}
                onClick={() => setQty(o.n)}
                className={`rounded-xl border px-2 py-2 text-xs font-semibold ${q === o.n ? "border-lagoon bg-lagoon/15 text-lagoon" : "border-line"}`}
              >
                {o.label}
                <span className="block font-display text-sm tabular-nums">{o.n}</span>
              </button>
            ))}
          </div>
          <Qty value={q} max={b.canStart} onChange={setQty} />
          <p className="text-sm text-cream-dim">
            {b.fastSeconds !== null && q === 1
              ? fr.game.fastBatch(b.fastSeconds)
              : `${q} × ${minutesLabel(recipe.durationMinutes)} = ${duration(q * recipe.durationMinutes * 60_000)}`}
          </p>
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
      )}
      {missing && recipe && (
        <div className="space-y-2 rounded-2xl bg-night-3 p-3">
          <p className="flex items-center gap-2 text-sm">
            <ResourceIcon code={missing} size={24} />
            {t.missing(
              props.names.resource(missing),
              (recipe.inputs[missing] ?? 0) * b.level,
              have(props.view, missing),
            )}
          </p>
          <div className="flex gap-2">
            <Slab
              size="sm"
              tone="ghost"
              className="flex-1"
              onClick={() => {
                props.setSheet(null);
                props.goTo("marche");
              }}
            >
              {t.toMarket}
            </Slab>
            {maker && (
              <Slab
                size="sm"
                tone="ghost"
                className="flex-1"
                onClick={() => props.setSheet(`produce:${maker.id}`)}
              >
                {t.makeAt(props.names.building(maker.type))}
              </Slab>
            )}
          </div>
        </div>
      )}
      {b.outOfRegion && <p className="text-xs text-muted">{fr.game.outOfRegion}</p>}
      {upgrade &&
        (focus === "upgrade" || canUpgrade || !recipe ? (
          <div className="space-y-2 border-t border-line pt-4">
            <Label>{fr.game.upgradeTo(b.level + 1)}</Label>
            {upgrade}
          </div>
        ) : (
          <details className="border-t border-line pt-4">
            <summary className="label cursor-pointer">{t.upgradeLater(b.level + 1)}</summary>
            <div className="mt-3">{upgrade}</div>
          </details>
        ))}
    </div>
  );
}

/** What can be built on a free plot of the domain. */
function BuildHereSheet(props: GameProps) {
  const { view, catalog } = props;
  return (
    <div className="space-y-4">
      <h3 className="font-display text-lg font-extrabold uppercase">
        {fr.game.workshop.buildHere}
      </h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {catalog.buildings
          .filter((b) => !b.regions || b.regions.includes(view.player.region))
          .map((b) => (
            <button
              key={b.type}
              type="button"
              onClick={() => props.setSheet(`build:${b.type}`)}
              className={`rounded-2xl border border-line bg-night-3 p-2 text-left transition hover:border-gold/60 ${affordable(view, b.cost) ? "" : "opacity-60"}`}
            >
              <BuildingArt type={b.type} className="h-16 w-full" />
              <p className="mt-1 font-display text-[11px] font-extrabold uppercase leading-tight">
                {b.name}
              </p>
              <p className="font-mono text-[11px] text-gold">{d(b.cost.ducats)}</p>
            </button>
          ))}
      </div>
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

/** "N orders to deliver, M vehicles free": straight to the Routes tab. */
/** What waits to be claimed in the day's notebook: tasks done, missions done, the chest. */
export function carnetRewards(props: GameProps): number {
  const daily = props.view.daily?.tasks.filter((t) => t.done && !t.claimed).length ?? 0;
  const missions = props.view.missions.filter((m) => m.unlocked && m.done && !m.claimed).length;
  return daily + missions;
}

/** The day's notebook: tasks of the day, the merchant's ledger and first steps, in a window. */
function CarnetButton(props: GameProps) {
  const rewards = carnetRewards(props);
  const daily = props.view.daily;
  const left = daily ? daily.tasks.filter((t) => !t.done).length : 0;
  const c = fr.game.carnet;
  return (
    <button
      type="button"
      data-coach="carnet"
      onClick={() => props.setSheet("carnet")}
      className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition active:scale-[0.99] ${rewards > 0 ? "border-gold/60 bg-gold/10 text-gold" : "border-line bg-night-3 text-cream-dim"}`}
    >
      <span>
        <span className="block font-semibold">{c.title}</span>
        <span className="label block">{rewards > 0 ? c.rewards(rewards) : c.left(left)}</span>
      </span>
      {rewards > 0 ? (
        <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-gold px-1.5 text-xs font-bold text-ink">
          {rewards}
        </span>
      ) : (
        <span aria-hidden="true">→</span>
      )}
    </button>
  );
}

function RoadShortcut(props: GameProps) {
  const road = props.view.road;
  if (!road) return null;
  const orders = road.orders.filter((o) => o.status === "open").length;
  const free = road.vehicles.filter((v) => v.status === "free").length;
  if (orders === 0) return null;
  return (
    <button
      type="button"
      onClick={() => props.goTo("routes")}
      className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition active:scale-[0.99] ${free > 0 ? "border-gold/60 bg-gold/10 text-gold" : "border-line bg-night-3 text-cream-dim"}`}
    >
      <span className="font-semibold">{fr.game.road.shortcut(orders, free)}</span>
      <span aria-hidden="true">→</span>
    </button>
  );
}

/** The season's goal: the next merchant title, and the renown it adds at the close. */
function SeasonGoal(props: GameProps) {
  const { title } = props.view.standing;
  // Once the first steps are behind: the guide has enough to say before.
  if (!props.view.tutorial.includes("sell_city")) return null;
  const t = fr.game.season.goal;
  return (
    <Panel>
      <Label className="text-gold">{t.title}</Label>
      <p className="mt-2 text-sm">{t.now(title.current.name, title.current.renown)}</p>
      {title.next ? (
        <>
          <p className="mt-1 text-sm text-cream-dim">
            {t.next(title.next.name, d(BigInt(title.next.from) * 100n), title.next.renown)}
          </p>
          <div className="mt-3">
            <Ribbon value={title.progress} />
          </div>
        </>
      ) : (
        <p className="mt-1 text-sm text-cream-dim">{t.top}</p>
      )}
    </Panel>
  );
}

/**
 * The workshops as a list, under the domain: open while the guide leads (its targets live there
 * too), then folded, the domain being where one produces.
 */
function WorkshopList(props: GameProps) {
  const guiding =
    !props.view.tutorial.includes("mission") &&
    store.get("guideDone") !== "1" &&
    store.get("guideHidden") !== "1";
  return (
    <details open={guiding} className="group order-3 lg:order-none">
      <summary className="label flex cursor-pointer list-none items-center justify-between py-1">
        <span>
          {fr.game.workshops} · {props.view.buildings.length}
        </span>
        <span className="transition group-open:rotate-180">▾</span>
      </summary>
      <div className="mt-3 grid grid-cols-1 gap-3 2xl:grid-cols-2">
        {props.view.buildings.map((b) => (
          <Workshop key={b.id} b={b} props={props} />
        ))}
      </div>
    </details>
  );
}

export function Comptoir(props: GameProps) {
  const { view, catalog } = props;
  const full = view.buildings.length >= catalog.rules.maxBuildings;
  const [kind, id] = (props.sheet ?? "").split(":");
  const sheetBuilding = view.buildings.find((b) => b.id === id);

  return (
    // The production screen. Phone: what to do now (harvest, the day's notebook, the road), the
    // workshops, stock and rations, then what can be built. Computer: the workshops on the left,
    // stock and rations in a side column that stays in view.
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-8">
      <div className="contents lg:col-start-1 lg:flex lg:flex-col lg:gap-6">
        <div className="order-2 space-y-3 lg:order-none">
          <Domain {...props} />
          <div className="grid gap-3 sm:grid-cols-2">
            <CarnetButton {...props} />
            <MasteryTile {...props} />
            <BaleTile {...props} />
            <RoadShortcut {...props} />
          </div>
        </div>
        <WorkshopList {...props} />
        <section id="build-section" className="order-9 scroll-mt-24 space-y-3 lg:order-none">
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
        <div className="order-6 empty:hidden lg:order-none">
          <SeasonGoal {...props} />
        </div>
        <div className="order-4 lg:order-none">
          <StockStrip {...props} />
        </div>
        <div className="order-5 empty:hidden lg:order-none">
          <Rations {...props} />
        </div>
      </aside>

      <Sheet
        open={(kind === "produce" || kind === "upgrade") && !!sheetBuilding}
        onClose={() => props.setSheet(null)}
      >
        {sheetBuilding && (
          <WorkshopSheet
            key={sheetBuilding.id}
            b={sheetBuilding}
            props={props}
            focus={kind === "upgrade" ? "upgrade" : "produce"}
          />
        )}
      </Sheet>
      <Sheet open={props.sheet === "buildHere"} onClose={() => props.setSheet(null)}>
        <BuildHereSheet {...props} />
      </Sheet>
      <Sheet open={props.sheet === "carnet"} onClose={() => props.setSheet(null)}>
        <div className="space-y-4 pt-6">
          <h3 className="font-display text-xl font-extrabold uppercase">{fr.game.carnet.title}</h3>
          <FirstSteps {...props} inSheet />
          <Daily {...props} />
          <Ledger {...props} />
        </div>
      </Sheet>
      {props.sheet === "bales" && <BaleScreen {...props} />}
      <Sheet open={kind === "build"} onClose={() => props.setSheet(null)}>
        {kind === "build" && id && <BuildSheet type={id} props={props} />}
      </Sheet>
    </div>
  );
}
