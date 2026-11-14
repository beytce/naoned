# Les duels honnêtes : plan (lot B de l'audit d'ensemble du 13 novembre 2026)

*Proposé le 14 novembre 2026, après le socle (`docs/plan-socle.md`, fusionné). Décision D6 de `docs/audit-2026-11-13/00-synthese.md` : les duels contre l'ordinateur joués par le serveur coup à coup. Sources : rapports `03-joueur-competitif.md` (C1 à C11), `08-qa-securite.md` (Q2), `02-joueur-stratege.md` (S7), `05-expert-game-design.md`. Critère : aucune victoire ne se rejoue ni ne se partage ; un essai compte dès qu'il commence ; la cote mesure l'adresse. **Validé le 14 novembre 2026** avec les trois recommandations du § 7.*

## 1. Le problème à régler

La Passe est le meilleur du jeu, mais tout ce qui l'entoure se contourne :

- **le résultat n'est envoyé qu'au retour à la planche** : recharger la page efface un essai perdu (R3 C1) ;
- **l'ordinateur ne tire rien au hasard, et le serveur rejoue la liste de coups envoyée** : une ligne gagnante, trouvée hors ligne en quelques secondes, prend une tour pour tout le monde ; 20 duels sur 20 gagnés en 33 s (R3 C2, R8 Q2, R2 S7) ;
- **la cote du défi est biaisée** : la première Passe compte double, toujours au défieur ; la pendule part avant que la scène soit chargée ; au laurier de la Passe, refuser tous les défis est la stratégie sûre (R3 C4 à C6) ;
- **le dernier sceau rafle la tour** : deux sceaux brisés par l'un, le troisième par l'autre, et c'est l'autre qui prend la tour (R3 C8) ;
- **les six capitaines sortent tous contre la seule tour tenue**, trois le même soir (R3 C7) ;
- **les capitaines n'ont pas de manière** : le style « mur » ne change aucun coup, et aucun style n'est appliqué au forçage d'une tour (R3 C9) ;
- **le Problème du jour revient tous les 20 jours**, toujours en deux ou trois coups (R3 C11).

## 2. Ce que voit le joueur

- **Un duel contre l'ordinateur se joue en direct avec le serveur**, comme l'assaut de la Guerre : chaque pièce posée part au serveur, qui répond par celle du capitaine. Rien ne change à l'écran, sinon que l'essai compte dès la première pièce : « Ton essai est engagé ».
- **Le capitaine ne joue pas deux fois pareil** : la même ligne ne gagne pas deux fois.
- **Forcer une tour : un essai par tour et par jour** La fiche de la tour le dit.
- **Les sceaux d'une tour sont les tiens** : chaque Maison brise les siens ; la tour va à la première qui les a tous brisés. La fiche montre « tes sceaux : 2 sur 3 ».
- **Un défi entre deux joueurs est un seul match** : deux Passes, chacun une fois le fil ; 2-0 une victoire, 1-1 un nul. La pendule part quand les deux écrans sont prêts. On voit la cote de l'autre avant de défier, et ce que le défi a fait à la sienne après.
- **Les capitaines ont une manière qui se voit** : le mur barre le milieu, les rives longent les bords, la meute harcèle tes pièces ; la fiche de la tour la nomme, et l'écran du duel aussi.
- **Le Problème du jour change chaque jour**, de deux à quatre coups.

## 3. Les règles

### 3.1 Le duel joué par le serveur (B1)

- Commencer un duel contre l'ordinateur (forcer une tour, détroit noir, détroit de la Muda, commande scellée, Problème du jour, sortie au-devant) **ouvre une partie sur le serveur** et **engage l'essai** à l'instant, inscrit au journal : l'essai du jour est pris, la cargaison du détroit noir quitte l'entrepôt.
- Chaque pièce du joueur est jouée par le serveur, qui répond aussitôt (le calcul dans le pool de duels du socle).
- **Le capitaine tire une graine** au début de la partie, tirée par le serveur et jamais envoyée : son jeu varie d'une partie à l'autre, dans sa manière, sans jamais refuser une case nettement meilleure.
- **Une partie abandonnée est perdue** : sans pièce pendant dix minutes, ou si on la quitte, elle se termine en défaite (l'essai était engagé).
- La fin de la partie inscrit son résultat au journal (la tour forcée, la cargaison vendue, la commande livrée…).

### 3.2 Les tours et leurs sceaux (B2)

- **Un essai par tour et par jour** pour chaque Maison.
- **Les sceaux sont personnels** : chaque Maison a son compte sur chaque tour ; la tour passe à la première qui a brisé tous les siens ; les comptes des autres repartent de zéro quand la tour change de mains.
- **Les sorties se répartissent** : un capitaine ne sort pas contre une tour déjà visée cette semaine tant qu'il en reste une autre tenue par un joueur ; deux sorties au plus contre la même tour par semaine.

### 3.3 La manière des capitaines (B3)

- Chaque capitaine a une manière, connue et nommée ; elle pèse assez pour changer des coups (mesuré au banc : les trois manières jouent des parties différentes sur les mêmes damiers, sans perdre de force).
- La manière s'applique partout où un capitaine joue : forcer sa tour, ses sorties, les détroits noirs, la Muda.

### 3.4 Le défi et la cote (B4)

- **Un défi est un match** : la cote bouge une fois, à la fin des deux Passes (2-0, 1-1, 0-2), avec le même poids pour les deux joueurs.
- **La pendule part quand les deux écrans sont prêts** (un signal « prêt » de chaque client), ou après 30 secondes.
- **Le laurier de la Passe demande au moins trois défis joués** dans la marée ; avant, on n'y figure pas.
- Avant de défier : la cote de l'autre ; après : « ta cote : 1 212 (+12) ».

### 3.5 Le Problème du jour (B5)

- **Un problème nouveau chaque jour**, tiré d'une liste générée hors ligne et vérifiée par le solveur (le fil passe en exactement N coups, une seule clef) : une année de positions, de deux à quatre coups, sur les damiers de la lagune.

## 4. La technique

- **Moteur** : `passeThink` reçoit une graine (le générateur existe déjà) ; les manières renforcées (`mind.ts`) ; les sceaux personnels et l'essai par tour et par jour (`planche.ts`, `plancheForced`) ; la répartition des sorties (`sorties.ts`) ; la cote au match (`rang.ts`). Tests d'abord, sur les fixtures.
- **Serveur** : `DuelRooms` (des parties contre l'ordinateur en mémoire, une par joueur au plus) : `start` (engage l'essai par une commande au journal, tire la graine), `play` (une pièce, la réponse du pool), la fin par une commande ; routes `/api/planche/duel/start`, `/api/planche/duel/play`, `/api/planche/duel/quit`. Les anciennes routes qui rejouaient une liste de coups (`/force`, `/noir`, `/muda`, `/order`, `/daily`, `/sortie`) sont retirées. Le défi : le signal « prêt », la cote au match, la cote visible.
- **Écran** : la Passe en mode distant (comme l'assaut : l'écran pose, le serveur répond) ; « Ton essai est engagé » ; tes sceaux sur la fiche de la tour ; la manière du capitaine nommée ; la cote avant et après le défi.
- **Hors ligne** : le générateur des problèmes (`apps/simulator/src/problemes.ts`) écrit la liste dans le thème ; le banc des manières (`passe-bench`).

## 5. Les lots

| Lot | Contenu | Validation |
| --- | --- | --- |
| B1 | Le duel joué par le serveur, coup à coup, la graine, l'essai engagé dès le départ, l'abandon perdu ; les six usages basculés ; les anciennes routes retirées. | tests du serveur (une ligne gagnante rejouée perd ; un essai rechargé est compté) |
| B2 | Un essai par tour et par jour, les sceaux personnels, les sorties réparties. | tests du moteur |
| B3 | La manière des capitaines, partout. | `passe-bench` : les manières jouent différemment, la force reste |
| B4 | Le défi en un match, la pendule au départ commun, le laurier à trois défis, la cote visible. | tests du serveur, e2e du défi |
| B5 | Le Problème du jour généré : une année de positions vérifiées. | tests (une seule clef chacune) |
| B6 | L'écran : la Passe distante, l'essai engagé, tes sceaux, la manière, la cote. | e2e à 390 px et sur ordinateur, captures |

## 6. Ce qui n'est pas dans ce lot

L'économie (lot C), la refonte des écrans de la planche (lot D), le premier quart d'heure (lot E), la compagnie sûre (lot F) ; l'aide de lecture pendant les défis classés (gardée telle quelle, R5) ; la Passe à deux contre deux.

## 7. Tranché (14 novembre 2026)

1. **Un essai par tour et par jour** pour chaque Maison.
2. **Les sceaux sont personnels** : la tour va à la première Maison qui a brisé tous les siens.
3. **Le Problème du jour est généré**, un par jour, vérifié par le solveur.

## 8. État

Validé le 14 novembre 2026 ; fait :

- **B1** : les duels contre l'ordinateur sont des parties du serveur (`PlancheHub.duelStart`, `duelPlay`, `duelQuit`, une par joueur, oubliée après dix minutes sans pièce et alors perdue) ; l'essai est écrit au journal dès le début (`forceTry`, et les essais perdus des détroits noirs, de la Muda, des commandes et du problème du jour), la victoire par une commande `duelWon` ou `forced` ; la pièce du capitaine vient du pool de workers, avec une graine tirée par le serveur (aucune pour un problème : sa clef est unique). Une partie redemandée (un écran rechargé) reprend où elle était. Les anciennes routes qui rejouaient une liste de coups sont retirées.
- **B2** : un essai par tour et par jour, des sceaux à chaque Maison, des sorties réparties (deux capitaines au plus contre une tour).
- **B3** : chaque capitaine a sa manière, à sa tour comme dans ses sorties (`plancheCaptainStyle`) ; les rives longent les rangs du haut et du bas (docs/calibration.md).
- **B4** : le défi est un match (`plancheMatch`, commande `match`) ; la pendule attend les deux écrans (`/api/passe/room/:code/ready`, 30 s au plus) ; le laurier de la Passe demande trois défis (`defisMin`) ; la cote des deux Maisons avant, la tienne et son écart après.
- **B5** : `pnpm --filter @comptoirs/simulator passe-jour` (en trois tranches parallèles de trente minutes, puis fusionnées) a écrit une année de problèmes du jour (162 en deux coups, 183 en trois, 20 en quatre : ceux-là sont rares), chacun vérifié par le solveur (une seule clef, aucune victoire plus courte). Les commandes scellées gardent leurs vingt positions.
- **B6** : la Passe en mode distant (« Ton essai est engagé », la manière nommée, tes sceaux sur la fiche du duel), la cote sur l'écran du défi.
