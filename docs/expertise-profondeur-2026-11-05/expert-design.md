# Revue d'expert : le plan de la profondeur du 5 novembre 2026

*Revue critique de `docs/plan-profondeur-2026-11-05.md` (version 2, validée par le porteur, pas encore codée), par un game designer senior (jeux de gestion et de logistique, midcore mobile à sessions courtes). Lu aussi : `docs/CADRAGE-v3.md`, `docs/audit-gameplay-2026-11-05.md`, `docs/plan-porta.md`, la fin de `docs/calibration.md`, le moteur (`packages/engine/src/empire/` : `workshops.ts`, `orders.ts`, `stores.ts`, `moves.ts`, `porta/`) et `packages/engine/src/themes/venice1450.empire.ts`. Aucun autre fichier n'est modifié.*

## 0. Le verdict en une page

Le plan pose le **bon diagnostic d'intention** (« pas de décision ») et a de **très bonnes idées locales** : la question du joueur à la fin de chaque section, la tournée qui charge et décharge, la ville qui commande ce qu'on ne produit pas, la reconnaissance avant la Porta. Mais il a trois défauts de structure :

1. **Il soigne les symptômes de la surproduction au lieu de sa cause.** La cause est arithmétique et se lit dans le moteur. Un lot d'atelier croît en Y(n) = n × (1 + 0,15 (n − 1)), soit × 23,5 au niveau 10. Une commande, elle, vaut un lot fixe d'environ 400 ducats × le palier de la marchandise (`orders.lotDucats`, `tierTimes`). Une capitale en garde 4 au plus, une toutes les 128 min (`orders.cap`, `everyMinutes`). Et la ville ne demande que ce que la Maison sait faire (`orderGoodsOf`, `madeWeight` = 3). Une argilière de niveau 10 sort 188 argiles par lot de 30 min ; une commande d'argile en vaut ~133 (400 d ÷ 3 d). **Un seul atelier moyen couvre une commande toutes les 20 minutes, quand la plus grande ville en émet une toutes les deux heures.** Un plafond de magasin, des vivres, des outils et des denrées qui pourrissent ne changent pas ce rapport : ils détruisent le surplus en ajoutant des corvées.
2. **Il additionne au lieu d'absorber.** Je compte une quinzaine de mécaniques nouvelles : magasin, encombrement, brader et jeter, périssables, salaison, gisements, prospection, équipes, vivres, population, table, artisans, chaînes longues, sous-produits, qualité propagée, terroir, nuisances, outils et forge, goûts, échéances, contrats, tournée chargée, encombrement en soute, terrain des routes. Côté Porta : dégâts, protections, quatre combattants, places d'équipage, équipement typé, charge, synergies, terrain. Le tableau d'absorption du § 2.8 est en partie cosmétique (voir § 2.6 de cette revue). C'est l'inverse de « une douzaine de systèmes visibles ».
3. **Il réintroduit de la punition de l'absence par quatre canaux à la fois** : la table qui se vide, les vivres du camp, les outils qui s'usent, les périssables. S'y ajoute le magasin plein qui arrête les ateliers. Pris un à un, chacun est défendable. Ensemble, sur un jeu à sessions de quelques minutes (règle d'or 7), ils font une **taxe de connexion** à la FarmVille, pas de la profondeur à la Anno.

Ma recommandation est de **garder un tiers du plan, d'en fusionner un tiers, d'en reporter un tiers**. Il faut commencer par ce qui coûte le moins et crée le plus de décisions : la demande qui ne suit plus l'offre et qui grandit avec la Maison, des commandes à accepter, la tournée chargée, puis la refonte des contres de la Porta. Viennent ensuite le magasin simplifié, et seulement après les chaînes et l'extraction, simplifiées. Population, table, nuisances, outils consommables et périssables vont dans `IDEAS.md` jusqu'à preuve du contraire. Et **le simulateur doit redevenir obligatoire pour les lots qui touchent l'économie** : c'est un monde persistant, sans remise à zéro, et la fin de partie est déjà hors cible (29 à 46 jours de revenu par palier, `calibration.md`, 5 novembre).

## 1. Les forces du plan

- **La forme « La question du joueur »** à la fin de chaque section (§§ 2.1 à 2.6, 3.4) est exactement la bonne discipline. Une mécanique qui ne produit pas de question à la première personne ne mérite pas d'exister. Je l'appliquerai ci-dessous pour juger chaque idée.
- **Le § 3.1 est une vraie autocritique.** Retirer la ville rassasiée (« la réponse est toujours tourner d'une ville à l'autre ») et les péages (« un chiffre de plus, pas un choix visible ») est juste, et argumenté comme il faut.
- **Le principe du § 3.1 : « il y a toujours plus de commandes que de quoi les servir »** est la phrase la plus importante du plan. Tout jeu de logistique qui fait réfléchir repose sur une rareté de *capacité* (temps, soute, véhicules), pas de *matière*. C'est la leçon de Hades' Star : on ne livre jamais toutes les cargaisons, on choisit lesquelles empiler.
- **Les goûts des villes (§ 3.2, 1)** cassent `madeWeight`, qui est la cause n° 1 de « on peut faire toutes les commandes ». C'est une modification de `orders.ts` de quelques dizaines de lignes, à fort effet.
- **La tournée qui charge et décharge (§ 3.2, 4)** transforme un aller-retour en problème de tournée de véhicules (*VRP* léger) : la famille de problèmes qui fait vivre les forums de Transport Tycoon et d'OpenTTD. Le moteur a déjà les arrêts enchaînés (`moveVehicle`, `maxStops` = 15).
- **La reconnaissance avant d'entrer (§ 4.2)** est la bonne réponse à « la Porta se joue à l'aveugle ».
- **Le terrain des véhicules (§ 3.2, 6)** existe déjà en germe : les véhicules ont des `regions` dans les réglages.
- **L'ouverture par palier de Casa (§ 2.8)** : une contrainte à la fois, c'est la bonne pédagogie (Against the Storm ouvre ses mécaniques de cette façon).
- **Les « Ce qu'on voit »** sont concrets et jouables : la caisse qui déborde, l'auréole de fraîcheur, la frise de la tournée avec sa soute en grille, la figurine qui s'habille. La règle d'or 8 est prise au sérieux.

## 2. Les failles de design

### 2.1 Des boucles qui ne créent pas de vraie décision

| § | Mécanique | Pourquoi ce n'est pas une décision |
| --- | --- | --- |
| 2.1 | Jeter ou brader | Brader rapporte « un faible prix mais pas rien » : brader domine toujours jeter, sauf quand la profondeur du jour de la Dogana (`sellToDogana`, bornée) est épuisée. Le plouf dans la lagune est un bon geste, mais pas une décision. |
| 2.1 | Le magasin plein arrête les ateliers | Le joueur ne choisit rien : il subit. La décision réelle (« que garder ») ne se pose qu'au moment où il revient, et la réponse optimale est mécanique : garder ce qui a le plus de valeur par place pour les commandes ouvertes. Une ligne de tri, pas une question. |
| 2.3 | La table | Si une table variée « accélère et attire », le joueur la remplit toujours au maximum : c'est un coût d'entretien, pas un arbitrage. Si elle coûte plus qu'elle ne rapporte, il la laisse au pain. Dans les deux cas, réglé en une semaine. |
| 2.7 | Les outils | Un atelier sans outils ralentit, donc on en a toujours. L'usure est un impôt en fer et en charbon, pas une décision. La seule décision, « acier ou fer », est un calcul de coût par heure. |
| 2.2 | Les vivres du camp | Même chose que la table : on en laisse assez pour l'absence la plus longue. C'est de l'anxiété, pas de la stratégie. |
| 3.2, 2 | L'échéance seule | Sans engagement préalable, le sablier ne fait que trier par urgence : le joueur prend le meilleur ducat par place et par minute. C'est un tri glouton, que la communauté publiera dès la première semaine. |
| 4.3 | L'aperçu vert, ambre, rouge | **Il résout le problème à la place du joueur.** Si l'écran dit « rouge » à chaque garnison, le joueur change de pièce jusqu'à ce que tout soit vert. C'est l'opposé de « une vraie réflexion » (§ 0, la demande du porteur). |

### 2.2 Les stratégies dominantes qu'un min-maxer trouvera en une semaine

1. **Le luxe léger écrase le lourd (§§ 2.1 et 3.2, 5).** Si la soie, les épices et le verre prennent une demi-place et le marbre trois, les marchandises fines rapportent six fois plus par place de soute et de magasin, à paie égale par lot. Personne ne touchera au marbre hors des matériaux de la Casa. *Parade* : la paie d'une commande doit être calée **par place**, et pas seulement par lot (`orders.payPerPlaceBps` par classe d'encombrement), ou les marchandises lourdes doivent être les seules à ouvrir certains contrats.
2. **L'entrepôt contre l'atelier (§ 2.1).** C'est un calcul de ducats par case, fait une fois pour toutes. Il n'y a pas de tension s'il n'y a pas d'autre usage des cases que le joueur valorise différemment selon son style.
3. **L'extraction se résout à la marge égale (§ 2.2).** Avec des retours décroissants par gisement, l'optimum est connu : répartir les ouvriers pour égaliser le rendement marginal, puis changer de gisement quand la richesse tombe sous un seuil. Une feuille de calcul de 10 lignes. Le « 8 ouvriers, proche ou lointain » du § 2.2 a une réponse unique dès qu'on connaît les courbes, et elles seront connues.
4. **L'échéance plus le trop-plein de commandes (§ 3.2, 2).** On ignore les bourgs, on sert les capitales au meilleur ducat par place et par minute. C'est la stratégie de toutes les maisons au bout de deux semaines, sauf si les petites villes ont un rôle propre (la matière locale à bon prix pour le retour chargé, § 3.2, 4 : c'est la bonne parade, à renforcer).
5. **La qualité (§ 2.5).** Si l'exquis paie deux à trois fois plus et que les intrants de substitution sont un coût fixe (la soude d'Alexandrie), on calcule le seuil de rentabilité une fois. La décision « je garde le marbre blanc ou je le vends en blocs » est bonne seulement si la commande exquise est **rare et incertaine** : il faut un élément de pari, sinon c'est du tri.
6. **Le plan du domaine (§ 2.6).** Un puzzle d'implantation statique a **une** solution par configuration de terroir. Les joueurs d'Anno copient les plans du wiki. S'il n'y a que quelques configurations de domaine, la solution circule en trois jours. La profondeur est réelle la première fois, nulle la dixième.
7. **La Porta (§ 4.3).** C'est le cas le plus grave : voir la partie 5.
   - *La poudre n'a aucune résistance* dans la table : elle est forte contre les plates et le pavois et faible contre rien.
   - *Le tranchant n'a aucune cible* : il est résisté par la maille et les plates, et bon contre rien.
   - *Le feu n'a ni arme d'équipage ni protection* qui lui réponde.

   Le méta probable : artilleur et piquier, ou arbalétriers mercenaires partout. Les arbalètes touchent **chaque** ennemi à portée (`crossbows` dans les réglages), elles sont fortes contre le cheval et contre les unités sans protection, qui sont la majorité de Rome.

### 2.3 Des mécaniques qui se recouvrent

- **L'encombrement au magasin (§ 2.1), l'encombrement en soute (§ 3.2, 5) et le plafond de soute actuel.** Aujourd'hui, une commande prend **une place** de soute, quelle que soit la marchandise (`holdPlacesOf`, mule = 2 places, burchio = 6). Le plan ajoute un encombrement par marchandise sans dire ce qu'il devient dans ce modèle de places par lot. Avec un marbre à 3 places, **une mule (2 places) ne peut plus porter une seule commande de marbre**. Il faut décider : une place par lot pondérée par la classe, ou des lots plus petits pour les marchandises lourdes.
- **La table (§ 2.3), les vivres (§ 2.2), le pain d'entrée de la Porta (`breadPerVehicle`) et le pain qui se gâte (CADRAGE § 5.3).** Ce sont quatre puits de nourriture, avec quatre jauges et quatre façons de manquer. Une seule « réserve de vivres » de la Maison devrait les servir tous.
- **Les artisans (§ 2.3), les maîtres (CADRAGE § 3 quinquies), la qualité (§ 2.5) et le module `master`.** Ce sont quatre leviers de la même qualité. Le plan dit que les artisans absorbent le personnel, mais le personnel est aujourd'hui une **collection de héros à niveaux et compétences** (`staff.ts`, `chooseSkill`), un ressort de rétention que des ouvriers anonymes ne remplacent pas.
- **Les outils (§ 2.7) et les modules d'atelier.** Le plan les fusionne, bien. Mais il transforme une amélioration permanente (le module recherché puis monté) en consommable : c'est une régression vers la corvée. Il casse aussi le lien avec la règle d'or 5 (les hauts niveaux demandent des plans, qui viennent de la Porta).
- **Le voisinage (déjà là : `neighbourBonus`, l'anneau d'orbite et `swapWorkshops`, gratuit et instantané) et le plan du domaine (§ 2.6).** Le plan les fusionne, bien. Mais « déplacer coûte un chantier » transforme un puzzle qu'on explore librement en décision irréversible : on la prendra une fois, d'après le wiki.
- **Les contrats de ville (§ 3.2, 3) et la Casa, qui demande déjà des matériaux d'autres régions (CADRAGE § 3.1).** Ce sont deux « grands chantiers ». Les contrats doivent avoir une autre saveur : collective, ou datée.

### 2.4 Le coût cognitif sur mobile

- **Le domaine du § 2** cumule des personnages qui marchent, des postes en silhouettes, des assiettes, des cruches, des râteliers, des charrettes de flux, des cours encombrées, des rivières teintées et des panaches de fumée. C'est un écran de PC. Sur un téléphone de 6 pouces, à 30 secondes par session, c'est illisible. Et la règle d'or 8 n'est pas tenue par le nombre de pictos, mais par **une image qui dit l'état en un coup d'œil**.
- **La Porta à 2, 3 puis 4 combattants plus un transport (§ 4.4)**, pilotés au toucher (« un véhicule, puis sa destination ») en 10 minutes, avec un bouton par composant actif. Cela fait 5 unités et jusqu'à 10 boutons de recharge par joueur. Hades' Star a délibérément gardé **un cuirassé et un transport par joueur** pour cette raison. À quatre joueurs, cela ferait 20 unités alliées à l'écran.
- **Les synergies de position (§ 4.4 : « un piquier à côté de l'artilleur », « l'étendard si l'équipage reste groupé ») et le flanc du pavois (§ 4.5)** demandent un placement fin. Ce n'est jouable au doigt qu'avec des **ordres de formation** (« suivre », « couvrir »), absents du plan.

### 2.5 Le risque tableur

Le plan le nomme (§ 2.8) mais le sous-estime. Le vrai risque n'est pas qu'il y ait des chiffres. C'est que **les décisions se calculent mieux hors du jeu que dedans**. Les chaînes à sous-produits (§ 2.4), les rendements décroissants (§ 2.2), la qualité propagée (§ 2.5) et la table (§ 2.3) sont exactement le contenu des calculateurs d'Anno et de Factorio. Ce n'est pas mauvais en soi : ces calculateurs **font** vivre les communautés. Mais alors le jeu doit montrer ces flux mieux que le tableur. La « vue des flux » du § 2.4 (un toucher sur une marchandise trace son chemin, et les goulots rougissent) est la seule pièce du plan qui vise cela. Elle devrait être **le cœur du lot 6**, pas un détail.

### 2.6 Les corvées et la punition de l'absence

Les règles d'or 3 et 4 ont été retirées le 5 novembre. Cela permet de faire coûter l'absence, **cela ne l'oblige pas**. Les jeux midcore à sessions courtes qui durent (Hades' Star, Clash of Clans, Marvel Snap) ont tous la même règle implicite : **l'absence plafonne le gain, elle ne détruit pas l'acquis**. Le plan détruit l'acquis par quatre canaux :

| Canal | § | Ce que l'absence fait perdre |
| --- | --- | --- |
| Magasin plein | 2.1 | La production de la nuit (les ateliers s'arrêtent) : c'est un plafond, acceptable |
| Périssables | 2.1 | Du stock déjà gagné : c'est une destruction |
| Table vide | 2.3 | La cadence de **tout** le domaine, et des ouvriers |
| Vivres du camp | 2.2 | L'équipe rentre, le camp s'arrête |
| Outils usés | 2.7 | La cadence des ateliers |

Le magasin plein suffit à faire de l'absence un coût : c'est le plafond que le CADRAGE avait déjà prévu (§ 5.3). Les quatre autres en font une punition. Pour un public de 25 à 55 ans sur mobile, la punition de l'absence est la cause n° 1 d'abandon après le premier mois. Le plan le reconnaît lui-même au § 6, question 2 : « c'est aussi celui où l'absence coûte le plus ». La réponse validée (« les ouvriers nourris ») prend le risque sans parade.

Le tableau d'absorption du § 2.8 est en partie cosmétique :
- « Le magasin absorbe la file de nuit » : faux. La file existe toujours (`queueHours` = 12) et le magasin s'y ajoute. Une vraie absorption serait : **plus de file, l'atelier remplit son quai jusqu'au plafond** (voir la proposition 2).
- « Les bras absorbent le personnel » : non, ils remplacent une collection par une population. Ce n'est pas le même système et le ressort n'est pas le même.
- « Le plan du domaine absorbe le voisinage » : oui.
- « Les goûts absorbent `madeWeight` » : oui.
- « Les outils absorbent les modules » : oui, mais avec une régression (§ 2.3).

### 2.7 L'économie : sources, puits, inflation, rattrapage

- **Les nouveaux puits sont en marchandises, pas en ducats.** Vivres, outils, périssables, jets et sous-produits détruisent de la matière. Moins de matière vendue, c'est moins de ducats, donc une progression plus lente. Or la fin de partie est **déjà** trop lente : le palier le plus cher coûte 29 à 46 jours de revenu pour une cible de 2 à 7 (`calibration.md`, « Une trentaine de villes », lecture : « les grandes Maisons manquent de commandes »). Le plan ne dit rien de cette cible.
- **Le lot 2 avant les lots 4 à 7, c'est de l'inflation transitoire.** « Plus de commandes que de quoi les servir » appliqué alors que la production est encore surabondante, c'est simplement **plus de revenu** pendant des semaines, dans un monde sans remise à zéro. Ce revenu en trop restera dans les caisses. Il faut le compenser dans le lot 2 lui-même : moins de paie par commande, ou des lots plus gros.
- **Le rattrapage des nouveaux.**
  - Les goûts des villes (§ 3.2, 1) font qu'une Maison de Casa 1, avec argile, bois et planches, voit des villes qui demandent du drap fin. Il faut que **les bourgs voisins du départ demandent le brut du départ**, par construction.
  - Les vétérans ont des stocks au-delà du plafond, « laissés fondre » (§ 7). C'est juste, mais cela leur donne des semaines d'avance sur toutes les commandes lourdes. Mieux vaut convertir l'excédent en bon d'entrepôt (une place temporaire), qui expire.
  - Les gisements : sont-ils propres à chaque Maison ou partagés ? Le plan ne le dit pas. Partagés, la richesse qui baisse devient une **interaction entre joueurs** (premier arrivé, premier servi), ce qui touche la règle d'or 1 et avantage les anciens. Propres à chaque Maison, il faut les tirer par Maison, comme les reliques de la Porta (« chaque joueur a ses propres reliques »).
- **Le simulateur rendu facultatif (§ 0).** Je recommande fortement de revenir sur ce point pour les lots 2, 4, 5 et 6. Le seul garde-fou d'un monde persistant est la mesure. Une erreur de calibrage ne se corrige pas par une saison suivante. Le bot devra jouer les nouvelles décisions, et c'est justement un bon test : **si un bot glouton de 50 lignes joue presque aussi bien qu'un bot réfléchi, la mécanique ne crée pas de décision.** C'est le meilleur détecteur de stratégie dominante dont dispose le projet.

### 2.8 Les dépendances entre lots (le § 5 ne tient pas dans cet ordre)

- **Le lot 4 (extraction) dépend des lots 5, 6 et 7, placés après lui.** Une équipe demande des ouvriers « pris au domaine (§ 2.3) » (lot 5), des outils « fabriqués par la forge (§ 2.7) » (lot 7) et des vivres (pain, *poisson salé*, vin), dont la salaison est au lot 10.
- **Les lots 4 et 5 demandent des marchandises qui n'existent pas.** Le référentiel compte 14 recettes, chacune à une sortie et à deux entrées au plus. Il n'y a ni marbre ni fer comme produits d'atelier (le fer et le marbre n'existent que comme prix de région et matériaux de Casa), ni poisson, ni viande, ni outils. **La refonte du référentiel (lot 6) doit précéder l'extraction et la table**, ou être découpée.
- **Le lot 3 (encombrement en soute) dépend du lot 1 (encombrement au magasin)** : même table de classes. C'est bien ordonné, mais à faire en une seule fois.
- **Le lot 8 introduit cinq types de dégâts, mais seulement trois armes existent** (`lances`, `crossbows`, `culverin`) : choc, perçant et poudre. Le tranchant et le feu n'ont pas d'arme avant le lot 9. Au lot 8, la table est donc à moitié vide.
- **Le § 4.5 dit le terrain de bataille « gardé », mais il n'existe pas dans le moteur.** `porta/battle/` n'a ni forêt, ni colline, ni fleuve, ni gué. C'est un chantier neuf (carte, pathfinding, vision), pas un acquis.
- **Les « Ce qu'on voit » dépendent d'une refonte visuelle en cours (§ 7).** Chaque lot embarque des figurines 3D, des camps, des rivières et des panaches de fumée : le budget d'illustration est le vrai goulot. Il faut le chiffrer avant le go.
- **Le plan revient sur des décisions récentes sans le dire.** Le 1er novembre, le porteur a retiré les gisements et les expéditions (« un seul métier, livrer », CADRAGE § 3.3). Le § 2.2 les réintroduit. C'est légitime, mais il faut le dire, et dire ce qui a changé depuis.

## 3. L'ordre et le périmètre

### 3.1 Couper ou reporter (dans `IDEAS.md`)

| § | Quoi | Pourquoi |
| --- | --- | --- |
| 2.3 | La population nourrie et la table | Corvée et punition de l'absence, coût cognitif maximal, remplace une collection de héros qui marche. La remplacer par la proposition 5 (le banquet) |
| 2.6 | Les nuisances et la rivière orientée | Puzzle statique résolu au wiki, coût d'illustration élevé, domaine 2D à refaire |
| 2.7 | Les outils consommables et la forge | Corvée. Garder les modules, les **dessiner** comme des outils (le râtelier), et garder leurs plans (règle d'or 5) |
| 2.1 | Les périssables et la salaison | Une seule famille au plus : le pain, déjà prévu au CADRAGE § 5.3, qui sert aussi d'entrée de la Porta |
| 2.2 | La prospection et les vivres du camp | La prospection fait doublon avec le brouillard et les cases qu'on achète ; les vivres sont une corvée |
| 4.4 | La jauge de charge | Une quatrième contrainte sur un équipement déjà typé. La remplacer par des **classes de vitesse** fixes (proposition P3) |
| 4.4 | Quatre places d'équipage | Deux combattants et un transport au plus, par joueur |

### 3.2 Fusionner

- **L'encombrement au magasin et en soute** : une seule table, trois classes (lourd, courant, fin), et non des valeurs par marchandise. Lots 1 et 3 en une seule pièce de règle.
- **Les artisans, les maîtres et la qualité** : le maître (personnel existant) **est** l'artisan, il pose la qualité, et la qualité d'intrant la plafonne. Il n'y a pas de population.
- **Les contrats de ville et les foires du calendrier** (CADRAGE § 4.3) : les grands chantiers deviennent des événements **communs** à une bande (proposition 7).
- **Les vivres** : une seule réserve, le pain de la Maison, pour l'entrée de la Porta et les camps éventuels.

### 3.3 L'ordre que je propose : le plus de décisions au moindre coût

| Ordre | Contenu | § du plan | Taille | Simulateur |
| --- | --- | --- | --- | --- |
| A | **La demande à la mesure de la Maison** : goûts des villes, lots qui suivent la production (proposition 1), commandes à accepter avec sablier après l'acceptation (proposition 3), trop-plein de commandes. Tout dans `orders.ts` | 3.2, 1 et 2 | moyen | **oui** |
| B | **La tournée chargée** : la matière locale des villes, la soute en grille, l'encombrement en trois classes | 3.2, 4 et 5 | moyen (la tournée existe déjà : `driveRound`) | oui |
| C | **La Porta : la table des contres refaite et la reconnaissance partielle** | 4.2, 4.3 (révisés, voir la partie 5) | moyen | banc `porta-bench` |
| D | **Le magasin** : le quai de l'atelier remplace la file de nuit, plafond global, brader borné | 2.1 (simplifié) | moyen | oui |
| E | **Les contrats communs** | 3.2, 3 | petit à moyen | non (récompense bornée) |
| F | **Le référentiel** : chaînes à 2 ou 3 étages, un sous-produit par chaîne, la vue des flux | 2.4, 2.5 | gros | oui |
| G | **L'extraction simplifiée** : gisements par Maison, camps à trois tailles, tas à aller chercher | 2.2 (simplifié) | moyen | oui |
| H | **La Porta : les combattants, deux places d'équipage, les munitions** | 4.4 (révisé) | gros | banc |
| — | Le reste (table, nuisances, outils consommables, périssables, terrain de bataille) | | | `IDEAS.md`, à rouvrir sur les données |

Pourquoi A d'abord : c'est **le seul lot qui attaque la cause** (partie 0). Il ne touche que le moteur des commandes et les pastilles de ville. Et il rend la tournée (B) intéressante sans rien d'autre. Le magasin (D) ne vient qu'après : une fois la demande rééquilibrée, le surplus n'est plus le problème central, et le plafond peut être réglé large, comme un garde-fou.

## 4. Contre-propositions et propositions nouvelles

Chaque proposition dit la décision qu'elle crée, ce qu'on voit, et ses paramètres dans `worlds.settings` (noms indicatifs).

### Proposition 1 : la demande à la mesure de la Maison (contre la cause de la surproduction)

- **La règle.** La taille du lot d'une commande suit la production de la Maison pour cette marchandise : le lot vaut *k* heures de production de son meilleur atelier de la chaîne, et non 400 ducats fixes. Une ville **grandit** quand on la sert : sa prospérité monte d'un cran par commande livrée (plafond des commandes + 1, lots + 10 %) et redescend lentement si on la délaisse. On choisit ses villes et on les fait grandir.
- **La décision.** « Je concentre mes livraisons sur Vérone pour la faire monter à 5 commandes, ou j'entretiens trois villes moyennes ? » Une ville, c'est un **investissement**, pas un distributeur.
- **Ce qu'on voit.** La ville prend des maisons et des étals sur son quai à chaque cran. Sa couronne de prospérité (un anneau à crans autour de son astre) se remplit à la livraison.
- **Les paramètres.**
  - `orders.lotHoursOfOutput` (par exemple 2) ;
  - `orders.lotMinDucats`, `orders.lotMaxDucats` ;
  - `cities.prosperity.steps` (par exemple 5) ;
  - `cities.prosperity.capPerStep` (+1) ;
  - `cities.prosperity.lotBpsPerStep` (+1 000) ;
  - `cities.prosperity.decayPerDay` (−1 cran par 3 jours sans livraison, jamais sous la taille de départ : l'absence plafonne, elle ne détruit pas).

### Proposition 2 : le quai de l'atelier remplace la file de nuit (une vraie absorption)

- **La règle.** Plus de file de 12 h : un atelier remplit **son quai** (une pile par atelier, plafonnée à *n* lots) et s'arrête quand elle est pleine. Le magasin du fondaco reçoit ce qu'on récolte, sous son plafond global en places. Récolter devient un choix : *quoi* rapatrier au magasin plein, et quoi laisser sur le quai de l'atelier, où rien ne se perd, mais où l'atelier attend.
- **La décision.** « Je rentre les briques ou les planches ? Je laisse la verrerie pleine et arrêtée, parce que je n'ai pas de place pour son verre avant le passage de la charrette ? »
- **Ce qu'on voit.** Les caisses s'empilent sur la tuile de l'atelier jusqu'à déborder (la « caisse qui déborde » du § 2.1, enfin justifiée). On glisse le doigt d'un atelier au fondaco pour rentrer les caisses : c'est le geste de récolte déjà fait (`sweep`).
- **Les paramètres.**
  - `workshops.quayLots` (par exemple 8, + 1 tous les 5 niveaux) ;
  - `stores.capacityByLevel` ;
  - `stores.bulk` = { heavy: 3, normal: 2, fine: 1 } ;
  - `stores.warehousePlaces`.

  `queueHours` disparaît.

### Proposition 3 : les commandes qu'on accepte (le sablier sans punition de l'absence)

- **La règle.**
  - La ville affiche plus d'offres que le joueur ne peut en servir. Elles tournent toutes les *x* heures sans aucun coût.
  - Le joueur **accepte** une offre : elle passe au carnet, et son sablier part alors. Une commande acceptée et livrée à temps paie plein, avec une prime de parole tenue.
  - En retard, elle paie moins et fait perdre un cran de réputation dans cette ville (proposition 1).
  - Un nombre limité d'acceptations simultanées (le carnet a *n* lignes, qui croissent avec la Casa).
- **La décision.** C'est le pari d'engagement des bons jeux de livraison (Death Stranding, les contrats d'Euro Truck) : « Je prends le drap fin pour Venise, à 18 h, alors que mon tisserand n'a pas fini ? » L'échéance ne punit que la promesse non tenue, jamais l'absence.
- **Ce qu'on voit.** On glisse une caisse de la ville vers son **carnet** (le livre ouvert au pied de l'écran). Un sceau de cire se pose et le sablier se met à couler. Une commande en retard a son sceau fendu.
- **Les paramètres.**
  - `orders.offersPerCity` (taille + 1) ;
  - `orders.offerRotateMinutes` ;
  - `orders.acceptSlotsByCasa` ;
  - `orders.deadlineMinutesByTier` ;
  - `orders.onTimeBonusBps` (+10 %) ;
  - `orders.lateBps` (−30 %) ;
  - `cities.prosperity.lateLoss` (1 cran).

### Proposition 4 : les routes qui se font (la conception du réseau)

- **La règle.** Chaque tronçon emprunté s'use et se « fait » : au bout de *n* passages, il devient chemin battu, puis route empierrée si on y investit des briques et des planches. Une route empierrée raccourcit le saut et ouvre les charrettes lourdes. On ne peut empierrer qu'un nombre limité de tronçons, qui croît avec la Casa.
- **La décision.** « Quel corridor j'empierre ? Celui de la carrière ou celui de Vérone ? » C'est la décision de réseau d'OpenTTD, qui fait des pages de forum. Elle est **personnelle** (règle d'or 1), visible, et diffère d'une Maison à l'autre selon l'emplacement de ses fondaci.
- **Ce qu'on voit.** La route passe de la trace dans l'herbe au chemin de terre, puis aux pavés, sur la carte.
- **Les paramètres.**
  - `roads.tracePassages` ;
  - `roads.pavedCost` (en marchandises) ;
  - `roads.speedBps` = [0, 1 500, 3 500] ;
  - `roads.pavedSlotsByCasa` ;
  - `roads.heavyRequiresPaved` (vrai pour les charrettes de marbre).

### Proposition 5 : le banquet, à la place de la table (un bonus qu'on choisit, pas un malus qu'on subit)

- **La règle.** Pas de population à nourrir. On peut **donner un banquet** au fondaco : on dépose pain, vin et viande, ce qui donne *+x %* de cadence à tout le domaine pendant *h* heures. Plus le banquet est varié, plus il est long. Rien ne se passe si on n'en donne pas.
- **La décision.** « Je vends mon vin à Vérone, ou je le brûle en banquet avant la nuit pour sortir une demi-file de plus ? » C'est un vrai arbitrage entre vente et réinvestissement, sans punition.
- **Ce qu'on voit.** La grande table dressée devant le fondaco, les plats qui se vident en sablier, des lampions la nuit.
- **Les paramètres.**
  - `banquet.goods` = { bread: 1, wine: 2, meat: 2 } (points de variété) ;
  - `banquet.speedBps` (+1 500) ;
  - `banquet.hoursPerVariety` ;
  - `banquet.cooldownHours`.

### Proposition 6 : le camp d'extraction simplifié, par Maison

- **La règle.**
  - Les gisements sont **tirés par Maison** (comme ses reliques à la Porta), sur les cases qu'elle a. Chaque gisement a une richesse visible, et pas de prospection : la case achetée révèle son gisement.
  - On y pose un camp de trois tailles (petit, moyen, grand) : plus grand, il rend plus mais épuise plus vite. Le filon se régénère au repos.
  - Le tas du camp a un plafond, et il faut aller le chercher (une tournée chargée). Il n'y a ni vivres ni ouvriers individuels.
- **La décision.** « Je pose un grand camp sur la carrière riche et je l'épuise en dix jours, ou un petit qui tient indéfiniment ? Je déplace le camp quand le filon est au tiers ? » Et surtout : « quelle tournée passe par là ? »
- **Ce qu'on voit.** La colline entamée selon la richesse, le tas qui monte, les figurines en nombre selon la taille du camp.
- **Les paramètres.**
  - `deposits.richness` (en lots) ;
  - `deposits.regenPerDayBps` ;
  - `camps.sizes` = [{ rate, drainBps, cost }] × 3 ;
  - `camps.pileCapLots` ;
  - `deposits.perHouse` (vrai).

### Proposition 7 : les grands chantiers communs (ce qui fait parler une communauté)

- **La règle.** Une fois par semaine, une ville ouvre un grand chantier (l'Arena de Vérone, le campanile de Saint-Marc) **pour toute une bande de Puissance**. Chaque Maison y livre ce qu'elle veut parmi trois ou quatre marchandises. Le chantier a des paliers communs : à 25, 50 et 100 %, tout le monde reçoit une récompense. Une part est proportionnelle à la contribution, avec un **plafond par Maison** pour que les gros ne fassent pas tout.
- **La décision.** « Je détourne mon marbre du commerce cette semaine ? Quelle marchandise du chantier manque aux autres (bonus sur la plus rare) ? » La communauté se coordonne, ce qui est exactement l'objectif du porteur : des joueurs qui se parlent et se donnent des conseils.
- **Ce qu'on voit.** L'échafaudage 3D sur la ville, qui monte pour tous en même temps. Les blasons des contributeurs principaux flottent sur le chantier.
- **Les paramètres.**
  - `works.everyDays` (7) ;
  - `works.goods` (tirés de la région) ;
  - `works.tiers` = [2 500, 5 000, 10 000] bps ;
  - `works.rewardByTier` ;
  - `works.capPerHouseBps` ;
  - `works.scarcityBonusBps`.

### Proposition 8 : la rumeur (l'information comme ressource, CADRAGE § 3 quater)

- **La règle.** Une ville annonce par un crieur une demande forte à venir (« dans 36 h, Padoue paiera double le verre »). La fiabilité de la rumeur dépend de la source : le crieur, un associé de compagnie, un facteur (`runFactors`). La demande arrive, ou pas.
- **La décision.** Spéculer : stocker du verre dans un magasin plafonné (la proposition 2 prend alors tout son sens), sur une information incertaine. Les joueurs partagent leurs rumeurs dans la compagnie, ce qui fait du social sans PvP.
- **Ce qu'on voit.** Un crieur sur la place de la ville, un phylactère avec la marque de la marchandise, et une jauge de fiabilité en sceaux (1 à 3).
- **Les paramètres.**
  - `rumors.everyHours` ;
  - `rumors.leadHours` ;
  - `rumors.reliabilityBpsBySource` = { crier: 5 000, company: 7 000, factor: 9 000 } ;
  - `rumors.payBps` (+10 000).

### Proposition 9 : la spécialisation des fondaci (le choix qui ferme des portes)

- **La règle.** Au niveau 3, chaque fondaco prend une vocation, révocable contre un chantier :
  - **entrepôt** : × 2 places ;
  - **atelier** : + 1 place d'atelier et + 10 % de cadence ;
  - **relais** : sauts − 25 % et chargement des commandes des fondaci voisins.
- **La décision.** Elle crée des styles distincts (CADRAGE § 3.5, « ce qui rend deux Maisons différentes »), sans dominante si les trois valent la même chose en moyenne et se distinguent par la géographie.
- **Ce qu'on voit.** Le bâtiment du fondaco change de forme : une halle, des cheminées, une écurie.
- **Les paramètres** : `posts.roles` = { warehouse: { placesBps }, workshop: { slots, speedBps }, relay: { hopBps, sharedLoad } }, `posts.roleFromLevel`, `posts.roleSwapMinutes`.

### Proposition 10 : la paie par place (la parade au luxe léger)

- **La règle.** Le prix d'une commande se calcule par place occupée, avec une prime d'encombrement pour le lourd (le marbre paie son transport). Certaines commandes, contrats et chantiers n'acceptent que du lourd.
- **La décision.** « Ma burchio prend 6 places de verre, ou 2 lots de marbre qui paient la prime de chantier ? » Le choix de cargaison redevient ouvert.
- **Ce qu'on voit.** Sur la frise de la tournée, chaque caisse affiche son ducat par place par une pile de pièces de hauteur proportionnelle.
- **Les paramètres** : `orders.payPerPlaceBps` = { heavy: 13 000, normal: 10 000, fine: 9 000 }, `orders.heavyOnlyShareBps`.

## 5. La Porta : les contres, les combattants et la charge

### 5.1 Ce qui ne va pas dans la table du § 4.3

Lisons la table comme une matrice :

| Dégâts → / Protection ↓ | Perçant | Tranchant | Choc | Poudre | Feu |
| --- | --- | --- | --- | --- | --- |
| Aucune | = | = | = | = | = |
| Maille | = | **résiste** | = | = | ? |
| Plates | **résiste** | **résiste** | **faible** | **faible** | ? |
| Grand pavois | **bloque de face** | = | ? | (bat, § 4.3, pavesiers) | ? |
| Cheval | **faible** | = | ? (piques) | = | ? |

Les défauts :
- **Le tranchant n'a aucune case favorable.** C'est un type mort, que personne ne prendra.
- **La poudre n'a aucune case défavorable.** C'est un type dominant, tempéré seulement par la cadence et la lenteur, donc par le micro, pas par le build.
- **Le feu n'a pas de ligne.** C'est une étiquette sans règle.
- **Les « piques » sont citées contre le cheval** (§§ 4.3 et 4.4), mais ne sont pas un type de dégâts : est-ce du perçant, ou du tranchant ?
- **Rome n'a que deux unités protégées.** Les hommes d'armes portent les plates, les pavesiers le pavois, les chevau-légers le cheval. Les arbalétriers, les bombardes, le Gonfalonier et l'incendiaire n'ont « aucune » protection, ou une protection non dite. La table des protections ne sert donc qu'à 3 unités sur 7.
- **L'aperçu vert, ambre, rouge résout le build pour le joueur** (voir § 2.1 de cette revue).
- **Rien ne coûte le changement de build.** Si on rééquipe gratuitement et à l'instant à la Remise avant chaque bataille (aujourd'hui, poser et retirer un composant est gratuit et instantané à la Remise, `fitArm` dans `arms.ts` ; seul le trajet vers la Porta, 10 min par case, freine le changement), la décision se réduit à lire la reconnaissance et recopier le build du wiki pour cette composition. Le « choix du build » n'est vrai que s'il est **contraint** : par un inventaire limité, des niveaux chers ou un verrouillage.

Ma réponse au porteur : **non, en l'état, ce n'est pas assez** pour que le build soit une vraie réflexion. C'est un tableau de correspondance. Une semaine après l'ouverture, un tableur de 7 lignes donnera le build pour chaque garnison.

### 5.2 La table que je propose : quatre dégâts, quatre protections, un cycle

Chaque type de dégâts a **exactement une protection contre laquelle il excelle, et une qui le contre**. Les quatre forment un cycle, sans dominant. Le feu cesse d'être un type de dégâts : il devient un **effet** (proposition P4).

| Dégâts → / Protection ↓ | Perçant (arbalètes, arcs) | Taille (épées, hallebardes) | Choc (lances, masses) | Poudre (couleuvrine, bombarde) |
| --- | --- | --- | --- | --- |
| Aucune (troupe légère) | **+50 %** | = | = | −25 % (gaspillée sur du léger) |
| Maille | = | **−50 %** | **+50 %** | = |
| Plates | **−50 %** | **+50 %** (aux défauts de l'armure) | = | = |
| Pavois | **−75 % de face** (= de flanc) | = | = | **+50 %** |
| *Cheval (trait, pas protection)* | +25 % | = | **−25 %** (le cheval esquive la charge frontale) | = |

- Chaque colonne a une case forte et une case faible. Chaque ligne en a une aussi.
- La poudre perd sa domination : elle est gaspillée sur la troupe légère, qui est nombreuse.
- Le tranchant (renommé « Taille ») retrouve un rôle : il bat les plates, ce qui est historiquement juste, la hallebarde contre l'homme d'armes.
- Le cheval est un **trait** de mobilité, cumulable avec une protection : un chevau-léger en maille, un homme d'armes monté en plates. Cela multiplie les profils sans multiplier les règles.
- Paramètres : `porta.damageTable` (une matrice en bps, 4 × 4 plus le trait cheval), `porta.flankArcDeg` (le flanc du pavois), et le type de dégâts sur chaque composant (`components.*.damageType`).

Chaque unité de Rome reçoit une protection, pour que la table serve partout :

| Unité de Rome | Protection | Trait | Ce qui la bat (déduit de la table, pas écrit à l'écran) |
| --- | --- | --- | --- |
| Arbalétriers | Aucune | — | Le perçant, ou le choc qui ferme la distance |
| Pavesiers | Pavois | — | La poudre, ou n'importe quoi de flanc |
| Chevau-légers | Maille | Cheval | Le perçant (+25 %) ; un peu le choc (+50 % sur la maille, −25 % pour le cheval qui esquive) ; jamais la taille (−50 %) |
| Hommes d'armes | Plates | — | La taille |
| Bombardes | Aucune | — | Le perçant à portée, la vitesse |
| Gonfalonier | Plates, puis maille à 50 % de PV | — | **Il change de protection en cours de combat** : il faut deux types de dégâts |
| Incendiaire | Maille | — | Le choc, et l'interception |

Le Gonfalonier qui change de protection est **la** pièce qui oblige à composer un équipage mixte, plutôt que d'empiler un seul type. C'est l'équivalent du changement de phase des boss d'Hades' Star.

### 5.3 Les combattants et la charge (§ 4.4)

- **Deux combattants et un transport par joueur au plus**, et non quatre. Le palier ouvre la **qualité** des combattants (leur niveau de modèle), pas leur nombre. Au-delà, le jeu devient du micro sur téléphone et perd sa lisibilité.
- **Le second combattant suit** : un ordre « escorter » (il colle au premier ou au transport, et tire automatiquement). On ne pilote activement qu'une figurine à la fois, comme dans Hades' Star. Les synergies de position (piquier et artilleur, étendard) deviennent jouables sans tracé fin.
- **Supprimer la jauge de charge.** La remplacer par **trois classes de vitesse** visibles sur la figurine (léger, moyen, lourd), que la défense choisie fixe : maille = moyen, plates = lourd. « Des plates sur un cavalier » donne un cavalier lourd : c'est lisible, et cela ne demande ni addition ni jauge.
- **Les quatre combattants du § 4.4 sont bons** (cavaliers, piquiers, artilleurs, arbalétriers mercenaires). Je les rattacherais strictement à la table : un combattant fixe son **type de dégâts de base**, son arme le précise. Le choix devient : quel combattant (le rôle), quelle arme dans le type (le profil : cible unique qui monte, zone, coup lourd), quelle défense (la classe de vitesse).

### 5.4 Mieux : l'information, le contre-jeu, les synergies, la rejouabilité

**P1. La reconnaissance partielle, sans verdict.**
- La carte de reconnaissance montre en clair les garnisons des villes **proches de la porte**, et en silhouette celles des villes lointaines (on devine le nombre, pas la protection).
- Un éclaireur (un accessoire ou un composant de soutien) révèle tout.
- Pas d'aperçu global vert, ambre ou rouge : on montre, **par paire**, l'icône de dégâts de l'arme posée en face de l'écu de chaque garnison, avec le signe + ou −. Le joueur fait la synthèse. C'est cela, la réflexion.
- Paramètres : `porta.recon.clearRadiusCells`, `porta.recon.scoutRevealAll`.

**P2. Un inventaire qu'on ne remplit pas d'un coup.**
- Les composants coûtent, et leurs niveaux 4 et 5 demandent des plans. Le vrai choix de build est **le portefeuille sur des semaines** : sur quels types de dégâts j'investis mes plans, sachant que les compositions de Rome varient ?
- Il faut donc que la composition de Rome **varie d'une bataille à l'autre** : par exemple deux « légions » sur cinq, tirées de la graine, annoncées à la reconnaissance. C'est l'adversaire, pas une variante de la semaine, ce qui respecte la décision du porteur (§ 0).
- Le build se **verrouille** en entrant dans la file.
- Paramètres : `porta.legions` (cinq compositions), `porta.legionsPerBattle` (2), `porta.lockLoadoutOnQueue`.

**P3. Les classes de vitesse** (voir § 5.3) : `porta.speedClass` = { light, medium, heavy } en centièmes de case par minute, et la défense qui fixe la classe.

**P4. Les munitions, qui viennent du commerce.**
- La couleuvrine tire des **charges de poudre**, les arbalètes des **carreaux**, le feu grégeois est un consommable. Toutes se fabriquent au fondaco : poudre = salpêtre + charbon, carreaux = bois + fer.
- La Porta devient un **débouché de la production**, et la production un **appui de la Porta**. C'est le lien économique qui manque entre les deux moitiés du jeu, et un puits de marchandises qui ne punit pas l'absence.
- Le feu n'est plus un type de dégâts : c'est une munition à zone qui brûle en continu, efficace contre les unités groupées.
- Paramètres : `porta.ammo` = { powder: { perShot, recipe }, bolts: { per10s, recipe } }, `porta.ammoCarry`.

**P5. Les capitaines de Rome.** Chaque bataille tire un légat qui commande Rome, avec un trait :
- le Prudent : retraite à 50 % ;
- le Zélé : réexamen deux fois plus rapide ;
- le Cardinal : soigne ses unités proches ;
- le Condottiere vendu : une garnison change de camp si on tue son chef.

Le trait est visible à la reconnaissance. Il change **la tactique** (le micro), pas le build : c'est du contre-jeu, à moindre coût. Paramètres : `porta.legates` [{ code, mods }], `porta.legateOdds`.

**P6. Les serments (la rejouabilité par le défi).**
- Avant d'entrer, on peut prêter jusqu'à trois serments : « sans soins », « Rome +20 % de PV », « porte fermée à 8 min ». Chacun ajoute des points au classement, sur le modèle de la *Heat* de Hades ou des modificateurs de Red Stars.
- La Porta noire en devient un cas particulier.
- Les classements par bande prennent de la profondeur (le même palier se joue à plusieurs chaleurs), et les joueurs discutent des combinaisons.
- Paramètres : `porta.oaths` [{ code, pointsBps, mods }], `porta.maxOaths`.

**P7. Les rôles en groupe.** À 2 à 4 joueurs, des accessoires de groupe :
- l'étendard porte sur **tous** les alliés proches, coéquipiers compris ;
- le chirurgien soigne les coéquipiers (c'est déjà le cas) ;
- le pavois peut couvrir un coéquipier adjacent.

On obtient le trio porteur, soigneur, dégâts des Red Stars en groupe, qui fait parler les compagnies (« qui prend le chirurgien ? »). Paramètres : `components.*.allyScope` (soi, équipage, groupe).

**P8. Le terrain : le faire au bon moment, et petit.** Le § 4.5 n'est pas codé (voir § 2.8). Je garderais **un seul** élément de terrain au départ : la colline (une case de portée en plus à qui s'y tient). Elle suffit à rendre le placement significatif, se dessine facilement, et ne demande ni pathfinding (comme le fleuve et ses gués) ni vision par case (comme la forêt). Paramètres : `porta.battle.hills` (le nombre par carte), `porta.battle.hillRangeCenti`.

## 6. En résumé, ce que je dirais au porteur

1. Votre diagnostic est juste, mais la cause de « on produit trop » est **le rapport entre une production géométrique et une demande fixe qui suit l'offre**. Corrigez-la dans `orders.ts` (propositions 1, 3 et 10) avant d'ajouter des contraintes de stock.
2. Gardez une seule source de coût de l'absence : le **plafond** (le quai, le magasin). Reportez la table, les vivres, les outils consommables et les périssables. Remplacez la table par un bonus choisi (le banquet).
3. Dans le § 5, l'extraction (lot 4) est placée avant ce dont elle dépend (lots 5, 6, 7, 10). Refaites l'ordre : la demande, la tournée, la Porta, le magasin, les contrats, le référentiel, l'extraction.
4. La table des contres de la Porta a un type mort (le tranchant), un type dominant (la poudre) et un type vide (le feu). Et l'aperçu coloré fait le choix à la place du joueur. Passez à un cycle de 4 × 4, à une reconnaissance partielle sans verdict, à des légions tirées par bataille, et à un build verrouillé en entrant dans la file.
5. Une communauté de gestion parle de ce qui est **non évident, incertain, varié et partagé**. Le plan offre beaucoup de non-évident. Il lui manque l'incertain (la rumeur, les légions), la variété (les routes, les vocations, les serments) et le partagé (les chantiers communs).
6. Rendez le simulateur à nouveau obligatoire pour l'économie. Un bot glouton qui joue aussi bien qu'un bot réfléchi est la preuve qu'une mécanique ne crée pas de décision.
