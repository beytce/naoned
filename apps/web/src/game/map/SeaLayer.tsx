import type { ReactNode } from "react";
import { fr } from "../../i18n.js";
import { Label, Sheet, clock } from "../../ui.js";
import { DecreeBanner } from "../Famille.js";
import type { GameProps } from "../Game.js";
import {
  ActiveConvoy,
  Boarding,
  ConvoySheet,
  Fleet,
  PortCard,
  PortLocked,
  Privateers,
  corsairsOpenAt,
  portName,
} from "../Port.js";
import { d } from "../format.js";
import type { ExpeditionView } from "../types.js";
import { GalleyMarker, PortMarker } from "./Markers.js";
import { ActionButton, ContextPanel } from "./Panel.js";
import type { MapMarker, Selection } from "./WorldMap.js";
import { type Point, pointAlong, roundTrip } from "./geometry.js";
import { Icon } from "./icons.js";

/**
 * The sea as a layer of the world map: Venice's Arsenal, the ports of the Mediterranean and
 * beyond, the routes between them, the galleys sailing out and back. A stylised chart laid out for
 * a phone held upright (the real one is wide): the geography is kept, Bruges a pan away to the
 * west.
 */

const s = () => fr.game.map.sea;
const pct = (bps: number) => `${Math.round(bps / 100)} %`;

/** Room kept between a galley and the Arsenal, or the port it reaches (map units). */
const ARSENAL_EDGE = 34;
const PORT_EDGE = 18;

/** Where each port stands on the sea's layer, in map units. */
export const SEA: Record<string, [number, number]> = {
  venezia: [70, 60],
  ragusa: [140, 130],
  corfu: [110, 205],
  candia: [185, 300],
  constantinople: [275, 165],
  caffa: [320, 60],
  cyprus: [305, 290],
  acre: [320, 375],
  alexandria: [215, 400],
  bruges: [-140, 30],
};

/** Waypoints so that the routes follow the sea (out of the Adriatic, round the Morea). */
const VIA: Record<string, [number, number][]> = {
  candia: [[130, 225]],
  constantinople: [
    [130, 225],
    [215, 225],
  ],
  caffa: [
    [130, 225],
    [215, 225],
    [290, 120],
  ],
  cyprus: [
    [130, 225],
    [245, 300],
  ],
  acre: [
    [130, 225],
    [265, 335],
  ],
  alexandria: [
    [130, 225],
    [175, 345],
  ],
  bruges: [
    [100, 260],
    [-10, 330],
    [-140, 200],
  ],
};

/** A route from Venice to a port, its points in map units. */
export function seaRoute(code: string): Point[] {
  const pts = [SEA.venezia, ...(VIA[code] ?? []), SEA[code]].filter(
    (p): p is [number, number] => p !== undefined,
  );
  return pts.map(([x, y]) => ({ x, y }));
}

/** Where a convoy is now: out to its port, then back to Venice. */
function galleyAt(e: ExpeditionView, now: number): { x: number; y: number; flip: boolean } {
  const share = (now - e.departAt) / Math.max(1, e.returnAt - e.departAt);
  const trip = roundTrip(share);
  const route = seaRoute(e.destination);
  // Out from the Arsenal's edge and back to it, turning at the port's edge: never on them.
  const length = route
    .slice(1)
    .reduce((n, q, i) => n + Math.hypot(q.x - (route[i]?.x ?? q.x), q.y - (route[i]?.y ?? q.y)), 0);
  const t0 = Math.min(0.4, ARSENAL_EDGE / Math.max(1, length));
  const t1 = 1 - Math.min(0.4, PORT_EDGE / Math.max(1, length));
  const at = pointAlong(route, t0 + (t1 - t0) * trip.t);
  const dx = trip.back ? -at.dx : at.dx;
  return { x: at.p.x, y: at.p.y, flip: dx < 0 };
}

export function seaSpots(props: GameProps): { key: string; x: number; y: number }[] {
  return [
    { key: "port:venezia", x: SEA.venezia?.[0] ?? 0, y: SEA.venezia?.[1] ?? 0 },
    ...props.catalog.ports
      .filter((p) => props.catalog.destinations[p.code] && SEA[p.code])
      .map((p) => ({ key: `port:${p.code}`, x: SEA[p.code]?.[0] ?? 0, y: SEA[p.code]?.[1] ?? 0 })),
  ];
}

function activeConvoys(props: GameProps): ExpeditionView[] {
  return props.view.expeditions.filter((e) => e.outcome === "pending");
}

export function seaMarkers(props: GameProps, select: (s: Selection) => void): MapMarker[] {
  const active = activeConvoys(props);
  const docked = active.filter((e) => props.now >= e.returnAt).length;
  return [
    {
      key: "port:venezia",
      node: (
        <PortMarker
          code="venezia"
          name={s().arsenalLabel}
          returns={null}
          gain={null}
          watched={false}
          arsenal
          docked={docked}
          onTap={() => select({ kind: "port", code: "venezia" })}
        />
      ),
    },
    ...props.catalog.ports
      .filter((p) => props.catalog.destinations[p.code] && SEA[p.code])
      .map((p) => {
        const dest = props.catalog.destinations[p.code];
        return {
          key: `port:${p.code}`,
          node: (
            <PortMarker
              code={p.code}
              name={p.name}
              returns={dest?.returns ?? null}
              gain={dest ? `+${pct(dest.gainBps)}` : null}
              watched={props.view.watchedRoutes.includes(p.code)}
              arsenal={false}
              docked={0}
              onTap={() => select({ kind: "port", code: p.code })}
            />
          ),
        };
      }),
    ...active.map((e) => {
      const home = props.now >= e.returnAt;
      return {
        key: `galley:${e.id}`,
        at: home ? null : galleyAt(e, props.now),
        node: (
          <GalleyMarker
            id={e.id}
            label={portName(props, e.destination)}
            state={home ? "docked" : e.boarding?.success ? "boarded" : "sea"}
            onTap={() => select({ kind: "galley", id: e.id })}
          />
        ),
      };
    }),
  ];
}

/** Under the ports: each route from Venice, red where corsairs watch, marching while sailed. */
export function SeaOverlay({ props }: { props: GameProps }) {
  const sailing = new Set(activeConvoys(props).map((e) => e.destination));
  return (
    <g>
      {props.catalog.ports
        .filter((p) => props.catalog.destinations[p.code] && SEA[p.code])
        .map((p) => {
          const watched = props.view.watchedRoutes.includes(p.code);
          const on = sailing.has(p.code);
          return (
            <polyline
              key={p.code}
              points={seaRoute(p.code)
                .map((q) => `${q.x},${q.y}`)
                .join(" ")}
              fill="none"
              stroke={
                watched ? "rgb(var(--vermilion))" : on ? "rgb(var(--lagoon))" : "rgb(var(--cream))"
              }
              strokeOpacity={watched || on ? 0.75 : 0.14}
              strokeWidth={on ? 1.8 : 1.2}
              strokeDasharray="1.5 3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={on ? "route-march" : undefined}
            />
          );
        })}
    </g>
  );
}

/** The galleys and ships, in the HUD's right column. */
export function SeaHud({ props }: { props: GameProps }) {
  const active = activeConvoys(props).length;
  const ready = props.view.ships.filter((x) => x.status === "ready").length;
  const row = (value: string, label: string, icon: ReactNode) => (
    <span className="flex items-center gap-2" aria-label={label}>
      <span className="font-display text-lg font-extrabold tabular-nums text-lagoon [text-shadow:0_1px_4px_rgb(0_0_0/0.9)]">
        {value}
      </span>
      <span className="hud-orb flex h-9 w-9 items-center justify-center rounded-full text-lagoon">
        {icon}
      </span>
    </span>
  );
  return (
    <div className="pointer-events-none absolute right-3 top-[calc(max(0.75rem,env(safe-area-inset-top))+3rem)] z-10 flex flex-col items-end gap-1.5 lg:right-5 lg:top-[4.25rem]">
      {row(`${active}/${props.catalog.maxGalleys}`, s().galleys, Icon.port())}
      {props.view.ships.length > 0 &&
        row(`${ready}/${props.view.ships.length}`, s().ships, Icon.anchor())}
    </div>
  );
}

/** The panel of the sea: the Arsenal, a port, or a galley. */
export function SeaPanel({
  props,
  sel,
  select,
}: { props: GameProps; sel: Selection | null; select: (s: Selection | null) => void }) {
  const now = props.now;
  const active = activeConvoys(props);
  const full = active.length >= props.catalog.maxGalleys;
  const docked = active.filter((e) => now >= e.returnAt);

  if (sel?.kind === "galley") {
    const e = active.find((x) => x.id === sel.id);
    if (!e) return null;
    const home = now >= e.returnAt;
    const share = (now - e.departAt) / Math.max(1, e.returnAt - e.departAt);
    const back = share > 0.5;
    const name = portName(props, e.destination);
    return (
      <ContextPanel
        title={name}
        chip={<span className="font-mono text-xs text-gold">{d(e.cargoValue)}</span>}
        status={
          home
            ? s().atQuay
            : back
              ? s().home(clock(e.returnAt - now))
              : s().out(name, clock(e.returnAt - now))
        }
        tone={home ? "gold" : e.boarding?.success ? "vermilion" : "lagoon"}
        progress={home ? null : share}
        onClose={() => select(null)}
        actions={
          home ? (
            <ActionButton
              icon={Icon.harvest()}
              label={s().buttons.unload}
              tone="gold"
              disabled={props.busy}
              onClick={() => props.act({ type: "collectExpedition", expeditionId: e.id })}
            />
          ) : (
            <ActionButton
              icon={Icon.cargo()}
              label={s().buttons.log}
              onClick={() => props.setSheet("sea:log")}
            />
          )
        }
        extra={e.boarding ? <Boarding e={e} props={props} /> : undefined}
      />
    );
  }

  if (sel?.kind !== "port") return null;

  if (sel.code === "venezia") {
    const ready = props.view.ships.filter((x) => x.status === "ready").length;
    const damaged = props.view.ships.some((x) => x.status === "damaged");
    const first = docked[0];
    return (
      <ContextPanel
        title={s().arsenalLabel}
        chip={<span className="label">{s().atSea(active.length, props.catalog.maxGalleys)}</span>}
        status={
          first
            ? s().docked(portName(props, first.destination))
            : s().shipsReady(ready, props.view.ships.length)
        }
        tone={first ? "gold" : damaged ? "vermilion" : "lagoon"}
        onClose={() => select(null)}
        actions={
          <>
            {first && (
              <ActionButton
                icon={Icon.harvest()}
                label={s().buttons.unload}
                tone="gold"
                badge={docked.length > 1 ? docked.length : undefined}
                disabled={props.busy}
                onClick={() => props.act({ type: "collectExpedition", expeditionId: first.id })}
              />
            )}
            <ActionButton
              icon={Icon.anchor()}
              label={s().buttons.fleet}
              tone={damaged ? "vermilion" : "plain"}
              onClick={() => props.setSheet("sea:fleet")}
            />
            <ActionButton
              icon={Icon.bandits()}
              label={s().buttons.corsairs}
              onClick={() => props.setSheet("sea:corsairs")}
            />
            <ActionButton
              icon={Icon.cargo()}
              label={s().buttons.log}
              onClick={() => props.setSheet("sea:log")}
            />
          </>
        }
      />
    );
  }

  const dest = props.catalog.destinations[sel.code];
  if (!dest) return null;
  const ports = props.catalog.ports.filter(
    (p) => props.catalog.destinations[p.code] && SEA[p.code],
  );
  const i = ports.findIndex((p) => p.code === sel.code);
  const step = (k: number) => {
    const next = ports[(i + k + ports.length) % ports.length];
    if (next) select({ kind: "port", code: next.code });
  };
  const watched = props.view.watchedRoutes.includes(sel.code);
  return (
    <ContextPanel
      title={portName(props, sel.code)}
      chip={<span className="font-mono text-xs text-lagoon">+{pct(dest.gainBps)}</span>}
      status={
        watched
          ? fr.game.port.watched
          : s().portLine(dest.hours, pct(dest.riskBps), props.names.resource(dest.returns))
      }
      tone={watched ? "vermilion" : "lagoon"}
      onClose={() => select(null)}
      onPrev={() => step(-1)}
      onNext={() => step(1)}
      actions={
        <>
          <ActionButton
            icon={Icon.send()}
            label={s().buttons.send}
            tone={full ? "plain" : "lagoon"}
            coach="panel-convoy"
            disabled={full}
            onClick={() => props.setSheet(`convoy:${sel.code}`)}
          />
          <ActionButton
            icon={Icon.cargo()}
            label={s().buttons.card}
            onClick={() => props.setSheet(`sea:card:${sel.code}`)}
          />
        </>
      }
      extra={
        full ? <p className="text-center text-xs text-cream-dim">{fr.game.port.busy}</p> : undefined
      }
    />
  );
}

/** The sea's windows: a convoy to send, a port's card, the fleet, the corsairs, the log. */
export function SeaSheets(props: GameProps) {
  const [kind, a, b] = (props.sheet ?? "").split(":");
  const close = () => props.setSheet(null);
  const active = activeConvoys(props);
  const past = props.view.expeditions.filter((e) => e.outcome !== "pending");
  const full = active.length >= props.catalog.maxGalleys;
  const t = fr.game.port;
  return (
    <>
      <Sheet open={kind === "convoy" && !!a && !full} onClose={close}>
        {kind === "convoy" && a && <ConvoySheet key={a} code={a} props={props} />}
      </Sheet>
      <Sheet open={kind === "sea" && a === "card" && !!b} onClose={close}>
        {kind === "sea" && a === "card" && b && (
          <div className="pt-8">
            <PortCard key={b} code={b} props={props} />
          </div>
        )}
      </Sheet>
      <Sheet open={props.sheet === "sea:fleet"} onClose={close}>
        <div className="space-y-3">
          <h3 className="font-display text-xl font-extrabold uppercase">{s().buttons.fleet}</h3>
          <Fleet props={props} />
        </div>
      </Sheet>
      <Sheet open={props.sheet === "sea:corsairs"} onClose={close}>
        <div className="space-y-3">
          <h3 className="font-display text-xl font-extrabold uppercase">{s().buttons.corsairs}</h3>
          {corsairsOpenAt(props.view) > props.now ? (
            <p className="text-sm text-cream-dim">
              {fr.game.corsairsLocked(clock(corsairsOpenAt(props.view) - props.now))}
            </p>
          ) : (
            <Privateers props={props} />
          )}
        </div>
      </Sheet>
      <Sheet open={props.sheet === "sea:log"} onClose={close}>
        <div className="space-y-4">
          <h3 className="font-display text-xl font-extrabold uppercase">{s().buttons.log}</h3>
          <DecreeBanner props={props} />
          {active.length === 0 && <p className="text-sm text-cream-dim">{t.frame.none}</p>}
          {active.map((e) => (
            <ActiveConvoy key={e.id} e={e} props={props} />
          ))}
          {props.view.seaNews.length > 0 && (
            <section className="space-y-2">
              <Label>{t.seaNews}</Label>
              {props.view.seaNews.map((n) => (
                <p key={`${n.raider}-${n.at}`} className="border-b border-line/70 py-2 text-sm">
                  ☠{" "}
                  {t.news(
                    props.people[n.raider] ?? fr.game.anonymous,
                    props.people[n.victim] ?? fr.game.anonymous,
                    portName(props, n.route),
                  )}
                </p>
              ))}
            </section>
          )}
          {past.length > 0 && (
            <section className="space-y-2">
              <Label>{t.history}</Label>
              {past.map((e) => {
                const dest = props.catalog.destinations[e.destination];
                return (
                  <div key={e.id} className="border-b border-line/70 py-2 text-sm">
                    <div className="flex items-center gap-3">
                      <span className={e.outcome === "lost" ? "text-vermilion" : "text-lagoon"}>
                        {e.outcome === "lost" ? "☠" : "⚓"}
                      </span>
                      <span className="flex-1">
                        {portName(props, e.destination)} ·{" "}
                        {e.outcome === "lost"
                          ? t.lost
                          : t.returned(e.brought, props.names.resource(dest?.returns ?? ""))}
                      </span>
                      <span className="label">{d(e.cargoValue)}</span>
                    </div>
                    {e.boarding && <Boarding e={e} props={props} />}
                  </div>
                );
              })}
            </section>
          )}
        </div>
      </Sheet>
      <Sheet open={props.sheet === "port:locked"} onClose={close}>
        <PortLocked {...props} />
      </Sheet>
    </>
  );
}
