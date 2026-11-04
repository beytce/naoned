# Audit game design : la carte 3D et la boucle de jeu (3 novembre 2026)

*Angle : game design et boucle sur la carte (rythme produire → charger → livrer → bâtir avec des voyages de 5 minutes et plus). Auteur : regard de game designer de jeux mobiles de gestion à sessions courtes (Hades' Star, Pocket City, SimCity BuildIt, Anno mobile). Aucun fichier du dépôt n'a été modifié.*

Sources lues : `BRIEF.md`, `CLAUDE.md`, `docs/CADRAGE-v3.md` (§ 2, § 3.3, § 3.4, § 4.1, § 12 ter), `docs/calibration.md` (dernières sections, dont « Les voyages longs et les petites tuiles »), `docs/plateau-reprise.md` (§ 6 à § 8), le moteur (`orders.ts`, `moves.ts`, `map.ts`, `workshops.ts`, `stores.ts`, `trade.ts`, `venice1450.empire.ts`), l'écran (`EmpireGame.tsx`, `OrdersPanel.tsx`, `VehiclePanel.tsx`, `map/logic.ts`, `next.ts`, `Guide.tsx`), le simulateur (`apps/simulator/src/empire/bots.ts`, `defaults.ts`) et toutes les captures (phone/, pc/, parcours/).

---

## 0. En une phrase

La carte 3D est belle et le passage aux voyages longs est le bon choix pour que la carte vive. Mais **le verbe central, « livrer », est aujourd'hui cassé dans le jeu** : le bouton de la ville envoie une mule à vide, la mule ne rentre pas seule, Lorenzo ne parle jamais des commandes, et la première livraison possible arrive six à dix heures après la fondation. Le simulateur, lui, croit que tout cela marche, et compte un peu trop de commandes. Il faut donc d'abord **réparer et automatiser le geste de livraison** (R1 à R4), puis **faire parler la carte** (R5 à R9), et enfin **recaler le simulateur** sur ce que vit vraiment le joueur (R20 à R23).

---

## 1. Constats prouvés

### A. La livraison dans le jeu tel qu'il est

**C1. « Y envoyer un véhicule » envoie une mule vide.** `EmpireGame.tsx` l. 258-268 (`sendable`) : le bouton or de la feuille d'une ville choisit la mule sélectionnée ou la première libre, puis appelle `empireMove` vers la ville, **sans rien charger**. Le chargement ne se fait que depuis le panneau du véhicule, à quai au fondaco (`VehiclePanel` → `LoadPane` → `empireLoadOrder`). Preuves : parcours `390x844-16-depart.png` (« Départ vers Padoue », soute **0/2**), puis `17-en-route.png` (0/2) et `18-arrivee.png` (« À quai : Padoue », **0/2**). Le joueur fait 5 minutes de route pour rien, et il croit avoir livré.

**C2. Une mule arrivée reste à la ville.** `moves.ts`, `arrive()` : `v.at = leg.to`, rien ne la ramène. Elle ne peut recharger qu'à quai à un fondaco (`dockedAt` refuse une ville). Le joueur doit donc penser à la renvoyer, ce qui prend encore 5 minutes et un geste de plus. S'il ferme le jeu, la session suivante commence par un **retour à vide de 5 minutes** avant de pouvoir charger. Capture `18-arrivee.png` : la mule reste plantée à Padoue.

**C3. Le simulateur suppose le contraire.** `bots.ts` l. 323-351 : à chaque session, toutes les places de soute (`landPlaces × roundsPerSession`, soit 1 tournée) sont chargées et payées, comme si chaque véhicule était au fondaco à l'ouverture. Le calibrage C (`calibration.md`, « une tournée par session : chargé au fondaco, il dessert ses villes et **rentre** avant la session suivante ») repose sur un retour que le jeu ne fait pas.

**C4. Aucune livraison n'est possible pendant la première session.** Pas de stock de départ (`settings.ts` `start` : capital, ateliers, véhicules ; `house.ts` l. 161-189). Les lots sont fixés en valeur (`lotOf` : `lotDucats` 400 × palier ÷ prix de référence) et ne dépendent pas du niveau de la Maison :

| Marchandise (Vénétie) | Référence | Palier | Lot | Production niveau 1 | Temps pour un lot |
| --- | --- | --- | --- | --- | --- |
| Argile | 3 d | brut ×1 | 133 | 8 par 30 min | **8 h 20** |
| Bois | 3 d | brut ×1 | 133 | 11 par 30 min | **6 h** |
| Planches | 10 d | fini ×3 | 120 (1 380 d) | 6 par 30 min, 10 bois par lot | **10 h**, et 200 bois |
| Briques | 10 d | fini ×3 | 120 | 6 par 30 min, 10 argile + 2 bois | **10 h**, et 200 argile |

Preuves : `14-commandes.png` (« Bois × 133 · 458,85 d »), `1b-padoue.png` (« Planches × 120 · 1 380 d »), `14b-charger.png` (« stock 0/133 » pour les deux commandes). La première paie arrive donc au mieux à la deuxième ou troisième session, et la règle d'or 7 (« quelques minutes ») n'est pas tenue pendant la prise en main : la première session n'a pas de livraison.

**C5. Le stock est le vrai goulot du début, pas les mules.** Venise (taille 5) : une commande toutes les 255 min, jusqu'à 3 ; Padoue (taille 3) : toutes les 450 min, jusqu'à 2 (`venice1450.empire.ts` l. 285-287). Cela fait environ **9 commandes par jour, soit environ 1 150 unités demandées**, contre environ 900 unités par jour pour les trois ateliers de niveau 1 réunis (une part du bois part déjà à la scierie). Avec 2 mules de 2 places, il y a 4 places pour 5 commandes au plafond : les mules suffisent. Ce qui manque, c'est la marchandise. Rien, à l'écran, ne relie une commande à l'atelier qui la nourrit, ni ne dit quand elle sera prête.

**C6. Une commande impossible bloque une petite ville pendant des heures.** Les villes de taille 1 et 2 ont **une seule place** (`cap` 1, 1, 2, 2, 3). La marchandise est tirée au hasard parmi celles que font les ateliers (`drawOrder`, `draw(... seq) % goods.length`). Si le tirage tombe sur des planches (10 h de scierie), la ville est pleine et ne demande plus rien pendant 10 h ou plus (`cityOrdersAt` : au plafond, rien de neuf). Le simulateur ne voit pas ce blocage : il répartit les commandes également entre les marchandises, et une commande non livrée disparaît à la session suivante (`deliverOrders`, `goods.forEach`).

**C7. Le simulateur compte trop de commandes avec les intervalles × 5.** `bots.ts` l. 300-306 : `ordersSince = min(cap, max(1, floor(sinceHours × 60 / every)))`. Le `max(1, …)` donne **au moins une commande par ville et par session**, même si l'intervalle n'est pas écoulé. Pour un assidu (sessions à 8, 12, 18 et 22 h, écarts de 4 à 10 h), une ville de taille 1 (une commande toutes les 20 h) lui en donne 4 par jour au lieu de 1,2, et Venise (255 min) une à chaque session de 4 h au lieu de 0,94. Avec les anciens intervalles de 2 h, ce plancher ne mordait presque jamais. Avec les intervalles × 5, il mord tout le temps, et le calibrage C est **optimiste**, surtout pour les assidus et les petites villes. Le reste perdu à chaque session (`floor`, sans report du minuteur) fausse dans l'autre sens les longues absences.

**C8. Lorenzo ne parle jamais des commandes.** `next.ts` : les étapes sont ramasser, relancer, Casa, bâtir, monter, vendre, encaisser, attendre. Il n'y a pas d'étape « livrer une commande ». Le seul « Livrer » de Lorenzo est l'étape « vendre » de l'ancien carnet régional (`sell` avec `deliver: q.asked` → `empireDeliver` → `autoDeliver` sur une marchandise). Preuves : `15-glisser.png` et `19b-au-plus-loin.png` (« Livrez 9 draps aux villes · Livrer », alors qu'aucune ville ne demande de drap et que la Maison n'en fabrique pas). `autoDeliver` échoue alors avec `no_liquidity` (`moves.ts` l. 260), un message sans rapport avec la situation. L'étape « attendre » (`next.ts`, étape 8) ignore aussi les arrivées des véhicules et la prochaine commande : « Tout tourne. Prochain lot à 21 h 38 » (`12-attente.png`), mais rien sur la mule ni sur Venise.

**C9. Un moteur de livraison automatique existe déjà, mal branché.** `autoDeliver` (`moves.ts` l. 219-262) sait déjà choisir un véhicule libre à quai, charger les commandes d'une marchandise vers une ou plusieurs villes et partir aussitôt. C'est presque exactement la décision du porteur (« le jeu choisit la mule libre, la charge et l'envoie »), sauf qu'il est limité à une marchandise et qu'il est appelé depuis le vieux chemin « vendre ».

**C10. « Partir » est en or même soute vide.** `VehiclePanel.tsx` : le bouton `go` (✓) est en or dès qu'un départ attend, sans regarder la soute (`16-depart.png` : ✓ en or, 0/2). Il n'y a ni avertissement ni « Partir à vide ? ».

### B. La carte comme outil de décision

**C11. Les infos de jeu sont absentes du décor.** Sur `phone/1-depart.png` et `parcours/12-attente.png`, on ne sait pas, sans toucher : combien de commandes attend chaque ville (seul un fin anneau vert, illisible dès qu'on dézoome : `4-dezoom.png`, `19b`), lesquelles sont livrables, si des lots sont prêts au fondaco, ni quand une mule arrive. Le `§ 6.3` de `plateau-reprise.md` prévoyait déjà ces signaux (caisse dorée, onde des villes pleines, heure d'arrivée, pastille « lots prêts ») : aucun n'est dans la 3D.

**C12. L'or est partout, il ne signale plus rien.** Toutes les tuiles de verre de l'inconnu ont un liseré doré (`1-depart.png`, `4b-secteur.png`, `pc/1-depart.png`). Or la palette réserve l'or à « ce qui est à vous et à l'action » (`plateau-reprise.md` § 1.2). Le joueur ne voit pas quel secteur il peut acheter maintenant, et ce qu'il y gagnerait.

**C13. Acheter un secteur n'apporte pas de commandes, et rien ne le dit.** `unlockCell` (`map.ts` l. 263-276) révèle le secteur, mais les commandes ne viennent que des villes **à portée d'un fondaco** (`ordersOf` → `citiesCovered`, rayon `reach` 36 + 8 par niveau). Trévise est à 42 unités du fondaco (`calibration.md`), hors de portée au niveau 1. Un joueur qui achète le secteur de Trévise pour 300 d s'attend à de nouvelles commandes, et n'en reçoit aucune. `13-case.png` (« ses villes se découvrent à l'achat ») ne dit pas qu'il faudra aussi la portée.

**C14. Il n'y a pas de prime de distance, contrairement au cadrage.** CADRAGE-v3 § 3.4 : « chaque unité est payée à l'arrivée, avec une prime pour la taille de la ville et la distance ». Dans le code, `drawOrder` paie la référence × (1 + `premiumBps`), et `arrive` y ajoute `orderBonus`. Il n'y a ni taille ni distance. Avec des voyages de 5 à 22 minutes (`calibration.md` : une ville à 120 unités en 22 min), une ville lointaine paie autant qu'une proche pour quatre fois le temps.

**C15. Le temps de trajet se lit en « lieues », pas en minutes.** `LoadPane` affiche « pour Padoue · 11 lieues » (`14b-charger.png`), et le tri « Plus proches / Plus lointaines » trie aussi en lieues. Le joueur pense en minutes et en heure d'arrivée.

**C16. Le cadrage dit « ce qui n'est pas livré disparaît », le code garde la commande.** CADRAGE-v3 § 3.4 contre `orders.ts` : une commande reste jusqu'à être chargée, et la ville pleine s'arrête. Le code est fidèle à la règle d'or 3, et c'est le cadrage qui est à corriger. Il faut le noter, car la conception du flux en dépend (une commande ne périme jamais, donc on peut la « promettre »).

### C. L'écran et les règles d'or

**C17. Le revenu du jour affiche 0.** « 0 d par jour » sous le nom, sur toutes les captures, même après une livraison en e2e. C'est une donnée morte en tête d'écran.

**C18. Il reste des textes de moins de 12 px.** `VehiclePanel.tsx` : `text-[0.625rem]` (10 px, le compte à rebours de la barre) et `text-[0.6875rem]` (11 px : arrêts, tris, consignes). Cela enfreint la règle « aucun texte < 12 px ».

**C19. Les ateliers en orbite se superposent aux vraies tuiles du monde.** `phone/2-fondaco.png`, `pc/2b-fondaco-touche.png` : la place libre « Bâtir » tombe sur une tuile entre Venise et Padoue, la scierie et le camp sur des tuiles de verre. Le joueur ne sait plus ce qui est le monde et ce qui est le domaine. C'est la raison de fond de la décision « vue du domaine ».

**C20. L'arbitrage commande contre Casa est invisible.** La Casa 4 demande 60 planches et 60 briques (`CASA`, `venice1450.empire.ts` l. 18). Une seule commande de planches en mange 120. Ni la feuille de la ville ni le chargement ne le disent (`keptOf` existe dans `next.ts` mais ne sert qu'à la vente). C'est pourtant **la décision la plus intéressante du début de partie**, et elle est cachée.

---

## 2. La boucle visée : une session type de 3 minutes (Casa 3, deux mules, trois ateliers)

Pour mesurer les recommandations, voici ce qu'une session devrait contenir. Les numéros renvoient aux recommandations.

| Temps | Ce que voit le joueur | Geste | Décision ? |
| --- | --- | --- | --- |
| 0:00 | **Le retour du marchand en 3 s** : les mules rentrent sur leurs routes, des pièces jaillissent de Venise (« +920 »), la caisse monte (R9) | aucun | non |
| 0:05 | Le fondaco a des caisses empilées à sa porte et une cheminée éteinte (atelier à l'arrêt) (R7) | toucher le fondaco → vue du domaine | non |
| 0:15 | Domaine : la scierie montre « Padoue attend 120 · 84/120 · prêt vers 14 h 10 » (R11) | « Tout récolter et relancer » (or) | non |
| 0:30 | La scierie est le goulot (en rouge sur la chaîne) : la monter (300 d) ou garder pour la Casa 4 ? | monter, ou non | **oui** |
| 0:50 | Retour à la carte : Venise a 2 caisses dont une qui luit d'or (livrable) (R5) | toucher Venise | non |
| 1:00 | Feuille de Venise : « Livrer 1 commande · +459 d · arrivée 14 h 06 » ; la seconde, « briques : manque 40, prêt vers 16 h » ; l'avertissement « ces briques manqueront à la Casa 4 » (R1, R12) | « Livrer » | **oui** (Casa ou paie ?) |
| 1:10 | La mule part dans 10 s, sa route en pointillé d'or ; Padoue luit aussi : « Ajouter Padoue à la tournée · +5 min · +1 380 d » (R3) | ajouter, ou non | **oui** (temps contre paie) |
| 1:40 | Le secteur de Trévise est seul en or : « Trévise : 1 commande toutes les 12 h, à portée avec un fondaco de niveau 2 » (R14) | acheter, ou plus tard | **oui** |
| 2:30 | En fermant, la ligne de Lorenzo dit : « Mule de retour à 14 h 21 · Venise pleine vers 17 h » (R8) | fermer | non |

Cela fait **quatre vraies décisions en moins de trois minutes**, et une raison claire de revenir (une heure dite). Aujourd'hui, la même session contient un seul geste utile (« Tout relancer »), une mule envoyée à vide et aucune heure de retour.

---

## 3. Recommandations

Légende : **Effort** S (moins d'un jour), M (2 à 4 jours), L (une semaine et plus). **Impact** de 1 à 3. **Décision** : oui, si elle demande l'avis du porteur. Tout changement d'équilibrage est marqué **« à valider au simulateur »**.

### A. Le geste « Livrer depuis la ville » (décision du porteur, détaillée)

#### R1. « Livrer » depuis la ville : les règles complètes
- **Problème** : C1, C2, C8, C9. Le geste central est cassé, et la décision du porteur n'est pas encore écrite comme une règle.
- **Solution** : une commande moteur `empireDeliverCity { city }` (pure, dans `packages/engine/src/empire/moves.ts`, testée sur la fixture), qui généralise `autoDeliver` à toutes les marchandises d'une ville :
  1. **Les commandes prises** sont celles de la ville dont le lot entier est en stock dans un fondaco qui la sert (`postsServing`). Elles sont prises de la plus chère à la moins chère, sans jamais de lot partiel (une commande est un lot, une place).
  2. **Le véhicule** est choisi parmi ceux qui sont à quai à ce fondaco, libres, ni réparés, ni à la Porta, dans cet ordre :
     - (a) un véhicule qui est déjà dans sa fenêtre de départ de 10 s et qui a encore de la place (il fait alors la tournée, voir R3) ;
     - (b) le plus petit qui prend toutes les commandes prêtes de la ville (on garde les grands pour les grandes villes) ;
     - (c) sinon, le plus grand, rempli par paie décroissante.

     À égalité, celui qui porte le plus de prime (`orderBonus`, module de convoi, Livre de route), puis l'identifiant.
  3. **La route** : fondaco → ville → **retour au fondaco** (R2). On part 10 s après (`departSeconds`), ✓ pour partir tout de suite.
  4. **Une transaction unique** charge et met en route, et la réponse contient le plan (véhicule, arrêts, heure d'arrivée, paie attendue) pour l'animation.
- **À l'écran** (`OrdersPanel.tsx`) : un seul bouton or, « Livrer 2 commandes · +1 839 d · arrivée 14 h 06 ». La vignette de la mule choisie est à gauche du bouton, et un appui sur elle propose les autres véhicules possibles (choix manuel, pour l'expert). Sur la carte, la route s'allume en pointillé d'or avant le départ.
- **Effort** M. **Impact** 3. **Décision** : non (c'est la décision du porteur), sauf la règle (b), à confirmer.

#### R2. Le retour automatique au fondaco
- **Problème** : C2, C3. La mule reste à la ville, le joueur doit la renvoyer, et le simulateur suppose le contraire.
- **Solution** : chaque livraison ajoute un dernier arrêt, « retour au fondaco d'où elle est partie » (dans `moveVehicle`, ou en champ `returnTo` du véhicule lu par `settleMoves` à l'arrivée au dernier arrêt de ville). Pour un transfert d'un fondaco à l'autre, il n'y a pas de retour. Le panneau du véhicule garde une bascule « Rester à la ville » pour l'expert, éteinte par défaut. **Ce n'est pas un changement d'équilibrage**, puisque le simulateur suppose déjà le retour : c'est le jeu qu'on aligne sur le simulateur.
- **Effort** S. **Impact** 3. **Décision** : oui (le défaut « retour », et la bascule).

#### R3. La tournée de plusieurs villes, sans nouvel écran
- **Problème** : le moteur permet 15 arrêts (`maxStops`), mais l'enchaînement par glisser de médaille est retiré (décision du porteur), et il faut une façon simple de grouper.
- **Solution** : **la fenêtre de 10 s devient la fenêtre de tournée**. Pendant qu'une mule attend de partir, les villes servies par son fondaco qui ont une commande prête et qui tiennent dans sa soute luisent. Toucher l'une d'elles, puis « Livrer », l'ajoute à la même mule (règle R1, cas a). La feuille dit alors « Ajouter à la tournée de la mule · +5 min · +1 380 d ». Le moteur ordonne les arrêts au plus court (au plus 4 villes : on essaie toutes les permutations sur `roadLength`), et le retour reste le dernier arrêt. La fenêtre se prolonge de 10 s à chaque ajout, jusqu'à 30 s au plus. Plus tard, avec le chariot (5 places) et le burchio (6), une proposition « Meilleure tournée » (la paie à la minute la plus haute) s'affiche sous le bouton, que le joueur prend ou retouche : c'est là que vit la profondeur à la Hades' Star.
- **Effort** M. **Impact** 2 (3 au milieu de partie). **Décision** : oui (la fenêtre prolongée, la proposition de tournée).

#### R4. Les cas d'échec du bouton « Livrer »
- **Problème** : aujourd'hui, un échec mène à une mule partie à vide ou à un message `no_liquidity` incompréhensible (C1, C8).
- **Solution** : le bouton or n'apparaît que si une livraison est possible. Sinon, il est remplacé par une ligne d'état sans or, et par au plus une action secondaire :

  | Cas | Ce qu'on lit | Action secondaire |
  | --- | --- | --- |
  | Le stock manque pour toutes les commandes | « Rien de prêt · bois 84/133, prêt vers 14 h 10 » (l'heure se calcule depuis la file de l'atelier) | « Voir l'atelier » (ouvre le domaine sur l'atelier) |
  | Le stock est là, mais toutes les mules sont parties | « Vos 2 mules sont en route · la première rentre à 14 h 21 » | « Livrer à son retour » (R13), ou « Acheter une mule » si la Remise a une place |
  | Une mule est à la Porta ou en réparation | idem, avec la cause | — |
  | Le stock est là, mais il est réservé à la Casa | le bouton reste en or, avec l'avertissement de R12 | — |
  | La ville est vue mais hors de portée | « Hors de portée de votre fondaco (portée 36, ville à 42) » | « Monter le fondaco » (portée +8) |
  | La ville est pleine et rien n'est prêt | « Padoue est pleine : rien de neuf tant que vous ne livrez pas » (règle d'or 3, dite sans culpabiliser) | « Voir l'atelier » |

  Une mule ne part **jamais à vide** depuis une ville. Le ✓ du panneau du véhicule n'est en or que si la soute porte quelque chose ; sinon, il est neutre, avec un « Partir à vide ? » (C10).
- **Effort** S. **Impact** 3. **Décision** : non.

### B. Ce que la carte montre pour guider

#### R5. Les commandes dans le décor : une caisse par commande
- **Problème** : C11. L'anneau HTML est illisible, et le porteur le veut dans le décor.
- **Solution** : les plafonds sont maintenant très petits (1, 1, 2, 2, 3), ce qui est une chance : **une caisse posée sur la tuile de la ville par commande**, avec la marque de la marchandise (`GoodsMark`) frappée sur la face avant. On voit donc d'un coup d'œil « Venise veut 2 argiles et 1 planche ». Trois états, sans texte :
  - une caisse **en bois** : la commande attend, et le stock manque ;
  - une caisse **cerclée d'or qui luit doucement** : la commande est livrable maintenant (c'est la seule chose qui luit en or sur la carte, R6) ;
  - **la ville pleine** : le drapeau du campanile se lève et la tuile s'éclaire sur son pourtour (lagune, pas or : plein n'est pas une action).

  Au dézoom (sous le seuil où l'on retire déjà le décor, `Board3D` au-dessous de 3,6 px par unité), les caisses laissent la place à une colonne de lumière unique au-dessus de la ville : dorée s'il y a du livrable, lagune si la ville est pleine, rien sinon. Où le faire : `map3d/scene.ts` (un thème `crates` pour la tuile de ville) et `Board3D.tsx` (une instance par commande, mise à jour par `view.orders`, et non par l'horloge).
- **Effort** M. **Impact** 3. **Décision** : non (décision du porteur, détaillée).

#### R6. Une seule chose luit en or : ce qu'on peut faire maintenant
- **Problème** : C12. L'or est partout.
- **Solution** : une règle de signalétique écrite dans `docs/design.md` : **sur la carte, l'or désigne une action possible tout de suite, et rien d'autre** que le toit du fondaco. Ce qui luit en or :
  - les caisses livrables (R5) ;
  - les lots prêts au fondaco (R7) ;
  - **un seul** secteur achetable, le plus utile (R14) ; les autres achetables gardent un liseré clair, les non-achetables pas de liseré du tout ;
  - la route d'une livraison en préparation (R1).

  On retire le liseré doré de toutes les tuiles de verre (`scene.ts`, inconnu).
- **Effort** S. **Impact** 3. **Décision** : oui (une règle de palette).

#### R7. Le fondaco dit son état sans qu'on le touche
- **Problème** : C11. Il n'y a ni « lots prêts » ni « atelier arrêté » visibles sur la carte.
- **Solution** : des signaux propres au monde (diégétiques) sur la tuile du fondaco :
  - **des caisses qui s'empilent à sa porte**, jusqu'à 3 hauteurs, selon les lots prêts à récolter (en part de la file de 12 h) ; elles luisent d'or quand il y a de quoi récolter ;
  - **la cheminée fume tant que tous les ateliers tournent**, et s'éteint quand l'un d'eux attend une relance ou des intrants ;
  - **les mules à quai** se tiennent devant la porte, bâtées si elles sont chargées.

  Aucune pastille HTML. Où : `Board3D.tsx` (le fondaco), à partir de `readyLots` et `wantsRelaunch` (déjà dans `empire/logic.ts`).
- **Effort** S à M. **Impact** 2. **Décision** : non.

#### R8. L'heure d'arrivée, et ce qui revient, toujours dits
- **Problème** : C8 (l'attente ignore les véhicules), C11, et la médaille qui suit la mule, que le porteur veut retirer.
- **Solution** :
  - **sur la carte** : pendant un trajet, l'heure d'arrivée (« 14 h 06 ») est écrite **sur la tuile de destination**, au sol, en petites capitales (12 px au moins). La mule laisse un léger nuage de poussière sur la route. Il n'y a plus de médaille : on touche l'animal lui-même (une zone de toucher invisible de 44 px autour de lui, dans le lancer de rayon de `Board3D.hit`) ;
  - **à l'arrivée** : des pièces jaillissent de la ville, un « +1 380 » s'élève puis va vers la bourse en haut à droite, qui s'incrémente (règle d'or 8). Au retour au fondaco, la mule se range devant la porte ;
  - **dans la ligne de Lorenzo** (`next.ts`, étape `wait`), toutes les horloges sont prises : le prochain lot, la fin du prochain chantier, **le retour de la prochaine mule**, et **la prochaine ville pleine**. Par exemple : « Mule de retour à 14 h 21 · Venise pleine vers 17 h » ;
  - **dans la bourse** : « +1 839 en route » en petit sous les ducats tant qu'une livraison roule. Le joueur sait ce qui l'attend (C17 : on remplace par la même occasion le « 0 d par jour » par le revenu des dernières 24 h, ou on ne l'affiche pas).
- **Effort** M. **Impact** 3. **Décision** : oui (le retrait de la médaille, déjà demandé ; le « en route » dans la bourse).

#### R9. Le retour du marchand, joué sur la carte
- **Problème** : avec des voyages de 5 minutes et des sessions de 3 minutes, **le joueur ne voit presque jamais ses mules arriver**, et la récompense (la paie) tombe hors de sa vue. C'est le moment fort de la boucle, et il est perdu.
- **Solution** : à l'ouverture, si des arrivées ont eu lieu depuis la dernière visite, **3 secondes de rejeu** : les mules parcourent en accéléré la fin de leur route, les pièces jaillissent des villes livrées, et la bourse monte. On le coupe d'un toucher, et il est coupé aussi sous `prefers-reduced-motion`. Une petite carte résume ensuite : « Pendant votre absence : 3 livraisons, +2 300 d · Venise s'est remplie ». Cela reprend le « retour du marchand » de CADRAGE-v3 § 4.2, mais sur la carte, pas en texte. Où : `EmpireGame.tsx` (à la première lecture de la vue, on compare avec un instantané `localStorage` des véhicules ; le serveur peut aussi renvoyer `arrivalsSince`).
- **Effort** M. **Impact** 3. **Décision** : non.

#### R10. Le temps en minutes et en heure, jamais en lieues
- **Problème** : C15.
- **Solution** : dans le chargement, la feuille de la ville et le panneau du véhicule, « Padoue · 5 min · arrivée 14 h 06 ». Les tris deviennent « Plus payées / Plus rapides ». On garde la lieue pour la portée seulement.
- **Effort** S. **Impact** 2. **Décision** : non.

### C. La vue du domaine (décision du porteur, côté jeu)

#### R11. La vue du domaine : ce qu'on y fait, comment elle se lit
- **Problème** : C19 et le signalement n° 1 du porteur (les ateliers ne s'affichent plus). Plus profondément, rien ne relie la production aux commandes (C5).
- **Solution** :
  - **L'entrée** : toucher le fondaco fait plonger la caméra (0,6 s) dans une petite scène à part. Le fondaco est au centre, les places d'atelier en anneau sur leurs tuiles, **rangées dans l'ordre de la chaîne** (glaisière → briqueterie, coupe de bois → scierie), et de **petits chemins de terre** portent des caisses de l'une à l'autre quand une chaîne tourne (le bois qui va à la scierie). On voit la chaîne au lieu de la lire.
  - **Chaque tuile d'atelier** montre son état sans texte :
    - il fume et s'anime en travaillant ;
    - une pile de caisses monte avec les lots prêts ;
    - à l'arrêt, il est gris et sans fumée ;
    - en manque d'intrants, une caisse vide est posée à côté ;
    - un chantier est entouré d'échafaudages, avec un minuteur.

    Le nom et le niveau sont écrits dessous, à 12 px au moins.
  - **Le lien avec les commandes** (c'est le cœur) : sur chaque atelier, de petits fanions des villes qui attendent sa marchandise, avec la jauge du lot (« Padoue · 84/120 · vers 14 h 10 »). L'atelier qui retient le plus de paie est le **goulot** : il est cerclé de cinabre clair et porte « Monter : +130 % ». Le joueur voit où investir.
  - **Les actions** : une seule en or, « Tout récolter et relancer » (`empireRelaunchAll`), présente seulement s'il y a quelque chose à faire. Toucher un atelier ouvre sa feuille (monter, recette, modules). Une place libre affiche « Bâtir ici », avec en tête la suggestion qui sert le mieux les commandes et la prochaine Casa (la logique `build` de `next.ts`). Les places fermées sont en verre, avec « Casa 5 ».
  - **La porte du domaine** : des caisses prêtes et la mule à quai. Un raccourci « 2 commandes prêtes · Livrer » ramène à la carte avec la tournée proposée (R1, R3).
  - **La sortie** : le bouton rond en bas à gauche devient « Carte » (à la place de « Recentrer »), ou on pince pour dézoomer, ou on balaie vers le bas. On ressort sur la carte, centrée sur le fondaco.
  - **Le stock** : un entrepôt à côté du fondaco, une pile par marchandise. En le touchant, on voit le détail et ce qui est réservé à la Casa (R12).
- **Effort** L. **Impact** 3. **Décision** : oui (l'ordre des ateliers par chaîne, le goulot cerclé, le bouton « Carte »).

#### R12. Montrer l'arbitrage entre commande et Casa
- **Problème** : C20.
- **Solution** : dans la feuille de la ville et dans le domaine, une ligne simple quand livrer ferait descendre le stock sous le besoin de la prochaine Casa (`keptOf`, déjà dans `next.ts`) : « Ces planches manqueront à la Casa 4 (60) · prêtes à nouveau vers 18 h ». Cela n'empêche jamais de livrer. Dans la feuille de la Casa, le pendant : « 60 planches : 48 en stock, 120 promises à Padoue ».
- **Effort** S. **Impact** 2. **Décision** : non.

#### R13. « Livrer au retour » : promettre une commande à une mule en route
- **Problème** : avec des voyages de 10 minutes aller-retour, le cas « tout est parti » devient courant au milieu de partie. Sans promesse, le joueur doit revenir au bon moment, ce qui contredit la règle d'or 7.
- **Solution** : une intention gardée sur le véhicule (`v.next = { city }` dans le moteur) : à son retour au fondaco, il charge les commandes prêtes de cette ville (selon les règles de R1) et repart. La promesse se voit : un petit fanion de la ville sur la mule. On l'annule d'un geste. Il n'y a qu'une promesse par véhicule et pas de chaîne de promesses, pour ne pas en faire un automate qui joue seul. Cela se règle paresseusement à la lecture, comme les arrivées (`settleMoves`).
- **Effort** M. **Impact** 2. **Décision** : oui (c'est une automatisation : à doser, voir Q3). **À valider au simulateur** : elle ajoute au plus une tournée par session et par véhicule pour qui revient peu.

### D. La place à part du fondaco

#### R14. La place du fondaco, la portée et les villes servies : rendre le choix lisible et stable
- **Problème** : le signalement n° 2 du porteur, C13, et un fait de calibrage : **le point du fondaco change tout**. `calibration.md` (§ « La flotte bornée par la Remise ») : un point à 9 unités à l'est, qui change les villes à portée, repousse la Casa 18 de 382 à 692 jours. Aujourd'hui, avec les petites tuiles, il n'existe **qu'une seule place possible** dans le secteur de Venise.
- **Solution, côté règles** :
  1. **Un invariant** : quel que soit le dessin retenu pour que le fondaco ne soit plus collé aux villes, il garde **exactement les mêmes villes à portée à chaque niveau** (Venise et Padoue au niveau 1, Trévise au niveau 2, etc.), et des distances par la route **égales à 10 % près** vers Venise et Padoue (environ 5 minutes chacune). Venise ne doit pas devenir « la ville proche » et Padoue « la lointaine » sans raison de jeu.
  2. **Deux dessins possibles**, à choisir par le porteur :
     - **A. Le fondaco sur la terre ferme, à Mestre** : une tuile de la couronne du secteur de Venise, du côté de la terre, avec une tuile de campagne libre tout autour. On écarte Padoue d'une tuile vers l'ouest pour garder le vide. Ce dessin est historiquement juste (la Maison est un fondaco de terre ferme) ;
     - **B. Le fondaco dans un secteur à lui**, voisin de celui de Venise et sans ville, comme « secteur de départ ». Le rayon de base `reach.base` s'ajuste pour garder les mêmes villes. Le fondaco a toute une couronne de tuiles libres autour de lui, ce qui sert la vue du domaine et la lisibilité.
  3. **La portée devient un objet du monde** : en touchant le fondaco, un anneau peint au sol, avec les villes servies cerclées et les villes vues mais hors de portée barrées d'un trait. La feuille d'un secteur à acheter dit ce qu'il apporte : « Trévise · 1 commande toutes les 12 h · **hors de portée** : fondaco de niveau 2 (+8) », ou « à portée : +1 commande toutes les 12 h ».
  4. **Le prochain pas d'expansion** est le seul secteur en or (R6) : celui qui ajoute le plus de commandes à portée par ducat.
- **Effort** M (dessin et règles), plus L pour le dessin B. **Impact** 3. **Décision** : oui (A ou B). **À valider au simulateur** : toute nouvelle place, même en gardant le même ensemble de villes, change les distances par la route, et donc le temps de tournée.

#### R15. Le fondaco seul en or, et seul à son échelle
- **Problème** : signalement n° 2 (le fondaco se noie entre les villes).
- **Solution, côté jeu** : le fondaco est le seul objet « à vous » au début : la seule tuile dorée, le seul toit d'or, et un peu plus grand que les villes de taille 3. Sa tuile porte un petit quai, où les mules se rangent (R7). Les villes, elles, sont des destinations : bleu de leurs toits, caisses, drapeau. Ce contraste de rôle (chez moi contre chez eux) est la lecture qu'attend un joueur de Hades' Star ou de Pocket City.
- **Effort** S. **Impact** 2. **Décision** : non.

### E. La fluidité de la boucle

#### R16. Lorenzo et la « prochaine étape » parlent de livraisons
- **Problème** : C8.
- **Solution** : dans `next.ts`, une étape `deliver` entre « relancer » et « Casa » : « Venise attend votre argile : livrez-la · +459 d », dont le bouton or fait `empireDeliverCity` (R1). On retire le « Livrer » de l'ancien carnet régional (`sell` avec `deliver`), qui pointe vers des marchandises que personne ne commande. Après la Casa 2, où Lorenzo se retire (décision du porteur), le « ? » dit la même étape en mots, et la carte la montre par l'or (R6) sans bouton qui joue à la place du joueur.
- **Effort** S. **Impact** 3. **Décision** : non (conforme au § 12 ter).

#### R17. La première livraison dans la première session
- **Problème** : C4. Le verbe central n'est pas jouable pendant la prise en main.
- **Solution** (au choix du porteur) :
  - **a.** un **stock de départ** au fondaco, qui couvre exactement la première commande de Padoue et celle de Venise (par exemple 133 argiles et 133 bois) : la première session voit partir la mule, et la paie tombe 5 minutes plus tard, ce qui fait revenir le joueur dans la foulée ;
  - **b.** des **premières commandes à la taille du débutant** : les deux premières commandes de chaque ville servie font un lot réduit (un quart), payé au même prorata ;
  - **c.** une première commande **garantie dans une marchandise brute** (jamais des planches ou des briques au premier tirage).

  Le tutoriel devient : relancer → livrer (on voit la mule partir sur la route) → bâtir la briqueterie avec la paie. **À valider au simulateur** (a ou b changent les Casa 2 à 4 de quelques heures).
- **Effort** S. **Impact** 3. **Décision** : oui.

#### R18. Plus de commande qui bloque une petite ville
- **Problème** : C6.
- **Solution** (au choix) :
  - **a. Le tirage pondéré** par la capacité : la marchandise d'une commande est tirée en proportion de ce que la Maison en produit par jour (`orderGoodsOf` × rendement), ce qui rend une commande de planches rare tant que la scierie est petite ;
  - **b. Le lot à la mesure** : un lot plafonné à environ 6 h de production de la Maison pour sa marchandise (au moins 1), payé au prorata ;
  - **c. « Refuser » une commande** depuis la feuille de la ville, sans coût : elle s'en va, et la suivante vient après la moitié de l'intervalle. Un geste rare, que le jeu ne pousse jamais.

  Ma préférence va à a + c : a pour ne pas frustrer, c pour laisser une issue lisible. **À valider au simulateur** (a et b changent le revenu du début ; c ajoute des commandes pour qui revient souvent).
- **Effort** S (a, c) à M (b). **Impact** 2. **Décision** : oui.

#### R19. Des notifications choisies (PWA), une par horloge, jamais plus
- **Problème** : avec des chantiers de plusieurs heures et des villes qui se remplissent en 4 à 20 h, le joueur ne sait pas quand revenir. La règle d'or 7 dit d'aider sans obliger.
- **Solution** : des notifications à cocher dans la feuille de la Maison, éteintes par défaut : « Vos mules sont rentrées », « Venise et Padoue sont pleines », « Le chantier de la Casa est fini ». Au plus une notification par fenêtre de 3 h, aucune la nuit (heure de Venise), aucune n'est une injonction (« … quand vous voudrez »).
- **Effort** M (service worker, abonnement serveur). **Impact** 2. **Décision** : oui.

### F. L'équilibrage et le simulateur (les risques des voyages longs)

#### R20. Corriger le compte des commandes au simulateur, puis revalider C
- **Problème** : C7 (le plancher `max(1, …)`, le reste perdu), C6 (le blocage non modélisé), C3 (le retour supposé).
- **Solution** : dans `apps/simulator/src/empire/bots.ts`, tenir par ville le même état que le jeu (`next`, `seq`, `list`) en appelant directement `cityOrdersAt` / `takeOrder` du moteur (règle CLAUDE.md : la même logique pour le serveur et le simulateur), avec le même tirage de marchandise. Une commande non livrable reste et bloque. Puis relancer les 3 graines du scénario C. Mon pronostic : la part des commandes et le calendrier de la cohorte assidue baissent, et les cibles « prochain palier » et « première bande » se décalent. **À valider au simulateur** (c'est l'objet même de la recommandation), et à noter dans `docs/calibration.md`.
- **Effort** M. **Impact** 3. **Décision** : non (c'est une correction du modèle), mais les résultats lui reviennent.

#### R21. Une prime de distance, ou acter son retrait
- **Problème** : C14. Sans prime, la portée qui grandit (niveaux du fondaco) n'apporte des villes lointaines qu'au prix d'un temps perdu. Pour un joueur fréquent, la tournée lointaine est un mauvais choix.
- **Solution** : soit une prime de 1 % par minute de route au-delà de 5 minutes, plafonnée à +25 % (dans `drawOrder`, sur la distance par la route du fondaco qui sert, calculée à la prise de la commande), soit écrire dans CADRAGE-v3 § 3.4 que la distance ne paie pas. La prime fait de « Plus rapide ou plus payée ? » une vraie décision (R3). **À valider au simulateur**.
- **Effort** S. **Impact** 2. **Décision** : oui.

#### R22. Surveiller l'achat au marché pour livrer
- **Problème** : une commande paie la référence × 1,15 (`premiumBps` 1 500), et l'achat à la Dogana coûte la référence × pression × 1,03 (`taxBps` 300 ; `buyAt`). Dans un monde peuplé (profondeur `depthBase` 20 + 3 par Maison), acheter un lot entier au marché pour le livrer peut rapporter environ 10 % sans rien produire. C'est borné par les plafonds, mais cela vide le sens « produire → livrer ».
- **Solution** : mesurer au simulateur une Maison « négociante » qui achète pour livrer. Si c'est rentable, soit marquer le stock acheté comme non livrable (complexe), soit demander que la prime de commande ne s'applique qu'à ce qui est produit (simple : lot produit contre lot acheté, tenu par `stock_movements`), soit relever la taxe d'achat au-dessus de la prime. **À valider au simulateur**.
- **Effort** S (mesure) à M. **Impact** 2. **Décision** : oui.

#### R23. Le rythme naturel : l'écrire et l'assumer
- **Problème** : avec des plafonds de 1 à 3 et des intervalles de 4 h 15 à 20 h, revenir plus d'une fois toutes les 4 h n'apporte presque rien côté commandes (en dehors de la Porta et de la Terraferme). C'est conforme à la règle d'or 7, mais personne ne l'a écrit, et la boucle doit donner d'autres raisons de revenir (chantiers, recherche, compagnie).
- **Solution** : écrire dans `docs/calibration.md` la cible : **3 à 4 sessions utiles par jour**, chacune avec au moins une livraison et une décision de bâtir. Ajouter au simulateur une mesure : la part des sessions avec au moins une commande livrable, à viser au-dessus de 80 % pour le joueur médian. Si l'assidu en a trop peu, les chantiers courts ou la recherche portent ses sessions, pas les commandes (on ne crée pas d'« occasions » artificielles). **À valider au simulateur**.
- **Effort** S. **Impact** 2. **Décision** : oui (la cible).

### G. Petits correctifs qui comptent

#### R24. Les textes sous 12 px, et le revenu à zéro
- **Problème** : C17, C18.
- **Solution** : dans `VehiclePanel.tsx`, `text-[0.625rem]` et `text-[0.6875rem]` passent à `text-xs` (12 px) au moins, et la barre de temps s'élargit. Le « 0 d par jour » de `Hud.tsx` est caché tant qu'il n'y a pas de revenu sur 24 h, puis il compte aussi les livraisons.
- **Effort** S. **Impact** 1. **Décision** : non.

#### R25. Le pilotage manuel, gardé pour l'expert, hors du chemin principal
- **Problème** : en retirant la médaille et le glisser (signalement n° 4), on perd l'itinéraire libre, qui fait la profondeur de Hades' Star (et le glisser échouait déjà sur PC, `BRIEF.md`).
- **Solution** : la bande de la flotte (le « 2/2 » de la bourse, touché) ouvre une rangée de cartes de véhicules : profil, soute, état et heure. Une carte touchée ouvre le panneau actuel, avec « Itinéraire » : on touche les lieux dans l'ordre, ✓ pour partir. Le chemin principal reste « Livrer » depuis la ville. On garde ainsi deux niveaux de jeu sans deux systèmes : le même moteur de sauts.
- **Effort** M. **Impact** 2. **Décision** : oui (garder l'itinéraire libre ?).

---

## 4. Synthèse des risques d'équilibrage introduits par les voyages longs

| Risque | D'où il vient | Effet probable | Recommandation |
| --- | --- | --- | --- |
| Le simulateur est optimiste | plancher `max(1, …)`, aucune commande bloquante, retour supposé | calibrage C trop généreux, surtout pour l'assidu et les petites villes | R20, R2 |
| Pas de livraison pendant la première session | lots de 400 d contre production de niveau 1, aucun stock de départ | prise en main sans le verbe central, perte au jour 1 | R17 |
| Des villes bloquées | plafond de 1, tirage au hasard, lot jusqu'à 10 h | frustration, revenu du début en dents de scie | R18 |
| Le retour à vide | la mule reste à la ville | une tournée sur deux perdue pour qui revient peu | R2 |
| Les villes lointaines ne valent rien | aucune prime de distance | les niveaux de portée du fondaco perdent leur sens | R21 |
| Acheter pour livrer | prime de 15 % contre taxe de 3 % | une boucle sans production | R22 |
| Le point du fondaco | les villes à portée et les distances changent la fin de partie (382 contre 692 jours) | tout redessin peut casser le calendrier | R14 |
| Commandes contre Casa | un lot = deux fois les planches de la Casa 4 | une Casa 4 plus lente qu'au simulateur si les bots livrent mieux que les joueurs | R12, mesure au simulateur |
| Des mules en trop | 4 places pour 5 commandes au plafond, au début | acheter une 3e mule tôt est inutile, et la Remise perd son attrait au début | à mesurer avec R20 |

---

## 5. Questions au porteur

1. **Le retour automatique** au fondaco après une livraison (R2) : par défaut, oui ou non ? Faut-il garder la bascule « Rester à la ville » ?
2. **Le choix du véhicule** (R1, règle b) : le plus petit qui suffit (on garde les grands), ou toujours le plus grand libre ?
3. **« Livrer au retour »** (R13) : une promesse par véhicule, est-ce trop d'automatisme pour l'esprit de Hades' Star ?
4. **Un bouton « Tout livrer »** global, qui planifie toutes les tournées d'un coup (comme « Tout récolter ») : jamais, ou seulement à partir d'une Casa donnée ? Il retire des décisions, mais il soulage les grands empires.
5. **La première livraison** (R17) : stock de départ (a), premières commandes réduites (b), ou première commande garantie en brut (c) ?
6. **Une commande impossible** (R18) : tirage pondéré, lot à la mesure, ou « Refuser » une commande ?
7. **La prime de distance** (R21) : la rétablir comme le dit le cadrage, ou l'enlever du cadrage ?
8. **La place du fondaco** (R14) : dessin A (une tuile de Mestre, Padoue écartée) ou B (un secteur de départ à lui) ? L'invariant « mêmes villes à portée à chaque niveau » vous convient-il ?
9. **Après la Casa 2** : la carte peut-elle montrer la prochaine action utile par l'or (sans bouton qui joue), ou faut-il qu'elle reste neutre ?
10. **L'itinéraire libre** (R25) : on le garde pour l'expert, ou tout passe par « Livrer » ?
11. **Les notifications** (R19) : les voulez-vous, et lesquelles ?
12. **La paie en route** dans la bourse (« +1 839 en route ») : utile, ou du bruit ?
13. **Le simulateur** (R20) : acceptez-vous de corriger son modèle de commandes avant toute autre retouche d'équilibrage, quitte à voir le calibrage C reculer ?

---

## 6. Ordre conseillé

1. **Tout de suite (S)** : R4 (jamais de départ à vide), R2 (retour automatique), R16 (Lorenzo parle de livraisons), R24, R10.
2. **Le geste** : R1, puis R3, puis R12.
3. **La carte qui parle** : R6, R5, R7, R8, puis R9.
4. **Le domaine** : R11 (avec R12 dedans).
5. **Le simulateur, puis l'équilibrage** : R20, puis R17, R18, R21, R22 et R23, chacun au simulateur de 24 mois sur toutes les graines et noté dans `docs/calibration.md`.
6. **La place du fondaco** : R14, R15, après la décision A ou B, et validée au simulateur.
7. **La suite** : R13, R19, R25.
