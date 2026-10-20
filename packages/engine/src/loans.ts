import { type Deniers, applyBpsCeil, applyBpsFloor } from "./money.js";
import {
  DAY_MS,
  type PlayerId,
  SINK_ACCOUNT,
  SOURCE_ACCOUNT,
  type WorldState,
  cashAccount,
} from "./state.js";
import { type Tx, emit, fail, transfer } from "./tx.js";
import { netWorth } from "./valuation.js";

/**
 * The Bank's loans (recommendations of 20 October 2026): a merchant borrows up to a share of its
 * net worth, for a few days, at a simple interest a day. The Bank creates the ducats lent; the
 * principal repaid and the interest leave the game. At term the due is taken from the cash; what
 * is missing is owed with a penalty and taken from the cash as it comes in. Off without settings.
 */

/** What the merchant owes the Bank: the principal and the term's interest (less if repaid early). */
export function loanOwed(state: WorldState, playerId: PlayerId): Deniers {
  const loan = state.loans?.[playerId];
  return loan ? loan.owed : 0n;
}

export function borrow(tx: Tx, playerId: PlayerId, amount: Deniers, days: number): void {
  const rules = tx.ctx.settings.loans;
  if (!rules) fail("over_limit");
  if (tx.s.loans?.[playerId]) fail("loan_open");
  if (!Number.isInteger(days) || days < 1 || days > rules.maxDays) fail("invalid_quantity");
  if (amount <= 0n) fail("invalid_quantity");
  const worth = netWorth(tx.ctx, tx.s as WorldState, playerId, tx.now).total;
  const cap = applyBpsFloor(worth > 0n ? worth : 0n, rules.maxShareBps);
  if (amount > cap || amount > rules.maxAmount) fail("over_limit");
  const interest = applyBpsCeil(amount, rules.interestBpsPerDay * days);
  transfer(tx, SOURCE_ACCOUNT, cashAccount(playerId), amount, "loan", playerId);
  tx.s.loans ??= {};
  tx.s.loans[playerId] = {
    amount,
    owed: amount + interest,
    takenAt: tx.now,
    dueAt: tx.now + days * DAY_MS,
  };
  emit(tx, "loan_taken", playerId, { amount: amount.toString(), days });
}

/** Pays what is owed: the principal and the interest of the days begun (all of it once late). */
export function repayLoan(tx: Tx, playerId: PlayerId): void {
  const rules = tx.ctx.settings.loans;
  const loan = tx.s.loans?.[playerId];
  if (!rules || !loan) fail("no_loan");
  const days = Math.max(1, Math.ceil((tx.now - loan.takenAt) / DAY_MS));
  const owed = loan.late
    ? loan.owed
    : loan.amount + applyBpsCeil(loan.amount, rules.interestBpsPerDay * days);
  const due = owed < loan.owed ? owed : loan.owed;
  const cash = tx.s.accounts[cashAccount(playerId)] ?? 0n;
  if (cash < due) fail("insufficient_funds");
  pay(tx, playerId, due);
  delete tx.s.loans?.[playerId];
  emit(tx, "loan_repaid", playerId, {});
}

/** Takes `amount` of the debt from the cash: principal first, then the interest. */
function pay(tx: Tx, playerId: PlayerId, amount: Deniers): void {
  const loan = tx.s.loans?.[playerId];
  if (!loan || amount <= 0n) return;
  const principal = amount < loan.amount ? amount : loan.amount;
  if (principal > 0n)
    transfer(tx, cashAccount(playerId), SINK_ACCOUNT, principal, "loan_repay", playerId);
  if (amount > principal)
    transfer(
      tx,
      cashAccount(playerId),
      SINK_ACCOUNT,
      amount - principal,
      "loan_interest",
      playerId,
    );
  loan.amount -= principal;
  loan.owed -= amount;
}

/** Scheduled: loans at term take their due; late ones take the cash as it comes in. */
export function collectLoans(tx: Tx): void {
  const rules = tx.ctx.settings.loans;
  if (!rules) return;
  for (const playerId of Object.keys(tx.s.loans ?? {}).sort()) {
    const loan = tx.s.loans?.[playerId];
    if (!loan || tx.now < loan.dueAt) continue;
    const cash = tx.s.accounts[cashAccount(playerId)] ?? 0n;
    const take = cash < loan.owed ? cash : loan.owed;
    pay(tx, playerId, take);
    if (loan.owed <= 0n) {
      delete tx.s.loans?.[playerId];
      emit(tx, "loan_repaid", playerId, {});
    } else if (!loan.late) {
      loan.late = true;
      loan.owed += applyBpsCeil(loan.owed, rules.lateBps);
      emit(tx, "loan_late", playerId, { owed: loan.owed.toString() });
    }
  }
}
