# Test de mise en page (e2e)

`apps/web/e2e/layout.mjs` joue la première session complète sur deux téléphones (390 × 844 et
320 × 568) : connexion, nom, guide de Lorenzo jusqu'à « Bravo » (objectif 6/6, récompense du Livre
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
