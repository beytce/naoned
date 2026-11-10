import { useCallback, useEffect, useRef, useState } from "react";
import type { BattleOrder, BattleSnapshot, PortaState } from "./types.js";

/** The Porta's routes (docs/plan-porta.md § 7): a refusal comes back with the state and its error. */
async function call(method: string, path: string, body?: unknown): Promise<PortaState> {
  try {
    const res = await fetch(path, {
      method,
      credentials: "same-origin",
      headers: body === undefined ? {} : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as PortaState;
    return res.ok
      ? data
      : {
          ...data,
          lobby: data.lobby ?? null,
          battle: data.battle ?? null,
          error: data.error ?? "unknown",
        };
  } catch {
    return { lobby: null, battle: null, error: "network" };
  }
}

export interface PortaEntryInput {
  tier: number;
  combatId: string;
  transportId: string;
  /** The Porta noire: a vehicle fallen is lost, more relics. */
  dark?: boolean;
}

export const portaApi = {
  state: () => call("GET", "/api/empire/porta"),
  queue: (mode: "solo" | "public" | "invite", entry: PortaEntryInput) =>
    call("POST", "/api/empire/porta/queue", { mode, ...entry }),
  join: (code: string, vehicles: { combatId: string; transportId: string; dark?: boolean }) =>
    call("POST", "/api/empire/porta/join", { code, ...vehicles }),
  launch: () => call("POST", "/api/empire/porta/launch", {}),
  leave: () => call("POST", "/api/empire/porta/leave", {}),
  order: (order: BattleOrder) => call("POST", "/api/empire/porta/order", order),
};

/** A sign on the battle's ground, and how long it shows (ms). */
export interface BattlePing {
  x: number;
  y: number;
  kind: "here" | "danger";
  mine: boolean;
  at: number;
}
export const PING_MS = 3_000;

/**
 * The battle's socket: a snapshot a beat while it lasts (reconnected after a drop), and the orders
 * sent by it (docs/plan-porta-jeu.md, B1), each answered by its number; by their route when the
 * socket is not open. `on` false closes it.
 */
export function useBattleLink(on: boolean): {
  battle: BattleSnapshot | null;
  /** Sends an order: its refusal's code, or null once taken. */
  order: (o: BattleOrder) => Promise<string | null>;
  /** The signs put on the ground by the group (docs/plan-porta-jeu.md, A9), the last ones. */
  pings: BattlePing[];
  ping: (x: number, y: number, kind: BattlePing["kind"]) => void;
} {
  const [battle, setBattle] = useState<BattleSnapshot | null>(null);
  const [pings, setPings] = useState<BattlePing[]>([]);
  const link = useRef<{
    socket: WebSocket | null;
    n: number;
    waiting: Map<number, (error: string | null) => void>;
  }>({ socket: null, n: 0, waiting: new Map() });
  useEffect(() => {
    if (!on) {
      setBattle(null);
      return;
    }
    const l = link.current;
    let closed = false;
    let retry: number | undefined;
    const open = () => {
      const proto = location.protocol === "https:" ? "wss" : "ws";
      const socket = new WebSocket(`${proto}://${location.host}/api/empire/porta/live`);
      l.socket = socket;
      socket.onmessage = (e) => {
        try {
          const msg = JSON.parse(String(e.data)) as
            | { type: "battle"; battle: BattleSnapshot }
            | { type: "order"; n: number; error?: string }
            | ({ type: "ping" } & Omit<BattlePing, "at">);
          if (msg.type === "battle") setBattle(msg.battle);
          else if (msg.type === "ping") {
            const at = performance.now();
            setPings((p) => [
              ...p.filter((x) => at - x.at < PING_MS),
              { x: msg.x, y: msg.y, kind: msg.kind, mine: msg.mine, at },
            ]);
          } else if (msg.type === "order") {
            l.waiting.get(msg.n)?.(msg.error ?? null);
            l.waiting.delete(msg.n);
          }
        } catch {
          // A broken frame: the next one comes a beat later.
        }
      };
      socket.onclose = () => {
        // Orders left without an answer: the network's fault.
        for (const done of l.waiting.values()) done("network");
        l.waiting.clear();
        if (!closed) retry = window.setTimeout(open, 1_000);
      };
    };
    open();
    return () => {
      closed = true;
      window.clearTimeout(retry);
      l.socket?.close();
      l.socket = null;
    };
  }, [on]);
  const order = useCallback(async (o: BattleOrder): Promise<string | null> => {
    const l = link.current;
    if (l.socket?.readyState === WebSocket.OPEN) {
      const n = ++l.n;
      const answer = new Promise<string | null>((done) => {
        l.waiting.set(n, done);
        // An answer lost: no order waits for ever.
        window.setTimeout(() => {
          if (l.waiting.delete(n)) done("network");
        }, 4_000);
      });
      l.socket.send(JSON.stringify({ type: "order", n, order: o }));
      return answer;
    }
    return (await portaApi.order(o)).error ?? null;
  }, []);
  const ping = useCallback((x: number, y: number, kind: BattlePing["kind"]) => {
    const s = link.current.socket;
    if (s?.readyState === WebSocket.OPEN) s.send(JSON.stringify({ type: "ping", x, y, kind }));
  }, []);
  return { battle, order, pings, ping };
}

/** The battle alone, for a screen that sends its orders by their route (the disc of SVG). */
export function useBattle(on: boolean): BattleSnapshot | null {
  return useBattleLink(on).battle;
}
