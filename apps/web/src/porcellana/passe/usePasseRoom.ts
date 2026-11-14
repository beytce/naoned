/**
 * A duel on line of the Passe, seen from the laboratory (docs/plan-passe.md P6): the room is read
 * once a second, the pieces are sent to the server, which holds the game and its clock.
 */
import type { PasseMove, PasseSide, PasseState } from "@comptoirs/engine";
import { useCallback, useEffect, useRef, useState } from "react";

/** The room as the server tells it (apps/server/src/game/passe.ts, `PasseRoomView`). */
export interface PasseRoom {
  code: string;
  board: string;
  boardName: string;
  you: 0 | PasseSide;
  waiting: boolean;
  round: number;
  names: { thread: string; chain: string } | null;
  state: PasseState | null;
  last: number;
  deadline: number | null;
  moveSeconds: number;
  late: { thread: number; chain: number };
  cargo: number;
  again: { you: boolean; other: boolean };
  /** Whose screen is ready: the clock runs once both are (docs/plan-duels.md B4). */
  ready?: { you: boolean; other: boolean };
  now: number;
}

const SAID: Record<string, string> = {
  no_room: "Cette salle n'existe plus.",
  room_full: "Cette salle est déjà pleine.",
  no_board: "Ce passage n'existe pas.",
  not_your_turn: "Ce n'est pas à toi de jouer.",
  illegal: "Ce coup n'est pas permis.",
  over: "Le duel est fini.",
  invalid_input: "Ce code n'a pas la bonne forme : six lettres.",
};

export function usePasseRoom() {
  const [room, setRoom] = useState<PasseRoom | null>(null);
  const [error, setError] = useState("");
  /** The server's clock against this device's. */
  const skew = useRef(0);
  const code = room?.code ?? null;

  /** One call after the other: two at once, before the guest's cookie is given, would be two guests. */
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const send = useCallback(async (method: "GET" | "POST", path: string, body?: unknown) => {
    try {
      const res = await fetch(`/api/passe/room${path}`, {
        method,
        credentials: "same-origin",
        headers: body === undefined ? undefined : { "content-type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const json = (await res.json().catch(() => null)) as {
        room?: PasseRoom;
        error?: string;
      } | null;
      if (!res.ok || !json?.room) {
        setError(SAID[json?.error ?? ""] ?? "Le serveur ne répond pas.");
        if (json?.error === "no_room") setRoom(null);
        return false;
      }
      skew.current = json.room.now - Date.now();
      setRoom(json.room);
      setError("");
      return true;
    } catch {
      setError("Le serveur ne répond pas.");
      return false;
    }
  }, []);
  const call = useCallback(
    (method: "GET" | "POST", path: string, body?: unknown) => {
      const next = queue.current.then(() => send(method, path, body));
      queue.current = next.catch(() => false);
      return next;
    },
    [send],
  );

  // The room is read once a second while one is open.
  useEffect(() => {
    if (!code) return;
    const timer = window.setInterval(() => void call("GET", `/${code}`), 1000);
    return () => window.clearInterval(timer);
  }, [code, call]);

  // The screen is ready as soon as it shows a game begun: the clock waits for both (B4).
  const toReady =
    !!code && !!room?.state && !room.waiting && room.you !== 0 && room.ready?.you === false;
  useEffect(() => {
    if (toReady && code) void call("POST", `/${code}/ready`);
  }, [toReady, code, call]);

  return {
    room,
    error,
    open: (board: string) => call("POST", "", { board }),
    join: (c: string) => call("POST", `/${c.trim().toUpperCase()}/join`),
    play: (move: PasseMove) =>
      code ? call("POST", `/${code}/play`, { at: move.at, fire: !!move.fire }) : false,
    again: () => (code ? call("POST", `/${code}/again`) : false),
    leave: () => {
      setRoom(null);
      setError("");
    },
    /** The server's time now, as near as this device knows it. */
    serverNow: () => Date.now() + skew.current,
  };
}
