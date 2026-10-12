import { useEffect, useState } from "react";
import { ResourceIcon } from "../art/resources.js";
import { fr } from "../i18n.js";
import { Big, Label, Panel, Qty, Ribbon, Sheet, Slab, clock } from "../ui.js";
import { have } from "./Comptoir.js";
import type { GameProps } from "./Game.js";
import { d } from "./format.js";
import { store } from "./store.js";
import type { PlayerView, Project } from "./types.js";

const t = () => fr.game.acts;
const ROMAN = ["I", "II", "III", "IV", "V", "VI"];

type Act = PlayerView["acts"][number];

/** Title and story of an act (its variant once it has begun). */
export function actText(act: Act): { title: string; text: string } {
  const named = act.variant ? t().variants[act.variant] : undefined;
  const base = t().acts[act.code];
  return {
    title: named?.[0] ?? base?.[0] ?? act.code,
    text: named?.[1] ?? base?.[1] ?? "",
  };
}

export function currentAct(view: PlayerView, now: number): Act | null {
  return view.acts.find((a) => now >= a.startsAt && now < a.endsAt) ?? null;
}

/**
 * The season as a frieze of acts: the past in lagoon, the act under way in gold up to today, the
 * acts to come in the dark. A touch tells the act under way.
 */
export function SeasonFrieze(props: GameProps & { className?: string }) {
  const { view, now } = props;
  const acts = view.acts;
  const act = currentAct(view, now);
  if (acts.length === 0 || !act) return null;
  const start = acts[0]?.startsAt ?? 0;
  const end = acts[acts.length - 1]?.endsAt ?? 1;
  const title = actText(act).title;
  return (
    <button
      type="button"
      onClick={() => props.setSheet("act")}
      className={`block w-full text-left ${props.className ?? ""}`}
      aria-label={t().open(title)}
    >
      <p className="label truncate text-lagoon">
        {fr.game.dayOf(view.day, props.catalog.world.seasonDays)} ·{" "}
        <span className="text-gold">
          {ROMAN[act.index] ?? act.index + 1}. {title}
        </span>
      </p>
      <div className="mt-1.5 flex h-1.5 gap-0.5 overflow-hidden rounded-full">
        {acts.map((a) => {
          const share = (a.endsAt - a.startsAt) / Math.max(1, end - start);
          const done =
            now >= a.endsAt
              ? 1
              : now <= a.startsAt
                ? 0
                : (now - a.startsAt) / (a.endsAt - a.startsAt);
          return (
            <div
              key={a.index}
              className="relative h-full bg-night-4"
              style={{ width: `${share * 100}%` }}
            >
              <div
                className={`h-full ${a.index === act.index ? "bg-gold" : "bg-lagoon"}`}
                style={{ width: `${done * 100}%` }}
              />
            </div>
          );
        })}
      </div>
    </button>
  );
}

/** The card of the act under way: opened by the frieze, and by itself on the act's first visit. */
export function ActCard(props: GameProps) {
  const { view, now } = props;
  const act = currentAct(view, now);
  const key = act ? `actSeen:${act.startsAt}` : "";
  useEffect(() => {
    // Not over the first steps: the guide speaks first.
    if (!act || !view.tutorial.includes("sell_city") || store.get(key) === "1") return;
    store.set(key, "1");
    props.setSheet("act");
  }, [act, key, view.tutorial, props.setSheet]);
  if (!act) return null;
  const { title, text } = actText(act);
  const next = view.acts[act.index + 1];
  return (
    <Sheet open={props.sheet === "act"} onClose={() => props.setSheet(null)}>
      <div className="space-y-4 text-center">
        <Label className="text-gold">{t().kicker(ROMAN[act.index] ?? String(act.index + 1))}</Label>
        <h3 className="font-display text-3xl font-extrabold uppercase leading-tight">{title}</h3>
        <p className="text-sm leading-relaxed text-cream-dim">{text}</p>
        <div className="flex justify-center gap-1.5">
          {view.acts.map((a) => (
            <span
              key={a.index}
              className={`label rounded-md px-2 py-1 ${a.index === act.index ? "bg-gold text-ink" : a.index < act.index ? "bg-lagoon/30" : "bg-night-4"}`}
            >
              {ROMAN[a.index] ?? a.index + 1}
            </span>
          ))}
        </div>
        <p className="label">
          {next ? t().nextIn(clock(act.endsAt - now)) : t().endIn(clock(act.endsAt - now))}
        </p>
        {act.worksite && (
          <Slab
            className="w-full"
            onClick={() => {
              props.setSheet(null);
              props.goTo("familles");
            }}
          >
            {t().toWorksite}
          </Slab>
        )}
      </div>
    </Sheet>
  );
}

/** The act's worksite: what is still needed, delivering, and the families' race. */
export function WorksitePanel(props: GameProps) {
  const { view, now } = props;
  const project: Project | undefined = view.projects.find(
    (p) => p.act !== undefined && now < p.deadline,
  );
  const resources = project ? Object.keys(project.needs) : [];
  const [resource, setResource] = useState(resources[0] ?? "");
  const [qty, setQty] = useState(1);
  if (!project) return null;
  const left = (r: string) => (project.needs[r] ?? 0) - (project.delivered[r] ?? 0);
  const max = Math.max(0, Math.min(have(view, resource), left(resource)));
  const q = Math.min(Math.max(1, qty), Math.max(1, max));
  const race = Object.entries(project.byFamily ?? {}).sort((a, b) => b[1] - a[1]);
  const mine = view.families?.mine ?? null;
  const name = (code: string) => props.catalog.families.find((f) => f.code === code)?.name ?? code;
  return (
    <Panel glow="gold">
      <Label className="text-gold">{t().worksite.kicker}</Label>
      <h3 className="mt-1 font-display text-xl font-extrabold uppercase">
        {t().worksite.title(props.names.city(project.city))}
      </h3>
      <p className="mt-1 text-sm text-cream-dim">{t().worksite.help}</p>
      <p className="label mt-2">{t().worksite.closesIn(clock(project.deadline - now))}</p>
      <div className="mt-3 space-y-2">
        {resources.map((r) => (
          <div key={r} className="flex items-center gap-2">
            <ResourceIcon code={r} size={22} />
            <div className="flex-1">
              <Ribbon
                value={(project.delivered[r] ?? 0) / Math.max(1, project.needs[r] ?? 1)}
                label={`${project.delivered[r] ?? 0} / ${project.needs[r] ?? 0} · ${d(project.unitPrice[r])}`}
              />
            </div>
          </div>
        ))}
      </div>
      {mine ? (
        <div className="mt-4 space-y-2">
          <div className="flex gap-2">
            {resources.map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={resource === r}
                onClick={() => setResource(r)}
                className={`flex flex-1 items-center justify-center gap-1 rounded-xl border px-2 py-2 text-sm ${resource === r ? "border-gold bg-gold/10" : "border-line"}`}
              >
                <ResourceIcon code={r} size={18} />
                {fr.game.inStock} {have(view, r)}
              </button>
            ))}
          </div>
          <Qty value={q} max={Math.max(1, max)} onChange={setQty} />
          <Slab
            className="w-full"
            disabled={props.busy || max === 0}
            onClick={() =>
              props.act({ type: "deliverToProject", projectId: project.id, resource, quantity: q })
            }
          >
            {t().worksite.deliver(q, d(BigInt(project.unitPrice[resource] ?? 0) * BigInt(q)))}
          </Slab>
        </div>
      ) : (
        <p className="mt-3 text-sm text-vermilion">{t().worksite.noFamily}</p>
      )}
      {race.length > 0 && (
        <div className="mt-4">
          <Label>{t().worksite.race}</Label>
          <ol className="mt-2 space-y-1">
            {race.map(([family, units], i) => (
              <li
                key={family}
                className={`flex justify-between text-sm ${family === mine ? "text-gold" : ""}`}
              >
                <span>
                  {i + 1}. {name(family)}
                </span>
                <Big className="text-sm">{units}</Big>
              </li>
            ))}
          </ol>
        </div>
      )}
    </Panel>
  );
}
