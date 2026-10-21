import { useState } from "react";
import { ResourceIcon } from "../../art/resources.js";
import { fr } from "../../i18n.js";
import { Tabs } from "../../ui.js";
import { WorkshopsList } from "../Comptoir.js";
import type { GameProps } from "../Game.js";
import { MarketBoard } from "../Marche.js";
import { d } from "../format.js";
import { store } from "../store.js";
import { have } from "../workshops.js";

type Pane = "orders" | "workshops" | "market";

/** Width of the column, also kept clear by the HUD, the panel and the map's camera. */
export const SIDE_W = 384;

/**
 * On a computer, a column always beside the map: the day's orders, the workshops and the prices
 * of the Rialto, one tab each, for the long sessions that compare and plan.
 */
export function SideColumn({
  props,
  onCity,
}: {
  props: GameProps;
  /** An order touched: its city chosen on the map. */
  onCity: (code: string) => void;
}) {
  const [pane, setPane] = useState<Pane>(() => (store.get("sidePane") as Pane) || "orders");
  const t = fr.game.side;
  const choose = (p: Pane) => {
    setPane(p);
    store.set("sidePane", p);
  };
  return (
    <aside
      className="absolute bottom-0 right-0 top-0 z-30 flex flex-col border-l border-line bg-night-2/95 shadow-[-12px_0_30px_rgb(0_0_0/0.35)] backdrop-blur-md"
      style={{ width: SIDE_W }}
      aria-label={t.title}
    >
      <div className="px-5 pt-5">
        <Tabs
          variant="underline"
          value={pane}
          onChange={choose}
          options={[
            { value: "orders", label: t.orders },
            { value: "workshops", label: t.workshops },
            { value: "market", label: t.market },
          ]}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6 pt-4">
        {pane === "orders" && <Orders props={props} onCity={onCity} />}
        {pane === "workshops" && <WorkshopsList {...props} />}
        {pane === "market" && <MarketBoard {...props} />}
      </div>
      <p className="meta border-t border-line px-5 py-3">{t.keys}</p>
    </aside>
  );
}

/** The day's open orders, the best paid first; those the stock covers marked. */
function Orders({ props, onCity }: { props: GameProps; onCity: (code: string) => void }) {
  const road = props.view.road;
  const now = props.now;
  const open = (road?.orders ?? [])
    .filter((o) => o.status === "open" && o.opensAt <= now && now < o.expiresAt)
    .map((o) => ({ o, total: BigInt(o.unitPrice) * BigInt(o.quantity) }))
    .sort((a, b) => (a.total === b.total ? 0 : a.total > b.total ? -1 : 1));
  if (open.length === 0) return <p className="meta py-6 text-center">{fr.game.side.noOrders}</p>;
  return (
    <ul className="space-y-1.5">
      {open.map(({ o, total }) => {
        const covered = have(props.view, o.resource) >= o.quantity;
        return (
          <li key={o.id}>
            <button
              type="button"
              onClick={() => onCity(o.city)}
              className="cut flex w-full items-center gap-3 bg-night-3 px-3 py-2.5 text-left transition hover:bg-night-4"
            >
              <ResourceIcon code={o.resource} size={28} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">
                  {o.quantity} {props.names.resource(o.resource).toLowerCase()}
                </span>
                <span className="meta block truncate">
                  {props.names.city(o.city)}
                  {covered ? ` · ${fr.game.side.covered}` : ""}
                </span>
              </span>
              <span
                className={`font-display text-sm font-extrabold tabular-nums ${covered ? "text-gold" : "text-cream-dim"}`}
              >
                {d(total)}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
