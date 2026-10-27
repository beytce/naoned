# Test de mise en page (e2e)

`apps/web/e2e/layout.mjs` joue la première session complète sur deux téléphones (390 × 844 et
320 × 568) : connexion, nom, guide de Lorenzo jusqu'à « Bravo » (objectif 7/7, récompense du Livre
de compte encaissée), une transformation au moulin, la Terraferme pendant sa trêve (note « Trêve »
vérifiée), une semaine en équipes avec Milan contre le joueur puis sa clôture (la réponse de
`GET /api/game/terra` réécrite au passage : « Équipe · Terraferma », « sur vous », « Bataille à
20 h », « Terraferma l'emporte » vérifiés sur la plaque), les Avis (plus de « Premiers pas »), puis un rival de la semaine tenu par l'ordinateur au long pseudo (réponse de `GET /api/game` réécrite) : son nom se coupe, jamais le sceau « PNJ » ni l'écart. Après chaque étape, `e2e/assert.mjs` échoue sur :
une page qui défile de côté, deux blocs du HUD l'un sur l'autre, le HUD sur un nom ou un médaillon
de la carte (`data-map-label`), une cible de moins de 44 px (celles du HUD, et tout bouton ou
lien d'une fenêtre, d'un panneau ou de la bulle du guide, mesuré au doigt autour de son centre),
une ligne de données (`.meta` sans point final) sur deux lignes, une ligne d'identité coupée, un nom
réduit à moins de dix lettres, l'anneau de Lorenzo posé ailleurs que sur ce qu'un doigt touche sous
son centre, une pièce des effets restée à l'écran (sur la bulle du guide comprise).

```
pnpm --filter @comptoirs/web build && pnpm --filter @comptoirs/web e2e
```

`PERF=1` mesure la Terraferme d'un jeudi à 40 marchands sur un téléphone (processeur ralenti
×4) : tâches longues et durée des images à l'ouverture, au déplacement, au zoom et pendant un
rafraîchissement où les troupes changent ; `PERF_PROFILE=1` y ajoute les fonctions les plus
coûteuses (le mieux sur un build non minifié, `npx vite build --minify false`). `PERF_TRACE=1`
y ajoute, d'une trace du navigateur, le travail du fil principal et des tuiles rastérisées à côté
pour chaque phase, ses étapes les plus lourdes et ce qui a fait redessiner (les invalidations) ;
`PERF_ONLY=1` arrête la session une fois la mesure faite (trois minutes environ). Avec
`SIZES=390x844`, la mesure du 26 octobre 2026 donne :

| Mesure | Avant | Après |
| --- | --- | --- |
| Ouverture : tâches longues | 1,2 s | 0,67 s |
| Trois glissés : tâches longues | 1,2 s | 0,39 s |
| Trois glissés : travail du navigateur | 2,4 s (script 0,44 s, styles 0,78 s) | 0,6 s (script 0,06 s, styles 0,07 s) |
| Zoom (10 crans) : tâches longues | 1,2 s | 0,44 s |

Le 27 octobre 2026, la Terraferme était redevenue lente : les fronts marchaient en animation CSS
(un pointillé, un remplissage), que le navigateur redessine soixante fois par seconde, et
dans le terrain fondu par un flou, rastérisé à nouveau à chaque image, même carte immobile. Les
fronts sont passés dans un SVG à eux, seuls ceux du marchand et ceux qui marchent sur lui
avancent, dix pas par seconde depuis un minuteur ; le fondu des bords se fait par deux dégradés ;
pendant le rejeu de l'absence, les marqueurs ne sont plus refaits ni remesurés à chaque image.
Même banc, même machine, `PERF=1 PERF_TRACE=1` :

| Mesure | Avant | Après |
| --- | --- | --- |
| Carte immobile, 5 s : fil principal | 2,8 s | 1,0 s |
| Carte immobile, 5 s : rastérisation | 0,46 s | 0,03 s |
| Trois glissés : tâches longues | 1,0 s | 0,1 s |
| Trois glissés : rastérisation | 1,4 s | 0,02 s |
| Zoom (10 crans) : tâches longues | 1,3 s | 0,98 s |
| Ouverture : tâches longues | 0,82 s | 0,52 s |

`LANG=en` joue la même session dans l'interface anglaise (`/?lang=en`), aux deux formats et sous
les mêmes règles d'`assert.mjs` ; les mots que le script lit sont dans la table `WORDS` de
`layout.mjs`. Les captures vont alors dans `SHOTS` (par exemple `e2e-shots-en`).

`REPEAT=n` rejoue la session n fois, chaque fois sur un serveur neuf (monde vide, horloge à son
départ, limites de connexion par adresse et stock du jour de la Dogana intacts), et compte les
exécutions sans défaut.

## Stabilité

| Date | Commande | Résultat |
| --- | --- | --- |
| 21 octobre 2026 | `REPEAT=20` (headless shell 1194, les deux formats côte à côte) | 20/20 sans défaut, 152 à 154 s chacune |

Une première mesure, sur un seul serveur pour les vingt exécutions, a échoué 6 fois sur 20 pour
des raisons du banc et non du jeu : la limite de 10 liens de connexion par adresse et par
quart d'heure (exécutions 6 à 8), puis le stock du jour de la Dogana épuisé par les marchands des
exécutions précédentes (exécution 10, plus de blé à acheter pour le moulin). D'où un serveur par
exécution, comme en CI.
