import type { ReactNode } from "react";
import { fr } from "../i18n.js";
import { CloseButton, Label, useOverlay } from "../ui.js";

const t = () => fr.game.terraGuide;

// ——— A small kit for the diagrams: pointy hexagons, odd rows shifted, as on the map ———

const R = 14;
const W = Math.sqrt(3) * R;

/** Centre of the cell at column `c`, row `r`. */
function at(c: number, r: number): [number, number] {
  return [20 + W * (c + 0.5 * (r & 1)), 20 + 1.5 * R * r];
}

function hexPoints(c: number, r: number, scale = 0.94): string {
  const [x, y] = at(c, r);
  return Array.from({ length: 6 }, (_, k) => {
    const a = (Math.PI / 180) * (60 * k - 30);
    return `${(x + R * scale * Math.cos(a)).toFixed(1)},${(y + R * scale * Math.sin(a)).toFixed(1)}`;
  }).join(" ");
}

type Tone = "me" | "rival" | "ally" | "free" | "milan" | "water" | "lost";

const FILL: Record<Tone, string> = {
  me: "rgb(var(--gold) / 0.55)",
  rival: "rgb(var(--vermilion) / 0.45)",
  ally: "rgb(var(--lagoon) / 0.45)",
  free: "rgb(var(--cream) / 0.08)",
  milan: "rgb(var(--vermilion-deep) / 0.55)",
  water: "rgb(var(--info) / 0.35)",
  lost: "rgb(var(--cream) / 0.18)",
};

interface Cell {
  c: number;
  r: number;
  tone: Tone;
  text?: string;
  /** Drawn brighter: the cell the diagram is about. */
  focus?: boolean;
}

function Hexes({ cells }: { cells: Cell[] }) {
  return (
    <>
      {cells.map((x) => {
        const [cx, cy] = at(x.c, x.r);
        return (
          <g key={`${x.c}:${x.r}`}>
            <polygon
              points={hexPoints(x.c, x.r)}
              fill={FILL[x.tone]}
              stroke={x.focus ? "rgb(var(--gold-soft))" : "rgb(var(--line))"}
              strokeWidth={x.focus ? 2 : 1}
            />
            {x.text && (
              <text
                x={cx}
                y={cy + 4}
                textAnchor="middle"
                fontSize="11"
                fontWeight="700"
                fill="rgb(var(--cream))"
              >
                {x.text}
              </text>
            )}
          </g>
        );
      })}
    </>
  );
}

/** An arrow from one cell to another, dashed like a front on the map. */
function Arrow({
  from,
  to,
  tone = "gold",
}: {
  from: [number, number];
  to: [number, number];
  tone?: "gold" | "vermilion" | "info";
}) {
  const [x1, y1] = at(...from);
  const [x2, y2] = at(...to);
  const color = `rgb(var(--${tone}))`;
  const a = Math.atan2(y2 - y1, x2 - x1);
  const hx = x2 - Math.cos(a) * 6;
  const hy = y2 - Math.sin(a) * 6;
  return (
    <g stroke={color} fill={color}>
      <line x1={x1} y1={y1} x2={hx} y2={hy} strokeWidth="2.2" strokeDasharray="4 3" />
      <polygon
        points={`${x2},${y2} ${hx - Math.sin(a) * 5},${hy + Math.cos(a) * 5} ${hx + Math.sin(a) * 5},${hy - Math.cos(a) * 5}`}
        stroke="none"
      />
    </g>
  );
}

function Note({
  x,
  y,
  children,
  tone = "cream-dim",
}: { x: number; y: number; children: string; tone?: string }) {
  return (
    <text
      x={x}
      y={y}
      fontSize="10"
      fill={`rgb(var(--${tone}))`}
      fontFamily="Space Grotesk, system-ui, sans-serif"
    >
      {children}
    </text>
  );
}

function Diagram({ children, height = 120 }: { children: ReactNode; height?: number }) {
  return (
    <svg
      viewBox={`0 0 300 ${height}`}
      width="100%"
      role="img"
      aria-hidden="true"
      className="block cut bg-night-3 ring-1 ring-inset ring-line"
    >
      {children}
    </svg>
  );
}

const ring = (c: number, r: number, tone: Tone, centre?: Partial<Cell>): Cell[] => {
  const odd = r & 1;
  const around = odd
    ? [
        [1, 0],
        [-1, 0],
        [0, -1],
        [1, -1],
        [0, 1],
        [1, 1],
      ]
    : [
        [1, 0],
        [-1, 0],
        [-1, -1],
        [0, -1],
        [-1, 1],
        [0, 1],
      ];
  return [
    { c, r, tone, ...centre },
    ...around.map(([dc, dr]) => ({ c: c + (dc as number), r: r + (dr as number), tone })),
  ];
};

// ——— The diagrams ———

function SetDown() {
  return (
    <Diagram>
      <Hexes
        cells={[
          ...[0, 1, 2, 3, 4, 5, 6, 7, 8].flatMap((c) =>
            [0, 1, 2, 3, 4].map((r) => ({ c, r, tone: "free" as Tone })),
          ),
          ...ring(3, 2, "me", { text: "★", focus: true }),
        ]}
      />
      <Note x={200} y={40} tone="gold">
        ★ votre camp
      </Note>
      <Note x={200} y={56}>
        + ses 6 voisines
      </Note>
      <Note x={200} y={80}>
        trêve : 12 h
      </Note>
    </Diagram>
  );
}

function Troops() {
  return (
    <Diagram height={90}>
      <rect
        x="20"
        y="22"
        width="180"
        height="22"
        rx="11"
        fill="rgb(var(--night))"
        stroke="rgb(var(--line))"
      />
      <rect x="20" y="40" width="130" height="4" fill="rgb(var(--lagoon))" />
      <text x="34" y="37" fontSize="12" fontWeight="700" fill="rgb(var(--cream))">
        ⚔ 60 / 80
      </text>
      <text x="120" y="37" fontSize="11" fill="rgb(var(--lagoon))">
        +13/h
      </text>
      <Note x={20} y={66}>
        6 recrues/h + 1 par terre + 3 par ville
      </Note>
      <Note x={20} y={80} tone="gold">
        « Max » relève le plafond (ducats)
      </Note>
    </Diagram>
  );
}

function Front() {
  return (
    <Diagram>
      <Hexes
        cells={[
          ...ring(1, 2, "me"),
          { c: 3, r: 1, tone: "free", text: "8" },
          { c: 3, r: 2, tone: "free", text: "12", focus: true },
          { c: 4, r: 2, tone: "free", text: "28" },
          { c: 3, r: 3, tone: "free", text: "18" },
          { c: 4, r: 1, tone: "free" },
          { c: 4, r: 3, tone: "free" },
        ]}
      />
      <Arrow from={[1, 2]} to={[3, 2]} />
      <Note x={165} y={30}>
        plaine 8 · colline 12
      </Note>
      <Note x={165} y={46}>
        marais 18 · montagne 28
      </Note>
      <Note x={165} y={70} tone="gold">
        50 % des troupes →
      </Note>
      <Note x={165} y={86}>
        une case / 30 min
      </Note>
      <Note x={165} y={102}>
        (1 h en terre libre)
      </Note>
    </Diagram>
  );
}

function Defend() {
  return (
    <Diagram>
      <Hexes
        cells={[
          ...ring(2, 2, "me", { text: "♜" }),
          { c: 4, r: 2, tone: "me", text: "6" },
          { c: 5, r: 2, tone: "rival", text: "4" },
          { c: 5, r: 1, tone: "rival" },
          { c: 2, r: 4, tone: "rival" },
          { c: 3, r: 4, tone: "me", text: "1" },
          { c: 4, r: 4, tone: "rival" },
        ]}
      />
      <Arrow from={[5, 1]} to={[4, 2]} tone="vermilion" />
      <Note x={175} y={30}>
        défense = troupes ÷ terres
      </Note>
      <Note x={175} y={46} tone="gold">
        ♜ fort : ×1,6 sur 7 cases
      </Note>
      <Note x={175} y={70}>
        une poche coupée de
      </Note>
      <Note x={175} y={86}>
        votre capitale tombe
      </Note>
      <Note x={175} y={102}>
        peu à peu
      </Note>
    </Diagram>
  );
}

function Peasants() {
  return (
    <Diagram>
      <Hexes
        cells={[
          { c: 0, r: 1, tone: "me", text: "🌾" },
          { c: 1, r: 1, tone: "me", text: "🧱" },
          { c: 2, r: 1, tone: "me", text: "🌲" },
          { c: 4, r: 1, tone: "me", text: "🏛" },
          { c: 5, r: 1, tone: "me" },
          { c: 6, r: 1, tone: "me", text: "🏛" },
        ]}
      />
      <Note x={10} y={70}>
        plaine → blé · colline → argile
      </Note>
      <Note x={10} y={86}>
        montagne → bois, vers votre comptoir
      </Note>
      <Note x={150} y={20} tone="gold">
        2 villes reliées = ducats
      </Note>
      <rect x="20" y="96" width="260" height="6" rx="3" fill="rgb(var(--night))" />
      <rect x="20" y="96" width="130" height="6" rx="3" fill="rgb(var(--vermilion) / 0.7)" />
      <rect x="150" y="96" width="130" height="6" rx="3" fill="rgb(var(--lagoon) / 0.7)" />
      <Note x={20} y={114} tone="vermilion">
        ⚔ soldats : recrues
      </Note>
      <Note x={170} y={114} tone="lagoon">
        paysans : récoltes
      </Note>
    </Diagram>
  );
}

function Water() {
  return (
    <Diagram>
      <Hexes
        cells={[
          ...[0, 1, 2, 3].map((r) => ({ c: 0, r, tone: "me" as Tone })),
          { c: 1, r: 2, tone: "me", text: "⚓", focus: true },
          ...[0, 1, 2, 3].flatMap((r) => [2, 3, 4].map((c) => ({ c, r, tone: "water" as Tone }))),
          ...[0, 1, 2, 3].map((r) => ({ c: 5, r, tone: "rival" as Tone })),
          { c: 5, r: 1, tone: "rival", text: "⚓" },
        ]}
      />
      <Arrow from={[1, 2]} to={[5, 2]} tone="info" />
      <Note x={175} y={30}>
        ⚓ port sur une rive
      </Note>
      <Note x={175} y={46}>
        barque : 10 min
      </Note>
      <Note x={175} y={62}>
        par case d'eau
      </Note>
      <Note x={175} y={86} tone="vermilion">
        un port ennemi sur
      </Note>
      <Note x={175} y={102} tone="vermilion">
        ces eaux : −30 %
      </Note>
    </Diagram>
  );
}

function Bombard() {
  return (
    <Diagram>
      <circle
        cx={at(1, 2)[0]}
        cy={at(1, 2)[1]}
        r={4 * W}
        fill="rgb(var(--vermilion) / 0.06)"
        stroke="rgb(var(--vermilion) / 0.4)"
        strokeDasharray="3 3"
      />
      <Hexes
        cells={[
          { c: 1, r: 2, tone: "me", text: "✹", focus: true },
          ...ring(4, 2, "lost"),
          { c: 2, r: 4, tone: "rival", text: "▦" },
          { c: 3, r: 4, tone: "rival" },
        ]}
      />
      <Arrow from={[1, 2]} to={[4, 2]} tone="vermilion" />
      <Note x={190} y={30}>
        ✹ un tir par jour,
      </Note>
      <Note x={190} y={46}>
        portée 4 cases :
      </Note>
      <Note x={190} y={62}>
        7 cases redeviennent
      </Note>
      <Note x={190} y={78}>
        libres
      </Note>
      <Note x={190} y={102} tone="gold">
        ▦ remparts : à l'abri
      </Note>
    </Diagram>
  );
}

function Nations() {
  const rows: [string, string][] = [
    ["Milan", "frappe le voisin le plus faible"],
    ["Mantoue", "rend les coups à qui l'attaque"],
    ["Ferrare", "tombe sur les faibles"],
    ["Aquilée", "s'étend lentement"],
    ["L'Empire", "pille depuis les Alpes"],
  ];
  return (
    <Diagram height={110}>
      {rows.map(([n, d], k) => (
        <g key={n}>
          <rect
            x="14"
            y={12 + k * 19}
            width="12"
            height="12"
            fill="rgb(var(--vermilion-deep) / 0.7)"
          />
          <text x="34" y={22 + k * 19} fontSize="11" fontWeight="700" fill="rgb(var(--cream))">
            {n}
          </text>
          <Note x={110} y={22 + k * 19}>
            {d}
          </Note>
        </g>
      ))}
    </Diagram>
  );
}

function Diplomacy() {
  return (
    <Diagram>
      <Hexes cells={[...ring(1, 2, "me"), ...ring(5, 2, "ally")]} />
      <line
        x1={at(2, 2)[0]}
        y1={at(2, 2)[1]}
        x2={at(4, 2)[0]}
        y2={at(4, 2)[1]}
        stroke="rgb(var(--lagoon))"
        strokeWidth="2"
      />
      <Note x={60} y={14} tone="lagoon">
        alliés : pas de front entre vous
      </Note>
      <Note x={190} y={50}>
        🆘 🙏 🕊 signaux
      </Note>
      <Note x={190} y={66}>
        ⚔ cible pour vos alliés
      </Note>
      <Note x={190} y={82}>
        troupes et ducats
      </Note>
      <Note x={190} y={98}>
        embargo d'une ville
      </Note>
    </Diagram>
  );
}

function Win() {
  return (
    <Diagram height={110}>
      <Note x={14} y={24} tone="gold">
        Gloire, chaque heure ouverte :
      </Note>
      <Note x={14} y={40}>
        1 par terre · 3 par ville
      </Note>
      {[
        [40, 2, 36],
        [90, 1, 50],
        [140, 3, 26],
      ].map(([x, rank, h]) => (
        <g key={rank}>
          <rect
            x={x}
            y={100 - (h as number)}
            width="40"
            height={h}
            fill={rank === 1 ? "rgb(var(--gold))" : "rgb(var(--night-4))"}
          />
          <text
            x={(x as number) + 20}
            y={96}
            textAnchor="middle"
            fontSize="12"
            fontWeight="800"
            fill={rank === 1 ? "rgb(var(--ink))" : "rgb(var(--cream))"}
          >
            {rank}
          </text>
        </g>
      ))}
      <Note x={196} y={58} tone="gold">
        1er : Signore
      </Note>
      <Note x={196} y={74}>
        son décret, la
      </Note>
      <Note x={196} y={90}>
        semaine suivante
      </Note>
    </Diagram>
  );
}

function Battle() {
  return (
    <Diagram height={90}>
      <rect x="14" y="20" width="272" height="10" rx="5" fill="rgb(var(--night))" />
      <rect
        x={14 + (272 * 12) / 14}
        y="20"
        width={272 / 14}
        height="10"
        fill="rgb(var(--vermilion))"
      />
      <Note x={14} y={46}>
        8 h
      </Note>
      <Note x={258} y={46}>
        22 h
      </Note>
      <Note x={196} y={14} tone="vermilion">
        20 h–21 h : ×10
      </Note>
      <Note x={14} y={70} tone="gold">
        ⚔ Escarmouche : 15 min en direct,
      </Note>
      <Note x={14} y={84}>
        le rang rapporte de la Gloire
      </Note>
    </Diagram>
  );
}

const DIAGRAMS: Record<string, () => ReactNode> = {
  setDown: SetDown,
  troops: Troops,
  front: Front,
  defend: Defend,
  peasants: Peasants,
  water: Water,
  bombard: Bombard,
  nations: Nations,
  diplomacy: Diplomacy,
  win: Win,
  battle: Battle,
};

/**
 * The Terraferma explained: a page a rule, each with its diagram drawn as on the map (hexagons,
 * the merchant in gold, rivals in cinnabar, allies in lagoon, water in lapis).
 */
export function TerraGuide({ onClose }: { onClose: () => void }) {
  useOverlay(true, onClose);
  return (
    // biome-ignore lint/a11y/useSemanticElements: a full-screen layer, like the help.
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t().title}
      className="fixed inset-0 z-50 animate-fade overflow-y-auto overscroll-contain bg-night"
    >
      <div className="mx-auto max-w-md space-y-6 px-5 pb-12 pt-[max(1.5rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between">
          <Label className="text-cream-dim">{t().kicker}</Label>
          <CloseButton onClick={onClose} />
        </div>
        <h1 className="font-display text-3xl font-extrabold uppercase">{t().title}</h1>
        <p className="text-cream-dim">{t().intro}</p>
        {t().sections.map((s, k) => {
          const Draw = DIAGRAMS[s.diagram];
          return (
            <section key={s.title} className="space-y-2">
              <h2 className="font-display text-base font-extrabold uppercase">
                <span className="text-info">{k + 1}.</span> {s.title}
              </h2>
              {Draw && <Draw />}
              <p className="text-sm text-cream-dim">{s.text}</p>
            </section>
          );
        })}
      </div>
    </div>
  );
}
