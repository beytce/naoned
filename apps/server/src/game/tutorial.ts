import { type GameEvent, type Theme, findRecipe } from "@comptoirs/engine";

/** The advisor's first steps, detected from engine events. Order matters. */
export const TUTORIAL_STEPS = [
  "produce",
  "harvest",
  "transform",
  "sell_city",
  "market_buy",
  "invest",
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
    if (e.type === "city_sale") reached.add("sell_city");
    if (e.type === "order_placed" && data.side === "buy" && Number(data.filled) > 0) {
      reached.add("market_buy");
    }
    if (e.type === "build" || e.type === "upgrade") reached.add("invest");
  }
  return reached;
}
