import { plancheMayChallenge } from "@comptoirs/engine";
import type { PasseHub } from "./passe.js";
import type { PlancheStore } from "./plancheStore.js";

/** A challenge proposed and not yet answered. */
interface Pending {
  store: PlancheStore;
  from: string;
  fromName: string;
  fromHouse: string;
  to: string;
  at: number;
}

/** A challenge under way: its room of the Passe, its two players, the Passes already counted. */
interface Duel {
  store: PlancheStore;
  players: [string, string];
  rounds: number;
  /** The Passes the challenger won. */
  wins: number;
  at: number;
}

export interface PlancheDefiView {
  /** Someone challenges this player: its house and its name. */
  incoming?: { house: string; name: string };
  /** This player's challenge waits for an answer (the house challenged). */
  outgoing?: string;
  /** The room of the Passe of this player's challenge under way. */
  room?: string;
  /** The cotes of the two houses, before (docs/plan-duels.md B4). */
  cote?: { you: number; other: number };
}

/**
 * The challenge by the thread (docs/plan-hex-commerce.md § 3.5, lot H5): a thread drawn to the
 * island of another player who is there proposes two Passes, live, on the duel rooms already on
 * line; each plays the thread once and the chain once, and each Passe moves the cote of the Passe.
 * Once a pair and a week. A refusal is not shown: the challenge only lapses.
 *
 * Held in memory, like the rooms of the Passe: a restart loses a challenge under way, never a
 * Passe counted (each is a command of the board, written to its journal).
 */
export class PlancheDefis {
  private readonly pending = new Map<string, Pending>();
  private readonly duels = new Map<string, Duel>();

  constructor(
    private readonly passe: PasseHub,
    /** The board's clock (game time), and the real one of the rooms. */
    private readonly clock: () => number,
    private readonly options: {
      board?: string;
      /** How long a challenge waits for its answer (real time). */
      waitMs?: number;
      /** How recently a player must have looked at the board to be « there » (game time). */
      presentMs?: number;
      /** Told when a player should read the board again (the live push). */
      notify?: (players: string[]) => void;
    } = {},
  ) {
    passe.onWin((code, winner, loser) => void this.won(code, winner, loser));
  }

  private get waitMs() {
    return this.options.waitMs ?? 120_000;
  }

  private live(players: string[]) {
    this.options.notify?.(players);
  }

  /** A player challenges the house of another, who must be there. */
  propose(
    store: PlancheStore,
    from: string,
    fromName: string,
    toHouse: string,
    now: number,
  ): string {
    const hub = store.hub;
    const fromHouse = hub.houseOf(from);
    const to = hub.playerOf(toHouse);
    if (!fromHouse || !to) return "planche_not_person";
    const why = plancheMayChallenge(hub.current().doc.state, fromHouse, toHouse);
    if (why) return why;
    const seen = hub.lastSeen(to);
    if (seen === undefined || this.clock() - seen > (this.options.presentMs ?? 180_000))
      return "planche_defi_absent";
    this.sweep(now);
    if (this.busy(from) || this.busy(to)) return "planche_defi_busy";
    this.pending.set(to, { store, from, fromName, fromHouse, to, at: now });
    this.live([to]);
    return "ok";
  }

  /** Either side of a challenge waiting, or in a room under way. */
  private busy(player: string): boolean {
    if (this.pending.has(player)) return true;
    for (const p of this.pending.values()) if (p.from === player) return true;
    for (const d of this.duels.values()) if (d.players.includes(player)) return true;
    return false;
  }

  /** The one challenged answers: yes opens the room (the challenger the thread first), no lets it lapse. */
  answer(player: string, name: string, accept: boolean, now: number): string {
    this.sweep(now);
    const p = this.pending.get(player);
    if (!p) return "planche_defi_none";
    this.pending.delete(player);
    if (!accept) return "ok";
    const opened = this.passe.open(p.from, p.fromName, this.options.board ?? "chioggia", now);
    if ("error" in opened) return opened.error;
    this.passe.join(player, name, opened.code, now);
    this.duels.set(opened.code, {
      store: p.store,
      players: [p.from, player],
      rounds: 0,
      wins: 0,
      at: now,
    });
    this.live([p.from, player]);
    return "ok";
  }

  /** What a player sees of challenges. */
  view(player: string, now: number): PlancheDefiView {
    this.sweep(now);
    const v: PlancheDefiView = {};
    const p = this.pending.get(player);
    if (p) {
      v.incoming = { house: p.fromHouse, name: p.fromName };
      const st = p.store.hub.current().doc.state;
      const mine = p.store.hub.houseOf(player);
      v.cote = {
        you: (mine && st.houses[mine]?.rank.cote) || 0,
        other: st.houses[p.fromHouse]?.rank.cote ?? 0,
      };
    }
    for (const q of this.pending.values())
      if (q.from === player) v.outgoing = q.store.hub.houseOf(q.to) ?? "";
    for (const [code, d] of this.duels) if (d.players.includes(player)) v.room = code;
    return v;
  }

  /**
   * A Passe of a challenge won; after the second, the challenge is one match written on the board
   * (docs/plan-duels.md B4): the cote moves once, by 2-0, 1-1 or 0-2.
   */
  private async won(code: string, winner: string, _loser: string): Promise<void> {
    const d = this.duels.get(code);
    if (!d || d.rounds >= 2) return;
    d.rounds += 1;
    if (winner === d.players[0]) d.wins += 1;
    if (d.rounds < 2) return;
    this.duels.delete(code);
    const won = Math.min(2, d.wins) as 0 | 1 | 2;
    await d.store.hub.match(d.players[0], d.players[1], won, this.clock()).catch(() => "lost");
  }

  /** Challenges unanswered for too long lapse; rooms that are no more are forgotten. */
  private sweep(now: number): void {
    for (const [to, p] of this.pending) if (now - p.at > this.waitMs) this.pending.delete(to);
    // A challenge left half played is forgotten after half an hour.
    for (const [code, d] of this.duels)
      if (now - d.at > 30 * 60_000 || !this.passe.view("", code, now)) this.duels.delete(code);
  }
}
