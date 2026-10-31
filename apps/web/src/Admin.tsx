import { useCallback, useEffect, useState } from "react";
import { AdminPlayers } from "./AdminPlayers.js";
import { fr } from "./i18n.js";
import { Big, Label, Panel, Ribbon, Stat } from "./ui.js";

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
  skirmishCalls?: { day: string; call: string; ranked: number; friendly: number; humans: number }[];
  skirmishMatches: {
    weeks: { week: string; paid: number; done: number; aborted: number }[];
    duplicates: number;
    abortedPaid: number;
  };
  tutorial: { step: string; players: number }[];
  lastSeen: Record<string, number>;
  companies?: {
    members: number;
    invitesPerPlayer: number;
    day7: Record<"members" | "alone", { eligible: number; returned: number }>;
  };
  funnel?: {
    steps: string[];
    days: { day: string; steps: Record<string, number> }[];
    sources: { source: string; steps: Record<string, number> }[];
  };
}

/** The way in, step by step (counters, no one in them). */
const FUNNEL: Record<string, string> = {
  landing_view: "Accueil",
  link_requested: "Lien",
  signed_in: "Compte",
  region_chosen: "Région",
  first_produce: "1er lot",
};

function Funnel({ funnel }: { funnel: NonNullable<Retention["funnel"]> }) {
  const head = (
    <tr className="text-left text-cream-dim">
      <th className="py-1 pr-2 font-normal" />
      {funnel.steps.map((s) => (
        <th key={s} className="py-1 pr-2 text-right font-normal">
          {FUNNEL[s] ?? s}
        </th>
      ))}
    </tr>
  );
  const row = (label: string, steps: Record<string, number>) => (
    <tr key={label} className="border-t border-line/60">
      <td className="py-1 pr-2">{label}</td>
      {funnel.steps.map((s) => (
        <td key={s} className="py-1 pr-2 text-right tabular-nums">
          {steps[s] ?? 0}
        </td>
      ))}
    </tr>
  );
  return (
    <Panel>
      <Label>Entrée dans le jeu (14 jours)</Label>
      <p className="mt-1 text-xs text-cream-dim">
        Compteurs anonymes, sans compte ni cookie avant l'inscription : accueil vu, lien demandé,
        compte créé, région choisie, premier lot lancé. Par jour, puis par source de campagne
        (utm_source ; « — » sans source).
      </p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>{head}</thead>
          <tbody>{funnel.days.map((d) => row(d.day.slice(5), d.steps))}</tbody>
        </table>
        <table className="mt-3 w-full text-xs">
          <thead>{head}</thead>
          <tbody>{funnel.sources.map((s) => row(s.source || "—", s.steps))}</tbody>
        </table>
      </div>
    </Panel>
  );
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

/** The retention of the beta: people, not bots. */
function RetentionView() {
  const [data, setData] = useState<Retention | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/admin/retention", { credentials: "same-origin" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`Erreur ${r.status}`);
        setData(await r.json());
      })
      .catch((e: Error) => setError(e.message));
  }, []);
  if (error) return <p className="p-8 text-center text-vermilion">{error}</p>;
  if (!data) return <p className="p-8 text-center text-muted">…</p>;
  const first = data.tutorial[0]?.players ?? 0;
  return (
    <div className="space-y-4">
      <p className="text-sm text-cream-dim">{data.players} marchands inscrits (hors PNJ)</p>
      <div className="grid items-start gap-4 lg:grid-cols-2 2xl:grid-cols-3">
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
                    <td className={`text-right ${s.night > 0 ? "text-vermilion" : ""}`}>
                      {s.night}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
        {data.skirmishCalls && data.skirmishCalls.length > 0 && (
          <Panel>
            <Label>Convocations d'escarmouche</Label>
            <p className="mt-1 text-xs text-cream-dim">
              Par jour et par convocation (« hors » : en dehors d'elles) : parties avec au moins un
              marchand classé, parties amicales, marchands par partie en moyenne. Cible : 40 % de
              parties classées en convocation au moins.
            </p>
            <table className="mt-3 w-full text-sm">
              <thead>
                <tr className="label text-left">
                  <th>Jour</th>
                  <th>Heure</th>
                  <th className="text-right">Classées</th>
                  <th className="text-right">Amicales</th>
                  <th className="text-right">Marchands</th>
                </tr>
              </thead>
              <tbody>
                {data.skirmishCalls.map((s) => (
                  <tr key={`${s.day}-${s.call}`} className="border-b border-line/70">
                    <td className="py-1">{s.day.slice(5)}</td>
                    <td>{s.call}</td>
                    <td className="text-right">{s.ranked}</td>
                    <td className="text-right">{s.friendly}</td>
                    <td className="text-right">{s.humans}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        )}
        {data.companies && (
          <Panel>
            <Label>Compagnies</Label>
            <p className="mt-1 text-xs text-cream-dim">
              Marchands en compagnie, invitations partagées par marchand (cible : 0,5), et retour au
              7e jour des membres comparé à celui des marchands seuls.
            </p>
            <ul className="mt-2 space-y-1 text-sm">
              <li>Membres : {data.companies.members}</li>
              <li>
                Invitations par marchand :{" "}
                {data.companies.invitesPerPlayer.toLocaleString("fr-FR", {
                  maximumFractionDigits: 2,
                })}
              </li>
              {(["members", "alone"] as const).map((k) => {
                const d = data.companies?.day7[k] ?? { eligible: 0, returned: 0 };
                return (
                  <li key={k}>
                    J7 {k === "members" ? "en compagnie" : "seuls"} : {d.returned} / {d.eligible}
                    {d.eligible > 0 && ` (${Math.round((100 * d.returned) / d.eligible)} %)`}
                  </li>
                );
              })}
            </ul>
          </Panel>
        )}
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
      </div>
      {data.funnel && <Funnel funnel={data.funnel} />}
    </div>
  );
}

/** Suspicious trades, shared mailboxes, reported messages. */
function Moderation() {
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
  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
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
    </div>
  );
}

export interface WorldInfo {
  id: string;
  name: string;
  kind: "empire" | "season";
  now: number;
  startAt: number;
  players: number;
  bots: number;
  me: string;
}

/** The world as it runs, its books checked, the Pass given. */
function WorldDesk({ world }: { world: WorldInfo }) {
  const [check, setCheck] = useState<{ ok: boolean; violations: unknown[] } | null>(null);
  const [checking, setChecking] = useState(false);
  const [email, setEmail] = useState("");
  const [days, setDays] = useState("30");
  const [granted, setGranted] = useState<string | null>(null);
  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <Panel>
        <Label>Monde</Label>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Stat label="Nom" value={world.name} />
          <Stat label="Genre" value={world.kind === "empire" ? "Empire" : "Saison"} />
          <Stat label="Marchands" value={world.players - world.bots} tone="lagoon" />
          <Stat label="PNJ" value={world.bots} />
        </div>
        <p className="mt-3 text-xs text-cream-dim">
          Horloge du serveur :{" "}
          {new Date(world.now).toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "short" })}
          <br />
          Ouvert le {new Date(world.startAt).toLocaleDateString("fr-FR")} ·{" "}
          <span className="font-mono">{world.id}</span>
        </p>
      </Panel>
      <Panel>
        <Label>Grand livre</Label>
        <p className="mt-1 text-xs text-cream-dim">
          Vérifie que l'état du monde et les journaux (ledger_entries, stock_movements) concordent.
          Lit tous les journaux : à lancer à la demande.
        </p>
        <button
          type="button"
          disabled={checking}
          className="mt-3 w-full rounded-xl bg-info px-3 py-2 font-display text-xs font-extrabold uppercase text-ink disabled:opacity-40"
          onClick={async () => {
            setChecking(true);
            const r = await fetch("/api/admin/invariants", {
              method: "POST",
              credentials: "same-origin",
            });
            setCheck(r.ok ? await r.json() : { ok: false, violations: [`Erreur ${r.status}`] });
            setChecking(false);
          }}
        >
          {checking ? "Vérification…" : "Vérifier les invariants"}
        </button>
        {check && (
          <div className={`mt-2 text-sm ${check.ok ? "text-lagoon" : "text-vermilion"}`}>
            {check.ok ? (
              "Tout concorde."
            ) : (
              <pre className="max-h-60 overflow-auto whitespace-pre-wrap text-xs">
                {JSON.stringify(check.violations, null, 2)}
              </pre>
            )}
          </div>
        )}
      </Panel>
      <Panel>
        <Label>Offrir le Pass</Label>
        <p className="mt-1 text-xs text-cream-dim">
          Tests, cadeaux, support. S'ajoute au Pass en cours.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            type="email"
            placeholder="adresse@exemple.fr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="min-w-0 flex-1 rounded-xl bg-night-2 px-3 py-2 text-cream ring-1 ring-line"
          />
          <input
            type="number"
            min={1}
            max={366}
            value={days}
            onChange={(e) => setDays(e.target.value)}
            className="w-full rounded-xl bg-night-2 px-3 py-2 text-cream ring-1 ring-line sm:w-24"
          />
          <button
            type="button"
            disabled={!email.includes("@") || !(Number(days) >= 1)}
            className="rounded-xl bg-info px-3 py-2 font-display text-xs font-extrabold uppercase text-ink disabled:opacity-40"
            onClick={async () => {
              const r = await fetch("/api/admin/pass", {
                method: "POST",
                credentials: "same-origin",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, days: Number(days) }),
              });
              const body = await r.json().catch(() => ({}));
              setGranted(
                r.ok
                  ? `Pass jusqu'au ${new Date(body.until).toLocaleString("fr-FR")}.`
                  : `Refusé (${body.error ?? r.status}).`,
              );
            }}
          >
            Offrir
          </button>
        </div>
        {granted && <p className="mt-2 text-sm text-cream-dim">{granted}</p>}
      </Panel>
      {world.kind === "season" && <SeasonEnd />}
    </div>
  );
}

type Tab = "players" | "retention" | "moderation" | "world";
const TABS: { value: Tab; label: string; hint: string }[] = [
  { value: "players", label: "Joueurs", hint: "Caisse, niveau, entrepôt, Maison" },
  { value: "retention", label: "Rétention", hint: "Retours, tutoriel, sessions" },
  { value: "moderation", label: "Modération", hint: "Échanges suspects, signalements" },
  { value: "world", label: "Monde", hint: "Grand livre, Pass, saison" },
];

function tabFromHash(): Tab {
  const h = window.location.hash.slice(1);
  return TABS.some((t) => t.value === h) ? (h as Tab) : "players";
}

/** The admin's desk (admins only): the merchants, the retention, the moderation, the world. */
export function Admin() {
  const [world, setWorld] = useState<WorldInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>(tabFromHash);
  useEffect(() => {
    fetch("/api/admin/world", { credentials: "same-origin" })
      .then(async (r) => {
        if (!r.ok)
          throw new Error(
            r.status === 403
              ? "Accès réservé."
              : r.status === 401
                ? "Se connecter d'abord."
                : `Erreur ${r.status}`,
          );
        setWorld(await r.json());
      })
      .catch((e: Error) => setError(e.message));
  }, []);
  useEffect(() => {
    const on = () => setTab(tabFromHash());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  const go = (t: Tab) => {
    window.history.replaceState(null, "", `#${t}`);
    setTab(t);
  };

  if (error) return <p className="p-8 text-center text-vermilion">{error}</p>;
  if (!world) return <p className="p-8 text-center text-muted">…</p>;
  const current = TABS.find((t) => t.value === tab) ?? TABS[0];
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="sticky top-0 z-10 border-b border-line bg-night/95 px-4 pb-3 pt-4 backdrop-blur lg:h-dvh lg:border-b-0 lg:border-r lg:px-5 lg:pt-8">
        <div className="flex items-center justify-between gap-3 lg:block">
          <div className="min-w-0">
            <Label className="text-gold">Administration</Label>
            <p className="mt-1 truncate font-display text-lg font-extrabold uppercase">
              {world.name}
            </p>
            <p className="truncate text-xs text-cream-dim">
              {world.kind === "empire" ? "Empire" : "Saison mensuelle"} ·{" "}
              {world.players - world.bots} marchands
            </p>
          </div>
          <a
            href="/"
            className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold text-cream-dim ring-1 ring-line hover:text-cream lg:mt-4 lg:inline-block"
          >
            ← Jeu
          </a>
        </div>
        <nav className="mt-3 flex gap-1 overflow-x-auto lg:mt-8 lg:flex-col">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              aria-current={t.value === tab ? "page" : undefined}
              onClick={() => go(t.value)}
              className={`shrink-0 rounded-lg px-3 py-2 text-left transition ${t.value === tab ? "bg-info text-ink" : "text-cream-dim hover:bg-night-3 hover:text-cream"}`}
            >
              <span className="block font-display text-sm font-bold">{t.label}</span>
              <span
                className={`hidden text-xs lg:block ${t.value === tab ? "text-ink/70" : "text-muted"}`}
              >
                {t.hint}
              </span>
            </button>
          ))}
        </nav>
        <p className="mt-8 hidden break-all text-xs text-muted lg:block">{world.me}</p>
      </aside>
      <main className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-8 lg:py-8">
        <h1 className="mb-5 font-display text-3xl font-extrabold uppercase">{current?.label}</h1>
        {tab === "players" && <AdminPlayers />}
        {tab === "retention" && <RetentionView />}
        {tab === "moderation" && <Moderation />}
        {tab === "world" && <WorldDesk world={world} />}
      </main>
    </div>
  );
}
