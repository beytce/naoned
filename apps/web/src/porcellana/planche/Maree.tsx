/**
 * The tide on the board (docs/plan-maree.md T6 and T7): its sheet (the ink drawn as a gauge of rows
 * with the towers it nears, the week's sorties, the decree in force, one's league and the ladder of
 * the leagues), the tide's end (the laurels, one's stones, one's league, the Doge's decree to
 * choose), and the Sérénissime as all may watch it.
 */
import {
  type PlancheDecret,
  type PlancheSetup,
  type PlancheState,
  plancheDecret,
  plancheDecretLeft,
  plancheEncreLine,
  plancheEncreThreat,
  plancheMonday,
} from "@comptoirs/engine";
import type { ReactNode } from "react";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const WHEN = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "UTC",
});

export interface MareeView {
  league: number;
  count: number;
  best: number;
  lagoons: { name: string; league: number; players: number; mine: boolean }[];
  last: { tide: number; up: string[]; down: string[]; me: "up" | "down" | null } | null;
  serenissime: { name: string } | null;
}

export interface SerenissimeView {
  name: string;
  houses: { name: string; person: boolean; level: number; place: number }[];
  laurels: {
    doge: string;
    negoce: string | null;
    passe: string | null;
    garde: string | null;
  } | null;
  towers: { name: string; holder: string | null }[];
  ink: number | null;
  players: number;
}

/** A league's name: the last one is the Sérénissime. */
export const leagueName = (n: number, count: number) =>
  n >= count && count > 1 ? "la Sérénissime" : `la ligue ${n}`;

/** A decree, in words. */
export function decretSaid(S: PlancheSetup, d: PlancheDecret): string {
  if (d.kind === "prix") {
    const town = S.cities.find((c) => c.id === d.city)?.name ?? d.city;
    const good = (S.goods[d.good] ?? d.good).toLowerCase();
    return `${town} paie le ${good} ${Math.round(d.bps / 100)} % plus cher.`;
  }
  if (d.kind === "peage") return `Les péages de la lagune plafonnés à ${d.bps / 100} %.`;
  if (d.kind === "encre") return `L'encre monte d'une demi-rangée de moins chaque semaine.`;
  return `Les détroits noirs posent ${d.less > 1 ? `${d.less} maillons` : "un maillon"} de moins.`;
}

/** The ink, drawn: the rows of the open sea, the line, the towers it nears. */
function InkGauge({ setup, state }: { setup: PlancheSetup; state: PlancheState }) {
  const E = setup.encre;
  if (!E) return null;
  const line = plancheEncreLine(setup, state) / 100;
  const from = E.limit;
  const to = setup.height - 1;
  const rows = to - from + 1;
  const h = 150;
  const y = (r: number) => ((r - from) / rows) * h;
  const threat = new Set(plancheEncreThreat(setup, state));
  const towers = setup.passages.filter((p) => p.y >= from);
  const held = (id: string) => !state.passages[id]?.holder.startsWith("corsair:");
  return (
    <svg
      className="pc-mr-gauge"
      viewBox={`0 0 300 ${h + 10}`}
      role="img"
      aria-label={`L'encre est à la rangée ${line.toFixed(1)}`}
      data-encre-line={line.toFixed(2)}
    >
      <rect x="0" y="0" width="300" height={h} rx="10" fill="#F6F4F0" />
      <rect x="0" y={y(line)} width="300" height={Math.max(0, h - y(line))} rx="0" fill="#2A2725" />
      <rect x="0" y={Math.max(0, y(line) - 22)} width="300" height="22" fill="url(#pc-mr-wash)" />
      <defs>
        <linearGradient id="pc-mr-wash" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2A2725" stopOpacity="0" />
          <stop offset="1" stopColor="#2A2725" stopOpacity="0.45" />
        </linearGradient>
      </defs>
      <path d={`M0 ${y(line)} H300`} stroke="#C7372F" strokeWidth="3" strokeDasharray="10 7" />
      {towers.map((p) => {
        const cx = 20 + ((p.x + 0.5) / setup.width) * 260;
        const cy = y(p.y + 0.5);
        return (
          <g key={p.id} data-encre-tower={p.id} data-threat={String(threat.has(p.id))}>
            <rect
              x={cx - 7}
              y={cy - 9}
              width="14"
              height="16"
              rx="2"
              fill={held(p.id) ? "#C7372F" : "#8A8279"}
              stroke={threat.has(p.id) ? "#F2C14E" : "#17150f"}
              strokeWidth={threat.has(p.id) ? 3 : 1.5}
            />
          </g>
        );
      })}
      <text x="8" y={h + 8} fontSize="9" fill="#6B645C">
        la lagune ↑
      </text>
      <text x="292" y={h + 8} fontSize="9" fill="#6B645C" textAnchor="end">
        le Large ↓
      </text>
    </svg>
  );
}

/** The tide's sheet. */
export function MareeSheet({
  setup,
  state,
  me,
  view,
  close,
  name,
  onSortie,
  onSerenissime,
}: {
  setup: PlancheSetup;
  state: PlancheState;
  me: string;
  view: MareeView | null;
  close: ReactNode;
  name: (house: string) => string;
  onSortie: (id: string) => void;
  onSerenissime: () => void;
}) {
  const R = setup.rank;
  const week = state.rank.week + 1;
  const ends = state.rank.tideStart + (R?.tideWeeks ?? 6) * (R?.weekMs ?? 7 * DAY);
  const last = state.encre?.last;
  const threat = plancheEncreThreat(setup, state);
  const saturday = state.now - plancheMonday(state.now) >= 5 * DAY;
  const monday = plancheMonday(state.now);
  const sorties = state.sorties?.monday === monday ? state.sorties : undefined;
  const decree = plancheDecret(state, state.now);
  const passName = (id: string) => setup.passages.find((p) => p.id === id)?.name ?? id;
  return (
    <section className="pc-planche-card pc-pl-card pc-mr" data-maree>
      <div className="pc-pl-head">
        <div>
          <h2>La marée {state.rank.tide + 1}</h2>
          <span data-maree-week={week}>
            Semaine {week} sur {R?.tideWeeks ?? 6} · close {WHEN.format(ends)}
          </span>
        </div>
        {close}
      </div>
      {setup.encre ? (
        <>
          <h3 className="pc-mn-h3">L'encre</h3>
          <InkGauge setup={setup} state={state} />
          <p className="pc-mr-said" data-encre-said>
            {last
              ? `Lundi, elle est montée de ${(last.rise / 100).toLocaleString("fr-FR")} rangée, repoussée de ${(last.push / 100).toLocaleString("fr-FR")} par les tours tenues, les détroits noirs et les phares.`
              : "Elle monte d'une rangée chaque lundi. Tiens des tours, force les détroits noirs, porte au phare : tu la repousses."}
          </p>
          {threat.length ? (
            <p className="pc-mr-threat" data-encre-threat={threat.join(",")}>
              {saturday ? "Lundi, " : "Si rien ne la repousse, lundi "}
              l'encre reprendra {threat.map(passName).join(", ")}.
            </p>
          ) : null}
        </>
      ) : null}
      {sorties?.list.length ? (
        <>
          <h3 className="pc-mn-h3">Les sorties de la semaine</h3>
          <ul className="pc-mr-sorties">
            {[...sorties.list]
              .sort((a, b) => a.at - b.at)
              .map((x) => {
                const done = sorties.done[x.id];
                const mine = state.passages[x.target]?.holder === me;
                const open = !done && mine && state.now < x.at;
                return (
                  <li key={x.id} data-sortie={x.id} data-mine={String(mine)}>
                    <b>{x.captain}</b>
                    <span>
                      contre {passName(x.target)}
                      {mine ? " (ta tour)" : ""} ·{" "}
                      {done
                        ? done.won
                          ? "un sceau perdu"
                          : done.by === "tenant"
                            ? "repoussé par son tenant"
                            : "repoussé par la garde"
                        : WHEN.format(x.at)}
                    </span>
                    {open ? (
                      <button
                        type="button"
                        className="pc-passe-go"
                        data-sortie-go={x.id}
                        onClick={() => onSortie(x.id)}
                      >
                        Au-devant
                      </button>
                    ) : null}
                  </li>
                );
              })}
          </ul>
        </>
      ) : null}
      {decree ? (
        <p className="pc-mr-decret" data-decret={decree.kind}>
          <b>Décret de la marée</b> {decretSaid(setup, decree)}
        </p>
      ) : state.decret && plancheDecretLeft(state, state.now) > 0 ? (
        <p className="pc-mr-decret">
          <b>Décret de la marée</b> {name(state.decret.doge)}, Doge, le choisit.
        </p>
      ) : null}
      {view ? (
        <>
          <h3 className="pc-mn-h3">Les ligues</h3>
          <ol className="pc-mr-ladder" data-ligue={view.league}>
            {Array.from({ length: view.count }, (_, k) => view.count - k).map((l) => {
              const n = view.lagoons.filter((x) => x.league === l).length;
              return (
                <li
                  key={l}
                  data-here={String(l === view.league)}
                  data-top={String(l === view.count)}
                >
                  <b>{leagueName(l, view.count).replace(/^./, (c) => c.toUpperCase())}</b>
                  <span>
                    {n} lagune{n > 1 ? "s" : ""}
                    {l === view.league ? " · la tienne" : ""}
                  </span>
                </li>
              );
            })}
          </ol>
          <p className="pc-mr-said">
            À la fin de la marée, le sixième du haut de chaque lagune monte d'une ligue, sa Maison
            entière avec lui ; le sixième du bas descend d'une, jamais plus bas qu'un rang sous la
            meilleure atteinte.
          </p>
          {view.serenissime ? (
            <div className="pc-pl-acts">
              <button
                type="button"
                className="pc-passe-quiet"
                data-serenissime-open
                onClick={onSerenissime}
              >
                Regarder la Sérénissime
              </button>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

/** The tide's end (docs/plan-maree.md T7): its moment, and the Doge's decree to choose. */
export function TideEndSheet({
  setup,
  state,
  me,
  view,
  close,
  name,
  onDecret,
}: {
  setup: PlancheSetup;
  state: PlancheState;
  me: string;
  view: MareeView | null;
  close: ReactNode;
  name: (house: string) => string;
  onDecret: (choice: number) => void;
}) {
  const L = state.rank.laurels;
  const ended = state.rank.tide - 1;
  const stones = (state.houses[me]?.stones ?? []).filter((x) => x.tide === ended);
  const d = state.decret;
  const choosing =
    d && d.doge === me && d.chosen === undefined && plancheDecretLeft(state, state.now) > 0;
  const passName = (id: string) => setup.passages.find((p) => p.id === id)?.name ?? id;
  return (
    <section className="pc-planche-card pc-pl-card pc-mr pc-mr-end" data-maree-fin={ended + 1}>
      <div className="pc-pl-head">
        <div>
          <h2>La marée {ended + 1} est close</h2>
          <span>L'encre reflue, le Large retourne aux corsaires, les rangs repartent de zéro.</span>
        </div>
        {close}
      </div>
      {L ? (
        <div className="pc-mr-laurels">
          <div data-doge>
            <b>{name(L.doge)}</b>
            <span>Doge de la lagune</span>
          </div>
          {(["negoce", "passe", "garde"] as const).map((k) => (
            <div key={k}>
              <b>{L[k] ? name(L[k] as string) : "personne"}</b>
              <span>
                Laurier{" "}
                {k === "negoce" ? "du Négoce" : k === "passe" ? "de la Passe" : "de la Garde"}
              </span>
            </div>
          ))}
        </div>
      ) : null}
      {stones.length ? (
        <p className="pc-mr-stones" data-stones={stones.length}>
          <span className="pc-mr-stone" aria-hidden="true" />
          {stones.length > 1 ? `${stones.length} pierres gravées` : "Une pierre gravée"} sur ton île
          : {stones.map((x) => passName(x.passage)).join(", ")}, tenue jusqu'au bout.
        </p>
      ) : null}
      {view?.last ? (
        <p className="pc-mr-move" data-ligue-move={view.last.me ?? "reste"}>
          {view.last.me === "up"
            ? `Tu montes : ta Maison est maintenant dans ${leagueName(view.league, view.count)}.`
            : view.last.me === "down"
              ? `Tu descends dans ${leagueName(view.league, view.count)}.`
              : `Tu restes dans ${leagueName(view.league, view.count)}.`}
          {view.last.up.length ? ` Montent : ${view.last.up.join(", ")}.` : ""}
        </p>
      ) : null}
      {choosing && d ? (
        <>
          <h3 className="pc-mn-h3">Ton décret pour la marée qui vient</h3>
          <div className="pc-mr-decrets">
            {d.offered.map((x, k) => (
              <button key={x.kind} type="button" data-decret-choice={k} onClick={() => onDecret(k)}>
                <b>{decretSaid(setup, x)}</b>
                <span>Pour toute la lagune, une marée.</span>
              </button>
            ))}
          </div>
          <p className="pc-mr-said">
            Sans choix sous {Math.ceil(plancheDecretLeft(state, state.now) / DAY)} jour(s), le
            premier l'emporte.
          </p>
        </>
      ) : d?.chosen !== undefined && d.offered[d.chosen] ? (
        <p className="pc-mr-decret" data-decret={d.offered[d.chosen]?.kind}>
          <b>Décret de la marée</b> {decretSaid(setup, d.offered[d.chosen] as PlancheDecret)}
        </p>
      ) : null}
    </section>
  );
}

/** The Sérénissime, as all may watch it. */
export function SerenissimeSheet({
  view,
  close,
}: {
  view: SerenissimeView | null;
  close: ReactNode;
}) {
  return (
    <section className="pc-planche-card pc-pl-card pc-mr" data-serenissime>
      <div className="pc-pl-head">
        <div>
          <h2>La Sérénissime</h2>
          <span>
            {view
              ? `La lagune sommet · ${view.players} joueur${view.players > 1 ? "s" : ""}`
              : "Personne ne l'a encore atteinte."}
          </span>
        </div>
        {close}
      </div>
      {view ? (
        <>
          {view.laurels ? (
            <p className="pc-mr-decret">
              <b>Doge</b> {view.laurels.doge}
            </p>
          ) : null}
          <ol className="pc-mr-houses">
            {view.houses.map((h) => (
              <li key={`${h.place}-${h.name}`} data-person={String(h.person)}>
                <i>{h.place}</i>
                <b>{h.name}</b>
                <span>niv. {h.level}</span>
              </li>
            ))}
          </ol>
          <h3 className="pc-mn-h3">Ses tours</h3>
          <ul className="pc-mr-towers">
            {view.towers.map((t) => (
              <li key={t.name} data-held={String(!!t.holder)}>
                {t.name} : <b>{t.holder ?? "aux corsaires"}</b>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}
