import { en } from "./i18n.en.js";
import { lettersFr } from "./i18n.letters.js";
import { LANG } from "./lang.js";

/**
 * Interface texts, in French; the English ones in i18n.en.ts, key for key (E3-8 of the experts).
 * `fr` is the dictionary of the language chosen at start-up (lang.ts), French by default.
 */

/**
 * A skirmish lost to a restart of the server: the same words on the bar and in the bell (and in
 * the push, apps/server/src/notify/texts.ts). Told in the past, true for good: the bell keeps it
 * after the merchant has played again, so it promises nothing.
 */
const skirmishInterrupted =
  "Partie rapide interrompue par une maintenance : aucun point de conquête, rien n'est compté ; elle n'a pas consommé votre partie classée du jour.";

const frDict = {
  appName: "Fondaco",
  /** The theme's names in this language, over the server's (French: the server's own). */
  themeNames: {
    resource: {} as Record<string, string>,
    building: {} as Record<string, string>,
    city: {} as Record<string, string>,
    region: {} as Record<string, string>,
  },
  /** The server's French names (titles, tiers, badges), in another language: none in French. */
  serverNames: {} as Record<string, string>,
  /** Words of the drawings and small controls. */
  misc: {
    loop: ["Produire", "Livrer", "Réinvestir"],
    reached: "✓ acquis",
    upcoming: "à venir",
    first: "Premier",
    prev: "Précédent",
    next: "Suivant",
    last: "Dernier",
    quantity: "Quantité",
    /** The day's unit in a time left: « 6 j 13 h ». */
    dayUnit: "j",
    legend: [
      "Vos terres",
      "Vos alliés",
      "En guerre avec vous",
      "Milan et les seigneurs",
      "Les autres marchands",
    ],
    nations: [
      ["Milan", "frappe le voisin le plus faible"],
      ["Mantoue", "rend les coups à qui l'attaque"],
      ["Ferrare", "tombe sur les faibles"],
      ["Aquilée", "s'étend lentement"],
      ["L'Empire", "pille depuis les Alpes"],
    ] as [string, string][],
    /** The word to type to delete the account (checked here; the request carries its own). */
    deleteWord: "SUPPRIMER",
  },
  /** « Venise 1450 · saison d'octobre »: a season is a calendar month (Paris), its year left out. */
  seasonOf: (at: Date) => {
    const month = at.toLocaleDateString("fr-FR", { month: "long", timeZone: "Europe/Paris" });
    return `Venise 1450 · saison ${/^[aeiou]/i.test(month) ? "d'" : "de "}${month}`;
  },
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
  pseudoProposed:
    "Un nom proposé pour commencer tout de suite : vous pourrez le changer une fois, gratuitement, dans le Profil.",
  pseudoInvalid:
    "De 3 à 20 caractères, avec seulement des lettres, des chiffres, _ ou - (pas d'espace ni de ponctuation).",
  confirm: "Valider",
  logout: "Se déconnecter",

  intro: {
    skip: "Passer",
    next: "Suivant",
    start: "Choisir mon métier",
    /** The slide's text when the season runs past its first calendar month. */
    longSeason: (until: string) =>
      `Cette saison dure jusqu'au ${until}, les suivantes un mois chacune : le meilleur vendeur devient Doge, puis tout le monde repart à zéro. Lorenzo, votre facteur, vous guide. Rien à acheter qui fasse gagner : ni ducats, ni marchandises, ni vitesse.`,
    /** One slide only (E3-5 of the experts): the rest is said by Lorenzo, at its step. */
    slides: [
      {
        kicker: "Le but du jeu",
        title: "Un mois. Le meilleur vendeur devient Doge.",
        text: "Vos ateliers produisent, les villes commandent, le Marché échange : Lorenzo, votre facteur, vous guide. Chaque mois, tout le monde repart à zéro. Rien à acheter qui fasse gagner : ni ducats, ni marchandises, ni vitesse.",
      },
    ],
  },

  region: {
    recommended: "Recommandé ce mois-ci",
    recommendedHelp:
      "Le métier le moins choisi ce mois-ci : ses marchandises sont les plus demandées par les autres.",
    title: "Choisissez votre métier",
    help: "Chaque région n'extrait que sa propre matière première : le blé en Vénétie, l'argile dans la Lagune, le bois dans les Dolomites. Pour le reste, il faudra commercer.",
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
    /** The goods' chains, as the Rialto groups them (Lagune). */
    chains: {
      food: "Vivres",
      construction: "Construction",
      carpentry: "Charpente",
      glass: "Verrerie",
      drapery: "Draperie",
      orient: "Outre-mer",
    } as Record<string, string>,
    /** The store's sheet (Lagune). */
    store: {
      total: (n: number) => `${n} en stock`,
      escrow: (n: number) => `+${n} engagés`,
    },
    map: {
      home: (pseudo: string) => (pseudo ? `Maison ${pseudo}` : "Votre maison"),
      homeLabel: "Mes ateliers",
      /** A place touched on the map: a sentence, one gold action in place, a way in (refonte UX). */
      place: {
        ready: (n: number, list: string) =>
          `${n} lot${n > 1 ? "s" : ""} prêt${n > 1 ? "s" : ""} : ${list}.`,
        harvest: (n: number) => `Récolter ${n} lot${n > 1 ? "s" : ""}`,
        nextAt: (hour: string) => `Prochain lot à ${hour}.`,
        idle: "Vos ateliers attendent du travail.",
        restarted: "Relancé",
        open: "Ouvrir",
        wants: (quantity: number, good: string, pay: string) =>
          `Veut ${quantity} ${good}, paie ${pay}.`,
        youHave: "Vous les avez.",
        missing: (n: number) => `Il vous en manque ${n}.`,
        cartBack: (time: string) => `Un véhicule se libère dans ${time}.`,
        noCart: "Il vous faut un véhicule.",
        tooHeavy: "Trop lourd pour vos véhicules.",
        deliver: (quantity: number, good: string, pay: string) =>
          `Livrer ${quantity} ${good} · +${pay}`,
        sent: (pay: string) => `C’est parti · +${pay} à l’arrivée.`,
        calm: "Rien à livrer pour l’instant.",
        master: "Vous en êtes le maître.",
        see: (city: string) => `Voir ${city}`,
        venice: "Entrer à Venise",
        auction: (n: number, hour: string) =>
          `Enchères ce soir à ${hour} : ${n} lot${n > 1 ? "s" : ""}.`,
        rumours: (n: number) => `${n} rumeur${n > 1 ? "s" : ""} ce matin au Palais.`,
        and: "et",
      },
      close: "Fermer",
      prev: "Précédent",
      next: "Suivant",
      notices: "Messages",
      bales: (n: number) => (n > 1 ? `${n} colis à ouvrir` : "Un colis à ouvrir"),
      buyCart: "Acheter une mule",
      cityLabel: (name: string, orders: number, covered: number, criee: boolean) =>
        [
          name,
          orders > 0 ? `${orders} commande${orders > 1 ? "s" : ""}` : "aucune commande",
          covered > 0 ? `${covered} couverte${covered > 1 ? "s" : ""} par votre stock` : null,
          criee ? "vente rapide en cours" : null,
        ]
          .filter(Boolean)
          .join(", "),
      carts: "Charrettes libres",
      resumeGuide: "Reprendre le guide",
      /** What the workshops earn an hour, under the purse (theoretical, at reference prices). */
      rate: (amount: string) => `≈ +${amount}/h`,
      /** The strip of what comes next, above the doors. */
      /** The counter's workshops in its panel. */
      /** The counter up close, its workshops in orbit around it. */
      orbit: {
        load: "Charger une mule",
        missing: (n: number) => `il en manque ${n}`,
        back: "Retour à la carte",
        store: "Magasin",
        storeLine: (n: number) => `Magasin · ${n} en stock`,
        summary: (ready: number, running: number) =>
          [
            ready > 0 ? `${ready} lot${ready > 1 ? "s" : ""} prêt${ready > 1 ? "s" : ""}` : null,
            running > 0 ? `${running} en cours` : null,
          ]
            .filter(Boolean)
            .join(" · ") || "Ateliers au repos",
        bread: (days: number) => `Pain des ouvriers : ${days} j`,
        harvest: "Récolter et relancer",
        waits: (resource: string) => `attend ${resource.toLowerCase()}`,
        level: (n: number) => `niv. ${n}`,
      },
      workshopRow: {
        ready: (n: number) => (n > 1 ? `${n} prêts` : "Prêt"),
        idle: "À lancer",
        starved: "Sans matière",
      },
      timeline: {
        label: "À venir",
        now: "maintenant",
        ready: (workshop: string) => `${workshop} prêt`,
        pays: (city: string) => `${city} paie`,
        orders: "Commandes",
        back: (vehicle: string) => `${vehicle} rentre`,
      },
      /** The cards that unfold beside the HUD's counters. */
      tips: {
        cash: {
          title: "Ducats",
          text: "La monnaie de la République : elle paie les marchandises, les ateliers, les véhicules et le Palais. Le classement compte votre bénéfice.",
          purse: "En caisse",
          escrow: "Engagés dans vos offres",
          turnover: "Bénéfice de la saison",
          action: "Aller au Marché",
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
        home: "Aux ateliers",
        out: (city: string, time: string) => `Vers ${city} · ${time}`,
        byFattore: "envoyé par le fattore",
        back: (time: string) => `Retour · ${time}`,
        capacity: (units: number) => `${units} u.`,
      },
      /** The five tabs at the foot of the screen (refonte UX, 28 October 2026). */
      nav: {
        label: "Les lieux",
        map: "Carte",
        workshops: "Ateliers",
        venice: "Venise",
        ranking: "Classement",
        conquest: "Conquête",
      },
      buttons: {
        harvest: "Récolter",
        restart: "Relancer",
        workshops: "Ateliers",
        store: "Magasin",
        build: "Bâtir",
        cargo: "Chargement",
        send: "Partir",
        go: "Partir",
        cancel: "Annuler",
        follow: "Suivre",
        upgrade: "Améliorer",
        rialto: "Marché",
        criee: "Vente rapide",
        suppliers: "Fournisseurs",
        signoria: "Contrôle",
        warehouse: "Entrepôt",
        fondaco: "Entrepôt de ville",
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
          `Vente rapide : ${resource.toLowerCase()} payé +${pct} · ${left}`,
        noCart: "Aucune charrette libre",
        pips: "Le chiffre sur une ville : ses commandes ouvertes. En or, votre stock en couvre ; en vert, pas encore.",
        pipsOk: "Compris",
        venice: "Le Marché et l'arrivage",
      },
      cart: {
        atHome: "Aux ateliers",
        loaded: (city: string) => `Chargée pour ${city}`,
        outbound: (city: string, left: string) => `Vers ${city} · ${left}`,
        inbound: (left: string) => `Retour aux ateliers · ${left}`,
        leaving: (city: string) => `Départ vers ${city}`,
        express: (left: string) => `routes dégagées · ${left}`,
        normalTrip: (minutes: string) => `trajet normal · ${minutes}`,
        pickCity: "Touchez une ville éclairée",
        nothing: "Rien à livrer avec votre stock pour l'instant",
      },
      notice: {
        title: "Messages",
        season: (day: number, of: number) => `Jour ${day} sur ${of}`,
        daysLeft: (n: number) => `fin dans ${n} j`,
        event: "La gazette",
        carnet: "Tâches du jour",
        yourSeason: "Votre saison",
        news: "Nouvelles",
      },
      page: { back: "Retour à la carte" },
      settings: "Réglages",
      campaign: {
        toCampaign: "Famille",
        toTrade: "← Commerce",
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
          `${rank}${rank === 1 ? "re" : "e"} · ${glory} points`,
        reserveLine: (reserve: number, levy: number, max: number) =>
          `Réserve ⚔ ${reserve} · levée ${levy}/${max}`,
        landLine: (holder: string, garrison: number, defense: number) =>
          `${holder} · garnison ${garrison} · défense ${defense}`,
        threat: (time: string) => `Marche ennemie, arrivée dans ${time}`,
        ours: (time: string) => `Votre famille y marche · ${time}`,
        backToTrade: "Revenez au commerce : touchez « Carte » au pied de l'écran.",
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
      comptoir: "Mes ateliers",
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
        rialto: (gap: string) => `${gap} / Marché`,
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
      buyHint: "Tout véhicule s'achète mule ; améliorez-le ensuite aux ateliers.",
      upgradeTitle: (name: string) => `Améliorer : ${name}`,
      upgradeHint:
        "Mule, charrette, chariot, grand chariot : chaque amélioration porte plus et va plus vite. Le véhicule doit être aux ateliers.",
      upgradeTo: (name: string) => `Devient : ${name}`,
      speed: (pct: number) => `Vitesse ${pct} %`,
      upgrade: (cost: string) => `Améliorer · ${cost}`,
      maxLevel: "Plus haut niveau atteint.",
      away: "De retour aux ateliers, il pourra être amélioré.",
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
        "Les villes ne rachètent plus aux ateliers : elles passent commande. Livrez-les depuis l'onglet Routes.",
      byRoad: "À livrer par la route",
      seeRoutes: "Voir les routes",
    },
    cargo: {
      title: "Chargement",
      sort: { reward: "Récompense", distance: "Distance", city: "Ville" },
      /** An urgent order the carter sees before it opens. */
      soon: (goods: string, city: string, inTime: string) =>
        `Urgente bientôt : ${goods} pour ${city}, dans ${inTime}`,
      kinds: {
        doge: "Doge",
        urgent: "Urgente",
        family: "Famille",
        fondaco: "Entrepôt de ville",
      } as Record<string, string>,
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
      /** E1-4: the workers eat when they work, a share of a loaf a batch and a level. */
      byBatch: (transform: string, raw: string) =>
        `Vos ouvriers mangent quand ils travaillent : ${transform} pain par lot et par niveau dans un atelier qui transforme, ${raw} pour une matière première. Sans pain, une nouvelle file va 50 % moins vite.`,
      batchNeed: (n: number, have: number) =>
        n > have
          ? `Ces lots mangent ${n} pain${n > 1 ? "s" : ""}, vous en avez ${have} : ils iront 50 % moins vite.`
          : `Ces lots mangent ${n} pain${n > 1 ? "s" : ""}.`,
      lowBatch: "Moins d'un jour de pain : une nouvelle file ira 50 % moins vite sans lui.",
      about: "Mangés par jour, environ",
      nextMeal: (inTime: string, need: number, have: number) =>
        `Prochain repas dans ${inTime} : il faut ${need} pains, vous en avez ${have}.`,
      why: (perLevel: number) =>
        `${perLevel} pains par niveau d'atelier : chaque niveau construit en ajoute.`,
      hungry: (left: string) =>
        `Ouvriers affamés encore ${left} : les lots lancés maintenant durent 50 % de plus. Achetez du pain au Marché.`,
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
      door: "Conquête",
      away: "Pendant votre absence",
      title: "La Conquête",
      closesIn: (time: string) => `fin dans ${time}`,
      closed: "Semaine close",
      night: "Nuit : les fronts reposent",
      troops: "Troupes",
      /** The troops' card on the HUD: the glory and the rank live there. */
      troopsTip: {
        title: "Vos troupes",
        text: "Vos terres recrutent chaque heure de jour, jusqu'au maximum, tant que vos troupes ont du pain. Chaque case prise rapporte des points de conquête.",
        troops: "Troupes",
        recruit: "Recrues",
        glory: "Points de conquête",
        rank: "Rang",
        rankOf: (rank: number, of: number) => `${rank}${rank === 1 ? "er" : "e"} sur ${of}`,
        bread: "Pain des troupes",
        breadLine: (stock: number, perDay: string) => `${stock} · −${perDay}/j`,
      },
      hungryShort: "Vos troupes ont faim : sans pain, plus de recrues",
      troopsLine: (troops: number, cap: number) => `${troops}/${cap}`,
      perHour: (n: number) => `+${n}/h`,
      perHourAt: (n: number, from: number) => `☾ +${n}/h à ${from} h`,
      returns: {
        title: "Fronts rentrés",
        line: (against: string, cells: number, spent: number, back: number) =>
          `${against} : +${cells} case${cells > 1 ? "s" : ""}, −${spent} troupes, ${back} rentrée${back > 1 ? "s" : ""}`,
        ok: "Compris",
      },
      glory: (glory: number, rank: number) => `${glory} points · ${rank}${rank === 1 ? "er" : "e"}`,
      milan: "Milan",
      /** The powers of 1450 held by the computer. */
      nations: {
        milan: "Milan",
        mantova: "Mantoue (Gonzague)",
        ferrara: "Ferrare (Este)",
        aquileia: "Aquilée (le Patriarche)",
        impero: "L'Empire",
      } as Record<string, string>,
      /** A nation's house, under the name of the city it holds from: « MANTOUE · Gonzague ». */
      locate: "Centrer sur mes terres",
      wholeMap: "Toute la carte",
      nationHouses: {
        mantova: "Gonzague",
        ferrara: "Este",
        aquileia: "le Patriarche",
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
        target: "Désigner",
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
        onShort: (to: number, minute = 0) =>
          `⚔ Bataille → ${to} h${minute > 0 ? ` ${String(minute).padStart(2, "0")}` : ""}`,
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
        ally: "S'allier",
        asked: "Proposée",
        accept: "Accepter",
        broken: "Rompre",
        send: "Envoyer",
        sendLine: (count: number, left: number) =>
          `Envoyer ${count} troupes (encore ${left} aujourd'hui)`,
        allyChip: "Allié",
        friendChip: "✦ Votre guilde",
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
        costs: "La guerre mange aussi des marchandises :",
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
            "Ni taxe du marché, et des quotas de la Douane doublés, pour le Signore et ses alliés.",
          calmiere: "Le prix d'une marchandise est plafonné au Marché, pour tous.",
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
      help: "Chaque semaine, les quatre grandes familles se disputent la Terraferme. Levez des troupes, engagez-en contre des ducats, prenez des terres aux milices, à Milan et aux autres familles. De 8 h à 22 h, chaque terre rapporte ses points de conquête à qui la tient, heure après heure. La famille qui a le plus de points à la fin de la semaine impose ses décrets la semaine suivante.",
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
      glory: "Points de conquête",
      gloryHelp:
        "Points de conquête de la semaine : la valeur des terres tenues, à chaque heure entre 8 h et 22 h.",
      weekEnds: (time: string) => `Fin de la semaine dans ${time}`,
      lastWeek: "Dernière semaine : la famille gagnante remporte la saison.",
      landsHeld: (n: number) => `${n} terre${n > 1 ? "s" : ""}`,
      night: (time: string) =>
        `Trêve de nuit : marches et points de conquête reprennent dans ${time}.`,
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
      map: "La Conquête",
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
        names: { rocca: "Rocca", campo: "Campo", dogana: "Douane" } as Record<string, string>,
        kinds: {
          rocca: "Forteresse",
          campo: "Camp avancé",
          dogana: "Péage fortifié",
        } as Record<string, string>,
        defense: (pct: string) => `Garnison comptée +${pct} en défense.`,
        glory: (pct: string) => `Points de conquête de la terre +${pct}.`,
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
            `Membres : taxe du Marché à ${tax}, quotas de la Douane +${quota}.`,
          gabelle: (good: string, pct: string) =>
            `Les autres paient ${pct} de plus sur leurs ventes de ${good} au Marché, au profit des membres.`,
          faveur: (city: string, pct: string, minutes: number) =>
            `Membres : livraisons à ${city} payées +${pct}, ses commandes urgentes à eux les ${minutes} premières minutes.`,
          peage: (pct: string, cities: string) =>
            `Les autres paient ${pct} de leurs livraisons à ${cities || "leurs villes"} aux membres.`,
          levant: (more: string, less: string) =>
            `Arrivage des bateaux : quota +${more} pour les membres, −${less} pour les autres.`,
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
      worth: "Votre bénéfice",
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
        mission: ["Ouvrir mes objectifs", "Chaque jour, de nouveaux objectifs et leur récompense."],
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
          "Milan lève ses troupes : cette semaine, ses garnisons et ses chevauchées sont moitié plus fortes. Ses forteresses rapportent toujours le plus de points de conquête.",
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
          "Les bateaux ne passent plus : sel et vin se paient 50 % de plus, épices, soie, fourrures et draps 60 %.",
        ],
        sensa: [
          "La Sensa",
          "La grande foire de l'Ascension : les commandes sont payées 15 % de plus et plus nombreuses. Dernière ligne droite avant la fin du mois.",
        ],
      } as Record<string, [string, string]>,
    },
    mastery: {
      kicker: "Spécialisation de la saison",
      title: "Choisissez votre voie",
      help: "Votre Maison a grandi : elle peut se spécialiser. La maîtrise vaut pour toute la saison ; seule l'Influence permet d'en changer.",
      pick: "Choisissez une maîtrise",
      confirm: (name: string) => `Devenir ${name}`,
      forGood: "Un seul choix pour la saison, sauf à le changer contre de l'Influence.",
      ready: "Votre Maison peut choisir sa maîtrise",
      readyHelp: "Maître d'atelier, roulier, négociant ou marchand du Levant",
      locked: (levels: number, need: number) =>
        `Spécialisation à ${need} niveaux d'ateliers (vous en avez ${levels}) : améliorez ou bâtissez.`,
      names: {
        master: "Maître d'atelier",
        carter: "Roulier",
        trader: "Négociant",
        levant: "Marchand du Levant",
      } as Record<string, string>,
      mottos: {
        master: "Qui transforme bien vend mieux.",
        carter: "Les routes sont à qui va vite.",
        trader: "Le Marché est mon atelier.",
        levant: "Les bateaux de l'arrivage ne viennent pas pour rien.",
      } as Record<string, string>,
      effects: {
        transform: (n: number) => `+${n} % de rendement sur ce qui se transforme`,
        speed: (n: number) => `véhicules ${n} % plus rapides`,
        vehicles: (n: number) => `${n} véhicule${n > 1 ? "s" : ""} de plus permis`,
        quota: (n: number) => `quotas de la Douane +${n} %`,
        tax: (n: number) => `taxe de marché −${n} point${n > 1 ? "s" : ""} sur vos ventes`,
        offers: (n: number) => `${n} offres de plus au Marché`,
        muda: (n: number) => `quota aux bateaux de l'arrivage +${n} %`,
      },
    },
    /** Words shared by every section's frame (the scene, its bars, its drawer). */
    stage: {
      help: "Comment ça marche",
      unfold: "Ouvrir le tiroir",
      fold: "Replier le tiroir",
    },
    market: {
      unpriced: (n: number) => `Pas encore échangées (${n})`,
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
        title: "Arrivage des bateaux",
        next: (time: string) => `Prochaines dans ${time}`,
        first: "Les premiers bateaux d'État arrivent bientôt d'Alexandrie et de Beyrouth.",
        help: "Leurs marchandises d'outre-mer sont vendues par la Douane, plus cher à mesure que le lot s'épuise : premiers arrivés, meilleurs prix.",
        empty: "Le quai est vide : tout est parti. Attendez les prochains bateaux.",
        stock: (n: number) => `${n} à quai`,
        left: (n: number) => (n > 0 ? `vous ${n}` : "pris"),
        quota: (left: number, stock: number, next: string) =>
          `Arrivage des bateaux : encore ${left} à acheter pour vous, ${stock} à quai. Nouveau lot dans ${next}.`,
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
      ready: (n: number): string => (n > 1 ? "prêts" : "prêt"),
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
      /**
       * The article of each good, by code: m (le, du), f (la, de la), v (l', de l'), p (les, des).
       * A good not listed is named bare, after a colon.
       */
      genders: {
        wheat: "m",
        flour: "f",
        bread: "m",
        clay: "v",
        bricks: "p",
        wood: "m",
        planks: "p",
        spices: "p",
        silk: "f",
        salt: "m",
        wine: "m",
        furs: "p",
        cloth: "p",
        sand: "m",
        glass: "m",
        mirrors: "p",
        wool: "f",
        drape: "m",
        garments: "p",
        prepared_spices: "p",
      } as Record<string, "m" | "f" | "v" | "p">,
      /** « le blé », « la farine », « l'argile », « les briques » (null: a good not listed). */
      the: (code: string, name: string): string | null => {
        const g = fr.game.workshop.genders[code];
        const n = name.toLowerCase();
        return g ? `${{ m: "le ", f: "la ", v: "l'", p: "les " }[g]}${n}` : null;
      },
      /** « du pain », « de la farine », « de l'argile », « des briques » (null: not listed). */
      some: (code: string, name: string): string | null => {
        const g = fr.game.workshop.genders[code];
        const n = name.toLowerCase();
        return g ? `${{ m: "du ", f: "de la ", v: "de l'", p: "des " }[g]}${n}` : null;
      },
      /** What limits the batches that can be started. */
      limitedBy: (n: number, code: string, res: string, have: number, perBatch: number) => {
        const the = fr.game.workshop.the(code, res);
        return `${n} lot${n > 1 ? "s" : ""} : limité par ${the ?? `: ${res.toLowerCase()}`} (${have} en stock, ${perBatch} par lot)`;
      },
      limitedByQueue: (n: number, hours: number) =>
        `${n} lot${n > 1 ? "s" : ""} : limité par la file (${hours} h)`,
      /** The materials an upgrade lacks: bought right away at the Rialto. */
      buyMissing: (cost: string) => `Acheter ce qui manque (≈ ${cost})`,
      buyMissingNone: "Personne ne vend ce qui manque au Marché pour l'instant.",
      buildHere: "Bâtir ici",
    },
    carnet: {
      title: "Tâches du jour",
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
      grace: "grâce disponible",
      chest: "Coffre du jour",
      chestHint:
        "Les trois tâches faites ouvrent le coffre ; chaque jour d'affilée l'agrandit (jusqu'à 5). Un jour manqué par semaine ne casse pas la série.",
      chestOpen: "Coffre ouvert : revenez demain pour prolonger la série.",
      resetsIn: (t: string) => `Nouvelles tâches dans ${t}`,
      claim: "Encaisser",
      tasks: {
        sell_city: "Vendre 3 fois à une ville",
        deliveries: "Livrer 2 commandes",
        urgent: "Livrer une commande urgente",
        many_deliveries: "Livrer 5 commandes",
        doge_order: "Honorer un contrat du Doge",
        place_offer: "Laisser une offre au Marché",
        harvests: "Récolter 4 fois",
        build_site: "Livrer un grand chantier",
        criee: "Vente rapide à une ville",
      } as Record<string, string>,
    },
    bales: {
      title: "Colis surprise de Faraj",
      kicker: "Présent d'Alexandrie",
      waiting: (n: number) =>
        n > 1 ? `${n} colis vous attendent au quai` : "Un colis vous attend au quai",
      next: (t: string) => `Prochain colis dans ${t}`,
      full: "Le quai est plein : ouvrez-en un pour que le suivant parte d'Alexandrie",
      none: "Plus de colis avant la fin du mois",
      arriving: "Un colis arrive au quai…",
      count: (n: number, max: number) => `${n}/${max}`,
      lorenzo:
        "Lorenzo remonte du quai : « Un colis pour vous, Messer, scellé de la marque de Faraj d'Alexandrie. »",
      story:
        "Votre grand-père a sauvé du naufrage, au large de Candie, la cargaison d'un jeune marchand d'Alexandrie. Faraj al-Iskandarani est devenu l'un des plus riches négociants du Levant, et il n'a pas oublié sa dette : toutes les six heures, une balle de toile cordée part pour votre comptoir. On ne sait jamais ce qu'elle contient : trois sacs de blé, ou un coupon de soie de Damas.",
      storyTitle: "Qui est Faraj ?",
      tapToOpen: "Touchez le sceau pour ouvrir",
      open: "Ouvrir le colis",
      revealAll: "Tout révéler",
      tapCard: "Touchez une carte pour la retourner",
      stored: "Rangé au magasin",
      nextBale: (left: number) => `Colis suivant (${left} restant${left > 1 ? "s" : ""})`,
      back: "Retour aux ateliers",
      odds: "Probabilités",
      oddsTitle: "Ce que contient un colis",
      oddsIntro: (cards: number, hours: number, max: number) =>
        `${cards} cartes par colis, de 1 à 5 unités chacune. Un colis toutes les ${hours} heures, ${max} au plus en attente au quai. Les colis ne s'achètent pas.`,
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
      kicker: "Vente rapide",
      title: (city: string, resource: string, pct: string) =>
        `${city} achète ${resource} à +${pct}`,
      endsIn: (t: string) => `Fin dans ${t}`,
      room: (mine: number, total: number) =>
        `Vous pouvez vendre ${mine} · il en reste ${total} pour tous`,
      sell: (q: number) => `Vendre ${q}`,
      none: "Rien à vendre en stock",
      soldOut: "Vente rapide épuisée",
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
      title: "Objectifs",
      constellation: (done: number, all: number) => `${done} missions faites sur ${all}`,
      claim: "Encaisser",
      go: "Y aller",
      reward: "Récompense",
      allDone: "Objectifs du jour remplis. Revenez demain pour la suite.",
      next: (title: string, inTime: string) => `Prochain objectif « ${title} » dans ${inTime}.`,
      items: {
        first_delivery: [
          "Première livraison",
          "Touchez une charrette sur la carte, puis « Chargement » : cochez une commande et « Partir ». La ville paie à l'arrivée.",
        ],
        first_vehicle: [
          "Premier véhicule",
          "Achetez un véhicule dans « Bâtir », onglet « Véhicules » (améliorer une mule ne compte pas) : livrez plusieurs commandes à la fois.",
        ],
        first_contract: [
          "Honorer un contrat du Doge",
          "Dans « Chargement », les commandes marquées « Doge » paient 20 % de plus : livrez-en une.",
        ],
        first_offer: [
          "Laisser une offre au Marché",
          "Au « Marché », touchez une marchandise, puis « À mon prix ».",
        ],
        offer_taken: [
          "Conclure une offre",
          "Un marchand achète ou vend sur votre offre : suivez-la dans « Mes offres », au « Marché ».",
        ],
        first_upgrade: [
          "Améliorer un atelier",
          "« Ateliers », puis « Améliorer » : le niveau 2 fait plus que doubler la production.",
        ],
        five_contracts: [
          "Honorer cinq contrats",
          "Le Doge passe de nouvelles commandes chaque jour, dans « Chargement ».",
        ],
        new_workshop: [
          "Construire un nouvel atelier",
          "« Bâtir », dans vos ateliers : agrandissez votre domaine.",
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
      title: "Bon retour",
      slept: "Votre comptoir s'est mis en sommeil : vos ouvriers n'ont ni mangé ni connu la faim.",
      /** The week closed while away: where the merchant finished, and its title. */
      week: {
        title: (n: number) => `Semaine ${n + 1}`,
        rank: (rank: number, award: string | null) =>
          `Vous terminez ${rank}${rank === 1 ? "er" : "e"}${award ? ` — ${award}` : ""}`,
        gain: (amount: string) => `${amount} de bénéfice dans la semaine`,
        award: "Le titre entre à votre palmarès, visible de tous les marchands.",
      },
      /** What the fattore sent while away. */
      fattore: (qty: number, what: string, city: string, paid: string | null, pct: number) =>
        `Le fattore a envoyé ${qty} unité${qty > 1 ? "s" : ""} ${/^[aeiouyéèêh]/i.test(what) ? "d'" : "de "}${what.toLowerCase()} à ${city}${paid ? ` (${paid}, −${pct} %)` : " (en route)"}`,
      earned: "Gagné",
      commerce: "Commerce",
      nothing: "Rien de vendu depuis votre dernière visite.",
      terra: {
        title: "Conquête",
        glory: (glory: number, rank: number) =>
          `${glory} points · ${rank}${rank === 1 ? "er" : "e"}`,
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
        criee_sale: "Ventes rapides",
        trade: "Ventes au Marché",
        market_maker_buy: "Ventes à la Douane",
        contract_reward: "Contrats du Doge",
        project_delivery: "Commandes de guilde",
        project_bonus: "Primes de guilde",
        mission_reward: "Objectifs",
        family_order_reward: "Commandes de famille",
        guild_dividend: "Dividendes de guilde",
        guild_payout: "Trésor de guilde partagé",
        decree_favour: "Faveur d'une ville",
        supplier_bonus: "Fournisseur officiel",
        tender_delivery: "Appels d'offres du Doge",
        quality_premium: "Qualité des manufactures",
        commission: "Commandes entre marchands",
        colleganza_share: "Parts d'investissement",
        share_dividend: "Dividendes d'actions",
        loan: "Emprunts",
        decree_share: "Part des décrets",
        signoria_toll: "Droit de porte du maître de la ville",
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
      `Matière première de votre région : ${raw}. Les autres ne s'extraient pas ici : achetez-les au Marché.`,
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
          "Prestige : ne produit rien. Compte à son coût dans le patrimoine, pas dans le classement (bénéfice).",
        sand_pit: "Tire le sable de la lagune, que la verrerie fond en verre.",
        glassworks: "Le verre de Murano : sable et bois fondus, pour la miroiterie.",
        mirrorworks: "Argente le verre en miroirs, que les palais des villes paient cher.",
        sheepfold: "Tond la laine des troupeaux, pour le métier à tisser.",
        loom: "Tisse la laine en drap, que le tailleur coupe.",
        tailor: "Coupe le drap en vêtements, le luxe des villes de la Terraferme.",
        spicery: "Prépare les épices de l'arrivage : les villes les paient presque le double.",
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
      "Prestige : ne produit rien. Compte à son coût dans le patrimoine, pas dans le classement (bénéfice).",
    rationsOfLevel: (loaves: number) => `Ouvriers : +${loaves} pains/jour`,
    cost: "Coût",
    missing: "manque",
    close: "Fermer",
    loading: "Ouverture du comptoir…",
    retry: "Réessayer",

    marketTabs: { joueurs: "Marché", villes: "Villes" },
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
      `« Tout de suite » : au meilleur prix du carnet (écart maximal ${slippage} %). « À mon prix » : votre offre attend un preneur jusqu'à 72 h. Taxe de ${tax} % payée par le vendeur entre joueurs ; aucune avec la Douane.`,
    book: {
      sellers: "Ils vendent",
      buyers: "Ils achètent",
      empty: "Personne",
      fondaco: "Douane",
      you: "Vous",
      quota: (buy: string, sell: string) =>
        `Douane aujourd'hui, pour cette marchandise : encore ${buy} à acheter, ${sell} à lui vendre.`,
      /** What an order right away can take now, from the book and the Dogana's quota. */
      nowMax: (buy: number, sell: number) =>
        `Tout de suite : jusqu'à ${buy} à l'achat, ${sell} à la vente (offres du carnet dans l'écart et quota de la Douane).`,
      /** The bounds of an order right away, on each side. */
      bounds: (cost: string | null, proceeds: string | null, tax: number) =>
        [
          cost ? `Coût max. à l'achat : ${cost}` : null,
          proceeds ? `Recette min. à la vente : ${proceeds} (taxe ${tax} % déduite)` : null,
        ]
          .filter(Boolean)
          .join(" · "),
      /** A purchase lowers the net sales, the ranking. */
      rankCost: (amount: string) => `Acheter : −${amount} sur votre bénéfice (classement).`,
      rules:
        "Tout de suite : au meilleur prix du carnet. À mon prix : votre offre attend un preneur.",
      more: "En savoir plus",
      dogana: (pct: number) => `Cours de la Douane : ${pct} % du prix de référence`,
      fondacoHelp:
        "La Douane de la République achète et vend chaque ressource de base en quantité limitée par marchand et par jour. Son cours suit l'offre et la demande : il monte quand les marchands lui achètent plus qu'ils ne lui vendent, baisse dans le cas contraire, et revient peu à peu au prix de référence.",
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
          return `${side === "sell" ? "Vente" : "Achat"} : ${filled} unité${filled > 1 ? "s" : ""} ${/^[aeiouyéèêh]/i.test(what) ? "d'" : "de "}${what.toLowerCase()} pour ${amount}.`;
        const why =
          reason === "quota"
            ? "quota de la Douane atteint pour aujourd'hui"
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
    /** The goods' code, told in the Aide (Lagune). */
    goodsCode: {
      title: "Les marchandises",
      text: "La couleur dit la filière, la forme dit l'étape. Une marque creuse : ce que votre stock ne couvre pas encore.",
      tiers: ["Brute", "Transformée", "Finie", "Outre-mer"],
    },

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
      /** The gazette of 8:05: what the night kept. */
      morning: (deliveries: number, paid: string, harvests: boolean, offers: number) =>
        `La gazette du matin : ${
          [
            deliveries > 0
              ? `${deliveries} livraison${deliveries > 1 ? "s" : ""} payée${deliveries > 1 ? "s" : ""} (${paid})`
              : "",
            harvests ? "des lots prêts à récolter" : "",
            offers > 0
              ? `${offers} offre${offers > 1 ? "s" : ""} prise${offers > 1 ? "s" : ""} au Marché`
              : "",
          ]
            .filter(Boolean)
            .join(", ") || "votre comptoir vous attend"
        }.`,
      /** A wave of the board opens with orders the stock covers. */
      wave: (at: string, covered: number) =>
        `Nouvelles commandes à ${at} : votre stock en couvre ${covered}.`,
      /** A streak of chests whose day's chest is still closed, at 19 h. */
      streak: (n: number) =>
        `Série de ${n} jours : le coffre du jour est encore fermé, finissez vos tâches avant la fin du jour.`,
      skirmishCall: (at: string) =>
        `Convocation à la partie rapide à ${at} : les marchands s'y retrouvent pour une partie classée.`,
      harvest: "Récolte prête : vos ateliers ont terminé leur production.",
      event: "Un événement agite les marchés.",
      seasonEnding: "Dernier sprint : la saison se termine dans 3 jours.",
      seasonOpened: (name: string) => `${name} commence : venez voir vos récompenses.`,
      criee: (city: string, what: string, pct: number) =>
        `Vente rapide : ${city} achète ${what} à +${pct} % pendant 20 minutes.`,
      deal: (what: string, price: string) => `Bonne affaire : ${what} à ${price} au Marché.`,
      order: (who: string, sold: boolean, qty: number, what: string) =>
        sold
          ? `Offre conclue : ${who} a acheté ${qty} ${what.toLowerCase()}.`
          : `Offre conclue : ${who} vous a vendu ${qty} ${what.toLowerCase()}.`,
      delivery: (qty: number, what: string, city: string, amount: string) =>
        `${qty} ${what} livrés à ${city} : ${amount} encaissés.`,
      muda: (goods: string) =>
        `Les bateaux de l'arrivage sont à quai : la Douane vend ${goods || "les marchandises d'outre-mer"} au Marché.`,
      siege: (land: string, by: string, lances: number, time: string) =>
        `${land} menacée : ${lances} troupes ${by} arrivent à ${time}. Renforcez la garnison !`,
      sfida: (event: string, by: string | null, ghost: boolean) =>
        event === "challenged"
          ? `${by ?? "Un marchand"} vous défie pour la semaine prochaine.`
          : ghost
            ? `Votre duel de la semaine : le fantôme de ${by ?? "un marchand"}.`
            : `Votre duel de la semaine : ${by ?? "un marchand"}.`,
      broglio: (event: string, price: string) =>
        ({
          sold: `Un marchand vous a acheté une rumeur (${price}).`,
          spied: "Un espion rôde autour de vos ateliers : chassez-le aux Rumeurs.",
          chased: "Votre espion a été chassé.",
          unmasked: "Une rumeur reçue au Marché venait d'un menteur, démasqué.",
          caught: "Votre fausse rumeur est démasquée : vous reculez dans votre ligue.",
        })[event] ?? "Du nouveau aux Rumeurs.",
      shares: (event: string, quantity: number, amount: string): string =>
        ({
          bought: `${quantity} actions de votre Maison ont trouvé preneur (${amount} pièce).`,
          council: "Un actionnaire a désormais accès à vos comptes.",
          dividend: `Vos actions vous rapportent ${amount} cette semaine.`,
          settled: `Fin du mois : vos actions vous sont rachetées ${amount}.`,
        })[event] ?? "Du nouveau sur vos actions.",
      doge: (event: string, by: string | null, candidate: boolean) =>
        event === "opened"
          ? candidate
            ? "Vous êtes candidat au Doge : annoncez votre programme à l'élection."
            : "L'élection du Doge est ouverte : lisez les programmes et votez à l'élection."
          : event === "won"
            ? "Vous êtes élu Doge : votre programme gouvernera le mois prochain."
            : `${by ?? "Un marchand"} est élu Doge : son programme gouvernera le mois prochain.`,
      letter: (name: string, text: string) => text || `Des nouvelles de ${name}.`,
      sera: (event: string, lots: number) =>
        event === "outbid"
          ? "Votre enchère est dépassée aux enchères du soir."
          : `Les enchères du soir commencent à 20 h : ${lots} lot${lots > 1 ? "s" : ""} aux enchères, et la bataille.`,
      signoria: (event: string, city: string, by: string | null) =>
        event === "podesta_named"
          ? `Vous êtes maître de ${city} : un droit sur les livraisons des autres, et ses commandes avant eux.`
          : event === "podesta_lost"
            ? `${by ?? "Un rival"} vous a repris ${city}.`
            : `${by ?? "Un rival"} vous dépasse sur la jauge de ${city}.`,
      family: (event: string, data: Record<string, string>) =>
        event === "terra_hungry"
          ? "Vos troupes ont faim : sans pain, vous ne recrutez plus."
          : event === "skirmish_aborted"
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
        help: "Recevez une alerte sur ce téléphone ou cet ordinateur, même jeu fermé. Jamais entre 22 h et 8 h (la gazette de 8 h 05 reprend la nuit), au plus une par type et par heure et trois par jour, sauf les terres menacées, envoyées tout de suite.",
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
          muda: "Les bateaux de l'arrivage sont à quai",
          morning: "Gazette du matin (8 h 05)",
          skirmish_call: "Convocations à la partie rapide (un quart d'heure avant)",
          wave: "Vague de commandes que votre stock couvre (si vous êtes absent)",
          streak: "Rappel de série (19 h, coffre du jour fermé)",
          signoria: "Contrôle des villes (maître nommé, ville perdue, rival en tête)",
          sfida: "Duel de la semaine et défis reçus",
          sera: "Les enchères du soir (19 h 55) et enchères dépassées",
          letter: "Suites de la lettre du jour",
          doge: "Élection du Doge (ouverture, élu)",
          broglio: "Les Rumeurs (rumeur vendue, espion, menteur démasqué)",
          shares: "Les actions (vendues, accès aux comptes, dividende, rachat)",
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
      help: "Bénéfice depuis le début de la semaine (ou depuis votre arrivée), en ducats : ce que vous avez vendu, moins ce que vous avez acheté. Chaque semaine, les trois meilleurs marchands (hors PNJ) reçoivent un titre : Doge, Procurateur et Sénateur de la semaine.",
    },
    season: {
      closed: (name: string) => `La saison ${name} est close`,
      rankOf: (rank: number, players: number) =>
        `${rank}${rank === 1 ? "er" : "e"} sur ${players} marchand${players > 1 ? "s" : ""}`,
      worth: "Bénéfice de la saison",
      podium: "Le podium",
      rewards: "Vos récompenses",
      milestone: (name: string) => `Palier ${name}`,
      goal: {
        title: "Objectif de saison",
        now: (name: string, n: number) =>
          n > 0
            ? `${name} : +${n} de prestige assurés à la fin du mois.`
            : `${name} : pas encore de prestige de palier.`,
        next: (name: string, worth: string, n: number) =>
          `Prochain palier : ${name}, à ${worth} de bénéfice (+${n} de prestige), quel que soit votre rang.`,
        top: "Plus haut palier atteint : tenez-le jusqu'à la fin du mois.",
      },
      renownTotal: (name: string) => `Prestige de la Maison : ${name}`,
      nothing: "Jouez au moins 7 jours dans une saison pour recevoir l'écusson de participant.",
      start: "Ouvrir mon nouveau comptoir",
      newSeason: (name: string) =>
        `${name} commence : tout le monde repart de zéro. Votre palmarès et votre prestige vous suivent.`,
      lastSprint: (days: number) =>
        `Dernier sprint : la saison se termine dans ${days} jour${days > 1 ? "s" : ""}.`,
      honoured: (pseudo: string, season: string) => `${pseudo}, Doge de ${season}`,
    },
    palmares: {
      title: "Palmarès",
      renown: "Prestige",
      renownHelp:
        "Le prestige s'accumule de saison en saison selon votre rang final. Il donne des titres, jamais d'avance économique : chaque saison, tout le monde repart à égalité.",
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
      "Bénéfice = tout ce que vous avez vendu (Marché, Douane, livraisons, commandes du Doge), taxes et péages déduits, moins tout ce que vous avez acheté. Le stock et les bâtiments ne comptent pas.",

    house: {
      card: "Votre Maison",
      titleOf: (name: string) => `Titre de la saison : ${name}`,
      renownOf: (n: number) => `Prestige ${n.toLocaleString("fr-FR")}`,
      influenceOf: (n: number) => `${n.toLocaleString("fr-FR")} d'Influence`,
      more: "Voir le détail",
      less: "Replier",
      title: "Livre de la Maison",
      influence: "Influence",
      intro:
        "Votre fortune repart à zéro chaque saison, votre Maison non : l'Influence se garde de saison en saison et achète des privilèges : des avantages gardés pour toujours, qui ouvrent du neuf sans jamais rapporter plus.",
      earn: "Elle ne s'achète pas et ne se gagne pas en vendant : seulement par les missions de la Maison, huit chaque semaine, renouvelées le lundi.",
      pages: { today: "Aujourd'hui", week: "Cette semaine" },
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
        commerce: (week: number | null) => `Bénéfice · semaine ${(week ?? 0) + 1}`,
        campaign: (week: number | null) => `Campagne · semaine ${(week ?? 0) + 1}`,
        season: () => "Fin de saison",
        patent: () => "Privilège",
        refund: () => "Remboursement",
        mission: () => "Mission de la Maison",
        arsenal: () => "Or de l'Arsenal",
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
        title: "Missions de la semaine",
        renews: (t: string) => `Nouvelles missions dans ${t}`,
        claim: (n: number) => `Recevoir · ${n} ✦`,
        claimed: "Reçue",
        reward: (n: number) => `${n} ✦`,
        names: {
          deliveries: (n: number) => `Livrer ${n} commandes`,
          many_deliveries: (n: number) => `Livrer ${n} commandes`,
          urgent: (n: number) => `Livrer ${n} commandes urgentes`,
          doge: (n: number) => `Honorer ${n} contrats du Doge`,
          offers: (n: number) => `Laisser ${n} offres au Marché`,
          rialto: (n: number) => `Voir ${n} de vos offres prises au Marché`,
          harvests: (n: number) => `Récolter ${n} fois`,
          upgrade: () => "Agrandir un atelier",
          build: () => "Bâtir un atelier",
          vehicle: () => "Améliorer un véhicule",
          chests: (n: number) => `Ouvrir ${n} coffres du jour`,
          bales: (n: number) => `Ouvrir ${n} colis de Faraj`,
          terra_place: () => "Poser son camp sur la carte de la Conquête",
          terra_cells: (n: number) => `Prendre ${n} cases sur la carte de la Conquête`,
          terra_city: () => "Prendre une ville de la Conquête",
          terra_rocca: () => "Bâtir une Rocca",
          terra_aid: () => "Envoyer des troupes à un allié",
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
        respecTitle: (name: string) => `Spécialisation : ${name}`,
        respecHelp: "Vous la choisissez de nouveau aussitôt, parmi toutes.",
        reroll: (n: number) => `Changer de tâche · ${n} ✦`,
        /** The same on a phone's narrow line: the sign of a change and its price. */
        rerollShort: (n: number) => `Changer · ${n} ✦`,
        /** Why the task cannot be changed yet. */
        rerollCost: (n: number, have: number) => `Changer une tâche : ${n} ✦ (vous : ${have})`,
      },
    },
    profileTitle: "Ma progression",
    nextTitle: (name: string) => `Prochain titre : ${name}`,
    maxTitle: "Titre suprême atteint",
    netWorth: "Patrimoine",
    turnover: "Bénéfice",
    merchantLevel: {
      short: (n: number) => `Niv. ${n}`,
      title: (n: number) => `Niveau ${n}`,
      progress: (xp: string, to: string) => `${xp} / ${to} points`,
      help: "Votre niveau ne redescend jamais : chaque ducat de bénéfice vous rapporte un point, saison après saison. Il est honorifique : aucun avantage en jeu, chaque saison tout le monde repart à égalité.",
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
    /** The name proposed at the door, changed once (E3-5). */
    /** Companies (E2-8): friends kept from month to month, with no power over the trade. */
    myCompany: {
      title: "Guilde",
      pitch:
        "De 2 à 6 amis, d'un mois à l'autre : un fil à vous, une convocation commune à la partie rapide, un palmarès partagé, et vos associés marqués ✦ sur la carte. Ni trésor, ni avantage au commerce.",
      found: "Fonder une guilde",
      namePlaceholder: "Nom de la guilde",
      create: "Fonder",
      waitUntil: (date: string) => `Vous pourrez rejoindre une guilde le ${date}.`,
      members: (n: number, max: number) => `${n} / ${max} associés`,
      me: "vous",
      seen: (ago: string) => `vu ${ago}`,
      notHere: "pas encore ce mois-ci",
      lacks: (has: string, wants: string) =>
        `Votre guilde a un ${has.toLowerCase()} : invitez un ${wants.toLowerCase()}.`,
      lacksAlone: (wants: string) => `Invitez un ${wants.toLowerCase()} pour commencer.`,
      invite: "Inviter un associé",
      copied: "Lien copié : envoyez-le à votre associé.",
      inviteText: (name: string) => `Rejoignez ma guilde « ${name} » sur Fondaco.`,
      call: (at: string) => `Convoquer à la partie rapide de ${at}`,
      called: (at: string, by: string) => `Convocation à la partie rapide de ${at}, par ${by}.`,
      calledHelp: "Chaque associé est prévenu un quart d'heure avant.",
      record: "Palmarès commun",
      recordEmpty: "Les saisons jouées à deux ou plus s'inscriront ici.",
      rank: (n: number) => `${n}ᵉ`,
      leave: "Quitter la guilde",
      leaveConfirm: "Quitter ? Vous attendrez 7 jours avant d'en rejoindre une autre.",
      leaveYes: "Oui, quitter",
      cancel: "Annuler",
      thread: {
        title: "Fil de la guilde",
        help: "Réservé à vos associés. Restez courtois : un message signalé par trois membres disparaît.",
        placeholder: "Un mot pour vos associés…",
      },
      invitation: {
        title: (name: string) => `Invitation : « ${name} »`,
        line: (n: number) => `${n} associé${n > 1 ? "s" : ""} déjà.`,
        full: "Cette guilde est complète (6 associés).",
        join: "Rejoindre",
        decline: "Non merci",
      },
      /** The badge on the choice of a trade, for whoever comes by a company's link. */
      regionBadge: "Manque à votre guilde",
      regionHelp: (name: string, jobs: string[]) =>
        jobs.length > 0
          ? `« ${name} » a déjà un ${jobs.map((j) => j.toLowerCase()).join(" et un ")} : ce métier lui manque.`
          : `Le métier que « ${name} » attend.`,
      errors: {
        already_member: "Vous êtes déjà dans une guilde.",
        left_recently: "Vous avez quitté une guilde il y a moins de 7 jours.",
        company_full: "Cette guilde est complète.",
        unknown_company: "Cette invitation n'existe plus.",
        invalid_name: "Un nom de 3 à 24 caractères, sans grossièreté.",
        name_taken: "Ce nom est déjà pris.",
        no_call: "Aucune convocation à venir.",
        other: "Cela n'a pas marché. Réessayez.",
      } as Record<string, string>,
    },
    rename: {
      open: "✎ Changer de nom (une fois, gratuit)",
      save: "Garder ce nom",
    },
    language: "Langue",
    languageNames: { fr: "Français", en: "English" } as Record<string, string>,
    textSize: "Taille du texte",
    textSizeNarrow: "Sur un écran étroit, le texte garde sa taille habituelle.",
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
      ledgerCsv: "Mes comptes (CSV, pour un tableur)",
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
    soundHint: "Une pièce qui sonne, une récolte, une charrette qui part, la cloche des messages.",
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
        "La Conquête, la guerre de la semaine, s'ouvre après votre première journée de commerce. Facultative : on n'y perd jamais rien.",
    },
    coach: {
      name: "Lorenzo, votre facteur",
      later: "Plus tard",
      step: (n: number, total: number) => `Objectif ${n}/${total}`,
      covered: "Fermez cette fenêtre pour continuer : ce que je vous montre est dessous.",
      produceTap: (building: string) =>
        `Lançons votre ${building.toLowerCase()} ! Touchez « Produire » : il attend du travail.`,
      tapHome: "Touchez « Mes ateliers », au centre de la carte.",
      openWorkshops: (building: string) =>
        `Lançons votre ${building.toLowerCase()} ! Ouvrez vos ateliers.`,
      /** The batch's own time: 30 seconds in the guide's first ones, 30 minutes after. */
      produce: (building: string, time: string) =>
        `Touchez « Produire » : ce lot de votre ${building.toLowerCase()} sera prêt dans ${time}.`,
      seconds: (n: number) => `${n} secondes`,
      readyIn: (time: string) => `Prêt dans ${time}`,
      wait: (ms: number): string =>
        ms < 60_000
          ? "Vos ouvriers s'activent. Patientez quelques secondes…"
          : "Vos ouvriers s'activent : explorez la carte en attendant, je vous fais signe.",
      harvest: "C'est prêt ! Touchez « Récolter » : la marchandise rentre en stock.",
      transform: (building: string) =>
        `Une matière brute vaut peu. Transformez-la : lancez votre ${building.toLowerCase()}.`,
      sellCity: (resource: string) =>
        `Vendez vos ${resource.toLowerCase()} à la ville qui paie le mieux.`,
      goRoutes:
        "Chaque marque autour d'une ville est une commande, pleine si votre stock la couvre. Touchez une charrette.",
      deliver:
        "Ouvrez les cargaisons : cochez une commande que votre stock couvre, la ville paie à l'arrivée.",
      dispatch: "Touchez « Partir » (ou laissez filer le compte à rebours).",
      welcomeEnRoute: (left: string) =>
        `Les routes sont dégagées ce matin : arrivée dans ${left}. La ville paiera à l'arrivée.`,
      enRoute: (left: string) => `Votre charrette est en route : arrivée dans ${left}.`,
      firstPay: "Première paie",
      goRialto:
        "Pour grandir, il faut les matériaux d'une autre région. Touchez Venise, puis le Marché.",
      /** « de l'argile », « des briques »: the good with its article. */
      buy: (some: string) => `Achetez ${some} : cela sert à améliorer vos ateliers.`,
      emptyMarket:
        "Personne ne vend rien au Marché pour l'instant et votre part de la Douane est épuisée pour aujourd'hui. Passons, vous achèterez plus tard.",
      skip: "Passer",
      /** The first upgrade (E3-3): its gain read from the yield, never written here. */
      investOpen: (building: string) => `Agrandissons votre ${building} : ouvrez vos ateliers.`,
      investTap: (building: string) => `Touchez le niveau de votre ${building} pour l'agrandir.`,
      investBuy:
        "Il manque des matériaux : achetez-les en une fois au Marché, juste ce qu'il faut.",
      invest: (building: string, level: number, times: string) =>
        `Au niveau ${level}, votre ${building} produira ×${times} à chaque lot. Agrandissez-le !`,
      ledger:
        "Voici vos objectifs : chaque jour, de nouveaux objectifs et leur récompense. Encaissez la première !",
      ledgerLater:
        "Sous la cloche des Messages, vos objectifs du jour : remplissez-les pour gagner des récompenses.",
      investLater:
        "Il vous faut encore des briques et des planches pour améliorer un atelier. Produisez, vendez, achetez : c'est la boucle du marchand !",
      done: "Bravo, vous connaissez la boucle : produire, vendre, réinvestir. Lancez vos ateliers avant de partir : ils tournent sans vous.",
      finish: "Terminer",
      /** The guide's last card: a time to come back, and the means to be told (E3-1). */
      rendezvous: {
        title: "Rendez-vous",
        launch: "Tout lancer jusqu'à ce soir",
        launched: "Vos ateliers tournent.",
        /** The hours, from the server: when the queues end, the board's next wave. */
        line: (queues: string | null, wave: string | null) =>
          [
            queues ? `Vos ateliers auront fini vers ${queues}.` : "",
            wave ? `Les villes passent leurs prochaines commandes à ${wave}.` : "",
          ]
            .filter(Boolean)
            .join(" ") || "Revenez récolter quand vos lots sont prêts.",
        notify: "Me prévenir",
        notifyHelp: "Une alerte quand vos lots sont prêts, trois par jour au plus, jamais la nuit.",
        notified: "Vous serez prévenu.",
        denied:
          "Les alertes sont bloquées par votre navigateur : vous les retrouverez dans le Profil.",
        reminder:
          "Vos ateliers travaillent pendant votre absence. Voulez-vous être prévenu quand vos lots sont prêts ?",
        later: "Plus tard",
      },
      install: {
        text: "Installez Fondaco : une icône sur l'écran d'accueil, le jeu en plein écran.",
        action: "Installer",
        later: "Plus tard",
      },
    },

    /** Company orders: a city's order filled by several merchants together. */
    company: {
      title: "L'Arsenal de la semaine",
      of: (city: string) => `Arsenal · ${city}`,
      line: "Bronze, Argent, Or · du lundi au dimanche",
      help: "Chaque semaine, une ville commande du pain, des briques et des planches aux trois régions. Jusqu'au Bronze, chaque unité est payée 10 % au-dessus de la référence, et chaque marchand qui a livré touche 10 % de plus quand le Bronze est atteint. Au-delà, l'Argent (une fois et quart le Bronze) et l'Or (une fois et demie) sont payés 5 % au-dessus de la référence. L'Argent apporte un quart de plus aux bateaux de l'arrivage la semaine suivante ; l'Or, 3 d'Influence à qui en a livré 2 % et au moins une unité après le Bronze. Les maisons de l'ordinateur s'arrêtent au Bronze.",
      tiers: [
        "Visez le Bronze",
        "Bronze atteint : prime versée. En route pour l'Argent",
        "Argent atteint : les bateaux de la semaine prochaine apporteront plus. En route pour l'Or",
        "Or atteint : 3 d'Influence pour qui a livré après le Bronze",
      ],
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
      none: "Aucune commande de guilde en cours.",
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
        project_delivery: "guilde",
        project_bonus: "primes",
        mission_reward: "missions",
        daily_reward: "tâches",
        starting_capital: "capitaux",
        market_maker_buy: "Douane",
        market_maker_sell: "Douane",
        market_tax: "taxe",
        construction: "chantiers",
        vehicle: "véhicules",
        terraferma: "Conquête",
        fattore: "fattore",
        decree_favour: "faveurs",
      } as Record<string, string>,
    },
    /** The season's chronicle, a card to share at the closing ceremony. */
    chronicle: {
      share: "Partager ma chronique",
      who: (pseudo: string, rank: number, of: number) =>
        `${pseudo}, ${rank}${rank === 1 ? "er" : "e"} marchand sur ${of}`,
      sales: (amount: string) => `${amount} de bénéfice`,
      title: (name: string) => `Titre : ${name}`,
      award: (name: string) => `Distinction : ${name}`,
      renown: (name: string) => `Prestige de la Maison : ${name}`,
      footer: "Un jeu de commerce honnête · une saison par mois",
    },
    /** The Journal du Rialto, in the notices. */
    journal: {
      title: "Journal du Marché",
      empty: "Rien de marquant depuis hier.",
      minutes: (n: number) => `${n} min`,
      hours: (n: number) => `${n} h`,
      someone: "un marchand",
      trade: (buyer: string, seller: string, qty: number, good: string, value: string) =>
        `${buyer} achète ${qty} ${good.toLowerCase()} à ${seller} pour ${value}`,
      company: (city: string, n: number) =>
        `La commande de guilde de ${city} est remplie par ${n} marchand${n > 1 ? "s" : ""}`,
      conquest: (who: string, cells: number) =>
        `${who} prend ${cells} terre${cells > 1 ? "s" : ""} sur la carte de la Conquête`,
      milan: (cells: number) =>
        `Milan prend ${cells} terre${cells > 1 ? "s" : ""} sur la carte de la Conquête`,
      signore: (who: string, conquest: boolean) =>
        `${who} devient Signore de la Conquête${conquest ? ", par conquête" : ""}`,
      noSignore: "La semaine de la Conquête se clôt sans Signore",
      community: "Rejoindre la communauté des marchands →",
    },
    /** Lorenzo's three bubbles at the first visit to the Terraferma. */
    terraIntro: {
      who: "Lorenzo",
      steps: [
        "Touchez une terre libre pour poser votre camp : vous y êtes à l'abri 12 heures.",
        "Touchez une terre au bord des vôtres, puis « Attaquer » : le front avance seul.",
        "Ce soir à 20 h, l'heure de bataille : tout va dix fois plus vite !",
      ],
      next: "Suivant",
      done: "Compris",
      guide: "Lire le guide",
    },
    /** The Terraferma's guide, with its diagrams. */
    terraGuide: {
      kicker: "Guide",
      title: "La Conquête",
      open: "Guide de la Conquête",
      openShort: "? Guide",
      cardText: "Le mode conquête expliqué pas à pas, avec des schémas.",
      intro:
        "Une conquête d'une semaine, à côté du commerce, sur la carte de la Vénétie découpée en cases. Facultative : vous n'y perdez jamais vos ducats ni vos marchandises. Les fronts avancent seuls, de 8 h à 22 h, même quand vous n'êtes pas là.",
      sections: [
        {
          diagram: "legend",
          title: "Lire la carte",
          text: "Vos terres sont dorées et cerclées d'or. Vos alliés sont en vert d'eau, en tirets ; ceux qui sont en guerre avec vous (un front contre vous, ou l'un des vôtres contre eux) sont cerclés de vermillon. Milan et les seigneurs sont hachurés. Les autres marchands restent discrets. La terre que vous touchez s'éclaire en bleu.",
        },
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
          text: "Sur vos terres, un curseur partage vos gens : les soldats recrutent (jusqu'à deux fois plus), les paysans récoltent pour vos ateliers du blé dans les plaines, de l'argile dans les collines, du bois dans les montagnes. Deux villes ou plus reliées à votre capitale par vos terres rapportent des ducats chaque heure.",
        },
        {
          diagram: "water",
          title: "L'eau : ports et barques",
          text: "Bâtissez un port sur une terre au bord de la lagune, du lac de Garde ou de l'Adriatique. Touchez ensuite une rive des mêmes eaux : « Débarquer » y envoie une barque, dix minutes par case d'eau, qui prend la rive puis avance comme un front. Les bateaux d'un port ennemi sur ces eaux coulent 30 % du débarquement.",
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
          text: "Chaque heure ouverte, chaque terre vous rapporte 1 point de conquête, chaque ville 3. À la fin de la semaine, le premier en points de conquête est le Signore : le décret qu'il a choisi s'applique la semaine suivante, pour lui et ses alliés. Tout le classement gagne de l'Influence pour sa Maison.",
        },
        {
          diagram: "battle",
          title: "Bataille et parties rapides",
          text: "Chaque soir de 20 h à 21 h, l'heure de bataille : les fronts avancent dix fois plus vite, venez les mener. De 8 h à 22 h, « Partie rapide » lance une partie en direct d'un quart d'heure contre d'autres marchands et des condottieri. Une seule par jour est classée : la première avec au moins un autre marchand, si votre camp est posé sur la carte de la semaine et qu'elle finit avant 22 h. Votre rang y rapporte des points de conquête à votre semaine ; les autres parties sont amicales, sans points de conquête.",
        },
      ],
    },
    /** The Condotta (E2-5): together against the nations, for a grade and nothing else. */
    condotta: {
      title: "Mercenaires",
      leave: "← La semaine",
      off: "Pas de mercenaires dans ce monde.",
      pitch: (minutes: number, share: number) =>
        `Une partie de ${minutes} minutes en coopération, seul ou avec votre guilde, contre trois nations et Milan. Tenez Padoue et ${share} % des terres à la fin.`,
      noReward:
        "Ni ducats, ni marchandises, ni points de conquête : un grade, et le niveau suivant.",
      level: (level: number, levels: number) => `Niveau ${level} / ${levels}`,
      grade: (name: string) => `Grade : ${name}`,
      alone: "Jouer seul",
      company: "Avec ma guilde",
      lobby: (n: number, time: string) => `${n} associé${n > 1 ? "s" : ""} · départ dans ${time}`,
      join: "Rejoindre",
      playing: (level: number, time: string) => `Niveau ${level} · fin dans ${time}`,
      hold: (share: number, target: number, city: string, holds: boolean) =>
        `${share}\u00a0% des terres sur ${target}\u00a0%${holds ? ` · ${city} tenue` : ` · ${city} à prendre`}`,
      won: (level: number) => `Victoire au niveau ${level} : le niveau suivant s'ouvre.`,
      lost: (level: number) => `Défaite au niveau ${level} : réessayez, ou venez à plusieurs.`,
      again: "Rejouer",
      /** The profile's line: the grade, and the best level won. */
      record: (grade: string, best: number) => `Mercenaires : ${grade} (niveau ${best} gagné)`,
      errors: {
        already_in: "Une partie de mercenaires vous attend déjà.",
        no_company: "Il faut une guilde (Profil).",
        lobby_full: "La troupe est au complet.",
        other: "Cela n'a pas marché. Réessayez.",
      } as Record<string, string>,
    },
    /** Skirmishes: live matches on the Terraferma. */
    skirmish: {
      title: "Partie rapide",
      leave: "← La semaine",
      off: "Pas de partie rapide dans ce monde.",
      pitch: (minutes: number) =>
        `Une partie en direct de ${minutes} minutes, le temps soixante fois plus vite, contre d'autres marchands et des condottieri.`,
      /** The day's ranked match, before it is played. */
      rankedToday: (left: number, humans: number) =>
        `Partie classée · ${left} aujourd'hui, dès ${humans} marchands : votre rang rapporte des points de conquête à votre semaine.`,
      ranked: "Partie classée : votre rang rapporte des points de conquête à votre semaine.",
      friendlyLate: (hour: number) =>
        `Partie amicale : elle finirait après ${hour} h, sans points de conquête. Votre partie classée, demain.`,
      friendlyAlone: (humans: number, later: boolean) =>
        `Partie amicale : il fallait ${humans} marchands, sans points de conquête. ${later ? "Votre partie classée du jour reste à jouer." : "Votre partie classée, demain."}`,
      friendlyFew: (humans: number) =>
        `Partie amicale tant qu'il n'y a pas ${humans} marchands : sans points de conquête.`,
      friendlyDone:
        "Partie amicale : sans points de conquête. Votre prochaine partie classée, demain.",
      friendlyOffMap:
        "Partie amicale : posez votre camp sur la carte de la Conquête de la semaine pour que votre partie du jour soit classée.",
      night: (opensAt: number, closesAt: number) =>
        `☾ Pas de partie rapide la nuit : elles reprennent à ${opensAt} h. Une partie classée par jour, de ${opensAt} h à ${closesAt} h.`,
      nightShort: (hour: number) => `☾ Parties rapides dès ${hour} h`,
      /** The calls of the day (E2-2): merchants meet at set hours. */
      nextCall: (at: string) => `Prochaine convocation à ${at} : les marchands s'y retrouvent.`,
      call: (at: string) => `Convocation de ${at.replace(":", " h ")} : la partie part à l'heure.`,
      /** A match lost to a restart of the server. */
      interrupted: skirmishInterrupted,
      open: "Lancer une partie rapide",
      join: "Rejoindre",
      /** Who it opens with, told before entering: « 2 marchands · 6 PNJ · départ dans 0:45 ». */
      lobby: (humans: number, bots: number, time: string) =>
        `${humans} marchand${humans > 1 ? "s" : ""} · ${bots} PNJ · départ dans ${time}${bots > 0 ? " ; un marchand qui arrive prend la place d'un condottiere." : "."}`,
      playing: (time: string) =>
        `En cours · fin dans ${time}. Touchez une terre au bord des vôtres pour attaquer.`,
      watching: "Une partie rapide est en cours : regardez-la, la prochaine s'ouvre ensuite.",
      someone: "Un marchand",
      cells: (n: number) => `${n} terre${n > 1 ? "s" : ""}`,
      glory: "Points de conquête",
    },
    /** The Terraferma's rating and last weeks, in the profile. */
    terraRecord: {
      title: "Conquête",
      rating: (r: number) => `Cote : ${r}`,
      none: "Aucune semaine jouée pour l'instant.",
      week: (week: number, rank: number, of: number, glory: number, rating: number) =>
        `Semaine ${week} : ${rank}${rank === 1 ? "er" : "e"} sur ${of} · ${glory} points · cote ${rating}`,
      replay: "Revoir la semaine",
      weekShort: "Semaine",
      replaying: "Semaine rejouée",
      skip: "Passer",
    },
    /** A workshop in figures (margins at reference prices). */
    economics: {
      /** The margin at reference prices, a chip: « ≈ 20,8 d/h ». */
      perHour: (amount: string) => `≈ ${amount}/h`,
      perHourLong: "Marge théorique par heure, aux prix de référence",
      /**
       * Why upgrading it is not advised (its state is told above): its goods pile up, or it lacks
       * an input.
       */
      unsold: (qty: number, res: string, hours: number, dogana: number | null) =>
        `Amélioration déconseillée : ${qty} ${res.toLowerCase()} invendus, ~${hours >= 48 ? `${Math.round(hours / 24)} j` : `${hours} h`} de production${dogana !== null ? ` ; la Douane en prend ${dogana} par jour` : ""}.`,
      missing: (list: string) => `Amélioration déconseillée : il manque ${list}.`,
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
      harvestGo: "Récolter et relancer",
      produce: (building: string) => `${building} ne fait rien et a de quoi travailler.`,
      produceGo: "Produire",
      company: (n: number, code: string, resource: string) => {
        // « du pain », « de la farine », « de l'argile », « des briques » (see workshop.genders).
        const some = fr.game.workshop.some(code, resource);
        return some
          ? `La commande de guilde attend ${some} : vous en avez ${n} à livrer.`
          : `La commande de guilde attend : ${resource.toLowerCase()}. Vous en avez ${n} à livrer.`;
      },
      companyGo: "Livrer",
      upgrade: (building: string, adds: string, payback: string) =>
        `Améliorez ${building} : +${adds} par heure, rentabilisé en ${payback}.`,
      upgradeGo: "Améliorer",
    },
    /** Deals between merchants: commissions and colleganze. */
    deals: {
      title: "Entre joueurs",
      tile: (n: number) =>
        n > 0 ? `${n} affaire${n > 1 ? "s" : ""} à saisir` : "Commandes et colleganze",
      tabs: {
        commissions: "Commandes",
        colleganze: "Investir",
        bank: "Emprunter",
        parts: "Actions",
      },
      bank: {
        help: (share: number, pct: number, days: number, late: number) =>
          `Vous pouvez emprunter jusqu'à ${share} % de votre patrimoine, ${days} jours au plus, à ${pct} % par jour. À l'échéance, l'emprunt se rembourse sur votre caisse ; ce qui manque est majoré de ${late} % et prélevé sur vos rentrées. Remboursé plus tôt, vous ne payez que les jours entamés.`,
        none: "Votre patrimoine ne permet pas encore d'emprunter.",
        current: (owed: string, left: string) => `Vous devez ${owed} · échéance dans ${left}.`,
        late: (owed: string) => `En retard : ${owed} restent dus, prélevés sur vos rentrées.`,
        repay: "Rembourser maintenant",
        amount: "Montant emprunté",
        cost: (interest: string, total: string) => `Intérêts ${interest} · à rendre ${total}`,
        borrow: "Emprunter",
      },
      someone: "un marchand",
      you: "Vous",
      commissionHelp:
        "Commandez une marchandise aux autres marchands à votre prix : vos ducats sont bloqués jusqu'à la livraison, rendus si personne ne livre à temps. Le vendeur paie la taxe du marché, comme au Marché.",
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
        `Investir dans un joueur, comme la colleganza vénitienne : avancez des ducats à un autre marchand pour quelques jours. À l'échéance, il vous rend le capital et une part (jusqu'à ${max} %) du bénéfice qu'il a fait entre-temps — autant que sa caisse le permet. Cette part passe de son classement au vôtre.`,
      noColleganza: "Aucun investissement en cours.",
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
      newColleganza: "Proposer un investissement",
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
    /** A merchant's fondaco in a city (E1-3). */
    fondaco: {
      title: (city: string) => `Entrepôt de ${city}`,
      line: (level: number, top: number) =>
        level > 0 ? `Niveau ${level} sur ${top}` : "Pas encore d'entrepôt ici",
      orders: (n: number) =>
        n > 0
          ? `${n} commande${n > 1 ? "s" : ""} de la ville par jour, pour vous seul.`
          : "Aucune commande de la ville pour vous seul.",
      next: (level: number) => (level === 1 ? "Ouvrir l'entrepôt" : `Passer au niveau ${level}`),
      cost: "Coût",
      top: "Votre entrepôt est au plus haut niveau.",
      full: (levels: number, max: number, cities: number) =>
        `Vous avez ${levels} niveau${levels > 1 ? "x" : ""} sur ${max}, dans ${cities} ville${cities > 1 ? "s" : ""} au plus.`,
      build: "Construire",
      help: (cities: number, levels: number, top: number, pct: number) =>
        `Un entrepôt dans ${cities} villes au plus, du niveau 1 au niveau ${top}, ${levels} niveaux en tout. Chaque niveau vous donne chaque jour une commande de la ville, à vous seul, payée ${pct} % du prix du tableau commun : moins chère que le tableau, mais sûre. Les ducats sortent du jeu, les briques et les planches aussi ; le fondaco compte dans votre patrimoine à son coût.`,
    },
    /** The Signoria of the cities (R2): the gauge of a city and its Podestà. */
    signoria: {
      title: (city: string) => `Contrôle de ${city}`,
      kicker: "Qui tient la ville",
      podesta: "Maître",
      vacant: "Pas encore de maître",
      you: "Vous",
      points: (n: number) => `${n.toLocaleString("fr-FR")} pts`,
      share: (pct: number) => `${pct} %`,
      mine: (pct: number) => `Votre part : ${pct} %`,
      held: "Vous êtes maître de la ville",
      line: (toll: number, minutes: number) =>
        `Le maître de la ville prend ${toll} % des livraisons des autres et voit les commandes ${minutes} min avant eux.`,
      decided: "Le maître de la ville se décide chaque nuit à minuit.",
      help: (pointsPerHour: number, keptPct: number, max: number, toll: number, minutes: number) =>
        `Chaque ducat payé par une livraison partie entre 8 h et 22 h compte un point sur la jauge de la ville ; tenir la ville sur la carte de la Conquête en compte ${pointsPerHour} par heure ouverte. Chaque nuit à minuit, le premier devient maître et les points ne gardent que ${keptPct} %. Une maison tient ${max} villes au plus ; les maisons de l'ordinateur ne le deviennent jamais. Le maître de la ville prend ${toll} % des livraisons des autres vers sa ville (pas des nouveaux venus) et prend ses commandes ${minutes} minutes avant tout le monde.`,
      none: "Personne n'a encore compté ici.",
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
      line: (days: number) => `Bénéfice · ${days} jours`,
      help: (days: number) =>
        `Votre bénéfice compté comme au classement : ce qui entre pour vos marchandises, moins ce qu'elles vous coûtent. La courbe additionne les ${days} derniers jours.`,
      perHour: (amount: string) => `≈ ${amount} de marge par heure`,
      hour: "Par heure",
      today: "Aujourd'hui",
      week: "Cette semaine",
      chart: (days: number) =>
        `Bénéfice des ${days} derniers jours : vous, votre rival et le premier de la semaine`,
      who: {
        me: (_: string) => "Vous",
        rival: (name: string) => `Rival : ${name}`,
        leader: (name: string) => `Premier : ${name}`,
      },
    },
    /** The rival of the week, under the rank on the map. */
    /** The Broglio (R8): rumours, their sources, their sale, false ones, the spy. */
    shares: {
      title: "Votre Maison en bourse",
      notListed:
        "Mettez votre Maison en bourse : 100 actions, dont 49 au plus en d'autres mains. Vous en gardez toujours 51.",
      refusal: (code: string, day: number, days: number): string =>
        ({
          too_early: `La mise en bourse ouvre le jour ${day + 1} du mois.`,
          too_new: `Il faut ${days} jours de présence pour mettre sa Maison en bourse.`,
          season_over: "Le dernier jour du mois, le carnet est fermé.",
          already_listed: "Votre Maison est déjà en bourse.",
        })[code] ?? "La mise en bourse n'est pas ouverte.",
      list: "Mettre ma Maison en bourse",
      lastPrice: (price: string | null): string =>
        price ? `Dernier cours : ${price} l'action` : "Aucune action échangée encore",
      float: (n: number, max: number) => `${n} actions en d'autres mains sur ${max} possibles`,
      register: "Le registre",
      shares: (n: number) => `${n} action${n > 1 ? "s" : ""}`,
      you: "vous",
      issue: "Émettre",
      buyBack: "Racheter",
      quantity: "Actions",
      price: "Prix de l'action",
      issueGo: (n: number, price: string) => `Mettre ${n} actions en vente à ${price}`,
      buyBackGo: (n: number, price: string) => `Racheter ${n} actions à ${price}`,
      orders: "Vos ordres ouverts",
      order: (side: "buy" | "sell", n: number, price: string): string =>
        `${side === "buy" ? "Achat" : "Vente"} de ${n} actions à ${price}`,
      cancel: "Retirer",
      book: "Le carnet",
      ask: (n: number, price: string) => `${n} actions à ${price}`,
      bid: (n: number, price: string) => `On demande ${n} actions à ${price}`,
      noAsk: "Aucune action en vente.",
      buy: (n: number, price: string) => `Acheter ${n} actions à ${price}`,
      sell: (n: number, price: string) => `Vendre ${n} actions à ${price}`,
      paid: (amount: string) => `Dividendes versés ce mois : ${amount}`,
      held: "Vos actions ailleurs",
      heldLine: (n: number, amount: string) => `${n} actions · ${amount} de dividendes`,
      noneHeld: "Aucune action d'une autre Maison. Ouvrez la fiche d'un marchand pour en acheter.",
      theirs: "Ses actions",
      notTheirs: "Cette Maison n'est pas en bourse.",
      mine: (n: number, amount: string) => `Vous en avez ${n} · ${amount} de dividendes reçus`,
      council: "Vous avez accès à ses comptes",
      accounts: (cash: string, week: string) => `Caisse ${cash} · bénéfice de la semaine ${week}`,
      help: (dividend: number, council: number) =>
        `Chaque semaine, les porteurs se partagent ${dividend} % du bénéfice gagné par la Maison, au prorata, dans la limite de sa caisse. Qui détient ${council} actions a accès à ses comptes. Le dernier jour du mois, la Maison rachète toutes les actions au dernier cours, dans la limite de sa caisse. Une action échangée paie la taxe du marché.`,
    },
    broglio: {
      kicker: "Les Rumeurs",
      title: "Les rumeurs du Marché",
      summary: "Ce qu'on dit ce matin. À vous de juger vos sources.",
      line: (n: number) => `${n} rumeur${n > 1 ? "s" : ""} ce matin`,
      spiedLine: "On vous espionne : chassez l'espion aux Rumeurs.",
      sources: {
        gondoliere: "un gondolier",
        postino: "un facteur",
        dogana: "un commis de la Douane",
        senato: "un secrétaire du Sénat",
        rialto: "un marchand du Marché",
      } as Record<string, string>,
      said: (source: string, pct: number) => `D'après ${source} · sûr à ${pct} %`,
      event: (title: string, city: string | null, when: string) =>
        city ? `${title} (à ${city}), ${when}.` : `${title}, ${when}.`,
      muda: (big: boolean): string =>
        big
          ? "Les bateaux de l'arrivage apporteront beaucoup à la prochaine arrivée."
          : "Les bateaux de l'arrivage apporteront peu à la prochaine arrivée.",
      when: (days: number) =>
        days <= 0 ? "aujourd'hui" : days === 1 ? "demain" : `dans ${days} jours`,
      sell: (price: string) => `Vendre au Marché · ${price}`,
      offered: (n: number) => `En vente · ${n} acheteur${n > 1 ? "s" : ""}`,
      cancel: "Retirer",
      market: "Au Marché",
      marketEmpty: "Aucune rumeur à vendre pour l'instant.",
      kindEvent: "un événement à venir",
      kindMuda: "le prochain arrivage",
      buy: (price: string) => `Acheter · ${price}`,
      bought: "Achetée",
      forYou: "pour vous",
      past: "Les rumeurs des jours passés",
      truth: (t: boolean | null): string =>
        t === null ? "on ne sait pas encore" : t ? "vraie" : "fausse",
      unmasked: "venait d'un menteur",
      spy: "L'espion",
      spyNone: "Postez un espion chez un rival : il vous montre chaque jour une de ses offres.",
      spyAt: (name: string) => `Votre espion chez ${name}`,
      spyOffer: (side: string, q: number, good: string, price: string) =>
        `Il ${side === "sell" ? "vend" : "achète"} ${q} ${good} à ${price}.`,
      spyEmpty: "Aucune offre ouverte aujourd'hui.",
      spyHire: (cost: string) => `Poster un espion · ${cost}`,
      spyPick: "Chez qui ?",
      spied: "Un espion rôde autour de vos ateliers.",
      chase: (cost: string) => `Chasser l'espion · ${cost}`,
      forge: "Inventer une rumeur",
      forgeHelp: (n: number) =>
        `Une fausse rumeur, remise demain à trois marchands. Elle coûte ${n} ✦ ; démasquée, elle vous fait reculer dans votre ligue.`,
      forgeDone: "Rumeur inventée : elle courra demain.",
      forgeButton: (n: number) => `L'inventer · ${n} ✦`,
      mudaBig: "Beaucoup",
      mudaSmall: "Peu",
      help: "Chaque matin, deux rumeurs de ce qui vient : un événement de la gazette, le lot du prochain arrivage. Chaque source dit vrai aussi souvent que sa fiabilité ; le nouveau venu n'entend que des sources sûres pendant trois jours. Les rumeurs se vendent au Marché (le vendeur n'est jamais nommé). On peut en inventer une fausse contre de l'Influence : elle court chez trois marchands, et si elle est démasquée, son auteur recule dans sa ligue. Un espion chez un rival montre une de ses offres chaque jour ; l'espionné le sait, sans savoir qui, et peut le chasser. Aucune rumeur ne nomme un marchand.",
    },
    /** The Grand Canal (R5): forty palaces, given by each month's ranking. */
    canal: {
      tab: "Les 40 palais",
      title: "Les 40 palais",
      label: "Les palais du Grand Canal, du palais des Doges au Rialto",
      help: "Quarante palais, du palais des Doges au Rialto. Le classement de chaque mois les redonne : une Maison qui reste dans les quarante garde son palais, celle qui en sort le perd, les nouvelles prennent les plus beaux palais libres. Il faut avoir joué une semaine du mois. La façade dit la Maison : un étage par génération, une étoile par Atout débloqué, un écu par ville tenue, la corne du Doge.",
      empty: "Les palais attendent leurs Maisons : les quarante premiers du mois s'y installeront.",
      plot: (n: number) => `Palais ${n}`,
      yours: (n: number) => `Votre palais : le ${n}${n === 1 ? "er" : "e"} des 40 palais.`,
      none: (sestiere: string) => `Hors des 40 palais : votre Maison est à ${sestiere}.`,
      facade: (g: number, a: number, c: number) =>
        [
          g > 0 ? `${g} génération${g > 1 ? "s" : ""}` : "",
          a > 0 ? `${a} Atout${a > 1 ? "s" : ""}` : "",
          c > 0 ? `${c} ville${c > 1 ? "s" : ""}` : "",
        ]
          .filter(Boolean)
          .join(" · "),
      doge: (name: string) => `Doge du mois : ${name}`,
      sestieri: ["Cannaregio", "Castello", "Dorsoduro", "San Polo", "Santa Croce", "San Marco"],
    },
    /** The Doge (R7): the Senate, its candidates, programmes and voices. */
    doge: {
      kicker: "L'élection",
      title: "L'élection du Doge",
      summary:
        "Les dix premières Maisons briguent la couronne du mois prochain. Chacune annonce son programme : la saison qu'elle choisit et un décret de la République.",
      closesIn: (time: string) => `Clôture dans ${time}`,
      line: "L'élection du Doge est ouverte : lisez les programmes et votez.",
      lineVoted: "Votre voix est donnée ; vous pouvez changer d'avis jusqu'à la clôture.",
      noProgramme: "Pas encore de programme",
      votes: (n: number) => `${n} voix`,
      vote: (name: string) => `Voter pour ${name}`,
      voted: (name: string) => `Votre voix va à ${name}`,
      weight: (n: number) =>
        `Votre voix pèse ${n} : une, et une de plus par ville dont vous êtes maître.`,
      boost: "De l'Influence pour plus de poids",
      boostLabel: (n: number, cost: number) => (n === 0 ? "Aucune" : `+${n} · ${cost} ✦`),
      stand: "Votre programme",
      standHelp: "Choisissez la saison et le décret que vous imposerez si vous êtes élu.",
      season: "La saison",
      decree: "Le décret de la République",
      target: "Pour",
      announce: "Annoncer mon programme",
      announced: "Programme annoncé : vous pouvez le changer jusqu'à la clôture.",
      ruling: (name: string) => `Doge du mois : ${name}`,
      decreeNames: {
        faveur: "Faveur d'une ville",
        franchigia: "Franchise du Rialto",
        levante: "Charte du Levant",
        calmiere: "Calmiere",
      } as Record<string, string>,
      decrees: {
        faveur: (target: string, pct: number) =>
          `Faveur de ${target} : les livraisons à ${target} payées ${pct} % de plus, pour tous.`,
        franchigia: (_t: string, pts: number) =>
          `Franchise du Rialto : la taxe du marché allégée de ${pts} point${pts > 1 ? "s" : ""}, pour tous.`,
        levante: (_t: string, pct: number) =>
          `Charte du Levant : ${pct} % de plus au quota de la Douane, pour tous.`,
        calmiere: (target: string, pct: number) =>
          `Calmiere : aucune offre de ${target} au-delà de ${pct} % de sa référence.`,
      } as Record<string, (target: string, n: number) => string>,
      help: "La dernière semaine du mois, le Sénat élit le Doge du mois suivant parmi les dix premières Maisons (le Doge sortant ne peut pas se représenter). Chaque marchand arrivé depuis trois jours vote ; sa voix pèse une, plus une par ville dont il est maître, plus jusqu'à trois achetées en Influence. Le Doge élu choisit la saison du mois suivant et un décret de la République qui vaut pour tous, tout le mois ; son portrait accueille chacun à la connexion.",
    },
    /** The Dynastie (R4): the house's line, a member a month, an heir and its trait. */
    dynasty: {
      member: (given: string, house: string, year: number) => `${given} ${house}, ${year}`,
      nameKicker: "Votre Maison ce mois-ci",
      nameHelp: "Chaque mois, un membre de votre Maison tient le comptoir. Choisissez son prénom.",
      heirKicker: "Votre héritier",
      heirHelp:
        "Le mois s'achève : nommez l'héritier qui tiendra le comptoir le mois prochain, et le trait qu'il reçoit de vous. Un trait est une option ou une information, jamais du rendement.",
      heirNone: "Aucun trait mérité ce mois-ci : votre héritier part sans héritage, comme vous.",
      bequeath: (trait: string) => `Léguer « ${trait} » et commencer`,
      bequeathed: (trait: string) => `Votre héritier reçoit « ${trait} ».`,
      trait: "Trait de la Maison",
      freeReroll: "Changer de tâche · gratuit, par votre trait",
      freeShort: "Changer · gratuit",
      freeRespec: "Changer de maîtrise · gratuit",
      tomorrow: (name: string) => `Demain, une lettre de ${name}.`,
      gallery: "Galerie de la Maison",
      galleryHelp: "Chaque mois, un portrait de plus. La fortune repart ; la lignée reste.",
      rank: (n: number) => `${n}${n === 1 ? "er" : "e"} du mois`,
      traits: {
        nato_quai: ["Né sur les quais", "Voit les commandes urgentes 15 min plus tôt."],
        rialto: ["Élevé au Rialto", "Une quatrième carte dans l'offre des Atouts."],
        condottiere: ["Fils de condottiere", "Change sa maîtrise une fois sans Influence."],
        amico_citta: ["Ami des villes", "Voit les dix premiers du contrôle de chaque ville."],
        notaio: ["Fils de notaire", "Change une tâche du jour sans Influence, chaque jour."],
        letterato: ["Le Lettré", "Sait qui lui écrira demain."],
      } as Record<string, [name: string, line: string]>,
      earnedBy: {
        nato_quai: "un lot gagné aux enchères",
        rialto: "le top 10 du mois",
        condottiere: "Signore d'une semaine",
        amico_citta: "maître d'une ville",
        notaio: "sept coffres du jour d'affilée",
        letterato: "vingt lettres répondues",
      } as Record<string, string>,
      epithets: {
        magnifico: "le Magnifique",
        rovinato: "le Ruiné",
        podesta: "le maître de la ville",
        condottiere: "le Condottiere",
        costante: "le Constant",
      } as Record<string, string>,
    },
    /** The Letter of the day (R10): the month's letters (`i18n.letters.ts`) and the sheet's words. */
    letters: {
      ...lettersFr,
      kicker: "La lettre du jour",
      waiting: (name: string) => `Une lettre de ${name} vous attend`,
      read: (name: string) => `Relire la lettre de ${name}`,
      pays: (what: string) => `Coûte ${what}`,
      gives: (what: string) => `Donne ${what}`,
      later: "Une suite viendra, peut-être",
      answered: "Votre réponse",
      tomorrow: "La prochaine lettre arrive demain matin.",
      none: "Pas de lettre aujourd'hui : Lorenzo repasse demain.",
      cannot: "Vous n'avez pas de quoi",
      followup: (name: string) => `Des nouvelles de ${name}`,
      help: "Chaque jour de la saison, une lettre d'un personnage de Venise : Lorenzo le facteur, Faraj d'Alexandrie, la veuve Contarini, Ser Marin du Sénat, et parfois un Milanais sans nom. Deux réponses possibles ; vos choix décident des lettres suivantes, et certaines suites arrivent des jours plus tard. Les gains sont petits et plafonnés pour la saison. La dernière lettre du mois raconte ce que votre Maison est devenue.",
    },
    /** The Atouts (R3): figures of Venice who bend a rule, one taken a week. */
    atouts: {
      kicker: "L'Atout de la semaine",
      waiting: "Trois Atouts vous attendent : prenez celui de la semaine.",
      title: "Trois figures de Venise",
      summary: "Prenez-en une pour toute la saison : chacune donne, et chacune retire.",
      take: (name: string) => `Prendre ${name.charAt(0).toLowerCase()}${name.slice(1)}`,
      held: "Vos Atouts de la saison",
      none: "Aucun Atout encore : le prochain se choisit lundi.",
      taken: "Atout de la semaine choisi : le prochain lundi.",
      locked: "À débloquer",
      unlocks: {
        podesta: "Devenez maître d'une ville",
        incanto: "Gagnez un lot aux enchères",
        signore: "Soyez Signore d'une semaine",
        mercante: "Atteignez la ligue 4 (Mercante)",
      } as Record<string, string>,
      help: "Chaque lundi, trois Atouts sont tirés de votre réserve ; vous en prenez un, pour toute la saison. Chacun donne et retire. La réserve compte douze figures au départ ; quatre de plus se débloquent par un exploit, et restent à votre Maison d'une saison à l'autre.",
      names: {
        banchiere: [
          "Le Banquier du Rialto",
          "Ses écritures allègent vos taxes ; la Douane se méfie.",
        ],
        gondoliere: ["Le Gondolier", "Il connaît les raccourcis ; une mule reste à l'écurie."],
        vetraio: [
          "Le Maître verrier",
          "Ses fours transforment mieux ; vos champs s'en ressentent.",
        ],
        contadino: [
          "Le Fermier de Terraferma",
          "Ses terres donnent plus ; les villes paient un peu moins.",
        ],
        sensale: ["Le Courtier", "Plus d'offres ouvertes ; il prend sa part sur vos ventes."],
        capitano: [
          "Le Capitaine de galère",
          "Plus de place aux bateaux ; vos livraisons perdent un peu.",
        ],
        notaio: [
          "Le Notaire",
          "Vos livraisons pèsent plus pour le contrôle des villes ; ses actes coûtent.",
        ],
        carrettiere: ["Le Charretier", "Une charrette de plus ; elles vont moins vite."],
        doganiere: ["Le Douanier", "La Douane vous rachète haut ; moins d'offres ouvertes."],
        messaggero: ["Le Messager", "Il annonce les urgences ; ses courses vous coûtent du blé."],
        levantino: [
          "Le Marchand du Levant",
          "Les villes vous paient mieux ; les bateaux vous boudent.",
        ],
        fornaio: ["Le Boulanger du Doge", "Ses fournées rendent plus ; ses livraisons traînent."],
        amico_podesta: [
          "L'Ami du Podestà",
          "Vos livraisons pèsent bien plus pour le contrôle des villes.",
        ],
        armatore: [
          "L'Armateur",
          "Deux fois plus de place aux bateaux ; vos ateliers ralentissent.",
        ],
        condottiere: [
          "Le Condottiere",
          "Ses terres et ses villes rapportent ; moins d'offres ouvertes.",
        ],
        procuratore: ["Le Procurateur", "Les villes vous paient bien mieux ; la taxe s'alourdit."],
      } as Record<string, [string, string]>,
      effects: {
        transformYieldBps: (v: number) =>
          `${v > 0 ? "+" : "−"}${Math.abs(v) / 100} % sur ce qui se transforme`,
        rawYieldBps: (v: number) => `${v > 0 ? "+" : "−"}${Math.abs(v) / 100} % de matières brutes`,
        cityPayBps: (v: number) => `${v > 0 ? "+" : "−"}${Math.abs(v) / 100} % payé par les villes`,
        vehicleSpeedBps: (v: number) =>
          `véhicules ${v > 0 ? "+" : "−"}${Math.abs(v) / 100} % de vitesse`,
        extraVehicles: (v: number) =>
          `${v > 0 ? "+" : "−"}${Math.abs(v)} véhicule${Math.abs(v) > 1 ? "s" : ""}`,
        mudaQuotaBps: (v: number) =>
          `${v > 0 ? "+" : "−"}${Math.abs(v) / 100} % de quota aux bateaux`,
        marketMakerQuotaBps: (v: number) =>
          `${v > 0 ? "+" : "−"}${Math.abs(v) / 100} % de quota à la Douane`,
        taxDiscountBps: (v: number) =>
          `taxe ${v > 0 ? "−" : "+"}${Math.abs(v) / 100} point${Math.abs(v) > 100 ? "s" : ""}`,
        extraOpenOrders: (v: number) =>
          `${v > 0 ? "+" : "−"}${Math.abs(v)} offre${Math.abs(v) > 1 ? "s" : ""} ouverte${Math.abs(v) > 1 ? "s" : ""}`,
        marketMakerFloorBps: (v: number) =>
          `la Douane rachète au moins ${v / 100} % de la référence`,
        urgentPreviewMinutes: (v: number) => `urgences vues ${v} min avant`,
        signoriaBps: (v: number) =>
          `${v > 0 ? "+" : "−"}${Math.abs(v) / 100} % de points pour le contrôle des villes`,
      } as Record<string, (v: number) => string>,
    },
    /** The Sera (R11): the incanto of the galleys and the battle, at 20 h. */
    sera: {
      orb: "Enchères du soir",
      kicker: "Ce soir à 20 h",
      title: "Les enchères du soir",
      line: (n: number) =>
        `${n} lot${n > 1 ? "s" : ""} des bateaux aux enchères, et la bataille de la Conquête.`,
      lot: (i: number) => `Lot ${i}`,
      closes: (time: string) => `ferme à ${time}`,
      closesIn: (left: string) => `ferme dans ${left}`,
      closed: "Clos",
      price: "Prix",
      bidders: (n: number) => `${n} enchérisseur${n > 1 ? "s" : ""}`,
      leading: "Vous menez",
      passed: "Dépassé",
      won: "Gagné",
      sold: "Vendu",
      unsold: "Invendu : retourné au quai",
      max: "Votre maximum",
      bid: "Enchérir",
      raise: "Relever",
      oneLot: "Un lot par marchand et par soirée d'enchères.",
      results: "Résultats du jour",
      podesta: (city: string) => `Vous êtes maître de ${city}`,
      noResults: "Vous ne tenez aucune ville ce soir.",
      help: "Chaque arrivée des bateaux de l'arrivage met 30 % de son chargement aux enchères, en trois lots qui ferment à 20 h 10, 20 h 20 et 20 h 30. Laissez votre maximum quand vous voulez, dès l'arrivée : vous payez seulement le deuxième maximum plus 5 %, et vos ducats sont rendus si l'on vous dépasse. Une enchère dans les deux dernières minutes prolonge le lot de deux minutes. Un lot par marchand et par soirée d'enchères. Le prix payé sort du jeu.",
      errors: {
        bid_too_low: "Votre maximum doit atteindre le minimum du lot.",
        lot_closed: "Ce lot est clos.",
        one_lot: "Vous menez déjà un lot de ces enchères.",
        insufficient_funds: "Pas assez de ducats.",
      } as Record<string, string>,
    },
    /** The Lustre (R6): the social ranks of Venice and the weekly Sfida. */
    lustre: {
      tiers: {
        popolano: "Popolano",
        cittadino: "Cittadino",
        mercante: "Mercante",
        patrizio: "Patrizio",
        senatore: "Senatore",
        procuratore: "Procuratore",
      } as Record<string, string>,
      kicker: "Le duel de la semaine",
      title: "Duel",
      lead: "Duel :",
      ghostOf: (name: string) => `fantôme de ${name}`,
      ghostLine: (name: string, week: number) =>
        `Le fantôme de ${name} : sa semaine ${week}, rejouée heure par heure.`,
      you: "Vous",
      versus: "contre",
      ahead: (gap: string) => `Vous menez de ${gap}`,
      behind: (gap: string) => `Il vous manque ${gap}`,
      even: "À égalité",
      stake: (n: number) => `Défi : ${n} points de ligue en jeu`,
      stakes: (win: number, loss: number) =>
        `Gagner rapporte +${win} points de ligue, perdre en coûte ${loss}. Décidé à la fin de la semaine, sur votre bénéfice.`,
      none: "Votre duel commence au prochain passage du tick : revenez dans un instant.",
      lustre: (n: number) => `${n} points de ligue`,
      /** The league of a tier (refonte UX): the highest is League 1, newcomers start in the last. */
      league: (n: number) => `Ligue ${n}`,
      next: (n: number, tier: string) => `${tier} à ${n}`,
      ladder: "L'échelle",
      challengesIn: "Défis reçus",
      challengesOut: "Défi lancé",
      accept: "Accepter",
      accepted: "Accepté",
      waiting: "En attente",
      challenge: "Défier",
      challengeTitle: (name: string) => `Défier ${name}`,
      challengeLine: "Un duel la semaine prochaine, s'il accepte.",
      stakeLabel: "Mise",
      send: "Lancer le défi",
      sent: "Défi lancé : il a jusqu'à lundi pour accepter.",
      help: "Chaque semaine, vous affrontez un marchand de votre ligue : le plus gros bénéfice de la semaine gagne. Sans adversaire libre, vous affrontez le fantôme d'un marchand : une de ses semaines passées, heure par heure. La ligue reste d'une saison à l'autre ; au changement de mois, on redescend de deux ligues. Elle ne donne aucun avantage en jeu.",
      errors: {
        already_asked: "Un défi est déjà lancé pour la semaine prochaine.",
        invalid_stake: "Mise impossible.",
        unknown_player: "Ce marchand n'est pas dans ce monde.",
        self: "Vous ne pouvez pas vous défier vous-même.",
      } as Record<string, string>,
    },
    rival: {
      someone: "Un marchand",
      /** Before the name, then after it: « Rival : Comm884 · PNJ, +120 D ». */
      chase: "Rival :",
      chased: "Talonné par",
      gap: (ahead: boolean, gap: string | null) =>
        gap ? `, ${ahead ? "+" : "−"}${gap}` : ", à égalité",
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
    /** The mutator of the month (E2-9), at the head of the season's notes. */
    mutators: {
      now: (text: string) => `Ce mois-ci : ${text}`,
      next: (text: string) => `Le mois prochain : ${text}`,
      codes: {
        embargo_ottomano:
          "Embargo ottoman — les bateaux de l'arrivage apportent deux fois moins, et leur prix monte deux fois plus vite.",
        grand_gel:
          "Grand gel — les villes paient les planches 20 % plus cher et demandent davantage de bois.",
        guerra_milano:
          "Guerre de Milan — Milan est une fois et demie plus fort sur la carte de la Conquête ; briques et planches sont payées 25 % plus cher.",
      } as Record<string, string>,
    },
    seasonNotes: {
      title: "Nouveautés de la saison",
      items: [
        "Les Rumeurs : chaque matin, deux rumeurs de ce qui vient (un événement, le lot des bateaux), d'une source plus ou moins sûre. On les vend, on en invente de fausses contre de l'Influence (gare à sa ligue si l'on est démasqué), on poste un espion chez un rival. La gazette ne dit plus le lendemain ; les bateaux apportent un lot qui varie.",
        "Les actions : dès le jour 8, votre Maison peut entrer en bourse (100 actions, vous en gardez toujours 51). Les porteurs touchent chaque semaine une part de votre bénéfice ; 30 actions donnent accès à vos comptes ; tout est racheté le dernier jour du mois.",
        "L'Héritage : chaque mois, un membre de votre Maison tient le comptoir (prénom au choix) ; à la fin du mois, il lègue à son héritier un trait mérité dans le mois (une option ou une information, jamais du rendement), et son portrait entre dans la galerie du profil.",
        "Le Doge : la dernière semaine du mois, le Sénat élit le Doge du mois suivant parmi les dix premières Maisons ; chacune annonce un programme (une saison et un décret de la République), chacun vote, la voix d'un maître pèse plus. Le décret du Doge vaut pour tous, tout le mois ; celui du Signore de la Conquête disparaît (le Signore garde son titre et ses points de conquête).",
        "Les 40 palais : quarante palais redonnés chaque mois par le classement ; on garde le sien en restant dans les quarante. Les 40 palais et le Doge du mois accueillent chacun à la connexion.",
        "Le prestige se dit par ses titres, plus en chiffres.",
        "Les Atouts : chaque lundi, trois figures de Venise vous sont proposées ; vous en prenez une pour la saison. Chacune donne et retire. Quatre de plus se débloquent par un exploit (maître, lot gagné aux enchères, Signore d'une semaine, rang Mercante), gardés de saison en saison.",
        "La Lettre du jour : chaque matin, une lettre de Lorenzo, Faraj, la veuve Contarini, Ser Marin du Sénat ou d'un Milanais sans nom, deux réponses, des suites qui arrivent des jours plus tard, et une fin du mois selon vos choix. Gains petits, plafonnés à 100 ducats par saison.",
        "Nouvelle palette bleue « Lagune », et la carte en bleu (l'ancienne reste dans le Profil).",
        "La Conquête s'ouvre après votre première journée de commerce ; on s'y pose n'importe quel jour, tous à l'abri jusqu'à la fin du premier jour.",
        "Qui n'attaque aucun marchand de la semaine garde toujours sa capitale.",
        "Milan chevauche plus souvent et plus fort ; les maisons de l'ordinateur attaquent leurs voisins plus tôt.",
        "Le rival de la semaine, sous votre rang.",
        "Commandes de guilde : une commande d'une ville remplie à plusieurs, avec une prime pour tous.",
        "Le fattore fait partir vos charrettes oubliées aux ateliers, deux fois par jour.",
        "Conquête : l'heure de bataille, chaque soir de 20 h à 21 h, les fronts avancent dix fois plus vite.",
        "Conquête : les ports, sur les rives de la lagune, du lac de Garde et de l'Adriatique ; les barques débarquent sur une autre rive, les galères gardent la vôtre.",
        "Le guide de la Conquête, avec ses schémas, dans l'Aide et sur la carte de la Conquête (« ? Guide »).",
        "Conquête : les parties rapides, des parties en direct d'un quart d'heure, de 8 h à 22 h. Une seule par jour est classée : la première avec au moins un autre marchand, si votre camp est posé sur la carte de la semaine et qu'elle finit avant 22 h ; son rang rapporte 45, 30, 20 ou 10 points de conquête à la semaine. Les autres parties sont amicales, sans points de conquête. Une partie interrompue par une maintenance ne rapporte rien et ne compte pas : elle ne consomme pas votre partie classée du jour.",
        "Conquête : une semaine par mois en équipes, les marchands d'une même région ensemble.",
        "Conquête : trois convocations à la partie rapide par jour, à 12 h 30, 18 h 30 et 21 h 15 ; la salle s'ouvre dix minutes avant et la partie part à l'heure. Une alerte un quart d'heure avant, si vous la demandez dans le Profil.",
        "Conquête : signaux sur la carte, cible désignée aux alliés, ducats entre alliés et embargo depuis les villes que vous tenez.",
        "Conquête : bombardes (un tir par jour rend libres une terre ennemie et ses voisines) et remparts qui en protègent.",
        "Conquête : Mantoue, Ferrare, le Patriarche d'Aquilée et l'Empire rejoignent Milan, chacun à sa manière.",
        "Conquête : soldats ou paysans. Vos terres donnent du blé, de l'argile et du bois à vos ateliers, et les routes entre vos villes des ducats.",
        "La carte n'affiche plus que les ducats, le rang et les charrettes ; le pain quand il manque.",
        "Sept jours de cours pour chaque marchandise du Marché, face à sa référence.",
        "Le Journal du Marché, dans les messages : les gros échanges et les conquêtes du jour.",
        "Le Rapport de la Banque de Venise, au pied de l'Aide ; vos comptes en CSV dans le Profil.",
        "En fin de saison, une chronique à partager.",
        "Commerce : chaque atelier dit sa marge par heure et ce que rapporterait son amélioration ; un tableau de bord compare vos sept derniers jours à votre rival et au premier.",
        "Commerce : Lorenzo conseille la prochaine meilleure action, dans vos ateliers.",
        "Commerce : le fournisseur officiel — qui livre le plus d'une marchandise dans une ville en une semaine y est payé 10 % de plus la semaine suivante, blason sur la carte.",
        "Commerce : les appels d'offres du Doge, sous pli scellé avec caution ; le moins cher l'emporte.",
        "Commerce : les chaînes de luxe s'ouvrent avec les titres — verre de Murano au Marchand, draperie au Négociant, épices préparées à l'Armateur.",
        "Commerce : au-delà du niveau 5, les manufactures montent jusqu'au niveau 10, en volume ou en qualité.",
        "Commerce : affaires entre marchands — commandes sous séquestre et investissements.",
        "Commerce : plus d'emprunts ni d'entrepôts dans les villes.",
        "Pour tous : les cours du Marché et le tableau de bord sur 30 jours, le carnet d'ordres à 10 offres. Le classement donne des titres et des trophées, plus de Pass Négociant.",
        "Le guide de Lorenzo fait agrandir un premier atelier, et la mission « Agrandir un atelier » des objectifs s'ouvre dès le premier jour.",
        "Commerce : les villes passent commande de jour, à 8 h, 11 h, 14 h, 17 h et 20 h. Personne ne prend de commande au tableau entre 22 h et 8 h ; celles de 17 h et de 20 h restent jusqu'au lendemain 10 h. Les commandes urgentes s'ouvrent avant 19 h.",
        "Conquête : le Signore est toujours un marchand ; les maisons de l'ordinateur restent au classement de la semaine mais ne reçoivent ni palier ni Influence. Une maison qui se retire rend ses terres.",
        "Missions de la Maison : celles de l'ancienne campagne sont remplacées par des missions de la Conquête, deux au plus par tableau.",
        "Pass Négociant : plus aucun avantage de jeu (ni quota à la Douane, ni offre ouverte, ni produits frais en plus, ni commande du Doge échangée, ni alerte de bonne affaire) ; il ne donne que de l'information à lire et du cosmétique.",
        "Conquête : les Mercenaires, 8 minutes en coopération, seul ou avec sa guilde, contre trois nations et Milan. Tenez Padoue et 35 % des terres pour ouvrir le niveau suivant (12 niveaux). Ni ducats, ni marchandises, ni points de conquête : un grade, de Condottiere di ventura à Capitano generale.",
        "Commerce : les ouvriers mangent au lot, plus à la journée — un demi-pain par lot et par niveau dans un atelier qui transforme, un quart pour une matière première. Sans pain, l'atelier travaille deux fois moins vite, jamais arrêté.",
        "Tâches du jour : un jour manqué par semaine ne casse plus la série du coffre ; un rappel à 19 h si votre série atteint 3 jours et que le coffre est encore fermé.",
        "Commerce : les entrepôts de ville remplacent les anciens entrepôts. Un entrepôt dans 3 villes au plus, niveaux 1 à 3, 6 niveaux en tout : chaque niveau vous donne chaque jour une commande de la ville, à vous seul, à 95 % du prix du tableau commun. Le tableau commun passe à 3 commandes par marchand actif.",
        "Spécialisations : le Négociant a trois fois le quota de la Douane, qui lui rachète au moins 85 % de la référence ; le Roulier voit les commandes urgentes 20 minutes avant leur ouverture.",
        "Livre de la Maison : 8 missions par semaine, renouvelées le lundi, aux seuils doublés et mieux payées ; le Livre s'ouvre sur « Aujourd'hui » et « Cette semaine ».",
        "L'Arsenal de la semaine remplace la commande de guilde de deux jours : Bronze, Argent et Or, du lundi au dimanche. L'Argent apporte plus de marchandises aux bateaux de la semaine suivante, l'Or de l'Influence à qui a livré après le Bronze.",
        "Chaque mois, à partir de décembre, un mutateur change quelques prix ou forces pour le mois ; il est annoncé ici le 24 du mois précédent.",
        "La guerre mange les marchandises : sur la carte de la Conquête, vos troupes mangent du pain chaque jour ; sans pain, vous ne recrutez plus. « Max » demande aussi du pain, le fort des briques, les remparts des briques et des planches, le port des planches, la bombarde du bois et des planches.",
        "Le contrôle des villes remplace les fournisseurs officiels et l'embargo : chaque ducat livré dans une ville, et chaque heure où vous la tenez sur la carte de la Conquête, compte sur sa jauge. Chaque nuit à minuit, le premier devient maître (3 villes au plus) : il prend 3 % des livraisons des autres vers sa ville et prend ses commandes une demi-heure avant tout le monde.",
        "Les ligues : chaque semaine, un duel contre un marchand de votre ligue (ou le fantôme d'une de ses semaines) ; le plus gros bénéfice gagne des points de ligue. Six ligues, de la 6 (Popolano) à la 1 (Procuratore), gardées d'une saison à l'autre (deux de moins au changement de mois). On peut défier un marchand depuis son palmarès.",
        "Les enchères du soir, chaque soir de 20 h à 20 h 30 : 30 % de chaque arrivée des bateaux aux enchères en trois lots (votre maximum laissé quand vous voulez, vous payez le deuxième maximum plus 5 %), et la bataille de la Conquête. Au quai, les bateaux ne renchérissent plus ; les appels d'offres du Doge sont retirés.",
      ],
    },
    howTo: [
      {
        icon: "comptoir",
        title: "Produire",
        text: "Touchez « Mes ateliers », puis un atelier : il transforme des matières en produits, par lots d'une demi-heure. Lancez jusqu'à 12 heures de travail et revenez récolter ; rien ne se perd pendant votre absence.",
      },
      {
        icon: "routes",
        title: "Livrer",
        text: "Les villes publient des commandes toutes les 4 heures. Touchez une charrette, cochez des commandes pour une même ville, puis faites-la partir : la ville paie à l'arrivée, d'autant mieux que la route est longue. Le premier arrivé prend la commande.",
      },
      {
        icon: "steward",
        title: "Le fattore",
        text: "Votre commis : quand une charrette reste deux heures aux ateliers, il la fait partir avec la meilleure commande que votre stock couvre, deux fois par jour, de 8 h à 22 h, en gardant le pain des ouvriers. Il prend 15 % du paiement. Il ne travaille que si vous êtes passé dans les dernières 24 heures.",
      },
      {
        icon: "contrats",
        title: "Commandes de guilde",
        text: "Tous les deux jours, une ville commande du pain, des briques et des planches aux trois régions. Livrez depuis votre stock : 10 % au-dessus de la référence, et 10 % de plus pour chacun quand la commande est remplie.",
      },
      {
        icon: "profil",
        title: "Le pain des ouvriers",
        text: "Chaque niveau d'atelier mange 2 pains par jour, à minuit (rien le premier jour). Sans pain, les lots durent moitié plus longtemps pendant 24 heures. Les boulangeries et les briqueteries brûlent aussi du bois.",
      },
      {
        icon: "marche",
        title: "Le Marché",
        text: "À Venise, achetez et vendez aux autres marchands et à la Douane : tout de suite au meilleur prix, ou à votre prix en laissant une offre. C'est là que vous trouvez ce que votre région ne produit pas.",
      },
      {
        icon: "port",
        title: "Les bateaux de l'arrivage",
        text: "Tous les trois jours à 9 h, les bateaux d'État apportent épices, soie, sel, vin, fourrures et draps, vendus au Marché en petites quantités, de plus en plus cher à mesure que le lot part. Quelques villes en commandent : achetez tôt.",
      },
      {
        icon: "top",
        title: "Classement",
        text: "Chaque semaine et sur la saison, on compte votre bénéfice : ce que vous vendez, moins ce que vous achetez. Un stock qui dort ne compte pas. Les trois premiers de la semaine reçoivent un titre.",
      },
      {
        icon: "famille",
        title: "La Conquête",
        text: "Une conquête d'une semaine, à côté du commerce. Posez votre camp sur une terre libre, n'importe quel jour ; puis lancez des fronts vers les terres voisines avec une part de vos troupes. Ils avancent seuls de 8 h à 22 h. Le premier en points de conquête impose un décret la semaine suivante.",
      },
      {
        icon: "bale",
        title: "Colis surprise de Faraj",
        text: "Toutes les six heures, Faraj d'Alexandrie vous envoie un colis : trois cartes de 1 à 5 marchandises. Les probabilités sont affichées ; les colis ne s'achètent pas.",
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
      no_bale: "Aucun colis au quai pour l'instant : le prochain est en route.",
      bales_off: "Pas de colis de Faraj dans ce monde.",
      insufficient_funds: "Pas assez de ducats.",
      shares_off: "Pas d'actions dans ce monde.",
      too_early: "La cotation n'est pas encore ouverte.",
      not_for_npc: "Une Maison de l'ordinateur ne se cote pas.",
      already_listed: "Votre Maison est déjà cotée.",
      not_listed: "Cette Maison n'est pas cotée.",
      over_float: "Vous gardez toujours 51 actions de votre Maison.",
      insufficient_shares: "Vous n'avez pas autant d'actions libres.",
      vehicle_not_for_sale: "Seules les mules s'achètent : améliorez-les ensuite.",
      vehicle_max_level: "Ce véhicule est déjà au plus haut niveau.",
      insufficient_stock: "Pas assez de stock.",
      incanto_off: "Pas d'incanto dans ce monde.",
      bid_too_low: "Votre maximum doit atteindre le minimum.",
      unknown_lot: "Ce lot n'existe pas.",
      lot_closed: "Ce lot est clos.",
      letters_off: "Pas de lettre du jour dans ce monde.",
      no_letter: "Pas de lettre aujourd'hui.",
      letter_answered: "Vous avez déjà répondu à la lettre du jour.",
      unknown_choice: "Cette réponse n'existe pas.",
      atouts_off: "Pas d'Atouts dans ce monde.",
      atout_taken: "Atout de la semaine déjà choisi.",
      atout_not_offered: "Cet Atout n'est pas proposé cette semaine.",
      one_lot: "Vous menez déjà un lot de ces enchères.",
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
      board_closed:
        "Les villes ne passent pas commande la nuit : le tableau rouvre à 8 h, les commandes du soir vous attendent jusqu'à 10 h.",
      terra_off: "La Conquête n'est pas ouverte dans ce monde.",
      terra_closed: "La semaine de la Conquête est close : une nouvelle carte s'ouvre bientôt.",
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
    disposable_email:
      "Les adresses jetables ne sont pas acceptées : utilisez votre adresse habituelle.",
    network: "Le serveur ne répond pas. Vérifiez votre connexion.",
    mail_unavailable: "L'e-mail n'a pas pu être envoyé. Réessayez dans quelques minutes.",
    unknown: "Une erreur est survenue.",
  } as Record<string, string>,
};

export type Dictionary = typeof frDict;
/** The French words, whatever the language chosen (the key test reads them). */
export const french: Dictionary = frDict;
/** The dictionary of the language chosen at start-up. */
export const fr: Dictionary = LANG === "en" ? en : frDict;
