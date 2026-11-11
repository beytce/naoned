/**
 * The screen of one's island (docs/plan-ile.md I4): the island in Porcellana, the card of a tile,
 * the workshop in hand with what each free tile would give it, the store, the way back to the board.
 * The gestures are the board's (here or on the server): this screen only asks for them.
 */
import {
  ILE_FONDACO,
  type PlancheSetup,
  type PlancheState,
  ileBonusBps,
  ileBuyable,
  ileRates,
  ileTileCost,
  plancheGround,
} from "@comptoirs/engine";
import { Canvas } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import type { OrthographicCamera } from "three";
import { IleBoard, type IlePick, TERRAIN_NAMES } from "./IleBoard.js";

/** A gesture on the island, as the board takes it. */
export type IleGesture =
  | { kind: "buy"; at: string }
  | { kind: "build"; type: string; at: string }
  | { kind: "upgrade"; at: string }
  | { kind: "move"; from: string; to: string };

const SAID: Record<string, string> = {
  planche_poor: "Ta bourse n'y suffit pas.",
  ile_building: "Le chantier n'est pas fini.",
  ile_top: "Cet atelier est déjà au niveau le plus haut.",
  ile_taken: "Cette case est déjà bâtie.",
  ile_full: "Ton île a toutes ses cases.",
  ile_not_buyable: "Cette case ne touche pas ton île.",
};
const ducats = (d: bigint | number) => Math.round(Number(d) / 100).toLocaleString("fr-FR");
const pct = (bps: number) =>
  `${bps > 0 ? "+" : bps < 0 ? "−" : "±"}${Math.abs(Math.round(bps / 100))} %`;
const duration = (ms: number) =>
  ms >= 3_600_000
    ? `${Math.round(ms / 3_600_000)} h`
    : `${Math.max(1, Math.round(ms / 60_000))} min`;

export function IleScreen({
  setup: S,
  state,
  house,
  onGesture,
  onBack,
}: {
  setup: PlancheSetup;
  state: PlancheState;
  house: string;
  /** Plays a gesture; answers « ok » or the refusal's code. */
  onGesture: (g: IleGesture) => Promise<string> | string;
  onBack: () => void;
}) {
  const R = S.ile;
  const h = state.houses[house];
  const ile = h?.ile;
  const now = state.now;
  const [chosen, setChosen] = useState<IlePick | null>(null);
  /** The workshop in hand: to lay (a type) or to move (from a tile). */
  const [hand, setHand] = useState<{ type: string; from?: string } | null>(null);
  const [sheet, setSheet] = useState(false);
  const [said, setSaid] = useState("");
  const pins = useRef(new Map<string, HTMLElement>()).current;
  const pin = (k: string) => (el: HTMLElement | null) => {
    if (el) pins.set(k, el);
    else pins.delete(k);
  };
  const buyable = useMemo(() => (R && ile ? ileBuyable(R, ile) : []), [R, ile]);
  const ground = useMemo(() => plancheGround(S, house), [S, house]);
  const rates = useMemo(() => (R && ile ? ileRates(R, ile, now) : {}), [R, ile, now]);
  if (!R || !ile || !h) return null;

  const play = async (g: IleGesture, done: string) => {
    const res = await onGesture(g);
    setSaid(res === "ok" ? done : (SAID[res] ?? "Ce geste n'est pas possible."));
    if (res === "ok") {
      setHand(null);
      setChosen(null);
    }
  };
  const free = Object.entries(ile.tiles)
    .filter(([, t]) => !t.building)
    .map(([k]) => k);
  const phone = typeof window !== "undefined" && window.innerWidth < 640;
  const plain = phone || new URLSearchParams(window.location.search).has("simple");
  const tile = chosen?.kind === "tile" ? ile.tiles[chosen.at] : undefined;
  const b = tile?.building;
  const w = b && b.type !== ILE_FONDACO ? R.workshops[b.type] : undefined;
  const goods = Object.entries(h.stock).filter(([, n]) => n > 0);

  const tap = (p: IlePick | null) => {
    setSaid("");
    if (hand && p?.kind === "tile" && !ile.tiles[p.at]?.building) {
      if (hand.from)
        void play(
          { kind: "move", from: hand.from, to: p.at },
          `${R.workshops[hand.type]?.name} déménage : le chantier reprend.`,
        );
      else
        void play(
          { kind: "build", type: hand.type, at: p.at },
          `${R.workshops[hand.type]?.name} : le chantier commence.`,
        );
      return;
    }
    setChosen(p);
  };

  return (
    <div className="porcellana fixed inset-0 pc-passe pc-planche pc-ile" data-ile-screen>
      <Canvas
        orthographic
        dpr={[1, 2]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        onCreated={({ camera }) => {
          (camera as OrthographicCamera & { manual?: boolean }).manual = true;
        }}
        onPointerMissed={() => setChosen(null)}
      >
        <IleBoard
          ile={ile}
          buyable={buyable}
          now={now}
          chosen={chosen?.at ?? null}
          pins={pins}
          onPick={tap}
          phone={phone}
          plain={plain}
        />
      </Canvas>
      <div className="pc-vignette" />

      {/* The pins: a workshop's level, or, with a workshop in hand, what each free tile gives it. */}
      <div className="pc-planche-pins">
        {Object.entries(ile.tiles).map(([k, t]) => {
          const tb = t.building;
          if (hand && !tb) {
            const v = ileBonusBps(R, ile, hand.type, k);
            return (
              <button
                key={k}
                type="button"
                ref={pin(k)}
                className="pc-planche-pin pc-ile-gain"
                data-gain={v > 0 ? "up" : v < 0 ? "down" : "even"}
                data-tile={k}
                onClick={() => tap({ kind: "tile", at: k })}
              >
                <b>{pct(v)}</b>
              </button>
            );
          }
          if (!tb || tb.type === ILE_FONDACO) return null;
          const busy = tb.readyAt > now;
          return (
            <button
              key={k}
              type="button"
              ref={pin(k)}
              className="pc-planche-pin"
              data-tile={k}
              onClick={() => tap({ kind: "tile", at: k })}
            >
              <b>
                {R.workshops[tb.type]?.name} · {tb.level}
              </b>
              {busy ? <span>chantier · {duration(tb.readyAt - now)}</span> : null}
            </button>
          );
        })}
        {hand
          ? null
          : buyable.map((k) => (
              <button
                key={k}
                type="button"
                ref={pin(k)}
                className="pc-planche-pin pc-ile-plot"
                data-plot={k}
                onClick={() => tap({ kind: "plot", at: k })}
              >
                <b>
                  + {(() => {
                    const [x = 0, y = 0] = k.split(",").map(Number);
                    return TERRAIN_NAMES[ground(x, y)];
                  })()}
                </b>
              </button>
            ))}
      </div>

      <header className="pc-passe-top">
        <div className="pc-passe-title">
          <b>Ton île</b>
          <span className="pc-planche-online">
            {Object.keys(ile.tiles).length} cases sur {R.maxTiles}
          </span>
        </div>
        <div className="pc-passe-race">
          <div data-side="fil" data-mine="true">
            <i />
            <b data-ile-ducats>{ducats(h.ducats)}</b>
            <span>ducats</span>
          </div>
          <button
            type="button"
            className="pc-passe-quiet pc-ile-back"
            data-ile-back
            onClick={onBack}
          >
            La planche
          </button>
        </div>
      </header>

      <footer className="pc-passe-foot">
        {said ? <p className="pc-passe-said">{said}</p> : null}

        {hand ? (
          <section className="pc-planche-card" data-ile-hand>
            <h2>{R.workshops[hand.type]?.name} en main</h2>
            <p>
              Touche une case libre : chacune dit ce que l'atelier y gagnerait. Il aime{" "}
              {TERRAIN_NAMES[R.workshops[hand.type]?.terrain ?? "pre"].toLowerCase()} (+
              {R.bonus.terrainBps / 100} %), et son fournisseur à côté (+{R.bonus.supplierBps / 100}{" "}
              %).
            </p>
            <button type="button" className="pc-passe-quiet" onClick={() => setHand(null)}>
              Reposer
            </button>
          </section>
        ) : chosen?.kind === "plot" ? (
          <section className="pc-planche-card" data-planche-card>
            <h2>Case à acheter</h2>
            {(() => {
              const [x = 0, y = 0] = chosen.at.split(",").map(Number);
              return (
                <p>
                  {TERRAIN_NAMES[ground(x, y)]} · {ducats(ileTileCost(R, ile))} ducats
                </p>
              );
            })()}
            <button
              type="button"
              className="pc-passe-go"
              data-ile-buy
              onClick={() => void play({ kind: "buy", at: chosen.at }, "La case tombe en place.")}
            >
              Acheter
            </button>
          </section>
        ) : tile && b?.type === ILE_FONDACO ? (
          <section className="pc-planche-card" data-planche-card>
            <h2>Le Fondaco</h2>
            <p>
              L'entrepôt de ton île : tes fils partent d'ici. Plafond de {S.rules.store} par
              marchandise.
            </p>
            {goods.length ? (
              goods.map(([g, n]) => (
                <div key={g} className="pc-planche-row">
                  <div>
                    <b>{S.goods[g] ?? g}</b>
                    <span>{n} en entrepôt</span>
                    <i
                      style={{ ["--fill" as string]: `${Math.round((n / S.rules.store) * 100)}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="pc-planche-do">L'entrepôt est vide : bâtis un atelier.</p>
            )}
          </section>
        ) : tile && w && b ? (
          <section className="pc-planche-card" data-planche-card>
            <h2>
              {w.name} · niveau {b.level}
            </h2>
            <p>
              {b.readyAt > now
                ? `En chantier : prêt dans ${duration(b.readyAt - now)}.`
                : `${
                    Object.keys(w.inputs).length
                      ? `${Object.keys(w.inputs)
                          .map((g) => S.goods[g] ?? g)
                          .join(" et ")} → `
                      : ""
                  }${Object.keys(w.outputs)
                    .map((g) => S.goods[g] ?? g)
                    .join(
                      ", ",
                    )} · ${Math.round(rates[b.type] ?? 0)} par heure (tous les ${w.name.toLowerCase()}s de l'île).`}{" "}
              Sur {TERRAIN_NAMES[tile.terrain].toLowerCase()} :{" "}
              {pct(ileBonusBps(R, ile, b.type, chosen?.at ?? ""))}.
            </p>
            <div className="pc-passe-opts">
              {b.level < w.cost.length ? (
                <button
                  type="button"
                  data-ile-upgrade
                  disabled={b.readyAt > now}
                  onClick={() =>
                    void play(
                      { kind: "upgrade", at: chosen?.at ?? "" },
                      `${w.name} : le chantier du niveau ${b.level + 1} commence.`,
                    )
                  }
                >
                  Niveau {b.level + 1} · {ducats(w.cost[b.level] ?? 0)} ducats ·{" "}
                  {duration(w.buildMs[b.level] ?? 0)}
                </button>
              ) : null}
              <button
                type="button"
                disabled={!free.length}
                onClick={() => setHand({ type: b.type, from: chosen?.at ?? "" })}
              >
                Déplacer
              </button>
            </div>
          </section>
        ) : tile ? (
          <section className="pc-planche-card" data-planche-card>
            <h2>{TERRAIN_NAMES[tile.terrain]}</h2>
            <p>Ce que chaque atelier gagnerait ici :</p>
            {Object.entries(R.workshops)
              .map(([type, x]) => ({ type, x, v: ileBonusBps(R, ile, type, chosen?.at ?? "") }))
              .sort((a, c) => c.v - a.v || a.x.name.localeCompare(c.x.name))
              .slice(0, 5)
              .map(({ type, x, v }) => (
                <div key={type} className="pc-planche-row">
                  <div>
                    <b>{x.name}</b>
                    <span>
                      {pct(v)} · {ducats(x.cost[0] ?? 0)} ducats
                    </span>
                  </div>
                  <button
                    type="button"
                    className="pc-passe-go"
                    data-build={type}
                    disabled={BigInt(x.cost[0] ?? 0) > h.ducats}
                    onClick={() =>
                      void play(
                        { kind: "build", type, at: chosen?.at ?? "" },
                        `${x.name} : le chantier commence.`,
                      )
                    }
                  >
                    Bâtir
                  </button>
                </div>
              ))}
          </section>
        ) : sheet ? (
          <section className="pc-planche-card" data-ile-sheet>
            <h2>Bâtir un atelier</h2>
            {Object.entries(R.workshops).map(([type, x]) => (
              <div key={type} className="pc-planche-row">
                <div>
                  <b>{x.name}</b>
                  <span>
                    {Object.keys(x.inputs).length
                      ? `${Object.keys(x.inputs)
                          .map((g) => S.goods[g] ?? g)
                          .join(" et ")} → `
                      : ""}
                    {Object.keys(x.outputs)
                      .map((g) => S.goods[g] ?? g)
                      .join(", ")}{" "}
                    · aime {TERRAIN_NAMES[x.terrain].toLowerCase()} · {ducats(x.cost[0] ?? 0)}{" "}
                    ducats
                  </span>
                </div>
                <button
                  type="button"
                  className="pc-passe-go"
                  data-hand={type}
                  disabled={!free.length || BigInt(x.cost[0] ?? 0) > h.ducats}
                  onClick={() => {
                    setSheet(false);
                    setHand({ type });
                  }}
                >
                  Prendre
                </button>
              </div>
            ))}
            <button type="button" className="pc-passe-quiet" onClick={() => setSheet(false)}>
              Fermer
            </button>
          </section>
        ) : (
          <div className="pc-passe-bar">
            <button
              type="button"
              className="pc-passe-go"
              data-ile-open
              onClick={() => setSheet(true)}
            >
              Bâtir un atelier
            </button>
            <div className="pc-ile-stock" aria-label="L'entrepôt">
              {goods.length
                ? goods.map(([g, n]) => (
                    <span key={g}>
                      {S.goods[g] ?? g} <b>{n}</b>
                    </span>
                  ))
                : "Entrepôt vide"}
            </div>
          </div>
        )}
      </footer>
    </div>
  );
}
