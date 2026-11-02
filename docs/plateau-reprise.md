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

## 7. Prototype 3D (2 novembre 2026, branche `claude/carte-3d-prototype`)

Le porteur veut le rendu « pâte à modeler » de ses références : un vrai diorama en 3D temps réel, un mini monde vivant où les mules et les charrettes bougent pendant les livraisons. Le SVG du plateau ne fait que l'imiter. Ce prototype est **isolé** : la carte SVG reste celle du jeu, par défaut et intacte (ses tests et le parcours `e2e:empire` ne changent pas).

### L'ouvrir

- `?map=3d` dans l'adresse (ou un build avec `VITE_MAP=3d`). La carte 3D est un fragment de code à part (`Map3D-*.js`), chargé seulement dans ce cas, et hors du cache de la PWA, comme les modèles.
- `?map=3d&scene=veneto` : la Vénétie vue plus large. On y voit la vraie carte du jeu (cellules et villes du moteur, `venice1450Empire.map`) à deux secteurs autour de la maison : la mer en lagune, les terres vues, deux secteurs vénitiens à soi et une Remise posée pour la démonstration. Au départ réel, la maison ne voit qu'un secteur (« 2,4 »), sans mer ni Remise.
- Pour le développement : `&suivre=mule` (la caméra suit la mule), `&kit=1` (planche de tous les modèles), `&fx=0` (sans effets), `&perf=1` (sonde d'images), `&tone=agx`.

### Ce qui est fait (`apps/web/src/empire/map3d/`)

- **`scene.ts`** (pur, testé dans `test/map3d.test.ts`) : à partir de `p.view.map`, avec la même grille (`cellCentre`, `HEX_SIZE`, pointe en haut), les mêmes graines et le même `DRESS` que `board.ts`, il calcule :
  - une tuile par secteur vu (à soi, vue, eau), et l'inconnu autour ;
  - le décor de chaque secteur ;
  - Venise et Padoue (maisons et campanile) ;
  - le fondaco et la Remise ;
  - les trajets de la mule (du fondaco à Padoue, infléchis du côté loin des villes) et de la charrette, le décor tenu à l'écart.

  `wider()` donne la vue Vénétie.
- **`recolor.ts`** : les modèles KayKit sont recolorés dans le code, sans toucher leurs fichiers. Chaque sommet prend la couleur de la palette `C` (`props.ts`) pour la case de l'atlas que visent ses UV, en gardant un peu du dégradé. L'atlas lui-même n'est jamais lu. Le toit d'or du fondaco est un simple remplacement (`roof → C.roofGold`) ; les terres vues ont des couleurs éteintes.
- **`kit.tsx`** : les glTF fusionnés en une géométrie chacun, posés au sol et à l'échelle d'une unité ; les éléments répétés (sapins, rochers, montagnes, maisons, églises, champs) en `InstancedMesh`, un appel de dessin par modèle ; les tuiles en prismes hexagonaux biseautés (dalle sable-or ou gris-bleu sur un socle bleu nuit).
- **`life.tsx`** :
  - la mule : l'âne de Quaternius avec son cycle `Walk` joué par `AnimationMixer`, deux caisses et un bât bleu, orientée dans le sens de la marche, au repos (`Idle`) à chaque bout ;
  - la charrette : caisse, deux roues qui tournent selon la distance parcourue, brancards, tirée par un âne ;
  - la fumée de la cheminée du fondaco ;
  - le fanion d'or qui flotte (sommets déplacés) ;
  - les vaguelettes de la lagune (déplacement dans le shader) ;
  - une ombre ronde sous ce qui bouge.

  Tout s'arrête sous `prefers-reduced-motion` : la mule reste à mi-chemin, immobile.
- **`Map3D.tsx`** :
  - caméra orthographique inclinée comme `TILT` (le sol vu à 0,58) ; `MapControls` pour le pan et le zoom à la souris et au doigt, bornés à la région ;
  - lumière : hémisphère bleuté et sol chaud, lumière directionnelle du haut à gauche, ombres PCFSoft 2048 calculées une fois puis seulement quand la carte change (`shadowMap.autoUpdate = false`) ;
  - effets : N8AO en demi-résolution, tone mapping ACES (l'AgX délavait l'or en beige : `?tone=agx` pour comparer), tilt-shift au zoom proche ;
  - fond et brouillard bleu nuit ; `frameloop="demand"` et DPR plafonné à 1,5 ;
  - une horloge à 30 images/s tant que quelque chose vit ; rien quand l'onglet est caché ni au repos ;
  - le composant n'est redessiné que si `p` change (pas à chaque tic de l'horloge du jeu) ;
  - le toucher : un raycast sur des zones invisibles plus larges que les modèles ; le fondaco appelle `onTarget({ kind: "casa" })`, une ville `onTarget({ kind: "city" })`, avec un anneau lapis sous ce qui est touché ; un toucher dans la nuit referme ;
  - les noms et l'anneau de commandes de chaque ville en HTML (`Html` de drei) : l'anneau, aplati, se remplit en lagune et passe à l'or quand il est plein. Il suit le zoom tandis que la zone tactile garde 44 px au moins ; les noms (12 px) disparaissent au dézoom ;
  - la poignée `EmpireMapHandle` du jeu (Recentrer, flèches, + et −) est reprise.
- **Modèles** (`apps/web/public/models/`, README avec les auteurs et la licence) : 16 modèles KayKit « Medieval Hexagon Pack » (CC0, Kay Lousberg) copiés tels quels, et l'âne Quaternius (CC0), allégé à ses deux animations.

### Captures, vidéo, mesures (`docs/direction-artistique-2026-11/carte-3d/`, par `pnpm --filter @comptoirs/web e2e:map3d` après le build)

- `1-depart.png` (la vraie carte de départ), `1b-padoue.png` (Padoue touchée : anneau lapis, feuille de la ville), `2-fondaco.png` (zoom proche), `2b-fondaco-touche.png` (le fondaco touché par raycast : feuille de la Casa), `3-mule.png` (la mule en marche), `4b-venetie.png` et `4-dezoom.png` (la Vénétie large, puis au plus loin), `mule.webm` (13 s), `perf.json`.
- Mesures dans Chromium à 390 × 844, CPU ralenti ×4. Attention : ce conteneur n'a pas de GPU, le WebGL y est rendu **en logiciel** (SwiftShader, sur le CPU). Les images par seconde y sont donc très pessimistes par rapport à un téléphone ; le travail CPU par image est le chiffre le plus parlant.

  | Situation | Images/s | Écart entre images (médiane / p95) | Travail CPU par image (médiane / p95) |
  | --- | --- | --- | --- |
  | Immobile (mouvement réduit), au repos | 0 (aucune image demandée) | — | — |
  | Immobile, pendant un pan | 5,1 | 194 / 242 ms | 9,7 / 18,5 ms |
  | Vivante, au repos | 5,8 | 169 / 201 ms | 11,4 / 21,8 ms |
  | Vivante, pendant un pan | 5,5 | 177 / 214 ms | 10,2 / 16,4 ms |
  | Vivante sans effets (`fx=0`), au repos | 18,8 | 51 / 82 ms | 8,8 / 18,4 ms |
  | Vivante sans effets, pendant un pan | 20,4 | 48 / 87 ms | 8,2 / 15 ms |

  Environ 66 appels de dessin et 28 000 triangles par image au départ. L'occlusion ambiante (N8AO) coûte ici les trois quarts du temps d'image en rendu logiciel ; c'est le premier réglage à mesurer sur de vrais téléphones.
- Poids :
  - le fragment 3D fait 1 178 Ko (362 Ko en gzip), chargé seulement avec le drapeau ;
  - le bundle sans drapeau : +3 Ko ;
  - le cache de la PWA : inchangé (les modèles et le fragment 3D n'y sont pas) ;
  - les modèles : 941 Ko sur disque (305 Ko en gzip), dont l'âne 300 Ko.

### Limites rencontrées

- **Réseau du conteneur** : kenney.nl, quaternius.com, unpkg et jsdelivr sont refusés.
  - KayKit vient de son dépôt GitHub (raw.githubusercontent.com).
  - Le « Hexagon Kit » de Kenney n'a pas pu être pris : les tuiles sont faites dans le code.
  - L'âne Quaternius vient d'une copie publique du pack sur GitHub, avec sa licence CC0 : à revérifier contre l'archive officielle avant la production.
  - Pour Kenney : ajouter `kenney.nl` aux domaines autorisés de l'environnement.
- **Modèles** :
  - KayKit dessine ses maisons « à colombages », plus médiévales que vénitiennes, et sa « taverne » est un tonneau géant (écartée). Le fondaco est donc la grande maison KayKit, toit d'or, avec la tour ronde et un fanion fait dans le code.
  - Le moulin de KayKit est d'un seul tenant : ses ailes ne peuvent pas tourner sans retoucher le fichier.
  - Quaternius n'a pas de mule : c'est un âne, gris-bleu de la palette.
- **Ombres** : PCFSoft ne lit pas le rayon de flou (`shadow.radius` ne sert qu'avec PCF ou VSM). Les ombres des éléments qui bougent sont des disques doux, pas des ombres portées.
- **Mesures** : sans GPU, les images par seconde ne disent pas ce que donnera un téléphone ; il faudra mesurer sur un appareil réel (Android moyen de gamme, iPhone SE).

### Plan d'intégration complète (à valider par le porteur)

1. **Remplacer la carte SVG**, derrière le drapeau d'abord, puis par défaut :
   - `Map3D` prend toutes les props d'`EmpireMap` (pose d'un fondaco, cases achetables, portée, visée d'un véhicule) ;
   - les calques SVG inclinés (routes, cases achetables, portée) deviennent des maillages au sol (rubans, hexagones en surbrillance, anneau de portée) ;
   - les repères HTML (Remise, Campo, Porta, fondaci secondaires) passent par `Html`, avec leurs comportements actuels.
2. **Le toucher par raycast partout** :
   - des zones tactiles en hexagone pour les lieux (fin des chevauchements) ;
   - la pose d'un fondaco lit le point du sol touché (`event.point` → coordonnées de la carte) au lieu de `getScreenCTM` ;
   - l'appui long (calque d'information) et le clic droit (envoi d'un véhicule) se branchent sur le canvas.
3. **La caméra existante** :
   - garder `logic.ts` (`centredOn`, `farCamera`, `coverClamp`, `zoomBounds`), qui calcule en unités de carte, et le traduire en cible et zoom orthographiques ;
   - `useCamera` cède la main aux `MapControls`, ou les pilote pour garder l'inertie et les glissés animés (`glide`) ;
   - les tests de `empireMap.test.ts` restent la référence.
4. **Les véhicules réels de `Fleet`** :
   - chaque véhicule en route devient un acteur 3D (mule, charrette, chariot ; les combattants pour la Porta) posé sur la courbe de sa route (`routeBetween`/`alongPath` en 3D) ;
   - sa position est calculée par l'horloge comme aujourd'hui (départ, arrivée, durée), sans animation inventée ;
   - les médailles et minuteurs restent en HTML au-dessus.
5. **Le fondaco de près (`Orbit.tsx`)** :
   - le zoom proche sur le fondaco remplace l'orbite SVG ;
   - ses ateliers sur de petites tuiles 3D autour de lui (four, glaisière, coupe de bois, scierie, ferme, avec les modèles KayKit ou faits dans le code) ;
   - les arcs de production et les boutons en HTML ;
   - « Bâtir ici » sur la tuile libre.
6. **Performance et qualité adaptative** :
   - N8AO et tilt-shift coupés pendant un geste ou sur les appareils lents (`PerformanceMonitor` de drei) ;
   - niveau de détail au dézoom (décor masqué sous un zoom donné) ;
   - modèles regroupés en un seul `.glb` compressé (Meshopt, avec son décodeur servi par le jeu, car la CSP interdit le WebAssembly venu d'ailleurs) ;
   - mesures sur appareils réels avant la bascule.
7. **Tests** : `scene.ts` reste pur et testé ; le parcours `e2e:empire` tourne aussi avec `?map=3d` (mêmes sélecteurs `data-city`, `data-bottom-slot`).
