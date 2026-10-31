import { GoodsMark } from "../art/goods.js";
import { d } from "../game/format.js";
import { fr } from "../i18n.js";
import { Sheet, Slab } from "../ui.js";
import { regionName } from "./World.js";
import { affordable } from "./logic.js";
import type { EmpireAction, EmpirePayload } from "./types.js";

const t = fr.empire;
const goodName = (p: EmpirePayload, code: string) =>
  fr.themeNames.resource[code] ?? p.goods[code] ?? code;

/**
 * The workshops a region may take, each with its button (the one the next step points at first,
 * in gold); none when its places are full.
 */
export function NewWorkshopList({
  p,
  region,
  highlight,
  busy,
  onDone,
  act,
}: {
  p: EmpirePayload;
  region: string;
  highlight: string | null;
  busy: boolean;
  onDone: () => void;
  act: (a: EmpireAction) => Promise<void>;
}) {
  const view = p.view;
  const r = view?.regions.find((x) => x.code === region);
  const here = (view?.house.workshops ?? []).filter(
    (w) => (w.region ?? "veneto") === region,
  ).length;
  const pending = (view?.house.builds ?? []).filter(
    (b) => b.kind === "newWorkshop" && (b.region ?? "veneto") === region,
  ).length;
  const site =
    region === "veneto"
      ? (view?.newWorkshop ?? null)
      : r && here + pending < r.workshopSlots
        ? (view?.workshopSite ?? null)
        : null;
  // Beyond Venetia, a workshop makes no raw good its region does not make.
  const allowed = (outputs: Record<string, number>, inputs: Record<string, number>) =>
    region === "veneto" ||
    Object.keys(inputs).length > 0 ||
    Object.keys(outputs).some((g) => r?.produces.includes(g));
  if (!site) return <p className="text-sm text-cream-dim">{t.workshop.noRoom}</p>;
  return (
    <>
      {
        <ul className="space-y-2">
          {[...p.catalog]
            // The workshop the next step points at comes first, its button in gold.
            .sort(
              (a, b) =>
                Number(b.recipes.some((r) => r.code === highlight)) -
                Number(a.recipes.some((r) => r.code === highlight)),
            )
            .flatMap((b) =>
              b.recipes
                .filter((x) => allowed(x.outputs, x.inputs))
                .map((r) => (
                  <li key={r.code} className="flex items-center gap-3 border-b border-line/60 pb-2">
                    <GoodsMark code={Object.keys(r.outputs)[0] ?? ""} size={28} />
                    <span className="flex-1 text-sm text-cream">
                      {b.name}
                      <span className="block text-xs text-cream-dim">
                        {Object.entries(r.outputs)
                          .map(([g, n]) => `${n} ${goodName(p, g)}`)
                          .join(", ")}
                        {Object.keys(r.inputs).length > 0 &&
                          ` · ${t.workshop.from} ${Object.entries(r.inputs)
                            .map(([g, n]) => `${n} ${goodName(p, g)}`)
                            .join(", ")}`}
                      </span>
                    </span>
                    <Slab
                      size="sm"
                      tone={r.code === highlight ? "gold" : "ghost"}
                      busy={busy}
                      disabled={!affordable(p.cash, site.cost)}
                      onClick={() => {
                        void act({
                          type: "empireBuildWorkshop",
                          workshopType: b.type,
                          recipe: r.code,
                          ...(region !== "veneto" ? { region } : {}),
                        }).then(onDone);
                      }}
                    >
                      {t.workshop.newAction(d(site.cost))}
                    </Slab>
                  </li>
                )),
            )}
        </ul>
      }
    </>
  );
}

/** A new workshop in a region: what it may take. */
export function NewWorkshopSheet({
  p,
  open,
  region,
  highlight,
  busy,
  onClose,
  act,
}: {
  p: EmpirePayload;
  open: boolean;
  region: string;
  highlight: string | null;
  busy: boolean;
  onClose: () => void;
  act: (a: EmpireAction) => Promise<void>;
}) {
  return (
    <Sheet open={open} onClose={onClose} kicker={t.workshop.newTitle} title={regionName(region)}>
      <NewWorkshopList
        p={p}
        region={region}
        highlight={highlight}
        busy={busy}
        onDone={onClose}
        act={act}
      />
    </Sheet>
  );
}
