import { randomInt } from "node:crypto";
import {
  type PasseMove,
  type PasseSetup,
  type PasseSide,
  type PasseState,
  passeCargo,
  passeInit,
  passePlay,
  passeThink,
} from "@comptoirs/engine";

/** A room's code: six letters a friend reads aloud without a doubt (no 0/O, 1/I). */
const CODE_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** What the hub is given: the duel's rules, its boards and its clock (a world's settings, in the game). */
export interface PasseTheme {
  rules: Pick<PasseSetup, "fire" | "cargo">;
  boards: Record<
    string,
    Pick<PasseSetup, "width" | "height" | "first"> & { name: string; cells: readonly number[] }
  >;
  duel: {
    /** Seconds a player has for a piece; past them, the lieutenant lays one for him. */
    moveSeconds: number;
    /** Minutes a room lives without anything played. */
    roomMinutes: number;
    /** How far the lieutenant sees (the mind's depth). */
    lieutenant: number;
  };
}

interface Seat {
  id: string;
  name: string;
}

interface Room {
  code: string;
  board: string;
  /** The host and the one who joined, in that order. */
  seats: Seat[];
  /** The return game swaps the sides: on an even round the host is the chain. */
  round: number;
  state: PasseState | null;
  setup: PasseSetup | null;
  deadline: number | null;
  last: number;
  /** Pieces the lieutenant laid for the thread, for the chain, this round. */
  late: [number, number];
  again: Set<string>;
  /** Who said its screen is ready: the clock starts when both have, or after `READY_MS`. */
  ready: Set<string>;
  touched: number;
}

/** The longest the clock waits for both screens (docs/plan-duels.md B4). */
const READY_MS = 30_000;

export interface PasseRoomView {
  code: string;
  board: string;
  boardName: string;
  /** The side of the one who asks: 1 the thread, 2 the chain, 0 who only watches. */
  you: 0 | PasseSide;
  waiting: boolean;
  round: number;
  names: { thread: string; chain: string } | null;
  state: PasseState | null;
  last: number;
  deadline: number | null;
  moveSeconds: number;
  late: { thread: number; chain: number };
  /** The holds the thread saved, once it is through. */
  cargo: number;
  again: { you: boolean; other: boolean };
  /** Whose screen is ready: the clock runs once both are (docs/plan-duels.md B4). */
  ready: { you: boolean; other: boolean };
  now: number;
}

export type PasseAnswer =
  | "ok"
  | "no_room"
  | "room_full"
  | "not_started"
  | "not_your_turn"
  | "illegal"
  | "over"
  | "not_over"
  | "not_seated";

/**
 * The duels on line of the Passe (docs/plan-passe.md P6): a private room, its code shared, two
 * players, fifteen seconds a piece. Held in memory, like the Battle's rooms: a restart loses the
 * duels under way; nothing in them is money or goods. The clock is read when someone looks or
 * plays, never by a timer: a piece the lieutenant laid is laid at the second its player ran out.
 */
export class PasseHub {
  private readonly rooms = new Map<string, Room>();
  private readonly ends: ((code: string, winner: string, loser: string, now: number) => void)[] =
    [];

  /** Called when a round is won: its room, the winner's and the loser's ids (the planche's challenges). */
  onWin(listener: (code: string, winner: string, loser: string, now: number) => void): void {
    this.ends.push(listener);
  }

  /** A round just won: told to whoever listens. */
  private ended(room: Room, now: number): void {
    const w = room.state?.winner;
    if (!w) return;
    const winner = room.seats.find((s) => this.sideOf(room, s.id) === w);
    const loser = room.seats.find((s) => s.id !== winner?.id);
    if (winner && loser) for (const l of this.ends) l(room.code, winner.id, loser.id, now);
  }

  constructor(private readonly theme: PasseTheme) {}

  /** The side a seat plays this round. */
  private sideOf(room: Room, id: string): 0 | PasseSide {
    const k = room.seats.findIndex((s) => s.id === id);
    if (k < 0) return 0;
    const hostIsThread = room.round % 2 === 1;
    return (k === 0) === hostIsThread ? 1 : 2;
  }

  private begin(room: Room, now: number): void {
    const b = this.theme.boards[room.board];
    if (!b) return;
    room.setup = { ...this.theme.rules, ...b, cells: [...b.cells] };
    room.state = passeInit(room.setup);
    // The clock waits for both screens, thirty seconds at most.
    room.deadline = now + READY_MS + this.theme.duel.moveSeconds * 1000;
    room.last = -1;
    room.late = [0, 0];
    room.again.clear();
    room.ready.clear();
    room.touched = now;
  }

  /** The clock: whoever let it run out has a piece laid by the lieutenant, at the second it ran out. */
  private tick(room: Room, now: number): void {
    const ms = this.theme.duel.moveSeconds * 1000;
    while (room.state && !room.state.winner && room.deadline !== null && now >= room.deadline) {
      const side = room.state.turn;
      const move = passeThink(room.state, { depth: this.theme.duel.lieutenant });
      room.state = passePlay(room.state, move);
      room.last = move.at;
      if (side === 1) room.late[0] += 1;
      else room.late[1] += 1;
      room.deadline = room.state.winner ? null : room.deadline + ms;
      if (room.state.winner) this.ended(room, room.deadline ?? now);
    }
  }

  open(id: string, name: string, board: string, now: number): { code: string } | { error: string } {
    if (!Object.hasOwn(this.theme.boards, board)) return { error: "no_board" };
    this.sweep(now);
    let code = "";
    do {
      code = Array.from({ length: 6 }, () => CODE_LETTERS[randomInt(CODE_LETTERS.length)]).join("");
    } while (this.rooms.has(code));
    this.rooms.set(code, {
      code,
      board,
      seats: [{ id, name }],
      round: 1,
      state: null,
      setup: null,
      deadline: null,
      last: -1,
      late: [0, 0],
      again: new Set(),
      ready: new Set(),
      touched: now,
    });
    return { code };
  }

  join(id: string, name: string, code: string, now: number): PasseAnswer {
    const room = this.rooms.get(code);
    if (!room) return "no_room";
    if (room.seats.some((s) => s.id === id)) return "ok";
    if (room.seats.length >= 2) return "room_full";
    room.seats.push({ id, name });
    this.begin(room, now);
    return "ok";
  }

  play(id: string, code: string, move: PasseMove, now: number): PasseAnswer {
    const room = this.rooms.get(code);
    if (!room) return "no_room";
    this.tick(room, now);
    if (!room.state) return "not_started";
    if (room.state.winner) return "over";
    if (this.sideOf(room, id) !== room.state.turn) return "not_your_turn";
    try {
      room.state = passePlay(room.state, move.fire ? { at: move.at, fire: true } : { at: move.at });
    } catch {
      return "illegal";
    }
    room.last = move.at;
    room.ready.add(id);
    room.deadline = room.state.winner ? null : now + this.theme.duel.moveSeconds * 1000;
    room.touched = now;
    if (room.state.winner) this.ended(room, now);
    return "ok";
  }

  /** A player's screen is ready: once both are, the clock starts for the first piece. */
  ready(id: string, code: string, now: number): PasseAnswer {
    const room = this.rooms.get(code);
    if (!room) return "no_room";
    this.tick(room, now);
    if (!room.seats.some((s) => s.id === id)) return "not_seated";
    if (!room.state) return "not_started";
    const first = room.ready.size < 2;
    room.ready.add(id);
    room.touched = now;
    if (first && room.ready.size === 2 && room.last === -1 && !room.state.winner)
      room.deadline = now + this.theme.duel.moveSeconds * 1000;
    return "ok";
  }

  /** The return game, the sides swapped: it starts once both have asked. */
  again(id: string, code: string, now: number): PasseAnswer {
    const room = this.rooms.get(code);
    if (!room) return "no_room";
    this.tick(room, now);
    if (!room.seats.some((s) => s.id === id)) return "not_seated";
    if (!room.state?.winner) return "not_over";
    room.again.add(id);
    room.touched = now;
    if (room.seats.every((s) => room.again.has(s.id))) {
      room.round += 1;
      this.begin(room, now);
    }
    return "ok";
  }

  view(id: string, code: string, now: number): PasseRoomView | null {
    const room = this.rooms.get(code);
    if (!room) return null;
    this.tick(room, now);
    const you = this.sideOf(room, id);
    const seated = room.seats.length === 2;
    const hostIsThread = room.round % 2 === 1;
    const [host, guest] = room.seats;
    const other = room.seats.find((s) => s.id !== id);
    return {
      code,
      board: room.board,
      boardName: this.theme.boards[room.board]?.name ?? room.board,
      you,
      waiting: !seated,
      round: room.round,
      names:
        host && guest
          ? hostIsThread
            ? { thread: host.name, chain: guest.name }
            : { thread: guest.name, chain: host.name }
          : null,
      state: room.state,
      last: room.last,
      deadline: room.deadline,
      moveSeconds: this.theme.duel.moveSeconds,
      late: { thread: room.late[0], chain: room.late[1] },
      cargo: room.state && room.setup ? passeCargo(room.setup, room.state) : 0,
      again: { you: room.again.has(id), other: !!other && room.again.has(other.id) },
      ready: { you: room.ready.has(id), other: !!other && room.ready.has(other.id) },
      now,
    };
  }

  /** Rooms nobody touched for too long are closed. */
  sweep(now: number): void {
    const life = this.theme.duel.roomMinutes * 60_000;
    for (const [code, room] of this.rooms) if (now - room.touched > life) this.rooms.delete(code);
  }
}
