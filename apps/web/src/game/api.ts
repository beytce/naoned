import { ApiError } from "../api.js";
import type {
  Action,
  Catalog,
  CrestData,
  GameResponse,
  PriceSeries,
  Profile,
  RankingRow,
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
  join: (region: string) => call<GameResponse>("POST", "/api/game/join", { region }),
  /** A refused action still returns the fresh view, with `error` set. */
  act: (action: Action) => call<GameResponse>("POST", "/api/game/actions", action),
  profile: () =>
    call<{ account: { pseudo: string | null; crest: CrestData | null }; profile: Profile }>(
      "GET",
      "/api/game/profile",
    ),
  prices: () => call<{ series: PriceSeries }>("GET", "/api/game/prices"),
  ranking: () =>
    call<{ rows: RankingRow[]; me: number | null; total: number }>("GET", "/api/game/ranking"),
};
