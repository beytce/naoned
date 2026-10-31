import { useState } from "react";
import { artSource } from "../art/Illustration.js";
import { GoodsMark } from "../art/goods.js";
import { RegionArt } from "../art/scenes.js";
import { d, duration, hourOf, minutesLabel } from "../game/format.js";
import { fr } from "../i18n.js";
import { Badge, Label, Sheet, Slab, clock } from "../ui.js";
import { affordable, buildingName, opensAt, readyLots, recipeOf, shownAt } from "./logic.js";
import type { EmpireAction, EmpirePayload, EmpireRegion } from "./types.js";

const t = fr.empire;
export const regionName = (code: string) => t.regionNames[code] ?? code;
const goodName = (p: EmpirePayload, code: string) =>
  fr.themeNames.resource[code] ?? p.goods[code] ?? code;

/** Where each region sits on the map, roughly as on a portolan (percent of the frame). */
const AT: Record<string, { x: number; y: number }> = {
  fiandra: { x: 10, y: 8 },
  germania: { x: 46, y: 9 },
  lombardia: { x: 22, y: 36 },
  veneto: { x: 50, y: 40 },
  friuli: { x: 74, y: 24 },
  romagna: { x: 46, y: 64 },
  dalmazia: { x: 76, y: 56 },
  grecia: { x: 70, y: 86 },
  costantinopoli: { x: 92, y: 72 },
  levante: { x: 90, y: 92 },
};

type Act = (a: EmpireAction) => Promise<void>;

/**
 * The map zoomed out (Lagune: the first depth): each region a star, bright where the house has
 * its counter, ringed in gold where it may open one, fogged while its Casa is ahead. Venice in
 * the middle; the convoys on their way, a dot along their road.
 */
export function Constellation({
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
  const at = (code: string) => AT[code] ?? { x: 50, y: 50 };
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[24rem]" data-map="empire">
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden="true">
        {view.regions
          .filter((r) => r.code !== "veneto")
          .map((r) => (
            <line
              key={r.code}
              x1={at("veneto").x}
              y1={at("veneto").y}
              x2={at(r.code).x}
              y2={at(r.code).y}
              stroke="rgb(var(--line))"
              strokeWidth="0.4"
              strokeDasharray={r.counter > 0 ? undefined : "1 1.5"}
            />
          ))}
        {view.vehicles.voyages.map((v) => {
          const a = at(v.from);
          const b = at(v.to);
          // Its vehicle is back twice the way after its departure: the departure, from both.
          const back =
            view.vehicles.mine.find((x) => x.id === v.vehicleId)?.busyUntil ?? v.arrivesAt;
          const left = 2 * v.arrivesAt - back;
          const k = Math.min(1, Math.max(0, (now - left) / Math.max(1, v.arrivesAt - left)));
          return (
            <circle
              key={v.id}
              cx={a.x + (b.x - a.x) * k}
              cy={a.y + (b.y - a.y) * k}
              r="1.6"
              fill="rgb(var(--lagoon))"
            />
          );
        })}
      </svg>
      {view.regions.map((r) => (
        <RegionStar
          key={r.code}
          r={r}
          casa={view.house.casa}
          {...at(r.code)}
          onClick={() => onPlace(r.code)}
        />
      ))}
    </div>
  );
}

function RegionStar({
  r,
  casa,
  x,
  y,
  onClick,
}: {
  r: EmpireRegion;
  casa: number;
  x: number;
  y: number;
  onClick: () => void;
}) {
  const home = r.code === "veneto";
  const open = r.counter > 0;
  const reachable = !open && casa >= r.casa;
  const size = home ? "h-[18%] w-[18%]" : "h-[12%] w-[12%]";
  const look = home
    ? "bg-gold text-ink"
    : open
      ? "bg-lagoon/30 text-cream ring-2 ring-lagoon"
      : reachable
        ? "bg-night-3 text-cream ring-2 ring-gold"
        : "bg-night-2 text-muted opacity-60 ring-1 ring-line";
  return (
    <button
      type="button"
      onClick={onClick}
      data-region={r.code}
      aria-label={regionName(r.code)}
      className={`absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full transition active:scale-95 ${size} ${look}`}
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      <span className="font-display text-xs font-bold leading-none">
        {home ? r.counter : open ? r.counter : reachable ? "+" : r.casa}
      </span>
      <span className="pointer-events-none absolute top-full mt-1 whitespace-nowrap text-[0.6875rem] text-cream-dim">
        {home ? t.world.venice : regionName(r.code)}
      </span>
    </button>
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
