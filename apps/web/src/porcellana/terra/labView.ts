/**
 * The laboratory's view of a week of the engine (lot T5): what the server's view says, made in the
 * page from the state (only what the play surface reads), and the merchant's actions played on the
 * state itself, so that the interface can be tried without a server. Its texts are examples.
 */
import {
  EngineError,
  type TerraState,
  acceptAlliance,
  alliesOf,
  bombardTargets,
  breakAlliance,
  buildOnTerra,
  capOf,
  cellCost,
  cellsOf,
  chestOf,
  fireBombard,
  forecastFronts,
  isNation,
  launchFront,
  placeOnTerra,
  proposeAlliance,
  raiseCap,
  recallFront,
  recruitPerHour,
  sendTroops,
  signal,
  terraNeighbors,
  winBpsAt,
} from "@comptoirs/engine";
import type { TerraAction, TerraView } from "../../game/types.js";

type Cfg = Parameters<typeof launchFront>[1];

const LETTER: Record<string, string> = {
  plain: "p",
  hill: "h",
  marsh: "m",
  mountain: "M",
  water: "w",
};

export function labView(s: TerraState, cfg: Cfg, me: string, now: number): TerraView {
  const ids = [...new Set(s.owner.filter((o): o is string => o !== null))].sort();
  for (const id of Object.keys(s.players)) if (!ids.includes(id)) ids.push(id);
  const index = new Map(ids.map((id, i) => [id, i]));
  const at = (id: string | null) => (id === null ? -1 : (index.get(id) ?? -1));
  const allies = new Set(s.players[me] ? alliesOf(s, me) : []);
  const mine = new Set(cellsOf(s, me));
  const costs: Record<string, number> = {};
  if (s.players[me])
    for (let c = 0; c < s.owner.length; c++) {
      const o = s.owner[c] ?? null;
      if (o === me || !s.map.land[c] || (o !== null && allies.has(o))) continue;
      if (terraNeighbors(s.map, c).some((n) => mine.has(n))) costs[c] = cellCost(s, cfg, c);
    }
  const watched = s.fronts.filter((f) => f.owner === me || f.against === me).map((f) => f.id);
  const seen = forecastFronts(s, cfg, watched, now + 24 * 3_600_000);
  const ranking = ids
    .filter((id) => !isNation(id))
    .map((id) => ({
      holder: at(id),
      glory: s.players[id]?.glory ?? 0,
      cells: cellsOf(s, id).length,
    }))
    .sort((a, b) => b.glory - a.glory);
  const p = s.players[me];
  const hour = new Date(now + 3_600_000).getUTCHours();
  const name = (id: string) =>
    id === me ? null : id.startsWith("house") ? `Maison ${id.slice(5)}` : null;
  const today = p?.today;
  return {
    week: 0,
    closesAt: s.startAt + 7 * 86_400_000,
    placementEndsAt: null,
    truceEndsAt: null,
    openHours: cfg.openHours,
    battle: null,
    open: hour >= cfg.openHours.from && hour < cfg.openHours.to,
    map: {
      width: s.map.width,
      height: s.map.height,
      origin: s.map.origin,
      size: s.map.size,
      grid: s.map.grid ?? "hex",
      terrain: s.map.terrain.map((k) => LETTER[k] ?? "p").join(""),
      cities: s.map.cityCode.flatMap((code, cell) => (code ? [{ cell, code }] : [])),
    },
    holders: ids.map((id) => ({
      id,
      pseudo: name(id),
      crest: null,
      bot: id !== me,
      me: id === me,
      ally: allies.has(id),
      milan: isNation(id),
      nation: isNation(id) ? id.replace("nation:", "") : null,
      capital: s.players[id]?.capital ?? null,
      troops: Math.floor(s.players[id]?.troops ?? 0),
      cells: cellsOf(s, id).length,
    })),
    owner: s.owner.map((o) => at(o)),
    fronts: s.fronts.map((f) => ({
      id: f.id,
      owner: at(f.owner),
      against: at(f.against),
      aim: f.aim,
      troops: f.troops,
      mine: f.owner === me,
      threat: f.against === me,
      takes: (seen[f.id]?.takes ?? []).slice(0, 12),
      endsAt: seen[f.id]?.endsAt ?? null,
    })),
    signals: [],
    costs,
    changes: [],
    buildings: Object.entries(s.buildings ?? {}).map(([cell, b]) => ({
      cell: Number(cell),
      kind: b.kind,
      owner: at(b.owner),
    })),
    me: p
      ? {
          troops: Math.floor(p.troops),
          cap: capOf(s, cfg, me),
          cells: mine.size,
          glory: p.glory,
          rank: ranking.findIndex((r) => r.holder === at(me)) + 1,
          capital: p.capital ?? null,
          protectedUntil: p.protectedUntil,
          aggressor: !!p.aggressor,
          sea: {},
          embargo: -1,
          chest: cfg.chest
            ? { ecus: chestOf(s, cfg, me, now), cap: cfg.chest.cap, perDay: cfg.chest.perDay }
            : null,
          holdsCity: false,
          bombard: bombardTargets(s, cfg, me, now),
          peasantsBps: 5_000,
          yields: { goods: {}, route: "0" },
          traitorUntil: 0,
          eliminatedAt: null,
          recruit: { perHour: recruitPerHour(s, cfg, me), nextAt: null, fullAt: null },
          returns: [],
          allies: [...allies].map((id) => at(id)),
          requestsIn: (s.requests ?? []).filter((r) => r.to === me).map((r) => at(r.from)),
          requestsOut: (s.requests ?? []).filter((r) => r.from === me).map((r) => at(r.to)),
          raisesLeft: Math.max(0, cfg.capRaise.perDay - (today?.raises ?? 0)),
          giftsLeft: 30,
          programme: null,
        }
      : null,
    ranking,
    players: ranking.length,
    decree: null,
    closed: null,
    rules: {
      frontsMax: cfg.fronts.max,
      minShareBps: cfg.fronts.minShareBps,
      alliesMax: cfg.alliances.max,
      decrees: [],
      prices: {
        rocca: cfg.buildings.rocca.price.toString(),
        borgo: cfg.buildings.borgo?.price.toString() ?? null,
        porto: cfg.buildings.porto?.price.toString() ?? null,
        bombarda: cfg.buildings.bombarda?.price.toString() ?? null,
        mura: cfg.buildings.mura?.price.toString() ?? null,
        cap: cfg.capRaise.price.toString(),
      },
      capRaise: cfg.capRaise.amount,
      chestPrices: cfg.chest?.prices ?? null,
      winBpsToday: winBpsAt(s, cfg, now),
      landCells: s.map.land.filter(Boolean).length,
      pace: {
        stepMinutes: cfg.stepMinutes,
        cellsPerStep: cfg.fronts.cellsPerStep,
        massPerCell: cfg.fronts.massPerCell ?? null,
        cellsMaxPerStep: cfg.fronts.cellsMaxPerStep ?? null,
      },
      peacefulSafe: false,
      peasants: false,
      team: null,
      diplomacy: null,
      protectionHours: 0,
      supply: null,
      neutralMinutes: 60,
      cellMinutes: 30,
    },
  } as unknown as TerraView;
}

/** The merchant's action played on the state; the engine's refusal comes back as its code. */
export function labAct(
  s: TerraState,
  cfg: Cfg,
  me: string,
  ids: (i: number) => string,
  a: TerraAction,
  now: number,
): string | null {
  try {
    switch (a.type) {
      case "terraPlace":
        placeOnTerra(s, cfg, me, a.cell, now);
        break;
      case "terraFront":
        launchFront(s, cfg, me, a.aim, a.shareBps, now);
        break;
      case "terraRecall":
        recallFront(s, me, a.frontId);
        break;
      case "terraBuild":
        buildOnTerra(s, cfg, me, a.cell, a.kind, now);
        break;
      case "terraFire":
        fireBombard(s, cfg, me, a.cell, now);
        break;
      case "terraRaise":
        raiseCap(s, cfg, me, now);
        break;
      case "terraAlly":
        proposeAlliance(s, cfg, me, a.other, now);
        // The laboratory's houses say yes at once.
        acceptAlliance(s, cfg, a.other, me, now);
        break;
      case "terraAccept":
        acceptAlliance(s, cfg, me, a.from, now);
        break;
      case "terraBreak":
        breakAlliance(s, cfg, me, a.other, now);
        break;
      case "terraSend":
        sendTroops(s, cfg, me, a.to, a.count, now);
        break;
      case "terraSignal":
        signal(s, cfg, me, a.kind, a.cell, now);
        break;
      default:
        return "unknown";
    }
    void ids;
    return null;
  } catch (e) {
    if (e instanceof EngineError) return e.code;
    throw e;
  }
}
