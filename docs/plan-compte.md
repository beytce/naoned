# Le compte et la Maison qui reste : plan (étape 1 de l'audit du 11 novembre 2026)

*Proposé le 11 novembre 2026, à la suite de l'audit `docs/audit-progression-2026-11-11/00-audit.md` (§ 4 et § 11, étape 1) et des décisions du porteur : Prestige plafonné, assaut sur le port de l'autre, planches de 48 Maisons, **un compte dès l'arrivée**. **À valider avant tout code.***

## 1. Le problème à régler

Aujourd'hui, on joue sur la planche en invité, avec un cookie. Tout vit dans la mémoire du serveur : un déploiement efface îles, caisses, fils et marée, et l'argent ne passe pas par le grand livre. Au neuvième joueur, on ne peut plus que regarder.

Après cette étape :

- **on entre avec un compte**, et on retrouve sa Maison sur n'importe quel appareil ;
- **rien ne se perd** : un redéploiement rend à chacun sa Maison, ses fils, son île et sa caisse, au denier près ;
- **chaque denier passe par le grand livre**, chaque marchandise par les mouvements de stock (règles du projet) ;
- **une planche pleine en ouvre une autre**, au lieu de faire regarder le nouveau venu.

## 2. Ce que voit le joueur

| Moment | Ce qu'il voit |
| --- | --- |
| **Il arrive sur le site** | La planche en fond, voilée, et une fiche de papier : le logo, une phrase (« Une Maison de commerce à Venise. Tire tes fils, bâtis ton île, bats ton rival. »), un champ pour l'adresse mail, une touche rouge « Recevoir mon lien ». Selon la toile de l'audit visuel. |
| **Il ouvre le lien reçu** | Il revient sur la planche, connecté. À la première fois, il choisit le nom de sa Maison (le jeu en propose trois) et la couleur de son pavillon. |
| **Il entre** | Les cases de la planche tombent en place et sa Maison apparaît, avec son premier but : « Bâtis une sablière sur ton île ». |
| **Il revient demain, sur un autre appareil** | Le même lien de connexion, la même Maison, là où il l'a laissée. Ses fils ont travaillé pendant son absence. |
| **La planche est pleine** | Il est placé sur une nouvelle planche, ouverte pour lui ; les Maisons de l'ordinateur y tiennent les places libres. |

Le profil (nom, pavillon, déconnexion, suppression du compte) est derrière le médaillon du coin, comme dans l'ancien jeu.

## 3. Les règles

- **Une Maison par compte et par planche.** Elle appartient au compte : elle ne retourne plus jamais à l'ordinateur pour inactivité. Si le compte est supprimé, la Maison redevient une Maison de l'ordinateur.
- **Les comptes de l'ancien jeu** sont les mêmes : un joueur de `/ancien` qui se connecte reçoit sa Maison sur la planche.
- **Les planches** : chaque planche est un monde (`worlds`, avec son `world_id`), sur le thème de Venise d'aujourd'hui (8 Maisons). Quand toutes ses Maisons sont prises par des comptes, la suivante s'ouvre. L'étape 2 passera chaque planche à 48 Maisons.
- **Le temps** : la planche avance à la lecture, comme aujourd'hui, et les Maisons de l'ordinateur jouent à leurs heures.

## 4. La technique

- **La persistance** reprend le mécanisme éprouvé du monde de l'ancien jeu (`apps/server/src/game/world.ts`) :
  - un instantané de l'état (`world_states`), réécrit de temps en temps ;
  - le journal des gestes depuis cet instantané (`world_commands`), qu'on rejoue au chargement ;
  - le grand livre et les mouvements de stock écrits **dans la même transaction** que le geste ;
  - le relais au déploiement : la nouvelle instance prend la main, l'ancienne s'arrête à sa prochaine écriture.
- **Le grand livre** : chaque geste écrit ses mouvements (ce qu'on paie pour l'île, le péage). Les ventes des fils, qui se comptent par tranches de dix minutes, s'écrivent **regroupées par Maison à chaque écriture** (un geste, un instantané, et au moins toutes les dix minutes) (« les fils de Ca' Morosini ont vendu pour 12 300 ducats entre 14 h et 15 h »). Au chargement, l'invariant est vérifié : ce que tiennent les caisses, plus ce qui a été détruit et dépensé, égale ce qui a été frappé, et égale la somme du grand livre.
- **La table des places** : `planche_seats` (le monde, la Maison, le compte, la date d'arrivée). Nouvelle table : `schema.ts` puis migration générée.
- **Le temps réel** : le hub de l'ancien jeu (`live.ts`, WebSocket) prévient chaque joueur quand sa planche change, au lieu de l'interroger toutes les deux secondes.
- **Les invités** : la planche ne les accepte plus. Le laboratoire local (`?lab=planche&seul`) reste, pour le développement et les essais.

## 5. Les lots

| Lot | Contenu | Vérification |
| --- | --- | --- |
| C1 | **La planche en base** : chaque planche est un monde ; instantané, journal des gestes, relais au déploiement ; le serveur recharge les planches au démarrage. | Tests du serveur : on joue, on arrête, on recharge, l'état est identique ; deux instances, une seule écrit |
| C2 | **Le grand livre de la planche** : les gestes et les ventes regroupées par heure passent au grand livre et aux mouvements de stock ; l'invariant au chargement. | Tests : après une semaine jouée, la somme du grand livre égale les caisses au denier près |
| C3 | **Le compte obligatoire** : la planche n'accepte plus que des comptes ; `planche_seats` ; une Maison par compte ; la planche suivante s'ouvre quand l'une est pleine. | Tests du serveur : neuf comptes, deux planches ; un compte retrouve sa Maison |
| C4 | **L'entrée à l'écran** : la fiche de connexion sur la planche voilée, le retour du lien, le choix du nom et du pavillon, le profil derrière le médaillon. | Parcours e2e à 390 px et sur ordinateur, du mail à la première sablière |
| C5 | **Le temps réel** : la planche se met à jour par WebSocket ; plus d'interrogation toutes les deux secondes. | Parcours à deux navigateurs : le fil de l'un apparaît chez l'autre en moins d'une seconde |
| C6 | **L'épreuve du redéploiement** : on joue, on redémarre le serveur, on rejoue. | Parcours e2e : après redémarrage, la Maison, l'île, les fils et la caisse sont là, au denier près |

Fusion sur la branche principale à la fin du lot C6 : à partir de là, plus rien ne se perd sur le site.

## 6. Ce qui n'est pas dans cette étape

Les planches de 48 Maisons et les sestieri (étape 2), le Prestige et les niveaux (étape 3), la connexion par Google ou Apple, la discussion (étape 7), le retrait de l'ancien jeu (étape 10).

## 7. À trancher

1. **La remise à zéro de la planche actuelle** : les Maisons jouées depuis le dernier déploiement sont en mémoire seulement. Je propose de **repartir d'une planche neuve** au lancement de cette étape : rien ne peut être repris proprement.
2. **Le nom de la Maison** : je propose de reprendre le pseudo du compte comme nom par défaut (« Ca' » suivi du pseudo), modifiable une fois sans frais, comme dans l'ancien jeu.

## 8. État

*Validé par le porteur le 11 novembre 2026 (« Ok lance »), avec les deux points du § 7 : une planche neuve au lancement, et « Ca' » suivi du pseudo comme nom de Maison.*

| Lot | État |
| --- | --- |
| C1 | fait : le hub de la planche joue des commandes (`PlancheCommand` : prendre une place, la rendre, tirer, reprendre, péage, île, passage forcé), écrites au journal avant la réponse ; `apps/server/src/game/plancheStore.ts` tient la planche dans `worlds` (statut `planche`, à part des mondes du jeu), son instantané dans `world_states`, ses commandes dans `world_commands`, la relève au déploiement ; instantané à l'arrêt ; l'horloge de la planche reprend où elle s'était arrêtée. 5 tests (rechargement par le journal seul, par instantané et journal, à l'arrêt, relève entre deux instances). Essai réel : un fil tiré survit à un redémarrage normal et à un arrêt brutal (`kill -9`). |
| C2 | fait : chaque Maison tient son livre dans le moteur (ventes, péages payés et reçus, île), 1 test ; chaque écriture (geste, instantané, et toutes les dix minutes) porte au grand livre ce qui a bougé depuis la précédente, en partie double (`planche:towns`, `planche:tolls`, `planche:burnt`, `planche:isle`, `planche:mint`, `house:<id>`), dans la même transaction ; 3 tests : après une semaine la somme du grand livre égale chaque caisse au denier près, rien n'est écrit deux fois quand un geste et un instantané se croisent, ni après un redémarrage |
| C3 | fait : la planche n'accepte plus que des comptes (401 sinon) ; table `planche_seats` (migration 0035), une Maison par compte et pour de bon, nommée « Ca' » et le pseudo ; `PlancheLagoons` tient toutes les planches, place un nouveau compte sur la première qui a une Maison libre et ouvre la lagune suivante quand toutes sont pleines (Murano, Burano, Torcello…) ; 4 tests (refus sans compte, même Maison à chaque visite, neuf comptes et deux lagunes, même Maison après un redémarrage). L'écran de la planche en ligne attend le lot C4 pour se connecter. |
| C4 | fait : la fiche d'entrée sur la planche voilée (l'adresse, puis le code ou le lien du mail), `/connexion` ouvre la planche (l'ancien jeu : `&ancien`), la fondation de la Maison à la première visite (nom, couleur et figure du pavillon, par les armoiries du compte ; le vermillon reste celui de « à toi »), le profil derrière le médaillon (nom, pavillon, l'ancien Fondaco, déconnexion) ; `apps/web/src/porcellana/planche/Entree.tsx` ; parcours `e2e:compte` à 390 px et sur ordinateur, du mail à la première sablière, captures dans `docs/compte-captures/` |
| C5 | fait : après chaque geste enregistré, le hub prévient les joueurs de sa planche, et le canal `/api/live` de l'ancien jeu leur pousse `{"type":"planche"}` ; la planche se relit aussitôt, et ne s'interroge plus que toutes les 6 s quand le canal est ouvert (2 s sinon) ; 1 test du hub ; parcours `e2e:compte` : le message arrive chez l'autre joueur en 591 ms, geste compris (le dessin suit plus lentement dans le navigateur de test, sans carte graphique) |
| C6 | fait : le parcours `e2e:compte` joue sur une base sur disque, arrête le serveur net (`SIGKILL`, sans instantané) puis normalement (`SIGTERM`) ; chaque fois la Maison, sa sablière, son fil et ce qu'elle a dépensé sont retrouvés à l'identique, et le grand livre tombe juste |
