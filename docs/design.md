# Identité visuelle

Le jeu s'appelle **Fondaco**, du nom des entrepôts où les marchands étrangers logeaient et commerçaient à Venise. Ambiance : Venise au Quattrocento, des ducats, la lagune. L'identité suit le guide « Fondaco — identité & palettes ».

## Direction Lagune : la règle (25 octobre 2026)

Décision du porteur : **tout ajout suit cette direction**. Les maquettes de chaque page sont sur la planche de design (lien dans `docs/propositions-design-2026-10-25.md`, page « Lagune · toutes les pages », avec le système et la navigation).

- **Un lieu est un astre.** Le comptoir est un soleil, une ville un astre, un atelier une petite étoile en orbite. On le touche : on s'en approche (zoom `orbit-in`, 0,32 s) ; on revient par le chevron en haut à gauche, Échap ou en glissant vers le bas.
- **Trois profondeurs, pas plus.** La carte ; le lieu en orbite, plein écran (`ComptoirOrbit`, `data-place`) ; la feuille du bas qui porte une action (`Sheet`). Un moment (bon retour, ballot, fin de saison) s'ouvre de lui-même puis ramène à la carte.
- **Une seule action en or par écran**, en pilule de 52 à 56 px ; les autres en fantôme (filet `line`), ou en texte lapis.
- **Le temps se lit en arcs et sur la frise**, pas en phrases : l'arc lapis d'un lot, plein et vert d'eau quand c'est prêt, le pointillé crème de ce qui attend.
- **Les marchandises par leur marque** (`GoodsMark`) : couleur de chaîne, forme d'étape ; pleine quand le stock couvre, creuse sinon.
- **L'écriture** : Cinzel en capitales espacées pour les lieux et les titres de lieu, Archivo élargi pour les chiffres, Space Grotesk pour le reste.
- **Petits écrans** (moins de 640 à 700 px de haut) : ce qui n'est pas l'action cède (frise, puces du magasin), jamais l'action ni le retour.

## Logo : le lion ailé

Logo officiel (depuis le 18 octobre 2026) : le lion ailé de saint Marc, de face, rugissant, ailes déployées, debout sur les vagues, frappé en relief sur une médaille d'or à frise tressée, sur un fond olive très sombre. Pas de nom dans le logo.

- **Source** : `apps/web/brand/logo.webp` (1024 px, carré : la médaille sur son fond sombre, bord à bord). On ne le redessine pas : on remplace ce fichier.
- **Rendus** : `apps/web/scripts/icons.mjs` en tire toutes les tailles ; le fond autour d'un logo réduit (version masquable) est l'olive sombre de la source (`#16140C`). À relancer après tout changement de la source : `npx -y -p playwright-core node apps/web/scripts/icons.mjs`.
  - iPhone : `apple-touch-icon` 180 et 1024 px, carré plein sans transparence (iOS arrondit lui-même). Le 1024 px et les icônes Android ne sont pas mis en cache par le service worker (le système les télécharge à l'installation).
  - Android : 192 et 512 px arrondis, plus une version masquable dont le logo tient dans la zone sûre de 80 %.
  - `favicon.png` (64 px) et `icons/logo-256.webp`, le logo affiché dans le jeu.
- **Composants** (`apps/web/src/art/logo.tsx`) :
  - `Emblem` : le logo. Écran de connexion, introduction, chargement, cérémonie de fin de saison, Pass Négociant, sceau du Pass à côté du nom dans les classements.
  - `Logotype` : le logo et « Fondaco » côte à côte, dans la barre latérale sur PC.
- **Ducat** : pièce or frappée du galion du logo sur ses vagues (`Coin`).

Dans le jeu, le lion ailé se montre en **médaille ronde** (`Emblem`) : le cercle recadre le carré sombre de la source, qui n'est jamais redessinée. Sous le logo, « Venise 1450 · saison d'octobre » : une saison est un mois civil, l'année civile n'y figure pas. Sur un écran court (moins de 700 px de haut), l'accueil réduit la médaille et le ciel et passe les promesses sous le bouton : le champ et « Recevoir mon code » restent au-dessus du pli.

## Palettes

Trois palettes, mêmes rôles aux mêmes endroits, au choix du joueur dans le Profil (mémorisé sur l'appareil) : « Lagune & Ducat », bleu nuit et par défaut depuis le 20 octobre 2026 (le brun de Noyer était jugé trop sombre et peu accueillant par le porteur, qui demandait de se rapprocher du bleu des jeux spatiaux mobiles), « Noyer & Ducat », sombre (l'intérieur du fondaco à la lueur des lampes), et « Parchemin & Lapis », claire, pour le plein jour. « Or de Venise » reste réservée au Pass. Seule une palette choisie par le joueur est gardée : un appareil qui avait seulement retenu l'ancien défaut passe à Lagune. La carte (portulan, `Terrain.tsx`) est elle aussi passée au bleu : terres ardoise, eaux bleu profond, encre cyan pâle. Les couleurs sont des variables CSS (`index.css`, `[data-palette]`) lues par Tailwind (`tailwind.config.js`).

| Rôle | Lagune & Ducat (défaut) | Noyer & Ducat | Parchemin & Lapis (clair) | Usage strict |
| --- | --- | --- | --- | --- |
| Fond (`night`, `night-2/3/4`) | `#16263E`, surfaces `#1D304D` `#243A5C` `#2E486E` | `#1E1611`, surfaces `#2A1F18` `#36291F` `#443327` | `#F3E9D4` | Application, cartes, feuilles : des surfaces assez écartées pour que les panneaux « montent » |
| Or (`gold`) | `#F4C554` | `#E8B24C` | `#845A0E` | Les montants en ducats, et **un seul bouton par écran** : celui à toucher. Jamais un badge, un onglet ni un titre |
| Lagune (`lagoon`) | `#6EE0B8` | `#7DB596` | `#286E4E` | Gains, production, « prêt ». Jamais un bouton ni un libellé neutre |
| Cinabre (`vermilion`) | `#FF8070` | `#EA7658` | `#AA3422` | Pertes réelles et urgences. Une chaîne qui attend sa matière n'est pas une alerte (rond creux, crème) |
| Lapis (`info`) | `#6EC8F5` | `#7E9CDB` | `#284EA0` | Sélection (anneau des repères), guide de Lorenzo, onglet et filtre actifs, liens, « vous » au classement |
| Texte (`cream`, `cream-dim`, `muted`) | `#ECF5FF` | `#F6E8CC` | `#2B2016` | Texte, sur-titres (crème atténué), badges neutres |
| Encre (`ink`) | fond | fond | crème clair | Texte posé sur l'or |

Les autres boutons sont « fantômes » (`Slab tone="ghost"`, `ActionButton tone="plain"`). Un test (`apps/web/test/theme.test.ts`) vérifie le contraste AA (4,5:1) de chaque couleur de texte sur `night`, `night-2` et `night-3`, pour chaque palette.

Les deux halos du fond suivent la palette (`--glow-a`, `--glow-b`) : cyan et vert d'eau pour Lagune, ambre et braise pour Noyer, vert d'eau et or pour les autres.

Les illustrations (ressources, bâtiments, blasons) et la carte gardent leurs propres couleurs dans toutes les palettes, réglées sur la palette par défaut (`art/palette.ts`).

### Le code des marchandises (« astres de chaîne », 25 octobre 2026)

Une marchandise se lit pareil partout (carte, Magasin, Rialto, Ateliers) : **la couleur dit sa chaîne, la forme dit son étape** (`art/goods.tsx`, d'après `chain` et `tier` du thème, `venice1450.ts`). Rond : brut ; carré : transformé ; hexagone : fini ; losange : outre-mer. Dès 20 px, son pictogramme est gravé dans la forme (`GoodsMark`) ; une forme creuse est une commande que le stock ne couvre pas encore. `ResourceIcon` pose l'illustration sur la forme de son étape, teintée de sa chaîne.

| Chaîne | Marchandises | Teinte |
| --- | --- | --- |
| Vivres | blé, farine, pain | paille `#E6D3A3` |
| Construction | argile, briques | terre cuite `#C08A5A` |
| Charpente | bois, planches | mousse `#93B95C` |
| Verrerie | sable, verre, miroirs | rose de Murano `#F09CC4` |
| Draperie | laine, drap de laine, vêtements | gris de lin `#A6A3B5` |
| Outre-mer | épices, soie, sel, vin, fourrures, draps, épices préparées | pourpre `#B48BE6` |

Chaque teinte reste à ΔE ≥ 25 de l'or, du vert d'eau, du cinabre, du lapis et de l'eau des trois palettes, et des autres teintes ; contraste ≥ 3:1 (un graphisme, jamais du texte) sur les nuits sombres (`test/goods.test.ts`). Le blé n'est pas doré : l'or reste l'argent et l'action. La charge d'une charrette prend la teinte de sa chaîne.

## Typographie (embarquée, sans appel à Google)

- **Archivo Expanded** (Archivo variable, largeur 125 %) : titres et chiffres.
- **Cinzel** (capitales romaines, sous-ensemble latin, embarquée) : les noms de lieux des deux cartes et les titres des fenêtres, rien d'autre (décision du porteur du 24 octobre 2026).
- **Space Grotesk** : texte courant et boutons.
- **Space Mono** n'écrit que les sur-titres, en capitales espacées : jamais une ligne de texte, un chiffre, un badge ni un onglet (`test/mono.test.ts` ; seules exceptions : les chiffres du code de connexion et la console d'admin). Badges, onglets, `Segmented` et les noms des marchandises au Rialto sont en casse de phrase.
- **Space Mono** : sur-titres de un à trois mots en capitales (`.label`, 12 px).
- Toute phrase ou temps restant en petit : `.note` (Space Grotesk 13 px, chiffres alignés). Aucun texte sous 12 px.

## Composants (`apps/web/src/ui.tsx`)

Formes de la direction Lagune (depuis le 25 octobre 2026 ; avant, des biseaux) : **aucun coin coupé**. Les cartes et les lignes sont arrondies (`.cut`, 18 px), les puces, badges et boutons sont des pilules (`.slab`, `.bevel`, `Slab`) ; un lieu, un atelier, une ville, une mule sont des ronds (astres). `index.css` le fait en un seul endroit, `test/frames.test.ts` le garde.
- `Slab` : bouton en pilule, en casse de phrase (Archivo). À l'appui, il s'enfonce un peu, avec un tick haptique. Trois niveaux seulement : **or** (l'unique action qui compte à l'écran, avec son halo), **fantôme** (un filet `line`, les autres), **texte** (`Slab tone="text"`, en lapis, sans soulignement : « Lire le guide », « Passer »). Jamais vert d'eau. Le lien souligné n'existe pas dans le jeu. Pendant le guide, seule la cible reste en or.
- Un choix actif (préréglage de quantité, `Segmented`) se lit choisi : pilule allumée en lapis, avec sa coche, jamais comme éteint ; les autres en filet.
- `HudChip` : sur la carte, une action à portée de pouce ou un état à lire d'un coup d'œil, un picto et un mot court (« Escarmouche », « Semaine »), 44 px de haut, lapis par défaut, vermillon quand elle presse.
- `MiniCrest` (`art/crest.tsx`) : le blason réduit à un disque de son émail et son meuble en silhouette, pour les marques de 14 à 18 px de la Terraferme.
- `Panel` : carte arrondie (`.cut`), avec un liseré. Une lueur intérieure s'ajoute quand elle doit attirer l'œil. Les tuiles et cartes de commande suivent la même coupe.
- `Badge`, puces du stock, pastilles de tri : pilules (`.slab`).
- `Tabs` :
  - `pills` : choix d'une valeur, par exemple le tri ;
  - `underline` : parties d'un écran (Joueurs et Villes). Capitales sur un double trait crème et lapis qui glisse d'un onglet à l'autre.
- `CountUp` : un nombre qui court vers sa nouvelle valeur en 400 ms, comme la bourse de l'en-tête.
- `Stat` : tuile chiffrée (une durée, un gain en lagune, une perte en cinabre).
- `Switch` : interrupteur (escorte, navires, notifications), à la place des cases à cocher.
- `Sheet` : feuille du bas sur mobile, fenêtre centrée sur PC, fermeture par ×. Une seule anatomie : un en-tête collant (surtitre, titre, croix, résumé d'une ligne) qui reste en vue au défilement, puis l'état et l'action, puis la règle dans `Rules` (« Comment ça marche ? »), ouverte la première fois, repliée ensuite, le choix du joueur gardé feuille par feuille. Le guide ouvre une règle repliée qui contient sa cible.
- `Ribbon` : fine barre de progression arrondie (dégradé lapis, son libellé au-dessus) ; `Big` : grands chiffres.

### Rialto et Ateliers

Lagune (26 octobre 2026) : au Rialto, chaque marchandise est une ligne arrondie sur la nuit, avec sa marque (`GoodsMark`) ; les lignes sont groupées par chaîne sous une tête à la couleur de la chaîne (Vivres, Construction, Charpente, Verrerie, Draperie, Outre-mer), sauf sous le tri « En hausse » ; les galères de la Muda sont bordées du pourpre de l'outre-mer (l'or reste l'argent) ; la fiche d'une marchandise s'ouvre sur sa marque et son nom en Cinzel. Dans la liste des ateliers, chaque atelier est un petit astre (marque, arc du lot, pointillé s'il attend) ; prêt se dit en vert d'eau, en cours en lapis ; plus de barre rayée : l'arc et le temps de la ligne d'état suffisent.

Au Rialto, deux colonnes « Achat » et « Vente », côte à côte sous leurs têtes ; les marchandises que personne n'a encore échangées viennent après, sous « Pas encore échangées (n) ». Une courbe n'est dessinée qu'à partir de deux prix (sa place reste vide avant). Dans les Ateliers, une seule ligne d'état colorée par carte ; la marge théorique est une puce (« ≈ 20,8 d/h ») ; une amélioration déconseillée le dit en `.meta` (« Amélioration déconseillée : il manque du blé. »), jamais en or. Sur ordinateur, la fenêtre des Ateliers est large (`Sheet size="wide"`), les cartes en deux colonnes. Toute fenêtre qui a encore du contenu sous le pli le montre par un fondu à son pied.

### Carte du commerce : charrettes et noms

Le nom d'une ville est un marqueur à part, posé au-dessus des charrettes (`CityName`, `z-[4]`) : une charrette sur sa route passe dessous et ne le cache jamais, tandis que la tuile reste sous les charrettes, qu'on touche toujours. Sous 360 px, les tuiles des villes et le comptoir sont réduits d'un cinquième. Le test de mise en page vérifie qu'aucune charrette ne couvre un nom de ville (`cartsUnder`).

## Mouvement

- La carte ne bouge que sous le doigt : glisser la déplace (avec élan), deux doigts ou la molette zooment autour de leur milieu, un double toucher dans le vide la recadre. Un objet choisi glisse dans le champ s'il est caché sous le panneau, sans plus.
- Le panneau de la sélection monte du pied de l'écran ; un médaillon choisi s'entoure de lapis, une ville que la charrette peut servir respire, les autres s'estompent. Les routes en cours défilent en pointillés vers leur ville.
- Il n'y a plus de page : le Rialto, le Classement et le Profil sont des feuilles posées sur la carte ; la Famille est un calque de la même carte (la Campagne), que la porte « Commerce » ou le bouton retour ramène au commerce.
- Tout s'arrête pour qui demande moins de mouvement (`prefers-reduced-motion`).

## Gestes

- **Carte** : glisser, pincer, molette, double toucher (voir Mouvement).
- **Feuilles** (`ui.tsx`) : tirées vers le bas depuis le haut de leur défilement, elles suivent le doigt (avec résistance). Au-delà d'un tiers de leur hauteur ou d'un geste vif, elles se ferment ; sinon elles reviennent.

## Disposition : la carte d'abord (`game/map/`)

Un seul écran, la Vénétie en **portulan** à la lueur des lampes (`PortolanTerrain`, depuis l'audit UX du 19 octobre 2026) : parchemin chaud, Alpes à l'encre hachurée, fleuves en double trait, lagune et Adriatique lavées de vert, lignes de rhumb partant d'une rose des vents, régions nommées en capitales espacées. Les villes sont des **vignettes** de leurs monuments (`CityIcon` sur une plaque teintée de la couleur de la ville, Venise un peu plus grande) ; le comptoir doré du marchand est posé dans sa région ; ses charrettes sont garées à côté. Aucun onglet, aucun bandeau : tout part d'un lieu.

**Sur ordinateur** (≥ 1024 px), une colonne de 384 px reste à droite de la carte du commerce (`SideColumn`) : Commandes du jour (les mieux payées d'abord, « stock suffisant » marqué ; toucher une ligne choisit la ville), Ateliers, Marché. Le HUD, le panneau et la caméra la laissent libre (`--side`). Raccourcis : R récolter et relancer, A ateliers, M marché, C cargaisons, 1 à 9 un atelier, Échap.

| Pièce | Rôle | Composants |
| --- | --- | --- |
| **Carte** | Le sol (une couche que le processeur graphique déplace), les routes du comptoir en pointillés, les repères placés à la main à chaque image, sans rendu React. Les images ne tournent que si quelque chose bouge (caméra, élan, charrette en route) | `WorldMap`, `NightTerrain`, `geometry.ts` |
| **Repères** | Direction « Lagune » (25 octobre 2026, `docs/propositions-design-2026-10-25.md`). **Les villes en astres** : un rond à leur teinte, leur monument au centre, et **leurs commandes en orbite**, chacune la marque de sa marchandise (pleine : le stock la couvre ; creuse : il en manque), six au plus puis « +n » ; pastille vermillon : Criée. **Le comptoir en soleil** : le disque doré au blason, entouré d'**un anneau par atelier** (cinq au plus) : l'arc du lot en cours en lapis, plein et vert d'eau quand il est prêt, une trace pâle quand il ne fait rien ; pastille vert d'eau des lots prêts. Les véhicules en jetons (vert d'eau en route). Ils se garent dans le secteur libre autour du comptoir, côté terre, et partent du bord du médaillon | `CityMarker`, `HomeMarker`, `CartMarker` |
| **HUD** | En haut, une grille à deux colonnes réservées (`minmax(0,1fr)` à gauche, au plus 46 % à droite, sa largeur donnée par la bourse et ses ronds, jamais par une phrase) : rien ne s'écrit sur la colonne voisine, à 320 px comme à 390 px, et le nom garde au moins dix lettres à 320 px (sous 360 px, nom et bourse en Archivo droit, d'un cran plus petits). À gauche, un seul bouton vers le Profil : le blason dans l'anneau de la saison, le nom, puis le rang, le niveau et le titre sur une ligne qui cède élément par élément (le titre, puis le niveau, chacun avec son point : jamais « · … » orphelin ; le rang reste). La carte se cadre sous la bande du haut du HUD (son identité, le rival, les ronds de gauche, la colonne de droite, mesurés) : aucun nom ni médaillon de ville sous le HUD à l'ouverture. Le rival de la semaine a sa ligne à lui sous la grille, sur toute la largeur (toucher : le Classement). Dessous, **une seule rangée de ronds** (la carte commence juste dessous) : la cloche des Avis, la bulle du Rialto, Lorenzo quand le guide est en pause et le cercle des ballots (seulement quand un ballot attend). En haut à droite, en colonne, des compteurs : les ducats et, dessous en vert d'eau, ce que rapportent les ateliers par heure (« ≈ +61,6 d/h », la marge théorique du tableau de bord, sur le commerce seulement), l'Influence, la réserve de pain des ouvriers (« −6/j 14 » : la consommation du jour et le stock ; neutre, dorée quand elle ne couvre plus le prochain repas, vermillon quand ils ont faim, l'icône respirant alors un anneau), les véhicules libres et « + » pour en acheter. Toucher un compteur déplie à gauche de son icône une fiche (bandeau de sa couleur, flèche vers l'icône, ce qu'il est, ses chiffres, un bouton : Rialto, livre de la Maison, « Acheter du pain ») : fondu court qui glisse de l'icône, sortie plus brève ; une seule à la fois, la carte touchée la ferme. Les véhicules ouvrent un tiroir glissé du bord droit : chacun, où il est, le toucher le choisit sur la carte. Au-dessus des portes, sur le commerce, **la frise du temps** (`TimeStrip`, `game/timeline.ts`) : « maintenant » puis, sur un fil de lumière, les trois prochains moments avec leur temps restant : une livraison qui paie (vert d'eau), le prochain lot d'un atelier (lapis), les nouvelles commandes des villes (creux). Elle dit quand revenir sans rien ouvrir, et la carte se cadre au-dessus d'elle. Au pied, sans sélection, quatre portes rondes : Ateliers (sur le calque du commerce), Classement, Famille (Commerce sur le calque de la Campagne ; point vermillon quand la famille appelle), Aide. Tout ce qui se touche dans le HUD fait au moins 44 × 44 px (un petit rond garde son dessin, sa zone de toucher l'entoure) ; chaque bloc porte `data-hud`, que vérifie le test de mise en page (`apps/web/e2e/layout.mjs`) | `MapHud` |
| **Panneau** | Ce qui est choisi : titre, une ligne d'état (et sa barre), de grosses actions carrées, flèches vers l'objet suivant du même genre, croix. Sur ordinateur, flottant en bas à droite | `ContextPanel`, `ActionButton` |
| **Feuilles** | Le détail : ateliers, magasin, bâtir, cargaisons, Criée, Avis | `Sheet` |
| **Construire** | Le catalogue en cartes, deux onglets (Ateliers, Véhicules) : illustration et nombre déjà bâti à gauche ; nom, durée d'un lot (ou vitesse), recette, rôle dans le commerce, pain des ouvriers et prix à droite (en vermillon ce qui manque). Une carte qu'on ne peut pas prendre est assombrie et dit pourquoi (autre région, parcelles pleines, prix, amélioration d'un autre véhicule) ; celles des autres régions restent visibles, pour montrer qui produit quoi | `BuildCatalog` |
| **Feuilles de lieu** | Le Rialto (clés `rialto`, `trade:<r>`, `offers`) : le tableau des cours (Tout, En stock, En hausse ; taxe, décrets, mes offres), puis le négoce d'une marchandise dans la même feuille, ← retour. Le Classement (`ranking`) : semaine ou saison avec leur clôture, podium, liste, sa ligne épinglée au pied ; semaine passée et règles dans la même feuille | `RialtoSheet`, `RankingSheet` |
| **Profil** | Feuille (`profile`) ouverte par le blason ou le nom : blason et « Modifier », titre et paliers, patrimoine, chiffres, trophées, palmarès, Pass ; les réglages repliés au pied (palette, notifications, retours haptiques, aide, données, réinitialisation) | `ProfileSheet` |

| Lieu choisi | État | Actions |
| --- | --- | --- |
| **Comptoir** | Le toucher ouvre **le comptoir en orbite**, plein écran (`ComptoirOrbit`, `map/Orbit.tsx`) : le soleil au blason, chaque atelier une étoile en orbite (la marque de ce qu'il fait, l'arc du lot, vert d'eau et « +10 » quand il est prêt, pointillé quand il attend : crème pour du travail, gris pour sa matière, jamais une alerte), la chaîne tracée entre ceux qui se nourrissent (tirets à la couleur de la marchandise, qui coulent), une parcelle libre « Bâtir ». Dessous, le magasin en puces (masqué sous 700 px de haut) ; au pied, l'état (lots prêts, en cours, pain des ouvriers) | Récolter et relancer (or) · Ateliers · Magasin ; toucher un atelier ouvre sa production, la parcelle le catalogue |
| **Ville** | La toucher ouvre **la ville en orbite**, plein écran (`CityOrbit`, `map/Orbit.tsx`) : son monument au centre, ses commandes ouvertes en orbite (huit au plus), chacune la marque de sa marchandise, pleine quand le stock la couvre, sa quantité et ce qu'elle paie (ou « il en manque n » en cinabre), une urgente avec son horloge cinabre ; ‹ › vers la ville suivante ; au pied, l'état (livrables, Criée, renouvellement) | « Charger une mule » (or quand le stock couvre et qu'une mule est libre) ; en fantôme : Criée, Entrepôt, Fournisseurs ; Venise : Rialto |
| **Charrette au comptoir** | Au comptoir, chargée pour…, jauge de cale | Cargaisons · Partir |
| **Charrette en route** | Vers la ville ou retour, temps restant | Suivre |

### Règle du HUD

La carte est l'écran de jeu : le HUD la borde sans la couvrir. Avant d'y ajouter quoi que ce soit :

1. **Quatre bulles au plus par colonne**, quatre portes au plus au pied. Un nouvel élément en remplace un, ou va dans les Avis ou dans le panneau d'un lieu.
2. **Le HUD montre un état, ou mène à un lieu visité à chaque session.** Les ducats, le pain, les véhicules, les avis non lus, le Rialto, les ateliers. Une action ponctuelle (Criée, galères, mission) passe par les Avis ; une règle passe par l'Aide.
3. **Une bulle conditionnelle n'apparaît que lorsqu'il y a quelque chose à faire** (le ballot à ouvrir, le guide en pause), et disparaît ensuite.
4. **Les doubles chemins sont des raccourcis, pas des lieux.** Chaque lieu a sa place sur la carte (le Rialto à Venise, les ateliers au comptoir) ; une bulle ou une porte n'y mène que si le joueur y va à presque chaque session.
5. **Sur 390 × 844, la carte garde au moins les deux tiers de l'écran** sans sélection.
6. **Les mêmes quatre portes, aux mêmes places, sur chaque calque** : Ateliers · Classement · Terraferme/Commerce · Aide.
7. **La première session s'ouvre par étapes** (`game/unlocks.ts`) : comptoir, villes et cargaisons d'abord ; la bulle du Rialto, le Classement et la Terraferme après la première livraison (porte grisée, cadenas et condition au toucher, pas de pastille) ; l'Influence, les tâches du jour et le Livre de compte une fois le marché appris. Un guide passé ou fini ouvre tout.

Les **Avis** (la cloche) rassemblent ce qui était en bandeaux : jour et acte de la saison, dernier sprint, Criée, gazette ; puis le carnet du jour (premiers pas, tâches, Livre de compte), la saison (palier, maîtrise, ballots) et les nouvelles.

Lorenzo parle dans une seule carte (`LorenzoCard`, `ui.tsx`), dans le guide comme à la première visite de la Terraferme : un cadre lapis adouci, son portrait scellé d'un cachet de cire, son nom en crème. Le voile du guide est léger (0,35) : la fenêtre qu'il désigne reste lisible. Pendant qu'il parle, sa cible est le seul bouton doré de l'écran, les autres passent en fantôme (`data-coach-lit`). Ses textes disent vrai : la durée du lot (« 30 secondes » au premier, « 30 min » ensuite), « quelques secondes » seulement sous une minute.

Le guide de Lorenzo vise des objets de la carte (`home`, `city-<code>`, `cart-<id>`) puis les boutons du panneau (`panel-harvest`, `panel-workshops`, `panel-cargo`, `panel-go`, `panel-rialto`) et la cloche (`hud-notices`) ; sa bulle passe au-dessus des feuilles.

## Illustrations

Tout est en SVG maison, dans `apps/web/src/art` : ressources, bâtiments (le moulin et la scierie tournent pendant la production), panorama de Venise, scènes des régions, blasons (3 formes × 6 émaux × 8 meubles), Lorenzo le facteur qui guide le joueur, médailles des trophées. Pas d'image externe.

## Guide du joueur

1. **Introduction** : 4 écrans illustrés avant le choix de la région (rejouable depuis le profil ou l'aide).
2. **Lorenzo** : guide interactif qui assombrit l'écran, entoure en lapis l'élément à toucher et explique pourquoi. Sa bulle ne couvre jamais sa cible ni le panneau ouvert ; si une fenêtre cache la cible, il demande de la fermer. Il ne fait jamais livrer le pain des ouvriers. `pnpm --filter @comptoirs/web e2e` joue le tutoriel jusqu'à la première livraison. Il lit l'état réel du jeu, donc il suit le joueur même s'il fait les choses dans un autre ordre. Un élément ciblé porte un attribut `data-coach` (sur PC, la cible visible est choisie entre la barre latérale et la barre du bas).
3. **Comment jouer** : aide permanente (icône « ? » en haut).

## Saison, présence et Pass

- **Cérémonie de clôture** (`Ceremony`) : à la première visite après la fin du mois, rang final révélé, podium, récompenses (titre, Pass, Renommée), puis choix de la région pour le nouveau mois.
- **Palmarès** (`Palmares`) : Renommée et titre, saisons terminées, statistiques et frise des dernières semaines ; sur le profil et en touchant un nom du classement.
- **Dernier sprint** : encadré doré dans les Avis les trois derniers jours ; l'hommage au Doge de la saison passée s'affiche au Marché.
- **Maîtrise** (`Mastery`, `art/mastery.tsx`) :
  - **Avis** : une tuile de progression vers le palier (niveaux d'ateliers), puis l'appel à choisir.
  - **Choix** : feuille ouverte d'elle-même la première fois, avec quatre cartes (emblème, devise, effets lus dans les réglages) et une confirmation « pour toute la saison ».
  - **Emblèmes** : marteau et enclume, roue, balance, sac d'épices, sous le blason du Domaine et dans le classement.
- **Actes de la saison** (`Acts`) : l'acte en cours dans les Avis ; sa carte s'ouvre d'elle-même à la première visite de chaque acte, après les premiers pas.
- **Notification d'acte** : à l'ouverture des actes II à IV, une notification « Acte II : la peste » (cloche et push), réglable comme les autres.
- **Fil de la guilde** (`Guilde`, `Thread`) : messages des membres, les miens à droite sur fond lagune, « Signaler » sous ceux des autres, saisie en bas ; pastille sur l'onglet Guilde quand un message n'a pas été lu ou qu'un vote attend.
- **Objectif de saison** (`SeasonGoal`, dans les Avis) : titre actuel et Renommée assurée, prochain palier et sa barre ; affiché après la première livraison.
- **Galères de la Muda** (`MudaPanel`, en tête du Rialto) : le délai des prochaines galères, puis une ligne par marchandise à quai (quantité, ce qu'il reste au marchand, prix du moment) qui ouvre son négoce ; le négoce rappelle le quota de la Muda.
- **Criée** (`Criee`) : la ville qui crie porte une pastille vermillon ; son panneau et les Avis ouvrent la vente, avec la quantité vendable et un retour haptique « alarme » quand elle s'ouvre.
- **Tâches du jour** (`Daily`) : trois tâches, la série de jours et le coffre, dans les Avis.
- **Produits frais** : sous un atelier prêt, « Frais : +5 % encore 23 min ».
- **Ballots de Faraj** (`Bales`) : tuile des Avis après les premiers pas, puis écran plein : la balle de toile flotte sur le quai, tremble et luit, le sceau de cire (marque de Faraj : croissant, mât, fanion, orbe) éclate, trois connaissements sortent face cachée. Une carte rare ou mieux luit avant d'être retournée ; cadres parchemin, lagune, lapis, pourpre et or (seul usage de l'or hors argent et action principale) ; éclat doré et reflet pour une légendaire. Probabilités et histoire de Faraj sous le ballot.
- **Pass Négociant** (`PassPanel`) : statut, avantages, comment le gagner, prix (paiement à venir). Sceau (le lion ailé) à côté du nom dans les classements ; palette « Or de Venise » réservée.
- **Sons** (`sound.ts`) : pièce, récolte, charrette, tampon et cloche, synthétisés en WebAudio (aucun fichier), courts et discrets ; activés par défaut, coupables dans le Profil.
- **Pièces vers la bourse** (`game/fx.tsx`) : quand les ducats montent, le gain s'élève là où le joueur a touché et des pièces filent jusqu'à la bourse du HUD ; rien sous `prefers-reduced-motion`.
- **Retours haptiques** (`haptics.ts`) : léger à chaque sélection sur la carte, double pour une action qui rapporte, long pour une erreur, alarme pour une Criée ; réglables dans le Profil. Sur iPhone, Safari ne vibre pas : un interrupteur natif caché donne un petit clic.

## Famille et Campagne (jusqu'au 18 octobre 2026)

- **Couleurs des familles** (`art/familyCrest.tsx`) : Contarini vert d'eau et tour, Morosini émeraude et épi, Mocenigo vermillon et ancre, Dandolo violet et lion, Milan encre et couronne ; jamais l'or, réservé à l'argent et au Pass. Les milices en vert-gris. Blason en bannière (`FamilyCrest`).
- **Calque de la Campagne** (`map/CampaignLayer.tsx`) : la porte Famille bascule la carte du monde sur la Campagne, les terres ayant le même repère que les villes. La caméra glisse vers la Terraferme et cadre la partie dessinée ; la Lombardie de Milan, à l'ouest, est à un glissé. Villes, routes et charrettes laissent la place aux terres.
  - **Sol** : chaque terre dans la couleur de son détenteur (milices presque transparentes), frontières où deux détenteurs se touchent (`territory.ts`), marches en pointillés qui défilent avec leur colonne en pastille.
  - **Terres** (`LandMarker`) : disque à la couleur du détenteur, garnison au centre (⚑ pour un fief), bord or si ses lances y sont, anneau or pointillé à portée, anneau vermillon qui bat sous une marche ennemie, ouvrage en médaillon. Les noms : villes, forteresses et son fief ; les autres quand on les choisit.
  - **HUD** : les ducats, puis les quatre familles en rangée (blason et Gloire, la sienne cerclée d'or), et dessous la fin de semaine, la trêve, Milan.
  - **Son fief** ouvre le panneau de la famille : rang et Gloire, réserve et levée (sa barre), Lances (lever, engager), Marches (les marches à rejoindre, les ouvrages), Décrets (en vigueur, programme et vote), Famille (classement des familles, membres, semaines passées, fil).
  - **Une terre** : détenteur, garnison, défense, marche ennemie ou amie en cours ; Attaquer ou Renforcer (la fiche de la terre et son nombre de lances), Rejoindre une marche, Fiche ; ‹ › vers la terre suivante à portée.
  - **Sans famille** : le panneau des quatre familles, Allégeance (les quatre cartes, la plus petite mise en avant, confirmation en deux temps) et Règles.
- **Ouvrages** (`art/workIcon.tsx`) : rocca en tour crénelée, campo en tente à fanion vermillon, dogana en porte à la pièce d'or, à la couleur de la famille ; en contour pointillé tant qu'ils sont en chantier. Sur la carte, en médaillon au coin de la pastille de garnison. Dans la fiche d'une terre de sa famille : les trois ouvrages en lignes (icône, nom, rôle, effet, « Bâtir · prix ») ; sur une terre qui en porte un : l'ouvrage, son état et son bâtisseur, sur fond vermillon s'il est ennemi, avec le Mérite promis à qui le rase.
- **Bandeau des décrets** (`DecreeBanner`) : au Rialto, dans les Décrets de la famille et dans le Journal de l'Arsenal ; lueur vert d'eau quand ils jouent pour le marchand, vermillon contre lui.

## Terraferme

- **Teintes** (`TERRA_TONES`, `terraShapes.ts`) : huit tons sourds pour les autres marchands (violet, prune, olive, rose, noyer, sable, mauve, terre cuite), tenus à un écart ΔE ≥ 20 des couleurs qui ont un rôle sur la carte : or (vos terres), vert d'eau (alliés), vermillon (ennemis), lapis (la case touchée), les bleus de l'eau. Deux voisins n'ont jamais le même (`test/terraTones.test.ts`, sur le jeudi figé).
- **Écriture de la carte** (`MAP_TEXT`, `art/palette.ts`) : la même à tout zoom, ville 12 px en capitales, marchand 11 px (12 px pour vous et les grands territoires), effectif 11 px en pastille, sur un halo d'encre ; un nom n'est jamais plus gros qu'une ville, un chiffre jamais plus gros qu'un nom.
- **Focus** (`focusOf`, `territoryLook`, `terraShapes.ts`) : **vos terres** en or (aplat à 0,32, filet de 2,5 px constant à l'écran, halo d'encre au-dehors, dessinées en dernier) ; **alliés** en vert d'eau, filet en tirets ; **ennemis** (un front contre vous, ou l'un des vôtres contre eux) cerclés de vermillon ; **voisins** dans leur ton ; **les autres** à peine teintés ; Milan et les seigneurs hachurés. La terre et la case touchées passent en lapis. La grille reste visible, à 0,08 (0,2 quand on vise). La légende est la première rubrique du guide de la Terraferme, pas sur la carte. Seul « vous » porte l'or, seuls les alliés le vert d'eau (`test/terraFocus.test.ts`).
- **Étiquettes** (`declutter.ts`, `WorldMap`) : une par territoire, en HTML à taille fixe (`MAP_TEXT`), le nom puis l'effectif en pastille ; une nation qui tient une ville depuis sa capitale devient le sous-titre de la ville (« FERRARE · Este »). Chaque marqueur a une priorité : vous (jamais masqué) > vos fronts et ceux qui vous menacent > villes > alliés > ennemis > voisins > seigneurs > autres > bâtiments. Gourmand et déterministe, chacun prend sa place, sinon l'une de trois autres (au-dessus, au-dessous, à droite), sinon il se masque ; rien ne passe sous un bloc du HUD. Mesuré au changement de zoom, recalculé à chaque image du glissement sans relire la page. Trois paliers de zoom (`data-zoom`, `data-tier`) : de loin les villes, vous, vos alliés, ennemis, voisins et seigneurs ; de plus près les autres et les bâtiments. Les pastilles de front sont au milieu de leur ligne, décalées sur le côté. Les pions des autres sont des `MiniCrest`. Le test de mise en page vérifie qu'aucune étiquette n'en couvre une autre sur le jeudi figé.
- **Cadrage** (`fitTerra`, `geometry.ts`) : la Terraferme s'ouvre sur vos terres et quatre cases autour, entières et aussi grandes que l'écran le permet, sur tout appareil (jamais plus loin que toute la carte, jamais plus près que trois fois) ; sans camp, toute la carte. Un rond au pouce, à gauche des actions, passe de « Toute la carte » à « Centrer sur mes terres » ; le double toucher montre toute la carte. Les bords de la terre se fondent dans la nuit (6 % de sa largeur). Les paliers de zoom se comptent depuis toute la carte.
- **Pictos** : les troupes ont un casque, l'escarmouche une épée et son fanion, les brigands leurs épées croisées ; un picto, un sens (`test/icons.test.ts`).

Le mode qui remplace la Campagne depuis le 18 octobre 2026 (`docs/plan-terraferme.md`) ; quand `terraferma.live` est éteint (mondes d'avant), rien n'en paraît et les familles reviennent. Allumé, sa porte « Terraferme » prend la place de « Famille » au pied de la carte (point vermillon : pas encore de camp de départ, un front en marche contre soi, une alliance proposée).

- **Calque** (`map/TerraLayer.tsx`, formes dans `terraShapes.ts`) : la même Vénétie la nuit, la caméra cadre toute la terre (Lombardie comprise). **La grille**, comme sur OpenFront : chaque case de terre en fin liseré crème, toujours visible (plus nette pendant qu'on vise), pour lire d'un coup d'œil ce qui est libre, à soi, à l'autre (décision du porteur, 18 octobre 2026). Les cases qu'un front peut prendre, au bord de ses terres, en pointillés or. Chaque marchand a **un tracé**, ses coins de case adoucis (un lissage puis des courbes par les milieux des bords), recalculé seulement quand une case change de main. **Mise au point sur le joueur** : ses terres à sa teinte, denses, cerclées d'or ; ses voisins à leur teinte, translucides ; ses alliés cerclés vert d'eau ; les autres en liserés crème très discrets (plus encore sous quatre cases) ; Milan hachuré sang-de-bœuf. Douze tons de bijou sourds (`TERRA_TONES`), deux voisins jamais du même, chacun gardant le sien d'une visite à l'autre quand c'est possible. Une case prise se teinte en 400 ms. **Les troupes sur la carte**, comme sur OpenFront : au milieu du plus grand morceau de chaque territoire (la case la plus loin de ses frontières, hors comptoir et villes), le nom et les troupes en réserve, en texte de carte qui grandit avec le territoire ; sous douze cases, le territoire est caché par son médaillon, qui porte alors le nombre lui-même. Les troupes parties sur un front quittent ce nombre : elles ne défendent plus. **Pendant votre absence** : en ouvrant le calque, la carte telle qu'il l'a laissée (sa dernière visite, gardée sur l'appareil), puis les cases prises depuis rejouées dans l'ordre en deux secondes sous une étiquette « Pendant votre absence » ; pas à la première visite de la semaine, ni pour qui demande moins de mouvement. Le moteur garde pour chaque case quand et sur qui elle a été prise (`taken`), la vue envoie celles du dernier jour. La nuit, une voile bleutée et « ☾ Nuit » sous le HUD.
- **Repères** : les villes en petits médaillons à leurs couleurs, anneau à la teinte de qui les tient ; le camp de départ de chacun en médaillon à son blason (le sien en or, plus grand, cerclé de ses troupes, respirant vermillon sous une menace ; ceux des voisins et alliés moyens, les autres petits). Les fronts en pointillés qui défilent vers leur cible (crème pour les autres), les siens et ceux qui le menacent avec leur force en pastille (or, vermillon), posée sur la prochaine case qu'ils prendront, avec le temps qu'il reste. **L'avancée prévue** : les cases que ces fronts prendront ensuite (douze au plus), en hexagones pointillés à leur couleur, la prochaine qui respire ; le serveur les calcule en rejouant la carte sur une copie, si personne n'agit (`forecastFronts`).
- **HUD** : dans la colonne de droite, sous la bourse, les troupes « 120 / 180 » et « Gloire · rang » ; dessous, sur téléphone, une plaque sombre lisible sur toute terre, de la largeur de la colonne sans jamais l'élargir (ses lignes passent à la ligne), qui ouvre le guide (un petit « ? » à son coin). Elle dit, dans l'ordre : ce qui vient (« Éliminé cette semaine », sinon « Placement · 4 h 10 », « Trêve · 23 h 53 », « ⚔ Bataille → 21 h » pendant la bataille, « ☾ Nuit », ou de jour « Bataille à 20 h ») ; « fin dans 6 j 13 h » ou « Semaine close » ; en vermillon « ⚔ Milan sur vous » quand une nation chevauche contre le joueur (la première, nommée) ; une semaine en équipes, « Équipe · Terraferma » (vert d'eau) et, à la clôture, « Terraferma l'emporte » (or). Dessous, deux ronds de 44 px, ⚔ Escarmouche et ⟲ Revoir la semaine. Seuls restent à la carte et au guide le nombre de fronts en marche et les chevauchées de Milan contre d'autres que le joueur. Sur ordinateur, la note complète en texte (Guide, Escarmouche, Rejouer en liens). Pain et véhicules s'effacent.
- **Toucher la terre** : la case sous le doigt ; quand ce n'en est pas une qu'un front peut prendre, la plus proche à portée du doigt qui le peut (les cases sont petites avant de zoomer). Elle se cercle d'or ; viser une case du bord avive la grille.
- **Panneaux** (`ContextPanel`) : sans camp de départ, une invitation dorée au-dessus des portes, puis « M'installer ici » sur une terre libre. **Une case du bord** : sa terre ou son marchand, ce qu'elle coûte par case (ou, si un de ses fronts y va, l'heure où ses troupes y seront), un curseur de 10 à 100 % des troupes avec les soldats et les cases à prendre environ (vermillon si rien) et la défense qui restera à ses terres par case, « Attaquer » en or, « Rappeler » si un de ses fronts y va, l'alliance. **Un marchand** : ses cases et sa force ; Proposer ou Accepter l'alliance ; pour un allié, Envoyer (un quart de ses troupes, dans la limite du jour) et Rompre. **Le premier jour de la semaine** (placement) : sous le HUD, « Placement · la guerre dans … », et l'invitation à se poser dit le temps qui reste. Ensuite, sans camp : « La partie de la semaine a commencé » et le temps jusqu'à la prochaine ; un marchand qui a perdu toutes ses terres : « Vous avez perdu toutes vos terres », « Éliminé cette semaine » sous le HUD, la carte en spectateur. **Ses terres** : cases, troupes et maximum (barre) ; trois boutons, leur prix en pastille : « Max +20 » (or, le maximum relevé pour des ducats ; il ne donne pas de troupes, la ligne de recrutement le dit), Fort (sur la case touchée), Décret ; une ligne qui dit le recrutement (« Vos terres recrutent 13 troupes par heure : maximum dans 3 h 29 ») ou, au maximum, que seuls les ducats le relèvent ; ses fronts, un par ligne (« ⚔ 20 → Terre libre · 59 min », Rappeler) ; l'heure où un front ennemi prendra la case touchée. Le nom italien rocca ne paraît plus à l'écran : le Fort (dans le code `rocca`) ; le Village a disparu. **HUD** (retour du porteur du 24 octobre 2026 : le haut à droite était illisible) : sous la bourse, deux blocs au plus, jamais plus larges qu'elle. Les **troupes** (casque, « 20/60 », un fil de lumière qui se remplit jusqu'au maximum) ouvrent une carte : troupes, recrues (« +13/h », la nuit « à 8 h »), Gloire et rang. Une **plaque** de deux lignes : ce qui presse (éliminé, Milan sur vous, bataille en cours, placement ou trêve, nuit, « Bataille à 20 h »), puis en petit l'équipe et la fin de la semaine, qui cèdent élément par élément. Le guide est la porte Aide. Les actions sont **au pouce**, en bas à droite au-dessus des portes, en `HudChip` : « Escarmouche » (vermillon de jour) et « Semaine » (la semaine rejouée, que l'on peut passer) ; elles s'effacent avec les portes quand une fiche est ouverte, et tant que le marchand n'a pas de camp. La carte se cadre au-dessus d'elles. La porte de retour s'écrit « ← Commerce », en crème et non en or : une porte, pas l'onglet affiché. Sur la Terraferme, les ronds de gauche (cloche, Rialto, ballots) tiennent sur une seule rangée. **Attaque** : sous le curseur, le bilan prévu (« 20 troupes → 1 case (−18) · 2 reviennent »), la durée de marche (de jour seulement) ; contre un marchand seulement, et s'il change, le nombre de défenseurs qui restera par case. **Fronts rentrés** : sans rien de touché, une carte au pied de l'écran liste les fronts rentrés depuis la dernière fois (« Terre libre : 2 cases prises, −16 troupes, 4 revenues », « Compris ») ; le moteur garde le compte de chaque front un jour (`returns`). Attaquer reste éteint tant que le curseur ne paie pas une case, avec la raison en vermillon (« Il faut au moins 18 troupes : montez le curseur », ou « attendez vos recrues » si toutes n'y suffisent pas).
- **Décret** (feuille) : celui en vigueur, puis les six décrets forts que le Signore pourrait imposer, avec leur cible (une marchandise, une ville) ; celui de la semaine ne peut pas être repris.

## Magasin, Bâtir, Avis (Lagune, 26 octobre 2026)

- **Magasin** (`StoreView`, `game/Store.tsx`) : un anneau du stock partagé par chaîne, à leurs couleurs, le total au centre ; puis une constellation par chaîne (les trois de la Terraferme toujours, celles du luxe dès qu'il y en a), ses marchandises du brut au fini, une marque creuse à zéro, « +n engagés » en lapis ; toucher une marchandise ouvre son négoce. La réserve de pain des ouvriers suit.
- **Bâtir** (`BuildCatalog`) : les deux onglets en pilules dans un sillon ; chaque atelier à bâtir est une parcelle de l'orbite (rond pointillé lapis, la marque de ce qu'il fera ; le palais un losange or pâle) ; recette et prix par marques ; la raison d'un verrou en crème atténuée, jamais en or.
- **Avis** : la saison en anneau doré (la part du mois passée) à côté de « Jour n sur N » ; la gazette en carte à la lueur cinabre ; les tâches du jour en petits anneaux (arc lapis, plein et vert d'eau une fois faites) ; les nouvelles en lignes arrondies, celles non lues cerclées de lapis.
- Le test de mise en page ouvre aussi le comptoir, son magasin et son catalogue (`comptoir`, `magasin`, `batir`).

## La saison : Classement, Profil, Bon retour (Lagune, 26 octobre 2026)

- **Classement** (`RankingSheet`) : « Semaine passée » et « Règles » en pilules fantômes en tête du corps ; semaine et saison en pilules lapis avec leur clôture ; le podium en trois astres (le blason dans un anneau or, argent, bronze ; le premier plus grand, à la lueur dorée) ; les lignes arrondies, la mienne cerclée de lapis ; ma ligne épinglée au pied cerclée d'or.
- **Profil** (`ProfileSheet`) : le blason dans l'anneau doré de la progression vers le titre suivant, le titre en pilule dessous ; « Modifier » en pilule fantôme ; les titres de la saison en constellation (atteints pleins, le suivant cerclé, les autres en creux) ; les chiffres en tuiles sans police à chasse fixe.
- **Bon retour** (`Welcome`) : centré comme un lieu qu'on retrouve, le nom du comptoir puis le gagné en grand chiffre doré ; chaque fait par un point de son rôle (gain vert d'eau, perte vermillon, fait lapis, attente creux) ; la semaine close en carte cerclée d'or ; une seule action en or au pied.
- Le test de mise en page ouvre aussi le Profil, le Classement et un Bon retour réécrit à son plus plein (`profil`, `classement`, `bon-retour`) ; tout ce qui s'y touche fait 44 px.

## Charger et partir

- **Charrette choisie** (`CartPanel`) : bord vert d'eau et croix en onglet ; nom, cale « 12/40 » et sa jauge, état (au comptoir, chargée pour…). Les villes qu'elle peut servir s'éclairent et leur route se dore, les autres s'estompent. Toucher une ville éclairée ouvre ses cargaisons ; toucher la ville de la cale prépare le départ.
- **Cargaisons** (`CargoSheet`) : en tête, la mule en astre (`HoldRing`) : sa cale est l'anneau, rempli à la couleur de chaque marchandise chargée ; puis les tris en pilules (Récompense, Distance, Ville) ; une ligne arrondie par commande (marque, quantité, ville et durée, récompense en or, rond à cocher à droite), grisée avec sa raison quand elle ne va pas (autre ville, trop lourd, stock) ; la cale en bas avec sa jauge et ses commandes cochées ; « Prêt pour Vicence · 63 d » en or.
- **Départ** (`DeparturePanel`) : la route en pointillés vert d'eau jusqu'à la ville, « Départ vers Padoue · 10 s » et sa barre, les escortes en puces avec leur risque (choisir relance le compte), ✓ Partir et ✕ Annuler ; à zéro, la charrette part d'elle-même. Elle reste choisie : on la voit quitter le comptoir.

## Bon retour : le rapport de chaque visite

À chaque nouvelle session (après 30 minutes d'absence), une feuille « Bon retour au comptoir » dit ce qui s'est passé, en deux cartes : **Commerce** (le gagné en grand, puis une ligne par source et les livraisons arrivées ; « Rien de vendu » sinon) et **Terraferme** (la Gloire et le rang en tête ; les cases prises en vert d'eau, perdues en vermillon, les fronts rentrés et ce qu'ils ont coûté, les troupes « 40 / 60 · +13/h sur 7 cases », ou l'élimination). Le bouton du pied récolte et relance les ateliers. Les cases viennent du dernier changement de main de chaque case (`taken`), les fronts de leur compte (`returns`).

