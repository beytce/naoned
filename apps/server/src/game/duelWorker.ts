/** A worker of the pool of duels (docs/plan-socle.md A3): it plays what it is sent. */
import { parentPort } from "node:worker_threads";
import { type DuelJob, type ThinkJob, playDuel, thinkPiece } from "./duels.js";

parentPort?.on("message", (m: { id: number; job?: DuelJob; think?: ThinkJob }) => {
  let result: unknown;
  try {
    result = m.think ? thinkPiece(m.think) : m.job ? playDuel(m.job) : "error";
  } catch {
    result = "error";
  }
  parentPort?.postMessage({ id: m.id, result });
});
