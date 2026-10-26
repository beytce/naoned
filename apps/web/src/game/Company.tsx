import { GoodsMark } from "../art/goods.js";
import { fr } from "../i18n.js";
import { Rules, Sheet, Slab, clock } from "../ui.js";
import type { GameProps } from "./Game.js";
import { d } from "./format.js";
import type { Project } from "./types.js";

const t = fr.game.company;

const cityName = (props: GameProps, code: string) => props.names.city(code);

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
      className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left text-sm transition active:scale-[0.99] ${canGive ? "border-info/60 bg-info/10 text-info" : "border-line bg-night-3 text-cream-dim"}`}
    >
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{t.of(cityName(props, p.city))}</span>
        <span className="meta block">
          {p.completedAt
            ? t.filled
            : `${done} / ${need} · ${t.endsIn(clock(p.deadline - props.now))}`}
        </span>
      </span>
      <span aria-hidden="true">→</span>
    </button>
  );
}

/** A tier's need of a good, from the Bronze's (as the engine rounds it). */
const tierNeed = (need: number, bps: number) => Math.ceil((need * bps) / 10_000);

function Line({ props, p, resource }: { props: GameProps; p: Project; resource: string }) {
  const bronze = p.needs[resource] ?? 0;
  const done = p.delivered[resource] ?? 0;
  // Past the Bronze, the Arsenal's next tier (E2-6).
  const need =
    p.tiersBps.map((bps) => tierNeed(bronze, bps)).find((n) => n > done) ??
    tierNeed(bronze, p.tiersBps.at(-1) ?? 10_000);
  const have = stockOf(props, resource);
  // The workers' bread of the day stays home.
  const keep = resource === props.view.rations.resource ? props.view.rations.perDay : 0;
  const give = Math.max(0, Math.min(have - keep, need - done));
  const name = props.names.resource(resource);
  return (
    <li className="flex items-center gap-3 rounded-2xl bg-night-2 p-3">
      <GoodsMark code={resource} size={32} />
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
        <span className="meta mt-1 block">
          {d(
            done >= bronze
              ? (p.abovePrice[resource] ?? p.unitPrice[resource])
              : p.unitPrice[resource],
          )}{" "}
          · {fr.game.inStock(have)}
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
    <Sheet
      open={props.sheet === "company"}
      onClose={() => props.setSheet(null)}
      kicker={p && props.names.city(p.city)}
      title={t.title}
      summary={t.line}
    >
      <div className="space-y-4">
        {!p ? (
          <p className="meta">{t.none}</p>
        ) : (
          <>
            {p.tiersBps.length > 1 && (
              <p className="text-sm text-gold">{t.tiers[p.tier ?? 0] ?? ""}</p>
            )}
            <p className="meta">
              {p.completedAt ? t.filled : t.endsIn(clock(p.deadline - props.now))} ·{" "}
              {t.merchants(p.merchants)}
              {BigInt(p.mine) > 0n && <> · {t.mine(d(p.mine))}</>}
            </p>
            <ul className="space-y-2">
              {Object.keys(p.needs).map((r) => (
                <Line key={r} props={props} p={p} resource={r} />
              ))}
            </ul>
          </>
        )}
        <Rules id="company">{t.help}</Rules>
      </div>
    </Sheet>
  );
}
