/**
 * The week (docs/plan-semaine.md D2, decision D3 of the audit of 13 November 2026): seven days at
 * the foot of the board, today in ink; each day bears the object that fills it (the knot of the
 * day's problem, the War's flag, the Muda's ship, the Gazette's sheet); a single red dot, on today,
 * when a gesture waits there. It takes the place of the stack of pills.
 */
import { Knot } from "./PlancheUi.js";

export type DayObject = "guerre" | "muda" | "gazette" | null;

export interface SemaineDay {
  /** The object of the day, if a place it opens is open to the house. */
  object: DayObject;
}

const LABELS = ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"];
const NAMES: Record<NonNullable<DayObject>, string> = {
  guerre: "la Guerre",
  muda: "la Muda",
  gazette: "la Gazette",
};

function Icon({ object }: { object: NonNullable<DayObject> }) {
  if (object === "guerre")
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
        <path
          d="M4 18 V3 M4 3 H15 L12 7 L15 11 H4"
          fill="var(--pc-ink)"
          stroke="var(--pc-ink)"
          strokeWidth="1.6"
        />
      </svg>
    );
  if (object === "muda")
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
        <path d="M2 12 H18 L15.5 17 H4.5 Z" fill="var(--pc-ink)" />
        <path
          d="M10 2 V12 M10 3 Q15 6 10 10"
          stroke="var(--pc-ink)"
          strokeWidth="1.6"
          fill="var(--pc-paper)"
        />
      </svg>
    );
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <rect
        x="3"
        y="3"
        width="14"
        height="14"
        rx="1.5"
        fill="var(--pc-paper)"
        stroke="var(--pc-ink)"
        strokeWidth="1.6"
      />
      <path d="M6 7 H14 M6 10 H14 M6 13 H11" stroke="var(--pc-ink)" strokeWidth="1.4" />
    </svg>
  );
}

export function Semaine({
  title,
  today,
  days,
  knot,
  waiting,
  onDay,
  onTitle,
}: {
  /** The ribbon's title: the tide and its week, once the tide is open. */
  title: string;
  /** Today, from Monday (0) to Sunday (6). */
  today: number;
  days: SemaineDay[];
  /** The day's problem on today, when it is open: not played, won or lost. */
  knot: "no" | "won" | "lost" | null;
  /** A gesture waits today: the one red dot. */
  waiting: boolean;
  /** A day's object touched: the day's problem, or the day's place. */
  onDay: (day: number, what: "jour" | NonNullable<DayObject>) => void;
  /** The title opens the tide's sheet, when there is one. */
  onTitle?: () => void;
}) {
  return (
    <nav className="pc-semaine" aria-label="La semaine" data-semaine>
      {onTitle ? (
        <button
          type="button"
          className="pc-semaine-title"
          onClick={onTitle}
          data-semaine-title
          data-maree-open
        >
          {title}
        </button>
      ) : (
        <span className="pc-semaine-title">{title}</span>
      )}
      <ol>
        {LABELS.map((label, d) => {
          const day = days[d];
          const isToday = d === today;
          const object = day?.object ?? null;
          const showKnot = isToday && !!knot;
          // Today may bear two things, the knot and the day's object: each its own touch.
          return (
            <li key={label} data-semaine-day={d} data-today={String(isToday)}>
              <span className="pc-semaine-label">{label}</span>
              <span className="pc-semaine-objects">
                {showKnot ? (
                  <button
                    type="button"
                    className="pc-semaine-knot"
                    data-daily=""
                    data-done={knot}
                    aria-label={`Le Problème du jour${knot === "no" ? ", pas encore joué" : knot === "won" ? ", réussi" : ", joué"}`}
                    onClick={() => onDay(d, "jour")}
                  >
                    <Knot size={18} />
                  </button>
                ) : null}
                {object ? (
                  <button
                    type="button"
                    aria-label={`${label} : ${NAMES[object]}`}
                    data-guerre-open={object === "guerre" ? "" : undefined}
                    data-muda-open={object === "muda" ? "" : undefined}
                    data-gazette-open={object === "gazette" ? "" : undefined}
                    onClick={() => onDay(d, object)}
                  >
                    <Icon object={object} />
                  </button>
                ) : null}
              </span>
              {isToday && waiting ? <i className="pc-semaine-dot" data-semaine-waiting /> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
