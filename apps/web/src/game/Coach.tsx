import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Lorenzo } from "../art/scenes.js";
import { fr } from "../i18n.js";
import { locale } from "../lang.js";
import { LorenzoCard, Slab, clock } from "../ui.js";
import { affordable, have, missingMaterials } from "./Comptoir.js";
import type { GameProps } from "./Game.js";
import { RendezVous } from "./RendezVous.js";
import { bringOnce, browserPage, isCovered, outOfSheet, unionBox } from "./coachSight.js";
import { minutesLabel } from "./format.js";
import { store } from "./store.js";
import { outputQty } from "./workshops.js";

const STEPS = [
  "produce",
  "harvest",
  "transform",
  "sell_city",
  "market_buy",
  "invest",
  "mission",
] as const;
const CITY_GOODS = ["bread", "bricks", "planks"];
/** The construction material each region lacks. */
const MISSING: Record<string, string> = {
  terraferma: "bricks",
  lagoon: "planks",
  dolomites: "bricks",
};

interface CoachStep {
  text: string;
  /** data-coach value of the element to point at. */
  target?: string;
  /** Pointed at instead of the target while it is on screen (a sheet opened on the target). */
  follow?: string;
  /** Text shown while `follow` is on screen. */
  followText?: string;
  waitUntil?: number;
  final?: boolean;
  /** Store key that lets the player skip a step the world blocks (e.g. an empty market). */
  skip?: string;
}

/**
 * What the market_buy step asks for: the material the region lacks if someone sells it,
 * otherwise anything useful on offer, so the guide never points at an empty order book.
 */
function toBuy(props: GameProps): string | null {
  const { view } = props;
  const missing = MISSING[view.player.region] ?? "planks";
  const wanted = [missing, "planks", "bricks", "wood", "bread", "flour", "wheat", "clay"];
  // Something one can actually buy: a player's offer, or the Dogana within today's quota.
  const buyable = (resource: string) => {
    const book = view.book[resource];
    if (!book) return false;
    if (book.asks.some((l) => l.by !== "market_maker" && !l.mine)) return true;
    const fondaco = book.asks.some((l) => l.by === "market_maker");
    return fondaco && (book.quota.buy === null || book.quota.buy > 0);
  };
  const onSale = new Set(view.market.map((m) => m.resource).filter(buyable));
  return wanted.find((r) => onSale.has(r)) ?? null;
}

/** The counter on the map, then its panel's button `target`. */
function atHome(props: GameProps, step: CoachStep): CoachStep {
  if (props.tab !== "comptoir" || props.selection?.kind !== "home")
    return { text: fr.game.coach.tapHome, target: "home" };
  return step;
}

/** A workshop's production: the counter, its workshops, the workshop, then "Produire". */
function produceAt(props: GameProps, id: string, building: string, text?: string): CoachStep {
  const c = fr.game.coach;
  if (props.sheet === `produce:${id}`) {
    // The batch's own time: a few seconds in the guide's first ones, its recipe's after.
    const b = props.view.buildings.find((x) => x.id === id);
    const recipe = props.catalog.buildings.find((x) => x.type === b?.type)?.recipe;
    const time = b?.fastSeconds
      ? fr.game.coach.seconds(b.fastSeconds)
      : minutesLabel(recipe?.durationMinutes ?? 0);
    return { text: text ?? c.produce(building, time), target: "sheet-produce" };
  }
  if (props.sheet === "workshops")
    return { text: text ?? c.produceTap(building), target: `produce-${id}` };
  return atHome(props, { text: text ?? c.openWorkshops(building), target: "panel-workshops" });
}

/**
 * The first upgrade of a raw workshop: open it, buy at once what it lacks (no more), upgrade. Its
 * gain is read from the yield; without the means (cash, goods on sale), the guide moves on.
 */
function investStep(props: GameProps, isRaw: (type: string) => boolean): CoachStep | null {
  const c = fr.game.coach;
  const { view, names } = props;
  const raw = view.buildings
    .filter((b) => b.upgradeCost && isRaw(b.type))
    .sort((a, b) => a.level - b.level)[0];
  const cost = raw?.upgradeCost;
  if (!raw || !cost) return null;
  const { lines, estimate } = missingMaterials(props, cost);
  // What the Rialto sells at once, within the price's protection, must cover what is lacking.
  const short = lines.some((l) => (view.book[l.resource]?.instant?.buy?.units ?? 0) < l.quantity);
  if (
    (lines.length > 0 && (estimate === 0n || short)) ||
    BigInt(view.cash) < BigInt(cost.ducats) + estimate
  )
    return { text: c.investLater, skip: "skipInvest" };
  const name = names.building(raw.type);
  if (props.sheet === `upgrade:${raw.id}`) {
    if (lines.length > 0) return { text: c.investBuy, target: "buy-missing" };
    const [resource, base] = Object.entries(
      props.catalog.buildings.find((b) => b.type === raw.type)?.recipe?.outputs ?? {},
    )[0] ?? ["", 1];
    const now = outputQty(props, resource, base, raw.level);
    const next = outputQty(props, resource, base, raw.level + 1);
    const times = (next / Math.max(1, now)).toLocaleString(locale, { maximumFractionDigits: 1 });
    return { text: c.invest(name, raw.level + 1, times), target: "sheet-upgrade" };
  }
  if (props.sheet === "workshops") return { text: c.investTap(name), target: `upgrade-${raw.id}` };
  return atHome(props, { text: c.investOpen(name), target: "panel-workshops" });
}

type CoachProps = GameProps & { departing: boolean };

/** Room the bubble takes at the top of the screen: a target above it sends the bubble down. */
const BUBBLE_ROOM = 190;

/**
 * What to do next, read from the live game: the guide follows the player instead of a script,
 * so it never gets stuck if they do things in another order.
 */
/**
 * The guide's steps done, as the player sees them: a delivery arrived counts as sold to the city
 * at once, though the server marks it at its next tick (else the guide fell back on « produce »).
 */
export function doneSteps(
  tutorial: readonly string[],
  deliveries: readonly { arriveAt: number }[],
  now: number,
): Set<string> {
  const done = new Set(tutorial);
  if (deliveries.some((d) => d.arriveAt <= now)) done.add("sell_city");
  return done;
}

function nextStep(props: CoachProps): CoachStep {
  const { view, now, names } = props;
  const done = doneSteps(view.tutorial, view.road?.deliveries ?? [], now);
  const ready = view.buildings.find(
    (b) =>
      b.job && Math.min(b.job.batches, Math.floor((now - b.job.startedAt) / b.job.batchMs)) > 0,
  );
  const recipeOf = (type: string) => props.catalog.buildings.find((b) => b.type === type)?.recipe;
  const isRaw = (type: string) => Object.keys(recipeOf(type)?.inputs ?? {}).length === 0;

  // On the road with an order the stock covers: deliver first, the harvest can wait a minute.
  const road = view.road;
  const deliverable =
    done.has("produce") && !done.has("sell_city") && road
      ? road.deliveries.some((dv) => now < dv.arriveAt)
        ? undefined
        : road.orders.find(
            (o) =>
              o.status === "open" &&
              // Never the workers' bread: the first delivery is the merchant's own goods.
              o.resource !== view.rations.resource &&
              have(view, o.resource) >= o.quantity,
          )
      : undefined;

  if (ready && !done.has("mission") && !deliverable) {
    if (props.sheet === "workshops")
      return { text: fr.game.coach.harvest, target: `harvest-${ready.id}` };
    return atHome(props, { text: fr.game.coach.harvest, target: "panel-harvest" });
  }

  if (!done.has("produce")) {
    const raw = view.buildings.find((b) => recipeOf(b.type) && isRaw(b.type));
    if (!raw) return { text: fr.game.coach.done, final: true };
    return produceAt(props, raw.id, names.building(raw.type));
  }

  if (!done.has("sell_city")) {
    // With deliveries by road: an order the stock covers, loaded on a cart and sent.
    if (road) {
      const going = road.deliveries.find((dv) => now < dv.arriveAt);
      if (going) {
        const left = clock(going.arriveAt - now);
        return going.welcome
          ? { text: fr.game.coach.welcomeEnRoute(left), target: `cart-${going.vehicleId}` }
          : { text: fr.game.coach.enRoute(left) };
      }
      if (deliverable) {
        if (props.departing) return { text: fr.game.coach.dispatch, target: "panel-go" };
        if (props.sheet?.startsWith("cargo:"))
          return {
            text: fr.game.coach.deliver,
            target: `cargo-order-${deliverable.id}`,
            follow: "cargo-ready",
            followText: fr.game.coach.dispatch,
          };
        const chosen = props.selection?.kind === "cart" ? props.selection.id : null;
        if (road.vehicles.some((v) => v.status === "free" && v.id === chosen))
          return { text: fr.game.coach.deliver, target: "panel-cargo" };
        const free = road.vehicles.find((v) => v.status === "free");
        if (free) return { text: fr.game.coach.goRoutes, target: `cart-${free.id}` };
      }
    }
    const good = road ? undefined : CITY_GOODS.find((r) => have(view, r) > 0);
    if (good) {
      const quote = view.cityQuotes
        .filter((q) => q.resource === good)
        .sort((a, b) => (BigInt(b.unitPrice) > BigInt(a.unitPrice) ? 1 : -1))[0];
      if (quote) {
        if (props.sheet === `sell:${quote.city}`)
          return {
            text: fr.game.coach.sellCity(names.resource(good)),
            target: `city-sell-${good}`,
          };
        return { text: fr.game.coach.sellCity(names.resource(good)), target: `city-${quote.city}` };
      }
    }
    const next = view.buildings.find(
      (b) => !b.job && b.canStart > 0 && !isRaw(b.type) && recipeOf(b.type),
    );
    if (next)
      return produceAt(
        props,
        next.id,
        names.building(next.type),
        fr.game.coach.transform(names.building(next.type)),
      );
    const running = view.buildings
      .filter((b) => b.job)
      .map((b) =>
        b.job
          ? b.job.startedAt +
            b.job.batchMs * (1 + Math.floor((now - b.job.startedAt) / b.job.batchMs))
          : 0,
      )
      .sort((a, b) => a - b)[0];
    if (running) return { text: fr.game.coach.wait(running - now), waitUntil: running };
    const raw = view.buildings.find((b) => !b.job && b.canStart > 0 && isRaw(b.type));
    if (raw) return produceAt(props, raw.id, names.building(raw.type));
  }

  if (!done.has("market_buy") && store.get("skipMarketBuy") !== "1") {
    const material = toBuy(props);
    if (!material) return { text: fr.game.coach.emptyMarket, skip: "skipMarketBuy" };
    if (props.sheet === `trade:${material}`)
      return {
        text: fr.game.coach.buy(
          fr.game.workshop.some(material, names.resource(material)) ?? names.resource(material),
        ),
        target: "sheet-buy",
      };
    if (props.sheet === "rialto")
      return {
        text: fr.game.coach.buy(
          fr.game.workshop.some(material, names.resource(material)) ?? names.resource(material),
        ),
        target: `row-${material}`,
      };
    if (props.selection?.kind === "city" && props.selection.code === "venezia")
      return { text: fr.game.coach.goRialto, target: "panel-rialto" };
    return { text: fr.game.coach.goRialto, target: "city-venezia" };
  }

  // The first upgrade: the merchant leaves knowing the house grows (E3-3 of the experts).
  if (!done.has("invest") && !done.has("mission") && store.get("skipInvest") !== "1") {
    const step = investStep(props, isRaw);
    if (step) return step;
  }

  if (!done.has("mission")) {
    // The tutorial ends on the merchant's ledger: a reward now, goals for the days to come.
    const claimable = view.missions.find((m) => m.unlocked && m.done && !m.claimed);
    if (!claimable) return { text: fr.game.coach.ledgerLater, final: true };
    return {
      text: fr.game.carnet.open,
      target: "hud-notices",
      follow: `claim-${claimable.id}`,
      followText: fr.game.coach.ledger,
    };
  }

  return { text: fr.game.coach.done, final: true };
}

/** Spotlight on the element to touch, with Lorenzo explaining why. */
export function Coach(props: CoachProps) {
  const [hidden, setHidden] = useState(() => store.get("guideHidden") === "1");
  const [finished, setFinished] = useState(() => store.get("guideDone") === "1");
  const [rect, setRect] = useState<DOMRect | null>(null);
  // The bubble's height, measured once drawn: where it lies at the top of the screen.
  const [bubbleH, setBubbleH] = useState(140);
  const bubble = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const h = bubble.current?.offsetHeight;
    if (h && Math.abs(h - bubbleH) > 2) setBubbleH(h);
  });
  const [onFollow, setOnFollow] = useState(false);
  // The target is on the page but something (a sheet, a window) lies over it.
  const [covered, setCovered] = useState(false);
  // On the campaign's layer the guide's places are not on the map: back to the trade first.
  const step: CoachStep =
    props.layer !== "trade"
      ? { text: fr.game.map.campaign.backToTrade, target: "tab-map" }
      : nextStep(props);
  const index = Math.min(STEPS.length, props.view.tutorial.length + 1);
  // A target out of sight in its sheet is brought into view once a step, never fought for.
  const bring = useRef(bringOnce()).current;

  useLayoutEffect(() => {
    if (hidden || finished || !step.target) {
      setRect(null);
      return;
    }
    // The same target may exist twice (phone tab bar, computer side bar): take the visible one.
    // A target in a sheet's folded rules is unfolded first.
    const visible = (name: string) => {
      const all = [...document.querySelectorAll<HTMLElement>(`[data-coach="${name}"]`)];
      for (const e of all) {
        const fold = e.closest<HTMLDetailsElement>("details:not([open])");
        if (fold) fold.open = true;
      }
      return all.find((e) => e.getClientRects().length > 0) ?? null;
    };
    const find = () => {
      const follow = step.follow ? visible(step.follow) : null;
      const el = follow ?? visible(step.target ?? "");
      setOnFollow(follow !== null);
      if (el) bring(`${step.text}>${follow ? step.follow : step.target}`, el, window.innerHeight);
      // The ring holds the target and what goes with it (the counter's name under it).
      const name = follow ? step.follow : step.target;
      const box = el
        ? (unionBox([
            el.getBoundingClientRect(),
            ...[...document.querySelectorAll(`[data-coach-with="${name}"]`)]
              .map((w) => w.getBoundingClientRect())
              .filter((r) => r.width > 0),
          ]) as DOMRect | null)
        : null;
      // Never a ring on what a window covers, even while it slides in, nor on a target its
      // sheet has scrolled out of sight (the finger would touch what lies around the sheet).
      // Under a sheet's own head, it is out of sight (brought back), not covered by a window.
      const out = !!el && outOfSheet(el, window.innerHeight);
      const hidden = el && box && !out ? isCovered(el, box, browserPage()) : false;
      setCovered(hidden);
      setRect(hidden || out ? null : box);
      // The one gold button while the guide speaks is the one it points at (index.css).
      for (const lit of document.querySelectorAll("[data-coach-lit]"))
        if (lit !== el) lit.removeAttribute("data-coach-lit");
      el?.setAttribute("data-coach-lit", "");
      document.body.dataset.coaching = "1";
    };
    find();
    const t = setInterval(find, 250);
    return () => {
      clearInterval(t);
      delete document.body.dataset.coaching;
      for (const lit of document.querySelectorAll("[data-coach-lit]"))
        lit.removeAttribute("data-coach-lit");
    };
  }, [step.target, step.follow, step.text, hidden, finished, bring]);
  const text = covered
    ? fr.game.coach.covered
    : onFollow && step.followText
      ? step.followText
      : step.text;

  useEffect(() => {
    if (step.final && props.view.tutorial.length >= STEPS.length) {
      store.set("guideDone", "1");
    }
  }, [step.final, props.view.tutorial.length]);

  if (finished || hidden || (!step.target && !step.waitUntil && props.tab !== "comptoir")) {
    // Lorenzo silent: the toasts back at the top.
    delete document.body.dataset.coachTop;
    return null;
  }

  // The bubble goes where it hides neither the target nor the panel or sheet the player works in:
  // at the top while a sheet or a place's panel is up, or for a target in the lower third; at the
  // bottom otherwise, and always at the bottom for a target under where it would sit at the top.
  // Low, or where the bubble at the bottom would cover it (its measured height: a larger text
  // makes it taller).
  const lowTarget =
    rect !== null &&
    (rect.top + rect.height / 2 > window.innerHeight * 0.65 ||
      rect.top + rect.height / 2 > window.innerHeight - bubbleH - 24);
  // At the top on the map, the bubble sits under the HUD's band: a target within its height there
  // sends it down.
  const hudTop =
    props.sheet === null
      ? Number.parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue("--hud-top"),
        ) || 0
      : 0;
  const highTarget = rect !== null && rect.top < Math.max(BUBBLE_ROOM, hudTop + 8 + bubbleH);
  const atTop =
    !highTarget && (props.sheet !== null || props.selection !== null || onFollow || lowTarget);
  // A target in the top of the screen (a round of the HUD) while a place's panel holds the foot:
  // the bubble just under the target, between the two, covering neither (a longer language
  // makes it taller).
  const underTarget =
    highTarget &&
    props.sheet === null &&
    props.selection !== null &&
    rect !== null &&
    rect.bottom < window.innerHeight * 0.4 &&
    rect.bottom + 12 + bubbleH < window.innerHeight;
  // The bubble at the top: the toasts go to the foot (index.css).
  if (atTop || underTarget) document.body.dataset.coachTop = "1";
  else delete document.body.dataset.coachTop;
  const pad = 6;
  // Kept inside the screen: the tab bar's end tabs touch its edges.
  const box = rect
    ? {
        left: Math.max(2, rect.left - pad),
        top: Math.max(2, rect.top - pad),
        width: Math.min(window.innerWidth - 2, rect.right + pad) - Math.max(2, rect.left - pad),
        height: Math.min(window.innerHeight - 2, rect.bottom + pad) - Math.max(2, rect.top - pad),
      }
    : undefined;
  // Rounded like what it rings (Lagune: pills and rounds, no square corner): a pill's ends.
  const round = box
    ? { ...box, borderRadius: Math.min(32, box.width / 2, box.height / 2) }
    : undefined;
  // On the body: the map is its own layer, the sheets open over it; the guide stays on top.
  return createPortal(
    <>
      {rect && (
        <>
          {/* The room around the target dimmed: a cut-out whose shadow covers the screen. */}
          <div
            className="pointer-events-none fixed z-[45] transition-all duration-200"
            // Light: the sheet it points into is dimmed already, its words must stay legible.
            style={{ ...round, boxShadow: "0 0 0 9999px rgba(10, 8, 14, 0.35)" }}
          />
          {/* The ring on its own element: its pulse must not wipe the dimming's shadow. */}
          <div
            className="coach-ring pointer-events-none fixed z-[45] border-[3px] border-info"
            data-coach-target={onFollow ? step.follow : step.target}
            style={round}
          />
        </>
      )}
      <div
        // At the top, under the HUD's band on the map (the purse and its coins in sight), over a
        // window's head when one is open.
        ref={bubble}
        style={
          underTarget && rect
            ? { top: rect.bottom + 12 }
            : atTop && props.sheet === null
              ? { top: "calc(var(--hud-top, 0.75rem) + 8px)" }
              : undefined
        }
        // Over a window, at the top, from 380 px wide, it leaves the window's cross free on the right (round
        // corners since the Lagune direction: no cut corner left room for it).
        className={`fixed inset-x-3 z-[46] mx-auto max-w-md animate-rise ${atTop || underTarget ? "top-[max(0.75rem,env(safe-area-inset-top))]" : "bottom-[calc(1rem+env(safe-area-inset-bottom))] lg:bottom-28"} ${(atTop || underTarget) && props.sheet !== null ? "min-[380px]:max-lg:right-16" : ""}`}
      >
        <LorenzoCard
          bubble
          portrait={<Lorenzo size={40} />}
          name={fr.game.coach.name}
          aside={fr.game.coach.step(index, STEPS.length)}
          foot={
            <div className="mt-2 flex items-center justify-between">
              <div className="flex gap-1">
                {STEPS.map((s, k) => (
                  <span
                    key={s}
                    className={`slab h-1.5 w-6 ${k < props.view.tutorial.length ? "bg-lagoon" : k === props.view.tutorial.length ? "bg-info" : "bg-line"}`}
                  />
                ))}
              </div>
              {step.skip ? (
                <Slab
                  size="sm"
                  onClick={() => {
                    if (step.skip) store.set(step.skip, "1");
                    props.onGuidePaused();
                  }}
                >
                  {fr.game.coach.skip}
                </Slab>
              ) : step.final ? (
                <Slab
                  size="sm"
                  onClick={() => {
                    store.set("guideDone", "1");
                    setFinished(true);
                  }}
                >
                  {fr.game.coach.finish}
                </Slab>
              ) : (
                <button
                  type="button"
                  className="label -my-2 -mr-2 h-11 px-2 text-cream-dim"
                  onClick={() => {
                    store.set("guideHidden", "1");
                    setHidden(true);
                    props.onGuidePaused();
                  }}
                >
                  {fr.game.coach.later}
                </button>
              )}
            </div>
          }
        >
          <p className="mt-1 text-sm leading-snug">{text}</p>
          {/* The last card gives a time to come back, and the means to be told (E3-1). */}
          {step.final && <RendezVous props={props} />}
          {step.waitUntil && (
            <p className="meta mt-1">
              {fr.game.coach.readyIn(clock(Math.max(0, step.waitUntil - props.now)))}
            </p>
          )}
        </LorenzoCard>
      </div>
    </>,
    document.body,
  );
}
