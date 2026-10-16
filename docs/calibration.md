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

**Règle (audit d'octobre 2026, R7) : le paiement du Pass ne sera branché que lorsque `pnpm sim --pass 0.2` sera conforme sur toutes les graines.** Le contrôle d'avance des abonnés échoue aujourd'hui sur une partie d'entre elles (voir « Ballots de Faraj »).

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

## Ballots de Faraj

Un présent de Faraj d'Alexandrie toutes les six heures, deux au plus en attente, trois cartes de 1 à 5 unités (`bales`). Décisions du porteur : sel en Rare, deux ballots en attente, jusqu'à +15 % de matière gratuite accepté (sans compensation ailleurs).

| Rareté | Chance par carte | Marchandises | Quantités ×1 / ×2 / ×3 / ×4 / ×5 |
| --- | --- | --- | --- |
| Commun | 74 % | blé, argile, bois | 55 / 25 / 10 / 6 / 4 % |
| Peu commun | 19,5 % | farine, pain, briques, planches | 65 / 20 / 9 / 4 / 2 % |
| Rare | 5 % | sel, vin | 75 / 15 / 6 / 3 / 1 % |
| Épique | 1,25 % | épices, fourrures | 85 / 10 / 3 / 1,5 / 0,5 % |
| Légendaire | 0,25 % | soie, draps | 90 / 7 / 2 / 0,8 / 0,2 % |

La matière première de la région du marchand pèse moitié moins (`ownRegionWeightBps` 5 000) : le ballot apporte surtout ce qu'il faut acheter. Valeur moyenne d'un ballot au prix de référence : 7 à 8 ducats (test `settings.test.ts`). Le tirage vient du secret du monde, du joueur et du numéro du ballot : recharger ne change rien. Le Pass Négociant n'y change rien, et les ballots ne s'achètent pas.

**Mesure (`pnpm sim`, 5 graines, toutes conformes aux cibles bloquantes), avec ballots contre la même saison sans ballots :**

| | Graine 1 | Graine 2 | Graine 3 | Graine 4 | Graine 5 |
| --- | --- | --- | --- | --- | --- |
| Valeur des ballots (ducats / marchand actif / jour) | 19,6 | 20,0 | 19,5 | 19,6 | 19,6 |
| Part de la monnaie payée pour les marchandises | 11,5 % | 11,7 % | 11,7 % | 11,3 % | 11,5 % |
| Assidus / occasionnels (ducats par jour) | 20,4 / 13,4 | 20,8 / 14,2 | 20,4 / 14,2 | 20,4 / 13,2 | 20,5 / 14,0 |
| Légendaires tirées (sur ~11 000 cartes) | 25 | 36 | 30 | 26 | 36 |
| Indice des prix (avec / sans) | 93 – 100 / 93 – 100 | idem | idem | idem | idem |
| Plafond de monnaie par joueur actif (avec / sans) | 1,02 / 1,01 × | 1,03 / 1,02 × | 1,01 / 1,01 × | 1,02 / 1,00 × | 1,03 / 1,02 × |
| Gini à J+15 (avec / sans) | 0,41 / 0,46 | 0,42 / 0,47 | 0,44 / 0,43 | 0,46 / 0,40 | 0,41 / 0,39 |

Environ 11,5 % de matière en plus, sous les 15 % acceptés. Les prix ne bougent pas : les communes, nombreuses, sont aussi les moins chères, et les cartes rares sont trop peu nombreuses pour peser sur un carnet. Un assidu reçoit environ 1,5 fois ce que reçoit un occasionnel (deux ballots par jour au plus pour qui ne vient qu'une fois). Une carte légendaire sur 400 : à 3 ou 4 ballots par jour, environ une par saison pour un assidu. Les bots ouvrent leurs ballots au début de chaque session, comme un joueur.

**Contrôle du Pass (`pnpm sim --pass 0.2`) : non conforme, déjà sans les ballots.** Avance des abonnés avec ballots : −38,9 %, −9,7 %, −16,6 %, +6,0 %, +20,6 % (graines 4 et 5 au-dessus de +5 %) ; les mêmes graines 4 et 5 sans ballots donnent +6,9 % et +106,6 %. Les ballots sont identiques avec ou sans Pass (test `bales.test.ts`) : l'écart vient de la divergence des deux saisons rejouées, déjà constatée (voir « Familles patriciennes » et le rythme de jeu). Part des abonnés dans le top 10 et « gratuit assidu devant abonné occasionnel » conformes sur toutes les graines.

## Événements sur les commandes (audit d'octobre 2026, R1)

Depuis la fin de la vente aux villes, les événements de marché n'agissaient plus que sur la production : leurs effets de prix et de demande s'appliquaient à une vente fermée, alors que la gazette les annonçait. Ils agissent désormais sur le tableau de commandes du jour de l'événement (un événement dure exactement un jour du monde) :

| Réglage | Valeur |
| --- | --- |
| Prix | chaque commande touchée (ville et marchandise de l'événement ; Doge et familles compris) est payée au prix de l'événement (`cityPriceBps`), arrondi vers le bas |
| Demande (`deliveries.eventOrdersPerDay`) | 3 commandes de ville du jour vont là où l'événement augmente la demande (`cityCapacityBps` > 100 %), dans le total du jour |

**Mesure (`pnpm sim`, 5 graines, toutes conformes aux cibles bloquantes) :**

| | Graine 1 | Graine 2 | Graine 3 | Graine 4 | Graine 5 |
| --- | --- | --- | --- | --- | --- |
| Monnaie payée (ducats / joueur actif / jour) | 175,8 | 175,8 | 176,4 | 177,3 | 179,2 |
| Indice des prix | 93 – 100 | 93 – 100 | 93 – 100 | 93 – 100 | 93 – 100 |
| Monnaie par joueur actif (pic) | 1,02 × | 1,03 × | 1,01 × | 1,02 × | 1,03 × |
| Gini à J+15 | 0,40 | 0,40 | 0,47 | 0,44 | 0,39 |
| Assidus devant occasionnels | +64 % | +126 % | +92 % | +459 % | +141 % |

La monnaie payée monte d'environ 4 % (de 166 à 172 avant, à 176 à 179), toujours dans la cible de 151 à 185 : les événements favorables (disette, incendie, tempête, foire) l'emportent sur la récolte abondante (pain −10 %). L'écart entre assidus et occasionnels reste très bruité (deux à cinq occasionnels actifs en fin de saison par graine) ; la graine 4 s'écarte nettement, à surveiller pendant la bêta avec les vrais joueurs. Les prix du Rialto restent plats : les événements font bouger le prix des commandes, pas encore celui du marché (recommandation R14 de l'audit).

## Rétention du premier mois (audit d'octobre 2026, P1)

Recommandations R9 à R13 de `docs/audit-2026-10.md`. Les bots ne réclament pas les missions : la charrette gagnée (R10) et les missions de progression (R11) ne se mesurent qu'avec de vrais joueurs.

| Réglage | Avant | Après |
| --- | --- | --- |
| Produits frais (`fresh.minutes`) | 30 min | 2 h |
| Urgentes (`deliveries.urgentOpenMinutes`) | 1 h | 3 h |
| Riposte (`bandits.reactionMinutes`) | 10 min | 20 min |
| Mission `three_deliveries` (jour 1) | — | une charrette (`reward.vehicles`) |
| Matériaux du niveau 2 (`upgradeMaterialsBps`) | 100 % | 50 % |
| Missions `three_upgrades` (jour 4), `first_palace` (jour 8) | — | 100 et 150 ducats |
| Butin gardé par une bande (`keepBps`) | 50 % | 100 % |
| Attaques par bande (`maxAttacksPerBand`) | 2 | 3 |
| Mise d'une bande (`feePerHour`) | 0,35 ducat/h | 0,60 ducat/h |
| Prime du Doge (`bandits.bounty`) | — | 5 ducats × (1 + 20 % par prise du brigand), 30 au plus |

**Brigandage, nouvelles cibles** : rendement du brigand actif entre +30 et +150 % de sa mise (avant : 0 à +20 %), perte d'un livreur sous 3 %, primes sous 2 % de la monnaie payée, livreur prudent toujours devant le brigand à l'heure. Premier essai sans relever la mise (0,35 ducat/h) : brigand actif à +243 %, occasionnel à +76 % ; la mise passe à 0,60 ducat/h.

**Mesure (`pnpm sim`, 5 graines, toutes conformes aux cibles bloquantes) :**

| | Graine 1 | Graine 2 | Graine 3 | Graine 4 | Graine 5 |
| --- | --- | --- | --- | --- | --- |
| Monnaie payée (ducats / joueur actif / jour) | 173,4 | 175,0 | 175,6 | 179,3 | 183,4 |
| Rendement du brigand actif | +49 % | +83 % | +37 % | +48 % | +92 % |
| Rendement du brigand occasionnel | −55 % | −77 % | +55 % | +32 % | +8 % |
| Primes (part de la monnaie payée) | 0,2 % | 0,3 % | 0,3 % | 0,2 % | 0,5 % |
| Perte moyenne d'un livreur | 0,4 % | 0,4 % | 0,4 % | 0,4 % | 0,5 % |
| Livreur prudent / brigand (ducats par heure) | 6,5 / 0,3 | 6,4 / 0,5 | 6,5 / 0,2 | 6,6 / 0,3 | 6,4 / 0,5 |
| Niveaux d'ateliers par marchand | 6,7 | 6,5 | 6,4 | 6,7 | 7,0 |
| Niveau moyen des ateliers | 1,34 | 1,33 | 1,33 | 1,28 | 1,34 |
| Indice des prix | 93 – 100 | 93 – 100 | 93 – 100 | 93 – 100 | 93 – 100 |
| Gini à J+15 | 0,40 | 0,44 | 0,47 | 0,44 | 0,41 |

La monnaie payée reste dans la cible (151 à 185), un peu plus haut qu'avant (176 à 179) : les urgentes ouvertes trois heures sont davantage livrées. La graine 5 approche du plafond, à surveiller. Brigander devient rentable sans rattraper la livraison (0,2 à 0,5 ducat de l'heure de bande contre 6,4 à 6,6 pour un livreur), et la perte des livreurs reste minime. **Écart à la cible** : le brigand occasionnel (bande sur une route au hasard) n'est plus toujours perdant (+8 à +55 % sur trois graines, sur 11 à 22 bandes : très bruité). Ce contrôle n'est pas bloquant ; si la bêta le confirme, le levier est `feePerHour` ou un butin dégressif pour les bandes courtes. Le niveau des ateliers bouge peu chez les bots, qui n'investissent qu'avec prudence ; l'effet du niveau 2 moins cher et des missions se mesurera avec la bêta. L'écart brut entre assidus et occasionnels reste bruité (+74 % à +202 %).

## Un empire qui se voit, un mois qui se raconte (octobre 2026)

Maîtrises, saison en actes et demande commune (voir le cadrage). Le Domaine est purement visuel et n'a pas d'effet sur l'économie.

### Maîtrises

Le diagnostic « avance d'une maîtrise à profil égal » du rapport compare des groupes de deux à dix bots, qui ne se sont pas choisis au hasard : il est trop bruité pour trancher (de 1 % à 350 % d'une graine à l'autre). La mesure retenue est une comparaison par jumeaux :
- même graine, avec et sans maîtrises (`--scenario scenarios/no-masteries.json`) ;
- patrimoine final de chaque bot dans les deux mondes.

| Maîtrise | Premier réglage | Retenu | Écart au jumeau sans maîtrise (retenu) |
| --- | --- | --- | --- |
| Maître d'atelier | +15 % sur ce qui se transforme | +10 % | +4 % |
| Roulier | véhicules +25 %, un de plus | inchangé | +3,8 % |
| Armateur | droits de port −50 %, cales +25 % | inchangé | +0,4 % |
| Négociant | quotas +50 %, taxe −1 point, 2 offres de plus | quotas +25 %, taxe −2 points, 3 offres de plus | −23 % |
| Aucune (témoin) | — | — | +1,8 % (bruit) |

Au premier réglage, le Maître d'atelier prenait +9 % (+21 % chez les artisans). **Écart à surveiller** : le Négociant perd chez les bots. Ses bots spéculateurs traitent davantage à la Dogana et y perdent : c'est une faiblesse du comportement des bots plus que de la maîtrise, et ce n'est pas corrigé. À mesurer avec les vrais joueurs pendant la bêta. L'effet des cales de l'Armateur n'a pas de test du moteur dédié.

### Saison en actes

Le modificateur d'acte se multiplie avec l'événement du jour sur les commandes. La crise varie selon le monde : Chioggia (briques et planches de Venise +30 %), peste (pain +30 %, farine +20 %) ou embargo (outre-mer +50 à +60 %). L'Arsenal demande 30 briques et 30 planches par joueur actif, payées +15 %. La Sensa paie +15 % et demande ×1,5.

Mesure avec les actes seuls (avant la demande commune) : la monnaie payée passe de 172–179 à 186–190 ducats, au-dessus de la cible (151 à 185). La Sensa monte à 200–218 ducats et la crise reste vers 170–177 ducats. La demande commune ci-dessous ramène le total dans la cible.

### Demande commune

Les commandes de ville forment un tableau du monde de 10 commandes et 2 urgentes par marchand actif. Le premier qui envoie un véhicule prend la commande.

| Réglage | Avant | Après |
| --- | --- | --- |
| `deliveries.sharedOrdersPerActivePlayer` | 0 (tableaux personnels) | 10 |
| `deliveries.urgentPerDay` (par marchand actif) | 4 | 2 |
| `deliveries.cityPriceBps` | 12 500 | 11 000 |

Les réglages ont été trouvés en trois essais :
1. Un premier essai à 12 500, avec les actes, donne 192,5 ducats sur la graine 1.
2. À 11 500, on mesure 183,4 à 183,6 ducats sur les graines 1 et 2, trop près du plafond.
3. 11 000 est retenu.

**Mesure (`pnpm sim`, 5 graines, toutes conformes aux cibles bloquantes) :**

| | Graine 1 | Graine 2 | Graine 3 | Graine 4 | Graine 5 |
| --- | --- | --- | --- | --- | --- |
| Monnaie payée (ducats / joueur actif / jour) | 181,0 | 178,3 | 175,9 | 177,8 | 181,5 |
| Par acte : installation · crise · Arsenal · Sensa | 178 · 178 · 189 · 197 | 174 · 171 · 190 · 195 | 178 · 167 · 186 · 193 | 180 · 167 · 194 · 192 | 182 · 172 · 194 · 198 |
| Livraisons par marchand et par jour | 4,2 | 4,2 | 4,1 | 4,2 | 4,3 |
| Utilisation des véhicules (assidus) | 39 % | 38 % | 36 % | 38 % | 39 % |
| Niveaux d'ateliers par marchand | 6,5 | 6,6 | 6,5 | 6,7 | 6,8 |
| Indice des prix | 93 – 100 | 93 – 100 | 93 – 100 | 93 – 100 | 93 – 100 |
| Gini à J+15 | 0,50 | 0,47 | 0,49 | 0,44 | 0,43 |

La courbe par acte donne au mois l'arc voulu : un creux pendant la crise, qui ne touche que quelques marchandises, puis une montée à l'Arsenal et à la Sensa.

Le Gini monte un peu (0,43 à 0,50 contre 0,39 à 0,47). Le premier servi prend les meilleures commandes, et c'est l'effet recherché : les autres pèsent sur soi. L'écart brut entre assidus et occasionnels reste très bruité (+18 % à +204 %).

Le tableau commun ralentit le simulateur d'environ 5 % par graine, après la mise en cache du tableau et des événements ; sans cette mise en cache, il était quatre fois plus lent.

### Tableau commun : mesures (sans changement de réglage)

Nouveau diagnostic du rapport, « Tableau commun : commandes prises ». Il donne trois mesures :
- la part des commandes du tableau prises avant la fin de leur jour ;
- la part de ces prises faites dans l'heure qui suit l'ouverture ;
- à chaque session, les commandes que le stock du bot couvrait mais qu'un autre marchand avait déjà prises.

Les commandes prises par d'autres ne comptent plus dans « commandes livrables depuis le stock ». Cette part passe d'environ 54 % à 50–53 %.

| | Graine 1 | Graine 2 | Graine 3 | Graine 4 | Graine 5 |
| --- | --- | --- | --- | --- | --- |
| Monnaie payée (ducats / joueur actif / jour) | 181,0 | 178,3 | 175,9 | 177,8 | 181,5 |
| Commandes du tableau prises | 31,8 % | 31,7 % | 30,6 % | 31,4 % | 32,0 % |
| Prises dans l'heure de l'ouverture | 10,2 % | 10,5 % | 10,0 % | 10,2 % | 10,2 % |
| Commandes couvertes par le stock mais prises par un autre, par session | 45,1 | 42,5 | 41,9 | 45,5 | 44,4 |

**Lecture.** Le tableau est large : deux commandes sur trois expirent sans preneur. Les bots sont limités par leurs véhicules, pas par les commandes. La course existe : une quarantaine de commandes que le stock couvrait sont déjà prises à chaque session. Mais il reste presque toujours une autre commande à prendre, et la monnaie payée ne bouge pas.

**Piste pour la bêta.** Pour une course plus serrée, baisser `deliveries.sharedOrdersPerActivePlayer` (10 aujourd'hui) vers 6 ou 7 et vérifier que la monnaie payée reste dans 151 à 185.

## Guildes, guerres de concessions, Rialto nécessaire (octobre 2026)

Réglages de Venise : `guilds` (fondation 50 d, mise 100 d, 12 membres, sortie −20 %, voix plafonnée à 40 %, votes 24 h), `concessions` (12), `wars` (48 h, trésor de guerre 150 d, défenseur +20 %, Seigneurie 1 unité par marchand actif, protection 72 h, membres +10 %, un quart de commande par marchand actif et par jour), `bandits.warOnly`, `deliveries.marketIndex` (50 %, entre 80 et 150 %), Dogana à 10 achats et 5 ventes par jour et par bien. Bots : les fondateurs proposent dividendes, péage, prime et guerres sur les biens de leur chaîne ; les membres votent pour ; les bots servent d'abord les commandes de leur guerre (en achetant ce qui manque au Rialto) ; sans guilde, ils fournissent l'attaquant.

`pnpm sim`, 5 graines, toutes conformes :

| | Graine 1 | Graine 2 | Graine 3 | Graine 4 | Graine 5 |
| --- | --- | --- | --- | --- | --- |
| Guerres déclarées / gagnées par l'attaquant | 32 / 22 | 34 / 23 | 30 / 19 | 35 / 22 | 37 / 25 |
| Concessions tenues par une guilde en fin de saison | 12 | 12 | 12 | 12 | 12 |
| Péages (ducats) | 2 596 | 2 825 | 2 582 | 2 511 | 2 822 |
| Monnaie payée (ducats / joueur actif / jour) | 153,3 | 154,5 | 157,0 | 156,3 | 156,4 |
| Part du volume échangé entre joueurs | 90,1 % | 85,5 % | 84,4 % | 90,3 % | 88,1 % |
| Gini à J+15 | 0,47 | 0,48 | 0,49 | 0,49 | 0,42 |
| Masse monétaire par joueur actif en fin de saison | 372 | 480 | 402 | 372 | 418 |
| Assidus devant occasionnels (diagnostic) | +72 % | +165 % | +387 % | −37 % | +359 % |

**Lecture.**
- Une première version (Seigneurie à 3 unités par marchand actif, bots indifférents aux commandes de guerre) donnait 19 guerres et aucune victoire d'attaquant : le seuil a été ramené à 1, et les bots en guerre servent d'abord ses commandes.
- La monnaie payée baisse d'environ 20 ducats par jour (178 → 155) : le prix des villes suit désormais un Rialto où les bots vendent sous la référence. Elle reste dans la cible (151 à 185).
- La masse monétaire de fin de saison baisse (≈ 770 → ≈ 400 ducats par joueur actif) : une partie dort dans les trésors de guilde jusqu'au partage final, et les trésors de guerre sont un nouveau puits.
- Le brigandage de guerre reste rare et perdant pour les bots (−76 à −100 %) : peu de routes, peu de convois de l'autre camp. À surveiller avec de vrais joueurs ; pistes : une prise plus forte en guerre, ou des bandes plus longues.
- L'écart entre assidus et occasionnels reste très bruité ; la graine 4 le met à −37 % (peu d'occasionnels en fin de saison, médiane instable).

**Contrôle du Pass (`pnpm sim --pass 0.2`) : toujours non conforme, comme avant.**
- Avance des abonnés : −7,7 %, +34,2 %, +54,4 %, +4,4 %, +63,7 % (plafond +5 %). Trois graines sur cinq la dépassent.
- Part des abonnés dans le top 10 : de 10 à 30 %, conforme. Un gratuit assidu devant un abonné occasionnel : conforme partout où il y a un abonné occasionnel.

Le Pass n'a aucun avantage de guilde ni de guerre, et la Dogana où joue son quota pèse moins. L'écart vient surtout de la divergence des deux saisons rejouées, plus forte avec les guerres : la guilde qui prend une concession bascule d'une partie à l'autre, et le péage suit.

Le paiement du Pass reste débranché (règle R7). Avant de le brancher, il faudra mesurer ce contrôle sur plus de graines ou par la moyenne.

## Les quatre familles et la Campagne de Terraferme (13 octobre 2026)

Réglages de Venise : `families` (allégeance au jour 2, levée de −25 % à +50 % selon la taille de la famille), `campaign` (carte de 25 terres, levée 2 lances par heure de 8 h à 22 h et 24 en attente au plus, engagement 20 lances à 1 d puis 20 à 2 d par jour, lances parties après 48 h, marches de 20 min + 10 min par terre, Milan toutes les 4 heures ouvertes avec 10 lances + 2 par marchand actif, doublées à 100 % d'avance), `decrees` (deux décrets par victoire, voix plafonnée à 25 %), `bandits.decreeOnly`, acte III « guerre de Lombardie » (Milan ×1,5). Bots : ils rejoignent la famille qui compte le moins de joueurs réels, ramassent leur levée, engagent une part du plafond selon leur profil (producteurs et artisans 25 %, bâtisseurs 50 %, spéculateurs 75 %, occasionnels rien) en gardant un tiers du capital de départ, défendent, attaquent la terre voisine qui rapporte le plus pour son coût, rejoignent les assauts et votent un programme.

`pnpm sim`, 5 graines, toutes conformes :

| | Graine 1 | Graine 2 | Graine 3 | Graine 4 | Graine 5 |
| --- | --- | --- | --- | --- | --- |
| Monnaie payée (ducats / joueur actif / jour) | 158,2 | 159,2 | 159,1 | 159,8 | 161,9 |
| Indice des prix | 93 à 100 | 93 à 100 | 93 à 100 | 93 à 100 | 93 à 100 |
| Masse monétaire par joueur actif (maximum) | 1,01 × | 1,04 × | 1,01 × | 1,04 × | 1,01 × |
| Membres par famille en fin de saison | 14 à 15 | 14 | 14 à 15 | 14 à 15 | 14 à 15 |
| Lances engagées (ducats détruits par marchand actif et par jour) | 5 | 5 | 6 | 4 | 4 |
| Terres prises / assauts repoussés | 349 / 337 | 287 / 260 | 258 / 294 | 268 / 270 | 353 / 377 |
| Chevauchées de Milan par jour | 3,4 | 3,4 | 3,6 | 3,5 | 3,4 |
| Vainqueurs des semaines 1 à 3 | Mocenigo, Mocenigo, Dandolo | Morosini, Mocenigo, Mocenigo | Morosini, Dandolo, Dandolo | Contarini, Morosini, Dandolo | Morosini, Mocenigo, Contarini |

**Lecture.**
- Les guerres de concessions disparaissent sans toucher l'économie : la monnaie payée reste dans la cible (151 à 185), l'indice des prix ne bouge pas.
- Les lances sont un petit puits (4 à 6 ducats par marchand actif et par jour) : la levée gratuite fait l'essentiel des armées des bots. Une première version, où les bots gardaient une fois et demie le capital de départ avant d'engager, n'engageait presque rien (340 lances sur la saison).
- Le pouvoir change de mains : aucune famille ne gagne les trois semaines dans aucune graine, et Milan frappe le favori environ 3,5 fois par jour.
- Les bots votent surtout la franchise et la faveur de Venise ; gabelle, péage et lettres de course apparaissent selon les graines.
- Le simulateur va plus vite qu'avec les guerres (136 s contre 170 s pour une graine).

## Chargements de plusieurs commandes et Terraferme géographique (13 octobre 2026)

Un véhicule emporte jusqu'à quatre commandes pour une même ville (`deliveries.maxOrdersPerLoad`). Premier essai avec les réglages d'avant : la monnaie payée monte à 255 ducats par joueur actif et par jour (cible 151 à 185), les bots prenant bien plus du tableau. Essais sur une graine : 6 commandes de ville par marchand actif → 222 ; 5 → 208 ; 5 avec les villes à la référence et +40 % par heure → 184 ; 5 avec +30 % par heure → 175 à 178. Les villes à la référence cassaient la règle « un objet fabriqué rapporte, sur la route la plus courte, plus de 1,3 fois ses matières » (`settings.test.ts`) : retour à +10 %, et quatre commandes de ville par marchand actif.

Réglages retenus : `maxOrdersPerLoad` 4, `sharedOrdersPerActivePlayer` 4, `cityPriceBps` 11 000, `distanceBonusBpsPerHour` 3 000. La carte de la Campagne devient géographique (fiefs à Feltre, Udine, Piove di Sacco et Rovigo, Milan à l'ouest).

`pnpm sim`, 5 graines, toutes conformes :

| | Graine 1 | Graine 2 | Graine 3 | Graine 4 | Graine 5 |
| --- | --- | --- | --- | --- | --- |
| Monnaie payée (ducats / joueur actif / jour) | 167,9 | 168,4 | 168,0 | 168,3 | 165,9 |
| Indice des prix | 93 à 100 | 93 à 100 | 93 à 100 | 93 à 100 | 93 à 100 |
| Masse monétaire par joueur actif (maximum) | 1,03 × | 1,02 × | 1,03 × | 1,02 × | 1,03 × |
| Commandes du tableau prises | 90,2 % | 90,1 % | 89,4 % | 89,6 % | 88,0 % |
| Vainqueurs des semaines 1 à 3 | Mocenigo, Contarini, Dandolo | Dandolo, Contarini, Contarini | Mocenigo, Morosini, Dandolo | Morosini, Morosini, Contarini | Mocenigo, Mocenigo, Mocenigo |

**Lecture.**
- Le tableau se vide presque (neuf commandes sur dix prises) : la course entre marchands devient réelle, comme le proposait la piste de la bêta.
- La carte géographique n'est pas symétrique : Rovigo touche Legnago, un carrefour vers quatre villes. Dans la graine 5, les Mocenigo gagnent les trois semaines (diagnostic non bloquant). À surveiller avec de vrais joueurs ; pistes : retirer la route Rovigo–Legnago, ou un fief plus exposé à Milan.

## Les ouvrages de la Campagne (14 octobre 2026)

Une famille peut consolider une terre tenue par un ouvrage, bâti par un membre pour des ducats détruits (`campaign.works`) : la rocca (garnison +60 % en défense, 40 d), le campo (les marches partent de là plutôt que du fief, 30 d), la dogana (Gloire de la terre +50 %, 50 d). Deux heures ouvertes de chantier ; deux ouvrages par famille, un de plus par cinq membres actifs ; une terre prise rase son ouvrage (+10 de Mérite à chaque assaillant) ; la carte qui rouvre les efface. Les maisons PNJ guerrières bâtissent : rocca sur une terre qui touche un ennemi, campo loin du fief, dogana sur la terre la plus riche, si elles gardent la moitié du capital de départ.

`pnpm sim`, 5 graines, toutes conformes :

| | Graine 1 | Graine 2 | Graine 3 | Graine 4 | Graine 5 |
| --- | --- | --- | --- | --- | --- |
| Monnaie payée (ducats / joueur actif / jour) | 165,4 | 169,2 | 168,5 | 169,9 | 166,4 |
| Masse monétaire par joueur actif (maximum) | 1,03 × | 1,02 × | 1,03 × | 1,02 × | 1,03 × |
| Ouvrages bâtis · rasés | 116 · 97 | 108 · 76 | 149 · 122 | 125 · 95 | 109 · 84 |
| Ducats détruits par les ouvrages (par marchand actif et par jour) | 3 | 3 | 4 | 4 | 3 |
| Vainqueurs des semaines 1 à 3 | Mocenigo, Dandolo, Morosini | Contarini, Contarini, Morosini | Contarini, Morosini, Contarini | Dandolo, Morosini, Contarini | Dandolo, Morosini, Mocenigo |

**Lecture.**
- Un petit puits de plus (3 à 4 ducats par marchand actif et par jour, à côté de 5 pour les lances) : la masse monétaire et la monnaie payée ne bougent pas.
- Trois ouvrages sur quatre finissent rasés : ils consolident sans figer la carte, et deviennent des cibles.
- Plus aucune famille ne gagne les trois semaines : la domination des Mocenigo de la graine 5 a disparu (une rocca adverse sur Legnago suffit à fermer le carrefour).

## Véhicules à améliorer, classement par ventes nettes, 40 maisons PNJ (16 octobre 2026)

Trois changements demandés pendant la bêta :

- **Véhicules** : tout achat donne une mule (25 unités au lieu de 15, pour qu'une mule porte n'importe quelle commande seule) ; deux mules à l'arrivée au lieu d'une charrette et d'une mule. Trois améliorations en ducats détruits, au comptoir : charrette (+80 d), chariot (+160 d), grand chariot (+320 d ; 150 unités, vitesse 1,6). Les maisons PNJ améliorent leur plus petit véhicule libre quand elles ont trois fois le prix.
- **Classement** : ventes nettes de la saison (ventes, taxes et péages déduits, moins les achats) au lieu du patrimoine. Seuils des titres recalés sur les ventes mesurées (Boutiquier 500 → Doge 20 000 ducats) ; niveau permanent à 300 × n points par niveau.
- **PNJ** : population de 40 au lieu de 15.

`pnpm sim`, 5 graines, **toutes conformes** :

| | Graine 1 | Graine 2 | Graine 3 | Graine 4 | Graine 5 |
| --- | --- | --- | --- | --- | --- |
| Monnaie payée (ducats / joueur actif / jour) | 176,5 | 179,6 | 174,9 | 179,2 | 179,1 |
| Masse monétaire par joueur actif (maximum) | 0,96 × | 0,95 × | 0,97 × | 0,93 × | 0,95 × |
| Croissance de la monnaie (moyenne / jour) | 1,9 % | 4,5 % | 2,6 % | 5,7 % | 5,2 % |
| Ducats détruits par les améliorations de véhicules | 22 480 | 20 560 | 18 080 | 21 840 | 20 240 |
| Ventes nettes de la saison : médiane · 90e centile · meilleur | 5 185 · 10 327 · 31 685 | 4 503 · 14 213 · 38 913 | 5 413 · 13 907 · 35 094 | 5 639 · 13 082 · 32 196 | 4 467 · 8 845 · 36 397 |

`pnpm sim --players 40 --live` (le petit monde de la bêta, 40 maisons) : 5 graines conformes, indice des prix 93 à 100, ventes nettes médianes 4 200 à 5 300 ducats.

**Lecture.**
- Les améliorations sont un nouveau puits (environ 7 % des destructions) : la masse monétaire par joueur actif baisse un peu (≤ 0,97 × le capital, contre 1,03 ×) et la monnaie payée pour les marchandises monte légèrement (176 à 180 contre 165 à 170 ducats) parce que des véhicules plus gros livrent plus loin.
- Le classement récompense l'activité : les assidus finissent 180 à 430 % devant les occasionnels en ventes nettes (diagnostic ; pas d'occasionnel actif en fin de saison sur la graine 2).

**Pass Négociant (`pnpm sim --pass 0.2`) : non conforme, comme avant ce changement.** Le code d'origine (commit 211b933) échoue déjà sur les graines 1 et 3 (avance des abonnés en patrimoine de 22,3 % et 6,5 %). Après le changement, les mêmes graines échouent (patrimoine 26,0 % et 28,5 % ; ventes nettes 29,8 % et 47,4 % ; graine 1 : 40 % du top 10 en patrimoine) ; les graines 2, 4 et 5 sont conformes, avec des avances négatives. La mesure par saison rejouée diverge fortement d'une graine à l'autre (de −70 % à +47 %) : elle mesure surtout le bruit de deux parties qui divergent. Conformément à CLAUDE.md, **le paiement du Pass reste débranché** ; le simulateur vérifie désormais les trois garde-fous sur les deux mesures (patrimoine, la règle, et ventes nettes, le classement).

## Commandes des villes par vagues (16 octobre 2026)

Le tableau commun n'arrive plus en une fois à minuit : une vague de commandes de ville toutes les 4 heures, chacune ouverte 8 heures (coupée à minuit), pour le même nombre de commandes par jour (`deliveries.waves`).

`pnpm sim`, 5 graines, **toutes conformes** ; `pnpm sim --players 40 --live`, 5 graines conformes.

| | Graine 1 | Graine 2 | Graine 3 | Graine 4 | Graine 5 |
| --- | --- | --- | --- | --- | --- |
| Commandes du tableau prises | 88,0 % | 89,1 % | 87,6 % | 89,5 % | 89,5 % |
| Prises dans l'heure de l'ouverture | 31,9 % | 34,5 % | 33,7 % | 33,0 % | 34,7 % |
| Commandes perdues au profit d'un autre, par session | 26,1 | 27,7 | 27,1 | 26,4 | 30,0 |
| Monnaie payée (ducats / joueur actif / jour) | 168,2 | 168,8 | 165,9 | 169,8 | 169,9 |
| Masse monétaire par joueur actif (maximum) | 0,91 × | 0,98 × | 0,88 × | 0,87 × | 0,90 × |

**Lecture.** Autant de commandes prises qu'avant (environ neuf sur dix), mais deux fois plus vite après leur ouverture (un tiers dans l'heure, contre 15 %) et deux fois moins de commandes perdues au profit d'un autre à chaque session (26 à 30 contre environ 60) : chaque visite trouve des commandes fraîches au lieu d'un tableau vidé le matin. La monnaie payée baisse un peu (166 à 170 contre 175 à 180 ducats) : les commandes de la dernière vague, coupées à minuit, ont moins de temps.
