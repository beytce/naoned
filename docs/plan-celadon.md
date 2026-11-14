# Plan : la direction Céladon (les ateliers, l'île, la carte, puis tout le jeu)

*Proposé le 14 novembre 2026, à la demande du porteur (« Je veux que les ateliers ressemblent à ça avec ce niveau de détail et de graphisme […] profite-en pour adapter tout le jeu à ce type de visuel, tout comme la carte : quelque chose de simple, de pas trop lourd visuellement mais complet tout de même »), d'après ses captures d'un jeu d'usine en isométrie douce. **Les quatre choix du § 2 sont tranchés par le porteur le même jour ; le plan par lots (§ 4) attend sa validation avant tout code.***

Page des propositions (privée, au compte du porteur) : https://claude.ai/artifact/QBRSg7rqUAQdpBt9JpkD5v. Les maquettes sont dans `docs/celadon-maquettes/` ; elles sont rendues avec three.js, aux lumières et à la caméra du kit (`source/`, une étude, pas du code de jeu).

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

Proposé au passage : fermer la question ouverte du cadrage v4 sur « l'intérieur des ateliers » (pas de scène intérieure à part, l'atelier se lit de l'extérieur).

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
