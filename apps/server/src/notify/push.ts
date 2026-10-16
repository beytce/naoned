import webpush from "web-push";

export interface PushTarget {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** The browsers' push services (Chrome, Firefox, Edge, Safari): the only hosts a push is sent to. */
const PUSH_HOSTS = [
  /^fcm\.googleapis\.com$/,
  /^[a-z0-9-]+\.push\.services\.mozilla\.com$/,
  /^[a-z0-9-]+\.notify\.windows\.com$/,
  /^web\.push\.apple\.com$/,
  /^[a-z0-9-]+\.push\.apple\.com$/,
];

/**
 * Whether the server may send pushes to this address: HTTPS on the default port, to a known push
 * service. Anything else would let a player aim the server at an internal address.
 */
export function isPushEndpoint(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.port !== "" || url.username || url.password) return false;
  return PUSH_HOSTS.some((h) => h.test(url.hostname));
}

/** Sends Web Push messages. `gone` means the subscription no longer exists (to be deleted). */
export interface Pusher {
  readonly publicKey: string | null;
  send(target: PushTarget, payload: string): Promise<"ok" | "gone" | "failed">;
}

export class WebPusher implements Pusher {
  constructor(
    readonly publicKey: string,
    privateKey: string,
    subject: string,
  ) {
    webpush.setVapidDetails(subject, publicKey, privateKey);
  }

  async send(target: PushTarget, payload: string) {
    try {
      await webpush.sendNotification(
        { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
        payload,
        { TTL: 6 * 3600 },
      );
      return "ok" as const;
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      return status === 404 || status === 410 ? ("gone" as const) : ("failed" as const);
    }
  }
}

/** Push turned off (no VAPID keys): in-game notifications only. */
export class NoPusher implements Pusher {
  readonly publicKey = null;
  async send() {
    return "failed" as const;
  }
}

/** For tests: keeps what would have been sent. */
export class MemoryPusher implements Pusher {
  readonly publicKey = "test-public-key";
  sent: { target: PushTarget; payload: Record<string, unknown> }[] = [];
  gone = new Set<string>();

  async send(target: PushTarget, payload: string) {
    if (this.gone.has(target.endpoint)) return "gone" as const;
    this.sent.push({ target, payload: JSON.parse(payload) });
    return "ok" as const;
  }
}
