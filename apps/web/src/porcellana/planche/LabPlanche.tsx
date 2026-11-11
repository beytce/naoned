/**
 * The laboratory of the shared board (?lab=planche, docs/plan-planche.md): one's house among seven
 * held by the computer, the towns all dispute, the threads one stretches and takes back, the
 * passages one pays or forces by the Passe. Time runs fast here: a second is ten minutes of the game.
 */
import "../porcellana.css";
import "../passe/passe.css";
import "./planche.css";
import {
  type PlancheState,
  plancheAdvance,
  plancheForced,
  plancheFreeBobbins,
  plancheInit,
  plancheIsCorsair,
  planchePatina,
  planchePrice,
  plancheRobot,
  plancheRouteOpen,
  plancheThread,
  plancheToll,
  plancheUnthread,
  venice1450Planche,
} from "@comptoirs/engine";
import { Canvas } from "@react-three/fiber";
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { OrthographicCamera } from "three";
import { PlancheBoard, type PlancheLand, type PlanchePick } from "./PlancheBoard.js";

const LabPasse = lazy(() => import("../passe/LabPasse.js"));

const S = venice1450Planche;
const HOUR = 3_600_000;
const T0 = Date.parse("2026-11-16T06:00:00Z");
/** Hours between two visits of a house held by the computer, and each one's own hour. */
const VISIT = 8;
const OFFSET: Record<string, number> = Object.fromEntries(S.houses.map((h, k) => [h.id, k]));

/** Venice's land on this board: the mainland to the west and the north, the far coast to the south-east. */
const LAND: PlancheLand = {
  land: (x, y) =>
    x <= 6 + Math.round(1.5 * Math.sin(y * 0.7)) ||
    y <= 2 + Math.round(Math.sin(x * 0.5)) ||
    (x >= 22 && y >= 10 + Math.round(Math.sin(x)) && !(x === 24 && y === 14)),
  peril: (x, y) => {
    const r = Math.hypot((x - S.lagoon.x) / 15, (y - S.lagoon.y) / 10);
    const t = Math.min(1, Math.max(0, (r - 0.62) / 0.5));
    return t * t * (3 - 2 * t);
  },
  rialto: S.rialto,
};

const ducats = (deniers: bigint | number) =>
  Math.round(Number(deniers) / 100).toLocaleString("fr-FR");
const houseName = (id: string, names?: Record<string, string>) =>
  names?.[id] ?? S.houses.find((h) => h.id === id)?.name ?? id;
const nameOf = (id: string, names?: Record<string, string>) =>
  plancheIsCorsair(id) ? `le corsaire ${id.slice(8)}` : houseName(id, names);
const SAID: Record<string, string> = {
  planche_no_bobbin: "Plus de bobine libre : reprends un fil, ou attends qu'une bobine revienne.",
  planche_route_shut: "La route est fermée par un corsaire : force le passage.",
  planche_twice: "Ce fil est déjà tendu.",
};

interface News {
  id: number;
  text: string;
  pick: PlanchePick;
}

/** The board as the server sends it: its amounts are strings of deniers, made bigints again. */
function revive(raw: PlancheState): PlancheState {
  const big = (v: unknown) => BigInt(String(v ?? 0));
  const houses: PlancheState["houses"] = {};
  for (const [id, h] of Object.entries(raw.houses))
    houses[id] = { ...h, ducats: big(h.ducats), earned: big(h.earned) };
  return { ...raw, houses, minted: big(raw.minted), burnt: big(raw.burnt) };
}

interface Online {
  since: number;
  me: string | null;
  names: Record<string, string>;
  players: string[];
}

export default function LabPlanche() {
  /** On line by default (the server holds the board); `&seul` plays a board of one's own, here. */
  const online = useMemo(() => !new URLSearchParams(window.location.search).has("seul"), []);
  const [view, setView] = useState<Online | null>(null);
  const ME = online ? (view?.me ?? "") : "toi";
  const [state, setState] = useState<PlancheState>(() => plancheInit(S, T0));
  const [chosen, setChosen] = useState<PlanchePick | null>(null);
  const [speed, setSpeed] = useState(1);
  const [said, setSaid] = useState("");
  const [news, setNews] = useState<News[]>([]);
  const [duel, setDuel] = useState<string | null>(null);
  const pins = useRef(new Map<string, HTMLElement>()).current;
  const seq = useRef(0);
  const tell = useCallback(
    (text: string, pick: PlanchePick) =>
      // A news already on the thread is not told again.
      setNews((n) =>
        n.some((x) => x.text === text) ? n : [...n.slice(-2), { id: ++seq.current, text, pick }],
      ),
    [],
  );
  const pin = (key: string) => (el: HTMLElement | null) => {
    if (el) pins.set(key, el);
    else pins.delete(key);
  };

  // On line: the board is read from the server every two seconds; it moves there, not here.
  // One call after the other: two at once, before the guest's cookie is given, would be two guests.
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const send = useCallback(async (path = "", body?: unknown) => {
    try {
      const res = await fetch(`/api/planche${path}`, {
        method: body === undefined ? "GET" : "POST",
        credentials: "same-origin",
        headers: body === undefined ? undefined : { "content-type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const json = (await res.json().catch(() => null)) as {
        planche?: Online & { state: PlancheState };
        error?: string;
      } | null;
      if (!json?.planche) return json?.error ?? "offline";
      setState(revive(json.planche.state));
      setView({
        since: json.planche.since,
        me: json.planche.me,
        names: json.planche.names,
        players: json.planche.players,
      });
      return "ok";
    } catch {
      return "offline";
    }
  }, []);
  const call = useCallback(
    (path = "", body?: unknown): Promise<string> => {
      const next = queue.current.then(() => send(path, body));
      queue.current = next.catch(() => "offline");
      return next;
    },
    [send],
  );
  useEffect(() => {
    if (!online || duel) return;
    let alive = true;
    const read = async () => {
      const res = await call();
      if (alive && res === "offline")
        setSaid("Le serveur ne répond pas. Lance « pnpm dev », ou ajoute « &seul » à l'adresse.");
    };
    void read();
    const timer = window.setInterval(read, 2000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [online, duel, call]);

  // Time, played here: a slice of the game a tick; the houses of the computer visit in their turn.
  useEffect(() => {
    if (online || !speed || duel) return;
    const timer = window.setInterval(() => {
      setState((s0) => {
        const now = s0.now + S.sliceMs;
        let s = plancheAdvance(S, s0, now);
        const hour = Math.floor((now - T0) / HOUR);
        if ((now - T0) % HOUR === 0)
          for (const h of S.houses) {
            if (!h.robot || (hour + (OFFSET[h.id] ?? 0)) % VISIT !== 0) continue;
            s = plancheRobot(S, s, h.id, now);
          }
        return s;
      });
    }, 1000 / speed);
    return () => window.clearInterval(timer);
  }, [online, speed, duel]);

  // A rival stretches a thread toward a town where one sells: said once, in both modes.
  const seen = useRef<Record<string, string[]>>({});
  useEffect(() => {
    const mineTo = new Set(state.houses[ME]?.threads.map((t) => t.to));
    for (const h of S.houses) {
      if (h.id === ME) continue;
      const now = state.houses[h.id]?.threads.map((t) => t.to) ?? [];
      const before = seen.current[h.id];
      if (before)
        for (const to of now)
          if (!before.includes(to) && mineTo.has(to)) {
            const c = S.cities.find((x) => x.id === to);
            if (c)
              tell(`${houseName(h.id, view?.names)} tend un fil vers ${c.name}, où tu vends.`, {
                kind: "city",
                id: to,
              });
          }
      seen.current[h.id] = now;
    }
  });

  // A town where one sells has tired: said once, until it has rested.
  const tired = useRef(new Set<string>());
  useEffect(() => {
    for (const t of state.houses[ME]?.threads ?? []) {
      const w = S.cities.find((c) => c.id === t.to)?.wants[t.good];
      const key = `${t.to}|${t.good}`;
      if (!w) continue;
      const share = planchePrice(S, state, t.to, t.good) / w.price;
      if (share < 0.45 && !tired.current.has(key)) {
        tired.current.add(key);
        const city = S.cities.find((c) => c.id === t.to);
        tell(
          `${city?.name} se lasse : ton ${S.goods[t.good]?.toLowerCase()} n'y vaut plus que ${Math.round(share * 100)} % du plein prix.`,
          { kind: "city", id: t.to },
        );
      } else if (share > 0.7) tired.current.delete(key);
    }
  });

  const me = state.houses[ME];
  const mine = S.houses.find((h) => h.id === ME);
  const free = plancheFreeBobbins(S, state, ME);
  const rank = useMemo(() => {
    const order = S.houses
      .map((h) => ({ id: h.id, earned: state.houses[h.id]?.earned ?? 0n }))
      .sort((a, b) => (b.earned > a.earned ? 1 : b.earned < a.earned ? -1 : 0));
    return { place: order.findIndex((o) => o.id === ME) + 1, order };
  }, [state, ME]);
  /** A gesture: on line it is the server's to play, here it is the engine's. */
  const act = (f: () => PlancheState, done?: string, remote?: [string, unknown]) => {
    if (online && remote) {
      void call(...remote).then((res) =>
        setSaid(res === "ok" ? (done ?? "") : (SAID[res] ?? "Ce geste n'est pas possible.")),
      );
      return;
    }
    try {
      setState(f());
      setSaid(done ?? "");
    } catch (e) {
      setSaid(SAID[(e as Error).message] ?? "Ce geste n'est pas possible.");
    }
  };

  const day =
    Math.floor((state.now - (online ? (view?.since ?? state.now) : T0)) / (24 * HOUR)) + 1;
  const hour = new Date(state.now).getUTCHours();
  const phone = typeof window !== "undefined" && window.innerWidth < 640;
  const plain = phone || new URLSearchParams(window.location.search).has("simple");

  if (duel) {
    const p = S.passages.find((q) => q.id === duel);
    const holder = state.passages[duel]?.holder ?? "";
    return (
      <Suspense fallback={null}>
        <LabPasse
          duel={{
            board: p?.board ?? "segna",
            foe: plancheIsCorsair(holder)
              ? holder.slice(8)
              : `le lieutenant de ${nameOf(holder, view?.names)}`,
            onEnd: (won, moves) => {
              setDuel(null);
              if (!won) {
                setSaid("La chaîne a tenu : tu perds la cargaison engagée, rien d'autre.");
                return;
              }
              act(() => plancheForced(S, state, ME, duel, state.now), undefined, [
                "/force",
                { passage: duel, moves },
              ]);
              const left = (state.passages[duel]?.seals ?? 1) - 1;
              setSaid(
                left > 0
                  ? `Passé. Un sceau brisé : il en reste ${left}. Tes fils traversent librement pendant un jour.`
                  : `${p?.name} porte ton pavillon : la route est ouverte, et les autres te paient le péage.`,
              );
            },
          }}
        />
      </Suspense>
    );
  }

  const city = chosen?.kind === "city" ? S.cities.find((c) => c.id === chosen.id) : undefined;
  const passage =
    chosen?.kind === "passage" ? S.passages.find((p) => p.id === chosen.id) : undefined;
  const house = chosen?.kind === "house" ? S.houses.find((h) => h.id === chosen.id) : undefined;

  return (
    <div className="porcellana fixed inset-0 pc-passe pc-planche" data-planche-lab>
      <Canvas
        orthographic
        dpr={[1, 2]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        onCreated={({ camera }) => {
          (camera as OrthographicCamera & { manual?: boolean }).manual = true;
        }}
        onPointerMissed={() => setChosen(null)}
      >
        <PlancheBoard
          setup={S}
          land={LAND}
          state={state}
          me={ME}
          chosen={chosen}
          pins={pins}
          onPick={setChosen}
          phone={phone}
          plain={plain}
        />
      </Canvas>
      <div className="pc-vignette" />

      {/* The labels: every place is a button, for the thumb, the keyboard and the screen reader. */}
      <div className="pc-planche-pins">
        {S.cities.map((c) => {
          const served = me?.threads.some((t) => t.to === c.id);
          return (
            <button
              key={c.id}
              type="button"
              ref={pin(`city:${c.id}`)}
              className="pc-planche-pin"
              data-city={c.id}
              data-mine={String(!!served)}
              data-shut={String(!plancheRouteOpen(S, state, ME, c.id, state.now))}
              onClick={() => setChosen({ kind: "city", id: c.id })}
            >
              <b>{c.name}</b>
              <span className="pc-planche-bars">
                {Object.entries(c.wants).map(([good, w]) => (
                  <i
                    key={good}
                    title={S.goods[good]}
                    style={{
                      ["--fill" as string]: `${Math.round(((state.gauges[c.id]?.[good]?.left ?? 0) / w.cap) * 100)}%`,
                    }}
                  />
                ))}
              </span>
            </button>
          );
        })}
        {S.passages.map((p) => {
          const holder = state.passages[p.id]?.holder ?? p.holder;
          return (
            <button
              key={p.id}
              type="button"
              ref={pin(`passage:${p.id}`)}
              className="pc-planche-pin"
              data-passage={p.id}
              data-mine={String(holder === ME)}
              data-dark={String(plancheIsCorsair(holder))}
              onClick={() => setChosen({ kind: "passage", id: p.id })}
            >
              <b>{p.name}</b>
            </button>
          );
        })}
        {S.houses.map((h) => (
          <button
            key={h.id}
            type="button"
            ref={pin(`house:${h.id}`)}
            className="pc-planche-pin pc-planche-house"
            data-house={h.id}
            data-mine={String(h.id === ME)}
            onClick={() => setChosen({ kind: "house", id: h.id })}
          >
            <b>{h.id === ME ? "Ta Maison" : houseName(h.id, view?.names)}</b>
          </button>
        ))}
      </div>

      <header className="pc-passe-top">
        <div className="pc-passe-title">
          <b>
            Jour {day} · {hour} h
          </b>
          {online ? (
            <span className="pc-planche-online" data-planche-online>
              {view && !view.me
                ? "En ligne · tu regardes : toutes les Maisons sont prises"
                : `En ligne · ${view?.players.length ?? 0} joueur${(view?.players.length ?? 0) > 1 ? "s" : ""}`}
            </span>
          ) : (
            <span className="pc-planche-speed">
              {(
                [
                  [0, "Pause"],
                  [1, "×1"],
                  [6, "×6"],
                ] as const
              ).map(([v, name]) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={speed === v}
                  onClick={() => setSpeed(v)}
                >
                  {name}
                </button>
              ))}
            </span>
          )}
        </div>
        <div className="pc-passe-race">
          <div data-side="fil" data-mine="true">
            <i />
            <b data-planche-ducats>{ducats(me?.ducats ?? 0n)}</b>
            <span>ducats</span>
          </div>
          <div data-side="fil">
            <i />
            <b data-planche-bobbins>
              {free}
              <small>/{S.rules.bobbins}</small>
            </b>
            <span>bobines</span>
          </div>
          <div data-side="chaine">
            <i />
            <b data-planche-rank>
              {rank.place}
              <small>e</small>
            </b>
            <span>sur {S.houses.length}</span>
          </div>
        </div>
      </header>

      <footer className="pc-passe-foot">
        {said ? <p className="pc-passe-said">{said}</p> : null}
        {city ? (
          <section className="pc-planche-card" data-planche-card>
            <h2>{city.name}</h2>
            {online && !ME ? (
              <p>Toutes les Maisons sont prises : tu regardes la planche sans y jouer.</p>
            ) : !plancheRouteOpen(S, state, ME, city.id, state.now) ? (
              <p>
                Route fermée :{" "}
                {city.via
                  .filter((id) => plancheIsCorsair(state.passages[id]?.holder ?? ""))
                  .map((id) => S.passages.find((p) => p.id === id)?.name)
                  .join(", ")}{" "}
                est aux corsaires. Force le passage.
              </p>
            ) : city.via.length ? (
              <p>
                Par {city.via.map((id) => S.passages.find((p) => p.id === id)?.name).join(", ")}.
              </p>
            ) : null}
            {Object.entries(city.wants).map(([good, w]) => {
              const price = planchePrice(S, state, city.id, good);
              const left = state.gauges[city.id]?.[good]?.left ?? 0;
              const held = me?.threads.find((t) => t.to === city.id && t.good === good);
              const makes = !!mine && good in mine.makes;
              const others = S.houses.filter(
                (h) =>
                  h.id !== ME &&
                  state.houses[h.id]?.threads.some((t) => t.to === city.id && t.good === good),
              );
              return (
                <div key={good} className="pc-planche-row">
                  <div>
                    <b>{S.goods[good]}</b>
                    <span>
                      {ducats(price)} ducats · demande {Math.round((left / w.cap) * 100)} %
                      {others.length
                        ? ` · ${others.map((o) => houseName(o.id, view?.names).replace("Ca’ ", "")).join(", ")}`
                        : " · personne d'autre"}
                    </span>
                    <i style={{ ["--fill" as string]: `${Math.round((left / w.cap) * 100)}%` }} />
                  </div>
                  {online && !ME ? null : held ? (
                    <button
                      type="button"
                      className="pc-passe-quiet"
                      data-untie={good}
                      onClick={() =>
                        act(
                          () => plancheUnthread(S, state, ME, city.id, good, state.now),
                          "Fil repris : la bobine revient au quai.",
                          ["/unthread", { city: city.id, good }],
                        )
                      }
                    >
                      Reprendre
                      <small>patine +{Math.round(planchePatina(S, held, state.now) / 100)} %</small>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="pc-passe-go"
                      data-tie={good}
                      disabled={!makes}
                      onClick={() =>
                        act(
                          () => plancheThread(S, state, ME, city.id, good, state.now),
                          `Fil tendu vers ${city.name}.`,
                          ["/thread", { city: city.id, good }],
                        )
                      }
                    >
                      {makes ? "Tirer un fil" : "Ton île n'en fait pas"}
                    </button>
                  )}
                </div>
              );
            })}
          </section>
        ) : null}
        {passage ? (
          <section className="pc-planche-card" data-planche-card>
            <h2>{passage.name}</h2>
            {(() => {
              const p = state.passages[passage.id];
              const holder = p?.holder ?? passage.holder;
              const freeUntil = me?.free[passage.id] ?? 0;
              return (
                <>
                  <p>
                    Tenu par {holder === ME ? "toi" : nameOf(holder, view?.names)} · {p?.seals}{" "}
                    sceau
                    {(p?.seals ?? 0) > 1 ? "x" : ""} ·{" "}
                    {plancheIsCorsair(holder)
                      ? "il ne laisse passer personne"
                      : `péage de ${Math.round((p?.tollBps ?? 0) / 100)} %`}
                    {freeUntil > state.now
                      ? ` · tu passes librement encore ${Math.ceil((freeUntil - state.now) / HOUR)} h`
                      : ""}
                  </p>
                  {online && !ME ? null : holder === ME ? (
                    <div className="pc-passe-opts">
                      {[500, 1000, 1500].map((bps) => (
                        <button
                          key={bps}
                          type="button"
                          aria-pressed={p?.tollBps === bps}
                          onClick={() =>
                            act(
                              () => plancheToll(S, state, ME, passage.id, bps),
                              `Péage réglé à ${bps / 100} %.`,
                              ["/toll", { passage: passage.id, tollBps: bps }],
                            )
                          }
                        >
                          Péage {bps / 100} %
                        </button>
                      ))}
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="pc-passe-go"
                      data-force
                      onClick={() => setDuel(passage.id)}
                    >
                      Forcer le passage
                      <small>la Passe, un duel de deux minutes</small>
                    </button>
                  )}
                </>
              );
            })()}
          </section>
        ) : null}
        {house ? (
          <section className="pc-planche-card" data-planche-card>
            <h2>{house.id === ME ? "Ta Maison" : houseName(house.id, view?.names)}</h2>
            <p>
              {house.id === ME ? "Ton île fait" : "Son île fait"} :{" "}
              {Object.entries(house.makes)
                .map(([g, n]) => `${S.goods[g]?.toLowerCase()} (${n} par heure)`)
                .join(", ")}
              .
              {(online ? !view?.players.includes(house.id) : house.robot)
                ? " Maison tenue par l'ordinateur."
                : house.id === ME
                  ? ""
                  : " Maison d'un joueur."}
            </p>
            {house.id === ME ? (
              <p>
                En entrepôt :{" "}
                {Object.entries(me?.stock ?? {})
                  .map(([g, n]) => `${n} ${S.goods[g]?.toLowerCase()}`)
                  .join(", ")}{" "}
                (plafond {S.rules.store}).
              </p>
            ) : null}
            {(state.houses[house.id]?.threads ?? []).map((t) => (
              <div key={`${t.to}|${t.good}`} className="pc-planche-row">
                <div>
                  <b>{S.cities.find((c) => c.id === t.to)?.name}</b>
                  <span>
                    {S.goods[t.good]} · patine +{Math.round(planchePatina(S, t, state.now) / 100)} %
                  </span>
                </div>
              </div>
            ))}
            {house.id === ME && !me?.threads.length ? (
              <p className="pc-planche-do">Touche une ville pour y tirer ton premier fil.</p>
            ) : null}
          </section>
        ) : null}
        {!chosen ? (
          <div className="pc-planche-news" aria-label="Le fil des nouvelles">
            {news.length ? (
              news.map((n) => (
                <button key={n.id} type="button" onClick={() => setChosen(n.pick)}>
                  <i />
                  {n.text}
                </button>
              ))
            ) : (
              <button type="button" onClick={() => setChosen({ kind: "house", id: ME })}>
                <i />
                {me?.threads.length
                  ? "Tes barges suivent tes fils. Touche une ville pour voir sa demande."
                  : "Touche une ville, puis « Tirer un fil » : tes barges feront le reste."}
              </button>
            )}
          </div>
        ) : null}
      </footer>
    </div>
  );
}
