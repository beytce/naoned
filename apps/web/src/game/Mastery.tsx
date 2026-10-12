import { useEffect, useState } from "react";
import { MasteryEmblem } from "../art/mastery.js";
import { fr } from "../i18n.js";
import { Label, Panel, Ribbon, Sheet, Slab } from "../ui.js";
import type { GameProps } from "./Game.js";
import { store } from "./store.js";
import type { Catalog } from "./types.js";

const t = () => fr.game.mastery;

/** What a mastery changes, in plain words, from the world's settings. */
export function masteryEffects(catalog: Catalog, code: string): string[] {
  const o = catalog.specialties.options[code];
  if (!o) return [];
  const e = t().effects;
  const pct = (bps: number) => Math.round(bps / 100);
  return [
    o.transformYieldBps > 0 ? e.transform(pct(o.transformYieldBps)) : null,
    o.vehicleSpeedBps > 0 ? e.speed(pct(o.vehicleSpeedBps)) : null,
    o.extraVehicles > 0 ? e.vehicles(o.extraVehicles) : null,
    o.marketMakerQuotaBps > 0 ? e.quota(pct(o.marketMakerQuotaBps)) : null,
    o.taxDiscountBps > 0 ? e.tax(pct(o.taxDiscountBps)) : null,
    o.extraOpenOrders > 0 ? e.offers(o.extraOpenOrders) : null,
    o.portDuesDiscountBps > 0 ? e.dues(pct(o.portDuesDiscountBps)) : null,
    o.holdBps > 0 ? e.hold(pct(o.holdBps)) : null,
  ].filter((x): x is string => x !== null);
}

/** The choice of the season's mastery: four paths, one for good. */
function MasteryChoice(props: GameProps & { onDone: () => void }) {
  const codes = Object.keys(props.catalog.specialties.options);
  const [picked, setPicked] = useState<string | null>(null);
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-gold">{t().kicker}</Label>
        <h3 className="mt-1 font-display text-2xl font-extrabold uppercase">{t().title}</h3>
        <p className="mt-2 text-sm text-cream-dim">{t().help}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {codes.map((code) => (
          <button
            key={code}
            type="button"
            aria-pressed={picked === code}
            onClick={() => setPicked(code)}
            className={`flex gap-3 cut border p-3 text-left transition active:scale-[0.99] ${picked === code ? "border-gold bg-gold/10" : "border-line bg-night-3"}`}
          >
            <MasteryEmblem code={code} size={48} />
            <div className="min-w-0">
              <p className="font-display text-sm font-extrabold uppercase">
                {t().names[code] ?? code}
              </p>
              <p className="mt-0.5 text-xs italic text-cream-dim">{t().mottos[code] ?? ""}</p>
              <ul className="mt-2 space-y-0.5 text-xs">
                {masteryEffects(props.catalog, code).map((line) => (
                  <li key={line}>· {line}</li>
                ))}
              </ul>
            </div>
          </button>
        ))}
      </div>
      <Slab
        size="lg"
        className="w-full"
        disabled={!picked || props.busy}
        onClick={async () => {
          if (picked && (await props.act({ type: "chooseSpecialty", specialty: picked })))
            props.onDone();
        }}
      >
        {picked ? t().confirm(t().names[picked] ?? picked) : t().pick}
      </Slab>
      <p className="text-center text-xs text-muted">{t().forGood}</p>
    </div>
  );
}

/**
 * On the counter: how far the house is from its mastery, the call to choose it once open (the
 * choice opens by itself the first time), then nothing once chosen.
 */
export function MasteryTile(props: GameProps) {
  const { mastery } = props.view;
  const need = props.catalog.specialties.unlockLevels;
  const open = props.sheet === "mastery";
  const options = Object.keys(props.catalog.specialties.options).length;
  useEffect(() => {
    if (mastery.unlocked && !mastery.chosen && store.get("masteryOffered") !== "1") {
      store.set("masteryOffered", "1");
      props.setSheet("mastery");
    }
  }, [mastery.unlocked, mastery.chosen, props.setSheet]);
  if (options === 0 || mastery.chosen) return null;
  return (
    <>
      {mastery.unlocked ? (
        <button
          type="button"
          onClick={() => props.setSheet("mastery")}
          className="flex w-full items-center gap-3 cut border border-gold/70 bg-gold/10 px-4 py-3 text-left"
        >
          <span className="flex -space-x-3">
            {Object.keys(props.catalog.specialties.options).map((c) => (
              <MasteryEmblem key={c} code={c} size={28} />
            ))}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold text-gold">{t().ready}</span>
            <span className="label block">{t().readyHelp}</span>
          </span>
          <span className="text-gold">→</span>
        </button>
      ) : (
        <Panel>
          <Label>{t().kicker}</Label>
          <p className="mt-1 text-sm text-cream-dim">{t().locked(mastery.levels, need)}</p>
          <div className="mt-2">
            <Ribbon value={Math.min(1, mastery.levels / need)} />
          </div>
        </Panel>
      )}
      <Sheet open={open} onClose={() => props.setSheet(null)}>
        <MasteryChoice {...props} onDone={() => props.setSheet(null)} />
      </Sheet>
    </>
  );
}
