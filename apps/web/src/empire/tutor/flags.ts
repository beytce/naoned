/**
 * What the device keeps of the tutorials: the guided start closed or passed, each first time seen.
 * A private window keeps nothing: the tutorials then come back, no harm.
 */
const KEY = "fondaco:tutor";

type Flags = Record<string, string>;

function read(): Flags {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Flags;
  } catch {
    return {};
  }
}

function write(f: Flags): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(f));
  } catch {
    // Nothing kept.
  }
}

/** A tutorial's mark: « done », « skip », or null when it has to play. */
export function tutorFlag(id: string): string | null {
  const f = read();
  return f[id] ?? (f.all === "skip" ? "skip" : null);
}

export function setTutorFlag(id: string, value: string): void {
  write({ ...read(), [id]: value });
}

/** « Passer les tutoriels »: none plays any more on this device. */
export function skipAllTutors(): void {
  write({ ...read(), all: "skip" });
}

/** « Revoir les tutoriels »: every first time plays again (the guided start, only while it leads). */
export function replayTutors(): void {
  write({});
}
