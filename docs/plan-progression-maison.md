# La progression de la Maison : plan (étape 3 de l'audit du 11 novembre 2026)

*Proposé le 12 novembre 2026, à la suite des lagunes de 48 (`docs/plan-lagunes.md`, fusionné). Décision du porteur D1 : les victoires de la semaine font grandir la Maison, par un Prestige plafonné par semaine, qui ouvre de la capacité et du choix, jamais un rendement. Audit : `docs/audit-progression-2026-11-11/00-audit.md` § 8 ; maquette : écrans 1c et 1d. **Validé le 12 novembre 2026** avec les trois recommandations du § 7.*

## 1. Le problème à régler

Aujourd'hui, rien ne grandit au-delà de l'île : toutes les Maisons ont 5 bobines du premier au dernier jour, et le rang repart de zéro à chaque marée. Un joueur fidèle n'a rien qui dure à montrer, ni rien à viser au-delà de la semaine.

Après cette étape :

- la Maison a un **niveau**, de 1 à 30, qui ne recule jamais, et un **titre** qui se voit sur la planche ;
- chaque semaine de jeu rapporte du **Prestige**, plafonné, qui fait monter ce niveau ;
- chaque niveau **ouvre quelque chose** : une bobine, des cases d'île, des ateliers, une tour de plus ;
- la Maison a une **façade** et un **Livre** qui racontent son histoire.

## 2. Ce que voit le joueur

| Où | Ce qu'il voit |
| --- | --- |
| **Le médaillon** (coin haut) | Un anneau rouge autour du logo, qui se remplit vers le niveau suivant, et le numéro du niveau |
| **La fiche du Prestige** (en touchant le médaillon) | Comme l'écran 1d de la maquette : le Prestige de la semaine et d'où il vient, le plafond, « niveau 13 dans 9 jours », le chemin des niveaux avec ce que chacun ouvre |
| **La montée de niveau** | Un moment à part : l'anneau se ferme, le nouveau niveau s'affiche, et ce qu'il ouvre apparaît (une bobine de plus se dessine dans la pilule) |
| **La façade et le Livre** (depuis le profil) | Comme l'écran 1c : la façade avec ses pavillons pris, ses lauriers et ses pierres ; le Livre, écrit par le jeu (« Semaine 13 : pavillon pris à ton rival Ca' Zorzi ») |
| **Sur la planche** | Le titre à côté du nom (*Casa*, *Ca'*, *Palazzo*…), vu de tous |

## 3. Les règles

### 3.1 Le Prestige

| Source | Combien | Quand |
| --- | --- | --- |
| **Le commerce** | Un peu, selon ce que tes fils ont vendu dans la journée, plafonné par jour | Chaque jour |
| **Le rival battu** | Une part fixe | Le dimanche |
| **La place dans le sestiere** | Selon la place, du premier au dernier | Le dimanche |
| **Les sceaux brisés** | Par sceau brisé à une tour | Au passage forcé |
| **La tour tenue** | Selon les heures tenues | Le dimanche |
| **Les lauriers et le Doge** | Une part fixe | À la fin de la marée |
| *Plus tard* | Le Problème du jour, la Guerre, la Muda, les détroits noirs | Leurs étapes |

- **Le plafond** : 500 par semaine. Venir un peu chaque jour suffit à l'atteindre (règle 7).
- **Le rattrapage** : ce qu'on n'a pas gagné sous le plafond une semaine se reporte pour moitié sur la suivante (une semaine manquée n'est pas perdue).
- **Le Prestige ne s'achète pas, ne s'échange pas, ne se perd pas** (règle 4).

### 3.2 Le niveau et les titres

- De 1 à 30, sur une courbe qui ralentit : un joueur régulier atteint le **niveau 10 en 4 à 6 semaines**, et le **niveau 30 en un an** environ.
- Cinq titres : *Bottega* (1 à 5), *Casa* (6 à 10), *Ca'* (11 à 15), *Palazzo* (16 à 20), *Procuratie* (21 à 30).

### 3.3 Ce que chaque niveau ouvre

Ce qui existe déjà dans le jeu ; l'Arsenal, la flotte et les plans s'ajouteront à cette table quand leurs étapes viendront.

| Niveaux | Bobines | Cases de l'île | Ateliers | Tours tenues |
| --- | --- | --- | --- | --- |
| 1 | 3 | 12 | matières (ferme, sablière, bois, argile, sel, chanvre) | 1 |
| 2 à 5 | 4 au niveau 2, 5 au niveau 4 | 16 | les ouvrages (scierie, briqueterie, verrerie, moulin, corderie) au niveau 3 | 1 |
| 6 à 10 | 6 au niveau 8 | 20 | — | 2 |
| 11 à 15 | 7 au niveau 12 | 28 | le bel ouvrage (à venir) | 2 |
| 16 à 20 | 8, puis 9 | 32 | — | 3 |
| 21 à 30 | 10 à 12 | 36 | — | 3 |

- **Jamais un rendement** : un niveau donne de la place et du choix, pas un bonus de production ou de prix.
- Les Maisons de l'ordinateur ont le niveau médian des joueurs de leur lagune, pour ne pas écraser ni être écrasées.

### 3.4 La façade et le Livre

- **La façade** montre ce que la Maison a gagné et garde : pavillons pris aux rivaux et aux corsaires, lauriers et coiffes de Doge des marées passées, pierres gravées.
- **Le Livre** est écrit par le jeu à chaque événement qui compte : la fondation, un niveau, un pavillon pris, un laurier, une tour prise, un Doge.

## 4. La technique

- **Moteur** : les règles du Prestige (sources, plafond, rattrapage), la courbe des niveaux, la table de ce que chaque niveau ouvre ; la Maison sur la planche porte son niveau, et ses bobines, ses cases et ses ateliers en dépendent. Pur, tests d'abord ; paramètres dans `worlds.settings`.
- **Base** : le Prestige est inscrit dans le journal de points de l'ancien jeu (`influence_entries`, une clé par gain pour ne jamais compter deux fois), et non dans une nouvelle table. Le niveau se calcule à partir de lui. Le Livre et la collection ont leur table (`maison_events`), liée au compte : ils suivront le joueur d'une lagune à l'autre (les ligues, plus tard).
- **Serveur** : le dimanche, il règle le Prestige de la semaine en même temps que le rival ; à chaque montée de niveau, une commande de la planche donne à la Maison ce que le niveau ouvre.

## 5. Les lots

| Lot | Contenu | Vérification |
| --- | --- | --- |
| M1 | **Le moteur** : Prestige, plafond et rattrapage ; niveaux et titres ; ce que chaque niveau ouvre (bobines, cases, ateliers, tours) appliqué sur la planche. | tests du moteur |
| M2 | **Au banc** : huit semaines de lagune avec des joueurs simulés, réguliers (3 visites par jour), assidus (8 par jour) et irréguliers. | le régulier atteint le niveau 10 en 4 à 6 semaines ; l'assidu ne va pas deux fois plus vite ; `docs/calibration.md` |
| M3 | **Le serveur** : le journal du Prestige, le règlement du dimanche, la montée de niveau sur la planche, le Livre et la collection ; une route `/api/maison`. | tests du serveur |
| M4 | **L'écran** : l'anneau du médaillon, la fiche du Prestige, la montée de niveau, la façade et le Livre, le titre sur la planche. Selon la maquette (écrans 1c et 1d). | parcours e2e à 390 px et sur ordinateur, captures |

Fusion sur la branche principale à la fin de M4.

## 6. Ce qui n'est pas dans cette étape

L'Arsenal et la flotte (étape 5), le Problème du jour et le défi par le fil (étape 4), la Guerre (étape 6), la Muda et les détroits noirs (étape 8), les ligues (étape 9) : chacun ajoutera sa source de Prestige et ses lignes à la table des niveaux.

## 7. Tranché (12 novembre 2026, le porteur suit les trois recommandations)

1. **Les bobines** : 3 au départ, 4 au niveau 2, 5 au niveau 4, puis jusqu'à 12.
2. **Le commerce** rapporte un peu de Prestige chaque jour, plafonné.
3. **Les Maisons de l'ordinateur** jouent au niveau médian des joueurs de leur lagune.

## 8. État

| Lot | État |
| --- | --- |
| M1 | fait : `packages/engine/src/planche/maison.ts` (le niveau et son titre sur la courbe `20 × (n − 1)²` (lagune de Venise), ce que chaque niveau ouvre, la semaine plafonnée et son report, le Prestige du commerce du jour) ; sur la planche, chaque Maison porte son niveau, et ses bobines, les cases de son île, les étages de ses ateliers et ses tours en dépendent (`plancheSetLevel`, qui ne redescend jamais) ; les Maisons de l'ordinateur sautent les ateliers que leur niveau n'ouvre pas encore. Règles de la lagune de Venise dans `venice1450.lagune.ts` (3 bobines au départ, 5 au niveau 4, 12 au niveau 30 ; les ouvrages au niveau 3 ; une deuxième tour au niveau 6). 7 tests. |
| M2 | fait : banc `maison-bench` ; retenus : courbe `20 × (n − 1)²`, commerce 1 point par 50 ducats vendus (55 par jour au plus), victoires de la semaine (rival 60, première place du sestiere 100 puis 8 de moins par place, sceau 15, un point par 2 h de tour tenue jusqu'à 70, laurier 100, Doge 200) ; le régulier au niveau 10 en semaine 5, l'assidu 5 % plus vite ; `docs/calibration.md` § La progression des Maisons |
| M3 | à faire |
| M4 | à faire |
