/**
 * The War of the week (docs/plan-guerre.md W4, the mock-up's screen 3b): the week's phase, the two
 * flotillas' seals, the ports of the other flotilla and what each has already lost, today's
 * assault, the assaults one's own port has borne.
 */
import type { AssautState, IleState } from "@comptoirs/engine";
import type { ReactNode } from "react";

export interface GuerrePortView {
  key: string;
  name: string;
  lagoon: string;
  power: number;
  person: boolean;
  best: number;
}

export interface GuerreViewData {
  week: number;
  phase: "lundi" | "assauts" | "dimanche" | "aucune";
  me: string | null;
  ours: GuerrePortView[];
  theirs: GuerrePortView[];
  score: { us: number; them: number };
  today: boolean;
  running: { target: string; state: AssautState; ile: IleState | null } | null;
  suffered: { id: number; by: string; seals: number; at: number }[];
  made?: { id: number; target: string; seals: number; at: number }[];
  companies?: { us: string | null; them: string | null };
  reserved?: Record<string, string>;
}

const PHASE: Record<GuerreViewData["phase"], string> = {
  lundi: "Lundi : prépare ton port et tes ruses, les assauts commencent demain.",
  assauts: "Du mardi au samedi : un assaut par jour, sur le port de ton choix.",
  dimanche: "Dimanche : la guerre est jouée. Le Prestige est versé.",
  aucune: "Tu n'es dans aucune flottille cette semaine : la prochaine se forme lundi.",
};

function Seals({ n }: { n: number }) {
  return (
    <span className="pc-gu-seals" role="img" aria-label={`${n} sceau${n > 1 ? "x" : ""} pris`}>
      {[0, 1, 2].map((k) => (
        <i key={k} data-on={String(k < n)} />
      ))}
    </span>
  );
}

/**
 * The map of the War (the mock-up's screen 3b): the two flotillas face to face across the water,
 * each port an island with the seals it lost; one's own ringed in red; a port one's company
 * reserved, its flag. The gestures are on the lines below it.
 */
function Carte({ view }: { view: GuerreViewData }) {
  const row = (ports: GuerrePortView[], y: number, theirs: boolean) =>
    ports.map((p, k) => {
      const x = 30 + k * 58;
      const me = p.key === view.me;
      return (
        <g key={p.key} transform={`translate(${x} ${y})`}>
          <path
            d="M-20 4 L0 -6 L20 4 L0 14 Z"
            fill={p.person ? "#fbfaf7" : "#efebe4"}
            stroke={me ? "var(--pc-accent)" : "#d3ccc0"}
            strokeWidth={me ? 2.4 : 1.2}
          />
          <path d="M-7 2 V-10 L0 -15 L7 -10 V2 Z" fill="#fbfaf7" stroke="#17150f" strokeWidth="1" />
          {view.reserved?.[p.key] ? (
            <path
              d="M8 -16 V-4 M8 -16 H16 L13 -13 L16 -10 H8"
              fill="var(--pc-accent)"
              stroke="#17150f"
              strokeWidth="0.8"
            />
          ) : null}
          {[0, 1, 2].map((s) => (
            <circle
              key={s}
              cx={-8 + s * 8}
              cy={theirs ? 22 : -24}
              r="3"
              fill={s < p.best ? "var(--pc-accent)" : "#ddd6cb"}
            />
          ))}
          <text
            y={theirs ? -22 : 30}
            textAnchor="middle"
            fontSize="10"
            fontWeight="700"
            fill="#4a443e"
          >
            {p.name.replace(/^Ca’ /, "").slice(0, 9)}
          </text>
        </g>
      );
    });
  return (
    <svg
      className="pc-gu-map"
      viewBox="0 0 350 170"
      role="img"
      aria-label="La carte de la guerre : les ports adverses en haut, ta flottille en bas"
      data-guerre-map
    >
      <rect width="350" height="170" rx="14" fill="#cfd8da" />
      <path d="M0 85 Q90 75 175 85 T350 85" fill="none" stroke="#b7c3c7" strokeWidth="10" />
      {row(view.theirs, 46, true)}
      {row(view.ours, 128, false)}
    </svg>
  );
}

export function GuerreSheet({
  view,
  close,
  armed,
  onAssault,
  inCompany = false,
  onReserve,
  onReplay,
}: {
  view: GuerreViewData;
  close: ReactNode;
  /** Whether one has a ship fit to sail. */
  armed: boolean;
  onAssault: (target: string) => void;
  inCompany?: boolean;
  /** A sign « I take this port » for one's company. */
  onReserve?: (target: string) => void;
  /** An assault of the week seen again. */
  onReplay?: (id: number) => void;
}) {
  const can = view.phase === "assauts" && !view.today && armed;
  const why =
    view.phase !== "assauts"
      ? "Pas aujourd'hui"
      : view.today
        ? "Fait aujourd'hui"
        : !armed
          ? "Pas de navire"
          : "";
  return (
    <section className="pc-planche-card pc-pl-card pc-gu" data-guerre>
      <div className="pc-pl-head">
        <div>
          <h2>La Guerre de la semaine</h2>
          <span>{PHASE[view.phase]}</span>
        </div>
        {close}
      </div>
      {view.phase !== "aucune" ? (
        <>
          {view.companies?.us || view.companies?.them ? (
            <p className="pc-gu-vs" data-guerre-vs>
              {view.companies?.us ?? "Ta flottille"} contre{" "}
              {view.companies?.them ?? "une flottille du jeu"}
            </p>
          ) : null}
          <div className="pc-gu-score" data-guerre-score>
            <div>
              <b>{view.score.us}</b>
              <span>ta flottille</span>
            </div>
            <i>sceaux</i>
            <div>
              <b>{view.score.them}</b>
              <span>la flottille adverse</span>
            </div>
          </div>
          <Carte view={view} />
          <h3 className="pc-mn-h3">Les ports adverses</h3>
          <ul className="pc-gu-ports">
            {view.theirs.map((p) => (
              <li key={p.key} data-guerre-port={p.key}>
                <div>
                  <b>{p.name}</b>
                  <span>
                    {p.lagoon} · {p.person ? "un joueur" : "l'ordinateur"}
                  </span>
                  {view.reserved?.[p.key] ? (
                    <span className="pc-gu-reserved">pris par {view.reserved[p.key]}</span>
                  ) : inCompany && onReserve && view.phase !== "dimanche" ? (
                    <button
                      type="button"
                      className="pc-gu-reserve"
                      data-reserve={p.key}
                      onClick={() => onReserve(p.key)}
                    >
                      Je prends ce port
                    </button>
                  ) : null}
                </div>
                <Seals n={p.best} />
                <button
                  type="button"
                  className={can ? "pc-passe-go" : "pc-passe-quiet"}
                  data-assaillir={p.key}
                  disabled={!can || p.best >= 3}
                  onClick={() => onAssault(p.key)}
                >
                  {p.best >= 3 ? "Tombé" : why || "Assaillir"}
                </button>
              </li>
            ))}
          </ul>
          <p className="pc-ar-note">
            Sur chaque port, seul le meilleur assaut de ta flottille compte : vise ceux qui tiennent
            encore.
          </p>
          <h3 className="pc-mn-h3">Ta flottille</h3>
          <ul className="pc-gu-ports pc-gu-ours">
            {view.ours.map((p) => (
              <li key={p.key} data-me={String(p.key === view.me)}>
                <div>
                  <b>{p.key === view.me ? `${p.name} (toi)` : p.name}</b>
                  <span>{p.lagoon}</span>
                </div>
                <Seals n={p.best} />
              </li>
            ))}
          </ul>
          {view.made?.length ? (
            <>
              <h3 className="pc-mn-h3">Tes assauts</h3>
              <ul className="pc-gu-suffered">
                {view.made.map((x) => (
                  <li key={x.id}>
                    {x.target} : {x.seals} sceau{x.seals > 1 ? "x" : ""}
                    {onReplay ? (
                      <button
                        type="button"
                        className="pc-gu-reserve"
                        data-replay={x.id}
                        onClick={() => onReplay(x.id)}
                      >
                        Revoir
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          {view.suffered.length ? (
            <>
              <h3 className="pc-mn-h3">Les assauts sur ton port</h3>
              <ul className="pc-gu-suffered">
                {view.suffered.map((x) => (
                  <li key={x.id}>
                    {x.by} :{" "}
                    {x.seals
                      ? `${x.seals} sceau${x.seals > 1 ? "x" : ""} pris`
                      : "repoussé, +10 de Prestige"}
                    {onReplay ? (
                      <button
                        type="button"
                        className="pc-gu-reserve"
                        data-replay={x.id}
                        onClick={() => onReplay(x.id)}
                      >
                        Revoir
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
