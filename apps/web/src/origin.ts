/**
 * Where a newcomer comes from (E3-4 of the experts, 25 October 2026): the shared link's `ref`
 * (the pseudo of who shared it) and the campaign's `utm_*`, kept for the visit and sent once at
 * sign-up. Storage may be refused (private window): the game plays the same without it.
 */
export interface Origin {
  ref?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

const KEY = "fondaco.origin";
const FIELDS: [keyof Origin, string][] = [
  ["ref", "ref"],
  ["utmSource", "utm_source"],
  ["utmMedium", "utm_medium"],
  ["utmCampaign", "utm_campaign"],
];

/** The origin an address carries, each value cut to 64 characters; null when it carries none. */
export function originOf(search: string): Origin | null {
  const params = new URLSearchParams(search);
  const out: Origin = {};
  for (const [field, param] of FIELDS) {
    const v = params.get(param)?.trim();
    if (v) out[field] = v.slice(0, 64);
  }
  return Object.keys(out).length > 0 ? out : null;
}

/** Keeps the origin of the address the visit came by (the first one wins). */
export function keepOrigin(search: string, storage: Pick<Storage, "getItem" | "setItem">): void {
  const found = originOf(search);
  if (!found) return;
  try {
    if (!storage.getItem(KEY)) storage.setItem(KEY, JSON.stringify(found));
  } catch {
    // No storage: the origin is lost, nothing else.
  }
}

/** The origin kept for the visit, taken once (to be sent at sign-up). */
export function takeOrigin(storage: Pick<Storage, "getItem" | "removeItem">): Origin | null {
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return null;
    storage.removeItem(KEY);
    return JSON.parse(raw) as Origin;
  } catch {
    return null;
  }
}

/** The campaign source of the visit, left in place (for the counters of the way in). */
export function visitSource(storage: Pick<Storage, "getItem">): string | undefined {
  try {
    const raw = storage.getItem(KEY);
    return raw ? ((JSON.parse(raw) as Origin).utmSource ?? undefined) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * The landing seen, counted once per visit and without anyone in it (no account, no cookie):
 * true the first time only.
 */
export function firstLanding(storage: Pick<Storage, "getItem" | "setItem">): boolean {
  try {
    if (storage.getItem(`${KEY}.landing`)) return false;
    storage.setItem(`${KEY}.landing`, "1");
    return true;
  } catch {
    return false;
  }
}

/** The game's address to share, carrying who shared it. */
export function shareUrl(origin: string, pseudo: string | null): string {
  return pseudo ? `${origin}/?ref=${encodeURIComponent(pseudo)}` : `${origin}/`;
}
