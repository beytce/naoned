# Proposition : la Terraferme, une conquête à la manière d'OpenFront

Décisions du porteur (17 octobre 2026), qui remplacent la Campagne des familles (`docs/plan-campagne.md`) :

- le mode doit se rapprocher **vraiment** d'OpenFront : chacun pose son point de départ sur une grande carte et s'étend ;
- les combats restent **asynchrones** : un front lancé en trois minutes avance seul pendant des heures ;
- **chacun pour soi**, avec des **alliances** entre joueurs, plus de familles imposées ;
- **chaque joueur a son territoire** et ses troupes.

Le porteur **lève le gel des mécaniques** pour ce mode (17 octobre 2026). Il n'y a pas de guildes : seulement des alliances entre joueurs. **Statut : plan validé ; prototype au simulateur en cours.**

Réponses du porteur aux questions du plan (17 octobre 2026) :

1. Le **classement de la semaine donne de l'Influence** à tous selon leur rang ; le **grand gagnant choisit un décret** parmi un catalogue de décrets **forts et impactants**.
2. La carte **grandit avec le monde** (cases par marchand actif).
3. Les ducats paient **le plafond de troupes et les bâtiments**.
4. Le **fil d'alliance** est gardé.
5. Les **familles disparaissent** tout à fait, blasons et noms compris : chaque joueur porte son propre blason.

## Ce qu'on prend à OpenFront, ce qu'on adapte

| OpenFront | La Terraferme | Pourquoi l'écart |
| --- | --- | --- |
| Une partie de 20 à 30 min, en direct | Une partie **par semaine** (lundi 0 h → dimanche 24 h, les bornes du classement hebdomadaire) | Nos sessions durent 3 à 5 minutes, réparties sur la journée |
| On choisit son point d'apparition au début | On **pose son comptoir de guerre** sur une case libre, à n'importe quel moment de la semaine | Les joueurs n'arrivent pas tous le lundi à 0 h |
| Territoire au pixel | Territoire en **cases hexagonales** (environ 400) | Lisible et touchable au doigt sur mobile ; calcul pur et déterministe |
| Troupes qui se régénèrent avec le territoire | Pareil, calculées **à la lecture** (comme la production), seulement de 8 h à 22 h | Règle du dépôt ; trêve de nuit |
| Attaque : glisser un pourcentage de ses troupes vers une frontière, le front avance | Pareil : **x % des troupes** vers une case visée ; le front **avance case par case, quelques cases par heure**, hors ligne | Le cœur du plaisir OpenFront, au rythme mobile |
| Alliances demandées et acceptées, trahison | Pareil, **deux alliés au plus**, trahison visible et punie | Garde le jeu politique sans figer la carte |
| Villes, ports, postes de défense, silos, bateaux, bombes | **Rocca** (défense) et **Borgo** (troupes), plus les **sept villes** du jeu sur la carte | Pas de mer jouable, pas d'armes de destruction : Venise 1450 |
| Nations tenues par l'ordinateur | **Milan** (à l'ouest) et les **milices** (cases neutres) ; les maisons PNJ jouent comme des joueurs | Le PvE de la Campagne actuelle, gardé |
| Victoire à 80 % de la carte | **80 %** gagne tout de suite ; sinon la **Gloire** de la semaine décide | Une semaine ne suffit pas toujours à finir |

## La carte

- Une grande carte de la Terraferme vénitienne, de Milan à l'ouest jusqu'au Frioul à l'est, en **cases hexagonales** : environ **400 cases de terre** pour un monde de 40 marchands actifs (10 par marchand ; à régler par `worlds.settings.terraferma.cellsPerActive`). La lagune et la mer bordent la carte à l'est, sans s'y jouer.
- Chaque case a un **terrain** : plaine (défense ×1,0), colline (×1,3), marais (×1,5, lent à traverser), montagne (×2, au nord), et des **rivières** (Adige, Brenta, Piave, Pô) qui comptent ×1,3 à leur franchissement.
- Les **sept villes** du jeu (Venise reste hors carte, au bord, imprenable) et les bourgs réels sont des cases spéciales : plus de Gloire et un plafond de troupes plus haut pour qui les tient.
- La carte est **la même chaque semaine** (dessinée une fois, dans les réglages), habillée de noms réels. Remise à zéro le lundi à 0 h : tout redevient neutre, Milan reprend ses terres.

## Poser son comptoir de guerre

- Le premier geste de la semaine sur la carte : toucher une case libre, à **au moins 4 cases** de tout autre joueur et de Milan. Le joueur reçoit cette case et les six qui l'entourent, et une **dotation de troupes** qui grandit avec le jour de la semaine (le retardataire n'arrive pas désarmé).
- **24 h de protection** : personne ne peut l'attaquer, et il ne peut attaquer que des cases neutres. Il s'étend en paix.
- Les maisons PNJ se posent loin des joueurs réels, de préférence près de Milan, pour faire le tampon.

## Les troupes

| Règle | Détail (à calibrer au simulateur, dans `worlds.settings.terraferma`) |
| --- | --- |
| **Plafond** | 40 + 4 par case tenue + 30 par ville tenue + 20 par Borgo bâti, + ce que le joueur a acheté (plus bas) |
| **Régénération** | De 8 h à 22 h, plus rapide quand on est loin du plafond (comme OpenFront) : environ 10 % de l'écart au plafond par heure, au moins 2. Calculée paresseusement à chaque lecture |
| **Ducats** | Les ducats ne donnent **jamais de troupes** directement : ils relèvent le **plafond** (+10 pour 100 d, deux fois par jour au plus, détruits) et paient les bâtiments. L'argent amplifie un joueur actif, il ne le remplace pas |
| **Hors patrimoine** | Ni cases, ni troupes, ni Gloire ne comptent au patrimoine ; les ducats dépensés le font baisser |

## Les fronts

- **Lancer** : depuis la carte, toucher une case d'un voisin (neutre, Milan ou un joueur non allié), choisir la part de ses troupes (curseur de 10 à 100 %), valider. Les troupes quittent la réserve et forment le **front**.
- **Avancer** : à chaque pas de résolution (le tick, toutes les 10 minutes ouvertes), le front prend au plus **2 cases** de la frontière avec ce voisin, en commençant par les plus proches de la case visée. Une case coûte au front :
  - neutre : la milice de son terrain ;
  - d'un joueur : la **densité** du défenseur (ses troupes divisées par ses cases) × le terrain × la Rocca voisine ; le défenseur perd lui aussi ces troupes.
- **Finir** : le front s'arrête quand ses troupes ne paient plus une case, quand il n'a plus de frontière, ou quand le joueur le rappelle (le reste revient à la réserve). Un joueur a **trois fronts** ouverts au plus.
- **Voir** : les fronts se voient sur la carte (une flèche, sa force, sa direction). Le défenseur reçoit une notification et peut **contre-attaquer**, bâtir une Rocca ou appeler un allié. Pas de garnison à placer case par case : la densité fait la défense, comme dans OpenFront.
- **Nuit** : de 22 h à 8 h, les fronts s'arrêtent et les troupes ne se régénèrent pas.
- **Couper** : une partie du territoire séparée du reste (encerclée) perd 10 % de ses cases par heure au profit de l'encercleur, comme une poche qui tombe.

## Les alliances

- Un joueur demande l'alliance à un voisin ; l'autre accepte ou refuse. **Deux alliés au plus**, jusqu'à la fin de la semaine.
- Entre alliés : pas d'attaque, et l'on peut **envoyer des troupes** à un allié (au plus 30 % des siennes par jour).
- **Rompre** : la rupture prend effet **2 h** après l'annonce, que l'autre voit. Rompre plus de deux fois dans la semaine fait du joueur un **Traître** pour 24 h : sa défense tombe à ×0,75 et personne ne peut s'allier à lui.
- Un **fil d'alliance** (le fil de famille actuel, réduit aux alliés) sert à se coordonner ; mêmes limites et même modération.

## Les bâtiments

Payés en ducats, **détruits** (un puits de monnaie, dont le jeu manque depuis le retrait de l'entretien), sur une case de son territoire, rasés si la case est prise :

| Bâtiment | Effet | Prix et limite (à calibrer) |
| --- | --- | --- |
| **Rocca** | Défense ×1,6 sur sa case et ses six voisines | 40 d ; une pour 15 cases tenues |
| **Borgo** | Plafond de troupes +20, régénération +10 % | 50 d ; une pour 20 cases tenues |

## Le PvE : milices et Milan

- Les **milices** tiennent les cases neutres : la semaine s'ouvre sur une course à l'expansion.
- **Milan** est une nation tenue par l'ordinateur, maîtresse de l'ouest. Elle s'étend vers les cases neutres et, toutes les 4 heures ouvertes, lance un front contre le **joueur qui mène en Gloire**, plus fort quand son avance grandit : le frein au favori, gardé de la Campagne.

## Gloire, victoire, décrets

| Règle | Détail |
| --- | --- |
| **Gloire** | Personnelle : chaque heure ouverte, 1 par case tenue, 3 par ville. Calculée paresseusement (heure de prise mémorisée) |
| **Victoire** | Le joueur qui tient **80 %** de la carte gagne tout de suite. Sinon, à la fin de la semaine, le premier en Gloire est le **Signore della Terraferma** |
| **Influence** | À la clôture, le classement de la semaine en Gloire donne de l'Influence à chacun selon son palier (barème de départ : Signore 20, podium 12, top 10 8, premier quart 5, participant 2 ; à calibrer). C'est la seconde source d'Influence après les missions de la Maison |
| **Décret du Signore** | Le Signore **choisit un décret fort** pendant la semaine (public dès son choix, il change jusqu'à la clôture) ; il entre en vigueur la semaine suivante, pour le Signore et **ses alliés à la clôture** : s'allier au favori devient un pari. Jamais le même décret deux semaines de suite |
| **Mérite** | Personnel : cases prises, défenses tenues, troupes envoyées aux alliés. Sert au classement de la semaine et à une petite Renommée. Jamais de ducats |
| **Pass Négociant** | Aucun avantage sur la Terraferme |

### Les décrets forts (première proposition, bornes à calibrer au simulateur)

| Décret | Effet pour la semaine suivante | Monnaie |
| --- | --- | --- |
| **Monopole** sur un bien choisi | Les autres paient 15 points de taxe en plus quand ils vendent ce bien au Rialto ; la recette va au Signore et à ses alliés | Transfert entre joueurs |
| **Embargo** sur une ville choisie | Les livraisons des autres vers cette ville sont payées 25 % de moins ; ses commandes urgentes sont au Signore et à ses alliés la première heure | Moins de création |
| **Dîme de la Terraferme** | 3 % de chaque livraison des autres est versé au Signore et à ses alliés | Transfert entre joueurs |
| **Faveur du Doge** | Contrats du Doge payés 40 % de plus pour le Signore et ses alliés, un contrat de plus par jour | Création bornée |
| **Franchise du Rialto** | Pour eux : taxe du Rialto à 0 %, quotas de la Dogana doublés | Puits réduit |
| **Calmiere** sur un bien choisi | Aucune offre de ce bien au-dessus de 105 % de la référence | Aucune |

Garde-fou : un décret ne doit pas rapporter plus d'environ 15 % du revenu de la semaine d'un joueur actif (mesuré au simulateur), et l'écart de patrimoine du Pass reste mesuré par `pnpm sim --pass 0.2`.

## Ce qui disparaît

Les quatre familles imposées et l'allégeance, les fiefs, la levée et les lances à 48 h, les marches et les assauts communs, les ouvrages de famille (remplacés par les bâtiments personnels), le vote du programme par famille, le fil de famille (devenu fil d'alliance), les blasons et les noms des quatre familles (chaque joueur porte son blason), l'ancien catalogue de décrets. Les missions de la Maison liées à la Campagne (`levy_collected`, `march_sent`, `assault_won`, `land_defended`, `work_built`) deviennent : poser son comptoir, prendre N cases, tenir une ville, bâtir une Rocca, envoyer des troupes à un allié. L'Influence dépensée en troupes et en ouvrages achevés est remplacée par : relever son plafond, achever un bâtiment.

## Écrans

- **La carte de la Terraferme**, en plein écran, à la place du calque de la Campagne : les cases à la couleur du blason de chaque joueur (ses alliés cerclés d'or), les fronts en flèches animées, Milan en rouge sombre. Pincer pour zoomer, comme la carte du commerce.
- **HUD** : ses troupes / son plafond et la régénération, ses cases, sa Gloire et son rang ; le compte à rebours de la nuit et de Milan.
- **Lancer un front** : toucher une case voisine, un curseur de pourcentage, « Attaquer ». Rappeler un front depuis sa flèche.
- **Panneau d'un joueur** (toucher son territoire) : son nom, ses cases, sa densité, ses alliés ; « Proposer l'alliance », « Envoyer des troupes ».
- **Notifications** : front lancé contre soi (jamais regroupé), case perdue, alliance proposée, rompue, trahison, résultat de la semaine.

## Technique

- **Moteur** (`packages/engine/src/terraferma.ts`), fonctions pures testées sur la fixture figée : carte hexagonale et voisinage, placement, troupes paresseuses, résolution des fronts au pas de 10 minutes (ordre déterministe : fronts triés par heure de lancement, cases par distance à la cible puis par identifiant), encerclement, alliances, bâtiments, Milan, Gloire, clôture. La résolution des fronts se fait dans le tick (comme les livraisons), la régénération à la lecture.
- **État** : environ 400 cases × (propriétaire, heure de prise, bâtiment) par monde, plus les fronts et les alliances : petit, dans l'état du monde comme la Campagne.
- **Carte** : un SVG de ~400 hexagones regroupés par propriétaire (un tracé par territoire, pas par case) pour rester fluide sur mobile.
- **Réglages** : `worlds.settings.terraferma` (carte, terrains, troupes, fronts, alliances, bâtiments, Milan, Gloire) ; rien en dur.

## Livraison proposée (après validation)

1. **Prototype au simulateur** : moteur minimal (carte, placement, troupes, fronts, Milan) et des PNJ qui jouent ; mesurer la durée d'une semaine, la vitesse des fronts, l'avance des assidus, la monnaie détruite par les bâtiments.
2. Moteur complet, tests d'abord : alliances, trahison, encerclement, bâtiments, Gloire, décrets, clôture.
3. Serveur : actions, vue (la carte et les fronts en différé), notifications, fil d'alliance ; migration des familles.
4. Interface : la carte hexagonale, le HUD, le lancement d'un front, le panneau d'un joueur.
5. Calibration : `pnpm sim` sur toutes les graines et `--pass 0.2`, `docs/calibration.md`.
6. Bascule à une **ouverture de saison** (le 1er du mois), jamais en cours de saison ; `docs/CADRAGE.md`, `docs/design.md`.
