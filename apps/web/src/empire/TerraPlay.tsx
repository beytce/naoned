/**
 * The Terraferma played on Porcellana's board (docs/plan-terraferme-porcellana.md § 3, lot T5):
 * the board, the bar over it (troops, rank, the phase), the card beside a touched cell, and its red
 * key opening one decision in the dock (launch a front, build, a neighbour, the merchant's lands,
 * aim a bombard, settle); at the foot, the merchant's lands, its fronts, its allies, the ranking.
 * The far merchants fade (the focus on the player). One action in the dock, the scene stays above.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { ChoiceCard, Dock, PlaceHeader } from "../dock.js";
import { d, duration } from "../game/format.js";
import { placementOpen } from "../game/map/TerraLayer.js";
import type { TerraAction, TerraView } from "../game/types.js";
import { fr } from "../i18n.js";
import { PlaceCard, type PlaceCardHandle, type PlaceCardInfo } from "../porcellana/PlaceCard.js";
import { TerraScene } from "../porcellana/terra/TerraScene.js";
import { pictureOfView } from "../porcellana/terra/picture.js";
import { type DockKind, cellCard, focusOf, frontPlan } from "../porcellana/terra/play.js";
import { Slab } from "../ui.js";

const t = fr.empire.terra.play;
const g = fr.game.terra;
type Kind = "rocca" | "borgo" | "porto" | "bombarda" | "mura";
const KINDS: Kind[] = ["rocca", "borgo", "porto", "bombarda", "mura"];
type Panel = DockKind | "fronts" | "allies" | "ranking";

export function TerraPlay({
  v,
  now,
  busy,
  send,
  className = "relative mt-2 h-[72vh] min-h-[26rem] rounded-2xl",
  touch,
}: {
  v: TerraView;
  now: number;
  busy: boolean;
  /** Sends an order; resolves to whether it was taken (then a pill says it). */
  send: (a: TerraAction) => unknown;
  /** The box it fills (the laboratory: the whole screen). */
  className?: string;
  /** Touches a cell from outside (the laboratory's buttons). */
  touch?: { current: ((cell: number | null) => void) | null };
}) {
  const [cell, setCell] = useState<number | null>(null);
  const [panel, setPanel] = useState<Panel | null>(null);
  const [share, setShare] = useState(5_000);
  const [kind, setKind] = useState<Kind | null>(null);
  const [count, setCount] = useState(10);
  const [holder, setHolder] = useState<number | null>(null);
  const focus = useMemo(() => focusOf(v), [v]);
  const pic = useMemo(() => pictureOfView(v, focus), [v, focus]);
  const card = useRef<PlaceCardHandle | null>(null);
  const placing = placementOpen(v, now);
  const info = cell !== null ? cellCard(v, cell, placing) : null;
  const me = v.holders.findIndex((h) => h.me);
  const nameOf = (i: number) => {
    const h = v.holders[i];
    if (!h) return t.free;
    if (h.me) return t.yours;
    if (h.nation) return g.nations[h.nation] ?? h.nation;
    return h.pseudo ?? t.someone;
  };
  const close = () => {
    setPanel(null);
    setCell(null);
    setKind(null);
  };
  // A pill of ink says each order taken (« Front lancé · 52 troupes en marche ✓ »).
  const [said, setSaid] = useState<{ text: string; at: number } | null>(null);
  useEffect(() => {
    if (!said) return;
    const id = window.setTimeout(() => setSaid(null), 3_200);
    return () => window.clearTimeout(id);
  }, [said]);
  const order = (a: TerraAction) => {
    const text = saidOf(a, v, nameOf);
    void Promise.resolve(send(a)).then((ok) => {
      if (ok !== false && text) setSaid({ text, at: Date.now() });
    });
  };
  const act = (a: TerraAction) => {
    order(a);
    close();
  };
  const pick = (c: number | null) => {
    // Aiming: a lit cell fires; anything else lets go.
    if (panel === "aim") {
      if (c !== null && v.me?.bombard.cells.includes(c)) act({ type: "terraFire", cell: c });
      else close();
      return;
    }
    setPanel(null);
    setKind(null);
    setCell(c);
  };
  if (touch) touch.current = pick;
  const open = (p: Panel) => {
    if (p === "holder" && info) setHolder(info.holder);
    setPanel(p);
  };
  const marked =
    panel === "aim" ? v.me?.bombard.cells : panel === "front" && cell !== null ? [cell] : undefined;

  // The card of the touched cell: what it is, its holder, one sentence, the key to its decision.
  const cardInfo: PlaceCardInfo | null = (() => {
    if (cell === null || !info || panel) return null;
    const city = info.city ? (fr.themeNames.city[info.city] ?? info.city) : null;
    const terrain = g.terrains[info.terrain] ?? "";
    const building = info.building ? g.buildings[info.building] : null;
    const name =
      info.kind === "capital"
        ? t.camp
        : (city ??
          (info.holder >= 0 ? (info.kind === "ally" ? t.ally : nameOf(info.holder)) : t.free));
    const sub = [
      info.holder >= 0 && city ? nameOf(info.holder) : info.holder < 0 ? t.militia : null,
      terrain,
      building,
    ]
      .filter(Boolean)
      .join(" · ");
    const line =
      info.kind === "water"
        ? t.water
        : info.kind === "far"
          ? t.far
          : info.kind === "border" && info.cost !== null
            ? `${g.target.cost(info.cost)}${info.defense !== null ? ` ${t.defended(info.defense)}` : ""}`
            : info.kind === "capital" && v.me
              ? g.mine.line(v.me.cells, v.me.troops, v.me.cap)
              : info.building
                ? (g.mine.built[info.building] ?? "")
                : info.defense !== null
                  ? t.defended(info.defense)
                  : "";
    // A rival's cell along the border: attack it, or see its holder (the alliance, the signals).
    const alt =
      info.kind === "border" && info.holder >= 0 && !v.holders[info.holder]?.nation
        ? t.see(nameOf(info.holder))
        : undefined;
    return { name, sub, line, go: info.dock ? (t.go[info.dock] ?? "") : "", alt };
  })();

  // The merchants touching the merchant's land, neither allies nor asking: whom to ally with.
  const neighbours = [...focus].filter((i) => {
    const h = v.holders[i];
    return !!h && !h.me && !h.nation && !h.ally && !v.me?.requestsIn.includes(i) && h.cells > 0;
  });
  const mine = v.fronts.filter((f) => f.mine);
  const threats = v.fronts.filter((f) => f.threat);
  const plan = cell !== null ? frontPlan(v, cell, share) : null;
  const coastal = (c: number) =>
    [c - 1, c + 1, c - v.map.width, c + v.map.width].some((n) => v.map.terrain[n] === "w");

  return (
    <div
      className={`porcellana overflow-hidden ${className}`}
      data-terra-play=""
      aria-label={fr.empire.terra.board}
    >
      <TerraScene
        pic={pic}
        chosen={cell}
        onCell={pick}
        home={v.me?.capital ?? null}
        marked={marked}
        card={card}
        townName={(code) =>
          fr.themeNames.city[code] ?? code.charAt(0).toUpperCase() + code.slice(1)
        }
        onCamp={(c) => {
          const i = v.owner[c] ?? -1;
          if (i < 0 || v.holders[i]?.me) return;
          setCell(c);
          setHolder(i);
          setPanel("holder");
        }}
        campName={(c) => {
          const i = v.owner[c] ?? -1;
          const h = v.holders[i];
          if (!h) return null;
          return h.me ? t.camp : nameOf(i);
        }}
      />

      {/* The bar: troops, rank, the phase. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-start justify-between gap-2 p-3">
        {v.me && (
          <button
            type="button"
            className="pc-pill pointer-events-auto flex items-center gap-2 px-3 py-1.5 text-sm font-extrabold tabular-nums text-cream"
            onClick={() => {
              setCell(v.me?.capital ?? null);
              setPanel("lands");
            }}
            data-terra-troops=""
          >
            <span className="h-3 w-3 rounded-full bg-[rgb(var(--face))]" aria-hidden="true" />
            {v.me.troops} / {v.me.cap}
            <span className="text-xs text-cream-dim">{g.perHour(v.me.recruit.perHour)}</span>
          </button>
        )}
        <span className="pc-pill px-3 py-1.5 text-xs font-bold text-cream">
          {!v.open
            ? g.night
            : v.battle?.on
              ? g.battle.onShort(v.battle.to, v.battle.toMinute)
              : g.closesIn(duration(Math.max(0, v.closesAt - now)))}
        </span>
        {v.me && (
          <span className="pc-pill px-3 py-1.5 text-xs font-bold text-cream">
            {t.rankLine(v.me.rank, v.players, v.me.glory)}
          </span>
        )}
      </div>

      {said && (
        <output
          key={said.at}
          className="pc-said pointer-events-none absolute inset-x-0 top-14 z-50 mx-auto w-fit"
          data-terra-said=""
        >
          {said.text}
        </output>
      )}

      {cardInfo && (
        <PlaceCard
          ref={(h) => {
            card.current = h;
          }}
          info={cardInfo}
          onGo={() => info?.dock && open(info.dock)}
          onAlt={() => {
            if (!info) return;
            setHolder(info.holder);
            setPanel("holder");
          }}
          onClose={close}
        />
      )}

      {/* The foot: the merchant's lands, its fronts, its allies, the ranking. */}
      {!panel && !cardInfo && v.me && (
        <nav
          className="pc-pill absolute inset-x-3 bottom-3 mx-auto flex max-w-md justify-between gap-1 p-1.5"
          aria-label={fr.empire.terra.title}
        >
          {(
            [
              ["lands", fr.game.terra.mine.title],
              ["fronts", `${t.fronts}${mine.length ? ` · ${mine.length}` : ""}`],
              ["allies", t.allies],
              ["ranking", t.ranking],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              className="min-h-11 flex-1 rounded-2xl px-2 text-xs font-extrabold text-cream hover:bg-black/5"
              onClick={() => {
                if (k === "lands") setCell(v.me?.capital ?? null);
                setPanel(k);
              }}
            >
              {label}
            </button>
          ))}
        </nav>
      )}

      {panel && (
        <div className="absolute inset-x-0 bottom-0 flex justify-center" data-terra-dock={panel}>
          <Dock onClose={close} label={t.go[panel] ?? panel}>
            {panel === "front" && cell !== null && plan && (
              <>
                <PlaceHeader
                  title={t.frontTitle}
                  sub={nameOf(info?.holder ?? -1)}
                  onClose={close}
                />
                <label className="block text-sm font-bold text-cream-dim" htmlFor="terra-share">
                  {t.men}{" "}
                  <span className="float-right text-lg font-extrabold tabular-nums text-cream">
                    {plan.sent}
                  </span>
                </label>
                <input
                  id="terra-share"
                  type="range"
                  min={v.rules.minShareBps}
                  max={10_000}
                  step={500}
                  value={share}
                  onChange={(e) => setShare(Number(e.target.value))}
                  className="pc-range w-full"
                />
                <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-sm">
                  <dt className="text-cream-dim">{t.takes}</dt>
                  <dd className="text-right font-extrabold">{t.upTo(plan.cells)}</dd>
                  <dt className="text-cream-dim">{t.backLabel}</dt>
                  <dd className="text-right font-extrabold">{t.back(plan.back)}</dd>
                  {plan.hours > 0 && (
                    <>
                      <dt className="text-cream-dim">{t.marchLabel}</dt>
                      <dd className="text-right font-extrabold">{t.march(plan.hours)}</dd>
                    </>
                  )}
                  <dt className="text-cream-dim">{t.homeLabel}</dt>
                  <dd
                    className={`text-right font-extrabold ${plan.bare ? "text-[rgb(var(--face))]" : ""}`}
                    data-terra-bare={plan.bare ? "" : undefined}
                  >
                    {t.home(plan.defenseAfter, plan.defenseBefore)}
                  </dd>
                </dl>
                {plan.losesSafety && (
                  <p className="text-sm font-bold text-[rgb(var(--face))]">
                    {g.target.losesSafety}
                  </p>
                )}
                <Slab
                  className="w-full"
                  busy={busy}
                  disabled={!plan.ok}
                  onClick={() => act({ type: "terraFront", aim: cell, shareBps: share })}
                >
                  {plan.ok ? t.attackWith(plan.sent) : g.target.tooWeak(info?.cost ?? 0)}
                </Slab>
              </>
            )}

            {panel === "build" && cell !== null && (
              <>
                <PlaceHeader
                  title={t.buildTitle}
                  sub={g.terrains[info?.terrain ?? "p"] ?? ""}
                  onClose={close}
                />
                <div className="grid grid-cols-2 gap-2">
                  {KINDS.filter((k) => v.rules.prices[k] !== null).map((k) => {
                    const why = info?.building
                      ? t.builtHere
                      : k === "porto" && !coastal(cell)
                        ? t.coastOnly
                        : undefined;
                    return (
                      <ChoiceCard
                        key={k}
                        selected={kind === k}
                        locked={why}
                        onClick={() => setKind(k)}
                        attrs={{ "data-terra-build": k }}
                      >
                        <span className="flex flex-col gap-0.5 p-2.5">
                          <span className="text-sm font-extrabold">{g.buildings[k]}</span>
                          <span className="text-xs text-cream-dim">{g.mine.built[k]}</span>
                          <span className="text-xs font-bold">{d(v.rules.prices[k])}</span>
                        </span>
                      </ChoiceCard>
                    );
                  })}
                </div>
                <Slab
                  className="w-full"
                  busy={busy}
                  disabled={!kind}
                  onClick={() => kind && act({ type: "terraBuild", cell, kind })}
                >
                  {kind
                    ? t.buildWith(g.buildings[kind] ?? kind, d(v.rules.prices[kind]))
                    : t.buildTitle}
                </Slab>
              </>
            )}

            {panel === "lands" && v.me && (
              <>
                <PlaceHeader
                  title={g.mine.title}
                  sub={g.mine.line(v.me.cells, v.me.troops, v.me.cap)}
                  onClose={close}
                />
                <p className="text-sm text-cream-dim">
                  {g.perHour(v.me.recruit.perHour)} · {t.rankLine(v.me.rank, v.players, v.me.glory)}
                </p>
                <FrontList v={v} busy={busy} send={order} nameOf={nameOf} />
                <div className="flex flex-col gap-2">
                  {v.rules.troopBuy && (v.me.buysLeft ?? 0) > 0 && (
                    <Slab
                      className="w-full"
                      busy={busy}
                      onClick={() => order({ type: "terraBuyTroops" })}
                    >
                      {t.buyTroops(v.rules.troopBuy.amount, d(v.rules.troopBuy.price))}
                    </Slab>
                  )}
                  {v.me.raisesLeft > 0 && (
                    <Slab
                      className="w-full"
                      tone="ghost"
                      busy={busy}
                      onClick={() => order({ type: "terraRaise" })}
                    >
                      {g.mine.raise(v.rules.capRaise)} · {d(v.rules.prices.cap)}
                    </Slab>
                  )}
                  {v.rules.troopBuy && (
                    <p className="text-center text-xs text-cream-dim">
                      {t.buysLeft(v.me.buysLeft ?? 0)}
                    </p>
                  )}
                </div>
              </>
            )}

            {panel === "holder" && holder !== null && v.holders[holder] && (
              <HolderDock
                v={v}
                i={holder}
                busy={busy}
                act={act}
                close={close}
                name={nameOf(holder)}
                count={count}
                setCount={setCount}
                cell={cell}
              />
            )}

            {panel === "aim" && v.me && (
              <>
                <PlaceHeader
                  title={t.aimTitle}
                  sub={g.target.fire(v.me.bombard.shots)}
                  onClose={close}
                />
                <p className="text-sm text-cream-dim">{t.aimHint}</p>
              </>
            )}

            {panel === "place" && cell !== null && (
              <>
                <PlaceHeader
                  title={g.place.invite}
                  sub={g.terrains[info?.terrain ?? "p"] ?? ""}
                  onClose={close}
                />
                <Slab
                  className="w-full"
                  busy={busy}
                  onClick={() => act({ type: "terraPlace", cell })}
                >
                  {g.place.here}
                </Slab>
              </>
            )}

            {panel === "fronts" && (
              <>
                <PlaceHeader title={t.fronts} onClose={close} />
                <FrontList v={v} busy={busy} send={order} nameOf={nameOf} />
                {threats.length > 0 && (
                  <ul className="space-y-1 text-sm">
                    {threats.map((f) => (
                      <li key={f.id} className="text-cream">
                        {t.threatLine(nameOf(f.owner), f.troops)}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}

            {panel === "allies" && v.me && (
              <>
                <PlaceHeader title={t.allies} onClose={close} />
                {v.me.allies.length + v.me.requestsIn.length + neighbours.length === 0 && (
                  <p className="text-sm text-cream-dim">{t.noAlly}</p>
                )}
                {[...v.me.allies, ...v.me.requestsIn].map((i) => (
                  <ChoiceCard
                    key={i}
                    onClick={() => {
                      setHolder(i);
                      setPanel("holder");
                    }}
                  >
                    <span className="p-2.5 text-sm font-extrabold">
                      {nameOf(i)}
                      {v.me?.requestsIn.includes(i) ? ` · ${g.holder.accept}` : ""}
                    </span>
                  </ChoiceCard>
                ))}
                {neighbours.length > 0 && (
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-cream-dim">
                    {t.neighbours}
                  </p>
                )}
                {neighbours.map((i) => (
                  <ChoiceCard
                    key={`n${i}`}
                    onClick={() => {
                      setHolder(i);
                      setPanel("holder");
                    }}
                    attrs={{ "data-terra-neighbour": String(i) }}
                  >
                    <span className="flex items-center justify-between gap-2 p-2.5 text-sm">
                      <span className="font-extrabold">{nameOf(i)}</span>
                      <span className="text-cream-dim">
                        {v.me?.requestsOut.includes(i) ? g.holder.asked : g.holder.ally}
                      </span>
                    </span>
                  </ChoiceCard>
                ))}
              </>
            )}

            {panel === "ranking" && (
              <>
                <PlaceHeader title={t.ranking} onClose={close} />
                <ol className="space-y-1 text-sm">
                  {v.ranking.slice(0, 10).map((r, k) => (
                    <li
                      key={r.holder}
                      className={`flex justify-between ${r.holder === me ? "font-extrabold text-[rgb(var(--face))]" : "text-cream"}`}
                    >
                      <span>
                        {k + 1}. {r.holder === me ? t.yours : nameOf(r.holder)}
                      </span>
                      <span className="tabular-nums">{r.glory}</span>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </Dock>
        </div>
      )}
    </div>
  );
}

/** What the pill says once an order is taken; empty: nothing. */
function saidOf(a: TerraAction, v: TerraView, nameOf: (i: number) => string): string {
  const s = t.said;
  const who = (id: string) => nameOf(v.holders.findIndex((h) => h.id === id));
  switch (a.type) {
    case "terraFront":
    case "terraSail":
      return g.camp.launched(Math.floor(((v.me?.troops ?? 0) * a.shareBps) / 10_000));
    case "terraRecall":
      return s.recalled;
    case "terraBuild":
      return s.built(g.buildings[a.kind] ?? a.kind);
    case "terraAlly":
      return s.asked(who(a.other));
    case "terraAccept":
      return s.allied(who(a.from));
    case "terraBreak":
      return s.broken(who(a.other));
    case "terraSend":
      return s.sent(a.count, who(a.to));
    case "terraSignal":
      return s.signal(g.diplomacy.signals[a.kind] ?? a.kind);
    case "terraFire":
      return s.fired;
    case "terraPlace":
      return s.placed;
    case "terraRaise":
      return s.raised;
    case "terraBuyTroops":
      return s.bought;
    default:
      return "";
  }
}

/** The merchant's fronts marching, each with « Rappeler ». */
function FrontList({
  v,
  busy,
  send,
  nameOf,
}: {
  v: TerraView;
  busy: boolean;
  send: (a: TerraAction) => void;
  nameOf: (i: number) => string;
}) {
  const mine = v.fronts.filter((f) => f.mine);
  if (mine.length === 0) return <p className="text-sm text-cream-dim">{t.noFront}</p>;
  return (
    <ul className="space-y-1.5">
      {mine.map((f) => (
        <li key={f.id} className="flex items-center gap-2 text-sm text-cream">
          <span
            aria-hidden="true"
            className="h-2 rounded-full bg-[rgb(var(--face))]"
            style={{ width: `${Math.round(16 + 40 * Math.sqrt(Math.min(400, f.troops) / 150))}px` }}
          />
          <span className="flex-1">{g.mine.frontLine(f.troops, nameOf(f.against))}</span>
          <Slab
            size="sm"
            tone="ghost"
            busy={busy}
            onClick={() => send({ type: "terraRecall", frontId: f.id })}
          >
            {g.mine.recall}
          </Slab>
        </li>
      ))}
    </ul>
  );
}

/** A neighbour or an ally: the alliance, troops sent, the quick signals. */
function HolderDock({
  v,
  i,
  busy,
  act,
  close,
  name,
  count,
  setCount,
  cell,
}: {
  v: TerraView;
  i: number;
  busy: boolean;
  act: (a: TerraAction) => void;
  close: () => void;
  name: string;
  count: number;
  setCount: (n: number) => void;
  cell: number | null;
}) {
  const h = v.holders[i];
  if (!h) return null;
  const id = h.id ?? "";
  const merchant = !h.nation && !h.me;
  return (
    <>
      <PlaceHeader title={name} sub={g.holder.line(h.cells, h.troops)} onClose={close} />
      {h.ally && v.me && (
        <>
          <label className="block text-sm font-bold text-cream-dim" htmlFor="terra-send">
            {g.holder.sendLine(count, v.me.giftsLeft)}
          </label>
          <input
            id="terra-send"
            type="range"
            min={1}
            max={Math.max(1, v.me.giftsLeft)}
            value={Math.min(count, Math.max(1, v.me.giftsLeft))}
            onChange={(e) => setCount(Number(e.target.value))}
            className="pc-range w-full"
          />
          <Slab
            className="w-full"
            busy={busy}
            disabled={v.me.giftsLeft <= 0}
            onClick={() => act({ type: "terraSend", to: id, count })}
          >
            {g.holder.send}
          </Slab>
          <Slab
            className="w-full"
            tone="ghost"
            busy={busy}
            onClick={() => act({ type: "terraBreak", other: id })}
          >
            {g.holder.broken}
          </Slab>
        </>
      )}
      {merchant && !h.ally && v.me && (
        <Slab
          className="w-full"
          busy={busy}
          disabled={v.me.requestsOut.includes(i)}
          onClick={() =>
            act(
              v.me?.requestsIn.includes(i)
                ? { type: "terraAccept", from: id }
                : { type: "terraAlly", other: id },
            )
          }
        >
          {v.me.requestsIn.includes(i)
            ? g.holder.accept
            : v.me.requestsOut.includes(i)
              ? g.holder.asked
              : g.holder.ally}
        </Slab>
      )}
      {merchant && (
        <div className="flex flex-wrap gap-2">
          {(["help", "attack", "thanks", "peace"] as const).map((k) => (
            <Slab
              key={k}
              size="sm"
              tone="ghost"
              busy={busy}
              onClick={() =>
                act({ type: "terraSignal", kind: k, ...(cell !== null ? { cell } : {}) })
              }
            >
              {g.diplomacy.signals[k]}
            </Slab>
          ))}
        </div>
      )}
    </>
  );
}
