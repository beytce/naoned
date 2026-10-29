import { useState } from "react";
import { GoodsMark } from "../art/goods.js";
import { ResourceIcon } from "../art/resources.js";
import { fr } from "../i18n.js";
import { locale } from "../lang.js";
import { Badge, Label, Panel, Ribbon, Sheet, Slab, clock } from "../ui.js";
import { AdviceTile } from "./Advice.js";
import { BaleScreen, BaleTile } from "./Bales.js";
import { BuildCatalog } from "./Catalog.js";
import { CompanySheet, CompanyTile } from "./Company.js";
import { Daily } from "./Daily.js";
import { DashboardSheet, DashboardTile } from "./Dashboard.js";
import { DealsTile } from "./Deals.js";
import type { GameProps } from "./Game.js";
import { Ledger } from "./Ledger.js";
import { costOf } from "./Marche.js";
import { MasteryTile } from "./Mastery.js";
import { StoreView } from "./Store.js";
import { TendersSheet, TendersTile } from "./Tenders.js";
import { d, duration, hourOf, loafShare, minutesLabel, whole } from "./format.js";
import { harvestAll, harvestAndRestart } from "./harvest.js";
import { store } from "./store.js";
import type { BuildingView, Cost, PlayerView, Recipe } from "./types.js";
import { unlocksOf } from "./unlocks.js";
import {
  defaultBatches,
  eveningBatches,
  have,
  outputQty,
  readyOf,
  recipeOf,
  untilRest,
  workshopState,
} from "./workshops.js";

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
  // Each good by its mark, its quantity under it: the chain reads from left to right.
  const side = (m: Record<string, number>, out: boolean) =>
    Object.entries(m).map(([r, q]) => (
      <span key={r} className="inline-flex flex-col items-center gap-0.5">
        <GoodsMark code={r} size={30} title={props.names.resource(r)} />
        <span className="font-display text-sm font-bold tabular-nums">
          {out ? outputQty(props, r, q * level, level) : q * level}
        </span>
      </span>
    ));
  const inputs = side(recipe.inputs, false);
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-2xl bg-night px-3 py-2.5">
      {inputs.length > 0 && (
        <>
          {inputs}
          <svg viewBox="0 0 32 12" className="h-3 w-8 shrink-0" aria-hidden="true">
            <path
              d="M1 6h26M22 1.5l5 4.5-5 4.5"
              fill="none"
              stroke="rgb(var(--info))"
              strokeWidth="1.8"
              strokeDasharray="3 3"
              strokeLinecap="round"
            />
          </svg>
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

/**
 * What something costs, the materials short in red; with `buyable`, a material short is a button
 * that opens its trade at the Rialto.
 */
export function CostList({
  cost,
  props,
  buyable = false,
}: { cost: Cost; props: GameProps; buyable?: boolean }) {
  return (
    // Its buttons keep their 44 px clear of the touch area of the button under them.
    <div className={`flex flex-wrap items-center gap-3 ${buyable ? "pb-4" : ""}`}>
      <span className="font-display text-sm font-semibold">{d(cost.ducats)}</span>
      {Object.entries(cost.materials).map(([r, q]) => {
        const ok = have(props.view, r) >= q;
        const inner = [
          <ResourceIcon key="icon" code={r} size={20} />,
          <span key="qty" className="font-display text-sm font-semibold tabular-nums">
            {Math.min(have(props.view, r), q)}/{q}
          </span>,
        ];
        return buyable && !ok && props.view.market.some((l) => l.resource === r) ? (
          <button
            key={r}
            type="button"
            aria-label={`${fr.game.buy} : ${props.names.resource(r)}`}
            onClick={() => props.setSheet(`trade:${r}`)}
            className="inline-flex min-h-11 items-center gap-1 text-vermilion underline decoration-dotted underline-offset-4"
          >
            {inner}
          </button>
        ) : (
          <span key={r} className={`inline-flex items-center gap-1 ${ok ? "" : "text-vermilion"}`}>
            {inner}
          </span>
        );
      })}
    </div>
  );
}

/** The materials an upgrade lacks, and what buying them right away at the Rialto costs. */
export function missingMaterials(props: GameProps, cost: Cost) {
  const lines = Object.entries(cost.materials)
    .map(([r, q]) => ({ resource: r, quantity: q - have(props.view, r) }))
    .filter((l) => l.quantity > 0);
  const estimate = lines.reduce(
    (n, l) => n + costOf(props.view.book[l.resource]?.asks ?? [], l.quantity),
    0n,
  );
  return { lines, estimate };
}

/**
 * Buys what an upgrade lacks, one order right away per material, and says in one toast what was
 * bought (or why less).
 */
export function BuyMissing({
  cost,
  props,
  gold = false,
}: {
  cost: Cost;
  props: GameProps;
  /** The screen's one action (refonte UX, lot 4): in gold, its size, what it buys said. */
  gold?: boolean;
}) {
  const { lines, estimate } = missingMaterials(props, cost);
  if (lines.length === 0) return null;
  const t = fr.game.workshop;
  if (estimate === 0n) return <p className="meta">{t.buyMissingNone}</p>;
  const one = lines.length === 1 ? lines[0] : undefined;
  return (
    <Slab
      size={gold ? "lg" : "sm"}
      tone={gold ? "gold" : "ghost"}
      className="w-full"
      coach="buy-missing"
      disabled={props.busy}
      onClick={async () => {
        const said: string[] = [];
        let short = false;
        for (const l of lines) {
          const res = await props.actQuiet({
            type: "instantOrder",
            resource: l.resource,
            side: "buy",
            quantity: l.quantity,
          });
          // Refused: the error is said, nothing more to buy.
          if (!res) return;
          const o = res.outcome;
          if (o?.kind !== "instant") continue;
          if (o.filled < o.requested) short = true;
          said.push(
            fr.game.book.instantDone(
              "buy",
              o.filled,
              o.requested,
              props.names.resource(l.resource),
              d(o.amount),
              o.reason,
              props.catalog.rules.instantOrderSlippageBps / 100,
            ),
          );
        }
        if (said.length > 0) props.say(said.join(" "), short ? "warn" : "info");
      }}
    >
      {one
        ? t.buyMissingOne(one.quantity, props.names.resource(one.resource), whole(estimate))
        : t.buyMissing(whole(estimate))}
    </Slab>
  );
}

const FIRST_STEPS = [
  "produce",
  "harvest",
  "transform",
  "sell_city",
  "market_buy",
  "invest",
  "mission",
];

function FirstSteps(props: GameProps & { inSheet?: boolean }) {
  const done = new Set(props.view.tutorial);
  // Done once the guide's last step is: the first upgrade may have waited for the Rialto.
  if (done.has("mission") || FIRST_STEPS.every((s) => done.has(s))) return null;
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
          {rations.byBatch
            ? fr.game.rations.byBatch(
                loafShare(rations.byBatch.transform),
                loafShare(rations.byBatch.raw),
              )
            : fr.game.rations.nextMeal(
                clock(rations.nextMealAt - props.now),
                rations.perDay,
                stock,
              )}
        </p>
        {hungry && (
          <p className="mt-1 text-vermilion">
            {fr.game.rations.hungry(clock(rations.hungryUntil - props.now))}
          </p>
        )}
        {!hungry && days < 1 && (
          <p className="mt-1 text-gold">
            {rations.byBatch
              ? fr.game.rations.lowBatch
              : fr.game.rations.low(rations.perDay - stock)}
          </p>
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

/**
 * The tone of a workshop's state, as its star's (Lagune): lagoon when it is ready, lapis at work,
 * quiet when it waits for goods (a normal state of a chain, not an alarm: a hollow dot).
 */
const STATE_TONE = {
  ready: { glow: "lagoon", dot: "bg-lagoon", text: "text-lagoon", ring: "ring-lagoon/60" },
  running: { glow: undefined, dot: "bg-info", text: "text-info", ring: "ring-info/50" },
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
    <span className="meta block">
      {e.missingInputs.length > 0
        ? t.missing(
            e.missingInputs
              .map(
                (code) =>
                  fr.game.workshop.some(code, props.names.resource(code)) ??
                  props.names.resource(code).toLowerCase(),
              )
              .join(", "),
          )
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
        <WorkshopStar
          small
          output={Object.keys(recipe?.outputs ?? {})[0]}
          state={st.state}
          progress={st.progress ?? 0}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="min-w-0 font-place text-[0.9375rem] font-bold uppercase leading-tight tracking-[0.12em]">
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
                <span className="slab flex items-center gap-1 whitespace-nowrap px-2.5 py-0.5 font-sans text-xs font-bold text-cream ring-1 ring-inset ring-line">
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
          <p className="mt-1 flex flex-wrap items-center gap-x-2 font-sans text-xs text-cream-dim">
            {BigInt(b.economics.queued?.marginPerHour ?? b.economics.marginPerHour) > 0n && (
              <span
                title={fr.game.economics.perHourLong}
                className="rounded-full bg-night-3 px-2 py-0.5 font-display font-semibold tabular-nums text-cream"
              >
                {fr.game.economics.perHour(
                  d(b.economics.queued?.marginPerHour ?? b.economics.marginPerHour),
                )}
              </span>
            )}
            {props.view.bestUpgrade === b.id && b.economics.next && (
              <span className="text-gold">★ {fr.game.economics.best}</span>
            )}
          </p>
          {b.upgradeCost && !b.economics.advisable && b.economics.next && (
            <div className="mt-1">
              <NotAdvised b={b} props={props} />
            </div>
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
            level={b.economics.queued?.level ?? b.level}
            props={props}
            runningMs={job ? job.batchMs : undefined}
          />
          {b.economics.queued && <p className="meta mt-1 text-gold">{t.afterQueue(b.workLevel)}</p>}
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
    { n: count("ready"), label: t.ready, cls: "bg-lagoon/15 text-lagoon" },
    { n: count("running"), label: t.running, cls: "bg-info/15 text-info" },
    {
      n: count("idle") + count("blocked"),
      label: t.idle,
      cls: "text-cream-dim ring-1 ring-inset ring-line",
    },
  ].filter((c) => c.n > 0);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {chips.map((c) => (
          <span key={c.cls} className={`slab px-3 py-1 font-display text-xs font-bold ${c.cls}`}>
            {c.n} {c.label(c.n)}
          </span>
        ))}
      </div>
      {(ready > 0 || count("idle") > 0) && (
        <Slab className="w-full" disabled={props.busy} onClick={() => harvestAndRestart(props)}>
          {ready > 0 ? t.collectAll(ready) : t.restartAll}
        </Slab>
      )}
      {/* Restarting consumes the stock's inputs: harvesting alone keeps them for the orders. */}
      {ready > 0 && (
        <Slab
          className="w-full"
          tone="ghost"
          disabled={props.busy}
          onClick={() => harvestAll(props)}
        >
          {t.harvestOnly}
        </Slab>
      )}
    </div>
  );
}

/** « 22:05 », in Paris. */
function timeOfDay(at: number): string {
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  }).format(new Date(at));
}

/** What keeps a workshop from starting more batches: an input short, or the queue's length. */
function limit(b: BuildingView, recipe: Recipe, props: GameProps): string | null {
  const t = fr.game.workshop;
  let by: { res: string; n: number; perBatch: number } | null = null;
  for (const [res, perLot] of Object.entries(recipe.inputs)) {
    const perBatch = perLot * b.workLevel;
    if (perBatch <= 0) continue;
    const n = Math.floor(have(props.view, res) / perBatch);
    if (!by || n < by.n) by = { res, n, perBatch };
  }
  if (by && by.n <= b.canStart)
    return t.limitedBy(
      b.canStart,
      by.res,
      props.names.resource(by.res),
      have(props.view, by.res),
      by.perBatch,
    );
  return t.limitedByQueue(b.canStart, props.catalog.rules.productionQueueMaxHours);
}

const STAR_R = 44;
const STAR_C = 2 * Math.PI * STAR_R;

/**
 * A workshop as a star of the Lagune direction: the mark of what it makes in a round of the night,
 * the arc of its batch in lapis, full and lagoon when it is ready, a dotted round when it waits
 * (cream for work, grey for its matter: never an alarm).
 */
function WorkshopStar({
  output,
  state,
  progress,
  small,
}: { output?: string; state: string; progress: number; small?: boolean }) {
  const waiting = state !== "ready" && state !== "running";
  return (
    <span
      className={`relative flex shrink-0 items-center justify-center ${small ? "h-[4.5rem] w-[4.5rem]" : "h-28 w-28"}`}
    >
      {state === "ready" && <span className="marker-halo absolute inset-0 rounded-full" />}
      <svg viewBox="-50 -50 100 100" className="absolute inset-0 -rotate-90" aria-hidden="true">
        {waiting ? (
          <circle
            r={STAR_R}
            fill="none"
            stroke={state === "idle" ? "rgb(var(--cream) / 0.6)" : "rgb(var(--muted))"}
            strokeWidth="2.5"
            strokeDasharray="6 6"
          />
        ) : (
          <>
            <circle r={STAR_R} fill="none" stroke="rgb(var(--info) / 0.2)" strokeWidth="5" />
            <circle
              r={STAR_R}
              fill="none"
              stroke={state === "ready" ? "rgb(var(--lagoon))" : "rgb(var(--info))"}
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={`${(STAR_C * (state === "ready" ? 1 : Math.max(0.03, Math.min(1, progress)))).toFixed(1)} ${STAR_C.toFixed(1)}`}
            />
          </>
        )}
      </svg>
      <span
        className={`flex items-center justify-center rounded-full bg-night ring-1 ring-line ${small ? "h-12 w-12" : "h-[4.75rem] w-[4.75rem]"}`}
      >
        {output ? (
          <GoodsMark code={output} size={small ? 28 : 44} />
        ) : (
          <span className="h-5 w-5 rotate-45 bg-gold-soft" />
        )}
      </span>
    </span>
  );
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
  // The preset chosen (maquette `Production`: presets only): one, tonight, the most.
  const [pick, setPick] = useState(defaultBatches(props.view.tutorial, b.canStart) > 1 ? 2 : 0);
  const recipe = recipeOf(props, b.type);
  const st = workshopState(props, b);
  const t = fr.game.workshop;
  const cost = b.upgradeCost;
  const canUpgrade = cost !== null && affordable(props.view, cost);
  const rest = untilRest(props.now);
  const evening = eveningBatches(props, b);
  const presets = [
    { label: t.one, n: 1 },
    { label: rest.night ? t.night : t.evening, n: evening },
    { label: t.max, n: b.canStart },
  ];
  const q = Math.min(presets[pick]?.n ?? 1, Math.max(1, b.canStart));
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
  const lacking = !!cost && missingMaterials(props, cost).lines.length > 0;
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
      <CostList cost={cost} props={props} buyable />
      {b.job && b.job.endsAt > props.now && !b.path && (
        <p className="text-sm text-gold">{t.queueKeeps(b.level + 1, timeOfDay(b.job.endsAt))}</p>
      )}
      {/* One gold: what is lacking bought here first, then the upgrade (refonte UX, lot 4). */}
      {lacking ? (
        <BuyMissing cost={cost} props={props} gold />
      ) : canUpgrade ? (
        <Slab
          size="lg"
          className="w-full"
          coach="sheet-upgrade"
          disabled={props.busy}
          onClick={async () => {
            if (await props.act({ type: "upgrade", buildingId: b.id }))
              props.setSheet(`produce:${b.id}`);
          }}
        >
          {fr.game.upgradeTo(b.level + 1)}
        </Slab>
      ) : (
        <p className="meta">{t.shortOf(d(BigInt(cost.ducats) - BigInt(props.view.cash)))}</p>
      )}
      <Slab
        tone="ghost"
        className="w-full"
        onClick={() => props.setSheet(recipe ? `produce:${b.id}` : null)}
      >
        {t.later}
      </Slab>
    </div>
  );

  // The upgrade in a sheet of its own (maquette `Production`): its title, then all of it.
  if (focus === "upgrade" && upgrade)
    return (
      <div className="space-y-4">
        <h3 className="font-place text-xl font-bold uppercase tracking-[0.14em]">
          {t.upgradeTitle(props.names.building(b.type), b.level + 1)}
        </h3>
        {choice}
        {upgrade}
      </div>
    );

  const output = Object.keys(recipe?.outputs ?? {})[0] ?? "";
  const perBatch = recipe ? outputQty(props, output, recipe.outputs[output] ?? 0, b.workLevel) : 0;
  const relaunch = !!recipe && b.canStart > 0 && !(b.job && st.ready < b.job.batches);
  const harvestQty = st.quantity ?? 0;
  const harvestRes = props.names.resource(st.resource ?? output);
  const fast = b.fastSeconds !== null && q === 1;
  const endsAt =
    props.now + (fast ? (b.fastSeconds ?? 0) * 1000 : q * (recipe?.durationMinutes ?? 0) * 60_000);
  // What keeps the batches down: an input short, to buy at the Market from here.
  const short = recipe
    ? Object.entries(recipe.inputs)
        .map(([res, per]) => ({
          res,
          n: Math.floor(have(props.view, res) / Math.max(1, per * b.workLevel)),
        }))
        .sort((x, y) => x.n - y.n)[0]
    : undefined;
  const limited = recipe && relaunch ? limit(b, recipe, props) : null;
  const produce = async () => {
    if (st.ready > 0 && !(await props.act({ type: "collect", buildingId: b.id }))) return;
    if (relaunch && (await props.act({ type: "startProduction", buildingId: b.id, batches: q })))
      props.setSheet("workshops");
  };
  return (
    <div className="space-y-5">
      {/* The workshop as a star (Lagune): what it makes, the arc of its batch, its name. */}
      <div className="flex flex-col items-center gap-1 text-center">
        <WorkshopStar output={output || undefined} state={st.state} progress={st.progress ?? 0} />
        <p className="label text-cream-dim">
          {fr.game.level(b.level)}
          {b.path && ` · ${fr.game.manufacture.paths[b.path].name}`}
        </p>
        <h3 className="font-place text-xl font-bold uppercase tracking-[0.18em]">
          {props.names.building(b.type)}
        </h3>
        {status && st.state !== "ready" && (
          <p className={`text-sm ${st.state === "blocked" ? "text-cream-dim" : "text-info"}`}>
            {status}
          </p>
        )}
      </div>
      {st.ready > 0 && (
        // What waits, in a lagoon band: the harvest itself is the gold at the foot.
        <p
          aria-live="polite"
          className="flex items-center gap-2 rounded-2xl bg-lagoon/15 px-3 py-2.5 text-sm font-semibold text-lagoon ring-1 ring-inset ring-lagoon/40"
        >
          <span className="h-2 w-2 shrink-0 rounded-full bg-lagoon" aria-hidden="true" />
          {t.readyBanner(st.ready, harvestQty, harvestRes)}
        </p>
      )}
      {!recipe && <p className="text-sm text-cream-dim">{fr.game.palazzoHelp}</p>}
      {recipe && <RecipeFlow recipe={recipe} level={b.workLevel} props={props} />}
      {relaunch && recipe && (
        <div className="space-y-3">
          <Label>{st.ready > 0 ? t.relaunch : fr.game.batchesLabel}</Label>
          <div className="grid grid-cols-3 gap-2">
            {presets.map((o, i) => (
              <button
                key={o.label}
                type="button"
                aria-pressed={pick === i}
                onClick={() => setPick(i)}
                // The one chosen reads as chosen: lit, with its tick, never as switched off.
                className={`flex min-h-11 flex-col items-center justify-center rounded-full px-2 py-1 text-xs font-semibold leading-tight transition active:scale-95 ${pick === i ? "bg-info text-ink" : "text-cream-dim ring-1 ring-inset ring-edge"}`}
              >
                <span>
                  {pick === i && "✓ "}
                  {o.label}
                </span>
                <span className="font-display text-sm tabular-nums">{t.lots(o.n)}</span>
              </button>
            ))}
          </div>
          <p className="font-display text-base font-extrabold">
            {t.result(q * perBatch, props.names.resource(output), hourOf(endsAt))}
          </p>
          {limited && <p className="meta">{limited}</p>}
          {limited && short && short.n <= b.canStart && (
            // The input that limits, bought at the Market from here: a line of its own.
            <button
              type="button"
              onClick={() => props.setSheet(`trade:${short.res}`)}
              className="-my-2 flex min-h-12 items-center text-sm font-semibold text-info"
            >
              {t.buySome(
                t.some(short.res, props.names.resource(short.res)) ??
                  props.names.resource(short.res),
              )}{" "}
              ›
            </button>
          )}
          {(() => {
            // The bread these batches eat (E1-4), the workshop's rest of a loaf aside.
            const by = props.view.rations.byBatch;
            if (!by || fast) return null;
            const k = Object.keys(recipe.inputs).length > 0 ? by.transform : by.raw;
            const loaves = Math.floor((q * b.workLevel * k) / 4);
            if (loaves === 0) return null;
            const stock = have(props.view, props.view.rations.resource);
            return (
              <p className={`text-sm ${loaves > stock ? "text-gold" : "text-cream-dim"}`}>
                {fr.game.rations.batchNeed(loaves, stock)}
              </p>
            );
          })()}
          {fast && (
            <p className="text-sm text-cream-dim">{fr.game.fastBatch(b.fastSeconds ?? 0)}</p>
          )}
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
              onClick={() => props.setSheet(`trade:${missing}`)}
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
      {cost && (
        // The upgrade, a row that opens its own sheet (maquette `Production`).
        <button
          type="button"
          data-coach={`upgrade-row-${b.id}`}
          onClick={() => props.setSheet(`upgrade:${b.id}`)}
          className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left ring-1 ring-inset ring-edge transition active:scale-[0.98]"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-info ring-2 ring-info">
            ↑
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">{t.upgradeLater(b.level + 1)}</span>
            <span className="block text-xs text-cream-dim">
              {t.upgradeYield(Math.round(props.catalog.rules.levelYieldBonusBps / 100))} ·{" "}
              {d(cost.ducats)}
              {Object.entries(cost.materials).map(
                ([r, n]) => `, ${n} ${props.names.resource(r).toLowerCase()}`,
              )}
            </span>
          </span>
          <span className="text-xl text-cream-dim" aria-hidden="true">
            ›
          </span>
        </button>
      )}
      {(st.ready > 0 || relaunch) && (
        // The one gold, at the foot: harvest and restart, harvest, or produce.
        <Slab
          size="lg"
          className="w-full"
          coach={relaunch ? "sheet-produce" : undefined}
          disabled={props.busy}
          onClick={() => void produce()}
        >
          {st.ready > 0
            ? relaunch
              ? t.harvestRelaunch(harvestQty, harvestRes, q)
              : t.harvestOnly(harvestQty, harvestRes)
            : t.produceN(q)}
        </Slab>
      )}
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
export function WorkshopsList(props: GameProps & { wide?: boolean }) {
  const room = props.view.buildings.length < props.catalog.rules.maxBuildings;
  return (
    <div className="space-y-3">
      <WorkshopsSummary {...props} />
      {/* In the wide window of a computer, two columns of cards. */}
      <div className={`grid gap-3 ${props.wide ? "lg:grid-cols-2" : ""}`}>
        {props.view.buildings.map((b) => (
          <Workshop key={b.id} b={b} props={props} />
        ))}
      </div>
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
        size="wide"
        docked
      >
        <WorkshopsList {...props} wide />
      </Sheet>
      <Sheet
        open={(kind === "produce" || kind === "upgrade") && !!sheetBuilding}
        // The upgrade's sheet goes back to its workshop; the workshop's, to the list.
        onClose={() => props.setSheet(kind === "upgrade" && id ? `produce:${id}` : "workshops")}
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
      <Sheet
        open={props.sheet === "buildHere"}
        onClose={close}
        title={fr.game.catalog.title}
        summary={fr.game.catalog.places(view.buildings.length, props.catalog.rules.maxBuildings)}
      >
        <BuildCatalog {...props} />
      </Sheet>
      <Sheet open={props.sheet === "store"} onClose={close} title={fr.game.domain.store.title}>
        <div className="space-y-4">
          <StoreView {...props} />
          <Rations {...props} />
        </div>
      </Sheet>
      {props.sheet === "bales" && <BaleScreen {...props} />}
      <CompanySheet {...props} />
      <DashboardSheet {...props} />
      <TendersSheet {...props} />
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
