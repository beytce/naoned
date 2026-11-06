# La Porta en Porcellana — proposition (6 novembre 2026)

Demande du porteur : « Refais toute la carte de la Porta dans le même style exact que la carte de base, refais la 3D pour qu'elle soit belle et épurée, et les personnages aussi. Fais une proposition avant. »

Proposition visible au laboratoire (`?lab=porcellana&vue=porta`, `&vue=bataille`, `&vue=pions`), construite avec le kit de la carte (`apps/web/src/porcellana/`) : mêmes cases carrées biseautées qui tombent en place, mêmes routes rouges à chevrons, même lumière, mêmes repères et même fiche. Rien n'est branché au jeu tant que la proposition n'est pas validée.

## Ce qui change

| Aujourd'hui | Proposé |
|---|---|
| Plateau d'hexagones d'argile (`map3d/kit.ts`, `hexSlab`), fond violet ou bleu nuit | Les cases carrées de la Carte (`slab`), en **biscuit** pour les terres de Rome (D5), en porcelaine émaillée pour le côté de la maison (le quai, l'antiquaire) : on voit la frontière entre les deux mondes |
| Les six paliers en marches sur un arc, la Porta noire en dalle sombre | Les six **paliers en socles à degrés** (un degré de plus par palier, leur numéro en points comme un dé, rouges quand ils sont ouverts) ; un palier fermé porte une bande d'encre et un cadenas ; la **Porta noire** est une arche d'encre avec une lueur rouge qui respire |
| La porte de pierre au nord, l'étal et les coffres | La **Porta** (le modèle du catalogue) au fond, la route rouge du quai au palier choisi puis à la porte ; **l'antiquaire** sous son auvent rayé blanc et rouge, ses coffres de reliques (porcelaine, une gemme de la couleur de la rareté sur le couvercle) |
| Bataille : île d'hexagones, grands anneaux colorés, figurines peu lisibles | Bataille : une **île de cases en biscuit**, les villes de Rome du catalogue avec leurs coffres, forêts, rochers et montagnes ; la colonne de la maison sur sa **route rouge** de la Porta jusqu'à la ville visée ; les repères numérotés (reliques gardées) au lieu des anneaux |
| Pions : corps en fuseau, tête ronde, accessoires collés | **Pions tournés comme des pièces d'échecs** en porcelaine (`models/pawns.ts`) : pied biseauté, corps cintré, col, tête ronde, et **un seul signe** par rôle — chapeau de fer et pique (piquier), arbalète en travers (arbalétrier), **tête de cheval à crinière rouge** (cavalier), bannière de Venise (capitaine) ; Rome en biscuit et encre : casque à cimier et scutum (légionnaire), capuchon et arc (archer), cimier rouge en travers (centurion). La maison porte une écharpe rouge |
| Interface de bataille en verre | Les pièces de la Porcellana ludique : carte blanche « Palier 2 · 3/7 reliques » avec ses losanges de rareté, la fermeture en pastille d'encre, les unités en anneaux de vie (rouge sous 60 %) |

Les règles ne bougent pas : le moteur joue la bataille comme aujourd'hui (`packages/engine/src/empire/porta/`), seuls le dessin et la mise en scène changent.

## Décision

Validée par le porteur le 6 novembre 2026 (« C'est exactement ce que je souhaite ») : les reliques gardent leurs quatre couleurs (sable, vert, bleu, or ; `RARITY_HEX`), la taille des pions est la bonne.

## Lots

| Lot | Contenu |
|---|---|
| P1 | Les pions (`pawns.ts`) branchés partout : la Porta, les armes, la bataille ; leurs gestes (marcher, frapper, tomber) par transformations, comme `Pawn.tsx` ; `Pawn.tsx` et `map3d/roster.ts` réduits à la correspondance rôle → pièce |
| P2 | La place de la Porta sur cases carrées (`PortaScene.tsx`) : le quai, l'antiquaire, les paliers, la Porta, la Porta noire, la route rouge vers le palier choisi ; repères et fiche de la Carte ; le dock en trois étapes inchangé mais posé comme sur la maquette |
| P3 | Les armes (`ArmsScene.tsx`) : l'atelier de la Remise sur cases, les véhicules sur leurs socles, les places des composants en repères |
| P4 | La bataille (`Battle3D.tsx`, `BattleDiorama.tsx`) : l'île de cases tirée de la graine du combat (`chart.ts` passe des hexagones aux carrés), villes et coffres, routes rouges des déplacements, coups et chutes ; l'interface de bataille de la Porcellana ludique |
| P5 | Retrait de l'ancien kit (`map3d/kit.tsx`, `hexSlab`, `clay`, `life.tsx` s'il ne sert plus) ; e2e `porta.mjs` en bureau et téléphone |

## À trancher

- **Les gemmes de rareté** gardent quatre couleurs (sable, vert, bleu, or) : ce sont les seules couleurs des terres avec le rouge. On peut aussi les dire par la forme seule (losange, double losange…) et rester monochrome.
- **La taille des pions** face aux bâtiments : ici à peu près la moitié d'une maison, lisibles en vue d'ensemble.

## État

| Lot | État |
|---|---|
| P1 | fait : `roster.ts` réduit au rôle → pièce (`piece`, `mount`, `crew`, `banner`, `torch`) ; `Pawn.tsx` monte la pièce tournée, son chariot et son équipage, sa bannière ou sa torche ; gestes par transformations (balancement en marchant, penché pour frapper, recul, chute, saut de joie) ; `figureOf(role)` pour un plateau |
| P2 | fait : le plateau du laboratoire devient `porcellana/TileBoard.tsx`, partagé (laboratoire, Porta, armes) ; il sait mettre en avant plusieurs places (`marked`), viser un point (`goTo`, `goZoom`) et laisser la place d'un dock en bas (`inset`) ou à droite (`insetRight`). La place de la Porta (`porta/board.ts`, `portaSpec`) : six paliers toujours visibles (ceux que la Porta n'offre pas encore fermés), la Porta, la Porta noire, l'antiquaire et ses coffres, l'équipage au quai, la route rouge du quai à la porte ; repères de la Carte ; sur ordinateur le dock à droite |
| P3 | fait : les armes (`armsSpec`) : la Remise au fond, chaque véhicule sur son socle, ses emplacements en disques de la couleur de leur genre et en repères (`extra`) |
| P4 | fait : l'île de bataille en cases carrées de biscuit (instanciées), bosquets, rochers et pics du kit, villes du catalogue et coffres de reliques, la Porta de la maison ; la carte de bataille tournée d'un huitième de tour (`chart.ts`) pour que la caméra de la carte voie les cases en losange comme la Carte, sans toucher aux calques HTML ni aux gestes ; la lumière, les ombres et l'occlusion de la Carte (`Stage`, à l'échelle de l'île) ; anneaux fins (vie en encre, Rome en rouge) ; interface : carte blanche du palier, fermeture en pastille d'encre, unités en pilules à anneau de vie, composants en touches blanches |
| P5 | fait : `map3d/kit.tsx`, `life.tsx`, `anchors.tsx` retirés ; e2e `porta.mjs` en 1440×900 (`SIZE`) et 390×844 |
