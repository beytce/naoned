import type { ReactNode } from "react";
import { GoodsMark } from "../art/goods.js";
import { DucatCoin } from "../art/plateau/coins.js";
import { amount, d } from "../game/format.js";
import { Icon } from "../game/map/icons.js";
import { fr } from "../i18n.js";
import { Sheet, Slab } from "../ui.js";
import { regionName } from "./World.js";
import { affordable } from "./logic.js";
import { pct, terroirBonus } from "./terroir.js";
import type { EmpireAction, EmpirePayload } from "./types.js";

const t = fr.empire;

/**
 * On square tiles (docs/plan-porcellana.md D7), the house's free tile of a region nearest its
 * fondaco: owned, no town, no place, no workshop, no site on it. Null when there is none.
 */
export function freeTileOf(p: EmpirePayload, region: string): string | null {
  const map = p.view?.map;
  const house = p.view?.house;
  if (!map || !house || map.grid !== "square") return null;
  const size = map.tileSize ?? 15;
  const at = (x: number, y: number) => `${Math.floor(x / size)},${Math.floor(y / size)}`;
  const taken = new Set<string>([
    ...map.cities.map((c) => at(c.x, c.y)),
    at(map.home.x, map.home.y),
    ...map.posts.map((q) => at(q.x, q.y)),
    ...[map.depot, map.camp, map.arsenal].filter((c): c is string => !!c),
    ...house.workshops.map((w) => w.tile).filter((c): c is string => !!c),
    ...map.sites.map((s) => s.cell),
    ...(house.builds ?? []).map((b) => b.cell).filter((c): c is string => !!c),
  ]);
  const [hi = 0, hj = 0] = at(map.home.x, map.home.y).split(",").map(Number);
  const far = (k: string) => {
    const [i = 0, j = 0] = k.split(",").map(Number);
    return Math.abs(i - hi) + Math.abs(j - hj);
  };
  return (
    map.unlocked
      .filter((k) => map.cells[k]?.region === region && !taken.has(k))
      .sort((a, b) => far(a) - far(b) || a.localeCompare(b))[0] ?? null
  );
}
const goodName = (p: EmpirePayload, code: string) =>
  fr.themeNames.resource[code] ?? p.goods[code] ?? code;

/**
 * The workshops a region may take, each with its button (the one the next step points at first,
 * in gold); none when its places are full.
 */
export function NewWorkshopList({
  p,
  region,
  highlight,
  busy,
  onDone,
  act,
  tile,
}: {
  p: EmpirePayload;
  region: string;
  highlight: string | null;
  busy: boolean;
  onDone: () => void;
  act: (a: EmpireAction) => Promise<unknown>;
  /** On square tiles, the tile chosen on the map; else the free one nearest the fondaco. */
  tile?: string;
}) {
  const view = p.view;
  // The welcome's first workshop comes first, in gold, wherever the list was opened (lot 2).
  if (!highlight && view?.welcome && !view.house.welcome?.built)
    highlight = view.welcome.workshop.recipe;
  const square = view?.map.grid === "square";
  const at = square ? (tile ?? freeTileOf(p, region)) : undefined;
  if (square && !at) return <p className="text-sm text-cream-dim">{t.porcellana.noFreeTile}</p>;
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
  // No room: the workshops stay in sight, each with its lock (the first steps, lot 5).
  return (
    <>
      {
        <ul className="space-y-1">
          {/* A stable order (P1-07): the workshop the next step points at is lit in place. */}
          {[...p.catalog].flatMap((b) =>
            b.recipes
              .filter((x) => allowed(x.outputs, x.inputs))
              .map((r) => (
                <li
                  key={r.code}
                  data-build-recipe={r.code}
                  ref={
                    r.code === highlight
                      ? (el) => el?.scrollIntoView({ block: "nearest" })
                      : undefined
                  }
                  className={`flex items-center gap-3 rounded-[1.4rem] p-2 ${r.code === highlight ? "bg-face/10" : ""}`}
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-night-4">
                    <GoodsMark code={Object.keys(r.outputs)[0] ?? ""} size={28} />
                  </span>
                  <span className="flex-1 text-sm text-cream">
                    <span className="font-display text-base font-extrabold">{b.name}</span>
                    {terroirBonus(p, at ?? undefined, b.type) > 0 && (
                      // Its land: it yields more on this tile (the terroirs).
                      <span
                        className="ml-2 inline-block whitespace-nowrap rounded-full bg-face/15 px-2 py-0.5 align-middle text-[0.6875rem] font-bold text-cream"
                        data-terroir-tag
                      >
                        {t.terroir.tag(pct(terroirBonus(p, at ?? undefined, b.type)))}
                      </span>
                    )}
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
                  {!site ? (
                    <LockChip text={t.workshop.fullPlaces} />
                  ) : (
                    <Slab
                      size="sm"
                      label={t.workshop.newAction(d(site.cost))}
                      tone={r.code === highlight ? "gold" : "ghost"}
                      busy={busy}
                      disabled={!affordable(p.cash, site.cost)}
                      onClick={() => {
                        void act({
                          type: "empireBuildWorkshop",
                          workshopType: b.type,
                          recipe: r.code,
                          ...(region !== "veneto" ? { region } : {}),
                          ...(at ? { tile: at } : {}),
                        }).then(onDone);
                      }}
                    >
                      {t.workshop.newVerb}
                      <span className="inline-flex items-center gap-1">
                        <DucatCoin size={20} />
                        {amount(site.cost)}
                      </span>
                    </Slab>
                  )}
                </li>
              )),
          )}
        </ul>
      }
    </>
  );
}

/** A lock and the condition that opens it (the first steps, lot 5). */
function LockChip({ text }: { text: string }) {
  return (
    <span
      className="flex shrink-0 items-center gap-1 rounded-full bg-night-4 px-2.5 py-1 text-xs font-bold text-cream-dim [&_svg]:h-3.5 [&_svg]:w-3.5"
      data-lock
    >
      {Icon.lock()}
      {text}
    </span>
  );
}

type PlaceRow = {
  id: "depot" | "camp" | "porta" | "post";
  icon: () => ReactNode;
  name: string;
  what: string;
  state:
    | { kind: "build"; cost: string; action: EmpireAction }
    | { kind: "built" }
    | { kind: "rising" }
    | { kind: "locked"; why: string };
};

/** The buildings a free tile may take beside the workshops, each with its state. */
export function placeRows(p: EmpirePayload, tile: string): PlaceRow[] {
  const view = p.view;
  if (!view) return [];
  const w = t.workshop;
  const casa = view.house.casa;
  const map = view.map;
  const builds = view.house.builds ?? [];
  const rising = (kind: string) => builds.some((b) => b.kind === kind);
  const site = (
    done: boolean,
    kind: string,
    s: { cost: string; casa: number } | null | undefined,
    action: EmpireAction,
  ): PlaceRow["state"] | null => {
    if (done) return { kind: "built" };
    if (rising(kind)) return { kind: "rising" };
    if (!s) return null;
    if (casa < s.casa) return { kind: "locked", why: w.atLevel(s.casa) };
    return { kind: "build", cost: s.cost, action };
  };
  const rows: PlaceRow[] = [];
  const depot = site(!!map.depot, "depot", map.depotSite, { type: "empireBuildDepot", cell: tile });
  if (depot)
    rows.push({ id: "depot", icon: Icon.cart, name: w.depot, what: w.depotWhat, state: depot });
  const camp = site(!!map.camp, "camp", map.campSite, { type: "empireBuildCamp", cell: tile });
  if (camp)
    rows.push({ id: "camp", icon: Icon.troops, name: w.camp, what: w.campWhat, state: camp });
  const porta = view.porta
    ? site(!!view.porta.cell, "porta", view.porta.site, {
        type: "empireBuildPorta",
        cell: tile,
      } as EmpireAction)
    : null;
  if (porta)
    rows.push({ id: "porta", icon: Icon.gate, name: w.porta, what: w.portaWhat, state: porta });
  // A fondaco opens a region beyond Venetia: on a tile of its own there.
  const region = map.cells[tile]?.region;
  const r = region ? view.regions.find((x) => x.code === region) : undefined;
  const size = map.tileSize ?? 15;
  const [i = 0, j = 0] = tile.split(",").map(Number);
  rows.push({
    id: "post",
    icon: Icon.fondaco,
    name: w.post,
    what: w.postWhat,
    state:
      !r || region === "veneto"
        ? { kind: "locked", why: w.otherRegion }
        : casa < r.casa
          ? { kind: "locked", why: w.atLevel(r.casa) }
          : r.postCost
            ? {
                kind: "build",
                cost: r.postCost,
                action: {
                  type: "empirePlaceCounter",
                  cell: tile,
                  x: Math.round((i + 0.5) * size),
                  y: Math.round((j + 0.5) * size),
                },
              }
            : { kind: "built" },
  });
  return rows;
}

/** The buildings of a free tile (the first steps, lot 5): every one, the locked ones in sight. */
function PlacesList({
  p,
  tile,
  busy,
  act,
  onDone,
}: {
  p: EmpirePayload;
  tile: string;
  busy: boolean;
  act: (a: EmpireAction) => Promise<unknown>;
  onDone: () => void;
}) {
  const w = t.workshop;
  return (
    <ul className="space-y-1" data-place-rows>
      {placeRows(p, tile).map((row) => (
        <li
          key={row.id}
          className={`flex items-center gap-3 rounded-[1.4rem] p-2 ${row.state.kind === "locked" ? "opacity-70" : ""}`}
          data-place-row={row.id}
          data-state={row.state.kind}
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-night-4 [&_svg]:h-6 [&_svg]:w-6">
            {row.icon()}
          </span>
          <span className="flex-1 text-sm text-cream">
            <span className="font-display text-base font-extrabold">{row.name}</span>
            <span className="block text-xs text-cream-dim">{row.what}</span>
          </span>
          {row.state.kind === "build" ? (
            <Slab
              size="sm"
              tone="ghost"
              busy={busy}
              disabled={!affordable(p.cash, row.state.cost)}
              onClick={() => {
                if (row.state.kind === "build") void act(row.state.action).then(onDone);
              }}
            >
              {w.newVerb}
              <span className="inline-flex items-center gap-1">
                <DucatCoin size={20} />
                {amount(row.state.cost)}
              </span>
            </Slab>
          ) : row.state.kind === "locked" ? (
            <LockChip text={row.state.why} />
          ) : (
            <span className="shrink-0 text-xs font-bold text-cream-dim">
              {row.state.kind === "built" ? w.built : w.rising}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

/** A new workshop in a region: what it may take. */
export function NewWorkshopSheet({
  p,
  open,
  region,
  highlight,
  busy,
  onClose,
  act,
  tile,
}: {
  p: EmpirePayload;
  open: boolean;
  region: string;
  highlight: string | null;
  busy: boolean;
  onClose: () => void;
  act: (a: EmpireAction) => Promise<unknown>;
  tile?: string;
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      kicker={tile ? t.workshop.hereTitle : t.workshop.newTitle}
      title={regionName(region)}
    >
      {tile && <h3 className="mb-1 font-display text-sm font-black">{t.workshop.workshopsHead}</h3>}
      <NewWorkshopList
        p={p}
        region={region}
        highlight={highlight}
        busy={busy}
        onDone={onClose}
        act={act}
        tile={tile}
      />
      {/* Every building of the game on a free tile, the locked ones in sight (lot 5). */}
      {tile && (
        <>
          <h3 className="mb-1 mt-5 font-display text-sm font-black">{t.workshop.placesHead}</h3>
          <PlacesList p={p} tile={tile} busy={busy} act={act} onDone={onClose} />
        </>
      )}
    </Sheet>
  );
}
