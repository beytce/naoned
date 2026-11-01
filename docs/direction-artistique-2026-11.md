# Direction artistique « Îles de la nuit » (proposition du 1er novembre 2026)

*Proposition à valider par le porteur. Elle prolonge la direction Lagune (`docs/design.md`) sans la contredire : mêmes palettes d'interface, mêmes formes, même règle « un lieu est un astre ». Elle remplace la bible de style de `docs/commandes-images.md` pour les illustrations : même dossier `art-src/`, même script.*

## 1. Le constat

- **Les ateliers déjà générés disparaissent dans la carte.** La bible demandait de peindre les objets avec la palette de l'interface (bleu nuit, lapis). Résultat : la Briqueterie est un bâtiment bleu nuit sur une carte bleu nuit, en aplat, sans lumière. Un objet de jeu doit trancher sur son fond, pas s'y fondre.
- **La carte n'a ni vie ni échelle.** Les villes sont des sphères dorées toutes semblables, le comptoir est un disque jaune, les secteurs sont des hexagones vides avec une texture de vagues. Rien ne bouge, rien ne raconte Venise.
- **Aucun visage.** Lorenzo est un petit dessin SVG ; les joueurs, les artisans, l'ennemi de la Porta n'ont pas de figure.
- **Les objets touchés n'ont pas de matière** : composants, reliques, marchandises sont des pictos.

## 2. L'idée : chaque lieu est une île dans la nuit

Venise est faite d'îles. Hades' Star fait de chaque lieu une planète. **Fondaco fait de chaque lieu une petite île ronde** qui flotte sur la lagune nocturne : un disque de terre, de pierre d'Istrie et de briques, avec son bâtiment dessus, vu de trois quarts, comme un diorama précieux posé sur la carte. C'est la règle « un lieu est un astre » rendue concrète, et c'est ce qui rendra le jeu reconnaissable au premier regard.

**La lumière fait tout** : des objets chauds sur un fond froid.
- **Lumière de lanterne** de l'intérieur : fenêtres orangées, four rougeoyant, feu de forge. C'est ce qui fait « habité ».
- **Liseré de lune cyan** sur les bords (la lumière de la lagune), pour détacher chaque silhouette du bleu nuit.
- **Les matières** : pierre d'Istrie blanc crème, brique et tuile terre cuite, bois patiné, verre de Murano, feuille d'or, laiton et bronze. Le bleu nuit n'est **que** dans l'ombre et le fond.

**Ludique sans être enfantin** :

| Oui | Non |
| --- | --- |
| Silhouettes franches, lisibles à 48 px, une forme qui raconte le métier (cheminée, roue, voiles) | Têtes énormes, grands yeux, chibi |
| Légère exagération de miniature (tilt-shift) : un toit un peu trop pentu, un four un peu trop grand | Couleurs bonbon saturées, contours noirs épais de dessin animé |
| Petits détails de vie : du linge, un chat, des sacs, une barque amarrée | Bâtiments qui sourient, mascottes |
| Peinture numérique soignée, ombres douces, textures légères | Photoréalisme, 3D plastique brillante |
| Personnages peints en buste, proportions adultes, à la Carpaccio et Antonello de Messine stylisés | Personnages « mobile game » génériques |

**Les références à donner en tête** (pour l'esprit, jamais à copier) : les miniatures de Monument Valley pour la lisibilité des volumes ; Carpaccio (*Le Miracle de la relique de la Croix*) pour la vie vénitienne ; les portulans et les enluminures pour les ors ; la nuit de Hades' Star pour le contraste.

**Ce que fera le code, pas l'image** (la vie vient surtout de là) : la fumée des cheminées, le scintillement des fenêtres, l'île qui flotte d'un pixel, le reflet dans l'eau, les mouettes, les gondoles qui passent entre les secteurs, la mule qui trotte et la charrette qui cahote, la lueur de l'or quand un lot est prêt. Les images sont donc fixes, sans fumée ni reflet peints : je les anime.

## 3. L'outil

Gemini a refusé la planche de style (1er novembre 2026) : un texte long, quatre sujets différents et des styles d'artistes nommés le font décrocher. On passe à un outil qui tient les textes longs.

| Outil | Pourquoi | Limite |
| --- | --- | --- |
| **Microsoft Copilot** (copilot.microsoft.com, ou Bing Image Creator) — recommandé | Gratuit avec un compte Microsoft ; le même générateur d'images qu'OpenAI, qui suit fidèlement les textes longs et les grilles ; on peut lui joindre une image de référence et demander une retouche | Quota quotidien ; fond transparent pas toujours tenu : garder le magenta |
| **ChatGPT** (offre gratuite) | Le même générateur, le plus obéissant ; sait faire un **fond transparent** (« transparent background, PNG ») ; garde le style dans la conversation | Peu d'images par jour en gratuit |
| Leonardo.ai (offre gratuite) | Fond transparent natif, « Style Reference » | Jetons quotidiens limités ; moins constant |

Méthode : **une conversation par famille**. On commence par **un seul sujet par image** avec le bloc STYLE court (ci-dessous) ; une fois la planche de style réussie, on la joint à chaque message et on peut passer à quatre sujets par image (grille 2 × 2). Tu m'envoies les images telles quelles : je les découpe, je retire le fond, je nomme et je range.

### Le bloc STYLE court (si un outil refuse ou se perd)

```
Hand-painted digital miniature for a premium mobile strategy game set in Venice in 1450.
Three-quarter top-down view, clean readable shapes, soft painterly shading, warm orange
lantern light in the windows, thin cyan moonlight on the edges, rich grown-up colours
(terracotta, cream stone, ochre, olive, deep red). Elegant, not childish, not photorealistic.
Single subject centred on a plain flat magenta background. No text.
```

Puis une phrase pour le sujet, par exemple : « Subject: a small round floating island with a stone edge, carrying a Venetian brick kiln with a tall chimney, stacks of red bricks and a glowing kiln mouth. »

### La planche de style retenue (1er novembre 2026, Copilot)

Essai posé sur la carte : `docs/direction-artistique-2026-11/mock-carte.jpg` (en situation) et `mock-nuit.jpg` (sur le fond de l'orbite).

- **La Briqueterie sur son île flottante est la référence** : île ronde, dessous de roche et de racines, lumière du four. C'est l'image à joindre à chaque message suivant.
- **Le palais** est très beau, mais posé sur un socle carré : à refaire sur l'île ronde, comme la Briqueterie (sinon les lieux ne forment pas une famille).
- **La mule** est juste de caractère, mais sur un socle de figurine : les véhicules se font sans socle, ils roulent sur la carte.
- **Lorenzo** est réussi (visage, habit), mais avec un cadre et un fauteuil : les portraits se font sans cadre, le jeu dessine le sien.
- **Pas de fumée peinte** : le jeu l'anime.
- Le fond « magenta » sort en framboise sourde, pas en #FF00FF : ce n'est pas grave, le détourage lit la couleur du bord de chaque image.

À ajouter à la phrase du sujet, selon la famille :
- **lieux** : `standing on a small round floating island with a stone edge and a rocky underside with roots, exactly like the attached brick kiln. No smoke.`
- **véhicules** : `no base, no pedestal, no ground, the vehicle alone, same painting style as the attached image.`
- **portraits** : `bust portrait, no frame, no border, no chair, plain dark blue background, same painting style as the attached image.`

## 4. Les textes

Les textes sont en anglais : les générateurs le comprennent mieux. Chaque texte = **le bloc STYLE** + **le bloc de la famille** + **les quatre sujets**.

### Le bloc STYLE (à coller en tête de chaque message)

```
STYLE — "Islands of the night", a premium mobile strategy game set in Venice, 1450.
Hand-painted digital miniature, like a precious diorama: clean readable silhouettes, soft
painterly shading, subtle textures (Istrian white stone, terracotta brick and roof tiles,
weathered wood, Murano glass, gold leaf, bronze). Three-quarter top-down view from about 35°,
slight tilt-shift miniature feel. Lighting: warm lantern-orange light glowing from windows,
ovens and fires; a thin cool cyan moonlight rim light on the edges; deep soft shadows.
Colours are rich but grown-up (ochre, terracotta, cream stone, olive, deep red, brass gold);
night blue only in the shadows. Mature, elegant, playful through shapes and small lively
details, never childish: no chibi, no big eyes, no faces on objects, no thick black cartoon
outlines, no candy colours, no photorealism, no glossy plastic 3D.
Each subject is isolated and centred in its cell, fully inside the frame, on a perfectly flat
solid magenta background (#FF00FF) with no gradient, no floor shadow on the background, no
smoke, no water reflection. Absolutely no text, letters, numbers, signatures or frames.
```

### Lot 0 — La planche de style (à faire en premier, une seule image)

C'est elle qui fixe tout. Refaire jusqu'à ce qu'elle plaise, puis **me l'envoyer** : je la valide sur la carte avant la suite, et elle sera jointe à tous les messages suivants.

```
[STYLE]
A 2×2 grid of four game assets in the same style:
1. A small round floating island (a disc of earth and Istrian stone edging, about 3 times wider
   than tall) carrying a Venetian brick kiln with a tall chimney, stacks of red bricks, a glowing
   kiln mouth.
2. The same kind of round island carrying a Venetian Gothic merchant palazzo with ogee windows
   glowing warm, a small canal landing with a moored boat, a lion-of-Saint-Mark banner.
3. A mule carrying two wooden crates and a cloth sack, walking to the right, seen from the
   three-quarter top view, small and readable.
4. Half-length portrait of Lorenzo, a Venetian merchant mentor in his fifties, short grey
   beard, red berretta cap, dark blue robe with gold trim, kind but shrewd eyes, warm smile,
   painted in the manner of a stylised Renaissance portrait.
```

Les lots suivants commencent tous par : **« [STYLE] Same style as the attached reference sheet. A 2×2 grid of four game assets: »**, puis le bloc de famille, puis la liste. Une planche = un message ; les sujets sont groupés par quatre ci-dessous.

### Lot 1 — Les lieux du joueur, sur leur île (priorité 1)

Bloc de famille :
```
Each subject stands on its own small round floating island: a disc of earth with an Istrian
white stone edge, about 3 times wider than tall, flat on top, the building centred on it, a
few small details of life around it (sacks, barrels, a cart, a cat, laundry).
```

| Planche | Sujets (fichiers) |
| --- | --- |
| 1a | **Le comptoir de la Maison**, en trois tailles : 1. `post-1` a modest merchant warehouse (fondaco) of brick with a wooden loading crane and a small dock ; 2. `post-2` a larger stone fondaco with an arcaded ground floor, two storeys, crates on the dock ; 3. `post-3` a grand fondaco palace with a loggia, a small bell tower, banners and two moored boats ; 4. `casa` a Venetian Gothic palazzo with gilded quatrefoil windows, glowing at night |
| 1b | 1. `farm` a mainland farmhouse with terracotta roof, golden wheat sheaves and a ploughed strip ; 2. `clay_pit` an open clay pit with terracotta mounds, a wooden ladder and baskets ; 3. `lumber_camp` stacked logs, an axe in a stump, two pine trees, a small hut ; 4. `mill` a stone windmill with four cloth sails, flour sacks at its door |
| 1c | 1. `bakery` a bakery with a big brick bread oven glowing orange, loaves on a board ; 2. `brickworks` a brick kiln with a tall chimney and neat stacks of red bricks ; 3. `sawmill` a water-wheel sawmill with stacked planks ; 4. `sand_pit` pale sand heaps by a lagoon shore, a shovel and a small boat |
| 1d | 1. `glassworks` a Murano glass furnace with a glowing round mouth and coloured glass vases ; 2. `mirrorworks` a workshop with framed silver mirrors leaning on a bench ; 3. `sheepfold` a wooden-fenced sheepfold with three woolly sheep and a shepherd's hut ; 4. `loom` a weaver's house with a large wooden loom under an open porch, blue and cream cloth |
| 1e | 1. `tailor` a tailor's shop with a garment on a stand and bolts of cloth ; 2. `spicery` a spice house with sacks of saffron, pepper and cinnamon in bright heaps ; 3. `depot` (la Remise) a large wooden carriage barn with open double doors, a cart and a mule inside, tools on the wall ; 4. `camp` (le Campo) a Venetian campo square with a stone wellhead, market stalls with striped awnings and a flag pole |
| 1f | 1. `porta` a massive ancient Roman city gate of weathered stone with an arch, papal keys banner, torches, a faint red glow inside the arch ; 2. `antiquary` a cluttered antiquarian's shop with amphorae, a marble bust, chests and a brass lamp ; 3. `scuola` a Venetian scuola (guild hall) with a marble Renaissance façade and a carved portal ; 4. `post-locked` the same island as subject 1 of sheet 1a but empty, only a small wooden survey stake with a ribbon and a few stones |

### Lot 2 — Les villes (priorité 1)

Elles remplacent les sphères dorées. La taille du dessin dira la taille de la ville ; l'anneau de commandes reste dessiné par le jeu autour.

Bloc de famille :
```
Each subject is a whole small city seen from above at three-quarters, gathered on a round
island like a tiny precious model, its walls and roofs packed tight, warm lights in the windows.
```

| Planche | Sujets |
| --- | --- |
| 2a | Tailles génériques : 1. `town-1` a village of five houses around a small church ; 2. `town-2` a market town with a square, a church and a short wall ; 3. `town-3` a walled city with towers and a cathedral ; 4. `town-4` a large walled city with a castle and a river bridge |
| 2b | 1. `venezia` Venice: Saint Mark's basilica domes, the campanile, the Doge's palace, gondolas ; 2. `padova` Padua: the great Palazzo della Ragione with its keel-shaped roof, the Basilica of Saint Anthony's domes ; 3. `verona` Verona: the Roman arena and the Scaliger castle on a river bridge ; 4. `milano` Milan: the Sforza castle and a cathedral under construction with scaffolding |
| 2c | 1. `mantova` Mantua: a city surrounded by lakes, the Gonzaga castle with four towers ; 2. `brescia` Brescia: a hill castle above the town ; 3. `treviso` Treviso: canals, water mills and red houses ; 4. `vicenza` Vicenza: a basilica with a green copper roof and a tall clock tower |

(Les autres villes prennent leur taille générique ; on ajoutera leurs emblèmes au fil des secteurs.)

### Lot 3 — Les véhicules (priorité 2)

Bloc de famille :
```
Each subject is a vehicle seen from the three-quarter top view, heading to the right, no ground,
no island, sized to read clearly as a small token. Sturdy, characterful, slightly chunky.
```

| Planche | Sujets |
| --- | --- |
| 3a | Transports : 1. `mule` a pack mule with two crates and a sack, a muleteer walking beside ; 2. `cart` a two-wheeled wooden cart pulled by a donkey, loaded with sacks ; 3. `chariot` a covered four-wheeled wagon with a cream canvas cover, pulled by two horses ; 4. `burchio` a Venetian river barge (burchio) with a small cabin, towed, cargo of barrels |
| 3b | Combat (Porta) : 1. `cavaliere` an armoured Venetian knight on horseback with a lion banner ; 2. `carro` an armoured war wagon with wooden pavises along its sides, two horses ; 3. `carro_grande` a great war wagon, plated, with a small turret and the lion banner, four horses ; 4. `wreck` the war wagon of subject 2 damaged: broken wheel, torn banner, smoke-blackened |

### Lot 4 — Rome pontificale, l'ennemi de la Porta (priorité 2)

Bloc de famille :
```
Enemy units of the Papal States army, 1450, seen from the three-quarter top view, heading to
the left. Their colours are papal red and gold with crossed keys, so they read instantly as
the enemy. Menacing but not gory, no blood.
```

| Planche | Sujets |
| --- | --- |
| 4a | 1. `crossbowman` a papal crossbowman behind a pavise ; 2. `halberdier` a papal halberdier in half-armour ; 3. `light_horse` a papal light cavalryman on a fast horse with a lance ; 4. `bombard` a huge bronze bombard on a wooden carriage with two gunners |
| 4b | 1. `gonfalonier` the Gonfalonier of the Church: a towering armoured knight on a barded horse with the great papal banner, the boss ; 2. `legate` half-length portrait of a stern papal legate cardinal in red, the face of the enemy ; 3. `relic-ground` a city of the lands of Rome seen from above, with a faint golden beam where a relic lies ; 4. `gate-closing` the Roman gate of sheet 1f with its portcullis falling, red light |

### Lot 5 — Les personnages (priorité 2)

Bloc de famille :
```
Half-length portraits, slightly turned, painted in the manner of a stylised Renaissance
portrait (Carpaccio, Antonello da Messina), adult proportions, expressive faces, rich fabrics,
simple dark night-blue vignette behind the figure instead of magenta.
```

| Planche | Sujets |
| --- | --- |
| 5a | Lorenzo (le même homme que sur la planche de style), quatre expressions : 1. `lorenzo` warm welcoming smile ; 2. `lorenzo-joy` laughing, raising a goblet ; 3. `lorenzo-think` thoughtful, hand on his beard, looking at a ledger ; 4. `lorenzo-warn` concerned, raised finger |
| 5b | Visages des Maisons (avatars des joueurs) : 1. `avatar-1` a young Venetian merchant woman with braided hair and a pearl necklace ; 2. `avatar-2` a bearded merchant in a black robe with a gold chain ; 3. `avatar-3` an older noblewoman in green velvet with a white veil ; 4. `avatar-4` a young man in a red doublet with a feathered cap |
| 5c | 1. `avatar-5` a Greek merchant woman with dark curls and a blue mantle ; 2. `avatar-6` a Levantine trader with a turban and a trimmed beard ; 3. `avatar-7` a Flemish merchant in fur-lined brown ; 4. `avatar-8` a Dalmatian sea-captain woman with a weathered face and a knitted sailor's cap |
| 5d | Le personnel : 1. `facteur` a factor (trading agent) with a ledger and a quill ; 2. `artisan` a master craftsman with a leather apron and a hammer ; 3. `condottiere` a condottiere in plate armour, helmet under his arm ; 4. `antiquary` an old antiquarian with spectacles holding a golden reliquary |

### Lot 6 — Les objets qu'on touche (priorité 3)

Bloc de famille :
```
Each subject is a single object seen from slightly above, like a precious item in a
collector's cabinet, centred, crisp, readable at 48 pixels.
```

| Planche | Sujets |
| --- | --- |
| 6a | Composants : 1. `lances` a bundle of three cavalry lances with pennants ; 2. `crossbows` two crossbows crossed with a quiver of bolts ; 3. `culverin` a small bronze culverin on a wooden mount ; 4. `pavise` a large painted pavise shield with the lion of Saint Mark |
| 6b | 1. `cuirass` a steel cuirass with brass rivets ; 2. `surgeon` a barber-surgeon's leather case with tools and a bandage roll ; 3. `trumpet` a long brass herald's trumpet with a lion banner ; 4. `smoke` a clay smoke pot with thick grey smoke coming out |
| 6c | Modules et monnaies : 1. `route-book` a leather-bound route book with a brass clasp ; 2. `whip` a carter's whip coiled ; 3. `courier` a sealed courier's letter with a red wax seal and a ribbon ; 4. `pearl` a single large lustrous pearl on a small velvet cushion (the premium currency) |
| 6d | Reliques par rareté : 1. `relic-common` a Roman bronze coin hoard in a clay pot ; 2. `relic-rare` an illuminated manuscript with gold initials ; 3. `relic-precious` a jewelled gold reliquary ; 4. `relic-legendary` an ancient gold Byzantine crown with enamel and pearls, softly glowing |
| 6e à 6k | Les marchandises, quatre par planche, chacune comme un petit tas ou un contenant : `wheat` sheaf, `flour` sack, `bread` loaves, `clay` block, `bricks` stack, `wood` logs, `planks` stack, `sand` pile, `glass` vases, `mirrors` framed mirror, `silver_mirrors` silver-framed mirror, `wool` fleece, `cloth` bolt of wool cloth, `drape` folded rich drapery, `garments` a doublet, `spices` sacks, `prepared_spices` jars, `silk` bolt, `salt` crystals in a box, `wine` barrel, `furs` pelts |

Les marchandises gardent leur code (`GoodsMark`) : la couleur de chaîne et la forme d'étape restent tracées par le jeu, l'image se pose dedans.

### Lot 7 — La carte (priorité 3)

Ces images-là ont un fond plein (pas de magenta) et se répètent sans couture.

| Fichier | Texte (après le bloc STYLE, en remplaçant sa dernière phrase sur le fond) |
| --- | --- |
| `sea.png` | Seamless tileable texture of a calm night lagoon seen from directly above: deep blue water with gentle painterly ripples and faint moonlight glints, very subtle, no objects, square |
| `land-plain.png` | Seamless tileable texture of the Venetian mainland at night seen from directly above: fields in muted olive and ochre patchwork, hedgerows, dirt tracks, very subtle, square |
| `land-hills.png` | Seamless tileable texture of vineyard hills at night seen from directly above, muted, square |
| `land-forest.png` | Seamless tileable texture of a dark pine forest canopy at night seen from directly above, square |
| `fog.png` | Seamless tileable texture of drifting night mist over dark water, wisps of cream fog, square |

## 5. Ce qui ne change pas

- **Le logo** (le lion ailé) ne se génère ni ne se redessine.
- **Les couleurs d'interface** (or réservé à l'action et aux ducats, vert d'eau pour le prêt, cinabre pour la perte, lapis pour la sélection) restent celles de `docs/design.md`. Les illustrations ont leurs propres couleurs, mais **aucune grande surface d'or vif** dans une image : l'or de l'écran reste à l'action.
- **Aucun texte** dans une image : le jeu écrit lui-même.

## 6. L'ordre

1. Lot 0, la planche de style : je la pose sur la carte et on valide ensemble.
2. Lots 1 et 2 : les îles et les villes, ce qui change le plus la carte. J'ajoute dans le même temps les animations (fumée, fenêtres, flottement, gondoles).
3. Lots 3 et 4 : les véhicules et la Porta.
4. Lots 5, 6 et 7.

Pour chaque planche reçue : découpe, détourage du magenta, nommage, `node apps/web/scripts/art.mjs`, vérification sur la carte en clair et en sombre, puis un commit par famille.
