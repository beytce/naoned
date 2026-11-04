# Audit UX mobile et navigation de la carte 3D (3 novembre 2026)

Angle : gestes et caméra, zones tactiles, nombre de touchers par action, une main, feedback, chargement, transitions carte / domaine / feuilles, cohérence PC. Références : Hades' Star (systèmes, glisser d'envoi, couche « tilde »), Townscaper (caméra douce, zéro chrome), Pocket City (une feuille, un geste), Clash of Clans (village à part de la carte du monde, récolte au toucher), Kingdom Two Crowns (le monde dit l'état, pas de chiffres).

Je n'ai modifié aucun fichier du dépôt ni lancé de capture supplémentaire.

---

## 1. Constats (prouvés)

### A. Caméra et gestes

**C1. « Recentrer » ne recentre pas, il bascule.** Le bouton appelle `map.current?.toggle()` (`EmpireGame.tsx:436`). `toggle()` (`EmpireMap.tsx:303-308`) dézoome vers `farOn` quand aucune orbite n'est ouverte, et revient sur `sectorOn` quand elle l'est. `sectorOn` se centre sur `seatOf("veneto")` (`EmpireMap.tsx:77-82`), donc sur Venise et pas sur le fondaco du joueur. Résultat sur `phone/4-dezoom.png` : après « Recentrer », la carte est minuscule (environ 300 px de large, tuiles de 20 px) et la moitié de l'écran est vide. Le libellé promet un retour à la maison et livre un dézoom. C'est le premier geste qu'un joueur perdu va essayer.

**C2. Le pincement arrête le suivi de la mule, alors que la doc dit le contraire.** `plateau-reprise.md` § 8 : « le zoom ne l'arrête pas ». Le code arrête le suivi au premier `pointerdown` sur la carte (`EmpireMap.tsx:358`, `{ once: true }`), et un pincement commence par un `pointerdown`. La molette l'arrête aussi (`EmpireMap.tsx:359`). Seuls `+` et `-` au clavier le gardent. Sur téléphone, on ne peut donc pas s'approcher d'une mule suivie.

**C3. Un double toucher sur un lieu déclenche deux actions.** `useCamera.up()` envoie `onTap` au premier relâché sans attendre (`useCamera.ts:289-293`), puis `onDoubleTap` au second s'il arrive dans les 300 ms. En 3D, `onTap` lance le rayon et ouvre la ville (`EmpireMap.tsx:281-285`). Le second toucher zoome (`EmpireMap.tsx:267-276`). Le filtre « sur la mer, pas sur un lieu » (`closest("button")`) ne marche plus en 3D, puisque les repères y laissent passer le doigt (`index.css:1533-1536`). Un double toucher sur Padoue ouvre donc sa feuille et zoome en même temps.

**C4. La caméra ne cadre jamais l'objet touché au-dessus de la feuille.** Toucher une ville ne déplace pas la caméra (`touchPlace` → `onTarget`, `EmpireMap.tsx:467-468`). Sur `parcours/390x844-18-arrivee.png`, la feuille de la mule couvre 46 % de l'écran (de y≈455 à 844) et la mule arrivée à Padoue est coupée sur le bord gauche. Sur `parcours/…-17-en-route.png`, la mule suivie est centrée dans tout l'écran, donc sous la feuille. Le centre de suivi `centredOn(..., camera.view())` ignore la hauteur de la feuille.

**C5. Le zoom est plafonné près, mais l'échelle de départ est déjà la plus proche du « petit monde ».** Le départ (`sectorOn`, 95 % de la largeur sur un secteur) montre les 7 tuiles (`phone/1-depart.png`). Le dézoom maximal (`farCamera`) ne montre que la maison, les tuiles de verre font 20 px et le contour du monde occupe moins de la moitié de l'écran (`phone/4-dezoom.png`, `parcours/…-19b-au-plus-loin.png`). Entre les deux, aucun palier intermédiaire n'est pensé : on passe d'un diorama lisible à une miniature illisible, avec des labels qui se chevauchent (`19b` : « Carrière d'argile », « Briqueterie », « Camp de bûcherons », « Scierie » empilés sur 200 px).

**C6. La molette zoome sans modificateur ni limite de vitesse.** `wheel` (`useCamera.ts:306-312`) donne `exp(-deltaY·0.0015)` par événement. Un pavé tactile de portable envoie des dizaines d'événements à petit `deltaY`, tandis qu'une souris à crans envoie 100 par cran : le zoom saute d'environ 14 % par cran sur souris et dérive en continu sur pavé. Le glisser à deux doigts d'un pavé tactile (`deltaX`) est ignoré au lieu de faire un pan.

**C7. L'inertie est réglée par image et non par temps.** Le glissé applique `v·16` px et `v·0.92` à chaque `requestAnimationFrame` (`useCamera.ts:104-108`). Sur un écran à 120 Hz (iPhone Pro, Android haut de gamme), le glissé va deux fois plus loin et s'arrête deux fois plus vite qu'à 60 Hz. Sur un appareil qui rame (4 à 7 images/s mesurées sous SwiftShader, `plateau-reprise.md` § 7), il se fige presque.

**C8. La couche d'information (appui long) existe mais personne ne la trouve.** `HOLD_MS = 500` (`useCamera.ts:8`) affiche `[data-info]` : noms, commandes « 1/3 », cales « 0/2 » (`parcours/…-1d-calque.png`). Aucun indice à l'écran ne l'annonce, et Lorenzo n'en parle pas (`1b-intro`). Sur PC, c'est la touche Alt (`EmpireGame.tsx:230`), elle aussi cachée. C'est pourtant la meilleure réponse au signalement 3, sans HTML permanent.

### B. Zones tactiles et conflits

**C9. La médaille du véhicule se pose sur le nom et le toit du fondaco.** En 3D, la médaille est décalée de 22 px vers le bas (`index.css:1539-1541`), juste sur « FONDACO CASA_3D » (`phone/1-depart.png`, `pc/1-depart.png`, `phone/3-mule.png`). Elle reste `pointer-events-auto` (`Fleet.tsx:321`) alors que les autres repères laissent passer le doigt. Toucher le bas du fondaco attrape donc une mule. Ses 32 px visibles (`h-8 w-8`, `Fleet.tsx:330`) sont étendus à 44 px par `::after` (`index.css:1253-1262`), ce qui agrandit encore la zone qui vole les touchers du fondaco. Deux médailles côte à côte (deux mules) couvrent presque tout le nom.

**C10. Le toucher 3D a deux chemins.** Les lieux sont touchés par rayon (`Board3D.hit`, zones bornées à la moitié de la distance au voisin, `scene.ts` `zones()`), les médailles par le DOM, et l'orbite des ateliers par ses boutons HTML (`Orbit.tsx`). Ce qui se dessine en 3D et ce qui se touche en HTML ne coïncident pas toujours. Sur `phone/2-fondaco.png`, le libellé « Carrière d'argile niv. 1 · À lancer » est posé sur les bâtiments de Venise et du fondaco. Le bouton de la Carrière et la zone 3D du fondaco se recouvrent.

**C11. Venise, Padoue et le fondaco sont collés, donc les zones de toucher sont petites.** Les zones 3D sont bornées à la moitié de la distance au lieu le plus proche. Venise, le fondaco et le champ voisin tiennent dans un rayon d'environ 120 px au départ (`phone/1-depart.png`). Au dézoom (`4-dezoom`), un lieu fait 15 à 20 px : on ne peut plus rien toucher de façon fiable, même si `::after` agrandit les repères HTML, qui eux laissent passer le doigt en 3D.

**C12. Les textes de la carte sont sous les 12 px.** On trouve 15 occurrences de `text-[0.6…]` ou `text-[0.625rem]` (10 px) dans `map/` et `Orbit.tsx` : secondes sur la route (`Fleet.tsx:301`), cale (`Fleet.tsx:337`), compteur de commandes (`EmpireMap.tsx:1193`), badge « +n » (`EmpireMap.tsx:1213`), minuteur de chantier (`0.6875rem`, `EmpireMap.tsx:646`), et le chevron ▼ (`0.6rem`, `Fleet.tsx:325`). C'est contraire à la règle des 12 px.

### C. Livraison : touchers, feedback, PC

**C13. La livraison demande 6 à 8 touchers, sur trois écrans qui ne se parlent pas.** Parcours réel (`parcours/14` → `16`) :
1. Toucher la médaille de la mule.
2. Ouvrir l'onglet « commandes » de sa feuille (icône seule, `14b`).
3. Éventuellement choisir un tri (« Plus chères »…).
4. Toucher la commande pour la charger (« Touchez une commande pour la charger »).
5. Fermer la feuille ou viser la ville.
6. Glisser la médaille jusqu'à Padoue (`15-glisser`), ce qu'aucun joueur ne devine.
7. Toucher ✓ « Partir » pendant le compte à rebours de 10 s (`16-depart`, `departSeconds: 10`, `settings.ts:123`).

Le chemin « depuis la ville » (`1b-padoue`, `14-commandes`) existe, mais son bouton d'or « Y envoyer un véhicule » envoie la mule **à vide** : `sendable()` ne fait qu'un `empireMove` (`EmpireGame.tsx:258-268`). Rien n'est chargé, donc rien n'est livré. C'est le bouton le plus visible de la carte, et il mène à un voyage inutile de 5 minutes.

**C14. Le moteur sait déjà livrer en un geste.** `empireDeliver` avec `city` (`commands.ts:372-380`) appelle `autoDeliver` (`moves.ts:219-263`). Il prend la mule libre au fondaco, charge les commandes de la ville que le stock couvre, l'envoie et la fait partir aussitôt (`departNow`). Il ne gère qu'une marchandise par appel et n'ajoute pas de retour au fondaco (la mule reste « À quai : Padoue », `18-arrivee`). La décision du porteur (« Livrer » depuis la ville) est donc à 80 % dans le moteur.

**C15. Le glisser d'envoi a échoué sur PC.** Le parcours glisse de la médaille vers le repère de la ville (`e2e/map3d.mjs:233-247`). Le glisser vit dans `Fleet.startDrag` (React `onPointerDown`, puis écoute sur `window`). En 3D, la cible visée est le centre du repère HTML `[data-city]`, alors que la médaille est décalée de 22 px par CSS et que l'accroche se calcule sur la carte (`nearestPlace`, rayon `34·k`). Sur PC à 1440 × 900, le zoom de l'orbite restait actif (Échap ferme la feuille, pas l'orbite). Hypothèse : le point de départ ou d'arrivée ne correspond plus à ce que voit la souris. Quelle qu'en soit la cause, un geste qui échoue dans un test automatique échouera chez des joueurs. Le clic droit d'envoi (`rightClick`, `EmpireMap.tsx:486-494`) n'est annoncé nulle part.

**C16. Le retour d'une livraison est faible.** À l'arrivée, un texte « hop-rise » monte de la ville pendant 1,8 s (`Fleet.tsx:140`, `371`), en `text-xs`, sans lien avec la bourse du HUD. La caméra suivie s'arrête sur place sans transition. Il n'y a ni son, ni vibration, ni pile de caisses qui baisse dans la ville. Si le joueur regarde ailleurs, il ne voit rien (pas de récapitulatif).

**C17. Les icônes seules dans la feuille du véhicule ne se lisent pas.** Rangée `▢ → ⚒ ≡` (`3-mule`, `14b`), puis `▢ ✓ ✕ → ⚒ ≡` (`16-depart`). Le ✓ en or veut dire « Partir maintenant » et le ✕ « Annuler l'arrêt », sans libellé. L'onglet ⚒ ouvre des modules de commerce verrouillés en plein voyage (`17-en-route`) : 5 lignes « Ouvre au niveau n » qui couvrent la carte au moment où le joueur veut regarder sa mule.

### D. Fondaco, feuilles, chargement, une main

**C18. Le fondaco demande deux touchers et un état caché.** Premier toucher : l'orbite s'ouvre (`deploy`). Second toucher : la feuille de la Casa (`touchPlace("home")`, `EmpireMap.tsx:464-466`). Le même geste sur le même objet donne deux résultats selon un état invisible. L'orbite déborde l'écran (cercle pointillé plus large que 390 px, `phone/2-fondaco.png`), et Padoue est coupée (« ADOUE »).

**C19. Le bas de l'écran est vide au centre, et les actions sont loin du pouce.** La barre du bas place « Recentrer » à gauche, puis Marché, Compagnie et Famille à droite, avec un trou au centre (`phone/1-depart.png`). Le « + » (Production, `11-nouvel-atelier`) est en haut à droite (y≈205), hors de portée du pouce à une main sur un téléphone de 6,1 pouces. Les quatre pilules de bourse empilées occupent la colonne de droite sur 170 px.

**C20. Rien ne s'affiche pendant le chargement du plateau 3D.** `<Suspense fallback={null}>` (`EmpireMap.tsx:511`), et le fond de nuit SVG est retiré en 3D (`!MAP_3D`, `EmpireMap.tsx:516`). Le joueur voit un fond `#08111F` uni avec des étiquettes HTML flottantes, le temps de charger un fragment de 354 Ko gzip et des modèles de 354 Ko gzip, hors du cache de la PWA. Sur 4G moyenne, cela dure plusieurs secondes, sans indicateur.

**C21. Les transitions ne racontent pas où l'on va.** `BottomSlot` fait glisser les feuilles proprement (160 ms et `--t-base`), mais la caméra et les feuilles ne sont pas chorégraphiées ensemble. Ouvrir une ville ne bouge pas la caméra (C4), alors qu'ouvrir le fondaco zoome (450 ms). Fermer avec ✕ ne ramène pas la caméra. Toucher la mer ferme l'orbite (`setOpened(null)`) sans dézoomer.

**C22. Il n'y a pas d'orientation ni de « où suis-je ».** Pas de mini-carte, pas d'indicateur hors écran pour le fondaco ou une mule. Rien ne ramène vraiment au fondaco (C1). Les tuiles de verre sont toutes identiques. Une fois qu'on a glissé hors de la maison (le pan est borné par `coverClamp` sur toute la carte), on ne sait plus dans quelle direction revenir.

**C23. Le premier « secteur à acheter » n'apprend rien.** Toucher une tuile dorée ouvre « Romagne et Marches · Case à acheter… » avec un cadenas « Casa 9 » (`13-case`) : un cul-de-sac. Les tuiles bordées d'or sont « brillantes quand la Casa le permet », mais au départ toute la périphérie est bordée d'or (`1-depart`). L'or est utilisé partout, ce qui contredit la règle « l'or seulement pour ce qui est à vous et pour l'action ».

---

## 2. Recommandations

Notation : effort S (moins d'un jour), M (2 à 4 jours), L (une semaine ou plus) ; impact 1 à 3 (3 = change l'expérience) ; « Décision » quand le porteur doit trancher.

### Bloc 1 : livrer depuis la ville (signalements 4 et 5)

**R1. Le flux « Livrer depuis la ville », en 2 touchers.** Effort M, impact 3. Décision : retour automatique de la mule (voir R4).

Le problème : C13, C14 et C15.

Le comportement, pas à pas :
1. **Toucher la ville** (rayon 3D, inchangé).
   - La caméra glisse en 350 ms pour placer la ville au milieu de la zone visible au-dessus de la feuille (R11).
   - La tuile de la ville s'éclaire d'un anneau lapis au sol (sélection, conforme à la palette).
   - La route fondaco → ville se dessine en pointillé crème animé, du fondaco vers la ville, avec la durée posée dessus (« 5 min »).
   - Les autres villes baissent légèrement en saturation.
2. **La feuille « Padoue » s'ouvre en position basse** (au plus 38 % de la hauteur) avec :
   - en tête : le nom (Cinzel), puis « taille 3 », puis la pile de caisses en pictogramme (R7) ;
   - une **carte par commande** : `GoodsMark` 32 px, « Bois × 133 », paie en or chiffré, et une jauge du stock du fondaco pour ce lot (lagune pleine « prêt », ou creuse « il manque 40 bois ») ;
   - les commandes couvertes sont cochées par défaut, jusqu'au nombre de places de la mule libre, et un toucher sur une carte la coche ou la décoche ;
   - **un seul bouton d'or** : « Livrer · 2 lots · 917 d », avec en dessous, en crème atténuée, « Mule du fondaco · arrivée vers 14 h 32 ».
3. **Toucher « Livrer ».** La réponse est optimiste et immédiate :
   - la feuille descend (160 ms) et la caméra glisse vers le fondaco (400 ms) ;
   - en 3D, les caisses sautent du fondaco sur le bât de la mule (une par lot, 120 ms d'écart) ;
   - la mule pivote vers la route et part, sans compte à rebours (R3) ;
   - vibration courte (`navigator.vibrate(15)` là où c'est permis) ;
   - la caméra suit la mule 2,5 s puis la lâche (R12), et un jeton « Mule → Padoue 4:58 » se pose dans le HUD (R13).
4. **États dégradés**, toujours un bouton qui fait quelque chose :
   - stock insuffisant : le bouton d'or devient « Produire du bois », qui ouvre la vue du domaine sur l'atelier concerné ;
   - aucune mule libre : bouton fantôme « Mule libre dans 3 min » et, en lapis, « Prévenir quand elle rentre » ;
   - ville hors de portée : « Hors de portée : posez un fondaco près d'ici » qui lance la pose.

Dans le code :
- `OrdersPanel.tsx` est réécrit en `CityPanel` (cartes cochables, un seul `Slab` d'or).
- `sendable()` dans `EmpireGame.tsx` remplace `empireMove` par `empireDeliver { city }`.
- Côté moteur, il faut :
  - `autoDeliver` accepte une **liste d'ordres** (ids) au lieu d'une seule marchandise : nouvelle commande `empireDeliverOrders { city, orderIds }`, tests d'abord sur `test/fixture.ts` ;
  - le retour au fondaco est ajouté (R4) ;
  - le choix de la mule est déterministe : la plus proche, puis la plus grande cale.
- Le glisser de la médaille et la feuille du véhicule restent pour les joueurs avancés (R5).

**R2. Supprimer le bouton « Y envoyer un véhicule » tel qu'il est.** Effort S, impact 3.

Le problème : C13, une mule envoyée à vide. Tant que R1 n'est pas livrée, le bouton doit au minimum appeler `empireDeliver { city, good, qty }` pour la première commande que le stock couvre, ou disparaître si aucune ne l'est. C'est le correctif rapide, à faire dès aujourd'hui.

**R3. Supprimer le compte à rebours de 10 s avant le départ, dans le flux « Livrer ».** Effort S, impact 2. Décision (réglage `moves.departSeconds`).

Le problème : C13, étape 7. Le ✓ « Partir » sans libellé est un toucher de plus, et les 10 s d'attente ressemblent à un bogue. `autoDeliver` appelle déjà `departNow`. Pour le glisser expert, on peut garder une fenêtre d'annulation, mais sous la forme d'un « Annuler » en lapis dans le jeton du HUD pendant 5 s (modèle Gmail), pas d'un minuteur dans la feuille.

**R4. La mule rentre seule au fondaco après livraison.** Effort S côté moteur (un `moveVehicle` de plus vers `from`), impact 3. Décision.

Le problème : `18-arrivee`, une mule « À quai : Padoue » à 5 minutes de son fondaco, qu'il faut renvoyer à la main. C'est un toucher de plus par livraison, et la règle d'or 7 veut des sessions de quelques minutes. La règle 3 tient toujours : la mule rentre et attend, elle ne perd rien. Visuellement, elle refait la route en sens inverse, bât vide, plus vite (par exemple 1,5 fois).

**R5. Le glisser d'envoi devient un geste expert, doublé d'un mode « viser » au clic.** Effort M, impact 2.

Le problème : C15, un geste introuvable et qui échoue sur PC. Solution :
- toucher une médaille (ou un animal 3D, R6) ouvre la feuille du véhicule ;
- le bouton « Envoyer » (libellé, pas seulement →) passe en mode **viser** : les destinations s'éclairent (`targets`, déjà là), la caméra dézoome d'un palier pour les montrer, et un toucher sur une ville envoie ;
- Échap ou un toucher dans le vide annule ;
- sur PC : clic gauche = viser puis cliquer, clic droit = envoi direct (déjà codé, à annoncer par une infobulle au survol de la médaille : « Clic droit sur une ville pour l'y envoyer ») ;
- le glisser reste, mais il commence par un `setPointerCapture` sur la médaille et calcule départ et accroche sur la position de l'**animal 3D** projeté, plutôt que sur la médaille décalée de 22 px ;
- un test e2e PC couvre les trois chemins.

**R6. Retirer la médaille qui suit la mule : on touche l'animal.** Effort M, impact 3 (signalement 4).

Solution :
- les animaux de `fleet3d.tsx` reçoivent une zone de toucher invisible (un cylindre de 1,5 fois le gabarit, 44 px minimum à l'écran), ajoutée à `Board3D.hit()` avec un identifiant `vehicle:<id>`, prioritaire sur la tuile ;
- la médaille HTML est supprimée en 3D, sauf dans la couche d'information (R8), où une petite pastille de cale « 1/2 » flotte au-dessus de l'animal ;
- la sélection devient un anneau lapis au sol sous l'animal, le chargement un bât rempli de caisses aux couleurs de chaîne (déjà prévu : « La charge d'une charrette prend la teinte de sa chaîne ») ;
- les secondes restantes ne s'écrivent plus à mi-route en 10 px (C12) : elles vont dans le jeton du HUD (R13) et dans la feuille.

Côté code : la classe `[data-three] [data-vehicle]` passe à `display:none` hors `[data-info]`, et `Fleet.tsx` ne garde que les lignes de route et l'arrivée.

**R7. Les commandes de la ville, dans le décor.** Effort M, impact 3 (signalements 3 et 5, décision déjà prise).

Solution, côté UX :
- **devant chaque ville, une pile de caisses** : une caisse par commande ouverte, aux couleurs de chaîne (`GoodsMark` en 3D, un cube teinté avec le pictogramme en décalque). La pile monte de 1 à 3 avec le plafond (1, 1, 2, 2, 3) ;
- **ville pleine** : la tuile s'illumine en or doux et le fanion de la ville monte en haut de son mât (l'animation lente de `life.tsx`) ;
- **commande que le stock couvre déjà** : sa caisse porte un liseré lagune, ce qui se lit comme « prête à partir » ;
- **commande livrée** : la caisse est retirée de la pile au moment de l'arrivée (R10) ;
- l'anneau HTML de `CityMark` est supprimé en 3D ;
- le chiffre « 1/3 » n'apparaît que dans la couche d'information.

**R8. Mettre en avant la couche d'information, puisque c'est la réponse au signalement 3.** Effort S, impact 2.

Le problème : C8. Solution :
- un **bouton œil** dans la barre du bas, au centre (R16), qui bascule la couche (toucher = bascule, appui = tant que le doigt reste) ;
- la couche montre, au-dessus de chaque ville, une étiquette de 12 px minimum « 2/3 · Bois, Argile », au-dessus des ateliers « prêt » et « attend », au-dessus des mules la cale et le temps restant ;
- Lorenzo l'annonce à la deuxième session ;
- sur PC, Alt et le bouton font la même chose, et l'infobulle du bouton dit « Alt ».

### Bloc 2 : la vue du domaine (signalements 1 et 2)

**R9. La vue du domaine : entrée, contenu, sortie.** Effort L, impact 3 (décision déjà prise, à détailler).

**Entrée**
- Toucher le fondaco (zone 3D) lance une transition de 600 ms :
  - la caméra plonge vers le toit d'or (zoom de 1 à environ 3,5, `glide` en log, déjà dans `useCamera`) ;
  - à 60 % de la plongée, un fondu en lapis profond (120 ms) masque le changement de scène ;
  - la scène du domaine apparaît déjà cadrée.
- Pas de « deuxième toucher = Casa » (C18) : le fondaco touché ouvre toujours le domaine.

**La scène**
- Une île hexagonale à part, 19 tuiles (le fondaco au centre, 2 anneaux), sur fond de nuit, la lagune autour.
- Chaque place d'atelier est une tuile :
  - atelier bâti : son modèle ;
  - chantier : ses caisses et un arc de progression posé au sol ;
  - place libre : tuile nue avec un « + » gravé en lapis ;
  - place verrouillée : tuile de verre avec le cadenas et « Casa 3 ».
- Au-dessus de chaque atelier **prêt**, une caisse dorée qui rebondit doucement (le signal de récolte de Clash of Clans), et l'atelier produit visiblement (fumée, ailes du moulin).
- Caméra **fixe**, qui cadre tout le domaine sur 390 × 844 entre le HUD et la feuille.
- Pan désactivé, pincement désactivé ou très borné (de 0,9 à 1,3) : un petit monde qu'on n'a pas besoin de parcourir.

**Actions**
- Toucher une caisse dorée récolte cet atelier : la caisse vole vers le fondaco, et un chiffre de 14 px monte.
- Le bouton d'or unique en bas, « Tout récolter · 3 », est remplacé par « Tout relancer » quand rien n'est prêt.
- Toucher une place libre ouvre la feuille « Bâtir ici » (liste filtrée des ateliers possibles, le premier conseillé, un seul bouton d'or « Bâtir · 48 d »).
- Toucher un atelier bâti ouvre sa feuille (niveau, production, améliorer).
- Toucher le fondaco au centre ouvre la Casa.

**Sortie**, quatre chemins qui font la même chose :
- le chevron « ‹ Carte » en haut à gauche (44 × 44 px, conforme à la règle Lagune « on revient par le chevron ») ;
- un pincement vers l'intérieur (geste naturel « je sors ») ;
- Échap ou retour arrière du navigateur ou d'Android (`history.pushState` à l'entrée) ;
- le glisser vers le bas depuis le haut de la scène.

La transition inverse, en 450 ms, remonte du toit d'or vers la carte, à la caméra d'avant l'entrée (mémorisée).

**Code**
- Une nouvelle scène `map3d/Domain3D.tsx`, montée dans le **même** `<Canvas>` (pour éviter de recréer le contexte WebGL, coûteux sur mobile) : on échange le groupe racine et la caméra.
- `EmpireMap` gagne un état `mode: "map" | "domain"`.
- L'orbite HTML (`EmpireOrbit` en mode `on3d`, `orbit3d`) est supprimée, ce qui règle le signalement 1 à la racine : une seule source pour les ateliers.
- La géométrie des places vient de `orbitOf` (`Orbit.tsx`), qui devient une simple disposition d'anneaux.

**R10. L'arrivée d'une livraison, visible même de loin.** Effort M, impact 3.

Le problème : C16. Solution :
- la mule entre dans la ville et dépose ses caisses (la pile de R7 perd ses caisses une à une) ;
- une gerbe de 5 à 8 ducats s'élève de la ville et **vole jusqu'à la pilule de ducats du HUD** (courbe de Bézier, 700 ms, en HTML au-dessus du canvas à partir des coordonnées projetées), puis la pilule pulse et son chiffre défile ;
- si la ville est hors écran : un ducat entre depuis le bord de l'écran, du côté de la ville ;
- si le joueur était absent : au retour, un **moment** (règle Lagune « un moment s'ouvre de lui-même ») « Pendant votre absence : 2 livraisons, +1 834 d », avec un seul bouton « Encaisser », qui joue la gerbe.

### Bloc 3 : caméra et gestes

**R11. La caméra tient compte de la feuille ouverte.** Effort S, impact 3.

Le problème : C4. Solution : `centredOn` reçoit une « zone utile » `{ top: 96, bottom: hauteurDeLaFeuille }`, mesurée par un `ResizeObserver` sur `BottomSlot` et passée à `EmpireMap`. Tout cadrage l'utilise : ville touchée, véhicule suivi, `orbitOn`. Quand une feuille s'ouvre sur un objet, la caméra glisse pour le placer au milieu de la zone utile ; quand elle se ferme, la caméra revient à sa position d'avant si le joueur n'a pas bougé entretemps.

**R12. Réécrire les règles du suivi.** Effort S, impact 2.

Le problème : C2, et un suivi qui dure 5 minutes et colle la caméra. Solution :
- le suivi garde le pincement et la molette (il ne s'arrête qu'à un **pan** de plus de 8 px : lire `el.dataset.dragging` plutôt que `pointerdown`) ;
- après « Livrer », le suivi dure 2,5 s puis s'arrête de lui-même ;
- un toucher sur le jeton du HUD (R13) ou sur l'animal le relance ;
- à l'arrivée, la caméra reste et l'animation d'arrivée (R10) se joue au centre.

Corriger aussi `plateau-reprise.md` § 8, qui affirme le contraire du code.

**R13. Le jeton « en route » dans le HUD.** Effort S, impact 2.

Solution : sous le nom de la maison (en haut à gauche, sous « 0 d par jour »), une ligne de jetons, un par véhicule en route, au format « 🐴 Padoue 4:12 » (pictogramme SVG, Archivo 12 px). Toucher un jeton fait glisser la caméra vers la mule et lance le suivi ; un appui long ouvre sa feuille. Au-delà de 3 jetons, « +2 ». C'est l'indicateur hors écran de Hades' Star, et cela permet de retirer les secondes du milieu de la route (C12).

**R14. « Recentrer » devient « Maison » et ramène vraiment au fondaco.** Effort S, impact 3.

Le problème : C1. Solution :
- un toucher fait glisser la caméra sur **le fondaco du joueur** (`homeAt(p)`, pas `seatOf("veneto")`), à l'échelle de départ, en tenant compte de la feuille (R11) ;
- un deuxième toucher, déjà centré, ouvre la vue du domaine (R9) ;
- le dézoom vers toute la maison passe au **double toucher dans le vide** (déjà là) et au pincement ;
- l'icône devient la maison au toit d'or, le libellé « Maison » ;
- quand le fondaco est hors écran, une petite flèche dorée au bord de l'écran pointe vers lui (R15).

**R15. Les flèches de bord pour le fondaco et les mules.** Effort S, impact 2.

Le problème : C22. Quand le fondaco, ou une mule en route, sort de l'écran, une flèche de 28 px (zone de 44 px) se colle au bord, dans la direction projetée, toit d'or pour le fondaco et animal pour la mule. La toucher y ramène la caméra. On ne garde que celles de la maison, pas une par ville.

**R16. Recomposer la barre du bas pour le pouce.** Effort S, impact 2. Décision (ordre des boutons).

Le problème : C19. Proposition à 5 places (les acquis de la refonte UX parlent de 5 onglets) :

| Place | Bouton |
| --- | --- |
| 1 | Maison (R14) |
| 2 | Bâtir (le « + » actuel, descendu de y≈205 vers la barre) |
| 3, centre | Œil, la couche d'information (R8) |
| 4 | Marché |
| 5 | Compagnie |

Famille passe dans Compagnie ou dans le profil. La bannière de Lorenzo reste au-dessus de la barre. Les pilules de bourse passent sur **une seule ligne** horizontale en haut (ducats en premier, les trois autres en compact), ce qui libère la colonne de droite de la carte.

**R17. Des paliers de zoom pensés, avec un niveau de détail par palier.** Effort M, impact 2.

Le problème : C5. Trois paliers, avec un aimantage doux au relâché du pincement (si l'échelle finit à moins de 12 % d'un palier, `easeTo` l'y amène en 200 ms) :

1. **Domaine**, vue à part (R9).
2. **Secteur**, l'échelle de départ : modèles, noms, piles de caisses.
3. **Région**, environ 3 secteurs à l'écran :
   - noms des villes seulement ;
   - piles de caisses remplacées par un **phare** (une colonne de lumière lagune sur les villes qui ont une commande couverte, or sur les villes pleines) ;
   - animaux remplacés par un point lumineux qui suit la route ;
   - le décor fin est caché (déjà fait pour sapins et rochers sous 3,6 px par unité).

La vue la plus éloignée actuelle (`4-dezoom`) devient la région, cadrée pour remplir l'écran (largeur limitée à environ 130 % de la maison et non au contour du connu). Les tuiles de verre lointaines sont moins nombreuses et estompées.

**R18. Le double toucher sans conflit.** Effort S, impact 2.

Le problème : C3. Solution : `onTap` est différé de 220 ms seulement si aucun lieu n'est sous le doigt ; un lieu touché répond tout de suite, sans double toucher possible. Plus simple : on ignore `onDoubleTap` quand `board3d.hit()` a renvoyé un lieu au premier toucher. Le double toucher garde son sens (zoom autour du point) dans le vide uniquement.

**R19. Inertie indépendante de la fréquence d'affichage.** Effort S, impact 1.

Le problème : C7. On calcule le déplacement et l'amortissement en fonction de `dt` : `pos += v·dt` et `v *= 0.92^(dt/16.7)`. On garde le même ressenti qu'aujourd'hui à 60 Hz.

**R20. Molette et pavé tactile sur PC.** Effort S, impact 2.

Le problème : C6. Solution :
- `ctrlKey` sur un événement `wheel` (le pincement du pavé tactile sous Chrome et Safari) donne un zoom fin ;
- `deltaMode` est normalisé (lignes en pixels) ;
- une molette à crans zoome de 10 % par cran, avec un `easeTo` de 120 ms plutôt qu'un saut ;
- `deltaX` et `deltaY` sans Ctrl sur un pavé tactile (petits deltas fréquents) font un **pan**.

Heuristique : si `|deltaY| < 40` et que les événements arrivent à moins de 30 ms d'intervalle, c'est un pavé, donc un pan. Ajouter aussi :
- le cliquer-glisser du bouton du milieu pour le pan ;
- une infobulle au survol de chaque lieu (nom, commandes « 2/3 ») au lieu d'étiquettes permanentes ;
- un curseur `pointer` au survol d'un lieu cliquable, que le rayon 3D doit fournir au survol (aujourd'hui, rien).

### Bloc 4 : zones tactiles, lisibilité, chargement, retours

**R21. Une seule voie de toucher : le rayon, pour tout ce qui est dans la scène.** Effort M, impact 2.

Le problème : C9 et C10. Tout ce qui est dans la scène (lieux, ateliers du domaine, animaux) est touché par le rayon, avec un ordre de priorité explicite : véhicule, puis atelier, puis ville ou fondaco, puis secteur. Le HTML ne garde que le HUD, les feuilles, la couche d'information et les flèches de bord. On ajoute un **retour visuel au toucher** dans la scène : la tuile touchée s'enfonce de 2 % puis remonte, en 120 ms (aujourd'hui rien ne réagit avant l'ouverture de la feuille). Pour l'accessibilité au clavier, les repères HTML restent focalisables mais invisibles (`sr-only`), et Tab parcourt fondaco, villes puis véhicules.

**R22. Zones minimales en 3D, sans vol entre voisins.** Effort S, impact 2.

Le problème : C11. `zones()` borne le rayon à la moitié de la distance au voisin, c'est juste. Il faut en plus garantir 44 px à l'écran : si la zone projetée fait moins de 44 px, le toucher prend le lieu le plus proche du doigt dans un rayon de 22 px (une recherche de plus proche voisin à l'écran plutôt que dans la scène). Au dézoom région (R17), seules les villes et le fondaco restent touchables, et le toucher d'un secteur zoome dessus plutôt que d'ouvrir une feuille.

**R23. Les textes de la carte à 12 px minimum.** Effort S, impact 1.

Le problème : C12. On remplace les 15 `text-[0.6…]` par `text-xs` (12 px) et le ▼ par un anneau au sol (R6). On ajoute un test (comme `theme.test.ts`) qui refuse `text-[0.5`, `text-[0.6` et `text-[0.7` dans `src/empire/`.

**R24. Un vrai écran de chargement du plateau.** Effort S, impact 2.

Le problème : C20. Le `fallback` de `Suspense` montre :
- la silhouette du secteur de départ en SVG (déjà dessinable par `art/plateau`), un hexagone sable qui respire ;
- le toit d'or du fondaco au centre ;
- une barre fine sous le HUD.

Pendant ce temps, le HUD et la bannière de Lorenzo sont utilisables. À l'arrivée de la 3D, un fondu de 300 ms. Le fragment 3D et `kaykit.glb` sont préchargés **après** la première peinture (`<link rel="modulepreload">` et `fetch` à vide, au repos), et mis dans un cache dédié du service worker après la première visite : le visiteur qui revient ne doit plus attendre.

**R25. Une feuille du véhicule lisible et contextuelle.** Effort S, impact 2.

Le problème : C17. Les onglets portent un libellé court sous l'icône (Cale, Envoyer, Modules, Commandes). L'onglet ouvert par défaut dépend de l'état :
- à quai : Commandes ;
- en route : un résumé (route, temps restant, cale), pas les modules ;
- à quai dans une ville : « Rentrer ».

L'onglet Modules est masqué tant qu'aucun module n'est recherché (la Scuola), au lieu de 5 lignes verrouillées.

**R26. Le fondaco à sa place, et visible à tous les zooms.** Effort M, impact 3 (signalement 2, décision déjà prise).

Pour que la décision porte aussi en UX :
- le fondaco est sur **sa** tuile dorée, à au moins une tuile de toute ville. À vérifier dans `slots.ts` (`tileFault`) ; c'est un changement de `venice1450.map.ts` qui demande la décision sur la carte ;
- une **colonne de lumière dorée** très fine au-dessus du toit d'or, visible au palier région (R17), sert de repère « maison » comme le phare de Kingdom Two Crowns ;
- le nom « FONDACO CASA_390 » n'est plus coupé par les médailles (R6), et passe au-dessus du toit plutôt que dessous.

**R27. La première tuile à acheter : une offre, pas un cadenas.** Effort S, impact 2. Décision (règle d'achat).

Le problème : C23. Seules les tuiles **achetables maintenant** portent le liseré or, qui respire doucement. Les autres sont en verre neutre. Toucher une tuile verrouillée affiche un message court au-dessus de la tuile, dans la scène (« Casa 9 »), sans ouvrir de feuille. Toucher une tuile achetable ouvre une feuille avec un aperçu (les villes devinées en silhouettes de verre) et un seul bouton d'or « Acheter · 480 d ». Après l'achat, le verre se brise, la tuile tombe en place (300 ms) et ses villes se lèvent : la règle 8, « tout se voit ».

**R28. Des retours sonores et haptiques légers, désactivables.** Effort M, impact 1.

Solution : quatre sons courts, joués seulement après un geste du joueur (règle des navigateurs) : toucher d'un lieu (bois), départ (grelot de mule), arrivée (pièces), récolte (caisse). Ajouter `navigator.vibrate` de 10 à 20 ms sur Android pour le départ et l'arrivée. Coupés par défaut si `prefers-reduced-motion`, et réglables dans le profil.

**R29. Le retour arrière du téléphone suit les profondeurs.** Effort S, impact 2.

Problème : sur Android et dans une PWA, le bouton retour quitte l'application ou change de page, quelle que soit la profondeur ouverte. Chaque profondeur (feuille, domaine, mode viser) pousse une entrée d'historique (`history.pushState`), et `popstate` ferme la plus haute. C'est la même pile que pour Échap sur PC (`EmpireGame.tsx:222`), qui ferme aujourd'hui la feuille mais pas l'orbite (C15).

**R30. Les mesures UX à suivre.** Effort S, impact 2.

Avec `?perf=1` existant, et des événements anonymes côté serveur si le porteur l'accepte, on mesure :
- les touchers entre « ville touchée » et « mule partie » (cible 2) ;
- le temps entre ouverture de l'application et premier toucher utile (cible 5 s, ce qui suppose R24) ;
- le taux de « Livrer » réussis contre refusés ;
- l'usage de la couche d'information ;
- les fréquences d'images en pan sur un vrai téléphone (prérequis `plateau-reprise` § 7, suite 1). Sous 24 images/s en pan, l'inertie et le suivi paraîtront saccadés quoi qu'on fasse.

### Résumé des touchers par action clé

| Action | Aujourd'hui | Après |
| --- | --- | --- |
| Livrer une commande | 6 à 8 touchers + glisser (C13), ou 1 toucher qui envoie à vide | 2 touchers : ville, puis Livrer (R1) |
| Récolter | « Tout relancer » dans la bannière : 1 (bien) | 1 : bannière, ou caisse dorée dans le domaine (R9) |
| Bâtir un atelier | « + » en haut, puis liste, puis Bâtir : 3, sans savoir où | 3 : Maison, place libre, Bâtir, en voyant la place (R9) |
| Acheter un secteur | Tuile, puis feuille, souvent un cadenas | 2 : tuile qui respire, puis Acheter (R27) |
| Retrouver son fondaco | Aucun chemin fiable (C1) | 1 : Maison (R14), ou flèche de bord (R15) |
| Retrouver une mule | Pan à l'aveugle | 1 : jeton du HUD (R13) |

---

## 3. Questions au porteur

1. **Retour automatique** : après une livraison, la mule rentre-t-elle seule au fondaco (R4) ? Si oui, faut-il un réglage par mule pour les tournées à plusieurs arrêts des joueurs avancés ?
2. **Le compte à rebours de départ** (`departSeconds: 10`) : le supprimer dans « Livrer » et le remplacer par une annulation de 5 s dans le HUD (R3) ?
3. **Plusieurs commandes d'une ville, de marchandises différentes** : une même mule peut-elle les emporter en un « Livrer » (l'extension `empireDeliverOrders` de R1) ? Et peut-elle enchaîner deux villes sur la même route (Venise puis Padoue) ?
4. **Le glisser de la médaille** : le garder comme geste expert (R5), ou le retirer complètement avec la médaille (R6) ?
5. **« Recentrer » devient « Maison »** (R14), et le dézoom passe au double toucher et au pincement : d'accord ?
6. **La barre du bas** (R16) : Famille peut-elle quitter la barre pour laisser la place au « Bâtir » et à l'œil de la couche d'information ? Les pilules de bourse sur une ligne ?
7. **Vue du domaine** : caméra fixe sans pan (R9) ou petit pan permis ? Sortie par pincement vers l'intérieur : d'accord ? Le domaine des fondaci secondaires suit-il le même modèle, avec une flèche « fondaco suivant » ?
8. **Paliers de zoom** (R17) : accepter qu'au palier région les animaux deviennent des points lumineux et les caisses des phares ?
9. **Le fondaco à part** (R26) : faut-il déplacer Padoue, ou décaler le secteur de départ ? Cela touche `venice1450.map.ts` et la calibration (distances, donc durées de voyage). Faut-il revalider au simulateur de 24 mois ?
10. **Sons et vibrations** (R28) : souhaités ? Coupés par défaut ?
11. **Mesures d'usage** (R30) : accepte-t-on de compter des événements d'interface côté serveur, anonymes ?
12. **Tuiles à acheter** (R27) : ne border d'or que celles achetables maintenant, au risque de cacher l'horizon des achats futurs ?

---

## Les 10 recommandations les plus importantes

1. R2 (S) : corriger aujourd'hui le bouton d'or « Y envoyer un véhicule », qui envoie la mule à vide.
2. R1 (M) : livrer depuis la ville en 2 touchers (cartes de commandes cochables, un seul « Livrer · n lots · X d », mule choisie, chargée et partie), sur la base de `empireDeliver`/`autoDeliver`, déjà dans le moteur.
3. R4 et R3 (S) : la mule rentre seule après livraison, et plus de compte à rebours de 10 s au départ.
4. R6 et R21 (M) : supprimer la médaille et toucher l'animal 3D par le rayon, sans voler les touchers du fondaco.
5. R9 (L) : vue du domaine dans le même canvas (plongée de 600 ms, 19 tuiles, caisses dorées à toucher, « Tout récolter »), sortie par chevron, pincement, Échap ou retour ; l'orbite HTML disparaît.
6. R7 et R10 (M) : commandes en piles de caisses devant les villes ; à l'arrivée, les caisses tombent et des ducats volent jusqu'à la bourse du HUD.
7. R14 et R15 (S) : « Recentrer » devient « Maison » et ramène au fondaco (pas à Venise, et pas un dézoom), avec des flèches de bord pour le fondaco et les mules.
8. R11 et R12 (S) : la caméra cadre l'objet au-dessus de la feuille ouverte ; le suivi de la mule survit au pincement et s'arrête seul au bout de 2,5 s.
9. R13 et R8 (S) : jetons « mule en route » dans le HUD, et bouton œil pour la couche d'information, cachée aujourd'hui derrière un appui long.
10. R17, R20 et R24 (M) : paliers de zoom secteur / région avec niveau de détail, molette et pavé tactile corrects sur PC, et un vrai écran de chargement du plateau.
