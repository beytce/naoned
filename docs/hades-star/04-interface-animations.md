# Hades' Star : l'interface, la caméra, les gestes et les animations

*Recherche du 1er novembre 2026, à la demande du porteur. On s'inspire des façons d'interagir de Hades' Star (Parallel Space), jamais de son apparence : ni ses images, ni ses icônes, ni ses noms, ni ses textes. La direction artistique reste « Lagune » (`docs/design.md`). Voir aussi `docs/hades-star-livraisons.md`.*

**Statut des affirmations.** Chaque point porte sa provenance :
- **[E]** : vu sur les enregistrements d'écran du porteur ;
- **[S]** : écrit dans une source (notes de version du blog officiel, wiki, fils Steam), citée en § 9 ;
- **[D]** : déduit ou estimé (à vérifier image par image sur un enregistrement).

**Réseau.** Depuis la session, seule la recherche web répondait : les pages elles-mêmes (blog officiel, wiki fandom, Steam, YouTube, TV Tropes, NamuWiki) étaient bloquées. Les faits [S] viennent des extraits renvoyés par la recherche, pas d'une lecture complète. Aucune vidéo, aucun chapitrage ni aucune transcription n'a pu être lu.

---

## 1. La caméra et le zoom

### Une seule scène, un zoom continu
- **Une scène unique** : le jeu charge toujours la scène d'un système stellaire, avec un zoom continu, d'une planète seule jusqu'à l'étoile entière. Tout le jeu s'y passe ; aucun écran intermédiaire. Le seul écran de chargement est le passage d'une étoile à une autre, visé à moins de 3 s [S, « Our design philosophy », 2016].
- **La lisibilité d'abord** : une interface lisible, propre et utilisable est « une des premières priorités », et un combat permanent, vu la petite taille des écrans de téléphone [S, même billet].

### La carte
- **Les secteurs** sont des hexagones ; ce qui n'est pas exploré reste noir [E].
- **On ouvre un secteur** avec un scanner (une station), en payant pour un secteur voisin ; un scanner ne révèle que les secteurs adjacents [S, guides et wiki]. Aucune source ne décrit l'animation de révélation [D : probablement un fondu].

### Pincer et défiler
- **Le pincement** zoome autour du point entre les deux doigts. En 2018, un correctif a rétabli ce comportement : une régression zoomait sur le centre de l'écran [S, 2018.2]. C'est donc un comportement voulu et tenu.
- **Le défilement** suit le doigt. Le comportement au lâcher n'est documenté nulle part [D : un léger élan, sans rebond marqué ; à vérifier].
- **Les bornes** : on ne peut pas dézoomer au-delà du système entier, ni zoomer plus près qu'une planète en gros plan [E, S « de la planète à l'étoile entière »]. Le rapport exact entre les deux n'est pas publié [D : de l'ordre de ×8 à ×12].

### Le double toucher
- **Sur le vide**, il zoome ou dézoome selon le niveau de zoom du moment [S, Alpha Update #3, 2017] : un interrupteur entre « près » et « loin », pas un zoom par paliers.

### Le centrage sur la sélection
- **Les flèches suivant / précédent** du panneau de sélection centrent la caméra sur l'objet choisi [S, 2017.6, correctif « Camera centering now works correctly »]. Elles parcourent d'abord les vaisseaux garés sur une même planète [S, Alpha #3], puis les vaisseaux du même type partout sur la carte [S, 2017.3].
- **Toucher simplement un objet ne recentre pas la caméra** [E : le vaisseau touché reste où il est à l'écran].

### Taille des objets selon le zoom
- **Planètes et vaisseaux grandissent et rapetissent avec la carte** [E].
- **Mais les icônes de vaisseaux sont plafonnées** : au zoom maximal, elles sont plus petites pour qu'on voie le détail d'un combat agité [S, 2017.2].
- **Les vaisseaux groupés** s'écartent visuellement aux zooms rapprochés [S, Alpha #3]. Depuis Dark Nebula (2023), leurs contours sont mieux dessinés pour les distinguer quand ils se chevauchent, et chacun a un centre marqué (un point sombre) [S, « Visual improvements in DARK NEBULA »].
- **Les limites de secteur** sont plus visibles aux zooms rapprochés [S, Alpha #3].
- **Les scanners** se reconnaissent à leur couleur à tous les niveaux de zoom [S, 2023].

En somme, Hades' Star n'a pas des marques de taille fixe à l'écran : les objets suivent la carte, avec des **corrections aux extrêmes** (plafond, écartement, couleur).

### Le choix au toucher selon le zoom
- **De loin**, un toucher prend toujours le vaisseau plutôt que l'astéroïde dessous [S, 2018.6, « Tweaked selection to make it less likely to select undesirable objects »].
- **Le défaut reconnu** : il est trop facile de choisir le mauvais vaisseau ou la mauvaise destination en zoomant ou en bougeant la carte [S, Game Solver, via la recherche]. Le développeur a corrigé la priorité du toucher plutôt que d'ajouter une confirmation.

### Partager la vue
- **Dans l'alpha**, un bouton « Partager » du chat de corporation envoyait la vue de la caméra du moment aux autres membres [S, Alpha #2]. L'idée est notable : **une vue de carte est un objet qu'on peut envoyer**.

---

## 2. La sélection, le panneau du bas, les gestes

### Toucher un vaisseau
- **Le vaisseau s'éclaire** : un contour lumineux [E]. L'effet de sélection a été ajouté dans l'alpha pour qu'on voie clairement l'objet choisi [S, Alpha #4].
- **Un grand cercle pâle** l'entoure [E]. C'est la portée (de son arme, de son module ou de sa vision selon le vaisseau) [D].
- **Un petit chevron** se tient au-dessus du vaisseau choisi [E].
- **Le panneau du bas** monte [E] : le type de vaisseau, sa soute (0/2) ou ses points de vie, « stationné à X », trois boutons (inspecter, déplacer, une troisième action), les flèches < > pour passer d'un vaisseau à l'autre, et × pour fermer.

### L'histoire du panneau, qui montre ce que le développeur a appris
1. **Alpha #1 (2016)** : les boutons de modules sont dans une barre d'information de sélection, qu'on fait entrer par une flèche à sa droite. Un geste de trop [S].
2. **Alpha #3 (2017)** : des boutons radiaux autour du vaisseau choisi, plus suivant / précédent [S].
3. **Alpha #4 (2017)** : les actions descendent au bas de l'écran ; toucher le vide désélectionne de façon plus fiable [S].
4. **2019** : une barre d'actions de confirmation sur toute la largeur. Des joueurs s'en plaignent, parce qu'elle **bloque les touchers vers la carte en dessous** : un objet caché derrière elle devient intouchable sans bouger la caméra [S, fil Steam « Issues with the UI update »].

**La leçon** : le panneau du bas l'emporte sur le radial, mais il ne doit pas manger la carte. Il faut soit le garder bas, soit laisser passer les touchers hors de ses boutons.

### Désélectionner
- **Toucher le vide** désélectionne [S, Alpha #4].
- **Sur PC**, Échap ferme les onglets, sinon ouvre les réglages, et annule un déplacement [S, liste de raccourcis 2019].

### Les cargaisons à la sélection
- **Avec le module « Shipment Computer »**, choisir un vaisseau ou un avant-poste qui porte des cargaisons fait **luire leurs destinations**, chacune avec un chiffre : le nombre de cargaisons qui y vont [S, 2018.2].
- **Les pastilles de cargaison** posées sur un transport ont été corrigées pour ne plus se poser par-dessus les vaisseaux voisins [S, 2018.6].

C'est le patron le plus utile pour Fondaco : **sélectionner, c'est allumer les destinations avec leur compte**.

### Pas de sélection multiple
- **Le cadre de sélection** (rectangle) a été retiré, d'après le développeur cité sur Steam : avec les règles de déplacement, c'était trop confus, certains vaisseaux choisis étant en route et d'autres non [S]. On commande un vaisseau à la fois.

### Toucher une planète [E en partie, D pour le reste]
- **Un panneau du bas** du même gabarit : le nom, le niveau, les cargaisons groupées par destination, « Améliorer » et « Info ».
- **L'amélioration d'une planète** au début du jeu ne dure que quelques secondes [S, TalkAndroid : « about three seconds »]. Elle se lit sur une barre de temps [D].
- **Depuis Dark Nebula**, la fiche de l'étoile jaune a une **liste des planètes** avec leurs niveaux, pour voir laquelle améliorer ensuite [S, changelog Dark Nebula].
- **Depuis 2023**, une **liste des vaisseaux** est accessible en mode portrait sur mobile ; en 2019, elle ne l'était qu'en paysage [S, 2019.2 et changelog Dark Nebula].

---

## 3. Le déplacement, pas à pas

| # | Étape | Ce qu'on voit | Durée | Prov. |
| --- | --- | --- | --- | --- |
| 1 | Toucher le vaisseau | Contour lumineux, cercle de portée, chevron, le panneau monte | Panneau : ≈ 0,2 à 0,3 s | E ; durée D |
| 2 | Glisser depuis le vaisseau | Une ligne pointillée suit le doigt, du vaisseau au doigt | Immédiat, une image | E |
| 3 | Survoler une cible | La cible prend un contour d'hexagone doré et des chevrons aux coins ; une bulle sombre affiche « Aller à X », le temps (« 6 s »), la distance (« 215 UA ») et le coût en hydrogène | Accroche immédiate | E ; S (le wiki : distance, temps et hydrogène s'affichent à la destination) |
| 4 | Revenir sur le vaisseau | La bulle dit « Annuler » | — | E |
| 5 | Lâcher | Une barre de départ décompte, avec ✓ (partir tout de suite) et ✕ (annuler) | **10 s** | E ; S (wiki : 10 s pendant lesquelles on peut partir, annuler ou ajouter une étape) |
| 6 | Pendant ce délai | On peut ajouter des étapes ; le bouton d'annulation dit combien d'hydrogène sera rendu ; le bouton de départ immédiat n'affiche plus de coût | jusqu'à 10 s | S (2017.5, 2018.2) |
| 7 | Départ | Le vaisseau pivote vers son cap, puis glisse le long du pointillé, le temps restant écrit au milieu du trajet | Pivot ≈ 0,2 à 0,4 s | E ; durée D |
| 8 | En route | Une barre du temps restant ; **on ne peut plus arrêter** (sauf certains modules) | Selon la distance | E ; S (TV Tropes) |
| 9 | Arrivée | Le vaisseau se gare en orbite à côté de la planète ; les cargaisons sont livrées ou chargées | — | E ; D |

### Pourquoi ce délai de 10 s
- **Contre les erreurs** : un déplacement commencé ne s'arrête pas, alors chaque ordre est précédé d'un bref temps d'armement, pendant lequel on peut l'annuler, pour éviter les fausses manœuvres désastreuses [S, TV Tropes].
- **Le paiement** : la note 2017.5 a retiré le coût en hydrogène du bouton « Partir maintenant », pour lever le doute sur le moment où l'on paie [S]. On paie au lâcher, et on est remboursé si on annule.

### Les étapes (waypoints)
- **Jusqu'à 15 étapes** ; elles étaient 8 avant 2017.3 [S].
- **Annuler retire seulement la dernière étape**, plus toutes depuis 2018.2 [S].
- **Dans les étoiles rouges**, on peut mettre en file le déplacement d'un transport ou d'un mineur : il part de lui-même une fois son chargement ou son minage fini [S, wiki].

### La vitesse à l'écran
- **Les vitesses** se comptent en « UA », une unité arbitraire selon le wiki.
- **Les valeurs** ont changé d'une version à l'autre [S] :
  - wiki actuel : environ 60 UA/s pour un transport dans une étoile jaune, 120 pour un mineur, 66 pour un cuirassé ; environ 19 à 25 dans les amas rouges et bleus ;
  - ancien wiki : par minute.
- **Sur l'enregistrement** : « 6 s pour 215 UA », soit environ 36 UA/s [E], cohérent avec un transport pas encore amélioré.
- **Un secteur** mesure environ 433 UA d'un milieu de côté à l'autre, et 500 UA d'un coin au coin opposé [S, blog de fan, 2019].
- **Les durées réelles** : un trajet dans le système dure de quelques secondes à quelques minutes ; TV Tropes note qu'on traverse le système d'un bout à l'autre en « une poignée de minutes » [S].
- **Le mouvement est linéaire** à vitesse constante, sans accélération visible au départ ni à l'arrivée [D, d'après E].

---

## 4. Les animations et les effets, un par un

| Effet | Ce qu'on sait | Prov. |
| --- | --- | --- |
| Sélection | Contour lumineux et chevron au-dessus ; le grand cercle pâle de portée | E, S (Alpha #4) |
| Accroche d'une cible | Hexagone doré et chevrons aux coins, qui se resserrent sur la cible [D] | E |
| Ligne de trajet | Pointillé. Pendant le trajet, le pointillé reste visible devant le vaisseau, avec le temps au milieu. Probablement sans défilement des tirets [D] | E |
| Pivot | Le vaisseau tourne vers son cap avant ou au début du départ | E |
| Destinations des cargaisons | Elles luisent, avec un chiffre par destination | S (2018.2) |
| Téléportation | Les modules de téléportation laissent une traînée derrière le vaisseau, pour montrer d'où il vient | S (2019.3) |
| Saut entre étoiles | Par une porte de saut ou un relais (« warp lane ») ; écran de chargement de moins de 3 s ; un défaut d'affichage des trajets par relais a été corrigé | S (2016, 2018.3) |
| Explosion de planète | Effet ajouté en 2017.4 (la supernova d'une étoile rouge) | S |
| Modules | Depuis Dark Nebula (octobre 2023), beaucoup de modules ont de nouveaux effets visuels et, pour la première fois, des sons, pour mieux montrer la cause et l'effet | S |
| Stations | Depuis 2023, plus d'icônes : une représentation détaillée qui montre leur fonction | S |
| Fenêtres | Depuis 2023, beaucoup de fenêtres montrent l'objet en 3D, pour relier l'interface à l'objet du jeu | S |
| Étoile jaune | Plus lumineuse depuis 2023 : plus reposante en longue partie, et lisible au soleil sur téléphone | S |
| Minage | Un trait du mineur vers l'astéroïde pendant le minage ; l'hydrogène monte [D, souvenir de vidéos, non retrouvé dans une source lisible] | D |
| Combat | Le laser est un rayon continu dont les dégâts montent tant qu'il reste accroché ; la batterie tire par impulsions ; un bouclier entoure le cuirassé ; les vaisseaux détruits explosent en éclats [mécanique S, rendu D] | S/D |
| Amélioration, construction | Une barre ou un anneau de temps sur l'objet ; « prêt » se signale sur l'objet [D] | D |
| Notifications | Notifications poussées, sur abonnement (recherche d'étoile rouge, message de corporation) ; sur Steam, seulement pendant le jeu. Dans l'alpha, une notification reçue en jeu s'affichait en jaune | S (2019.2, alpha) |

**Les sons** : avant Dark Nebula, les modules n'avaient pas de son. Une refonte du son est venue en 2023 [S]. Aucune source lisible ne décrit les sons de l'interface (toucher, départ, arrivée) [D].

---

## 5. Le HUD

### En haut [E]
- **À gauche** : un badge de niveau du joueur, son nom, le nom de l'étoile.
- **À droite** : les ressources avec leur icône (crédits, hydrogène, cristaux, places de vaisseaux 7/7), et un bouton +.

### En bas [E]
- **Une barre de 5 boutons ronds.**
- **Une barre d'actions** pour la vue du système et les signaux (« ping »), mal accueillie en 2019 quand elle couvrait toute la largeur [S].

### Ailleurs
- **Des accès directs aux autres étoiles** (étoiles rouges, étoiles blanches) se rangent en haut à gauche, à côté de l'étoile de départ [S, même fil].
- **La taille de l'interface** se règle dans les options. Un joueur jugeait néanmoins l'écriture difficile à lire (police, espacement) [S, fil Steam].
- **Les fenêtres** (classements, corporation, modules) prennent toute la hauteur disponible sur les téléphones allongés [S, 2018.1, 2018.5].
- **Les accélérations** : les cristaux servent à accélérer la recherche et la construction [S]. Les guides conseillent d'ignorer les invitations du tutoriel à les dépenser [S, Prima]. Un joueur s'en sert pour finir ce qui reste à moins d'une heure [S]. *Pour Fondaco, sans objet : on ne vend jamais de temps (CLAUDE.md).*

---

## 6. PC et mobile

### Mobile
- **Le portrait par défaut.**
- **Le paysage** est arrivé en 2018, expérimental, recommandé pour les tablettes, et absent sur iPhone. Le passer réinitialise la gestion de l'encoche sur Android [S, 2018.5, 2.564.3].
- **Les gestes** : toucher, glisser, pincer, double toucher sur le vide.

### PC (Steam), d'après une liste de raccourcis de 2019 venue du Discord officiel [S]
- **La souris** :
  - clic droit, vaisseau choisi : déplacer ou confirmer le déplacement ;
  - la molette zoome [D : non trouvé écrit, mais attendu].
- **La caméra** : pavé numérique, flèches, ou souris au bord de l'écran (en plein écran seulement).
- **Les vaisseaux** :
  - Ctrl + chiffre : lie un vaisseau à ce chiffre, rappelé par le chiffre (1 à 0, pas réattribuables) ;
  - virgule / point : sélection précédente / suivante. Des joueurs demandent les boutons latéraux de la souris à la place ;
  - Espace : la liste des vaisseaux.
- **Les commandes** :
  - F1 : la fiche du vaisseau, de la planète ou de l'ennemi choisi ;
  - F3 ou Échap : annuler le déplacement ;
  - F4 : la liste des cargaisons, le saut vers une autre étoile ou le retour, déplacer une station.
- **Les écrans** :
  - H : revenir à son système ;
  - I : la fiche de l'étoile ;
  - L : le classement ;
  - T : les modules ;
  - Y : l'empire ;
  - M : le courrier ;
  - A : la boutique.
- **Tilde maintenu** : un aperçu des noms et des modules des vaisseaux sur toute l'étoile. C'est un « calque d'information » temporaire, très utile.
- **PCGamingWiki** mentionne un réglage d'inversion de l'axe Y de la souris [S].

### Accessibilité
- **Ce qui existe** : la taille de l'interface, et une luminosité relevée pour l'usage en extérieur [S].
- **Ce qu'aucune source ne mentionne** : un mode daltonien, la réduction des animations, ou des lecteurs d'écran.
- **Le jeu compte sur la forme et la couleur** pour distinguer les objets (les scanners par leur couleur) [S].

---

## 7. Incertitudes

1. **Les durées** : aucune source lisible ne donne les durées de l'interface (montée du panneau, pivot, fondus). Elles sont estimées (§ 3, colonne « Durée »). Il faudrait mesurer image par image sur les enregistrements du porteur (60 i/s : compter les images entre le toucher et le panneau à l'arrêt).
2. **L'élan du défilement** et l'existence d'un rebond aux bornes : non vérifiés.
3. **Les rendus de combat, de minage et de saut** : décrits de mémoire de vidéos, non retrouvés dans une source lisible.
4. **Les raccourcis PC** datent de 2019 et ont pu changer depuis (Dark Nebula, 2023 ; Quantum Stars, 2026.1).
5. **Le délai de 10 s** est confirmé par le wiki et l'enregistrement, mais il varie peut-être selon le mode (étoile rouge, étoile blanche).
6. **Le contenu du panneau d'une planète** est en partie déduit.
7. **Les extraits de recherche** reformulent parfois les sources : les citations exactes sont à revérifier quand le réseau le permettra (le blog, le wiki et Steam sont à autoriser dans les réglages réseau de la session).

---

## 8. Transposition pour Fondaco

*Repère : `apps/web/src/empire/map/`. Le moteur reste la source de vérité ; ce qui suit ne concerne que l'écran. Tout suit la direction Lagune : un lieu est un astre, une seule action en or, le temps en arcs, les marchandises par leur `GoodsMark`, aucun coin coupé.*

### 8.1 La caméra (`useCamera.ts`, déjà en place)
Elle fait déjà l'essentiel : un doigt qui déplace avec un élan (frottement 0,92 par image), le pincement autour du point entre les doigts, la molette (`exp(-deltaY·0,0015)`), le double toucher, `easeTo` à 450 ms, une seule peinture par image dans un `ref`. À ajouter, dans l'ordre :

1. **Le double toucher en interrupteur près / loin**, comme Hades' Star, centré sur le point touché (pas sur le centre de l'écran).
   - Si `detailOf(s) === "far"`, aller à `nearScale` centré sur le point ; sinon revenir à `coverScale`.
   - Avec `easeTo(…, 450)` et la courbe `--ease-out`.
   - Aujourd'hui `onDoubleTap` ne reçoit pas le point : passer `local(e)`.
2. **Le centrage seulement sur demande** : un toucher ne bouge pas la caméra ; les flèches < > du panneau recentrent (`easeTo(centredOn(at, s, view), 450)`) sans changer l'échelle si le lieu est déjà à l'écran.
3. **Un léger rebond aux bornes**, à valider : aujourd'hui `coverClamp` bloque net. Une résistance de 0,35 au-delà de la borne pendant le geste, puis `easeTo(coverClamp(cam), 260)` au lâcher, donne la sensation d'une carte posée sur l'eau. C'est facultatif.
4. **Sur PC** :
   - les flèches et ZQSD/WASD déplacent de 12 % de l'écran par appui (`easeTo`, 160 ms) ;
   - `+` et `-` zooment par ×1,4 autour du centre ;
   - le défilement au bord de l'écran est à proscrire dans un navigateur.

### 8.2 Les marques : constantes ou à l'échelle
**Aujourd'hui**, les lieux (couche `pins`) gardent leur taille à l'écran et seule la carte s'agrandit. Hades' Star fait l'inverse, avec des corrections aux extrêmes. **Recommandation hybride** :
- **Un facteur de taille** : `k = clamp(s / sRef, 0,6, 1,4)`, appliqué en CSS (`--pin-k`) sur `.map-pin`, mis à jour dans `onPaint` sans rendu React.
  - Les lieux suivent alors le zoom, sans jamais devenir illisibles de loin ni envahissants de près.
  - `sRef` est l'échelle du premier affichage.
- **Les cibles tactiles ne descendent jamais sous 44 px** : la zone de toucher reste à `max(44px, taille dessinée)`, avec un `::before` transparent.
- **Les noms en Cinzel se masquent en vue lointaine** (`detailOf === "far"`), sauf la capitale et les villes qui ont des commandes. Ils réapparaissent en fondu de 160 ms.
- **Les véhicules groupés autour d'un comptoir s'écartent** quand on zoome (l'arc existant `-60° + i·30°` avec un rayon `r·k`), et se resserrent en pastille « +n » au-delà de 8 ou en vue lointaine. C'est l'équivalent du « clumped ships separated ».
- **De loin, le toucher prend d'abord le véhicule, puis la ville, puis la case** (priorité de 2018.6). Concrètement :
  - en vue lointaine, élargir la zone de toucher des véhicules ;
  - ou faire un test de proximité dans `up` de `useCamera` : le lieu le plus proche à moins de 28 px gagne.

### 8.3 La sélection et le panneau du bas
- **Le véhicule choisi** :
  - un anneau or de 2 px (déjà là, `ring-gold`) ;
  - un **halo lapis pâle** pulsé (`marker-halo`, 2,2 s) ;
  - un **petit chevron** au-dessus, de taille fixe à l'écran.
- **Le cercle de portée** : au lieu d'un grand cercle uniforme, éclairer les villes à portée (déjà `lit`), plus un cercle SVG en pointillé crème très pâle (`stroke-opacity: .25`, `vector-effect: non-scaling-stroke`) au rayon de la tournée maximale.
- **Les commandes lisibles depuis la sélection** : le patron « Shipment Computer » (§ 2) s'applique tel quel. Choisir un véhicule chargé allume ses villes de destination avec une pastille du nombre de commandes qu'il porte pour chacune (puce `.slab`, chiffres en Archivo).
- **Le panneau du bas** (`BottomSlot`, `slot-in` 260 ms `--ease-out`, `slot-out` 160 ms `--ease-in`, déjà conformes) :
  - en tête, la marque, le nom, la soute en arc (pas « 0/2 » en texte), « au comptoir de X » ;
  - une seule action en or, « Partir » ou « Charger » selon l'état, et les autres en fantôme ;
  - les flèches < > pour passer au véhicule suivant (et sur PC `,` / `.`), et × pour fermer ; on ferme aussi par Échap, en glissant vers le bas ou en touchant la mer.
- **Ne pas reproduire l'erreur de 2019** : le panneau ne dépasse pas 40 % de la hauteur, et son conteneur garde `pointer-events: none` hors de la carte arrondie. Quand le lieu choisi tomberait sous le panneau, un `easeTo` le remonte dans la partie visible (centrer sur `h·0,35`).

### 8.4 Le geste « glisser un véhicule vers une ville », pas à pas
`dragVehicle` existe déjà, mais sans retour pendant le geste. À construire, dans `EmpireMap.tsx`, une couche SVG `data-drag` dans le repère de l'écran :

1. **Au toucher** (pointerdown sur un véhicule) : la sélection immédiate, retour au doigt de 90 ms (`--t-tap`, `active:scale-95`).
2. **Au-delà de 8 px** :
   - une **ligne pointillée** part du véhicule vers le doigt : `stroke-dasharray: 2 6`, extrémités arrondies, crème à 70 %, épaisseur fixe à l'écran ;
   - les tirets défilent doucement vers le doigt (`orbit-flow`, déjà défini), ce qui dit « ça va par là » ;
   - la caméra ne bouge pas pendant ce geste.
3. **L'accroche** : quand le doigt passe à moins de 36 px d'une ville à portée, la ligne **s'aimante** sur son centre.
   - La ville prend un **anneau or** qui se resserre, de 1,25 à 1 en 160 ms `--spring`. Ce sont **quatre arcs** (rond Lagune), pas des chevrons d'hexagone.
   - Une **bulle sombre arrondie** (`.cut`) au-dessus de la ville indique : son nom en Cinzel, la durée de l'aller (« 3 min »), ses commandes que la soute peut remplir (les `GoodsMark`), et la paie estimée en ducats.
   - Ces chiffres viennent du moteur (`orders.ts`) par un sélecteur pur de `logic.ts`, testé.
   - Une ville hors de portée reste en lapis, et sa bulle dit « Hors de portée ».
4. **Le retour** : revenir à moins de 24 px du véhicule fait dire « Annuler » à la bulle, et la ligne se rétracte (`stroke-dashoffset`, 160 ms `--ease-in`).
5. **Au lâcher sur une ville** : ouvrir la tournée sur cette ville (le comportement actuel). Le panneau monte avec « Partir » en or.
6. **Le délai de départ**, à arbitrer par le porteur. Hades' Star arme 10 s parce qu'un ordre est irréversible.
   - Chez nous, une tournée part sur « Partir » ; un délai n'est utile que si elle devient irréversible.
   - Proposition : **3 s d'armement**, un arc or qui se vide autour du véhicule, et la pilule « Partir » qui devient « Annuler ». Aucune ressource n'est engagée avant la fin du délai.
   - Sinon, s'en tenir à l'action explicite « Partir ».
7. **Le départ** :
   - le jeton pivote vers la première ville (rotation de l'icône, 220 ms `--ease-out`), puis glisse ;
   - le pointillé reste devant le jeton jusqu'à chaque étape, avec **le temps restant au milieu du segment** (Archivo, petite puce sur la nuit) ;
   - une étape passée s'efface en 260 ms ;
   - la suite des villes de la tournée est numérotée sur la carte (1, 2, 3…) dans de petites puces lapis.

### 8.5 Le trajet à l'écran
- **Aujourd'hui** : le jeton se positionne chaque seconde avec `transition-transform 1000ms linear`. C'est juste pour un mouvement à vitesse constante, comme Hades' Star.
- **À améliorer** :
  - suspendre la transition pendant un geste de caméra (sinon le jeton « traîne » quand on déplace la carte), par exemple `[data-dragging] .tour-token { transition: none }` ;
  - à terme, placer le jeton dans la boucle `onPaint` (interpolation par image avec `performance.now()`), pour un trajet fluide à toute échelle.
- **À l'arrivée sur une ville** :
  - une **onde** vert d'eau (anneau qui s'élargit et pâlit, 600 ms `ease-out`, comme `bale-ring`) ;
  - la marque livrée qui saute du jeton à la ville (`star-enter`, 500 ms `--spring`) ;
  - un « + n ducats » qui monte et s'efface en 900 ms.
  - C'est le pendant visuel de la « cause et effet » que Hades' Star a ajoutée en 2023.
- **Le retour au comptoir** : le jeton rentre dans son arc de garage, avec un léger ressort.

### 8.6 Les autres effets, à construire au fil des étapes
- **Ouvrir une case** (le pendant du scanner) : la case passe du noir au bleu de la carte en 420 ms (`--t-moment`), son bord en pointillé or puis plein, et ses villes apparaissent l'une après l'autre (`star-enter`, décalées de 60 ms).
- **Monter le niveau d'un comptoir** : l'anneau de l'atelier se remplit, puis un éclat bref et une onde or de 700 ms. Pas de barre rayée : un arc (règle Lagune).
- **Une commande prête ou renouvelée** : la pastille vert d'eau rebondit une fois (`--spring`, 260 ms). Jamais en boucle, et rien pendant l'absence.
- **Le saut d'une région à l'autre**, s'il existe un jour : rester dans la scène unique, avec un `easeTo` de dézoom puis de zoom (2 × 450 ms), sans écran de chargement. C'est la meilleure leçon de Hades' Star : **une seule scène**.
- **Le calque d'information** (le tilde de Hades' Star) :
  - un appui long sur la carte (500 ms) ou la touche `Alt` maintenue affiche les noms de toutes les villes, leurs commandes et la soute des véhicules ;
  - on le lâche, il disparaît ;
  - c'est de l'information, donc permis par CLAUDE.md, et peut-être un confort de l'abonnement, à arbitrer.

### 8.7 PC
- **La molette** zoome (déjà).
- **Le clic gauche** choisit ; le **clic droit sur une ville**, véhicule choisi, ouvre la tournée vers elle, comme un lâcher de glissé.
- **Glisser à la souris** fait de même.
- **Le survol** d'une ville, véhicule choisi, montre la même bulle qu'au glissé : sur PC, la bulle vient au survol, sans glisser.
- **Le clavier** :
  - Échap ferme, désélectionne ou annule ;
  - `,` / `.` : véhicule précédent / suivant ;
  - Espace : la liste des véhicules ;
  - Entrée : l'action en or ;
  - 1 à 5 : les onglets de la barre.
  - Ces touches ne s'activent pas quand un champ de saisie a le focus.
- **Le curseur** : `grab` sur la mer, `grabbing` pendant le glissé, `pointer` sur un lieu, et un curseur de visée sur une ville accrochable.

### 8.8 Accessibilité
- **`prefers-reduced-motion`** (déjà géré dans `index.css`) :
  - les glissements de caméra deviennent des sauts ;
  - le jeton se place sans transition ;
  - le pointillé ne défile plus.
- **Chaque lieu est un `button`** avec `aria-label` (nom, commandes en attente). Le panneau du bas annonce la sélection (`aria-live="polite"`).
- **La couleur n'est jamais seule** : plein ou creux pour les marques, chiffres pour les comptes, forme pour les états.
- **La taille de l'interface** se règle par la taille de police racine, et les marques suivent en `rem`.

### 8.9 Pièces à construire, par ordre de valeur
1. **La ligne de glissé, l'accroche, la bulle** : une couche SVG d'écran dans `EmpireMap.tsx`, et un sélecteur `dragPreview()` dans `logic.ts` (testé).
2. **Les destinations allumées avec leur compte** quand un véhicule chargé est choisi.
3. **Le facteur de taille `--pin-k`** et l'écartement des véhicules.
4. **Le double toucher en interrupteur, centré sur le point**, et le recentrage par < >.
5. **L'arrivée** (onde, marque qui saute, « + ducats »).
6. **Les raccourcis PC et le survol.**
7. **Le calque d'information.**
8. **Le délai d'armement**, seulement si le porteur le retient.

---

## 9. Sources

### Le blog officiel (lu par extraits de recherche)
- [Our design philosophy (2016)](https://blog.hadesstar.com/2016/11/our-design-philosophy.html)
- [Ongoing Alpha Test, Update #2](https://blog.hadesstar.com/2016/12/ongoing-alpha-test-update-2-release.html)
- [Update #3](https://blog.hadesstar.com/2017/01/alpha-update-3-release-notes.html)
- [Update #4](https://blog.hadesstar.com/2017/02/alpha-update-4-release-notes.html)
- [2017.2](https://blog.hadesstar.com/2017/05/2017-2-update-release-notes.html)
- [2017.3](https://blog.hadesstar.com/2017/07/2017-3-release-notes.html)
- [2017.4](https://blog.hadesstar.com/2017/08/20174-release-notes.html)
- [2017.5](https://blog.hadesstar.com/2017/09/20175-release-notes.html)
- [2017.6](https://blog.hadesstar.com/2017/11/2017-6-release-notes.html)
- [2018.1](https://blog.hadesstar.com/2018/01/2018-1-release-notes.html)
- [2018.2](https://blog.hadesstar.com/2018/03/20182-release-notes.html)
- [2018.3](https://blog.hadesstar.com/2018/05/20183-release-notes.html)
- [2018.4](https://blog.hadesstar.com/2018/06/20184-release-notes.html)
- [2018.5](https://blog.hadesstar.com/2018/09/20185-release-notes.html)
- [2018.6](https://blog.hadesstar.com/2018/12/20186-release-notes.html)
- [2019.2](https://blog.hadesstar.com/2019/05/20192-release-notes.html)
- [2019.3](https://blog.hadesstar.com/2019/09/20193-release-notes.html)
- [Optional update 2.564.3](https://blog.hadesstar.com/2020/05/optional-update-25643.html)
- [Visual improvements in DARK NEBULA (2023)](https://blog.hadesstar.com/2023/06/visual-improvements-in-dark-nebula.html)
- [DARK NEBULA changelog](https://blog.hadesstar.com/2023/10/hades-star-dark-nebula-changelog.html)
- [Launch Rehearsal #1](https://blog.hadesstar.com/2023/09/dark-nebula-launch-rehearsal-weekend-1.html?m=1)
- [Red Stars (2016)](https://blog.hadesstar.com/2016/10/red-stars-of-hades-galaxy-red-stars.html)
- [Understanding the Economy](https://blog.hadesstar.com/2017/01/hades-star-understanding-economy.html)

### Wiki et encyclopédies
- [Gameplay Tips (fandom)](https://hades-star.fandom.com/wiki/Gameplay_Tips)
- [Spaceships](https://hades-star.fandom.com/wiki/Spaceships)
- [Hades Legacy Ship Page](https://hades-star.fandom.com/wiki/Hades_Legacy_Ship_Page_(pre_2023.1))
- [Resources](https://hades-star.fandom.com/wiki/Resources)
- [Dark Nebula](https://hades-star.fandom.com/wiki/Dark_Nebula)
- [TV Tropes](https://tvtropes.org/pmwiki/pmwiki.php/VideoGame/HadesStar)
- [NamuWiki](https://en.namu.wiki/w/Hades'%20Star)
- [PCGamingWiki](https://www.pcgamingwiki.com/wiki/Hades%27_Star)
- [General Hades Star Info (blog de fan, 2019)](https://voidcorpmedia.blogspot.com/2019/01/general-hades-star-info.html)

### Steam
- [Liste des raccourcis (2019)](https://steamcommunity.com/app/755800/discussions/0/1776010325113905402)
- [Use special mouse buttons](https://steamcommunity.com/app/755800/discussions/0/1812044473320130089/)
- [Hotkey-setting for individual ships](https://steamcommunity.com/app/755800/discussions/0/1768133742960417973/)
- [Issues with the UI update](https://steamcommunity.com/app/755800/discussions/0/1647665620941459597/)
- [First impression on the UI](https://steamcommunity.com/app/755800/discussions/0/1840188800789677525/)
- [Best way to spend crystals](https://steamcommunity.com/app/755800/discussions/0/1835685838075303902/)
- [Page Steam du jeu](https://store.steampowered.com/app/755800/Hades_Star/)

### Guides et presse
- [TalkAndroid, DARK NEBULA Game Guide](https://www.talkandroid.com/34946-hades-star-dark-nebula-game-guide/)
- [Prima Games](https://primagames.com/eguides/mobile-gaming-eguide-tips-tricks-and-strategies-for-todays-hottest-mobile-games/hades-star/profit-driven-galactic-exploration)
- [MMOHuts, revisite et entretien](https://mmohuts.com/news/hades-star-post-launch-revisit-and-interview)
- [PocketGamer](https://www.pocketgamer.com/hades-star/hades-star-will-bring-mmo-space-strategy-to-mobile/)
- [Game Solver](https://game-solver.com/hades-star/)
- [KJC eSports](https://www.kjcesports.com/reviews/what-is-hades-star-game-review/)

### Les enregistrements d'écran du porteur
Marqués [E] : la source première pour la sélection, le glissé, la bulle, le délai de départ et le HUD.

### Non lus
YouTube (aucune vidéo trouvée par la recherche, et aucun accès), r/HadesStar (aucun fil remonté) et les pages complètes du blog (réseau bloqué).
