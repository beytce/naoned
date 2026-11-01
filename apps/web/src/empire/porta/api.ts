import { useEffect, useState } from "react";
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
}

export const portaApi = {
  state: () => call("GET", "/api/empire/porta"),
  queue: (mode: "solo" | "public" | "invite", entry: PortaEntryInput) =>
    call("POST", "/api/empire/porta/queue", { mode, ...entry }),
  join: (code: string, vehicles: { combatId: string; transportId: string }) =>
    call("POST", "/api/empire/porta/join", { code, ...vehicles }),
  launch: () => call("POST", "/api/empire/porta/launch", {}),
  leave: () => call("POST", "/api/empire/porta/leave", {}),
  order: (order: BattleOrder) => call("POST", "/api/empire/porta/order", order),
};

/**
 * The battle's socket: a snapshot a beat while it lasts (reconnected after a drop). `on` false
 * closes it.
 */
export function useBattle(on: boolean): BattleSnapshot | null {
  const [battle, setBattle] = useState<BattleSnapshot | null>(null);
  useEffect(() => {
    if (!on) {
      setBattle(null);
      return;
    }
    let socket: WebSocket | null = null;
    let closed = false;
    let retry: number | undefined;
    const open = () => {
      const proto = location.protocol === "https:" ? "wss" : "ws";
      socket = new WebSocket(`${proto}://${location.host}/api/empire/porta/live`);
      socket.onmessage = (e) => {
        try {
          const msg = JSON.parse(String(e.data)) as { type: string; battle: BattleSnapshot };
          if (msg.type === "battle") setBattle(msg.battle);
        } catch {
          // A broken frame: the next one comes a beat later.
        }
      };
      socket.onclose = () => {
        if (!closed) retry = window.setTimeout(open, 1_000);
      };
    };
    open();
    return () => {
      closed = true;
      window.clearTimeout(retry);
      socket?.close();
    };
  }, [on]);
  return battle;
}
