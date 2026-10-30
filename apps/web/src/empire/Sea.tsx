import { useState } from "react";
import { d, hourOf, minutesLabel } from "../game/format.js";
import { fr } from "../i18n.js";
import { Label, Slab } from "../ui.js";
import { Choice, regionName } from "./World.js";
import { affordable, opensAt, shownAt } from "./logic.js";
import type { EmpireAction, EmpirePayload } from "./types.js";

type Act = (a: EmpireAction) => Promise<void>;
const t = fr.empire.sea;
const vehicleName = (type: string) => fr.empire.vehicleNames[type] ?? type;
const goodName = (p: EmpirePayload, code: string) =>
  fr.themeNames.resource[code] ?? p.goods[code] ?? code;
/** Ducats typed by the merchant, as deniers (whole ducats only). */
const deniers = (ducats: string) => String(Math.max(0, Math.floor(Number(ducats) || 0)) * 100);

/**
 * The private Arsenal (CADRAGE-v3 § 3.3): the ships it builds, the house's ships and their places
 * of modules, and for a galley of the Muda its bid at the next departure.
 */
export function Arsenal({
  p,
  now,
  busy,
  act,
}: {
  p: EmpirePayload;
  now: number;
  busy: boolean;
  act: Act;
}) {
  const view = p.view;
  if (!view) return null;
  // The ships of the Casa reached, and the next one's: no further.
  const ships = view.vehicles.shop.filter((s) => s.build && shownAt(view.house.casa, s.casa));
  if (ships.length === 0) return null;
  const mine = view.vehicles.mine.filter((v) => ships.some((s) => s.type === v.type));
  const researched = view.research.modules.filter((m) => m.kind === "trade" && m.level > 0);
  return (
    <section className="mt-5" data-arsenal>
      <Label>{t.arsenal}</Label>
      <ul className="mt-2 space-y-2">
        {ships.map((s) => (
          <li
            key={s.type}
            className="flex items-center gap-2 border-b border-line/60 pb-2 text-sm text-cream"
          >
            <span className="flex-1">
              {vehicleName(s.type)}
              <span className="block text-xs text-cream-dim">
                {t.shipLine(s.capacity, s.slots, s.regions.map(regionName).join(", "))}
                {s.muda ? ` · ${t.mudaOnly}` : ""}
              </span>
            </span>
            {view.house.casa < s.casa ? (
              <span className="text-xs text-cream-dim">{fr.empire.charroi.opensAt(s.casa)}</span>
            ) : (
              <Slab
                size="sm"
                tone="ghost"
                busy={busy}
                disabled={
                  !affordable(p.cash, s.cost) ||
                  Object.entries(s.build?.materials ?? {}).some(([g, n]) => (p.stock[g] ?? 0) < n)
                }
                onClick={() => void act({ type: "empireBuildShip", vehicleType: s.type })}
              >
                {t.build(d(s.cost), minutesLabel(s.build?.minutes ?? 0))}
              </Slab>
            )}
          </li>
        ))}
      </ul>
      {mine.map((v) => {
        const spec = ships.find((s) => s.type === v.type);
        const bid = view.muda.bids.find((b) => b.vehicleId === v.id);
        const pass = view.muda.passes.find((x) => x.vehicleId === v.id);
        return (
          <div
            key={v.id}
            className="mt-3 cut bg-night-2 p-3 ring-1 ring-inset ring-line/70"
            data-ship
          >
            <p className="font-display font-bold text-cream">
              {vehicleName(v.type)} · {v.capacity}
            </p>
            {Array.from({ length: spec?.slots ?? 0 }, (_, slot) => (
              <Choice
                // biome-ignore lint/suspicious/noArrayIndexKey: a place is its index
                key={slot}
                label={fr.empire.identity.slot(slot + 1)}
                value={v.fitted?.[slot] ?? ""}
                onChange={(module) =>
                  module && void act({ type: "empireFitShip", vehicleId: v.id, slot, module })
                }
                options={[
                  ["", fr.empire.identity.emptySlot],
                  ...researched.map((m): [string, string] => [
                    m.code,
                    fr.empire.moduleNames[m.code]?.[0] ?? m.code,
                  ]),
                ]}
              />
            ))}
            {spec?.muda && (
              <MudaBid
                vehicleId={v.id}
                now={now}
                next={view.muda.next}
                bid={bid?.amount ?? null}
                pass={pass?.until ?? null}
                busy={busy}
                act={act}
              />
            )}
          </div>
        );
      })}
      {view.muda.last && (
        <p className="mt-2 text-xs text-cream-dim">
          {t.lastMuda(view.muda.last.places, d(view.muda.last.reserve))}
        </p>
      )}
    </section>
  );
}

function MudaBid({
  vehicleId,
  now,
  next,
  bid,
  pass,
  busy,
  act,
}: {
  vehicleId: string;
  now: number;
  next: number | null;
  bid: string | null;
  pass: number | null;
  busy: boolean;
  act: Act;
}) {
  const [ducats, setDucats] = useState("");
  if (pass && pass > now) return <p className="mt-2 text-xs text-gold">{t.pass(hourOf(pass))}</p>;
  return (
    <div className="mt-2 space-y-2" data-muda>
      <p className="text-xs text-cream-dim">
        {next ? t.nextMuda(hourOf(next)) : ""}
        {bid ? ` · ${t.myBid(d(bid))}` : ""}
      </p>
      <div className="flex gap-2">
        <input
          inputMode="numeric"
          value={ducats}
          onChange={(e) => setDucats(e.target.value.replace(/\D/g, ""))}
          placeholder={t.bidPlaceholder}
          aria-label={t.bidPlaceholder}
          className="min-h-11 w-28 bg-night-2 px-3 text-cream ring-1 ring-inset ring-line slab"
        />
        <Slab
          size="sm"
          busy={busy}
          disabled={!ducats}
          onClick={() => void act({ type: "empireMudaBid", vehicleId, amount: deniers(ducats) })}
        >
          {t.bid}
        </Slab>
        {bid && (
          <Slab
            size="sm"
            tone="ghost"
            busy={busy}
            onClick={() => void act({ type: "empireMudaBid", vehicleId, amount: "0" })}
          >
            {t.unbid}
          </Slab>
        )}
      </div>
    </div>
  );
}

/** The colleganze: the voyages open to stakes, the house's own, its record as a traveller. */
export function Colleganze({ p, busy, act }: { p: EmpirePayload; busy: boolean; act: Act }) {
  const view = p.view;
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  if (!view || !shownAt(view.house.casa, opensAt(p, "colleganza"))) return null;
  const list = view.colleganze.open;
  const record = (r: { voyages: number; returnBps: number } | null) =>
    r && r.voyages > 0
      ? t.record(r.voyages, Math.round(r.returnBps / r.voyages / 100))
      : t.noRecord;
  return (
    <section className="mt-5" data-colleganze>
      <Label>{t.colleganza}</Label>
      <p className="mt-1 text-xs text-cream-dim">{t.colleganzaRule}</p>
      {list.length === 0 && <p className="mt-1 text-sm text-cream-dim">{t.noColleganza}</p>}
      <ul className="mt-2 space-y-2">
        {list.map((c) => (
          <li key={c.id} className="border-b border-line/60 pb-2 text-sm text-cream">
            <p>
              {t.colleganzaLine(
                vehicleName(c.vehicleType),
                regionName(c.to),
                c.qty,
                goodName(p, c.good),
              )}
            </p>
            <p className="text-xs text-cream-dim">
              {t.raised(d(c.staked), d(c.target))} · {record(c.record)}
              {c.status === "sailing" ? ` · ${t.sailing}` : ""}
            </p>
            {c.status === "open" && (
              <div className="mt-2 flex flex-wrap gap-2">
                {c.mine ? (
                  <>
                    <Slab
                      size="sm"
                      busy={busy}
                      onClick={() => void act({ type: "empireColleganzaSail", id: c.id })}
                    >
                      {t.sail}
                    </Slab>
                    <Slab
                      size="sm"
                      tone="ghost"
                      busy={busy}
                      onClick={() => void act({ type: "empireColleganzaCancel", id: c.id })}
                    >
                      {t.cancel}
                    </Slab>
                  </>
                ) : (
                  <>
                    <input
                      inputMode="numeric"
                      value={amounts[c.id] ?? ""}
                      onChange={(e) =>
                        setAmounts({ ...amounts, [c.id]: e.target.value.replace(/\D/g, "") })
                      }
                      placeholder={t.stakePlaceholder}
                      aria-label={t.stakePlaceholder}
                      className="min-h-11 w-28 bg-night-2 px-3 text-cream ring-1 ring-inset ring-line slab"
                    />
                    <Slab
                      size="sm"
                      busy={busy}
                      disabled={!amounts[c.id]}
                      onClick={() =>
                        void act({
                          type: "empireColleganzaStake",
                          id: c.id,
                          amount: deniers(amounts[c.id] ?? ""),
                        })
                      }
                    >
                      {t.stake}
                    </Slab>
                    {c.myStake !== "0" && (
                      <Slab
                        size="sm"
                        tone="ghost"
                        busy={busy}
                        onClick={() => void act({ type: "empireColleganzaWithdraw", id: c.id })}
                      >
                        {t.withdraw(d(c.myStake))}
                      </Slab>
                    )}
                  </>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-cream-dim">{record(view.colleganze.record)}</p>
    </section>
  );
}
