import type { WorldSettingsInput } from "../settings.js";

/** Default balancing for a Venice 1450 world. Amounts in deniers, rates in bps. */
/**
 * The Terraferma of the campaign, where its lands really are (on the drawn map of the Veneto,
 * 360 × 440, Lombardy beyond its western edge): the families' seats in the east (Feltre, Udine,
 * Piove di Sacco, Rovigo), Milan's five fortresses in the west, the six cities of the game and
 * the towns and villages between them. Neighbours by geography.
 */
const TERRAFERMA_LANDS: [string, string, number, number][] = [
  ["feltre", "seat", 224, 64],
  ["udine", "seat", 352, 64],
  ["piove", "seat", 252, 290],
  ["rovigo", "seat", 206, 346],
  ["bassano", "bourg", 196, 128],
  ["conegliano", "bourg", 296, 100],
  ["pordenone", "village", 338, 118],
  ["schio", "village", 132, 150],
  ["castelfranco", "village", 226, 172],
  ["mestre", "bourg", 278, 222],
  ["chioggia", "bourg", 292, 318],
  ["adria", "village", 258, 356],
  ["legnago", "bourg", 130, 300],
  ["peschiera", "bourg", 34, 214],
  ["vicenza", "city", 158, 192],
  ["treviso", "city", 270, 158],
  ["padova", "city", 218, 262],
  ["verona", "city", 70, 226],
  ["mantova", "city", 56, 344],
  ["ferrara", "city", 192, 396],
  ["brescia", "fortress", -40, 196],
  ["bergamo", "fortress", -96, 150],
  ["crema", "fortress", -104, 246],
  ["lodi", "fortress", -150, 206],
  ["cremona", "fortress", -46, 312],
];

const TERRAFERMA_ROADS: [string, string][] = [
  ["feltre", "bassano"],
  ["feltre", "conegliano"],
  ["udine", "pordenone"],
  ["udine", "conegliano"],
  ["piove", "mestre"],
  ["piove", "chioggia"],
  ["rovigo", "adria"],
  ["rovigo", "legnago"],
  ["bassano", "schio"],
  ["bassano", "vicenza"],
  ["bassano", "castelfranco"],
  ["bassano", "conegliano"],
  ["conegliano", "treviso"],
  ["conegliano", "pordenone"],
  ["pordenone", "treviso"],
  ["schio", "vicenza"],
  ["schio", "verona"],
  ["vicenza", "castelfranco"],
  ["vicenza", "padova"],
  ["vicenza", "verona"],
  ["vicenza", "legnago"],
  ["treviso", "castelfranco"],
  ["treviso", "mestre"],
  ["castelfranco", "padova"],
  ["castelfranco", "mestre"],
  ["mestre", "padova"],
  ["padova", "legnago"],
  ["chioggia", "adria"],
  ["adria", "ferrara"],
  ["legnago", "verona"],
  ["legnago", "mantova"],
  ["legnago", "ferrara"],
  ["ferrara", "mantova"],
  ["mantova", "verona"],
  ["mantova", "cremona"],
  ["mantova", "peschiera"],
  ["verona", "peschiera"],
  ["peschiera", "brescia"],
  ["brescia", "bergamo"],
  ["brescia", "crema"],
  ["brescia", "cremona"],
  ["bergamo", "crema"],
  ["bergamo", "lodi"],
  ["crema", "lodi"],
  ["crema", "cremona"],
  ["lodi", "cremona"],
];

const TERRAFERMA = TERRAFERMA_LANDS.map(([code, kind, x, y]) => ({
  code,
  kind,
  milan: kind === "fortress",
  ...(kind === "city" ? { city: code } : {}),
  neighbors: TERRAFERMA_ROADS.flatMap(([a, b]) => (a === code ? [b] : b === code ? [a] : [])),
  x,
  y,
}));

export const venice1450Settings: WorldSettingsInput = {
  // Seasons follow calendar months: the world says when it ends; 30 days is the nominal month
  // (simulator). Merchants may join until the last day.
  seasonDays: 30,
  // The weeks run from Monday to Sunday, Paris time: the Terraferma's game and the weekly ranking.
  weekStart: "monday",
  registrationClosesDay: 31,
  startingCapital: 100_000,
  startingBuildings: {
    terraferma: ["farm", "mill", "bakery"],
    lagoon: ["clay_pit", "brickworks"],
    dolomites: ["lumber_camp", "sawmill"],
  },
  marketTaxBps: 300,
  orderMaxHours: 72,
  maxOpenOrders: 10,
  instantOrderSlippageBps: 1_000,
  productionQueueMaxHours: 12,
  regionBonusBps: 3_000,
  lateJoiner: { afterDay: 5, bonusBps: 5_000, hours: 72 },
  tutorial: {
    minutes: 30,
    fastBatchSeconds: 30,
    fastBatchesPerBuilding: 1,
    welcomeTripSeconds: 45,
  },
  // Enough to deliver twice in the first minutes (the welcome order and another), and to feed
  // the workers: a new merchant plays at once.
  startingStock: {
    terraferma: { bread: 40, wood: 20 },
    lagoon: { bread: 20, wood: 20, clay: 20, bricks: 15 },
    dolomites: { bread: 20, wood: 30, planks: 15 },
  },
  // A newcomer's workers do not eat on their first day: the tutorial never costs bread.
  rations: { resource: "bread", perLevelPerDay: 2, slowdownBps: 5_000, graceHours: 24 },
  // Computer-run merchants fill the world up to this many active merchants (beta).
  bots: { population: 40 },
  // The galleys of the Muda: every three days at 9 h, a lot of goods from overseas sold by the
  // Dogana, up to 60 % dearer as it runs out, a few units per merchant and per arrival.
  muda: {
    everyDays: 3,
    hour: 9,
    lotPerActivePlayer: { spices: 1, silk: 1, furs: 1, cloth: 1, salt: 4, wine: 2 },
    quotaPerPlayer: { spices: 3, silk: 3, furs: 2, cloth: 2, salt: 10, wine: 6 },
    priceRiseBps: 6_000,
    maxStockLots: 2,
  },
  // Two orders of the Doge a day.
  contracts: {
    perDay: 2,
    premiumBps: 2_000,
    quantities: { wheat: 20, flour: 15, bread: 15, clay: 20, wood: 20, bricks: 8, planks: 8 },
    // One order in five asks for goods from overseas.
    luxury: {
      chanceBps: 2_000,
      quantities: { salt: 15, wine: 8, silk: 4, spices: 3, furs: 3, cloth: 2 },
    },
  },
  // The four great families: allegiance from day 2, for the season. A family smaller than the
  // average levies up to half as many lances again, a larger one down to a quarter less.
  families: {
    openDay: 2,
    list: [
      { code: "contarini", seat: "piove" },
      { code: "morosini", seat: "feltre" },
      { code: "mocenigo", seat: "rovigo" },
      { code: "dandolo", seat: "udine" },
    ],
    levyMinBps: 7_500,
    levyMaxBps: 15_000,
  },
  // The Terraferma after OpenFront (docs/plan-terraferme.md), in place of the families from the
  // season opened on 18 October 2026: the real Veneto of the drawn map
  // (Lombardy, Milan's, beyond its western edge; the sea, the lagoon and Lake Garda as water),
  // 25 cells a merchant, Milan in far Lombardy, the Alps in the north and the Po's marshes in the
  // south, fronts of a cell per half hour (an hour on free land), 8 h to 22 h; a merchant sets
  // down any day of the week (with more troops the later he comes), everyone safe until the first
  // day's end and a latecomer for 12 h; Milan rides every 2 open hours (docs/calibration.md).
  terraferma: {
    live: true,
    cellsPerActive: 25,
    minActive: 20,
    aspectBps: 16_000,
    milanBps: 1_800,
    cities: 0,
    geography: {
      box: { x0: -170, y0: 30, x1: 360, y1: 430 },
      water: [
        // The Adriatic, along the coast.
        [
          [360, 30],
          [360, 120],
          [340, 165],
          [342, 210],
          [338, 236],
          [330, 256],
          [319, 282],
          [322, 312],
          [326, 352],
          [316, 392],
          [309, 420],
          [312, 430],
          [360, 430],
        ],
        // The lagoon of Venice.
        [
          [326, 222],
          [308, 240],
          [307, 262],
          [306, 290],
          [300, 320],
          [290, 304],
          [284, 276],
          [284, 248],
          [302, 228],
        ],
        // Lake Garda.
        [
          [30, 130],
          [44, 152],
          [42, 190],
          [38, 210],
          [26, 206],
          [20, 178],
          [22, 150],
        ],
      ],
      cities: [
        { code: "verona", x: 70, y: 226 },
        { code: "vicenza", x: 158, y: 192 },
        { code: "padova", x: 218, y: 262 },
        { code: "treviso", x: 270, y: 158 },
        { code: "mantova", x: 56, y: 344 },
        { code: "ferrara", x: 192, y: 396 },
        { code: "brescia", x: -40, y: 196 },
        { code: "bergamo", x: -96, y: 150 },
        { code: "cremona", x: -46, y: 312 },
      ],
    },
    openHours: { from: 8, to: 22 },
    stepMinutes: 30,
    // The battle hour (recommendations of 20 October 2026): from 20 h to 21 h the fronts march a
    // step every 3 minutes, ten times as fast, for those who come to lead them.
    battle: { from: 20, to: 21, stepMinutes: 3, warnMinutes: 15 },
    // Soldiers and peasants: the plains grow wheat, the hills clay, the mountains wood, for the
    // counter; two cities or more joined to the capital earn 3 d each an open hour.
    peasants: {
      yields: {
        plain: { resource: "wheat", perCells: 4 },
        hill: { resource: "clay", perCells: 4 },
        mountain: { resource: "wood", perCells: 3 },
      },
      routeDucats: 300,
    },
    terrains: {
      plain: { defenseBps: 10_000, militia: 8 },
      hill: { defenseBps: 13_000, militia: 12 },
      marsh: { defenseBps: 15_000, militia: 18 },
      mountain: { defenseBps: 20_000, militia: 28 },
    },
    // From the north: the Alps, the hills at their foot, the plain, the Po's marshes.
    bands: [
      { untilBps: 2_000, weights: { mountain: 6, hill: 2, plain: 1 } },
      { untilBps: 3_500, weights: { hill: 5, plain: 3, mountain: 1 } },
      { untilBps: 7_500, weights: { plain: 7, hill: 1, marsh: 1 } },
      { untilBps: 10_000, weights: { plain: 4, marsh: 4 } },
    ],
    city: { militiaBps: 25_000, defenseBps: 15_000 },
    // Any day of the week: a latecomer still plays (playtest of 20 October).
    start: {
      minDistance: 2,
      troops: 40,
      troopsPerDay: 10,
      protectionHours: 12,
      placementHours: 0,
      truceHours: 24,
    },
    // The maximum of troops is raised by ducats only; the land recruits by the hour up to it.
    troops: {
      base: 60,
      perCell: 0,
      perCity: 0,
      regenBps: 400,
      regenMin: 1,
      recruit: { base: 6, perCell: 1, perCity: 3 },
    },
    buildings: {
      rocca: { price: 4_000, defenseBps: 16_000, perCells: 15 },
      // Ports on the lagoon, Lake Garda and the Adriatic: boats land on another shore, 10 min a
      // cell of water; a port's galleys sink 30 % of a landing on its water.
      porto: { price: 3_000, perCells: 10, guardBps: 3_000, minutesPerWater: 10 },
      // Bombards, the artillery of the 1450s (three years before Constantinople), and walls.
      bombarda: { price: 15_000, perCells: 25, range: 4, shotsPerDay: 1 },
      mura: { price: 5_000, perCells: 10, radius: 1 },
    },
    capRaise: { amount: 20, price: 10_000, perDay: 3 },
    // No limit set by the game: fronts march until their troops run out, capitals fall, Milan
    // preys on the weak rather than braking the leader.
    fronts: {
      max: 3,
      cellsPerStep: 1,
      minShareBps: 1_000,
      maxHours: 0,
      neutralEverySteps: 2,
      capitalSafe: false,
      peacefulSafe: true,
    },
    milan: {
      troops: 100,
      troopsPerActive: 3,
      regenBps: 900,
      everyHours: 2,
      shareBps: 3_000,
      target: "weakest",
    },
    // Skirmishes: a live match of 15 minutes, its time 60 times as fast (a step every 5 seconds),
    // 8 merchants and condottieri on 30 cells each. One ranked match a day, from 8 h to 22 h, with
    // two merchants at least: its ranks worth 45, 30, 20 then 10 glory (a merchant first every
    // day, 315 a week, stays under a tenth of a regular player's week); the others are friendly.
    skirmish: {
      minutes: 15,
      speed: 60,
      stepMinutes: 5,
      players: 8,
      cellsPerPlayer: 30,
      lobbySeconds: 60,
      troops: 60,
      recruit: { base: 60, perCell: 6, perCity: 12 },
      glory: [45, 30, 20, 10],
      rankedPerDay: 1,
      minHumans: 2,
    },
    // The third week of the month in teams, by region.
    teams: { weeks: [2] },
    // Diplomacy: a signal each 5 minutes, up to 50 d a day to one's allies, an embargo from the
    // cities one holds that cuts 20 % of what they pay the rival.
    diplomacy: { ducatGiftPerDay: 5_000, embargoBps: 2_000, signalMinutes: 5 },
    // The other powers of 1450 (recommendations of 20 October 2026): the Gonzaga hold Mantua and
    // strike back at whoever attacks them, the Este of Ferrara fall on the weak, the Patriarch of
    // Aquileia spreads slowly in the north-east, the Empire raids from the Alps.
    nations: [
      {
        id: "mantova",
        city: "mantova",
        radius: 1,
        troops: 120,
        troopsPerActive: 2,
        regenBps: 800,
        everyHours: 3,
        shareBps: 3_000,
        behavior: "defensive",
      },
      {
        id: "ferrara",
        city: "ferrara",
        radius: 1,
        troops: 100,
        troopsPerActive: 2,
        regenBps: 800,
        everyHours: 3,
        shareBps: 3_000,
        behavior: "opportunist",
      },
      {
        id: "aquileia",
        atBps: { x: 9_200, y: 800 },
        radius: 1,
        troops: 80,
        troopsPerActive: 1,
        regenBps: 600,
        everyHours: 4,
        shareBps: 2_000,
        behavior: "slow",
      },
      {
        id: "impero",
        atBps: { x: 4_500, y: 0 },
        radius: 1,
        troops: 150,
        troopsPerActive: 2,
        regenBps: 600,
        everyHours: 6,
        shareBps: 2_500,
        behavior: "raider",
      },
    ],
    glory: { perCell: 1, perCity: 3 },
  },
  // The week's campaign: the Terraferma where its lands really are (seats in the east, Milan in the
  // middle), lances levied 2 an hour from 8 h to 22 h (24 waiting at most) or engaged for ducats
  // (20 at 1 d, 20 at 2 d a day), leaving after 48 h; Milan rides every 4 open hours.
  campaign: {
    lands: TERRAFERMA,
    kinds: {
      seat: { glory: 0, defenseBps: 10_000, militia: 0, militiaPerActive: 0 },
      village: { glory: 1, defenseBps: 10_000, militia: 3, militiaPerActive: 1 },
      bourg: { glory: 2, defenseBps: 12_000, militia: 5, militiaPerActive: 1 },
      city: { glory: 3, defenseBps: 15_000, militia: 6, militiaPerActive: 2 },
      fortress: { glory: 4, defenseBps: 20_000, militia: 10, militiaPerActive: 2 },
    },
    openHours: { from: 8, to: 22 },
    levy: { perHour: 2, max: 24 },
    hire: [
      { count: 20, price: 100 },
      { count: 20, price: 200 },
    ],
    lanceHours: 48,
    march: { baseMinutes: 20, perHopMinutes: 10 },
    milan: { everyHours: 4, warningMinutes: 30, base: 10, perActive: 2, leadBonusBps: 10_000 },
    garrisonLancesPerPoint: 10,
    // Works on the lands held: the rocca holds, the campo brings the marches nearer, the dogana
    // makes a rich land pay; two a family, one more per five active members; razed when taken.
    works: {
      kinds: {
        rocca: { price: 4_000, defenseBonusBps: 6_000 },
        campo: { price: 3_000, staging: true },
        dogana: { price: 5_000, gloryBonusBps: 5_000 },
      },
      buildMinutes: 120,
      perFamily: 2,
      perMembers: 5,
      razeMerit: 10,
    },
  },
  // Laws and decrees: the family that wins the week imposes two of them on the next one.
  decrees: {
    catalog: ["fondaco", "gabelle", "faveur", "peage", "levant", "calmiere"],
    perWinner: 2,
    maxVoteBps: 2_500,
    defaults: [{ code: "fondaco" }, { code: "faveur", target: "venezia" }, { code: "levant" }],
    fondaco: { taxBps: 100, quotaBps: 5_000 },
    gabelle: { extraTaxBps: 400 },
    faveur: { premiumBps: 1_000, reservedMinutes: 30 },
    peage: { tollBps: 300 },
    levant: { memberQuotaBps: 5_000, othersCutBps: 2_500 },
    calmiere: { capBps: 11_500 },
  },
  events: {
    everyDays: 2,
    durationHours: 24,
    catalog: [
      {
        code: "famine_verona",
        weight: 2,
        city: "verona",
        cityPriceBps: { bread: 16_000 },
        cityCapacityBps: { bread: 20_000 },
      },
      {
        code: "fire_venezia",
        weight: 2,
        city: "venezia",
        cityPriceBps: { bricks: 15_000, planks: 15_000 },
        cityCapacityBps: { bricks: 20_000, planks: 20_000 },
      },
      {
        code: "storm",
        weight: 2,
        cityPriceBps: { planks: 13_000, spices: 13_000, silk: 13_000 },
        yieldBps: { wood: -3_000 },
      },
      { code: "harvest", weight: 2, cityPriceBps: { bread: 9_000 }, yieldBps: { wheat: 3_000 } },
      {
        code: "sensa_fair",
        weight: 1,
        cityPriceBps: {
          bread: 11_000,
          bricks: 11_000,
          planks: 11_000,
          spices: 12_000,
          silk: 12_000,
        },
        cityCapacityBps: {
          bread: 15_000,
          bricks: 15_000,
          planks: 15_000,
          spices: 20_000,
          silk: 20_000,
        },
      },
    ],
  },
  // Left alone for 24 h, a counting house's workers do not starve: a returning player finds it
  // intact.
  dormancy: { afterHours: 24 },
  advice: { glutHours: 24 },
  // The merchant's ledger: one or two short goals a day for the first week.
  missions: [
    {
      id: "first_delivery",
      day: 0,
      event: "delivery_arrived",
      count: 1,
      reward: { goods: { bread: 10, wood: 5 } },
    },
    {
      id: "three_deliveries",
      day: 1,
      event: "delivery_arrived",
      count: 3,
      reward: { goods: {}, vehicles: ["cart"] },
    },
    {
      id: "first_contract",
      day: 0,
      event: "contract_fulfilled",
      count: 1,
      reward: { goods: { bread: 10 } },
    },
    {
      id: "first_offer",
      day: 1,
      event: "order_placed",
      count: 1,
      filter: { kind: "limit" },
      reward: { goods: { bricks: 5, planks: 5 } },
    },
    {
      id: "offer_taken",
      day: 1,
      event: "order_filled",
      count: 1,
      reward: { goods: {}, ducats: 5_000 },
    },
    {
      id: "first_upgrade",
      day: 3,
      event: "upgrade",
      count: 1,
      reward: { goods: { bricks: 10, planks: 10 } },
    },
    {
      id: "five_contracts",
      day: 4,
      event: "contract_fulfilled",
      count: 5,
      reward: { goods: {}, ducats: 10_000 },
    },
    {
      id: "first_vehicle",
      day: 3,
      event: "vehicle_bought",
      count: 1,
      reward: { goods: {}, ducats: 3_000 },
    },
    {
      id: "three_upgrades",
      day: 4,
      event: "upgrade",
      count: 3,
      reward: { goods: {}, ducats: 10_000 },
    },
    {
      id: "first_palace",
      day: 8,
      event: "build",
      filter: { type: "palazzo" },
      count: 1,
      reward: { goods: {}, ducats: 15_000 },
    },
    { id: "new_workshop", day: 7, event: "build", count: 1, reward: { goods: {}, ducats: 15_000 } },
  ],
  // Deliveries by road (docs/plan-livraisons.md): a board of 10 to 15 personal orders a day,
  // carried to the cities with one's own vehicles and paid on arrival. They replace the instant
  // sale to cities and the Criées.
  deliveries: {
    // The fattore (recommendations of 20 October 2026): a vehicle left two hours at the counter
    // leaves with the best order the stock covers, twice a day, 15 % of its pay as commission.
    fattore: { perDay: 2, idleMinutes: 120, commissionBps: 1_500, activeHours: 24 },
    ordersPerDay: { min: 22, max: 28 },
    dogeOrdersPerDay: 2,
    urgentPerDay: 2,
    urgentPremiumBps: 1_500,
    urgentOpenMinutes: 180,
    urgentHours: { from: 8, to: 21 },
    // Vehicles carry several orders at once: city orders at +10 %, +30 % per hour of road.
    cityPriceBps: 11_000,
    distanceBonusBpsPerHour: 3_000,
    // City prices follow the Rialto: 70 % yesterday's traded price, 30 % the reference, between
    // 60 % and 150 % of the reference.
    marketIndex: { weightBps: 7_000, floorBps: 6_000, capBps: 15_000 },
    // One or two batches of a workshop: an order is within reach of a session or two.
    quantity: {
      bread: [8, 20],
      bricks: [4, 10],
      planks: [4, 10],
      wheat: [10, 25],
      flour: [8, 18],
      clay: [10, 25],
      wood: [10, 25],
      // Goods from overseas, brought by the galleys of the Muda.
      spices: [2, 4],
      silk: [2, 4],
      furs: [1, 3],
      cloth: [1, 3],
      salt: [5, 12],
      wine: [3, 8],
      // The luxury chains: asked only of those who make them.
      mirrors: [2, 6],
      garments: [2, 6],
      prepared_spices: [1, 4],
    },
    // One city order in thirteen asks for goods from overseas.
    weights: {
      bread: 10,
      bricks: 10,
      planks: 10,
      wheat: 10,
      flour: 10,
      clay: 10,
      wood: 10,
      spices: 1,
      silk: 1,
      furs: 1,
      cloth: 1,
      salt: 1,
      wine: 1,
      mirrors: 3,
      garments: 3,
      prepared_spices: 2,
    },
    // Elastic demand: a good at 80 % of its reference at the Rialto is ordered half as often again,
    // and the board grows with the average (up to twice its size).
    elasticityBps: 20_000,
    elasticMaxBps: 20_000,
    // Half the city orders are for the merchant's own chain, the rest for the others' goods.
    homeShareBps: 5_000,
    // On a market event day, three city orders go where the event asks for more.
    eventOrdersPerDay: 3,
    // Shared demand: the cities' orders form one board for the world, first come first served
    // (four city orders per active merchant: vehicles fill up with several of them).
    sharedOrdersPerActivePlayer: 4,
    // In waves: new city orders every 4 hours, each open 8 hours, rather than all at midnight.
    waves: { everyHours: 4, openHours: 8 },
    // The first delivery is felt: 150 ducats, about a seventh of the starting capital. The
    // Terraferma delivers its first batch of wheat, never the bread its workers eat.
    welcome: {
      terraferma: { resource: "wheat", quantity: 10, reward: 15_000 },
      lagoon: { resource: "bricks", quantity: 8, reward: 15_000 },
      dolomites: { resource: "planks", quantity: 8, reward: 15_000 },
    },
    routes: {
      terraferma: {
        padova: 30,
        verona: 45,
        vicenza: 25,
        mantova: 60,
        venezia: 75,
        treviso: 70,
        ferrara: 80,
      },
      lagoon: {
        venezia: 20,
        treviso: 40,
        padova: 45,
        ferrara: 70,
        vicenza: 70,
        verona: 90,
        mantova: 100,
      },
      dolomites: {
        treviso: 45,
        vicenza: 50,
        verona: 60,
        venezia: 90,
        padova: 75,
        mantova: 100,
        ferrara: 110,
      },
    },
    maxDeliveryMinutes: 120,
    // A vehicle carries up to four orders together, all for the same city.
    maxOrdersPerLoad: 4,
    // Bought, a vehicle is always a mule; three upgrades for ducats (destroyed), made at home, make
    // it carry more and go faster. The costs of the upper steps value the vehicles won.
    vehicles: {
      mule: {
        costDucats: 8_000,
        costMaterials: {},
        capacity: 25,
        speedBps: 7_500,
        upgrade: { to: "cart", costDucats: 8_000 },
      },
      cart: {
        costDucats: 15_000,
        costMaterials: { planks: 10 },
        capacity: 40,
        speedBps: 10_000,
        upgrade: { to: "wagon", costDucats: 16_000 },
      },
      wagon: {
        costDucats: 30_000,
        costMaterials: { planks: 25 },
        capacity: 90,
        speedBps: 13_000,
        upgrade: { to: "great_wagon", costDucats: 32_000 },
      },
      great_wagon: {
        costDucats: 64_000,
        costMaterials: {},
        capacity: 150,
        speedBps: 16_000,
      },
    },
    forSale: ["mule"],
    // Two mules: two orders on the road from the first day, to be upgraded.
    startingVehicles: ["mule", "mule"],
    maxVehicles: 4,
  },
  // Fresh produce: a batch collected within 30 minutes of being done yields 5 % more.
  fresh: { minutes: 120, bonusBps: 500 },
  // The Criées of the Rialto are replaced by urgent deliveries (off; kept for older worlds:
  // three times a day between 8 h and 22 h, bread, bricks or planks 10 to 20 % above reference).
  criees: {
    perDay: 0,
    fromHour: 8,
    toHour: 22,
    minutes: 20,
    minPremiumBps: 1_000,
    maxPremiumBps: 2_000,
    perPlayer: 6,
    perActivePlayer: 4,
    minTotal: 24,
    resources: ["bread", "bricks", "planks"],
  },
  // Tasks of the day: three drawn from this pool, the same for everyone; doing all three opens a
  // chest of 10 ducats, 3 more for each day in a row, up to 22 (five days running).
  daily: {
    perDay: 3,
    tasks: [
      { id: "deliveries", event: "delivery_arrived", count: 2, reward: { goods: { bread: 10 } } },
      {
        id: "doge_order",
        event: "contract_fulfilled",
        count: 1,
        reward: { goods: { bricks: 5, planks: 5 } },
      },
      {
        id: "place_offer",
        event: "order_placed",
        count: 1,
        filter: { kind: "limit" },
        reward: { goods: { bread: 10 } },
      },
      { id: "harvests", event: "harvest", count: 4, reward: { goods: {}, ducats: 1_000 } },
      {
        id: "many_deliveries",
        event: "delivery_arrived",
        count: 5,
        reward: { goods: {}, ducats: 1_500 },
      },
      {
        id: "urgent",
        event: "delivery_arrived",
        filter: { kind: "urgent" },
        count: 1,
        reward: { goods: {}, ducats: 1_000 },
      },
    ],
    chest: { ducats: 1_000, perStreakDay: 300, maxStreak: 5 },
  },
  // Faraj's bales: one every six hours, two kept at most, three cards of one to five units.
  // Rarity follows value; a bale is worth about 7.5 ducats on average (docs/calibration.md).
  // Per card: common 74 %, uncommon 19.5 %, rare 5 %, epic 1.25 %, legendary 0.25 % (about one
  // a season for a merchant who opens three or four a day).
  bales: {
    intervalHours: 6,
    maxStored: 2,
    onJoin: 1,
    cardsPerBale: 3,
    ownRegionWeightBps: 5_000,
    rarities: [
      {
        code: "common",
        weight: 7_400,
        resources: ["wheat", "clay", "wood"],
        quantityWeights: [55, 25, 10, 6, 4],
      },
      {
        code: "uncommon",
        weight: 1_950,
        resources: ["flour", "bread", "bricks", "planks"],
        quantityWeights: [65, 20, 9, 4, 2],
      },
      {
        code: "rare",
        weight: 500,
        resources: ["salt", "wine"],
        quantityWeights: [75, 15, 6, 3, 1],
      },
      {
        code: "epic",
        weight: 125,
        resources: ["spices", "furs"],
        quantityWeights: [850, 100, 30, 15, 5],
      },
      {
        code: "legendary",
        weight: 25,
        resources: ["silk", "cloth"],
        quantityWeights: [900, 70, 20, 8, 2],
      },
    ],
  },
  // Offers between players: from a quarter to four times the reference price.
  priceBand: { minBps: 2_500, maxBps: 40_000 },
  // Pass Négociant: information to read and cosmetics only (live-2, 21 October 2026). The four
  // perks that sold production, the Dogana's quota, open offers and the swapped Doge's order
  // (contractRerollsPerDay) are zero, and the schema refuses them otherwise.
  // The Pass Négociant is off until it comes back (announced for the next season): nobody holds
  // it, nothing grants it.
  pass: {
    enabled: false,
    marketMakerQuotaBps: 0,
    extraOpenOrders: 0,
    freshBonusBps: 0,
    contractRerollsPerDay: 0,
    perks: { history30Days: true, dashboardDetail: true, deepBook: true, cosmetics: true },
  },
  // Raw materials are local: wheat grows in the Terraferma, clay lies in the Lagoon, wood in the
  // Dolomites. Workshops that transform can be built anywhere.
  buildingRegions: {
    farm: ["terraferma"],
    clay_pit: ["lagoon"],
    lumber_camp: ["dolomites"],
  },
  // Specialising pays: +25 % yield per level above the first (a level 5 workshop: × 2).
  levelYieldBonusBps: 2_500,
  maxBuildings: 12,
  maxBuildingLevel: 5,
  // Each level costs 35 % of the first more (it adds more than that with the yield bonus): an
  // upgrade is a better buy than a new workshop, so houses grow in depth.
  levelCostGrowthBps: 3_500,
  // The season in four acts, one a week (the last runs to the end of the month).
  acts: [
    { code: "installation", week: 0, variants: [] },
    {
      code: "crisis",
      week: 1,
      variants: [
        {
          code: "chioggia",
          weight: 1,
          city: "venezia",
          cityPriceBps: { bricks: 13_000, planks: 13_000 },
          cityCapacityBps: { bricks: 15_000, planks: 15_000 },
        },
        {
          code: "plague",
          weight: 1,
          cityPriceBps: { bread: 13_000, flour: 12_000 },
          cityCapacityBps: { bread: 15_000 },
        },
        {
          code: "embargo",
          weight: 1,
          cityPriceBps: {
            salt: 15_000,
            wine: 15_000,
            spices: 16_000,
            silk: 16_000,
            furs: 16_000,
            cloth: 16_000,
          },
        },
      ],
    },
    // The war of Lombardy: Milan's garrisons and rides half as strong again.
    { code: "lombardy", week: 2, variants: [], milanBps: 15_000 },
    {
      code: "sensa",
      week: 3,
      variants: [
        {
          code: "sensa",
          weight: 1,
          cityPriceBps: {
            bread: 11_500,
            bricks: 11_500,
            planks: 11_500,
            flour: 11_500,
            wheat: 11_500,
            clay: 11_500,
            wood: 11_500,
          },
          cityCapacityBps: { bread: 15_000, bricks: 15_000, planks: 15_000 },
        },
      ],
    },
  ],
  // Masteries: chosen once the house's workshops add up to 5 levels, for the whole season.
  specialties: {
    unlockLevels: 5,
    options: {
      master: { transformYieldBps: 1_500 },
      carter: { vehicleSpeedBps: 2_500, extraVehicles: 1 },
      trader: { marketMakerQuotaBps: 2_500, taxDiscountBps: 200, extraOpenOrders: 3 },
      // Marchand du Levant: half as much again at the galleys of the Muda.
      levant: { mudaQuotaBps: 5_000 },
    },
  },
  // Level 2 asks half the materials: a first upgrade within reach in the first days.
  upgradeMaterialsBps: { "2": 5_000 },
  activeWindowHours: 72,
  // A month to grow: buildings cost 30 % fewer ducats and 25 % fewer materials than in the
  // six-week seasons. The Terraferma's ducats are the sink of money since the upkeep is gone
  // (the 40 % added to buildings meanwhile taken back at its opening, see docs/calibration.md).
  buildings: {
    farm: { costDucats: 21_000, costMaterials: { bricks: 15, planks: 15 } },
    clay_pit: {
      costDucats: 21_000,
      costMaterials: { bricks: 15, planks: 15 },
    },
    lumber_camp: {
      costDucats: 21_000,
      costMaterials: { bricks: 15, planks: 15 },
    },
    mill: { costDucats: 28_000, costMaterials: { bricks: 25, planks: 25 } },
    bakery: { costDucats: 42_000, costMaterials: { bricks: 30, planks: 30 } },
    brickworks: {
      costDucats: 35_000,
      costMaterials: { bricks: 15, planks: 30 },
    },
    sawmill: { costDucats: 35_000, costMaterials: { bricks: 30, planks: 15 } },
    // Prestige sink: produces nothing, counts at cost in the ranking.
    palazzo: { costDucats: 56_000, costMaterials: { bricks: 30, planks: 30 } },
    // The luxury chains, opened by the titles (see `unlocks`).
    sand_pit: { costDucats: 21_000, costMaterials: { bricks: 15, planks: 15 } },
    glassworks: { costDucats: 42_000, costMaterials: { bricks: 40, planks: 20 } },
    mirrorworks: { costDucats: 56_000, costMaterials: { bricks: 30, planks: 40 } },
    sheepfold: { costDucats: 28_000, costMaterials: { bricks: 15, planks: 25 } },
    loom: { costDucats: 49_000, costMaterials: { bricks: 25, planks: 40 } },
    tailor: { costDucats: 63_000, costMaterials: { bricks: 30, planks: 40 } },
    spicery: { costDucats: 70_000, costMaterials: { bricks: 40, planks: 40 } },
  },
  // Deals between merchants (recommendations of 20 October 2026): commissions open three days at
  // most; the colleganza a week at most, the investor taking at most three quarters of the gains
  // (the share of the Venetian stans).
  commissions: { maxDays: 3 },
  // The Bank's loans (recommendations of 20 October 2026): up to 30 % of the net worth and 500
  // ducats, a week at most, 1 % a day; 20 % more on what is missing at term.
  loans: {
    maxShareBps: 3_000,
    maxAmount: 50_000,
    interestBpsPerDay: 100,
    maxDays: 7,
    lateBps: 2_000,
  },
  colleganza: { maxDays: 7, maxShareBps: 7_500 },
  // The manufactures (recommendations of 20 October 2026): past level 5, a workshop climbs to 10
  // from Négociant (3 000 ducats of net sales) on a path chosen once: volume (bigger batches) or
  // quality (the same batches, the cities paying its goods 4 % more per level, 20 % at 10).
  manufacture: { maxLevel: 10, qualityBpsPerLevel: 400, unlock: 300_000 },
  // The luxury chains (recommendations of 20 October 2026), opened by the merchant titles: the
  // glass of Murano at Marchand (1 500 ducats of net sales), the drapery at Négociant (3 000),
  // the prepared spices at Armateur (5 000).
  unlocks: {
    sand_pit: 150_000,
    glassworks: 150_000,
    mirrorworks: 150_000,
    sheepfold: 300_000,
    loom: 300_000,
    tailor: 300_000,
    spicery: 500_000,
  },
  referencePrices: {
    wheat: 100,
    flour: 160,
    bread: 180,
    clay: 100,
    bricks: 220,
    wood: 100,
    planks: 220,
    spices: 1_500,
    silk: 1_200,
    salt: 300,
    wine: 600,
    furs: 1_400,
    cloth: 1_800,
    sand: 100,
    glass: 350,
    mirrors: 1_200,
    wool: 120,
    drape: 400,
    garments: 1_300,
    prepared_spices: 2_600,
  },
  marketMaker: {
    spreadStartBps: 400,
    spreadEndBps: 2_000,
    spreadRampDays: 10,
    referenceFloorBps: 5_000,
    dailyDepthPerPlayer: {
      wheat: 2,
      flour: 2,
      bread: 2,
      clay: 2,
      bricks: 2,
      wood: 2,
      planks: 2,
    },
    minDailyDepth: {
      wheat: 40,
      flour: 40,
      bread: 40,
      clay: 40,
      bricks: 40,
      wood: 40,
      planks: 40,
    },
    // The Dogana is a safety net, not a market: each merchant may buy 10 and sell 5 units a day per
    // resource there; as the world fills, quotas shrink to share 250 units a day. Trade is between
    // merchants, at the Rialto.
    playerDailyQuota: {
      wheat: 10,
      flour: 10,
      bread: 10,
      clay: 10,
      bricks: 10,
      wood: 10,
      planks: 10,
    },
    playerDailySellQuota: {
      wheat: 5,
      flour: 5,
      bread: 5,
      clay: 5,
      bricks: 5,
      wood: 5,
      planks: 5,
    },
    maxDailyDepth: {
      wheat: 250,
      flour: 250,
      bread: 250,
      clay: 250,
      bricks: 250,
      wood: 250,
      planks: 250,
    },
    // Supply and demand: the Dogana's price moves up to 6 % a day with what merchants bought from
    // it less what they sold it, and comes back a quarter of the way to the reference each day:
    // steady selling holds it near 76 % of the reference, steady buying near 124 %.
    drift: { stepBps: 600, minBps: 6_000, maxBps: 15_000, revertBps: 2_500 },
  },
  // Seven cities share the demand of the three first ones (bread 130, bricks 35, planks 35 per
  // active merchant and per day); the new ones also buy raw goods. With deliveries by road, the
  // demand says which city orders what (the instant sale is closed).
  cities: {
    venezia: {
      bread: { basePrice: 220, dailyCapacityPerPlayer: 30, maxDropBps: 5_000 },
      bricks: { basePrice: 260, dailyCapacityPerPlayer: 9, maxDropBps: 5_000 },
      planks: { basePrice: 260, dailyCapacityPerPlayer: 9, maxDropBps: 5_000 },
      spices: { basePrice: 1_700, dailyCapacityPerPlayer: 4, maxDropBps: 5_000 },
      silk: { basePrice: 1_400, dailyCapacityPerPlayer: 4, maxDropBps: 5_000 },
      salt: { basePrice: 340, dailyCapacityPerPlayer: 12, maxDropBps: 5_000 },
      wine: { basePrice: 680, dailyCapacityPerPlayer: 6, maxDropBps: 5_000 },
      furs: { basePrice: 1_600, dailyCapacityPerPlayer: 2, maxDropBps: 5_000 },
      cloth: { basePrice: 2_050, dailyCapacityPerPlayer: 2, maxDropBps: 5_000 },
      mirrors: { basePrice: 1_400, dailyCapacityPerPlayer: 3, maxDropBps: 5_000 },
      garments: { basePrice: 1_500, dailyCapacityPerPlayer: 3, maxDropBps: 5_000 },
      prepared_spices: { basePrice: 3_000, dailyCapacityPerPlayer: 2, maxDropBps: 5_000 },
    },
    padova: {
      bread: { basePrice: 210, dailyCapacityPerPlayer: 20, maxDropBps: 5_000 },
      bricks: { basePrice: 250, dailyCapacityPerPlayer: 5, maxDropBps: 5_000 },
      planks: { basePrice: 250, dailyCapacityPerPlayer: 5, maxDropBps: 5_000 },
      silk: { basePrice: 1_350, dailyCapacityPerPlayer: 3, maxDropBps: 5_000 },
      wine: { basePrice: 670, dailyCapacityPerPlayer: 5, maxDropBps: 5_000 },
      cloth: { basePrice: 2_000, dailyCapacityPerPlayer: 2, maxDropBps: 5_000 },
      mirrors: { basePrice: 1_350, dailyCapacityPerPlayer: 3, maxDropBps: 5_000 },
      garments: { basePrice: 1_450, dailyCapacityPerPlayer: 3, maxDropBps: 5_000 },
      prepared_spices: { basePrice: 2_900, dailyCapacityPerPlayer: 2, maxDropBps: 5_000 },
    },
    verona: {
      bread: { basePrice: 200, dailyCapacityPerPlayer: 20, maxDropBps: 5_000 },
      bricks: { basePrice: 240, dailyCapacityPerPlayer: 5, maxDropBps: 5_000 },
      planks: { basePrice: 240, dailyCapacityPerPlayer: 5, maxDropBps: 5_000 },
      spices: { basePrice: 1_650, dailyCapacityPerPlayer: 3, maxDropBps: 5_000 },
      salt: { basePrice: 330, dailyCapacityPerPlayer: 10, maxDropBps: 5_000 },
      furs: { basePrice: 1_550, dailyCapacityPerPlayer: 2, maxDropBps: 5_000 },
      mirrors: { basePrice: 1_350, dailyCapacityPerPlayer: 3, maxDropBps: 5_000 },
      garments: { basePrice: 1_450, dailyCapacityPerPlayer: 3, maxDropBps: 5_000 },
      prepared_spices: { basePrice: 2_900, dailyCapacityPerPlayer: 2, maxDropBps: 5_000 },
    },
    vicenza: {
      bread: { basePrice: 200, dailyCapacityPerPlayer: 20, maxDropBps: 5_000 },
      bricks: { basePrice: 240, dailyCapacityPerPlayer: 4, maxDropBps: 5_000 },
      planks: { basePrice: 240, dailyCapacityPerPlayer: 4, maxDropBps: 5_000 },
      wheat: { basePrice: 110, dailyCapacityPerPlayer: 10, maxDropBps: 5_000 },
      wood: { basePrice: 110, dailyCapacityPerPlayer: 10, maxDropBps: 5_000 },
    },
    treviso: {
      bread: { basePrice: 200, dailyCapacityPerPlayer: 15, maxDropBps: 5_000 },
      bricks: { basePrice: 240, dailyCapacityPerPlayer: 4, maxDropBps: 5_000 },
      planks: { basePrice: 240, dailyCapacityPerPlayer: 4, maxDropBps: 5_000 },
      clay: { basePrice: 110, dailyCapacityPerPlayer: 10, maxDropBps: 5_000 },
      flour: { basePrice: 175, dailyCapacityPerPlayer: 10, maxDropBps: 5_000 },
    },
    mantova: {
      bread: { basePrice: 200, dailyCapacityPerPlayer: 15, maxDropBps: 5_000 },
      bricks: { basePrice: 240, dailyCapacityPerPlayer: 4, maxDropBps: 5_000 },
      planks: { basePrice: 240, dailyCapacityPerPlayer: 4, maxDropBps: 5_000 },
      wheat: { basePrice: 110, dailyCapacityPerPlayer: 10, maxDropBps: 5_000 },
      flour: { basePrice: 175, dailyCapacityPerPlayer: 10, maxDropBps: 5_000 },
    },
    ferrara: {
      bread: { basePrice: 200, dailyCapacityPerPlayer: 10, maxDropBps: 5_000 },
      bricks: { basePrice: 240, dailyCapacityPerPlayer: 4, maxDropBps: 5_000 },
      planks: { basePrice: 240, dailyCapacityPerPlayer: 4, maxDropBps: 5_000 },
      clay: { basePrice: 110, dailyCapacityPerPlayer: 10, maxDropBps: 5_000 },
      wood: { basePrice: 110, dailyCapacityPerPlayer: 10, maxDropBps: 5_000 },
    },
  },
  // The house between seasons (docs/plan-progression.md): Influence, the game's premium coin,
  // kept from season to season. Earned only by the house's missions (ten every three and a half
  // days, about 3 each), spent on privileges, rushed deliveries, troops and a few comforts.
  house: {
    missions: {
      everyHours: 84,
      perBoard: 10,
      pool: [
        { id: "deliveries", event: "delivery_arrived", count: 10, influence: 3 },
        { id: "many_deliveries", event: "delivery_arrived", count: 25, influence: 5 },
        {
          id: "urgent",
          event: "delivery_arrived",
          filter: { kind: "urgent" },
          count: 2,
          influence: 4,
        },
        { id: "doge", event: "contract_fulfilled", count: 3, influence: 4 },
        { id: "offers", event: "order_placed", filter: { kind: "limit" }, count: 3, influence: 2 },
        { id: "rialto", event: "order_filled", count: 5, influence: 3 },
        { id: "harvests", event: "harvest", count: 20, influence: 2 },
        { id: "upgrade", event: "upgrade", count: 1, influence: 4 },
        { id: "build", event: "build", count: 1, influence: 3 },
        { id: "vehicle", event: "vehicle_upgraded", count: 1, influence: 3 },
        { id: "chests", event: "daily_chest", count: 2, influence: 3 },
        { id: "bales", event: "bale_opened", count: 4, influence: 2 },
        // The Terraferma's, optional: two at most on a board, so that a pure merchant always has
        // eight of trade (24 October 2026: five missions of the old campaign could not be done).
        { id: "terra_place", event: "terra_placed", group: "terra", count: 1, influence: 2 },
        {
          id: "terra_cells",
          event: "terra_cells_taken",
          sum: "count",
          group: "terra",
          count: 15,
          influence: 3,
        },
        {
          id: "terra_city",
          event: "terra_cells_taken",
          sum: "cities",
          group: "terra",
          count: 1,
          influence: 4,
        },
        {
          id: "terra_rocca",
          event: "terra_built",
          filter: { kind: "rocca" },
          group: "terra",
          count: 1,
          influence: 3,
        },
        { id: "terra_aid", event: "terra_troops_sent", group: "terra", count: 1, influence: 3 },
      ],
      groupMax: { terra: 2 },
    },
    spend: {
      // No rush of a delivery since the UX audit of 19 October 2026: waiting is the game, not a
      // cost to pay away (the rate is kept should it come back).
      rushMinutesPerPoint: 20,
      rushPerDay: 0,
      troopsPerPoint: 2,
      troopsPerDay: 20,
      dailyReroll: 3,
      respec: 15,
      rushWork: 5,
    },
    // Privileges: the gilded name in the rankings (cosmetic). The others wait for their content
    // (the Levant, Lombardy…). The second counter is gone (October 2026), its price paid back.
    patents: {
      gilded_name: { cost: 40, requires: [] },
    },
  },
  // The Doge's tenders (recommendations of 20 October 2026): every two days, a quantity of a
  // building good at most 140 % of its reference; sealed bids for a day with a caution of 20 %,
  // two days to deliver. The cheapest win; a winner who does not deliver loses the caution.
  tenders: {
    everyDays: 2,
    bidHours: 24,
    deliverHours: 48,
    quantity: { bread: [40, 80], bricks: [20, 40], planks: [20, 40] },
    ceilingBps: 14_000,
    cautionBps: 2_000,
  },
  // Warehouses in the cities (recommendations of 20 October 2026): two places a city, auctioned
  // each week from 50 ducats (destroyed), each delivering 40 units a day at once.
  warehouses: { perCity: 2, minBid: 5_000, unitsPerDay: 40 },
  // The official supplier (recommendations of 20 October 2026): the week's best deliverer of a
  // good to a city, from 10 units, is paid 10 % more for it there all the next week.
  suppliers: { bonusBps: 1_000, minUnits: 10 },
  // Company orders (recommendations of 20 October 2026): every two days a city orders bread,
  // bricks and planks from the three regions together, paid 10 % above the reference on
  // delivery, and 10 % more to everyone who delivered once the order is full.
  projects: {
    intervalDays: 2,
    durationDays: 2,
    needsPerPlayer: { bread: 4, bricks: 3, planks: 3 },
    premiumBps: 1_000,
    bonusBps: 1_000,
  },
  valuation: {
    vwapDays: 7,
    minVolume: 200,
    buildingValueBps: 10_000,
  },
};
