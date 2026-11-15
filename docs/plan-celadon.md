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

Vérifié : tests, typage, lint ; parcours `e2e:ile` et `e2e:planche` (seul), téléphone et ordinateur ; la CI (tests et parcours) au vert sur C0 à C3. Captures : `docs/celadon-captures/` (`ile-pc`, `fiche-pc`, `fiche-tel`, `tout-pc`, `planche-pc`, `planche-tel`, `lagune-sestiere-pc`, `passe-pc`, `passe-tel`).

**Écarts aux maquettes, voulus.**
- Un atelier est dessiné à 78 % de sa case : ses bords restent libres pour les glissières, qui passent au milieu de chaque côté.
- La glissière va d'un bord à l'autre, sans entrer dans la machine.
- Le quai ne porte que les cases possédées ; les cases à acheter flottent autour, en fantômes.
- La case de rive ne porte pas de quai d'embarquement : la barge au fanion est amarrée au quai de l'île.

**Reste, pour les lots suivants.**
- **C4, ce qui manque** : les villes et les tours redessinées au détail des ateliers (elles n'ont que changé de tons) ; une capture de la lagune entière, fils des autres masqués (la règle est codée, pas encore vue en image).
- **C5, ce qui manque** : les pièces de la Passe et le décor de l'assaut redessinés (ils n'ont que changé de tons) ; l'assaut, l'Arsenal, la Muda, la Marée et la Compagnie n'ont pas été revus en image, leurs parcours demandent le serveur de jeu ; l'entrée.
- **C6** la tenue.
- **Pas d'essai sur un vrai téléphone.** En rendu logiciel, l'île avec l'occlusion est lente ; le poids réel se mesure au lot C6.
- Les cases à acheter qui chevauchent le bord du quai se lisent moins bien que les autres.
