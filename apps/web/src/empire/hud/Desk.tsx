/**
 * The desk of the playful Porcellana (proposal D, decision of the owner, 6 November 2026; the
 * canvas « Fondaco — interface moderne », row D): on a computer, one bar across the top (the
 * house's mark, the four places, a search of the map, the money drawn, the Casa's medal), a panel
 * on the left (Lorenzo's bubble, what waits, the workshops with their rings), the Remise at the
 * foot and the zoom on the right. On a phone, the bubble alone under the money (the places stay at
 * the foot).
 */
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { GoodsMark } from "../../art/goods.js";
import { DucatCoin, FavourCoin, WaxSeal } from "../../art/plateau/coins.js";
import { Lorenzo } from "../../art/scenes.js";
import { amount, bare } from "../../game/format.js";
import { Icon } from "../../game/map/icons.js";
import { haptic } from "../../haptics.js";
import { fr } from "../../i18n.js";
import { boardOf } from "../../porcellana/board/scene.js";
import { Slab, clock } from "../../ui.js";
import { buildingName, recipeOf, workshopStatus } from "../logic.js";
import { bestNowOf } from "../map/BestNow.js";
import type { PlaceId } from "../map/PlaceTabs.js";
import { type Target, hudOf } from "../map/logic.js";
import type { EmpirePayload } from "../types.js";

const t = fr.empire.desk;

/** A computer's screen (1024 px and more): the desk; below, the phone's foot and head. */
export function useWide(): boolean {
  const query = "(min-width: 1024px)";
  const [wide, setWide] = useState(
    () => typeof window !== "undefined" && !!window.matchMedia?.(query).matches,
  );
  useEffect(() => {
    const m = window.matchMedia?.(query);
    if (!m) return;
    const on = () => setWide(m.matches);
    on();
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return wide;
}
const goodName = (p: EmpirePayload, code: string) =>
  fr.themeNames.resource[code] ?? p.goods[code] ?? code;
const cityName = (code: string) =>
  fr.empire.cityNames[code] ?? code.charAt(0).toUpperCase() + code.slice(1);

/** The share of the way to the next Casa, for the medal's ring. */
function casaShare(p: EmpirePayload): number {
  const next = p.view?.nextCasa;
  if (!next) return 1;
  return Math.min(1, Number((BigInt(p.cash) * 1000n) / BigInt(next.cost || "1")) / 1000);
}

/** The Casa's medal: red, its white ring filling toward the next Casa. */
export function CasaMedal({
  p,
  onClick,
  size = 52,
}: {
  p: EmpirePayload;
  onClick: () => void;
  size?: number;
}) {
  const casa = p.view?.house.casa ?? 1;
  const ring = 2 * Math.PI * 21;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={fr.empire.hud.casa(casa)}
      data-house-header
      className="hud-medal relative flex shrink-0 items-center justify-center rounded-full transition-transform active:translate-y-0.5"
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 48 48" className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle
          cx="24"
          cy="24"
          r="21"
          fill="none"
          stroke="rgb(255 255 255 / 0.35)"
          strokeWidth="3"
        />
        <circle
          cx="24"
          cy="24"
          r="21"
          fill="none"
          stroke="rgb(255 255 255)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={`${ring * casaShare(p)} ${ring}`}
        />
      </svg>
      <span className="font-display text-lg font-black text-white">{casa}</span>
    </button>
  );
}

const SIGNS = {
  ducats: <DucatCoin size={36} />,
  favour: <FavourCoin size={36} />,
  seals: <WaxSeal size={36} />,
};

/** The money, drawn first, its figure after: one grey pill each. */
export function MoneyPills({ p, tone = "grey" }: { p: EmpirePayload; tone?: "grey" | "white" }) {
  return (
    <div className="flex items-center gap-1.5" data-hud-counts>
      {hudOf(p).map((c) => (
        <span
          key={c.id}
          data-hud={c.id}
          aria-label={`${fr.empire.scene[c.id]} : ${c.value}`}
          className={`flex h-12 items-center gap-1 rounded-full py-1 pl-1 pr-3.5 ${tone === "grey" ? "bg-night-4" : "hud-bar"}`}
        >
          {SIGNS[c.id]}
          <span
            className="whitespace-nowrap font-display text-[1.0625rem] font-black tabular-nums text-cream"
            data-fx={c.id === "ducats" ? "purse" : undefined}
            aria-hidden="true"
          >
            {c.value}
          </span>
        </span>
      ))}
    </div>
  );
}

const PLACE_ICONS: Record<PlaceId, () => ReactNode> = {
  map: Icon.map,
  fondaco: Icon.home,
  porta: Icon.gate,
  company: Icon.banner,
};

/** The bar across the top (a computer). */
export function TopBar({
  p,
  now,
  active,
  onPlace,
  dots,
  portaCasa,
  onHouse,
  onFind,
}: {
  p: EmpirePayload;
  now: number;
  active: PlaceId;
  onPlace: (id: PlaceId) => void;
  dots: Partial<Record<PlaceId, boolean | number>>;
  portaCasa: number | null;
  onHouse: () => void;
  onFind: (target: Target) => void;
}) {
  // The sheets and the scenes stand under the bar (index.css, --topbar).
  useEffect(() => {
    document.documentElement.dataset.topbar = "";
    return () => {
      delete document.documentElement.dataset.topbar;
    };
  }, []);
  const pl = fr.empire.places;
  const names: Record<PlaceId, string> = {
    map: pl.map,
    fondaco: pl.fondaco,
    porta: pl.porta,
    company: pl.company,
  };
  return (
    <header
      className="hud-bar pointer-events-auto fixed inset-x-5 top-5 z-[46] hidden h-[4.5rem] items-center gap-4 rounded-full pl-3.5 pr-3 lg:flex"
      data-top-bar
    >
      <span className="flex shrink-0 items-center gap-2.5 font-display text-[1.375rem] font-black">
        <span className="flex h-11 w-11 -rotate-6 items-center justify-center rounded-2xl bg-face text-white shadow-[0_4px_0_rgb(var(--face-deep))] [&_svg]:h-6 [&_svg]:w-6">
          {Icon.home()}
        </span>
        <span className="max-xl:sr-only">{t.home}</span>
      </span>
      <nav
        aria-label={pl.label}
        className="flex shrink-0 gap-1 rounded-full bg-night-4 p-1"
        data-place-tabs
      >
        {(["map", "fondaco", "porta", "company"] as const).map((id) => {
          const on = id === active;
          const locked = id === "porta" && portaCasa !== null;
          const dot = dots[id];
          return (
            <button
              key={id}
              type="button"
              data-place-tab={id}
              data-locked={locked ? "" : undefined}
              aria-current={on ? "page" : undefined}
              aria-label={locked ? `${names[id]} · ${pl.portaLocked(portaCasa ?? 0)}` : undefined}
              onClick={() => {
                haptic("tap");
                onPlace(id);
              }}
              className={`relative flex h-11 items-center gap-2 rounded-full px-4 font-display text-[0.9375rem] transition-transform active:translate-y-0.5 [&_svg]:h-[18px] [&_svg]:w-[18px] ${on ? "ink-pill font-black" : locked ? "font-extrabold text-cream-dim" : "font-extrabold text-cream"}`}
            >
              {locked ? Icon.lock() : PLACE_ICONS[id]()}
              {names[id]}
              {typeof dot === "number" && dot > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-face px-1 text-[0.6875rem] font-black text-white ring-2 ring-night-4">
                  {dot}
                </span>
              ) : dot === true ? (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-face text-[0.6875rem] font-black text-white ring-2 ring-night-4">
                  !
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>
      <Search p={p} now={now} onFind={onFind} />
      <MoneyPills p={p} />
      <CasaMedal p={p} onClick={onHouse} />
    </header>
  );
}

/** The search of the map: the places of the board by their name, one touch flies there. */
function Search({
  p,
  now,
  onFind,
}: {
  p: EmpirePayload;
  now: number;
  onFind: (target: Target) => void;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  // The places of the board, read again only when the house changes (not at each second).
  // biome-ignore lint/correctness/useExhaustiveDependencies: the board's names change with the view, not the clock
  const places = useMemo(() => {
    const scene = boardOf(p, now);
    const seen = new Set<string>();
    return (scene?.tiles ?? []).flatMap((x) => {
      const pl = x.place;
      if (!pl || pl.plus || pl.quiet || seen.has(pl.name + pl.sub)) return [];
      seen.add(pl.name + pl.sub);
      return [pl];
    });
  }, [p.view]);
  const norm = (s: string) =>
    s
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase();
  const found = q.trim()
    ? places.filter((x) => norm(`${x.name} ${x.sub}`).includes(norm(q.trim()))).slice(0, 6)
    : [];
  const pick = (target: Target) => {
    onFind(target);
    setQ("");
    setOpen(false);
  };
  return (
    <div className="relative min-w-0 flex-1">
      <label className="flex h-12 items-center gap-2.5 rounded-full bg-night-4 px-4">
        <span className="text-cream-dim [&_svg]:h-[18px] [&_svg]:w-[18px]">{Icon.search()}</span>
        <span className="sr-only">{t.searchLabel}</span>
        <input
          type="search"
          value={q}
          placeholder={t.search}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            const first = found[0];
            if (e.key === "Enter" && first) pick(first.target);
            if (e.key === "Escape") setQ("");
          }}
          className="min-w-0 flex-1 bg-transparent text-sm text-cream outline-none placeholder:text-cream-dim"
          data-map-search
        />
      </label>
      {open && q.trim() && (
        <ul className="absolute inset-x-0 top-full z-10 mt-2 overflow-hidden rounded-[1.5rem] bg-night-3 p-1.5 shadow-[0_4px_0_rgb(23_21_15/0.07),0_14px_40px_rgb(23_21_15/0.14)]">
          {found.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-cream-dim">{t.noMatch}</li>
          ) : (
            found.map((x) => (
              <li key={x.id}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(x.target)}
                  className="flex w-full flex-col rounded-[1.1rem] px-3 py-2 text-left hover:bg-night-4"
                >
                  <span className="font-display text-[0.9375rem] font-extrabold text-cream">
                    {x.name}
                  </span>
                  <span className="text-xs text-cream-dim">{x.sub}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

/** Lorenzo in his bubble: what is best done now, and its one key. */
export function LorenzoBubble({
  p,
  busy,
  onCity,
  onCasa,
  onDeliver,
  compact = false,
}: {
  p: EmpirePayload;
  busy: boolean;
  /** The phone's: one bubble, its key inside. */
  compact?: boolean;
  onCity: (city: string) => void;
  onCasa: () => void;
  onDeliver: (city: string, orderIds: string[], vehicleId: string) => void;
}) {
  const best = bestNowOf(p);
  const b = fr.empire.best;
  const line = !best
    ? t.calm
    : best.kind === "casa"
      ? b.casaTo(best.level)
      : b.crates(cityName(best.city), best.crates);
  const kicker = !best
    ? t.lorenzo
    : best.kind === "deliver"
      ? b.ready
      : best.kind === "order"
        ? b.waiting
        : b.casa;
  if (compact)
    return (
      <div className="flex items-end gap-2" data-best-now={best?.kind ?? "none"}>
        <span className="shrink-0 rounded-full bg-night-3 p-0.5 shadow-[0_3px_0_rgb(23_21_15/0.12)]">
          <Lorenzo size={40} />
        </span>
        <div className="hud-bar flex min-w-0 flex-1 items-center gap-2 rounded-[1.4rem] rounded-bl-md py-2 pl-3.5 pr-2">
          <button
            type="button"
            className="min-w-0 flex-1 text-left"
            onClick={() => best && (best.kind === "casa" ? onCasa() : onCity(best.city))}
          >
            <span className="block truncate text-[0.6875rem] font-bold text-cream-dim">
              {kicker}
            </span>
            <span className="line-clamp-2 font-display text-[0.9375rem] font-extrabold leading-snug text-cream">
              {line}
            </span>
          </button>
          {best?.kind === "deliver" && (
            <Slab
              size="sm"
              lead
              busy={busy}
              onClick={() => onDeliver(best.city, best.picks, best.vehicle)}
            >
              {b.deliver}
              <span className="inline-flex items-center gap-0.5">
                <DucatCoin size={18} />+{bare(best.pay.toString())}
              </span>
            </Slab>
          )}
        </div>
      </div>
    );
  return (
    <div className="flex flex-col gap-3" data-best-now={best?.kind ?? "none"}>
      <div className="flex items-end gap-2.5">
        <span className="shrink-0 rounded-full bg-night-3 p-0.5 shadow-[0_3px_0_rgb(23_21_15/0.12)]">
          <Lorenzo size={48} />
        </span>
        <div className="min-w-0 flex-1 rounded-[1.4rem] rounded-bl-md bg-night-4 px-4 py-3">
          <p className="text-xs font-bold text-cream-dim">{kicker}</p>
          <p className="mt-0.5 font-display text-lg font-extrabold leading-snug text-cream">
            {line}
          </p>
        </div>
      </div>
      {best?.kind === "deliver" ? (
        <Slab
          size="lg"
          lead
          busy={busy}
          className="w-full"
          onClick={() => onDeliver(best.city, best.picks, best.vehicle)}
        >
          {b.deliver}
          <span className="inline-flex items-center gap-1 rounded-full bg-white/20 py-0.5 pl-0.5 pr-2.5">
            <DucatCoin size={26} />+{bare(best.pay.toString())}
          </span>
        </Slab>
      ) : best ? (
        <Slab
          size="lg"
          tone="ghost"
          className="w-full"
          onClick={() => (best.kind === "casa" ? onCasa() : onCity(best.city))}
        >
          {b.see}
        </Slab>
      ) : null}
    </div>
  );
}

/** The ring of a round thumbnail: its share, or dashed when nothing runs. */
function Ring({
  share,
  tone,
  dashed = false,
  size = 60,
}: {
  share: number;
  tone: "ink" | "red";
  dashed?: boolean;
  size?: number;
}) {
  const r = 29;
  const c = 2 * Math.PI * r;
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className="absolute inset-0"
      aria-hidden="true"
    >
      <circle cx="32" cy="32" r={r} fill="rgb(var(--night-3))" />
      <circle
        cx="32"
        cy="32"
        r={r}
        fill="none"
        stroke="rgb(var(--line))"
        strokeWidth="4"
        strokeDasharray={dashed ? "6 6" : undefined}
      />
      {share > 0 && (
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke={tone === "red" ? "rgb(var(--face))" : "rgb(var(--cream))"}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${(c * Math.min(1, share)).toFixed(1)} ${c.toFixed(1)}`}
          transform="rotate(-90 32 32)"
        />
      )}
    </svg>
  );
}

/** The panel on the left (a computer): Lorenzo and the workshops. */
export function SidePanel({
  p,
  now,
  busy,
  guide,
  onTarget,
  onPlace,
  portaCasa,
  onCasa,
  onDeliver,
  onAll,
}: {
  p: EmpirePayload;
  now: number;
  busy: boolean;
  /** The tutorial's card, in place of the bubble while it lasts. */
  guide: ReactNode;
  onTarget: (target: Target) => void;
  onPlace: (id: PlaceId) => void;
  portaCasa: number | null;
  onCasa: () => void;
  onDeliver: (city: string, orderIds: string[], vehicleId: string) => void;
  onAll: () => void;
}) {
  const view = p.view;
  if (!view) return null;
  const workshops = [...view.house.workshops].sort((a, b) => {
    const ra = workshopStatus(p, a, now).state === "ready" ? 0 : 1;
    const rb = workshopStatus(p, b, now).state === "ready" ? 0 : 1;
    return ra - rb;
  });
  return (
    <aside
      className="pointer-events-auto fixed left-5 top-28 z-20 hidden max-h-[calc(100dvh-8.25rem)] w-[22rem] flex-col gap-5 overflow-y-auto overscroll-contain rounded-[2.25rem] bg-night-2 p-6 shadow-[var(--lift)] ring-1 ring-line lg:flex"
      data-side-panel
    >
      {guide}
      {/* « Ça t'attend » is gone (the first steps, lot 4): the towns' orders, the plots and the
          Porta read on the map, by their pins. */}
      <section className="min-h-0">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="font-display text-[0.9375rem] font-black">{t.workshops}</h2>
          {workshops.length > 0 && (
            <button type="button" onClick={onAll} className="min-h-11 text-[0.8125rem] font-bold">
              {t.seeAll}
            </button>
          )}
        </div>
        {workshops.length === 0 ? (
          <p className="text-sm text-cream-dim">{t.noWorkshop}</p>
        ) : (
          <ul className="flex flex-col gap-1" data-desk-workshops>
            {workshops.map((w) => {
              const st = workshopStatus(p, w, now);
              const out = Object.keys(recipeOf(p, w)?.outputs ?? {})[0] ?? "";
              const ready = st.state === "ready";
              return (
                <li key={w.id}>
                  <button
                    type="button"
                    onClick={() => onTarget({ kind: "workshop", id: w.id })}
                    data-desk-workshop={w.id}
                    className={`flex w-full items-center gap-3.5 rounded-[1.5rem] py-2 pl-2 pr-3 text-left transition active:translate-y-0.5 ${ready ? "bg-face/10" : "hover:bg-night-4"}`}
                  >
                    <span className="relative flex h-[3.75rem] w-[3.75rem] shrink-0 items-center justify-center">
                      <Ring
                        share={ready ? 1 : st.state === "running" ? st.progress : 0}
                        tone={ready ? "red" : "ink"}
                        dashed={st.state === "blocked" || st.state === "idle"}
                      />
                      <span className="relative">
                        <GoodsMark code={out} size={28} />
                      </span>
                      {ready && (
                        <span className="absolute -right-1.5 -top-1 rotate-6 rounded-full bg-face px-1.5 font-display text-xs font-black leading-5 text-white ring-2 ring-white">
                          {t.ready(st.lots)}
                        </span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-display text-base font-extrabold text-cream">
                        {buildingName(p, w.type)}
                      </span>
                      <span className="block truncate text-xs text-cream-dim">
                        {st.state === "ready"
                          ? `${t.level(w.level)} · ${goodName(p, st.good)}`
                          : st.state === "running"
                            ? t.running(clock(st.left))
                            : st.state === "blocked"
                              ? t.blocked(goodName(p, st.resource))
                              : t.idle}
                      </span>
                    </span>
                    <span className="flex gap-0.5" aria-label={t.level(w.level)}>
                      {Array.from({ length: Math.max(5, w.level) }, (_, i) => (
                        <span
                          // biome-ignore lint/suspicious/noArrayIndexKey: dots alike
                          key={i}
                          className={`h-2 w-2 rounded-full ${i < w.level ? "bg-cream" : "bg-line"}`}
                        />
                      ))}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </aside>
  );
}

/** The Remise at the foot (a computer): the goods in store, a ring for what the next Casa asks. */
export function RemiseBar({
  p,
  onGood,
  onStore,
}: {
  p: EmpirePayload;
  onGood: (good: string) => void;
  /** The whole Warehouse, from its name. */
  onStore?: () => void;
}) {
  const view = p.view;
  if (!view) return null;
  const need = view.nextCasa?.materials ?? {};
  const goods = Object.entries(p.stock)
    .filter(([g, n]) => n > 0 && !g.includes(":"))
    .sort((a, b) => Number(b[0] in need) - Number(a[0] in need) || b[1] - a[1])
    .slice(0, 5);
  return (
    <section
      aria-label={t.remise}
      className="hud-bar pointer-events-auto fixed bottom-5 left-[26.5rem] z-20 hidden h-[5.25rem] max-w-[calc(100vw-26.5rem-30rem)] items-center gap-2.5 overflow-hidden rounded-full px-3 lg:flex"
      data-remise-bar
    >
      <button
        type="button"
        onClick={onStore}
        className="flex h-11 shrink-0 items-center gap-1 rounded-full px-2 font-display text-[0.9375rem] font-black active:translate-y-0.5"
        data-store-open
      >
        {t.remise}
        <span className="text-cream-dim [&_svg]:h-4 [&_svg]:w-4">{Icon.chevronRight()}</span>
      </button>
      {goods.length === 0 && <span className="pr-3 text-sm text-cream-dim">{t.emptyRemise}</span>}
      {goods.map(([g, n]) => {
        const want = need[g] ?? 0;
        const full = want > 0 && n >= want;
        return (
          <button
            key={g}
            type="button"
            onClick={() => onGood(g)}
            className={`flex h-[3.75rem] shrink-0 items-center gap-2.5 rounded-full py-2 pl-2 pr-4 text-left transition active:translate-y-0.5 ${full ? "bg-face/10" : "bg-night-4"}`}
          >
            <span className="relative flex h-11 w-11 items-center justify-center">
              <Ring
                share={want > 0 ? n / want : 0}
                tone={full ? "red" : "ink"}
                dashed={want === 0}
                size={44}
              />
              <span className="relative">
                <GoodsMark code={g} size={24} />
              </span>
            </span>
            <span>
              <span className="block font-display text-base font-black leading-tight tabular-nums">
                {want > 0 ? `${Math.min(n, want)}/${want}` : n}
              </span>
              <span className="block text-[0.6875rem] text-cream-dim">
                {goodName(p, g)}
                {want > 0 ? ` · ${t.forCasa(view.house.casa + 1)}` : ""}
              </span>
            </span>
          </button>
        );
      })}
    </section>
  );
}

/** The zoom on the right (a computer): back to the fondaco, nearer, farther. */
export function MapControls({
  onRecenter,
  onZoom,
}: {
  onRecenter: () => void;
  onZoom: (k: number) => void;
}) {
  const key =
    "hud-bar flex h-14 w-14 items-center justify-center rounded-[1.25rem] text-cream transition active:translate-y-0.5 [&_svg]:h-5 [&_svg]:w-5";
  return (
    <div
      className="pointer-events-auto fixed right-5 top-28 z-20 hidden flex-col gap-2.5 lg:flex"
      data-map-controls
    >
      <button type="button" aria-label={t.recenter} className={key} onClick={onRecenter}>
        {Icon.compass()}
      </button>
      <button type="button" aria-label={t.zoomIn} className={key} onClick={() => onZoom(1.25)}>
        {Icon.plus()}
      </button>
      <button type="button" aria-label={t.zoomOut} className={key} onClick={() => onZoom(0.8)}>
        {Icon.minus()}
      </button>
    </div>
  );
}
