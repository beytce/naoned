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
| P6 | **Le duel en ligne** entre deux joueurs (salle privée, lien à partager, quinze secondes par coup, revanche). | `apps/server/src/game/passe.ts`, `passeRoutes.ts`, laboratoire | `passe-hub.test.ts`, `passe-routes.test.ts`, parcours `e2e/passe-duel.mjs` |
| P7 | **Les quatre autres pièces de caractère** (ancre, relais, corps-mort, herse), une par une, chacune mesurée. | moteur | à faire après P5 |

## 3. Ce qui n'est pas dans cette étape

La planche commune, les fils, les villes, les tours et leurs sceaux, le lieutenant d'un joueur, la cote : ce sont les étapes 2 à 6 du cadrage.

## 4. État (11 novembre 2026)

| Lot | État |
| --- | --- |
| P1 | fait : `passe/board.ts`, 16 tests (dont : jamais de partie nulle sur 400 damiers remplis au hasard) |
| P2 | fait : `passe/mind.ts`, quatre forces, trois manières, 6 tests. La force 4 est lente sur téléphone (non mesurée) |
| P3 | fait : `passe/problems.ts`, vingt problèmes (douze en deux coups, huit en trois), 8 tests. La clef unique des problèmes en trois coups est vérifiée à la génération, pas dans les tests (trop long) |
| P4 | fait : `docs/calibration.md`, § La Passe. Trois passages de Venise entre 50 et 58 % ; le 9 sur 9 non mesuré à la force 3 |
| P5 | fait : `?lab=passe`, parcours `pnpm --filter @comptoirs/web e2e:passe` (avec `BASE` et `CHROMIUM`). **Pas mesuré sur un vrai téléphone** : le conteneur dessine en logiciel. Sur téléphone la caméra est plus haute que celle du kit, pour des cases plus grandes sous le pouce |
| P6 | fait : `PasseHub` et ses routes `/api/passe/room` (13 tests), l'écran (« Réglages », « Un ami, en ligne » : ouvrir une salle, copier le lien, rejoindre par un code ; compte à rebours ; revanche camps échangés), ouvert aux invités. Parcours à deux navigateurs `e2e:passe-duel`. La salle se lit une fois par seconde (pas de WebSocket) ; pas de cote, pas d'appariement public : seulement des salles privées |
| P7 | à faire : ancre, relais, corps-mort, herse |

## 5. Pour l'essayer

```
pnpm dev
```

puis ouvrir `http://localhost:5173/?lab=passe`. Pour un duel en ligne : « Réglages », « Ouvrir une salle », puis envoyer le lien (l'autre joueur doit pouvoir joindre le même serveur). « Réglages » donne la règle, le camp (fil, chaîne, à deux), le passage, la force et la manière de l'adversaire, et les problèmes.
