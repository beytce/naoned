import { useState } from "react";
import { fr } from "../i18n.js";
import type { GameProps } from "./Game.js";
import { d, duration, minutesLabel } from "./format.js";
import type { BuildingView, Cost, PlayerView, Recipe } from "./types.js";
import { Btn, Card, Progress, Qty } from "./ui.js";

function have(view: PlayerView, resource: string) {
  return view.inventory.find((i) => i.resource === resource)?.available ?? 0;
}

export function affordable(view: PlayerView, cost: Cost): boolean {
  if (BigInt(view.cash) < BigInt(cost.ducats)) return false;
  return Object.entries(cost.materials).every(([r, q]) => have(view, r) >= q);
}

export function CostLine({ cost, props }: { cost: Cost; props: GameProps }) {
  return (
    <span>
      {d(cost.ducats)}
      {Object.entries(cost.materials).map(([r, q]) => (
        <span
          key={r}
          className={have(props.view, r) >= q ? "" : "font-semibold text-red-700 dark:text-red-400"}
        >
          {" · "}
          {q} {props.names.resource(r).toLowerCase()}
        </span>
      ))}
    </span>
  );
}

function recipeLine(recipe: Recipe, level: number, props: GameProps) {
  const region = props.catalog.regions.find((r) => r.code === props.view.player.region);
  const bonusBps = props.catalog.rules.regionBonusBps;
  const side = (m: Record<string, number>, withBonus: boolean) =>
    Object.entries(m)
      .map(([r, q]) => {
        const base = q * level;
        const name = props.names.resource(r).toLowerCase();
        if (!withBonus || region?.bonusResource !== r) return `${base} ${name}`;
        return `${Math.floor((base * (10_000 + bonusBps)) / 10_000)} ${name} (+${bonusBps / 100} %)`;
      })
      .join(" + ");
  const inputs = side(recipe.inputs, false);
  return `${inputs ? `${inputs} → ` : ""}${side(recipe.outputs, true)} · ${minutesLabel(recipe.durationMinutes)}`;
}

function BuildingCard({ b, props }: { b: BuildingView; props: GameProps }) {
  const [batches, setBatches] = useState(1);
  const recipe = props.catalog.buildings.find((x) => x.type === b.type)?.recipe ?? null;
  const job = b.job;
  const now = props.now;
  const ready = job ? Math.min(job.batches, Math.floor((now - job.startedAt) / job.batchMs)) : 0;
  const running = job && ready < job.batches;
  const current = job && running ? (now - job.startedAt - ready * job.batchMs) / job.batchMs : 0;
  const nextIn = job && running ? job.startedAt + (ready + 1) * job.batchMs - now : 0;
  const canStart = Math.max(0, b.canStart);

  return (
    <Card className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h3 className="font-serif text-lg font-semibold">{props.names.building(b.type)}</h3>
        <span className="text-xs opacity-60">{fr.game.level(b.level)}</span>
      </div>
      {recipe && <p className="text-sm opacity-80">{recipeLine(recipe, b.level, props)}</p>}

      {job ? (
        <div className="space-y-1.5">
          {running && <Progress value={current} />}
          <p className="text-sm">
            {running
              ? fr.game.batchProgress(ready + 1, job.batches, duration(nextIn))
              : fr.game.allDone}
          </p>
        </div>
      ) : (
        <p className="text-sm opacity-60">{fr.game.idle}</p>
      )}

      {ready > 0 && (
        <Btn
          className="w-full"
          disabled={props.busy}
          onClick={() => props.act({ type: "collect", buildingId: b.id })}
        >
          {fr.game.harvest(ready)}
        </Btn>
      )}

      {canStart > 0 ? (
        <div className="flex items-center justify-between gap-2">
          <Qty value={Math.min(batches, canStart)} max={canStart} onChange={setBatches} />
          <Btn
            disabled={props.busy}
            onClick={() =>
              props.act({
                type: "startProduction",
                buildingId: b.id,
                batches: Math.min(batches, canStart),
              })
            }
          >
            {fr.game.produce}
          </Btn>
        </div>
      ) : (
        !job &&
        recipe &&
        Object.keys(recipe.inputs).length > 0 && (
          <p className="text-xs opacity-60">{fr.game.missingInputs}</p>
        )
      )}

      {b.upgradeCost && (
        <div className="flex items-center justify-between gap-2 border-t border-ink/10 pt-3 text-xs dark:border-ink-light/10">
          <span className="opacity-80">
            {fr.game.upgradeTo(b.level + 1)} : <CostLine cost={b.upgradeCost} props={props} />
          </span>
          <Btn
            variant="secondary"
            disabled={props.busy || !affordable(props.view, b.upgradeCost)}
            onClick={() => props.act({ type: "upgrade", buildingId: b.id })}
          >
            {fr.game.upgrade}
          </Btn>
        </div>
      )}
    </Card>
  );
}

export function Comptoir(props: GameProps) {
  const [showBuild, setShowBuild] = useState(false);
  const { view, catalog } = props;
  const readyCount = view.buildings.reduce((n, b) => {
    if (!b.job) return n;
    return n + Math.min(b.job.batches, Math.floor((props.now - b.job.startedAt) / b.job.batchMs));
  }, 0);
  const full = view.buildings.length >= catalog.rules.maxBuildings;

  return (
    <div className="space-y-4">
      {readyCount > 0 && (
        <Btn
          className="w-full"
          disabled={props.busy}
          onClick={() => props.act({ type: "collectAll" })}
        >
          {fr.game.harvestAll(readyCount)}
        </Btn>
      )}
      {view.buildings.map((b) => (
        <BuildingCard key={b.id} b={b} props={props} />
      ))}

      <Card className="space-y-3">
        <button
          type="button"
          className="flex w-full items-center justify-between font-serif text-lg"
          onClick={() => setShowBuild(!showBuild)}
        >
          <span>{fr.game.buildTitle}</span>
          <span className="text-sm opacity-60">{showBuild ? "▲" : "▼"}</span>
        </button>
        {showBuild &&
          (full ? (
            <p className="text-sm opacity-70">{fr.game.maxBuildings(catalog.rules.maxBuildings)}</p>
          ) : (
            catalog.buildings.map((b) => (
              <div
                key={b.type}
                className="flex items-center justify-between gap-2 border-t border-ink/10 pt-3 text-sm dark:border-ink-light/10"
              >
                <div>
                  <p className="font-semibold">{b.name}</p>
                  <p className="text-xs opacity-70">
                    <CostLine cost={b.cost} props={props} /> ·{" "}
                    {fr.game.upkeepShort(d(b.upkeepPerDay))}
                  </p>
                  {!b.recipe && <p className="text-xs opacity-70">{fr.game.palazzoHelp}</p>}
                </div>
                <Btn
                  variant="secondary"
                  disabled={props.busy || !affordable(view, b.cost)}
                  onClick={() => props.act({ type: "build", buildingType: b.type })}
                >
                  {fr.game.build}
                </Btn>
              </div>
            ))
          ))}
      </Card>
    </div>
  );
}
