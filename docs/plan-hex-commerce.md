# Le Hex dans le commerce : plan (étape 4 de l'audit du 11 novembre 2026)

*Proposé le 12 novembre 2026, à la suite de la progression de la Maison (`docs/plan-progression-maison.md`, fusionné). Audit : `docs/audit-progression-2026-11-11/00-audit.md` § 7 ; il reprend aussi les lots R5 (le Problème du jour) et R6 (le défi par le fil) de `docs/plan-classement.md`. Maquette : écrans 2a (la planche, ses tours et ses détours) et 2b (la commande scellée). **Validé le 12 novembre 2026** avec les quatre recommandations du § 7.*

## 1. Le problème à régler

La Passe est l'idée la plus originale du jeu, et on la joue à peine : il faut forcer une tour une fois, puis on n'y pense plus. Le porteur veut que le joueur s'en serve davantage pour son commerce, **sans que ce soit indispensable**.

Après cette étape, le Hex sert **chaque jour, en une minute, pour gagner plus**, et un joueur qui n'aime pas la Passe reste toujours servi par le détour.

## 2. Ce que voit le joueur

| Où | Ce qu'il voit | Ce qu'il fait |
| --- | --- | --- |
| **La fiche d'une ville derrière une tour** | « Forcer la tour » ou « Par le détour » : 60 % de la charge, aucun duel, aucun péage. | Choisir : la Passe pour tout gagner, le détour pour être tranquille. |
| **Une ville avec une commande scellée** (un sceau rouge sur son étiquette) | Comme l'écran 2b : « 40 verres au double du prix, livrés par le détroit » ; une position « le fil passe en trois coups ». | Jouer la position une fois. Gagnée : la commande est livrée au double du prix. Perdue : rien d'autre ne se perd. |
| **La tour du Lido** (un rond rouge tant qu'il n'est pas joué) | Le **Problème du jour** : la même position pour toute la lagune, un seul essai. | Une minute de réflexion ; à minuit, combien l'ont réussi. |
| **La Maison d'un autre joueur** | « Défier par le fil » : deux Passes en direct, chacun une fois le fil et une fois la chaîne. | Monter sa cote de la Passe, sans rien risquer d'autre. |
| **Une tour qu'on tient** | « Préparer la garde » : poser à l'avance deux maillons sur le plateau, que le lieutenant défendra. | Rendre sa tour plus dure à prendre. |

## 3. Les règles

### 3.1 Trois tailles de duel

- **Le canal** (5 × 5, une minute), **la bouche** (7 × 7), **le détroit** (9 × 9, le plus dur). La lagune passe ses détroits sur le plateau de 9 × 9.

### 3.2 Le détour (déjà dans le moteur depuis l'étape 2)

- Toute ville derrière une tour se rejoint aussi par le détour : 60 % de la charge, aucun péage, aucun duel.
- Il est proposé à l'écran dès que la route est fermée.

### 3.3 Les commandes scellées

- Chaque jour, **deux commandes scellées** apparaissent dans chaque sestiere, sur des villes derrière une tour. Une commande dit : une marchandise, une quantité (le tiers d'une journée de fil), **le double du prix**, et une heure de fin (quatre heures).
- La livrer, c'est jouer une position tirée des problèmes « le fil passe en N coups », de la taille de la tour : un seul essai par commande et par Maison.
- Gagnée : la quantité part de l'entrepôt, payée au double du prix (par le grand livre), et compte pour le Prestige du commerce. Perdue : rien n'est pris.
- La première Maison qui la livre l'emporte ; elle disparaît alors pour les autres.

### 3.4 Le Problème du jour (lot R5)

- Chaque jour, une position tirée par la date, la même pour toute la lagune. Un seul essai.
- Réussi : un peu de Prestige (20), et un nœud sur la façade pour le jour. Les résultats de la lagune (combien l'ont réussi, en combien de coups) s'affichent à minuit.
- Les vingt problèmes d'aujourd'hui suffisent pour trois semaines ; le générateur en produira d'autres avant la bêta.

### 3.5 Le défi par le fil (lot R6)

- Tirer un fil vers l'île d'un autre joueur présent lui propose le défi. Il accepte ou refuse (un refus ne se voit pas). Une fois par paire et par semaine.
- Deux Passes en direct sur le salon de duel déjà en ligne : chacun joue une fois le fil, une fois la chaîne. Chaque Passe compte pour la cote du laurier de la Passe (moteur déjà fait à l'étape du rang).

### 3.6 La garde préparée

- Celui qui tient une tour pose à l'avance **deux maillons** (trois sur un détroit) sur le plateau de sa Passe. Le lieutenant défend à partir d'eux.
- Il peut les changer une fois par jour (la même règle que les ruses de la Guerre, décidée le 11 novembre).

## 4. La technique

- **Moteur** : les commandes scellées (tirées par la date et le sestiere, pures), leur livraison, la garde posée sur le plateau de la Passe, le Problème du jour tiré par la date. Tests d'abord.
- **Serveur** : comme pour forcer une tour, le serveur rejoue la position avec les coups du joueur, et c'est son verdict qui compte. Les commandes, le Problème du jour et la garde sont des commandes de la planche, écrites au journal.
- **Écran** : la fiche de la ville (forcer ou détour), le sceau rouge et la commande, le rond rouge du Lido, la Passe ouverte sur la position, le défi, l'éditeur de garde dans la fiche de la tour.

## 5. Les lots

| Lot | Contenu | Vérification |
| --- | --- | --- |
| H1 | **Le détour et les trois tailles à l'écran** : la fiche de la ville propose le détour, la lagune joue ses détroits en 9 × 9. | parcours e2e |
| H2 | **Les commandes scellées** : moteur, serveur, écran (le sceau, la position, la livraison). | tests ; parcours e2e |
| H3 | **Le Problème du jour** : moteur, serveur, le rond du Lido, les résultats de minuit, le Prestige. | tests ; parcours e2e |
| H4 | **La garde préparée** : le plateau de la tour avec ses maillons posés, l'éditeur, le lieutenant qui défend à partir d'eux. | tests |
| H5 | **Le défi par le fil** : proposer, accepter, refuser, deux Passes en direct, la cote. | tests du serveur ; parcours à deux navigateurs |
| H6 | **Au banc** : une semaine de lagune avec des joueurs qui jouent une Passe par jour et d'autres jamais. | celui qui joue la Passe gagne plus, mais pas plus de 25 % ; le détour reste rentable ; `docs/calibration.md` |

Fusion sur la branche principale à la fin de H6.

## 6. Ce qui n'est pas dans cette étape

La Muda et les détroits noirs (étape 8), la Guerre et l'Arsenal (étapes 5 et 6), les pièces de la Passe gagnées par le niveau (plus tard).

## 7. Tranché (12 novembre 2026, le porteur suit les quatre recommandations)

1. **Les commandes scellées** : deux par sestiere et par jour ; la première Maison qui la livre l'emporte.
2. **Le Problème du jour** : 20 de Prestige (dans le plafond de la semaine) et un nœud sur la façade.
3. **Le défi par le fil** : en direct, les deux joueurs présents.
4. **La garde préparée** : deux maillons, trois sur un détroit, pour tous.

## 8. État

| Lot | État |
| --- | --- |
| H1 | fait : la fiche d'une ville derrière une tour fermée propose « Forcer la tour » et « Par le détour · 60 % » ; le fil par le détour se dessine sans passer par la tour, ses barges naviguent ; le serveur accepte `detour` sur `/api/planche/thread` ; la lagune joue ses détroits sur le plateau de 9 × 9 (Otrante). 1 test du serveur. |
| H2 | fait : `packages/engine/src/planche/commandes.ts` (deux commandes par sestiere et par jour, tirées par la date sur les villes derrière une tour : 80 unités, le tiers d'une journée de fil, au double du plein prix, ouvertes à 9 h et 17 h pour quatre heures, une position parmi les vingt problèmes ; un essai par Maison, la première qui gagne livre, la vente passe par le grand livre et compte au Prestige du commerce) ; le serveur rejoue la position avec les coups du joueur dans le nombre de coups permis (commande `order` au journal, route `/api/planche/order`) ; à l'écran, le sceau rouge sur l'étiquette de la ville, la commande annoncée au fil des nouvelles, son bloc dans la fiche de la ville (« Jouer la position », ou pourquoi on ne peut pas), la Passe ouverte sur la position. 4 tests du moteur, 1 du serveur ; parcours `e2e:commande` (la planche lue à 10 h, l'entrepôt plein ; la position jouée et perdue, l'essai envoyé et dépensé), captures dans `docs/hex-captures/`. |
| H3 | fait : `packages/engine/src/planche/jour.ts` (un problème par jour, le même pour toute la lagune, tiré par la date dans un ordre fixe qui passe les vingt avant d'en reprendre un ; un essai par Maison ; réussi, 20 de Prestige comptés dans la semaine sous son plafond et un nœud ; les essais d'aujourd'hui et d'hier gardés pour les résultats) ; le serveur rejoue la position comme pour les commandes (commande `daily` au journal, route `/api/planche/daily`), `/api/maison` donne les nœuds. À l'écran : **la lagune n'a pas de tour du Lido** (les canaux jouent sur le plateau du Lido, mais leurs tours s'appellent Canal 1 et Canal 3) : le rond rouge est donc sous le médaillon, « Problème du jour », qui bat tant qu'il n'est pas joué, puis « Réussi » ou « Joué » ; sa fiche (la position, ce qu'elle rapporte, les résultats d'hier : combien l'ont réussi, en combien de coups au mieux) ; le nœud sur la façade le jour réussi et le compte des nœuds. 3 tests du moteur, 1 du serveur ; parcours `e2e:commande` (la position jouée sur le vrai serveur, perdue, l'essai dépensé), captures 6 à 8 dans `docs/hex-captures/`. |
| H4 | à faire |
| H5 | à faire |
| H6 | à faire |
