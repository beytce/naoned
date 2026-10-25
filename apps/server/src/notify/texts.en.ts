/**
 * Push texts in English (E3-8 of the experts), kind for kind with texts.ts. Venetian and Italian
 * names stay Italian.
 */

const EVENTS: Record<string, string> = {
  famine_verona: "Shortage in Verona: bread orders for Verona paid 60% more.",
  fire_venezia: "Fire in Venezia: brick and plank orders for Venezia paid 50% more.",
  storm: "Storm on the Adriatic: orders of planks, spices and silk paid 30% more.",
  harvest: "Bumper harvest: wheat grows 30% faster.",
  sensa_fair: "Fair of the Sensa: more orders, and better paid.",
};

const ACTS: Record<string, [string, string]> = {
  installation: ["Settling in", "The merchants settle in the Veneto."],
  crisis: ["The crisis", "A crisis strikes the Republic."],
  lombardy: [
    "The war of Lombardy",
    "Milano raises its troops: its garrisons and raids are half as strong again this week.",
  ],
  sensa: ["The Sensa", "The great fair: orders paid 15% more. The home stretch!"],
  chioggia: ["The war of Chioggia", "Venezia pays 30% more for bricks and planks and orders more."],
  plague: ["The plague", "Bread is paid 30% more, flour 20%."],
  embargo: ["The Levant embargo", "Goods from overseas are paid 50 to 60% more."],
};
const ROMAN = ["I", "II", "III", "IV", "V", "VI"];

const RESOURCES: Record<string, string> = {
  wheat: "wheat",
  flour: "flour",
  bread: "loaves",
  clay: "clay",
  bricks: "bricks",
  wood: "wood",
  planks: "planks",
  spices: "spices",
  silk: "silk",
  salt: "salt",
  wine: "wine",
  furs: "furs",
  cloth: "cloth",
};

/** The cities and lands, in Italian. */
export const CITIES_EN: Record<string, string> = {
  venezia: "Venezia",
  padova: "Padova",
  verona: "Verona",
  vicenza: "Vicenza",
  treviso: "Treviso",
  mantova: "Mantova",
  ferrara: "Ferrara",
  brescia: "Brescia",
  bergamo: "Bergamo",
  udine: "Udine",
  pordenone: "Pordenone",
  feltre: "Feltre",
  bassano: "Bassano",
  conegliano: "Conegliano",
  schio: "Schio",
  peschiera: "Peschiera",
  crema: "Crema",
  lodi: "Lodi",
  castelfranco: "Castelfranco",
  legnago: "Legnago",
  cremona: "Cremona",
  mestre: "Mestre",
  rovigo: "Rovigo",
  adria: "Adria",
  chioggia: "Chioggia",
  piove: "Piove di Sacco",
};

const FAMILIES: Record<string, string> = {
  contarini: "Contarini",
  morosini: "Morosini",
  mocenigo: "Mocenigo",
  dandolo: "Dandolo",
  milan: "Milano",
};
const WORKS: Record<string, string> = { rocca: "rocca", campo: "camp", dogana: "dogana" };
const DECREES: Record<string, string> = {
  fondaco: "the privilege of the Fondaco",
  gabelle: "a gabelle",
  faveur: "a city's favour",
  peage: "the Terraferma toll",
  levant: "the charter of the Levant",
  calmiere: "a calmiere",
};
const TERRA_DECREES: Record<string, string> = {
  monopole: "the Monopoly",
  embargo: "the Embargo",
  dime: "the Tithe of the Terraferma",
  faveur_doge: "the Doge's Favour",
  franchise_rialto: "the Rialto Franchise",
  calmiere: "the Calmiere",
};
const AWARDS: Record<string, string> = {
  doge: "Doge of the week",
  procurator: "Procurator of the week",
  senator: "Senator of the week",
};

const s = (n: number) => (n === 1 ? "" : "s");
const ordinal = (n: number) => {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
};
const familyName = (code: unknown) => FAMILIES[String(code)] ?? String(code ?? "");
const landName = (code: unknown) => CITIES_EN[String(code)] ?? String(code ?? "");
const clock = (at: unknown) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    minute: "2-digit",
  }).format(Number(at));
const ducats = (deniers: string) =>
  new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 }).format(Number(deniers) / 100);
const resource = (code: unknown) => RESOURCES[String(code)] ?? String(code);
const road = (route: unknown) =>
  `the road to ${CITIES_EN[String(route).split(":")[1] ?? ""] ?? "the city"}`;

export function pushTextEn(
  kind: string,
  data: Record<string, unknown>,
): { title: string; body: string } {
  switch (kind) {
    case "delivery":
      return {
        title: "Delivery arrived",
        body: `${data.quantity} ${resource(data.resource)} delivered by ${road(data.route)}: ${ducats(String(data.amount ?? "0"))} ducats collected.`,
      };
    case "wave":
      return {
        title: `New orders at ${clock(data.at)}`,
        body: `Your stock covers ${data.covered} orders of the wave: the first to load take them.`,
      };
    case "skirmish_call":
      return data.company
        ? {
            title: `${String(data.company)}: skirmish at ${clock(data.at)}`,
            body: "Your company is waiting for you in a quarter of an hour for a ranked match: the room is open.",
          }
        : {
            title: `Skirmish at ${clock(data.at)}`,
            body: "The merchants meet in a quarter of an hour for a ranked match: the room is open.",
          };
    case "morning": {
      const deliveries = Number(data.deliveries);
      const offers = Number(data.offers);
      const parts = [
        deliveries > 0
          ? `${deliveries} deliver${deliveries === 1 ? "y" : "ies"} paid (${ducats(String(data.paid ?? "0"))} ducats)`
          : "",
        Number(data.harvests) > 0 ? "batches ready to harvest" : "",
        offers > 0 ? `${offers} offer${s(offers)} taken at the Rialto` : "",
      ].filter(Boolean);
      return {
        title: "The morning gazette",
        body: `Last night: ${parts.length > 0 ? parts.join(", ") : "your counter is waiting for you"}.`,
      };
    }
    case "muda": {
      const goods = Object.entries((data.stock ?? {}) as Record<string, number>)
        .filter(([, q]) => q > 0)
        .map(([r]) => resource(r));
      return {
        title: "The galleys of the Muda are at the quay",
        body: `The Dogana sells ${goods.length > 0 ? goods.join(", ") : "the goods from overseas"} at the Rialto: first come, best prices.`,
      };
    }
    case "harvest":
      return {
        title: "Harvest ready",
        body: "Your workshops have finished their production. Come and harvest and restart!",
      };
    case "order": {
      const who = data.counterpartyName ? String(data.counterpartyName) : "the Dogana";
      const what = `${data.quantity} ${resource(data.resource)}`;
      return data.side === "sell"
        ? { title: "Offer closed", body: `${who} bought ${what} from your offer.` }
        : { title: "Offer closed", body: `${who} sold you ${what}.` };
    }
    case "event":
      return {
        title: "The gazette",
        body: EVENTS[String(data.code)] ?? "An event stirs the markets.",
      };
    case "act": {
      const [title, body] = ACTS[String(data.variant ?? "")] ?? ACTS[String(data.code)] ?? ["", ""];
      const n = ROMAN[Number(data.index)] ?? String(Number(data.index) + 1);
      return { title: `Act ${n}: ${title}`, body };
    }
    case "week": {
      const gain = String(data.gain ?? "0");
      const sign = BigInt(gain) > 0n ? "+" : "";
      const award = data.award ? ` You are ${AWARDS[String(data.award)]}!` : "";
      return {
        title: "Results of the week",
        body: `You finish ${ordinal(Number(data.rank))} (${data.glory ? `${gain} Glory` : `${sign}${ducats(gain)} ducats`}).${award}`,
      };
    }
    case "siege":
      if (data.event === "terra_bombarded")
        return {
          title: "Your lands are bombarded!",
          body: "An enemy bombard has freed several of your lands. Walls protect them from it.",
        };
      if (data.event === "terra_attacked")
        return {
          title: "Your lands are under attack!",
          body: `A neighbour sends ${Number(data.troops)} troops against your territory. Strike back, build a fort or call an ally.`,
        };
      return {
        title: `${landName(data.land)} threatened!`,
        body: `${Number(data.lances)} troops ${data.by === "milan" ? "of Milano" : `of the ${familyName(data.by)}`} arrive at ${clock(data.arriveAt)}. Reinforce the garrison!`,
      };
    case "family": {
      const terra = terraText(data);
      if (terra) return terra;
      if (data.event === "land_lost")
        return {
          title: `${landName(data.land)} is lost`,
          body: `${data.by === "milan" ? "Milano" : `The ${familyName(data.by)}`} took the land you were holding.`,
        };
      if (data.event === "work_razed")
        return {
          title: `Your ${WORKS[String(data.kind)] ?? "work"} is razed`,
          body: `${data.by === "milan" ? "Milano" : `The ${familyName(data.by)}`} took ${landName(data.land)} and pulled down the work you built there.`,
        };
      if (data.event === "decree_share")
        return {
          title: "Your share of the decrees",
          body: `${ducats(String(data.amount ?? "0"))} ducats of gabelle and toll, according to your Merit.`,
        };
      const decrees = (Array.isArray(data.decrees) ? data.decrees : [])
        .map((d) => DECREES[String((d as { code?: string }).code)] ?? "")
        .filter(Boolean)
        .join(" and ");
      if (data.final)
        return {
          title: data.won ? "Your family wins the season!" : "The Campaign is over",
          body: data.winner
            ? `The ${familyName(data.winner)} win the last week.`
            : "No family held any land.",
        };
      return {
        title: data.won
          ? "Your family wins the week!"
          : `The ${familyName(data.winner)} win the week`,
        body: data.won
          ? `It imposes ${decrees || "its decrees"} for the coming week.`
          : data.winner
            ? `They impose ${decrees || "their decrees"}. The map reopens: it is up to you to stop them.`
            : "The map reopens.",
      };
    }
    case "criee":
      return {
        title: "Auction at the Rialto!",
        body: `A city buys ${resource(data.resource)} at +${Math.round(Number(data.premiumBps) / 100)}% for 20 minutes.`,
      };
    case "deal":
      return {
        title: "A bargain",
        body: `An offer of ${resource(data.resource)} at ${(Number(data.price) / 100).toLocaleString("en-GB", { minimumFractionDigits: 2 })} ducats, well under the reference price.`,
      };
    case "season":
      if (data.phase === "ending") {
        return {
          title: "Final sprint",
          body: "The season ends in 3 days: every place in the ranking counts.",
        };
      }
      return {
        title: "New season",
        body: data.rank
          ? `The season is closed: you finish ${ordinal(Number(data.rank))}. Come and see your rewards, ${String(data.name)} begins!`
          : `${String(data.name)} begins: a new counter is waiting for you.`,
      };
    default:
      return { title: "Fondaco", body: "Something new at your counter." };
  }
}

function terraText(data: Record<string, unknown>): { title: string; body: string } | null {
  switch (data.event) {
    case "terra_ducats_received":
      return {
        title: "An ally sends you ducats",
        body: `${ducats(String(data.amount ?? "0"))} ducats from an ally on the Terraferma.`,
      };
    case "terra_battle_soon":
      return {
        title: "The battle starts in 15 minutes",
        body: "For an hour, the Terraferma's fronts advance ten times faster: come and lead them.",
      };
    case "terra_alliance_asked":
      return {
        title: "An alliance is proposed to you",
        body: "A neighbour on the Terraferma asks for your alliance.",
      };
    case "terra_alliance_made":
      return {
        title: "Alliance made",
        body: "Your alliance is accepted: no more front between you.",
      };
    case "terra_alliance_broken":
      if (data.reason === "withdrawn")
        return {
          title: "Your ally leaves the Terraferma",
          body: "Their house steps aside: their lands become free again and your alliance ends.",
        };
      return {
        title: "Your ally breaks the alliance",
        body: "In two hours, their troops may march on your lands.",
      };
    case "skirmish_aborted":
      return {
        title: "Skirmish interrupted",
        body: "Skirmish interrupted by maintenance: no Glory, nothing counted; it did not use up your ranked match of the day.",
      };
    case "terra_troops_received":
      return { title: "Reinforcements", body: `An ally sends you ${Number(data.count)} troops.` };
    case "terra_result": {
      const influence = Number(data.influence ?? 0);
      const decree = TERRA_DECREES[String(data.decree)] ?? "their decree";
      if (data.signore)
        return {
          title: "You are Signore della Terraferma!",
          body: `${data.conquest ? "The Terraferma is yours. " : ""}You impose ${decree} for the coming week (+${influence} Influence).`,
        };
      return {
        title: "The Terraferma closes",
        body: `You finish ${ordinal(Number(data.rank))}${influence > 0 ? ` (+${influence} Influence)` : ""}. A new map opens.`,
      };
    }
    default:
      return null;
  }
}
