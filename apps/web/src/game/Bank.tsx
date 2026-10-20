import { useEffect, useState } from "react";
import { fr } from "../i18n.js";
import { d } from "./format.js";

interface BankReport {
  activeMerchants: number;
  moneyPerMerchant: string;
  startingCapital: string;
  week: {
    created: { reason: string; amount: string }[];
    destroyed: { reason: string; amount: string }[];
    net: string;
  };
}

const t = fr.game.bank;

/**
 * The Rapport de la Banque de Venise, in the help: the money merchants hold, per active merchant,
 * against the starting capital, and what the week created and destroyed, by cause.
 */
export function BankSection() {
  const [report, setReport] = useState<BankReport | null>(null);
  useEffect(() => {
    fetch("/api/bank", { credentials: "same-origin" })
      .then((r) => (r.ok ? (r.json() as Promise<BankReport>) : null))
      .then(setReport)
      .catch(() => undefined);
  }, []);
  if (!report) return null;
  const reason = (r: string) => t.reasons[r] ?? r;
  const top = (xs: { reason: string; amount: string }[]) =>
    xs
      .slice(0, 4)
      .map((x) => `${reason(x.reason)} ${d(x.amount)}`)
      .join(" · ") || "—";
  return (
    <section className="cartouche-line space-y-2 p-4">
      <h2 className="font-display text-base font-extrabold uppercase text-info">{t.title}</h2>
      <p className="note">{t.help}</p>
      <p className="text-sm">
        {t.perMerchant(
          d(report.moneyPerMerchant),
          d(report.startingCapital),
          report.activeMerchants,
        )}
      </p>
      <p className="text-sm text-cream-dim">
        <span className="text-lagoon">{t.created}</span> {top(report.week.created)}
      </p>
      <p className="text-sm text-cream-dim">
        <span className="text-vermilion">{t.destroyed}</span> {top(report.week.destroyed)}
      </p>
      <p className="label">{t.net(d(report.week.net))}</p>
    </section>
  );
}
