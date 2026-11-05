# Audit 3D temps réel : carte de l'empire, Porta et bataille (4 novembre 2026)

Expert : 3D temps réel pour le web (three.js 0.170, React Three Fiber 8.18, drei 9.122, postprocessing 6.39 / @react-three/postprocessing 2.19). Audit en **lecture seule** : le code n'a pas été modifié. Seul ce fichier a été écrit.

Périmètre lu : `apps/web/src/empire/map3d/` (Board3D, scene, camera, kit, recolor, fleet3d, life, props3d, minis, figure, Guard, anchors, flag), `apps/web/src/empire/porta/` (Battle3D, BattleDiorama, PortaScene, ArmsScene), `apps/web/src/art/plateau/`, `apps/web/vite.config.ts`, `apps/web/public/models/`, `apps/web/art-src/`, l'en-tête CSP du serveur (`apps/server/src/app.ts:63`) et le `dist/` déjà construit.

Mesures faites pour cet audit, dans le conteneur, sans GPU (WebGL logiciel SwiftShader, donc des images par seconde très pessimistes ; le nombre d'appels et le travail CPU sont les chiffres utiles) :
- `e2e/map-fps.mjs` (390×844, CPU ×4, pan et molette) : **96,5 % des images au-dessus de 32 ms, p95 500 ms**.
- Sonde `?perf=1` (script à moi dans le scratchpad, d'après `map-fps.mjs`) sur la carte de départ : **56 appels de dessin, 39 000 triangles**, travail CPU médian 4,6 ms par image avec effets et 3,4 ms sans ; canvas 390×844 (dpr 1 en headless).
- Le parcours `e2e/map3d.mjs` avec `PERF=1` a planté (`TargetClosedError`) pendant la mesure, après les captures : la page ou le navigateur a fermé quand la carte a été rouverte plusieurs fois. Cause non établie (voir M7, plusieurs contextes WebGL).
- Analyse des `.glb` (lecture de leur JSON) et des paquets du `dist/`.

Captures relues : `scratchpad/shots/map3d/*` (1-depart, 3-mule, 4-dezoom, 2-fondaco), `scratchpad/shots/porta/*` (1-armes, 4-porta, 5-bataille), `scratchpad/shots/empire/320x568-16-en-route.png`.

---

## 1. Résumé

La carte 3D est **bien construite dans ses fondations** : rendu à la demande (`frameloop="demand"`, `Ticker`), ombres statiques dessinées une seule fois, décor instancié modèle par modèle, un seul matériau d'argile en couleurs par sommet (aucune texture), kit fusionné une seule fois, scène refaite seulement quand la carte change, picking par prismes invisibles qui ne se chevauchent pas, filet `Guard3D` et repli SVG, perte de contexte gérée. La plupart des défauts 3D de l'audit du 3 novembre sont corrigés (voir § 2).

Les nouvelles scènes de la Porta (lieu, armurerie, bataille) n'ont pas encore cette rigueur, et elles ont dégradé le chargement de **tout** le jeu :
1. **three.js, R3F et drei sont passés dans le paquet principal** (2,49 Mo, 738 Ko en gzip), et les **3,3 Mo de modèles** (dont `minis.glb`, 2,2 Mo) sont téléchargés et analysés **au démarrage de l'application**, pour tous les joueurs, même ceux qui ont le repli SVG, et même ceux qui n'ouvriront jamais la Porta. La raison : `EmpireGame.tsx:47-50` importe `PortaScene` et `ArmsScene` directement, et `useGLTF.preload` s'exécute à l'import du module.
2. **La bataille ne se lit pas sur un téléphone** : sur la capture `5-bataille.png`, les figurines font environ 10 px, la taille d'un sapin. Cela contredit la règle d'or 8 (« Tout se voit »).
3. Les scènes de la Porta **rendent en continu à 60 images/s** (`PortaScene` et `ArmsScene` n'ont pas de `frameloop`, `Battle3D` est en `"always"`), au-dessus de la carte, qui reste montée avec son propre contexte WebGL. Elles ont aussi des fuites de matériaux et une lumière ponctuelle qui recompile les shaders.

Pour la carte elle-même, le reste relève de l'optimisation : coût de la chaîne d'effets sur mobile, appels de dessin des animaux et des fumées, poids de `minis.glb`, contours dorés d'un pixel, paliers de qualité adaptative trop pauvres.

---

## 2. Suivi de l'audit précédent (docs/audit-carte-2026-11-03/SYNTHESE.md), sur le domaine 3D

| Point | État | Preuve |
|---|---|---|
| B4 `onReady` non branché | **Corrigé** | `EmpireMap.tsx:507,633` ; `Board3D.tsx:238-241,304` |
| B5 aucun filet si la 3D échoue | **Corrigé**, avec une réserve | `Guard.tsx`, `flag.ts:give3dUp`. La réserve : il **recharge la page entière** (`flag.ts:66`), y compris en pleine bataille (Battle3D est sous `Guard3D`, `BattleDiorama.tsx:134`) |
| B6 3D hors du cache hors ligne | **Corrigé**, avec un risque | `vite.config.ts` : `glb` dans `globPatterns` ; `dist/sw.js` précache Board3D, kaykit, donkey, minis. Le risque : `maximumFileSizeToCacheInBytes: 3 Mo`, alors que le paquet principal fait déjà 2,49 Mo. Au-delà de 3 Mo, il sortirait **sans bruit** du précache (voir M10) |
| B7 kit refondu à chaque ouverture | **Corrigé** | `kit.tsx:81` (`WeakMap` par scène chargée) |
| Rendu permanent à 30 images/s | **Corrigé pour la carte** | `Board3D.tsx:274` `demand` ; `Ticker` (`:491`) ; zéro image au repos en mouvement réduit. **Réintroduit par la Porta** (B3) |
| Scène refaite à chaque rafraîchissement | **Corrigé** | `sceneKey` (`scene.ts:60`), `memo` avec comparaison (`Board3D.tsx:315-322`) |
| « Réduire les animations » | **Corrigé** sur la carte | `useLive` (`Board3D.tsx:131`). Les scènes Porta utilisent `live()`, mais rendent quand même en continu |
| Zones de toucher à la hauteur des bâtiments | **Corrigé** | `Zones` (`Board3D.tsx:359-399`), `zones()` (`scene.ts:501`) |
| Rien pendant le chargement | **Corrigé** | `EmpireMap.tsx:675-682` (`data-board-loading`) |
| Un seul contour d'or par secteur | **Corrigé**, mais peu lisible | `Board3D.tsx:665-668` ; trait de 1 px (voir M9) |
| Paliers de zoom avec niveau de détail | **Partiel** | Un seul palier, qui masque sapins et rochers sous 3,6 px/u (`Board3D.tsx:98,188`). Aucune simplification des maisons ni des fumées |

---

## 3. Constats

### Bloquant

**B1. three.js et les 3,3 Mo de modèles sont chargés au démarrage pour tout le monde.**
- Preuve : `EmpireGame.tsx:47` `import { ArmsScene }` et `:50` `import { PortaScene }` sont statiques. Ces modules importent `@react-three/fiber`, `map3d/figure` → `minis` → `kit`, `life`. Résultat dans `dist/assets/index-CAUxmltH.js` : **2 488 414 octets (738 Ko en gzip)**, qui contiennent `WebGLRenderer`. Le chunk `Board3D` (248 Ko) n'est plus qu'une petite partie de la 3D.
- Les `useGLTF.preload` au niveau du module (`minis.tsx:31`, `kit.tsx:118`, `life.tsx:28`) partent donc à l'évaluation du paquet principal : `minis.glb` (2,2 Mo, 332 nœuds, 6 squelettes, 18 animations), `kaykit.glb` (739 Ko) et `donkey.glb` (307 Ko) sont **téléchargés puis analysés sur le fil principal** avant même que la carte s'affiche. Ils sont aussi chargés pour les appareils sans WebGL (`MAP_3D` faux : `PortaSheet` est affiché, mais le module `PortaScene` est importé quand même).
- `docs/plateau-reprise.md` § 7 annonçait « le bundle sans drapeau : +4 Ko ». Ce n'est plus vrai.
- Effet : premier affichage retardé sur un téléphone en 3G/4G faible, mémoire occupée par les squelettes de la Porta pendant toute la session, cache PWA alourdi d'autant.

**B2. La bataille (mode en direct de 10 minutes) ne se lit pas sur un téléphone.**
- Preuve : capture `porta/5-bataille.png` (390×844). L'île occupe toute la largeur ; une figurine fait environ 8 à 12 px de haut ; les sapins (`dressingOf`, `Battle3D.tsx:120-152`, échelle 4,5 à 6) sont **aussi grands que les unités**, et plus nombreux (n = 1,1 × rayon²). Les villes de Rome sont des taches brunes ; on ne distingue ni son unité, ni sa cible, ni la mule de transport. Les unités n'ont ni ombre ni pastille au sol (`minis.tsx:161` `castShadow=false`, aucune `Blob` dans Battle3D) : elles flottent sur le sable.
- Le picking compense en partie (rayon de 30 px, `Battle3D.tsx:281`), mais le joueur doit d'abord **voir** ce qu'il touche. C'est contraire à la règle d'or 8 et à la consigne « Touchez la destination ».

**B3. Les scènes de la Porta rendent en continu au-dessus de la carte, qui reste vivante.**
- `PortaScene.tsx:513` et `ArmsScene.tsx:82` : `<Canvas>` sans `frameloop`, donc `"always"` (60 images/s), même quand tout est immobile et même en mouvement réduit. Chaque image, `AnchorLayer` (`anchors.tsx:22-29`) fait un `querySelectorAll` et réécrit `style.transform` de chaque étiquette, ce qui force un recalcul de mise en page à 60 Hz.
- `Battle3D.tsx:293` : `frameloop={live ? "always" : "demand"}`, avec `antialias: true` et un dpr jusqu'à 1,5, pendant 10 minutes.
- La carte (`EmpireMap`, `EmpireGame.tsx:351`) **reste montée** sous ces calques plein écran (`fixed inset-0 z-40/z-50`). Son `Ticker` continue de demander 30 images/s tant qu'une mule roule. On a donc **deux, voire trois contextes WebGL** actifs en même temps (carte, Porta ou Armurerie, bataille), avec chacun sa copie des géométries sur le GPU. Sur iOS, c'est la cause classique des pertes de contexte, et une perte double déclenche `give3dUp`, donc un rechargement de la page (M7).
- Effet : batterie et chauffe, à l'opposé de la règle d'or 7 (quelques minutes, plusieurs fois par jour).

### Majeur

**M1. Fuites de matériaux dans la bataille.**
- `Battle3D.tsx:597` `material={glow("#FF8A3D", 0.9)}` et `:703` `material={glow(RARITY_HEX[rarity], 0.95)}` créent un `MeshBasicMaterial` **à chaque rendu**, soit à chaque instantané (BEAT = 250 ms), pour chaque unité qui brûle une ville ou charge une relique. R3F ne libère pas un matériau passé en prop : en 10 minutes, quelques milliers d'objets et de références de programmes sont gardés.
- `Loading` refait aussi une `RingGeometry` à chaque instantané (elle est libérée, mais cela fait du travail inutile). Mieux vaut une seule géométrie, avec `drawRange` ou un uniform d'angle.

**M2. La torche ajoute une `pointLight` par incendiaire, et chaque apparition ou mort recompile tous les shaders.**
- `figure.tsx:263`. three.js compile ses `MeshStandardMaterial` selon le nombre de lumières : chaque incendiaire qui apparaît ou meurt fait **recompiler tous les programmes standard** de la scène, soit une saccade de 100 à 500 ms sur un téléphone, en plein combat. Chaque lumière ponctuelle coûte en plus du calcul par pixel sur toute l'île.
- Correction : supprimer la lumière (flamme en `MeshBasicMaterial`, halo additif). Si on la garde, il faut un nombre fixe de lumières, préalloué et réutilisé.

**M3. Le coût de la chaîne d'effets sur mobile.**
- `Board3D.tsx:521-538` : `EffectComposer` (rendu dans une cible HalfFloat, `frameBufferType` par défaut), puis N8AO (plusieurs passes à demi-résolution), puis `TiltShift2` (passe de convolution plein écran), puis `ToneMapping`. Le `TiltShift2` est **toujours monté**, avec `blur=0` loin du sol. Or le zoom maximal du jeu est environ 23,6 px/u (`zoomBounds3d`, `logic.ts:117-121`) pour un seuil de 22 : le flou ne sert qu'au tout dernier cran de zoom, mais sa passe est payée à chaque image.
- `PerformanceMonitor` (`:307`) ne coupe que l'AO. La chaîne reste en place sur un appareil lent, alors que `plateau-reprise.md` (§ 7, mesures) établit que **la chaîne d'effets double le coût**.
- La sonde confirme environ +35 % de travail CPU avec les effets (4,6 contre 3,4 ms), hors coût GPU, que SwiftShader ne reflète pas.

**M4. La qualité adaptative a trop peu de paliers.**
- Ce qui existe : l'AO coupée pendant un geste ou pour de bon sous 18 images/s, et un niveau de détail sur le petit décor.
- Ce qui manque : baisser le dpr (`dpr={[1,1.5]}` est fixe, alors que `PerformanceMonitor` + `setDpr` le permet), retirer le composer entier (et remettre l'ACES directement sur le renderer), passer les ombres en `PCFShadowMap` 1024, détecter un rendu logiciel au démarrage (`flag.ts:webgl()` ne teste ni `failIfMajorPerformanceCaveat` ni `WEBGL_debug_renderer_info`, qui révèle SwiftShader, llvmpipe ou Mali-400), et proposer le SVG si l'appareil reste sous 10 images/s.
- Mesure : 96,5 % d'images au-dessus de 32 ms sous CPU ×4 en logiciel. C'est le cas extrême, mais c'est le profil d'un Android d'entrée de gamme.

**M5. `minis.glb` n'est pas optimisé (2,2 Mo, 860 Ko en gzip).**
- Analyse : aucune extension, 1 874 accesseurs en float32. Attributs `POSITION`, `NORMAL`, `JOINTS_0`, `WEIGHTS_0`, `COLOR_0` (float), 28 268 sommets, 27 848 triangles, 237 Ko d'animations.
- Gains possibles **sans WebAssembly**, donc compatibles avec la CSP actuelle (`script-src 'self'`, qui interdit le décodeur meshopt) :
  - `COLOR_0` en `UNSIGNED_BYTE` normalisé et `WEIGHTS_0` en `UNSIGNED_BYTE` normalisé, deux formats permis par glTF de base, sans extension : environ 21 octets par sommet de moins, soit environ 590 Ko ;
  - `KHR_mesh_quantization` pour les normales (int8) ;
  - animations rééchantillonnées et dédoublonnées (`gltf-transform resample`, `dedup`) ;
  - suppression des accessoires jamais montrés par `roster.ts`.
  Cible réaliste : 0,8 à 1 Mo, 350 Ko en gzip.
- La quantification des positions des maillages à squelette « cassait le skinning » (README des modèles) : c'est un problème connu de l'ordre des matrices de bind. gltf-transform ≥ 3 le gère avec `quantize({ quantizePosition: 14 })` à condition de ne pas recentrer les maillages à squelette. Sinon, on laisse les positions en float.
- Option plus forte : ajouter `'wasm-unsafe-eval'` à `script-src` (sans danger, aucun `eval` de JS) pour autoriser meshopt (`EXT_meshopt_compression`). On gagne alors un facteur 3 à 5 sur les trois fichiers. C'est une décision du porteur.

**M6. Trop d'appels de dessin pour les animaux et la fumée.**
- L'âne a **8 primitives et 7 matériaux** (`donkey.glb`), donc 8 appels de dessin et autant de passes de skinning par véhicule. Le cheval est construit de la même façon. Une flotte de 6 véhicules coûte environ 50 appels rien que pour les bêtes.
- Correction : cuire les couleurs dans `COLOR_0` (ce que `pack-minis.mjs` fait déjà pour les personnages) et fusionner en une primitive, avec un seul `clayMini`.
- Chaque `Smoke` (`life.tsx:289-334`) fait 5 maillages transparents, 5 matériaux et 5 icosaèdres propres. Il y en a une par ferme (`scene.ts:321`), plus le fondaco, plus chaque atelier en marche dans le domaine. Mieux : un seul `InstancedMesh` de bouffées pour toute la carte, avec l'opacité en attribut par instance, soit 1 appel au lieu de 5×N.
- Les matériaux de `Smoke` et de `useWater` ne sont jamais libérés au démontage (créés par `useMemo`, passés en prop).

**M7. Plusieurs contextes WebGL, et une perte de contexte qui recharge la page.**
- Carte, Porta, Armurerie et Bataille ont chacune leur `<Canvas>`. Les géométries du kit sont des objets JS partagés, mais elles sont envoyées **une fois par contexte** au GPU.
- `give3dUp` (`flag.ts:56-67`) fait un `location.reload()` : un `Battle3D` qui plante en plein combat ramène le joueur à l'accueil.
- Le plantage de `e2e/map3d.mjs PERF=1` pendant cet audit (fermeture de la page au moment de rouvrir la carte) va dans ce sens, sans le prouver.
- Recommandation : un seul `Canvas` racine, partagé grâce à `View` de drei ou en démontant ou gelant la carte (`frameloop="never"`, `gl.setAnimationLoop(null)`) quand un calque 3D plein écran est ouvert. Pour la bataille, se replier sur le 2D (`Battle.tsx` existe) plutôt que recharger.

**M8. Le cadrage de l'Armurerie et du Domaine ne montre pas l'objet du jeu.**
- `porta/1-armes.png` : on ne voit que la halle du marché. Les socles sont sous la feuille (`Fit` d'`ArmsScene.tsx:368-377` cadre sur `size.height * 0.45` sans tenir compte de la hauteur réelle de la feuille), et un véhicule absent (`visible={!away}`) laisse un socle vide sans rien qui dise où il est. La page « Les armes » ne montre donc **aucune arme**.
- `map3d/2-fondaco.png` : dans le domaine, le fondaco (k = 0,8) est recouvert par la pastille « Casa 1 », et les ateliers (échelle `model.s * 1.5`) sont petits sur leur tuile.
- Recommandation : un cadrage calculé sur la **zone utile** (entre le HUD et la feuille, mesurée en DOM et passée à la caméra comme décalage de vue avec `camera.setViewOffset`). C'est la même logique que pour la carte (point de l'audit du 3 novembre, lot 5).

**M9. Les contours dorés font 1 px, l'or ne se voit pas.**
- `Board3D.tsx:802-809` : `lineSegments` + `lineBasicMaterial`. WebGL dessine toujours ces traits sur **1 pixel physique**, quel que soit le zoom ou le dpr. Sur `4-dezoom.png` et `320x568-16-en-route.png`, le secteur achetable n'est qu'un fil jaune à peine visible. Or c'est le signal « à toi d'agir ».
- Correction : un ruban extrudé (un `BufferGeometry` de quads larges de 0,6 à 0,8 u, posé à y = 0,08) ou `Line2`/`LineMaterial` (`three/examples/jsm/lines`), en un seul appel. Même remède pour les bords de l'inconnu, qui pourraient en plus disparaître au dézoom.

**M10. Le précache est au bord de sa limite.**
- `vite.config.ts` : `maximumFileSizeToCacheInBytes: 3 * 1024 * 1024`. Le paquet principal fait 2 488 414 octets. Quelques fonctionnalités de plus, et Workbox **l'exclut du précache sans erreur**, ce qui casse l'usage hors ligne.
- La correction de B1 (découper la 3D) éloigne ce risque. Il faut aussi un garde dans le build (un test qui échoue si un fichier dépasse 2,5 Mo).

### Mineur

- **m1.** `Ticker` (`Board3D.tsx:491-509`) garde une boucle `requestAnimationFrame` **permanente**, même au repos. Elle est peu coûteuse, mais elle réveille le fil principal à 60 Hz. Mieux : un `setTimeout` jusqu'à `until` / `awakeUntil`, puis plus rien.
- **m2.** Les variantes de couleur du kit (`kit.tsx:101`, `src.clone()`) dupliquent `position`, `normal` et `uv` pour chaque `over`. De plus, `merged()` (`:66`) passe en non indexé et en float32, ce qui perd le bénéfice du soudage et de la quantification du pack (×2 à ×3 de sommets sur le GPU). Mieux : garder l'index, partager les `BufferAttribute` de position et de normale entre variantes (seule `color` change), et supprimer `uv` après la recoloration.
- **m3.** `Domain3D` : `shore` est un nouveau tableau à chaque rendu (`Board3D.tsx:975`), et `useMemo([shore])` refait la géométrie de la lagune à chaque rendu. Les `hexSlab` de `World` et `Domain3D` (`useMemo`) ne sont jamais libérés au démontage.
- **m4.** Les ombres : une carte 2048 en PCF doux couvre **tout** le plateau (`half = max(w,h) * 0.75`, `Board3D.tsx:405`). Quand l'empire grandit, la densité de texels chute et les ombres s'estompent. Comme elles sont statiques, on peut choisir 1024 sur mobile, ou caler le cadre d'ombre sur la zone révélée autour du fondaco. Les animaux n'ont qu'une `Blob` : c'est bien, mais elle manque dans la bataille (B2).
- **m5.** `antialias: false` sans SMAA ni FXAA dans le composer (`Board3D.tsx:279`) : les arêtes des tuiles et les traits crénelent à dpr 1, sur les Android d'entrée de gamme et les écrans de PC. L'effet `SMAA` coûte peu, et on peut le couper au palier bas.
- **m6.** Les projectiles sont tous des sphères (`Battle3D.tsx:761-763`, géométrie `ball`). Les carreaux d'arbalète ne se distinguent pas des boulets. Une deuxième géométrie (cylindre fin) dans le même pool suffit.
- **m7.** Un mort « s'efface » (`Battle3D.tsx:543-545`) : en fait, il disparaît d'un coup au premier rendu après 3 s, sans fondu.
- **m8.** Les pastilles HTML de la Porta (`PortaScene.tsx`, ancres `quay:i`) recouvrent les pieds des figurines (`porta/4-porta.png`). Il faut les ancrer sous le socle, avec un décalage en pixels qui dépend du zoom.
- **m9.** `MinisLab` (labo interne) est dans le précache et le build de production (`dist/assets/MinisLab-*.js`). Il faudrait le réserver au mode dev.
- **m10.** Les images de `art-src/islands/` (4,6 Mo de PNG) sont dans le dépôt, mais ne sont pas servies. Rien à corriger côté jeu ; à garder hors du `public/`.
- **m11.** La caméra de la carte cadre sans tenir compte du HUD : sur 320×568, Venise passe sous les pastilles du haut (`320x568-16-en-route.png`). Même remède que M8 (`setViewOffset` sur la zone utile).
- **m12.** `Probe` remet `gl.info.autoReset = false` et ne le rétablit pas (`Board3D.tsx:559`). C'est sans effet en jeu (seulement avec `?perf=1`), mais à corriger pour des mesures justes.

### Ce qui est bien et doit rester

- Rendu à la demande, ombres statiques (`shadowMap.autoUpdate = false`), AO coupée pendant les gestes.
- Un seul matériau d'argile en couleurs par sommet : aucune texture, donc pas besoin de KTX2 ni de compression de textures, et une DA « Plateau de nuit » cohérente (`recolor.ts`).
- Instanciation du décor et des tuiles : environ 56 appels pour la carte de départ.
- Caméra orthographique calquée sur celle du SVG (`camera.ts`) : les calques HTML tombent au pixel près, et les tests de la caméra restent valables.
- Picking par prismes invisibles (`Zones`), sans rendu GPU, et animaux en mouvement touchés dans un rayon de 26 px.
- Perte de contexte gérée, repli SVG, détection WebGL qui rend son contexte de test.

---

## 4. Recommandations chiffrées (S ≤ ½ journée, M ≈ 1 à 2 jours, L ≥ 3 jours)

| # | Correction | Résout | Effort |
|---|---|---|---|
| R1 | `PortaScene`, `ArmsScene` (et `PortaSheet` si besoin) en `lazy()` dans `EmpireGame`, sous `Suspense`. Déplacer les `useGLTF.preload` hors du niveau module : les appeler quand la carte 3D est montée (kaykit, âne), et à l'ouverture du lieu de la Porta (minis). Vérifier dans le build que le paquet principal ne contient plus `WebGLRenderer`, avec un test de taille du paquet | B1, M10 | S |
| R2 | Bataille lisible : figurines ×2 à ×2,5 (ou caméra plus proche, centrée sur ses unités, avec un pan borné), décor de l'île réduit de moitié et plus bas que les unités autour des chemins, `Blob` sous chaque unité, anneau de camp épais sous ses unités (vert d'eau), contour clair des figurines du joueur (une coque inversée ou un liseré). Viser au moins 28 px de haut pour une unité à 390 px de large | B2 | M |
| R3 | `frameloop="demand"` pour `PortaScene` et `ArmsScene`, avec `invalidate()` sur les changements et un ticker à 20-30 images/s seulement pendant les animations. `Battle3D` : limité à 30 images/s (comme `Ticker`), et `demand` en mouvement réduit. `AnchorLayer` : ne réécrire une étiquette que si la caméra a bougé | B3 | S |
| R4 | Geler la carte quand un calque 3D plein écran est ouvert (prop `paused` sur Board3D : `Ticker` arrêté, `frameloop="never"`). Ensuite, envisager un seul `Canvas` partagé (drei `View`) | B3, M7 | S, puis L |
| R5 | `glow()` mémoïsé par couleur (une `Map`, comme `claySolid`) ; anneau de chargement en géométrie unique avec `drawRange` | M1 | S |
| R6 | Torche sans `pointLight` : flamme émissive et halo additif | M2 | S |
| R7 | Composer à la carte : `TiltShift2` monté seulement si `near` ; au palier bas, plus de composer du tout (`gl.toneMapping = ACESFilmicToneMapping`) ; `frameBufferType = UnsignedByteType` si la HDR ne sert pas | M3 | S |
| R8 | Paliers de qualité : `PerformanceMonitor` avec `onDecline`, puis dpr 1, puis composer coupé, puis ombres 1024 ; détection d'un rendu logiciel au démarrage (`failIfMajorPerformanceCaveat`, nom du renderer) qui passe directement au palier bas ; proposition du SVG si l'appareil reste sous 10 images/s | M4 | M |
| R9 | `pack-minis.mjs` : couleurs et poids en uint8 normalisé, normales quantifiées, animations rééchantillonnées, accessoires inutiles retirés. Si le porteur l'accepte, `'wasm-unsafe-eval'` dans la CSP et meshopt pour les trois `.glb` | M5 | S (sans wasm), M (meshopt) |
| R10 | Âne et cheval cuits en couleurs par sommet, une seule primitive | M6 | S |
| R11 | Fumées en un seul `InstancedMesh` ; libération des matériaux de `Smoke`, `useWater` et des `hexSlab` au démontage | M6, m3 | M |
| R12 | Contours d'or en rubans extrudés (ou `Line2`) de 0,6 à 0,8 u | M9 | S |
| R13 | Cadrage sur la zone utile (`setViewOffset` mesuré entre le HUD et la feuille) pour la carte, le domaine, l'armurerie et la Porta ; armurerie : socles devant la halle, véhicule absent figuré (silhouette en verre, étiquette « à la Porta ») | M8, m11 | M |
| R14 | Bataille sous `Guard3D` : repli sur `Battle.tsx` au lieu de `give3dUp` + rechargement | M7 | S |
| R15 | Kit : index gardé, attributs partagés entre variantes, `uv` supprimé après la recoloration | m2 | S |
| R16 | SMAA au palier haut ; `Ticker` sans boucle rAF permanente ; projectile « carreau » distinct ; fondu des morts ; `MinisLab` hors production | m1, m5 à m9 | S |

---

## 5. Top 10, par priorité

1. **R1, sortir three.js et les modèles du démarrage** (B1). Effort S. Gain : environ 600 Ko gzip de JS et 3,3 Mo de modèles en moins sur le premier écran, pour tout le monde.
2. **R3 + R4, plus de rendu continu dans la Porta, carte gelée sous les calques** (B3). Effort S. Gain : batterie et chauffe, moins de pertes de contexte.
3. **R2, une bataille lisible sur téléphone** (B2, règle d'or 8). Effort M.
4. **R5 + R6, fuites de matériaux et lumière de la torche** (M1, M2). Effort S. Supprime les saccades et la mémoire qui grimpe pendant les 10 minutes de combat.
5. **R7 + R8, chaîne d'effets et paliers de qualité adaptative** (M3, M4). Effort S + M. C'est le levier principal pour un Android d'entrée de gamme.
6. **R12, contours d'or épais** (M9). Effort S. L'or redevient visible comme « à toi d'agir ».
7. **R13, cadrage sur la zone utile** (M8, m11). Effort M. L'armurerie montre enfin ses armes ; le fondaco du domaine et Venise sortent de sous le HUD.
8. **R9, `minis.glb` allégé** (M5). Effort S sans wasm, gain d'environ 1,2 Mo ; M avec meshopt (décision CSP du porteur).
9. **R10 + R11, appels de dessin des animaux et des fumées, libérations** (M6). Effort S + M.
10. **R14 + garde de taille du précache** (M7, M10). Effort S. Plus de rechargement en plein combat, et plus de risque que le hors-ligne casse sans bruit.

À suivre après ces corrections : mesurer sur de **vrais téléphones** (`?perf=1`, un Android d'entrée de gamme et un iPhone ancien), puisque ce conteneur n'a pas de GPU ; puis refaire `e2e/map3d.mjs PERF=1` jusqu'au bout et `e2e/porta.mjs`.
