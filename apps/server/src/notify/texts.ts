/** Push texts, in French (the interface language). The bell renders its own from kind + data. */

const EVENTS: Record<string, string> = {
  famine_verona: "Disette à Vérone : commandes de pain pour Vérone payées 60 % de plus.",
  fire_venezia:
    "Incendie à Venise : commandes de briques et de planches pour Venise payées 50 % de plus.",
  storm:
    "Tempête sur l'Adriatique : commandes de planches, d'épices et de soie payées 30 % de plus.",
  harvest: "Récolte abondante : le blé pousse 30 % plus vite.",
  sensa_fair: "Foire de la Sensa : commandes plus nombreuses et mieux payées.",
};

/** Each act of the season, and the variant drawn for its crisis. */
const ACTS: Record<string, [string, string]> = {
  installation: ["L'installation", "Les marchands s'installent en Vénétie."],
  crisis: ["La crise", "Une crise frappe la République."],
  lombardy: [
    "La guerre de Lombardie",
    "Milan lève ses troupes : ses garnisons et ses chevauchées sont moitié plus fortes cette semaine.",
  ],
  sensa: ["La Sensa", "La grande foire : commandes payées 15 % de plus. Dernière ligne droite !"],
  chioggia: [
    "La guerre de Chioggia",
    "Venise paie briques et planches 30 % de plus et en commande davantage.",
  ],
  plague: ["La peste", "Le pain se paie 30 % de plus, la farine 20 %."],
  embargo: ["L'embargo du Levant", "Les marchandises d'outre-mer se paient 50 à 60 % de plus."],
};
const ROMAN = ["I", "II", "III", "IV", "V", "VI"];

const RESOURCES: Record<string, string> = {
  wheat: "blé",
  flour: "farine",
  bread: "pains",
  clay: "argile",
  bricks: "briques",
  wood: "bois",
  planks: "planches",
  spices: "épices",
  silk: "soie",
  salt: "sel",
  wine: "vin",
  furs: "fourrures",
  cloth: "draps",
};

/** The families, the lands of the campaign and the decrees, by their codes. */
const FAMILIES: Record<string, string> = {
  contarini: "Contarini",
  morosini: "Morosini",
  mocenigo: "Mocenigo",
  dandolo: "Dandolo",
  milan: "Milan",
};
const LANDS: Record<string, string> = {
  feltre: "Feltre",
  bassano: "Bassano",
  vicenza: "Vicence",
  conegliano: "Conegliano",
  udine: "Udine",
  schio: "Schio",
  verona: "Vérone",
  bergamo: "Bergame",
  treviso: "Trévise",
  pordenone: "Pordenone",
  peschiera: "Peschiera",
  crema: "Crema",
  brescia: "Brescia",
  lodi: "Lodi",
  castelfranco: "Castelfranco",
  legnago: "Legnago",
  mantova: "Mantoue",
  cremona: "Crémone",
  padova: "Padoue",
  mestre: "Mestre",
  rovigo: "Rovigo",
  adria: "Adria",
  ferrara: "Ferrare",
  chioggia: "Chioggia",
  piove: "Piove di Sacco",
};
const WORKS: Record<string, string> = { rocca: "rocca", campo: "camp", dogana: "dogana" };

const DECREES: Record<string, string> = {
  fondaco: "le privilège du Fondaco",
  gabelle: "une gabelle",
  faveur: "la faveur d'une ville",
  peage: "le péage de Terraferme",
  levant: "la charte du Levant",
  calmiere: "un calmiere",
};
const familyName = (code: unknown) => FAMILIES[String(code)] ?? String(code ?? "");
const landName = (code: unknown) => LANDS[String(code)] ?? String(code ?? "");
const clock = (at: unknown) =>
  new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    minute: "2-digit",
  }).format(Number(at));

const AWARDS: Record<string, string> = {
  doge: "Doge de la semaine",
  procurator: "Procurateur de la semaine",
  senator: "Sénateur de la semaine",
};

const ducats = (deniers: string) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Number(deniers) / 100);

/** "la route de Vérone": the city at the end of a road `region:city`. */
const road = (route: unknown, cities: Record<string, string>) =>
  `la route de ${cities[String(route).split(":")[1] ?? ""] ?? "la ville"}`;

export function pushText(
  kind: string,
  data: Record<string, unknown>,
  cities: Record<string, string> = {},
  now = 0,
): { title: string; body: string } {
  switch (kind) {
    case "delivery":
      return {
        title: "Livraison arrivée",
        body: `${data.quantity} ${RESOURCES[String(data.resource)] ?? String(data.resource)} livrés par ${road(data.route, cities)} : ${ducats(String(data.amount ?? "0"))} ducats encaissés.`,
      };
    case "muda": {
      const goods = Object.entries((data.stock ?? {}) as Record<string, number>)
        .filter(([, q]) => q > 0)
        .map(([r]) => RESOURCES[r] ?? r);
      return {
        title: "Les galères de la Muda sont à quai",
        body: `La Dogana vend au Rialto ${goods.length > 0 ? goods.join(", ") : "les marchandises d'outre-mer"} : premiers arrivés, meilleurs prix.`,
      };
    }
    case "harvest":
      return {
        title: "Récolte prête",
        body: "Vos ateliers ont terminé leur production. Venez récolter et relancer !",
      };
    case "order": {
      const who = data.counterpartyName ? String(data.counterpartyName) : "la Dogana";
      const what = `${data.quantity} ${RESOURCES[String(data.resource)] ?? String(data.resource)}`;
      return data.side === "sell"
        ? { title: "Offre conclue", body: `${who} a acheté ${what} de votre offre.` }
        : { title: "Offre conclue", body: `${who} vous a vendu ${what}.` };
    }
    case "event":
      return {
        title: "La gazette",
        body: EVENTS[String(data.code)] ?? "Un événement agite les marchés.",
      };
    case "act": {
      const [title, body] = ACTS[String(data.variant ?? "")] ?? ACTS[String(data.code)] ?? ["", ""];
      const n = ROMAN[Number(data.index)] ?? String(Number(data.index) + 1);
      return { title: `Acte ${n} : ${title}`, body };
    }
    case "week": {
      const gain = String(data.gain ?? "0");
      const sign = BigInt(gain) > 0n ? "+" : "";
      const award = data.award ? ` Vous êtes ${AWARDS[String(data.award)]} !` : "";
      return {
        title: "Résultats de la semaine",
        body: `Vous terminez ${data.rank}${data.rank === 1 ? "er" : "e"} (${sign}${ducats(gain)} ducats).${award}`,
      };
    }
    case "siege":
      if (data.event === "terra_attacked")
        return {
          title: "Vos terres sont attaquées !",
          body: `Un voisin lance ${Number(data.troops)} troupes contre votre territoire. Contre-attaquez, bâtissez une rocca ou appelez un allié.`,
        };
      return {
        title: `${landName(data.land)} menacée !`,
        body: `${Number(data.lances)} troupes ${data.by === "milan" ? "de Milan" : `des ${familyName(data.by)}`} arrivent à ${clock(data.arriveAt)}. Renforcez la garnison !`,
      };
    case "family": {
      const terra = terraText(data);
      if (terra) return terra;
      if (data.event === "land_lost")
        return {
          title: `${landName(data.land)} est perdue`,
          body: `${data.by === "milan" ? "Milan" : `Les ${familyName(data.by)}`} ont pris la terre que vous gardiez.`,
        };
      if (data.event === "work_razed")
        return {
          title: `Votre ${WORKS[String(data.kind)] ?? "ouvrage"} est rasé`,
          body: `${data.by === "milan" ? "Milan a" : `Les ${familyName(data.by)} ont`} pris ${landName(data.land)} et abattu l'ouvrage que vous y aviez bâti.`,
        };
      if (data.event === "decree_share")
        return {
          title: "Votre part des décrets",
          body: `${ducats(String(data.amount ?? "0"))} ducats de gabelle et de péage, selon votre Mérite.`,
        };
      const decrees = (Array.isArray(data.decrees) ? data.decrees : [])
        .map((d) => DECREES[String((d as { code?: string }).code)] ?? "")
        .filter(Boolean)
        .join(" et ");
      if (data.final)
        return {
          title: data.won ? "Votre famille gagne la saison !" : "La Campagne est terminée",
          body: data.winner
            ? `Les ${familyName(data.winner)} remportent la dernière semaine.`
            : "Aucune famille n'a tenu de terre.",
        };
      return {
        title: data.won
          ? "Votre famille gagne la semaine !"
          : `Les ${familyName(data.winner)} gagnent la semaine`,
        body: data.won
          ? `Elle impose ${decrees || "ses décrets"} pour la semaine qui vient.`
          : data.winner
            ? `Ils imposent ${decrees || "leurs décrets"}. La carte rouvre : à vous de les arrêter.`
            : "La carte rouvre.",
      };
    }
    case "criee":
      return {
        title: "Criée au Rialto !",
        body: `Une ville rachète ${RESOURCES[String(data.resource)] ?? String(data.resource)} à +${Math.round(Number(data.premiumBps) / 100)} % pendant 20 minutes.`,
      };
    case "deal":
      return {
        title: "Bonne affaire",
        body: `Une offre de ${RESOURCES[String(data.resource)] ?? String(data.resource)} à ${(Number(data.price) / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} ducats, bien sous le prix de référence.`,
      };
    case "season":
      if (data.phase === "ending") {
        return {
          title: "Dernier sprint",
          body: "La saison se termine dans 3 jours : chaque place du classement compte.",
        };
      }
      return {
        title: "Nouvelle saison",
        body: data.rank
          ? `La saison est close : vous terminez ${data.rank}${data.rank === 1 ? "er" : "e"}. Venez voir vos récompenses, ${String(data.name)} commence !`
          : `${String(data.name)} commence : un nouveau comptoir vous attend.`,
      };
    default:
      return { title: "Fondaco", body: "Du nouveau à votre comptoir." };
  }
}

const TERRA_DECREES: Record<string, string> = {
  monopole: "le Monopole",
  embargo: "l'Embargo",
  dime: "la Dîme de la Terraferme",
  faveur_doge: "la Faveur du Doge",
  franchise_rialto: "la Franchise du Rialto",
  calmiere: "le Calmiere",
};

/** The Terraferma's news (docs/plan-terraferme.md), or null for another event. */
function terraText(data: Record<string, unknown>): { title: string; body: string } | null {
  switch (data.event) {
    case "terra_alliance_asked":
      return {
        title: "Une alliance vous est proposée",
        body: "Un voisin de la Terraferme demande votre alliance.",
      };
    case "terra_alliance_made":
      return {
        title: "Alliance conclue",
        body: "Votre alliance est acceptée : plus de front entre vous.",
      };
    case "terra_alliance_broken":
      return {
        title: "Votre allié rompt l'alliance",
        body: "Dans deux heures, ses troupes pourront marcher sur vos terres.",
      };
    case "terra_troops_received":
      return { title: "Renforts", body: `Un allié vous envoie ${Number(data.count)} troupes.` };
    case "terra_result": {
      const influence = Number(data.influence ?? 0);
      const decree = TERRA_DECREES[String(data.decree)] ?? "son décret";
      if (data.signore)
        return {
          title: "Vous êtes Signore della Terraferma !",
          body: `${data.conquest ? "La Terraferme est à vous. " : ""}Vous imposez ${decree} la semaine qui vient (+${influence} d'Influence).`,
        };
      return {
        title: "La Terraferme se referme",
        body: `Vous terminez ${data.rank}${data.rank === 1 ? "er" : "e"}${influence > 0 ? ` (+${influence} d'Influence)` : ""}. Une nouvelle carte s'ouvre.`,
      };
    }
    default:
      return null;
  }
}
