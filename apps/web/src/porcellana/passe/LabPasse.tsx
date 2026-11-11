/**
 * The laboratory of the Passe (?lab=passe, docs/plan-passe.md P5): the duel of the thread against
 * the chain in Porcellana, by touch, on a phone first. Against the opponent (as the thread or as
 * the chain), two on one screen, and the problems (« the thread passes in three pieces »).
 */
import "../porcellana.css";
import "./passe.css";
import {
  PASSE_CHAIN,
  PASSE_EMPTY,
  PASSE_REEF,
  PASSE_THREAD,
  type PasseMove,
  type PasseProblem,
  type PasseSetup,
  type PasseSide,
  type PasseState,
  type PasseStyle,
  passeCargo,
  passeDistance,
  passeInit,
  passeLegal,
  passePlay,
  passeThink,
  venice1450Passe,
} from "@comptoirs/engine";
import { Canvas } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { OrthographicCamera } from "three";
import { PasseBoard, type PasseMarks } from "./PasseBoard.js";
import { usePasseRoom } from "./usePasseRoom.js";

const { rules, boards, problems } = venice1450Passe;
type BoardKey = keyof typeof boards;
/** Who plays: the thread against the opponent, the chain against it, or two on this screen. */
type Seat = "fil" | "chaine" | "deux";

const STYLES: { key: PasseStyle | "aucune"; name: string }[] = [
  { key: "aucune", name: "Sans manière" },
  { key: "mur", name: "Il mure le centre" },
  { key: "rives", name: "Il court les rives" },
  { key: "meute", name: "Il harcèle" },
];
const FORCES = ["Novice", "Marin", "Capitaine", "Amiral"];
const COLS = "ABCDEFGHI";

function setupOf(board: BoardKey, problem: PasseProblem | null): PasseSetup {
  if (problem)
    return {
      ...rules,
      fire: { thread: 0, chain: 0 },
      width: problem.width,
      height: problem.height,
      cells: problem.cells,
      first: 1,
    };
  const b = boards[board];
  return { ...rules, width: b.width, height: b.height, cells: [...b.cells], first: b.first };
}

const cellName = (s: PasseState, i: number) =>
  `${COLS[i % s.width] ?? "?"}${Math.floor(i / s.width) + 1}`;
const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

/** A duel asked by the shared board: one passage, its captain, and what to do once it is over. */
export interface PasseDuel {
  board: string;
  foe: string;
  onEnd: (won: boolean) => void;
}

export default function LabPasse({ duel }: { duel?: PasseDuel } = {}) {
  const [board, setBoard] = useState<BoardKey>(
    duel && duel.board in boards ? (duel.board as BoardKey) : "segna",
  );
  const [seat, setSeat] = useState<Seat>("fil");
  const [depth, setDepth] = useState(3);
  const [style, setStyle] = useState<PasseStyle | "aucune">("aucune");
  const [problem, setProblem] = useState<PasseProblem | null>(null);
  const [open, setOpen] = useState(false);
  const setup = useMemo(() => setupOf(board, problem), [board, problem]);
  const [state, setState] = useState<PasseState>(() => passeInit(setup));
  const [last, setLast] = useState(-1);
  const [firing, setFiring] = useState(false);
  const [hint, setHint] = useState(-1);
  const [said, setSaid] = useState("");
  const [thinking, setThinking] = useState(false);
  const game = useRef(0);
  // A duel on line (P6): the server holds the game; its state replaces ours at each read.
  const net = usePasseRoom();
  const room = net.room;
  const [codeTyped, setCodeTyped] = useState("");
  const [, setBeat] = useState(0);
  useEffect(() => {
    if (!room) return;
    const key = (room.board in boards ? room.board : "segna") as BoardKey;
    setState(room.state ?? passeInit(setupOf(key, null)));
    setLast(room.last);
  }, [room]);
  // The link a friend was sent: ?lab=passe&salle=CODE comes straight into the room.
  // biome-ignore lint/correctness/useExhaustiveDependencies: once, when the page opens.
  useEffect(() => {
    const c = new URLSearchParams(window.location.search).get("salle");
    if (c) void net.join(c);
  }, []);
  // The clock of a duel on line is redrawn four times a second.
  const ticking = !!room?.deadline;
  useEffect(() => {
    if (!ticking) return;
    const timer = window.setInterval(() => setBeat((b) => b + 1), 250);
    return () => window.clearInterval(timer);
  }, [ticking]);

  const restart = useCallback(() => {
    game.current += 1;
    setState(passeInit(setup));
    setLast(-1);
    setFiring(false);
    setHint(-1);
    setSaid("");
    setThinking(false);
  }, [setup]);
  useEffect(() => restart(), [restart]);

  /** The side the person at the screen plays now (both, when two share it). */
  const mine: PasseSide = room
    ? room.you === 2
      ? 2
      : 1
    : seat === "deux"
      ? state.turn
      : seat === "chaine"
        ? 2
        : 1;
  const theirTurn = room
    ? !state.winner && (room.waiting || room.you === 0 || state.turn !== room.you)
    : !state.winner && seat !== "deux" && state.turn !== mine;

  // The opponent answers, after a breath.
  useEffect(() => {
    if (!theirTurn || room) return;
    const id = game.current;
    setThinking(true);
    const timer = window.setTimeout(() => {
      if (id !== game.current) return;
      const mind = problem
        ? { depth: 3 }
        : { depth, style: style === "aucune" ? undefined : style };
      const move = passeThink(state, mind);
      if (move.fire)
        setSaid(
          state.turn === 2
            ? `Sa bombarde coule ta barge restée seule en ${cellName(state, move.at)}.`
            : `Son brûlot emporte ton maillon en ${cellName(state, move.at)}.`,
        );
      setState(passePlay(state, move));
      setLast(move.at);
      setThinking(false);
    }, 520);
    return () => window.clearTimeout(timer);
  }, [theirTurn, state, depth, style, problem, room]);

  const legal = useMemo(() => passeLegal(state), [state]);
  const fires = useMemo(
    () => (theirTurn ? [] : legal.filter((m) => m.fire).map((m) => m.at)),
    [legal, theirTurn],
  );
  const canFire = fires.length > 0;
  useEffect(() => {
    if (!canFire) setFiring(false);
  }, [canFire]);

  const play = (i: number) => {
    if (state.winner || theirTurn) return;
    const move: PasseMove | undefined = legal.find((m) => m.at === i && !!m.fire === firing);
    if (!move) {
      if (firing) setFiring(false);
      return;
    }
    if (room) {
      void net.play(move);
      setFiring(false);
      return;
    }
    if (move.fire)
      setSaid(
        state.turn === 1
          ? `Ton brûlot emporte le maillon en ${cellName(state, i)}.`
          : `Ta bombarde coule la barge en ${cellName(state, i)}.`,
      );
    else setSaid("");
    setState(passePlay(state, move));
    setLast(i);
    setFiring(false);
    setHint(-1);
  };

  const a = passeDistance(state, 1);
  const c = passeDistance(state, 2);
  const failed = !!problem && !state.winner && state.turn === 1 && state.laid[0] >= problem.moves;
  const over = !!state.winner || failed;
  const cargo = room ? room.cargo : passeCargo(setup, state);
  const marks: PasseMarks = { last, aim: firing ? fires : [], hint };
  const phone = typeof window !== "undefined" && window.innerWidth < 640;
  const plain = phone || new URLSearchParams(window.location.search).has("simple");

  const foe = room?.names ? (mine === 1 ? room.names.chain : room.names.thread) : "ton adversaire";
  const left = room?.deadline
    ? Math.max(0, Math.ceil((room.deadline - net.serverNow()) / 1000))
    : 0;
  const title = duel
    ? `${boards[board].name} · ${duel.foe}`
    : room
      ? `${room.boardName} · salle ${room.code}`
      : problem
        ? `Le fil passe en ${problem.moves} coups`
        : `${boards[board].name} · ${FORCES[depth - 1] ?? ""}`;
  const turn = state.winner
    ? ""
    : room
      ? room.waiting
        ? "En attente de ton adversaire"
        : room.you === 0
          ? "Tu regardes"
          : state.turn === room.you
            ? `À toi · ${left} s`
            : `À ${foe} · ${left} s`
      : thinking
        ? "Il réfléchit…"
        : seat === "deux"
          ? state.turn === 1
            ? "Au fil de jouer"
            : "À la chaîne de jouer"
          : "À toi";
  const verdict = failed
    ? "Ce n'était pas la clef."
    : state.winner === 1
      ? problem
        ? "Passé : c'était la clef."
        : room && mine === 2
          ? `Le fil de ${foe} est passé : ta chaîne n'a pas tenu.`
          : mine === 1 || seat === "deux"
            ? `Le fil est passé en ${plural(state.laid[0], "barge", "barges")} : ${plural(cargo, "cale sauvée", "cales sauvées")} sur ${setup.cargo.holds}.`
            : "Le fil est passé : ta chaîne n'a pas tenu."
      : state.winner === 2
        ? room && mine === 1
          ? `La chaîne de ${foe} est tendue d'une rive à l'autre.`
          : mine === 2 && seat !== "deux"
            ? "Ta chaîne est tendue d'une rive à l'autre."
            : "La chaîne est tendue d'une rive à l'autre."
        : "";
  const link = room
    ? `${window.location.origin}${window.location.pathname}?lab=passe&salle=${room.code}`
    : "";

  return (
    <div className="porcellana fixed inset-0 pc-passe" data-passe-lab data-winner={state.winner}>
      <Canvas
        orthographic
        dpr={[1, 2]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        onCreated={({ camera }) => {
          (camera as OrthographicCamera & { manual?: boolean }).manual = true;
        }}
      >
        <PasseBoard state={state} marks={marks} onCell={play} phone={phone} plain={plain} />
      </Canvas>
      <div className="pc-vignette" />

      <header className="pc-passe-top">
        <div className="pc-passe-title">
          <b>{title}</b>
          <span data-passe-turn>{turn}</span>
        </div>
        <div className="pc-passe-race" aria-live="polite">
          <div data-side="fil" data-mine={String(mine === 1 || seat === "deux")}>
            <i />
            <b data-passe-thread>{a >= 99 ? "×" : a}</b>
            <span>{seat === "chaine" ? "au fil" : seat === "deux" ? "au fil" : "à ton fil"}</span>
          </div>
          <div data-side="chaine" data-mine={String(mine === 2 && seat !== "deux")}>
            <i />
            <b data-passe-chain>{c >= 99 ? "×" : c}</b>
            <span>{seat === "chaine" ? "à ta chaîne" : "à la chaîne"}</span>
          </div>
        </div>
      </header>

      {/* The board for a keyboard, a screen reader and the walk-through: one button a cell. */}
      <div className="pc-passe-grid" aria-label="Le damier, du nord au sud">
        {state.cells.map((v, i) => (
          <button
            // biome-ignore lint/suspicious/noArrayIndexKey: a cell is its index.
            key={i}
            type="button"
            data-cell={i}
            data-hint={hint === i ? "" : undefined}
            disabled={over || theirTurn || (v !== PASSE_EMPTY && !fires.includes(i))}
            onClick={() => play(i)}
          >
            {cellName(state, i)} :{" "}
            {v === PASSE_THREAD
              ? "une barge"
              : v === PASSE_CHAIN
                ? "un maillon"
                : v === PASSE_REEF
                  ? "un écueil"
                  : "libre"}
            {hint === i ? " (la clef)" : ""}
          </button>
        ))}
      </div>

      <footer className="pc-passe-foot">
        {said && !over && !room ? <p className="pc-passe-said">{said}</p> : null}
        {net.error ? <p className="pc-passe-said">{net.error}</p> : null}
        {room?.waiting ? (
          <div className="pc-passe-end" data-passe-wait>
            <p>
              Salle <b data-passe-code>{room.code}</b> : envoie ce lien à ton adversaire. Le duel
              commence dès qu'il arrive.
            </p>
            <input
              className="pc-passe-link"
              id="passe-link"
              readOnly
              value={link}
              aria-label="Le lien de la salle"
              onFocus={(e) => e.currentTarget.select()}
            />
            <div>
              <button
                type="button"
                className="pc-passe-go"
                onClick={() => {
                  navigator.clipboard?.writeText(link).catch(() => {});
                  setSaid("");
                }}
              >
                Copier le lien
              </button>
            </div>
          </div>
        ) : null}
        {over ? (
          <div className="pc-passe-end" data-passe-end>
            <p>{verdict}</p>
            <div>
              {room ? (
                <>
                  <button
                    type="button"
                    className="pc-passe-go"
                    disabled={room.again.you || room.you === 0}
                    onClick={() => void net.again()}
                  >
                    {room.again.you
                      ? "Revanche demandée…"
                      : room.again.other
                        ? `${foe} veut sa revanche`
                        : "Revanche, camps échangés"}
                  </button>
                  <button type="button" className="pc-passe-quiet" onClick={net.leave}>
                    Quitter la salle
                  </button>
                </>
              ) : duel ? (
                <button
                  type="button"
                  className="pc-passe-go"
                  data-passe-back
                  onClick={() => duel.onEnd(state.winner === 1)}
                >
                  Revenir à la planche
                </button>
              ) : (
                <button type="button" className="pc-passe-go" onClick={restart}>
                  {problem ? "Réessayer" : "Rejouer"}
                </button>
              )}
              {problem && failed ? (
                <button
                  type="button"
                  className="pc-passe-quiet"
                  onClick={() => {
                    restart();
                    setHint(problem.key.at);
                  }}
                >
                  Voir la clef
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="pc-passe-bar">
            {state.fire[mine === 1 ? 0 : 1] > 0 && !problem ? (
              <button
                type="button"
                className="pc-passe-go"
                aria-pressed={firing}
                disabled={!canFire}
                onClick={() => setFiring((f) => !f)}
              >
                {firing
                  ? mine === 1
                    ? "Touche un maillon"
                    : "Touche une barge"
                  : mine === 1
                    ? "Brûlot"
                    : "Bombarde"}
              </button>
            ) : null}
            {room ? (
              <button type="button" className="pc-passe-quiet" onClick={net.leave}>
                Quitter la salle
              </button>
            ) : duel ? (
              <button type="button" className="pc-passe-quiet" onClick={() => duel.onEnd(false)}>
                Rompre
              </button>
            ) : (
              <button type="button" className="pc-passe-quiet" onClick={restart}>
                Recommencer
              </button>
            )}
            {duel ? null : (
              <button
                type="button"
                className="pc-passe-quiet"
                aria-expanded={open}
                onClick={() => setOpen((o) => !o)}
              >
                Réglages
              </button>
            )}
          </div>
        )}
        {over && !duel ? (
          <button
            type="button"
            className="pc-passe-quiet pc-passe-more"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            Réglages
          </button>
        ) : null}
      </footer>

      {open ? (
        <section className="pc-passe-sheet" aria-label="Réglages du duel">
          <button
            type="button"
            className="pc-passe-x"
            aria-label="Fermer"
            onClick={() => setOpen(false)}
          >
            ×
          </button>
          <h2>La règle</h2>
          <p>
            Le fil relie la rive du sud à celle du nord (les rails rouges). La chaîne relie l'ouest
            à l'est (les rails d'encre). Chacun pose une pièce à son tour. Deux pièces se tiennent
            côte à côte, ou en biais dans le sens du courant : la rainure sur chaque case. Une seule
            des deux lignes peut aboutir.
          </p>
          <h2>Tu joues</h2>
          <div className="pc-passe-opts">
            {(
              [
                ["fil", "Le fil"],
                ["chaine", "La chaîne"],
                ["deux", "À deux, sur cet écran"],
              ] as const
            ).map(([k, name]) => (
              <button
                key={k}
                type="button"
                aria-pressed={seat === k && !problem}
                onClick={() => {
                  setProblem(null);
                  setSeat(k);
                }}
              >
                {name}
              </button>
            ))}
          </div>
          <h2>Un ami, en ligne</h2>
          <p>
            Ouvre une salle sur le passage choisi et envoie le lien. Quinze secondes par coup ;
            passé ce délai, ton lieutenant pose une pièce pour toi. La revanche échange les camps.
          </p>
          <div className="pc-passe-opts">
            <button
              type="button"
              data-passe-open
              onClick={() => {
                setProblem(null);
                setOpen(false);
                void net.open(board);
              }}
            >
              Ouvrir une salle
            </button>
            <input
              id="passe-code"
              className="pc-passe-code"
              aria-label="Le code d'une salle"
              placeholder="CODE"
              maxLength={6}
              autoCapitalize="characters"
              value={codeTyped}
              onChange={(e) => setCodeTyped(e.target.value.toUpperCase())}
            />
            <button
              type="button"
              disabled={codeTyped.length !== 6}
              onClick={() => {
                setProblem(null);
                setOpen(false);
                void net.join(codeTyped);
              }}
            >
              Rejoindre
            </button>
          </div>
          <h2>Le passage</h2>
          <div className="pc-passe-opts">
            {(Object.keys(boards) as BoardKey[]).map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={board === k && !problem}
                onClick={() => {
                  setProblem(null);
                  setBoard(k);
                }}
              >
                {boards[k].name}
              </button>
            ))}
          </div>
          <h2>L'adversaire</h2>
          <div className="pc-passe-opts">
            {FORCES.map((name, k) => (
              <button
                key={name}
                type="button"
                aria-pressed={depth === k + 1}
                onClick={() => setDepth(k + 1)}
              >
                {name}
              </button>
            ))}
          </div>
          <div className="pc-passe-opts">
            {STYLES.map((s) => (
              <button
                key={s.key}
                type="button"
                aria-pressed={style === s.key}
                onClick={() => setStyle(s.key)}
              >
                {s.name}
              </button>
            ))}
          </div>
          <h2>Les problèmes</h2>
          <p>Une position, une seule clef. Sans brûlot ni bombarde.</p>
          <div className="pc-passe-opts pc-passe-probs">
            {problems.map((p, k) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={problem?.id === p.id}
                onClick={() => {
                  setSeat("fil");
                  setProblem(p);
                  setOpen(false);
                }}
              >
                {k + 1}
                <small>en {p.moves}</small>
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
