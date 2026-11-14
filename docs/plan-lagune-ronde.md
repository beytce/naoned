# La lagune ronde : plan (refonte de la carte de la planche)

*Proposé le 14 novembre 2026. Demande du porteur : « la carte du jeu est devenue illisible et très laide », une nouvelle disposition des villes et des joueurs. Disposition choisie le 14 novembre parmi trois (la lagune ronde, le croissant, les colonnes redessinées) : **la lagune ronde**, l'axe ouest **en eau claire**, le placement des nouveaux joueurs **comme aujourd'hui**. Remplace la carte de `docs/plan-lagunes.md` G1 et G5 ; tout le reste de ce plan-là tient. **En attente de validation** avec les recommandations du § 7.*

## 1. Le problème à régler

La carte d'une lagune (`packages/engine/src/planche/lagune.ts`) pose quatre sestieri en colonnes côte à côte : 52 cases sur 26.

- **Elle ne tient dans aucun écran** : vue de biais, le ruban traverse l'écran en diagonale ; au téléphone on n'en voit qu'un morceau.
- **Douze villes en file** sur le bord nord : leurs étiquettes s'empilent, rien ne dit laquelle est à qui.
- **48 Maisons en grille identique** : aucun repère pour reconnaître son sestiere.
- **Tout le Large sur neuf rangées** : bouches, détroits, détroits noirs, détroits de la Muda, villes lointaines ; les étiquettes se recouvrent.
- **La dalle d'encre** : la moitié sud est un quadrillage noir.
- **Une inégalité** : le Rialto et le môle de San Marco sont entre Castello et Dorsoduro. Une Maison de Cannaregio ou de San Polo est à 15 à 30 cases du Rialto, une Maison du milieu à 2 à 17. La règle d'or 6 n'est pas tenue par la carte.

Après cette étape : une planche **carrée de 41 cases**, le Rialto au centre, les quatre sestieri autour, l'encre en couronne ; la vue « lagune » la montre entière ; chaque sestiere est le même quart, tourné.

## 2. Ce que voit le joueur

| Où | Ce qu'il voit |
| --- | --- |
| **Le centre** | Le Rialto et, juste au sud, le môle de San Marco : à la même distance de tous. |
| **Sa diagonale** | Dans l'ordre depuis le centre : les douze îles de son sestiere en trois arcs (3, 4, 5), ses trois villes sur un croissant de rivage, sa bouche, son détroit, sa ville du Large dans le coin de la planche. |
| **Les axes** | Ce qui est à tous : Murano au nord et Chioggia au sud, chacune derrière son canal ; à l'est le couloir de la Muda et ses trois détroits ; l'ouest en eau claire ; au large, sur le nord, le sud et l'ouest, les trois détroits noirs. |
| **L'encre** | Une couronne sombre qui se resserre depuis les coins, sa ligne dessinée sur l'eau ; plus de dalle quadrillée, un îlot sous chaque ville du Large. |
| **Vue lagune** | Toute la planche, centrée. Étiquettes : les sestieri, les villes, sa Maison. Les tours sont des objets, sans texte. |
| **Vue sestiere** | Son quart, de la première île à sa bouche. Étiquettes : les Maisons et les passages du quart. |
| **Les fils** | En courbe le long de l'eau ; les siens en rouge, ceux des autres en encre fine. |

Les sestieri gardent leur ville du Large : Cannaregio au nord-ouest (Raguse), Castello au nord-est (Alexandrie), Dorsoduro au sud-est (Constantinople), San Polo au sud-ouest (Candie).

## 3. Les règles

Aucune règle de jeu nouvelle : mêmes villes, mêmes demandes, mêmes passages, mêmes sceaux, même péage. Trois choses changent de mesure.

### 3.1 La carte

- **Le quart est donné en cases entières** dans le thème, pour un seul sestiere (le nord-est) ; le moteur le tourne d'un quart de tour pour les trois autres : `(x, y) → (−y, x)`. Pas de trigonométrie, pas de float ; l'égalité des sestieri est exacte par construction.
- **Le quart proposé** (cases comptées depuis le Rialto, x vers l'est, y vers le sud), à ajuster à l'œil au lot L4 :

| Quoi | Cases |
| --- | --- |
| Arc du centre (3 îles) | (2,−6) (4,−4) (6,−2) |
| Arc du milieu (4 îles) | (3,−9) (6,−8) (8,−6) (9,−3) |
| Arc du rivage (5 îles) | (3,−12) (6,−11) (9,−9) (11,−6) (12,−3) |
| Ses trois villes | (4,−15) (9,−12) (15,−4) |
| Sa bouche, son détroit, sa ville du Large | (12,−12) (15,−15) (17,−17) |

- **Les axes**, donnés une fois : Murano (0,−14) et son canal (0,−11) ; Chioggia (0,14) et son canal (0,11) ; le môle (0,2) ; la Muda (8,0) (13,0) (17,0) ; les détroits noirs (0,−19) (0,19) (−19,0).
- **Les identifiants ne changent pas** (`castello-3`, `bouche-castello`, `murano`…) ni l'ordre des Maisons : une lagune en cours se recharge telle quelle, ses Maisons simplement ailleurs. À prouver par un test de rejeu (lot L1).
- **Le placement d'un joueur** ne change pas : la première Maison libre.

### 3.2 L'encre

- Elle se compte aujourd'hui en rangées depuis le sud (`y`). Elle se comptera en **distance au Rialto**, en centièmes de case, par une racine entière (déterministe).
- Les seuils tombent aux mêmes valeurs : bouches à 17 (16,97), détroits à 21 (21,21), villes du Large à 24 (24,04), contre les rangées 17, 21 et 24 d'aujourd'hui. `encre.start` = 25 et `encre.limit` = 15 gardent leur sens ; la ligne enregistrée d'une lagune en cours reste valable.
- Prix et pertes sur l'encre, tours reprises le lundi, menace du samedi : inchangés, lus à la distance au lieu de la rangée.

### 3.3 Les distances

- Seul le **rembobinage** d'un fil dépend de la distance (cases × `rewindMsPerTile`). Mesure sur le quart proposé, en cases :

| Depuis une Maison | Aujourd'hui | Lagune ronde |
| --- | --- | --- |
| Sa ville la plus proche | 6 à 13 | 3 à 11 |
| Le Rialto | 2 à 30 selon la colonne | 8 à 18 pour tous |
| Sa bouche | 5 à 15 | 6 à 16 |

- Les **sorties des capitaines** visent la tour « voisine » : le voisinage change avec la carte, à relire au banc marée.

## 4. La technique

- **Moteur** (`planche/lagune.ts`) : `LagoonParams` perd `column`, gagne `quarter` (les cases du quart) et `axes` ; `plancheLagoon` tourne le quart ; `plancheLagoonLand` rend les croissants de rivage, les îlots et un péril radial. Une fonction pure `plancheDepth(S, x, y)` donne la distance au centre ; `encre.ts` et les deux appels de `planche.ts` (prix, perte) la prennent au lieu de `y`.
- **Thème** (`venice1450.lagune.ts`) : le quart, les axes, les détroits noirs et ceux de la Muda en cases de la nouvelle carte.
- **Web** (`PlancheBoard.tsx`, `LabPlanche.tsx`) : le sol (croissants, îlots, plus de dalle), l'eau lavée en couronne, la ligne d'encre en cercle, la caméra par niveau (lagune : le centre ; sestiere : le milieu du quart), le nom des sestieri sur l'eau entre le premier et le deuxième arc, les étiquettes par niveau, les fils en courbe.
- **Serveur** : rien à écrire ; la carte vient du thème (`board: venice1450Lagune`). Pas de migration de base.
- La planche à 8 Maisons (`venice1450.planche.ts`, hors ligne) n'est pas touchée.

## 5. Les lots

Un commit par lot, tests du moteur écrits d'abord, sur des fixtures.

| Lot | Contenu | Fini quand |
| --- | --- | --- |
| **L1 La carte** | Le générateur par quart tourné ; tests : une île par case, une case d'eau au moins entre deux îles, les quatre sestieri aux mêmes distances de tout (exactement), toute ville atteinte par le détour, carte identique à chaque tirage, identifiants inchangés ; un état de l'ancienne carte se relit sur la nouvelle. | `pnpm test` vert. |
| **L2 L'encre en couronne** | `plancheDepth`, l'encre et le péril à la distance ; les terres et les îlots. Tests : mêmes tours menacées et reprises qu'avant aux mêmes seuils. | `pnpm test` vert. |
| **L3 Le thème et la mesure** | Le quart de Venise ; bancs `planche` (BOARD=lagune), `maree`, `hex`, `muda`, `guerre` ; `docs/calibration.md` § La lagune ronde ; `rewindMsPerTile` retouché seulement si la mesure le demande. | Les bancs dans leurs fourchettes, ou l'écart expliqué. |
| **L4 Le dessin du sol** | Le sol, l'eau, l'encre, la caméra par niveau, les noms des sestieri ; le quart ajusté à l'œil. | Capture « lagune » entière, en paysage et au téléphone. |
| **L5 Les fils** | Les fils en courbe, ceux des autres décalés pour ne pas se superposer. | Captures d'un sestiere chargé de fils. |
| **L6 Les étiquettes et les repères** | Les étiquettes par niveau ; un campanile par sestiere sur son rivage. | Aucune étiquette n'en recouvre une autre aux trois niveaux. |
| **L7 Les parcours** | `e2e:planche`, `planche-online`, `semaine`, `maree` relancés, captures refaites ; `plan-lagunes.md` et `CLAUDE.md` mis à jour. | Les parcours passent. |

L1 à L3 peuvent être fusionnés seuls : la carte est jouable avec l'ancien dessin, en moins beau. L4 à L6 font le gain visible.

## 6. Ce qui reste hors périmètre

- Une quatrième ville de la lagune sur l'axe ouest (décidé : eau claire).
- Toute retouche des demandes des villes, des péages, des sceaux.
- La planche à 8 Maisons et l'ancien jeu.

## 7. À trancher

1. **La forme de l'encre.** Ronde, à la distance au Rialto **(recommandé)** : elle épouse la lagune et garde les seuils actuels. Ou carrée, parallèle aux bords : plus simple à dessiner, mais les coins et les axes ne noircissent plus ensemble.
2. **Les fils en courbe (L5).** Dans cette étape **(recommandé)** : les coudes à angle droit sont une bonne part du désordre. Ou plus tard, pour livrer la carte plus tôt.
3. **Un campanile par sestiere (L6).** Dans cette étape **(recommandé)**, en dernier, comme simple décor. Ou noté dans `IDEAS.md`.
4. **Les lagunes en cours.** Elles passent à la nouvelle carte au déploiement **(recommandé)** : pas de joueurs avant la bêta, les identifiants et l'encre tiennent. Ou une annonce dans les notes de chapitre avant de l'appliquer.
