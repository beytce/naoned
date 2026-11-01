# Hades' Star : les vaisseaux, les modules et la recherche, et ce qu'on peut en tirer pour Fondaco

*Recherche du 1er novembre 2026. On s'inspire des mécaniques seulement : aucun nom, texte, image ni élément d'Hades' Star ne passe dans Fondaco. Les descriptions ci-dessous sont reformulées. Contexte côté Fondaco : `docs/hades-star-livraisons.md`, `docs/plan-porta.md`, `docs/CADRAGE-v3.md` (§ 3.3, § 3 bis, § 12 quater).*

**D'où viennent les chiffres.** Le wiki fandom, le blog officiel, Steam et Reddit n'étaient pas joignables depuis la session (réseau filtré, voir § 6). La source principale est donc le dépôt public **userXinos/HadesSpace** (le site communautaire « Hades' Space »). Son dossier `parser/raw/` contient les **tables de données extraites du jeu**, dans leur version actuelle, *Dark Nebula*, sortie fin 2023 : `capital_ships.csv`, `modules.csv`, `projectiles.csv`, `spacebuildings.csv`, `artifacts.csv`, `globals.csv` et les textes anglais (`loc_strings_en.csv`). La copie lue date du 30 octobre 2026 (commit `000ce38`). Ce sont des données brutes : les colonnes sont nommées, mais leurs **unités ne sont pas toujours documentées**. Les lectures incertaines sont signalées au § 4.

**Conventions de lecture**
- Les **durées** des tables sont en secondes ; on les convertit ici (1 j = 86 400 s).
- Les **durées d'effet** sont stockées ×10 : `EffectDurationx10 = 100` vaut 10 s.
- Les **distances** sont en unités internes du jeu : la portée standard d'une arme est de 1 200.
- « **Niv. de RS** » est le niveau d'étoile rouge (le PvE coopératif) dont les artefacts donnent les premiers plans du module.
- Les valeurs sont celles du **PvE** (étoiles rouges) quand le jeu distingue le PvE, le PvP et les étoiles de corporation.

---

## 1. Les vaisseaux

### 1.1 Les trois coques du joueur

Le joueur possède trois types de vaisseaux : le transport (commerce), le mineur (hydrogène) et le cuirassé (combat). Chacun a **7 niveaux de modèle** (« design »). Monter le modèle est **permanent et s'applique à tous les vaisseaux du type** : on n'améliore pas un vaisseau, on améliore son plan. Chaque niveau **ajoute un emplacement de module**, et ajoute aussi de la coque pour le cuirassé ou de la soute pour le mineur. Plus le modèle est haut, plus **construire** un vaisseau neuf coûte cher.

Il n'y a **pas de temps de construction** d'un vaisseau dans les tables : on le paie, il est là. Le temps est dans l'**amélioration du modèle**.

| Type | Ouvert au niveau de joueur | Vitesse (système perso / étoile rouge) | Remarque |
| --- | --- | --- | --- |
| Transport | 1 | 600 / 240 | Consomme de l'hydrogène au trajet, de 10 au niv. 1 à 250 au niv. 7 par 5 000 de distance |
| Mineur | 2 | 1 200 / 240 | Ne consomme rien |
| Cuirassé | 3 | 660 / 250 | Se répare hors combat (`HealRate` de 350 à 833, unité inconnue) |

*La vitesse ne change pas avec le niveau.*

#### Transport

| Niv. | Prix d'un vaisseau neuf (crédits) | Amélioration du modèle (crédits) | Durée de l'amélioration | Emplacements (cumul) | Soute de base | Hydrogène / 5 000 de distance |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 250 | — | — | 1 commerce | 1 | 10 |
| 2 | 1 000 | 2 000 | 2 min | 2 commerce | 2 | 18 |
| 3 | 5 000 | 60 000 | 1 j | 3 commerce | 3 | 26 |
| 4 | 100 000 | 300 000 | 3 j | 4 commerce | 4 | 34 |
| 5 | 200 000 | 1 000 000 | 7 j | 5 commerce | 6 | 50 |
| 6 | 800 000 | 7 000 000 | 10 j | 6 commerce | 18 | 120 |
| 7 | 2 000 000 | 31 500 000 | 10 j | 7 commerce | 60 | 250 |

*Monter le modèle du niveau 1 au niveau 7 coûte environ 39,9 M de crédits et 31 jours. La colonne `JobCapacity` donne la soute de base : 18 puis 60 aux derniers niveaux, un saut à confirmer. Le module « extension de soute » ajoute ensuite de 1 à 40 places.*

#### Mineur

| Niv. | Prix neuf | Amélioration | Durée | Emplacements (cumul) | Réservoir d'hydrogène | Période de minage (plus bas = plus vite) |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 400 | — | — | 1 minage | 20 | 800 |
| 2 | 800 | 2 000 | 1 min | 2 | 200 | 400 |
| 3 | 8 000 | 50 000 | 1 j | 3 | 400 | 250 |
| 4 | 100 000 | 250 000 | 3 j | 4 | 800 | 125 |
| 5 | 200 000 | 800 000 | 7 j | 5 | 1 200 | 50 |
| 6 | 800 000 | 6 000 000 | 10 j | 6 | 1 600 | 37 |
| 7 | 2 000 000 | 24 000 000 | 10 j | 7 | 2 000 | 32 |

#### Cuirassé

| Niv. | Prix neuf | Amélioration | Durée | Emplacement ajouté | Emplacements (cumul) | Coque (PV) |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 500 | — | — | arme + bouclier | 1 arme, 1 bouclier | 4 200 |
| 2 | 1 000 | 2 000 | 5 min | soutien | + 1 soutien | 5 000 |
| 3 | 10 000 | 140 000 | 1 j | drone | + 1 drone | 6 000 |
| 4 | 100 000 | 400 000 | 3 j | soutien | 2 soutiens | 7 000 |
| 5 | 400 000 | 1 500 000 | 7 j | soutien | 3 soutiens | 8 000 |
| 6 | 1 000 000 | 8 000 000 | 10 j | soutien | 4 soutiens | 9 000 |
| 7 | 2 000 000 | 28 000 000 | 10 j | drone | 1 arme, 1 bouclier, 4 soutiens, 2 drones | 10 000 |

**À retenir**
- La coque ne fait que **×2,4** du niveau 1 au niveau 7. La puissance vient des **modules**, pas de la coque.
- Le cuirassé n'a jamais **qu'une arme et qu'un bouclier**. Ce sont les soutiens et les drones qui se multiplient.
- Un cuirassé neuf porte une **arme de départ faible**, qu'on est invité à remplacer.
- Depuis *Dark Nebula*, le transport et le mineur n'ont plus d'emplacement de soutien : leurs emplacements sont tous de leur métier (blog officiel, d'après les résumés de recherche).

### 1.2 Le chantier (Shipyard) et la limite de flotte

Le chantier se bâtit une fois. Son niveau donne la **taille totale de la flotte**, tous types confondus.

| Niv. du chantier | Prix (crédits) | Durée | Flotte maximale |
| --- | --- | --- | --- |
| 1 | 800 | 5 s | 4 |
| 2 | 4 000 | 1 min | 5 |
| 3 | 10 000 | 30 min | 7 |
| 4 | 20 000 | 8 h | 8 |
| 5 | 80 000 | 24 h | 10 |
| 6 | 200 000 | 48 h | 12 |
| 7 | 500 000 | 72 h | 13 |
| 8 | 1 000 000 | 96 h | 14 |
| 9 | 2 000 000 | 120 h | 15 |
| 10 | 5 000 000 | 120 h | 16 |

Autres réglages utiles :
- **Une étoile rouge** limite le nombre de vaisseaux par secteur (`MaxShipsInRSSector = 50`).
- On peut **reconfigurer** ses modules (`AllowModuleRefit`) et garder **trois configurations** enregistrées par type (`MaxRebuildShipDesignsPerType = 3`).

### 1.3 Les drones

Les drones ne sont pas des vaisseaux qu'on construit. Ce sont des **unités temporaires lancées par un module** de l'emplacement « drone » du cuirassé, ou par certains modules de commerce. Leurs statistiques suivent le niveau du module.

| Drone | PV (niv. 1 → 15) | Vie | Rôle |
| --- | --- | --- | --- |
| Réparateur | 1 000 | 40 s | À la fin de sa vie, répare les cuirassés alliés à portée. S'il est détruit avant, il répare davantage. Montant lu : de 450 à 1 750 |
| Leurre | 500 → 4 000 | 40 s | Sans arme : les ennemis à portée changent de cible pour lui |
| Lance-roquettes | 300 | 48 s | Lent ; tire des roquettes sur l'ennemi le plus proche (de 400 à 12 000 dégâts par roquette) |
| Tourelle laser | 1 000 → 3 800 | 30 s | Fixe ; un laser à 3 cibles, chacune montant en puissance |
| Tourelle à rayon chaîné | — | 180 s | Fixe ; se lie aux autres rayons chaînés pour en augmenter les dégâts et la portée |
| Escouade, paire téléportée | — | 180 s | Modules de très haut niveau (RS 11 et 12), 5 niveaux seulement |
| Drone « gardien ennemi » | — | 120 s | Une copie de gardien ennemi, qui attaque tout le monde, son lanceur compris |
| Drone de livraison (commerce) | 1 | 20 min | 10 places ; ramasse et livre seul les cargaisons tant qu'il a de l'hydrogène (de 1 000 à 2 000) |
| Drone à reliques (commerce, corporation) | 500 | 1 h | De 4 à 60 places ; charge les reliques d'une planète et les rapporte |

*Pour comparer, dans l'étoile rouge : la sentinelle ennemie a 600 PV, le gardien 5 600, l'intercepteur 4 500, le destructeur 8 000 et le colosse 15 000. L'intercepteur va à 325, plus vite qu'un transport (240) : d'où la menace sur les transports.*

---

## 2. Les modules par catégorie

### 2.1 Ce qui vaut pour tous les modules

- **15 niveaux** pour presque tous (`MaxModuleLevel = 15`). Les modules ajoutés en dernier n'en ont que 5, 10 ou 12.
- **Le déblocage** : un module devient recherchable quand on a trouvé ses premiers plans, dans un artefact du niveau de RS indiqué. On le recherche ensuite une fois, et il équipe autant de vaisseaux qu'on veut.
- **Le coût standard d'un niveau** (la plupart des modules) :

| Niv. | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Crédits | 1 k | 2 k | 3 k | 5 k | 10 k | 20 k | 40 k | 60 k | 100 k | 250 k | 500 k | 1 M | 2 M | 10 M | 25 M |
| Durée | 1 min | 10 min | 1 h | 4 h | 1 j | 2 j | 4 j | 6 j | 8 j | 10 j | 12 j | 14 j | 16 j | 18 j | 20 j |
| Plans | 1 | 4 | 15 | 30 | 60 | 120 | 300 | 600 | 1 200 | 2 500 | 5 000 | 10 000 | 25 000 | 50 000 | 100 000 |

  Un module au niveau 15 demande donc environ **39 M de crédits, 111 jours de recherche et 195 000 plans**.

- **Les variantes du coût** :
  - les modules de commerce de revenu (ordinateur de cargaison, salve commerciale, drone de livraison) plafonnent à 8 M au niveau 15 ;
  - les modules de RS 6 et plus commencent à **1 jour** au lieu de 1 minute ;
  - les modules de RS 10 à 12 coûtent des millions dès le niveau 1.
- **Les modules activés** ont un **temps de recharge** (`ActivationDelay`) qui **ne change presque jamais avec le niveau** : c'est l'**effet** qui monte (durée, montant, rayon). Exception notable : la téléportation, dont la recharge descend de 90 s à 10 s.
- **En bataille**, les recharges vont de 120 à 300 s. Dans une étoile rouge d'une dizaine de minutes, un module se lance donc **2 à 5 fois**.

### 2.2 Commerce (emplacements du transport)

| Module | Niv. de RS | Type | Effet (reformulé) | Courbe (niv. 1 → 15) |
| --- | --- | --- | --- | --- |
| Extension de soute | 1 | Passif | Des places de cargaison en plus, mais le trajet consomme plus d'hydrogène | +1 → +40 places ; carburant +8 % → +150 % |
| Ordinateur de cargaison | 2 | Passif | Ramasse en route les cargaisons d'une étape intermédiaire qui vont vers une étape suivante du trajet, avec une prime sur celles-ci. Affiche aussi sur chaque planète le nombre de cargaisons par destination | Prime de +5 % → +200 % |
| Réparation par la cargaison | 3 | Activé | Répare d'un coup un cuirassé allié en **consommant un artefact** porté | 600 → 10 000 PV |
| Ruée | 3 | Passif | Plus vite et moins gourmand quand on porte une cargaison pour l'étape suivante. Dans l'étoile rouge, quand on porte un artefact | Système perso : +10 % de vitesse, −2 % → −20 % d'hydrogène. Étoile rouge : +10 % → +80 % de vitesse |
| Salve commerciale | 4 | Activé | Pendant 20 min, après 10 livraisons, chaque nouvelle livraison rapporte une prime | Prime de +5 % → +200 % ; recharge de 10 h |
| Furtivité | 4 | Activé | Le vaisseau ne peut plus être visé directement ; seuls les dégâts de zone le touchent | 4 s → 60 s ; recharge de 180 s |
| Drone de livraison | 5 | Activé | Lance un drone qui livre seul, avec les versions débloquées des deux modules précédents | Prime de livraison +8 % → +900 % |
| Prolongation de l'étoile rouge | 6 | Activé | Recule la supernova en **consommant un artefact** | +2 s → +150 s |
| Drone à reliques | 7 | Activé | Corporation : charge et rapporte les reliques d'une planète | 4 → 60 places ; chargement plus court |
| Expédition (téléportation) | 8 | Activé | Se téléporte vers la planète qui a le plus de cargaisons. Dans l'étoile rouge : vers celle qui a le moins d'artefacts. La préparation est proportionnelle à ce qu'il y a sur place | Préparation par cargaison de 5 s → 2 s (perso), de 40 s → 10 s (RS) ; recharge de 12 min |
| Roquette de cargaison | 9 | Activé | Une roquette lancée n'importe où, en **sacrifiant une cargaison** ou un artefact | 3 000 → 20 000 dégâts (5 niveaux) |

*Retirés ou cachés dans Dark Nebula : le bonus de commerce simple (remplacé par la réparation par la cargaison), le retour à une station, la livraison de tout à une station, le confier, et le rayon qui charge à distance.*

### 2.3 Minage (emplacements du mineur)

| Module | Niv. de RS | Type | Effet | Courbe |
| --- | --- | --- | --- | --- |
| Accélération du minage | 2 | Activé | Mine plus vite pendant 10 min ; recharge de 10 min | Perso : ×3 → ×18 ; RS : ×1,25 → ×10 |
| Réplicateur d'hydrogène | 3 | Passif | Un bonus d'hydrogène à la livraison | +3 % → +200 % |
| Accélération d'artefact | 3 | Activé | Ajoute un bonus de recherche à un artefact de l'étoile rouge, contre de l'hydrogène à bord | +5 % → +200 % ; 10 → 2 000 d'hydrogène |
| Minage à distance | 4 | Activé | Mine plusieurs champs d'astéroïdes du secteur à la fois, chacun plus lentement | 2 → 20 champs |
| Genèse | 4 | Activé | Crée 4 champs d'astéroïdes temporaires dans le secteur | 100 → 13 000 d'hydrogène par champ (perso) |
| Enrichissement | 5 | Activé | Ajoute un pourcentage d'hydrogène à tous les astéroïdes du secteur | +1 % → +40 % ; recharge de 5 min |
| Broyage | 6 | Activé | Récolte d'un coup sur plusieurs champs | 300 → 2 000 (perso) ; recharge de 2 min |
| Envoi d'hydrogène | 7 | Activé | Corporation : envoie d'un coup une part de la récolte à la planète la plus proche | 10 % → 90 % |
| Roquette à hydrogène | 8 | Activé | Une roquette lancée n'importe où, en **consommant de l'hydrogène** récolté | 4 000 → 16 000 dégâts ; 250 → 500 d'hydrogène |
| Drone explosif | 9 | Activé | Un drone mine un peu, puis fonce sur l'ennemi le plus proche et explose | 3 lancers par recharge |

*Remplacés dans Dark Nebula : l'extension du réservoir (devenue le réplicateur), l'unité minière (devenue l'accélération d'artefact), le drone de minage (devenu le drone explosif).*

### 2.4 Armes (un emplacement sur le cuirassé)

| Module | Niv. de RS | Effet | Courbe (dégâts/s, portée 1 200 sauf mention) |
| --- | --- | --- | --- |
| Batterie faible | — | L'arme de départ, la plus faible | — |
| Laser | 2 | Une cible ; trois paliers de puissance, atteints après environ 8 s puis 20 s sur la même cible ; tout repart du premier palier au changement de cible | Palier 1 : 80 → 158 ; palier 2 : 180 → 356 ; palier 3 : **300 → 3 000** |
| Batterie de masse | 3 | Dégâts constants sur **3 cibles** | 100 → 400 par cible |
| Batterie | 4 | Dégâts constants sur une cible | 150 → 1 000 |
| Laser double | 5 | Deux faisceaux qui montent ensemble tant qu'il y a deux cibles | Palier 3 : 300 → **7 000** par faisceau |
| Barrage | 6 | Une cible ; base faible, plus un bonus **par autre ennemi du secteur** | 60, plus 80 → 600 par ennemi présent |
| Lanceur de dards | 8 | Un missile sur la cible toutes les ~10 s. Le missile peut être abattu, et ne touche que si la cible est restée dans la zone d'impact | 2 000 → 18 000 par missile ; missile de 250 PV ; portée 1 500 |
| Rayon chaîné | 9 | Longue portée (1 600), une cible ; ou mode soutien : se lie à un allié équipé du même rayon (jusqu'à 2 liens), qui gagne +20 % de dégâts et de la portée par lien | 220 → 340 (10 niv.) |
| Lance-roquettes | 11 | Une grosse roquette régulière sur l'ennemi le plus proche ; portée 3 800, mais rien sous 1 800 | 1 400 → 5 000 par roquette (10 niv.) |
| Impulsion | 12 | Une onde lente autour du vaisseau, en zone | 668 → 1 500 (5 niv.) |

**La forme des armes** : chacune a sa **situation idéale**.
- La batterie est régulière.
- Le laser demande de **garder sa cible**.
- La batterie de masse est faite pour la foule.
- Le barrage est fort **quand le secteur est plein**, faible quand il se vide.
- Le dard frappe fort, mais peut être **intercepté**.
- Le lance-roquettes a un **angle mort de près**.

### 2.5 Boucliers (un emplacement sur le cuirassé)

| Module | Niv. de RS | Effet | Courbe | Recharge |
| --- | --- | --- | --- | --- |
| Alpha | 2 | **Invulnérabilité** totale, courte | 10 s → 38 s | 240 s |
| Impulsion | 3 | Ne s'active qu'en mouvement : absorbe des dégâts, donne +50 % de vitesse pendant 10 s et une aura de dégâts (rayon 800) | Absorbe 1 400 → 10 100 ; aura de 100 → 2 000/s | 240 s |
| Régénérant (passif) | 4 | Toujours actif ; se recharge en 48 s après 6 s sans coup reçu | 500 → 10 600 | — |
| Oméga | 5 | Absorbe jusqu'à épuisement, pendant 300 s au plus | 2 000 → 16 000 | 240 s |
| Souffle | 6 | Réduit chaque **dégât de zone** ennemi dans un rayon de 1 800, du reste de sa réserve ; ne fait rien contre les tirs directs | 3 000 → 20 000 | 240 s |
| Miroir | 7 | Absorbe, puis **renvoie** en zone (rayon 1 200) un pourcentage des dégâts absorbés | Absorbe 800 → 5 300 ; renvoie 60 % → 600 % | 240 s |
| Allié (de zone) | 8 | Protège **tous les alliés** dans un rayon de 1 600, **mais pas soi-même** | 2 600 → 9 000 | 240 s |
| Mouvement (passif) | 10 | Absorbe un pourcentage fixe des dégâts, seulement en mouvement | 60 → 15 (10 niv. ; sens à confirmer, § 4) | — |

*Remplacé dans Dark Nebula : le bouclier Delta, devenu le bouclier d'impulsion.*

### 2.6 Soutien (« combat » ; 1 à 4 emplacements sur le cuirassé)

| Module | Niv. de RS | Effet | Courbe | Recharge |
| --- | --- | --- | --- | --- |
| IEM | 2 | Neutralise les ennemis, roquettes et drones dans un rayon de 1 200 : ils ne bougent ni ne tirent | 4 s → 22 s | 120 s |
| Solitude (passif) | 3 | Gros bonus de dégâts quand on est **le seul cuirassé** du secteur | +20 % → +450 % | — |
| Fortification | 4 | +dégâts, mais **immobile 20 s** ; les ennemis le prennent pour cible en priorité (provocation) | +5 % → +200 % | 120 s |
| Amplificateur d'armes | 5 | +dégâts pour **toutes** les armes dans un rayon de 1 600, **ennemis compris**, pendant 30 s | ×1,2 → ×4 | 120 s |
| Téléportation | 5 | Saut vers un point à portée, après 5 s de préparation | Portée de 3 600 → 18 500 ; recharge de 90 s → 10 s | — |
| Destin | 6 | Grosse explosion de zone (rayon 1 000), puis saut vers un champ d'astéroïdes voisin au hasard ; il faut des ennemis dans le secteur | 1 000 → 21 200 | 300 s |
| Barrière | 6 | Champ de force de rayon 1 000 : les ennemis dedans **ne bougent plus** ; celui qui s'y téléporte prend des dégâts | 8 s → 22 s ; 1 000 → 15 000 au téléporté | 120 s |
| Vengeance (passif déclenché) | 7 | Sous 2 000 PV, s'arme seule ; 5 s plus tard, si le vaisseau vit encore, grosse explosion de zone | 4 000 → 28 300 ; rayon 1 000 → 3 000 | 300 s |
| Roquette Delta | 7 | Roquette rapide (350), dégâts de zone (rayon 900) à l'arrivée, deuxième point de passage possible ; peut être abattue | 500 → 10 000 ; 100 → 320 PV | 180 s |
| Bond (saut vers un allié) | 8 | Saut vers le drone allié le plus proche qui est au combat, n'importe où ; dégâts de zone à l'arrivée | 1 500 → 15 000 | 180 s |
| Lien | 8 | Attache un ennemi : il suit tous nos mouvements (interdit en étoile rouge) | 15 s → 95 s | 360 s |
| Suspension | 9 | Ralentit et affaiblit tous les ennemis et projectiles dans un rayon de 2 400 pendant 45 s | Dégâts ennemis ramenés à 60 % → 32 % ; vitesse à 75 % → 38 % | 300 s |
| Roquette Oméga | 10 | Roquette lente (150) et forte ; si elle est abattue, elle fait encore un peu de dégâts | 500 → 12 500 (abattue : 250 → 6 000) ; 700 → 2 900 PV | 180 s |
| Bombe posée | 11 | Bombe fixe ; se déclenche quand un ennemi entre dans son rayon ; peut être abattue | 12 000 → 34 000 (12 niv.) | 600 s |

*Retirés dans Dark Nebula :*
- *le sanctuaire (le vaisseau condamné rentre chez lui), supprimé sans remplacement ;*
- *la distorsion temporelle, devenue l'amplificateur d'armes ;*
- *l'unité, devenue la solitude ;*
- *la récupération (soin à chaque vaisseau détruit), devenue le drone leurre ;*
- *la roquette Alpha, devenue le drone lance-roquettes ;*
- *la suppression et l'impulsion, cachées ;*
- *le drone Alpha, devenu la tourelle à rayon chaîné.*

### 2.7 Drones (1 à 2 emplacements sur le cuirassé)

| Module | Niv. de RS | Effet | Recharge |
| --- | --- | --- | --- |
| Drone leurre | 5 | Voir § 1.3 ; portée de lancement de 2 400 → 10 000 | 120 s |
| Drone réparateur | 6 | Voir § 1.3 | 180 s |
| Drone lance-roquettes | 7 | Voir § 1.3 | 180 s |
| Tourelle laser | 8 | Voir § 1.3 | 300 s |
| Drone « gardien ennemi » | 9 | Voir § 1.3 | 120 s |
| Tourelle à rayon chaîné, paire téléportée, escouade | 10 à 12 | Voir § 1.3 | 300 s |

---

## 3. La recherche

### 3.1 Le circuit

1. Dans une étoile rouge (le PvE coopératif), le transport ramasse des **artefacts** de trois familles :
   - **combat** : plans d'armes et de boucliers ;
   - **utilitaire** : plans de commerce et de minage ;
   - **soutien** : plans de soutien (dès le niveau 2 de RS).
2. Rapportés à la **station de recherche** (bâtiment au niveau de joueur 5, 1 000 crédits, file de 8 artefacts), les artefacts sont **étudiés un par un**, de 1 h au niveau 1 de RS à 3 h dès le niveau 4. Chacun donne des crédits, de l'expérience, des **plans** de sa famille, et parfois **le déblocage d'un nouveau module**. On peut aussi **récupérer** un artefact tout de suite, pour moins de crédits.
3. Dans l'écran des modules, on **monte un niveau** quand on a les plans requis : on paie les crédits et on attend la durée (§ 2.1).
4. Il y a **une seule place de recherche de module** ; une deuxième s'achète (`SecondResearchSlotPrice = 100 000`, monnaie à confirmer). Les cristaux (monnaie payante) **finissent tout de suite** une étude ou une amélioration.

### 3.2 Les points de conception

- **Le niveau de l'artefact ouvre le module.** Un module de RS 8 ne s'obtient qu'en jouant les étoiles rouges 8 : c'est le PvE qui ouvre l'arbre, et le PvE de niveau n est ouvert par un bâtiment de niveau n (le scanner rouge).
- **Les plans font le mur du haut**, les crédits et le temps le bas. Les plans vont de 1 à 100 000 (×100 000), les crédits de 1 k à 25 M (×25 000), le temps de 1 min à 20 j.
- **Le choix** : avec 50 à 60 modules de joueur, une seule place de recherche et 111 jours pour un niveau 15, on ne maximise jamais tout. Les guides officiels conseillent quoi monter en premier (par exemple, monter les modules de minage avant les autres si les plans manquent).
- **Ce qui se vend dans Hades' Star**, et qu'on refuse (CLAUDE.md, CADRAGE-v3 § 10) :
  - la deuxième place de recherche ;
  - la fin immédiate d'une étude ou d'une amélioration contre des cristaux ;
  - le pack de départ 1 : −80 % sur les vaisseaux neufs, −10 % sur les modèles ;
  - le pack de départ 2 : +35 % de valeur des cargaisons, +40 % de plans par artefact.

---

## 4. Incertitudes

- **Les unités** : les vitesses, les distances, `MiningPeriod`, `HealRate` et `DPSRampTimes` (lu « 8 s puis 20 s ») sont lus sans leur unité. Les rapports entre valeurs sont sûrs, pas les valeurs absolues.
- **Le bouclier de mouvement** (60 → 15) et la **suspension** (60 → 32, 75 → 38) : on lit « part des dégâts ou de la vitesse qui reste », donc un effet qui monte. Le texte du bouclier de mouvement dit pourtant qu'il « absorbe un pourcentage fixe ». À vérifier sur le wiki ou en jeu.
- **Le drone réparateur** : la colonne lue (`OnDeathHealAmount_PvE`, 450 → 1 750) est peut-être le montant à la destruction, pas à l'expiration.
- **Les plans par artefact** : la table communautaire donne 1 à 10 plans « accordés », ce qui paraît faible face aux 100 000 d'un niveau 15. C'est peut-être un nombre de types de plans, ou un multiplicateur.
- **La famille des plans de drones** : aucune famille d'artefact ne porte « Drone » dans les tables.
- **La soute de base du transport** (18 puis 60 aux niveaux 6 et 7) : un saut à confirmer en jeu.
- **La monnaie de la deuxième place de recherche** (100 000) : crédits ou cristaux ?
- **La version** : ce sont les données de *Dark Nebula* (fin 2023 et après). Les chiffres des anciens guides, à 10 ou 12 niveaux de module, ne s'appliquent plus.
- **Les pages non lues** : le wiki, le blog et Reddit n'ont été vus qu'à travers des résumés de moteur de recherche (§ 6).

---

## 5. La transposition pour Fondaco

### 5.1 Ce qui correspond à quoi

| Hades' Star | Fondaco aujourd'hui | Proposition |
| --- | --- | --- |
| Le modèle d'un type, 7 niveaux, permanent, pour tous les vaisseaux du type | Le **niveau de modèle** (1 à 5) à la Remise : +10 % de cale, ou +10 % de PV et de dégâts pour les armes ; prix doublé à chaque niveau | Garder. Faire **ajouter une place de module à certains niveaux** (par exemple aux niveaux 3 et 5), à la place d'une partie des +10 % : c'est ce qui rend le modèle désirable dans Hades' Star, plus que la coque |
| Le prix d'un vaisseau neuf qui monte avec le modèle | Un prix fixe par véhicule | À étudier : **un véhicule neuf au prix de son modèle courant**. Cela freine l'empilement sans rien retirer à ce qui est bâti |
| Le chantier, qui fixe la **flotte totale** (4 → 16) | Pas de plafond de véhicules propre à la Remise | Optionnel : un plafond de charroi par niveau de Remise, affiché. Il resterait sans coût courant ni perte |
| Le transport, le mineur, le cuirassé | Mule, charrette, chariot, burchio ; le cavalier, le chariot de guerre, le grand chariot armé (Porta) | Déjà en place. Le mineur n'a pas d'équivalent : on a retiré les gisements le 1er novembre |
| Une arme, un bouclier, puis des soutiens et des drones | 1 à 3 places de composants, sans type | Proposer des **places typées** : 1 arme, 1 défense, puis des soutiens (le grand chariot armé : 1 + 1 + 1). Le choix devient lisible, et on évite trois armes empilées |
| Les modules recherchés une fois, posés à volonté | Les modules de commerce sont recherchés à la Scuola ; les composants de la Porta s'**achètent à l'unité**, se perdent avec le véhicule et s'améliorent un par un | Garder le choix du porteur (une perte qui a un prix). Noter la différence : dans Hades' Star, un module n'est pas un objet perdable |
| Les plans tirés des artefacts, par famille | Point ouvert du plan de la Porta (§ 13) : d'où viennent les plans | **Déchiffrer une relique** à la Scuola au lieu de la vendre, pour des plans de **sa famille**. Trois familles, d'après la relique : armes et défense, soutien, négoce. Voir l'arbitrage du 1er novembre, qui a retiré les plans des hauts niveaux de négoce : on ne les garderait que pour les **composants** |
| Les recharges fixes, l'effet qui monte | Recharge et effet montent ensemble (§ 5 du plan de la Porta) | Adopter la règle d'Hades' Star : **la recharge reste fixe, l'effet monte**. C'est plus lisible au bouton rond. Exception : un composant de saut, dont la recharge baisse |

### 5.2 Les modules de livraison qui valent d'être adaptés

Les commandes en tournées sont le cœur du jeu (un seul métier, livrer). Hades' Star montre quatre leviers. Les noms proposés sont vénitiens et à valider.

| Inspiration | Nom proposé | Effet proposé pour Fondaco | Remarques |
| --- | --- | --- | --- |
| Extension de soute | **Ridelles** (existe : `hold`) | +cale | Hades' Star y ajoute un coût de trajet. Chez nous, on garde la cale seule : pas de carburant, rien qui court |
| Ordinateur de cargaison | **Livre de route** | Pendant une tournée, une commande d'une ville **traversée** qui va vers une ville **suivante** de la tournée se charge seule, avec une prime de +3 % → +30 % | Récompense les tournées bien tracées ; prolonge l'anneau des commandes |
| Salve commerciale | **Jour de foire** | Activé, une fois par jour : pendant 30 min, après 5 livraisons, chaque livraison suivante paie +5 % → +50 % | Récompense le jeu actif **sans punir l'absence**. La recharge de 10 h d'Hades' Star est reprise |
| Ruée | **Fouet du charretier** | Le véhicule va +10 % → +40 % plus vite quand toute sa charge est pour l'arrêt suivant | Simple et lisible ; vaut aussi à la Porta, pour un transport qui porte une relique |
| Expédition (téléportation) | **Estafette** | Activé : la tournée part **directement** de la ville qui a le plus de commandes en attente, dans un rayon ; recharge longue | Du confort et du temps ; à calibrer pour ne pas écraser la distance |
| Drone de livraison | **Garzone** | Activé : un commis livre seul une commande vers une seule ville, pendant sa durée | Attention : c'est de l'**automatisation**, donc du revenu. Il se recherche ; on ne le vend **jamais**, ni au Pass |

### 5.3 Les composants qui valent d'être adaptés à la Porta

Le plan de la Porta a déjà les lances (laser), les arbalètes, la couleuvrine, le pavois, la cuirasse, le chirurgien, la trompette et la fumée. Hades' Star suggère des ajouts, classés par intérêt. Les chiffres sont des ordres de grandeur, à l'échelle de la Porta (PV en centaines ou milliers, portées en cases).

**Les armes** (une place) :

| Inspiration | Nom proposé | Effet niv. 1 (+/niv.) | Pourquoi |
| --- | --- | --- | --- |
| Barrage | **Mitraille** | 10 dégâts/s, plus 15 par ennemi à 3 cases (+20 %/niv.) | Forte dans une ville pleine, faible à la fin : un vrai choix face aux lances |
| Dard | **Pierrier** | Un boulet de 600 toutes les 10 s, portée 3 ; la cible doit rester dans la case d'impact | Récompense le jeu contre les unités lentes (bombarde, Gonfalonier) |
| Batterie de masse | **Espingoles** | 15 dégâts/s sur 3 cibles, portée 1,5 | L'équivalent existe à moitié avec les arbalètes ; à garder en réserve |

**Les défenses** (une place) :

| Inspiration | Nom proposé | Effet | Pourquoi |
| --- | --- | --- | --- |
| Bouclier Alpha | **Bénédiction** | Invulnérable 3 s (+1 s/niv.) ; recharge de 60 s | Le geste réflexe sous la bombarde ; très lisible |
| Bouclier de souffle | **Gabions** | Absorbe 600 dégâts de **zone** (bombarde) à 1,5 case autour, pour toute l'escorte ; rien contre les tirs directs | Un contre clair à la bombarde, utile en groupe |
| Bouclier allié | **Mantelet** | Absorbe 400 dégâts pour les **alliés** à 1,5 case, transports compris, **pas pour soi** | Rend le rôle d'escorte concret : protéger son transport |
| Bouclier miroir | **Pavois à pointes** | Absorbe 300, puis renvoie 100 % en zone à 1 case | Plus tard : du jeu de groupe |
| Bouclier régénérant | **Cotte de mailles** | Une réserve de 300 qui se recharge en 20 s après 5 s sans coup reçu | Un passif simple, à côté de la cuirasse |

**Les soutiens** (une place ou plus) :

| Inspiration | Nom proposé | Effet | Pourquoi |
| --- | --- | --- | --- |
| Fortification (provocation) | **Wagenburg** | Le véhicule se fige 10 s : +30 % de dégâts (+15 points/niv.), et Rome le vise en priorité | Garde le transport hors de vue pendant le chargement d'une relique. Le meilleur complément du plan |
| Barrière | **Chevaux de frise** | Les ennemis à 1 case ne bougent plus pendant 4 s (+1 s/niv.) ; recharge de 90 s | Arrête les chevau-légers qui chassent les transports |
| Amplificateur d'armes | **Tambour** | +25 % de dégâts à **toutes** les armes à 2 cases, ennemis compris, pendant 15 s | Un vrai dilemme tactique |
| IEM | **Sonnerie du tocsin** ou **Pots à fumée** | Les unités de Rome à 1,5 case ne tirent ni ne bougent pendant 3 s (+1 s/niv.) | Recoupe la fumée : une seule des deux |
| Vengeance | **Sainte-Barbe** | Sous 15 % de PV, la poudre s'arme : 3 s plus tard, 800 dégâts à 1,5 case | Donne un sens à la mort ; la perte reste définitive |
| Roquette Delta ou Oméga | **Pot à feu** ou **Brûlot** | Un projectile lancé sur un point ; dégâts de zone ; Rome peut l'abattre | Du jeu de visée, sans tir automatique |
| Suspension | **Chausse-trappes** | Les ennemis à 2 cases vont à 60 % de leur vitesse et font 70 % de leurs dégâts pendant 10 s | Contrôle de zone pour le groupe |
| Téléportation | **Passeur** | Saut de 3 cases (+0,5/niv.) après 2 s ; recharge de 60 s (−5 s/niv.) | L'exception : la recharge qui baisse |
| Drone leurre | **Étendard** | Planté à 2 cases, il attire les tirs de Rome pendant 8 s (300 PV, +100/niv.) | Une variante de la fumée, posée au sol |

**Les modules du transport à la Porta** : c'est l'idée la plus forte. Dans Hades' Star, le transport porte des modules qui **consomment une cargaison** pour un effet tactique. À la Porta, le transport n'a aujourd'hui aucune défense ; on peut lui donner **une place**, sans arme.

| Inspiration | Nom proposé | Effet |
| --- | --- | --- |
| Prolongation de l'étoile rouge | **Indulgence** | Sacrifie une relique portée (la moins rare) : Rome attend **+20 s à +60 s** avant de refermer ses terres. Le thème pontifical s'y prête |
| Réparation par la cargaison | **Ex-voto** | Sacrifie une relique : soigne d'un coup un véhicule de combat allié de 400 → 1 200 PV |
| Ruée (version étoile rouge) | **Fouet du charretier** | +20 % de vitesse quand le transport porte une relique |
| Furtivité (sur le transport) | **Bâche de pèlerin** | Le transport n'est pas visé directement pendant 6 s ; recharge de 60 s |
| Expédition (version étoile rouge) | **Guide** | Saut vers la ville qui garde le plus de reliques du joueur, après une préparation proportionnelle à leur nombre |

### 5.4 Les principes à reprendre, et ceux qu'on écarte

**À reprendre**
- **Une situation idéale par arme**, une contre-mesure par menace : les gabions contre la bombarde, les chevaux de frise contre le chevau-léger, le wagenburg contre la chasse aux transports.
- **La recharge fixe, l'effet qui monte** ; 2 à 4 utilisations par bataille de 10 min.
- **La coque compte peu, les modules beaucoup** : +10 % de PV par niveau de modèle suffit, les places de composants font la différence.
- **Le PvE ouvre l'arbre** : le palier n de la Porta pourrait ouvrir les composants de rang n. Cela donne une raison de monter les paliers, au-delà des reliques.

**À écarter** (règles de Fondaco)
- Tout ce qu'Hades' Star vend : la place de recherche, la fin immédiate contre une monnaie payante, les packs de bonus permanents.
- Le carburant consommé à chaque trajet (l'hydrogène), qui serait un coût courant.
- Le lien et les mécaniques du PvP : la Porta est en PvE.
- Les 15 niveaux et les 111 jours : nos composants vont de 1 à 5, nos modules de 1 à 10 (CADRAGE-v3 § 3 bis).

---

## 6. Sources

**Lues**
- **Dépôt GitHub userXinos/HadesSpace** (lecture anonyme, commit `000ce38` du 30 octobre 2026) : <https://github.com/userXinos/HadesSpace>. Fichiers lus :
  - `parser/raw/capital_ships.csv` (vaisseaux, drones, ennemis) ;
  - `modules.csv` (tous les modules, niveau par niveau) ;
  - `projectiles.csv` (roquettes, dards, bombes) ;
  - `spacebuildings.csv` (chantier, station de recherche) ;
  - `artifacts.csv` ;
  - `globals.csv` ;
  - `loc_strings/loc_strings_en.csv` (descriptions officielles des modules, et liste des remplacements de Dark Nebula) ;
  - `community/dataset-base.md` et `community/tables/artifacts.md`.
- **Résumés de moteur de recherche** (pages non ouvertes) :
  - du blog officiel : [Module changes in DARK NEBULA](https://blog.hadesstar.com/2022/10/module-changes-in-dark-nebula.html), [Hades' Star: DARK NEBULA changelog](https://blog.hadesstar.com/2023/10/hades-star-dark-nebula-changelog.html), [Dark Nebula upgrade guide](https://blog.hadesstar.com/2023/10/dark-nebula-upgrade-guide.html), [Dark Nebula: New Early Access Build](https://blog.hadesstar.com/2023/04/dark-nebula-new-early-access-build.html) ;
  - d'un guide : [TouchTapPlay, guide des artefacts](https://www.touchtapplay.com/hades-star-artifacts-guide-everything-you-need-to-know/).

**Injoignables depuis la session** (hôtes refusés par le filtre réseau) :
- hades-star.fandom.com (y compris `?action=raw`) ;
- web.archive.org ;
- old.reddit.com, et le miroir redlib de son wiki (`/r/HadesStar/wiki/mechanics/modules`) ;
- breezewiki.com ;
- steamcommunity.com ;
- hadesstar.com et blog.hadesstar.com.

Pour confirmer les points du § 4, il faudra autoriser ces domaines dans les réglages réseau de la session.
