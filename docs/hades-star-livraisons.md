# Le système de livraison de Hades' Star, et sa transposition dans Fondaco

> **Mis à jour le 1er novembre au soir** : la recherche complète et la livraison saut par saut sont dans `docs/hades-star/` (commencer par `00-synthese.md`). Ce qui suit sur les tournées planifiées n'a plus cours, ni les commandes tirées des besoins de la région : depuis `docs/hades-star/05-commandes.md`, une commande ne porte que sur ce que font les ateliers de la maison et prend une place de soute.

*Recherche du 1er novembre 2026, à la demande du porteur. On garde les principes de Hades' Star, pas son apparence : la direction artistique reste « Lagune » (`docs/design.md`).*

## 1. Ce que fait Hades' Star

### Les cargaisons (shipments)
- **Production** : chaque planète colonisée (les lunes et les stations de commerce aussi) produit des cargaisons au fil du temps, jusqu'à un plafond par planète. Chaque lune a son propre plafond.
- **Destination et valeur** : chaque cargaison va vers une planète précise. Sa valeur dépend du niveau et du type de la planète d'origine ; des modules l'augmentent ou la réduisent.
- **Les lunes** partagent les valeurs de leur planète. Le revenu horaire de la planète se répartit entre elle et ses lunes.
- **La distance** s'affiche en UA dans la liste des cargaisons. Selon les joueurs, elle compte surtout pour le carburant (hydrogène), et peu ou pas pour la paie.
- **Les cartes du jeu** : les étoiles jaunes sont la base, et leurs planètes produisent les cargaisons. Certaines cargaisons, plus rares, rapportent des cristaux.

### Le transport
- **Le principe** : on ne fait que deux choses avec un transport. On l'envoie d'une planète à une autre, et on choisit ce qu'il emporte. Le reste est automatique.
- **Le geste** : on sélectionne le transport, puis on touche une planète. Le transport s'y rend, charge les cargaisons, puis on l'envoie vers chacune de leurs destinations, où elles sont livrées à l'arrivée.
  - *Exemple d'un guide joueur* : la planète A produit des cargaisons pour B, C et D. On les charge et on dirige le transport vers B, puis C, puis D.
- **La soute** limite le nombre de cargaisons. Des modules l'agrandissent.
- **L'information** : la recherche « Shipment Computer » ajoute sur chaque planète, lune, station et vaisseau un indicateur du nombre de cargaisons par destination.
- **L'automatisation** : le « Shipment Relay », un objet payant, envoie les cargaisons des planètes désignées pendant un temps. Selon un joueur, la valeur envoyée égale la production horaire de chaque planète.
- **Les modules de commerce** :
  - Trade Boost : un bonus de paie, ajouté à la valeur de base ;
  - Trade Burst : le même bonus, après un certain nombre de livraisons ;
  - un module pour stations, qui livre toutes les cargaisons à l'arrivée à une station de commerce, quelle que soit leur destination.
- **Les stations de commerce** produisent et reçoivent des cargaisons comme une planète, mais n'augmentent pas le stockage. Le wiki donne une production par jour selon leur niveau, de 1 500 au niveau 1 à 8 000 au niveau 5.

### Sources
- Wiki fandom : [Trade Modules](https://hades-star.fandom.com/wiki/Trade_Modules?oldid=6391), [Space Stations](https://hades-star.fandom.com/wiki/Space_Stations), [Objectives](https://hades-star.fandom.com/wiki/Objectives), [Transport Modules](https://hades-star.fandom.com/wiki/How_I_go_about_using_Autoshipment), [accueil du wiki](https://hades-star.fandom.com/wiki/Hades'_Star_Wiki).
- Guides : [Hades Star Basic Guide (Steam)](https://steamcommunity.com/sharedfiles/filedetails/?id=1944042871), [Walkthrough P1](https://hadesstarelite.wixsite.com/website/single-post/2017/09/29/Hades-Star-Walkthrough-P1), [DARK NEBULA Game Guide (TalkAndroid)](https://www.talkandroid.com/34946-hades-star-dark-nebula-game-guide/), [gameplay.tips](https://gameplay.tips/guides/3894-hades-star.html).
- Discussions de joueurs : [Steam 1](https://steamcommunity.com/app/755800/discussions/0/1639793203772933375), [Steam 2](https://steamcommunity.com/app/755800/discussions/0/1870622978440442784), [Upgrading planets](https://steamcommunity.com/app/755800/discussions/0/3193619419613921327/), [TV Tropes](https://tvtropes.org/pmwiki/pmwiki.php/VideoGame/HadesStar), [NamuWiki](https://en.namu.wiki/w/Hades'%20Star).
- **Non lus** : le blog officiel ([Shipment changes in Dark Nebula](https://blog.hadesstar.com/2023/02/shipment-changes-in-dark-nebula.html)) et le guide de Prima Games n'étaient pas accessibles depuis la session (réseau). Les pages du wiki sont anciennes et partiellement en brouillon, et les chiffres de joueurs ne sont pas officiels.

## 2. La transposition dans Fondaco (arbitrages du porteur, 1er novembre 2026)

| Hades' Star | Fondaco |
| --- | --- |
| Une planète produit des cargaisons pour d'autres planètes | **Une ville passe des commandes**, que ses comptoirs voisins remplissent |
| La valeur suit le niveau et le type de la planète | La paie suit le prix de la marchandise, **la taille de la ville** et **la distance au comptoir** |
| Plafond de cargaisons par planète | De 1 à 5 commandes par ville selon sa taille, **renouvelées toutes les 2 h** ; ce qui n'est pas livré disparaît, sans coût |
| La soute d'un transport | La capacité d'un véhicule, niveau de modèle compris |
| On envoie le transport de planète en planète | **Une tournée** : on charge au comptoir pour plusieurs villes, le véhicule les visite dans l'ordre (1 à 10 min), puis rentre |
| L'indicateur du Shipment Computer | **Un anneau autour de chaque ville**, qui se remplit avec ses commandes, et une pastille du nombre de commandes en attente |
| La taille de la planète | **La taille de la bulle** de la ville (de 1, un bourg, à 5, une capitale) |
| Les secteurs ouverts de proche en proche | **Les cases achetées une à une**, voisines des siennes ; une côte rend voisines les côtes à une ou deux cases de mer |

**Les gestes** :
- toucher une ville montre ses commandes, et « Charger » sur chacune ;
- toucher un véhicule (une pastille autour de son comptoir) commence une tournée et éclaire les villes à sa portée ;
- glisser un véhicule sur une ville l'ouvre directement ;
- « Partir », l'action en or, lance la tournée.

**Un seul métier** (1er novembre) : la mer, les gisements et les expéditions sont retirés ; les commandes, livrées en tournées, sont le cœur du jeu, et une ville commande davantage quand le comptoir qui la sert monte de niveau.

**Les différences voulues** :
- les commandes sont **propres à chaque joueur**, et sans course entre joueurs ;
- elles sont **tirées des besoins de la région**, même si aucun comptoir voisin ne fabrique la marchandise : cela donne leur sens aux transferts entre comptoirs et au marché ;
- **jouer plus rapporte plus** (on remplit plus de périodes), mais **l'absence ne coûte rien** : on ne punit jamais l'absence (CLAUDE.md).

## 3. Où c'est dans le code

- **Le moteur** :
  - `packages/engine/src/empire/orders.ts` : les commandes, les tournées, leur règlement à la lecture ;
  - `map.ts` : les cases achetées (`unlockCell`, `buyableOf`, `sectorCost`) et le champ des comptoirs.
- **L'écran** :
  - `apps/web/src/empire/map/OrdersPanel.tsx` : les commandes et la tournée ;
  - `EmpireMap.tsx` : l'anneau, les véhicules qu'on touche ou qu'on glisse, la tournée qui glisse sur la carte.
- **Le simulateur** : `apps/simulator/src/empire/bots.ts`, `deliverOrders`.
