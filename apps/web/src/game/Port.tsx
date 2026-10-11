import { useState } from "react";
import { SeaChart } from "../art/map.js";
import { ResourceIcon } from "../art/resources.js";
import { Galley, PortArt } from "../art/scenes.js";
import { fr } from "../i18n.js";
import { Badge, Big, Label, Panel, Ribbon, Sheet, Slab, Stat, Switch, Tabs, clock } from "../ui.js";
import { have } from "./Comptoir.js";
import type { GameProps } from "./Game.js";
import { d } from "./format.js";
import { store } from "./store.js";
import type {
  Destination,
  ExpeditionView,
  PlayerView,
  RaidView,
  ShipType,
  ShipView,
} from "./types.js";

type PortTab = "routes" | "flotte" | "corsaires";

const pct = (bps: number) => `${Math.round(bps / 100)} %`;
const t = () => fr.game.port;

/** Same rule as the engine: base risk alone, escorted risk at defense 3, lower beyond. */
function pirateRisk(dest: Destination, defense: number): number {
  if (defense <= 1) return dest.riskBps;
  if (defense === 2) return Math.round((dest.riskBps + dest.escortRiskBps) / 2);
  return Math.floor((dest.escortRiskBps * 3) / defense);
}

function portName(props: GameProps, code: string) {
  return props.catalog.ports.find((p) => p.code === code)?.name ?? code;
}

function shipType(props: GameProps, type: string): ShipType | undefined {
  return props.catalog.ships.find((s) => s.type === type);
}

function Goods({ goods }: { goods: Record<string, number> }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      {Object.entries(goods)
        .filter(([, q]) => q > 0)
        .map(([r, q]) => (
          <span key={r} className="inline-flex items-center gap-1 text-sm">
            <ResourceIcon code={r} size={18} />
            {q}
          </span>
        ))}
    </span>
  );
}

function Stepper({
  value,
  max,
  onChange,
}: { value: number; max: number; onChange: (v: number) => void }) {
  const set = (v: number) => onChange(Math.max(0, Math.min(max, v)));
  const btn = "slab h-9 min-w-9 bg-night-4 px-2 font-display text-sm ring-1 ring-inset ring-line";
  return (
    <div className="flex items-center gap-1.5">
      <button type="button" className={btn} onClick={() => set(value - 10)}>
        <span>−10</span>
      </button>
      <span className="w-12 text-center font-display text-base tabular-nums">{value}</span>
      <button type="button" className={btn} onClick={() => set(value + 10)}>
        <span>+10</span>
      </button>
      <button type="button" className="label px-1 text-gold" onClick={() => set(max)}>
        max
      </button>
    </div>
  );
}

/* ───────────── Convoys at sea and the log ───────────── */

function ActiveConvoy({ e, props }: { e: ExpeditionView; props: GameProps }) {
  const back = props.now >= e.returnAt;
  const progress = (props.now - e.departAt) / (e.returnAt - e.departAt);
  return (
    <Panel glow={back ? "gold" : e.boarding?.success ? "vermilion" : "lagoon"}>
      <div className="flex items-center justify-between">
        <Label className={back ? "text-gold" : "text-lagoon"}>{back ? t().back : t().atSea}</Label>
        <span className="label">{portName(props, e.destination)}</span>
      </div>
      {back ? (
        <Slab
          size="lg"
          className="mt-3 w-full"
          disabled={props.busy}
          onClick={() => props.act({ type: "collectExpedition", expeditionId: e.id })}
        >
          {t().unload}
        </Slab>
      ) : (
        <div className="mt-2 space-y-3">
          <Big className="text-4xl">{clock(e.returnAt - props.now)}</Big>
          <Ribbon value={progress} tone="lagoon" />
        </div>
      )}
      {e.boarding && <Boarding e={e} props={props} />}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Goods goods={e.cargo} />
        <span className="label ml-auto">
          {(e.ships?.length ?? 0) > 0 ? t().ownShips(e.ships?.length ?? 0) : t().chartered}
        </span>
      </div>
    </Panel>
  );
}

function Boarding({ e, props }: { e: ExpeditionView; props: GameProps }) {
  const b = e.boarding;
  if (!b) return null;
  const who = props.people[b.raider] ?? fr.game.anonymous;
  return (
    <p
      className={`mt-3 p-2 text-sm ring-1 ${b.success ? "bg-vermilion/15 text-vermilion ring-vermilion/50" : "bg-lagoon/10 text-lagoon ring-lagoon/40"}`}
    >
      {b.success ? t().raided(who) : t().repelled(who)} {b.success && <Goods goods={b.taken} />}
    </p>
  );
}

/* ───────────── Routes: chart, ports, convoy sheet ───────────── */

function PortCard({ code, props }: { code: string; props: GameProps }) {
  const dest = props.catalog.destinations[code];
  if (!dest) return null;
  const prices = props.view.ports[code] ?? {};
  const best = Object.entries(prices)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);
  const watched = props.view.watchedRoutes.includes(code);
  return (
    <Panel glow={watched ? "vermilion" : undefined}>
      <PortArt
        code={code}
        className="-mx-4 -mt-4 mb-3 h-20 w-[calc(100%+2rem)] max-w-none bg-night-2"
      />
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-lg font-extrabold uppercase">{portName(props, code)}</h2>
        <div className="flex items-center gap-2">
          <span className="label">{t().brings}</span>
          <ResourceIcon code={dest.returns} size={32} />
        </div>
      </div>
      {watched && <p className="mt-2 text-sm text-vermilion">☠ {t().watched}</p>}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Stat label={t().duration} value={`${dest.hours} h`} />
        <Stat label={t().risk} value={pct(dest.riskBps)} tone="vermilion" />
        <Stat label={t().gain} value={`+${pct(dest.gainBps)}`} tone="lagoon" />
      </div>
      <div className="mt-3">
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
          {t().wantsThisWeek}
        </span>
        <div className="mt-1 flex flex-wrap gap-3">
          {best.map(([r, bps]) => (
            <span key={r} className="inline-flex items-center gap-1 text-sm">
              <ResourceIcon code={r} size={20} />
              <span className={bps >= 10_000 ? "text-lagoon" : "text-vermilion"}>
                {bps >= 10_000 ? "+" : ""}
                {pct(bps - 10_000)}
              </span>
            </span>
          ))}
        </div>
      </div>
      <Slab
        className="mt-4 w-full"
        tone="lagoon"
        onClick={() => props.setSheet(`convoy:${code}`)}
        disabled={props.busy}
      >
        {t().sendConvoy}
      </Slab>
    </Panel>
  );
}

function ConvoySheet({ code, props }: { code: string; props: GameProps }) {
  const dest = props.catalog.destinations[code];
  const ready = props.view.ships.filter((s) => s.status === "ready");
  const [merchant, setMerchant] = useState<string>(ready[0]?.id ?? "");
  const [escorts, setEscorts] = useState<string[]>([]);
  const [hiredEscort, setHiredEscort] = useState(false);
  const [cargo, setCargo] = useState<Record<string, number>>({});
  if (!dest) return null;
  const refs = props.catalog.referencePrices;
  const prices = props.view.ports[code] ?? {};
  const own = merchant !== "";
  const fleet = own ? [merchant, ...escorts.filter((e) => e !== merchant)] : [];
  const types = fleet.map((id) => shipType(props, ready.find((s) => s.id === id)?.type ?? ""));
  const defense = own ? types.reduce((n, s) => n + (s?.defense ?? 0), 0) : hiredEscort ? 3 : 1;
  const hold = own ? BigInt(types[0]?.holdValue ?? "0") : BigInt(dest.maxCargoValue);
  const speed = own ? Math.max(...types.map((s) => s?.speedBps ?? 10_000)) : 10_000;
  const crews = own ? fleet.length : 1;
  const fee = own
    ? (BigInt(dest.charter) * BigInt(props.catalog.fleet.portDuesBps)) / 10_000n
    : BigInt(dest.charter) + (hiredEscort ? BigInt(dest.escort) : 0n);

  const shippable = props.catalog.resources.filter(
    (r) => r.tier !== "luxury" && have(props.view, r.code) > 0,
  );
  let value = 0n;
  let atPort = 0n;
  for (const [r, q] of Object.entries(cargo)) {
    const v = BigInt(refs[r] ?? "0") * BigInt(q);
    value += v;
    atPort += (v * BigInt(prices[r] ?? 10_000)) / 10_000n;
  }
  const unit = BigInt(refs[dest.returns] ?? "1");
  const back = unit > 0n ? (atPort * BigInt(10_000 + dest.gainBps)) / 10_000n / unit : 0n;
  const food = Object.entries(dest.provisions).every(
    ([r, q]) => have(props.view, r) - (cargo[r] ?? 0) >= q * crews,
  );
  const watched = props.view.watchedRoutes.includes(code);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Galley className="h-14 w-20" sailing />
        <div>
          <Label>{t().convoyTo}</Label>
          <h3 className="font-display text-lg font-extrabold uppercase">{portName(props, code)}</h3>
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t().merchantShip}</Label>
        <div className="grid grid-cols-2 gap-2">
          {ready.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setMerchant(s.id);
                setEscorts(escorts.filter((e) => e !== s.id));
              }}
              className={`slab px-3 py-2 text-left text-sm ${merchant === s.id ? "bg-gold text-ink" : "bg-night-4 ring-1 ring-inset ring-line"}`}
            >
              <span>{shipType(props, s.type)?.name}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setMerchant("");
              setEscorts([]);
            }}
            className={`slab px-3 py-2 text-left text-sm ${!own ? "bg-gold text-ink" : "bg-night-4 ring-1 ring-inset ring-line"}`}
          >
            <span>
              {t().chartered} ({d(dest.charter)})
            </span>
          </button>
        </div>
        {own ? (
          ready.length > 1 && (
            <div className="space-y-1 pt-1">
              <Label>{t().escorts}</Label>
              {ready
                .filter((s) => s.id !== merchant)
                .map((s) => (
                  <Switch
                    key={s.id}
                    checked={escorts.includes(s.id)}
                    onChange={(on) =>
                      setEscorts(
                        on ? [...escorts, s.id].slice(0, 3) : escorts.filter((x) => x !== s.id),
                      )
                    }
                    label={shipType(props, s.type)?.name}
                    hint={`${t().defense} ${shipType(props, s.type)?.defense}`}
                  />
                ))}
            </div>
          )
        ) : (
          <Switch
            checked={hiredEscort}
            onChange={setHiredEscort}
            label={t().withEscort}
            hint={`+${d(dest.escort)} · ${t().risk} ${pct(pirateRisk(dest, 3))}`}
          />
        )}
      </div>

      {shippable.length === 0 ? (
        <p className="text-sm text-cream-dim">{t().nothing}</p>
      ) : (
        <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
          {shippable.map((r) => {
            const bps = prices[r.code] ?? 10_000;
            return (
              <div key={r.code} className="flex items-center gap-2">
                <ResourceIcon code={r.code} size={26} />
                <span className="flex-1 text-sm">
                  {r.name}{" "}
                  <span className={bps >= 10_000 ? "text-lagoon" : "text-vermilion"}>
                    {bps >= 10_000 ? "+" : ""}
                    {pct(bps - 10_000)}
                  </span>
                </span>
                <Stepper
                  value={cargo[r.code] ?? 0}
                  max={have(props.view, r.code)}
                  onChange={(v) => setCargo({ ...cargo, [r.code]: v })}
                />
              </div>
            );
          })}
        </div>
      )}

      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span className="label">{t().hold}</span>
          <span className={value > hold ? "text-vermilion" : ""}>
            {d(value)} / {d(hold)}
          </span>
        </div>
        <Ribbon value={Number(value) / Number(hold || 1n)} />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat label={t().duration} value={`${Math.round((dest.hours * speed) / 1000) / 10} h`} />
        <Stat label={t().risk} value={pct(pirateRisk(dest, defense))} tone="vermilion" />
        <Stat label={t().defense} value={defense} tone="lagoon" />
      </div>
      {watched && <p className="text-sm text-vermilion">☠ {t().watchedWarning}</p>}

      <div className="flex items-center justify-between rounded-2xl bg-night-3 p-4 ring-1 ring-line">
        <div>
          <Label>{t().expected}</Label>
          <div className="mt-1 flex items-center gap-2">
            <ResourceIcon code={dest.returns} size={28} />
            <Big className="text-2xl text-gold">{back.toString()}</Big>
          </div>
        </div>
        <div className="text-right">
          <Label>{own ? t().dues : t().charter}</Label>
          <p className="mt-1 font-display text-sm font-semibold">{d(fee)}</p>
          <p className="label mt-1">
            {t().provisions} :{" "}
            {Object.entries(dest.provisions)
              .map(([r, q]) => `${q * crews} ${props.names.resource(r).toLowerCase()}`)
              .join(", ")}
          </p>
        </div>
      </div>
      <Slab
        size="lg"
        className="w-full"
        disabled={
          props.busy || value === 0n || value > hold || !food || BigInt(props.view.cash) < fee
        }
        onClick={async () => {
          const filled = Object.fromEntries(Object.entries(cargo).filter(([, q]) => q > 0));
          const ok = await props.act({
            type: "launchExpedition",
            destination: code,
            cargo: filled,
            escort: !own && hiredEscort,
            ships: fleet,
          });
          if (ok) props.setSheet(null);
        }}
      >
        {t().sail}
      </Slab>
    </div>
  );
}

function Routes({ props }: { props: GameProps }) {
  const [selected, setSelected] = useState<string | null>(null);
  const ports = props.catalog.ports.filter((p) => props.catalog.destinations[p.code]);
  const sailing = props.view.expeditions
    .filter((e) => e.outcome === "pending")
    .map((e) => e.destination);
  const shown = selected ? ports.filter((p) => p.code === selected) : ports;
  return (
    // Computer: the chart stays in view on the left, the ports scroll on the right.
    <div className="space-y-5 lg:grid lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:items-start lg:gap-8 lg:space-y-0">
      <div className="space-y-3 lg:sticky lg:top-24">
        <div className="overflow-hidden rounded-2xl border border-line">
          <SeaChart
            ports={ports}
            watched={props.view.watchedRoutes}
            selected={selected}
            sailing={sailing}
            onSelect={(code) => setSelected(selected === code ? null : code)}
          />
        </div>
        <p className="text-xs text-muted">{t().chartHelp}</p>
      </div>
      <div className="space-y-5">
        {selected && (
          <button type="button" className="label text-lagoon" onClick={() => setSelected(null)}>
            ← {t().allPorts}
          </button>
        )}
        {shown.map((p) => (
          <PortCard key={p.code} code={p.code} props={props} />
        ))}
      </div>
    </div>
  );
}

/* ───────────── Fleet: ships and the arsenal ───────────── */

const STATUS_TONE = {
  ready: "lagoon",
  at_sea: "gold",
  damaged: "vermilion",
  repairing: "ghost",
} as const;

function ShipCard({ s, props }: { s: ShipView; props: GameProps }) {
  const type = shipType(props, s.type);
  return (
    <Panel glow={s.status === "damaged" ? "vermilion" : undefined}>
      <div className="flex items-center gap-3">
        <Galley className="h-12 w-16" sailing={s.status === "at_sea"} />
        <div className="min-w-0 flex-1">
          <p className="font-display text-base font-extrabold uppercase">{type?.name}</p>
          <Badge tone={STATUS_TONE[s.status]}>
            {s.status === "repairing"
              ? t().repairingFor(clock(s.readyAt - props.now))
              : t().status[s.status]}
          </Badge>
        </div>
        {s.status === "damaged" && type && (
          <Slab
            size="sm"
            tone="vermilion"
            disabled={props.busy || BigInt(props.view.cash) < BigInt(type.repairCost)}
            onClick={() => props.act({ type: "repairShip", shipId: s.id })}
          >
            {t().repair(d(type.repairCost))}
          </Slab>
        )}
      </div>
    </Panel>
  );
}

function Fleet({ props }: { props: GameProps }) {
  const full = props.view.ships.length >= props.catalog.fleet.maxPerPlayer;
  return (
    <div className="space-y-5">
      <p className="text-sm text-cream-dim">{t().fleetHelp}</p>
      {props.view.ships.length === 0 ? (
        <p className="text-sm text-muted">{t().noShip}</p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {props.view.ships.map((s) => (
            <ShipCard key={s.id} s={s} props={props} />
          ))}
        </div>
      )}
      <section className="space-y-3">
        <Label>
          {t().arsenal} · {props.view.ships.length}/{props.catalog.fleet.maxPerPlayer}
        </Label>
        <div className="grid gap-3 lg:grid-cols-3">
          {props.catalog.ships.map((type) => {
            const planks = Object.entries(type.costMaterials);
            const can =
              !full &&
              BigInt(props.view.cash) >= BigInt(type.costDucats) &&
              planks.every(([r, q]) => have(props.view, r) >= q);
            return (
              <Panel key={type.type}>
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-lg font-extrabold uppercase">{type.name}</h3>
                  <span className="font-display text-sm font-semibold">
                    {d(type.costDucats)}
                    {planks.map(([r, q]) => (
                      <span key={r} className="ml-2 inline-flex items-center gap-1">
                        <ResourceIcon code={r} size={18} />
                        {q}
                      </span>
                    ))}
                  </span>
                </div>
                <dl className="mt-3 grid grid-cols-4 gap-2 text-sm">
                  {[
                    [t().hold, d(type.holdValue)],
                    [
                      t().speed,
                      type.speedBps < 10_000
                        ? `+${pct(10_000 - type.speedBps)}`
                        : type.speedBps > 10_000
                          ? `−${pct(type.speedBps - 10_000)}`
                          : "=",
                    ],
                    [t().defense, String(type.defense)],
                    [t().upkeep, d(type.upkeepPerDay)],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <dt className="font-mono text-[10px] uppercase tracking-wider text-muted">
                        {k}
                      </dt>
                      <dd className="font-semibold">{v}</dd>
                    </div>
                  ))}
                </dl>
                <Slab
                  className="mt-3 w-full"
                  tone="lagoon"
                  size="sm"
                  disabled={props.busy || !can}
                  onClick={() => props.act({ type: "buildShip", shipType: type.type })}
                >
                  {t().build}
                </Slab>
              </Panel>
            );
          })}
        </div>
      </section>
    </div>
  );
}

/* ───────────── Privateers ───────────── */

function RaidCard({ r, props }: { r: RaidView; props: GameProps }) {
  const back = props.now >= r.endAt;
  return (
    <Panel glow={r.outcome === "returned" ? undefined : r.beaten ? "vermilion" : "gold"}>
      <div className="flex items-center justify-between">
        <Label className={r.beaten ? "text-vermilion" : "text-gold"}>
          ☠ {portName(props, r.route)}
        </Label>
        <span className="label">
          {r.outcome === "returned" ? t().raidDone : back ? t().back : clock(r.endAt - props.now)}
        </span>
      </div>
      {r.hits.length === 0 ? (
        <p className="mt-2 text-sm text-muted">{t().noPrey}</p>
      ) : (
        <ul className="mt-2 space-y-1 text-sm">
          {r.hits.map((h) => (
            <li key={h.expeditionId} className={h.success ? "text-lagoon" : "text-vermilion"}>
              {h.success
                ? t().caught(props.people[h.victimId] ?? fr.game.anonymous)
                : t().missed(props.people[h.victimId] ?? fr.game.anonymous)}{" "}
              <span className="text-muted">({pct(h.chanceBps)})</span> <Goods goods={h.taken} />
            </li>
          ))}
        </ul>
      )}
      {r.outcome === "cruising" && back && (
        <Slab
          className="mt-3 w-full"
          disabled={props.busy}
          onClick={() => props.act({ type: "collectRaid", raidId: r.id })}
        >
          {t().unloadBooty}
        </Slab>
      )}
    </Panel>
  );
}

function Privateers({ props }: { props: GameProps }) {
  const rules = props.catalog.privateers;
  const ready = props.view.ships.filter((s) => s.status === "ready");
  const ports = props.catalog.ports.filter((p) => props.catalog.destinations[p.code]);
  const [route, setRoute] = useState(ports[0]?.code ?? "");
  const [ships, setShips] = useState<string[]>([]);
  const cruising = props.view.raids.filter((r) => r.outcome === "cruising").length;
  const attack = ships.reduce(
    (n, id) => n + (shipType(props, ready.find((s) => s.id === id)?.type ?? "")?.defense ?? 0),
    0,
  );
  const bread = Object.entries(rules.provisions).every(
    ([r, q]) => have(props.view, r) >= q * ships.length,
  );
  if (rules.maxActive === 0) return <p className="text-sm text-muted">{t().noPrivateers}</p>;
  return (
    <div className="space-y-5">
      <Panel>
        <Label className="text-gold">{t().letterTitle}</Label>
        <p className="mt-2 text-sm text-cream-dim">
          {t().letterHelp(
            rules.hours,
            pct(rules.shareBps),
            pct(rules.minChanceBps),
            pct(rules.maxChanceBps),
          )}
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted">
          <li>{t().ruleNewcomers(rules.newcomerDays)}</li>
          <li>{t().ruleWorth(pct(rules.minTargetWorthBps))}</li>
          <li>{t().ruleCooldown(rules.cooldownHours)}</li>
          <li>{t().ruleFail}</li>
        </ul>
      </Panel>

      {cruising < rules.maxActive && (
        <section className="space-y-3">
          <Label>{t().route}</Label>
          <select
            value={route}
            onChange={(e) => setRoute(e.target.value)}
            className="w-full rounded-xl bg-night-3 p-3 text-sm ring-1 ring-line"
          >
            {ports.map((p) => (
              <option key={p.code} value={p.code}>
                {p.name}
              </option>
            ))}
          </select>
          <Label>{t().corsairShips}</Label>
          {ready.length === 0 ? (
            <p className="text-sm text-muted">{t().needShips}</p>
          ) : (
            ready.map((s) => (
              <Switch
                key={s.id}
                checked={ships.includes(s.id)}
                onChange={(on) => setShips(on ? [...ships, s.id] : ships.filter((x) => x !== s.id))}
                label={shipType(props, s.type)?.name}
                hint={`${t().attack} ${shipType(props, s.type)?.defense}`}
              />
            ))
          )}
          <div className="flex items-center justify-between rounded-xl bg-night-3 p-3 text-sm ring-1 ring-line">
            <span>
              {t().attack} <strong>{attack}</strong>
            </span>
            <span>
              {t().letterFee} <strong>{d(rules.letterFee)}</strong>
            </span>
          </div>
          <Slab
            size="lg"
            tone="vermilion"
            className="w-full"
            disabled={
              props.busy ||
              ships.length === 0 ||
              !bread ||
              BigInt(props.view.cash) < BigInt(rules.letterFee)
            }
            onClick={async () => {
              if (await props.act({ type: "commissionPrivateers", route, ships })) setShips([]);
            }}
          >
            {t().commission}
          </Slab>
        </section>
      )}

      {props.view.raids.map((r) => (
        <RaidCard key={r.id} r={r} props={props} />
      ))}
    </div>
  );
}

/* ───────────── The Port tab ───────────── */

/**
 * The sea opens gradually to newcomers: the port with the "first convoy" mission, privateering
 * with the "first ship" one. A player already at sea is never locked out.
 */
export function portOpensAt(view: PlayerView): number {
  if (view.expeditions.length > 0 || view.ships.length > 0) return 0;
  return view.missions.find((m) => m.id === "first_convoy")?.opensAt ?? 0;
}

function corsairsOpenAt(view: PlayerView): number {
  if (view.raids.length > 0) return 0;
  return view.missions.find((m) => m.id === "first_ship")?.opensAt ?? 0;
}

export function Port(props: GameProps) {
  const opensAt = portOpensAt(props.view);
  if (opensAt > props.now) {
    return (
      <div className="space-y-6 text-center">
        <Galley className="mx-auto h-32 w-56 opacity-60" />
        <h1 className="font-display text-[2rem] font-extrabold uppercase leading-[1.05]">
          {fr.game.portLocked.title}
        </h1>
        <p className="text-sm text-cream-dim">
          {fr.game.portLocked.text(clock(opensAt - props.now))}
        </p>
        <Slab tone="ghost" className="w-full" onClick={() => props.goTo("comptoir")}>
          {fr.game.ledger.title}
        </Slab>
      </div>
    );
  }
  return <OpenPort {...props} />;
}

function OpenPort(props: GameProps) {
  const [tab, setTab] = useState<PortTab>(() => {
    const saved = store.get("portTab");
    return saved === "flotte" || saved === "corsaires" ? saved : "routes";
  });
  const active = props.view.expeditions.filter((e) => e.outcome === "pending");
  const past = props.view.expeditions.filter((e) => e.outcome !== "pending");
  const convoyCode = props.sheet?.startsWith("convoy:") ? props.sheet.slice(7) : null;
  const full = active.length >= props.catalog.maxGalleys;

  return (
    <div className="space-y-6">
      <header className="text-center">
        <Galley className="mx-auto h-28 w-48" sailing={active.length > 0} />
        <Label className="mt-2 text-lagoon">⚓ {t().kicker}</Label>
        <h1 className="mt-2 font-display text-[2rem] font-extrabold uppercase leading-[1.05]">
          {t().title}
        </h1>
        <p className="mt-2 text-sm text-cream-dim">{t().help}</p>
      </header>

      {active.map((e) => (
        <ActiveConvoy key={e.id} e={e} props={props} />
      ))}

      <Tabs<PortTab>
        value={tab}
        onChange={(v) => {
          store.set("portTab", v);
          setTab(v);
        }}
        options={[
          { value: "routes", label: t().tabs.routes },
          { value: "flotte", label: t().tabs.flotte },
          { value: "corsaires", label: t().tabs.corsaires },
        ]}
      />

      {tab === "routes" && (
        <>
          {full && <p className="text-center text-sm text-muted">{t().busy}</p>}
          <Routes props={props} />
        </>
      )}
      {tab === "flotte" && <Fleet props={props} />}
      {tab === "corsaires" &&
        (corsairsOpenAt(props.view) > props.now ? (
          <p className="text-center text-sm text-cream-dim">
            {fr.game.corsairsLocked(clock(corsairsOpenAt(props.view) - props.now))}
          </p>
        ) : (
          <Privateers props={props} />
        ))}

      {props.view.seaNews.length > 0 && (
        <section className="space-y-2">
          <Label>{t().seaNews}</Label>
          {props.view.seaNews.map((n) => (
            <p key={`${n.raider}-${n.at}`} className="border-b border-line/70 py-2 text-sm">
              ☠{" "}
              {t().news(
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
          <Label>{t().history}</Label>
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
                      ? t().lost
                      : t().returned(e.brought, props.names.resource(dest?.returns ?? ""))}
                  </span>
                  <span className="label">{d(e.cargoValue)}</span>
                </div>
                {e.boarding && <Boarding e={e} props={props} />}
              </div>
            );
          })}
        </section>
      )}

      <Sheet open={!!convoyCode && !full} onClose={() => props.setSheet(null)}>
        {convoyCode && <ConvoySheet key={convoyCode} code={convoyCode} props={props} />}
      </Sheet>
    </div>
  );
}
