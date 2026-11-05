# Audit Blender et pipeline d'assets 3D (4 novembre 2026)

*Expert : modélisation low-poly stylisée, vertex colors, rigging et animation, export glTF/GLB, gltf-transform. Audit en lecture seule (aucun fichier du jeu modifié). Blender n'est pas installé dans le conteneur (`which blender` est vide) : toutes les mesures viennent de scripts `@gltf-transform/core` 4.5.1 lancés sur les fichiers servis, de la lecture du code (`apps/web/src/empire/map3d/`, `apps/web/src/empire/porta/`, `apps/web/scripts/pack-*.mjs`) et des captures (`shots/map3d`, `shots/porta`).*

## 1. Résumé

Le jeu tourne sur **trois sources 3D, toutes CC0, sans aucun modèle maison** : 21 modèles KayKit « Medieval Hexagon » (`kaykit.glb`, 739 Ko), 5 personnages KayKit « Adventurers » et le cheval Quaternius (`minis.glb`, 2,2 Mo), l'âne Quaternius (`donkey.glb`, 300 Ko). Le pipeline est **propre dans son principe** : un fichier par famille, des scripts gltf-transform reproductibles, une palette unique (« Plateau de nuit ») posée en code par les UV de l'atlas KayKit (`recolor.ts`). Ce choix évite toute texture, ce qui était imposé par la CSP (`blob:` et WebAssembly refusés).

Trois faiblesses, par ordre d'importance :

1. **Le jeu n'a pas un seul asset à lui.** Le fondaco est une maison à colombages KayKit au toit doré, flanquée d'une tour de château. Venise, les gondoles, les galères, la Porta et les reliques n'existent pas en 3D. C'est l'écart principal avec la DA (« rien ne raconte Venise », direction-artistique-2026-11 § 1). La DA « Îles de la nuit » (peinture, pierre d'Istrie, lanternes) et le plateau 3D « pâte à modeler » ont des styles qui divergent.
2. **`minis.glb` est trop lourd et mal préparé** : 2,2 Mo pour 6 figurines, dont 486 Ko de JSON (2 219 canaux d'animation, dont 1 727 statiques), des sommets en float32 partout, 17 accessoires que le jeu ne montre jamais, les os d'IK exportés comme articulations. Les deux originaux ne sont pas dans le dépôt, donc le pack ne se refait pas.
3. **Aucune convention d'échelle ni de pivot** : chaque modèle est ramené à « 1 unité de large » au chargement (`kit.tsx`, `merged`), puis remis à l'échelle par des nombres magiques (fondaco 5,8 ; tour 2,6 ; marché 8 ; église 6,4 ; figurines `MAN 2.4 × FIG 2.2` ; pins 4,5 à 6). Dans la bataille, un pin fait deux hommes et la hauteur d'une église. La Mage est 19 % plus petite que la Rogue parce que son chapeau entre dans sa hauteur.

Le chemin conseillé : un **kit maison sous Blender**, petit (une vingtaine d'objets vénitiens), qui reprend la règle de palette par UV de KayKit (une seule palette-atlas maison, recoloriée par le code). À cela s'ajoutent un fichier `.blend` par famille, un script d'export en ligne de commande et une étape gltf-transform unique, avec un budget par objet. KayKit reste pour le décor générique (rochers, pins, montagnes).

## 2. Inventaire mesuré

### 2.1 Fichiers servis (`apps/web/public/models/`)

| Fichier | Octets | gzip | JSON | Binaire | Nœuds | Maillages | Triangles | Sommets | Squelettes | Clips | Extensions |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| `kaykit.glb` | 739 036 | 250 279 | 22 Ko | 716 Ko | 51 | 26 | 19 996 | 30 025 | 0 | 0 | `KHR_mesh_quantization` |
| `minis.glb` | 2 245 396 | 845 955 | **486 Ko** | 1 759 Ko | 332 | 52 | 27 596 | 28 268 | 6 (5 × 41 os, 1 × 50) | 18 | aucune |
| `quaternius/donkey.glb` | 307 000 | 102 413 | 74 Ko | 233 Ko | 52 | 1 | 2 000 | 4 044 | 1 (50 os) | 2 | aucune |
| **Total** | **3,29 Mo** | **1,20 Mo** | | | | | 49 592 | | | | |

Répartition du binaire de `minis.glb` : POSITION 338 Ko, NORMAL 338 Ko, WEIGHTS_0 303 Ko (float32), COLOR_0 286 Ko (float32 VEC3), index 166 Ko, JOINTS_0 76 Ko, animations 237 Ko, matrices inverses de liaison 16 Ko.

### 2.2 Modèles KayKit « Medieval Hexagon » (`kaykit.glb`), par clé de `models.json`

| Clé | Fichier | Triangles | Taille d'origine L × H × P (u) | Rôle dans le jeu |
| --- | --- | ---: | --- | --- |
| pineA / pineB | tree_single_A / B | 50 / 220 | 0,57 × 1,20 × 0,55 | décor, bataille |
| rockA / C / E | rock_single_* | 18 / 40 / 71 | 0,30 × 0,07 × 0,28 … | décor |
| mountainA / B / C | mountain_* | 120 / 120 / 200 | 1,80 × 1,43–1,77 × 1,88 | décor, collines |
| homeA / homeB | building_home_*_blue | 1 011 / 1 393 | 0,79 × 0,93 × 0,85 | maisons ; **homeB = halle du fondaco** |
| church | building_church_blue | 1 601 | 1,03 × 1,65 × 1,16 | villes, palais, bataille |
| tower | building_tower_A_blue | 2 138 | 0,99 × 2,19 × 1,15 | **tour du fondaco**, Porta (pierre) |
| market | building_market_blue | **3 125** | 1,80 × 0,98 × 1,32 | quais, antiquaire, Remise |
| grain | building_grain | 230 | 1,87 × 0,39 × 2,09 | champ |
| forge | building_blacksmith_blue | **2 410** | 1,29 × 0,99 × 1,25 | briqueterie, verrerie |
| mine | building_mine_blue | 1 126 | 1,61 × 1,14 × 1,92 | glaisière, sablière |
| sawmill | building_lumbermill_blue | **3 170** | 1,37 × 1,71 × 1,19 | scierie |
| windmill | building_windmill_blue | **2 653** | 1,13 × 1,46 × 0,82 | moulin (ailes d'un seul tenant, pas d'animation) |
| woodcut | trees_A_cut | 288 | 1,66 × 0,21 × 1,69 | coupe de bois |
| crate / crateB | crate_*_small | 132 / 132 | 0,14³ | chantiers, bâts |

Chaque modèle porte une échelle de nœud héritée de l'export KayKit, entre 0,07 et 1,05 (`crate_A_small` 0,07, `rock_single_A` 0,149, `building_home_A_blue` 0,465…). `pack-models.mjs` ne l'applique pas aux sommets. Pivot : pied à y ≈ 0 (de −0,10 pour les racines des pins à −0,01), centré en X/Z à ±0,1 u près.

### 2.3 Figurines (`minis.glb`)

| Personnage | Triangles (tout) | Os | Maillages skinnés | Accessoires (nœuds rigides) | Hauteur tête / avec coiffe (u) |
| --- | ---: | ---: | ---: | --- | --- |
| Knight | 6 952 | 41 | 6 | 9 (4 boucliers, 3 épées, casque, cape) | 2,31 / 2,47 |
| Barbarian | 6 543 | 41 | 6 | 7 | 2,19 / 2,40 |
| Mage | 5 683 | 41 | 6 | 6 | 2,20 / **2,72** |
| Rogue | 6 377 | 41 | 6 | 6 | 2,19 |
| Rogue_Hooded | 6 035 | 41 | 6 | 6 | 2,25 |
| Horse (Quaternius) | 2 182 | 50 | 1 (8 matériaux) | — | 4,81 (longueur 5,68) |

18 clips, tous en `LINEAR` : 14 du squelette commun (Idle 1,07 s, Walking_A, Running_A, deux coups, deux tirs, sort, Block, Hit_A, Death_A, Death_A_Pose (0 s), Cheer, Sit_Chair_Idle 3,6 s) et 4 du cheval (`Horse_Idle/Walk/Gallop/Death`). Jusqu'à 4 influences par sommet ; 410 des 486 sommets du bras du Knight en ont plusieurs.

### 2.4 Images (`apps/web/art-src/`, `public/art/`)

- `art-src/buildings/` : 13 PNG de 1 200 × 900 (139 à 369 Ko), l'ancienne bible. `public/art/` : 416 Ko.
- `art-src/islands/` : 6 PNG détourés « Îles de la nuit » (562–693 × 656–736, 0,69 à 0,89 Mo chacun), en attente.
- `art-src/models/kaykit/hexagons_medieval.png` : atlas 1 024², 8 × 4 cases de 128 × 256 px, chacune un dégradé vertical. Le mapping `ROLE` de `recolor.ts` correspond aux couleurs de l'atlas (vérifié case par case : bleu 29a8e0 = « roof », f5cb60 = « plot », etc.).

## 3. Constats

Gravité : **B** bloquant (à régler avant une mise en production ou avant d'aller plus loin), **M** majeur, **m** mineur. Effort : S (≤ ½ journée), M (1–3 jours), L (> 3 jours).

### Bloquants

**B1. `minis.glb` et `donkey.glb` ne se reconstruisent pas depuis le dépôt (pipeline non reproductible).** `pack-minis.mjs` lit `art-src/models/kaykit-adventurers/*.glb` et `art-src/models/quaternius/Horse.gltf`, et aucun des deux n'est dans le dépôt. Le README dit au passage `gltf/`, alors que le script lit des `.glb`. L'âne n'a aucun script : sa conversion (« Walk et Idle gardés, rééchantillonnés ») a été faite à la main. Le README précise aussi que la quantification « cassait le skinning ». En l'état, personne ne peut retoucher une figurine, ajouter un clip ou corriger un poids sans refaire des téléchargements non documentés au commit près. Le Knight a un commit épinglé, pas le cheval ni l'âne. *Reco* : verser les sources (18 Mo) via Git LFS, ou noter pour chaque fichier son URL exacte et son SHA-256 dans un `art-src/models/SOURCES.json` vérifié par le script. Écrire `pack-donkey` (ou fondre l'âne dans `pack-minis`). Effort S.

**B2. Provenance Quaternius non vérifiée (âne et cheval).** Les deux fichiers viennent de copies tierces sur GitHub (`laoniutoushx/TD-demo-2024-04-03`). Le README et plateau-reprise § 7 le notent eux-mêmes : « à revérifier contre l'archive officielle avant une mise en production ». La licence CC0 n'est pas en cause, mais un fichier modifié par un tiers peut l'être. *Reco* : comparer le SHA-256 à l'archive officielle (quaternius.com ou itch.io, depuis un poste qui y a accès) et l'inscrire dans `SOURCES.json`. Mieux encore : remplacer par la mule maison (A3), qui règle aussi « un âne pour une mule ». Effort S.

**B3. Le jeu n'a aucun asset propre, et le lieu central est un faux.** Le fondaco est `homeB` (maison à colombages) × 5,8 plus `tower` (tour de château) × 2,6, avec le toit recolorié en or (`Board3D.tsx` l. 1128-1150). Le palais est une église. Les villes vénitiennes sont des maisons KayKit. La Porta est faite de deux tours de château grises et d'une arche. plateau-reprise § 7 « Limites » le reconnaît : « maisons KayKit à colombages (plus médiévales que vénitiennes) ». La DA demande « pierre d'Istrie, brique, tuile, verre de Murano, feuille d'or » et « un toit un peu trop pentu ». Rien de cela n'est modélisé, et la capture `3-mule.png` montre un manoir anglo-normand. Ce n'est pas un défaut technique, mais c'est ce qui empêche le jeu d'être reconnaissable (règle d'or 8, « tout se voit »). *Reco* : le kit maison du § 5, en commençant par le fondaco, la mule et la gondole. Effort L, mais morcelable en lots de taille M.

### Majeurs

**M1. Le JSON de `minis.glb` pèse 486 Ko (22 % du fichier) : 2 219 canaux, dont 1 727 n'ont que 1 ou 2 clés.** Ce sont les pistes statiques que l'export Blender garde pour chaque os à chaque clip (41 os × 3 chemins × 14 clips). *Reco* : à l'export, « Always Sample Animations » désactivé, « Optimize Animation Size » activé, « Export Deformation Bones Only » coché. En post-traitement, supprimer les canaux dont la valeur est égale au repos du nœud (fonction maison de 20 lignes dans le pack : comparer la sortie à `node.getTranslation/Rotation/Scale`). Gain estimé : 300 à 400 Ko bruts, et moins de travail pour `AnimationMixer` sur chaque figurine (40 figurines × 123 pistes au palier 6, voir plan-porta-3d « Ce qui reste »). Effort S.

**M2. Les os d'IK et de contrôle sont exportés comme articulations.** Sur 41 os, 14 sont `kneeIK`, `heelIK`, `IK-foot`, `IK-toe`, `control-foot-roll`, `control-heel-roll` et `control-toe-roll`, ×2. Ils ne déforment rien, mais three.js les met à jour, les anime et les envoie au shader (texture d'os). *Reco* : export « Deform Bones Only » (sources KayKit dans Blender) ou retrait des joints sans poids dans le script. 41 → 27 os. Effort S.

**M3. Les sommets des figurines sont tous en float32 (pas de quantification), et 17 accessoires sont embarqués sans jamais servir.** Essais faits dans le scratchpad, sans toucher au dépôt :

| Variante de `minis.glb` | Octets | gzip |
| --- | ---: | ---: |
| actuel | 2 245 396 | 845 955 |
| sans les 17 accessoires que `roster.ts` ne montre jamais (Spike_Shield, Rectangle_Shield, Mug, Spellbook…) | 2 073 552 | 780 378 |
| + COLOR_0 en uint8 normalisé | 1 915 360 | 763 579 |
| + quantification (position 14 bits, normale 10, poids 8) | 1 559 156 | 571 412 |

La dernière ligne doit être validée à l'écran. `quantize` de gltf-transform recrée les squelettes, et c'est probablement ce que le README a vu « casser le skinning ». En général, la cause est que l'échelle de dé-quantification est posée sur le nœud du maillage skinné, que three.js ignore pour un `SkinnedMesh` lié à `bindMatrix`. Deux voies : quantifier seulement NORMAL, COLOR_0, WEIGHTS_0 et JOINTS_0 (sans risque, environ −25 %), ou appliquer la quantification des positions dans la matrice de liaison (`bindMatrix`). Avec M1, `minis.glb` passe de 2,2 Mo à environ 1,2 Mo (moins de 500 Ko gzip). Même traitement pour l'âne : 307 Ko → 226 Ko (80 Ko gzip). Effort S à M.

**M4. Le kit est désindexé au chargement : la soudure du pack ne sert plus.** `kit.tsx`, `merged()`, appelle `g.toNonIndexed()` sur chaque maillage avant `mergeGeometries`. 19 996 triangles indexés sur 30 025 sommets deviennent 59 988 sommets en mémoire GPU (×2), soit autant d'invocations du vertex shader par instance. Il faut ajouter à cela les attributs reconvertis en float32 (`Float32Array` à la main), alors que le pack est quantifié. *Reco* : garder les index (tous les maillages KayKit en ont, `mergeGeometries` les accepte s'ils en ont tous) et garder les attributs normalisés (three.js les lit tels quels). Effort S.

**M5. Pas d'échelle de référence : tout est normalisé « à 1 unité de large » puis remis à l'œil.** Voici les hauteurs à l'écran déduites du code :

| Lieu | Objet | Hauteur (u carte) | Rapport à un homme |
| --- | --- | ---: | ---: |
| Bataille | figurine (`MAN 2.4 × FIG 2.2`) | 5,3 | 1 |
| Bataille | pin (`s 4,5–6` × 2,08) | 9,4–12,5 | **1,8–2,4** |
| Bataille | église de ville (`6,4` × 1,60) | 10,2 | 1,9 |
| Carte | maison `homeA` (5,4 × 1,17) | 6,3 | — |
| Carte | halle du fondaco (5,8 × 1,46) | 8,5 | — |
| Carte | âne (longueur 2,2–2,4) | ≈ 1,9 | 0,3 maison |

Dans la bataille, un pin est aussi haut qu'une église et deux fois plus haut qu'un soldat (capture `6b-bataille-pres.png` : les figurines disparaissent sous les arbres). Le « 1 unité de large » fait aussi qu'un modèle change de taille quand on change son contenu (un accessoire, un auvent). *Reco* : une convention unique, **1 unité Blender = 1 mètre, hauteur d'homme = 1,75**, les assets livrés à leur vraie taille, mise à l'échelle uniforme « diorama » côté scène (un seul `WORLD_SCALE`), avec une exagération miniature assumée et documentée (bâtiments × 0,6, arbres × 0,5 par rapport aux hommes, à la façon des jeux de plateau). La normalisation par boîte englobante reste en secours pour les modèles tiers. Effort M (convention et retouche des constantes ; les modèles maison naissent à l'échelle).

**M6. La hauteur des figurines dépend de leur coiffe.** `useMini` ramène `Box3.setFromObject(root).y` à `height`, et cette boîte compte le casque et le chapeau. Le chapeau de la Mage monte à 2,72 contre une tête à 2,20 : à `height` égale, son corps fait 2,4 × 2,20 / 2,72 = 1,94 contre 2,4 pour la Rogue, soit **19 % plus petite**. Le Knight casqué perd 6 %. Les accessoires cachés comptent aussi, puisque `Box3` ignore `visible`. *Reco* : mettre à l'échelle sur les seuls maillages skinnés (ou sur un os `head`), ou mieux, livrer les figurines à l'échelle (M5). Effort S.

**M7. Recoloriage des figurines par heuristique HSL.** `tint()` (`minis.tsx`) reconnaît la peau par « teinte entre 0,03 et 0,11, luminosité > 0,62 » et le cuir « sombre et chaud ». Ces seuils, posés sur 1 361 couleurs de sommets distinctes issues de la cuisson, sont fragiles : toute retouche de texture ou tout nouveau personnage déplace les seuils, et des cuirs clairs, cheveux roux ou bois peuvent basculer dans l'accent du camp. La cuisson échantillonne aussi le texel sous chaque sommet (au plus proche), ce qui perd les détails qui tombent entre les sommets (yeux, boucles, liserés). *Reco* : appliquer aux figurines la règle de `recolor.ts`, c'est-à-dire garder les UV sur un **atlas-palette maison** dont chaque case a un rôle (peau, tissu-camp-1, tissu-camp-2, métal, cuir, bois…). Le code peint par rôle, de façon déterministe, sans texture chargée. Les personnages KayKit utilisent déjà un atlas à cases : un remapping des UV dans Blender suffit. Effort M.

**M8. Pas de LOD, et des bâtiments trop denses pour leur taille à l'écran.** market 3 125 triangles, sawmill 3 170, windmill 2 653, forge 2 410, tower 2 138 : au zoom de départ, ces modèles font 30 à 60 px (plateau-reprise § 7 « Limites »). La mesure `perf.json` donne jusqu'à 99 072 triangles et 137 appels de dessin au repos. Une figurine fait 6 000 à 7 000 triangles avec 7 à 10 maillages, donc autant d'appels de dessin : 40 figurines, c'est environ 280 000 triangles et 300 à 400 appels. *Reco* : deux niveaux par bâtiment (LOD0 ≤ 1 200 triangles pour le gros plan et le domaine, LOD1 ≤ 300 pour la carte), produits dans Blender (Decimate « Planar » puis nettoyage) ou par `simplify` de gltf-transform avec `meshoptimizer` (côté outil seulement, aucun WASM au runtime). Pour les figurines : fusionner corps et accessoires visibles en un seul `SkinnedMesh` par rôle (accessoires rattachés à l'os `handslot`), ce qui donne 1 appel de dessin au lieu de 7 à 10, et un imposteur sans squelette au-delà d'une distance (plan-porta-3d le prévoit). Effort M.

**M9. Deux directions artistiques en concurrence.** Les illustrations « Îles de la nuit » (peinture, lanternes, liseré cyan, `art-src/islands/`) et le plateau « pâte à modeler » KayKit (aplats, toits bleus, colombages) ne racontent pas le même monde. Les `buildings/*.png` de l'ancienne bible sont un troisième style. Les captures montrent aussi des toits terre cuite dans la bataille et des toits bleus sur la carte. *Reco* : décider, avec le porteur, que la 3D fait foi pour tout ce qui est « dans le monde » (bâtiments, véhicules, figurines). Les illustrations peintes seraient alors réservées aux portraits, reliques et cartes. Mieux encore : **générer ces vignettes à partir des modèles 3D** (rendu Blender orthographique, palette identique), pour que l'atelier de la feuille et celui de la carte soient le même objet. Effort S (décision) puis M.

**M10. Le pipeline ne vérifie rien.** Aucun budget n'est contrôlé, aucun nom n'est validé, et un modèle manquant devient en silence une caisse (`kit.tsx` : « a crate stands for it »). *Reco* : un `art-src/check-models.mjs` lancé en CI qui contrôle triangles et os par clé, extensions autorisées, absence de texture, échelle racine = 1, pied à y = 0, présence de chaque clé de `models.json` et de chaque clip cité dans `roster.ts`. Effort S.

### Mineurs

- **m1. Nœuds de maillage anonymes** dans `kaykit.glb` (tower, sawmill, windmill : `(1538t)` sans nom) et échelles résiduelles 0,07–1,05 sur les nœuds : sans effet tant que tout est fusionné, mais gênant pour animer une pièce (les ailes du moulin, la scie). *Reco* : dans le pack, appliquer les transformations aux sommets (`flatten` puis `clearNodeTransform`) et nommer chaque pièce `<clé>_<partie>`. S.
- **m2. Ailes du moulin, roue de la scierie, drapeau : fixes ou faits en code.** Les modèles maison doivent séparer les pièces mobiles (pivot à l'axe de rotation, nom `*_rot`) pour que le code les fasse tourner. S par modèle.
- **m3. `Death_A_Pose` est un clip de 0 s (83 canaux)** : une pose, qui peut rester une pose (dernière image de `Death_A` avec `clampWhenFinished`, que le code fait déjà). Le retirer. S.
- **m4. Pivots des animaux non centrés** : cheval de z −2,22 à +3,46, âne de −1,71 à +3,00. Le pivot est à l'arrière du corps. Le code place les cavaliers par `saddle = 0,62 × hauteur` et les brancards à l'œil. *Reco* : pivot au sol sous le centre de gravité, plus un point d'attache nommé (`socket_saddle`, `socket_pack`, `socket_shaft`) en nœud vide exporté. S.
- **m5. Matériaux** : `doubleSided: true` sur toutes les figurines (le chargeur crée des matériaux double face, remplacés ensuite par `clayMini`, mais l'export est inutilement double face) ; `knight_texture` est partagé par les 5 personnages après cuisson. Sans effet aujourd'hui (le code remplace tout), à nettoyer à l'export. S.
- **m6. Images sources lourdes** : les îles font 0,7 à 0,9 Mo en PNG RGBA pour un affichage de 100 à 200 px. Le script `art.mjs` les réduira peut-être, mais ce n'est pas vérifié ici. Prévoir WebP 2× la taille d'affichage. S.
- **m7. Nomenclature hétérogène** : clés camelCase (`homeA`, `crateB`), fichiers KayKit snake_case avec suffixe de couleur (`_blue`), clips Mixamo-like (`1H_Melee_Attack_Chop`), clips Quaternius préfixés à la main (`Horse_`), personnages en PascalCase. *Reco* : voir § 5.2. S.
- **m8. README de `public/models`** : « 21 modèles » est juste, mais 755 Ko / 262 Ko ne correspondent plus (739 036 / 250 279 mesurés). Le chemin `Characters/gltf/` ne correspond pas aux `.glb` que lit le script. S.

## 4. Ce qui est bien et doit rester

- **Une palette, posée par le code, par rôles d'atlas** (`recolor.ts`) : c'est exactement la bonne idée pour un kit low-poly sans texture, et elle permet les variantes (toit d'or, ville éteinte) sans dupliquer les modèles. Le kit maison doit la reprendre.
- **Un fichier par famille, une requête** : ce choix est bon. Il faut seulement le compléter par un fichier « mondes » (bâtiments) et un fichier « acteurs » (figurines, animaux).
- **KHR_mesh_quantization sans décodeur** : c'est le seul gain de compression compatible avec une CSP sans WebAssembly. Draco et Meshopt demandent `'wasm-unsafe-eval'`, à ne lever que sur décision de sécurité. Avec la quantification et le gzip ou brotli du serveur, on reste très bien.
- **Licences** : tout est CC0, les textes de licence sont copiés, l'auteur est crédité, le commit de la source Adventurers est épinglé. Il ne manque que l'empreinte des fichiers Quaternius (B2).
- **Clones de squelette, géométries teintées partagées par camp** (`tinted` en cache) : c'est correct.

## 5. Proposition de pipeline Blender

### 5.1 Arborescence

```
apps/web/art-src/
  blend/                      # sources maison (Git LFS), une famille par fichier
    palette.blend             # l'atlas-palette maison et son matériau unique
    venice_buildings.blend    # fondaco, palazzo, case, campanile, ponts, quais
    venice_boats.blend        # gondole, sandolo, burchio, galère
    actors.blend              # mule, cheval, porteurs, marchands (un squelette « Biped », un « Quadruped »)
    porta.blend               # porte de Rome, Porta noire, ruines, coffres, reliques
    props.blend               # caisses, ballots, tonneaux, amphores, marchandises (GoodsMark en 3D)
  palette/palette.png         # 16 × 16 cases (256 rôles), source unique des couleurs
  models/third-party/         # KayKit et Quaternius tels quels + SOURCES.json (URL, commit, SHA-256)
  export/                     # .glb intermédiaires écrits par Blender (ignorés par git)
  blender/export.py           # export en ligne de commande
  check-models.mjs            # budgets et conventions (CI)
apps/web/scripts/pack-*.mjs   # gltf-transform : fusion, soudure, quantification, nettoyage des clips
```

### 5.2 Conventions (à écrire dans `art-src/README.md`)

- **Unités** : 1 u = 1 m ; homme 1,75 ; mule 1,5 au garrot ; maison 7–9 ; fondaco 12–14 ; campanile 25–30 (exagérations de miniature documentées dans une table, appliquées dans le `.blend`, pas dans le code).
- **Axes et pivot** : +Y en haut dans le glTF (Z en haut dans Blender, conversion à l'export), face principale vers +Z glTF (−Y dans Blender), pivot au sol au centre de l'emprise, transformations appliquées (Ctrl+A) avant export, échelle d'objet = 1.
- **Couleurs** : un seul matériau `M_Palette`. Chaque face est mappée en UV sur le **centre** d'une case de `palette.png` (UV plates, sans dégradé : le dégradé est fait par le code, `k = 1,04 − 0,16 t`, ou par un second canal). Le code lit le rôle par case, comme `recolor.ts`. Pas de COLOR_0 dans les sources.
- **Ombrage** : normales « flat » sur les volumes durs (auto-smooth à 30°), « smooth » sur les rondeurs « pâte à modeler » (biseau de 2 segments sur les arêtes vives, c'est ce qui donne le rendu des références).
- **Noms** : objets `SM_<famille>_<nom>[_<variante>]` (`SM_bld_fondaco`, `SM_boat_gondola`), pièces mobiles `<objet>__rot_<axe>` (`SM_bld_mill__rot_z`), sockets `SOCKET_<nom>` (vides), LOD `<objet>_LOD0/1`, squelettes `RIG_biped` / `RIG_quad`, clips `<rig>_<action>` en snake_case (`biped_walk`, `quad_trot`, `quad_idle`). Les clés de `models.json` deviennent les noms d'objet sans préfixe.
- **Budgets (triangles)** :

| Famille | LOD0 (gros plan, domaine) | LOD1 (carte) |
| --- | ---: | ---: |
| Fondaco, palazzo, Porta | 2 500 | 600 |
| Atelier, maison, campanile | 1 200 | 300 |
| Bateau | 800 | 200 |
| Animal skinné | 1 500, ≤ 24 os | — |
| Figurine skinnée | 2 000, ≤ 27 os, accessoires fusionnés | imposteur |
| Prop (caisse, ballot) | 60–150 | — |

### 5.3 Export reproductible

`blender -b art-src/blend/venice_buildings.blend --python art-src/blender/export.py -- --out art-src/export/` : le script parcourt les collections `EXPORT_*`, applique les modificateurs (biseau, miroir), génère le LOD1 par Decimate si absent, puis exporte en glTF binaire avec ces options : `export_apply=True`, `export_yup=True`, `export_texcoords=True`, `export_normals=True`, `export_colors=False`, `export_materials='EXPORT'`, `export_image_format='NONE'`, `export_def_bones=True`, `export_anim_single_armature=True`, `export_optimize_animation_size=True`, `export_force_sampling=False`, `export_animation_mode='ACTIONS'`. Ensuite `pack-*.mjs` fait la fusion par clé, `weld`, `dedup`, `quantize` (positions 14, UV 12, normales 10, poids 8) pour le statique, le nettoyage des canaux constants et la quantification hors positions pour le skinné, puis `prune`. `check-models.mjs` passe en CI. Blender doit être dans une version épinglée (4.2 LTS) et le script ne dépend d'aucun add-on.

### 5.4 Animations à prévoir

- Mule et cheval (`RIG_quad`) : `idle`, `walk`, `trot`, `load` (bât qui se pose), `celebrate` (ruade courte), `hit`, `die`. Cycles bouclés à image identique, 24 i/s, 0,8–1,2 s.
- Figurines (`RIG_biped`) : garder les 12 clips utiles KayKit (sans `Death_A_Pose`). Pour les marchands, porteurs et gondoliers : `row` (rame de gondolier, appui en poupe), `carry` (porter une caisse), `haggle`.
- Objets (pas de squelette, animation par le code sur les pivots `__rot`) : ailes du moulin, roue hydraulique, voile qui se gonfle (morph à 2 cibles au plus), drapeau (déjà en code).

## 6. Assets à créer ou refaire, par priorité

| # | Asset | Pourquoi | Budget LOD0 | Effort |
| ---: | --- | --- | ---: | --- |
| A1 | **Fondaco vénitien** : façade à arcades sur l'eau, loggia, merlons, pierre d'Istrie, toit de tuiles, quai, une variante « toit d'or » par le rôle `roofGold` ; 3 niveaux visuels (1, 2, 3+) | Le lieu central est une maison KayKit (B3) | 2 500 | M |
| A2 | **Atlas-palette maison** + mise en UV des 5 personnages KayKit sur cet atlas | Base de tout le reste, supprime l'heuristique HSL (M7) | — | M |
| A3 | **Mule bâtée** (`RIG_quad`, bât et caisses en sockets) ; le cheval sur le même squelette | « Un âne pour une mule », provenance (B2), une seule source | 1 500 | M |
| A4 | **Gondole et burchio** (barge de marchandises), pièce `__rot` pour la rame, gondolier en figurine | La lagune est vide, la DA demande « des gondoles qui passent » | 800 | M |
| A5 | **Villes vénitiennes** : 3 case à toits de tuiles et cheminées en entonnoir (`camino`), un palazzo gothique, un campanile, un pont | Les villes sont médiévales génériques | 1 200 | M |
| A6 | **La Porta** : porte de Rome (arc de briques, statues), la Porta noire, ruines antiques, coffre de reliques | Aujourd'hui deux tours KayKit grises et une arche | 2 500 | M |
| A7 | **Ateliers des métiers vénitiens** : verrerie (four à coupole), briqueterie, salines, tissage, épicerie ; remplacent forge, mine et scierie KayKit | Le métier doit se lire à la silhouette (DA § 2) | 1 200 | L (lot de 6–8) |
| A8 | **Props de marchandises** en 3D (les 21 `GoodsMark` : sacs, ballots, tonneaux, amphores, vases) | Commandes en caisses sur les quais (lot 4) : à remplacer par la marchandise elle-même | 60–150 | M |
| A9 | **Galère marchande** (`galea da mercato`) pour les voyages longs | Grand moment visuel du commerce, plus tard | 1 500 | M |
| A10 | LOD1 des bâtiments KayKit gardés (market, sawmill, windmill, forge, tower) | Budget au zoom de départ (M8) | 300 | S |
| A11 | Pins et oliviers à la bonne échelle (version basse, oliviers pour la Terraferme) | Pins ×2 un homme (M5) | 80 | S |
| A12 | Vignettes 2D des ateliers rendues depuis Blender (orthographique, même palette) | Une seule DA pour l'atelier sur la carte et dans la feuille (M9) | — | S par lot |

## 7. Top 10

1. **Verser les sources des figurines et de l'âne, avec URL, commit et SHA-256, et scripter l'âne** (B1, B2). S.
2. **Créer le fondaco vénitien maison** comme premier asset propre, en posant au passage les conventions du § 5 (B3, A1). M.
3. **Alléger `minis.glb`** : canaux constants retirés, os d'IK retirés, accessoires inutiles retirés, couleurs et poids en 8 bits. 2,2 Mo → environ 1,2 Mo, moins de 500 Ko gzip (M1, M2, M3). S.
4. **Garder les index du kit au chargement** (ne plus appeler `toNonIndexed`) : ×2 sommets GPU évités (M4). S.
5. **Fixer l'échelle du monde** (1 u = 1 m, table d'exagération miniature) et supprimer les nombres magiques de taille. Les pins de la bataille repassent sous l'église (M5, A11). M.
6. **Mettre les figurines à l'échelle par le corps, pas par la coiffe** : la Mage reprend ses 19 % (M6). S.
7. **Créer l'atlas-palette maison**, qui sert aux figurines comme au kit, et retirer l'heuristique HSL (M7, A2). M.
8. **Créer la mule maison et la gondole** sur un squelette quadrupède commun et des sockets (A3, A4). M.
9. **Mettre en place les LOD et la fusion des accessoires en un maillage skinné par rôle** avant la bataille de palier 6 (M8, A10). M.
10. **Ajouter `check-models.mjs` en CI et un `export.py` Blender en ligne de commande**, pour que budgets, noms, pivots et clips soient vérifiés à chaque pack (M10, § 5.3). S.

## Annexe : méthode et reproduction

Scripts d'inspection (hors dépôt) : `inspect.mjs` (scènes, matériaux, squelettes, clips, boîtes par modèle), `detail.mjs` (octets par usage, maillages par personnage, influences, couleurs), `attr.mjs` (octets par attribut), `h.mjs` (hauteurs tête et coiffe), `opt.mjs` (variantes allégées de `minis.glb` et de l'âne, écrites dans le scratchpad seulement). Ils sont lancés depuis `apps/web` avec `@gltf-transform/core` 4.5.1. Les rapports d'échelle du § 3 M5 sont calculés à partir des facteurs du code (`Board3D.tsx` l. 886-901 et 1130-1150, `Battle3D.tsx` l. 52-56 et 132-148, `roster.ts` `MAN`, `fleet3d.tsx` l. 112) et des rapports hauteur / largeur mesurés dans `kaykit.glb`.
