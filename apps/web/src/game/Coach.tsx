import { useEffect, useLayoutEffect, useState } from "react";
import { Lorenzo } from "../art/scenes.js";
import { fr } from "../i18n.js";
import { Big, Label, Slab, clock } from "../ui.js";
import { affordable, have } from "./Comptoir.js";
import type { GameProps, MarketTab, Tab } from "./Game.js";
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

function goTab(props: GameProps, tab: Tab, text: string): CoachStep | null {
  return props.tab === tab ? null : { text, target: `tab-${tab}` };
}

function goMarketTab(props: GameProps, tab: MarketTab, text: string): CoachStep | null {
  return props.marketTab === tab ? null : { text, target: `mtab-${tab}` };
}

/**
 * What to do next, read from the live game: the guide follows the player instead of a script,
 * so it never gets stuck if they do things in another order.
 */
function nextStep(props: GameProps): CoachStep {
  const { view, now, names } = props;
  const done = new Set(view.tutorial);
  const ready = view.buildings.find(
    (b) =>
      b.job && Math.min(b.job.batches, Math.floor((now - b.job.startedAt) / b.job.batchMs)) > 0,
  );
  const recipeOf = (type: string) => props.catalog.buildings.find((b) => b.type === type)?.recipe;
  const isRaw = (type: string) => Object.keys(recipeOf(type)?.inputs ?? {}).length === 0;

  if (ready && !done.has("mission")) {
    return (
      goTab(props, "comptoir", fr.game.coach.goComptoir) ?? {
        text: fr.game.coach.harvest,
        target: `harvest-${ready.id}`,
      }
    );
  }

  if (!done.has("produce")) {
    const raw = view.buildings.find((b) => recipeOf(b.type) && isRaw(b.type));
    if (!raw) return { text: fr.game.coach.done, final: true };
    if (props.sheet === `produce:${raw.id}`)
      return { text: fr.game.coach.produce(names.building(raw.type)), target: "sheet-produce" };
    return (
      goTab(props, "comptoir", fr.game.coach.goComptoir) ?? {
        text: fr.game.coach.produce(names.building(raw.type)),
        target: `produce-${raw.id}`,
      }
    );
  }

  if (!done.has("sell_city")) {
    // With deliveries by road: an order of the board the stock covers, loaded on the cart.
    const road = view.road;
    if (road) {
      if (road.deliveries.some((dv) => now < dv.arriveAt))
        return { text: fr.game.coach.deliveryUnderway };
      const order = road.orders.find(
        (o) => o.status === "open" && have(view, o.resource) >= o.quantity,
      );
      if (order) {
        return (
          goTab(props, "routes", fr.game.coach.goRoutes) ?? {
            text: fr.game.coach.deliver,
            target: `road-order-${order.id}`,
          }
        );
      }
    }
    const good = road ? undefined : CITY_GOODS.find((r) => have(view, r) > 0);
    if (good) {
      return (
        goTab(props, "marche", fr.game.coach.goMarket) ??
        goMarketTab(props, "villes", fr.game.coach.goCities) ?? {
          text: fr.game.coach.sellCity(names.resource(good)),
          target: `city-sell-${good}`,
        }
      );
    }
    const next = view.buildings.find(
      (b) => !b.job && b.canStart > 0 && !isRaw(b.type) && recipeOf(b.type),
    );
    if (next) {
      if (props.sheet === `produce:${next.id}`)
        return {
          text: fr.game.coach.transform(names.building(next.type)),
          target: "sheet-produce",
        };
      return (
        goTab(props, "comptoir", fr.game.coach.goComptoir) ?? {
          text: fr.game.coach.transform(names.building(next.type)),
          target: `produce-${next.id}`,
        }
      );
    }
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
    if (raw)
      return (
        goTab(props, "comptoir", fr.game.coach.goComptoir) ?? {
          text: fr.game.coach.produce(names.building(raw.type)),
          target: `produce-${raw.id}`,
        }
      );
  }

  if (!done.has("market_buy") && store.get("skipMarketBuy") !== "1") {
    const material = toBuy(props);
    if (!material) return { text: fr.game.coach.emptyMarket, skip: "skipMarketBuy" };
    if (props.sheet === `trade:${material}`)
      return { text: fr.game.coach.buy(names.resource(material)), target: "sheet-buy" };
    return (
      goTab(props, "marche", fr.game.coach.goMarket) ??
      goMarketTab(props, "joueurs", fr.game.coach.goRialto) ?? {
        text: fr.game.coach.buy(names.resource(material)),
        target: `row-${material}`,
      }
    );
  }

  if (!done.has("mission")) {
    // The tutorial ends on the merchant's ledger: a reward now, goals for the days to come.
    const claimable = view.missions.find((m) => m.unlocked && m.done && !m.claimed);
    if (!claimable) return { text: fr.game.coach.ledgerLater, final: true };
    return (
      goTab(props, "comptoir", fr.game.coach.goComptoir) ?? {
        text: fr.game.coach.ledger,
        target: `claim-${claimable.id}`,
      }
    );
  }

  return { text: fr.game.coach.done, final: true };
}

/** Spotlight on the element to touch, with Lorenzo explaining why. */
export function Coach(props: GameProps) {
  const [hidden, setHidden] = useState(() => store.get("guideHidden") === "1");
  const [finished, setFinished] = useState(() => store.get("guideDone") === "1");
  const [rect, setRect] = useState<DOMRect | null>(null);
  const step = nextStep(props);
  const index = Math.min(STEPS.length, props.view.tutorial.length + 1);

  useLayoutEffect(() => {
    if (hidden || finished || !step.target) {
      setRect(null);
      return;
    }
    const find = () => {
      // The same target may exist twice (phone tab bar, computer side bar): take the visible one.
      const el =
        [...document.querySelectorAll<HTMLElement>(`[data-coach="${step.target}"]`)].find(
          (e) => e.getClientRects().length > 0,
        ) ?? null;
      setRect(el ? el.getBoundingClientRect() : null);
      return el;
    };
    const el = find();
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
    const t = setInterval(find, 250);
    return () => clearInterval(t);
  }, [step.target, hidden, finished]);

  useEffect(() => {
    if (step.final && props.view.tutorial.length >= STEPS.length) {
      store.set("guideDone", "1");
    }
  }, [step.final, props.view.tutorial.length]);

  if (finished) return null;

  if (hidden) return null;

  // A message with nothing to point at stays on the counter.
  if (!step.target && !step.waitUntil && props.tab !== "comptoir") return null;

  // The bubble goes where it does not hide the target (or the open sheet). A target in the tab
  // bar keeps it just above the bar, so the header (purse, notices) stays in sight.
  const inTabBar = rect !== null && rect.top > window.innerHeight - 96;
  const atTop =
    props.sheet !== null ||
    (!inTabBar && rect !== null && rect.top + rect.height / 2 > window.innerHeight * 0.55);
  const pad = 6;
  return (
    <>
      {rect && (
        <div
          className="pointer-events-none fixed z-[45] animate-pulsering rounded-md ring-2 ring-gold transition-all duration-200"
          style={{
            // Kept inside the screen: the tab bar's end tabs touch its edges.
            left: Math.max(2, rect.left - pad),
            top: Math.max(2, rect.top - pad),
            width: Math.min(window.innerWidth - 2, rect.right + pad) - Math.max(2, rect.left - pad),
            height:
              Math.min(window.innerHeight - 2, rect.bottom + pad) - Math.max(2, rect.top - pad),
            boxShadow: "0 0 0 9999px rgba(10, 8, 14, 0.62)",
          }}
        />
      )}
      <div
        className={`fixed inset-x-3 z-[46] mx-auto max-w-md animate-rise ${atTop ? "top-[max(0.75rem,env(safe-area-inset-top))]" : "bottom-[calc(5.25rem+env(safe-area-inset-bottom))] lg:bottom-8"}`}
      >
        <div className="relative rounded-2xl bg-night-2 p-4 shadow-xl shadow-black/40 ring-2 ring-gold">
          <div className="flex gap-3">
            <Lorenzo size={52} />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <Label className="text-gold">{fr.game.coach.name}</Label>
                <span className="label shrink-0 whitespace-nowrap">
                  {fr.game.coach.step(index, STEPS.length)}
                </span>
              </div>
              <p className="mt-1.5 text-[15px] leading-snug">{step.text}</p>
              {step.waitUntil && (
                <Big className="mt-2 text-3xl text-lagoon">{clock(step.waitUntil - props.now)}</Big>
              )}
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div className="flex gap-1">
              {STEPS.map((s, k) => (
                <span
                  key={s}
                  className={`slab h-1.5 w-6 ${k < props.view.tutorial.length ? "bg-lagoon" : k === props.view.tutorial.length ? "bg-gold" : "bg-line"}`}
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
    </>
  );
}
