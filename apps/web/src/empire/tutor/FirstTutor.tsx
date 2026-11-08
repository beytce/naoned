/**
 * The guided start (the owner's decision of 8 November 2026): from the founding to the Fondaco's
 * level 2, one gesture at a time under the spotlight. Its last card closes it; « Passer les
 * tutoriels » in the profile is the only other way out.
 */
import { useState } from "react";
import { fr } from "../../i18n.js";
import { Ribbon, clock } from "../../ui.js";
import { introSeen } from "../Guide.js";
import { buildingName } from "../logic.js";
import type { EmpirePayload } from "../types.js";
import { Spotlight } from "./Spotlight.js";
import { setTutorFlag, tutorFlag } from "./flags.js";
import { CLOSERS, type TutorStep, tutorStep } from "./script.js";

const t = () => fr.empire.tutor;
const goodName = (p: EmpirePayload, code: string) =>
  fr.themeNames.resource[code] ?? p.goods[code] ?? code;
const cityName = (code?: string) => (code ? (fr.empire.cityNames[code] ?? code) : "");

/** Lorenzo's words for a step: what to do, and how. */
export function tutorWords(p: EmpirePayload, s: TutorStep): { what: string; why: string } {
  const T = t();
  const wood = goodName(p, "wood");
  switch (s.id) {
    case "build":
      return { what: T.build(buildingName(p, s.type ?? "")), why: T.buildWhy };
    case "launch":
      return { what: T.launch(buildingName(p, s.type ?? "")), why: T.launchWhy };
    case "making":
      return { what: T.making(wood), why: T.makingWhy };
    case "collect":
      return { what: T.collect(wood), why: T.collectWhy };
    case "deliver":
      return { what: T.deliver(cityName(s.city)), why: T.deliverWhy };
    case "onWay":
      return { what: T.onWay(cityName(s.city)), why: T.onWayWhy };
    case "sawmill":
      return { what: T.sawmill, why: T.sawmillWhy };
    case "market":
      return { what: T.market(goodName(p, s.good ?? "")), why: T.marketWhy };
    case "casa":
      return { what: T.casa, why: T.casaWhy };
    case "rising":
      return { what: T.rising, why: T.risingWhy };
  }
}

/** Whether the guided start leads now: the intro read, not passed, not closed. */
export function firstTutorOn(p: EmpirePayload, now: number): boolean {
  return introSeen() && tutorFlag("first") === null && tutorStep(p, now) !== null;
}

export function FirstTutor({ p, now }: { p: EmpirePayload; now: number }) {
  const [, redraw] = useState(0);
  if (!firstTutorOn(p, now)) return null;
  const step = tutorStep(p, now);
  if (!step) return null;
  const w = tutorWords(p, step);
  const left = step.until ? Math.max(0, step.until - now) : null;
  const share =
    step.until && step.from ? (now - step.from) / Math.max(1, step.until - step.from) : null;
  return (
    <Spotlight chain={step.chain} fallback={CLOSERS}>
      <p
        className="font-display text-[0.9375rem] font-extrabold leading-snug"
        data-tutor-step={step.id}
      >
        {w.what}
      </p>
      <p className="mt-0.5 text-sm text-[#625D55]">{w.why}</p>
      {share !== null && left !== null && (
        <div className="mt-2">
          <Ribbon value={share} label={clock(left)} />
        </div>
      )}
      {step.id === "rising" && (
        <button
          type="button"
          data-tutor-done
          className="mt-3 min-h-11 w-full rounded-full bg-[#C23B2E] px-5 font-display font-extrabold text-white"
          onClick={() => {
            setTutorFlag("first", "done");
            redraw((n) => n + 1);
          }}
        >
          {t().done}
        </button>
      )}
    </Spotlight>
  );
}
