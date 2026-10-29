# Plan de la refonte UX (maquettes du 28 octobre 2026)

**À lire avant toute reprise.** Ce document fait passer les maquettes du 28 octobre dans le vrai jeu (`apps/web`). Il est tenu à jour **à chaque commit** : un autre compte Claude, ou le porteur, doit pouvoir reprendre là où le travail s'est arrêté.

## Sources, dans l'ordre de lecture

1. **Ce plan** : les décisions finales et la marche à suivre.
2. **`docs/maquettes-2026-10-28/`** : les 25 écrans corrigés, qui font foi pour la mise en page, les textes et les animations. Le README explique comment les lire.
3. **`docs/audit-ux-expert-2026-10-28.md`** : pourquoi chaque correction. Il décrit l'état **d'avant** : en cas d'écart, la maquette et ce plan l'emportent.
4. **`docs/audit-ux-2026-10-28.md`** : l'audit de départ.
   - § 0 : le lexique, à appliquer partout ;
   - § 0.1 : les Rumeurs expliquées ;
   - §§ 3 à 7 : l'ossature et chaque page.
5. **`docs/design.md`** (§ Direction Lagune) : la direction artistique, qui reste valable.

## État

| Lot | Contenu | État | Commit |
| --- | --- | --- | --- |
| 0 | Audit, audit de l'expert, maquettes, ce plan | fait (PR #55) | `83af1e2`…`d48bbce` |
| 1 | Socle : barre à 5 onglets, jetons, `prefers-reduced-motion`, 44 px | fait (PR lot 1) | `2c1c506`…(fin de branche `claude/refonte-ux-lot1`) |
| 2 | Lexique (i18n `fr` puis `en`, notifications push) | fait (PR lot 2) | `6e69c57`…(fin de branche `claude/refonte-ux-lot2`) |
| 3 | La carte et la fiche d'un lieu | fait (PR lot 3) | `e193d83`…(fin de branche `claude/refonte-ux-lot3`) |
| 4 | Ateliers, production, bâtir, magasin | fait (PR lot 4) | `568f5e1`…(fin de branche `claude/refonte-ux-lot4`) |
| 5 | Venise, Marché, page d'une marchandise | fait (PR lot 5) | `12d584a`…(fin de branche `claude/refonte-ux-lot5`) |
| 6 | Politique (rumeurs, élection, villes), enchères, 40 palais | fait (PR lot 6) | `cc1d56a`…(fin de branche `claude/refonte-ux-lot6`) |
| 7 | Classement, fiche d'un joueur, profil | en cours (branche `claude/refonte-ux-lot7`) | |
| 8 | Ville, Conquête | à faire | |
| 9 | Moments : messages, tâches du jour, calendrier, lettre, Atout, bon retour, fin du mois, entrée | à faire | |

**Étape suivante :** le lot 7, plan validé le 29 octobre. Ordre des commits :
- [x] 1. « (ordinateur) » en texte après le nom (`MerchantName`, `merchantLabel`, `fr.game.npc`), plus de sceau « PNJ » ;
- [x] 2. le classement en trois onglets (Semaine, Mois, Duel ; `SfidaBody`), « ? » pour les règles ;
- [ ] 3. la fiche d'un joueur en feuille par-dessus (clé `player:<id>:<origine>`), trois lignes, l'or selon l'origine ;
- [ ] 4. le profil : un contenu, puis Mes actions, Héritage, Guilde, Palmarès, Réglages ;
- [ ] 5. textes `en`, e2e et guide.

**Ce que le lot 6 a fait (plan validé le 29 octobre) :**
- [x] 1. Politique (`Politics.tsx`, clés `politics`, `broglio`, `senate`, `cities`) : Rumeurs (`RumoursBody`, « Source : …, juste 7 fois sur 8 », « Si c'est vrai : … »), Manœuvres dans leur feuille (`ManeuversSheet`, clé `maneuvers`), Élection (`SenateBody` sous le Doge du mois), Villes (jauge et part, `cityStanding`) ; l'alerte d'espion en tête des Messages (`SpyAlert`) ;
- [x] 2. Enchères : de jour l'arrivage (`MudaPanel` quitte le Marché), le soir les lots, le cachet « Adjugé », des crans en ducats ronds, un seul or ;
- [x] 3. Les 40 palais (`CanalSheet`, clé `canal`) : le quai qui défile, le palais choisi, l'écart au 40ᵉ, « Aller à mon quai » ;
- [x] 4. textes `en`, e2e (`manoeuvres`, `politique-villes`, `canal`, `sera`) ; `layout.mjs` fr et en, `tutorial.mjs` passent.
- Écarts : pas d'or « Me prévenir à 20 h » de jour aux Enchères (les notifications ont leur réglage au profil) ; « Voir Casa X » des 40 palais ouvre le classement en attendant la fiche (lot 7).
- Banc : une fois sur trois exécutions, l'étape `guide-touchez-le-niveau-de` a vu passer la pièce de la « Première paie » encore en vol (minutage du test, pas de mise en page) ; relancée, elle passe.

**Ce que le lot 5 a fait (plan validé le 29 octobre) :**
- [x] 1. Venise, l'écran de l'onglet (`map/Venice.tsx`, sélection `{ kind: "venice" }`) : quatre lunes (Politique → `broglio`, Marché → `rialto`, Enchères → `sera`, Les 40 palais → `canal`, vue canal du classement), la carte du Doge (`useCanal`, `decreeText`), « Le port : N commandes » vers l'orbite de la ville ; `activeTab` allume Venise sur ses feuilles ; le guide passe par `tab-venice` puis `venice-market` ; la plus forte variation dans `game/market.ts` (testée) ;
- [x] 2. le Marché : trois onglets (Marchandises, Entre joueurs, Actions), plus de filtres, un prix et sa variation par ligne ;
- [x] 3. la page d’une marchandise : carnet en lignes, Acheter/Vendre, Tout de suite / À mon prix, détail replié, un seul or, quantité préremplie (`trade:<res>:<qté>`) ;
- [x] 4. textes `en`, e2e (`venise`, `marche`, `marche-joueurs`, `parts` sur l'onglet Actions) et guide ; `layout.mjs` fr et en, `tutorial.mjs` passent.
- Restent au lot 6 : l'arrivage des bateaux (`MudaPanel`) encore au Marché, la Politique réunie (la lune ouvre `broglio`). Au lot 7 : « (ordinateur) » à la place du sceau PNJ dans le carnet.

**Ce que le lot 4 a fait (plan validé le 29 octobre).** Décision du porteur : quand il manque des matériaux, l'or achète sur place (`BuyMissing`, « Acheter 15 briques · 24 d »), sans passer par la page de la marchandise. Ordre des commits :
- [x] 1. l'onglet Ateliers ouvre « Mes ateliers » (`ComptoirOrbit`), allumé en or avec ses feuilles (`activeTab`, `home`) ; plus de chevron « ‹ » dans l'orbite ;
- [x] 2. « Mes ateliers » : Atouts en haut à gauche, Lettre du jour, puces du magasin en boutons (`trade:<res>`), « Ouvriers nourris 2 jours », « Tout tourne · prochain lot à … » ;
- [x] 3. un atelier : bandeau « 1 lot prêt », préréglages seuls, « → 80 farine · prête à … », un seul or (« Récolter … et relancer N lots »), l'amélioration dans sa feuille ;
- [x] 4. Bâtir : cartes choisies sur place, un seul or au pied (« Bâtir un moulin · 280 d » ou `BuyMissing`) ;
- [x] 5. textes `en`, e2e (liste des ateliers par l'orbite, voile d'une feuille compté comme une couche) et guide ; `layout.mjs` fr et en, `tutorial.mjs` passent.
- Hors lot : la puce « 0 brique » du magasin.
- À réutiliser : `BuyMissing` (`Comptoir.tsx`) prend `gold` pour être l'action de l'écran ; un bouton `.hit` ou de 44 px colle à une autre cible : passer à 48 px (`min-h-12`) ; les éléments qui couvrent l'orbite sur un téléphone court se cachent sous `[@media(max-height:699px)]:hidden`.

**Ce que le lot 3 a fait (plan validé le 29 octobre) :**
- [x] 1. `game/map/places.ts` (testé : `test/places.test.ts`) : la phrase, l'or et le fantôme de chaque lieu, deux halos au plus ;
- [x] 2. la fiche d’un lieu (`PlaceCard`, `Panel.tsx`) : `Selection` `home`/`city` avec `peek` (vrai : la fiche ; absent : l'orbite, comme pour les onglets et raccourcis) ;
- [x] 3. « Récolter » et « Livrer » sur place, animés : `flyGoods` sans étoile de départ fait voler les marques du soleil (`data-goods-from="place"`) vers l'onglet Ateliers (`data-goods-to="workshops"`, `.tab-bounce`) et monter « +8 farine » ; la livraison part sur la route (trajet déjà animé), les pièces à l'arrivée ;
- [x] 4. halos par sens (vert d'eau, bleu `info`, violet `--rumour` dans les quatre palettes, Tailwind `rumour`), deux au plus (`halos`), un point de 8 px pour les autres (`Call` dans `Markers.tsx`) ; le halo doré du soleil et son nom en or partent ; une charrette choisie allume toujours ses villes ;
- [x] 5. en-tête du commerce : bourse (→ profil, `data-hud="purse"`), anneau des Tâches du jour (`DailyRing` → feuille `daily`, `DailySheet`), cloche ; véhicules en rond « 2/2 » sous la cloche (décision du porteur) ; duel (→ point de l'onglet Classement et pilule « Duel » du classement), Marché ⚖ (→ onglet Venise), Enchères (→ fiche de Venise), identité et d/h quittent l'en-tête du commerce ;
- [x] 6. guide (`Coach.tsx` : « Ouvrir » ou l'or de la fiche) et e2e (`fiche-ville`, `fiche-ateliers`, profil par la bourse, Marché par l'onglet Venise, enchères par la fiche de Venise, rival en point d'onglet) ; `layout.mjs` fr et en, `tutorial.mjs` passent.
- Hors lot : le « ? » de rumeur sur une ville (la vue joueur ne porte pas les rumeurs par ville), lot 6.

**Ce que le lot 2 a fixé (lexique) :**
- Les noms affichés suivent l'audit § 0 dans `i18n.ts`, `i18n.en.ts` et les notifications push (`apps/server/src/notify/texts*.ts`). Les **clés** i18n, le code, la base et les réglages gardent leurs noms historiques (`broglio`, `signoria`, `sera`…).
- **Restent vénitiens, exprès** : les titres et badges décernés par le serveur, les noms des Atouts et des décrets (Dîme de la Terraferme, Franchise du Rialto, Péage…), « Signore della Terraferma », le récit des lettres (`i18n.letters*.ts`, où le Rialto est un lieu de Venise), « comptoir » au sens de la Maison (« Ouverture du comptoir… »).
- **Écarts au lexique** :
  - le « Livre de compte » du jeu, ce sont les missions : il devient « Objectifs » (en : Goals) ; « Mes comptes » désigne le relevé CSV ;
  - le Fondaco (bâtiment) devient « Entrepôt de ville », pour ne pas le confondre avec l'entrepôt ;
  - la Criée devient « Vente rapide ».
- **Les ligues** : `leagueOf(code)` (`game/Sfida.tsx`) affiche « Ligue 6 » pour Popolano et « Ligue 1 » pour Procuratore ; un test vérifie que l'ordre du dictionnaire suit celui du moteur. Le Lustre devient des « points de ligue ».
- Les mots de l'e2e (`WORDS` de `layout.mjs`) et les tests serveur qui figent les textes ont suivi.
- **`.hit` vaut 48 px** (et non 44) : un doigt à 22 px du centre ne tombe plus sur le bord. La zone déborde de 14 px autour d'une puce de 20 px : deux rangées de puces `.hit` gardent 16 px entre elles (Marché : filtres et « Mes offres »).
- L'e2e passe en `fr` et en `en` aux deux formats (fin du lot). En anglais, la plaque de la Conquête dit « Battle 20:00 » pour tenir sur une ligne.

**Ce que le lot 1 a posé (à réutiliser) :**
- **`--edge`** (`index.css`, `tailwind` : `edge`) : le contour de ce qui se touche, à 3:1 dans les quatre palettes (test dans `test/theme.test.ts`). `line` reste pour les filets. Les composants communs de `ui.tsx` l'ont déjà ; chaque lot passe ses écrans à `ring-edge` / `border-edge`.
- **La barre** : `game/map/TabBar.tsx` (`TabBar`, `activeTab`) et `TABS` / `tabLabel` dans `game/map/actions.ts`. Les textes sont dans `fr.game.map.nav`.
  - La hauteur de la barre est `--tabbar` (`index.css`) : tout ce qui se pose au pied de la carte se cale sur `calc(var(--tabbar) + …)`.
  - L'Aide s'ouvre du profil (« Comment jouer », hors des réglages pliés) ; sur la Terraferme, un rond « ? » près de la cloche ouvre son guide. Les ronds du commerce (ballots, Rialto, Sera) ne s'affichent que sur la carte du commerce.
  - Les vues en orbite (comptoir, ville) et le panneau d'un lieu s'arrêtent au-dessus de la barre ; la bulle de Lorenzo reste au pied de l'écran, sur la barre, le temps d'une étape.
  - Les cibles du guide sont `tab-map`, `tab-workshops` et `tab-layer`.
- **`Sheet docked`** (`ui.tsx`) : la feuille d'un onglet s'arrête au-dessus de la barre. Elle sert aux ateliers, au classement et au duel ; la future Venise (lot 5) la prendra aussi.
- L'onglet Venise mène à Venise (`map/Venice.tsx`, lot 5) et s'allume en or sur ses feuilles (`activeTab`).
- **La couleur « vous »** (`info`) habille les lignes, les courbes et les territoires du joueur, **pas son blason** : les blasons restent ceux que les joueurs ont choisis.

## Façon de travailler

- **Branche :** une branche par lot, partie de la branche par défaut. On pousse après chaque commit.
- **Commits :** un par écran ou par fonctionnalité, message en français.
- **C'est de l'interface, pas une règle.** Aucune mécanique, aucun réglage d'équilibrage ne change, donc pas de `pnpm sim` ni de notes de saison. Si un écran semble exiger une règle nouvelle, on la note dans IDEAS.md et on ne la code pas.
- **Avant chaque commit :** `pnpm test`, `pnpm typecheck`, `pnpm lint`.
- **À chaque lot :** le test de mise en page (`docs/e2e.md`, `apps/web/e2e/layout.mjs`) à 390 × 844 et 320 × 568. On regarde les captures, on les compare à la maquette.
- **Textes :** d'abord dans `apps/web/src/i18n.ts` (`fr`), puis `i18n.en.ts`. Aucun texte en dur dans un composant.
- **Animations :** réutiliser `apps/web/src/game/fx.tsx` (`flyCoins`, `flyGoods`, `pressed`, `ringAt`, `FxLayer`) avant d'écrire du neuf. Toute animation a une variante sous `prefers-reduced-motion` : un fondu court du chiffre, l'information n'est jamais perdue.

## Décisions finales (elles priment sur les audits)

### Navigation
- **Une seule barre à 5 onglets**, la même sur ses 5 destinations : Carte · Ateliers · Venise · Classement · Conquête. Le courant est en or, avec `aria-current="page"`.
  - Pas de « ‹ Carte » sur ces 5 écrans.
  - La barre à 4 portes de la Conquête, où la carte s'appelait « Commerce », disparaît.
- **Trois profondeurs au plus** : l'onglet, le lieu, la feuille.
  - La fiche d'un joueur s'ouvre en **feuille par-dessus** l'écran courant, avec « ‹ Retour » ou un toucher dehors. Ce n'est pas un niveau de plus.
- **En-tête de la carte :** la bourse, l'anneau des Tâches du jour (→ Tâches du jour) et la cloche (→ Messages).
  - Tâches du jour mène au Calendrier du mois.

### Le bouton en or
- **Un seul or par écran.** Il **agit sur place** : récolter, livrer, voter, enchérir, acheter, lancer un front. Le bouton fantôme sert à aller ailleurs (« Ouvrir », « Voir Padoue », « La rumeur »).
- Un lieu sans rien à faire n'a pas d'or (ville calme : un seul fantôme « Voir Trévise »).
- Une action impossible n'est jamais en or. Il manque des matériaux : l'or devient « Acheter 15 briques · 24 d », qui ouvre la page de la marchandise avec la quantité déjà remplie, puis ramène à Bâtir.

### Mouvement
- **Sur la carte, le décor bouge peu.**
  - Au plus **deux halos**, colorés par sens : vert d'eau `#6ee0b8` = prêt, bleu `#6ec8f5` = une ville achète, violet `#8e6bd8` = rumeur ou enchères. Les autres lieux en attente portent un petit point.
  - Pas de `filter: blur` animé.
  - Le reflet de l'or ne passe **qu'une fois**, quand la fiche monte.
- **Les gains, eux, s'animent.** Durées et courbes dans les maquettes :
  - **récolte** : 6 à 8 marques volent vers l'onglet Ateliers, l'icône rebondit, « +8 farine » monte ;
  - **livraison** : la caravane part, « +48 d » monte, la bourse compte, la pièce fait un tour ;
  - **coffre du jour** : le couvercle s'ouvre, les pièces jaillissent, le point de série se remplit ;
  - **enchère gagnée** : le cachet « Adjugé » ;
  - **Atout pris** : la carte s'envole ;
  - **lettre** : le cachet de cire se brise ;
  - **bon retour** : le chiffre compte, puis les tuiles entrent ;
  - **fin du mois** : le disque et ses rayons, le podium 3 → 2 → 1, les récompenses qui glissent.

### Accessibilité
- **Cibles d'au moins 44 px** : boutons d'icône, flèches de ville, puces du magasin, Atout en attente, petites villes de la carte.
  - Calendrier : seuls les jours à événement sont des boutons ; l'élection (25 à 30) est un seul arc ; les jours ordinaires sont des points `aria-hidden`.
- **Contours des composants** (fantômes, cartes, crans, ×) en `#6d8db8` (3,9:1). `#42628c` reste pour les filets décoratifs.
- **Sélections** en `aria-pressed` ; onglets en `role="tab"` et `aria-selected`.

### Données et mots (tous les écrans disent la même chose)
- **Les 40 palais = le top 40 du classement du mois.** Dans les exemples :
  - le joueur est 4ᵉ de la semaine et 41ᵉ du mois, à 1 240 d du 40ᵉ ;
  - en fin de mois, il finit 38ᵉ : son premier palais.
- **Ligues de duel inversées :** Ligue 1 = l'élite, on débute en Ligue 6. Textes : « Ligue 6 · 30/100 », « Gagner dimanche : +30 vers la ligue 5. Perdre : −20. »
  - ⚠ À vérifier côté serveur : si le Lustre numérote aujourd'hui les ligues dans l'autre sens, l'inversion se fait **à l'affichage** (pas de changement de règle).
- **Couleur réservée au joueur :** le bleu clair `#6ec8f5`, partout (profil, classement, duel, conquête). Aucune autre Maison ne la prend.
- **Unités toujours dites :**
  - « 3 Influence », jamais « 3 d'Influence » (d = ducats) ;
  - « 121 troupes », « +13 troupes par heure », « vivres pour 1 jour », « 42 min » ;
  - « 2ᵉ, à 40 livraisons du 1ᵉʳ ».
- **Rumeurs :** la source et son taux de réussite (« Source : le secrétaire du Sénat, juste 7 fois sur 8 »), puis « Si c'est vrai : … », puis ce que le joueur peut en faire.
- **Doge :** « Doge, l'élu du mois » à la première apparition, puis « Doge ». Les décrets sont dits par leur effet (« Taxe du Marché : 3 % → 2 % », « La Douane vend 25 % de plus », « Son mois : le grand gel »).
- **Marques des marchandises** (`GoodsMark`) : rond = brut, carré = transformé, hexagone = fini ; contour pointillé = pas en stock.
- **Lexique complet :** audit § 0. Exemples : Marché, Politique, Rumeurs, Enchères, Les 40 palais, Conquête, Mes ateliers, Messages, Actions, Duel, Ligue, Bénéfice, Prestige, Héritage, Guilde.

## Points ouverts (au porteur)

1. **Deux rendez-vous à 20 h**, les enchères et la bataille de la Conquête. En attendant, la frise dit « 20 h : enchères puis bataille ». Si le porteur décale l'un des deux, c'est un changement de règle : il prend effet au changement de mois et s'écrit dans les notes de saison.
2. **Fin du mois :** le « 38ᵉ, votre premier palais » est un exemple. Le vrai écran affiche le rang réel.
3. **La fiche d'un joueur** choisit son or selon l'écran d'origine : Défier (classement), Voter (élection), Acheter des actions (Marché). La maquette n'en montre qu'un. Le vrai écran reçoit l'origine en paramètre.
4. **Connexion :** dans la maquette, le bouton est un lien pour garder le parcours cliquable. Le vrai écran garde un `<button type="submit">` avec `autocomplete="email" inputmode="email" required`.

## Lots : maquettes → fichiers de `apps/web`

Les correspondances ont été relevées le 28 octobre. Si un fichier a bougé, chercher le composant par son nom.

### Lot 1 · Socle
- **Barre à 5 onglets** : un composant commun, qui remplace les portes de `game/map/Hud.tsx` (`Door`, `MapHud`). Il est utilisé par la carte, les ateliers, Venise, le classement et la Conquête (`game/map/TerraLayer.tsx`, `TerraHud`).
- **Jetons de couleur** : `#6d8db8` (contour), `#6ec8f5` (joueur), les trois couleurs de halo. À mettre dans `art/palette.ts` et `theme.ts`.
- **Règle `prefers-reduced-motion`** commune (`index.css`), et contrôle des 44 px dans `ui.tsx`.

### Lot 2 · Lexique
- `i18n.ts`, puis `i18n.en.ts`, `i18n.letters*.ts` et l'Aide (`game/Help.tsx`), d'après l'audit § 0 et les textes des maquettes.
- Les noms internes (code, base, réglages) **ne changent pas**.

### Lot 3 · La carte — maquette `Main`
- Fichiers : `game/map/MapScreen.tsx`, `WorldMap.tsx`, `Markers.tsx`, `Panel.tsx` (`ContextPanel`, `ActionButton`), `Hud.tsx`, `declutter.ts`.
- Changements :
  - les halos limités et colorés par sens ;
  - la fiche du lieu avec une phrase et une action ;
  - « Récolter » et « Livrer » agissent sur place avec leur animation (`harvest.ts`, `fx.tsx`) ;
  - l'anneau des Tâches du jour dans l'en-tête ;
  - pas de bloc « À faire maintenant ».

### Lot 4 · Ateliers — maquettes `Comptoir`, `Production`, `Batir`
- **`Comptoir`** → `game/map/Orbit.tsx` (`ComptoirOrbit`), `game/Comptoir.tsx` (`WorkshopsSummary`, `CounterSheets`), `game/Warehouse.tsx`, `game/Store.tsx`.
  - Récolte animée sur place ; Atouts en haut à gauche ; puces du magasin par marchandise ; « Ouvriers nourris 2 jours ».
- **`Production`** → `Comptoir.tsx` (`WorkshopSheet`) : bandeau « 1 lot prêt », préréglages seuls, « Récolter et relancer », amélioration dans une feuille.
- **`Batir`** → `Comptoir.tsx` (`BuildSheet`, `BuyMissing`, `missingMaterials`) : l'or « Acheter 15 briques · 24 d » ouvre la marchandise remplie, puis revient.

### Lot 5 · Venise et Marché — maquettes `Venise`, `Rialto`, `Negoce`
- **`Venise`** est un **lieu nouveau** : quatre lunes (Politique, Marché, Enchères, Les 40 palais), chacune avec son état, et la carte du Doge. Il s'appuie sur `Orbit.tsx` (`CityOrbit`) et `Doge.tsx` (`DecreeBanner` dans `Famille.tsx`). C'est l'onglet « Venise » de la barre.
- **`Rialto`** → `game/Marche.tsx` (`RialtoSheet`, `MarketBoard`, `PricedRows`), `Deals.tsx` (`DealsSheet`), `Shares.tsx` (`SharesTab`).
  - Trois onglets : Marchandises, Entre joueurs, Actions. Pas de filtres.
  - « Livrer · +56 d » sur la ligne de commande ; « Gérer mes actions » → Profil.
- **`Negoce`** → `Marche.tsx` (`TradeSheet`, `BookSide`).
  - Carnet en lignes pleine largeur, les noms ne sont pas des liens ; « Tout de suite / À mon prix » ; détail du prix replié ; quantité pré-remplie quand on vient de Bâtir ou d'une ville.

### Lot 6 · Politique, enchères, palais — maquettes `Palais`, `Mole`, `Canal`
- **`Palais`** réunit trois feuilles en une, avec les onglets Rumeurs · Élection · Villes :
  - `Broglio.tsx` (`BroglioSheet`, `RumourCard`, `Source`) ;
  - `Doge.tsx` (`SenateSheet`) ;
  - `Signoria.tsx` (`SignoriaSheet`).
- Les Manœuvres (acheter, vendre, fausse rumeur, espion) passent dans une feuille. L'alerte « un espion vous surveille » va dans Messages.
- **`Mole`** → `Sera.tsx` (`SeraSheet`) et `Marche.tsx` (`MudaPanel`, pour l'arrivage de jour).
  - Crans en ducats ; cachet « Adjugé » ; compte à rebours en vermillon sous 5 min.
- **`Canal`** → `Canal.tsx` (`CanalBoard`, `CanalHero`).
  - Noms sous les palais ; ombre de défilement ; « Aller à mon quai » ; « Vous êtes 41ᵉ : 1 240 d… ».

### Lot 7 · Les marchands — maquettes `Classement`, `Fiche`, `Profil`
- **`Classement`** → `Top.tsx` (`RankingSheet`, `Podium`, `Line`) et `Sfida.tsx` (`SfidaSheet`, `ChallengeSheet`, `Ladder`).
  - Semaine · Mois · Duel ; « (ordinateur) » en texte ; le balayage est un raccourci, l'action principale reste dans la fiche ; « Espionner » ouvre une confirmation.
- **`Fiche`** → `Palmares.tsx` (`PlayerPalmares`), avec `Shares.tsx` (`TheirShares`).
  - Feuille par-dessus ; trois lignes ; l'or selon l'origine (point ouvert 3).
- **`Profil`** → `Profil.tsx` (`ProfileSheet`, `ProfileBody`), `Dynasty.tsx`, `MyCompany.tsx` et `Company.tsx`, `House.tsx`.
  - Un seul contenu, puis les lignes Mes actions, Héritage, Guilde, Réglages.

### Lot 8 · Ville et Conquête — maquettes `Ville`, `Terraferme`
- **`Ville`** → `Orbit.tsx` (`CityOrbit`), `Signoria.tsx` (`SignoriaRing`, `SignoriaLine`), `Fondaco.tsx`, `map/SideColumn.tsx` (`Orders`).
  - Les commandes se touchent pour les mettre dans la mule, puis « Livrer 2 commandes · +64 d ».
  - Une pilule « vous 22 % · maître : … » remplace l'anneau cliquable.
  - Flèches de 44 px, points de pagination, balayage.
- **`Terraferme`** → `map/TerraLayer.tsx` (`TerraHud`, `TerraActions`, `TerraPanel`, `TerraSheets`) et `map/TimeStrip.tsx`.
  - La barre commune ; « Lancer un front » en or ; le camp sans or ; libellés en troupes ; grille agrandie ; frise en 13 px.

### Lot 9 · Moments et entrée
- **`Cloche`** → `Bell.tsx` (`NoticeList`) et `map/Notices.tsx` : pas d'onglets, groupés par Aujourd'hui et Hier, l'espion avec « Le chasser · 20 d ».
- **`Aujourdhui`** → `Daily.tsx` et `House.tsx` (`Missions`) : barre de progression, « Changer une tâche », coffre animé.
- **`Cadran`** → `TimeStrip.tsx`, `timeline.ts`, `seasonCount.ts`, `Acts.tsx` : le calendrier du mois (règles du lot 1 pour les jours).
- **`Lettre`** → `Letter.tsx`. **`Atout`** → `Atouts.tsx`.
- **`BonRetour`** → `ComeBack.tsx` et `Welcome.tsx`.
- **`Saison`** → `Ceremony.tsx` et `Dynasty.tsx` (`HeirChoice`, `NamePicker`).
- **`Connexion`** → `App.tsx` (le formulaire e-mail). **`Metier`** → `Region.tsx`, avec `Intro.tsx` pour l'introduction.

## Vérification de fin de chantier

- Chaque écran des maquettes a son équivalent, comparé capture contre maquette, à 390 × 844 et 320 × 568.
- Aucun texte en dur ; `fr` et `en` complets.
- Un seul or par écran ; aucune cible sous 44 px ; contours à 3:1.
- Toutes les animations ont leur variante `prefers-reduced-motion`.
- Les e2e existants passent (`tutorial.mjs`, `layout.mjs`). Le tutoriel (`Coach.tsx`, `coachSight.ts`) pointe encore les bons éléments après le déplacement des portes.
