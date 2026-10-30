import { ApiError } from "../api.js";
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
};
