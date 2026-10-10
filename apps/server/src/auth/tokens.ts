import { createHash, randomBytes } from "node:crypto";

/** 256 random bits, URL-safe. Sent to the user; never stored as is. */
export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

/** What the database stores: a leaked table does not give usable tokens. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
