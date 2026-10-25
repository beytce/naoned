# Expert 1 — Boucle de jeu, économie et progression : version finale

24 octobre 2026 · après le verdict du chef (`chef.md`). Aucun fichier du dépôt n'a été modifié. Le dossier `apps/simulator/out/`, ignoré par git, a été remis dans son état de départ (vide).

## Sur quoi reposent les chiffres

- **Référence : 5 graines (1 à 5) de `pnpm sim`, réglages actuels de Venise, toutes conformes.**
  - Graine 1 : rapport du premier tour.
  - Graines 2 à 5 : relancées, rapports `scratchpad/sim-{2..5}.log`.
- **Prototypes : une copie du moteur et du simulateur dans `scratchpad/proto/`, hors dépôt.** On y a modifié les vagues, le plafond par vague et la maîtrise Négociant, et ajouté des compteurs : lots × niveau, prises par marchand, heures de départ.
  - La copie rejouée avec les réglages actuels (`proto/base-*.log`) redonne **exactement** les chiffres de référence sur les 5 graines. Les prototypes sont donc comparables à la référence.
- **Scripts :** `scratchpad/plateau.py` (revenu par période) et `scratchpad/batches.py` (lots, prises, départs de nuit).
- **Médiane des 5 graines, et entre parenthèses l'étendue.** Toute exception est signalée.
- **Limite des PNJ :** ils ne jouent qu'entre 7 h et 23 h UTC. Leur choix de maîtrise est fixé par leur profil (`bots.ts:240-249`).

## Diagnostic révisé (10 lignes)

1. Ce qui marche : moteur sain (invariants à 0 sur 5 graines), régions équilibrées, première paie rapide.
2. Défaut central confirmé sur 5 graines : la demande est fixe et la production croît avec les niveaux (×10 au niveau 5, vérifié par le chef). Le Veneto finit entre 50 et 61 % de la référence (argile 70 sur une graine).
3. Le revenu progresse peu dans le mois. Monnaie payée par joueur actif et par jour : installation 200,8 (199,6 à 202,3), Lombardie 214,5 (211,5 à 217,0), soit +6,6 % en deux semaines alors que les ateliers montent de niveau.
4. Entre la semaine 3 et la semaine 4, hors Sensa, le revenu d'un marchand régulier est stable : 0,96 (0,92 à 1,08).
5. Mon « 274 % » du premier tour (assidus devant occasionnels) était un extrême de la graine 1. La médiane est **145 %** (62 à 274). L'écart est réel, mais moins grave que je ne l'ai écrit.
6. Les véhicules sont occupés à 33 % (31 à 35) : le transport n'est pas la contrainte.
7. Les prototypes montrent que **plafonner les prises par vague ne protège pas les occasionnels** : ils prennent moins de commandes, pas plus. E1-2 est retirée (voir plus bas).
8. Le levier qui reste, c'est la demande : les fondaci (E1-3), préparés par les rations au lot (E1-4).
9. Les prêts et les entrepôts sont coupés (E1-5, validé).
10. Le reste (maîtrises, livre unique) attend le paquet du 1er décembre.

---

## E1-1 — Plus aucune vague de commandes la nuit

**Verdict chef : À CORRIGER → corrections appliquées : 1. heures à l'horloge de Paris (`hourIn`), tests aux deux changements d'heure ; 2. vagues de 17 h et 20 h valables jusqu'au lendemain 10 h, période réservée comptée en heures ouvertes ; 3. urgentes vérifiées et corrigées ; 4. tests, 5 graines, calibration.md ; 5. lot 1, date butoir.** J'ajoute une condition d'expédition : une mesure du prototype montre que la règle seule pénalise les occasionnels.

**Type :** correction · **Coût :** S à M (le report au lendemain touche l'identifiant de jour des commandes) · **Lot :** 1 (fusion avant le 31 octobre à 18 h, sinon le 1er décembre)

**Constat** (vérifié par le chef). `deliveries.ts:653-657` : `opensAt = dayStart + (rank % perDay) × 4 h`. Deux défauts :
- des vagues à 0 h et 4 h ;
- une heure qui dérive : `dayStart = startAt + day × 24 h` (l.599) se décale d'une heure à chaque changement d'heure, et l'expiration à `dayStart + 24 h` aussi.

**Urgentes, vérifiées.**
- `urgentOpening` choisit l'heure avec `hourIn`, donc à l'horloge de Paris.
- Avec `urgentHours: { from: 8, to: 21 }` et `urgentOpenMinutes: 180`, une urgente s'ouvre au plus tard à 20 h 59. Elle reste donc **ouverte jusqu'à 23 h 59**.
- Aucune `opensAt` ne tombe dans [22 h, 8 h), mais une urgente se prend après 22 h. Correction : `urgentHours: { from: 8, to: 19 }`. Dernière ouverture à 18 h 59, fermeture au plus tard à 21 h 59.

**Proposition.**
1. Réglage `deliveries.waves: { hours: [8, 11, 14, 17, 20], openHours: 8 }`.
   - Chaque vague s'ouvre au premier instant du jour de jeu où `hourIn(at) === h`, à l'horloge de Paris, et non en décalage depuis `dayStart`.
   - Le nombre de commandes du jour ne change pas.
2. **Report au lendemain.** Les commandes des vagues de 17 h et de 20 h expirent le lendemain à 10 h, heure de Paris.
   - `dispatchDelivery` accepte une commande de la veille encore ouverte : aujourd'hui, `Number(dayText) !== today` la refuse. Le tableau de la veille est conservé jusqu'à 10 h.
3. **Aucune prise du tableau commun entre 22 h et 8 h.** `dispatchDelivery` refuse une commande partagée (`shared`) si `hourIn(now)` est dans [22, 8), avec l'erreur `board_closed`.
   - Les commandes personnelles (Doge, bienvenue) ne sont pas touchées.
   - Le report de 20 h ne peut donc pas être vidé la nuit.
   - Cela remplace la « période réservée en heures ouvertes » du point 2 du chef, qui dépendait du plafond d'E1-2, retiré.
4. Urgentes : `urgentHours: { from: 8, to: 19 }`.
5. **Tests** (fixture, `packages/engine/test/deliveries.test.ts`) :
   - aucune `opensAt` du tableau commun ni des urgentes dans [22 h, 8 h) sur 31 jours, dont le dernier dimanche de mars et le dernier dimanche d'octobre ;
   - total des commandes du jour inchangé à ±1 ;
   - `board_closed` à 23 h et à 7 h 59, prise acceptée à 8 h ;
   - commande de la vague de 20 h prenable le lendemain à 9 h 59, refusée à 10 h.
6. `pnpm sim` sur 5 graines conformes, et une ligne dans calibration.md.

**Mesure du prototype** (vagues à l'horloge de Paris, urgentes jusqu'à 19 h, **sans le report ni le refus de nuit**, combinées au plafond d'E1-2 : l'effet propre d'E1-1 n'est pas isolé) :

| 5 graines | Référence | Prototype A (plafond 3 en 90 min) | Prototype B (plafond 2 en 240 min) |
| --- | --- | --- | --- |
| Monnaie payée (d / actif / jour) | 213,2 (209,1–215,9) | 216,9 (213,4–222,9) | 214,1 (208,9–218,6) |
| Commandes prises | 90,9 % (88,5–92,3) | 93,8 % (91,4–95,7) | 91,7 % (88,2–93,6) |
| Prises dans la 1re heure | 27,7 % (27,0–28,3) | 43,4 % (41,0–44,0) | 42,4 % (41,7–43,3) |
| Assidus devant occasionnels (ventes nettes) | 145 % (62–274) | 227 % (116–244, 4 graines) | 136 % (69–259) |
| Prises d'un occasionnel / d'un assidu (médianes) | 0,37 (0,24–0,54) | non instrumenté | 0,25 (0,15–0,50) |

**Lecture.**
- Sans les vagues de nuit, les PNJ (qui ne jouent pas la nuit) n'ont plus de « réserve du matin ». Les commandes partent dans l'heure, et l'occasionnel à une session prend moins.
- Le report jusqu'à 10 h (point 2) recrée cette réserve du matin, sans que personne puisse la prendre la nuit (point 3). C'est pour cela qu'il est **obligatoire**, et non optionnel.

**Critère de fusion** (5 graines, avec les points 1 à 4) :
- rapport « prises d'un occasionnel / d'un assidu » ≥ 0,37, la référence ;
- assidus devant occasionnels ≤ 145 %, la médiane de référence ;
- monnaie payée à ±5 %.

Si ces critères ne tiennent pas le 31 octobre à 18 h, E1-1 part le 1er décembre. La nuit tranquille reste un engagement à tenir, pas un gain à ajouter.

**Référence :** Hades' Star (rien ne se perd pendant le sommeil), et le reproche fait à OGame. **Règle transgressée :** aucune. **Risque :** moyen, mesuré ci-dessus.

---

## E1-2 — Une part réservée de chaque vague : retirée par l'auteur après mesure

**Verdict chef : À CORRIGER → corrections appliquées : 1. mesure sur 5 graines avant et après dans un même tableau (ci-dessus, et ci-dessous) ; 2. plafond par compte, appliqué aux PNJ comme aux humains (prototype : `waveCapLeft`, dans `dispatchDelivery` et dans la logique des PNJ).** Résultat : **la proposition échoue sur ses propres cibles. Je la retire du lot 1** et ne demande pas la décision 9 au porteur.

| 5 graines | Référence | Plafond 3 en 90 min | Plafond 2 en 240 min | Cible |
| --- | --- | --- | --- | --- |
| Commandes perdues par session | 33,0 (31,2–35,7) | 43,0 (41,4–44,5) | 39,8 (38,1–42,0) | ≤ 10 |
| Prises dans la 1re heure | 27,7 % | 43,4 % | 42,4 % | en baisse |
| Commandes prises | 90,9 % | 93,8 % | 91,7 % | ≥ 88 % |
| Assidus devant occasionnels | 145 % | 227 % (4 graines) | 136 % | ≤ 150 % |
| Part du top 10 % des preneurs | 19,9 % (18,4–21,2) | — | 18,1 % (17,4–19,6) | — |
| Prises d'un occasionnel / d'un assidu | 0,37 | — | 0,25 | en hausse |

**Trois constats honnêtes.**
1. **L'indicateur « commandes perdues par session » ne mesure pas une course.** `sim.ts:430-437` compte, à chaque session, les commandes ouvertes déjà prises par un autre que le stock aurait couvertes. C'est une photo de la saturation du tableau : avec environ 40 marchands sur un tableau commun, aucune règle de partage ne le ramène sous 10. La cible du chef, reprise de mon premier tour, était mal définie, et c'est ma faute.
2. **La cible « ≤ 150 % » est déjà tenue par la référence (145 %).** Elle ne discrimine rien.
3. **Le plafond ne rend rien aux occasionnels**, et leur part baisse avec le plafond 2 en 240 min. Les assidus ne vident pas une vague à eux seuls (le top 10 % prend environ 19 % des commandes). C'est le nombre de sessions qui fait l'écart, pas la vitesse de clic.

**Ce qui reste :**
- la mesure « prises d'un occasionnel / d'un assidu », à ajouter au rapport du simulateur à la place des commandes perdues ;
- la carte « réservée encore 47 min » est abandonnée ;
- E3-1 lit les heures de vague d'E1-1 dans les réglages, comme prévu.

---

## E1-3 — Les fondaci : une demande qui grandit quand on y investit (remplace les entrepôts)

**Verdict chef : À CORRIGER → corrections appliquées : 1. plafonnement mesuré sur 5 graines (et critère de réussite corrigé, car celui demandé est déjà atteint) ; 2. tableau de la monnaie par jour (estimation, pas encore simulé, dit comme tel) ; 3. PNJ dans le simulateur avant toute mise en ligne, condition bloquante ; 4. prix −5 % justifié ; 5. grand livre et journal des stocks ; 6. `warehouses.perCity: 0` ; 7. une feuille par ville ; 8. plan, puis code en novembre, en ligne le 1er décembre.**

**Type :** nouvelle fonctionnalité · **Coût :** L · **Lot :** 2 (en ligne le 1er décembre, décision 1 du porteur)

### 1. Le plafonnement, sur 5 graines

| Graine | Revenu J4-J8 | J14-J21 | J21-J29 hors Sensa | J20-J29 / J4-J8 brut | même rapport hors Sensa | J21-J29 hors Sensa / J14-J21 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 177 | 197 | 189 | 1,16 | 1,07 | 0,96 |
| 2 | 170 | 186 | 180 | 1,12 | 1,06 | 0,97 |
| 3 | 171 | 210 | 227 | 1,43 | 1,33 | 1,08 |
| 4 | 152 | 215 | 197 | 1,46 | 1,30 | 0,92 |
| 5 | 99 | 190 | 181 | 1,99 | 1,82 | 0,95 |
| **Médiane** | 170 | 197 | 189 | **1,43** | **1,30** | **0,96** |

**Méthode.**
- Revenu : ventes nettes par jour en ducats, médiane des marchands non occasionnels présents toute la saison (27 à 37 par graine).
- La Sensa commence à J21 (le simulateur part le lundi 5 janvier, `sim.ts:191`).
- Le revenu J21-J29 est corrigé par le rapport de la monnaie payée entre l'acte Sensa et l'acte Lombardie de chaque graine (1,10 à 1,12).

**Lecture.**
- Le démarrage (J4-J8) varie de 99 à 177 selon les graines. Le rapport demandé par le chef (J20-J29 / J4-J8) disperse donc de 1,06 à 1,82, et **sa version brute (1,43) dépasse déjà la cible de 1,4 du paquet du 1er décembre**.
- Les deux signaux stables sur les 5 graines sont :
  - la monnaie payée par actif et par jour, Lombardie / Installation : 1,066 (1,053–1,086) ;
  - un revenu stable de la semaine 3 à la semaine 4 hors Sensa : 0,96 (0,92–1,08).
- Je ne parle plus de « plafond dès J+5 » mais de « croissance de 7 % entre la semaine 1 et la semaine 3, puis plus rien ».

**Critères proposés pour le paquet du 1er décembre**, à la place du « ≥ 1,4 » :
- Lombardie / Installation ≥ 1,20 ;
- J21-J29 hors Sensa / J14-J21 ≥ 1,10.

### 2. La règle

- Un marchand ouvre un fondaco dans au plus **3 villes**, niveaux 1 à 3, **6 niveaux au total au plus**.
- **Chaque niveau donne 1 commande personnelle par jour** de cette ville. La marchandise est choisie dans ce que la ville achète (`settings.cities`) et que le marchand fabrique ou peut acheter. Quantité : la moyenne de `deliveries.quantity`.
- **Prix :** 95 % du prix que la même commande aurait au tableau commun (`orderUnitPrice`, index du Rialto et bonus de route compris).
- **Coûts** : les ducats sont détruits par écriture `ledger_entries` (cause `fondaco_build`), les matériaux sortent par `stock_movements` (`fondaco_build`) :
  - niveau 1 : 100 d + 10 briques + 10 planches ;
  - niveau 2 : 250 d + 20 + 20 ;
  - niveau 3 : 600 d + 40 + 40.
- Le fondaco compte au patrimoine à son coût, comme un bâtiment.
- `sharedOrdersPerActivePlayer` passe de 4 à 2.
- `warehouses.perCity: 0` (avec E1-5).
- **Interface :** une seule feuille par ville, ouverte depuis la ville sur la carte du commerce. Aucune nouvelle porte dans le HUD.

**Pourquoi −5 %.**
- La commande du fondaco est sûre (personnelle, sans course) ; celle du tableau commun est incertaine. Le tableau doit rester le meilleur prix à l'unité, pour qu'on continue à le jouer : les PNJ trient par valeur (`bots.ts`, `deliver`), et un humain aussi.
- À −5 %, une commande moyenne vaut environ 21 d au fondaco contre 22 d au tableau. Au Rialto, la même marchandise vaut environ 11 d (cours de fin de mois vers 55 %).
- Le fondaco reste donc très supérieur à l'invendu, sans tuer le tableau.
- Au-delà de −10 %, le gain sur l'invendu tombe sous 9 d par commande, et le niveau 1 ne se rembourse plus dans le mois.

### 3. La monnaie créée par jour (estimation à valider au simulateur)

**Base.**
- Valeur d'une commande de ville moyenne du tableau commun : ≈ 22 d. C'est un calcul : 19,7 d aux prix de référence (moyenne pondérée de `deliveries.weights` et `quantity`) × 1,40 (+10 % de ville, +30 % par heure de route, ≈ 1 h en moyenne) × 0,80 (index moyen du mois).
- Ce chiffre est cohérent avec la monnaie payée mesurée : 213 d par actif et par jour, pour environ 6,2 commandes communes prises par actif et par jour, plus le Doge.
- Retirer 2 commandes communes par actif et par jour, prises à 91 %, retire environ **40 d par actif et par jour**.

| Marchand | Niveaux | Commandes du fondaco par jour | Monnaie en plus | Moins sa part du tableau retirée | Écart par rapport à aujourd'hui (213 d) |
| --- | --- | --- | --- | --- | --- |
| 1 fondaco niv. 1 | 1 | 1 | +21 | −40 | −19 (−9 %) |
| 1 fondaco niv. 2 | 2 | 2 | +42 | −40 | +2 (+1 %) |
| 1 fondaco niv. 3 | 3 | 3 | +63 | −40 | +23 (+11 %) |
| 2 fondaci (3 + 1) | 4 | 4 | +84 | −40 | +44 (+21 %) |
| 3 fondaci (2 + 2 + 2) | 6 | 6 | +126 | −40 | +86 (+40 %) |

**Lecture.**
- La monnaie payée par actif reste à ±10 % tant que la moyenne de la population se situe entre 1 et 3 niveaux. À 6 niveaux pour tous, elle monte de 40 %.
- **Réglage de sécurité :** si la moyenne simulée dépasse 3 niveaux, `sharedOrdersPerActivePlayer` passe de 2 à 1 (−20 d par actif et par jour) avant toute mise en ligne.
- Le classement compte les ventes nettes et ignore les ducats dépensés (`turnover.ts`). La contrainte d'adoption est donc la trésorerie disponible, pas le remboursement. Les PNJ doivent se comporter de même, sinon la simulation sous-estimera l'adoption.

### 4. Conditions avant le code, puis avant la mise en ligne

1. **Plan écrit, validé par le porteur** (décision 1).
2. **Moteur** : `packages/engine/src/fondaci.ts`, tests d'abord sur la fixture :
   - coût passé par le grand livre et le journal des stocks ;
   - 6 niveaux au plus, 3 villes au plus ;
   - commande personnelle tirée du secret du monde ;
   - prix = 95 % de `orderUnitPrice` ;
   - aucune commande du fondaco sur une marchandise que la ville n'achète pas.
3. **Les PNJ ouvrent et montent des fondaci dans le simulateur** (ordre de remboursement comme `costPerOutput`, trésorerie au-delà de 3 fois le coût). Sans cela, la proposition tombe.
4. **5 graines conformes, avec E1-4 déjà en place** :
   - monnaie payée par actif et par jour à ±10 % de 213 ;
   - masse monétaire ≤ 2,5 × le capital ;
   - Lombardie / Installation ≥ 1,20 ;
   - semaine 4 hors Sensa / semaine 3 ≥ 1,10 ;
   - cours du Veneto en fin de mois ≥ 65 % ;
   - moyenne des niveaux de fondaco par actif publiée dans le rapport.
5. Ligne dans calibration.md, `seasonNotes` de décembre annoncé le 24 novembre.

**Référence :** Hades' Star (améliorer une planète génère plus de cargaisons), Patrician (les kontors). **Règle levée :** le gel des mécaniques, par arbitrage écrit du porteur. **Risque :** moyen (création de monnaie), borné par le réglage de sécurité.

---

## E1-4 — Les ouvriers mangent quand ils travaillent

**Verdict chef : À CORRIGER → corrections appliquées : 1. jamais bloqué (lot ralenti), tutoriel exempté, deux tests ; 2. prélèvement en entiers par `stock_movements`, règle d'arrondi écrite ; 3. consommation mesurée sur 5 graines ; 4. cibles conservées ; 5. lot 2, simulée avant E1-3.**

**Type :** amélioration (équilibrage) · **Coût :** S à M · **Lot :** 2 (en ligne le 1er décembre)

**Consommation mesurée** (copie du simulateur, réglages actuels, 5 graines, actifs à partir de J3).
- On compte les lots lancés × niveau, par comptoir et par jour.
- Médiane : ateliers de transformation 34,5 à 48, ateliers de matières premières 43,5 à 47.
- Pain que coûterait la règle du premier tour (1 par lot et par niveau pour une transformation, 0,5 pour une matière première) :
  - médiane **72** (72 sur les 5 graines, signature de la file de 12 h remplie) ;
  - moyenne 76 à 96 ;
  - 9e décile 155 à 180.
- Pour comparer :
  - les rations actuelles coûtent 2 pains par niveau et par jour, soit environ 15 par comptoir (7,3 niveaux par marchand, graine 1) ;
  - la demande de pain des villes est de 130 par actif et par jour.
- Ma fourchette « 40 à 80 » du premier tour était donc basse. 72 pains par jour ajouteraient environ 55 % à la demande de pain : c'est trop d'un coup.

**Règle corrigée : coefficients divisés par deux.**
- **Compteur** : `rationDebt` par bâtiment, en **quarts de pain** (entier).
- À chaque `startProduction` : `rationDebt += lots × niveau × k`, avec k = 2 pour un atelier de transformation (½ pain) et k = 1 pour un atelier de matière première (¼ de pain).
- On retire `floor(rationDebt / 4)` pains par `removeStock(..., "rations", buildingId)`, puis `rationDebt %= 4`.
- Le compteur n'est jamais remis à zéro dans la saison. Il repart à 0 avec le monde suivant.
- Consommation attendue : médiane ≈ **36 pains par comptoir et par jour**, soit +28 % de demande de pain. Le reste se règle au simulateur.

**Jamais bloqué.**
- S'il manque du pain, le lot démarre quand même, ralenti de `rations.slowdownBps` (5 000, comme la faim actuelle).
- Le pain manquant n'est pas dû : le compteur garde seulement le reste de l'arrondi.
- Le lot du tutoriel (`fastBatchNext`) ne coûte rien.
- La ration fixe passe à 0 (`perLevelPerDay: 0`). Le jour de grâce (`graceHours`) et le sommeil du comptoir sont conservés.

**Tests** (fixture) :
- sans pain, le lot démarre avec `batchMs` × 1,5 ;
- le lot rapide du tutoriel ne retire aucun pain ;
- 3 lots de niveau 2 en transformation donnent 12 quarts, soit 3 pains, compteur à 0 ;
- 1 lot de niveau 1 en matière première donne 0 pain, compteur à 1 ;
- chaque pain retiré a sa ligne `stock_movements`.

**Cibles (5 graines, simulée avant E1-3) :** pain ≥ 75 % de la référence en fin de mois (52 % aujourd'hui, sur les 5 graines), matières premières ≥ 65 %, ventes nettes de la Vénétie ≤ 115 % des autres régions.

**Limite :** la consommation a été mesurée sous les règles actuelles. Avec la ration au lot, les marchands produiront moins quand le pain coûte, et la consommation réelle sera plus basse. C'est le but, et le simulateur le dira.

**Référence :** Anno (la main-d'œuvre consomme pour produire). **Règle transgressée :** aucune (équilibrage, `pnpm sim`, calibration.md). **Risque :** moyen (poids de la Vénétie), borné par la cible de 115 %.

---

## E1-5 — Couper les prêts et les entrepôts

**Verdict chef : VALIDÉ → aucune correction.** Mise en œuvre telle que le chef l'a écrite :
- `loans.maxAmount: 0` et `warehouses.perCity: 0` ;
- un test montre que le schéma accepte 0 et que les commandes sont refusées ;
- les entrées d'interface disparaissent ;
- `loop-m1` est clos sans objet ;
- lot 1, décision 2 du porteur.

---

## E1-6 — Des maîtrises qui touchent la vraie contrainte

**Verdict chef : À CORRIGER → corrections appliquées : 1. partie Roulier liée à E1-2 retirée avec E1-2 ; 2. monnaie de la partie Négociant mesurée sur 5 graines ; 3. urgentes visibles plus tôt : information seule, pas prenables ; 4. cibles conservées, avec la limite de la mesure dite ; 5. lot 2.**

**Type :** amélioration · **Coût :** S (quota), M (plancher par marchand) · **Lot :** 2 (en ligne le 1er décembre)

**Constat corrigé.**
- La répartition des maîtrises du simulateur ne mesure pas leur attrait : elle est fixée par le profil des PNJ (`bots.ts:240-249` : producteur, artisan et occasionnel → Maître d'atelier). L'argument « Maître d'atelier pris par 16 sur 33 » de mon premier tour ne vaut donc rien, et je le retire.
- Ce qui reste :
  - les véhicules sont occupés à 33 % (31 à 35), donc la vitesse du Roulier ne lève aucune contrainte ;
  - l'avance d'une maîtrise sur une autre à profil égal vaut 50,9 % (0,9 à 144), portée par 2 ou 3 PNJ, donc bruitée.

**Proposition.**
- **Négociant** : quota de la Dogana ×3, par la clé existante `specialties.options.trader.marketMakerQuotaBps: 20000` (+200 %, sur l'achat comme sur la vente, `market.ts:146`). Taxe −2 points (inchangé).
- **Plancher de la Dogana à 85 % de la référence pour le Négociant.** Il demande un prix par marchand dans `marketMaker.ts`, et il **n'est pas simulé**. Il ne part que s'il passe les 5 graines avec la masse monétaire ≤ 2,5 × le capital. Sinon, 80 % (règle du chef), et sinon, retiré.
- **Roulier** : on garde la vitesse +25 % et un véhicule de plus. On ajoute les urgentes **visibles** 20 minutes avant leur ouverture, prenables à l'heure comme tout le monde. C'est de l'information, sans création de monnaie.

**Mesure du quota ×3** (prototype, 5 graines, avec les vagues d'E1-1) :

| | Achats de la Dogana aux marchands (d / actif / jour) |
| --- | --- |
| Sans le quota ×3 | 16,4 · 18,2 · 18,2 · 18,2 · 16,7 |
| Avec le quota ×3 | 18,0 · 19,4 · 20,5 · 19,9 · 19,0 |
| Écart | +1,6 · +1,2 · +2,3 · +1,7 · +2,3 → **médiane +1,7 (+0,8 % de la monnaie payée)** |

**Lecture.**
- Avec 2 à 3 Négociants sur environ 33 marchands, cela fait environ +27 d par Négociant et par jour.
- Extrapolé à 40 % de Négociants (le plafond de la cible), on obtient environ +11 d par actif et par jour, soit +5 %.
- Masse monétaire au plus 0,87 à 1,19 × le capital (graine 1 : 1,19 ×), sous le plafond de 2,5 ×.

**Cibles :**
- ≤ 10 % d'écart à profil égal, au simulateur ;
- aucune maîtrise au-dessus de 40 % des choix : mesurable **seulement chez les humains**, dans `/admin`, sur la saison de décembre. Les PNJ ne choisissent pas.

**Référence :** Hades' Star (chaque module lève un goulot différent). **Règle transgressée :** aucune. **Risque :** faible, mesuré.

---

## E1-7 — Un seul livre : les tâches du jour et les missions de la semaine

**Verdict chef : À CORRIGER → corrections appliquées : 1. pool corrigé par E2-3 ; 2. tableau exact, espérance à ±5 % de 2 × l'actuelle corrigée ; 3. un seul nom, sans nouvelle porte : « Livre de la Maison » ; 4. lot 2.**

**Type :** amélioration · **Coût :** S à M · **Lot :** 2 (en ligne le 1er décembre, le rythme de l'Influence étant une règle)

**Nom et porte.**
- « Carnet » est pris deux fois. Le **Livre de la Maison** existe déjà : on l'ouvre depuis le Profil, et il montre déjà l'Influence et les missions de la Maison.
- Il reçoit deux pages : **Aujourd'hui** (les 3 tâches du jour et le coffre de série, inchangés) et **Cette semaine**.
- Aucune nouvelle porte, aucun troisième carnet. La pastille des tâches du jour reste à sa place actuelle.

**Base corrigée (E2-3).**
- Pool de 12 missions de commerce (Influence moyenne 3,17) et 5 de la Terraferme (3,0, `groupMax` 2).
- Tableau de 10 toutes les 84 h : 31,3 d'Influence espérés par tableau, donc **62,6 par semaine**.
- Pour un marchand sans Terraferme : 8 missions de commerce × 3,17 × 2 = 50,7 par semaine.

**Nouvelle cadence.**
- Un tableau de **8 missions par semaine**, ouvert le lundi à 0 h (bornes `weekBounds`, celles du classement et de la Terraferme).
- 6 missions de commerce et au plus 2 de la Terraferme. Si moins de 2 missions de la Terraferme sont tirées, le commerce complète.
- Les seuils sont doublés (une semaine au lieu de 84 h), l'Influence multipliée par ≈ 2,5 et arrondie à l'entier.

| Mission (événement) | Seuil 84 h → semaine | Influence 84 h → semaine |
| --- | --- | --- |
| Livraisons (`delivery_arrived`) | 10 → 20 | 3 → 8 |
| Beaucoup de livraisons | 25 → 50 | 5 → 12 |
| Urgentes | 2 → 4 | 4 → 10 |
| Doge (`contract_fulfilled`) | 3 → 6 | 4 → 10 |
| Offres (`order_placed`, limite) | 3 → 6 | 2 → 5 |
| Rialto (`order_filled`) | 5 → 10 | 3 → 8 |
| Récoltes | 20 → 40 | 2 → 5 |
| Amélioration | 1 → 2 | 4 → 10 |
| Construction | 1 → 2 | 3 → 8 |
| Véhicule amélioré | 1 → 2 | 3 → 8 |
| Coffres du jour | 2 → 4 | 3 → 8 |
| Ballots | 4 → 8 | 2 → 5 |
| *Commerce : moyenne* | | *3,17 → 8,08* |
| Poser son comptoir de guerre (`terra_placed`) | 1 → 1 | 2 → 5 |
| Prendre des cases (`terra_cell_taken`) | 15 → 30 | 3 → 8 |
| Tenir une ville | 1 → 1 | 4 → 10 |
| Bâtir une Rocca | 1 → 1 | 3 → 8 |
| Envoyer des troupes à un allié (`terra_troops_sent`) | 1 → 2 | 3 → 8 |
| *Terraferme : moyenne* | | *3,0 → 7,8* |

**Espérance par semaine.**
- 6 × 8,08 + 2 × 7,8 = **64,1**, soit **+2,4 %** par rapport à 62,6 (cible ±5 % : tenue).
- Marchand sans Terraferme : 6 × 8,08 = 48,5 contre 50,7, soit −4,3 %, dans la cible.

**Première semaine d'un marchand.** La page « Cette semaine » montre le Livre de compte actuel (11 missions, récompenses en marchandises, inchangées), puis bascule le lundi suivant sur les missions de la Maison.

**Tests :**
- espérance du tableau sur 1 000 tirages dans [59,5 ; 65,7] ;
- jamais plus de 2 missions de la Terraferme ;
- le tableau change le lundi à 0 h à Paris, changement d'heure compris.

**Référence :** Marvel Snap et Clash Royale (un quotidien, un hebdomadaire). **Règle transgressée :** aucune. **Risque :** faible.

---

## E1-8 — Le mutateur du mois : retiré, fusionné dans E2-9

**Verdict chef : REFUSÉ (doublon) → corrections appliquées : retiré, fusionné dans E2-9.** Ce que je remets à E2 :
- Mutateurs qui n'utilisent que des clés existantes : Grand gel (`yieldBps` bois −2 000, `cityPriceBps` planches 12 000), Jubilé (`cityCapacityBps` pain de Venise 20 000), Embargo ottoman (`muda.lotPerActivePlayer` divisé par deux).
- La Peste attend E1-4.
- Je fournis la validation au simulateur de chaque mutateur : option `--mutator <code>`, 5 graines, une ligne dans calibration.md.

## E1-9 — Des divisions : retiré, fusionné dans E2-7

**Verdict chef : REFUSÉ (doublon) → corrections appliquées : retiré.** Apport remis à E2 pour son entrée dans IDEAS.md : la mesure « prises d'un occasionnel / d'un assidu » (0,37 aujourd'hui), qui dit mieux que le classement global ce que vit un occasionnel.

## E1-10 — Des privilèges d'ouverture : retiré, entrée IDEAS.md

**Verdict chef : REFUSÉ → corrections appliquées : retiré du plan.** Entrée à ajouter à IDEAS.md, section « Progression de la Maison » :

> **Privilèges d'ouverture** (Maison verrière, Maison drapière, Fondaco héréditaire après les fondaci, ornements du Domaine) : un autre départ de saison, jamais plus de rendement, écart ≤ 15 % mesuré par `pnpm sim --patents 0.3`. Déclenchement : Influence médiane non dépensée ≥ 100 à J30 chez les humains, mesurée en décembre ; le Fondaco héréditaire attend les fondaci (E1-3) en ligne.

---

## Récapitulatif

| Proposition | Verdict | Lot | Ce qui la fait passer |
| --- | --- | --- | --- |
| E1-1 Vagues de jour | corrigée, report et refus de nuit obligatoires | 1 (sinon 1er décembre) | 5 graines : occasionnel / assidu ≥ 0,37, écart ≤ 145 %, monnaie ±5 % |
| E1-2 Part réservée | **retirée par l'auteur** (échoue sur 5 graines) | — | — |
| E1-3 Fondaci | corrigée | 2 (1er décembre, décision 1) | PNJ simulés, monnaie ±10 %, Lombardie / Installation ≥ 1,20, semaine 4 / semaine 3 ≥ 1,10, Veneto ≥ 65 % |
| E1-4 Rations au lot | corrigée (coefficients divisés par deux) | 2, avant E1-3 | pain ≥ 75 %, matières ≥ 65 %, Vénétie ≤ 115 % |
| E1-5 Prêts et entrepôts | validée | 1 (décision 2) | tests du schéma |
| E1-6 Maîtrises | corrigée | 2 | quota mesuré (+0,8 %) ; plancher à simuler ; part des choix mesurée chez les humains |
| E1-7 Livre de la Maison | corrigée | 2 | espérance 64,1 par semaine (+2,4 %) |
| E1-8, E1-9 | fusionnées (E2-9, E2-7) | — | — |
| E1-10 | IDEAS.md | — | Influence non dépensée ≥ 100 à J30 |
