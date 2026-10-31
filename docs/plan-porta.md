# La Porta : les terres de Rome, le PvE de l'empire (plan du 31 octobre 2026)

*Étape 7b du chemin (CADRAGE-v3 § 13), validée par le porteur le 31 octobre 2026. Elle remplace l'expédition en boîte noire (`packages/engine/src/empire/expedition.ts`) par une bataille en direct sur le modèle des Red Stars d'Hades' Star. Les décisions du porteur sont au § 12 quater du cadrage ; ce document en est le détail et fait foi pour ce système. Tous les chiffres sont des ordres de grandeur, réglés dans `worlds.settings` (bloc `porta`) et calibrés au simulateur de 24 mois (lot 6).*

## 1. Le modèle : les Red Stars d'Hades' Star

Ce qu'on en reprend :

| Hades' Star (Red Star) | Fondaco (la Porta) |
| --- | --- |
| Le Scanner rouge, un bâtiment du système perso dont le niveau ouvre les paliers RS1 à RS12 | **La Porta**, posée sur la carte perso, dont le niveau ouvre les paliers 1 à 6 |
| L'hydrogène pour entrer | **Le pain** (les vivres de l'expédition), détruit |
| Le cuirassé, le transport, à un de chaque par joueur | **Un véhicule de combat et un transport** par joueur |
| Les modules (arme, bouclier, soutien) | **Les composants**, achetés à l'unité à la Remise |
| 1 à 4 joueurs, file ou corporation | **1 à 4 joueurs**, file par palier et par bande, invitation par lien, départ seul |
| Une dizaine de minutes en direct, puis la supernova | **8 à 12 minutes** en direct, puis **Rome referme ses terres** |
| Les artefacts chargés sur les planètes, un à la fois, avec un temps de chargement | **Les reliques** chargées dans les villes, une à la fois, avec un temps qui croît avec la rareté |
| Cerberus (Sentinelle, Gardien, Intercepteur, Bombardier, Colosse) | **Rome pontificale** (arbalétrier, hallebardier, chevau-léger, bombarde, Gonfalonier de l'Église) |
| Dès RS4, les transports sont sous menace constante | Dès le palier 3, les chevau-légers chassent les transports |
| Tout ce qui n'a pas rejoint la porte à la supernova est perdu | Tout ce qui n'a pas rejoint la porte à la fermeture est perdu |

Ce qu'on change :
- **la perte est définitive** : un véhicule à 0 PV est détruit avec ses composants (décision du porteur) ;
- **les survivants ressortent soignés**, sans coût de réparation ;
- **les reliques se vendent à l'antiquaire** et donnent des points pour un **classement de la semaine par bande de Puissance**.

## 2. Le parcours du joueur

1. **À la Remise**, il achète un véhicule de combat (dès la Casa 9) et des composants, et les pose sur le véhicule.
2. **Il pose la Porta** (dès la Casa 10) sur une case de terre vue de sa carte, comme la Remise ou le Campo (un grand secteur porte plusieurs bâtiments).
3. **Il envoie** un véhicule de combat et un transport de la Remise à la Porta. Le trajet dure selon la distance en cases.
4. **À la Porta**, il choisit un palier ouvert, puis entre dans la file, invite un associé, ou part seul tout de suite. L'entrée se paie en pain.
5. **La bataille** : il mène son transport de ville en ville, sous la garde de son véhicule de combat, charge des reliques, et rentre à la porte avant la fermeture.
6. **Au retour**, il vend ses reliques à l'antiquaire, à la Porta, et ses points montent au classement de la semaine.

## 3. La Porta

| Réglage | Valeur de départ |
| --- | --- |
| Casa | 10 |
| Prix de pose | 4 000 ducats, détruits |
| Chantier de pose | 6 h |
| Niveaux | 1 à 6 ; le niveau n ouvre le palier n |
| Prix du niveau n + 1 | 4 000 × 2^n ducats, détruits ; chantier de 2 h × n |
| Trajet depuis la Remise | 10 min par case de distance (au moins 10 min) |

- Il n'y a qu'**une Porta** par Maison. Elle ne se déplace pas.
- Le palier n s'ouvre par le niveau n de la Porta **et** par la réussite du palier n − 1. Réussir, c'est rapporter au moins une relique.
- **Un véhicule à la Porta** n'est pas libre pour les livraisons. On peut le renvoyer à la Remise à tout moment hors d'une bataille, avec le même trajet. Rien ne court pendant qu'il y attend.
- Un transport envoyé à la Porta est un véhicule de terre ordinaire (mule, charrette, chariot, burchio). Il n'a **aucune défense**.

## 4. Les véhicules de combat

Ils s'achètent à la Remise, comme les transports, mais restent à part des véhicules de livraison (`h.arms`, sans cale). Leur niveau de modèle (1 à 5) se monte à la Remise (`empireUpgradeArm`), au prix du modèle doublé à chaque niveau. Chaque niveau au-delà du premier donne **+10 % de PV et de dégâts** à tous les véhicules du modèle, au lieu de la cale.

| Modèle | Casa | Prix | PV | Vitesse (cases/min) | Places de composants |
| --- | --- | --- | --- | --- | --- |
| Cavalier | 9 | 1 500 ducats | 1 200 | 6 | 1 |
| Chariot de guerre | 11 | 4 000 ducats | 3 000 | 4 | 2 |
| Grand chariot armé | 14 | 10 000 ducats | 6 500 | 3 | 3 |

- Un véhicule de combat **sans arme ne tire pas** : il ne fait qu'encaisser.
- Les véhicules de combat **comptent dans la Puissance** comme ce qui est bâti. Une perte la fait baisser.
- Ils ne livrent rien : ils n'ont pas de cale.

## 5. Les composants

Un composant est un objet de l'inventaire de la Maison (`{ id, code, level }`). Il s'achète à la Remise, se pose sur une place libre d'un véhicule de combat qui n'est pas en bataille, se retire, et s'améliore du niveau 1 au niveau 5. Le prix du niveau n + 1 est celui de l'achat × 2^n. Les ducats sont détruits (grand livre, vers le puits).

| Type | Composant | Équivalent Hades' Star | Prix | Effet au niveau 1 (+ par niveau) |
| --- | --- | --- | --- | --- |
| Arme | **Lances** | Laser | 800 | 40 dégâts/s sur une cible à portée 1,5 case ; +15 % par 2 s de tir sur la même cible, jusqu'à +150 %, remis à zéro au changement de cible (+20 %/niv.) |
| Arme | **Arbalètes** | Barrage | 1 000 | 18 dégâts/s à **chaque** ennemi à portée 2 cases (+20 %/niv.) |
| Arme | **Couleuvrine** | Battery | 1 200 | Un coup de 400 toutes les 6 s, portée 3 cases (+20 %/niv.) |
| Défense | **Pavois** (actif) | Bouclier | 900 | Absorbe 500 dégâts pendant 10 s ; recharge 40 s (+25 % absorbés/niv.) |
| Défense | **Cuirasse** (passif) | Bouclier passif | 700 | −15 % de dégâts reçus (+5 points/niv.) |
| Soutien | **Chirurgien** (actif) | Remote Repair | 900 | Soigne 60 PV/s un allié à 2 cases, joueurs du groupe compris, pendant 10 s ; recharge 45 s (+20 %/niv.) |
| Soutien | **Trompette** (actif) | Time Warp / vitesse | 600 | +50 % de vitesse aux alliés à 2 cases pendant 8 s ; recharge 40 s (+2 s/niv.) |
| Soutien | **Fumée** (actif) | Stealth | 800 | Rome ne voit plus le véhicule pendant 8 s, et ses cibles le lâchent ; recharge 60 s ; tirer la rompt (+2 s/niv.) |

- Les composants actifs se lancent par un **bouton rond** dans la bataille, avec leur temps de recharge visible.
- Les composants posés sur un véhicule détruit sont **détruits avec lui**.

## 6. La bataille : les terres de Rome

### 6.1 La carte

- Une **petite carte d'hexagones** tirée de la graine de la bataille, aux codes de la carte perso : des secteurs, des **villes en astres** (la direction Lagune), une **porte** au bord.
- **4 à 8 villes** selon le palier, chacune avec un rayon de chargement d'une case et **1 à 4 reliques**. Chaque joueur a **ses propres reliques** dans chaque ville, comme les artefacts d'Hades' Star : on ne vole pas celles d'un coéquipier.
- Les positions sont continues (en cases, deux décimales) ; la grille sert au dessin et au tirage.

### 6.2 Le temps et les ordres

- Le moteur avance d'un **pas fixe de 250 ms**, pur et déterministe : même graine et mêmes ordres, même issue.
- Le **minuteur** : 10 min (`porta.minutes`). À la fermeture, tout ce qui n'est pas sur la porte est perdu.
- **Les ordres** :
  - toucher un véhicule, puis toucher un point ou une ville : il y va en ligne droite ;
  - un bouton rond par composant actif ;
  - « **Rentrer** » : un véhicule posé sur la porte sort aussitôt de la bataille, avec sa cargaison.
- Le tir est **automatique** : chaque arme vise l'ennemi le plus proche dans sa portée, et garde sa cible tant qu'elle y reste (ce qui fait monter les lances).
- Un joueur qui se déconnecte laisse ses véhicules où ils sont ; il peut revenir dans la bataille tant qu'elle dure.

### 6.3 Les reliques

| Rareté | Chargement | Antiquaire | Points |
| --- | --- | --- | --- |
| Commune | 10 s | 150 ducats | 1 |
| Rare | 20 s | 500 ducats | 3 |
| Précieuse | 35 s | 1 500 ducats | 8 |
| Légendaire | 60 s | 5 000 ducats | 20 |

- Un transport charge **une relique à la fois**, en restant dans le rayon d'une ville. **Bouger interrompt** le chargement, qui reprend de zéro.
- Un transport porte **2 reliques par tranche de 25 de cale** (une mule : 2 ; un chariot : 5), arrondi en dessous, au moins une.
- Un transport détruit ou laissé dans la zone perd sa cargaison.

### 6.4 Rome pontificale

| Unité | Équivalent | PV | Dégâts/s | Portée | Vision | Vitesse | Rôle |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **Arbalétrier** | Sentinelle | 600 | 25 | 2 | 3 | 0 | Fixe à sa ville |
| **Hallebardier** (Garde) | Gardien | 3 500 | 30 | 1,2 | 2,5 | 3 | Solide, reste dans le secteur de sa ville ; se met entre l'ennemi et les arbalétriers |
| **Chevau-léger** | Intercepteur | 900 | 45 | 1 | 4 | 8 | Patrouille entre les villes ; **préfère les transports** |
| **Bombarde** | Bombardier | 1 500 | 120 par coup toutes les 4 s, sur une case de rayon | 3 | 3 | 1,5 | Lente, dégâts de zone |
| **Gonfalonier de l'Église** | Colosse | 25 000 | 150, qui monte sur la même cible comme les lances | 2 | 3 | 2 | Boss des paliers 4 à 6 |

Chaque palier multiplie ces PV et ces dégâts (§ 6.6).

### 6.5 L'IA de Rome

Une machine à états pure, par unité, évaluée à chaque pas. Les changements de cible n'ont lieu qu'au **réexamen**, tous les `reviewSeconds` du type (arbalétrier 2 s, chevau-léger 3 s, hallebardier 8 s, bombarde 6 s, Gonfalonier 20 s, comme le Gardien et le Colosse d'Hades' Star). On peut donc faire lâcher une cible en sortant de la portée avant le réexamen.

| État | Entrée | Conduite |
| --- | --- | --- |
| `idle` | Au départ ; après un retour | Patrouille sur des points autour de sa ville (le chevau-léger : entre les villes) |
| `alert` | Un véhicule visible entre dans sa **portée de vision** | Prévient les unités de la même ville (à 3 cases), qui passent en `alert` ; va vers la cible |
| `attack` | La cible est dans sa **portée d'attaque** | Tire sur la cible la **plus menaçante** ; la poursuit dans la limite de sa laisse |
| `retreat` | PV sous 25 % (sauf arbalétrier et Gonfalonier) | Rentre à sa ville, s'y soigne de 2 % par seconde, revient en `idle` à 80 % |
| `return` | Au-delà de sa **laisse** (3 cases de sa ville ; chevau-léger 6), ou plus rien de visible | Rentre à sa ville, ne tire que si on le touche |

- **Ne voit** que les véhicules dans sa portée de vision, et pas ceux sous la fumée. Une unité frappée voit son agresseur.
- **Le score de menace** d'un véhicule visible :
  - ses dégâts par seconde ;
  - plus 50 % s'il a frappé cette unité dans les 10 dernières secondes ;
  - plus un bonus de proximité (moins la distance, en cases × 10).

  Un transport a une menace nulle : seul le **chevau-léger** le préfère, avec un bonus fixe de 1 000. Les autres ne le visent que s'il est le seul visible.
- **La bombarde** vise le point où les véhicules visibles sont les plus nombreux.

### 6.6 Les paliers

| Palier | Joueurs | Villes | Unités par ville (en moyenne) | PV et dégâts de Rome | Reliques par joueur (communes / rares / précieuses / légendaires, en part) | Entrée (pain par véhicule) |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 1–4 | 4 | 2 arbalétriers, 1 hallebardier | × 1 | 90 / 10 / 0 / 0 | 10 |
| 2 | 1–4 | 5 | + 1 chevau-léger sur la carte | × 1,4 | 70 / 25 / 5 / 0 | 20 |
| 3 | 1–4 | 5 | + chevau-légers par paires | × 2 | 50 / 35 / 15 / 0 | 40 |
| 4 | 1–4 (très dur seul) | 6 | + bombardes, un Gonfalonier | × 2,8 | 35 / 40 / 22 / 3 | 70 |
| 5 | 2–4 | 7 | + un Gonfalonier par 2 joueurs | × 4 | 20 / 40 / 32 / 8 | 110 |
| 6 | 2–4 | 8 | Tout, en nombre | × 5,5 | 10 / 35 / 40 / 15 | 160 |

- Le nombre d'unités croît avec le nombre de joueurs : + 50 % par joueur au-delà du premier.
- Les reliques par joueur et par ville sont tirées de la graine selon la répartition du palier, de façon que la ville la mieux gardée tienne les plus rares.

## 7. Le groupe

- **La file** se forme par palier et par **bande de Puissance**. La bataille part quand le groupe compte 4 joueurs, ou 2 minutes après l'entrée du premier avec ceux qui sont là, si leur nombre suffit au palier.
- **L'invitation** : celui qui ouvre la bataille partage un lien. Ses invités entrent quelle que soit leur bande, au palier qu'il a choisi, s'ils l'ont ouvert.
- **« Partir seul maintenant »** lance aussitôt une bataille d'un joueur, aux paliers 1 à 4.
- Chacun paie son entrée et engage ses deux véhicules à quai. Ceux-ci restent « en bataille » jusqu'à la sortie.

## 8. La sortie

Une **seule transaction SQL** par joueur, à la fin de la bataille ou à la sortie de son dernier véhicule :
- les véhicules **détruits**, ou restés dans la zone à la fermeture, sont retirés de `h.vehicles`, avec leurs composants ;
- les survivants reviennent **à pleins PV**, à quai à la Porta ;
- les reliques rapportées s'ajoutent à l'inventaire de reliques de la Maison ;
- le meilleur palier réussi monte s'il y a lieu.

**Un redémarrage du serveur** pendant une bataille l'annule : les véhicules sont rendus, à quai, et le pain est remboursé. Rien n'est perdu ni gagné.

## 9. L'antiquaire et le classement

- **L'antiquaire**, à la Porta, rachète les reliques au prix de leur rareté (§ 6.3). Les ducats sont créés au grand livre, depuis le compte de la monnaie, comme ceux de la Dogana.
- **Les points** s'ajoutent à la vente, au classement de la semaine (du lundi au dimanche, heure de Venise), par **bande de Puissance**. Les rangs sont publics et honorifiques ; une récompense en Sceaux est notée dans `IDEAS.md`.
- On garde ses reliques autant qu'on veut : la vente ne presse jamais.
- Rien ne s'achète avec le Pass : ni véhicule, ni composant, ni entrée, ni relique.

## 10. L'économie

| Flux | Sens |
| --- | --- |
| Pose et niveaux de la Porta, véhicules de combat, composants et leurs niveaux | Puits de ducats |
| Pertes de véhicules et de composants | Puits (de valeur bâtie) |
| Entrée | Puits de pain |
| Antiquaire | Source de ducats |

Au lot 6, le simulateur doit tenir l'indice des prix entre 80 et 130 sur 24 mois et garder le ratio des puits aux sources dans sa cible (§ 13 du cadrage). Une bataille réussie doit rapporter, au palier de sa Casa, de l'ordre d'**une demi-journée de revenu** d'un joueur médian.

## 11. L'architecture

- **Moteur** : `packages/engine/src/empire/porta/` :
  - `combat.ts` : le catalogue et les statistiques effectives (modèle × niveau × composants) ;
  - `arms.ts` : acheter, poser, retirer, améliorer ;
  - `porta.ts` : bâtir la Porta, ses niveaux, l'envoi, l'entrée, la sortie, l'antiquaire, les points ;
  - `battle/map.ts`, `battle/sim.ts`, `battle/ai.ts`, `battle/orders.ts` : la bataille, pure et sans monnaie, comme `skirmish.ts`.
- **Commandes** : `empireBuildPorta`, `empireUpgradePorta`, `empireBuyArm` et `empireUpgradeArm` (un véhicule de combat, son modèle), `empireBuyComponent`, `empireUpgradeComponent`, `empireFitArm`, `empireSendToPorta`, `empireRecallFromPorta`, `empirePortaEnter`, `empirePortaSettle`, `empireSellRelics`.
- **Serveur** : `apps/server/src/game/porta.ts` :
  - le salon, la file et l'invitation ;
  - les batailles en mémoire, avancées à 4 Hz ;
  - un canal WebSocket pour les participants (instantanés, ordres) ;
  - les routes `/api/empire/porta/*` ;
  - le classement lu sur les points de la semaine des Maisons (sans table).
- **Écran** : `apps/web/src/empire/porta/` :
  - la Remise des armes ;
  - la feuille de la Porta (paliers, quai, salon, antiquaire, classement) ;
  - la bataille, en direction Lagune.
- **Réglages** : tout ce document dans `worlds.settings.porta`, et un bloc `combat` sur chaque véhicule de combat.

## 12. Les lots

0. Ce document, le cadrage (§ 2, § 3 ter, § 12 quater, § 13), `IDEAS.md`.
1. Le moteur des armes : véhicules de combat, composants, achat, pose, amélioration. *Fait le 31 octobre 2026* (`empire/porta/arms.ts`, `empire/porta/settings.ts`, réglages de Venise ; la Puissance compte les véhicules de combat, les niveaux de modèle et ceux des composants).
2. Le moteur de bataille : carte, simulation, IA de Rome, ordres, reliques, fermeture. *Fait le 31 octobre 2026* (`empire/porta/battle/` : `map.ts` tire la carte, `ai.ts` l'esprit de Rome, `sim.ts` le pas, les ordres et l'issue ; réglages `porta.battle`, `porta.rome`, `porta.tiers`, `porta.relics` ; un palier 1 se gagne seul avec un cavalier aux lances qui nettoie la ville la plus proche avant d'y mener son transport).
3. La Porta et l'antiquaire : bâtiment, envoi, entrée, sortie, vente, points. *Fait le 31 octobre 2026* (`empire/porta/porta.ts` : `empireBuildPorta`, `empireUpgradePorta`, `empireSendToPorta`, `empireRecallFromPorta`, `empirePortaEnter`, `empirePortaSettle`, `empirePortaCancel`, `empireSellRelics` ; `portaEntrant` donne au serveur ce que la Maison engage ; un transport à la Porta n'est jamais libre pour les livraisons ; l'antiquaire paie comme toute recette, salaires compris).
4. Le serveur en direct : salon, file, invitation, départ seul, boucle, WebSocket, classement. *Fait le 31 octobre 2026* (`apps/server/src/game/porta.ts`, le hub ; `portaRoutes.ts` : `GET /api/empire/porta` (salon, bataille, classement de la bande), `POST …/queue` (seul, public, invitation), `…/join` (par le code à six chiffres), `…/launch` (« Partir maintenant »), `…/leave`, `…/order`, et le socket `…/live` qui pousse un instantané par battement. Le classement se lit sur l'état des Maisons (les points de la semaine), sans table : la table `porta_scores` du plan n'a pas été nécessaire. Un joueur sorti par la porte est réglé aussitôt, sans attendre la fin de la bataille.)
5. L'écran : la Remise des armes, la Porta sur la carte, la bataille, l'antiquaire, le classement. *Fait le 31 octobre 2026* (`apps/web/src/empire/porta/` : `ArmsSheet`, `PortaSheet`, `Battle`, le socket et les textes ; la Porta se pose depuis la Production et a son repère sur la carte ; la vue de l'empire porte `porta`, tirée de `empire/porta/view.ts` ; design au § La Porta de `docs/design.md` ; parcours `apps/web/e2e/porta.mjs`).
6. Le simulateur de 24 mois : un bot joue la vraie bataille ; calibration documentée dans `docs/calibration.md` ; parcours `e2e:empire` étendu.

## 13. Ce qui reste ouvert

- **Les plans de modules** : la recherche des modules de négoce demande des plans dès le niveau 4, que le cadrage tirait des reliques déchiffrées. Avec l'antiquaire, il faut une autre source : déchiffrer une relique en plans à la Scuola au lieu de la vendre (`IDEAS.md`, à trancher avant que des joueurs atteignent le niveau 4 d'un module).
- **Les chiffres** des §§ 3 à 6 se confirment au lot 2 (une bataille de palier 1 doit se gagner seul avec un cavalier aux lances) et au lot 6.
