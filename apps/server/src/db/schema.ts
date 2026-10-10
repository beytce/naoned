import { sql } from "drizzle-orm";
import {
  bigint,
  bigserial,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Account layer: permanent, shared by every world. Game tables (world layer) come with
 * milestones 3 to 5 and all carry a world_id.
 */
export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    pseudo: text("pseudo"),
    /** Cosmetic coat of arms chosen by the player: { shape, color, symbol }. */
    crest: jsonb("crest").$type<{ shape: string; color: string; symbol: string }>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    /** Computer-run merchant: no mailbox, never logs in, shown with an NPC badge. */
    isBot: boolean("is_bot").notNull().default(false),
    /** Push notification kinds turned off by the player (all on by default). */
    pushOff: jsonb("push_off").$type<string[]>().notNull().default([]),
  },
  (t) => [
    uniqueIndex("accounts_email_key").on(t.email),
    uniqueIndex("accounts_pseudo_key").on(sql`lower(${t.pseudo})`),
  ],
);

/** Magic link tokens. Only the SHA-256 hash is stored; a token is single-use. */
export const loginTokens = pgTable(
  "login_tokens",
  {
    tokenHash: text("token_hash").primaryKey(),
    email: text("email").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
  },
  (t) => [index("login_tokens_email_idx").on(t.email, t.createdAt)],
);

/** Browser sessions. Only the SHA-256 hash of the cookie value is stored. */
export const sessions = pgTable(
  "sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("sessions_account_idx").on(t.accountId)],
);

/** A world is one season. Its balancing lives in `settings` (JSON), never in code. */
export const worlds = pgTable("worlds", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  theme: text("theme").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  status: text("status").notNull().default("open"),
  settings: jsonb("settings").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Engine state of a world, saved after every command (milestone 3). Milestones 4 and 5 replace
 * it with relational tables; the journals below are already final.
 */
export const worldStates = pgTable("world_states", {
  worldId: uuid("world_id")
    .primaryKey()
    .references(() => worlds.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  state: jsonb("state").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const players = pgTable(
  "players",
  {
    worldId: uuid("world_id")
      .notNull()
      .references(() => worlds.id, { onDelete: "cascade" }),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    region: text("region").notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull(),
    tutorialSteps: jsonb("tutorial_steps").$type<string[]>().notNull().default([]),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    /** For a bot: its play style (engine profile). */
    botProfile: text("bot_profile"),
    /** A bot steps aside when enough people play: it stops playing and leaves the rankings. */
    retiredAt: timestamp("retired_at", { withTimezone: true }),
  },
  (t) => [primaryKey({ columns: [t.worldId, t.accountId] })],
);

/** Double-entry ledger: every money movement, written in the same transaction as the state. */
export const ledgerEntries = pgTable(
  "ledger_entries",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    worldId: uuid("world_id")
      .notNull()
      .references(() => worlds.id, { onDelete: "cascade" }),
    fromAccount: text("from_account").notNull(),
    toAccount: text("to_account").notNull(),
    amount: bigint("amount", { mode: "bigint" }).notNull(),
    reason: text("reason").notNull(),
    ref: text("ref"),
    at: timestamp("at", { withTimezone: true }).notNull(),
  },
  (t) => [
    index("ledger_entries_world_idx").on(t.worldId, t.at),
    check("ledger_entries_amount_positive", sql`${t.amount} > 0`),
  ],
);

export const stockMovements = pgTable(
  "stock_movements",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    worldId: uuid("world_id")
      .notNull()
      .references(() => worlds.id, { onDelete: "cascade" }),
    playerId: text("player_id").notNull(),
    resource: text("resource").notNull(),
    quantity: integer("quantity").notNull(),
    reason: text("reason").notNull(),
    ref: text("ref"),
    at: timestamp("at", { withTimezone: true }).notNull(),
  },
  (t) => [index("stock_movements_world_idx").on(t.worldId, t.playerId, t.resource)],
);

export const trades = pgTable(
  "trades",
  {
    worldId: uuid("world_id")
      .notNull()
      .references(() => worlds.id, { onDelete: "cascade" }),
    id: text("id").notNull(),
    resource: text("resource").notNull(),
    price: bigint("price", { mode: "bigint" }).notNull(),
    quantity: integer("quantity").notNull(),
    buyerId: text("buyer_id").notNull(),
    sellerId: text("seller_id").notNull(),
    buyOrderId: text("buy_order_id").notNull(),
    sellOrderId: text("sell_order_id").notNull(),
    tax: bigint("tax", { mode: "bigint" }).notNull(),
    at: timestamp("at", { withTimezone: true }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.worldId, t.id] }),
    index("trades_world_resource_idx").on(t.worldId, t.resource, t.at),
  ],
);

/** Closed weeks of the weekly ranking: gain of net worth, rank, and cosmetic award (people only). */
export const weeklyResults = pgTable(
  "weekly_results",
  {
    worldId: uuid("world_id")
      .notNull()
      .references(() => worlds.id, { onDelete: "cascade" }),
    week: integer("week").notNull(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    rank: integer("rank").notNull(),
    gain: bigint("gain", { mode: "bigint" }).notNull(),
    /** doge, procurator or senator for the three best people; null otherwise (and for bots). */
    award: text("award"),
  },
  (t) => [primaryKey({ columns: [t.worldId, t.week, t.accountId] })],
);

/** In-game notifications (the bell); some are also pushed to the player's devices. */
export const notifications = pgTable(
  "notifications",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    worldId: uuid("world_id")
      .notNull()
      .references(() => worlds.id, { onDelete: "cascade" }),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    data: jsonb("data").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    pushedAt: timestamp("pushed_at", { withTimezone: true }),
  },
  (t) => [index("notifications_account_idx").on(t.accountId, t.createdAt)],
);

/** Web Push subscriptions (one per device and browser). */
export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    endpoint: text("endpoint").primaryKey(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("push_subscriptions_account_idx").on(t.accountId)],
);

/** Analytics events (KPIs). Account layer: survives the end of a world. */
export const telemetry = pgTable(
  "telemetry",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    accountId: uuid("account_id"),
    worldId: uuid("world_id"),
    type: text("type").notNull(),
    at: timestamp("at", { withTimezone: true }).notNull(),
    props: jsonb("props"),
  },
  (t) => [index("telemetry_type_idx").on(t.type, t.at)],
);
