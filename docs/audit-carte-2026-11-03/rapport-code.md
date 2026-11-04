# Revue de robustesse : la carte 3D de Fondaco (3 novembre 2026)

Revue en lecture seule du code au commit `4d2a4f0` (merge #95). Aucun fichier du dépôt n'a été modifié.
Code lu : `apps/web/src/empire/map3d/*`, `apps/web/src/empire/map/{EmpireMap,Fleet,logic,useCamera}.ts(x)`, `apps/web/src/empire/Orbit.tsx`, `apps/web/src/index.css` (règles `.map-place`, `[data-three]`), `apps/web/vite.config.ts`, et côté moteur `packages/engine/src/empire/{slots,moves,map,view}.ts`, plus les tests associés.

Gravités : **bloquant** (casse le jeu ou une fonction centrale pour un joueur réel), **majeur** (faux, visible, ou coûteux sur mobile), **mineur**.

---

## 0. Synthèse

Le diorama tient bien dans le parcours automatique, parce que ce parcours touche **le centre du repère HTML** des lieux (`apps/web/e2e/map3d.mjs:215`, `tapOn("[data-home]")`). Un joueur, lui, touche **le bâtiment 3D qu'il voit**. C'est là que tout se joue : les touchers, l'orbite des ateliers, la livraison par glisser. Le code a trois défauts de structure :

1. **Deux systèmes de toucher qui se marchent dessus**, aucun des deux ne couvrant le volume visible : des repères HTML plats à la base des lieux, et des prismes 3D bas (hauteur 8) qui se chevauchent. Le passage de l'un à l'autre (`threeReady`) n'est **jamais branché**.
2. **L'orbite des ateliers est à moitié en HTML et à moitié en 3D**. En mode 3D, le HTML ne dessine plus rien de l'atelier : il compte sur `Workshops3D`. Or `Workshops3D` pose des tuiles à des points arbitraires, au niveau du sol, en plein dans le décor, les villes et l'inconnu.
3. **Les ressources three.js sont reconstruites et jamais libérées.** Chaque composant refusionne les 21 modèles, et chaque rafraîchissement du serveur (toutes les 30 s et à chaque action) refait la scène, le lagon et les routes sans rien libérer. Ajoutez une boucle de rendu à 30 i/s permanente avec AO, flou et ombres douces, et un appareil mobile chauffe et finit par perdre le contexte WebGL. Il n'y a ni ErrorBoundary ni reprise du contexte.

---

## 1. « Les ateliers ne s'affichent plus du tout » : cause racine probable

Je n'ai pas l'appareil du porteur. Le code montre pourtant **trois défauts qui se cumulent**, et chacun suffit à produire « je touche mon fondaco et je ne vois pas mes ateliers ».

### 1.1 L'orbite en 3D n'a plus de visuel HTML, et ses tuiles 3D sont noyées dans le décor (cause principale)

- `apps/web/src/empire/Orbit.tsx:329` : en mode `on3d`, un atelier rend `<span className="block h-20 w-20" />`, un carré **vide**, à la place de `WorkshopTile`. La ligne 128 retire aussi le soleil (`SunCorona`). Il ne reste qu'un anneau de progression aplati, le nom et une ligne de texte. Tout le visuel est délégué à `Workshops3D`.
- `apps/web/src/empire/map/EmpireMap.tsx:387-397` (`orbit3d`) convertit les points de l'orbite HTML (rayon 36 % d'un carré de `ORBIT_UNITS = 46` unités, aplati à 0,72) en points de la carte. Résultat : les ateliers tombent à environ **16,6 unités à l'est et à l'ouest et environ 20,6 unités au nord et au sud** du fondaco, soit **deux petites tuiles plus loin** (pas de 9,07 unités). Rien ne les aligne sur une tuile. Rien ne vérifie non plus que la tuile est libre, en terre, ou même connue.
- `apps/web/src/empire/map3d/Board3D.tsx:771-823` (`Workshops3D`) : chaque atelier est une dalle de 1,2 d'épaisseur posée **au sol** (`top.translate(0, 1.2, 0)`, l. 775), avec le modèle KayKit dessus. **Le décor de la tuile d'accueil n'est pas retiré.** Il peut s'agir d'une forêt de 11 à 16 pins (`scene.ts:263-267`), d'une montagne de 26 × 0,6 ≈ 15 unités de large (`Board3D.tsx:595`), d'une ville avec son campanile de 13 unités (`props3d.tsx:146-151`), du lagon, ou du verre de l'inconnu. La capture `phone/2-fondaco.png` le montre : le « Camp de bûcherons » est posé sur une tuile de verre, hors du plateau. La « Carrière d'argile » se mêle aux caisses et à la ferme.
- Les villes sous l'orbite ne sont masquées **qu'en HTML** (`EmpireMap.tsx:495-496`, `611` : `hidden={underOrbit(...)}`). Leurs maisons et monuments 3D restent là, et leurs prismes de toucher aussi.
- Le fondaco du porteur est collé à Venise et à Padoue (point 2 du brief). Ses ateliers 3D tombent donc presque tous **dans les villes, la forêt ou la montagne voisines**. À l'écran, on ne voit plus que des noms flottants sur du décor : « les ateliers ne s'affichent plus du tout ».

**Correctif** : abandonner l'orbite mi-HTML mi-3D au profit de la « vue du domaine » décidée par le porteur (une scène 3D à part : le fondaco au centre, ses ateliers sur des tuiles propres). En attendant, il faut au minimum rendre `WorkshopTile` même en `on3d` (le HTML reste lisible), puis aligner chaque atelier sur une tuile libre du domaine et y couper le décor. Voir R1 et R2.

### 1.2 Toucher le bâtiment visible n'ouvre pas l'orbite : il ouvre Venise, ou il referme tout

- En 3D, le repère HTML du fondaco est un carré **invisible** de 64 px centré sur le point au sol (`EmpireMap.tsx:1060-1071`, `h-16 w-16`, mis à l'échelle par `--chartk`, plafonné à 1,5 fois par `EmpireMap.tsx:208-211`). Le bâtiment 3D, lui, monte bien au-dessus : une halle à l'échelle 7,6, une tour à l'échelle 3,4, et un drapeau dont le mât fait 4,6 et qui est placé sur la tour (`Board3D.tsx:851-871`). En gros plan (zoom jusqu'à environ 23 px/unité sur téléphone, `logic.ts:113-118`), le toit doré, la tour et le drapeau sont **hors du repère**.
- Un toucher hors repère passe par `onTap`, puis par le rayon (`EmpireMap.tsx:281-289`). Les prismes de toucher n'ont que **9 de haut, de y = −1 à y = 8** (`Board3D.tsx:282-283`). Au-dessus, le rayon (incliné à 35°, `camera.ts`) file vers le nord et touche **le prisme du lieu situé derrière le fondaco**. Pour le porteur, c'est Venise : la feuille de Venise s'ouvre à la place des ateliers. Si le rayon ne touche rien, `onTarget(null); setOpened(null)` **referme l'orbite** si elle était ouverte.
- Les prismes ont un rayon minimum de 2,5 (`scene.ts:454-471`) et se chevauchent quand deux lieux sont à moins de 5 unités. C'est le cas d'un fondaco **posé avant les petites tuiles** : `homePost` renvoie `h.home` tel quel (`packages/engine/src/empire/map.ts:94`), et aucune migration ne le recale. Ce fondaco peut partager sa tuile avec une ville. `scene.ts:194` écrase alors le thème « town » par « fondaco », et les deux modèles se superposent. Avec le prisme le plus proche de la caméra qui gagne, toucher le fondaco ouvre la ville une fois sur deux.

**Correctif** : un seul système de toucher, le rayon, testé contre les **volumes visibles** (boîtes englobantes des modèles ou prismes à la hauteur réelle du bâtiment, plus un volume pour le drapeau), avec priorité au fondaco. Les repères HTML restent seulement pour le clavier et les lecteurs d'écran. Voir R3.

### 1.3 `threeReady` n'est jamais vrai, et les règles CSS de la 3D ne s'appliquent pas

- Le commit `f542e09` a ajouté `onReady` à `Board3D` et `onThreeReady` à `EmpireMap`, **sans les relier** : `EmpireMap.tsx:512` rend `<Board3D ref={onBoard3d} p={p} orbit={orbit3d} />` sans `onReady={onThreeReady}`. `grep onThreeReady` ne renvoie que sa déclaration (l. 403).
- Conséquence : `data-three` n'est jamais posé (l. 503). Les règles `index.css:1533-1541` sont **mortes** :
  - les repères gardent le toucher, d'où les deux systèmes décrits en 1.2 ;
  - la médaille du véhicule n'est **pas** décalée de 22 px sous l'animal. Elle le recouvre, ce que le porteur appelle « la pastille fait tache » (captures `phone/3-mule.png`, `phone/1-depart.png`).
- Même branché, le signal serait faux : `Zones` est **hors** du `Suspense` (`Board3D.tsx:228-234`). Il serait donc « prêt » avant que les modèles soient chargés, contrairement à ce que dit le commentaire (`EmpireMap.tsx:400-401`).
- Selon la version déployée chez le porteur, le comportement change complètement. Avant `f542e09`, `data-three` était **toujours** posé et tout passait par le rayon (cas 1.2, sans recours au repère). Après, tout passe par le repère HTML, sauf hors repère. **Question au porteur** : quelle version tourne chez lui (`__BUILD__`) ?

**Gravité de l'ensemble : bloquant** (fonction centrale : voir et récolter ses ateliers).

---

## 2. Constats détaillés

### 2.1 Bloquants

| # | Où | Constat et scénario | Correctif |
|---|---|---|---|
| B1 | §1.1 : `Orbit.tsx:329`, `EmpireMap.tsx:387-397`, `Board3D.tsx:771-823` | Ateliers sans visuel HTML, et tuiles 3D enfouies dans le décor ou les villes. | R1 et R2 |
| B2 | §1.2 : `Board3D.tsx:282-283`, `EmpireMap.tsx:281-289`, `scene.ts:462-471` | Toucher le haut du fondaco ouvre la ville derrière lui, ou referme l'orbite. | R3 |
| B3 | `EmpireMap.tsx:512` (pas d'`onReady`) | `threeReady` mort, CSS `[data-three]` mort, médaille posée sur l'animal. | R3 (une ligne en urgence) |
| B4 | **Aucune ErrorBoundary** dans `apps/web/src` (`grep` vide) ; `EmpireMap.tsx:101`, `510-514` | Plusieurs scénarios lèvent une erreur non rattrapée : `lazy(import Board3D)` qui échoue (réseau coupé, ou ancien hash après un déploiement), `kaykit.glb` ou `donkey.glb` en 404 ou tronqué, `Canvas` qui ne crée pas son contexte (limite de contextes, GPU blacklisté alors que la sonde `flag.ts:7-14` avait réussi), ou erreur de compilation de shader (`useWater`). Dans tous ces cas, **React 18 démonte toute l'application** et l'écran devient noir. | Une ErrorBoundary autour de `<Board3D>` qui bascule sur la carte SVG (`MAP_3D` devient un état, pas une constante de module) et le signale (R4). |
| B5 | `vite.config.ts:107-114` | `**/models/**` et `**/assets/Board3D-*.js` sont **exclus du précache** : un reste de « prototype ?map=3d », alors que la 3D est la carte par défaut. Hors ligne ou en réseau faible, la PWA ouvre sans sa carte (et avec B4, elle plante). Après un déploiement, une page ouverte peut réclamer un `Board3D-<ancien hash>.js` disparu. Taille : 1,15 Mo de JS (`dist/assets/Board3D-DnpsM0MM.js`), plus 740 Ko et 307 Ko de modèles, sans runtime caching, et `@fastify/static` sert avec `max-age=0` (`apps/server/src/app.ts:336`). | Précacher le chunk et les deux `.glb`, ou les mettre en `CacheFirst` dans `runtimeCaching`. Prévoir un écran de chargement visible (R5). |
| B6 | `apps/web/src/empire/map3d/kit.tsx:79-103` | `useKit()` fait un `useMemo` **par composant** : chaque appelant refusionne les 21 modèles (`merged()` : conversion en Float32Array, `toNonIndexed`, fusion) et tient son propre cache de variantes. Les appelants sont `World` (l. 502), `Workshops3D` (l. 772), `Porta` (l. 827), `Fondaco` une fois par fondaco et comptoir (l. 852), et `Vehicle3D` une fois par véhicule (`fleet3d.tsx:97`). Avec 1 fondaco, 4 comptoirs et 6 mules, cela fait **13 fusions complètes** au chargement. Pire : **chaque ouverture de l'orbite** remonte `Workshops3D` (`Board3D.tsx:238`) et refait une fusion de plus, sans rien libérer. Sur mobile, c'est une saccade de plusieurs centaines de ms à chaque toucher du fondaco, puis une fuite GPU qui croît jusqu'à la perte de contexte. | Un cache de module (`WeakMap<gltf.scene, Kit>`), fusionné une seule fois, avec les variantes partagées (R6). |

### 2.2 Majeurs

**Fuites et recalculs à chaque rafraîchissement du serveur**

- **M1. La scène est refaite à chaque payload.** `Board3D.tsx:134-138` mémoïse sur `p.view.map`, or `take()` (`EmpireGame.tsx:140-146`) installe un **nouvel objet** à chaque `refresh` : toutes les 30 s, à chaque action, à chaque message `changed`. Le comparateur de `memo` (`Board3D.tsx:249-255`) compare `map` et `vehicles` **par référence**, il laisse donc tout passer. À chaque fois :
  - `scene3d` refait **toutes les routes** (fondaco × ville à moins de 60 unités, chacune par un A* qui trie sa file à chaque pas, `slots.ts:252-253`), puis `crossed`/`onLane`, en O(tuiles × routes × points), et `tiles.find` en O(n²) (`scene.ts:311`) ;
  - `lagoonGeometry` est recréée (`Board3D.tsx:527`) et l'ancienne **n'est jamais libérée** ;
  - chaque `Track` recrée sa géométrie (`Board3D.tsx:955-973`, `useMemo([path])` avec un `path` neuf) **sans libérer l'ancienne** ;
  - le cache des routes (`roads`, une `WeakMap` sur `map`, `logic.ts:795-819`) est perdu : toutes les routes des véhicules repassent par l'A* dans la frame suivante (`useFrame` de `Fleet3D`, `fleet3d.tsx:50`).

  Effet : une saccade périodique et une fuite GPU d'environ (lagon + routes) toutes les 30 s.
  Correctif : une clé structurelle (`revealed.join`, `unlocked.join`, points des fondaci et des villes, `porta`), ou mieux un `map.version` envoyé par le serveur. Libérer explicitement (`useEffect(() => () => geo.dispose(), [geo])`). Voir R7.
- **M2. D'autres géométries et matériaux ne sont jamais libérés.** Les géométries passées en prop ne sont pas libérées par R3F au démontage : `Workshops3D` `tile` (l. 773-777), le drapeau `PlaneGeometry` (`life.tsx:329-333`), les 5 `MeshStandardMaterial` de chaque `Smoke` (`life.tsx:278-294`), `fogEdges` et `slabs` (`Board3D.tsx:507-532`, à chaque remontage de `World`), le mixer d'animation (`fleet3d.tsx:113-116`, `stopAllAction` sans `uncacheRoot`). C'est mineur pris un par un, majeur en cumul sur une session de jeu longue. Correctif : un petit hook `useDisposable(factory, deps)`.

**Boucle de rendu et accessibilité**

- **M3. La boucle de rendu tourne en permanence.** `Ticker` (`Board3D.tsx:382-396`) appelle `invalidate()` une frame sur deux **tant que `live` est vrai**, c'est-à-dire toujours, sauf si l'appareil demande moins d'animation. Le commentaire « none when still » est faux. `frameloop="demand"` ne sert donc à rien : 30 rendus par seconde en continu avec AO N8AO, TiltShift, ToneMapping, ombres douces PCF échantillonnées par tous les matériaux, et eau transparente. De plus, le choix « une frame sur deux » dépend de la fréquence d'écran : 60 i/s sur un écran 120 Hz, mais **15 i/s en mode Économie d'énergie d'iOS** (rAF bridé à 30). Dans ce dernier cas, `PerformanceMonitor` (`l. 242`, bornes 18-26) coupe l'AO pour toute la session.
  Correctif : ne demander des frames que si quelque chose bouge vraiment (une mule en route, la caméra, une animation d'arrivée) ; sinon une frame toutes les 2 à 4 s pour la fumée et l'eau, ou rien. Cadencer au temps (≥ 33 ms), pas une frame sur deux (R8).
- **M4. Avec « Réduire les animations », les mules 3D sont figées.** Quand `live = false`, `Ticker` ne fait rien et `useFrame` de `Fleet3D` (`fleet3d.tsx:47-69`) ne tourne que lorsqu'un autre événement demande une frame. La médaille HTML avance (rAF de `Fleet.tsx:92-102`), mais l'animal reste à sa place de départ jusqu'à ce qu'on touche la carte. Correctif : un `invalidate()` cadencé (1 i/s par exemple) tant qu'un véhicule a une étape en cours, même sans animation des pattes.
- **M5. Pendant un voyage, React rend à 60 i/s.** `Fleet.tsx:92-102` fait un `setFrame` à chaque rAF **pendant tout le voyage** (environ 5 min) et tant qu'une étape reste en `legs`. Chaque rendu refait `vehiclePose` et `fleetSpots`, toutes les médailles, et l'effet sans dépendances des arrivées. S'y ajoutent la boucle de suivi de caméra (`EmpireMap.tsx:360-372`) et les 30 i/s du WebGL. Sur mobile, cela fait trois boucles en parallèle. Correctif : positionner les médailles en impératif (refs et `transform`) dans une seule boucle partagée avec le suivi.

**Écarts entre le client et le moteur**

- **M6. Le client calcule les routes avec une carte partielle.** `roadOf` (`logic.ts:798-819`) appelle `roadBetween` avec `map.cells` et `map.cities` de la vue de la maison. Or la vue **ne garde que les secteurs vus** (`view.ts:680`) et **les villes vues** (`view.ts:730`). Le moteur (`hopMs`, `moves.ts:56-61`), lui, calcule avec **toute** la carte. Dans `roadTiles` (`slots.ts:262`), une terre non vue coûte « mer » (+4) chez le client et 0 chez le serveur ; une ville non vue coûte +3 chez le serveur et 0 chez le client.
  Scénario : une livraison vers une ville au bord de ce qu'on voit, dont le plus court chemin coupe un secteur non vu. Le client trace une autre route, qui longe la côte ou passe sur l'inconnu. `hopSeconds` (étiquette du glisser, `Fleet.tsx`) annonce une **autre durée** que le serveur. La mule marche sur une route différente de celle qui est chronométrée, donc à une vitesse apparente fausse. Et quand un secteur se révèle **pendant** un voyage, la route recalculée change : la mule saute.
  Correctif : envoyer depuis le serveur la route (ou ses tuiles) de chaque étape dans la vue (`legs[i].road`), ou au minimum `map.allCells` en terre/mer et les points des villes connues de la route. Côté client, ne plus jamais recalculer une étape déjà chronométrée (R9).
- **M7. `snapToTile` ne voit pas ce que le serveur voit** (`logic.ts:767-796`, comparé à `map.ts:457-466`) :
  - le serveur compte les **comptoirs en chantier** (`h.builds` de type `post`), le client ne prend que `map.posts`. Poser un deuxième comptoir près d'un chantier fait que le client « aimante » sur une tuile que le serveur refuse (`post_too_close`) ;
  - le client ne connaît que les villes vues : une ville non vue dans le secteur voisin, sur une tuile qui touche, donne `on_city` côté serveur ;
  - **aucune tuile libre** : `snapToTile` renvoie le point brut, et le serveur répond `unknown_cell`, un message incompréhensible. `placeable()` (`logic.ts:153-187`) n'exclut pas ces secteurs.

  Correctif : envoyer dans la vue les tuiles libres de chaque secteur posable (le serveur sait), ou au minimum les chantiers et les tuiles interdites. Griser les secteurs sans tuile libre.
- **M8. Les maisons existantes gardent l'ancien point.** Aucune migration ne recale `h.home` ni `h.posts` sur une tuile (`map.ts:94`). Le fondaco peut donc se trouver à cheval sur deux tuiles, ou sur celle d'une ville : modèles superposés (`scene.ts:194`), prismes qui se chevauchent (§1.2), routes de longueur presque nulle (`scene.ts:213`, `d < 1`). C'est aussi une explication directe du « fondaco noyé entre les villes ». Correctif : une migration côté serveur qui recale chaque fondaco sur la tuile libre la plus proche (le moteur a `tileFault` et `slotPoint`). Si aucune tuile n'est libre, il faut une décision du porteur : déplacer la ville, ou rendre un « sceau de déplacement » gratuit.
- **M9. La Remise, le Campo et la Porta sont placés par le client seul, et bougent.** `sitesOf` (`scene.ts:344-374`) les met sur la tuile libre la plus proche, **calculée dans le navigateur**. Quand on pose un fondaco dans le même secteur, `snapToTile` peut choisir la tuile de la Remise (il ne connaît pas les sites), puis la Remise saute sur une autre tuile. S'il n'y a pas de tuile libre, `k = free?.k ?? 0` (l. 368) pose le site **sur une ville ou sur le fondaco**. Correctif : les sites prennent leur tuile côté serveur, comme les fondaci.

**Gestes, contexte WebGL et suivi de caméra**

- **M10. Le glisser vise le pied des bâtiments, pas le bâtiment.** `Fleet.tsx:169`, `nearestPlace(p, at, 34 * k)` : il faut lâcher à 34 px **du point au sol** de la ville. En 3D, la ville visible (campanile, coupoles) est dessinée **au-dessus** de ce point, de 60 px environ au zoom de l'orbite sur téléphone, de 140 px environ sur PC (zoom plus fort). Le joueur, comme le parcours automatique, lâche sur le bâtiment et rien ne se passe. C'est l'hypothèse la plus probable pour « le glisser de la médaille a échoué sur PC ». Correctif : viser le lieu par le rayon (le volume visible, comme R3), avec un rayon d'aimantation en unités de la carte et non en pixels fixes.
- **M11. Rien ne gère la perte du contexte WebGL** (`grep webglcontextlost` vide). C'est fréquent quand une PWA iOS passe en arrière-plan ou que la mémoire est sous pression (voir B6 et M1). three.js restaure son état, mais :
  - avec `frameloop="demand"` et M3 corrigé, plus rien ne demande de frame : la carte reste noire jusqu'au prochain geste ;
  - `shadowMap.autoUpdate = false` (`Board3D.tsx:218`) : la carte d'ombres n'est jamais redessinée après la restauration, donc les ombres sont fausses ;
  - les cibles de rendu de N8AO et de l'EffectComposer peuvent rester invalides.

  Correctif : écouter `webglcontextlost` et `webglcontextrestored` sur `gl.domElement`, puis `shadowMap.needsUpdate = true` et `invalidate()`. Après deux pertes en peu de temps, basculer sur la carte SVG.
- **M12. Le suivi de caméra se lance aussi à l'envoi** (`EmpireMap.tsx:344-381`). `onMove` (`EmpireGame.tsx:340-345`) sélectionne le véhicule envoyé. Dès que le serveur renvoie ses `legs`, la caméra s'accroche à lui à chaque frame, pendant les 10 s d'attente au départ puis tout le voyage, jusqu'au premier toucher. Cela peut se faire **pendant que l'orbite ou la feuille d'une ville est ouverte**. La décision du porteur visait « un véhicule touché en chemin ». Correctif : suivre seulement quand on touche un véhicule déjà en route (un drapeau explicite), pas sur `selected`.

### 2.3 Mineurs

- **m1.** `flag.ts:7-14` : la sonde `webgl()` crée un contexte WebGL **jamais libéré**, qui compte dans la limite de contextes du navigateur (très basse sur iOS). Correctif : `getExtension("WEBGL_lose_context")?.loseContext()`.
- **m2.** `Board3D.tsx:316-327` : les prismes de toucher sont de vrais maillages **dessinés** à chaque frame (`colorWrite = false`, mais un appel de dessin et un tri transparent chacun). Comme `Raycaster` ne teste pas `visible`, on peut les mettre `visible={false}` ou sur un autre calque.
- **m3.** `Board3D.tsx:300-314` : le `onReady` de `Zones` est une fonction fléchée recréée à chaque rendu. L'effet tourne donc à chaque rendu de `Board3D`, ce qui sera gênant une fois `onReady` branché (`setThreeReady` à chaque fois).
- **m4.** `Board3D.tsx:184` : `touch = useMemo(..., [p])` est recalculé à chaque payload, et `placesOf` y rappelle `sitesOf(sceneInputOf(p))`. `EmpireMap.tsx:457` le refait **à chaque seconde** (`now`).
- **m5.** `EmpireMap.tsx:327-334` : un `useLayoutEffect` **sans dépendances** fait `querySelectorAll("[data-at]")`, écrit les styles et appelle `repaint()` à chaque rendu de la carte, donc chaque seconde.
- **m6.** `EmpireMap.tsx:188` : `ref0`, l'échelle de référence des repères, est calculé une seule fois au montage. Après une rotation ou un redimensionnement, `--chartk` et le seuil `data-far` sont faux.
- **m7.** `World` n'est pas mémoïsé. Chaque `setNear` ou `setLow`, et chaque ouverture de l'orbite, refait le JSX de centaines de `lineSegments` (`Board3D.tsx:655-668`) et de tous les décors.
- **m8.** `Fleet3D` reçoit un `p` figé par le `memo`, et son décalage d'horloge (`skew`, `fleet3d.tsx:46`) est calculé au rendu, alors que la médaille HTML recale le sien chaque seconde (`Fleet.tsx:88-90`). Si l'horloge de l'appareil se resynchronise, l'animal et la médaille se décalent.
- **m9.** Le fondaco jamais posé (`placed === false`) n'a pas de modèle 3D (`scene.ts:37`). Pourtant son repère HTML (`HomeMark`, toujours rendu à `homeAt`), ses mules et son orbite existent : on touche une tuile vide, et l'orbite s'ouvre autour du vide.
- **m10.** L'Arsenal reste au centre du secteur (`Board3D.tsx:278`, `EmpireMap.tsx:728`), sans tuile et sans modèle 3D. Le centre est aussi la place d'une ville seule dans son secteur (`slots.ts:79-80`) : repères et prismes se superposent.
- **m11.** Les routes 3D ne relient que fondaco et ville (`scene.ts:210-215`). Une tournée ville à ville ou comptoir à comptoir marche sur une route **non dessinée**, à travers des forêts dont le décor n'a pas été écarté.
- **m12.** `kit.tsx:94` : `base.get(name) as BufferGeometry` plante si un nœud manque dans le pack, et `recolour` plante si un modèle n'a pas d'UV (l. 95). Il faut une garde avec un modèle de repli.
- **m13.** `Board3D.tsx:70` : `Cache.enabled = true` garde en mémoire les `ArrayBuffer` des `.glb` pour toute la session (environ 1 Mo), ce qui fait double emploi avec le cache de drei.
- **m14.** `Board3D.tsx:215` et `408` : `antialias: false` et `multisampling={0}` laissent tous les bords en escalier à dpr 1. Un FXAA ou un SMAA dans le composeur coûte moins que le MSAA.
- **m15.** `Lights` (`Board3D.tsx:332-367`) : une seule carte d'ombres de 2048 couvre tout le plateau (`half = max(w,h) × 0,75`). Quand l'empire grandit, les ombres deviennent floues en gros plan, et `shadow-camera-far = 400` coupe les grands plateaux.
- **m16.** La médaille HTML est **le seul moyen de toucher un véhicule**. Il n'existe aucun prisme ni rayon sur les animaux 3D. Retirer la médaille, comme le demande le porteur, rendrait les mules intouchables : il faut d'abord ajouter le toucher 3D des véhicules (R10).
- **m17.** `orbitOn` (`EmpireMap.tsx:87-98`) et `orbit3d` (`EmpireMap.tsx:387-397`) dépendent de `base`, la résolution à laquelle la carte est dessinée, que `onRest` ne met à jour qu'**à la fin** du glissé. Pendant l'animation d'ouverture depuis loin (`base` ≈ 2,6), le conteneur de l'orbite fait 118 px de calque pour des étoiles `w-28` de 112 px : les étoiles se chevauchent, puis tout se réorganise d'un coup quand la caméra s'arrête.
- **m18.** `Place` décale chaque étoile de `-translate-y-8` (`game/map/Orbit.tsx:431`), alors que la tuile 3D est posée sur le point lui-même. Le nom se superpose au modèle.

---

## 3. Performance mobile

Comptage approximatif des appels de dessin hors post-traitement, pour une maison moyenne (12 secteurs vus, 30 secteurs d'inconnu autour, 1 fondaco et 3 comptoirs, 4 fermes, 6 mules) :

| Poste | Code | Appels | Remède |
|---|---|---|---|
| Bords dorés de l'inconnu : **un `lineSegments` et un matériau par tuile de verre** | `Board3D.tsx:655-668` | environ 210 | Un seul `LineSegments` fusionné, couleur par sommet ou en 3 lots |
| Prismes de toucher (invisibles mais dessinés) | `Board3D.tsx:316-327` | environ 25 | `visible={false}` (m2) |
| Fumées : 5 maillages et 5 matériaux chacune (fermes et fondaci) | `life.tsx:274-320` | environ 40 | Un `InstancedMesh` d'opacité par instance, ou des sprites |
| Fondaco et comptoirs : 2 maillages, plus le drapeau (3), plus la fumée | `Board3D.tsx:851-871` | environ 40 | Instancier halle et tour ; drapeau en shader de sommets |
| Pontons : 4 maillages chacun, géométries JSX par ponton | `Board3D.tsx:874-888` | 4 par ponton | Une géométrie fusionnée dans `MADE`, instanciée |
| Moulins : 2 chacun | `props3d.tsx:191-211` | 2 par moulin | Instancier tours et ailes (rotation par instance) |
| Routes : un maillage et un matériau par route | `Board3D.tsx:954-985` | 1 par route | Fusionner en un seul ruban |
| Véhicules : âne skinné, 2 à 4 maillages, `RoundedBox`, matériau propre par mule | `fleet3d.tsx:153-188` | environ 6 par véhicule | Matériaux partagés ; caisses instanciées |
| Le reste (décor, tuiles, villes) | `Instanced` | environ 40 | Déjà bien instancié |

**Toutes les passes sont multipliées par le post-traitement** : rendu de la scène, N8AO à demi-résolution (plusieurs passes), TiltShift, ToneMapping. Il faut aussi rendre la carte d'ombres quand `needsUpdate` est posé.

À cela s'ajoutent : ombres PCF douces échantillonnées par **tous** les matériaux qui reçoivent l'ombre, à chaque frame ; eau transparente sur tout le lagon et verre transparent sur tout l'inconnu (surdessin) ; `Flag` qui recalcule ses normales à chaque frame (`life.tsx:336-345`).

Avec M3 (30 i/s permanents), le téléphone chauffe en quelques minutes. Priorités :

1. Une boucle de rendu à la demande réelle (M3).
2. Fusionner les bords de l'inconnu (environ −200 appels).
3. Un niveau « bas » réel déclenché par `PerformanceMonitor` : sans AO ni TiltShift, ombres basiques en 1024, dpr 1, fumée figée.
4. Fumée et pontons instanciés.
5. Mesurer avec `?perf=1` (`Probe`, `Board3D.tsx:436-463`) sur un vrai téléphone de milieu de gamme, pas avec swiftshader.

---

## 4. Tests manquants

| Test | Ce qu'il aurait attrapé |
|---|---|
| **Câblage `threeReady`** : un test de `EmpireMap` (jsdom avec `Board3D` simulé) qui appelle `onReady` et vérifie `data-three`. Un test e2e qui vérifie `[data-map][data-three]` après chargement. | B3 |
| **Toucher le volume visible** : e2e qui clique sur le **toit doré** du fondaco (au-dessus de son repère, en pixels calculés depuis `tower.h`) et attend `[data-orbit-open=home]`. De même pour une ville : clic sur le campanile. | B2, M10 |
| **Ateliers sur tuiles libres** : un test pur sur `orbit3d` (à extraire en fonction) : chaque point tombe au centre d'une tuile `own`, ni ville, ni fondaco, ni eau, ni inconnu, et deux ateliers ne partagent jamais une tuile. | B1 |
| **Parité de durée client/serveur avec une carte partielle** : `hopSeconds(p_partiel, a, b)` contre `hopMs(settings_complets, a, b) / 1000`, avec un secteur non vu sur le plus court chemin et une ville non vue sur le chemin. | M6 |
| **`snapToTile` contre `tileFault`** : chantier de comptoir en cours, ville non vue d'un secteur voisin, secteur sans tuile libre (le secteur doit être exclu par `placeable`). | M7 |
| **Maison ancienne** : `scene3d` et `zones` avec un `home` hors du centre d'une tuile, ou sur la tuile d'une ville. Vérifier qu'aucune zone ne se chevauche ; côté moteur, un test de la migration de recalage. | M8 |
| **`sitesOf` stable et sans collision** : poser un fondaco dans le secteur de la Remise ne déplace pas la Remise ; aucun site sur une ville si le secteur est plein. | M9 |
| **Cache du kit** : la fusion n'a lieu qu'une fois pour N composants (compteur ou espion sur `mergeGeometries`). | B6 |
| **Pas de recalcul de scène sur un payload identique** : deux `p` de même contenu mais d'objets différents donnent le même `sc` (clé structurelle). | M1 |
| **Mouvement réduit** : avec `matchMedia(reduce)`, la position de l'animal suit `fleetSpots` au moins une fois par seconde. | M4 |
| **Erreur de chargement** : e2e avec `/models/kaykit.glb` en 404, puis hors ligne : la carte SVG s'affiche, pas d'écran noir. | B4, B5 |
| **Perte de contexte** : e2e avec `WEBGL_lose_context.loseContext()` puis `restoreContext()` : la carte revient et les ombres sont redessinées. | M11 |
| **Budget de `scene3d`** : sur 40 secteurs et 6 fondaci, moins de 30 ms en Node. | M1 |

Note : les tests du moteur (`packages/engine/test/empire/tiles.test.ts`, `slots.test.ts`) respectent la fixture. Il leur manque :

- un test que `roadTiles` reste **déterministe et identique** quand on ne lui donne que les cellules vues. Il ne l'est pas : c'est M6, et ce test documenterait la contrainte ;
- un test de `placeHome` pour une maison dont le `home` existait avant `tiles: true`.

---

## 5. Recommandations numérotées

| # | Problème | Solution concrète | Effort | Impact (1-3) | Décision du porteur ? |
|---|---|---|---|---|---|
| **R0** | B3 : `threeReady` mort | **Tout de suite** : passer `onReady={onThreeReady}` à `<Board3D>` (`EmpireMap.tsx:512`), déplacer le signal **dans** le `Suspense` (un petit composant `<Ready onReady/>` après `World`), stabiliser le callback de `Zones`. | S | 2 | Non |
| **R1** | B1 : ateliers invisibles | **En urgence** : en `on3d`, rendre quand même `WorkshopTile` (SVG) dans l'étoile HTML (`Orbit.tsx:329`) et retirer `Workshops3D` tant que R2 n'existe pas. L'orbite redevient lisible tout de suite. | S | 3 | Non |
| **R2** | B1 : système de fond | La « vue du domaine » décidée : un état `domain` dans `EmpireMap` qui fait plonger la caméra (un `easeTo` vers un cadrage serré du fondaco), cache le reste de la carte (brouillard, fondu, ou scène séparée), et pose les ateliers **sur les tuiles libres du domaine** avec leur décor coupé. Les données viennent d'une fonction pure `domainOf(p)` testée : quelles tuiles, quel atelier, quel chantier, quelle place libre. « Tout récolter » et « Bâtir ici » sont des objets 3D touchables, le retour se fait par un bouton ou un pincement. Le HTML ne garde que l'étiquette (nom, minuteur) au-dessus de chaque tuile. | L | 3 | Oui : forme de la scène, nombre de tuiles du domaine |
| **R3** | B2, M10, m2 | Un seul système de toucher : un rayon sur des **volumes à la hauteur réelle** (une `Box3` par modèle placé, calculée une fois dans `World`), avec priorité fondaco > véhicule > ville > site, et le même rayon pour le glisser. Les repères HTML passent en `pointer-events: none` en 3D (avec R0) et restent pour le clavier. | M | 3 | Non |
| **R4** | B4 | `ErrorBoundary` autour de `<Board3D>` : en cas d'erreur, basculer en SVG pour la session (`MAP_3D` devient un `useState`), journaliser l'erreur côté serveur. | S | 3 | Non |
| **R5** | B5 | Précacher `Board3D-*.js`, `kaykit.glb` et `donkey.glb` (retirer les `globIgnores`, ou `runtimeCaching: CacheFirst`). Pendant le chargement, afficher la carte SVG (`PlateauShapes`) à la place du fond vide, puis un fondu vers la 3D. | S | 3 | Non |
| **R6** | B6 | Kit en cache de module (`WeakMap`), fusionné une fois, variantes partagées. `Workshops3D` et `Vehicle3D` réutilisent les géométries. | S | 3 | Non |
| **R7** | M1, M2 | Une clé structurelle de carte (ou `map.version` envoyé par le serveur) ; `dispose()` systématique via un hook ; `World` en `memo`. | M | 3 | Non |
| **R8** | M3, M4, M5 | Une seule horloge d'animation partagée par la carte : `invalidate()` seulement quand quelque chose bouge, cadencé au temps ; 1 i/s minimum en mouvement réduit si une mule roule ; médailles et suivi en impératif. Un vrai niveau « bas » via `PerformanceMonitor`. | M | 3 | Non |
| **R9** | M6 | Le serveur envoie la polyligne (ou les tuiles) de chaque étape chronométrée dans `legs`. Le client dessine et anime **cette** route, et n'utilise `roadOf` que pour l'aperçu du glisser, marqué « environ ». | M | 2 | Non |
| **R10** | m16, point 4 du brief | Toucher 3D des animaux, et lancement de la livraison depuis la ville (« Livrer » dans la feuille de la ville, le jeu choisit la mule) ; ensuite seulement, retirer la médaille. | M | 3 | Oui (déjà décidé : à détailler) |
| **R11** | M8 | Migration serveur qui recale `home` et `posts` sur la tuile libre la plus proche, avec une note de chapitre (règle « annoncer avant d'appliquer »). | M | 2 | Oui : quoi faire quand aucune tuile n'est libre |
| **R12** | M7, M9 | Le serveur expose, par secteur posable, ses tuiles libres, et place la Remise, le Campo et la Porta sur des tuiles (état serveur, pas un calcul du client). `placeable` grise les secteurs pleins. | M | 2 | Non |
| **R13** | M11, m1 | Gérer la perte et la restauration du contexte WebGL (ombres, `invalidate`, bascule en SVG après deux pertes) ; libérer le contexte de la sonde. | S | 2 | Non |
| **R14** | M12 | Suivi de caméra seulement si l'on touche un véhicule déjà en route, et jamais pendant que l'orbite ou une feuille est ouverte. | S | 2 | Oui : faut-il suivre une mule qu'on vient d'envoyer ? |
| **R15** | §3 | Lots d'appels de dessin : bords de l'inconnu fusionnés, fumée, pontons, moulins, fondaci et routes instanciés ou fusionnés ; prismes invisibles. Objectif : moins de 80 appels par passe. | M | 2 | Non |
| **R16** | §4 | Écrire les tests de la section 4, d'abord ceux de B2/B3 (e2e qui touche le toit, `data-three`), de M6 et de B1. | M | 3 | Non |

Ordre proposé : R0 et R1 (une heure, débloquent le porteur), puis R4, R5, R6 (stabilité), puis R3 et R8, puis R2 et R10 (les nouveaux systèmes), puis R7, R9, R11 à R15.

---

## 6. Questions au porteur

1. **Quelle version tourne chez vous** (identifiant de build `__BUILD__` dans l'écran « À propos » ou les réglages) ? Sur quel appareil et quel navigateur, en PWA installée ou dans un onglet, et avec « Réduire les animations » ou le mode Économie d'énergie actifs ? Le comportement des touchers change complètement avant et après `f542e09` (§1.3).
2. Quand « les ateliers ne s'affichent plus », touchez-vous **le toit ou le drapeau du fondaco**, ou sa base et son nom ? Une feuille (Venise, la Casa) s'ouvre-t-elle à la place ?
3. Votre fondaco a-t-il été **posé avant l'arrivée des petites tuiles** (avant le 3 novembre) ? Si oui, il est resté à l'ancien point (M8). Faut-il **recaler d'office** les fondaci existants sur une tuile libre ? Et si le secteur n'en a pas : déplacer la ville, ou proposer un déplacement gratuit ?
4. Vue du domaine : combien de tuiles autour du fondaco (6 en anneau, 12, ou un secteur entier de 7 petites tuiles) ? Les ateliers doivent-ils occuper **les vraies tuiles de la carte** (le domaine fait partie du monde), ou une scène à part, détachée de la carte ?
5. Après « Livrer » depuis une ville, la caméra doit-elle **suivre la mule** automatiquement, ou rester sur la ville (M12) ?
6. Hors ligne, la PWA doit-elle ouvrir la carte 3D (environ 2,2 Mo à précacher) ou se contenter de la carte SVG ?
7. Quels appareils de référence pour le budget de performance ? Je propose un Android de milieu de gamme de 2022 et un iPhone 12 en mode Économie d'énergie, avec 30 i/s pendant un geste et aucun rendu au repos.
8. La Remise, le Campo et la Porta doivent-ils avoir une tuile **réservée côté serveur**, comme les fondaci, pour ne plus jamais bouger quand on pose un comptoir (M9) ?
