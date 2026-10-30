/** The empire's view as `/api/empire` sends it (amounts in deniers, as strings). */

export interface EmpireJob {
  recipe: string;
  startedAt: number;
  batches: number;
  level: number;
  batchMs: number;
}

export interface EmpireWorkshop {
  id: string;
  type: string;
  recipe: string;
  level: number;
  job: EmpireJob | null;
}

export interface EmpireBuild {
  kind: "casa" | "newWorkshop" | "upgrade";
  level: number;
  workshopId?: string;
  workshopType?: string;
  recipe?: string;
  startedAt: number;
  endsAt: number;
}

export interface EmpireSite {
  level: number;
  cost: string;
  minutes: number;
  cutBps: number;
}

export interface CarnetObjective {
  kind: string;
  target: number;
  progress: number;
  claimed: boolean;
}

export interface EmpireView {
  house: {
    casa: number;
    joinedAt: number;
    lastActionAt: number;
    workshops: EmpireWorkshop[];
    builds: EmpireBuild[];
    favour: number;
    seals: number;
  };
  power: number;
  band: number;
  incomePerDay: string;
  asleep: boolean;
  nextCasa:
    | (EmpireSite & {
        materials: Record<string, number>;
        requirementMet: boolean;
        requires: { workshops: number; level: number };
        opens: string[];
      })
    | null;
  upgrades: Record<string, EmpireSite | null>;
  newWorkshop: EmpireSite | null;
  buildSlots: number;
  workshopSlots: number;
  carnet: {
    week: number;
    objectives: CarnetObjective[];
    carried: CarnetObjective[];
    windUntil: number | null;
  };
  away: { since: number; ready: Record<string, number>; sitesDone: number } | null;
}

export interface EmpireQuote {
  region: string;
  good: string;
  ref: string;
  price: string;
  asked: boolean;
  depthLeft: number;
  boardLeft: number;
}

export interface EmpireRecipe {
  code: string;
  inputs: Record<string, number>;
  outputs: Record<string, number>;
  minutes: number;
}

export interface EmpirePayload {
  kind: "empire";
  now: number;
  joined: boolean;
  view: EmpireView | null;
  cash: string;
  stock: Record<string, number>;
  market: EmpireQuote[];
  catalog: { type: string; name: string; recipes: EmpireRecipe[] }[];
  casa: { level: number; opens: string[] }[];
  goods: Record<string, string>;
}

export type EmpireAction =
  | { type: "empireBuildCasa" }
  | { type: "empireBuildWorkshop"; workshopType: string; recipe: string }
  | { type: "empireUpgrade"; workshopId: string }
  | { type: "empireRelaunch"; workshopId: string; recipe?: string }
  | { type: "empireRelaunchAll" }
  | { type: "empireSell"; good: string; qty: number }
  | { type: "empireDeliver"; good: string; qty: number }
  | { type: "empireClaim"; index: number };
