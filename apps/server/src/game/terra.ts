import {
  MILAN,
  type WorldContext,
  type WorldState,
  alliesOf,
  campaignWeekEnd,
  capOf,
  cellsOf,
  terraOn,
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
    .filter(([id]) => id !== MILAN)
    .map(([id, p]) => ({ id, glory: p.glory, cells: cellsOf(s, id).length }))
    .sort((a, b) => b.glory - a.glory || (a.id < b.id ? -1 : 1));
  const rank = ranking.findIndex((r) => r.id === playerId);
  const day = Math.floor((now - s.startAt) / 86_400_000);
  const today = me?.today && me.today.day === day ? me.today : { raises: 0, gifts: 0 };
  const decree = state.terraDecree;
  return {
    week: t.week,
    closesAt: campaignWeekEnd(ctx, t.week),
    openHours: cfg.openHours,
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
      pseudo: id === MILAN ? null : (names.get(id)?.pseudo ?? null),
      crest: id === MILAN ? null : (names.get(id)?.crest ?? null),
      me: id === playerId,
      ally: allies.has(id),
      milan: id === MILAN,
      capital: s.players[id]?.capital ?? null,
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
    })),
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
          traitorUntil: me.traitorUntil ?? 0,
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
        borgo: cfg.buildings.borgo.price,
        cap: cfg.capRaise.price,
      },
      capRaise: cfg.capRaise.amount,
    },
  };
}
