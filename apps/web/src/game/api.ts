import { ApiError } from "../api.js";
import { fr } from "../i18n.js";
import { pushOpened } from "./shortcut.js";
import type {
  Action,
  CanalView,
  Catalog,
  CompanyInvitation,
  CompanyView,
  CondottaStatus,
  CrestData,
  DashboardView,
  DynastyView,
  ElectionView,
  FamilyMessage,
  GameResponse,
  HouseView,
  JournalEntry,
  Level,
  Notice,
  NotificationKind,
  Palmares,
  PriceSeries,
  Profile,
  PushSettings,
  RankingRow,
  SfidaView,
  SignoriaView,
  SkirmishStatus,
  Spend,
  SuppliersView,
  TerraAction,
  TerraView,
  WeekRanking,
} from "./types.js";

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      credentials: "same-origin",
      headers: body === undefined ? {} : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "network");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok && !(res.status === 422 && data.view)) {
    throw new ApiError(res.status, data.error ?? "unknown");
  }
  return serverWords(data) as T;
}

/** Fields written by players, never translated (a name, a message, a company's own name). */
const PLAYERS_WORDS = new Set([
  "pseudo",
  "body",
  "counterpartyName",
  "email",
  "company",
  "messages",
]);

/**
 * The server's own French names (titles, tiers, badges, renown) in the interface's language: an
 * exact name of the list is replaced wherever it comes; the players' words are left alone.
 */
export function serverWords(data: unknown, words = fr.serverNames): unknown {
  if (Object.keys(words).length === 0) return data;
  const walk = (v: unknown): unknown => {
    if (typeof v === "string") return words[v] ?? v;
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") {
      return Object.fromEntries(
        Object.entries(v).map(([k, x]) => [k, PLAYERS_WORDS.has(k) ? x : walk(x)]),
      );
    }
    return v;
  };
  return walk(data);
}

/** The push the game was opened from, told once with the first load (for the measures). */
let opened = typeof window === "undefined" ? null : pushOpened(window.location.search);
function openedOnce(): string {
  const kind = opened;
  opened = null;
  return kind ? `?opened=${kind}` : "";
}

export const gameApi = {
  catalog: () => call<Catalog>("GET", "/api/game/catalog"),
  view: () => call<GameResponse>("GET", `/api/game${openedOnce()}`),
  /** Restart from scratch (once per season). */
  reset: () => call<GameResponse>("POST", "/api/game/reset", {}),
  join: (region: string, given?: string) =>
    call<GameResponse>("POST", "/api/game/join", { region, ...(given ? { given } : {}) }),
  /** The Grand Canal (R5): public, signed in or not. */
  canal: () => call<CanalView>("GET", "/api/canal"),
  /** The Doge's election (R7): candidates, programmes, voices. */
  election: () => call<ElectionView | null>("GET", "/api/game/election"),
  vote: (candidate: string, boost: number) =>
    call<ElectionView>("POST", "/api/game/election/vote", { candidate, boost }),
  /** The Dynastie (R4): the house's line, the heir to name, the names offered. */
  dynasty: () => call<DynastyView | null>("GET", "/api/game/dynasty"),
  heir: (trait: string) => call<DynastyView | null>("POST", "/api/game/heir", { trait }),
  /** A refused action still returns the fresh view, with `error` set. */
  act: (action: Action) => call<GameResponse>("POST", "/api/game/actions", action),
  profile: () =>
    call<{
      account: { pseudo: string | null; crest: CrestData | null };
      profile: Profile;
      level?: Level;
      palmares: Palmares;
      /** The Condotta's best level won and its grade (null before a first win). */
      condotta?: { best: number; level: number; grade: string } | null;
      terra?: {
        rating: number;
        weeks: {
          week: number;
          rank: number;
          of: number;
          glory: number;
          cells: number;
          rating: number;
          at: number;
        }[];
      };
    }>("GET", "/api/game/profile"),
  palmares: (accountId: string) =>
    call<{ pseudo: string | null; crest: CrestData | null; bot: boolean; palmares: Palmares }>(
      "GET",
      `/api/game/palmares/${accountId}`,
    ),
  ceremonySeen: (worldId: string) =>
    call<{ ok: true }>("POST", "/api/game/ceremony/seen", { worldId }),
  prices: () => call<{ days: number; series: PriceSeries }>("GET", "/api/game/prices"),
  company: () => call<CompanyView>("GET", "/api/company"),
  foundCompany: (name: string) => call<CompanyView>("POST", "/api/company", { name }),
  invitation: (code: string) =>
    call<CompanyInvitation>("GET", `/api/company/invitation/${encodeURIComponent(code)}`),
  joinCompany: (code: string) => call<CompanyView>("POST", "/api/company/join", { code }),
  leaveCompany: () => call<CompanyView>("POST", "/api/company/leave", {}),
  inviteShared: () => call<{ ok: true }>("POST", "/api/company/invite", {}),
  callCompany: () => call<CompanyView>("POST", "/api/company/call", {}),
  companyThread: () => call<{ messages: FamilyMessage[] }>("GET", "/api/company/messages"),
  sayToCompany: (body: string) =>
    call<{ messages: FamilyMessage[] }>("POST", "/api/company/messages", { body }),
  reportCompanyMessage: (id: string) =>
    call<{ ok: true }>("POST", `/api/company/messages/${id}/report`, {}),
  familyThread: () =>
    call<{ family: string; messages: FamilyMessage[] }>("GET", "/api/game/family/messages"),
  sayToFamily: (body: string) =>
    call<{ family: string; messages: FamilyMessage[] }>("POST", "/api/game/family/messages", {
      body,
    }),
  reportMessage: (id: string) =>
    call<{ ok: true }>("POST", `/api/game/family/messages/${id}/report`, {}),
  notifications: () => call<{ items: Notice[]; unread: number }>("GET", "/api/notifications"),
  markRead: () => call<{ ok: true }>("POST", "/api/notifications/read", {}),
  pushSettings: () => call<PushSettings>("GET", "/api/notifications/push"),
  setPushOff: (off: NotificationKind[]) =>
    call<{ off: NotificationKind[] }>("PATCH", "/api/notifications/push", { off }),
  /** The game asked to notify: the answer, for the measures. */
  pushAsk: (accepted: boolean, ios: boolean) =>
    call<void>("POST", "/api/game/push-ask", { accepted, ios }),
  subscribe: (sub: PushSubscriptionJSON) =>
    call<{ ok: true }>("POST", "/api/notifications/push/subscribe", sub),
  unsubscribe: (endpoint: string) =>
    call<{ ok: true }>("POST", "/api/notifications/push/unsubscribe", { endpoint }),
  house: () => call<HouseView>("GET", "/api/house"),
  buyPatent: (patent: string) =>
    call<{ influence: number; patents: string[] }>("POST", "/api/house/patents", { patent }),
  spend: (spend: Spend) => call<GameResponse>("POST", "/api/house/spend", spend),
  /** The Terraferma's week (null while it is not live in this world). */
  terra: () => call<{ terra: TerraView | null }>("GET", "/api/game/terra"),
  weekRanking: () => call<WeekRanking>("GET", "/api/game/ranking/week"),
  terraReplay: () =>
    call<{
      replay: {
        startAt: number;
        holders: { id: string | null; me: boolean; nation: string | null; pseudo: string | null }[];
        initial: number[];
        steps: [number, number, number][];
      } | null;
    }>("GET", "/api/game/terra/replay"),
  condotta: () => call<CondottaStatus>("GET", "/api/game/condotta"),
  condottaOpen: (company: boolean) =>
    call<{ ok: boolean }>("POST", "/api/game/condotta/open", { company }),
  condottaJoin: (lobby: string) =>
    call<{ ok: boolean }>("POST", "/api/game/condotta/join", { lobby }),
  condottaAct: (a: TerraAction) => call<{ ok: boolean }>("POST", "/api/game/condotta/act", a),
  skirmish: () => call<SkirmishStatus>("GET", "/api/game/skirmish"),
  skirmishJoin: () => call<{ ok: boolean }>("POST", "/api/game/skirmish/join"),
  skirmishAct: (a: TerraAction) => call<{ ok: boolean }>("POST", "/api/game/skirmish/act", a),
  suppliers: () => call<SuppliersView>("GET", "/api/game/suppliers"),
  signoria: () => call<SignoriaView>("GET", "/api/game/signoria"),
  sfida: () => call<SfidaView>("GET", "/api/game/sfida"),
  challenge: (to: string, stake: number) =>
    call<SfidaView>("POST", "/api/game/sfida/challenge", { to, stake }),
  acceptChallenge: (id: string) => call<SfidaView>("POST", "/api/game/sfida/accept", { id }),
  dashboard: () => call<DashboardView>("GET", "/api/game/dashboard"),
  journal: () => call<{ entries: JournalEntry[] }>("GET", "/api/game/journal"),
  ranking: () =>
    call<{ rows: RankingRow[]; me: number | null; total: number }>("GET", "/api/game/ranking"),
};
