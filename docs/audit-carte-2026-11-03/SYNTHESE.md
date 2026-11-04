# Synthèse de l'audit de la carte (3 novembre 2026)

Quatre experts : UX mobile (30 recommandations), UI et direction artistique (26), game design (25), robustesse du code (6 bloquants, 12 majeurs, 18 mineurs, 16 recommandations). Rapports complets à côté de ce fichier : rapport-ux.md, rapport-ui.md, rapport-game.md, rapport-code.md.

## 1. Ce qui est cassé aujourd'hui (vérifié dans le code)

| # | Défaut | Preuve | Effet |
|---|---|---|---|
| B1 | « Y envoyer un véhicule » envoie la mule **à vide** | `EmpireGame.tsx:258` ne fait qu'un `empireMove` | la mule arrive à Padoue soute 0/2, rien n'est livré |
| B2 | Les ateliers sont invisibles en 3D | l'orbite HTML n'a plus que des carrés vides (`Orbit.tsx:329`), les ateliers 3D sont posés au ras du sol, deux tuiles plus loin, dans les forêts, les villes et le verre | « ils ne s'affichent plus du tout » |
| B3 | Toucher le toit du fondaco ouvre Venise ou referme l'orbite | zones de toucher de 8 de haut, qui se chevauchent avec celles des villes | on croit que le fondaco ne répond pas |
| B4 | `onReady` n'est pas branché | `EmpireMap.tsx` définit `onThreeReady` sans le passer au plateau | les règles CSS de la 3D ne s'appliquent jamais : la médaille recouvre la mule et vole les touchers |
| B5 | Aucun filet si la 3D échoue | pas d'ErrorBoundary | un modèle absent ou un WebGL refusé donne un écran noir |
| B6 | La 3D n'est pas en cache hors ligne | `vite.config.ts` exclut `Board3D-*.js` et les modèles du précache | hors ligne, ou juste après un déploiement, la carte ne charge pas |
| B7 | Les modèles sont refondus à chaque ouverture | `useKit()` (`kit.tsx:79`) | mémoire qui grimpe, saccades |
| B8 | La mule ne rentre jamais au fondaco | `moves.ts`, `arrive` | le simulateur suppose le contraire : le calibrage est faussé |

## 2. Ce qui gâche l'expérience

- **Le fondaco se noie** : même sol que les autres tuiles possédées, collé à Venise, 2,5 fois une maison. La mule fait la taille d'une maison.
- **L'or partout** : une cinquantaine de contours dorés sur les tuiles de verre. L'or ne signale plus « à toi d'agir ».
- **Les anneaux de commandes** sont à moitié cachés sous les bâtiments ; 15 textes font moins de 12 px ; noms qui se chevauchent.
- **Livrer demande 6 à 8 touchers et un glisser**, qui échoue sur PC.
- **« Recentrer » ne ramène jamais au fondaco** ; la caméra ignore la feuille du bas (la mule se cache dessous) ; le pincement coupe le suivi.
- **Pas de lagune au premier écran** : seul le secteur de Venise est révélé.
- **Rien pendant le chargement** de la 3D.
- **Rendu permanent à 30 images/s** avec effets lourds ; chaque rafraîchissement du serveur (30 s) refait toute la scène sans libérer l'ancienne.
- **Routes calculées différemment** côté client et serveur : durées affichées fausses.

## 3. Ce qui casse la boucle de jeu

- Aucune livraison possible en première session (pas de stock, 6 à 10 h pour un lot).
- Petites villes bloquées 10 h par une commande impossible.
- Lorenzo propose « Livrez 9 draps », que personne ne commande.
- Le simulateur compte au moins une commande par ville et par session : environ 3 fois trop généreux pour une petite ville. Le calibrage C est à refaire.
- Pas de prime de distance (prévue au cadrage § 3.4).

## 4. Le plan proposé, en lots

Chaque lot : un commit par correctif, captures avant et après, tests, lint, typecheck, e2e.

**Lot 0. Réparations immédiates (petit effort, aucune décision)**
B4 brancher `onReady` ; B1 « Y envoyer un véhicule » livre vraiment (appel `empireDeliver`), sinon caché ; plus jamais de « Partir » en or soute vide ; B5 ErrorBoundary avec repli SVG ; B6 précache ; B7 cache du kit ; zones de toucher à la hauteur des bâtiments ; pas de rendu au repos ; scène non refaite à chaque rafraîchissement ; « Réduire les animations » respecté.

**Lot 1. Livrer depuis la ville**
Feuille de la ville refaite : une carte par commande (marque, quantité, barre de stock, paie), un seul bouton d'or « Livrer · n lots · X d ». Le jeu prend la mule, la charge au fondaco, l'envoie par la route qui s'éclaire. Nouvelle commande moteur qui livre plusieurs marchandises d'une ville. Retour automatique au fondaco. Si rien n'est livrable, une ligne dit pourquoi et quand. La médaille disparaît : on touche l'animal ; jetons « mule en route » dans le HUD.

**Lot 2. La vue du domaine**
Toucher le fondaco : la caméra plonge vers une petite scène (fondaco au centre, ateliers sur les tuiles autour, leur état en 3D : s'anime, pile qui grandit, prêt, en attente, chantier). « Tout récolter », « Bâtir ici ». Sortie par chevron, pincement, Échap, retour. L'orbite HTML disparaît en 3D.

**Lot 3. Le fondaco à part, la tuile d'or**
La seule tuile d'or (socle relevé, flanc plus sombre, quai crème, lanterne). Une tuile à lui, séparée des villes. Barème d'échelles (fondaco plus petit, mule plus petite, villes plus grandes). Lagune révélée au départ. Recalage des fondaci existants.

**Lot 4. La carte qui parle**
Une caisse par commande sur le quai de la ville (pleine si le stock couvre, creuse sinon) ; liseré qui s'allume quand la ville est pleine ; de loin, une colonne de lumière. Plus d'anneau HTML. À l'arrivée : les caisses tombent, des ducats volent jusqu'à la bourse. Un seul contour d'or par secteur achetable. Noms à 12 px minimum, sans chevauchement.

**Lot 5. Navigation fluide**
« Maison » ramène au fondaco ; flèches au bord de l'écran vers le fondaco et les mules hors champ ; la caméra cadre au-dessus de la feuille ; le suivi survit au pincement ; paliers de zoom avec niveau de détail ; molette et pavé tactile corrects sur PC ; écran de chargement.

**Lot 6. Équilibrage (au simulateur de 24 mois, toutes les graines, docs/calibration.md)**
Corriger le modèle de commandes du simulateur, puis : première livraison possible en première session, commandes impossibles, prime de distance. Lorenzo parle des livraisons.

## 5. Vos décisions et le plan final

Une seule PR à la fin, un commit par correctif, captures avant et après (téléphone et PC) dans la PR. Tests du moteur écrits d'abord sur la fixture.

**Lot 0. Réparations** : brancher `onReady` ; « Y envoyer un véhicule » remplacé par une vraie livraison ; jamais de départ soute vide ; ErrorBoundary avec repli SVG ; 3D et modèles en cache hors ligne ; cache unique du kit ; zones de toucher à la hauteur des bâtiments ; aucun rendu au repos ; scène non refaite à chaque rafraîchissement ; « Réduire les animations » respecté ; routes du client et du serveur identiques.

**Lot 1. Livrer depuis la ville** : feuille de la ville en cartes de commande, cochées d'office selon le stock (la mieux payée d'abord) ; un seul bouton d'or « Livrer · n lots · X d » ; le plus petit véhicule qui suffit, chargé au fondaco, parti tout de suite, puce « Annuler » 5 s dans le HUD ; la mule rentre seule au fondaco ; la caméra reste sur la ville ; jetons « mule en route » dans le HUD. Médaille et glisser supprimés, on touche l'animal. Si rien n'est livrable, une ligne dit pourquoi et quand. Moteur : commande `empireDeliverOrders` (plusieurs marchandises), retour automatique, plus de compte à rebours de 10 s.

**Lot 2. Vue du domaine** : plongée vers une fleur de 19 tuiles (fondaco au centre, ateliers autour, lagune et décor muet en bordure), petit pan borné, sortie par chevron, pincement, Échap ou retour. État des ateliers en 3D (s'anime, pile, prêt, en attente, chantier). « Tout récolter », « Bâtir ici ». Écurie : les mules au repos dans leurs stalles, à la place du « 2/2 ». Orbite HTML et bouton Production retirés.

**Lot 3. Fondaco à part** : la seule tuile d'or (socle relevé, flanc `#C9962E`, quai, lanterne) ; secteur de départ en triangle (Venise nord-est, Padoue à l'ouest, fondaco au sud-est, campo au centre) ; fondaci existants recalés d'office sur la tuile libre la plus proche ; barème d'échelles (fondaco 5,8, mule 2,4, Venise jusqu'à 10 maisons) ; mer voisine de Venise révélée au départ.

**Lot 4. La carte qui parle** : une caisse par commande sur le quai de la ville (pleine si le stock couvre, creuse sinon) ; liseré vert d'eau quand la ville est pleine, or seulement si vous pouvez livrer ; colonne de lumière de loin ; plus d'anneau HTML ; à l'arrivée, les caisses tombent et les ducats volent vers la bourse ; au retour d'absence, 3 s de rejeu des livraisons ; un contour d'or par secteur achetable seulement ; noms à 12 px minimum, sans chevauchement.

**Lot 5. Navigation** : « Maison » ramène au fondaco, deuxième toucher ouvre le domaine ; flèches au bord de l'écran vers le fondaco et les mules ; la caméra cadre au-dessus de la feuille ; le pincement ne coupe plus rien ; paliers de zoom avec niveau de détail ; molette et pavé tactile sur PC ; écran de chargement.

**Lot 6. Équilibrage** : d'abord le simulateur sur la vraie logique des commandes, puis première commande réduite pour chaque ville proche, tirage pondéré vers ce que vous produisez, prime de distance rétablie ; chaque réglage validé sur 24 mois, toutes les graines, noté dans docs/calibration.md. Lorenzo propose les vraies livraisons.

**Hors chantier, notés dans IDEAS.md** : sons et vibrations, monuments en plus, bouton œil, « Tout livrer », notifications.

Point de règle : au commerce, un changement s'annonce dans les notes du chapitre avant de s'appliquer. Les lots 1, 3 et 6 changent le jeu (retour automatique, départ immédiat, place du fondaco, commandes, prime) ; je prépare la note du chapitre avec la PR.
