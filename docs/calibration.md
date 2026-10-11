# Calibrage de l'économie — Venise 1450

Jalon 1 · 10 octobre 2026 · paramètres : `packages/engine/src/themes/venice1450.settings.ts`

## Méthode

Le simulateur (`apps/simulator`) fait jouer une saison complète de 42 jours au moteur réel, par pas de 15 minutes :

- 50 bots au lancement (15 producteurs, 15 artisans, 8 bâtisseurs, 5 spéculateurs, 7 occasionnels) et 10 arrivants tardifs entre J+7 et J+21 ;
- de 1 à 5 sessions par jour selon le profil, et un abandon quotidien de 1 % (4 % pour les occasionnels) ;
- les 6 invariants du grand livre et du journal des stocks sont vérifiés à chaque pas.

Le rapport (`pnpm sim`) compare les indicateurs aux cibles du cadrage sur 5 graines aléatoires.

## Résultat final

Les 5 graines respectent toutes les cibles bloquantes. Une saison prend environ 30 secondes.

| Indicateur | Cible | Graine 1 | Graine 2 | Graine 3 | Graine 4 | Graine 5 |
| --- | --- | --- | --- | --- | --- | --- |
| Invariants | 0 écart | 0 | 0 | 0 | 0 | 0 |
| Indice des prix (min – max) | 80 à 130 | 84 – 103 | 83 – 103 | 85 – 103 | 82 – 103 | 90 – 103 |
| Monnaie par joueur actif (pic) | ≤ 2,5 × capital | 0,98 × | 0,98 × | 0,98 × | 1,00 × | 0,98 × |
| Gini du patrimoine à J+21 | < 0,6 | 0,22 | 0,22 | 0,23 | 0,23 | 0,23 |
| Part du volume entre joueurs (J+14 à J+20) | > 50 % | 84 % | 78 % | 80 % | 81 % | 79 % |
| *Croissance de la monnaie, moyenne J+14 à fin* | *diagnostic : ±2 %/jour* | *2,8 %* | *2,3 %* | *0,7 %* | *3,4 %* | *2,6 %* |

Profil type d'une saison : la monnaie par joueur actif passe de 1 000 ducats à environ 450 vers J+12 (les joueurs investissent leur capital), puis remonte vers 900 à 1 000 en fin de saison. Les joueurs épargnent alors pour des améliorations de plus en plus chères, sans que les prix montent.

## Ce que le simulateur a appris

Chaque ligne est un constat de simulation suivi de la décision prise. Les décisions de conception sont reportées dans `docs/CADRAGE.md`.

| # | Constat | Décision |
| --- | --- | --- |
| 1 | Une amélioration était refusée tant que la file de production tournait, donc jamais pour un joueur assidu | L'amélioration s'applique aux lots suivants (le lot en cours garde son niveau) |
| 2 | Tout le monde avait un moulin : l'argile et le bois n'avaient pas d'acheteur, le PNJ rachetait l'excédent et créait de la monnaie | Chaîne complète par région au départ |
| 3 | Seul le pain faisait entrer de la monnaie : les régions argile et bois dépendaient des boulangers | Les villes achètent aussi briques et planches |
| 4 | Capacité de production 3 à 5 fois supérieure à la demande : indice des prix à 47 | Recettes ralenties (lots de 2 h) : un comptoir de niveau 1 couvre moins que la demande, la croissance comble l'écart |
| 5 | Bonus régional de +30 % : 13 unités brutes pour 10 consommées, excédent permanent | Production brute de base à 8 par lot : avec le bonus, exactement 10 |
| 6 | Bâtiments comptés à 50 % dans le classement : investir faisait baisser le score | Bâtiments comptés à leur coût |
| 7 | En fin de saison, plus rien de rentable à financer : la monnaie s'accumulait, quels que soient les réglages d'entretien ou de demande | Palais (prestige, sans production) ; entretien croissant avec le niveau (+20 % par niveau) |
| 8 | Le PNJ rachetait à 90 % du prix de référence quand le marché était à 35 % | Le PNJ suit le marché à la baisse uniquement, plancher à 50 % |
| 9 | La monnaie par joueur actif croît avec la taille des affaires alors que les prix restent stables | L'inflation se mesure par l'indice des prix ; la monnaie par joueur actif a un plafond, sa croissance devient un diagnostic |

## Réglages principaux

| Paramètre | Valeur |
| --- | --- |
| Capital de départ | 1 000 ducats |
| Lot de production | 2 h ; brut 8 (10 avec le bonus régional) ; moulin 10 blé → 8 farine ; four 8 farine → 10 pains ; briqueterie et scierie 10 → 6 |
| Prix de référence (deniers) | blé 100, farine 160, pain 180, argile 100, briques 220, bois 100, planches 220 |
| Demande des villes, par joueur actif et par jour | pain 130, briques 35, planches 35 (prix qui baisse jusqu'à −50 %) |
| Entretien | 20 à 30 ducats par jour au niveau 1, × niveau × (1 + 20 % par niveau au-delà de 1) |
| Coût d'amélioration | coût de base × niveau |
| PNJ teneur de marché | écart 4 % → 20 % en 14 jours ; 2 unités par ressource, par joueur actif et par jour |
| Grands chantiers | hebdomadaires, 60 briques et 60 planches par joueur actif, payés 10 % au-dessus de la référence |
| Palais | 800 ducats, 40 briques, 40 planches au niveau 1 ; entretien 10 ducats |

## Limites

- **Les bots ne sont pas des joueurs.** Ils suivent des règles simples et se ressemblent, ce qui explique un Gini bas (0,22). De vrais joueurs seront plus inégaux et plus inventifs : spéculation, arbitrage contre le PNJ, ententes.
- **L'abandon est un paramètre, pas une mesure.** Les 27 joueurs actifs sur 60 en fin de saison découlent du taux d'abandon fixé pour les bots.
- **Les guildes ne sont pas simulées.** Les grands chantiers sont livrés individuellement.
- **Le plafond de monnaie par joueur actif n'est jamais approché** (pic au capital de départ, à J0). C'est un garde-fou contre un emballement, pas un réglage fin.

## Refaire le calibrage

```sh
pnpm sim                                            # 5 graines, rapport dans apps/simulator/out/report.md
pnpm sim --seeds 1 --scenario scenarios/high-tax.json   # surcharge de paramètres (chemin relatif à apps/simulator)
```

Les CSV détaillés (`daily_metrics.csv`, `prices.csv`, `players_daily.csv`) sont écrits par graine dans `apps/simulator/out/`. Ils ne sont pas versionnés.

## Monde vivant : rations, combustible, contrats, événements, galères

Les bots ont appris les nouvelles mécaniques : ils gardent trois jours de pain, achètent leur bois, honorent les contrats qu'ils peuvent couvrir, affrètent des galères quand ils ont des surplus et vendent épices et soie aux villes. `pnpm --filter @comptoirs/simulator inspect` compte ce qu'ils font de chaque mécanique sur une saison.

Réglages ajoutés ou modifiés :

| Paramètre | Valeur | Raison |
| --- | --- | --- |
| Rations | 2 pains par niveau et par jour ; lots +50 % sans pain | Demande universelle de pain |
| Combustible | 2 bois par lot (boulangerie, briqueterie) | Demande de bois hors des Dolomites |
| Camp de bûcherons | 11 bois par lot (14 avec le bonus) au lieu de 8 | Sans excédent de bois, l'économie s'étouffait (932 épisodes de faim, 861 entretiens impayés) |
| Entretien | −25 % environ | Les rations s'ajoutent désormais à l'entretien en ducats |
| Stock de départ | 20 pains pour tous, 10 bois pour Terraferma et la Lagune | Le tutoriel doit pouvoir tourner dès la première minute |
| Contrats | 3 par jour, prime de 20 % | Débouché pour toutes les ressources |
| Événements | tous les 2 jours, 24 h, 5 types | Variété sans chaos |
| Galères | voir le cadrage | Plus-value espérée positive, mais avec du risque |

Résultat sur 5 graines : toutes les cibles bloquantes tenues, indice des prix entre 93 et 101, 70 à 81 % du volume entre joueurs. Sur une saison type (graine 1), les échanges entre joueurs portent sur toutes les ressources : environ 17 600 blés, 11 600 bois, 8 400 farines, 3 400 argiles, 2 100 pains.

Limites : les bots affrètent peu de galères (ils gardent rarement assez de surplus) ; environ 10 % des jours-joueurs actifs connaissent la faim et 12 % un entretien impayé, parce que les bots investissent agressivement. De vrais joueurs devraient faire mieux ; la bêta le dira.

## Petit monde : quelques joueurs et des maisons PNJ

Pendant la bêta, le monde compte peu de joueurs ; des maisons marchandes tenues par l'ordinateur le complètent jusqu'à 15 marchands actifs. Le simulateur reproduit ce cas : `pnpm sim --players 18` fait jouer 18 marchands dès le premier jour, sans arrivant tardif.

| Indicateur | Graine 1 | Graine 2 | Graine 3 | Graine 4 | Graine 5 |
| --- | --- | --- | --- | --- | --- |
| Indice des prix (min – max) | 94 – 101 | 94 – 101 | 98 – 101 | 96 – 101 | 95 – 102 |
| Part du volume entre joueurs | conforme | 47 % | conforme | 36 % | 44 % |

Les prix tiennent. La part du volume entre joueurs passe sous 50 % sur 3 graines : c'est attendu, parce que le PNJ teneur de marché garde un plancher de 40 unités par jour et par ressource (`minDailyDepth`), justement pour qu'un petit monde ait toujours un marché. La cible de 50 % vaut pour un monde peuplé ; elle reste bloquante pour la simulation par défaut (60 marchands), qui est toujours conforme sur les 5 graines.

## La mer : ports, flotte et corsaires

Les bots armateurs (producteurs, bâtisseurs, spéculateurs) construisent une cogue ou une galère quand leur trésorerie le permet, réparent leurs navires et envoient leurs surplus vers le port qui rapporte le plus par jour de mer cette semaine. Les spéculateurs gardent un navire de côté et arment des corsaires sur les routes courtes.

| Paramètre | Valeur | Raison |
| --- | --- | --- |
| Cogue / galère / caraque | 400 / 900 / 1 800 ducats + 20 / 40 / 60 planches | Débouché supplémentaire pour les planches |
| Cale | 1 000 / 1 500 / 3 000 ducats | Une caraque remplace deux affrètements |
| Droits de port | 30 % de l'affrètement | Posséder un navire est rentable après 3 à 4 voyages |
| Variation hebdomadaire des ports | ±25 % | Il y a chaque semaine une meilleure destination à trouver |
| Lettre de marque | 100 ducats, 12 h, 4 pains par navire | Piller coûte : un abordage raté fait perdre la lettre et oblige à réparer |
| Part prise | 30 % | Perte sensible mais jamais ruineuse |

Résultat sur 5 graines : toutes les cibles bloquantes tenues, indice des prix entre 97 et 101, 63 à 80 % du volume entre joueurs.

Limites : les bots restent de piètres armateurs. Ils gardent peu de surplus, donc ils prennent rarement la mer (6 convois et 10 croisières corsaires sur une saison type), et les rencontres entre corsaires et convois sont rares dans la simulation. Le rendement réel de la piraterie se mesurera pendant la bêta, avec de vrais joueurs ; les réglages (part prise, prix de la lettre, chances) sont dans `worlds.settings.privateers`.

## Les PNJ à côté des joueurs

Premier test avec les maisons PNJ : elles achetaient en quelques minutes tout le stock du jour du PNJ teneur de marché (40 unités par ressource) et revendaient leurs surplus à son prix d'achat. Les joueurs ne trouvaient plus rien à acheter.

Dans le monde réel (pas dans la simulation de calibrage), les PNJ jouent donc autrement :

- ils achètent d'abord aux joueurs, et au teneur de marché seulement au-delà des **25 dernières unités du jour par ressource**, réservées aux joueurs ;
- ils ne revendent pas au teneur de marché : leurs surplus restent en vente au carnet, au-dessus de son prix d'achat ;
- ils ne gardent pas de matériaux de côté pour leur prochaine construction : briques et planches sont mises en vente.

Sans aucun accès au teneur de marché, l'économie des PNJ se bloquait (bois introuvable, boulangeries à l'arrêt, faim). `pnpm sim --players 15 --live` reproduit ce petit monde.

## La Dogana (ex-Fondaco) : un quota par marchand

Le PNJ teneur de marché s'appelle désormais **la Dogana** dans le jeu (il s'appelait le Fondaco avant que le jeu ne prenne ce nom). Jusqu'ici, son stock du jour (40 unités par ressource dans un petit monde) était commun à tous : les maisons PNJ le vidaient en quelques minutes et les joueurs ne trouvaient plus rien.

Chaque marchand a maintenant son propre quota par ressource et par jour : il peut acheter 25 unités à la Dogana et lui en vendre 10 (la vente crée de la monnaie, d'où un quota plus serré). Quand le monde se remplit, les quotas se partagent un plafond de 250 unités par jour et par ressource : 15 par marchand à 16 marchands actifs, 5 à 50.

| Réglage essayé | Graines conformes | Part du volume entre joueurs |
| --- | --- | --- |
| Quota fixe 10 à 30 (sans plafond) | 0 à 2 sur 3 | 25 à 61 % |
| Achat 25, vente 10, sans plafond | 2 sur 5 | 44 à 63 % |
| Achat 25, vente 10, plafond 150 | 3 sur 5 | 46 à 78 % |
| **Achat 25, vente 10, plafond 250 (retenu)** | **5 sur 5** | **53 à 72 %** |

Le calibrage a révélé un défaut des bots : une fois leur quota épuisé, ils visaient encore le prix de la Dogana, n'achetaient rien et ne laissaient pas d'offre aux autres joueurs. Ils ne regardent plus que les offres des joueurs quand leur quota est épuisé.

Les prix restent stables (indice 96 à 100 sur les 5 graines).

## Matières premières locales et prime de spécialisation

Constat de la bêta : un joueur pouvait construire les sept ateliers et produire tout lui-même ; le marché ne lui servait plus qu'à vendre.

| Réglage | Valeur | Raison |
| --- | --- | --- |
| Extraction régionale (`buildingRegions`) | ferme en Terraferma, carrière d'argile dans la Lagune, camp de bûcherons dans les Dolomites | Chaque région dépend des deux autres pour ses matières premières, toute la saison. Les ateliers de transformation restent constructibles partout. Un atelier déjà construit hors de sa région produit encore mais ne peut plus être amélioré |
| Prime de niveau (`levelYieldBonusBps`) | +25 % de rendement par niveau au-delà du premier | L'entretien croît de 20 % par niveau : sans prime, concentrer ses ateliers coûtait plus qu'il ne rapportait. Un niveau 5 produit désormais 10 fois un niveau 1 pour les mêmes matières |

Résultat sur 5 graines (prime à 25 %, comme à 15 %) : toutes les cibles bloquantes tenues, indice des prix entre 96 et 100, 53 à 73 % du volume entre joueurs. Deux nouveaux indicateurs de diagnostic : 59 à 60 marchands sur 60 achètent au moins une matière première, 2,5 types d'ateliers par marchand en fin de saison.

Limite : les bots se spécialisaient déjà (ils ne construisent que la chaîne de leur région), donc la simulation montre surtout que la règle ne dérègle pas l'économie. Son effet sur les joueurs, qui eux visaient l'autarcie, se mesurera pendant la bêta.

## Progression : améliorations moins chères, production de nuit

Constat de la bêta : passer un atelier au niveau 2 demandait environ une semaine de jeu, et la production s'arrêtait la nuit (file limitée à 8 h). La simulation le confirmait : les bots finissaient la saison avec des ateliers au niveau 1,1 en moyenne.

| Réglage | Avant | Après |
| --- | --- | --- |
| Croissance du coût par niveau (`levelCostGrowthBps`) | +100 % (niveau 5 = 5 × le prix de base) | +50 % (niveau 5 = 3 ×) |
| File de production (`productionQueueMaxHours`) | 8 h | 12 h : une production lancée le soir tourne toute la nuit |

Résultat sur 5 graines : toutes les cibles bloquantes tenues, indice des prix entre 95 et 100, 55 à 83 % du volume entre joueurs, masse monétaire par joueur actif au plus 1,86 × le capital (plafond 2,5 ×). Niveau moyen des ateliers en fin de saison : 1,16 à 1,30 (contre 1,07 à 1,12), aucun atelier au niveau maximal.

Le nouveau diagnostic « Niveau moyen des ateliers » suit la progression. Les bots investissent prudemment ; de vrais joueurs devraient monter plus vite. Si la progression reste lente pendant la bêta, prochain levier : diviser par deux les matériaux du passage au niveau 2.

La carte des rations affiche désormais l'heure du prochain repas, le pain nécessaire et le pain en stock ; pendant la faim, chaque atelier affiche la durée réelle de ses lots (+50 %).

## Rétention : sommeil du comptoir et Livre de compte

| Réglage | Valeur |
| --- | --- |
| Sommeil (`dormancy`) | après 24 h sans action : 25 % de l'entretien, pas de rations consommées ni de faim |
| Missions (`missions`) | 10 missions sur 7 jours ; récompenses : 10 à 20 pains, 5 à 15 briques ou planches, 50 à 150 ducats |

Les missions créent au plus environ 300 ducats et quelques dizaines de marchandises par joueur et par saison : négligeable devant les ventes aux villes. Le sommeil réduit la monnaie détruite par l'entretien des joueurs absents.

Résultat sur 5 graines : toutes les cibles bloquantes tenues, indice des prix entre 96 et 100, 56 à 83 % du volume entre joueurs, masse monétaire par joueur actif au plus 1,88 × le capital. Les bots ne réclament pas de missions : leur effet sur l'économie se mesurera avec la bêta.

## Saisons d'un mois civil

Une saison dure désormais un mois civil (28 à 31 jours, heure de Paris) au lieu de 42 jours. Le simulateur joue un mois nominal de 30 jours ; ses jalons suivent la durée (Gini à mi-saison, volume entre joueurs du tiers à la moitié, arrivants tardifs entre le sixième et la moitié). Les semaines restent de 7 jours depuis l'ouverture ; la dernière court jusqu'à la fin du mois, et le dernier grand chantier aussi plutôt que d'en ouvrir un de deux jours.

Nouveau diagnostic : **niveaux d'ateliers par marchand** en fin de saison (un atelier neuf compte 1). Le niveau moyen seul trompait : les bots construisent un atelier de plus tant que c'est moins cher qu'améliorer.

| Réglage (3 graines) | Niveaux d'ateliers par marchand | Remarque |
| --- | --- | --- |
| Référence : 42 jours, anciens réglages | 5,8 | |
| 30 jours, anciens réglages | 5,1 | une graine sous 50 % de volume entre joueurs |
| + écart de la Dogana sur 10 jours au lieu de 14 | 5,1 | toutes les graines conformes |
| + coût par niveau +10 à +25 % (au lieu de +50 %) | 5,1 à 5,2 | sans effet : les bots construisent plutôt qu'améliorer |
| + coût par niveau nul | 6,8 (niveau moyen 2,2) | trop : des ateliers au niveau 5 en un mois |
| + bâtiments −30 % en ducats | 5,6 | |
| **+ bâtiments −30 % en ducats et −25 % en matériaux (retenu)** | **6,1** | un mois mène un peu plus loin que six semaines |

Réglages retenus : `seasonDays` 30 (mois nominal), inscriptions ouvertes tout le mois, bonus d'arrivée tardive après J+5, `spreadRampDays` 10, bâtiments 30 % moins chers en ducats et 25 % en matériaux (ferme 210 ducats, 15 briques et 15 planches ; palais 560 ducats, 30 et 30).

## Présence active : produits frais, Criées, tâches du jour

| Réglage | Valeur |
| --- | --- |
| Produits frais (`fresh`) | +5 % pour un lot ramassé dans les 30 minutes après la fin |
| Criées (`criees`) | 3 par jour entre 8 h et 22 h, 20 minutes, pain, briques ou planches à +10 à +20 % ; 6 unités par marchand, 4 par marchand actif au total (24 au moins) |
| Tâches du jour (`daily`) | 3 tirées parmi 6, petites récompenses en marchandises ; coffre de 10 ducats, +3 par jour d'affilée, 22 au plus (5 jours) |

Les bots vendent aux Criées quand une session tombe pendant l'une d'elles et réclament leurs tâches ; un bot occasionnel (1 session par jour) en profite donc rarement, comme un joueur occasionnel.

Premier essai (Criées de 20 unités à +15 à +25 %, coffre de 30 à 90 ducats) : les bots assidus finissaient 28 % devant les occasionnels, bien au-delà de la cible de +5 à +10 %. Avec 8 unités et un coffre de 10 à 30 ducats : +10,5 %. Réglage retenu : +1 % à +10 % selon la série de graines (la mesure est bruitée : peu de bots occasionnels). Ces mécaniques créent de la monnaie et accélèrent toute l'économie : 7,4 niveaux d'ateliers par marchand en moyenne en fin de mois.

Résultat sur 5 graines avec tous les réglages : toutes les cibles bloquantes tenues.

| Indicateur | Graine 1 | Graine 2 | Graine 3 | Graine 4 | Graine 5 |
| --- | --- | --- | --- | --- | --- |
| Niveaux d'ateliers par marchand | 7,3 | 7,7 | 7,9 | 6,0 | 8,1 |
| Monnaie par joueur actif (pic, plafond 2,5 ×) | 1,81 × | 1,45 × | 1,21 × | 1,06 × | 1,01 × |
| Indice des prix | 97 – 101 | 97 – 100 | 97 – 100 | 98 – 100 | 97 – 101 |
| Gini à J+15 | 0,23 | 0,21 | 0,21 | 0,19 | 0,20 |
| Volume entre joueurs (J+10 à J+14) | 78 % | 69 % | 78 % | 63 % | 76 % |

## Pass Négociant

| Avantage (`pass`) | Valeur |
| --- | --- |
| Quota quotidien à la Dogana | +20 % de la part du marchand (25 → 30 à l'achat, 10 → 12 à la vente) |
| Offres ouvertes | +2 (12 au lieu de 10) |
| Produits frais | +8 % au lieu de +5 % |
| Commandes du Doge | une échangée par jour |

S'y ajoutent, côté serveur, des avantages d'information (carnet à 10 offres, 7 jours d'historique, vigie des corsaires, alertes des Criées et des bonnes affaires) et des cosmétiques, que les bots n'utilisent pas.

`pnpm sim --pass 0.2` donne le Pass à un bot sur cinq de chaque profil et rejoue chaque saison à l'identique avec les avantages coupés, pour comparer chaque marchand à lui-même (en retirant l'effet sur les non-abonnés). Trois contrôles bloquants :

| Contrôle | Graine 1 | Graine 2 | Graine 3 | Graine 4 |
| --- | --- | --- | --- | --- |
| Avance des abonnés (≤ +5 %) | +0,6 % | +2,5 % | −4,5 % | −23,9 % |
| Part des abonnés dans le top 10 (≤ 35 %, ils sont ~18 %) | 0 % | 20 % | 10 % | 10 % |
| Gratuit assidu devant abonné occasionnel | 7 477 contre 2 487 ducats | — | — | 5 823 contre 2 563 ducats |

Le Pass reste léger pour des bots : quelques pourcents au plus. La graine 4 montre la limite de la mesure (deux parties qui divergent). De vrais joueurs tireront davantage de l'information (alertes, vigie) : à surveiller pendant la bêta, avec la règle de CLAUDE.md comme garde-fou.

## Fourchette de prix des offres entre joueurs

Une offre entre joueurs doit rester entre le quart et quatre fois le prix de référence (`priceBand` : 2 500 à 40 000 points de base). Elle empêche un second compte de passer des ducats au premier (un pain vendu une fortune), ce qui comptait davantage depuis que le top 10 gagne le Pass Négociant.

Sur les 5 graines, les résultats sont identiques à ceux de la section précédente (toutes conformes, aucun ordre de bot refusé) : la fourchette ne gêne pas le commerce normal.

## Familles patriciennes

Réglage (`families`) : allégeance 4 jours après l'arrivée, une commande de famille par jour à la prime du Doge (+20 %), Doge ramené de 3 à 2 commandes par jour, +10 influence par commande, mécénat à 2 ducats le point (25 points par jour au plus), influence comptée jusqu'à 150 par membre et par semaine, au moins 3 membres comptés, prime de +10 % pour la famille au pouvoir, *contumacia* de 33 %. Plan et règles : `docs/plan-familles.md`.

Ce que le simulateur a appris :

| Constat | Décision |
| --- | --- |
| Sans règle contre le sortant, la famille aux commandes les plus faciles (Morosini : blé, pain) gagnait 12 semaines sur 15 | *Contumacia* : la famille au pouvoir compte son score un tiers plus bas |
| Les maisons PNJ ne livraient que depuis leur stock : les Contarini (briques, planches gardées pour construire) n'avaient aucune chance | Les maisons achètent ce qui manque pour la commande de leur famille, jusqu'à 115 % du prix juste |
| Une commande de 30 blé ou 30 bois dépassait le quota gratuit à la Dogana (25) mais pas celui du Pass (30) : l'abonnement décidait de la commande | Toutes les commandes de famille tiennent sous le quota gratuit (20 au plus pour les Morosini) |

Résultat sur 5 graines (`pnpm sim`), toutes conformes :

| | Graine 1 | Graine 2 | Graine 3 | Graine 4 | Graine 5 |
| --- | --- | --- | --- | --- | --- |
| Au pouvoir, semaines 1 à 3 | Morosini, Contarini, Morosini | Morosini, Contarini, Morosini | Morosini, Morosini, Contarini | Morosini, Contarini, Morosini | Morosini, Morosini, Mocenigo |
| Commandes de famille livrées | 544 | 604 | 566 | 412 | 557 |
| Mécénat détruit | 3 614 ducats | 4 414 | 5 446 | 1 310 | 5 034 |
| Indice des prix | 97 – 101 | 97 – 100 | 97 – 100 | 97 – 101 | 97 – 100 |
| Gini à J+15 | 0,22 | 0,19 | 0,21 | 0,20 | 0,16 |
| Volume entre joueurs | 66 % | 72 % | 75 % | 62 % | 67 % |
| Monnaie par joueur actif (pic) | 1,02 × | 1,45 × | 1,12 × | 1,05 × | 1,10 × |

Le budget de monnaie créée par les commandes ne bouge presque pas (Doge + familles ≈ trois commandes du Doge, +4 % avec la prime du pouvoir), et le mécénat ajoute un puits de 1 à 2 % des destructions. La croissance moyenne de la monnaie par joueur actif passe d'environ 3,7 % à 2,5 à 3 % par jour (diagnostic toujours au-dessus de la cible de ±2 %). Les Dandolo (Levant) restent petits avec les bots : seuls les spéculateurs, peu nombreux, les choisissent.

**Contrôle du Pass (`pnpm sim --pass 0.2`) : non conforme, à trancher.** Avance des abonnés : −22,6 %, +5,3 %, +7,5 %, −9,3 %, +11,3 % (plafond +5 %) ; part du top 10 et « gratuit assidu devant abonné occasionnel » conformes. Sans familles, les mêmes graines donnaient de −33,8 % à +2,5 %. En isolant les avantages sur les graines 2, 3 et 5, le quota Dogana seul donne −7,6 %, +11,4 %, +0,7 %, et les autres avantages seuls −10,3 %, +15,0 %, +15,9 % : des écarts de cette taille pour des avantages aussi petits viennent surtout de la divergence des deux saisons rejouées (la famille qui prend le pouvoir bascule d'une partie à l'autre), que le contrôle ne compte que dans un sens. Pistes : mesurer sur plus de graines ou par la moyenne, ou réduire la prime de la famille au pouvoir, avant d'ouvrir les familles en production.

## Livraisons par la route : mesure de référence (avant le changement)

11 octobre 2026. Mesure prise avant de toucher à la vente aux villes (`docs/plan-livraisons.md`, § 7.1), avec deux nouveaux diagnostics du rapport :

- **monnaie payée pour les marchandises**, par joueur actif et par jour, de J+1 à la fin, par source (ventes aux villes, commandes du Doge, commandes de famille, Criées) ;
- **assidus devant occasionnels** : patrimoine médian en fin de saison des profils assidus (producteur, artisan, bâtisseur, spéculateur) rapporté à celui des occasionnels, parmi les marchands présents dès le départ et encore actifs.

`pnpm sim` (5 graines, toutes conformes) :

| | Graine 1 | Graine 2 | Graine 3 | Graine 4 | Graine 5 | Moyenne |
| --- | --- | --- | --- | --- | --- | --- |
| Ventes aux villes (ducats / joueur actif / jour) | 134,6 | 172,4 | 143,7 | 96,4 | 128,1 | 135,0 |
| Commandes du Doge | 19,3 | 19,5 | 20,2 | 18,8 | 19,3 | 19,4 |
| Commandes de famille | 13,5 | 14,3 | 13,5 | 11,5 | 12,9 | 13,1 |
| Criées | 0,7 | 0,9 | 0,6 | 0,5 | 0,5 | 0,6 |
| **Total payé pour les marchandises** | **168,1** | **207,1** | **178,1** | **127,2** | **160,8** | **168,3** |
| Indice des prix | 97 – 101 | 97 – 100 | 97 – 100 | 97 – 101 | 97 – 100 | |
| Monnaie par joueur actif (pic) | 1,02 × | 1,45 × | 1,12 × | 1,05 × | 1,10 × | |
| Assidus devant occasionnels | +242 % | +40 % | +65 % | +131 % | +28 % | |

Cible des livraisons : **168 ducats par joueur actif et par jour, à ±10 % (151 à 185)**, en moyenne sur les graines.

L'écart brut entre assidus et occasionnels est très bruité (de +28 % à +242 %) : il ne reste en fin de saison que deux à cinq occasionnels actifs par graine, et ils ont joué une session par jour pendant un mois. La cible « 5 à 10 % » du plan vaut pour l'écart *ajouté* par une mécanique de présence (c'est ainsi qu'elle a été mesurée pour les Criées) ; pour les livraisons, on vérifiera que l'écart brut ne se creuse pas par rapport à cette référence.

`pnpm sim --pass 0.2` (graines 1 à 3) : avance des abonnés −22,6 %, +5,3 % et +7,5 % (deux graines non conformes, déjà avant les livraisons, voir « Familles patriciennes ») ; part du top 10 et « gratuit assidu devant abonné occasionnel » conformes.

## Livraisons par la route : calibrage

Réglages de `deliveries` et `bandits` (Venise) partis des valeurs de `docs/plan-livraisons.md`, ajustés au simulateur. Nouveaux diagnostics du rapport : livraisons, utilisation des véhicules, attaques, perte moyenne d'un livreur, rendement du brigandage (brigand actif : les spéculateurs, qui connaissent les routes fréquentées ; brigand occasionnel : les marchands occasionnels, qui choisissent une route au hasard), livreur prudent contre brigand (gain par heure : marge au-dessus du prix de référence par heure de route d'un bâtisseur, contre gain net par heure de bande), monnaie détruite par le transport.

| Essai (graine 1) | Monnaie payée / joueur actif / jour | Brigand actif | Constat |
| --- | --- | --- | --- |
| Valeurs de la note (bonus 10 %/h, bande 25 ducats/h + 2 pains/h, attaque 40 %) | 109 | −99,7 % | Une prise rapporte 5 à 8 ducats (15 % d'une cargaison de 30 à 60 ducats) : aucune mise de cet ordre ne se rembourse |
| Bande 0,5 ducat/h sans vivres, attaque 70 % sans escorte | 121 | −45 % | Les bots ripostent souvent quand ils sont en ligne |
| + bonus de distance 40 %/h, 12 à 16 commandes | 152 | +19 % | |
| + bonus 50 %/h, attaque 90 % | 165 | +39 % | Trop facile pour le brigand |
| **Bonus 50 %/h, 12 à 16 commandes, bande 0,3 à 0,4 ducat/h, attaque 70 / 25 / 8 %** | **160 à 168** | **−18 à +8 %** | retenu, voir ci-dessous |

Le simulateur a aussi appris :

| Constat | Décision |
| --- | --- |
| Chaque livraison terminée restait dans l'état du monde (un seul document JSON) : la saison simulée passait de 55 à 190 s | Les livraisons et les bandes terminées sont oubliées 3 jours après leur fin ; le moteur lit l'état d'avant la commande pour les parcourir |
| Les bots n'achetaient un second véhicule que si le premier était en route au début d'une session, ce qui n'arrivait presque jamais | Ils l'achètent quand des commandes qu'ils pourraient charger restent faute de véhicule |
| Sans marchandises d'outre-mer sur la route, épices et soie n'avaient plus de débouché en ville | Les villes les commandent aussi, quatre fois moins souvent que les produits de la terre ferme (`weights`) |
| Les ventes des maisons aux Criées et l'échange de commande du Pass n'ont plus d'objet | Criées et échange coupés (`criees.perDay` 0, `pass.contractRerollsPerDay` 0) ; tâches du jour « Livrer 2 commandes » et « Livrer une urgente » |

Résultat sur 5 graines (`pnpm sim`, bande à 0,4 ducat/h), toutes conformes aux cibles bloquantes :

| | Graine 1 | Graine 2 | Graine 3 | Graine 4 | Graine 5 | Cible |
| --- | --- | --- | --- | --- | --- | --- |
| Monnaie payée pour les marchandises (ducats / joueur actif / jour) | 163,3 | 167,0 | 159,9 | 168,0 | 166,2 | 151 à 185 (référence 168,3) |
| Indice des prix | 93 – 100 | 93 – 100 | 93 – 100 | 93 – 100 | 93 – 100 | 80 à 130 |
| Perte moyenne d'un livreur | 0,4 % | 0,4 % | 0,4 % | 0,4 % | 0,3 % | < 3 % |
| Rendement du brigand actif | −2,5 % | +5,1 % | −17,8 % | +8,4 % | −5,5 % | 0 à +20 % |
| Rendement du brigand occasionnel | −100 % | −67 % | −41 % | +71 % (18 bandes) | −40 % | négatif |
| Livreur prudent / brigand (ducats par heure) | 5,2 / 0,0 | 5,0 / 0,0 | 5,0 / −0,1 | 5,3 / 0,0 | 5,3 / 0,0 | livreur devant |
| Utilisation des véhicules des assidus | 25 % | 27 % | 27 % | 27 % | 25 % | 50 à 80 % |
| Monnaie détruite par le transport | 6,7 % | 6,6 % | 6,8 % | 6,7 % | 7,0 % | des destructions |
| Niveaux d'ateliers par marchand | 6,9 | 7,0 | 6,7 | 6,8 | 7,0 | (7,5 avant) |

La mise d'une bande est finalement passée à **0,35 ducat de l'heure** : le butin et la mise étant proportionnels, le rendement du brigand actif se recentre autour de +10 % (de −6 % à +24 % sur les mêmes saisons).

Ce qui ne tient pas, et pourquoi :

- **Le rendement du brigand reste très bruité** d'une graine à l'autre (une centaine de bandes de bots par saison, une prise vaut quelques ducats) : la moyenne est dans la cible, pas chaque graine. Le levier est `feePerHour`, à réviser avec les vraies bandes de la bêta.
- **Utilisation des véhicules à 25 %** : les bots jouent 2 à 4 sessions par jour et ne relancent une charrette qu'à leur session suivante. Un joueur qui revient à la notification « livraison arrivée » fera mieux ; la mesure réelle viendra de la bêta.
- **L'écart entre assidus et occasionnels se creuse** (de +28 à +242 % avant, de +173 à +302 % après, mesure brute très bruitée) : un occasionnel ne livre qu'une commande par session avec sa charrette, là où il vidait son stock d'un coup aux villes. Voir l'essai à deux charrettes ci-dessous.
- **Pass (`pnpm sim --pass 0.2`)** : avance des abonnés −15,9 %, +13,9 %, −4,2 %, +3,7 %, −13,5 % : une graine non conforme sur cinq (avant les livraisons : deux sur trois, +5,3 % et +7,5 %). Le Pass n'a aucun avantage sur la route ; l'écart vient surtout de la divergence des deux saisons rejouées, déjà constatée avec les familles.

### Essai : deux charrettes au départ (non retenu)

Pour que l'occasionnel livre deux commandes par session, essai avec deux charrettes à l'arrivée et un bonus ramené à +40 %/h (5 graines) :

| | Graine 1 | Graine 2 | Graine 3 | Graine 4 | Graine 5 |
| --- | --- | --- | --- | --- | --- |
| Monnaie payée (ducats / joueur actif / jour) | 152,1 | 162,2 | 159,6 | 159,9 | 161,5 |
| Assidus devant occasionnels | +117 % | +104 % | +123 % | +77 % | +158 % |
| Rendement du brigand actif | −9,5 % | −29,7 % | −20,3 % | +3,9 % | −0,2 % |
| Pass : avance des abonnés (≤ +5 %) | −10,1 % | **+39,2 %** | **+22,6 %** | **+27,5 %** | **+13,2 %** |

L'écart des occasionnels redescend, mais le contrôle du Pass échoue sur quatre graines : avec plus de capacité de transport, c'est le stock qui limite les livraisons, et le quota augmenté de la Dogana (avantage du Pass) devient décisif. La règle du Pass étant non négociable, **une seule charrette au départ est retenue** ; l'écart des occasionnels reste à trancher par le porteur (pistes : une charrette de plus gagnée par une mission, ou supprimer l'avantage de quota du Pass à la Dogana).

## Rythme de jeu : audit et rééquilibrage (production plus rapide, commandes à la taille d'un lot)

Constat du porteur : on ne pouvait répondre à presque aucune commande, le jeu était trop lent.

**Audit.** Un lot durait 2 h et produisait 6 à 14 unités, alors qu'une commande demandait 15 à 40 pains ou 6 à 15 briques : 4 à 8 h de production par commande. Le pain sortait au bout de 6 h (blé, farine, pain). Le tableau tirait ses commandes parmi 13 ressources, dont un boulanger n'en produit que trois, et le stock de départ (20 pains, 10 bois) ne couvrait presque rien. Nouveaux diagnostics du simulateur, mesurés à chaque session d'un marchand :

| | Avant | Après |
| --- | --- | --- |
| Commandes ouvertes que le stock couvre déjà | 26 à 28 % | 48 à 52 % |
| Première livraison après l'arrivée (médiane) | 14,8 h | 0 à 2,8 h |
| Livraisons par joueur actif et par jour | 3,3 | 4,0 |

**Réglages.**

| Réglage | Avant | Après |
| --- | --- | --- |
| Lots de production (thème) | 2 h | 1 h, même quantité : on produit deux fois plus |
| Commandes de ville | pain 15–40, blé/argile/bois 20–40, farine 15–30, briques/planches 6–15 | pain 8–20, blé/argile/bois 10–25, farine 8–18, briques/planches 4–10 |
| Commandes du Doge et des familles | 12 à 30 | 8 à 20 |
| Tableau | 12 à 16 commandes | 16 à 20, dont la moitié sur la chaîne du marchand (`homeShareBps`) |
| Prix d'une commande de ville | référence +50 %/h de route | référence ×1,25 +50 %/h (commandes plus petites, même budget) |
| Stock de départ | 20 pains, 10 bois | de quoi livrer deux fois : 40 pains (Terraferma), 15 briques et 20 argiles (Lagune), 15 planches et 30 bois (Dolomites) |
| Commande de bienvenue | — | le jour de l'arrivée, 12 pains, 8 briques ou 8 planches vers la ville la plus proche |

**Résultat sur 5 graines (`pnpm sim`), toutes conformes aux cibles bloquantes :** monnaie payée pour les marchandises 163 à 167 ducats par joueur actif et par jour (référence 168), indice des prix 93 à 100, monnaie par joueur actif au plus 0,99 × le capital, Gini à mi-saison 0,31 à 0,39 (contre 0,25 : les assidus profitent davantage d'une production plus rapide), perte d'un livreur 0,3 à 0,4 %.

### Deuxième passe : lots de 30 minutes, commandes réservées aux producteurs, plus de chantiers

Demandes du porteur : plus de commandes livrables, des matières premières commandées seulement à ceux qui les produisent (sinon une commande revient à acheter puis revendre), plus de grands chantiers, et jusqu'à 30 % de monnaie créée en plus si besoin. Le Pass Négociant sera refait : son contrôle n'est plus un critère de calibrage pour l'instant.

| Réglage | Avant | Après |
| --- | --- | --- |
| Lots de production | 1 h | 30 min, même quantité |
| Tableau | 16 à 20 commandes, 2 urgentes | 22 à 28, 4 urgentes |
| Matières premières (blé, argile, bois) | à tous | seulement aux marchands de la région qui les produit (Doge et familles compris) |
| Produits d'outre-mer | commandes de ville, et commandes du Doge et des familles au comptoir | seulement les commandes du Doge et des familles, livrées par la route |
| Véhicules à l'arrivée | une charrette | une charrette et une mule |
| Grands chantiers | hebdomadaires | coupés (`projects.needsPerPlayer` vide) |

Chaque commande d'un produit transformé paie au moins 1,3 fois le coût de ses matières au prix de référence, même sur la route la plus courte (test `settings.test.ts`) : aucune commande ne fait vendre à perte. Essai écarté : une file de production de 24 h pour les occasionnels ne réduit pas leur écart (+574 % contre +582 % sur la graine 1).

Résultat sur 5 graines, toutes conformes aux cibles bloquantes :

| | Graine 1 | Graine 2 | Graine 3 | Graine 4 | Graine 5 |
| --- | --- | --- | --- | --- | --- |
| Commandes ouvertes que le stock couvre (à chaque session) | 58 % | 62 % | 62 % | 59 % | 63 % |
| Première livraison (médiane) | 2,5 h | 0,5 h | 0 h | 0,3 h | 0,5 h |
| Monnaie payée (ducats / joueur actif / jour) | 166 | 170 | 169 | 167 | 172 |
| Indice des prix | 93 – 100 | 93 – 100 | 93 – 100 | 93 – 100 | 93 – 100 |
| Gini à mi-saison | 0,46 | 0,47 | 0,43 | 0,40 | 0,39 |

Les bots livrent environ 4 commandes par jour : ils ne jouent que 2 à 4 sessions et repartent avec un véhicule par session. Un joueur qui revient souvent en livrera bien plus ; la monnaie créée suivra, dans la marge de +30 % acceptée. À surveiller pendant la bêta : la monnaie par joueur actif et l'indice des prix, et le Gini, monté de 0,25 à 0,45 (la limite est 0,6).
