import { ApiError } from "../api.js";
import type { TerraAction, TerraView } from "../game/types.js";
import type { EmpireAction, EmpirePayload } from "./types.js";

async function call(method: string, path: string, body?: unknown): Promise<unknown> {
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
  const data = (await res.json().catch(() => ({}))) as { error?: string; kind?: string };
  // A refused action comes back with the view: shown, and its error told.
  if (!res.ok && !(res.status === 422 && data.kind === "empire"))
    throw new ApiError(res.status, data.error ?? "unknown");
  return data;
}

export type EmpireAnswer = EmpirePayload & { error?: string };

export const empireApi = {
  /** The world's kind first: a monthly world answers `{ kind: "season" }`. */
  view: () => call("GET", "/api/empire") as Promise<EmpireAnswer | { kind: "season" }>,
  join: () => call("POST", "/api/empire/join", {}) as Promise<EmpireAnswer>,
  act: (a: EmpireAction) => call("POST", "/api/empire/actions", a) as Promise<EmpireAnswer>,
  /** The house's theatre of the Terraferma, as a map (null outside one). */
  terra: () =>
    call("GET", "/api/empire/terra") as Promise<{
      terra: {
        theatre: { id: string; band: number; kind: string; companies: string[] };
        view: TerraView;
      } | null;
    }>,
  roster: (members: string[]) =>
    call("POST", "/api/empire/contesa/roster", { members }) as Promise<EmpireAnswer>,
  /** The Battle (lot T6b): the player's lobby or match, and its orders. */
  battle: () => call("GET", "/api/empire/battle") as Promise<{ battle: BattleState }>,
  battleJoin: () => call("POST", "/api/empire/battle/join", {}) as Promise<{ battle: BattleState }>,
  battleRanking: () =>
    call("GET", "/api/empire/battle/ranking") as Promise<{ ranking: BattleRank[] }>,
  battleLeave: () =>
    call("POST", "/api/empire/battle/leave", {}) as Promise<{ battle: BattleState }>,
  battleAct: (action: TerraAction) =>
    call("POST", "/api/empire/battle/act", { action }) as Promise<{
      ok: boolean;
      battle: BattleState;
    }>,
};

/** The Battle as the player sees it: off, nothing, its lobby, its match live or ended. */
export type BattleState =
  | { phase: "off" }
  | {
      phase: "none" | "lobby";
      minutes: number;
      players: number;
      waiting: number;
      startsAt: number | null;
      /** The player's cote (B3). */
      rating: number;
    }
  | {
      phase: "playing" | "done";
      minutes: number;
      players: number;
      endsAt: number;
      view: TerraView | null;
      result: { pseudo: string | null; bot: boolean; me: boolean; cells: number }[] | null;
      /** The cote at its start, and after its end once moved (B3). */
      rating: number | null;
      ratingAfter: number | null;
    };

/** A line of the Battle's public ranking (B3). */
export interface BattleRank {
  rank: number;
  pseudo: string | null;
  rating: number;
  matches: number;
  me: boolean;
}
