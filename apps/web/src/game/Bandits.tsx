import { useState } from "react";
import { ResourceIcon } from "../art/resources.js";
import { fr } from "../i18n.js";
import { Label, Panel, Slab, clock } from "../ui.js";
import type { GameProps } from "./Game.js";
import { d } from "./format.js";
import { Segmented } from "./stage.js";
import type { RoadView } from "./types.js";

/**
 * The bandits' screen: a road and a duration, the cost and the rules in plain words, then the
 * bands under way with their attempts and booty.
 */
export function Bandits(props: GameProps & { road: RoadView; city?: string }) {
  const rules = props.catalog.road?.bandits;
  const routes = Object.entries(props.catalog.road?.routes ?? {}).flatMap(([region, cities]) =>
    Object.keys(cities).map((city) => `${region}:${city}`),
  );
  // From a city of the map: the roads that lead there first.
  if (props.city) {
    const to = (r: string) => (r.endsWith(`:${props.city}`) ? 0 : 1);
    routes.sort((x, y) => to(x) - to(y));
  }
  const [route, setRoute] = useState(routes[0] ?? "");
  const [hours, setHours] = useState(rules?.hoursOptions[0] ?? 0);
  if (!rules) return null;
  const tb = fr.game.bandits;
  const cost = BigInt(rules.feePerHour) * BigInt(hours);
  const provisions = Object.entries(rules.provisionsPerHour)
    .filter(([, q]) => q > 0)
    .map(([r, q]) => `${q * hours} ${props.names.resource(r).toLowerCase()}`);
  const label = (r: string) => {
    const [region = "", city = ""] = r.split(":");
    return `${props.names.region(region)} → ${props.names.city(city)}`;
  };
  return (
    <div className="space-y-5">
      <Panel>
        <h3 className="font-display text-lg font-extrabold uppercase">{tb.title}</h3>
        <p className="mt-2 text-sm text-cream-dim">
          {tb.help(
            rules.maxAttacksPerBand,
            Math.round(rules.takeBps / 100),
            Math.round(rules.keepBps / 100),
          )}
        </p>
        <div className="mt-3 space-y-1 rounded-xl bg-night-3 p-3 text-sm">
          <p className={props.road.infamy > 0 ? "text-vermilion" : "text-cream-dim"}>
            {tb.infamy(props.road.infamy)}
          </p>
          {props.road.infamy > 0 && <p>{tb.bountyOnHead(d(props.road.bountyOnHead))}</p>}
          {BigInt(props.road.bounties) > 0n && (
            <p className="text-lagoon">{tb.bountiesWon(d(props.road.bounties))}</p>
          )}
        </div>
        <label className="mt-4 block">
          <Label>{tb.route}</Label>
          <select
            value={route}
            onChange={(e) => setRoute(e.target.value)}
            className="mt-1 w-full rounded-xl border border-line bg-night-2 px-3 py-2.5 text-sm"
          >
            {routes.map((r) => (
              <option key={r} value={r}>
                {label(r)}
                {props.road.watchedRoutes.includes(r) ? " ⚔" : ""}
              </option>
            ))}
          </select>
        </label>
        <div className="mt-4">
          <Label>{tb.hours}</Label>
          <div className="mt-1">
            <Segmented
              value={String(hours)}
              onChange={(h) => setHours(Number(h))}
              options={rules.hoursOptions.map((h) => ({
                value: String(h),
                label: tb.hoursLabel(h),
              }))}
            />
          </div>
        </div>
        <p className="mt-4 text-sm">{tb.cost([d(cost), ...provisions].join(" + "))}</p>
        <Slab
          className="mt-4 w-full"
          disabled={props.busy || !route}
          onClick={() => props.act({ type: "postBand", route, hours })}
        >
          {tb.post}
        </Slab>
      </Panel>

      <section className="space-y-2">
        <Label>{tb.mine}</Label>
        {props.road.bands.length === 0 && <p className="text-sm text-cream-dim">{tb.none}</p>}
        {props.road.bands.map((b) => {
          const booty = Object.entries(b.booty).filter(([, q]) => q > 0);
          return (
            <Panel key={b.id} glow={b.collectable ? "gold" : undefined} className="p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-display text-sm font-extrabold uppercase">
                    {label(b.route)}
                  </p>
                  <p className="label mt-1">
                    {b.active
                      ? tb.active(clock(b.endAt - props.now))
                      : b.dispersed
                        ? tb.dispersed
                        : tb.over}{" "}
                    · {tb.attempts(b.attacks, rules.maxAttacksPerBand)}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-cream-dim">{tb.booty} :</span>
                    {booty.length === 0
                      ? "—"
                      : booty.map(([r, q]) => (
                          <span key={r} className="inline-flex items-center gap-1">
                            <ResourceIcon code={r} size={18} />
                            {q}
                          </span>
                        ))}
                  </p>
                </div>
                {b.collected ? (
                  <span className="label text-lagoon">✓ {tb.collected}</span>
                ) : (
                  b.collectable && (
                    <Slab
                      size="sm"
                      disabled={props.busy}
                      onClick={() => props.act({ type: "collectBooty", bandId: b.id })}
                    >
                      {tb.collect}
                    </Slab>
                  )
                )}
              </div>
            </Panel>
          );
        })}
      </section>
    </div>
  );
}
