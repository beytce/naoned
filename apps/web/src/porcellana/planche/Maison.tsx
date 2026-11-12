/**
 * The house's growth on screen (docs/plan-progression-maison.md M4), as on the mock-up of
 * 11 November (screens 1c and 1d): a red ring around the medallion that fills toward the next
 * level; the house's sheet (the week's Prestige, the title, the path of the levels and what they
 * open); its façade and its Livre; the moment a level is reached.
 */
import type { ReactNode } from "react";
import { Emblem } from "../../art/logo.js";

/** What `/api/maison` gives. */
export interface MaisonView {
  name: string;
  house: string;
  level: number;
  title: string;
  prestige: number;
  from: number;
  to: number | null;
  week: number;
  carry: number;
  weeklyCap: number;
  credits: { week: number; amount: number }[];
  caps: { bobbins: number; tiles: number; tier: number; towers: number };
  opens: ({ level: number; at: number } & Partial<
    Record<"bobbins" | "tiles" | "tier" | "towers", number>
  >)[];
  flags: string[];
  collection: Record<string, number>;
  kept: number;
  livre: { kind: string; data: string | null; at: number }[];
}

const TIERS = ["", "les matières", "les ouvrages", "le bel ouvrage"];

/** What a level opens, in words. */
export function opensOf(o: MaisonView["opens"][number]): string {
  const said: string[] = [];
  if (o.bobbins) said.push(`une ${o.bobbins}ᵉ bobine`);
  if (o.tier) said.push(TIERS[o.tier] ?? `l'étage ${o.tier}`);
  if (o.towers) said.push(o.towers === 2 ? "une deuxième tour" : `${o.towers} tours tenues`);
  if (o.tiles) said.push(`l'île à ${o.tiles} cases`);
  return said.join(", ");
}

/** The medallion, its ring filling toward the next level, the level's number on it. */
export function MaisonRing({ m, size = 36 }: { m: MaisonView | null; size?: number }) {
  if (!m) return <Emblem size={size} />;
  const share = m.to === null ? 1 : Math.min(1, (m.prestige - m.from) / Math.max(1, m.to - m.from));
  const r = size / 2 + 3;
  const c = 2 * Math.PI * r;
  return (
    <span className="pc-mn-ring" style={{ width: size + 10, height: size + 10 }}>
      <svg
        width={size + 10}
        height={size + 10}
        viewBox={`0 0 ${size + 10} ${size + 10}`}
        aria-hidden="true"
      >
        <circle
          cx={(size + 10) / 2}
          cy={(size + 10) / 2}
          r={r}
          fill="none"
          stroke="#e4dfd6"
          strokeWidth="3"
        />
        <circle
          cx={(size + 10) / 2}
          cy={(size + 10) / 2}
          r={r}
          fill="none"
          stroke="var(--pc-accent)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={`${(c * share).toFixed(1)} ${c.toFixed(1)}`}
          transform={`rotate(-90 ${(size + 10) / 2} ${(size + 10) / 2})`}
        />
      </svg>
      <span className="pc-mn-emblem">
        <Emblem size={size} />
      </span>
      <b className="pc-mn-level" data-maison-level>
        {m.level}
      </b>
    </span>
  );
}

/** The house's sheet: the week's Prestige, the title, the path of the levels. */
export function MaisonSheet({
  m,
  close,
  onFacade,
  onProfil,
}: {
  m: MaisonView;
  close: ReactNode;
  onFacade: () => void;
  onProfil: () => void;
}) {
  const week = Math.min(m.week, m.weeklyCap + m.carry);
  const toNext = m.to === null ? 0 : m.to - m.prestige;
  return (
    <section className="pc-planche-card pc-pl-card pc-mn-sheet" data-maison-sheet>
      <div className="pc-pl-head">
        <div>
          <h2>{m.name}</h2>
          <span>
            Niveau {m.level} · {m.title}
          </span>
        </div>
        {close}
      </div>
      <div className="pc-mn-next">
        <MaisonRing m={m} size={44} />
        <p>
          {m.to === null ? (
            "Le plus haut niveau : ta Maison est au sommet de la République."
          ) : (
            <>
              <b>{toNext.toLocaleString("fr-FR")} de Prestige</b> pour le niveau {m.level + 1}
              {m.opens[0] && m.opens[0].level === m.level + 1 ? ` : ${opensOf(m.opens[0])}` : ""}.
            </>
          )}
        </p>
      </div>
      <div className="pc-mn-week">
        <div>
          <span>Le Prestige de la semaine</span>
          <b>
            {week} <small>/ {m.weeklyCap + m.carry}</small>
          </b>
        </div>
        <span className="pc-mn-bar" aria-hidden="true">
          <i
            style={{
              width: `${Math.min(100, (week / Math.max(1, m.weeklyCap + m.carry)) * 100)}%`,
            }}
          />
        </span>
        <p>
          Ce que tes fils vendent chaque jour, puis dimanche ce que la semaine t'a donné : ton rival
          battu, ta place dans ton sestiere, tes sceaux brisés, tes tours tenues.
          {m.carry ? ` ${m.carry} reportés de la semaine passée.` : ""}
        </p>
      </div>
      <ol className="pc-mn-path">
        {m.opens.map((o) => (
          <li key={o.level}>
            <span className="pc-mn-node">{o.level}</span>
            <span>
              {opensOf(o)}
              <small>à {o.at.toLocaleString("fr-FR")} de Prestige</small>
            </span>
          </li>
        ))}
      </ol>
      <p className="pc-in-small">Un niveau ouvre de la place et du choix, jamais un rendement.</p>
      <div className="pc-pl-acts">
        <button type="button" className="pc-passe-go" onClick={onFacade} data-maison-facade>
          Ta façade et ton Livre
          <small>ce que ta Maison a gagné, et son histoire</small>
        </button>
        <button type="button" className="pc-passe-quiet" onClick={onProfil}>
          Ton profil
        </button>
      </div>
    </section>
  );
}

/** A line of the Livre, in words. */
function said(
  e: MaisonView["livre"][number],
  name: (id: string) => string,
  place: (id: string) => string,
) {
  if (e.kind === "level") return `Niveau ${e.data} atteint.`;
  if (e.kind === "flag") return `Pavillon pris à ${name(e.data ?? "")}, ton rival de la semaine.`;
  if (e.kind === "tower") return `${place(e.data ?? "")} est à toi.`;
  if (e.kind === "laurel")
    return `Laurier ${e.data === "negoce" ? "du Négoce" : e.data === "passe" ? "de la Passe" : "de la Garde"}.`;
  if (e.kind === "doge") return "Doge de la lagune.";
  return "";
}

/** The house's façade and its Livre. */
export function FacadeSheet({
  m,
  close,
  name,
  place,
}: {
  m: MaisonView;
  close: ReactNode;
  name: (id: string) => string;
  place: (id: string) => string;
}) {
  const flags = m.collection.flag ?? 0;
  const laurels = m.collection.laurel ?? 0;
  const doges = m.collection.doge ?? 0;
  const towers = m.collection.tower ?? 0;
  const hung = Math.min(4, flags);
  return (
    <section className="pc-planche-card pc-pl-card pc-mn-facade" data-maison-livre>
      <div className="pc-pl-head">
        <div>
          <h2>{m.name}</h2>
          <span>
            Niveau {m.level} · {m.title}
          </span>
        </div>
        {close}
      </div>
      <svg
        viewBox="0 0 320 170"
        role="img"
        aria-label="La façade de ta Maison, ses pavillons pris et ses lauriers"
      >
        <ellipse cx="160" cy="162" rx="140" ry="7" fill="#d3ccc0" />
        <rect
          x="50"
          y="46"
          width="220"
          height="114"
          rx="5"
          fill="#f7f5f1"
          stroke="#ddd6cb"
          strokeWidth="2"
        />
        <path
          d="M50 46 L160 18 L270 46 Z"
          fill="#fbfaf7"
          stroke="#ddd6cb"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M140 158 V118 C140 104 152 101 156 94 C158 91 160 88 160 84 C160 88 162 91 164 94 C168 101 180 104 180 118 V158"
          fill="#fbfaf7"
          stroke="var(--pc-accent)"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <circle cx="160" cy="153" r="3.2" fill="#2a2725" />
        {doges ? (
          <g transform="translate(150 22)">
            <path
              d="M3 16 C3 8 6 3 11 2 C14 4 17 8 17 16 Z"
              fill="#fbfaf7"
              stroke="#17150f"
              strokeWidth="1.5"
            />
            <rect x="1" y="14" width="18" height="4.5" rx="2" fill="var(--pc-accent)" />
          </g>
        ) : null}
        {Array.from({ length: hung }, (_, k) => {
          const x = [66, 102, 206, 242][k] ?? 66;
          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: the flags taken are only counted.
            <g key={k}>
              <rect x={x} y={62} width="2.5" height="34" fill="#17150f" />
              <path
                d={`M${x + 2.5} 64 H${x + 24} L${x + 18} 71 L${x + 24} 78 H${x + 2.5} Z`}
                fill={["#2f6b5e", "#b07a2a", "#2a2725", "#6b3a5e"][k]}
              />
            </g>
          );
        })}
        {(["gauche", "droite"] as const).slice(0, Math.min(2, laurels)).map((side) => (
          <g
            key={side}
            transform={`translate(${side === "droite" ? 210 : 90} 112)`}
            fill="none"
            stroke="#17150f"
            strokeWidth="1.6"
            strokeLinecap="round"
          >
            <path d="M6 22 C0 17 0 7 5 2 M18 22 C24 17 24 7 19 2" />
          </g>
        ))}
      </svg>
      <div className="pc-mn-coll">
        <div>
          <b>{flags}</b>pavillons pris
        </div>
        <div>
          <b>{towers}</b>tours prises
        </div>
        <div>
          <b>{laurels}</b>lauriers
        </div>
        <div>
          <b>{doges}</b>fois Doge
        </div>
      </div>
      <h3 className="pc-mn-h3">Le Livre de la Maison</h3>
      {m.livre.length ? (
        <ul className="pc-mn-livre">
          {m.livre.map((e) => (
            <li key={`${e.at}-${e.kind}-${e.data}`}>
              <em>
                {new Date(e.at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
              </em>
              <span>{said(e, name, place)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="pc-in-small">Le Livre s'écrit dimanche, avec ta première semaine.</p>
      )}
    </section>
  );
}

/** The moment a level is reached: the ring closes, the new level and what it opens. */
export function LevelUp({ m, onClose }: { m: MaisonView; onClose: () => void }) {
  return (
    <div className="pc-mn-up" data-maison-levelup>
      <div className="pc-mn-up-card">
        <MaisonRing m={{ ...m, prestige: m.to ?? m.prestige, from: 0, to: m.to ?? 1 }} size={64} />
        <span className="pc-in-step">Ta Maison grandit</span>
        <h2>Niveau {m.level}</h2>
        <p>
          {m.title} · {m.caps.bobbins} bobines, une île de {m.caps.tiles} cases,{" "}
          {m.caps.towers > 1 ? `${m.caps.towers} tours` : "une tour"}
        </p>
        <button type="button" className="pc-in-go" onClick={onClose}>
          Continuer
        </button>
      </div>
    </div>
  );
}
