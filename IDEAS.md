# Idées hors MVP

Tout ce qui sort du périmètre du MVP (voir docs/CADRAGE.md) est noté ici, pas codé.

## Pistes de jeu proposées (non retenues pour l'instant)
- Journal du Rialto (gros échanges en direct).
- Banque de Venise : prêts avec intérêts (voir la phase 5 de la société vénitienne).
- Parrainage avec blason exclusif.
- Échanges d'épices et de soie entre joueurs (nécessite les ordres à cours limité).

## Société vénitienne (plan abandonné dans docs/plan-familles.md)
- Les familles patriciennes ont été remplacées par les guildes, puis sont revenues avec la Campagne de Terraferme.
- Phase 2 : mariages entre maisons de joueurs (dot détruite, nom de Maison commun, classement de Prestige).
- Phase 3 : commandite (*colleganza*) des convois d'un autre joueur.
- Phase 4 : enchère des galères (*incanto*), puits de fin de saison.
- Phase 5 : prêts du Rialto sur gage et Grand Conseil (décrets votés).
- Plus tard : assurance maritime, dynastie entre saisons (cosmétique), avantages Pass d'information.

## Les routes (suite des livraisons, voir docs/plan-livraisons.md)
- Le roulage (phase 6) : confier une commande au véhicule d'un autre joueur contre une part du prix, avec une réputation de transporteur.
- Améliorer les véhicules (essieux, chevaux de trait).
- Des routes qui se dégradent (les péages tenus par des joueurs existent désormais : concessions des guildes).
- Carte des routes : zoom à deux doigts et déplacement, quand il y aura plus de villes (aujourd'hui, 7 villes tiennent sur un écran).
- Carte des routes : voir les véhicules des autres marchands (écarté pour l'instant : cela montrerait aux brigands les routes fréquentées).

## Familles et Campagne (suite, voir docs/plan-campagne.md)
- Alliances entre familles pour une semaine, et trahison.
- Le capitaine de la famille gagnante choisit seul un décret.
- Nouveaux décrets (embargo d'un port, levée de grain, prix plancher) et nouvelles cartes de la Terraferme.
- Récompense cosmétique de la famille gagnante de la saison (monument sur la carte, titre au palmarès).
- Ouvrages en volume sur la maquette 3D (tour, tentes, porte de péage) plutôt qu'en médaillon ; ouvrages améliorables (rocca de pierre), réparation après un assaut repoussé.
- Contribution de plusieurs membres à un même ouvrage (chantier collectif), écartée pour l'instant au profit de l'achat individuel.

## Progression de la Maison entre saisons (retenue, voir docs/plan-progression.md)
- Privilèges (ex-patentes) achetés avec l'Influence (gagnée par les missions de la Maison) : seulement du neuf : Alexandrie, Fondaco dei Tedeschi, Lombardie, Frioul, laine, verre, cosmétiques. Simulateur d'abord, puis après la bêta.

## Influence, monnaie premium (demande du porteur, 17 octobre 2026)
- **Pass Négociant : de l'Influence offerte aux abonnés** (pour plus tard, quand le Pass reviendra). À trancher avant : CLAUDE.md interdit au Pass de donner de la vitesse ou un avantage qui creuse l'écart (≤ 5 % à activité égale). Si l'Influence accélère les livraisons ou achète des troupes, l'offrir aux abonnés revient à vendre de la vitesse et de la force. Pistes compatibles : Influence du Pass utilisable seulement pour les cosmétiques, ou montant faible et plafonné, mesuré par `pnpm sim --pass 0.2`.

## PvE coopératif (voir docs/plan-pve.md)
- Recommandé, après les mesures de la bêta : commandes de compagnie (grosses commandes du Doge à plusieurs marchandises, remplies à 2-4 marchands de régions différentes, payées contre livraison +10 %, lot de biens de la Muda au prorata). À valider au simulateur avant tout code.
- Si la rétention à J7 est faible : rallumer les grands chantiers (moteur existant, `projects`) sous forme d'une crise de la République par saison (Acte II), objectif commun du serveur.
- V1 : expéditions lointaines (Bruges, Constantinople) en différé, seul ou en groupe, récompensées en biens de la Muda.
- Écarté pour l'instant : grande invasion de Milan en coopération des quatre familles (brouille le sens de la Campagne, non mesurée).
- Garde-fous : jamais de ducats sans marchandises livrées, primes plafonnées dans `worlds.settings`, ressources offertes limitées aux biens de la Muda, parts au prorata plafonnées par compte.

## Affrontement (le retenu : la Campagne des familles ; les autres pistes)
- Guerres de concessions entre guildes (abandonnées le 13 octobre 2026).
- Corner du Rialto : accaparer une marchandise pour fixer son prix en ville ; les autres cassent le corner en vendant.
- Convois de famille : cargaisons groupées sous une même escorte, butin et risque partagés.
- Défis entre marchands : mise sous séquestre, le plus gros gain sur 3 jours remporte le pot (moins une commission).
- Appels d'offres du Doge : offres scellées (prix, quantité, caution), la commande va au moins cher qui tient parole.

## Ballots de Faraj (suite)
- Album des présents : collection cosmétique des cartes reçues dans la saison.
- Ballots saisonniers (Sensa, Carnaval) avec un dos de carte propre, sans meilleures chances.
- Notification push « un ballot vous attend » (coupée par défaut, jamais la nuit).
- Habillage cosmétique de la balle gagnable au classement.

## Inspirées d'Hades' Star (17 octobre 2026, gel : après les mesures de la bêta)
- **Le fattore** (le relais de cargaison) : un commis qui livre seul une commande du tableau quand un véhicule reste au comptoir, contre une commission (destruite) et sans prime. Justification mesurée : le simulateur voit les véhicules occupés 25 % de la journée (cible 50 à 80 %). Gratuit pour tous, jamais payant (la production automatisée payante est écartée) ; à borner pour qu'un assidu reste devant un occasionnel (un ou deux départs par jour). Mesure qui le déciderait : l'utilisation des véhicules des vrais joueurs.
- **Le burchiello sur la Brenta** (la ligne de saut) : un ouvrage de famille qui raccourcit une route (Venise–Padoue par la Brenta) pour tous ses membres pendant quelques jours, dans la Campagne. Borné : une route, temporaire, la commande garde son prix.
- **L'Arsenal arme une flotte** (les étoiles bleues) : pendant un acte, une grande commande que tous les marchands remplissent ensemble, récompense partagée au prorata. Le code des grands chantiers existe encore (`projects`, coupé par les réglages depuis que les livraisons sont la demande des villes) ; à rouvrir comme événement d'acte plutôt que chaque semaine. Mesure : la part de joueurs actifs qui livrent ensemble.
- **Trêve entre deux familles** (la station diplomatique) : une semaine de Campagne sans assaut entre deux familles qui la signent. Risque : à quatre familles, une alliance fige la carte ; à n'ouvrir qu'avec plus de familles.
- Les étoiles rouges reviennent comme la Condotta (décision du porteur du 24 octobre 2026, voir docs/expertise-2026-10-24.md, E2-5).
- Écartées : station de recherche (les ballots de Faraj tiennent ce rôle), étoiles blanches (c'est la Campagne), station d'échange (le second comptoir, retiré), récolteur d'étoiles (du rendement en plus), scanners (rien de caché sur la carte).

## Retours design du 24 octobre 2026 (plus tard, avec leur mesure)
Voir `docs/retours-design-2026-10-24.md`, « Idées waouh ». Aucune n'est une mécanique sauf mention.
- Cycle jour et nuit sur la carte du commerce (fenêtres allumées de 22 h à 8 h) : si le playtest dit « le jeu dort, je ne le savais pas », et à 60 i/s.
- Fronts résolus à l'encre à 20 h, page de chronique : selon la part des joueurs présents à 20 h et les ouvertures de « Semaine ».
- Revoir la semaine parcourable au doigt : si « Passer » est touché souvent.
- Avis en gazette (« avviso ») : après la « une », selon la profondeur de défilement des Avis au jour 1.
- Territoires à l'aquarelle : si le budget de 60 i/s tient avec 30 % de marge sur un Android d'entrée de gamme.
- Portulan complet (monstres marins, noms calligraphiés) : sur décision écrite du porteur (il a gardé le bleu le 24 octobre 2026).
- Épis qui ondulent, fumée de la boulangerie, mule qui trottine : après la porte de publication.
- Fiche d'un voisin enrichie (tendance, voisins) : demande des données serveur ; si moins de 20 % des fiches ouvertes mènent à une action.
- Historique des « Fronts rentrés » dans la cloche : demande un stockage serveur ; si « Compris » est touché en moins de 2 s plus d'une fois sur deux.
- Second lot rapide offert dans le tutoriel (une règle) : si plus de 15 % abandonnent à l'étape « transformation » au playtest.

## Équipe d'experts du 24 octobre 2026 (reportées, chacune avec sa mesure de déclenchement)

Détails dans docs/expertise-2026-10-24/ (fichiers `*-final.md`).
- **Ligues de 10 marchands** (E2-7, avec E1-9) : un classement de la semaine par division plutôt que pour tout le monde. Déclenchement : au moins 60 humains actifs sur une semaine (sinon une ligue de dix est une course contre l'ordinateur).
- **Théâtres de la Terraferme** (E2-11) : 40 marchands au plus par carte, un Signore et un décret par théâtre. Déclenchement : 30 humains actifs dans la Terraferme sur une semaine, ou une demande du test de charge.
- **Privilèges d'ouverture** (E1-10) : des privilèges qui changent le départ de la saison, pas la puissance. Déclenchement : Influence médiane non dépensée d'au moins 100 à J+30.
- **Élection du Doge en fin de mois** (reste d'E2-10) : cinq humains candidats, un vote par compte vérifié, le Doge choisit le mutateur suivant parmi trois. Déclenchement : alias e-mail normalisés (fait) et au moins 50 votants éligibles (7 jours actifs dans la saison).
- **File d'attente d'escarmouche notifiée** (reste d'E2-2) : à la Hades' Star. Déclenchement : moins de 40 % des parties classées jouées dans les convocations.
- **Jouer en invité** (E3-2) : décision du porteur sur l'entonnoir mesuré, après au moins 300 `landing_view` ; s'il est décidé, les quatre conditions du chef du 20 octobre (aucun transfert de valeur, aucune fusion, absent des classements, purge) et l'e-mail demandé à la première paie.
- **Paiement du Mécène** (E3-9) : Stripe et CGV en V1, et trois cosmétiques dessinés avant toute vente.

## Plan de rupture, vague 4 (28 octobre 2026 : ce qui n'est pas entré dans la vague)
- **Destitution du Doge** à mi-mois par le Conseil des Dix (les dix premiers du Lustre) : écartée pour l'instant, le Doge ne gouverne que par ce qu'il fixe avant le 1er (règles stables pendant le mois).
- **Voix vendues** contre une part d'un droit de porte ou un partage de gains : les parts de Maison (vague 5) n'y suffisent pas (rien ne lie un vote à une part) ; pour l'instant, seul le programme public tient lieu de promesse.
- **Choix du palais** sur le Grand Canal, dans l'ordre du classement (le premier choisit, puis le deuxième…) : les palais sont attribués d'office, faute de tour de choix jouable en asynchrone.
- **Fiche d'un palais** : toucher un palais du Canal ouvre le palmarès de sa Maison (la route publique ne donne pas d'identifiant ; une route connectée le ferait).
- **Ménage différé de R12** : fondre les maîtrises dans les Atouts, le coffre et les tâches dans la Lettre, les missions de la Maison et les privilèges dans la Dynastie et le Canal, les actes dans le Doge ; à décider avec la mesure de vrais joueurs.

## Plan de rupture, vague 5 (28 octobre 2026 : ce qui n'est pas entré dans la vague)
- **Rumeurs sur les marchands** (« Untel va vider son stock de briques ») : écartées, une rumeur ne nomme jamais un marchand (toxicité, § 9 de l'audit).
- **Prix libre d'une rumeur** à la vente : 5 ducats fixes à l'écran pour l'instant (le moteur accepte un prix) ; à ouvrir si les ventes prennent.
- **Rachat hostile et OPA** : impossibles par construction (51 parts au fondateur) ; à ne pas ouvrir.
- **Parts gardées d'un mois à l'autre** : tout est racheté le dernier jour, comme une saison qui se ferme ; un portefeuille qui dure demanderait de valoriser une Maison au changement de mois.
- **Voix du conseil** : le conseil voit les comptes mais ne décide rien ; un vote du conseil (rachat, dividende plus fort) serait une mécanique de plus.
- **« Acheter » en or dans la fiche d'un marchand** : le défi de la Sfida y garde l'or, l'achat de parts est en fantôme ; à revoir si les parts prennent plus de place que les Sfide.

## V1 (après la première saison)
- Escarmouches : reprendre une partie en cours après un redémarrage du serveur (aujourd'hui elle est interrompue, sans Gloire ni quota consommé, terra-m1) ; demande d'enregistrer l'état de la partie à chaque pas.
- Chaînes textile (laine, tissu, vêtements) et ameublement (meubles).
- Paiement du Pass Négociant (Stripe Checkout + webhook, CGV) ; export CSV et conseiller détaillé pour les abonnés.
- Cosmétiques à l'unité ; le Doge de la saison nomme un événement de la gazette de la saison suivante.
- Emballage Capacitor pour les magasins d'applications ; notifications push.
- Connexion Google / Apple.

## L'empire : ce qui attend son système (CADRAGE-v3)
- Modules de négoce sans effet encore, donc fermés à la recherche : débarquement prompt, courrier, comptoir flottant, pavillon neutre, lettre de change, rappel. Ils s'ouvriront avec les escales, la guerre et la Muda des joueurs.
- Modules d'exploitation à venir : grande campagne, prospection, gestion durable, charrois.
- Le Gazzettino du dimanche (palmarès par bande, promotions).
- Le coût des derniers paliers de la Casa, au-delà de 7 jours de revenu : avec le contenu de fin de partie.
- La mer (après 7a) : l'enchère de la Muda liée à la colleganza du voyageur ; le brouillard des zones et les ports francs ; les crises qui déplacent les prix ; les contrats à terme ; les tempêtes.
- La Terraferme de l'empire (après 6b) : le décret du Signore propre à l'empire, les bannières sur la façade, les sidegrades de guerre, le trophée de la Contesa en pièce du fondaco de compagnie ; les panneaux complets de la carte mensuelle (bâtiments, alliances, signaux, mer) sur l'écran de l'empire ; des bots marchands si les théâtres manquent de monde.
- L'atelier unique au sommet de chaque Arte : il demande un dessin et un effet propre.
- Les recettes alternatives d'un bâtiment : le thème n'en a qu'une par bâtiment, il faut d'abord du contenu.
- L'ambassadeur (avec les cours étrangères) et le condottiere (avec les armes), les deux rôles du personnel qui manquent.
- Le trait de chaque membre de la famille, qui donne et qui retire (catalogue des Atouts), et les portraits de la Dynastie.
- Désaffecter un membre du personnel, le renvoyer.
- La compagnie (après l'étape 6a) : l'Expédition de compagnie, le fondaco de compagnie, le Courrier de compagnie, la colleganza de compagnie, les contrats de fourniture et la réputation, le roulage, le *garzone* (l'apprenti d'une compagnie qui accueille les nouveaux) ; l'usage du Mérite ; l'annonce de la succession dans le fil.

## La Porta (31 octobre 2026), hors du chemin
- Des Sceaux pour les premiers du classement de la semaine des reliques.
- Déchiffrer une relique en plans à la Scuola au lieu de la vendre : la recherche des modules de négoce en demande dès le niveau 4.
- Les batailles en mer, avec des galères armées de l'Arsenal.
- Un ordre « escorter » (le véhicule de combat suit un transport), des véhicules de combat de plus haut rang, d'autres unités de Rome.
- Une Porta de compagnie, aux paliers réservés aux associés.

## V2
- Plusieurs mondes en parallèle ; ouverture d'un nouveau monde quand le précédent dépasse J+14 (seulement si la population le permet sans vider les carnets).
- Mondes privés pour une communauté, une école ou une entreprise, facturés par saison.
- Fonctionnalités pour streamers : événements pilotés par le chat Twitch, journal de bourse diffusable.
- Contrats entre joueurs, prêts.
- Cartels, entrepôts partagés.
- Classement global inter-saisons.
- API publique.
- Autres thèmes historiques.

## Écarté
- Jeton Sceau (acheté en euros, revendable contre des ducats) : revient à vendre de la monnaie de jeu, contraire au garde-fou anti pay-to-win.
- Production automatisée payante : achète du pouvoir économique.
- Prix de référence du PNJ qui suit automatiquement les prix des joueurs : manipulable.
- **Autres usages de l'Influence, gardés pour plus tard** : pièces de blason, façades du palais, monument de la Maison sur la carte (il faut leurs dessins) ; proposer un décret à sa famille ; baptiser une nouvelle de la gazette.

## La carte au centre (31 octobre 2026), hors du chemin
- Des comptoirs rivaux sur une même case, entre joueurs d'une bande (un comptoir y prend une part du carnet de l'autre).
- Des villes qui grandissent quand on les livre souvent (leur carnet monte).
- Des cases de mer à explorer (épaves, routes plus courtes), par les navires.

## Un seul métier (1er novembre 2026), à repenser plus tard
- **Le classement** ne se fera plus sur les ventes, mais sur d'autres éléments, à définir (décision du porteur : « on y réfléchira plus tard »).
- La mer, les gisements et les expéditions, retirés : à revoir seulement s'ils servent les commandes des villes.

## La livraison saut par saut (1er novembre 2026), hors du chantier 1

- **Les bonus de livraison** à la Hades' Star : une commande entière payée 10 % de plus, un « Jour de foire » après 10 livraisons, la vitesse vers l'arrêt suivant. Écartés du chantier 1 par le porteur ; à revoir avec les modules (chantier 2).
- **Le relais automatique** (un commis qui livre seul, un peu moins bien qu'à la main) : jamais vendu. À rediscuter : CLAUDE.md interdit de vendre le confort qui donne de la puissance.
- **La montée d'une ville nouvellement servie**, sur trois jours (docs/hades-star/01, § 4).
