import { useState } from "react";
import { BuildingArt } from "../art/buildings.js";
import { ResourceIcon } from "../art/resources.js";
import { fr } from "../i18n.js";
import { Big, Label, Panel, Qty, Ribbon, Slab, clock } from "../ui.js";
import { have } from "./Comptoir.js";
import type { GameProps } from "./Game.js";
import { d } from "./format.js";
import type { ContractView, Project } from "./types.js";

function ContractCard({ c, props }: { c: ContractView; props: GameProps }) {
  const stock = have(props.view, c.resource);
  const missing = Math.max(0, c.quantity - stock);
  const reward = BigInt(c.unitPrice) * BigInt(c.quantity);
  return (
    <Panel glow={c.done ? undefined : missing === 0 ? "gold" : undefined}>
      <div className={`flex items-center gap-3 ${c.done ? "opacity-50" : ""}`}>
        <div className="relative">
          <ResourceIcon code={c.resource} size={48} />
          <span className="absolute -bottom-1 -right-2 bg-night px-1 font-display text-xs font-extrabold text-gold">
            ×{c.quantity}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-extrabold uppercase">
            {c.quantity} {props.names.resource(c.resource).toLowerCase()}
          </p>
          <p className="label mt-1">{props.names.city(c.city)}</p>
        </div>
        <div className="text-right">
          <Label>{fr.game.contracts.reward}</Label>
          <Big className="mt-1 text-xl text-gold">{d(reward)}</Big>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        {c.done ? (
          <span className="label text-lagoon">✓ {fr.game.contracts.done}</span>
        ) : missing > 0 ? (
          <>
            <span className="text-sm text-vermilion">{fr.game.contracts.missing(missing)}</span>
            <Slab
              tone="ghost"
              size="sm"
              onClick={() => {
                props.goTo("marche");
                props.setMarketTab("joueurs");
                props.setSheet(`trade:${c.resource}`);
              }}
            >
              {fr.game.contracts.buy}
            </Slab>
          </>
        ) : (
          <Slab
            className="w-full"
            disabled={props.busy}
            onClick={() => props.act({ type: "fulfillContract", contractId: c.id })}
          >
            {fr.game.contracts.deliver}
          </Slab>
        )}
      </div>
    </Panel>
  );
}

function Need({
  project,
  resource,
  props,
}: { project: Project; resource: string; props: GameProps }) {
  const need = project.needs[resource] ?? 0;
  const done = project.delivered[resource] ?? 0;
  const left = need - done;
  const stock = have(props.view, resource);
  const max = Math.max(1, Math.min(left, stock));
  const [qty, setQty] = useState(max);
  const q = Math.min(qty, max);
  return (
    <div className="space-y-3 border-t border-line pt-4">
      <div className="flex items-center gap-3">
        <ResourceIcon code={resource} size={36} />
        <div className="flex-1">
          <p className="font-display text-sm font-extrabold uppercase">
            {props.names.resource(resource)}
          </p>
          <p className="label mt-0.5">
            {d(project.unitPrice[resource])} {fr.game.perUnit}
          </p>
        </div>
      </div>
      <Ribbon value={need > 0 ? done / need : 1} label={`${done} / ${need}`} />
      {left > 0 && stock > 0 && (
        <div className="flex items-center justify-between gap-2">
          <Qty value={q} max={max} onChange={setQty} />
          <Slab
            disabled={props.busy}
            onClick={() =>
              props.act({ type: "deliverToProject", projectId: project.id, resource, quantity: q })
            }
          >
            {fr.game.deliver}
          </Slab>
        </div>
      )}
    </div>
  );
}

export function Contrats(props: GameProps) {
  const contracts = props.view.contracts;
  const renewAt = contracts[0]?.expiresAt;
  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <header>
          <Label className="text-gold">☆ {fr.game.contracts.kicker}</Label>
          <h1 className="mt-2 font-display text-[2rem] font-extrabold uppercase leading-[1.05]">
            {fr.game.contracts.title}
          </h1>
          <p className="mt-2 text-sm text-cream-dim">{fr.game.contracts.help}</p>
          {renewAt && (
            <div className="mt-3 flex items-baseline gap-3">
              <Label>{fr.game.contracts.renewIn}</Label>
              <Big className="text-2xl text-lagoon">{clock(renewAt - props.now)}</Big>
            </div>
          )}
        </header>
        <div className="grid gap-4 lg:grid-cols-3">
          {contracts.map((c) => (
            <ContractCard key={c.id} c={c} props={props} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <Label>{fr.game.contracts.projects}</Label>
        {props.view.projects.length === 0 ? (
          <p className="text-cream-dim">{fr.game.noProject}</p>
        ) : (
          props.view.projects.map((p) => (
            <Panel key={p.id} className="lg:max-w-3xl">
              <div className="flex items-center gap-3">
                <BuildingArt type="palazzo" className="h-16 w-20" />
                <div className="flex-1">
                  <h2 className="font-display text-lg font-extrabold uppercase leading-tight">
                    {fr.game.projectTitle(props.names.city(p.city))}
                  </h2>
                  <p className="label mt-1">
                    {fr.game.endsIn} {clock(p.deadline - props.now)}
                  </p>
                </div>
              </div>
              <p className="mt-2 text-sm text-cream-dim">{fr.game.projectsHelp}</p>
              <div className="mt-2 space-y-4">
                {Object.keys(p.needs).map((r) => (
                  <Need key={r} project={p} resource={r} props={props} />
                ))}
              </div>
            </Panel>
          ))
        )}
      </section>
    </div>
  );
}
