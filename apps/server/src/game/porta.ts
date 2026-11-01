import { randomInt, randomUUID } from "node:crypto";
import {
  type Battle,
  type BattleOrder,
  type EmpireSettings,
  type PlayerUnit,
  RARITIES,
  type Rarity,
  bandOf,
  battleResult,
  createBattle,
  orderBattle,
  portaEntrant,
  powerOfHouse,
  stepBattle,
  weekPoints,
} from "@comptoirs/engine";
import type { GameWorld } from "./world.js";

/**
 * The Porta's live battles (docs/plan-porta.md §§ 6–9): the lobbies (public by tier and band of
 * Power, private by an invitation code, or alone at once), the battles held in memory and stepped
 * at their own pace, each player's snapshot pushed to his open sockets, the orders taken between
 * two steps, the outcome settled by the house's command. Nothing here is money or goods: the
 * victuals are paid on entering (`empirePortaEnter`), the losses and relics on settling.
 */

/** What a player brings to a lobby: his tier and his two vehicles docked at the Porta. */
export interface PortaEntry {
  tier: number;
  combatId: string;
  transportId: string;
}

interface Member extends PortaEntry {
  playerId: string;
}

interface Lobby {
  id: string;
  tier: number;
  band: number;
  /** A private lobby's invitation code (null: public). */
  code: string | null;
  owner: string;
  members: Member[];
  openedAt: number;
}

interface Live {
  id: string;
  battle: Battle;
  /** Players whose outcome is settled already (their vehicles all out). */
  settled: Set<string>;
  /** Real time of the last step. */
  steppedAt: number;
}

/** The few methods of a WebSocket the hub needs. */
export interface PortaSocket {
  readonly readyState: number;
  send(data: string): void;
  on(event: "close", listener: () => void): unknown;
}

/** Why the hub refuses: its own reasons, or the engine's on entering. */
export type PortaRefusal =
  | "in_battle"
  | "in_lobby"
  | "not_in_lobby"
  | "unknown_lobby"
  | "lobby_full"
  | "not_owner"
  | "too_few"
  | "solo_closed"
  | "not_in_battle"
  | string;

/** A public lobby starts with whoever is there after this wait, if they are enough. */
const PUBLIC_WAIT_MS = 2 * 60_000;
const OPEN = 1;

export class PortaHub {
  private lobbies = new Map<string, Lobby>();
  private battles = new Map<string, Live>();
  private lobbyOf = new Map<string, string>();
  private battleOf = new Map<string, string>();
  private sockets = new Map<string, Set<PortaSocket>>();
  private timer: NodeJS.Timeout | undefined;

  constructor(private readonly world: GameWorld) {}

  private get settings(): EmpireSettings | undefined {
    return this.world.ctx.settings.empire;
  }

  /** At start-up: a battle a restart cut short is undone, the victuals given back. */
  async recover(): Promise<void> {
    const houses = this.world.current.empire?.houses ?? {};
    for (const [playerId, h] of Object.entries(houses)) {
      const b = h.porta?.battle;
      if (b) await this.world.execute({ type: "empirePortaCancel", playerId, battleId: b.id });
    }
  }

  start(): void {
    const ms = this.settings?.porta.battle.stepMs ?? 250;
    this.timer ??= setInterval(() => void this.tick().catch(console.error), ms);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }

  /** The band of Power a player's public lobby is matched in. */
  private bandOf(playerId: string): number {
    const s = this.settings;
    const h = this.world.current.empire?.houses[playerId];
    return s && h ? bandOf(powerOfHouse(h, s), s) : 0;
  }

  private tierLine(tier: number) {
    return this.settings?.porta.tiers[tier - 1];
  }

  private busy(playerId: string): PortaRefusal | null {
    if (this.battleOf.has(playerId)) return "in_battle";
    if (this.lobbyOf.has(playerId)) return "in_lobby";
    return null;
  }

  /**
   * Goes in: alone at once (`solo`), into a public lobby of the tier and band (started full, or
   * after its wait with enough players), or into a private one of its own (`invite`), whose code
   * it shares. Returns the lobby's id, or the battle's when it started.
   */
  async queue(
    playerId: string,
    entry: PortaEntry,
    mode: "solo" | "public" | "invite",
  ): Promise<{ lobby?: Lobby; battle?: string } | { error: PortaRefusal }> {
    const busy = this.busy(playerId);
    if (busy) return { error: busy };
    const line = this.tierLine(entry.tier);
    if (!line) return { error: "requirement_unmet" };
    const member = { playerId, ...entry };
    if (mode === "solo") {
      if (line.minPlayers > 1) return { error: "solo_closed" };
      return this.launchWith(entry.tier, [member]);
    }
    if (mode === "public") {
      const band = this.bandOf(playerId);
      const open = [...this.lobbies.values()].find(
        (l) =>
          l.code === null &&
          l.tier === entry.tier &&
          l.band === band &&
          l.members.length < line.maxPlayers,
      );
      if (open) {
        open.members.push(member);
        this.lobbyOf.set(playerId, open.id);
        if (open.members.length >= line.maxPlayers) return this.launchLobby(open);
        return { lobby: open };
      }
      return { lobby: this.openLobby(member, band, null) };
    }
    return { lobby: this.openLobby(member, this.bandOf(playerId), this.newCode()) };
  }

  private newCode(): string {
    for (;;) {
      const code = String(randomInt(100_000, 1_000_000));
      if (![...this.lobbies.values()].some((l) => l.code === code)) return code;
    }
  }

  private openLobby(member: Member, band: number, code: string | null): Lobby {
    const lobby: Lobby = {
      id: randomUUID(),
      tier: member.tier,
      band,
      code,
      owner: member.playerId,
      members: [member],
      openedAt: this.world.now(),
    };
    this.lobbies.set(lobby.id, lobby);
    this.lobbyOf.set(member.playerId, lobby.id);
    return lobby;
  }

  /** Joins a private lobby by its code, at its tier. */
  async join(
    playerId: string,
    code: string,
    vehicles: { combatId: string; transportId: string },
  ): Promise<{ lobby?: Lobby; battle?: string } | { error: PortaRefusal }> {
    const busy = this.busy(playerId);
    if (busy) return { error: busy };
    const lobby = [...this.lobbies.values()].find((l) => l.code === code);
    if (!lobby) return { error: "unknown_lobby" };
    const line = this.tierLine(lobby.tier);
    if (!line || lobby.members.length >= line.maxPlayers) return { error: "lobby_full" };
    lobby.members.push({ playerId, tier: lobby.tier, ...vehicles });
    this.lobbyOf.set(playerId, lobby.id);
    if (lobby.members.length >= line.maxPlayers) return this.launchLobby(lobby);
    return { lobby };
  }

  /** Leaves a lobby; the last one out closes it, an owner who leaves hands it on. */
  leave(playerId: string): PortaRefusal | null {
    const id = this.lobbyOf.get(playerId);
    const lobby = id ? this.lobbies.get(id) : undefined;
    if (!lobby) return "not_in_lobby";
    this.lobbyOf.delete(playerId);
    lobby.members = lobby.members.filter((m) => m.playerId !== playerId);
    if (lobby.members.length === 0) this.lobbies.delete(lobby.id);
    else if (lobby.owner === playerId) lobby.owner = lobby.members[0]?.playerId ?? lobby.owner;
    return null;
  }

  /**
   * « Partir maintenant »: the owner of a private lobby starts it with those there; in a public
   * lobby, a player leaves it and starts alone, without waiting (decision of the owner).
   */
  async launch(playerId: string): Promise<{ battle?: string } | { error: PortaRefusal }> {
    const id = this.lobbyOf.get(playerId);
    const lobby = id ? this.lobbies.get(id) : undefined;
    if (!lobby) return { error: "not_in_lobby" };
    const line = this.tierLine(lobby.tier);
    if (!line) return { error: "requirement_unmet" };
    if (lobby.code !== null) {
      if (lobby.owner !== playerId) return { error: "not_owner" };
      if (lobby.members.length < line.minPlayers) return { error: "too_few" };
      return this.launchLobby(lobby);
    }
    if (line.minPlayers > 1) return { error: "solo_closed" };
    const me = lobby.members.find((m) => m.playerId === playerId);
    this.leave(playerId);
    return me ? this.launchWith(lobby.tier, [me]) : { error: "not_in_lobby" };
  }

  private async launchLobby(lobby: Lobby) {
    this.lobbies.delete(lobby.id);
    for (const m of lobby.members) this.lobbyOf.delete(m.playerId);
    return this.launchWith(lobby.tier, lobby.members);
  }

  /**
   * Starts a battle: each member enters by his house's command (tier open, vehicles docked,
   * victuals paid); one refused is left out, and the battle starts with the others if they are
   * enough. Alone, the refusal is his.
   */
  private async launchWith(
    tier: number,
    members: Member[],
  ): Promise<{ battle?: string } | { error: PortaRefusal }> {
    const s = this.settings;
    const line = this.tierLine(tier);
    if (!s || !line) return { error: "requirement_unmet" };
    const id = randomUUID();
    const inside: Member[] = [];
    let refusal: string | null = null;
    for (const m of members) {
      const res = await this.world.execute({
        type: "empirePortaEnter",
        playerId: m.playerId,
        battleId: id,
        tier,
        combatId: m.combatId,
        transportId: m.transportId,
      });
      if (res.ok) inside.push(m);
      else refusal = res.error ?? "refused";
    }
    if (inside.length < line.minPlayers) {
      for (const m of inside)
        await this.world.execute({ type: "empirePortaCancel", playerId: m.playerId, battleId: id });
      return { error: inside.length === 0 && refusal ? refusal : "too_few" };
    }
    const houses = this.world.current.empire?.houses ?? {};
    const entrants = inside.map((m) => {
      const h = houses[m.playerId];
      if (!h) throw new Error("house gone");
      return portaEntrant(h, m.playerId, s);
    });
    const battle = createBattle({ seed: randomInt(0, 2 ** 31), tier, players: entrants }, s);
    this.battles.set(id, { id, battle, settled: new Set(), steppedAt: this.world.now() });
    for (const m of inside) this.battleOf.set(m.playerId, id);
    return { battle: id };
  }

  /** An order of a player in his battle. */
  order(playerId: string, order: BattleOrder): PortaRefusal | null {
    const live = this.liveOf(playerId);
    if (!live) return "not_in_battle";
    return orderBattle(live.battle, playerId, order);
  }

  private liveOf(playerId: string): Live | undefined {
    const id = this.battleOf.get(playerId);
    return id ? this.battles.get(id) : undefined;
  }

  /**
   * One beat: the public lobbies that waited long enough start, every battle catches up with real
   * time by its steps, the players whose vehicles are all out are settled, the finished battles
   * close, and every player sees his battle.
   */
  async tick(): Promise<void> {
    const s = this.settings;
    if (!s) return;
    const now = this.world.now();
    for (const lobby of [...this.lobbies.values()]) {
      const line = this.tierLine(lobby.tier);
      if (
        lobby.code === null &&
        line &&
        now - lobby.openedAt >= PUBLIC_WAIT_MS &&
        lobby.members.length >= line.minPlayers
      )
        await this.launchLobby(lobby);
    }
    const ms = s.porta.battle.stepMs;
    for (const live of [...this.battles.values()]) {
      const steps = Math.min(40, Math.floor((now - live.steppedAt) / ms));
      for (let i = 0; i < steps; i++) stepBattle(live.battle, s);
      live.steppedAt += steps * ms;
      await this.settleOut(live);
      this.push(live);
      if (live.battle.over) {
        this.battles.delete(live.id);
        for (const p of live.battle.players)
          if (this.battleOf.get(p) === live.id) this.battleOf.delete(p);
      }
    }
  }

  /** Settles each player of a battle whose vehicles are all out (or the battle over). */
  private async settleOut(live: Live): Promise<void> {
    const result = battleResult(live.battle);
    for (const p of live.battle.players) {
      if (live.settled.has(p)) continue;
      const out = result[p];
      if (!out || (!live.battle.over && out.vehicles.some((v) => v.outcome === "in"))) continue;
      live.settled.add(p);
      const res = await this.world.execute({
        type: "empirePortaSettle",
        playerId: p,
        battleId: live.id,
        outcome: out,
      });
      if (!res.ok) console.error("porta settle refused", p, res.error);
    }
  }

  /** A player's open battle socket. */
  subscribe(playerId: string, socket: PortaSocket): void {
    let mine = this.sockets.get(playerId);
    if (!mine) {
      mine = new Set();
      this.sockets.set(playerId, mine);
    }
    mine.add(socket);
    socket.on("close", () => {
      mine?.delete(socket);
      if (mine?.size === 0) this.sockets.delete(playerId);
    });
    const live = this.liveOf(playerId);
    if (live) this.sendTo(playerId, live);
  }

  private push(live: Live): void {
    for (const p of live.battle.players) this.sendTo(p, live);
  }

  private sendTo(playerId: string, live: Live): void {
    const mine = this.sockets.get(playerId);
    if (!mine || mine.size === 0) return;
    const data = JSON.stringify({ type: "battle", battle: snapshot(live, playerId) });
    for (const socket of mine) if (socket.readyState === OPEN) socket.send(data);
  }

  /** Where a player stands: his lobby, or his battle's snapshot. */
  stateOf(playerId: string) {
    const live = this.liveOf(playerId);
    const lid = this.lobbyOf.get(playerId);
    const lobby = lid ? this.lobbies.get(lid) : undefined;
    return {
      lobby: lobby
        ? {
            id: lobby.id,
            tier: lobby.tier,
            code: lobby.code,
            owner: lobby.owner === playerId,
            players: lobby.members.length,
            waitUntil: lobby.code === null ? lobby.openedAt + PUBLIC_WAIT_MS : null,
          }
        : null,
      battle: live ? snapshot(live, playerId) : null,
    };
  }

  /** The week's ranking of a band (plan-porta.md § 9): its houses by points, best first. */
  ranking(band: number): { playerId: string; points: number }[] {
    const s = this.settings;
    if (!s) return [];
    const now = this.world.now();
    return Object.entries(this.world.current.empire?.houses ?? {})
      .map(([playerId, h]) => ({ playerId, h, points: weekPoints(h, now) }))
      .filter((x) => x.points > 0 && bandOf(powerOfHouse(x.h, s), s) === band)
      .sort((a, b) => b.points - a.points || a.playerId.localeCompare(b.playerId))
      .map(({ playerId, points }) => ({ playerId, points }));
  }

  /** The band a player is ranked in. */
  bandOfPlayer(playerId: string): number {
    return this.bandOf(playerId);
  }
}

const round = (n: number) => Math.round(n * 100) / 100;
const count = (rs: Rarity[]) =>
  Object.fromEntries(RARITIES.map((r) => [r, rs.filter((x) => x === r).length]));

/**
 * What a player sees of his battle: the map, his own relics in each city, every unit (Rome's
 * mind too: its state and its target, as Hades' Star shows them), his vehicles' cargo, loading
 * and components, the last step's events.
 */
export function snapshot(live: Live, playerId: string) {
  const b = live.battle;
  return {
    id: live.id,
    tier: b.tier,
    timeMs: b.timeMs,
    endsAtMs: b.endsAtMs,
    over: b.over,
    radius: b.radius,
    gate: b.gate,
    gateRadiusCenti: b.gateRadiusCenti,
    cities: b.cities.map((c) => ({
      id: c.id,
      x: c.x,
      y: c.y,
      relics: count(c.relics[playerId] ?? []),
    })),
    units: b.units.map((u) =>
      u.side === "rome"
        ? {
            id: u.id,
            side: u.side,
            kind: u.kind,
            x: round(u.x),
            y: round(u.y),
            hp: Math.ceil(u.hp),
            maxHp: u.maxHp,
            state: u.state,
            targetId: u.targetId,
            rangeCenti: u.rangeCenti,
            visionCenti: u.visionCenti,
            dead: u.dead,
          }
        : playerView(u, playerId),
    ),
    events: b.events,
  };
}

function playerView(u: PlayerUnit, playerId: string) {
  const mine = u.owner === playerId;
  return {
    id: u.id,
    side: u.side,
    owner: u.owner,
    mine,
    role: u.role,
    x: round(u.x),
    y: round(u.y),
    hp: Math.ceil(u.hp),
    maxHp: u.maxHp,
    outcome: u.outcome,
    goal: mine ? u.goal : null,
    cargo: u.cargo,
    capacity: u.capacity,
    loading: u.loading,
    shield: u.shieldUntil > 0 ? u.shield : 0,
    hiddenUntil: u.hiddenUntil,
    weapons: u.weapons.map((w) => ({
      effect: w.effect,
      rangeCenti: w.rangeCenti,
      targetId: w.targetId,
    })),
    actives: mine
      ? u.actives.map((a) => ({
          componentId: a.componentId,
          effect: a.effect,
          readyAt: a.readyAt,
          until: a.until,
          rangeCenti: a.rangeCenti,
        }))
      : [],
  };
}
