import {
  FaceLeft,
  FaceRight,
  IsoBox,
  IsoPyramid,
  IsoRoof,
  IsoTile,
  IsoTree,
  iso,
  pts,
  shade,
} from "./iso.js";
import { P } from "./palette.js";

/**
 * The workshops in volume, each on its plot of 2 × 2 cells (origin x, y). The level shows in the
 * building itself: a stone plinth and a storey at III, a tower at IV, gold roofs at V.
 */

const WALL = "#E9D8B4";
const ROOF = "#C8693F";
const WOOD = "#9A6234";
const BRICK = "#B5523A";
const STONE = "#CFC6B0";

/** Height of the workshop's roof top above the ground, for its bubble. */
export function workshopHeight(type: string, level: number): number {
  const storey = (level >= 3 ? 8 : 0) + (level >= 5 ? 6 : 0);
  const base: Record<string, number> = {
    farm: 24,
    clay_pit: 16,
    lumber_camp: 22,
    mill: 44,
    bakery: 30,
    brickworks: 44,
    sawmill: 24,
    palazzo: 40,
  };
  return (base[type] ?? 26) + storey + (level >= 4 ? 8 : 0);
}

function Smoke({ x, y, z }: { x: number; y: number; z: number }) {
  const [a, b] = iso(x, y, z);
  return (
    <g fill="#E8E1D2" opacity="0.7">
      {[0, 1, 2].map((i) => (
        <circle key={i} cx={a} cy={b} r="3">
          <animate
            attributeName="cy"
            values={`${b};${b - 18}`}
            dur="2.4s"
            begin={`${i * 0.8}s`}
            repeatCount="indefinite"
          />
          <animate
            attributeName="r"
            values="2.5;5.5"
            dur="2.4s"
            begin={`${i * 0.8}s`}
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="0.8;0"
            dur="2.4s"
            begin={`${i * 0.8}s`}
            repeatCount="indefinite"
          />
        </circle>
      ))}
    </g>
  );
}

/** A box with a gable roof, a door on its right face and a window on its left one. */
function House(props: {
  x: number;
  y: number;
  w: number;
  d: number;
  h: number;
  z?: number;
  wall: string;
  roof: string;
  night: boolean;
}) {
  const { x, y, w, d, h, z = 0 } = props;
  const lit = props.night ? P.goldSoft : "#3A2A22";
  return (
    <g>
      <IsoBox x={x} y={y} w={w} d={d} h={h} z={z} color={props.wall} />
      <FaceRight
        x={x + w}
        y={y}
        u={d * 0.35}
        v={z}
        w={d * 0.3}
        h={Math.min(10, h * 0.6)}
        fill="#4A3426"
      />
      <FaceLeft x={x} y={y + d} u={w * 0.3} v={z + h * 0.45} w={w * 0.22} h={h * 0.28} fill={lit} />
      <FaceLeft
        x={x}
        y={y + d}
        u={w * 0.62}
        v={z + h * 0.45}
        w={w * 0.22}
        h={h * 0.28}
        fill={lit}
      />
      <IsoRoof x={x} y={y} w={w} d={d} z={z + h} rise={9} color={props.roof} wall={props.wall} />
    </g>
  );
}

export function IsoWorkshop(props: {
  type: string;
  x: number;
  y: number;
  level: number;
  active: boolean;
  night: boolean;
}) {
  const { type, x, y, level, active, night } = props;
  const lift = level >= 3 ? 3 : 0;
  const storey = (level >= 3 ? 8 : 0) + (level >= 5 ? 6 : 0);
  const roof = level >= 5 ? P.gold : ROOF;
  const body = (() => {
    switch (type) {
      case "farm":
        return (
          <g>
            <IsoTile
              x={x + 0.1}
              y={y + 0.1}
              w={1.8}
              d={1.8}
              fill="#C9A44A"
              stroke={shade("#C9A44A", -0.3)}
            />
            {[0.45, 0.8, 1.15, 1.5].map((v) => (
              <polyline
                key={v}
                points={pts(iso(x + 1.05, y + v), iso(x + 1.85, y + v))}
                stroke={shade("#C9A44A", -0.35)}
                strokeWidth="1"
              />
            ))}
            {active &&
              [0.6, 1.0, 1.4].map((v) => {
                const [a, b] = iso(x + 1.45, y + v);
                return (
                  <path
                    key={v}
                    d={`M${a - 3} ${b} q3 -7 6 0`}
                    stroke="#F0D08F"
                    strokeWidth="1.4"
                    fill="none"
                  >
                    <animateTransform
                      attributeName="transform"
                      type="translate"
                      values="0 0;1 -1;0 0"
                      dur="1.6s"
                      repeatCount="indefinite"
                    />
                  </path>
                );
              })}
            <House
              x={x + 0.15}
              y={y + 0.2}
              w={0.85}
              d={1.1}
              h={14 + storey}
              z={lift}
              wall="#B8473A"
              roof={level >= 5 ? P.gold : "#6B3A2E"}
              night={night}
            />
          </g>
        );
      case "clay_pit":
        return (
          <g>
            <IsoTile x={x + 0.25} y={y + 0.25} w={1.5} d={1.5} fill="#7A4A2E" stroke="#4E2E1C" />
            {[
              [0.7, 0.7],
              [1.3, 0.9],
              [0.9, 1.35],
            ].map(([u = 0, v = 0]) => (
              <IsoPyramid
                key={`${u}-${v}`}
                x={x + u - 0.22}
                y={y + v - 0.22}
                w={0.44}
                d={0.44}
                z={0}
                rise={9}
                color={P.clay}
              />
            ))}
            <House
              x={x + 1.35}
              y={y + 0.1}
              w={0.55}
              d={0.6}
              h={11 + storey}
              z={lift}
              wall={WOOD}
              roof={roof}
              night={night}
            />
            {active && <Smoke x={x + 1} y={y + 1} z={10} />}
          </g>
        );
      case "lumber_camp":
        return (
          <g>
            <IsoTree x={x + 0.35} y={y + 0.4} s={0.9} />
            <IsoTree x={x + 1.6} y={y + 0.3} s={0.75} />
            <House
              x={x + 0.2}
              y={y + 0.85}
              w={0.8}
              d={0.8}
              h={12 + storey}
              z={lift}
              wall={WOOD}
              roof={roof}
              night={night}
            />
            {[0, 1, 2].map((i) => (
              <IsoBox
                key={i}
                x={x + 1.1}
                y={y + 1.1 + i * 0.22}
                w={0.75}
                d={0.2}
                h={4}
                z={i === 2 ? 4 : 0}
                color={shade(WOOD, 0.15)}
              />
            ))}
            {active && (
              <g>
                <IsoBox x={x + 1.15} y={y + 0.9} w={0.18} d={0.18} h={7} color="#6B4426" />
              </g>
            )}
          </g>
        );
      case "mill": {
        const h = 30 + storey;
        const [cx, cy] = iso(x + 1.45, y + 1.0, lift + h * 0.72);
        return (
          <g>
            <IsoBox x={x + 0.55} y={y + 0.55} w={0.9} d={0.9} h={h} z={lift} color={WALL} />
            <FaceLeft x={x + 0.55} y={y + 1.45} u={0.35} v={lift} w={0.22} h={9} fill="#4A3426" />
            <IsoPyramid
              x={x + 0.5}
              y={y + 0.5}
              w={1}
              d={1}
              z={lift + h}
              rise={12}
              color={level >= 5 ? P.gold : WOOD}
            />
            <g transform={`translate(${cx} ${cy})`}>
              <g>
                {active && (
                  <animateTransform
                    attributeName="transform"
                    type="rotate"
                    from="0"
                    to="360"
                    dur="5s"
                    repeatCount="indefinite"
                  />
                )}
                {[0, 90, 180, 270].map((deg) => (
                  <g key={deg} transform={`rotate(${deg})`}>
                    <path d="M0 0 L0 -21" stroke="#6B4426" strokeWidth="1.6" />
                    <path
                      d="M0 -6 L5 -7 L5 -21 L0 -21 Z"
                      fill={P.cream}
                      stroke="#6B4426"
                      strokeWidth="0.6"
                    />
                  </g>
                ))}
                <circle r="2.4" fill="#6B4426" />
              </g>
            </g>
          </g>
        );
      }
      case "bakery":
        return (
          <g>
            <House
              x={x + 0.25}
              y={y + 0.25}
              w={1.2}
              d={1.0}
              h={16 + storey}
              z={lift}
              wall={WALL}
              roof={roof}
              night={night}
            />
            <IsoBox x={x + 1.25} y={y + 1.1} w={0.55} d={0.6} h={8} color={BRICK} />
            <IsoBox
              x={x + 0.45}
              y={y + 0.35}
              w={0.22}
              d={0.22}
              h={30 + storey}
              z={0}
              color={BRICK}
            />
            {active && <Smoke x={x + 0.56} y={y + 0.46} z={32 + storey} />}
            {(() => {
              const [a, b] = iso(x + 1.8, y + 1.4, 4);
              return (
                <ellipse cx={a} cy={b} rx="3" ry="2.2" fill={active ? "#F2A03D" : "#3A2A22"} />
              );
            })()}
          </g>
        );
      case "brickworks":
        return (
          <g>
            <IsoBox
              x={x + 0.3}
              y={y + 0.3}
              w={1.1}
              d={1.1}
              h={14 + storey}
              z={lift}
              color={BRICK}
              top={shade(BRICK, -0.1)}
            />
            <FaceRight
              x={x + 1.4}
              y={y + 0.3}
              u={0.35}
              v={lift}
              w={0.4}
              h={7}
              fill={active ? "#F2A03D" : "#2A1A14"}
            />
            <IsoBox
              x={x + 0.35}
              y={y + 0.35}
              w={0.3}
              d={0.3}
              h={42 + storey}
              color={shade(BRICK, -0.1)}
            />
            {active && <Smoke x={x + 0.5} y={y + 0.5} z={44 + storey} />}
            {[0, 1].map((i) => (
              <IsoBox
                key={i}
                x={x + 1.45}
                y={y + 0.4 + i * 0.5}
                w={0.4}
                d={0.35}
                h={5}
                color={P.clay}
              />
            ))}
          </g>
        );
      case "sawmill": {
        const [cx, cy] = iso(x + 1.75, y + 1.2, 8);
        return (
          <g>
            <IsoBox x={x + 0.2} y={y + 0.3} w={1.3} d={1.1} h={12 + storey} z={lift} color={WOOD} />
            <IsoRoof
              x={x + 0.2}
              y={y + 0.3}
              w={1.3}
              d={1.1}
              z={lift + 12 + storey}
              rise={8}
              color={roof}
              wall={WOOD}
            />
            <g transform={`translate(${cx} ${cy}) scale(1 0.8)`}>
              <g>
                {active && (
                  <animateTransform
                    attributeName="transform"
                    type="rotate"
                    from="0"
                    to="360"
                    dur="1.2s"
                    repeatCount="indefinite"
                  />
                )}
                <circle r="6.5" fill="#D9D9D2" stroke={P.night} strokeWidth="0.8" />
                {[0, 45, 90, 135, 180, 225, 270, 315].map((d) => (
                  <path
                    key={d}
                    d="M0 -6.5 L1.6 -8.6 L2.2 -6.2 Z"
                    fill="#D9D9D2"
                    stroke={P.night}
                    strokeWidth="0.5"
                    transform={`rotate(${d})`}
                  />
                ))}
                <circle r="1.6" fill={P.night} />
              </g>
            </g>
            {[0, 1].map((i) => (
              <IsoBox
                key={i}
                x={x + 0.3}
                y={y + 1.5}
                w={1.0}
                d={0.18}
                h={3}
                z={i * 3}
                color={shade(WOOD, 0.3)}
              />
            ))}
          </g>
        );
      }
      case "palazzo": {
        const h = 26 + storey;
        return (
          <g>
            <IsoBox x={x + 0.1} y={y + 0.25} w={1.8} d={1.4} h={h} z={lift} color={WALL} />
            {[0.15, 0.45, 0.75, 1.05, 1.35].map((u) => (
              <g key={u}>
                <FaceLeft
                  x={x + 0.1}
                  y={y + 1.65}
                  u={u}
                  v={lift + 2}
                  w={0.18}
                  h={9}
                  fill="#4A3426"
                />
                <FaceLeft
                  x={x + 0.1}
                  y={y + 1.65}
                  u={u}
                  v={lift + 15}
                  w={0.18}
                  h={6}
                  fill={night ? P.goldSoft : "#5B4A3A"}
                />
              </g>
            ))}
            {[0.2, 0.6, 1.0].map((u) => (
              <FaceRight
                key={u}
                x={x + 1.9}
                y={y + 0.25}
                u={u}
                v={lift + 15}
                w={0.18}
                h={6}
                fill={night ? P.goldSoft : "#5B4A3A"}
              />
            ))}
            {[0, 0.45, 0.9, 1.35, 1.6].map((u) => (
              <IsoBox
                key={u}
                x={x + 0.1 + u}
                y={y + 1.45}
                w={0.2}
                d={0.2}
                h={4}
                z={lift + h}
                color={level >= 5 ? P.gold : WALL}
              />
            ))}
            <IsoBox x={x + 0.1} y={y + 0.25} w={1.8} d={0.08} h={1.5} z={lift + h} color={P.gold} />
          </g>
        );
      }
      default:
        return (
          <House
            x={x + 0.3}
            y={y + 0.3}
            w={1.2}
            d={1.2}
            h={16 + storey}
            z={lift}
            wall={WALL}
            roof={roof}
            night={night}
          />
        );
    }
  })();
  const top = workshopHeight(type, level);
  return (
    <g>
      {/* Shadow and, from level III, a stone plinth. */}
      <IsoTile x={x + 0.05} y={y + 0.05} w={1.9} d={1.9} fill="#000" opacity={0.12} />
      {level >= 3 && <IsoBox x={x + 0.08} y={y + 0.08} w={1.84} d={1.84} h={3} color={STONE} />}
      {/* Level IV: a corner tower with its flag. */}
      {level >= 4 && (
        <g>
          <IsoBox x={x + 0.05} y={y + 0.05} w={0.32} d={0.32} h={top - 4} z={lift} color={STONE} />
          <IsoPyramid
            x={x + 0.02}
            y={y + 0.02}
            w={0.38}
            d={0.38}
            z={lift + top - 4}
            rise={8}
            color={level >= 5 ? P.gold : P.vermilion}
          />
        </g>
      )}
      {body}
      {/* Level II: a banner at the front corner. */}
      {level >= 2 &&
        (() => {
          const [a, b] = iso(x + 1.95, y + 1.95);
          return (
            <g transform={`translate(${a} ${b})`}>
              <path d="M0 0 V-24" stroke={P.woodLight} strokeWidth="1.6" />
              <path d="M0 -24 H9 L6 -20 L9 -16 H0 Z" fill={level >= 4 ? P.gold : P.lagoon}>
                <animateTransform
                  attributeName="transform"
                  type="skewY"
                  values="0;5;0"
                  dur="2.6s"
                  repeatCount="indefinite"
                />
              </path>
            </g>
          );
        })()}
    </g>
  );
}
