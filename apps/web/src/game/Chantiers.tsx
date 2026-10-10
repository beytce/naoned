import { useState } from "react";
import { BuildingArt } from "../art/buildings.js";
import { ResourceIcon } from "../art/resources.js";
import { fr } from "../i18n.js";
import { Big, Label, Panel, Qty, Ribbon, Slab, clock } from "../ui.js";
import { have } from "./Comptoir.js";
import type { GameProps } from "./Game.js";
import { d } from "./format.js";
import type { Project } from "./types.js";

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

export function Chantiers(props: GameProps) {
  const projects = props.view.projects;
  if (projects.length === 0) {
    return (
      <div className="py-12 text-center">
        <BuildingArt type="palazzo" className="mx-auto h-32 w-44 opacity-60" />
        <p className="mt-4 text-cream-dim">{fr.game.noProject}</p>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {projects.map((p) => (
        <div key={p.id} className="space-y-4">
          <div className="text-center">
            <BuildingArt type="palazzo" className="mx-auto h-36 w-52 animate-floaty" />
            <Label className="mt-2 text-gold">☆ {fr.game.projectsKicker}</Label>
            <h2 className="mt-2 font-display text-3xl font-extrabold uppercase leading-tight">
              {fr.game.projectTitle(props.names.city(p.city))}
            </h2>
            <div className="mt-4 flex justify-center gap-8">
              <div>
                <Label>{fr.game.endsIn}</Label>
                <Big className="mt-1 text-3xl">{clock(p.deadline - props.now)}</Big>
              </div>
            </div>
          </div>
          <Panel glow="gold">
            <p className="text-sm text-cream-dim">{fr.game.projectsHelp}</p>
            <div className="mt-2 space-y-4">
              {Object.keys(p.needs).map((r) => (
                <Need key={r} project={p} resource={r} props={props} />
              ))}
            </div>
          </Panel>
        </div>
      ))}
    </div>
  );
}
