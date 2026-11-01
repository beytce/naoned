import { Coin } from "../../art/icons.js";
import { d } from "../../game/format.js";
import { Badge, Label, Sheet, Slab } from "../../ui.js";
import { affordable } from "../logic.js";
import type { EmpireAction, EmpirePayload } from "../types.js";
import { pt } from "./texts.js";
import type { PortaView } from "./types.js";

const Price = ({ cost }: { cost: string }) => (
  <span className="inline-flex items-center gap-1 tabular-nums">
    <Coin size={12} />
    {d(cost)}
  </span>
);

/**
 * The Remise's arms (docs/plan-porta.md §§ 4–5): the combat models bought and raised, each
 * combat vehicle's places, the components bought one by one and raised. A vehicle away from the
 * Remise is shown but not touched.
 */
export function ArmsSheet({
  p,
  open,
  busy,
  act,
  onClose,
}: {
  p: EmpirePayload;
  open: boolean;
  busy: boolean;
  act: (a: EmpireAction) => Promise<void>;
  onClose: () => void;
}) {
  const v = p.view?.porta;
  const casa = p.view?.house.casa ?? 1;
  if (!v) return null;
  const nameOf = (id: string) => {
    const c = v.inventory.find((x) => x.id === id);
    return c ? `${pt.component[c.code] ?? c.code} ${c.level}` : "";
  };
  return (
    <Sheet open={open} onClose={onClose} kicker={pt.armsSub} title={pt.arms}>
      <section className="space-y-3" data-arms-models>
        <Label>{pt.combat}</Label>
        {v.models.map((m) => {
          const owned = v.vehicles.filter((x) => x.model === m.code).length;
          const locked = casa < m.casa;
          return (
            <div
              key={m.code}
              className="rounded-xl border border-line bg-night-2 p-3"
              data-arm-model={m.code}
            >
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-place text-sm font-bold uppercase tracking-[0.1em] text-cream">
                  {pt.model[m.code] ?? m.code}
                </p>
                <Badge>{locked ? pt.opensAt(m.casa) : pt.level(m.level)}</Badge>
              </div>
              <p className="mt-1 text-xs text-cream-dim">
                {pt.hp(m.hp)} · {pt.slots(m.slots)} · ×{owned}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Slab
                  size="sm"
                  tone="ghost"
                  disabled={busy || locked || !affordable(p.cash, m.cost)}
                  onClick={() => void act({ type: "empireBuyArm", model: m.code })}
                >
                  {pt.buy} · <Price cost={m.cost} />
                </Slab>
                {m.upgradeCost && owned > 0 && (
                  <Slab
                    size="sm"
                    tone="ghost"
                    disabled={busy || !affordable(p.cash, m.upgradeCost)}
                    onClick={() => void act({ type: "empireUpgradeArm", model: m.code })}
                  >
                    {pt.raiseModel} · <Price cost={m.upgradeCost} />
                  </Slab>
                )}
              </div>
            </div>
          );
        })}
      </section>

      {v.vehicles.length > 0 && (
        <section className="mt-5 space-y-3" data-arms-vehicles>
          <Label>{pt.fit}</Label>
          {v.vehicles.map((x) => {
            const away = x.place !== "remise";
            return (
              <div
                key={x.id}
                className="rounded-xl border border-line bg-night-2 p-3"
                data-arm-vehicle={x.id}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold text-cream">{pt.model[x.model] ?? x.model}</p>
                  <span className="text-xs text-cream-dim">
                    {pt.place_[x.place]} · {pt.hp(x.stats.hp)}
                  </span>
                </div>
                <ul className="mt-2 space-y-1.5">
                  {x.slots.map((slot, i) => {
                    // A typed place (1 November): a weapon, a defense or a support only.
                    const kind = v.models.find((m) => m.code === x.model)?.places?.[i] ?? null;
                    const kindOf = (id: string) =>
                      v.components.find(
                        (c) => c.code === v.inventory.find((y) => y.id === id)?.code,
                      )?.kind;
                    return (
                      // biome-ignore lint/suspicious/noArrayIndexKey: a place is its index
                      <li key={i} data-place-kind={kind ?? undefined}>
                        {kind && (
                          <span className="mb-0.5 block text-[0.6875rem] font-semibold uppercase tracking-wider text-cream-dim">
                            {pt.kind[kind]}
                          </span>
                        )}
                        <select
                          aria-label={`${pt.fit} ${i + 1}`}
                          className="w-full rounded-lg border border-edge bg-night-3 px-2 py-2 text-sm text-cream disabled:opacity-50"
                          disabled={busy || away}
                          value={slot ?? ""}
                          onChange={(e) =>
                            void act({
                              type: "empireFitArm",
                              vehicleId: x.id,
                              slot: i,
                              componentId: e.target.value === "" ? null : e.target.value,
                            })
                          }
                        >
                          <option value="">{pt.empty}</option>
                          {v.inventory
                            .filter((c) => c.on === null || c.on === x.id || ownerAtRemise(v, c.on))
                            .filter((c) => kind === null || kindOf(c.id) === kind)
                            .map((c) => (
                              <option key={c.id} value={c.id}>
                                {nameOf(c.id)}
                              </option>
                            ))}
                        </select>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </section>
      )}

      <section className="mt-5 space-y-2" data-arms-components>
        <Label>{pt.buy}</Label>
        {v.components.map((c) => {
          const locked = casa < c.casa;
          return (
            <div
              key={c.code}
              className="flex items-center gap-3 border-b border-line/60 pb-2"
              data-component={c.code}
            >
              <span className="min-w-0 flex-1 text-sm text-cream">
                {pt.component[c.code] ?? c.code}
                <span className="block text-xs text-cream-dim">
                  {pt.kind[c.kind]} · {locked ? pt.opensAt(c.casa) : pt.componentText[c.effect]}
                </span>
              </span>
              <Slab
                size="sm"
                tone="ghost"
                disabled={busy || locked || !affordable(p.cash, c.cost)}
                onClick={() => void act({ type: "empireBuyComponent", code: c.code })}
              >
                <Price cost={c.cost} />
              </Slab>
            </div>
          );
        })}
      </section>

      {v.inventory.length > 0 && (
        <section className="mt-5 space-y-2" data-arms-inventory>
          <Label>{pt.stock}</Label>
          {v.inventory.map((c) => {
            const on = c.on ? v.vehicles.find((x) => x.id === c.on) : undefined;
            return (
              <div key={c.id} className="flex items-center gap-3 border-b border-line/60 pb-2">
                <span className="min-w-0 flex-1 text-sm text-cream">
                  {nameOf(c.id)}
                  <span className="block text-xs text-cream-dim">
                    {on ? (pt.model[on.model] ?? on.model) : pt.stock}
                  </span>
                </span>
                {c.upgradeCost && (
                  <Slab
                    size="sm"
                    tone="ghost"
                    disabled={
                      busy || (on && on.place !== "remise") || !affordable(p.cash, c.upgradeCost)
                    }
                    onClick={() => void act({ type: "empireUpgradeComponent", componentId: c.id })}
                  >
                    {pt.raiseComponent} · <Price cost={c.upgradeCost} />
                  </Slab>
                )}
              </div>
            );
          })}
        </section>
      )}
    </Sheet>
  );
}

/** A component fitted on a vehicle at the Remise can be moved to another. */
const ownerAtRemise = (v: PortaView, vehicleId: string) =>
  v.vehicles.find((x) => x.id === vehicleId)?.place === "remise";
