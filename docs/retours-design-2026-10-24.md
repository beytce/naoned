# Retours design : le chef tranche (24 octobre 2026)

Deux bêta-testeurs attentifs au design, Camille et Malik, ont joué la première session complète. Ils ont ensuite regardé les captures du 24 octobre : téléphone 390 × 844 et 320 × 568, PC 1440 × 900, et une Terraferme un jeudi à 40 marchands, état produit par le simulateur. Deux devs/designers ont vérifié leurs retours sur les captures et dans le code : Léa (système de design, typographie, guide, feuilles) et Hugo (carte de la Terraferme, carte du commerce, HUD, déroulé du guide). Le porteur a donné un retour direct, qui passe avant tout le reste : « Dans la Terraferme, les textes en haut à droite sont trop nombreux (Escarmouche, Revoir la semaine, etc.) et donc illisibles. Aussi la carte en elle-même est compliquée à lire, identifier ses terres, etc. »

Les numéros de ligne renvoient au commit `8a1f9f4`, et les captures au dossier `shots/` du banc. **Rien n'est exécuté avant la validation du porteur** (CLAUDE.md : mode plan). Ce lot ne contient aucune nouvelle mécanique : c'est de l'affichage, des textes et des garde-fous.

## Verdict du chef

Le porteur a raison, et sur ses deux points. J'ai regardé moi-même `390x844/36-terra-jeudi.png` et `tour-1440x900/10-terraferme-jeudi.png`. J'ai aussi vérifié le code.

**Le haut à droite empile trop de choses.** Sur téléphone, il y a 5 blocs : troupes, Gloire, plaque de 2 lignes, « ? » et 2 ronds muets. La carte ne commence qu'à environ 260 px CSS. Sur PC, 9 lignes s'empilent, dont 3 liens soulignés de style web (`TerraLayer.tsx:1194-1265`). Cela viole la règle du HUD n° 1 de `design.md`.

**La carte, elle, ne se lit pas.** Les chiffres de troupes sont dessinés en SVG à l'échelle du zoom, donc plus gros que les noms de villes. Aucune étiquette n'évite les autres. Ma propre terre a une teinte tirée au hasard, souvent violette, avec un filet or de 1,3 (`look()`, `TerraLayer.tsx:744-782`). Sur la capture de téléphone, il m'a fallu plusieurs secondes pour trouver ILARIA_MOCENIGO sous son propre camp et sous la pastille « ⚔ 29 · 17 h 31 ».

**Donc non : la Terraferme n'est pas jouable visuellement aujourd'hui en milieu de semaine.** Elle l'est à 5 marchands en trêve, plus du tout à 40 un jeudi. C'est le seul bloquant de ce lot.

Le reste du lot est fait de casses réelles et petites : montants coupés, libellés superposés, « un mot par ligne », podium. On les corrige vite.

Mes deux devs ont fait un travail sérieux : trois retours « bloquants » de Malik sont des artefacts du banc, démontrés chiffres à l'appui. Mais leurs lots se recouvraient sur 6 sujets : montants, libellés d'alliance, guide, palette de la Terraferme, HUD et toasts. J'impose un seul propriétaire par chantier.

J'écarte aussi trois propositions qui contredisent le porteur ou ajoutent du texte en haut à droite :
- la légende posée sous la plaque ;
- la grille masquée au cadrage large ;
- le menu « ≡ ».

## Décisions demandées au porteur

1. **Direction artistique : portulan/parchemin (testeurs) contre bleu actuel (votre choix du 20 octobre).**
   - *Ma recommandation* : garder Lagune & Ducat, sans refonte « portulan ».
   - Voie médiane, couverte par l'item 9 : cyan du guide adouci, cadre de 1 px, cachet de cire de Lorenzo.
   - Le parchemin reste la palette claire au choix.
   - Le problème de la Terraferme est la hiérarchie, pas la couleur du fond : une refonte de la direction artistique ne le réglerait pas.
2. **Police à empattements pour les titres et les lieux.**
   - *Ma recommandation* : oui, mais limitée aux noms de lieux des deux cartes et aux titres de feuille.
   - Une seule capitale humaniste libre, embarquée par `@fontsource` (aucun appel externe), dans un sous-ensemble latin.
   - Elle viendrait après l'item 7 (échelle de texte de la carte), pour juger sur une carte enfin lisible. Effort M, propriétaire Léa.
3. **« Terraferma » (la région, dans « Équipe · Terraferma ») contre « Terraferme » (le mode).**
   - *Ma recommandation* : le mode reste « Terraferme ».
   - À l'écran, la région s'affiche sous un autre nom (« Vénétie », ou un nom d'époque de votre choix). La clé de code ne change pas.
   - Il faudra mettre à jour les motifs de `layout.mjs` (`teamWeek`).
4. **Porte du bas « Commerce » sur la Terraferme.**
   - *Ma recommandation* : garder la porte qui nomme la destination (règle du HUD n° 6), écrite « ← Commerce » avec la flèche de retour, en crème et non en or.
   - Elle n'aurait plus l'air de « l'onglet actif ».
5. **Logo dans le jeu.**
   - *Ma recommandation* : montrer `Emblem` en médaille ronde (`rounded-full`), sans son carré olive. La source reste intacte, comme le veut `design.md`.
   - Non au logo « redessiné en aplat » demandé par Camille : `design.md` interdit de le redessiner.
6. **Mois de la saison à côté de « Venise 1450 ».**
   - *Ma recommandation* : « Venise 1450 · saison d'octobre », en minuscules et sans l'année civile.
   - Le mois sert (une saison = un mois civil), l'année casse l'époque.

Je tranche moi-même deux points qui ne sont pas de la direction artistique :

- **Sur la Terraferme, l'or veut dire « à vous ».** `design.md` (§ Terraferme) le dit déjà : terres « cerclées d'or », camp « en or ». C'est le contraste le plus fort sur une carte bleue, alors que le lapis se confond avec l'eau et la lagune. En échange, **la case touchée passe en lapis**, comme la sélection sur la carte du commerce (`design.md`, rôle Lapis). Cela règle le conflit « or = argent » soulevé par Léa.
- **Le cadrage à l'ouverture** se fait sur ma terre et ses voisins (item 8). C'est un choix d'affichage, pas une règle.

## Plan approuvé, dans l'ordre d'exécution

Deux voies en parallèle :
- **Hugo** : items 1, 3, 5, 6, 7, 8, 10, 13 ;
- **Léa** : items 2, 4, 9, 11, 12, 14, 15, 16.

Les dépendances sont indiquées dans chaque item. Les efforts : S ≤ ½ j, M 1 à 2 j, L > 3 j.

À chaque item :
- un commit, ou un par sous-point quand c'est dit ;
- `pnpm test`, `typecheck`, `lint` et l'e2e `layout.mjs` aux deux formats, au vert ;
- `design.md` mis à jour par le propriétaire de l'item.

Aucune règle ne change, donc pas de `seasonNotes`.

### 1. Un « jeudi figé » dans l'e2e, et un banc de capture fiable (Hugo · S · impact critique)

**Problème.** Trois « bloquants » de cette campagne sont des faux défauts du banc (voir Rejetées). Et rien dans `apps/web/e2e/layout.mjs` ne joue une Terraferme chargée : les étapes `terraferme-treve` et `teamWeek` (`layout.mjs:279`, `:423`) se jouent à quelques marchands.

**Décision.** Le garde-fou passe avant les corrections. Chaque item de la Terraferme y ajoute ensuite sa règle.

**Plan.**
- Figer `terra-view.json`, produit par `scratchpad/review/stage-terra.ts`, dans `apps/web/e2e/fixtures/terra-midweek.json`. Le marchand « moi » de la fixture doit être le compte de l'e2e : aujourd'hui, le HUD dit « e2e_390… · #1 » et la vue dit « ILARIA_MOCENIGO · 7e ».
- Dans `layout.mjs`, une étape `terraferme-jeudi` en 390, 320 et 1440, qui injecte la fixture. Elle route aussi `**/api/game/terra/replay`, vers une relecture cohérente ou vide. Les instants sont décalés une seule fois, et non à chaque appel.
- Le banc du scratchpad : souris placée sur le dialogue avant la molette, cartes du HUD fermées avant chaque bouton, toucher sur une vraie case (un point calculé dans la terre) et non au centre du premier `svg`.

**Mesure.** L'étape `terraferme-jeudi` tourne au vert avec les règles existantes : 44 px, pas de débordement, pas de bloc du HUD sur un nom de carte. Les items 5 à 8 y ajoutent leurs règles, d'abord en rouge sur le code actuel.

**Le chef.** Sans ce banc, on aurait « corrigé » des bandes rouges qui n'existent pas en jeu. Il est court et sert à tout le reste.

### 2. Casses de texte et montants (Léa · S à M · impact critique)

**Problème vérifié.** Chaque casse est vue sur la capture et dans le code :
- **« 10 / d », « 128,55 / d ».** L'espace avant « d » est ordinaire (vérifié octet par octet : `format.ts:15`, et `:9` pour « ducats »). Le `dd` de `HudTips.tsx:105-117` n'est ni `whitespace-nowrap` ni `shrink-0`.
- **« Proposer l'alli*Désig*ner aux alliés »** (`37`). Un libellé `whitespace-nowrap max-w-full` est enfermé dans un bouton de 72 px (`map/Panel.tsx:157`, `:169`).
- **« Lorenzo conseille » à un mot par ligne** (`tour-390x844/06-4-bas`). La rangée `flex items-center` (`Advice.tsx:55`) met un `Slab` sans retrait face au texte en `flex-1`.
- **« 150 D » en capitales** (`14`). `Slab` est en `uppercase` (`ui.tsx:53`).
- **Podium.** Les noms sont collés, faute de `min-w-0` (`Top.tsx:116-131`). Et le podium ne montre pas le même blason que la liste : `defaultCrest(\`${rank}-${pseudo}\`)` à `Top.tsx:117`, contre `crestOf(r)` qui passe par `r.id` (`:23-24`).
- **« +11000 d » sans séparateur** sur la ligne du rival (`48`).
- **Titre « CLASSEMENT » fantôme au défilement**, et liens du pied cachés derrière « Votre rang » (`tour-1440x900/03-1-bas`).

**Plan (tests d'abord).**
- `apps/web/test/format.test.ts` (nouveau) : `d()` et `ducats()` ne contiennent aucune espace sécable ; le séparateur des milliers est U+202F.
- `format.ts` : espace insécable fine avant « d » et « ducats », et sortie de `ducatsFormat` normalisée en U+202F.
- `HudTips.tsx` : `dd` en `shrink-0 whitespace-nowrap`, `dt` en `min-w-0`. Léa en est propriétaire, Hugo est prévenu.
- `Panel.tsx:169` : `whitespace-normal text-center leading-tight line-clamp-2`. Libellés courts « S'allier » et « Désigner » (`i18n.ts`, `holder.ally`, `diplomacy.target`), le libellé complet en `aria-label`.
- `Advice.tsx:55` : `flex-wrap`, le `Slab` en `basis-full` sous 480 px.
- `Slab` : un montant s'écrit en `normal-case` (composant `Amount`). Étendre `typography.test.ts` aux `Slab` qui reçoivent un `d(...)`.
- `Top.tsx` : `min-w-0 w-full px-1` sur les colonnes du podium. `crestOf` partout. L'`id` est ajouté au `PodiumRow` de la semaine passée côté serveur (`types.ts`, une ligne).
- Classement : le titre passe dans `Sheet title=` ; « Semaine passée · Règles » montent dans l'en-tête.
- `e2e/assert.mjs`, deux règles nouvelles :
  - aucun libellé de bouton dont `scrollWidth > clientWidth + 1` ;
  - aucun bloc de texte « un mot par ligne » (plus de 4 lignes pour moins de 8 caractères de large).

**Mesure.** Les tests ci-dessus sont verts. Les captures `26`, `37`, `46`, `tour-390x844/03-1` et `06-4-bas`, refaites, sont sans casse. Le même blason apparaît au podium et dans la liste.

**Le chef.** Doublon fusionné : les montants et les libellés d'alliance étaient dans les deux lots. Léa en est la seule propriétaire, y compris pour les deux lignes de `HudTips` et de `Panel`. Ce sont les images « cassées » qu'un joueur verrait en premier.

### 3. Correctifs de comportement de la Terraferme (Hugo · S · impact fort)

**Problème vérifié.**
- **Échap ne ferme pas les cartes du HUD.** `HudTips.tsx` n'écoute aucune touche, alors que `Sheet` le fait (`ui.tsx:466`).
- **Relecture muette.** « Revoir la semaine » ne montre aucun indicateur, contrairement à l'absence (`MapScreen.tsx:772-776`).
- **Aucune garde contre une relecture d'une autre carte** (`TerraLayer.tsx:310-352`).
- **« Fronts rentrés » trop grand.** La carte est pleine largeur à 5,25 rem du bas et couvre Ferrare et Mantoue (`tour-1440x900/10`, `TerraLayer.tsx:1771-1797`).
- **Bulle de Lorenzo pendant la pose du camp.** Elle couvre le tiers sud, juste au-dessus de l'invitation (`32`, `TerraLayer.tsx:1964`).

**Plan.**
- Échap dans `useTip` et dans le tiroir des véhicules (`HudTips.tsx:64-74`, `:248-253`).
- Pastille « Semaine rejouée · Passer », du même style que « Pendant votre absence ».
- Fonction pure `replayFits(initial, current)` : une relecture dont la taille de carte diffère est ignorée. Test unitaire.
- « Fronts rentrés » : une ligne compacte (`max-w-sm`) au-dessus des portes, repliée en pastille « ↩ 1 » après 8 s, « Compris » gardé. Jamais en haut à droite.
- Bulle de la pose du camp : en haut, sous la bande du HUD, texte limité à 2 lignes. Son style vient de l'item 9.

**Mesure.**
- Étape PC de `layout.mjs` : ouvrir Ducats, appuyer sur Échap, la carte a disparu.
- Le test `replayFits` est vert.
- Sur `terraferme-jeudi`, la règle « aucun bloc du HUD sur un nom de carte » compte aussi « Fronts rentrés ».

**Le chef.** Ce sont les vrais défauts que cachaient les artefacts R11 à R13. Petit lot, sans risque.

### 4. Briques du système pour la Terraferme (Léa · S · impact critique, prérequis de 5 et 6)

**Problème vérifié.**
- Le même ⚔ sert aux troupes (`TerraLayer.tsx:1120`) et à l'Escarmouche (`:1173`).
- Les liens sur PC sont en `underline`, un style absent du système (`:1215`, `:1224`, `:1233`).
- `TERRA_TONES` (`terraShapes.ts:158-171`) contient des tons trop proches des couleurs réservées :
  - 3 verts proches du vert d'eau des alliés : `#3FA36B`, `#5DBF9A`, `#3E9C9C` ;
  - un orangé proche du vermillon : `#C8693F` ;
  - 2 bleus proches de l'eau et du lapis : `#6FA8D6`, `#6B7FA6`.
- Les pictos des camps sont illisibles sous 18 px.

**Plan.**
- `ui.tsx` : `HudChip` (icône + libellé court, 44 px, tons `info` et `vermilion`) et `Slab tone="text"` (le 3e niveau de bouton, sans soulignement), documentés dans `design.md` : « or unique, fantôme, texte ».
- `art/icons.tsx` : `troops` (casque) et `skirmish` (épées et fanion).
- `art/crest.tsx` : `MiniCrest`, un rond à l'émail avec le meuble en silhouette, lisible à 14 px.
- `terraShapes.ts` : les 6 tons ci-dessus sont retirés et remplacés par 2 tons chauds sourds, soit 8 tons, assez pour que deux voisins ne partagent jamais le même. Saturation ≤ 45 %.
- Tokens de texte de carte (`art/palette.ts`) :
  - ville 12 px en capitales ;
  - marchand 11 px, 12 px pour moi et pour les grands territoires ;
  - effectif 11 px en pastille ;
  - halo sombre.
- Tests (`test/terraShapes.test.ts`, `theme.test.ts`) :
  - aucun ton à moins d'un écart ΔE de 20 de l'or, du vert d'eau, du vermillon, du lapis et de l'eau ;
  - deux voisins jamais du même ton, avec 8 tons ;
  - contraste AA du texte de carte sur son halo.

**Mesure.** Tests verts ; `icons.test.ts` (un picto, un sens) étendu à `troops` et `skirmish`.

**Le chef.** Léa livre les briques, Hugo les pose. Ce sont deux livrables distincts, sans doublon : Léa ne touche pas `look()`, Hugo ne choisit pas les couleurs.

### 5. HUD de la Terraferme allégé : deux blocs en haut, les actions au pouce (Hugo · M · impact critique, retour du porteur)

**Problème vérifié.**
- Téléphone (`36`) : la bande descend à environ 235 px CSS. Elle contient les troupes, la Gloire, une plaque de 2 lignes avec « ? », et 2 ronds muets ⚔ et ⟲ (`TerraLayer.tsx:1112-1192`).
- PC (`tour-1440x900/10`) : 9 lignes (`:1194-1265`).
- Le guide apparaît en double : la porte Aide ouvre déjà le guide de la Terraferme (`MapScreen.tsx:754-755`, vérifié).

**Décision.**

| Avant | Après |
|---|---|
| Troupes « ⚔ 121 / 140 +40/h » | Gardées, sous la bourse, avec le picto `troops` (item 4) |
| « 2502 Gloire · 7e » | Retiré du HUD. La Gloire et le rang vont dans la carte des troupes (`HudTips`), dans « Ma terre » et au Classement |
| Plaque de 2 à 4 lignes, avec « ? » | Plaque de **2 lignes au plus**. Ligne 1 : l'urgence (éliminé > Milan sur vous > bataille en cours > placement ou trêve > nuit > « Bataille à 20 h »). Ligne 2, en `.meta` : l'équipe en semaine d'équipes, sinon « fin dans … ». Le « ? » disparaît |
| « ? GUIDE » (PC) | Supprimé : c'est la porte Aide |
| ⚔ et ⟲ muets (téléphone), liens soulignés (PC) | **En bas à droite, au-dessus des portes**, sur téléphone comme sur PC : `HudChip` « Escarmouche » et « Semaine », plus le rond « Me centrer » de l'item 8. Ils sont masqués quand une fiche est ouverte, comme les portes |
| « 13 fronts en marche », « Milan marche sur Corner29 » (PC) | Supprimés : la carte les montre, et « Milan sur vous » reste dans la plaque |

**Plan.**
- `TerraHud` et `NotePlaque` : la même structure sur téléphone et sur PC. Le bloc `lg:flex` (`:1194-1265`) est supprimé.
- `Hud.tsx` : une prop `actions` rendue à droite, au-dessus de `<nav>`.
- `MapScreen.tsx` : branchement de cette prop.
- Les identifiants `data-hud="terra-note"`, `"terra-skirmish"` et `"terra-replay"` sont gardés, ainsi que les textes lus par `teamWeek` (équipe, « Milan sur vous », « l'emporte »).
- `design.md` § Terraferme, puce HUD : réécrite.
- Ce lot **remplace la partie HUD de `terra-6`** (`plan-finalisation.md` n° 16, son menu « ≡ ») ; sa partie panneau (`BuildRow`, `canBuild`) reste là-bas.

**Mesure.**
- `layout.mjs`, étape `terraferme-jeudi` :
  - le bas de la bande du HUD est à ≤ 140 px CSS en 390 et à ≤ 150 en 320 ;
  - au plus 2 blocs sous la bourse ;
  - les actions font ≥ 44 px et ne recouvrent ni une porte ni un nom de carte.
- Sur PC, au plus 3 lignes de texte à droite.
- Un test qui lit `TerraLayer.tsx` : aucune classe `underline`.
- La carte de 390 gagne environ 100 px de hauteur.

**Le chef.** C'est la réponse directe au porteur.

J'ai pris le placement en bas à droite de Hugo plutôt que la rangée de puces sous la plaque de Léa, ou le menu « ⋯ » de Malik. Deux actions ne justifient pas un menu, et sous la plaque elles restaient « en haut à droite ».

J'ai refusé la légende d'une ligne sous la plaque, que proposait Hugo : la légende va dans le guide de la Terraferme (item 6).

### 6. Reconnaître ses terres, ses alliés et ses ennemis (Hugo · M · impact critique, retour du porteur)

**Problème vérifié.**
- `look()` (`TerraLayer.tsx:744-782`) :
  - moi : une teinte hachée à 0,42 et un filet or de 1,3 ;
  - alliés : une teinte à 0,2 et un filet vert d'eau ;
  - ennemis : rien de propre ;
  - autres : `fill: none`.
- Sur `36`, ma terre est violette parmi des violets.

**Décision.**
- **Moi** : aplat or à 0,32, filet or de 2,5 px constant à l'écran (`vector-effect="non-scaling-stroke"`), halo sombre extérieur. Dessiné en dernier.
- **Alliés** : aplat vert d'eau à 0,18, filet en tirets.
- **Ennemis** (un front contre moi, ou visé par l'un des miens) : filet vermillon de 1,5 px.
- **Voisins** : leur ton à 0,16.
- **Autres** : leur ton désaturé à 0,08.
- **Milan et les seigneurs** : hachure gardée, fond ramené à 0,3.
- **La case touchée** : lapis (voir mes décisions).
- **La grille** : elle reste toujours visible (décision du porteur du 18 octobre), mais à 0,08 au cadrage large et à 0,2 pendant qu'on vise.
- **La légende** (« ■ Vous · ■ Alliés · ▭ En guerre · ▨ Seigneurs ») : en première carte du guide de la Terraferme (porte Aide), pas sur la carte.

**Plan (tests d'abord).**
- `test/terraShapes.test.ts` :
  - un détenteur avec un front contre moi a le focus `enemy` ;
  - aucun autre que moi ne porte l'or, aucun non-allié le vert d'eau ;
  - `me` est dessiné en dernier.
- Puis `look()` et le calcul du `focus` (`:393-407`). Le mémo `useTerraShapes` dépend aussi des fronts menaçants.

**Mesure.**
- Tests verts.
- Sur les nouvelles captures du « jeudi figé », Camille et Malik désignent leurs terres en moins de 2 secondes, et un allié et un ennemi sans aide. Le test se fait sans leur montrer la légende.

**Le chef.** Léa voulait le lapis pour moi, Hugo l'or. Je tranche pour l'or, raisons données plus haut.

### 7. Une étiquette par territoire, à taille fixe, masquée par priorité, avec des seuils de zoom (Hugo · L, 3 à 4 j · impact critique, retour du porteur)

**Problème vérifié.**
- Les effectifs sont en SVG, de 0,8 à 2,4 × `map.size`, agrandis par le zoom (`TerraLayer.tsx:438`, `:677-686`).
- Les villes sont en HTML, fixes à `text-xs` (`:973`).
- Aucune collision n'est testée entre environ 97 objets étiquetés.
- La pastille de front est posée sur la prochaine case, donc sur mon camp (`:903-915`).
- Tous les marqueurs partagent `z-[2]` (`WorldMap.tsx:607`).
- Les nations s'écrivent par-dessus leur ville : « Mantoue (Gonzague) » sur « MANTOUE ».

**Plan, en 3 commits.**
1. `src/game/map/declutter.ts`, une fonction pure, gloutonne et déterministe, qui essaie 4 positions candidates puis masque l'étiquette.
   - Ordre de priorité : moi > pastilles de mes fronts et des menaces > villes > alliés > ennemis > voisins > seigneurs > autres > bâtiments > pions.
   - Tests d'abord, dans `test/declutter.test.ts` : aucun recouvrement entre éléments affichés ; la priorité 1 toujours affichée ; un élément de priorité basse cède toujours ; résultat déterministe.
2. Les étiquettes de territoire passent en HTML, en `MapMarker`, aux tailles de l'item 4. Jamais plus gros qu'un nom de ville.
   - Une étiquette par détenteur : le pion de capitale devient un `MiniCrest`, sauf le mien, qui garde son anneau de troupes, en `z-[4]`.
   - Une nation dont la capitale est une ville devient le sous-titre de la ville (« MANTOUE · Gonzague »).
   - Les pastilles de front vont au milieu de leur ligne, décalées perpendiculairement.
3. Les paliers de zoom. `WorldMap` pose `data-zoom="0|1|2"` et rappelle seulement au changement de palier.

| Palier | Ce qui s'affiche |
|---|---|
| Z0, k < 1,4 | Villes, moi, alliés, ennemis, voisins, seigneurs ≥ 20 cases ; les autres pions en points de 6 px ; ni bâtiments ni autres fronts |
| Z1, 1,4 ≤ k < 2,2 | En plus : toutes les étiquettes qui passent le tri, pions de 22 px, bâtiments en points |
| Z2, k ≥ 2,2 | Tout |

**Mesure.**
- `layout.mjs`, `terraferme-jeudi` en 390 et 1440 :
  - aucune paire de `[data-map-label]` visibles ne se recouvre de plus de 2 px ;
  - mon nom est entier ;
  - au plus 30 étiquettes au cadrage en 390.
- Performance : 60 i/s au pincement, mesuré avec Chrome et un processeur ralenti ×4. C'est le budget de `plan-finalisation.md` n° 30.

**Le chef.** C'est le gros morceau et la vraie réponse à « la carte est compliquée à lire ». Les flèches de front courbes n'y entrent pas : pas d'extras tant que ce lot n'est pas vert.

### 8. Cadrage par appareil et « Me centrer » (Hugo · M · impact fort)

**Problème vérifié.** La Terraferme réutilise la règle de la campagne, « l'ouest à un glissement de doigt » (`geometry.ts:69-98`, `WorldMap.tsx:189`). Résultat :
- le téléphone en 390 coupe l'Empire et Vérone, et le 320 montre tout en minuscule ;
- sur PC, la carte est un rectangle aux bords francs ;
- il n'y a pas de bouton pour se recentrer.

**Plan.**
- `fitTerra(meBox, landBox, view, insets)` dans `geometry.ts`. À l'ouverture : ma terre et ses voisins, avec une marge, si j'ai un camp ; sinon toute la terre. La même règle vaut sur tout appareil.
- Un seul rond « Me centrer », qui devient « Toute la carte » une fois centré, dans la rangée d'actions de l'item 5. Le double toucher reste « toute la carte ».
- Sur PC, fondu des bords de la terre par un masque SVG de 6 %.
- `design.md` : « la caméra cadre toute la terre » est corrigé.

**Mesure.** Tests d'abord, dans `test/mapGeometry.test.ts`, en 320 × 568, 390 × 844 et 1440 × 900 :
- `meBox` est entier dans la zone utile ;
- « toute la carte » contient les 4 coins.

**Le chef.** Ce choix est le mien : c'est de l'affichage, et OpenFront fait de même. Un seul rond au lieu des deux de Hugo.

### 9. Guide de Lorenzo : voile, textes vrais, bulle unifiée (Léa · S à M · impact fort)

**Problème vérifié.**
- **Voile.** Il est à 62 % (`Coach.tsx:302`) et s'ajoute au `bg-black/60` de la feuille : la feuille qu'il fait lire est noyée.
- **Textes.** « Sera prêt en 30 secondes » et « Patientez quelques secondes… » sont fixes (`i18n.ts:1895-1896`), y compris pour le second lot de 30 min (`19`, `20`).
- **Pastilles.** « Pastilles dorées », alors que la plupart sont vertes (`12`).
- **Genre.** « Achetez quelques briques : ils servent… ».
- **Deux bulles.** La bulle de la Terraferme n'a pas le style du guide (`TerraLayer.tsx:1964-1990` contre `Coach.tsx:315-370`).
- **Or.** Le seul bouton or de la feuille (« Tout relancer ») n'est pas la cible du guide (`07`).

**Plan.**
- Voile à 0,35. Quand la cible est dans une feuille, la découpe prend le rectangle de la feuille.
- `coach.produce(building, durée)` dit la vraie durée. `coach.wait` dit « quelques secondes » sous une minute, sinon « Prêt dans 29:59 : explorez en attendant », chrono en `.meta`.
- `coach.goRoutes` explique l'or et le vert. `coach.buy` est neutre en genre.
- `LorenzoCard` dans `ui.tsx`, employée par le guide et par `TerraIntro`. « Suivant » devient un `Slab sm`, « Lire le guide » un `Slab tone="text"`. Le style suit la voie médiane, si le porteur la retient (décision 1) : cadre de 1 px, sur-titre crème, cachet de cire.
- Pendant le guide, seule la cible est en or ; les autres `Slab` or passent en fantôme.

**Mesure.**
- `test/coachKeys.test.ts` étendu : aucun texte ne promet « secondes » pour un lot de plus d'une minute.
- `tutorial.mjs` vert.

**Le chef.** Le guide était en double dans les deux lots. Je coupe net : Léa a l'apparence et les mots, Hugo le placement et la logique (item 10).

### 10. Guide de Lorenzo : anneau, place de la bulle, toasts, boucle 3/6 (Hugo · M · impact fort)

**Problème vérifié.**
- **Anneau.** Il suit le seul bouton et coupe « COMPTOIR » (`Coach.tsx:245`, `:284-292`).
- **Bulle.** `BUBBLE_ROOM = 190` (`:74`) pose la bulle sur la bourse : les pièces qui volent (`fx.tsx`, existantes) sont cachées.
- **Toast.** Un toast d'info s'affiche sur la bulle (`24`, `Game.tsx:555`).
- **Boucle 3/6.** Je l'ai vérifiée côté serveur : `delivery_arrived` n'est marqué qu'au **tick** (`apps/server/src/game/world.ts:498-506`). Entre l'arrivée et le tick, le guide retombe sur « produire ».

**Plan.**
- `Coach` unit la cible et les `[data-coach-with=<cible>]`, avec un anneau rond pour un médaillon. Test dans `test/coachSight.test.ts` (union des boîtes).
- Bulle compacte de 2 lignes, placée sous la bande du HUD (`--hud-top`). La bourse reste visible.
- `body[data-coach-top]` : quand la bulle est en haut, les toasts passent en bas. Fusion des propositions 1g (Léa) et 8.4 (Hugo).
- `nextStep` est exporté et testé avant correction (même modèle que `coachKeys.test.ts`). Une livraison dont `arriveAt` est passé compte comme `sell_city` côté client.

**Mesure.**
- Les tests sont verts.
- `tutorial.mjs` : la bourse n'est jamais recouverte par la bulle pendant les étapes 06 à 27, et aucun toast n'intersecte la bulle (nouvelle règle de `assert.mjs`).

**Le chef.** C'est la règle « gains visibles » de Malik, sans rien ajouter : l'animation existe déjà.

### 11. Cadres sans filet coupé, et preset actif lisible (Léa · M · impact fort)

**Problème vérifié.** `.cut` (clip-path, `index.css:199`) coupe la `border` sur les diagonales. Il y a 29 lignes qui combinent `cut` et `border` (grep refait), dont `Advice.tsx:55` et `Comptoir.tsx:763`. `Panel` (`ui.tsx:142-167`) fait déjà bien : un enveloppant `cut p-px` plus une face. Par ailleurs, le preset actif paraît désactivé (`08`).

**Plan.**
- D'abord un test (même analyseur que `typography.test.ts`) : aucun `className` ne porte à la fois `cut` et `border`. Il est rouge sur les 29 lignes.
- Puis `Frame` dans `ui.tsx`, qui remplace les 29 lignes, `active:scale` et `ring` reportés sur l'enveloppant.
- Preset actif en `Frame tone="info"`, sur fond `night-4`, avec une coche.

**Mesure.** Le test est vert, et les captures `08` et `06-4-bas` montrent des coins entiers.

**Le chef.** Défaut systémique, à traiter une fois et avec un garde-fou, pas écran par écran. Les lignes de `TerraLayer.tsx` (`:158`, `:172`, `:1964`) sont faites par Léa après l'item 5, pour éviter les conflits.

### 12. Typographie : la chasse fixe ramenée aux sur-titres, moins de capitales (Léa · M · impact fort)

**Problème vérifié.** `font-mono` revient 69 fois dans `src/` (grep), y compris dans le texte courant : « ≈ 20,8 d de marge… » et « Intrant manquant » (`Comptoir.tsx:423`, `:436`), `Badge`, `Segmented`, les prix du carnet. Or `design.md` réserve Space Mono aux sur-titres. Les onglets sont en capitales (`ui.tsx:101`, `:128`).

**Plan.**
- `typography.test.ts` : `font-mono` n'est permis que dans `.label` et une liste blanche explicite. Le test est écrit d'abord.
- Remplacement par `.meta`, ou par Space Grotesk semi-gras pour les puces.
- Onglets, `Segmented` et marchandises du Rialto en casse de phrase.
- Léa traite aussi les occurrences de `TerraLayer`, `Hud` et `HudTips`, après les items 5 à 7.

**Mesure.** Le test est vert, et les tests e2e qui cherchent les boutons par nom restent insensibles à la casse (à vérifier dans le même commit).

**Le chef.** Suite directe de `ux-3` (`plan-finalisation.md` n° 5), qui avait traité `.label` et non `font-mono`. Une seule propriétaire, pour ne pas toucher deux fois les mêmes fichiers.

### 13. Carte du commerce : charrettes et petits écrans (Hugo · S à M · impact moyen)

**Problème vérifié.**
- Les charrettes passent au-dessus des noms : `z-[3]` contre `z-[2]` (`WorldMap.tsx:607`).
- Elles s'arrêtent à `CITY_EDGE_PX = 46` (`:101`), donc sur « VICENCE » (`16`).
- En 320 px, les tuiles gardent leur taille et se chevauchent : « OMPTOIR » est rogné (`320x568/33`, `Markers.tsx`).

**Plan.**
- Les noms de villes deviennent un marqueur à part, en `z-[4]`. La charrette s'arrête au bord de la tuile, côté route.
- Sous 360 px, les tuiles passent à 80 % (classe sur `world-map`).

**Mesure.** Nouvelle règle de `assert.mjs` : une charrette ne couvre jamais un `[data-map-label]` de ville, sur les étapes du guide en 390 et 320.

### 14. Rialto et Ateliers : états lisibles (Léa · M · impact moyen)

**Problème vérifié.**
- Sparklines en pointillés avec moins de 2 points (`ui.tsx:312-322`).
- En-tête « ACHAT / VENTE » empilé (`Marche.tsx:492`, `:600`).
- Marchandises sans cours au milieu de la liste.
- Fiche en mur de texte (`28`, et `320x568/24`, où les boutons passent sous le pli).
- « Prêt » et « Intrant manquant » dans le même or. Le second parle en fait de l'amélioration (`Comptoir.tsx:344-361`, `:433-437`).
- Fenêtre `lg:max-w-lg` étroite sur PC (`ui.tsx:621`), sans indice de défilement.

**Plan.**
- Rialto :
  - rien n'est dessiné sous 2 points ;
  - deux colonnes « Acheter » et « Vendre » ;
  - les marchandises sans cours vont sous « Pas encore échangées (n) » ;
  - une ligne récapitulative au-dessus des boutons, et le reste dans `Rules` ;
  - le badge « PNJ » est compact.
- Ateliers :
  - une seule ligne d'état colorée par carte, et « Amélioration déconseillée : il manque du blé » en `.meta` ;
  - une puce « ≈ 21 d/h » ;
  - `Sheet size="wide"` sur PC, avec les cartes en 2 colonnes ;
  - un dégradé de 24 px au pied de la `Sheet` tant qu'il reste du contenu.

**Mesure.**
- En 320 × 568, « Acheter » est au-dessus du pli sur la fiche d'une marchandise (assertion dans `layout.mjs`).
- Une seule couleur d'état par carte d'atelier (revue de capture).

**Le chef.** Malik veut Ateliers dans la colonne de droite : elle existe déjà sur PC (`SideColumn`, `design.md` § Sur ordinateur). La fenêtre large suffit.

### 15. Classement, Aide, Avis (Léa · S à M · impact moyen)

**Problème vérifié.**
- Icônes de l'Aide réutilisées : `comptoir` 3 fois, `routes` 2 fois (`i18n.ts:2378-2428`).
- Le reroll « ↻ 3 ✦ » est grisé et muet (`Daily.tsx:52`).
- « Jour 1 sur 30 » et « 30 jours avant la fin » disent la même chose.

**Plan.**
- Les illustrations existantes servent dans l'Aide. Le test `test/icons.test.ts` est étendu à `fr.game.howTo` (une icône, une rubrique) et écrit d'abord.
- « Changer · 3 ✦ », avec la raison à l'état désactivé.
- Une seule ligne « Jour 1 sur 30 · fin dans 29 j ».

**Mesure.** Le test des icônes est vert.

### 16. Premier écran en 320 × 568, et mule lisible (Léa · S · impact fort)

**Problème vérifié.**
- Le formulaire est sous le pli (`320x568/01-connexion.png`, `App.tsx:95-110`).
- La mule est illisible (`art/veneto.tsx`).

**Plan.**
- Sous `max-height: 700px` : emblème de 56 px, `Skyline` limitée à 120 px, promesses sur 2 lignes.
- La mule est redessinée de profil.

**Mesure.** `layout.mjs`, `check("connexion")` en 320 : le champ et « Valider » sont au-dessus du pli.

## À revoir

- **Avis en « une »** (Léa, 7g, M) : une une, puis le carnet replié. Après l'item 11 et une mesure du défilement réel des Avis au jour 1, la règle « au plus 3 blocs » de `ftue-m1` restant la référence.
- **L'Aide sur PC en 2 colonnes avec des mini-schémas** (Léa, 7d, M) : après le passage des icônes (item 15), si le playtest montre qu'on l'ouvre sur PC.
- **Introduction** : podium aux couleurs du jeu, texte de 9 lignes ramené à 3 (Léa, 8d). Subjectif, après la décision 1.
- **Vide sous Ferrare sur la carte du commerce** (Hugo, R27) : faible, après l'item 8, qui pose la règle de cadrage.
- **« Tache rouge-brun » en bas à gauche sur PC** : Hugo vérifie si c'est le halo du fond ou un aplat. Il la corrige seulement si c'est un défaut.
- **« Proposer l'alliance » offert à une maison PNJ** (`37`, Querini21 · PNJ) : confirmer avec le serveur que c'est voulu. Sinon, le bouton disparaît pour une maison du PC. C'est une règle existante, pas une nouvelle mécanique.
- **Un seul langage de marqueurs pour les villes** (tuiles sur le commerce, médaillons sur la Terraferme) : à juger après l'item 7 sur les nouvelles captures, et pas avant.

## Rejetées et artefacts écartés

Artefacts démontrés par Hugo et Léa :

- **Carte « cassée » en bandes rouges, libellés déplacés** (`39`, `40`). « Revoir la semaine » a rejoué la semaine du vrai serveur de test, une carte de 25 × 22 = 550 cases, sur la vue injectée de 35 × 31 = 1 085 cases. La route `**/api/game/terra` ne capte pas `/replay`. La garde est ajoutée à l'item 3, et le banc corrigé à l'item 1.
- **« La case touchée n'ouvre pas de fiche »** (`40`). Le fond de la carte Ducats, encore ouverte, a pris le clic : c'est voulu. Le vrai défaut, Échap, est traité à l'item 3.
- **« Les fenêtres ne défilent pas sur PC ».** La molette était envoyée à la position de la porte cliquée, hors du dialogue, alors que le dialogue est bien `overflow-y-auto` (`ui.tsx:621`). Reste l'indice de défilement, à l'item 14.
- **« Mars 2026 »** (horloge du banc), **comptes à rebours incohérents** et **réapparition de « Fronts rentrés »** (`shifted()` recalculé toutes les 10 s).
- **HUD « e2e_390 · #1 » contre « ILARIA_MOCENIGO · 7e ».** Je l'ai relevé moi-même : la vue injectée n'est pas celle du compte. La fixture de l'item 1 corrige ce décalage.

Propositions rejetées :

- **La légende d'une ligne sous la plaque** (Hugo) : elle remet du texte en haut à droite, contre la demande du porteur. Elle va dans le guide de la Terraferme (item 6).
- **La grille masquée au cadrage large** (Hugo) : le porteur l'a voulue toujours visible le 18 octobre. Elle est seulement atténuée (item 6).
- **Le menu « ≡ » ou « ⋯ »** (`terra-6`, Malik) : un toucher de plus pour deux actions. Remplacé par la rangée au pouce (item 5).
- **Une barre unique de 56 px façon Polytopia** (Malik) : c'est la refonte du HUD du commerce, hors du lot. Le gain de hauteur est obtenu par l'item 5.
- **Offrir le second lot rapide du tutoriel** : c'est une règle, donc IDEAS.md. La correction de texte suffit (item 9).
- **Redessiner le logo en aplat** : `design.md` l'interdit (décision 5).
- **Pièces qui volent, ailes du moulin, blason choisi à l'inscription** : tout cela existe déjà. Le défaut est d'être caché (item 10) ou incohérent (item 2).
- **Flèches de front courbes dans l'item 7** : ce serait de l'enjolivement avant que la lisibilité soit acquise. Plus tard.

## Idées « waouh »

**Maintenant**, déjà dans le plan et sans coût en plus :
- des gains visibles (item 10) ;
- un même blason partout (items 2 et 4) ;
- un cachet de cire et une bulle de Lorenzo unique (item 9, si le porteur retient la voie médiane).

**Plus tard**, à noter dans IDEAS.md, avec la mesure qui les justifierait :

| Idée | Pourquoi pas maintenant | Mesure qui la déclencherait |
|---|---|---|
| Cycle jour et nuit sur la carte du commerce (fenêtres allumées de 22 h à 8 h) | Rendu M, sans mécanique ; après les items 7 et 13 | Retour du playtest « le jeu dort, je ne le savais pas » ; coût mesuré à 60 i/s |
| Fronts résolus à l'encre à 20 h, page de chronique | L ; dépend de la lisibilité (items 6 et 7) | Part des joueurs présents à 20 h, ouvertures de « Revoir la semaine » |
| Revoir la semaine parcourable au doigt | Interaction nouvelle sur la relecture | Taux de « Passer » sur la relecture (item 3) |
| Avis en gazette (« avviso ») | Après la « une » (À revoir) | Profondeur de défilement des Avis au jour 1 |
| Territoires à l'aquarelle (`feTurbulence`) | Coût de rendu sur un Android d'entrée de gamme | Budget de 60 i/s tenu avec une marge de 30 % après l'item 7 |
| Portulan complet (monstres marins, noms calligraphiés) | Suspendu à la décision 1 | Décision écrite du porteur |
| Épis qui ondulent, fumée de la boulangerie, mule qui trottine | Enjolivement | Après la porte de publication |
| Fiche d'un voisin enrichie (tendance, voisins) | Demande des données serveur nouvelles | Ouvertures de fiche de voisin suivies d'une action < 20 % |
| Historique des « Fronts rentrés » dans la cloche | Demande un stockage serveur | « Compris » touché en moins de 2 s, plus de 50 % du temps (non lu) |
| Second lot rapide offert dans le tutoriel | C'est une règle | Abandon à l'étape « transformation » > 15 % au playtest |

**Jamais** :
- **les routes plus épaisses selon le trafic des autres** : c'est une information sur le jeu adverse, donc une mécanique, et non de l'affichage ;
- **un logo redessiné** ;
- **un HUD qui retire le nom du marchand** pour gagner de la place.
