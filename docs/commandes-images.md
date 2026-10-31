# Commandes d'images (lot D, 31 octobre 2026)

Les illustrations du jeu peuvent venir d'un générateur d'images gratuit. Le porteur génère, dépose les fichiers dans `apps/web/art-src/`, lance le script ; le jeu les montre à la place des dessins SVG, qui restent en secours tant qu'une image manque.

## Le chemin d'une image

1. Générer l'image avec le texte de la ligne voulue (ci-dessous), dans **un style enregistré** de l'outil.
2. L'enregistrer sous le nom indiqué : `apps/web/art-src/<famille>/<nom>.png` (ou `.jpg`, `.webp`, `.svg`).
3. Lancer `node apps/web/scripts/art.mjs` : chaque image sort en webp (1× et 2×) dans `apps/web/public/art/`, et `apps/web/src/art/raster.ts` les liste.
4. Committer `art-src/`, `public/art/` et `raster.ts`. Le jeu montre l'image ; tant qu'elle n'y est pas, il montre le dessin.

## Quel outil

| Outil | Pour | Attention |
| --- | --- | --- |
| **Recraft** (recraft.ai) | Le meilleur choix : sort du **SVG vectoriel** et garde un style d'une image à l'autre (« Create style » à partir de 2 ou 3 images réussies) | L'offre gratuite rend les images publiques et limite l'usage commercial : lire les conditions avant d'ouvrir le jeu au public |
| **Adobe Firefly** | Le plus sûr en droits (entraîné sur des images sous licence) ; crédits gratuits chaque mois | Moins constant d'une image à l'autre : fixer une « image de référence de style » |
| **Microsoft Designer / Bing Image Creator** | Gratuit, beau rendu | Style variable ; pas de fond transparent |
| **Ideogram** | Gratuit, bon cadrage | Images publiques en gratuit |

Une image produite par une IA est mal protégée par le droit d'auteur : un autre peut la réutiliser. Le logo n'est **jamais** généré ni redessiné (`apps/web/brand/logo.webp` se remplace, voir `docs/design.md`).

## La bible de style (à coller en tête de chaque texte, ou à enregistrer comme style)

> Flat vector illustration in the style of a 15th-century Venetian engraving and portolan chart, clean thin outlines, flat colour fills with soft gradients, warm evening light, slightly isometric three-quarter view, centred subject, transparent background, no text, no letters, no frame. Palette strictly: deep night blue #16263E and #243A5C, ducat gold #E8B24C and #F4C554, lagoon green #7DB596, cream #F6E8CC, vermilion #E36A4A, warm wood #9A6234, terracotta #C8693F, lapis #6EC8F5.

Règles :
- **une famille en une seule séance**, avec le même style : les ateliers ensemble, les navires ensemble ;
- **jamais de texte** dans l'image (le jeu écrit lui-même, en français et en anglais) ;
- **fond transparent** pour les ateliers, navires, palais et Lorenzo ; fond plein pour les régions et la carte ;
- le sujet tient dans le cadre, sol plat en bas pour les bâtiments (ils se posent sur la ligne d'horizon de l'orbite).

## `buildings/` — les ateliers (4:3, 1200 × 900, fond transparent)

Chaque texte suit la bible ; il dit seulement le sujet.

| Fichier | Atelier | Texte |
| --- | --- | --- |
| `farm.png` | Ferme | A small Venetian mainland farmhouse with a terracotta roof, golden wheat sheaves and a ploughed field strip, on flat ground |
| `clay_pit.png` | Glaisière | An open clay pit with terracotta-coloured clay mounds, a wooden ladder and baskets, on flat ground |
| `lumber_camp.png` | Coupe de bois | A lumber camp with stacked logs, an axe in a stump and two pine trees, on flat ground |
| `mill.png` | Moulin | A stone windmill with four cloth sails, flour sacks at its door, on flat ground |
| `bakery.png` | Boulangerie | A small bakery with a brick bread oven glowing warm, loaves on a wooden board, on flat ground |
| `brickworks.png` | Briqueterie | A brick kiln with a chimney and neat stacks of red bricks, on flat ground |
| `sawmill.png` | Scierie | A water-powered sawmill with a wheel and stacked planks, on flat ground |
| `sand_pit.png` | Sablière | A sand pit by the lagoon shore with pale sand heaps and a shovel, on flat ground |
| `glassworks.png` | Verrerie de Murano | A Murano glass furnace with a glowing round mouth and coloured glass vases, on flat ground |
| `mirrorworks.png` | Miroiterie | A mirror workshop with framed silver mirrors leaning on a bench, on flat ground |
| `sheepfold.png` | Bergerie | A sheepfold with a wooden fence and three woolly sheep, on flat ground |
| `loom.png` | Tissage | A large wooden loom with blue and cream cloth, on flat ground |
| `tailor.png` | Tailleur | A tailor's stall with a garment on a stand and bolts of cloth, on flat ground |
| `spicery.png` | Épicerie | A spice stall with sacks of saffron, pepper and cinnamon in bright heaps, on flat ground |
| `palazzo.png` | Palais (Casa) | A Venetian Gothic palazzo with ogee arched windows and a small canal landing, on flat ground |

## `ships/` — les navires (2:1, 1600 × 800, fond transparent, de profil vers la droite)

| Fichier | Navire | Texte |
| --- | --- | --- |
| `marciliana.png` | Marciliana | A small Adriatic merchant sailing ship (marciliana) with one square sail, side view sailing right, small waves |
| `cocca.png` | Cocca | A round-hulled medieval cog (cocca) with a single large square sail and castles fore and aft, side view sailing right |
| `galea.png` | Galea grossa | A Venetian great merchant galley with oars and two lateen sails, the lion banner, side view sailing right |
| `fiandra.png` | Galère de Flandre | A large Venetian Flanders galley, three lateen sails, long oar banks, heavy cargo, side view sailing right |

## `regions/` — les bandeaux de région (2:1, 1600 × 800, fond plein, sans ciel trop clair)

| Fichier | Région | Texte |
| --- | --- | --- |
| `veneto.png` | Vénétie | Venetian lagoon at dusk, bell towers and palazzi on the water, gondolas |
| `lombardia.png` | Lombardie | Lombard plain with a walled city, iron forges and sheep in green fields, Alps in the distance |
| `friuli.png` | Frioul et Istrie | Friulian hills and Istrian stone harbour, olive trees, salt pans |
| `romagna.png` | Romagne et Marches | Rolling Romagna hills with vineyards, a hill town and a Romanesque church |
| `dalmazia.png` | Dalmatie | Dalmatian coast, white limestone walled port, pine-covered islands, clear sea |
| `germania.png` | Allemagne | German Alpine pass with a merchant convoy, fir forests, a timber-framed town and silver mines |
| `grecia.png` | Grèce | Greek island harbour with a Venetian fortress, white houses and a windmill |
| `levante.png` | Levant | Levantine port with domes, minarets, palm trees and spice caravans |
| `costantinopoli.png` | Constantinople | Constantinople skyline with great domes and walls along the Golden Horn |
| `fiandra.png` | Flandre | Flemish port city with brick gabled houses, a belfry and cloth halls on a grey sea |

## `casa/` — le palais par palier (1:1, 1200 × 1200, fond transparent)

| Fichier | Palier | Texte |
| --- | --- | --- |
| `casa-1.png` | Casa 1 à 3 | A modest merchant house on a Venetian canal, wooden balcony, one arched door |
| `casa-4.png` | Casa 4 à 7 | A two-storey Venetian Gothic house with a loggia and a private canal landing |
| `casa-8.png` | Casa 8 à 11 | A grand Venetian palazzo with a gilded façade, quatrefoil windows and moored gondolas |
| `casa-12.png` | Casa 12 et plus | A magnificent Venetian palace with a golden façade, banners of the house, glowing windows at night |

## `people/` — Lorenzo, le guide (1:1, 1024 × 1024, fond transparent)

| Fichier | Texte |
| --- | --- |
| `lorenzo.png` | Bust portrait of Lorenzo, a friendly middle-aged Venetian merchant mentor with a short grey beard, a red berretta cap and a dark blue robe with gold trim, looking at the viewer, warm smile |

## `world/` — le fond de la carte du monde (16:10, 2560 × 1600, fond plein)

| Fichier | Texte |
| --- | --- |
| `map.png` | Top-down portolan chart of Europe and the Mediterranean, from Flanders to Constantinople and the Levant, deep night blue sea #16263E, slate blue land, faint gold rhumb lines and a compass rose in a corner, no text, no city names, no borders |

Le jeu trace lui-même les régions, les routes et les noms par-dessus : la carte doit rester sobre, sans villes dessinées. Son cadrage : à gauche la Manche (Flandre), à droite le Levant, en haut l'Allemagne du Sud, en bas l'Afrique du Nord.
