# Hades' Star : les cargaisons, le transport et la refonte Dark Nebula

*Recherche du 1er novembre 2026. Suite de `docs/hades-star-livraisons.md`, plus mince. On s'inspire des mécaniques et des gestes. On ne reprend ni l'art, ni les noms, ni les textes, ni les visuels. La direction artistique reste « Lagune » (`docs/design.md`).*

**Avertissement sur la méthode.** Depuis la session, aucune page n'a pu être ouverte directement. Le blog officiel, le wiki fandom, Steam, Reddit, NamuWiki, web.archive.org et hadesstar.com étaient tous refusés par le réseau (§ 5). Tout ce qui suit vient des extraits que le moteur de recherche renvoie de ces pages. Chaque fait porte donc sa source, mais il faudra relire les pages elles-mêmes avant d'en faire une règle. Les tableaux du wiki sont parfois tronqués dans ces extraits.

Vocabulaire :
- **HS** : Hades' Star « classique » (l'application d'origine, 2017).
- **DN** : *Dark Nebula*, la refonte. Annoncée sur le blog en 2022-2023, sortie en application à part le 30 octobre 2023.
- **UA** : l'unité de distance du jeu. Le wiki précise que c'est une unité arbitraire, pas une vraie unité astronomique.

---

## 1. Ce que fait Hades' Star

### 1.1 Les cargaisons : d'où elles viennent

- **Qui les produit.** Les planètes colonisées et les stations de commerce produisent des cargaisons. Chacune a une destination (une autre planète) et une valeur. [Reward Shipments (wiki)][rs], [Walkthrough P1][wt]
- **La valeur.** Elle dépend du niveau et du type de la planète d'origine. Des modules l'augmentent ou la réduisent. [Transport Modules (wiki)][tm-old]
  - La paie est en crédits. Plus rarement, c'était des cristaux, la monnaie premium. [Reward Shipments][rs]
- **La distance.** Elle s'affiche en UA. Selon un joueur, c'est surtout un indicateur de carburant : plus c'est loin, plus on brûle d'hydrogène. Aucune source ne dit qu'elle change la paie. [Steam 1][st1]
- **Les plafonds (HS).** Selon un joueur, une planète gardait au plus 15 cargaisons, et chaque lune autant. [Steam : upgrading planets][st-up]
  - Le revenu horaire de la planète se répartit entre elle et ses lunes. [même source][st-up]
  - En HS, on pouvait pousser une planète jusqu'à 2 fois son plafond en y déchargeant des cargaisons. [Dark Nebula (wiki)][dn-wiki]
- **Le rythme (HS).** Des tableaux de joueurs donnent un rendement maximal par heure selon le palier de planète. Les chiffres se contredisent : 256, 330 ou 421 crédits par heure au palier 1. [Dragon Army : économie][dragon]
- **Les stations de commerce (HS).** Elles se posent dans un secteur vide. Elles créent et acceptent des cargaisons de grande valeur vers et depuis vos planètes. [Space Stations (wiki)][ss]
  - Plafond de cargaisons et rendement par jour : 15 et 1 500 au niveau 1, 40 et 10 000 au niveau 6, 80 et 25 000 au niveau 10.
  - On en a 3 au plus. Il faut une planète de niveau 13.
  - Elles ne relèvent pas le plafond de crédits ni d'hydrogène.
- **Les cristaux.** Un pack payant crée une cargaison de 75 cristaux par jour, soit 8 cargaisons et 600 cristaux sur la semaine. Les planètes qui l'attendent s'allument en vert. Il faut y envoyer un transport, la charger et la livrer. [Support officiel][support], [PlayStation Store : Crystal Shipments][ps-crystal]
  - En DN, les planètes ne créent plus de nouvelles cargaisons de cristaux. [Dark Nebula (wiki)][dn-wiki]
- **Les reliques et artefacts.** Le transport sort aussi les artefacts des Étoiles rouges. Dans les Étoiles blanches, il porte des reliques, avec des modules à part (Relic Drone, Dispatch). [Transport (wiki)][tr], [Steam : tri des cargaisons][st-sort]

### 1.2 Ce qui change avec Dark Nebula

**Le diagnostic des développeurs** (blog, février 2023) [Shipment changes][blog-ship] :
- Le relais automatique (Shipment Relay) demandait de jouer à un autre mode (les Étoiles bleues) pour marcher.
- La livraison à la main donnait de gros bonus, ce qui rendait le relais inutile pour les joueurs sérieux.
- **Le volume** (le nombre de cargaisons créées par jour dans le système) doit devenir un paramètre équilibré qui monte lentement avec la progression.
  - En HS, coloniser une planète faisait bondir ce volume d'un coup. C'était une grande source de frustration en début de partie.
- Les cargaisons stockées sur les planètes restent une source clé de crédits quotidiens. Avec la progression, une part croissante de ce revenu vient des **bonus** de livraison, pour pousser à améliorer bâtiments et technologies.

**L'hydrogène devient la contrainte** (blog, septembre 2022) [Hydrogen changes][blog-h] :
- Presque tout l'hydrogène récolté va à deux activités : les cargaisons de l'étoile jaune (la base) et les Étoiles rouges.
- La plupart des modules ne consomment plus d'hydrogène. Les modules de transport sont l'exception.
- Le plafond d'hydrogène vise 1,5 à 2 jours de production, pour 40 à 50 minutes de jeu par jour. [Dark Nebula Prepping (wiki)][prep]
- Pour un transport, l'hydrogène consommé est **proportionnel à sa capacité totale**, avec des économies d'échelle qui récompensent l'amélioration. [même source][prep]

**Les crédits** (blog, décembre 2022) [Credits changes][blog-cr] :
- Le revenu quotidien est réparti entre cargaisons, objectifs, Étoiles bleues et Étoiles rouges.
- La valeur de base des cargaisons baisse, surtout aux hauts niveaux.

**Ce qui est sorti** (changelog d'octobre 2023 et wiki) [Changelog DN][blog-cl], [Dark Nebula (wiki)][dn-wiki] :
- Planètes et stations de commerce ont désormais **une rotation de cargaisons sur 24 heures**.
- Leur plafond de cargaisons est **très relevé**.
- On ne peut plus dépasser ce plafond en déchargeant (fin du « 2 fois » de HS).
- Plus de nouvelles cargaisons de cristaux.
- On ne peut plus livrer ni miner dans l'étoile jaune d'un autre joueur.
- Toutes les planètes montent jusqu'au niveau 64.
- Un bonus permanent de +25 % sur la valeur des cargaisons. (Wiki seulement. Contexte inconnu, peut-être lié à un pack.)
- Le relais : 1 jour d'activité dès le niveau 1, **10 cargaisons par heure** dès le niveau 1, améliorations bien moins chères.
- Modules supprimés : Impulse, Offload, Suppress, Entrust, Shipment Beam, Recall. Le wiki ajoute Trade Boost, remplacé par Cargo Repair.

**Le mode d'emploi officiel** (blog, octobre 2023) [Upgrade guide][blog-ug] :
- Les cargaisons doivent rester **facultatives**, surtout en début de partie.
- « Livrer, c'est maximiser le bonus sans faire exploser sa consommation d'hydrogène. »
- Améliorer les modules à bonus (Shipment Computer, Trade Burst, Shipment Drone) au moins au niveau du scanner d'Étoile rouge, et s'en servir chaque jour.
- Améliorer Rush le plus possible : il joue sur le carburant du transport.
- Le relais est très simple, mais aux hauts niveaux il peut vider d'un coup toute la réserve d'hydrogène du jour.
- La livraison à la main est repensée comme un défi de gestion : de meilleurs bonus et moins d'hydrogène que le relais. Le relais livre tout en moins d'une minute, avec un niveau de bonus au choix. [Shipment changes][blog-ship]

**Après DN** : la 2025.2 baisse le prix en hydrogène du relais pour ses niveaux 1 à 6. Les artefacts ou reliques en cours de chargement retournent à la planète si le transport est détruit. [Changelog 2025.2][blog-2025]

### 1.3 Le transport

| Niveau | Soute de base | Hydrogène /100 UA | Prix de fabrication | Source |
| --- | --- | --- | --- | --- |
| 1 | 1 | 2 (1,8 sur une autre page) | 250 | [Spaceships][ships], [Transport][tr] |
| 2 | 2 | 3,6 | — | [Transport][tr], NamuWiki |
| 3 | 3 | — | — | [Spaceships][ships] |
| 4 | 4 | — | — | [Spaceships][ships] |
| 5 | 6 | — | — | [Spaceships][ships] |
| 6 | 18 en DN (8 en HS) | 11,0 (HS) | 60 000 (HS) | [Spaceships][ships], [Transport][tr] |
| 7 (DN) | 60 | 50 | 2 000 000 (amélioration : 31 500 000, 10 jours) | [Spaceships][ships] |

- **Seul le transport brûle de l'hydrogène pour se déplacer.** Les mineurs paient un saut fixe. [Gameplay Tips][tips], [Miner][miner]
- **La vitesse : les sources se contredisent.**
  - La page Transport donne 576 UA par minute (9,6 UA/s) à tous les niveaux. [Transport][tr]
  - La page Spaceships donne une vitesse maximale de 60 UA/s dans l'étoile jaune et 24 UA/s dans une Étoile rouge. [Spaceships][ships]
  - Selon TV Tropes, traverser tout un système prend quelques minutes, et les plus courts sauts font déjà des centaines d'UA. [TV Tropes][tvt]
- **Une soute à demi vide gaspille l'hydrogène** (conseil du wiki). [Gameplay Tips][tips]
- Un joueur résume le dilemme : un petit transport porte peu, un gros perd en rendement d'hydrogène. [NamuWiki][namu]

### 1.4 Les modules du transport

Les chiffres sont ceux de la page « Dark Nebula Prepping » du wiki, sauf mention contraire. Elle se dit incomplète. [Prep][prep], [All Modules][allmods]

- **Cargo Bay Extension** (agrandissement de soute).
  - De +1 place au niveau 1 à +40 au niveau 15 (22 au niveau 13, 26 au 14).
  - Hydrogène ajouté : de 1,6 à 30 par 100 UA.
  - Coût : de 1 000 crédits et 1 minute au niveau 1, à 25 000 000 crédits, 60 000 plans et 20 jours au niveau 15.
- **Shipment Computer** (ordinateur de cargaison).
  - Ramasse seul, aux escales intermédiaires, les cargaisons dont la destination est une escale suivante.
  - Ajoute un bonus aux cargaisons de crédits : 5 % au niveau 1, 10 % au niveau 2, jusqu'à 40 % au niveau 7 (table tronquée au-delà). DN : bonus « très augmentés ».
  - Coût : niveau 1, 1 plan, 1 000 crédits, 1 minute ; niveau 2, 4 plans, 2 000 crédits, 10 minutes. Les plans viennent des artefacts de commerce de niveau 2 et plus.
  - En HS, une recherche du même nom ajoutait aussi sur chaque planète un compteur de cargaisons par destination. [Trade Modules (wiki, ancien)][tm-old]
  - Selon des joueurs de HS, il augmentait la valeur de base au ramassage, au lieu d'ajouter un bonus à la livraison. [Steam : waypoints][st-wp]
- **Rush** (hâte). Le module change de rôle en DN : il **réduit l'hydrogène** et accélère le transport quand celui-ci porte des cargaisons pour son **escale immédiate**.
  - Rabais d'hydrogène : 2 % à 20 % (étoile jaune), 5 % à 80 % (Étoile rouge).
  - Vitesse : +10 % à +80 %. Par relique portée : +6 % à +35 %.
  - Coût : de 1 000 à 25 000 000 crédits, de 1 minute à 20 jours.
  - En HS : +10 % de vitesse fixe dans l'étoile jaune. [NamuWiki module][namu-mod]
- **Trade Burst** (coup de commerce).
  - Compte les livraisons faites pendant qu'il est actif. Passé un seuil, chaque cargaison de crédits suivante a un bonus.
  - Dure 20 minutes, se recharge en 10 heures, seuil de 10 cargaisons.
  - Vaut aussi pour les cargaisons ramassées par le Shipment Computer.
  - DN : bonus augmentés, et son niveau compte pour le drone. Peu d'usage dans l'étoile jaune (changelog).
- **Shipment Drone** (drone de livraison).
  - Un drone autonome qui ramasse et livre seul.
  - Il ne passe d'un secteur à l'autre que par une Warp Lane active. Une Warp Lane dure 16 heures en DN.
  - Au lancement, il reçoit un plein d'hydrogène : de 1 000 au niveau 1 à 2 000 au niveau 9. Il brûle de 6 à 24 par 100 UA.
  - Il meurt quand son plein est vide ou à la fin de son minuteur.
  - Bonus à la livraison : la somme des modules installés, plus son bonus propre.
  - Les tables se contredisent : 10 places et 8 % au niveau 1 (ancienne table, jusqu'à 900 % et 56 par 100 UA), ou 6 places en DN.
  - Il remplace en 2018 un « Shipment Autopilot ».
- **Supprimés en DN** [Removed Modules][removed], [Legacy mods][legacy] :
  - **Trade Boost** : un bonus pendant une durée, rechargé en 23 heures. Au niveau 8 : +20 % (« +100 (+20) »). Il s'additionne à Trade Burst.
  - **Offload** : à l'arrivée à une station de commerce, livre tout, quelle que soit la destination, à paie réduite pour ce qui n'y allait pas.
  - **Shipment Beam** : charge d'un coup les cargaisons les moins chères d'un avant-poste du système. Recharge 5 minutes. Pas d'artefacts.
  - **Entrust** : téléporte la cargaison vers un autre transport à portée.
  - **Recall** : saute vers une station de commerce du système.
- **Dispatch.** Déplacé au niveau 8 des Étoiles rouges, avec des dégâts de zone à l'arrivée. En HS, version Étoile blanche : le transport saute vers la planète qui a le plus de reliques, la plus lointaine en cas d'égalité. Préparation de 4 heures par relique au niveau 1, 12 minutes au niveau 12, recharge de 5 jours. [Changelog DN][blog-cl], [Steam][st-disp]
- **Relic Drone.** De 1 à 15 places à reliques. De 6 h 15 à 2 h par relique. 10 minutes de mise en place. [All Modules][allmods]

### 1.5 Le relais (automatisation)

- **En HS** : on l'active pour un temps et on choisit les secteurs. Il envoie toute cargaison de ces secteurs, sauf les cristaux, quelle que soit la destination. Il se payait en éclats bleus gagnés dans les Étoiles bleues. [Steam 1][st1]
  - Selon un joueur : 5 planètes à 5 cargaisons par heure, cela fait 25 cargaisons par heure. [Steam 1][st1]
- **En DN** [Space Stations][ss], [Dark Nebula (wiki)][dn-wiki] :
  - 10 cargaisons par heure, 1 jour d'activité.
  - Hydrogène par cargaison : 5 au niveau 1, 80 au niveau 6.
  - Bonus maximal : 0 % au niveau 1, 120 % au niveau 6.
  - Les livraisons du relais ne comptent pas pour le succès de livraison. [TrueAchievements][ta]

### 1.6 Les bonus de lot (HS, selon un joueur)

- Livrer plusieurs cargaisons d'un coup au même endroit donne un bonus sur tout le lot : 0 % pour 1, 3 % pour 2, 6 % pour 3, 9 % pour 4. [Steam : tri des cargaisons][st-sort]
- Chaque cargaison ramassée en route gagnait 8 % de sa valeur (Shipment Computer de HS). [Steam 1][st1]

---

## 2. Le geste et l'interface, pas à pas

Chaque étape est marquée **[confirmé]** (une source la décrit), **[probable]** (la demande d'origine la décrit, aucune source ne l'infirme) ou **[non trouvé]**.

1. **Toucher le transport.** Il se sélectionne. **[confirmé]**
   - Un panneau en bas montre son nom, sa soute (x/y) et l'endroit où il stationne, avec des flèches pour passer au vaisseau suivant ou précédent. **[probable]** : aucune source lue ne décrit ce panneau.
2. **Le déplacer.** On fait glisser depuis le vaisseau jusqu'à une planète. Sur PC : un clic droit pose l'escale, un second la confirme. Le glisser du mobile marche aussi sur PC. **[confirmé]** [Steam : Waypoints?][st-wp2]
3. **L'infobulle.** Pendant le glisser, à la destination : distance en UA, temps de trajet, hydrogène consommé. **[confirmé]** [Gameplay Tips][tips]
4. **Le départ.** Une fois la destination posée, le vaisseau attend **10 secondes**. Pendant ce temps on peut **partir tout de suite**, **annuler**, ou **poser l'escale suivante**. **[confirmé, une seule source]** (extrait d'un wiki, probablement NamuWiki)
   - « Annuler » retire la dernière escale posée.
   - Il y a 1 à 2 secondes de latence. Annuler juste avant l'arrivée peut ne pas prendre.
5. **En route.** On peut poser une escale « pour juste après l'arrivée ». Le vaisseau y repart dès qu'il touche la première. **[confirmé]** [Gameplay Tips][tips]
   - La barre de temps restant est **[probable]**.
6. **Le chargement automatique.** Quand le transport touche une planète qui est une escale, il charge autant qu'il peut des cargaisons destinées à **l'une de ses escales suivantes**. **[confirmé]** [Steam : waypoints][st-wp], [Steam : Tips][st-tips]
   - Erreur classique : rien n'est chargé, parce que la première planète n'a aucune cargaison pour la deuxième escale. [Steam : waypoints][st-wp]
   - Le geste type : poser l'escale de ramassage, puis les escales de livraison **avant** que le transport n'arrive.
7. **Le déchargement automatique.** À l'arrivée à la destination d'une cargaison, celle-ci est livrée et payée. Le gain s'affiche (« +100 (+20) » : la base, puis le bonus). **[confirmé]** [Legacy mods][legacy]
8. **Le chargement à la main et le tri.** Le menu de tri des cargaisons propose : plus chères, moins chères, plus proches, plus lointaines. **[confirmé]** [Steam : tri][st-sort]
   - Les joueurs demandaient de regrouper par destination, parce que trier était fastidieux. [Suggestion Page (wiki)][sugg]
9. **Lire la carte.**
   - Avec le compteur du Shipment Computer, chaque planète, lune, station et vaisseau montre le nombre de cargaisons par destination. **[confirmé, HS]** [Trade Modules (ancien)][tm-old]
   - Les planètes qui attendent une cargaison de cristaux sont surlignées en vert. **[confirmé]** [Support][support]
   - DN ajoute une liste des planètes dans la fenêtre de l'étoile jaune. **[confirmé]** [Dark Nebula (wiki)][dn-wiki]
10. **Décharger ailleurs (« hub »).** Des joueurs déchargent sur une planète centrale de grande capacité, puis redistribuent, pour gagner hydrogène et temps. **[confirmé, HS]** [Autoshipment (blog wiki)][auto]
    - En DN, on ne dépasse plus le plafond de la planète. Le hub reste possible, borné. **[probable]**
    - Une vidéo de 2023-2024 décrit une méthode « par hubs » en DN. Seule sa description a été vue. [YouTube : Khaos][yt-khaos]

**Non trouvé** : un compteur ou une pastille du nombre total de cargaisons en attente sur une planète, en dehors du Shipment Computer ; une file entre plusieurs vaisseaux qui visent la même planète ; une formule de vitesse.

---

## 3. Ce qui est incertain

- **Aucune page n'a été lue en entier.** Tout vient d'extraits de recherche. Les tableaux du wiki sont souvent tronqués.
- **La vitesse** : 576 UA/min ou 60 UA/s, soit un facteur 6 d'écart. Peut-être deux versions, ou un vaisseau différent.
- **La soute en DN** : 1, 2, 3, 4, 6, 18, 60 selon le niveau ; la ligne « DrkNeb » est peut-être une variante.
- **Le drone** : 6 ou 10 places, et des bonus de 8 % ou d'une valeur fixe de 5 au niveau 1.
- **Le Shipment Computer** : un bonus ajouté à la livraison (wiki DN), ou une valeur de base relevée au ramassage (joueurs de HS).
- **Le plafond de cargaisons en DN** : « très relevé », sans chiffre trouvé.
- **La rotation de 24 heures** : on ignore si les cargaisons non livrées disparaissent ou restent jusqu'au plafond.
- **La distance** compte pour l'hydrogène. Rien n'établit qu'elle compte pour la paie.
- **Le +25 % permanent** : contexte inconnu.
- **Les 10 secondes de départ** : une seule source, non vérifiée.
- **Le panneau du bas** (nom, soute x/y, « stationné à », flèches) : non décrit par les sources lues.
- **Le bonus de lot** (0/3/6/9 %) : la parole d'un joueur de HS.
- **Les modules supprimés en 2023.1** : le wiki parle d'une version « 2023.1 » ; le blog les place dans DN. Probablement la même chose.

---

## 4. Transposition proposée pour Fondaco

Rappel de l'existant (`packages/engine/src/empire/orders.ts`, `venice1450.empire.ts`) :
- chaque ville servie passe 1 à 5 commandes par période de **2 heures**, selon sa taille ;
- 1 unité par point de taille au moins ;
- la paie est le prix de référence, avec +15 % de prime, +5 % par taille au-delà de la première et +8 % par secteur de distance ;
- un véhicule avance de 15 unités de carte par minute ;
- une tournée a 8 étapes au plus, puis rentre au comptoir.

Ce que DN nous apprend, et ce qu'on en ferait. Chaque proposition est à valider (CLAUDE.md : mode plan, simulateur 24 mois, `docs/calibration.md`).

### 4.1 Le rythme des commandes : une rotation longue, un plafond

- **Constat HS → DN.** Les développeurs sont passés d'une production horaire à une rotation de 24 heures avec un gros plafond. Raison : un rythme court force à revenir souvent, et le volume doit monter lentement.
- **Notre risque.** Une période de 2 heures où le non-livré disparaît récompense celui qui revient toutes les 2 heures. Ce n'est pas un coût d'absence au sens strict, mais c'est un manque à gagner fort.
- **Proposition A** (à simuler) : les commandes **s'accumulent** jusqu'à un plafond par ville.
  - Une ville reçoit sa fournée toutes les 2 heures, comme aujourd'hui.
  - Elle en garde au plus **6 périodes** (12 heures) : plafond = 6 × `perSize[taille − 1]` commandes.
  - Ce qui dépasse le plafond n'est simplement plus demandé, sans coût.
  - Effet : deux visites par jour suffisent pour tout prendre ; jouer plus souvent ne rapporte pas plus que le plafond.
- **Proposition B** (plus simple) : un carnet du jour par ville, renouvelé à heure fixe (comme la rotation de 24 h), de `perSize × 6` commandes.
- Paramètres dans `worlds.settings.orders` : `capPeriods` (6 par défaut). Jamais en dur.

### 4.2 Le volume suit ce qu'on bâtit, doucement

- **Constat.** DN a voulu supprimer les bonds de volume à chaque colonie.
- **Pour nous.** Acheter une case qui ajoute une capitale (taille 5) d'un coup ferait le même bond.
- **Proposition** : une ville nouvellement servie monte à sa pleine commande en 3 jours (1/3, 2/3, 3/3). Le carnet grandit avec le niveau du comptoir qui la sert (déjà décidé le 1er novembre).

### 4.3 La contrainte : le temps du véhicule, pas un carburant

- **Constat.** En DN, l'hydrogène est la contrainte. Il est proportionnel à la capacité du transport, avec une économie d'échelle.
- **Pour nous.** Une nouvelle monnaie de carburant ajouterait une jauge à gérer, et un stock qui se remplit pendant l'absence ressemble à une ressource « à ne pas perdre ».
- **Proposition** : garder comme contraintes **le temps du véhicule** (occupé pendant la tournée) et **le stock du comptoir**.
  - Option, si le simulateur montre des tournées trop rentables : un **péage par tournée** en deniers, passé par `ledger_entries`, de 1 % de la valeur chargée par secteur parcouru. On le paie au départ, jamais pendant l'absence.
- **La leçon à garder** : « une soute à demi vide gaspille ». La paie d'une tournée doit favoriser les véhicules bien remplis (voir 4.5).

### 4.4 Le geste : glisser, lire, 10 secondes, partir

Calqué sur le flux de HS, en Lagune (astres, une seule action en or) :

1. **Toucher un véhicule** (jeton autour de son comptoir). La feuille du bas montre :
   - son nom et son modèle ;
   - sa charge `x / y` ;
   - « au comptoir de … » ou « en route vers … » ;
   - des flèches ‹ › pour passer au véhicule suivant du même comptoir.
2. **Glisser du véhicule vers une ville.** Un trait pointillé suit le doigt. À l'arrivée sur une ville à portée, une étiquette montre :
   - le temps de trajet (« 3 min ») ;
   - la distance en **lieues** (pas en UA) ;
   - ce que la ville commande et ce que le comptoir a en stock (marques `GoodsMark`, pleines ou creuses) ;
   - la paie prévue de cette étape.
   - Une ville hors de portée se grise et refuse le lâcher.
3. **Lâcher.** La ville devient la première étape. Le chargement se fait seul : tout ce que la ville commande et que le comptoir a, dans la limite de la soute.
4. **Un compte à rebours de 10 secondes** sur le jeton (un arc qui se vide). Pendant ce temps :
   - **glisser vers une autre ville** ajoute une étape (comme l'escale suivante de HS) ;
   - **« Partir »** (l'action en or) lance tout de suite ;
   - **« Annuler »** retire la dernière étape posée.
   - À zéro, le véhicule part seul.
   - Le serveur ne reçoit qu'une commande `startTour`, au départ. Le compte à rebours est purement client.
5. **En route.** Le jeton glisse sur la carte. Un arc autour montre le temps restant jusqu'à l'étape suivante. On peut toujours ajouter une étape après la dernière (comme l'escale « juste après l'arrivée »).
   - Il faudra une commande moteur `extendTour`, à valider.
6. **À chaque ville**, la livraison est payée à la lecture (production paresseuse, déjà le cas avec `settleTours`). Un « +12 d » vert d'eau s'élève de la ville. Le bonus s'écrit à part, comme le « +100 (+20) » de HS.
7. **Le retour.** Le véhicule rentre au comptoir ; ce qui n'a pas été livré revient au stock (déjà le cas).

### 4.5 La paie : des bonus lisibles, pas de puissance vendue

| Idée de HS | Proposition Fondaco | Chiffre de départ |
| --- | --- | --- |
| Bonus de lot (0/3/6/9 %) | **Commande pleine** : une commande livrée en entier en une étape | +10 % sur cette commande |
| Shipment Computer (ramasser en route) | **Passer par un comptoir** : une étape peut être un autre de ses comptoirs, où l'on charge pour les villes suivantes | Pas de bonus, juste le geste |
| Rush (plus rapide si la cargaison est pour l'étape suivante) | **Course directe** : une tournée à une seule ville va plus vite | +25 % de vitesse |
| Trade Burst (bonus après 10 livraisons en 20 min) | Non retenu : il pousse à des séances serrées | — |
| Trade Boost (bonus pendant une durée) | Non retenu | — |
| Distance seulement pour le carburant | **On garde la prime de distance** (+8 % par secteur) : chez nous, le temps est le coût, la paie doit le compenser | 800 pb (existant) |

- Tous ces taux en points de base, dans `worlds.settings.orders`.
- Aucun ne s'achète. L'abonnement peut montrer des choses (une prévision de paie plus détaillée), jamais en ajouter (CLAUDE.md, CADRAGE-v3 § 10).

### 4.6 L'automatisation : le commis, moins bon que la main

- **Constat.** DN fait du relais une vraie alternative : instantané, mais plus cher en hydrogène et avec un bonus réglable.
- **Pour nous** (`autoTour` existe déjà) : un **commis** bâti au comptoir, jamais vendu.
  - Il lance seul une tournée quand un véhicule est libre.
  - Il ne prend pas les bonus de 4.5 (commande pleine, course directe).
  - Il perd 20 % de la prime de 15 % (soit 12 % au lieu de 15 %).
  - Effet : l'absent gagne quand même ; le présent gagne un peu plus.

### 4.7 Lire la carte

- **L'anneau** autour de chaque ville (déjà décidé) reprend le compteur par destination de HS.
- **Une pastille** sur chaque comptoir : le nombre de commandes qu'il peut remplir avec son stock. C'est la question que le joueur se pose.
- **Dans la feuille d'une ville**, un tri : « mieux payées » ou « plus proches », comme le menu de tri de HS. Regrouper par marchandise d'emblée, pour éviter le tri fastidieux dont se plaignaient les joueurs.

### 4.8 Ce qu'on ne prend pas

- Les cargaisons payantes (les cristaux de HS) : interdit chez nous.
- La perte de cargaison quand le véhicule est détruit : seule la Porta peut perdre un véhicule (CLAUDE.md).
- Le drone qui meurt à court de carburant : une mécanique de carburant, écartée en 4.3.
- La livraison chez les autres joueurs : supprimée par DN, et nos commandes sont privées.

---

## 5. Sources

**Lues par extraits de moteur de recherche seulement** (ouverture directe refusée par le réseau de la session) :

- Blog officiel, `blog.hadesstar.com` :
  - [Shipment changes in DARK NEBULA (février 2023)][blog-ship]
  - [Hydrogen changes in DARK NEBULA (septembre 2022)][blog-h]
  - [CREDITS changes in DARK NEBULA (décembre 2022)][blog-cr]
  - [DARK NEBULA changelog (octobre 2023)][blog-cl]
  - [Dark Nebula upgrade guide (octobre 2023)][blog-ug]
  - [Hades' Star 2025.2 detailed changelog][blog-2025]
  - [Module changes in DARK NEBULA (octobre 2022)](https://blog.hadesstar.com/2022/10/module-changes-in-dark-nebula.html)
- Wiki fandom, `hades-star.fandom.com` :
  - [Dark Nebula][dn-wiki], [Dark Nebula Prepping][prep], [Transport][tr], [Spaceships][ships], [Transport Modules][tm], [All Modules][allmods], [Removed Modules][removed], [Hades Legacy Mod Pages (pre 2023.1)][legacy], [Space Stations][ss], [Reward Shipments][rs], [Gameplay Tips][tips], [Miner][miner], [The Suggestion Page][sugg], [Trade Modules (ancienne version)][tm-old], [Autoshipment (blog d'utilisateur)][auto]
- Steam, discussions : [Steam 1][st1], [Upgrading planets][st-up], [Waypoints / Shipment Computer][st-wp], [Waypoints?][st-wp2], [Cargo sorting][st-sort], [Tips or Advice?][st-tips], [Dispatch][st-disp]
- Autres :
  - [Support officiel hadesstar.com][support]
  - [PlayStation Store : Crystal Shipments][ps-crystal]
  - [NamuWiki : Hades' Star][namu], [NamuWiki : modules][namu-mod]
  - [TV Tropes][tvt]
  - [Dragon Army : économie][dragon]
  - [Walkthrough P1][wt]
  - [TrueAchievements : forum][ta]
  - [YouTube : Khaos Shipping Method][yt-khaos] (description seulement), [YouTube : 2026 Shipping Method by Dukat][yt-dukat] (titre seulement)

**Non joignables** (ouverture directe tentée, refusée) : blog.hadesstar.com, hades-star.fandom.com (y compris `?action=raw`), steamcommunity.com, old.reddit.com, web.archive.org, en.namu.wiki, hadesstar.wiki, hadesstar.com, hades.st, dragonarmy.webador.com, un miroir redlib de r/HadesStar, le proxy translate.goog. Pour les relire, il faut autoriser ces domaines dans les réglages réseau de la session.

**Non trouvées** : HadesSpace (citée par le wiki comme référence plus récente), le tableur communautaire de Dahlb, des transcriptions de vidéos.

[blog-ship]: https://blog.hadesstar.com/2023/02/shipment-changes-in-dark-nebula.html
[blog-h]: https://blog.hadesstar.com/2022/09/hydrogen-changes-in-dark-nebula.html
[blog-cr]: https://blog.hadesstar.com/2022/12/credits-changes-in-dark-nebula.html
[blog-cl]: https://blog.hadesstar.com/2023/10/hades-star-dark-nebula-changelog.html
[blog-ug]: https://blog.hadesstar.com/2023/10/dark-nebula-upgrade-guide.html
[blog-2025]: https://blog.hadesstar.com/2025/10/hades-star-20252-detailed-changelog.html
[dn-wiki]: https://hades-star.fandom.com/wiki/Dark_Nebula
[prep]: https://hades-star.fandom.com/wiki/Dark_Nebula_Prepping
[tr]: https://hades-star.fandom.com/wiki/Transport
[ships]: https://hades-star.fandom.com/wiki/Spaceships
[tm]: https://hades-star.fandom.com/wiki/Transport_Modules
[allmods]: https://hades-star.fandom.com/wiki/All_Modules
[removed]: https://hades-star.fandom.com/wiki/Removed_Modules
[legacy]: https://hades-star.fandom.com/wiki/Hades_Legacy_Mod_Pages_(pre_2023.1)
[ss]: https://hades-star.fandom.com/wiki/Space_Stations
[rs]: https://hades-star.fandom.com/wiki/Reward_Shipments
[tips]: https://hades-star.fandom.com/wiki/Gameplay_Tips
[miner]: https://hades-star.fandom.com/wiki/Miner
[sugg]: https://hades-star.fandom.com/wiki/The_Suggestion_Page
[tm-old]: https://hades-star.fandom.com/wiki/Trade_Modules?oldid=6391
[auto]: https://hades-star.fandom.com/wiki/User_blog:Sparrow81/How_I_go_about_using_Autoshipment._by_Ag3nt_Phatty
[st1]: https://steamcommunity.com/app/755800/discussions/0/1639793203772933375
[st-up]: https://steamcommunity.com/app/755800/discussions/0/3193619419613921327/
[st-wp]: https://steamcommunity.com/app/755800/discussions/0/1846946102848498303/
[st-wp2]: https://steamcommunity.com/app/755800/discussions/0/1648792158820544025/
[st-sort]: https://steamcommunity.com/app/755800/discussions/0/1648792158817799200/
[st-tips]: https://steamcommunity.com/app/755800/discussions/0/2944710017702805410/
[st-disp]: https://steamcommunity.com/app/755800/discussions/0/5729109343953423535
[support]: https://hadesstar.com/en/support.html
[ps-crystal]: https://store.playstation.com/en-us/product/UP8377-CUSA40384_00-0753798413988961
[namu]: https://en.namu.wiki/w/Hades'%20Star
[namu-mod]: https://en.namu.wiki/w/Hades'%20Star/%EB%AA%A8%EB%93%88
[tvt]: https://tvtropes.org/pmwiki/pmwiki.php/VideoGame/HadesStar
[dragon]: https://dragonarmy.webador.com/tips-and-tricks/economy
[wt]: https://hadesstarelite.wixsite.com/website/single-post/2017/09/29/hades-star-walkthrough-p1
[ta]: https://www.trueachievements.com/forum/viewthread.aspx?tid=1619951
[yt-khaos]: https://www.youtube.com/watch?v=1NxEd6ldUYk
[yt-dukat]: https://www.youtube.com/watch?v=JJFIwqL1N5g
