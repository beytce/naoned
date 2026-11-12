/**
 * The War of the week (docs/plan-guerre.md W4, the mock-up's screen 3b): the week's phase, the two
 * flotillas' seals, the ports of the other flotilla and what each has already lost, today's
 * assault, the assaults one's own port has borne.
 */
import type { AssautState } from "@comptoirs/engine";
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
  running: { target: string; state: AssautState } | null;
  suffered: { by: string; seals: number; at: number }[];
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

export function GuerreSheet({
  view,
  close,
  armed,
  onAssault,
}: {
  view: GuerreViewData;
  close: ReactNode;
  /** Whether one has a ship fit to sail. */
  armed: boolean;
  onAssault: (target: string) => void;
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
          <h3 className="pc-mn-h3">Les ports adverses</h3>
          <ul className="pc-gu-ports">
            {view.theirs.map((p) => (
              <li key={p.key} data-guerre-port={p.key}>
                <div>
                  <b>{p.name}</b>
                  <span>
                    {p.lagoon} · Puissance {p.power} · {p.person ? "un joueur" : "l'ordinateur"}
                  </span>
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
                  <span>
                    {p.lagoon} · Puissance {p.power}
                  </span>
                </div>
                <Seals n={p.best} />
              </li>
            ))}
          </ul>
          {view.suffered.length ? (
            <>
              <h3 className="pc-mn-h3">Les assauts sur ton port</h3>
              <ul className="pc-gu-suffered">
                {view.suffered.map((x) => (
                  <li key={`${x.by}${x.at}`}>
                    {x.by} :{" "}
                    {x.seals
                      ? `${x.seals} sceau${x.seals > 1 ? "x" : ""} pris`
                      : "repoussé, +10 de Prestige"}
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
