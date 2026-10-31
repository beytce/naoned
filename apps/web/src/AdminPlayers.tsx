import { type ReactNode, useCallback, useEffect, useState } from "react";
import { Badge, Label, Panel, Stat } from "./ui.js";

/** The admin's desk on the merchants: find one, read their sheet, set what to test. */

interface Row {
  id: string;
  email: string | null;
  pseudo: string | null;
  isBot: boolean;
  lastSeen: number | null;
  cash: string;
  casa: number | null;
  power: number | null;
  band: number | null;
  level: number | null;
}

interface House {
  casa: number;
  favour: number;
  seals: number;
  heritage?: number;
  merit?: number;
  workshops: { id: string; type: string; recipe: string; level: number; region?: string }[];
  builds: { kind: string; level: number; endsAt: number }[];
  counters?: Record<string, number>;
  vehicleLevels?: Record<string, number>;
  vehicles?: { id: string; type: string; busyUntil: number }[];
  modules?: Record<string, number>;
  knowledge?: string[];
  learning?: { code: string; endsAt: number }[];
  research?: { code: string; level: number; endsAt: number }[];
  staff?: { id: string; role: string; rarity: string; level: number }[];
  arsenal?: string;
  camp?: string;
  depot?: string;
  revealed?: string[];
  arte?: string;
}

interface Sheet {
  account: {
    id: string;
    email: string;
    pseudo: string | null;
    isBot: boolean;
    createdAt: number;
    lastLoginAt: number | null;
    condottaLevel: number;
    condottaBest: number;
    terraRating: number;
    lustre: number;
  };
  passUntil: number;
  cash: string;
  escrow: string;
  stock: Record<string, { available: number; escrow: number }>;
  goods: { code: string; name: string }[];
  level: { level: number; xp: number } | null;
  empire: {
    house: House;
    power: number;
    band: number;
    incomePerDay: string;
    asleep: boolean;
    bounds: {
      casa: number;
      workshop: number;
      counter: number;
      vehicleLevel: number;
      module: number;
      staff: number;
    };
    regions: { code: string; casa: number }[];
    vehicles: { type: string; casa: number; ship: boolean }[];
    modules: { code: string; kind: string; effect: string }[];
    knowledge: { branch: string; codes: string[] }[];
    sites: { arsenal: boolean; camp: boolean; depot: boolean };
    cells: number;
  } | null;
}

type Edit = Record<string, unknown> & { kind: string };

const ERRORS: Record<string, string> = {
  invalid_quantity: "valeur hors des bornes",
  unknown_player: "marchand inconnu",
  not_empire_world: "réservé au monde de l'empire",
  built: "déjà bâti",
  unknown_cell: "aucune case ne convient",
  unknown_building_type: "absent de ce monde",
  insufficient_stock: "stock insuffisant",
  pseudo_taken: "pseudo déjà pris",
  invalid_edit: "requête invalide",
  forbidden: "accès réservé",
};

/** Deniers (a string, never a float) written as ducats. */
export function ducatsOf(deniers: string): string {
  const d = BigInt(deniers || "0");
  const whole = d / 100n;
  const cents = d % 100n;
  return `${whole.toLocaleString("fr-FR")}${cents ? `,${cents.toString().padStart(2, "0")}` : ""} d`;
}

/** « 1 500,5 » ducats → deniers as a string, or null if it is no amount. */
export function deniersOf(text: string): string | null {
  const clean = text.replace(/[\s  ]/g, "").replace(".", ",");
  const m = /^(\d{1,15})(?:,(\d{1,2}))?$/.exec(clean);
  if (!m) return null;
  return (BigInt(m[1] ?? "0") * 100n + BigInt((m[2] ?? "").padEnd(2, "0") || "0")).toString();
}

const when = (ms: number | null) =>
  ms ? new Date(ms).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "jamais";

const field =
  "min-w-0 rounded-lg bg-night-2 px-2.5 py-1.5 text-sm text-cream ring-1 ring-line tabular-nums focus:outline-none focus:ring-info";
const input = `${field} w-full`;
const button =
  "shrink-0 rounded-lg px-3 py-1.5 font-display text-xs font-bold uppercase transition disabled:opacity-40";
const primary = `${button} bg-info text-ink hover:brightness-110`;
const ghost = `${button} bg-night-4 text-cream hover:bg-night-2 ring-1 ring-line`;

/** A number set at once: a field, OK, and a shortcut to the top when there is one. */
function NumberSet(props: {
  label: ReactNode;
  value: number;
  min?: number;
  max?: number;
  onSet: (n: number) => void;
  busy: boolean;
}) {
  const [text, setText] = useState(String(props.value));
  useEffect(() => setText(String(props.value)), [props.value]);
  const n = Number(text);
  const valid =
    text !== "" &&
    Number.isInteger(n) &&
    n >= (props.min ?? 0) &&
    (props.max === undefined || n <= props.max);
  return (
    <div className="flex items-center gap-2">
      <span className="min-w-0 flex-1 truncate text-sm text-cream-dim">{props.label}</span>
      <input
        type="number"
        inputMode="numeric"
        min={props.min ?? 0}
        max={props.max}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && valid && n !== props.value) props.onSet(n);
        }}
        className={`${field} w-20 shrink-0 text-right`}
      />
      {props.max !== undefined && (
        <span className="w-10 shrink-0 text-xs text-muted tabular-nums">/ {props.max}</span>
      )}
      <button
        type="button"
        className={primary}
        disabled={props.busy || !valid || n === props.value}
        onClick={() => props.onSet(n)}
      >
        OK
      </button>
      {props.max !== undefined && (
        <button
          type="button"
          className={ghost}
          disabled={props.busy || props.value === props.max}
          onClick={() => props.max !== undefined && props.onSet(props.max)}
        >
          Max
        </button>
      )}
    </div>
  );
}

function Section({
  title,
  hint,
  children,
  className = "",
  cols = false,
}: { title: string; hint?: string; children: ReactNode; className?: string; cols?: boolean }) {
  return (
    <Panel className={className}>
      <Label>{title}</Label>
      {hint && <p className="mt-1 text-xs text-cream-dim">{hint}</p>}
      <div
        className={`mt-3 ${cols ? "grid grid-cols-[minmax(0,1fr)] gap-x-6 gap-y-2 xl:grid-cols-2 2xl:grid-cols-1" : "space-y-2"}`}
      >
        {children}
      </div>
    </Panel>
  );
}

function CashEditor({
  cash,
  busy,
  onSet,
}: { cash: string; busy: boolean; onSet: (deniers: string) => void }) {
  const [text, setText] = useState("");
  const deniers = deniersOf(text);
  const add = (ducats: bigint) => onSet((BigInt(cash) + ducats * 100n).toString());
  return (
    <Section title="Caisse" hint="Réglée à la valeur exacte, passée au grand livre (admin_adjust).">
      <p className="font-display text-2xl font-extrabold tabular-nums text-gold">
        {ducatsOf(cash)}
      </p>
      <div className="flex gap-2">
        <input
          className={input}
          placeholder="Nouveau montant, en ducats"
          inputMode="decimal"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button
          type="button"
          className={primary}
          disabled={busy || deniers === null}
          onClick={() => deniers && onSet(deniers)}
        >
          Régler
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {[1_000n, 10_000n, 100_000n, 1_000_000n, 10_000_000n].map((d) => (
          <button key={d} type="button" className={ghost} disabled={busy} onClick={() => add(d)}>
            +{d.toLocaleString("fr-FR")}
          </button>
        ))}
        <button type="button" className={ghost} disabled={busy} onClick={() => onSet("0")}>
          Vider
        </button>
      </div>
    </Section>
  );
}

function StockEditor({
  sheet,
  busy,
  edit,
}: { sheet: Sheet; busy: boolean; edit: (e: Edit) => void }) {
  const [filter, setFilter] = useState("");
  const [all, setAll] = useState(false);
  const f = filter.trim().toLowerCase();
  const goods = sheet.goods.filter(
    (g) =>
      (all || f || sheet.stock[g.code]) &&
      (!f || g.code.includes(f) || g.name.toLowerCase().includes(f)),
  );
  return (
    <Section
      title="Entrepôt"
      hint="Le stock disponible de chaque marchandise, réglé à la quantité donnée."
    >
      <div className="flex flex-wrap items-center gap-2">
        <input
          className={`${field} flex-1`}
          placeholder="Chercher une marchandise"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <button type="button" className={ghost} onClick={() => setAll((v) => !v)}>
          {all ? "En stock" : "Toutes"}
        </button>
        <button
          type="button"
          className={ghost}
          disabled={busy}
          onClick={() => {
            for (const g of goods) edit({ kind: "stock", good: g.code, qty: 1_000 });
          }}
        >
          1 000 de chaque
        </button>
      </div>
      {goods.length === 0 ? (
        <p className="text-sm text-muted">Entrepôt vide.</p>
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-x-6 gap-y-2 xl:grid-cols-2">
          {goods.map((g) => (
            <NumberSet
              key={g.code}
              label={
                <>
                  {g.name}
                  {(sheet.stock[g.code]?.escrow ?? 0) > 0 && (
                    <span className="text-muted"> · {sheet.stock[g.code]?.escrow} en dépôt</span>
                  )}
                </>
              }
              value={sheet.stock[g.code]?.available ?? 0}
              busy={busy}
              onSet={(qty) => edit({ kind: "stock", good: g.code, qty })}
            />
          ))}
        </div>
      )}
    </Section>
  );
}

function AccountEditor({
  sheet,
  busy,
  run,
}: { sheet: Sheet; busy: boolean; run: (url: string, body: unknown) => void }) {
  const a = sheet.account;
  const set = (patch: Record<string, unknown>) => run(`/api/admin/players/${a.id}/account`, patch);
  const [pseudo, setPseudo] = useState(a.pseudo ?? "");
  useEffect(() => setPseudo(a.pseudo ?? ""), [a.pseudo]);
  const [days, setDays] = useState("30");
  return (
    <Section title="Compte" hint="Ce que le compte garde d'un monde à l'autre.">
      <div className="flex gap-2">
        <input className={input} value={pseudo} onChange={(e) => setPseudo(e.target.value)} />
        <button
          type="button"
          className={primary}
          disabled={busy || pseudo.trim().length < 2 || pseudo === a.pseudo}
          onClick={() => set({ pseudo: pseudo.trim() })}
        >
          Renommer
        </button>
      </div>
      <NumberSet
        label="Condotta : niveau ouvert"
        value={a.condottaLevel}
        min={1}
        busy={busy}
        onSet={(n) => set({ condottaLevel: n })}
      />
      <NumberSet
        label="Condotta : meilleur niveau"
        value={a.condottaBest}
        busy={busy}
        onSet={(n) => set({ condottaBest: n })}
      />
      <NumberSet
        label="Terraferme : cote (Elo)"
        value={a.terraRating}
        busy={busy}
        onSet={(n) => set({ terraRating: n })}
      />
      <NumberSet label="Lustre" value={a.lustre} busy={busy} onSet={(n) => set({ lustre: n })} />
      {!a.isBot && (
        <div className="flex items-center gap-2 border-t border-line/60 pt-2">
          <span className="min-w-0 flex-1 text-sm text-cream-dim">
            Pass : {sheet.passUntil > Date.now() ? `jusqu'au ${when(sheet.passUntil)}` : "aucun"}
          </span>
          <input
            type="number"
            min={1}
            max={366}
            value={days}
            onChange={(e) => setDays(e.target.value)}
            className={`${field} w-16 shrink-0 text-right`}
          />
          <span className="text-xs text-muted">jours</span>
          <button
            type="button"
            className={primary}
            disabled={busy || !(Number(days) >= 1 && Number(days) <= 366)}
            onClick={() => run("/api/admin/pass", { email: a.email, days: Number(days) })}
          >
            Offrir
          </button>
        </div>
      )}
    </Section>
  );
}

function EmpireEditor({
  sheet,
  busy,
  edit,
}: { sheet: Sheet; busy: boolean; edit: (e: Edit) => void }) {
  const e = sheet.empire;
  if (!e) return null;
  const h = e.house;
  const b = e.bounds;
  const pending = h.builds.length + (h.research?.length ?? 0) + (h.learning?.length ?? 0);
  return (
    <>
      <Section
        title="Niveau de la Maison"
        hint="La Casa ouvre les régions, les places et les modèles : réglée directement, sans chantier."
      >
        <NumberSet
          label={<span className="font-semibold text-cream">Casa</span>}
          value={h.casa}
          min={1}
          max={b.casa}
          busy={busy}
          onSet={(level) => edit({ kind: "casa", level })}
        />
        <NumberSet
          label="Faveur"
          value={h.favour}
          busy={busy}
          onSet={(favour) => edit({ kind: "house", favour })}
        />
        <NumberSet
          label="Sceaux"
          value={h.seals}
          busy={busy}
          onSet={(seals) => edit({ kind: "house", seals })}
        />
        <NumberSet
          label="Héritage"
          value={h.heritage ?? 0}
          busy={busy}
          onSet={(heritage) => edit({ kind: "house", heritage })}
        />
        <NumberSet
          label="Mérite"
          value={h.merit ?? 0}
          busy={busy}
          onSet={(merit) => edit({ kind: "house", merit })}
        />
      </Section>

      <Section title="Raccourcis" hint="Pour sauter les attentes et ouvrir ce qui se bâtit.">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={primary}
            disabled={busy}
            onClick={() => edit({ kind: "finish" })}
          >
            Tout terminer maintenant{pending > 0 ? ` (${pending})` : ""}
          </button>
          <button
            type="button"
            className={ghost}
            disabled={busy || e.cells === 0 || (h.revealed?.length ?? 0) >= e.cells}
            onClick={() => edit({ kind: "revealMap" })}
          >
            Révéler la carte
          </button>
          {(["arsenal", "camp", "depot"] as const).map((site) =>
            e.sites[site] ? (
              <button
                key={site}
                type="button"
                className={ghost}
                disabled={busy || Boolean(h[site])}
                onClick={() => edit({ kind: "site", site })}
              >
                {{ arsenal: "Arsenal", camp: "Campo", depot: "Remise" }[site]}
                {h[site] ? " ✓" : ""}
              </button>
            ) : null,
          )}
          <button
            type="button"
            className={ghost}
            disabled={busy}
            onClick={() => {
              edit({ kind: "casa", level: b.casa });
              for (const w of h.workshops)
                edit({ kind: "workshop", workshopId: w.id, level: b.workshop });
            }}
          >
            Casa et ateliers au max
          </button>
        </div>
        <p className="text-xs text-muted">
          « Tout terminer » achève chantiers, recherches, apprentissages, files de nuit et voyages
          en cours.
        </p>
      </Section>

      <Section cols title="Ateliers" hint={`Niveau de 1 à ${b.workshop}.`}>
        {h.workshops.length === 0 && <p className="text-sm text-muted">Aucun atelier.</p>}
        {h.workshops.map((w) => (
          <NumberSet
            key={w.id}
            label={
              <>
                {w.type} <span className="text-muted">· {w.recipe}</span>
                {w.region && w.region !== "veneto" && (
                  <span className="text-muted"> · {w.region}</span>
                )}
              </>
            }
            value={w.level}
            min={1}
            max={b.workshop}
            busy={busy}
            onSet={(level) => edit({ kind: "workshop", workshopId: w.id, level })}
          />
        ))}
      </Section>

      <Section
        cols
        title="Comptoirs"
        hint="Un comptoir réglé dans une région qui n'en a pas est posé sur son siège."
      >
        {e.regions
          .filter((r) => r.code !== "veneto")
          .map((r) => (
            <NumberSet
              key={r.code}
              label={
                <>
                  {r.code} <span className="text-muted">· Casa {r.casa}</span>
                </>
              }
              value={h.counters?.[r.code] ?? 0}
              min={1}
              max={b.counter}
              busy={busy}
              onSet={(level) => edit({ kind: "counter", region: r.code, level })}
            />
          ))}
      </Section>

      <Section cols title="Véhicules" hint="Le niveau de chaque modèle, et un véhicule offert.">
        {e.vehicles.map((v) => {
          const owned = (h.vehicles ?? []).filter((x) => x.type === v.type).length;
          return (
            <div key={v.type} className="space-y-1 rounded-lg bg-night-2/60 p-2">
              <NumberSet
                label={
                  <>
                    {v.type}
                    <span className="text-muted">
                      {" "}
                      · {v.ship ? "navire" : "terre"} · Casa {v.casa} · {owned} possédé
                      {owned > 1 ? "s" : ""}
                    </span>
                  </>
                }
                value={h.vehicleLevels?.[v.type] ?? 1}
                min={1}
                max={b.vehicleLevel}
                busy={busy}
                onSet={(level) => edit({ kind: "vehicleLevel", vehicleType: v.type, level })}
              />
              <button
                type="button"
                className={ghost}
                disabled={busy}
                onClick={() => edit({ kind: "vehicle", vehicleType: v.type })}
              >
                + Offrir un {v.type}
              </button>
            </div>
          );
        })}
      </Section>

      {e.modules.length > 0 && (
        <Section title="Modules (Scuola)" hint={`Niveau de 0 (aucun) à ${b.module}.`}>
          <div className="grid grid-cols-[minmax(0,1fr)] gap-x-6 gap-y-2 xl:grid-cols-2 2xl:grid-cols-1">
            {e.modules.map((m) => (
              <NumberSet
                key={m.code}
                label={
                  <>
                    {m.code} <span className="text-muted">· {m.kind}</span>
                  </>
                }
                value={h.modules?.[m.code] ?? 0}
                max={b.module}
                busy={busy}
                onSet={(level) => edit({ kind: "module", code: m.code, level })}
              />
            ))}
          </div>
        </Section>
      )}

      {e.knowledge.length > 0 && (
        <Section title="Savoirs" hint="Cocher apprend aussitôt ; décocher oublie.">
          {e.knowledge.map((br) => (
            <div key={br.branch}>
              <p className="meta mb-1">{br.branch}</p>
              <div className="flex flex-wrap gap-1.5">
                {br.codes.map((code) => {
                  const on = h.knowledge?.includes(code) ?? false;
                  return (
                    <button
                      key={code}
                      type="button"
                      disabled={busy}
                      aria-pressed={on}
                      onClick={() => edit({ kind: "knowledge", code, learnt: !on })}
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${on ? "bg-lagoon text-on-lagoon" : "text-cream-dim ring-1 ring-inset ring-edge"}`}
                    >
                      {code}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </Section>
      )}

      {(h.staff?.length ?? 0) > 0 && (
        <Section title="Personnel" hint={`Niveau de 1 à ${b.staff}.`}>
          {h.staff?.map((m) => (
            <NumberSet
              key={m.id}
              label={
                <>
                  {m.role} <span className="text-muted">· {m.rarity}</span>
                </>
              }
              value={m.level}
              min={1}
              max={b.staff}
              busy={busy}
              onSet={(level) => edit({ kind: "staffLevel", staffId: m.id, level })}
            />
          ))}
        </Section>
      )}

      {pending > 0 && (
        <Section title="En cours">
          <ul className="space-y-1 text-sm">
            {h.builds.map((x) => (
              <li key={`${x.kind}-${x.endsAt}-${x.level}`} className="flex justify-between">
                <span>
                  Chantier {x.kind} {x.level > 0 ? `niv. ${x.level}` : ""}
                </span>
                <span className="text-muted">{when(x.endsAt)}</span>
              </li>
            ))}
            {h.research?.map((r) => (
              <li key={`r-${r.code}`} className="flex justify-between">
                <span>
                  Recherche {r.code} niv. {r.level}
                </span>
                <span className="text-muted">{when(r.endsAt)}</span>
              </li>
            ))}
            {h.learning?.map((l) => (
              <li key={`l-${l.code}`} className="flex justify-between">
                <span>Savoir {l.code}</span>
                <span className="text-muted">{when(l.endsAt)}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </>
  );
}

function PlayerSheet({ id, onChanged }: { id: string; onChanged: () => void }) {
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const r = await fetch(`/api/admin/players/${id}`, { credentials: "same-origin" });
    if (r.ok) setSheet(await r.json());
    else setStatus({ ok: false, text: `Fiche introuvable (${r.status}).` });
  }, [id]);
  useEffect(() => {
    setSheet(null);
    setStatus(null);
    void load();
  }, [load]);

  // Edits are queued: several clicks (a button that sets many) run one after another.
  const [queue] = useState<{ chain: Promise<unknown> }>({ chain: Promise.resolve() });
  const run = useCallback(
    (url: string, body: unknown) => {
      setBusy(true);
      queue.chain = queue.chain.then(async () => {
        try {
          const r = await fetch(url, {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const res = r.ok ? null : ((await r.json().catch(() => ({}))) as { error?: string });
          setStatus(
            r.ok
              ? { ok: true, text: "Enregistré." }
              : {
                  ok: false,
                  text: `Refusé : ${ERRORS[res?.error ?? ""] ?? res?.error ?? r.status}`,
                },
          );
        } catch {
          setStatus({ ok: false, text: "Réseau injoignable." });
        }
        await load();
        onChanged();
        setBusy(false);
      });
    },
    [load, onChanged, queue],
  );
  const edit = useCallback(
    (e: Edit) => run(`/api/admin/players/${id}/edit`, { edit: e }),
    [id, run],
  );

  if (!sheet)
    return <p className="p-6 text-center text-muted">{status ? status.text : "Chargement…"}</p>;
  const a = sheet.account;
  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate font-display text-2xl font-extrabold">
            {a.pseudo ?? "Sans nom"} {a.isBot && <Badge>PNJ</Badge>}
          </h2>
          <p className="break-words text-xs text-cream-dim">
            {a.isBot ? "Marchand de l'ordinateur" : a.email} · inscrit le {when(a.createdAt)} ·
            dernière connexion {when(a.lastLoginAt)}
          </p>
          <p className="mt-0.5 break-all font-mono text-[11px] text-muted">{a.id}</p>
        </div>
        {status && (
          <output
            className={`block rounded-lg px-3 py-1.5 text-sm ${status.ok ? "bg-lagoon/15 text-lagoon" : "bg-vermilion/15 text-vermilion"}`}
          >
            {status.text}
          </output>
        )}
      </header>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Caisse" value={ducatsOf(sheet.cash)} tone="gold" />
        {sheet.empire ? (
          <>
            <Stat label="Casa" value={`${sheet.empire.house.casa} / ${sheet.empire.bounds.casa}`} />
            <Stat label="Puissance" value={`${sheet.empire.power} · bande ${sheet.empire.band}`} />
            <Stat label="Revenu / jour" value={ducatsOf(sheet.empire.incomePerDay)} tone="lagoon" />
          </>
        ) : (
          <>
            <Stat label="Niveau" value={sheet.level?.level ?? "—"} />
            <Stat label="Expérience" value={sheet.level?.xp.toLocaleString("fr-FR") ?? "—"} />
            <Stat label="En dépôt" value={ducatsOf(sheet.escrow)} />
          </>
        )}
      </div>

      {!sheet.empire && (
        <p className="rounded-lg bg-night-3 p-3 text-xs text-cream-dim ring-1 ring-line">
          Monde des saisons mensuelles : le niveau s'y lit sur les ventes nettes (honorifique, il ne
          règle rien). Les réglages de la Maison (Casa, ateliers, comptoirs…) valent pour le monde
          de l'empire.
        </p>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 2xl:grid-cols-2">
        <div className="space-y-4">
          <CashEditor
            cash={sheet.cash}
            busy={busy}
            onSet={(d) => edit({ kind: "cash", deniers: d })}
          />
          <EmpireEditor sheet={sheet} busy={busy} edit={edit} />
        </div>
        <div className="space-y-4">
          <StockEditor sheet={sheet} busy={busy} edit={edit} />
          <AccountEditor sheet={sheet} busy={busy} run={run} />
        </div>
      </div>
    </div>
  );
}

export function AdminPlayers() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [total, setTotal] = useState(0);
  const [bots, setBots] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch(`/api/admin/players?q=${encodeURIComponent(q)}`, {
      credentials: "same-origin",
    });
    if (!r.ok) return setRows([]);
    const body = await r.json();
    setRows(body.players);
    setTotal(body.total);
  }, [q]);
  useEffect(() => {
    const t = setTimeout(() => void load(), 200);
    return () => clearTimeout(t);
  }, [load]);

  const shown = (rows ?? []).filter((r) => bots || !r.isBot);
  const list = (
    <Panel className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Marchands</Label>
        <span className="text-xs text-muted">
          {shown.length} / {total}
        </span>
      </div>
      <input
        className={input}
        placeholder="Pseudo, e-mail ou identifiant"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <label className="flex items-center gap-2 text-xs text-cream-dim">
        <input type="checkbox" checked={bots} onChange={(e) => setBots(e.target.checked)} />
        Montrer les PNJ
      </label>
      {rows === null ? (
        <p className="text-sm text-muted">…</p>
      ) : shown.length === 0 ? (
        <p className="text-sm text-muted">Personne.</p>
      ) : (
        <ul className="-mx-1 max-h-[70dvh] space-y-1 overflow-y-auto px-1">
          {shown.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => setPicked(r.id)}
                className={`w-full rounded-lg px-2.5 py-2 text-left transition ${picked === r.id ? "bg-info/20 ring-1 ring-info" : "hover:bg-night-2"}`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate font-semibold">
                    {r.pseudo ?? "Sans nom"}
                    {r.isBot && <span className="ml-1 text-xs text-muted">PNJ</span>}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-gold">
                    {ducatsOf(r.cash)}
                  </span>
                </span>
                <span className="flex justify-between gap-2 text-xs text-cream-dim">
                  <span className="truncate">{r.email ?? "—"}</span>
                  <span className="shrink-0">
                    {r.casa !== null
                      ? `Casa ${r.casa} · P ${r.power}`
                      : r.level !== null
                        ? `niv. ${r.level}`
                        : ""}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
      <div className={`${picked ? "hidden lg:block" : ""} lg:sticky lg:top-4`}>{list}</div>
      <div className={picked ? "" : "hidden lg:block"}>
        {picked ? (
          <>
            <button
              type="button"
              className={`${ghost} mb-3 lg:hidden`}
              onClick={() => setPicked(null)}
            >
              ← Liste
            </button>
            <PlayerSheet id={picked} onChanged={() => void load()} />
          </>
        ) : (
          <Panel>
            <p className="py-10 text-center text-sm text-cream-dim">
              Choisir un marchand pour régler sa caisse, son niveau, son entrepôt et sa Maison.
            </p>
          </Panel>
        )}
      </div>
    </div>
  );
}
