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
  worksite: [
    "L'Arsenal",
    "Le Doge agrandit l'Arsenal : briques et planches pour Venise payées 15 % de plus. La famille qui livre le plus l'emporte.",
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
};

const AWARDS: Record<string, string> = {
  doge: "Doge de la semaine",
  procurator: "Procurateur de la semaine",
  senator: "Sénateur de la semaine",
};

const FAMILIES: Record<string, string> = {
  contarini: "Contarini",
  morosini: "Morosini",
  mocenigo: "Mocenigo",
  dandolo: "Dandolo",
};

const ducats = (deniers: string) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Number(deniers) / 100);

/** "la route de Vérone": the city at the end of a road `region:city`. */
const road = (route: unknown, cities: Record<string, string>) =>
  `la route de ${cities[String(route).split(":")[1] ?? ""] ?? "la ville"}`;

export function pushText(
  kind: string,
  data: Record<string, unknown>,
  ports: Record<string, string>,
  cities: Record<string, string> = {},
  now = 0,
): { title: string; body: string } {
  switch (kind) {
    case "ambush": {
      const minutes = Math.max(1, Math.round((Number(data.reactBy) - now) / 60_000));
      return {
        title: "Brigands sur la route !",
        body: `Votre convoi est attaqué sur ${road(data.route, cities)}. Ripostez dans les ${minutes} minutes !`,
      };
    }
    case "delivery":
      return {
        title: "Livraison arrivée",
        body: `${data.quantity} ${RESOURCES[String(data.resource)] ?? String(data.resource)} livrés par ${road(data.route, cities)} : ${ducats(String(data.amount ?? "0"))} ducats encaissés.`,
      };
    case "robbed":
    case "defended": {
      const ok = kind === "robbed";
      if (data.role === "victim") {
        const who = data.banditName ? String(data.banditName) : "des brigands";
        return ok
          ? {
              title: "Convoi détroussé",
              body: `${who} ont pris une part de votre cargaison sur ${road(data.route, cities)}.`,
            }
          : {
              title: "Attaque repoussée",
              body: `Votre convoi a repoussé ${who} sur ${road(data.route, cities)}.${
                data.bounty
                  ? ` Le Doge vous verse une prime de ${ducats(String(data.bounty))} ducats.`
                  : ""
              }`,
            };
      }
      const who = String(data.victimName ?? "un marchand");
      return ok
        ? {
            title: "Belle prise !",
            body: `Votre bande a détroussé le convoi de ${who}. Votre infamie monte à ${Number(data.infamy ?? 0)} : votre tête vaut plus cher.`,
          }
        : {
            title: data.reacted ? "Bande dispersée" : "Attaque manquée",
            body: data.reacted
              ? `${who} a riposté : votre bande est dispersée. Encaissez son butin.`
              : `Le convoi de ${who} a repoussé votre bande.`,
          };
    }
    case "band_over":
      return {
        title: "Bande de retour",
        body: `Votre bande quitte ${road(data.route, cities)}. Encaissez le butin !`,
      };
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
    case "galley":
      return {
        title: "Galère rentrée",
        body: `Votre galère est de retour de ${ports[String(data.destination)] ?? "l'Orient"}. Déchargez la cargaison !`,
      };
    case "raid": {
      const route = ports[String(data.route)] ?? "";
      if (data.role === "victim") {
        const who = String(data.raiderName ?? "des corsaires");
        return data.success
          ? { title: "Convoi arraisonné !", body: `${who} a pillé votre convoi vers ${route}.` }
          : {
              title: "Abordage repoussé",
              body: `Votre escorte a repoussé ${who} sur la route de ${route}.`,
            };
      }
      const who = String(data.victimName ?? "un marchand");
      return data.success
        ? { title: "Prise !", body: `Vos corsaires ont arraisonné le convoi de ${who}.` }
        : { title: "Abordage manqué", body: `Le convoi de ${who} a repoussé vos corsaires.` };
    }
    case "corsairs":
      return {
        title: "Corsaires de retour",
        body: `Vos corsaires sont rentrés de la route de ${ports[String(data.route)] ?? "l'Orient"}. Déchargez le butin !`,
      };
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
    case "family": {
      const winner = data.winner ? (FAMILIES[String(data.winner)] ?? String(data.winner)) : null;
      if (winner && data.winner === data.family) {
        return {
          title: "Votre famille au pouvoir",
          body: `Les ${winner} remportent la semaine : vos commandes de famille paient davantage cette semaine.`,
        };
      }
      return {
        title: "La semaine des familles",
        body: winner
          ? `Les ${winner} prennent le pouvoir ; les ${FAMILIES[String(data.family)] ?? ""} finissent ${data.rank}e.`
          : "Aucune famille n'a gagné d'influence cette semaine.",
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
