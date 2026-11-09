/**
 * « Pendant ton absence » (docs/plan-terraferme-porcellana.md § 4 octies, lot T6): the board as it
 * was at a time of the last day, from the cells that changed hands since (the view's `changes`,
 * each with its holder before), and the frames of a quick replay from the last visit to now; what
 * the merchant gained and lost meanwhile. Pure.
 */
import type { TerraView } from "../../game/types.js";

/** The holders of every cell at `t`: today's, the changes after `t` undone, the latest first. */
export function ownersAt(v: Pick<TerraView, "owner" | "changes">, t: number): number[] {
  const out = [...v.owner];
  const after = v.changes.filter((c) => c.at > t).sort((a, b) => b.at - a.at || b.cell - a.cell);
  for (const c of after) out[c.cell] = c.from;
  return out;
}

/** The replay's frames from `since` to `now`, `n` at most (the last is today's board). */
export function awayFrames(
  v: Pick<TerraView, "owner" | "changes">,
  since: number,
  now: number,
  n = 8,
): number[][] {
  if (!v.changes.some((c) => c.at > since && c.at <= now)) return [];
  const frames: number[][] = [];
  for (let k = 0; k <= n; k++) frames.push(ownersAt(v, since + ((now - since) * k) / n));
  return frames;
}

/** What the merchant `me` gained and lost since: cells, and its fronts come home. */
export function awaySummary(
  v: Pick<TerraView, "owner" | "changes"> & { me?: { returns?: { at: number }[] } | null },
  me: number,
  since: number,
): { gained: number; lost: number; back: number } {
  const was = ownersAt(v, since);
  let gained = 0;
  let lost = 0;
  v.owner.forEach((o, c) => {
    if (o === me && was[c] !== me) gained++;
    if (o !== me && was[c] === me) lost++;
  });
  const back = (v.me?.returns ?? []).filter((r) => r.at > since).length;
  return { gained, lost, back };
}
