/** What the server pushes: fetch the view again (now, or when convenient on the minute's tick). */
export interface LiveMessage {
  type: "changed" | "tick";
  version: number;
}

/**
 * The game's open line to the server (`/api/live`): messages as they come, reconnecting after a
 * cut (a deploy, a tunnel, a phone asleep) a little later each time, up to a minute.
 */
export function connectLive(
  onMessage: (message: LiveMessage) => void,
  onOpen: (open: boolean) => void,
): () => void {
  let socket: WebSocket | null = null;
  let closed = false;
  let delay = 1_000;
  let retry: ReturnType<typeof setTimeout> | undefined;

  const connect = () => {
    if (closed || typeof WebSocket === "undefined") return;
    const url = new URL("/api/live", window.location.href);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    socket = new WebSocket(url);
    socket.onopen = () => {
      delay = 1_000;
      onOpen(true);
    };
    socket.onmessage = (event) => {
      try {
        onMessage(JSON.parse(String(event.data)) as LiveMessage);
      } catch {
        // Not for us.
      }
    };
    socket.onclose = (event) => {
      onOpen(false);
      socket = null;
      // No session: polling will find out and log out.
      if (closed || event.code === 4401) return;
      retry = setTimeout(connect, delay);
      delay = Math.min(60_000, delay * 2);
    };
  };
  connect();
  return () => {
    closed = true;
    if (retry) clearTimeout(retry);
    socket?.close();
  };
}
