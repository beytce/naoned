# Plan : la direction Céladon (les ateliers, l'île, la carte, puis tout le jeu)

*Proposé le 14 novembre 2026, à la demande du porteur (« Je veux que les ateliers ressemblent à ça avec ce niveau de détail et de graphisme […] profite-en pour adapter tout le jeu à ce type de visuel, tout comme la carte : quelque chose de simple, de pas trop lourd visuellement mais complet tout de même »), d'après ses captures d'un jeu d'usine en isométrie douce. **Validé par le porteur le même jour** (« C'est parfait je valide tes propositions tu peux lancer »), avec les quatre choix du § 2. Les lots C0 à C3 sont faits, les lots C4 et C5 en partie (§ 6).*

Page des propositions (privée, au compte du porteur) : https://claude.ai/artifact/QBRSg7rqUAQdpBt9JpkD5v. Les maquettes sont dans `docs/celadon-maquettes/` (rendues avec three.js, aux lumières et à la caméra du kit) ; les captures du jeu dans `docs/celadon-captures/`.

## 1. Ce qu'on prend des captures, et ce qu'on ne prend pas

On prend le fini, pas le jeu : ni ses règles, ni ses objets.

1. **Un plateau épais aux coins ronds** : l'île est un quai de bois sur la lagune.
2. **Quatre matières, pas plus** : la porcelaine reste la base ; s'y ajoutent le bois blond, le céladon et l'ardoise. Le rouge de Venise reste la seule couleur forte, réservée à ce qui est au joueur et à la seule action mise en avant (règle d'or 2).
3. **Le détail d'usage** : pieds, rivets, rails, poulie, lame ; on comprend comment l'objet marche.
4. **La marchandise se voit passer** d'un poste au suivant (règle d'or 10).
5. **Une interface en fiches claires** : entrée → sortie en image, une barre en bas, un seul bouton fort.

| Matière | Valeur de la maquette | Usages |
| --- | --- | --- |
| Porcelaine | `#F5F2EC` | murs, machines, coques |
| Bois blond | `#EBD3A7` | quais, caisses, charpentes |
| Céladon | `#A9CBC0` | ferrures, pieds, feuillages |
| Ardoise | `#55656A` | glissières, ouvertures, encre |
| Rouge de Venise | `#C23B2E` | toi, ton fil, l'action |

## 2. Les choix du porteur (14 novembre 2026)

| # | Question | Choix |
| --- | --- | --- |
| 1 | La palette | **A, Céladon** : quatre matières. La règle d'or 10 et la grammaire de Porcellana (presque monochrome) sont à retoucher au lot C0. |
| 2 | Les glissières entre ateliers voisins d'une même chaîne | **Oui** : le bonus « fournisseur à côté » se voit, sans règle nouvelle. |
| 3 | L'ordre | **L'île et ses ateliers d'abord**, puis la carte, puis le reste. |
| 4 | Le Large sur la carte | **L'eau fonce vers le bord**, sans noir. |

Validé avec le reste : fermer la question ouverte du cadrage v4 sur « l'intérieur des ateliers » (pas de scène intérieure à part, l'atelier se lit de l'extérieur).

## 3. Les trois propositions

- **Les ateliers** (`verrerie-a.jpg`, `scierie.jpg`) : chaque atelier montre ce qui entre, ce qui travaille, ce qui sort ; trois niveaux qui se voient.
- **L'île** (`ile.jpg`, `ile-tel.jpg`) : le plateau de quai, les terrains teintés, les cases à acheter pâles et pointillées ; la fiche d'un atelier (entrée → sortie, terrain, voisin, une touche rouge), la barre des ateliers, l'entrepôt qui prévient.
- **La carte** (`carte.jpg`, `carte-tel.jpg`, esquisse de principe) : au cran « lagune », ton fil et celui de ton rival seulement, les autres au cran « sestiere » ou au toucher d'une ville ; une seule étiquette (nom, jauge, ta part en rouge) ; les boutons empilés deviennent une barre ; la lagune ronde, le fil en ruban et toutes les règles ne bougent pas.

## 4. Les lots

Aucune règle de jeu ne change : ni calibration, ni migration. L'ancien jeu (`/ancien`) n'est pas touché. Un lot, une PR, ses captures ordinateur et téléphone.

| Lot | Contenu | Où |
| --- | --- | --- |
| C0 | **La grammaire** : les quatre matières dans les jetons du kit, la règle 10 et la grammaire mises à jour, le test qui empêche la dérive. | `tokens.ts`, `materials.ts`, `CADRAGE-v4.md` § 2, `docs/design.md` |
| C1 | **Les pièces** : pieds, glissière, caisse, bac, tonneau, bollard, garde-corps, jardinière, barque ; un budget de triangles par case. | `porcellana/shapes.ts`, `models/` |
| C2 | **Les ateliers** : les onze ateliers, le Fondaco, l'Arsenal et les cinq ouvrages de prestige refaits ; trois niveaux ; le chantier. | `models/workshops.ts`, `fondaco.ts`, `ouvrages.ts` |
| C3 | **L'île** : le plateau, les terrains, les glissières entre voisins (lues du moteur), la marchandise qui avance et s'arrête ; la fiche, la barre, l'entrepôt. | `ile/IleBoard.tsx`, `ile/IleScreen.tsx` |
| C4 | **La carte** : le plateau, l'eau qui fonce, les villes et les Maisons en petit, l'étiquette unique, les fils par cran de zoom, la barre des lieux. | `planche/PlancheBoard.tsx`, `LabPlanche.tsx`, `planche.css` |
| C5 | **Le reste du jeu** : la Passe, l'assaut, l'Arsenal, la Muda, la Marée, la Compagnie, l'entrée. | `passe/`, `guerre/`, `planche/*.tsx` |
| C6 | **La tenue** : téléphone (pièces fusionnées par case, version simple au cran « lagune », temps de dessin mesuré) ; parcours e2e et captures refaits. | `bake.ts`, `apps/web/e2e/` |

## 5. Les risques

- **Le téléphone** : plus de détail, plus de triangles ; la parade (une pièce par case, une version simple vue de loin) se mesure au lot C6.
- **Le volume** : le lot C2 est le plus long, dix-huit modèles à refaire à la main.
- **Le rouge** doit rester seul fort : aucune autre teinte vive, le feu des fours reste petit.
- Les maquettes sont fixes et ne montrent que quatre ateliers ; la carte est une esquisse (moins de villes et de Maisons que la vraie).

## 6. Ce qui est fait (14 novembre 2026)

| Lot | Contenu | Où |
| --- | --- | --- |
| C0 | **La grammaire** : les tons `CELADON` et les mesures du quai `QUAY` à côté de `COL` (les scènes anciennes gardent leur palette) ; un matériau par ton ; la règle d'or 10 et le § 15 du cadrage retouchés ; la question de l'intérieur des ateliers fermée. | `porcellana/tokens.ts`, `celadon/kit.ts`, `CADRAGE-v4.md`, `CLAUDE.md`, `docs/design.md` |
| C1 | **Les pièces** : tréteau, glissière, caisse, tronc, bac, tonneau, sac, bouteilles, piles de planches et de briques, cordage, bollard, garde-corps, jardinière, sapin, cyprès, barge ; un objet par marchandise pour les glissières. Une boîte coûte ce que sa taille demande (`bx`). | `celadon/pieces.ts`, `celadon/kit.ts` |
| C2 | **Les bâtiments** : les onze ateliers, le Fondaco, l'Arsenal et les cinq ouvrages. Le niveau ajoute des objets (piles, bacs, étagères) ; la roue de la scierie et les ailes du moulin tournent. Chaque modèle sous 30 000 triangles, testé. | `celadon/workshops.ts` |
| C3 | **L'île** : le quai de planches sous les cases possédées (une case achetée l'élargit), les terrains teintés, les cases à acheter pâles et pointillées, le chantier ; **les glissières** entre deux voisins dont l'un fournit l'autre, d'après `ileSupplies` (moteur, test d'abord), la marchandise qui avance et s'arrête quand l'atelier attend. L'écran : la fiche « entrée → sortie », terrain, voisins, rendement, une touche rouge ; la barre des bâtiments (toujours là sur ordinateur, ouverte par « Bâtir un atelier » sur téléphone) ; l'entrepôt en encre, rouge quand il va déborder. Un laboratoire : `?lab=celadon` (et `&vue=tout`). | `ile/IleBoard.tsx`, `ile/IleScreen.tsx`, `ile/IleGlyphs.tsx`, `ile/ile.css`, `celadon/ile.ts`, `LabCeladon.tsx`, `packages/engine/src/ile/ile.ts` |

| C4 (en partie) | **La carte** : l'eau pâle au Rialto et plus profonde vers le Large, jamais noire (`LAGOON`) ; les terres en pierre chaude, jointives ; le plateau à bord de bois blond sur l'eau ouverte ; le voile de la marée en encre verte ; les villes, les tours et les navires de l'ancien kit aux tons de la direction (`celadonPalette`) ; les ateliers en petit autour des Maisons pris aux nouveaux modèles ; **la lagune entière en vue, seuls tes fils et ceux de ton rival sont tracés**, ceux des autres reviennent dans ton sestiere ou pour la ville ou la Maison touchée. L'interface de la planche : papier chaud, encre vert profond. | `planche/PlancheBoard.tsx`, `planche.css`, `materials.ts`, `tokens.ts` |

| C4 (suite, 15 novembre) | **Une étiquette pour tous** : papier et encre ; une tour tenue par un capitaine est cerclée d'encre, une ville fermée plus pâle, plus aucune étiquette sombre. Les Maisons de la planche prennent le Fondaco des îles, en petit. | `planche/planche.css`, `planche/PlancheBoard.tsx` |
| C5 (en partie, 15 novembre) | **Le reste du jeu aux tons de la direction** : le papier, l'encre et le céladon portés par une classe commune (`pc-celadon`) ; la Passe et l'assaut prennent la palette et le ciel de la direction ; les encres en dur de la Passe, de la Muda et de la Marée passent par les jetons. | `porcellana.css`, `passe/`, `guerre/`, `planche/muda.css`, `planche/maree.css` |

| C4 et C5 (redessin, 15 novembre) | **Ce qui restait de l'ancien kit sur la planche est redessiné** : les villes par taille (hameau et son puits, bourg et son clocher, cité et son dôme), la tour d'un passage (ronde, cerclée de céladon, son treuil), le Rialto (halle à arcades, pont, étals), le navire, et les pièces de la Passe (barge, borne d'encre, rives de planches). L'assaut prend la tour et le navire. | `celadon/places.ts` |

Vérifié : tests, typage, lint ; parcours `e2e:ile` et `e2e:planche` (seul), téléphone et ordinateur ; la CI (tests et parcours) au vert sur C0 à C3. Captures : `docs/celadon-captures/` (`ile-pc`, `fiche-pc`, `fiche-tel`, `tout-pc`, `planche-pc`, `planche-tel`, `lagune-sestiere-pc`, `passe-pc`, `passe-tel`).

**Écarts aux maquettes, voulus.**
- Un atelier est dessiné à 78 % de sa case : ses bords restent libres pour les glissières, qui passent au milieu de chaque côté.
- La glissière va d'un bord à l'autre, sans entrer dans la machine.
- Le quai ne porte que les cases possédées ; les cases à acheter flottent autour, en fantômes.
- La case de rive ne porte pas de quai d'embarquement : la barge au fanion est amarrée au quai de l'île.

**Reste, pour les lots suivants.**
- **C4, ce qui manque** : une capture de la lagune entière, fils des autres masqués (la règle est codée, pas encore vue en image).
- **C5, ce qui manque** : le décor de l'assaut (quais, batteries, bombarde) n'a que changé de tons ; les campaniles, les phares et le môle de la Muda aussi ; l'assaut, l'Arsenal, la Muda, la Marée et la Compagnie n'ont pas été revus en image, leurs parcours demandent le serveur de jeu ; l'entrée.
- **C6** la tenue.
- **Pas d'essai sur un vrai téléphone.** En rendu logiciel, l'île avec l'occlusion est lente ; le poids réel se mesure au lot C6.
- Les cases à acheter qui chevauchent le bord du quai se lisent moins bien que les autres.

## 7. La suite : la lagune simplifiée et les six lieux (proposé le 15 novembre 2026)

*À la demande du porteur (« Le lagune est trop lourd, il y a trop d'éléments, on voit trop d'autres joueurs, on s'y perd : fais une proposition de simplification » ; « tous les autres modes qui n'ont pas encore eu la refonte, fais une proposition visuelle »). Page des propositions (privée) : https://claude.ai/artifact/DLpvnTP1KC1u2WF4cR4vwt ; maquettes dans `docs/celadon-maquettes/suite/`. **Validé par le porteur le 15 novembre 2026** (« Je valide, fusionne et lance S1 »), avec les quatre choix ci-dessous. Les lots S1, S2 et S3 sont faits.*

### La lagune : on ne montre que ceux qui comptent pour toi

1. **Quatre Maisons nommées** : toi, ton rival de la semaine, la Maison juste devant toi au rang, celle juste derrière.
2. **Tes voisins de sestiere en petit**, sans nom ; **les Maisons des autres sestieri en plots**, comptées par sestiere. Toucher un plot donne son nom et sa fiche.
3. **Le décor des autres disparaît** : petits ateliers, flotte à l'ancre, phare et pierres gravées ne se dessinent que pour toi et ton rival.
4. **Deux sortes de fils** : les tiens, ceux de ton rival. Toucher une ville montre qui la sert.
5. **Les passages sans nom** : une tour et un cadenas ; le nom et le capitaine dans la fiche.

Aucune règle de jeu ne change, et rien n'est caché : tout reste à un toucher (règle d'or 5).

### Les six lieux : un gabarit

L'Arsenal, la Muda, la Marée, la Compagnie, la Guerre et le Palais : une scène en tête (l'objet du lieu, en 3D, qui suit l'état du jeu), un titre qui dit où tu en es, entrée → sortie en jetons, **une seule touche rouge**, le reste replié. L'assaut et l'entrée gardent leur écran.

### Les choix du porteur (15 novembre 2026)

| # | Question | Choix |
| --- | --- | --- |
| 1 | Maisons nommées | **Quatre** |
| 2 | Maisons des autres sestieri | **Des plots** |
| 3 | Consignes des lieux | **Dans le guide de la première ouverture** |
| 4 | Ordre | **La lagune d'abord** |

### Les lots

| Lot | Contenu | Où |
| --- | --- | --- |
| S1 | **La lagune** : les cinq règles d'affichage ; « qui est devant, qui est derrière » lu du moteur (test d'abord) ; les plots et leur fiche au toucher ; les parcours adaptés ; captures aux trois crans. | `planche/PlancheBoard.tsx`, `LabPlanche.tsx`, moteur du rang |
| S2 | **Le gabarit** : la fiche commune, appliquée d'abord à l'Arsenal. | `planche/`, `celadon/` |
| S3 | **Les cinq autres lieux**, un par un, chacun avec son parcours rejoué. | `planche/*.tsx` |

### Ce qui est fait (15 novembre 2026)

| Lot | Contenu | Où |
| --- | --- | --- |
| S1 | **La lagune simplifiée.** Moteur : `plancheAround` dit qui te précède et qui te suit au rang (test d'abord). Quatre Maisons nommées (toi, ton rival, devant, derrière, avec leur place) et celle qu'on touche ; tes autres voisins de sestiere en petit, un drapeau pour étiquette ; les Maisons des autres sestieri en plots sur l'eau, sans case ni étiquette, comptées sous le nom du sestiere. Le décor (ateliers en petit, flotte, phare, pierres) pour toi et ton rival seulement. Les fils des autres ne se tracent que pour la ville ou la Maison touchée. Les passages n'ont de nom que tenus par toi, menacés ou touchés. | `planche/PlancheBoard.tsx`, `LabPlanche.tsx`, `planche.css`, `packages/engine/src/planche/rang.ts` |

| S2 | **Le gabarit des lieux, sur l'Arsenal.** La tête d'une fiche (`LieuHead`) : la scène du lieu, dessinée hors écran pour un état puis gardée en image (`vignette`, le contexte rendu aussitôt : un téléphone ne garde qu'un canevas) ; une petite ligne pour le lieu, un titre qui dit où l'on en est (« Galère en cale », « Les cales sont libres »). Une seule touche rouge : le premier navire qu'on peut mettre en chantier ; tous les navires repliés dessous. Les consignes de la première visite en note claire, plus en bloc sombre. | `planche/Lieu.tsx`, `celadon/vignette.ts`, `celadon/scenes.ts`, `planche/Arsenal.tsx` |

| S3 | **Les cinq autres lieux au gabarit** : la Muda (le môle, ce qui y attend selon la cale, le convoi à quai ou en mer), la Marée (une ville, la ligne d'encre, une tour), la Compagnie (le phare et ses anneaux par niveau), la Guerre (ta tour, celle d'en face, la chaîne, tes galères), le Palais (la salle et son campanile). Un titre d'état pour chacun (« 3 de toi dans la cale », « Tu es 4ᵉ sur 12 », « Un assaut t'attend aujourd'hui »). Dans la Guerre, une seule touche rouge : le port en vue. Le guide de la compagnie en note claire. | `celadon/scenes.ts`, `planche/Muda.tsx`, `Maree.tsx`, `Compagnie.tsx`, `Palais.tsx`, `guerre/GuerreSheet.tsx` |

Vérifié : 2 109 tests, typage, lint ; parcours `e2e:planche`, `e2e:ile`, `e2e:passe` (seul) ; le parcours du compte, en ligne, joué jusqu'au bout. Captures du jeu en ligne : `docs/celadon-captures/lagune-sestiere-pc`, `lagune-entiere-pc`, `lagune-sestiere-tel`, `lagune-entiere-tel`.

**À savoir.**
- Au premier jour tout le monde est à égalité : personne n'est « devant » ni « derrière », seuls toi et ton rival sont nommés. Les deux autres noms n'ont donc pas été vus en image.
- Un plot se touche sur la planche elle-même (son étiquette est retirée) : le toucher d'un plot n'a pas été rejoué par un parcours.
- Le phare d'une autre compagnie n'est plus dessiné : sa feuille s'ouvre par la fiche de la Maison.
- Les lieux du Large gardent leur nom.
- **S2.** La scène est une image fixe par état, pas une animation. Le parcours `e2e:arsenal`, en ligne, passe ; capture `docs/celadon-captures/arsenal-tel` (prise avant deux retouches : l'article devant le nom du navire, le cadrage de la scène).
- **S3.** Parcours rejoués en ligne : `e2e:compagnie` (passe) et `e2e:guerre` (passe avec l'horloge du serveur un mercredi, `CLOCK_START` ; un dimanche il échoue faute de flottille, avec ou sans ce lot). Captures `compagnie-tel`, `guerre-tel`. **La Muda, la Marée et le Palais n'ont pas été vus en image** : leurs parcours (`e2e:semaine`, `e2e:maree`, `e2e:rang`) n'ont pas été rejoués. La Compagnie garde plusieurs touches rouges selon son état (fonder, donner, écrire) : non revue.
- **La CI ne rejoue que le parcours `layout`** (l'ancien jeu) : aucun parcours de la planche n'y tourne. Ce que la CI valide pour ces lots, ce sont les tests, le typage, le lint et le build.
- **Vus en image depuis, dans le jeu en ligne** : les fiches de la Muda et de la Marée (premières étapes de `e2e:semaine` et `e2e:maree`). Sur téléphone, la scène d'un lieu est un bandeau (elle prenait la moitié de l'écran).
- **Trouvé en chemin, et corrigé à la demande du porteur** : depuis le gel des ligues, le moment de fin de marée ne s'ouvrait plus (corrigé côté serveur) ; le parcours `e2e:semaine` échouait sur trois contrôles venus de lui-même (corrigé). Les deux parcours passent et sont en CI. Détail dans `docs/e2e.md`.
