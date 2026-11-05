/**
 * The place card (docs/plan-porcellana.md § 1, « exactly the way I want to see the information and
 * features appear », the owner): paper beside the place's pin, its name in a Venetian roman, its
 * role, one sentence of its state, a round button of accent to go in (the place's dock), a round
 * cross to close. On a phone, it lies at the foot, above the bar. Its position is written by the
 * scene at each frame (`place`), never through React.
 */
import { forwardRef, useImperativeHandle, useRef } from "react";

export interface PlaceCardInfo {
  name: string;
  sub: string;
  line: string;
  /** What the round button says to a screen reader (« Entrer », « Ouvrir la Dogana »…). */
  go: string;
}

export interface PlaceCardHandle {
  /** Sets the card beside a pin at (x, y) of the scene's box, within its width and height. */
  place(x: number, y: number, w: number, h: number): void;
}

export const PlaceCard = forwardRef<
  PlaceCardHandle,
  { info: PlaceCardInfo; onGo: () => void; onClose: () => void }
>(function PlaceCard({ info, onGo, onClose }, ref) {
  const el = useRef<HTMLElement>(null);
  useImperativeHandle(ref, () => ({
    place(px, py, w, h) {
      const c = el.current;
      if (!c || w < 640) return;
      const cw = c.offsetWidth;
      const ch = c.offsetHeight;
      let x = px + 26;
      if (x + cw > w - 16) x = px - cw - 26;
      const y = Math.max(80, Math.min(h - ch - 90, py - ch / 2));
      c.style.transform = `translate(${x.toFixed(0)}px,${y.toFixed(0)}px)`;
    },
  }));
  return (
    <section ref={el} className="pc-card" aria-live="polite" aria-label={info.name}>
      <button type="button" className="pc-x" aria-label="Fermer" onClick={onClose}>
        <svg
          viewBox="0 0 10 10"
          width="10"
          height="10"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M1 1l8 8M9 1l-8 8" />
        </svg>
      </button>
      <div>
        <h2>{info.name}</h2>
        <p className="pc-sub">{info.sub}</p>
        {info.line ? <p className="pc-line">{info.line}</p> : null}
      </div>
      <button type="button" className="pc-go" aria-label={info.go} onClick={onGo}>
        <svg
          viewBox="0 0 18 18"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M7 4l5 5-5 5" />
        </svg>
      </button>
    </section>
  );
});
