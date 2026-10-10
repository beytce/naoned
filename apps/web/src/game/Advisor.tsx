import { fr } from "../i18n.js";
import type { GameProps } from "./Game.js";
import { Card } from "./ui.js";

const STEPS = ["produce", "harvest", "transform", "sell_city", "market_buy", "invest"] as const;

/** The advisor: one next step at a time, until the tutorial is done. */
export function Advisor({ view, catalog, names, goTo }: GameProps) {
  const next = STEPS.find((s) => !view.tutorial.includes(s));
  if (!next) return null;
  const region = catalog.regions.find((r) => r.code === view.player.region);
  const [raw, craft] = region?.startingBuildings ?? [];
  const materials = ["bricks", "planks"];
  const missing = materials.find(
    (m) => !view.inventory.some((i) => i.resource === m && i.available > 0),
  );
  const text = {
    produce: fr.game.advisor.produce(names.building(raw ?? "")),
    harvest: fr.game.advisor.harvest,
    transform: fr.game.advisor.transform(names.building(craft ?? "")),
    sell_city: fr.game.advisor.sellCity,
    market_buy: fr.game.advisor.marketBuy(names.resource(missing ?? "planks")),
    invest: fr.game.advisor.invest,
  }[next];
  const target = next === "sell_city" || next === "market_buy" ? "marche" : null;
  return (
    <Card className="border-gold/50 bg-gold/10 dark:bg-gold/10">
      <p className="text-xs font-semibold uppercase tracking-wider text-rust dark:text-gold">
        {fr.game.advisor.title(STEPS.indexOf(next) + 1, STEPS.length)}
      </p>
      <p className="mt-1">{text}</p>
      {target && (
        <button
          type="button"
          className="mt-2 text-sm font-semibold underline"
          onClick={() => goTo(target)}
        >
          {fr.game.tabs.marche} →
        </button>
      )}
    </Card>
  );
}
