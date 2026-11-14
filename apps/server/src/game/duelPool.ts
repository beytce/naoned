/**
 * The pool of duels (docs/plan-socle.md A3): a few worker threads that play the duels the server
 * replays, so that one never stops the loop that answers the players. Without workers (tests, or
 * when they cannot start) a duel is played at once, as before.
 */
import { cpus } from "node:os";
import { Worker } from "node:worker_threads";
import type { PasseMove } from "@comptoirs/engine";
import { type DuelJob, type ThinkJob, playDuel, thinkPiece } from "./duels.js";

export interface Duels {
  run(job: DuelJob): Promise<boolean>;
  /** The computer's next piece (docs/plan-duels.md B1). */
  think(job: ThinkJob): Promise<PasseMove>;
  stop(): Promise<void>;
}

/** Duels played at once, in the caller's loop. */
export const inlineDuels: Duels = {
  run: (job) => Promise.resolve(playDuel(job)),
  think: (job) => Promise.resolve(thinkPiece(job)),
  stop: () => Promise.resolve(),
};

/** A pool of `size` workers (by default, the cores less one, two at most). */
export function duelPool(size = Math.max(1, Math.min(2, cpus().length - 1))): Duels {
  type Pending = { resolve: (r: unknown) => void; reject: (e: Error) => void };
  const workers: { w: Worker; busy: number }[] = [];
  const pending = new Map<number, Pending>();
  let next = 1;
  try {
    for (let k = 0; k < size; k++) {
      const w = new Worker(new URL("./duelWorker.ts", import.meta.url), {
        execArgv: process.execArgv,
      });
      const slot = { w, busy: 0 };
      w.on("message", (m: { id: number; result: unknown }) => {
        slot.busy -= 1;
        const p = pending.get(m.id);
        pending.delete(m.id);
        if (!p) return;
        if (m.result === "error") p.reject(new Error("duel_failed"));
        else p.resolve(m.result);
      });
      w.on("error", (e) => console.error("[duels]", e));
      w.unref();
      workers.push(slot);
    }
  } catch (e) {
    console.error("[duels] no workers, the duels are played at once:", e);
    return inlineDuels;
  }
  const send = (message: { job?: DuelJob; think?: ThinkJob }) => {
    const slot = workers.reduce((a, b) => (b.busy < a.busy ? b : a));
    const id = next++;
    slot.busy += 1;
    return new Promise<unknown>((resolve, reject) => {
      pending.set(id, { resolve, reject });
      slot.w.postMessage({ id, ...message });
    });
  };
  return {
    run: (job) => send({ job }) as Promise<boolean>,
    think: (think) => send({ think }) as Promise<PasseMove>,
    async stop() {
      await Promise.all(workers.map((s) => s.w.terminate()));
    },
  };
}
