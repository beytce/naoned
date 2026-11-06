# Porcellana : le monde en porcelaine, partout (plan, 5 novembre 2026)

*Plan validé par le porteur le 5 novembre 2026 (« je valide tes recommandations, lance le travail »). Le porteur a écrit du prototype : « les visuels sont parfaits » ; de la fiche au clic : « c'est exactement de cette manière que je veux voir apparaître les informations et fonctionnalités » ; de la teinte de sélection : « pile ce que je veux, même l'animation du début ». Il demande d'intégrer **exactement** ce visuel à tous les aspects du jeu.*

Références (elles font foi pour toute question d'aspect) :
- le prototype : `docs/direction-artistique-2026-11/porcellana/prototype.html` (three.js 0.170, autonome ; en ligne, privé, au compte du porteur : https://claude.ai/artifact/AHMH8g2BCs4rmAKEbSLCBy) ;
- ses captures : `carte-ensemble.png`, `carte-selection.png`, `carte-telephone.png` dans le même dossier.

Porcellana remplace, pour tout ce qui est en 3D et pour les surfaces de l'interface, le Plateau de nuit, Jour et le verre et la Lagune. Elle garde la refonte claire (les quatre lieux, une décision à la fois) et le dock (le choix se fait dans le dock). Une seule règle change, à la demande du porteur : la carte passe aux cases carrées, achetées une à une (§ 2 bis). Cette partie passe au simulateur ; le reste est visuel.

## 1. Ce que « exactement » veut dire : la grammaire

On extrait du prototype des valeurs, pas une impression. Chaque élément ci-dessous devient une constante du module commun (§ 3), et un test vérifie qu'il ne dérive pas.

**La matière.**
- Un monde blanc porcelaine, presque monochrome. Les volumes se lisent par la lumière et par de petits écarts de valeur, jamais par la couleur :
  - sol `#EEEBE5`, murs `#F6F4F0` et `#ECE7DF`, toits `#E0D8CB`, corniches `#FCFBF9` ;
  - ouvertures `#AFA699`, terre `#E6E0D6`, bois `#DED5C7`, feuillage `#F1EEE8` ;
  - eau `#C9D3D6`, fond `#E9E6E0`.
- Matériau mat (rugosité 0,86), l'eau un peu satinée (0,38).
- **Une seule couleur forte, l'accent** (rouge de Venise `#C23B2E`). Elle va uniquement à ce qui vit ou à ce qui est à soi : les routes, les caisses en mouvement, la voile, le drapeau du Fondaco, le four qui travaille, la sélection.
- **Le noir d'encre** `#2A2725` en contrepoint rare : gondole, plat-bord, bittes d'amarrage.
- **Chaque volume est biseauté** (rayon 0,05 à l'échelle d'une case de 6). Aucun angle vif, aucune face plate sans reflet.

**La lumière.**
- Ciel blanc et sol chaud (`#D6CDBF`, 1,25) ; un soleil `#FFFAF1` à 2,5, venu de l'avant-gauche haut (‑16, 34, 22) ; un contre-jour froid `#EEF2F6` à 0,55 venu de droite.
- Ombres douces (PCF, rayon 2,2) qui suivent la cible de la caméra.
- Occlusion ambiante (GTAO dans le prototype : rayon 0,7, intensité 0,85). Le jeu garde N8AO, réglé pour donner la même image.
- Tone mapping « Neutral », exposition 1. Un ombre-porteur sous le plateau, opacité 0,11 ; un léger vignettage en CSS.

**Le plateau.**
- Des cases épaisses (1,25 pour 6 de large), aux arêtes arrondies (0,16), séparées par des joints fins (0,32).
- L'eau d'un seul tenant, plus basse (‑0,24), sans joints.
- Une parcelle libre est une plaque de terre avec un « + » en relief et quatre équerres.

**Le plateau a la forme de ce qu'on a bâti** (demande du porteur, 5 novembre 2026 : « que le plateau ne soit pas limité à un carré et que l'on puisse s'étendre comme on le souhaite »).
- Jamais un rectangle : on voit les cases qu'on possède, dans la forme où on les a achetées, et tout autour, les parcelles « + » qu'on peut acheter, dans toutes les directions.
- Au-delà, rien : pas de cadre, pas de bord dessiné. Le plateau flotte sur le fond de porcelaine et grandit d'une case à chaque achat (la case tombe en place comme à l'arrivée).
- Les villes et le Marché, les terres des autres régions apparaissent comme des îlots de cases, reliés au domaine par les routes.

**Les routes font la carte** (demande du porteur : « les routes ont disparu, il n'y a plus d'interconnexions entre les cases, ça ne ressemble plus à une carte mais à un empilement de bâtiments »).
- Chaque atelier est relié au Fondaco par un ruban d'accent qui passe de case en case, autour des bâtiments, jamais à travers ; le Fondaco est relié au quai, le quai au Marché et aux villes livrées (par la mer en tirets).
- Le décor (arbres, rochers) s'écarte des routes (`ModelOpts.keepOff`).
- Le tracé vient du moteur (`gridRoad`), le même pour la durée des trajets et pour le dessin.
- Les chevrons courent vers où vont les marchandises ; les charrettes et les navires y roulent quand un trajet est en cours.

**La caméra.**
- Orthographique, azimut 45°, élévation 0,64 rad.
- Un doigt ou le clic gauche déplace la vue ; deux doigts ou le clic droit tournent de ±0,55 rad au plus ; zoom de 0,8 à 4.
- La vue reste bornée au plateau.

**Les bâtiments.**
- Simples mais explicites : une silhouette qu'on nomme au premier regard, et un détail-signature qui bouge seulement quand le jeu dit que ça travaille.
- Les ouvertures sont en creux sombre : arcs vénitiens, arcades extrudées.
- Un toit est toujours un vrai toit : deux pans, faîtage, gâble plein, débord ; ou une croupe pour les maisons vénitiennes, avec leurs cheminées en entonnoir.

**Les routes.**
- Un ruban d'accent de 0,78 de large, posé au sol, aux angles arrondis (rayon 1,6).
- Des chevrons blancs à 62 % tous les 1,25, qui défilent à 0,55 par seconde vers la destination.
- Sur l'eau, la route devient des tirets d'accent.

**L'arrivée (l'animation d'ouverture).**
- Chaque case tombe de ‑9 en 0,75 s, avec un léger dépassement (« back », 1,25). Elle part avec un retard de 0,055 s par pas de diagonale ; l'eau suit 0,12 s après.
- Les routes se dessinent de 1,0 s à 2,2 s, puis les charrettes et les navires apparaissent.
- Les repères arrivent avec leur case, 1,4 s après elle.

**La sélection.**
- La case se soulève de 0,35.
- Un anneau d'accent (rayon 2,55 à 2,75) apparaît à son pied.
- Le bâtiment et ce qui est posé sur sa case prennent un voile d'accent de 17 % et une lueur de 5 %, en fondu. Ni le sol, ni l'eau, ni ce qui est déjà coloré ne changent.
- La caméra glisse vers le lieu en 0,9 s (zoom 1,75 sur ordinateur, 2,1 sur téléphone).

**La fiche.**
- Une carte de papier (`#FBFAF7`, coins de 4 px, ombre longue et douce) posée à côté du repère, et non par-dessus.
- Elle porte le nom en grand romain, une ligne de rôle en gris et une phrase d'état. Un bouton rond d'accent porte la flèche. Une croix ronde en haut à gauche ferme la fiche.
- Sur téléphone, la fiche se pose en bas, au-dessus de la barre.

**Les repères.**
- Des pastilles rondes de papier cerclées d'accent. Elles passent en plein quand elles sont choisies.
- Une parcelle libre a une pastille « + » en pointillés, visible seulement de près.

**Les surfaces de l'interface.**
- Des pilules de papier translucide (82 %, flou de 10 px, liseré `#DDD7CD`) : la marque en haut à gauche, les outils en haut à droite, la barre des lieux en bas.

**La typographie.**
- Cormorant Garamond (600–700) pour les noms : lieux, fiche, marque.
- Work Sans (400–600) pour tout le reste.

**Le mouvement.**
- Rien ne bouge sans raison de jeu.
- Quand l'appareil demande moins d'animations : pas d'arrivée, rien qui tourne, la sélection sans glissement.

## 2. Les décisions

*Toutes tranchées par le porteur le 5 novembre 2026 : D1 (le carré), puis « je valide tes recommandations » pour D2 à D7, et le Marché en bâtiment (D8).*

| # | Question | Décision |
| --- | --- | --- |
| D1 | **Cases carrées ou hexagonales ?** | **Tranché par le porteur (5 novembre 2026) : le carré, et l'extension case par case.** Toucher au monde en cours est accepté. Le détail est au § 2 bis. |
| D7 | **Le domaine sur la carte.** Aujourd'hui, les ateliers d'une région tournent sur l'orbite du Fondaco, et leur bonus de voisinage suit l'ordre de cette orbite (`neighbourBonus`). | Comme dans le prototype : un atelier se bâtit sur une case qu'on possède, et le voisinage devient celui des cases (deux ateliers côte à côte dont l'un nourrit l'autre). La Casa garde le plafond du nombre d'ateliers (`workshopPlaces`) : la règle ne change pas, seul l'endroit devient réel. Le Fondaco n'est plus une scène à part, c'est la Carte vue de près. |
| D2 | **L'accent et l'or.** Aujourd'hui, l'action est en or, la sélection en lapis et la Porta noire en cinabre. | Une seule couleur, l'accent rouge de Venise, pour l'action, la sélection et les routes. La règle « une seule action en or » devient « une seule action à l'accent ». Les ducats restent des pièces d'or en relief : un objet, pas une couleur d'interface. La Porta noire passe au noir d'encre, ce qui lui va. |
| D3 | **Le sélecteur d'accent** (rouge, or, vert lagune) du prototype. | Le rouge par défaut. Le choix va derrière le médaillon, dans les réglages : un goût personnel, sans effet de jeu. |
| D4 | **La typographie.** Le jeu embarque Archivo Expanded, Cinzel et Space Grotesk ; le prototype utilise Cormorant Garamond et Work Sans. | Prendre celles du prototype, embarquées (licence OFL, sans appel à Google), pour tout le jeu. Retirer Cinzel, Archivo et Space Mono, ou ne garder Space Mono que pour la console d'admin. |
| D5 | **Les terres de Rome** (la Porta, aujourd'hui au crépuscule, `ROME_DUSK`). | La même porcelaine, en « biscuit » : terre cuite pâle non émaillée (sol `#E7DCCD`, murs `#EFE6D9`), et le noir d'encre pour ce qui est à Rome. On sait qu'on a changé de terre sans changer de monde. Maquette au lot 0. |
| D8 | **Le Marché** (la Dogana, aujourd'hui dans le dock de Venise et derrière le médaillon). | **Décision du porteur : le Marché est un bâtiment, celui du prototype** : San Marco, le campanile et la basilique à coupoles, sur la place de Venise. On le touche : il se soulève, prend le voile d'accent, et sa fiche (« San Marco · la Dogana ») ouvre par son bouton rond le dock du Marché (vendre, acheter). Il n'y a plus d'autre entrée vers le Marché que lui ; le médaillon garde seulement le profil. |
| D6 | **Les modèles achetés** (KayKit : sapins, rochers, montagnes, caisses, tour de Rome, figurines ; Quaternius : âne, cheval). | Tout redessiner en code dans le kit Porcellana. Aucun modèle externe ne tient les biseaux, la palette et la finition. |

## 2 bis. La grille carrée et l'extension case par case (le moteur)

**Aujourd'hui.**
- La carte est une grille d'hexagones (« q,r », 24 unités, `map.ts`), une centaine de secteurs dans `venice1450.map.ts`.
- Chaque secteur est coupé en 7 petites cases hexagonales tournées de 19° (`slots.ts`).
- On achète un **secteur** entier (`empireUnlockCell` : 300 ducats, +20 % par secteur possédé, les côtes à 3 sauts par la mer).
- Les routes vont de petite case en petite case (`roadBetween` : une ville compte 4 pas, la mer 5).
- La Porta compte en secteurs (`cellDistance`).
- Les villes gardent leur point sur la carte (x, y).

**Demain.**
- **Une seule grille, de cases carrées**, clé « i,j », de côté `map.tileSize` dans `worlds.settings`. Environ 15 unités, pour qu'une case vaille une des petites cases d'aujourd'hui et que les distances restent du même ordre.
- Plus de secteurs ni de petites cases : la case est l'unité de tout.
- **Chaque case a un terrain** : terre (avec sa région), côte ou eau. Les villes et les lieux gardent leurs coordonnées x, y : une ville occupe la case sous son point, et deux lieux ne partagent ni une case ni un côté (la règle d'aujourd'hui, `tileFault` et `placeCities`, en carré).
- **On achète case par case.** Une case s'achète si elle touche par un côté une case possédée, ou, depuis une côte possédée, si c'est une côte à `seaHops` cases ou moins. Elle se voit aussitôt, et ses voisines apparaissent en « + ». Le prix monte à chaque case : `costDucats` et `stepBps` sont recalibrés pour qu'acquérir la surface d'un secteur d'aujourd'hui coûte à peu près pareil.
- **On s'étend dans la direction qu'on veut.** Aucune limite de forme : toute case de terre qui touche les siennes par un côté s'achète, quelle que soit la forme du domaine. La géographie seule borne le plateau : la mer se franchit d'une côte à une côte (`seaHops`), et une région ne s'ouvre qu'à la Casa qui l'atteint.
- **Ce qu'on bâtit occupe des cases à soi** : le Fondaco, ses ateliers (D7), la Remise, le Campo, l'Arsenal, les comptoirs. Bâtir demande une case possédée et libre.
- **Les routes vont de case en case, par les côtés** (ville 4 pas, mer 5, comme aujourd'hui). Ce sont exactement les rubans à angles arrondis du prototype. La vitesse des trajets est recalibrée pour que leur durée moyenne reste celle d'aujourd'hui.
- **La Porta** compte la distance en cases.

**Le code.**
- `packages/engine/src/empire/grid.ts` remplace les fonctions hexagonales de `map.ts` et tout `slots.ts` :
  - `tileKey`, `tileAt`, `tileCentre`, `neighbours4`, `tileDistance` ;
  - `buyableOf`, `tileCost`, `unlockTile` ;
  - `placeFault`, `placeCities` ;
  - `roadTiles`, `roadBetween`, `roadLength`, `alongRoad`.
- Les tests s'écrivent avant le code, sur la fixture (`test/fixture.ts`). Les tests de `map`, `slots`, `tiles` et `posts` sont réécrits pour le carré.
- **La carte de Venise en carrés** (`venice1450.map.ts`) se calcule une fois, par un script qui échantillonne le centre de chaque case dans la carte hexagonale et dans ses eaux. Le résultat est relu par le porteur sur une image avant d'être commité.
- **Le serveur** : `empireUnlockCell` devient `empireUnlockTile`. Les commandes de construction prennent une case. La base ne change pas (tout est dans le JSON de la maison et du monde).
- **Le web** : `art/hexmap.ts`, la couche SVG des hexagones et `map3d/domain.ts` (la fleur de 19) disparaissent. Le domaine est la Carte de près.
- **Le simulateur** : les robots (`bots.ts`, `scenario-voyages.ts`) achètent et bâtissent case par case. Toute la recalibration (prix des cases, vitesse) se valide au simulateur de 24 mois, toutes les graines, et se documente dans `docs/calibration.md`.

**Le monde en cours** (accord du porteur). Une migration au démarrage du serveur :
- Le monde reçoit la carte carrée.
- Chaque maison reçoit toutes les cases dont le centre tombe dans un secteur qu'elle possédait : personne ne perd de terre (règle d'or 1).
- Ses lieux sont posés sur la case libre la plus proche de leur point, et ses ateliers sur des cases libres autour de son Fondaco, dans l'ordre de leur orbite, pour garder leurs voisinages.
- Les trajets en cours finissent à l'heure prévue.
- Aucun mouvement d'argent.
- La règle « au commerce, un changement s'annonce dans les notes du chapitre » est tenue par une note dans `docs/notes-chapitre-*`.
- Une partie de test rejoue la migration sur une copie du monde, avant la production.

**La Terraferme** (`game/map/TerraLayer.tsx`, `terraShapes.ts`) a ses propres hexagones et ses saisons d'une semaine. Elle passe au carré dans un lot à part (lot 9), avec son changement au lundi suivant (la règle de la Terraferme).

## 3. L'architecture : un seul kit, partagé par toutes les scènes

Nouveau dossier `apps/web/src/porcellana/`. Toutes les scènes 3D (la Carte, le Fondaco, la Porta, l'Arsenal, la bataille, le laboratoire) le prennent, sans copie.

| Fichier | Rôle |
| --- | --- |
| `tokens.ts` | La palette (§ 1), l'accent courant, les constantes du plateau, de la caméra, de l'arrivée et de la sélection. Pur, testé. |
| `materials.ts` | Les matériaux partagés, mis en cache par teinte ; l'accent, l'encre, la lueur. Changer l'accent met à jour un matériau, sans reconstruire la scène. |
| `shapes.ts` | Les primitives du prototype, en géométrie pure et sans React : boîte biseautée posée sur sa base, cylindre, cône, dôme, extrusion, arc, arcade, fenêtres sur les quatre faces, toit à deux pans, croupe, cheminée vénitienne, arbres (rond, cyprès, sapin), caisse. Testées : pied à y = 0, aucune valeur NaN, emprise dans la case, nombre de sommets borné. |
| `bake.ts` | La fusion d'une case par matériau : une case = quelques appels de dessin. Les pièces qui bougent (`dyn`) restent à part. Les arbres et les caisses du décor passent en `InstancedMesh`. |
| `models/*.ts` | Un fichier par famille de modèles (§ 4) : une fonction pure `(graine, état) → Group`. |
| `Stage.tsx` | La lumière, les ombres, l'occlusion (N8AO réglé), le tone mapping, le fond et l'ombre-porteur, en un seul composant. Il porte aussi la qualité adaptative : taille de la carte d'ombre, occlusion coupée quand `PerformanceMonitor` baisse ; `SOFTWARE_GL` passe au sol sans WebGL. |
| `Arrival.ts` | L'animation d'ouverture : délai par case, chute, routes qui se dessinent. Pur et testé (les courbes d'easing, l'ordre des cases). |
| `Ribbon.ts` | Le ruban à chevrons d'une courbe arrondie, et les tirets sur l'eau. |
| `Selection.ts` | La levée, l'anneau, le voile, et les matériaux clonés le temps d'une sélection. |
| `PlaceCard.tsx`, `Pin.tsx`, `Pill.tsx` | La fiche, les repères et les surfaces de papier, en HTML posé sur la scène (le calque d'ancrage existe déjà : `anchors.tsx`, `camera.ts`). |

Les règles de la maison restent : le rendu ne demande d'images que si quelque chose bouge (la boucle à la demande du Board3D) ; chaque scène s'arrête quand elle est couverte (`pause.ts`).

## 4. Le catalogue : chaque objet du jeu, son modèle

Règle : une silhouette qu'on nomme sans légende, et un signe d'état qu'on lit sans chiffre. L'état vient du jeu, rien n'est inventé.

| Objet du jeu | Modèle Porcellana | Signe d'état (seulement si le jeu le dit) |
| --- | --- | --- |
| **Le Fondaco** (par Casa) | Le palazzo du prototype : socle, arcades, piano nobile, merli, altana, drapeau d'accent. Chaque Casa ajoute un élément : une aile, un second étage d'arcades, une loggia, une tour. | Le drapeau flotte ; des caisses d'accent au quai quand la Remise a de quoi charger. |
| `lumber_camp` | Cabane en rondins croisés, sapins, pile de grumes, billot et hache d'accent. | La hache bouge quand l'atelier tourne. |
| `sawmill` | Hangar ouvert sur poteaux, lame dentée, planches empilées. | La lame tourne. |
| `mill` | Tour conique, chapeau, quatre ailes à lattes, sacs. | Les ailes tournent. |
| `farm` | Grange (porte en croix, lucarne), silo cerclé, clôture, champs à sillons. | Le silo se remplit (des anneaux qui montent). |
| `glassworks` | Four de Murano à dôme, gueule en arc, cheminée, atelier, vases. | La gueule rougeoie, la fumée monte. |
| `clay_pit` | Fosse en gradins (la carrière du prototype), treuil, mottes. | Le treuil pivote. |
| `sand_pit` | Dune basse, tamis sur pieds, brouette, tas coniques. | Le tamis oscille. |
| `brickworks` | Four-tunnel bas à deux cheminées, briques en piles croisées. | Fumée, piles qui grandissent. |
| `palazzo` | Façade vénitienne à polyfore, croupe, cheminées en entonnoir. | Fenêtres éclairées de l'intérieur. |
| **La Remise** (le quai, `depot`) | Le port du prototype : quai, magasin, grue, caisses, ponton. | La grue charge ; les caisses d'accent comptent ce qui attend. |
| **Le Campo** (`camp`) | Un campo pavé, son puits, un portique. | — |
| **La Porta** (sur la carte) | Une porte romaine en plein cintre, entre deux tours, en biscuit. | Ouverte : un ruban d'accent la traverse ; fermée : une grille. |
| **L'Arsenal** | Deux tours crénelées et un bassin couvert. | — |
| **Les comptoirs** (`posts`) | Une petite maison-magasin à auvent, avec une enseigne d'accent. | — |
| **Le Marché** (D8) | San Marco du prototype, à l'identique : place pavée, campanile (fût à lésènes, beffroi à arcades, flèche, boule d'accent), basilique à cinq coupoles et façade à arcades. Il se tient sur sa propre case, voisine de celle de Venise. | Des caisses d'accent sur la place quand une vente ou un achat est en cours d'acheminement. |
| **Les villes** (une trentaine, par taille) | Hameau : 2 à 3 maisons. Bourg : 5 maisons, un campanile. Cité : un îlot, son monument. Venise : la Salute et les maisons (San Marco est le Marché, sa case voisine). Le monument d'une ville vient du champ `campanile` de la scène (les coupoles de Padoue, une église ailleurs). | Ses commandes en caisses sur son quai (la règle de la refonte claire). Une ville hors de portée est en silhouette, les ouvertures pleines. |
| **Le décor** | Arbres ronds, cyprès, sapins ; rochers biseautés ; montagnes en gradins taillés ; champs. La part de chaque espèce vient de la région (`DRESS`). | — |
| **L'inconnu et l'achat** | Une case qu'on ne possède pas encore mais qui touche les siennes : la parcelle « + » du prototype, avec son prix en ducats sur sa fiche. Une case qu'on ne peut pas encore acheter (région que la Casa n'atteint pas) : la même, « + » grisé et cadenas. Au-delà, des plaques fines au niveau de l'eau. Une case achetée tombe en place comme à l'arrivée. | — |
| **Les véhicules** | Mulet bâté de deux caisses ; charrette à deux roues et caisses (prototype) ; cavalier ; navire à voile d'accent (prototype) pour le transport par mer, s'il existe. Tous dessinés en code. | Ils roulent seulement quand leur trajet est en cours (règle de `fleet3d.tsx`). |
| **Les figurines de la Porta** | Des pions de porcelaine : socle rond biseauté, corps en fuseau, tête ronde, l'arme du rôle en silhouette. La maison en blanc et accent, Rome en biscuit et encre. | Marcher, frapper, tomber : des gestes simples par transformations. Aucun squelette ni mixeur. |

Le **laboratoire des modèles** (`?lab=porcellana`, à la suite de `MinisLab.tsx`) montre chaque modèle sur sa case, dans chacun de ses états. Le porteur valide le catalogue là, famille par famille, avant qu'un modèle ne monte sur la carte.

## 5. Les lots

Chaque lot fait l'objet de petits commits, se vérifie (§ 7) et laisse le jeu jouable. Rien ne cohabite à moitié : une scène passe en Porcellana d'un bloc.

| Lot | Contenu | Validation du porteur |
| --- | --- | --- |
| 0 | **Les décisions** D1 à D8 (§ 2). | fait, 5 novembre 2026 |
| M1 | **La grille carrée, pure** (§ 2 bis) : `grid.ts` et ses tests écrits d'abord (clés, voisins, case sous un point, distance, achat, prix, emplacements, routes). `map.ts` et `slots.ts` passent dessus, et les tests du moteur sont réécrits. | — |
| M2 | **La carte de Venise en carrés** : le script de conversion, le terrain de chaque case, les villes posées. Une image de contrôle. | L'image de la carte |
| M3 | **Les règles case par case** : achat par case, bâtir sur une case à soi, le voisinage des ateliers par les côtés (D7), routes et Porta en cases ; le simulateur (robots case par case) ; la recalibration du prix des cases et de la vitesse au simulateur de 24 mois, toutes graines ; `docs/calibration.md`. | Les chiffres du simulateur |
| M4 | **Le serveur et le monde en cours** : `empireUnlockTile`, les commandes qui prennent une case, la migration (cases, lieux, ateliers) répétée sur une copie du monde, la note du chapitre. | La note du chapitre, avant la mise en production |
| 1 | **Le kit** (§ 3) : tokens, matériaux, primitives, fusion, `Stage`, arrivée, ruban, sélection, avec leurs tests. Le laboratoire, avec le Fondaco et les arbres. | Le Fondaco et la lumière, au laboratoire, identiques au prototype |
| 2 | **Le catalogue** (§ 4) : les neuf ateliers, la Remise, le Campo, la Porta, l'Arsenal, les comptoirs, les villes par taille, Venise, le décor, l'inconnu, les véhicules. Tout au laboratoire. | Famille par famille |
| 3 | **La Carte** (après M4) : `Board3D` sur le kit et la grille carrée, sans couche SVG d'hexagones. Cases, mer, parcelles « + » à acheter, villes, routes en ruban entre les lieux reliés (`roadBetween`), chevrons seulement là où un véhicule roule, véhicules, arrivée à la première ouverture de la session, caméra (§ 1). Le calque HTML (repères, fiche) reste calé au pixel (`camera.ts`). Les modèles KayKit quittent la carte. | La Carte, sur ordinateur et sur téléphone |
| 4 | **La fiche** : toucher un lieu (ville, le Marché, atelier, Fondaco, Remise, véhicule, parcelle « + ») le sélectionne (levée, anneau, voile) et ouvre sa fiche à côté du repère. La fiche dit qui c'est, ce qu'il fait, son état en une phrase. Son bouton rond ouvre le dock de ce lieu, où se prend la décision. La fiche remplace l'en-tête de lieu en tête du dock ; `CityPill` et les pastilles deviennent des repères (§ 1). | Le parcours toucher → fiche → décision |
| 5 | **Le Fondaco** (le domaine) : la Carte vue de près autour du Fondaco (D7), sans scène à part. Toucher l'onglet Fondaco y amène la caméra ; les cases « + » voisines s'achètent, une case libre à soi reçoit un atelier, le quai. `map3d/domain.ts` disparaît. | Le domaine |
| 6 | **La Porta** : `PortaScene`, `ArmsScene` et `Battle3D` sur le kit, en biscuit ; ruines, tour de Rome et villes à coffres redessinées ; les figurines-pions ; les coups (carreaux, boulets, étincelles) en traits d'accent ou d'encre. L'objectif en haut, en pilule de papier. | La Porta et un combat |
| 7 | **L'interface** : la palette `porcellana` dans `index.css` (le défaut ; Jour et ses sœurs sont retirées), les surfaces de papier à la place des `.glass*` (mêmes trois épaisseurs, mêmes règles de contraste, `test/theme.test.ts` mis à jour), le HUD, la barre des quatre lieux en pilule de papier, le dock, les feuilles, la Compagnie, le profil, les pièces (`coins.tsx`) et `GoodsMark` en relief de porcelaine, les polices embarquées (D4). | L'ensemble, écran par écran |
| 8 | **Le ménage** : retrait des modèles KayKit et Quaternius et de `recolor.ts`, du SVG du Plateau (`art/plateau/` sauf ce qui sert au sol sans WebGL, qui passe en Porcellana à plat), des palettes retirées. `docs/design.md` : Porcellana en tête, les directions remplacées marquées comme telles. `CLAUDE.md` : la ligne Porcellana à la place de Jour, du Plateau et de la Lagune. | — |
| 9 | **La Terraferme** : la même grille carrée et la même direction, changement au lundi suivant. | La Terraferme |

## 6. Ce qui demande de l'attention

- **Le téléphone d'abord.** Une case fusionnée = une douzaine d'appels de dessin au plus (un par matériau). Carte d'ombre de 2048 sur téléphone, de 4096 sur ordinateur. Occlusion en demi-résolution, coupée quand l'appareil peine. Mesure : `e2e/map-fps.mjs`, avec le seuil d'aujourd'hui comme plancher.
- **Le monochrome lisible.** Un lieu se reconnaît à sa silhouette, à toutes les tailles de la carte. Le laboratoire montre chaque modèle à 0,8 et à 4 de zoom.
- **Le contraste.** Le texte reste à 4,5:1 sur papier et sur la scène (test existant). L'accent n'écrit jamais de texte courant.
- **Règle d'or 8 (tout se voit).** La fiche accompagne l'image, elle ne la remplace pas : une phrase, pas un tableau.
- **Ce qui change dans les règles** : seulement la carte (§ 2 bis), validée au simulateur. Le reste du moteur, les recettes, le marché, les commandes, la Porta et ses combats ne changent pas.
- **L'ordre** : le kit et le catalogue (lots 1 et 2) avancent pendant que le moteur passe au carré (M1 à M4) ; la Carte (lot 3) attend les deux.

## 7. Vérifier (à chaque lot)

```bash
pnpm typecheck && pnpm lint && pnpm test
pnpm --filter @comptoirs/web build
CHROMIUM=/opt/pw-browsers/chromium SIZES=390x844,320x568 pnpm --filter @comptoirs/web e2e:empire
CHROMIUM=/opt/pw-browsers/chromium node apps/web/e2e/map3d.mjs
CHROMIUM=/opt/pw-browsers/chromium node apps/web/e2e/porta.mjs
CHROMIUM=/opt/pw-browsers/chromium node apps/web/e2e/map-fps.mjs
```

On compare aussi, à chaque lot, des captures prises au même cadrage que celles du prototype (vue d'ensemble, sélection, téléphone).

## État

| Lot | État |
| --- | --- |
| D1 à D8 | tranchés (5 novembre 2026) |
| 0 | fait : décisions D1 à D8 |
| M1 | fait : `grid.ts` et ses tests (17), pas encore en service |
| 1 | fait : le kit (`apps/web/src/porcellana/`, tests `apps/web/test/porcellana.test.ts`), le laboratoire `?lab=porcellana` avec le Fondaco, le Marché (San Marco), les bosquets, la parcelle « + », la route, l'arrivée, la sélection et la fiche ; captures `labo-*.png` |
| M2 | fait, à relire par le porteur : `apps/web/scripts/squaremap.ts` écrit `venice1450.squares.ts` (cases de 15 unités, 168 cases de terre, les 31 villes gardées, Venise sur la côte, sa lagune en eau) ; image `carte-carree-controle.png` (cases par région, côtes cerclées de bleu, anciens secteurs en pointillés rouges). La carte en service reste l'hexagonale jusqu'à M3. |
| 2 | fait, validé par le porteur (« tout me va ») sauf la sablière et la montagne, refaites le 5 novembre (la fosse cadrée de planches, les cônes, le tamis ; un pic à facettes et sa neige). Le plateau du laboratoire est devenu un morceau de carte : forme libre, routes de chaque atelier au Fondaco, navire du quai au Marché, parcelles « + » tout autour. Détail initial : le catalogue (`apps/web/src/porcellana/catalogue.ts`, modèles dans `models/`) au laboratoire `?lab=porcellana&vue=catalogue` — les neuf ateliers et le champ, le Fondaco, le Marché, la Remise, le Campo, la Porta, l'Arsenal, le comptoir, les villes de taille 1 à 5, Venise et la Salute, bosquet, forêt, rochers, montagne, parcelles libre et fermée, charrette, mulet, cavalier, navire, gondole ; « En marche / À l'arrêt » montre chaque signe de travail ; captures `catalogue-*.png` |
| M3 | fait dans le moteur, derrière `map.grid = "square"` (la carte hexagonale reste celle du jeu en service) : distances, voisins, case sous un point, emplacements, villes et routes en cases (`map.ts`, `slots.ts` sur `grid.ts`) ; achat case par case ; Remise, Campo et Porta sur une case libre à soi ; les ateliers sur leur case, les premiers posés autour du Fondaco, leur voisinage par les côtés (D7) ; le chemin de la Porta compté en secteurs d'avant (même durée). Tests `square.test.ts`. Le simulateur en cases (robots, scénario G `scenarios/cases-carrees.json`) : validé au simulateur de 24 mois, 6 cibles sur 9 sur les trois graines contre 5, 5 et 6 aujourd'hui (`docs/calibration.md`, 6 novembre) |
| M4 | en cours : la conversion d'une maison au passage en cases (`migrateToSquare`, `map.ts` : toutes les cases de ses secteurs, ses lieux sur la case libre la plus proche, ses ateliers posés autour de leur Fondaco, aucun mouvement d'argent ; test `migrate-square.test.ts`) ; le serveur accepte la case d'un atelier (`empireBuildWorkshop.tile`). La commande d'achat garde son nom (`empireUnlockCell`), une case carrée étant une « cell ». La note du chapitre est rédigée (`docs/notes-chapitre-2026-12-porcellana.md`, brouillon à publier avant la bascule). Restent : la bascule du thème de Venise (`map.grid`, la carte carrée, `version` + 1) avec le lot 3, la répétition sur une copie du monde |
| 3 | première version, dans le jeu quand le monde est en cases (`EMPIRE_GRID=square`) : `porcellana/board/` — l'adaptateur (`scene.ts`, testé : le Fondaco, les ateliers en marche ou non, Venise en San Marco, les villes des régions atteintes en îlots, les parcelles « + » ouvertes ou fermées, la mer le long des côtes), la Carte (`PorcellanaMap.tsx` : l'arrivée, les routes de chaque atelier à son Fondaco venues du moteur, la sélection, les repères et la fiche ; la flèche ouvre le dock existant du lieu). Le premier Fondaco se pose d'office sur sa case de départ. Parcours `node apps/web/e2e/porcellana.mjs` ; captures `jeu-*.png`. Puis, le 6 novembre : les véhicules (charrette, mulet, cavalier, navire) sur la route du moteur pendant leurs trajets, garés au coin de leur lieu sinon, touchés ouvrent leur panneau ; les commandes en caisses au quai de chaque ville (d'accent celles que le stock couvre) ; les flèches et « + » / « - » du clavier ; sans WebGL, le même plateau vu de dessus, à plat (`FlatBoard.tsx`, capture `jeu-plat.png`). Fait |
| 4 | fait sur la Carte en cases : chaque lieu touché ouvre sa fiche, sa flèche ouvre le dock du lieu (la fiche s'efface quand le dock s'ouvre : pas de double en-tête) ; les pastilles de ville sont devenues des repères. Une case libre à soi est un lieu discret : sa fiche « Bâtir un atelier » ouvre la liste des ateliers avec cette case (`NewWorkshop.tsx`, `freeTileOf`) ; un atelier en chantier montre son échafaudage ; une parcelle achetée referme son panneau. Captures `jeu-chantier.png` |
| 5 | fait sur la Carte en cases : l'onglet Fondaco approche la caméra du Fondaco et met sa barre au pied (Bâtir, le quai, les armes), l'onglet Carte la ramène ; poser la Remise, le Campo, la Porta ou un fondaco se fait en touchant une case libre à soi (la barre de pose d'avant). `map3d/domain.ts` (la fleur de 19) reste pour la carte hexagonale, retiré au lot 8. Capture `jeu-fondaco-onglet.png` |
| 6 | fait : les terres de Rome en biscuit (`porta/colours.ts`, la lumière de Porcellana), les figurines achetées remplacées par des pions de porcelaine dessinés en code avec la même poignée (`porcellana/Pawn.tsx` : marcher, frapper, encaisser, tomber, fêter ; la maison en blanc et accent, Rome en biscuit et encre ; cheval, charrette, bombarde), le mulet du catalogue au quai et en bataille, la Porta et l'étal de l'antiquaire du catalogue, l'île de bataille habillée de sapins, cyprès, rochers et pics de biscuit, les villes de Rome du catalogue (effondrées une fois brûlées). Parcours `e2e/porta.mjs` ; captures `porta-*.png`. Les repères HTML de la scène suivent la palette de l'interface (lot 7) |
| 7 | fait : la palette `porcellana` (`index.css`), le défaut (`theme.ts`) — papier porcelaine, encre brune, l'action unique au rouge de Venise (`--face`, D2), l'or aux montants, la sélection en encre violette profonde (les tests de contraste et de daltonisme passent) ; les surfaces de verre en papier (82 et 90 % de leur couleur) ; Cormorant Garamond pour les titres et les noms, Work Sans pour le reste et les sur-titres, embarquées (D4), aux chiffres alignés. Les autres palettes restent au choix du joueur. Captures `interface-*.png` |
| 8 | en partie : les polices d'avant retirées (Archivo, Cinzel, Space Grotesk, Space Mono, et leurs paquets), `docs/design.md` (Porcellana en tête, les directions remplacées marquées) et `CLAUDE.md`. Le reste attend la bascule du monde en cases (`EMPIRE_GRID=square`), la carte hexagonale restant celle du jeu en service jusque-là : les modèles KayKit et Quaternius et `recolor.ts`, `map3d/Board3D.tsx` et `domain.ts`, la couche SVG des hexagones (`art/hexmap.ts`), `art/plateau/`, les figurines `figure.tsx`/`minis.tsx` |
| 9 | à faire après la bascule du commerce |
