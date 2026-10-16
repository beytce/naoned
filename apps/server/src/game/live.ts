import type { Effects } from "@comptoirs/engine";

/** What the server pushes to a merchant's open game. */
export type LiveMessage =
  /** Something of theirs changed (a trade, a delivery, an order filled…): fetch the view again. */
  | { type: "changed"; version: number }
  /** The world moved on (the minute's tick: board, market maker): fetch it when convenient. */
  | { type: "tick"; version: number };

/** The few methods of a WebSocket the hub needs (the `ws` socket of @fastify/websocket). */
export interface LiveSocket {
  readonly readyState: number;
  send(data: string): void;
  ping(): void;
  terminate(): void;
  on(event: "close" | "pong", listener: () => void): unknown;
}

const OPEN = 1;

/**
 * The open games, per merchant: after each saved command, the merchants it touched are told to
 * fetch their view again, instead of everyone polling every 15 s.
 */
export class LiveHub {
  private sockets = new Map<string, Set<LiveSocket>>();
  private alive = new WeakSet<LiveSocket>();
  private timer: NodeJS.Timeout | undefined;

  add(accountId: string, socket: LiveSocket): void {
    let mine = this.sockets.get(accountId);
    if (!mine) {
      mine = new Set();
      this.sockets.set(accountId, mine);
    }
    mine.add(socket);
    this.alive.add(socket);
    socket.on("pong", () => this.alive.add(socket));
    socket.on("close", () => this.remove(accountId, socket));
  }

  remove(accountId: string, socket: LiveSocket): void {
    const mine = this.sockets.get(accountId);
    if (!mine) return;
    mine.delete(socket);
    if (mine.size === 0) this.sockets.delete(accountId);
  }

  /** Open games (sockets). */
  get size(): number {
    let n = 0;
    for (const s of this.sockets.values()) n += s.size;
    return n;
  }

  send(accountIds: Iterable<string>, message: LiveMessage): void {
    const data = JSON.stringify(message);
    for (const id of accountIds) {
      for (const socket of this.sockets.get(id) ?? []) {
        if (socket.readyState === OPEN) socket.send(data);
      }
    }
  }

  broadcast(message: LiveMessage): void {
    this.send(this.sockets.keys(), message);
  }

  /** After a saved command: the merchants it touched, and everyone on the minute's tick. */
  onEffects(fx: Effects, version: number, tick: boolean): void {
    if (this.sockets.size === 0) return;
    const touched = touchedAccounts(fx);
    if (tick) {
      // Those touched first (a delivery arrived), the rest whenever convenient.
      this.send(touched, { type: "changed", version });
      const others = [...this.sockets.keys()].filter((id) => !touched.has(id));
      this.send(others, { type: "tick", version });
    } else {
      this.send(touched, { type: "changed", version });
    }
  }

  /** Sockets that stopped answering are closed (every 30 s): mobile networks drop silently. */
  start(intervalMs = 30_000): void {
    this.stop();
    this.timer = setInterval(() => {
      for (const set of this.sockets.values()) {
        for (const socket of set) {
          if (!this.alive.has(socket)) {
            socket.terminate();
            continue;
          }
          this.alive.delete(socket);
          socket.ping();
        }
      }
    }, intervalMs);
    this.timer.unref();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }
}

/** Merchants whose view a command changed: events, trades, stock and money of theirs. */
export function touchedAccounts(fx: Effects): Set<string> {
  const ids = new Set<string>();
  for (const e of fx.events) if (e.playerId) ids.add(e.playerId);
  for (const t of fx.trades) {
    ids.add(t.buyerId);
    ids.add(t.sellerId);
  }
  for (const m of fx.stock) ids.add(m.playerId);
  for (const l of fx.ledger) {
    for (const account of [l.from, l.to]) {
      const [kind, id] = account.split(":");
      if ((kind === "cash" || kind === "escrow") && id) ids.add(id);
    }
  }
  return ids;
}
