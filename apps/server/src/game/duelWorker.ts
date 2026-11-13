/** A worker of the pool of duels (docs/plan-socle.md A3): it plays what it is sent. */
import { parentPort } from "node:worker_threads";
import { type DuelJob, playDuel } from "./duels.js";

parentPort?.on("message", (m: { id: number; job: DuelJob }) => {
  let result: boolean | null | "error";
  try {
    result = playDuel(m.job);
  } catch {
    result = "error";
  }
  parentPort?.postMessage({ id: m.id, result });
});
