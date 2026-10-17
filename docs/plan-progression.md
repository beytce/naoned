# La Maison dure, la fortune repart — plan de progression entre saisons

Décision du porteur (17 octobre 2026) : le commerce garde ses saisons mensuelles, mais la **Maison** du joueur se développe d'une saison à l'autre. Elle **achète elle-même** ses droits — un second comptoir, le commerce du Levant, les villes de Lombardie… — avec une monnaie qui dure : **l'Influence**, gagnée par le commerce et par la Campagne des familles. Les ducats, les stocks, les ateliers et les véhicules repartent de zéro chaque mois, comme aujourd'hui. Les familles gardent leur saison.

**Statut : plan, non codé.** Le gel des mécaniques tient jusqu'aux mesures de la bêta ; ce document prépare la mise en œuvre et le simulateur qui la validera.

## Pourquoi cette forme

- Le constat du porteur (octobre 2026) : « on a peu l'impression de se développer ». Un développement qui se gère et se garde y répond.
- **Acheter plutôt que débloquer par niveau** : le joueur choisit sa route (l'outre-mer, la Lombardie, la logistique, les ateliers) et doit renoncer à une patente pour en avoir une autre. C'est une décision, pas un compteur.
- **Une monnaie à part plutôt que les ducats** : les ducats repartent à zéro chaque mois et servent au classement ; s'ils achetaient des droits permanents, le joueur sacrifierait sa saison pour la suivante, et l'économie mensuelle (masse monétaire ≤ 2,5 × le capital de départ) devrait absorber un nouveau puits. L'Influence ne touche ni au grand livre ni aux prix.
- **Gagnée aussi par la Campagne** : les familles manquaient d'enjeu durable (constat du cadrage) ; tenir des terres rapporte désormais de quoi développer sa Maison. Mais le commerce seul suffit à progresser : la Campagne accélère, elle n'est pas obligatoire.
- La fortune qui repart garde l'économie calibrée sur un mois et l'argument « le 1er, tout le monde repart avec 1 000 ducats ».

## Les règles

1. **Des choix, pas du rendement.** Une patente ouvre une option (un comptoir, un marché, des villes, une chaîne d'ateliers). Elle ne donne jamais plus de production par lot, de meilleurs prix, plus de vitesse ou de capacité que ce qu'un nouveau peut acheter. Un vétéran fait autre chose, pas la même chose en plus fort.
2. **Pas de jeu à somme nulle avec les nouveaux.** La demande d'une ville ouverte par patente se calcule sur les marchands actifs qui y ont droit : ouvrir Brescia aux uns n'enlève aucune commande à Padoue.
3. **Avantage borné et mesuré.** À activité égale, une Maison qui a toutes les patentes finit au plus **15 %** devant un nouveau (cible à confirmer, vérifiée par `pnpm sim` sur toutes les graines), et les cibles des nouveaux ne bougent pas (première livraison, commandes couvertes, J1).
4. **L'Influence ne s'achète pas et ne s'échange pas.** Ni euros, ni Pass, ni ducats, ni transfert entre joueurs : elle se gagne en jouant, point. Elle ne se convertit jamais en ducats.
5. **Patentes permanentes.** Une patente achetée sert à toutes les saisons suivantes. Elle prend effet tout de suite, sauf le second comptoir, qui se pose à l'ouverture de la saison.
6. **Gains plafonnés par semaine.** Pour qu'un joueur très présent ne distance pas tout le monde, chaque source d'Influence a un plafond hebdomadaire (dans `worlds.settings`).

## Gagner de l'Influence

Ordres de grandeur pour la première calibration, à régler au simulateur :

| Source | Gain | Plafond |
| --- | --- | --- |
| **Commerce** : ventes nettes de la semaine | 1 par 100 ducats | 25 par semaine |
| **Campagne** : le Mérite de la semaine | 1 par 20 de Mérite, +3 si la famille gagne la semaine | 10 par semaine |
| **Fin de saison** : palier du classement (`seasonTier`) | participant 5, top 25 % 10, top 10 % 15, top 10 20, podium 30, Doge 50 | — |

Mesuré au simulateur (10 graines, prime de fin de saison comprise) : **≈ 68 par saison au médian** (de 56 à 75), ≈ 110 au 9e décile, dont ≈ 38 % par la Campagne ; un marchand qui ne fait que commercer gagne ≈ 40. Prix du catalogue gardés (décision du porteur) : tout le catalogue demande une dizaine de saisons au médian, six à sept au 9e décile.

## Le catalogue des patentes (première proposition)

Les patentes **n'ajoutent que du neuf** (décision du porteur) : tout ce que le jeu offre aujourd'hui reste ouvert à tous dès le premier jour (la chaîne de sa région, les 7 villes de Vénétie, le Rialto, la Muda, les quatre maîtrises). Le premier mois d'un nouveau ne change pas ; ce qui s'achète vient en plus, en quatre routes :

| Route | Patente | Ce qu'elle ouvre | Coût | Pré-requis |
| --- | --- | --- | --- | --- |
| **Logistique** | Second comptoir | Un point de départ des véhicules dans une autre région, **rechoisie à chaque saison** : la commande garde son prix, seul le trajet change (simulateur : +2 % de ventes nettes en médiane, voir `docs/calibration.md`) ; sans le bonus régional des matières premières. Une patente de confort, d'où son prix | 15 | — |
| **Outre-mer** | Comptoir d'Alexandrie | Commandes du Levant à plusieurs marchandises (épices, soie, draps), payées à l'heure de route comme les autres | 50 | — |
| | Fondaco dei Tedeschi | Les marchands allemands achètent à Venise (draps, verre, sel) : une demande propre | 80 | Comptoir d'Alexandrie |
| **Terre ferme** | Lombardie | Brescia et Bergame deviennent des villes de commerce (routes longues, commandes propres) | 80 | Second comptoir |
| | Frioul | Udine et Pordenone, villes de commerce | 120 | Lombardie |
| **Ateliers** | Art de la laine | Chaîne textile (laine → drap), contenu V1 | 120 | — |
| | Art du verre (Murano) | Chaîne du verre (sable → verre), contenu V1 | 150 | Art de la laine |
| Cosmétique | Pièces de blason, façades du palais, monument de la Maison sur la carte | — | 10 à 60 | — |

Repères : une première patente cosmétique dès la première ou la deuxième semaine (1 000 à 2 000 ducats de ventes nettes), le second comptoir en deux à trois semaines, la Lombardie (après le second comptoir, 95 en tout) vers la deuxième saison ; tout le catalogue (≈ 615 sans les cosmétiques) demande une dizaine de saisons au médian, six à sept aux plus actifs (mesuré au simulateur). Il faut choisir sa route.

Contenu à créer : chaque route ouvre du neuf (lieux et routes de Lombardie et du Frioul, commandes du Levant et des Allemands, chaînes textile et verre). Les deux premières routes (Logistique, Outre-mer) se font avec ce qui existe presque déjà : comptoir et routes, biens de la Muda, commandes du Doge.

## Ce qui change pour le joueur

- **Écran « Livre de la Maison »** : l'Influence, ce qu'elle a rapporté cette semaine et par où, le catalogue des patentes par route avec leurs pré-requis, celles déjà acquises, les saisons passées (le palmarès existe déjà).
- **Carte** : les villes sans patente apparaissent assombries avec un cadenas et leur prix en Influence ; les toucher ouvre l'achat. Une patente achetée allume la ville (petite cérémonie).
- **Campagne** : la fiche de la famille montre l'Influence que la semaine rapportera.
- **Ouverture de saison** : la cérémonie de clôture montre l'Influence gagnée ; le second comptoir se pose à la rentrée.
- **Classements** : le classement mensuel des ventes nettes ne change pas. Ajout proposé : un **classement des nouveaux** (Maisons de leurs deux premières saisons), pour que les débuts aient leur podium.

## Ce que cela touche dans le code

| Couche | Changement |
| --- | --- |
| `packages/engine` | Catalogue des patentes et barème de l'Influence dans `worlds.settings` (jamais en dur) ; les patentes de la Maison entrent dans l'état du joueur à l'adhésion ; contrôles purs dans les commandes (livrer une ville ou une commande à patente, poser le second comptoir de la saison, bâtir un atelier de chaîne à patente) ; demande des villes calculée sur les marchands qui y ont droit ; calcul de l'Influence gagnée à la clôture de la semaine (ventes nettes, Mérite) avec ses plafonds. Tests d'abord, sur la fixture. |
| `apps/server` | Deux tables au niveau du compte, hors couche monde : `influence_entries` (journal signé : source, monde et semaine d'origine, montant) et `house_patents` (patente, date, monde d'achat). Le solde est la somme du journal, comme le grand livre. Route d'achat d'une patente, transactionnelle. Bots dotés de patentes réparties comme une vraie population. |
| `apps/web` | Livre de la Maison, villes verrouillées sur la carte, achat et cérémonie, Influence de la semaine dans la Campagne. |
| `apps/simulator` | Population mêlée (nouveaux, Maisons à mi-parcours, Maisons complètes) ; bots qui achètent des patentes selon une route ; rapport : écart à activité égale, KPIs des nouveaux, rythme d'acquisition. |
| Contenu | Lombardie et Frioul comme villes de commerce (lieux et routes à dessiner), chaîne textile (V1). |

## Étapes proposées

1. **Simulateur d'abord** (fait le 17 octobre, `docs/calibration.md`) : barème de l'Influence et second comptoir (la seule patente sans contenu nouveau à dessiner) dans les réglages et le moteur, bots qui gagnent et dépensent l'Influence. Critères : écart ≤ 15 % pour une Maison complète, KPIs des nouveaux inchangés, rythme d'acquisition proche des repères ci-dessus, toutes les graines conformes. Résultats dans `docs/calibration.md`.
2. **Après les mesures de la bêta**, si le porteur lève le gel : l'Influence, le Livre de la Maison, les cosmétiques et le second comptoir. Le serveur est prêt (17 octobre) : journal `influence_entries`, `GET /api/house`, `POST /api/house/patents`, patentes passées au moteur à l'adhésion, achats des PNJ, export RGPD ; l'interface aussi (Livre de la Maison depuis le profil, achat des patentes, choix du second comptoir, son médaillon sur la carte, départ depuis lui proposé quand sa route est plus courte). Il reste l'activation : ajouter `house` aux réglages de Venise (`venice1450.settings.ts`, que le monde reprend à chaque démarrage pendant la bêta).
3. Outre-mer (Alexandrie, puis le Fondaco dei Tedeschi) et Lombardie : nouvelles commandes, lieux et routes.
4. Frioul, textile et verre avec la V1.

## Décisions du porteur (17 octobre 2026)

- La monnaie s'appelle **Influence** ; les droits achetés, des **patentes**.
- La Campagne pèse environ 40 % de l'Influence de qui y joue.
- Avantage d'une Maison complète, à activité égale : **15 %** au plus.
- Les patentes **n'ajoutent que du neuf** ; le contenu actuel reste ouvert à tous.
- Le second comptoir se **rechoisit à chaque saison**.
- Les PNJ (laissé au choix) : ils gagnent et dépensent l'Influence **comme les joueurs**, avec les mêmes commandes et les mêmes limites, selon une route tirée au hasard par maison. Ils ne partent avec aucune patente : la première saison, personne n'en a, et ils n'avancent jamais plus vite qu'un joueur de même activité.
