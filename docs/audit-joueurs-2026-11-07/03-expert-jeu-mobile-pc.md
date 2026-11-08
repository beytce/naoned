# Audit joueur 03 — Expert game design mobile et PC (7 novembre 2026)

*Testeur : expert game design F2P et PC. Serveur isolé (port 4103, base en mémoire, `EMPIRE_INTERIOR=off`, grille carrée). Joué sur PC (1280x800) et sur mobile (390x844, tactile), trois comptes, environ deux heures de jeu réel. Le serveur a été relancé à mi-parcours (monde vierge) ; le bug B1 a été reproduit sur le nouveau monde.*
*Captures : `/tmp/claude-0/-home-user-naoned/7091555e-9be4-5e80-9143-48409e2cdd8e/scratchpad/p3-expert-jeu/` (abrégé `CAP/` ci-dessous).*
*Hors périmètre, car traités par une autre session : la rotation de caméra, et les livraisons vers des villes non reliées.*

---

## (a) Verdict

**Note : 3,5/10 pour « publiable ? ». Pas publiable en l'état.**

1. La vitrine est très réussie : la porcelaine blanche, l'accent rouge, les bâtiments biseautés, le zoom sur le palais, San Marco. Les dix premières minutes sont propres, avec un premier lot en 30 s et une première livraison payée en moins de 2 min. C'est au niveau d'un jeu commercial.
2. Après ces dix minutes, le jeu se vide. Aucune commande de ville avant 1 h 45 à 2 h 20, des chaînes qu'il faut relancer à la main toutes les 30 min, et un guide qui s'arrête ou qui envoie dans un cul-de-sac.
3. La boucle méta n'est pas branchée. La Faveur et les Sceaux, que rapporte le Carnet de la semaine, ne servent à rien dans le moteur de l'empire. Les perle, pilier de la règle d'or 4 et du modèle économique, n'existent pas. La Porta et la Terraferme sont fermées jusqu'à la Casa 4, soit 1 200 ducats et 60 briques et 60 planches, quand le joueur gagne une centaine de ducats par heure.
4. Il y a trop de systèmes pour un nouveau venu, et tous ne sont pas visibles. Le moteur expose environ 60 commandes et plus de 30 blocs dans la vue. Le marché est une liste de prix, donc un tableur, ce qui contredit la règle 8. Des textes du jeu mensuel subsistent (« trois ateliers et cinq cents ducats », « De 2 à 6 amis, d'un mois à l'autre… partie rapide »).
5. Deux bugs touchent la confiance au premier jour : une livraison arrivée pendant que l'app était fermée n'est pas payée à la réouverture (B1), et un texte du tutoriel affiche `{cash}` (B2). Plus grave sur le fond : rien ne mène encore une semaine de jeu.

---

## (b) Les trois boucles

### Boucle de base (30 s) : toucher, ramasser, livrer

- **Ce qui marche** :
  - le premier lot en 30 s (réglage `welcome.batchSeconds`) ;
  - la mule qui part et la barre de temps du guide (`CAP/m08-livrer.png`) ;
  - « +96 » et le son des pièces à l'arrivée ;
  - les bulles de produit au-dessus des ateliers ;
  - le « ! » sur un atelier à l'arrêt (`CAP/m14-step0.png`).
- **Ce qui manque** :
  - **Ramasser est manuel** (« Un lot est prêt — Ramasser et relancer »). C'est le geste de Hay Day, mais sans la récompense : pas de ressource qui s'envole vers le stock, et la Remise se met à jour en texte (`CAP/pc11-step1.png`).
  - **Les chaînes ne se nourrissent pas seules.** La file de 12 h prend ses intrants *au moment de la relance* (`workshops.ts`, relance). Une briqueterie relancée sans argile reste à l'arrêt même si l'argile arrive 10 min plus tard. Pour un amateur de gestion, c'est l'inverse de ce qu'il attend : il veut poser une chaîne et la voir couler.
  - **La mule est peu lisible** sur la carte : on ne la suit pas des yeux, et la caméra centre la ville.
  - **Le prix affiché n'est pas celui payé** : la commande « 100 d » paie 96,21 d (taxe non montrée), ce qui contredit « Tout se voit ».

### Boucle de session (5 min)

Voici ce que CADRAGE-v3 § 4.1 promet pour la tournée de 5 minutes : tout ramasser et relancer, lire les nouvelles, décider d'une route, envoyer une équipe, lancer une recherche, faire un geste pour un associé, et le soir une expédition. Voici ce qu'on vit à la Casa 1 et 2 :

- ramasser et relancer, quatre fois ;
- regarder s'il y a une commande : il n'y en a pas (`nextAt` à +143 min pour Padoue et Vérone, +108 min pour Bologne à l'ouverture) ;
- vendre un peu à la Dogana, en trois touchers (San Marco, puis « Ouvrir la Dogana », puis « Dogana ») ;
- fermer.

**Aucune décision.** La seule décision réelle, acheter une parcelle ou un atelier, se prend une fois. La session tient en moins d'une minute. Entre la 10e et la 120e minute, le joueur n'a rien d'autre à faire qu'attendre.

### Boucle méta (jours et semaines)

- **Le Carnet de la semaine** : 11 objectifs (`CAP/pc14-tab-Compagnie.png`). Ils sont très faciles : « Gagner 3 niveaux d'atelier » se remplit en *bâtissant* trois ateliers niveau 1, et 5 objectifs sont faits en 20 min. Mais leur récompense est morte. Dans `packages/engine/src/empire/`, `h.favour` et `h.seals` ne font qu'augmenter (`carnet.ts:136-139`, `terra.ts`, `condotta.ts`) ; aucune commande ne les dépense. Le joueur encaisse des points qui ne servent à rien.
- **La Casa** est la jauge maîtresse. La Casa 2 coûte 50 d et 5 briques et 5 planches ; on l'achète en 2 min à la Dogana (voir D3). La Casa 4 coûte 1 200 d et 60 et 60, puis la Casa 5 coûte 6 400 d et 180 et 180. Le tableau du cadrage (§ 3.1 : 150 et 400 d) est obsolète ; le calibrage dit ×8 puis ×16 (calibration.md, « Paliers et table croissante »). Pour un humain, cela fait plusieurs jours avant la Porta et la Terraferme. Hades' Star ouvre ses étoiles rouges en quelques heures.
- **L'ambition** (« une région, une galère, une charge ») est invisible au départ. Les verrous « Niv. 4 », « Niv. 8 », « Niv. 9 » posés sur la carte (`CAP/m19-sanmarco.png`) sont la seule promesse visible, et ils ne disent pas ce qu'ils cachent.

---

## (c) Bugs

| # | Gravité | Bug | Reproduction | Capture |
| --- | --- | --- | --- | --- |
| B1 | **Bloquant (P0)** | Une livraison arrivée pendant que l'app était fermée n'est ni payée ni affichée. La mule reste « en route », sans minuteur ; le guide n'a plus de bouton ; la caisse ne bouge pas. | Livrer la commande de bienvenue, fermer l'onglet, rouvrir 60 s plus tard et attendre 20 s : « Votre mule est en route pour Padoue », 530 d. Cause : `apps/web/src/empire/EmpireGame.tsx` (≈ l. 318-327) ne programme `empireSettle` que pour les arrivées futures (`l.arrivesAt > p.now`), et `GET /api/empire` ne règle pas les trajets. Seule l'action suivante du joueur débloque le paiement. Constaté sur PC (paiement obtenu seulement par `empireSettle`) et sur mobile. | `CAP/r01-mule-stuck-after-reopen.png` |
| B2 | Majeur | Une variable non remplacée dans le tutoriel : « Votre caisse : {cash}. » (étape 2/3). | Nouveau compte, puis Fonder, puis Suivant. | `CAP/pc04-tuto1.png`, `CAP/pc04-tuto2.png` |
| B3 | Majeur | L'écran de fondation ment : « Un fondaco près de Venise, trois ateliers et cinq cents ducats », alors qu'on a 0 atelier et 650 d. L'écran du nom dit « saison de novembre » dans un monde sans saison. | Nouveau compte (`apps/web/src/i18n.ts:214`). | `CAP/pc02-first-screen.png` |
| B4 | Majeur | Le guide mène à un cul-de-sac. « Briqueterie : bâtissez cet atelier » vient sans source d'argile ; puis « Scierie : bâtissez cet atelier » vient alors qu'il n'y a plus de case libre, et la feuille Bâtir dit « Aucune case libre… achète une parcelle ». Le guide ne propose ni l'achat de parcelle ni l'achat de matériaux, et n'a pas de bouton. | Mobile : camp, carrière d'argile, briqueterie, puis Fondaco › Bâtir. | `CAP/m13-after-3.png`, `CAP/m14-step0.png` |
| B5 | Moyen | La page « glisse » quand un repère de carte hors écran prend le focus. Le conteneur `div.fixed.inset-0.overflow-hidden` défile de 427 px ; la carte et le HUD sortent de l'écran et laissent une moitié vide. On le déclenche au clavier (Tab), par l'accessibilité, ou par la recherche. | Mobile : `focus()` sur le bouton « San Marco » hors champ. | `CAP/m19-sanmarco.png` |
| B6 | Moyen | Le revenu affiché est faux : « 100 d par jour » dans le médaillon, à partir de la seule commande de bienvenue (`incomePerDay` = 10000). | Après la première livraison. | (texte du médaillon, `m4`) |
| B7 | Moyen | Le prix change sans explication. Le même atelier coûte 120 d, puis 103 d, puis 48 d d'un compte à l'autre (rattrapage `catchup`, `cutBps` 1384). Rien dans l'interface ne le dit, et la baisse est maximale dans un monde presque vide. | Comparer `CAP/pc06-batir.png`, `CAP/m03-catalog.png` et `CAP/m11-fondaco-batir.png`. | idem |
| B8 | Mineur | La fiche d'atelier affiche « Améliorer — max » au niveau 1 (plafond de la Casa) sans dire pourquoi. Le gros bouton du bas est vide pendant son animation. | Toucher le camp de bûcherons. | `CAP/pc10-workshop-card.png` |
| B9 | Mineur | Sur PC, le texte du guide est tronqué (« Votre camp de… ») dans le panneau gauche, qui occupe un tiers de l'écran et reste presque vide. | PC 1280x800. | `CAP/pc07-built.png` |
| B10 | Mineur | Des textes du jeu mensuel restent dans Compagnie › Associés : « De 2 à 6 amis, d'un mois à l'autre… partie rapide… Fonder une guilde ». Le cadrage dit 25 associés, persistants. | Compagnie › Associés. | `CAP/m27-associes.png` |
| B11 | Perf | Avec WebGL logiciel et une machine chargée, une capture PC prend 80 à 130 s et un clic peut dépasser 5 s ; sur mobile, 6 à 10 s. Il faut mesurer sur un téléphone d'entrée de gamme, sans GPU puissant. Sans réglage de qualité ni repli 2D, une partie du public mobile sera perdue. | — | — |

---

## (d) Game design et économie

- **D1. Le désert des deux premières heures (P0).**
  - Les commandes viennent toutes les 128 à 600 min par ville (`orders.everyMinutes`). À la création, la première tombe à +108 et +143 min.
  - La première commande de chaque ville ne vaut qu'un quart de lot (`firstLotBps` 2500), soit 100 d.
  - Le seul autre débouché est la Dogana. Résultat : entre la 10e et la 120e minute, il n'y a rien à faire.
  - Les jeux de référence garantissent 3 à 5 objectifs atteignables par tranche de 10 min pendant la première heure.
- **D2. Les monnaies mortes (P0).** La Faveur et les Sceaux s'accumulent sans aucun usage dans le moteur de l'empire. Le Carnet, seule boucle hebdomadaire visible, ne paie donc rien. Les perle, l'accélération et l'abonnement n'existent pas. Il n'y a ni modèle économique ni récompense méta.
- **D3. La Casa s'achète au marché.** La Dogana vend 10 briques ou 10 planches à 10 d pièce. La Casa 2 se fait donc en 30 s pour 150 d, ce qui rend inutile la chaîne briqueterie et scierie que le guide impose. Il faut choisir : soit le guide propose l'achat comme raccourci (bon pour J1), soit la Dogana ne vend pas les matériaux de Casa.
- **D4. La profondeur de la Dogana est partagée et remise à zéro chaque jour.**
  - Elle est commune à tous les joueurs d'une région : 20 + 3 par maison éveillée par jour et par marchandise, au premier arrivé (`trade.ts`, `marketSize`). Le tableau commun des villes fonctionne pareil (5 par maison).
  - À grande échelle, les joueurs présents tôt dans la journée UTC vident la Dogana, et les autres trouvent « plus rien ».
  - Cela contredit les règles 3 (« l'absence ne coûte rien ») et 7 (« quelques minutes, plusieurs fois par jour »). Il faut une profondeur par maison ou par fenêtre glissante.
- **D5. Des chaînes sans flux.** La relance prélève les intrants une seule fois. Les ateliers aval restent bloqués tant que le joueur n'est pas revenu au bon moment. Le joueur absent perd donc de la production aval, contrairement à l'esprit de la règle 3. Il faut un tirage continu sur le stock pendant la file, ou une relance automatique quand l'intrant arrive.
- **D6. Le rattrapage en monde vide.** Avec peu de joueurs, chaque niveau possédé par « tous » baisse de prix au maximum. Au lancement (dix joueurs), les premiers niveaux seront quasi gratuits pour tous, puis remonteront à mesure que les joueurs arrivent. C'est une économie qui dérive selon la population, et le joueur ne la comprend pas. Il faut un plancher de population, ou calculer le rattrapage sur des cohortes simulées.
- **D7. La Casa 4 est un mur.**
  - Le passage de la Casa 3 (100 d) à la Casa 4 (1 200 d, 60 briques et 60 planches) est un saut de ×12. La Casa 5 coûte encore ×5 (6 400 d, 180 et 180).
  - La Casa 4 ouvre trois systèmes à la fois (Scuola, Porta, Campo et Terraferme), puis plus rien de neuf avant longtemps.
  - Il faut lisser : ouvrir la Porta (tier 1, solo) à la Casa 3, et étaler les ouvertures.
- **D8. Trop de systèmes.** Le jeu compte environ 60 commandes, 4 monnaies prévues, des modules de véhicule et d'atelier, un maître, des savoirs, l'Arte, le personnel, la lignée, l'entraide, la Condotta, la Contesa, la Terraferme, la Porta, le carnet, les parcelles, les fondachi secondaires et la Remise. La règle « une douzaine de systèmes visibles » n'est pas tenue dans les données. Le joueur ne voit pas encore cette masse, mais il la verra d'un coup à la Casa 4 à 7.
- **D9. Les mots se chevauchent.** « Fondaco » désigne à la fois le jeu, l'onglet, le palais et un bâtiment à poser (480 d) ; « Remise » désigne à la fois le stock du quai et le garage des véhicules ; le marché s'appelle « San Marco », « le Marché » et « la Dogana ». Un nouveau joueur ne sait pas où est son stock.
- **D10. Le marché est un tableur.** La Dogana est une liste de prix et de boutons « Acheter 10 » (`CAP/m24-dogana.png`) : c'est contraire à la règle 8. Il manque des étals, des sacs qui s'empilent et des prix sur des pancartes.
- **D11. Des taxes cachées.** On voit une commande à 100 d mais on reçoit 96,21 d ; on voit 10 d mais on paie 10,30 d. Il faut afficher le net, ou « 100 d − 4 % de taxe ».
- **D12. Des exploits potentiels** (non exploités faute de temps) :
  - acheter du bois à la Dogana (3 d) pour le transformer en planches (6 planches à 10 d pour 10 bois) donne une marge de transformation sans limite autre que la profondeur ;
  - le rattrapage maximal dans un monde peu peuplé (D6) ;
  - le Carnet rempli dès la création (« niveaux d'atelier » comptés à la construction).

---

## (e) Onboarding et rétention : ce qui fera partir les joueurs

**Avant J1 (première session)** :
- les deux premières minutes sont bonnes ;
- puis « {cash} », puis une promesse de trois ateliers qui n'existent pas ;
- puis le guide qui se tait (B1, B4) ;
- puis aucune commande pendant deux heures ;
- le joueur ferme le jeu sans raison de revenir dans 30 min : **pas de notification** (« ta briqueterie est prête », « Padoue a une commande »). La PWA en est capable.

**Entre J1 et J7** :
- il n'y a pas d'objectif lisible à moins de 24 h. L'écran « Prochains paliers » (CADRAGE § 4.1 : trois objectifs visibles sur trois axes) est absent ;
- le Carnet ne paie que des monnaies mortes ;
- la Porta et la Terraferme sont fermées derrière un mur de Casa 4 ;
- la compagnie se résume à « Fonder une guilde », avec un texte d'un autre jeu ;
- le joueur de gestion ne voit pas « une ville s'animer » : pas de passants, pas de fumée, pas de charrettes en continu entre les ateliers.

**À J30** : rien ne l'est encore. La promesse (« un an plus tard, un palais sur le Grand Canal ») n'est montrée nulle part ; il n'y a pas de façade qui monte en vue, ni de vitrine des Maisons voisines.

---

## (f) Comparaison aux références

| Référence | Ce qu'elle fait | Fondaco aujourd'hui |
| --- | --- | --- |
| **Hades' Star** (modèle revendiqué) | Les étoiles rouges (PvE) dès les premières heures, des envois qui arrivent toujours, des modules dès le niveau 2, des cristaux (premium) utiles partout | La Porta derrière la Casa 4, les perle absentes, des modules lointains. Seules la carte privée et l'esprit d'absence sans perte sont repris |
| **Township / Hay Day** | Le camion et les commandes disponibles en permanence (9 cases), le ramassage avec des icônes qui volent, des niveaux toutes les 5 à 15 min au début | Des commandes toutes les 2 à 10 h, pas de niveau de joueur rapide (la Casa 2 et 3 en quelques minutes, puis le mur), un ramassage sans feedback |
| **Anno 1800 / Anno mobile** | Des chaînes qui coulent seules, des besoins de population visibles, une ville qui s'anime | Des chaînes relancées à la main, des villes figées sans demande visuelle |
| **Idle tycoons** | Le gain hors ligne montré au retour (« pendant ton absence : +X ») | Au retour : rien, voire un paiement bloqué (B1) |
| **Travian** | Une méta sociale forte, des files de construction | La compagnie est vide ; seule la file de 12 h est bien pensée |

---

## (g) Recommandations priorisées

### P0, avant toute publication

| # | Action | Effort |
| --- | --- | --- |
| 1 | Régler les trajets à la lecture (`GET /api/empire`, ou un `empireSettle` à l'ouverture) et afficher un écran « Pendant votre absence » (lots, livraisons payées, commandes arrivées) | 0,5 à 1 j |
| 2 | Corriger `{cash}`, l'écran de fondation, « saison de novembre » et les textes de compagnie du jeu mensuel ; relire tout `i18n.ts` pour les restes du jeu mensuel | 0,5 j |
| 3 | Un guide sans trou : chaque étape a un bouton qui *fait* l'action (acheter une parcelle, acheter de l'argile, relancer) ; ne jamais demander un atelier sans source ni case ; tester les quatre ordres de construction possibles | 2 à 3 j |
| 4 | Remplir les deux premières heures : 3 commandes « d'apprentissage » à la création (Padoue, Vérone, Venise), des objectifs de Casa 2 et 3 enchaînés, une commande garantie à chaque retour dans les 6 premières heures | 1 à 2 j (réglages et moteur), à valider au simulateur |
| 5 | Donner un usage à la Faveur et aux Sceaux (accélération plafonnée, cosmétiques, agents, comme le prévoit CADRAGE § 5.4), ou retirer les récompenses du Carnet tant que ce n'est pas fait | 2 à 4 j |
| 6 | Trancher sur les perle : soit les livrer (accélération des chantiers et des recherches, gain par le Carnet), soit publier sans monétisation en l'assumant. Ne pas publier un F2P sans boucle premium | 3 à 5 j pour le minimum (solde au grand livre, boutique d'accélération, gain au Carnet) |
| 7 | Rendre la profondeur de la Dogana personnelle, ou en fenêtre glissante par maison (D4) | 1 j, puis le simulateur |
| 8 | Profiler la carte 3D sur un Android d'entrée de gamme ; ajouter un réglage de qualité (ombres, densité d'arbres) | 2 à 3 j |

### P1, dans le mois qui suit

| # | Action | Effort |
| --- | --- | --- |
| 9 | Des chaînes qui coulent : l'atelier aval tire l'intrant du stock au fil de sa file, ou se relance seul à l'arrivée de l'intrant (D5) | 2 j moteur, puis le simulateur |
| 10 | Lisser la Casa 3 → 4 → 5 et ouvrir une Porta solo de découverte à la Casa 3 (D7) | 1 j de réglages et 1 j de simulation |
| 11 | Un écran « Prochains paliers » (trois objectifs sur trois axes, promis au § 4.1) à la place du panneau gauche vide sur PC | 2 j |
| 12 | Du juice au ramassage (marchandises qui volent vers le Fondaco, compteur qui roule), une mule suivie par la caméra, des villes animées (passants, fumée, charrettes de commande) | 3 à 5 j |
| 13 | Notifications PWA (lot prêt, commande arrivée, chantier fini), avec un réglage par type | 2 j |
| 14 | Afficher les taxes (prix net) et la remise de rattrapage (« −14 % : savoir répandu ») | 0,5 j |
| 15 | Un vocabulaire unique : le palais, le stock, le garage et le marché portent chacun un seul nom | 1 j (textes) |

### P2

| # | Action | Effort |
| --- | --- | --- |
| 16 | Un marché visuel (étals, piles, pancartes) à la place de la liste | 3 à 5 j |
| 17 | Une vitrine de la promesse : la façade du palais qui prend des étages, une galerie des Maisons de sa bande | 3 j |
| 18 | Une compagnie utile dès J3 (demandes d'entraide visibles sur la carte, fil) | 3 j |
| 19 | Trier les systèmes : fusionner les modules d'atelier, le maître et l'intérieur ; reporter le personnel et la lignée après la Casa 10 ; tenir la douzaine de systèmes visibles | Décision du porteur, puis un plan |
| 20 | Corriger le focus des repères hors champ (B5 : `scroll-margin` ou `preventScroll`, et `overflow: clip`) | 0,5 j |

---

## Ce qui n'a pas pu être testé

- La Porta, la Terraferme, la Contesa, la Condotta, l'entraide, les véhicules au-delà de la mule, les modules et les savoirs : tous demandent la Casa 4 ou plus, hors d'atteinte en deux heures de jeu réel. Ils ont été évalués par le code et les réglages (`venice1450.empire.ts`).
- La rétention réelle à J1 et J7, et les commandes de villes ordinaires : le serveur a été réinitialisé avant leur arrivée (+2 h).
- Le multijoueur réel : un ou deux comptes par monde.
