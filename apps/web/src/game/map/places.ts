import { fr } from "../../i18n.js";
import { hourOf, minutesLabel } from "../format.js";

/**
 * A place touched on the map (refonte UX, maquette `Main`): one sentence, at most one gold action
 * that acts in place (harvest, deliver), and a ghost button that leads inside. An action that
 * cannot be done is never gold: the sentence says what is missing instead.
 */

/** What waits at a place, by meaning: its halo's colour. */
export type Waits = "ready" | "city" | "rumour";

export type PlaceGold =
  | { kind: "harvest"; label: string }
  | { kind: "deliver"; label: string; order: string };

export interface Place {
  line: string;
  gold: PlaceGold | null;
  ghost: string;
  waits: Waits | null;
}

const t = () => fr.game.map.place;

/** « le moulin et la ferme », « le moulin, la forge et la ferme ». */
function listed(names: string[]): string {
  if (names.length < 2) return names.join("");
  return `${names.slice(0, -1).join(", ")} ${t().and} ${names[names.length - 1]}`;
}

export function homePlace(input: {
  name: string;
  /** The workshops with batches ready, by name. */
  ready: { name: string; batches: number }[];
  /** When the next batch under way is done (null: none runs). */
  nextAt: number | null;
}): Place {
  const batches = input.ready.reduce((n, r) => n + r.batches, 0);
  if (batches > 0)
    return {
      line: t().ready(batches, listed(input.ready.map((r) => r.name))),
      gold: { kind: "harvest", label: t().harvest(batches) },
      ghost: t().open,
      waits: "ready",
    };
  return {
    line: input.nextAt !== null ? t().nextAt(hourOf(input.nextAt)) : t().idle,
    gold: null,
    ghost: t().open,
    waits: null,
  };
}

/** An open order of a city, as the place reads it. */
export interface CityOrder {
  id: string;
  /** The good's name, lower case. */
  good: string;
  quantity: number;
  pay: bigint;
  payLabel: string;
  /** Units of the good in stock. */
  have: number;
  /** Some vehicle of the merchant (free or not) can carry it. */
  fits: boolean;
}

export function cityPlace(input: {
  code: string;
  name: string;
  orders: CityOrder[];
  /** A vehicle is free now. */
  freeCart: boolean;
  /** When the first busy vehicle is back (null: none out). */
  cartBackAt: number | null;
  /** The merchant is the city's Podestà. */
  master: boolean;
  /** Venice's own news: its auctions tonight, the morning's rumours. */
  venice: { lots: number; hour: string; rumours: number } | null;
  now: number;
}): Place {
  const ghost = input.venice ? t().venice : t().see(input.name);
  const can = (o: CityOrder) => o.have >= o.quantity && o.fits && input.freeCart;
  // The order it can deliver, else the best paid.
  const best = [...input.orders].sort(
    (a, b) => Number(can(b)) - Number(can(a)) || (b.pay > a.pay ? 1 : b.pay < a.pay ? -1 : 0),
  )[0];
  if (best && can(best))
    return {
      line: `${t().wants(best.quantity, best.good, best.payLabel)} ${t().youHave}`,
      gold: {
        kind: "deliver",
        label: t().deliver(best.quantity, best.good, best.payLabel),
        order: best.id,
      },
      ghost,
      waits: "city",
    };
  const news = input.venice
    ? input.venice.lots > 0
      ? t().auction(input.venice.lots, input.venice.hour)
      : input.venice.rumours > 0
        ? t().rumours(input.venice.rumours)
        : null
    : null;
  if (news) return { line: news, gold: null, ghost, waits: "rumour" };
  if (best) {
    const why =
      best.have < best.quantity
        ? t().missing(best.quantity - best.have)
        : !best.fits
          ? t().tooHeavy
          : input.cartBackAt !== null
            ? t().cartBack(
                minutesLabel(Math.max(1, Math.ceil((input.cartBackAt - input.now) / 60_000))),
              )
            : t().noCart;
    return {
      line: `${t().wants(best.quantity, best.good, best.payLabel)} ${why}`,
      gold: null,
      ghost,
      waits: null,
    };
  }
  return { line: input.master ? t().master : t().calm, gold: null, ghost, waits: null };
}

const RANK: Record<Waits, number> = { ready: 0, city: 1, rumour: 2 };

/**
 * Two halos at most on the map, by value (the harvest, a delivery, a rumour or the auctions); the
 * other places that wait carry a small dot. The map's décor moves little.
 */
export function halos(places: { key: string; waits: Waits | null }[]): Map<string, "halo" | "dot"> {
  const waiting = places
    .filter((p): p is { key: string; waits: Waits } => p.waits !== null)
    .map((p, i) => ({ ...p, i }))
    .sort((a, b) => RANK[a.waits] - RANK[b.waits] || a.i - b.i);
  return new Map(waiting.map((p, i) => [p.key, i < 2 ? "halo" : "dot"]));
}
