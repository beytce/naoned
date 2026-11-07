# Les premiers pas : du départ vide à la première commande, et ce qui se voit (plan, 6 novembre 2026)

*Retours du porteur après ses essais du 6 novembre 2026 ; plan validé le jour même (« ok avec le niveau 4, ok pour le camp de bûcheron, d'accord, lance le lot 1 »).*

## Les retours

1. Au départ, on ne sait pas quoi faire : un guide complet doit mener à la première commande, avec une production accélérée et une commande qui attend forcément, livrée en accéléré.
2. On ne comprend pas l'avantage de faire monter le Fondaco : il doit augmenter la capacité de stockage et la zone couverte pour les commandes.
3. Les points noirs au-dessus des ateliers et des villes non accessibles sont les mêmes, et on ne comprend pas à quoi ils servent.
4. « Ça t'attend » donne peu d'indications utiles : mieux vaut regarder la carte pour voir les commandes en attente.
5. Une case libre doit proposer tous les bâtiments (ateliers, Porta, Remise…), même ceux qui ne sont pas débloqués, visibles.
6. La Porta doit se débloquer plus tôt : c'est un élément important, que le joueur doit découvrir vite.
7. Au début, on a déjà trois ateliers : il n'en faut aucun, le développement se fait par le joueur.

## Ce que le code disait

- Les trois ateliers de départ venaient de `start.workshops` (`venice1450.empire.ts`) : glaisière, camp de bûcherons, scierie.
- Les villes ne commandent que ce que les ateliers de la maison fabriquent (`orders.ts`) : sans atelier, aucune commande. La première commande doit donc être garantie à part (lot 2).
- Le Fondaco a deux niveaux qui ne se parlent pas : la Casa (places, fonctions ouvertes) et `homeLevel` (la portée, `reachOf`), que la carte ne montre pas. Aucun plafond de stock dans l'empire, alors que la règle d'or 3 en veut un.
- Les repères (`scene.ts`, `pin: ""`) sont vides et pareils partout.
- Une case libre n'ouvre que la liste des ateliers ; la Remise, le Campo et la Porta passent par une barre de pose à part, et le verrouillé ne se voit pas.
- La Porta s'ouvre à la Casa 10, ses premiers modèles et armes à la Casa 9.

## Les décisions du porteur

- La Porta au **niveau 4** du Fondaco.
- Le premier atelier du guide : le **camp de bûcherons** (le bois : brut, sans intrant, demandé par les villes de Vénétie).
- Le stock plafonné **par marchandise** (une jauge par marchandise).

## Les lots

| Lot | Contenu | Critère d'acceptation |
| --- | --- | --- |
| 1 | **Le départ vide.** `start.workshops` vide ; `start.freeTiles` (3) : les cases libres données autour du premier Fondaco à une maison neuve (`giveStartTiles`, `map.ts`) ; le capital compensé (500 + 3 × 48 = 650 ducats, le premier niveau d'atelier coûtant 48 ducats une fois que la plupart des maisons l'ont, « le savoir circule »). Les maisons existantes gardent leurs ateliers (règle 1). Le simulateur garde ses trois premiers ateliers, payés au départ (ce que fait le joueur guidé dans ses premières minutes). | Une maison neuve n'a aucun atelier, possède trois cases libres à côté du Fondaco et bâtit dessus sans les acheter ; simulateur de 24 mois sur les trois graines sans recul. |
| 2 | **Le guide jusqu'à la première commande.** Une suite imposée, la main de Lorenzo sur l'objet à toucher : bâtir le camp de bûcherons sur une case libre (chantier immédiat), lancer la production (premier lot accéléré, environ 30 s), une commande d'accueil garantie dans la ville la plus proche pour exactement ce lot, la livrer (trajet accéléré, environ 45 s), le paiement vu ; puis le deuxième atelier et la montée du Fondaco. Moteur : un état `tutorial` de la maison (étape, accélérations utilisées une fois), testé sur la fixture. | Un joueur neuf livre sa première commande en moins de trois minutes sans lire autre chose que Lorenzo ; parcours e2e. |
| 3 | **Monter le Fondaco se voit.** La Casa et le niveau du Fondaco ne font qu'un. Chaque niveau élève le plafond de stock par marchandise (production arrêtée, rien perdu, une fois plein) et la zone couverte, dessinée en anneau sur la carte ; villes dedans actives, dehors grisées. La fiche du Fondaco montre l'avant et l'après (« stock 200 → 300 », « +2 villes : Padoue, Trévise ») et l'anneau suivant pendant qu'on la regarde. | Au simulateur ; la fiche et l'anneau en capture. |
| 4 | **Des repères qui parlent, sans « Ça t'attend ».** Plus de point vide. Un atelier : sa marchandise et son état (arc en marche, nombre rouge prêt, « ! » bloqué, à l'arrêt). Une ville dans la zone : ses commandes (caisses et marchandise, rouges quand le stock couvre). Une ville hors zone : un cadenas et le niveau de Fondaco qu'elle demande. « Ça t'attend » retiré du panneau de gauche. | Captures ; plus aucun repère vide. |
| 5 | **Une case libre propose tout.** Un seul catalogue : les ateliers par filière, puis Remise, Campo, Porta, Arsenal, comptoir. Le verrouillé visible, grisé, avec cadenas et condition (« Fondaco niv. 4 », « sur une côte »). La barre de pose à part disparaît. | Capture ; tout bâtiment du jeu trouvé depuis une case libre. |
| 6 | **La Porta au niveau 4.** La Porta, son premier modèle, une arme et une défense à la Casa 4 ; le premier palier de Rome recalibré pour cette puissance. | Simulateur de 24 mois (toutes les graines), `calibration.md`, note du chapitre. |

## État

| Lot | État |
| --- | --- |
| 1 | fait : moteur (`start.freeTiles`, `giveStartTiles`), thème (650 ducats, aucun atelier, trois cases), simulateur (premiers ateliers payés), tests du serveur (`test/empire-start.ts` bâtit les trois premiers ateliers comme le joueur) ; simulateur de 24 mois : voir `docs/calibration.md` (Les premiers pas) |
| 2 | fait : moteur (`welcome` des réglages et de la maison ; le camp de bûcherons de l'accueil debout tout de suite, son premier lot en 30 s seul dans sa file, `once`, la commande d'accueil `<ville>#welcome` dans la ville de Vénétie la plus proche hors du plafond de la ville, 100 ducats, son trajet en 45 s ; tests `welcome.test.ts`) ; web (l'étape `welcome` de Lorenzo avant toute autre, ses six phases, son bouton toujours là, l'arc du temps, la main sur la case, l'atelier ou la ville ; les cases libres appellent en rouge ; la liste met le camp en tête). Au passage : le règlement d'une arrivée à son heure, débranché depuis le lot 8 de Porcellana (une livraison n'était payée qu'à l'action suivante), rebranché ; dix villes sans nom français. Parcours dans le jeu : de la fondation au paiement en 91 s en suivant les seuls boutons de Lorenzo. Reste pour le lot 4 : la caméra qui suit la mule vers la ville |
| 3 | fait : moteur (`casa[].storeCap`, le stock d'un fondaco par marchandise ; à la récolte, seuls les lots qui tiennent sous le plafond entrent, les autres attendent prêts dans la file, `lotsThatFit` ; `map.reach.byCasa`, la zone du premier fondaco suit la Casa jusqu'au niveau 10 des comptoirs, `homeLevelOf` ; la vue donne `storeCap`, `full` et, pour la Casa suivante, son stock, sa portée et les villes gagnées ; tests `fondaco.test.ts`) ; thème (barème de 300 à 700 000) ; simulateur (le plafond à la production, le comptoir de Vénétie plus monté à part, comme au jeu) ; web (l'anneau de la zone autour du Fondaco, celui du niveau suivant quand le Fondaco est choisi ; la fiche « 300 de chaque marchandise · 3 villes dans sa zone » ; « Stock 300 → 500 · +1 ville : Ancône » dans le dock et la feuille de la Casa ; l'atelier « entrepôt plein », que Lorenzo ne demande plus de ramasser). Les villes hors de la zone grisées : avec les repères (lot 4). Pas d'anneau sur le plateau à plat (sans WebGL). Simulateur : 4 cibles sur 9 au lieu de 6, la fin de partie trop rapide une fois le gaspillage arrêté ; le porteur garde le plafond et remet le recalage de la fin de partie à plus tard (7 novembre, `calibration.md`) |
| 4 | fait : moteur (`map.zoneCasa`, pour chaque ville hors de la zone la Casa qui l'atteint ; test dans `fondaco.test.ts`) ; web (`PinBadge` : plus de repère vide, un lieu sans rien à dire garde une zone touchable invisible ; l'atelier montre sa marchandise dans son anneau, l'arc du lot en cours, ses lots prêts en rouge, « ! » s'il lui manque un intrant, « plein » ; la ville de la zone ses commandes par leur marchandise, en rouge quand le stock les couvre ; la ville hors zone et la parcelle fermée un cadenas et le niveau qui les ouvre ; Venise, le Marché, jamais fermée ; « Ça t'attend » retiré du panneau de gauche ; la caméra va à la ville de la commande d'accueil pendant qu'on la livre) |
| 5 | fait : toucher une case libre ouvre « Bâtir ici » : les ateliers (verrouillés avec « Plus de place : monte ton Fondaco » quand les places sont prises), puis les bâtiments (la Remise, le Campo, la Porta, un fondaco), chacun à bâtir sur cette case, déjà bâti, en chantier ou verrouillé avec ce qui l'ouvre (« Fondaco niv. 4 », « Hors de Vénétie ») ; `placeRows` testé. Sur les cases carrées, « Poser la Remise / le Campo / la Porta » mène à cette liste sur la case libre la plus proche, sans barre de pose. Reste la barre de pose pour le fondaco d'une autre région posé depuis la fiche de sa région |
| 6 | fait : la Porta à la Casa 4 pour 600 ducats, le cavalier et les premières armes avec elle et à sa mesure (thème) ; les niveaux de la Porta gardent leur prix. Simulateur de 24 mois : 4 cibles sur 9 sur les trois graines, comme après le lot 3, rien ne se dégrade ; 87 % des batailles gagnées, aucun véhicule de combat perdu (`calibration.md`). Annoncé dans le brouillon des notes du chapitre (`notes-chapitre-2026-12-porcellana.md`, § Les premiers pas) |
| Suite | le rythme de la fin de partie (les exigences d'ateliers des Casa 9 à 20), remis à une passe à part par le porteur ; le fondaco d'une autre région se pose encore par la barre de pose |
