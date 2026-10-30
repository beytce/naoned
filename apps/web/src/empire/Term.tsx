import { useState } from "react";
import { fr } from "../i18n.js";

/**
 * A word of the game with its « ? » (lot A of the UX audit): a touch opens one sentence that says
 * what it is; another closes it.
 */
export function Term({ code, children }: { code: string; children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const text = fr.empire.terms[code];
  if (!text) return <>{children}</>;
  return (
    <span className="relative inline-flex items-baseline gap-1">
      {children}
      <button
        type="button"
        aria-label={fr.empire.termHelp}
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-night-3 text-[0.625rem] font-bold text-info ring-1 ring-info/50"
      >
        ?
      </button>
      {open && (
        <span
          role="note"
          className="absolute left-0 top-full z-30 mt-1 w-60 cut bg-night-4 p-2 text-left text-xs font-normal normal-case tracking-normal text-cream shadow-lg"
        >
          {text}
        </span>
      )}
    </span>
  );
}
