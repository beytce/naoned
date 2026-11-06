/**
 * The Porta's proposal at the laboratory (6 November 2026, docs/plan-porta-porcellana.md): the same
 * board as the Carte — square tiles, bevelled, falling into place, red roads — for the Porta's place
 * (&vue=porta), a battle in the lands of Rome (&vue=bataille) and the new pawns (&vue=pions). The
 * near side, the house's, is glazed porcelain; the lands of Rome are biscuit.
 */
import { Group } from "three";
import type { Cell, Place, Spec } from "./Lab.js";
import { palette } from "./Lab.js";
import { mountain, rocks } from "./models/decor.js";
import { grove } from "./models/ground.js";
import type { Built, ModelOpts } from "./models/model.js";
import { type PawnKind, pawn, squad } from "./models/pawns.js";
import { porta } from "./models/places.js";
import { chest, darkGate, stall, tier } from "./models/porta.js";
import { town } from "./models/towns.js";
import { mule } from "./models/vehicles.js";

const HOUSE = () => palette(false);
const ROME = () => palette(true);
/** The rarities' gems: the only colours of the lands besides the red. */
const GEMS = ["#BFAE8E", "#3FAE8C", "#3C8FC4", "#D49A16"];

const place = (id: string, label: string, name: string, sub: string, line: string, go: string) =>
  ({ id, label, info: { name, sub, line, go } }) satisfies Place;

const forest = (o: ModelOpts) => grove(ROME(), o.seed, 9, ["cypress", "round"], o.keepOff);
const lane = (rome: boolean) => (o: ModelOpts) =>
  grove(rome ? ROME() : HOUSE(), o.seed + 5, 3, ["round", "cypress"], o.keepOff);

/** The Porta's place: the quay of the house, the stall, the six tiers, the gate, the Porta noire. */
const PORTA_ROWS = [
  ["", "mount", "t4", "t5", "t6", "dark", ""],
  ["rocks", "t3", "rlane", "gate", "rlane", "rlane", "rocks"],
  ["", "t2", "rlane", "rlane", "rlane", "forest", ""],
  ["", "t1", "quay", "lane", "quay2", "stall", ""],
  ["", "", "~", "~", "~", "lane", ""],
];

export const PORTA: Spec = {
  rows: PORTA_ROWS,
  routes: [
    [
      [2.0, 3.0],
      [2.0, 2.1],
      [3.0, 2.1],
      [3.0, 1.45],
    ],
    [
      [1.5, 2.1],
      [2.0, 2.1],
    ],
  ],
  noCarts: true,
  viewH: (a) => (a >= 1 ? Math.max(40, 62 / a) : 36),
  cell(key, i, j): Cell | null {
    if (key === "") return null;
    if (key === "~") return { water: true };
    const id = `${key}${i}${j}`;
    if (key === "lane") return { make: lane(false) };
    if (key === "rlane") return { rome: true, make: lane(true) };
    if (key === "forest") return { rome: true, make: forest };
    if (key === "rocks") return { rome: true, make: (o) => rocks(ROME(), o) };
    if (key === "mount") return { rome: true, make: (o) => mountain(ROME(), o) };
    if (key.startsWith("t")) {
      const n = Number(key.slice(1));
      const open = n <= 3;
      return {
        rome: true,
        make: (o) => tier(ROME(), n, open, o),
        place: place(
          id,
          String(n),
          `Palier ${n}`,
          open ? `${n * 2 + 3} reliques à rapporter` : "Fermé",
          open
            ? "Choisis ce palier : ton équipage y part depuis le quai."
            : `S'ouvre quand le palier ${n - 1} est franchi.`,
          open ? "Choisir ce palier" : "Voir",
        ),
      };
    }
    if (key === "gate")
      return {
        rome: true,
        make: (o) => scaled(porta(ROME(), o), 1.25),
        place: place(
          id,
          "▲",
          "La Porta",
          "Niveau 1 · 1 min depuis la Remise",
          "La porte de pierre s'ouvre sur les terres de Rome.",
          "Franchir la Porta",
        ),
      };
    if (key === "dark")
      return {
        rome: true,
        make: (o) => darkGate(ROME(), o),
        place: place(
          id,
          "◆",
          "La Porta noire",
          "Chaque combat peut tout coûter",
          "Ce qu'on y perd ne revient pas ; ce qu'on y gagne est rare.",
          "Allumer",
        ),
      };
    if (key === "stall")
      return {
        make: () => stall(HOUSE(), GEMS),
        place: place(
          id,
          "◇",
          "L'antiquaire",
          "Reliques · 12 en coffres",
          "Vends-les, ou fais-les déchiffrer en plans.",
          "Ouvrir les coffres",
        ),
      };
    if (key === "quay" || key === "quay2")
      return {
        make: () =>
          key === "quay"
            ? squad(HOUSE(), ["captain", "soldier", "knight", "crossbow"], 1.8, 0.5, 1.25)
            : withMule(),
        place:
          key === "quay"
            ? place(
                id,
                "★",
                "L'équipage",
                "Cavalier · 3 arbalétriers · capitaine",
                "Prêt au quai : touche un palier, puis franchis la Porta.",
                "Composer",
              )
            : undefined,
      };
    return null;
  },
};

const scaled = (b: Built, s: number): Built => {
  b.group.scale.setScalar(s);
  b.pin = [b.pin[0] * s, b.pin[1] * s, b.pin[2] * s];
  return b;
};

function withMule(): Built {
  const m = mule(HOUSE(), { seed: 2, running: false });
  m.group.scale.setScalar(2.3);
  m.group.rotation.y = 0.6;
  m.group.position.set(-0.6, 0, 0.4);
  const b = squad(HOUSE(), ["soldier"], 1.45);
  b.group.position.x = 1.3;
  const root = new Group();
  root.add(m.group, b.group);
  chest(HOUSE(), GEMS[1] ?? "#3FAE8C", root, 1.6, 1.6, 0.9);
  return { group: root, pin: [0, 3, 0] };
}

/** A battle in the lands of Rome: an island of biscuit, the house's column on its red road. */
const BATTLE_ROWS = [
  ["", "", "mount", "forest", "rocks", "", "", ""],
  ["", "town2", "rlane", "rlane", "forest", "town3", "", ""],
  ["", "rlane", "legion", "rlane", "rlane", "rlane", "forest", ""],
  ["gate", "rlane", "rlane", "house", "rlane", "archers", "town4", ""],
  ["", "convoy", "rlane", "forest", "rlane", "rlane", "mount", ""],
  ["", "", "~", "~", "rocks", "", "", ""],
];

export const BATTLE: Spec = {
  rows: BATTLE_ROWS,
  biscuit: true,
  noCarts: true,
  routes: [
    [
      [0.45, 3.0],
      [3.0, 3.0],
      [3.0, 2.0],
      [5.0, 2.0],
      [5.0, 1.35],
    ],
    [
      [1.0, 3.6],
      [1.0, 3.0],
    ],
  ],
  viewH: (a) => (a >= 1 ? Math.max(44, 70 / a) : 40),
  cell(key, i, j): Cell | null {
    if (key === "") return null;
    if (key === "~") return { water: true };
    const id = `${key}${i}${j}`;
    if (key === "rlane") return { rome: true, make: lane(true) };
    if (key === "forest") return { rome: true, make: forest };
    if (key === "rocks") return { rome: true, make: (o) => rocks(ROME(), o) };
    if (key === "mount") return { rome: true, make: (o) => mountain(ROME(), o) };
    if (key === "gate")
      return {
        rome: true,
        make: (o) => {
          const b = porta(HOUSE(), { ...o, running: true });
          b.group.rotation.y = -Math.PI / 2;
          return b;
        },
      };
    if (key.startsWith("town")) {
      const size = Number(key.slice(4));
      const relics = size + 1;
      return {
        rome: true,
        make: (o) => {
          const b = town(ROME(), { ...o, size });
          for (let k = 0; k < Math.min(3, relics); k++)
            chest(ROME(), GEMS[(k + size) % 4] ?? "#BFAE8E", b.group, 2.0 - k * 0.95, 2.1, 0.8);
          return b;
        },
        place: place(
          id,
          String(relics),
          ["Vicus", "Oppidum", "Castra"][size - 2] ?? "Ville",
          `${relics} reliques gardées`,
          "Prends-la : tes mules rapportent ses coffres au quai.",
          "Viser",
        ),
      };
    }
    if (key === "house")
      return {
        rome: true,
        make: () =>
          squad(HOUSE(), ["captain", "knight", "soldier", "crossbow", "soldier"], 1.9, -0.2, 1.25),
        place: place(
          id,
          "★",
          "Ton équipage",
          "875 / 1200 PV",
          "Il marche vers la ville que tu as touchée.",
          "Commander",
        ),
      };
    if (key === "legion")
      return {
        rome: true,
        make: () =>
          squad(
            ROME(),
            ["centurion", "legionary", "legionary", "legionary"],
            1.9,
            Math.PI * 0.8,
            1.25,
          ),
        place: place(
          id,
          "!",
          "Légion",
          "4 légionnaires · un centurion",
          "Ils barrent la route de l'Oppidum.",
          "Voir",
        ),
      };
    if (key === "archers")
      return {
        rome: true,
        make: () => squad(ROME(), ["archer", "archer", "archer"], 1.9, Math.PI * 1.2, 1.25),
      };
    if (key === "convoy") return { rome: true, make: () => withMule() };
    return null;
  },
};

/** The pawns, each on its tile: the house's four, then Rome's three. */
const PAWN_KINDS: (PawnKind | ".")[][] = [
  ["soldier", "crossbow", "knight", "captain"],
  ["legionary", "archer", "centurion", "."],
];
const PAWN_NAMES: Record<string, [string, string]> = {
  soldier: ["Piquier", "Le chapeau de fer et la pique"],
  crossbow: ["Arbalétrier", "L'arbalète en travers"],
  knight: ["Cavalier", "La tête de cheval, la crinière rouge"],
  captain: ["Capitaine", "La bannière de Venise"],
  legionary: ["Légionnaire", "Le casque à cimier, le scutum"],
  archer: ["Archer de Rome", "Le capuchon d'encre, l'arc"],
  centurion: ["Centurion", "Le cimier rouge en travers"],
};

export const PAWNS: Spec = {
  rows: PAWN_KINDS.map((r) => r.map(String)),
  viewH: (a) => (a >= 1 ? Math.max(22, 34 / a) : 26),
  cell(key, i, j): Cell | null {
    if (key === ".") return { make: lane(false) };
    const kind = key as PawnKind;
    const rome = j === 1;
    const [name, sign] = PAWN_NAMES[kind] ?? [kind, ""];
    return {
      rome,
      make: () => {
        const b = pawn(rome ? ROME() : HOUSE(), kind);
        b.group.scale.setScalar(2.3);
        b.pin = [0, b.pin[1] * 2.3, 0];
        return b;
      },
      place: place(
        `${key}${i}${j}`,
        String(j * 4 + i + 1),
        name,
        rome ? "Rome · biscuit et encre" : "La maison · porcelaine et rouge",
        sign,
        "Voir",
      ),
    };
  },
};

/** The HTML over the proposal, in the playful Porcellana: what the player reads over the board. */
export function PortaOverlay({ view }: { view: "porta" | "bataille" }) {
  const gems = GEMS;
  if (view === "bataille")
    return (
      <>
        <div className="pointer-events-none fixed left-5 top-5 w-72 rounded-[1.75rem] bg-white p-5 shadow-[0_4px_0_rgb(23_21_15/0.07),0_14px_40px_rgb(23_21_15/0.1)]">
          <p className="text-xs font-bold text-[#625D55]">Palier 2 · Oppidum</p>
          <p className="mt-1 font-display text-3xl font-black text-[#17150F]">
            3<span className="text-lg text-[#625D55]">/7 reliques</span>
          </p>
          <div className="mt-3 flex gap-1.5">
            {[0, 1, 2, 3, 4, 5, 6].map((k) => (
              <span
                key={k}
                className="h-4 w-4 rotate-45 rounded-[3px]"
                style={{
                  background: k < 3 ? (gems[k % 4] ?? "#ccc") : "transparent",
                  boxShadow: k < 3 ? "none" : "inset 0 0 0 2px #DDD7CD",
                }}
              />
            ))}
          </div>
        </div>
        <div className="pointer-events-none fixed left-1/2 top-5 -translate-x-1/2 rounded-full bg-[#17150F] px-6 py-2.5 text-center shadow-[0_4px_0_#000]">
          <p className="text-[0.6875rem] font-bold text-[#C9C3B9]">Fermeture</p>
          <p className="font-display text-2xl font-black leading-none text-white">8:22</p>
        </div>
        <div className="pointer-events-none fixed bottom-5 left-1/2 flex -translate-x-1/2 gap-2 rounded-full bg-white p-2 shadow-[0_4px_0_rgb(23_21_15/0.07),0_14px_40px_rgb(23_21_15/0.1)]">
          {[
            ["Cavalier", 0.73],
            ["Piquiers", 0.9],
            ["Arbalétriers", 0.55],
            ["Mules", 1],
          ].map(([n, v]) => (
            <span
              key={String(n)}
              className="flex items-center gap-2.5 rounded-full bg-[#EDE8E0] py-1.5 pl-1.5 pr-4"
            >
              <svg width="38" height="38" viewBox="0 0 64 64" aria-hidden="true">
                <circle cx="32" cy="32" r="27" fill="#fff" />
                <circle cx="32" cy="32" r="27" fill="none" stroke="#DDD7CD" strokeWidth="6" />
                <circle
                  cx="32"
                  cy="32"
                  r="27"
                  fill="none"
                  stroke={Number(v) < 0.6 ? "#C23B2E" : "#17150F"}
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${(170 * Number(v)).toFixed(0)} 170`}
                  transform="rotate(-90 32 32)"
                />
              </svg>
              <span className="font-display text-sm font-extrabold text-[#17150F]">{n}</span>
            </span>
          ))}
        </div>
      </>
    );
  return (
    <>
      <div className="pointer-events-none fixed left-5 top-5 rounded-full bg-white py-2.5 pl-5 pr-6 shadow-[0_4px_0_rgb(23_21_15/0.07),0_14px_40px_rgb(23_21_15/0.1)]">
        <p className="font-display text-xl font-black text-[#17150F]">La Porta</p>
        <p className="text-xs text-[#625D55]">Niveau 1 · palier 3 atteint · ferme dimanche</p>
      </div>
      <div className="pointer-events-none fixed bottom-5 left-1/2 flex w-[26rem] max-w-[calc(100vw-2rem)] -translate-x-1/2 flex-col gap-3 rounded-[1.75rem] bg-white p-4 shadow-[0_4px_0_rgb(23_21_15/0.07),0_14px_40px_rgb(23_21_15/0.12)]">
        <div className="flex items-center gap-2 text-sm font-bold text-[#17150F]">
          {["Équipage", "Palier 2", "Partir"].map((s, k) => (
            <span
              key={s}
              className={`flex h-9 items-center gap-2 rounded-full px-3 ${k === 2 ? "bg-[#17150F] text-white shadow-[0_3px_0_#000]" : "bg-[#EDE8E0]"}`}
            >
              <span className="font-display font-black">{k + 1}</span>
              {s}
            </span>
          ))}
        </div>
        <span className="flex h-14 items-center justify-center rounded-full bg-[#C23B2E] font-display text-base font-black text-white shadow-[0_4px_0_#8F2820]">
          Franchir la Porta
        </span>
      </div>
    </>
  );
}
