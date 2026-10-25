import { and, count, desc, eq, gt, isNull, or, sql } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "../db/client.js";
import { accounts, loginTokens, sessions } from "../db/schema.js";
import { countFunnel } from "../funnel.js";
import type { Mailer } from "../mail/mailer.js";
import { magicLinkMail } from "../mail/templates.js";
import { canonicalEmail, disposableEmail } from "./canonical.js";
import { hashCode, hashToken, newCode, newToken, sameHash } from "./tokens.js";

export const LINK_VALID_MINUTES = 15;
export const SESSION_DAYS = 30;
/** Magic links per e-mail address per hour, to avoid flooding an inbox. */
export const LINKS_PER_HOUR = 5;
/** Wrong codes a token takes: the fifth burns it (a new mail is needed). */
export const CODE_TRIES = 5;

export const emailSchema = z.string().trim().toLowerCase().email().max(254);
export const pseudoSchema = z
  .string()
  .trim()
  .regex(/^[\p{L}\p{N}_-]{3,20}$/u, "3 à 20 lettres, chiffres, _ ou -");

export interface Crest {
  shape: string;
  color: string;
  symbol: string;
}

export interface PublicAccount {
  id: string;
  email: string;
  pseudo: string | null;
  /** The name kept as proposed at the door (the profile offers to change it). */
  pseudoDefault: boolean;
  crest: Crest | null;
  /** The interface's language, for the pushes and the mails. */
  lang: Lang;
}

/** The languages of the interface (E3-8). */
export const LANGS = ["fr", "en"] as const;
export type Lang = (typeof LANGS)[number];
export const langSchema = z.enum(LANGS);

/** Choices offered for the coat of arms (cosmetic only). The web app draws them. */
export const CREST_SHAPES = ["heater", "round", "banner"] as const;
export const CREST_COLORS = ["gold", "lagoon", "vermilion", "ink", "emerald", "violet"] as const;
export const CREST_SYMBOLS = [
  "lion",
  "ship",
  "key",
  "tower",
  "star",
  "wheat",
  "anchor",
  "crown",
] as const;
export const crestSchema = z.object({
  shape: z.enum(CREST_SHAPES),
  color: z.enum(CREST_COLORS),
  symbol: z.enum(CREST_SYMBOLS),
});

const publicColumns = {
  id: accounts.id,
  email: accounts.email,
  pseudo: accounts.pseudo,
  pseudoDefault: accounts.pseudoDefault,
  crest: accounts.crest,
  lang: accounts.lang,
};

export class AuthError extends Error {
  constructor(
    readonly code:
      | "invalid_token"
      | "invalid_code"
      | "pseudo_taken"
      | "too_many_requests"
      | "disposable_email",
    message?: string,
  ) {
    super(message ?? code);
  }
}

/** Where a new account comes from (see apps/web/src/origin.ts), each value at most 64 chars. */
export interface Origin {
  ref?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

export const originSchema = z
  .object({
    ref: z.string().max(64).optional(),
    utmSource: z.string().max(64).optional(),
    utmMedium: z.string().max(64).optional(),
    utmCampaign: z.string().max(64).optional(),
  })
  .optional();

export interface AuthDeps {
  db: Db;
  mailer: Mailer;
  appUrl: string;
  now?: () => Date;
}

export class AuthService {
  private readonly now: () => Date;

  constructor(private readonly deps: AuthDeps) {
    this.now = deps.now ?? (() => new Date());
  }

  /** Sends a magic link. The answer never says whether the address has an account. */
  async requestLink(rawEmail: string, lang: Lang = "fr"): Promise<void> {
    const email = emailSchema.parse(rawEmail);
    if (disposableEmail(email)) throw new AuthError("disposable_email");
    const now = this.now();
    const hourAgo = new Date(now.getTime() - 3_600_000);
    const [recent] = await this.deps.db
      .select({ n: count() })
      .from(loginTokens)
      .where(and(eq(loginTokens.email, email), gt(loginTokens.createdAt, hourAgo)));
    if ((recent?.n ?? 0) >= LINKS_PER_HOUR) throw new AuthError("too_many_requests");

    const token = newToken();
    const tokenHash = hashToken(token);
    // The same mail carries a code, for an installed app the link would open in the browser.
    const code = newCode();
    await this.deps.db.insert(loginTokens).values({
      tokenHash,
      email,
      createdAt: now,
      expiresAt: new Date(now.getTime() + LINK_VALID_MINUTES * 60_000),
      codeHash: hashCode(code, tokenHash),
    });
    const link = `${this.deps.appUrl}/connexion?token=${encodeURIComponent(token)}`;
    await this.deps.mailer.send(magicLinkMail(email, link, code, LINK_VALID_MINUTES, lang));
  }

  /**
   * Opens a session with the code of the last mail sent to this address (the link and the code
   * exclude each other: the first used consumes the token). A wrong code counts against the
   * token, burned at the fifth. One answer, `invalid_code`, whatever went wrong, even for an
   * address that never asked: nothing says whether it has an account.
   */
  async verifyCode(
    rawEmail: string,
    rawCode: string,
    origin?: Origin,
  ): Promise<{ sessionToken: string; account: PublicAccount }> {
    const parsed = emailSchema.safeParse(rawEmail);
    const code = rawCode.replace(/\s+/g, "");
    if (!parsed.success || !/^\d{6}$/.test(code)) throw new AuthError("invalid_code");
    const email = parsed.data;
    const now = this.now();
    const opened = await this.deps.db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(loginTokens)
        .where(
          and(
            eq(loginTokens.email, email),
            isNull(loginTokens.usedAt),
            gt(loginTokens.expiresAt, now),
          ),
        )
        .orderBy(desc(loginTokens.createdAt))
        .limit(1)
        .for("update");
      if (!row?.codeHash) return false;
      if (sameHash(row.codeHash, hashCode(code, row.tokenHash))) {
        await tx
          .update(loginTokens)
          .set({ usedAt: now })
          .where(eq(loginTokens.tokenHash, row.tokenHash));
        return true;
      }
      const attempts = row.attempts + 1;
      await tx
        .update(loginTokens)
        .set({ attempts, ...(attempts >= CODE_TRIES ? { usedAt: now } : {}) })
        .where(eq(loginTokens.tokenHash, row.tokenHash));
      return false;
    });
    if (!opened) throw new AuthError("invalid_code");
    return this.openSession(email, now, origin);
  }

  /**
   * Consumes a magic link token (single use, atomically) and opens a session.
   * Creates the account on first login.
   */
  async verify(
    token: string,
    origin?: Origin,
  ): Promise<{ sessionToken: string; account: PublicAccount }> {
    const now = this.now();
    const [used] = await this.deps.db
      .update(loginTokens)
      .set({ usedAt: now })
      .where(
        and(
          eq(loginTokens.tokenHash, hashToken(token)),
          isNull(loginTokens.usedAt),
          gt(loginTokens.expiresAt, now),
        ),
      )
      .returning({ email: loginTokens.email });
    if (!used) throw new AuthError("invalid_token");
    return this.openSession(used.email, now, origin);
  }

  /** The session of a token consumed, by link or code; the account made on first login. */
  private async openSession(
    email: string,
    now: Date,
    origin: Origin = {},
  ): Promise<{ sessionToken: string; account: PublicAccount }> {
    // One account per mailbox: an alias opens the account of its mailbox, never a second one.
    const mailbox = canonicalEmail(email);
    const created = await this.deps.db
      .insert(accounts)
      // Where it came from, on its creation only (an existing account keeps its own).
      .values({ email, emailCanonical: mailbox, createdAt: now, ...origin })
      .onConflictDoNothing()
      .returning({ id: accounts.id });
    if (created.length > 0) await countFunnel(this.deps.db, "signed_in", origin.utmSource, now);
    const [account] = await this.deps.db
      .update(accounts)
      .set({ lastLoginAt: now })
      // Bots have no mailbox; their addresses can never open a session. An account of before
      // that shared its mailbox (no canonical one) still opens with its own address.
      .where(
        and(
          or(
            eq(accounts.emailCanonical, mailbox),
            and(eq(accounts.email, email), isNull(accounts.emailCanonical)),
          ),
          eq(accounts.isBot, false),
        ),
      )
      .returning(publicColumns);
    if (!account) throw new AuthError("invalid_token");

    const sessionToken = newToken();
    await this.deps.db.insert(sessions).values({
      tokenHash: hashToken(sessionToken),
      accountId: account.id,
      createdAt: now,
      expiresAt: new Date(now.getTime() + SESSION_DAYS * 86_400_000),
    });
    return { sessionToken, account };
  }

  async accountForSession(sessionToken: string | undefined): Promise<PublicAccount | null> {
    if (!sessionToken) return null;
    const [row] = await this.deps.db
      .select(publicColumns)
      .from(sessions)
      .innerJoin(accounts, eq(accounts.id, sessions.accountId))
      .where(
        and(eq(sessions.tokenHash, hashToken(sessionToken)), gt(sessions.expiresAt, this.now())),
      );
    return row ?? null;
  }

  async logout(sessionToken: string | undefined): Promise<void> {
    if (!sessionToken) return;
    await this.deps.db.delete(sessions).where(eq(sessions.tokenHash, hashToken(sessionToken)));
  }

  async setCrest(accountId: string, raw: unknown): Promise<PublicAccount> {
    const crest = crestSchema.parse(raw);
    const [account] = await this.deps.db
      .update(accounts)
      .set({ crest })
      .where(eq(accounts.id, accountId))
      .returning(publicColumns);
    if (!account) throw new Error("account not found");
    return account;
  }

  /** The interface's language, for the pushes and the mails (E3-8). */
  async setLang(accountId: string, raw: unknown): Promise<PublicAccount> {
    const lang = langSchema.parse(raw);
    const [account] = await this.deps.db
      .update(accounts)
      .set({ lang })
      .where(eq(accounts.id, accountId))
      .returning(publicColumns);
    if (!account) throw new Error("account not found");
    return account as PublicAccount;
  }

  async setPseudo(
    accountId: string,
    rawPseudo: string,
    /** Kept as the door proposed it. */
    proposed = false,
  ): Promise<PublicAccount> {
    const pseudo = pseudoSchema.parse(rawPseudo);
    const [taken] = await this.deps.db
      .select({ id: accounts.id })
      .from(accounts)
      .where(sql`lower(${accounts.pseudo}) = lower(${pseudo})`);
    if (taken && taken.id !== accountId) throw new AuthError("pseudo_taken");
    try {
      const [account] = await this.deps.db
        .update(accounts)
        .set({ pseudo, pseudoDefault: proposed })
        .where(eq(accounts.id, accountId))
        .returning(publicColumns);
      if (!account) throw new Error("account not found");
      return account;
    } catch (err) {
      // Two players racing for the same pseudo: the unique index decides.
      if (String((err as { code?: string }).code ?? err).includes("23505")) {
        throw new AuthError("pseudo_taken");
      }
      throw err;
    }
  }
}
