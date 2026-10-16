/**
 * Who publishes the game, for the legal pages. A field left null shows "à compléter" on the
 * pages: every one must be filled in before the game opens to the public.
 */
export const LEGAL = {
  publisher: "Robin Pineau",
  /** Postal address of the publisher (or the host's, with the publisher's details given to it). */
  address: null as string | null,
  /** Address players write to (contact, personal data). */
  email: null as string | null,
  /** The game's address on the web, once chosen. */
  site: null as string | null,
  host: {
    name: "Railway Corp.",
    /** To check on railway.com. */
    address: null as string | null,
    city: "San Francisco (Californie, États-Unis)",
    url: "https://railway.com",
  },
  /** Where the server and the database run (the region chosen in Railway). */
  hostingRegion: null as string | null,
  mail: {
    name: "Resend",
    address: "2261 Market Street #5039, San Francisco, CA 94114, États-Unis",
    url: "https://resend.com",
  },
  updated: "16 octobre 2026",
} as const;
