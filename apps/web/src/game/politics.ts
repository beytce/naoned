/** Politics in figures, pure (refonte UX, lot 6): a source's score, a city's standing. */

/** A source's reliability as « right N times out of 8 » (8 500 bps → 7). */
export function outOfEight(reliabilityBps: number): number {
  return Math.max(0, Math.min(8, Math.round(reliabilityBps / 1250)));
}

/**
 * The merchant in a city's gauge: their share and the leader's, in whole percents, and their rank
 * (null: not on the gauge).
 */
export function cityStanding(line: {
  mine: number;
  total: number;
  top: { me: boolean; points: number }[];
}): { mine: number; lead: number; rank: number | null } {
  const pct = (n: number) => (line.total > 0 ? Math.round((n / line.total) * 100) : 0);
  const at = line.top.findIndex((x) => x.me);
  return {
    mine: pct(line.mine),
    lead: pct(line.top[0]?.points ?? 0),
    rank: at >= 0 ? at + 1 : null,
  };
}
