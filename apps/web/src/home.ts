/**
 * Where each game lives (decision of the owner, 11 November 2026): the shared board, its threads
 * and its rank are the site's home, with no address to type; the former game (the empire, the
 * sign-in, the Battle) lives at `/ancien`. Its other pages keep their address (`/connexion`,
 * `/admin`, the legal pages, the Battle's rooms).
 */
export const OLD_HOME = "/ancien";

/** The board is shown at the site's root, unless a laboratory is asked for. */
export const isBoardHome = (pathname: string, lab: string | null) =>
  !lab && (pathname === "/" || pathname === "");
