import { ApiError } from "../api.js";
import type {
  Action,
  Catalog,
  CrestData,
  GameResponse,
  GuildMessage,
  Notice,
  NotificationKind,
  Palmares,
  PriceSeries,
  Profile,
  PushSettings,
  RankingRow,
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
  return data as T;
}

export const gameApi = {
  catalog: () => call<Catalog>("GET", "/api/game/catalog"),
  view: () => call<GameResponse>("GET", "/api/game"),
  /** Restart from scratch (once per season). */
  reset: () => call<GameResponse>("POST", "/api/game/reset", {}),
  join: (region: string) => call<GameResponse>("POST", "/api/game/join", { region }),
  /** A refused action still returns the fresh view, with `error` set. */
  act: (action: Action) => call<GameResponse>("POST", "/api/game/actions", action),
  profile: () =>
    call<{
      account: { pseudo: string | null; crest: CrestData | null };
      profile: Profile;
      palmares: Palmares;
    }>("GET", "/api/game/profile"),
  palmares: (accountId: string) =>
    call<{ pseudo: string | null; crest: CrestData | null; bot: boolean; palmares: Palmares }>(
      "GET",
      `/api/game/palmares/${accountId}`,
    ),
  ceremonySeen: (worldId: string) =>
    call<{ ok: true }>("POST", "/api/game/ceremony/seen", { worldId }),
  prices: () => call<{ series: PriceSeries }>("GET", "/api/game/prices"),
  guildThread: () =>
    call<{ guild: string; messages: GuildMessage[] }>("GET", "/api/game/guild/messages"),
  sayToGuild: (body: string) =>
    call<{ guild: string; messages: GuildMessage[] }>("POST", "/api/game/guild/messages", {
      body,
    }),
  reportMessage: (id: string) =>
    call<{ ok: true }>("POST", `/api/game/guild/messages/${id}/report`, {}),
  notifications: () => call<{ items: Notice[]; unread: number }>("GET", "/api/notifications"),
  markRead: () => call<{ ok: true }>("POST", "/api/notifications/read", {}),
  pushSettings: () => call<PushSettings>("GET", "/api/notifications/push"),
  setPushOff: (off: NotificationKind[]) =>
    call<{ off: NotificationKind[] }>("PATCH", "/api/notifications/push", { off }),
  subscribe: (sub: PushSubscriptionJSON) =>
    call<{ ok: true }>("POST", "/api/notifications/push/subscribe", sub),
  unsubscribe: (endpoint: string) =>
    call<{ ok: true }>("POST", "/api/notifications/push/unsubscribe", { endpoint }),
  weekRanking: () => call<WeekRanking>("GET", "/api/game/ranking/week"),
  ranking: () =>
    call<{ rows: RankingRow[]; me: number | null; total: number }>("GET", "/api/game/ranking"),
};
