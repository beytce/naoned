/** Push texts, in French (the interface language). The bell renders its own from kind + data. */

const EVENTS: Record<string, string> = {
  famine_verona: "Disette à Vérone : le pain s'y vend 60 % plus cher.",
  fire_venezia: "Incendie à Venise : briques et planches 50 % plus chères.",
  storm: "Tempête sur l'Adriatique : planches, épices et soie +30 % dans les villes.",
  harvest: "Récolte abondante : le blé pousse 30 % plus vite.",
  sensa_fair: "Foire de la Sensa : les villes achètent plus et paient mieux.",
};

const AWARDS: Record<string, string> = {
  doge: "Doge de la semaine",
  procurator: "Procurateur de la semaine",
  senator: "Sénateur de la semaine",
};

const ducats = (deniers: string) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Number(deniers) / 100);

export function pushText(
  kind: string,
  data: Record<string, unknown>,
  ports: Record<string, string>,
): { title: string; body: string } {
  switch (kind) {
    case "harvest":
      return {
        title: "Récolte prête",
        body: "Vos ateliers ont terminé leur production. Venez récolter et relancer !",
      };
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
    case "week": {
      const gain = String(data.gain ?? "0");
      const sign = BigInt(gain) > 0n ? "+" : "";
      const award = data.award ? ` Vous êtes ${AWARDS[String(data.award)]} !` : "";
      return {
        title: "Résultats de la semaine",
        body: `Vous terminez ${data.rank}${data.rank === 1 ? "er" : "e"} (${sign}${ducats(gain)} ducats).${award}`,
      };
    }
    default:
      return { title: "Comptoirs", body: "Du nouveau à votre comptoir." };
  }
}
