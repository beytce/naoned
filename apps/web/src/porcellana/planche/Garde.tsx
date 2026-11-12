/**
 * The prepared guard (docs/plan-hex-commerce.md H4): the board of one's tower seen from above,
 * the links one lays in advance where the chain must hold. The thread runs from the south rail to
 * the north one (red), the chain from west to east (ink).
 */
import { PASSE_EMPTY, PASSE_REEF } from "@comptoirs/engine";
import { useEffect, useState } from "react";

export function GardeEditor({
  board,
  links,
  guard,
  locked,
  onLay,
}: {
  board: { width: number; height: number; cells: readonly number[] };
  /** How many links may be laid. */
  links: number;
  /** The guard laid now. */
  guard: readonly number[];
  /** Changed today already: shown, not changed. */
  locked: boolean;
  onLay: (cells: number[]) => void;
}) {
  const [picked, setPicked] = useState<number[]>([...guard]);
  const key = guard.join(",");
  // biome-ignore lint/correctness/useExhaustiveDependencies: the guard laid, by its cells.
  useEffect(() => setPicked([...guard]), [key]);
  const w = board.width;
  const cells = board.cells.map((v, id) => ({ id, v }));
  const toggle = (i: number) => {
    if (locked || board.cells[i] !== PASSE_EMPTY) return;
    setPicked((p) => (p.includes(i) ? p.filter((x) => x !== i) : p.length < links ? [...p, i] : p));
  };
  const same = picked.length === guard.length && picked.every((i) => guard.includes(i));
  return (
    <div className="pc-pl-garde" data-garde>
      <fieldset
        className="pc-pl-garde-board"
        style={{ gridTemplateColumns: `repeat(${w}, 1fr)` }}
        aria-label={`Le plateau de ta tour, ${picked.length} maillon${picked.length > 1 ? "s" : ""} posé${picked.length > 1 ? "s" : ""} sur ${links}`}
      >
        {cells.map(({ id, v }) => {
          const on = picked.includes(id);
          return (
            <button
              key={id}
              type="button"
              data-garde-cell={id}
              data-reef={String(v === PASSE_REEF)}
              aria-pressed={on}
              aria-label={`Case ${id + 1}${v === PASSE_REEF ? ", un récif" : ""}`}
              disabled={locked || v !== PASSE_EMPTY}
              onClick={() => toggle(id)}
            >
              {on ? (
                <svg width="18" height="12" viewBox="0 0 18 12" aria-hidden="true">
                  <ellipse
                    cx="6"
                    cy="6"
                    rx="4.5"
                    ry="3.4"
                    fill="none"
                    stroke="#2a2725"
                    strokeWidth="2.2"
                  />
                  <ellipse
                    cx="12"
                    cy="6"
                    rx="4.5"
                    ry="3.4"
                    fill="none"
                    stroke="#2a2725"
                    strokeWidth="2.2"
                  />
                </svg>
              ) : null}
            </button>
          );
        })}
      </fieldset>
      <div>
        <b>
          La garde · {picked.length} maillon{picked.length > 1 ? "s" : ""} sur {links}
        </b>
        <span>
          {locked
            ? "Posée aujourd'hui : tu pourras la changer demain."
            : "Touche les cases où ta chaîne doit tenir. Ton lieutenant défendra à partir d'eux."}
        </span>
        {locked ? null : (
          <button
            type="button"
            className="pc-passe-go"
            data-garde-lay
            disabled={same}
            onClick={() => onLay(picked)}
          >
            Poser la garde
          </button>
        )}
      </div>
    </div>
  );
}
