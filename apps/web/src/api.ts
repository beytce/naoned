export interface Account {
  id: string;
  email: string;
  pseudo: string | null;
  crest: { shape: string; color: string; symbol: string } | null;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code);
  }
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      credentials: "same-origin",
      headers: body === undefined ? {} : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      // A server that never answers must not leave the game waiting forever.
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    throw new ApiError(0, "network");
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? "unknown");
  return data as T;
}

export const api = {
  me: () => call<{ account: Account }>("GET", "/api/me").then((r) => r.account),
  requestLink: (email: string) => call<void>("POST", "/api/auth/request", { email }),
  verifyCode: (email: string, code: string) =>
    call<{ account: Account }>("POST", "/api/auth/code", { email, code }).then((r) => r.account),
  verify: (token: string) =>
    call<{ account: Account }>("POST", "/api/auth/verify", { token }).then((r) => r.account),
  setPseudo: (pseudo: string) =>
    call<{ account: Account }>("PATCH", "/api/me", { pseudo }).then((r) => r.account),
  setCrest: (crest: { shape: string; color: string; symbol: string }) =>
    call<{ account: Account }>("PATCH", "/api/me", { crest }).then((r) => r.account),
  logout: () => call<void>("POST", "/api/auth/logout"),
  deleteAccount: () => call<void>("DELETE", "/api/me", { confirm: "SUPPRIMER" }),
};

/** Token of a magic link, when the page was opened from one (/connexion?token=…). */
export function tokenFromLocation(location: { pathname: string; search: string }): string | null {
  if (location.pathname !== "/connexion") return null;
  return new URLSearchParams(location.search).get("token");
}
