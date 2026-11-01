# Les commandes des villes, comme les cargaisons de Hades' Star

*Plan du 1er novembre 2026, d'après la troisième série de questions au porteur. Il remplace les vagues de commandes (`orders.maxWaves`) et le chargement automatique au départ. Le saut par saut reste (chantier 1, `00-synthese.md`).*

## 1. Le principe

- **La règle** : dans Hades' Star, une planète se remplit de cargaisons. Chacune est un objet indivisible qui a une destination, une valeur et **une place de soute**.
  - Le transport, à quai, voit la liste des cargaisons.
  - On touche une cargaison pour la charger.
  - On envoie ensuite le transport de planète en planète.
  - Les cargaisons se livrent à l'arrivée.
- **Dans Fondaco** :
  - chaque **ville** se remplit de **commandes** ;
  - le **véhicule**, à quai à un comptoir, voit les commandes des villes que ce comptoir dessert ;
  - on les charge depuis le **stock du comptoir** ;
  - on les livre saut par saut.

## 2. Les règles (décisions du porteur)

| Sujet | Décision |
| --- | --- |
| Une commande | Un lot fixe et indivisible (« 20 draps pour Padoue, 340 ducats ») qui prend **1 place** de soute |
| Les marchandises | Seulement ce que sait produire **un atelier de la maison**, n'importe où, matière ou produit fini |
| La taille du lot | Elle dépend de la marchandise : `orders.lots[good]`, sinon la quantité qui vaut `orders.lotDucats` au prix de référence |
| La paie | Prix de référence × quantité, plus la prime des commandes (`premiumBps`) ; les effets « prime des commandes » de la maison s'ajoutent à la livraison |
| Le remplissage | Au fil de l'eau : une commande toutes les `everyMinutes[taille]`, jusqu'au plafond `cap[taille]` |
| Le plafond | Il dépend de **la taille de la ville** seulement. Une ville pleine ne reçoit rien de neuf, et la suivante vient un intervalle après qu'une place se libère ; rien ne se perd en l'absence |
| La cadence | Une journée, comme dans Dark Nebula : le plafond est atteint en 12 h environ |
| Ce que voit le véhicule | Les commandes des villes **desservies par le comptoir** où il est |
| Un stock insuffisant | La commande est **visible mais grisée** (« stock 12/20 ») |
| La liste | Plate, avec un tri : plus chères, moins chères, plus proches, plus lointaines |
| Charger | **Toucher = charger** : la marchandise quitte le stock, la commande quitte sa ville (et les autres listes) |
| Décharger | À un comptoir, à quai : la marchandise entre dans le stock de **ce** comptoir, la commande retourne à sa ville |
| Le trajet | Saut par saut, comme aujourd'hui ; à l'arrivée dans une ville, ses commandes à bord sont livrées et payées |
| Après la livraison | Le véhicule **reste sur place** ; on le renvoie à un comptoir pour recharger |
| Toucher une ville | Ses commandes en attente, son plafond, la prochaine dans X min (lecture seule) |
| La carte | Une pastille du nombre de commandes et un anneau qui se remplit jusqu'au plafond |
| La soute | Elle se compte en **places**. Chaque type a ses places de base (`vehicles[type].places`), et chaque niveau du modèle en ajoute `vehicleLevels.placesPerLevel` |
| Les modules | Le Livre de route, le Fouet du charretier et l'Estafette sont **retirés** pour l'instant. L'Agrandissement de soute (`capacity`) et la prime (`orderBonus`) restent |

## 3. Les chiffres de Venise (à caler au simulateur)

- **Le plafond par taille** (1 à 5) : 3, 4, 6, 8, 10.
- **Une commande toutes les** 240, 180, 120, 90 et 72 minutes : chaque taille se remplit en 12 h.
- **Un lot** vaut environ 40 ducats au prix de référence.
- **La prime** est de 15 %.
- **Les places** :
  - mulet 2, charrette 3, chariot 5, burchio 6 ;
  - +1 place par niveau du modèle.

## 4. Ce qui change dans le code

- **Le moteur** :
  - `orders.ts` réécrit : les commandes de chaque ville sont tirées paresseusement à la lecture (`cityOrdersAt`), de façon déterministe (`draw`) ;
  - `moves.ts` : `empireLoadOrder` et `empireUnloadOrder` remplacent `empireLoad` et `empireUnload`, la livraison se fait à l'arrivée, le chargement automatique et les trois modules sont retirés ;
  - une reprise unique (`retireWaves`) remet au stock la cargaison en vrac d'avant et efface les vagues.
- **Le serveur** : les schémas des deux nouvelles actions.
- **L'écran** :
  - le panneau du véhicule : la liste triable, toucher pour charger, la soute en commandes ;
  - le panneau de la ville : en lecture seule ;
  - la pastille sur la carte.
- **Le simulateur** : `deliverOrders` compte les commandes au fil de l'eau ; calibration à 24 mois.

## 5. Hors périmètre (IDEAS.md)

- **Le bonus de lot** : livrer plusieurs commandes à la même ville d'un coup.
- **Les commandes de la distance** : une prime pour les villes lointaines.
- **Les modules à rendre** : un ramassage en route, à la manière du Shipment Computer.
