import type { InteriorView } from "@comptoirs/engine";
import { fr } from "../../i18n.js";
import type { Place } from "../../porcellana/TileBoard.js";
import type { InteriorRules } from "../types.js";

/**
 * A workshop's inside as a board of flagstones (docs/plan-ateliers.md § 7.2, lot A5), from the
 * engine's view: what stands on each flagstone (a station on its first, the rest of its footprint
 * left bare, a pillar, the canal), the ribbons from the door of the inputs to each station of the
 * first stage, from each station to the nearest one of the stage after, to the door of the goods;
 * the pins, each station's rate in the workshop's goods an hour, the bottleneck's in red. Pure: the
 * scene draws it.
 */

const t = () => fr.empire.interior;

export type Cellish =
  | { kind: "floor"; north: boolean; west: boolean; door?: Door }
  | { kind: "covered"; north: boolean; west: boolean; door?: Door }
  | { kind: "pillar"; north: boolean; west: boolean }
  | { kind: "canal" }
  | {
      kind: "station";
      north: boolean;
      west: boolean;
      door?: Door;
      station: string;
      look: {
        kind: string;
        w: number;
        h: number;
        rot: 0 | 1 | 2 | 3;
        crew: number;
        neck: boolean;
        building: boolean;
      };
    };

/** A door by a flagstone: on the far walls (north, west) an arch; elsewhere a pile at its foot. */
export interface Door {
  side: "in" | "out";
  wall: "north" | "west" | null;
}

export interface InteriorBoard {
  w: number;
  h: number;
  cells: Cellish[][];
  routes: [number, number][][];
  places: (Place & { at: [number, number] })[];
  /** The workshop's goods an hour (one decimal), and the factor that turns a unit into goods. */
  goodsPerHour: number;
}

const fmt = (n: number) =>
  n >= 10 ? String(Math.round(n)) : (Math.round(n * 10) / 10).toLocaleString("fr-FR");

/** A station's footprint turned. */
function dims(
  kind: string,
  rot: number,
  rules: InteriorRules | null | undefined,
): [number, number] {
  const size = rules?.stations[kind]?.size ?? [1, 1];
  return rot % 2 ? [size[1], size[0]] : [size[0], size[1]];
}

export function interiorBoard(
  v: InteriorView,
  rules: InteriorRules | null | undefined,
  goodsPerHour: number,
  now: number,
): InteriorBoard {
  const { w, h } = v.hall;
  const walls = new Set(v.walls.map(([x, y]) => `${x},${y}`));
  // A walled column from end to end is a canal.
  const canal = new Set<number>();
  for (let x = 0; x < w; x++) {
    let all = true;
    for (let y = 0; y < h; y++) if (!walls.has(`${x},${y}`)) all = false;
    if (all) canal.add(x);
  }
  const doorAt = (d: [number, number]): { tile: [number, number]; wall: Door["wall"] } => {
    const x = Math.min(w - 1, Math.max(0, d[0]));
    const y = Math.min(h - 1, Math.max(0, d[1]));
    return { tile: [x, y], wall: d[1] < 0 ? "north" : d[0] < 0 ? "west" : null };
  };
  const doors = new Map<string, Door>();
  const inD = doorAt(v.doors.in);
  const outD = doorAt(v.doors.out);
  doors.set(`${inD.tile[0]},${inD.tile[1]}`, { side: "in", wall: inD.wall });
  doors.set(`${outD.tile[0]},${outD.tile[1]}`, { side: "out", wall: outD.wall });

  const neck = v.rate.bottleneck.station;
  const rateOf = new Map(v.rate.stages.flatMap((s) => s.stations.map((x) => [x.id, x.rateMilli])));
  // The bottleneck is a stage (its stations together, its buffer's loss counted): its pin says the
  // stage's rate, the one the engine compares (B21 of the players' audit: « Goulot · 40/h » beside
  // a station at 39/h read as the wrong one).
  const stageRateOf = new Map(
    v.rate.stages.flatMap((s) => s.stations.map((x) => [x.id, s.rateMilli])),
  );
  const units = v.rate.unitsMilliPerHour;
  // A unit of the inside in the workshop's goods: the pins speak the goods the player knows.
  const k = units > 0 ? goodsPerHour / (units / 1000) : 0;

  const cells: Cellish[][] = Array.from({ length: h }, (_, y) =>
    Array.from({ length: w }, (_, x): Cellish => {
      const key = `${x},${y}`;
      const edge = { north: y === 0, west: x === 0 };
      if (canal.has(x)) return { kind: "canal" };
      if (walls.has(key)) return { kind: "pillar", ...edge };
      const door = doors.get(key);
      return { kind: "floor", ...edge, ...(door ? { door } : {}) };
    }),
  );
  const places: InteriorBoard["places"] = [];
  const centre = new Map<string, [number, number]>();
  for (const st of v.stations) {
    const [fw, fh] = dims(st.kind, st.rot, rules);
    const building = st.readyAt !== undefined && st.readyAt > now && st.level <= 1;
    const crew = v.hands.filter((x) => x.stationId === st.id && x.shift === "day").length;
    const seats = rules?.stations[st.kind]?.levels[st.level - 1]?.seats ?? 0;
    for (let j = 0; j < fh; j++)
      for (let i = 0; i < fw; i++) {
        const row = cells[st.y + j];
        const at = row?.[st.x + i];
        if (!row || !at || at.kind === "canal" || at.kind === "pillar") continue;
        const door = "door" in at ? at.door : undefined;
        const edge = { north: st.y + j === 0, west: st.x + i === 0 };
        row[st.x + i] =
          i === 0 && j === 0
            ? {
                kind: "station",
                ...edge,
                ...(door ? { door } : {}),
                station: st.id,
                look: {
                  kind: st.kind,
                  w: fw,
                  h: fh,
                  rot: st.rot,
                  crew,
                  neck: st.id === neck,
                  building,
                },
              }
            : { kind: "covered", ...edge, ...(door ? { door } : {}) };
      }
    centre.set(st.id, [st.x + (fw - 1) / 2, st.y + (fh - 1) / 2]);
    const hot = st.id === neck;
    const rate = (((hot ? stageRateOf.get(st.id) : rateOf.get(st.id)) ?? 0) / 1000) * k;
    const name = t().stations[st.kind] ?? st.kind;
    const hands = v.hands.filter((x) => x.stationId === st.id).length;
    places.push({
      id: `st:${st.id}`,
      at: [st.x, st.y],
      label: building ? t().building : hot ? t().neck(fmt(rate)) : t().perHour(fmt(rate)),
      tag: true,
      hot,
      info: {
        name,
        sub: [
          t().level(st.level),
          seats === 0 ? t().alone : t().hands(hands),
          t().wear(Math.round(st.wear / 100)),
        ].join(" · "),
        line: hot ? t().lineNeck : rate === 0 ? t().lineIdle : t().lineOk,
        go: t().back,
      },
    });
  }

  // The ribbons: door → first stage, stage → the nearest station of the stage after, last → door.
  const byStage = v.stages.map((code) => {
    const kinds = new Set(v.kinds.filter((x) => x.stage === code).map((x) => x.kind));
    return v.stations.filter((s) => kinds.has(s.kind)).map((s) => s.id);
  });
  const L = (a: [number, number], b: [number, number]): [number, number][] =>
    a[0] === b[0] || a[1] === b[1] ? [a, b] : [a, [b[0], a[1]], b];
  const routes: [number, number][][] = [];
  const doorIn: [number, number] = [
    v.doors.in[0] * 0.5 + inD.tile[0] * 0.5,
    v.doors.in[1] * 0.5 + inD.tile[1] * 0.5,
  ];
  const doorOut: [number, number] = [
    v.doors.out[0] * 0.5 + outD.tile[0] * 0.5,
    v.doors.out[1] * 0.5 + outD.tile[1] * 0.5,
  ];
  const dist = (a: [number, number], b: [number, number]) =>
    Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
  byStage.forEach((ids, k2) => {
    for (const id of ids) {
      const c = centre.get(id);
      if (!c) continue;
      if (k2 === 0) routes.push(L(doorIn, c));
      else {
        const ups = (byStage[k2 - 1] ?? []).map((u) => centre.get(u)).filter(Boolean) as [
          number,
          number,
        ][];
        const near = ups.sort((a, b) => dist(a, c) - dist(b, c))[0];
        if (near) routes.push(L(near, c));
      }
      if (k2 === byStage.length - 1) routes.push(L(c, doorOut));
    }
  });

  // The door of the goods tells the workshop's rate.
  places.push({
    id: "door:out",
    at: outD.tile,
    label: t().out(fmt(goodsPerHour)),
    tag: true,
    info: {
      name: t().doorOut,
      sub: t().goodsPerHour(fmt(goodsPerHour)),
      line: t().doorOutLine,
      go: t().back,
    },
  });
  places.push({
    id: "door:in",
    at: inD.tile,
    label: t().inDoor,
    tag: true,
    info: { name: t().doorIn, sub: "", line: t().doorInLine, go: t().back },
  });
  // One pin a flagstone: a station's before a door's.
  const taken = new Set<string>();
  const shown = places.filter((x) => {
    const key = `${x.at[0]},${x.at[1]}`;
    if (taken.has(key)) return false;
    taken.add(key);
    return true;
  });
  return { w, h, cells, routes, places: shown, goodsPerHour };
}
