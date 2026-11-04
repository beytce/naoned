# Audit UI et direction artistique de Fondaco (4 novembre 2026)

Angle : design system (tokens de couleur, typographie, espacement, rayons, élévation), règle « une seule action en or », HUD sur la carte 3D, iconographie et `GoodsMark`, cohérence entre le HTML et la scène WebGL, contraste WCAG, états des composants, feuilles et onglets, la Porta, l'ordinateur.

Sources lues : `CLAUDE.md`, `docs/design.md` (§ Plateau de nuit, § Lagune, Palettes, Typographie, Composants, Règle du HUD, Porta), `docs/propositions-design-2026-10-25.md`, `docs/direction-artistique-2026-11.md`, `docs/audit-carte-2026-11-03/rapport-ui.md` et `SYNTHESE.md`. Code : `index.css`, `tailwind.config.js`, `theme.ts`, `art/palette.ts`, `ui.tsx`, `art/goods.tsx`, `empire/map/*` (Hud, CityPill, RoundButtons, BottomSlot, ActionPanel, OrdersPanel, Domain, Trips, EmpireMap), `empire/porta/*` (BattleDiorama, Battle3D, PortaScene, ArmsSheet), `Guide.tsx`, `CompanyTab.tsx`, `NewWorkshop.tsx`.

Captures : les 51 du parcours `shots/empire` (390×844 et 320×568), les 7 de `shots/map3d`, les 7 de `shots/porta`, et une passe PC 1440×900 que j'ai lancée (`SIZES=1440x900 node e2e/empire.mjs`, dans le scratchpad `ui-pc/`). Les contrastes ont été calculés selon la formule WCAG 2.x à partir des tokens de `index.css`. Aucun fichier du dépôt n'a été modifié, à part ce rapport.

Notation : **Bloquant** (casse une règle d'or ou rend une information illisible), **Majeur** (contredit le design system de manière visible), **Mineur** (dette, finition). Effort : **S** (moins d'un jour), **M** (2 à 4 jours), **L** (une semaine ou plus).

---

## 0. Résumé

Depuis l'audit du 3 novembre, l'interface a beaucoup progressé. Le secteur de départ est en triangle, la lagune se voit dès le premier écran, il n'y a plus qu'un contour d'or par secteur à acheter, et les médailles des mules ont disparu. Les feuilles d'une ville montrent maintenant des cartes de commande, avec leur barre de stock et un seul « Livrer » en or. La vue du domaine existe, et aucun `text-[0.6…]` ne reste sous `map/`.

Le système visuel, lui, n'a pas suivi la 3D. Six défauts reviennent :

1. **L'or a perdu sa règle.** Chaque écran du parcours en montre deux à quatre : la pilule d'or d'une ville prête, « Rappeler » en or, Lorenzo en or au-dessus de « Tout récolter », le badge « PORTE », la carte du véhicule choisi bordée d'or, l'onglet « Combat » cerclé d'or, le minuteur d'un chantier, « Casa 1 » en or. Rien n'arbitre entre ces ors : chaque composant décide seul.
2. **Le HUD n'a pas été allégé** (R20 de l'audit précédent, non fait). Il garde quatre pilules empilées, dont faveur 0 et sceaux 0. À 320 px, la bourse mange le nom de la Maison et la pilule de Venise passe sous le HUD.
3. **Les noms de la carte suivent le zoom.** Ils descendent à environ 8 px au dézoom et deviennent flous de près : `.map-name` est mis à l'échelle par `--chartk`, entre 0,3 et 1,5.
4. **Les états désactivés sont illisibles.** Avec `opacity-35` ou `opacity-40`, le contraste tombe à 2,3:1 à 3,2:1. Or ces boutons portent souvent la seule information de l'écran (« Casa 9 », « Casa 2 · 50 d », « Poser ici · gratuit »).
5. **Les couleurs ne suivent pas toutes les tokens.** On compte 110 couleurs hexadécimales dans `empire/`. `art/palette.ts` mélange la palette Noyer et la palette Lagune. Les ronds du pied, la bourse et `.map-name` sont figés en bleu Lagune : ils ne suivent pas la palette Parchemin.
6. **La Porta en combat se lit mal.** Les unités ne font que quelques pixels, Rome est rouge `#E06A4A` alors que le cinabre de l'interface est `#FF8070`, les composants sont tronqués à 7 lettres et l'or y sert à la sélection.

Sur ordinateur, tout est fonctionnel, mais le monde tient dans un tiers de l'écran au milieu du verre. La colonne de droite prévue par `design.md` n'existe pas pour l'empire.

---

## 1. Ce qui a changé depuis l'audit du 3 novembre

| Rec. | Sujet | État | Preuve |
|---|---|---|---|
| R1 | Secteur en triangle | **Fait** | Venise au nord-est, Padoue à l'ouest, fondaco au sud-est (`390x844-1c-secteur.png`) |
| R2 | Tuile d'or du fondaco | **En partie** | La tuile est plus dorée dans le domaine (`2-maison`) ; sur la carte, elle est à peine distincte du sable (`1440x900-1c-secteur`) ; pas de quai crème |
| R3 | Lagune au départ | **Fait** | La mer est à l'est du fondaco |
| R4 | Barème d'échelles | **En partie** | La mule est plus petite ; le fondaco reste le plus gros volume du secteur |
| R6 | Un contour d'or par secteur | **Fait** | Contours extérieurs seulement (`19-dezoom`) |
| R7 | Verre plus léger | **Non fait** | Les blocs de verre font encore toute la hauteur et dominent le dézoom et le PC |
| R8 | La ville parle par le décor | **Remplacé** par `CityPill` (décision du porteur du 4 novembre) | Voir U-4 |
| R10 | Noms : priorité, pas de chevauchement, nom de la Maison | **Non fait** | « FONDACO CASA_390 », « FONDACO CASA_32 » coupé par le bord (`320x568-14`) |
| R11 | Feuille de ville en cartes, « Livrer » en or | **Fait** | `OrdersPanel.tsx:93-153`. La sélection est en or, voir U-1 |
| R13/R14 | Plus de médailles, l'animal est le bouton | **Fait** | `map3d/3-mule.png` |
| R15 | Puce de trajet dans le HUD | **Fait** | `Trips.tsx`. Mais « Rappeler » est en or, voir U-1 |
| R16 | Libellés sous les icônes du véhicule | **Non fait** | Trois carrés sans mot (`map3d/3-mule.png`) |
| R17/R18 | Vue du domaine, états des ateliers en 3D | **En partie** | La scène existe, mais les états sont des puces HTML (« À lancer », « attend bois », « 30:00 ») et il n'y a ni arc ni pile en 3D |
| R20 | HUD à une bourse | **Non fait** | `Hud.tsx:81-96`, `logic.ts:140-147` |
| R26 | Texte de la carte à 12 px minimum | **En partie** | La classe est à 12 px (`index.css:1182`), mais elle est mise à l'échelle (voir U-3) ; il reste des 10 et 11 px hors de `map/` (U-9) |

---

## 2. Constats

### U-1. « Une seule action en or » n'est plus tenue — **Bloquant** (règle Lagune, `design.md` l. 19 et 48)

Le token d'or ne sert plus seulement aux ducats et à la seule action à toucher.

| Où | Usage de l'or | Preuve |
|---|---|---|
| `CityPill.tsx:191` | Pilule pleine `bg-gold` qui respire, sur la carte, alors que la feuille du bas a aussi son or | `CityPill` |
| `Trips.tsx:74` | « Rappeler » : filet et texte en or. Sur le même écran que « Vendre » en or | `320x568-16-en-route.png`, `map3d/3-mule.png` |
| `EmpireGame.tsx:331-345`, `:478` | Lorenzo (toujours en or, avec reflet) posé au-dessus de la barre du domaine, qui a son propre « Tout récolter » en or (`Domain.tsx:196`) | — |
| `Domain.tsx:51`, `:108` | « Casa 1 » et le minuteur d'un chantier en `text-gold` : un libellé et un temps, pas de l'argent | `390x844-12-attente.png` (« 00:17 ») |
| `OrdersPanel.tsx:102` | Commande cochée : `border-gold/80 bg-gold/10`. Une sélection doit être en lapis (`info`) | `14-commandes` |
| `BattleDiorama.tsx:173` | Badge « PORTE » plein or (« jamais un badge ») | `porta/5-bataille.png` |
| `BattleDiorama.tsx:376` | Carte du véhicule choisi `border-gold bg-gold/10` : une sélection | `porta/6-bataille-en-route.png` |
| `BattleDiorama.tsx:344` | Les dégâts de Rome en `text-gold` | — |
| `BattleDiorama.tsx:48` | Spinner de chargement en or | — |
| `ArmsSheet` / `ArmsScene` | Onglet « Combat » actif cerclé d'or (« jamais un onglet ») | `porta/1-armes.png` |
| `PortaScene` | « Entrer · palier 1 » en or, « L'antiquaire » en filet d'or, palier « 1 » en disque d'or | `porta/4-porta.png` : trois ors |
| Pose d'un comptoir | Cercle en pointillés d'or, avertissement en texte or (« Aucune nouvelle ville… »), puis bouton or | `390x844-10c-comptoir.png` |
| `NewWorkshop` / Production | Icônes Fondaco et Remise dans des carrés cerclés d'or | `390x844-11-nouvel-atelier.png` |
| `CompanyTab.tsx:117` | `Ribbon tone="gold"` pour une progression | — |
| Boutons or désactivés | « Poser ici · gratuit », « Poser le Campo », « Poser un fondaco » : de l'or terne qui ne se touche pas, et qui pèse quand même | `1c-fondaco`, `7b-terraferme`, `10b-poser` |

**Recommandation** (effort M) :

- **Un arbitre d'or unique.** Un contexte `GoldSlot`, qui fonctionne comme un verrou : le premier qui le prend dans l'ordre de profondeur (feuille, puis panneau, puis Lorenzo, puis carte) le garde. Les autres passent en `ghost`. Le mécanisme `body[data-coaching]` existe déjà (`index.css:980`) : il suffit de l'étendre à `body[data-gold-owner]`.
- **Une pilule de ville prête ne se remplit plus d'or.** Elle passe en `bg-night/90` avec un anneau `ring-2 ring-gold` et l'arc en or. Elle ne respire que si aucune feuille n'est ouverte.
- **« Rappeler »** passe en `Slab tone="ghost"`.
- **« Casa n » et le minuteur d'un chantier** passent en `text-cream`. Un minuteur est en lapis, `text-info` (« le temps en lapis »).
- **Les sélections** (commande cochée, véhicule choisi, onglet actif) passent en `border-info bg-info/10`. Règle : *une sélection = lapis*.
- **Le badge « PORTE »** passe en crème sur nuit, `bg-night/85 text-cream ring-1 ring-edge`. La porte brille déjà en 3D.
- **Un bouton or désactivé n'existe pas** : il devient `ghost` avec sa raison écrite (voir U-5).
- **Ajouter un test e2e** : au plus un `[data-slab="gold"]` visible et non désactivé par capture (`e2e/assert.mjs`).

### U-2. Le HUD est trop lourd et chevauche à 320 px — **Bloquant** à 320 px, **Majeur** à 390 px

- **Quatre pilules sont empilées** à droite (ducats, faveur, sceaux, véhicules ; `Hud.tsx:81-96`), soit environ 170 px de haut. Faveur et sceaux sont affichés même à 0 (`logic.ts:144-145`).
- **À 320×568, la bourse recouvre le nom** (« Casa_32 » coupé sous « 358,88 d », `320x568-17-retour.png`, `18-rentree.png`). Cela contredit la règle du HUD (`design.md` : « rien ne s'écrit sur la colonne voisine… à 320 px »).
- **La pilule « 1/3 » de Venise passe sous la bourse et sous le nom** (`320x568-14`, `16`, `17`).
- **La puce de trajet** (« Padoue 0:30 » et « Rappeler ») s'empile sous le nom, sur la même bande que la pilule de Padoue (`320x568-16`).
- **Sur PC**, la colonne de pilules flotte seule au bord droit (`1440x900-1c-secteur.png`).

**Recommandation** (effort M) :

- **Une bourse unique** d'une seule ligne : ducats, puis les pièces de faveur et de sceaux seulement si elles sont non nulles, en 20 px avec leur chiffre. Elle se place dans une grille à deux colonnes, `grid-cols-[minmax(0,1fr)_auto]`, et le nom en `truncate`.
- **La flotte « 2/2 »** sort du HUD et va sur l'écurie, ou devient une petite roue avec son chiffre dans la même bourse.
- **Réserver la bande haute** (72 px) dans le cadrage de la caméra, pour qu'aucune pilule de ville ne passe dessous.
- **Sous 360 px**, nom et bourse un cran plus petits : `text-base`, comme le prévoit `design.md`.

### U-3. Les noms et les pilules de la carte ne tiennent pas une taille d'écran — **Majeur**

- **`.map-name` est à 12 px** (`index.css:1182`), mais il vit dans `.map-place`, qui est mis à l'échelle `scale(var(--chartk))`. En 3D, `--chartk` vaut `min(1,5 ; max(0,3 ; s/ref0))/k` (`EmpireMap.tsx:246-248`).
  - Au dézoom, le nom fait environ 8 px (« TREVISE », « PADOUE » dans `map3d/4-dezoom.png`, `390x844-19-dezoom.png`).
  - De près, il grossit en raster flou (« FONDACO CASA_3D » baveux dans `map3d/3-mule.png`).
- **La pilule de ville, elle, est compensée** (`.city-pill`, `scale(inv/chartk)`) : elle reste à taille fixe pendant que le nom rétrécit. Au dézoom, la pilule devient plus grosse que la ville et que son nom (`19b-au-plus-loin`).
- **Les noms ne se décalent pas** : « FONDACO CASA_32 » est coupé par le bord à 320 px.

**Recommandation** (effort S à M) :

- **Sortir le nom de l'élément mis à l'échelle** et lui appliquer la même compensation que la pilule : `scale(calc(var(--inv)/var(--chartk)))`. Le nom reste alors à 12 px nets.
- **Le masquer sous un seuil** (`data-far` existe déjà).
- **Écrire le nom de la Maison seul** (« Casa_390 », précédé du petit lion), pas « FONDACO CASA_390 ».
- **Mesurer en e2e** : `getBoundingClientRect().height` de chaque `.map-name` visible ≥ 14 px (12 px de corps).

### U-4. `CityPill` : lisible, mais sémantiquement fragile — **Majeur**

- **La marchandise est illisible.** La pilule montre la marque de la commande la mieux payée en 16 px (`CityPill.tsx:218`). Or `GoodsMark` ne grave son pictogramme qu'à partir de 20 px (`goods.tsx:108`) : à 16 px, c'est un rond de couleur (`1c-secteur`, Venise et Padoue).
- **La couleur de l'arc se confond.** L'arc est vert d'eau, la couleur du « prêt », alors qu'il mesure le remplissage des places. Une ville pleine a la même couleur qu'une production prête.
- **Elle n'est pas un bouton.** C'est un `span` avec `aria-label`, sans `role` (`CityPill.tsx:189-196`) : le lecteur d'écran ne l'annonce pas.
- **Couleur codée en dur** : `#1B2A44` (`:212`).

**Recommandation** (effort S) :

- **La marque à 20 px**, avec son pictogramme.
- **L'arc en crème atténuée** (`cream-dim`) pour les places prises, et en or seulement quand on peut livrer (voir U-1).
- **Un `role="img"`**, ou bien la pilule fait partie du bouton de la ville.
- **Remplacer `#1B2A44`** par `rgb(var(--ink))`.

### U-5. États désactivés et indisponibles illisibles — **Majeur** (WCAG 1.4.3 pour l'information portée)

Contrastes mesurés sur `night-2` (`#1D304D`) :

| Cas | Contraste |
|---|---|
| Crème à 35 % (`Slab` désactivé, `ui.tsx:85`) | 2,83:1 |
| Crème à 40 % (`ActionPanel.tsx:133`, `BattleDiorama.tsx:376`) | 3,25:1 |
| Encre sur or, à 35 % (bouton or désactivé) | 2,35:1 |

Ces boutons portent l'information de l'écran : « Casa 9 », la seule chose dite d'une case à acheter (`13-case.png`) ; « Casa 2 · 50 d » (`map3d/2b`) ; « Niveau max » (`4-panneau`) ; « Encaisser » ×8 (`7-compagnie`) ; les modèles de combat verrouillés (`porta/1-armes`).

**Recommandation** (effort S) :

- **Un token d'état `disabled`** : le texte en `muted` (`#9CB4D2`, 6,2:1 sur `night-2`), un filet `line` en pointillés, aucune baisse d'opacité, et un cadenas de 14 px. La raison est écrite en `.meta`.
- **Dans `ui.tsx`**, `disabled:opacity-35` devient `disabled:[&>.slab-face]:bg-transparent disabled:[&>.slab-face]:text-muted disabled:[&>.slab-face]:shadow-[inset_0_0_0_1px_rgb(var(--line))]`.
- **`theme.test.ts`** vérifie déjà `muted` sur les nuits.

### U-6. Des couleurs hors tokens, des palettes qui divergent — **Majeur**

- **`art/palette.ts:2-21` se dit « Lagune & Ducat » mais mélange les palettes.** `night #16263E` vient de Lagune, mais `gold #E8B24C`, `lagoon #7DB596`, `cream #F6E8CC`, `vermilion #E36A4A` et `info` sont ceux de Noyer, alors que Lagune a `#F4C554`, `#6EE0B8`, `#ECF5FF` et `#FF8070`. Toutes les illustrations SVG portent donc un or et un vert d'eau qui ne sont pas ceux des boutons.
- **Le monde 3D a sa propre palette `C`** (`gold #F2C24F`, `art/plateau/props.ts`), la Porta une autre (`#E06A4A` pour Rome, `#FFD27A`, `#9FE7FF` ; `Battle3D.tsx:181-192`), et les reliques ont `RARITY_HEX` (`#F2C24F`, `Battle3D.tsx:74-79`). Cela fait quatre ors : `#F4C554` (interface), `#E8B24C` (illustrations), `#F2C24F` (3D), `#ECBE50` (palette Or).
- **110 couleurs hexadécimales** dans `empire/**/*.tsx` (Battle3D 22, EmpireMap 21, minis 14, PortaScene 13, ArmsScene 10…). Les valeurs Tailwind arbitraires : `bg-[#16263E]` ×5 (dont `BattleDiorama.tsx:132`), `bg-[#1D304D]` et `ring-[#A9BCD4]/30` (`RoundButtons.tsx:87`), `bg-[#08111F]`, `bg-[#2A1630]`, `text-[#E8A0FF]`, `text-[#BFE3FF]`, `ring-[#B060D0]`.
- **Le CSS fige le bleu Lagune** : `.purse` (`index.css:1524-1530` : `#2e486e`, `#16263e`, `rgb(244 197 84 / 0.5)`) et `.map-name` (`rgb(11 22 38 / 0.65)`, `:1178`). En Parchemin, la bourse et les ronds du pied restent bleu nuit pendant que les feuilles deviennent claires. C'est peut-être voulu pour le HUD sur la nuit 3D, mais ce n'est écrit nulle part.
- **Les ombres ne sont pas tokenisées** : `shadow-lg shadow-black/40`, `/50`, `0_4px_12px_rgb(0_0_0/0.35)`, `0 4px 14px rgb(0 0 0 / 0.45)`, `0 6px 14px rgb(0 0 0 / 0.45)`. Cela fait au moins cinq élévations différentes pour le même rôle, « flotte sur la carte ».

**Recommandation** (effort M) :

- **Une seule source.** Exporter les tokens de `index.css` vers un `tokens.ts` (une valeur par palette) dont `palette.ts`, `C` et `RARITY_HEX` dérivent. Pour la 3D, soit on garde des tons propres mais *documentés* (`C.gold = tokens.lagune.gold`), soit on ajuste `#F2C24F` vers `#F4C554`.
- **Ajouter des tokens « sur la carte »**, indépendants de la palette et assumés (la carte est toujours de nuit) :
  - `--hud-bg: 22 38 62 / 0.85` ;
  - `--hud-ring: 169 188 212 / 0.3` ;
  - `--map-halo: 11 22 38 / 0.65`.
- **Trois élévations** :
  - `--elev-1: 0 2px 6px rgb(0 0 0/.35)` (puces) ;
  - `--elev-2: 0 6px 14px rgb(0 0 0/.45)` (HUD, pilules) ;
  - `--elev-3: 0 12px 32px rgb(0 0 0/.5)` (feuilles).
- **Un test** (à la manière de `theme.test.ts`) qui refuse `#[0-9a-f]{6}` dans `empire/**/*.tsx` hors de `map3d/` et `porta/*3D*`.

### U-7. Le lagon et le lapis employés comme boutons — **Majeur** (`design.md` : « Lagune : jamais un bouton ni un libellé neutre »)

- **« Production »** en `text-lagoon` dans la barre du domaine (`Domain.tsx:186`, `2-maison.png`).
- **« + Bâtir ici »** : filet et texte en lagon (`Domain.tsx:124`).
- **Les icônes du panneau véhicule** cerclées de lagon (`map3d/3-mule.png`). La pilule « 26 s » est pleine en lagon : le lagon est réservé au « prêt », et une durée en cours devrait être en lapis.
- **« + Bâtir ici »** devrait suivre le fantôme de la parcelle libre : pointillés crème, `+` en crème. **« Production »** devrait être un `Slab tone="text"` (lapis).

Effort S.

### U-8. Feuilles, panneaux et onglets : une anatomie qui dérive — **Majeur**

- **Trois anatomies de pied coexistent** : `ActionPanel` (ronds de 48 px à libellé, `border-info/40`), `OrdersPanel` (`border-line`, cartes) et `DomainBar` (« ‹ Carte », titre centré, lien en lagon). Les titres sont tous en Cinzel 14 px, mais les sous-titres et les marges diffèrent (`px-3 pt-2` contre `px-4 pt-3`, `ActionPanel.tsx:104` contre `OrdersPanel.tsx:73`).
- **La barre du domaine tronque son titre** : « DOMAINE · C… » à 320 px (`320x568-2-maison.png`). Son retour est un `‹` de texte, et non le chevron rond de 44 px prévu.
- **Lorenzo tronque** au milieu d'une phrase : « Bâtissez cet atelier :… », « Un objectif du Carnet (ongle… » (`line-clamp-2`, `Guide.tsx:97`). On perd le complément, qui est justement l'information.
- **Les onglets des feuilles** (Bâtiments/Véhicules, Carnet/Associés/Terraferme) utilisent un `Segmented` en pilule lapis : c'est conforme. Mais à la Remise des armes, l'onglet actif est en or et l'inactif sans filet (`porta/1-armes`).
- **Panneau d'un lieu, la case à acheter** : une seule action, désactivée, au milieu de 150 px de vide (`13-case.png`).

**Recommandation** (effort M) :

- **Un composant `FootPanel`** : en-tête (surtitre `.label`, titre Cinzel 15 px, croix) ; corps ; une seule rangée d'actions ; puis `.meta`. Marges `px-4 pt-3 pb-safe`, filet `border-t border-edge/60`. `ActionPanel`, `OrdersPanel` et `DomainBar` s'en servent tous les trois.
- **Le titre du domaine** sur deux lignes : le surtitre « DOMAINE », puis « Casa 1 ».
- **Lorenzo** passe à `line-clamp-3` sous 360 px, et la phrase ne finit jamais sur « : ».

### U-9. Typographie : les rôles sont respectés, les minima ne le sont pas partout — **Mineur**

- **Encore sous 12 px** :
  - `ui.tsx:162` : badge à 9 px (`text-[0.5625rem]`) ;
  - `Term.tsx:23` : 10 px ;
  - `porta/Battle.tsx:363` : 10 px ;
  - `Battle.tsx:153`, `ArmsSheet.tsx:124`, `game/map/TerraLayer.tsx:1276` : 11 px.
- **Le libellé « FERMETURE »** du combat (`BattleDiorama.tsx:192`) est en Space Grotesk capitales `text-xs opacity-80`. C'est un sur-titre : il devrait être `.label` (Space Mono).
- **Chiffres tabulaires** : la bourse, les pilules et les minuteurs les ont (`tabular-nums`). Les prix de `ActionPanel` (`:146`) aussi. Les PV « 1200/1200 » (`BattleDiorama.tsx:380`) les ont. Je n'ai pas trouvé d'oubli dans le HUD.
- **Ce qui est respecté** : Cinzel est bien réservé aux lieux et aux titres. Archivo élargi (`font-stretch: 125%`) sert aux chiffres, Space Mono seulement aux sur-titres.
- **Proposition** : une échelle nommée dans `tailwind.config.js` (`fontSize`) pour remplacer les valeurs arbitraires (`text-[0.8125rem]` ×18, `text-[0.9375rem]` ×3, `text-[1.0625rem]` ×2) :

  | Nom | Taille | Usage |
  | --- | --- | --- |
  | `meta` | 13 px / 1,35 | données en petit |
  | `body` | 15 px | texte courant |
  | `place` | 15 px | Cinzel, tracking 0,12 em |
  | `figure` | 16 px | Archivo 800 |

  Plus une règle de lint qui refuse `text-[` sous `0.75rem`.

Effort S.

### U-10. Iconographie et `GoodsMark` — **Mineur** à **Majeur**

- **Deux bibliothèques d'icônes** (`art/icons.tsx` et `game/map/icons.tsx`), importées l'une 5 fois, l'autre 6 fois sous `empire/`. Le trait est de 1,8 dans la seconde ; les tailles vont de 11 à 26 px (`Coin size={11}` ×3 et `{12}` ×4 sous 12 px).
- **`GoodsMark` est utilisé sous 20 px**, donc sans pictogramme :
  - 14 px dans les puces du domaine (`Domain.tsx:96`) ;
  - 16 px dans la `CityPill` ;
  - 18 px sur la carte SVG (`EmpireMap.tsx:1386`).

  Sur la carte, on ne distingue l'argile du bois que par une nuance de brun ou de vert.
- **Au Marché, les marques sont toutes creuses**, faute de stock (`6-marche.png`). C'est conforme à la règle « creuse = le stock ne couvre pas », mais au Marché la marque doit dire *quelle* marchandise, pas une couverture de commande. Résultat : une colonne de contours vides, sans pictogramme (`covered` conditionne le glyphe, `goods.tsx:108`).
- **Le panneau véhicule** n'a que des icônes sans libellé (R16 de l'audit précédent, toujours ouvert).

**Recommandation** (effort S) :

- Au Marché, appeler `GoodsMark` avec `covered` à vrai (ou un nouveau mode `identity`) : forme pleine et pictogramme.
- Taille minimale de `GoodsMark` à 20 px hors des puces de liste.
- Fusionner les deux bibliothèques d'icônes en une seule, `art/icons.tsx` : grille 24, trait 1,75, tailles 16, 20 et 24.

### U-11. États des composants — **Mineur**

- **Pressé** : `Slab` est très bien (`.press`, 90 ms, ressort). En revanche, les ronds du pied, les pilules et les puces du domaine ont un `active:scale-95` nu, sans durée tokenisée ni retour haptique.
- **Chargement** : `ActionPanel` attend avec `animate-pulse` sur le carré entier (`:133`), alors que `Slab` a son anneau `slab-busy`. Deux langages pour la même attente.
- **Focus** : le contour de focus des ronds du pied est rectangulaire (`RoundButtons.tsx:83` : le bouton est la colonne icône et libellé, pas le rond). On le voit dans `390x844-9-carte.png` (« Famille ») et `map3d/4-dezoom.png` (« Maison »). Cela contredit « un contrôle rond porte son arrondi ». Correctif : `rounded-2xl` sur le bouton, ou le contour placé sur le rond (`focus-visible:[&>span]:outline`).
- **Sélectionné** : voir U-1 (l'or à la place du lapis).

Effort S.

### U-12. Cohérence entre le HTML et la scène 3D — **Majeur**

- **Pilules et puces en HTML** : `bg-night/85`, `rounded-full`, `shadow-black/50`, 12 px. Elles sont propres, mais sans lien avec la matière de la scène (cuir surpiqué pour la bourse, médaillons frappés). La bourse est en `.purse` (cuir surpiqué), alors que la puce de trajet, la `CityPill` et les puces du domaine sont en nuit plate : deux matières pour le même rôle.
- **« Casa 1 »** est un disque HTML posé *sur* le hall du fondaco : il le masque en partie (`2-maison.png`, `12-attente.png`). Il n'est pas ancré à côté du modèle.
- **Les puces des ateliers du domaine** (« À lancer », « attend bois ») flottent entre deux tuiles. On ne sait pas à quel atelier elles sont attachées (`2-maison.png`, la puce « attend bois » sous la tuile vide).
- **Recommandation** (effort M) :
  - Une seule matière pour tout ce qui flotte sur la scène : `.chip-map` (fond `--hud-bg`, filet `--hud-ring`, `--elev-2`, 28 px de haut, 12 px).
  - La puce ancrée au pied du modèle, avec un petit ergot de 6 px pointé vers lui.
  - « Casa n » dans un médaillon de 28 px *à côté* du hall, en haut à droite de la tuile d'or.

### U-13. Porta : le combat se lit mal — **Bloquant** (règle d'or 8, « tout se voit »)

- **À la vue d'ensemble**, les unités du joueur et celles de Rome font 4 à 8 px (`porta/5-bataille.png`). On distingue des villes en ruines avec des cercles rouges et un point lapis, mais aucune unité de Rome n'est identifiable. Le véhicule choisi n'est qu'un point bleu (`6-bataille-en-route`).
- **De près** (`6b-bataille-pres.png`), les sapins de 3D occupent tout l'écran et la croix de fermeture disparaît sur la scène (filet seul, aucun fond).
- **La couleur de l'ennemi** est `#E06A4A` en 3D, contre le cinabre de l'interface `#FF8070` (`Battle3D.tsx:181-189`). Les deux ne se reconnaissent pas comme la même chose.
- **Les composants actifs** sont tronqués à 7 lettres : `(pt.component[a.effect] ?? a.effect).slice(0, 7)` (`BattleDiorama.tsx:448`).
- **Le badge « PORTE »** est en or, la carte du véhicule choisi aussi (U-1).
- **Les PV** sont en lagon pour les miens (`hpMine #6EE0B8`) : le lagon est le « prêt ». Un PV devrait être neutre (crème) puis passer au cinabre quand il est bas.
- **Rareté** : `rare` est en lagon, `precious` en lapis. Les reliques reprennent donc les couleurs de « prêt » et de « sélection ».

**Recommandation** (effort M à L) :

- **Un pion par unité au-dessus de son modèle**, à taille d'écran fixe : losange de 20 px, cinabre `--vermilion` pour Rome, lapis pour moi, vert d'eau pour mes alliés, avec l'initiale de l'unité. Le même pion que le disque SVG de `design.md` § Porta, posé sur la 3D. Il reste visible à tous les zooms.
- **Une barre de PV de 24×3 px** sous le pion : crème, puis cinabre sous 30 %.
- **Les composants** avec leur icône et un libellé abrégé du dictionnaire (`pt.componentShort`), jamais un `slice`.
- **Croix** : la `CloseButton` sur `bg-night/80`.
- **Rome à `#FF8070`** en 3D, ou bien `--vermilion` aligné sur le rouge pontifical. Un seul rouge.
- **Rareté** : crème, bronze `#C08A5A`, argent `#C9D2DE`, or. Elle évite le lagon et le lapis, et l'or des reliques légendaires reste rare. Un test ΔE comme `goods.test.ts`.

### U-14. Ordinateur 1440×900 — **Majeur**

- **Le monde visible tient dans environ 500×300 px au centre**, perdu dans une grille de verre sur tout l'écran (`1440x900-1c-secteur.png`). Le premier écran ne montre rien de plus qu'un téléphone.
- **Les feuilles sont des fenêtres centrées** (`6-marche`) : c'est correct. Mais la carte n'utilise pas la colonne de 384 px prévue par `design.md` (« SideColumn », commandes et ateliers). Sur un écran large, la ville et sa feuille pourraient vivre côte à côte.
- **Le panneau d'une ville** est centré en bas (`14-commandes`) et cache le sud de la carte, alors que la moitié droite de l'écran est vide.
- **Le HUD** est collé aux deux coins, à 1 400 px l'un de l'autre.
- **Recommandation** (effort M) :
  - Zoom de départ plus fort sur PC : le secteur dans 60 % de la hauteur.
  - Panneaux flottants en bas à droite (`lg:right-4 lg:left-auto`, comme le prévoit `design.md`, « Sur ordinateur, flottant en bas à droite »).
  - Le HUD dans un conteneur `max-w-[1200px] mx-auto`.

### U-15. Divers — **Mineur**

- **`Hud.tsx:2` importe `P` sans s'en servir.**
- **La `.purse` a un `outline` en pointillés.** Au focus clavier, l'`outline` lapis remplace la surpiqûre : on perd la couture pendant le focus. Utiliser un `box-shadow` pour la couture.
- **Le contour d'or des secteurs à acheter** reste visible sur les bords lointains, jusqu'à l'écran entier au dézoom (`19b`). Il faudrait l'atténuer au-delà des voisins directs.
- **Deux durées de caméra sont déclarées deux fois** dans des blocs `:root` séparés (`index.css:236` et `:1205`). Les réunir dans un seul bloc de tokens.

---

## 3. Tokens proposés (récapitulatif)

```css
:root {
  /* Sur la carte (toujours de nuit, quelle que soit la palette) */
  --hud-bg: 22 38 62;          /* utilisé à /0.85 */
  --hud-ring: 169 188 212;     /* utilisé à /0.30 */
  --map-halo: 11 22 38;        /* utilisé à /0.65 */
  /* Élévation */
  --elev-1: 0 2px 6px rgb(0 0 0 / 0.35);
  --elev-2: 0 6px 14px rgb(0 0 0 / 0.45);
  --elev-3: 0 12px 32px rgb(0 0 0 / 0.5);
  /* Rayons : pilule 9999px ; carte 18px (.cut) ; puce de liste 12px ; rien d'autre */
  --r-card: 1.125rem;
  --r-chip: 0.75rem;
}
```

| Rôle | Valeur | Règle |
|---|---|---|
| Or (`gold`) | `#F4C554`, une seule source (`palette.ts`, `C.gold` et `RARITY_HEX.legendary` en dérivent) | ducats et une seule action |
| Sélection | `info #6EC8F5` : `border-info bg-info/10` | jamais l'or |
| Désactivé | texte `muted #9CB4D2` (6,2:1), filet `line` en pointillés, pas d'opacité | raison en `.meta` |
| Ennemi | `vermilion #FF8070` en 2D comme en 3D | un seul rouge |
| PV | crème, puis cinabre sous 30 % | pas de lagon |
| Typographie | `meta` 13, `body` 15, `place` 15, `figure` 16 ; minimum 12 px *mesuré à l'écran* | test e2e |
| Espacement | grille de 4 px ; pied `px-4 pt-3` ; HUD `3` (12 px) des bords | — |

---

## 4. Top 10 priorisé

| # | Action | Sévérité | Effort |
|---|---|---|---|
| 1 | **Un arbitre d'or unique** (`GoldSlot`) et un test e2e « ≤ 1 or actif par capture » ; `CityPill`, « Rappeler », Lorenzo sur le domaine, « Casa 1 », les minuteurs, « PORTE », les sélections et les onglets sortent de l'or (U-1) | Bloquant | M |
| 2 | **HUD à une bourse d'une ligne** (faveur et sceaux seulement si non nuls, flotte hors du HUD), grille à deux colonnes qui ne chevauche plus à 320 px, bande haute réservée dans le cadrage (U-2) | Bloquant à 320 px | M |
| 3 | **La Porta lisible** : pions à taille d'écran fixe sur chaque unité (cinabre pour Rome, lapis pour moi), PV neutres puis cinabre, croix sur fond, composants sans `slice(0,7)`, un seul rouge (U-13) | Bloquant | M à L |
| 4 | **Noms de la carte compensés en taille** (12 px nets à tout zoom), nom de la Maison seul, décalage ou masquage au bord (U-3) | Majeur | S à M |
| 5 | **Token d'état désactivé** à 6:1 (fini l'`opacity-35`/`40`) et suppression des boutons or désactivés (U-5) | Majeur | S |
| 6 | **Une seule source de couleurs** : `palette.ts` aligné sur Lagune, `C` et `RARITY_HEX` dérivés, tokens carte et élévation, test anti-hexadécimal hors 3D (U-6) | Majeur | M |
| 7 | **`FootPanel` commun** à ActionPanel, OrdersPanel et DomainBar ; chevron de retour rond ; titre sans troncature ; Lorenzo sans phrase coupée (U-8) | Majeur | M |
| 8 | **Lagon rendu au « prêt »** : « Production » en texte lapis, « Bâtir ici » en fantôme crème, « 26 s » en lapis (U-7) | Majeur | S |
| 9 | **Matière unique `.chip-map`** pour tout ce qui flotte sur la 3D, ancrée par un ergot ; « Casa n » à côté du hall ; `GoodsMark` à 20 px avec pictogramme (pilule, Marché) (U-4, U-10, U-12) | Majeur | M |
| 10 | **PC** : zoom de départ plus fort, panneaux en bas à droite, HUD contenu ; plus focus arrondi des ronds et libellés sous les icônes du véhicule (U-14, U-11, R16) | Majeur | M |

## 5. Bloquants (rappel)

- **U-1** : la règle « une seule action en or » est violée sur la plupart des écrans du parcours (2 à 4 ors visibles).
- **U-2** : à 320×568, la bourse recouvre le nom de la Maison et les pilules de ville passent sous le HUD.
- **U-13** : en combat à la Porta, les unités (Rome surtout) ne se lisent pas à la vue d'ensemble, ce qui contredit la règle d'or 8.
