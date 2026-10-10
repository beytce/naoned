import { useState } from "react";
import { fr } from "../i18n.js";
import type { GameProps } from "./Game.js";
import { d, duration } from "./format.js";
import type { Project } from "./types.js";
import { Btn, Card, Progress, Qty } from "./ui.js";

function Need({
  project,
  resource,
  props,
}: { project: Project; resource: string; props: GameProps }) {
  const need = project.needs[resource] ?? 0;
  const done = project.delivered[resource] ?? 0;
  const left = need - done;
  const stock = props.view.inventory.find((i) => i.resource === resource)?.available ?? 0;
  const max = Math.max(1, Math.min(left, stock));
  const [qty, setQty] = useState(max);
  const q = Math.min(qty, max);
  return (
    <div className="space-y-2 border-t border-ink/10 pt-3 dark:border-ink-light/10">
      <div className="flex justify-between text-sm">
        <span className="font-semibold">{props.names.resource(resource)}</span>
        <span className="tabular-nums opacity-70">
          {done} / {need} · {d(project.unitPrice[resource])} {fr.game.perUnit}
        </span>
      </div>
      <Progress value={need > 0 ? done / need : 1} />
      {left > 0 && stock > 0 && (
        <div className="flex items-center justify-between gap-2">
          <Qty value={q} max={max} onChange={setQty} />
          <Btn
            disabled={props.busy}
            onClick={() =>
              props.act({ type: "deliverToProject", projectId: project.id, resource, quantity: q })
            }
          >
            {fr.game.deliver}
          </Btn>
        </div>
      )}
    </div>
  );
}

export function Chantiers(props: GameProps) {
  const projects = props.view.projects;
  if (projects.length === 0)
    return <p className="py-10 text-center opacity-70">{fr.game.noProject}</p>;
  return (
    <div className="space-y-4">
      <p className="text-sm opacity-70">{fr.game.projectsHelp}</p>
      {projects.map((p) => (
        <Card key={p.id} className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h3 className="font-serif text-lg font-semibold">
              {fr.game.projectTitle(props.names.city(p.city))}
            </h3>
            <span className="text-xs opacity-60">
              {fr.game.endsIn(duration(p.deadline - props.now))}
            </span>
          </div>
          {Object.keys(p.needs).map((r) => (
            <Need key={r} project={p} resource={r} props={props} />
          ))}
        </Card>
      ))}
    </div>
  );
}
