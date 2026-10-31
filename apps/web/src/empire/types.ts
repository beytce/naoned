import type { TerraAction } from "../game/types.js";

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
  region?: string;
  type: string;
  recipe: string;
  level: number;
  job: EmpireJob | null;
  fitted?: string[];
}

export interface EmpireBuild {
  kind: "casa" | "newWorkshop" | "upgrade" | "counter" | "ship";
  vehicleType?: string;
  region?: string;
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
    counters?: Record<string, number>;
    modules?: Record<string, number>;
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
  workshopSite: EmpireSite;
  buildSlots: number;
  workshopSlots: number;
  carnet: {
    week: number;
    objectives: CarnetObjective[];
    carried: CarnetObjective[];
    windUntil: number | null;
  };
  away: { since: number; ready: Record<string, number>; sitesDone: number } | null;
  regions: EmpireRegion[];
  map: EmpireMapView;
  vehicles: {
    shop: {
      type: string;
      casa: number;
      cost: string;
      capacity: number;
      regions: string[];
      speedBps: number;
      build: { minutes: number; materials: Record<string, number> } | null;
      slots: number;
      muda: boolean;
      /** The house's level of the model, and its next level's price (null at the last). */
      level: number;
      upgrade: string | null;
    }[];
    mine: { id: string; type: string; busyUntil: number; capacity: number; fitted?: string[] }[];
    voyages: EmpireVoyage[];
    haulPerDay: number;
  };
  research: {
    slots: number;
    running: { code: string; level: number; startedAt: number; endsAt: number }[];
    modules: {
      code: string;
      kind: string;
      effect: string;
      level: number;
      next: EmpireSite | null;
      plans: number;
    }[];
  };
  deposits: {
    id: string;
    region: string;
    good: string;
    stock: number;
    teams: number;
    mine: boolean;
  }[];
  teams: { max: number; used: number };
  workshopPlaces: Record<string, { slots: number; neighbourBps: number }>;
  courtLeft: number;
  identity: EmpireIdentity;
  muda: {
    next: number | null;
    bids: { vehicleId: string; amount: string }[];
    passes: { vehicleId: string; departure: number; until: number }[];
    last: { departure: number; places: number; reserve: string; prices: string[] } | null;
  };
  colleganze: {
    open: {
      id: string;
      traveller: string;
      mine: boolean;
      vehicleType: string;
      from: string;
      to: string;
      good: string;
      qty: number;
      target: string;
      staked: string;
      myStake: string;
      status: string;
      record: { voyages: number; returnBps: number } | null;
    }[];
    record: { voyages: number; returnBps: number } | null;
  };
  terra: {
    week: number;
    contesa: boolean;
    entry: Record<string, number>;
    placementUntil: number | null;
    theatre: {
      id: string;
      band: number;
      kind: string;
      members: number;
      companies: string[];
    } | null;
    roster: { week: number; members: string[] } | null;
    rosterUntil: number | null;
    nextContesa: boolean;
    honours: { trophies: number; lustre: number; blazon: string[] } | null;
    seals: number;
    best: string | null;
  };
  aid: {
    requests: { id: string; house: string; good: string; qty: number; at: number; value: string }[];
    merit: number;
    nextAskAt: number | null;
    lotMax: number;
    supplyLeft: string;
    seniorFrom: number | null;
  };
}

export interface KnowledgeNode {
  code: string;
  depth: number;
  effects: Record<string, number>;
  state: "learnt" | "learning" | "open" | "locked";
  cost: string;
  minutes: number;
}

export interface EmpireStaffMember {
  id: string;
  role: string;
  rarity: string;
  level: number;
  xp: number;
  skills: number[];
  placedAt?: string;
  family?: string;
  tiersOpen: number;
}

export interface EmpireIdentity {
  arte: {
    current: string | null;
    minor: string | null;
    options: { code: string; buildings: string[]; effects: Record<string, number> }[];
    fromCasa: number;
    minorFromCasa: number;
  };
  knowledge: {
    slots: number;
    learning: { code: string; startedAt: number; endsAt: number }[];
    branches: { code: string; nodes: KnowledgeNode[]; capstones: KnowledgeNode[] }[];
  };
  staff: {
    slots: number;
    hireCost: string;
    members: EmpireStaffMember[];
    roles: { role: string; place: string; paths: Record<string, number>[] }[];
  };
  family: {
    generation: number;
    heritage: number;
    lineage: string[];
    traits: { code: string; effects: Record<string, number> }[];
  };
}

export interface EmpireRegion {
  code: string;
  casa: number;
  corsairRiskBps: number;
  hoursFromVenice: number;
  workshopSlots: number;
  produces: string[];
  demands: string[];
  counter: number;
  buildingUntil: number | null;
  /** Its counter's next level (none before a counter stands there). */
  next: EmpireSite | null;
  /** A counter put down there next, once its Casa is reached. */
  postCost: string | null;
  /** Its cities found, and all of them. */
  cities: { found: number; all: number };
}

/** The map as the house sees it (the map at the centre, step 2). */
export interface EmpireMapView {
  cells: Record<string, { region: string; coast: boolean }>;
  revealed: string[];
  posts: { cell: string; region: string }[];
  sites: { kind: "post" | "arsenal" | "camp" | "depot"; cell: string; endsAt: number }[];
  arsenal: string | null;
  camp: string | null;
  cities: { code: string; cell: string; region: string }[];
  radius: number;
  arsenalSite: { cost: string; minutes: number; casa: number } | null;
  campSite: { cost: string; minutes: number; casa: number } | null;
  /** The Remise: where the land vehicles are bought and their models raised. */
  depot: string | null;
  depotSite: { cost: string; minutes: number; casa: number } | null;
}

export interface EmpireVoyage {
  id: string;
  house: string;
  vehicleId: string;
  good: string;
  qty: number;
  from: string;
  to: string;
  arrivesAt: number;
  cost: string;
}

export interface EmpireQuote {
  region: string;
  good: string;
  ref: string;
  price: string;
  asked: boolean;
  depthLeft: number;
  boardLeft: number;
  /** When the price was so: now with a counter there, earlier elsewhere. */
  asOf: number;
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
  | { type: "empireBuildWorkshop"; workshopType: string; recipe: string; region?: string }
  | { type: "empireUpgrade"; workshopId: string }
  | { type: "empireRelaunch"; workshopId: string; recipe?: string }
  | { type: "empireRelaunchAll" }
  | { type: "empireSell"; good: string; qty: number; region?: string }
  | { type: "empireDeliver"; good: string; qty: number; region?: string; city?: string }
  | { type: "empireClaim"; index: number }
  | { type: "empirePlaceCounter"; cell: string }
  | { type: "empireBuildArsenal"; cell: string }
  | { type: "empireBuildCamp"; cell: string }
  | { type: "empireBuildDepot"; cell: string }
  | { type: "empireUpgradeVehicle"; vehicleType: string }
  | { type: "empireUpgradeCounter"; region: string }
  | { type: "empireBuyVehicle"; vehicleType: string }
  | {
      type: "empireVoyage";
      vehicleId: string;
      from: string;
      to: string;
      good: string;
      qty: number;
      insured?: boolean;
    }
  | { type: "empireBuildShip"; vehicleType: string }
  | { type: "empireFitShip"; vehicleId: string; slot: number; module: string }
  | { type: "empireMudaBid"; vehicleId: string; amount: string }
  | {
      type: "empireColleganzaOpen";
      vehicleId: string;
      from: string;
      to: string;
      good: string;
      qty: number;
      target: string;
    }
  | { type: "empireColleganzaStake"; id: string; amount: string }
  | { type: "empireColleganzaWithdraw"; id: string }
  | { type: "empireColleganzaCancel"; id: string }
  | { type: "empireColleganzaSail"; id: string; insured?: boolean }
  | { type: "empireResearch"; module: string }
  | { type: "empireTeam"; depositId: string }
  | { type: "empireFit"; workshopId: string; slot: number; module: string }
  | { type: "empireCourt"; good: string; qty: number }
  | { type: "empireSwap"; a: string; b: string }
  | { type: "empireChooseArte"; arte: string; minor?: boolean }
  | { type: "empireLearn"; code: string }
  | { type: "empireHire"; role: string }
  | { type: "empirePlace"; staffId: string; at: string }
  | { type: "empireSkill"; staffId: string; path: number }
  | { type: "empireLineage"; trait: string }
  | { type: "empireAsk"; good: string; qty: number }
  | { type: "empireSupply"; requestId: string }
  | { type: "empireTerraJoin" }
  | { type: "empireTerra"; action: TerraAction };
