import { GoodsMark } from "../art/goods.js";
import { DucatCoin } from "../art/plateau/coins.js";
import { amount, d } from "../game/format.js";
import { fr } from "../i18n.js";
import { Sheet, Slab } from "../ui.js";
import { regionName } from "./World.js";
import { affordable } from "./logic.js";
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
  act: (a: EmpireAction) => Promise<void>;
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
  if (!site) return <p className="text-sm text-cream-dim">{t.workshop.noRoom}</p>;
  return (
    <>
      {
        <ul className="space-y-1">
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
                  <li
                    key={r.code}
                    className={`flex items-center gap-3 rounded-[1.4rem] p-2 ${r.code === highlight ? "bg-face/10" : ""}`}
                  >
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-night-4">
                      <GoodsMark code={Object.keys(r.outputs)[0] ?? ""} size={28} />
                    </span>
                    <span className="flex-1 text-sm text-cream">
                      <span className="font-display text-base font-extrabold">{b.name}</span>
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
                  </li>
                )),
            )}
        </ul>
      }
    </>
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
  act: (a: EmpireAction) => Promise<void>;
  tile?: string;
}) {
  return (
    <Sheet open={open} onClose={onClose} kicker={t.workshop.newTitle} title={regionName(region)}>
      <NewWorkshopList
        p={p}
        region={region}
        highlight={highlight}
        busy={busy}
        onDone={onClose}
        act={act}
        tile={tile}
      />
    </Sheet>
  );
}
