# Le « Plateau de nuit » : où en est le travail, et comment le reprendre (2 novembre 2026)

Document de reprise pour une autre session. Il dit ce que le porteur a décidé, ce qui est fait dans le jeu, comment c'est construit, comment le vérifier, et ce qui reste, dans l'ordre.

## 1. Les décisions du porteur (elles font foi)

Prises au fil de la session du 1er au 2 novembre 2026, dans cet ordre :

1. **La direction validée est le « Plateau de nuit »** : un monde de tuiles hexagonales épaisses, low-poly, sous une seule lumière, comme un jeu de plateau (références du porteur : des diorama Blender en tuiles hexagonales, toits bleus, sapins, rochers), posé sur le **bleu nuit du jeu actuel**. Elle remplace la direction Lagune **pour la carte** ; l'interface garde ses règles (une seule action en or, Cinzel / Archivo / Space Grotesk, feuilles du bas). Voir `docs/design.md`, § Direction « Plateau de nuit ».
2. **Peu de couleurs** : bleu nuit (fond et interface), sable-or pour vos terres, gris-bleu pour les terres vues et la pierre, lagune pour la végétation et ce qui est prêt, lapis pour la sélection et la mer, or seulement pour ce qui est à vous et pour l'action, cinabre seulement pour le danger (la Porta). Les couleurs des marchandises restent (elles disent la chaîne).
3. **Aucune image peinte** sauf le portrait de Lorenzo : tout est dessiné en vecteur (les îles peintes générées plus tôt sont abandonnées ; leurs fichiers restent dans `apps/web/art-src/islands/`, non branchés).
4. **Rien qui lévite** ; **pas de bateau, de serpent de mer ni de rose des vents** sur la carte ; **pas de pastille du nombre de commandes** sur les villes (l'anneau suffit).
5. **Les bulles du bas comme avant** (Recentrer à gauche ; Marché, Compagnie, Famille à droite), **épurées** : rond bleu nuit, filet clair, icône au trait, nom dessous sans pastille.
6. **Les monnaies en haut à droite, en colonne** (le porteur tient à la colonne, ne pas les mettre en ligne), **frappées en relief** ; la perle (monnaie précieuse) sans socle.
7. **Les véhicules** : des médailles de même taille, le véhicule **de profil** dedans (parchemin cerclé d'or pour le transport, rouge cerclé d'acier pour le combat). Les vues de dessus ont été rejetées.
8. **La vue 2,5D inclinée** de toute la carte, et le plan `docs/plan-plateau.md` : validés.

## 2. Les références

- **La toile de design** (privée, au compte du porteur) : https://claude.ai/artifact/LSdeS2qALEqBp3EwcyQXX6 — planches « 0 · Le système », « 1 · La carte », « 2 · Le fondaco en orbite », « 3 · Une ville », « 4 · Le marché », « 5 · La Remise », « 6 · Famille », « 7 · La Compagnie », « 8 · La Porta ». Elle fait foi pour ce qui reste à intégrer (les feuilles, les véhicules en médailles). Pour la lire : l'outil Artifact, action `read`, avec `path` = `project/<Planche>.dc.html`.
- **Le moteur de référence en Python** : `docs/direction-artistique-2026-11/plateau/` (`iso.py`, et les scènes `main_map.py`, `orbit_map.py`, `others.py`, `kit.py`) ; aperçus `carte.png`, `kit.png`. Le moteur du jeu en est le portage (voir § 4).
- **Captures du jeu** (parcours `e2e:empire`, 390 × 844) : `docs/direction-artistique-2026-11/plateau/jeu/`.
- **Revues d'experts** appliquées sur la maquette (UI et UX) : résumées au § 6 pour ce qui n'est pas encore dans le jeu.

## 3. Ce qui est fait dans le jeu

Branche `claude/tender-keller-xfvor1` (à jour de `claude/brave-rubin-8rti3o`, la branche par défaut du dépôt, au 2 novembre). Un commit par fonctionnalité :

| Commit | Contenu |
| --- | --- |
| `Web: the night board's renderer…` | `apps/web/src/art/plateau/` : `geom.ts`, `props.ts`, `board.ts`, `Plateau.tsx` ; `apps/web/test/plateau.test.ts` |
| `Web: the empire map on the night board…` | `EmpireMap.tsx`, `Fleet.tsx`, `logic.ts`, `index.css`, `e2e/empire.mjs` |
| `Web: the fondaco up close…` | `Orbit.tsx`, `art/plateau/workshops.ts` |
| `Web: the camera and its tests on the tilted board…` | `logic.ts`, `test/empireMap.test.ts` |
| `Web: the purse struck in relief…` | `art/plateau/coins.tsx`, `Hud.tsx`, `.purse` dans `index.css` |
| `Web: the round buttons, plainer` | `RoundButtons.tsx` |
| `Web: the goods' marks struck in relief` | `art/goods.tsx` (`GoodsMark`) |
| `Docs: the night board…` | `docs/design.md`, captures |

État vérifié : `pnpm typecheck` propre, `npx biome check .` propre, 225 tests du web verts, parcours `e2e:empire` complet sans faute à 390 × 844.

## 4. Comment c'est construit

### Le moteur (`apps/web/src/art/plateau/`)

- **`geom.ts`** — la projection et l'ombrage. `TILT = 0.58` : un point du plan (x, y) à la hauteur z se voit en (x, y·TILT − z). Une lumière `L` (haut gauche). `faces()` ne garde que les faces tournées vers l'œil (`facesEye` : n_y + TILT·n_z > 0) et les ombre (`lightOf`). Primitives : `box`, `prism` (frustum, rochers par `jit`), `cone`, `gable` (toit à deux pans), `faceQuad` (porte, fenêtre sur la face avant). `rng` (mulberry32) et `hashOf` : la graine d'une case vient de sa clé « q,r ». Tout est pur et déterministe. Les volumes sont convexes : leurs faces visibles ne se recouvrent pas, l'ordre n'importe qu'entre objets.
- **`props.ts`** — la palette `C` (les seules couleurs du plateau) ; la `Scene` (fog, tuiles triées par y, ombres au sol, objets triés par y) ; `tile()` : hexagone **pointe en haut** (la grille du jeu, `art/hexmap.ts`, `HEX_SIZE` = 24), deux strates de `BAND` = 4,2, seules ses deux faces avant (normales à 60° et 120°) sont dessinées, la lagune sans parois entre deux cases d'eau (`wet`) ; `fogTile` ; les modèles : `pine`, `rock`, `mountain`, `house`, `tower`, `flag`, `fondaco`, `kiln`, `barn`, `plots`, `dock`, `town` (taille 1 à 5, facteur d'échelle `k`), `ring`.
- **`board.ts`** — `board(input)` : la carte entière en formes. Entrées : `map.cells` (terres vues), `map.revealed` (tout ce qui est vu ; les cases vues hors `cells` sont la mer), `map.unlocked` (les secteurs à vous → sable-or), `map.cities`, `map.home`, `map.posts`, `map.depot`, `map.camp`, la Porta. Le décor de chaque terre vient de sa région (`DRESS` : montagnes, sapins, rochers, champs) et garde ses distances avec ce qui est bâti (`stands`). **Échelles des modèles sur la carte** (réglées à la main sur les captures) : villes `k` = 0,5, fondaco 0,58, fondaci secondaires 0,34, Remise 0,42, sapins 0,42–0,6, montagnes 0,38–0,52.
- **`workshops.ts`** — `workshopModel(type)` (four, glaisière, coupe de bois, scierie, ferme, moulin, bergerie, palais, défaut maison) et `workshopTile(type)` (une petite tuile et son `viewBox`).
- **`Plateau.tsx`** — `PlateauShapes` : dessine les formes telles quelles (polygones ou chemins), mémoïsé.
- **`coins.tsx`** — `DucatCoin`, `FavourCoin`, `WaxSeal`, `CartWheel` (les dégradés ont un id par pièce, `useId`).

### La carte (`apps/web/src/empire/map/`)

- **L'inclinaison passe partout où la carte touche l'écran** ; c'est le point délicat. Chaque endroit qui convertit un y du plan en y d'écran le multiplie par `TILT` :
  - `logic.ts` : `centredOn`, `coverClamp` (hauteur `CHART.h·TILT`), `farCamera` (cadrage en hauteur) ; `coverScale` est **gardé sans TILT** (sinon le plus loin zoomerait trop) : au plus loin, le plateau peut être plus court que l'écran et se centre sur la nuit ;
  - `EmpireMap.tsx` : `orbitOn`, `toChart` (y ÷ TILT), le placement des repères (`[data-at]` → `top = y·TILT·base`), la hauteur des calques, la place de l'orbite ouverte ;
  - `Fleet.tsx` : le SVG des trajets (contenu dans `<g transform="scale(1 TILT)">`), les positions des véhicules, des minuteurs et des arrivées.
- **`Chart`** (mémoïsé sur la carte, jamais sur l'horloge) : `PlateauShapes` du `board(...)`, puis, dans un groupe incliné, les routes, les cases achetables, la pose d'un fondaco, la portée. L'ancien fond (`MediterraneanGround`, masque de brouillard, tuiles texturées, `data-frontier`) est retiré. Le choix d'un point de pose passe par la matrice de l'élément touché (`getScreenCTM` de la case, qui inclut l'inclinaison).
- **Les repères HTML** (`HomeMark`, `CityMark`, Remise, Campo, Porta, fondaci) gardent leurs zones tactiles, leurs noms et leurs comportements ; leurs bulles sont retirées (les modèles sont sur le plateau). L'anneau de commandes d'une ville reste en HTML (il change avec l'horloge, la carte non) : aplati au sol (`scaleY(TILT)`), lagune qui se remplit, or plein. Les repères grandissent avec la carte (`--chartk`, déjà en place).
- **L'orbite du fondaco** (`empire/Orbit.tsx`) : l'orbite est aplatie (`FLAT` = 0,72, distinct de `TILT` pour garder de la place), chaque atelier sur sa tuile (`WorkshopTile`), son arc de production aplati autour, sa marchandise en petit.
- **CSS** (`index.css`, fin du fichier) : `.plateau-wave`, `.plateau-fog`, `.plateau-flag`, `.purse`, coupés sous `prefers-reduced-motion`.

### Les tests touchés

- `test/plateau.test.ts` (nouveau) : projection, faces visibles, ombrage, déterminisme du plateau, graines.
- `test/empireMap.test.ts` : deux attentes réécrites pour l'inclinaison (« couvre l'écran » → le plateau, s'il est plus court que l'écran, se centre ; le cadrage au plus loin en y·TILT).
- `e2e/empire.mjs` : la vérification des silhouettes autour de Venise lit maintenant `[data-plateau] .plateau-fog`.

## 5. Vérifier

```bash
pnpm install --frozen-lockfile
pnpm --filter @comptoirs/web typecheck && npx biome check . && npx vitest run apps/web/test
pnpm --filter @comptoirs/web build
CHROMIUM=/opt/pw-browsers/chromium SIZES=390x844 SHOTS=/tmp/shots pnpm --filter @comptoirs/web e2e:empire
```

- Dans le conteneur des sessions cloud, Playwright ne trouve pas son navigateur tout seul : `CHROMIUM=/opt/pw-browsers/chromium` est nécessaire.
- Les captures de chaque étape du parcours sortent dans `SHOTS` (`390x844-9-carte.png`, `…-2-maison.png`, `…-14-commandes.png`, `…-19-dezoom.png`…) : c'est la façon la plus sûre de voir la carte.
- En local : `WORLD_KIND=empire pnpm dev`.
- Ne pas réécrire l'historique de la branche (une poussée forcée a été refusée) : pour se remettre à jour, fusionner `origin/claude/brave-rubin-8rti3o` plutôt que rebaser.

## 6. Ce qui reste, dans l'ordre

1. **Retours du porteur sur la carte** (il a demandé à la voir avant de continuer) : les captures sont dans `docs/direction-artistique-2026-11/plateau/jeu/`. Les réglages probables sont des échelles (§ 4, `board.ts`) et la densité du décor (`DRESS`).
2. **Les véhicules en médailles** (`Fleet.tsx`, `VehicleGlyph` dans `art/veneto.tsx`) : la médaille et les silhouettes de profil sont dans la toile (planche « 0 · Le système », section « Les véhicules » ; le code des silhouettes est dans le script des planches : `VEH` avec `sil`, `acc`, `hole`, `line`, styles `TR` transport et `CB` combat). Même taille pour tous ; elles glissent droites sur la route.
3. **Les signaux d'action sur la carte** (revue UX, déjà dans la maquette « 1 · La carte ») :
   - une pastille « lots prêts » (verte, avec une caisse) au-dessus du fondaco, qui ouvre l'orbite ;
   - une caisse dorée qui flotte au-dessus d'une ville quand une commande y est livrable tout de suite ;
   - une ville pleine : anneau d'or et une onde (`ripple`) toutes les 4 s ;
   - un « + » doré sur les cases achetables voisines de vos terres (les autres sombres) ;
   - l'heure d'arrivée d'un véhicule écrite sur sa ville de destination ;
   - des zones tactiles en hexagone pour les lieux, sans chevauchement.
4. **Les feuilles** (lot 5 du plan), d'après les planches de la toile :
   - la ville (« 3 · Une ville ») : mini-anneau au lieu de « n / m », stock sous chaque commande, rappel de l'atelier qui livre ce qui manque, lien vers la ville suivante ;
   - la Remise (« 5 · La Remise ») : façon chantier naval d'Hades' Star, une carte par véhicule (médaille, niveau, phrase, possédés, prix), la jauge de la Remise (places prises sur le plafond), « Acheter » en or tant qu'il y a une place ;
   - la Famille (« 6 · Famille ») : le palais de la Casa sur sa tuile en tête.
5. **Performance** : `PERF=1` (voir `docs/e2e.md`) sur une carte étendue ; si besoin, un niveau de détail au dézoom (tuiles sans décor sous une échelle donnée) et le découpage du plateau par case.
6. **Contrastes** : `test/theme.test.ts` et `test/goods.test.ts` passent ; vérifier les noms posés sur les tuiles sable-or (halo sombre des `.map-name`).
7. **Lorenzo** : le guide du jeu pousse déjà l'action prioritaire (« Un atelier attend · Tout relancer », « Livrez… ») ; rien à faire sauf écart constaté.
