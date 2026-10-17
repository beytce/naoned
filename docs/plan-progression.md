# La Maison dure, la fortune repart — plan de progression entre saisons

Décision du porteur (17 octobre 2026) : le commerce garde ses saisons mensuelles, mais la **Maison** du joueur progresse d'une saison à l'autre en **débloquant** des villes, des territoires, des maîtrises et des marchés. Les ducats, les stocks, les ateliers et les véhicules repartent de zéro chaque mois, comme aujourd'hui. Les familles gardent leur saison telle quelle.

**Statut : plan, non codé.** Le gel des mécaniques tient jusqu'aux mesures de la bêta ; ce document prépare la mise en œuvre et le simulateur qui la validera.

## Pourquoi cette forme

- Le constat du porteur (octobre 2026) : « on a peu l'impression de se développer ». Un objectif qui dure plusieurs saisons y répond.
- La fortune qui repart garde l'économie calibrée sur un mois (masse monétaire ≤ 2,5 × le capital de départ, prix de référence, puits) et l'argument « le 1er, tout le monde repart avec 1 000 ducats ».
- Le socle existe : le **niveau de marchand** compte déjà les ventes nettes de toutes les saisons et ne redescend jamais (`apps/server/src/game/level.ts`). Il n'est qu'honorifique ; il devient la clé des déblocages.

## Les règles

1. **Des choix, pas du rendement.** Un déblocage ouvre une option (une ville, un marché, une maîtrise, un territoire). Il ne donne jamais plus de production par lot, de meilleurs prix, plus de vitesse ou plus de capacité que ce qu'un nouveau peut acheter. Un vétéran fait autre chose, pas la même chose en plus fort.
2. **Pas de jeu à somme nulle avec les nouveaux.** La demande d'une ville débloquée se calcule sur les marchands actifs qui y ont accès : ouvrir Brescia aux vétérans n'enlève aucune commande à Padoue.
3. **Avantage borné et mesuré.** À activité égale, un marchand de niveau 18 finit au plus **15 %** devant un nouveau (cible à confirmer, vérifiée par `pnpm sim` sur toutes les graines), et les cibles des nouveaux ne bougent pas (première livraison, commandes couvertes, J1).
4. **Débloqué tout de suite.** Le niveau compte les ventes de la saison en cours : un palier franchi le mardi ouvre sa ville le mardi. Seuls les déblocages qui changent le départ (second comptoir) attendent la saison suivante.
5. **Rien d'achetable.** Ni le Pass ni aucun paiement ne débloque ou n'accélère l'expérience.
6. **Les familles à part.** La Campagne, les lances et les décrets ne dépendent pas du niveau de la Maison.

## L'arbre des déblocages (première proposition)

Rythme du niveau actuel (`LEVEL_STEP = 300`) : un marchand médian (≈ 5 000 ducats de ventes nettes par saison) atteint le niveau 6 en une saison, 9 en deux, 12 en quatre, 15 en six ; un marchand du meilleur dixième va environ deux fois plus vite. Points cumulés : niveau 3 = 900, 6 = 4 500, 9 = 10 800, 12 = 19 800, 15 = 31 500, 18 = 45 900.

| Niveau | Déblocage | Nature | Saison du médian |
| --- | --- | --- | --- |
| 1 | La chaîne de sa région, les **4 villes les plus proches**, le Rialto complet (ordres immédiats et à cours limité, comme le veut le tutoriel), deux mules | départ | 1re, jour 1 |
| 3 | **Les 7 villes de Vénétie** | villes | 1re, première semaine |
| 5 | Maîtrises **Maître d'atelier** et **Roulier** (la condition de 5 niveaux d'ateliers dans la saison reste) | maîtrise | 1re |
| 7 | **Galères de la Muda** (épices, soie, fourrures…) et maîtrise **Marchand du Levant** | marché | 2e |
| 9 | Maîtrise **Négociant** ; commandes du Doge à plusieurs marchandises | maîtrise, commandes | 2e |
| 11 | **Second comptoir** dans une autre région, choisi à l'ouverture de la saison : un point de départ des véhicules, sans le bonus régional des matières premières | territoire | 3e-4e |
| 13 | **Lombardie** : Brescia et Bergame deviennent des villes de commerce (routes longues, commandes propres, payées à l'heure de route comme les autres) | territoire | 4e-5e |
| 15 | **Chaîne textile** (laine → drap), quand le contenu V1 existe | atelier | 6e |
| 18 | **Frioul** : Udine et Pordenone, villes de commerce | territoire | 8e-9e |
| tous les 2 niveaux | Pièces de blason, façades du palais, monument de la Maison sur la carte | cosmétique | — |

Le niveau 1 retire au nouveau ses trois villes les plus lointaines (pour la Lagune : Vérone, Mantoue et l'une de Ferrare ou Vicence, à égale distance) et la Muda pendant sa première semaine, donc aussi les commandes du Doge en produits d'outre-mer : c'est voulu (« une progression plus lente »), et cela simplifie ses premiers jours. À vérifier au simulateur : les commandes qu'un nouveau peut couvrir doivent rester dans la cible (aujourd'hui 58 à 63 % des commandes ouvertes).

## Ce qui change pour le joueur

- **Écran « Livre de la Maison »** : le niveau, le prochain palier et ce qu'il ouvre, l'arbre complet, les saisons passées (le palmarès existe déjà).
- **Carte** : les villes et territoires non débloqués apparaissent assombris avec un cadenas et leur niveau ; un palier franchi les allume (petite cérémonie).
- **Ouverture de saison** : la cérémonie de clôture montre aussi ce que la Maison a gagné ; le choix du second comptoir se fait à la rentrée.
- **Classements** : le classement mensuel des ventes nettes ne change pas. Ajouts proposés : un **classement des nouveaux** (Maisons de niveau ≤ 6) pour que les premières saisons aient leur podium, et un **prestige de la Maison** sur toutes les saisons (la renommée existe déjà).

## Ce que cela touche dans le code

| Couche | Changement |
| --- | --- |
| `packages/engine` | `settings.house.unlocks` (paliers dans `worlds.settings`, jamais en dur) ; le niveau de la Maison entre dans l'état du joueur à l'adhésion et se met à jour avec ses ventes ; contrôles dans les commandes (livrer une ville, acheter à la Muda, choisir une maîtrise, ouvrir un second comptoir) ; demande des villes calculée sur les marchands qui y ont accès. Tests d'abord, sur la fixture. |
| `apps/server` | Niveau de la Maison calculé à l'adhésion (`levelsOf` existe) ; vue : déblocages acquis et prochain palier ; bots avec des niveaux répartis comme une vraie population. |
| `apps/web` | Livre de la Maison, villes verrouillées sur la carte, cérémonie de palier, choix du second comptoir. |
| `apps/simulator` | Population mêlée de niveaux ; rapport : écart vétéran / nouveau à activité égale, KPIs des nouveaux, masse monétaire. |
| Contenu | Lombardie et Frioul comme villes de commerce (lieux et routes à dessiner), chaîne textile (V1). |

## Étapes proposées

1. **Simulateur d'abord** (après validation de ce plan) : paliers dans les réglages, contrôles dans le moteur, bots de niveaux mêlés. Critères : écart ≤ 15 % au niveau 18, KPIs des nouveaux inchangés, toutes les graines conformes. Résultats dans `docs/calibration.md`.
2. **Après les mesures de la bêta**, si le porteur lève le gel : déblocages des niveaux 1 à 9 (villes, Muda, maîtrises), avec l'écran et la carte. Rien de nouveau à dessiner, tout existe déjà dans le jeu.
3. Second comptoir et Lombardie (niveaux 11 et 13).
4. Textile et Frioul avec la V1.

## Questions ouvertes

- Le seuil d'avantage du vétéran : 15 %, plus, moins ?
- Le niveau 1 retire-t-il vraiment des villes au nouveau, ou ne fait-il qu'ajouter des villes au-delà des 7 actuelles (progression plus douce, moins de profondeur au début) ?
- Le second comptoir : une région au choix chaque saison, ou fixée une fois pour toutes ?
- Les PNJ : leurs niveaux suivent-ils la population réelle, ou sont-ils tous au niveau 1 pour ne pas occuper les villes lointaines ?
