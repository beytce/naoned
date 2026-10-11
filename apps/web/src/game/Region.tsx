import { useState } from "react";
import { BuildingArt } from "../art/buildings.js";
import { ResourceIcon } from "../art/resources.js";
import { RegionArt } from "../art/scenes.js";
import { fr } from "../i18n.js";
import { Label, Panel, Slab } from "../ui.js";
import type { Names } from "./Game.js";
import type { Catalog } from "./types.js";

const SELLS: Record<string, string> = {
  terraferma: "bread",
  lagoon: "bricks",
  dolomites: "planks",
};
const NEEDS: Record<string, string[]> = {
  terraferma: ["bricks", "planks"],
  lagoon: ["planks"],
  dolomites: ["bricks"],
};

export function Region(props: {
  catalog: Catalog;
  names: Names;
  onJoin: (region: string) => Promise<void>;
  toast: string | null;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const bonus = props.catalog.rules.regionBonusBps / 100;
  return (
    <main className="mx-auto max-w-md space-y-5 px-4 pb-10 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <header className="space-y-2">
        <Label className="text-lagoon">{props.catalog.world.name}</Label>
        <h1 className="font-display text-2xl font-extrabold uppercase leading-tight">
          {fr.region.title}
        </h1>
        <p className="text-cream-dim">{fr.region.help}</p>
      </header>
      {props.catalog.regions.map((r, k) => (
        <div key={r.code} className="animate-rise" style={{ animationDelay: `${k * 80}ms` }}>
          <Panel glow={k === 0 ? "gold" : k === 1 ? "lagoon" : undefined}>
            <RegionArt
              code={r.code}
              className="-mx-4 -mt-4 mb-3 h-28 w-[calc(100%+2rem)] max-w-none bg-night-2"
            />
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl font-extrabold uppercase">
                  {fr.region.jobs[r.code]?.name ?? r.name}
                </h2>
                <p className="label mt-1 text-lagoon">{r.name}</p>
              </div>
              <span className="slab shrink-0 bg-lagoon px-2 py-1 font-mono text-xs font-bold text-on-lagoon">
                <span>{fr.region.bonus(bonus, props.names.resource(r.bonusResource))}</span>
              </span>
            </div>
            <p className="mt-2 text-sm text-cream-dim">{fr.region.jobs[r.code]?.text}</p>
            <div className="mt-4 flex items-end gap-1">
              {r.startingBuildings.map((b) => (
                <div key={b} className="flex-1 text-center">
                  <BuildingArt type={b} className="mx-auto h-14 w-20" />
                  <p className="font-mono text-[10px] uppercase tracking-wider text-muted">
                    {props.names.building(b)}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 bg-night-2 p-2 ring-1 ring-gold/50">
                <ResourceIcon code={SELLS[r.code] ?? "bread"} size={30} />
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-gold">
                    {fr.region.sells}
                  </p>
                  <p className="text-sm font-semibold">
                    {props.names.resource(SELLS[r.code] ?? "bread")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-night-2 p-2 ring-1 ring-line">
                <div className="flex">
                  {(NEEDS[r.code] ?? []).map((n) => (
                    <ResourceIcon key={n} code={n} size={26} />
                  ))}
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-muted">
                    {fr.region.needs}
                  </p>
                  <p className="text-sm font-semibold">
                    {(NEEDS[r.code] ?? []).map((n) => props.names.resource(n)).join(" + ")}
                  </p>
                </div>
              </div>
            </div>
            <Slab
              className="mt-4 w-full"
              tone={k === 1 ? "lagoon" : "gold"}
              disabled={busy !== null}
              onClick={async () => {
                setBusy(r.code);
                await props.onJoin(r.code);
                setBusy(null);
              }}
            >
              {busy === r.code ? "…" : fr.region.settle}
            </Slab>
          </Panel>
        </div>
      ))}
      {props.toast && <p className="text-sm text-vermilion">{props.toast}</p>}
    </main>
  );
}
