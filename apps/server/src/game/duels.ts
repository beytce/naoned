/**
 * The duels the server plays (docs/plan-socle.md A3): pure functions of plain data, run either at
 * once (tests) or in a pool of worker threads, so that a duel never stops the server's loop.
 */
import {
  type PasseMove,
  type PasseSetup,
  type PasseState,
  type PasseStyle,
  Rng,
  passeInit,
  passePlay,
  passeThink,
} from "@comptoirs/engine";

/**
 * The computer's piece in a duel played move by move (docs/plan-duels.md B1): its mind, and a seed
 * the server drew (null: no chance, for the tests), mixed with the piece's rank.
 */
export interface ThinkJob {
  state: PasseState;
  mind: { depth: number; style?: PasseStyle };
  seed: number | null;
}

export function thinkPiece(job: ThinkJob): PasseMove {
  const rng = job.seed === null ? undefined : new Rng(job.seed);
  return passeThink(job.state, job.mind, rng);
}

/** A captain's sortie against a tower's guard, both by their minds: true, the captain passed. */
export interface DuelJob {
  kind: "sortie";
  setup: PasseSetup;
  captain: { depth: number; style?: PasseStyle };
  guard: { depth: number };
}

/** A duel of the computer against itself, played to its end. */
export function playDuel(job: DuelJob): boolean {
  let s = passeInit({ ...job.setup, first: 1 });
  for (let n = 0; !s.winner && n < job.setup.width * job.setup.height * 2; n++)
    s = passePlay(s, passeThink(s, s.turn === 1 ? job.captain : job.guard));
  return s.winner === 1;
}
