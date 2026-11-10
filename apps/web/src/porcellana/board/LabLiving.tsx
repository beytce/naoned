/**
 * The living board at the laboratory (?lab=porcellana&vue=vivante, docs/plan-carte-vivante.md): the
 * game's own Carte on a house to look at (demo.ts), with what one needs to judge its life — the
 * Fondaco's level, the workshops' levels, a harvest to carry home.
 */
import { useEffect, useMemo, useState } from "react";
import PorcellanaMap from "./PorcellanaMap.js";
import { demoPayload } from "./demo.js";

export default function LabLiving() {
  const q = new URLSearchParams(window.location.search);
  const [casa, setCasa] = useState(Math.max(1, Number(q.get("casa") ?? 5)));
  const [lift, setLift] = useState(Math.max(0, Number(q.get("niveaux") ?? 0)));
  const [harvested, setHarvested] = useState(false);
  const [bought, setBought] = useState(false);
  const [built, setBuilt] = useState(false);
  const [paid, setPaid] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(id);
  }, []);
  // The house stays the same from a second to the next: only what was asked changes it.
  const born = useMemo(() => Date.now(), []);
  const p = useMemo(
    () => demoPayload(born, { casa, harvested, lift, bought, built, paid }),
    [born, casa, harvested, lift, bought, built, paid],
  );
  return (
    <div className="porcellana fixed inset-0" data-lab-living>
      <PorcellanaMap p={p} now={now} target={null} onTarget={() => {}} />
      <nav className="pc-tools pc-pill" aria-label="Laboratoire">
        <a className="pc-tool" href="?lab=porcellana">
          Plateau
        </a>
        <button
          type="button"
          className="pc-tool"
          onClick={() => setCasa((c) => Math.max(1, c - 1))}
        >
          Fondaco −
        </button>
        <span className="pc-tool" data-lab-casa>
          niv. {casa}
        </span>
        <button
          type="button"
          className="pc-tool"
          onClick={() => setCasa((c) => Math.min(20, c + 1))}
        >
          Fondaco +
        </button>
        <button type="button" className="pc-tool" onClick={() => setLift((n) => (n + 5) % 25)}>
          Ateliers +{lift}
        </button>
        <button type="button" className="pc-tool" data-lab-buy onClick={() => setBought((b) => !b)}>
          {bought ? "Case achetée" : "Acheter"}
        </button>
        <button
          type="button"
          className="pc-tool"
          data-lab-build
          onClick={() => setBuilt((b) => !b)}
        >
          {built ? "Bâti" : "Finir le chantier"}
        </button>
        <button type="button" className="pc-tool" data-lab-pay onClick={() => setPaid((b) => !b)}>
          {paid ? "Payé" : "Livrer"}
        </button>
        <button
          type="button"
          className="pc-tool"
          data-lab-harvest
          onClick={() => setHarvested((h) => !h)}
        >
          {harvested ? "Lots repris" : "Récolter"}
        </button>
      </nav>
    </div>
  );
}
