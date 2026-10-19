import { useCallback, useEffect, useState } from "react";
import { ApiError } from "../api.js";
import { FAMILY_LOOK, FamilyCrest, MILITIA_HEX, familyHex } from "../art/familyCrest.js";
import { P } from "../art/palette.js";
import { WorkGlyph } from "../art/workIcon.js";
import { fr } from "../i18n.js";
import { Badge, Big, Label, Panel, Qty, Slab, Stat, clock } from "../ui.js";
import type { GameProps } from "./Game.js";
import { gameApi } from "./api.js";
import { d } from "./format.js";
import { store } from "./store.js";
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
    case "levant":
      return e.levant(pct(rules.levant.memberQuotaBps), pct(rules.levant.othersCutBps));
    case "calmiere":
      return e.calmiere(good(pick.target), pct(rules.calmiere.capBps));
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
export function Standings({ f }: { f: FamiliesView }) {
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

/** One land: what holds it, what taking it needs, and the march to send. */
export function LandSheet({
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
          <p className="label text-cream-dim">{t().kinds[land.kind] ?? land.kind}</p>
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
                tone={ours ? "ghost" : undefined}
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
  const spend = props.view.houseSpend;
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
        {!theirs && !land.work.ready && spend && (
          <Slab
            size="sm"
            tone="ghost"
            disabled={props.busy || (props.influence ?? 0) < spend.rushWork}
            onClick={() => props.spend({ use: "work", land: land.code })}
          >
            {fr.game.house.spend.work(spend.rushWork)}
          </Slab>
        )}
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
export function Lances({ f, props }: { f: FamiliesView; props: GameProps }) {
  const rules = props.catalog.families;
  const me = f.me;
  const room = me ? Math.max(0, me.hireLimit - me.hired) : 0;
  const [count, setCount] = useState(Math.min(10, Math.max(1, room)));
  if (!me || !rules?.campaign) return null;
  const n = Math.max(1, Math.min(count, Math.max(1, room)));
  const cost = hireCost(rules, me.hired, n);
  return (
    <div>
      <Label className="text-cream-dim">{t().lances}</Label>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Stat label={t().reserve} value={me.reserve} tone="lagoon" />
        <Stat label={t().levyWaiting} value={`${me.levy} / ${me.levyMax}`} />
      </div>
      <Slab
        className="mt-3 w-full"
        tone="ghost"
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
      <TroopsForInfluence {...props} />
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
export function Marches({ f, props }: { f: FamiliesView; props: GameProps }) {
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
export function Programme({ f, props }: { f: FamiliesView; props: GameProps }) {
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
export function Choose({ f, props }: { f: FamiliesView; props: GameProps }) {
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
export function Thread() {
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
      <Label className="text-cream-dim">{t().thread.title}</Label>
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
export function Roll({ f, props }: { f: FamiliesView; props: GameProps }) {
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
export function History({ f, props }: { f: FamiliesView; props: GameProps }) {
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

/** The family's works standing on the map, and what they do. */
export function Works({
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

/** The merchant's family, the week's standings, its members and the weeks gone by. */
export function FamilyTab({ f, props }: { f: FamiliesView; props: GameProps }) {
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

/** How the campaign is played, out of the way until asked for. */
export function HowTo({ props }: { props: GameProps }) {
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

/** Troops bought with the house's Influence: besides those hired for ducats, capped each day. */
function TroopsForInfluence(props: GameProps) {
  const spend = props.view.houseSpend;
  if (!spend || props.influence === null) return null;
  const h = fr.game.house.spend;
  const left = spend.troopsLeft;
  const counts = [...new Set([spend.troopsPerPoint, 10, left])]
    .filter((c) => c > 0 && c <= left)
    .sort((a, b) => a - b);
  return (
    <div className="mt-4">
      <Label className="text-gold">{h.troopsTitle}</Label>
      <p className="label mt-1">{h.troopsHelp(left)}</p>
      {counts.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {counts.map((c) => {
            const cost = Math.ceil(c / spend.troopsPerPoint);
            return (
              <Slab
                key={c}
                size="sm"
                disabled={props.busy || (props.influence ?? 0) < cost}
                onClick={() => props.spend({ use: "troops", count: c })}
              >
                {h.troops(c, cost)}
              </Slab>
            );
          })}
        </div>
      )}
    </div>
  );
}
