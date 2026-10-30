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

## Sans la mer ni les brigands : les galères de la Muda (16 octobre 2026)

La mer (ports, flotte, corsaires) et le brigandage (bandes, escortes) sont retirés ; les marchandises d'outre-mer arrivent par les galères de la Muda : tous les 3 jours à 9 h, la Dogana vend au Rialto un lot par marchand actif (1 épice, 1 soie, 1 fourrure, 1 drap, 4 sels, 2 vins), au prix de référence lot plein et jusqu'à +60 % lot épuisé, avec un quota par marchand et par arrivée (`muda`). Une commande de ville sur treize demande une marchandise d'outre-mer (`deliveries.weights` 10 pour les biens du Veneto, 1 pour ceux d'outre-mer). L'Armateur devient le Marchand du Levant (quota doublé à la Muda), le Tarif du Levant la Charte du Levant (quota +50 % pour les membres, −25 % pour les autres).

`pnpm sim`, 5 graines, **toutes conformes** ; `pnpm sim --players 40 --live`, 5 graines conformes.

| | Graine 1 | Graine 2 | Graine 3 | Graine 4 | Graine 5 |
| --- | --- | --- | --- | --- | --- |
| Lots de la Muda vendus | 91,3 % | 89,4 % | 92,6 % | 92,1 % | 90,1 % |
| Marchands qui achètent à la Muda | 59 / 60 | 55 / 60 | 60 / 60 | 59 / 60 | 58 / 60 |
| Ducats détruits par la Muda | 30 191 | 32 097 | 30 840 | 30 259 | 30 424 |
| Commandes d'exotiques prises | 91,3 % | 91,1 % | 88,5 % | 89,2 % | 90,8 % |
| Part des exotiques dans l'argent des livraisons | 21,3 % | 21,3 % | 20,8 % | 21,1 % | 21,2 % |
| Monnaie payée (ducats / joueur actif / jour) | 178,7 | 183,7 | 182,8 | 181,1 | 179,0 |
| Indice des prix du panier | 88 à 122 | 90 à 125 | 89 à 123 | 88 à 125 | 86 à 122 |
| Ventes nettes médianes de la saison | 1 967 | 3 161 | 3 908 | 3 601 | 2 803 |
| Avance d'une maîtrise à profil égal | 11,0 % | 127,2 % | 26,4 % | 188,2 % | 16,9 % |

Petit monde (`--players 40 --live`) : 89 à 95 % des lots vendus, 38 à 40 acheteurs sur 40, 20 à 22 % de l'argent des livraisons pour les exotiques, indice des prix 90 à 128, ventes nettes médianes 3 700 à 4 600 ducats.

**Lecture.**
- Les galères trouvent preneur : neuf lots sur dix partent avant les suivantes, presque tous les marchands y achètent, et les commandes d'exotiques sont prises comme les autres. Une commande sur treize, mais un cinquième de l'argent des livraisons : ce sont les commandes chères du tableau.
- La Muda est un nouveau puits (environ 30 000 ducats par saison sur 60 marchands) ; la monnaie payée pour les marchandises monte un peu (179 à 184 contre 166 à 170 ducats), parce que les exotiques se livrent avec une marge.
- L'indice des prix bouge davantage (86 à 128 contre 93 à 100) : les exotiques, qui renchérissent à mesure que le lot s'épuise, entrent dans le panier. C'est un effet de la Muda, pas encore le marché vivant de la recommandation 2 de l'audit.
- Les ventes nettes médianes baissent (2 000 à 3 900 contre 4 500 à 5 600) : les achats à la Muda se déduisent des ventes, seule la marge compte. Les paliers des titres (500 à 20 000 ducats) sont à revoir avec la progression des ateliers.
- Le Marchand du Levant reste devant le Maître d'atelier sur deux graines sur cinq, souvent sur 2 ou 3 maisons seulement : même défaut que l'Armateur, à rééquilibrer avec les maîtrises (recommandation 5 de l'audit).

## Des prix qui bougent (16 octobre 2026)

Trois règles du moteur : le cours de la Dogana suit l'offre et la demande (6 % par jour au plus, retour d'un quart vers la référence chaque jour, entre 60 et 150 %, `marketMaker.drift`) ; les commandes des villes suivent le Rialto à 70 % entre 60 et 150 % (`deliveries.marketIndex`) ; la demande des villes est élastique (`deliveries.elasticityBps` 20 000, le tableau jusqu'à deux fois sa taille). Deux corrections des bots, qui faussaient la mesure : un bot qui avait tout vendu reposait son offre 3 % plus bas, jamais plus haut (le cliquet ne descendait que) ; il produisait même quand sa marchandise s'entassait sous 90 % de la référence. Le rapport donne désormais les cours du Veneto au Rialto et l'étendue du cours de la Dogana.

`pnpm sim`, 5 graines, **toutes conformes** ; `pnpm sim --players 40 --live`, 5 graines conformes.

| | Graine 1 | Graine 2 | Graine 3 | Graine 4 | Graine 5 |
| --- | --- | --- | --- | --- | --- |
| Cours du Veneto au Rialto (% de la référence), plus bas et plus haut | 50 à 111 | 50 à 108 | 50 à 115 | 50 à 115 | 50 à 109 |
| Cours de la Dogana | 76 à 111 | 76 à 110 | 76 à 110 | 76 à 111 | 76 à 108 |
| Monnaie payée (ducats / joueur actif / jour) | 194,3 | 201,3 | 192,8 | 190,4 | 195,5 |
| Ventes nettes médianes de la saison | 4 123 | 4 907 | 5 045 | 4 966 | 5 000 |

Petit monde (`--players 40 --live`, les maisons PNJ laissent leurs surplus aux joueurs au lieu de les vendre à la Dogana) : cours du Veneto entre 90 et 116 % de la référence, Dogana entre 100 et 114 %, sur les 5 graines.

**Lecture.**
- Dans le petit monde de la bêta, les prix bougent dans les deux sens et restent dans la cible de l'audit (80 à 130).
- Dans le monde de 60 marchands tous bots, les cours du Veneto glissent de la référence à environ 50 % au fil du mois, comme avant ces changements (la glissade existait déjà ; l'indice du panier, dominé par les marchandises d'outre-mer, la cachait). La cause est une surproduction : sur la graine 1, les bots ont produit 654 000 blés pour 268 000 consommés (transformation, livraisons, rations), et dans les mêmes proportions pour les autres biens. Aucune demande ne rattrape un tel écart ; la Dogana, elle, ne descend pas sous 76 %.
- C'est un point de conception à trancher avec la bêta : la capacité de production d'un marchand assidu dépasse de loin ce que le monde achète. Des vrais marchands cesseraient de produire à perte plus tôt que les bots.

## Des ateliers qui grandissent (16 octobre 2026)

Constat : un niveau coûtait exactement autant par unité produite qu'un nouvel atelier (coût +50 % par niveau, rendement +25 % par niveau au-dessus du premier), et les bots choisissaient toujours l'étape la moins chère : ils bâtissaient. Chaque niveau coûte désormais 35 % du premier de plus (`levelCostGrowthBps` 3 500) et les bots comparent le coût d'une unité de production ajoutée (`costPerOutput`), à égalité au profit du niveau.

`pnpm sim`, 5 graines, **toutes conformes** ; `pnpm sim --players 40 --live`, 5 graines conformes.

| | Graine 1 | Graine 2 | Graine 3 | Graine 4 | Graine 5 |
| --- | --- | --- | --- | --- | --- |
| Niveau moyen des ateliers en fin de saison | 2,22 | 2,12 | 2,17 | 2,13 | 2,10 |
| Ateliers au niveau maximal | 13 % | 12 % | 13 % | 7 % | 11 % |
| Niveau moyen, petit monde (`--players 40 --live`) | 2,37 | 2,34 | 2,28 | 2,31 | 2,33 |
| Ventes nettes médianes de la saison | 5 912 | 5 137 | 5 061 | 5 300 | 5 675 |
| Masse monétaire par joueur actif (maximum) | 0,88 × | 0,87 × | 0,87 × | 0,87 × | 0,86 × |

**Lecture.** L'objectif de l'audit (niveau moyen ≥ 2 en fin de mois) est atteint sur toutes les graines, contre 1,3 avant ; un atelier sur dix atteint le niveau 5. Les ventes nettes médianes montent (5 100 à 5 900 contre 4 100 à 5 000) sans gonfler la masse monétaire.

**Maîtrises.** Maître d'atelier +15 % sur ce qui se transforme (contre +10 %), Marchand du Levant +50 % de quota à la Muda (contre +100 %). Avance d'une maîtrise sur une autre à profil égal : 44,5 %, 5,0 %, 109,0 %, 122,2 % et 64,5 % selon la graine (60 marchands) ; 0 à 62 % dans le petit monde. Elle n'est pas conforme sur la plupart des graines, mais la mesure ne suit pas la force de la maîtrise : avec le Levant à +25 %, l'écart passe de 109 % à 201 % sur la graine 3 et de 122 % à 22 % sur la graine 4. Le Levant y est porté par 2 ou 3 maisons seulement, tirées par le hasard du nom (une maison sur quatre) : l'écart dit surtout quelles maisons l'ont choisi. Pour trancher, il faudrait rejouer les mêmes maisons avec chaque maîtrise ; en attendant, l'Armateur (22 à 218 % devant) est remplacé par une maîtrise plus modeste, et les réglages restent ceux-ci.

## La Maison entre les saisons : Influence et second comptoir (17 octobre 2026)

Plan : `docs/plan-progression.md`. Réglages d'essai, depuis versés dans ceux de Venise (section `house`). Mesure : `pnpm sim --patents 0.3` ; 30 % des maisons PNJ (une sur trois de chaque profil) tiennent la patente du second comptoir, choisissent la région aux routes les plus courtes et en partent quand sa route est plus courte ; la même saison est rejouée sans patente et chaque maison est comparée à elle-même.

**Règle du second comptoir corrigée.** Premier essai : une livraison partie du second comptoir payée selon sa propre route (même prix par heure de route). Les maisons qui l'avaient finissaient 21 % **derrière** (graine 1) : les véhicules ne sont occupés qu'à 25 %, une route plus courte ne fait rien gagner et paie moins. Pire, un joueur averti serait parti du comptoir le plus éloigné pour être payé plus par unité. Règle retenue : **le prix de la commande ne change pas, seul le trajet change**. Un comptoir fait gagner du temps, jamais plus d'argent par commande.

**Mesure bruitée.** Une saison rejouée diverge de l'originale dès la première décision différente : l'avance mesurée va de −17 % à +42 % selon la graine (graine 4), sans lien avec la force de la patente. Chaque graine rapporte donc son écart, et la règle se juge sur la **médiane des graines**.

| Graine | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Avance des maisons au second comptoir (ventes nettes) | −17,0 % | −1,3 % | +2,7 % | +42,1 % | +7,0 % | +1,6 % | +12,5 % | −5,7 % | +7,4 % | −5,3 % |
| Marchands sans patente | +2,3 % | +1,4 % | +9,6 % | −14,5 % | −0,4 % | +0,5 % | −5,6 % | −1,4 % | −2,9 % | −0,7 % |
| Influence de la saison, médiane | 63,5 | 59 | 55 | 61 | 64 | 65,5 | 64 | 59 | 50 | 62,5 |
| Influence, 9e décile | 95 | 90 | 91 | 85 | 87 | 89 | 96 | 97 | 87 | 93 |
| Part de la Campagne | 43,9 % | 44,8 % | 43,9 % | 44,7 % | 47,5 % | 43,5 % | 43,0 % | 42,1 % | 49,7 % | 44,9 % |

Sur 10 graines : avance médiane **+2,2 %** (cible ≤ 15 %), marchands sans patente **−0,6 %** (cible ≥ −5 %) ; les 10 graines conformes à toutes les autres cibles, KPIs des nouveaux inchangés (commandes couvertes 53 à 57 %, première livraison médiane 0 à 3,3 h).

**Barème.** Premier essai de la Campagne (1 point par 10 de Mérite, +5 à la famille gagnante, 15 par semaine) : elle faisait 58 % de l'Influence, au-dessus des 40 % voulus par le porteur. Retenu : 1 point par 20 de Mérite, +3, plafond 10 ; commerce inchangé (1 point par 100 ducats de ventes nettes, plafond 25). Tous les bots du monde simulé jouent la Campagne : un marchand qui ne fait que commercer gagne environ 35 par saison.

**Lecture.**
- Le second comptoir, tel quel, ne donne presque rien (+2 %) : les véhicules attendent les commandes, pas l'inverse. Il reste une patente de confort (des livraisons plus rapides, des véhicules revenus plus tôt) ; il ne justifie pas seul 40 d'Influence. Les patentes qui ouvrent du neuf (Levant, Lombardie) porteront l'envie de progresser ; elles demandent leur contenu.
- Rythme : avec ≈ 60 d'Influence par saison au médian (la prime de fin de saison, servie par le serveur, n'est pas simulée), le catalogue du plan (≈ 640) demanderait une dizaine de saisons, au lieu des six à sept prévues. À revoir avec le contenu des autres routes : baisser les prix d'environ un tiers ou garder une progression longue.

### Prime de fin de saison (17 octobre 2026, décision du porteur : prix du catalogue inchangés)

Le palier du classement final rapporte de l'Influence (`house.influence.season`) : Doge 50, podium 30, top 10 20, top 10 % 15, top 25 % 10, participant 5. La règle des paliers passe du serveur au moteur (`seasonTier`), que le serveur appelle désormais ; le simulateur l'applique à la clôture.

| Graine | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Influence de la saison, médiane | 71,5 | 64 | 62 | 69 | 70 | 70,5 | 75 | 66 | 56 | 68 |
| Sans la Campagne (commerce et prime) | 41,5 | 38 | 33,5 | 40 | 40 | 40,5 | 46 | 39 | 28 | 41,5 |
| 9e décile | 125 | 113 | 111 | 105 | 107 | 109 | 126 | 119 | 107 | 113 |
| Part de la Campagne | 37,1 % | 38,3 % | 37,1 % | 37,5 % | 40,0 % | 37,7 % | 36,1 % | 35,7 % | 42,4 % | 38,0 % |
| Catalogue complet (≈ 640) au médian | 9 saisons | 10 | 11 | 10 | 10 | 10 | 9 | 10 | 12 | 10 |

Toutes les graines conformes ; patentes : avance médiane +2,7 % et +1,6 % (deux lots de 5 graines), marchands sans patente +1,4 % et −1,4 %.

**Lecture.** La prime ajoute ≈ 6 au médian (la plupart des marchands sont « participants ») et ≈ 15 au 9e décile : l'Influence médiane passe à ≈ 68 par saison, la Campagne en fait ≈ 38 % (cible du porteur : 40 %). Le catalogue complet demande toujours **une dizaine de saisons** au médian, six à sept au 9e décile ; un marchand qui ne fait que commercer (≈ 40 par saison) en demanderait seize. Ce qui s'achète tôt reste rapide : le second comptoir (40) dans la première saison, Alexandrie (50) dans la deuxième. Si la bêta montre que c'est trop long, la baisse d'un tiers des prix reste l'autre levier.

**Second comptoir à 15** (au lieu de 40) : il ne fait gagner que du temps (+2 % de ventes nettes en médiane), c'est une patente de confort ; à 15 d'Influence, un marchand médian l'a en deux à trois semaines. Catalogue complet ≈ 615.

### Activation (17 octobre 2026, décision du porteur)

La section `house` entre dans les réglages de Venise (`venice1450.settings.ts`) avec le barème mesuré ci-dessus. Le catalogue ne contient que le second comptoir (15) : les autres patentes attendent leur contenu. Les marchands gagnent de l'Influence dès la prochaine clôture de semaine.

## L'Influence par les missions de la Maison (17 octobre 2026)

Décision du porteur : l'Influence devient une monnaie « premium » gagnée **seulement** par les missions de la Maison (`house.missions` de Venise : un tableau de 10 missions toutes les 84 heures, tirées d'un réservoir de 17, de 2 à 5 d'Influence). Plus rien par les ventes nettes, la Campagne ni le rang de fin de saison. `pnpm sim` (5 graines, toutes conformes) :

| Graine | 1 | 2 | 3 | 4 | 5 |
| --- | --- | --- | --- | --- | --- |
| Influence de la saison, médiane | 142,5 | 140 | 154 | 152 | 153,5 |
| Influence, 9e décile | 170 | 173 | 179 | 166 | 174 |

**Lecture.** Les PNJ reçoivent chaque mission qu'ils accomplissent : ≈ 150 par saison au médian, plus du double de l'ancien barème (≈ 68), et un écart resserré entre assidus et moyens (les missions récompensent la présence régulière, pas le volume). Le second comptoir (15) vient dès le premier tableau, le nom doré (40) dans la première semaine ; le catalogue du plan (≈ 615) demanderait ≈ 5 saisons au médian, si l'Influence n'était pas aussi dépensée dans le monde. Les dépenses (accélérer une livraison, troupes, achever un ouvrage, déplacer le second comptoir, changer de maîtrise ou de tâche du jour) ne sont pas encore jouées par les PNJ du simulateur : elles sont plafonnées par jour (3 accélérations, 20 troupes) et à mesurer avec la bêta. À surveiller : si les patentes à contenu arrivent, les prix du catalogue devront peut-être monter d'un tiers.

## Retrait des entretiens (17 octobre 2026, décision du porteur)

Bâtiments et véhicules ne coûtent plus rien à garder : plus d'entretien en ducats, plus de production bloquée pour entretien impayé, plus de Franchise (programme par défaut : Fondaco, Faveur de Venise, Levant). Le seul coût quotidien d'un comptoir est le pain de ses ouvriers (rations, inchangées). `pnpm sim`, 5 graines, toutes conformes :

| Graine | 1 | 2 | 3 | 4 | 5 |
| --- | --- | --- | --- | --- | --- |
| Monnaie par joueur actif en fin de saison, avant → après (ducats) | 408 → 1 545 | 561 → 1 293 | 483 → 1 220 | 538 → 1 444 | 492 → 1 591 |
| Croissance moyenne de la monnaie (%/jour), avant → après | 1,8 → 7,2 | 3,2 → 6,4 | 2,5 → 4,7 | 2,9 → 6,5 | 3,0 → 8,7 |
| Jours hors plage du ratio créée / détruite (sur 23), avant → après | 0 → 9 | 1 → 7 | 1 → 8 | 3 → 9 | 0 → 13 |
| Gini du patrimoine à J+15, avant → après | 0,43 → 0,49 | 0,42 → 0,49 | 0,46 → 0,53 | 0,41 → 0,45 | 0,45 → 0,50 |

Indice des prix du panier inchangé (84 à 128), assidus toujours loin devant les occasionnels.

**Lecture.** L'entretien était le premier puits de monnaie : sans lui, la masse monétaire par joueur actif triple en fin de saison (≈ 1 400 ducats au lieu de ≈ 500) et dépasse le plafond visé (jusqu'à 1,6 ×) ; le ratio créée / détruite sort de sa plage un jour sur trois. Les prix ne bougent pas encore (la Dogana et les villes les tiennent), mais la trésorerie de fin de saison n'a plus d'emploi, ce que le palais avait corrigé (constat 7). Aucun contrepoids n'est appliqué ici : le choix du levier (taxe du Rialto, prix du palais ou des améliorations, prix des véhicules) reste au porteur.

### Contrepoids : ducats des bâtiments +40 % (17 octobre 2026, décision du porteur)

Essais sur la graine 1 (et 5), par `--scenario` : palais ×2 (masse 1 216 ducats, croissance 6,1 %/jour), palais ×2 avec moins de matériaux (1 223, 6,1), palais ×3 (1 533, 6,7), coût des niveaux +50 % avec palais ×2 (1 629, 6,8), bâtiments +25 %, palais ×2 et améliorations de véhicules +50 % (1 318, 5,7), **ducats de tous les bâtiments +40 %** (1 117, 3,5). Le palais seul ne sert à rien : les PNJ manquent de briques et de planches, pas de ducats, et un palais plus cher les fait thésauriser plus longtemps (ils l'achètent avec 125 % de son prix en caisse). Retenu : la part en ducats de chaque construction et amélioration +40 % (ferme 294 ducats, boulangerie 588, palais 784), soit à peu près le prix des saisons de six semaines.

| Graine | 1 | 2 | 3 | 4 | 5 |
| --- | --- | --- | --- | --- | --- |
| Monnaie par joueur actif en fin de saison, sans contrepoids → avec (ducats) | 1 545 → 1 117 | 1 293 → 1 165 | 1 220 → 1 258 | 1 444 → 1 588 | 1 591 → 1 341 |
| Croissance moyenne de la monnaie (%/jour) | 7,2 → 3,5 | 6,4 → 4,5 | 4,7 → 5,2 | 6,5 → 6,3 | 8,7 → 6,4 |
| Jours hors plage du ratio créée / détruite (sur 23) | 9 → 10 | 7 → 6 | 8 → 5 | 9 → 8 | 13 → 8 |
| Niveaux d'ateliers par marchand en fin de saison | 8,4 → 7,6 | 8,6 → 6,8 | — → 6,8 | — → 6,4 | — → 6,9 |

Toutes les graines conformes ; indice des prix 86 à 126.

**Lecture.** Le contrepoids rend aux ateliers le rythme d'avant le retrait de l'entretien (≈ 6,2 à 7,6 niveaux par marchand) et ramène la croissance moyenne de ≈ 6,7 à ≈ 5,2 %/jour, mais la masse monétaire reste ≈ 2,5 fois celle d'avant (≈ 1 300 ducats au lieu de ≈ 500), sous le plafond bloquant (2,5 × le capital de départ). L'entretien n'a pas d'équivalent parmi les coûts ponctuels : il frappait aussi les marchands qui n'investissaient plus. À mesurer avec la bêta ; si la trésorerie de fin de saison se révèle sans emploi chez les vrais joueurs, la taxe du Rialto (3 %) reste le levier proportionnel.

## La Terraferme : prototype au simulateur (17 octobre 2026)

`pnpm --filter @comptoirs/simulator terra` fait jouer une semaine de la Terraferme (`docs/plan-terraferme.md`) à 40 marchands PNJ : 12 assidus (7 sessions par jour), 14 réguliers (4), 10 occasionnels (2), 4 retardataires (3, dès le jeudi). Chacun se pose, puis lance des fronts vers la terre neutre, sinon vers le voisin le plus mince, sinon vers Milan. Rapport : `apps/simulator/out/terraferma.md`.

**Premier réglage (10 cases par marchand, écart de départ 4, fronts de 2 cases toutes les 10 minutes, Milan au plafond suivant ses terres)** : 9 marchands sur 40 seulement trouvent où se poser ; Milan fait boule de neige et prend toute la carte dès le jeudi.

**Ce que le prototype a changé** :

| Changement | Pourquoi |
| --- | --- |
| Milan a un **plafond fixe** (`milan.troops` + `troopsPerActive` par marchand actif) | Avec un plafond qui suit les terres, Milan avale la carte |
| Le **comptoir de départ est imprenable** | Sans lui, un marchand tient 40 à 77 % de la carte en fin de semaine et 30 sur 36 sont rayés de la carte : personne ne revient jouer après avoir été éliminé le mardi |
| 20 cases par marchand, écart de départ 2 | Tous les marchands du lundi trouvent leur place (36 sur 36) |
| Fronts d'**une case par demi-heure**, qui **rentrent après 2 h** (`fronts.maxHours`) | Plus lents et à relancer : la présence compte |

**Réglage retenu, 5 graines** :

| Graine | 1 | 2 | 3 | 4 | 5 |
| --- | --- | --- | --- | --- | --- |
| Terre neutre à 22 h le lundi | 13 % | 14 % | 16 % | 18 % | 16 % |
| Milan en fin de semaine | 25 % | 28 % | 27 % | 27 % | 26 % |
| Premier front entre marchands | 33 h | 33 h | 34 h | 33 h | 33 h |
| Le premier tient (de la carte) | 8 % | 7 % | 6 % | 6 % | 10 % |
| Marchands sans terre | 0 | 0 | 0 | 0 | 0 |
| Assidus devant occasionnels (Gloire médiane) | 119 % | 153 % | 125 % | 96 % | — |

**Lecture et problèmes ouverts** :
- **La terre neutre part le premier jour** : l'expansion pacifique, le meilleur moment d'OpenFront, dure moins d'une journée. Pistes : moins de cases prises par front sur le neutre, ou une carte plus grande.
- **Les retardataires ne peuvent plus se poser** (0 sur 4) : il faut une règle d'arrivée en cours de semaine (se poser sur les terres de Milan, qui servent de réserve, ou un comptoir accordé à la lisière du plus grand).
- **L'avance des assidus est faible** (96 à 153 %) : les PNJ jouent naïvement et les fronts continuent sans eux ; à remesurer avec des PNJ plus fins avant de toucher aux règles.
- **Milan grandit doucement** jusqu'à un quart de la carte : c'est le rôle voulu (le tampon et le frein au meneur), à surveiller.
- Les alliances, l'encerclement, les bâtiments, l'Influence du classement et les décrets ne sont pas encore dans le prototype.

### La Terraferme sur la vraie Vénétie, retardataires et expansion plus lente (17 octobre 2026, décisions du porteur)

La carte suit désormais la géographie dessinée (`terraferma.geography` : le cadre, la mer, la lagune et le lac de Garde en polygones, les villes à leur place) ; les cases s'affinent quand le monde grandit. Décisions du porteur : un retardataire se pose **à la lisière des terres de Milan** quand plus aucune terre neutre ne l'accueille ; la terre neutre se prend **plus lentement** (une case par heure, `fronts.neutralEverySteps`).

Sur la vraie carte, Milan tenait d'abord toute la Lombardie (35 % de la terre) et les comptoirs de départ 35 % de plus : la terre neutre partait encore le lundi. Essais (graines 1 à 3, terre neutre à 22 h du lundi au dimanche) :

| Variante | Terre neutre | Assidus devant occasionnels |
| --- | --- | --- |
| Régénération 400 (au lieu de 1 200) | 12 · 2 · 1 · 0 % | 71 à 78 % |
| Milice ×2 | 16 · 6 · 3 · 2 % | 102 à 132 % |
| Régénération 400, milice ×2, neutre toutes les 4 étapes | 22 · 13 · 8 · 5 % | 112 à 122 % |
| **Milan à 18 % des colonnes, 25 cases par marchand, régénération 400, milice ×2, neutre toutes les 2 étapes** | **41 · 30 · 23 · 13 %** | **130 à 135 %** |

**Retenu** (dernière ligne), 5 graines :

| Graine | 1 | 2 | 3 | 4 | 5 |
| --- | --- | --- | --- | --- | --- |
| Terre neutre à 22 h, lundi → jeudi | 41 · 31 · 23 · 13 % | 41 · 30 · 24 · 15 % | 41 · 29 · 21 · 11 % | 41 · 30 · 23 · 15 % | 41 · 30 · 23 · 14 % |
| Milan en fin de semaine | 29 % | 28 % | 29 % | 29 % | 29 % |
| Premier front entre marchands | 37 h | 37 h | 37 h | 35 h | 35 h |
| Marchands posés (retardataires compris) | 40 / 40 | 40 / 40 | 40 / 40 | 40 / 40 | 40 / 40 |
| Le premier tient | 5 % | 5 % | 4 % | 5 % | 5 % |
| Assidus devant occasionnels (Gloire médiane) | 131 % | 130 % | 135 % | 121 % | 163 % |

**Lecture.** La course à la terre libre dure jusqu'au jeudi ; les retardataires arrivent sur de la terre neutre, ou à la lisière de Milan à la fin ; personne n'est rayé de la carte ; l'avance des assidus monte à 121 à 163 %. Restent à jouer au prototype : les alliances, l'encerclement, les bâtiments, l'Influence du classement et les décrets.

### La Terraferme : alliances, encerclement, bâtiments, clôture (18 octobre 2026)

Le moteur joue désormais les alliances (deux au plus, rupture effective après 2 h, Traître au troisième bris de la semaine : défense ×0,75 et plus d'alliance pendant 24 h, troupes envoyées à un allié dans la limite de 30 % du plafond par jour), l'encerclement (une poche coupée de son comptoir et entourée d'un seul rival perd 10 % de ses cases par heure), la Rocca (défense ×1,6 sur sa case et ses voisines, une pour 15 cases, 40 d) et le Borgo (plafond +20 et régénération +10 %, un pour 20 cases, 50 d), le plafond relevé pour des ducats (+10 pour 100 d, deux fois par jour), le décret choisi par chacun pour le cas où il serait Signore, et la clôture (classement en Gloire, Influence par palier, Signore, victoire immédiate à 80 % de la terre). Les ducats sont pris par l'appelant : le moteur rend le prix.

Les PNJ du simulateur acceptent toute alliance et en demandent une au voisin le plus glorieux, dépensent un budget du jour (assidus 150 d, réguliers et retardataires 100 d, occasionnels 50 d : une hypothèse, le simulateur de la Terraferme n'a pas encore l'économie du commerce), choisissent un décret au hasard.

| Graine | 1 | 2 | 3 | 4 | 5 |
| --- | --- | --- | --- | --- | --- |
| Assidus devant occasionnels (Gloire médiane) | 199 % | 194 % | 197 % | 198 % | 206 % |
| Cases médianes : assidus / occasionnels | 23 / 5 | 21 / 3 | 29 / 6 | 23 / 4 | 21 / 5 |
| Marchands avec au moins un allié | 36 / 40 | 38 / 40 | 36 / 40 | 40 / 40 | 37 / 40 |
| Signore | assidu | assidu | régulier | régulier | assidu |
| Victoire par conquête (80 %) | non | non | non | non | non |
| Ducats dépensés sur la Terraferme | 76 d par marchand et par jour | 76 | 75 | 76 | 76 |

**Lecture.** L'activité paie enfin nettement (×2 en Gloire) sans éliminer personne : l'occasionnel garde un petit territoire autour de son comptoir. Presque tout le monde s'allie quand les PNJ acceptent tout : avec de vrais joueurs, à mesurer à la bêta. La conquête à 80 % reste un horizon. La Terraferme détruirait environ 75 d par marchand actif et par jour, soit à peu près 40 % de ce que rapportent les livraisons : **c'est le puits de monnaie qui manquait depuis le retrait de l'entretien**, à confirmer quand la Terraferme sera jouée dans le simulateur du commerce (le vrai budget des marchands). Le palier « premier quart » ne sert pas à 40 marchands (le top 10 le couvre) : il servira dans les mondes plus grands.

### La Terraferme jouée dans le monde : le puits de monnaie (18 octobre 2026)

`pnpm sim --terra` fait jouer la Terraferme au simulateur du commerce (les PNJ du moteur s'y posent, s'allient, se battent et y dépensent leurs ducats en trop : quatre fois le prix en caisse), avec les décrets du Signore et l'Influence du classement. 5 graines, toutes conformes :

| Graine | 1 | 2 | 3 | 4 | 5 |
| --- | --- | --- | --- | --- | --- |
| Monnaie par joueur actif en fin de saison (ducats) | 609 | 682 | 835 | 620 | 613 |
| Croissance moyenne de la monnaie (%/jour) | 1,8 | 2,2 | 4,4 | 2,4 | 2,7 |
| Jours hors plage du ratio créée / détruite (sur 23) | 1 | 4 | 1 | 0 | 1 |
| Détruit par la Terraferme (d par joueur actif et par jour) | 95 | 100 | 100 | 105 | 103 |
| Part des destructions | 40 % | 42 % | 42 % | 44 % | 43 % |
| Niveaux d'ateliers par marchand | 5,7 | 5,1 | 5,3 | 4,8 | 5,3 |
| Assidus devant occasionnels (patrimoine médian) | 119 % | 214 % | 190 % | 189 % | 77 % |
| Influence médiane de la saison (dont missions) | 173 (158) | 163 (151) | 163 (153) | 169 (155) | 162 (148) |

Pour comparer : sans entretien et sans Terraferme, 1 117 à 1 588 ducats et 3,5 à 6,4 %/jour ; avec l'entretien (avant octobre), 408 à 561 ducats et 1,8 à 3,2 %/jour.

**Lecture.** La Terraferme est le puits qui manquait : la monnaie revient presque à son niveau d'avant le retrait de l'entretien, et la croissance aussi. Deux effets à surveiller :
- **les ateliers grandissent moins** (4,8 à 5,7 niveaux par marchand, au lieu de 6,4 à 7,6) : les ducats vont à la guerre plutôt qu'aux ateliers. À la bascule, les **ducats des bâtiments pourraient revenir à leur prix d'avant (−40 %)**, le contrepoids de la Terraferme rendant celui-là inutile ; à mesurer alors ;
- le **patrimoine des assidus** baisse quand ils dépensent sur la Terraferme (graine 5 : 77 %) : le classement compte les ventes nettes, pas le patrimoine, et l'Influence du classement de la Terraferme récompense cette dépense ; l'indicateur de patrimoine ne dit plus tout.

La Faveur du Doge donne aussi son contrat de plus par jour (`effects.faveur_doge.extraOrders`, 1), tiré comme les autres et payé +40 %.

## Bascule : la Terraferme à la place des familles, les bâtiments à leur prix (18 octobre 2026, décision du porteur)

À la réinitialisation de la saison du 18 octobre, la Terraferme est allumée pour Venise (`terraferma.live`) et éteint les familles. Les ducats des bâtiments reviennent à leur prix d'avant le retrait de l'entretien (ferme 210 d, moulin 280, briqueterie et scierie 350, boulangerie 420, palais 560) : la Terraferme est le contrepoids, les +40 % ne servent plus. `pnpm sim`, 5 graines, toutes conformes :

| Graine | 1 | 2 | 3 | 4 | 5 |
| --- | --- | --- | --- | --- | --- |
| Monnaie par joueur actif en fin de saison (ducats) | 987 | 1 086 | 841 | 883 | 783 |
| Croissance moyenne de la monnaie (%/jour) | 6,2 | 5,2 | 4,7 | 4,7 | 3,5 |
| Jours hors plage du ratio créée / détruite (sur 23) | 0 | 6 | 0 | 0 | 5 |
| Détruit par la Terraferme (d par joueur actif et par jour) | 89 | 97 | 93 | 92 | 96 |
| Part des destructions | 39 % | 42 % | 38 % | 40 % | 42 % |
| Niveaux d'ateliers par marchand | 6,7 | 6,7 | 7,4 | 7,2 | 6,9 |
| Assidus devant occasionnels (patrimoine médian) | 82 % | — | 244 % | 162 % | 206 % |
| Influence médiane de la saison (dont missions) | 109 (99) | 121 (109) | 122 (113) | 121 (106) | 120 (107) |

**Lecture.** Les ateliers retrouvent leur croissance (6,7 à 7,4 niveaux par marchand, au lieu de 4,8 à 5,7 avec les +40 %), la monnaie reste sous son plafond (0,8 à 1,1 ×) et la Terraferme en détruit toujours 40 %. La croissance de la monnaie (3,5 à 6,2 %/jour) revient près de son niveau sans entretien : c'est le prix d'ateliers qui grandissent ; si la bêta la trouve trop forte, le premier levier est le prix des bâtiments de la Terraferme (Rocca, Borgo, plafond), pas celui des ateliers. Les indicateurs de la Campagne disparaissent du rapport quand les familles sont éteintes.

## Accélérer une livraison : livraison et retour immédiats (18 octobre 2026, décision du porteur)

Payer en Influence livre la marchandise tout de suite **et** ramène le véhicule aussitôt ; on peut aussi accélérer un véhicule sur la route du retour. Le prix reste d'un point par 20 minutes (`house.spend.rushMinutesPerPoint`), mais compté jusqu'au retour du véhicule : une accélération à l'aller coûte environ deux fois plus qu'avant, pour un véhicule qui repart aussitôt. La limite reste de trois par jour (`rushPerDay`). Les PNJ du simulateur n'accélèrent pas : `pnpm sim` n'en est pas changé ; à mesurer à la bêta (Influence dépensée en accélérations, livraisons par véhicule et par jour).

## La Terraferme : placement le premier jour, puis la guerre sans frein (18 octobre 2026, décision du porteur)

Pour Venise : on se pose pendant les 24 premières heures de la semaine (`start.placementHours` 24, en sûreté jusque-là ; `protectionHours` et `troopsPerDay` à 0), puis plus personne n'entre ; le comptoir se prend (`fronts.capitalSafe` false) et qui perd sa dernière case est éliminé ; les fronts ne rentrent plus après 2 h (`maxHours` 0) ; Milan frappe son voisin le plus faible au lieu du premier en Gloire (`milan.target` « weakest »). `pnpm --filter @comptoirs/simulator terra`, 5 graines (les 4 retardataires, qui arrivent le jeudi, ne jouent plus la semaine) :

| Graine | 1 | 2 | 3 | 4 | 5 |
| --- | --- | --- | --- | --- | --- |
| Milan en fin de semaine | 29 % | 29 % | 23 % | 32 % | 33 % |
| Premier front entre marchands | 39 h | 37 h | 37 h | 33 h | 33 h |
| Marchands posés | 36 / 40 | 36 / 40 | 36 / 40 | 36 / 40 | 36 / 40 |
| Éliminés en fin de semaine | 4 | 8 | 5 | 4 | 5 |
| Le premier tient | 9 % | 8 % | 9 % | 5 % | 8 % |
| Les trois premiers tiennent | 19 % | 18 % | 22 % | 14 % | 17 % |
| Assidus devant occasionnels (Gloire médiane) | 197 % | 226 % | 218 % | 181 % | 198 % |
| Signore | assidu | assidu | assidu | assidu | assidu |
| Ducats détruits (d par marchand et par jour) | 79 | 78 | 79 | 78 | 78 |

`pnpm sim`, 5 graines, toutes conformes ; la Terraferme détruit 36 à 40 % de la monnaie (86 à 96 d par joueur actif et par jour), la masse monétaire reste sous son plafond (0,80 à 0,91 ×).

**Lecture.** La partie est plus dure, comme voulu : 4 à 8 marchands sur 36 sont rayés de la carte avant dimanche (aucun avant), le premier tient jusqu'à 9 % de la carte (5 % avant) et l'avance des assidus passe de 121 à 163 % à 181 à 226 %. Milan, qui ne freine plus le favori, mange les faibles et finit à 23 à 33 % de la carte. À surveiller à la bêta : les éliminés reviennent-ils la semaine suivante, et la part de Milan (si elle gêne, baisser `milan.shareBps` ou son plafond fixe).

## La Terraferme : semaines du lundi, troupes payées en ducats, recrutement par les terres (18 octobre 2026, décision du porteur)

Les semaines vont du lundi au dimanche (heure de Paris) ; le classement de la semaine est la Gloire de la Terraferme (l'Influence du commerce reste comptée sur les ventes). Pour Venise, le maximum de troupes ne monte plus qu'avec les ducats (`troops.base` 60, `perCell` et `perCity` 0 ; `capRaise` +20 pour 100 d, trois fois par jour), le Borgo disparaît, et les terres recrutent par heure ouverte (`troops.recruit` : 6, plus 1 par case et 3 par ville). Un front qui ne paie pas sa première case est refusé ; un front qui ne paie plus la suivante rentre aussitôt. `pnpm --filter @comptoirs/simulator terra`, 5 graines :

| Graine | 1 | 2 | 3 | 4 | 5 |
| --- | --- | --- | --- | --- | --- |
| Milan en fin de semaine | 30 % | 20 % | 18 % | 20 % | 25 % |
| Premier front entre marchands | 33 h | 33 h | 33 h | 33 h | 33 h |
| Fronts lancés (contre des marchands) | 1 015 (736) | 1 018 (726) | 1 005 (727) | 1 002 (702) | 1 013 (730) |
| Éliminés en fin de semaine (sur 36) | 2 | 1 | 1 | 4 | 2 |
| Le premier tient | 6 % | 5 % | 7 % | 7 % | 5 % |
| Cases médianes : assidu · régulier · occasionnel | 33 · 15 · 9 | 28 · 22 · 8 | 41 · 19 · 6 | 37 · 25 · 2 | 31 · 22 · 7 |
| Assidus devant occasionnels (Gloire médiane) | 280 % | 246 % | 295 % | 313 % | 250 % |
| Ducats détruits (d par marchand et par jour) | 82 | 80 | 79 | 78 | 80 |

`pnpm sim`, 5 graines, toutes conformes : la Terraferme détruit 37 à 44 % de la monnaie (88 à 102 d par joueur actif et par jour), la masse monétaire finit à 657 à 1 036 ducats par joueur actif (0,79 à 1,04 × son plafond).

**Lecture.** Les fronts entre marchands triplent (700 au lieu de 200 à 250) : le recrutement par les terres rend les troupes rapidement, la guerre est plus vive. Moins d'éliminés (1 à 4 au lieu de 4 à 8) : un grand territoire n'a pas plus de troupes qu'un petit (le maximum ne suit plus les terres), il défend donc plus mince, ce qui freine naturellement le premier (5 à 7 % de la carte). La présence paie fort (assidus 246 à 313 % des occasionnels) : c'est elle qui relance les fronts. Milan, sans plafond qui le gonfle, reste à 18 à 30 %.

## La Terraferme : les PNJ marchent dès qu'ils se posent, plusieurs fronts par session (19 octobre 2026)

Correctif de comportement, aucun paramètre touché. Sur le serveur, une maison PNJ qui se posait finissait sa session aussitôt et ne lançait son premier front qu'à la session suivante (1 à 5 par jour) : le jour du placement, beaucoup restaient sur leur anneau de départ pendant qu'un joueur s'étendait sur la terre libre. Désormais le PNJ choisit son décret et marche dans la session même où il se pose, et lance des fronts l'un après l'autre (jusqu'à `fronts.max`) tant qu'il garde au moins 30 % de son maximum de troupes ; la terre libre peut recevoir plusieurs fronts, sur des cases différentes, un marchand ou Milan un seul. Le simulateur de la Terraferme (`pnpm --filter @comptoirs/simulator terra`) a ses propres PNJ et ne change pas.

`pnpm sim`, 5 graines, toutes conformes avant comme après :

| Moyenne des 5 graines | Avant | Après |
| --- | --- | --- |
| Monnaie détruite par la Terraferme (d par joueur actif et par jour) | 98 | 100 |
| Croissance de la monnaie par joueur actif (moyenne, %/jour) | 3,6 | 4,3 |
| Jours hors plage du ratio monnaie créée / détruite (sur 23) | 2,4 | 4,4 |
| Gini du patrimoine à J+15 | 0,49 | 0,46 |
| Assidus devant occasionnels (patrimoine médian) | 171 % | 184 % |

**Lecture.** Les PNJ dépensent un peu plus sur la Terraferme et la gagnent mieux ; l'économie bouge dans le bruit des graines, sauf le ratio monnaie créée / détruite, qui sort plus souvent de sa plage (graine 4 : 9 jours, en avertissement seulement). À revoir si cela persiste.

## Première session : commande de bienvenue à 150 ducats, ouvriers nourris le premier jour, plus d'accélération (19 octobre 2026, décisions du porteur après l'audit UX)

Après l'audit UX (`docs/audit-ux-2026-10-19.md`), trois réglages ont changé :
- La commande de bienvenue paie un total fixe de 150 ducats (`deliveries.welcome[region].reward`, 15 000 deniers), au lieu du prix d'une commande ordinaire (26 d pour 12 pains). La Terraferma livre 10 blés, son premier lot, au lieu du pain que mangent ses ouvriers ; la Lagune livre 8 briques et les Dolomites 8 planches, comme avant.
- Les ouvriers d'un nouveau venu ne mangent pas avant 24 h (`rations.graceHours`).
- L'accélération d'une livraison contre de l'Influence est retirée (`house.spend.rushPerDay` à 0 ; le barème est gardé).

`pnpm sim`, 5 graines, toutes conformes, avant (référence) et après :

| Graine | 1 | 2 | 3 | 4 | 5 |
| --- | --- | --- | --- | --- | --- |
| Monnaie payée (d par joueur actif et par jour), avant → après | 200,8 → 195,9 | 201,1 → 200,9 | 203,2 → 200,6 | 200,1 → 201,2 | 193,2 → 196,3 |
| Masse monétaire max (× plafond), avant → après | 0,86 → 0,86 | 0,83 → 0,83 | 0,78 → 0,83 | 1,20 → 0,83 | 0,78 → 0,84 |
| Indice des prix, après | 86–125 | 87–121 | 85–119 | 86–127 | 85–119 |
| Première livraison (médiane), avant → après | 2,8 h → 4,3 h | 1,3 h → 3,3 h | 0 → 0 | 0,5 h → 0,5 h | 0,5 h → 0,5 h |
| Niveau moyen des ateliers, après | 2,33 | 2,34 | 2,40 | 2,50 | 2,40 |
| Joueurs actifs en fin de saison, avant → après | 37 → 35 | 45 → 44 | 42 → 38 | 39 → 41 | 39 → 40 |

**Lecture.** La bienvenue crée 150 ducats une fois par marchand, soit 5 ducats par jour et par marchand sur un mois : c'est noyé dans les 200 ducats payés chaque jour pour les marchandises, qui ne bougent pas au-delà du bruit des graines. La masse monétaire reste sous son plafond, et la graine 4, qui le dépassait (1,20 ×), revient à 0,83 ×. Les prix gardent leur amplitude.

La première livraison des bots arrive plus tard sur les graines 1 et 2 (3 à 4 h au lieu de 1 à 3 h). Le bot du Terraferma attend la récolte de son blé avant de livrer la bienvenue, alors qu'il livrait le pain de départ. Une vraie personne guidée par Lorenzo la livre dans les cinq premières minutes : c'est ce que vérifie le test de bout en bout (`pnpm --filter @comptoirs/web e2e`). La grâce sur le pain ne pèse que sur le premier jour d'un nouveau venu.

## La Terraferme ouverte toute la semaine, Milan plus fort, les PNJ se battent plus tôt (20 octobre 2026, retour du porteur)

Retour de partie : « aucun PNJ n'attaque ni ne se développe ». Le moteur jouait bien (simulation d'octobre : 30 à 45 fronts par jour), mais un marchand arrivé après le lundi ne pouvait plus se poser de la semaine, et les PNJ ne marchaient sur un rival qu'une fois la terre libre épuisée (vers le 4ᵉ jour). Changements :

- `start.placementHours` 24 → 0 : on se pose n'importe quel jour, avec `troopsPerDay` 10 troupes de plus par jour de retard ;
- `start.truceHours` 24 (nouveau réglage) : tout le monde est à l'abri jusqu'à la fin du premier jour, comme avant ; un retardataire l'est `protectionHours` 12 h après son arrivée ;
- `milan.everyHours` 4 → 2 et `milan.shareBps` 2 000 → 3 000 : des chevauchées plus fortes. Milan ne repart que quand son front précédent est rentré : le nombre de ses fronts ne change presque pas (12 à 17 par semaine), leur poids si ;
- PNJ : une fois un front lancé sur la terre libre, le suivant va d'abord au voisin le plus mince (puis à la terre libre, puis à Milan) ; un rival trop fort pour la part envoyée passe au suivant.

Une carte plus serrée (18 puis 22 cases par marchand) a été essayée et écartée : les occasionnels y étaient éliminés deux à trois fois plus souvent ; on garde 25.

Prototype de la Terraferme (`pnpm --filter @comptoirs/simulator terra`, 40 marchands, 5 graines) :

| | Avant | Après |
| --- | --- | --- |
| Marchands posés | 36 / 40 (les 4 retardataires refusés) | 40 / 40 |
| Fronts contre des marchands (semaine) | 702 à 736 | 732 à 770 |
| Éliminés en fin de semaine | 2 · 1 · 1 · 4 · 2 | 5 · 2 · 5 · 3 · 3 |

`pnpm sim`, 5 graines, toutes conformes avant comme après :

| Moyenne des 5 graines | Avant | Après |
| --- | --- | --- |
| Monnaie détruite par la Terraferme (d par joueur actif et par jour) | 101,9 | 109,6 |
| Croissance de la monnaie par joueur actif (moyenne, %/jour) | 3,6 | 3,5 |
| Jours hors plage du ratio monnaie créée / détruite (sur 23) | 2,0 | 2,8 |
| Gini du patrimoine à J+15 | 0,48 | 0,47 |

**Lecture.** Tout le monde joue, et la guerre entre marchands arrive plus tôt. Le prix à payer : un peu plus d'éliminés en fin de semaine, surtout des occasionnels. À suivre en bêta ; si cela gêne, le premier levier est `troopsPerDay` (des retardataires moins forts). L'économie reste dans le bruit des graines (graine 2 : 6 jours hors plage du ratio, en avertissement seulement).

## Commandes de compagnie et fattore (20 octobre 2026, recommandations du porteur)

Deux mécaniques du lot de recommandations (`docs/recommandations-2026-10-20.md`) touchent la monnaie :

- **Commandes de compagnie** (`projects`) : tous les 2 jours, une ville commande 4 pains, 3 briques et 3 planches par marchand actif, payés 10 % au-dessus de la référence à la livraison ; une fois remplie, chaque marchand qui a livré touche 10 % de plus (`bonusBps`). Les PNJ n'y livrent que leur part (le besoin par marchand), une fois par commande.
- **Fattore** (`deliveries.fattore`) : un véhicule resté 2 h au comptoir part avec la meilleure commande que le stock couvre, 2 fois par jour, de 8 h à 22 h, pour un marchand passé dans les 24 h ; 15 % du paiement est détruit.

La Terraferme garde aussi la capitale de qui n'attaque aucun marchand (`peacefulSafe`).

`pnpm sim`, 5 graines, toutes conformes :

| Moyenne des 5 graines | Avant | Après |
| --- | --- | --- |
| Croissance de la monnaie par joueur actif (moyenne, %/jour) | 3,5 | 4,3 |
| Jours hors plage du ratio monnaie créée / détruite (sur 23) | 2,8 | 2,6 |
| Gini du patrimoine à J+15 | 0,47 | 0,44 |
| Monnaie détruite par la Terraferme (d par joueur actif et par jour) | 109,6 | 114,7 |
| Utilisation des véhicules des assidus | 28 % (graine 5) | 32 à 34 % |
| Masse monétaire par joueur actif (pic) | ≤ 0,9 × | ≤ 0,97 × |

**Lecture.** Le fattore fait rouler les véhicules un peu plus (toujours sous la cible de 50 %), les commandes de compagnie créent un peu plus de monnaie ; la masse par joueur actif reste loin du plafond (2,5 ×) et l'indice des prix dans sa plage. La croissance de la monnaie reste en avertissement, comme avant. Le Gini baisse : les commandes de compagnie profitent à tous ceux qui livrent.

## La Terraferme proche d'OpenFront (20 octobre 2026, décision du porteur)

Heure de bataille, soldats ou paysans (récoltes de blé, d'argile et de bois, ducats des routes entre villes), ports et barques, nations de 1450, bombardes et remparts, diplomatie (dons de ducats, embargo), semaines en équipes, escarmouches : voir `docs/plan-terraferme.md`, « Se rapprocher d'OpenFront ». Ce qui touche la monnaie et les stocks : les récoltes (journal des stocks), les routes (grand livre, `terraferma_route`), les dons entre alliés (`terra_gift`), les bâtiments (ports, bombardes, remparts détruits en ducats), l'embargo.

`pnpm sim`, 5 graines, toutes conformes (les PNJ gardent le curseur à moitié et ne jouent ni ports ni bombardes) :

| Moyenne des 5 graines | Avant | Après |
| --- | --- | --- |
| Croissance de la monnaie par joueur actif (moyenne, %/jour) | 4,3 | 3,4 |
| Jours hors plage du ratio monnaie créée / détruite (sur 23) | 2,6 | 2,4 |
| Gini du patrimoine à J+15 | 0,44 | 0,44 |
| Monnaie détruite par la Terraferme (d par joueur actif et par jour) | 114,7 | 110,0 |
| Masse monétaire par joueur actif (pic) | ≤ 0,97 × | ≤ 0,91 × |

**Lecture.** Les récoltes de la Terraferme ajoutent des matières premières qui pèsent un peu sur leurs prix ; la monnaie croît moins vite, l'indice des prix reste dans sa plage (84 à 126). Les nations éliminent davantage de marchands dans le prototype où tous attaquent (8 sur 40 au lieu de 3) ; qui n'attaque aucun marchand garde sa capitale. À mesurer avec de vrais joueurs : le curseur, les ports et les bombardes, que les PNJ ne jouent pas.

## La refonte du commerce (20 octobre 2026, décision du porteur)

Ateliers chiffrés, tableau de bord, conseiller ; fournisseur officiel (+10 % la semaine suivante, dès 10 unités), appels d'offres du Doge (tous les deux jours, plafond 140 % de la référence, caution 20 %), entrepôts (2 places par ville, dès 50 ducats détruits, 40 unités par jour) ; chaînes de luxe aux seuils des titres (1 500, 3 000, 5 000 ducats de ventes nettes), manufactures jusqu'au niveau 10 dès Négociant (qualité +4 % par niveau), commandes entre marchands (3 jours), colleganza (7 jours, part ≤ 75 %), prêts de la Banque (30 % du patrimoine, 500 ducats, 1 %/jour, 7 jours, +20 % en retard). Voir `docs/recommandations-2026-10-20.md`, « La refonte du commerce ».

`pnpm sim`, 5 graines, toutes conformes (les PNJ enchérissent aux appels d'offres, honorent les commandes, acceptent les colleganze, le bâtisseur monte les chaînes de luxe, tous passent en manufacture ; ni entrepôts ni prêts) :

| Moyenne des 5 graines | Avant | Après |
| --- | --- | --- |
| Croissance de la monnaie par joueur actif (moyenne, %/jour) | 3,4 | 3,6 |
| Jours hors plage du ratio monnaie créée / détruite (sur 23) | 2,4 | 2,4 |
| Gini du patrimoine à J+15 | 0,44 | 0,45 |
| Monnaie détruite par la Terraferme (d par joueur actif et par jour) | 110,0 | 109,4 |
| Masse monétaire par joueur actif (pic) | ≤ 0,91 × | ≤ 0,91 × |

**Lecture.** Les nouveautés créent un peu de monnaie (prime du fournisseur, appels d'offres, qualité) et en détruisent un peu (cautions perdues) : la croissance reste en avertissement comme avant, la masse par joueur actif loin du plafond. Les cours des matières premières finissent bas (50 à 60 % de la référence), comme avant la refonte. À mesurer avec de vrais joueurs : les entrepôts et les prêts, que les PNJ ne prennent pas, et le rythme d'ouverture des chaînes de luxe.

## Pass Négociant — avantages à zéro (21 octobre 2026, chantier `live-2` du plan de finalisation)

Les trois avantages du Pass qui vendaient de la production ou de l'accès au marché passent à 0 dans Venise : `pass.freshBonusBps` (800 → 0), `pass.marketMakerQuotaBps` (2 000 → 0) et `pass.extraOpenOrders` (2 → 0). Les champs restent dans le schéma, qui refuse désormais toute valeur non nulle (raffinement zod, test `settings.test.ts`) ; le moteur ne les lit plus (`production.ts`, `market.ts`), et un monde enregistré avec les anciennes valeurs est remis à zéro à son ouverture (`upgradeLegacySettings`). Le Pass ne donne plus que de l'information à lire et du cosmétique, listés dans `pass.perks` : cours du Rialto sur 30 jours, tableau de bord sur 30 jours, carnet à 10 offres, sceau et palette. Les effets des maîtrises (Marchand du Levant, trader) se gagnent au jeu et ne changent pas. Le Pass reste coupé dans Venise (`pass.enabled` faux) : `pnpm sim` sans `--pass` ne change pas, puisque personne n'y détient le Pass.

`pnpm sim --pass 0.2`, graines 1 à 10, toutes conformes :

| Graine | Avance des abonnés (patrimoine) | Avance (ventes nettes) | Part du top 10 (patrimoine / ventes nettes) | Gratuit assidu devant abonné occasionnel (patrimoine) |
| --- | --- | --- | --- | --- |
| 1 | 0,0 % | 0,0 % | 10 % / 20 % | pas d'abonné occasionnel |
| 2 | 0,0 % | 0,0 % | 0 % / 20 % | pas d'abonné occasionnel |
| 3 | 0,0 % | 0,0 % | 0 % / 0 % | pas d'abonné occasionnel |
| 4 | 0,0 % | 0,0 % | 10 % / 20 % | pas d'abonné occasionnel |
| 5 | 0,0 % | 0,0 % | 30 % / 30 % | 18 846 contre 10 256 ducats |
| 6 | 0,0 % | 0,0 % | 0 % / 10 % | pas d'abonné occasionnel |
| 7 | 0,0 % | 0,0 % | 0 % / 10 % | pas d'abonné occasionnel |
| 8 | 0,0 % | 0,0 % | 0 % / 0 % | pas d'abonné occasionnel |
| 9 | 0,0 % | 0,0 % | 10 % / 20 % | 25 409 contre 7 183 ducats |
| 10 | 0,0 % | 0,0 % | 10 % / 10 % | pas d'abonné occasionnel |

**Lecture.** La saison avec Pass et la même saison rejouée sans ses avantages sont désormais identiques : l'avance est exactement nulle, en médiane comme en moyenne, et l'écart de −70 % à +47 % relevé jusqu'ici (voir plus haut) n'était que la divergence de deux parties qui ne jouaient plus les mêmes coups. Le contrôle « gratuit assidu devant abonné occasionnel » n'a de sujet que sur 2 graines sur 10 (aucun occasionnel abonné encore actif en fin de saison ailleurs) ; il y est largement tenu, et il l'est par construction, le Pass ne changeant plus rien au jeu. La part des abonnés dans le top 10 (0 à 30 %) suit leur part des marchands (20 %). Les trois contrôles bloquants étant conformes sur 10 graines, la condition de simulation au branchement du paiement est remplie ; le paiement reste néanmoins débranché (`PASS_PAYMENT_OPEN` faux dans `apps/server/src/game/pass.ts`) jusqu'à la décision du porteur, et `purchasePass` refuse tout achat tant que `pass.enabled` est faux. À suivre en bêta : la part des abonnés dans le top 10 hebdomadaire face à leur part des joueurs actifs.

## Escarmouches : une partie classée par jour, entre marchands, jamais la nuit (21 octobre 2026, chantier `terra-1` du plan de finalisation)

Jusqu'ici, chaque escarmouche rapportait 200, 120, 80 puis 30 de Gloire, à toute heure, sans limite, même seul contre sept condottieri : une victoire toutes les 16 minutes, et une semaine de Terraferme pliée en dix parties (un assidu fait environ 5 000 de Gloire médiane par semaine). Désormais (`terraferma.skirmish`) :

- `rankedPerDay` 1 : seule la première partie payée du jour (jour de la semaine de Terraferme, à Paris) est classée ; les suivantes sont amicales, sans Gloire. Le quota ne se consomme qu'au paiement (`terraSkirmishGlory`), pour chaque marchand de la partie, quel que soit son rang ;
- `minHumans` 2 : une partie à un seul marchand est amicale ;
- heures d'ouverture de la Terraferme (8 h à 22 h) : une partie n'est classée que si elle commence et finit dans ces heures, aucune salle ne s'ouvre la nuit, et la commande refuse toute Gloire la nuit (`night`) ;
- barème 200/120/80/30 → 45/30/20/10 (60/40/25/10 au premier jet, revu ci-dessous).

Prototype de la Terraferme (`pnpm --filter @comptoirs/simulator terra`, 40 marchands, 5 graines) : les assidus jouent trois escarmouches par jour, les réguliers une, les occasionnels et retardataires aucune ; seule la première du jour paie. Chaque graine est jouée trois fois :

- **rang parmi les marchands** : un marchand bat les condottieri (c'est tout le problème de départ), donc les deux ou trois marchands de la partie prennent les premières places du barème et le rang est tiré entre eux seuls ;
- **premier chaque jour** : le plafond, chaque marchand gagne chacune de ses parties classées (7 × 45 = 315 de Gloire par semaine) ;
- **sans escarmouches** : la même semaine rejouée sans aucune partie.

Le premier jet tirait le rang parmi les 8 places de la partie, comme si les marchands finissaient au milieu des condottieri : il annonçait 1 à 3 % de la Gloire, un chiffre de complaisance. Rang parmi les marchands, le barème 60/40/25/10 pesait 7 à 8 % de la semaine médiane d'un régulier, et le plafond 420 de Gloire, soit 11 à 12 % de la semaine médiane d'un régulier sans escarmouches, au-dessus de la cible de 10 %. D'où 45/30/20/10 :

| Graine | Gloire médiane des escarmouches, rang parmi les marchands (assidu · régulier) | Gloire médiane de la semaine (assidu · régulier) | Part des escarmouches, rang parmi les marchands (régulier · assidu) | Part des escarmouches, premier chaque jour (régulier · assidu) | Plafond : 315 contre la semaine médiane d'un régulier sans escarmouches | Signore, sa Gloire moins celle des escarmouches (les deux hypothèses) | Signore de la semaine rejouée sans escarmouches (rang parmi les marchands · premier chaque jour) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 245 · 240 | 5 275 · 4 042 | 6 % · 5 % | 8 % · 6 % | 315 / 3 416 = 9 % | le même | un autre · le même |
| 2 | 225 · 225 | 5 451 · 3 886 | 6 % · 4 % | 8 % · 6 % | 315 / 3 661 = 9 % | le même | le même · le même |
| 3 | 235 · 240 | 4 867 · 4 088 | 6 % · 5 % | 7 % · 6 % | 315 / 3 953 = 8 % | le même | un autre · le même |
| 4 | 230 · 240 | 5 834 · 4 124 | 6 % · 4 % | 7 % · 5 % | 315 / 3 889 = 8 % | le même | le même · le même |
| 5 | 230 · 230 | 5 670 · 3 799 | 6 % · 4 % | 8 % · 5 % | 315 / 3 579 = 9 % | le même | le même · le même |

**Lecture.** Rang parmi les marchands, les escarmouches pèsent 6 % de la Gloire médiane d'un régulier ; même premier tous les jours, un marchand n'en tire que 315 de Gloire, 8 à 9 % de la semaine médiane d'un régulier sans escarmouches : la cible de 10 % tient dans l'hypothèse la plus dure. Un assidu qui en joue trois par jour n'en tire pas plus qu'un régulier qui en joue une. Ôter de la Gloire de la semaine ce que les escarmouches ont rapporté ne change jamais le Signore, sur les 5 graines et dans les deux hypothèses.

**Le Signore et les escarmouches : contrôles placebo.** Rejouée sans escarmouches, la semaine des graines 1 et 3 couronne un autre Signore quand le rang est tiré parmi les marchands, alors que « premier chaque jour » ne change rien. Le premier tour l'expliquait par « c'est le jeu », sans preuve. Le rapport du prototype (`pnpm --filter @comptoirs/simulator terra`) rejoue désormais chaque graine sous trois contrôles :

- **autres tirages des rangs** : la même semaine, les rangs des escarmouches tirés d'une autre clé du hachage (3 tirages par graine) ;
- **placebo hors escarmouches** : la semaine sans escarmouches, les minutes des sessions des marchands tirées d'une autre clé (un écart de quelques minutes, qui ne doit rien aux escarmouches ; 3 tirages par graine) ;
- **marchands aveugles** : le premier tirage des rangs, mais les marchands simulés choisissent l'allié à demander sur la Gloire de leurs voisins moins celle de leurs escarmouches.

| Comparaison, 5 graines | Signore différent |
| --- | --- |
| Avec escarmouches (premier tirage) contre sans | 2 / 5 |
| Autres tirages des rangs contre sans escarmouches | 4 / 15 |
| Autres tirages des rangs contre le premier tirage | 8 / 15 |
| Sans escarmouches, sessions décalées de quelques minutes, contre sans escarmouches | 12 / 15 |
| Marchands aveugles à la Gloire des escarmouches contre sans escarmouches | 0 / 5 |
| Premier chaque jour contre sans escarmouches | 0 / 5 |

**Lecture.** Les escarmouches ne décident jamais du Signore par leurs points : ôter leur Gloire du classement de la semaine ne change le Signore sur aucune graine, dans aucune hypothèse. Elles le changent par un seul canal, les alliances : les marchands simulés demandent l'alliance du voisin le plus glorieux, et un autre ordre de Gloire change qui s'allie avec qui, puis qui attaque qui. Le contrôle « aveugles » le prouve : sans ce canal, la semaine avec escarmouches est exactement la semaine sans elles (même Gloire hors escarmouches pour chaque marchand, même Signore, sur les 5 graines ; test `apps/simulator/test/terra.test.ts`). Et « premier chaque jour », qui ajoute la même Gloire à tous ceux qui jouent, ne change pas l'ordre et donc rien. Ce canal pèse moins que le hasard ordinaire de la semaine : les escarmouches changent le Signore 6 fois sur 20 (premier tirage et autres tirages, contre sans), quand décaler les sessions de quelques minutes, sans aucune escarmouche, le change 12 fois sur 15. Le Signore de la Terraferme est très sensible à n'importe quel écart (graine 3 : un point d'écart entre les deux premiers), et les escarmouches en sont un parmi d'autres, plus petit que l'heure à laquelle on se connecte. La mesure du plan, « Signore jamais décidé par les escarmouches », est tenue au sens strict (leurs points ne font jamais la différence) ; elles influencent la semaine comme un événement de plus, par les alliances. Remède possible si la bêta montre des alliances recherchées pour la seule Gloire d'escarmouche : afficher dans le panneau d'alliance la Gloire de la Terraferme hors escarmouches. Pas codé ici (le contrôle « aveugles » en mesure l'effet : 0 / 5). À suivre en bêta.

À suivre dans `/admin` (« Escarmouches ») : parties classées et amicales par jour, et la colonne « nuit », qui doit rester à 0. Une partie lancée trop tard pour finir avant 22 h (à partir de 21 h 43 environ) est annoncée amicale, avec sa raison, et la barre garde le même badge du début à la fin de la partie.

`pnpm sim`, 5 graines, toutes conformes, sans changement, relancé après le barème 45/30/20/10 (les marchands simulés ne jouent pas d'escarmouches, qui ne touchent ni la monnaie ni les stocks) : croissance de la monnaie par joueur actif 3,6 %/jour en moyenne, 2,4 jours hors plage du ratio monnaie créée / détruite sur 23, Gini du patrimoine à J+15 0,45, 109,4 d détruits par la Terraferme par joueur actif et par jour, les mêmes valeurs qu'après la refonte du commerce.

`pnpm sim --terra`, exigé par le plan, lancé sur ce barème (5 graines, rapport complet dans le dossier de sortie) : **toutes conformes** (graines 1 à 5 : PASS). Les chiffres sont ceux de `pnpm sim`, et c'est attendu, pas raisonné : Venise a `terraferma.live` à vrai depuis le 18 octobre, `--terra` ne change donc rien aux réglages. Par graine : croissance de la monnaie par joueur actif 4,8 · 3,8 · 1,7 · 4,5 · 3,3 %/jour (diagnostic, avertissement déjà connu), Gini à J+15 0,45 · 0,47 · 0,49 · 0,45 · 0,40, jours hors plage du ratio créée / détruite 4 · 2 · 0 · 2 · 4 sur 23, monnaie détruite par la Terraferme 104,9 · 112,0 · 110,0 · 107,8 · 112,3 d par joueur actif et par jour (40 à 44 % des destructions), masse monétaire en fin de saison 898 · 874 · 585 · 903 · 744 ducats. Limite connue : les PNJ du simulateur du commerce ne jouent pas d'escarmouches (elles ne touchent ni la monnaie ni les stocks) ; leur poids dans la Gloire se mesure dans le prototype ci-dessus.

## Commande de bienvenue express (22 octobre 2026, chantier `ftue-1` du plan de finalisation)

Pendant la fenêtre du tutoriel (`tutorial.minutes`, 30 min après l'arrivée), la commande de bienvenue, chargée seule, fait l'aller en 45 s et le retour en 45 s (`tutorial.welcomeTripSeconds`, 0 par défaut, 45 dans le thème de Venise) : la première paie, 150 ducats, tombe dans la première minute au lieu de 27 à 60 min. Chargée avec une autre commande, après la fenêtre ou avec le réglage à 0, elle prend la longueur de sa route. Elle paie toujours à l'arrivée par le grand livre (`city_sale`), et le pas `sell_city` du tutoriel reste lié à `delivery_arrived`.

`pnpm sim`, 5 graines, toutes conformes : croissance de la monnaie par joueur actif 3,2 %/jour en moyenne, 2,6 jours hors plage du ratio monnaie créée / détruite sur 23, Gini du patrimoine à J+15 0,45, 110,0 d détruits par la Terraferme par joueur actif et par jour, première livraison des bots après 0 à 2 h (médiane par graine). Les mêmes valeurs qu'aux escarmouches (3,6 %, 2,4 jours, 0,45, 109,4 d), dans le bruit des graines : les bots livrent leur bienvenue après leur première récolte, le plus souvent hors de la fenêtre du tutoriel, et la bienvenue ne crée de toute façon que 150 ducats une fois par marchand, express ou non. L'effet se mesure sur les vrais nouveaux venus : temps médian entre l'inscription et `sell_city` dans l'entonnoir du tutoriel (`/admin`), cible 5 min au plus.

## Le Signore est un marchand, jamais une maison du PNJ (24 octobre 2026, lot 0 de l'équipe d'experts, E2-1)

`closeTerra` classait les maisons du PNJ comme les marchands. Avec beaucoup de PNJ et peu de monde, une maison de l'ordinateur était Signore presque chaque semaine, et son décret, tiré au hasard (Dîme, Monopole…), prenait des ducats aux marchands. Désormais :
- Le serveur marque les maisons du PNJ dans le moteur : `npc` à l'arrivée, et `markNpc` au chargement pour les maisons plus anciennes. Une commande d'un marchand ne peut pas poser ce drapeau.
- Les maisons du PNJ gardent leur place au classement affiché, mais ne reçoivent ni palier ni Influence. Les paliers se comptent parmi les seuls marchands.
- Le Signore est le premier marchand qui a de la Gloire et tient au moins une case. En semaine d'équipes, c'est le meilleur marchand de l'équipe gagnante. Sinon, il n'y a ni Signore ni décret.
- Une maison du PNJ qui se retire rend ses terres (`terraWithdraw`) : ses cases redeviennent neutres, ses fronts et ceux qui la visent s'arrêtent, ses alliances prennent fin et chaque allié est prévenu.
- Elle ne garde ni ne fait bouger aucune cote Elo.

Mesure : `pnpm --filter @comptoirs/simulator terra --humans 5`, sur 5 graines. Le prototype de la semaine joue 40 marchands simulés, dont 5 tenus pour des personnes (deux assidus, deux réguliers, un occasionnel, tirés par la graine). La même semaine est jouée avant et après : le marquage ne change que la clôture.

| Graine | Signore PNJ avant | après | Influence de la Terraferme des 5 marchands, avant → après |
| --- | --- | --- | --- |
| 1 | oui | non | 36 → 60 |
| 2 | oui | non | 16 → 60 |
| 3 | oui | non | 20 → 60 |
| 4 | oui | non | 26 → 60 |
| 5 | oui | non | 26 → 60 |

Un Signore PNJ 5 semaines sur 5 avant, 0 sur 5 après. Les 5 marchands reçoivent 60 Influence par semaine (20 + 12 + 12 + 8 + 8) au lieu de 24,8 en moyenne, soit environ +7 chacun. L'écart se réduit quand le nombre de marchands grandit : à 40 marchands, il est nul. `pnpm sim` (commerce) ne change pas : ses marchands simulés ne sont pas marqués comme PNJ.

## Les missions de la Maison ne parlent plus de l'ancienne Campagne (24 octobre 2026, lot 0, E2-3)

Cinq missions du tableau de Venise attendaient des événements que seule l'ancienne Campagne envoyait : `levy_collected`, `march_sent`, `assault_won`, `land_defended` et `work_built`. Or la Campagne est éteinte depuis que la Terraferme est en service. En moyenne, 2,9 missions par tableau ne pouvaient donc pas être faites : 9,4 Influence perdues sur 31,8 espérées.

Ces cinq missions sont remplacées par celles de la Terraferme prévues par docs/plan-terraferme.md, toutes du groupe `terra` :

| Mission | Événement | Nombre | Influence |
| --- | --- | --- | --- |
| Poser son comptoir | `terra_placed` | 1 | 2 |
| Prendre des cases | `terra_cells_taken`, somme de `count` | 15 | 3 |
| Prendre une ville | `terra_cells_taken`, somme de `cities` | 1 | 4 |
| Bâtir une Rocca | `terra_built`, `kind: rocca` | 1 | 3 |
| Envoyer des troupes à un allié | `terra_troops_sent` | 1 | 3 |

- **Deux nouveaux événements.** `terra_cells_taken` est un seul événement par marchand et par avance de la carte, avec le nombre de cases prises et le nombre de villes, et non un événement par case. `terra_troops_sent` est adressé à l'émetteur, à côté de `terra_troops_received`.
- **Une mission peut maintenant additionner un champ de l'événement (`sum`)** au lieu de compter un par événement.
- **Le tirage tient `groupMax`.** Au plus 2 missions de la Terraferme par tableau : un pur marchand en garde toujours 8 de commerce sur 10.
- **L'espérance reste celle d'avant**, environ 31 Influence par tableau, mais tout est faisable désormais.
- **Un test de réglages vérifie que chaque événement du tableau de Venise est bien émis** par le moteur, en dehors de la Campagne.

`pnpm sim` ne change pas : les marchands simulés ne réclament pas l'Influence.

`pnpm sim` relancé après tout le lot 0 (Signore, missions, compte par boîte mail, affichage) : 5 graines, **toutes conformes** (PASS). La croissance de la monnaie par joueur actif reste dans le diagnostic déjà connu (1,5 à 4,1 %/jour en moyenne), le Gini à J+15 entre 0,46 et 0,49, et 3 à 4 jours hors plage du ratio créée / détruite sur 23 : les valeurs d'avant, aux variations de graine près. Le lot 0 ne touche pas à l'économie simulée.

## Les villes passent commande de jour (25 octobre 2026, lot 1, E1-1)

Les vagues du tableau commun s'ouvraient toutes les 4 heures depuis le début du jour de jeu, donc à 0 h et à 4 h. Un tiers des commandes se prenait la nuit, alors que le jeu promet de dormir de 22 h à 8 h. Désormais (`deliveries.waves`) :

- **Vagues aux heures de Paris.** Elles s'ouvrent à 8, 11, 14, 17 et 20 h du jour calendaire de Paris (`hours`), quel que soit le changement d'heure. Chaque commande reste ouverte 8 h, et le nombre de commandes du jour ne change pas.
- **Les vagues du soir durent jusqu'au lendemain 10 h** (`carryUntilHour`). Ce sont celles qui iraient dans la nuit, à 17 h et 20 h. Elles passent sur le tableau du jour suivant sous leur identifiant.
- **Personne ne prend une commande du tableau entre 22 h et 8 h** (`closedHours`, erreur `board_closed`). Les commandes personnelles (Doge, bienvenue) ne sont pas touchées.
- **Les urgentes s'ouvrent avant 19 h** (`urgentHours.to: 19`) : elles ferment donc avant 22 h.

Pourquoi le report est obligatoire : le prototype de l'expert a montré que supprimer seulement les vagues de nuit pénalise l'occasionnel. Les PNJ, eux, ne jouent pas la nuit et retrouvaient ces commandes le matin. Le report rend cette réserve du matin, et la fermeture de nuit empêche qu'on la vide.

Mesure : `pnpm sim`, 5 graines, avant et après, avec le nouvel indicateur « prises d'un occasionnel / d'un assidu ». C'est la médiane des commandes du tableau prises dans la saison. Une commande reportée y compte une fois.

| Graine | Monnaie payée (d / actif / jour) avant → après | Prises dans l'heure | Occasionnel / assidu | Assidus devant occasionnels (ventes nettes) |
| --- | --- | --- | --- | --- |
| 1 | 213,2 → 220,1 | 27 % → 42 % | 0,42 → 0,38 | 274 % → 154 % |
| 2 | 214,8 → 219,2 | 28 % → 43 % | 0,44 → 0,44 | 62 % → 311 % |
| 3 | 215,9 → 221,4 | 28 % → 44 % | 0,46 → — | 156 % → — |
| 4 | 211,1 → 216,7 | 27 % → 43 % | 0,44 → 0,62 | 93 % → 41 % |
| 5 | 209,1 → 212,8 | 28 % → 43 % | 0,54 → 0,41 | 145 % → 126 % |

Toutes les graines sont conformes (PASS), avant comme après. Les critères de l'expert sont tenus :
- **Monnaie payée** : +2,5 % (dans les ±5 % demandés).
- **Rapport occasionnel / assidu** : au moins 0,38 sur chaque graine (≥ 0,37 demandé) ; médiane 0,43 contre 0,44 avant.
- **Avance des assidus** : médiane 140 % contre 145 % avant (≤ 145 % demandé).

Sur la graine 3, les deux seuls occasionnels encore actifs en fin de saison sont des retardataires, que le rapport écarte, d'où « — ». Le nombre d'occasionnels actifs au dernier jour reste du même ordre : 20 avant, 17 après, sur les 5 graines.

Les commandes partent plus vite après l'ouverture (42 % dans l'heure contre 27 %), puisque les vagues tombent toutes pendant les heures de jeu.

## Le lot 1 de l'équipe d'experts, tout ensemble (25 octobre 2026)

Le lot comprend :
- la coupure des prêts et des entrepôts (E1-5) ;
- les vagues de jour (E1-1) ;
- la mission `first_upgrade` ouverte dès le premier jour (E3-3) ;
- le reste du lot, qui ne touche pas à l'économie simulée : vitrine, entonnoir, notifications, guide, avant-jeu.

`pnpm sim`, 5 graines, **toutes conformes** (PASS) :

| Graine | Monnaie payée (d / actif / jour) | Gini du patrimoine à J+15 | Croissance de la monnaie | Occasionnel / assidu | Influence médiane dans la saison |
| --- | --- | --- | --- | --- | --- |
| 1 | 220,1 | 0,47 | 2,8 %/jour | 0,38 | 162 |
| 2 | 219,2 | 0,52 | 1,9 %/jour | 0,44 | 163 |
| 3 | 221,4 | 0,50 | 5,1 %/jour | — | 162 |
| 4 | 216,7 | 0,42 | 4,4 %/jour | 0,62 | 153,5 |
| 5 | 212,8 | 0,46 | 3,0 %/jour | 0,41 | 149,5 |

- **La croissance de la monnaie** reste l'avertissement déjà connu (diagnostic).
- **L'Influence** reste celle d'avant (médiane 149 à 163 sur les 5 graines, contre 160 avant le lot) : avancer `first_upgrade` au premier jour ne change rien de mesurable, les marchands simulés améliorant leurs ateliers dès les premiers jours.

## Des maisons du PNJ qui sont de vrais alliés (25 octobre 2026, lot 2, E2-4)

Sur la Terraferme, une maison de l'ordinateur :
- **propose l'alliance d'abord à un marchand voisin** qui n'a pas encore d'allié PNJ, ensuite seulement à une autre maison ;
- **refuse la demande d'un marchand qui a déjà un allié PNJ**, si bien qu'un marchand a au plus un allié PNJ ;
- **secourt un allié qui a appelé à l'aide** (signal de moins de 2 h) et qu'un front vise : elle lui envoie un quart de ses troupes, dans la limite de la part de dons du jour ;
- **riposte contre l'agresseur quand c'est son voisin**, avec un front à 30 % de ses troupes, et signale la case visée aux alliés ;
- **ne donne jamais de ducats** : un test vérifie que le jeu des maisons n'utilise pas `terraGift`.

Le pilote du serveur fait jouer la maison 5 minutes après l'appel d'un allié, donc bien avant les 30 minutes demandées.

Deux points de la proposition ne sont pas faits :
- **Remercier après un don** : l'événement du don n'est pas dans l'état que lit la maison.
- **La trahison de l'« opportuniste »** : aucune maison ne rompt une alliance aujourd'hui, et ce comportement est gardé tel quel.

**La mesure demandée n'est pas faisable dans le simulateur.** Elle comparait les cases médianes des humains alliés à un PNJ et des humains non alliés, avec un écart de +30 % au plus et 2 éliminés par semaine au plus. Mais les marchands simulés de `pnpm sim` ne sont pas marqués PNJ et ne lancent jamais d'appel à l'aide, donc le secours et la riposte ne s'y déclenchent pas, et la règle « un allié PNJ au plus » ne s'y applique pas. `pnpm sim` ne change donc pas. Il faudra suivre en bêta les éliminés par semaine et les cases des marchands alliés à une maison.

## La Condotta (25 octobre 2026, lot 2, E2-5)

Une partie coopérative de 8 minutes, à 60 fois la vitesse. De 1 à 4 marchands alliés se posent au centre. Trois nations (sur les quatre du catalogue) et Milan partent des bords. Pour gagner, il faut tenir Padoue et 35 % des terres à la fin.

**Le terrain.** Les 12 niveaux se jouent sur le même terrain : même carte et mêmes nations. Seules les troupes des nations montent, de 15 % par niveau. Les troupes de Milan et de chaque nation valent `nationTroops` = 60 au niveau 1, soit 60 × (1 + 0,15 × (niveau − 1)).

**Le niveau d'un groupe.** Un groupe joue au niveau le plus haut ouvert à tous ses membres. Une victoire ouvre le niveau suivant.

**Ce qui a été écarté, et pourquoi.**
- Avec un terrain et des nations tirés à chaque partie, l'écart entre graines (±10 points de terres) dépassait l'effet d'un niveau (environ 4 points). La difficulté ne suivait plus le niveau.
- Avec les troupes propres des nations (Empire 150, Aquilée 80), le tirage décidait de l'issue.

**Mesure** : `pnpm --filter @comptoirs/simulator condotta`. L'ordinateur joue chaque marchand. Une graine représente un style de joueur : la part de troupes qu'il envoie par front, de 40 % à 60 %. Chaque case du tableau donne le nombre de victoires sur 5, puis la part médiane des terres.

| Marchands | N1 | N4 | N6 | N7 | N8 | N9 | N10 | N12 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 5/5 (79 %) | 5/5 (62 %) | 5/5 (50 %) | 4/5 (45 %) | 4/5 (44 %) | 3/5 (36 %) | 1/5 (32 %) | 1/5 (26 %) |
| 2 | 5/5 (98 %) | 5/5 (98 %) | 5/5 (98 %) | 5/5 (96 %) | 5/5 (94 %) | 5/5 (95 %) | 5/5 (95 %) | 5/5 (91 %) |
| 3 | 5/5 (98 %) | 5/5 (93 %) | 5/5 (98 %) | 5/5 (98 %) | 5/5 (95 %) | 5/5 (91 %) | 5/5 (82 %) | 5/5 (93 %) |

**Le critère demandé est tenu en médiane, pas sur chaque graine.** Le critère : un joueur seul gagne au niveau 8 et perd au niveau 10, sur 5 graines.
- **En médiane :** le joueur seul gagne le niveau 8 (44 % des terres) et perd le niveau 10 (32 %).
- **Graine par graine :** au niveau 8, 4 styles sur 5 gagnent ; au niveau 10, 1 style sur 5 gagne encore.
- **La limite :** l'ordinateur ne joue pas comme un humain. Il vise d'abord Padoue, puis la terre la moins chère. Ses choix dispersent les résultats d'un niveau à l'autre plus qu'un joueur régulier ne le ferait.

**Les groupes.** À 2 ou 3, les niveaux 9 à 12 restent largement gagnés (82 à 95 % des terres). L'attrait du groupe est donc là, mais les derniers niveaux sont probablement trop faciles à plusieurs.

**En bêta.** La télémétrie `condotta_played` (niveau, victoire, part des terres, nombre de joueurs) servira à recaler `nationTroops`, et peut-être à durcir les nations par joueur supplémentaire. Cela se fera par une décision du porteur, au changement de mois.

**Le plafond de récompense.** Un test serveur le vérifie : une victoire ne crée aucune écriture au grand livre, ne change ni la caisse ni la Gloire. Elle donne le niveau suivant, un grade cosmétique (de *Condottiere di ventura* à *Capitano generale*) et l'événement `condotta_won`.

**Hors du tableau des missions.** Aucune mission `condotta_won` n'est ajoutée au tableau de Venise : en ajouter une changerait le tirage des missions et l'Influence. La question revient au paquet de règles, validé par `pnpm sim`.

## Les rations au lot (25 octobre 2026, lot 2, E1-4)

Les ouvriers mangent quand ils travaillent, plus à la journée. Chaque lot lancé coûte, par niveau de l'atelier :
- **un demi-pain** dans un atelier qui transforme (moulin, four, scierie…) ;
- **un quart de pain** pour une matière première (ferme, carrière, bûcheron…).

Le pain se prend en entiers, au lancement, par `stock_movements` (raison `rations`). Le reste, en quarts, est gardé sur l'atelier (`rationDebt`) et compté au lancement suivant.

Le jeu ne bloque jamais. Sans pain, une nouvelle file part ralentie de moitié (`slowdownBps` 5 000), et le pain manquant n'est pas dû. Le lot rapide du tutoriel ne coûte rien. La ration à la journée (`perLevelPerDay`) passe à 0.

Réglage : `rations.perBatchQuarters` = `{ transform: 2, raw: 1 }` (les coefficients de la proposition, divisés par deux par le chef).

**Mesure** : `pnpm sim` sur 5 graines, les 5 conformes.

| Indicateur | Cible | Avant | Après |
| --- | --- | --- | --- |
| Pain au Rialto en fin de mois (% de la référence) | ≥ 75 % | 52–53 % | 76–83 % |
| Matières premières en fin de mois (blé, argile, bois) | ≥ 65 % | 50–71 % | 79–128 % |
| Ventes nettes de la Vénétie / autres régions (médianes) | ≤ 115 % | 74–106 % | 81–114 % sur 4 graines, 138 % sur la graine 5 |
| Monnaie payée par actif et par jour | diagnostic | 209–216 d | 181–184 d |
| Masse monétaire par actif, plafond | ≤ 2,5 × le capital | 0,85–0,93 × | 0,83–0,86 × |

**Lecture.**
- Le pain et les matières ne s'effondrent plus en fin de mois : la consommation suit enfin la production.
- La graine 5 dépasse le plafond de la Vénétie. C'est la lagune qui y est basse (2 421 d de ventes nettes médianes, contre 3 440 à 4 379 sur les autres graines), pas la Vénétie qui monte : elle y fait 4 456 d, comme sur la graine 2. La médiane des 5 graines est 95 %.
- La monnaie payée baisse de 15 % : une part du pain livré hier aux villes nourrit maintenant les ateliers. C'est la nouvelle base pour la cible des fondaci (E1-3), qui visait ±10 % de 213 d.

## Une série clémente (25 octobre 2026, lot 2, E3-10)

Un jour manqué par période de 7 jours ne casse plus la série du coffre. C'est automatique : rien à acheter ni à gagner. Les périodes se comptent depuis le début du monde (jours 0 à 6, 7 à 13…). Deux jours manqués de suite, ou deux dans la même période, cassent la série.

- Réglage : `daily.chest.graceDaysPerWeek` = 1 (0 : l'ancienne règle).
- Le coffre affiche « Série : 4 jours · grâce disponible ».
- Un rappel à 19 h (jusqu'à 21 h), une fois par jour, à qui tient une série d'au moins 3 jours et n'a pas ouvert le coffre du jour. Il compte dans le plafond de 3 notifications par jour d'E3-1. Il n'est envoyé que si la grâce est en place.

**La monnaie.**
- Le coffre vaut 10 d, plus 3 d par jour de série, jusqu'à 22 d.
- Au plus : un marchand qui manque un jour par semaine touchait, sur 6 jours, 10 + 13 + 16 + 19 + 22 + 22 = 102 d. Avec la grâce, il touche 6 × 22 = 132 d. Cela fait +30 d par semaine, soit environ 4 d par jour, ou +2,4 % de la monnaie payée par actif (182 d). Un marchand présent tous les jours ne touche rien de plus.
- Mesuré : `pnpm sim` sur 5 graines, avec E1-4, les 5 conformes. Les marchands simulés encaissent les tâches faites en chemin, et ouvrent donc le coffre certains jours seulement.

| | Coffres sur la saison (5 graines) | Part de la monnaie créée |
| --- | --- | --- |
| Sans la grâce | 2 868 · 3 171 · 3 245 · 3 329 · 3 052 d | 0,82 à 0,95 % |
| Avec la grâce | 2 991 · 3 575 · 3 539 · 3 460 · 3 121 d | 0,87 à 1,02 % |

La monnaie des coffres monte de 6,5 %, soit environ +0,1 % de la monnaie payée. C'est bien en dessous des +2 % redoutés.

## Le paquet de règles du lot 2, tout ensemble (26 octobre 2026 : E1-3, E1-6, E1-7, E2-6)

Mesuré par `pnpm sim` sur 5 graines, toutes conformes, avec les rations au lot (E1-4) et la série clémente (E3-10) déjà en place. Le mutateur du mois (E2-9) n'est pas tiré dans la simulation : chaque mutateur a sa propre mesure, plus bas.

### Les fondaci (E1-3)

Les règles sont celles de la proposition :
- au plus 3 villes, niveaux 1 à 3, 6 niveaux en tout ;
- une commande personnelle de la ville par jour et par niveau, à 95 % du prix du tableau commun ;
- coûts des niveaux : 100 d + 10 briques + 10 planches, puis 250 d + 20 + 20, puis 600 d + 40 + 40 ;
- ducats et matériaux sortent du jeu par le grand livre et le journal des stocks (`fondaco_build`) ;
- le fondaco compte au patrimoine à son coût.

Les entrepôts restent retirés. Une feuille par ville, ouverte depuis la ville sur la carte du commerce.

**Trois réglages essayés.**

| | A : tableau à 2, bots dès le premier jour | B : tableau à 3, bots dès le premier jour | C, retenu : tableau à 3, bots une fois la maison à 5 niveaux |
| --- | --- | --- | --- |
| Niveaux de fondaco par marchand | 3,03–3,14 | 3,05–3,19 | 1,15–2,11 |
| Monnaie payée par actif et par jour (base 182 d avec E1-4) | 162–168 d | 183–189 d | 171–179 d |
| Pain en fin de mois (% de la référence) | 54–70 % | 52–87 % | 68–79 % |
| Matières premières en fin de mois | 60–91 % | 70–120 % | 64–139 % |
| Maîtrises choisies | presque aucune | presque aucune | de nouveau, comme avant |

**Pourquoi C.** En A et B, les bots mettent leurs briques et leurs planches dans les fondaci dès le premier jour, au lieu d'agrandir leurs ateliers. Leur maison n'atteint plus les 5 niveaux d'une maîtrise (« aucune » : 20 à 39 bots par graine), et le revenu ne croît plus. En C, un bot n'ouvre un fondaco qu'une fois sa maison à 5 niveaux. Le tableau commun passe de 4 à **3** commandes par actif, et non à 2 : à 2, la monnaie payée baisse de 10 %, au lieu de monter comme l'estimait la proposition. Le « réglage de sécurité » (passer à 1 au-delà de 3 niveaux en moyenne) suppose une monnaie qui grimpe ; elle ne l'a pas fait.

**Les cibles, avec C.**

| Cible | Valeur | Tenue |
| --- | --- | --- |
| Monnaie payée par actif à ±10 % (de 182 d, la base avec E1-4 ; 213 d avant E1-4) | 171–179 d, soit −2 à −6 % | oui |
| Masse monétaire ≤ 2,5 × le capital | 0,80–0,87 × | oui |
| Lombardie / Installation ≥ 1,20 | 0,97 · 1,03 · 1,02 · 1,07 · 1,08 | **non** |
| Semaine 4 hors Sensa / semaine 3 ≥ 1,10 | non mesuré séparément | — |
| Cours du Veneto en fin de mois ≥ 65 % | blé 64–72 %, pain 68–79 % | presque (blé à 64 % sur la graine 2) |
| Niveaux de fondaco par actif, publiés dans le rapport | 1,15–2,11 | oui (ligne « Fondaci » du rapport) |
| Vénétie ≤ 115 % des autres régions (E1-4) | 97–113 % sur 4 graines, 132 % sur la graine 2 | 4 sur 5 |

**La croissance ne vient pas.** Le revenu de la Lombardie dépasse celui de l'Installation de 0 à 8 %, comme sans les fondaci. Avec 2 niveaux en moyenne, les commandes du fondaco remplacent celles retirées du tableau sans en ajouter. Les gagner demanderait plus de niveaux, donc plus de monnaie : c'est l'arbitrage que la proposition voulait borner. **La décision revient au porteur**, en connaissant ce chiffre : garder ainsi, ouvrir plus de niveaux, ou attendre la bêta pour voir comment les humains investissent.

### Les maîtrises (E1-6)

- **Négociant** : quota de la Dogana × 3 (`marketMakerQuotaBps` 20 000). La Dogana lui rachète au moins 85 % de la référence (`marketMakerFloorBps` 8 500).
- **Roulier** : il voit une commande urgente 20 minutes avant son ouverture, et la prend à l'heure comme tout le monde (`urgentPreviewMinutes` 20). Le serveur ne montre plus à personne une commande pas encore ouverte, sauf celle-là au Roulier.
- Les spéculateurs simulés choisissent Négociant : le plancher est donc simulé. Il ne fait pas dépasser la masse monétaire (0,80–0,87 ×).
- **Écart à profil égal** (cible ≤ 10 %) : 30,8 · 10,9 · 21,4 · 9,0 · 17,9 %, toujours entre Maître d'atelier et Levant, sur des groupes de 2 à 7 bots. La mesure reste trop bruitée pour conclure ; elle se refera chez les humains, dans `/admin`.

### Le Livre de la Maison (E1-7)

- Un tableau de 8 missions par semaine, ouvert le lundi à 0 h (les semaines du classement), dont au plus 2 de la Terraferme.
- Seuils doublés et Influence multipliée par environ 2,5, selon le tableau de la proposition.
- Espérance mesurée sur 10 000 tableaux : **64,2 par semaine** (cible 59,5 à 65,7, contre 62,6 avant). La part du commerce seul est de 50,2.
- Dans la simulation, l'Influence gagnée sur la saison reste entre 128 et 137 par marchand actif (médiane), comme avant.
- Le Livre s'ouvre sur deux pages : « Aujourd'hui » (les tâches du jour et le coffre) et « Cette semaine ».

### L'Arsenal de la semaine (E2-6)

- Une commande par semaine, du lundi au dimanche, à la place de celle des 2 jours.
- Le Bronze vaut 3,5 fois l'ancienne commande : 14 pains, 11 briques et 11 planches par actif.
- L'Argent vaut 1,25 fois le Bronze, l'Or 1,5 fois.
- Jusqu'au Bronze, l'unité est payée +10 %, et la prime de 10 % est versée au Bronze. Au-delà, l'unité est payée +5 %.
- L'Argent apporte un quart de plus aux galères de la Muda la semaine suivante.
- L'Or donne 3 d'Influence à qui en a livré 2 % et au moins une unité après le Bronze.
- Les bots s'arrêtent au Bronze. Un test moteur le vérifie.

Monnaie de la commande sur la saison (livraisons et primes), 5 graines :

| | Avant (commande de 2 jours) | Arsenal |
| --- | --- | --- |
| d | 4 065 · 5 003 · 4 756 · 4 561 · 4 109 | 3 026 · 2 586 · 2 704 · 2 932 · 2 854 |

L'Arsenal crée 0,6 à 0,7 fois la monnaie d'avant, sous le plafond de 1,5 ×. La simulation n'a pas d'humains : l'Argent et l'Or n'y sont jamais atteints, et leur part de monnaie (1,43 × au plus à l'Or, selon la proposition) se mesurera en bêta, dans `/admin`. La galère de l'Arsenal sur la carte et le « Livre d'or » de la gazette ne sont pas faits : c'est du cosmétique, qui peut suivre.

### Le mutateur du mois (E2-9)

Chaque mutateur est joué toute la saison par `pnpm sim --mutator <code>`, sur 5 graines, avec le paquet ci-dessus. Les 15 saisons sont conformes.

| Mutateur | Masse monétaire max | Indice des prix | Monnaie payée par actif et par jour (base 171–179 d) | Galères de la Muda |
| --- | --- | --- | --- | --- |
| `embargo_ottomano` | 0,81–0,87 × | 98–102 | 150–156 d | 108 à 141 % des lots vendus (lots deux fois plus petits, le stock du quai part en entier) |
| `grand_gel` | 0,81–0,86 × | 93–115 | 175–184 d | 90–92 % |
| `guerra_milano` | 0,81–0,87 × | 94–114 | 175–196 d | 87–92 % |

**Lecture.**
- L'embargo est le plus dur : la monnaie payée baisse d'environ 13 %, car les commandes d'exotiques manquent de marchandises.
- Le Grand gel et la Guerre de Milan paient un peu plus les matériaux, à masse monétaire inchangée.
- La simulation ne joue pas la Terraferme : les troupes de Milan de la Guerre de Milan n'y sont pas mesurées.

Les trois restent au catalogue. Le premier tirage vaut pour décembre 2026.

## Vague 1 du plan de rupture : la guerre mange, la Signoria des villes (27-28 octobre 2026, R1 et R2)

Mesuré par `pnpm sim` sur 5 graines, avec R1 (`terraferma.supply`) et R2 (`signoria`) ensemble, les fournisseurs officiels et l'embargo retirés (`docs/plan-rupture.md`).

### Premier essai : 0,1 pain par troupe et par jour ouvert

Les 5 graines sont conformes.

| Mesure | Cible | Graines 1 à 5 |
| --- | --- | --- |
| Monnaie payée, Lombardie / Installation | ≥ 1,20 (0,97 à 1,08 avant) | 1,17 · 1,18 · 1,12 · 1,17 · 1,16 |
| Pain en fin de mois (% de la référence) | ≥ 65 % | 56 · 60 · 57 · 58 · 58 |
| Masse monétaire par actif, plafond | ≤ 2,5 × | 0,91 à 0,95 × |
| Pain mangé par les troupes, par actif et par jour | diagnostic | 5,4 à 5,8 |
| Pain de « Max » et matériaux des bâtiments, par actif et par jour | diagnostic | pain 2,8 à 3,3 ; briques 2,4 à 2,7 |
| Podestà nommés par ville et par semaine | ≥ 1 | 1,9 à 6,3 |
| Marchands qui ont tenu une ville dans la saison | diagnostic | 40 à 47 |

**Lecture.**
- La croissance du mois revient : la semaine III rapporte 12 à 18 % de plus que la semaine I, contre 0 à 8 % avec les seuls fondaci. La cible de 1,20 n'est pas tout à fait atteinte.
- Le pain reste sous 65 % en fin de mois : la Terraferme n'en mange pas encore assez pour absorber ce que les boulangers produisent.
- La Signoria tourne vite : une ville change de Podestà de 2 à 6 fois par semaine chez les PNJ, qui livrent partout sans viser une ville. À revoir avec des humains (`/admin`) : si le titre change chaque jour, garder plus de points d'un jour à l'autre (`decayBps`).

### Second essai : 0,2 pain par troupe et par jour ouvert (écarté)

Les 5 graines sont conformes, mais l'essai n'est pas retenu.

| Mesure | 0,1 pain (retenu) | 0,2 pain |
| --- | --- | --- |
| Monnaie payée, Lombardie / Installation | 1,12 à 1,18 | 1,14 à 1,21 |
| Pain en fin de mois | 56 à 60 % | 54 à 58 % |
| Briques et planches en fin de mois | 65 à 95 % | 56 à 64 % |
| Masse monétaire par actif, plafond | 0,91 à 0,95 × | 0,92 à 1,01 × |
| Assidus devant occasionnels (ventes nettes médianes) | 112 à 322 % | 314 à 585 % |

**Lecture.**
- Doubler le pain des troupes ne relève pas le pain : les maisons qui font la guerre dépensent leurs ducats en pain au lieu d'acheter des matériaux, et briques et planches s'effondrent.
- L'écart entre assidus et occasionnels explose : l'occasionnel, qui ne vient pas nourrir ses troupes, cesse de recruter et décroche.
- **Décision : 0,1 pain par troupe et par jour.** Le pain sous 65 % en fin de mois vient d'une surproduction des boulangers, pas d'un manque de guerre ; la croissance du mois (cible 1,20) est à reprendre avec la vague 2 (la Sera, qui concentre la demande), ou par un réglage des villes, sur décision du porteur.

## Vague 2 du plan de rupture : le Lustre et la Sera (28 octobre 2026, R6 et R11)

Mesuré par `pnpm sim` sur 5 graines, avec la vague 1, l'incanto (`incanto`), les PNJ qui enchérissent, la bataille de 20 h à 20 h 30, les appels d'offres retirés et le quai sans hausse. Le Lustre ne touche pas à l'économie : rien à calibrer au simulateur (il vit sur le serveur).

### Premier essai : la moitié de chaque arrivée aux enchères

Les 5 graines sont conformes.

| Mesure | Cible | Graines 1 à 5 |
| --- | --- | --- |
| Monnaie payée, Lombardie / Installation | ≥ 1,20 | 1,18 · 1,17 · 1,15 · 1,18 · 1,11 |
| Pain en fin de mois | ≥ 65 % | 54 · 60 · 57 · 56 · 58 |
| Masse monétaire par actif, plafond | ≤ 2,5 × | 0,91 à 0,96 × |
| Assidus devant occasionnels (ventes nettes médianes) | diagnostic | 138 à 254 % |
| Incanto : lots vendus sur 30 | diagnostic | 3 · 3 · 5 · 5 · 4 |
| Incanto : prix payé / référence | diagnostic | 69 à 100 % |

**Lecture.**
- L'incanto vend peu : un lot vaut environ 300 ducats (la moitié d'une arrivée pour 40 marchands, en trois lots), plus d'une journée de revenu, et les PNJ n'enchérissent qu'avec trois fois leur maximum en caisse. Les lots invendus retournent au quai : les marchandises entrent quand même dans l'économie.
- La croissance du mois et le pain ne bougent pas par rapport à la vague 1 : la Sera concentre la demande des humains, que la simulation ne joue pas.

### Second essai, retenu : 30 % de chaque arrivée, des PNJ qui enchérissent avec 1,5 fois leur maximum en caisse

Les 5 graines sont conformes.

| Mesure | Graines 1 à 5 |
| --- | --- |
| Incanto : lots vendus sur 30 | 30 partout |
| Incanto : prix payé / référence | 97 · 97 · 96 · 92 · 96 % |
| Incanto : gagnants distincts | 18 · 15 · 19 · 17 · 15 |
| Incanto : ducats détruits sur la saison | 13 177 à 14 367 |
| Monnaie payée, Lombardie / Installation | 1,17 · 1,17 · 1,16 · 1,18 · 1,20 |
| Pain en fin de mois | 55 · 56 · 58 · 58 · 59 % |
| Masse monétaire par actif, plafond | 0,90 à 0,95 × |
| Assidus devant occasionnels (ventes nettes médianes) | 101 à 365 % |

**Lecture.**
- Chaque lot trouve preneur, près de sa référence, et les lots se répartissent entre 15 à 19 marchands : l'enchère vit sans qu'un seul la rafle.
- L'incanto devient un puits de monnaie notable (environ 13 500 ducats par saison), sans que la masse monétaire sorte de sa cible.
- La croissance du mois (1,16 à 1,20) et le pain (55 à 59 %) restent proches de la vague 1 : ces deux cibles attendent la mesure de vrais joueurs, à la Sera.
- L'avance des assidus varie beaucoup d'une graine à l'autre (101 à 365 %) : diagnostic à suivre dans `/admin`.

## Vague 3 du plan de rupture : les Atouts et la Lettre du jour (28 octobre 2026, R3 et R10)

Mesuré par `pnpm sim` sur 5 graines, avec les vagues 1 et 2, les Atouts (`atouts`, 16 au catalogue de Venise, choisis par les PNJ selon leur profil) et la Lettre (`letters`, plafond 10 000 deniers par marchand et par saison, réponses des PNJ tirées par `draw`). Les 5 graines sont conformes.

| Mesure | Cible | Graines 1 à 5 |
| --- | --- | --- |
| Monnaie payée, Lombardie / Installation | ≥ 1,20 | 1,16 · 1,14 · 1,16 · 1,18 · 1,19 |
| Pain en fin de mois | ≥ 65 % | 55 · 57 · 57 · 58 · 56 |
| Masse monétaire par actif, plafond | ≤ 2,5 × | 0,90 à 1,10 × |
| Assidus devant occasionnels (ventes nettes médianes) | diagnostic | 189 à 584 % |
| Incanto : lots vendus sur 30, gagnants distincts | diagnostic | 30 partout · 20, 17, 18, 16, 18 |
| Lettre : ducats donnés au plus / en moyenne | ≤ 100 | 100 / 43 · 100 / 48 · 100 / 47 · 100 / 50 · 100 / 44 |
| Lettre : lettres répondues par marchand (moyenne) | diagnostic | 21,6 · 23,0 · 22,7 · 24,6 · 22,4 |
| Lettre : fins du mois | toutes atteintes | les deux rives, le Sénat, le palais, le peuple, Faraj, les Dix, la plus simple : chacune au moins une fois sur les 5 graines |
| Atouts : le plus pris, part des marchands | ≤ 25 % (diversité) | 45 · 53 · 53 · 55 · 50 % (`levantino`) |

**Lecture.**
- La Lettre reste un petit à-côté : 43 à 50 ducats en moyenne sur le mois (la moitié du plafond), moins d'une demi-journée de revenu ; les plus chanceux touchent le plafond. La masse monétaire reste dans sa cible.
- Les Atouts ne déplacent ni la croissance du mois ni le pain. Leur diversité sort de la cible chez les PNJ : le Levantin (`levantino`) plaît à trois profils sur cinq. C'est un biais des goûts des PNJ (`bots.ts`, `chooseAtout`), pas une mesure des joueurs : à suivre dans `/admin` avec de vrais choix, avant de toucher au catalogue.
- La croissance du mois (1,14 à 1,19) et le pain (55 à 58 %) restent sous leur cible, comme après les vagues 1 et 2.


## Vague 4 du plan de rupture : la Dynastie, le Doge, le Grand Canal (28 octobre 2026, R4, R5, R7)

Mesuré par `pnpm sim` sur 5 graines, avec les vagues 1 à 3, le décret du Signore retiré à Venise (`terraferma.close.decrees` vide), puis avec chacun des quatre décrets du Doge tenu tout le mois (`pnpm sim --decree <code>[:cible]`). La Dynastie et le Grand Canal ne touchent pas à l'économie (un trait n'est qu'une option ou une information, les PNJ n'en reçoivent pas ; le Canal est une vitrine) ; l'élection non plus (les PNJ ne votent ni ne se présentent). Les 25 saisons sont conformes.

| Mesure | Sans décret | `faveur:venezia` (+10 %) | `franchigia` (−1 pt) | `levante` (+25 %) | `calmiere:bread` (110 %) |
| --- | --- | --- | --- | --- | --- |
| Monnaie payée par actif et par jour, graines 1 à 5 | 205,1 · 207,5 · 207,7 · 207,5 · 202,5 | 206,2 · 207,2 · 206,6 · 206,0 · 201,8 | 206,5 · 208,8 · 206,6 · 207,2 · 205,6 | 205,6 · 211,0 · 206,1 · 203,6 · 201,4 | 205,2 · 210,1 · 206,4 · 207,1 · 198,1 |
| Moyenne, écart à « sans décret » | 206,1 | 205,6 (−0,2 %) | 206,9 (+0,4 %) | 205,5 (−0,3 %) | 205,4 (−0,3 %) |
| Masse monétaire par actif, plafond | 0,93 à 0,96 × | 0,92 à 1,45 × | 0,91 à 0,96 × | 0,91 à 0,95 × | 0,91 à 0,96 × |
| Pain en fin de mois | 54 · 57 · 57 · 54 · 58 % | 56 · 54 · 57 · 56 · 58 % | 56 · 56 · 54 · 54 · 58 % | 54 · 56 · 58 · 54 · 54 % | 56 · 57 · 58 · 55 · 76 % |

Sans décret, Lombardie / Installation : 1,14 · 1,18 · 1,18 · 1,15 · 1,11.

**Lecture.**
- Chaque décret du Doge reste sous la cible de la vague (écart des ventes payées ≤ 10 %) : moins d'un demi-point en moyenne. Un décret change *où* l'on gagne (une ville, la Dogana, le prix d'une marchandise), presque pas *combien* : c'est ce que le programme d'un candidat doit faire, un choix de saison sans renverser l'équité du mois.
- La faveur d'une ville fait monter la masse monétaire d'une graine (1,45 ×, graine 5), toujours loin du plafond de 2,5 × : à suivre si un Doge la choisit souvent.
- Le calmiere du pain relève le pain en fin de mois sur une graine (76 %) : en plafonnant les offres, il empêche les ventes bradées de fin de mois. Effet voulu, mesuré.
- Retirer le décret du Signore ne déplace ni la croissance du mois (1,11 à 1,18) ni le pain (54 à 58 %), toujours sous leur cible comme après les vagues 1 à 3.

## Vague 5 du plan de rupture : le Broglio et les parts de Maison (28 octobre 2026, R8 et R9)

Mesuré par `pnpm sim` sur 5 graines, avec les vagues 1 à 4. Nouveau dans l'économie : le lot de la Muda varie de 80 à 120 % (`muda.lotSpreadBps: 2000`, tiré du secret du monde), les rumeurs vendues (`rumour_sale`, d'un marchand à l'autre, hors ventes nettes), l'espion (`spy_hire`, `spy_chase` : détruits), les parts de Maison (`share_trade` d'un marchand à l'autre, `share_tax` détruite, `share_dividend` à somme nulle au classement, `share_settle` le dernier jour). Au simulateur, les PNJ spéculateurs offrent leur rumeur la plus sûre (5 ducats) et cotent leur Maison (10 à 30 parts au prix de leurs ventes nettes / 200) ; les autres achètent une rumeur sûre un jour sur quatre et 5 parts d'une Maison rentable. En monde vivant, les Maisons de l'ordinateur ne cotent ni n'achètent de parts. Les 5 graines sont conformes.

| Mesure | Graines 1 à 5 |
| --- | --- |
| Monnaie payée par actif et par jour | 203,9 · 208,3 · 203,5 · 207,2 · 200,9 (moyenne 204,8 ; 206,1 à la vague 4) |
| Masse monétaire par actif, plafond | 0,93 à 0,95 × |
| Lombardie / Installation | 1,12 · 1,19 · 1,19 · 1,16 · 1,12 |
| Pain en fin de mois | 56 · 56 · 57 · 54 · 58 % |
| Muda : part du lot vendue | 89,4 · 92,0 · 92,5 · 82,6 · 82,9 % (cible 50 à 100 %) |
| Broglio : rumeurs achetées par marchand et par jour | 0,44 · 0,50 · 0,43 · 0,48 · 0,42 |
| Parts : Maisons cotées · dividendes versés | 5 · 343 d ; 5 · 395 d ; 5 · 310 d ; 5 · 250 d ; 3 · 9 d |
| Parts dehors à la clôture · caisses négatives | 0 · 0 sur chaque graine |
| Assidus / occasionnels, patrimoine médian | 129,6 · 114,8 · 120,6 · 131,4 · 96,7 % |
| Assidus / occasionnels, ventes nettes médianes | 169,2 · 225,9 · 156,6 · 117,0 · 142,6 % |

**Lecture.**
- Le Broglio ne crée pas de monnaie : une rumeur passe d'une caisse à l'autre, l'espion détruit. Le flux reste faible chez les PNJ (moins d'une rumeur achetée tous les deux jours par marchand) ; c'est un jeu entre humains, à mesurer avec eux.
- Le lot variable de la Muda ne change pas sa vente (83 à 93 %, dans la cible). Corrigé après la mesure : la variation s'applique au lot habituel arrondi, et jamais un lot d'au moins une unité ne tombe à zéro (une épice pour un seul actif, tirée à 80 %, n'apportait rien) ; à 40 actifs ou plus, la différence est d'une unité au plus.
- Les parts de Maison ne déplacent ni la monnaie payée (−0,6 % en moyenne, dans le bruit des graines) ni la masse monétaire. Les dividendes restent petits (jusqu'à 400 ducats pour toute une saison) : 30 % d'un gain de semaine, au prorata de parts surtout gardées par le fondateur. Le rachat du dernier jour est toujours payé en entier (aucune Maison à court), et le test du moteur montre qu'il ne dépasse jamais la caisse.
- Sur la graine 5, les assidus finissent derrière les occasionnels en patrimoine médian (96,7 %) mais devant en ventes nettes (142,6 %), qui font le classement : diagnostic à suivre (l'avance des assidus varie beaucoup d'une graine à l'autre depuis la vague 1).
- Restent sous leur cible, comme après les vagues 1 à 4 : la croissance du mois (1,12 à 1,19 pour 1,20) et le pain (54 à 58 % pour 65 %).

## Empire persistant (CADRAGE-v3) : le simulateur de 24 mois

*30 octobre 2026. Réglages : `packages/engine/src/themes/venice1450.empire.ts` (règles du jeu) et `apps/simulator/src/empire/defaults.ts` (paramètres du modèle : rythmes de production, habitudes des bots, véhicules). Rapport complet : `docs/refonte-2026-10-29/simulation-24-mois.md`.*

### Méthode

`pnpm --filter @comptoirs/simulator empire` ne fait pas tourner le moteur complet. C'est un **simulateur de modèle**, au pas d'une heure sur 24 mois, qui fait vivre les formules de `packages/engine/src/empire`. Ces formules sont testées et serviront telles quelles au socle :
- courbes, salaires, Puissance, rattrapage ;
- prix régionaux, retard des nouvelles ;
- modules, gisements, colleganza, expéditions, corsaires.

Le monde :
- quatre cohortes de 200 Maisons, arrivées aux mois 0, 3, 6 et 12 ;
- quatre profils d'activité (assidu, médian, occasionnel, absent par trous de 3 à 14 jours) ;
- quatre penchants (négociant, exploitant, armateur, mixte).

Chaque jour, on vérifie que la monnaie des Maisons est égale à « créé − détruit » : aucune violation sur les trois graines. Une graine prend environ 6 minutes.

### Résultat (graines 1, 2 et 3)

| Cible (CADRAGE-v3 § 13) | Visée | Résultat | |
| --- | --- | --- | --- |
| Calendrier de la Casa | Entre la moitié et le double du § 3.1 | Tous les paliers dans les bornes ; Casa 10 vers le jour 80, Casa 20 vers le jour 380–440 | ✓ |
| Rattrapage des cohortes tardives | 20 à 40 % plus vite jusqu'à la Casa 10 | 12 à 20 % | ≈ |
| Objectif à moins de 24 h | ≥ 90 % des tournées | 96–97 % | ✓ |
| Prochain palier de Casa | 2 à 7 jours de revenu chaque mois | 4 à 7 jusqu'au mois 18, puis jusqu'à 10–11 | ≈ |
| Nouveau à la Puissance médiane | En 4 à 6 mois | Jamais en 12 mois | ✗ |
| Indice des prix | 80 à 130 | 84 à 101 | ✓ |
| Puits ÷ sources | 0,6–0,8 (moins de 3 mois), 0,9–1,0 (au-delà) | 0,84 puis 0,97 | ≈ |
| Part de la Terraferme | ≤ 15 % | 0,1 % | ✓ |
| Bruts des vétérans achetés aux jeunes | ≥ 30 % | 2 % | ✗ |
| Arbitrage | Marge > 0, commandes ≥ 25 % des recettes | Environ 5 500 d par voyage, commandes 36–37 % | ✓ |
| Chaque métier fait vivre son penchant | ≥ 25 % chacun | Voyages 42–47 %, gisements 24–26 %, expéditions 48–49 % | ✓ (une graine à 24,1 %) |

Revenu médian de la première cohorte (ducats par jour, sur 30 jours glissants) :

| | J1 | S1 | M1 | M3 | M6 | A1 | A1,5 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Cible | 150 | 300 | 600 | 1 500 | 3 500 | 8 000 | 12 000 |
| Obtenu | 132 | 231 | 478 | 2 700 | 5 000 | 6 800 | 7 500 |

### Ce que le simulateur a appris

1. **Les chiffres du v3 n'étaient pas cohérents entre eux.** Si chaque palier coûte 2 à 7 jours de revenu et que rien d'autre ne freine, les vingt paliers se font en quatre à cinq mois, pas en deux ans et demi. Le calibrage ajoute donc l'**exigence d'ateliers** : la Casa n demande n − 3 ateliers au niveau n − 1, à partir de la Casa 9, douze au plus. C'est le niveau maître d'Hades' Star. Ce changement de règle est reporté dans le v3, § 3.1.
2. **Les marchandises doivent avoir un lieu.** Tant qu'une Maison vendait son stock dans toutes ses régions, le négoce et les voyages ne servaient à rien. Désormais :
   - un bien se vend, ou se livre aux commandes, là où la Maison le fabrique, et à Venise ;
   - ailleurs, il faut un voyage, qui livre d'abord les commandes du port.

   Cette règle est à garder pour le socle.
3. **Les trois métiers ne vivent que si l'on vend loin.** Les grands marchés étrangers (Bruges, Alexandrie) ont une profondeur à la mesure du monde : 200 unités par jour et par bien, plus 1,5 par Maison active.
   - Les gisements naissent au prorata des Maisons présentes, un pour dix par jour, et les biens chers y sont plus fréquents.
   - Le butin d'une expédition gagnée vaut 250 ducats × palier².
4. **Les ventes à la Dogana doivent rester petites** : 20 unités par jour et par bien, plus 3 par Maison présente dans la région. Sinon elles impriment de la monnaie et passent devant les commandes des villes, qui doivent rester la première source (≈ 37 % ici, voyages compris).
5. **Les bots qui produisent sans débouché se ruinent.** Ils achètent des intrants pour des biens que personne ne demande. Le socle devra montrer au joueur ce qui se vend, et où.

### Les points ouverts, au porteur

*Arbitrés le 30 octobre 2026 :*
- *le nouveau se mesure contre la médiane de **sa bande** ;*
- *les **recettes de haut niveau** demandent des bruts de Vénétie en quantité ;*
- *les **places de la Muda** se gagnent cher à l'incanto, et les cargaisons de luxe valent des semaines de revenu.*

*Le détail suit, tel qu'il a été posé.*

- **Le nouveau à la Puissance médiane en 4 à 6 mois** n'est pas atteignable avec ce calendrier. À 18 mois, la plupart des Maisons anciennes sont à la Casa 20 : la médiane du monde est le sommet. Deux voies :
  - mesurer le nouveau contre la médiane de sa bande ;
  - prolonger le sommet (Maestria, Grandes Œuvres) pour que la Puissance des anciens ne plafonne pas.
- **Le vétéran acheteur des bruts des jeunes** n'émerge pas : 2 % pour 30 % visés. Les grandes Maisons produisent leurs propres bruts. Il faudrait un levier de conception, par exemple des recettes de haut niveau qui demandent des bruts de Vénétie en quantité, ou des commandes de bruts que les vétérans passent aux jeunes.
- **La colleganza ne se déclenche presque jamais.** Quand les voyages longs commencent (Casa 11 et plus), les Maisons ont déjà 200 000 à 500 000 ducats en caisse, et une cargaison coûte bien moins que cela. Pour que la colleganza vive, une cargaison longue doit coûter cher devant la trésorerie : galères de la Muda dont les places se gagnent à l'incanto, cargaisons de luxe.
- **Les puits des jeunes Maisons** (0,84 contre 0,6–0,8 visé) : les bots réinvestissent presque tout. Ce n'est pas un risque d'inflation, plutôt l'inverse. La cible est peut-être à revoir.
- **Le revenu au-delà de 18 mois** reste sous la cible (7 500 contre 12 000 à 20 000 ducats par jour) et les derniers paliers coûtent jusqu'à 10 jours. Il faudra le reprendre avec le contenu de fin de partie : Flandre, Maestria, charges.

### Les trois arbitrages dans le simulateur (30 octobre 2026)

Les décisions du porteur (CADRAGE-v3, § 12 bis) sont dans le moteur et dans le modèle :
- **La mesure du nouveau.** Chaque jour, une Maison arrivée après le début est comparée à la Puissance médiane des Maisons plus anciennes de sa bande. Le rapport donne aussi, pour information, la même mesure sans les Maisons absentes.
- **Les hautes recettes** (`highRecipes`, fonction `highRecipeRaw`). Dès le niveau 12, chaque unité faite mange une part d'unité de brut de Vénétie (blé, argile, bois, sel) par niveau à partir de 12. L'atelier la prend dans son stock ou l'achète à Venise ; les jeunes Maisons (Casa ≤ 8) y vendent leurs bruts tant que le prix est au moins la référence.
- **L'incanto de la Muda** (`muda`, fonctions `mudaAuction`, `mudaPlaces`, `mudaReserve`).
  - La galea et la galère de Flandre ne partent qu'avec une place gagnée à l'incanto. Il y a deux départs par semaine, et des places pour la moitié des Maisons qui ont une telle galère.
  - L'enchère est de Vickrey : chaque gagnant paie l'enchère juste en dessous de la sienne, jamais moins que la réserve (un jour de revenu médian des enchérisseurs). Le prix est détruit.
  - Le convoi part la cale pleine et vend à la foire du port, au-delà de la profondeur du jour.
  - **Règle apprise en route.** Avec une mise plafonnée par la caisse, les Maisons les plus riches gagnaient toutes les places et payaient seules : aucune colleganza. Désormais chacun mise ce que vaut son convoi, et le gagnant à court lève le reste en colleganza sur ce convoi.

**Réglages retenus** (essais à 100 Maisons par cohorte, trois graines, puis pleine taille) :
- hautes recettes : 5 % d'une unité de brut par unité et par niveau. À 10 %, la colleganza vit mieux, mais les anciennes Maisons dépensent plus qu'elles ne gagnent (1,00 à 1,03) et les dernières Casa traînent ;
- réserve de la Muda : un jour de revenu. À une demi-journée, la colleganza tombe à 10–15 % ;
- les bots misent 70 % de la marge attendue (`mudaBidBps` du modèle). À 50 %, la colleganza reste sous 20 %.

**Résultat** (graines 1, 2 et 3, quatre cohortes de 200) : 7, 7 et 8 cibles sur 12, contre 5 à 6 sur 11 avant.

| Cible | Visée | Résultat | |
| --- | --- | --- | --- |
| Calendrier de la Casa | Entre la moitié et le double du § 3.1 | Tous les paliers dans les bornes | ✓ |
| Rattrapage des cohortes tardives | 20 à 40 % plus vite | 10 %, 19 %, 24 % | ≈ |
| Objectif à moins de 24 h | ≥ 90 % | 93–96 % | ✓ |
| Prochain palier de Casa | 2 à 7 jours de revenu | 4,4 à 9,5 (les derniers mois) | ≈ |
| Nouveau à la médiane de sa bande | 4 à 6 mois | 1,0 à 2,2 mois (de même hors absents) | ✗ |
| Indice des prix | 80 à 130 | 85 à 101 | ✓ |
| Puits ÷ sources | 0,6–0,8 puis 0,9–1,0 | 0,81–0,84 puis 0,97–1,01 | ≈ |
| Part de la Terraferme | ≤ 15 % | 0,1 % | ✓ |
| Bruts des jeunes vendus à Venise | ≥ 10 % de leurs recettes (cible proposée) | 5,6 à 6,0 % ; 0,8–1,0 % des bruts des vétérans | ✗ |
| Arbitrage | Marge > 0, commandes ≥ 25 % | 700–870 d par voyage, commandes 33–35 % | ✓ |
| Chaque métier fait vivre son penchant | ≥ 25 % chacun | Voyages 31–33 %, gisements 27 %, expéditions 44–48 % | ✓ |
| Colleganza de la Muda | ≥ 20 % des convois | 23–28 % ; place à 55 000–63 000 d ; 9–19 % des mises venues de plus grandes Maisons | ✓ |

La Muda est devenue le deuxième puits du monde, après les Grandes Œuvres : environ 1,1 milliard de ducats détruits sur 24 mois, pour 4,3 milliards créés.

### Ce qui reste au porteur (30 octobre 2026)

- **La mesure du nouveau dans sa bande est trop facile.** Une jeune Maison rejoint la médiane des plus anciennes de sa bande en un à deux mois, et le retrait des absents n'y change rien. La raison est structurelle : les Maisons plus anciennes qui partagent la bande d'un nouveau sont, par construction, celles qui ont pris du retard. Deux voies :
  - comparer à la médiane de **toute** la bande, sans distinction d'âge ;
  - comparer à la cohorte qui l'a précédé, au même âge.
- **La part des vétérans venue des jeunes** (30 % visés) reste hors de portée : 1 %. Les jeunes cohortes arrivent par paquets et ne restent jeunes qu'un mois face à 800 Maisons. Le rapport mesure donc le côté des jeunes : la part de leurs recettes faite en vendant leurs bruts à Venise, 6 %. **La cible de 10 % est une proposition**, à confirmer ou à remplacer.
- **Les derniers paliers de Casa** coûtent jusqu'à 9,5 jours de revenu, et le rattrapage reste entre 10 et 24 %. Ces points datent du premier calibrage ; ils seront à reprendre avec le contenu de fin de partie.

### Le socle et les recettes du thème (30 octobre 2026)

Le socle joue les chaînes de Vénétie avec les recettes du thème (`venice1450.ts`), pas avec les recettes simplifiées du simulateur. Les écarts étaient nets : le blé fait 16 unités à l'heure au niveau 1 (contre 10), le pain 20 (contre 5), et le pain passe par la farine. Le simulateur lit donc désormais, pour le blé, l'argile, le bois, la farine, le pain, les briques et les planches, le rythme et les intrants des recettes du thème. Les autres biens gardent les hypothèses du modèle jusqu'à leur étape.

La Maison commence comme dans le socle, avec trois ateliers (argile, bois, scierie) et 500 ducats. La Casa 1 n'a que quatre places et la Casa 2 demande des briques : partir avec quatre ateliers sans briqueterie bloquait la Maison.

**Résultat** (graines 1, 2 et 3, quatre cohortes de 200) : **8 cibles sur 12 sur chaque graine**, contre 7, 7 et 8 avant l'alignement.

| Cible | Visée | Résultat | |
| --- | --- | --- | --- |
| Calendrier de la Casa | Entre la moitié et le double du § 3.1 | Tous les paliers dans les bornes | ✓ |
| Rattrapage des cohortes tardives | 20 à 40 % plus vite | 30 %, 21 %, 25 % | ✓ |
| Objectif à moins de 24 h | ≥ 90 % | 95–96 % | ✓ |
| Prochain palier de Casa | 2 à 7 jours de revenu | 4,2 à 10,8 (les derniers mois) | ✗ |
| Nouveau à la médiane de sa bande | 4 à 6 mois | 1,0 à 1,2 mois | ✗ |
| Indice des prix | 80 à 130 | 86 à 101 | ✓ |
| Puits ÷ sources | 0,6–0,8 puis 0,9–1,0 | 0,81–0,83 puis 0,98–1,01 | ≈ |
| Part de la Terraferme | ≤ 15 % | 0,2 % | ✓ |
| Bruts des jeunes vendus à Venise | ≥ 10 % de leurs recettes (proposé) | 5,9 à 6,3 % | ✗ |
| Arbitrage | Marge > 0, commandes ≥ 25 % | 850–940 d par voyage, commandes 31–36 % | ✓ |
| Chaque métier fait vivre son penchant | ≥ 25 % chacun | Voyages 27–30 %, gisements 28–30 %, expéditions 44–48 % | ✓ |
| Colleganza de la Muda | ≥ 20 % des convois | 28–32 % ; place à 62 000–66 000 d | ✓ |

Le rattrapage passe désormais : les chaînes du thème font monter plus vite les niveaux que beaucoup de Maisons possèdent. Les derniers paliers de la Casa coûtent un peu plus (jusqu'à 11 jours de revenu, contre 9,5). Restent ouverts les points déjà posés au porteur : la mesure du nouveau dans sa bande, et la cible des bruts.

### Les deux décisions du 30 octobre, au simulateur

- **Le nouveau se mesure contre toute sa bande**, quel que soit l'âge des Maisons. La mesure donne 0 mois : une cohorte de 200 nouveaux remplit elle-même la première bande, et chacun y est à la médiane dès le premier jour. Comparé aux seules Maisons plus anciennes, il fallait 1 à 1,2 mois. La cible de 4 à 6 mois ne peut donc se lire dans la bande ; elle est à redéfinir, par exemple « le nouveau quitte la première bande en 4 à 6 mois ».
- **La cible des bruts des jeunes est confirmée** : ≥ 10 % de leurs recettes. Mesuré : 5,9 à 6,3 %. Le levier est la part de bruts des hautes recettes (`highRecipes.rawPerLevelBps`, 5 %), dont la hausse fait aussi passer les anciennes Maisons au-dessus de l'équilibre des puits.

### L'étape 4 au simulateur (30 octobre 2026)

Le simulateur lit désormais dans les réglages du jeu ce que l'étape 4 y a mis :
- le coût des comptoirs (`counters.costTimes`) ;
- la mule, la charrette, le burchio et le chariot (`empire.vehicles`) ;
- les tournées de livraison (`localTripsPerDay`) ;
- la part des Maisons par gisement (`deposits.housesPerDeposit`).

Les valeurs étaient celles du modèle : **8 cibles sur 12 sur chaque graine**, les mêmes résultats qu'avant l'étape. Seule la mesure du nouveau change de nature (0 mois, voir plus haut).

### L'étape 5 au simulateur : l'identité (30 octobre 2026)

Le simulateur lit l'identité des Maisons avec le `houseEffect` du moteur, sur une ombre de chaque Maison (`apps/simulator/src/empire/identity.ts`) :
- **l'Arte**, à la Casa 7 : celle de la chaîne qui compte le plus d'ateliers de la Maison, ou les Banchieri sans chaîne ;
- **les savoirs**, dans l'ordre de son penchant (le négociant commence par l'Abaco, l'exploitant par les Arti), le premier capstone au bout de chaque branche, dès que la caisse le permet après la réserve ;
- **le personnel** : un maître par place, sur ses ateliers dans l'ordre, qui gagne son expérience avec les heures de son atelier (un lot par demi-heure, hypothèse du modèle) ;
- **la famille** : une génération tous les 91 jours depuis l'arrivée, un membre rare et un trait de lignée ;
- **les voisinages**, en joueur qui ordonne bien son anneau : un lien pour chaque atelier dont une voisine de sa région fait l'intrant ;
- **la cour**, qui achète chaque jour les biens fins et exquis, dans son carnet.

Les réglages de Venise sont ceux de l'étape, sans retouche. **Résultat** (graines 1, 2 et 3, quatre cohortes de 200) : **8 cibles sur 12 sur chaque graine**, comme avant l'étape.

| Mesure | Avant l'étape | Après |
| --- | --- | --- |
| Prochain palier de Casa, en jours de revenu | 4,2 à 10,8 | 4,0 à 9,1 |
| Puits ÷ sources, jeunes puis anciennes | 0,81–0,83 puis 0,98–1,01 | 0,87–0,89 puis 0,98–1,01 |
| Bruts des jeunes vendus à Venise | 5,9 à 6,3 % | 6,2 à 7,3 % |
| Rattrapage des cohortes tardives | 21 à 30 % | 24 à 32 % |
| Indice des prix | 86 à 101 | 86 à 101 |

Sur la graine 3, la cour a payé 235 millions de ducats sur 24 mois (contre 2 milliards au marché et 1,65 aux commandes), les savoirs en ont détruit 38 millions et l'embauche 1,8 million. L'étape ne déséquilibre pas les cibles : les rendements de l'identité raccourcissent un peu les derniers paliers de la Casa, et les anciennes Maisons restent à l'équilibre des puits. Les jeunes s'en écartent un peu plus (0,87 à 0,89, pour 0,6 à 0,8 visés) : les savoirs et l'embauche de leurs premiers mois sont des puits ; c'est le point à surveiller avec l'étape suivante. Le simulateur prend environ 11 minutes par graine, contre 6.

### Refaire le calibrage

```
pnpm --filter @comptoirs/simulator empire                 # 3 graines, 24 mois, 4 cohortes de 200
pnpm --filter @comptoirs/simulator empire --cohort 30     # rapide (≈ 30 s), plus bruité
```
