import { P } from "./palette.js";

/** Port positions on the sea chart (Venice at the top of the Adriatic). */
export const CHART: Record<string, [number, number]> = {
  venezia: [93, 63],
  ragusa: [145, 89],
  corfu: [161, 120],
  candia: [208, 160],
  constantinople: [243, 103],
  cyprus: [283, 160],
  acre: [298, 182],
  alexandria: [251, 198],
  caffa: [300, 62],
  bruges: [16, 14],
};

/** Where each name sits around its port: [dx, dy, anchor]. */
const LABEL: Record<string, [number, number, "start" | "end" | "middle"]> = {
  bruges: [7, 3.5, "start"],
  ragusa: [7, 3.5, "start"],
  corfu: [7, 3.5, "start"],
  candia: [0, 13, "middle"],
  constantinople: [0, -9, "middle"],
  cyprus: [-7, -5, "end"],
  acre: [-7, 3.5, "end"],
  alexandria: [-7, 3.5, "end"],
  caffa: [-7, 3.5, "end"],
};

/** Waypoints so routes follow the sea rather than crossing land. */
const VIA: Record<string, [number, number][]> = {
  constantinople: [
    [178, 132],
    [222, 128],
  ],
  caffa: [
    [178, 132],
    [222, 128],
    [262, 92],
  ],
  cyprus: [
    [178, 132],
    [235, 165],
  ],
  acre: [
    [178, 132],
    [240, 172],
  ],
  alexandria: [
    [178, 132],
    [220, 182],
  ],
  candia: [[178, 134]],
  bruges: [
    [150, 150],
    [70, 185],
    [8, 160],
    [4, 60],
  ],
};

function path(code: string): string {
  const pts = [CHART.venezia, ...(VIA[code] ?? []), CHART[code]].filter(
    (p): p is [number, number] => p !== undefined,
  );
  return pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x} ${y}`).join(" ");
}

/**
 * Sea chart of the Venetian routes. Routes watched by privateers are drawn in red; the selected
 * port glows.
 */
export function SeaChart(props: {
  ports: { code: string; name: string }[];
  watched: string[];
  selected?: string | null;
  sailing: string[];
  onSelect: (code: string) => void;
}) {
  return (
    <svg viewBox="0 0 320 215" className="w-full" role="img" aria-label="Carte des routes">
      <defs>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path
            d="M0 10 Q5 7 10 10 T20 10"
            fill="none"
            stroke={P.lagoon}
            strokeOpacity="0.18"
            strokeWidth="0.5"
          />
        </pattern>
      </defs>
      <rect width="320" height="215" fill="#13262A" />
      <rect width="320" height="215" fill="url(#grid)" opacity="0.6" />
      {/* Compass rose */}
      <g transform="translate(40 120)" opacity="0.5">
        <path d="M0 -14 L3 0 L0 14 L-3 0 Z" fill={P.gold} />
        <path d="M-14 0 L0 -3 L14 0 L0 3 Z" fill={P.goldDeep} />
      </g>
      {props.ports.map((p) => {
        const watched = props.watched.includes(p.code);
        const on = props.selected === p.code;
        return (
          <path
            key={`route-${p.code}`}
            d={path(p.code)}
            fill="none"
            stroke={watched ? P.vermilion : on ? P.gold : P.lagoon}
            strokeWidth={on ? 2.2 : 1.4}
            strokeDasharray={watched ? "2 3" : "5 4"}
            opacity={on || watched ? 1 : 0.55}
          />
        );
      })}
      <g>
        <circle cx={CHART.venezia?.[0]} cy={CHART.venezia?.[1]} r="7" fill={P.gold} />
        <text
          x={(CHART.venezia?.[0] ?? 0) - 10}
          y={(CHART.venezia?.[1] ?? 0) - 10}
          fill={P.gold}
          fontSize="9"
          fontWeight="800"
          fontFamily="Archivo Variable, sans-serif"
          style={{ fontStretch: "125%" }}
        >
          VENISE
        </text>
      </g>
      {props.ports.map((p) => {
        const [x, y] = CHART[p.code] ?? [0, 0];
        const on = props.selected === p.code;
        const sailing = props.sailing.includes(p.code);
        return (
          // biome-ignore lint/a11y/useKeyWithClickEvents: the port list below offers the same choice
          <g key={p.code} onClick={() => props.onSelect(p.code)} className="cursor-pointer">
            <circle cx={x} cy={y} r="11" fill="transparent" />
            {on && <circle cx={x} cy={y} r="9" fill="none" stroke={P.gold} strokeWidth="1.5" />}
            <circle cx={x} cy={y} r="4.5" fill={sailing ? P.gold : P.cream} stroke={P.night} />
            <text
              x={x + (LABEL[p.code]?.[0] ?? 7)}
              y={y + (LABEL[p.code]?.[1] ?? 3.5)}
              textAnchor={LABEL[p.code]?.[2] ?? "start"}
              fill={P.cream}
              fontSize="8"
              fontFamily="Space Grotesk, sans-serif"
              fontWeight="600"
            >
              {p.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
