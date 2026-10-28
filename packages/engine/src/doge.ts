import { citiesHeldBy } from "./signoria.js";
import { DAY_MS, type PlayerId, type WorldContext, type WorldState, seasonEnd } from "./state.js";
import { type Tx, emit, fail } from "./tx.js";
import { seasonStandings } from "./weekly.js";

/**
 * The Doge (R7 of the audit of 27 October 2026, docs/plan-rupture.md): the month's last week, the
 * Senate elects the Doge of the next month. The candidates are the first houses of the people at
 * the election's opening (never the outgoing Doge); each stands with a public programme, a
 * mutator and a decree of the Republic; each merchant votes, weighed by the cities it holds as
 * Podestà and a little Influence (given by the server). At the month's close the leader is
 * elected (`doge_elected`); the server writes its programme into the next month's settings, where
 * the decree holds for everyone (`decrees.ts`). Off without its settings.
 */

/** Whether the election runs now: the month's last days, before its close. */
export function electionOpen(ctx: WorldContext, now: number): boolean {
  const rules = ctx.settings.doge;
  if (!rules) return false;
  const end = seasonEnd(ctx);
  return now >= end - rules.electionDays * DAY_MS && now < end;
}

/** At the tick: the candidates frozen once the election opens. */
export function openElection(tx: Tx): void {
  const rules = tx.ctx.settings.doge;
  if (!rules || tx.s.election || !electionOpen(tx.ctx, tx.now)) return;
  const candidates = seasonStandings(tx.ctx, tx.s as WorldState, tx.now)
    .map((s) => s.playerId)
    .filter((id) => !tx.s.players[id]?.npc && id !== rules.previous)
    .slice(0, rules.candidates);
  tx.s.election = { candidates, programmes: {}, votes: {} };
  emit(tx, "election_opened", undefined, { candidates });
}

function openedElection(tx: Tx) {
  if (!tx.ctx.settings.doge) fail("doge_off");
  if (!electionOpen(tx.ctx, tx.now)) fail("election_closed");
  openElection(tx);
  const election = tx.s.election;
  if (!election) fail("election_closed");
  return election;
}

/** A decree of the Republic as a programme may hold it: of the catalog, its target valid. */
function validDecree(ctx: WorldContext, decree: { code: string; target?: string }): boolean {
  const rules = ctx.settings.doge;
  if (!rules || !(rules.decrees as string[]).includes(decree.code)) return false;
  if (decree.code === "faveur") return !!decree.target && decree.target in ctx.settings.cities;
  if (decree.code === "calmiere")
    return !!decree.target && ctx.settings.referencePrices[decree.target] !== undefined;
  return decree.target === undefined;
}

/** A candidate stands with its programme (or changes it until the close). */
export function standForDoge(
  tx: Tx,
  playerId: PlayerId,
  mutator: string | null,
  decree: { code: string; target?: string },
): void {
  const election = openedElection(tx);
  if (!election.candidates.includes(playerId)) fail("not_candidate");
  const catalog = tx.ctx.settings.mutators?.catalog ?? [];
  if (catalog.length > 0 && !catalog.some((m) => m.code === mutator)) fail("unknown_mutator");
  if (!validDecree(tx.ctx, decree)) fail("unknown_decree");
  election.programmes[playerId] = {
    mutator: catalog.length > 0 ? mutator : null,
    decree: decree.target ? { code: decree.code, target: decree.target } : { code: decree.code },
  };
  emit(tx, "doge_programme", playerId, { mutator, decree: decree.code });
}

/**
 * A merchant's voice: one, one more a city it holds as Podestà, and the Influence the server took
 * (`boost`, capped; kept when the merchant changes its mind).
 */
export function voteDoge(tx: Tx, playerId: PlayerId, candidate: PlayerId, boost = 0): void {
  const rules = tx.ctx.settings.doge;
  const election = openedElection(tx);
  const voter = tx.s.players[playerId];
  if (!voter || voter.npc) fail("cannot_vote");
  if (!election.candidates.includes(candidate)) fail("not_candidate");
  if (!election.programmes[candidate]) fail("no_programme");
  if (voter.joinedAt > tx.now - (rules?.minDays ?? 0) * DAY_MS) fail("too_new");
  const before = election.votes[playerId]?.boost ?? 0;
  const kept = Math.min(rules?.maxBoost ?? 0, Math.max(before, Math.floor(boost)));
  const weight = 1 + citiesHeldBy(tx.s as WorldState, playerId).length + kept;
  election.votes[playerId] = { candidate, weight, boost: kept };
  emit(tx, "doge_voted", playerId, { candidate, weight });
}

/** The voices of each candidate with a programme, the most first, the better ranked on a tie. */
export function dogeTally(state: WorldState): { playerId: PlayerId; votes: number }[] {
  const election = state.election;
  if (!election) return [];
  const votes: Record<PlayerId, number> = {};
  for (const v of Object.values(election.votes))
    votes[v.candidate] = (votes[v.candidate] ?? 0) + v.weight;
  return election.candidates
    .filter((id) => election.programmes[id])
    .map((id, rank) => ({ playerId: id, votes: votes[id] ?? 0, rank }))
    .sort((a, b) => b.votes - a.votes || a.rank - b.rank)
    .map(({ playerId, votes: n }) => ({ playerId, votes: n }));
}

/** At the month's close (before `season_closed`): the leader elected, with its programme. */
export function electDoge(tx: Tx): void {
  if (tx.s.seasonClosed || tx.now < seasonEnd(tx.ctx) || !tx.s.election) return;
  const [first] = dogeTally(tx.s as WorldState);
  const programme = first ? tx.s.election.programmes[first.playerId] : undefined;
  if (!first || !programme) return;
  emit(tx, "doge_elected", first.playerId, {
    mutator: programme.mutator,
    decree: { ...programme.decree },
    votes: first.votes,
  });
}
