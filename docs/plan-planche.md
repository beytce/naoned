# La planche et ses fils : le prototype (étape 2 de CADRAGE-v4 § 17)

*Lancé le 11 novembre 2026. Le porteur, la Passe validée : « Mais quand est-ce que tu feras toute la map que tu as faite en maquette, les fils qu'on tire, etc. ? Sinon c'est validé, tu peux poursuivre. » Les règles sont celles de `docs/CADRAGE-v4.md` §§ 3, 5, 6 et 7. Comme la Passe, ce prototype vit à côté du jeu actuel et n'y touche pas.*

## 1. Ce que l'étape doit prouver

- Une planche commune à toutes les Maisons, en Porcellana, du blanc de la lagune à l'encre du Large.
- Le geste du jeu : **tirer un fil** de son quai vers une ville ; les barques le suivent seules.
- La rivalité sans pillage : la demande d'une ville est **commune**, son prix baisse pour tous.
- Les passages : une route riche est fermée par un corsaire ou taxée par une Maison ; on la **force par la Passe**.
- Au banc : les fils bougent, aucune Maison n'écrase les autres, venir huit fois par jour ne rapporte pas beaucoup plus que trois, chaque denier est compté.

## 2. Les lots

| Lot | Contenu | Où | Vérification |
| --- | --- | --- | --- |
| L1 | **Le moteur** : production plafonnée, fils, demande commune et prix, patine, bobine qui revient, passages (fermés, péage en partie détruit, sceaux, tour prise), Maison robot. Pur, tests d'abord. | `packages/engine/src/planche/` | `packages/engine/test/planche/planche.test.ts` (15 tests, dont : chaque denier compté, le temps avancé d'un coup ou par morceaux donne le même état) |
| L2 | **La planche de Venise** : huit Maisons, sept villes, trois passages, deux ports du Large. | `themes/venice1450.planche.ts` | le banc |
| L3 | **Le banc** : six semaines, huit Maisons robots, plusieurs graines. | `apps/simulator/src/planche-bench.ts` | `docs/calibration.md`, § La planche |
| L4 | **Le laboratoire** (`?lab=planche`) : la planche en Porcellana, les villes et leur demande, ta Maison et les sept autres, les fils (le tien en ruban rouge avec ses barques, les autres à l'encre), les passages et leurs tours, la fiche d'une ville (tirer, reprendre), la fiche d'un passage (forcer par la Passe, régler son péage), le fil des nouvelles, l'heure qui passe (pause, ×1, ×6). | `apps/web/src/porcellana/planche/` | parcours `apps/web/e2e/planche.mjs` |
| L5 | **La planche partagée en ligne** : le serveur tient la planche, les joueurs y sont ensemble. | `apps/server/src/game/planche.ts`, `plancheRoutes.ts`, laboratoire | `planche-hub.test.ts`, `planche-routes.test.ts`, parcours à deux navigateurs `e2e/planche-online.mjs` |
| L6 | **L'île** posée sur la planche (le domaine actuel, ses ateliers et voisinages), à la place des chiffres de production fixes. | | à faire (étape 3 du cadrage) |

## 3. Ce qui n'est pas dans cette étape

La marée d'encre et sa fin, les classements et lauriers, le rival de la semaine, la compagnie, la tresse et la teinture des bobines, la ville tissée, les nouvelles qui déplacent la demande.

## 4. État (11 novembre 2026)

| Lot | État |
| --- | --- |
| L1 | fait |
| L2 | fait |
| L3 | fait (docs/calibration.md) |
| L4 | fait ; la planche se dessine dans le navigateur seul (une partie locale, sept Maisons robots) ; **pas mesuré sur un vrai téléphone** |
| L5 | fait : une planche par serveur, en mémoire (un redémarrage en commence une neuve), avancée heure par heure à la lecture. Chaque nouveau venu, compte ou invité, prend une Maison de l'ordinateur et la garde ; une Maison laissée 7 jours de jeu retourne à l'ordinateur ; au-delà de huit joueurs, on regarde. Un passage se force par une Passe que le serveur rejoue : le joueur n'envoie que ses coups. `PLANCHE_PACE=60` accélère le temps (une heure de jeu par minute). La page se relit toutes les deux secondes, sans WebSocket |
| L6 | à faire |

## 5. Pour l'essayer

```
pnpm dev
```

puis ouvrir `http://localhost:5173/?lab=planche` : la planche du serveur, partagée avec tous ceux qui l'ouvrent (`?lab=planche&seul` pour une planche à soi, dans le navigateur, avec Pause, ×1 et ×6). Pour voir passer les heures : `PLANCHE_PACE=60 pnpm dev`. Touche une ville, puis « Tirer un fil » ; touche le Détroit de Segna, puis « Forcer le passage » pour jouer la Passe contre le corsaire.
