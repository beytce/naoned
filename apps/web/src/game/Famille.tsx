import {
  type ReactNode,
  type RefObject,
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { ApiError } from "../api.js";
import { FAMILY_LOOK, FamilyCrest, MILITIA_HEX, familyHex } from "../art/familyCrest.js";
import { P } from "../art/palette.js";
import { VenetoTerrain } from "../art/veneto.js";
import { WorkGlyph, WorkShape } from "../art/workIcon.js";
import { territories } from "../campaign3d/territory.js";
import { fr } from "../i18n.js";
import { Badge, Big, Label, Panel, Qty, Sheet, Slab, Stat, clock } from "../ui.js";
import { CarrierDrag } from "./Cargo.js";
import type { GameProps } from "./Game.js";
import { gameApi } from "./api.js";
import { d } from "./format.js";
import { scenePhase, use3d } from "./scene3d.js";
import { store } from "./store.js";

const Terraferma3D = lazy(() => import("../campaign3d/Terraferma3D.js"));
import type {
  DecreePick,
  DecreeRules,
  FamiliesView,
  FamilyMessage,
  FamilyRules,
  LandView,
  MarchView,
  WorkRules,
} from "./types.js";

const t = () => fr.game.families;
const pct = (bps: number) => `${Math.round(bps / 100)} %`;

export function familyName(code: string | null): string {
  if (!code) return t().militia;
  return t().names[code] ?? code;
}

export function landName(code: string): string {
  return t().lands[code] ?? code;
}

function personName(props: GameProps, id: string | null): string {
  if (!id) return familyName("milan");
  return props.people[id] ?? fr.game.anonymous;
}

/** Price of `count` more lances after `already` today; null beyond the day's limit. */
function hireCost(rules: FamilyRules, already: number, count: number): bigint | null {
  let skip = already;
  let left = count;
  let cost = 0n;
  for (const tier of rules.campaign?.hire ?? []) {
    const room = Math.max(0, tier.count - skip);
    skip = Math.max(0, skip - tier.count);
    const n = Math.min(room, left);
    cost += BigInt(tier.price) * BigInt(n);
    left -= n;
  }
  return left > 0 ? null : cost;
}

/** What a decree does, with its target and the world's numbers. */
export function decreeEffect(
  props: GameProps,
  rules: DecreeRules,
  pick: DecreePick,
  cities: string[] = [],
): string {
  const e = t().decrees.effects;
  const good = (r?: string) => (r ? props.names.resource(r).toLowerCase() : "");
  switch (pick.code) {
    case "fondaco":
      return e.fondaco(pct(rules.fondaco.taxBps), pct(rules.fondaco.quotaBps));
    case "gabelle":
      return e.gabelle(good(pick.target), pct(rules.gabelle.extraTaxBps));
    case "faveur":
      return e.faveur(
        props.names.city(pick.target ?? ""),
        pct(rules.faveur.premiumBps),
        rules.faveur.reservedMinutes,
      );
    case "peage":
      return e.peage(pct(rules.peage.tollBps), cities.map((c) => props.names.city(c)).join(", "));
    case "course":
      return e.course;
    case "levant":
      return e.levant(pct(rules.levant.memberDiscountBps), pct(rules.levant.othersSurchargeBps));
    case "calmiere":
      return e.calmiere(good(pick.target), pct(rules.calmiere.capBps));
    case "franchise":
      return e.franchise(pct(rules.franchise.upkeepDiscountBps));
    default:
      return "";
  }
}

function decreeTitle(props: GameProps, pick: DecreePick): string {
  const name = t().decrees.names[pick.code] ?? pick.code;
  if (!pick.target) return name;
  const target =
    pick.code === "faveur"
      ? props.names.city(pick.target)
      : props.names.resource(pick.target).toLowerCase();
  return `${name} · ${target}`;
}

/**
 * The decrees of the week, where they bite (Market, Roads, Port): who imposed them, and whether
 * they play for or against the merchant.
 */
export function DecreeBanner({ props }: { props: GameProps }) {
  const f = props.view.families;
  const rules = props.catalog.families?.decrees;
  if (!f?.decrees || !rules || f.decrees.items.length === 0) return null;
  const ours = f.mine === f.decrees.family;
  return (
    <Panel glow={ours ? "lagoon" : "vermilion"}>
      <div className="flex items-center gap-3">
        <FamilyCrest family={f.decrees.family} size={36} />
        <div className="min-w-0 flex-1">
          <Label className={ours ? "text-lagoon" : "text-vermilion"}>{t().decrees.title}</Label>
          <p className="text-xs text-cream-dim">
            {t().decrees.by(familyName(f.decrees.family))} ·{" "}
            {ours ? t().decrees.mine : t().decrees.theirs}
          </p>
        </div>
      </div>
      <ul className="mt-2 space-y-1.5">
        {f.decrees.items.map((pick) => (
          <li key={pick.code} className="text-sm">
            <span className="font-semibold">{decreeTitle(props, pick)}</span>
            <span className="text-cream-dim">
              {" "}
              — {decreeEffect(props, rules, pick, f.decrees?.cities)}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/** The four families' glory this week, side by side. */
function Standings({ f }: { f: FamiliesView }) {
  const top = Math.max(1, ...f.families.map((x) => x.glory));
  const ranked = [...f.families].sort((a, b) => b.glory - a.glory);
  return (
    <ul className="space-y-2">
      {ranked.map((x) => (
        <li key={x.code} className="flex items-center gap-2">
          <FamilyCrest family={x.code} size={26} />
          <span
            className={`w-24 truncate text-sm ${x.code === f.mine ? "font-bold text-gold" : ""}`}
          >
            {familyName(x.code)}
          </span>
          <span className="relative h-3 flex-1 overflow-hidden rounded-full bg-night">
            <span
              className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
              style={{ width: `${(x.glory / top) * 100}%`, background: familyHex(x.code) }}
            />
          </span>
          <Big className="w-12 text-right text-sm">{x.glory}</Big>
        </li>
      ))}
    </ul>
  );
}

/** Each holder's colour on the map: the four families, Milan, the militia (""). */
export function holderColors(): Record<string, string> {
  return {
    ...Object.fromEntries(Object.entries(FAMILY_LOOK).map(([k, v]) => [k, v.hex])),
    "": MILITIA_HEX,
  };
}

/** Where a column comes from: the nearest land of its family next to its target, else its seat. */
export function marchOrigin(f: FamiliesView, m: MarchView): string | null {
  if (m.from) return m.from;
  const target = f.lands.find((l) => l.code === m.target);
  if (!target) return null;
  const near = f.lands
    .filter((l) => l.holder === m.family && target.neighbors.includes(l.code))
    .sort(
      (a, b) =>
        Math.hypot(a.x - target.x, a.y - target.y) - Math.hypot(b.x - target.x, b.y - target.y),
    )[0];
  if (near) return near.code;
  return f.lands.find((l) => l.seat === m.family)?.code ?? null;
}

/** What a drop of the seat's lances on a land would do (the bubble of the drag). */
function dropInfo(f: FamiliesView, code: string) {
  const land = f.lands.find((l) => l.code === code);
  if (!land) return { ok: false, title: "", sub: "" };
  const name = landName(code);
  if (land.seat) return { ok: false, title: name, sub: t().land.seat(familyName(land.seat)) };
  if (!land.open) return { ok: false, title: name, sub: t().land.notAdjacent };
  const ours = land.holder !== null && land.holder === f.mine;
  const needed = land.defense + 1;
  return {
    ok: true,
    title: ours ? t().drag.reinforce(name) : t().drag.attack(name),
    sub: ours
      ? t().drag.reinforceSub(land.minutes ?? 0, land.garrison)
      : t().drag.attackSub(land.minutes ?? 0, needed, f.me?.reserve ?? 0),
  };
}

/** The lances of the seat, as a token to drag. */
function LancesToken({ n }: { n: number }) {
  return (
    <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-night/85 ring-[3px] ring-gold shadow-[0_0_18px_rgb(var(--gold)/0.6)]">
      <span className="text-xl" aria-hidden="true">
        ⚔
      </span>
      <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gold px-1.5 font-mono text-[9px] font-bold text-night">
        {n}
      </span>
    </span>
  );
}

/**
 * The Terraferma as a map: each land's ground in its holder's colour (the drawn map of the roads
 * underneath, Lombardy to the west), borders where holders meet, the lands and their garrisons,
 * the marches. On the 3D model when the device can draw it.
 */
function CampaignMap({
  f,
  props,
  onPick,
  className = "h-[62svh] min-h-[400px]",
  covered = false,
}: {
  f: FamiliesView;
  props: GameProps;
  onPick: (land: string) => void;
  className?: string;
  /** Something lies over the map (the drawer): no lances to drag then. */
  covered?: boolean;
}) {
  const colors = holderColors();
  const seat = f.lands.find((l) => l.seat === f.mine)?.code ?? null;
  const reserve = f.me?.reserve ?? 0;
  const carrier =
    f.mine && seat && reserve > 0 && !f.closed && !covered
      ? {
          from: seat,
          token: <LancesToken n={reserve} />,
          info: (code: string) => dropInfo(f, code),
          onDrop: (code: string) => onPick(code),
          onTap: () => {
            if ((f.me?.levy ?? 0) > 0) void props.act({ type: "collectLevy" });
          },
        }
      : null;
  const marches = f.marches.map((m) => {
    const target = f.lands.find((l) => l.code === m.target);
    return {
      ...m,
      from: marchOrigin(f, m),
      hostile: m.family !== f.mine && target?.holder === f.mine && f.mine !== null,
      label: `⚔ ${m.lances} · ${clock(m.arriveAt - props.now)}`,
    };
  });
  if (use3d) {
    return (
      <Suspense fallback={<div className={`w-full animate-pulse bg-night-3 ${className}`} />}>
        <Terraferma3D
          phase={scenePhase(props.now)}
          still={
            typeof window !== "undefined" &&
            window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
          }
          clockOffset={props.now - Date.now()}
          className={className}
          title={t().map}
          colors={colors}
          focus={seat}
          lands={f.lands.map((l) => ({
            ...l,
            name: landName(l.code),
            city: l.city ?? null,
            seat: l.seat ?? null,
            threatened: marches.some((m) => m.target === l.code && m.hostile),
            work: l.work ? { kind: l.work.kind, ready: l.work.ready, family: l.work.family } : null,
          }))}
          marches={marches}
          onLand={onPick}
          carrier={carrier}
        />
      </Suspense>
    );
  }
  return (
    <DrawnMap
      f={f}
      colors={colors}
      marches={marches}
      carrier={carrier}
      onPick={onPick}
      className={className}
    />
  );
}

/** The drawn map (no 3D): the Veneto of the roads, the territories over it. */
function DrawnMap({
  f,
  colors,
  marches,
  carrier,
  onPick,
  className,
}: {
  f: FamiliesView;
  className: string;
  colors: Record<string, string>;
  marches: (MarchView & { from: string | null; hostile: boolean; label: string })[];
  carrier: {
    from: string;
    token: ReactNode;
    info: (code: string) => { ok: boolean; title: string; sub: string };
    onDrop: (code: string) => void;
    onTap: () => void;
  } | null;
  onPick: (land: string) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const xs = f.lands.map((l) => l.x);
  const ys = f.lands.map((l) => l.y);
  const pad = 40;
  const vb = {
    x: Math.min(...xs) - pad,
    y: Math.min(...ys) - pad,
    w: Math.max(...xs) - Math.min(...xs) + 2 * pad,
    h: Math.max(...ys) - Math.min(...ys) + 2 * pad,
  };
  const t0 = territories(
    f.lands.map((l) => ({ code: l.code, x: l.x, y: l.y, holder: l.holder })),
    46,
  );
  const at = (x: number, y: number) => {
    const r = svg.current?.getBoundingClientRect();
    const b = box.current?.getBoundingClientRect();
    if (!r || !b) return null;
    // The drawing is fitted whole in its box, centred (letterboxed on the long side).
    const scale = Math.min(r.width / vb.w, r.height / vb.h);
    const ox = (r.width - vb.w * scale) / 2;
    const oy = (r.height - vb.h * scale) / 2;
    return {
      x: r.left - b.left + ox + (x - vb.x) * scale,
      y: r.top - b.top + oy + (y - vb.y) * scale,
    };
  };
  const origin = () => {
    const l = f.lands.find((x) => x.code === carrier?.from);
    return l ? at(l.x, l.y) : null;
  };
  const spots = () =>
    f.lands.flatMap((l) => {
      const p = at(l.x, l.y);
      return p ? [{ code: l.code, ...p }] : [];
    });
  const byCode = new Map(f.lands.map((l) => [l.code, l]));
  return (
    <div ref={box} className={`relative bg-[#1B2E26] ${className}`}>
      <svg
        ref={svg}
        viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
        className="block h-full w-full select-none"
        role="img"
        aria-label={t().map}
      >
        <rect x={vb.x} y={vb.y} width={vb.w} height={vb.h} fill="#1B2E26" />
        <VenetoTerrain />
        {f.lands.map((l) => {
          const cell = t0.cells[l.code] ?? [];
          return (
            <polygon
              key={`cell-${l.code}`}
              points={cell.map(([x, y]) => `${x},${y}`).join(" ")}
              fill={colors[l.holder ?? ""] ?? MILITIA_HEX}
              fillOpacity={l.holder ? 0.42 : 0.14}
            />
          );
        })}
        {t0.borders
          .filter((e) => e.holder)
          .map((e) => (
            <line
              key={`${e.code}-${e.from[0]}-${e.from[1]}`}
              x1={e.from[0]}
              y1={e.from[1]}
              x2={e.to[0]}
              y2={e.to[1]}
              stroke={colors[e.holder ?? ""] ?? MILITIA_HEX}
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          ))}
        {marches.map((m) => {
          const a = m.from ? byCode.get(m.from) : undefined;
          const b = byCode.get(m.target);
          if (!a || !b) return null;
          return (
            <line
              key={m.id}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={m.hostile ? P.vermilion : (colors[m.family] ?? P.cream)}
              strokeWidth="2.5"
              strokeDasharray="3 4"
              className="map-march"
            />
          );
        })}
        {f.lands.map((l) => {
          const r = l.seat || l.kind === "fortress" ? 9 : l.city ? 8 : 6.5;
          return (
            // biome-ignore lint/a11y/useKeyWithClickEvents: the lands within reach are listed below the map
            <g
              key={l.code}
              transform={`translate(${l.x} ${l.y})`}
              onClick={() => onPick(l.code)}
              className="cursor-pointer"
            >
              {l.open && (
                <circle
                  r={r + 3}
                  fill="none"
                  stroke={P.gold}
                  strokeWidth="1.2"
                  strokeDasharray="2 2"
                />
              )}
              <circle
                r={r}
                fill={colors[l.holder ?? ""] ?? MILITIA_HEX}
                stroke={l.mine > 0 ? P.gold : P.night}
                strokeWidth={l.mine > 0 ? 2 : 1.4}
              />
              <text
                y="3.2"
                textAnchor="middle"
                fontSize="8.5"
                fontWeight="800"
                fill={P.cream}
                style={{ paintOrder: "stroke", stroke: P.night, strokeWidth: 2 }}
              >
                {l.seat ? "⚑" : l.garrison}
              </text>
              {l.work && (
                <g transform={`translate(${r - 1} ${-r - 9}) scale(0.6)`}>
                  <WorkShape
                    kind={l.work.kind}
                    fill={l.work.ready ? (colors[l.work.family] ?? P.cream) : "none"}
                    stroke={l.work.ready ? P.night : (colors[l.work.family] ?? P.cream)}
                    dashed={!l.work.ready}
                  />
                </g>
              )}
              <text
                y={r + 10}
                textAnchor="middle"
                fontSize="8"
                fontWeight="700"
                fill={l.city ? P.goldSoft : P.cream}
                style={{ paintOrder: "stroke", stroke: P.night, strokeWidth: 2.5 }}
              >
                {landName(l.code)}
              </text>
            </g>
          );
        })}
      </svg>
      {carrier && (
        <CarrierDrag
          origin={origin}
          spots={spots}
          info={carrier.info}
          onDrop={carrier.onDrop}
          onTap={carrier.onTap}
          token={carrier.token}
        />
      )}
    </div>
  );
}

/** One land: what holds it, what taking it needs, and the march to send. */
function LandSheet({
  land,
  f,
  props,
  onClose,
}: {
  land: LandView;
  f: FamiliesView;
  props: GameProps;
  onClose: () => void;
}) {
  const reserve = f.me?.reserve ?? 0;
  const ours = land.holder !== null && land.holder === f.mine;
  const needed = land.defense;
  const [lances, setLances] = useState(() =>
    Math.max(1, Math.min(reserve, ours ? Math.ceil(reserve / 2) : needed + 1)),
  );
  const n = Math.max(1, Math.min(lances, Math.max(1, reserve)));
  const marches = f.marches.filter((m) => m.target === land.code);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        {land.holder ? <FamilyCrest family={land.holder} size={48} /> : null}
        <div className="min-w-0">
          <p className="label text-lagoon">{t().kinds[land.kind] ?? land.kind}</p>
          <h3 className="font-display text-2xl font-extrabold uppercase">{landName(land.code)}</h3>
          <p className="text-xs text-cream-dim">
            {t().land.heldBy(
              land.holder === null || land.holder === "milan"
                ? familyName(land.holder)
                : `les ${familyName(land.holder)}`,
            )}
          </p>
        </div>
      </div>
      {land.seat ? (
        <p className="text-sm text-cream-dim">{t().land.seat(familyName(land.seat))}</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <Stat label={t().land.garrison} value={land.garrison} />
          <Stat label={t().land.defense} value={t().land.factor(land.defenseBps)} />
          <Stat label={t().glory} value={t().land.glory(land.glory)} tone="gold" />
          {land.mine > 0 && <Stat label={t().land.mine} value={land.mine} tone="lagoon" />}
        </div>
      )}
      {land.city && <p className="text-xs text-cream-dim">{t().land.city}</p>}
      {!land.seat && <LandWork land={land} f={f} props={props} />}
      {marches.map((m) => (
        <p
          key={m.id}
          className={`rounded-xl p-2 text-sm ring-1 ${m.family === f.mine ? "bg-lagoon/10 ring-lagoon/50" : "bg-vermilion/10 ring-vermilion/60"}`}
        >
          ⚔ {t().marchLine(familyName(m.family), m.lances, landName(m.target))} ·{" "}
          {t().arrives(clock(m.arriveAt - props.now))}
        </p>
      ))}
      {!land.seat && !ours && <p className="text-sm">{t().land.needed(needed)}</p>}
      {!land.seat &&
        (land.open ? (
          reserve > 0 ? (
            <div className="space-y-2">
              <Qty value={n} max={reserve} onChange={setLances} />
              <Slab
                className="w-full"
                tone={ours ? "lagoon" : undefined}
                disabled={props.busy}
                onClick={async () => {
                  if (await props.act({ type: "sendMarch", land: land.code, lances: n })) onClose();
                }}
              >
                {ours ? t().land.reinforce(n) : t().land.attack(n)}
              </Slab>
              {land.minutes !== null && (
                <p className="label text-center">
                  {t().land.march(land.minutes)}
                  {land.from ? ` · ${t().works.from(landName(land.from))}` : ""}
                  {!f.open ? ` · ${t().night(clock(f.nextOpenAt - props.now))}` : ""}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-cream-dim">{t().land.noLances}</p>
          )
        ) : (
          f.mine && <p className="text-sm text-cream-dim">{t().land.notAdjacent}</p>
        ))}
    </div>
  );
}

/** What a work does, in the world's numbers. */
function workEffect(rules: WorkRules, kind: string): string {
  const k = rules.kinds[kind];
  if (!k) return "";
  const w = t().works;
  return [
    k.defenseBonusBps > 0 ? w.defense(pct(k.defenseBonusBps)) : "",
    k.gloryBonusBps > 0 ? w.glory(pct(k.gloryBonusBps)) : "",
    k.staging ? w.staging : "",
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * A land's work: the one standing (finished or being built, the family's or an enemy's), or the
 * works the merchant may build there when the family holds it.
 */
function LandWork({ land, f, props }: { land: LandView; f: FamiliesView; props: GameProps }) {
  const rules = props.catalog.families?.campaign?.works;
  if (!rules) return null;
  const w = t().works;
  const ours = land.holder !== null && land.holder === f.mine;
  if (land.work) {
    const theirs = land.work.family !== f.mine;
    return (
      <div
        className={`flex items-start gap-3 rounded-2xl p-3 ring-1 ring-inset ${theirs ? "bg-vermilion/10 ring-vermilion/50" : "bg-night-3 ring-line/70"}`}
      >
        <span className="mt-0.5 shrink-0">
          <WorkGlyph
            kind={land.work.kind}
            color={familyHex(land.work.family)}
            ready={land.work.ready}
            size={34}
          />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-extrabold uppercase leading-tight">
            {theirs
              ? w.enemy(w.names[land.work.kind] ?? land.work.kind, familyName(land.work.family))
              : (w.names[land.work.kind] ?? land.work.kind)}
            <span className="label ml-2 text-cream-dim">{w.kinds[land.work.kind]}</span>
          </p>
          <p className="text-sm text-cream-dim">{workEffect(rules, land.work.kind)}</p>
          <p className={`label mt-1 ${land.work.ready ? "text-lagoon" : "text-gold"}`}>
            {land.work.ready ? w.ready : w.building(clock(land.work.readyAt - props.now))}
            {!theirs ? ` · ${w.by(personName(props, land.work.by))}` : ""}
          </p>
          {theirs && <p className="mt-1 text-xs text-cream-dim">{w.raze(rules.razeMerit)}</p>}
        </div>
      </div>
    );
  }
  if (!ours || f.closed) return null;
  const me = f.me;
  const full = !me || me.works >= me.worksAllowed;
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <Label className="text-gold">{w.title}</Label>
        {me && <span className="label">{w.count(me.works, me.worksAllowed)}</span>}
      </div>
      {full ? (
        <p className="text-sm text-cream-dim">{w.full(rules.perMembers)}</p>
      ) : (
        <>
          <ul className="grid gap-2">
            {Object.entries(rules.kinds).map(([kind, k]) => {
              const price = BigInt(k.price);
              const short = BigInt(props.view.cash) < price;
              return (
                <li
                  key={kind}
                  className="flex items-center gap-3 rounded-2xl bg-night-3 p-2.5 ring-1 ring-inset ring-line/70"
                >
                  <WorkGlyph kind={kind} color={familyHex(f.mine)} size={30} />
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-base font-extrabold uppercase leading-tight">
                      {w.names[kind] ?? kind}
                    </p>
                    <p className="label text-cream-dim">{w.kinds[kind]}</p>
                    <p className="text-xs text-cream-dim">{workEffect(rules, kind)}</p>
                  </div>
                  <Slab
                    size="sm"
                    disabled={props.busy || short}
                    onClick={() => props.act({ type: "buildWork", land: land.code, kind })}
                  >
                    {w.build(d(price))}
                  </Slab>
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-cream-dim">{w.hours(rules.buildMinutes)}</p>
        </>
      )}
    </div>
  );
}

/** The merchant's lances: the levy to collect, lances to engage, those about to leave. */
function Lances({ f, props }: { f: FamiliesView; props: GameProps }) {
  const rules = props.catalog.families;
  const me = f.me;
  const room = me ? Math.max(0, me.hireLimit - me.hired) : 0;
  const [count, setCount] = useState(Math.min(10, Math.max(1, room)));
  if (!me || !rules?.campaign) return null;
  const n = Math.max(1, Math.min(count, Math.max(1, room)));
  const cost = hireCost(rules, me.hired, n);
  return (
    <div>
      <Label className="text-lagoon">{t().lances}</Label>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Stat label={t().reserve} value={me.reserve} tone="lagoon" />
        <Stat label={t().levyWaiting} value={`${me.levy} / ${me.levyMax}`} />
      </div>
      <Slab
        className="mt-3 w-full"
        tone="lagoon"
        disabled={props.busy || me.levy <= 0}
        onClick={() => props.act({ type: "collectLevy" })}
      >
        {t().collect(me.levy)}
      </Slab>
      <p className="mt-1 text-xs text-cream-dim">
        {t().levyHelp(rules.campaign.levy.perHour, rules.campaign.levy.max)}
      </p>
      <div className="mt-4">
        <Label>{t().hire}</Label>
        <p className="mt-1 text-xs text-cream-dim">{t().hireHelp(rules.campaign.lanceHours)}</p>
        <p className="label mt-1">{t().hiredToday(me.hired, me.hireLimit)}</p>
        {room > 0 ? (
          <div className="mt-2 space-y-2">
            <Qty value={n} max={room} onChange={setCount} />
            <Slab
              className="w-full"
              disabled={props.busy || cost === null || BigInt(props.view.cash) < (cost ?? 0n)}
              onClick={() => props.act({ type: "hireLances", count: n })}
            >
              {t().hireGo(n, d(cost ?? 0n))}
            </Slab>
          </div>
        ) : (
          <p className="mt-2 text-sm text-cream-dim">{t().hireDone}</p>
        )}
      </div>
      {me.leaving.length > 0 && (
        <ul className="mt-3 space-y-0.5">
          {me.leaving.slice(0, 3).map((l) => (
            <li key={l.expiresAt} className="label">
              {t().leaving(l.count, clock(l.expiresAt - props.now))}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Marches under way: the family's assaults to join, the enemy's to see coming. */
function Marches({ f, props }: { f: FamiliesView; props: GameProps }) {
  const [joining, setJoining] = useState<string | null>(null);
  const [count, setCount] = useState(1);
  const reserve = f.me?.reserve ?? 0;
  const holder = (code: string) => f.lands.find((l) => l.code === code)?.holder ?? null;
  return (
    <Panel>
      <Label>{t().marches}</Label>
      {f.marches.length === 0 && <p className="mt-2 text-sm text-cream-dim">{t().noMarch}</p>}
      <ul className="mt-2 space-y-2">
        {f.marches.map((m) => {
          const ours = m.family === f.mine;
          const assault = ours && holder(m.target) !== f.mine;
          const threat = !ours && holder(m.target) === f.mine;
          return (
            <li
              key={m.id}
              className={`rounded-xl p-2.5 text-sm ring-1 ring-inset ${threat ? "bg-vermilion/10 ring-vermilion/60" : ours ? "bg-lagoon/10 ring-lagoon/40" : "bg-night-2 ring-line/70"}`}
            >
              <div className="flex items-center gap-2">
                <FamilyCrest family={m.family} size={22} />
                <span className="min-w-0 flex-1">
                  {t().marchLine(
                    m.by ? personName(props, m.by) : familyName(m.family),
                    m.lances,
                    landName(m.target),
                  )}
                  {m.mine > 0 ? ` (${t().yourLances(m.mine)})` : ""}
                </span>
                <span className="label shrink-0">{clock(m.arriveAt - props.now)}</span>
              </div>
              {assault &&
                reserve > 0 &&
                (joining === m.id ? (
                  <div className="mt-2 space-y-2">
                    <Qty value={Math.min(count, reserve)} max={reserve} onChange={setCount} />
                    <Slab
                      size="sm"
                      className="w-full"
                      disabled={props.busy}
                      onClick={async () => {
                        const n = Math.max(1, Math.min(count, reserve));
                        if (await props.act({ type: "joinMarch", marchId: m.id, lances: n }))
                          setJoining(null);
                      }}
                    >
                      {t().join(Math.max(1, Math.min(count, reserve)))}
                    </Slab>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="label mt-1 text-gold"
                    onClick={() => {
                      setCount(reserve);
                      setJoining(m.id);
                    }}
                  >
                    + {t().join(reserve)}
                  </button>
                ))}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

/** The family's programme: the decrees it imposes if it wins, and the merchant's vote. */
function Programme({ f, props }: { f: FamiliesView; props: GameProps }) {
  const rules = props.catalog.families?.decrees;
  const [picks, setPicks] = useState<DecreePick[]>(() => f.me?.ballot ?? []);
  if (!rules || !f.mine) return null;
  const mine = f.families.find((x) => x.code === f.mine);
  const resources = props.catalog.resources.map((r) => r.code);
  const cities = props.catalog.cities.filter((c) => c.buys.length > 0).map((c) => c.code);
  const targetsOf = (code: string) =>
    code === "faveur" ? cities : code === "gabelle" || code === "calmiere" ? resources : null;
  const toggle = (code: string) => {
    const on = picks.find((p) => p.code === code);
    if (on) setPicks(picks.filter((p) => p.code !== code));
    else if (picks.length < rules.perWinner) {
      const targets = targetsOf(code);
      setPicks([...picks, targets ? { code, target: targets[0] } : { code }]);
    }
  };
  return (
    <Panel glow="gold">
      <Label className="text-gold">{t().programme.title}</Label>
      <p className="mt-1 text-xs text-cream-dim">
        {t().programme.help(rules.perWinner, pct(rules.maxVoteBps))}
      </p>
      {mine && (
        <div className="mt-3 rounded-xl bg-night-2 p-3 ring-1 ring-inset ring-line/70">
          <p className="label">{t().programme.current}</p>
          <ul className="mt-1 space-y-1">
            {mine.programme.map((p) => (
              <li key={p.code} className="text-sm">
                <span className="font-semibold">{decreeTitle(props, p)}</span>
                <span className="text-cream-dim"> — {decreeEffect(props, rules, p)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="label mt-3">{t().programme.pick(rules.perWinner)}</p>
      <ul className="mt-2 space-y-1.5">
        {rules.catalog.map((code) => {
          const on = picks.find((p) => p.code === code);
          const targets = targetsOf(code);
          return (
            <li key={code}>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={!!on}
                  onChange={() => toggle(code)}
                  disabled={!on && picks.length >= rules.perWinner}
                />
                <span className="min-w-0 flex-1">
                  <span className="font-semibold">{t().decrees.names[code] ?? code}</span>
                  {on && targets && (
                    <select
                      aria-label={t().programme.target}
                      className="ml-2 rounded-lg border border-line bg-night-2 px-2 py-0.5 text-xs"
                      value={on.target}
                      onChange={(e) =>
                        setPicks(
                          picks.map((p) =>
                            p.code === code ? { code, target: e.target.value } : p,
                          ),
                        )
                      }
                    >
                      {targets.map((x) => (
                        <option key={x} value={x}>
                          {code === "faveur" ? props.names.city(x) : props.names.resource(x)}
                        </option>
                      ))}
                    </select>
                  )}
                  <span className="block text-xs text-cream-dim">
                    {decreeEffect(props, rules, on ?? { code, target: targets?.[0] })}
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      <Slab
        className="mt-3 w-full"
        disabled={props.busy || picks.length === 0}
        onClick={() => props.act({ type: "voteProgramme", picks })}
      >
        {t().programme.vote}
      </Slab>
      <details className="mt-3">
        <summary className="label cursor-pointer">{t().programme.others}</summary>
        <ul className="mt-2 space-y-2">
          {f.families
            .filter((x) => x.code !== f.mine)
            .map((x) => (
              <li key={x.code} className="flex items-start gap-2 text-sm">
                <FamilyCrest family={x.code} size={22} />
                <span>
                  <span className="font-semibold">{familyName(x.code)}</span> :{" "}
                  {x.programme.map((p) => decreeTitle(props, p)).join(", ")}
                </span>
              </li>
            ))}
        </ul>
      </details>
    </Panel>
  );
}

/** No family yet: the four to choose from (and the map to watch). */
function Choose({ f, props }: { f: FamiliesView; props: GameProps }) {
  const [chosen, setChosen] = useState<string | null>(null);
  const open = f.opensAt <= props.now;
  const smallest = [...f.families].sort((a, b) => a.active - b.active)[0]?.code;
  return (
    <div className="space-y-4">
      {!open && <p className="text-sm text-lagoon">{t().opensIn(clock(f.opensAt - props.now))}</p>}
      <Panel glow="gold">
        <Label className="text-gold">{t().chooseTitle}</Label>
        <p className="mt-1 text-sm text-cream-dim">{t().chooseHelp}</p>
      </Panel>
      <div className="grid gap-3 sm:grid-cols-2">
        {f.families.map((x) => (
          <Panel key={x.code} glow={x.code === smallest ? "lagoon" : undefined}>
            <div className="flex items-center gap-3">
              <FamilyCrest family={x.code} size={52} />
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-display text-xl font-extrabold uppercase">
                  {familyName(x.code)}
                </h3>
                <p className="text-xs text-cream-dim">{t().members(x.members, x.active)}</p>
                <p className="text-xs text-cream-dim">
                  {t().glory} {x.glory} · {t().landsHeld(x.lands)} · {t().levy(x.levyBps)}
                </p>
              </div>
            </div>
            {x.code === smallest && (
              <p className="mt-2">
                <Badge tone="lagoon">{t().smallest}</Badge>
              </p>
            )}
            {chosen === x.code ? (
              <div className="mt-3 flex gap-2">
                <Slab
                  size="sm"
                  className="flex-1"
                  disabled={!open || props.busy}
                  onClick={() => props.act({ type: "joinFamily", family: x.code })}
                >
                  {t().confirm(familyName(x.code))}
                </Slab>
                <Slab tone="ghost" size="sm" onClick={() => setChosen(null)}>
                  {t().cancel}
                </Slab>
              </div>
            ) : (
              <Slab
                className="mt-3 w-full"
                size="sm"
                disabled={!open}
                onClick={() => setChosen(x.code)}
              >
                {t().pledge}
              </Slab>
            )}
          </Panel>
        ))}
      </div>
    </div>
  );
}

const THREAD_POLL_MS = 15_000;

/** The family's thread: members plan their assaults, report what should not be there. */
function Thread() {
  const [messages, setMessages] = useState<FamilyMessage[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [reported, setReported] = useState<Set<string>>(new Set());
  const show = useCallback((list: FamilyMessage[]) => {
    setMessages(list);
    const last = list.at(-1);
    if (last) store.set("familySeen", String(last.at));
  }, []);
  useEffect(() => {
    let alive = true;
    const load = () =>
      gameApi
        .familyThread()
        .then((r) => alive && show(r.messages))
        .catch(() => {});
    load();
    const timer = setInterval(load, THREAD_POLL_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [show]);
  const send = async () => {
    setSending(true);
    setError(null);
    try {
      show((await gameApi.sayToFamily(text)).messages);
      setText("");
    } catch (e) {
      const errors = t().thread.errors;
      setError(errors[e instanceof ApiError ? e.code : ""] ?? errors.other ?? null);
    } finally {
      setSending(false);
    }
  };
  return (
    <Panel>
      <Label className="text-lagoon">{t().thread.title}</Label>
      <p className="mt-1 text-xs text-cream-dim">{t().thread.help}</p>
      <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto">
        {messages.length === 0 && <li className="text-sm text-cream-dim">{t().thread.empty}</li>}
        {messages.map((m) => (
          <li
            key={m.id}
            className={`rounded-xl px-3 py-2 text-sm ${m.mine ? "ml-6 bg-lagoon/15" : "mr-6 bg-night-3"}`}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="label text-gold">{m.mine ? t().thread.me : (m.pseudo ?? "—")}</span>
              <span className="label">{clockTime(m.at)}</span>
            </div>
            <p className="mt-1 whitespace-pre-wrap break-words">{m.body}</p>
            {!m.mine && (
              <button
                type="button"
                disabled={reported.has(m.id)}
                className="label mt-1 text-cream-dim disabled:opacity-50"
                onClick={async () => {
                  await gameApi.reportMessage(m.id).catch(() => {});
                  setReported(new Set([...reported, m.id]));
                }}
              >
                {reported.has(m.id) ? t().thread.reported : t().thread.report}
              </button>
            )}
          </li>
        ))}
      </ul>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) void send();
        }}
      >
        <input
          value={text}
          maxLength={280}
          onChange={(e) => setText(e.target.value)}
          placeholder={t().thread.placeholder}
          aria-label={t().thread.placeholder}
          className="min-w-0 flex-1 rounded-xl border border-line bg-night-2 px-3 py-2.5 text-sm"
        />
        <Slab size="sm" disabled={sending || !text.trim()} onClick={() => void send()}>
          {t().thread.send}
        </Slab>
      </form>
      {error && <p className="mt-2 text-sm text-vermilion">{error}</p>}
    </Panel>
  );
}

/** "14:05", Paris time like the rest of the game's clock. */
function clockTime(at: number): string {
  return new Date(at).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  });
}

/** The family's members by merit, the captain first. */
function Roll({ f, props }: { f: FamiliesView; props: GameProps }) {
  const per = props.catalog.families?.campaign?.garrisonLancesPerPoint ?? 10;
  return (
    <Panel>
      <Label>{t().roll}</Label>
      <p className="mt-1 text-xs text-cream-dim">{t().meritHelp(per)}</p>
      <ul className="mt-3 space-y-1.5">
        {f.members.map((m, i) => (
          <li key={m.playerId} className="flex items-baseline justify-between gap-2 text-sm">
            <span className={m.me ? "font-semibold text-gold" : ""}>
              {m.me ? t().you : personName(props, m.playerId)}{" "}
              {props.bots.has(m.playerId) && <Badge tone="ghost">{fr.game.npc}</Badge>}
              {i === 0 && m.merit > 0 && <Badge tone="ghost">{t().captain}</Badge>}
            </span>
            <Big className="text-sm">{m.merit}</Big>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/** The weeks already decided: who won, with what glory and which decrees. */
function History({ f, props }: { f: FamiliesView; props: GameProps }) {
  if (f.history.length === 0) return null;
  return (
    <Panel>
      <Label>{t().history}</Label>
      <ul className="mt-2 space-y-2">
        {[...f.history].reverse().map((h) => (
          <li key={h.week} className="flex items-start gap-2 text-sm">
            {h.winner ? <FamilyCrest family={h.winner} size={24} /> : null}
            <span>
              <span className="label">S{h.week + 1}</span>{" "}
              <span className="font-semibold">
                {h.winner ? t().won(familyName(h.winner)) : t().nobody}
              </span>
              {h.decrees.length > 0 && (
                <span className="block text-xs text-cream-dim">
                  {h.decrees.map((p) => decreeTitle(props, p)).join(", ")}
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/**
 * Height left to the map between the page's top bar and the bottom navigation (none on a wide
 * screen), so that the campaign holds on one screen without scrolling.
 */
function useStageHeight(stage: RefObject<HTMLElement | null>): number | null {
  const [height, setHeight] = useState<number | null>(null);
  useLayoutEffect(() => {
    const fit = () => {
      const el = stage.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY;
      const nav = document.querySelector<HTMLElement>("[data-bottom-nav]");
      // A fixed bar has no offset parent: whether it shows is in its computed display.
      const shown = nav !== null && getComputedStyle(nav).display !== "none";
      const below = shown ? nav.getBoundingClientRect().height : 24;
      const next = Math.max(440, Math.round(window.innerHeight - top - below));
      setHeight((h) => (h === next ? h : next));
    };
    fit();
    // The top bar settles after the fonts and the season's frieze: measure again when it does.
    const observer = new ResizeObserver(fit);
    for (const el of document.querySelectorAll("header, [data-bottom-nav]")) observer.observe(el);
    window.addEventListener("resize", fit);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, [stage]);
  return height;
}

type DrawerTab = "campagne" | "decrets" | "famille" | "fil";

/** A wide screen (Tailwind's `lg`): the drawer is a column beside the map, never over it. */
function useWide(): boolean {
  const query = "(min-width: 1024px)";
  const [wide, setWide] = useState(() => window.matchMedia?.(query).matches ?? false);
  useEffect(() => {
    const m = window.matchMedia?.(query);
    if (!m) return;
    const change = () => setWide(m.matches);
    m.addEventListener("change", change);
    return () => m.removeEventListener("change", change);
  }, []);
  return wide;
}

/** The four families' glory over the map, the week's clock and what is coming. */
function Scoreboard({
  f,
  props,
  onFamily,
  onHelp,
}: {
  f: FamiliesView;
  props: GameProps;
  onFamily: () => void;
  onHelp: () => void;
}) {
  const ranked = [...f.families].sort((a, b) => b.glory - a.glory);
  const top = Math.max(1, ranked[0]?.glory ?? 0);
  const chip =
    "rounded-full bg-night/85 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide ring-1 backdrop-blur";
  return (
    <div className="pointer-events-none absolute inset-x-2 top-2 z-10 space-y-1.5">
      <div className="pointer-events-auto flex items-stretch gap-1 rounded-2xl bg-night/85 p-1 shadow-lg shadow-black/30 ring-1 ring-line/60 backdrop-blur">
        {ranked.map((x, i) => (
          <button
            key={x.code}
            type="button"
            onClick={onFamily}
            aria-label={`${familyName(x.code)} · ${t().glory} ${x.glory}`}
            className={`relative flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden rounded-xl px-1.5 py-1 ${x.code === f.mine ? "bg-gold/10 ring-1 ring-inset ring-gold/70" : ""}`}
          >
            <FamilyCrest family={x.code} size={22} />
            <span className="min-w-0 text-left leading-none">
              <span className="block font-display text-base font-extrabold tabular-nums">
                {x.glory}
              </span>
              <span className="block font-mono text-[8.5px] uppercase tracking-wide text-cream-dim">
                {i === 0 && x.glory > 0
                  ? `★ ${t().first}`
                  : x.code === f.mine
                    ? t().you
                    : `${i + 1}e`}
              </span>
            </span>
            <span
              className="absolute inset-x-1.5 bottom-0.5 h-[2px] origin-left rounded-full transition-transform duration-500"
              style={{ background: familyHex(x.code), transform: `scaleX(${x.glory / top})` }}
            />
          </button>
        ))}
        <button
          type="button"
          onClick={onHelp}
          aria-label={t().helpTitle}
          className="flex w-8 shrink-0 items-center justify-center rounded-xl font-display text-base font-extrabold text-cream-dim active:bg-night-3"
        >
          ?
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <span className={`${chip} text-cream ring-line/60`}>
          {f.closed ? t().closed : t().weekShort(clock(f.weekEndsAt - props.now))}
        </span>
        {!f.open && !f.closed && (
          <span className={`${chip} text-lagoon ring-lagoon/50`}>
            ☾ {t().truce} {clock(f.nextOpenAt - props.now)}
          </span>
        )}
        {f.nextMilanAt !== null && f.nextMilanAt > props.now && !f.closed && (
          <span className={`${chip} text-vermilion ring-vermilion/60`}>
            {t().milanShort(clock(f.nextMilanAt - props.now))}
          </span>
        )}
      </div>
    </div>
  );
}

/** At the foot of the map: the reserve, the levy to collect, lances to engage, the works. */
function ActionBar({
  f,
  props,
  onHire,
  onWorks,
}: {
  f: FamiliesView;
  props: GameProps;
  onHire: () => void;
  onWorks: () => void;
}) {
  const me = f.me;
  if (!me || f.closed) return null;
  const works = props.catalog.families?.campaign?.works;
  return (
    <div className="pointer-events-none absolute inset-x-2 bottom-2 z-10 space-y-1.5">
      {me.reserve > 0 && (
        <p className="text-center text-[11px] font-semibold text-gold [text-shadow:0_1px_2px_rgb(15_27_30),0_0_6px_rgb(15_27_30)]">
          {t().drag.hint}
        </p>
      )}
      <div className="pointer-events-auto flex items-center gap-1.5 rounded-2xl bg-night/90 p-1.5 shadow-lg shadow-black/40 ring-1 ring-line/60 backdrop-blur">
        <div className="flex shrink-0 items-center gap-1.5 pl-1.5 pr-1">
          <span aria-hidden="true" className="text-lg leading-none">
            ⚔
          </span>
          <span className="leading-none">
            <span className="block font-display text-lg font-extrabold tabular-nums">
              {me.reserve}
            </span>
            <span className="block font-mono text-[8.5px] uppercase tracking-wide text-cream-dim">
              {t().reserveShort}
            </span>
          </span>
        </div>
        <Slab
          size="sm"
          tone="lagoon"
          className="min-w-0 flex-1 whitespace-nowrap !px-2"
          disabled={props.busy || me.levy <= 0}
          onClick={() => props.act({ type: "collectLevy" })}
        >
          {t().levyShort(me.levy)}
        </Slab>
        <Slab size="sm" className="min-w-0 flex-1 whitespace-nowrap !px-2" onClick={onHire}>
          {t().hireOpen}
        </Slab>
        {works && (
          <button
            type="button"
            onClick={onWorks}
            aria-label={t().works.count(me.works, me.worksAllowed)}
            className="flex shrink-0 items-center gap-1 rounded-xl px-2 py-1.5 ring-1 ring-inset ring-line/70 active:bg-night-3"
          >
            <WorkGlyph kind="rocca" color={familyHex(f.mine)} size={18} />
            <span className="font-mono text-[11px] tabular-nums">
              {me.works}/{me.worksAllowed}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

/** The family's works standing on the map, and what they do. */
function Works({
  f,
  props,
  onLand,
}: {
  f: FamiliesView;
  props: GameProps;
  onLand: (code: string) => void;
}) {
  const rules = props.catalog.families?.campaign?.works;
  if (!rules || !f.mine) return null;
  const mine = f.lands.filter((l) => l.work?.family === f.mine);
  return (
    <Panel>
      <div className="flex items-baseline justify-between gap-2">
        <Label className="text-gold">{t().works.title}</Label>
        {f.me && <span className="label">{t().works.count(f.me.works, f.me.worksAllowed)}</span>}
      </div>
      <p className="mt-1 text-xs text-cream-dim">{t().works.help}</p>
      {mine.length === 0 ? (
        <p className="mt-2 text-sm text-cream-dim">{t().works.none}</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {mine.map((l) => {
            const work = l.work;
            if (!work) return null;
            return (
              <li key={l.code}>
                <button
                  type="button"
                  onClick={() => onLand(l.code)}
                  className="flex w-full items-center gap-2.5 rounded-xl bg-night-2 p-2 text-left ring-1 ring-inset ring-line/70"
                >
                  <WorkGlyph
                    kind={work.kind}
                    color={familyHex(work.family)}
                    ready={work.ready}
                    size={26}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">
                      {t().works.names[work.kind] ?? work.kind} · {landName(l.code)}
                    </span>
                    <span className="block truncate text-xs text-cream-dim">
                      {workEffect(rules, work.kind)}
                    </span>
                  </span>
                  <span className={`label shrink-0 ${work.ready ? "text-lagoon" : "text-gold"}`}>
                    {work.ready ? `${l.garrison} ⚔` : clock(work.readyAt - props.now)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

/** The lands the merchant's lances can reach now, as chips (the map's list for the keyboard). */
function InReach({ f, onLand }: { f: FamiliesView; onLand: (code: string) => void }) {
  const lands = f.lands.filter((l) => l.open);
  if (lands.length === 0) return null;
  return (
    <Panel>
      <Label>{t().inReach}</Label>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {lands.map((l) => (
          <button
            key={l.code}
            type="button"
            onClick={() => onLand(l.code)}
            className="rounded-lg bg-night-2 px-2 py-1 text-xs ring-1 ring-inset ring-line/70"
            style={{ borderLeft: `3px solid ${familyHex(l.holder)}` }}
          >
            <span className="inline-flex items-center gap-1">
              {landName(l.code)} · {l.garrison}
              {l.work && (
                <WorkGlyph
                  kind={l.work.kind}
                  color={familyHex(l.work.family)}
                  ready={l.work.ready}
                  size={12}
                />
              )}
            </span>
          </button>
        ))}
      </div>
    </Panel>
  );
}

/** The merchant's family, the week's standings, its members and the weeks gone by. */
function FamilyTab({ f, props }: { f: FamiliesView; props: GameProps }) {
  const mine = f.mine ?? "";
  const last = props.view.acts.length > 0 && f.weekEndsAt >= props.catalog.world.endsAt;
  return (
    <div className="space-y-4">
      <Panel glow="gold">
        <div className="flex items-center gap-3">
          <FamilyCrest family={mine} size={56} />
          <div className="min-w-0 flex-1">
            <Label>{t().yours}</Label>
            <h2 className="truncate font-display text-2xl font-extrabold uppercase">
              {familyName(mine)}
            </h2>
            <p className="text-xs text-cream-dim">
              {f.closed ? t().closed : t().weekEnds(clock(f.weekEndsAt - props.now))}
            </p>
          </div>
        </div>
        {last && !f.closed && <p className="mt-2 text-sm text-gold">{t().lastWeek}</p>}
        <div className="mt-3">
          <Standings f={f} />
        </div>
        <p className="mt-2 text-xs text-cream-dim">{t().gloryHelp}</p>
      </Panel>
      <Roll f={f} props={props} />
      <History f={f} props={props} />
    </div>
  );
}

/**
 * The secondary panels under the map: the campaign's lists, the decrees, the family, its thread.
 * On a phone a drawer, folded to its tabs over the foot of the screen and pulled up to read; on a
 * wide screen a column beside the map.
 */
function Drawer({
  f,
  props,
  tab,
  open,
  onTab,
  onOpen,
  onLand,
}: {
  f: FamiliesView;
  props: GameProps;
  tab: DrawerTab;
  open: boolean;
  onTab: (tab: DrawerTab) => void;
  onOpen: (open: boolean) => void;
  onLand: (code: string) => void;
}) {
  const unread =
    props.familyLatestAt !== null && props.familyLatestAt > Number(store.get("familySeen") ?? 0);
  const threats = f.marches.filter(
    (m) => m.family !== f.mine && f.lands.find((l) => l.code === m.target)?.holder === f.mine,
  ).length;
  const drag = useRef<{ y: number; moved: boolean } | null>(null);
  const tabs: { key: DrawerTab; dot: boolean }[] = [
    { key: "campagne", dot: threats > 0 },
    { key: "decrets", dot: false },
    { key: "famille", dot: false },
    { key: "fil", dot: unread && tab !== "fil" },
  ];
  return (
    <div
      className={`absolute inset-x-0 bottom-0 z-20 flex flex-col overflow-hidden rounded-t-3xl border-t border-line bg-night-2/95 shadow-[0_-12px_30px_rgb(0_0_0/0.35)] backdrop-blur transition-[height] duration-300 ease-out lg:static lg:h-full lg:rounded-3xl lg:border lg:shadow-none ${open ? "h-[68%]" : "h-[3.25rem]"}`}
    >
      <div
        className="shrink-0 touch-none select-none lg:touch-auto"
        onPointerDown={(e) => {
          drag.current = { y: e.clientY, moved: false };
        }}
        onPointerMove={(e) => {
          const start = drag.current;
          if (!start) return;
          const dy = e.clientY - start.y;
          if (Math.abs(dy) > 24 && !start.moved) {
            start.moved = true;
            onOpen(dy < 0);
          }
        }}
        onPointerUp={() => {
          setTimeout(() => {
            drag.current = null;
          }, 0);
        }}
      >
        <div className="mx-auto mt-1.5 h-1 w-10 rounded-full bg-line lg:hidden" />
        <div role="tablist" className="grid grid-cols-4 gap-1 px-2 pb-1.5 pt-1 lg:pt-2">
          {tabs.map(({ key, dot }) => {
            const on = tab === key && open;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                onClick={() => {
                  if (drag.current?.moved) return;
                  if (tab === key) onOpen(!open);
                  else {
                    onTab(key);
                    onOpen(true);
                  }
                }}
                className={`relative rounded-xl py-1.5 font-mono text-[10.5px] uppercase tracking-[0.08em] transition-colors lg:py-2 ${on || tab === key ? "lg:bg-gold/15 lg:text-gold" : ""} ${on ? "bg-gold/15 font-bold text-gold" : "text-cream-dim"}`}
              >
                {t().tabs[key]}
                {dot && (
                  <span className="absolute right-2 top-1 h-2 w-2 rounded-full bg-vermilion" />
                )}
              </button>
            );
          })}
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-3 pb-6 pt-1">
        {tab === "campagne" && (
          <>
            <Marches f={f} props={props} />
            <Works f={f} props={props} onLand={onLand} />
            <InReach f={f} onLand={onLand} />
          </>
        )}
        {tab === "decrets" && (
          <>
            <DecreeBanner props={props} />
            <Programme f={f} props={props} />
          </>
        )}
        {tab === "famille" && <FamilyTab f={f} props={props} />}
        {tab === "fil" && <Thread />}
      </div>
    </div>
  );
}

/** How the campaign is played, out of the way until asked for. */
function HowTo({ props }: { props: GameProps }) {
  const works = props.catalog.families?.campaign?.works;
  return (
    <div className="space-y-3">
      <Label className="text-gold">⚑ {t().kicker}</Label>
      <h3 className="font-display text-2xl font-extrabold uppercase leading-tight">
        {t().helpTitle}
      </h3>
      <p className="text-sm text-cream-dim">{t().help}</p>
      <p className="text-sm text-cream-dim">{t().mapHelp}</p>
      <p className="text-sm text-cream-dim">{t().gloryHelp}</p>
      {works && (
        <div className="space-y-2">
          <Label>{t().works.title}</Label>
          <p className="text-sm text-cream-dim">{t().works.help}</p>
          <ul className="space-y-1.5">
            {Object.keys(works.kinds).map((kind) => (
              <li key={kind} className="flex items-start gap-2 text-sm">
                <WorkGlyph kind={kind} color={P.gold} size={20} />
                <span>
                  <span className="font-semibold">{t().works.names[kind] ?? kind}</span>
                  <span className="text-cream-dim"> — {workEffect(works, kind)}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** A family of the merchant's: the map on the whole screen, everything else at hand around it. */
function Mine({ f, props }: { f: FamiliesView; props: GameProps }) {
  const stage = useRef<HTMLDivElement>(null);
  const height = useStageHeight(stage);
  const wide = useWide();
  const [land, setLand] = useState<string | null>(null);
  const [tab, setTab] = useState<DrawerTab>("campagne");
  const [open, setOpen] = useState(false);
  const [hire, setHire] = useState(false);
  const [help, setHelp] = useState(false);
  const picked = f.lands.find((l) => l.code === land) ?? null;
  const openTab = (key: DrawerTab) => {
    setTab(key);
    setOpen(true);
  };
  return (
    <div
      ref={stage}
      style={height ? { height } : undefined}
      className="relative h-[calc(100svh-12rem)] lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-4"
    >
      <div className="absolute inset-x-0 bottom-[3.25rem] top-0 overflow-hidden bg-night-2 lg:relative lg:inset-auto lg:h-full lg:rounded-3xl lg:border lg:border-line">
        <CampaignMap
          f={f}
          props={props}
          onPick={(code) => setLand(code)}
          className="h-full w-full"
          covered={open && !wide}
        />
        <Scoreboard
          f={f}
          props={props}
          onFamily={() => openTab("famille")}
          onHelp={() => setHelp(true)}
        />
        <ActionBar
          f={f}
          props={props}
          onHire={() => setHire(true)}
          onWorks={() => openTab("campagne")}
        />
      </div>
      <Drawer
        f={f}
        props={props}
        tab={tab}
        open={open}
        onTab={setTab}
        onOpen={setOpen}
        onLand={setLand}
      />
      <Sheet open={picked !== null} onClose={() => setLand(null)}>
        {picked && (
          <LandSheet
            key={picked.code}
            land={picked}
            f={f}
            props={props}
            onClose={() => setLand(null)}
          />
        )}
      </Sheet>
      <Sheet open={hire} onClose={() => setHire(false)}>
        <Lances f={f} props={props} />
      </Sheet>
      <Sheet open={help} onClose={() => setHelp(false)}>
        <HowTo props={props} />
      </Sheet>
    </div>
  );
}

/** The four families and the week's campaign in the Terraferma. */
export function Famille(props: GameProps) {
  const f = props.view.families;
  if (!f) return null;
  if (f.mine) {
    // The map takes the screen from edge to edge, under the page's top bar.
    return (
      <section className="-mx-4 -mb-40 -mt-4 lg:mx-0 lg:-mb-16 lg:mt-0">
        <Mine f={f} props={props} />
      </section>
    );
  }
  return (
    <section className="space-y-4">
      <div className="relative -mx-4 -mt-4 overflow-hidden border-b border-line lg:mx-0 lg:mt-0 lg:rounded-3xl lg:border">
        <CampaignMap f={f} props={props} onPick={() => {}} className="h-[46svh] min-h-[320px]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-night via-night/80 to-transparent px-4 pb-3 pt-10">
          <Label className="text-gold">⚑ {t().kicker}</Label>
          <h1 className="mt-1 font-display text-[1.75rem] font-extrabold uppercase leading-[1.05]">
            {t().title}
          </h1>
        </div>
      </div>
      <p className="text-sm text-cream-dim">{t().help}</p>
      <Choose f={f} props={props} />
    </section>
  );
}
