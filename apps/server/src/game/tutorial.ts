import { type GameEvent, type Theme, findRecipe } from "@comptoirs/engine";

/** The advisor's first steps, detected from engine events. Order matters. */
export const TUTORIAL_STEPS = [
  "produce",
  "harvest",
  "transform",
  "sell_city",
  "market_buy",
  // The first upgrade of a workshop (E3-3 of the experts): the merchant leaves knowing it grows.
  "invest",
  "mission",
] as const;
export type TutorialStep = (typeof TUTORIAL_STEPS)[number];

export function stepsReached(theme: Theme, events: GameEvent[]): Set<TutorialStep> {
  const reached = new Set<TutorialStep>();
  for (const e of events) {
    const data = e.data ?? {};
    if (e.type === "production_started") {
      reached.add("produce");
      const recipe = findRecipe(theme, String(data.recipe));
      if (recipe && Object.keys(recipe.inputs).length > 0) reached.add("transform");
    }
    if (e.type === "harvest") reached.add("harvest");
    // Selling to a city: by road once deliveries are on.
    if (e.type === "city_sale" || e.type === "delivery_arrived") reached.add("sell_city");
    if (e.type === "order_placed" && data.side === "buy" && Number(data.filled) > 0) {
      reached.add("market_buy");
    }
    if (e.type === "upgrade") reached.add("invest");
    if (e.type === "mission_claimed") reached.add("mission");
  }
  return reached;
}
