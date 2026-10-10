/**
 * Reference data for a historical theme: resources, regions, cities, buildings and recipes.
 * In production this lives in the `themes`, `resources` and `recipes` tables; the engine only
 * receives it as data.
 */

export type ResourceCode = string;
export type BuildingType = string;

export interface ResourceDef {
  code: ResourceCode;
  name: string;
  chain: string;
  tier: "raw" | "intermediate" | "finished";
}

export interface RegionDef {
  code: string;
  name: string;
  /** Raw resource that gets the regional yield bonus. */
  bonusResource: ResourceCode;
}

export interface CityDef {
  code: string;
  name: string;
}

export interface RecipeDef {
  code: string;
  building: BuildingType;
  inputs: Partial<Record<ResourceCode, number>>;
  outputs: Partial<Record<ResourceCode, number>>;
  durationMinutes: number;
}

export interface BuildingDef {
  type: BuildingType;
  name: string;
}

export interface Theme {
  code: string;
  name: string;
  resources: ResourceDef[];
  regions: RegionDef[];
  cities: CityDef[];
  buildings: BuildingDef[];
  recipes: RecipeDef[];
}

export function findRecipe(theme: Theme, code: string): RecipeDef | undefined {
  return theme.recipes.find((r) => r.code === code);
}

export function recipesFor(theme: Theme, building: BuildingType): RecipeDef[] {
  return theme.recipes.filter((r) => r.building === building);
}

export function findRegion(theme: Theme, code: string): RegionDef | undefined {
  return theme.regions.find((r) => r.code === code);
}
