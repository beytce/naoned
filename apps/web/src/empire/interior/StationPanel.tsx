import type { InteriorView } from "@comptoirs/engine";
import { type ReactNode, useEffect, useState } from "react";
import { fr } from "../../i18n.js";
import type { EmpireAction, InteriorRules } from "../types.js";

const t = () => fr.empire.interior;
const trade = (code: string) => t().trades[code] ?? code;

/**
 * A station touched inside its workshop (docs/plan-ateliers.md § 7.3, lot A6): its level, its wear,
 * the gestures that change it (upgrade, mend, move, turn, take down), quick or careful, and its
 * hands — each on its shift, sent to the door, or one more placed (hired first if none waits). On
 * a computer, beside the scene on the right; on a phone, at its foot.
 */
export function StationPanel({
  workshopId,
  stationId,
  v,
  rules,
  busy,
  now,
  act,
  onMove,
  onClose,
}: {
  now: number;
  workshopId: string;
  stationId: string;
  v: InteriorView;
  rules: InteriorRules | null | undefined;
  busy: boolean;
  act: (a: EmpireAction) => Promise<void>;
  onMove: () => void;
  onClose: () => void;
}) {
  const st = v.stations.find((x) => x.id === stationId);
  const def = st ? rules?.stations[st.kind] : undefined;
  const [care, setCare] = useState(st?.care ?? 0);
  // A hand hired for this station: placed at it as soon as it stands at the door.
  const [waitFor, setWaitFor] = useState<{ trade: string; shift: "day" | "night" } | null>(null);
  useEffect(() => setCare(st?.care ?? 0), [st?.care]);
  const waiting = v.hands.filter((h) => !h.stationId);
  useEffect(() => {
    if (!waitFor || busy) return;
    const h = waiting.find((x) => x.trade === waitFor.trade);
    if (!h) return;
    setWaitFor(null);
    void act({
      type: "empireInteriorAssign",
      workshopId,
      handId: h.id,
      stationId,
      shift: waitFor.shift,
    });
  }, [waitFor, waiting, busy, act, workshopId, stationId]);
  if (!st || !def) return null;
  const level = def.levels[st.level - 1];
  const next = def.levels[st.level];
  const seats = level?.seats ?? 0;
  const mine = v.hands.filter((h) => h.stationId === st.id);
  const shiftFree = (shift: "day" | "night") =>
    mine.filter((h) => h.shift === shift).length < seats;
  const fit = waiting.find((h) => def.trades.includes(h.trade)) ?? waiting[0];
  // One more hand: on the day if a seat is free there, else on the night, its relief.
  const free: "day" | "night" | null = shiftFree("day")
    ? "day"
    : shiftFree("night")
      ? "night"
      : null;
  const wanted = def.trades[0] ?? "labourer";
  const careCost = BigInt(rules?.wear?.careCostDucats ?? "0");
  const mend = st.wear > 0 ? (careCost * BigInt(st.wear) + 9_999n) / 10_000n : 0n;
  const hireCost = rules?.hands?.hireCostDucats ?? "0";
  const building = st.readyAt !== undefined && st.readyAt > now;
  const go = (a: EmpireAction) => void act(a);
  return (
    <section
      className="pointer-events-auto absolute inset-x-3 bottom-3 z-10 max-h-[62%] overflow-y-auto rounded-[1.75rem] bg-[#17150F] p-5 text-white shadow-[0_5px_0_#000,0_24px_50px_-12px_rgb(23_21_15/0.45)] lg:inset-x-auto lg:bottom-auto lg:right-5 lg:top-20 lg:max-h-[calc(100%-6rem)] lg:w-[22rem]"
      data-station-panel={st.id}
      aria-label={t().stations[st.kind] ?? st.kind}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-black leading-tight">
            {t().stations[st.kind] ?? st.kind}
          </h2>
          <p className="mt-1 text-xs text-[#C9C3B9]">
            {t().level(st.level)} · {t().wear(Math.round(st.wear / 100))}
            {building ? ` · ${t().building}` : ""}
          </p>
        </div>
        <button
          type="button"
          aria-label="Fermer"
          onClick={onClose}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-lg"
        >
          ×
        </button>
      </div>
      {/* The wear, a bar that empties as the machine wears. */}
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/15" aria-hidden="true">
        <div
          className="h-full rounded-full bg-[#C23B2E]"
          style={{ width: `${Math.max(0, 100 - st.wear / 100)}%` }}
        />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Act
          primary
          disabled={busy || building || !next}
          onClick={() => go({ type: "empireInteriorUpgrade", workshopId, stationId: st.id })}
          data="upgrade"
        >
          {next ? t().upgrade(next.costDucats) : t().upgradeMax}
        </Act>
        <Act
          disabled={busy || st.wear === 0}
          onClick={() => go({ type: "empireInteriorMaintain", workshopId, stationId: st.id })}
          data="maintain"
        >
          {st.wear === 0 ? t().maintainNone : t().maintain(mend.toString())}
        </Act>
        <Act disabled={busy || building} onClick={onMove} data="move">
          {t().move}
        </Act>
        <Act
          disabled={busy || building}
          onClick={() =>
            go({
              type: "empireInteriorMove",
              workshopId,
              stationId: st.id,
              x: st.x,
              y: st.y,
              rot: (st.rot + 1) % 4,
            })
          }
          data="rotate"
        >
          {t().rotate}
        </Act>
      </div>
      <label className="mt-4 block">
        <span className="text-xs font-bold text-[#C9C3B9]">{t().care}</span>
        <input
          type="range"
          min={0}
          max={10_000}
          step={500}
          value={care}
          disabled={busy}
          onChange={(e) => setCare(Number(e.target.value))}
          onPointerUp={() =>
            care !== st.care &&
            go({ type: "empireInteriorCare", workshopId, stationId: st.id, care })
          }
          onKeyUp={() =>
            care !== st.care &&
            go({ type: "empireInteriorCare", workshopId, stationId: st.id, care })
          }
          className="mt-1 w-full accent-[#C23B2E]"
          data-care
        />
        <span className="flex justify-between text-[0.6875rem] text-[#C9C3B9]">
          <span>{t().quick}</span>
          <span>{t().careful}</span>
        </span>
      </label>
      {seats > 0 || mine.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-bold text-[#C9C3B9]">{t().handsTitle}</p>
          <ul className="mt-2 flex flex-col gap-2">
            {mine.map((h) => (
              <li key={h.id} className="flex flex-wrap items-center gap-2" data-hand={h.id}>
                <span className="w-full text-sm">
                  {trade(h.trade)} · {h.shift === "day" ? t().day : t().night} ·{" "}
                  {t().level(h.level)}
                </span>
                <Act
                  small
                  disabled={busy || !shiftFree(h.shift === "day" ? "night" : "day")}
                  onClick={() =>
                    go({
                      type: "empireInteriorAssign",
                      workshopId,
                      handId: h.id,
                      stationId: st.id,
                      shift: h.shift === "day" ? "night" : "day",
                    })
                  }
                  data="shift"
                >
                  {h.shift === "day" ? t().toNight : t().toDay}
                </Act>
                <Act
                  small
                  disabled={busy}
                  onClick={() =>
                    go({
                      type: "empireInteriorAssign",
                      workshopId,
                      handId: h.id,
                      stationId: null,
                      shift: h.shift,
                    })
                  }
                  data="door"
                >
                  {t().toDoor}
                </Act>
              </li>
            ))}
          </ul>
          {free ? (
            fit ? (
              <Act
                primary
                wide
                disabled={busy}
                onClick={() =>
                  go({
                    type: "empireInteriorAssign",
                    workshopId,
                    handId: fit.id,
                    stationId: st.id,
                    shift: free,
                  })
                }
                data="place-hand"
              >
                {t().addHand(trade(fit.trade))} · {free === "day" ? t().day : t().night}
              </Act>
            ) : (
              <Act
                primary
                wide
                disabled={busy || waitFor !== null}
                onClick={() => {
                  setWaitFor({ trade: wanted, shift: free });
                  go({ type: "empireInteriorHire", workshopId, trade: wanted });
                }}
                data="hire"
              >
                {t().hire(trade(wanted), hireCost)} · {free === "day" ? t().day : t().night}
              </Act>
            )
          ) : (
            <p className="mt-2 text-xs text-[#C9C3B9]">{t().noSeat}</p>
          )}
        </div>
      ) : (
        <p className="mt-4 text-xs text-[#C9C3B9]">{t().alone}</p>
      )}
      <p className="mt-3 text-[0.6875rem] text-[#C9C3B9]">{t().waiting(waiting.length)}</p>
      <div className="mt-3 border-t border-white/10 pt-3">
        <Act
          disabled={busy}
          onClick={() => go({ type: "empireInteriorRemove", workshopId, stationId: st.id })}
          data="remove"
        >
          {t().remove}
        </Act>
      </div>
    </section>
  );
}

function Act({
  children,
  onClick,
  disabled,
  primary,
  small,
  wide,
  data,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  small?: boolean;
  wide?: boolean;
  data: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-station-act={data}
      className={`min-h-11 rounded-full px-4 font-display text-sm font-extrabold transition active:translate-y-0.5 disabled:opacity-40 ${
        primary
          ? "bg-[#C23B2E] text-white shadow-[0_3px_0_#8f2820]"
          : "bg-white/10 text-white shadow-[0_3px_0_rgb(0_0_0/0.4)]"
      } ${small ? "shrink-0 px-3 text-xs" : ""} ${wide ? "mt-2 w-full" : ""}`}
    >
      {children}
    </button>
  );
}
