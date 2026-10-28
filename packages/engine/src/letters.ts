import { draw } from "./draw.js";
import { traitEffects } from "./dynasty.js";
import type { Deniers } from "./money.js";
import type { WorldSettings } from "./settings.js";
import {
  DAY_MS,
  type PlayerId,
  SINK_ACCOUNT,
  SOURCE_ACCOUNT,
  type WorldContext,
  type WorldState,
  cashAccount,
  dayIndex,
  seasonEnd,
} from "./state.js";
import { type Tx, addStock, emit, fail, removeStock, transfer } from "./tx.js";

/**
 * The Letter of the day (R10 of the audit of 27 October 2026, docs/plan-rupture.md): each day of
 * the season a letter from a recurring figure of Venice, with two choices. Flags remember the
 * choices and decide the next letters; some consequences come days later, at the tick. The
 * script is the theme's (`settings.letters`), its words the interface's. The ducats given stay
 * under a cap for the season. Off without its settings.
 */

type Rules = NonNullable<WorldSettings["letters"]>;
type Episode = Rules["episodes"][number];
type Choice = Episode["choices"][number];
type Gift = Choice["gain"];

/** The merchant's letter today: the first episode of the day whose flags are met. */
export function letterOf(
  ctx: WorldContext,
  state: WorldState,
  playerId: PlayerId,
  now: number,
): { id: string; sender: string; day: number; choices: string[]; answered: string | null } | null {
  const rules = ctx.settings.letters;
  if (!rules || !state.players[playerId]) return null;
  const episode = episodeOf(ctx, rules, state, playerId, now);
  if (!episode) return null;
  const day = dayIndex(ctx, now);
  const saved = state.letters?.[playerId]?.answered[day];
  return {
    id: episode.id,
    sender: episode.sender,
    day,
    choices: episode.choices.map((c) => c.id),
    answered: saved ? (saved.split(":")[1] ?? null) : null,
  };
}

function episodeOf(
  ctx: WorldContext,
  rules: Rules,
  state: WorldState,
  playerId: PlayerId,
  now: number,
): Episode | undefined {
  const day = dayIndex(ctx, now);
  const last = day === dayIndex(ctx, seasonEnd(ctx) - 1);
  const mine = state.letters?.[playerId];
  // Answered today: the letter stays the one answered, whatever its flags became.
  const saved = mine?.answered[day]?.split(":")[0];
  if (saved) return rules.episodes.find((e) => e.id === saved);
  const flags = new Set(mine?.flags ?? []);
  const fits = (e: Episode) =>
    e.needs.every((f) => flags.has(f)) && !e.without.some((f) => flags.has(f));
  const ofDay = (e: Episode) => (last ? e.last === true : e.day === day && !e.last);
  return rules.episodes.find((e) => ofDay(e) && fits(e));
}

function lettersState(tx: Tx, playerId: PlayerId) {
  tx.s.letters ??= {};
  tx.s.letters[playerId] ??= { flags: [], answered: {}, pending: [], minted: 0n };
  const mine = tx.s.letters[playerId];
  if (!mine) fail("unknown_player");
  return mine;
}

/** Gives a letter's ducats (under the season's cap) and goods. */
function give(tx: Tx, playerId: PlayerId, gift: Gift, ref: string): Deniers {
  const rules = tx.ctx.settings.letters;
  if (!rules) return 0n;
  const mine = lettersState(tx, playerId);
  const left = rules.maxDucatsPerSeason - mine.minted;
  const ducats = gift.ducats < left ? gift.ducats : left > 0n ? left : 0n;
  if (ducats > 0n) {
    transfer(tx, SOURCE_ACCOUNT, cashAccount(playerId), ducats, "letter_reward", ref);
    mine.minted += ducats;
  }
  for (const [resource, qty] of Object.entries(gift.goods)) {
    if (qty > 0) addStock(tx, playerId, resource, qty, "letter_gift", ref);
  }
  return ducats;
}

function setFlags(tx: Tx, playerId: PlayerId, flags: string[]) {
  const mine = lettersState(tx, playerId);
  for (const f of flags) if (!mine.flags.includes(f)) mine.flags.push(f);
}

/** The merchant answers today's letter: pays, gains, sets its flags, and a consequence waits. */
export function answerLetter(tx: Tx, playerId: PlayerId, choiceId: string): void {
  const rules = tx.ctx.settings.letters;
  if (!rules) fail("letters_off");
  if (!tx.s.players[playerId]) fail("unknown_player");
  const day = dayIndex(tx.ctx, tx.now);
  const episode = episodeOf(tx.ctx, rules, tx.s as WorldState, playerId, tx.now);
  if (!episode) fail("no_letter");
  const mine = lettersState(tx, playerId);
  if (mine.answered[day]) fail("letter_answered");
  const choice = episode.choices.find((c) => c.id === choiceId);
  if (!choice) fail("unknown_choice");
  const ref = `letter:${day}:${episode.id}:${choice.id}`;
  if (choice.pay.ducats > 0n) {
    transfer(tx, cashAccount(playerId), SINK_ACCOUNT, choice.pay.ducats, "letter_cost", ref);
  }
  for (const [resource, qty] of Object.entries(choice.pay.goods)) {
    if (qty > 0) removeStock(tx, playerId, resource, qty, "letter_cost", ref);
  }
  const ducats = give(tx, playerId, choice.gain, ref);
  setFlags(tx, playerId, choice.set);
  mine.answered[day] = `${episode.id}:${choice.id}`;
  if (choice.later) {
    mine.pending.push({
      episode: episode.id,
      choice: choice.id,
      at: tx.now + choice.later.days * DAY_MS,
    });
  }
  emit(tx, "letter_answered", playerId, {
    letter: episode.id,
    choice: choice.id,
    ducats: ducats.toString(),
  });
}

/** At the tick: the consequences whose time has come, given if their chance draws them. */
export function settleLetters(tx: Tx): void {
  const rules = tx.ctx.settings.letters;
  if (!rules || !tx.s.letters) return;
  for (const [playerId, mine] of Object.entries(tx.s.letters)) {
    if (!mine.pending.some((p) => p.at <= tx.now)) continue;
    const due = mine.pending.filter((p) => p.at <= tx.now);
    mine.pending = mine.pending.filter((p) => p.at > tx.now);
    if (!tx.s.players[playerId]) continue;
    for (const p of due) {
      const later = rules.episodes
        .find((e) => e.id === p.episode)
        ?.choices.find((c) => c.id === p.choice)?.later;
      if (!later) continue;
      const came = draw(tx.ctx, `letter:${playerId}:${later.id}`) % 10_000 < later.chanceBps;
      let ducats = 0n;
      if (came) {
        ducats = give(tx, playerId, later.gain, `letter:${later.id}`);
        setFlags(tx, playerId, later.set);
      }
      emit(tx, "letter_followup", playerId, { id: later.id, came, ducats: ducats.toString() });
    }
  }
}

/**
 * Today's letter for the screen: each answer with what it pays, what it gives (the ducats as far
 * as the season's cap still allows), whether a consequence may follow, and whether the merchant
 * can pay it.
 */
export function letterView(ctx: WorldContext, state: WorldState, playerId: PlayerId, now: number) {
  const rules = ctx.settings.letters;
  const letter = letterOf(ctx, state, playerId, now);
  if (!rules || !letter) return null;
  const episode = rules.episodes.find((e) => e.id === letter.id);
  const minted = state.letters?.[playerId]?.minted ?? 0n;
  const left = rules.maxDucatsPerSeason > minted ? rules.maxDucatsPerSeason - minted : 0n;
  const cash = state.accounts[cashAccount(playerId)] ?? 0n;
  const stock = state.inventories[playerId] ?? {};
  // The man of letters knows who writes tomorrow (R4).
  const tomorrow =
    traitEffects(ctx, state, playerId).letterPreview > 0
      ? (letterOf(ctx, state, playerId, now + DAY_MS)?.sender ?? null)
      : null;
  return {
    ...letter,
    tomorrow,
    choices: (episode?.choices ?? []).map((c) => ({
      id: c.id,
      pay: { ducats: c.pay.ducats.toString(), goods: c.pay.goods },
      gain: {
        ducats: (c.gain.ducats < left ? c.gain.ducats : left).toString(),
        goods: c.gain.goods,
      },
      later: !!c.later,
      can:
        cash >= c.pay.ducats &&
        Object.entries(c.pay.goods).every(([g, n]) => (stock[g]?.available ?? 0) >= n),
    })),
  };
}
