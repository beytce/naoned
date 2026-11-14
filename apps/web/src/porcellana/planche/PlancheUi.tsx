/**
 * The small pieces of the shared board's interface (docs/audit-visuel-2026-11-11, the canvas the
 * owner validated): the bobbins drawn, the seals of a tower, a gauge cut by supplier, a house's flag.
 */

/** A bobbin: stretched (red), coming home (half red), free (dashed). */
export function Bobbin({ state, size = 24 }: { state: "out" | "back" | "free"; size?: number }) {
  return (
    <svg width={(size * 2) / 3} height={size} viewBox="0 0 16 24" aria-hidden="true">
      <rect x="1" y="1" width="14" height="4" rx="2" fill="var(--pc-ink)" />
      <rect x="1" y="19" width="14" height="4" rx="2" fill="var(--pc-ink)" />
      {state === "free" ? (
        <rect
          x="3"
          y="5"
          width="10"
          height="14"
          fill="var(--pc-paper)"
          stroke="var(--pc-accent)"
          strokeWidth="1.4"
          strokeDasharray="2 2"
        />
      ) : (
        <>
          <rect
            x="3"
            y="5"
            width="10"
            height="14"
            fill={state === "out" ? "var(--pc-accent)" : "#F1C9C2"}
          />
          {state === "back" ? (
            <rect x="3" y="12" width="10" height="7" fill="var(--pc-accent)" />
          ) : null}
        </>
      )}
    </svg>
  );
}

/** The seals a tower still has, out of three: whole, or broken (a ring). */
export function Seals({
  left,
  of = 3,
  light = false,
}: { left: number; of?: number; light?: boolean }) {
  return (
    <span
      className="pc-pl-seals"
      data-light={String(light)}
      aria-label={`${left} sceaux sur ${of}`}
    >
      {Array.from({ length: of }, (_, k) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: the seals are only counted.
        <i key={k} data-whole={String(k < left)} />
      ))}
    </span>
  );
}

/** A gauge cut by supplier: one's share in red, the others' in ink, what is free in paper. */
export function ShareBar({
  mine,
  others,
  big = false,
}: {
  mine: number;
  others: number[];
  big?: boolean;
}) {
  return (
    <span className="pc-pl-share" data-big={String(big)} aria-hidden="true">
      {mine > 0 ? <i data-mine="true" style={{ width: `${mine / 100}%` }} /> : null}
      {others
        .filter((o) => o > 0)
        .map((o, k) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: shares in order, largest first.
          <i key={k} style={{ width: `${o / 100}%` }} />
        ))}
    </span>
  );
}

/** A house's flag on the board: red for one's own, ink for a player's, grey for the computer's. */
export function Flag({ tone }: { tone: "mine" | "player" | "robot" }) {
  return <i className="pc-pl-flag" data-tone={tone} />;
}

/** The note of the news: a round of ink, an exclamation. */
export function NewsMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
      <circle cx="11" cy="11" r="10" fill="var(--pc-ink)" />
      <path d="M11 5 V12 M11 15.5 V16" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

/** Points of base as a whole percentage. */
export const pct = (bps: number) => `${Math.round(bps / 100)} %`;

/** A red knot: the problem of the day, on the board and the façade. */
export function Knot({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" className="pc-pl-knot">
      <circle cx="10" cy="10" r="9" fill="var(--pc-accent)" />
      <path
        d="M5 12 C5 6 11 5 12 9 C13 13 7 14 8 9 C9 5 15 6 15 12"
        fill="none"
        stroke="#F6F4F0"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
