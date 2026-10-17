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
- Patentes achetées avec l'Influence (gagnée par le commerce et la Campagne, plafonnée par semaine) : seulement du neuf : second comptoir, Alexandrie, Fondaco dei Tedeschi, Lombardie, Frioul, laine, verre, cosmétiques. Simulateur d'abord, puis après la bêta.

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

## V1 (après la première saison)
- Chaînes textile (laine, tissu, vêtements) et ameublement (meubles).
- Paiement du Pass Négociant (Stripe Checkout + webhook, CGV) ; export CSV et conseiller détaillé pour les abonnés.
- Cosmétiques à l'unité ; le Doge de la saison nomme un événement de la gazette de la saison suivante.
- Emballage Capacitor pour les magasins d'applications ; notifications push.
- Connexion Google / Apple.

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
