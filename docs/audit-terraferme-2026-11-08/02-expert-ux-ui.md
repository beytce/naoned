# Audit UX/UI expert : la Terraferme en Porcellana (8 novembre 2026)

*Auditeur : expert UX/UI senior, jeux de stratégie en temps réel et de gestion, mobile et PC. Lu : CLAUDE.md, `docs/plan-terraferme-porcellana.md` (§§ 1 à 3), `plan-porcellana.md`, `plan-refonte-claire.md`, `plan-dock.md`, `design.md`, l'audit UX du 7 novembre (`docs/audit-joueurs-2026-11-07/04-expert-ux-ui.md`) et `docs/plan-publication.md` (D1, D9), toutes les captures `t2-*`, `t3-*`, `t4-*`, `t5-*` et `maquette-*`, la maquette HTML et le code du lot T5. J'ai aussi lancé le laboratoire (`?lab=porcellana&vue=terraferme&jeu=1`) dans une copie du dossier extrait, et fait des captures en 1280×800 et en iPhone 13 (390×844), rangées dans `rapports/captures-ux/` (`d*` ordinateur, `m*` téléphone). Le rendu passe par swiftshader, donc la fluidité n'a pas été mesurée. Le téléphone a pris la langue anglaise du profil iPhone, ce qui ne change rien à la mise en page.*

---

## 1. Verdict global

1. **La matière est réussie, le jeu ne se lit pas encore.** Le plateau de porcelaine, l'émail, les bâtiments du kit et la vague sont beaux et dans la ligne de Porcellana. Mais à 24 marchands, on ne sait pas qui tient quoi : gris sur gris, sur un fond de bosses et de pyramides.
2. **Le geste principal marche** (toucher, Attaquer, curseur, Attaquer · N). En revanche, il n'apprend rien au joueur : pas de ruban fantôme, pas de cases qui s'allument, pas de retour après l'envoi.
3. **L'écart avec la maquette est grand pour l'interface** : la barre est réduite, il manque le panneau des fronts et des menaces, les cartes « Bâtir » ne sont pas dessinées, il n'y a ni boutons de zoom, ni pilules de retour, ni « Pendant ton absence ».
4. **Il y a deux défauts de structure.** Le plateau est posé dans une boîte de 72 vh au milieu de l'onglet Compagnie, et le dock d'un voisin est presque inaccessible, parce que ses cases du bord ouvrent « Attaquer ».
5. **Les textes sont au « vous » et restent ceux du monde mensuel** (« Vos terres », « Touchez », « Votre camp »), contre la décision D1. À corriger avant toute mise en ligne.

---

## 2. Lisibilité du plateau

### 2.1 Qui tient quoi

- **Ta terre se voit. Celle des autres, non.** Ton rouge (alpha 0,55) et la hauteur (+0,8) sortent nettement (`t2-plateau.png`, `d1-arrivee.png`). Les voisins, eux, reçoivent l'une de **trois densités d'encre selon leur indice** (`glaze.ts:227-231` : 0,26 / 0,18 / 0,13, `index % 3`). À 20-40 joueurs, un tiers des marchands ont exactement le même gris, et deux voisins collés peuvent tomber sur la même valeur : seul un joint de porcelaine d'un pixel les sépare. Dans `t2-choix.png`, les nappes de Maison 2, Maison 8 et Maison 18 sont indiscernables. Le rendu à plat (`t2-plat.png`) le montre encore plus nettement : une vingtaine de « vers » gris de même valeur.
- **La mise au point efface trop.** Les marchands hors focus passent à 40 % de leur alpha (`picture.ts:28`), donc de 0,05 à 0,10 : c'est la couleur de la terre libre. On perd le leader de la semaine, la seule menace qui compte à long terme. OpenFront montre tout le monde, tout le temps.
- **La terre libre et la terre tenue ont presque la même hauteur** (0,42 contre 0,50), et l'œil ne voit pas 8 % d'écart sous une projection orthographique.
- **Alliés** : une nappe à 0,12 avec un liseré lagune (`glaze.ts:225`). Le liseré se voit bien dans la maquette (`maquette-over.png`, Morosini), mais je ne l'ai vu dans aucune capture du jeu réel. À vérifier.
- **Les étiquettes « Maison N »** sont toutes pareilles (pilule blanche, drapeau noir) et sans poids. Rien ne dit qui est grand, qui est fort ou qui t'attaque. La maquette, elle, donnait le nom et la force (« Contarini · 99 », « Loredan · 66 »).

### 2.2 Le bruit du relief

Le relief prend le dessus sur l'information. Chaque case de colline porte un dôme et chaque montagne une pyramide (`t2-plateau.png`, `t4-batiments.png`) : à l'échelle par défaut, la moitié du plateau est couverte de petits objets du même blanc que les camps et les forts. Dans la maquette (`maquette-over.png`), les collines sont des demi-lunes plates à peine marquées et les montagnes restent au bord. Le terrain sert à calculer le coût d'une case : un aplat ou une trame suffit, il n'a pas à être un objet.

### 2.3 Fronts et menaces

- **Ton front** est un ruban rouge fin, souvent caché derrière l'étiquette « Votre camp » (`d6-apres-attaque-150.png` : la pastille « 30 » et deux pixels de rouge). Le ruban maigrit avec les hommes (`fronts.ts`), si bien qu'un petit front, le cas le plus courant, est presque invisible.
- **Les menaces** (ruban d'encre et pastille cerclée de noir, `t3-fronts.png`) sont lisibles quand on les a sous les yeux. Mais rien ne les signale hors de l'écran : ni flèche au bord, ni compteur dans la barre, et aucun panneau « Menaces » n'est implémenté (voir § 6).
- **Les fronts des autres** sont des arcs gris pâle qui traversent toute la carte (`t4-batiments.png`, `m4-pied.png`). À 40 joueurs, ces arcs forment un filet qui brouille le plateau sans rien t'apprendre. Il faudrait les cacher hors de ton voisinage.

### 2.4 Bâtiments

Les silhouettes sont lisibles au catalogue (`t4-catalogue.png`, `maquette-kit.png`). Sur le plateau, avec 80 bâtiments dans `t4-batiments.png`, forts et remparts à drapeau noir font une forêt uniforme : on ne voit ni à qui ils appartiennent ni lesquels te concernent. Seul le drapeau change de couleur, et un drapeau fait 4 px à l'échelle 1,6.

### 2.5 Hiérarchie et zoom

Aujourd'hui, l'œil lit dans cet ordre : relief, puis étiquettes, puis ta terre, puis le reste. Il faudrait : ta terre et ses fronts, puis les menaces, puis tes voisins directs, puis les villes, et le décor en dernier. Le zoom maximal est de 6 et le minimal de 0,8 (`TerraBoard.tsx:377-378`). Sans boutons ni « Centrer sur mes terres », un joueur à la souris sans molette ou un joueur sur téléphone d'une main ne sait pas qu'il peut zoomer.

---

## 3. Le parcours, étape par étape

| Étape | Ce qui se passe | Gestes | Frictions |
| --- | --- | --- | --- |
| **Arriver** | Onglet Compagnie, volet Terraferme, texte « Semaine ouverte », résumé, puis « L'entrée coûte 20 planches… » et un bouton (`Terra.tsx:276-287`) | 3-4 | Du texte, pas une image (règle 8). Le plateau n'apparaît qu'après l'inscription : on s'engage sans avoir vu la carte. |
| **S'installer** | Toucher une case libre, fiche, « M'installer », dock « Posez votre camp de départ », « M'installer ici » (`TerraPlay.tsx:380-395`) | 3 | Aucune case conseillée ni allumée, aucune zone sûre, aucun voisin probable affiché. On choisit à l'aveugle le choix le plus lourd de la semaine. Le dock répète la fiche sans rien ajouter. |
| **Comprendre sa situation** | Trois pilules : « 60 / 60 +11/h », « fin dans 165 h », « 24e sur 24 · 140 points » | 0 | « 165 h » ne se lit pas (« 6 j 21 h » serait clair). Pas de pain, pas de ducats, pas de nombre de fronts, pas de menace. « Nuit : les fronts reposent » sans heure de reprise. |
| **Lancer un front** | Toucher une case du bord, fiche « Terre libre · 28 troupes pour prendre cette terre », « Attaquer », dock, curseur, « Attaquer · 30 hommes » | 3 (+ curseur) | Voir § 3.1. |
| **Bâtir** | Toucher une de ses cases, « Bâtir », cartes, choix, « Fort · 40 d » | 4 | Les cartes sont du texte nu (`TerraPlay.tsx:286-298`) : pas de dessin, pas de « 1 / 3 », pas de matériaux, pas de raison « 2 sur 2 ». Aucun fantôme du bâtiment ni de sa zone sur le plateau. Le joueur ne voit pas ce qu'un fort protège avant de payer. |
| **S'allier** | Il faut toucher une case du voisin **qui n'est pas au bord** des tiennes | 3+ | **Bloquant.** Une case du voisin qui touche ta terre a un coût, donc elle ouvre « Attaquer » (`play.ts:60-62`). Le dock « Voir » d'un voisin ne s'ouvre que depuis une case plus loin. Le volet « Alliés » ne liste que les alliés et les demandes (`TerraPlay.tsx:413-433`), pas les voisins. Les étiquettes ne se touchent pas (`pointer-events: none`, `porcellana.css:300`). Un joueur ne trouvera jamais « Proposer l'alliance ». |
| **Revenir** | Le plateau tel qu'il est, interrogé toutes les 5 s (`Terra.tsx:222-229`) | — | Pas de « Pendant ton absence » (lot T6). Les textes `returns` (« Fronts rentrés ») existent dans `i18n.ts`, mais `TerraPlay` ne les utilise pas. On revient sur une carte changée sans savoir ce qui a été perdu. |

### 3.1 Lancer un front, en détail

- **Ce que le curseur promet est faux.** `frontPlan` divise les hommes par le coût de la *première* case (`play.ts:86`). Dans `d5-curseur-max.png`, 60 hommes donnent « jusqu'à 30 cases » sur la terre de Maison 16, alors que le front s'arrêtera dès la première colline ou le premier fort. Une promesse de trente cases qui en donne trois casse la confiance. Il faut utiliser la prévision du moteur (`takes`, déjà dans la vue pour les fronts en marche) ou au moins écrire « environ ».
- **Pas de ruban fantôme.** Le plan demandait que le ruban grossisse et que les cases s'allument pendant qu'on tire le curseur. Aujourd'hui, seule la case visée est marquée (`TerraPlay.tsx:87-88`), et elle est souvent cachée par le dock (`m3-dock-front.png` : on ne voit pas quelle case on attaque).
- **Deux lignes au lieu de quatre** (`TerraPlay.tsx:252-259`) : il manque « Reviendront » et « Première case vers 14 h 20 », alors que les textes existent (`fr.game.terra.target.plan`, `.eta`). Sans heure, un front lancé la nuit semble ne rien faire.
- **0 défenseur, sans alerte.** À 100 %, « 0 au lieu de 12 » reste en noir (`d5-curseur-max.png`). Il faudrait ce chiffre en rouge et une phrase : « Ta capitale sera prenable ». Le texte `target.losesSafety` existe et n'est pas affiché.
- **Curseur sans repères** : pas de 10 % / 100 %, pas de « ta réserve : 78 » (que la maquette avait), un pas de 5 %, une piste de 16 px de haut au téléphone.
- **Pas de retour après l'envoi.** `act()` envoie et ferme (`TerraPlay.tsx:67-70`). La caméra repart vers le camp en dézoomant (`TerraBoard.tsx:415-437`) et seul le nombre de troupes change en haut (`d6-apres-attaque-150.png`).

---

## 4. Mobile

- **Cibles tactiles trop petites** (mesuré sur iPhone 13) : les quatre boutons du pied font **86×32 px** (`TerraPlay.tsx:214`, `py-2 text-xs`), la croix de la fiche **30×30** (`porcellana.css:172-177`), la pastille de front 30 px, la piste du curseur 16 px. Le lot 1 du plan de publication a reporté les « cibles de 44 px » au lot 3 : la Terraferme doit les avoir dès le départ.
- **Le haut est encombré** : trois pilules sur deux lignes (`m1-arrivee.png`) prennent 120 px. La maquette (`maquette-phone.png`) n'en montrait que deux : la Maison, et les troupes en anneau, avec la phase en pilule dessous.
- **Une case = un saut de caméra.** Toucher une case fait voler la caméra et zoomer à 2,6 (`TerraBoard.tsx:425-430`). Pour comparer trois cases du bord, on subit trois vols, et l'on perd son repère. Dans un jeu de front, la caméra ne bouge que quand le joueur la bouge.
- **Le plateau dans une feuille qui défile** : dans le vrai jeu, `TerraPlay` est une boîte de `h-[72vh]` sous des paragraphes (`TerraPlay.tsx:31`, `Terra.tsx:263`). Au doigt, glisser sur la carte déplace la caméra (`TOUCH.PAN`, `TerraBoard.tsx:384`) et non la page : soit on reste coincé, soit on ne voit qu'un morceau de carte. Le laboratoire, en plein écran, cache le problème.
- **Ce qui disparaît** : le pied est caché quand la fiche est ouverte (`TerraPlay.tsx:198`). La fiche (`t5-telephone-fiche.png`) se pose sur les étiquettes. Le dock couvre la moitié basse, et donc souvent la case visée.
- **La zone du pouce est bien utilisée** : la touche rouge, le curseur et le pied sont en bas. C'est le bon choix.
- **Artefact du laboratoire** : la pilule « Case du bord / En marche » recouvre le dock (`t5-telephone-front.png`). Elle n'existe pas dans le jeu, mais elle fausse les captures de revue.
- **Sans WebGL**, le plateau à plat (`TerraScene.tsx:84-111`) ne dessine ni camps, ni noms, ni fronts, ni bâtiments : un téléphone faible n'a plus de jeu.

---

## 5. Retours et animations (game feel)

**Ce qui marche** : la vague d'une case prise et la coulée de l'émail (`glaze.ts`, `FLOW_MS` = 800), la chute d'un bâtiment, le boulet en arc (T4), le soulèvement de la case choisie. C'est la bonne grammaire, et `prefers-reduced-motion` est respecté (`TerraBoard.tsx:109`).

**Ce qui manque** :
1. **Rien au moment de l'ordre.** Il faudrait à « Attaquer » : le ruban qui part du camp, la pastille qui sort, un petit son de tambour, la pilule « Front lancé · 30 hommes en marche ✓ ». La maquette a six toasts (`maquette.html`, `toast(...)`), l'implémentation aucun.
2. **Les troupes ne bougent pas visuellement** : 60 devient 30 d'un coup dans la pilule, alors qu'un anneau qui se vide ou des hommes qui quittent le camp montreraient la dépense.
3. **Une case prise par toi et une case perdue ont la même animation.** Une perte devrait se sentir : la case s'enfonce, un bord rouge, la pilule « Contarini a pris une terre ».
4. **La vague n'apparaît qu'au rafraîchissement suivant** (interrogation toutes les 5 s) : les cases changent par paquets, et le front avance par à-coups.
5. **Pas de compte à rebours sur la tête du front** (« prochaine case dans 2 min » dans la maquette `maquette-over.png`) : un front semble immobile.
6. **Les signaux (À l'aide, Cible…) ferment le dock sans un mot** (`TerraPlay.tsx:582-594`). « Rompre » s'applique d'un toucher, sans confirmation ni « effet dans 2 h » (`TerraPlay.tsx:550-557`).

---

## 6. Écart entre la maquette et l'implémentation

| Pièce de la maquette (`maquette-*.png`, plan § 3) | Implémenté | Écart |
| --- | --- | --- |
| Barre : « ‹ Carte », Maison et rang, phase avec heure de bataille, anneau des troupes « +13/h · pain 4 j », ducats | Trois pilules : troupes, phase, rang (`TerraPlay.tsx:156-184`) | Pas d'anneau, de pain, de ducats, de « ‹ Carte » ni de médaillon. La phase n'a pas l'heure de la bataille. |
| Panneau gauche (ordinateur) : Tes fronts (barre, prochaine case, Rappeler), Menaces, Rang | Absent ; fronts et menaces derrière « Fronts » au pied | **Écart majeur** : sur ordinateur, on ne voit plus les menaces. |
| Dock front : curseur 10 % / réserve / 100 %, quatre lignes, ruban fantôme | Curseur nu, deux lignes, case marquée | Il manque deux lignes, les repères et l'aperçu. |
| Dock bâtir : cartes dessinées, effet, prix, « 1 / 3 », raison grisée, fantôme et zone | Cartes en texte, deux raisons seulement | Pas de dessin, de compte ni de zone. |
| Dock voisin : blason, cases, troupes, allié de, quatre pastilles colorées, terres en tirets | Titre, ligne « 27 cases · ⚔ 90 », boutons fantômes | Pas de blason ni de tirets ; signaux en boutons gris. |
| Viser : cibles en équerres, tirs, cibles à portée, « Plus tard » | Titre et une phrase | Correct, mais sans les compteurs. |
| Toasts de retour | Absents | — |
| Zoom +, −, Centrer | Absents (les textes `locate` et `wholeMap` existent) | — |
| Pied avec icônes et badge rouge | Texte « Fronts · 1 » | Pas d'icônes ni de badge. |
| « Pendant ton absence » | Absent (lot T6) | Prévu. |

Le plateau (T2-T4) est fidèle à la maquette, en plus chargé (relief). Pour l'interface (T5), un peu plus de la moitié de ce qui était visé n'est pas fait, alors que le plan marque le lot comme « fait ».

---

## 7. Cohérence avec le reste de Fondaco

- **Tutoiement (D1)** : tout `fr.empire.terra.play` et `fr.game.terra` sont au « vous » (`i18n.ts:1019-1060`, `1979-2200` : « Vos terres », « Votre camp », « Touchez une terre au bord des vôtres »). Les captures `t5-front.png` (« Ton camp », « chez toi ») et `t5-telephone-fiche.png` (« Votre camp ») se contredisent : deux versions ont circulé. Le test du glossaire du lot 1 doit couvrir ces clés.
- **Vocabulaire** : « Mes terres » au pied, mais « Vos terres » en titre du dock (`TerraPlay.tsx:205` / `i18n.ts:2167`). On trouve aussi « troupes » et « hommes » pour la même chose (fiche : « 28 troupes » ; dock : « 30 hommes »), et « points » et « points de conquête » pour la Gloire. Il faut un seul mot par chose. Je propose « hommes » sur le plateau et « troupes » nulle part. « Conquête » (`fr.game.terra.title`) et « Terraferme » se mélangent aussi.
- **Un seul rouge (D9)** : bien respecté, le rouge est à toi seul. La sélection d'une case en rouge (`TerraScene.tsx:102`, contour de la case) se confond pourtant avec « à toi » : le lot 1 a fait passer la sélection à l'encre bleue ailleurs, il faut faire de même ici. Le liseré lagune des alliés est un deuxième accent toléré : à garder, mais à écrire dans `design.md`.
- **Fiche et dock** : la fiche d'encre au clic, puis la touche rouge, puis le dock d'une décision, c'est la même grammaire que la carte du commerce. C'est la meilleure part de la cohérence. Les cartes de « Bâtir » devraient reprendre `ChoiceCard` avec image, comme le catalogue de la carte, et `CostChips` pour les planches et les briques (le plan § 3 le prévoyait).
- **Navigation (refonte claire)** : la Terraferme est un volet de l'onglet Compagnie, sous du texte. Partout ailleurs, un lieu est une scène plein écran avec « ‹ Carte ». Il faut la sortir en plein écran.

---

## 8. Ce qu'il faut prendre à OpenFront

OpenFront se comprend en dix secondes parce que :
1. **Un clic = une attaque**, avec le ratio global déjà réglé. Le curseur n'est pas un écran en plus : il est **permanent**, en bas, et règle tous les clics suivants.
2. **Une couleur par joueur**, saturée, et le **nom avec le nombre de troupes au centre de chaque territoire**, à une taille qui suit la surface. On voit le fort et le faible d'un coup d'œil.
3. **La frontière qui bouge** est l'animation principale : on voit son territoire grandir pixel par pixel.
4. **La caméra ne bouge jamais d'elle-même.**
5. **Les attaques reçues** s'affichent en liste à droite, avec un bouton pour riposter.

Ce que je propose d'emprunter, sans trahir Porcellana :
- **Le ratio permanent** : un petit curseur « Part engagée : 50 % » dans la barre (ou au-dessus du pied sur téléphone). Toucher une case du bord ouvre alors la fiche avec « Attaquer · 30 hommes » déjà calculé : **deux gestes au lieu de quatre**. Le dock reste pour qui veut régler finement.
- **Le nom et la force sur chaque terre** : l'étiquette du camp devient « Contarini · 90 », sa taille suit le nombre de cases, et un marchand à plus de 1,5 fois ta force prend un liseré d'encre épais. Les trois densités d'encre restent, plus le nom au centre.
- **La caméra immobile** au toucher d'une case, et seulement « Centrer » sur demande.
- **Une liste des attaques reçues**, toujours visible sur ordinateur, avec un badge rouge sur « Fronts » au téléphone.
- **Ce qu'il ne faut pas copier** : les dizaines de couleurs vives (contraires à Porcellana) et l'absence totale de fiche (Fondaco veut expliquer le coût).

---

## 9. Recommandations priorisées

Effort : **S** < ½ jour, **M** 1-2 jours, **L** 3-5 jours.

### P0 (avant toute mise en ligne de la grille carrée)

| # | Recommandation | Effort | Fichiers |
| --- | --- | --- | --- |
| P0-1 | **Tutoiement et glossaire** : passer `fr.empire.terra.play` et `fr.game.terra` au « tu ». Un seul mot : « hommes ». Le test du glossaire couvre ces clés. | S | `apps/web/src/i18n.ts:1019-1060`, `1979-2230` |
| P0-2 | **Le voisin accessible** : la fiche d'une case voisine propose deux touches, « Attaquer » (rouge) et « Voir Contarini » (fantôme). Les étiquettes de camp deviennent touchables (44 px) et ouvrent le dock du voisin. Le volet « Alliés » liste aussi les voisins directs avec « Proposer l'alliance ». | M | `porcellana/terra/play.ts:59-63`, `empire/TerraPlay.tsx:91-123, 413-433`, `porcellana/terra/TerraScene.tsx:61-76`, `porcellana.css:293-320` |
| P0-3 | **Une promesse honnête** : « Il prendra » se calcule avec le coût réel des cases sur le chemin (la prévision du moteur, `forecastFronts`), sinon on écrit « environ ». Afficher « Reviendront » et « Première case vers… ». Mettre « 0 défenseur » en rouge avec `target.losesSafety`. | M | `porcellana/terra/play.ts:77-91`, `empire/TerraPlay.tsx:252-259` |
| P0-4 | **Un retour à chaque ordre** : la pilule d'encre (« Front lancé · 30 hommes en marche ✓ », « Fort bâti ✓ », « Alliance proposée », « Signal envoyé »), et la vue rafraîchie tout de suite après l'ordre. | S | `empire/TerraPlay.tsx:67-70`, `empire/Terra.tsx:236-242` |
| P0-5 | **Plein écran** : la Terraferme s'ouvre en scène plein écran avec « ‹ Carte » (comme la Porta). Le texte d'inscription devient une fiche posée sur le plateau visible. | M | `empire/Terra.tsx:253-287`, `empire/TerraPlay.tsx:31` |
| P0-6 | **Cibles de 44 px** : le pied (`py-3`, icônes), la croix de la fiche, le pouce du curseur (28 px, piste de 8 px dans une zone de 44). | S | `empire/TerraPlay.tsx:211-214, 242-251`, `porcellana/porcellana.css:172-177` |

### P1 (pour que la carte se lise)

| # | Recommandation | Effort | Fichiers |
| --- | --- | --- | --- |
| P1-1 | **Calmer le relief** : collines en demi-lune plate ou en trame, montagnes réduites, rien sous un bâtiment. On vise la densité de `maquette-over.png`. | M | `porcellana/terra/TerraBoard.tsx` (RELIEF, modèles de colline et de montagne) |
| P1-2 | **Voisins distincts** : les densités d'encre attribuées par coloration de graphe (deux voisins n'ont jamais la même), plus une trame (points, hachures, plein) pour la quatrième. Le hors-focus à 70 % et non 40 %. Le leader garde toujours sa valeur. | M | `porcellana/terra/glaze.ts:223-232`, `porcellana/terra/picture.ts:26-29` |
| P1-3 | **Les étiquettes disent la force** : « Contarini · 90 », taille selon les cases, liseré épais si la force dépasse 1,5 fois la tienne. Cacher les arcs des fronts des autres hors de ton voisinage. | M | `porcellana/terra/TerraScene.tsx:25-46`, `porcellana/terra/frontLayer.ts` |
| P1-4 | **Le ruban fantôme et les cases qui s'allument** pendant qu'on tire le curseur (le plan § 3). La caméra cadre la case visée *au-dessus* du dock. | M | `empire/TerraPlay.tsx:87-88`, `porcellana/terra/frontLayer.ts`, `TerraBoard.tsx:415-437` |
| P1-5 | **La caméra immobile au toucher** : plus de vol ni de zoom quand on choisit une case, seulement un léger décalage si elle passe sous le dock. Ajouter les boutons +, −, « Centrer sur mes terres ». | S | `porcellana/terra/TerraBoard.tsx:415-437`, `empire/TerraPlay.tsx` |
| P1-6 | **Le panneau gauche sur ordinateur** (Tes fronts, Menaces, Rang) comme dans `maquette-over.png`, et une flèche d'encre au bord de l'écran pour une menace hors champ. Badge rouge sur « Fronts » au téléphone dès qu'une menace existe. | M | `empire/TerraPlay.tsx:197-224, 397-411` |
| P1-7 | **La barre de la maquette** : anneau des troupes, « pain 4 j », ducats, heure de bataille, durée en jours (« 6 j 21 h »), Maison et rang en médaillon. Sur téléphone : deux pilules, la phase dessous. | M | `empire/TerraPlay.tsx:156-184`, `game/format.ts` (`duration`) |
| P1-8 | **S'installer avec de l'aide** : allumer en lagune les cases libres conseillées (loin des autres, près d'une ville), et une seule touche dans la fiche (« M'installer ici ») sans dock intermédiaire. | S | `empire/TerraPlay.tsx:380-395`, `porcellana/terra/play.ts` |
| P1-9 | **Les cartes « Bâtir » de la maquette** : dessin de la case (vignette du kit), « 1 / 3 », `CostChips` (ducats, planches, briques), la raison « 2 sur 2 : prends des terres », le fantôme du bâtiment et sa zone allumée sur le plateau. | M | `empire/TerraPlay.tsx:271-313`, `porcellana/terra/TerraBoard.tsx` (marked → zone) |

### P2 (le plaisir et le retour)

| # | Recommandation | Effort | Fichiers |
| --- | --- | --- | --- |
| P2-1 | **Ratio permanent à la OpenFront** : « Part engagée » réglée une fois, et « Attaquer · N » directement dans la fiche (deux gestes). | M | `empire/TerraPlay.tsx`, `porcellana/PlaceCard.tsx` |
| P2-2 | **« Pendant ton absence »** (lot T6) : rejouer en accéléré, avec un récapitulatif fait des textes `returns` déjà écrits. | L | `empire/TerraPlay.tsx`, `porcellana/terra/TerraBoard.tsx` |
| P2-3 | **Distinguer gain et perte** : une case perdue s'enfonce avec un éclat d'encre et une pilule. Compte à rebours sur la tête du front. Anneau des troupes qui se vide à l'envoi. | M | `porcellana/terra/TerraBoard.tsx:466-495`, `frontLayer.ts` |
| P2-4 | **Confirmer « Rompre »** (effet dans 2 h) et donner un retour aux signaux, avec des pastilles colorées comme dans `maquette-neigh.png`. | S | `empire/TerraPlay.tsx:550-557, 580-595` |
| P2-5 | **Rendu à plat complet** : camps, noms, fronts et bâtiments en pictogrammes dans `FlatTerra`. | M | `porcellana/terra/TerraScene.tsx:84-130` |
| P2-6 | **Écrire dans `design.md`** les règles « Encres », le liseré lagune des alliés et la sélection à l'encre bleue sur le plateau de la Terraferme. | S | `docs/design.md` |

---

*Captures de cet audit : `captures/` (`d1-arrivee.png`, `d3-fiche-bord.png`, `d5-curseur-max.png` : la promesse « 30 cases », `d6-apres-attaque-150.png` : l'absence de retour, `d8-fronts.png`, `m1-arrivee.png`, `m3-dock-front.png`, `m4-pied.png`).*
