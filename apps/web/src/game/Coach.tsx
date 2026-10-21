import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Lorenzo } from "../art/scenes.js";
import { fr } from "../i18n.js";
import { Big, Label, Slab, clock } from "../ui.js";
import { affordable, have } from "./Comptoir.js";
import type { GameProps } from "./Game.js";
import { bringOnce, browserPage, isCovered, outOfSheet } from "./coachSight.js";
import { store } from "./store.js";

const STEPS = ["produce", "harvest", "transform", "sell_city", "market_buy", "mission"] as const;
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
  if (props.sheet === `produce:${id}`)
    return { text: text ?? c.produce(building), target: "sheet-produce" };
  if (props.sheet === "workshops")
    return { text: text ?? c.produceTap(building), target: `produce-${id}` };
  return atHome(props, { text: text ?? c.openWorkshops(building), target: "panel-workshops" });
}

type CoachProps = GameProps & { departing: boolean };

/** Room the bubble takes at the top of the screen: a target above it sends the bubble down. */
const BUBBLE_ROOM = 190;

/**
 * What to do next, read from the live game: the guide follows the player instead of a script,
 * so it never gets stuck if they do things in another order.
 */
function nextStep(props: CoachProps): CoachStep {
  const { view, now, names } = props;
  const done = new Set(view.tutorial);
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
      if (road.deliveries.some((dv) => now < dv.arriveAt))
        return { text: fr.game.coach.deliveryUnderway };
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
    if (running) return { text: fr.game.coach.wait, waitUntil: running };
    const raw = view.buildings.find((b) => !b.job && b.canStart > 0 && isRaw(b.type));
    if (raw) return produceAt(props, raw.id, names.building(raw.type));
  }

  if (!done.has("market_buy") && store.get("skipMarketBuy") !== "1") {
    const material = toBuy(props);
    if (!material) return { text: fr.game.coach.emptyMarket, skip: "skipMarketBuy" };
    if (props.sheet === `trade:${material}`)
      return { text: fr.game.coach.buy(names.resource(material)), target: "sheet-buy" };
    if (props.sheet === "rialto")
      return { text: fr.game.coach.buy(names.resource(material)), target: `row-${material}` };
    if (props.selection?.kind === "city" && props.selection.code === "venezia")
      return { text: fr.game.coach.goRialto, target: "panel-rialto" };
    return { text: fr.game.coach.goRialto, target: "city-venezia" };
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
  const [onFollow, setOnFollow] = useState(false);
  // The target is on the page but something (a sheet, a window) lies over it.
  const [covered, setCovered] = useState(false);
  // On the campaign's layer the guide's places are not on the map: back to the trade first.
  const step: CoachStep =
    props.layer !== "trade"
      ? { text: fr.game.map.campaign.backToTrade, target: "door-layer" }
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
    const visible = (name: string) =>
      [...document.querySelectorAll<HTMLElement>(`[data-coach="${name}"]`)].find(
        (e) => e.getClientRects().length > 0,
      ) ?? null;
    const find = () => {
      const follow = step.follow ? visible(step.follow) : null;
      const el = follow ?? visible(step.target ?? "");
      setOnFollow(follow !== null);
      if (el) bring(`${step.text}>${follow ? step.follow : step.target}`, el, window.innerHeight);
      const box = el ? el.getBoundingClientRect() : null;
      // Never a ring on what a window covers, even while it slides in, nor on a target its
      // sheet has scrolled out of sight (the finger would touch what lies around the sheet).
      const hidden = el && box ? isCovered(el, box, browserPage()) : false;
      setCovered(hidden);
      setRect(hidden || (el && outOfSheet(el, window.innerHeight)) ? null : box);
    };
    find();
    const t = setInterval(find, 250);
    return () => clearInterval(t);
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

  if (finished) return null;

  if (hidden) return null;

  // A message with nothing to point at stays on the counter.
  if (!step.target && !step.waitUntil && props.tab !== "comptoir") return null;

  // The bubble goes where it hides neither the target nor the panel or sheet the player works in:
  // at the top while a sheet or a place's panel is up, or for a target in the lower third; at the
  // bottom otherwise, and always at the bottom for a target under where it would sit at the top.
  const lowTarget = rect !== null && rect.top + rect.height / 2 > window.innerHeight * 0.65;
  const highTarget = rect !== null && rect.top < BUBBLE_ROOM;
  const atTop =
    !highTarget && (props.sheet !== null || props.selection !== null || onFollow || lowTarget);
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
  // On the body: the map is its own layer, the sheets open over it; the guide stays on top.
  return createPortal(
    <>
      {rect && (
        <>
          {/* The room around the target dimmed: a cut-out whose shadow covers the screen. */}
          <div
            className="pointer-events-none fixed z-[45] rounded-md transition-all duration-200"
            style={{ ...box, boxShadow: "0 0 0 9999px rgba(10, 8, 14, 0.62)" }}
          />
          {/* The ring on its own element: its pulse must not wipe the dimming's shadow. */}
          <div
            className="coach-ring pointer-events-none fixed z-[45] rounded-md border-[3px] border-info"
            data-coach-target={onFollow ? step.follow : step.target}
            style={box}
          />
        </>
      )}
      <div
        className={`fixed inset-x-3 z-[46] mx-auto max-w-md animate-rise ${atTop ? "top-[max(0.75rem,env(safe-area-inset-top))]" : "bottom-[calc(1rem+env(safe-area-inset-bottom))] lg:bottom-28"}`}
      >
        <div className="cut bg-info p-0.5 shadow-xl shadow-black/40" data-coach-bubble>
          <div className="cut bg-night-2 px-3.5 pb-2.5 pt-3">
            <div className="flex gap-3">
              <Lorenzo size={40} />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <Label className="text-info">{fr.game.coach.name}</Label>
                  <span className="meta shrink-0 whitespace-nowrap">
                    {fr.game.coach.step(index, STEPS.length)}
                  </span>
                </div>
                <p className="mt-1 text-sm leading-snug">{text}</p>
                {step.waitUntil && (
                  <Big className="mt-2 text-3xl text-lagoon">
                    {clock(step.waitUntil - props.now)}
                  </Big>
                )}
              </div>
            </div>
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
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
