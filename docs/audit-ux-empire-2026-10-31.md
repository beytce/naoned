# Audit UX/UI de l'empire (31 octobre 2026)

> « L'interface n'est pas belle du tout, on ne comprend rien, je ne sais pas ce qu'il y a à faire, ce n'est pas graphique, c'est injouable. » — le porteur, à la première partie en production.

Le porteur a raison. Cet audit dit pourquoi, écran par écran, puis propose une refonte par lots, chacun jouable seul.

**Méthode** :
- les captures du parcours `e2e:empire` (390×844 et 320×568), de la fondation à la Terraferme ;
- la lecture de l'écran (`apps/web/src/empire/`) ;
- la comparaison avec l'écran du jeu mensuel, qui avait reçu les lots 1 à 8 de la refonte UX.

## 1. Le diagnostic en une phrase

**Les étapes 3 à 7a ont empilé des systèmes de jeu sur un écran resté au stade du prototype.** Chaque mécanique a reçu sa liste de lignes de texte et ses boutons dans une feuille ; aucune n'a reçu de mise en scène, de guide ni d'objectif.

Le jeu mensuel avait pourtant tout cela, et rien n'en a été repris :
- le guide de Lorenzo (`Coach.tsx`) ;
- la carte illustrée (`WorldMap`, `art/veneto.tsx`) ;
- les dessins des bâtiments (`art/buildings.tsx`) ;
- les effets (`fx.tsx`), les sons et les vibrations ;
- le rapport « Bon retour ».

## 2. Les sept problèmes, du plus grave au moins grave

### P1. On ne sait pas quoi faire (gravité : bloquante)

- Après « Fonder la Maison », aucun guide, aucun objectif, aucune phrase ne dit « faites ceci ».
- La seule action en or, « Tout relancer », ne dit pas ce qu'elle produit ni pourquoi.
- **La boucle du jeu est invisible** : produire, vendre ou livrer, gagner des ducats, bâtir la Casa. Aucun écran ne la montre.
- **Le premier objectif réel est un piège.** La Casa 2 demande 5 briques et 5 planches. La Maison n'a pas de briqueterie. La feuille de la Casa affiche « 0/5 Briques » en rouge, mais ne dit pas qu'il faut **bâtir une briqueterie** sur la place libre (le « + » pointillé de l'orbite). Un nouveau joueur est bloqué dès la cinquième minute.
- Le Carnet présente neuf objectifs à la fois (« Relancer 3 fois », « Relancer 10 fois », « Livrer 40 unités »…), tous avec un bouton « Encaisser » grisé. C'est une liste de corvées, pas un chemin.

### P2. Le vocabulaire n'est jamais expliqué (bloquante)

En tête d'écran dès la première seconde : « Vénétie · Casa 1 », « Puissance 170 · Bande 1 · Faveur 0 ». Puis viennent la Dogana, le Carnet, la file de 12 heures, les chantiers, les bandes. Aucun de ces mots n'est expliqué, ni par une aide au toucher ni par un glossaire, et certains ne servent à rien avant des semaines (la Bande, la Puissance).

### P3. Tout est texte, rien n'est graphique (majeure)

- **L'orbite de la Maison** : trois pastilles de 50 px sans nom, une petite marque, un « 1 » dans un coin, un trait doré inexpliqué (le voisinage). On ne sait ni ce qu'est chaque atelier, ni ce qu'il fait, ni s'il est prêt.
- **La feuille des ateliers** répète trois fois la même carte de texte (« Ramasser et relancer », « Niveau maximum : montez d'abord la Casa »). Pas d'arc de progression, pas d'illustration du bâtiment, pas de « +8 argile » quand on ramasse.
- **La carte** est une toile de cercles numérotés (6, 8, 9, 10, 12…) reliés par des pointillés, sans géographie. Le nombre est le niveau de Casa requis, ce que rien ne dit. Une région touchée ouvre une page presque vide (« Aucun gisement connu dans la région »).
- **Les prix** sont un tableau de « 4 d · en direct » répété six fois, sans tendance ni repère de ce qui est bon.
- Le temps est écrit en phrases (« File jusqu'à 10 h 43 ») au lieu de se lire en arcs, contrairement à la règle Lagune (« le temps se lit en arcs et sur la frise »).

### P4. Trop de choses fermées montrées trop tôt (majeure)

À la Casa 1, l'écran montre :
- l'Arte (Casa 7) ;
- la Scuola et les savoirs (Casa 4) ;
- la Terraferme et sa Contesa ;
- la compagnie et l'entraide ;
- quatre navires de l'Arsenal (Casa 9 à 18) ;
- la colleganza ;
- la famille et ses cinq traits ;
- huit régions verrouillées.

Le joueur voit une vingtaine de systèmes dont il ne peut rien faire. **La profondeur doit s'ouvrir palier par palier** (CADRAGE-v3 § 3 septies, « chaque fois avec un objectif du guide ») ; ici, elle est déversée.

### P5. L'information utile est enterrée (majeure)

- **Le stock** (combien d'argile, de bois, de planches) n'est nulle part en vue. Il est au bas de la feuille des ateliers, sous l'Arsenal et la colleganza.
- **Vendre** ou **livrer** se fait dans cette même liste, sans dire où c'est le plus cher.
- **La caisse et le revenu** ne disent pas combien on gagne par jour, alors que le coût de la Casa se compte en jours de revenu.

### P6. Aucun retour, aucune récompense ressentie (majeure)

- Ramasser, vendre, bâtir, gagner un niveau : rien ne bouge. Seul le chiffre en haut à droite change.
- Pas de pièce qui vole, pas de son, pas de vibration, pas de célébration à la Casa 2.
- Les erreurs arrivent en bandeau bref, parfois peu claires (« Indisponible dans l'empire »).

### P7. La navigation ne suit pas la boucle (moyenne)

- Les cinq onglets s'appellent Carte, Ateliers, Casa, Carnet et Terraferme.
- La boucle de base (produire, vendre, bâtir) est répartie sur trois d'entre eux : Ateliers pour produire et vendre, Casa pour bâtir, Carte pour les prix.
- Chaque onglet ouvre une longue feuille qui empile des systèmes sans lien entre eux. Celle des ateliers porte, l'un sous l'autre :
  - les ateliers ;
  - l'entrepôt ;
  - la cour ;
  - le charroi ;
  - l'Arsenal ;
  - la colleganza.

## 3. Les principes de la refonte

1. **Un objectif à la fois, toujours visible.** Une carte « Prochain pas » sur l'écran d'accueil dit quoi faire, pourquoi, et porte le bouton en or qui le fait.
2. **Le guide d'abord.** Lorenzo accompagne la première heure, pas à pas, jusqu'à la Casa 3. Ensuite, il annonce chaque ouverture.
3. **Montrer ce qui est ouvert, taire le reste.** Un système fermé n'apparaît qu'une Casa avant son ouverture, en une seule ligne (« Bientôt : la Scuola, à la Casa 4 »).
4. **Le jeu se voit.** Les ateliers sont des bâtiments dessinés, avec un nom, un arc de production et un compteur « prêt » à toucher. Le stock est une barre de ressources en haut. La carte est une vraie carte.
5. **Chaque geste répond** : une marchandise qui vole vers le stock, des pièces vers la caisse, une célébration à chaque Casa, le son et la vibration du jeu mensuel.
6. **Les mots s'expliquent.** Un « ? » à côté de chaque terme ouvre une bulle d'une phrase ; un glossaire dans le profil.
7. **La navigation suit la boucle.** La Maison pour produire et bâtir ; le Marché pour vendre et commercer ; le Monde pour la carte, la mer et les régions ; la Compagnie pour le Carnet, les associés et la Terraferme ; la Famille et le profil.

## 4. La refonte, en lots jouables

Chaque lot se livre seul, testé, avec ses captures. On l'enchaîne après validation.

### Lot A — Jouable en 5 minutes (le plus urgent)

1. **La carte « Prochain pas »**, en tête de l'accueil. Elle est calculée à partir de la vue, sans rien changer au moteur. Elle propose la meilleure action du moment, dans cet ordre :
   - ramasser ce qui est prêt ;
   - bâtir l'atelier qui manque à la Casa suivante (la briqueterie) ;
   - vendre ce qui s'empile ;
   - bâtir la Casa ;
   - sinon, attendre, avec l'heure du prochain lot.

   Chaque proposition dit pourquoi, en une ligne (« La Casa 2 demande des briques : bâtissez une briqueterie »).
2. **Le guide de Lorenzo** (repris de `Coach.tsx`) pour la première heure, en six étapes :
   - relancer ;
   - ramasser ;
   - vendre de l'argile ;
   - bâtir la briqueterie ;
   - réunir les matériaux ;
   - bâtir la Casa 2.

   Puis une étape à chaque ouverture.
3. **La barre de ressources** sous l'en-tête : les marchandises tenues, avec leur marque et leur quantité. Un toucher ouvre « Vendre / Livrer », au meilleur prix indiqué.
4. **L'en-tête simplifié** : le nom, la caisse et le revenu du jour. La Puissance, la Bande et la Faveur passent dans le profil, avec leur « ? ».
5. **Taire les systèmes fermés** :
   - l'Arte, la Scuola, les savoirs, l'Arsenal, la colleganza, la cour et la famille n'apparaissent qu'à leur Casa, moins une ;
   - la Terraferme et la compagnie restent montrées, car elles sont ouvertes.

### Lot B — Le jeu se voit

1. **La Maison en scène** : l'orbite devient une place de Venise vue de haut.
   - Le palais de la Casa est au centre.
   - Les ateliers sont dessinés autour (`art/buildings.tsx`), chacun avec son nom, son niveau, l'arc lapis de son lot et sa pastille vert d'eau « +8 » quand c'est prêt. **Toucher un atelier prêt le ramasse.**
   - La place libre devient un chantier dessiné, « Bâtir ici ».
2. **Les effets** de `fx.tsx` à chaque gain : la marchandise vole vers la barre de ressources, les pièces vers la caisse, avec le son et la vibration.
3. **La célébration de la Casa** : un moment plein écran, avec ce qu'elle ouvre et le prochain objectif.
4. **Le temps en arcs** : les files, les chantiers et les voyages, plus aucune phrase « jusqu'à 10 h 43 ».

### Lot C — Une navigation qui suit la boucle

Les cinq onglets deviennent :

| Onglet | Contenu |
| --- | --- |
| **Maison** | La place, le « Prochain pas », les chantiers, la Casa |
| **Marché** | Les prix de Venise et des comptoirs, avec une tendance ; vendre, livrer, la cour ; les convois et la colleganza |
| **Monde** | La carte illustrée : régions en île, brouillard sur ce qui est fermé, Casa requise écrite en clair ; comptoirs, gisements, l'Arsenal et la Muda |
| **Compagnie** | Le Carnet (trois objectifs à la fois), les associés, l'entraide, la Terraferme et la Condotta |
| **Famille** | La lignée, le personnel, les savoirs, l'Arte |

Le profil (Puissance, Bande, réglages, glossaire) s'ouvre par l'avatar en haut.

### Lot D — La carte du monde illustrée

On reprend le portulan du jeu mensuel (`WorldMap`, `Terrain`, `art/veneto.tsx`) à l'échelle de la Méditerranée :
- les dix régions sont placées sur leur vraie géographie ;
- les routes de terre et de mer sont tracées ;
- les convois sont des points mobiles ;
- une région fermée est dans la brume, avec « Casa 9 » écrit dessus ;
- une région ouverte montre ses prix forts et ses gisements.

### Lot E — Le Carnet et les récompenses

- Le Carnet montre trois objectifs à la fois, du plus proche au plus loin. Encaisser déclenche une animation de Faveur.
- Le rapport « Bon retour » (repris du mensuel) dit ce qui a tourné pendant l'absence, avec un seul bouton « Tout ramasser ».

### Lot F — Mots, aide, accessibilité

- Une bulle « ? » à côté de chaque terme ;
- un glossaire ;
- des messages d'erreur réécrits pour dire quoi faire (« Il manque 3 briques : bâtissez une briqueterie ») ;
- des contrastes vérifiés ;
- les petits écrans de 320×568 traités avec soin.

## 5. Ce qu'on mesure

À chaque lot, le parcours `e2e:empire` est prolongé en **parcours du nouveau joueur** : de la fondation à la Casa 2, sans aide extérieure, en suivant seulement le « Prochain pas ». Il doit aboutir en moins de 10 minutes de jeu simulé, aux deux tailles d'écran.

En production, deux mesures dans la télémétrie existante :
- la part des Maisons qui atteignent la Casa 2 dans leur première session ;
- le temps entre la fondation et la première vente.

## 6. Ordre recommandé

**A, puis B, puis C**, avant toute nouvelle mécanique (7b et la suite attendent). A rend le jeu compréhensible ; B le rend agréable ; C le rend lisible quand la Maison grandit. D, E et F suivent.
