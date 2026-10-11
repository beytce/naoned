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

/** Land map of the Terraferma: cities and the three regions' depots (from their lat/long). */
export const LAND: Record<string, [number, number]> = {
  venezia: [267, 144],
  padova: [199, 149],
  verona: [66, 144],
  vicenza: [150, 128],
  treviso: [254, 110],
  mantova: [36, 186],
  ferrara: [161, 234],
  terraferma: [138, 176],
  lagoon: [266, 186],
  dolomites: [214, 30],
};

/** A point along a road `region:city`, at `f` (0 at the depot, 1 at the city). */
export function alongRoad(route: string, f: number): [number, number] {
  const [region = "", city = ""] = route.split(":");
  const [x0, y0] = LAND[region] ?? [0, 0];
  const [x1, y1] = LAND[city] ?? [0, 0];
  const k = Math.max(0, Math.min(1, f));
  return [x0 + (x1 - x0) * k, y0 + (y1 - y0) * k];
}

/**
 * Map of the roads from one region to the cities. Roads where bandits lie in wait are dashed red
 * with a mark; deliveries under way are dots moving along their road.
 */
export function RoadMap(props: {
  region: string;
  regions: { code: string; name: string }[];
  cities: { code: string; name: string }[];
  /** Cities reached from the region. */
  reached: string[];
  watched: string[];
  selected?: string | null;
  /** Dots of deliveries: road and position (0 to 1, out then back). */
  dots: { id: string; route: string; f: number; alarm: boolean }[];
  onSelect?: (city: string) => void;
}) {
  const [hx, hy] = LAND[props.region] ?? [0, 0];
  return (
    <svg viewBox="0 0 320 260" className="w-full" role="img" aria-label="Carte des routes">
      <rect width="320" height="260" fill="#1C2A1F" />
      {/* The lagoon and the sea to the east, the Po to the south. */}
      <path d="M285 0 H320 V260 H250 Q270 200 285 150 Q300 100 285 0 Z" fill="#13262A" />
      <path
        d="M0 214 Q60 200 110 220 T210 222 T300 205"
        fill="none"
        stroke={P.lagoon}
        strokeOpacity="0.45"
        strokeWidth="2"
      />
      {/* The Alps to the north. */}
      <path
        d="M90 55 L110 30 L125 48 L145 18 L165 45 L185 22 L205 50 L230 20 L250 48 L270 30 L285 55"
        fill="none"
        stroke={P.cream}
        strokeOpacity="0.18"
        strokeWidth="1.2"
      />
      {props.reached.map((city) => {
        const route = `${props.region}:${city}`;
        const [x, y] = LAND[city] ?? [0, 0];
        const watched = props.watched.includes(route);
        const on = props.selected === city;
        return (
          <g key={route}>
            <line
              x1={hx}
              y1={hy}
              x2={x}
              y2={y}
              stroke={watched ? P.vermilion : on ? P.gold : P.cream}
              strokeOpacity={watched || on ? 1 : 0.35}
              strokeWidth={on ? 2.4 : 1.5}
              strokeDasharray={watched ? "3 3" : "6 4"}
            />
            {watched && (
              <text
                x={(hx + x) / 2}
                y={(hy + y) / 2 - 4}
                textAnchor="middle"
                fontSize="11"
                fill={P.vermilion}
              >
                ⚔
              </text>
            )}
          </g>
        );
      })}
      {props.cities.map((c) => {
        const [x, y] = LAND[c.code] ?? [0, 0];
        const reached = props.reached.includes(c.code);
        const on = props.selected === c.code;
        return (
          // biome-ignore lint/a11y/useKeyWithClickEvents: the order list offers the same choice
          <g
            key={c.code}
            onClick={() => reached && props.onSelect?.(c.code)}
            className={reached ? "cursor-pointer" : ""}
            opacity={reached ? 1 : 0.4}
          >
            <circle cx={x} cy={y} r="12" fill="transparent" />
            {on && <circle cx={x} cy={y} r="8" fill="none" stroke={P.gold} strokeWidth="1.5" />}
            <rect x={x - 4} y={y - 4} width="8" height="8" fill={P.cream} stroke={P.night} />
            <text
              x={x}
              y={y + 16}
              textAnchor="middle"
              fill={P.cream}
              fontSize="8"
              fontFamily="Space Grotesk, sans-serif"
              fontWeight="600"
            >
              {c.name}
            </text>
          </g>
        );
      })}
      <g>
        <circle cx={hx} cy={hy} r="7" fill={P.gold} />
        <text
          x={hx}
          y={hy - 11}
          textAnchor="middle"
          fill={P.gold}
          fontSize="9"
          fontWeight="800"
          fontFamily="Archivo Variable, sans-serif"
        >
          {(props.regions.find((r) => r.code === props.region)?.name ?? "").toUpperCase()}
        </text>
      </g>
      {props.dots.map((dot) => {
        const [x, y] = alongRoad(dot.route, dot.f);
        return (
          <circle
            key={dot.id}
            cx={x}
            cy={y}
            r="4"
            fill={dot.alarm ? P.vermilion : P.gold}
            stroke={P.night}
            strokeWidth="1.5"
          />
        );
      })}
    </svg>
  );
}
