# Expert 1 — Boucle de jeu, économie et progression

24 octobre 2026 · lecture du cadrage, des plans, de calibration.md et de `packages/engine/src`. J'ai aussi lancé `pnpm sim` : seule la graine 1 a fini (563 s, PASS) avant la limite de 600 s de ma commande. Les chiffres « sim g1 » ci-dessous viennent de son rapport et de `apps/simulator/out/seed-1/players_daily.csv`. Je n'ai modifié aucun fichier du dépôt.

## Diagnostic (10 lignes)

1. Ce qui marche : un moteur sain (grand livre, invariants à 0, indice des prix 92 à 112) et des régions équilibrées (ventes nettes médianes : Vénétie 4 967, Lagune 4 543, Dolomites 4 838). La première paie arrive vite et le tableau de bord est lisible.
2. **Le défaut central : l'économie est bornée par la demande, pas par la production.** Un atelier au niveau 5 produit 10 fois plus qu'au niveau 1 (`levelYieldBonusBps` 2 500). La demande, elle, reste fixe : 4 commandes de ville et 2 urgentes par marchand actif (`sharedOrdersPerActivePlayer`).
3. Mesure (sim g1, marchands non occasionnels présents toute la saison) : 177 d/jour de ventes nettes de J4 à J8, 181 de J12 à J16, 219 en fin de mois avec la Sensa (+15 %). **Le revenu plafonne dès J+5** alors que les niveaux d'ateliers continuent de monter (moyenne 2,59).
4. Tout le Veneto finit entre 50 et 59 % de la référence (blé 59, pain 52, argile 50, bois 50). Améliorer un atelier ajoute surtout des invendus. C'est la vraie cause du « on a peu l'impression de se développer ».
5. La seule variable qui reste, c'est la course au tableau commun. Un marchand perd 33 commandes par session au profit d'un autre alors qu'il avait le stock, 27 % des prises tombent dans l'heure de l'ouverture, et les assidus finissent 274 % devant les occasionnels.
6. Le tableau ouvre même des vagues à 0 h et 4 h (`deliveries.ts:656-657`). Un tiers des commandes de ville sont donc à prendre la nuit, contre la promesse « le jeu dort de 22 h à 8 h ».
7. Trop de systèmes de commerce pour une session de 3 minutes, dont deux que personne ne simule : entrepôts et prêts. Il y a aussi trois listes d'objectifs qui se recouvrent.
8. Les choix ne tiennent pas : la maîtrise Maître d'atelier est prise par 16 marchands sur 33, Roulier et Négociant par 4 chacun. Les véhicules sont occupés à 33 % : la vitesse ne vaut rien quand la demande manque.
9. Entre deux saisons, rien n'attire. Le joueur médian gagne 130 d'Influence par saison, et le catalogue ne contient que le nom doré, à 40. À J30, rien ne donne envie de revenir le 1er.
10. Ce que ferait Hades' Star : le revenu grandit quand on investit **dans la demande** (une planète améliorée génère plus de cargaisons), et chaque cargaison est à soi, pas à celui qui clique le premier. C'est la direction de E1-2 et E1-3.

---

## Propositions, par priorité

### E1-1 — Plus aucune vague de commandes la nuit
**Type :** correction · **Coût :** S · **Impact :** équité, promesse tenue, rétention des adultes · **Risque :** faible

**Constat.** `ensureBoard` ouvre les vagues à `dayStart + rank × 4 h` (`deliveries.ts:656-657`, réglage `waves: { everyHours: 4, openHours: 8 }`, `venice1450.settings.ts:630`). Les vagues tombent donc à 0 h, 4 h, 8 h, 12 h, 16 h et 20 h, heure de Paris. Celle de 0 h reste ouverte jusqu'à 8 h, celle de 4 h jusqu'à 12 h. Un tiers des commandes de ville du tableau commun se prennent la nuit, sans frein : `dispatchDelivery` n'a aucune heure de fermeture. Le cadrage et les recommandations promettent pourtant « le jeu dort de 22 h à 8 h ». OGame et Travian sont reprochés pour exactement ce travers.

**Proposition.**
- Ouvrir les vagues aux heures de jeu : `waves: { hours: [8, 11, 14, 17, 20], openHours: 8 }`.
- Les commandes des vagues de 17 h et de 20 h restent valables jusqu'au lendemain 10 h, au lieu d'expirer à minuit (`expiresAt` dans `ensureBoard`).
- Le nombre total de commandes du jour ne change pas : la monnaie créée non plus.
- Tests sur la fixture : aucune `opensAt` entre 22 h et 8 h, total du jour inchangé.

**Référence.** Hades' Star ne punit jamais l'absence de nuit : les cargaisons attendent. Le reproche fait à OGame est connu (« se lever la nuit »).

**Règle transgressée :** aucune. On applique la promesse.

### E1-2 — Une part de chaque vague réservée à chacun : la fin de la course au clic
**Type :** amélioration · **Coût :** S · **Impact :** rétention des occasionnels et des joueurs sur mobile, écart assidus/occasionnels · **Risque :** moyen (un peu moins de commandes prises)

**Constat.** Le tableau commun est « premier venu, premier servi » (`deliveries.ts`, commentaire « the first who sends a vehicle takes the order »). Sim g1 :
- 33 commandes perdues par session au profit d'un autre alors que le stock suffisait ;
- 27,4 % des prises dans l'heure de l'ouverture ;
- assidus 274 % devant les occasionnels en ventes nettes.

Un marchand avec 4 véhicules × 4 commandes par chargement (`maxOrdersPerLoad`) peut vider 16 des quelque 27 commandes d'une vague à 40 marchands. Pour un adulte qui joue 3 minutes entre deux réunions, le jeu dit « tu arrives toujours trop tard ».

**Proposition.**
- Pendant les 90 premières minutes d'une vague, chaque marchand prend au plus `perWaveCap` = 3 commandes de cette vague (réglage `deliveries.waves.capPerMerchant`, `capMinutes`). Au-delà de 90 minutes, la vague est libre.
- Les urgentes restent libres : elles sont la récompense de la présence.
- Afficher sur la commande « réservée aux retardataires encore 47 min ».
- Cibles au simulateur : commandes perdues par session ≤ 10 ; assidus devant occasionnels ≤ 150 % (on ne vise pas 5 à 10 % : la présence doit payer) ; part des commandes prises ≥ 88 % (90,9 % aujourd'hui).

**Référence.**
- Hades' Star : les cargaisons générées par vos planètes sont à vous ; la compétition se fait ailleurs.
- Hay Day : le tableau de commandes est personnel, et c'est la raison pour laquelle on y revient sans stress.

**Règle transgressée :** aucune.

### E1-3 — Les fondaci : une demande qui grandit quand on y investit (remplace les entrepôts)
**Type :** nouvelle fonctionnalité · **Coût :** L · **Impact :** progression dans la saison, profondeur, identité · **Risque :** moyen (création de monnaie, à régler au simulateur)

**Constat.**
- Le revenu plafonne dès J+5 (diagnostic, point 3).
- La production d'un marchand assidu dépasse de loin ce que le monde achète : calibration.md, « 654 000 blés pour 268 000 consommés ».
- Les entrepôts (`warehouses.ts`, 2 places par ville aux enchères) sont la seule façon de « posséder » un débouché. Ils sont à somme nulle, réservés à 14 marchands, et les PNJ ne les prennent pas : la simulation ne les couvre pas (plan-finalisation, `loop-m1`).

Le jeu s'appelle Fondaco et ne contient aucun fondaco.

**Proposition.** Un marchand ouvre un fondaco (une agence) dans une ville, au plus 3 villes.
- **Niveaux 1 à 3.** Chaque niveau donne 2 commandes **personnelles** par jour de cette ville, sur les marchandises qu'elle achète et que le marchand choisit (la ville doit acheter la marchandise : `settings.cities`). Quantité : un lot (pain 15, briques 8). Prix : `cityPriceBps` + bonus de route, comme le tableau.
- **Coût**, ducats détruits et matériaux :
  - niveau 1 : 150 d + 15 briques + 15 planches ;
  - niveau 2 : 350 d + 30 + 30 ;
  - niveau 3 : 800 d + 50 + 50.
- **Remboursement visé :** 4 jours au niveau 1, 7 au niveau 3. Le rendement baisse avec les niveaux : on s'étend, on ne s'empile pas.
- **Monnaie :** `sharedOrdersPerActivePlayer` passe de 4 à 2, pour garder la monnaie payée par joueur actif et par jour dans sa cible (≈ 213 d aujourd'hui).
- **Les entrepôts sont retirés** (`warehouses.perCity: 0`). Le nombre de systèmes ne grandit pas.
- **Les choix que cela crée :** quelle ville (courte et sûre, ou longue et mieux payée), quelle marchandise lui livrer, se concentrer ou s'étaler. Le fournisseur officiel (`suppliers.ts`) devient la conséquence naturelle d'un fondaco bien tenu. Les briques et les planches trouvent un usage qui grandit avec le marchand, ce qui fait remonter leur cours (53 à 55 % aujourd'hui).
- **Les PNJ** ouvrent des fondaci selon un ordre de remboursement, comme pour les ateliers (`costPerOutput`).
- **Cibles au simulateur :**
  - revenu des J20-J29 ≥ 1,4 × celui des J4-J8 (1,24 × aujourd'hui, avec la Sensa) ;
  - masse monétaire par joueur actif ≤ 2,5 × le capital ;
  - cours du Veneto en fin de mois ≥ 65 % de la référence.

**Référence.**
- Hades' Star : améliorer une planète augmente les cargaisons qu'elle génère. On investit dans la demande, et c'est le moteur de croissance du jeu.
- Patrician / The Patrician : les kontors dans les villes hanséatiques.

**Règle transgressée :** c'est une nouvelle mécanique, hors du lot du gel levé le 20 octobre. Je la justifie : c'est la seule proposition qui traite la cause du constat du porteur (« peu l'impression de se développer »), au lieu d'ajouter un système à côté. Elle en retire un autre (les entrepôts). Il faut l'arbitrage écrit du porteur.

### E1-4 — Les ouvriers mangent quand ils travaillent
**Type :** amélioration (équilibrage) · **Coût :** S · **Impact :** prix du Veneto, débouché du pain, frein naturel à la surproduction · **Risque :** moyen (poids de la Vénétie sur les autres)

**Constat.** Les rations valent 2 pains par niveau et par jour (`venice1450.settings.ts:131`, `buildings.ts:72`). Une boulangerie de niveau 1 sort 480 pains par jour. Un comptoir de 7 niveaux mange 14 pains par jour, qu'il produise ou non. Produire ne coûte donc rien de plus que de laisser l'atelier à l'arrêt. Les PNJ (et les vrais joueurs) remplissent la file de 12 h même à 52 % de la référence. Le pain finit à 52 %.

**Proposition.**
- Les rations se paient au lot lancé : 1 pain par lot et par niveau pour les ateliers qui transforment, 0,5 pour les ateliers de matières premières. On arrondit au lot entier, en entiers : 1 pain tous les 2 lots.
- La ration fixe tombe à 0 (`perLevelPerDay: 0`).
- Le pain est retiré du stock au lancement (`startProduction`, comme un intrant), donc il passe par `stock_movements`.
- Ordre de grandeur : un comptoir médian qui tourne en continu consomme 40 à 80 pains par jour. C'est une vraie demande, qui suit la production. Produire à perte coûte enfin quelque chose.
- Cibles au simulateur : pain ≥ 75 % de la référence en fin de mois, matières premières ≥ 65 %, ventes nettes médianes de la Vénétie ≤ 115 % des autres régions.

**Référence.** Anno : la main-d'œuvre consomme pour produire. C'est ce qui rend les chaînes vivantes et lie les régions.

**Règle transgressée :** aucune. C'est de l'équilibrage, à valider avec `pnpm sim` et à documenter dans calibration.md.

### E1-5 — Couper les prêts et les entrepôts plutôt que de les simuler
**Type :** correction · **Coût :** S · **Impact :** lisibilité, sûreté de l'économie, un chantier M économisé · **Risque :** faible

**Constat.**
- Le plan de finalisation exige `loop-m1` (effort M) pour faire jouer prêts et entrepôts aux PNJ avant publication.
- Les prêts (`loans.ts` : 30 % du patrimoine, 1 % par jour, `venice1450.settings.ts:938`) sont un piège de conception. Le classement compte les ventes nettes, et les ducats dépensés ne coûtent rien au classement (`turnover.ts` : ni construction ni intérêts dans `COSTS`). S'endetter pour bâtir ne coûte donc jamais rien au classement dès que la demande existe : c'est de l'argent gratuit, à manipuler avec E1-3.
- Les entrepôts sont remplacés par E1-3.

**Proposition.**
- `loans.maxAmount: 0` et `warehouses.perCity: 0` dans les réglages de Venise. Le code reste, pour les mondes plus anciens.
- Retirer leurs entrées de l'interface.
- `loop-m1` devient sans objet.

**Référence.** Hades' Star a retiré des systèmes qui ne servaient qu'aux joueurs déjà forts. L'audit du 16 octobre a fait de même ici avec la mer et les brigands.

**Règle transgressée :** aucune. C'est un retrait par les réglages.

### E1-6 — Des maîtrises qui touchent la vraie contrainte
**Type :** amélioration · **Coût :** S · **Impact :** profondeur, choix réel à J+3 · **Risque :** faible

**Constat.** Sim g1 : Maître d'atelier 16, Levant 5, Roulier 4, Négociant 4, aucune 4.
- Roulier (`vehicleSpeedBps` 2 500, un véhicule de plus) ne sert à rien quand les véhicules sont occupés à 33 %.
- Négociant joue sur les quotas de la Dogana, qui achète au plus 5 unités par jour (`playerDailySellQuota`). Les spéculateurs simulés finissent derniers des actifs : 3 524 de ventes nettes médianes.

**Proposition** (réglages `specialties`, `venice1450.settings.ts:888`) :
- **Roulier** : +1 commande par vague dans le plafond de E1-2, et les urgentes visibles 20 minutes avant leur ouverture. On garde +1 véhicule.
- **Négociant** : quota de vente à la Dogana ×3 (5 → 15 par jour et par bien), plancher de la Dogana à 85 % au lieu de 76 % pour lui, taxe −2 points. C'est un débouché pour les surplus.
- **Maître d'atelier** inchangé (+15 %).
- Cibles au simulateur : aucune maîtrise au-dessus de 40 % des choix ; avance à profil égal ≤ 10 % (règle déjà mesurée par le rapport).

**Référence.** Hades' Star : chaque module de soutien répond à une contrainte précise (cargo, vitesse, mineurs). Aucun ne domine, parce que chacun lève un goulot différent.

**Règle transgressée :** aucune.

### E1-7 — Un seul carnet : 3 tâches du jour et une page de la semaine
**Type :** amélioration · **Coût :** S à M · **Impact :** lisibilité, rythme J7 · **Risque :** faible

**Constat.** Trois listes se recouvrent :
- les tâches du jour (3 par jour et coffre de série, `daily`, `venice1450.settings.ts:724`) ;
- le Livre de compte (11 missions sur 8 jours, `missions`, l. 484) ;
- les missions de la Maison (10 toutes les **84 h**, l. 1116).

`delivery_arrived` est compté dans les trois. Le cycle de 84 h ne tombe ni sur la semaine du classement ni sur la semaine de la Terraferme (lundi, `weekBounds`). Le joueur ne sait pas quelle liste regarder.

**Proposition.**
- Un écran « Carnet » à deux pages.
- **Aujourd'hui :** les 3 tâches et le coffre de série, inchangés.
- **Cette semaine :** 8 missions de la Maison, ouvertes le lundi (`weekBounds`), avec l'Influence de la semaine inchangée au total (≈ 2 × 10 missions de 84 h → 8 missions un peu mieux payées).
- La première semaine d'un marchand, la page hebdomadaire est le Livre de compte actuel (le parcours d'apprentissage), puis elle bascule sur les missions de la Maison.

**Référence.** Marvel Snap et Clash Royale : un quotidien et un hebdomadaire, rien d'autre. Le rendez-vous du lundi s'aligne sur le classement.

**Règle transgressée :** aucune.

### E1-8 — Le mutateur du mois : chaque saison a sa règle
**Type :** mode de jeu (saisonnier) · **Coût :** S à M · **Impact :** rétention J30, renouvellement des stratégies, communication · **Risque :** faible

**Constat.**
- Toutes les saisons se ressemblent. Les actes (`acts`) varient la deuxième semaine, et c'est tout.
- La seule raison de revenir le 1er est de recommencer la même partie.
- CLAUDE.md impose déjà des règles stables pendant le mois et des notes de saison : l'outil existe.

**Proposition.** `settings.seasonMutator`, tiré parmi 6 et annoncé 7 jours avant la fin du mois dans les notes de saison. Même format que les variantes d'acte (`cityPriceBps`, `cityCapacityBps`, `yieldBps`), appliqué à tout le mois. Exemples :
- **Peste de 1450 :** rations ×2 (avec E1-4), pain payé +25 % par les villes.
- **Jubilé de Rome :** demande de pain de Venise ×2, une commande du Doge sur deux en exotiques.
- **Embargo ottoman :** lots de la Muda ÷2, plafond de rareté +100 %.
- **Grand gel :** bois −20 %, planches +20 % chez les villes.
- **Guerre de Milan :** Milan ×1,5 dans la Terraferme, briques et planches +25 %.
- **Foire de la Sensa prolongée :** commandes +10 % tout le mois, mais urgentes ÷2.

Chaque mutateur passe `pnpm sim` (toutes les graines conformes) avant d'entrer au catalogue.

**Référence.**
- Path of Exile : les ligues. Une règle nouvelle par saison remise à zéro, et c'est le moteur de retour des joueurs depuis dix ans.
- Travian : les serveurs spéciaux.

**Règle transgressée :** aucune. Compatible avec « un changement de règle prend effet au changement de mois ».

### E1-9 — Des divisions dans le classement de la semaine
**Type :** nouvelle fonctionnalité · **Coût :** M (serveur seulement, moteur intact) · **Impact :** rétention J7 et J30, objectif atteignable pour tous · **Risque :** faible à moyen (petite population : divisions complétées par les PNJ)

**Constat.**
- Le classement de la semaine est global (`weekly.ts`).
- Les assidus finissent 274 % devant les occasionnels. Le joueur à 2 sessions par jour se voit 30e chaque semaine pour toujours.
- Le « rival de la semaine » est un seul nom, et ne dit pas ce qu'il faut faire pour gagner quelque chose.

**Proposition.**
- Des divisions de 25 marchands (humains d'abord, PNJ ensuite), constituées le lundi selon les ventes nettes de la semaine précédente : Boutique, Comptoir, Fondaco, Rialto, Sénat.
- Les 5 premiers montent, les 5 derniers descendent.
- Les récompenses de la semaine (titres, jours de Pass quand il reviendra) se donnent par division.
- Le classement mensuel ne change pas.

**Référence.**
- Duolingo : les ligues de 30, avec montée et descente. Elles ont fortement augmenté l'engagement hebdomadaire.
- Hades' Star : les White Stars mettent face à face des corporations de force comparable.

**Règle transgressée :** aucune (les récompenses du top 10 se répartissent par division).

### E1-10 — Des privilèges qui changent l'ouverture, pas la puissance
**Type :** nouvelle fonctionnalité · **Coût :** M · **Impact :** rétention J30 et au-delà, sens de l'Influence · **Risque :** moyen (plafond de 15 % à tenir)

**Constat.**
- Le joueur médian gagne 130 d'Influence par saison (sim g1).
- Le catalogue des privilèges ne contient que le nom doré, à 40 (`venice1450.settings.ts:1157`) : il est vidé dès le premier mois.
- Lombardie, Frioul et Alexandrie demandent du contenu dessiné, sans date.

Après la première saison, la Maison n'a plus rien à viser.

**Proposition.** Des privilèges tirés des systèmes qui existent déjà, tous des sidegrades : un autre départ, pas plus de rendement.
- **Maison verrière** (100) : on peut commencer la saison avec la sablière et la verrerie à la place de la chaîne de sa région. La chaîne régionale reste ouvrable en la bâtissant ; le seuil du titre ne s'applique plus au verre.
- **Maison drapière** (120) : même chose avec la draperie.
- **Fondaco héréditaire** (80, après E1-3) : on commence chaque saison avec un fondaco de niveau 1 dans une ville choisie à la rentrée.
- **Ornements du Domaine** (20 à 60) : cosmétiques, sur le dessin du Domaine qui existe déjà.

Il faut choisir une maison de départ pour la saison : un seul privilège d'ouverture actif à la fois. Contrôle `pnpm sim --patents 0.3` : écart ≤ 15 % en médiane des graines.

**Référence.**
- Slay the Spire et Into the Breach : on débloque des options de départ (personnages, escouades), jamais de la puissance brute. La variété fait revenir.
- Hades' Star : une progression lente des choix de modules d'une semaine à l'autre.

**Règle transgressée :** aucune (règles du plan de progression : du neuf, pas du rendement, ≤ 15 %). La Maison verrière ouvre une chaîne de luxe avant son titre : c'est une option, compensée par la perte de la chaîne régionale.

---

## Ordre d'exécution recommandé

1. **Correctifs immédiats** : E1-1, E1-2, E1-5 et E1-6. Tous coûtent S, se font dans les réglages et le moteur, avec une passe de `pnpm sim`.
2. **Équilibrage** : E1-4, puis E1-3 (arbitrage du porteur requis).
3. **Rétention** : E1-7 et E1-8, puis E1-9.
4. **Progression entre saisons** : E1-10, après E1-3.

**Mesures à suivre après chaque lot** (lignes du rapport de `pnpm sim` qui existent déjà) :
- revenu J20-J29 rapporté à J4-J8 ;
- cours du Veneto en fin de mois ;
- commandes perdues par session ;
- assidus devant occasionnels ;
- répartition des maîtrises.
