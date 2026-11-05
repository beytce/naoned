# Expertise : la Porta et la lisibilité visuelle du plan de profondeur (5 novembre 2026)

*Deux regards réunis : un designer de jeux tactiques et de builds (Into the Breach, FTL, Darkest Dungeon, Slay the Spire, Kingdom Rush, les Red Stars d'Hades' Star) et un designer UX et visuel de jeux de gestion mobiles (Mini Metro, Islanders, Townscaper, Against the Storm, Hades' Star, Frostpunk). Ils ont lu `docs/plan-profondeur-2026-11-05.md` (version 2, validée, pas encore codée), `docs/plan-porta.md`, le moteur de bataille (`packages/engine/src/empire/porta/battle/sim.ts`, `ai.ts`, `map.ts`, `arms.ts`, `settings.ts`, les réglages de Venise), les écrans (`apps/web/src/empire/porta/BattleDiorama.tsx`, `Battle3D.tsx`, `ArmsDock.tsx`, `PortaDock.tsx`) et `docs/design.md`.*

*Ce document est un avis. Il ne décide rien : chaque proposition attend le porteur, au moment de son lot. Les valeurs sont indicatives, à régler dans `worlds.settings.porta`.*

---

# Partie A. La Porta : du contre à la décision

## A.1 Le constat sur le plan (§ 4)

Le plan va dans le bon sens : un type de dégâts par arme, une protection par adversaire, une reconnaissance avant d'entrer, des combattants à rôle. Mais tel qu'il est écrit, **il produit une réponse plutôt qu'une décision**. Sept points le montrent.

### 1. La poudre n'a pas de mauvais adversaire

Dans la table du § 4.3, aucune protection ne résiste à la poudre, et deux lui sont faibles (plates, pavois). Le choc a le même profil, en mêlée.

Conséquence : « artilleur + piquier + transport » devient le build par défaut dès trois places. Il bat les pavesiers, les hommes d'armes et le Gonfalonier, et le piquier couvre la cavalerie. Le seul cas où il perd, les arbalétriers, se règle déjà par la portée (point 2).

**Une table de contres n'est une décision que si chaque type de dégâts a au moins un mauvais adversaire**, et si chaque adversaire a au moins un type qui le bat et un qui le rate.

### 2. La couleuvrine bat les arbalétriers sans risque

C'est déjà vrai dans le moteur :
- l'arbalétrier de Rome a 2 cases de portée et une vitesse nulle (`venice1450.empire.ts`, `crossbowman`) ;
- la couleuvrine a 3 cases de portée.

Elle les tue donc **sans jamais être touchée**. Le § 4.3 l'écrit comme un contre (« la couleuvrine, qui tire de plus loin qu'eux »), mais un contre qui ne coûte rien n'est qu'une solution. Il faut un prix : un temps de mise en batterie, une portée minimale, ou des arbalétriers sur une tour, qui gagnent une case de portée (§ 4.5, les collines).

### 3. « Le piquier protège ce qui est derrière lui » n'a aucun moyen d'exister

L'IA de Rome (`ai.ts`, `threatOf`) vise **le plus de dégâts par seconde**. L'artilleur sera toujours visé, et le piquier jamais. Le piquier n'interpose rien : les positions sont continues, et rien ne bloque un passage. Sans **zone de contrôle** ni **provocation**, un rôle de protecteur n'existe pas (proposition P3).

### 4. Le « de face » et le « de flanc » n'existent pas dans le moteur

Les unités n'ont **pas d'orientation** (`types.ts` : `x`, `y`, rien d'autre). Le grand pavois « de face » demande une règle d'orientation, et un dessin qui la rende évidente au toucher (P2).

### 5. Il manque des éléments à la table

- **Le feu** n'a ni force ni faiblesse : il n'apparaît dans aucune protection.
- **Les piques** contrent la cavalerie (§ 4.3, chevau-légers), mais aucune arme n'est « pique » : les hallebardes sont tranchantes.
- **La cavalerie du joueur porte la protection « cheval », faible au perçant** : elle devrait perdre contre les arbalétriers, qu'elle est censée battre. Le plan compte sur la vitesse, sans règle qui l'exprime (P1, la portée minimale).
- **Les dégâts de Rome ne sont pas typés.** Le choix des défenses du joueur (maille, plates) n'a donc rien sur quoi se régler.

### 6. Le verdict vert, ambre, rouge risque de faire le travail à la place du joueur

Si la carte de reconnaissance dit « vert » pour chaque garnison, le joueur n'a plus qu'à changer de pièce jusqu'à tout voir en vert. Sa réflexion devient un remplissage de cases. Le verdict doit **expliquer** (trois pastilles : je le blesse, il me blesse, qui tire de plus loin) au lieu de **conclure** (P5).

### 7. La charge ne contraint rien si la vitesse ne compte pas

Le plan dit : trop chargé, on ralentit. Mais avec un minuteur de 10 minutes, généreux aux premiers paliers, et des garnisons fixes, ralentir coûte peu. Tout le monde prendra les plates. La charge doit être **un plafond dur avec une petite marge**, et la vitesse doit compter (chasse au transport, incendiaire, objectifs chronométrés : P6, P8).

### Le verdict

- **Il y a un build dominant** (artilleur et piquier), et un contre gratuit (la couleuvrine contre les arbalétriers).
- **Il manque trois choses** pour une vraie décision :
  1. une table où chaque type de dégâts perd quelque part ;
  2. une raison de **ne pas tout faire** sur la carte (choisir ses villes) ;
  3. un contrôle sur **qui Rome vise**. C'est là que vit le geste tactique, comme les intentions affichées d'Into the Breach.

---

## A.2 Les propositions

### P1. Une table de contres fermée : chaque type gagne et perd

**Quatre dégâts et le feu en état.** Le feu devient un **état** plutôt qu'un type de coup : il brûle et il gêne. Il est puissant contre le bois (pavois, palissades) et contre les chevaux, qui paniquent.

**Les multiplicateurs** (dégâts reçus, en points de base dans les réglages) :

| Dégâts → / Protection ↓ | Aucune | Maille | Plates | Pavois (de face) | Pavois (de flanc) | Cheval |
| --- | --- | --- | --- | --- | --- | --- |
| **Perçant** (arbalètes, arcs) | ×1,25 | ×1,0 | ×0,4 | ×0,2 | ×1,25 | ×1,5 |
| **Tranchant** (épées, hallebardes) | ×1,25 | ×0,5 | ×0,5 | ×0,8 | ×1,0 | ×1,0 |
| **Choc** (masses, lances couchées) | ×1,0 | ×1,25 | ×1,5 | ×1,0, et le pavois tombe 3 s | ×1,25 | ×0,75 |
| **Poudre** (couleuvrine, bombarde) | ×1,0 | ×1,0 | ×1,75 | ×1,75 | ×1,75 | ×0,5 (le boulet arrive où le cavalier était) |
| **Feu** (état : 8 s de brûlure) | ×1,0 | ×1,0 | ×0,6 | ×1,5 (bois) | ×1,5 | ×1,0, et le cheval fuit 2 s |

**Vérifications :**
- chaque ligne a au moins un ×0,5 ou moins : le perçant contre les plates et le pavois de face ; le tranchant contre la maille ; le choc contre le cheval ; la poudre contre le cheval ; le feu contre les plates ;
- chaque colonne a au moins un ×1,5 ou plus.

**Les règles qui donnent un prix à la force :**
- **La portée minimale** (règle générale du tir) : une arme à distance ne tire pas à moins de 0,6 case. L'arbalétrier pris au contact ne fait plus rien : c'est ce qui permet à la cavalerie de battre les arbalétriers, malgré « cheval faible au perçant ». Elle doit **fermer la distance** sous une ou deux salves.
- **La mise en batterie** : la couleuvrine, et la bombarde de Rome, tirent 3 s après s'être arrêtées. Bouger la défait.
- **Le temps de vol** : un boulet met environ 0,6 s à arriver, et frappe **le point visé**. Ce qui bouge vite l'esquive. C'est la ligne « cheval ×0,5 » rendue visible : le boulet tombe derrière le cavalier.

**Rome reçoit des types**, pour que la défense se choisisse :

| Unité de Rome | Protection | Dégâts | Trait |
| --- | --- | --- | --- |
| Arbalétriers | Aucune | Perçant, en salve toutes les 3 s | Portée 2 ; portée minimale |
| Pavesiers | Pavois (de face) | Tranchant, faible | **Couvrent les arbalétriers à moins d'une case derrière eux** : le perçant ×0,3 contre ceux-ci, de face |
| Hommes d'armes | Plates | Tranchant | Lents ; frappent fort |
| Chevau-légers | Cheval | Choc ; la première frappe après une course double ses dégâts | Chassent les transports |
| Bombarde | Aucune, fragile | Poudre, en zone | Mise en batterie ; portée minimale de 1 case |
| Gonfalonier | Plates | Tranchant qui monte sur la même cible | Change de cible toutes les 20 s |
| Incendiaire | Maille | Feu, sur les villes | Brûle les coffres |

**Les défenses du joueur répondent à ces types :**
- la maille, contre le tranchant (hommes d'armes, Gonfalonier) ;
- les plates, contre le perçant et le tranchant, mais lourdes ;
- le mantelet (le pavois actif), contre le perçant de face ;
- **les piques plantées** (accessoire du piquier) : le choc de charge annulé et renvoyé au cavalier ;
- **la dispersion** contre la poudre : rien à équiper, un placement.

### P2. Le « de face » réglé simplement, et dessiné au sol

**La règle.**
- Une unité **regarde sa cible** ; sans cible, elle regarde **la porte**, l'entrée des envahisseurs.
- Le pavois couvre un **cône de 120°** devant elle.
- Pour attaquer de flanc, il faut **deux unités** : une qui fixe de face, une qui contourne. C'est un marteau et une enclume, lisible et ancien.

**Ce qu'on voit.**
- Au sol, devant chaque pavesier, **un arc de bois clair** (le cône) qui tourne avec lui.
- Le véhicule choisi qui entre dans le cône voit **son épingle d'arrivée** prendre un **éclat brisé** (« vos traits rebondiront ici »).
- Hors du cône, l'épingle porte **une flèche pleine**.

Le joueur n'a rien à calculer : il voit où se poser. C'est le même geste que le déplacement à la manière des Sims : on touche, on voit l'arrivée, et l'arrivée dit si c'est un bon endroit.

### P3. Contrôler qui Rome vise : provocation et zone de contrôle

C'est le cœur tactique qui manque : **le joueur doit pouvoir décider qui encaisse**.

- **La zone de contrôle du piquier** (« hérisson »), 1 case : une unité de Rome **au contact** qui y entre s'arrête et doit la traverser en combattant. Elle ne passe pas. Le piquier devient un mur qu'on place.
- **Le défi** (accessoire « bannière de défi », ou trait natif du piquier) : +400 de menace dans `threatOf` pour toute unité de Rome à 2 cases. Les hallebardiers et le Gonfalonier le préfèrent à l'artilleur, au prochain **réexamen**.
- **Le réexamen se voit** : le moteur le connaît déjà (`reviewS`, `reviewAt`). Chaque unité de Rome a un **trait fin vermillon vers sa cible** et une **petite horloge** qui se vide jusqu'au réexamen.

  Le joueur apprend à faire lâcher une cible : sortir de la portée avant que l'horloge tombe, ou provoquer juste avant. **Into the Breach** : on lit l'intention, on joue contre elle.
- **L'IA reste lisible** :
  - les arbalétriers visent le plus proche ;
  - les hommes d'armes visent la plus grande menace ;
  - les chevau-légers visent le transport ;
  - le Gonfalonier vise **le plus blessé**, en 20 s.

  On le lit sur une carte d'unité au toucher, en une phrase et une icône d'œil.

### P4. Moins de villes que de quoi les prendre : choisir sa route

Inspiré des cartes de Slay the Spire et des Red Stars : une bataille de 10 minutes ne doit **pas** permettre de vider toutes les villes. Le build sert à **choisir lesquelles prendre**.

**Les garnisons par compagnie.** Chaque ville tire **une compagnie** (un archétype), visible dès la reconnaissance :
- les pavesiers génois : pavois et arbalétriers ;
- les lances de Romagne : hommes d'armes ;
- les stradiots : cavalerie ;
- la batterie : une bombarde et sa garde ;
- l'arrière-garde : peu de monde, des reliques communes.

**Les reliques suivent la difficulté.** Les compagnies dures gardent les reliques précieuses, mais elles sont souvent sur le même axe : une **route** se dessine.

**La règle des 70 %.** Le minuteur et les distances sont réglés pour qu'un équipage moyen fasse environ **60 à 70 % des villes**. Un équipage bien construit pour la carte en fait 80 %.

**La décision devient** : « j'amène deux artilleurs et je prends l'axe des génois et des lances, riche ; ou un cavalier et je ratisse les petites villes et la batterie isolée ».

### P5. La reconnaissance qui explique, et un choix de portes

**Avant d'entrer, trois portes.** Au dock de la Porta, le palier choisi propose **trois cartes de porte**, comme les nœuds d'une carte de Slay the Spire :
- leur graine est tirée et **fixée pour la journée** : on ne relance pas en sortant et en rentrant ;
- chaque carte montre sa silhouette d'île, ses compagnies en figurines, son affixe (P7) et sa rareté dominante.
- « Porte de Ferrare : génois ×2, lances ×1, pluie. Précieuses. »

**Le verdict en trois pastilles** sur chaque garnison, une fois l'équipage posé, au lieu d'une couleur unique :

| Pastille | Question |
| --- | --- |
| Lame | Est-ce que je le blesse ? Mon meilleur multiplicateur contre sa protection |
| Écu | Est-ce qu'il me blesse ? Ses dégâts contre ma meilleure défense |
| Œil | Qui tire de plus loin ? |

Chacune a trois états, chacun avec **sa forme et sa couleur** : vert d'eau et coche, crème et trait, cinabre et croix. Le joueur voit **pourquoi** il perd, et quelle pièce change quoi.

**Le brouillard.** Aux paliers 4 à 6, une ou deux villes sont « ? », des figurines voilées. **L'éclaireur** (accessoire, ou prospection de la Compagnie) les révèle.

**L'armurerie de campagne.** On rééquipe **au quai de la Porta** entre deux batailles, avec ce qu'on possède, gratuitement.

C'est indispensable : aujourd'hui, la pose est grisée hors de la Remise (`design.md`, § La Porta). Une reconnaissance sans rééquipement sur place ne sert à rien.

### P6. Les combattants : des profils nets, une charge en crans

**Une charge en crans**, dessinée comme des **sacoches** sur la selle ou l'affût :

| Combattant | PV | Vitesse | Charge (crans) | Natif | Places |
| --- | --- | --- | --- | --- | --- |
| Cavaliers | 1 000 | 7 | 4 | Charge : la première frappe après une course de 1,5 case est doublée | Arme, accessoire |
| Piquiers | 2 400 | 3 | 7 | Hérisson (P3) | Arme, défense, accessoire |
| Artilleurs | 1 200 | 2,5 | 6 | Mise en batterie ; portée 3 | Arme, défense, accessoire |
| Arbalétriers | 1 100 | 4 | 5 | Salve sur tous les ennemis à portée ; portée minimale | Arme, défense, accessoire |
| Transport | 800 | 5 | — | Charge les reliques | Un accessoire de transport (crochets, bâche, mules de relais) |

**Les poids** (indicatifs) :
- maille 1, plates 3, mantelet 2 ;
- étendard 1, chirurgien 2, fumée 1, trompette 1, poudre en plus 2.

**Le dépassement.** Un cran au-delà de la charge est permis, à −25 % de vitesse. Deux crans au-delà sont interdits. Un cavalier en plates (3 crans sur 4) n'a plus de place pour un accessoire : il perd sa charge.

**Le niveau des pièces.** Un composant amélioré appartient **à l'armurerie de la Maison**, par type ; les copies sont bon marché, par exemple 30 % du prix d'achat.

Raison : expérimenter doit être gratuit, sinon le joueur ne change jamais de build. Hades' Star y perd beaucoup de joueurs, qui n'osent pas réinvestir. Et la Puissance (règle d'or 6) se calcule sur les niveaux possédés, pas sur la pièce posée : changer de build ne change pas de bande.

### P7. Des synergies qui demandent un placement, pas un chiffre

Chaque synergie a une **condition spatiale visible** :

| Synergie | Condition | Effet indicatif | Ce qu'on voit |
| --- | --- | --- | --- |
| **Le mur** | Artilleur à moins d'une case derrière un piquier, par rapport à l'ennemi | Le perçant ×0,6 contre l'artilleur | Un trait de bois relie les deux socles |
| **Marteau et enclume** | Un allié fixe une unité de face, un autre la frappe de flanc | ×1,25 de flanc, en plus du pavois contourné | Un éclat doré sur le coup de flanc |
| **L'étendard** | Alliés à 1,5 case du porte-étendard | +20 % de dégâts | Un disque d'or pâle au sol ; un allié dedans porte un fanion |
| **Fumée et transport** | Fumée lancée près du transport qui charge | Le chargement continue, invisible | Le nuage couvre le coffre, la jauge continue |
| **La batterie gardée** | Deux artilleurs à moins d'une case | Leurs salves partent ensemble et brisent le pavois 3 s | Un cordeau de mèche entre les deux affûts |
| **La traque** | Cavalier qui suit le transport (ordre « escorter ») | Interception : +50 % contre les chevau-légers qui visent le transport | Une longe pointillée entre les deux |

**L'effet doit se voir avant de se lire** : un trait, un disque, un fanion. Un bonus sans dessin n'existe pas pour le joueur.

### P8. La rejouabilité : cartes, affixes, objectifs secondaires

**Des terrains par région** (le décor du diorama change, et les règles du § 4.5 avec lui) :
- la Romagne des marais : des gués, la cavalerie lente dans l'eau ;
- l'Apennin des cols : des passages étroits, le hérisson y devient roi ;
- l'Ombrie des forêts : la vision réduite, la fumée inutile ;
- les marches de l'Adriatique : la côte, et une **galère de Rome** qui bombarde le littoral.

**Les affixes de la semaine** (secondaires, comme le veut le § 4.6 : ils changent la carte, jamais la table). Un affixe par porte, deux au palier 6 :

| Affixe | Effet |
| --- | --- |
| Pluie | La poudre a 30 % de ratés ; le feu ne prend pas |
| Nuit | La vision de tous −1 ; les feux de camp des villes se voient de loin |
| Jubilé | Des pèlerins neutres sur les routes, qui bloquent et ralentissent |
| Pont rompu | Un seul gué |
| Bannières levées | Les garnisons s'alertent d'une ville à l'autre |
| Trêve de Dieu | Le minuteur à 8 min ; les reliques ×1,25 |

**Les objectifs secondaires**, un par bataille, tirés de la graine, chacun avec **sa marque sur la carte** :
- **Le marchand captif** : le libérer, puis l'escorter à la porte comme un deuxième transport fragile. Récompense : une relique rare garantie.
- **La poudrière** : la faire sauter au feu. Les bombardes de la carte se taisent 2 minutes.
- **Le bréviaire du Gonfalonier** : le tuer **avant 5 minutes** donne des plans.
- **Les cloches** : abattre le clocher d'une ville empêche ses voisines de s'alerter.

### P9. Le micro sur téléphone : peu de boutons, au bon endroit

**Le plateau des portraits.** Au pied de l'écran, **un portrait rond par unité**, jusqu'à 4, de 56 px :
- un anneau de PV autour : crème, cinabre sous 30 % ;
- les sacoches de cargaison pour le transport ;
- un toucher choisit l'unité ;
- un double toucher centre la caméra.

**Les actifs au-dessus du portrait choisi**, en éventail : au plus deux boutons ronds, chacun avec **sa recharge en arc**. On n'affiche pas les actifs de tous à la fois.

**Les ordres de contact**, sans tracé :
- toucher une unité, puis une autre de ses unités : **escorter** (elle la suit à 0,8 case) ;
- toucher une unité, puis une unité de Rome : **cibler** (elle force sa cible, ce que le tir automatique ne fait pas aujourd'hui) ;
- toucher une unité, puis un coffre : **charger** (pour le transport).

**Les actifs programmés** : un appui long sur une épingle d'arrivée permet d'y attacher un actif (« lever le mantelet en arrivant »). L'icône de l'actif se pose sur l'épingle.

**Le ralenti tactique**, en solo seulement : tant qu'une unité est choisie et qu'aucun ordre n'est donné, le temps passe à ×0,5. Sans pause en groupe, comme dans Hades' Star.

**Les réflexes** (une option par actif, sur la carte du composant) :
- « chirurgien auto sous 50 % » ;
- « mantelet auto quand une salve arrive ».

Ils sont efficaces à 80 % de ce que donne un lancement à la main : le bon joueur reste meilleur, mais le joueur pressé n'est pas puni.

### P10. La progression : plans, reliques-trophées, vétérans

- **Les plans** restent la seule voie des niveaux 4 et 5 (règle d'or 5), mais ils deviennent **orientés** :
  - un plan de « pique » ou de « poudre » plutôt qu'« arme » ;
  - et donc on déchiffre ce que son style demande.
- **Les reliques nommées** : une légendaire sur cinq est une **relique unique**, comme une relique de Slay the Spire. On peut la garder comme **trophée d'équipage** (une place par équipage) au lieu de la vendre :
  - « Le Clou de Ravenne : le transport charge 20 % plus vite » ;
  - « La Dent de saint Marc : la première salve de chaque bataille est doublée ».

  Elle se voit sur la figurine : un reliquaire au flanc du transport, un fanion sur la lance.
- **Les vétérans**, comme les traits de Darkest Dungeon, mais **sans malus** : un combattant qui ressort de 5 batailles gagne **un trait au choix parmi deux** (« tireur de flanc », « tenace », « éclaireur »). Il porte un galon sur l'épaule.

  À la Porta noire, il peut mourir. C'est là que la règle d'or 2 prend son poids : on choisit de risquer son vétéran.
- **La collection des compagnies vaincues** : un livre des bannières de Rome. Chaque compagnie battue au palier n donne son écusson, et **une ligne de savoir** (« les génois tournent en 6 s »). La connaissance devient progression, ce qui nourrit la communauté de conseils voulue par le porteur.

### P11. Le jeu à plusieurs : des rôles, une carte partagée, des signes

- **La reconnaissance partagée** au salon : chacun voit les équipages des autres poser leurs pastilles. Une garnison couverte par un coéquipier se marque **à sa couleur**. On compose à plusieurs : « je prends la poudre, toi la cavalerie ».
- **Les synergies entre joueurs** : l'étendard, le mur, marteau et enclume valent aussi entre coéquipiers. Le Gonfalonier en groupe devient un vrai combat à rôles (un qui provoque, un qui soigne, deux qui frappent), comme les Red Stars au haut niveau.
- **Les signes**, sans clavier : un appui long sur la carte ouvre une **rose de quatre signes** :
  - « j'y vais » (épingle à sa couleur) ;
  - « à l'aide » (cloche) ;
  - « danger » (croix cinabre) ;
  - « je charge ici » (coffre).
- **Les reliques restent à chacun** (comme aujourd'hui). Pour rendre l'escorte d'un autre transport intéressante, ajouter une **prime d'escorte** : une relique sortie par un coéquipier qu'on a escorté plus de 30 s donne 1 point au classement de l'escorte.

### P12. Tester l'équilibre avant de coder l'écran

- Le moteur est pur et déterministe : écrire au banc (`porta-bench`) un **tournoi de builds**, de 12 équipages types contre les 5 compagnies et les 4 terrains.
- **Critère de santé** : aucun build ne doit gagner plus de 70 % des matchups. Le meilleur build de chaque compagnie doit être différent pour au moins 4 des 5.
- **Bot de référence** : il faut un bot qui sache faire marteau et enclume, sinon le banc ne mesure que la force brute.

---

## A.3 Résumé de la partie A

| # | Proposition | Ce qu'elle règle | Lot du plan |
| --- | --- | --- | --- |
| P1 | Table fermée, portée minimale, mise en batterie, temps de vol | Build dominant, contre gratuit | 8 |
| P2 | Orientation, cône du pavois dessiné | « De face » impossible aujourd'hui | 8 |
| P3 | Hérisson, défi, réexamen visible | Pas de rôle de protecteur | 8 |
| P4 | Compagnies, règle des 70 % | Pas de raison de choisir ses villes | 8 |
| P5 | Trois portes, verdict à trois pastilles, armurerie de campagne | La reconnaissance qui conclut ou ne sert pas | 8 |
| P6 | Charge en crans, armurerie de Maison | La charge sans contrainte, le prix d'expérimenter | 9 |
| P7 | Synergies spatiales dessinées | Les synergies invisibles | 9 |
| P8 | Terrains, affixes, objectifs secondaires | Rejouabilité | 9 et suite |
| P9 | Portraits, éventail, ordres de contact, réflexes | Micro à quatre unités sur téléphone | 9 |
| P10 | Plans orientés, trophées, vétérans, livre des bannières | Progression et savoir | Suite |
| P11 | Reconnaissance partagée, rose des signes, prime d'escorte | Le groupe | Suite |
| P12 | Tournoi de builds au banc | Vérifier l'absence de dominance | 8 et 9 |

---

# Partie B. La lisibilité visuelle de tout le plan

## B.1 Trois principes

### 1. On montre l'exception, pas l'état

Sur la carte, **on ne montre que ce qui s'écarte du normal** :
- un atelier qui tourne bien est un atelier, sans jauge ;
- un atelier arrêté, à qui il manque une matière, ou qui déborde, porte **un seul signe** (B.3).

C'est la leçon de Frostpunk et d'Against the Storm : l'écran calme est un écran qui va bien.

### 2. Trois distances, trois quantités d'information

| Distance | Ce qu'on voit | Taille d'un signe |
| --- | --- | --- |
| **La carte** (empire entier) | Lieux, routes, véhicules, et **les exceptions** (au plus un signe par lieu) | 18 à 24 px |
| **Le lieu** (fondaco et domaine, ville, gisement, île de la Porta) | Les objets réels : caisses, figurines, outils, chemins | 10 à 16 px par objet, sans texte |
| **Le toucher** (le dock) | Les chiffres, une décision, l'effet avant le coût | Texte et icônes à 16 px et plus |

**Un chiffre n'apparaît jamais à la distance de la carte.** Au lieu, un chiffre n'apparaît que sur l'objet touché.

### 3. Les lentilles plutôt que tout à la fois

Les vues qui se superposent (flux, terroir, nuisances, capacité) sont des **lentilles**. Une seule à la fois, ouverte par un médaillon du plateau du bas, refermée d'un toucher. Hors lentille, le domaine est un diorama calme.

Il y a quatre lentilles :
- **Flux** : les chemins des marchandises et leurs goulots ;
- **Terroir** : les cases bonnes ou mauvaises pour l'atelier qu'on pose ;
- **Bras** : les postes pleins ou vides, et les ouvriers libres ;
- **Place** : le remplissage du magasin, des camps et des soutes.

---

## B.2 Mécanique par mécanique

| Mécanique | Sur la carte (repos) | Au lieu | Au toucher (dock) | Risque de surcharge | Caché par défaut |
| --- | --- | --- | --- | --- | --- |
| **Magasin** (§ 2.1) | L'**anneau à crans** autour du fondaco, visible seulement au-delà de 80 % ; le signe de **débordement** s'il refuse | Les piles de caisses sur le quai, en taille d'encombrement ; les piles à jeter du jour en bord de quai | L'étagère : rayonnages par encombrement (gros en bas, fins en haut), cerclages, **cercle d'or** sur ce qu'une commande réclame ; glisser vers la lagune pour jeter, vers la Dogana pour brader | Les piles de 30 marchandises sur le quai | Les quantités : un nombre seulement sur une pile touchée ; au quai, au plus 8 piles, les plus grosses, puis une pile « … » |
| **Périssables** (§ 2.1) | Rien, sauf **l'arc qui se vide** (B.3, signe 4) passé au brun sur un lot qui va se perdre dans les 2 h | Une auréole de fraîcheur sur la caisse | La date de perte en arc, et un bouton « Saler » s'il y a du sel | Une auréole sur chaque caisse | Les auréoles vertes : seules les brunes se montrent |
| **Extraction** (§ 2.2) | Le gisement dessiné (carrière, puits, saline) ; sa **richesse dans le décor** (colline entamée en 3 états) ; un **badge de figurines** (« 5 ») s'il y a une équipe ; le débordement si le tas arrête le camp | Les figurines qui piochent (au plus 5 dessinées, puis « +n ») ; le tas qui monte ; le garde-manger en miches ; le râtelier | Glisser des figurines du domaine vers le gisement (un geste, pas un formulaire) ; le rendement **décroissant dessiné** : chaque figurine ajoutée fait monter le tas d'un bloc plus petit | Les camps éloignés hors de l'écran | Le chiffre de richesse : le décor suffit ; les gisements non prospectés sont des **« ? » au sol**, sans détail |
| **Ouvriers et table** (§ 2.3) | Rien. La table pauvre se signale par **une assiette vide**, seulement si elle ralentit le domaine | Les silhouettes de postes sur chaque atelier (pleines ou vides) ; les petits personnages le matin ; l'assiette et la cruche au-dessus des maisons | Un atelier touché : ses postes en silhouettes, glisser un ouvrier dedans ou dehors ; les artisans avec **un outil d'or** dans la main | Des dizaines de personnages qui marchent | Les trajets, montrés une fois au lever du jour du jeu puis estompés ; la lentille **Bras** pour tout voir |
| **Chaînes et restes** (§ 2.4) | Rien | Des charrettes entre les ateliers ; des **caisses creuses qui clignotent** quand un intrant manque ; les restes en tas dans la cour | Le médaillon d'une marchandise : la lentille **Flux** trace son chemin, et le goulot **rougit** | Un plat de spaghettis de chemins | Les flux sous la lentille seulement ; hors lentille, au plus une charrette par lien |
| **Qualité** (§ 2.5) | Rien | Le **cerclage** sur les caisses (aucun, argent, or) | Une commande qui exige du fin : sa caisse cerclée ; l'atelier dit ce qu'il sort par **la caisse à sa porte**, cerclée | Le conflit avec l'écu de la Porta (voir B.3) | Rien de plus : le cerclage est déjà discret |
| **Plan du domaine** (§ 2.6) | La rivière et son sens (de petits chevrons dans le courant) ; **le voile brun** en aval d'une nuisance ; les panaches | Les terroirs sur les tuiles | En posant un atelier : chaque case candidate porte **un chiffre signé et une couleur** (+2 vert d'eau, −1 cinabre), à la manière d'Islanders ; les voisins touchés s'allument | Les aperçus sur toutes les cases | L'aperçu n'existe que pendant la pose ; la lentille **Terroir** au besoin |
| **Outils** (§ 2.7) | Rien, sauf le signe de **l'usure** (un outil fêlé) quand l'atelier va s'arrêter | Le râtelier, en trois états : neuf, terni, fêlé | Remplacer : glisser un outil de la forge vers le râtelier | Un râtelier par atelier | Les râteliers neufs et ternis : seul le fêlé se montre de loin |
| **Villes : goûts, échéances** (§ 3.2) | L'enseigne de la ville avec **ses 2 ou 3 marques** de prédilection ; l'anneau de commandes posé au sol (déjà fait) ; **l'arc qui se vide** sur la commande la plus pressée seulement | Les caisses sur son quai, avec leur arc et leur cerclage | Les commandes en cartes, triées par échéance ; « Prendre » ajoute la caisse à la tournée | Toutes les échéances de toutes les villes | Les commandes qu'on ne peut pas servir sont grisées et petites ; une ville sans commande pressée ne montre que son enseigne |
| **Contrats** (§ 3.2, 3) | Le chantier 3D sur la ville (l'Arena en échafaudages), qui monte | Le chantier en coupe : trois piles creuses (marbre, bois, fer) qui se remplissent | La part de chaque véhicule dans la livraison | — | — |
| **Tournées** (§ 3.2, 4 à 6) | Les véhicules et **leur épingle d'arrivée** (comme à la Porta) ; la route en or pour la tournée choisie ; le **terrain sur la route** (eau, lacets) | — | La **frise** : une case par arrêt, la soute en grille sous chacune ; le temps de chaque tronçon ; un tronçon lent en pointillé | La frise trop longue sur un écran étroit | Au-delà de 4 arrêts, la frise défile ; la grille de soute se réduit à une **barre à crans** sur petit écran |
| **Porta : reconnaissance** (§ 4.2) | La Porta et ses **trois portes du jour** en éventail | L'île de la porte choisie en miniature, les compagnies en figurines, leur écu au-dessus | Composer l'équipage sur la carte ; les **trois pastilles** sur chaque garnison (P5) | Les pastilles sur toutes les garnisons | Les pastilles de la garnison touchée en grand ; les autres en un seul point (le pire des trois) |
| **Porta : équipement** (§ 4.4) | — | À la Remise et au quai, **la figurine s'habille** ; les sacoches de charge | Les places en prises colorées (déjà fait : `KIND_HEX`) ; l'aperçu contre la porte choisie se met à jour | Trop de statistiques par pièce | Chaque pièce : son **icône de dégâts ou de protection**, son poids en crans, et une ligne d'effet ; le détail au toucher long |
| **Porta : bataille** | L'île ; les figurines ; les épingles ; **le trait de visée et l'horloge de réexamen** de Rome (P3) | — | Les portraits et l'éventail des actifs (P9) | Traits, cônes, disques, épingles à la fois | Les cônes du pavois et les horloges : seulement pour les unités de Rome **à 3 cases du véhicule choisi** |

---

## B.3 La grammaire visuelle : douze signes

Chaque signe a **une forme**, une couleur de base, **un seul sens**, et s'emploie partout. La couleur ne porte jamais le sens seule : la forme suffit en noir et blanc, et pour les daltoniens.

| # | Signe | Forme | Sens unique | Où on le trouve |
| --- | --- | --- | --- | --- |
| 1 | **La marque** | Rond, carré, hexagone, losange (déjà `GoodsMark`) ; la couleur de la chaîne | **Quoi** : la marchandise et son étape | Partout |
| 2 | **La caisse à taille** | La marque posée sur un cube de 1, 2 ou 3 hauteurs, ou en demi-cube | **Combien de place** : l'encombrement | Magasin, soute, camp, frise de tournée |
| 3 | **Le cerclage** | Un liseré autour d'une caisse ou d'une relique : aucun, argent, or, or avec éclat | **Le rang** : la qualité (commun, fin, exquis) et la rareté des reliques (commune, rare, précieuse, légendaire) | Caisses, commandes, reliques, portes de la Porta |
| 4 | **L'arc qui se vide** | Un arc fin qui décroît dans le sens horaire, de crème au brun puis au cinabre | **Le temps qui reste** avant une perte : échéance, fraîcheur, vivres, fermeture de la Porta | Commandes, périssables, garde-manger, minuteur |
| 5 | **L'arc qui se remplit** | Un arc lapis qui croît, vert d'eau quand c'est prêt (déjà la règle Lagune) | **Le travail en cours** : production, chargement d'une relique, chantier, recharge d'un actif | Ateliers, transport, actifs, chantiers |
| 6 | **L'anneau à crans** | Un anneau découpé en segments, chacun plein ou vide ; brique au-delà de 80 % | **La place occupée** : magasin, camp, soute, charge d'un combattant | Fondaco, camps, véhicules, sacoches |
| 7 | **La silhouette** | Une figurine pleine (occupée) ou en creux (libre) ; jusqu'à 5, puis « +n » | **Des bras** : ouvriers, postes, équipes, combattants | Ateliers, camps, maisons, équipage |
| 8 | **Le creux** | Une marque ou une caisse dessinée en creux, qui respire doucement, crème | **Ce qui manque**, sans alerte : intrant attendu, commande non couverte, place libre d'une prise | Ateliers, commandes, places d'équipement |
| 9 | **Le débordement** | Une caisse qui bascule hors de son socle, cinabre | **Bloqué** : magasin plein, camp arrêté, atelier qui ne peut plus verser | Fondaco, ateliers, camps |
| 10 | **Le fil** | Un trait : épaisseur = débit ; plein = rapide, pointillé = lent ; petits chevrons dans le sens ; couleur de la chaîne, or pour le chemin choisi | **Un mouvement** : flux, route, tournée, chemin d'un véhicule | Domaine, carte, Porta |
| 11 | **L'épingle** | Une épingle au sol au point d'arrivée, à la couleur du véhicule, avec un **signe d'état** dans sa tête (flèche pleine, éclat brisé, icône d'un actif programmé) | **Où ça va arriver**, et ce qui l'attend | Véhicules de la carte, unités de la Porta |
| 12 | **L'écu et la pointe** | Un écu (protection) au-dessus d'une unité ; une pointe (dégâts) sur une arme. Cinq glyphes de pointe : flèche, lame, masse, boulet, flamme ; cinq écus : nu, maille, plates, pavois, cheval | **Le contre** : ce qui protège et ce qui frappe | Porta : figurines, pièces, verdicts |

**Les couleurs restent celles de `design.md`, avec leurs rôles stricts :**
- or : à vous, et l'action ;
- vert d'eau : gain, prêt ;
- cinabre : perte réelle ;
- lapis : sélection ;
- crème : neutre, attente.

Le brun de la fraîcheur et le brique de l'anneau plein s'ajoutent, à vérifier au test de contraste (`test/theme.test.ts`).

**Trois conflits à trancher dans le plan actuel :**
1. **L'écu sur la porte de l'atelier** (§ 2.5) pour la qualité entre en conflit avec l'écu de protection de la Porta. → La qualité se lit **par le cerclage de la caisse posée à la porte** (signe 3). L'écu reste à la protection.
2. **Le sablier** des commandes (§ 3.2) fait double emploi avec les arcs (règle Lagune : le temps se lit en arcs). → Il devient **l'arc qui se vide** (signe 4).
3. **Les couleurs de rareté des reliques** (crème, vert d'eau, lapis, or, `RARITY_HEX`) réemploient le vert d'eau (gain) et le lapis (sélection) pour un rang. → Le rang passe au **cerclage** (signe 3) : la relique garde sa forme de coffret, et son liseré dit sa rareté. Le lapis et le vert d'eau retrouvent leur sens.

**Le verdict de contre** (pastilles de P5) utilise les couleurs de gain, d'attente et de perte, **avec une forme** : une coche, un trait, une croix. Ce n'est pas un treizième signe : c'est un état des signes existants.

---

## B.4 Ce qui fait déborder l'écran, et la parade

| Danger | Parade |
| --- | --- |
| Toutes les jauges sur tous les lieux | La règle de l'exception (B.1) : **au plus un signe par lieu** à la carte, le plus grave, dans l'ordre débordement > arc presque vide > creux > usure |
| Les lentilles qui s'additionnent | Une seule à la fois ; ouvrir une lentille ferme l'autre |
| Les figurines par dizaines | Au plus 5 dessinées par groupe, puis « +n » ; les trajets du matin une seule fois |
| Les chiffres partout | Un chiffre seulement sur l'objet touché ; à la carte, jamais |
| La bataille avec 4 joueurs et 16 unités | Les signes de Rome (cônes, horloges, traits de visée) seulement près du véhicule choisi ; les épingles des coéquipiers pâles |
| Le dock qui veut tout dire | Une décision à la fois (déjà la règle du dock), l'effet avant le coût ; le détail d'une pièce au toucher long |
| Les petits écrans (moins de 700 px de haut) | La frise devient une barre à crans ; les portraits passent à 48 px ; l'éventail se réduit au premier actif |
| Le mouvement | Tout le mouvement décoratif coupé en mouvement réduit ; les signes 4, 5, 8 et 9 gardent leur sens sans animation (ils sont des formes, pas des clignotements) |

---

## B.5 L'ordre de mise en place des signes

1. **Lot 1 (magasin)** : signes 2, 6 et 9. Ils servent tout de suite au fondaco, puis aux soutes et aux camps.
2. **Lot 2 (villes)** : le signe 4 (l'arc qui se vide, à la place du sablier) et le cerclage (3), si la qualité est prête ; sinon le cerclage attend le lot 6.
3. **Lot 3 (tournées)** : les signes 10 et 11 sur la carte de commerce, la même épingle qu'à la Porta.
4. **Lots 4 et 5 (extraction, bras)** : le signe 7, et la lentille **Bras**.
5. **Lots 6 et 7** : les lentilles **Flux** et **Terroir**, l'aperçu signé à la pose, le signe 8 généralisé.
6. **Lots 8 et 9 (Porta)** : le signe 12, l'épingle à état, les pastilles du verdict ; les reliques passent au cerclage.

Chaque signe se dessine **une fois**, dans un composant commun (à la manière de `GoodsMark`), et se réutilise : c'est ce qui garantit qu'un joueur qui a appris un signe au fondaco le lit à la Porta.
