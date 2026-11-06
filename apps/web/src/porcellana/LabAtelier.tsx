/**
 * The workshops' inside at the laboratory (lot A0 of docs/plan-ateliers.md, &vue=atelier): the
 * sawmill as one enters it, still, without an engine — its hall of porcelain flagstones walled on
 * the far sides, the canal that crosses it, its four stations (to bark, to saw, to dry, to plane),
 * three hands, the red ribbons the crates go along from the door of the logs to the door of the
 * planks, and the bottleneck ringed in red. Its figures are examples, for the owner to judge the
 * look before any rule.
 */
import { type Cell, type Place, type Spec, palette } from "./TileBoard.js";
import {
  crateMover,
  debarker,
  dryer,
  floor,
  footbridge,
  logsIn,
  pillar,
  planer,
  planksOut,
  sawBench,
} from "./models/interior.js";

const P = () => palette(false);

const place = (
  id: string,
  label: string,
  name: string,
  sub: string,
  line: string,
  go: string,
  hot = false,
) => ({ id, label, tag: true, hot, info: { name, sub, line, go } }) satisfies Place;

/** The sawmill at level 3: a hall of 6 × 4 flagstones, the canal down its fourth column. */
const ROWS = [
  ["f", "bark", "f", "~", "f", "out"],
  ["in", "f", "saw", "~", "f", "plane"],
  ["f", "f", "f", "bridge", "f", "f"],
  ["pillar", "f", "f", "~", "dry", "f"],
];

export const ATELIER: Spec = {
  rows: ROWS,
  mover: crateMover,
  // From the door of the logs to the door of the planks, station to station.
  routes: [
    [
      [0.3, 1.0],
      [1.0, 1.0],
      [1.0, 0.45],
    ],
    [
      [1.45, 0.0],
      [2.0, 0.0],
      [2.0, 0.6],
    ],
    [
      [2.0, 1.4],
      [2.0, 2.0],
      [4.0, 2.0],
      [4.0, 2.55],
    ],
    [
      [4.5, 3.0],
      [5.0, 3.0],
      [5.0, 1.45],
    ],
    [
      [5.0, 0.6],
      [5.0, 0.2],
    ],
  ],
  viewH: (a) => (a >= 1 ? Math.max(34, 54 / a) : Math.max(34, 50 / a)),
  cell(key, i, j): Cell | null {
    if (key === "") return null;
    if (key === "~") return { water: true };
    const id = `${key}${i}${j}`;
    const edge = { north: j === 0, west: i === 0 };
    if (key === "f") return { make: (o) => floor(P(), o, edge) };
    if (key === "bridge") return { water: true, make: () => footbridge(P()) };
    if (key === "pillar") return { make: () => pillar(P(), edge) };
    if (key === "in")
      return {
        make: (o) => logsIn(P(), o, "west"),
        place: place(
          id,
          "Troncs · 9",
          "La porte des troncs",
          "9 troncs du fondaco",
          "Le bois entre ici, du stock du fondaco.",
          "Voir le stock",
        ),
      };
    if (key === "out")
      return {
        make: (o) => planksOut(P(), o, "north"),
        place: place(
          id,
          "Sortie · 8/h",
          "La porte des planches",
          "8 planches à l'heure",
          "Le débit de la scierie : celui de son poste le plus lent.",
          "Récolter",
        ),
      };
    if (key === "bark")
      return {
        make: (o) => debarker(P(), o, edge),
        place: place(
          id,
          "14/h",
          "L'écorçoir",
          "Niveau 1 · un manœuvre · usure 10 %",
          "Il va plus vite que la suite : ses caisses attendent devant le banc.",
          "Améliorer",
        ),
      };
    if (key === "saw")
      return {
        make: (o) => sawBench(P(), o, true),
        place: place(
          id,
          "Goulot · 8/h",
          "Le banc de scie",
          "Niveau 1 · un scieur · usure 35 %",
          "Il retient toute la scierie. Un second banc près du canal, ou un niveau, et tout monte.",
          "Améliorer",
          true,
        ),
      };
    if (key === "dry")
      return {
        make: (o) => dryer(P(), o),
        place: place(
          id,
          "12/h",
          "Le séchoir",
          "Niveau 1 · sans ouvrier",
          "Loin du banc : chaque caisse fait un long chemin par la passerelle.",
          "Améliorer",
        ),
      };
    if (key === "plane")
      return {
        make: (o) => planer(P(), o),
        place: place(
          id,
          "11/h",
          "Le rabot",
          "Niveau 1 · un menuisier · usure 20 %",
          "Les planches sortent ici, juste à côté de la porte.",
          "Améliorer",
        ),
      };
    return null;
  },
};

/** The head of the inside: the workshop, its rate in big thin figures, its quality, its plan. */
export function AtelierOverlay() {
  return (
    <div className="pointer-events-none fixed bottom-4 left-4 max-w-[calc(100vw-2rem)] rounded-[1.75rem] bg-white px-5 py-4 shadow-[0_4px_0_rgb(23_21_15/0.07),0_14px_40px_rgb(23_21_15/0.1)] sm:bottom-auto sm:left-5 sm:top-5">
      <p className="text-xs font-bold text-[#625D55]">Scierie · niveau 3</p>
      <p className="mt-0.5 font-display text-4xl font-black leading-none text-[#17150F]">
        8<span className="ml-1 text-base font-bold text-[#625D55]">planches/h</span>
      </p>
      <div className="mt-2.5 flex items-center gap-3">
        <span className="flex gap-1" role="img" aria-label="Qualité : deux sur trois">
          {[0, 1, 2].map((k) => (
            <span
              key={k}
              className="h-3 w-3 rotate-45 rounded-[2px]"
              style={{
                background: k < 2 ? "#C23B2E" : "transparent",
                boxShadow: k < 2 ? "none" : "inset 0 0 0 2px #DDD7CD",
              }}
            />
          ))}
        </span>
        <span className="rounded-full bg-[#EDE8E0] px-2.5 py-1 text-[0.6875rem] font-bold text-[#625D55]">
          Plan par défaut
        </span>
      </div>
    </div>
  );
}
