# Revue d'économie de jeu du plan « profondeur » (5 novembre 2026)

*Revue d'un économiste de jeu (jeux persistants, jeux de commerce : EVE Online, Offworld Trading Company, Patrician, Hades' Star, midcore mobile) sur `docs/plan-profondeur-2026-11-05.md`, validé mais pas encore codé. Lu et chiffré sur le réel :*
- *les réglages : `venice1450.empire.ts`, `venice1450.towns.ts`, `venice1450.ts` ;*
- *le moteur : `orders.ts`, `workshops.ts`, `curves.ts`, `stores.ts`, `moves.ts`, `prices.ts`, `trade.ts` ;*
- *le simulateur : `apps/simulator/src/empire/` ;*
- *l'historique de `docs/calibration.md`.*

*Montants en ducats (1 ducat = 100 deniers), taux en points de base. Les valeurs proposées sont des **valeurs de départ**, à mesurer au simulateur avant tout réglage : ce ne sont pas des décisions.*

---

## 0. L'essentiel en dix lignes

1. **La surproduction est structurelle, pas un réglage.** L'offre d'une Maison croît comme *nombre d'ateliers × Y(n)*, soit à peu près au carré du niveau. La demande croît comme *nombre de villes desservies × plafond*, linéaire et bornée à 31 villes. Le ratio production / commandes passe d'environ **0,4 à la Casa 1** à **3–4 à la Casa 5**, **~9 à la Casa 10** et **~25 à la Casa 20**.
2. **Dans le moteur, les intrants ne suivent pas le rendement.** `relaunchWorkshop` prend les intrants **par lot** (10 bois), mais `collectWorkshop` rend **Y(n) fois** les produits (Y(10) = 23,5, soit 141 planches pour 10 bois). La transformation crée de la matière : aucune chaîne ne contraint. Le simulateur, lui, multiplie les intrants par le rendement. **Il sous-estime donc la surproduction du jeu.**
3. **La demande suit l'offre** (`orderGoodsOf` et `madeWeight` = 3), une ville pleine attend sans rien perdre, et un lot vaut la même somme quelle que soit la taille de la Maison. Toute commande est donc servable, et le stock la couvre.
4. **Il n'y a pas de puits pour l'excédent.** La Dogana prend 20 + 3 unités par Maison éveillée, par marchandise, par région et par jour, **partagées entre tous**. Une Maison de Casa 10 fait plus de 9 000 unités d'argile par jour. Le stock monte sans fin : dans un essai du simulateur de 4 mois (40 Maisons), **0,6 à 4 millions d'unités en stock dès la Casa 9**, soit des milliers de lots de commande.
5. **Le plan vise juste** : plafonds, extraction, bras, goûts, échéances. Mais **il ne tiendra que si le volume est d'abord ramené à une échelle où les puits par tête comptent.** Je propose « la caisse » comme unité, une croissance de la production d'environ ×30 sur la partie (contre ×700 aujourd'hui), et une progression qui vient de la **valeur** par caisse : qualité, produit fini, contrats.
6. **L'ordre des lots est à revoir** : le magasin plafonné seul (lot 1) montrerait des ateliers arrêtés partout, une frustration sans décision. Il faut livrer **ensemble** le magasin, la demande plus grande que l'offre (goûts et échéances) et la correction des intrants.
7. **La garantie « toujours plus de commandes que de quoi les servir »** passe par une formule de lot indexée sur la Casa, calibrée pour un taux de service de **50 à 65 %** (en nombre) au milieu de partie, de **75 à 90 %** au début, avec des échéances qui renouvellent l'offre.
8. **Prix** : garder les commandes à prix de référence, propres à chaque Maison. Y ajouter une **mercuriale lente**, un indice régional quotidien qui baisse un peu quand tout le serveur livre la même chose (élasticité 0,25, de −20 % à +25 %). C'est l'effet Offworld, sans l'avantage d'être en ligne. Le bradage passe hors marché.
9. **Le simulateur** doit reprendre les formules exactes du moteur, et compter le temps des gestes et la place. Il lui faut de nouveaux indicateurs : taux de service, part jetée, ateliers arrêtés, diversité des stratégies, coût de l'absence. Et un bot « optimiseur » pour détecter les stratégies dominantes.
10. **Huit propositions nouvelles** (§ 6) : commandes à terme, saisons, Banco, raccourcis par les terres de Rome, carottage, rodage d'atelier, grand œuvre de la ville, colleganza de compagnie.

---

## 1. Le diagnostic chiffré

### 1.1 Les formules en jeu

| Élément | Formule et réglage réel | Source |
| --- | --- | --- |
| Rendement d'un atelier | Y(n) = n × (1 + 0,15 (n − 1)) : Y(1) = 1 ; Y(3) = 3,9 ; Y(5) = 8 ; Y(8) = 16,4 ; Y(10) = 23,5 ; Y(15) = 46,5 ; Y(20) = 77 ; Y(25) = 115 | `curves.ts`, `yieldStepBps` = 1 500 |
| Produits d'une fournée | `outputs × Y(n)` | `collectWorkshop` |
| Intrants d'une fournée | `inputs × 1` (pas multipliés par Y) | `relaunchWorkshop`, `need(per, add)` |
| Recette haute (dès le niveau 12) | `highRecipeRaw(level, add)` : `add` est le nombre de **fournées**, pas d'unités | `workshops.ts` l. 104 |
| File de nuit | 12 h de fournées d'avance (`queueHours`) ; une recette de 30 min = 24 fournées par session | `settings.ts` |
| Commandes d'une ville | Plafond 1, 2, 2, 3, 4 et une commande toutes les 600, 360, 225, 163, 128 min, selon la taille 1 à 5 | `orders` |
| Lot d'une commande | 400 ducats × palier (brut ×1, intermédiaire ×2, fini ×3, luxe ×5) ÷ la référence, payé à la référence + 15 % (+ jusqu'à 15 % de distance) | `lotOf`, `drawOrder` |
| Marchandise tirée | Parmi celles que **les bâtiments de la Maison savent faire**, celles en marche ×3 | `orderGoodsOf`, `madeWeight` |
| Débouché de l'excédent | Dogana : 20 + 3 × Maisons éveillées par marchandise, par région et par jour, **partagés** ; −12 % de prix par journée de profondeur vendue, plancher 60 % | `trade.ts`, `markets` |
| Coût d'un niveau | 120 × 1,3^(n−1) ducats : 1 273 au niveau 10, 17 544 au 20, 65 141 au 25 | `levelCost` |

Exemples de lots réels (Vénétie) : argile 133, bois 133, blé 100, planches 120, briques 120, pain 100, verre 27, drap 44. Un lot rapporte de 460 ducats (brut) à 1 380 ducats (fini).

### 1.2 Le ratio production / demande, palier par palier

**Hypothèses** (Maison médiane) :
- deux sessions par jour, à 12 h d'écart : la file de 12 h tourne donc 24 h sur 24, soit 48 fournées de 30 min par jour et par atelier ;
- ateliers au niveau de la Casa : c'est la borne haute, mais le joueur n'a pas d'autre axe pour progresser ;
- mélange brut et transformé : 7 unités nettes par fournée de base en moyenne (brut 8 à 11, transformé 5 à 6, les intrants ne comptant pas, puisqu'ils ne suivent pas Y) ;
- lot moyen d'environ 120 unités ;
- commandes : les villes atteintes (calculées avec `citiesCovered` sur la vraie carte), remplies à leur plafond à chaque session.

Production en lots par jour ≈ ateliers × Y(n) × 7 × 48 ÷ 120 = **ateliers × Y(n) × 2,8**.

| Casa | Ateliers | Niveau, Y | Production (lots par jour) | Villes atteintes (fondaco), plafonds par session | Commandes par jour | **Ratio** |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 3 | 1 ; 1 | ≈ 6 (le bois manque aux planches) | Venise 5, Padoue 4, Trieste 3, Pola 1 (niv. 1) : 4+3+2+1 = 10 | 20, mais la soute de 2 mules × 2 places × 2 tournées en porte 16 | **≈ 0,4** |
| 3 | 4 | 3 ; 3,9 | 44 | niv. 2 : + Trévise, Udine, Ancône → 16 | 32 | **≈ 1,4** |
| 5 | 6 | 5 ; 8 | 134 | niv. 3 : + Vérone → 19 | 38 | **≈ 3,5** |
| 8 | 9 | 8 ; 16,4 | 413 | niv. 5–8 : 14 villes → 36 | 72 | **≈ 6** |
| 10 | 12 | 10 ; 23,5 | 790 | niv. 10 : 17 villes → 44 | 88 | **≈ 9** |
| 15 | 16 | 15 ; 46,5 | 2 080 | ~25 villes → ~65 | 130 | **≈ 16** |
| 20 | 20 | 20 ; 77 | 4 310 | les 31 villes → 90 (plafond du monde) | 180 | **≈ 24** |

**Lecture.**
- **Seule la Casa 1 à 2 manque de marchandise.** Dès la Casa 3, on produit plus qu'on ne peut livrer ; à la Casa 5, plus de trois fois plus. Le retour du porteur (« on peut faire toutes les commandes en permanence ») est exactement ce que donnent les formules.
- **Le ratio ne dépend pas de l'assiduité.** Un joueur occasionnel (une session par 48 h) produit 12 h sur 48, mais ne voit aussi qu'un plein de ville tous les deux jours. La file de 12 h et le plafond des villes rendent l'absence neutre des deux côtés. C'était voulu (ancienne règle d'or 3), mais cela retire toute tension.
- **Même en corrigeant les intrants** (pris × Y), une chaîne brut → fini nette environ la moitié de ses produits. Le ratio tombe alors de moitié à peu près : 2 à la Casa 5, 5 à la Casa 10, 12 à la Casa 20. **C'est encore trop** : la cause de fond est Y(n), quadratique, face à une demande linéaire.

### 1.3 Le retour sur investissement d'un niveau : la demande est le seul frein

Prenons une scierie du niveau 9 au niveau 10.
- Le niveau ajoute ΔY = 23,5 − 19,8 = 3,7 lots de base par fournée, soit 3,7 × 6 planches × 48 fournées ≈ **1 066 planches par jour**.
- C'est **≈ 10 650 ducats par jour** à la référence (10 ducats la planche), pour **1 273 ducats**.
- **Il se rembourse en environ 3 heures, si la marchandise se vend.**
- Au niveau 20 : 6,7 × 6 × 48 × 10 ≈ 19 300 ducats par jour pour 17 544 ducats, **un jour**.

Le « frein des grandes maisons » de `curves.ts` (`paybackRatio`) n'agit donc pas : le seul frein réel est la demande. Une fois celle-ci saturée, un niveau de plus ne rapporte **rien** et remplit le magasin. C'est la définition d'une économie où la production n'est pas une décision.

De même, **la soute ne contraint pas un joueur** : une charrette coûte 120 ducats et porte 3 places, soit le quart d'une seule commande brute (460 ducats).

### 1.4 Ce que montre le simulateur (essai fait pour cette revue)

**L'essai** : graine 1, une cohorte de 40 Maisons, 4 mois, réglages de Venise, `runEmpire` (fichier temporaire, effacé). Médianes par Casa à la fin :

| Casa | Ateliers | Niveau moyen | Stock total (unités) | Commandes livrées (ducats par jour) |
| --- | --- | --- | --- | --- |
| 8 | 13 | 3,9 | ≈ 200 000 | ≈ 1 900 |
| 9 | 13 | 5,9 | ≈ 1 160 000 | ≈ 3 800 |
| 12 | 25 | 5,8 | ≈ 2 070 000 | ≈ 7 100 |
| 14 | 29 | 6,6 | ≈ 4 290 000 | ≈ 11 100 |

Détail d'une Maison de Casa 10 : 707 000 planches, 408 000 briques, 144 000 d'argile, avec 52 commandes en attente sur 19 villes.

Trois biais rendent ce simulateur **aveugle au problème du porteur** :
1. **les intrants y sont multipliés par le rendement** (`collect`, `qty × per`), alors que le moteur ne le fait pas : le simulateur produit *moins* de produits transformés que le jeu ;
2. **les bots ne montent pas un atelier dont la marchandise s'entasse** (`pilesUp`), alors qu'un vrai joueur, sans autre axe, le monte ;
3. **les bots gardent leurs 2 mules** : ils épargnent pour la Casa (`casaFirst`, la réserve), ce qui leur laisse 48 à 52 commandes en attente. Le simulateur mesure donc un monde où **la soute est le goulot**, alors que pour un joueur la charrette ne coûte presque rien.

Même ainsi, les stocks atteignent des millions d'unités. Le diagnostic est robuste.

### 1.5 Les six causes, en une ligne chacune

| # | Cause | Effet |
| --- | --- | --- |
| C1 | Y(n) ne multiplie que les produits | La transformation crée de la matière ; les chaînes ne contraignent pas |
| C2 | Une offre en n² × ateliers, une demande linéaire bornée à 31 villes | Le ratio monte de 0,4 à ~25 |
| C3 | Un lot de valeur fixe, quelle que soit la Maison | Une grande Maison reçoit les mêmes petites commandes qu'un débutant |
| C4 | La demande suit l'offre, et une ville pleine attend | Tout est servable, rien ne se perd, pas de choix |
| C5 | Pas de plafond de stock, une Dogana minuscule et partagée | L'excédent s'entasse sans coût |
| C6 | Une flotte et des niveaux très bon marché face à la paie d'une commande | Aucun arbitrage d'investissement |

---

## 2. Mécanique par mécanique : sources, puits, paramètres, risques

### 2.0 Un préalable : l'unité de compte et la courbe de production

Les sept mécaniques du plan sont des **puits par tête** : une place par caisse, une ration par ouvrier, un outil par atelier, une place de soute par caisse. Ils ne pèsent que si les volumes restent à l'échelle humaine.
- Avec Y(20) = 77, une scierie sort 22 000 planches par jour. Aucune ration, aucun outil ne pèse face à cela.
- **Je recommande, au lot 6 (refonte du référentiel) mais décidé dès le lot 1 :**
  1. **La caisse** (`goods.crate`) devient l'unité du magasin, de la soute et des commandes : une caisse vaut environ 100 ducats à la référence pour un brut, 200 pour un intermédiaire, 300 pour un fini, 500 pour un luxe. Par exemple 33 argiles, 30 planches, 7 verres. Une commande d'aujourd'hui vaut 4 caisses.
  2. **Le niveau ouvre des postes, et ce sont les bras qui produisent** (§ 2.3). La production d'un atelier vaut alors postes occupés × cadence d'un ouvrier × outils × table × terroir, et n'est plus un multiplicateur gratuit. Pour postes(n) = 1 + ⌈n/2⌉, l'atelier passe de 1 à 11 postes sur 20 niveaux, au lieu de ×77.
  3. **La progression vient de la valeur par caisse** : brut 100 → fini exquis 900 et plus, contrats ×1,5 à ×2. Avec un volume ×30 et une valeur par caisse ×10 à ×15, le revenu peut croître de ×300 à ×450 sur la partie. Le prix de la Casa (×3 500 de la 2 à la 20) se recalibre en conséquence au simulateur.
- **La correction immédiate**, utile même avant ces lots : prendre les intrants **× Y(n)** dans `relaunchWorkshop`, et compter `highRecipeRaw` en unités. C'est un changement de règle du commerce, à annoncer dans les notes du chapitre.

La **capacité de référence** d'une Maison médiane, en caisses servables par jour (`K̂`), est la cible que tous les réglages ci-dessous visent :

| Casa | 1 | 3 | 5 | 8 | 10 | 12 | 15 | 20 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| K̂ (caisses par jour) | 6 | 12 | 20 | 32 | 45 | 60 | 85 | 150 |

### 2.1 Le magasin plafonné et l'encombrement

| | |
| --- | --- |
| **Sources** (entrées au magasin) | Production, enlèvements aux camps, achats en ville (fret de retour), transferts |
| **Puits** | Commandes livrées, intrants, rations, matériaux de Casa, **jet** (destruction), **bradage** (une source de ducats), **gâte** des denrées |
| **Rôle économique** | Convertir l'excédent en **coût d'opportunité** : chaque place tenue par un bien qui dort coûte la production qu'on arrête |

**Paramètres** (`worlds.settings.storage`) et valeurs de départ :

```jsonc
"storage": {
  "placesByFondacoLevel": [20, 30, 40, 55, 70, 90, 110, 135, 160, 190],
  "warehouse": { "places": 25, "maxPerFondaco": 3,
                 "costDucats": [300, 1500, 6000], "minutes": [60, 240, 720] },
  // en demi-places par caisse : fin 1 (soie, épices, verre), courant 2 (pain, sel, drap, blé),
  // volumineux 3 (argile, briques), bois 4, encombrant 6 (marbre, fer, pierre)
  "bulkHalfPlaces": { "silk": 1, "spices": 1, "glass": 1, "cloth": 2, "salt": 2, "bread": 2,
                      "wheat": 2, "clay": 3, "bricks": 3, "planks": 4, "wood": 4,
                      "marble": 6, "iron": 6 },
  "fullStops": "workshop",                // plein : l'atelier s'arrête, rien ne se perd
  "dumpPayBps": 2500,                     // brader : 25 % de la référence, hors marché (§ 4)
  "dumpDailyCapBps": 1000,                // au plus 10 % du revenu moyen sur 7 jours, par jour
  "rules": true                           // consignes : « garder au plus N caisses de X, brader le reste »
},
"perishables": {
  "fish":  { "freshHours": 18, "halfLifeHours": 24 },
  "milk":  { "freshHours": 12, "halfLifeHours": 12 },
  "meat":  { "freshHours": 24, "halfLifeHours": 36 },
  "fruit": { "freshHours": 24, "halfLifeHours": 24 }
}
```

**La cible de calibrage** : les **heures pour remplir le magasin**, à production nette médiane, entre **12 et 30 h**, à tous les paliers.
- Sous 12 h, le joueur ne fait que vider : c'est une corvée.
- Au-dessus de 30 h, le plafond ne mord jamais.
- Elle remplace la file de nuit (12 h) : le plafond fait le même travail, mais par une décision.

**Les risques.**
- **La corvée du jet.** Si le joueur doit glisser des caisses vers la lagune à chaque session, c'est du travail, pas de la réflexion. La parade : les **consignes** (« garder au plus 12 caisses de briques, brader le reste »). La décision se prend une fois, puis s'exécute seule, y compris absent. C'est le facteur (le personnel) qui l'applique : le système absorbe un rôle.
- **Le bradage comme stratégie dominante.** Si brader rapporte assez, « produire au maximum et brader » redevient optimal pour une grande Maison, et la planche à billets est de retour. D'où le prix bas (25 %), le **plafond quotidien** lié au revenu, et un prix hors du marché partagé : le bradage d'un vétéran ne doit pas écraser le cours des autres (§ 4).
- **Une stratégie dominante sur la densité.** Si la valeur par place varie trop d'un bien à l'autre, on ne stocke que du fin. Visez un écart de valeur par place de **×4 à ×6** entre le plus dense (soie) et le plus encombrant (marbre), et faites porter aux goûts des villes et aux contrats (§ 2.10, 2.11) la demande en encombrant : l'Arena veut du marbre.
- **Le joueur absent** : le magasin se remplit, les ateliers s'arrêtent, **rien ne se perd** hors périssables. C'est conforme à la règle 7. Les périssables : la fraîcheur n'entame la valeur qu'après `freshHours`, puis la moitié par `halfLifeHours`. Une nuit ne coûte presque rien, trois jours d'absence perdent le poisson non salé, et c'est lisible.
- **Les stocks d'aujourd'hui** (décision : les laisser fondre). Un vétéran assis sur 700 000 planches livrera des planches **des mois** sans produire, et les commandes de planches ne lui demanderont aucune décision. Je recommande :
  - un **« magasin ancien »** visible, qui ne fait que se vider : il sert les commandes, mais pas les intrants ni les matériaux de Casa, et rien n'y rentre ;
  - ou, mieux, la conversion au passage de ce qui dépasse 3 fois le plafond en **ducats au prix de bradage, versés sur 4 semaines**.

  Sans l'une des deux, le lot 1 sera invisible pour les joueurs qui comptent le plus.

### 2.2 L'extraction : gisements, équipes, vivres

| | |
| --- | --- |
| **Sources** | La richesse du filon (un stock qui se régénère), les ouvriers |
| **Puits** | Le temps des ouvriers (pris aux ateliers), l'usure des outils, les vivres, la place au camp, la place en soute (enlèvement) |
| **Rôle** | Faire de la matière première **un coût logistique et humain**, et non un revenu gratuit |

**Les formules.**
- Ouvriers efficaces : f(w) = w × w½ ÷ (w + w½), avec w½ = 8. Cela donne f(5) = 3,1, f(8) = 4, f(10) = 4,4 et f(16) = 5,3 : « dix ouvriers ne font pas deux fois cinq ».
- Rendement par heure = base × f(w) × outils × (0,3 + 0,7 × R ÷ Rmax) × vivres, avec un plancher à 30 % de la richesse, pour qu'un filon épuisé ne soit jamais nul.
- Richesse : chaque caisse extraite retire 1 ÷ `depletionCrates` ; la richesse remonte vers Rmax de moitié en `regenHalfLifeHours`.

```jsonc
"extraction": {
  "fromCasa": 3,
  "workerHalf": 8,
  "basePerWorkerHourMilli": 120,       // 0,12 caisse par ouvrier efficace et par heure
  "depletionCrates": 120,              // 120 caisses extraites d'un filon plein le vident
  "regenHalfLifeHours": 72,
  "floorBps": 3000,
  "campPlaces": 24,                    // le tas du camp ; plein, le camp s'arrête
  "rationPerWorkerDayMilli": 100,      // 0,1 caisse de vivres par ouvrier et par jour
  "hungerSpeedBps": 5000,              // sans vivres, moitié moins vite ; l'équipe rentre après 24 h
  "toolWearPerCrateBps": 300,          // un jeu d'outils pour ~33 caisses
  "prospect": { "costDucats": 150, "minutes": 120, "radiusSectors": 1 },
  "crowdingBps": 1000                  // −10 % au plus si d'autres Maisons exploitent le même gisement
}
```

Avec 8 ouvriers sur un filon plein : 4 × 0,12 ≈ 0,5 caisse par heure, soit environ **11 caisses par jour**. En marbre (3 places la caisse), cela fait 33 places : le tas du camp (24 places) déborde en 16 h. **Il faut une tournée par jour**, ce qui branche l'extraction sur les tournées, comme le veut le plan. Le filon passe sous 50 % en environ 5 jours d'exploitation continue : le choix « carrière riche lointaine ou proche à moitié épuisée » apparaît dans la semaine.

**Les risques.**
- **Un filon partagé** (une ressource commune) : la tragédie des communs, et une gêne d'un joueur sur l'autre, contraire à l'esprit des règles 1 et 2. **Je recommande une richesse propre à chaque Maison** : chacun voit son propre filon. Seul un léger encombrement visible (les tentes des autres, −10 % au plus) pousse à se répartir sans punir.
- **Une stratégie dominante** : « tous les bras à la carrière la plus riche ». L'épuisement et les retours décroissants y répondent. **La cible** : l'optimum (valeur par ouvrier et par heure) doit changer de gisement au moins une fois par semaine pour un joueur médian.
- **La spirale de mort** : pas de vivres → l'équipe ralentit → moins de revenu → pas de vivres. La parade : l'équipe **rentre seule** au domaine sans perte après 24 h de faim. Et la ration de base (le pain) se fait au domaine dès la Casa 1, sans intrant acheté.
- **L'absent** : le camp s'arrête, tas plein ou vivres épuisés, et rien n'est perdu. L'équipe ne meurt jamais.

### 2.3 Les bras : population, postes, table, artisans

| | |
| --- | --- |
| **Sources** | Les maisons (logement), l'immigration, que tire une bonne table |
| **Puits** | **Les rations** : enfin un puits de production qui grandit avec l'empire ; la place des maisons sur les cases ; la formation des artisans (temps, ducats) |
| **Rôle** | L'arbitrage central : un ouvrier va à l'atelier, au camp ou à l'école |

**Les formules.**
- Postes d'un atelier : 1 + ⌈n/2⌉.
- Cadence = min(1, occupés ÷ postes) × table.
- Table : la part de la ration servie en pain (P), en protéine (V : poisson, viande) et en vin (W). La table vaut :
  - 70 % si P < 100 % (une faim qui ralentit, sans jamais tuer) ;
  - 100 % avec le pain seul ;
  - 110 % avec le pain et la protéine ;
  - 120 % avec les trois.
- La population croît d'un ouvrier toutes les 6 h tant que la table est d'au moins 110 % et qu'il reste de la place dans les maisons. Elle **ne décroît jamais** (plancher).

```jsonc
"population": {
  "fromCasa": 4,
  "houseWorkers": 8, "houseCostDucats": 200,
  "growEveryHours": 6, "growMinTableBps": 11000,
  "ration": { "breadMilli": 100, "proteinMilli": 50, "wineMilli": 30 },  // caisses par ouvrier et par jour
  "tableBps": { "hungry": 7000, "bread": 10000, "protein": 11000, "wine": 12000 },
  "artisan": { "school": "scuola", "hours": 24, "costDucats": 300, "maxShareBps": 3000 }
}
```

**La cible** : nourrir sa population prend **15 à 20 % du temps-atelier** d'un domaine, soit environ un atelier vivrier pour quatre ou cinq ateliers de production (le rapport d'Anno). Avec 0,1 caisse de pain par ouvrier, une boulangerie de 4 postes, qui fait environ 6 caisses par jour, nourrit 60 ouvriers, et c'est bien cela.

**Les risques.**
- **La spirale de mort** : le plancher à 70 % et une population qui ne décroît jamais la coupent. Une Maison affamée tourne au ralenti, mais repart en une session.
- **L'absent** : la table se vide (c'est la seule mécanique où l'absence coûte réellement), et le domaine tombe à 70 % au pire. Pour 3 jours d'absence, c'est au plus 30 % de production en moins, **jamais de perte d'acquis**. Il faut le dire au retour (« vos gens ont eu faim mardi »), pas le punir.
- **Le vétéran et le nouveau** : les artisans sont un capital qui s'accumule. Bornez la part d'artisans (30 % des postes) pour que l'avantage soit la qualité, pas le volume.
- **La micro-gestion** : glisser des figurines une par une à 30 ateliers devient une corvée. Il faut une **répartition automatique par priorité** (on ordonne les ateliers, les bras suivent), le glisser ne servant qu'à corriger.

### 2.4 Les chaînes longues et les sous-produits

| | |
| --- | --- |
| **Sources** | Les sous-produits : des sorties en plus, gratuites mais encombrantes |
| **Puits** | Les recettes secondaires (tannerie, chandelier, refonte du calcin), le jet |
| **Rôle** | Donner de la valeur à **l'organisation** : une même matière, trois chemins |

```jsonc
// au référentiel (recipes), par recette :
{ "code": "slaughter", "inputs": { "cattle": 1 }, "outputs": { "meat": 2 },
  "byproducts": { "hides": 1, "tallow": 1 },     // en caisses
  "artisan": false, "minutes": 60 }
```

Valeurs de départ :
- les sous-produits font **25 à 50 %** du volume (en caisses) de la sortie principale ;
- non transformés, ils valent **10 à 20 %** de sa valeur (bradage) ;
- transformés, **40 à 60 %**.

Une recette fine (avec artisan) paie **×2 à ×2,5** par caisse, pour **×1,5** de temps et un intrant de plus.

**La règle d'équilibrage contre la stratégie dominante** : pour chaque atelier, la marge **par heure-poste** et la marge **par place** de ses deux ou trois recettes doivent rester à **±20 %** l'une de l'autre, avec un classement qui s'inverse selon la contrainte dominante. La recette simple gagne quand on manque de bras ; la fine gagne quand on manque de place ou de matière. Si une recette domine sur les deux axes, elle rend les autres inutiles.

**Les risques** : l'encombrement des restes devient une corvée (d'où les consignes, § 2.1), et la lisibilité baisse avec la longueur des chaînes. La parade : ouvrir **une étape à la fois** par palier de Casa (déjà au plan, § 2.8).

### 2.5 La qualité

| | |
| --- | --- |
| **Sources** | Le filon de qualité, les intrants importés (la soude d'Alexandrie), l'artisan, de meilleurs outils |
| **Puits** | Le surcoût des intrants, le temps de l'artisan |
| **Rôle** | Une demande **segmentée** : les commandes cerclées d'or ne sont pas servies par n'importe qui |

**La règle** : la qualité doit être **déterministe**. Qualité = min(qualité des intrants, plafond de l'artisan, plafond des outils). Aujourd'hui, c'est une part aléatoire de la sortie (`quality`, `exquisiteShareBps`). Le déterministe se planifie ; l'aléatoire ne se planifie pas.

```jsonc
"qualities": {
  "payTimesBps": { "fine": 20000, "exquisite": 30000 },
  "orderShareBps": {                 // part des commandes qui exigent, par taille de ville 1 → 5
    "fine":      [0, 0, 1000, 2000, 3000],
    "exquisite": [0, 0, 0, 500, 1000]
  },
  "fromCasa": { "fine": 7, "exquisite": 11 }   // jamais montré avant d'être faisable
}
```

**Les risques.**
- **L'écart entre vétérans et nouveaux** : l'exquis paie triple, et le vétéran a les artisans. Mais les commandes d'exquis ne sont **qu'une part** des commandes des grandes villes (≤ 10 %), et les commandes communes restent nombreuses et pleines. Le nouveau n'est pas exclu, il est servi ailleurs.
- **L'inflation** : la qualité multiplie la paie par ×2 à ×3. À compenser au prix de la Casa haute, au simulateur.

### 2.6 Le terroir, le voisinage et les nuisances

| | |
| --- | --- |
| **Sources** | Les bonus de terroir et de voisinage |
| **Puits** | Les nuisances (en aval de la rivière, la fumée), le prix d'un déménagement |
| **Rôle** | Un **problème d'agencement**, que chacun résout sur sa propre carte |

```jsonc
"domain": {
  "terroirBonusBps": 2500,           // +25 % sur son terroir
  "requiresTerroir": { "fulling_mill": "river", "water_saw": "river" },
  "adjacencyBonusBps": 1000,         // remplace neighbourBps (aujourd'hui 1 000, en anneau)
  "pollution": { "downstreamBps": -2000, "maxBps": -4000, "smokeTableBps": -500 },
  "moveCostDucatsBps": 5000,         // déménager : la moitié du prix du niveau 1 × niveau
  "seededPerHouse": true             // le terroir du domaine tiré par Maison
}
```

**Le risque principal** : **l'énigme résolue une fois**. Si tous les domaines sont identiques, la disposition optimale circule sur un wiki dès la première semaine et la profondeur s'évapore. Il faut **un terroir tiré par Maison**, avec la rivière, les forêts et l'argile à des places différentes. La communauté échange alors des *principes* (« tannerie toujours en aval, moulin en tête ») plutôt qu'*une* solution : c'est exactement ce que veut le porteur.

### 2.7 Les outils et la forge

| | |
| --- | --- |
| **Sources** | La forge (fer + charbon), l'artisan forgeron |
| **Puits** | **L'usure, à la caisse produite** et non à l'heure : c'est un second puits qui suit la production |
| **Rôle** | Une boucle interne (la mine nourrit la forge, qui nourrit la mine), et un coût d'entretien proportionnel |

```jsonc
"tools": {
  "wearPerCrateBps": 250,            // un jeu commun pour ~40 caisses produites
  "tiers": { "common": { "speedBps": 0, "lifeBps": 10000 },
             "steel":  { "speedBps": 1500, "lifeBps": 20000, "artisan": true } },
  "withoutBps": 6000,                // sans outils, 60 % de cadence
  "rackSize": 3                      // jeux d'avance sur le râtelier
}
```

**La cible** : les outils coûtent **5 à 8 %** de la valeur produite, et une forge à niveau égal équipe **6 à 8 ateliers**.

**L'absent** : l'usure ne vient qu'en produisant, donc aucune perte. Le **râtelier** (3 jeux d'avance) absorbe une absence de 2 à 3 jours.

### 2.8 Les goûts des villes

| | |
| --- | --- |
| **Sources** | La demande : c'est la seule source de revenu des commandes |
| **Rôle** | Casser « la demande suit l'offre » : **on bâtit pour une ville, plutôt que la ville commande ce qu'on bâtit** |

```jsonc
"orders": {
  "tastes": { "venezia": { "glass": 3, "silk": 3, "spices": 2, "cloth": 2 },
              "verona":  { "marble": 3, "wine": 2, "iron": 1 }, "...": {} },
  "tasteShareBps": 7500,      // 75 % des commandes tirées des goûts, qu'on les produise ou non
  "madeShareBps": 2500,       // 25 % tirées de ce que la Maison fait (le filet du débutant)
  "fashion": { "everyDays": 7, "boostBps": 5000 }   // la mode : un goût de la semaine par ville, +50 % de poids
}
```

**Les risques.**
- **Des commandes impossibles** qui frustrent : un débutant voit Venise demander de la soie qu'il ne peut ni faire ni acheter. Les parades :
  - **25 % des commandes restent tirées de ce qu'on fait** (le filet), et davantage en Casa 1 à 4, où la part des goûts monte progressivement de 30 % à 75 % ;
  - toute marchandise d'un goût est **achetable dans une ville au moins** à portée (fret de retour, § 2.11) : il y a toujours un chemin, la production ou le négoce.
- **L'uniformité** : si les goûts sont les mêmes pour tous et fixes, l'empire optimal est le même pour tous. La mode de la semaine et le terroir tiré par Maison (§ 2.6) cassent cela.

### 2.9 Les échéances

| | |
| --- | --- |
| **Puits** | **Les commandes perdues** : l'offre s'écoule même quand on ne la sert pas |
| **Rôle** | Renouveler l'offre (la ville pleine qui attend disparaît), et créer l'arbitrage « pressé et bien payé, ou lent et sûr » |

**La paie** : pleine jusqu'à l'échéance T ; ensuite linéaire jusqu'à `lateFloorBps` à 2T, puis la commande part. **Une commande non chargée part sans aucune pénalité.**

```jsonc
"orders": {
  "deadlineHours": [30, 24, 20, 16, 14],      // par taille ; toutes passent une nuit
  "rushShareBps": 2500,                        // 1 sur 4 est pressée…
  "rushDeadlineHours": 5, "rushPremiumBps": 3000,  // … 5 h, +30 %
  "lateFloorBps": 5000,
  "everyMinutes": [480, 300, 200, 150, 120],   // le flux continue même ville pleine ; la plus vieille part
  "cap": [2, 3, 4, 5, 6]                        // ce qu'on voit à la fois
}
```

**Les risques.**
- **La peur de rater, et l'obligation d'être là** (règle 7). Toutes les échéances standard durent plus qu'une nuit (≥ 14 h). Seules les commandes pressées (25 %) sont courtes, et elles se voient comme un **bonus** à saisir, pas un dû.
- **La pénalité du retard ne touche que ce qu'on a chargé** : le joueur choisit son risque.

### 2.10 Les contrats de ville

| | |
| --- | --- |
| **Sources** | Un gros paiement, un titre, un plan (règle 5) |
| **Puits** | La production de plusieurs jours, la flotte, souvent de l'encombrant |
| **Rôle** | **L'investissement à horizon de quelques jours** : réserver sa capacité, planifier ses tournées |

```jsonc
"contracts": {
  "fromCasa": 5,
  "everyHoursPerRegion": 72,
  "sizeDaysOfCapacity": 1.5,         // taille = 1,5 × K̂(Casa) en caisses
  "durationHours": 72,
  "payTimesBps": 17500,              // +75 % sur la valeur de référence
  "paidOnDeliveryBps": 6000,         // 60 % à chaque livraison, 40 % à l'achèvement
  "rewards": { "title": true, "planChanceBps": 1500 }
}
```

**Les risques.**
- **Le tout ou rien qui frustre** : payer 60 % à chaque livraison partielle le règle.
- **La stratégie dominante** « ne faire que des contrats » : sur 3 jours, un contrat prend 1,5 jour de capacité. Il reste donc la moitié de la capacité pour les commandes, et le contrat ne peut pas absorber toute l'activité.
- **L'écart entre vétérans et nouveaux** : la taille est indexée sur la Casa, donc chacun a « son » contrat à sa mesure.
- **Une version de compagnie** (le même contrat, 4 à 6 fois plus gros, partagé) sert la règle 7 : la compagnie aide sans obliger.

### 2.11 La tournée qui charge et décharge, et le terrain

| | |
| --- | --- |
| **Sources** | **La matière locale** achetée en ville (`cities[].sells`), l'enlèvement aux camps |
| **Puits** | Des ducats (achats), le temps de soute, l'encombrement |
| **Rôle** | Le cœur de l'optimisation : **la valeur par place et par heure** de chaque tournée |

```jsonc
"cities": [{ "code": "verona", "sells": { "marble": { "priceBps": 7500, "cratesPerDay": 6 } } }],
"vehicles": {
  "mule":    { "places": 4,  "terrain": { "plain": 10000, "pass": 9000, "water": 0 } },
  "cart":    { "places": 8,  "terrain": { "plain": 12000, "pass": 5000, "water": 0 } },
  "chariot": { "places": 14, "terrain": { "plain": 10000, "pass": 6000, "water": 0 } },
  "burchio": { "places": 20, "terrain": { "plain": 0, "pass": 0, "water": 15000 } }
},
"vehicleLevels": { "placesPerLevel": 2 }
```

Une commande de 4 caisses de briques (3 demi-places chacune) prend 6 places, soit une charrette presque pleine. Une commande de 4 caisses de soie en prend 2.

**Les risques.**
- **La boucle d'arbitrage sans production** : acheter la matière locale à 75 % et la livrer ailleurs à 115 % et plus. C'est **souhaitable comme stratégie** (le négociant de Patrician), mais elle ne doit pas dominer. La quantité achetable par jour est **par Maison** (`cratesPerDay`), et la marge du négoce par place-heure doit rester **dans ±20 %** de celle du producteur-livreur.
- **La corvée de planification** : quinze arrêts tapés un à un. Il faut des **tournées enregistrées** qu'on relance d'un geste (« la tournée du mardi »), et une proposition de chargement automatique qu'on corrige.

### 2.12 La Porta

| | |
| --- | --- |
| **Sources** | Les reliques : de 150 ducats (commune) à 15 000 (légendaire), et les plans |
| **Puits** | L'équipement (ducats), le pain par véhicule (4 à 60), le temps de réparation, la perte à la Porta noire |
| **Rôle** | Un **second métier**, qui doit **consommer** l'économie de production au lieu de la court-circuiter |

**La recommandation clé : brancher la Porta sur les chaînes.** Chaque sortie consomme des vivres, de la poudre (salpêtre et soufre, de nouveaux sous-produits) et l'usure de l'équipement. L'équipement se **fabrique** à partir du fer, du cuir (les peaux de l'abattoir), du drap (le caparaçon), au lieu de s'acheter en ducats. La Porta devient un client de la production, et la production a un débouché de plus qui ne dépend pas des villes.

```jsonc
"porta": {
  "suppliesPerBattle": { "bread": 2, "powder": 1 },   // en caisses, par combattant
  "gearCraft": { "plates": { "iron": 4, "hides": 1 }, "culverin": { "iron": 6, "wood": 2 } },
  "gearWearPerBattleBps": 1000,                       // une pièce dure ~10 batailles
  "incomeShareTargetBps": [1000, 2500]                 // part du revenu à viser à la Casa ≥ 10
}
```

**Les risques.**
- **La Porta qui rapporte plus que le commerce** : la cible est **10 à 25 %** du revenu à partir de la Casa 10, et la calibration en cours vise déjà « une demi-journée de revenu par bataille ».
- **Les contres qui multiplient le coût d'équipement** : le joueur doit posséder 3 ou 4 jeux d'armes pour répondre à chaque carte, et le nouveau est exclu. Les parades :
  - un **kit de base par type de combattant**, bon marché ;
  - un **prêt de la compagnie** (on emprunte le jeu d'un membre pour une bataille) ;
  - une **carte de reconnaissance** qui n'oppose qu'**un** type dominant aux paliers 1 et 2.

### 2.13 Ce que coûte l'absence : la table de contrôle

| Absence | Magasin | Camps | Table | Commandes | Perte cible du revenu des 7 jours suivants (vs continu) |
| --- | --- | --- | --- | --- | --- |
| 1 nuit (12 h) | ≤ 70 % plein | tas ≤ plein | pleine (stock) | aucune perdue (échéances ≥ 14 h) | **≈ 0 %** |
| 3 jours | plein, ateliers à l'arrêt | arrêtés | faim, 70 % | perdues (opportunité) | **≤ 15 %** |
| 7 jours | plein | arrêtés, équipes rentrées | faim, 70 % | perdues | **≤ 30 %**, et la reprise en 2 sessions |

Rien n'est jamais pris ni détruit, sauf les périssables non salés et ce que les consignes ont bradé. Les règles 1 et 7 tiennent.

---

## 3. « Il y a toujours plus de commandes que de quoi les servir » : la garantie

### 3.1 Les définitions

Pour une Maison h, sur un jour, en caisses :

- **P_h**, la production nette servable (après intrants, rations, outils) ;
- **L_h**, la capacité logistique = Σ des véhicules (places × tournées par jour) ÷ encombrement moyen ;
- **K_h = min(P_h, L_h)**, la capacité de service ;
- **O_h**, l'offre = Σ sur les villes desservies (commandes par jour × lot moyen en caisses) ;
- **σ_h**, le taux de service = livré ÷ offert : en **nombre** (σn) et en **valeur** (σv). Le joueur prend les meilleures commandes, donc σv > σn.

### 3.2 La formule : un lot indexé sur la Casa, une offre dimensionnée sur le haut du palier

Aujourd'hui, `lotOf` donne un lot de **valeur fixe** (400 ducats × palier). C'est la cause C3. Je propose :

**lot_caisses(g, h) = lotBase(palier de g) × M(Casa_h)**, avec **M** une table de `worlds.settings`, lisible, annoncée et monotone. Elle est **indexée sur la Casa** (ce qui est bâti), jamais sur ce qu'on livre : on ne punit pas l'efficacité et on ne récompense pas la retenue. C'est exactement le principe des cargaisons de Hades' Star, qui grossissent avec la planète.

On dimensionne l'offre pour que **la Maison du 90e centile** de son palier serve au plus 80 % :

> **O(Casa) = max( K̂_médiane ÷ σ\*, K̂_P90 ÷ 0,8 )**

Avec K̂_P90 ≈ 1,6 × K̂_médiane (à mesurer) et σ\* = 0,6 : O ≈ max(1,67 ; 2,0) × K̂_médiane = **2 K̂_médiane**. Le médian sert alors environ 50 % des commandes, le très bon 80 %, et personne ne sert tout.

Et pour qu'il y ait toujours **un choix à chaque session**, il faut que **les commandes visibles à une session ≥ 1,5 × ce que la flotte emporte en une session**. On le règle par les plafonds (`cap`) et les échéances (§ 2.9) :

> commandes visibles d'une ville ≈ min(cap, λ × T), avec λ = 1 ÷ `everyMinutes` et T l'échéance

Avec λ × T ≈ 1,5 × cap, la ville est presque toujours pleine **et** se renouvelle.

### 3.3 Les cibles de taux de service, par palier

| Paliers | σ en nombre | σ en valeur | Pourquoi |
| --- | --- | --- | --- |
| Casa 1 à 3 | **75 à 90 %** | 85 à 95 % | On apprend : peu de refus, des refus évidents |
| Casa 4 à 9 | **50 à 70 %** | 65 à 80 % | Le cœur : choisir ses villes, ses tournées |
| Casa 10 et plus | **45 à 65 %** | 60 à 75 % | Les contrats et la qualité prennent le relais du volume |

Un σ médian au-dessus de 80 % au milieu de partie signale le retour de la surproduction. En dessous de 40 %, c'est la frustration de « je ne peux rien faire ».

### 3.4 Sans frustration : six garde-fous

1. **Aucune pénalité pour une commande ignorée** : elle part avec son sablier, et c'est tout. Seul ce qu'on a *chargé* craint le retard.
2. **Le filet** : 25 % des commandes sont tirées de ce que la Maison fait déjà (§ 2.8), 70 % en Casa 1 et 2.
3. **Toujours un chemin** : une marchandise demandée est faisable, ou achetable dans une ville à portée.
4. **Rien d'infaisable avant son heure** : les commandes de qualité et les contrats n'apparaissent qu'à la Casa où on peut les servir.
5. **Montrer la sélection comme une réussite** : à la fin d'une tournée, « 3 des 5 meilleures commandes de Vérone livrées », plutôt que « 9 commandes perdues ». Le compteur de commandes parties reste discret.
6. **Indexer M sur la Casa et non sur le joueur** : celui qui optimise mieux sert plus, ce qui le récompense ; la bande de son palier ne le rattrape pas.

### 3.5 Le chiffrage des valeurs de M

Il se fait au simulateur, après la refonte des volumes (§ 2.0). Valeurs de départ, avec lotBase = 4 caisses au palier brut :

| Casa | 1 | 3 | 5 | 8 | 10 | 12 | 15 | 20 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| M | 1 | 1 | 1,25 | 1,5 | 1,75 | 2 | 2,5 | 3,5 |

**Sans la refonte des volumes, M devrait valoir 6 à la Casa 5 et 14 à la Casa 10** pour obtenir σ = 0,6 (lecture du tableau du § 1.2). Les lots deviendraient alors absurdes en soute. C'est la preuve qu'**il faut d'abord comprimer Y(n)** : le lot ne peut pas porter seul l'écart.

---

## 4. Les prix : la Dogana vivante ou des prix fixes ?

### 4.1 L'état actuel

- **Les commandes** paient la référence régionale, fixe (+15 %, + la distance). Chaque Maison a les siennes, sans concurrence. C'est 80 % du revenu (calibration du 5 novembre).
- **La Dogana** a une pression : la vente la baisse de 12 % par journée de profondeur vendue, avec une demi-vie de 36 h, entre 60 % et 150 %. Sa profondeur (20 + 3 par Maison) est **partagée**. C'est un marché vivant, mais marginal.

### 4.2 Faut-il des prix qui bougent avec l'offre des joueurs, à la Offworld ?

**Ce qu'apporte Offworld** : la **dépendance négative à la fréquence**. Si tout le monde fait de l'acier, l'acier ne vaut plus rien, et cela suffit à diversifier les stratégies sans règle de plus. C'est le meilleur antidote connu à la « solution du wiki ».

**Ce qu'il coûte ici** :
- en temps réel, il récompense **la présence** : vendre avant les autres, guetter le pic. C'est contraire à la règle 7 ;
- l'influence d'un joueur sur le prix d'un autre, quand un vétéran écrase un cours, frôle la règle 1 et décourage les nouveaux ;
- et il **brouille** la lisibilité d'une commande : « combien me paie Vérone ? ».

**Ma recommandation, un hybride : la mercuriale du matin.**
1. **Les commandes gardent un prix lisible**, la référence × une **mercuriale** régionale, recalculée **une fois par jour** (à heure fixe, « les cours du matin »).
2. **Mercuriale(région, bien) = clamp( (D_attendu ÷ D_7j)^ε , 0,80 , 1,25 )**
   - D_7j : les caisses livrées par **tout le serveur** dans la région sur 7 jours ;
   - D_attendu : ce qui serait livré si les Maisons se répartissaient selon les goûts ;
   - ε = 0,25.

   Doubler l'offre d'une marchandise en baisse le cours de 16 %. Une marchandise délaissée remonte jusqu'à +25 %.
3. **La contribution d'une Maison au calcul est plafonnée**, à 2 % de D_attendu : aucune Maison ne fait le cours seule, et la manipulation coûte trop cher.
4. **La Casa 1 à 8 ne pèse pas sur le cours** (elle s'y soumet seulement) : le vétéran ne gâte pas le marché du nouveau, et le nouveau ne fait rien bouger par accident.
5. **Le bradage sort de la Dogana**. Il va au « rigattiere », à 25 % de la référence, plafonné par jour (§ 2.1), **sans effet sur la pression**. Brader ne doit jamais nuire à un autre joueur.
6. **La Dogana reste** pour acheter des intrants et vendre au prix courant, avec sa pression actuelle. C'est le marché des opportunistes.

**Ce qu'on voit** :
- sur l'enseigne de chaque ville, **une flèche de cours** par marchandise (verte qui monte, brique qui descend), mise à jour le matin ;
- dans la Compagnie, **la mercuriale** : un tableau en marques de marchandises, un sujet de conversation quotidien (« le verre de Venise remonte, trois Maisons ont lâché »).

### 4.3 Comment éviter que tout le monde fasse la même chose

| Levier | Mécanisme | Où |
| --- | --- | --- |
| **Hétérogénéité des dotations** | Terroir du domaine tiré par Maison, gisements découverts différemment, filons propres | § 2.2, 2.6 |
| **Dépendance négative à la fréquence** | Mercuriale lente | § 4.2 |
| **Contenu qui tourne** | Mode de la semaine, saisons, contrats | § 2.8, 6.2 |
| **Plusieurs chemins de rentabilité voisine** | Recettes à ±20 %, négoce vs production à ±20 %, Porta à 10–25 % | § 2.4, 2.11, 2.12 |
| **La complémentarité récompensée** | Contrats de compagnie qui exigent 4 à 6 marchandises de chaînes différentes | § 2.10, 6.8 |
| **Des titres de spécialité** | « Maître verrier de Murano » pour 500 caisses de verre fin livrées : une identité à afficher | Compagnie, profil |

---

## 5. Adapter le simulateur

### 5.1 Ce qu'il fait aujourd'hui

- Un pas d'une heure sur 24 mois, quatre cohortes de 200 Maisons, quatre profils d'activité et quatre penchants.
- **Sessions** : `collect` (production depuis la dernière relance, bornée à 12 h, intrants **× quantité produite**), `deliverOrders` (les places de soute × `roundsPerSession`, les mieux payées d'abord), `sellSurplus` (le reste à la Dogana), puis les constructions dans un ordre fixe : Casa d'abord, puis ateliers sauf ceux qui s'entassent, etc.
- **Ce qu'il ne voit pas** : le temps des gestes, la place, les choix entre commandes (il prend tout ce qu'il peut), les stratégies concurrentes à l'intérieur d'un même penchant.

### 5.2 Les corrections préalables (avant toute mesure)

1. **Les formules exactes du moteur** : la production par fournée de `collectWorkshop` (sorties × Y, intrants × 1 tant que le moteur ne change pas), et `highRecipeRaw` en fournées. Mieux : appeler les fonctions pures du moteur plutôt que de les réécrire. L'écart actuel invalide toute mesure de surproduction.
2. **Des bots qui montent leurs ateliers comme des joueurs** : retirer le garde-fou `pilesUp` d'un profil au moins (« le joueur naïf »), pour mesurer ce que la règle laisse faire, et non ce qu'un bot prudent fait.
3. **Une politique de flotte réaliste** : acheter la charrette dès qu'elle se paie en moins d'un jour.

### 5.3 Ce qu'il faut modéliser

| Élément | Modèle | Fichiers |
| --- | --- | --- |
| Magasin | Places par fondaco, encombrement, arrêt des ateliers, consignes (jet ou bradage au-delà de N) | `bots.ts` (`collect`), `model.ts` (`House.store`) |
| Échéances et goûts | File de commandes avec date de naissance et sablier ; tirage par goûts, mode, filet | `cityOrdersNow` |
| Choix des commandes | Sac à dos : maximiser la valeur sous places × temps de tournée, et non « les mieux payées d'abord » | `deliverOrders` |
| Tournées | Un graphe d'arrêts et un temps par tronçon selon le terrain ; charger et décharger ; achats locaux | nouveau `route.ts` |
| Extraction | Gisements par Maison, richesse, équipes, vivres, tas | nouveau `extraction.ts` |
| Bras et table | Population, postes, rations, plancher | `bots.ts` |
| **Budget de gestes** | Chaque geste coûte des secondes (charger une commande 3 s, tracer une tournée 20 s, relancer une tournée enregistrée 4 s, jeter une pile 2 s, déplacer un ouvrier 3 s, équiper 5 s) ; une session a un budget (4 min pour un médian, 8 pour un assidu) ; le bot choisit ses gestes par valeur à la seconde | `session` |
| **Archétypes** | Six politiques paramétrées : producteur-livreur, négociant (fret de retour), carrier (extraction et contrats), artisan de qualité, condottiere (Porta), généraliste | `defaults.ts` (`bent`) |
| **Bot optimiseur** | Une recherche aléatoire ou évolutionnaire (CMA-ES, ou 200 tirages) sur 8 à 12 paramètres de politique, à revenu du mois 3 et du mois 6 | nouveau `optimise.ts` |

### 5.4 Les indicateurs de profondeur et leurs cibles

| Indicateur | Définition | Cible | Alerte |
| --- | --- | --- | --- |
| **Taux de service** (nombre, valeur) | Livré ÷ offert, médiane par palier | § 3.3 : 75–90 % au début, 50–70 % au milieu, 45–65 % à la fin | > 80 % au milieu : surproduction ; < 40 % : frustration |
| **Part jetée, bradée ou gâtée** | En valeur de la production | **3 à 10 %** | > 20 % : produire n'est plus une décision |
| **Temps-atelier à l'arrêt** (magasin plein, intrant manquant, sans bras) | Part du temps | **5 à 20 %** pour un médian | > 30 % : plafond trop bas, ou demande trop faible |
| **Heures pour remplir le magasin** | Plafond ÷ entrée nette | **12 à 30 h** | < 8 h ou > 48 h |
| **Diversité des stratégies** | exp(entropie de Shannon) des grappes de Maisons, groupées par leur mix de revenu (commandes par bien et par région, négoce, contrats, Porta) | **≥ 4 stratégies effectives** sur 6 archétypes ; aucune ne dépasse 35 % du quart supérieur | 1 ou 2 grappes : il y a une solution |
| **Dominance** | Revenu du meilleur archétype ÷ celui du 3e, et ce que trouve l'optimiseur | **≤ 1,15** ; l'optimiseur ne converge pas vers la même politique sur 3 graines | > 1,25, ou la même politique optimale partout |
| **Décisions serrées** | Part des choix de bot (tournée, recette, gisement) où la 2e option vaut au moins 85 % de la 1re | **≥ 40 %** | < 20 % : les choix sont évidents |
| **Temps de session** | Gestes simulés par session | **3 à 6 min** en médiane, P90 ≤ 10 min ; gestes de corvée (jeter, recharger, déplacer) ≤ 25 % | > 10 min, ou plus de 40 % de corvée |
| **Coût de l'absence** | Revenu des 7 jours après une absence de 3 jours, vs une Maison continue de même Casa | **≤ 15 %** (≤ 30 % pour 7 jours) ; reprise en 2 sessions | > 30 % |
| **Spirale** | Part des Maisons sous 70 % de production plus de 48 h d'affilée | **< 3 %** | > 5 % |
| **Écart des cohortes** | Revenu du nouveau ÷ celui du vétéran au même palier ; sortie de la 1re bande | **≥ 0,85** ; les cibles actuelles | < 0,7 |
| **Puits ÷ sources** | Comme aujourd'hui | 0,6–0,8 (jeunes), 0,9–1,0 (anciennes) | > 1,05 ou < 0,8 pour les anciennes |
| **Part de la Porta** | Dans le revenu, Casa ≥ 10 | **10 à 25 %** | > 35 % |
| **Contrats achevés** | Livrés ÷ acceptés | **60 à 80 %** | > 95 % : trop faciles ; < 40 % |
| **Écart de la mercuriale** | Indice min et max sur 7 jours, par bien | **0,85 à 1,15** en régime | Collé aux bornes : la fréquence domine |

### 5.5 Les scénarios à faire tourner

1. **Référence corrigée** : les formules du moteur, le joueur naïf. On doit y retrouver le tableau du § 1.2 (ratio de 3 à 25).
2. **Lot 1 seul** (magasin plafonné) : la mesure du temps-atelier à l'arrêt (je prédis plus de 60 % dès la Casa 8, ce qui justifie de ne pas livrer le lot 1 seul).
3. **Lots 1 et 2 et la correction des intrants** : le taux de service, la part jetée.
4. **Plan complet, volumes comprimés** : toutes les cibles.
5. **Le tournoi des archétypes et l'optimiseur** : la dominance.
6. **L'absence** : des profils qui partent 3 et 7 jours à date fixe.

---

## 6. Huit propositions nouvelles qui créent de la profondeur économique

Chacune porte sur une **décision** (investir, risquer, arbitrer dans le temps) et sur **une image**. Les paramètres vont dans `worlds.settings`, et chaque proposition absorbe ou prolonge un système existant, au lieu de s'ajouter.

### 6.1 La promessa : les commandes à terme (arbitrage temporel, risque)

- **La règle** :
  - une ville propose parfois de **s'engager aujourd'hui** à livrer N caisses dans 3 à 5 jours, à un prix fixé maintenant (+20 à +35 %) ;
  - on dépose une **caution** de 10 %, perdue si l'on échoue (sans autre pénalité) ;
  - le joueur parie sur sa capacité future, et réserve sa production et sa place.
- **Elle absorbe** les « contrats à terme » (`forwards`, Casa 8, déjà dans `opens`).
- **Paramètres** : `forwards: { premiumBps: [2000, 3500], depositBps: 1000, horizonDays: [3, 5], perWeek: 2 }`.
- **Ce qu'on voit** : un **parchemin scellé de cire** épinglé au quai de la ville, avec un ruban à 3 ou 5 crans qui se consument, un par jour. À la livraison, le sceau se brise dans une gerbe d'or ; à l'échec, la cire fond et la caution tombe en pièces.

### 6.2 Le calendrier des saisons : stocker pour plus tard (arbitrage temporel)

- **La règle** : un cycle de 4 semaines, le chapitre (le mois), connu d'avance :
  - le Carême : le poisson salé ×1,6 en demande ;
  - les vendanges : le vin local −30 % à l'achat ;
  - la foire de la Sensa : Venise veut du fin ×1,5 ;
  - l'hiver : les cols fermés aux charrettes, ouverts aux mules.

  **Le magasin plafonné devient un actif** : garder 20 caisses de sel pour le Carême, c'est renoncer à 20 caisses de place pendant deux semaines.
- **Paramètres** : `seasons: [{ week: 1, demandBps: { "fish_salted": 16000 } }, …]`, annoncés dans les notes du chapitre (une règle stable : le calendrier est publié avant le mois).
- **Ce qu'on voit** : **une roue des saisons** dans la barre du haut, qui tourne d'un cran par semaine. Les enseignes des villes changent (poissons pour le Carême, grappes aux vendanges), les caisses en stock portent un petit pictogramme de la saison où elles valent le plus, et les cols blanchissent sur la carte.

### 6.3 Le Banco : emprunter pour bâtir plus tôt (investissement, risque)

- **La règle** :
  - prêter au plus **3 jours de revenu moyen**, à 1,5 % par jour ;
  - le remboursement est **automatique**, par 20 % de chaque recette ;
  - **aucune saisie** (règle 1) : le seul coût est l'intérêt, et un nouveau prêt est impossible tant que le précédent court.

  La décision : faire l'entrepôt ou le niveau **maintenant**, quand la saison ou le contrat le paie, plutôt que dans deux jours.
- **Ce qu'il absorbe** : la « colleganza » d'aujourd'hui (le capstone Banco de l'Abaco donnerait −0,5 % d'intérêt).
- **Paramètres** : `bank: { maxDaysOfIncome: 3, dailyRateBps: 150, repayShareBps: 2000, fromCasa: 4 }`.
- **Le risque économique à surveiller** : la spirale de dette, empêchée par le plafond et l'absence de prêt en cascade. Et l'inflation : l'intérêt est un **puits**, ce qui aide puits ÷ sources des anciennes.
- **Ce qu'on voit** : un **coffre cerclé d'une chaîne** au fondaco, dont les maillons tombent un à un à chaque recette ; un filet de pièces part du quai vers le Banco sur la carte.

### 6.4 Les raccourcis par les terres de Rome (risque choisi, règle 2)

- **La règle** :
  - certaines routes ont un **raccourci** qui traverse les terres de Rome : 30 à 40 % plus court, mais avec une chance de 8 à 15 % qu'une patrouille prenne **une part** du chargement (25 %) ;
  - on peut **assurer** (4 % de la valeur) ou **escorter** avec un combattant de la Porta, qui annule le risque mais immobilise le combattant.

  C'est le lien entre la tournée et la Porta, sans risque venu d'un autre joueur.
- **Paramètres** : `shortcuts: [{ from, to, saveBps: 3500, riskBps: 1200, lossBps: 2500 }], insurance: { premiumBps: 400 }`.
- **Ce qu'on voit** : le raccourci **en pointillé sombre** à travers une forêt aux bannières papales, un **anneau de risque** (le pourcentage en arc rouge) sur le tronçon. Le petit combattant d'escorte marche à côté de la charrette. À l'embuscade, les caisses perdues tombent visiblement dans le fossé.

### 6.5 Le carottage : payer pour savoir (valeur de l'information)

- **La règle** :
  - avant d'engager une équipe, on peut **carotter** un gisement (60 ducats, 30 min) : on apprend sa richesse exacte et sa qualité (la part de marbre blanc) ;
  - sans carottage, on n'en voit qu'une fourchette.

  La décision : payer l'information, ou parier, à multiplier par le nombre de gisements.
- **Paramètres** : `extraction.core: { costDucats: 60, minutes: 30, rangeWithoutBps: 3000 }`.
- **Ce qu'on voit** : un **cylindre de carotte** posé à côté du gisement, aux strates colorées (blanc veiné pour le beau marbre, gris pour le commun) ; avant le carottage, le cylindre est flou, comme une silhouette.

### 6.6 Le rodage et la reconversion : s'engager ou rester souple (investissement)

- **La règle** :
  - un atelier qui garde **la même recette** gagne +1 % par jour de marche, jusqu'à +15 % (le rodage) ;
  - en changer coûte **2 à 8 h d'arrêt** (le réoutillage) et remet le rodage à zéro.

  Cela oppose la spécialisation, qui paie en régime stable, à la souplesse, qui saisit la mode de la semaine et les saisons. Le joueur a deux bonnes réponses selon son style : c'est une source de diversité.
- **Ce qu'il absorbe** : le module « apprentis » (`workshopSpeed`) devient le rodage.
- **Paramètres** : `workshops.runIn: { perDayBps: 100, maxBps: 1500 }, retoolMinutes: [120, 480]`.
- **Ce qu'on voit** : sur la tuile, un **ruban à crans** qui se remplit jour après jour. La reconversion se voit en **échafaudage**, avec l'enseigne qu'on repeint.

### 6.7 Le grand œuvre de la ville : un bien public, sans rivalité (coopération)

- **La règle** :
  - chaque grande ville a un **chantier commun à tout le serveur** (le Campanile de Venise, l'Arena de Vérone) ;
  - quand les livraisons cumulées de tous franchissent un seuil, la ville **grandit** : une taille de plus, plus de commandes et d'échéances longues, pour tous ;
  - les contributeurs reçoivent un titre et leur blason sur le monument.

  Aucun joueur ne peut nuire à un autre (règle 1), et la communauté a un objectif commun dont on parle.
- **Paramètres** : `cityWorks: [{ city: "verona", stages: [{ crates: { marble: 5000, wood: 2000 }, sizeUp: 1 }] }]`.
- **Ce qu'on voit** : le monument **monte en 3D** sur la carte, visible de tous, échafaudage par échafaudage. Les caisses livrées volent vers lui aux couleurs de chaque Maison, et une frise montre les blasons des grands contributeurs.

### 6.8 La colleganza de compagnie : la part de galère (investissement partagé, risque PvE)

- **La règle** :
  - la compagnie arme une **galère** vers une région lointaine (le Levant) ; chaque membre y met des caisses ou des ducats et reçoit **sa part** du produit au retour, en 2 à 3 jours ;
  - une chance de 5 à 10 % de corsaires (les terres et mers de Rome, règle 2) retire une part de la cargaison ; une escorte de la Porta la réduit ;
  - les meilleurs retours viennent des cargaisons **variées** : 4 marchandises de chaînes différentes au moins, ce qui récompense la complémentarité des membres.
- **Ce qu'elle absorbe** : les voyages lointains et les « parts de Maison ».
- **Paramètres** : `galley: { days: [2, 3], varietyBonusBps: [0, 1000, 2000, 3500], corsairBps: 800, lossBps: 3000 }`.
- **Ce qu'on voit** : la galère **à quai**, ses cales chargées de caisses aux couleurs des Maisons. Sa voile porte **un camembert des parts**. Sur la carte, sa route vers le Levant et le retour en voiles gonflées, la cargaison déchargée en éventail vers chaque fondaco.

---

## 7. Recommandations au porteur, par ordre de priorité

1. **Avant le lot 1**, corriger les intrants (× Y) dans le moteur, aligner le simulateur sur le moteur, et faire tourner la « référence corrigée ». Cela confirme le § 1.2 en chiffres de simulateur. C'est une petite tâche, mais le reste en dépend.
2. **Décider la compression des volumes** (§ 2.0 : la caisse, les postes) **au moment du lot 1**, même si elle se code au lot 6. Sinon chaque lot sera calibré deux fois.
3. **Livrer ensemble le lot 1 (magasin) et le lot 2 (goûts, échéances, lot indexé sur la Casa)**. Le magasin seul crée des ateliers arrêtés sans décision.
4. **Les stocks d'aujourd'hui** : le magasin ancien qui ne fait que se vider, ou la conversion en ducats sur 4 semaines (§ 2.1). Les laisser tels quels neutralise le lot 1 pour les vétérans.
5. **La mercuriale lente** (§ 4.2) au lot 2 ou 3, le bradage hors marché dès le lot 1.
6. **Un terroir tiré par Maison** au lot 7 : sans lui, le plan du domaine se résout une fois pour tous.
7. **Brancher la Porta sur la production** (vivres, poudre, équipement fabriqué) aux lots 8 et 9.
8. Parmi les propositions du § 6, commencer par **les saisons** (6.2) et **la promessa** (6.1). Elles donnent au magasin plafonné sa valeur d'arbitrage, pour un coût de code modeste.
