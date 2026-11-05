# Porcellana : le monde en porcelaine, partout (plan, 5 novembre 2026)

*Proposition à valider par le porteur. Le porteur a écrit du prototype : « les visuels sont parfaits » ; de la fiche au clic : « c'est exactement de cette manière que je veux voir apparaître les informations et fonctionnalités » ; de la teinte de sélection : « pile ce que je veux, même l'animation du début ». Il demande d'intégrer **exactement** ce visuel à tous les aspects du jeu.*

Références (elles font foi pour toute question d'aspect) :
- le prototype : `docs/direction-artistique-2026-11/porcellana/prototype.html` (three.js 0.170, autonome ; en ligne, privé, au compte du porteur : https://claude.ai/artifact/AHMH8g2BCs4rmAKEbSLCBy) ;
- ses captures : `carte-ensemble.png`, `carte-selection.png`, `carte-telephone.png` dans le même dossier.

Porcellana remplace, pour tout ce qui est en 3D et pour les surfaces de l'interface, le Plateau de nuit, Jour et le verre et la Lagune. Elle garde la refonte claire (les quatre lieux, une décision à la fois) et le dock (le choix se fait dans le dock). Aucune règle de jeu ne change : pas de passage au simulateur.

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

## 2. Les décisions à prendre avant de coder

| # | Question | Recommandation |
| --- | --- | --- |
| D1 | **Cases carrées (le prototype) ou hexagonales (le treillis du moteur : `hexmap.ts`, `slots.ts`, `roadBetween`, la fleur de 19 du domaine) ?** | Garder l'hexagone, traité en Porcellana : même épaisseur, mêmes arêtes, mêmes joints. Passer au carré changerait le moteur, le serveur et les mondes en cours, et aucune règle ne le demande. **Lot 0** : ajouter au prototype un bouton carré/hexagone, pour que le porteur tranche sur pièce. |
| D2 | **L'accent et l'or.** Aujourd'hui, l'action est en or, la sélection en lapis et la Porta noire en cinabre. | Une seule couleur, l'accent rouge de Venise, pour l'action, la sélection et les routes. La règle « une seule action en or » devient « une seule action à l'accent ». Les ducats restent des pièces d'or en relief : un objet, pas une couleur d'interface. La Porta noire passe au noir d'encre, ce qui lui va. |
| D3 | **Le sélecteur d'accent** (rouge, or, vert lagune) du prototype. | Le rouge par défaut. Le choix va derrière le médaillon, dans les réglages : un goût personnel, sans effet de jeu. |
| D4 | **La typographie.** Le jeu embarque Archivo Expanded, Cinzel et Space Grotesk ; le prototype utilise Cormorant Garamond et Work Sans. | Prendre celles du prototype, embarquées (licence OFL, sans appel à Google), pour tout le jeu. Retirer Cinzel, Archivo et Space Mono, ou ne garder Space Mono que pour la console d'admin. |
| D5 | **Les terres de Rome** (la Porta, aujourd'hui au crépuscule, `ROME_DUSK`). | La même porcelaine, en « biscuit » : terre cuite pâle non émaillée (sol `#E7DCCD`, murs `#EFE6D9`), et le noir d'encre pour ce qui est à Rome. On sait qu'on a changé de terre sans changer de monde. Maquette au lot 0. |
| D6 | **Les modèles achetés** (KayKit : sapins, rochers, montagnes, caisses, tour de Rome, figurines ; Quaternius : âne, cheval). | Tout redessiner en code dans le kit Porcellana. Aucun modèle externe ne tient les biseaux, la palette et la finition. |

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
| **Les villes** (une trentaine, par taille) | Hameau : 2 à 3 maisons. Bourg : 5 maisons, un campanile. Cité : un îlot, son monument. Venise : San Marco (campanile et basilique à 5 coupoles), la Salute, les maisons. Le monument d'une ville vient du champ `campanile` de la scène (les coupoles de Padoue, une église ailleurs). | Ses commandes en caisses sur son quai (la règle de la refonte claire). Une ville hors de portée est en silhouette, les ouvertures pleines. |
| **Le décor** | Arbres ronds, cyprès, sapins ; rochers biseautés ; montagnes en gradins taillés ; champs. La part de chaque espèce vient de la région (`DRESS`). | — |
| **L'inconnu** | Plaques fines au niveau de l'eau ; secteur achetable : la parcelle « + » ; fermé : la même parcelle, « + » grisé. | — |
| **Les véhicules** | Mulet bâté de deux caisses ; charrette à deux roues et caisses (prototype) ; cavalier ; navire à voile d'accent (prototype) pour le transport par mer, s'il existe. Tous dessinés en code. | Ils roulent seulement quand leur trajet est en cours (règle de `fleet3d.tsx`). |
| **Les figurines de la Porta** | Des pions de porcelaine : socle rond biseauté, corps en fuseau, tête ronde, l'arme du rôle en silhouette. La maison en blanc et accent, Rome en biscuit et encre. | Marcher, frapper, tomber : des gestes simples par transformations. Aucun squelette ni mixeur. |

Le **laboratoire des modèles** (`?lab=porcellana`, à la suite de `MinisLab.tsx`) montre chaque modèle sur sa case, dans chacun de ses états. Le porteur valide le catalogue là, famille par famille, avant qu'un modèle ne monte sur la carte.

## 5. Les lots

Chaque lot fait l'objet de petits commits, se vérifie (§ 7) et laisse le jeu jouable. Rien ne cohabite à moitié : une scène passe en Porcellana d'un bloc.

| Lot | Contenu | Validation du porteur |
| --- | --- | --- |
| 0 | **Les décisions.** Dans le prototype : bouton carré/hexagone (D1), terres de Rome en biscuit (D5), fiche avec un vrai bouton d'action (D2). Captures dans `docs/direction-artistique-2026-11/porcellana/`. | D1 à D6 tranchées |
| 1 | **Le kit** (§ 3) : tokens, matériaux, primitives, fusion, `Stage`, arrivée, ruban, sélection, avec leurs tests. Le laboratoire, avec le Fondaco et les arbres. | Le Fondaco et la lumière, au laboratoire, identiques au prototype |
| 2 | **Le catalogue** (§ 4) : les neuf ateliers, la Remise, le Campo, la Porta, l'Arsenal, les comptoirs, les villes par taille, Venise, le décor, l'inconnu, les véhicules. Tout au laboratoire. | Famille par famille |
| 3 | **La Carte** : `Board3D` sur le kit. Cases, mer, inconnu, villes, routes en ruban entre les lieux reliés (`roadBetween`), chevrons seulement là où un véhicule roule, véhicules, arrivée à la première ouverture de la session, caméra (§ 1). Le calque SVG et HTML reste calé au pixel (`camera.ts`). Les modèles KayKit quittent la carte. | La Carte, sur ordinateur et sur téléphone |
| 4 | **La fiche** : toucher un lieu (ville, atelier, Fondaco, Remise, véhicule, parcelle « + ») le sélectionne (levée, anneau, voile) et ouvre sa fiche à côté du repère. La fiche dit qui c'est, ce qu'il fait, son état en une phrase. Son bouton rond ouvre le dock de ce lieu, où se prend la décision. La fiche remplace l'en-tête de lieu en tête du dock ; `CityPill` et les pastilles deviennent des repères (§ 1). | Le parcours toucher → fiche → décision |
| 5 | **Le Fondaco** (le domaine) : la fleur de 19 cases en Porcellana, l'arrivée des cases quand on y plonge, les ateliers en état, le quai. | Le domaine |
| 6 | **La Porta** : `PortaScene`, `ArmsScene` et `Battle3D` sur le kit, en biscuit ; ruines, tour de Rome et villes à coffres redessinées ; les figurines-pions ; les coups (carreaux, boulets, étincelles) en traits d'accent ou d'encre. L'objectif en haut, en pilule de papier. | La Porta et un combat |
| 7 | **L'interface** : la palette `porcellana` dans `index.css` (le défaut ; Jour et ses sœurs sont retirées), les surfaces de papier à la place des `.glass*` (mêmes trois épaisseurs, mêmes règles de contraste, `test/theme.test.ts` mis à jour), le HUD, la barre des quatre lieux en pilule de papier, le dock, les feuilles, la Compagnie, le profil, les pièces (`coins.tsx`) et `GoodsMark` en relief de porcelaine, les polices embarquées (D4). | L'ensemble, écran par écran |
| 8 | **Le ménage** : retrait des modèles KayKit et Quaternius et de `recolor.ts`, du SVG du Plateau (`art/plateau/` sauf ce qui sert au sol sans WebGL, qui passe en Porcellana à plat), des palettes retirées. `docs/design.md` : Porcellana en tête, les directions remplacées marquées comme telles. `CLAUDE.md` : la ligne Porcellana à la place de Jour, du Plateau et de la Lagune. | — |

## 6. Ce qui demande de l'attention

- **Le téléphone d'abord.** Une case fusionnée = au plus 6 appels de dessin. Carte d'ombre de 2048 sur téléphone, de 4096 sur ordinateur. Occlusion en demi-résolution, coupée quand l'appareil peine. Mesure : `e2e/map-fps.mjs`, avec le seuil d'aujourd'hui comme plancher.
- **Le monochrome lisible.** Un lieu se reconnaît à sa silhouette, à toutes les tailles de la carte. Le laboratoire montre chaque modèle à 0,8 et à 4 de zoom.
- **Le contraste.** Le texte reste à 4,5:1 sur papier et sur la scène (test existant). L'accent n'écrit jamais de texte courant.
- **Règle d'or 8 (tout se voit).** La fiche accompagne l'image, elle ne la remplace pas : une phrase, pas un tableau.
- **Ce qui ne change pas** : le moteur, le serveur, les règles, les données. Pas de passage au simulateur.

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
| 0 à 8 | proposé, en attente de validation |
