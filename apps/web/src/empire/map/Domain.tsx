import { GoodsMark } from "../../art/goods.js";
import { TILT } from "../../art/plateau/geom.js";
import { whole } from "../../game/format.js";
import { Icon } from "../../game/map/icons.js";
import { haptic } from "../../haptics.js";
import { fr } from "../../i18n.js";
import { Slab, clock } from "../../ui.js";
import { regionName } from "../World.js";
import { buildingName, readyLots, recipeOf, workshopStatus } from "../logic.js";
import type { EmpireAction, EmpirePayload } from "../types.js";
import { casaRoad } from "./casaRoad.js";
import { canCasa } from "./logic.js";

const t = fr.empire.orbit;

/**
 * The Fondaco's foot (the refonte claire, lot 3, 5 November 2026): back to the map, the domain's
 * name; at Venice, the road to the next Casa (each thing it asks, filling), touched for its sheet;
 * the doors of what had places of their own (to build, the quay of the vehicles, the Porta's arms);
 * and one gold action: the next Casa when everything is in, else every ready lot taken.
 */
export function DomainBar({
  p,
  now,
  busy,
  region,
  act,
  onBack,
  onProduction,
  onCasa,
  onQuay,
  onArms,
  guided = false,
}: {
  p: EmpirePayload;
  now: number;
  busy: boolean;
  region: string;
  /** Lorenzo's card over it (the tutorial): the road to the Casa is his to say. */
  guided?: boolean;
  act: (a: EmpireAction) => Promise<void>;
  onBack: () => void;
  /** The Production (the buildings, a fondaco to put down). */
  onProduction: () => void;
  /** The Casa's sheet. */
  onCasa?: () => void;
  /** The quay: the vehicles (the Remise once it stands). */
  onQuay?: () => void;
  /** The Porta's arms, once the Porta may be built. */
  onArms?: () => void;
}) {
  const view = p.view;
  if (!view) return null;
  const f = fr.empire.fondaco;
  const mine = view.house.workshops.filter((w) => (w.region ?? "veneto") === region);
  const ready = mine.filter((w) => readyLots(w, now) > 0).length;
  const lefts = mine
    .map((w) => workshopStatus(p, w, now))
    .flatMap((s) => (s.state === "running" ? [s.left] : []));
  const title = region === "veneto" ? t.title(view.house.casa) : t.postTitle(regionName(region));
  const road = region === "veneto" ? casaRoad(p) : null;
  const casaNow = region === "veneto" && canCasa(p);
  return (
    <section
      className="glass-thick pointer-events-auto mx-3 mb-2 flex w-[calc(100%-1.5rem)] max-w-md flex-col gap-2.5 rounded-[1.75rem] p-3 [@media(max-height:700px)]:gap-2 [@media(max-height:700px)]:p-2"
      data-domain-bar={region}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="flex h-11 items-center gap-1 rounded-full px-2 text-sm text-cream-dim active:scale-95"
          data-domain-back
        >
          <span aria-hidden="true">‹</span> {t.back}
        </button>
        <h3 className="min-w-0 flex-1 truncate text-center font-place text-sm font-bold uppercase tracking-[0.12em] text-cream">
          {title}
        </h3>
        <span className="w-16" aria-hidden="true" />
      </div>

      {region === "veneto" && !guided && (
        <CasaRoadCard p={p} now={now} road={road} onCasa={onCasa} />
      )}

      <div className="grid grid-cols-3 gap-2" data-fondaco-doors>
        <Door label={f.build} onClick={onProduction} id="build">
          {Icon.build()}
        </Door>
        {onQuay && (
          <Door label={f.quay} onClick={onQuay} id="quay">
            {Icon.cart()}
          </Door>
        )}
        {onArms && (
          <Door label={f.arms} onClick={onArms} id="arms">
            {Icon.gate()}
          </Door>
        )}
      </div>

      {casaNow && road ? (
        <Slab
          size="md"
          tone="gold"
          className="w-full"
          busy={busy}
          onClick={() => void act({ type: "empireBuildCasa" })}
        >
          {f.buildCasa(road.level)}
        </Slab>
      ) : ready > 0 && view.house.casa >= 3 ? (
        // « Tout récolter » from the Casa 3, a convenience without gold (the gameplay audit, P4):
        // before, the hands learn the workshops.
        <Slab
          size="md"
          tone="ghost"
          className="w-full"
          busy={busy}
          onClick={() => void act({ type: "empireRelaunchAll" })}
        >
          {t.harvest(ready)}
        </Slab>
      ) : ready > 0 ? (
        guided ? null : (
          <p className="text-center text-sm font-semibold text-lagoon" data-domain-sweep>
            {f.sweep}
          </p>
        )
      ) : guided ? null : (
        <p className="text-center text-sm text-cream-dim" data-domain-next>
          {lefts.length > 0 ? t.next(clock(Math.min(...lefts))) : t.nothing}
        </p>
      )}
    </section>
  );
}

/** A door of the Fondaco's foot: its sign over its word. */
function Door({
  id,
  label,
  onClick,
  children,
}: {
  id: string;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-fondaco-door={id}
      className="glass-chip flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-2xl text-cream active:scale-[0.97] [@media(max-height:700px)]:min-h-11 [@media(max-height:700px)]:flex-row [@media(max-height:700px)]:gap-1.5 [&_svg]:h-5 [&_svg]:w-5"
    >
      {children}
      <span className="text-xs font-semibold">{label}</span>
    </button>
  );
}

/** The road to the next Casa: its ring, what it opens, each thing it asks as a chip that fills. */
function CasaRoadCard({
  p,
  now,
  road,
  onCasa,
}: {
  p: EmpirePayload;
  now: number;
  road: ReturnType<typeof casaRoad>;
  onCasa?: () => void;
}) {
  const f = fr.empire.fondaco;
  if (!road) return <p className="text-center text-sm font-semibold text-cream-dim">{f.top}</p>;
  const R = 17;
  const round = 2 * Math.PI * R;
  const site = road.building;
  const share = site
    ? Math.min(1, (now - site.startedAt) / Math.max(1, site.endsAt - site.startedAt))
    : road.share;
  const opens = road.opens
    .slice(0, 2)
    .map((c) => fr.empire.casa.opensNames[c] ?? c)
    .join(" · ");
  return (
    <button
      type="button"
      onClick={onCasa}
      className="glass-chip flex w-full flex-col gap-2 rounded-2xl p-2.5 text-left active:scale-[0.99]"
      data-casa-road={road.level}
    >
      <span className="flex items-center gap-2.5">
        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center">
          <svg viewBox="0 0 40 40" className="absolute inset-0 -rotate-90" aria-hidden="true">
            <circle cx="20" cy="20" r={R} fill="none" stroke="rgb(var(--line))" strokeWidth="3" />
            <circle
              cx="20"
              cy="20"
              r={R}
              fill="none"
              stroke={site ? "rgb(var(--info))" : "rgb(var(--gold))"}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${(round * share).toFixed(1)} ${round.toFixed(1)}`}
            />
          </svg>
          <span className="font-display text-sm font-extrabold text-cream">{road.level}</span>
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-bold text-cream">
            {site ? f.building(road.level) : f.toCasa(road.level)}
          </span>
          <span className="truncate text-xs text-cream-dim">
            {site ? clock(site.endsAt - now) : opens ? f.opens(opens) : ""}
          </span>
        </span>
        <span className="text-cream-dim [&_svg]:h-4 [&_svg]:w-4">{Icon.chevronRight()}</span>
      </span>
      {!site && (
        // On a short screen, the chips give way: the ring and the sheet say it (lot 3).
        <span className="flex flex-wrap gap-1.5 [@media(max-height:700px)]:hidden">
          {road.steps.map((s) => {
            const full = s.have >= s.need;
            return (
              <span
                key={s.id}
                className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ring-1 ring-inset ${
                  full ? "bg-lagoon/10 text-lagoon ring-lagoon/30" : "text-cream ring-line"
                }`}
                data-casa-step={s.id}
              >
                {s.good ? (
                  <GoodsMark code={s.good} size={14} covered={full} />
                ) : s.id === "ducats" ? (
                  <span aria-hidden="true">d</span>
                ) : (
                  <span className="[&_svg]:h-3.5 [&_svg]:w-3.5">{Icon.workshops()}</span>
                )}
                {s.id === "ducats"
                  ? `${whole(String(BigInt(s.have) * 100n)).replace(/\s*d$/, "")} / ${whole(String(BigInt(s.need) * 100n))}`
                  : `${s.have}/${s.need}`}
                {s.id === "workshops" && p.view?.nextCasa
                  ? ` ${f.workshopsAt(p.view.nextCasa.requires.level)}`
                  : ""}
              </span>
            );
          })}
        </span>
      )}
    </button>
  );
}
