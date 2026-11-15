/**
 * The screen of one's island (docs/plan-ile.md I4, redrawn in the Céladon direction,
 * docs/plan-celadon.md C3): the island on its quay, the card of a tile (what a workshop takes and
 * gives, drawn), the tray of the buildings, the workshop in hand with what each free tile would
 * give it, the store, the way back to the board.
 * The gestures are the board's (here or on the server): this screen only asks for them.
 */
import {
  ILE_FONDACO,
  type PlancheSetup,
  type PlancheState,
  ileBonusBps,
  ileBuyable,
  ileOuvrages,
  ileRates,
  ileTileCost,
  plancheGround,
} from "@comptoirs/engine";
import { Canvas } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import type { OrthographicCamera } from "three";
import { DucatCoin } from "../../art/plateau/coins.js";
import { IleBoard, type IlePick, TERRAIN_NAMES, TERRAIN_TINT } from "./IleBoard.js";
import { GoodGlyph, WorkshopGlyph } from "./IleGlyphs.js";
import "./ile.css";

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
/** A building's name as short as a label wants it. */
const short = (name: string) =>
  name.replace(/^(Camp de |Champ de |Carrière d')/, "").replace(/^./, (c) => c.toUpperCase());
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
  onArsenal,
}: {
  setup: PlancheSetup;
  state: PlancheState;
  house: string;
  /** Plays a gesture; answers « ok » or the refusal's code. */
  onGesture: (g: IleGesture) => Promise<string> | string;
  onBack: () => void;
  /** Opens the Arsenal (docs/plan-arsenal.md), when the island has one. */
  onArsenal?: () => void;
}) {
  const R = S.ile;
  const h = state.houses[house];
  const ile = h?.ile;
  const now = state.now;
  const [chosen, setChosen] = useState<IlePick | null>(null);
  /** The workshop in hand: to lay (a type) or to move (from a tile). */
  const [hand, setHand] = useState<{ type: string; from?: string } | null>(null);
  const [sheet, setSheet] = useState(false);
  /** With a workshop in hand, the free tile one aims at before laying it. */
  const [aim, setAim] = useState<string | null>(null);
  const [said, setSaid] = useState("");
  const pins = useRef(new Map<string, HTMLElement>()).current;
  const pin = (k: string) => (el: HTMLElement | null) => {
    if (el) pins.set(k, el);
    else pins.delete(k);
  };
  const buyable = useMemo(() => (R && ile ? ileBuyable(R, ile) : []), [R, ile]);
  /** The level of the house a workshop waits for, if its level does not open it yet. */
  const lockedAt = (type: string): number | null => {
    const level = h?.level ?? 1;
    if (S.arsenal && type === S.arsenal.workshop)
      return level < S.arsenal.minLevel ? S.arsenal.minLevel : null;
    // A work of prestige opens at its own level (docs/plan-economie.md C3).
    const own = R?.workshops[type]?.level;
    if (own && level < own) return own;
    const tier = R?.workshops[type]?.tier ?? 1;
    if (!S.maison || tier <= (h?.caps?.tier ?? tier)) return null;
    return (
      [...S.maison.unlocks].sort((a, b) => a.level - b.level).find((u) => (u.tier ?? 0) >= tier)
        ?.level ?? null
    );
  };
  /** What a building costs now: a work, dearer with each one the island has. */
  const costOf = (type: string): bigint => {
    const x = R?.workshops[type];
    let cost = BigInt(x?.cost[0] ?? 0);
    if (x?.ouvrage && R && ile)
      for (let n = ileOuvrages(R, ile).length; n > 0; n--)
        cost = (cost * BigInt(10_000 + x.ouvrage.growthBps)) / 10_000n;
    return cost;
  };
  /** What a workshop does, in words. */
  const doesOf = (
    x: {
      inputs: Record<string, number>;
      outputs: Record<string, number>;
      ouvrage?: { growthBps: number };
    },
    type: string,
  ) =>
    x.ouvrage
      ? "Un ouvrage : il ne produit rien, toute la lagune le voit"
      : S.arsenal && type === S.arsenal.workshop
        ? "Tes marchandises → tes navires"
        : `${
            Object.keys(x.inputs).length
              ? `${Object.keys(x.inputs)
                  .map((g) => S.goods[g] ?? g)
                  .join(" et ")} → `
              : ""
          }${Object.keys(x.outputs)
            .map((g) => S.goods[g] ?? g)
            .join(", ")}`;
  const ground = useMemo(() => plancheGround(S, house), [S, house]);
  const rates = useMemo(() => (R && ile ? ileRates(R, ile, now) : {}), [R, ile, now]);
  if (!R || !ile || !h) return null;
  /** A tool of the tray: a workshop or a work, its price now, taken in hand to lay it. */
  const tool = (type: string, x: (typeof R.workshops)[string]) => (
    <button
      key={type}
      type="button"
      className="pc-ile-tool"
      data-hand={type}
      data-ouvrage={x.ouvrage ? type : undefined}
      title={`${x.name} : ${doesOf(x, type)}${
        x.ouvrage ? "" : ` · aime ${TERRAIN_NAMES[x.terrain].toLowerCase()}`
      }`}
      disabled={!free.length || costOf(type) > h.ducats || lockedAt(type) !== null}
      onClick={() => {
        setSheet(false);
        setChosen(null);
        setHand({ type });
      }}
    >
      <WorkshopGlyph type={type} />
      {short(x.name)}
      <small>{lockedAt(type) !== null ? `niv. ${lockedAt(type)}` : ducats(costOf(type))}</small>
    </button>
  );
  /** « Entrée → sortie »: what a workshop takes and gives a lot, as tokens. */
  const io = (x: { inputs: Record<string, number>; outputs: Record<string, number> }) => {
    const side = (label: string, of: Record<string, number>, none: string) => (
      <div>
        <small>{label}</small>
        {Object.keys(of).length ? (
          Object.entries(of).map(([g, n]) => (
            <span key={g} className="pc-ile-good">
              <i>
                <GoodGlyph good={g} />
              </i>
              <b>{n}</b>
              {S.goods[g] ?? g}
            </span>
          ))
        ) : (
          <span className="pc-ile-none">{none}</span>
        )}
      </div>
    );
    return (
      <div className="pc-ile-io" data-ile-io>
        {side("Entrée", x.inputs, "son terrain")}
        <span aria-hidden="true">→</span>
        {side("Sortie", x.outputs, "rien")}
      </div>
    );
  };

  const play = async (g: IleGesture, done: string) => {
    const res = await onGesture(g);
    setSaid(res === "ok" ? done : (SAID[res] ?? "Ce geste n'est pas possible."));
    if (res === "ok") {
      setHand(null);
      setChosen(null);
      setAim(null);
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
  const gains = hand
    ? free.map((k) => ({ k, v: ileBonusBps(R, ile, hand.type, k) })).sort((a, c) => c.v - a.v)
    : [];
  const best = gains[0] && gains[0].v > 0 ? gains[0].k : null;
  const terrainOf = (k: string) => {
    const [x = 0, y = 0] = k.split(",").map(Number);
    return ground(x, y);
  };
  // What a plot would give the workshop in hand, were it bought.
  const plotGain = (k: string) =>
    hand
      ? ileBonusBps(
          R,
          { ...ile, tiles: { ...ile.tiles, [k]: { terrain: terrainOf(k) } } },
          hand.type,
          k,
        )
      : 0;
  const full = goods.filter(([, n]) => n >= S.rules.store * 0.85);
  const inHand = hand ? R.workshops[hand.type] : undefined;
  /** A workshop waits when its good is full or its matter lacking: nothing moves in it. */
  const stopped = (type: string) => {
    const x = Object.hasOwn(R.workshops, type) ? R.workshops[type] : undefined;
    if (!x) return false;
    return (
      Object.entries(x.outputs).some(([g, n]) => (h.stock[g] ?? 0) + n > S.rules.store) ||
      Object.entries(x.inputs).some(([g, n]) => (h.stock[g] ?? 0) < n)
    );
  };

  const tap = (p: IlePick | null) => {
    setSaid("");
    // With a workshop in hand, a free tile is aimed at: its gain is said, then « Poser » lays it.
    if (hand && p?.kind === "tile" && !ile.tiles[p.at]?.building) {
      setAim(p.at);
      return;
    }
    if (hand && p?.kind === "plot") {
      setHand(null);
      setAim(null);
    }
    setChosen(p);
  };

  return (
    <div
      className="porcellana fixed inset-0 pc-passe pc-planche pc-ile"
      data-ile-screen
      data-busy={String(!!(chosen || hand || sheet))}
    >
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
          rules={R}
          stopped={stopped}
          buyable={buyable}
          ground={ground}
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
                data-best={String(k === best)}
                data-aim={String(k === aim)}
                data-tile={k}
                onClick={() => tap({ kind: "tile", at: k })}
              >
                <b>{pct(v)}</b>
              </button>
            );
          }
          if (!tb || tb.type === ILE_FONDACO) return null;
          // On a phone, a card open leaves only the pin of what it tells.
          if (phone && chosen && chosen.at !== k) return null;
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
                {short(R.workshops[tb.type]?.name ?? "")}
                {R.workshops[tb.type]?.ouvrage ? "" : ` · ${tb.level}`}
              </b>
              {busy ? <span>chantier · {duration(tb.readyAt - now)}</span> : null}
            </button>
          );
        })}
        {buyable.map((k) => {
          const v = plotGain(k);
          if (hand && v <= 0) return null;
          if (phone && chosen && chosen.at !== k) return null;
          return (
            <button
              key={k}
              type="button"
              ref={pin(k)}
              className="pc-planche-pin pc-ile-plot"
              data-plot={k}
              data-gain={hand ? "up" : undefined}
              onClick={() => tap({ kind: "plot", at: k })}
            >
              <b>
                {hand
                  ? `${pct(v)} · ${ducats(ileTileCost(R, ile))}`
                  : `+ ${TERRAIN_NAMES[terrainOf(k)]}`}
              </b>
            </button>
          );
        })}
      </div>

      <header className="pc-passe-top pc-ile-top">
        <button type="button" className="pc-passe-quiet pc-ile-back" data-ile-back onClick={onBack}>
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path
              d="M11 3 L5 9 L11 15"
              stroke="currentColor"
              strokeWidth="2.4"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          La planche
        </button>
        <div className="pc-pl-purse">
          <span className="pc-pl-ducats">
            <DucatCoin size={phone ? 22 : 26} />
            <b data-ile-ducats>{ducats(h.ducats)}</b>
          </span>
        </div>
      </header>
      <div className="pc-ile-title">
        <b>Ton île</b>
        <span>
          {Object.keys(ile.tiles).length} cases sur {R.maxTiles}
        </span>
      </div>
      <ul className="pc-ile-legend" aria-label="Les terrains">
        {(Object.keys(TERRAIN_NAMES) as (keyof typeof TERRAIN_NAMES)[]).map((t) => (
          <li key={t}>
            <i data-terrain={t} style={{ background: TERRAIN_TINT[t] }} />
            {TERRAIN_NAMES[t].toLowerCase()}
          </li>
        ))}
      </ul>
      <section className="pc-ile-store" aria-label="L'entrepôt">
        <b>Entrepôt</b>
        {goods.length ? (
          goods.map(([g, n]) => (
            <div key={g}>
              <span>
                {S.goods[g] ?? g}
                <strong>{n}</strong>
              </span>
              <i>
                <i
                  data-full={String(n >= S.rules.store * 0.85)}
                  style={{ width: `${Math.min(100, Math.round((n / S.rules.store) * 100))}%` }}
                />
              </i>
            </div>
          ))
        ) : (
          <span>vide</span>
        )}
        {full.length ? (
          <em>{S.goods[full[0]?.[0] ?? ""] ?? ""} presque plein : l'atelier va s'arrêter.</em>
        ) : null}
      </section>

      <footer className="pc-passe-foot">
        {said ? <p className="pc-passe-said">{said}</p> : null}

        {hand && inHand ? (
          <section className="pc-planche-card pc-ile-hand" data-ile-hand>
            <div className="pc-pl-head">
              <div>
                <h2>
                  {inHand.name} {hand.from ? "à déplacer" : "en main"}
                </h2>
                <span>
                  {inHand.ouvrage || !inHand.lotsPerHour
                    ? doesOf(inHand, hand.type)
                    : `${inHand.lotsPerHour} lots par heure au niveau 1`}
                </span>
              </div>
            </div>
            {inHand.ouvrage || !Object.keys(inHand.outputs).length ? null : io(inHand)}
            <div className="pc-ile-rules">
              <span data-tone="up">
                <b>+{R.bonus.terrainBps / 100} %</b>
                sur {TERRAIN_NAMES[inHand.terrain].toLowerCase()}
              </span>
              <span data-tone="up">
                <b>+{R.bonus.supplierBps / 100} %</b>
                son fournisseur à côté
              </span>
              <span data-tone="down">
                <b>−{Math.abs(R.bonus.nuisanceBps) / 100} %</b>
                {inHand.nuisance?.length
                  ? `${inHand.nuisance.map((n) => R.workshops[n]?.name.toLowerCase() ?? n).join(", ")} à côté`
                  : "un voisin qui gêne"}
              </span>
            </div>
            <div className="pc-pl-acts">
              <button
                type="button"
                className="pc-passe-go"
                data-ile-place
                disabled={!aim || (!hand.from && BigInt(inHand.cost[0] ?? 0) > h.ducats)}
                onClick={() => {
                  if (!aim) return;
                  if (hand.from)
                    void play(
                      { kind: "move", from: hand.from, to: aim },
                      `${inHand.name} déménage : le chantier reprend.`,
                    );
                  else
                    void play(
                      { kind: "build", type: hand.type, at: aim },
                      `${inHand.name} : le chantier commence.`,
                    );
                }}
              >
                {aim
                  ? `Poser sur ${TERRAIN_NAMES[ile.tiles[aim]?.terrain ?? "pre"].toLowerCase()}`
                  : "Touche une case libre"}
                {aim ? (
                  <small>
                    {pct(ileBonusBps(R, ile, hand.type, aim))}
                    {hand.from
                      ? ""
                      : ` · ${ducats(inHand.cost[0] ?? 0)} ducats · ${duration(inHand.buildMs[0] ?? 0)}`}
                  </small>
                ) : null}
              </button>
              <button
                type="button"
                className="pc-passe-quiet"
                onClick={() => {
                  setHand(null);
                  setAim(null);
                }}
              >
                Reposer
              </button>
            </div>
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
            <div className="pc-pl-head">
              <div>
                <h2>{w.name}</h2>
                <span>
                  {w.ouvrage ? "Ouvrage" : `Niveau ${b.level}`} · sur{" "}
                  {TERRAIN_NAMES[tile.terrain].toLowerCase()}
                </span>
              </div>
            </div>
            {b.readyAt > now ? (
              <p className="pc-planche-do">En chantier : prêt dans {duration(b.readyAt - now)}.</p>
            ) : null}
            {w.ouvrage ? (
              <p>
                Un ouvrage de ta Maison : il ne produit rien, toute la lagune le voit sur ton île.
              </p>
            ) : S.arsenal && b.type === S.arsenal.workshop ? (
              <p>
                Tes marchandises deviennent des navires : {S.arsenal.cales[b.level - 1] ?? 0} cales.
              </p>
            ) : (
              <>
                {io(w)}
                <div className="pc-ile-lines">
                  <div>
                    {tile.terrain === w.terrain
                      ? `Son terrain (${TERRAIN_NAMES[w.terrain].toLowerCase()})`
                      : `Il aime ${TERRAIN_NAMES[w.terrain].toLowerCase()}`}
                    <b data-tone={tile.terrain === w.terrain ? "up" : undefined}>
                      {pct(tile.terrain === w.terrain ? R.bonus.terrainBps : 0)}
                    </b>
                  </div>
                  <div>
                    Ses voisins
                    <b
                      data-tone={
                        ileBonusBps(R, ile, b.type, chosen?.at ?? "") >
                        (tile.terrain === w.terrain ? R.bonus.terrainBps : 0)
                          ? "up"
                          : undefined
                      }
                    >
                      {pct(
                        ileBonusBps(R, ile, b.type, chosen?.at ?? "") -
                          (tile.terrain === w.terrain ? R.bonus.terrainBps : 0),
                      )}
                    </b>
                  </div>
                  <div>
                    Rend, par heure
                    <b>
                      {Math.round(rates[b.type] ?? 0)}{" "}
                      {(S.goods[Object.keys(w.outputs)[0] ?? ""] ?? "").toLowerCase()}
                    </b>
                  </div>
                  {stopped(b.type) && b.readyAt <= now ? (
                    <div>
                      <span className="pc-planche-do">
                        {Object.entries(w.outputs).some(
                          ([g, n]) => (h.stock[g] ?? 0) + n > S.rules.store,
                        )
                          ? "Il attend : l'entrepôt est plein."
                          : "Il attend : sa matière manque."}
                      </span>
                    </div>
                  ) : null}
                </div>
              </>
            )}
            <div className="pc-ile-acts">
              {S.arsenal && b.type === S.arsenal.workshop && onArsenal ? (
                <button type="button" className="pc-passe-go" data-open-arsenal onClick={onArsenal}>
                  Ouvrir l'Arsenal
                  <small>tes cales, ta flotte, ton port</small>
                </button>
              ) : null}
              {b.level < w.cost.length ? (
                <button
                  type="button"
                  className={
                    S.arsenal && b.type === S.arsenal.workshop ? "pc-passe-quiet" : "pc-passe-go"
                  }
                  data-ile-upgrade
                  disabled={b.readyAt > now}
                  onClick={() =>
                    void play(
                      { kind: "upgrade", at: chosen?.at ?? "" },
                      `${w.name} : le chantier du niveau ${b.level + 1} commence.`,
                    )
                  }
                >
                  Passer au niveau {b.level + 1}
                  <small>
                    {ducats(w.cost[b.level] ?? 0)} ducats · {duration(w.buildMs[b.level] ?? 0)}
                  </small>
                </button>
              ) : null}
              <button
                type="button"
                className="pc-passe-quiet"
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
              .filter(([, x]) => !x.ouvrage)
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
                    disabled={BigInt(x.cost[0] ?? 0) > h.ducats || lockedAt(type) !== null}
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
        ) : sheet || !phone ? (
          <section className="pc-ile-tray" data-ile-sheet aria-label="Bâtir">
            {Object.entries(R.workshops)
              .filter(([, x]) => !x.ouvrage && x.tier === 1 && Object.keys(x.outputs).length)
              .map(([type, x]) => tool(type, x))}
            <hr />
            {Object.entries(R.workshops)
              .filter(([, x]) => !x.ouvrage && (x.tier > 1 || !Object.keys(x.outputs).length))
              .map(([type, x]) => tool(type, x))}
            {Object.values(R.workshops).some((x) => x.ouvrage) ? (
              <>
                <hr data-ouvrages />
                {Object.entries(R.workshops)
                  .filter(([, x]) => x.ouvrage)
                  .map(([type, x]) => tool(type, x))}
              </>
            ) : null}
            {phone ? (
              <button type="button" className="pc-passe-quiet" onClick={() => setSheet(false)}>
                Fermer
              </button>
            ) : null}
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
          </div>
        )}
      </footer>
    </div>
  );
}
