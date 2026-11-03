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

## 7. La carte en 3D (prototype le 2 novembre, intégration le 3 novembre 2026, branche `claude/carte-3d-prototype`)

Le porteur veut le rendu « pâte à modeler » de ses références : un vrai diorama en 3D temps réel, un mini monde vivant où les mules et les charrettes bougent pendant les livraisons. Le SVG du plateau ne fait que l'imiter. Après le prototype isolé du 2 novembre, le porteur a validé le plan d'intégration (3 novembre) ; il est fait, **derrière un drapeau** : la carte SVG reste celle du jeu par défaut, intacte (ses tests et `e2e:empire` sans drapeau ne changent pas). La bascule par défaut reste à décider par le porteur, après des mesures sur de vrais téléphones.

### L'ouvrir

- `?map=3d` dans l'adresse (lu au chargement du jeu ; par exemple `…/connexion?token=…&map=3d`), ou un build avec `VITE_MAP=3d`. Le plateau 3D est un fragment de code à part (`Board3D-*.js`), chargé seulement alors, hors du cache de la PWA comme les modèles.
- Pour le développement : `&fx=0` (sans effets), `&perf=1` (sonde d'images, `window.__m3d`), `&tone=agx`.

### L'architecture : la même carte, son sol en 3D

L'idée qui porte tout : une caméra orthographique inclinée à sin(hauteur) = `TILT` voit le sol **exactement** comme la carte SVG le dessine (un point (x, y) de la carte en (tx + x·s, ty + y·TILT·s) à l'écran). Donc :

- **La caméra du jeu reste celle du jeu** (étape 3 du plan) : `useCamera`, `logic.ts` (`centredOn`, `farCamera`, `zoomBounds`…), les glissés et leurs tests ne changent pas ; à chaque peinture, `EmpireMap` passe sa caméra au plateau (`Board3DHandle.view`), traduite par `map3d/camera.ts` (`orthoFrom`), testée au pixel près contre une vraie caméra three.js (`test/map3dCamera.test.ts`).
- **Tous les calques HTML de la carte se posent sur le diorama au pixel près**, sans réécriture : noms, anneaux de commandes, médailles des véhicules et leurs glissés, orbite des ateliers, minuteurs de chantier, cases à acheter et de pose, portée.
- `EmpireMap` monte `Board3D` sous ses calques quand le drapeau est levé (`map3d/flag.ts`, sans three.js) et retire alors le plateau SVG (`PlateauShapes`), le fond de nuit et les brumes.

### Ce qui est fait, étape par étape (un commit chacune)

1. **Remplacer la carte SVG** (`map3d/Board3D.tsx`) : tuiles (les vôtres sable-or, les vues gris-bleu, socles bleu nuit), lagune translucide aux vaguelettes, l'inconnu en silhouettes au ras du sol (les contours dorés des secteurs à acheter tombent dessus), décor par région (`DRESS`, mêmes graines que le SVG), villes et campaniles, fondaco (toit d'or, tour, fanion qui flotte, fumée), fondaci secondaires, Remise, Campo, Porta (arche cinabre), et les **voies** de terre battue du fondaco à chaque ville, le décor tenu à l'écart (`scene.ts`, testé).
2. **Le toucher par raycast** : chaque lieu a une zone hexagonale invisible dans la scène, jamais sur celle d'un voisin (rayon borné à la moitié de la distance au lieu le plus proche, `zones()`, testé). `useCamera` transmet le point touché ; `Board3D.hit()` lance le rayon ; `touchPlace()` (une seule fonction, partagée par les repères HTML) fait ce que fait le repère. En 3D, les repères laissent passer le doigt (`[data-three]`, `index.css`) mais restent pour le clavier et les noms. La pose d'un fondaco lit le point du sol par le rayon de la caméra (`groundAt`) ; le parcours vérifie qu'il tombe à moins d'une unité du point que lit la case SVG.
3. **La caméra existante** : voir l'architecture ci-dessus.
4. **Les véhicules réels** (`map3d/fleet3d.tsx`) : un animal par véhicule, placé à chaque image à l'heure du serveur par `fleetSpots` (`logic.ts`, la même fonction que les médailles de `Fleet`, testée) : la mule bâtée de deux caisses, la charrette (roues qui tournent selon la distance), le combattant (cinabre, lance). Il marche (cycle `Walk`) seulement pendant un trajet, se repose (`Idle`) sinon ; plus aucun trajet inventé. En 3D, l'orbite des véhicules à l'arrêt passe **au sud** de leur lieu (devant les bâtiments, jamais derrière), et la médaille se pose au sol juste devant son animal.
5. **Le fondaco de près** : touché, ses ateliers se déploient comme avant (l'orbite HTML : arcs, noms, boutons, « Bâtir ») et chacun se dresse **sur une petite tuile 3D** là où l'orbite le place (`orbitOf`, exporté d'`Orbit.tsx` ; `EmpireMap` convertit en points de la carte, l'orbite étant plafonnée à 24rem) : forge (briqueterie, verrerie), mine (glaisière, sablière), coupe de bois, scierie, champ (ferme), moulin, église (palais), maison sinon ; un chantier montre ses caisses, la place libre sa tuile nue. `Orbit` en mode `on3d` laisse les tuiles et la couronne du soleil à la 3D.
6. **Qualité adaptative et modèles regroupés** :
   - l'occlusion ambiante (N8AO) est coupée pendant un geste (son passe désactivé sans rendu React), rallumée 220 ms après ;
   - `PerformanceMonitor` (drei) la coupe pour de bon si l'appareil tombe sous 18 images/s ;
   - au dézoom (sous 3,6 px par unité), sapins et rochers ne sont plus dessinés ;
   - aucune image au repos (`frameloop="demand"`, et le plateau ignore les repeints de la carte quand sa caméra n'a pas bougé) ;
   - les 21 modèles KayKit en **un seul fichier** `public/models/kaykit.glb` (`apps/web/scripts/pack-models.mjs`, depuis les originaux intacts dans `apps/web/art-src/models/kaykit/`) : soudés, quantifiés (`KHR_mesh_quantization`), sans l'atlas (le jeu ne le lit pas ; la CSP refuserait de toute façon son `blob:`), les UV gardés (ils disent la couleur). 739 Ko (250 Ko compressé), une requête au lieu de 44. Le décodeur Meshopt est écarté : la CSP du jeu interdit le WebAssembly.
7. **Tests et parcours** :
   - `test/map3d.test.ts` (scène, voies, Campo et Porta, zones, recoloration), `test/map3dCamera.test.ts` (caméra et rayon au pixel près), `test/empireHops.test.ts` (`fleetSpots`, dont l'orbite au sud) ;
   - `MAP3D=1 … pnpm --filter @comptoirs/web e2e:empire` : **tout le parcours de l'empire sur la carte 3D**, sans faute (les repères y sont touchés à leur milieu, par la scène) ; sans `MAP3D`, le parcours SVG est inchangé et passe ;
   - `pnpm --filter @comptoirs/web e2e:map3d` : fondation en 3D (pose vérifiée), toucher de Padoue et du fondaco par la scène, une mule envoyée à Padoue, le dézoom, la vidéo, les mesures (`PERF=1`).

### Captures, vidéo, mesures (`docs/direction-artistique-2026-11/carte-3d/`)

- `1-depart.png` (la carte de départ en 3D, les deux mules devant le fondaco), `1b-padoue.png` (Padoue touchée par la scène : sa feuille), `2-fondaco.png` (le fondaco touché : ses ateliers sur leurs tuiles 3D), `2b-fondaco-touche.png` (touché encore : la Casa), `3-mule.png` (une mule en route vers Padoue), `4-dezoom.png` (au plus loin que la caméra du jeu permet au départ : un secteur), `mule.webm` (13 s d'allers-retours d'une mule entre Padoue et Venise), `perf.json`.
- Dans le conteneur : `PLAYWRIGHT_BROWSERS_PATH` doit pointer vers un dossier où `ffmpeg-1010` est un lien vers `/opt/pw-browsers/ffmpeg-1011` (la vidéo), en plus de `CHROMIUM=/opt/pw-browsers/chromium`.
- Mesures dans Chromium à 390 × 844, CPU ralenti ×4. Ce conteneur n'a **pas de GPU** : le WebGL y est rendu en logiciel (SwiftShader) ; les images par seconde y sont très pessimistes, le travail CPU par image est le chiffre parlant.

  | Situation | Images/s | Écart entre images (médiane / p95) | Travail CPU par image (médiane / p95) |
  | --- | --- | --- | --- |
  | Immobile (mouvement réduit), au repos | 0 (aucune image) | — | — |
  | Immobile, pendant un pan | 6,1 | 143 / 355 ms | 9,3 / 18,4 ms |
  | Vivante, au repos | 3,8 | 250 / 336 ms | 13,1 / 23,7 ms |
  | Vivante, pendant un pan | 7,0 | 137 / 311 ms | 9,4 / 18,5 ms |
  | Vivante sans effets (`fx=0`), au repos | 14,4 | 66 / 124 ms | 8,3 / 22,1 ms |
  | Vivante sans effets, pendant un pan | 13,9 | 66 / 157 ms | 9,3 / 16,5 ms |

  Environ 57 appels de dessin et 29 000 triangles par image. Les effets restent la grosse part en rendu logiciel, même N8AO coupé pendant le pan (la chaîne d'effets — rendu hors écran, tone mapping, tilt-shift — double le coût) ; les animaux animés (squelettes) pèsent sur la scène vivante.
- Poids : le fragment 3D fait 1 153 Ko (354 Ko en gzip), chargé seulement avec le drapeau ; le bundle sans drapeau : +4 Ko ; le cache de la PWA : inchangé ; les modèles servis : 1 050 Ko (354 Ko en gzip), dont `kaykit.glb` 739 Ko et l'âne 300 Ko.

### Limites

- **Réseau du conteneur** : kenney.nl, quaternius.com, unpkg et jsdelivr refusés. KayKit vient de son dépôt GitHub ; le « Hexagon Kit » de Kenney n'a pas pu être pris (les tuiles sont faites dans le code) ; l'âne Quaternius vient d'une copie publique du pack sur GitHub, avec sa licence CC0 : **à revérifier contre l'archive officielle avant la production**.
- **Modèles** : maisons KayKit à colombages (plus médiévales que vénitiennes) ; pas de mule chez Quaternius (un âne) ni de cheval pour les combattants (un âne sous un drap cinabre) ; les ailes du moulin ne tournent pas (modèle d'un seul tenant) ; le château écarté pour son poids (le palais est une église).
- **La caméra du jeu plafonne le zoom** près de la vue de départ (environ 9 px par unité sur un téléphone, `scaleBounds`) : un animal y fait une trentaine de pixels. C'est la caméra du jeu, gardée telle quelle comme le plan le voulait ; la rapprocher est une décision de jeu.
- **Ombres** : PCFSoft ignore le rayon de flou ; ce qui bouge a une ombre ronde au sol, pas d'ombre portée.
- **Mesures** : sans GPU, les images par seconde ne disent pas ce que donnera un téléphone.

### Suite proposée (à décider par le porteur)

1. **Mesurer sur de vrais téléphones** (Android moyen de gamme, iPhone SE) avec `?map=3d&perf=1` ; selon le résultat, régler la chaîne d'effets (tilt-shift seulement au zoom proche, ou pas d'effets du tout sous un seuil) et le seuil de `PerformanceMonitor`.
2. **La bascule par défaut** (`VITE_MAP=3d`, puis retrait du plateau SVG `art/plateau/board.ts` et de son décor), décision du porteur.
3. Les signaux d'action du § 6 (pastille « lots prêts », caisse dorée, onde des villes pleines) en 3D, posés dans la scène.
4. Revérifier la provenance de l'âne ; ajouter Kenney si le domaine est autorisé ; un cheval CC0 pour les combattants.
