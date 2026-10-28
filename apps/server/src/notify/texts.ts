import { pushTextEn } from "./texts.en.js";

/**
 * Push texts, in the person's language (French, or English in texts.en.ts). The bell renders its
 * own from kind + data.
 */

const EVENTS: Record<string, string> = {
  famine_verona: "Disette à Vérone : commandes de pain pour Vérone payées 60 % de plus.",
  fire_venezia:
    "Incendie à Venise : commandes de briques et de planches pour Venise payées 50 % de plus.",
  storm:
    "Tempête sur l'Adriatique : commandes de planches, d'épices et de soie payées 30 % de plus.",
  harvest: "Récolte abondante : le blé pousse 30 % plus vite.",
  sensa_fair: "Foire de la Sensa : commandes plus nombreuses et mieux payées.",
};

/** Who writes the Letter of the day (R10), by the script's sender codes. */
const SENDERS: Record<string, string> = {
  lorenzo: "Lorenzo",
  faraj: "Faraj",
  contarini: "la veuve Contarini",
  senate: "Ser Marin Zane",
  spy: "un Milanais",
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
  lang = "fr",
): { title: string; body: string } {
  if (lang === "en") return pushTextEn(kind, data);
  switch (kind) {
    case "delivery":
      return {
        title: "Livraison arrivée",
        body: `${data.quantity} ${RESOURCES[String(data.resource)] ?? String(data.resource)} livrés par ${road(data.route, cities)} : ${ducats(String(data.amount ?? "0"))} ducats encaissés.`,
      };
    case "streak":
      return {
        title: `Série de ${data.streak} jours`,
        body: "Le coffre du jour est encore fermé : finissez vos tâches avant la fin du jour pour prolonger la série.",
      };
    case "wave":
      return {
        title: `Nouvelles commandes à ${clock(data.at)}`,
        body: `Votre stock couvre ${data.covered} commandes de la vague : les premiers à charger les prennent.`,
      };
    case "skirmish_call":
      return data.company
        ? {
            title: `${String(data.company)} : escarmouche à ${clock(data.at)}`,
            body: "Votre compagnie vous attend dans un quart d'heure pour une partie classée : la salle est ouverte.",
          }
        : {
            title: `Escarmouche à ${clock(data.at)}`,
            body: "Les marchands se retrouvent dans un quart d'heure pour une partie classée : la salle est ouverte.",
          };
    case "morning": {
      // What the night kept in the bell, in one line.
      const parts = [
        Number(data.deliveries) > 0
          ? `${data.deliveries} livraison${Number(data.deliveries) > 1 ? "s" : ""} payée${Number(data.deliveries) > 1 ? "s" : ""} (${ducats(String(data.paid ?? "0"))} ducats)`
          : "",
        Number(data.harvests) > 0 ? "des lots prêts à récolter" : "",
        Number(data.offers) > 0
          ? `${data.offers} offre${Number(data.offers) > 1 ? "s" : ""} prise${Number(data.offers) > 1 ? "s" : ""} au Rialto`
          : "",
      ].filter(Boolean);
      const atouts = data.atouts
        ? " Trois Atouts vous attendent : choisissez celui de la semaine."
        : "";
      const letter = data.letter
        ? ` Une lettre de ${SENDERS[String(data.letter)] ?? "Venise"} vous attend.`
        : "";
      const rumours = data.rumours ? " Deux rumeurs courent au Broglio." : "";
      return {
        title: "La gazette du matin",
        body: `Cette nuit : ${parts.length > 0 ? parts.join(", ") : "votre comptoir vous attend"}.${atouts}${letter}${rumours}`,
      };
    }
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
      // `glory`: the weeks ranked on the Terraferma's glory (18 and 19 October 2026).
      const award = data.award ? ` Vous êtes ${AWARDS[String(data.award)]} !` : "";
      const lustre =
        data.lustre === undefined
          ? ""
          : Number(data.lustre) > 0
            ? ` Sfida gagnée : +${Number(data.lustre)} de Lustre.`
            : Number(data.lustre) < 0
              ? ` Sfida perdue : ${Number(data.lustre)} de Lustre.`
              : " Sfida nulle.";
      return {
        title: "Résultats de la semaine",
        body: `Vous terminez ${data.rank}${data.rank === 1 ? "er" : "e"} (${data.glory ? `${gain} de Gloire` : `${sign}${ducats(gain)} ducats`}).${award}${lustre}`,
      };
    }
    case "broglio": {
      const t: Record<string, { title: string; body: string }> = {
        sold: {
          title: "Rumeur vendue",
          body: `Un marchand vous a acheté une rumeur pour ${ducats(String(data.price ?? "0"))} ducats.`,
        },
        spied: {
          title: "On vous espionne",
          body: "Un espion rôde autour de votre comptoir. Chassez-le au Broglio.",
        },
        chased: {
          title: "Votre espion est chassé",
          body: "Le marchand que vous surveilliez l'a renvoyé.",
        },
        unmasked: {
          title: "Une rumeur était fausse",
          body: "Une rumeur reçue au Rialto venait d'un menteur : il est démasqué.",
        },
        caught: {
          title: "Votre mensonge est démasqué",
          body: "Votre fausse rumeur a été percée à jour : vous perdez du Lustre.",
        },
      };
      return t[String(data.event)] ?? { title: "Le Broglio", body: "Du nouveau au Broglio." };
    }
    case "doge": {
      if (data.event === "opened")
        return data.candidate
          ? {
              title: "Vous êtes candidat au Doge",
              body: "Le Sénat élit le Doge du mois prochain : annoncez votre programme et rassemblez les voix.",
            }
          : {
              title: "L'élection du Doge est ouverte",
              body: "Les dix premières Maisons briguent la couronne : lisez leurs programmes et votez.",
            };
      if (data.event === "won")
        return {
          title: "Vous êtes élu Doge",
          body: "Votre programme gouvernera le mois prochain : votre décret et votre saison.",
        };
      return {
        title: `${data.byName ? String(data.byName) : "Un marchand"} est élu Doge`,
        body: "Son décret et sa saison gouvernent le mois prochain.",
      };
    }
    case "letter": {
      const by = SENDERS[String(data.sender ?? "")] ?? "Venise";
      return {
        title: `Des nouvelles de ${by}`,
        body: data.came
          ? "La suite d'une de vos lettres est arrivée."
          : "La suite d'une de vos lettres n'est pas venue.",
      };
    }
    case "sera":
      if (data.event === "outbid")
        return {
          title: "Votre enchère est dépassée",
          body: "Un marchand vous a passé à l'incanto des galères. Relevez votre maximum avant la clôture.",
        };
      return {
        title: "La Sera commence à 20 h",
        body: `${Number(data.lots)} lots des galères aux enchères, et la bataille de la Terraferme.`,
      };
    case "sfida": {
      const by = data.byName ? String(data.byName) : "un marchand";
      if (data.event === "challenged")
        return {
          title: `${by} vous défie`,
          body: `Une Sfida la semaine prochaine${Number(data.stake) > 0 ? `, ${Number(data.stake)} de Lustre en jeu` : ""}. Acceptez-la dans la Sfida.`,
        };
      return {
        title: "Votre Sfida de la semaine",
        body: data.ghost
          ? `Vous affrontez le fantôme de ${by} : sa meilleure semaine, heure par heure.`
          : `Vous affrontez ${by} : qui vendra le plus cette semaine ?`,
      };
    }
    case "signoria": {
      const city = cities[String(data.city)] ?? String(data.city ?? "");
      const by = data.byName ? String(data.byName) : "Un rival";
      if (data.event === "podesta_named")
        return {
          title: `Vous êtes Podestà de ${city}`,
          body: "La ville est à vous : un droit sur les livraisons des autres, et ses commandes avant eux.",
        };
      if (data.event === "podesta_lost")
        return {
          title: `${city} vous échappe`,
          body: `${by} vous a repris ${city}. Livrez-y, ou tenez-la sur la Terraferme, pour la reprendre.`,
        };
      return {
        title: `${by} vous dépasse à ${city}`,
        body: `${by} mène la jauge de ${city}. Le Podestà se décide à minuit.`,
      };
    }
    case "siege":
      if (data.event === "terra_bombarded")
        return {
          title: "Vos terres sont bombardées !",
          body: "Une bombarde ennemie a rendu libres plusieurs de vos terres. Des remparts les en protègent.",
        };
      if (data.event === "terra_attacked")
        return {
          title: "Vos terres sont attaquées !",
          body: `Un voisin lance ${Number(data.troops)} troupes contre votre territoire. Contre-attaquez, bâtissez un fort ou appelez un allié.`,
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
    case "terra_hungry":
      return {
        title: "Vos troupes ont faim",
        body: "Le pain manque : vous ne recrutez plus. Achetez du pain au Rialto ou cuisez-en.",
      };
    case "terra_ducats_received":
      return {
        title: "Un allié vous envoie des ducats",
        body: `${ducats(String(data.amount ?? "0"))} ducats d'un allié de la Terraferme.`,
      };
    case "terra_battle_soon":
      return {
        title: "La bataille commence dans 15 minutes",
        body: "Pendant une heure, les fronts de la Terraferme avancent dix fois plus vite : venez les mener.",
      };
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
      if (data.reason === "withdrawn")
        return {
          title: "Votre allié quitte la Terraferme",
          body: "Sa maison se retire : ses terres redeviennent libres et votre alliance prend fin.",
        };
      return {
        title: "Votre allié rompt l'alliance",
        body: "Dans deux heures, ses troupes pourront marcher sur vos terres.",
      };
    case "skirmish_aborted":
      return {
        title: "Escarmouche interrompue",
        // The same words as the skirmish's bar and the bell.
        body: "Escarmouche interrompue par une maintenance : aucune Gloire, rien n'est compté ; elle n'a pas consommé votre partie classée du jour.",
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
