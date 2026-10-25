import { sql } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { accounts } from "../db/schema.js";

/**
 * A name proposed to a newcomer, so that the game starts at once (E3-5 of the experts): a
 * Venetian first name and a trade, never one of the houses of the computer (`bots.ts`), so that
 * a person is never taken for one of them.
 */
export const FIRST_NAMES = [
  "Alvise",
  "Zuane",
  "Piero",
  "Nicolo",
  "Bortolo",
  "Andrea",
  "Iseppo",
  "Lunardo",
  "Matio",
  "Polo",
  "Stefano",
  "Toni",
  "Vettor",
  "Momolo",
  "Biasio",
  "Gasparo",
  "Marieta",
  "Cateruzza",
  "Lucieta",
  "Anzoleta",
];
export const TRADES = [
  "dal_Sale",
  "dei_Panni",
  "da_Murano",
  "del_Vetro",
  "da_Rialto",
  "della_Seta",
  "dal_Legno",
  "da_Chioggia",
  "dal_Pan",
  "dei_Remi",
];

/** Every proposed name that fits the pseudo's rule (20 characters at most). */
export function proposedNames(): string[] {
  return FIRST_NAMES.flatMap((f) => TRADES.map((t) => `${f}_${t}`)).filter((n) => n.length <= 20);
}

/** A free proposed name, drawn by `seed`; a number after it when all are taken. */
export async function suggestPseudo(db: Db, seed: number): Promise<string> {
  const names = proposedNames();
  const taken = new Set(
    (
      await db
        .select({ pseudo: accounts.pseudo })
        .from(accounts)
        .where(sql`${accounts.pseudo} is not null`)
    ).map((r) => r.pseudo?.toLowerCase()),
  );
  for (let k = 0; k < names.length; k++) {
    const name = names[(seed + k) % names.length] as string;
    if (!taken.has(name.toLowerCase())) return name;
  }
  for (let n = 2; ; n++) {
    const name = `${names[seed % names.length]?.slice(0, 18)}${n}`;
    if (!taken.has(name.toLowerCase())) return name;
  }
}
