import { type ReactNode, useEffect, useRef, useState } from "react";

/** As long as `--t-quick` (index.css): what leaves is gone by then. */
const LEAVE_MS = 160;

/**
 * The one place at the foot of the map (the map at the centre, step 3): the round buttons, the
 * panel of a place, the bar of placing take it in turn. What leaves slides down and fades
 * (`--t-quick`), what comes rises (`--t-base`), on transform and opacity only; a sheet open over
 * the map sends the whole foot down instead of taking it away.
 */
export function BottomSlot({
  id,
  hidden,
  children,
}: {
  /** What the foot shows: a change of it is a change of piece. */
  id: string;
  hidden: boolean;
  children: ReactNode;
}) {
  const [leaving, setLeaving] = useState<{ id: string; node: ReactNode } | null>(null);
  const last = useRef<{ id: string; node: ReactNode }>({ id, node: children });
  useEffect(() => {
    if (last.current.id === id) {
      last.current = { id, node: children };
      return;
    }
    setLeaving(last.current);
    last.current = { id, node: children };
    const t = setTimeout(() => setLeaving(null), LEAVE_MS);
    return () => clearTimeout(t);
  }, [id, children]);
  return (
    <div
      className={`pointer-events-none absolute inset-x-0 bottom-0 z-30 transition-transform duration-[var(--t-base)] ease-[var(--ease-out)] ${hidden ? "translate-y-[110%]" : ""}`}
      data-bottom-slot={id}
    >
      {leaving && (
        <div
          key={`out-${leaving.id}`}
          className="slot-out absolute inset-x-0 bottom-0"
          aria-hidden="true"
        >
          {leaving.node}
        </div>
      )}
      <div key={id} className="slot-in relative flex flex-col items-center">
        {children}
      </div>
    </div>
  );
}
