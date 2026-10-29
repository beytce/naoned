import { type ReactNode, useState } from "react";
import { GoodsMark } from "../art/goods.js";
import { VehicleGlyph } from "../art/veneto.js";
import { fr } from "../i18n.js";
import { Slab } from "../ui.js";
import { BuyMissing, affordable, have, missingMaterials } from "./Comptoir.js";
import type { GameProps } from "./Game.js";
import { d, minutesLabel } from "./format.js";
import { vehicleName } from "./roadKit.js";
import type { Cost, Recipe } from "./types.js";

/**
 * What the merchant can build, in cards: each workshop with its art, the length of a batch, what
 * it takes and gives, its part in the trade, how many stand already and its price. A card the
 * merchant cannot build yet is dimmed and says why (another region, no plot left, the price).
 * A second tab does the same for the vehicles: the mule for sale, the others reached by upgrade.
 */

const t = () => fr.game.catalog;

type Tab = "workshops" | "vehicles";

export function BuildCatalog(props: GameProps) {
  const [tab, setTab] = useState<Tab>("workshops");
  const road = props.catalog.road;
  return (
    <div className="space-y-4">
      {road && (
        // Lagune: two pills in a groove, the chosen one lit in lapis.
        <div className="grid grid-cols-2 gap-1.5 rounded-full bg-night p-1" role="tablist">
          {(["workshops", "vehicles"] as const).map((k) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={tab === k}
              onClick={() => setTab(k)}
              className={`min-h-11 rounded-full font-display text-sm font-bold transition ${
                tab === k ? "bg-info text-ink" : "text-cream-dim"
              }`}
            >
              {t().tabs[k]}
            </button>
          ))}
        </div>
      )}
      {tab === "workshops" || !road ? <Workshops {...props} /> : <Vehicles {...props} />}
    </div>
  );
}

/** Why a card cannot be taken yet, or null when it can. */
function lockOf(
  props: GameProps,
  regions: string[] | null,
  cost: Cost,
  unlock: { turnover: string; title: string } | null = null,
): string | null {
  const { view, catalog } = props;
  if (unlock && BigInt(view.standing.turnover) < BigInt(unlock.turnover))
    return t().unlockAt(unlock.title);
  if (regions && !regions.includes(view.player.region))
    return t().onlyIn(regions.map((r) => props.names.region(r)).join(", "));
  if (view.buildings.length >= catalog.rules.maxBuildings)
    return fr.game.maxBuildings(catalog.rules.maxBuildings);
  if (!affordable(view, cost)) return t().missing;
  return null;
}

function Workshops(props: GameProps) {
  const { view, catalog } = props;
  // What can be built here first, then what needs more, then the other regions' trades.
  const rank = (lock: string | null, regions: string[] | null) =>
    lock === null ? 0 : regions && !regions.includes(view.player.region) ? 2 : 1;
  const cards = catalog.buildings
    .map((b) => ({ b, lock: lockOf(props, b.regions, b.cost, b.unlock) }))
    .sort((x, y) => rank(x.lock, x.b.regions) - rank(y.lock, y.b.regions));
  // A card is chosen in place (maquette `Batir`); the one gold at the foot acts on it.
  const [chosen, setChosen] = useState<string | null>(cards[0]?.b.type ?? null);
  const pick = cards.find((c) => c.b.type === chosen) ?? cards[0];
  return (
    <div className="space-y-3">
      {cards.map(({ b, lock }) => {
        const elsewhere = !!b.regions && !b.regions.includes(view.player.region);
        const built = view.buildings.filter((x) => x.type === b.type).length;
        return (
          <Card
            key={b.type}
            dim={lock !== null}
            disabled={elsewhere}
            pressed={pick?.b.type === b.type}
            onClick={() => setChosen(b.type)}
            art={<PlotStar output={Object.keys(b.recipe?.outputs ?? {})[0]} />}
            count={t().built(built)}
            title={props.names.building(b.type)}
            time={b.recipe ? t().batch(minutesLabel(b.recipe.durationMinutes)) : null}
            body={b.recipe ? <RecipeLine recipe={b.recipe} /> : <p>{t().roles[b.type] ?? ""}</p>}
            price={<Price cost={b.cost} props={props} />}
            lock={elsewhere ? lock : null}
          />
        );
      })}
      {pick && <BuildFoot props={props} type={pick.b.type} cost={pick.b.cost} lock={pick.lock} />}
    </div>
  );
}

/**
 * The one gold of « Bâtir », held at the sheet's foot: build the chosen workshop, or first buy
 * what it lacks right here (the owner's word, 29 October 2026); a lock says why in words.
 */
function BuildFoot({
  props,
  type,
  cost,
  lock,
}: { props: GameProps; type: string; cost: Cost; lock: string | null }) {
  const lacking = missingMaterials(props, cost).lines.length > 0;
  const shortOf = BigInt(cost.ducats) - BigInt(props.view.cash);
  return (
    <div className="sticky bottom-0 -mx-5 space-y-2 bg-night-2 px-5 pb-1 pt-3">
      {lock === null ? (
        <Slab
          size="lg"
          className="w-full"
          coach="catalog-build"
          disabled={props.busy}
          onClick={async () => {
            if (await props.act({ type: "build", buildingType: type })) props.setSheet(null);
          }}
        >
          {t().build(props.names.building(type), d(cost.ducats))}
        </Slab>
      ) : lock === t().missing && lacking && shortOf <= 0n ? (
        <BuyMissing cost={cost} props={props} gold />
      ) : (
        <p className="meta text-center">
          {lock === t().missing && shortOf > 0n ? fr.game.workshop.shortOf(d(shortOf)) : lock}
        </p>
      )}
    </div>
  );
}

function Vehicles(props: GameProps) {
  const road = props.catalog.road;
  if (!road) return null;
  const owned = props.view.road?.vehicles ?? [];
  const room = owned.length < road.maxVehicles;
  return (
    <div className="space-y-3">
      <p className="meta">{t().fleet(owned.length, road.maxVehicles)}</p>
      {road.vehicles.map((v) => {
        const forSale = road.forSale.includes(v.type);
        const from = road.vehicles.find((x) => x.upgrade?.to === v.type);
        const cost: Cost = { ducats: v.costDucats, materials: v.costMaterials };
        const lock = forSale
          ? !room
            ? fr.game.road.maxVehicles(road.maxVehicles)
            : !affordable(props.view, cost)
              ? t().missing
              : null
          : from
            ? t().upgradeOf(vehicleName(from.type), d(from.upgrade?.costDucats ?? "0"))
            : null;
        return (
          <Card
            key={v.type}
            dim={lock !== null}
            disabled
            art={
              <svg viewBox="-19 -15 38 26" className="h-16 w-24" aria-hidden="true">
                <VehicleGlyph type={v.type} />
              </svg>
            }
            count={t().owned(owned.filter((x) => x.type === v.type).length)}
            title={vehicleName(v.type)}
            time={fr.game.road.speed(Math.round(v.speedBps / 100))}
            body={
              <>
                <p className="font-display text-sm font-semibold">
                  {fr.game.road.capacity(v.capacity)}
                </p>
                <p>{t().vehicleRoles[v.type] ?? ""}</p>
              </>
            }
            price={forSale ? <Price cost={cost} props={props} /> : null}
            lock={lock}
            action={
              forSale ? (
                <Slab
                  size="sm"
                  disabled={props.busy || lock !== null}
                  onClick={() => void props.act({ type: "buyVehicle", vehicleType: v.type })}
                >
                  {fr.game.road.buy}
                </Slab>
              ) : null
            }
          />
        );
      })}
      <p className="text-xs text-muted">{fr.game.road.upgradeHint}</p>
    </div>
  );
}

/**
 * A workshop to build, as a plot of the counter's orbit (Lagune): a dotted round with the mark of
 * what it will make; the palazzo, which makes nothing, a gold lozenge.
 */
function PlotStar({ output }: { output?: string }) {
  return (
    <span className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-info/45">
      {output ? (
        <GoodsMark code={output} size={40} />
      ) : (
        <span className="h-6 w-6 rotate-45 bg-gold-soft" />
      )}
    </span>
  );
}

/** One card of the catalogue: art and count on the left, the rest on the right. */
function Card(props: {
  art: ReactNode;
  count: string;
  title: string;
  time: string | null;
  body: ReactNode;
  price: ReactNode;
  lock: string | null;
  dim: boolean;
  /** Not a way into a detail sheet (another region's trade, a vehicle). */
  disabled?: boolean;
  /** The card chosen (« Bâtir »): lit, `aria-pressed`. */
  pressed?: boolean;
  onClick?: () => void;
  action?: ReactNode;
}) {
  const inner = (
    <div className={`flex gap-3 ${props.dim ? "opacity-55" : ""}`}>
      <div className="flex w-24 shrink-0 flex-col items-center gap-2">
        {props.art}
        <span className="text-center text-xs text-cream-dim">{props.count}</span>
      </div>
      <div className="min-w-0 flex-1 space-y-1.5 text-sm text-cream-dim">
        <p className="font-place text-base font-bold uppercase leading-tight tracking-[0.12em] text-cream">
          {props.title}
        </p>
        {props.time && <p className="meta text-lagoon">{props.time}</p>}
        {props.body}
        {props.price}
      </div>
    </div>
  );
  return (
    <div
      className={`rounded-2xl bg-night-3 p-3 ring-inset ${props.pressed ? "ring-2 ring-info" : "ring-1 ring-edge"}`}
    >
      {props.disabled ? (
        inner
      ) : (
        <button
          type="button"
          aria-pressed={props.pressed}
          onClick={props.onClick}
          className="block w-full text-left"
        >
          {inner}
        </button>
      )}
      {(props.lock || props.action) && (
        <div className="mt-2 flex items-center justify-between gap-3 border-t border-line pt-2">
          <span className="text-xs text-cream-dim">{props.lock ?? ""}</span>
          {props.action}
        </div>
      )}
    </div>
  );
}

/** "8 [flour] + 2 [wood] → 10 [bread]", small. */
function RecipeLine({ recipe }: { recipe: Recipe }) {
  const side = (m: Record<string, number>) =>
    Object.entries(m).map(([r, q]) => (
      <span key={r} className="inline-flex items-center gap-1 text-cream">
        <span className="font-display text-sm font-semibold tabular-nums">{q}</span>
        <GoodsMark code={r} size={18} />
      </span>
    ));
  const inputs = side(recipe.inputs);
  return (
    <div className="flex flex-wrap items-center gap-1">
      {inputs.length > 0 && (
        <>
          {inputs}
          <span className="text-info">→</span>
        </>
      )}
      {side(recipe.outputs)}
    </div>
  );
}

/** The price: ducats, then each material, in vermilion when the store lacks it. */
function Price({ cost, props }: { cost: Cost; props: GameProps }) {
  const short = BigInt(props.view.cash) < BigInt(cost.ducats);
  return (
    <div className="flex flex-wrap items-center gap-2.5 pt-0.5">
      <span className={`font-display text-sm font-bold ${short ? "text-vermilion" : "text-gold"}`}>
        {d(cost.ducats)}
      </span>
      {Object.entries(cost.materials).map(([r, q]) => (
        <span
          key={r}
          className={`inline-flex items-center gap-0.5 font-display text-sm font-semibold tabular-nums ${
            have(props.view, r) >= q ? "text-cream" : "text-vermilion"
          }`}
        >
          {q}
          <GoodsMark code={r} size={18} />
        </span>
      ))}
    </div>
  );
}
