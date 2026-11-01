import { useEffect, useState } from "react";
import { hourOf } from "../game/format.js";
import { fr } from "../i18n.js";
import { Badge, Label, Ribbon, Sheet, Slab, Stat } from "../ui.js";
import { CompanySection } from "./Company.js";
import { TerraBody } from "./Terra.js";
import type { EmpireAction, EmpirePayload } from "./types.js";

const t = fr.empire;
type Act = (a: EmpireAction) => Promise<void>;
export type CompanyPane = "carnet" | "company" | "terra";
const PANES: CompanyPane[] = ["carnet", "company", "terra"];

/**
 * The Compagnie tab (lot C of the UX audit): what is played with others, in three panes. The
 * Carnet of the week and the Power, the partners and their aid, the Terraferma and the Condotta.
 * It opens on the pane that calls, else on the Carnet.
 */
export function CompanySheet({
  p,
  now,
  open,
  busy,
  calls,
  onClose,
  act,
  onPlaceCamp,
  pane: first,
}: {
  p: EmpirePayload;
  now: number;
  open: boolean;
  busy: boolean;
  /** The panes where something waits, the first one opened. */
  calls: Record<CompanyPane, boolean>;
  onClose: () => void;
  act: Act;
  /** The Campo to put on the map: the door of the Terraferma. */
  onPlaceCamp: () => void;
  /** The pane to open on (the Campo touched: the Terraferma). */
  pane?: CompanyPane;
}) {
  const [pane, setPane] = useState<CompanyPane>("carnet");
  // biome-ignore lint/correctness/useExhaustiveDependencies: chosen once, as the sheet opens
  useEffect(() => {
    if (open) setPane(first ?? PANES.find((x) => calls[x]) ?? "carnet");
  }, [open]);
  if (!p.view) return null;
  return (
    <Sheet open={open} onClose={onClose} kicker={t.companyTab.kicker} title={t.nav.company}>
      <div className="mb-4 flex gap-2" role="tablist">
        {PANES.map((x) => (
          <button
            key={x}
            type="button"
            role="tab"
            aria-selected={pane === x}
            data-pane={x}
            onClick={() => setPane(x)}
            className={`relative min-h-10 flex-1 rounded-full px-3 text-sm font-semibold transition active:scale-95 ${pane === x ? "bg-info/15 text-info ring-1 ring-info" : "text-cream-dim ring-1 ring-line"}`}
          >
            {t.companyTab.panes[x]}
            {calls[x] && (
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-vermilion ring-2 ring-night" />
            )}
          </button>
        ))}
      </div>
      {pane === "carnet" && <CarnetBody p={p} now={now} busy={busy} act={act} />}
      {pane === "company" && open && <CompanySection p={p} now={now} busy={busy} act={act} />}
      {pane === "terra" &&
        (p.view.map.camp === null && p.view.map.campSite ? (
          // Without its Campo, the Terraferma stays shut (decision of 31 October 2026).
          <div className="space-y-3" data-no-camp>
            <p className="text-sm text-cream-dim">{t.placing.noCamp(p.view.map.campSite.casa)}</p>
            <Slab
              tone="gold"
              size="lg"
              className="w-full"
              disabled={p.view.house.casa < p.view.map.campSite.casa}
              onClick={onPlaceCamp}
            >
              {t.placing.camp}
            </Slab>
          </div>
        ) : (
          <TerraBody p={p} now={now} open={open && pane === "terra"} busy={busy} act={act} />
        ))}
    </Sheet>
  );
}

/** The Carnet: the week's objectives, those carried from the last, the Power and its band. */
function CarnetBody({
  p,
  now,
  busy,
  act,
}: {
  p: EmpirePayload;
  now: number;
  busy: boolean;
  act: Act;
}) {
  const view = p.view;
  if (!view) return null;
  const c = view.carnet;
  const all = [...c.objectives, ...c.carried];
  const row = (o: (typeof all)[number], i: number) => (
    <li key={i} className="flex items-center gap-3 border-b border-line/60 py-2">
      <div className="min-w-0 flex-1">
        <p className={`text-sm ${o.claimed ? "text-cream-dim line-through" : "text-cream"}`}>
          {(t.carnet.kinds[o.kind] ?? (() => o.kind))(o.target)}
        </p>
        <Ribbon
          value={o.progress / o.target}
          tone={o.progress >= o.target ? "lagoon" : "gold"}
          label={`${o.progress}/${o.target}`}
        />
      </div>
      {o.claimed ? (
        <Badge>{t.carnet.claimed}</Badge>
      ) : (
        <Slab
          size="sm"
          tone="ghost"
          busy={busy}
          disabled={o.progress < o.target}
          onClick={() => void act({ type: "empireClaim", index: i })}
        >
          {t.carnet.claim}
        </Slab>
      )}
    </li>
  );
  return (
    <section data-carnet>
      <p className="font-display text-lg font-extrabold text-cream">{t.carnet.title}</p>
      <p className="mt-1 text-sm text-cream-dim">{t.carnet.summary}</p>
      {c.windUntil && c.windUntil > now && (
        <Badge tone="lagoon">{t.carnet.wind(hourOf(c.windUntil))}</Badge>
      )}
      <ul className="mt-2">{c.objectives.map((o, i) => row(o, i))}</ul>
      {c.carried.length > 0 && (
        <>
          <Label className="mt-4">{t.carnet.carried}</Label>
          <ul>{c.carried.map((o, i) => row(o, c.objectives.length + i))}</ul>
        </>
      )}
      <section className="mt-5">
        <Label>{t.carnet.power}</Label>
        <div className="mt-1 grid grid-cols-3 gap-2">
          <Stat label={t.hud.power} value={view.power} />
          <Stat label={t.hud.band(view.band)} value={view.band + 1} />
          <Stat label={t.hud.seals} value={view.house.seals} />
        </div>
        <p className="mt-2 text-xs text-cream-dim">{t.carnet.powerText}</p>
      </section>
    </section>
  );
}
