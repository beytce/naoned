import type { WorldContext } from "./state.js";

/**
 * Deterministic draw in [0, 2^32): the same world, key and index always give the same number.
 * FNV-1a over the world seed and the key; the seed stays on the server.
 */
export function draw(ctx: WorldContext, key: string): number {
  const text = `${ctx.seed ?? String(ctx.startAt)}|${key}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  // Final avalanche, so close keys give unrelated values.
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}

/** Weighted pick, deterministic. */
export function pickWeighted<T extends { weight: number }>(
  items: T[],
  value: number,
): T | undefined {
  const total = items.reduce((n, i) => n + i.weight, 0);
  if (total <= 0) return undefined;
  let r = value % total;
  for (const item of items) {
    if (r < item.weight) return item;
    r -= item.weight;
  }
  return items.at(-1);
}
