/**
 * The Terraferma's board on the screen (lot T2): the 3D board in its canvas, the labels of the
 * towns and the camps over it; without WebGL, the same sheet of glaze seen from above, flat.
 */
import "../porcellana.css";
import { Canvas } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import type { OrthographicCamera } from "three";
import { MAP_3D } from "../../empire/map3d/flag.js";
import { TerraBoard, type TerraSceneProps } from "./TerraBoard.js";
import { paintGlaze } from "./paint.js";

export interface TerraSceneOuter extends Omit<TerraSceneProps, "labels"> {
  /** A town's name from its code. */
  townName: (code: string) => string;
  /** A camp's label (the holder's name), from its cell; null: none. */
  campName?: (cell: number) => string | null;
  /** A camp's label touched (its holder's dock). */
  onCamp?: (cell: number) => void;
  /** Force the flat board (the tests, a weak device). */
  flat?: boolean;
}

export function TerraScene(props: TerraSceneOuter) {
  const { pic, townName, campName } = props;
  const labels = useMemo(() => new Map<string, HTMLElement>(), []);
  const keyed: { key: string; text: string; camp: boolean; front?: string; cell?: number }[] = [
    ...pic.cities.map((c) => ({ key: `town:${c.cell}`, text: townName(c.code), camp: false })),
    // The count of men at the head of the merchant's fronts and of those that threaten it.
    ...pic.fronts.flatMap((f) =>
      f.mine || f.threat
        ? [
            {
              key: `front:x:${f.id}`,
              text: String(f.troops),
              camp: false,
              front: f.mine ? "mine" : "threat",
            },
          ]
        : [],
    ),
    ...pic.camps.flatMap((c) => {
      const t = campName?.(c.cell);
      return t && pic.owner[c.cell] === c.holder && !pic.cities.some((x) => x.cell === c.cell)
        ? [{ key: `camp:${c.cell}`, text: t, camp: true, cell: c.cell }]
        : [];
    }),
  ];
  if (props.flat || !MAP_3D) return <FlatTerra {...props} />;
  return (
    <div className="porcellana absolute inset-0" data-terra-board="3d">
      <Canvas
        orthographic
        dpr={window.innerWidth < 640 ? [1, 1.5] : [1, 2]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        onCreated={({ camera }) => {
          (camera as OrthographicCamera & { manual?: boolean }).manual = true;
        }}
        onPointerMissed={() => props.onCell(null)}
      >
        <TerraBoard {...props} labels={labels} />
      </Canvas>
      <div className="pc-pins" aria-hidden="true">
        {keyed.map((k) =>
          // A camp's name is touched: its holder's dock (out of the tab order, the Allies list
          // offers the same).
          k.camp && props.onCamp && k.cell !== undefined ? (
            <button
              type="button"
              tabIndex={-1}
              key={k.key}
              ref={(el) => {
                if (el) labels.set(k.key, el);
                else labels.delete(k.key);
              }}
              className="pc-terra-camp"
              data-touch=""
              data-out="false"
              onClick={() => props.onCamp?.(k.cell as number)}
            >
              {k.text}
            </button>
          ) : (
            <span
              key={k.key}
              ref={(el) => {
                if (el) labels.set(k.key, el);
                else labels.delete(k.key);
              }}
              className={k.front ? "pc-terra-front" : k.camp ? "pc-terra-camp" : "pc-terra-town"}
              data-tone={k.front}
              data-out="false"
            >
              {k.text}
            </span>
          ),
        )}
      </div>
    </div>
  );
}

const PPC = 24;

/** Without WebGL: the sheet of glaze as it is, seen from above; a cell touched is chosen. */
function FlatTerra({ pic, chosen, onCell, townName }: TerraSceneOuter) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    paintGlaze(ctx, pic, [], 0, PPC);
    ctx.font = "italic 600 14px 'Cormorant Garamond', Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#17150F";
    for (const c of pic.cities) {
      const x = ((c.cell % pic.width) + 0.5) * PPC;
      const y = (Math.floor(c.cell / pic.width) + 0.5) * PPC;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillText(townName(c.code), x, y + 16);
    }
    if (chosen !== null) {
      ctx.strokeStyle = "#C23B2E";
      ctx.lineWidth = 3;
      ctx.strokeRect(
        (chosen % pic.width) * PPC + 1.5,
        Math.floor(chosen / pic.width) * PPC + 1.5,
        PPC - 3,
        PPC - 3,
      );
    }
  }, [pic, chosen, townName]);
  return (
    <div className="porcellana absolute inset-0 overflow-auto" data-terra-board="flat">
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: a cell is touched; Escape lets go, the dock follows. */}
      <canvas
        ref={ref}
        width={pic.width * PPC}
        height={pic.height * PPC}
        className="block h-auto w-full"
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const i = Math.floor(((e.clientX - r.left) / r.width) * pic.width);
          const j = Math.floor(((e.clientY - r.top) / r.height) * pic.height);
          const c = j * pic.width + i;
          onCell(c === chosen || pic.terrain[c] === "w" ? null : c);
        }}
      />
    </div>
  );
}
