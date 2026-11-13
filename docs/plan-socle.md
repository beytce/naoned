# Le socle : plan (lot A de l'audit d'ensemble du 13 novembre 2026)

*Proposé le 13 novembre 2026, après la validation par le porteur des décisions D1 à D8 et de l'ordre des lots de `docs/audit-2026-11-13/00-synthese.md`. Sources : rapports `08-qa-securite.md` et `09-architecte.md` (et `03`, `04`, `05` pour les points qui les touchent). Critère : une lagune de 48 joueurs actifs sous 10 % d'un cœur, aucune lecture au-delà de 200 ms, aucun champ secret dans ce que reçoit un joueur. **Validé le 13 novembre 2026** avec les deux recommandations du § 6.*

## 1. Le problème à régler

Le serveur ne tient pas une lagune active, et il en dit trop :

- **il dit tout à tout le monde** : chaque lecture renvoie l'état brut des 48 Maisons, les ruses secrètes des ports comprises (R8 Q1) ; la réponse grossit avec le temps (39 à 86 ko, R9 A7) ;
- **chaque geste fait tout relire à tous** : une poussée par geste, deux lectures complètes par joueur (R9 A1 : 48 joueurs, un geste par minute, 62 % d'un cœur, un geste à 4,5 s au pire) ;
- **les duels figent le serveur** : chaque duel rejoué et chaque sortie de capitaine jouée dans la boucle d'événements, 1 à 4,6 s chacun (R9 A2-A3, R8 Q3) ; une sortie due peut même être jouée deux fois (R9 A6) ;
- **quelques bords cèdent** : un don au phare de « toString » donne des points sans rien donner (R8), un JSON mal formé répond 500, une montée de ligue coupée au mauvais moment perd la Maison (R8) ;
- **l'ancien jeu pèse** : la page d'accueil charge tout l'ancien jeu (1,74 Mo), ses robots tournent et écrivent au grand livre sans joueur (R9 A9-A10) ; le client fuit la mémoire du GPU (R9 A8).

## 2. Ce que voit le joueur

Presque rien de neuf, et c'est voulu : **la planche répond vite**, un geste d'un autre se voit sans que le téléphone recharge tout, les sorties de 18 h ne figent plus rien, la page s'ouvre plus vite. Deux changements visibles :

- **les décrets disparaissent** de l'écran et de la fin de marée, et **les ligues sont gelées** (une seule ligue, pas de déménagement) : décision D2 ;
- les messages d'erreur deviennent des phrases (plus d'erreur JavaScript brute).

## 3. Les règles techniques

### 3.1 Une vue par joueur (A1)

- Le serveur ne renvoie plus l'état brut : **une vue construite pour le joueur**. Sa propre Maison en entier ; pour les autres, **ce qui se voit sur la planche** : position, niveau, titre, île (cases et ateliers, pour leur dessin), fils, flotte au mouillage (nombre), phare, pierres, compteurs du rang. **Jamais** : leurs ruses, la garde posée d'avance de leurs tours, leur entrepôt, leurs reliques et plans, leur bourse au denier près.
- Les passages : tenant, sceaux, péage ; la garde seulement pour son tenant.
- Un test vérifie, champ par champ, qu'aucun secret ne sort.

### 3.2 La poussée par version, la lecture en cache (A2)

- Chaque planche a un **numéro de version** (déjà là : celle du journal). La poussée en direct n'envoie plus « relis tout » mais **« version n »**, regroupée (au plus une par seconde et par lagune).
- Le client ne relit que si sa version est plus ancienne, et **au plus toutes les 2 s** ; la fiche de la Maison (`/api/maison`) ne se relit qu'après un geste du joueur ou une montée de niveau, jamais à la poussée d'un autre.
- Côté serveur, **la vue commune d'une version est construite une fois** (le masquage par joueur s'applique ensuite, au prix d'un parcours) ; les six requêtes en base de chaque lecture (compagnies, signes, saluts…) passent en cache court par lagune.

### 3.3 Les duels hors de la boucle (A3)

- Les rejeux de duels (forcer une tour, détroit noir, Muda, commande, Problème du jour, sortie au-devant, lieutenant d'un défi) partent dans un **pool de `worker_threads`** ; la requête attend sa réponse sans bloquer les autres.
- **Les sorties ne se jouent plus à la lecture** : à leur heure, un minuteur de la lagune les fait jouer dans le pool, puis écrit leur résultat au journal par une commande (`sortie` jouée par la garde). L'avance de la planche ne joue plus aucun duel (elle ignore les sorties non résolues) ; plus de double jeu.
- Le rejeu reste déterministe pour le journal : il ne fait qu'enregistrer un résultat calculé une fois. (Le lot B rendra les duels honnêtes : graine du serveur, coup à coup.)

### 3.4 Les bords (A4)

- `Object.hasOwn` dans `take`, `give`, `ships`, `defenses` et toute lecture par clé saisie ; **liste blanche des marchandises** à l'entrée des routes (les marchandises du thème).
- JSON mal formé : 400 ; erreurs du moteur traduites en phrases ; l'anti-doublon des alertes sur le titre et le chemin.
- Les ligues gelées (D2) suppriment la montée non atomique ; le déménagement reste au moteur, désactivé, avec une note pour le jour où elles reviendront (en deux phases).
- Le grand livre de la planche entre dans l'audit horaire de cohérence.

### 3.5 L'ancien jeu à l'écart (A5)

- La page d'accueil ne charge plus l'ancien jeu : l'application de l'empire, de la Porta et de la Terraferme est chargée à la demande (`/ancien`, `/admin`…).
- Ses tâches de fond (le monde qui tourne, ses robots, ses notifications) ne démarrent que si on le demande (`ANCIEN_JEU=on`) ; par défaut, elles dorment. Son code reste dans le dépôt pour l'instant ; sa suppression est un lot à part, plus tard, sur décision.

### 3.6 Le client léger (A6)

- Les géométries et matériaux des objets de la planche reconstruits (fils, tours, convoi, encre…) sont **libérés** à chaque reconstruction ; la boucle de rendu **s'arrête** quand rien ne bouge (rendu à la demande, relancé par la caméra, un geste ou une animation).
- But : la mémoire du GPU stable sur une heure, moins de 300 appels de dessin par image à la lagune.

### 3.7 Le banc de charge (A7)

- Un script de charge (`apps/server/bench/charge.mjs`) : 48 comptes dans une lagune, chacun lit à sa cadence et fait un geste par minute, avec une rafale ; il mesure le processeur, la latence des lectures et des gestes, la santé du serveur. Lancé en CI (version courte) et documenté.

### 3.8 Les règles du projet (A0, décision D8)

- `CLAUDE.md` réécrit pour la planche : les règles d'or de CADRAGE-v4 (le fil, la Passe à armes égales, rien qui ne se perde sans l'avoir choisi, tout se voit…), les règles techniques telles qu'elles sont vraiment (journal et instantanés, grand livre déduit des livres des Maisons, file par lagune, paramètres du thème recopiés dans `worlds.settings`), l'ancien jeu marqué comme tel ; CADRAGE-v4 marqué validé.

## 4. Les lots

| Lot | Contenu | Validation |
| --- | --- | --- |
| A0 | `CLAUDE.md` réécrit pour la planche ; CADRAGE-v4 validé ; décrets retirés, ligues gelées. | relecture |
| A1 | La vue par joueur, sans secrets. | tests du serveur (aucun champ secret, champ par champ) |
| A2 | La poussée par version, la lecture en cache, `/api/maison` à la demande. | banc de charge : 48 joueurs, un geste par minute, sous 10 % d'un cœur |
| A3 | Le pool de duels ; les sorties jouées par un minuteur et écrites au journal. | tests ; banc : aucune lecture au-delà de 200 ms pendant les sorties de 18 h |
| A4 | Les bords : `own()`, liste blanche, 400, erreurs en phrases, grand livre audité. | tests de sécurité des routes (les reproductions de R8) |
| A5 | L'ancien jeu chargé à la demande, ses tâches endormies par défaut. | poids de la page d'accueil (cible : sous 600 ko) ; e2e de l'ancien jeu toujours verts avec `ANCIEN_JEU=on` |
| A6 | Le client léger : libération des géométries, rendu à la demande. | mesure sous Chromium : mémoire GPU stable sur une heure de jeu simulée |
| A7 | Le banc de charge, en CI. | le banc lui-même ; `docs/calibration.md` § La charge |

## 5. Ce qui n'est pas dans ce lot

Les duels honnêtes (lot B), l'économie (lot C), les douze systèmes et la semaine (lot D), le premier quart d'heure et le retour (lot E), la compagnie sûre (lot F), la seconde instance (étape 2 de la cible de R9), la suppression du code de l'ancien jeu.

## 6. Tranché (13 novembre 2026)

1. **L'ancien jeu est endormi** : chargé à la demande, ses tâches de fond arrêtées par défaut ; sa suppression viendra dans un lot à part.
2. **On voit des autres ce qui se voit sur la planche** : jamais leur entrepôt, leurs ruses, leur garde, leurs reliques, ni leur bourse au denier près.

## 7. État

Validé ; lots à venir.
