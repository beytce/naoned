/**
 * The Terraferma as a scene of its own, full screen like the Porta (the audit of 8 November 2026,
 * P0-5), and the way in (the owner's decision of the same day): mounted as the map's tiles start
 * to turn over, unseen, so that its board is drawn by the handoff; then it fades in over the map
 * and settles on the merchant's lands. « ‹ Carte » plays the way out. A week not joined yet, the
 * Condotta, the Contesa's roster: the pane of before, on a sheet of paper over the porcelain.
 */
import { Suspense, useEffect, useRef } from "react";
import type { TerraAction, TerraView } from "../game/types.js";
import { fr } from "../i18n.js";
import { stageOpacity } from "../porcellana/flip.js";
import { FLIP } from "../porcellana/tokens.js";
import { TerraBody, TerraPlay, useTerraBoard } from "./Terra.js";
import type { EmpireAction, EmpirePayload } from "./types.js";

type Act = (a: EmpireAction) => Promise<unknown>;
const t = fr.empire.terra;

export type TerraPhase = "in" | "open" | "out";

export function TerraStage({
  p,
  now,
  busy,
  act,
  phase,
  first,
  motion,
  onBack,
}: {
  p: EmpirePayload;
  now: number;
  busy: boolean;
  act: Act;
  phase: TerraPhase;
  /** The week's board fetched on the way in, if it came. */
  first: TerraView | null;
  /** The tiles turn over (WebGL, motion allowed); else a plain fade. */
  motion: boolean;
  onBack: () => void;
}) {
  const theatre = !!p.view?.terra.theatre;
  const [board, reload] = useTerraBoard(true, theatre, first);
  const el = useRef<HTMLDivElement>(null);
  // The fade, on the frame's clock: in after the tiles have turned, out at once on the way back.
  // biome-ignore lint/correctness/useExhaustiveDependencies: once a phase.
  useEffect(() => {
    const start = performance.now();
    let id = 0;
    const tick = () => {
      const s = (performance.now() - start) / 1_000;
      const o =
        phase === "open"
          ? 1
          : motion
            ? stageOpacity(s, phase === "out")
            : phase === "out"
              ? 1 - Math.min(1, s / FLIP.plainFade)
              : Math.min(1, s / FLIP.plainFade);
      if (el.current) {
        el.current.style.opacity = o.toFixed(3);
        el.current.style.pointerEvents = o > 0.5 && phase !== "out" ? "auto" : "none";
      }
      if ((phase === "in" && o < 1) || (phase === "out" && o > 0)) id = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(id);
  }, [phase]);
  const send = (a: TerraAction) =>
    act({ type: "empireTerra", action: a }).then((ok) => {
      reload();
      return ok !== false;
    });
  const playing = theatre && board?.map.grid === "square";
  return (
    <div
      ref={el}
      className="porcellana fixed inset-0 z-40 overflow-hidden lg:top-[var(--topbar,0px)]"
      style={{ opacity: 0, pointerEvents: "none" }}
      data-terra-stage={phase}
    >
      {playing && board ? (
        <Suspense fallback={null}>
          <TerraPlay
            v={board}
            now={now}
            busy={busy}
            send={send}
            className="absolute inset-0"
            intro={motion && phase === "in" ? FLIP.handoff : undefined}
            onBack={onBack}
          />
        </Suspense>
      ) : (
        <div className="absolute inset-0 overflow-y-auto px-4 pb-10 pt-20">
          <section className="mx-auto max-w-md rounded-3xl bg-night-2 p-5 shadow-lg">
            <h2 className="font-display text-2xl font-black">{t.title}</h2>
            <TerraBody p={p} now={now} open busy={busy} act={act} />
          </section>
        </div>
      )}
      {!playing && (
        <button
          type="button"
          className="pc-pill absolute left-3 top-3 z-50 flex min-h-11 items-center gap-1 px-4 text-sm font-extrabold"
          onClick={onBack}
          data-terra-back=""
        >
          <span aria-hidden="true">‹</span> {t.back}
        </button>
      )}
    </div>
  );
}
