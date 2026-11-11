# Audit visuel de la planche, de l'île et de la Passe (11 novembre 2026)

*Demande du porteur : « Fais un audit complet de l'aspect visuel actuel du jeu, de ce qui fonctionne et ne fonctionne pas. Propose ensuite une maquette d'amélioration du design […]. Propose aussi un logo simple, épuré, tout en restant attractif. »*

*Version auditée : la dernière, celle du lot I5 de l'île (`?lab=planche&simple&seul`, puis « Entrer dans ton île » et « Forcer le passage »), capturée à 1280 × 800 et 390 × 844. **Rien n'est décidé, rien n'est codé** : c'est une proposition, à valider.*

Toile de design (audit, logo, quatre écrans) : https://claude.ai/artifact/KA5AP17HukkQ1dDpJT9omg (privée, au compte du porteur). Captures de l'état actuel dans ce dossier ; le logo en `logo.svg` (et `logo-16.svg` pour l'onglet du navigateur).

## Ce qui fonctionne, et qu'on garde

1. **La matière** : porcelaine mate, biseaux, lumière douce. Aucun jeu de commerce ne ressemble à ça.
2. **Le rouge veut dire « à toi »** : Ta Maison, ton drapeau, ton fil, l'unique bouton d'action.
3. **Des bâtiments qu'on nomme** : le Fondaco, San Marco, la tour de passage, la sablière.
4. **La Passe se lit d'un coup** : deux rives rouges, deux rives noires, deux compteurs.
5. **Une décision par feuille** : fiche de papier, une phrase, une touche rouge qui s'enfonce.
6. **Nunito et Manrope** : les chiffres restent lisibles de 390 px à 1440 px.
7. **Le gain avant la pose**, sur l'île : la bonne mécanique, dite au bon endroit.
8. **Le mouvement a une raison** : les cases qui tombent, l'île qui se retourne.

## Ce qui ne fonctionne pas

| # | Gravité | Où | Constat |
| --- | --- | --- | --- |
| 1 | bloquant | planche | **Le fil, seul geste du jeu, est un trait de 3 px**, plus fin qu'un joint de case. Patine, barques, sens et fils des rivaux sont invisibles (`fil-pc.jpg`). |
| 2 | bloquant | planche | **Un carrelage gris**, pas une lagune qui vire à l'encre : 20 × 20 cases jointes, l'eau comprise (la grammaire veut l'eau d'un seul tenant), un péril en dégradé de gris par rangées (`planche-pc.jpg`). |
| 3 | bloquant | fiche d'une ville | **Un tableur** : six boutons gris « Ton île n'en fait pas », une jauge noire pleine au lieu d'une jauge découpée par fournisseur (CADRAGE-v4 § 6). À 1280 px, un rectangle blanc recouvre le haut de la planche à l'ouverture (bug de rendu, `ville-pc.jpg`). |
| 4 | bloquant | marque | **Pas de marque** : l'icône est encore le médaillon de lion doré de l'ancienne direction, illisible à 32 px et contraire à Porcellana. |
| 5 | à corriger | île | Les **terrains ne se voient pas** (seulement des étiquettes « + Rive » qui chevauchent les cases) ; les cases à acheter ont plus de relief que celles qu'on possède ; sur téléphone, des plaques d'ombre grise (`ile-tel.jpg`). |
| 6 | à corriger | île | Le gain parle mais ne guide pas : « ±0 % » et « +50 % » ont la même pastille blanche. |
| 7 | à corriger | Passe | **Un damier sans adversaire** : le capitaine n'est qu'une ligne de texte, le courant à peine marqué, le brûlot grisé sans raison, la menace loin du plateau (`passe-tel.jpg`). |
| 8 | à corriger | HUD | À 390 px, le rang est coupé ; les bobines sont un chiffre « 5/5 » au lieu d'objets (`planche-tel.jpg`). |
| 9 | à corriger | planche | Quatre styles d'étiquettes concurrents ; elles dominent l'image (règle 8 : on lit plus qu'on ne voit). |
| 10 | à corriger | planche | Huit Maisons identiques de 30 px : on ne reconnaît pas une île de loin. |
| 11 | à corriger | fiche de ta Maison | « En entrepôt : (plafond 240). » s'affiche vide ; « Touche une ville pour y tirer ton premier fil » alors que l'île ne produit rien encore. |
| 12 | à corriger | jeu en ligne | L'empire garde des boutons or, un onglet lapis et une Porta en hexagones pastel : à aligner à la bascule. |

## Huit principes pour la maquette

Les tuiles et les bâtiments ne changent pas (règle 10 du cadrage v4).

1. **Le fil est le plus bel objet** : ruban de 7 à 9 px, deux tons, chevrons, barques, reflet de patine ; les rivaux en encre pointillée.
2. **L'eau d'un tenant, l'encre au loin** : lagune sans joints, Large en lavis d'encre ; seules les terres gardent leurs joints.
3. **Une étiquette, trois tailles** : ville (nom et parts de la demande), passage (tour, capitaine, trois sceaux), Maison (pavillon) ; toi seul en rouge.
4. **La demande en parts** : chaque jauge découpée par fournisseur, l'alerte « Ca' Dandolo vient de te passer devant », la ville tissée en trois nœuds.
5. **Les bobines en objets** : une seule pilule (ducats, cinq bobines dessinées, rang).
6. **Le terrain se voit** : argile rosée, sable grenu, pré strié, forêt, rive mouillée ; les cases à acheter pâles et pointillées.
7. **Un visage en face** : médaillon et manière du capitaine, courant fléché au sol, menace tracée sur le plateau, case décisive cerclée.
8. **Une marque tirée du jeu** : l'arche du fondaco tracée d'un seul fil rouge, le point d'encre du quai sur son seuil, posée sur une case de porcelaine.
