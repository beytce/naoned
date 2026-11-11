import {
  type PasseMove,
  type PasseSetup,
  type PlancheSetup,
  type PlancheState,
  passeInit,
  passePlay,
  passeThink,
  plancheAdvance,
  plancheBuild,
  plancheBuyTile,
  plancheClaim,
  plancheForced,
  plancheInit,
  plancheInvariant,
  plancheMove,
  plancheRobot,
  plancheThread,
  plancheToll,
  plancheUnthread,
  plancheUpgrade,
  venice1450Passe,
  venice1450Planche,
} from "@comptoirs/engine";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** The Monday at midnight (UTC) on or before `t`: the tide's weeks run from Monday to Sunday. */
export const mondayOf = (t: number) => {
  const day = Math.floor(t / DAY);
  // 1 January 1970 was a Thursday: day 4 is a Monday.
  return (day - ((((day - 4) % 7) + 7) % 7)) * DAY;
};

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

/** Venice's board, as the server plays it. */
export const plancheTheme = (): PlancheHubTheme => ({
  board: venice1450Planche,
  passe: { rules: venice1450Passe.rules, boards: venice1450Passe.boards, lieutenant: 3 },
  visitHours: 8,
  idleHours: 7 * 24,
});

export type PlancheAnswer = "ok" | "not_seated" | "duel_lost" | "duel_illegal" | string;

/**
 * What changes the board, one gesture at a time (docs/plan-compte.md C1): kept in the journal and
 * played again on loading. Time `t` is the game's; the board is first brought up to it.
 */
export type PlancheCommand =
  | { type: "seat"; player: string; name: string; t: number }
  | { type: "release"; players: string[]; t: number }
  | { type: "thread" | "unthread"; player: string; city: string; good: string; t: number }
  | { type: "toll"; player: string; passage: string; tollBps: number; t: number }
  | { type: "buy" | "upgrade"; player: string; at: string; t: number }
  | { type: "build"; player: string; kind: string; at: string; t: number }
  | { type: "move"; player: string; from: string; to: string; t: number }
  /** A duel already won and checked by the hub: only its outcome is kept. */
  | { type: "forced"; player: string; passage: string; t: number };

/** The whole of a board: what the engine holds, who sits where, and when it began. */
export interface PlancheDoc {
  state: PlancheState;
  seats: Record<string, { house: string; name: string }>;
  t0: number;
}

/** Where the hub writes each command before answering (the database), and when to snapshot. */
export interface PlancheJournal {
  save(command: PlancheCommand, doc: PlancheDoc, version: number): Promise<void>;
}

/** A new board: no house is a person's until one takes it (the rank's people are the seated). */
export function plancheDocInit(theme: PlancheHubTheme, now: number): PlancheDoc {
  const board = {
    ...theme.board,
    houses: theme.board.houses.map((h) => ({ ...h, robot: true })),
  };
  return { state: plancheInit(board, now, mondayOf(now)), seats: {}, t0: now };
}

const held = (doc: PlancheDoc) => new Set(Object.values(doc.seats).map((s) => s.house));

/** The board up to `now`: every whole hour played, the computer's houses at theirs. */
export function plancheDocAdvance(
  theme: PlancheHubTheme,
  doc: PlancheDoc,
  now: number,
): PlancheDoc {
  const S = theme.board;
  const mine = held(doc);
  let s = doc.state;
  for (;;) {
    const nextHour = doc.t0 + (Math.floor((s.now - doc.t0) / HOUR) + 1) * HOUR;
    if (nextHour > now) break;
    s = plancheAdvance(S, s, nextHour);
    const hour = Math.round((nextHour - doc.t0) / HOUR);
    S.houses.forEach((h, k) => {
      if (mine.has(h.id) || (hour + k) % theme.visitHours !== 0) return;
      s = plancheRobot(S, s, h.id, nextHour);
    });
  }
  s = plancheAdvance(S, s, now);
  return s === doc.state ? doc : { ...doc, state: s };
}

/**
 * One command on a board: pure, the same on line and when the journal is played again. The answer
 * is the engine's refusal, or "ok"; a refused command changes nothing.
 */
export function plancheDocApply(
  theme: PlancheHubTheme,
  doc0: PlancheDoc,
  c: PlancheCommand,
): { doc: PlancheDoc; answer: PlancheAnswer } {
  const S = theme.board;
  const doc = plancheDocAdvance(theme, doc0, c.t);
  if (c.type === "seat") {
    const had = doc.seats[c.player];
    if (had)
      return {
        doc: { ...doc, seats: { ...doc.seats, [c.player]: { ...had, name: c.name } } },
        answer: "ok",
      };
    const taken = held(doc);
    const free = S.houses.find((h) => !taken.has(h.id));
    if (!free) return { doc, answer: "planche_full" };
    // A person's house from now on: it has its rival at once, and its cote (docs/plan-classement.md).
    return {
      doc: {
        ...doc,
        seats: { ...doc.seats, [c.player]: { house: free.id, name: c.name } },
        state: plancheClaim(S, doc.state, free.id),
      },
      answer: "ok",
    };
  }
  if (c.type === "release") {
    const seats = { ...doc.seats };
    for (const p of c.players) delete seats[p];
    return { doc: { ...doc, seats }, answer: "ok" };
  }
  const seat = doc.seats[c.player];
  if (!seat) return { doc, answer: "not_seated" };
  const h = seat.house;
  const s = doc.state;
  try {
    let next: PlancheState;
    switch (c.type) {
      case "thread":
        next = plancheThread(S, s, h, c.city, c.good, c.t);
        break;
      case "unthread":
        next = plancheUnthread(S, s, h, c.city, c.good, c.t);
        break;
      case "toll":
        next = plancheToll(S, s, h, c.passage, c.tollBps);
        break;
      case "buy":
        next = plancheBuyTile(S, s, h, c.at, c.t);
        break;
      case "build":
        next = plancheBuild(S, s, h, c.kind, c.at, c.t);
        break;
      case "upgrade":
        next = plancheUpgrade(S, s, h, c.at, c.t);
        break;
      case "move":
        next = plancheMove(S, s, h, c.from, c.to, c.t);
        break;
      case "forced":
        next = plancheForced(S, s, h, c.passage, c.t);
        break;
    }
    return { doc: { ...doc, state: next }, answer: "ok" };
  } catch (e) {
    return { doc, answer: (e as Error).message };
  }
}

/**
 * The shared board on line (docs/plan-planche.md L5, docs/plan-compte.md C1). The board moves only
 * when someone reads or acts, hour by hour, the computer's houses visiting at their hours. A
 * newcomer takes a house of the computer and keeps it. Every change is a command, written to the
 * journal (when there is one) before it is answered: a restart loses nothing. A passage is forced
 * by a duel of the Passe the hub replays: the player sends his own pieces only, the lieutenant's
 * answers are the hub's.
 */
export class PlancheHub {
  private doc: PlancheDoc;
  private version: number;
  /** When each player last read or acted: in memory only (a restart counts everyone as present). */
  private readonly seen = new Map<string, number>();
  private queue: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly theme: PlancheHubTheme,
    now: number,
    loaded?: { doc: PlancheDoc; version: number; journal?: PlancheJournal },
    private readonly journal: PlancheJournal | undefined = loaded?.journal,
  ) {
    this.doc = loaded?.doc ?? plancheDocInit(theme, now);
    this.version = loaded?.version ?? 0;
    for (const p of Object.keys(this.doc.seats)) this.seen.set(p, now);
  }

  /** The board as it stands, and its version: what a snapshot writes. */
  current(): { doc: PlancheDoc; version: number } {
    return { doc: this.doc, version: this.version };
  }

  /** The game time the board has reached. */
  reached(): number {
    return this.doc.state.now;
  }

  /** One after the other: a command is written before the next one is decided. */
  private serial<T>(f: () => Promise<T>): Promise<T> {
    const next = this.queue.then(f, f);
    this.queue = next.catch(() => undefined);
    return next;
  }

  private async run(c: PlancheCommand): Promise<PlancheAnswer> {
    const { doc, answer } = plancheDocApply(this.theme, this.doc, c);
    if (answer !== "ok") {
      this.doc = doc;
      return answer;
    }
    await this.journal?.save(c, doc, this.version + 1);
    this.doc = doc;
    this.version += 1;
    return "ok";
  }

  /** The player's house, taken if he has none; a house left too long goes back to the computer. */
  private async seat(player: string, name: string, now: number): Promise<string | null> {
    const had = this.doc.seats[player];
    this.seen.set(player, now);
    if (had) {
      if (had.name !== name) await this.run({ type: "seat", player, name, t: now });
      return had.house;
    }
    const idle = this.theme.idleHours * HOUR;
    const gone = Object.keys(this.doc.seats).filter((p) => now - (this.seen.get(p) ?? now) > idle);
    if (gone.length) await this.run({ type: "release", players: gone, t: now });
    for (const p of gone) this.seen.delete(p);
    const res = await this.run({ type: "seat", player, name, t: now });
    if (res !== "ok") {
      this.seen.delete(player);
      return null;
    }
    return this.doc.seats[player]?.house ?? null;
  }

  view(player: string, name: string, now: number): Promise<PlancheView> {
    return this.serial(async () => {
      this.doc = plancheDocAdvance(this.theme, this.doc, now);
      const me = await this.seat(player, name, now);
      const names: Record<string, string> = {};
      for (const h of this.theme.board.houses) names[h.id] = h.name;
      for (const s of Object.values(this.doc.seats)) names[s.house] = s.name;
      const taken = held(this.doc);
      return {
        state: this.doc.state,
        me,
        names,
        players: this.theme.board.houses.map((h) => h.id).filter((id) => taken.has(id)),
        ok: plancheInvariant(this.doc.state),
        since: this.doc.t0,
      };
    });
  }

  /** A gesture of the player's house; the board's refusal is the answer. */
  private act(c: PlancheCommand): Promise<PlancheAnswer> {
    return this.serial(async () => {
      if (!this.doc.seats[(c as { player: string }).player]) return "not_seated";
      this.seen.set((c as { player: string }).player, c.t);
      return this.run(c);
    });
  }

  thread(player: string, city: string, good: string, t: number) {
    return this.act({ type: "thread", player, city, good, t });
  }

  unthread(player: string, city: string, good: string, t: number) {
    return this.act({ type: "unthread", player, city, good, t });
  }

  toll(player: string, passage: string, tollBps: number, t: number) {
    return this.act({ type: "toll", player, passage, tollBps, t });
  }

  /** The island of the player's house: a tile bought, a workshop built, raised or moved. */
  buyTile(player: string, at: string, t: number) {
    return this.act({ type: "buy", player, at, t });
  }

  build(player: string, kind: string, at: string, t: number) {
    return this.act({ type: "build", player, kind, at, t });
  }

  upgrade(player: string, at: string, t: number) {
    return this.act({ type: "upgrade", player, at, t });
  }

  move(player: string, from: string, to: string, t: number) {
    return this.act({ type: "move", player, from, to, t });
  }

  /** The duel is replayed here: the player's pieces, the lieutenant's answers. Won, a seal breaks. */
  async force(
    player: string,
    passage: string,
    moves: PasseMove[],
    t: number,
  ): Promise<PlancheAnswer> {
    const def = this.theme.board.passages.find((p) => p.id === passage);
    const b = def ? this.theme.passe.boards[def.board] : undefined;
    if (!def || !b) return "planche_unknown";
    if (!this.doc.seats[player]) return "not_seated";
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
    return this.act({ type: "forced", player, passage, t });
  }
}
