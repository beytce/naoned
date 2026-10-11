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
