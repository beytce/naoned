import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

/** 256 random bits, URL-safe. Sent to the user; never stored as is. */
export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

/** What the database stores: a leaked table does not give usable tokens. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Six digits for the player to type, « 482913 ». */
export function newCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/** A code's hash, tied to its token: the same code under another token hashes otherwise. */
export function hashCode(code: string, tokenHash: string): string {
  return hashToken(`${code}:${tokenHash}`);
}

/** Two hashes compared in constant time. */
export function sameHash(a: string, b: string): boolean {
  const x = Buffer.from(a, "hex");
  const y = Buffer.from(b, "hex");
  return x.length === y.length && timingSafeEqual(x, y);
}
