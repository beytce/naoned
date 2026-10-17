# La Maison dure, la fortune repart — plan de progression entre saisons

Décision du porteur (17 octobre 2026) : le commerce garde ses saisons mensuelles, mais la **Maison** du joueur se développe d'une saison à l'autre. Elle **achète elle-même** ses droits — commercer dans une nouvelle ville, aux galères de la Muda, en Lombardie… — avec une monnaie qui dure : **l'Influence**, gagnée par le commerce et par la Campagne des familles. Les ducats, les stocks, les ateliers et les véhicules repartent de zéro chaque mois, comme aujourd'hui. Les familles gardent leur saison.

**Statut : plan, non codé.** Le gel des mécaniques tient jusqu'aux mesures de la bêta ; ce document prépare la mise en œuvre et le simulateur qui la validera.

## Pourquoi cette forme

- Le constat du porteur (octobre 2026) : « on a peu l'impression de se développer ». Un développement qui se gère et se garde y répond.
- **Acheter plutôt que débloquer par niveau** : le joueur choisit sa route (l'outre-mer, la Lombardie, la logistique, les ateliers) et doit renoncer à une patente pour en avoir une autre. C'est une décision, pas un compteur.
- **Une monnaie à part plutôt que les ducats** : les ducats repartent à zéro chaque mois et servent au classement ; s'ils achetaient des droits permanents, le joueur sacrifierait sa saison pour la suivante, et l'économie mensuelle (masse monétaire ≤ 2,5 × le capital de départ) devrait absorber un nouveau puits. L'Influence ne touche ni au grand livre ni aux prix.
- **Gagnée aussi par la Campagne** : les familles manquaient d'enjeu durable (constat du cadrage) ; tenir des terres rapporte désormais de quoi développer sa Maison. Mais le commerce seul suffit à progresser : la Campagne accélère, elle n'est pas obligatoire.
- La fortune qui repart garde l'économie calibrée sur un mois et l'argument « le 1er, tout le monde repart avec 1 000 ducats ».

## Les règles

1. **Des choix, pas du rendement.** Une patente ouvre une option (une ville, un marché, une maîtrise, un territoire). Elle ne donne jamais plus de production par lot, de meilleurs prix, plus de vitesse ou de capacité que ce qu'un nouveau peut acheter. Un vétéran fait autre chose, pas la même chose en plus fort.
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
| **Campagne** : terres tenues par sa famille à la clôture de la semaine, au prorata de son Mérite | 1 par 10 de Mérite, +5 si la famille gagne la semaine | 15 par semaine |
| **Fin de saison** : palier du classement | participant 5, notable 10, top 10 20, podium 30, Doge 50 | — |

Ce que cela donne par saison : un marchand médian (≈ 5 000 ducats de ventes nettes) gagne ≈ 50 par le commerce et ≈ 5 à la clôture, soit **≈ 55** ; s'il joue aussi la Campagne, **≈ 90** ; un joueur très actif, commerce et Campagne au plafond, **≈ 160**.

## Le catalogue des patentes (première proposition)

Le nouveau commence avec la chaîne de sa région, **ses 4 villes les plus proches**, le Rialto complet (ordres immédiats et à cours limité, comme le veut le tutoriel), deux mules et deux maîtrises possibles (Maître d'atelier, Roulier). Le reste s'achète, en quatre routes :

| Route | Patente | Coût | Pré-requis |
| --- | --- | --- | --- |
| **Vénétie** | Droit de commerce dans une ville de Vénétie (chacune des 3 restantes) | 15, puis 20, puis 25 | — |
| **Outre-mer** | Charte du Levant : galères de la Muda, commandes du Doge en produits d'outre-mer, maîtrise Marchand du Levant | 40 | 1 ville achetée |
| | Comptoir d'Alexandrie : commandes du Doge à plusieurs marchandises (épices, soie…) | 60 | Charte du Levant |
| **Logistique** | Brevet de Négociant (maîtrise) | 30 | — |
| | Second comptoir dans une autre région : un point de départ des véhicules, sans le bonus régional des matières premières | 80 | 2 villes achetées |
| **Terre ferme** | Lombardie : Brescia et Bergame deviennent des villes de commerce (routes longues, commandes propres, payées à l'heure de route comme les autres) | 120 | les 7 villes de Vénétie |
| | Frioul : Udine et Pordenone | 150 | Lombardie ou second comptoir |
| **Ateliers** | Guilde de l'Art de la laine : chaîne textile (laine → drap), quand le contenu V1 existe | 150 | 1 maîtrise |
| Cosmétique | Pièces de blason, façades du palais, monument de la Maison sur la carte | 10 à 60 | — |

Repères : un marchand médian achète sa première ville dans la première ou la deuxième semaine (1 500 ducats de ventes nettes), complète la Vénétie en une saison et demie, et ouvre la Lombardie vers la quatrième saison ; tout le catalogue (≈ 660 sans les cosmétiques) demande six à sept saisons au médian, quatre à cinq à qui joue aussi la Campagne. Personne ne peut tout avoir vite : il faut choisir sa route.

Le départ retire au nouveau ses trois villes les plus lointaines (pour la Lagune : Vérone, Mantoue et l'une de Ferrare ou Vicence, à égale distance) et la Muda : c'est voulu (« une progression plus lente »), et cela simplifie ses premiers jours. À vérifier au simulateur : les commandes qu'un nouveau peut couvrir doivent rester dans la cible (aujourd'hui 58 à 63 % des commandes ouvertes).

## Ce qui change pour le joueur

- **Écran « Livre de la Maison »** : l'Influence, ce qu'elle a rapporté cette semaine et par où, le catalogue des patentes par route avec leurs pré-requis, celles déjà acquises, les saisons passées (le palmarès existe déjà).
- **Carte** : les villes sans patente apparaissent assombries avec un cadenas et leur prix en Influence ; les toucher ouvre l'achat. Une patente achetée allume la ville (petite cérémonie).
- **Campagne** : la fiche de la famille montre l'Influence que la semaine rapportera.
- **Ouverture de saison** : la cérémonie de clôture montre l'Influence gagnée ; le second comptoir se pose à la rentrée.
- **Classements** : le classement mensuel des ventes nettes ne change pas. Ajout proposé : un **classement des nouveaux** (Maisons de leurs deux premières saisons), pour que les débuts aient leur podium.

## Ce que cela touche dans le code

| Couche | Changement |
| --- | --- |
| `packages/engine` | Catalogue des patentes et barème de l'Influence dans `worlds.settings` (jamais en dur) ; les patentes de la Maison entrent dans l'état du joueur à l'adhésion ; contrôles purs dans les commandes (livrer une ville, acheter à la Muda, choisir une maîtrise, poser un second comptoir) ; demande des villes calculée sur les marchands qui y ont droit ; calcul de l'Influence gagnée à la clôture de la semaine (ventes nettes, Mérite) avec ses plafonds. Tests d'abord, sur la fixture. |
| `apps/server` | Deux tables au niveau du compte, hors couche monde : `influence_entries` (journal signé : source, monde et semaine d'origine, montant) et `house_patents` (patente, date, monde d'achat). Le solde est la somme du journal, comme le grand livre. Route d'achat d'une patente, transactionnelle. Bots dotés de patentes réparties comme une vraie population. |
| `apps/web` | Livre de la Maison, villes verrouillées sur la carte, achat et cérémonie, Influence de la semaine dans la Campagne. |
| `apps/simulator` | Population mêlée (nouveaux, Maisons à mi-parcours, Maisons complètes) ; bots qui achètent des patentes selon une route ; rapport : écart à activité égale, KPIs des nouveaux, rythme d'acquisition. |
| Contenu | Lombardie et Frioul comme villes de commerce (lieux et routes à dessiner), chaîne textile (V1). |

## Étapes proposées

1. **Simulateur d'abord** (après validation de ce plan) : catalogue et barème dans les réglages, contrôles dans le moteur, bots aux patentes mêlées. Critères : écart ≤ 15 % pour une Maison complète, KPIs des nouveaux inchangés, rythme d'acquisition proche des repères ci-dessus, toutes les graines conformes. Résultats dans `docs/calibration.md`.
2. **Après les mesures de la bêta**, si le porteur lève le gel : l'Influence, le Livre de la Maison et les routes Vénétie, Outre-mer et Logistique (sauf le second comptoir). Rien de nouveau à dessiner : villes, Muda et maîtrises existent déjà.
3. Second comptoir et Lombardie.
4. Frioul et textile avec la V1.

## Questions ouvertes

- Le nom : « Influence » et « patentes » vous vont-ils ?
- Le poids de la Campagne : environ 40 % de l'Influence pour qui y joue, est-ce assez pour donner envie, pas trop pour qui ne veut que commercer ?
- Le seuil d'avantage d'une Maison complète : 15 %, plus, moins ?
- Le départ retire-t-il vraiment trois villes au nouveau, ou les patentes ne font-elles qu'ajouter du neuf au-delà des 7 villes actuelles (progression plus douce, moins de choix au début) ?
- Le second comptoir : une région rechoisie chaque saison, ou fixée une fois pour toutes ?
- Les PNJ : patentes réparties comme la population réelle, ou aucune pour ne pas occuper les villes lointaines ?
