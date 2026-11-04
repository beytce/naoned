import { useEffect, useState } from "react";
import { Coin } from "../../art/icons.js";
import { ChoiceCard, Dock, PlaceHeader, siblingOf } from "../../dock.js";
import { d } from "../../game/format.js";
import { fr } from "../../i18n.js";
import { Slab } from "../../ui.js";
import { affordable } from "../logic.js";
import type { EmpireAction, EmpirePayload } from "../types.js";
import { pt } from "./texts.js";
import type { ComponentKind, PortaView } from "./types.js";

/** Each kind of place by its colour (the sockets round a vehicle). */
export const KIND_HEX: Record<ComponentKind, string> = {
  weapon: "#E06A4A",
  defense: "#6EC8F5",
  support: "#6EE0B8",
};
const CREAM = "#F6E8CC";

export type ArmsView = { kind: "vehicle" } | { kind: "fit"; slot: number } | { kind: "shop" };

const Price = ({ cost }: { cost: string }) => (
  <span className="inline-flex items-center gap-1 tabular-nums">
    <Coin size={14} />
    {d(cost)}
  </span>
);

/** A component's name and level, as the sockets and the cards say it. */
export function componentName(v: PortaView, id: string | null): string | null {
  const c = id ? v.inventory.find((x) => x.id === id) : undefined;
  return c ? `${pt.component[c.code] ?? c.code} ${c.level}` : null;
}

/**
 * The Remise's dock (docs/plan-dock.md, lot 5; design of 4 November 2026): the vehicle in the
 * middle (‹ › from one to the next, the camera at its pedestal), its life, speed and places; a
 * place touched (in the dock or on the pedestal) shows the components of its kind in cards, one
 * gold « Poser »; the shop for the models and the components. The same cards as the workshops'
 * modules: one system.
 */
export function ArmsDock({
  p,
  v,
  busy,
  act,
  focus,
  onFocus,
  view,
  onView,
}: {
  p: EmpirePayload;
  v: PortaView;
  busy: boolean;
  act: (a: EmpireAction) => Promise<void>;
  /** The vehicle in the middle (its index). */
  focus: number;
  onFocus: (i: number) => void;
  view: ArmsView;
  onView: (v: ArmsView) => void;
}) {
  const vehicle = v.vehicles[focus];
  const shown: ArmsView = vehicle ? view : { kind: "shop" };
  return (
    <Dock attrs={{ "data-arms-dock": shown.kind }}>
      <div key={`${focus}:${JSON.stringify(shown)}`} className="dock-view flex flex-col gap-3">
        {shown.kind === "shop" || !vehicle ? (
          <Shop
            p={p}
            v={v}
            busy={busy}
            act={act}
            onBack={vehicle ? () => onView({ kind: "vehicle" }) : undefined}
          />
        ) : shown.kind === "fit" ? (
          <Fit
            v={v}
            busy={busy}
            act={act}
            vehicleId={vehicle.id}
            slot={shown.slot}
            onBack={() => onView({ kind: "vehicle" })}
          />
        ) : (
          <Vehicle
            p={p}
            v={v}
            busy={busy}
            act={act}
            focus={focus}
            onFocus={onFocus}
            onView={onView}
          />
        )}
      </div>
    </Dock>
  );
}

function Vehicle({
  p,
  v,
  busy,
  act,
  focus,
  onFocus,
  onView,
}: {
  p: EmpirePayload;
  v: PortaView;
  busy: boolean;
  act: (a: EmpireAction) => Promise<void>;
  focus: number;
  onFocus: (i: number) => void;
  onView: (v: ArmsView) => void;
}) {
  const x = v.vehicles[focus];
  if (!x) return null;
  const model = v.models.find((m) => m.code === x.model);
  const places = model?.places ?? [];
  const away = x.place !== "remise";
  const ids = v.vehicles.map((y) => y.id);
  const go = (dir: 1 | -1) => {
    const next = siblingOf(ids, x.id, dir);
    onFocus(Math.max(0, ids.indexOf(next ?? x.id)));
  };
  const top = Math.max(...v.models.map((m) => m.hp), x.stats.hp, 1);
  const fastest = Math.max(...v.models.map((m) => m.speedCenti), x.stats.speedCenti, 1);
  return (
    <>
      <PlaceHeader
        title={pt.model[x.model] ?? x.model}
        sub={`${pt.modelN(model?.level ?? 1)} · ${away ? pt.place_[x.place] : pt.place_.remise}`}
        siblings={{
          index: focus,
          count: v.vehicles.length,
          onPrev: () => go(-1),
          onNext: () => go(1),
        }}
      />
      <dl className="flex flex-col gap-2.5" data-arm-stats={x.id}>
        {(
          [
            [pt.life, x.stats.hp, top, pt.hp(x.stats.hp)],
            [
              pt.speed,
              x.stats.speedCenti,
              fastest,
              (x.stats.speedCenti / 100).toLocaleString("fr-FR"),
            ],
          ] as const
        ).map(([label, n, max, text]) => (
          <div key={label} className="flex items-center gap-3">
            <dt className="w-16 text-sm text-cream-dim">{label}</dt>
            <dd className="h-2.5 flex-1 overflow-hidden rounded-full bg-night">
              <span
                className="block h-full rounded-full bg-lagoon"
                style={{ width: `${Math.max(6, Math.round((n / max) * 100))}%` }}
              />
            </dd>
            <dd className="w-20 text-right font-display text-sm tabular-nums">{text}</dd>
          </div>
        ))}
        <div className="flex items-center gap-3">
          <dt className="w-16 text-sm text-cream-dim">{pt.places}</dt>
          <dd className="flex flex-1 flex-wrap gap-2">
            {x.slots.map((slot, k) => {
              const kind = places[k] ?? null;
              const colour = kind ? KIND_HEX[kind] : CREAM;
              return (
                <button
                  // biome-ignore lint/suspicious/noArrayIndexKey: a place is its index
                  key={k}
                  type="button"
                  disabled={busy || away}
                  onClick={() => onView({ kind: "fit", slot: k })}
                  data-dock-socket={k}
                  className="flex min-h-11 items-center gap-1.5 rounded-xl px-2.5 text-xs font-semibold disabled:opacity-50"
                  style={{
                    background: slot ? `${colour}22` : "transparent",
                    border: slot ? `1.5px solid ${colour}` : `1.5px dashed ${colour}`,
                    color: slot ? "rgb(var(--cream))" : colour,
                  }}
                  aria-label={`${kind ? pt.kind[kind] : pt.fit} ${k + 1}`}
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: colour }} />
                  {componentName(v, slot) ?? "+"}
                </button>
              );
            })}
          </dd>
        </div>
      </dl>
      {away ? (
        <p className="text-xs text-cream-dim">{pt.away}</p>
      ) : (
        <p className="text-xs text-cream-dim">{pt.equipHint}</p>
      )}
      <div className="flex flex-col items-stretch gap-1">
        {model?.upgradeCost ? (
          <Slab
            size="lg"
            className="w-full"
            busy={busy}
            disabled={!affordable(p.cash, model.upgradeCost)}
            onClick={() => void act({ type: "empireUpgradeArm", model: model.code })}
          >
            {pt.modelN(model.level + 1)} · <Price cost={model.upgradeCost} />
          </Slab>
        ) : model ? (
          <Slab
            size="lg"
            className="w-full"
            busy={busy}
            disabled={!affordable(p.cash, model.cost)}
            onClick={() => void act({ type: "empireBuyArm", model: model.code })}
          >
            {pt.buyOne(d(model.cost))}
          </Slab>
        ) : null}
        <Slab
          tone="text"
          disabled={busy}
          onClick={() => onView({ kind: "shop" })}
          className="self-center"
        >
          <span data-arms-shop>{pt.shop}</span>
        </Slab>
      </div>
    </>
  );
}

/** A place touched: the components of its kind in cards, one gold « Poser ». */
function Fit({
  v,
  busy,
  act,
  vehicleId,
  slot,
  onBack,
}: {
  v: PortaView;
  busy: boolean;
  act: (a: EmpireAction) => Promise<void>;
  vehicleId: string;
  slot: number;
  onBack: () => void;
}) {
  const x = v.vehicles.find((y) => y.id === vehicleId);
  const kind = x ? (v.models.find((m) => m.code === x.model)?.places?.[slot] ?? null) : null;
  const here = x?.slots[slot] ?? null;
  const [pick, setPick] = useState<string | null>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: a new place, a new choice
  useEffect(() => setPick(null), [vehicleId, slot]);
  if (!x) return null;
  const kindOf = (id: string) =>
    v.components.find((c) => c.code === v.inventory.find((y) => y.id === id)?.code)?.kind;
  const free = (on: string | null) =>
    on === null || on === x.id || v.vehicles.find((y) => y.id === on)?.place === "remise";
  const cards = v.inventory
    .filter((c) => free(c.on))
    .filter((c) => kind === null || kindOf(c.id) === kind);
  const chosen = pick ?? here;
  const fitted = here ? v.inventory.find((c) => c.id === here) : undefined;
  return (
    <div className="flex flex-col gap-3" data-arms-fit>
      <PlaceHeader
        title={`${pt.model[x.model] ?? x.model} · ${kind ? pt.kind[kind] : pt.fit} ${slot + 1}`}
        sub={kind ? pt.onlyKind(pt.kindPlural[kind] ?? "") : pt.anyKind}
        onBack={onBack}
      />
      {cards.length === 0 ? (
        <p className="text-sm text-cream-dim">{pt.noComponent}</p>
      ) : (
        <ul className="grid grid-cols-2 gap-2.5">
          {cards.map((c) => {
            const def = v.components.find((y) => y.code === c.code);
            return (
              <li key={c.id}>
                <ChoiceCard
                  selected={chosen === c.id}
                  onClick={() => setPick(c.id)}
                  className="min-h-28 w-full flex-col justify-center gap-1 px-3 py-2.5"
                  attrs={{ "data-fit-component": c.id }}
                >
                  <span className="flex items-center gap-2 text-sm font-bold">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ background: def ? KIND_HEX[def.kind] : CREAM }}
                    />
                    {componentName(v, c.id)}
                  </span>
                  <span className="text-xs leading-snug text-cream-dim">
                    {def ? pt.componentText[def.effect] : ""}
                  </span>
                  {c.id === here && (
                    <span className="text-[0.6875rem] text-info">{fr.empire.dock.fitted}</span>
                  )}
                </ChoiceCard>
              </li>
            );
          })}
        </ul>
      )}
      {fitted?.upgradeCost && (
        <div className="flex items-center gap-3 glass-chip rounded-[1.25rem] px-3.5 py-2.5">
          <span className="flex flex-1 flex-col">
            <span className="text-sm font-bold">
              {pt.raiseTo(pt.component[fitted.code] ?? fitted.code, fitted.level + 1)}
            </span>
            <span className="text-xs text-cream-dim">
              {fitted.upgradePlans
                ? `${pt.plansNeed(fitted.upgradePlans.n, pt.plansKind[fitted.upgradePlans.kind] ?? "")} · `
                : ""}
              {d(fitted.upgradeCost)}
            </span>
          </span>
          <Slab
            tone="ghost"
            size="sm"
            disabled={
              busy ||
              (fitted.upgradePlans !== null &&
                v.plans[fitted.upgradePlans.kind] < fitted.upgradePlans.n)
            }
            onClick={() => void act({ type: "empireUpgradeComponent", componentId: fitted.id })}
          >
            {pt.raiseComponent}
          </Slab>
        </div>
      )}
      <div className="flex gap-2.5">
        {here && (
          <Slab
            tone="ghost"
            size="lg"
            disabled={busy}
            onClick={() =>
              void act({ type: "empireFitArm", vehicleId: x.id, slot, componentId: null })
            }
          >
            {pt.takeOffIt}
          </Slab>
        )}
        <Slab
          size="lg"
          className="flex-1"
          busy={busy}
          disabled={!chosen || chosen === here}
          onClick={() =>
            chosen &&
            void act({ type: "empireFitArm", vehicleId: x.id, slot, componentId: chosen }).then(
              onBack,
            )
          }
        >
          {pt.fitIt(chosen ? (componentName(v, chosen) ?? "") : "")}
        </Slab>
      </div>
    </div>
  );
}

/** The shop: the models and the components in cards, the one chosen bought in gold. */
function Shop({
  p,
  v,
  busy,
  act,
  onBack,
}: {
  p: EmpirePayload;
  v: PortaView;
  busy: boolean;
  act: (a: EmpireAction) => Promise<void>;
  onBack?: () => void;
}) {
  const casa = p.view?.house.casa ?? 1;
  const [pick, setPick] = useState<{ kind: "model" | "component"; code: string } | null>(null);
  const item =
    pick?.kind === "model"
      ? v.models.find((m) => m.code === pick.code)
      : pick
        ? v.components.find((c) => c.code === pick.code)
        : undefined;
  const name = pick
    ? pick.kind === "model"
      ? (pt.model[pick.code] ?? pick.code)
      : (pt.component[pick.code] ?? pick.code)
    : "";
  return (
    <div className="flex flex-col gap-3">
      <PlaceHeader
        title={pt.shop}
        sub={v.vehicles.length === 0 ? pt.noVehicle : pt.armsSub}
        onBack={onBack}
      />
      <p className="label text-cream-dim">{pt.shopModels}</p>
      <ul className="-mx-4 flex snap-x gap-2.5 overflow-x-auto px-4 pb-1" data-arms-models>
        {v.models.map((m) => {
          const owned = v.vehicles.filter((x) => x.model === m.code).length;
          return (
            <li key={m.code} className="snap-start">
              <ChoiceCard
                selected={pick?.kind === "model" && pick.code === m.code}
                locked={casa < m.casa ? pt.opensAt(m.casa) : undefined}
                onClick={() => setPick({ kind: "model", code: m.code })}
                className="h-28 w-36 flex-col justify-center gap-1 px-3"
                attrs={{ "data-arm-model": m.code }}
              >
                <span className="text-sm font-bold">{pt.model[m.code] ?? m.code}</span>
                <span className="font-display text-xs tabular-nums text-cream-dim">
                  {pt.hp(m.hp)} {owned > 0 ? `· ${pt.owned(owned)}` : ""}
                </span>
                <span className="flex gap-1">
                  {m.places.map((k, i) => (
                    <span
                      // biome-ignore lint/suspicious/noArrayIndexKey: a place is its index
                      key={i}
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: k ? KIND_HEX[k] : CREAM }}
                    />
                  ))}
                </span>
                <span className="font-display text-xs font-bold tabular-nums text-gold">
                  {d(m.cost)}
                </span>
              </ChoiceCard>
            </li>
          );
        })}
      </ul>
      <p className="label text-cream-dim">{pt.shopComponents}</p>
      <ul className="grid grid-cols-2 gap-2.5" data-arms-components>
        {v.components.map((c) => {
          const mine = v.inventory.filter((x) => x.code === c.code).length;
          return (
            <li key={c.code}>
              <ChoiceCard
                selected={pick?.kind === "component" && pick.code === c.code}
                locked={casa < c.casa ? pt.opensAt(c.casa) : undefined}
                onClick={() => setPick({ kind: "component", code: c.code })}
                className="min-h-24 w-full flex-col justify-center gap-1 px-3 py-2"
                attrs={{ "data-component": c.code }}
              >
                <span className="flex items-center gap-2 text-sm font-bold">
                  <span className="h-3 w-3 rounded-full" style={{ background: KIND_HEX[c.kind] }} />
                  {pt.component[c.code] ?? c.code}
                  {mine > 0 && (
                    <span className="font-display text-xs text-cream-dim">{pt.owned(mine)}</span>
                  )}
                </span>
                <span className="text-xs leading-snug text-cream-dim">
                  {pt.componentText[c.effect]}
                </span>
                <span className="font-display text-xs font-bold tabular-nums text-gold">
                  {d(c.cost)}
                </span>
              </ChoiceCard>
            </li>
          );
        })}
      </ul>
      <Slab
        size="lg"
        className="sticky bottom-0 w-full"
        busy={busy}
        disabled={!pick || !item || !affordable(p.cash, item.cost)}
        onClick={() =>
          pick &&
          void act(
            pick.kind === "model"
              ? { type: "empireBuyArm", model: pick.code }
              : { type: "empireBuyComponent", code: pick.code },
          )
        }
      >
        {item ? pt.buyFor(name, d(item.cost)) : pt.buy}
      </Slab>
    </div>
  );
}
