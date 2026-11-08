import { useEffect, useState } from "react";
import { hourOf } from "../game/format.js";
import { fr } from "../i18n.js";
import { Badge, Label, Sheet, Slab, Stat } from "../ui.js";
import { CompanySection } from "./Company.js";
import { TerraBody } from "./Terra.js";
import type { EmpireAction, EmpirePayload } from "./types.js";

const t = fr.empire;
type Act = (a: EmpireAction) => Promise<unknown>;
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
  onEnterTerra,
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
  /** The way into the Terraferma's own scene. */
  onEnterTerra?: () => void;
}) {
  const [pane, setPane] = useState<CompanyPane>("carnet");
  // biome-ignore lint/correctness/useExhaustiveDependencies: chosen once, as the sheet opens
  useEffect(() => {
    if (open) setPane(first ?? PANES.find((x) => calls[x]) ?? "carnet");
  }, [open]);
  if (!p.view) return null;
  return (
    <Sheet
      open={open}
      onClose={onClose}
      kicker={t.companyTab.kicker}
      title={t.nav.company}
      docked="places"
    >
      <div className="mb-4 flex gap-2" role="tablist">
        {PANES.map((x) => (
          <button
            key={x}
            type="button"
            role="tab"
            aria-selected={pane === x}
            data-pane={x}
            onClick={() => setPane(x)}
            className={`relative min-h-10 flex-1 rounded-full px-3 font-display text-sm transition active:translate-y-0.5 ${pane === x ? "ink-pill font-black" : "bg-night-4 font-extrabold text-cream"}`}
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
          <TerraBody
            p={p}
            now={now}
            open={open && pane === "terra"}
            busy={busy}
            act={act}
            onEnter={onEnterTerra}
          />
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
  // The Carnet in medals (the refonte claire, lot 5): each objective a medal that fills; full, it
  // shines in gold and a touch takes its Favour; taken, it is sealed. One gold action takes them all.
  const ready = all.flatMap((o, i) => (!o.claimed && o.progress >= o.target ? [i] : []));
  const medal = (o: (typeof all)[number], i: number) => {
    const share = Math.min(1, o.progress / Math.max(1, o.target));
    const full = share >= 1;
    const label = (t.carnet.kinds[o.kind] ?? (() => o.kind))(o.target);
    return (
      <li key={i}>
        <button
          type="button"
          disabled={o.claimed || !full || busy}
          onClick={() => void act({ type: "empireClaim", index: i })}
          aria-label={`${label} · ${o.progress}/${o.target}${o.claimed ? ` · ${t.carnet.claimed}` : ""}`}
          className="flex w-full flex-col items-center gap-1.5 text-center active:scale-95 disabled:active:scale-100"
          data-medal={o.kind}
          data-medal-state={o.claimed ? "claimed" : full ? "ready" : "running"}
        >
          <span
            className={`relative flex h-16 w-16 items-center justify-center rounded-full ${
              full && !o.claimed ? "medal-ready" : ""
            }`}
            style={{
              background: o.claimed
                ? "rgb(var(--lagoon))"
                : `conic-gradient(rgb(var(${full ? "--gold" : "--info"})) 0 ${Math.round(share * 100)}%, rgb(var(--line)) ${Math.round(share * 100)}% 100%)`,
            }}
          >
            <span
              className={`flex h-[3.25rem] w-[3.25rem] items-center justify-center rounded-full font-display text-sm font-extrabold tabular-nums ${
                o.claimed
                  ? "bg-lagoon text-on-lagoon"
                  : full
                    ? "gold-face"
                    : "bg-night-3 text-cream"
              }`}
            >
              {o.claimed ? "✓" : full ? "+" : `${o.progress}/${o.target}`}
            </span>
          </span>
          <span
            className={`line-clamp-2 text-xs font-semibold leading-tight ${o.claimed ? "text-cream-dim" : "text-cream"}`}
          >
            {label}
          </span>
        </button>
      </li>
    );
  };
  return (
    <section data-carnet>
      <p className="font-display text-lg font-extrabold text-cream">{t.carnet.title}</p>
      <p className="mt-1 text-sm text-cream-dim">{t.carnet.summary}</p>
      {c.windUntil && c.windUntil > now && (
        <Badge tone="lagoon">{t.carnet.wind(hourOf(c.windUntil))}</Badge>
      )}
      <ul className="mt-3 grid grid-cols-3 gap-x-2 gap-y-4" data-medals>
        {c.objectives.map((o, i) => medal(o, i))}
      </ul>
      {c.carried.length > 0 && (
        <>
          <Label className="mt-5">{t.carnet.carried}</Label>
          <ul className="mt-2 grid grid-cols-3 gap-x-2 gap-y-4">
            {c.carried.map((o, i) => medal(o, c.objectives.length + i))}
          </ul>
        </>
      )}
      {ready.length > 0 && (
        <Slab
          tone="gold"
          size="lg"
          className="mt-4 w-full"
          busy={busy}
          onClick={async () => {
            for (const i of ready) await act({ type: "empireClaim", index: i });
          }}
        >
          {t.carnet.claimAll(ready.length)}
        </Slab>
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
