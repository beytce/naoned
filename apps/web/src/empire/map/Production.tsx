import { useEffect, useState } from "react";
import { fr } from "../../i18n.js";
import { Sheet } from "../../ui.js";
import { NewWorkshopList } from "../NewWorkshop.js";
import { Arsenal } from "../Sea.js";
import { Charroi } from "../World.js";
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
}: {
  p: EmpirePayload;
  now: number;
  open: boolean;
  pane: ProductionPane;
  highlight: string | null;
  busy: boolean;
  onClose: () => void;
  act: (a: EmpireAction) => Promise<void>;
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
        <NewWorkshopList
          p={p}
          region="veneto"
          highlight={highlight}
          busy={busy}
          onDone={onClose}
          act={act}
        />
      ) : (
        <>
          <p className="rounded-lg bg-info/15 px-3 py-2 text-sm font-semibold text-info" data-fleet>
            {t.fleet(fleet.free, fleet.total)}
          </p>
          <Charroi p={p} now={now} busy={busy} act={act} />
          <Arsenal p={p} now={now} busy={busy} act={act} />
        </>
      )}
    </Sheet>
  );
}
