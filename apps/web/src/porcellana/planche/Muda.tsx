/**
 * The Muda, the black straits and the Gazette on the board (docs/plan-muda.md N5 to N7): the
 * convoy's sheet (its hold drawn as a galley filling, its week, its straits), a black strait's sheet
 * (its power, its guard's links, the cargo risked and what the far port pays), the relics and the
 * plans, and the Gazette of Sunday as a page of a journal.
 */
import {
  type PlancheGazette,
  type PlancheSetup,
  type PlancheState,
  plancheMonday,
  plancheMudaHold,
  plancheMudaLoaded,
  plancheMudaPassed,
  plancheMudaPhase,
  plancheMudaPrice,
  plancheMudaRefusal,
  plancheNoirCargoCap,
  plancheNoirPhase,
  plancheNoirPrice,
  plancheNoirTries,
} from "@comptoirs/engine";
import { type ReactNode, useState } from "react";
import { Emblem } from "../../art/logo.js";

const DAY = 86_400_000;
const ducats = (deniers: number | bigint) =>
  `${Math.floor(Number(deniers) / 100).toLocaleString("fr-FR")} ducats`;
/** Names for the slots drawn in a row (links, relics): never more than six. */
const SLOTS = ["un", "deux", "trois", "quatre", "cinq", "six"];
const DAYS = ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"];
const STYLE: Record<string, string> = {
  mur: "Il mure le centre",
  rives: "Il court les rives",
  meute: "Il harcèle",
};
export const POWER_NAME: Record<string, string> = {
  turc: "le Turc",
  genes: "Gênes",
  milan: "Milan",
};
/** « of » a power, in French: du Turc, de Gênes, de Milan. */
export const POWER_OF: Record<string, string> = {
  turc: "du Turc",
  genes: "de Gênes",
  milan: "de Milan",
};
const POWER_COLOUR: Record<string, string> = {
  turc: "#2F5D50",
  genes: "#3A4A6B",
  milan: "#6B5A3A",
};

/** The convoy's hold, drawn: a galley's hull, filled from the keel as the lagoon loads it. */
function Hold({ loaded, hold, mine }: { loaded: number; hold: number; mine: number }) {
  const f = Math.min(1, loaded / Math.max(1, hold));
  const m = Math.min(f, mine / Math.max(1, hold));
  const hull = "M8 30 H152 L140 56 Q80 66 20 56 Z";
  return (
    <svg
      className="pc-mu-hold"
      viewBox="0 0 160 70"
      role="img"
      aria-label={`La cale : ${loaded} sur ${hold}`}
      data-muda-hold={Math.round(f * 100)}
    >
      <defs>
        <clipPath id="pc-mu-hull">
          <path d={hull} />
        </clipPath>
      </defs>
      <path d="M80 4 V30 M50 10 V30 M110 10 V30" stroke="#17150f" strokeWidth="2" />
      <path
        d="M52 10 Q72 18 52 28 Z M82 4 Q106 14 82 28 Z M112 10 Q130 18 112 28 Z"
        fill="#F6F4F0"
        stroke="#17150f"
        strokeWidth="1.4"
      />
      <path d={hull} fill="#F6F4F0" stroke="#17150f" strokeWidth="2" />
      <g clipPath="url(#pc-mu-hull)">
        <rect x="0" y={66 - 36 * f} width="160" height={36 * f} fill="#D9D2C6" />
        <rect x="0" y={66 - 36 * m} width="160" height={36 * m} fill="#C7372F" />
      </g>
      <path d={hull} fill="none" stroke="#17150f" strokeWidth="2" />
    </svg>
  );
}

/** The week of the Muda: three days of loading, the sailing, the return; today ringed. */
function Week({ setup, now }: { setup: PlancheSetup; now: number }) {
  const M = setup.muda;
  if (!M) return null;
  const today = Math.floor((now - plancheMonday(now)) / DAY);
  return (
    <ol className="pc-mu-week" aria-label="La semaine de la Muda">
      {DAYS.map((d, k) => {
        const what = M.loadDays.includes(k)
          ? "charge"
          : k === M.sailDay
            ? "sort"
            : k === M.returnDay
              ? "rentre"
              : "";
        return (
          <li key={d} data-what={what || "rien"} data-today={String(k === today)}>
            <b>{d}</b>
            <span>{what}</span>
          </li>
        );
      })}
    </ol>
  );
}

const PHASE_SAID: Record<ReturnType<typeof plancheMudaPhase>, string> = {
  before: "Le convoi se prépare au môle : on le charge à partir de mercredi.",
  loading: "On charge le convoi : tends un fil vers le môle de San Marco.",
  waiting: "Le convoi attend son heure : il sort le samedi de 8 h à 20 h.",
  sailing: "Le convoi est en mer : force les détroits avant 20 h, chacun une fois.",
  back: "Le convoi est rentré : chacun a reçu sa part.",
};

/** The Muda's sheet (docs/plan-muda.md N6). */
export function MudaSheet({
  setup,
  state,
  me,
  close,
  goods,
  onThread,
  onStrait,
}: {
  setup: PlancheSetup;
  state: PlancheState;
  me: string;
  close: ReactNode;
  goods: Record<string, string>;
  onThread: (good: string) => void;
  onStrait: (strait: string) => void;
}) {
  const M = setup.muda;
  if (!M) return null;
  const now = state.now;
  const phase = plancheMudaPhase(setup, now);
  const hold = plancheMudaHold(setup);
  const loaded = plancheMudaLoaded(state, now);
  const ours = state.muda?.monday === plancheMonday(now) ? state.muda : undefined;
  const mine = ours?.units[me] ?? 0;
  const worth = ours?.worth[me] ?? 0n;
  const passed = plancheMudaPassed(setup, state, now);
  const h = state.houses[me];
  const threaded = h?.threads.find((t) => t.to === M.pier);
  const offered = Object.entries(h?.stock ?? {})
    .filter(([g, n]) => n > 0 && plancheMudaPrice(setup, g) > 0)
    .sort((a, b) => b[1] - a[1]);
  const stepPct = Math.round(M.stepBps / 100);
  const back = (worth * BigInt(10_000 + passed * M.stepBps)) / 10_000n;
  const today = ours && ours.day === Math.floor(now / DAY) ? (ours.today[me] ?? 0) : 0;
  return (
    <section className="pc-planche-card pc-pl-card pc-mu" data-muda>
      <div className="pc-pl-head">
        <div>
          <h2>La Muda de la semaine</h2>
          <span data-muda-phase={phase}>{PHASE_SAID[phase]}</span>
        </div>
        {close}
      </div>
      <Week setup={setup} now={now} />
      <div className="pc-mu-cale">
        <Hold loaded={loaded} hold={hold} mine={mine} />
        <p>
          <b>
            {loaded.toLocaleString("fr-FR")} sur {hold.toLocaleString("fr-FR")}
          </b>{" "}
          dans la cale ; <b data-muda-mine>{mine}</b> de toi
          {phase === "loading" ? ` (${today} sur ${M.dailyCap} aujourd'hui)` : ""}.
        </p>
      </div>
      <h3 className="pc-mn-h3">La route d'Alexandrie</h3>
      <ol className="pc-mu-straits">
        {M.straits.map((x, k) => {
          const st = ours?.straits[x.id];
          const why = plancheMudaRefusal(setup, state, me, x.id, now);
          return (
            <li key={x.id} data-muda-strait={x.id} data-passed={String(!!st?.by)}>
              <span className="pc-mu-buoy" aria-hidden="true">
                {k + 1}
              </span>
              <div>
                <b>{x.name}</b>
                <span>
                  {st?.by
                    ? `Passé${st.by === me ? " par toi" : ""} : + ${stepPct} % pour tous`
                    : k === passed && phase === "sailing"
                      ? st?.tried.includes(me)
                        ? "Tu l'as tenté : à un autre de le forcer"
                        : "Le convoi l'attend : le premier qui gagne le fait passer"
                      : `+ ${stepPct} % s'il est passé`}
                </span>
              </div>
              {!why ? (
                <button
                  type="button"
                  className="pc-passe-go"
                  data-muda-go={x.id}
                  onClick={() => onStrait(x.id)}
                >
                  Forcer
                </button>
              ) : null}
            </li>
          );
        })}
      </ol>
      <p className="pc-mu-back" data-muda-back>
        {mine > 0
          ? phase === "back"
            ? `Ta part est versée : ${ducats(ours?.paid?.[me] ?? back)}.`
            : `Ta part au retour : ${ducats(back)} (× ${(1 + (passed * M.stepBps) / 10_000).toLocaleString("fr-FR")}), jamais moins que ce que tu as chargé.`
          : "Charge le convoi : tu reçois au retour ce que tu as chargé, et la moitié en plus par détroit passé."}
      </p>
      {phase === "loading" && !threaded ? (
        <div className="pc-mu-load">
          <span>Tendre un fil vers le môle, de :</span>
          {offered.length ? (
            offered.slice(0, 4).map(([g, n]) => (
              <button
                key={g}
                type="button"
                className="pc-passe-quiet"
                data-muda-thread={g}
                onClick={() => onThread(g)}
              >
                {goods[g] ?? g} · {n}
              </button>
            ))
          ) : (
            <em>rien que le convoi prenne dans ton entrepôt</em>
          )}
        </div>
      ) : threaded ? (
        <p className="pc-mu-threaded" data-muda-threaded>
          Ton fil de {(goods[threaded.good] ?? threaded.good).toLowerCase()} charge le convoi.
        </p>
      ) : null}
    </section>
  );
}

/** A black strait's guard: its links, black for the phases reached this week. */
function Links({ n, on }: { n: number; on: number }) {
  return (
    <span className="pc-nr-links" role="img" aria-label={`Garde : phase ${on + 1} sur ${n}`}>
      {SLOTS.slice(0, n).map((slot, k) => (
        <i key={slot} data-on={String(k <= on)} />
      ))}
    </span>
  );
}

/** A black strait's sheet (docs/plan-muda.md N5): its captain, its guard, the cargo risked. */
export function NoirSheet({
  setup,
  state,
  me,
  strait,
  close,
  goods,
  onForce,
}: {
  setup: PlancheSetup;
  state: PlancheState;
  me: string;
  strait: string;
  close: ReactNode;
  goods: Record<string, string>;
  onForce: (good: string, n: number) => void;
}) {
  const N = setup.noir;
  const x = N?.straits.find((y) => y.id === strait);
  const h = state.houses[me];
  const cap = h ? plancheNoirCargoCap(setup, h) : 0;
  const offered = Object.entries(h?.stock ?? {})
    .filter(([g, n]) => n > 0 && plancheNoirPrice(setup, g) > 0)
    .sort((a, b) => plancheNoirPrice(setup, b[0]) - plancheNoirPrice(setup, a[0]));
  const [good, setGood] = useState<string | null>(offered[0]?.[0] ?? null);
  const have = good ? (h?.stock[good] ?? 0) : 0;
  const [n, setN] = useState(Math.min(cap, have) || 1);
  if (!N || !x) return null;
  const { phase } = plancheNoirPhase(setup, state, strait, state.now);
  const tries = N.triesPerDay - plancheNoirTries(state, me, state.now);
  const level = h?.level ?? 1;
  const max = Math.max(1, Math.min(cap, have));
  const k = Math.min(n, max);
  const price = good ? plancheNoirPrice(setup, good) : 0;
  const relics = h?.relics?.[x.power] ?? 0;
  return (
    <section className="pc-planche-card pc-pl-card pc-nr" data-noir={x.id}>
      <div className="pc-pl-head">
        <div>
          <h2>{x.name}</h2>
          <span>
            Gardé par {x.captain}, pour {POWER_NAME[x.power] ?? x.power}. On ne le tient jamais.
          </span>
        </div>
        {close}
      </div>
      <div className="pc-nr-captain">
        <svg width="54" height="54" viewBox="0 0 52 52" aria-hidden="true">
          <circle cx="26" cy="26" r="25" fill="#111111" stroke="#C7372F" strokeWidth="2" />
          <path d="M17 12 V42" stroke="#D9D2C6" strokeWidth="2" />
          <path d="M18 13 H38 L33 20 L38 27 H18 Z" fill={POWER_COLOUR[x.power] ?? "#3A3633"} />
        </svg>
        <div>
          <b>{STYLE[x.style] ?? ""}</b>
          <span>
            Damier de 9 sur 9, quatre pièces d'avance. Chaque fois qu'il est forcé cette semaine, sa
            garde se durcit.
          </span>
          <Links n={N.phases.length} on={phase} />
        </div>
      </div>
      {level < N.minLevel ? (
        <p className="pc-nr-shut" data-noir-shut>
          Les détroits noirs s'ouvrent au niveau {N.minLevel} de ta Maison (tu es au niveau {level}
          ).
        </p>
      ) : (
        <>
          <h3 className="pc-mn-h3">Ta cargaison</h3>
          <div className="pc-nr-goods">
            {offered.length ? (
              offered.map(([g, have]) => (
                <button
                  key={g}
                  type="button"
                  aria-pressed={good === g}
                  data-noir-good={g}
                  onClick={() => {
                    setGood(g);
                    setN(Math.min(cap, have));
                  }}
                >
                  <b>{goods[g] ?? g}</b>
                  <span>{have} en entrepôt</span>
                </button>
              ))
            ) : (
              <em>Rien dans ton entrepôt qu'un port lointain achète.</em>
            )}
          </div>
          {good ? (
            <>
              <label className="pc-nr-n">
                <span>
                  <b data-noir-n>{k}</b> sur {cap} au plus
                </span>
                <input
                  type="range"
                  min={1}
                  max={max}
                  value={k}
                  onChange={(e) => setN(Number(e.target.value))}
                />
              </label>
              <div className="pc-nr-stakes">
                <div data-won>
                  <b>{ducats(price * k)}</b>
                  <span>
                    forcé : vendu à {x.port}, et une relique {POWER_OF[x.power] ?? x.power}
                  </span>
                </div>
                <div data-lost>
                  <b>{k} coulés</b>
                  <span>perdu : la cargaison coule</span>
                </div>
              </div>
            </>
          ) : null}
          <div className="pc-pl-acts">
            <button
              type="button"
              className="pc-passe-go"
              data-noir-go
              disabled={!good || tries <= 0}
              onClick={() => good && onForce(good, k)}
            >
              {tries > 0
                ? `Forcer avec cette cargaison (${tries} essai${tries > 1 ? "s" : ""} aujourd'hui)`
                : "Plus d'essai aujourd'hui"}
            </button>
          </div>
        </>
      )}
      <p className="pc-nr-relics">
        Reliques {POWER_OF[x.power] ?? x.power} : <b data-noir-relics>{relics}</b> sur{" "}
        {N.relicsPerPlan} pour un plan.
      </p>
    </section>
  );
}

/** The relics and the plans, in the Livre of the house (docs/plan-muda.md N5). */
export function Reliques({
  setup,
  relics,
  plans,
  onAssemble,
}: {
  setup: PlancheSetup;
  relics: Record<string, number>;
  plans: number;
  onAssemble: (power: string) => void;
}) {
  const N = setup.noir;
  if (!N) return null;
  const powers = [...new Set(N.straits.map((x) => x.power))];
  return (
    <div className="pc-nr-book" data-reliques>
      <h3 className="pc-mn-h3">Reliques et plans</h3>
      <ul>
        {powers.map((p) => {
          const have = relics[p] ?? 0;
          return (
            <li key={p} data-relic={p}>
              <span className="pc-nr-seal" style={{ background: POWER_COLOUR[p] }} />
              <b>{POWER_NAME[p] ?? p}</b>
              <span className="pc-nr-dots">
                {SLOTS.slice(0, N.relicsPerPlan).map((slot, k) => (
                  <i key={slot} data-on={String(k < have)} />
                ))}
              </span>
              {have >= N.relicsPerPlan ? (
                <button
                  type="button"
                  className="pc-passe-quiet"
                  data-assemble={p}
                  onClick={() => onAssemble(p)}
                >
                  Assembler un plan
                </button>
              ) : (
                <em>{have > N.relicsPerPlan ? have : `${have} sur ${N.relicsPerPlan}`}</em>
              )}
            </li>
          );
        })}
      </ul>
      <p>
        <b data-plans>{plans}</b> plan{plans > 1 ? "s" : ""} à bâtir. Un plan ouvre un haut ouvrage
        : l'Arsenal au niveau {N.plans.arsenalLevel ?? 3}, la nef d'escorte, les ateliers du bel
        ouvrage.
      </p>
    </div>
  );
}

const DATE = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "UTC" });

/** The headline, in words. */
function headline(g: PlancheGazette): { title: string; lead: string } {
  const h = g.headline;
  switch (h.kind) {
    case "doge":
      return {
        title: `${h.name}, Doge de la lagune`,
        lead: "La marée est close : les lauriers sont proclamés.",
      };
    case "muda":
      return {
        title:
          h.passed === (g.muda?.straits.length ?? 3)
            ? "La Muda est passée !"
            : `La Muda rentre, ${h.passed} détroit${h.passed > 1 ? "s" : ""} passé${h.passed > 1 ? "s" : ""}`,
        lead: `${h.units.toLocaleString("fr-FR")} marchandises chargées par la lagune sont revenues d'Alexandrie.`,
      };
    case "guerre":
      return {
        title: `${h.name} brise ${h.seals} sceau${h.seals > 1 ? "x" : ""}`,
        lead: "La Guerre de la semaine a sa grande Maison.",
      };
    case "noir":
      return {
        title: `${h.name} forcé ${h.count} fois`,
        lead: "Les puissances du Large ont plié devant nos fils.",
      };
    case "rival":
      return { title: `${h.name} bat ${h.loser}`, lead: "Le rival de la semaine est tombé." };
    default:
      return {
        title: "Une semaine calme sur la lagune",
        lead: "Les fils ont tiré, les villes ont payé.",
      };
  }
}

/** The Gazette of Sunday (docs/plan-muda.md N7): a page of a journal, in porcelain. */
export function GazetteSheet({
  gazette,
  lagoon,
  weeks,
  close,
  onWeek,
  onReplay,
}: {
  gazette: PlancheGazette | null;
  lagoon: string;
  weeks: number[];
  close: ReactNode;
  onWeek: (week: number) => void;
  onReplay: (id: number) => void;
}) {
  if (!gazette)
    return (
      <section className="pc-planche-card pc-pl-card pc-gz" data-gazette="none">
        <div className="pc-pl-head">
          <div>
            <h2>La Gazette</h2>
            <span>Le premier numéro paraît dimanche matin, au retour de la Muda.</span>
          </div>
          {close}
        </div>
      </section>
    );
  const g = gazette;
  const { title, lead } = headline(g);
  return (
    <section className="pc-planche-card pc-pl-card pc-gz" data-gazette={g.monday}>
      <div className="pc-pl-head">
        <div>
          <h2>La Gazette</h2>
          <span>{lagoon}</span>
        </div>
        {close}
      </div>
      <article className="pc-gz-page">
        <header className="pc-gz-mast">
          <Emblem size={30} />
          <div>
            <b>La Gazette de la lagune</b>
            <span>
              Semaine du {DATE.format(g.monday)} au {DATE.format(g.monday + 6 * DAY)}
            </span>
          </div>
        </header>
        <div className="pc-gz-une" data-gazette-une={g.headline.kind}>
          <h3>{title}</h3>
          <p>{lead}</p>
        </div>
        <div className="pc-gz-cols">
          {g.muda ? (
            <section data-gazette-muda>
              <h4>La Muda</h4>
              <div className="pc-gz-route">
                {g.muda.straits.map((x) => (
                  <span key={x.id} data-passed={String(!!x.by)} title={x.name} />
                ))}
              </div>
              <p>
                {g.muda.units.toLocaleString("fr-FR")} chargées sur{" "}
                {g.muda.hold.toLocaleString("fr-FR")} ; {g.muda.passed} détroit
                {g.muda.passed > 1 ? "s" : ""} passé{g.muda.passed > 1 ? "s" : ""}.
              </p>
              <ul>
                {g.muda.straits
                  .filter((x) => x.by)
                  .map((x) => (
                    <li key={x.id}>
                      {x.name} : <b>{x.by}</b>
                    </li>
                  ))}
                {g.muda.top.slice(0, 3).map((t) => (
                  <li key={t.name}>
                    {t.name} a chargé <b>{t.units}</b>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {g.guerre ? (
            <section data-gazette-guerre>
              <h4>La Guerre</h4>
              <p>
                <b>{g.guerre.seals}</b> sceau{g.guerre.seals > 1 ? "x" : ""} brisé
                {g.guerre.seals > 1 ? "s" : ""} par la lagune.
              </p>
              <ul>
                {g.guerre.top.slice(0, 3).map((t) => (
                  <li key={t.name}>
                    {t.name} : <b>{t.seals}</b>
                  </li>
                ))}
              </ul>
              {g.guerre.best ? (
                <button
                  type="button"
                  className="pc-passe-quiet"
                  data-gazette-replay
                  onClick={() => g.guerre?.best && onReplay(g.guerre.best.id)}
                >
                  Le plus bel assaut : {g.guerre.best.by} sur {g.guerre.best.target}
                </button>
              ) : null}
            </section>
          ) : null}
          {g.noir.length ? (
            <section data-gazette-noir>
              <h4>Les détroits noirs</h4>
              <ul>
                {g.noir.map((x) => (
                  <li key={x.id}>
                    <span className="pc-nr-seal" style={{ background: POWER_COLOUR[x.power] }} />
                    {x.name} : forcé <b>{x.count}</b> fois
                    {x.houses.length ? ` (${x.houses.join(", ")})` : ""}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {g.rivals.length ? (
            <section data-gazette-rivaux>
              <h4>Les rivaux</h4>
              <ul>
                {g.rivals.map((r) => (
                  <li key={`${r.winner}-${r.loser}`}>
                    <b>{r.winner}</b> bat {r.loser}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {g.levels.length ? (
            <section data-gazette-niveaux>
              <h4>Les Maisons qui montent</h4>
              <ul>
                {g.levels.map((l) => (
                  <li key={`${l.name}-${l.level}`}>
                    {l.name} : niveau <b>{l.level}</b>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </article>
      {weeks.length > 1 ? (
        <nav className="pc-gz-weeks" aria-label="Les anciens numéros">
          {weeks.map((w) => (
            <button
              key={w}
              type="button"
              aria-pressed={w === g.monday}
              data-gazette-week={w}
              onClick={() => onWeek(w)}
            >
              {DATE.format(w)}
            </button>
          ))}
        </nav>
      ) : null}
    </section>
  );
}
