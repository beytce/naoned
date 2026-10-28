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
    /**
     * The mailbox (`canonicalEmail`): one account each. Null only for an account of before that
     * shared its mailbox with an older one, left for the owner to decide.
     */
    emailCanonical: text("email_canonical"),
    pseudo: text("pseudo"),
    /** The name kept as proposed at the door: the profile offers to change it, once, for free. */
    pseudoDefault: boolean("pseudo_default").notNull().default(false),
    /** Cosmetic coat of arms chosen by the player: { shape, color, symbol }. */
    crest: jsonb("crest").$type<{ shape: string; color: string; symbol: string }>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    /** Computer-run merchant: no mailbox, never logs in, shown with an NPC badge. */
    isBot: boolean("is_bot").notNull().default(false),
    /** Push notification kinds turned off by the player (all on by default). */
    pushOff: jsonb("push_off").$type<string[]>().notNull().default([]),
    /** The Terraferma's rating (Elo, from 1 000), kept from week to week and season to season. */
    terraRating: integer("terra_rating").notNull().default(1000),
    /**
     * Where the account came from, recorded at its creation: the shared link's `ref` (the pseudo
     * of who shared it) and the campaign's `utm_*`, for the launch's measures.
     */
    /** How many times the game asked to notify (the guide's card, then one reminder at most). */
    pushAskCount: integer("push_ask_count").notNull().default(0),
    ref: text("ref"),
    utmSource: text("utm_source"),
    utmMedium: text("utm_medium"),
    utmCampaign: text("utm_campaign"),
    /** The interface's language, for the pushes and the mails (E3-8): "fr" or "en". */
    lang: text("lang").$type<"fr" | "en">().notNull().default("fr"),
    /** The Condotta (E2-5): the highest level open to the account, and the best level won. */
    condottaLevel: integer("condotta_level").notNull().default(1),
    condottaBest: integer("condotta_best").notNull().default(0),
    /** When the account last left a company: it may join another only a week later (E2-8). */
    companyLeftAt: timestamp("company_left_at", { withTimezone: true }),
    /** The Lustre (R6, docs/plan-rupture.md): the rank won in the weekly Sfide, from 0. */
    lustre: integer("lustre").notNull().default(0),
  },
  (t) => [
    uniqueIndex("accounts_email_key").on(t.email),
    uniqueIndex("accounts_email_canonical_key").on(t.emailCanonical),
    uniqueIndex("accounts_pseudo_key").on(sql`lower(${t.pseudo})`),
  ],
);

/**
 * Magic link tokens. Only the SHA-256 hash is stored; a token is single-use. The six-digit code
 * of the same mail is stored as sha256(code:tokenHash), its wrong tries counted (burned at 5).
 */
export const loginTokens = pgTable(
  "login_tokens",
  {
    tokenHash: text("token_hash").primaryKey(),
    email: text("email").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    codeHash: text("code_hash"),
    attempts: integer("attempts").notNull().default(0),
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
 * Engine state of a world: a snapshot, written about once a minute; the commands since are in
 * `world_commands` and replayed on loading (the engine is deterministic). Milestones 4 and 5
 * replace it with relational tables; the journals below are already final.
 */
export const worldStates = pgTable("world_states", {
  worldId: uuid("world_id")
    .primaryKey()
    .references(() => worlds.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  state: jsonb("state").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  /**
   * Server instance allowed to write. A deploy starts the new instance before stopping the old
   * one: the new one takes over here, and the old one stops at its next write.
   */
  owner: text("owner"),
});

/**
 * The commands applied since the last snapshot, one row per saved version (a bot's session is
 * several commands): what loading replays on the snapshot. Written with the ledger, in the same
 * transaction; rows up to the snapshot's version are deleted when it is written.
 */
export const worldCommands = pgTable(
  "world_commands",
  {
    worldId: uuid("world_id")
      .notNull()
      .references(() => worlds.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    /** The time the commands were decided at (ms). */
    at: bigint("at", { mode: "number" }).notNull(),
    commands: jsonb("commands").notNull(),
  },
  (t) => [primaryKey({ columns: [t.worldId, t.version] })],
);

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

/** A week of the Terraferma, one row a merchant: its rank, glory, land and rating after it. */
export const terraResults = pgTable(
  "terra_results",
  {
    worldId: uuid("world_id")
      .notNull()
      .references(() => worlds.id, { onDelete: "cascade" }),
    week: integer("week").notNull(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    rank: integer("rank").notNull(),
    of: integer("of").notNull(),
    glory: integer("glory").notNull(),
    cells: integer("cells").notNull(),
    rating: integer("rating").notNull(),
    /** The week's Signore (always a person: the computer's houses are never it). */
    signore: boolean("signore").notNull().default(false),
    at: timestamp("at", { withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.worldId, t.week, t.accountId] })],
);

/**
 * The Sfide of the Lustre (R6): a week's duel between two merchants (`b`), or against the ghost of
 * a merchant's past week (`ghostAccount`, `ghostWorld`, `ghostWeek`), or against a house of the
 * computer in the world (`b`, a bot: only `a` moves). A challenge (`kind` "challenge") is asked
 * for the next week and plays once accepted. Settled at the week's close: both gains and what the
 * Lustre moved.
 */
export const sfide = pgTable(
  "sfide",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    worldId: uuid("world_id")
      .notNull()
      .references(() => worlds.id, { onDelete: "cascade" }),
    week: integer("week").notNull(),
    kind: text("kind").$type<"ladder" | "challenge">().notNull().default("ladder"),
    a: uuid("a")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    b: uuid("b").references(() => accounts.id, { onDelete: "cascade" }),
    ghostAccount: uuid("ghost_account").references(() => accounts.id, { onDelete: "set null" }),
    ghostWorld: uuid("ghost_world"),
    ghostWeek: integer("ghost_week"),
    stake: integer("stake").notNull().default(0),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    aGain: bigint("a_gain", { mode: "bigint" }),
    bGain: bigint("b_gain", { mode: "bigint" }),
    deltaA: integer("delta_a"),
    deltaB: integer("delta_b"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    settledAt: timestamp("settled_at", { withTimezone: true }),
  },
  (t) => [
    index("sfide_world_week_idx").on(t.worldId, t.week),
    index("sfide_a_idx").on(t.a),
    index("sfide_b_idx").on(t.b),
  ],
);

/**
 * The Atouts an account unlocked by a feat (R3, docs/plan-rupture.md), kept from season to
 * season: a Podestà, a lot won at the incanto, a Signore, the Mercante's rank at the Lustre.
 */
/**
 * The Dynastie (R4, docs/plan-rupture.md): each month a member of the house, a generation of the
 * account's line — its name, its year, the trait it received, those it earned in the month, the
 * heir's trait it left and its epithet. Kept from season to season.
 */
export const generations = pgTable(
  "generations",
  {
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    worldId: uuid("world_id")
      .notNull()
      .references(() => worlds.id, { onDelete: "cascade" }),
    given: text("given").notNull(),
    /** 1450 for the first generation, a year more for each. */
    year: integer("year").notNull(),
    /** The trait received from the generation before. */
    traitIn: text("trait_in"),
    /** The traits earned in the month (set at its close). */
    earned: jsonb("earned").$type<string[]>(),
    /** The trait left to the heir (chosen after the close; the first earned by default). */
    heir: text("heir"),
    epithet: text("epithet"),
    rank: integer("rank"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.accountId, t.worldId] })],
);

/**
 * The Doges (R7, docs/plan-rupture.md): the account elected in a month's last week, for the month
 * it rules (`YYYY-MM`), with its programme — the mutator and the decree of the Republic that hold
 * all that month.
 */
export const doges = pgTable("doges", {
  month: text("month").primaryKey(),
  accountId: uuid("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  /** The world where it was elected. */
  worldId: uuid("world_id").references(() => worlds.id, { onDelete: "set null" }),
  mutator: text("mutator"),
  decree: jsonb("decree").$type<{ code: string; target?: string }>().notNull(),
  votes: integer("votes").notNull(),
  at: timestamp("at", { withTimezone: true }).notNull(),
});

export const accountAtouts = pgTable(
  "account_atouts",
  {
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    /** The feat that unlocked it (the catalog's `unlock`). */
    reason: text("reason").notNull(),
    worldId: uuid("world_id"),
    at: timestamp("at", { withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.accountId, t.code] })],
);

/**
 * A merchant's week, hour by hour: its net sales gained since the week began (deniers, as strings),
 * and its Lustre then. The ghosts of the Sfide are these curves played again.
 */
export const weekCurves = pgTable(
  "week_curves",
  {
    worldId: uuid("world_id")
      .notNull()
      .references(() => worlds.id, { onDelete: "cascade" }),
    week: integer("week").notNull(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    lustre: integer("lustre").notNull(),
    gains: jsonb("gains").$type<string[]>().notNull(),
    /** The week is over: the curve may be a ghost. */
    closed: boolean("closed").notNull().default(false),
  },
  (t) => [primaryKey({ columns: [t.worldId, t.week, t.accountId] })],
);

/**
 * The skirmishes of a world, one row a match: its merchants, ranked or not, and where it stands
 * (open: the lobby; playing; paid: settled by the world's command `terraSkirmishPay`, in the same
 * transaction, glory credited; done: over with no glory credited, a friendly match, a ranked one
 * where no merchant is credited, or one the world refuses to pay; aborted: lost to a restart,
 * nothing paid nor spent).
 */
export const skirmishMatches = pgTable(
  "skirmish_matches",
  {
    id: uuid("id").primaryKey(),
    worldId: uuid("world_id")
      .notNull()
      .references(() => worlds.id, { onDelete: "cascade" }),
    players: text("players").array().notNull(),
    ranked: boolean("ranked").notNull().default(false),
    status: text("status").notNull(),
    openedAt: timestamp("opened_at", { withTimezone: true }).notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    endedAt: timestamp("ended_at", { withTimezone: true }),
  },
  (t) => [
    index("skirmish_matches_world_status").on(t.worldId, t.status),
    check(
      "skirmish_matches_status",
      sql`${t.status} in ('open', 'playing', 'paid', 'done', 'aborted')`,
    ),
  ],
);

/**
 * Final ranking of a season (people only): rank among people (by net sales), net sales and net
 * worth, reward tier and renown
 * earned. `seenAt` is set once the player has watched the closing ceremony.
 */
export const seasonResults = pgTable(
  "season_results",
  {
    worldId: uuid("world_id")
      .notNull()
      .references(() => worlds.id, { onDelete: "cascade" }),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    rank: integer("rank").notNull(),
    players: integer("players").notNull(),
    worth: bigint("worth", { mode: "bigint" }).notNull(),
    /** Net sales of the season (sales less purchases), which rank it; absent before them. */
    turnover: bigint("turnover", { mode: "bigint" }),
    /** The best net sales of the season, which the level counts; absent before them. */
    turnoverPeak: bigint("turnover_peak", { mode: "bigint" }),
    /** doge, podium, top10, elite, notable, participant or none. */
    tier: text("tier").notNull(),
    /** Title held at the close (season milestone); its renown is included in `renown`. */
    milestone: text("milestone").notNull().default("peddler"),
    /** Renown of the tier plus that of the milestone. */
    renown: integer("renown").notNull(),
    seenAt: timestamp("seen_at", { withTimezone: true }),
  },
  (t) => [primaryKey({ columns: [t.worldId, t.accountId] })],
);

/**
 * Pass Négociant: periods during which an account holds it. Bought (later, through a payment
 * provider), won in the rankings (weekly top 10, season tiers) or granted by an admin.
 */
export const passGrants = pgTable(
  "pass_grants",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    /** purchase, weekly_top10, season, admin. */
    source: text("source").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("pass_grants_account_idx").on(t.accountId, t.endsAt)],
);

/**
 * The house between seasons (docs/plan-progression.md): its Influence, a signed journal kept from
 * season to season — earned (+) by net sales, the campaign and the season's tier, spent (−) on
 * patents. The balance is the sum; the patents held are its `patent` lines. `key` makes each line
 * unique per account (`<world>:<source>:<week>`, `patent:<code>`), so nothing is counted twice.
 */
export const influenceEntries = pgTable(
  "influence_entries",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    /** The world it was earned or spent in; kept when the world goes. */
    worldId: uuid("world_id").references(() => worlds.id, { onDelete: "set null" }),
    /** commerce, campaign, season, mission, spend, patent or refund (a privilege withdrawn, paid back). */
    source: text("source").notNull(),
    week: integer("week"),
    amount: integer("amount").notNull(),
    /** The patent bought. */
    patent: text("patent"),
    key: text("key").notNull(),
    at: timestamp("at", { withTimezone: true }).notNull(),
  },
  (t) => [uniqueIndex("influence_entries_key").on(t.accountId, t.key)],
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

/** The family's thread: short messages between members of a patrician family, per world. */
export const familyMessages = pgTable(
  "family_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    worldId: uuid("world_id")
      .notNull()
      .references(() => worlds.id, { onDelete: "cascade" }),
    family: text("family").notNull(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    /** Hidden after enough reports, or by an admin. */
    hidden: boolean("hidden").notNull().default(false),
  },
  (t) => [
    index("family_messages_thread_idx").on(t.worldId, t.family, t.createdAt),
    index("family_messages_author_idx").on(t.accountId, t.createdAt),
  ],
);

/** A member's report of a message of the family's thread (once per member). */
export const messageReports = pgTable(
  "message_reports",
  {
    messageId: uuid("message_id")
      .notNull()
      .references(() => familyMessages.id, { onDelete: "cascade" }),
    reporterId: uuid("reporter_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.messageId, t.reporterId] })],
);

/**
 * The way in, counted without anyone in it (E3-2 of the experts, 25 October 2026): per day of
 * Paris, step and campaign source ('' for none), how many went through. No account, no address,
 * no cookie: counters only.
 */
export const funnelCounts = pgTable(
  "funnel_counts",
  {
    day: text("day").notNull(),
    step: text("step").notNull(),
    source: text("source").notNull().default(""),
    count: integer("count").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.day, t.step, t.source] })],
);

/**
 * A company (E2-8 of the experts, 25 October 2026): two to six friends, at the layer of the
 * accounts (no world_id), so it outlives the months. No treasury, no power over the trade: a
 * thread, a call to skirmish together, a shared record, a mark on the Terraferma's map.
 */
export const companies = pgTable(
  "companies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    /** The code of the invitation link (`/?co=<code>`). */
    code: text("code").notNull(),
    createdBy: uuid("created_by").references(() => accounts.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    /** The call to skirmish a member chose for the company, and who chose it. */
    callAt: timestamp("call_at", { withTimezone: true }),
    callBy: uuid("call_by").references(() => accounts.id, { onDelete: "set null" }),
  },
  (t) => [
    uniqueIndex("companies_code_key").on(t.code),
    uniqueIndex("companies_name_key").on(sql`lower(${t.name})`),
  ],
);

/** A member of a company: one company per account at most. */
export const companyMembers = pgTable(
  "company_members",
  {
    accountId: uuid("account_id")
      .primaryKey()
      .references(() => accounts.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("company_members_company_idx").on(t.companyId)],
);

/** The company's thread, under the same rules as every thread (`chatRules.ts`). */
export const companyMessages = pgTable(
  "company_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    /** Hidden after enough reports, or by an admin. */
    hidden: boolean("hidden").notNull().default(false),
  },
  (t) => [
    index("company_messages_thread_idx").on(t.companyId, t.createdAt),
    index("company_messages_author_idx").on(t.accountId, t.createdAt),
  ],
);

/** A member's report of a message of the company's thread (once per member). */
export const companyMessageReports = pgTable(
  "company_message_reports",
  {
    messageId: uuid("message_id")
      .notNull()
      .references(() => companyMessages.id, { onDelete: "cascade" }),
    reporterId: uuid("reporter_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.messageId, t.reporterId] })],
);
