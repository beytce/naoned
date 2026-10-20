import {
  MILAN,
  type TerraConfig,
  type TerraState,
  type WorldContext,
  type WorldState,
  alliesOf,
  campaignWeekEnd,
  capOf,
  cellCost,
  cellsOf,
  forecastFronts,
  hexNeighbors,
  hourIn,
  hourWithin,
  inBattle,
  isNation,
  peasantsOf,
  recruitPerHour,
  seaTargets,
  terraOn,
  yieldPerHour,
} from "@comptoirs/engine";

/**
 * What a merchant sees of the Terraferma (docs/plan-terraferme.md): the week's map (sent compact:
 * one letter of terrain a cell, the holders by index), the fronts, the buildings, his own state,
 * the ranking and the decree in force. Fetched apart from the game's view: only the Terraferma's
 * layer needs it.
 */

const TERRAIN_LETTER: Record<string, string> = {
  plain: "p",
  hill: "h",
  marsh: "m",
  mountain: "M",
  water: "w",
};

/**
 * The merchant's recruits: so many an open hour, when the next come in (the end of the next open
 * step), and when the troops reach their maximum if nothing else happens (null: already there).
 */
function recruitClock(
  s: TerraState,
  cfg: TerraConfig,
  id: string,
  troops: number,
  cap: number,
): { perHour: number; nextAt: number | null; fullAt: number | null } {
  const perHour = recruitPerHour(s, cfg, id);
  const stepMs = cfg.stepMinutes * 60_000;
  const perStep = Math.floor((perHour * cfg.stepMinutes) / 60);
  let nextAt: number | null = null;
  let fullAt: number | null = null;
  let t = s.clock;
  let n = troops;
  for (let k = 0; perStep > 0 && n < cap && k < (7 * 24 * 60) / cfg.stepMinutes; k++) {
    const from = t;
    t += stepMs;
    if (!hourWithin(hourIn(from), cfg.openHours)) continue;
    nextAt ??= t;
    n += perStep;
    if (n >= cap) fullAt = t;
  }
  return { perHour, nextAt, fullAt };
}

/** How far ahead a front's march is forecast, and how many of its cells are sent. */
const FORECAST_MS = 24 * 3_600_000;
const FORECAST_CELLS = 12;

export interface TerraName {
  pseudo: string | null;
  crest: unknown;
}

export function terraView(
  ctx: WorldContext,
  state: WorldState,
  playerId: string,
  now: number,
  names: Map<string, TerraName>,
) {
  const cfg = terraOn(ctx);
  const t = state.terra;
  if (!cfg || !t) return null;
  const s = t.map;
  const me = s.players[playerId];
  const allies = new Set(alliesOf(s, playerId));
  // The holders, by index: Milan first, then everyone who holds a cell, leads a front or ranks.
  const ids = new Set<string>([MILAN]);
  for (const o of s.owner) if (o) ids.add(o);
  for (const f of s.fronts) ids.add(f.owner);
  for (const id of Object.keys(s.players)) ids.add(id);
  const holders = [...ids];
  const index = new Map(holders.map((id, i) => [id, i]));
  const at = (id: string | null) => (id === null ? -1 : (index.get(id) ?? -1));
  const ranking = Object.entries(s.players)
    .filter(([id]) => !isNation(id))
    .map(([id, p]) => ({ id, glory: p.glory, cells: cellsOf(s, id).length }))
    .sort((a, b) => b.glory - a.glory || (a.id < b.id ? -1 : 1));
  const rank = ranking.findIndex((r) => r.id === playerId);
  const day = Math.floor((now - s.startAt) / 86_400_000);
  const today = me?.today && me.today.day === day ? me.today : { raises: 0, gifts: 0 };
  const decree = state.terraDecree;
  // What a front pays for each cell it could take next: those along the merchant's border.
  const costs: Record<number, number> = {};
  if (me) {
    for (const i of cellsOf(s, playerId))
      for (const n of hexNeighbors(s.map, i))
        if (s.map.land[n] && s.owner[n] !== playerId && !(n in costs))
          costs[n] = cellCost(s, cfg, n);
  }
  // Where the merchant's fronts, and those marching on him, will go and when, if nobody acts.
  const watched = s.fronts
    .filter((f) => f.owner === playerId || f.against === playerId)
    .map((f) => f.id);
  const forecast = forecastFronts(s, cfg, watched, now + FORECAST_MS);
  return {
    week: t.week,
    closesAt: campaignWeekEnd(ctx, t.week),
    /** Until when merchants may set down (null: any time); nobody comes in after it. */
    placementEndsAt:
      cfg.start.placementHours > 0 ? s.startAt + cfg.start.placementHours * 3_600_000 : null,
    /** Until when nobody may attack another merchant (null: no truce). */
    truceEndsAt: cfg.start.truceHours > 0 ? s.startAt + cfg.start.truceHours * 3_600_000 : null,
    openHours: cfg.openHours,
    /** The battle hour: when it is, whether it is on now. */
    battle: cfg.battle
      ? { from: cfg.battle.from, to: cfg.battle.to, on: inBattle(cfg, now) }
      : null,
    /** Whether the fronts march now (they rest at night). */
    open: hourWithin(hourIn(now), cfg.openHours),
    map: {
      width: s.map.width,
      height: s.map.height,
      origin: s.map.origin,
      size: s.map.size,
      terrain: s.map.terrain.map((k) => TERRAIN_LETTER[k] ?? "p").join(""),
      cities: s.map.cityCode
        .map((code, cell) => (code ? { cell, code } : null))
        .filter((c) => c !== null),
    },
    holders: holders.map((id) => ({
      // Milan has no merchant behind it; the others' ids name them in alliances and gifts.
      id: isNation(id) ? null : id,
      pseudo: isNation(id) ? null : (names.get(id)?.pseudo ?? null),
      crest: isNation(id) ? null : (names.get(id)?.crest ?? null),
      me: id === playerId,
      ally: allies.has(id),
      milan: isNation(id),
      /** The nation it is (milan, mantova…), null for a merchant. */
      nation: isNation(id) ? id.replace("nation:", "") : null,
      capital: s.players[id]?.capital ?? null,
      troops: s.players[id]?.troops ?? 0,
      cells: cellsOf(s, id).length,
    })),
    owner: s.owner.map((o) => at(o)),
    fronts: s.fronts.map((f) => ({
      id: f.id,
      owner: at(f.owner),
      against: at(f.against),
      aim: f.aim,
      troops: f.troops,
      mine: f.owner === playerId,
      threat: f.against === playerId,
      /** The cells it will take next and when, a few; when it will stop (null: not known). */
      takes: (forecast[f.id]?.takes ?? []).slice(0, FORECAST_CELLS),
      endsAt: forecast[f.id]?.endsAt ?? null,
    })),
    costs,
    // The last day's cells that changed hands, for the screen to replay what a merchant missed.
    changes: Object.entries(s.taken ?? {})
      .filter(([, c]) => c.at > now - 86_400_000)
      .map(([cell, c]) => ({ cell: Number(cell), at: c.at, from: at(c.from) }))
      .sort((a, b) => a.at - b.at || a.cell - b.cell),
    buildings: Object.entries(s.buildings ?? {}).map(([cell, b]) => ({
      cell: Number(cell),
      kind: b.kind,
      owner: at(b.owner),
    })),
    me: me
      ? {
          troops: me.troops,
          cap: capOf(s, cfg, playerId),
          cells: cellsOf(s, playerId).length,
          glory: me.glory,
          rank: rank + 1,
          capital: me.capital ?? null,
          protectedUntil: me.protectedUntil,
          aggressor: me.aggressor ?? false,
          peasantsBps: peasantsOf(s, playerId),
          /** What the land yields an open hour: goods in hundredths, route ducats in deniers. */
          yields: yieldPerHour(s, cfg, playerId),
          /** The shores its boats may reach: minutes at sea and what the shore costs. */
          sea: Object.fromEntries(
            Object.entries(seaTargets(s, cfg, playerId)).map(([cell, minutes]) => [
              cell,
              { minutes, cost: cellCost(s, cfg, Number(cell)) },
            ]),
          ),
          traitorUntil: me.traitorUntil ?? 0,
          eliminatedAt: me.eliminatedAt ?? null,
          recruit: recruitClock(s, cfg, playerId, me.troops, capOf(s, cfg, playerId)),
          /** Its fronts come home in the last day: what each took, spent and brought back. */
          returns: (s.returns ?? [])
            .filter((r) => r.owner === playerId)
            .map((r) => ({
              front: r.front,
              against: at(r.against),
              cells: r.cells,
              spent: r.spent,
              back: r.back,
              at: r.at,
            })),
          allies: [...allies].map(at),
          requestsIn: (s.requests ?? []).filter((r) => r.to === playerId).map((r) => at(r.from)),
          requestsOut: (s.requests ?? []).filter((r) => r.from === playerId).map((r) => at(r.to)),
          raisesLeft: Math.max(0, cfg.capRaise.perDay - today.raises),
          giftsLeft: Math.max(
            0,
            Math.floor((capOf(s, cfg, playerId) * cfg.alliances.giftShareBps) / 10_000) -
              today.gifts,
          ),
          programme: s.programme?.[playerId] ?? null,
        }
      : null,
    ranking: ranking
      .slice(0, 10)
      .map((r) => ({ holder: at(r.id), glory: r.glory, cells: r.cells })),
    players: ranking.length,
    decree: decree
      ? {
          week: decree.week,
          code: decree.code,
          target: decree.target ?? null,
          members: decree.members.map((m) => names.get(m)?.pseudo ?? null),
          mine: decree.members.includes(playerId),
        }
      : null,
    closed: s.closed
      ? { signore: s.closed.signore ? at(s.closed.signore) : -1, conquest: s.closed.conquest }
      : null,
    rules: {
      frontsMax: cfg.fronts.max,
      minShareBps: cfg.fronts.minShareBps,
      alliesMax: cfg.alliances.max,
      decrees: cfg.close.decrees,
      prices: {
        rocca: cfg.buildings.rocca.price,
        borgo: cfg.buildings.borgo?.price ?? null,
        porto: cfg.buildings.porto?.price ?? null,
        cap: cfg.capRaise.price,
      },
      capRaise: cfg.capRaise.amount,
      protectionHours: cfg.start.protectionHours,
      peacefulSafe: cfg.fronts.peacefulSafe && !cfg.fronts.capitalSafe,
      /** Soldiers and peasants: whether the slider is played. */
      peasants: !!cfg.peasants,
      /** Minutes a front takes for a cell of free land, and of a rival's. */
      neutralMinutes: cfg.stepMinutes * cfg.fronts.neutralEverySteps,
      cellMinutes: Math.max(1, Math.floor(cfg.stepMinutes / cfg.fronts.cellsPerStep)),
    },
  };
}
