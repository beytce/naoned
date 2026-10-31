import { useEffect, useState } from "react";
import { d } from "../../game/format.js";
import { Icon } from "../../game/map/icons.js";
import { fr } from "../../i18n.js";
import { Sheet, Slab } from "../../ui.js";
import { NewWorkshopList } from "../NewWorkshop.js";
import { Arsenal } from "../Sea.js";
import { Charroi } from "../World.js";
import { shownAt } from "../logic.js";
import type { EmpireAction, EmpirePayload } from "../types.js";
import { fleetOf } from "./logic.js";

const t = fr.empire.scene;
export type ProductionPane = "buildings" | "vehicles";

/**
 * The Production, behind the « + » of the upper right corner (the map at the centre, step 1):
 * what the house may build, in two panes. The buildings: a new workshop in Venetia. The vehicles:
 * the fleet, those at home among all, the carts to buy and the ships of the Arsenal.
 */
export function ProductionSheet({
  p,
  now,
  open,
  pane: first,
  highlight,
  busy,
  onClose,
  act,
  onPlace,
}: {
  p: EmpirePayload;
  now: number;
  open: boolean;
  pane: ProductionPane;
  highlight: string | null;
  busy: boolean;
  onClose: () => void;
  act: (a: EmpireAction) => Promise<void>;
  /** Puts a counter or the Arsenal down: the map in its mode of placing. */
  onPlace: (kind: "post" | "arsenal" | "camp" | "depot") => void;
}) {
  const [pane, setPane] = useState<ProductionPane>(first);
  useEffect(() => {
    if (open) setPane(first);
  }, [open, first]);
  if (!p.view) return null;
  const fleet = fleetOf(p, now);
  return (
    <Sheet open={open} onClose={onClose} kicker={t.owner} title={t.production}>
      <div className="mb-4 flex gap-2" role="tablist">
        {(["buildings", "vehicles"] as const).map((x) => (
          <button
            key={x}
            type="button"
            role="tab"
            aria-selected={pane === x}
            data-production-pane={x}
            onClick={() => setPane(x)}
            className={`min-h-10 flex-1 rounded-full px-3 text-sm font-semibold transition active:scale-95 ${pane === x ? "bg-info/15 text-info ring-1 ring-info" : "text-cream-dim ring-1 ring-line"}`}
          >
            {t[x]}
          </button>
        ))}
      </div>
      {pane === "buildings" ? (
        <>
          <Buildings p={p} onPlace={onPlace} />
          <NewWorkshopList
            p={p}
            region="veneto"
            highlight={highlight}
            busy={busy}
            onDone={onClose}
            act={act}
          />
        </>
      ) : (
        <>
          <p className="rounded-lg bg-info/15 px-3 py-2 text-sm font-semibold text-info" data-fleet>
            {t.fleet(fleet.free, fleet.total)}
            <span className="block text-xs font-normal text-cream-dim">
              {fr.empire.charroi.capacity(p.view.vehicles.mine.reduce((n, v) => n + v.capacity, 0))}{" "}
              · {fr.empire.charroi.upgradeHint}
            </span>
          </p>
          <Charroi p={p} now={now} busy={busy} act={act} onPlaceDepot={() => onPlace("depot")} />
          <Arsenal p={p} now={now} busy={busy} act={act} />
        </>
      )}
    </Sheet>
  );
}

/**
 * The buildings put on the map (the map at the centre, step 2): a counter, from the cheapest of
 * the regions reached, and the Arsenal once its Casa nears.
 */
function Buildings({
  p,
  onPlace,
}: {
  p: EmpirePayload;
  onPlace: (kind: "post" | "arsenal" | "camp" | "depot") => void;
}) {
  const view = p.view;
  if (!view) return null;
  const pl = fr.empire.placing;
  const costs = view.regions.flatMap((r) => (r.postCost ? [BigInt(r.postCost)] : []));
  const cheapest = costs.length > 0 ? costs.reduce((a, b) => (b < a ? b : a)) : null;
  const yard = view.map.arsenalSite;
  const camp = view.map.campSite;
  const depot = view.map.depotSite;
  const card = (
    kind: "post" | "arsenal" | "camp" | "depot",
    title: string,
    text: string,
    price: string | null,
    open: boolean,
  ) => (
    <li key={kind} className="flex items-center gap-3 border-b border-line/60 pb-3">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-night-3 text-gold ring-1 ring-gold/60 [&_svg]:h-6 [&_svg]:w-6">
        {kind === "post"
          ? Icon.banner()
          : kind === "camp"
            ? Icon.troops()
            : kind === "depot"
              ? Icon.cart()
              : Icon.anchor()}
      </span>
      <span className="min-w-0 flex-1 text-sm text-cream">
        {title}
        <span className="block text-xs text-cream-dim">{text}</span>
      </span>
      <span data-place={kind}>
        <Slab size="sm" tone="ghost" disabled={!open} onClick={() => onPlace(kind)}>
          {price ?? "—"}
        </Slab>
      </span>
    </li>
  );
  return (
    <ul className="mb-4 space-y-3" data-buildings>
      {cheapest !== null &&
        card("post", pl.postCard, pl.postText, pl.from(d(cheapest.toString())), true)}
      {yard &&
        shownAt(view.house.casa, yard.casa) &&
        card(
          "arsenal",
          pl.arsenalCard,
          pl.arsenalText(yard.casa),
          d(yard.cost),
          view.house.casa >= yard.casa,
        )}
      {depot &&
        shownAt(view.house.casa, depot.casa) &&
        card(
          "depot",
          pl.depotCard,
          pl.depotText(depot.casa),
          d(depot.cost),
          view.house.casa >= depot.casa,
        )}
      {camp &&
        shownAt(view.house.casa, camp.casa) &&
        card(
          "camp",
          pl.campCard,
          pl.campText(camp.casa),
          d(camp.cost),
          view.house.casa >= camp.casa,
        )}
    </ul>
  );
}
