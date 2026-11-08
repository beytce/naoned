/**
 * Porcellana's laboratory (?lab=porcellana, docs/plan-porcellana.md lots 1 and 2): the kit on a
 * board, with the arrival, the selection (lift, ring, blush) and the place card, to see each model
 * as the owner validated it before it goes on the map. Two views: the small board of the kit (a
 * Fondaco, the Market, a road of accent and its cart, the lagoon), and the catalogue (&vue=catalogue:
 * every model of the game, by family, working or idle). Its texts are examples.
 */
import "./porcellana.css";
import { venice1450Interior } from "@comptoirs/engine";
import { Canvas } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CanvasTexture,
  Group,
  MOUSE,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  type OrthographicCamera,
  RepeatWrapping,
  RingGeometry,
  SRGBColorSpace,
  TOUCH,
  Vector3,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { ATELIER, AtelierOverlay } from "./LabAtelier.js";
import { BATTLE, PAWNS, PORTA, PortaOverlay } from "./LabPorta.js";
import { PlaceCard, type PlaceCardHandle, type PlaceCardInfo } from "./PlaceCard.js";
import { Stage } from "./Stage.js";
import { easeOutCubic, lifeOut, pinOut, routesDrawn, tileDelay, tileDrop } from "./arrival.js";
import { bake } from "./bake.js";
import { CATALOGUE, FAMILIES, type Family } from "./catalogue.js";
import { type Palette, createPalette } from "./materials.js";
import { fondaco } from "./models/fondaco.js";
import { grove, plot, slab } from "./models/ground.js";
import { market } from "./models/market.js";
import type { Built, ModelOpts } from "./models/model.js";
import { stationModel } from "./models/stations.js";
import { type Vehicle, cart, ship } from "./models/vehicles.js";
import { drawChevron, drawnIndices, ribbonGeometry, roundedPath, seaDashes } from "./ribbon.js";
import { Blush } from "./selection.js";
import { box } from "./shapes.js";
import { BOARD, CAMERA, COL, RIBBON, SELECT } from "./tokens.js";

import { type Cell, type Place, type Shared, type Spec, TileBoard, palette } from "./TileBoard.js";

/**
 * The board of the kit: a piece of map as the game will show it (docs/plan-porcellana.md § 1): the
 * domain in the shape it was bought, tile by tile (no rectangle), its workshops linked to the
 * Fondaco by roads of accent, the quay and its ship to the Market across the lagoon, the « + »
 * plots all round where it may grow.
 */
const KIT_ROWS = [
  ["", "plot", "forest", "lumber_camp", "mill", "plot", "", ""],
  ["plot", "lane", "sawmill", "lane", "lane", "clay_pit", "plot", ""],
  ["", "lane", "lane", "fondaco", "lane", "farm", "field", "plot"],
  ["", "plot", "glassworks", "lane", "depot", "lane", "lane", "plot"],
  ["", "", "~", "~", "~", "~", "plot", ""],
  ["", "", "~", "market", "venice", "~", "", ""],
];
const KIT: Spec = {
  rows: KIT_ROWS,
  routes: [
    [
      [3, 0.4],
      [3, 1.62],
    ],
    [
      [4.07, 0.42],
      [4.07, 1.08],
      [3.0, 1.08],
    ],
    [
      [2.2, 1.36],
      [2.2, 2.0],
      [2.62, 2.0],
    ],
    [
      [4.66, 1.3],
      [4.3, 1.3],
      [4.3, 2.0],
      [3.38, 2.0],
    ],
    [
      [4.64, 2.0],
      [3.38, 2.0],
    ],
    [
      [2.4, 3.0],
      [3.0, 3.0],
      [3.0, 2.38],
    ],
    [
      [3.3, 2.38],
      [3.3, 2.62],
      [3.75, 2.62],
      [3.75, 2.9],
    ],
  ],
  sea: [
    [
      [4.25, 3.85],
      [4.25, 4.12],
      [3.2, 4.12],
      [3.2, 4.5],
    ],
  ],
  viewH: (a) => (a >= 1 ? Math.max(38, 60 / a) : 34),
  cell(key, i, j) {
    if (key === "") return null;
    if (key === "~") return { water: true };
    const id = `${key}${i}${j}`;
    if (key === "lane")
      return { make: (o) => grove(palette(), o.seed + 7, 4, ["round", "cypress"], o.keepOff) };
    if (key === "plot")
      return {
        make: () => plot(palette()),
        place: {
          id,
          label: "+",
          plus: true,
          info: {
            name: "Parcelle libre",
            sub: "Case à acheter · 40 ducats",
            line: "Achète-la : le domaine grandit de ce côté, puis bâtis-y un atelier.",
            go: "Acheter la case",
          },
        },
      };
    if (key === "fondaco")
      return {
        make: () => fondaco(palette()),
        place: {
          id,
          label: "1",
          info: {
            name: "Le Fondaco",
            sub: "Ton comptoir · Casa 3",
            line: "Tout converge ici : les routes rouges y portent ce que tes ateliers produisent.",
            go: "Entrer au Fondaco",
          },
        },
      };
    if (key === "market")
      return {
        make: () => market(palette()),
        place: {
          id,
          label: "2",
          info: {
            name: "San Marco",
            sub: "Le Marché · la Dogana",
            line: "Le navire du quai y porte ta cargaison ; vendre et acheter au prix de Venise.",
            go: "Ouvrir la Dogana",
          },
        },
      };
    const e = BY_KEY.get(key)?.e;
    const make = e?.make;
    if (!e || !make) return { water: true };
    const workshop = e.family === "ateliers" && key !== "field";
    return {
      make: (o) => make(palette(), o),
      place:
        workshop || key === "depot"
          ? {
              id,
              label: String(KIT_LABELS.get(key) ?? ""),
              info: { name: e.name, sub: e.sub, line: e.sign, go: `Ouvrir : ${e.name}` },
            }
          : undefined,
    };
  },
};
const KIT_LABELS = new Map(
  ["lumber_camp", "mill", "sawmill", "clay_pit", "farm", "glassworks", "depot"].map((k, n) => [
    k,
    n + 3,
  ]),
);

/** The catalogue (lot 2): every model, family by family. */
const CATALOGUE_ROWS = [
  ["salt_pans", "~", "hemp_field", "~", "rope_walk", "~", "zattera"],
  ["lumber_camp", "sawmill", "mill", "farm", "glassworks", "clay_pit", "sand_pit"],
  ["brickworks", "palazzo", "field", "fondaco", "market", "campo", "porta"],
  ["arsenal", "post", "depot", "grove", "forest", "rocks", "mountain"],
  ["~", "ship", "~", "~", "gondola", "~", "~"],
  ["hamlet1", "hamlet2", "town3", "city4", "city5", "venice", "salute"],
  ["plot", "locked", "cart", "mule", "rider", ".", "."],
];
const BY_KEY = new Map(CATALOGUE.map((e, n) => [e.key, { e, n: n + 1 }]));

/** The first row of a family on the catalogue's board, its middle column. */
export function familyRow(f: Family): [number, number] {
  for (let j = 0; j < CATALOGUE_ROWS.length; j++)
    if ((CATALOGUE_ROWS[j] ?? []).some((k) => BY_KEY.get(k)?.e.family === f)) return [3, j];
  return [3, 0];
}

const CAT: Spec = {
  rows: CATALOGUE_ROWS,
  families: true,
  viewH: (a) => (a >= 1 ? Math.max(48, 82 / a) : 40),
  cell(key, i, j) {
    if (key === ".") return { make: (o) => grove(palette(), o.seed, 5) };
    const found = BY_KEY.get(key);
    if (!found) return { water: true };
    const { e, n } = found;
    const make = e.make;
    const vehicle = e.vehicle;
    return {
      water: (!!vehicle && !!e.water) || !!e.floats,
      make: make ? (o) => make(palette(), o) : undefined,
      vehicle: vehicle ? (o) => vehicle(palette(), o) : undefined,
      place: {
        id: `${key}${i}${j}`,
        label: String(n),
        plus: key === "plot",
        info: { name: e.name, sub: e.sub, line: e.sign, go: `Ouvrir : ${e.name}` },
      },
    };
  },
};

/** Every station of the workshops' insides, each on a tile of its own (lot 6, by their trade). */
const STATION_KINDS = Object.keys(venice1450Interior.stations ?? {}).sort();
const STATIONS_SPEC: Spec = {
  rows: Array.from({ length: Math.ceil(STATION_KINDS.length / 8) }, (_, j) =>
    STATION_KINDS.slice(j * 8, j * 8 + 8),
  ),
  viewH: (a) => (a >= 1 ? Math.max(52, 90 / a) : 44),
  cell(key, i, j) {
    if (!key) return null;
    return {
      make: (o) =>
        stationModel(palette(), o, {
          kind: key,
          w: 1,
          h: 1,
          rot: 0,
          crew: 1,
          neck: false,
          building: false,
        }),
      place: {
        id: `${key}${i}${j}`,
        label: key,
        info: { name: key, sub: "", line: "", go: key },
      },
    };
  },
};

export default function PorcellanaLab() {
  const view = new URLSearchParams(window.location.search).get("vue");
  const spec =
    view === "catalogue"
      ? CAT
      : view === "porta"
        ? PORTA
        : view === "bataille"
          ? BATTLE
          : view === "postes"
            ? STATIONS_SPEC
            : view === "pions"
              ? PAWNS
              : view === "atelier"
                ? ATELIER
                : KIT;
  const [chosen, setChosen] = useState<string | null>(null);
  const [running, setRunning] = useState(true);
  const [family, setFamily] = useState<Family | null>(null);
  const sh = useRef<Shared>({
    chosen: null,
    hover: null,
    running: true,
    goTo: null,
    pins: new Map(),
    card: null,
    target: new Vector3(),
  }).current;
  sh.chosen = chosen;
  sh.running = running;
  sh.goTo = family ? familyRow(family) : null;
  const places = useMemo(() => {
    const out: Place[] = [];
    spec.rows.forEach((row, j) => {
      row.forEach((key, i) => {
        const p = spec.cell(key, i, j)?.place;
        if (p) out.push(p);
      });
    });
    return out;
  }, [spec]);
  const current = places.find((p) => p.id === chosen);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") setChosen(null);
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);
  return (
    <div
      className="porcellana fixed inset-0"
      data-porcellana-lab
      style={spec.biscuit ? { background: COL.bg } : undefined}
    >
      <Canvas
        orthographic
        dpr={[1, 2]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        onCreated={({ camera }) => {
          (camera as OrthographicCamera & { manual?: boolean }).manual = true;
        }}
        onPointerMissed={() => setChosen(null)}
      >
        <TileBoard spec={spec} sh={sh} onPick={setChosen} />
      </Canvas>
      <div className="pc-vignette" />
      <div className="pc-pins">
        {places.map((p) => (
          <button
            key={p.id}
            type="button"
            className="pc-pin"
            data-on={String(p.id === chosen)}
            data-plus={String(!!p.plus)}
            data-tag={p.tag ? "true" : undefined}
            data-hot={p.hot ? "true" : undefined}
            data-out="false"
            aria-label={p.info.name}
            ref={(el) => {
              if (el) sh.pins.set(p.id, el);
              else sh.pins.delete(p.id);
            }}
            onClick={() => setChosen(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>
      <nav className="pc-tools pc-pill" aria-label="Laboratoire">
        <a className="pc-tool" href="?lab=porcellana" aria-current={!view}>
          Plateau
        </a>
        <a
          className="pc-tool"
          href="?lab=porcellana&vue=catalogue"
          aria-current={view === "catalogue"}
        >
          Catalogue
        </a>
        {(["porta", "bataille", "pions", "atelier"] as const).map((v) => (
          <a
            key={v}
            className="pc-tool"
            href={`?lab=porcellana&vue=${v}`}
            aria-current={view === v}
          >
            {v === "porta"
              ? "Porta"
              : v === "bataille"
                ? "Bataille"
                : v === "pions"
                  ? "Pions"
                  : "Atelier"}
          </a>
        ))}
        <button
          type="button"
          className="pc-tool"
          aria-pressed={running}
          onClick={() => setRunning((r) => !r)}
        >
          {running ? "En marche" : "À l'arrêt"}
        </button>
      </nav>
      {spec.families ? (
        <div className="pc-strip-wrap">
          <div className="pc-strip pc-pill">
            {FAMILIES.map((f) => (
              <button
                key={f.key}
                type="button"
                className="pc-chip"
                aria-pressed={family === f.key}
                onClick={() => {
                  setChosen(null);
                  setFamily((x) => (x === f.key ? null : f.key));
                }}
              >
                {f.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {view === "porta" || view === "bataille" ? <PortaOverlay view={view} /> : null}
      {view === "atelier" ? <AtelierOverlay /> : null}
      {current ? (
        <PlaceCard
          ref={(h) => {
            sh.card = h;
          }}
          info={current.info}
          onGo={() => {}}
          onClose={() => setChosen(null)}
        />
      ) : null}
    </div>
  );
}
