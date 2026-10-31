import { GAME_TIME_ZONE, offsetAt } from "../clock.js";
import { DAY_MS, type EmpireTerra, type EmpireTheatre, HOUR_MS, type PlayerId } from "../state.js";
import {
  type TerraPlayerCommand,
  applyTerraOn,
  serveTerraRations,
  tellCellsTaken,
  terraOn,
} from "../terraWorld.js";
import { type TerraConfig, advanceTerra, closeTerra, isNation, newTerra } from "../terraferma.js";
import { type Tx, emit, fail, inventoryLine, removeStock } from "../tx.js";
import { carnetWeek } from "./carnet.js";
import { empireSettings, isAsleep, ownHouse } from "./house.js";
import { checkCamp } from "./map.js";
import { bandOf } from "./power.js";
import { HOME_POST, putAt, storeOf, takeAt, wherePut } from "./stores.js";
import { powerOfHouse } from "./trade.js";

/**
 * The Terraferma of the empire (CADRAGE-v3 § 8): a game of a week, Monday to Sunday in Venice's
 * time, from nothing each time, at equal arms whatever the Casa. It is played in theatres, a map
 * for at most `theatreMax` merchants of a band of Power; odd weeks each for itself with its
 * alliances, even weeks the Contesa, company against company. The entry is paid in goods, the
 * Republic gives each the same bread a day; it pays Favour and Seals, never ducats nor yield.
 * Settled at the reading, as the rest of the empire.
 */

const WEEK_MS = 7 * DAY_MS;
const MONDAY = 4 * DAY_MS;
const TIERS = ["signore", "podium", "top10", "quarter", "participant"] as const;
type Tier = (typeof TIERS)[number];

/** The Monday, 00:00 in Venice, a week of the Carnet starts at. */
export function terraWeekStart(week: number): number {
  const guess = MONDAY + week * WEEK_MS;
  return guess - offsetAt(guess, GAME_TIME_ZONE);
}

/** The Contesa's weeks: the even ones. */
export const isContesaWeek = (week: number) => week % 2 === 0;

function cfgOf(tx: Tx): TerraConfig {
  const cfg = terraOn(tx.ctx);
  if (!cfg) fail("terra_off");
  return cfg;
}

/** The week's Terraferma: when the week turns, the last one's theatres close and pay. */
export function settleTerra(tx: Tx): EmpireTerra | null {
  if (!terraOn(tx.ctx) || !tx.s.empire) return null;
  const week = carnetWeek(tx.now);
  const t = tx.s.empire.terra;
  if (t && t.week === week) return t;
  if (t) for (const th of t.theatres) closeTheatre(tx, th, t.week);
  const next: EmpireTerra = {
    week,
    theatres: [],
    rosters: (t?.rosters ?? []).filter((r) => r.week >= week),
    honours: t?.honours ?? {},
  };
  tx.s.empire.terra = next;
  if (isContesaWeek(week)) formContesa(tx, next, week);
  return next;
}

/** The Republic's ration: the same bread a day for every merchant of the theatre. */
function republic(tx: Tx, th: EmpireTheatre) {
  const per = empireSettings(tx.ctx).terra.rationBread;
  return (id: PlayerId, loaves: number) => {
    const day = Math.floor(tx.now / DAY_MS);
    th.rations ??= {};
    const r = th.rations[id];
    const used = r?.day === day ? r.given : 0;
    const give = Math.max(0, Math.min(loaves, per - used));
    th.rations[id] = { day, given: used + give };
    return give;
  };
}

/** A theatre's map up to now (never past its week): its fronts, its bread, its close. */
export function advanceTheatre(tx: Tx, th: EmpireTheatre, week: number): void {
  const end = terraWeekStart(week + 1);
  const seen = th.map.history?.cell.length ?? 0;
  advanceTerra(th.map, th.cfg, Math.min(tx.now, end));
  tellCellsTaken(tx, th.map, seen);
  serveTerraRations(tx, th.map, republic(tx, th));
  if (th.map.closed && !th.map.closedSeen) payTheatre(tx, th, week);
}

function closeTheatre(tx: Tx, th: EmpireTheatre, week: number): void {
  const end = terraWeekStart(week + 1);
  advanceTerra(th.map, th.cfg, end);
  serveTerraRations(tx, th.map, republic(tx, th));
  closeTerra(th.map, th.cfg, end);
  if (!th.map.closedSeen) payTheatre(tx, th, week);
}

/** Seals for a house this week, within the week's cap. */
function giveSeals(tx: Tx, id: PlayerId, n: number, week: number): number {
  const s = empireSettings(tx.ctx);
  const h = tx.s.empire?.houses[id];
  if (!h || n <= 0) return 0;
  const got = h.terraSeals?.week === week ? h.terraSeals.seals : 0;
  const give = Math.max(0, Math.min(n, s.terra.sealsPerWeek - got));
  h.seals += give;
  h.terraSeals = { week, seals: got + give };
  return give;
}

/**
 * The close of a theatre: Favour by rank, Seals (the Signore and the podium; in the Contesa each
 * member, the winners more), the honorary grade; in the Contesa, the winning company's trophy, its
 * Lustre and its blazon on the cities it holds. A company alone against the nations wins less.
 */
function payTheatre(tx: Tx, th: EmpireTheatre, week: number): void {
  const close = th.map.closed;
  if (!close) return;
  th.map.closedSeen = true;
  const s = empireSettings(tx.ctx).terra;
  const contesa = th.kind === "contesa";
  const alone = contesa && (th.companies?.length ?? 0) < 2;
  const winner = contesa && !alone ? (close.teams?.[0]?.team ?? null) : null;
  const scale = (n: number) => (alone ? Math.floor((n * s.contesa.aloneBps) / 10_000) : n);
  close.ranking.forEach((r, k) => {
    const h = tx.s.empire?.houses[r.id];
    if (!h || isNation(r.id)) return;
    const tier = r.tier as Tier | "none";
    const favour = tier === "none" ? 0 : scale(s.favour[tier]);
    h.favour += favour;
    let seals = tier === "signore" ? s.seals.signore : tier === "podium" ? s.seals.podium : 0;
    if (contesa) {
      seals = scale(s.contesa.sealsPerMember);
      if (winner && h.company === winner) seals += s.contesa.winnerSeals;
    }
    const given = giveSeals(tx, r.id, seals, week);
    if (
      tier !== "none" &&
      (!h.terraBest || TIERS.indexOf(tier) < TIERS.indexOf(h.terraBest as Tier))
    )
      h.terraBest = tier;
    emit(tx, "terra_result", r.id, {
      week,
      rank: k + 1,
      of: close.ranking.length,
      glory: r.glory,
      cells: r.cells,
      signore: r.id === close.signore,
      tier,
      favour,
      seals: given,
      theatre: th.id,
    });
  });
  const terra = tx.s.empire?.terra;
  if (winner && terra) {
    terra.honours ??= {};
    const hon = terra.honours[winner] ?? { trophies: 0, lustre: 0 };
    const cities = th.map.map.cityCode.flatMap((code, i) => {
      const o = th.map.owner[i];
      return code && o && tx.s.empire?.houses[o]?.company === winner ? [code] : [];
    });
    terra.honours[winner] = {
      trophies: hon.trophies + 1,
      lustre: hon.lustre + s.contesa.lustre,
      blazon: { week, cities },
    };
  }
}

const theatreOf = (t: EmpireTerra, id: PlayerId) =>
  t.theatres.find((th) => th.members.includes(id));

/**
 * A house enters the week's Terraferma (odd weeks), within the placement window: it pays the
 * entry in goods and takes a place in the theatre of its band with room whose cote is nearest
 * its own; a new theatre opens when none has room.
 */
export function joinTerra(tx: Tx, playerId: PlayerId, rating = 1_000): void {
  const s = empireSettings(tx.ctx);
  const h = ownHouse(tx, playerId);
  // On the map, the Terraferma opens with the house's Campo.
  checkCamp(h, s);
  const cfg = cfgOf(tx);
  const t = settleTerra(tx);
  if (!t) fail("terra_off");
  if (isContesaWeek(t.week)) fail("contesa_week");
  if (theatreOf(t, playerId)) fail("already_in_theatre");
  const start = terraWeekStart(t.week);
  if (cfg.start.placementHours > 0 && tx.now >= start + cfg.start.placementHours * HOUR_MS)
    fail("placement_closed");
  // From Venice's stock: the Terraferma is supplied from the lagoon.
  for (const [good, qty] of Object.entries(s.terra.entry))
    if (storeOf(tx, h, playerId, HOME_POST, good) < qty) fail("insufficient_stock");
  for (const [good, qty] of Object.entries(s.terra.entry))
    takeAt(tx, h, playerId, HOME_POST, good, qty, "terraferma", `terra:${t.week}`);
  const band = bandOf(powerOfHouse(h, s), s);
  const mean = (th: EmpireTheatre) => {
    const rs = Object.values(th.ratings ?? {});
    return rs.length ? rs.reduce((a, b) => a + b, 0) / rs.length : rating;
  };
  let th = t.theatres
    .filter((x) => x.kind === "open" && x.band === band && x.members.length < s.terra.theatreMax)
    .sort((a, b) => Math.abs(mean(a) - rating) - Math.abs(mean(b) - rating))[0];
  if (!th) {
    // Its map at the measure of the band's houses awake, a theatre at most.
    const awake = Object.values(tx.s.empire?.houses ?? {}).filter(
      (x) => !isAsleep(x, tx.now, s) && bandOf(powerOfHouse(x, s), s) === band,
    ).length;
    const n = t.theatres.filter((x) => x.band === band).length;
    const id = `${t.week}:${band}:${n}`;
    th = {
      id,
      band,
      kind: "open",
      cfg,
      map: newTerra(
        cfg,
        `${tx.ctx.seed ?? tx.ctx.startAt}:empire-terra:${id}`,
        Math.max(1, Math.min(s.terra.theatreMax, awake)),
        start,
      ),
      members: [],
      ratings: {},
    };
    t.theatres.push(th);
  }
  th.members.push(playerId);
  th.ratings = { ...th.ratings, [playerId]: rating };
  emit(tx, "terra_joined", playerId, { theatre: th.id, band });
}

/** A command of the Terraferma, on the map of the house's theatre. */
export function actOnTerra(tx: Tx, playerId: PlayerId, action: TerraPlayerCommand): void {
  const t = settleTerra(tx);
  if (!t) fail("terra_off");
  const th = theatreOf(t, playerId);
  if (!th) fail("not_in_theatre");
  advanceTheatre(tx, th, t.week);
  if (th.map.closed) fail("terra_closed");
  // The decrees and the embargo act on the monthly world's economy: not in the empire's.
  if (action.type === "terraDecree" || action.type === "terraEmbargo") fail("terra_off");
  const h = ownHouse(tx, playerId);
  applyTerraOn(
    tx,
    th.cfg,
    th.map,
    { ...action, playerId },
    { team: th.kind === "contesa" ? (h.company ?? "") : "", week: t.week },
  );
}

/**
 * The Capo or a Consigliere (the server checks the vocation) sets down its company's roster for
 * the next Contesa: 5, 10 or 15 of its partners, by Thursday of the week before; it may change it
 * until then. A partner set down is bound for the whole week.
 */
export function setRoster(tx: Tx, playerId: PlayerId, members: PlayerId[]): void {
  const s = empireSettings(tx.ctx);
  const h = ownHouse(tx, playerId);
  checkCamp(h, s);
  const t = settleTerra(tx);
  if (!t) fail("terra_off");
  const target = t.week + 1;
  if (!isContesaWeek(target)) fail("not_contesa_week");
  if (tx.now >= terraWeekStart(t.week) + (s.terra.contesa.deadlineDay + 1) * DAY_MS)
    fail("roster_closed");
  if (!h.company) fail("no_company");
  const unique = [...new Set(members)];
  if (unique.length !== members.length || !s.terra.contesa.rosterSizes.includes(unique.length))
    fail("roster_size");
  for (const m of unique)
    if (tx.s.empire?.houses[m]?.company !== h.company) fail("not_same_company");
  t.rosters = [
    ...(t.rosters ?? []).filter((r) => !(r.week === target && r.company === h.company)),
    { week: target, company: h.company, members: unique },
  ];
}

/**
 * The Contesa's theatres, on its Monday: the rosters of a size, by their summed Power, in groups
 * of 2 to `maxCompanies` as even as can be; a company left alone plays against the nations.
 */
function formContesa(tx: Tx, t: EmpireTerra, week: number): void {
  const cfg = terraOn(tx.ctx);
  if (!cfg) return;
  const s = empireSettings(tx.ctx);
  const houses = tx.s.empire?.houses ?? {};
  const rosters = (t.rosters ?? [])
    .filter((r) => r.week === week)
    .map((r) => ({
      ...r,
      members: r.members.filter((m) => houses[m]?.company === r.company),
    }))
    .filter((r) => r.members.length > 0);
  const power = (r: (typeof rosters)[number]) =>
    r.members.reduce((n, m) => n + powerOfHouse(houses[m] ?? ({} as never), s), 0);
  for (const size of s.terra.contesa.rosterSizes) {
    const same = rosters
      .filter((r) => s.terra.contesa.rosterSizes.find((x) => r.members.length <= x) === size)
      .sort((a, b) => power(b) - power(a) || (a.company < b.company ? -1 : 1));
    const k = Math.ceil(same.length / s.terra.contesa.maxCompanies);
    let from = 0;
    for (let g = 0; g < k; g++) {
      const n = Math.floor((same.length - from) / (k - g));
      const group = same.slice(from, from + Math.max(1, n));
      from += group.length;
      const members = group.flatMap((r) => r.members);
      const id = `${week}:contesa:${size}:${g}`;
      const map = newTerra(
        cfg,
        `${tx.ctx.seed ?? tx.ctx.startAt}:empire-terra:${id}`,
        members.length,
        terraWeekStart(week),
      );
      map.teamMode = true;
      t.theatres.push({
        id,
        band: Math.max(
          ...members.map((m) => bandOf(powerOfHouse(houses[m] ?? ({} as never), s), s)),
        ),
        kind: "contesa",
        cfg,
        map,
        members,
        companies: group.map((r) => r.company),
      });
    }
  }
}
