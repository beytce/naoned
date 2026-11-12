/**
 * The assault (docs/plan-guerre.md W3, the mock-up's screens 3c and 3e): the port's three passes
 * and what each tells it will do this round; one's ships below, a ship touched then a pass; the
 * round told event by event; the seals broken, the ships coming home damaged, the replay. Played
 * here by the engine (the training port has no stake); the War's assaults are replayed by the
 * server from the same placements.
 */
import "../porcellana.css";
import "../passe/passe.css";
import "./assaut.css";
import {
  type AssautEvent,
  type AssautFleetShip,
  type AssautIntent,
  type AssautPort,
  type AssautRules,
  type AssautState,
  assautInit,
  assautIntents,
  assautPlay,
  assautResult,
} from "@comptoirs/engine";
import { useMemo, useState } from "react";
import { ShipGlyph } from "../planche/Arsenal.js";

const PASS_NAMES: Record<string, string> = {
  bouche: "La bouche",
  nord: "Canal nord",
  sud: "Canal sud",
};
const SHIP_NAMES: Record<string, string> = {
  galere: "Galère",
  brigantin: "Brigantin",
  brulot: "Brûlot",
  galeasse: "Galéasse",
  escorte: "Nef",
};
const KEYWORD: Record<string, string> = {
  solide: "la tour la vise d'abord",
  rapide: "peut changer de passe",
  brule: "brûle la chaîne ou une tour",
  bombarde: "double contre une tour dès la 2ᵉ manche",
  repare: "répare sa passe",
};
const RUSE_NAMES: Record<string, string> = {
  chaine: "Chaîne levée",
  brulot: "Brûlot caché",
  renforts: "Renforts",
};

function sayIntent(i: AssautIntent): string {
  if (i.kind === "chaine") return "La chaîne ferme la passe";
  if (i.kind === "batterie") return "La batterie frappe 1 chaque navire";
  if (i.kind === "ancre") return "Une barque tire sur le premier navire";
  return i.target === "solide"
    ? "La tour tire 3 sur la galère"
    : "La tour tire 3 sur le premier navire";
}

/** An event of a round, in words. */
function sayEvent(e: AssautEvent, name: (id: number) => string): string {
  const where = PASS_NAMES[e.pass] ?? e.pass;
  switch (e.kind) {
    case "ruse":
      return `${where} : ruse ! ${RUSE_NAMES[e.ruse] ?? e.ruse}.`;
    case "burn":
      return e.what === "rien"
        ? `${where} : ${name(e.ship)} brûle pour rien.`
        : `${where} : ${name(e.ship)} brûle ${e.what === "chaine" ? "la chaîne" : e.what === "ancre" ? "une barque" : "la tour"}.`;
    case "chain":
      return e.held
        ? `${where} : la chaîne tient, rien ne passe.`
        : `${where} : les galères rompent la chaîne.`;
    case "fire":
      return `${where} : ${e.from === "tour" ? "la tour" : e.from === "batterie" ? "la batterie" : "une barque"} touche ${name(e.ship)} (${e.damage}).`;
    case "hit":
      return `${where} : ${name(e.ship)} frappe ${e.target === "tour" ? "la tour" : e.target === "batterie" ? "la batterie" : "une barque"} (${e.damage}).`;
    case "sunk":
      return `${where} : ${name(e.ship)} coule ; il rentrera abîmé.`;
    case "down":
      return `${where} : ${e.what === "tour" ? "la tour tombe" : e.what === "chaine" ? "la chaîne est rompue" : e.what === "batterie" ? "la batterie se tait" : "une barque coule"}.`;
    case "fallen":
      return `${where} est tombée : un sceau brisé !`;
  }
}

function Seal({ broken }: { broken: boolean }) {
  return (
    <svg width="26" height="26" viewBox="0 0 20 20" aria-hidden="true" data-broken={String(broken)}>
      <path
        d="M10 1 L12 3 L15 2.5 L15.5 5.5 L18.5 7 L17 10 L18.5 13 L15.5 14.5 L15 17.5 L12 17 L10 19 L8 17 L5 17.5 L4.5 14.5 L1.5 13 L3 10 L1.5 7 L4.5 5.5 L5 2.5 L8 3 Z"
        fill={broken ? "#C8102E" : "#ddd6cb"}
      />
      {broken ? <path d="M6 6 L14 14" stroke="#F6F4F0" strokeWidth="2" /> : null}
    </svg>
  );
}

function Hull({ hull, max }: { hull: number; max: number }) {
  return (
    <span className="pc-as-hull" aria-label={`${Math.max(0, hull)} sur ${max}`}>
      {Array.from({ length: max }, (_, k) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: a point of hull is only counted.
        <i key={k} data-on={String(k < hull)} />
      ))}
    </span>
  );
}

/** The guided steps of the first training (decision of 8 November: each new place has its own). */
const TUTO = [
  "Touche une galère : elle est solide, la tour la vise d'abord.",
  "Touche le canal sud : une batterie seule ne tient pas une passe, ta galère y entre.",
  "Envoie ton brûlot dans la bouche : il brûlera la chaîne qui la ferme.",
  "Lance la manche : regarde ce qui se passe, passe par passe.",
  "La chaîne est brûlée : envoie l'autre galère et le brigantin dans la bouche, puis lance la manche.",
  "Dernière manche : un port garde ses ruses secrètes. Lance-la et regarde.",
];

export interface AssautEnd {
  seals: number;
  damageBps: number;
  damaged: number[];
  moves: Record<number, string>[];
}

export function AssautScreen({
  rules: R,
  port,
  fleet,
  title,
  tutorial = false,
  onEnd,
  onBack,
  remote,
}: {
  rules: AssautRules;
  port: AssautPort;
  fleet: AssautFleetShip[];
  title: string;
  tutorial?: boolean;
  onEnd?: (end: AssautEnd) => void;
  onBack: () => void;
  /**
   * The War's assault: played by the server, round by round (its ruses hidden until they play).
   * It starts on the state the server gave; each round is sent and the server's state shown.
   */
  remote?: {
    start: AssautState;
    play: (moves: Record<number, string>) => Promise<{ state: AssautState } | { error: string }>;
  };
}) {
  const [s, setS] = useState<AssautState>(() => remote?.start ?? assautInit(R, port, fleet));
  const [busy, setBusy] = useState(false);
  const [moves, setMoves] = useState<Record<number, string>[]>([]);
  const [pending, setPending] = useState<Record<number, string>>({});
  const [chosen, setChosen] = useState<number | null>(null);
  const [told, setTold] = useState<AssautEvent[]>([]);
  const [step, setStep] = useState(tutorial ? 0 : -1);
  const [said, setSaid] = useState("");
  const intents = useMemo(() => assautIntents(R, s), [R, s]);
  const over = s.manche > R.manches;
  const result = assautResult(R, s);
  const name = (id: number) => {
    const x = s.ships[id];
    const same = Object.entries(s.ships).filter(([, y]) => y.kind === x?.kind);
    const n = same.findIndex(([k]) => Number(k) === id) + 1;
    return `${SHIP_NAMES[x?.kind ?? ""] ?? x?.kind}${same.length > 1 ? ` ${n}` : ""}`;
  };
  const where = (id: number) => pending[id] ?? s.ships[id]?.at ?? null;
  const movable = (id: number) => {
    const x = s.ships[id];
    return !!x && !x.sunk && (x.at === null || x.keyword === "rapide");
  };
  const first = Object.entries(s.ships).find(([, x]) => x.keyword === "solide")?.[0];
  const brulot = Object.entries(s.ships).find(([, x]) => x.keyword === "brule")?.[0];

  const choose = (id: number) => {
    if (!movable(id) || over) return;
    setChosen(chosen === id ? null : id);
    if (step === 0 && s.ships[id]?.keyword === "solide") setStep(1);
  };
  const send = (pass: string) => {
    if (chosen === null) return;
    const x = s.ships[chosen];
    const next = { ...pending };
    if (x?.at === pass) delete next[chosen];
    else next[chosen] = pass;
    setPending(next);
    setChosen(null);
    if (step === 1 && pass === "sud") setStep(brulot ? 2 : 3);
    if (step === 2 && x?.keyword === "brule" && pass === "bouche") setStep(3);
  };
  const go = async () => {
    if (busy) return;
    try {
      let next: AssautState;
      if (remote) {
        setBusy(true);
        const res = await remote.play(pending);
        setBusy(false);
        if ("error" in res) {
          setSaid(
            res.error === "assaut_fixed"
              ? "Ce navire ne peut plus changer de passe."
              : "Le serveur n'a pas joué la manche : réessaie.",
          );
          return;
        }
        next = res.state;
      } else next = assautPlay(R, s, pending);
      setTold(next.log.slice(s.log.length));
      setMoves([...moves, pending]);
      setPending({});
      setS(next);
      setSaid("");
      // The guide follows the rounds, then leaves the assailant alone.
      if (step === 3) setStep(4);
      else if (step === 4) setStep(5);
      else if (step === 5) setStep(-1);
      if (next.manche > R.manches) {
        const r = assautResult(R, next);
        onEnd?.({ ...r, moves: [...moves, pending] });
      }
    } catch (e) {
      setSaid(
        (e as Error).message === "assaut_fixed"
          ? "Ce navire ne peut plus changer de passe."
          : "Ce placement n'est pas possible.",
      );
    }
  };
  const hint = !over && step >= 0 ? (TUTO[step] ?? "") : "";
  const glow = (key: string) =>
    (step === 0 && key === `ship:${first}`) ||
    (step === 1 && key === "pass:sud") ||
    (step === 2 && (key === `ship:${brulot}` || key === "pass:bouche")) ||
    (step === 3 && key === "go") ||
    (step === 4 && key === "pass:bouche") ||
    (step === 5 && key === "go");

  return (
    <div className="porcellana fixed inset-0 pc-assaut" data-assaut data-over={String(over)}>
      <header className="pc-as-top">
        <button
          type="button"
          className="pc-as-back"
          onClick={onBack}
          aria-label="Revenir à la planche"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <path
              d="M10 3 L5 8 L10 13"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <div>
          <b>{title}</b>
          <span data-assaut-manche>
            {over ? "L'assaut est fini" : `Manche ${s.manche} sur ${R.manches}`}
          </span>
        </div>
        <span
          className="pc-as-seals"
          aria-label={`${s.seals} sceau${s.seals > 1 ? "x" : ""} brisé${s.seals > 1 ? "s" : ""}`}
        >
          {[0, 1, 2].map((k) => (
            <Seal key={k} broken={k < s.seals} />
          ))}
        </span>
      </header>
      {hint ? (
        <p className="pc-as-hint" data-assaut-hint>
          {hint}
        </p>
      ) : null}
      <main className="pc-as-passes">
        {Object.entries(s.passes).map(([id, p]) => {
          const here = Object.entries(s.ships)
            .filter(([k, x]) => where(Number(k)) === id && !x.sunk)
            .map(([k]) => Number(k));
          return (
            <section
              key={id}
              className="pc-as-pass"
              data-pass={id}
              data-fallen={String(p.fallen)}
              data-glow={String(glow(`pass:${id}`))}
              aria-label={PASS_NAMES[id] ?? id}
            >
              <b className="pc-as-pass-name">{PASS_NAMES[id] ?? id}</b>
              {!over ? (
                <ul className="pc-as-intents" aria-label="Ce que la passe annonce">
                  {(intents[id] ?? []).map((i, k) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: the intents are in their order.
                    <li key={k}>{sayIntent(i)}</li>
                  ))}
                  {!(intents[id] ?? []).length ? <li>Rien ne défend la passe</li> : null}
                </ul>
              ) : null}
              <div className="pc-as-defs">
                {p.chain ? (
                  <span className="pc-as-def" data-def="chaine">
                    Chaîne
                  </span>
                ) : null}
                {p.towers.map((t, k) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: a tower is its place.
                  <span key={`t${k}`} className="pc-as-def" data-def="tour">
                    Tour <Hull hull={t.hull} max={t.max} />
                  </span>
                ))}
                {p.batteries.map((t, k) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: a battery is its place.
                  <span key={`b${k}`} className="pc-as-def" data-def="batterie">
                    Batterie <Hull hull={t.hull} max={t.max} />
                  </span>
                ))}
                {p.anchor.map((t, k) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: a boat is its place.
                  <span key={`a${k}`} className="pc-as-def" data-def="ancre">
                    Barque <Hull hull={t.hull} max={t.max} />
                  </span>
                ))}
                {p.ruseDone && p.ruse ? (
                  <span className="pc-as-ruse">Ruse : {RUSE_NAMES[p.ruse]}</span>
                ) : null}
                {p.fallen ? <span className="pc-as-fallen">Tombée · sceau brisé</span> : null}
              </div>
              <div className="pc-as-here">
                {here.map((k) => (
                  <span
                    key={k}
                    className="pc-as-mini"
                    data-pending={String(pending[k] !== undefined)}
                  >
                    <ShipGlyph kind={s.ships[k]?.kind ?? ""} size={30} />
                  </span>
                ))}
              </div>
              {chosen !== null && !over ? (
                <button
                  type="button"
                  className="pc-passe-go pc-as-send"
                  data-send={id}
                  onClick={() => send(id)}
                >
                  Envoyer ici
                </button>
              ) : null}
            </section>
          );
        })}
      </main>
      <footer className="pc-as-foot">
        {said ? <p className="pc-passe-said">{said}</p> : null}
        {told.length ? (
          <ol className="pc-as-told" aria-live="polite" data-assaut-told>
            {told
              .filter((e) => e.kind !== "fire" || e.damage > 0)
              .map((e, k) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: the round's events, in their order.
                <li key={k} style={{ animationDelay: `${k * 180}ms` }}>
                  {sayEvent(e, name)}
                </li>
              ))}
          </ol>
        ) : null}
        {over ? (
          <section className="pc-planche-card pc-as-end" data-assaut-end>
            <h2>
              {result.seals} sceau{result.seals > 1 ? "x" : ""} brisé{result.seals > 1 ? "s" : ""}
            </h2>
            <p>
              Dégâts au port : {Math.round(result.damageBps / 100)} %.{" "}
              {result.damaged.length
                ? `${result.damaged.map(name).join(", ")} rentre${result.damaged.length > 1 ? "nt" : ""} abîmé${result.damaged.length > 1 ? "s" : ""} : l'Arsenal ${result.damaged.length > 1 ? "les" : "le"} répare en moins d'une heure.`
                : "Toute ta flotte rentre intacte."}
            </p>
            <div className="pc-pl-acts">
              {remote ? null : (
                <button
                  type="button"
                  className="pc-passe-quiet"
                  data-assaut-again
                  onClick={() => {
                    setS(assautInit(R, port, fleet));
                    setMoves([]);
                    setPending({});
                    setTold([]);
                    setStep(-1);
                  }}
                >
                  Rejouer
                </button>
              )}
              <button type="button" className="pc-passe-go" data-assaut-back onClick={onBack}>
                Revenir à la planche
              </button>
            </div>
          </section>
        ) : (
          <>
            <div className="pc-as-tray" aria-label="Ta flotte">
              {Object.entries(s.ships).map(([k, x]) => {
                const id = Number(k);
                const at = where(id);
                return (
                  <button
                    key={k}
                    type="button"
                    className="pc-as-ship"
                    data-ship={x.kind}
                    data-id={id}
                    data-glow={String(glow(`ship:${id}`))}
                    aria-pressed={chosen === id}
                    disabled={!movable(id)}
                    onClick={() => choose(id)}
                  >
                    <ShipGlyph kind={x.kind} size={40} damaged={!!x.sunk} />
                    <b>{name(id)}</b>
                    <span>
                      {x.force} · <Hull hull={x.hull} max={x.max} />
                    </span>
                    <small>
                      {x.sunk
                        ? "coulé"
                        : at
                          ? (PASS_NAMES[at] ?? at)
                          : (KEYWORD[x.keyword] ?? "en réserve")}
                    </small>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              className="pc-passe-go pc-as-go"
              data-assaut-go
              data-glow={String(glow("go"))}
              disabled={busy}
              onClick={() => void go()}
            >
              Lancer la manche {s.manche}
              <small>
                {Object.keys(pending).length
                  ? `${Object.keys(pending).length} navire${Object.keys(pending).length > 1 ? "s" : ""} envoyé${Object.keys(pending).length > 1 ? "s" : ""}`
                  : "les navires déjà posés restent où ils sont"}
              </small>
            </button>
          </>
        )}
      </footer>
    </div>
  );
}
