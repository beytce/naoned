import { and, count, eq, gt, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "../db/client.js";
import { accounts, loginTokens, sessions } from "../db/schema.js";
import type { Mailer } from "../mail/mailer.js";
import { magicLinkMail } from "../mail/templates.js";
import { hashToken, newToken } from "./tokens.js";

export const LINK_VALID_MINUTES = 15;
export const SESSION_DAYS = 30;
/** Magic links per e-mail address per hour, to avoid flooding an inbox. */
export const LINKS_PER_HOUR = 5;

export const emailSchema = z.string().trim().toLowerCase().email().max(254);
export const pseudoSchema = z
  .string()
  .trim()
  .regex(/^[\p{L}\p{N}_-]{3,20}$/u, "3 à 20 lettres, chiffres, _ ou -");

export interface PublicAccount {
  id: string;
  email: string;
  pseudo: string | null;
}

export class AuthError extends Error {
  constructor(
    readonly code: "invalid_token" | "pseudo_taken" | "too_many_requests",
    message?: string,
  ) {
    super(message ?? code);
  }
}

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
  async requestLink(rawEmail: string): Promise<void> {
    const email = emailSchema.parse(rawEmail);
    const now = this.now();
    const hourAgo = new Date(now.getTime() - 3_600_000);
    const [recent] = await this.deps.db
      .select({ n: count() })
      .from(loginTokens)
      .where(and(eq(loginTokens.email, email), gt(loginTokens.createdAt, hourAgo)));
    if ((recent?.n ?? 0) >= LINKS_PER_HOUR) throw new AuthError("too_many_requests");

    const token = newToken();
    await this.deps.db.insert(loginTokens).values({
      tokenHash: hashToken(token),
      email,
      createdAt: now,
      expiresAt: new Date(now.getTime() + LINK_VALID_MINUTES * 60_000),
    });
    const link = `${this.deps.appUrl}/connexion?token=${encodeURIComponent(token)}`;
    await this.deps.mailer.send(magicLinkMail(email, link, LINK_VALID_MINUTES));
  }

  /**
   * Consumes a magic link token (single use, atomically) and opens a session.
   * Creates the account on first login.
   */
  async verify(token: string): Promise<{ sessionToken: string; account: PublicAccount }> {
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

    await this.deps.db
      .insert(accounts)
      .values({ email: used.email, createdAt: now })
      .onConflictDoNothing({ target: accounts.email });
    const [account] = await this.deps.db
      .update(accounts)
      .set({ lastLoginAt: now })
      .where(eq(accounts.email, used.email))
      .returning({ id: accounts.id, email: accounts.email, pseudo: accounts.pseudo });
    if (!account) throw new Error("account missing after upsert");

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
      .select({ id: accounts.id, email: accounts.email, pseudo: accounts.pseudo })
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

  async setPseudo(accountId: string, rawPseudo: string): Promise<PublicAccount> {
    const pseudo = pseudoSchema.parse(rawPseudo);
    const [taken] = await this.deps.db
      .select({ id: accounts.id })
      .from(accounts)
      .where(sql`lower(${accounts.pseudo}) = lower(${pseudo})`);
    if (taken && taken.id !== accountId) throw new AuthError("pseudo_taken");
    try {
      const [account] = await this.deps.db
        .update(accounts)
        .set({ pseudo })
        .where(eq(accounts.id, accountId))
        .returning({ id: accounts.id, email: accounts.email, pseudo: accounts.pseudo });
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
