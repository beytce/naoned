# Audit UI et direction artistique : la carte 3D de Fondaco (3 novembre 2026)

Angle : direction artistique et UI du « petit monde ». J'ai relu le brief, `docs/design.md` (§ Plateau de nuit et § Lagune), `docs/plateau-reprise.md` § 7 et 8, la palette `C` (`apps/web/src/art/plateau/props.ts:23`), le plateau (`map3d/Board3D.tsx`, `scene.ts`, `fleet3d.tsx`, `life.tsx`, `kit.tsx`), les calques HTML (`map/EmpireMap.tsx`, `Fleet.tsx`, `OrdersPanel.tsx`, `Hud.tsx`), et regardé toutes les captures `phone/`, `pc/` et `parcours/`. Aucun fichier du dépôt n'a été modifié.

Pour les mesures ci-dessous : une petite tuile a un rayon `TILE_R` = 24 × (√3/√7) / √3 ≈ **9,07 unités** (15,7 unités d'un côté plat à l'autre). Au zoom de départ, sur téléphone, une unité fait environ 9 px, donc une petite tuile fait environ 140 px de large (`1-depart.png`).

---

## 1. Constats (prouvés)

### A. Le fondaco et la composition du départ

- **A1. Le fondaco est collé aux villes.** Dans le secteur de départ (« 2,4 »), Venise, Padoue et le fondaco occupent trois des sept tuiles, dont deux sont adjacentes (Venise et le fondaco ; `phone/1-depart.png`, `pc/1-depart.png`). Le fondaco a le même sol sable-or `C.land #E2C27A` que toutes les tuiles possédées (`Board3D.tsx:647`) : rien ne le distingue au sol. Seul son toit d'or le signale, et c'est l'objet le plus gros de la scène.
- **A2. L'échelle relative est incohérente.**
  - Le hall du fondaco fait 7,6 unités (`Board3D.tsx:852`) ; une maison de ville 3,4 × s ≈ 3 unités (`Board3D.tsx:613`) ; une mule 3,6 unités de long (`fleet3d.tsx:98`).
  - Résultat : le fondaco d'un marchand débutant est deux fois plus massif que Venise, capitale de taille 5, et une mule a la taille d'une maison (`phone/3-mule.png` : l'âne est aussi haut que le perron du fondaco).
  - Venise (taille 5) et Padoue (taille 3) se ressemblent : `n = min(5, 1 + size)` maisons, une échelle de 0,75 + 0,06 × taille (`scene.ts:158-160`). Seul le monument les distingue.
- **A3. Venise n'a pas d'eau.** Le secteur 2,4 est côtier (`venice1450.map.ts:20`), mais avec la carte « qui grandit » seul le secteur de Venise est vu au départ (`map.ts:212`). Toute la mer voisine est donc du verre. La lagune, signature du Plateau de nuit (« la mer en lagune lapis translucide », `design.md`), est absente du premier écran. Venise est posée sur du sable entre deux champs.
- **A4. Le premier écran manque de rythme.** Sur sept tuiles, quatre sont « remplissage » (deux champs de dalles identiques, deux plaines avec sapin et rocher). Elles ont toutes la même couleur `#E2C27A`, et le monde se lit comme une seule tache sable (`pc/1-depart.png`).

### B. Les infos des villes et les calques HTML

- **B1. Les anneaux de commandes se lisent comme des défauts d'affichage.**
  - L'anneau SVG est aplati (`scaleY(TILT)`, `EmpireMap.tsx:1156`) et posé sous les bâtiments 3D. On n'en voit qu'un arc vert d'eau qui sort de derrière les maisons (`phone/1-depart.png`, Venise et Padoue).
  - Il est illisible comme jauge : on ne sait ni ce qu'il mesure, ni qu'il est cliquable.
- **B2. Les étiquettes se chevauchent.**
  - « FONDACO CASA_3D » est coupé par les deux médailles des mules (« FONDA ▢ ▢ 3D », `phone/1-depart.png`, `pc/1-depart.png`).
  - « PADOUE » est rogné par le bord de l'écran (« ADOUE », `phone/2-fondaco.png`, `parcours/14-commandes.png`).
  - Les noms d'ateliers en orbite (« Carrière d'argile / niv. 1 · À lancer ») passent sur le fondaco et la tuile de Venise, en gris sans fond sur du sable (`phone/2-fondaco.png`, `pc/2-fondaco.png`). Le contraste est très en dessous de 4,5:1.
- **B3. Plusieurs textes de la carte font moins de 12 px.**
  - `.map-name` : 0,6875 rem = 11 px (`index.css:1181`).
  - Pastilles d'info et minuteurs : `text-[0.625rem]` = 10 px (`EmpireMap.tsx:1191`, `Fleet.tsx:301`, `Fleet.tsx:337`).
  - Badge « +n » : 10 px (`EmpireMap.tsx:1213`).
  - En tout, 15 occurrences de `text-[0.5…]` ou `text-[0.6…]` sous `map/` et `Orbit.tsx`.
- **B4. Le liseré d'or du verre envahit l'écran.**
  - Chaque petite tuile de verre d'un secteur à acheter reçoit son propre contour d'or (`Board3D.tsx:655-668`). Au départ, c'est tout l'écran (`pc/1-depart.png` : une cinquantaine d'hexagones cerclés d'or).
  - Cela contredit « l'or seulement pour ce qui est à vous et pour l'action » (`design.md`). Le monde possédé n'est plus le seul point chaud.
- **B5. Le verre est trop lourd.** Ses dalles font `SLAB + BASE − 2` de haut, avec opacité 0,16 et faces latérales visibles (`Board3D.tsx:511`, `:484`). Au dézoom (`phone/4-dezoom.png`), l'inconnu est un bloc de cubes gris-bleu qui écrase le monde vivant : 7 tuiles de sable contre une centaine de tuiles de verre.

### C. Les ateliers (signalement 1)

- **C1. L'orbite d'ateliers rivalise avec la carte.**
  - L'orbite fait `ORBIT_UNITS` = 46 unités (`logic.ts:28`), soit trois petites tuiles. Elle se pose donc par-dessus les tuiles voisines : la Carrière d'argile s'empile sur la ferme au nord-est du fondaco, la Scierie sur la route, le Camp de bûcherons flotte au-dessus du verre (`pc/2-fondaco.png`).
  - Les tuiles d'ateliers (`WS_TILE_R` = 4,4, `Board3D.tsx:766`) sont deux fois plus petites que celles de la carte (9,07) : deux échelles de tuiles coexistent dans le même plan.
  - « Bâtir » en lapis sur une dalle grise est presque invisible (`phone/2-fondaco.png`).
- **C2. Piste technique possible pour la disparition chez le porteur (hypothèse, non vérifiée).**
  - `Workshops3D` n'est rendu que si `orbit3d` existe (`EmpireMap.tsx:388`), et seulement en `frameloop="demand"`.
  - Le comparateur de `memo` de `Board3D` ignore `house.workshops` (`Board3D.tsx:249-255`).
  - Un appareil où le premier rendu après l'ouverture n'est pas redemandé, ou qui active la carte SVG de repli (pas de `Workshops3D` du tout), ne montrerait rien.
  - La décision de la vue du domaine règle le fond de la question, mais il vaudra la peine de le confirmer.

### D. Véhicules et livraison (signalement 4)

- **D1. Les médailles font tache.**
  - Ce sont des disques bleu nuit de 44 px, cerclés de lapis, avec une icône de caisse (`phone/3-mule.png`, `parcours/16-depart.png`).
  - Elles se posent devant l'animal, sur le nom du lieu, et doublent l'information portée par l'animal lui-même.
  - Deux mules à l'arrêt font deux pastilles sur le nom du fondaco.
- **D2. Le glisser pour envoyer ne marche pas partout.** Il a échoué sur PC dans le parcours automatique (brief), et le geste n'est ni découvrable ni visuel avant d'être commencé.
- **D3. La feuille du véhicule est un tableur.**
  - Cinq ou six boutons-icônes sans libellé (`parcours/16-depart.png`).
  - L'onglet modules montre quatre lignes « Ouvre au niveau N du modèle (Remise) » (`parcours/17-en-route.png`).
  - La liste « Plus chères / Moins chères / Plus proches / Plus lointaines » avec des lignes grisées (`parcours/14b-charger.png`) contredit la règle d'or 8.

### E. La feuille d'une ville (signalement 5)

- **E1. La feuille de Padoue ne montre presque rien.**
  - Elle tient sur une seule ligne de texte (« Planches × 120 … 1 380 d ») et une phrase de minuteur (`phone/1b-padoue.png`).
  - On n'y voit ni si le fondaco a le stock, ni combien de places restent, ni la ville elle-même.
  - L'action « Y envoyer un véhicule » envoie une mule vide si rien n'est chargé (le chargement se fait ailleurs, dans la feuille du véhicule, `parcours/14b-charger.png`). Livrer demande ainsi trois écrans au lieu d'un.

### F. Le HUD

- **F1. Le HUD est lourd en haut à droite.**
  - Quatre pilules empilées (ducats, faveurs, sceaux, véhicules 2/2), plus un bouton rond vert d'eau « + » (Production, `Hud.tsx:101`).
  - Le bouton plein en `lagoon` contredit « Lagune : jamais un bouton » (`design.md`, tableau des palettes).
  - Les pilules couvrent la colonne droite de la carte, celle où la caméra place justement le fondaco (`phone/3-mule.png` : le « + » masque le four).
- **F2. Le bouton « Tout relancer » est sur la carte mais rien sur la carte ne montre l'atelier qui attend.** « Un atelier attend » ne renvoie à aucun objet visible (`phone/1-depart.png`).

### G. Lumière et rendu

- **G1. La lumière est juste, mais la scène est plate dans les sables.**
  - Lumière hémisphérique `#CFE0F5`/`#B89A62` à 1,15 et directionnelle `#FFF3DD` à 2,4 (`Board3D.tsx:348-353`) : les sables se brûlent presque en `#E2C27A` uniforme.
  - Les ombres des bâtiments sont courtes. Les joints entre tuiles (0,45 unité) disparaissent au zoom de départ.
  - Le N8AO teinté `NIGHT` à 2,6 assombrit surtout les pieds des maisons KayKit, ce qui est bien.

---

## 2. Recommandations

Légende : effort **S** (moins d'un jour), **M** (2 à 4 jours), **L** (une semaine ou plus) ; impact **1** (confort) à **3** (change l'expérience) ; **[Décision]** quand il faut l'accord du porteur.

### Le secteur de départ et le fondaco (signalement 2)

**R1. Le secteur de départ « en triangle ».** Effort **M**, impact **3**, **[Décision]** (données de la carte).
- **Problème** : A1, le fondaco collé à Venise et Padoue.
- **Solution** : dans la fleur de sept tuiles du secteur 2,4, poser les trois lieux sur trois tuiles extérieures **alternées**. Trois tuiles alternées sont toutes à deux tuiles l'une de l'autre, et aucune ne touche une autre.
  - **Venise** sur la tuile nord-est, côté mer (voir R3).
  - **Padoue** sur la tuile ouest.
  - **Le fondaco** sur la tuile sud-est, la plus proche de la caméra, devant.
  - **La tuile centrale** devient un **campo** : un carrefour en Y où se rejoignent les trois routes, pavé, avec un puits (une pièce faite main de 2 unités).
  - **Les trois tuiles restantes** servent de tampons : ferme (nord), forêt (sud-ouest), rochers et carrière (est).
- **Résultat** : chaque lieu a sa respiration, les routes sont visibles et égales (une tuile d'intervalle, environ 31 unités, soit 5 à 6 minutes à 11 s par unité, cohérent avec le § 8), et le fondaco est devant, en bas à droite de la composition. Sur téléphone, c'est la zone la moins couverte par le HUD une fois R20 appliquée.
- **Où** : les `x, y` de Venise et Padoue dans `packages/engine/src/themes/venice1450.map.ts:59-60` (régénérés par `apps/web/scripts/hexmap.ts`) ; la place unique du premier fondaco (`tileFault`, `slots.ts`) devient le centre de la tuile sud-est ; le thème `campo-centre` dans `scene.ts`.
- **Variante si le porteur refuse de bouger les villes** : déplacer le fondaco dans un secteur voisin côtier vu au départ (par exemple 1,5 ou 2,5, côté terre ferme), qui devient « le domaine » (voir R9). Elle oblige à révéler un deuxième secteur au départ.

**R2. La tuile dorée du fondaco, la seule de la carte.** Effort **S**, impact **3**.
- **Problème** : A1, aucun sol ne distingue le fondaco ; le sable possédé `#E2C27A` est déjà « or pâle ».
- **Solution** : une tuile du même gabarit, mais trois signaux cumulés pour qu'on ne la confonde jamais avec le sable.
  1. **Dessus** en `C.gold #F2C24F`, avec `emissive #F2C24F` à 0,10 : il brille dans la nuit sans être une lampe.
  2. **Socle relevé** de +1,2 unité, flanc en or sombre `#C9962E`. Ce ton dérivé est à ajouter à `C` sous le nom `goldSide` : c'est `#F2C24F` assombri de 18 %, dans la logique de `land`/`landSide`.
  3. **Liseré** : un filet de pavés crème `C.wall #E9F0F8` de 0,5 unité sur le pourtour du dessus. C'est le « quai » du fondaco : il découpe la tuile du sable voisin et lui donne une silhouette.
- **Règle** : aucune autre tuile ne prend `C.gold` en surface. Les secteurs à acheter perdent leur or (R6).
- **Où** : `Board3D.tsx`, un `Instanced` à part pour la tuile `theme === "fondaco"` (aujourd'hui fondue dans `own`, ligne 647) ; `C.goldSide` dans `art/plateau/props.ts`.

**R3. Venise sur sa lagune dès le premier écran.** Effort **S** à **M**, impact **3**, **[Décision]** (révéler la mer au départ).
- **Problème** : A3.
- **Solution** :
  - révéler au départ les **secteurs de mer voisins** du secteur de Venise. La mer ne s'achète pas : la voir ne coûte rien au jeu ;
  - poser Venise sur la tuile au bord de cette lagune, avec deux pieux d'amarrage et une gondole (pièce faite main, 3 × 0,8 unité, coque `C.door #22385A`, poupe `C.roofGold`).
- **Résultat** : la lagune lapis translucide `C.water #6EC8F5` entre dans le cadre (environ 25 % de l'écran du départ). Elle donne la profondeur et le contraste froid/chaud qui manquent à A4.
- **Où** : `startCells` (`packages/engine/src/empire/map.ts:212`) ou seulement le `revealed` côté vue ; `scene.ts` (tuiles `water`).

**R4. Une hiérarchie d'échelles fixe.** Effort **S**, impact **3**.
- **Problème** : A2.
- **Solution** : un barème à écrire en tête de `scene.ts`, en unités de la carte, avec la largeur ou la hauteur visée et sa valeur aujourd'hui.

  | Objet | Visé (largeur / hauteur) | Aujourd'hui |
  | --- | --- | --- |
  | Touffe, caillou | 0,6 à 1 | idem |
  | Mule (corps) | **2,4** long | 3,6 |
  | Charrette | **3,2** (attelage compris) | 3,2 + 3,2 |
  | Maison de ville | **3,0 à 3,6** | 3,0 |
  | Atelier (sur sa tuile du domaine) | **5,5 à 6,5** | 6,2 |
  | Hall du fondaco | **5,8**, tour 11 de haut | 7,6, tour 3,4 × h |
  | Monument, ville de taille 1-2 | église de **8** de haut | 4,4 × s |
  | Monument, taille 3 | **10** (coupoles de Padoue) | 0,75 |
  | Monument, taille 4 | **13** | (église) |
  | Monument, taille 5 | campanile de Venise de **17** | ≈ 16 |

  - **Nombre de maisons d'une ville** : `2 + 2 × taille`, plafonné à 10 (au lieu de `min(5, 1 + size)`). Venise en compte 10 sur deux anneaux et déborde sur un quai de lagune ; un bourg de taille 1 en compte 4.
- **Garde-fou de lisibilité** : en dessous de 14 px pour une mule (zoom inférieur à environ 6 px/unité), voir R14 (le pion de loin).

**R5. Donner une couleur aux tuiles selon leur thème, dans la palette.** Effort **S**, impact **2**.
- **Problème** : A4, une seule teinte de sable.
- **Solution** : trois tons de dessus pour les tuiles possédées, sans nouvelle teinte hors de la famille sable.

  | Thème | Dessus |
  | --- | --- |
  | Plaine, rochers | `C.land #E2C27A` |
  | Champ, ferme | `C.plot #D9B866` (existe déjà) |
  | Ville | un pavé clair `#EAD7A4`, à ajouter à `C` sous le nom `pave` (le sable éclairci de 25 % vers `C.wall`) |
  | Forêt | `C.land` assombri de 6 % (`#D6B670`) : le sous-bois |

  Les tuiles vues (`C.mist`) suivent la même logique, en retrait (−6 % pour la forêt, +4 % pour la ville).
- **Où** : `Board3D.tsx:647` (un `Instanced` par ton) ; `scene.ts` sait déjà le thème de chaque tuile.

### L'inconnu en verre et les secteurs à acheter

**R6. L'or des secteurs à acheter : un seul contour par secteur, et seulement là où l'achat est possible.** Effort **S**, impact **3**.
- **Problème** : B4.
- **Solution** :
  - tracer le **contour extérieur du secteur** (les 18 arêtes du bord de la fleur), pas les 7 × 6 arêtes des petites tuiles ;
  - seulement pour les secteurs **voisins d'un secteur possédé** ;
  - un secteur que la Casa permet d'acheter : `C.gold`, opacité 0,85, avec une respiration lente (0,55 à 0,85 sur 2,4 s, coupée si l'appareil demande moins d'animation) ;
  - un secteur voisin pas encore permis : `C.mist`, opacité 0,35, pointillé ;
  - tout le reste : aucun contour, le verre seul.
- **Résultat** : au départ, un à trois contours d'or au plus, au lieu de cinquante.
- **Où** : `Board3D.tsx:655-668`, avec une `EdgesGeometry` par secteur calculée dans `scene.ts`, testable.

**R7. Un verre plus léger, qui s'efface avec la distance.** Effort **S**, impact **2**.
- **Problème** : B5.
- **Solution** :
  - hauteur du verre ramenée à **40 %** de la tuile pleine (`SLAB × 0,4`, en gardant le socle `C.mistSoil` sous la lagune seulement) ;
  - dessus en opacité **0,10**, flancs en **0,05** (deux matériaux) ;
  - un filet de bord en `C.mist` à 0,25 sur le dessus seulement, pour garder le « relief » voulu par le porteur ;
  - au-delà de deux secteurs du dernier secteur vu, le verre ne se dessine plus. Le brouillard de scène (`Fog(NIGHT, …)`, `Board3D.tsx:221`) prend le relais, et le monde flotte dans la nuit au lieu d'être cerclé d'une grille.
- **Effet sur les performances** : 60 à 80 tuiles de verre en moins au dézoom.

### Les infos des villes dans le décor (signalement 3)

**R8. Un langage visuel des villes, sans aucun anneau HTML.** Effort **M** à **L**, impact **3**.
- **Problème** : B1, B2, B3.
- **Solution** : cinq états, lus par quatre objets 3D posés sur la tuile de la ville. Les commandes sont maintenant de gros lots, plafonnés à 1, 1, 2, 2 ou 3 places selon la taille (§ 8) : on peut donc **montrer chaque commande comme un objet**.

  1. **Le quai de la ville** : une plateforme de bois (`C.wood #C49A5A`) de 4 × 2,5 unités sur le bord sud de la tuile (côté caméra), avec autant d'emplacements que de places (`cap`).
  2. **Les caisses de commande** : une caisse KayKit (`crate`, 1,6 unité) par commande qui attend, posée sur son emplacement.
     - Couverture teintée par la **chaîne** de la marchandise (paille `#E6D3A3`, terre cuite `#C08A5A`, mousse `#93B95C`, rose de Murano `#F09CC4`, gris de lin `#A6A3B5`, pourpre `#B48BE6`, le tableau de `design.md`).
     - Sa marque (`GoodsMark`) en décalque sur le dessus, à partir du zoom proche.
     - Un emplacement vide montre seulement sa planche.
  3. **Le fanion de la ville** sur son monument (le `Flag` de `life.tsx`, réutilisé).
  4. **Le liseré de la tuile**, le même filet de 0,5 unité que le quai du fondaco (R2), éteint par défaut.

  | État | Ce qu'on voit | Couleurs |
  | --- | --- | --- |
  | **Hors de portée** (aucun comptoir ne la sert) | Tuile vue gris-bleu, toits `roofMuted`, pas de quai, pas de fanion. Le nom n'apparaît qu'au toucher. | `C.mist`, `C.roofMuted #5A7394` |
  | **Ouverte, en attente** (0 commande, la suivante viendra) | Quai vide, fanion **crème** `C.wall` à mi-mât. Le minuteur n'est pas sur la carte : dans la feuille. | crème |
  | **En cours** (1 commande ou plus, pas pleine) | Une caisse par commande, teintée par sa chaîne ; le fanion monte d'un cran par caisse. | teintes de chaîne |
  | **Pleine** (`fillBps` = 10 000 : plus aucune nouvelle commande tant qu'on ne livre pas) | Toutes les places prises ; le **liseré de la tuile s'allume en or** (`C.gold`, `emissive` 0,35, pulsation lente de 3 s) ; fanion d'or en haut du mât. C'est un appel à l'action : l'or est légitime. | `C.gold #F2C24F` |
  | **Livrable maintenant** (le magasin d'un comptoir couvre au moins une caisse) | La caisse couverte est **pleine et nette** (la règle Lagune « forme pleine = le stock couvre »), avec un petit saut de 0,3 unité toutes les 4 s ; une caisse non couverte est **creuse** (un cadre de lattes, sans couverture). Une seule pastille HTML, voir R11. | teinte de chaîne pleine / creuse |
  | **Servie** (une mule est en route pour elle) | La caisse visée reçoit une **sangle** `C.trunk #8A6A3A` en croix (réservée), et la route vers la ville est en pointillé lagune (R15). | `C.trunk`, `C.green #6EE0B8` |

- **À retirer** : l'anneau SVG (`CityMark`, `EmpireMap.tsx:1146-1178`), la pastille « 1/2 » (`:1188`) et le halo `WantedHalo`. On garde la zone tactile, le nom (R10) et l'accessibilité clavier (`aria-label` enrichi : « Padoue, 1 commande sur 2, livrable »).
- **Où** : un composant `CityState3D` dans `map3d/`, nourri par `view.orders` et `view.stores`. Les états se calculent dans une fonction pure à placer dans `map/logic.ts` (`cityState(p, code)`), testée.

**R9. Niveaux de détail selon le zoom : ce qui reste lisible de loin.** Effort **M**, impact **2**.
- **Problème** : au dézoom (`phone/4-dezoom.png`), les états d'une ville seraient illisibles (une caisse fait 5 px).
- **Solution** : trois paliers, en px par unité de la caméra (`Board3DHandle.view`).
  - **Proche, au-dessus de 14** : caisses avec leurs marques, sangles, animaux en détail.
  - **Moyen, de 6 à 14** : caisses sans marque ; fanions agrandis ×1,4 ; noms des villes de taille 3 et plus seulement.
  - **Loin, sous 6** : chaque ville devient une **colonne de lumière** au-dessus de sa tuile.
    - Hauteur proportionnelle au nombre de commandes ; ville pleine en or, livrable en vert d'eau, sinon crème.
    - Cylindre de 0,8 unité de diamètre, `MeshBasicMaterial` additif à 0,6.
    - Les sapins et rochers sont déjà retirés à ce palier (`small`).
- **Où** : le seuil `3,6 px/unité` existe déjà pour le petit décor (`plateau-reprise` § 7, étape 6) ; le généraliser à `lod` dans `Board3D`.

**R10. Les noms : des cartouches posés au sol, qui se placent sans se chevaucher.** Effort **M**, impact **2**.
- **Problème** : B2, B3.
- **Solution** :
  - **Taille et forme** : un nom de lieu en Cinzel **12 px minimum** (0,75 rem au lieu de 0,6875), sur un cartouche bleu nuit `rgb(22 38 62 / 0.78)` de 20 px de haut, filet `C.mist` à 30 %.
  - **Ancrage** : sur le bord sud de la tuile (le point 3D `(x, y + TILE_R × 0,75)`), jamais sur le bâtiment.
  - **Bord d'écran** : un nom qui dépasse est poussé à l'intérieur avec une marge de 16 px (fin de « ADOUE »).
  - **Chevauchements** : une passe de résolution simple à chaque repeint de la caméra. Trier par priorité (fondaco, ville de taille 5 à 1, Remise, Campo, Porta) ; un nom qui chevauche un nom déjà placé se décale de 22 px vers le bas, puis se cache s'il chevauche encore.
  - **Le fondaco** : son nom ne porte plus « FONDACO » mais le nom de la Maison (« Casa_390 ») en crème, avec un petit lion d'or de 12 px à gauche. Le mot « fondaco » est dit par la tuile d'or.
- **Où** : `.map-name` (`index.css:1174`), la mise en place dans `EmpireMap.tsx` (la boucle des `data-at`).

### La feuille d'une ville et la livraison (signalements 4 et 5)

**R11. La feuille d'une ville : des commandes qu'on voit, et « Livrer » qui fait tout.** Effort **M**, impact **3**.
- **Problème** : E1, D2, D3.
- **Solution** : la feuille du bas (troisième profondeur, `Sheet`) quand on touche une ville.
  1. **En-tête** :
     - le nom en Cinzel 14 px (`font-place`), et dessous « Vénétie · taille 3 » ;
     - à droite, les **places** dessinées : `cap` petites caisses de 16 px, pleines ou en pointillé, au lieu de « 1 commande sur 2 ». La caméra glisse en même temps pour cadrer la ville dans le tiers haut de l'écran (centre de la tuile à 30 % de la hauteur), au zoom moyen.
  2. **Une carte par commande** (pas une ligne) :
     - à gauche, la caisse de la commande en grand (`GoodsMark` 40 px, pleine si le stock couvre, creuse sinon), « Planches × 120 » en 15 px ;
     - dessous, une **barre de stock** : 4 px de haut, `C.green` jusqu'à la part couverte (par exemple 87/120), crème atténuée au-delà, et « 87 / 120 au fondaco » en 12 px ;
     - à droite, la paie en or Archivo 16 px (« 1 380 d ») ;
     - si une mule y va déjà : « une mule en route, 3 min » en lagune, et la carte est grisée.
  3. **Le pied** : « Prochaine commande vers 14 h » en 12 px crème atténué (ou « Ville pleine : livrez pour en recevoir »).
  4. **L'action unique en or**, pilule de 56 px :
     - **« Livrer »** si au moins une commande est couverte et qu'une mule est libre. Le jeu choisit la mule libre la plus proche, charge au fondaco la commande la mieux payée qui est couverte, et l'envoie par la route (la décision du porteur). Avec plusieurs commandes couvertes et deux mules libres : « Livrer les deux ».
     - Sinon, un bouton fantôme qui dit pourquoi : « Aucune mule libre · la prochaine rentre dans 2 min », ou « Il manque 33 planches ».
     - Touché, le bouton mène au fondaco (la vue du domaine) sur l'atelier qui produit les planches.
  5. Après « Livrer », la feuille se ferme, la caméra suit la mule 2 s depuis le fondaco (elle sort de son écurie, voir R13), puis rend la main. Le suivi complet reste au toucher de la mule.
- **Ce qui disparaît** : le glisser de la médaille comme moyen principal ; la liste « Plus chères / Moins chères… » de la feuille du véhicule (`parcours/14b-charger.png`), qui ne reste qu'au panneau avancé du véhicule.
- **Où** : `OrdersPanel.tsx` (à refondre), `EmpireGame.tsx` (la commande composée « charger + envoyer », déjà exprimable par les deux commandes moteur existantes, en une transaction côté serveur).

**R12. Le chemin de la livraison se voit avant de partir.** Effort **S**, impact **2**.
- **Problème** : on ne sait pas, en touchant « Livrer », par où et combien de temps.
- **Solution** : feuille ouverte et « Livrer » possible, la route du fondaco à la ville (`roadOf`, `logic.ts`) s'éclaire sur la carte.
  - Un ruban `C.green` à 0,5 d'opacité, posé 0,05 unité au-dessus de la terre battue, avec des chevrons qui avancent lentement (1 unité/s).
  - Une seule étiquette au milieu du trajet : « 5 min » en 12 px.
  - Le bouton dit aussi la durée : « Livrer · 5 min ».

### Les véhicules sans médailles (signalement 4)

**R13. Une écurie sur la tuile du fondaco, à la place de l'orbite des véhicules à l'arrêt.** Effort **M**, impact **3**.
- **Problème** : D1, deux médailles posées sur le nom du fondaco.
- **Solution** :
  - les véhicules au repos ont des **places fixes** : une **écurie** en bois (`C.wood`, toit `C.roofGold` réduit à une planche) sur le flanc ouest de la tuile dorée, avec deux, trois, puis quatre stalles alignées (une par place de flotte, `fleet.cap`) ;
  - une mule à l'arrêt se tient dans sa stalle, tête vers la caméra ;
  - une stalle vide montre sa mangeoire. Cela remplace la pilule « 2/2 » du HUD : on compte les mules sur la tuile ;
  - un véhicule à l'arrêt dans une ville se tient sur le quai de la ville (R8), à côté des caisses.
- **Où** : `fleetSpots` (`logic.ts`) : la branche « orbite au sud » devient « stalle n » pour le fondaco et « quai » pour une ville. `fleet3d.tsx` ; l'écurie en pièce faite main dans `props3d.tsx`.

**R14. Plus de médaille : l'animal est le bouton, son chargement se voit sur son dos.** Effort **M**, impact **3**.
- **Problème** : D1.
- **Solution** :
  - **Retirer** les médailles HTML de `Fleet.tsx` (le disque, l'icône, les minuteurs « 30 s » de 10 px, `Fleet.tsx:301`).
  - **Toucher** : une zone de raycast invisible autour de chaque animal, d'au moins 44 px à l'écran. Rayon en unités = `max(2,2, 22 / pxParUnité)`, recalculé avec la caméra, comme les `Zones` des lieux.
  - **Sélection** : sous l'animal choisi, un anneau 3D au sol en lapis `#6EC8F5` (la couleur de la sélection, `design.md`), 3 unités de diamètre, épaisseur 0,25, qui tourne lentement.
  - **Chargement** : les deux caisses bâtées prennent la teinte de chaîne de ce qu'elles portent (« la charge d'une charrette prend la teinte de sa chaîne », `design.md`). Une mule vide n'a pas de caisses, seulement le bât (`C.wood`).
  - **Loin** (sous 6 px/unité, R9) : l'animal devient un **pion** : une petite tour de 2 unités, crème, coiffée de la teinte de sa charge, avec une ombre ronde. Le pion reste touchable.
  - **Arrivée** : les caisses quittent le dos et sautent sur le quai de la ville (0,5 s, en arc). Puis « +1 380 » en or monte du quai et une pièce part vers la bourse du HUD (le seul vol d'or de la séquence). Cela remplace le `hop-ring` et le `+n` de `Fleet.tsx:352-372`.
- **Où** : `Fleet.tsx` réduit à la logique (suivi, envoi) sans rendu en 3D ; `fleet3d.tsx` porte le visuel et le toucher.

**R15. La mule en route : la route parle, pas une pastille.** Effort **S**, impact **2**.
- **Problème** : `phone/3-mule.png`, la médaille et le pointillé lapis devant le fondaco.
- **Solution** :
  - pendant un trajet, la portion de route **déjà faite** reprend la terre battue normale ; la portion **à faire** est en pointillé `C.green` à 0,6 d'opacité (1,2 unité de trait, 0,8 de vide) ;
  - pas de minuteur sur la carte. Mule suivie (le suivi existant), une puce du HUD en haut au centre : « Vers Padoue · 4 min 12 », 14 px, une icône de mule, la croix pour arrêter le suivi. La puce reste à sa place et ne suit pas l'animal ;
  - la feuille du véhicule (`phone/3-mule.png`) se réduit à cette puce tant qu'on ne demande pas plus.

**R16. La feuille du véhicule, pour les cas avancés seulement.** Effort **M**, impact **1**.
- **Problème** : D3.
- **Solution** :
  - boutons-icônes avec **libellés** de 12 px sous chacun (« Charger », « Envoyer », « Modules ») ; six au plus, sinon on regroupe ;
  - les places de module verrouillées en **pièces visibles** : une rangée de 5 emplacements sur le bât, dessinés, avec un cadenas et « niv. 2 » en 12 px, au lieu de quatre lignes de texte (`parcours/17-en-route.png`).

### La vue du domaine (signalement 1, décision prise)

**R17. Composition de la vue du domaine.** Effort **L**, impact **3**.
- **Principe** : une scène 3D à part, montée dans le même `Canvas` (on cache `World` et on monte `Domain`), donc sans nouveau contexte WebGL.
- **Plateau** : une fleur hexagonale de tuiles **au même gabarit que la carte** (`TILE_R` = 9,07 : une seule échelle de tuiles dans tout le jeu, contrairement à C1).
  - Au centre, la **tuile dorée** du fondaco (R2), avec son hall, sa tour, son fanion, son écurie (R13) et son **magasin** visible (R18).
  - Anneau 1, 6 tuiles : les ateliers dans l'ordre de construction, en partant du nord-est et dans le sens horaire. La tuile **sud** (la plus proche de la caméra) est gardée pour la place libre suivante : « Bâtir ici » est toujours devant le pouce.
  - Anneau 2, 12 tuiles, au-delà de 6 ateliers (le plafond monte au-delà de 4 avec les niveaux de région, `venice1450.empire.ts:176`) : il n'apparaît que quand il sert.
  - Autour, la lagune et deux ou trois tuiles de décor de la région (forêt, champ), en `C.mist` et sans interaction, pour que le domaine ne flotte pas dans le vide.
- **Caméra** :
  - orthographique, même `TILT` (0,58) que la carte, pour garder la continuité ;
  - cadrage : l'anneau 1 tient dans **90 % de la largeur** sur téléphone (3 tuiles de 15,7 unités dans 351 px, soit environ 7,5 px par unité), le centre de la fleur à **42 %** de la hauteur (au-dessus de la feuille). Sur PC : la fleur dans 60 % de la hauteur, centrée ;
  - pan léger permis (±1 tuile), pincement de 0,8× à 1,6×. Pincer en dessous de 0,8× **ramène à la carte**.
- **Entrée** : toucher la tuile dorée sur la carte.
  - La caméra plonge vers elle en 0,45 s (ease-out ; on reprend l'`orbit-in` de la Lagune).
  - Les tuiles voisines de la carte s'enfoncent de 2 unités et s'effacent pendant que les tuiles du domaine **montent du sol** une à une (60 ms d'écart, ressort léger). C'est la `.star-enter` de la Lagune, en 3D.
- **Sortie** : chevron en haut à gauche (44 px), Échap, glisser vers le bas sur le plateau, ou pincer. Animation inverse en 0,2 s.
- **Une seule action en or**, en pilule de 56 px au bas de l'écran, contextuelle dans cet ordre :
  1. « Tout récolter » si un lot est prêt ;
  2. sinon « Tout relancer » si un atelier attend d'être lancé ;
  3. sinon rien en or (« Bâtir ici » vit sur la tuile libre, en fantôme : voir R18).
- **Où** : `map3d/Domain3D.tsx` (nouveau), `EmpireMap.tsx` (l'état `opened === "home"` bascule `mode: "domain"` au lieu de déployer l'orbite HTML). `Orbit.tsx` ne sert plus que sur la carte SVG de repli.

**R18. L'état de chaque atelier se voit en 3D.** Effort **M**, impact **3**.
- Chaque atelier sur sa tuile, avec son modèle (`workshopModel`, `Board3D.tsx:742`), porte son état ainsi :

  | État | Ce qu'on voit | Couleurs |
  | --- | --- | --- |
  | **Produit** | Le modèle s'anime : fumée (forge, four), roue ou scie qui tourne, ailes du moulin. Une **pile de marchandises** (sacs ou caisses teintés par leur chaîne) grandit sur le bord de la tuile, de 1 à 4 pièces selon l'avancement du lot. Un **arc au sol** autour de la tuile, de 1,5 unité de large, se remplit (le « temps se lit en arcs » de la Lagune). | pile en teinte de chaîne, arc lapis `#6EC8F5` |
  | **Prêt à récolter** | Pile complète ; l'arc devient **plein et vert d'eau** (`C.green`, `emissive` 0,3). Au-dessus, la `GoodsMark` du produit flotte à 6 unités et monte et descend de 0,4 unité (2 s). | `C.green #6EE0B8` |
  | **Attend sa matière** | Rien ne bouge, pas de fumée. Une `GoodsMark` **creuse crème** de la matière manquante flotte au-dessus (« attend bois »). Pas de rouge : ce n'est pas une alerte (`design.md`). | crème `C.wall` |
  | **À lancer** | Rien ne bouge, porte fermée ; un petit chevalet de bois vide devant la porte. | — |
  | **Chantier** | Échafaudage (4 poteaux `C.wood`) et caisses (`crate`, `crateB`, comme aujourd'hui), plus une grue de 7 unités dont le bras tourne pendant le chantier. Minuteur en HTML sous la tuile, 12 px. | `C.wood` |
  | **Place libre** | Tuile de verre au gabarit (R7), liseré pointillé `C.gold` à 0,7, un « + » en relief au centre (2 unités, crème). Au toucher : la feuille « Bâtir ici » avec les ateliers possibles en vignettes 3D. | `C.gold` (le liseré seulement) |

- **Le niveau d'un atelier** : le bâtiment **grandit** (×1,0 au niveau 1, ×1,08 au niveau 2, ×1,16 au niveau 3) et gagne une annexe au niveau 3 (un appentis), plus un fanion de 1 à 5 bandes sur son toit. Aucun « niv. 1 » écrit sur la scène : il passe dans la feuille de l'atelier.
- **Les noms** des ateliers : seulement à la sélection, et dans la feuille. Sur la scène, l'objet suffit (règle d'or 8). Pour l'accessibilité, chaque tuile a son repère HTML invisible avec `aria-label` (« Scierie, niveau 1, attend du bois »).
- **Le magasin du fondaco** : sur la tuile dorée, côté est, 3 à 6 piles de marchandises dont la hauteur suit le stock de chaque marchandise (jusqu'au plafond de la règle d'or 3 : la pile plafonne et se couvre d'une bâche crème quand c'est plein).

**R19. Récolter se voit et se sent.** Effort **S**, impact **2**.
- **Solution** : « Tout récolter » (ou un toucher sur un atelier prêt) déclenche une animation en trois temps.
  1. Les piles des ateliers s'envolent en arc vers le magasin du fondaco (0,6 s, 80 ms d'écart entre ateliers).
  2. Les piles du magasin montent.
  3. Un « +n » vert d'eau par marchandise s'affiche en 14 px pendant 1,2 s.
- Désactivé si l'appareil demande moins d'animation : les piles changent alors directement.

### Le HUD par-dessus la 3D

**R20. Un HUD réduit à deux coins et une barre.** Effort **M**, impact **3**.
- **Problème** : F1.
- **Solution** :
  - **Haut gauche** (inchangé) : le niveau de Casa dans son cercle d'or, le nom de la Maison, « 0 d par jour ».
  - **Haut droite** : **une seule bourse** (`.purse`, cuir bleu nuit surpiqué d'or) avec les ducats (or, Archivo 16 px). Faveurs et sceaux apparaissent dans la bourse **seulement s'ils sont non nuls** : une pièce de 20 px et son chiffre à côté des ducats, sur la même ligne. La pile de quatre pilules (environ 180 px de haut) devient une ligne de 44 px.
  - **Les véhicules** (« 2/2 ») : retirés du HUD, ils se voient dans l'écurie (R13).
  - **Le bouton Production** (« + » vert d'eau plein, `Hud.tsx:101`) : il devient un bouton fantôme (filet `line`, icône crème) dans la barre du bas, ou il disparaît au profit de la vue du domaine, qui est la production. **[Décision]**
  - **Bas** : la barre de Lorenzo (une ligne, un bouton) au-dessus de la barre à onglets, comme aujourd'hui. Son bouton n'est **en or que s'il n'y a pas d'autre or à l'écran** : une feuille ouverte avec « Livrer » en or fait passer le bouton de Lorenzo en fantôme. Une seule action en or, toujours.
  - **Marges de sûreté pour la caméra** : `centredOn` et le cadrage de départ décalent le centre utile de la carte (haut 72 px, bas 160 px), pour que le fondaco ne passe jamais sous la bourse ni sous la barre.

**R21. « Un atelier attend » montre l'atelier.** Effort **S**, impact **2**.
- **Problème** : F2.
- **Solution** :
  - sur la carte, quand un atelier attend ou qu'un lot est prêt, la tuile dorée du fondaco porte un **signal 3D** : une `GoodsMark` qui flotte au-dessus du hall (prêt : pleine, vert d'eau ; attend : creuse, crème), 5 unités au-dessus du toit ;
  - toucher Lorenzo ou ce signal ouvre la vue du domaine, la caméra cadrée sur l'atelier concerné, son anneau de sélection lapis allumé ;
  - c'est le « signal d'action » prévu au § 7 de `plateau-reprise.md` (« pastille lots prêts, caisse dorée »), posé dans la scène.

### Lumière, ombres, finition

**R22. La lumière du soir : plus de modelé, sans perdre la palette.** Effort **S**, impact **2**.
- **Problème** : G1.
- **Solution** :
  - directionnelle `#FFF3DD` de 2,4 à **2,1**, et abaissée pour des ombres plus longues : `position [cx − 70, 95, cz − 60]` au lieu de 120 de haut ;
  - hémisphère de 1,15 à **1,0**, sol `#B89A62` vers `#9A7F55` (le dessous des volumes plus chaud, moins blanc) ;
  - une lumière ponctuelle chaude `#FFD27A`, intensité 0,6, portée 30 unités, à 8 unités au-dessus du fondaco : une **lanterne** qui fait du fondaco le point chaud de la nuit (coût : un seul `PointLight` sans ombre) ;
  - les joints entre tuiles de 0,45 à **0,6 unité**, pour que la grille des petites tuiles se lise au zoom de départ ;
  - à valider aux trois captures de référence (`1-depart`, `3-mule`, `4-dezoom`) avec et sans `fx=0`.

**R23. Les monuments : une silhouette par grande ville.** Effort **M** (par lot de 4), impact **2**.
- **Solution** : un monument fait main par ville de taille 3 et plus, chacun avec une silhouette reconnaissable en 40 px de haut, dans les tons `C.wall`, `C.brick`, `C.roof` :
  - Milan : le Duomo à flèches, 4 aiguilles ;
  - Florence : la coupole ocre `C.brick` et le campanile ;
  - Vérone : les arènes, un anneau de 10 × 3 unités ;
  - Gênes : la Lanterna, une tour fine de 14 unités ;
  - Constantinople : Sainte-Sophie, coupole et 4 minarets ;
  - Brescia, Mantoue : un château à merlons.
- Les bourgs (taille 1-2) gardent l'église KayKit. Venise reçoit en plus le palais des Doges, un bloc rose `#F09CC4` atténué à 40 % vers `C.wall`, au bord de l'eau à côté du campanile. Cela touche au rose de Murano de la verrerie, donc il faut un test ΔE.
- **Où** : `props3d.tsx`, `MONUMENTS` dans `scene.ts:142`.

**R24. Les deux champs identiques du départ, et la variété.** Effort **S**, impact **1**.
- **Problème** : `phone/1-depart.png`, deux fermes au même modèle, à la même orientation.
- **Solution** : jamais deux tuiles voisines du même thème avec la même variante (règle à ajouter au tirage de `scene.ts`, testable). Les champs alternent dalles de brique et blé (le `grain` KayKit). Les plaines reçoivent un troupeau de 3 moutons au repos (1,2 unité chacun, `C.wall`, sans squelette, en instances), ce qui donne de la vie sans coûter d'animation.

**R25. Le toucher sur PC.** Effort **S**, impact **2**.
- **Problème** : D2, le glisser échoue sur PC.
- **Solution** : avec R11 (Livrer depuis la ville), le glisser n'est plus nécessaire. Sur PC, on ajoute :
  - le survol d'une ville : son liseré s'éclaire en `C.mist` à 0,6 et un cartouche montre « 1 commande · livrable » (12 px) ;
  - le survol d'un animal : son anneau lapis à 50 %.
  - Le glisser peut rester comme geste d'expert, sans être le seul chemin.

**R26. Le texte de la carte à 12 px minimum, partout.** Effort **S**, impact **2**.
- **Problème** : B3.
- **Solution** :
  - passer en revue les 15 occurrences sous `map/` et `Orbit.tsx` : `text-[0.625rem]` et `text-[0.6rem]` passent à `text-xs` (12 px), et `.map-name` à 0,75 rem ;
  - le facteur de grossissement `--chartk` plafonné à 1,5 (déjà le cas) ;
  - ajouter un test (comme `theme.test.ts`) qui refuse une classe `text-[0.5…]` ou `text-[0.6…]` dans `src/empire/map/`.

---

## 3. Questions au porteur

1. **Le secteur de départ** (R1) : accepte-t-il le « triangle » (Venise nord-est, Padoue ouest, fondaco sud-est, campo au centre), qui déplace Padoue dans son secteur ? Ou préfère-t-il que le fondaco parte dans un secteur voisin, qui serait révélé et donné au départ ?
2. **La lagune au départ** (R3) : peut-on révéler les secteurs de mer voisins de Venise dès la fondation ? Ils ne s'achètent pas et n'apportent rien au jeu, seulement le décor.
3. **Les nouvelles nuances de palette** : accepte-t-il d'ajouter à `C` trois tons dérivés, `goldSide #C9962E`, `pave #EAD7A4` et la forêt assombrie `#D6B670` (R2, R5), et une lanterne chaude `#FFD27A` (R22) ?
4. **Une ville pleine s'allume en or** (R8) : c'est un appel à l'action, donc conforme à « l'or pour l'action », mais c'est un or qui n'est pas « à vous ». Le valide-t-il, ou préfère-t-il le vert d'eau (« prêt ») pour une ville pleine et l'or seulement pour une ville **livrable** ?
5. **« Livrer » automatique** (R11) : quand deux commandes sont couvertes, le jeu prend-il la mieux payée, ou la plus proche ? Faut-il proposer « Livrer les deux » quand deux mules sont libres ?
6. **L'écurie** (R13) : les mules au repos dans des stalles fixes sur la tuile dorée lui conviennent-elles ? Cela retire « 2/2 » du HUD.
7. **Le bouton Production** (« + » vert d'eau) : le retire-t-on au profit de la vue du domaine, ou devient-il un bouton fantôme de la barre ?
8. **L'échelle** (R4) : accepte-t-il un fondaco plus petit (5,8 au lieu de 7,6) et des villes plus grandes (jusqu'à 10 maisons pour Venise) ? Le fondaco reste distinct par sa tuile d'or, sa lanterne et son écurie, plus par sa taille.
9. **La vue du domaine** (R17) : est-ce une scène à part entière, avec la lagune et un décor muet autour (proposé), ou un fond nuit nu ? Pincer pour revenir à la carte lui convient-il, en plus du chevron ?
10. **Les monuments** (R23) : quelles villes en priorité après Venise et Padoue (proposé : Milan, Florence, Vérone, Constantinople) ?

---

## Résumé en dix lignes

1. Le fondaco sur la seule **tuile d'or** (`#F2C24F`, socle relevé de +1,2 et flanc `#C9962E`, quai crème), dans un **secteur en triangle** où Venise, Padoue et lui ne se touchent jamais, autour d'un campo central (R1, R2).
2. **Venise sur sa lagune** dès le premier écran, en révélant la mer voisine (R3) ; un **barème d'échelles** : mule 2,4, maison 3 à 3,6, fondaco 5,8, monuments de 8 à 17 (R4).
3. Les **villes parlent par le décor** : un quai avec une caisse par commande teintée par sa chaîne, pleine si le stock couvre et creuse sinon ; un fanion qui monte ; le liseré de la tuile qui s'allume en or quand la ville est pleine. Plus d'anneau HTML (R8), et des colonnes de lumière de loin (R9).
4. **« Livrer » depuis la feuille de la ville** : une carte par commande avec sa barre de stock, un seul bouton d'or ; le jeu choisit la mule, charge et envoie, et la route s'éclaire avant le départ (R11, R12).
5. **Plus de médailles** : l'animal est le bouton (zone de 44 px, anneau lapis au sol), sa charge se voit sur son dos, un pion de loin (R14).
6. **Une écurie** sur la tuile dorée pour les mules au repos, qui remplace « 2/2 » et l'orbite (R13) ; la route restante en pointillé vert d'eau, la durée dans une puce fixe du HUD (R15).
7. **Vue du domaine** : une fleur de tuiles au même gabarit que la carte, le fondaco au centre, les ateliers sur l'anneau 1, « Bâtir ici » toujours devant ; caméra au même TILT, entrée en plongée de 0,45 s (R17).
8. **L'état de chaque atelier en 3D** : il s'anime et sa pile grandit pendant la production ; arc vert d'eau et marque flottante quand il est prêt ; marque creuse crème quand il attend sa matière ; grue pendant le chantier. Aucun texte sur la scène (R18, R19).
9. **L'or sobre** : un seul contour par secteur à acheter, seulement les voisins ; un verre plus léger qui s'efface dans le brouillard ; une seule action en or par écran, HUD compris (R6, R7, R20).
10. **Finition** : bourse unique en haut à droite, noms à 12 px minimum qui ne se chevauchent plus, une lanterne chaude sur le fondaco et des ombres plus longues, des monuments par grande ville (R10, R22, R23, R26).
