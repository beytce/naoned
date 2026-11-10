# La Carte vivante : plan (9 novembre 2026)

*Plan validé par le porteur le 9 novembre 2026, avec deux décisions : les terroirs et la fidélité des villes (deux règles nouvelles), et un horizon en plaques fines au-delà du plateau. État des lots en fin de document.*

## Contexte

Demande du porteur : la carte de base et le commerce doivent être **plus vivants** et donner **envie de se développer et de s'étendre** ; améliorer la 3D, le nombre de personnes qui se promènent, et la profondeur du jeu.

Ce que le code montre aujourd'hui (`apps/web/src/porcellana/board/`) :

- **Presque personne.** Les seuls passants sont ceux du Fondaco (1 + niveau, 8 au plus), qui tournent en carré sur le bord de sa case (`models/life.ts: walkers`). Aucun habitant en ville, aucun porteur sur les routes, aucun ouvrier.
- **Rien ne grandit à l'œil.** `fondaco(P)` et les ateliers ne reçoivent pas leur niveau : un Fondaco niveau 1 et niveau 10 sont identiques, un atelier niveau 1 et niveau 12 aussi. Le plan Porcellana (§ 4) et le cadrage (§ 3) le promettaient.
- **Une case achetée ne vaut que sa place.** Toutes les cases de terre sont la même dalle avec quatre arbres (`"lane"`) ; rien ne distingue une parcelle « + » d'une autre.
- **La fidélité d'une ville ne sert à rien** : le compteur `house.served` existe (bannières à 3, 10, 25 livraisons), sans effet de jeu.
- **Rien au-delà du plateau**, eau plate et immobile.

Décisions du porteur (9 novembre 2026, cette session) : **terroirs et fidélité des villes** (deux règles nouvelles) ; **un horizon en plaques fines** au-delà du plateau (amende « au-delà, rien » de la grammaire Porcellana).

## Principes tenus

- **Chaque personnage a une raison de jeu** (grammaire Porcellana : « rien ne bouge sans raison de jeu ») : la foule se compte sur ce qui est bâti, ce qui tourne, ce qui est livré. Tout s'arrête en « moins d'animations ».
- **Absorber, pas ajouter** : la foule remplace `walkers` ; le terroir et le voisinage deviennent un seul « bonus de la case » ; la fidélité donne un sens aux bannières déjà là.
- **Règles d'or** : rien n'est retiré à personne (un terroir ne donne qu'un bonus, jamais de malus ni d'interdit ; les livraisons déjà faites comptent) ; rien ne se vend.
- Moteur : tests avant le code, sur la fixture ; paramètres dans `worlds.settings` ; simulateur de 24 mois (toutes les graines) et `docs/calibration.md` pour les deux règles ; note du chapitre avant application.
- Téléphone d'abord : la foule et l'horizon en `InstancedMesh` (quelques appels de dessin pour tout), budget par appareil, plancher `e2e/map-fps.mjs`.
- Méthode (comme D12 du plan de publication) : plan validé une fois, lots enchaînés, petits commits poussés sur `claude/tender-faraday-ro183d` ; pas de PR sans demande.

## Lot 1 — La foule

Un système de foule unique, instancié, piloté par l'état du jeu.

- `porcellana/crowd.ts` (nouveau) : `Crowd` — trois `InstancedMesh` (corps en fuseau, tête, caisse d'accent), des agents qui suivent une polyligne (aller-retour, boucle ou une fois), pas réguliers et léger sautillement ; non cliquable (`raycast` neutre) ; suit la hauteur de sa case (chute d'arrivée, levée de sélection) ; caché pendant la bascule vers la Terraferme ; ombres sur ordinateur seulement.
- `porcellana/board/people.ts` (nouveau, pur, testé) : `peopleOf(scene, budget)` → les itinéraires, chacun avec sa raison :
  - **porteurs** : sur la route de chaque atelier **en marche** vers son Fondaco, une caisse d'accent sur le dos (nombre selon le niveau de l'atelier) ; rien si l'atelier est arrêté, des hommes assis s'il attend la récolte ;
  - **ouvriers** : un à trois autour de chaque atelier en marche, deux ou trois sur un chantier ;
  - **habitants des villes** : dans chaque ville, selon sa taille et sa fidélité ; sur la place San Marco, selon les étals ;
  - **gens de la Maison** : autour du Fondaco selon son niveau (remplace `walkers`), qui vont jusqu'au quai, à la Remise, au Campo ;
  - **voyageurs** : sur les routes vers les villes servies, selon leur fidélité (plus on livre, plus la route est passante) ;
  - budget plafonné (≈ 60 sur téléphone, ≈ 180 sur ordinateur), réparti au prorata, réduit si les images ralentissent.
- **La récolte se voit** (D4, jamais fait) : quand les lots prêts d'un atelier passent à zéro, des porteurs chargés partent en file sur sa route jusqu'au Fondaco.
- Sur l'eau : les barques suivent des trajets entre le quai et San Marco selon les étals ; les pigeons de la Piazza s'envolent quand on touche le Marché.
- `scene.ts` : `BoardTile.level`, lots, fidélité déjà là ; `PorcellanaMap.tsx` : la foule dans la boucle `useFrame`.
- Laboratoire `?lab=porcellana&vue=foule` ; test `apps/web/test/porcellanaPeople.test.ts`.

## Lot 2 — Ce qui grandit se voit

- **Le Fondaco par niveau** (`models/fondaco.ts: fondaco(P, level)`) : le palazzo validé reste le niveau 1 ; chaque niveau ajoute un élément (caisses et auvent au quai, aile, loggia, second étage d'arcades, tour d'angle, jardin clos, lanterne, statues de corniche…), une couronne au niveau 20. Laboratoire : les vingt niveaux côte à côte ; tests de forme existants étendus (`test/porcellana.test.ts`).
- **Les ateliers par palier** (`ModelOpts.level`, un habillage commun `tierDress` dans `board/models.ts`) : niveaux 1–4, 5–9, 10–14, 15–19, 20+ : appentis, clôture, mur et portail, fanion d'accent, colombier — sans redessiner les douze modèles.
- **Les cases à soi** : la case libre n'est plus quatre arbres : haies, sillons, chemins, une maisonnette puis deux quand le Fondaco monte (`models/ground.ts`), le « + » toujours lisible, la route dégagée.
- **Le chantier vit** : échafaudage qui monte avec l'avancement, ouvriers (lot 1).
- **Les moments** (dans `PorcellanaMap.tsx`, particules instanciées `porcellana/burst.ts`) :
  - une case achetée : elle tombe, un anneau de poussière, ses voisines « + » surgissent l'une après l'autre ;
  - un niveau gagné (Fondaco, atelier, chantier fini) : la case retombe avec son nouveau modèle, pétales d'accent, la foule s'arrête et salue ; `Moment.tsx` (encore en style de nuit) passe en papier Porcellana et s'efface sur le Fondaco réel ;
  - une livraison payée : les caisses du quai disparaissent, des pièces sautent vers la bourse.

## Lot 3 — Les terroirs (règle)

Chaque case de terre a un terrain, visible avant l'achat ; l'atelier brut qui lui correspond y rend plus. Le brut aime sa terre, le travaillé aime son voisin.

- **Moteur, tests d'abord** (`packages/engine/test/empire/terrain.test.ts`, motif de `square.test.ts`) :
  - `empire/terrain.ts` (pur) : `terrainOf(tile, cell, settings)` — le terrain écrit dans la carte s'il y en a un, sinon tiré d'un hachage de la clé de case sur les poids de sa région (le sable et le sel seulement sur une côte) ; `terrainBonusBps(s, terrain, type)` ;
  - `settings.ts` : `map.terrain` optionnel (`kinds: { forest, clay, sand, pasture, fields } → { buildings, bonusBps, coast? }`, `regions → poids`) ; absent : aucun terrain, comme aujourd'hui ;
  - `workshops.ts: workshopYieldBps` ajoute le bonus de la case de l'atelier ;
  - commande `empireMoveWorkshop { workshopId, tile }` : vers une case libre à soi de la même région, sans frais, comme l'échange (`swapWorkshops`) — pour que les Maisons déjà là profitent de la règle ;
  - `view.ts` : `map.terrain` (cases vues, achetables, horizon), `workshopPlaces[id].terrainBps`.
- **Thème** `venice1450.square.ts` : forêt → camp de bûcherons ; glaise → carrière d'argile ; sable (côte) → sablière, saline ; pré → bergerie ; champs → ferme, chanvrière. Bonus de départ **+10 %** (celui d'un lien de voisinage), à calibrer.
- **Serveur** : schéma zod de la commande (`apps/server/src/game/empire.ts`), code de refus dit.
- **Simulateur** (`apps/simulator/src/empire/bots.ts`, `model.ts`) : les robots choisissent une case de leur terroir selon leur assiduité ; passage 24 mois, graines 1 à 3, carte en cases (scénario G) ; entrée dans `docs/calibration.md` ; cibles : calendrier du Fondaco, part des commandes (60–85 %), prix — pas pires qu'avant.
- **Écran** : la parcelle « + » porte la signature de son terrain et sa fiche le dit (« Forêt · un camp de bûcherons y rend +10 % ») ; `NewWorkshop.tsx` met en tête les ateliers favorisés ; la fiche et le dock d'un atelier montrent un seul « bonus de la case » (terroir + voisinage) ; « Déménager » dans le dock (mode de pose existant, `Placing`) ; i18n fr et en ; un tutoriel court à la première parcelle à terroir (`tutor/features.ts`).
- Note du chapitre : `docs/notes-chapitre-2026-12-carte-vivante.md`.

## Lot 4 — Le paysage, l'eau, l'horizon

- **Les terrains en relief** (`models/terrain.ts`) : forêt dense de sapins, fosse de glaise et roseaux, dunes et rive, pré à haies et moutons, champs à sillons ; sur les cases à soi, les parcelles « + » et l'horizon. Monochrome : le relief et la valeur, jamais la couleur.
- **L'eau vit** (`materials.ts`, `models/ground.ts`) : rides lentes sur le matériau d'eau (un seul uniforme de temps), liseré d'écume le long des rives (`BoardTile.shore`), bricole et roseaux aux côtes, sillage des barques.
- **L'horizon** : `view.ts` donne `map.horizon` (les terres à quelques cases de ce qu'on voit : région, terrain, ville et sa taille) ; `porcellana/board/Horizon.ts` les dessine en plaques basses et pâles instanciées, reliefs et villes en silhouette, qui s'estompent vers le fond ; ni repère ni clic ; `FlatBoard.tsx` les montre à plat. `docs/plan-porcellana.md` § 1 amendé.

## Lot 5 — La fidélité des villes (règle)

- **Moteur, tests d'abord** (`packages/engine/test/empire/loyalty.test.ts`) : `orders.loyalty` optionnel (`at: [3, 10, 25, 60]`, `premiumBps` par palier, de l'ordre de +2 à +8 %, à calibrer) ; `orders.ts: drawOrder` ajoute la prime du palier de la ville au tirage de la commande (le prix affiché est le prix payé) ; `view.ts` : palier, livraisons, prochain seuil par ville. Les livraisons déjà comptées valent.
- **Simulateur** : livraisons par ville suivies, prime appliquée ; 24 mois, graines 1 à 3 ; `docs/calibration.md` ; même note du chapitre.
- **Écran** : la fiche d'une ville dit son palier et ce qui manque pour le suivant ; la ville grandit avec lui (`models/towns.ts` : maisons, étals, jour de marché), plus d'habitants et de voyageurs (lot 1).

## Lot 6 — Finitions

- Mesure et réglage de fluidité (`e2e/map-fps.mjs`), budget de foule ajusté.
- Parcours `e2e/porcellana.mjs` étendu (terroir sur une fiche, déménagement, fidélité) ; captures dans `docs/direction-artistique-2026-11/porcellana/vivante-*.png`.
- Documents : ce plan copié en `docs/plan-carte-vivante.md` avec son tableau d'état ; une ligne dans `CLAUDE.md` ; `docs/design.md` (foule, horizon) ; `IDEAS.md` pour ce qui reste dehors (quartiers nommés, fêtes du chapitre, événements, jour et nuit).

## Fichiers critiques

- Écran : `apps/web/src/porcellana/board/{PorcellanaMap.tsx,scene.ts,models.ts,FlatBoard.tsx}`, `porcellana/models/{fondaco,life,ground,towns,workshops}.ts`, `porcellana/{materials,catalogue,Lab}.ts(x)`, `empire/{NewWorkshop.tsx,Moment.tsx,types.ts}`, `empire/map/{logic.ts,WorkshopDock.tsx}`, `i18n.ts`, `i18n.en.ts`.
- Moteur : `packages/engine/src/empire/{terrain.ts (nouveau),workshops.ts,orders.ts,settings.ts,view.ts,grid.ts}`, `commands.ts`, `themes/venice1450.square.ts`, `themes/venice1450.empire.ts`.
- Serveur : `apps/server/src/game/empire.ts`. Simulateur : `apps/simulator/src/empire/{bots,model,world,report}.ts`.

## Ce qu'on réutilise

`bake` et `dyn` (`porcellana/bake.ts`, `shapes.ts`) ; `seeded`, `box`, `cyl`, `tree`, `crate` ; `roundedPath` (`ribbon.ts`) pour les itinéraires ; `tileDrop`, `tileDelay` (`arrival.ts`) pour les moments ; `map.roads` du moteur (les mêmes routes pour la foule, les mules et le dessin) ; `neighbourBonus`, `swapWorkshops` (`workshops.ts`) ; `house.served` ; le mode de pose `Placing` ; `loyaltyBanners`, `quayCrates`, `marketStalls` ; le laboratoire `?lab=porcellana`.

## Vérifier

À chaque lot :

```bash
pnpm install   # une fois
pnpm typecheck && pnpm lint && pnpm test
pnpm --filter @comptoirs/web build
CHROMIUM=/opt/pw-browsers/chromium SIZES=1280x800,390x844 pnpm --filter @comptoirs/web e2e:empire
CHROMIUM=/opt/pw-browsers/chromium node apps/web/e2e/map-fps.mjs
```

- Lots 1, 2, 4 : captures du laboratoire (`?lab=porcellana&vue=foule`, niveaux du Fondaco, terrains) et du jeu en mouvement (sans « moins d'animations »), sur ordinateur et téléphone, relues à l'œil ; le seuil de `map-fps` ne recule pas.
- Lots 3 et 5 : `pnpm --filter @comptoirs/simulator empire --seeds 1,2,3 --scenario apps/simulator/scenarios/cases-carrees.json`, avant et après ; nombre de cibles tenues au moins égal ; tableau dans `docs/calibration.md`.
- En fin de parcours : `e2e/porta.mjs`, `e2e/switch.mjs`, `e2e:guided` (les tutoriels ne cassent pas).

## Les deux règles s'allument sur décision

Comme l'intérieur des ateliers (`EMPIRE_INTERIOR`), les terroirs et la fidélité changent le commerce : le serveur les garde éteints tant qu'il ne dit pas `EMPIRE_TERROIRS=on` et `EMPIRE_LOYALTY=on` (`apps/server/src/config.ts`, test `apps/server/test/empire-living.test.ts`). Le porteur publie la note du chapitre (`docs/notes-chapitre-2026-12-carte-vivante.md`), puis les allume. Tout le reste (foule, croissance visible, horizon, eau, déménagement d'un atelier) est en ligne sans interrupteur.

## État

| Lot | État |
| --- | --- |
| 1 — La foule | fait : `porcellana/crowd.ts` (deux appels de dessin pour tous), `board/people.ts` (pur, testé : porteurs, ouvriers, hommes assis près des lots prêts, bâtisseurs, habitants, gens de la Maison, voyageurs ; budget réparti entre les lieux, 70 sur téléphone, 200 sur ordinateur, réduit si les images ralentissent) ; la récolte part en file vers le Fondaco ; `walkers` absorbé ; laboratoire `?lab=porcellana&vue=vivante` (la Carte du jeu sur une Maison de démonstration, `board/demo.ts`). Reportés au lot 4, avec l'eau : les barques en trajets et les pigeons de la Piazza |
| 2 — Ce qui grandit se voit | fait : le Fondaco à vingt niveaux (`fondacoStage` : une chose de plus à chaque niveau, testé), les ateliers par palier tous les cinq niveaux (`models/domain.ts: tierDress` : cour pavée et fanion, bornes, murets et grande bannière, colombier), les cases à soi habitées (pré, champs ou verger selon la graine, maisonnettes aux niveaux 3, 7 et 12 du Fondaco), le chantier dont les murs montent, les moments (`porcellana/burst.ts` : poussière d'une case achetée, pétales sur ce qui vient de grandir, pièces sur une ville qui paie ; les cases qui apparaissent ensemble arrivent l'une après l'autre ; le Fondaco retombe grandi quand son moment se ferme) |
| 3 — Les terroirs | à faire |
| 4 — Le paysage, l'eau, l'horizon | à faire |
| 5 — La fidélité des villes | à faire |
| 6 — Finitions | à faire |
