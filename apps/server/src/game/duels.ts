/**
 * The duels the server plays (docs/plan-socle.md A3): pure functions of plain data, run either at
 * once (tests) or in a pool of worker threads, so that a duel never stops the server's loop.
 */
import {
  type PasseMove,
  type PasseSetup,
  type PasseStyle,
  passeInit,
  passePlay,
  passeThink,
} from "@comptoirs/engine";

export type DuelJob =
  /** The player's thread replayed against a mind: won, lost, or null (an illegal piece). */
  | {
      kind: "replay";
      setup: PasseSetup;
      mind: { depth: number; style?: PasseStyle };
      moves: PasseMove[];
    }
  /** A position solved within its pieces, the chain answering at `depth`. */
  | { kind: "solve"; setup: PasseSetup; depth: number; pieces: number; moves: PasseMove[] }
  /** A captain's sortie against a tower's guard, both by their minds: true, the captain passed. */
  | {
      kind: "sortie";
      setup: PasseSetup;
      captain: { depth: number; style?: PasseStyle };
      guard: { depth: number };
    }
  /** A sortie met by its holder, who holds the chain: true, the captain passed; null, illegal. */
  | {
      kind: "meet";
      setup: PasseSetup;
      captain: { depth: number; style?: PasseStyle };
      moves: PasseMove[];
    };

const piece = (m: PasseMove): PasseMove => (m.fire ? { at: m.at, fire: true } : { at: m.at });

/** A duel, played to its end. */
export function playDuel(job: DuelJob): boolean | null {
  if (job.kind === "replay") {
    let s = passeInit(job.setup);
    for (const m of job.moves) {
      if (s.winner) break;
      if (s.turn !== 1) s = passePlay(s, passeThink(s, job.mind));
      if (s.winner) break;
      try {
        s = passePlay(s, piece(m));
      } catch {
        return null;
      }
    }
    return s.winner === 1;
  }
  if (job.kind === "solve") {
    let s = passeInit(job.setup);
    for (const m of job.moves) {
      if (s.winner || s.laid[0] >= job.pieces) break;
      if (s.turn !== 1) s = passePlay(s, passeThink(s, { depth: job.depth }));
      if (s.winner) break;
      try {
        s = passePlay(s, { at: m.at });
      } catch {
        return null;
      }
    }
    return s.winner === 1 && s.laid[0] <= job.pieces;
  }
  if (job.kind === "sortie") {
    let s = passeInit({ ...job.setup, first: 1 });
    for (let n = 0; !s.winner && n < job.setup.width * job.setup.height * 2; n++)
      s = passePlay(s, passeThink(s, s.turn === 1 ? job.captain : job.guard));
    return s.winner === 1;
  }
  let s = passeInit({ ...job.setup, first: 1 });
  for (const m of job.moves) {
    if (s.winner) break;
    if (s.turn !== 2) s = passePlay(s, passeThink(s, job.captain));
    if (s.winner) break;
    try {
      s = passePlay(s, piece(m));
    } catch {
      return null;
    }
  }
  if (!s.winner && s.turn === 1) s = passePlay(s, passeThink(s, job.captain));
  return s.winner !== 2;
}
