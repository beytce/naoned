/**
 * The first times (8 November 2026): when a new place first stands on the screen (the Porta, the
 * Remise, a workshop's inside, the Terraferma), its short tutorial plays under the spotlight, one
 * « Suivant » at a time, never while the guided start leads.
 */
import { useEffect, useRef, useState } from "react";
import { fr } from "../../i18n.js";
import type { EmpirePayload } from "../types.js";
import { firstTutorOn } from "./FirstTutor.js";
import { Spotlight, firstInSight } from "./Spotlight.js";
import { FEATURE_TUTORS, type FeatureTutor } from "./features.js";
import { setTutorFlag, tutorFlag } from "./flags.js";

export function FeatureTutors({ p, now }: { p: EmpirePayload; now: number }) {
  const [playing, setPlaying] = useState<{ tutor: FeatureTutor; step: number } | null>(null);
  const first = useRef(false);
  first.current = firstTutorOn(p, now);
  useEffect(() => {
    if (playing) return;
    const id = window.setInterval(() => {
      if (first.current) return;
      const due = FEATURE_TUTORS.find((x) => tutorFlag(x.id) === null && firstInSight([x.when]));
      if (due) setPlaying({ tutor: due, step: 0 });
    }, 600);
    return () => window.clearInterval(id);
  }, [playing]);
  if (!playing) return null;
  const steps = playing.tutor.steps();
  const s = steps[playing.step];
  if (!s) return null;
  const last = playing.step === steps.length - 1;
  const T = fr.empire.tutor;
  return (
    <Spotlight
      still
      chain={s.chain}
      foot={
        <div className="mt-3 flex items-center gap-3">
          <span className="text-xs font-bold tabular-nums text-[#625D55]">
            {T.stepOf(playing.step + 1, steps.length)}
          </span>
          <button
            type="button"
            data-tutor-next
            className="min-h-11 flex-1 rounded-full bg-[#C23B2E] px-5 font-display font-extrabold text-white"
            onClick={() => {
              if (last) {
                setTutorFlag(playing.tutor.id, "done");
                setPlaying(null);
              } else setPlaying({ tutor: playing.tutor, step: playing.step + 1 });
            }}
          >
            {last ? T.gotIt : T.next}
          </button>
        </div>
      }
    >
      <p
        className="font-display text-[0.9375rem] font-extrabold leading-snug"
        data-tutor-step={`${playing.tutor.id}:${playing.step}`}
      >
        {s.what}
      </p>
      <p className="mt-0.5 text-sm text-[#625D55]">{s.why}</p>
    </Spotlight>
  );
}
