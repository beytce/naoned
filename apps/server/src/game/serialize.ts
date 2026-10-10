/** JSON has no bigint: amounts are stored as {"$n": "123"} and revived on load. */

export function encode(value: unknown): unknown {
  if (typeof value === "bigint") return { $n: value.toString() };
  if (Array.isArray(value)) return value.map(encode);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = encode(v);
    return out;
  }
  return value;
}

export function decode<T>(value: unknown): T {
  return revive(value) as T;
}

function revive(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(revive);
  if (value && typeof value === "object") {
    const keys = Object.keys(value);
    const n = (value as { $n?: unknown }).$n;
    if (keys.length === 1 && typeof n === "string") return BigInt(n);
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = revive(v);
    return out;
  }
  return value;
}

/** For API responses: bigint amounts become strings of deniers. */
export function toJson(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value, (_k, v) => (typeof v === "bigint" ? v.toString() : v)));
}
