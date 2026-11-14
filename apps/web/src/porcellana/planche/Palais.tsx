/**
 * The rank on the board (docs/plan-classement.md R3): the trend in the purse, the marks on the
 * houses (the Doge's cap, the laurels, the flags taken), and the Doge's palace, a sheet of paper
 * with the three laurels and one's rival face to face. As on the canvas of the visual audit
 * (docs/audit-visuel-2026-11-11): one red for oneself, ink for the others, a single red key.
 */
import {
  type PlancheLaurelId,
  type PlancheSetup,
  type PlancheState,
  plancheLaurel,
  plancheStanding,
  plancheTrend,
  plancheWeekDuel,
} from "@comptoirs/engine";
import type { ReactNode } from "react";
import { Flag } from "./PlancheUi.js";

const LAURELS: { id: PlancheLaurelId; name: string; says: string }[] = [
  { id: "negoce", name: "Le Négoce", says: "ce que rapporte une bobine en une heure" },
  { id: "passe", name: "La Passe", says: "la cote des duels entre joueurs" },
  { id: "garde", name: "La Garde", says: "les heures tenues sur une tour, par son péril" },
];

/** What a laurel says while no one stands on it. */
const EMPTY: Record<PlancheLaurelId, string> = {
  negoce: "Personne n'a encore tenu un jour de fil.",
  passe: "Aucun duel encore entre joueurs.",
  garde: "Aucune tour tenue par une Maison.",
};

/** Where one stands in a laurel one is not on the podium of, and what would put one there. */
function youOf(
  which: PlancheLaurelId,
  r: { place: number; score: bigint; ranked: boolean },
  S: PlancheSetup,
  s: PlancheState,
  me: string,
): string {
  if (which === "negoce" && !r.ranked) {
    const left = Math.max(
      0,
      Math.ceil(((S.rank?.negoceMinMs ?? 0) - (s.houses[me]?.rank.threadMs ?? 0)) / 3_600_000),
    );
    return `Toi : encore ${left} h de fil tendu pour y figurer.`;
  }
  const defis = s.houses[me]?.rank.defis ?? 0;
  const need = S.rank?.defisMin ?? 0;
  if (which === "passe" && defis < need)
    return `Toi : cote ${s.houses[me]?.rank.cote ?? 0}. Encore ${need - defis} défi${need - defis > 1 ? "s" : ""} joué${need - defis > 1 ? "s" : ""} pour y figurer.`;
  if (which === "passe" && r.score <= BigInt(S.rank?.coteStart ?? 0))
    return `Toi : cote ${r.score.toString()}. Défie un joueur pour la faire monter.`;
  if (which === "garde" && r.score === 0n) return "Toi : force un passage, et tiens sa tour.";
  return `Toi : ${r.place}e, ${scoreOf(which, r.score, r.ranked)}.`;
}

/** A whole sum of deniers in ducats, French style. */
const ducats = (deniers: bigint) => Math.round(Number(deniers) / 100).toLocaleString("fr-FR");

/** What a laurel's score reads as. */
function scoreOf(which: PlancheLaurelId, score: bigint, ranked: boolean): string {
  if (!ranked) return which === "passe" ? "moins de trois défis" : "moins d'un jour de fil";
  if (which === "negoce") return `${ducats(score)} d. par bobine-heure`;
  if (which === "passe") return `cote ${score.toString()}`;
  return `${score.toString()} h tenues`;
}

/** « une place », « 3 places ». */
const places = (n: number) => (n === 1 ? "une place" : `${n} places`);

/** Places won (an arrow up) or lost (down) since the day began; nothing when level. */
export function Trend({ n }: { n: number }) {
  if (!n) return null;
  return (
    <span
      className="pc-rk-trend"
      data-up={String(n > 0)}
      aria-label={`${places(Math.abs(n))} ${n > 0 ? "de mieux" : "de moins"} depuis ce matin`}
    >
      <svg width="9" height="8" viewBox="0 0 9 8" aria-hidden="true">
        <path d={n > 0 ? "M4.5 0 L9 8 H0 Z" : "M4.5 8 L9 0 H0 Z"} fill="currentColor" />
      </svg>
      {Math.abs(n)}
    </span>
  );
}

/** The Doge's cap, the corno: a horn of porcelain on a band of red. */
export function DogeCap({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M3 13 C3 7 5 3 9 2 C11 4 13 8 13 13 Z"
        fill="#F7F5F1"
        stroke="var(--pc-ink)"
        strokeWidth="1.3"
      />
      <rect x="2" y="12" width="12" height="3" rx="1.2" fill="var(--pc-accent)" />
    </svg>
  );
}

/** A laurel: two branches of ink, its initial between. */
export function Laurel({ of, size = 16 }: { of: PlancheLaurelId; size?: number }) {
  const letter = of === "negoce" ? "N" : of === "passe" ? "P" : "G";
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M5 14 C1 11 1 5 4 2 M11 14 C15 11 15 5 12 2"
        stroke="var(--pc-ink)"
        strokeWidth="1.4"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M3 10 l-2 -1 M2.6 7 l-2 -.6 M3.4 4.4 l-1.6 -1 M13 10 l2 -1 M13.4 7 l2 -.6 M12.6 4.4 l1.6 -1"
        stroke="var(--pc-ink)"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <text x="8" y="11" textAnchor="middle" fontSize="9" fontWeight="900" fill="var(--pc-ink)">
        {letter}
      </text>
    </svg>
  );
}

/** The marks a house carries on the board: the Doge's cap, its laurels, the flags it took. */
export interface RankMarks {
  doge: boolean;
  laurels: PlancheLaurelId[];
  flags: string[];
}

/** Who leads alone, laurel by laurel, and the Doge: a mark only for a first that is not shared. */
export function rankMarks(S: PlancheSetup, s: PlancheState): Record<string, RankMarks> {
  const out: Record<string, RankMarks> = {};
  for (const h of S.houses)
    out[h.id] = { doge: false, laurels: [], flags: s.rank.flags[h.id] ?? [] };
  const floor = (which: PlancheLaurelId) =>
    which === "passe" ? BigInt(S.rank?.coteStart ?? 0) : 0n;
  for (const { id } of LAURELS) {
    const [a, b] = plancheLaurel(S, s, id);
    if (a?.ranked && a.score > floor(id) && (!b || b.place > 1)) out[a.house]?.laurels.push(id);
  }
  const [first, second] = plancheStanding(S, s);
  if (first && (!second || second.place > 1)) {
    const m = out[first.house];
    if (m) m.doge = true;
  }
  return out;
}

/** The marks, small, beside a house's name on the board. */
export function Marks({ m, name }: { m?: RankMarks; name: (id: string) => string }) {
  if (!m || (!m.doge && !m.laurels.length && !m.flags.length)) return null;
  return (
    <span className="pc-rk-marks">
      {m.doge ? (
        <span title="Le Doge">
          <DogeCap size={14} />
        </span>
      ) : null}
      {m.laurels.map((l) => (
        <span key={l} title={LAURELS.find((x) => x.id === l)?.name}>
          <Laurel of={l} size={14} />
        </span>
      ))}
      {m.flags.map((f) => (
        <i key={f} className="pc-rk-taken" title={`Pavillon pris à ${name(f)}`} />
      ))}
    </span>
  );
}

/** The Doge's palace: one's place, one's rival, the three laurels. */
export function Palais({
  setup: S,
  state: s,
  me,
  name,
  close,
  onRival,
}: {
  setup: PlancheSetup;
  state: PlancheState;
  me: string;
  name: (id: string) => string;
  close: ReactNode;
  onRival: (id: string) => void;
}) {
  const standing = plancheStanding(S, s);
  const mine = standing.find((r) => r.house === me);
  const trend = plancheTrend(S, s, me);
  const rival = s.rank.rivals[me];
  const duel = rival ? plancheWeekDuel(s, me, rival) : null;
  const towns = (duel?.shared ?? [])
    .map((c) => S.cities.find((x) => x.id === c)?.name ?? c)
    .join(", ");
  const total = duel ? duel.a + duel.b : 0n;
  const doge = standing[0] && (standing[1]?.place ?? 2) > 1 ? standing[0].house : null;
  const last = s.rank.laurels;
  const who = (id: string) => (id === me ? "Toi" : name(id));
  return (
    <section className="pc-planche-card pc-pl-card pc-rk-palace" data-planche-palace>
      <div className="pc-pl-head">
        <div>
          <h2>Le palais du Doge</h2>
          <span>
            Marée {s.rank.tide + 1} · semaine {s.rank.week + 1} sur {S.rank?.tideWeeks ?? 6}
          </span>
        </div>
        {close}
      </div>
      <p className="pc-rk-place">
        <b data-palace-place>
          {mine?.place ?? "–"}
          <sup>e</sup>
        </b>
        <span>
          sur {S.houses.length}
          {trend
            ? trend > 0
              ? `, ${places(trend)} de mieux depuis ce matin`
              : `, ${places(-trend)} de moins depuis ce matin`
            : ""}
          .{" "}
          {doge
            ? doge === me
              ? "Tu es le Doge : la coiffe est sur ton île."
              : `Le Doge du moment : ${name(doge)}.`
            : "Personne n'est encore Doge : tous à égalité."}
        </span>
      </p>
      {rival && duel ? (
        <div className="pc-rk-rival" data-palace-rival={rival}>
          <div className="pc-rk-rival-head">
            <Flag tone="player" />
            <b>Ton rival de la semaine : {name(rival)}</b>
          </div>
          <span className="pc-rk-duel" aria-hidden="true">
            <i data-mine="true" style={{ flexGrow: Number(duel.a) || (total ? 0 : 1) }} />
            <i style={{ flexGrow: Number(duel.b) || (total ? 0 : 1) }} />
          </span>
          <p>
            {duel.a === 0n && duel.b === 0n
              ? `Rien vendu encore cette semaine, ni toi ni ${name(rival)}. Le premier qui sert une ville prend l'avance.`
              : `${towns ? `Cette semaine, à ${towns}` : "Cette semaine, en tout"} : toi ${ducats(duel.a)} ducats, ${name(rival)} ${ducats(duel.b)}. `}
            {duel.a > duel.b
              ? "Tu mènes : dimanche, son pavillon ira sur ta façade."
              : duel.b > duel.a
                ? `${name(rival)} mène : dimanche, ton pavillon irait sur sa façade.`
                : ""}
          </p>
        </div>
      ) : null}
      <div className="pc-rk-laurels">
        {LAURELS.map((l) => {
          const floor = l.id === "passe" ? BigInt(S.rank?.coteStart ?? 0) : 0n;
          const rows = plancheLaurel(S, s, l.id);
          // Only those who have done something stand on a podium; oneself always, with one's due.
          const counts = (r: (typeof rows)[number]) => r.ranked && r.score > floor;
          const top = rows.filter(counts).slice(0, 3);
          const meRow = rows.find((r) => r.house === me);
          return (
            <div key={l.id} className="pc-rk-laurel" data-laurel={l.id}>
              <h3>
                <Laurel of={l.id} size={18} />
                {l.name}
              </h3>
              <small>{l.says}</small>
              {top.length ? (
                <ol>
                  {top.map((r) => (
                    <li
                      key={r.house}
                      data-mine={String(r.house === me)}
                      data-rival={String(r.house === rival)}
                    >
                      <em>{r.place}</em>
                      <b>{who(r.house)}</b>
                      <span>{scoreOf(l.id, r.score, r.ranked)}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="pc-rk-empty">{EMPTY[l.id]}</p>
              )}
              {meRow && !top.some((r) => r.house === me) ? (
                <p className="pc-rk-you">{youOf(l.id, meRow, S, s, me)}</p>
              ) : null}
            </div>
          );
        })}
      </div>
      {last ? (
        <p className="pc-rk-last">
          La marée passée : Doge {who(last.doge)}
          {last.negoce ? `, Négoce ${who(last.negoce)}` : ""}
          {last.passe ? `, Passe ${who(last.passe)}` : ""}
          {last.garde ? `, Garde ${who(last.garde)}` : ""}.
        </p>
      ) : null}
      <p className="pc-rk-note">
        Le rang ne donne que des marques : jamais une bobine ni un rendement.
      </p>
      {rival ? (
        <div className="pc-pl-acts">
          <button
            type="button"
            className="pc-passe-go"
            data-palace-see-rival
            onClick={() => onRival(rival)}
          >
            Voir {name(rival)} sur la planche
            <small>ses fils sont marqués d'encre</small>
          </button>
        </div>
      ) : null}
    </section>
  );
}
