/**
 * The tutorial asks the map to look at what is to be touched, when it stands out of sight (a town
 * at the board's edge): the camera glides to it, as to a place chosen. Kept a few seconds.
 */
let wanted: { id: string; at: number } | null = null;
const KEEP = 4_000;

export function askFocus(id: string): void {
  wanted = { id, at: Date.now() };
}

/** The place the tutorial wants in sight now, or null. */
export function tutorFocus(): string | null {
  if (!wanted || Date.now() - wanted.at > KEEP) return null;
  return wanted.id;
}
