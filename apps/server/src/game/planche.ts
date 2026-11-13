import {
  type PasseMove,
  type PasseProblem,
  type PasseSetup,
  type PlancheHouse,
  type PlancheSetup,
  type PlancheState,
  passeInit,
  passePlay,
  passeThink,
  plancheAdvance,
  plancheAssemble,
  plancheBeacon,
  plancheBuild,
  plancheBuyTile,
  plancheClaim,
  plancheDaily,
  plancheDailyTry,
  plancheDecretChoose,
  plancheDefense,
  plancheDefenseMove,
  plancheDefenseRemove,
  plancheDuel,
  plancheForced,
  plancheGive,
  plancheGrant,
  plancheGuard,
  plancheGuardBoard,
  plancheHouseArrive,
  plancheHouseLeave,
  plancheInit,
  plancheInvariant,
  plancheMove,
  plancheMudaForce,
  plancheMudaRefusal,
  plancheNoirBoard,
  plancheNoirMind,
  plancheNoirRefusal,
  plancheNoirTry,
  plancheOrder,
  plancheOrderRefusal,
  plancheOrderTry,
  plancheRobot,
  plancheRuses,
  plancheShip,
  plancheShipDamage,
  plancheShipRefit,
  plancheShipRepair,
  plancheSortieBoard,
  plancheSortieEnd,
  plancheSortieMeet,
  plancheSortieRefusal,
  plancheSortiesSettle,
  plancheThread,
  plancheToll,
  plancheUnthread,
  plancheUpgrade,
  plancheVue,
  venice1450Lagune,
  venice1450Passe,
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
    /** The positions of the sealed orders (« the thread passes in N pieces »). */
    problems?: readonly PasseProblem[];
  };
  visitHours: number;
  /** Game hours without a read or a gesture after which a player's house goes back to the computer (0: never). */
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
  /** The board's version: a push tells a newer one (docs/plan-socle.md A2). */
  version: number;
}

/** Venice's lagoon of 48 houses, as the server plays it (docs/plan-lagunes.md G4). */
export const plancheTheme = (): PlancheHubTheme => ({
  board: venice1450Lagune,
  passe: {
    rules: venice1450Passe.rules,
    boards: venice1450Passe.boards,
    lieutenant: 3,
    problems: venice1450Passe.problems,
  },
  visitHours: 8,
  // An account keeps its house for good (docs/plan-compte.md C3).
  idleHours: 0,
});

export type PlancheAnswer = "ok" | "not_seated" | "duel_lost" | "duel_illegal" | string;

/**
 * What changes the board, one gesture at a time (docs/plan-compte.md C1): kept in the journal and
 * played again on loading. Time `t` is the game's; the board is first brought up to it.
 */
export type PlancheCommand =
  | { type: "seat"; player: string; name: string; t: number }
  | { type: "release"; players: string[]; t: number }
  /** A house leaving the lagoon for another league, whole (docs/plan-maree.md T5). */
  | { type: "leave"; player: string; t: number }
  /** A house coming from another lagoon, in the place of a house of the computer. */
  | { type: "arrive"; player: string; name: string; came: PlancheHouse; t: number }
  | {
      type: "thread" | "unthread";
      player: string;
      city: string;
      good: string;
      t: number;
      detour?: boolean;
    }
  | { type: "toll"; player: string; passage: string; tollBps: number; t: number }
  | { type: "buy" | "upgrade"; player: string; at: string; t: number }
  | { type: "build"; player: string; kind: string; at: string; t: number }
  | { type: "move"; player: string; from: string; to: string; t: number }
  /** A duel already won and checked by the hub: only its outcome is kept. */
  | { type: "forced"; player: string; passage: string; t: number }
  /** A sealed order's position played, won or lost, as the hub replayed it. */
  | { type: "order"; player: string; order: string; won: boolean; t: number }
  /** The problem of the day played, won or lost, in so many pieces. */
  | { type: "daily"; player: string; won: boolean; moves: number; t: number }
  /** The links laid in advance on a tower's board (docs/plan-hex-commerce.md H4). */
  | { type: "guard"; player: string; passage: string; cells: number[]; t: number }
  /** A Passe of a challenge won by the player against another house (docs/plan-hex-commerce.md H5). */
  | { type: "duel"; player: string; loser: string; t: number }
  /** The Arsenal and the port (docs/plan-arsenal.md A3). */
  | { type: "ship"; player: string; kind: string; t: number }
  | { type: "refit" | "repair"; player: string; id: number; t: number }
  | { type: "defense"; player: string; pass: string; kind: string; t: number }
  | { type: "defenseMove"; player: string; from: string; index: number; to: string; t: number }
  | { type: "defenseRemove"; player: string; pass: string; index: number; t: number }
  /** The War (docs/plan-guerre.md W4): its Prestige given on Sunday, a ship back damaged. */
  | { type: "grant"; player: string; amount: number; t: number }
  | { type: "damage"; player: string; id: number; t: number }
  /** The company's beacon (docs/plan-compagnie.md K4): goods given to it, its level carried. */
  | { type: "give"; player: string; goods: Record<string, number>; t: number }
  | { type: "beacon"; player: string; level: number; t: number }
  /** A black strait played with a cargo (docs/plan-muda.md N1): replayed by the hub, won or lost. */
  | {
      type: "noir";
      player: string;
      strait: string;
      good: string;
      n: number;
      won: boolean;
      t: number;
    }
  /** Three relics of a power made a plan. */
  | { type: "assemble"; player: string; power: string; t: number }
  /** A sortie met before its hour by the tower's holder (docs/plan-maree.md T5). */
  | { type: "sortie"; player: string; id: string; won: boolean; t: number }
  /** The Doge's decree of the tide. */
  | { type: "decret"; player: string; choice: number; t: number }
  /** A strait of the Muda played on Saturday (docs/plan-muda.md N2). */
  | { type: "muda"; player: string; strait: string; won: boolean; t: number }
  /** The port's secret ruses, once a day (docs/plan-guerre.md W3). */
  | {
      type: "ruses";
      player: string;
      ruses: Record<string, "chaine" | "brulot" | "renforts">;
      t: number;
    };

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

/** The house a newcomer takes: in the sestiere with the fewest players (docs/plan-lagunes.md G4). */
function freeHouse(S: PlancheSetup, doc: PlancheDoc) {
  const taken = held(doc);
  const people = new Map<string | undefined, number>();
  for (const h of S.houses)
    if (taken.has(h.id)) people.set(h.sestiere, (people.get(h.sestiere) ?? 0) + 1);
  return S.houses
    .filter((h) => !taken.has(h.id))
    .reduce<(typeof S.houses)[number] | undefined>(
      (best, h) =>
        !best || (people.get(h.sestiere) ?? 0) < (people.get(best.sestiere) ?? 0) ? h : best,
      undefined,
    );
}

/** A passage's board of the Passe, with the duel's rules: for a sortie against its tower. */
function sortieBoard(theme: PlancheHubTheme, passage: string): PasseSetup | undefined {
  const def = theme.board.passages.find((p) => p.id === passage);
  const b = def ? theme.passe.boards[def.board] : undefined;
  return b ? { ...theme.passe.rules, ...b, cells: [...b.cells] } : undefined;
}

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
    // The captains' sorties whose hour has come (docs/plan-maree.md T5).
    s = plancheSortiesSettle(S, s, nextHour, (p) => sortieBoard(theme, p));
    const hour = Math.round((nextHour - doc.t0) / HOUR);
    S.houses.forEach((h, k) => {
      if (mine.has(h.id) || (hour + k) % theme.visitHours !== 0) return;
      s = plancheRobot(S, s, h.id, nextHour);
    });
  }
  s = plancheAdvance(S, s, now);
  s = plancheSortiesSettle(S, s, now, (p) => sortieBoard(theme, p));
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
    const free = freeHouse(S, doc);
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
  if (c.type === "leave") {
    const seat = doc.seats[c.player];
    if (!seat) return { doc, answer: "not_seated" };
    try {
      const { state } = plancheHouseLeave(S, doc.state, seat.house, c.t);
      const seats = { ...doc.seats };
      delete seats[c.player];
      return { doc: { ...doc, seats, state }, answer: "ok" };
    } catch (e) {
      return { doc, answer: (e as Error).message };
    }
  }
  if (c.type === "arrive") {
    if (doc.seats[c.player]) return { doc, answer: "planche_seated" };
    const free = freeHouse(S, doc);
    if (!free) return { doc, answer: "planche_full" };
    try {
      const arrived = plancheHouseArrive(S, doc.state, free.id, c.came);
      return {
        doc: {
          ...doc,
          seats: { ...doc.seats, [c.player]: { house: free.id, name: c.name } },
          state: plancheClaim(S, arrived, free.id),
        },
        answer: "ok",
      };
    } catch (e) {
      return { doc, answer: (e as Error).message };
    }
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
        next = plancheThread(S, s, h, c.city, c.good, c.t, c.detour ? { detour: true } : {});
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
      case "order":
        next = plancheOrderTry(S, s, h, c.order, c.t, c.won);
        break;
      case "daily":
        next = plancheDailyTry(S, s, h, c.t, c.won, c.moves);
        break;
      case "duel":
        next = plancheDuel(S, s, h, c.loser);
        break;
      case "ship":
        next = plancheShip(S, s, h, c.kind, c.t);
        break;
      case "refit":
        next = plancheShipRefit(S, s, h, c.id, c.t);
        break;
      case "repair":
        next = plancheShipRepair(S, s, h, c.id, c.t);
        break;
      case "defense":
        next = plancheDefense(S, s, h, c.pass, c.kind);
        break;
      case "defenseMove":
        next = plancheDefenseMove(S, s, h, c.from, c.index, c.to);
        break;
      case "defenseRemove":
        next = plancheDefenseRemove(S, s, h, c.pass, c.index);
        break;
      case "ruses":
        next = plancheRuses(S, s, h, c.ruses, c.t);
        break;
      case "grant":
        next = plancheGrant(S, s, h, c.amount);
        break;
      case "damage":
        next = plancheShipDamage(S, s, h, c.id);
        break;
      case "give":
        next = plancheGive(S, s, h, c.goods);
        break;
      case "beacon":
        next = plancheBeacon(S, s, h, c.level);
        break;
      case "noir":
        next = plancheNoirTry(S, s, h, c.strait, { good: c.good, n: c.n }, c.won, c.t);
        break;
      case "assemble":
        next = plancheAssemble(S, s, h, c.power, c.t);
        break;
      case "muda":
        next = plancheMudaForce(S, s, h, c.strait, c.won, c.t);
        break;
      case "sortie": {
        const why = plancheSortieRefusal(s, h, c.id, c.t);
        if (why) return { doc, answer: why };
        next = plancheSortieEnd(S, s, c.id, c.won, "tenant", c.t);
        break;
      }
      case "decret":
        next = plancheDecretChoose(s, h, c.choice, c.t);
        break;
      case "guard": {
        const def = S.passages.find((p) => p.id === c.passage);
        const board = def ? theme.passe.boards[def.board] : undefined;
        if (!board) return { doc, answer: "planche_unknown" };
        next = plancheGuard(S, s, h, c.passage, c.cells, c.t, board.cells);
        break;
      }
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
  private readonly listeners: ((players: string[], version: number) => void)[] = [];

  constructor(
    readonly theme: PlancheHubTheme,
    now: number,
    loaded?: { doc: PlancheDoc; version: number; journal?: PlancheJournal },
    private readonly journal: PlancheJournal | undefined = loaded?.journal,
  ) {
    this.doc = loaded?.doc ?? plancheDocInit(theme, now);
    this.version = loaded?.version ?? 0;
    for (const p of Object.keys(this.doc.seats)) this.seen.set(p, now);
  }

  /**
   * Called after each change saved, with the board's players and its version (docs/plan-compte.md
   * C5) ; at most once every `pushEvery` milliseconds when set (docs/plan-socle.md A2).
   */
  onChange(listener: (players: string[], version: number) => void): void {
    this.listeners.push(listener);
  }

  private pushMs = 0;
  private pushTimer: NodeJS.Timeout | undefined;
  private pending: string[] | null = null;

  /** The changes told at most once every `ms` (0: each at once). */
  pushEvery(ms: number): void {
    this.pushMs = ms;
  }

  private tell(players: string[]): void {
    const fire = (who: string[]) => {
      for (const l of this.listeners) {
        try {
          l(who, this.version);
        } catch {
          // A listener's fault is not the board's.
        }
      }
    };
    if (!this.pushMs) {
      fire(players);
      return;
    }
    this.pending = players;
    if (this.pushTimer) return;
    this.pushTimer = setTimeout(() => {
      this.pushTimer = undefined;
      const who = this.pending;
      this.pending = null;
      if (who) fire(who);
    }, this.pushMs);
    this.pushTimer.unref?.();
  }

  /** The board as it stands, and its version: what a snapshot writes. */
  current(): { doc: PlancheDoc; version: number } {
    return { doc: this.doc, version: this.version };
  }

  /** The houses no one holds yet. */
  free(): number {
    return this.theme.board.houses.length - held(this.doc).size;
  }

  /** The house a player holds on this board, if any. */
  houseOf(player: string): string | null {
    return this.doc.seats[player]?.house ?? null;
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
    this.tell(Object.keys(doc.seats));
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
    // A house left too long goes back to the computer, unless houses are kept for good (0).
    const idle = this.theme.idleHours * HOUR;
    const gone =
      idle > 0
        ? Object.keys(this.doc.seats).filter((p) => now - (this.seen.get(p) ?? now) > idle)
        : [];
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
        // What the player may see: never the others' secrets (docs/plan-socle.md A1).
        state: plancheVue(this.doc.state, me ?? ""),
        me,
        names,
        players: this.theme.board.houses.map((h) => h.id).filter((id) => taken.has(id)),
        ok: plancheInvariant(this.doc.state),
        since: this.doc.t0,
        version: this.version,
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

  thread(player: string, city: string, good: string, t: number, detour = false) {
    return this.act({ type: "thread", player, city, good, t, ...(detour ? { detour: true } : {}) });
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

  /** The Arsenal: a ship laid on a cale, refitted, or repaired (docs/plan-arsenal.md). */
  ship(player: string, kind: string, t: number) {
    return this.act({ type: "ship", player, kind, t });
  }

  refit(player: string, id: number, t: number) {
    return this.act({ type: "refit", player, id, t });
  }

  repair(player: string, id: number, t: number) {
    return this.act({ type: "repair", player, id, t });
  }

  /** The port: a defense built on a pass, moved to another, or taken down. */
  defense(player: string, pass: string, kind: string, t: number) {
    return this.act({ type: "defense", player, pass, kind, t });
  }

  defenseMove(player: string, from: string, index: number, to: string, t: number) {
    return this.act({ type: "defenseMove", player, from, index, to, t });
  }

  defenseRemove(player: string, pass: string, index: number, t: number) {
    return this.act({ type: "defenseRemove", player, pass, index, t });
  }

  /** The War's Prestige of the week, and a ship back damaged from an assault. */
  grant(player: string, amount: number, t: number) {
    return this.act({ type: "grant", player, amount, t });
  }

  damage(player: string, id: number, t: number) {
    return this.act({ type: "damage", player, id, t });
  }

  /** Goods given to the company's beacon, and the beacon's level carried by a house. */
  give(player: string, goods: Record<string, number>, t: number) {
    return this.act({ type: "give", player, goods, t });
  }

  beacon(player: string, level: number, t: number) {
    return this.act({ type: "beacon", player, level, t });
  }

  /**
   * A black strait (docs/plan-muda.md N1): the duel is replayed here on the day's board, against
   * its captain. Lost, the cargo sinks all the same: the answer is then "duel_lost".
   */
  async noir(
    player: string,
    strait: string,
    cargo: { good: string; n: number },
    moves: PasseMove[],
    t: number,
  ): Promise<PlancheAnswer> {
    const S = this.theme.board;
    const def = S.noir?.straits.find((x) => x.id === strait);
    const b = def ? this.theme.passe.boards[def.board] : undefined;
    const seat = this.doc.seats[player];
    if (!def || !b) return "planche_unknown";
    if (!seat) return "not_seated";
    const at = plancheDocAdvance(this.theme, this.doc, t).state;
    const why = plancheNoirRefusal(S, at, seat.house, strait, cargo, t);
    if (why) return why;
    const cells = plancheNoirBoard(S, at, strait, t, b.cells);
    const won = this.replays(
      { ...this.theme.passe.rules, ...b, cells, first: 1 },
      plancheNoirMind(S, strait),
      moves,
    );
    if (won === null) return "duel_illegal";
    const answer = await this.act({ type: "noir", player, strait, ...cargo, won, t });
    return answer === "ok" && !won ? "duel_lost" : answer;
  }

  /**
   * A sortie met before its hour (docs/plan-maree.md T5): the holder's own links of the chain,
   * replayed here against the captain. The captain passed: "duel_lost" (a seal lost all the same).
   */
  async sortie(player: string, id: string, moves: PasseMove[], t: number): Promise<PlancheAnswer> {
    const S = this.theme.board;
    const seat = this.doc.seats[player];
    if (!seat) return "not_seated";
    const at = plancheDocAdvance(this.theme, this.doc, t).state;
    const why = plancheSortieRefusal(at, seat.house, id, t);
    if (why) return why;
    const x = at.sorties?.list.find((y) => y.id === id);
    const b = x ? sortieBoard(this.theme, x.target) : undefined;
    if (!x || !b) return "planche_unknown";
    const won = plancheSortieMeet(S, x, { ...b, cells: plancheSortieBoard(at, x, b) }, moves);
    if (won === null) return "duel_illegal";
    const answer = await this.act({ type: "sortie", player, id, won, t });
    return answer === "ok" && won ? "duel_lost" : answer;
  }

  /**
   * A house leaves this lagoon for another league (docs/plan-maree.md T5): what it takes, or null
   * if it is not seated here. Its place goes back to the computer.
   */
  leave(player: string, t: number): Promise<PlancheHouse | null> {
    return this.serial(async () => {
      this.doc = plancheDocAdvance(this.theme, this.doc, t);
      const seat = this.doc.seats[player];
      const gone = seat ? this.doc.state.houses[seat.house] : undefined;
      if (!gone) return null;
      const taken = structuredClone(gone);
      return (await this.run({ type: "leave", player, t })) === "ok" ? taken : null;
    });
  }

  /** A house comes from another lagoon, in the place of a house of the computer. */
  arrive(player: string, name: string, came: PlancheHouse, t: number): Promise<PlancheAnswer> {
    return this.serial(async () => {
      this.doc = plancheDocAdvance(this.theme, this.doc, t);
      const res = await this.run({ type: "arrive", player, name, came, t });
      if (res === "ok") this.seen.set(player, t);
      return res;
    });
  }

  /** The Doge chooses the decree of the tide. */
  decret(player: string, choice: number, t: number) {
    return this.act({ type: "decret", player, choice, t });
  }

  /** Three relics of a power make a plan. */
  assemble(player: string, power: string, t: number) {
    return this.act({ type: "assemble", player, power, t });
  }

  /** A strait of the Muda (docs/plan-muda.md N2): replayed here against the corsairs' fleet. */
  async muda(
    player: string,
    strait: string,
    moves: PasseMove[],
    t: number,
  ): Promise<PlancheAnswer> {
    const S = this.theme.board;
    const def = S.muda?.straits.find((x) => x.id === strait);
    const b = def ? this.theme.passe.boards[def.board] : undefined;
    const seat = this.doc.seats[player];
    if (!def || !b || !S.muda) return "planche_unknown";
    if (!seat) return "not_seated";
    const why = plancheMudaRefusal(
      S,
      plancheDocAdvance(this.theme, this.doc, t).state,
      seat.house,
      strait,
      t,
    );
    if (why) return why;
    const won = this.replays(
      { ...this.theme.passe.rules, ...b, cells: [...b.cells], first: 1 },
      { depth: S.muda.depth },
      moves,
    );
    if (won === null) return "duel_illegal";
    const answer = await this.act({ type: "muda", player, strait, won, t });
    return answer === "ok" && !won ? "duel_lost" : answer;
  }

  /** A duel replayed: the player's pieces, the mind's answers. Null: a piece was illegal. */
  private replays(
    setup: PasseSetup,
    mind: { depth: number; style?: "mur" | "rives" | "meute" },
    moves: PasseMove[],
  ): boolean | null {
    let s = passeInit(setup);
    for (const m of moves) {
      if (s.winner) break;
      if (s.turn !== 1) s = passePlay(s, passeThink(s, mind));
      if (s.winner) break;
      try {
        s = passePlay(s, m.fire ? { at: m.at, fire: true } : { at: m.at });
      } catch {
        return null;
      }
    }
    return s.winner === 1;
  }

  /** The port's secret ruses, one a pass, once a day. */
  ruses(player: string, ruses: Record<string, "chaine" | "brulot" | "renforts">, t: number) {
    return this.act({ type: "ruses", player, ruses, t });
  }

  /** A Passe of a challenge won: the cote of the two houses moves. */
  duel(winner: string, loser: string, t: number): Promise<PlancheAnswer> {
    const house = this.doc.seats[loser]?.house;
    if (!house) return Promise.resolve("not_seated");
    return this.act({ type: "duel", player: winner, loser: house, t });
  }

  /** When a player last read or acted on the board (game time), if it is seated here. */
  lastSeen(player: string): number | undefined {
    return this.seen.get(player);
  }

  /** The account seated in a house, if a person holds it. */
  playerOf(house: string): string | undefined {
    return Object.entries(this.doc.seats).find(([, s]) => s.house === house)?.[0];
  }

  /** The holder of a tower lays its guard: links in advance on its board, changed once a day. */
  guard(player: string, passage: string, cells: number[], t: number) {
    return this.act({ type: "guard", player, passage, cells, t });
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
    // The duel begins on the tower's guard, the links its holder laid (docs/plan-hex-commerce.md H4).
    const cells = plancheGuardBoard(b.cells, this.doc.state.passages[passage]?.guard);
    let s = passeInit({ ...this.theme.passe.rules, ...b, cells, first: 1 });
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

  /**
   * A sealed order (docs/plan-hex-commerce.md H2): its position is replayed here, the player's
   * pieces and the chain's answers, within the pieces the problem allows. Won, the order is
   * delivered; lost, the try is spent and nothing else.
   */
  async order(player: string, id: string, moves: PasseMove[], t: number): Promise<PlancheAnswer> {
    const S = this.theme.board;
    const o = plancheOrder(S, id);
    const pb = o && this.theme.passe.problems?.find((p) => p.id === o.problem);
    if (!o || !pb) return "planche_unknown";
    const seat = this.doc.seats[player];
    if (!seat) return "not_seated";
    const why = plancheOrderRefusal(S, this.doc.state, seat.house, id, t);
    // The stock is read again once the board is brought to `t`: only its other refusals stop here.
    if (why && why !== "planche_order_short") return why;
    const won = this.solves(pb, moves);
    if (won === null) return "duel_illegal";
    const answer = await this.act({ type: "order", player, order: id, won, t });
    return answer === "ok" && !won ? "duel_lost" : answer;
  }

  /** The day's problem (docs/plan-hex-commerce.md H3): replayed here, one try, its Prestige if solved. */
  async daily(player: string, moves: PasseMove[], t: number): Promise<PlancheAnswer> {
    const id = plancheDaily(this.theme.board, Math.floor(t / DAY));
    const pb = id ? this.theme.passe.problems?.find((p) => p.id === id) : undefined;
    if (!pb) return "planche_unknown";
    const seat = this.doc.seats[player];
    if (!seat) return "not_seated";
    if (this.doc.state.daily?.[Math.floor(t / DAY)]?.[seat.house]) return "planche_daily_tried";
    const won = this.solves(pb, moves);
    if (won === null) return "duel_illegal";
    const laid = Math.min(moves.length, pb.moves);
    const answer = await this.act({ type: "daily", player, won, moves: laid, t });
    return answer === "ok" && !won ? "duel_lost" : answer;
  }

  /**
   * A position of « the thread passes in N pieces » replayed: the player's pieces, the chain's
   * answers as the laboratory's (depth 3), within the pieces allowed. Null: a piece was illegal.
   */
  private solves(pb: PasseProblem, moves: PasseMove[]): boolean | null {
    let s = passeInit({
      ...this.theme.passe.rules,
      fire: { thread: 0, chain: 0 },
      width: pb.width,
      height: pb.height,
      cells: [...pb.cells],
      first: 1,
    });
    for (const m of moves) {
      if (s.winner || s.laid[0] >= pb.moves) break;
      if (s.turn !== 1) s = passePlay(s, passeThink(s, { depth: 3 }));
      if (s.winner) break;
      try {
        s = passePlay(s, { at: m.at });
      } catch {
        return null;
      }
    }
    return s.winner === 1 && s.laid[0] <= pb.moves;
  }
}
