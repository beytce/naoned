import {
  type PasseMove,
  type PasseSetup,
  type PlancheSetup,
  type PlancheState,
  passeInit,
  passePlay,
  passeThink,
  plancheAdvance,
  plancheForced,
  plancheInit,
  plancheInvariant,
  plancheRobot,
  plancheThread,
  plancheToll,
  plancheUnthread,
} from "@comptoirs/engine";

const HOUR = 3_600_000;

/** What the hub is given: the board, the duels of its passages, how often the computer's houses visit. */
export interface PlancheHubTheme {
  board: PlancheSetup;
  passe: {
    rules: Pick<PasseSetup, "fire" | "cargo">;
    boards: Record<
      string,
      Pick<PasseSetup, "width" | "height" | "first"> & { cells: readonly number[] }
    >;
    /** How far the lieutenant of a passage sees (it must be the laboratory's, to replay the same duel). */
    lieutenant: number;
  };
  visitHours: number;
  /** Game hours without a read or a gesture after which a player's house goes back to the computer. */
  idleHours: number;
}

export interface PlancheView {
  state: PlancheState;
  /** The house of the one who asks, or null when every house is taken (he watches). */
  me: string | null;
  /** The name each house shows: its player's, or its own. */
  names: Record<string, string>;
  /** The houses players hold, the others being the computer's. */
  players: string[];
  /** Every denier accounted for. */
  ok: boolean;
  /** When the board began, for its days to be counted. */
  since: number;
}

export type PlancheAnswer = "ok" | "not_seated" | "duel_lost" | "duel_illegal" | string;

/**
 * The shared board on line (docs/plan-planche.md L5): one board for every player of the server, held
 * in memory like the Battle's rooms (a restart begins a new board). The board moves only when
 * someone reads or acts, hour by hour, the computer's houses visiting at their hours. A newcomer
 * takes a house of the computer and keeps it. A passage is forced by a duel of the Passe the server
 * replays: the player sends his own pieces only, the lieutenant's answers are the server's.
 */
export class PlancheHub {
  private state: PlancheState;
  private readonly seats = new Map<string, { house: string; name: string; seen: number }>();
  private readonly t0: number;

  constructor(
    private readonly theme: PlancheHubTheme,
    now: number,
  ) {
    this.t0 = now;
    this.state = plancheInit(theme.board, now);
  }

  private held(): Set<string> {
    return new Set([...this.seats.values()].map((s) => s.house));
  }

  /** The board up to `now`: every whole hour played, the computer's houses at theirs. */
  private advance(now: number): void {
    const S = this.theme.board;
    const held = this.held();
    let s = this.state;
    for (;;) {
      const nextHour = this.t0 + (Math.floor((s.now - this.t0) / HOUR) + 1) * HOUR;
      if (nextHour > now) break;
      s = plancheAdvance(S, s, nextHour);
      const hour = Math.round((nextHour - this.t0) / HOUR);
      S.houses.forEach((h, k) => {
        if (held.has(h.id) || (hour + k) % this.theme.visitHours !== 0) return;
        s = plancheRobot(S, s, h.id, nextHour);
      });
    }
    this.state = plancheAdvance(S, s, now);
  }

  private seat(player: string, name: string, now: number): string | null {
    const had = this.seats.get(player);
    if (had) {
      had.name = name;
      had.seen = now;
      return had.house;
    }
    // A house left too long goes back to the computer (its threads and its purse stay with it).
    const idle = this.theme.idleHours * HOUR;
    for (const [id, seat] of this.seats) if (now - seat.seen > idle) this.seats.delete(id);
    const held = this.held();
    const free = this.theme.board.houses.find((h) => !held.has(h.id));
    if (!free) return null;
    this.seats.set(player, { house: free.id, name, seen: now });
    return free.id;
  }

  view(player: string, name: string, now: number): PlancheView {
    this.advance(now);
    const me = this.seat(player, name, now);
    const names: Record<string, string> = {};
    for (const h of this.theme.board.houses) names[h.id] = h.name;
    for (const s of this.seats.values()) names[s.house] = s.name;
    return {
      state: this.state,
      me,
      names,
      players: this.theme.board.houses.map((h) => h.id).filter((id) => this.held().has(id)),
      ok: plancheInvariant(this.state),
      since: this.t0,
    };
  }

  /** Runs a move of the board for the player's house; the board's refusal is the answer. */
  private act(player: string, now: number, f: (house: string) => PlancheState): PlancheAnswer {
    this.advance(now);
    const seat = this.seats.get(player);
    if (!seat) return "not_seated";
    seat.seen = now;
    try {
      this.state = f(seat.house);
      return "ok";
    } catch (e) {
      return (e as Error).message;
    }
  }

  thread(player: string, city: string, good: string, now: number): PlancheAnswer {
    return this.act(player, now, (h) =>
      plancheThread(this.theme.board, this.state, h, city, good, now),
    );
  }

  unthread(player: string, city: string, good: string, now: number): PlancheAnswer {
    return this.act(player, now, (h) =>
      plancheUnthread(this.theme.board, this.state, h, city, good, now),
    );
  }

  toll(player: string, passage: string, tollBps: number, now: number): PlancheAnswer {
    return this.act(player, now, (h) =>
      plancheToll(this.theme.board, this.state, h, passage, tollBps),
    );
  }

  /** The duel is replayed here: the player's pieces, the lieutenant's answers. Won, a seal breaks. */
  force(player: string, passage: string, moves: PasseMove[], now: number): PlancheAnswer {
    const def = this.theme.board.passages.find((p) => p.id === passage);
    const b = def ? this.theme.passe.boards[def.board] : undefined;
    if (!def || !b) return "planche_unknown";
    if (!this.seats.get(player)) return "not_seated";
    let s = passeInit({ ...this.theme.passe.rules, ...b, cells: [...b.cells], first: 1 });
    for (const m of moves) {
      if (s.winner) break;
      if (s.turn !== 1) s = passePlay(s, passeThink(s, { depth: this.theme.passe.lieutenant }));
      if (s.winner) break;
      try {
        s = passePlay(s, m.fire ? { at: m.at, fire: true } : { at: m.at });
      } catch {
        return "duel_illegal";
      }
    }
    if (s.winner !== 1) return "duel_lost";
    return this.act(player, now, (h) =>
      plancheForced(this.theme.board, this.state, h, passage, now),
    );
  }
}
