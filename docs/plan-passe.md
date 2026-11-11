# La Passe : le prototype (étape 1 de CADRAGE-v4 § 17)

*Lancé le 10 novembre 2026 sur validation du porteur (« je valide, lance le prototype de l'étape 1 »). Les règles sont celles de `docs/CADRAGE-v4.md` § 9. Ce prototype vit à côté du jeu actuel et n'y touche pas : un moteur à part, un laboratoire à part.*

## 1. Ce que l'étape doit prouver

Le critère est celui du porteur : **a-t-on envie d'en refaire une ?** S'y ajoutent : un joueur d'échecs y trouve de quoi réfléchir ; l'équilibre se règle à 50 % par les maillons d'avance ; ça se joue d'une main sur un téléphone de 390 px, dans le rendu de Porcellana.

## 2. Les lots

| Lot | Contenu | Où | Vérification |
| --- | --- | --- | --- |
| P1 | **Le moteur** : le damier, les six liaisons (côte à côte, et en biais dans le sens du courant), la distance de chaque camp à ses rives, les coups permis, le brûlot et la bombarde, la ligne gagnante, la cargaison sauvée. Pur, déterministe, tests d'abord. | `packages/engine/src/passe/board.ts` | `packages/engine/test/passe/board.test.ts` (dont : jamais de partie nulle, sur des damiers remplis au hasard) |
| P2 | **L'adversaire** : quatre forces (il voit un à quatre coups), trois manières (murer le centre, courir les rives, harceler). | `passe/mind.ts` | `passe/mind.test.ts` : il prend le coup gagnant, il pare le coup perdant, la force 3 bat la force 1 |
| P3 | **Les problèmes** : « le fil passe en deux coups », « en trois coups ». Un solveur de gain forcé ; vingt problèmes tirés de parties jouées par l'adversaire, à clef unique. | `passe/problems.ts`, `themes/venice1450.passe.ts`, `apps/simulator/src/passe-problems.ts` | `passe/problems.test.ts` : chaque clef gagne, aucun problème ne se gagne en moins de coups |
| P4 | **L'équilibre** : l'adversaire contre lui-même, selon les écueils, les maillons d'avance et le premier coup. | `apps/simulator/src/passe-bench.ts` | `docs/calibration.md`, § La Passe |
| P5 | **Le laboratoire** : le duel dans le rendu de Porcellana (`?lab=passe`), au toucher, sur téléphone d'abord. Contre l'adversaire (en fil ou en chaîne), à deux sur le même écran, et les problèmes. | `apps/web/src/porcellana/passe/` | parcours `apps/web/e2e/passe.mjs`, captures à 390 px |
| P6 | **Le duel en ligne** entre deux joueurs (salon, lien à partager, quinze secondes par coup). | serveur et laboratoire | à faire après le retour du porteur sur P5 |
| P7 | **Les quatre autres pièces de caractère** (ancre, relais, corps-mort, herse), une par une, chacune mesurée. | moteur | à faire après P5 |

## 3. Ce qui n'est pas dans cette étape

La planche commune, les fils, les villes, les tours et leurs sceaux, le lieutenant d'un joueur, la cote : ce sont les étapes 2 à 6 du cadrage.

## 4. État

| Lot | État |
| --- | --- |
| P1 | fait |
| P2 | fait |
| P3 | fait |
| P4 | fait (docs/calibration.md) |
| P5 | fait ; **pas mesuré sur un vrai téléphone** (le conteneur dessine en logiciel) |
| P6 | à faire |
| P7 | à faire |
