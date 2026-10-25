import { useCallback, useEffect, useState } from "react";
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
  skirmishes: { day: string; ranked: number; friendly: number; night: number }[];
  skirmishMatches: {
    weeks: { week: string; paid: number; done: number; aborted: number }[];
    duplicates: number;
    abortedPaid: number;
  };
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

interface Reported {
  id: string;
  family: string;
  pseudo: string | null;
  body: string;
  at: number;
  hidden: boolean;
  reports: number;
}

/** Reported messages of the families' threads: read, then hide what should not stay. */
function Reports() {
  const [rows, setRows] = useState<Reported[] | null>(null);
  const load = useCallback(
    () =>
      fetch("/api/admin/reports", { credentials: "same-origin" })
        .then(async (r) => setRows(r.ok ? (await r.json()).reports : []))
        .catch(() => setRows([])),
    [],
  );
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <Panel>
      <Label>Messages signalés</Label>
      {rows === null ? (
        <p className="mt-2 text-sm text-muted">…</p>
      ) : rows.length === 0 ? (
        <p className="mt-2 text-sm text-cream-dim">Aucun signalement.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {rows.map((m) => (
            <li key={m.id} className="rounded-xl bg-night-3 p-3 text-sm">
              <p className="meta">
                {m.family} · {m.pseudo ?? "—"} · {m.reports} signalement{m.reports > 1 ? "s" : ""}
                {m.hidden ? " · masqué" : ""}
              </p>
              <p className="mt-1 break-words">{m.body}</p>
              {!m.hidden && (
                <button
                  type="button"
                  className="mt-2 rounded-lg bg-vermilion px-3 py-1 font-display text-xs font-extrabold uppercase text-cream"
                  onClick={async () => {
                    await fetch(`/api/admin/messages/${m.id}/hide`, {
                      method: "POST",
                      credentials: "same-origin",
                    });
                    void load();
                  }}
                >
                  Masquer
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/** Rehearsal: brings the end of the current season forward (test world only). */
function SeasonEnd() {
  const [at, setAt] = useState("");
  const [result, setResult] = useState<string | null>(null);
  return (
    <Panel>
      <Label>Fin de saison (répétition)</Label>
      <p className="mt-1 text-xs text-cream-dim">
        Avance la fin de la saison en cours pour vivre une clôture sur un monde de test. Sur le
        monde des joueurs, ne l'utiliser qu'en connaissance de cause.
      </p>
      <input
        type="datetime-local"
        value={at}
        onChange={(e) => setAt(e.target.value)}
        className="mt-3 w-full rounded-xl bg-night-2 px-3 py-2 text-cream ring-1 ring-line"
      />
      <button
        type="button"
        disabled={!at}
        className="mt-3 w-full rounded-xl bg-vermilion px-3 py-2 font-display text-xs font-extrabold uppercase text-cream disabled:opacity-40"
        onClick={async () => {
          const r = await fetch("/api/admin/season-end", {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endsAt: new Date(at).toISOString() }),
          });
          setResult(r.ok ? "Fin de saison déplacée." : `Refusé (${r.status}).`);
        }}
      >
        Déplacer la fin de saison
      </button>
      {result && <p className="mt-2 text-sm text-cream-dim">{result}</p>}
    </Panel>
  );
}

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
  const [shared, setShared] = useState<{ email: string; holder: string | null }[]>([]);
  useEffect(() => {
    fetch("/api/admin/suspicious", { credentials: "same-origin" })
      .then(async (r) => {
        const body = r.ok ? await r.json() : {};
        setPairs(body.pairs ?? []);
        setShared(body.sharedMailboxes ?? []);
      })
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
              <p className="meta">J+{r.day}</p>
              <Big className="mt-1 text-lg">{pct(r.returned, r.eligible)}</Big>
              <p className="font-mono text-xs text-muted">
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
        <Label>Escarmouches (14 derniers jours)</Label>
        <p className="mt-1 text-xs text-cream-dim">
          Parties jouées par marchand : classées (payées en Gloire, une par jour) ou amicales ; «
          nuit » : Gloire d'escarmouche versée entre 22 h et 8 h (toujours 0).
        </p>
        {data.skirmishes.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Aucune partie.</p>
        ) : (
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="label text-left">
                <th>Jour</th>
                <th className="text-right">Classées</th>
                <th className="text-right">Amicales</th>
                <th className="text-right">Nuit</th>
              </tr>
            </thead>
            <tbody>
              {data.skirmishes.map((s) => (
                <tr key={s.day} className="border-b border-line/70">
                  <td className="py-1">{s.day.slice(5)}</td>
                  <td className="text-right">{s.ranked}</td>
                  <td className="text-right">{s.friendly}</td>
                  <td className={`text-right ${s.night > 0 ? "text-vermilion" : ""}`}>{s.night}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
      <Panel>
        <Label>Parties d'escarmouche</Label>
        <p className="mt-1 text-xs text-cream-dim">
          Par semaine : payées (classées), terminées sans Gloire, interrompues par un redémarrage.
          Contrôles toujours à 0 : Gloire d'une même partie versée deux fois à un marchand, Gloire
          versée pour une partie interrompue.
        </p>
        <p
          className={`mt-2 text-sm ${
            data.skirmishMatches.duplicates + data.skirmishMatches.abortedPaid > 0
              ? "text-vermilion"
              : "text-lagoon"
          }`}
        >
          Payées deux fois : {data.skirmishMatches.duplicates} · payées après interruption :{" "}
          {data.skirmishMatches.abortedPaid}
        </p>
        {data.skirmishMatches.weeks.length > 0 && (
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="label text-left">
                <th>Semaine</th>
                <th className="text-right">Payées</th>
                <th className="text-right">Sans Gloire</th>
                <th className="text-right">Interrompues</th>
              </tr>
            </thead>
            <tbody>
              {data.skirmishMatches.weeks.map((w) => (
                <tr key={w.week} className="border-b border-line/70">
                  <td className="py-1">{w.week.slice(5)}</td>
                  <td className="text-right">{w.paid}</td>
                  <td className="text-right">{w.done}</td>
                  <td className="text-right">{w.aborted}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
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
      {shared.length > 0 && (
        <Panel>
          <Label>Adresses en double</Label>
          <p className="mt-1 text-xs text-cream-dim">
            Comptes d'avant le 24 octobre 2026 qui partagent la boîte mail d'un compte plus ancien
            (alias « + », points de Gmail). Ils se connectent encore avec leur propre adresse ; rien
            n'est fusionné. À trancher à la main.
          </p>
          <ul className="mt-3 space-y-1 text-sm">
            {shared.map((s) => (
              <li key={s.email} className="break-all">
                {s.email} → {s.holder ?? "?"}
              </li>
            ))}
          </ul>
        </Panel>
      )}
      <Reports />
      <SeasonEnd />
    </main>
  );
}
