import { useState } from "react";
import { BuildingArt } from "../art/buildings.js";
import { ResourceIcon } from "../art/resources.js";
import { fr } from "../i18n.js";
import { Badge, Label, Panel, Qty, Ribbon, Sheet, Slab, clock } from "../ui.js";
import { AdviceTile } from "./Advice.js";
import { BaleScreen, BaleTile } from "./Bales.js";
import { BuildCatalog } from "./Catalog.js";
import { CompanySheet, CompanyTile } from "./Company.js";
import { Daily } from "./Daily.js";
import { DashboardSheet, DashboardTile } from "./Dashboard.js";
import { DealsSheet, DealsTile } from "./Deals.js";
import type { GameProps } from "./Game.js";
import { Ledger } from "./Ledger.js";
import { MasteryTile } from "./Mastery.js";
import { TendersSheet, TendersTile } from "./Tenders.js";
import { d, duration, minutesLabel } from "./format.js";
import { store } from "./store.js";
import type { BuildingView, Cost, PlayerView, Recipe } from "./types.js";
import { unlocksOf } from "./unlocks.js";
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
            <span className="meta ml-1">
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
          <span className={`meta ml-1 ${hungry ? "text-vermilion" : ""}`}>
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
        <Label className="text-cream-dim">{fr.game.firstSteps.title}</Label>
        <span className="meta">
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

/** Where the merchant buys the workers' bread: its trade at the Rialto, or the Rialto itself. */
export function buyRationsSheet(view: PlayerView): string {
  const r = view.rations.resource;
  return view.market.some((l) => l.resource === r) ? `trade:${r}` : "rialto";
}

/**
 * Workers eat: how much bread per day and why, how many days left, a warning when short, and
 * the way to the Rialto to buy more.
 */
export function Rations(props: GameProps) {
  const { rations } = props.view;
  if (rations.perDay === 0) return null;
  const stock = have(props.view, rations.resource);
  const days = Math.floor(stock / rations.perDay);
  const hungry = rations.hungryUntil > props.now;
  const short = hungry || days < 1;
  const tone = hungry ? "text-vermilion" : days < 1 ? "text-gold" : "text-cream-dim";
  return (
    <div
      className={`flex items-start gap-3 ${hungry ? "cut bg-vermilion/15 p-3 ring-1 ring-vermilion/60" : ""}`}
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
        {rations.perLevel > 0 && (
          <p className="meta mt-1">{fr.game.rations.why(rations.perLevel)}</p>
        )}
        <Slab
          size="sm"
          tone={hungry ? "vermilion" : short ? "gold" : "ghost"}
          className="mt-2"
          onClick={() => props.setSheet(buyRationsSheet(props.view))}
        >
          {fr.game.rations.buy}
        </Slab>
      </div>
    </div>
  );
}

export function StockStrip(props: GameProps) {
  return (
    <div>
      <Label className="mb-2">{fr.game.stock}</Label>
      <div
        data-no-swipe
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0"
      >
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

/**
 * The tone of a workshop's state: gold to collect, lagoon at work, quiet when it waits for goods
 * (a normal state of a chain, not an alarm: a hollow dot, not a red one).
 */
const STATE_TONE = {
  ready: { glow: "gold", dot: "bg-gold", text: "text-gold", ring: "ring-gold/60" },
  running: { glow: "lagoon", dot: "bg-lagoon", text: "text-lagoon", ring: "ring-lagoon/50" },
  idle: { glow: undefined, dot: "bg-cream-dim", text: "text-cream-dim", ring: "ring-line" },
  blocked: {
    glow: undefined,
    dot: "border-[1.5px] border-cream-dim",
    text: "text-cream-dim",
    ring: "ring-line",
  },
  still: { glow: undefined, dot: "bg-line", text: "text-muted", ring: "ring-line" },
} as const;

/**
 * Why the guide does not advise upgrading a workshop (null: it may): its goods pile up unsold, or
 * it lacks an input for a single batch.
 */
function NotAdvised({ b, props }: { b: BuildingView; props: GameProps }) {
  const e = b.economics;
  if (e.advisable || !e.next) return null;
  const output = Object.keys(recipeOf(props, b.type)?.outputs ?? {})[0];
  const t = fr.game.economics;
  return (
    <span className="block text-gold">
      {e.missingInputs.length > 0
        ? t.missing(e.missingInputs.map(props.names.resource).join(", "))
        : t.unsold(
            e.unsold.stock,
            props.names.resource(output ?? ""),
            e.unsold.hoursOfOutput,
            e.doganaPerDay,
          )}
    </span>
  );
}

/**
 * A workshop in the list: its state first (a coloured line), what a batch takes and gives, and
 * one big button that does the right thing (collect, produce, see what it lacks); upgrading is
 * the small level chip at the top.
 */
function Workshop({ b, props }: { b: BuildingView; props: GameProps }) {
  const recipe = recipeOf(props, b.type);
  const st = workshopState(props, b);
  const job = b.job;
  const ready = st.ready;
  const tone = STATE_TONE[st.state];
  const t = fr.game.workshop;
  const status =
    st.state === "ready"
      ? t.ready(st.quantity ?? 0, props.names.resource(st.resource ?? ""))
      : st.state === "running" && job
        ? t.running(ready + 1, job.batches, clock(st.left ?? 0))
        : st.state === "idle"
          ? t.idle
          : st.state === "blocked"
            ? b.outOfRegion
              ? fr.game.outOfRegion
              : t.blocked
            : fr.game.palazzoHelp;

  return (
    <Panel glow={tone.glow}>
      <div className="flex items-center gap-3">
        <div
          className={`cut flex h-[72px] w-[84px] shrink-0 items-center justify-center bg-night-2 ring-1 ring-inset ${tone.ring}`}
        >
          <BuildingArt type={b.type} active={st.state === "running"} className="h-16 w-20" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="min-w-0 font-display text-[15px] font-extrabold uppercase leading-tight [font-stretch:100%]">
              {props.names.building(b.type)}
            </h3>
            {b.upgradeCost ? (
              <button
                type="button"
                data-coach={`upgrade-${b.id}`}
                aria-label={fr.game.upgrade}
                onClick={() => props.setSheet(`upgrade:${b.id}`)}
                className="hit flex shrink-0 transition active:scale-95"
              >
                {/* The slab is clipped: drawn inside, the button keeps its 44 px of touch. */}
                <span className="slab flex items-center gap-1 whitespace-nowrap bg-night-4 px-2.5 py-0.5 font-mono text-xs font-bold text-cream">
                  {fr.game.level(b.level)} <span aria-hidden="true">↑</span>
                </span>
              </button>
            ) : (
              <Badge>{fr.game.level(b.level)}</Badge>
            )}
          </div>
          <p className={`mt-1.5 flex items-center gap-1.5 text-xs font-semibold ${tone.text}`}>
            <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${tone.dot}`} />
            <span className="min-w-0">{status}</span>
          </p>
          {/* What it earns, and whether its next level is the best placement of the ducats. */}
          <p className="mt-1 flex flex-wrap items-center gap-x-2 font-mono text-xs text-cream-dim">
            {BigInt(b.economics.marginPerHour) > 0n && (
              <span>{fr.game.economics.perHour(d(b.economics.marginPerHour))}</span>
            )}
            {props.view.bestUpgrade === b.id && b.economics.next && (
              <span className="text-gold">★ {fr.game.economics.best}</span>
            )}
          </p>
          {b.upgradeCost && !b.economics.advisable && b.economics.next && (
            <p className="mt-1 font-mono text-xs">
              <NotAdvised b={b} props={props} />
            </p>
          )}
        </div>
      </div>

      {recipe && (
        <div
          className="mt-3 cut bg-night-3/60 px-3 py-2"
          data-recipe={Object.keys(recipe.inputs).length > 0 ? "transform" : "raw"}
        >
          <RecipeFlow
            recipe={recipe}
            level={b.level}
            props={props}
            runningMs={job ? job.batchMs : undefined}
          />
        </div>
      )}
      {st.state === "running" && job && (
        <div className="mt-3">
          <Ribbon
            value={st.progress ?? 0}
            tone="lagoon"
            label={`${fr.game.batch(ready + 1, job.batches)} · ${clock(st.left ?? 0)}`}
          />
        </div>
      )}

      {st.state === "ready" && (
        <Slab
          className="mt-3 w-full"
          tone="ghost"
          coach={`harvest-${b.id}`}
          disabled={props.busy}
          onClick={() => props.act({ type: "collect", buildingId: b.id })}
        >
          {fr.game.harvest(ready)}
        </Slab>
      )}
      {st.state === "idle" && (
        <Slab
          className="mt-3 w-full"
          tone="ghost"
          coach={`produce-${b.id}`}
          onClick={() => props.setSheet(`produce:${b.id}`)}
        >
          {fr.game.produce}
        </Slab>
      )}
      {st.state === "blocked" && recipe && Object.keys(recipe.inputs).length > 0 && (
        <Slab
          className="mt-3 w-full"
          tone="ghost"
          coach={`produce-${b.id}`}
          onClick={() => props.setSheet(`produce:${b.id}`)}
        >
          {fr.game.workshopsSheet.whatsMissing}
        </Slab>
      )}
    </Panel>
  );
}

/** The top of the workshops' window: how many are ready, at work, idle; one tap for them all. */
function WorkshopsSummary(props: GameProps) {
  const states = props.view.buildings.map((b) => workshopState(props, b));
  const count = (s: string) => states.filter((x) => x.state === s).length;
  const ready = states.reduce((n, x) => n + (x.state === "ready" ? x.ready : 0), 0);
  const t = fr.game.workshopsSheet;
  const chips = [
    { n: count("ready"), label: t.ready, cls: "bg-gold/15 text-gold" },
    { n: count("running"), label: t.running, cls: "bg-lagoon/15 text-lagoon" },
    { n: count("idle") + count("blocked"), label: t.idle, cls: "bg-night-3 text-cream-dim" },
  ].filter((c) => c.n > 0);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {chips.map((c) => (
          <span
            key={c.cls}
            className={`slab px-3 py-1 font-mono text-xs font-bold uppercase tracking-wide ${c.cls}`}
          >
            {c.n} {c.label(c.n)}
          </span>
        ))}
      </div>
      {(ready > 0 || count("idle") > 0) && (
        <Slab
          className="w-full"
          disabled={props.busy}
          onClick={() => props.act({ type: "collectAndRestart" })}
        >
          {ready > 0 ? t.collectAll(ready) : t.restartAll}
        </Slab>
      )}
    </div>
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
  const m = fr.game.manufacture;
  const rules = props.catalog.rules.manufacture;
  const choice = b.pathChoice && rules && (
    <div className="space-y-3 border-t border-line pt-4">
      <Label>{m.title}</Label>
      {b.pathChoice === "locked" ? (
        <p className="meta">{m.locked(rules.title, rules.maxLevel)}</p>
      ) : (
        <>
          <p className="meta">{m.help(rules.maxLevel)}</p>
          {(["volume", "quality"] as const).map((path) => (
            <div key={path} className="cut bg-night-3 px-3 py-2 ring-1 ring-inset ring-line">
              <p className="font-semibold">{m.paths[path].name}</p>
              <p className="text-sm text-cream-dim">{m.paths[path].text(rules.qualityPct)}</p>
              <Slab
                size="sm"
                className="mt-2 w-full"
                disabled={props.busy}
                onClick={() => props.act({ type: "choosePath", buildingId: b.id, path })}
              >
                {m.choose(m.paths[path].name)}
              </Slab>
            </div>
          ))}
        </>
      )}
    </div>
  );
  const nextWork = b.path === "quality" ? b.workLevel : b.workLevel + 1;
  const upgrade = cost && (
    <div className="space-y-3">
      {recipe && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 opacity-60">
            <Badge tone="ghost">{fr.game.level(b.level)}</Badge>
            <RecipeFlow recipe={recipe} level={b.workLevel} props={props} />
          </div>
          <div className="flex items-center gap-2">
            <Badge>{fr.game.level(b.level + 1)}</Badge>
            <RecipeFlow recipe={recipe} level={nextWork} props={props} />
          </div>
          {b.path === "quality" && rules && (
            <p className="text-sm text-gold">
              {m.quality(
                Math.round((b.level + 1 - props.catalog.rules.maxBuildingLevel) * rules.qualityPct),
              )}
            </p>
          )}
        </div>
      )}
      <p className="text-sm text-cream-dim">
        {fr.game.upgradeEffect(
          Math.round((b.level * props.catalog.rules.levelYieldBonusBps) / 100),
        )}
      </p>
      {b.economics.next && (
        <p className="cut bg-night-3 px-3 py-2 text-sm">
          <span className="text-lagoon">
            {fr.game.economics.adds(d(b.economics.next.addedPerHour))}
          </span>
          <span className="text-cream-dim">
            {" · "}
            {fr.game.economics.payback(duration(b.economics.next.paybackMinutes * 60_000))}
          </span>
          {props.view.bestUpgrade === b.id && (
            <span className="block text-gold">★ {fr.game.economics.bestLong}</span>
          )}
          <NotAdvised b={b} props={props} />
        </p>
      )}
      <CostList cost={cost} props={props} />
      <Slab
        className="w-full"
        coach="sheet-upgrade"
        disabled={props.busy || !canUpgrade}
        onClick={async () => {
          if (await props.act({ type: "upgrade", buildingId: b.id })) props.setSheet("workshops");
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
          <Label>
            {fr.game.level(b.level)}
            {b.path && ` · ${fr.game.manufacture.paths[b.path].name}`}
          </Label>
          <h3 className="font-display text-lg font-extrabold uppercase">
            {props.names.building(b.type)}
          </h3>
          {status && (
            <p
              className={`text-sm ${st.state === "ready" ? "text-gold" : st.state === "blocked" ? "text-cream-dim" : "text-lagoon"}`}
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
      {recipe && <RecipeFlow recipe={recipe} level={b.workLevel} props={props} />}
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
                className={`cut border px-2 py-2 text-xs font-semibold ${q === o.n ? "border-info bg-info/15 text-info" : "border-line"}`}
              >
                {o.label}
                <span className="block font-display text-sm tabular-nums">{o.n}</span>
              </button>
            ))}
          </div>
          <Qty value={q} max={b.canStart} onChange={setQty} maxButton={false} />
          <p className="text-sm text-cream-dim">
            {b.fastSeconds !== null && q === 1
              ? fr.game.fastBatch(b.fastSeconds)
              : `${q} × ${minutesLabel(recipe.durationMinutes)} = ${duration(q * recipe.durationMinutes * 60_000)}`}
          </p>
          <Slab
            size="lg"
            className="w-full"
            coach="sheet-produce"
            disabled={props.busy}
            onClick={async () => {
              if (await props.act({ type: "startProduction", buildingId: b.id, batches: q }))
                props.setSheet("workshops");
            }}
          >
            {fr.game.produce}
          </Slab>
        </div>
      )}
      {missing && recipe && (
        <div className="space-y-2 cut bg-night-3 p-3">
          <p className="flex items-center gap-2 text-sm">
            <ResourceIcon code={missing} size={24} />
            {t.missing(
              props.names.resource(missing),
              (recipe.inputs[missing] ?? 0) * b.workLevel,
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
      {choice}
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
          {def.recipe && props.catalog.rations.perLevelPerDay > 0 && (
            <p className="meta mt-1">
              {fr.game.rationsOfLevel(props.catalog.rations.perLevelPerDay)}
            </p>
          )}
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
        disabled={
          props.busy ||
          !affordable(props.view, def.cost) ||
          (!!def.unlock && BigInt(props.view.standing.turnover) < BigInt(def.unlock.turnover))
        }
        onClick={async () => {
          if (await props.act({ type: "build", buildingType: type })) props.setSheet("workshops");
        }}
      >
        {fr.game.build}
      </Slab>
    </div>
  );
}

/** What waits to be claimed in the day's notebook: tasks done, missions done, the chest. */
export function carnetRewards(props: GameProps): number {
  const daily = props.view.daily?.tasks.filter((t) => t.done && !t.claimed).length ?? 0;
  const missions = props.view.missions.filter((m) => m.unlocked && m.done && !m.claimed).length;
  return daily + missions;
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
 * The counter's windows, opened from the merchant's city on the map: the workshops as a plain
 * list, a workshop's production or upgrade, building, the store, the day's notebook, the bales.
 * A workshop's window goes back to the list when it closes.
 */
/** Every workshop with one tap for them all, and a way to build: the sheet, and the side column. */
export function WorkshopsList(props: GameProps) {
  const room = props.view.buildings.length < props.catalog.rules.maxBuildings;
  return (
    <div className="space-y-3">
      <WorkshopsSummary {...props} />
      {props.view.buildings.map((b) => (
        <Workshop key={b.id} b={b} props={props} />
      ))}
      {room && (
        <Slab tone="ghost" className="w-full" onClick={() => props.setSheet("buildHere")}>
          {fr.game.map.buttons.build}
        </Slab>
      )}
    </div>
  );
}

export function CounterSheets(props: GameProps) {
  const { view } = props;
  const [kind, id] = (props.sheet ?? "").split(":");
  const sheetBuilding = view.buildings.find((b) => b.id === id);
  const close = () => props.setSheet(null);
  return (
    <>
      <Sheet
        open={props.sheet === "workshops"}
        onClose={close}
        title={fr.game.map.buttons.workshops}
      >
        <WorkshopsList {...props} />
      </Sheet>
      <Sheet
        open={(kind === "produce" || kind === "upgrade") && !!sheetBuilding}
        onClose={() => props.setSheet("workshops")}
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
      <Sheet open={props.sheet === "buildHere"} onClose={close} title={fr.game.catalog.title}>
        <BuildCatalog {...props} />
      </Sheet>
      <Sheet open={kind === "build"} onClose={() => props.setSheet("buildHere")}>
        {kind === "build" && id && <BuildSheet type={id} props={props} />}
      </Sheet>
      <Sheet open={props.sheet === "store"} onClose={close} title={fr.game.domain.store.title}>
        <div className="space-y-4">
          <StockStrip {...props} />
          <Rations {...props} />
        </div>
      </Sheet>
      {props.sheet === "bales" && <BaleScreen {...props} />}
      <CompanySheet {...props} />
      <DashboardSheet {...props} />
      <TendersSheet {...props} />
      <DealsSheet {...props} />
    </>
  );
}

/** The day's notebook: first steps (while the guide is paused), the day's tasks, the missions. */
export function Carnet(props: GameProps) {
  // The day's tasks and the ledger wait until the market is learned (first session).
  const house = unlocksOf(props.view.tutorial).house;
  return (
    <>
      <FirstSteps {...props} inSheet />
      {house && <Daily {...props} />}
      {house && <Ledger {...props} />}
    </>
  );
}

/** The season's side: the next merchant title, the mastery, the bales. */
export function SeasonTiles(props: GameProps) {
  return (
    <>
      <AdviceTile {...props} />
      <DashboardTile {...props} />
      <TendersTile {...props} />
      <DealsTile {...props} />
      <CompanyTile {...props} />
      <SeasonGoal {...props} />
      <MasteryTile {...props} />
      <BaleTile {...props} />
    </>
  );
}
