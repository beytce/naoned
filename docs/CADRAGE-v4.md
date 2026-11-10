# Fondaco — Document de cadrage (v4) : le fil rouge

*Rédigé le 10 novembre 2026. Le porteur a validé le principe le même jour, sur la maquette (`docs/refonte-totale-2026-11-10/`, en ligne et privée : https://claude.ai/artifact/PwWx9caj5Zs9urBcChRopm) : « J'aime beaucoup le principe, à condition que les graphismes (tuiles et bâtiments) restent les mêmes qu'actuellement. […] je valide, continue le cadrage. »*

*Ce cadrage est **à valider par le porteur** avant de faire foi. Validé, il remplacera la partie conception de CADRAGE-v3 ; les parties techniques (montants entiers, grand livre, moteur pur) restent. Tous les chiffres sont des **ordres de grandeur, à calibrer au simulateur** (§ 14). Les questions ouvertes sont au § 16.*

## 1. Vision

**Pitch.** Venise, 1450. Ta Maison a une île dans la lagune et quelques bobines de fil rouge. Tu tends tes fils vers les villes ; tes barques les suivent. Les autres Maisons visent les mêmes villes. Plus loin, la porcelaine vire à l'encre : là sont les corsaires, les détroits et les fortunes.

**Ce que le jeu est.** Une seule planche partagée, un seul geste (tirer un fil), aucun mode. La gestion, l'affrontement contre le jeu et l'affrontement entre joueurs sont **des lieux de la même planche**.

**Ce qui ne change pas.** Un jeu de niche à la profondeur lisible ; des adultes de 25 à 55 ans ; des sessions courtes sur téléphone, longues sur ordinateur ; un monde persistant où l'on ne perd jamais ce qu'on a bâti.

## 2. Les règles d'or

Elles remplacent les huit règles du 1er novembre. En cas de conflit, elles priment.

1. **Une seule planche, aucun mode.** Rien ne se joue ailleurs que sur la planche. Aucun onglet n'ouvre un autre jeu.
2. **Un seul geste : le fil.** Ce qui est rouge à l'écran, le joueur l'a tracé. Toute fonctionnalité nouvelle doit se faire avec le fil ou avec les pétales (§ 11), sinon elle n'entre pas.
3. **Ton île t'appartient.** Personne ne prend ni ne détruit ce qui s'y trouve.
4. **On te devance, on ne te vole pas.** Ce qui se dispute, ce sont les places de la planche commune (villes, passages). On ne risque que ce qu'on engage : une cargaison, une garde.
5. **Tout coup est annoncé.** Dans une Manœuvre, on ne perd jamais sans avoir pu le voir venir.
6. **À armes égales.** La force qu'on peut engager dans un passage est fixée par le passage, la même pour tous, jamais par la caisse. L'argent réel n'achète que de l'apparat.
7. **Rien ne s'accumule sans fin.** Stocks, demande, bobines et passages tenus ont un plafond.
8. **Court si tu veux, profond si tu restes.** Cinq minutes font une bonne visite, avec au moins une vraie décision.
9. **Les graphismes sont ceux de Porcellana.** Les tuiles et les bâtiments restent ceux d'aujourd'hui (§ 12).

## 3. La planche

### 3.1 Un monde

Un **monde** réunit de 60 à 120 Maisons (joueurs, et Maisons tenues par l'ordinateur pour qu'il soit toujours plein) sur une planche de cases carrées.

| Zone | Matière | Contenu | Qui peut y agir |
| --- | --- | --- | --- |
| **La lagune** | Porcelaine blanche | L'île de chaque Maison, le Rialto, l'île de chaque compagnie | Chacun chez soi ; tout le monde se voit |
| **Les terres disputées** | Biscuit | Une douzaine de villes ; les passages proches (bouches de lagune, ponts, cols) | Tous |
| **Le Large** | La même porcelaine, teintée d'encre de plus en plus sombre | Six à huit ports lointains ; les passages durs (détroits) ; ce que la marée apporte | Tous, à leurs risques |

**Le péril** d'une case va de 0 (blanc) à 1 (noir). Il règle la force des gardes, la valeur des marchandises et la part de cargaison risquée. Il se lit à la couleur : aucun chiffre n'est nécessaire.

### 3.2 Les échelles

Quatre crans de zoom, un mouvement continu : **l'atelier** (le toit s'ouvre), **l'île**, **la lagune**, **le monde**. On ne change jamais d'écran.

## 4. L'île : la gestion

C'est le domaine d'aujourd'hui, avec ses cases achetées une à une et ses bâtiments de porcelaine.

- **Les cases** : une case a un terrain (rive, argile, forêt, pré, pierre). Une quarantaine au plus. Le prix monte à chaque achat.
- **Les ateliers** : trois étages de chaîne (matière, ouvrage, bel ouvrage). Chaque atelier a une réserve ; pleine, il s'arrête sans rien perdre.
- **Les voisinages** : deux ateliers d'une même chaîne côte à côte se renforcent ; certains se gênent (le four et les habitations). **Le gain d'une pose se voit avant de poser.** On peut déplacer un atelier, contre un temps de chantier.
- **Le quai et l'entrepôt** : tout ce qui est produit y arrive, par les routes de l'île (elles restent dessinées comme aujourd'hui, et ne coûtent pas de bobine). Tous les fils en partent.
- **La Maison** : le palais. Son niveau (une douzaine de paliers) donne les bobines, les places de convoi et les cases achetables. **Aucun chantier ne dure plus de 24 heures.**
- **Le métier** (Arte), choisi vers le niveau 4 : verre, laine et soie, épices, bois et navires, banque. Il donne un avantage sur une chaîne et une pièce de convoi propre. Personne ne produit tout bien : c'est ce qui fait acheter aux autres.

Les biens du Large (épices, soie grège, alun) entrent dans les recettes du troisième étage. **Une grande Maison a besoin du Large** ; elle peut y aller, ou acheter au Rialto à ceux qui y vont.

## 5. Le fil

### 5.1 La règle

- Un **fil** part du quai et va à une destination : une ville, le Rialto, un port du Large, ou le quai d'une autre Maison.
- Il a **un sens** : *vendre* (de ton entrepôt vers la destination) ou *acheter* (de la destination vers ton entrepôt).
- Il porte **une marchandise**, choisie quand on le tend ; on en change d'un toucher.
- Les barques (sur l'eau) et les mules (sur terre) le parcourent seules. Leur débit dépend de la longueur du fil et du niveau des barques.
- Il s'arrête de lui-même si l'entrepôt est vide, plein, ou si la ville n'achète plus.

### 5.2 Les bobines

- Chaque fil prend **une bobine**. Trois au départ, une douzaine au sommet.
- Chaque bobine a une **longueur** : les premières n'atteignent que les villes proches, les suivantes le Large.
- Tendre un fil est gratuit et immédiat. **Le reprendre aussi.** Le coût, c'est de ne pas l'avoir ailleurs.

### 5.3 Pourquoi on y revient

Un fil bien placé ne le reste pas : la demande de la ville baisse à mesure qu'on la sert (§ 6), un rival arrive, un passage change de main, une nouvelle fait monter un prix. À chaque visite, la question est : **mes fils sont-ils encore au bon endroit ?**

### 5.4 Le fil commun

Un fil tendu vers le quai d'une autre Maison lui vend ou lui achète directement, au prix convenu entre les deux. C'est l'échange entre joueurs, sans écran de marché.

## 6. Les villes et le Rialto

- **Chaque ville demande deux ou trois marchandises.** Pour chacune, une jauge de demande, **commune à tout le monde**. Elle baisse à chaque livraison, de qui que ce soit, et remonte avec le temps. Le prix suit la jauge.
- **Les fils des autres se voient** : à l'encre pour les rivaux, en céladon pour les associés. On sait qui sert quoi.
- **Le premier fournisseur** d'une ville sur la semaine y plante son pavillon. Il gagne du renom et la primeur des nouvelles de cette ville. Pas de rendement en plus : on évite la boule de neige.
- **Les nouvelles** déplacent la demande (une foire, une disette, un siège). Elles arrivent comme des perles sur le fil du pied (§ 11).
- **Le Rialto** achète et vend tout, à un prix moins bon que les villes : c'est le filet de sécurité. On n'y est jamais bloqué.

## 7. Les passages

### 7.1 La règle

- Un **passage** est une tour sur une case : une bouche de lagune, un pont, un col, un détroit. Les routes vers les villes riches et vers tous les ports du Large en traversent un ou plusieurs.
- **Tout passage est tenu** : par un corsaire, par une puissance (Milan, Gênes, le Turc), par une Maison ou par une compagnie.
- Celui qui le tient fixe un **péage**, plafonné (de l'ordre de 15 % de la valeur de la cargaison).
- Devant un passage, un fil a deux états : **il paie**, ou **il est fermé** (les corsaires ne laissent passer personne tant qu'on ne les a pas forcés une fois).

### 7.2 Forcer, puis tenir

- **Forcer** un passage, c'est gagner une Manœuvre (§ 8) contre sa garde. On y engage un convoi et une cargaison prise dans son entrepôt.
- **Gagné** : la cargaison passe et se vend au prix du Large ; tes fils traversent sans payer pendant 24 heures ; la tour perd **un sceau**.
- **Perdu** : la cargaison engagée est perdue (la moitié va à celui qui tient la tour). Rien d'autre.
- Une tour a **trois sceaux**. Ils se refont, un par jour. Au troisième sceau brisé, la tour passe à la Maison (ou à la compagnie) qui en a brisé le plus.
- Une tour prise est à l'abri douze heures.

### 7.3 Tenir

- Celui qui tient une tour **dispose sa garde** (§ 8.5) et **règle son péage**. Sa garde joue sans lui.
- Une Maison tient **deux passages au plus** ; une compagnie, davantage, à plusieurs.
- Un passage tenu **repousse l'encre** autour de lui (§ 9).

### 7.4 Pourquoi il n'y a plus de PvE ni de PvP

Au début d'une marée, les passages du Large sont tous aux corsaires. Les joueurs les forcent, seuls ou à plusieurs, puis les tiennent, puis se les disputent. **C'est le même geste, la même tour, la même Manœuvre.** Seul change celui qui a disposé la garde. Un joueur qui ne veut affronter personne paie les péages et force les corsaires. Un joueur qui ne veut affronter que des joueurs vise les tours tenues.

## 8. La Manœuvre

### 8.1 En trois phrases

Ton convoi est **une file de pièces** qui doit traverser une grille de cases. À chaque **cloche**, la garde montre où elle va frapper, tu traces le chemin de ta file, puis tout se joue d'un coup. Il faut amener la tête de l'autre côté en gardant le plus de cales possible.

### 8.2 Le déroulé d'une cloche

| Temps | Ce qui se passe |
| --- | --- |
| 1. **La garde annonce** | Les cases qui seront frappées se hachurent. |
| 2. **Tu traces** | Depuis la tête, une à trois cases, de proche en proche. Des cadres en pointillé montrent **où chaque pièce s'arrêtera**, et lesquelles seraient touchées. |
| 3. **Tu sonnes la cloche** | La file avance : chaque pièce prend la place de celle qui la précède. Puis les coups tombent sur les cases hachurées. Puis les pièces de la garde bougent. |

**Un exemple.** La file est : tête, cale, cale, escorte. La garde vise la case de la tête.
- Tu avances d'**une** case : la première cale vient sur la case visée. Elle est perdue.
- Tu avances de **trois** cases : c'est l'escorte qui s'y arrête. Elle encaisse.
- Toute la Manœuvre est là : **la queue passe où la tête était**, et il faut penser à toute la file.

### 8.3 Gagner, perdre

- **Gagné** : la tête atteint le bord opposé. On garde les cales encore dans la file.
- **Perdu** : la tête est coulée (elle encaisse deux coups).
- Cinq à sept cloches, deux minutes. Contre une garde, pas contre un chronomètre : on peut réfléchir.

### 8.4 Les pièces du convoi

Le convoi a de quatre à six pièces. **Leur ordre est l'équipement.** Plus de cales, c'est plus de gain et une file plus longue à protéger.

| Pièce | Ce qu'elle fait |
| --- | --- |
| **La tête** | Elle mène. Deux coups la coulent. |
| **La cale** | Elle porte la cargaison. Un coup la perd. |
| **L'escorte** | Elle encaisse deux coups. Elle coule une galère qu'elle frôle. |
| **Les arbalétriers** | Ils frappent la première pièce de garde dans leur ligne, à deux cases. |
| **Les rameurs** | Une fois par Manœuvre, quatre cases au lieu de trois. |
| **Le charpentier** | Il répare d'un coup la pièce placée devant lui. |
| **Le brûlot** | Touché, il emporte les pièces de garde voisines. |
| **Le fanal** | Il montre une cloche d'avance les coups cachés. |

Les pièces se gagnent (au Large surtout), se montent de niveau et se rangent dans l'ordre qu'on veut avant de partir. La pièce du métier de la Maison s'y ajoute.

### 8.5 Les pièces de la garde

| Pièce | Ce qu'elle fait |
| --- | --- |
| **L'écueil** | Il barre une case. |
| **La galère d'archers** | Elle vise la case de la tête et celle d'après ; elle approche d'une case par cloche. |
| **La bombarde** | Elle vise une ligne de trois cases, deux rangs devant la tête. Elle ne bouge pas. |
| **La chaîne du port** | Elle ferme une ligne une cloche sur deux. |
| **L'embuscade** | Une pièce cachée, qui se montre à la deuxième cloche. |
| **Le capitaine** | Chez les corsaires : une pièce à deux motifs qui alternent, et un nom. |

**À armes égales.** Chaque passage a un niveau. Il fixe le **budget de la garde** et le **budget du convoi**, les mêmes pour tous. Une Maison riche n'y met pas plus de pièces qu'une autre : elle a seulement plus de choix.

### 8.6 Ce qui en fait un jeu

- **Contre le jeu**, c'est un casse-tête à information complète.
- **Contre un joueur**, sa garde suit la disposition qu'il a préparée ; l'embuscade ajoute une part de lecture. Il n'a pas besoin d'être là, et il n'y a aucun problème de réseau.
- **Tout est déterministe** : une Manœuvre se rejoue, se partage, se teste au simulateur.
- **À deux** : deux convois d'une même compagnie sur une grille plus large.

*C'est la pièce la plus neuve du jeu, et la moins sûre. Elle est la première chose à prototyper et à faire jouer (§ 14, étape 1).*

## 9. La marée d'encre

- Une **marée** dure six semaines.
- **Elle monte** : le péril du Large s'étend vers l'intérieur. Aux dernières semaines, les puissances reprennent les passages mal gardés.
- **Les passages tenus par des joueurs la repoussent** : la planche redevient blanche autour d'eux.
- **À la fin** : le renom gagné est compté, le Large est redistribué (nouveaux ports, nouveaux passages, tous aux corsaires), et les Maisons sont regroupées en mondes de leur niveau. Les compagnies restent ensemble.
- **Ce qui ne bouge jamais** : ton île, ta Maison, tes bobines, tes pièces, ton renom acquis.

La marée donne au monde un début, une tension et une fin, et à chacun un départ à égalité au Large, sans rien retirer à personne.

## 10. Ce qui grandit, et l'économie

### 10.1 Quatre choses

| Axe | De | À |
| --- | --- | --- |
| **L'île** | 4 cases, 2 ateliers | 40 cases, trois étages de chaîne |
| **Les bobines** | 3, courtes | 12, jusqu'au bout du Large |
| **Le convoi** | Tête, cale, escorte | 6 places, une vingtaine de pièces à choisir |
| **Le renom** | — | Pavillons, passages tenus, marées traversées ; il ouvre les titres et l'apparat |

### 10.2 Deux monnaies

- Les **ducats** : ils s'échangent, ils bâtissent.
- Le **renom** : il ne s'échange pas ; il apparie les Maisons de même niveau.

### 10.3 Sources et puits

| D'où viennent les ducats | Part visée | Où ils partent | Part visée |
| --- | --- | --- | --- |
| Les fils vers les villes | ≈ 60 % | Bâtir et élever l'île | ≈ 55 % |
| Les cargaisons vendues au Large | ≈ 25 % | Les pièces de convoi et de garde | ≈ 20 % |
| Les péages et les prises | ≈ 10 % | Les péages payés | ≈ 10 % |
| Le Rialto | ≈ 5 % | L'entretien des passages tenus | ≈ 10 % |

Les ducats qui passent d'un joueur à l'autre (péages, prises, fils communs) passent par le grand livre et sont plafonnés par compte.

### 10.4 Le modèle économique

Bêta sans rien à vendre. Ensuite : de l'apparat seulement (pavillons, livrées, façades). Jamais de bobine, de pièce, de sceau ni de temps de chantier.

## 11. L'interface

**Il n'y a pas de menu.** Quatre éléments, et rien d'autre :

| Élément | Ce que c'est |
| --- | --- |
| **La planche** | Tout le jeu. |
| **Les pétales** | Toucher un objet fait paraître autour de lui ses deux ou trois gestes. Un seul est rouge. Un court cartouche de papier, sous l'objet, dit l'essentiel. |
| **L'échelle** | Quatre crans sur le bord : Atelier, Île, Lagune, Monde. |
| **Le fil des nouvelles** | Au pied de l'écran, un fil rouge et ses perles : une par chose qui t'attend (une ville saturée, un passage repris, un atelier plein, une nouvelle). Toucher une perle y emmène la caméra. Il remplace les notifications, les objectifs et le guide. |

En haut, deux nombres : les ducats et les bobines libres.

**Les anciens écrans deviennent des lieux.** La Maison (profil, famille, renom), l'île de la compagnie, le Rialto, le palais du Doge (classements). On y va en les touchant sur la planche.

**Chaque geste glissé a son équivalent au toucher** (« Tirer un fil jusqu'ici » dans les pétales), pour le clavier, les lecteurs d'écran et les petits écrans.

**Les tutoriels guidés** restent la règle (décision du 8 novembre) : un projecteur, un geste à la fois. Le premier apprend à tirer un fil ; le deuxième, la Manœuvre, cloche par cloche.

## 12. La direction artistique

**Condition du porteur : les tuiles et les bâtiments restent ceux d'aujourd'hui.** Porcellana fait foi, sans changement, pour les cases, les bâtiments, les matières, la lumière, la caméra et les animations d'arrivée (`docs/plan-porcellana.md`, kit `apps/web/src/porcellana/`). La maquette en deux dimensions montre un principe, pas un rendu.

Ce qui s'ajoute, dans la même grammaire :

| Ajout | Comment |
| --- | --- |
| **L'encre** | Les mêmes cases et les mêmes bâtiments, dont la teinte glisse du blanc vers l'encre `#2A2725` selon le péril. Aucun modèle nouveau. |
| **Le fil** | Le ruban d'accent à chevrons qui existe déjà pour les routes. |
| **Les fils des autres** | Le même ruban, fin : à l'encre pour les rivaux, en céladon pour les associés. Le céladon est la seule teinte ajoutée. |
| **Les passages** | Une tour dans le kit, à la manière du fort de la Terraferme, avec le pavillon de celui qui la tient. |
| **Les pièces de la Manœuvre** | Les figurines existantes (véhicules, galères) sur leur socle de couleur. |
| **Les pétales, l'échelle, le fil des nouvelles** | Porcelaine, papier, encre et le rouge pour la seule action mise en avant. |

## 13. Ce qui est retiré

Les quatre onglets, les docks et les fiches en feuille ; les livraisons une à une, la Remise et les modules de véhicule ; la Porta, Rome, les reliques, l'antiquaire ; la Terraferme, la Bataille, la Contesa, le Campo ; le Carnet, les ères ; la Faveur, les Sceaux, la Gloire, la Puissance ; les chantiers de plusieurs jours ; les plateaux en hexagones.

Ce qui en reste : le rendu, les modèles, le moteur de base (montants, grand livre, stocks, production à la lecture), le simulateur, la manière de travailler.

## 14. Le chemin

Une étape à la fois, chacune avec son plan validé, ses tests d'abord pour le moteur, et le simulateur pour tout équilibrage.

| # | Étape | Ce qu'elle livre | Réussie quand |
| --- | --- | --- | --- |
| 1 | **La Manœuvre, en prototype** | Le moteur pur de la Manœuvre, des robots qui la jouent, un laboratoire jouable dans le rendu de Porcellana, vingt passages de test | Le porteur et quelques testeurs en redemandent après vingt parties ; les robots mesurent qu'aucune garde n'est imbattable ni gratuite |
| 2 | **La planche et les fils, au simulateur** | Un monde de 100 Maisons robots sur six semaines : fils, demande commune, passages, marée | Les fils bougent (une raison de retendre à chaque visite) ; aucune stratégie unique ne domine ; l'économie tient sur quatre marées |
| 3 | **L'île** | Le domaine actuel porté sur la planche commune : terrains, voisinages vus avant la pose, quai | Deux îles de même niveau diffèrent |
| 4 | **Les fils et les villes, à l'écran** | Tirer, reprendre, le sens et la marchandise ; les jauges ; les fils des autres | Une visite de cinq minutes contient une vraie décision |
| 5 | **Les passages** | Payer, forcer, tenir ; disposer sa garde ; les sceaux | Un passage change de main sans que personne ne soit lésé hors de sa mise |
| 6 | **L'interface sans menu** | Pétales, échelle, fil des nouvelles, lieux ; les tutoriels | Un nouveau joueur tend son premier fil en moins d'une minute, sans texte d'aide |
| 7 | **La marée et les mondes** | La montée, la fin, le regroupement par niveau | Une marée entière jouée en test |
| 8 | **Les compagnies** | Passages tenus à plusieurs, Manœuvre à deux, fil commun | — |
| 9 | **Bêta** | Retest par les profils de l'audit du 7 novembre | Moyenne d'au moins 7,5 sur 10 |

Les plans en cours (publication, Terraferme, Porta, ateliers) sont **gelés** dès la validation de ce cadrage, sauf correctifs.

## 15. La technique

Ce qui reste non négociable : montants en entiers et taux en points de base ; tout mouvement de monnaie par le grand livre, tout mouvement de stock par les mouvements de stock ; `world_id` sur toute table du monde ; la logique dans `packages/engine`, pure et testée ; les réglages dans `worlds.settings` ; la production calculée à la lecture.

Ce qui est neuf : la demande d'une ville est partagée, donc toute livraison est une transaction sérialisée par (monde, ville, marchandise), comme les opérations de marché aujourd'hui. Une Manœuvre est une suite de coups rejouable : le serveur la valide en la rejouant.

## 16. Les questions ouvertes

1. **La taille d'un monde** : 60 à 120 Maisons, robots compris. À fixer à l'étape 2.
2. **L'intérieur des ateliers** (décision du 6 novembre) : gardé tel quel au cran « Atelier », réservé au métier de la Maison, ou retiré ? *Proposé : réservé au métier.*
3. **Les prises** : la moitié de la cargaison perdue va à celui qui tient la tour. Est-ce encore « on ne te vole pas » ? *Proposé : oui, puisque l'attaquant a choisi de l'engager.*
4. **Le nombre de passages tenus** par Maison : deux. À mesurer.
5. **La famille et le personnel** : absents de ce cadrage. *Proposé : y revenir après l'étape 5, comme capitaines de convoi et gardiens de tour.*
6. **L'histoire** (Milan, le Turc, 1453) : portée par les puissances qui tiennent les passages et par la marée. Faut-il des marées à thème ? *Proposé : oui, après la bêta.*
7. **Les joueurs actuels** : y a-t-il des Maisons en production à reprendre sur la nouvelle planche (la bascule `EMPIRE_FROM` dépend du porteur) ? Si oui, que garde-t-on : l'île et ses ateliers, au minimum.
8. **Le nom des choses** : fil, bobine, passage, Manœuvre, cloche, marée, pétales. À confirmer avant d'écrire les textes.
