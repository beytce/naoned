# Proposition : les quatre familles et la Campagne de Terraferme

> **Statut : validée par le porteur et livrée le 13 octobre 2026.** Elle remplace les guildes, les carats, les votes de guilde, les concessions et les guerres de concessions. Règles en vigueur : `docs/CADRAGE.md`, section « Les quatre familles et la Campagne de Terraferme » ; réglages : `docs/calibration.md`.
>
> Réponses du porteur : la conquête asynchrone convient ; on garde tout le catalogue de décrets ; Milan qui frappe le favori plutôt qu'une *contumacia* ; pas de Pass pour le capitaine, et le Pass est hors sujet (il sera entièrement revu).
>
> Écarts à la livraison : la carte compte 25 terres (5 × 5, fiefs aux coins, Milan en croix au milieu avec cinq forteresses, les six villes du jeu entre les deux) au lieu d'environ 32 ; les fiefs sont Piove di Sacco (Contarini), Feltre (Morosini), Rovigo (Mocenigo) et Udine (Dandolo) ; la Gloire est comptée par le tick à chaque événement (arrivée, chevauchée), au lieu d'un calcul paresseux à la lecture.

13 octobre 2026.

## Ce que demande le porteur

- Pas de guildes. Quatre grandes familles s'affrontent ; chaque joueur en choisit une.
- On investit dans sa famille **avec des ducats seulement** : pas de commande ni de livraison à faire pour elle.
- Un affrontement **chaque semaine**, en **continu** (PvE ou PvP) : il faut participer tout au long de la semaine, pas seulement le dimanche soir.
- La famille gagnante impose des **lois et décrets** qui pèsent sur le marché et sur le jeu, en sa faveur, pendant la semaine suivante.
- Ce doit devenir le cœur multijoueur du jeu.

## Le système retenu : une conquête territoriale asynchrone, « OpenFront au rythme d'un jeu mobile »

Chaque semaine, les quatre familles se disputent une carte de la **Terraferme**, tenue au départ par des milices locales et par Milan (le PvE), puis disputée entre familles dès que leurs territoires se touchent (le PvP). Les joueurs y engagent des **lances** (les compagnies des *condottieri*, payées en ducats, comme Venise faisait réellement la guerre en 1450, en pleine guerre contre les Sforza). Chaque terre tenue rapporte de la **Gloire** heure après heure ; la famille qui en a le plus à la fin de la semaine impose ses décrets.

### Pourquoi ce choix

| Option | Pour | Contre | Verdict |
| --- | --- | --- | --- |
| PvE seul : une course de contributions contre un ennemi commun | Simple, pas de frustration | Aucune interaction entre familles : c'est l'ancien mécénat sous un autre nom ; le plus riche gagne | Écarté seul, gardé comme ouverture de la semaine |
| PvP en temps réel façon OpenFront | Spectaculaire, très social | Une partie OpenFront dure 20 minutes de clics continus ; nos sessions durent 3 à 5 minutes sur mobile, les joueurs sont répartis sur la journée, et il n'y a pas d'attaque la nuit | Écarté |
| **Conquête asynchrone : carte, territoires contigus, marches de quelques dizaines de minutes, PvE puis PvP** | Garde ce qui fait OpenFront (s'étendre en terre neutre, frontières, attaquer là où l'adversaire est mince, se voir sur la carte) au rythme de nos sessions ; chaque visite compte | Plus de règles, un moteur de résolution des marches | **Retenu** |

Ce qui oblige à jouer toute la semaine, et pas seulement à payer :

1. **La Gloire s'accumule à l'heure** : tenir une terre lundi rapporte autant que la tenir dimanche.
2. **Les lances partent au bout de 48 h** (la *condotta* expire) : une terre gardée s'amincit d'elle-même si personne ne la renforce.
3. **La levée gratuite** se ramasse en venant : un joueur assidu qui ne dépense rien reste utile à sa famille, et un riche occasionnel ne peut pas tout acheter.
4. **L'achat de lances est plafonné par jour** et de plus en plus cher : l'argent amplifie l'activité, il ne la remplace pas.
5. **Les attaques arrivent en différé** et se voient venir : on défend en revenant au bon moment (notification).

## Les familles

Les quatre familles de l'ancien plan, réduites à leur nom, leurs couleurs et leur fief de départ : plus de domaine de marchandises, plus de commande de famille, plus de mécénat.

| Famille | Fief de départ (coin de la carte) | Blason |
| --- | --- | --- |
| Contarini | Padouan (sud) | à définir avec `docs/design.md` |
| Morosini | Trévisan (nord-est) | |
| Mocenigo | Polésine et Chioggia (sud-est) | |
| Dandolo | Frioul (est) | |

| Règle | Détail |
| --- | --- |
| **Allégeance** | Dès le jour 2 (`families.openDay`), une fois pour la saison. Le choix montre les membres actifs de chaque famille et met en avant la plus petite |
| **Équilibre des tailles** | Les membres d'une famille plus petite que la moyenne reçoivent une levée gratuite plus forte (jusqu'à +50 %), affichée au choix ; une famille plus grande, moins forte (jusqu'à −25 %). Les maisons PNJ rejoignent la famille qui compte le moins de joueurs réels |
| **Fil de famille** | Le fil de guilde actuel devient le fil de famille (mêmes limites, même modération) : c'est là que se coordonnent les assauts |
| **Capitaine** | Le membre au plus fort Mérite de la semaine (voir plus bas) est affiché comme Capitaine de la famille |

## La Campagne de la semaine

### La carte

- Environ **32 terres** reliées par des frontières (un graphe, dessiné en carte stylisée comme les Routes 3D) : villages (Gloire 1 par heure), bourgs (2), les sept villes du jeu (3), et à l'ouest les **forteresses de Milan** (Brescia, Bergame, Crema : 4).
- Chaque terre a une **défense** : plaine ×1,0, colline ×1,2, ville fortifiée ×1,5, forteresse ×2.
- Carte symétrique pour l'équité (chaque fief est à la même distance des villes et de Milan), habillée de noms réels.
- **Remise à zéro chaque lundi à 0 h** (mêmes bornes de semaine que le classement hebdomadaire) : chaque famille ne garde que son fief, imprenable ; tout le reste revient aux milices et à Milan.

### Les lances

| Règle | Détail (à calibrer au simulateur, dans `worlds.settings.campaign`) |
| --- | --- |
| **Levée gratuite** | 2 lances par heure entre 8 h et 22 h, 24 en attente au plus : à ramasser en venant (deux ou trois visites par jour suffisent pour tout prendre) |
| **Engagement payant** | Jusqu'à 40 lances par jour : les 20 premières à 1 d, les 20 suivantes à 2 d (60 d par jour au plus, environ un tiers de ce que rapportent les livraisons d'un joueur actif). Les ducats sont **détruits** : c'est un puits |
| **Condotta** | Chaque lance part 48 h après avoir été levée ou engagée, où qu'elle soit. Pas de renouvellement : il faut en lever d'autres |
| **Réserve** | Les lances non engagées attendent au fief du joueur |

### Marcher, attaquer, tenir

| Règle | Détail |
| --- | --- |
| **Marche** | Un joueur envoie des lances de sa réserve vers une terre voisine du territoire de sa famille (la contiguïté, comme OpenFront). Durée : 20 min, +10 min par terre traversée depuis le fief (les fronts lointains sont plus lents à soutenir) |
| **Renforcer** | Même geste vers une terre de sa famille : les lances y tiennent garnison, au nom du joueur, jusqu'à leur départ |
| **Assaut commun** | Une marche ouvre un assaut ; jusqu'à son arrivée, les membres de la famille peuvent y joindre leurs lances (bouton « Se joindre à l'assaut », fil de famille) |
| **Combat** | Déterministe et lisible : l'attaque *A* contre la garnison *G* × la défense de la terre. Si *A* > *G* × défense, la terre est prise et il reste *A* − *G* × défense lances en garnison ; sinon l'attaque est perdue et la garnison perd *A* ÷ défense lances. Les pertes se répartissent au prorata des joueurs engagés |
| **Visible** | Les marches en cours se voient sur la carte, avec leur force et leur heure d'arrivée (comme dans OpenFront) : on voit venir l'attaque et on peut renforcer |
| **Trêve de nuit** | Aucune arrivée entre 22 h et 8 h (heure de Paris), comme les brigands : une marche lancée le soir arrive à 8 h. La nuit ne compte pas pour la Gloire |
| **Terre vide** | Une terre dont la garnison est partie reste à sa famille, mais une seule lance la prend |

### Le PvE : milices et Milan

- **Les milices** tiennent les terres neutres avec une garnison qui croît avec le nombre de marchands actifs : la semaine s'ouvre sur une course à l'expansion, sans affrontement direct.
- **Milan** tient ses forteresses avec une forte garnison qui se reforme chaque nuit, et lance toutes les 4 heures (de jour) une **chevauchée** contre la famille qui mène en Gloire, plus forte quand son avance grandit. C'est le frein au favori : le PvE frappe toujours le premier.
- Les terres prises à Milan rapportent le plus de Gloire : c'est l'objectif commun, que les familles se disputent ensuite.

### Gloire, victoire, Mérite

| Règle | Détail |
| --- | --- |
| **Gloire de famille** | Somme, heure par heure entre 8 h et 22 h, de la valeur des terres tenues. Calculée paresseusement à chaque changement de main (heure de prise mémorisée), comme la production |
| **Victoire** | À la fin de la semaine, la famille qui a le plus de Gloire impose ses décrets pour la semaine suivante. La dernière semaine de la saison ne donne pas de décrets : elle donne le monument sur la carte et le titre de famille de la saison |
| **Mérite** | Personnel : lances engagées dans une bataille gagnée (attaque ou défense) et lances tenues en garnison (1 point par 10 lances et par heure). Sert au vote du programme, au titre de Capitaine et à une petite Renommée de fin de saison. Jamais de ducats |
| **Hors patrimoine** | Ni lances, ni Gloire, ni Mérite ne comptent au patrimoine. Engager des lances fait baisser son patrimoine : c'est un pari sur les décrets |

## Lois et décrets

### Le programme

Pendant la semaine, chaque famille vote son **programme** : les deux décrets qu'elle imposera si elle gagne. Vote pondéré par le Mérite de la semaine, aucun membre au-delà de 25 % des voix ; le programme de chaque famille est **public**. Les autres familles savent donc ce qui les attend (« si les Dandolo gagnent, gabelle sur le pain ») : c'est une raison de plus de les arrêter.

À la clôture, le programme de la gagnante entre en vigueur pour la semaine suivante. Une famille ne peut pas imposer le même décret deux semaines de suite.

### Le catalogue (bornes à calibrer, dans `worlds.settings.decrees`)

| Décret | Effet pour la semaine | Monnaie |
| --- | --- | --- |
| **Privilège du Fondaco** | Membres : taxe du Rialto de 3 % à 1 %, quotas de la Dogana +50 % | Puits réduit |
| **Gabelle** sur un bien (choisi au vote) | Les non-membres qui vendent ce bien au Rialto paient 4 points de plus ; la recette est partagée entre les membres au prorata du Mérite, à la clôture | Transfert entre joueurs |
| **Faveur d'une ville** (choisie au vote) | Membres : livraisons à cette ville payées +10 % ; ses commandes urgentes leur sont réservées la première demi-heure | Création bornée |
| **Péage de Terraferme** | Les livraisons des non-membres vers les villes que la famille tenait à la clôture de la Campagne paient 3 % aux membres | Transfert entre joueurs |
| **Lettres de course** | Seuls les membres peuvent poster des bandes de brigands, et seulement contre les convois des autres familles (remplace `bandits.warOnly`) | Inchangé |
| **Tarif du Levant** | Membres : droits de port −50 % ; non-membres : +25 % | Puits accru |
| **Calmiere** sur un bien (choisi au vote) | Aucune offre de vente de ce bien au-dessus de 115 % de la référence au Rialto : la famille l'achète moins cher | Aucune |
| **Franchise** | Membres : entretien des bâtiments −20 % | Puits réduit |

Garde-fous : l'effet cumulé de deux décrets doit rester sous un plafond mesuré au simulateur (cible : +5 à +8 % du revenu de la semaine d'un membre actif) ; le Péage de Terraferme est le seul lien entre la carte de la Campagne et l'économie, pour que tenir des villes compte.

## Économie et règles non négociables

- **Aucune nouvelle source de monnaie** sinon la Faveur d'une ville, bornée. Les lances sont un puits (environ 0 à 60 d par jour et par joueur) ; gabelle et péage passent par un compte de séquestre de la famille dans le grand livre (`family:<code>`), vidé à la clôture.
- Tous les réglages dans `worlds.settings` (`families`, `campaign`, `decrees`) ; validation par `pnpm sim` sur toutes les graines et `--pass 0.2`, documentée dans `docs/calibration.md`.
- **Pass Négociant** : aucun avantage de famille ni de Campagne (ni lance, ni levée, ni Mérite, ni voix). Option à trancher : le Capitaine de chaque famille gagne 7 jours de Pass, comme le top 10 de la semaine.
- **Logique dans `packages/engine`** : carte, levée, marches, combat, Gloire, Milan, décrets, en fonctions pures testées avec la fixture figée ; le tick résout les marches arrivées et la clôture de la semaine.
- **Maisons PNJ** : elles rejoignent la plus petite famille, ramassent leur levée à chaque session, engagent des lances selon leur trésorerie (les spéculateurs plus, les occasionnels moins), renforcent les terres menacées et attaquent la terre voisine la plus faible ; elles votent le programme selon leur profil.

## Ce qui disparaît

Guildes, carats, trésors et votes de guilde, concessions, guerres de concessions, fournisseurs, « Demandes de guerre » au Marché, onglet Guilde (remplacé par l'onglet Famille). Le brigandage n'existe plus qu'avec les Lettres de course. Le Rialto nécessaire (prix des villes qui suit le marché) reste. L'Acte III (l'Arsenal) devient une semaine de Campagne où Milan est plus fort.

## Écrans

- **Onglet Famille** : choix de la famille (membres, bonus de levée), puis la carte de la Campagne en plein écran : terres aux couleurs des familles, marches en cours (flèches, force, minuteur), Gloire en direct des quatre familles, levée à ramasser, engager des lances, programme et vote, décrets en vigueur, Capitaine et Mérite, fil de famille.
- **Geste** : glisser de sa réserve vers une terre ouvre la marche (comme le véhicule glissé vers une ville).
- **Partout** : un bandeau « Décrets de la semaine » (Marché, Routes, Port) dit ce qui s'applique au joueur et pourquoi.
- **Notifications** : terre de garnison attaquée (avec l'heure d'arrivée, jamais regroupée), terre prise ou perdue, levée pleine, résultat de la semaine et décrets.

## Livraison proposée (après validation)

1. Moteur, tests d'abord : familles et allégeance, carte et contiguïté, levée et engagement, marches et combat, Milan, Gloire, programme et décrets, clôture hebdomadaire. Retrait des guildes, concessions et guerres.
2. Maisons PNJ.
3. Simulateur : Gloire et victoires par famille, puits des lances, effet des décrets, écart au `--pass 0.2` ; réglage de Venise et `docs/calibration.md`.
4. Serveur : schéma (familles, campagne, marches, décrets ; suppression des tables de guilde par migration), actions, vue, fil de famille, notifications.
5. Interface : onglet Famille et carte, bandeau des décrets.
6. Docs : `docs/CADRAGE.md`, `docs/design.md`, `IDEAS.md` (alliances entre familles, trahison, Capitaine qui choisit seul les décrets).

## Questions au porteur

1. La conquête asynchrone (marches de 20 à 60 minutes, trêve la nuit) vous convient-elle, plutôt qu'un temps réel plus nerveux ?
2. Le catalogue de décrets : lesquels garder, lesquels ajouter ?
3. Milan qui frappe toujours le favori : bon frein, ou préférez-vous une *contumacia* (Gloire réduite pour la famille au pouvoir) ?
4. Le Capitaine de chaque famille gagne-t-il 7 jours de Pass ?
