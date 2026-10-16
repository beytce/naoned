import { P } from "./palette.js";

/**
 * Each city's monument, drawn flat for its medallion on the map: cream stone outlined in ink,
 * a touch of vermilion or lagoon. Box -16 -17 32 32, the ground at y = 10.
 */
const ink = { stroke: P.night, strokeWidth: 1.1, strokeLinejoin: "round" as const };
const stone = { fill: P.cream, ...ink };

/** Arch-topped openings, in ink. */
const arches = (xs: number[], bottom: number, height: number, w: number) =>
  xs.map((x) => (
    <path
      key={`${x}:${bottom}`}
      d={`M${x - w / 2} ${bottom} V${bottom - height + w / 2} A${w / 2} ${w / 2} 0 0 1 ${x + w / 2} ${bottom - height + w / 2} V${bottom} Z`}
      fill={P.night}
    />
  ));

/** A crenellated top from x0 to x1 at y (merlons of `w`, every other one). */
const crenels = (x0: number, x1: number, y: number, w = 2) => {
  let d = `M${x0} ${y}`;
  for (let x = x0; x < x1 - 0.01; x += 2 * w) {
    const right = Math.min(x + w, x1);
    d += ` V${y - w} H${right} V${y} H${Math.min(right + w, x1)}`;
  }
  return d;
};

const CITY: Record<string, () => JSX.Element> = {
  // The Rialto bridge, and the campanile of San Marco behind it.
  venezia: () => (
    <g>
      <rect x="5" y="-11" width="5" height="21" {...stone} />
      <rect x="5.9" y="-9" width="3.2" height="3" fill={P.night} />
      <path d="M4.5 -11 L7.5 -16.5 L10.5 -11 Z" fill={P.lagoon} {...ink} />
      <path d="M-15 10 V4 L-5.5 -1.5 L4 4 V10 Q-5.5 0.5 -15 10 Z" {...stone} />
      <path d="M-9 0.5 L-5.5 -3.5 L-2 0.5 Z" fill={P.vermilion} {...ink} />
      <path d="M-14 12.5 H3 M-11 14.5 H0" stroke={P.lagoon} strokeWidth="1.2" />
    </g>
  ),
  // The Arena: two rings of arches.
  verona: () => (
    <g>
      <path d="M-14 10 V-1 Q0 -8 14 -1 V10 Z" {...stone} />
      <path d="M-14 3.5 Q0 -2.5 14 3.5" fill="none" {...ink} />
      {arches([-10, -5, 0, 5, 10], 9.5, 4.8, 3)}
      {arches([-8, -4, 0, 4, 8], 1.8, 3, 2.2)}
    </g>
  ),
  // The city gate and a timbered house.
  treviso: () => (
    <g>
      <path d={`${crenels(-14, -3, -6)} V10 H-14 Z`} {...stone} />
      {arches([-8.5], 10, 7, 4.5)}
      <path d="M-3 10 V-1.5 L4.5 -8.5 L12 -1.5 V10 Z" {...stone} />
      <path
        d="M1 10 V-1 M8 10 V-1 M-3 3.5 H12 M1 3.5 L8 10 M8 3.5 L1 10"
        stroke={P.wood}
        strokeWidth="1"
      />
      <path
        d="M-4.5 -0.5 L4.5 -9.5 L13.5 -0.5"
        fill="none"
        stroke={P.vermilion}
        strokeWidth="2.2"
      />
    </g>
  ),
  // The Palladian basilica and its dome.
  vicenza: () => (
    <g>
      <path d="M-6.5 -3 Q-6.5 -11 0 -11 Q6.5 -11 6.5 -3 Z" fill={P.lagoon} {...ink} />
      <path d="M0 -11 V-14.5 M-3 -3 Q-3 -9 0 -10.5 M3 -3 Q3 -9 0 -10.5" fill="none" {...ink} />
      <rect x="-13" y="-3.5" width="26" height="2.5" {...stone} />
      <rect x="-11.5" y="-1" width="23" height="9" {...stone} />
      {arches([-7.5, -2.5, 2.5, 7.5], 7, 6, 3)}
      <rect x="-14" y="8" width="28" height="2.5" {...stone} />
    </g>
  ),
  // The castle's tower between its walls.
  mantova: () => (
    <g>
      <path d={`${crenels(-14, 14, 1)} V10 H-14 Z`} {...stone} />
      <path d={`${crenels(-4.5, 4.5, -9)} V10 H-4.5 Z`} {...stone} />
      <path d="M0 -11 V-16 L5 -14.5 L0 -13" fill={P.vermilion} {...ink} />
      <rect x="-1.2" y="-6" width="2.4" height="3.5" rx="1.2" fill={P.night} />
      {arches([0], 10, 6, 4)}
    </g>
  ),
  // The basilica of the Santo: a gabled front between two spires.
  padova: () => (
    <g>
      <path
        d="M-5.5 -3 Q-5.5 -9 -2.5 -9 Q0.5 -9 0.5 -3 Z M-0.5 -3 Q-0.5 -9 2.5 -9 Q5.5 -9 5.5 -3 Z"
        {...stone}
      />
      {[-11, 11].map((x) => (
        <g key={x}>
          <rect x={x - 1.5} y="-9" width="3" height="19" {...stone} />
          <path d={`M${x - 2} -9 L${x} -15.5 L${x + 2} -9 Z`} fill={P.vermilion} {...ink} />
        </g>
      ))}
      <path d="M-8 10 V-1 L0 -6.5 L8 -1 V10 Z" {...stone} />
      <circle cx="0" cy="-0.5" r="1.8" fill={P.night} />
      {arches([0], 10, 5.5, 4)}
    </g>
  ),
  // The Castello Estense: four towers above the moat.
  ferrara: () => (
    <g>
      <rect x="-15" y="8.5" width="30" height="3.5" rx="1" fill={P.lagoon} {...ink} />
      <path d={`${crenels(-9, 9, -1)} V9 H-9 Z`} {...stone} />
      {[-11, 11].map((x) => (
        <path key={x} d={`${crenels(x - 3, x + 3, -6, 1.5)} V9 H${x - 3} Z`} {...stone} />
      ))}
      <path d={`${crenels(-2.5, 2.5, -9, 1.25)} V-1 H-2.5 Z`} {...stone} />
      {arches([0], 9, 5, 3.5)}
      <rect x="-12" y="-2" width="2" height="2.5" fill={P.night} />
      <rect x="10" y="-2" width="2" height="2.5" fill={P.night} />
    </g>
  ),
};

/** A city's monument for its medallion; a plain walled town for a city without one. */
export function CityIcon({ code, className = "" }: { code: string; className?: string }) {
  const art = CITY[code];
  return (
    <svg viewBox="-16 -17 32 32" className={className} aria-hidden="true">
      {art ? (
        art()
      ) : (
        <g>
          <path d={`${crenels(-12, 12, 0)} V10 H-12 Z`} {...stone} />
          <path d={`${crenels(-4, 4, -8)} V10 H-4 Z`} {...stone} />
          {arches([0], 10, 6, 4)}
        </g>
      )}
    </svg>
  );
}
