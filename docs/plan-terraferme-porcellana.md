# La Terraferme en Porcellana (plan du lot 9, 7 novembre 2026)

*À valider par le porteur avant tout code de jeu.* Le porteur a retenu la recommandation des propositions du 7 novembre (« Ok suis ta recommandation ») et demande en plus de rendre visuels les bâtiments qu'on pose et de penser l'interface autour.

Références (elles font foi pour l'aspect) :
- les quatre propositions : `docs/direction-artistique-2026-11/terraferme/propositions.html` (en ligne, privé : https://claude.ai/artifact/GhNwtH8YRi5Vq3SKJhzagd) ;
- la maquette jouable qui les réunit, avec les bâtiments et l'interface : `docs/direction-artistique-2026-11/terraferme/maquette.html` (en ligne, privé : https://claude.ai/artifact/LEuJNbxcno7KiTHKuT8RnZ) ; captures `maquette-*.png` dans le même dossier.

Ce lot est le lot 9 de `docs/plan-porcellana.md` (« la Terraferme : la même grille carrée et la même direction, changement au lundi suivant »). Les règles du jeu ne changent pas, sauf le voisinage, qui passe de six à quatre voisins (§ 4).

## 1. Ce qui est retenu

| Pièce | Venue de | Ce qu'elle fait |
| --- | --- | --- |
| **La scène** | IV, la marée en relief | Le plateau du commerce : caméra orthographique en trois quarts, cases épaisses biseautées, lagune d'un seul tenant, montagnes, collines et marais en relief. Ta terre est un peu plus haute (0,62 contre 0,50 pour les autres, 0,42 pour la terre libre). |
| **L'émail** | I, la coulée | Chaque territoire est une nappe d'émail posée sur le dessus des cases : bords arrondis, un joint de porcelaine entre deux marchands, un reflet blanc au bord. Une case prise reçoit l'émail qui coule depuis la case voisine d'où vient l'attaque. |
| **La vague** | IV | La case prise se soulève (+0,55) puis retombe en 0,8 s ; ses voisines frémissent (+0,1). |
| **Le ruban** | II, les tesselles | Un front est un ruban à chevrons qui court de son camp à sa tête, levé en arc au-dessus du plateau ; les siens en rouge, ceux qui le menacent à l'encre, Milan en biscuit. Une pastille de papier porte ses hommes. |
| **L'épaisseur** | III, les courants | Le ruban est épais au camp, plus fin à la tête ; sa largeur suit la racine des hommes engagés et maigrit à chaque case prise. |
| **Les équerres** | II | Les deux prochaines cases d'un front portent quatre équerres qui respirent. |
| **Les couleurs** | règle « Encres » | Toi en rouge de Venise ; les voisins en valeurs d'encre (dense, claire et tramée) ; les alliés au liseré lagune ; Milan en biscuit hachuré. Les noms viennent en étiquettes au camp. |

## 2. Les bâtiments, visibles sur le plateau

Les cinq bâtiments du moteur (`terraferma.buildings`) et le camp deviennent des modèles de porcelaine du kit (`apps/web/src/porcellana/models/terra.ts`), dans la grammaire des ateliers : une silhouette qu'on nomme au premier regard, le drapeau à la couleur du marchand.

| Bâtiment | Silhouette | Zone allumée quand on le choisit |
| --- | --- | --- |
| **Camp** | Tente octogonale à toit conique, grand drapeau ; le sien porte l'anneau des recrues | — |
| **Fort** (`rocca`) | Donjon carré crénelé sur un socle | Sa case et les quatre voisines (rouge) |
| **Bourg** (`borgo`, s'il est ouvert) | Trois maisons à pignon | Toutes tes terres (voile rouge léger) |
| **Port** (`porto`, au bord de l'eau) | Quai de bois, bittes d'encre, maison du port, barque à voile rouge | Les rives de la même eau (lagune) |
| **Bombarde** (`bombarda`) | Affût de bois, fût de métal, roues et boulets d'encre | Portée de 4 cases (tirets) ; en visée, les cibles en équerres |
| **Remparts** (`mura`) | Quatre murs bas et tours d'angle autour de la case | Sa case et les quatre voisines (encre) |

- **Poser** : le bâtiment tombe en place depuis sous la case (0,7 s), comme une case achetée sur la carte.
- **Perdre** : une case prise rase son bâtiment, qui s'enfonce et s'efface (1,4 s).
- **Tirer** : le boulet suit un arc en pointillés d'encre ; à l'impact, une bouffée de porcelaine, et les cases touchées perdent leur émail.

## 3. L'interface (refonte claire, dock, Porcellana ludique)

Aucune pièce nouvelle : la fiche, le dock, `ChoiceCard`, `CostChips`, la touche rouge sur son pied, la pilule fantôme, la pilule d'encre.

- **La barre du haut** : « ‹ Carte », la Maison et son rang ; au centre la phase (jour, nuit, bataille du soir, fin de semaine) ; à droite les troupes en anneau qui se remplit (« 96 / 180 », « +13/h · pain 4 j »), puis les ducats. Les troupes touchées ouvrent « Tes terres ». Sur téléphone : la Maison et les troupes seulement, la phase en pilule dessous.
- **Toucher une case** : elle se soulève (0,35), cerclée de rouge ; la fiche se pose à côté (en bas sur téléphone) : à qui elle est, son terrain, ce qu'elle coûte à prendre ou ce qui la défend. La flèche rouge ouvre le dock.
- **Le dock « Lancer un front »** : le curseur des hommes engagés ; pendant qu'on le tire, le ruban fantôme grossit sur le plateau et les cases qu'il prendrait s'allument (équerres sur les deux premières, tirets ensuite) ; quatre lignes (cases prises et coût, hommes qui reviennent, défenseurs qui restent par case, heure de la première case) ; « Attaquer · 52 hommes ». Les textes existants de `fr.empire.terra.target` servent tels quels.
- **Le dock « Bâtir ici »** : les bâtiments en cartes, chacun dessiné sur sa case, son effet, son prix et « 1 / 3 » ; une carte grisée dit pourquoi (« Au bord de l'eau », « Case déjà bâtie », « 2 sur 2 : prends des terres »). La carte choisie pose le bâtiment en fantôme sur la case et allume sa zone ; « Bâtir le fort · 40 ».
- **Le dock d'un voisin** : blason, cases, troupes, allié ; les quatre signaux en pastilles (À l'aide, Cible, Merci, Paix) ; « Proposer l'alliance », ou pour un allié « Envoyer » avec un curseur et « Rompre (effet dans 2 h) ». Ses terres s'entourent de tirets.
- **Le dock « Tes terres »** : troupes, recrues, pain, points ; les fronts en marche avec « Rappeler » ; « Max +20 » ; le décret (au Signore seulement).
- **Les fronts** : sur ordinateur, un panneau à gauche (chaque front en barre à l'épaisseur de ses hommes, « Rappeler » ; les menaces à l'encre ; le rang). Sur téléphone, derrière « Fronts » au pied.
- **Le pied** : Mes terres, Fronts (avec leur nombre), Alliés, Classement.
- **Les retours** : une pilule d'encre en haut (« Front lancé · 52 hommes en marche ✓ », « Fort bâti ✓ », « Front rentré · 8 hommes reviennent »).
- **Le zoom** : +, −, « Centrer sur mes terres » ; glisser, pincer, la molette.
- **« Pendant votre absence »** : au retour, la semaine se rejoue en accéléré (les cases changent de main, les vagues passent) avant de rendre la main, comme le récapitulatif d'aujourd'hui.

## 4. La grille carrée (la seule règle touchée)

- Le moteur (`packages/engine/src/terraferma.ts`) passe de `hexNeighbors` et `hexDistance` à un voisinage carré à quatre voisins et à une distance de Manhattan, derrière un réglage `terraferma.grid` (« hex » | « square »), pour que l'ancienne carte reste jouable jusqu'au lundi de la bascule.
- La carte de la Vénétie est refaite en carrés à partir du même terrain (`art/veneto`), comme la carte du commerce l'a été (`docs/plan-porcellana.md` § 2 bis).
- Quatre voisins au lieu de six : une case a moins de fronts possibles, un fort couvre cinq cases au lieu de sept, les poches se ferment plus vite. On le mesure au simulateur (`pnpm sim --terra`, toutes les graines) : durée de la semaine, vitesse des fronts, part de terre libre au jeudi. Les réglages qui bougent (milices, `perCells`, rayon des remparts) sont notés dans `docs/calibration.md`.
- Le changement prend effet le lundi suivant sa mise en ligne (règle de la Terraferme), annoncé dans les notes du chapitre.

## 5. Les lots

| Lot | Contenu | Vérification |
| --- | --- | --- |
| T1 | **Moteur** : `terraferma.grid`, voisinage et distance carrés, tests d'abord sur la fixture figée ; la carte carrée de la Vénétie ; mesure au simulateur, `docs/calibration.md` | `pnpm test`, `pnpm sim --terra` |
| T2 | **Le plateau** : `porcellana/board/TerraBoard.tsx` sur `TileBoard` (instances : hauteur, teinte des côtés, vague) ; l'émail en shader (un champ par marchand rangé dans une texture de données, seuillé sur le dessus des cases, mis à jour quand une case change de main) ; la caméra et le zoom de la Carte ; sans WebGL, la même scène à plat (`FlatBoard`) | captures ordinateur et téléphone |
| T3 | **Les fronts** : ruban à largeur variable (variante de `ribbon.ts`), chevrons, pastille, équerres, la tête qui glisse avec la coulée ; menaces à l'encre | parcours e2e « lancer un front » |
| T4 | **Les bâtiments** : `models/terra.ts` (camp, fort, bourg, port, bombarde, remparts), leur arrivée, leur chute, le tir de bombarde | captures du laboratoire `?lab=porcellana` |
| T5 | **L'interface** : barre, fiche, docks (front, bâtir, voisin, tes terres, viser), panneau des fronts, pied, retours ; textes de `fr.empire.terra` | `pnpm typecheck && pnpm lint && pnpm test`, e2e |
| T6 | **Le retour** : « pendant votre absence » rejoué en accéléré ; ce qui demande moins de mouvement passe directement à l'état final | e2e |
| T7 | **Bascule** : `terraferma.grid` à « square » le lundi suivant, notes du chapitre, `docs/design.md` | décision du porteur |

## 6. Budget

- Cible : 60 images par seconde sur un téléphone moyen avec 800 cases et 40 marchands. L'émail ne se recalcule que pendant une coulée (au plus quelques cases à la fois) ; le reste du temps, la texture ne bouge pas.
- Rien ne bouge sans raison : seuls les fronts actifs (chevrons), les coulées, l'anneau des recrues et les drapeaux. `prefers-reduced-motion` coupe la vague, les chevrons et la coulée (la case change d'émail d'un coup).

## 7. Questions au porteur

1. **Le bourg** : le moteur le garde en option (`borgo`), le plan Terraferme du 18 octobre l'avait retiré. On le montre ou non ?
2. **Le voisinage à quatre** : d'accord pour le mesurer au simulateur et ajuster les réglages, avec un changement le lundi suivant ?
3. **« Encres »** pour les voisins : d'accord, ou faut-il une teinte par voisin direct au zoom rapproché ?
