import { ResourceIcon } from "../art/resources.js";
import { fr } from "../i18n.js";
import { Sheet, Slab, clock } from "../ui.js";
import type { GameProps } from "./Game.js";
import { d } from "./format.js";
import type { Project } from "./types.js";

const t = fr.game.company;

const cityName = (props: GameProps, code: string) =>
  props.catalog.cities.find((c) => c.code === code)?.name ?? code;

const stockOf = (props: GameProps, resource: string) =>
  props.view.inventory.find((i) => i.resource === resource)?.available ?? 0;

/** On the Comptoir: the company order of the moment, how full, and a door to it. */
export function CompanyTile(props: GameProps) {
  const p = props.view.projects[0];
  if (!p) return null;
  const need = Object.values(p.needs).reduce((a, n) => a + n, 0);
  const done = Object.values(p.delivered).reduce((a, n) => a + n, 0);
  const canGive = Object.keys(p.needs).some(
    (r) => (p.needs[r] ?? 0) > (p.delivered[r] ?? 0) && stockOf(props, r) > 0,
  );
  return (
    <button
      type="button"
      onClick={() => props.setSheet("company")}
      className={`flex w-full items-center gap-3 cut border px-3 py-2 text-left text-sm transition active:scale-[0.99] ${canGive ? "border-info/60 bg-info/10 text-info" : "border-line bg-night-3 text-cream-dim"}`}
    >
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{t.of(cityName(props, p.city))}</span>
        <span className="label block">
          {p.completedAt
            ? t.filled
            : `${done} / ${need} · ${t.endsIn(clock(p.deadline - props.now))}`}
        </span>
      </span>
      <span aria-hidden="true">→</span>
    </button>
  );
}

function Line({ props, p, resource }: { props: GameProps; p: Project; resource: string }) {
  const need = p.needs[resource] ?? 0;
  const done = p.delivered[resource] ?? 0;
  const have = stockOf(props, resource);
  // The workers' bread of the day stays home.
  const keep = resource === props.view.rations.resource ? props.view.rations.perDay : 0;
  const give = Math.max(0, Math.min(have - keep, need - done));
  const name = props.catalog.resources.find((r) => r.code === resource)?.name ?? resource;
  return (
    <li className="flex items-center gap-3">
      <ResourceIcon code={resource} size={32} />
      <span className="min-w-0 flex-1">
        <span className="flex justify-between text-sm">
          <span className="font-semibold">{name}</span>
          <span className="tabular-nums text-cream-dim">
            {done} / {need}
          </span>
        </span>
        <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-night-4">
          <span
            className="block h-full bg-lagoon transition-[width] duration-500"
            style={{ width: `${Math.min(100, (done / Math.max(1, need)) * 100)}%` }}
          />
        </span>
        <span className="label mt-1 block">
          {d(p.unitPrice[resource])} · {t.have(have)}
        </span>
      </span>
      <Slab
        tone="ghost"
        size="sm"
        disabled={give <= 0 || props.busy}
        onClick={() =>
          props.act({ type: "deliverToProject", projectId: p.id, resource, quantity: give })
        }
      >
        {t.deliver(Math.max(0, give))}
      </Slab>
    </li>
  );
}

/** The company order: each good, how full, the merchant's stock, and a delivery. */
export function CompanySheet(props: GameProps) {
  const p = props.view.projects[0];
  return (
    <Sheet open={props.sheet === "company"} onClose={() => props.setSheet(null)}>
      <div className="space-y-4 pt-6">
        <h3 className="font-display text-xl font-extrabold uppercase">
          {p ? t.of(cityName(props, p.city)) : t.title}
        </h3>
        <p className="note">{t.help}</p>
        {!p ? (
          <p className="note">{t.none}</p>
        ) : (
          <>
            <p className="label">
              {p.completedAt ? t.filled : t.endsIn(clock(p.deadline - props.now))} ·{" "}
              {t.merchants(p.merchants)}
              {BigInt(p.mine) > 0n && <> · {t.mine(d(p.mine))}</>}
            </p>
            <ul className="space-y-4">
              {Object.keys(p.needs).map((r) => (
                <Line key={r} props={props} p={p} resource={r} />
              ))}
            </ul>
          </>
        )}
      </div>
    </Sheet>
  );
}
