import { useState } from "react";
import { artSource } from "../art/Illustration.js";
import { GoodsMark } from "../art/goods.js";
import {
  MediterraneanGround,
  ROUTES,
  WORLD_VIEW,
  alongPath,
  pathOf,
  routeBetween,
  seatOf,
} from "../art/mediterranean.js";
import { P } from "../art/palette.js";
import { RegionArt } from "../art/scenes.js";
import { d, duration, hourOf, minutesLabel } from "../game/format.js";
import { fr } from "../i18n.js";
import { Badge, Label, Sheet, Slab, clock } from "../ui.js";
import {
  type RegionLook,
  affordable,
  bestQuote,
  buildingName,
  opensAt,
  readyLots,
  recipeOf,
  regionLook,
  shownAt,
} from "./logic.js";
import type { EmpireAction, EmpirePayload, EmpireRegion } from "./types.js";

const t = fr.empire;
export const regionName = (code: string) => t.regionNames[code] ?? code;
const goodName = (p: EmpirePayload, code: string) =>
  fr.themeNames.resource[code] ?? p.goods[code] ?? code;

type Act = (a: EmpireAction) => Promise<void>;

/** A share of the map's frame, in percent: where an HTML marker sits over the chart. */
const pct = ([x, y]: [number, number]) => ({
  left: `${((x - WORLD_VIEW.x) / WORLD_VIEW.w) * 100}%`,
  top: `${((y - WORLD_VIEW.y) / WORLD_VIEW.h) * 100}%`,
});

/**
 * The world map (lot D of the UX audit; Lagune: the first depth): Europe and the Mediterranean as
 * a portolan, each region at its real place. The house's regions are lit, those it may open
 * ringed in gold, those its Casa has not reached in the fog with the Casa they ask; the roads by
 * land in cream, by sea in lapis; the convoys on their way, a dot along their road.
 */
export function WorldMap({
  p,
  now,
  onPlace,
}: {
  p: EmpirePayload;
  now: number;
  onPlace: (code: string) => void;
}) {
  const view = p.view;
  if (!view) return null;
  const casa = view.house.casa;
  const open = new Set(view.regions.filter((r) => r.counter > 0).map((r) => r.code));
  const texture = artSource("world", "map")?.src;
  return (
    <div
      className="relative mx-auto w-full max-w-xl overflow-hidden rounded-2xl ring-1 ring-line"
      style={{ aspectRatio: `${WORLD_VIEW.w} / ${WORLD_VIEW.h}` }}
      data-map="empire"
    >
      <svg
        viewBox={`${WORLD_VIEW.x} ${WORLD_VIEW.y} ${WORLD_VIEW.w} ${WORLD_VIEW.h}`}
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <MediterraneanGround texture={texture} />
        {ROUTES.map((r) => {
          const lit = open.has(r.from) && open.has(r.to);
          return (
            <path
              key={`${r.from}:${r.to}`}
              d={pathOf(routeBetween(r.from, r.to))}
              fill="none"
              stroke={r.sea ? P.info : P.cream}
              strokeOpacity={lit ? 0.75 : 0.3}
              strokeWidth={lit ? 1.6 : 1}
              strokeDasharray={r.sea ? "4 3" : "1.5 2.5"}
              strokeLinecap="round"
            />
          );
        })}
        {view.regions
          .filter((r) => regionLook(r, casa) === "closed")
          .map((r) => {
            const [x, y] = seatOf(r.code);
            return (
              <g key={r.code} data-fog={r.code}>
                <ellipse cx={x} cy={y} rx="26" ry="15" fill={P.cream} opacity="0.12" />
                <ellipse cx={x - 9} cy={y - 4} rx="14" ry="9" fill={P.cream} opacity="0.1" />
                <ellipse cx={x + 10} cy={y + 3} rx="15" ry="8" fill={P.cream} opacity="0.1" />
              </g>
            );
          })}
        {view.vehicles.voyages.map((v) => {
          // Its vehicle is back twice the way after its departure: the departure, from both.
          const back =
            view.vehicles.mine.find((x) => x.id === v.vehicleId)?.busyUntil ?? v.arrivesAt;
          const left = 2 * v.arrivesAt - back;
          const k = (now - left) / Math.max(1, v.arrivesAt - left);
          const [x, y] = alongPath(routeBetween(v.from, v.to), k);
          return (
            <circle
              key={v.id}
              cx={x}
              cy={y}
              r="3"
              fill={P.lagoon}
              stroke={P.night}
              strokeWidth="1"
              data-convoy
            />
          );
        })}
      </svg>
      {view.regions.map((r) => (
        <RegionMarker
          key={r.code}
          p={p}
          r={r}
          look={regionLook(r, casa)}
          onClick={() => onPlace(r.code)}
        />
      ))}
    </div>
  );
}

const SIDE_CLASS = {
  below: "left-1/2 top-full mt-0.5 -translate-x-1/2 items-center",
  belowEnd: "right-0 top-full mt-0.5 items-end",
  belowStart: "left-0 top-full mt-0.5 items-start",
  aboveEnd: "bottom-full right-0 mb-0.5 items-end",
  above: "bottom-full left-1/2 mb-0.5 -translate-x-1/2 items-center",
  left: "right-full top-1/2 mr-1 -translate-y-1/2 items-end",
  right: "left-full top-1/2 ml-1 -translate-y-1/2 items-start",
};

/** Which side of its marker a region writes its name, so that no name covers a neighbour. */
const LABEL_SIDE: Record<string, keyof typeof SIDE_CLASS> = {
  veneto: "above",
  friuli: "right",
  lombardia: "below",
  romagna: "belowEnd",
  dalmazia: "above",
  germania: "right",
  fiandra: "belowStart",
  grecia: "left",
  costantinopoli: "left",
  levante: "aboveEnd",
};

function RegionMarker({
  p,
  r,
  look,
  onClick,
}: {
  p: EmpirePayload;
  r: EmpireRegion;
  look: RegionLook;
  onClick: () => void;
}) {
  const best = look === "open" || look === "home" ? bestQuote(p, r.code) : null;
  const size = look === "home" ? "h-10 w-10" : "h-8 w-8";
  const ring = {
    home: "bg-gold text-ink ring-2 ring-gold/40",
    open: "bg-night-3 text-cream ring-2 ring-lagoon",
    reachable: "bg-night-3 text-gold ring-2 ring-gold",
    closed: "bg-night-2/80 text-muted ring-1 ring-line",
  }[look];
  return (
    // Only the round marker answers a finger; its name, beside it, lets the touch through.
    <div className="absolute -translate-x-1/2 -translate-y-1/2" style={pct(seatOf(r.code))}>
      <button
        type="button"
        onClick={onClick}
        data-region={r.code}
        data-look={look}
        aria-label={
          look === "closed"
            ? `${regionName(r.code)} : ${t.world.closed(r.casa)}`
            : regionName(r.code)
        }
        className={`relative z-10 flex items-center justify-center rounded-full font-display text-xs font-bold shadow-md shadow-black/40 active:scale-95 ${size} ${ring}`}
      >
        {look === "home" ? (
          r.counter
        ) : best ? (
          <GoodsMark code={best} size={20} />
        ) : look === "reachable" ? (
          "+"
        ) : look === "open" ? (
          r.counter
        ) : (
          "·"
        )}
      </button>
      <span
        className={`pointer-events-none absolute flex flex-col ${SIDE_CLASS[LABEL_SIDE[r.code] ?? "below"]}`}
      >
        <span
          className={`whitespace-nowrap rounded px-1 font-place text-[0.625rem] font-bold uppercase tracking-[0.12em] ${look === "closed" ? "text-muted" : "text-cream"}`}
          style={{ background: "rgba(11, 22, 38, 0.6)" }}
        >
          {look === "home" ? t.world.venice : (t.mapNames[r.code] ?? regionName(r.code))}
        </span>
        {look === "closed" && (
          <span className="whitespace-nowrap px-1 font-mono text-[0.625rem] uppercase tracking-[0.1em] text-cream-dim">
            {t.world.closed(r.casa)}
          </span>
        )}
      </span>
    </div>
  );
}

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
  onConvoy,
}: {
  p: EmpirePayload;
  code: string;
  now: number;
  busy: boolean;
  act: Act;
  onBuild: () => void;
  onConvoy: () => void;
}) {
  const view = p.view;
  const r = view?.regions.find((x) => x.code === code);
  if (!view || !r) return null;
  const w = t.world;
  const quotes = p.market.filter((q) => q.region === code);
  const workshops = view.house.workshops.filter((x) => (x.region ?? "veneto") === code);
  const deposits = view.deposits.filter((x) => x.region === code);
  const favourShort = r.next?.charter === true && view.house.favour < r.charterFavour;
  return (
    <section className="mx-auto mt-3 w-full max-w-md space-y-4">
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
                : w.charter(r.charterFavour)}
        </span>
      </div>
      {r.buildingUntil !== null && (
        <Badge tone="lagoon">{w.opening(clock(r.buildingUntil - now))}</Badge>
      )}
      {r.next && (
        <Slab
          tone="gold"
          size="lg"
          className="w-full"
          busy={busy}
          disabled={favourShort || !affordable(p.cash, r.next.cost)}
          onClick={() =>
            void act(
              r.next?.charter
                ? { type: "empireCharter", region: code }
                : { type: "empireUpgradeCounter", region: code },
            )
          }
        >
          {r.next.charter
            ? w.charterAction(d(r.next.cost))
            : w.counterAction(r.next.level, d(r.next.cost))}
        </Slab>
      )}
      {favourShort && <p className="text-xs text-vermilion">{w.favourShort}</p>}

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

      {r.counter > 0 && convoys(p, code) && (
        <Slab size="md" tone="ghost" className="w-full" onClick={onConvoy}>
          {w.sendConvoy}
        </Slab>
      )}

      <div>
        <div className="flex items-baseline justify-between">
          <Label>{w.deposits}</Label>
          <span className="text-xs text-cream-dim">
            {view.teams.max > 0 ? w.teams(view.teams.used, view.teams.max) : w.noTeam}
          </span>
        </div>
        {deposits.length === 0 ? (
          <p className="mt-1 text-sm text-cream-dim">{w.noDeposit}</p>
        ) : (
          <ul className="mt-1 space-y-2">
            {deposits.map((x) => (
              <li key={x.id} className="flex items-center gap-2 text-sm text-cream">
                <GoodsMark code={x.good} size={22} />
                <span className="flex-1">
                  {goodName(p, x.good)}
                  <span className="block text-xs text-cream-dim">
                    {w.depositStock(x.stock, x.teams)}
                  </span>
                </span>
                {x.mine ? (
                  <Badge tone="lagoon">{w.teamThere}</Badge>
                ) : (
                  <Slab
                    size="sm"
                    tone="ghost"
                    busy={busy}
                    disabled={view.teams.used >= view.teams.max}
                    onClick={() => void act({ type: "empireTeam", depositId: x.id })}
                  >
                    {w.sendTeam}
                  </Slab>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

/** Has the house a vehicle of the roads that leaves from this region? */
function convoys(p: EmpirePayload, code: string): boolean {
  const view = p.view;
  if (!view) return false;
  return view.vehicles.mine.some((v) => {
    const spec = view.vehicles.shop.find((s) => s.type === v.type);
    return spec !== undefined && spec.regions.length > 1 && spec.regions.includes(code);
  });
}

/**
 * A convoy from a region (the third depth, a sheet): a free vehicle of the route, its destination,
 * the goods and their quantity, and the margin the dated prices promise.
 */
export function VoyageSheet({
  p,
  from,
  open,
  busy,
  onClose,
  act,
}: {
  p: EmpirePayload;
  from: string;
  open: boolean;
  busy: boolean;
  onClose: () => void;
  act: Act;
}) {
  const view = p.view;
  const v = t.voyage;
  const shop = view?.vehicles.shop ?? [];
  const free = (view?.vehicles.mine ?? []).filter((x) => {
    const spec = shop.find((s) => s.type === x.type);
    return (
      spec && spec.regions.length > 1 && spec.regions.includes(from) && x.busyUntil <= (p.now ?? 0)
    );
  });
  const [vehicleId, setVehicle] = useState<string>("");
  const vehicle = free.find((x) => x.id === vehicleId) ?? free[0];
  const spec = shop.find((s) => s.type === vehicle?.type);
  const reachable = (view?.regions ?? []).filter(
    (r) => r.code !== from && spec?.regions.includes(r.code) && (view?.house.casa ?? 0) >= r.casa,
  );
  const [to, setTo] = useState<string>("");
  const dest = reachable.find((r) => r.code === to)?.code ?? reachable[0]?.code ?? "";
  const traded = p.market.filter((q) => q.region === dest);
  const [good, setGood] = useState<string>("");
  const chosen = traded.find((q) => q.good === good)?.good ?? traded[0]?.good ?? "";
  const max = vehicle?.capacity ?? 0;
  const [qty, setQty] = useState(0);
  const amount = Math.min(max, qty > 0 ? qty : max);
  const there = traded.find((q) => q.good === chosen);
  const here = p.market.find((q) => q.region === from && q.good === chosen);
  const margin = there && here ? BigInt(there.price) - BigInt(here.price) : null;
  // The corsairs' risk there, and the insurance's premium on what the cargo is worth here.
  const risk = reachable.find((r) => r.code === dest)?.corsairRiskBps ?? 0;
  const premium =
    here && risk > 0 ? (BigInt(here.price) * BigInt(amount) * BigInt(risk) * 12n) / 100_000n : 0n;
  const [insured, setInsured] = useState(false);
  const [target, setTarget] = useState("");
  return (
    <Sheet open={open} onClose={onClose} kicker={v.kicker} title={v.title} summary={v.summary}>
      {!vehicle ? (
        <p className="text-sm text-cream-dim">{v.noVehicle}</p>
      ) : (
        <div className="space-y-3">
          <Choice
            label={v.vehicle}
            value={vehicle.id}
            onChange={setVehicle}
            options={free.map((x) => [x.id, `${t.vehicleNames[x.type] ?? x.type} · ${x.capacity}`])}
          />
          <Choice
            label={v.to}
            value={dest}
            onChange={setTo}
            options={reachable.map((r) => [
              r.code,
              `${regionName(r.code)} · ${v.hours(r.hoursFromVenice)}`,
            ])}
          />
          <Choice
            label={v.good}
            value={chosen}
            onChange={setGood}
            options={traded.map((q) => [q.good, goodName(p, q.good)])}
          />
          <label className="block text-sm text-cream">
            {v.qty(amount, max)}
            <input
              type="range"
              min={1}
              max={Math.max(1, max)}
              value={amount}
              onChange={(e) => setQty(Number(e.target.value))}
              className="lagune-range mt-1 w-full"
            />
          </label>
          {margin !== null && <p className="text-sm text-cream-dim">{v.margin(d(margin))}</p>}
          {risk > 0 ? (
            <label className="flex items-center gap-2 text-sm text-cream" data-insure>
              <input
                type="checkbox"
                checked={insured}
                onChange={(e) => setInsured(e.target.checked)}
              />
              {fr.empire.sea.insure(Math.round(risk / 100), d(premium))}
            </label>
          ) : (
            <p className="text-xs text-cream-dim">{fr.empire.sea.noRisk}</p>
          )}
          <Slab
            tone="gold"
            size="lg"
            className="w-full"
            busy={busy}
            disabled={!dest || !chosen}
            onClick={() =>
              void act({
                type: "empireVoyage",
                vehicleId: vehicle.id,
                from,
                to: dest,
                good: chosen,
                qty: amount,
                ...(insured ? { insured: true } : {}),
              }).then(onClose)
            }
          >
            {v.action}
          </Slab>
          <div className="flex gap-2" data-open-colleganza>
            <input
              inputMode="numeric"
              value={target}
              onChange={(e) => setTarget(e.target.value.replace(/\D/g, ""))}
              placeholder={fr.empire.sea.targetPlaceholder}
              aria-label={fr.empire.sea.targetPlaceholder}
              className="min-h-11 w-32 bg-night-2 px-3 text-cream ring-1 ring-inset ring-line slab"
            />
            <Slab
              size="sm"
              tone="ghost"
              busy={busy}
              disabled={!target || !dest || !chosen}
              onClick={() =>
                void act({
                  type: "empireColleganzaOpen",
                  vehicleId: vehicle.id,
                  from,
                  to: dest,
                  good: chosen,
                  qty: amount,
                  target: String(Number(target) * 100),
                }).then(onClose)
              }
            >
              {fr.empire.sea.openColleganza}
            </Slab>
          </div>
        </div>
      )}
    </Sheet>
  );
}

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
}: { p: EmpirePayload; now: number; busy: boolean; act: Act }) {
  const view = p.view;
  if (!view) return null;
  const c = t.charroi;
  return (
    <section className="mt-5">
      <Label>{c.title}</Label>
      <p className="mt-1 text-xs text-cream-dim">{c.haul(view.vehicles.haulPerDay)}</p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {view.vehicles.mine.map((v) => (
          <li key={v.id}>
            <Badge tone={v.busyUntil > now ? "ghost" : "lagoon"}>
              {t.vehicleNames[v.type] ?? v.type} ·{" "}
              {v.busyUntil > now ? c.busy(hourOf(v.busyUntil)) : c.free}
            </Badge>
          </li>
        ))}
      </ul>
      <ul className="mt-3 space-y-2">
        {view.vehicles.shop
          .filter((s) => !s.build && shownAt(view.house.casa, s.casa))
          .map((s) => (
            <li
              key={s.type}
              className="flex items-center gap-2 border-b border-line/60 pb-2 text-sm text-cream"
            >
              <span className="flex-1">
                {t.vehicleNames[s.type] ?? s.type}
                <span className="block text-xs text-cream-dim">
                  {s.capacity} · {s.regions.map(regionName).join(", ")}
                </span>
              </span>
              {view.house.casa < s.casa ? (
                <span className="text-xs text-cream-dim">{c.opensAt(s.casa)}</span>
              ) : (
                <Slab
                  size="sm"
                  tone="ghost"
                  busy={busy}
                  disabled={!affordable(p.cash, s.cost)}
                  onClick={() => void act({ type: "empireBuyVehicle", vehicleType: s.type })}
                >
                  {c.buy(d(s.cost))}
                </Slab>
              )}
            </li>
          ))}
      </ul>
    </section>
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
                ) : m.plans > 0 ? (
                  <span className="text-xs text-cream-dim">{sc.plans(m.plans)}</span>
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
