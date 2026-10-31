import { useState } from "react";
import { Lorenzo } from "../art/scenes.js";
import { d, hourOf } from "../game/format.js";
import { fr } from "../i18n.js";
import { LorenzoCard, Ribbon, Sheet, Slab, Stat, clock } from "../ui.js";
import { Term } from "./Term.js";
import { buildingName, workshopStatus } from "./logic.js";
import type { NextStep } from "./next.js";
import type { EmpireAction, EmpirePayload } from "./types.js";

const t = fr.empire.guide;
const goodName = (p: EmpirePayload, code: string) =>
  fr.themeNames.resource[code] ?? p.goods[code] ?? code;

/** The words of a step: what to do, and why, in one line each. */
function wordsOf(p: EmpirePayload, s: NextStep): { what: string; why: string; button?: string } {
  switch (s.kind) {
    case "collect":
      return { what: t.collect(s.lots), why: t.collectWhy, button: t.collectAction };
    case "relaunch":
      return { what: t.relaunch, why: t.relaunchWhy, button: t.relaunchAction };
    case "casa":
      return { what: t.casa(s.level), why: t.casaWhy, button: t.casaAction(s.level) };
    case "build":
      return {
        what: t.build(buildingName(p, s.type)),
        why: t.buildWhy(s.casa, goodName(p, s.good)),
        button: t.buildAction(buildingName(p, s.type)),
      };
    case "upgrade":
      return {
        what: t.upgrade(buildingName(p, s.type), s.level),
        why: t.upgradeWhy,
        button: t.upgradeAction(s.level),
      };
    case "sell":
      return {
        what: s.deliver
          ? t.deliver(s.qty, goodName(p, s.good))
          : t.sell(s.qty, goodName(p, s.good)),
        why: s.deliver ? t.deliverWhy : t.sellWhy,
        button: s.deliver ? t.deliverAction : t.sellAction,
      };
    case "claim":
      return { what: t.claim, why: t.claimWhy, button: t.claimAction };
    case "wait":
      return { what: s.at ? t.wait(hourOf(s.at)) : t.waitNone, why: t.waitWhy };
  }
}

/**
 * The next step (lot A of the UX audit): Lorenzo says the one thing to do now and why; the one gold
 * action of the screen does it.
 */
export function NextStepCard({
  p,
  now,
  step,
  busy,
  act,
  onBuild,
}: {
  p: EmpirePayload;
  now: number;
  step: NextStep;
  busy: boolean;
  act: (a: EmpireAction) => Promise<void>;
  onBuild: (recipe: string) => void;
}) {
  const w = wordsOf(p, step);
  const go = () => {
    if (step.kind === "build") onBuild(step.recipe);
    else if (step.kind !== "wait") void act(step.action);
  };
  return (
    <div className="mx-auto mt-3 w-full max-w-md" data-next-step={step.kind}>
      <LorenzoCard
        portrait={<Lorenzo size={40} />}
        name={t.name}
        foot={
          w.button ? (
            <Slab tone="gold" size="lg" className="mt-3 w-full" busy={busy} shine onClick={go}>
              {w.button}
            </Slab>
          ) : undefined
        }
      >
        <p className="font-display font-bold text-cream">{w.what}</p>
        <p className="mt-0.5 text-sm text-cream-dim">{w.why}</p>
        {step.kind === "wait" && <WaitArc p={p} now={now} />}
      </LorenzoCard>
    </div>
  );
}

/** While waiting: the arc of the lot that comes soonest (Lagune: time reads in arcs). */
function WaitArc({ p, now }: { p: EmpirePayload; now: number }) {
  const soonest = (p.view?.house.workshops ?? [])
    .map((w) => workshopStatus(p, w, now))
    .filter((s) => s.state === "running")
    .sort((a, b) => (a.state === "running" && b.state === "running" ? a.left - b.left : 0))[0];
  if (!soonest || soonest.state !== "running") return null;
  return <Ribbon value={soonest.progress} label={clock(soonest.left)} />;
}

const INTRO_KEY = "empireIntroSeen";
const seen = () => {
  try {
    return localStorage.getItem(INTRO_KEY) === "1";
  } catch {
    return false;
  }
};

/** Three cards at the founding: the loop, the purse, the Carnet. Kept as seen on the device. */
export function Intro({ p }: { p: EmpirePayload }) {
  const [page, setPage] = useState(seen() ? -1 : 0);
  if (page < 0 || page >= t.intro.length) return null;
  const close = () => {
    try {
      localStorage.setItem(INTRO_KEY, "1");
    } catch {
      // Nothing kept: the cards come back next time, no harm.
    }
    setPage(-1);
  };
  const last = page === t.intro.length - 1;
  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-night/80 p-4 pb-[calc(var(--tabbar)+1rem)] backdrop-blur-sm"
      data-intro
    >
      <div className="w-full max-w-md">
        <LorenzoCard
          bubble
          portrait={<Lorenzo size={48} />}
          name={t.name}
          aside={`${page + 1}/${t.intro.length}`}
          foot={
            <div className="mt-3 flex gap-2">
              <Slab tone="ghost" size="sm" onClick={close}>
                {t.skip}
              </Slab>
              <Slab
                size="sm"
                className="flex-1"
                onClick={() => (last ? close() : setPage(page + 1))}
              >
                {last ? t.start : t.next}
              </Slab>
            </div>
          }
        >
          <p className="font-display font-bold text-cream">{t.intro[page]?.[0]}</p>
          <p className="mt-1 text-sm text-cream-dim">
            {(t.intro[page]?.[1] ?? "").replace("{cash}", d(p.cash))}
          </p>
        </LorenzoCard>
      </div>
    </div>
  );
}

/** The house's measures, out of the header: the Casa, the Power and its band, the Favour, the Seals. */
export function HouseSheet({
  p,
  open,
  onClose,
}: {
  p: EmpirePayload;
  open: boolean;
  onClose: () => void;
}) {
  const view = p.view;
  if (!view) return null;
  const h = fr.empire.house;
  return (
    <Sheet open={open} onClose={onClose} kicker={h.kicker} title={h.title} summary={h.summary}>
      <div className="grid grid-cols-2 gap-2" data-house-sheet>
        <Stat label={<Term code="casa">{h.casa}</Term>} value={view.house.casa} tone="gold" />
        <Stat label={<Term code="power">{h.power}</Term>} value={view.power} />
        <Stat label={<Term code="band">{h.band}</Term>} value={view.band + 1} />
        <Stat label={<Term code="favour">{h.favour}</Term>} value={view.house.favour} />
        <Stat label={h.seals} value={view.house.seals} />
        <Stat label={<Term code="income">{h.income}</Term>} value={d(view.incomePerDay)} />
      </div>
    </Sheet>
  );
}
