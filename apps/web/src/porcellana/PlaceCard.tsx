/**
 * The place card (docs/plan-porcellana.md § 1, « exactly the way I want to see the information and
 * features appear », the owner), in the playful Porcellana (proposal D, 6 November 2026): an ink
 * card beside the place's pin, its name round and heavy, its role, one sentence of its state, a red
 * key to go in (the place's dock), a round cross to close, a « Prêt ! » tag when something waits. On a phone, it lies at the foot, above the bar. Its position is written by the
 * scene at each frame (`place`), never through React.
 */
import { forwardRef, useImperativeHandle, useRef } from "react";

export interface PlaceCardInfo {
  name: string;
  sub: string;
  line: string;
  /** What the button says (« Entrer », « Ouvrir la Dogana »…); empty: no button. */
  go: string;
  /** Something to take there now: a « Prêt ! » tag stuck on aslant. */
  ready?: boolean;
  /** The tag's word. */
  tag?: string;
  /** A second way, quieter, under the red key (« Voir Contarini »); empty: none. */
  alt?: string;
  /** The place's id (« workshop:w3 »): the tutorial finds its button by it. */
  id?: string;
}

export interface PlaceCardHandle {
  /** Sets the card beside a pin at (x, y) of the scene's box, within its width and height. */
  place(x: number, y: number, w: number, h: number): void;
}

export const PlaceCard = forwardRef<
  PlaceCardHandle,
  { info: PlaceCardInfo; onGo: () => void; onClose: () => void; onAlt?: () => void }
>(function PlaceCard({ info, onGo, onClose, onAlt }, ref) {
  const el = useRef<HTMLElement>(null);
  useImperativeHandle(ref, () => ({
    place(px, py, w, h) {
      const c = el.current;
      if (!c || w < 640) return;
      const cw = c.offsetWidth;
      const ch = c.offsetHeight;
      let x = px + 26;
      if (x + cw > w - 16) x = px - cw - 26;
      const y = Math.max(120, Math.min(h - ch - 90, py - ch / 2));
      c.style.transform = `translate(${x.toFixed(0)}px,${y.toFixed(0)}px)`;
    },
  }));
  return (
    <section
      ref={el}
      className="pc-card"
      aria-live="polite"
      aria-label={info.name}
      data-card-place={info.id}
    >
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
      {info.ready && info.tag ? <span className="pc-tag">{info.tag}</span> : null}
      <div>
        <h2>{info.name}</h2>
        <p className="pc-sub">{info.sub}</p>
        {info.line ? <p className="pc-line">{info.line}</p> : null}
      </div>
      {info.go || (info.alt && onAlt) ? (
        <div className="pc-keys">
          {info.go ? (
            <button type="button" className="pc-go" onClick={onGo}>
              <span>{info.go}</span>
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
          ) : null}
          {info.alt && onAlt ? (
            <button type="button" className="pc-alt" onClick={onAlt}>
              {info.alt}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
});
