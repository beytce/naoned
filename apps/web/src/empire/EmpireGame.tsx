import { useCallback, useEffect, useRef, useState } from "react";
import { type Account, ApiError } from "../api.js";
import { BuildingArt } from "../art/buildings.js";
import { GoodsMark } from "../art/goods.js";
import { d, hourOf, minutesLabel } from "../game/format.js";
import { FxLayer, flyCoins, flyGoods } from "../game/fx.js";
import { connectLive } from "../game/live.js";
import { TabBar } from "../game/map/TabBar.js";
import { Icon } from "../game/map/icons.js";
import { haptic } from "../haptics.js";
import { fr } from "../i18n.js";
import { sound } from "../sound.js";
import { Badge, Label, Ribbon, Sheet, Slab, Stat, clock } from "../ui.js";
import { suppliable } from "./Company.js";
import { CompanySheet } from "./CompanyTab.js";
import { HouseSheet, Intro, NextStepCard } from "./Guide.js";
import { ArteSection, FamilySheet, Knowledge, WorkshopIdentity } from "./Identity.js";
import { MarketSheet } from "./Market.js";
import { CasaMoment } from "./Moment.js";
import { EmpireOrbit } from "./Orbit.js";
import { GoodSheet, ResourceBar } from "./Resources.js";
import { Arsenal } from "./Sea.js";
import { Term } from "./Term.js";
import { RegionPlace, Scuola, VoyageSheet, WorldMap, regionName } from "./World.js";
import { type EmpireAnswer, empireApi } from "./api.js";
import {
  activeEmpireTab,
  affordable,
  buildingName,
  casaReached,
  daysOfIncome,
  queueEnd,
  readyLots,
  recipeOf,
  sitesByEnd,
  wantsRelaunch,
} from "./logic.js";
import { nextStep } from "./next.js";
import type { EmpireAction, EmpireBuild, EmpirePayload } from "./types.js";

type SheetId =
  | "workshops"
  | "casa"
  | "market"
  | "company"
  | "new"
  | "away"
  | "family"
  | "house"
  | `workshop:${string}`
  | `new:${string}`
  | `voyage:${string}`;

const t = fr.empire;
const unknownError = fr.errors.unknown ?? "";
const goodName = (p: EmpirePayload, code: string) =>
  fr.themeNames.resource[code] ?? p.goods[code] ?? code;

/**
 * The persistent empire (CADRAGE-v3, the socle): Venetia alone, the Casa and its workshops in
 * orbit, the building sites, the store and the Carnet of the week. Lagune: three depths (the map,
 * the place up close, the sheet below) and one gold action.
 */
export function EmpireGame({ account, first }: { account: Account; first: EmpireAnswer }) {
  const [p, setP] = useState<EmpireAnswer>(first);
  const skew = useRef(first.now - Date.now());
  const [now, setNow] = useState(first.now);
  const [sheet, setSheet] = useState<SheetId | null>(first.view?.away ? "away" : null);
  // The map's depth: null for the map zoomed out, a region's code for the place up close.
  const [place, setPlace] = useState<string | null>("veneto");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  // The good opened from the resource bar, and the recipe the next step points at.
  const [good, setGood] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<string | null>(null);
  // The Casa reached since the last view: its moment.
  const [moment, setMoment] = useState<number | null>(null);
  const last = useRef<EmpireAnswer | null>(first);

  const take = useCallback((next: EmpireAnswer) => {
    const reached = casaReached(last.current, next);
    if (reached) setMoment(reached);
    last.current = next;
    skew.current = next.now - Date.now();
    setP(next);
    if (next.error) setToast(t.errors[next.error] ?? unknownError);
  }, []);
  const refresh = useCallback(async () => {
    const next = await empireApi.view().catch(() => null);
    if (next && next.kind === "empire") take(next);
  }, [take]);

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now() + skew.current), 1000);
    const poll = setInterval(() => void refresh(), 30_000);
    const stop = connectLive(
      (m) => {
        if (m.type === "changed") void refresh();
      },
      () => undefined,
    );
    return () => {
      clearInterval(tick);
      clearInterval(poll);
      stop();
    };
  }, [refresh]);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(id);
  }, [toast]);

  const act = async (a: EmpireAction) => {
    setBusy(true);
    try {
      const answer = await empireApi.act(a);
      if (!answer.error) feel(p, answer);
      take(answer);
    } catch (err) {
      setToast(err instanceof ApiError ? (t.errors[err.code] ?? unknownError) : unknownError);
    } finally {
      setBusy(false);
    }
  };
  const join = async () => {
    setBusy(true);
    try {
      take(await empireApi.join());
    } catch {
      setToast(unknownError);
    } finally {
      setBusy(false);
    }
  };

  if (!p.joined || !p.view)
    return <Founding busy={busy} onJoin={join} name={account.pseudo ?? ""} />;
  const view = p.view;
  const tab = activeEmpireTab(sheet, place);
  const close = () => setSheet(null);

  // The one gold action: what the house needs most now.
  const next = view.nextCasa;
  const canCasa =
    next?.requirementMet === true &&
    affordable(p.cash, next.cost) &&
    Object.entries(next.materials).every(([g, n]) => (p.stock[g] ?? 0) >= n) &&
    view.house.builds.length < view.buildSlots &&
    !view.house.builds.some((b) => b.kind === "casa");
  const relaunch = wantsRelaunch(p, now);

  return (
    <div className="fixed inset-0 overflow-hidden bg-night">
      <div className="flex h-full flex-col overflow-y-auto px-4 pb-[calc(var(--tabbar)+1rem)] pt-[max(0.75rem,env(safe-area-inset-top))]">
        <header className="mx-auto flex w-full max-w-md items-start justify-between gap-3">
          <button
            type="button"
            className="min-w-0 text-left"
            onClick={() => setSheet("house")}
            data-house-header
          >
            <p className="font-mono text-xs uppercase tracking-[0.12em] text-cream-dim">
              {t.hud.casa(view.house.casa)} · {t.hud.more}
            </p>
            <p className="truncate font-display text-lg font-extrabold text-cream">
              {account.pseudo ?? t.title}
            </p>
          </button>
          <div className="text-right">
            <p
              className="font-display text-xl font-extrabold tabular-nums text-gold"
              data-fx="purse"
            >
              {d(p.cash)}
            </p>
            <p className="text-xs text-cream-dim">
              <Term code="income">{t.hud.income(d(view.incomePerDay))}</Term>
            </p>
          </div>
        </header>

        <ResourceBar p={p} onGood={setGood} />
        {place === "veneto" && (
          <NextStepCard
            p={p}
            now={now}
            step={nextStep(p, now)}
            busy={busy}
            act={act}
            onBuild={(recipe) => {
              setHighlight(recipe);
              setSheet("new");
            }}
          />
        )}
        {place !== null && (
          // The place's head (Lagune): the way back to the map, the place's name.
          <div className="mx-auto mt-3 flex w-full max-w-md items-center gap-2">
            <button
              type="button"
              onClick={() => setPlace(null)}
              aria-label={t.world.back}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-line text-lg text-cream active:scale-95"
            >
              ‹
            </button>
            <span className="font-place text-base font-bold uppercase tracking-[0.2em] text-cream">
              {regionName(place)}
            </span>
          </div>
        )}
        {place === null ? (
          <section className="mx-auto mt-4 w-full max-w-md">
            <Label>{t.world.map}</Label>
            <WorldMap p={p} now={now} onPlace={setPlace} />
            <Arsenal p={p} now={now} busy={busy} act={act} />
          </section>
        ) : place === "veneto" ? (
          <section className="mx-auto mt-2 w-full max-w-md">
            <EmpireOrbit
              p={p}
              now={now}
              busy={busy}
              act={act}
              onWorkshop={(id) => setSheet(`workshop:${id}`)}
              onCasa={() => setSheet("casa")}
              onFree={() => setSheet("new")}
            />
          </section>
        ) : null}
        {place === "veneto" && (
          <>
            <Sites p={p} now={now} />
            <div className="mx-auto mt-3 w-full max-w-md">
              <Slab size="sm" tone="ghost" className="w-full" onClick={() => setSheet("workshops")}>
                {t.nav.allWorkshops}
              </Slab>
            </div>
          </>
        )}
        {place !== null && (
          <RegionPlace
            p={p}
            code={place}
            now={now}
            busy={busy}
            act={act}
            onBuild={() => setSheet(`new:${place}`)}
            onConvoy={() => setSheet(`voyage:${place}`)}
          />
        )}
      </div>

      {toast && (
        <output className="absolute inset-x-4 top-4 z-50 mx-auto block max-w-sm animate-fade bg-night-4 px-4 py-3 text-center text-sm text-cream shadow-lg slab">
          {toast}
        </output>
      )}

      <WorkshopsSheet
        p={p}
        now={now}
        sheet={sheet}
        busy={busy}
        onClose={close}
        onOpen={setSheet}
        act={act}
      />
      <NewWorkshopSheet
        p={p}
        highlight={highlight}
        open={sheet === "new" || sheet?.startsWith("new:") === true}
        region={sheet?.startsWith("new:") ? sheet.slice(4) : "veneto"}
        busy={busy}
        onClose={close}
        act={act}
      />
      {sheet?.startsWith("voyage:") && (
        <VoyageSheet
          p={p}
          from={sheet.slice("voyage:".length)}
          open
          busy={busy}
          onClose={close}
          act={act}
        />
      )}
      <CasaSheet
        p={p}
        open={sheet === "casa"}
        busy={busy}
        canCasa={canCasa}
        onClose={close}
        act={act}
      />
      <MarketSheet
        p={p}
        now={now}
        open={sheet === "market"}
        busy={busy}
        onClose={close}
        onGood={setGood}
        act={act}
      />
      <CompanySheet
        p={p}
        now={now}
        open={sheet === "company"}
        busy={busy}
        calls={{
          carnet: claimable(p),
          company: suppliable(p, account.id) > 0,
          terra: terraCalls(p, now),
        }}
        onClose={close}
        act={act}
      />
      <FamilySheet p={p} open={sheet === "family"} busy={busy} onClose={close} act={act}>
        <ArteSection p={p} busy={busy} act={act} />
        <Scuola p={p} busy={busy} act={act} />
        <Knowledge p={p} busy={busy} act={act} />
      </FamilySheet>
      <GoodSheet p={p} good={good} busy={busy} onClose={() => setGood(null)} act={act} />
      <HouseSheet p={p} open={sheet === "house"} onClose={close} />
      <Intro p={p} />
      <FxLayer />
      {moment !== null && (
        <CasaMoment
          level={moment}
          opens={p.casa.find((c) => c.level === moment)?.opens ?? []}
          onClose={() => setMoment(null)}
        />
      )}
      <AwaySheet p={p} open={sheet === "away"} busy={busy} onClose={close} act={act} />

      <TabBar
        active={tab}
        labels={{
          workshops: t.nav.home,
          venice: t.nav.market,
          map: t.nav.world,
          ranking: t.nav.company,
          conquest: t.nav.family,
        }}
        items={[
          {
            id: "workshops",
            icon: Icon.home,
            // The house: a sheet closes, and the Venetia comes back up close.
            onClick: () => {
              close();
              setPlace("veneto");
            },
            dot: relaunch || canCasa,
          },
          { id: "venice", icon: Icon.rialto, onClick: () => setSheet("market") },
          {
            id: "map",
            icon: Icon.map,
            onClick: () => {
              close();
              setPlace(null);
            },
          },
          {
            id: "ranking",
            icon: Icon.banner,
            onClick: () => setSheet("company"),
            dot: claimable(p) || suppliable(p, account.id) > 0 || terraCalls(p, now),
          },
          {
            id: "conquest",
            icon: Icon.family,
            onClick: () => setSheet("family"),
            dot: familyCalls(p),
          },
        ]}
      />
    </div>
  );
}

/** The week's Terraferma calls: entries open and the house in no theatre yet. */
const terraCalls = (p: EmpirePayload, now: number) => {
  const tv = p.view?.terra;
  return (
    !!tv && !tv.contesa && !tv.theatre && tv.placementUntil !== null && now < tv.placementUntil
  );
};

/**
 * The gesture answers (lot A of the UX audit): the goods gained fly to the resource bar, the
 * ducats to the purse, with the sound and the touch of the monthly game.
 */
function feel(before: EmpirePayload, after: EmpirePayload) {
  const gains: Record<string, number> = {};
  for (const [g, n] of Object.entries(after.stock)) {
    const more = n - (before.stock[g] ?? 0);
    if (more > 0 && !g.includes(":")) gains[g] = more;
  }
  const coins = BigInt(after.cash) - BigInt(before.cash);
  if (Object.keys(gains).length > 0) {
    flyGoods(gains);
    sound("harvest");
  }
  if (coins > 0n) {
    flyCoins(coins);
    sound("coin");
  }
  if (coins > 0n || Object.keys(gains).length > 0) haptic("success");
}

/** A trait to take or a path to choose waits in the family. */
const familyCalls = (p: EmpirePayload) => {
  const id = p.view?.identity;
  return (
    !!id &&
    (id.family.heritage > id.family.lineage.length || id.staff.members.some((m) => m.tiersOpen > 0))
  );
};

const claimable = (p: EmpirePayload) =>
  [...(p.view?.carnet.objectives ?? []), ...(p.view?.carnet.carried ?? [])].some(
    (o) => !o.claimed && o.progress >= o.target,
  );

function Founding({ busy, onJoin, name }: { busy: boolean; onJoin: () => void; name: string }) {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-5 bg-night px-6 text-center">
      <Label>{t.join.kicker}</Label>
      <h1 className="font-display text-3xl font-extrabold text-cream">{t.join.title}</h1>
      {name && <p className="font-display text-lg text-gold">{name}</p>}
      <p className="max-w-sm text-cream-dim">{t.join.text}</p>
      <Slab tone="gold" size="lg" busy={busy} onClick={onJoin}>
        {t.join.action}
      </Slab>
    </main>
  );
}

function siteLabel(p: EmpirePayload, b: EmpireBuild): string {
  if (b.kind === "casa") return t.sites.casa(b.level);
  if (b.kind === "newWorkshop") return t.sites.newWorkshop(buildingName(p, b.workshopType ?? ""));
  if (b.kind === "ship")
    return t.sites.ship(t.vehicleNames[b.vehicleType ?? ""] ?? b.vehicleType ?? "");
  const ws = p.view?.house.workshops.find((w) => w.id === b.workshopId);
  return t.sites.upgrade(buildingName(p, ws?.type ?? ""), b.level);
}

/** The building sites under way, each with its time left, and the free ones. */
function Sites({ p, now }: { p: EmpirePayload; now: number }) {
  const view = p.view;
  if (!view) return null;
  const sites = sitesByEnd(view.house.builds);
  const free = view.buildSlots - sites.length;
  return (
    <section className="mx-auto mt-2 w-full max-w-md">
      <div className="flex items-baseline justify-between">
        <Label>{t.sites.title}</Label>
        <span className="text-xs text-cream-dim">{free > 0 ? t.sites.free(free) : ""}</span>
      </div>
      {sites.length === 0 ? (
        <p className="mt-1 text-sm text-cream-dim">{t.sites.none}</p>
      ) : (
        <ul className="mt-1 space-y-2">
          {sites.map((b) => (
            <li
              key={`${b.kind}:${b.workshopId ?? ""}:${b.level}`}
              className="cut bg-night-2 px-3 py-2 ring-1 ring-inset ring-line/70"
            >
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="truncate text-cream">{siteLabel(p, b)}</span>
                <span className="font-display font-bold tabular-nums text-cream">
                  {clock(b.endsAt - now)}
                </span>
              </div>
              <Ribbon value={(now - b.startedAt) / Math.max(1, b.endsAt - b.startedAt)} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

interface SheetProps {
  p: EmpirePayload;
  busy: boolean;
  onClose: () => void;
  act: (a: EmpireAction) => Promise<void>;
}

/** The Ateliers tab: each workshop, then the store and Venetia's market. */
function WorkshopsSheet({
  p,
  now,
  sheet,
  busy,
  onClose,
  onOpen,
  act,
}: SheetProps & { now: number; sheet: SheetId | null; onOpen: (s: SheetId) => void }) {
  const view = p.view;
  if (!view) return null;
  const focus = sheet?.startsWith("workshop:") ? sheet.slice("workshop:".length) : null;
  const list = focus ? view.house.workshops.filter((w) => w.id === focus) : view.house.workshops;
  const one = list[0];
  return (
    <Sheet
      open={sheet === "workshops" || focus !== null}
      onClose={onClose}
      docked={focus === null}
      kicker={t.region}
      title={focus && one ? buildingName(p, one.type) : t.tabs.workshops}
      summary={t.workshop.queueRule}
    >
      <ul className="space-y-3">
        {list.map((ws) => {
          const r = recipeOf(p, ws);
          const ready = readyLots(ws, now);
          const end = queueEnd(ws);
          const up = view.upgrades[ws.id] ?? null;
          const building = view.house.builds.some((b) => b.workshopId === ws.id);
          return (
            <li key={ws.id} className="cut bg-night-2 p-3 ring-1 ring-inset ring-line/70">
              <div className="flex items-center gap-3">
                <BuildingArt
                  type={ws.type}
                  active={!!end && end > now}
                  className="h-14 w-20 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display font-bold text-cream">
                    {buildingName(p, ws.type)}
                  </p>
                  <p className="text-xs text-cream-dim">
                    {t.workshop.level(ws.level)} ·{" "}
                    {ready > 0
                      ? t.workshop.ready(ready)
                      : end && end > now
                        ? t.workshop.queue(hourOf(end))
                        : t.workshop.idle}
                  </p>
                </div>
                {!focus && (
                  <button
                    type="button"
                    className="text-xs text-gold underline"
                    onClick={() => onOpen(`workshop:${ws.id}`)}
                  >
                    {t.workshop.open}
                  </button>
                )}
              </div>
              {/* The night queue as a ribbon: its share of the 12 hours still to run. */}
              {end && end > now && <Ribbon value={Math.min(1, (end - now) / (12 * 3_600_000))} />}
              {r && (
                <p className="mt-2 text-xs text-cream-dim">
                  {t.workshop.makes}{" "}
                  {Object.entries(r.outputs)
                    .map(([g, n]) => `${n} ${goodName(p, g)}`)
                    .join(", ")}
                  {Object.keys(r.inputs).length > 0 &&
                    ` · ${t.workshop.from} ${Object.entries(r.inputs)
                      .map(([g, n]) => `${n} ${goodName(p, g)}`)
                      .join(", ")}`}
                  {` · ${minutesLabel(r.minutes)}`}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <Slab
                  size="sm"
                  tone="ghost"
                  busy={busy}
                  onClick={() => void act({ type: "empireRelaunch", workshopId: ws.id })}
                >
                  {t.workshop.relaunch}
                </Slab>
                {building ? (
                  <Badge>{t.workshop.building}</Badge>
                ) : up ? (
                  <Slab
                    size="sm"
                    tone="ghost"
                    busy={busy}
                    disabled={!affordable(p.cash, up.cost)}
                    onClick={() => void act({ type: "empireUpgrade", workshopId: ws.id })}
                  >
                    {t.workshop.upgrade(up.level)} ·{" "}
                    {t.workshop.upgradeCost(d(up.cost), minutesLabel(up.minutes))}
                  </Slab>
                ) : (
                  <Badge>{t.workshop.atCasaShort}</Badge>
                )}
              </div>
              {focus && <WorkshopIdentity p={p} ws={ws} busy={busy} act={act} />}
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}

function NewWorkshopSheet({
  p,
  open,
  region,
  highlight,
  busy,
  onClose,
  act,
}: SheetProps & { open: boolean; region: string; highlight: string | null }) {
  const view = p.view;
  const r = view?.regions.find((x) => x.code === region);
  const here = (view?.house.workshops ?? []).filter(
    (w) => (w.region ?? "veneto") === region,
  ).length;
  const pending = (view?.house.builds ?? []).filter(
    (b) => b.kind === "newWorkshop" && (b.region ?? "veneto") === region,
  ).length;
  const site =
    region === "veneto"
      ? (view?.newWorkshop ?? null)
      : r && here + pending < r.workshopSlots
        ? (view?.workshopSite ?? null)
        : null;
  // Beyond Venetia, a workshop makes no raw good its region does not make.
  const allowed = (outputs: Record<string, number>, inputs: Record<string, number>) =>
    region === "veneto" ||
    Object.keys(inputs).length > 0 ||
    Object.keys(outputs).some((g) => r?.produces.includes(g));
  return (
    <Sheet
      open={open}
      onClose={onClose}
      kicker={t.workshop.newTitle}
      title={regionName(region)}
      summary={site ? undefined : t.workshop.noRoom}
    >
      {site && (
        <ul className="space-y-2">
          {[...p.catalog]
            // The workshop the next step points at comes first, its button in gold.
            .sort(
              (a, b) =>
                Number(b.recipes.some((r) => r.code === highlight)) -
                Number(a.recipes.some((r) => r.code === highlight)),
            )
            .flatMap((b) =>
              b.recipes
                .filter((x) => allowed(x.outputs, x.inputs))
                .map((r) => (
                  <li key={r.code} className="flex items-center gap-3 border-b border-line/60 pb-2">
                    <GoodsMark code={Object.keys(r.outputs)[0] ?? ""} size={28} />
                    <span className="flex-1 text-sm text-cream">
                      {b.name}
                      <span className="block text-xs text-cream-dim">
                        {Object.entries(r.outputs)
                          .map(([g, n]) => `${n} ${goodName(p, g)}`)
                          .join(", ")}
                        {Object.keys(r.inputs).length > 0 &&
                          ` · ${t.workshop.from} ${Object.entries(r.inputs)
                            .map(([g, n]) => `${n} ${goodName(p, g)}`)
                            .join(", ")}`}
                      </span>
                    </span>
                    <Slab
                      size="sm"
                      tone={r.code === highlight ? "gold" : "ghost"}
                      busy={busy}
                      disabled={!affordable(p.cash, site.cost)}
                      onClick={() => {
                        void act({
                          type: "empireBuildWorkshop",
                          workshopType: b.type,
                          recipe: r.code,
                          ...(region !== "veneto" ? { region } : {}),
                        }).then(onClose);
                      }}
                    >
                      {t.workshop.newAction(d(site.cost))}
                    </Slab>
                  </li>
                )),
            )}
        </ul>
      )}
    </Sheet>
  );
}

/** The Casa tab: the next step, its cost in days of income, its materials, what it asks and opens. */
function CasaSheet({
  p,
  open,
  busy,
  canCasa,
  onClose,
  act,
}: SheetProps & { open: boolean; canCasa: boolean }) {
  const view = p.view;
  if (!view) return null;
  const next = view.nextCasa;
  const days = next ? daysOfIncome(next.cost, view.incomePerDay) : null;
  const opensName = (code: string) => t.casa.opensNames[code] ?? code;
  return (
    <Sheet
      open={open}
      onClose={onClose}
      docked
      kicker={t.casa.kicker}
      title={t.casa.title(view.house.casa)}
      summary={next ? undefined : t.casa.top}
    >
      {next && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Stat label={t.casa.cost} value={d(next.cost)} tone="gold" />
            <Stat label={t.casa.site} value={minutesLabel(next.minutes)} />
          </div>
          <p className="text-sm text-cream-dim">
            {days === null ? t.casa.noIncome : t.casa.days(days.toLocaleString())}
          </p>
          {next.cutBps > 0 && (
            <Badge tone="lagoon">{t.casa.knowledge(Math.round(next.cutBps / 100))}</Badge>
          )}
          {Object.keys(next.materials).length > 0 && (
            <div>
              <Label>{t.casa.materials}</Label>
              <ul className="mt-1 flex flex-wrap gap-3">
                {Object.entries(next.materials).map(([g, n]) => (
                  <li
                    key={g}
                    className={`flex items-center gap-1.5 text-sm ${(p.stock[g] ?? 0) >= n ? "text-cream" : "text-vermilion"}`}
                  >
                    <GoodsMark code={g} size={20} />
                    {Math.min(p.stock[g] ?? 0, n)}/{n} {goodName(p, g)}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {next.requires.workshops > 0 && (
            <p className={`text-sm ${next.requirementMet ? "text-cream-dim" : "text-vermilion"}`}>
              {t.casa.requires(next.requires.workshops, next.requires.level)}
              {!next.requirementMet && ` · ${t.casa.requiresMissing}`}
            </p>
          )}
          {next.opens.length > 0 && (
            <div>
              <Label>{t.casa.opens}</Label>
              <p className="mt-1 text-sm text-cream">{next.opens.map(opensName).join(" · ")}</p>
            </div>
          )}
          {view.house.builds.some((b) => b.kind === "casa") ? (
            <p className="text-sm text-cream-dim">{t.casa.busy}</p>
          ) : (
            <Slab
              tone="gold"
              size="lg"
              className="w-full"
              busy={busy}
              disabled={!canCasa}
              onClick={() => void act({ type: "empireBuildCasa" })}
            >
              {t.casa.action(next.level)}
            </Slab>
          )}
        </div>
      )}
    </Sheet>
  );
}

/** The merchant's return: what the queues made and the sites that ended while away. */
function AwaySheet({ p, open, busy, onClose, act }: SheetProps & { open: boolean }) {
  const away = p.view?.away;
  if (!away) return null;
  const ready = Object.entries(away.ready).filter(([, n]) => n > 0);
  return (
    <Sheet open={open} onClose={onClose} kicker={t.away.kicker} title={t.away.title}>
      {ready.length > 0 && (
        <>
          <Label>{t.away.ready}</Label>
          <ul className="mt-1 flex flex-wrap gap-3">
            {ready.map(([g, n]) => (
              <li key={g} className="flex items-center gap-1.5 text-sm text-cream">
                <GoodsMark code={g} size={22} /> {n} {goodName(p, g)}
              </li>
            ))}
          </ul>
        </>
      )}
      {away.sitesDone > 0 && (
        <p className="mt-3 text-sm text-cream">{t.away.sites(away.sitesDone)}</p>
      )}
      <Slab
        tone="gold"
        size="lg"
        className="mt-4 w-full"
        busy={busy}
        onClick={() => {
          void act({ type: "empireRelaunchAll" }).then(onClose);
        }}
      >
        {t.away.action}
      </Slab>
    </Sheet>
  );
}
