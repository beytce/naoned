import { useState } from "react";
import { artSource } from "../art/Illustration.js";
import { GoodsMark } from "../art/goods.js";
import { RegionArt } from "../art/scenes.js";
import { d, duration, hourOf, minutesLabel } from "../game/format.js";
import { fr } from "../i18n.js";
import { Badge, Label, Sheet, Slab, clock } from "../ui.js";
import { affordable, buildingName, opensAt, readyLots, recipeOf, shownAt } from "./logic.js";
import { postLabel, postPoint } from "./map/logic.js";
import type { EmpireAction, EmpirePayload } from "./types.js";

const t = fr.empire;
export const regionName = (code: string) => t.regionNames[code] ?? code;
const goodName = (p: EmpirePayload, code: string) =>
  fr.themeNames.resource[code] ?? p.goods[code] ?? code;

type Act = (a: EmpireAction) => Promise<void>;

/**
 * A region up close (the second depth): its counter and its workshops, its prices as the news
 * brought them, its deposits; the one gold action, its charter or its counter's next level.
 */
export function RegionPlace({
  p,
  code,
  now,
  busy,
  act,
  onBuild,
  onPlace,
}: {
  p: EmpirePayload;
  code: string;
  now: number;
  busy: boolean;
  act: Act;
  onBuild: () => void;
  /** To put a counter down there: the map in its mode of placing. */
  onPlace?: () => void;
}) {
  const view = p.view;
  const r = view?.regions.find((x) => x.code === code);
  if (!view || !r) return null;
  const w = t.world;
  const quotes = p.market.filter((q) => q.region === code);
  const workshops = view.house.workshops.filter((x) => (x.region ?? "veneto") === code);
  // The stock its counters hold (the map that grows): each counter sells and delivers its own.
  const stock = view.stores
    .filter((x) => x.region === code)
    .flatMap((x) => Object.entries(x.goods))
    .reduce<Record<string, number>>((acc, [g, n]) => {
      acc[g] = (acc[g] ?? 0) + n;
      return acc;
    }, {});
  return (
    <section className="mx-auto mt-3 w-full max-w-md space-y-4">
      {Object.keys(stock).length > 0 && (
        <div data-post-stock>
          <Label>{w.stock}</Label>
          <ul className="mt-1 flex flex-wrap gap-2">
            {Object.entries(stock).map(([g, n]) => (
              <li key={g}>
                <Badge tone="lagoon">
                  {fr.themeNames.resource[g] ?? p.goods[g] ?? g} · {n}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      )}
      {artSource("regions", code) && (
        <RegionArt code={code} className="h-32 w-full rounded-xl ring-1 ring-line" />
      )}
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-xl font-extrabold text-cream">{regionName(code)}</h2>
        <span className="text-xs text-cream-dim">
          {code === "veneto"
            ? t.hud.casa(view.house.casa)
            : r.counter > 0
              ? w.counter(r.counter)
              : view.house.casa < r.casa
                ? w.closed(r.casa)
                : w.toOpen}
        </span>
      </div>
      {r.cities.all > 0 && (
        <p className="text-sm text-cream-dim" data-region-cities>
          {w.cities(r.cities.found, r.cities.all)}
        </p>
      )}
      {r.buildingUntil !== null && (
        <Badge tone="lagoon">{w.opening(clock(r.buildingUntil - now))}</Badge>
      )}
      {r.next ? (
        <Slab
          tone="gold"
          size="lg"
          className="w-full"
          busy={busy}
          disabled={!affordable(p.cash, r.next.cost)}
          onClick={() => void act({ type: "empireUpgradeCounter", region: code })}
        >
          {w.counterAction(r.next.level, d(r.next.cost))}
        </Slab>
      ) : (
        r.postCost &&
        onPlace &&
        r.buildingUntil === null &&
        // A first counter opens the region; more find its cities still hidden.
        (r.counter === 0 || r.cities.found < r.cities.all) && (
          <Slab
            tone={r.counter > 0 ? "ghost" : "gold"}
            size="lg"
            className="w-full"
            disabled={!affordable(p.cash, r.postCost)}
            onClick={onPlace}
          >
            {w.postAction(d(r.postCost))}
          </Slab>
        )
      )}

      {r.counter > 0 && code !== "veneto" && (
        <div>
          <div className="flex items-baseline justify-between">
            <Label>{w.workshopsHere}</Label>
            <button type="button" className="text-xs text-gold underline" onClick={onBuild}>
              {w.buildHere}
            </button>
          </div>
          {workshops.length === 0 ? (
            <p className="mt-1 text-sm text-cream-dim">{w.noWorkshop}</p>
          ) : (
            <ul className="mt-1 flex flex-wrap gap-3">
              {workshops.map((x) => (
                <li key={x.id} className="flex items-center gap-1.5 text-sm text-cream">
                  <GoodsMark code={Object.keys(recipeOf(p, x)?.outputs ?? {})[0] ?? ""} size={22} />
                  {buildingName(p, x.type)} {x.level}
                  {readyLots(x, now) > 0 && <Badge tone="lagoon">+{readyLots(x, now)}</Badge>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {quotes.length > 0 && (
        <div>
          <Label>{w.prices}</Label>
          <ul className="mt-1 space-y-1">
            {quotes.map((q) => (
              <li key={q.good} className="flex items-center gap-2 text-sm text-cream">
                <GoodsMark code={q.good} size={20} />
                <span className="flex-1">{goodName(p, q.good)}</span>
                <span className="font-display font-bold tabular-nums">{d(q.price)}</span>
                <span className="w-24 text-right text-xs text-cream-dim">
                  {q.asOf >= now - 60_000 ? w.live : w.dated(duration(now - q.asOf))}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

/** A choice among options, labelled. */
export function Choice({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <label className="block text-sm text-cream">
      <span className="text-xs text-cream-dim">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 min-h-11 w-full bg-night-2 px-3 text-cream ring-1 ring-inset ring-line slab"
      >
        {options.map(([v, text]) => (
          <option key={v} value={v}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}

/** The carriage: the house's vehicles, free or on the road, and those it may buy. */
export function Charroi({
  p,
  now,
  busy,
  act,
  onPlaceDepot,
}: {
  p: EmpirePayload;
  now: number;
  busy: boolean;
  act: Act;
  /** The Remise to put down first, in a world that asks it. */
  onPlaceDepot?: () => void;
}) {
  const [sending, setSending] = useState<string | null>(null);
  const view = p.view;
  if (!view) return null;
  const c = t.charroi;
  // Without its Remise, the house buys no land vehicle and raises no model.
  const noDepot = view.map.depot === null && view.map.depotSite !== null;
  const site = view.map.depotSite;
  const full = view.fleet ? view.fleet.vehicles >= view.fleet.cap : false;
  return (
    <section className="mt-5" data-charroi>
      <Label>{c.title}</Label>
      <p className="mt-1 text-xs text-cream-dim">{c.haul(view.vehicles.haulPerDay)}</p>
      {noDepot && site && (
        <div
          className="mt-2 space-y-2 rounded-lg bg-night-2 p-3 ring-1 ring-inset ring-line/70"
          data-no-depot
        >
          <p className="text-sm text-cream-dim">{t.placing.noDepot}</p>
          {onPlaceDepot && (
            <Slab
              size="sm"
              tone="ghost"
              disabled={view.house.casa < site.casa}
              onClick={onPlaceDepot}
            >
              {view.house.casa < site.casa ? c.opensAt(site.casa) : t.placing.depot}
            </Slab>
          )}
        </div>
      )}
      {view.fleet && view.map.depot !== null && (
        <FleetGauge p={p} fleet={view.fleet} busy={busy} act={act} />
      )}
      <ul className="mt-2 flex flex-wrap gap-2">
        {view.vehicles.mine.map((v) => {
          const land = true;
          const free = v.busyUntil <= now;
          return (
            <li key={v.id} className="flex items-center gap-1">
              <Badge tone={free ? "lagoon" : "ghost"}>
                {t.vehicleNames[v.type] ?? v.type} · {free ? c.free : c.busy(hourOf(v.busyUntil))}
                {view.stores.length > 1 ? ` · ${c.at(postLabel(p, v.at, regionName))}` : ""}
              </Badge>
            </li>
          );
        })}
      </ul>
      <ul className="mt-3 space-y-2">
        {view.vehicles.shop
          .filter((s) => shownAt(view.house.casa, s.casa))
          .map((s) => {
            const built = view.vehicles.mine.filter((v) => v.type === s.type).length;
            return (
              <li
                key={s.type}
                className="space-y-2 border-b border-line/60 pb-2 text-sm text-cream"
                data-model={s.type}
              >
                <div className="flex items-center gap-2">
                  <span className="flex-1">
                    {t.vehicleNames[s.type] ?? s.type}
                    <span className="block text-xs text-cream-dim">
                      {c.model(built, s.capacity, s.level)} · {s.regions.map(regionName).join(", ")}
                    </span>
                  </span>
                  {view.house.casa < s.casa ? (
                    <span className="text-xs text-cream-dim">{c.opensAt(s.casa)}</span>
                  ) : (
                    <Slab
                      size="sm"
                      tone="ghost"
                      busy={busy}
                      disabled={noDepot || full || !affordable(p.cash, s.cost)}
                      onClick={() => void act({ type: "empireBuyVehicle", vehicleType: s.type })}
                    >
                      {full ? c.full : c.buy(d(s.cost))}
                    </Slab>
                  )}
                </div>
                {built > 0 && !noDepot && (
                  <ModelUpgrade p={p} type={s.type} upgrade={s.upgrade} busy={busy} act={act} />
                )}
              </li>
            );
          })}
      </ul>
    </section>
  );
}

/**
 * The fleet the Remise holds (after Hades' Star's shipyard): a cart drawn a place, filled when a
 * vehicle stands in it, and the Remise's next level.
 */
function FleetGauge({
  p,
  fleet,
  busy,
  act,
}: {
  p: EmpirePayload;
  fleet: NonNullable<NonNullable<EmpirePayload["view"]>["fleet"]>;
  busy: boolean;
  act: Act;
}) {
  const c = t.charroi;
  const raising = p.view?.house.builds.find((b) => b.kind === "depot");
  const next = fleet.next;
  const places = Math.max(fleet.cap, fleet.vehicles);
  return (
    <div
      className="mt-2 space-y-2 rounded-lg bg-night-2 p-3 ring-1 ring-inset ring-line/70"
      data-fleet={`${fleet.vehicles}/${fleet.cap}`}
    >
      <div className="flex flex-wrap gap-1" aria-hidden>
        {Array.from({ length: places }, (_, i) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: the places are only counted
            key={i}
            className={`h-3 w-5 rounded-sm ${i < fleet.vehicles ? "bg-gold" : "bg-night-4 ring-1 ring-inset ring-line"}`}
          />
        ))}
      </div>
      <p className="text-xs text-cream-dim">{c.fleet(fleet.vehicles, fleet.cap, fleet.level)}</p>
      {raising ? (
        <Badge tone="lagoon">{c.raising(hourOf(raising.endsAt))}</Badge>
      ) : next === null ? (
        <p className="text-xs font-semibold text-lagoon">{c.fleetTop}</p>
      ) : (p.view?.house.casa ?? 1) < next.casa ? (
        <p className="text-xs text-cream-dim">{c.opensAt(next.casa)}</p>
      ) : (
        <Slab
          size="sm"
          tone="ghost"
          busy={busy}
          disabled={!affordable(p.cash, next.cost)}
          onClick={() => void act({ type: "empireUpgradeDepot" })}
        >
          {c.raise(next.vehicles, d(next.cost), minutesLabel(next.minutes))}
        </Slab>
      )}
    </div>
  );
}

/**
 * A model's next level (decision of the owner, 31 October 2026): at the Remise for the land
 * vehicles, the Arsenal for the ships, +10 % hold for every vehicle of it.
 */
export function ModelUpgrade({
  p,
  type,
  upgrade,
  busy,
  act,
}: {
  p: EmpirePayload;
  type: string;
  upgrade: string | null;
  busy: boolean;
  act: Act;
}) {
  const c = t.charroi;
  if (upgrade === null) return <p className="text-xs font-semibold text-lagoon">{c.top}</p>;
  return (
    <span data-upgrade-model={type} className="block">
      <Slab
        size="sm"
        tone="ghost"
        busy={busy}
        disabled={!affordable(p.cash, upgrade)}
        onClick={() => void act({ type: "empireUpgradeVehicle", vehicleType: type })}
      >
        {c.upgrade(d(upgrade))}
      </Slab>
    </span>
  );
}

/** The Scuola: its places, what is being researched, each open module and its next level. */
export function Scuola({ p, busy, act }: { p: EmpirePayload; busy: boolean; act: Act }) {
  const view = p.view;
  if (!view) return null;
  const sc = t.scuola;
  const r = view.research;
  if (r.slots === 0 && !shownAt(view.house.casa, opensAt(p, "scuola"))) return null;
  return (
    <section className="mt-5">
      <div className="flex items-baseline justify-between">
        <Label>{sc.title}</Label>
        {r.slots > 0 && (
          <span className="text-xs text-cream-dim">{sc.places(r.running.length, r.slots)}</span>
        )}
      </div>
      {r.slots === 0 ? (
        <p className="mt-1 text-sm text-cream-dim">{sc.closed}</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {r.modules.map((m) => {
            const running = r.running.find((x) => x.code === m.code);
            const [name, effect] = t.moduleNames[m.code] ?? [m.code, m.effect];
            return (
              <li
                key={m.code}
                className="flex items-center gap-2 border-b border-line/60 pb-2 text-sm text-cream"
              >
                <span className="flex-1">
                  {name} · {sc.level(m.level)}
                  <span className="block text-xs text-cream-dim">{effect}</span>
                </span>
                {running ? (
                  <span className="text-xs text-cream-dim">
                    {sc.running(hourOf(running.endsAt))}
                  </span>
                ) : m.next ? (
                  <Slab
                    size="sm"
                    tone="ghost"
                    busy={busy}
                    disabled={r.running.length >= r.slots || !affordable(p.cash, m.next.cost)}
                    onClick={() => void act({ type: "empireResearch", module: m.code })}
                  >
                    {sc.research(m.next.level, d(m.next.cost), minutesLabel(m.next.minutes))}
                  </Slab>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
