# La Terraferme en Porcellana (plan du lot 9, 7 novembre 2026)

*Validé par le porteur le 7 novembre 2026 (« je valide le plan »), avec trois ajouts : les liens ① l'intendance par la route et ⑤ les villes tenues des propositions de liens entre les modes (`docs/direction-artistique-2026-11/terraferme/liens-modes.html`), et l'achat de troupes avec les ducats du commerce, qui modifie la règle d'or 4 (§ 4 bis).* Le porteur a retenu la recommandation des propositions du 7 novembre (« Ok suis ta recommandation ») et demande en plus de rendre visuels les bâtiments qu'on pose et de penser l'interface autour.

Références (elles font foi pour l'aspect) :
- les quatre propositions : `docs/direction-artistique-2026-11/terraferme/propositions.html` (en ligne, privé : https://claude.ai/artifact/GhNwtH8YRi5Vq3SKJhzagd) ;
- la maquette jouable qui les réunit, avec les bâtiments et l'interface : `docs/direction-artistique-2026-11/terraferme/maquette.html` (en ligne, privé : https://claude.ai/artifact/LEuJNbxcno7KiTHKuT8RnZ) ; captures `maquette-*.png` dans le même dossier.

Ce lot est le lot 9 de `docs/plan-porcellana.md` (« la Terraferme : la même grille carrée et la même direction, changement au lundi suivant »). Les règles du jeu ne changent pas, sauf le voisinage, qui passe de six à quatre voisins (§ 4).

## 1. Ce qui est retenu

| Pièce | Venue de | Ce qu'elle fait |
| --- | --- | --- |
| **La scène** | IV, la marée en relief | Le plateau du commerce : caméra orthographique en trois quarts, cases épaisses biseautées, lagune d'un seul tenant, montagnes, collines et marais en relief. Ta terre est un peu plus haute (0,62 contre 0,50 pour les autres, 0,42 pour la terre libre). |
| **L'émail** | I, la coulée | Chaque territoire est une nappe d'émail posée sur le dessus des cases : bords arrondis, un joint de porcelaine entre deux marchands, un reflet blanc au bord. Une case prise reçoit l'émail qui coule depuis la case voisine d'où vient l'attaque. |
| **La vague** | IV | La case prise se soulève (+0,55) puis retombe en 0,8 s ; ses voisines frémissent (+0,1). |
| **Le ruban** | II, les tesselles | Un front est un ruban à chevrons qui court de son camp à sa tête, levé en arc au-dessus du plateau ; les siens en rouge, ceux qui le menacent à l'encre, Milan en biscuit. Une pastille de papier porte ses hommes. |
| **L'épaisseur** | III, les courants | Le ruban est épais au camp, plus fin à la tête ; sa largeur suit la racine des hommes engagés et maigrit à chaque case prise. |
| **Les équerres** | II | Les deux prochaines cases d'un front portent quatre équerres qui respirent. |
| **Les couleurs** | règle « Encres » | Toi en rouge de Venise ; les voisins en valeurs d'encre (dense, claire et tramée) ; les alliés au liseré lagune ; Milan en biscuit hachuré. Les noms viennent en étiquettes au camp. |

## 2. Les bâtiments, visibles sur le plateau

Les cinq bâtiments du moteur (`terraferma.buildings`) et le camp deviennent des modèles de porcelaine du kit (`apps/web/src/porcellana/models/terra.ts`), dans la grammaire des ateliers : une silhouette qu'on nomme au premier regard, le drapeau à la couleur du marchand.

| Bâtiment | Silhouette | Zone allumée quand on le choisit |
| --- | --- | --- |
| **Camp** | Tente octogonale à toit conique, grand drapeau ; le sien porte l'anneau des recrues | — |
| **Fort** (`rocca`) | Donjon carré crénelé sur un socle | Sa case et les quatre voisines (rouge) |
| **Bourg** (`borgo`, s'il est ouvert) | Trois maisons à pignon | Toutes tes terres (voile rouge léger) |
| **Port** (`porto`, au bord de l'eau) | Quai de bois, bittes d'encre, maison du port, barque à voile rouge | Les rives de la même eau (lagune) |
| **Bombarde** (`bombarda`) | Affût de bois, fût de métal, roues et boulets d'encre | Portée de 4 cases (tirets) ; en visée, les cibles en équerres |
| **Remparts** (`mura`) | Quatre murs bas et tours d'angle autour de la case | Sa case et les quatre voisines (encre) |

- **Poser** : le bâtiment tombe en place depuis sous la case (0,7 s), comme une case achetée sur la carte.
- **Perdre** : une case prise rase son bâtiment, qui s'enfonce et s'efface (1,4 s).
- **Tirer** : le boulet suit un arc en pointillés d'encre ; à l'impact, une bouffée de porcelaine, et les cases touchées perdent leur émail.

## 3. L'interface (refonte claire, dock, Porcellana ludique)

Aucune pièce nouvelle : la fiche, le dock, `ChoiceCard`, `CostChips`, la touche rouge sur son pied, la pilule fantôme, la pilule d'encre.

- **La barre du haut** : « ‹ Carte », la Maison et son rang ; au centre la phase (jour, nuit, bataille du soir, fin de semaine) ; à droite les troupes en anneau qui se remplit (« 96 / 180 », « +13/h · pain 4 j »), puis les ducats. Les troupes touchées ouvrent « Tes terres ». Sur téléphone : la Maison et les troupes seulement, la phase en pilule dessous.
- **Toucher une case** : elle se soulève (0,35), cerclée de rouge ; la fiche se pose à côté (en bas sur téléphone) : à qui elle est, son terrain, ce qu'elle coûte à prendre ou ce qui la défend. La flèche rouge ouvre le dock.
- **Le dock « Lancer un front »** : le curseur des hommes engagés ; pendant qu'on le tire, le ruban fantôme grossit sur le plateau et les cases qu'il prendrait s'allument (équerres sur les deux premières, tirets ensuite) ; quatre lignes (cases prises et coût, hommes qui reviennent, défenseurs qui restent par case, heure de la première case) ; « Attaquer · 52 hommes ». Les textes existants de `fr.empire.terra.target` servent tels quels.
- **Le dock « Bâtir ici »** : les bâtiments en cartes, chacun dessiné sur sa case, son effet, son prix et « 1 / 3 » ; une carte grisée dit pourquoi (« Au bord de l'eau », « Case déjà bâtie », « 2 sur 2 : prends des terres »). La carte choisie pose le bâtiment en fantôme sur la case et allume sa zone ; « Bâtir le fort · 40 ».
- **Le dock d'un voisin** : blason, cases, troupes, allié ; les quatre signaux en pastilles (À l'aide, Cible, Merci, Paix) ; « Proposer l'alliance », ou pour un allié « Envoyer » avec un curseur et « Rompre (effet dans 2 h) ». Ses terres s'entourent de tirets.
- **Le dock « Tes terres »** : troupes, recrues, pain, points ; les fronts en marche avec « Rappeler » ; « Max +20 » ; le décret (au Signore seulement).
- **Les fronts** : sur ordinateur, un panneau à gauche (chaque front en barre à l'épaisseur de ses hommes, « Rappeler » ; les menaces à l'encre ; le rang). Sur téléphone, derrière « Fronts » au pied.
- **Le pied** : Mes terres, Fronts (avec leur nombre), Alliés, Classement.
- **Les retours** : une pilule d'encre en haut (« Front lancé · 52 hommes en marche ✓ », « Fort bâti ✓ », « Front rentré · 8 hommes reviennent »).
- **Le zoom** : +, −, « Centrer sur mes terres » ; glisser, pincer, la molette.
- **« Pendant votre absence »** : au retour, la semaine se rejoue en accéléré (les cases changent de main, les vagues passent) avant de rendre la main, comme le récapitulatif d'aujourd'hui.

## 4. La grille carrée (la seule règle touchée)

- Le moteur (`packages/engine/src/terraferma.ts`) passe de `hexNeighbors` et `hexDistance` à un voisinage carré à quatre voisins et à une distance de Manhattan, derrière un réglage `terraferma.grid` (« hex » | « square »), pour que l'ancienne carte reste jouable jusqu'au lundi de la bascule.
- La carte de la Vénétie est refaite en carrés à partir du même terrain (`art/veneto`), comme la carte du commerce l'a été (`docs/plan-porcellana.md` § 2 bis).
- Quatre voisins au lieu de six : une case a moins de fronts possibles, un fort couvre cinq cases au lieu de sept, les poches se ferment plus vite. On le mesure au simulateur (`pnpm sim --terra`, toutes les graines) : durée de la semaine, vitesse des fronts, part de terre libre au jeudi. Les réglages qui bougent (milices, `perCells`, rayon des remparts) sont notés dans `docs/calibration.md`.
- Le changement prend effet le lundi suivant sa mise en ligne (règle de la Terraferme), annoncé dans les notes du chapitre.

## 4 bis. Des troupes achetées avec les ducats (décision du porteur, 7 novembre 2026)

- « + Troupes » dans le dock « Tes terres », à côté de « Max +20 » : 20 troupes pour 100 d, trois fois par jour, jamais au-delà du maximum (`terraferma.troopBuy`, absent : fermé). Les ducats sont détruits.
- Mesure (`pnpm --filter @comptoirs/simulator terra-buy`, `docs/calibration.md`) : un marchand riche gagnait déjà toutes les semaines par ses forts et ses hausses du maximum ; la vente lui ajoute environ 12 % de Gloire et de cases.
- La règle d'or 4 est réécrite en conséquence (CLAUDE.md, CADRAGE-v3 § 2) : l'argent réel n'achète toujours rien à la Terraferme.

## 4 ter. Les liens retenus avec les autres modes

- **① L'intendance par la route** : le Campo devient un lieu qu'on livre en tournée, comme une ville. Ses besoins de la semaine (pain des troupes, planches et briques des bâtiments) s'affichent en caisses au quai ; les véhicules les portent du Fondaco sur les routes. La ration reste plafonnée et égale : livrer remplit jusqu'au plafond, jamais au-delà. Elle remplace le paiement d'entrée dans un menu (lot T5).
- **⑤ Les villes tenues** : les villes du plateau sont celles de la carte du commerce ; qui en tient une à la clôture y plante sa bannière la semaine suivante sur la carte de tous, et reçoit une lettre de la Signoria pour la région de cette ville (une part de la Faveur d'une charte). Dans le plafond de 10 à 15 % de la progression de la semaine, mesuré au simulateur de 24 mois (lot T6).

## 4 quater. L'intendance par la route : le détail technique (à valider, 7 novembre 2026)

Ce que le moteur fait aujourd'hui dans l'empire : l'entrée (20 planches) se prend dans le stock de Venise au moment de s'inscrire ; le pain des troupes vient d'abord de la ration de la République (20 pains par jour, la même pour tous), puis du stock du marchand ; les matériaux des bâtiments se prennent dans le stock au moment de bâtir. Rien ne roule sur la carte.

Ce qui est proposé :
- **Le Campo reçoit des commandes d'intendance**, comme une ville : chaque jour, ce que la guerre mangera (le pain au-delà de la ration, les planches et les briques des bâtiments possibles), en caisses à son quai. On les livre avec les mêmes gestes que les villes (« Livrer », la tournée tracée au doigt) : le Campo devient un arrêt possible d'une tournée.
- **Ce qui arrive va dans le magasin du Campo**, plafonné au besoin de la semaine (règle d'or 3 : une fois plein, plus de commande). La Terraferme prend son pain et ses matériaux dans ce magasin.
- **La ration de la République reste** et passe en premier : l'intendance ne sert qu'au-delà, pour que l'égalité d'entrée tienne.
- Mesure au simulateur de 24 mois : le temps de véhicule pris au commerce, le revenu, la part de joueurs qui tiennent leur intendance.

**Décisions du porteur (7 novembre 2026)** : le pain et les matériaux se prennent **d'abord au magasin du Campo, puis à Venise** (celui qui ne livre pas joue quand même) ; **l'entrée reste prise à Venise** d'un geste ; **livrer ne rapporte rien** de plus (c'est de la logistique) ; **le Bourg est gardé** parmi les bâtiments.

Les questions posées :
1. **Le magasin du Campo seul, ou d'abord lui puis Venise ?** Seul : le lien est fort (sans convoi, plus de pain au-delà de la ration). D'abord lui puis Venise : le joueur qui ne livre pas joue quand même, comme aujourd'hui.
2. **L'entrée de la semaine** (20 planches) : livrée au Campo avant de s'inscrire, ou toujours prise à Venise d'un geste ?
3. **Une récompense pour livrer ?** Aucune (c'est de la logistique), ou un peu de Faveur dans le plafond de la Terraferme ?

## 4 quinquies. Le trésor de guerre égal (lot T5b, décisions du porteur du 8 novembre 2026)

Il remplace l'achat de troupes avec les ducats (§ 4 bis, refermé le 8 novembre) : à la Terraferme, plus rien ne se paie en ducats du commerce.

- **Le trésor, en écus** : une monnaie propre à la Terraferme, la même pour tous les joueurs d'un théâtre. Elle vit dans l'état de la semaine comme les troupes ; les ducats et leurs écritures ne sont plus touchés.
- **Départ, puis chaque matin** : une réserve à l'inscription, un versement chaque matin, jusqu'à un plafond (règle 3 : plein, rien ne s'ajoute et rien ne se perd ; règle 7 : revenir dans la semaine compte).
- **Des choix serrés** : de quoi bâtir 3 à 4 bâtiments ou relever deux fois le maximum dans la semaine, pas tout. Réglages dans `terraferma.chest` (départ, versement, plafond) et les prix en écus, affinés au simulateur.
- **Ce qui s'y paie** : les bâtiments (fort, port, bombarde, remparts, Bourg s'il est ouvert) et la hausse du maximum.
- **Ce qui disparaît** : l'achat de troupes (commande, réglage, bouton, simulateur `terra-buy`), le don de ducats entre alliés (`terraGift` ; envoyer des troupes reste), le paiement en ducats de la Terraferme dans `terraWorld.ts`.
- **Ce qu'on voit** : un coffre de porcelaine au camp, qui se remplit le matin et se vide à chaque achat ; sa jauge dans la barre à côté des troupes ; les prix en écus sur les cartes « Bâtir » ; la pilule de retour.
- **Mesure** : au simulateur de la Terraferme, toutes les graines, un joueur riche et un joueur pauvre du commerce : la part de semaines gagnées ne doit plus suivre la richesse ; au simulateur de 24 mois, le commerce ne bouge pas. Dans `docs/calibration.md`.
- **Mise en ligne** : pour les théâtres ouverts le lundi suivant, annoncée dans les notes du chapitre.
- **Ensuite** : T5c, l'intendance par la route ; T5d, le territoire qui fait l'armée.

## 4 sexies. L'intendance par la route : le plan du lot T5c (décisions du porteur du 8 novembre 2026)

Le défaut relevé : avec « le magasin du Campo d'abord, puis Venise » et « livrer ne rapporte rien » (§ 4 quater), livrer ne changeait rien : la guerre aurait pris les mêmes marchandises à Venise. Le porteur a tranché :

- **Venise coûte plus** : ce que la guerre prend directement au stock de Venise (le pain au-delà de la ration, les matériaux des bâtiments, le pain du maximum) coûte la moitié en plus, le transport par la Signoria ; livré au Campo, le juste compte. Celui qui ne livre pas joue quand même ; celui qui livre économise ses marchandises. Réglage `empire.terra.supply.venetianBps` (15 000).
- **Chaque matin** : le Campo publie le besoin du jour, le pain au-delà de la ration et les matériaux d'un bâtiment à venir, en quelques caisses ; plafonné au besoin de la semaine (règle 3). Seulement pour un marchand inscrit à la semaine.
- **Comme une ville** : une commande du Campo prend sa place dans la cale ; le Campo est un arrêt de tournée parmi les villes (la tournée tracée au doigt, « Livrer »). Livrer ne rapporte aucun ducat ; ce qui arrive va au magasin du Campo.
- **Ce qu'on voit** : les caisses au quai du Campo sur la carte, les véhicules sur la route ; sur le plateau de la Terraferme, une réserve près du camp qui se remplit à l'arrivée d'un convoi ; la jauge du magasin dans « Tes terres ».
- **Moteur** (tests d'abord, fixture figée) : les commandes `campo` dans `empire/orders.ts`, leur livraison vers le magasin dans `empire/moves.ts`, la consommation (ration, magasin, Venise à 150 %) dans `terraWorld.ts` et `empire/terra.ts`.
- **Mesure** : au simulateur de 24 mois, toutes les graines, le temps de véhicule pris au commerce, le revenu, la part de maisons qui livrent ; `docs/calibration.md`.

## 4 septies. Le territoire fait l'armée : le plan du lot T5d (décisions du porteur du 8 novembre 2026)

- **Boule de neige modérée, plafonnée** : chaque case et chaque ville tenues ajoutent au maximum de troupes (`troops.perCell`, `troops.perCity`, déjà dans le moteur, à 0 à Venise), jusqu'à un plafond vers trois fois le maximum de départ (`troops.max`, nouveau ; règle 3). Le recrutement suit déjà les terres ; la hausse du maximum en écus reste un coup de pouce.
- **La masse fait la vitesse, jusqu'à 3 cases par pas** : un front prend 1 case par pas, plus une par tranche de `fronts.massPerCell` troupes engagées, au plus `fronts.cellsMaxPerStep` (3).
- **Un seuil de victoire qui baisse** : `close.winBpsByDay`, un seuil par jour de la semaine, haut le lundi, bas le dimanche ; réglé pour qu'environ une semaine sur trois se termine avant le dimanche (au simulateur, toutes les graines). Le seuil vaut pour un marchand seul, comme aujourd'hui (compter une alliance serait une autre décision).
- **Ce qu'on voit** : l'anneau des troupes qui s'élargit à chaque case prise et la pilule « maximum +N » ; le ruban d'un gros front qui avance plus vite, la durée de marche juste dans « Lancer un front » ; dans le classement, « Seuil du jour : 40 % · tu tiens 12 % », et une alerte à tous la veille du jour où un marchand peut l'atteindre.
- **Mesure** (simulateur de la Terraferme, toutes les graines, `docs/calibration.md`) : part de la carte du premier, semaines gagnées avant le dimanche, écart assidus / occasionnels, éliminations, premier front entre marchands.
- **Mise en ligne** : pour les théâtres ouverts le lundi suivant, comme le trésor.

## 4 octies. Le retour et les villes tenues : le plan du lot T6 (9 novembre 2026)

Le porteur a dit « enchaîne » après T5d ; les choix ci-dessous sont les recommandations de Claude, à revoir s'il le souhaite.

- **« Pendant ton absence »** : en entrant dans la Terraferme après plus de dix minutes, le plateau rejoue en accéléré (quatre secondes) les cases qui ont changé de main depuis ta dernière visite, au plus la dernière journée (les `changes` de la vue) ; les vagues et l'émail qui coule du plateau font le spectacle. Puis une pilule résume : « Pendant ton absence : +4 cases, −2 cases, 3 fronts rentrés ». Une touche « Passer » ; sans animation demandée, le résumé seul. La dernière visite est gardée dans le navigateur (`localStorage`, une commodité, pas un état de jeu).
- **Les villes tenues** (lien ⑤) : qui tient une ville du plateau à la clôture plante sa bannière sur cette ville de la carte du commerce pendant la semaine suivante, et reçoit une lettre de la Signoria (de la Faveur de la région), dans le plafond de 10 à 15 % de la progression ; mesuré au simulateur de 24 mois. Second temps du lot, après le rejeu.

## 4 nonies. La Bataille, en direct, ouverte à tous : le plan du lot T6b (décisions du porteur du 9 novembre 2026)

L'escarmouche du monde mensuel (`packages/engine/src/skirmish.ts`, `apps/server/src/game/skirmish.ts` : 15 minutes, le temps à 60 fois, 8 places complétées par l'ordinateur, une partie classée par jour) devient la Bataille de l'empire.

- **B1, le moteur et les salles** : les règles de la nouvelle Terraferme (carte carrée, territoire qui fait l'armée, vitesse selon la masse) ; **un trésor d'écus de partie**, le même pour tous, qui se remplit au fil de la partie ; rien de l'empire n'y entre (règles 4 et 6) ; **8 joueurs**, les places vides prises par l'ordinateur ; plusieurs parties à la fois, des salles toujours ouvertes (une partie part pleine ou au bout de 60 s) ; **12 minutes** (règle 7).
- **B2, l'écran** : le plateau et l'interface de la Terraferme en direct, la barre du temps, l'écran de fin (classement, cote, « Rejouer ») ; l'entrée par le Campo, le volet Compagnie et l'adresse `/bataille`.
- **B3, la cote** : une cote de type Elo en base, les parties formées par cote (pas de bande de Puissance : les armes sont égales), un classement public.
- **B4, sans compte** : **l'invité joue tout de suite** sous un nom tiré au sort ; sa cote et son classement ne s'enregistrent qu'avec un compte (l'e-mail du jeu), qui reprend ses parties du navigateur ; un lien de salle privée à partager.
- **B5, la Semaine** : **la première Bataille classée du jour rapporte un peu de Gloire** à ton théâtre de la semaine, plafonnée (vers 10 % de la Gloire d'un régulier).
- **Mesure** : des parties entre machines : durée, parties décidées avant la fin, écart entre les bons et les mauvais joueurs.
- **Ordre** : B1 et B2 ensemble (une Bataille jouable), puis B3, B4, B5, chacun testé et commité à part.

## 5. Les lots

| Lot | Contenu | Vérification |
| --- | --- | --- |
| T1 | **Moteur** : `terraferma.grid`, voisinage et distance carrés (`terraNeighbors`, `terraDistance`), tests d'abord sur la fixture figée ; la carte carrée de la Vénétie (tirée de la même géographie) ; l'achat de troupes (`terraferma.troopBuy`, commande `terraBuyTroops`) ; mesure au simulateur, `docs/calibration.md`. **Fait le 7 novembre 2026** ; Venise reste en hexagones jusqu'au plateau du lot T2 | `pnpm test`, `terra`, `terra-buy` |
| T2 | **Le plateau** : `porcellana/terra/` : `TerraBoard.tsx` (cases en instances, hauteur selon qui tient, vague quand une case change de main, montagnes et collines en relief, villes et camps ; un camp pris disparaît), l'émail peint sur une feuille posée sur le dessus des cases (`glaze.ts`, champ par marchand et marching squares, testé ; `paint.ts`, repeint seulement là où une case coule, et une dernière fois après chaque coulée même si les images sont lentes), la caméra et les gestes de la Carte ; sans WebGL, la même feuille vue de dessus (`TerraScene.tsx`). L'écran de la Terraferme le montre dès que la carte de la semaine est carrée (`map.grid` dans la vue). Laboratoire `?lab=porcellana&vue=terraferme` (une semaine du moteur en accéléré, `&plat=1` sans WebGL) ; captures `t2-*.png`. **Fait le 7 novembre 2026.** À reprendre au lot T5 : les petites enclaves (un camp pris au milieu des terres d'un autre) font des gouttes sombres ; la mise au point sur le joueur (voisins lisibles, les autres estompés) les adoucira | captures ordinateur et téléphone |
| T3 | **Les fronts** : `porcellana/terra/fronts.ts` (la tête du front, l'épaisseur selon la racine des hommes, le ruban qui s'affine et sa flèche ; testé) et `frontLayer.ts` : un ruban à chevrons arqué du camp à la tête, la tête qui glisse de case en case quand le front prend, quatre équerres qui respirent sur les deux prochaines cases (la prévision du moteur, `takes` dans la vue), une pastille d'hommes à la tête ; les siens en rouge, ceux qui le menacent à l'encre, ceux des autres en gris pâle, sans équerres ni pastille. Capture `t3-fronts.png`. **Fait le 7 novembre 2026** ; le parcours e2e « lancer un front » vient avec le dock du lot T5 | captures |
| T4 | **Les bâtiments** : `porcellana/models/terra.ts` (camp de guerre, fort, bourg, port tourné vers son eau avec sa barque, bombarde sur son affût, remparts et leurs tours), le drapeau et la voile à la couleur du marchand ; au catalogue du laboratoire, famille « Terraferme ». Sur le plateau : un bâtiment monte en place avec un léger rebond, un bâtiment rasé s'enfonce ; le relief s'efface sous ce qui est bâti. Le tir de bombarde se lit dans ce qui change de main (`buildings.ts`, testé : des cases d'un marchand rendues libres ensemble, à portée de la bombarde d'un autre) : le boulet vole en arc, une bouffée de poussière, puis les cases perdent leur émail. Captures `t4-*.png`. **Fait le 7 novembre 2026** | captures du laboratoire |
| T5 | **L'interface** (`empire/TerraPlay.tsx`, `porcellana/terra/play.ts` testé) : la barre (troupes et recrues, la phase, le rang), la fiche à côté de la case touchée (ce qu'elle est, à qui, une phrase, la touche rouge), et le dock d'une décision : lancer un front (curseur des hommes, ce qu'il prendra, la défense qui reste ; la case visée s'allume), bâtir (les bâtiments en cartes, ce qui manque dit pourquoi), un voisin ou un allié (alliance, troupes envoyées, signaux), vos terres (« +20 troupes », « Max +20 », les fronts et « Rappeler »), viser (les cibles de la bombarde s'allument, une touche tire), s'installer ; au pied : vos terres, fronts, alliés, classement. La mise au point : les marchands ni alliés ni voisins s'estompent. La vue dit la vente de troupes (`rules.troopBuy`, `me.buysLeft`). Laboratoire jouable à la main : `?lab=porcellana&vue=terraferme&jeu=1`. Captures `t5-*.png`. **Fait le 7 novembre 2026.** Reste du lot : ① l'intendance par la route | `pnpm test`, captures |
| T6 | **Le retour et les villes tenues** (§ 4 octies) : « pendant ton absence », le plateau rejoue les cases qui ont changé de main depuis la dernière visite (la dernière journée, `porcellana/terra/away.ts` testé), puis une pilule résume, « Passer » ; les villes tenues à la clôture : la grande bannière de la maison sur ces villes de la carte du commerce la semaine suivante (`heldBanner`) et une lettre de la Signoria, 5 Faveur par ville, 3 au plus (`empire.terra.cities`), testées ; au simulateur de 24 mois. **Fait le 9 novembre 2026** ; pas encore vus en capture : le rejeu et la bannière | `pnpm test`, `empire` |
| T7 | **Bascule** (décision du porteur du 9 novembre 2026 : cette semaine, par exception à la règle du lundi suivant) : `terraferma.grid` à « square » dans les réglages de Venise ; les théâtres de la semaine ouverts en hexagones refaits sur la carte carrée à la première action (`reformTheatres`, testé : membres gardés, camps effacés, entrée non reprise, avis `terra_reformed`) ; notes du chapitre `docs/notes-chapitre-2026-11-terraferme.md` ; `docs/design.md`, `docs/deploiement.md`. **Fait le 9 novembre 2026** ; la mise en ligne est la fusion de la PR par le porteur | `pnpm test`, `e2e:terra` |
| T5b | **Le trésor de guerre égal** (§ 4 quinquies) : `terraferma.chest`, `chestOf` (paresseux : la réserve du matin calculée à la lecture), bâtiments et maximum payés en écus (`chest_short` sinon), testés sur la fixture ; l'achat de troupes et le don de ducats retirés ; la jauge du trésor dans la barre, les prix en écus et ce qui manque sur les cartes, le coffre de porcelaine au camp (`warChest`) ; mesure `terra-chest` dans `docs/calibration.md` (un riche Signore 10 / 10 → 1 / 10). **Fait le 8 novembre 2026** ; s'applique aux théâtres du lundi suivant sa mise en ligne, à annoncer dans les notes du chapitre | `pnpm test`, `terra-chest` |
| T5c | **L'intendance par la route** (§ 4 sexies) : le Campo, ville de code réservé `campo` (`empire/map.ts`, `empire/campo.ts`) ; chaque matin, ses commandes du jour (le pain au-delà de la ration, les matériaux d'un bâtiment à venir, moins le magasin), payées rien ; livrées par « Livrer » ou dans une tournée tracée au doigt, elles vont au magasin du Campo ; la guerre prend la ration, puis le magasin, puis Venise à 150 % (`empire.terra.supply.venetianBps`), testé ; sur la carte, les caisses du Campo, ce qu'il demande et « Livrer » sur sa fiche ; à la Terraferme, le magasin et « Livrer au Campo » dans « Tes terres », des caisses près du camp. Simulateur de 24 mois : la mesure « Intendance » du rapport. **Fait le 8 novembre 2026** | `pnpm test`, `empire` |
| T5d | **Le territoire fait l'armée** (§ 4 septies) : `troops.max`, `fronts.massPerCell` et `cellsMaxPerStep` (`cellsThisStep`), `close.winBpsByDay` (`winBpsAt`), testés ; à l'écran, la durée de marche selon la masse, le seuil du jour et ta part dans le classement, la pilule « maximum +N ». Mesure dans `docs/calibration.md` : 4 semaines sur 10 gagnées avant la fin, mais le samedi ou le dimanche, avec un seuil de 7–8 % ; éliminations de 4 à environ 10. **Fait le 9 novembre 2026** ; reste l'alerte de la veille et le choix du porteur entre des théâtres plus petits et une boule de neige plus forte | `pnpm test`, `terra` |
| T6b | **La Bataille** (§ 4 nonies). **B1 et B2 faits le 9 novembre 2026** : l'escarmouche à 12 minutes, son trésor de partie (`skirmish.chest`, versé toutes les deux heures de son temps, deux minutes réelles), les ordres de la semaine (`skirmishAct`), testés ; `BattleHub` au serveur (salle toujours ouverte, départ plein ou au bout d'une minute, l'ordinateur aux places vides, plusieurs parties à la fois), `/api/empire/battle`, testés ; l'écran `empire/BattleStage.tsx` (présentation, salle, partie en direct et son chrono, classement, « Rejouer »), entrée par le volet Terraferme de la Compagnie ; parcours `e2e:battle`. **B3 fait le 9 novembre 2026** : la cote Elo à plusieurs (`battleRatings`, `battleBand` au moteur, réglages `skirmish.rating` : départ 1 000, K 32, bande de 300, l'ordinateur fixé à 1 000), en base (`battle_ratings`), les salles formées par bande de cote, la cote et son mouvement sur la carte de la Bataille, le classement public (`/api/empire/battle/ranking`). **B4 fait le 9 novembre 2026** : l'invité joue sans compte (cookie `fondaco_guest`, son identifiant dérivé du jeton et jamais montré, un nom vénitien tiré au sort), sa cote d'essai gardée en mémoire et reprise par le compte qu'il crée depuis le même navigateur ; les salles privées (`/api/empire/battle/room`, code de six lettres, lien `/bataille/CODE`, lancées par l'hôte, l'ordinateur aux places vides, non classées, fermées au bout de 20 minutes) ; la page `/bataille`, jouable sans compte, et son lien sur l'accueil ; testés au serveur et au parcours `e2e:battle`. **B5 fait le 9 novembre 2026** : la première Bataille classée du jour rapporte sa Gloire (45/30/20/10 selon le rang parmi les marchands, le barème des escarmouches) au théâtre de la semaine de chacun (commande `battleGlory`, `payBattle` au moteur, testés), affichée à la fin ; 6 % de la Gloire d'un régulier en médiane, plafond 8,6 % (`battle-glory`, docs/calibration.md). **Le lot T6b est fait.** | `pnpm test`, `e2e:battle`, `battle-glory` |
| A | **Les corrections urgentes de l'audit du 8 novembre** (`docs/audit-terraferme-2026-11-08/02-expert-ux-ui.md`, P0) : textes au « tu » et « troupes » partout (le test du glossaire lit aussi `fr.game.terra`) ; le voisin accessible (« Voir Contarini » à côté d'« Attaquer », les noms des camps touchables, les voisins listés sous Alliés) ; une promesse juste du front (« environ » N cases, jamais plus que le rival n'en tient, les troupes qui reviennent, la durée de la marche, la défense à zéro et la capitale perdue en rouge, `porcellana/terra/play.ts` testé) ; une pilule d'encre à chaque ordre accepté (l'`act` de l'empire dit s'il a été pris) ; des cibles de 44 px. **Fait le 8 novembre 2026** | `pnpm test` |
| B | **Entrer à la Terraferme** (décision du porteur du 8 novembre 2026) : le Campo de la carte ouvre la scène plein écran de la Terraferme (`empire/TerraStage.tsx`, « ‹ Carte »), plus le bouton « Entrer à la Terraferme » du volet Compagnie. Les tuiles de la carte se retournent en vague depuis le Campo, la Terraferme sur leur dos (les cases autour du camp, dans l'émail du plateau), la caméra recule ; le plateau de la Terraferme suit ce recul sur le camp, à la même échelle, puis recule sur toute la Vénétie et redescend sur les terres du joueur ; « ‹ Carte » joue le tout à l'envers (sur téléphone, la carte, libérée pendant la scène, revient avec son arrivée). Courbes et couleurs dans `porcellana/flip.ts` (testé), réglages `FLIP` dans `tokens.ts`, une seule horloge (`flipNow`) pour la carte, le plateau et le fondu ; `?lenteur=N` la ralentit pour la regarder ; sans WebGL ou avec moins de mouvement demandé, un fondu. Parcours `pnpm --filter @comptoirs/web e2e:terra` (après le build ; `SLOW=20` pour la filmer sur un rendu logiciel). **Fait le 8 novembre 2026.** Reste : la mesure de fluidité sur un vrai téléphone (impossible sur le rendu logiciel du conteneur) | `pnpm test`, `e2e:terra` |

## 6. Budget

- Cible : 60 images par seconde sur un téléphone moyen avec 800 cases et 40 marchands. L'émail ne se recalcule que pendant une coulée (au plus quelques cases à la fois) ; le reste du temps, la texture ne bouge pas.
- Rien ne bouge sans raison : seuls les fronts actifs (chevrons), les coulées, l'anneau des recrues et les drapeaux. `prefers-reduced-motion` coupe la vague, les chevrons et la coulée (la case change d'émail d'un coup).

## 7. Questions au porteur

1. **Le bourg** : le moteur le garde en option (`borgo`), le plan Terraferme du 18 octobre l'avait retiré. On le montre ou non ?
2. **« Encres »** pour les voisins : d'accord, ou faut-il une teinte par voisin direct au zoom rapproché ?
3. **Les riches** : au simulateur, un marchand qui met 2 000 d par jour dans la guerre est Signore à chaque graine, avec ou sans la vente de troupes (forts et maximum relevé suffisent). Faut-il un plafond de dépense par semaine, ou est-ce voulu ?
