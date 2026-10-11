import { useEffect, useState } from "react";
import { fr } from "./i18n.js";
import { Big, Label, Panel, Ribbon } from "./ui.js";

interface Pair {
  a: string;
  b: string;
  trades: number;
  value: string;
  gap: string;
  transfer: string;
}

const ducats = (deniers: string) =>
  `${Math.round(Number(deniers) / 100).toLocaleString("fr-FR")} d`;

interface Retention {
  players: number;
  retention: { day: number; eligible: number; returned: number }[];
  sessions: { day: string; sessions: number; players: number }[];
  tutorial: { step: string; players: number }[];
  lastSeen: Record<string, number>;
}

const LAST_SEEN: Record<string, string> = {
  today: "Vus aujourd'hui",
  days1to3: "Il y a 1 à 3 jours",
  days3to7: "Il y a 3 à 7 jours",
  moreThan7: "Plus de 7 jours",
  never: "Jamais revenus",
};

const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)} %` : "—");

/** Retention dashboard for the beta (admins only): people, not bots. */
export function Admin() {
  const [data, setData] = useState<Retention | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/admin/retention", { credentials: "same-origin" })
      .then(async (r) => {
        if (!r.ok) throw new Error(r.status === 403 ? "Accès réservé." : `Erreur ${r.status}`);
        setData(await r.json());
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  const [pairs, setPairs] = useState<Pair[] | null>(null);
  useEffect(() => {
    fetch("/api/admin/suspicious", { credentials: "same-origin" })
      .then(async (r) => (r.ok ? setPairs((await r.json()).pairs) : setPairs([])))
      .catch(() => setPairs([]));
  }, []);

  if (error) return <p className="p-8 text-center text-vermilion">{error}</p>;
  if (!data) return <p className="p-8 text-center text-muted">…</p>;
  const first = data.tutorial[0]?.players ?? 0;
  return (
    <main className="mx-auto max-w-md space-y-6 px-4 py-8">
      <header>
        <Label className="text-gold">Bêta · joueurs réels</Label>
        <h1 className="mt-2 font-display text-3xl font-extrabold uppercase">Rétention</h1>
        <p className="mt-1 text-sm text-cream-dim">{data.players} marchands inscrits (hors PNJ)</p>
      </header>

      <Panel>
        <Label>Reviennent après…</Label>
        <div className="mt-3 grid grid-cols-5 gap-2 text-center">
          {data.retention.map((r) => (
            <div key={r.day}>
              <p className="label">J+{r.day}</p>
              <Big className="mt-1 text-lg">{pct(r.returned, r.eligible)}</Big>
              <p className="font-mono text-[10px] text-muted">
                {r.returned}/{r.eligible}
              </p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel>
        <Label>Tutoriel</Label>
        <ul className="mt-3 space-y-2">
          {data.tutorial.map((t) => (
            <li key={t.step}>
              <div className="flex justify-between text-sm">
                <span>{fr.game.firstSteps.items[t.step]?.[0] ?? t.step}</span>
                <span>
                  {t.players} · {pct(t.players, first)}
                </span>
              </div>
              <Ribbon value={first > 0 ? t.players / first : 0} tone="lagoon" />
            </li>
          ))}
        </ul>
      </Panel>

      <Panel>
        <Label>Dernière visite</Label>
        <ul className="mt-3 space-y-1 text-sm">
          {Object.entries(data.lastSeen).map(([k, n]) => (
            <li key={k} className="flex justify-between">
              <span className="text-cream-dim">{LAST_SEEN[k] ?? k}</span>
              <span className="font-semibold">{n}</span>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel>
        <Label>Sessions (14 derniers jours)</Label>
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="label text-left">
              <th>Jour</th>
              <th className="text-right">Joueurs</th>
              <th className="text-right">Sessions</th>
              <th className="text-right">Par joueur</th>
            </tr>
          </thead>
          <tbody>
            {data.sessions.map((s) => (
              <tr key={s.day} className="border-b border-line/70">
                <td className="py-1">{s.day.slice(5)}</td>
                <td className="text-right">{s.players}</td>
                <td className="text-right">{s.sessions}</td>
                <td className="text-right">{(s.sessions / Math.max(1, s.players)).toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
      <Panel>
        <Label>Échanges suspects</Label>
        <p className="mt-1 text-xs text-cream-dim">
          Paires de marchands qui échangent souvent entre eux loin du prix de référence (au moins 3
          échanges). « Écart » : distance totale au prix de référence ; « transfert » : valeur
          passée du premier au second.
        </p>
        {pairs === null ? (
          <p className="mt-3 text-muted">…</p>
        ) : pairs.length === 0 ? (
          <p className="mt-3 text-sm text-lagoon">Rien à signaler.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {pairs.map((p) => (
              <li key={`${p.a}-${p.b}`} className="rounded-xl bg-night-2 p-2.5">
                <p className="font-semibold">
                  {p.a} ↔ {p.b}
                </p>
                <p className="text-xs text-cream-dim">
                  {p.trades} échanges · {ducats(p.value)} · écart {ducats(p.gap)} · transfert{" "}
                  {ducats(p.transfer)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </main>
  );
}
