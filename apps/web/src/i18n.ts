/** Interface texts. French only for now; one object per language when i18n comes. */

/**
 * A skirmish lost to a restart of the server: the same words on the bar and in the bell (and in
 * the push, apps/server/src/notify/texts.ts). Told in the past, true for good: the bell keeps it
 * after the merchant has played again, so it promises nothing.
 */
const skirmishInterrupted =
  "Escarmouche interrompue par une maintenance : aucune Gloire, rien n'est compté ; elle n'a pas consommé votre partie classée du jour.";

export const fr = {
  appName: "Fondaco",
  season: "Saison 1 · Venise 1450",
  tagline: "Bâtissez une maison de commerce en un mois, sur un marché tenu par les joueurs.",
  /** What sets the game apart, under the tagline. */
  promises: [
    "Le jeu dort la nuit : rien ne se perd entre 22 h et 8 h.",
    "Rien à acheter qui fasse gagner : ni ducats, ni marchandises, ni vitesse.",
    "Une saison par mois : tout le monde repart à égalité.",
    "Une économie honnête : la Banque publie sa monnaie chaque jour.",
  ],
  emailLabel: "Adresse e-mail",
  emailPlaceholder: "vous@exemple.fr",
  sendLink: "Recevoir mon code",
  sending: "Envoi…",
  noPassword: "Pas de mot de passe : un code et un lien de connexion vous sont envoyés par e-mail.",
  accept: [
    "En recevant votre code, vous acceptez les ",
    "conditions d'utilisation",
    " et la ",
    "politique de confidentialité",
    ".",
  ],
  checkInbox: "Regardez vos e-mails",
  linkSentTo: (email: string) =>
    `Un code et un lien de connexion viennent de partir vers ${email}. Ils sont valables 15 minutes. Pensez à regarder dans les spams.`,
  code: {
    label: "Code à 6 chiffres",
    iosHint: "Sur iPhone, saisissez le code reçu ici plutôt que de toucher le lien.",
    submit: "Se connecter",
    wrong: "Code incorrect ou expiré. Au 5e essai faux, il faut un nouveau code.",
    resend: "Recevoir un nouveau code",
  },
  otherAddress: "Utiliser une autre adresse",
  signingIn: "Connexion en cours…",
  invalidLink: "Ce lien est invalide ou a expiré.",
  askNewLink: "Demander un nouveau lien",
  choosePseudo: "Votre nom de marchand",
  pseudoHelp: "3 à 20 caractères : lettres, chiffres, _ ou -. Il sera visible des autres joueurs.",
  pseudoLabel: "Nom de marchand",
  pseudoInvalid:
    "De 3 à 20 caractères, avec seulement des lettres, des chiffres, _ ou - (pas d'espace ni de ponctuation).",
  confirm: "Valider",
  logout: "Se déconnecter",

  intro: {
    skip: "Passer",
    next: "Suivant",
    start: "Choisir mon métier",
    /** The first slide's text when the season runs past its first calendar month. */
    longSeason: (until: string) =>
      `Cette saison dure jusqu'au ${until} ; les suivantes, un mois chacune, du 1er au dernier jour du mois. À la fin, le classement se fige : le plus gros chiffre de ventes nettes l'emporte (ce que vous avez vendu, moins ce que vous avez acheté ; le stock ne compte pas). Vous partez avec 1 000 ducats et deux ou trois ateliers.`,
    slides: [
      {
        kicker: "Le but du jeu",
        title: "Devenez le premier marchand de Venise",
        text: "Une saison dure un mois : elle s'ouvre le 1er et se termine le dernier jour du mois. À la fin, le classement se fige : le plus gros chiffre de ventes nettes l'emporte (ce que vous avez vendu, moins ce que vous avez acheté ; le stock ne compte pas). Vous partez avec 1 000 ducats et deux ou trois ateliers.",
      },
      {
        kicker: "Comment",
        title: "Produire, livrer, réinvestir",
        text: "Vos ateliers fabriquent des marchandises, même quand vous dormez. Les villes vous passent commande : chargez une charrette et livrez-les par la route, ou vendez aux autres marchands au Rialto. Puis réinvestissez pour produire plus.",
      },
      {
        kicker: "Le commerce",
        title: "Vous ne pouvez pas tout faire seul",
        text: "Vos ouvriers mangent du pain, vos fours brûlent du bois, et pour grandir il faut des briques ET des planches. Votre métier n'en produit qu'une partie : le reste, vous l'achèterez aux autres marchands.",
      },
      {
        kicker: "Le rythme",
        title: "Quelques minutes, plusieurs fois par jour",
        text: "Lancez jusqu'à 12 heures de production (toute une nuit), revenez récolter, vendez, réinvestissez. Lorenzo, votre facteur, vous guide pour vos premiers pas.",
      },
    ],
  },

  region: {
    title: "Choisissez votre métier",
    help: "Chaque région n'extrait que sa propre matière première : le blé en Terraferma, l'argile dans la Lagune, le bois dans les Dolomites. Pour le reste, il faudra commercer.",
    bonus: (pct: number, resource: string) => {
      const name = resource.toLowerCase();
      return `+${pct} % ${/^[aeiouyéèêh]/.test(name) ? "d'" : "de "}${name}`;
    },
    kit: "Ateliers de départ",
    sells: "Vous vendez",
    needs: "Vous achèterez",
    settle: "Choisir ce métier",
    jobs: {
      terraferma: {
        name: "Boulanger",
        text: "Blé, farine, pain : vous nourrissez Venise. Le pain est ce que les villes achètent le plus.",
      },
      lagoon: {
        name: "Briquetier",
        text: "Argile et briques : vous bâtissez les palais. Tout le monde a besoin de vos briques.",
      },
      dolomites: {
        name: "Charpentier",
        text: "Bois et planches : vous fournissez bâtiments et chantiers. Tout le monde a besoin de vos planches.",
      },
    } as Record<string, { name: string; text: string }>,
  },

  game: {
    ui: { howItWorks: "Comment ça marche ?" },
    map: {
      home: (pseudo: string) => (pseudo ? `Maison ${pseudo}` : "Votre maison"),
      homeLabel: "Comptoir",
      close: "Fermer",
      prev: "Précédent",
      next: "Suivant",
      notices: "Avis",
      bales: (n: number) => (n > 1 ? `${n} ballots à ouvrir` : "Un ballot à ouvrir"),
      buyCart: "Acheter une mule",
      cityLabel: (name: string, orders: number, covered: number, criee: boolean) =>
        [
          name,
          orders > 0 ? `${orders} commande${orders > 1 ? "s" : ""}` : "aucune commande",
          covered > 0 ? `${covered} couverte${covered > 1 ? "s" : ""} par votre stock` : null,
          criee ? "criée en cours" : null,
        ]
          .filter(Boolean)
          .join(", "),
      carts: "Charrettes libres",
      resumeGuide: "Reprendre le guide",
      /** The cards that unfold beside the HUD's counters. */
      tips: {
        cash: {
          title: "Ducats",
          text: "La monnaie de la République : elle paie les marchandises, les ateliers, les véhicules et le Palais. Le classement compte vos ventes nettes.",
          purse: "En caisse",
          escrow: "Engagés dans vos offres",
          turnover: "Ventes nettes de la saison",
          action: "Aller au Rialto",
        },
        influence: {
          title: "Influence",
          text: "Gardée de saison en saison, elle achète les privilèges de votre Maison. Elle se gagne seulement par les missions de la Maison.",
          action: "Ouvrir le livre",
        },
        bread: {
          title: "Pain des ouvriers",
          text: (perLevel: number) =>
            `Chaque niveau d'atelier nourrit ses ouvriers : ${perLevel} pains par jour, mangés à minuit. Sans pain, vos lots durent 50 % de plus pendant 24 h.`,
          eaten: "Mangés par jour",
          reserve: "Réserve",
          reserveValue: (stock: number, days: number) => `${stock} · ${days} j`,
          nextMeal: "Prochain repas",
          hungry: (left: string) => `Ouvriers affamés encore ${left}.`,
          low: (missing: number) => `Il manque ${missing} pains pour le prochain repas.`,
        },
      },
      fleet: {
        title: "Tous les véhicules",
        open: "Voir les véhicules",
        home: "Au comptoir",
        out: (city: string, time: string) => `Vers ${city} · ${time}`,
        byFattore: "envoyé par le fattore",
        back: (time: string) => `Retour · ${time}`,
        capacity: (units: number) => `${units} u.`,
      },
      buttons: {
        harvest: "Récolter",
        restart: "Relancer",
        workshops: "Ateliers",
        store: "Magasin",
        build: "Bâtir",
        cargo: "Cargaisons",
        send: "Partir",
        go: "Partir",
        cancel: "Annuler",
        follow: "Suivre",
        upgrade: "Améliorer",
        rialto: "Rialto",
        criee: "Criée",
        suppliers: "Fournisseurs",
        warehouse: "Entrepôt",
        ranking: "Classement",
        family: "Famille",
        help: "Aide",
      },
      homeStatus: {
        ready: (n: number) => `${n} lot${n > 1 ? "s" : ""} prêt${n > 1 ? "s" : ""} à récolter`,
        next: (building: string, left: string) => `${building} : prochain lot dans ${left}`,
        idle: "Des ateliers attendent du travail",
        rest: "Ateliers au repos",
      },
      city: {
        orders: (n: number) => (n > 0 ? `${n} commande${n > 1 ? "s" : ""}` : "Aucune commande"),
        deliverable: (n: number) =>
          n > 0
            ? `${n} livrable${n > 1 ? "s" : ""} avec votre stock`
            : "Votre stock ne couvre aucune commande",
        none: (time: string) => `Nouvelles commandes dans ${time}`,
        criee: (resource: string, pct: string, left: string) =>
          `Criée : ${resource.toLowerCase()} payé +${pct} · ${left}`,
        noCart: "Aucune charrette libre",
        pips: "Le chiffre sur une ville : ses commandes ouvertes. En or, votre stock en couvre ; en vert, pas encore.",
        pipsOk: "Compris",
        venice: "Le Rialto et la Muda",
      },
      cart: {
        atHome: "Au comptoir",
        loaded: (city: string) => `Chargée pour ${city}`,
        outbound: (city: string, left: string) => `Vers ${city} · ${left}`,
        inbound: (left: string) => `Retour au comptoir · ${left}`,
        leaving: (city: string) => `Départ vers ${city}`,
        express: (left: string) => `routes dégagées · ${left}`,
        normalTrip: (minutes: string) => `trajet normal · ${minutes}`,
        pickCity: "Touchez une ville éclairée",
        nothing: "Rien à livrer avec votre stock pour l'instant",
      },
      notice: {
        title: "Avis",
        season: (day: number, of: number) => `Jour ${day} sur ${of}`,
        daysLeft: (n: number) => `${n} jour${n > 1 ? "s" : ""} avant la fin de la saison`,
        event: "La gazette",
        carnet: "Carnet du jour",
        yourSeason: "Votre saison",
        news: "Nouvelles",
      },
      page: { back: "Retour à la carte" },
      settings: "Réglages",
      campaign: {
        toCampaign: "Famille",
        toTrade: "Commerce",
        lances: "Troupes",
        marches: "Marches",
        decrees: "Décrets",
        family: "Famille",
        attack: "Attaquer",
        reinforce: "Renforcer",
        details: "Fiche",
        join: "Rejoindre",
        pledge: "Allégeance",
        howTo: "Règles",
        families: "Les quatre familles",
        rankGlory: (rank: number, glory: number) =>
          `${rank}${rank === 1 ? "re" : "e"} · ${glory} Gloire`,
        reserveLine: (reserve: number, levy: number, max: number) =>
          `Réserve ⚔ ${reserve} · levée ${levy}/${max}`,
        landLine: (holder: string, garrison: number, defense: number) =>
          `${holder} · garnison ${garrison} · défense ${defense}`,
        threat: (time: string) => `Marche ennemie, arrivée dans ${time}`,
        ours: (time: string) => `Votre famille y marche · ${time}`,
        backToTrade: "Revenez au commerce : touchez « Commerce » au pied de la carte.",
        chooseLine: "Choisissez votre famille pour la saison",
      },
      rialto: {
        kicker: "Le marché des joueurs, à Venise",
        filters: { all: "Tout", stock: "En stock", rising: "En hausse" },
        offers: (n: number) => (n > 0 ? `Mes offres · ${n}` : "Mes offres"),
        none: "Rien ici pour l'instant.",
      },
    },
    tabs: {
      comptoir: "Comptoir",
      marche: "Marché",
      famille: "Famille",
      routes: "Routes",
      top: "Classement",
      profil: "Profil",
    },
    gazette: {
      now: "En ce moment",
      soon: "Bientôt",
      endsIn: "fin dans",
      startsIn: "dans",
      events: {
        famine_verona: [
          "Disette à Vérone",
          "Commandes de pain pour Vérone payées 60 % de plus, et plus nombreuses.",
        ],
        fire_venezia: [
          "Incendie à Venise",
          "Venise reconstruit : commandes de briques et de planches pour Venise payées 50 % de plus, et plus nombreuses.",
        ],
        storm: [
          "Tempête sur l'Adriatique",
          "Bois −30 % en production ; commandes de planches, d'épices et de soie payées 30 % de plus.",
        ],
        harvest: [
          "Récolte abondante",
          "Blé +30 % en production ; commandes de pain payées 10 % de moins.",
        ],
        sensa_fair: [
          "Foire de la Sensa",
          "Grande foire : commandes plus nombreuses et payées 10 % de plus, épices et soie 20 %.",
        ],
      } as Record<string, [string, string]>,
    },
    road: {
      kicker: "Les routes de terre ferme",
      title: "Commandes à livrer",
      help: "Chaque jour, les villes publient leurs commandes pour tous les marchands, et le Doge vous passe les siennes. Chargez une charrette et partez : la ville paie à l'arrivée. Plus la route est longue, mieux elle paie.",
      frame: {
        tabs: {
          commandes: "Commandes",
          enroute: "En route",
          garage: "Garage",
        },
        toDeliver: "à livrer",
        underway: "en route",
        free: "libres",
        orders: (n: number) => `${n} commande${n > 1 ? "s" : ""}`,
        noneUnderway: "Aucun véhicule sur les routes.",
      },
      sort: { gain: "Gain/h", price: "Prix", distance: "Distance", deadline: "Échéance" },
      facts: {
        deliverable: "Livrable",
        contested: (n: number) => `Disputée · ${n}`,
        unit: (price: string) => `${price} l'unité`,
        rialto: (gap: string) => `${gap} / Rialto`,
        perHour: (amount: string) => `${amount}/h`,
      },
      sharedHelp:
        "Les commandes des villes sont communes à tous les marchands : la première charrette qui part l'emporte.",
      takenBy: (name: string) => `Prise par ${name}`,
      takenList: (n: number) =>
        `${n} commande${n > 1 ? "s" : ""} déjà prise${n > 1 ? "s" : ""} par d'autres`,
      kinds: { city: "Ville", doge: "Doge", family: "Doge", urgent: "Urgente" } as Record<
        string,
        string
      >,
      empty: "Plus de commande à livrer aujourd'hui. Nouvelles commandes à minuit.",
      renewIn: "Nouvelles commandes dans",
      closesIn: "Ferme dans",
      opensIn: "Ouvre dans",
      oneWay: (time: string) => `${time} aller`,
      done: "Livrée",
      expired: "Expirée",
      vehicles: "Vos véhicules",
      vehicleNames: {
        mule: "Mule",
        cart: "Charrette",
        wagon: "Chariot",
        great_wagon: "Grand chariot",
      } as Record<string, string>,
      free: "Libre",
      backIn: (time: string) => `De retour dans ${time}`,
      capacity: (n: number) => `${n} unités`,
      buy: "Acheter",
      buyTitle: "Acheter un véhicule",
      buyHint: "Tout véhicule s'achète mule ; améliorez-le ensuite au comptoir.",
      upgradeTitle: (name: string) => `Améliorer : ${name}`,
      upgradeHint:
        "Mule, charrette, chariot, grand chariot : chaque amélioration porte plus et va plus vite. Le véhicule doit être au comptoir.",
      upgradeTo: (name: string) => `Devient : ${name}`,
      speed: (pct: number) => `Vitesse ${pct} %`,
      upgrade: (cost: string) => `Améliorer · ${cost}`,
      maxLevel: "Plus haut niveau atteint.",
      away: "De retour au comptoir, il pourra être amélioré.",
      maxVehicles: (n: number) => `${n} véhicules au plus.`,
      sheet: {
        payment: "Paiement à l'arrivée",
        vehicle: "Véhicule",
        noVehicle: "Aucun véhicule libre assez grand pour cette commande.",
        missing: (n: number) => `Il vous en manque ${n}.`,
        go: "Charger et partir",
      },
      underway: "En route",
      arrivesIn: (time: string) => `Arrivée dans ${time}`,
      backHome: (time: string) => `Retour à vide dans ${time}`,
      arrived: (amount: string) => `Livrée : ${amount}`,
      shortcut: (orders: number, free: number) =>
        `${orders} commande${orders > 1 ? "s" : ""} à livrer, ${free} véhicule${free > 1 ? "s" : ""} libre${free > 1 ? "s" : ""}`,
      newsTitle: "Nouvelles des routes",
      take: (who: string, q: number, res: string, city: string, amount: string) =>
        `${who} a raflé ${q} ${res} pour ${city} (${amount}).`,
      cityClosed:
        "Les villes ne rachètent plus au comptoir : elles passent commande. Livrez-les depuis l'onglet Routes.",
      byRoad: "À livrer par la route",
      seeRoutes: "Voir les routes",
    },
    cargo: {
      title: "Cargaisons",
      sort: { reward: "Récompense", distance: "Distance", city: "Ville" },
      kinds: { doge: "Doge", urgent: "Urgente", family: "Famille" } as Record<string, string>,
      why: {
        noRoad: "pas de route",
        otherCity: (city: string) => `pour ${city} seulement`,
        full: (n: number) => `${n} commandes au plus`,
        heavy: "trop lourd",
        stock: (have: number, need: number) => `${have} / ${need} en stock`,
      },
      hold: "Cale",
      empty: "Touchez des commandes pour remplir la cale. Une seule ville par voyage.",
      ready: (city: string, value: string) => `Prêt pour ${city} · ${value}`,
      pick: "Choisissez des commandes",
      nextOrders: (time: string) => `Nouvelles commandes dans ${time}`,
      none: (time: string) => `Plus de commandes à prendre. Nouvelles commandes dans ${time}.`,
      cancel: "Annuler",
      dragLabel: "Glisser le véhicule vers une ville",
      busy: (time: string) => `En route · de retour dans ${time}`,
      bound: (city: string) => `Chargé pour ${city}`,
      atDepot: "Au dépôt",
      prev: "Véhicule précédent",
      next: "Véhicule suivant",
      load: "Charger",
      send: "Envoyer",
      dragHint: "Glissez le véhicule jusqu'à la ville, ou touchez-la",
      leaving: (city: string) => `Départ vers ${city}`,
      summary: (n: number, time: string, value: string) =>
        `${n} commande${n > 1 ? "s" : ""} · ${time} de route · ${value}`,
      go: "Partir",
      close: "Fermer",
      dropOk: (city: string) => `Livrer à ${city}`,
      dropSub: (n: number, time: string, value: string) =>
        `${n} commande${n > 1 ? "s" : ""} · ${time} · ${value}`,
      dropNo: (city: string) => `Rien pour ${city}`,
      dropElsewhere: (city: string) => `Votre cale va à ${city}`,
      dropEmpty: "Chargez d'abord le véhicule",
      vehicles: "Vos véhicules",
      tapDepot: "Touchez votre dépôt ou un véhicule pour charger",
    },
    roadMap: {
      heldBy: (family: string) => `Dans la Campagne, la terre de cette ville est aux ${family}.`,
      label: "Carte des routes de la Vénétie",
      hud: (orders: number, free: number) =>
        `${orders} commande${orders > 1 ? "s" : ""} · ${free} véhicule${free > 1 ? "s" : ""} libre${free > 1 ? "s" : ""}`,
      view: { carte: "Carte", liste: "Liste" },
      focusHint: (vehicle: string) =>
        `${vehicle} : touchez une ville en surbrillance pour la charger.`,
      cityKicker: "Commandes de la ville",
      noOrder: "Pas de commande de cette ville aujourd'hui.",
      back: (city: string) => `Commandes de ${city}`,
      underwayTitle: "Sur les routes",
      stable: {
        title: "Écurie",
        summary: (atDepot: number, away: number) => `${atDepot} au dépôt · ${away} en voyage`,
        atDepot: "Au dépôt",
        ready: "Prêt à charger",
        chosen: "Chargez-le, puis glissez-le vers une ville",
        outbound: (city: string) => `En route vers ${city}`,
        inbound: (city: string) => `Sur le retour de ${city}`,
        arrivesIn: (time: string) => `Arrivée dans ${time}`,
        freeIn: (time: string) => `Au dépôt dans ${time}`,
        buy: "Acheter un véhicule",
      },
    },
    batchNow: (time: string) => `Lot en cours : ${time}`,
    batchNext: (time: string) => `prochains : ${time}`,
    rations: {
      line: (perDay: number, days: number) =>
        `Vos ouvriers mangent ${perDay} pains par jour · réserve : ${days} j`,
      nextMeal: (inTime: string, need: number, have: number) =>
        `Prochain repas dans ${inTime} : il faut ${need} pains, vous en avez ${have}.`,
      why: (perLevel: number) =>
        `${perLevel} pains par niveau d'atelier : chaque niveau construit en ajoute.`,
      hungry: (left: string) =>
        `Ouvriers affamés encore ${left} : les lots lancés maintenant durent 50 % de plus. Achetez du pain au Rialto.`,
      low: (missing: number) =>
        `Il manque ${missing} pains pour le prochain repas : sans eux, vos lots dureront 50 % de plus pendant 24 h.`,
      slower: "+50 % (faim)",
      buy: "Acheter du pain",
      /** The HUD's line: the reserve and what the workers eat a day. */
      hud: (stock: number, perDay: number) =>
        `Pain : ${stock} en réserve, vos ouvriers en mangent ${perDay} par jour`,
      perDay: (perDay: number) => `−${perDay}/j`,
    },
    contracts: {
      kicker: "Contrats du Doge",
      title: "Les commandes du jour",
      help: "Deux commandes par jour, payées 20 % au-dessus du prix de référence. Elles changent chaque jour.",
      renewIn: "Nouvelles commandes dans",
      reward: "Prime",
      deliver: "Honorer",
      done: "Honoré",
      missing: (n: number) => `Il vous en manque ${n}`,
      buy: "Acheter au Marché",
      projects: "Grand chantier de la semaine",
      tabs: { doge: "Le Doge" },
    },
    terra: {
      door: "Terraferme",
      away: "Pendant votre absence",
      title: "La Terraferme",
      closesIn: (time: string) => `fin dans ${time}`,
      closed: "Semaine close",
      night: "Nuit : les fronts reposent",
      troops: "Troupes",
      troopsLine: (troops: number, cap: number) => `${troops} / ${cap}`,
      perHour: (n: number) => `+${n}/h`,
      perHourAt: (n: number, from: number) => `☾ +${n}/h à ${from} h`,
      returns: {
        title: "Fronts rentrés",
        line: (against: string, cells: number, spent: number, back: number) =>
          `${against} : ${cells} case${cells > 1 ? "s" : ""} prise${cells > 1 ? "s" : ""}, −${spent} troupes, ${back} revenue${back > 1 ? "s" : ""}`,
        ok: "Compris",
      },
      glory: (glory: number, rank: number) => `${glory} Gloire · ${rank}${rank === 1 ? "er" : "e"}`,
      milan: "Milan",
      /** The powers of 1450 held by the computer. */
      nations: {
        milan: "Milan",
        mantova: "Mantoue (Gonzague)",
        ferrara: "Ferrare (Este)",
        aquileia: "Aquilée (le Patriarche)",
        impero: "L'Empire",
      } as Record<string, string>,
      neutral: "Terre libre",
      someone: "Un marchand",
      soon: "imminent",
      terrains: {
        p: "Plaine",
        h: "Collines",
        m: "Marais",
        M: "Montagne",
      } as Record<string, string>,
      eliminated: "Éliminé cette semaine",
      placing: (time: string) => `Placement · la guerre dans ${time}`,
      truce: (time: string) => `Trêve · la guerre dans ${time}`,
      /** On a phone's plaque: the same, in a few words. */
      placingShort: (time: string) => `Placement · ${time}`,
      truceShort: (time: string) => `Trêve · ${time}`,
      nightShort: "Nuit",
      team: (region: string) => `Semaine en équipes · vous êtes de ${region}`,
      teamWon: (region: string) => `${region} gagne la semaine`,
      /** On a phone's plaque: the team, its win, Milan riding against the player. */
      teamShort: (region: string) => `Équipe · ${region}`,
      teamWonShort: (region: string) => `${region} l'emporte`,
      milanOnMeShort: (who: string) => `⚔ ${who} sur vous`,
      diplomacy: {
        signals: {
          help: "À l'aide",
          attack: "Cible",
          thanks: "Merci",
          peace: "Paix",
        } as Record<string, string>,
        target: "Désigner aux alliés",
        give: (amount: string) => `Donner ${amount}`,
        embargo: "Embargo",
        lift: "Lever l'embargo",
      },
      buildings: {
        rocca: "Fort",
        borgo: "Bourg",
        porto: "Port",
        bombarda: "Bombarde",
        mura: "Remparts",
      } as Record<string, string>,
      peasants: {
        label: "Soldats ou paysans",
        soldiers: (pct: number) => `${pct} % soldats`,
        peasants: (pct: number) => `${pct} % paysans`,
        nothing: "rien",
        yield: (goods: string, route: string | null) =>
          `Vos terres donnent par heure ouverte : ${goods}${route ? ` ; routes entre vos villes : ${route}` : ""}.`,
      },
      battle: {
        on: (to: number) => `⚔ Bataille : fronts ×10 jusqu'à ${to} h`,
        at: (from: number) => `Bataille chaque soir à ${from} h`,
        onShort: (to: number) => `⚔ Bataille → ${to} h`,
        atShort: (from: number) => `Bataille à ${from} h`,
      },
      marching: (n: number) => `${n} front${n > 1 ? "s" : ""} en marche`,
      milanRides: (who: string, against: string | null) =>
        against ? `${who} marche sur ${against}` : `${who} s'étend`,
      out: {
        late: "La partie de la semaine a commencé",
        eliminated: "Vous avez perdu toutes vos terres",
        next: (time: string) => `Prochaine partie dans ${time}`,
      },
      place: {
        invite: "Posez votre camp de départ",
        hint: "Touchez une terre libre de la carte",
        until: (time: string) => `encore ${time}`,
        here: "M'installer ici",
        line: (terrain: string, hours: number | null) =>
          hours === null
            ? `${terrain} · personne ne vous attaque avant la fin du placement`
            : hours > 0
              ? `${terrain} · à l'abri des attaques pendant ${hours} h`
              : terrain,
      },
      target: {
        cost: (cost: number) => `${cost} troupes pour prendre cette terre`,
        losesSafety:
          "Attaquer un marchand rend votre capitale prenable jusqu'à la fin de la semaine",
        tooWeak: (cost: number) => `Il faut au moins ${cost} troupes : montez le curseur`,
        plan: (troops: number, cells: number, spent: number, back: number) =>
          `${troops} troupes → ${cells} case${cells > 1 ? "s" : ""} (−${spent}) · ${back} revien${back > 1 ? "nent" : "t"}`,
        pace: (hours: number, night: boolean) =>
          `${night ? "Part à l'aube, puis e" : "E"}nviron ${hours} h de marche (de jour seulement) ; chaque case prise coûte ses troupes`,
        notEnough: (cost: number, troops: number) =>
          `Il faut ${cost} troupes, vous en avez ${troops} : attendez vos recrues`,
        attack: "Attaquer",
        sail: (minutes: number) => `Débarquer (${minutes} min de mer)`,
        fire: (shots: number) => `Bombarder (${shots})`,
        allied: "Votre allié : pas de front entre vous",
        far: "Trop loin : touchez une terre au bord des vôtres",
        eta: (hour: string, wait: string) => `Vos troupes y seront vers ${hour} (dans ${wait})`,
        defense: (after: number, before: number) =>
          `Chez vous, il restera ${after} défenseur${after > 1 ? "s" : ""} par case au lieu de ${before}`,
      },
      holder: {
        line: (cells: number, troops: number) => `${cells} cases · ⚔ ${troops}`,
        ally: "Proposer l'alliance",
        asked: "Alliance proposée",
        accept: "Accepter l'alliance",
        broken: "Rompre",
        send: "Envoyer",
        sendLine: (count: number, left: number) =>
          `Envoyer ${count} troupes (encore ${left} aujourd'hui)`,
        allyChip: "Allié",
      },
      mine: {
        title: "Vos terres",
        line: (cells: number, troops: number, cap: number) =>
          `${cells} cases · ⚔ ${troops} / ${cap}`,
        rocca: "Fort",
        porto: "Port",
        raise: (amount: number) => `Max +${amount}`,
        recruit: (perHour: number, full: string | null, from: number, to: number) =>
          `Vos terres recrutent ${perHour} troupes par heure (de ${from} h à ${to} h)${full ? ` : maximum dans ${full}` : ""}. Plus de terres, plus de recrues ; « Max » relève le maximum, pas vos troupes.`,
        full: (amount: number) =>
          `Troupes au maximum. « Max +${amount} » relève ce maximum pour des ducats (il ne donne pas de troupes).`,
        decree: "Décret",
        fronts: "Fronts",
        recall: "Rappeler",
        frontLine: (troops: number, against: string) => `⚔ ${troops} → ${against}`,
        threatEta: (hour: string, wait: string) =>
          `Un front ennemi prendra cette terre vers ${hour} (dans ${wait})`,
        built: {
          rocca: "Un fort défend cette terre et ses voisines",
          porto:
            "Un port : vos barques débarquent sur les rives de ces eaux, vos galères les gardent",
          bombarda:
            "Une bombarde : un tir par jour rend libres une terre ennemie à portée et ses voisines",
          mura: "Des remparts : aucune bombarde n'atteint cette terre ni ses voisines",
        } as Record<string, string>,
        traitor: (time: string) => `Traître encore ${time} : vos terres défendent moins bien`,
      },
      decree: {
        title: "Si vous gagnez la semaine",
        hint: "Le Signore della Terraferma impose son décret à tous la semaine qui vient, pour lui et ses alliés.",
        inForce: "En vigueur cette semaine",
        yours: "Vous en profitez",
        choose: "Choisir",
        chosen: "Votre choix",
        target: "Sur",
        names: {
          monopole: "Le Monopole",
          embargo: "L'Embargo",
          dime: "La Dîme de la Terraferme",
          faveur_doge: "La Faveur du Doge",
          franchise_rialto: "La Franchise du Rialto",
          calmiere: "Le Calmiere",
        } as Record<string, string>,
        texts: {
          monopole:
            "Les autres paient une lourde taxe sur une marchandise, versée au Signore et à ses alliés.",
          embargo:
            "Une ville paie moins les autres marchands ; ses commandes urgentes vont d'abord au Signore.",
          dime: "Une part de chaque livraison des autres revient au Signore et à ses alliés.",
          faveur_doge:
            "Un contrat du Doge de plus chaque jour, et tous mieux payés, pour le Signore et ses alliés.",
          franchise_rialto:
            "Ni taxe du marché, et des quotas de la Dogana doublés, pour le Signore et ses alliés.",
          calmiere: "Le prix d'une marchandise est plafonné au Rialto, pour tous.",
        } as Record<string, string>,
        targets: { monopole: "resource", calmiere: "resource", embargo: "city" } as Record<
          string,
          "resource" | "city"
        >,
      },
      ranking: "Classement de la semaine",
    },
    families: {
      kicker: "Les quatre familles",
      title: "La Campagne de Terraferme",
      help: "Chaque semaine, les quatre grandes familles se disputent la Terraferme. Levez des troupes, engagez-en contre des ducats, prenez des terres aux milices, à Milan et aux autres familles. De 8 h à 22 h, chaque terre rapporte sa Gloire à qui la tient, heure après heure. La famille la plus glorieuse à la fin de la semaine impose ses décrets la semaine suivante.",
      names: {
        contarini: "Contarini",
        morosini: "Morosini",
        mocenigo: "Mocenigo",
        dandolo: "Dandolo",
        milan: "Milan",
      } as Record<string, string>,
      militia: "les milices",
      lands: {
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
      } as Record<string, string>,
      kinds: {
        seat: "Fief",
        village: "Village",
        bourg: "Bourg",
        city: "Ville",
        fortress: "Forteresse",
      } as Record<string, string>,
      opensIn: (inTime: string) => `Les familles vous recevront dans ${inTime}.`,
      chooseTitle: "Prêtez allégeance",
      chooseHelp:
        "Une famille pour toute la saison. Une petite famille lève davantage de troupes : rejoindre la plus grande ne suffit pas pour gagner.",
      members: (n: number, active: number) =>
        `${n} membre${n > 1 ? "s" : ""} · ${active} actif${active > 1 ? "s" : ""}`,
      levy: (bps: number) =>
        `Levée ${bps >= 10_000 ? "+" : ""}${Math.round((bps - 10_000) / 100)} %`,
      smallest: "La plus petite : levée renforcée",
      pledge: "Prêter allégeance",
      confirm: (family: string) => `Rejoindre les ${family} pour la saison`,
      cancel: "Annuler",
      yours: "Votre famille",
      glory: "Gloire",
      gloryHelp:
        "Gloire de la semaine : la valeur des terres tenues, à chaque heure entre 8 h et 22 h.",
      weekEnds: (time: string) => `Fin de la semaine dans ${time}`,
      lastWeek: "Dernière semaine : la famille gagnante remporte la saison.",
      landsHeld: (n: number) => `${n} terre${n > 1 ? "s" : ""}`,
      night: (time: string) => `Trêve de nuit : marches et Gloire reprennent dans ${time}.`,
      milanNext: (time: string) =>
        `Prochaine chevauchée de Milan dans ${time}, contre la famille en tête.`,
      closed: "La Campagne de la saison est terminée.",
      lances: "Vos troupes",
      reserve: "En réserve",
      levyWaiting: "Levée à ramasser",
      collect: (n: number) => `Lever ${n} troupe${n > 1 ? "s" : ""}`,
      levyHelp: (perHour: number, max: number) =>
        `Gratuit : ${perHour} troupes par heure de 8 h à 22 h, ${max} en attente au plus. Revenez les ramasser.`,
      hire: "Engager des troupes",
      hireHelp: (hours: number) =>
        `Payées en ducats, qui quittent le jeu. Plus chères au-delà des premières, plafonnées chaque jour. Toute troupe part ${hours} h après avoir été levée ou engagée.`,
      hireGo: (n: number, cost: string) => `Engager ${n} · ${cost}`,
      hireDone: "Plafond du jour atteint : revenez demain.",
      hiredToday: (n: number, max: number) => `${n} / ${max} engagées aujourd'hui`,
      leaving: (n: number, time: string) => `${n} partent dans ${time}`,
      map: "La Terraferme",
      inReach: "À portée de vos troupes",
      drag: {
        hint: "Glissez vos troupes depuis votre fief vers une terre",
        attack: (land: string) => `Attaquer ${land}`,
        reinforce: (land: string) => `Renforcer ${land}`,
        attackSub: (minutes: number, needed: number, reserve: number) =>
          `${minutes} min · il en faut ${needed} · ${reserve} en réserve`,
        reinforceSub: (minutes: number, garrison: number) =>
          `${minutes} min · garnison ${garrison}`,
      },
      mapHelp:
        "Glissez vos troupes de votre fief vers une terre, ou touchez-la : la vôtre pour la renforcer, une voisine pour l'attaquer. Une attaque prend la terre si ses troupes dépassent la garnison fois sa défense.",
      land: {
        garrison: "Garnison",
        defense: "Défense",
        factor: (bps: number) => `×${(bps / 10_000).toLocaleString("fr-FR")}`,
        glory: (n: number) => `${n} / heure`,
        heldBy: (who: string) => `Tenue par ${who}`,
        seat: (family: string) => `Fief des ${family} : imprenable.`,
        mine: "Vos troupes",
        needed: (n: number) => `Il faut plus de ${n} troupes pour la prendre.`,
        notAdjacent: "Trop loin : prenez d'abord une terre voisine.",
        march: (minutes: number) => `Marche de ${minutes} min`,
        reinforce: (n: number) => `Renforcer · ${n}`,
        attack: (n: number) => `Attaquer · ${n}`,
        noLances: "Levez ou engagez des troupes d'abord.",
        city: "Une ville du jeu : la famille qui la tient en fin de semaine peut y lever le péage.",
      },
      works: {
        title: "Les ouvrages",
        help: "Bâtis sur une terre que votre famille tient, payés en ducats qui quittent le jeu. Une terre prise rase son ouvrage ; la carte qui rouvre chaque semaine les efface tous.",
        names: { rocca: "Rocca", campo: "Campo", dogana: "Dogana" } as Record<string, string>,
        kinds: {
          rocca: "Forteresse",
          campo: "Camp avancé",
          dogana: "Péage fortifié",
        } as Record<string, string>,
        defense: (pct: string) => `Garnison comptée +${pct} en défense.`,
        glory: (pct: string) => `Gloire de la terre +${pct}.`,
        staging: "Vos marches partent d'ici plutôt que du fief : elles arrivent plus vite.",
        build: (price: string) => `Bâtir · ${price}`,
        building: (time: string) => `En chantier : prête dans ${time}`,
        ready: "En service",
        by: (who: string) => `Bâtie par ${who}`,
        count: (n: number, max: number) => `${n} / ${max} ouvrages`,
        full: (per: number) =>
          `Votre famille a tous ses ouvrages : un de plus tous les ${per} membres actifs.`,
        hours: (minutes: number) =>
          `${minutes >= 60 ? `${Math.round(minutes / 60)} h` : `${minutes} min`} de chantier, en heures ouvertes.`,
        enemy: (name: string, family: string) => `${name} des ${family}`,
        none: "Aucun ouvrage. Touchez une terre de votre famille pour en bâtir un.",
        raze: (merit: number) =>
          `La prendre rase l'ouvrage : +${merit} de Mérite à chaque assaillant.`,
        from: (land: string) => `depuis ${land}`,
      },
      tabs: { campagne: "Campagne", decrets: "Décrets", famille: "Famille", fil: "Fil" },
      helpTitle: "Comment jouer la Campagne",
      weekShort: (time: string) => `Fin ${time}`,
      truce: "Trêve",
      milanShort: (time: string) => `Milan ${time}`,
      hireOpen: "Engager",
      levyShort: (n: number) => `Lever ${n}`,
      first: "1er",
      reserveShort: "Réserve",
      marches: "Les marches en cours",
      noMarch: "Aucune marche en cours.",
      marchLine: (who: string, lances: number, land: string) =>
        `${who} · ${lances} troupes → ${land}`,
      arrives: (time: string) => `arrivée dans ${time}`,
      join: (n: number) => `Se joindre · ${n}`,
      yourLances: (n: number) => `dont ${n} à vous`,
      programme: {
        title: "Le programme",
        help: (n: number, cap: string) =>
          `Les ${n} décrets que votre famille imposera si elle gagne. Chaque membre vote ; les voix pèsent le Mérite de la semaine, aucune au-delà de ${cap} du total. Un décret ne peut pas être imposé deux semaines de suite.`,
        current: "Si la semaine finissait maintenant",
        yourVote: "Votre vote",
        vote: "Voter ce programme",
        pick: (n: number) => `Choisissez jusqu'à ${n} décrets`,
        target: "Sur",
        others: "Les programmes des autres familles",
      },
      decrees: {
        title: "Décrets de la semaine",
        none: "Aucun décret cette semaine.",
        by: (family: string) => `Imposés par les ${family}`,
        mine: "Votre famille les a imposés : ils jouent pour vous.",
        theirs: "Imposés par une autre famille : ils jouent contre vous.",
        names: {
          fondaco: "Privilège du Fondaco",
          gabelle: "Gabelle",
          faveur: "Faveur d'une ville",
          peage: "Péage de Terraferme",
          levant: "Charte du Levant",
          calmiere: "Calmiere",
        } as Record<string, string>,
        effects: {
          fondaco: (tax: string, quota: string) =>
            `Membres : taxe du Rialto à ${tax}, quotas de la Dogana +${quota}.`,
          gabelle: (good: string, pct: string) =>
            `Les autres paient ${pct} de plus sur leurs ventes de ${good} au Rialto, au profit des membres.`,
          faveur: (city: string, pct: string, minutes: number) =>
            `Membres : livraisons à ${city} payées +${pct}, ses commandes urgentes à eux les ${minutes} premières minutes.`,
          peage: (pct: string, cities: string) =>
            `Les autres paient ${pct} de leurs livraisons à ${cities || "leurs villes"} aux membres.`,
          levant: (more: string, less: string) =>
            `Galères de la Muda : quota +${more} pour les membres, −${less} pour les autres.`,
          calmiere: (good: string, pct: string) =>
            `Aucune offre de ${good} au-dessus de ${pct} du prix de référence.`,
        },
      },
      roll: "Les membres et leur Mérite",
      meritHelp: (per: number) =>
        `Mérite : une troupe par bataille gagnée, un point pour ${per} troupes tenues une heure en garnison.`,
      captain: "capitaine",
      you: "vous",
      history: "Les semaines passées",
      won: (family: string) => `Victoire des ${family}`,
      nobody: "Personne",
      thread: {
        title: "Fil de la famille",
        help: "Réservé aux membres de votre famille : préparez vos assauts. Restez courtois : un message signalé par trois membres disparaît.",
        empty: "Aucun message pour l'instant. Lancez la conversation !",
        me: "Vous",
        placeholder: "Un mot pour votre famille…",
        send: "Envoyer",
        report: "Signaler",
        reported: "Signalé",
        errors: {
          message_empty: "Le message est vide.",
          message_too_long: "280 caractères au plus.",
          message_refused: "Ce message n'est pas accepté (mot interdit ou lien).",
          message_too_fast: "Doucement : un message toutes les 10 secondes.",
          message_too_many: "Vous avez assez écrit pour aujourd'hui.",
          not_member: "Prêtez d'abord allégeance à une famille.",
          other: "Le message n'est pas parti. Réessayez.",
        } as Record<string, string>,
      },
    },
    day: (day: number, total: number) => `Jour ${day}/${total}`,
    shortDay: (day: number, total: number) => `J${day}/${total}`,
    dayOf: (day: number, total: number) => `Jour ${day} sur ${total}`,
    perDay: "/ jour",

    goal: {
      kicker: "Objectif de la saison",
      title: "Les plus grosses ventes de Venise",
      rank: (rank: number, total: number) => `Rang ${rank} / ${total}`,
      worth: "Vos ventes nettes",
      nextTitle: (name: string, amount: string) => `${name} à ${amount}`,
      left: "Fin de saison dans",
    },
    firstSteps: {
      title: "Premiers pas",
      items: {
        produce: ["Lancer une production", "Vos ateliers travaillent pendant votre absence."],
        harvest: ["Récolter", "La marchandise rentre dans votre stock."],
        transform: ["Transformer", "Un produit fini vaut bien plus que la matière brute."],
        sell_city: [
          "Livrer une ville",
          "C'est ainsi que les ducats entrent dans votre caisse : la ville paie à l'arrivée.",
        ],
        market_buy: ["Acheter au marché", "Le matériau d'un autre métier, pour grandir."],
        mission: [
          "Ouvrir le Livre de compte",
          "Chaque jour, de nouveaux objectifs et leur récompense.",
        ],
      } as Record<string, [string, string]>,
      guide: "Me guider",
    },
    nextBatch: "Prochain lot dans",
    readyNow: "Récolte prête",
    idleAll: "Ateliers à l'arrêt",
    idleAllHelp: "Lancez une production pour que vos ateliers travaillent pendant votre absence.",
    harvestAll: (n: number) => `Tout récolter et relancer · ${n} lot${n > 1 ? "s" : ""}`,
    restartAll: "Tout relancer",
    acts: {
      kicker: (n: string) => `Acte ${n}`,
      open: (title: string) => `L'acte en cours : ${title}`,
      nextIn: (time: string) => `Acte suivant dans ${time}`,
      endIn: (time: string) => `Fin de la saison dans ${time}`,
      toCampaign: "Voir la Campagne",
      acts: {
        installation: [
          "L'installation",
          "Les marchands s'installent en Vénétie. Bâtissez, livrez, trouvez vos fournisseurs : la semaine prochaine, une crise frappera la République.",
        ],
        crisis: ["La crise", "Une crise s'annonce pour la République…"],
        lombardy: [
          "La guerre de Lombardie",
          "Milan lève ses troupes : cette semaine, ses garnisons et ses chevauchées sont moitié plus fortes. Ses forteresses rapportent toujours le plus de Gloire.",
        ],
        sensa: [
          "La Sensa",
          "La grande foire de l'Ascension : les commandes sont payées 15 % de plus et plus nombreuses. Dernière ligne droite avant la fin du mois.",
        ],
      } as Record<string, [string, string]>,
      variants: {
        chioggia: [
          "La guerre de Chioggia",
          "Gênes menace la lagune : Venise paie briques et planches 30 % de plus et en commande davantage.",
        ],
        plague: [
          "La peste",
          "La ville a faim : le pain se paie 30 % de plus, la farine 20 %, et les villes en commandent davantage.",
        ],
        embargo: [
          "L'embargo du Levant",
          "Les galères ne passent plus : sel et vin se paient 50 % de plus, épices, soie, fourrures et draps 60 %.",
        ],
        sensa: [
          "La Sensa",
          "La grande foire de l'Ascension : les commandes sont payées 15 % de plus et plus nombreuses. Dernière ligne droite avant la fin du mois.",
        ],
      } as Record<string, [string, string]>,
    },
    mastery: {
      kicker: "Maîtrise de la saison",
      title: "Choisissez votre voie",
      help: "Votre Maison a grandi : elle peut se spécialiser. La maîtrise vaut pour toute la saison ; seule l'Influence permet d'en changer.",
      pick: "Choisissez une maîtrise",
      confirm: (name: string) => `Devenir ${name}`,
      forGood: "Un seul choix pour la saison, sauf à le changer contre de l'Influence.",
      ready: "Votre Maison peut choisir sa maîtrise",
      readyHelp: "Maître d'atelier, roulier, négociant ou marchand du Levant",
      locked: (levels: number, need: number) =>
        `Maîtrise à ${need} niveaux d'ateliers (vous en avez ${levels}) : améliorez ou bâtissez.`,
      names: {
        master: "Maître d'atelier",
        carter: "Roulier",
        trader: "Négociant",
        levant: "Marchand du Levant",
      } as Record<string, string>,
      mottos: {
        master: "Qui transforme bien vend mieux.",
        carter: "Les routes sont à qui va vite.",
        trader: "Le Rialto est mon atelier.",
        levant: "Les galères de la Muda ne viennent pas pour rien.",
      } as Record<string, string>,
      effects: {
        transform: (n: number) => `+${n} % de rendement sur ce qui se transforme`,
        speed: (n: number) => `véhicules ${n} % plus rapides`,
        vehicles: (n: number) => `${n} véhicule${n > 1 ? "s" : ""} de plus permis`,
        quota: (n: number) => `quotas de la Dogana +${n} %`,
        tax: (n: number) => `taxe de marché −${n} point${n > 1 ? "s" : ""} sur vos ventes`,
        offers: (n: number) => `${n} offres de plus au Rialto`,
        muda: (n: number) => `quota aux galères de la Muda +${n} %`,
      },
    },
    /** Words shared by every section's frame (the scene, its bars, its drawer). */
    stage: {
      help: "Comment ça marche",
      unfold: "Ouvrir le tiroir",
      fold: "Replier le tiroir",
    },
    market: {
      chart: {
        empty: (days: number) =>
          `Pas encore d'échange ${days === 7 ? "cette semaine" : `ces ${days} derniers jours`} : la courbe viendra avec les premiers.`,
        reference: "référence",
        since: (days: number) => `il y a ${days} j`,
        low: "bas",
        high: "haut",
        label: (good: string, last: string, vsRef: number) =>
          `${good} : ${last} au dernier échange, ${vsRef >= 0 ? "+" : ""}${vsRef} % de la référence`,
      },
      goods: "Marchandise",
      offers: "mes offres",
      tax: (pct: number) => `Taxe ${pct.toLocaleString("fr-FR")} %`,
      decrees: (n: number) => `${n} décret${n > 1 ? "s" : ""} en vigueur`,
      trade: (price: string) => `Négocier · ${price}`,
      noOffers: "Aucune offre posée. Touchez une marchandise et choisissez « À mon prix ».",
      tabs: { negoce: "Négoce", offres: "Offres", decrets: "Décrets" },
      muda: {
        title: "Galères de la Muda",
        next: (time: string) => `Prochaines dans ${time}`,
        first: "Les premières galères d'État arrivent bientôt d'Alexandrie et de Beyrouth.",
        help: "Leurs marchandises d'outre-mer sont vendues par la Dogana, plus cher à mesure que le lot s'épuise : premiers arrivés, meilleurs prix.",
        empty: "Le quai est vide : tout est parti. Attendez les prochaines galères.",
        stock: (n: number) => `${n} à quai`,
        left: (n: number) => (n > 0 ? `vous ${n}` : "pris"),
        quota: (left: number, stock: number, next: string) =>
          `Galères de la Muda : encore ${left} à acheter pour vous, ${stock} à quai. Nouveau lot dans ${next}.`,
      },
    },
    top: {
      tabs: { passee: "Semaine passée", regles: "Règles" },
      noLastWeek: "Pas encore de semaine terminée : le premier podium se joue maintenant.",
    },
    counter: {
      tabs: { ateliers: "Ateliers", stock: "Stock", saison: "Saison" },
    },
    domain: {
      house: (pseudo: string) => (pseudo ? `Maison ${pseudo}` : "Votre Maison"),
      workshops: (n: number) => `${n} atelier${n > 1 ? "s" : ""}`,
      levels: (n: number) => `${n} niveau${n > 1 ? "x" : ""}`,
      build: "À bâtir",
      plot: {
        ready: (q: number, res: string) => `récolte prête : ${q} ${res.toLowerCase()}`,
        running: (left: string) => `en production, lot fini dans ${left}`,
        idle: "à l'arrêt, peut produire",
        blocked: (res: string) => (res ? `à l'arrêt, manque : ${res.toLowerCase()}` : "à l'arrêt"),
        upgrade: "amélioration possible",
      },
      next: (building: string, left: string) => `${building} : prochain lot dans ${left}`,
      loadable: (n: number, free: number) =>
        `${n} commande${n > 1 ? "s" : ""} couverte${n > 1 ? "s" : ""} par votre stock · ${free} véhicule${free > 1 ? "s" : ""} libre${free > 1 ? "s" : ""}`,
      road: { out: "en route, chargé", back: "sur le retour" },
      workersLabel: "Vos ouvriers : leurs rations de pain",
      store: {
        label: "Le magasin : votre stock",
        title: "Le magasin",
        sell: "Vendre au marché",
        deliver: "Livrer",
      },
      load: {
        title: "Charger",
        back: "Les commandes",
        none: "Aucune commande ouverte que votre stock couvre pour ce véhicule. Produisez, ou voyez toutes les commandes.",
        all: "Toutes les commandes",
      },
      workers: {
        title: "Vos ouvriers",
        bake: "Cuire du pain",
        buy: "Acheter au marché",
      },
      sweepHint: "Glissez le doigt sur les ateliers prêts pour tout récolter",
      harvestShort: (n: number) => `Récolter ${n}`,
      restartShort: "Tout relancer",
      nextShort: "Prochain lot",
      loadShort: (n: number) => `Charger ${n}`,
      buildShort: "Bâtir",
      hungry: "Ouvriers affamés",
      hint: "Touchez un atelier pour récolter ou produire, une charrette pour la charger, le magasin pour votre stock, un ouvrier pour ses rations. Glissez le doigt sur les ateliers prêts pour tout récolter d'un geste.",
      title: (n: number, levels: number) =>
        `Votre domaine : ${n} atelier${n > 1 ? "s" : ""}, ${levels} niveau${levels > 1 ? "x" : ""} en tout`,
    },
    workshopsSheet: {
      ready: (n: number) => (n > 1 ? "prêts" : "prêt"),
      running: (_n: number) => "en cours",
      idle: (_n: number) => "à l'arrêt",
      collectAll: (n: number) => `Tout récolter et relancer (${n} lot${n > 1 ? "s" : ""})`,
      harvestOnly: "Récolter seulement",
      restartAll: "Tout relancer",
      /** What a harvest brought in and what restarting consumed, said after it. */
      harvested: (gains: string) => gains || "Rien à récolter",
      restarted: (batches: number, what: string, inputs: string) =>
        `${batches} lot${batches > 1 ? "s" : ""} ${/^[aeiouyéèêh]/i.test(what) ? "d'" : "de "}${what.toLowerCase()}${inputs ? ` (${inputs})` : ""}`,
      restartedLabel: "relancé",
      ordersWaiting: (n: number, what: string) =>
        `${n} commande${n > 1 ? "s" : ""} ${/^[aeiouyéèêh]/i.test(what) ? "d'" : "de "}${what.toLowerCase()} ouverte${n > 1 ? "s" : ""}`,
      whatsMissing: "Voir ce qui manque",
    },
    workshop: {
      ready: (q: number, res: string) => `Prêt : ${q} ${res.toLowerCase()} à récolter`,
      running: (batch: number, of: number, left: string) =>
        `Lot ${batch} sur ${of}, fini dans ${left}`,
      idle: "À l'arrêt : lancez une production",
      blocked: "À l'arrêt : il manque une matière",
      one: "1 lot",
      evening: "Jusqu'à ce soir",
      night: "Pour la nuit",
      max: "Le plus possible",
      missing: (res: string, need: number, have: number) =>
        `Il faut ${need} ${res.toLowerCase()} par lot ; vous en avez ${have}.`,
      toMarket: "Au marché",
      makeAt: (building: string) => `Produire : ${building}`,
      upgradeLater: (level: number) => `Améliorer au niveau ${level}`,
      /** An upgrade while a queue runs: the queue keeps its level. */
      queueKeeps: (level: number, end: string) =>
        `Le niveau ${level} s'applique aux lots lancés après la file en cours (fin à ${end}).`,
      afterQueue: (level: number) => `niv. ${level} après la file`,
      /** What limits the batches that can be started. */
      limitedBy: (n: number, res: string, have: number, perBatch: number) =>
        `${n} lot${n > 1 ? "s" : ""} : limité par ${/^[aeiouyéèêh]/i.test(res) ? "l'" : "le "}${res.toLowerCase()} (${have} en stock, ${perBatch} par lot)`,
      limitedByQueue: (n: number, hours: number) =>
        `${n} lot${n > 1 ? "s" : ""} : limité par la file (${hours} h)`,
      /** The materials an upgrade lacks: bought right away at the Rialto. */
      buyMissing: (cost: string) => `Acheter ce qui manque (≈ ${cost})`,
      buyMissingNone: "Personne ne vend ce qui manque au Rialto pour l'instant.",
      buildHere: "Bâtir ici",
    },
    carnet: {
      title: "Carnet du jour",
      short: "Carnet",
      rewards: (n: number) => `${n} récompense${n > 1 ? "s" : ""} à réclamer`,
      left: (n: number) =>
        n > 0 ? `${n} tâche${n > 1 ? "s" : ""} du jour à faire` : "Tâches du jour faites",
      open: "Touchez la cloche : votre carnet du jour et ses récompenses s'y trouvent.",
      vehicle: (name: string) => `+ 1 ${name.toLowerCase()}`,
    },
    daily: {
      title: "Tâches du jour",
      streak: (n: number) =>
        n > 0 ? `Série : ${n} jour${n > 1 ? "s" : ""}` : "Pas encore de série",
      chest: "Coffre du jour",
      chestHint:
        "Les trois tâches faites ouvrent le coffre ; chaque jour d'affilée l'agrandit (jusqu'à 5).",
      chestOpen: "Coffre ouvert : revenez demain pour prolonger la série.",
      resetsIn: (t: string) => `Nouvelles tâches dans ${t}`,
      claim: "Encaisser",
      tasks: {
        sell_city: "Vendre 3 fois à une ville",
        deliveries: "Livrer 2 commandes",
        urgent: "Livrer une commande urgente",
        many_deliveries: "Livrer 5 commandes",
        doge_order: "Honorer un contrat du Doge",
        place_offer: "Laisser une offre au Rialto",
        harvests: "Récolter 4 fois",
        build_site: "Livrer un grand chantier",
        criee: "Vendre à une Criée",
      } as Record<string, string>,
    },
    bales: {
      title: "Ballots de Faraj",
      kicker: "Présent d'Alexandrie",
      waiting: (n: number) =>
        n > 1 ? `${n} ballots vous attendent au quai` : "Un ballot vous attend au quai",
      next: (t: string) => `Prochain ballot dans ${t}`,
      full: "Le quai est plein : ouvrez-en un pour que le suivant parte d'Alexandrie",
      none: "Plus de ballot avant la fin du mois",
      arriving: "Un ballot arrive au quai…",
      count: (n: number, max: number) => `${n}/${max}`,
      lorenzo:
        "Lorenzo remonte du quai : « Un ballot pour vous, Messer, scellé de la marque de Faraj d'Alexandrie. »",
      story:
        "Votre grand-père a sauvé du naufrage, au large de Candie, la cargaison d'un jeune marchand d'Alexandrie. Faraj al-Iskandarani est devenu l'un des plus riches négociants du Levant, et il n'a pas oublié sa dette : toutes les six heures, une balle de toile cordée part pour votre comptoir. On ne sait jamais ce qu'elle contient : trois sacs de blé, ou un coupon de soie de Damas.",
      storyTitle: "Qui est Faraj ?",
      tapToOpen: "Touchez le sceau pour ouvrir",
      open: "Ouvrir le ballot",
      revealAll: "Tout révéler",
      tapCard: "Touchez une carte pour la retourner",
      stored: "Rangé au magasin",
      nextBale: (left: number) => `Ballot suivant (${left} restant${left > 1 ? "s" : ""})`,
      back: "Retour au comptoir",
      odds: "Probabilités",
      oddsTitle: "Ce que contient un ballot",
      oddsIntro: (cards: number, hours: number, max: number) =>
        `${cards} cartes par ballot, de 1 à 5 unités chacune. Un ballot toutes les ${hours} heures, ${max} au plus en attente au quai. Les ballots ne s'achètent pas.`,
      oddsOwn: "Votre propre matière première vient deux fois moins souvent.",
      perCard: "par carte",
      units: (q: number) => `×${q}`,
      rarity: {
        common: "Commun",
        uncommon: "Peu commun",
        rare: "Rare",
        epic: "Épique",
        legendary: "Légendaire",
      } as Record<string, string>,
    },
    criee: {
      kicker: "Criée du Rialto",
      title: (city: string, resource: string, pct: string) =>
        `${city} achète ${resource} à +${pct}`,
      endsIn: (t: string) => `Fin dans ${t}`,
      room: (mine: number, total: number) =>
        `Vous pouvez vendre ${mine} · il en reste ${total} pour tous`,
      sell: (q: number) => `Vendre ${q}`,
      none: "Rien à vendre en stock",
      soldOut: "Criée épuisée",
      help: "Trois fois par jour, à une heure imprévisible, une ville rachète une marchandise au-dessus du prix de référence pendant 20 minutes. Seuls ceux qui sont là en profitent.",
    },
    pass: {
      title: "Pass Négociant",
      coming: "Le Pass Négociant arrivera la saison prochaine.",
      active: (until: string) => `Actif jusqu'au ${until}`,
      upcoming: (from: string) => `Gagné : actif à partir du ${from}`,
      inactive: "Vous ne l'avez pas encore.",
      pitch:
        "De l'information à lire et de quoi se distinguer, rien de plus : ni ducats, ni marchandises, ni production, ni quota, ni offre de plus.",
      perks: {
        history: "Cours du Rialto sur 30 jours (7 pour tous)",
        dashboard: "Tableau de bord sur 30 jours (7 pour tous)",
        book: "Carnet d'ordres à 10 offres (5 pour tous)",
        cosmetics: "Sceau à côté de votre nom, palette « Or de Venise »",
      },
      trust:
        "Un abonné ne produit pas un grain de plus que vous : le Pass ne donne que de l'information et du cosmétique, et la simulation de saison le vérifie avant toute ouverture du paiement.",
      earn: "Le gagner sans payer : top 10 de la semaine (7 jours), top 10 de la saison (toute la saison suivante), top 10 % et 25 % (3 semaines, 1 semaine).",
      price: (season: string, week: string) => `${season} la saison · ${week} la semaine`,
      soon: "Achat bientôt disponible",
      seal: "Pass Négociant",
      paletteLocked: "Réservée au Pass Négociant",
    },
    ledger: {
      title: "Livre de compte",
      claim: "Encaisser",
      go: "Y aller",
      reward: "Récompense",
      allDone: "Objectifs du jour remplis. Revenez demain pour la suite.",
      next: (title: string, inTime: string) => `Prochain objectif « ${title} » dans ${inTime}.`,
      items: {
        first_delivery: [
          "Première livraison",
          "Touchez une charrette sur la carte, puis « Cargaisons » : cochez une commande et « Partir ». La ville paie à l'arrivée.",
        ],
        first_vehicle: [
          "Premier véhicule",
          "Achetez un véhicule dans « Bâtir », onglet « Véhicules » (améliorer une mule ne compte pas) : livrez plusieurs commandes à la fois.",
        ],
        first_contract: [
          "Honorer un contrat du Doge",
          "Dans « Cargaisons », les commandes marquées « Doge » paient 20 % de plus : livrez-en une.",
        ],
        first_offer: [
          "Laisser une offre au Rialto",
          "Au « Rialto », touchez une marchandise, puis « À mon prix ».",
        ],
        offer_taken: [
          "Conclure une offre",
          "Un marchand achète ou vend sur votre offre : suivez-la dans « Mes offres », au « Rialto ».",
        ],
        first_upgrade: [
          "Améliorer un atelier",
          "« Ateliers », puis « Améliorer » : le niveau 2 fait plus que doubler la production.",
        ],
        five_contracts: [
          "Honorer cinq contrats",
          "Le Doge passe de nouvelles commandes chaque jour, dans « Cargaisons ».",
        ],
        new_workshop: [
          "Construire un nouvel atelier",
          "« Bâtir », au comptoir : agrandissez votre domaine.",
        ],
        three_deliveries: [
          "Livrer trois commandes",
          "Une deuxième charrette vous attend : deux commandes à la fois.",
        ],
        three_upgrades: [
          "Améliorer trois fois",
          "Dans « Ateliers », chaque niveau produit plus : le niveau 2 coûte moitié moins de matériaux.",
        ],
        first_palace: [
          "Bâtir un palais",
          "« Bâtir » : le palais compte à son coût dans le patrimoine et se voit de loin.",
        ],
      } as Record<string, [string, string]>,
    },
    welcome: {
      kicker: "Absent",
      title: "Bon retour au comptoir",
      slept: "Votre comptoir s'est mis en sommeil : vos ouvriers n'ont ni mangé ni connu la faim.",
      /** The week closed while away: where the merchant finished, and its title. */
      week: {
        title: (n: number) => `Semaine ${n + 1}`,
        rank: (rank: number, award: string | null) =>
          `Vous terminez ${rank}${rank === 1 ? "er" : "e"}${award ? ` — ${award}` : ""}`,
        gain: (amount: string) => `${amount} de ventes nettes dans la semaine`,
        award: "Le titre entre à votre palmarès, visible de tous les marchands.",
      },
      /** What the fattore sent while away. */
      fattore: (qty: number, what: string, city: string, paid: string | null, pct: number) =>
        `Le fattore a envoyé ${qty} ${what.toLowerCase()} à ${city}${paid ? ` (${paid}, −${pct} %)` : " (en route)"}`,
      earned: "Gagné",
      commerce: "Commerce",
      nothing: "Rien de vendu depuis votre dernière visite.",
      terra: {
        title: "Terraferme",
        glory: (glory: number, rank: number) =>
          `${glory} Gloire · ${rank}${rank === 1 ? "er" : "e"}`,
        gained: (n: number) => `${n} case${n > 1 ? "s" : ""} prise${n > 1 ? "s" : ""}`,
        lost: (n: number) => `${n} case${n > 1 ? "s" : ""} perdue${n > 1 ? "s" : ""}`,
        fronts: (n: number, spent: number) =>
          `${n} front${n > 1 ? "s" : ""} rentré${n > 1 ? "s" : ""}${spent > 0 ? ` (−${spent} troupes dépensées)` : ""}`,
        troops: (troops: number, cap: number, perHour: number, cells: number) =>
          `${troops} / ${cap} troupes · +${perHour}/h sur ${cells} case${cells > 1 ? "s" : ""}`,
        eliminated: "Vous avez perdu toutes vos terres : revenez lundi pour la prochaine partie.",
      },
      sources: {
        city_sale: "Ventes aux villes",
        trade: "Ventes au Rialto",
        market_maker_buy: "Ventes à la Dogana",
        contract_reward: "Contrats du Doge",
        project_delivery: "Commandes de compagnie",
        project_bonus: "Primes de compagnie",
        mission_reward: "Livre de compte",
        family_order_reward: "Commandes de famille",
        guild_dividend: "Dividendes de guilde",
        guild_payout: "Trésor de guilde partagé",
        decree_favour: "Faveur d'une ville",
        supplier_bonus: "Fournisseur officiel",
        tender_delivery: "Appels d'offres du Doge",
        quality_premium: "Qualité des manufactures",
        commission: "Commandes entre marchands",
        colleganza_share: "Parts de colleganza",
        loan: "Prêts de la Banque",
        decree_share: "Part des décrets",
        delivery: "Livraisons",
      } as Record<string, string>,
      road: {
        arrived: (n: number) => `${n} livraison${n > 1 ? "s" : ""} arrivée${n > 1 ? "s" : ""}`,
      },
      notices: (kind: string, n: number) =>
        ({
          order: `${n} offre${n > 1 ? "s" : ""} conclue${n > 1 ? "s" : ""}`,
          harvest: "Récoltes prêtes",
          event: `${n} nouvelle${n > 1 ? "s" : ""} à la gazette`,
          act: "Un nouvel acte de la saison",
          week: "Résultats de la semaine",
          family: "Nouvelles de la famille",
          siege: `${n} terre${n > 1 ? "s" : ""} menacée${n > 1 ? "s" : ""}`,
          delivery: `${n} livraison${n > 1 ? "s" : ""} payée${n > 1 ? "s" : ""}`,
        })[kind] ?? `${n} × ${kind}`,
      collect: (n: number) => `Tout récolter et relancer · ${n} lot${n > 1 ? "s" : ""}`,
      restart: "Relancer mes ateliers",
    },
    stock: "Mon stock",
    workshops: "Mes ateliers",
    level: (n: number) => `Niv. ${n}`,
    idle: "À l'arrêt",
    done: "Terminé",
    batch: (current: number, total: number) => `Lot ${current}/${total}`,
    harvest: (n: number) => (n > 1 ? `Récolter ${n} lots` : "Récolter"),
    produce: "Produire",
    batchesLabel: "Lots à lancer",
    fastBatch: (seconds: number) => `Premier lot offert par Lorenzo : prêt en ${seconds} s`,
    missingInputs: "Matières insuffisantes : achetez-en au Marché.",
    upgrade: "Améliorer",
    upgradeTo: (level: number) => `Passer au niveau ${level}`,
    upgradeEffect: (bonus: number) =>
      `Chaque lot produit davantage, avec une prime de rendement de +${bonus} % : à matières égales, un grand atelier rapporte plus que plusieurs petits. Vos ouvriers mangent aussi davantage de pain.`,
    localRaw: (raw: string) =>
      `Matière première de votre région : ${raw}. Les autres ne s'extraient pas ici : achetez-les au Rialto.`,
    outOfRegion: "Hors de sa région : il produit encore, mais ne peut plus être amélioré.",
    build: "Construire",
    buildTitle: "Nouvel atelier",
    /** The catalogue of what can be built, in cards (workshops, vehicles). */
    catalog: {
      title: "Construire",
      tabs: { workshops: "Ateliers", vehicles: "Véhicules" },
      plots: (used: number, max: number) => `Parcelles occupées : ${used}/${max}`,
      fleet: (owned: number, max: number) => `Véhicules : ${owned}/${max}`,
      built: (n: number) => `Bâtis ${n}`,
      owned: (n: number) => `Possédés ${n}`,
      batch: (time: string) => `Un lot : ${time}`,
      onlyIn: (regions: string) => `Seulement en ${regions}`,
      unlockAt: (title: string) =>
        `S'ouvre au titre ${/^[aeiouyéèêh]/i.test(title) ? "d'" : "de "}${title}`,
      missing: "Il vous manque des ducats ou des matériaux.",
      upgradeOf: (from: string, cost: string) => `S'obtient en améliorant : ${from} (${cost})`,
      roles: {
        farm: "Fait pousser le blé de la Terraferme : le début de la chaîne du pain.",
        clay_pit: "Extrait l'argile de la Lagune, que la briqueterie cuit en briques.",
        lumber_camp:
          "Abat le bois des Dolomites : les planches, et le combustible des fours de tous.",
        mill: "Moud le blé en farine pour les boulangers.",
        bakery:
          "Cuit le pain : la plus grosse demande des villes, et la ration de tous les ouvriers.",
        brickworks: "Cuit l'argile en briques, qui servent à bâtir et agrandir tous les ateliers.",
        sawmill: "Scie le bois en planches, qui servent à bâtir et agrandir tous les ateliers.",
        palazzo:
          "Prestige : ne produit rien. Compte à son coût dans le patrimoine, pas dans le classement (ventes nettes).",
        sand_pit: "Tire le sable de la lagune, que la verrerie fond en verre.",
        glassworks: "Le verre de Murano : sable et bois fondus, pour la miroiterie.",
        mirrorworks: "Argente le verre en miroirs, que les palais des villes paient cher.",
        sheepfold: "Tond la laine des troupeaux, pour le métier à tisser.",
        loom: "Tisse la laine en drap, que le tailleur coupe.",
        tailor: "Coupe le drap en vêtements, le luxe des villes de la Terraferme.",
        spicery: "Prépare les épices de la Muda : les villes les paient presque le double.",
      } as Record<string, string>,
      vehicleRoles: {
        mule: "Lente mais bon marché : tout véhicule commence mule.",
        cart: "Porte davantage, à bonne allure.",
        wagon: "Pour les grosses commandes, et plus rapide.",
        great_wagon: "Le plus grand et le plus rapide.",
      } as Record<string, string>,
    },
    maxBuildings: (n: number) => `Maximum de ${n} bâtiments atteint.`,
    palazzoHelp:
      "Prestige : ne produit rien. Compte à son coût dans le patrimoine, pas dans le classement (ventes nettes).",
    rationsOfLevel: (loaves: number) => `Ouvriers : +${loaves} pains/jour`,
    cost: "Coût",
    missing: "manque",
    close: "Fermer",
    loading: "Ouverture du comptoir…",
    retry: "Réessayer",

    marketTabs: { joueurs: "Rialto", villes: "Villes" },
    featured: "Plus forte hausse",
    buyAt: "Achat",
    sellAt: "Vente",
    /** A stock under a name: « 40 en stock » (« 3 / 5 en stock » against a need). */
    inStock: (n: number) => `${n} en stock`,
    buy: "Acheter",
    sell: "Vendre",
    trade: "Échanger",
    noOffer: "Aucune offre",
    maxCost: (amount: string) => `Coût maximal : ${amount}`,
    marketHelp: (slippage: number, tax: number) =>
      `« Tout de suite » : au meilleur prix du carnet (écart maximal ${slippage} %). « À mon prix » : votre offre attend un preneur jusqu'à 72 h. Taxe de ${tax} % payée par le vendeur entre joueurs ; aucune avec la Dogana.`,
    book: {
      sellers: "Ils vendent",
      buyers: "Ils achètent",
      empty: "Personne",
      fondaco: "Dogana",
      you: "Vous",
      quota: (buy: string, sell: string) =>
        `Dogana aujourd'hui, pour cette marchandise : encore ${buy} à acheter, ${sell} à lui vendre.`,
      /** What an order right away can take now, from the book and the Dogana's quota. */
      nowMax: (buy: number, sell: number) =>
        `Tout de suite : jusqu'à ${buy} à l'achat, ${sell} à la vente (offres du carnet dans l'écart et quota de la Dogana).`,
      /** The bounds of an order right away, on each side. */
      bounds: (cost: string | null, proceeds: string | null, tax: number) =>
        [
          cost ? `Coût max. à l'achat : ${cost}` : null,
          proceeds ? `Recette min. à la vente : ${proceeds} (taxe ${tax} % déduite)` : null,
        ]
          .filter(Boolean)
          .join(" · "),
      /** A purchase lowers the net sales, the ranking. */
      rankCost: (amount: string) => `Acheter : −${amount} sur vos ventes nettes (classement).`,
      rules:
        "Tout de suite : au meilleur prix du carnet. À mon prix : votre offre attend un preneur.",
      more: "En savoir plus",
      dogana: (pct: number) => `Cours de la Dogana : ${pct} % du prix de référence`,
      fondacoHelp:
        "La Dogana, la douane de la République, achète et vend chaque ressource de base en quantité limitée par marchand et par jour. Son cours suit l'offre et la demande : il monte quand les marchands lui achètent plus qu'ils ne lui vendent, baisse dans le cas contraire, et revient peu à peu au prix de référence.",
      now: "Tout de suite",
      myPrice: "À mon prix",
      price: "Prix unitaire (ducats)",
      postBuy: "Proposer d'acheter",
      postSell: "Mettre en vente",
      reserved: (amount: string) => `Réservé jusqu'à la conclusion : ${amount}`,
      myOffers: "Mes offres",
      offerLine: (side: "buy" | "sell", qty: number, what: string, price: string) =>
        `${side === "sell" ? "Vends" : "Achète"} ${qty} ${what.toLowerCase()} à ${price}`,
      cancel: "Annuler",
      expires: (left: string) => `expire dans ${left}`,
      /** What an order "right away" traded, said after it. */
      instantDone: (
        side: "buy" | "sell",
        filled: number,
        requested: number,
        what: string,
        amount: string,
        reason: "quota" | "depth" | null,
        slippage: number,
      ) => {
        const verb =
          side === "sell" ? (filled > 1 ? "vendus" : "vendu") : filled > 1 ? "achetés" : "acheté";
        if (filled >= requested)
          return `${side === "sell" ? "Vente" : "Achat"} : ${filled} ${what.toLowerCase()} pour ${amount}.`;
        const why =
          reason === "quota"
            ? "quota de la Dogana atteint pour aujourd'hui"
            : side === "sell"
              ? `aucun autre acheteur dans l'écart de ${slippage} %`
              : `aucun autre vendeur dans l'écart de ${slippage} %`;
        return filled > 0
          ? `${filled} ${verb} sur ${requested} (${amount}) : ${why}.`
          : `0 ${side === "sell" ? "vendu" : "acheté"} : ${why}.`;
      },
      offerPosted: (side: "buy" | "sell", qty: number, what: string, price: string) =>
        `Offre posée : ${side === "sell" ? "" : "achat de "}${qty} ${what.toLowerCase()} à ${price}.`,
    },
    cityTitle: "Les villes achètent",
    cityHelp:
      "Le prix baisse quand on vend beaucoup dans la journée, puis remonte au fil des heures.",
    cityPays: "Paie l'unité",
    sellToCity: "Vendre",
    iconsTitle: "Les icônes",

    projectsKicker: "Grand chantier",
    projectTitle: (city: string) => `Chantier de ${city}`,
    endsIn: "Se termine dans",
    perUnit: "l'unité",
    deliver: "Livrer",
    noProject: "Aucun grand chantier en cours. Le prochain ouvre en début de semaine.",
    projectsHelp: "Les villes paient les matériaux livrés un peu au-dessus du prix de référence.",

    topKicker: "Saison en cours",
    topTitle: "Classement des marchands",
    closesIn: "Clôture dans",
    myRank: "Votre rang",
    you: "Toi",
    notices: {
      title: "Nouvelles du comptoir",
      empty:
        "Rien de neuf pour l'instant. Les récoltes, les livraisons, la gazette et les résultats de la semaine s'afficheront ici.",
      now: "à l'instant",
      settings: "Régler les notifications",
      harvest: "Récolte prête : vos ateliers ont terminé leur production.",
      event: "Un événement agite les marchés.",
      seasonEnding: "Dernier sprint : la saison se termine dans 3 jours.",
      seasonOpened: (name: string) => `${name} commence : venez voir vos récompenses.`,
      criee: (city: string, what: string, pct: number) =>
        `Criée : ${city} achète ${what} à +${pct} % pendant 20 minutes.`,
      deal: (what: string, price: string) => `Bonne affaire : ${what} à ${price} au Rialto.`,
      order: (who: string, sold: boolean, qty: number, what: string) =>
        sold
          ? `Offre conclue : ${who} a acheté ${qty} ${what.toLowerCase()}.`
          : `Offre conclue : ${who} vous a vendu ${qty} ${what.toLowerCase()}.`,
      delivery: (qty: number, what: string, city: string, amount: string) =>
        `${qty} ${what} livrés à ${city} : ${amount} encaissés.`,
      muda: (goods: string) =>
        `Les galères de la Muda sont à quai : la Dogana vend ${goods || "les marchandises d'outre-mer"} au Rialto.`,
      siege: (land: string, by: string, lances: number, time: string) =>
        `${land} menacée : ${lances} troupes ${by} arrivent à ${time}. Renforcez la garnison !`,
      family: (event: string, data: Record<string, string>) =>
        event === "skirmish_aborted"
          ? skirmishInterrupted
          : event === "land_lost"
            ? `${data.land} est perdue, prise par ${data.by}.`
            : event === "decree_share"
              ? `Votre part des décrets : ${data.amount}.`
              : data.won === "1"
                ? `Votre famille gagne la semaine${data.decrees ? ` et impose ${data.decrees}` : ""} !`
                : data.winner
                  ? `Les ${data.winner} gagnent la semaine${data.decrees ? ` et imposent ${data.decrees}` : ""}.`
                  : "La semaine se termine sans vainqueur.",
      week: (week: number, rank: number, gain: string, award: string | null) =>
        `Semaine ${week} : vous terminez ${rank}${rank === 1 ? "er" : "e"} (${gain}).${award ? ` Vous êtes ${award} !` : ""}`,
      push: {
        title: "Notifications",
        help: "Recevez une alerte sur ce téléphone ou cet ordinateur, même jeu fermé. Jamais entre 22 h et 8 h, et au plus une par type et par heure, sauf les terres menacées, envoyées tout de suite.",
        enable: "Activer sur cet appareil",
        disable: "Couper sur cet appareil",
        on: "Activées sur cet appareil",
        denied:
          "Votre navigateur bloque les notifications de Fondaco. Autorisez-les dans ses réglages.",
        unsupported: "Ce navigateur ne gère pas les notifications.",
        homeScreen:
          "Sur iPhone, ajoutez d'abord Fondaco à l'écran d'accueil (Partager → Sur l'écran d'accueil), puis ouvrez-le depuis l'icône.",
        unavailable: "Les notifications ne sont pas encore activées sur ce serveur.",
        kinds: {
          harvest: "Récolte prête",
          order: "Offres conclues au marché",
          event: "Gazette (nouvel événement)",
          act: "Nouvel acte de la saison",
          week: "Résultats de la semaine",
          season: "Fin et ouverture de saison",
          family: "Résultats de la Campagne et terres perdues",
          siege: "Terre menacée (alerte immédiate)",
          delivery: "Livraison arrivée",
          muda: "Galères de la Muda à quai",
        } as Record<string, string>,
      },
    },
    week: {
      tab: "Semaine",
      seasonTab: "Saison",
      kicker: (n: number) => `Semaine ${n}`,
      title: "Classement de la semaine",
      lastWeek: "Podium de la semaine dernière",
      awards: {
        doge: "Doge de la semaine",
        procurator: "Procurateur",
        senator: "Sénateur",
      } as Record<string, string>,
      help: "Ventes nettes depuis le début de la semaine (ou depuis votre arrivée), en ducats : ce que vous avez vendu, moins ce que vous avez acheté. Chaque semaine, les trois meilleurs marchands (hors PNJ) reçoivent un titre : Doge, Procurateur et Sénateur de la semaine.",
    },
    season: {
      closed: (name: string) => `La saison ${name} est close`,
      rankOf: (rank: number, players: number) =>
        `${rank}${rank === 1 ? "er" : "e"} sur ${players} marchand${players > 1 ? "s" : ""}`,
      worth: "Ventes nettes de la saison",
      podium: "Le podium",
      rewards: "Vos récompenses",
      passSeason: "Pass Négociant pour toute la nouvelle saison",
      passDays: (n: number) => `${n} jours de Pass Négociant`,
      renown: (n: number) => `+${n} de Renommée`,
      milestone: (name: string, n: number) => `Palier ${name} : +${n} de Renommée`,
      goal: {
        title: "Objectif de saison",
        now: (name: string, n: number) =>
          n > 0
            ? `${name} : +${n} de Renommée assurés à la fin du mois.`
            : `${name} : pas encore de Renommée de palier.`,
        next: (name: string, worth: string, n: number) =>
          `Prochain palier : ${name}, à ${worth} de ventes nettes (+${n} de Renommée), quel que soit votre rang.`,
        top: "Plus haut palier atteint : tenez-le jusqu'à la fin du mois.",
      },
      renownTotal: (name: string, points: number) => `${name} · ${points} points de Renommée`,
      nothing: "Jouez au moins 7 jours dans une saison pour recevoir l'écusson de participant.",
      start: "Ouvrir mon nouveau comptoir",
      newSeason: (name: string) =>
        `${name} commence : tout le monde repart de zéro. Votre palmarès et votre Renommée vous suivent.`,
      lastSprint: (days: number) =>
        `Dernier sprint : la saison se termine dans ${days} jour${days > 1 ? "s" : ""}.`,
      honoured: (pseudo: string, season: string) => `${pseudo}, Doge de ${season}`,
    },
    palmares: {
      title: "Palmarès",
      renown: "Renommée",
      renownHelp:
        "La Renommée s'accumule de saison en saison selon votre rang final. Elle donne des titres, jamais d'avance économique : chaque saison, tout le monde repart à égalité.",
      nextRenown: (name: string, missing: number) => `${missing} points avant « ${name} »`,
      seasons: "Saisons",
      weeks: "Semaines classées",
      bestWeek: "Meilleur rang hebdo",
      podiums: "Podiums hebdo",
      wins: "Doge de la semaine",
      noSeason:
        "Aucune saison terminée pour l'instant : le classement final se fige le dernier jour du mois.",
      latestWeeks: "Dernières semaines",
      weekOf: (week: number, season: string) => `Semaine ${week} · ${season}`,
      open: "Voir le palmarès",
    },
    npc: "PNJ",
    npcHelp:
      "PNJ : maisons marchandes tenues par l'ordinateur, avec les mêmes règles que vous. Elles animent le monde tant qu'il compte peu de joueurs et se retirent à mesure que de vrais marchands arrivent.",
    anonymous: "Marchand anonyme",
    rankingHelp:
      "Ventes nettes = tout ce que vous avez vendu (Rialto, Dogana, livraisons, commandes du Doge), taxes et péages déduits, moins tout ce que vous avez acheté. Le stock et les bâtiments ne comptent pas.",

    house: {
      card: "Votre Maison",
      titleOf: (name: string) => `Titre de la saison : ${name}`,
      renownOf: (n: number) => `Renommée ${n.toLocaleString("fr-FR")}`,
      influenceOf: (n: number) => `${n.toLocaleString("fr-FR")} d'Influence`,
      more: "Voir le détail",
      less: "Replier",
      title: "Livre de la Maison",
      influence: "Influence",
      intro:
        "Votre fortune repart à zéro chaque saison, votre Maison non : l'Influence se garde de saison en saison et achète des privilèges : des avantages gardés pour toujours, qui ouvrent du neuf sans jamais rapporter plus.",
      earn: "Elle ne s'achète pas et ne se gagne pas en vendant : seulement par les missions de la Maison, dix tous les trois jours et demi.",
      open: "Ouvrir le livre",
      balance: (n: number) => `${n} d'Influence`,
      catalog: "Privilèges",
      owned: "Acquis",
      buy: (cost: number) => `Acheter · ${cost}`,
      requires: (names: string) => `D'abord : ${names}`,
      bought: (name: string) => `Privilège acquis : ${name}`,
      history: "Derniers mouvements",
      none: "Rien encore : accomplissez une mission de la Maison.",
      sources: {
        commerce: (week: number | null) => `Ventes nettes · semaine ${(week ?? 0) + 1}`,
        campaign: (week: number | null) => `Campagne · semaine ${(week ?? 0) + 1}`,
        season: () => "Fin de saison",
        patent: () => "Privilège",
        refund: () => "Remboursement",
        mission: () => "Mission de la Maison",
        spend: () => "Dépense",
      } as Record<string, (week: number | null) => string>,
      patents: {
        gilded_name: {
          name: "Nom doré",
          text: "Votre nom en lettres d'or dans les classements, pour toujours.",
        },
        alexandria: {
          name: "Comptoir d'Alexandrie",
          text: "Les commandes du Levant, à plusieurs marchandises.",
        },
        tedeschi: {
          name: "Fondaco dei Tedeschi",
          text: "Les marchands allemands achètent à Venise.",
        },
        lombardy: {
          name: "Lombardie",
          text: "Brescia et Bergame deviennent des villes de commerce.",
        },
        friuli: { name: "Frioul", text: "Udine et Pordenone deviennent des villes de commerce." },
        wool: { name: "Art de la laine", text: "La chaîne du drap : laine, puis drap." },
        glass: { name: "Art du verre", text: "La chaîne du verre de Murano." },
      } as Record<string, { name: string; text: string }>,
      missions: {
        title: "Missions de la Maison",
        renews: (t: string) => `Nouvelles missions dans ${t}`,
        claim: (n: number) => `Recevoir · ${n} ✦`,
        claimed: "Reçue",
        reward: (n: number) => `${n} ✦`,
        names: {
          deliveries: (n: number) => `Livrer ${n} commandes`,
          many_deliveries: (n: number) => `Livrer ${n} commandes`,
          urgent: (n: number) => `Livrer ${n} commandes urgentes`,
          doge: (n: number) => `Honorer ${n} contrats du Doge`,
          offers: (n: number) => `Laisser ${n} offres au Rialto`,
          rialto: (n: number) => `Voir ${n} de vos offres prises au Rialto`,
          harvests: (n: number) => `Récolter ${n} fois`,
          upgrade: () => "Agrandir un atelier",
          build: () => "Bâtir un atelier",
          vehicle: () => "Améliorer un véhicule",
          chests: (n: number) => `Ouvrir ${n} coffres du jour`,
          bales: (n: number) => `Ouvrir ${n} ballots de Faraj`,
          levy: (n: number) => `Lever ${n} fois l'impôt de la famille`,
          marches: (n: number) => `Envoyer ${n} marches`,
          assault: () => "Gagner un assaut",
          defence: () => "Défendre une terre",
          work: () => "Bâtir un ouvrage",
        } as Record<string, (n: number) => string>,
      },
      spend: {
        rush: "Accélérer",
        rushLine: (out: boolean, n: number) =>
          out
            ? `Accélérer : livraison et retour immédiats · ${n} ✦`
            : `Accélérer : retour immédiat · ${n} ✦`,
        rushHelp: (left: number) =>
          left > 0
            ? `Livrée tout de suite, payée comme d'habitude, et le véhicule rentre aussitôt. Encore ${left} aujourd'hui.`
            : "Plus d'accélération aujourd'hui.",
        troops: (count: number, cost: number) => `+${count} · ${cost} ✦`,
        troopsTitle: "Troupes pour de l'Influence",
        troopsHelp: (left: number) =>
          left > 0
            ? `En plus des ducats. Encore ${left} aujourd'hui.`
            : "Plus de troupes aujourd'hui.",
        work: (n: number) => `Achever · ${n} ✦`,
        respec: (n: number) => `Changer de maîtrise · ${n} ✦`,
        respecTitle: (name: string) => `Maîtrise : ${name}`,
        respecHelp: "Vous la choisissez de nouveau aussitôt, parmi toutes.",
        reroll: (n: number) => `Changer de tâche · ${n} ✦`,
        /** The same on a phone's narrow line: the sign of a change and its price. */
        rerollShort: (n: number) => `↻ ${n} ✦`,
      },
    },
    profileTitle: "Ma progression",
    nextTitle: (name: string) => `Prochain titre : ${name}`,
    maxTitle: "Titre suprême atteint",
    netWorth: "Patrimoine",
    turnover: "Ventes nettes",
    merchantLevel: {
      short: (n: number) => `Niv. ${n}`,
      title: (n: number) => `Niveau ${n}`,
      progress: (xp: string, to: string) => `${xp} / ${to} points`,
      help: "Votre niveau ne redescend jamais : chaque ducat de ventes nettes vous rapporte un point, saison après saison. Il est honorifique : aucun avantage en jeu, chaque saison tout le monde repart à égalité.",
    },
    cash: "Caisse",
    stockValue: "Stocks",
    buildingsValue: "Bâtiments",
    statsTitle: "Mes chiffres",
    stats: {
      rank: "Rang",
      buildings: "Ateliers",
      trades: "Échanges",
      citySold: "Vendus aux villes",
      delivered: "Livrés aux chantiers",
      days: "Jours joués",
    },
    trophies: "Trophées",
    editCrest: "Modifier",
    crestTitle: "Mon blason",
    shape: "Forme",
    color: "Émail",
    symbol: "Meuble",
    save: "Enregistrer",
    help: "Comment jouer",
    version: (build: string, at: string) => `Version ${build} · ${at}`,
    data: {
      title: "Mes données",
      help: "Téléchargez tout ce que le jeu conserve sur vous, ou supprimez votre compte.",
      export: "Télécharger mes données",
      ledgerCsv: "Livre de compte (CSV, pour un tableur)",
      delete: "Supprimer mon compte",
      deleteText:
        "Votre adresse, votre nom, votre blason, vos notifications et votre historique d'activité seront effacés, et vous serez déconnecté. Votre comptoir reste dans la saison en cours sous le nom « Marchand anonyme », pour que les échanges des autres joueurs restent justes. C'est définitif.",
      typeToConfirm: "Tapez SUPPRIMER pour confirmer",
      confirm: "Supprimer définitivement",
    },
    reset: {
      title: "Recommencer ma partie",
      text: "Vos ateliers, vos stocks et vos ducats seront effacés : vous repartirez de zéro avec 1 000 ducats et pourrez choisir un autre métier. Possible une seule fois par saison.",
      confirm: "Oui, tout recommencer",
      cancel: "Annuler",
    },
    replayIntro: "Revoir l'introduction",
    replayGuide: "Relancer le guide",
    haptics: "Vibrations",
    sound: "Sons",
    soundHint: "Une pièce qui sonne, une récolte, une charrette qui part, la cloche des avis.",
    hapticsHint:
      "Un léger retour quand une action réussit, une alerte en cas d'abordage. Sur iPhone, seulement un petit clic.",
    palette: "Palette",
    paletteHint: "Change les couleurs du jeu sur cet appareil.",

    side: {
      title: "Le commerce du jour",
      orders: "Commandes",
      workshops: "Ateliers",
      market: "Marché",
      covered: "stock suffisant",
      noOrders: "Aucune commande ouverte pour l'instant.",
      keys: "Clavier : R récolter et relancer · A ateliers · M marché · C cargaisons · 1–9 un atelier · Échap fermer",
    },
    unlocks: {
      afterDelivery: "S'ouvre après votre première livraison.",
      force: "Touchez encore pour l'ouvrir maintenant.",
      afterFirstDay:
        "La Terraferme, conquête de la semaine, s'ouvre après votre première journée de commerce. Facultative : on n'y perd jamais rien.",
    },
    coach: {
      name: "Lorenzo, votre facteur",
      later: "Plus tard",
      step: (n: number, total: number) => `Objectif ${n}/${total}`,
      covered: "Fermez cette fenêtre pour continuer : ce que je vous montre est dessous.",
      produceTap: (building: string) =>
        `Lançons votre ${building.toLowerCase()} ! Touchez « Produire » : il attend du travail.`,
      tapHome: "Touchez votre comptoir, au centre de la carte : vos ateliers s'y trouvent.",
      openWorkshops: (building: string) =>
        `Lançons votre ${building.toLowerCase()} ! Ouvrez vos ateliers.`,
      produce: (building: string) =>
        `Touchez « Produire » : ce premier lot de votre ${building.toLowerCase()} sera prêt en 30 secondes.`,
      wait: "Vos ouvriers s'activent. Patientez quelques secondes…",
      harvest: "C'est prêt ! Touchez « Récolter » : la marchandise rentre en stock.",
      transform: (building: string) =>
        `Une matière brute vaut peu. Transformez-la : lancez votre ${building.toLowerCase()}.`,
      sellCity: (resource: string) =>
        `Vendez vos ${resource.toLowerCase()} à la ville qui paie le mieux.`,
      goRoutes:
        "Les villes passent commande : les pastilles dorées montrent celles que votre stock couvre. Touchez une charrette.",
      deliver:
        "Ouvrez les cargaisons : cochez une commande que votre stock couvre, la ville paie à l'arrivée.",
      dispatch: "Touchez « Partir » (ou laissez filer le compte à rebours).",
      welcomeEnRoute: (left: string) =>
        `Les routes sont dégagées ce matin : arrivée dans ${left}. La ville paiera à l'arrivée.`,
      enRoute: (left: string) => `Votre charrette est en route : arrivée dans ${left}.`,
      firstPay: "Première paie",
      goRialto:
        "Pour grandir, il faut les matériaux d'une autre région. Touchez Venise, puis le Rialto.",
      buy: (resource: string) =>
        `Achetez quelques ${resource.toLowerCase()} : ils servent à améliorer vos ateliers.`,
      emptyMarket:
        "Personne ne vend rien au Rialto pour l'instant et votre part de la Dogana est épuisée pour aujourd'hui. Passons, vous achèterez plus tard.",
      skip: "Passer",
      goComptoir: "Retour au comptoir pour investir.",
      invest: "Améliorez un atelier : il produira davantage à chaque lot.",
      ledger:
        "Voici votre Livre de compte : chaque jour, de nouveaux objectifs et leur récompense. Encaissez la première !",
      ledgerLater:
        "Votre Livre de compte, sous la cloche des Avis, vous donne vos objectifs du jour. Remplissez-les pour gagner des récompenses.",
      investLater:
        "Il vous faut encore des briques et des planches pour améliorer un atelier. Produisez, vendez, achetez : c'est la boucle du marchand !",
      done: "Bravo, vous connaissez la boucle : produire, vendre, réinvestir. Revenez récolter au moins toutes les 12 heures : lancez la production le soir, elle tourne toute la nuit.",
      finish: "Terminer",
    },

    /** Company orders: a city's order filled by several merchants together. */
    company: {
      title: "Commande de compagnie",
      of: (city: string) => `Commande de compagnie · ${city}`,
      line: "+10 % par unité · +10 % une fois remplie",
      help: "Une ville commande du pain, des briques et des planches aux trois régions. Chaque unité livrée est payée 10 % au-dessus de la référence ; quand la commande est remplie, chaque marchand qui a livré touche 10 % de plus.",
      endsIn: (time: string) => `se termine dans ${time}`,
      filled: "Remplie : la prime est versée",
      merchants: (n: number) =>
        n === 0
          ? "personne n'y a encore livré"
          : n === 1
            ? "1 marchand y a livré"
            : `${n} marchands y ont livré`,
      mine: (amount: string) => `Vous : ${amount}`,
      deliver: (n: number) => `Livrer ${n}`,
      none: "Aucune commande de compagnie en cours.",
    },
    /** The Rapport de la Banque de Venise, in the help. */
    bank: {
      title: "Rapport de la Banque de Venise",
      help: "La monnaie du monde, publiée : ce que les marchands détiennent et ce que la semaine a créé et détruit. Rien ne s'achète en euros qui fasse gagner.",
      perMerchant: (held: string, start: string, n: number) =>
        `${held} par marchand actif (capital de départ : ${start}), ${n} marchands actifs`,
      created: "Créé en 7 jours :",
      destroyed: "Détruit en 7 jours :",
      net: (net: string) => `Solde de la semaine : ${net}`,
      reasons: {
        delivery: "livraisons",
        city_sale: "villes",
        contract_reward: "contrats",
        project_delivery: "compagnie",
        project_bonus: "primes",
        mission_reward: "missions",
        daily_reward: "tâches",
        starting_capital: "capitaux",
        market_maker_buy: "Dogana",
        market_maker_sell: "Dogana",
        market_tax: "taxe",
        construction: "chantiers",
        vehicle: "véhicules",
        terraferma: "Terraferme",
        fattore: "fattore",
        decree_favour: "faveurs",
      } as Record<string, string>,
    },
    /** The season's chronicle, a card to share at the closing ceremony. */
    chronicle: {
      share: "Partager ma chronique",
      who: (pseudo: string, rank: number, of: number) =>
        `${pseudo}, ${rank}${rank === 1 ? "er" : "e"} marchand sur ${of}`,
      sales: (amount: string) => `${amount} de ventes nettes`,
      title: (name: string) => `Titre : ${name}`,
      award: (name: string) => `Distinction : ${name}`,
      renown: (name: string) => `Renommée de la Maison : ${name}`,
      footer: "Un jeu de commerce honnête · une saison par mois",
    },
    /** The Journal du Rialto, in the notices. */
    journal: {
      title: "Journal du Rialto",
      empty: "Rien de marquant depuis hier.",
      minutes: (n: number) => `${n} min`,
      hours: (n: number) => `${n} h`,
      someone: "un marchand",
      trade: (buyer: string, seller: string, qty: number, good: string, value: string) =>
        `${buyer} achète ${qty} ${good.toLowerCase()} à ${seller} pour ${value}`,
      company: (city: string, n: number) =>
        `La commande de compagnie de ${city} est remplie par ${n} marchand${n > 1 ? "s" : ""}`,
      conquest: (who: string, cells: number) =>
        `${who} prend ${cells} terre${cells > 1 ? "s" : ""} en Terraferme`,
      milan: (cells: number) => `Milan prend ${cells} terre${cells > 1 ? "s" : ""} en Terraferme`,
      signore: (who: string, conquest: boolean) =>
        `${who} devient Signore de la Terraferme${conquest ? ", par conquête" : ""}`,
      noSignore: "La semaine de la Terraferme se clôt sans Signore",
      community: "Rejoindre la communauté des marchands →",
    },
    /** Lorenzo's three bubbles at the first visit to the Terraferma. */
    terraIntro: {
      who: "Lorenzo",
      steps: [
        "Bienvenue en Terraferme ! Touchez une terre libre pour poser votre camp : il prend la case et ses voisines, et vous êtes à l'abri 12 heures.",
        "Pour vous étendre, touchez une terre au bord des vôtres, choisissez vos troupes avec le curseur, puis « Attaquer » : le front avance seul, même quand vous partez.",
        "Revenez voir vos fronts : leur pastille dorée dit quand ils prennent la prochaine case. Et ce soir à 20 h, l'heure de bataille : tout va dix fois plus vite !",
      ],
      next: "Suivant",
      done: "Compris",
      guide: "Lire le guide",
    },
    /** The Terraferma's guide, with its diagrams. */
    terraGuide: {
      kicker: "Guide",
      title: "La Terraferme",
      open: "Guide de la Terraferme",
      openShort: "? Guide",
      cardText: "Le mode conquête expliqué pas à pas, avec des schémas.",
      intro:
        "Une conquête d'une semaine, à côté du commerce, sur la carte de la Vénétie découpée en cases. Facultative : vous n'y perdez jamais vos ducats ni vos marchandises. Les fronts avancent seuls, de 8 h à 22 h, même quand vous n'êtes pas là.",
      sections: [
        {
          diagram: "setDown",
          title: "Se poser",
          text: "Touchez une terre libre : votre camp prend la case et ses six voisines. Vous êtes à l'abri 12 heures (et tout le monde jusqu'à la fin du premier jour). Votre camp est votre capitale : tant que vous n'attaquez aucun marchand de la semaine, elle ne tombe jamais.",
        },
        {
          diagram: "troops",
          title: "Les troupes",
          text: "Vos terres recrutent toutes seules, chaque heure de 8 h à 22 h : plus vous tenez de terres et de villes, plus vous recrutez, jusqu'à votre maximum. Le bouton « Max » relève ce maximum contre des ducats ; il ne donne pas de troupes.",
        },
        {
          diagram: "front",
          title: "Lancer un front",
          text: "Touchez une terre au bord des vôtres, choisissez la part de vos troupes avec le curseur, puis « Attaquer ». Le front avance seul, une case toutes les 30 minutes (une heure en terre libre), en commençant par la plus proche de votre cible. Chaque case coûte des troupes selon son terrain ; le front rentre quand il ne peut plus payer.",
        },
        {
          diagram: "defend",
          title: "Défendre",
          text: "Les troupes restées chez vous défendent toutes vos terres : prendre une de vos cases coûte vos troupes divisées par vos cases, multipliées par le terrain. Un fort défend 1,6 fois mieux sa case et ses voisines. Une poche coupée de votre capitale et entourée d'un seul rival tombe peu à peu.",
        },
        {
          diagram: "peasants",
          title: "Soldats ou paysans",
          text: "Sur vos terres, un curseur partage vos gens : les soldats recrutent (jusqu'à deux fois plus), les paysans récoltent pour votre comptoir du blé dans les plaines, de l'argile dans les collines, du bois dans les montagnes. Deux villes ou plus reliées à votre capitale par vos terres rapportent des ducats chaque heure.",
        },
        {
          diagram: "water",
          title: "L'eau : ports et barques",
          text: "Bâtissez un port sur une terre au bord de la lagune, du lac de Garde ou de l'Adriatique. Touchez ensuite une rive des mêmes eaux : « Débarquer » y envoie une barque, dix minutes par case d'eau, qui prend la rive puis avance comme un front. Les galères d'un port ennemi sur ces eaux coulent 30 % du débarquement.",
        },
        {
          diagram: "bombard",
          title: "Bombardes et remparts",
          text: "Une bombarde tire une fois par jour sur une terre ennemie à quatre cases au plus : elle et ses voisines du même maître redeviennent libres, et leurs troupes meurent. Jamais une capitale. Des remparts mettent leur case et leurs voisines hors de portée.",
        },
        {
          diagram: "nations",
          title: "Milan et les nations",
          text: "Cinq puissances de 1450 tenues par l'ordinateur occupent la carte et ne comptent pas au classement. Chacune a sa manière : sachez qui vous borde avant d'attaquer.",
        },
        {
          diagram: "diplomacy",
          title: "Alliances et diplomatie",
          text: "Proposez une alliance à un voisin (deux au plus) : plus de front entre vous. Envoyez-lui des troupes ou des ducats, désignez-lui une cible, faites des signaux sur la carte. Depuis une ville que vous tenez, un embargo fait payer 20 % de moins un rival qui y livre. Rompre trop souvent fait de vous un traître.",
        },
        {
          diagram: "win",
          title: "Gagner la semaine",
          text: "Chaque heure ouverte, chaque terre vous rapporte 1 de Gloire, chaque ville 3. À la fin de la semaine, le premier en Gloire est le Signore : le décret qu'il a choisi s'applique la semaine suivante, pour lui et ses alliés. Tout le classement gagne de l'Influence pour sa Maison.",
        },
        {
          diagram: "battle",
          title: "Bataille et escarmouches",
          text: "Chaque soir de 20 h à 21 h, l'heure de bataille : les fronts avancent dix fois plus vite, venez les mener. De 8 h à 22 h, « Escarmouche » lance une partie en direct d'un quart d'heure contre d'autres marchands et des condottieri. Une seule par jour est classée : la première avec au moins un autre marchand, si votre camp est posé sur la carte de la semaine et qu'elle finit avant 22 h. Votre rang y rapporte de la Gloire à votre semaine ; les autres parties sont amicales, sans Gloire.",
        },
      ],
    },
    /** Skirmishes: live matches on the Terraferma. */
    skirmish: {
      title: "Escarmouche",
      leave: "← La semaine",
      off: "Pas d'escarmouche dans ce monde.",
      pitch: (minutes: number) =>
        `Une partie en direct de ${minutes} minutes, le temps soixante fois plus vite, contre d'autres marchands et des condottieri.`,
      /** The day's ranked match, before it is played. */
      rankedToday: (left: number, humans: number) =>
        `Partie classée · ${left} aujourd'hui, dès ${humans} marchands : votre rang rapporte de la Gloire à votre semaine.`,
      ranked: "Partie classée : votre rang rapporte de la Gloire à votre semaine.",
      friendlyLate: (hour: number) =>
        `Partie amicale : elle finirait après ${hour} h, sans Gloire. Votre partie classée, demain.`,
      friendlyAlone: (humans: number, later: boolean) =>
        `Partie amicale : il fallait ${humans} marchands, sans Gloire. ${later ? "Votre partie classée du jour reste à jouer." : "Votre partie classée, demain."}`,
      friendlyFew: (humans: number) =>
        `Partie amicale tant qu'il n'y a pas ${humans} marchands : sans Gloire.`,
      friendlyDone: "Partie amicale : sans Gloire. Votre prochaine partie classée, demain.",
      friendlyOffMap:
        "Partie amicale : posez votre camp sur la Terraferme de la semaine pour que votre partie du jour soit classée.",
      night: (opensAt: number, closesAt: number) =>
        `☾ Pas d'escarmouche la nuit : elles reprennent à ${opensAt} h. Une partie classée par jour, de ${opensAt} h à ${closesAt} h.`,
      nightShort: (hour: number) => `☾ Escarmouches dès ${hour} h`,
      /** A match lost to a restart of the server. */
      interrupted: skirmishInterrupted,
      open: "Lancer une escarmouche",
      join: "Rejoindre",
      lobby: (players: number, time: string) =>
        `${players} marchand${players > 1 ? "s" : ""} inscrit${players > 1 ? "s" : ""} · départ dans ${time} ; les places vides vont aux condottieri.`,
      playing: (time: string) =>
        `En cours · fin dans ${time}. Touchez une terre au bord des vôtres pour attaquer.`,
      watching: "Une escarmouche est en cours : regardez-la, la prochaine s'ouvre ensuite.",
      someone: "Un marchand",
      cells: (n: number) => `${n} terre${n > 1 ? "s" : ""}`,
      glory: "Gloire",
    },
    /** The Terraferma's rating and last weeks, in the profile. */
    terraRecord: {
      title: "Terraferme",
      rating: (r: number) => `Cote : ${r}`,
      none: "Aucune semaine jouée pour l'instant.",
      week: (week: number, rank: number, of: number, glory: number, rating: number) =>
        `Semaine ${week} : ${rank}${rank === 1 ? "er" : "e"} sur ${of} · ${glory} Gloire · cote ${rating}`,
      replay: "Revoir la semaine",
    },
    /** A workshop in figures (margins at reference prices). */
    economics: {
      perHour: (amount: string) => `≈ ${amount} de marge théorique par heure`,
      /** A workshop the guide does not advise upgrading: its goods pile up, or it lacks an input. */
      unsold: (qty: number, res: string, hours: number, dogana: number | null) =>
        `Stock invendu : ${qty} ${res.toLowerCase()}, ~${hours >= 48 ? `${Math.round(hours / 24)} j` : `${hours} h`} de production${dogana !== null ? ` ; la Dogana en prend ${dogana} par jour` : ""}.`,
      missing: (list: string) => `Intrant manquant : ${list.toLowerCase()}.`,
      best: "meilleur placement",
      bestLong:
        "Le meilleur placement de vos ducats en ce moment : c'est l'amélioration la plus vite rentabilisée.",
      adds: (amount: string) => `+${amount} de marge par heure`,
      payback: (time: string) => `rentabilisé en ${time}`,
    },
    /** Lorenzo's next best action, on the Comptoir's side. */
    advice: {
      title: "Lorenzo conseille",
      none: "Tout tourne : vos ateliers travaillent. Revenez quand ils auront fini.",
      harvest: (n: number) =>
        n > 1
          ? `${n} ateliers ont fini : récoltez et relancez.`
          : "Un atelier a fini : récoltez et relancez.",
      harvestGo: "Récolter",
      produce: (building: string) => `${building} ne fait rien et a de quoi travailler.`,
      produceGo: "Produire",
      company: (n: number, resource: string) => {
        // « du pain », « de la farine », « de l'argile », « des briques ».
        const name = resource.toLowerCase();
        const article = /^[aeiouyéèêh]/.test(name)
          ? "de l'"
          : /[sx]$/.test(name)
            ? "des "
            : ["farine", "soie", "laine"].includes(name)
              ? "de la "
              : "du ";
        return `La commande de compagnie attend ${article}${name} : vous en avez ${n} à livrer.`;
      },
      companyGo: "Livrer",
      upgrade: (building: string, adds: string, payback: string) =>
        `Améliorez ${building} : +${adds} par heure, rentabilisé en ${payback}.`,
      upgradeGo: "Améliorer",
    },
    /** Deals between merchants: commissions and colleganze. */
    deals: {
      title: "Affaires entre marchands",
      tile: (n: number) =>
        n > 0 ? `${n} affaire${n > 1 ? "s" : ""} à saisir` : "Commandes et colleganze",
      tabs: { commissions: "Commandes", colleganze: "Colleganza", bank: "Banque" },
      bank: {
        help: (share: number, pct: number, days: number, late: number) =>
          `La Banque prête jusqu'à ${share} % de votre patrimoine, ${days} jours au plus, à ${pct} % par jour. À l'échéance, elle se paie sur votre caisse ; ce qui manque est majoré de ${late} % et prélevé sur vos rentrées. Remboursé plus tôt, vous ne payez que les jours entamés.`,
        none: "Votre patrimoine ne permet pas encore d'emprunter.",
        current: (owed: string, left: string) =>
          `Vous devez ${owed} à la Banque · échéance dans ${left}.`,
        late: (owed: string) => `En retard : ${owed} restent dus, prélevés sur vos rentrées.`,
        repay: "Rembourser maintenant",
        amount: "Montant emprunté",
        cost: (interest: string, total: string) => `Intérêts ${interest} · à rendre ${total}`,
        borrow: "Emprunter",
      },
      someone: "un marchand",
      you: "Vous",
      commissionHelp:
        "Commandez une marchandise aux autres marchands à votre prix : vos ducats sont bloqués jusqu'à la livraison, rendus si personne ne livre à temps. Le vendeur paie la taxe du marché, comme au Rialto.",
      noCommission: "Aucune commande ouverte.",
      asks: (who: string, n: number, resource: string, price: string) =>
        `${who} : ${n} ${resource} à ${price}`,
      left: (time: string) => `Expire dans ${time}`,
      filled: "Livrée",
      closed: "Close",
      deliver: "Livrer",
      cancel: "Annuler",
      newCommission: "Passer une commande",
      quantity: "Quantité",
      price: "Prix unitaire",
      days: "Jours",
      locks: (total: string) => `${total} bloqués jusqu'à la livraison.`,
      post: "Passer la commande",
      colleganzaHelp: (max: number) =>
        `La colleganza vénitienne : avancez des ducats à un autre marchand pour quelques jours. À l'échéance, il vous rend le capital et une part (jusqu'à ${max} %) des ventes nettes qu'il a faites entre-temps — autant que sa caisse le permet. Cette part passe de son classement au vôtre.`,
      noColleganza: "Aucune colleganza en cours.",
      offer: (who: string, amount: string, days: number, pct: number) =>
        `${who} avance ${amount} pour ${days} j, contre ${pct} % des gains`,
      invested: (amount: string, merchant: string | null, pct: number) =>
        merchant
          ? `Vous avez avancé ${amount} à ${merchant} (${pct} % des gains)`
          : `Votre offre : ${amount} contre ${pct} % des gains`,
      funded: (who: string, amount: string, pct: number) =>
        `${who} vous a avancé ${amount} (${pct} % de vos gains lui reviendront)`,
      settled: (paid: string) => `Réglée : ${paid} rendus`,
      term: (time: string) => `Échéance dans ${time}`,
      waiting: "En attente d'un marchand",
      accept: "Accepter",
      newColleganza: "Proposer une colleganza",
      amount: "Capital avancé",
      share: "Votre part des gains",
      offerGo: "Proposer",
    },
    /** The manufactures, past the last ordinary level. */
    manufacture: {
      title: "Devenir manufacture",
      help: (max: number) =>
        `L'atelier est au dernier niveau ordinaire. Choisissez sa voie, une fois pour toutes, pour monter jusqu'au niveau ${max}.`,
      locked: (title: string, max: number) =>
        `Au titre de ${title}, cet atelier pourra devenir une manufacture et monter jusqu'au niveau ${max}.`,
      paths: {
        volume: {
          name: "Volume",
          text: (_: number) =>
            "Chaque niveau grossit les lots, comme jusqu'ici : plus de marchandise.",
        },
        quality: {
          name: "Qualité",
          text: (pct: number) =>
            `Les lots restent ceux du niveau 5, mais les villes paient ses marchandises ${pct} % de plus par niveau.`,
        },
      },
      choose: (path: string) => `Choisir la voie ${path.toLowerCase()}`,
      quality: (pct: number) => `Qualité : les villes paieront ses marchandises +${pct} %.`,
    },
    /** The Doge's tenders. */
    tenders: {
      title: "Appels d'offres du Doge",
      line: (pct: number) => `Pli scellé · caution ${pct} %`,
      help: (pct: number) =>
        `Le Doge demande une quantité d'une marchandise sous un prix plafond. Proposez un prix et une quantité, sous pli scellé, en bloquant une caution de ${pct} % de l'offre. À la clôture, les moins chers l'emportent jusqu'à la quantité demandée ; les autres récupèrent leur caution. Le gagnant livre depuis son comptoir avant l'échéance, payé à son prix, caution rendue — sinon la caution est perdue.`,
      none: "Aucun appel d'offres en cours. Le prochain s'ouvre bientôt.",
      open: (n: number) => (n > 0 ? `${n} ouvert${n > 1 ? "s" : ""} aux offres` : "Offres closes"),
      toDeliver: (n: number) => `${n} marché${n > 1 ? "s" : ""} gagné${n > 1 ? "s" : ""} à livrer`,
      asks: (n: number, resource: string) => `${n} ${resource.toLowerCase()}`,
      closesIn: (left: string, bidders: number) =>
        `Clôture dans ${left} · ${bidders} offre${bidders > 1 ? "s" : ""} scellée${bidders > 1 ? "s" : ""}`,
      deliverBefore: (left: string) => `À livrer dans ${left}`,
      ceiling: "Plafond",
      price: "Votre prix unitaire",
      quantity: "Quantité",
      summary: (total: string, caution: string, have: number) =>
        `Offre ${total} · caution ${caution} · ${have} en stock`,
      mine: (n: number, price: string, caution: string) =>
        `Votre offre : ${n} à ${price} (caution ${caution}).`,
      bid: "Déposer l'offre",
      rebid: "Remplacer l'offre",
      won: (n: number, price: string, total: string) =>
        `Marché gagné : ${n} à ${price}, soit ${total}.`,
      stock: (have: number, need: number, caution: string) =>
        `${have} / ${need} en stock. Caution en jeu : ${caution}.`,
      deliver: "Livrer au Doge",
    },
    /** A city's warehouse. */
    warehouse: {
      title: (city: string) => `Entrepôt de ${city}`,
      line: (places: number, units: number) =>
        `${places} place${places > 1 ? "s" : ""} · ${units} unités par jour`,
      help: (places: number, units: number) =>
        `${places} place${places > 1 ? "s" : ""} par ville, mise${places > 1 ? "s" : ""} aux enchères chaque semaine : les plus fortes offres l'emportent à la clôture du lundi et leurs ducats sortent du jeu, les autres sont rendues. Le titulaire livre les commandes de la ville sur-le-champ, sans charrette, jusqu'à ${units} unités par jour.`,
      held: (left: number) =>
        `Votre entrepôt cette semaine : encore ${left} unités livrables aujourd'hui.`,
      noOrders: "Aucune commande ouverte dans cette ville pour l'instant.",
      deliver: "Livrer",
      auction: "Enchères de la semaine prochaine",
      state: (bidders: number, toWin: string) =>
        `${bidders} offre${bidders > 1 ? "s" : ""} · il faut ${toWin} pour l'emporter`,
      mine: (amount: string) => `Votre offre : ${amount} (bloquée jusqu'à la clôture).`,
      bid: "Votre offre",
      place: "Enchérir",
      rebid: "Remplacer l'offre",
    },
    /** The official suppliers of a city. */
    suppliers: {
      title: (city: string) => `Fournisseurs de ${city}`,
      line: (pct: number, min: number) => `+${pct} % au premier livreur · ${min} au moins`,
      help: (pct: number, min: number) =>
        `Chaque semaine, qui livre le plus d'une marchandise dans une ville (au moins ${min}) en devient le fournisseur officiel : la ville la lui paie ${pct} % de plus toute la semaine suivante, et son blason flotte sur la carte.`,
      none: "Personne n'a encore livré ici cette semaine.",
      vacant: "à prendre",
      you: "Vous",
      units: (n: number) => `${n} livré${n > 1 ? "s" : ""}`,
      held: (goods: string) => `Fournisseur officiel : ${goods}`,
    },
    dashboard: {
      title: "Tableau de bord",
      line: (days: number) => `Ventes nettes · ${days} jours`,
      help: (days: number) =>
        `Vos ventes nettes comptées comme au classement : ce qui entre pour vos marchandises, moins ce qu'elles vous coûtent. La courbe additionne les ${days} derniers jours.`,
      perHour: (amount: string) => `≈ ${amount} de marge par heure`,
      hour: "Par heure",
      today: "Aujourd'hui",
      week: "Cette semaine",
      chart: (days: number) =>
        `Ventes nettes des ${days} derniers jours : vous, votre rival et le premier de la semaine`,
      who: {
        me: (_: string) => "Vous",
        rival: (name: string) => `Rival : ${name}`,
        leader: (name: string) => `Premier : ${name}`,
      },
    },
    /** The rival of the week, under the rank on the map. */
    rival: {
      someone: "Un marchand",
      chase: (name: string, gap: string | null) =>
        gap ? `Rival : ${name}, +${gap}` : `Rival : ${name}, à égalité`,
      chased: (name: string, gap: string | null) =>
        gap ? `Talonné par ${name}, −${gap}` : `Talonné par ${name}, à égalité`,
      characters: {
        producer: "le producteur",
        artisan: "l'artisan",
        builder: "le bâtisseur",
        speculator: "le spéculateur",
        casual: "le flâneur",
      } as Record<string, string>,
    },
    /**
     * What changed for this season, shown at the foot of the help: the rules change only from one
     * month to the next, and say so here (owner's decision of 20 October 2026).
     */
    seasonNotes: {
      title: "Nouveautés de la saison",
      items: [
        "Nouvelle palette bleue « Lagune », et la carte en bleu (l'ancienne reste dans le Profil).",
        "La Terraferme s'ouvre après votre première journée de commerce ; on s'y pose n'importe quel jour, tous à l'abri jusqu'à la fin du premier jour.",
        "Qui n'attaque aucun marchand de la semaine garde toujours sa capitale.",
        "Milan chevauche plus souvent et plus fort ; les maisons de l'ordinateur attaquent leurs voisins plus tôt.",
        "Le rival de la semaine, sous votre rang.",
        "Commandes de compagnie : une commande d'une ville remplie à plusieurs, avec une prime pour tous.",
        "Le fattore fait partir vos charrettes oubliées au comptoir, deux fois par jour.",
        "Terraferme : l'heure de bataille, chaque soir de 20 h à 21 h, les fronts avancent dix fois plus vite.",
        "Terraferme : les ports, sur les rives de la lagune, du lac de Garde et de l'Adriatique ; les barques débarquent sur une autre rive, les galères gardent la vôtre.",
        "Le guide de la Terraferme, avec ses schémas, dans l'Aide et sur la carte de la Terraferme (« ? Guide »).",
        "Terraferme : les escarmouches, des parties en direct d'un quart d'heure, de 8 h à 22 h. Une seule par jour est classée : la première avec au moins un autre marchand, si votre camp est posé sur la carte de la semaine et qu'elle finit avant 22 h ; son rang rapporte 45, 30, 20 ou 10 de Gloire à la semaine. Les autres parties sont amicales, sans Gloire. Une partie interrompue par une maintenance ne rapporte rien et ne compte pas : elle ne consomme pas votre partie classée du jour.",
        "Terraferme : une semaine par mois en équipes, les marchands d'une même région ensemble.",
        "Terraferme : signaux sur la carte, cible désignée aux alliés, ducats entre alliés et embargo depuis les villes que vous tenez.",
        "Terraferme : bombardes (un tir par jour rend libres une terre ennemie et ses voisines) et remparts qui en protègent.",
        "Terraferme : Mantoue, Ferrare, le Patriarche d'Aquilée et l'Empire rejoignent Milan, chacun à sa manière.",
        "Terraferme : soldats ou paysans. Vos terres donnent du blé, de l'argile et du bois à votre comptoir, et les routes entre vos villes des ducats.",
        "La carte n'affiche plus que les ducats, le rang et les charrettes ; le pain quand il manque.",
        "Sept jours de cours pour chaque marchandise du Rialto, face à sa référence.",
        "Le Journal du Rialto, dans les avis : les gros échanges et les conquêtes du jour.",
        "Le Rapport de la Banque de Venise, au pied de l'Aide ; votre livre de compte en CSV dans le Profil.",
        "En fin de saison, une chronique à partager.",
        "Commerce : chaque atelier dit sa marge par heure et ce que rapporterait son amélioration ; un tableau de bord compare vos sept derniers jours à votre rival et au premier.",
        "Commerce : Lorenzo conseille la prochaine meilleure action, au comptoir.",
        "Commerce : le fournisseur officiel — qui livre le plus d'une marchandise dans une ville en une semaine y est payé 10 % de plus la semaine suivante, blason sur la carte.",
        "Commerce : les appels d'offres du Doge, sous pli scellé avec caution ; le moins cher l'emporte.",
        "Commerce : les entrepôts des villes, aux enchères chaque semaine, pour livrer sans charrette.",
        "Commerce : les chaînes de luxe s'ouvrent avec les titres — verre de Murano au Marchand, draperie au Négociant, épices préparées à l'Armateur.",
        "Commerce : au-delà du niveau 5, les manufactures montent jusqu'au niveau 10, en volume ou en qualité.",
        "Commerce : affaires entre marchands — commandes sous séquestre, colleganza, et prêts de la Banque.",
        "Pass Négociant : plus aucun avantage de jeu (ni quota à la Dogana, ni offre ouverte, ni produits frais en plus, ni commande du Doge échangée, ni alerte de bonne affaire) ; il ne donne que de l'information à lire et du cosmétique.",
      ],
    },
    howTo: [
      {
        icon: "comptoir",
        title: "Produire",
        text: "Touchez votre comptoir, puis un atelier : il transforme des matières en produits, par lots d'une demi-heure. Lancez jusqu'à 12 heures de travail et revenez récolter ; rien ne se perd pendant votre absence.",
      },
      {
        icon: "routes",
        title: "Livrer",
        text: "Les villes publient des commandes toutes les 4 heures. Touchez une charrette, cochez des commandes pour une même ville, puis faites-la partir : la ville paie à l'arrivée, d'autant mieux que la route est longue. Le premier arrivé prend la commande.",
      },
      {
        icon: "routes",
        title: "Le fattore",
        text: "Votre commis : quand une charrette reste deux heures au comptoir, il la fait partir avec la meilleure commande que votre stock couvre, deux fois par jour, de 8 h à 22 h, en gardant le pain des ouvriers. Il prend 15 % du paiement. Il ne travaille que si vous êtes passé dans les dernières 24 heures.",
      },
      {
        icon: "comptoir",
        title: "Commandes de compagnie",
        text: "Tous les deux jours, une ville commande du pain, des briques et des planches aux trois régions. Livrez depuis votre stock : 10 % au-dessus de la référence, et 10 % de plus pour chacun quand la commande est remplie.",
      },
      {
        icon: "profil",
        title: "Le pain des ouvriers",
        text: "Chaque niveau d'atelier mange 2 pains par jour, à minuit (rien le premier jour). Sans pain, les lots durent moitié plus longtemps pendant 24 heures. Les boulangeries et les briqueteries brûlent aussi du bois.",
      },
      {
        icon: "marche",
        title: "Le Rialto",
        text: "À Venise, achetez et vendez aux autres marchands et à la Dogana : tout de suite au meilleur prix, ou à votre prix en laissant une offre. C'est là que vous trouvez ce que votre région ne produit pas.",
      },
      {
        icon: "port",
        title: "Les galères de la Muda",
        text: "Tous les trois jours à 9 h, les galères d'État apportent épices, soie, sel, vin, fourrures et draps, vendus au Rialto en petites quantités, de plus en plus cher à mesure que le lot part. Quelques villes en commandent : achetez tôt.",
      },
      {
        icon: "top",
        title: "Classement",
        text: "Chaque semaine et sur la saison, on compte vos ventes nettes : ce que vous vendez, moins ce que vous achetez. Un stock qui dort ne compte pas. Les trois premiers de la semaine reçoivent un titre.",
      },
      {
        icon: "famille",
        title: "La Terraferme",
        text: "Une conquête d'une semaine, à côté du commerce. Posez votre camp sur une terre libre, n'importe quel jour ; puis lancez des fronts vers les terres voisines avec une part de vos troupes. Ils avancent seuls de 8 h à 22 h. Le premier en Gloire impose un décret la semaine suivante.",
      },
      {
        icon: "comptoir",
        title: "Ballots de Faraj",
        text: "Toutes les six heures, Faraj d'Alexandrie vous envoie un ballot : trois cartes de 1 à 5 marchandises. Les probabilités sont affichées ; les ballots ne s'achètent pas.",
      },
      {
        icon: "help",
        title: "Au clavier",
        text: "Sur ordinateur : R récolte et relance tout, A ouvre les ateliers, M le marché, C les cargaisons d'un véhicule libre, 1 à 9 un atelier, Échap ferme.",
        wideOnly: true,
      },
    ],

    errors: {
      no_patent: "Il faut d'abord ce privilège.",
      unknown_patent: "Ce privilège n'existe pas dans ce monde.",
      patent_owned: "Votre Maison a déjà ce privilège.",
      patent_requires: "Il faut d'abord les privilèges qu'il demande.",
      not_enough_influence: "Pas assez d'Influence.",
      house_off: "Pas de Livre de la Maison dans ce monde.",
      unknown_mission: "Cette mission n'est plus au tableau.",
      mission_not_done: "Mission pas encore accomplie.",
      mission_claimed: "Mission déjà reçue.",
      not_en_route: "Ce véhicule n'est plus en route vers la ville.",
      rush_limit: "Plus d'accélération possible aujourd'hui.",
      troop_limit: "Plus de troupes à acheter aujourd'hui.",
      no_specialty: "Pas de maîtrise choisie à changer.",
      no_work: "Aucun ouvrage en chantier sur cette terre.",
      work_ready: "Cet ouvrage est déjà achevé.",
      unknown_use: "Usage inconnu.",
      unknown_daily: "Cette tâche n'est plus au programme du jour.",
      no_bale: "Aucun ballot au quai pour l'instant : le prochain est en route.",
      bales_off: "Pas de ballot de Faraj dans ce monde.",
      insufficient_funds: "Pas assez de ducats.",
      vehicle_not_for_sale: "Seules les mules s'achètent : améliorez-les ensuite.",
      vehicle_max_level: "Ce véhicule est déjà au plus haut niveau.",
      insufficient_stock: "Pas assez de stock.",
      building_busy: "Cet atelier produit déjà : attendez la fin de la file.",
      queue_full: "La file de production est pleine (12 h maximum).",
      max_buildings: "Nombre maximal de bâtiments atteint.",
      max_level: "Niveau maximal atteint.",
      no_liquidity: "Personne ne vend ou n'achète cette ressource pour le moment.",
      price_out_of_band:
        "Prix refusé : une offre doit rester entre le quart et quatre fois le prix de référence.",
      not_bought_here: "Cette ville n'achète pas cette ressource.",
      project_closed: "Ce chantier est terminé.",
      project_full: "Ce chantier n'a plus besoin de cette quantité.",
      registration_closed: "Les inscriptions à cette saison sont closes.",
      season_over: "La saison est terminée.",
      invalid_quantity: "Quantité invalide.",
      not_joined: "Installez d'abord votre comptoir.",
      reset_limit: "Vous avez déjà recommencé une fois cette saison.",
      unknown_contract: "Ce contrat n'existe pas.",
      contract_expired: "Ce contrat a expiré.",
      contract_done: "Contrat déjà honoré.",
      families_off: "Pas de familles dans ce monde.",
      family_locked: "Les familles ne vous reçoivent pas encore.",
      family_chosen: "Vous avez déjà prêté allégeance pour la saison.",
      unknown_family: "Famille inconnue.",
      no_family: "Prêtez d'abord allégeance à une famille.",
      unknown_land: "Terre inconnue.",
      seat_untouchable: "Un fief ne se prend pas et n'a pas besoin de garnison.",
      not_adjacent: "Trop loin : seulement vos terres et leurs voisines.",
      works_off: "Pas d'ouvrages dans cette campagne.",
      unknown_work: "Ouvrage inconnu.",
      not_held: "Votre famille doit tenir cette terre.",
      work_exists: "Un ouvrage s'y dresse déjà.",
      too_many_works: "Votre famille a déjà tous ses ouvrages : il en faut plus de membres actifs.",
      not_enough_lances: "Pas assez de troupes en réserve.",
      nothing_to_levy: "Rien à lever pour l'instant.",
      hire_limit: "Plafond de troupes du jour atteint.",
      unknown_march: "Cette marche est déjà arrivée.",
      invalid_programme: "Programme invalide.",
      order_reserved:
        "Cette commande est réservée un moment à la famille qui a la faveur de la ville.",
      terra_off: "La Terraferme n'est pas ouverte dans ce monde.",
      terra_closed: "La semaine de la Terraferme est close : une nouvelle carte s'ouvre bientôt.",
      already_placed: "Votre camp de départ est déjà posé.",
      not_placed: "Posez d'abord votre camp de départ.",
      not_neutral: "Il faut une terre libre.",
      too_close: "Trop près d'un autre marchand.",
      neutral_left: "Il reste de la terre libre : posez-vous là.",
      placement_closed:
        "La partie de la semaine a commencé : prochaine partie au début de la semaine prochaine.",
      own_cell: "Cette terre est déjà à vous.",
      allied: "Pas de front contre un allié.",
      protected: "Ce marchand vient d'arriver : il est encore protégé.",
      no_troops: "Pas assez de troupes.",
      share_too_small: "Engagez plus de troupes.",
      too_many_fronts: "Trop de fronts ouverts : rappelez-en un.",
      unknown_front: "Ce front est déjà rentré.",
      too_many_allies: "Plus de place pour une alliance.",
      traitor: "Personne ne s'allie à un traître.",
      no_request: "Cette alliance n'est plus proposée.",
      not_allied: "Seulement à un allié.",
      breaking: "Cette alliance est déjà en train de se rompre.",
      gift_limit: "Plus de troupes à envoyer aujourd'hui.",
      not_owner: "Cette terre n'est pas à vous.",
      built: "Un bâtiment s'y dresse déjà.",
      no_room: "Il vous faut plus de terres pour bâtir encore.",
      raise_limit: "Plus de hausse des troupes max aujourd'hui.",
      decree_repeat:
        "Ce décret est déjà en vigueur : il ne peut pas l'être deux semaines de suite.",
    } as Record<string, string>,
  },

  errors: {
    invalid_input: "Vérifiez votre saisie.",
    pseudo_taken: "Ce nom est déjà pris.",
    too_many_requests: "Trop de demandes. Réessayez dans quelques minutes.",
    network: "Le serveur ne répond pas. Vérifiez votre connexion.",
    mail_unavailable: "L'e-mail n'a pas pu être envoyé. Réessayez dans quelques minutes.",
    unknown: "Une erreur est survenue.",
  } as Record<string, string>,
};
