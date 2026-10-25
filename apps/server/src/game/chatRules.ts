/**
 * The rules of every thread between merchants (the family's, the company's): short messages, a
 * pace, a word filter, no links, and a message three members report is hidden.
 */
export const MESSAGE_MAX = 280;
export const MESSAGE_GAP_MS = 10_000;
export const MESSAGES_PER_DAY = 50;
export const HIDE_AFTER_REPORTS = 3;
export const THREAD_LENGTH = 50;

/** Words refused in the thread (compared without accents or case, as whole words). */
const REFUSED = [
  "connard",
  "connasse",
  "salope",
  "salaud",
  "pute",
  "putain",
  "encule",
  "enculee",
  "nique",
  "niquer",
  "batard",
  "negre",
  "bougnoule",
  "youpin",
  "pede",
  "tapette",
  "gouine",
  "bite",
  "couille",
  "fdp",
  "ntm",
];

export class ChatError extends Error {
  constructor(
    public readonly code: string,
    public readonly status = 400,
  ) {
    super(code);
  }
}

const plain = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

/** The message as it will be kept (trimmed, spaces collapsed), or why it is refused. */
export function checkMessage(text: string): string {
  const body = text.replace(/\s+/g, " ").trim();
  if (body.length === 0) throw new ChatError("message_empty");
  if (body.length > MESSAGE_MAX) throw new ChatError("message_too_long");
  const words = plain(body).split(/[^a-z0-9]+/);
  if (words.some((w) => REFUSED.includes(w))) throw new ChatError("message_refused");
  if (/https?:|www\.|\.(com|fr|net|org|io|gg)\b/i.test(body)) {
    throw new ChatError("message_refused");
  }
  return body;
}
