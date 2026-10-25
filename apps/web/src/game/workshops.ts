/** How a workshop stands: something to collect, working, waiting for work, lacking, at rest. */
export type PlotState = "ready" | "running" | "idle" | "blocked" | "still";
import { locale } from "../lang.js";
import type { GameProps } from "./Game.js";
import type { BuildingView, PlayerView, Recipe } from "./types.js";

export function have(view: PlayerView, resource: string) {
  return view.inventory.find((i) => i.resource === resource)?.available ?? 0;
}

/**
 * The batches a workshop's sheet proposes: one while the guide lasts (short lots, quick returns),
 * then all it can start. The guide ends on its last step, the claimed mission.
 */
export function defaultBatches(tutorial: readonly string[], canStart: number) {
  return tutorial.includes("mission") ? Math.max(1, canStart) : 1;
}

/** Batches of the job done, waiting to be collected. */
export function readyOf(b: BuildingView, now: number) {
  if (!b.job) return 0;
  return Math.min(b.job.batches, Math.floor((now - b.job.startedAt) / b.job.batchMs));
}

export function recipeOf(props: GameProps, type: string): Recipe | null {
  return props.catalog.buildings.find((x) => x.type === type)?.recipe ?? null;
}

/** Output of one batch: base × level, with the region's and the level's yield bonuses. */
export function outputQty(props: GameProps, resource: string, base: number, level = 1) {
  const region = props.catalog.regions.find((r) => r.code === props.view.player.region);
  let bonus = (level - 1) * props.catalog.rules.levelYieldBonusBps;
  if (region?.bonusResource === resource) bonus += props.catalog.rules.regionBonusBps;
  return Math.floor((base * (10_000 + bonus)) / 10_000);
}

/** The first input a batch lacks at this level, if any. */
export function missingInput(props: GameProps, recipe: Recipe, level: number): string | undefined {
  return Object.entries(recipe.inputs).find(([r, q]) => have(props.view, r) < q * level)?.[0];
}

export interface WorkshopState {
  state: PlotState;
  /** Ready: units to collect. Idle: units a batch gives. */
  quantity?: number;
  /** The goods it gives, or the input it lacks. */
  resource?: string;
  /** Running: share of the batch under way done, and its time left. */
  progress?: number;
  left?: number;
  /** Batches done and batches of the job. */
  ready: number;
}

/** What a workshop asks for now: collect, wait, produce, or find an input. */
export function workshopState(props: GameProps, b: BuildingView): WorkshopState {
  const recipe = recipeOf(props, b.type);
  const ready = readyOf(b, props.now);
  if (!recipe) return { state: "still", ready };
  const [output, base = 0] = Object.entries(recipe.outputs)[0] ?? [];
  const job = b.job;
  if (job && ready > 0) {
    const perBatch = output ? outputQty(props, output, base * job.level, job.level) : 0;
    return { state: "ready", quantity: ready * perBatch, resource: output, ready };
  }
  if (job && ready < job.batches) {
    const startedBatch = job.startedAt + ready * job.batchMs;
    return {
      state: "running",
      progress: (props.now - startedBatch) / job.batchMs,
      left: startedBatch + job.batchMs - props.now,
      resource: output,
      ready,
    };
  }
  if (b.canStart > 0) {
    const quantity = output ? outputQty(props, output, base * b.level, b.level) : undefined;
    return { state: "idle", quantity, resource: output, ready };
  }
  return { state: "blocked", resource: missingInput(props, recipe, b.level), ready };
}

/** Minutes from now to the evening (21 h in Paris), or to the morning (8 h) once evening has come. */
export function untilRest(now: number): { minutes: number; night: boolean } {
  const parts = new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
    timeZone: "Europe/Paris",
  }).formatToParts(new Date(now));
  const part = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const at = part("hour") * 60 + part("minute");
  const night = at >= 20 * 60 || at < 8 * 60;
  const target = night ? (at < 8 * 60 ? 8 * 60 : 32 * 60) : 21 * 60;
  return { minutes: target - at, night };
}

/** The batches that keep a workshop busy until this evening (or the morning), one at least. */
export function eveningBatches(props: GameProps, b: BuildingView): number {
  const recipe = recipeOf(props, b.type);
  if (!recipe) return 1;
  const rest = untilRest(props.now);
  return Math.max(1, Math.min(b.canStart, Math.floor(rest.minutes / recipe.durationMinutes)));
}
