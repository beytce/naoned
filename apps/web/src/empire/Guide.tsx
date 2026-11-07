import { useEffect, useRef, useState } from "react";
import { Lorenzo } from "../art/scenes.js";
import { DockDoor } from "../dock.js";
import { PushSettings } from "../game/PushSettings.js";
import { d, hourOf } from "../game/format.js";
import { GOLD } from "../game/gold.js";
import { Icon } from "../game/map/icons.js";
import { fr } from "../i18n.js";
import { GoldLayer, LorenzoCard, Ribbon, Sheet, Slab, Stat, clock } from "../ui.js";
import { Term } from "./Term.js";
import { PointingHand, handTargets, learn, learnt } from "./hand.js";
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
    case "deliver":
      return {
        what: t.deliverCity(
          fr.empire.cityNames[s.city] ?? s.city,
          s.qty,
          goodName(p, s.good),
          s.have,
        ),
        why: t.deliverCityWhy(d(s.pay)),
        button: t.deliverAction,
      };
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
    case "welcome":
      return welcomeWords(p, s);
  }
}

/** The welcome's words (the first steps, lot 2): one gesture at a time, and why. */
function welcomeWords(
  p: EmpirePayload,
  s: Extract<NextStep, { kind: "welcome" }>,
): { what: string; why: string; button?: string } {
  const w = t.welcome;
  const name = buildingName(p, s.type);
  const good = goodName(p, s.good);
  const city = s.city ? (fr.empire.cityNames[s.city] ?? s.city) : w.town;
  switch (s.phase) {
    case "build":
      return { what: w.build(name), why: w.buildWhy(good), button: w.buildAction(name) };
    case "launch":
      return { what: w.launch(name), why: w.launchWhy, button: w.launchAction };
    case "making":
      return { what: w.making(good), why: s.city ? w.makingWhy(city) : w.makingWhyNone };
    case "collect":
      return { what: w.collect(good), why: w.collectWhy(city), button: w.collectAction };
    case "deliver":
      return {
        what: w.deliver(city, s.qty ?? 0, good),
        why: w.deliverWhy(d(s.pay ?? 0n)),
        button: w.deliverAction,
      };
    case "onWay":
      return { what: w.onWay(city), why: w.onWayWhy };
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
  compact = false,
}: {
  p: EmpirePayload;
  now: number;
  step: NextStep;
  busy: boolean;
  act: (a: EmpireAction) => Promise<void>;
  onBuild: (recipe: string) => void;
  /** On the map (the map at the centre, step 1): one line and its button, over the map. */
  compact?: boolean;
}) {
  const w = wordsOf(p, step);
  // Lorenzo shows, he does not do (the gameplay audit, P4): his hand points at the object to
  // touch; his gold button does the gesture only the first time, until the house has made it.
  const [known, setKnown] = useState(learnt);
  const was = useRef(step.kind);
  useEffect(() => {
    if (was.current !== step.kind && was.current !== "wait") {
      learn(was.current);
      setKnown(learnt());
    }
    was.current = step.kind;
  }, [step.kind]);
  // The welcome's button stays: it is the guide of the first order (the first steps, lot 2).
  const button = step.kind === "welcome" || !known.has(step.kind) ? w.button : undefined;
  const go = () => {
    if (step.kind === "build") onBuild(step.recipe);
    else if (step.kind === "welcome") {
      if (step.phase === "build") onBuild(step.recipe);
      else if (step.action) void act(step.action);
    } else if (step.kind !== "wait") void act(step.action);
  };
  if (compact)
    return (
      <GoldLayer depth={GOLD.guide} atLeast>
        <div
          className="pointer-events-auto flex w-full max-w-md items-end gap-2"
          data-next-step={step.kind}
        >
          {/* Lorenzo speaks in a bubble beside his portrait (the playful Porcellana). */}
          <span className="shrink-0 rounded-full bg-night-3 p-0.5 shadow-[0_3px_0_rgb(23_21_15/0.12)]">
            <Lorenzo size={40} />
          </span>
          <div className="glass flex min-w-0 flex-1 items-center gap-2.5 rounded-[1.5rem] rounded-bl-md py-2 pl-3.5 pr-2">
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 font-display text-[0.9375rem] font-extrabold leading-snug text-cream">
                {w.what}
              </p>
              {step.kind === "wait" && <WaitArc p={p} now={now} />}
              {step.kind === "welcome" && <WelcomeArc step={step} now={now} />}
            </div>
            {button && (
              <Slab tone="gold" size="sm" busy={busy} shine onClick={go}>
                {button}
              </Slab>
            )}
          </div>
        </div>
        <PointingHand selectors={handTargets(step)} />
      </GoldLayer>
    );
  return (
    <GoldLayer depth={GOLD.guide} atLeast>
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
          {step.kind === "welcome" && <WelcomeArc step={step} now={now} />}
        </LorenzoCard>
      </div>
    </GoldLayer>
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

/** The welcome's lot under way, or its vehicle on the road: the time left, in an arc. */
function WelcomeArc({
  step,
  now,
}: {
  step: Extract<NextStep, { kind: "welcome" }>;
  now: number;
}) {
  if (step.from === undefined || step.at === undefined || step.at <= now) return null;
  const span = Math.max(1, step.at - step.from);
  return <Ribbon value={Math.min(1, (now - step.from) / span)} label={clock(step.at - now)} />;
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
      className="fixed inset-0 z-[60] flex items-end justify-center bg-night/85 p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
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
          <p className="font-display font-bold text-cream">
            {(t.intro[page]?.[0] ?? "").replace("{cash}", d(p.cash))}
          </p>
          <p className="mt-1 text-sm text-cream-dim">
            {(t.intro[page]?.[1] ?? "").replace("{cash}", d(p.cash))}
          </p>
        </LorenzoCard>
      </div>
    </div>
  );
}

/** The Fondaco level from which the Power and its band are shown (the Porta's). */
const MEASURES_FROM = 4;

/** The house's measures, out of the header: the Casa, the Power and its band, the Favour, the Seals. */
export function HouseSheet({
  p,
  open,
  onClose,
  onFamily,
  onHelp,
  onMarket,
  familyCalls = false,
}: {
  p: EmpirePayload;
  open: boolean;
  onClose: () => void;
  /** The profile's doors (the refonte claire, 5 November 2026): what had a tab of its own. */
  onFamily?: () => void;
  onHelp?: () => void;
  onMarket?: () => void;
  familyCalls?: boolean;
}) {
  const view = p.view;
  if (!view) return null;
  const h = fr.empire.house;
  const doors = fr.empire.profile;
  return (
    <Sheet open={open} onClose={onClose} kicker={h.kicker} title={h.title} summary={h.summary}>
      {(onFamily || onHelp || onMarket) && (
        <div className="mb-5 grid grid-cols-3 gap-2" data-profile-doors>
          {onFamily && (
            <DockDoor
              icon={Icon.family()}
              label={doors.family}
              badge={familyCalls ? "!" : undefined}
              badgeTone="gold"
              onClick={onFamily}
              attrs={{ "data-profile-door": "family" }}
            />
          )}
          {onMarket && (
            <DockDoor
              icon={Icon.rialto()}
              label={doors.market}
              onClick={onMarket}
              attrs={{ "data-profile-door": "market" }}
            />
          )}
          {onHelp && (
            <DockDoor
              icon={Icon.help()}
              label={doors.help}
              onClick={onHelp}
              attrs={{ "data-profile-door": "help" }}
            />
          )}
        </div>
      )}
      <div className="grid grid-cols-2 gap-2" data-house-sheet>
        <Stat label={<Term code="casa">{h.casa}</Term>} value={view.house.casa} tone="gold" />
        {/* Shown once they serve (docs/plan-publication.md D1): the Power and its band from the
            Porta's level, where they pair the houses; the Seals once there are some. */}
        {view.house.casa >= MEASURES_FROM && (
          <>
            <Stat label={<Term code="power">{h.power}</Term>} value={view.power} />
            <Stat label={<Term code="band">{h.band}</Term>} value={view.band + 1} />
          </>
        )}
        <Stat label={<Term code="favour">{h.favour}</Term>} value={view.house.favour} />
        {view.house.seals > 0 && <Stat label={h.seals} value={view.house.seals} />}
        <Stat label={<Term code="income">{h.income}</Term>} value={d(view.incomePerDay)} />
      </div>
      {/* The empire's notices, asked for, three kinds (decision of the owner, 4 November). */}
      <div className="mt-6" data-house-push>
        <PushSettings only={(k) => k.startsWith("empire_")} />
      </div>
    </Sheet>
  );
}

/**
 * Lorenzo's advice, past the tutorial (behind the « ? »): what he would do now and why, in words;
 * the gesture is the player's.
 */
export function HelpSheet({
  p,
  now,
  step,
  open,
  onClose,
}: {
  p: EmpirePayload;
  now: number;
  step: NextStep;
  open: boolean;
  onClose: () => void;
}) {
  const w = wordsOf(p, step);
  return (
    <Sheet open={open} onClose={onClose} kicker={t.name} title={fr.empire.scene.help}>
      <div className="flex items-start gap-3" data-help>
        <Lorenzo size={48} />
        <div className="min-w-0">
          <p className="font-display font-bold text-cream">{w.what}</p>
          <p className="mt-1 text-sm text-cream-dim">{w.why}</p>
          {step.kind === "wait" && <WaitArc p={p} now={now} />}
        </div>
      </div>
    </Sheet>
  );
}
