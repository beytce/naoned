# Audit du 13 novembre 2026 · 07 · L'économiste et l'équilibrage

Point de vue : celui qui tient la monnaie, les flux et les rythmes. Je n'ai pas joué à l'écran. J'ai fait tourner le moteur pur (`packages/engine/src/planche/`, thème `venice1450.lagune.ts`) sur une lagune de 48 Maisons, avec quatre profils de joueurs, sur 6, 12 et 26 semaines. Chaque chiffre ci-dessous vient d'une mesure ou d'un calcul refait à partir du thème. Les séries sont dans `captures/economie/`.

---

## 1. Verdict

**Note : 4/10 pour la question « l'économie tient-elle sur un an ? ».**

La comptabilité est solide : le livre tombe juste au denier près dans les 18 marées simulées, et la création de ducats d'une lagune est bornée par la demande des villes (environ 1,2 million de ducats par semaine, quel que soit le niveau atteint). Il n'y a donc ni emballement ni inflation des prix. Mais trois choses ne tiennent pas un an :
- **Le Large est la stratégie dominante.** Il représente 62 % de la valeur de la demande de la lagune. Un joueur seul qui prend le détour vend 37 fois plus qu'un joueur qui ne le prend pas.
- **Les ducats ne servent plus à rien à partir de la 3ᵉ semaine.** Le revenu plafonne à environ 22 000 ducats par semaine et par Maison, et rien de ce qu'on achète ne le fait remonter. Les bourses grossissent sans but.
- **La progression est un calendrier, le même pour tous.** Le plafond de 500 de Prestige par semaine retient tout le monde : le niveau 30 tombe en semaine 34, et rien ne bouge pendant les 18 semaines suivantes.

---

## 2. Ce que j'ai fait

**Le banc.** J'ai écrit mon propre banc, `eco.ts` (dans mon dossier de travail, copié le temps de chaque exécution dans `apps/simulator/src/` puis supprimé). Il simule la lagune de Venise (48 Maisons, 4 sestieri), avance heure par heure, joue les sorties des capitaines à leur heure, et relève chaque semaine :
- les ducats créés, ce que coûte l'île, ce que brûlent les péages, la masse détenue ;
- le remplissage des jauges du Large ;
- pour chaque profil : niveau, Prestige, ventes, part des ventes faite au Large, cases, navires et plans.

**Les quatre profils**, 12 Maisons chacun. Le profil tourne d'une graine à l'autre, pour que la place sur la carte ne fausse rien.

| Profil | Visites | Problème du jour | Tours | Détroits noirs |
| --- | --- | --- | --- | --- |
| ordinateur | toutes les 8 h, `plancheRobot` sans détour, comme sur le serveur | — | — | — |
| occasionnel | 4 soirs par semaine, à 19 h | à chaque visite, réussi 6 fois sur 10 | — | — |
| régulier | 8 h, 13 h et 20 h | chaque jour | une tour tentée un jour sur deux, gagnée 4 fois sur 10 | — |
| assidu | toutes les 2 h, de 7 h à 23 h | chaque jour | une tour tentée par jour | deux essais par jour dès le niveau 11, gagnés 3,5 fois sur 10 ; plans assemblés |

Chaque joueur décide comme le marchand de l'ordinateur (`plancheRobot`), avec le détour permis : il prend la ville qui rapporte le plus, détour compris.

**Les scénarios** (au total 18 marées simulées, environ 45 minutes de calcul) :

| Code | Composition | Ce qui change | Durée |
| --- | --- | --- | --- |
| A | les quatre profils | base (tours gagnées 4 fois sur 10) | 12 semaines, 3 graines |
| B | les quatre profils | sans détour | 12 semaines, 3 graines |
| C | les quatre profils | aucune tour gagnée : le détour est la seule voie vers le Large | 12 semaines, 3 graines |
| D1, D2 | « le stratège seul » : 4 joueurs réguliers et 44 Maisons de l'ordinateur, aucune tour gagnée (le cas d'une lagune qui s'ouvre) | D1 avec le détour, D2 sans | 6 semaines, 2 graines |
| T1 à T6 | selon le cas | les réglages proposés | 6 semaines, 2 graines |
| Y | les quatre profils | base, pour la tendance longue | 26 semaines, 1 graine |

Le reste est calculé à partir du thème : la demande de chaque anneau de villes, le calendrier des niveaux, le coût des cases, le phare et la Muda.

---

## 3. Les mesures

### 3.1 La masse monétaire (scénario A, médiane de 3 graines, en ducats)

| Semaine | Créés (ventes) | Dépensés dans l'île | Brûlés (péages) | Détenus (48 Maisons) | Puits / sources |
| --- | --- | --- | --- | --- | --- |
| 1 | 165 000 | 164 000 | 1 900 | 144 000 | 1,00 |
| 2 | 1 094 000 | 702 000 | 52 000 | 469 000 | 0,69 |
| 4 | 1 166 000 | 501 000 | 41 000 | 1 562 000 | 0,47 |
| 6 | 1 453 000 | 983 000 | 52 000 | 2 348 000 | 0,71 |
| 8 | 1 271 000 | 864 000 | 45 000 | 2 874 000 | 0,72 |
| 10 | 1 254 000 | 513 000 | 43 000 | 4 159 000 | 0,44 |
| 12 | 1 258 000 | 536 000 | 45 000 | 5 539 000 | 0,46 |

Ce que montre ce tableau :
- **La création plafonne dès la 2ᵉ semaine**, entre 1,1 et 1,3 million de ducats par semaine. C'est la demande des villes qui la borne, pas les joueurs. Il n'y a donc pas d'emballement : c'est le bon côté de ce tableau.
- **Les puits n'absorbent que la moitié de ce qui est créé** (0,46 en régime établi). La masse détenue augmente donc de 650 000 ducats par semaine, soit **13 500 ducats par Maison et par semaine**, environ 700 000 par Maison sur un an. Le résultat est le même sans détour (B : 5,4 millions détenus en semaine 12) et sans tours (C : 6,3 millions).
- **Les péages ne brûlent que 3,6 %** de ce qui est créé. C'est le seul puits qui détruit vraiment la monnaie, et il est marginal.

### 3.2 Le Large et le détour

**Ce que vaut chaque anneau de villes**, au plein prix, calculé depuis `venice1450.lagune.ts` (demande × 1,5) :

| Anneau | Unités demandées par heure | Ducats par heure au plein prix | Part de la valeur |
| --- | --- | --- | --- |
| les 12 villes des sestieri | 444 | 3 661 | 27 % |
| les 3 villes de la lagune (Murano, Rialto, Chioggia) | 357 | 1 490 | 11 % |
| les 4 villes du Large | 196 | 8 436 | **62 %** |

Une unité vendue au Large vaut en moyenne **43 ducats**, contre 8 dans un sestiere et 4 dans la lagune. Même au prix plancher (50 % au Large, contre 30 % ailleurs), elle vaut encore 2,6 fois une unité d'un sestiere au plein prix.

**Ce qu'on vend après six semaines** (scénarios D, médiane de 2 graines, ventes cumulées en ducats) :

| | D1 : un joueur régulier qui prend le détour | D2 : le même sans détour | Une Maison de l'ordinateur |
| --- | --- | --- | --- |
| Vendu en 6 semaines | **1 223 664** | 32 791 | 23 092 |
| Part du Large | 91 % | 0 % | 0 % |
| Jauges du Large (remplissage moyen) | 81 % à 98 % : jamais vidées | 100 % | — |
| Prestige, niveau en semaine 6 | 2 953, niveau 13 | 1 761, niveau 10 | — |

Le détour multiplie les ventes par **37**. Dans une lagune pleine de joueurs qui le prennent tous (C), les jauges du Large tombent à 2 ou 3 % dès la 3ᵉ semaine ; le Large fait pourtant encore 83 à 97 % des ventes de chaque joueur, et un joueur régulier vend 1,7 fois une Maison de l'ordinateur.

**Le détour et les tours ne se cumulent pas.** Dès que des joueurs tiennent les tours (A), la route s'ouvre à tous, ordinateur compris. Le détour ne change alors presque plus rien : on mesure les mêmes ventes avec et sans lui (A et B, à 2 % près). Mais le Large fait toujours 48 à 60 % des ventes de chaque profil. **Le problème est le prix du Large, pas le détour.**

### 3.3 L'écart entre les profils (A, semaine 12)

| Profil | Niveau | Prestige | Vendu (cumul) | Vendu, semaine 12 | Ducats détenus | Dépensé dans l'île |
| --- | --- | --- | --- | --- | --- | --- |
| ordinateur | 17 | 5 019 | 241 576 | 21 646 | 135 331 | 84 706 |
| occasionnel | 16 | 4 978 | 218 319 | 19 762 | 119 940 | 69 606 |
| régulier | 17 | 5 722 | 247 525 | 21 932 | 157 037 | 84 706 |
| assidu | 18 | 5 912 | 413 125 | 40 354 | 12 361 | 402 779 |

- **La règle 7 est tenue, presque trop.** L'occasionnel, qui vient 4 soirs par semaine, vend 88 % de ce que vend le régulier et a un ou deux niveaux de retard. L'assidu ne gagne que 19 % de Prestige de plus que l'occasionnel.
- **En ducats, l'assidu va deux fois plus vite** (×1,9 en ventes), mais ce surplus vient presque entièrement des détroits noirs : environ 100 000 ducats par assidu en six semaines. Sans eux, il vend autant que le régulier.
- **Ses 400 000 ducats investis dans l'île ne lui rapportent rien.** Ventes de chaque semaine, hors détroits noirs : environ 22 000 pour l'assidu, autant pour le régulier.

### 3.4 Le revenu ne monte plus après la 3ᵉ semaine

Ventes de la semaine du joueur régulier (A) :

| Semaine | 2 | 3 | 4 | 6 | 8 | 10 | 12 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Ventes de la semaine | 22 557 | 20 332 | 21 585 | 24 378 | 21 504 | 22 239 | 21 932 |
| Niveau | 7 | 8 | 10 | 12 | 14 | 16 | 17 |
| Bobines | 4 | 6 | 6 | 7 | 7 | 8 | 8 |

Le revenu reste plat alors que le niveau double et que les bobines passent de 4 à 8. La raison :
- **la demande** : 997 unités par heure pour toute la lagune ;
- **la capacité des fils** : 48 Maisons × 6 bobines × 10 unités par heure = **2 880 unités par heure dès le niveau 8**, soit trois fois la demande.

Chaque bobine gagnée après la 6ᵉ (niveaux 12, 16, 18, 21, 25 et 30) ne rapporte donc rien dans une lagune pleine. Il en va de même pour l'île : un seul atelier brut de niveau 2, avec son bonus de terrain, fait 30 à 45 unités par heure, de quoi remplir quatre à six bobines.

### 3.5 La progression

Le plafond de 500 de Prestige par semaine est atteint par l'assidu dès la semaine 2, et par le régulier dès la semaine 3. L'occasionnel en est à 480 ou 500. La courbe `20 × (n − 1)²` donne alors le même calendrier pour tous :

| Semaine | 1 | 2 | 3 | 4 | 6 | 8 | 12 | 16 | 20 | 25 | 34 | 35 à 52 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Niveau (500 par semaine) | 6 | 8 | 9 | 11 | 13 | 15 | 18 | 21 | 23 | 26 | **30** | 30 : plus rien |

**Ce qui ne s'ouvre jamais**, d'après la table `unlocks` (`venice1450.lagune.ts:290-304`) et le reste du thème :
- **Le niveau 15 (`tier: 3`) n'ouvre rien.** Aucun atelier de rang 3 n'existe dans le thème : il n'y a que les rangs 1 et 2, et l'Arsenal.
- **Ne donnent rien du tout** : 7, 9, 13, 14, 15, 17, 19, 20, 22, 23, 24 et 26 à 29.
- **Ne donnent qu'une bobine**, qui ne rapporte rien (§ 3.4) : 12, 18, 25 et 30.

Au-delà du niveau 12, le joueur gagne donc **deux choses utiles en 22 semaines** : 4 cases au niveau 16 et 4 au niveau 21, plus quelques places de flotte et de port (10, 16, 21 et 30).

**L'accès au Large commande aussi le Prestige.** Le commerce rapporte au plus 55 de Prestige par jour, à raison d'un point pour 50 ducats vendus : il faut donc vendre 2 750 ducats par jour. Sans le Large, on n'y arrive pas. D2 n'atteint que le niveau 10 en semaine 6, contre 13 pour D1 : 40 % de Prestige en moins pour qui ne connaît pas le détour.

### 3.6 Les sources récentes

**Détroits noirs (scénario A).** Par graine : 1 176 essais, 35 % gagnés, 126 à 130 plans, soit **1,8 plan par semaine pour chaque assidu**. En semaine 12, l'assidu médian garde **9 plans inutilisés**. Un plan ne sert qu'à deux choses : l'Arsenal au niveau 3 (un seul plan), et la nef d'escorte (niveau 16, dans la limite des places de flotte). Le rang 3 qui devait en consommer n'existe pas.

En ducats, un essai rapporte à peu près autant qu'une vente ordinaire :
- le port lointain paie 1,5 fois le meilleur prix au plein, soit 97 ducats pour le verre ;
- une partie gagnée vaut donc 0,35 × 97 ≈ 34 ducats par unité, une partie perdue coûte 0,65 × 32 ≈ 21 ducats par unité au Large vide.

Le gain réel est donc le Prestige (25 par détroit forcé) et les reliques. C'est un bon pari ; mais il y a trop de plans pour trop peu d'usages.

**La Muda.** Elle prend au plus 20 unités par jour, 60 par semaine. Au prix du môle (13,8 ducats pour le verre) et × 2,5 si les trois détroits sont passés, elle rapporte **2 070 ducats par semaine au mieux**. C'est 9 % du revenu d'une Maison établie, et 1 % de celui du joueur qui prend le détour. Son Prestige (30 + 5 + 25) passe sous le plafond de la semaine, déjà atteint. La Muda est utile au nouveau joueur et inutile ensuite (cf. muda-bench : + 18 % sur 4 semaines pour une petite Maison).

**Le phare** (`compagnie.beacon`). Seuils 0, 800, 2 400, 5 000 et 9 000 ; 60 points par jour et par membre. Une compagnie de 6 membres donne 360 points par jour :
- niveau 2 en **3 jours**, niveau 4 en **14 jours**, niveau 5 en 25 jours ;
- au niveau 4, chaque membre a **deux places de port de plus par passe**, pour toujours, alors qu'un joueur seul en a 2, puis 3 au niveau 16 ;
- calibration.md l'a mesuré : un port de compagnie perd 0,38 sceau par assaut subi, contre 0,93 sans phare.

Il est trop fort et trop rapide.

**L'encre.** Elle part de la rangée 25 et monte d'une rangée par semaine, au plus jusqu'à la rangée 15 ; une tour tenue la repousse de 0,08 rangée.
- Avec les tours tenues (A), elle avance de **0,2 rangée par semaine**. Sans tours (C), elle atteint 20 en semaine 5, puis reflue à la fin de la marée.
- **Elle n'atteint jamais les bouches** (rangée 17) en une marée de 6 semaines. Elle ne menace que les détroits (rangée 21, à partir de la semaine 4) et les villes du Large.
- Au Large, elle paie 15 % de plus et fait perdre 25 % du chargement, soit 14 % de recette en moins. L'enjeu est faible.

**Les sorties.** Dans A, les 10 tours sont prises par des joueurs dès la semaine 1 (36 joueurs essaient chaque jour). Elles restent tenues jusqu'à la fin de la marée et redeviennent aux corsaires au changement de marée (semaines 6 et 12). Les sorties ne reprennent presque rien à une lagune qui joue.

**Les ligues.** Je n'ai pas de mesure nouvelle (le modèle abstrait de `maree-bench` est cité dans calibration.md). Remarque : sur un an, l'échelle des ligues est le seul but qui dure, mais elle ne s'appuie sur aucun chiffre économique.

### 3.7 Le type d'île (A, ventes cumulées en 12 semaines, médiane des joueurs)

| Plan de l'île | Vendu | Joueurs |
| --- | --- | --- |
| Sablière, bûcherons, verrerie | 376 348 | 14 |
| Ferme, moulin, chanvre, saline | 360 764 | 13 |
| Bûcherons, scierie, argile, briqueterie | 252 260 | 16 |
| Saline, chanvre, corderie | 224 710 | 18 |
| Argile, bûcherons, briqueterie | **144 390** | 15 |

L'île de la brique vend **2,6 fois moins** que celle du verre, et son terrain est imposé par la place de la Maison. Même ordre sans tours (C) : 352 000 contre 155 000.

### 3.8 La tendance sur 26 semaines (Y)

Une graine, les quatre profils, 26 semaines (`captures/economie/Y-26semaines.csv`) :

| Semaine | 6 | 12 | 18 | 26 |
| --- | --- | --- | --- | --- |
| Monnaie créée dans la semaine (millions de ducats) | 1,45 | 1,28 | 1,38 | 1,37 |
| Monnaie détenue (millions de ducats) | 2,28 | 5,54 | 9,92 | **15,84** |
| Puits / sources | 0,71 | 0,44 | 0,45 | 0,44 |
| Niveau médian (occasionnel, régulier, assidu) | 11, 12, 13 | 16, 17, 18 | 20, 21, 22 | 25, 26, 26 |
| Ventes de la semaine du régulier | 25 179 | 19 400 | 20 109 | 20 200 |
| Ducats détenus par le régulier | 37 039 | 157 037 | 323 579 | **458 074** |
| Plans gardés par l'assidu (inutilisés) | 0 | 9 | 20 | **34** |
| Cases de l'île : régulier, assidu | 8, 8 | 8, 18 | 8, 25 | 8, 29 |

Lecture :
- **La monnaie créée reste constante** sur six mois, et la masse détenue monte en ligne droite : environ 30 millions de ducats par lagune sur un an.
- **Le revenu du régulier baisse même un peu**, de 25 000 à 20 000 ducats par semaine, alors qu'il passe du niveau 12 au niveau 26.
- **Il n'y a qu'un vrai puits : les cases**, dont le coût croît de 25 % à chacune. Seul l'assidu y entre, parce qu'il a des plans : il y met 980 000 ducats pour aller jusqu'à 29 cases, sans vendre davantage (E7).
- **Les plans montent à 34** sans usage.

---

## 4. Constats

| Id | Gravité | Constat | Preuve | Proposition |
| --- | --- | --- | --- | --- |
| E1 | **P0** | **Le Large est la stratégie dominante.** Il représente 62 % de la valeur de la demande pour 20 % des unités, à 43 ducats l'unité contre 8 dans un sestiere. Seul dans sa lagune avec le détour, un joueur vend 37 fois plus que sans (53 fois plus qu'une Maison de l'ordinateur), et ses jauges restent pleines (81 à 98 %). | § 3.2 ; D1 contre D2 ; `venice1450.lagune.ts:211-237` et `:250` ; `planche.ts:529` (le détour, 60 % de la charge). | R1 (mesuré, § 5). |
| E2 | **P1** | **Les ducats perdent leur usage dès la 3ᵉ semaine.** Les puits n'absorbent que 46 % de ce qui est créé : +13 500 ducats par Maison et par semaine, environ 700 000 sur un an. Investir dans l'île ne rapporte rien : l'assidu y a mis 400 000 ducats et vend, hors détroits noirs, autant que le régulier. | § 3.1, § 3.3, § 3.4 ; séries `captures/economie/A-base.csv`. | R6 : un puits qui achète quelque chose de vrai, et non de la production en plus. |
| E3 | **P1** | **Les bobines au-delà de 6 ne rapportent rien.** La capacité des fils est de 2 880 unités par heure dès le niveau 8, la demande de la lagune de 997. Le revenu du régulier reste plat (20 000 à 24 000 ducats par semaine) de la semaine 2 à la semaine 12, alors qu'il passe de 4 à 8 bobines. | § 3.4. | Que les niveaux ouvrent de la demande (des villes, des parts réservées, des commandes) et non des bobines ; ou bien une demande qui suit le nombre de joueurs actifs de la lagune. |
| E4 | **P1** | **La progression est un calendrier fixe.** Le plafond de 500 par semaine est atteint par tous dès la semaine 2 ou 3. Le niveau 30 tombe en semaine 34, puis il ne se passe plus rien pendant 18 semaines. Entre l'occasionnel et l'assidu : 19 % de Prestige et un ou deux niveaux d'écart. | § 3.5 ; `maison.ts:127` ; `venice1450.lagune.ts:281` et `:306`. | R5 : une courbe `curve: 28` (le niveau 30 en semaine 47) ; garder le plafond. |
| E5 | **P1** | **Douze niveaux n'ouvrent rien, et le niveau 15 promet un rang 3 qui n'existe pas.** Aucun atelier de rang 3 dans le thème. Le Prestige du commerce dépend en outre de l'accès au Large : sans lui, le niveau 10 au lieu de 13 en semaine 6. | § 3.5 ; `venice1450.lagune.ts:299` ; `venice1450.planche.ts` (ateliers des rangs 1 et 2 seulement). D2 contre D1. | Créer le rang 3 ou retirer `tier: 3`. R2 : `perDucats` à 15 (mesuré). |
| E6 | **P1** | **Les plans s'entassent.** 1,8 plan par semaine pour un assidu à 35 % de réussite ; 9 plans inutilisés en semaine 12 ; deux seuls usages. | § 3.6 ; `noir.ts:242-283` ; `venice1450.lagune.ts:452`, `:459` et `:460`. | R3 : `triesPerDay: 1` et `relicsPerPlan: 5`, soit 0,5 plan par semaine. |
| E7 | **P2** | **Les Maisons de l'ordinateur cessent de bâtir dès l'Arsenal au niveau 2.** `plancheRobotBuild` veut monter l'atelier le plus bas, et c'est l'Arsenal. Il faut une bourse de 120 000 ducats (2 × 60 000), puis un plan que l'ordinateur n'a jamais. Le plan n'est donc « jamais au sommet » : ateliers figés au niveau 2, île à 8 cases. Cela explique la faiblesse de l'ordinateur relevée en 02-S13, et cela sous-estime les puits de tous les bancs (`arsenal-bench` : « puits / sources » ≈ 0,6). | Relevé en semaine 5 : le régulier, niveau 11, a 77 429 ducats et tous ses ateliers au niveau 2 ; `robot.ts:153` (`top`), `:202` et `:205`. Seuls les assidus, qui ont des plans, recommencent à acheter des cases (de 8 à 18, de la semaine 7 à la semaine 12). | Exclure l'Arsenal du critère `top` et du `raise` de `plancheRobotBuild`, puis remesurer `arsenal-bench` et `maison-bench`. |
| E8 | **P2** | **Le phare est trop rapide et trop fort** : niveau 4 en 14 jours pour 6 membres, et deux places de port de plus par passe, pour toujours. | § 3.6 ; `venice1450.lagune.ts:380` ; calibration.md, § Le membre paisible et le phare. | R4 : seuils × 3, soit le niveau 4 en 6 semaines. |
| E9 | **P2** | **La Muda ne pèse rien en ducats pour une Maison établie** : 2 070 ducats par semaine au mieux, 9 % du commerce. | § 3.6 ; `venice1450.lagune.ts:492` et `:493`. | La garder comme rendez-vous du nouveau joueur ; plafond du jour à proportion du niveau (20 + 2 par niveau). |
| E10 | **P2** | **L'encre ne menace jamais la lagune** : 0,2 rangée par semaine quand les tours sont tenues, au plus jusqu'à la rangée 20 en une marée. Elle ne touche que le Large et les détroits. | § 3.6 ; scénarios A et C. | Assumer qu'elle est une menace sur le Large ; ou `rise: 150`, pour toucher les bouches en semaine 6 si personne ne joue. |
| E11 | **P2** | **Le type d'île varie du simple au double et demi** : la brique vend 144 000, le verre 376 000. Le terrain est imposé. | § 3.7 ; déjà relevé dans calibration.md (§ Les lagunes). | Relever la demande et les prix de la brique : le Large paie la brique 30 à 42 et le verre 38 à 65. |
| E12 | **P2** | **Les péages ne détruisent que 3,6 %** de la monnaie créée, et rien d'autre ne la détruit. | § 3.1. | Voir R6. |

---

## 5. Les réglages proposés, mesurés (`worlds.settings`)

### R1. Le Large ramené à deux à cinq fois un sestiere

Les réglages, sur les villes de l'anneau `large` :
- `wants.*.price` × 0,6 ;
- `floorBps` à 3 000 (au lieu de 5 000) ;
- `detourBps` à 2 000 ;
- et un nouveau réglage, `detourMinLevel: 6`, qui demande une ligne dans `plancheThread`.

| Mesure | Avant | Après |
| --- | --- | --- |
| Le détour seul, vendu en 6 semaines (D1 → T3) | 1 223 664 | 156 207 |
| Le détour contre pas de détour (D2 : 32 791) | × 37 | **× 4,8** |
| Le même avec le détour au niveau 6 seulement, sans autre changement (T1) | × 37 | × 28 (insuffisant seul) |
| Le même avec `detourBps` à 4 000, prix × 0,6, plancher 30 % (T2) | × 37 | × 13 |
| Lagune pleine, tours ouvertes : monnaie créée par semaine (A → T6, semaines 4 à 6) | 1,17 à 1,45 M | 0,68 à 0,76 M (− 40 à − 50 %) |
| Lagune pleine : part du Large dans les ventes de chaque profil | 48 à 76 % | 31 à 44 % |
| Lagune pleine : ventes de l'assidu rapportées à celles de l'occasionnel | × 1,9 | × 1,9 |
| Lagune sans tours (C → T5) : jauges du Large | 2 à 3 % | 44 à 55 % (disputées sans être vidées) |

Le Large reste la récompense, puisque le détour vend encore cinq fois plus. Il n'écrase plus le reste.

### R2. Le Prestige du commerce accessible sans le Large

Le réglage : `maison.commerce.perDucats` de 50 à 15. Les 55 points par jour s'atteignent alors avec 825 ducats vendus.

| Mesure, en semaine 6 | Avant | Après |
| --- | --- | --- |
| Joueur sans détour (D2 → T4) | 1 761 de Prestige, niveau 10 | **2 698**, niveau 12,5 |
| Écart avec le joueur qui prend le détour (2 953) | − 40 % | − 9 % |

À combiner avec R1 : le Prestige ne récompense plus l'accès au Large, et le plafond garde la règle 7.

### R3. Les plans

Les réglages : `noir.triesPerDay` de 2 à 1, `relicsPerPlan` de 3 à 5. Calculé, puis vérifié sur le taux mesuré (1,8 contre 1,6 au calcul) :
- avant : 2 × 7 × 0,35 / 3 = 1,63 plan par semaine ;
- après : 1 × 7 × 0,35 / 5 = **0,49 plan par semaine**, soit un plan toutes les deux semaines.

C'est à faire tant que le rang 3 n'existe pas.

### R4. Le phare

Le réglage : `compagnie.beacon.thresholds` à `[0, 2400, 7200, 15000, 27000]`. Pour une compagnie de 6 membres actifs :

| | Niveau 2 | Niveau 4 |
| --- | --- | --- |
| Avant | 3 jours | 14 jours |
| Après | 7 jours | 6 semaines |

Autre possibilité : `beaconSlots` aux niveaux 3 et 5.

### R5. La courbe

Le réglage : `maison.curve` de 20 à 28. Calculé à 500 de Prestige par semaine, plafond inchangé :

| Niveau | 6 | 11 | 21 | 30 |
| --- | --- | --- | --- | --- |
| Avant (curve 20) | semaine 1 | semaine 4 | semaine 16 | semaine 34 |
| Après (curve 28) | semaine 2 | semaine 6 | semaine 23 | semaine 47 |

Mais cela ne vaut que si les niveaux ouvrent quelque chose (E5).

### R6. Un puits de ducats

Ce n'est pas un simple réglage : c'est une mécanique à décider par le porteur. Il faut que les ducats achètent quelque chose qui compte, sans vendre de la puissance (règle 4 : c'est la monnaie du jeu, pas la monnaie réelle). Les pistes, dans l'ordre de ce que mesure ce banc :
1. **L'entretien des tours**, en ducats brûlés chaque jour, par exemple 2 % des péages de la semaine plus un forfait. Cela détruit de la monnaie, là où le joueur en gagne le plus.
2. **Les réparations de la flotte et du port en ducats** après la Guerre.
3. **Des ouvrages de prestige sur l'île** : visibles (règle 8), sans rendement, à coût croissant.

Ordre de grandeur à absorber : 13 500 ducats par Maison et par semaine en régime établi, 4 000 environ si R1 est appliqué (T6 : 1,54 million détenus en semaine 6, contre 2,35 avant).

---

## 6. Ce qui marche

- **La comptabilité est exacte.** `plancheInvariant` est vrai à la fin de chacune des 18 marées. Créé, détenu, dépensé et brûlé tombent juste au denier près, détroits noirs, Muda et péages compris.
- **La création de monnaie est bornée par la demande des villes** : 1,1 à 1,3 million de ducats par semaine, du niveau 7 au niveau 18. Pas d'inflation des prix, pas d'emballement. Pour un monde persistant, c'est le bon socle.
- **La règle 7 tient** : l'occasionnel de quatre soirs par semaine suit le régulier à un niveau près et vend 88 % de ce qu'il vend. Les fils vendent entre les visites.
- **Le plafond de la semaine** protège bien contre le joueur qui passerait sa vie sur le jeu.
- **Les détroits noirs** sont un vrai pari, à espérance de gain à peu près neutre en ducats, gagné en Prestige et en reliques. Seul leur débit de plans pose problème.
- **La demande partagée fonctionne** quand plusieurs joueurs se disputent une ville : jauges vidées, prix au plancher, parts réparties.

---

## 7. Mes trois recommandations prioritaires

1. **Ramener le Large à deux à cinq fois un sestiere** (R1 : prix × 0,6, plancher 30 %, détour à 20 % et au niveau 6). Le détour passe de × 37 à × 4,8 ; la monnaie créée baisse de 40 % ; le Large tombe à environ 35 % des ventes. À valider ensuite sur les 24 mois du simulateur, et à documenter dans calibration.md.
2. **Donner un but aux ducats et aux niveaux.**
   - Côté ducats, un puits qui détruit (R6, d'abord l'entretien des tours).
   - Côté niveaux, des paliers qui ouvrent de la demande ou du jeu plutôt que des bobines inutiles.
   - Créer le rang 3 promis au niveau 15, ou retirer `tier: 3`.
   - La courbe à 28 (R5), pour que le haut de la progression couvre l'année.
3. **Réparer le marchand de l'ordinateur** (E7 : il bute sur l'Arsenal) et **ralentir les sources récentes** : les plans à 0,5 par semaine (R3), le phare trois fois plus lent (R4), `perDucats` à 15 (R2). Puis remesurer les bancs de l'Arsenal et de la progression, dont les puits sont aujourd'hui sous-estimés.
