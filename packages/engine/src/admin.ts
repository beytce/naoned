import { regionSeat, revealedBy, settlePost } from "./empire/map.js";
import { empireSettings, ownHouse, settleBuilds } from "./empire/house.js";
import type { Deniers } from "./money.js";
import { type PlayerId, SINK_ACCOUNT, SOURCE_ACCOUNT, cashAccount } from "./state.js";
import { type Tx, addStock, emit, fail, inventoryLine, nextId, removeStock, transfer } from "./tx.js";

/**
 * The admin's hand on a merchant (tests, support): sets a value outright instead of earning it.
 * Money and goods still move through the journals (from the source, to the sink), so the
 * invariants hold; the rest is the house's own state, set within the settings' bounds. Nothing
 * here is reachable by a merchant: the server sends it only for an admin's request.
 */
export type AdminEdit =
  /** The merchant's cash, set to this many deniers (a string: JSON knows no bigint). */
  | { kind: "cash"; deniers: string }
  /** A good's available stock, set to this quantity. */
  | { kind: "stock"; good: string; qty: number }
  /** The Casa's level (the house's level). */
  | { kind: "casa"; level: number }
  /** The house's counts: those given are set. */
  | { kind: "house"; favour?: number; seals?: number; heritage?: number; merit?: number }
  | { kind: "workshop"; workshopId: string; level: number }
  /** A counter's level in a region beyond Venetia (put down on the region's seat if none). */
  | { kind: "counter"; region: string; level: number }
  | { kind: "vehicleLevel"; vehicleType: string; level: number }
  /** A vehicle of this model, given. */
  | { kind: "vehicle"; vehicleType: string }
  | { kind: "module"; code: string; level: number }
  | { kind: "knowledge"; code: string; learnt: boolean }
  | { kind: "staffLevel"; staffId: string; level: number }
  /** Every site, research, learning, night queue and voyage of the house ends now. */
  | { kind: "finish" }
  /** The whole map seen. */
  | { kind: "revealMap" }
  /** The Arsenal, the Campo or the Remise stands at once, on the first fitting cell of Venetia. */
  | { kind: "site"; site: "arsenal" | "camp" | "depot" };

export type AdminCommand = { type: "adminEdit"; playerId: PlayerId; edit: AdminEdit };

const HOME = "veneto";

function whole(n: number, min: number, max: number): number {
  if (!Number.isInteger(n) || n < min || n > max) fail("invalid_quantity");
  return n;
}

function setCash(tx: Tx, playerId: PlayerId, target: Deniers): void {
  if (target < 0n) fail("invalid_quantity");
  const account = cashAccount(playerId);
  const now = tx.s.accounts[account] ?? 0n;
  if (target > now) transfer(tx, SOURCE_ACCOUNT, account, target - now, "admin_adjust");
  else if (target < now) transfer(tx, account, SINK_ACCOUNT, now - target, "admin_adjust");
}

function setStock(tx: Tx, playerId: PlayerId, good: string, qty: number): void {
  if (!tx.ctx.theme.resources.some((r) => r.code === good)) fail("unknown_resource");
  whole(qty, 0, 1_000_000_000);
  const have = inventoryLine(tx, playerId, good).available;
  if (qty > have) addStock(tx, playerId, good, qty - have, "admin_adjust");
  else if (qty < have) removeStock(tx, playerId, good, have - qty, "admin_adjust");
}

export function applyAdmin(tx: Tx, cmd: AdminCommand): void {
  const { playerId, edit } = cmd;
  if (!tx.s.players[playerId]) fail("unknown_player");
  if (edit.kind === "cash") {
    if (!/^\d{1,18}$/.test(edit.deniers)) fail("invalid_quantity");
    setCash(tx, playerId, BigInt(edit.deniers));
  } else if (edit.kind === "stock") {
    setStock(tx, playerId, edit.good, edit.qty);
  } else {
    editHouse(tx, playerId, edit);
  }
  emit(tx, "admin_edit", playerId, { kind: edit.kind });
}

function editHouse(tx: Tx, playerId: PlayerId, edit: AdminEdit): void {
  const s = empireSettings(tx.ctx);
  const h = ownHouse(tx, playerId);
  settleBuilds(h, tx.now);
  switch (edit.kind) {
    case "casa":
      h.casa = whole(edit.level, 1, s.casa.length);
      break;
    case "house":
      if (edit.favour !== undefined) h.favour = whole(edit.favour, 0, 1e9);
      if (edit.seals !== undefined) h.seals = whole(edit.seals, 0, 1e9);
      if (edit.heritage !== undefined) h.heritage = whole(edit.heritage, 0, 1e6);
      if (edit.merit !== undefined) h.merit = whole(edit.merit, 0, 1e9);
      break;
    case "workshop": {
      const w = h.workshops.find((x) => x.id === edit.workshopId);
      if (!w) fail("unknown_building");
      w.level = whole(edit.level, 1, s.workshops.maxLevel);
      break;
    }
    case "counter": {
      const r = s.regions.find((x) => x.code === edit.region);
      if (!r || r.code === HOME) fail("unknown_region");
      const level = whole(edit.level, 1, s.counters.maxLevel);
      const seat = regionSeat(s, r.code);
      if (!h.counters?.[r.code] && seat && Object.keys(s.map.cells).length > 0)
        settlePost(h, seat, r.code, revealedBy(seat, s));
      h.counters = { ...(h.counters ?? {}), [r.code]: level };
      break;
    }
    case "vehicleLevel":
      if (!s.vehicles[edit.vehicleType]) fail("unknown_vehicle");
      h.vehicleLevels = {
        ...(h.vehicleLevels ?? {}),
        [edit.vehicleType]: whole(edit.level, 1, s.vehicleLevels.max),
      };
      break;
    case "vehicle":
      if (!s.vehicles[edit.vehicleType]) fail("unknown_vehicle");
      h.vehicles = [
        ...(h.vehicles ?? []),
        { id: nextId(tx, "v"), type: edit.vehicleType, busyUntil: 0 },
      ];
      break;
    case "module": {
      if (!s.modules.some((m) => m.code === edit.code)) fail("unknown_choice");
      const level = whole(edit.level, 0, s.research.minutes.length);
      const modules = { ...(h.modules ?? {}) };
      if (level === 0) delete modules[edit.code];
      else modules[edit.code] = level;
      h.modules = modules;
      break;
    }
    case "knowledge": {
      const known = s.knowledge.branches.some((b) =>
        [...b.nodes, ...b.capstones].some((n) => n.code === edit.code),
      );
      if (!known) fail("unknown_choice");
      const rest = (h.knowledge ?? []).filter((c) => c !== edit.code);
      h.knowledge = edit.learnt ? [...rest, edit.code] : rest;
      h.learning = (h.learning ?? []).filter((l) => l.code !== edit.code);
      break;
    }
    case "staffLevel": {
      const m = (h.staff ?? []).find((x) => x.id === edit.staffId);
      if (!m) fail("unknown_target");
      m.level = whole(edit.level, 1, s.staff.maxLevel);
      m.xp = 0;
      break;
    }
    case "finish": {
      for (const b of h.builds) b.endsAt = Math.min(b.endsAt, tx.now);
      for (const r of h.research ?? []) r.endsAt = Math.min(r.endsAt, tx.now);
      for (const l of h.learning ?? []) l.endsAt = Math.min(l.endsAt, tx.now);
      settleBuilds(h, tx.now);
      for (const w of h.workshops)
        if (w.job) w.job.startedAt = Math.min(w.job.startedAt, tx.now - w.job.batches * w.job.batchMs);
      for (const v of tx.s.empire?.voyages ?? [])
        if (v.house === playerId) v.arrivesAt = Math.min(v.arrivesAt, tx.now);
      for (const v of h.vehicles ?? []) v.busyUntil = Math.min(v.busyUntil, tx.now);
      break;
    }
    case "revealMap":
      h.revealed = Object.keys(s.map.cells).sort();
      h.mapVersion = s.map.version;
      break;
    case "site": {
      const def = s.map[edit.site];
      if (!def) fail("unknown_building_type");
      if (h[edit.site]) fail("built");
      const cells = Object.entries(s.map.cells).filter(
        ([, c]) => c.region === HOME && (edit.site !== "arsenal" || c.coast),
      );
      const taken = new Set([h.arsenal, h.camp, h.depot, ...(h.posts ?? []).map((p) => p.cell)]);
      const cell = (cells.find(([k]) => !taken.has(k)) ?? cells[0])?.[0];
      if (!cell) fail("unknown_cell");
      h[edit.site] = cell;
      break;
    }
  }
}

