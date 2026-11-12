/**
 * The Arsenal and the port (docs/plan-arsenal.md A4, the mock-up's screens 3a and 3d): the cales
 * and the hull rising on them, the fleet and its places, what each ship asks of the store; the
 * three passes of the port and their defenses. Goods, never ducats.
 */
import {
  type PlancheSetup,
  type PlancheState,
  plancheArsenalOf,
  plancheFleetPlaces,
  planchePortSlots,
  planchePower,
  plancheShipStats,
} from "@comptoirs/engine";
import { type ReactNode, useState } from "react";

const PASS_NAMES: Record<string, string> = {
  bouche: "La bouche",
  nord: "Canal nord",
  sud: "Canal sud",
};
const KEYWORDS: Record<string, string> = {
  solide: "Solide : la tour la vise en premier",
  rapide: "Rapide : change de passe entre deux manches",
  brule: "Brûle : la chaîne ou un navire, puis disparaît",
  bombarde: "Bombarde : double contre une tour, dès la 2ᵉ manche",
  repare: "Répare : 1 de coque à chaque navire de sa passe",
};

const duration = (ms: number) =>
  ms >= 3_600_000
    ? `${Math.floor(ms / 3_600_000)} h ${String(Math.round((ms % 3_600_000) / 60_000)).padStart(2, "0")}`
    : `${Math.max(1, Math.round(ms / 60_000))} min`;

/** A ship, drawn by its kind: the hull, its oars or its sail, its fire. */
export function ShipGlyph({
  kind,
  size = 40,
  ghost = false,
  damaged = false,
}: {
  kind: string;
  size?: number;
  ghost?: boolean;
  damaged?: boolean;
}) {
  const stroke = ghost ? "#a8a094" : "#17150f";
  const fill = ghost ? "none" : "#fbfaf7";
  const dash = ghost ? "3 2" : undefined;
  return (
    <svg
      width={size}
      height={(size * 24) / 40}
      viewBox="0 0 40 24"
      aria-hidden="true"
      className="pc-ar-glyph"
    >
      {kind === "brigantin" || kind === "escorte" ? (
        <>
          <path
            d="M5 15 h30 l-5 6 h-20 z"
            fill={fill}
            stroke={stroke}
            strokeWidth="1.5"
            strokeDasharray={dash}
          />
          <path
            d="M19 15 v-13 l9 11 z"
            fill={fill}
            stroke={stroke}
            strokeWidth="1.3"
            strokeDasharray={dash}
          />
          {kind === "escorte" ? (
            <path d="M12 15 v-9 l-6 8 z" fill={fill} stroke={stroke} strokeWidth="1.3" />
          ) : null}
        </>
      ) : kind === "brulot" ? (
        <>
          <path
            d="M8 15 h24 l-4 6 h-16 z"
            fill={fill}
            stroke={stroke}
            strokeWidth="1.5"
            strokeDasharray={dash}
          />
          {ghost ? null : <path d="M16 14 c0 -6 4 -6 4 -11 c2 4 5 5 5 11" fill="#c23b2e" />}
        </>
      ) : (
        <>
          <path
            d="M2 14 h36 l-6 7 h-24 z"
            fill={fill}
            stroke={stroke}
            strokeWidth="1.5"
            strokeDasharray={dash}
          />
          {kind === "galeasse" ? (
            <rect
              x="15"
              y="8"
              width="10"
              height="6"
              fill={fill}
              stroke={stroke}
              strokeWidth="1.5"
            />
          ) : null}
          {ghost ? null : (
            <path
              d="M8 14 v-4 M14 14 v-5 M20 14 v-5 M26 14 v-5 M32 14 v-4"
              stroke="#b07a2a"
              strokeWidth="2"
            />
          )}
        </>
      )}
      {damaged ? (
        <path d="M18 15 l3 3 l-2 2 l3 2" stroke="#c23b2e" strokeWidth="1.6" fill="none" />
      ) : null}
    </svg>
  );
}

/** A defense of the port, drawn (pale: one about to be laid). */
function DefenseGlyph({ kind, ghost = false }: { kind: string; ghost?: boolean }) {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true" opacity={ghost ? 0.4 : 1}>
      {kind === "tour" ? (
        <path
          d="M7 24 V9 h3 V6 h2 v3 h2 V6 h2 v3 h3 v15 z"
          fill="#fbfaf7"
          stroke="#17150f"
          strokeWidth="1.5"
        />
      ) : kind === "chaine" ? (
        <g fill="none" stroke="#17150f" strokeWidth="2.2">
          <ellipse cx="7" cy="13" rx="5" ry="3.5" />
          <ellipse cx="13" cy="13" rx="5" ry="3.5" />
          <ellipse cx="19" cy="13" rx="5" ry="3.5" />
        </g>
      ) : (
        <>
          <circle cx="11" cy="15" r="7" fill="#17150f" />
          <path d="M16 10 L22 4" stroke="#17150f" strokeWidth="2.6" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

const recipe = (S: PlancheSetup, goods: Record<string, number>, stock: Record<string, number>) =>
  Object.entries(goods).map(([g, n]) => ({ g, n, name: S.goods[g] ?? g, have: stock[g] ?? 0 }));

/** The Arsenal's sheet (screen 3a). */
export function ArsenalSheet({
  setup: S,
  state,
  house,
  close,
  onShip,
  onRepair,
  onRefit,
  onPort,
  onTrain,
  first,
}: {
  setup: PlancheSetup;
  state: PlancheState;
  house: string;
  close: ReactNode;
  onShip: (kind: string) => void;
  onRepair: (id: number) => void;
  onRefit: (id: number) => void;
  onPort: () => void;
  /** The training port (the Lido of the corsairs). */
  onTrain?: () => void;
  /** The first visit: three lines tell what the Arsenal is for. */
  first: boolean;
}) {
  const A = S.arsenal;
  const h = state.houses[house];
  if (!A || !h) return null;
  const now = state.now;
  const ars = plancheArsenalOf(S, h, now);
  const places = plancheFleetPlaces(S, h);
  const ships = h.fleet?.ships ?? [];
  const yards = h.fleet?.yards ?? [];
  const level = h.level ?? 1;
  const cales = ars?.cales ?? 0;
  const full = ships.length + yards.length >= places;
  return (
    <section className="pc-planche-card pc-pl-card pc-ar" data-arsenal>
      <div className="pc-pl-head">
        <div>
          <h2>L'Arsenal{ars ? ` · niveau ${ars.level}` : ""}</h2>
          <span>Puissance {planchePower(S, state, house)} · tes marchandises, pas tes ducats</span>
        </div>
        {close}
      </div>
      {first ? (
        <ol className="pc-ar-first" data-arsenal-first>
          <li>Tes ateliers font des marchandises : l'Arsenal en fait des navires.</li>
          <li>Une cale construit un navire à la fois ; il rejoint ta flotte à quai.</li>
          <li>Ta flotte et ton port serviront à la Guerre de la semaine.</li>
        </ol>
      ) : null}
      {!ars ? (
        <p>
          {level < A.minLevel
            ? `L'Arsenal s'ouvre au niveau ${A.minLevel} de ta Maison.`
            : "Bâtis l'Arsenal sur une case libre de ton île."}
        </p>
      ) : (
        <>
          <div className="pc-ar-cales" aria-label={`${cales} cales`}>
            {Array.from({ length: cales }, (_, k) => {
              const y = yards[k];
              const r = y ? A.ships[y.kind] : undefined;
              const done = y && r ? Math.min(1, 1 - (y.readyAt - now) / Math.max(1, r.buildMs)) : 0;
              return (
                // biome-ignore lint/suspicious/noArrayIndexKey: a cale is its place in the Arsenal.
                <div key={k} className="pc-ar-cale" data-busy={String(!!y)}>
                  {y && r ? (
                    <>
                      <div
                        className="pc-ar-hull"
                        style={{ ["--done" as string]: `${Math.round(done * 100)}%` }}
                      >
                        <ShipGlyph kind={y.kind} size={64} ghost />
                        <span className="pc-ar-hull-fill">
                          <ShipGlyph kind={y.kind} size={64} />
                        </span>
                      </div>
                      <b>{r.name}</b>
                      <span>
                        {y.readyAt <= now
                          ? full
                            ? "prête : ta flotte est pleine"
                            : "prête"
                          : `${Math.round(done * 100)} % · encore ${duration(y.readyAt - now)}`}
                      </span>
                    </>
                  ) : (
                    <span>cale libre</span>
                  )}
                </div>
              );
            })}
          </div>
          {!ars.ready ? <p>L'Arsenal est en chantier.</p> : null}
        </>
      )}
      <h3 className="pc-mn-h3">
        Ta flotte · {ships.length} navire{ships.length > 1 ? "s" : ""} sur {places} place
        {places > 1 ? "s" : ""}
      </h3>
      {ships.length ? (
        <div className="pc-ar-fleet">
          {ships.map((x) => {
            const r = A.ships[x.kind];
            const { force, hull } = plancheShipStats(S, x);
            return (
              <div
                key={x.id}
                className="pc-ar-ship"
                data-ship={x.kind}
                data-damaged={String(!!x.damaged)}
              >
                <ShipGlyph kind={x.kind} damaged={!!x.damaged} />
                <b>{r?.name}</b>
                <span>
                  niv. {x.level} · {force} · {hull}
                </span>
                {x.damaged ? (
                  x.repairedAt ? (
                    <small>réparé dans {duration(x.repairedAt - now)}</small>
                  ) : (
                    <button type="button" className="pc-passe-quiet" onClick={() => onRepair(x.id)}>
                      Réparer
                    </button>
                  )
                ) : ars && x.level < ars.level ? (
                  <button type="button" className="pc-passe-quiet" onClick={() => onRefit(x.id)}>
                    Refondre
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <p>Pas encore de navire : mets-en un en chantier.</p>
      )}
      <h3 className="pc-mn-h3">Mettre en chantier</h3>
      <div className="pc-ar-kinds">
        {Object.entries(A.ships).map(([kind, r]) => {
          const goods = recipe(S, r.goods, h.stock);
          const lacks = goods.some((g) => g.have < g.n);
          const locked = level < r.minLevel;
          const why = locked
            ? `Niveau ${r.minLevel}`
            : !ars
              ? "Pas d'Arsenal"
              : !ars.ready
                ? "En chantier"
                : yards.length >= cales
                  ? "Cales prises"
                  : full
                    ? "Flotte pleine"
                    : lacks
                      ? "Pas assez"
                      : "";
          return (
            <div key={kind} className="pc-ar-kind" data-kind={kind} data-locked={String(locked)}>
              <ShipGlyph kind={kind} ghost={locked} />
              <div>
                <b>
                  {r.name}{" "}
                  <small>
                    {r.force} · {r.hull}
                  </small>
                </b>
                <span>{KEYWORDS[r.keyword] ?? r.keyword}</span>
                <span>
                  {goods.map((g, k) => (
                    <em key={g.g} data-short={String(g.have < g.n)}>
                      {k ? " · " : ""}
                      {g.n} {g.name.toLowerCase()} ({g.have})
                    </em>
                  ))}{" "}
                  · {duration(r.buildMs)}
                </span>
              </div>
              <button
                type="button"
                className={why ? "pc-passe-quiet" : "pc-passe-go"}
                data-lay-ship={kind}
                disabled={!!why}
                onClick={() => onShip(kind)}
              >
                {why || "En chantier"}
              </button>
            </div>
          );
        })}
      </div>
      <div className="pc-pl-acts">
        <button type="button" className="pc-passe-quiet" data-open-port onClick={onPort}>
          Ton port · ses trois passes
        </button>
        {onTrain ? (
          <button type="button" className="pc-passe-quiet" data-open-training onClick={onTrain}>
            S'entraîner au Lido
          </button>
        ) : null}
      </div>
    </section>
  );
}

/** The port's sheet (screen 3d, without the ruses: they come with the War). */
export function PortSheet({
  setup: S,
  state,
  house,
  close,
  onBuild,
  onMove,
  onRemove,
  onRuses,
}: {
  setup: PlancheSetup;
  state: PlancheState;
  house: string;
  close: ReactNode;
  onBuild: (pass: string, kind: string) => void;
  onMove: (from: string, index: number, to: string) => void;
  onRemove: (pass: string, index: number) => void;
  /** The secret ruses kept (docs/plan-guerre.md W3), once a day. */
  onRuses?: (ruses: Record<string, "chaine" | "brulot" | "renforts">) => void;
}) {
  const A = S.arsenal;
  const h = state.houses[house];
  /** The defense in hand: the first the store can make. */
  const [hand, setHand] = useState<string | null>(() => {
    const ds = Object.entries(A?.port.defenses ?? {});
    return (
      ds.find(([, d]) => Object.entries(d.goods).every(([g, n]) => (h?.stock[g] ?? 0) >= n))?.[0] ??
      ds[0]?.[0] ??
      null
    );
  });
  const [ruses, setRuses] = useState<Record<string, "chaine" | "brulot" | "renforts">>(() => ({
    ...(h?.ruses ?? {}),
  }));
  if (!A || !h) return null;
  const slots = planchePortSlots(S, h);
  const today = Math.floor(state.now / 86_400_000);
  const rusesLocked = h.rusesDay === today;
  const passes = A.port.passes;
  /** Whether the store can make a defense. */
  const can = (kind: string) =>
    Object.entries(A.port.defenses[kind]?.goods ?? {}).every(([g, n]) => (h.stock[g] ?? 0) >= n);
  return (
    <section className="pc-planche-card pc-pl-card pc-ar" data-port>
      <div className="pc-pl-head">
        <div>
          <h2>Ton port</h2>
          <span>
            Trois passes, {slots} place{slots > 1 ? "s" : ""} chacune · faites de tes marchandises
          </span>
        </div>
        {close}
      </div>
      {slots === 0 ? <p>Ton port s'arme au niveau {A.minLevel} de ta Maison.</p> : null}
      <fieldset className="pc-ar-hand" aria-label="La défense à poser">
        {Object.entries(A.port.defenses).map(([kind, d]) => (
          <button
            key={kind}
            type="button"
            aria-pressed={hand === kind}
            data-defense-hand={kind}
            onClick={() => setHand(kind)}
          >
            <DefenseGlyph kind={kind} />
            <b>{d.name}</b>
            <small data-short={String(!can(kind))}>
              {Object.entries(d.goods)
                .map(([g, n]) => `${n} ${(S.goods[g] ?? g).toLowerCase()} (${h.stock[g] ?? 0})`)
                .join(", ")}
            </small>
          </button>
        ))}
      </fieldset>
      <div className="pc-ar-passes">
        {passes.map((pass, pi) => {
          const list = h.port?.[pass] ?? [];
          const next = passes[(pi + 1) % passes.length] ?? pass;
          return (
            <section
              key={pass}
              className="pc-ar-pass"
              aria-label={PASS_NAMES[pass] ?? pass}
              data-pass={pass}
            >
              <b className="pc-ar-pass-name">{PASS_NAMES[pass] ?? pass}</b>
              {list.map((kind, k) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: a defense is its place in the pass.
                <div key={k} className="pc-ar-def" data-defense={kind}>
                  <DefenseGlyph kind={kind} />
                  <span>{A.port.defenses[kind]?.name}</span>
                  <div>
                    <button
                      type="button"
                      aria-label={`Déplacer vers ${PASS_NAMES[next] ?? next}`}
                      onClick={() => onMove(pass, k, next)}
                    >
                      →
                    </button>
                    <button type="button" aria-label="Retirer" onClick={() => onRemove(pass, k)}>
                      ×
                    </button>
                  </div>
                </div>
              ))}
              {Array.from({ length: Math.max(0, slots - list.length) }, (_, k) => (
                <button
                  // biome-ignore lint/suspicious/noArrayIndexKey: an empty place is only counted.
                  key={`free${k}`}
                  type="button"
                  className="pc-ar-free"
                  data-build-defense={`${pass}:${hand}`}
                  disabled={!hand || !can(hand)}
                  onClick={() => hand && onBuild(pass, hand)}
                >
                  {hand ? <DefenseGlyph kind={hand} ghost /> : null}
                  <span>{hand ? "Poser ici" : "place libre"}</span>
                </button>
              ))}
            </section>
          );
        })}
      </div>
      {onRuses ? (
        <section className="pc-ar-ruses" data-ruses aria-label="Tes ruses secrètes">
          <b>Tes ruses secrètes</b>
          <span>
            Une par passe : l'assaillant ne la voit que quand elle joue. Tu peux les changer une
            fois par jour.
          </span>
          <div className="pc-ar-passes">
            {passes.map((pass) => (
              <div key={pass} className="pc-ar-ruse-col">
                <b className="pc-ar-pass-name">{PASS_NAMES[pass] ?? pass}</b>
                {(["chaine", "brulot", "renforts"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    aria-pressed={ruses[pass] === r}
                    data-ruse={`${pass}:${r}`}
                    disabled={rusesLocked}
                    onClick={() => setRuses({ ...ruses, [pass]: r })}
                  >
                    {r === "chaine"
                      ? "Chaîne levée à la 2ᵉ manche"
                      : r === "brulot"
                        ? "Brûlot caché"
                        : "Renforts à la 3ᵉ manche"}
                  </button>
                ))}
              </div>
            ))}
          </div>
          <button
            type="button"
            className="pc-passe-go"
            data-ruses-keep
            disabled={rusesLocked}
            onClick={() => onRuses(ruses)}
          >
            {rusesLocked ? "Ruses posées aujourd'hui" : "Garder ces ruses"}
          </button>
        </section>
      ) : null}
      <p className="pc-ar-note">
        La tour tire sur la galère d'abord, la chaîne ferme la passe, la batterie frappe toute la
        passe.
      </p>
    </section>
  );
}
