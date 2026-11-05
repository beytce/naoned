# Plan : un jeu de gestion qui fait réfléchir (5 novembre 2026, version 2)

*Demande du porteur, après avoir joué : « on produit trop, on a très souvent des stocks surchargés, on peut quasiment faire toutes les commandes en permanence sans aucune difficulté, la production est trop simple. » Il veut que le joueur optimise ses livraisons et ses trajets, que la production offre des optimisations qui ne sont pas évidentes (pas « +x % de cadence »), et que la Porta demande un vrai choix d'équipage et d'équipement selon la carte et les adversaires. Objectif : une communauté de joueurs de gestion qui se posent des questions et se donnent des conseils.*

*« Visuel » veut dire ici : chaque mécanique a une **représentation graphique** (objets, piles, jauges, figurines, flux animés, cartes), pas seulement du texte et des chiffres. Les chiffres accompagnent l'image.*

## 0. Les décisions du porteur

**Première version (5 novembre, au soir) :**
- le fondaco a une limite de stockage, et le joueur choisit ce qu'il jette pour faire de la place à d'autres matières ;
- certaines matières s'extraient : il faut envoyer du personnel les chercher ;
- la production doit être beaucoup plus complexe que la première version de ce plan ;
- les livraisons (P3 de la version 1) : d'accord, à critiquer et à optimiser ;
- la Porta : d'accord. Mais **pas de tracé au doigt** : on choisit un véhicule, on touche l'endroit où il va, et on voit pour chaque véhicule où il va arriver, à la manière des Sims ;
- **le meilleur équipage vient des types d'adversaires**, pas des variantes de la semaine : contre des archers, tel type de combattant ; contre des soldats très protégés, tel autre. Le choix des armes et des accessoires doit être une vraie réflexion.

**Trois règles retirées** (CLAUDE.md, `docs/CADRAGE-v3.md` § 2) :
- la règle d'or 3 : l'absence peut désormais coûter, et un stock plein peut perdre ;
- la règle d'or 4 : ce que les perle peuvent acheter n'est plus borné par une règle d'or ;
- le passage obligé au simulateur de 24 mois : il reste un outil de mesure.

**Déjà fait :**

| Retour | Correction | Où |
| --- | --- | --- |
| Enlever le bouton de la meilleure commande | Carte « le mieux maintenant » retirée | `map/BestNow.tsx` supprimé |
| « Aucun véhicule à quai » alors qu'on en a | Les véhicules restaient au quai de la Porta après une bataille. Le dock de la ville dit désormais où ils sont, avec « Rappeler de la Porta » | `map/logic.ts` (`deliveryPlan`), `map/OrdersPanel.tsx` |
| Impossible de remplir le transport de reliques | Seul le transport charge, et c'est le véhicule de combat qui était choisi. L'étape suivante est dite en or, et la carte du transport et les villes aux coffres battent | `porta/goal.tsx` (`relicStep`) |
| Déplacement à la manière des Sims | Chaque véhicule montre en permanence son chemin et son point d'arrivée : vif pour le véhicule choisi, pâle pour les autres, en lapis pour le combat, en or pour le transport | `porta/BattleDiorama.tsx`, `porta/Battle.tsx` |

## 1. Le diagnostic (rappel)

- **La demande suit l'offre** : les villes commandent surtout ce qu'on produit (`orders.madeWeight` = 3).
- **Les stocks n'ont pas de plafond** : la file de nuit (12 h) remplit le magasin sans limite.
- **La production n'a qu'un axe** : monter le niveau. Les modules en « + % » et le voisinage vont dans le même sens.
- **La tournée n'a qu'un critère** : la soute. Le véhicule rentre à vide, et aucune route ne vaut mieux qu'une autre.
- **La Porta se joue à l'aveugle** : on prend son meilleur véhicule, sans voir contre quoi on part, et sans contre à jouer.

## 2. La production, version 2 : une économie à organiser

Le principe : **chaque marchandise a une histoire**. On l'extrait ou on la récolte quelque part. Il faut des bras et des outils, et elle encombre un magasin plein. Elle se gâte parfois. On la transforme avec d'autres, et elle laisse des restes. Le joueur n'optimise plus un chiffre : il organise un système où **tout se tient**, et où chaque goulot en déplace un autre.

### 2.1 Le magasin du fondaco : la place est la vraie monnaie (décidé)

**La règle.**
- Chaque fondaco a une **capacité en places**, qui monte avec son niveau et avec des **entrepôts** bâtis à côté, sur des cases du domaine qu'on ne donne pas alors à un atelier.
- Chaque marchandise prend une place différente par lot : le marbre et le fer sont **encombrants** (3 places), le bois prend 2 places, la soie, les épices et le verre une demi-place.
- Plein, le fondaco refuse ce qui arrive. Les ateliers qui y versent **s'arrêtent**, et un camp d'extraction garde son tas sur place.
- **Jeter** libère de la place tout de suite. On peut aussi **brader** à la Dogana, pour un faible prix mais pas rien, ou **transférer** vers un autre fondaco, ce qui demande un véhicule.
- **Les denrées périssables** se gâtent avec le temps : poisson, fruits, lait, viande. Elles perdent leur valeur, puis se perdent. La **salaison** (poisson + sel → poisson salé) les garde, mais consomme du sel et une place d'atelier.

**Ce qu'on voit.**
- Sur le plateau, **le quai du fondaco** porte des piles de caisses, une par marchandise, à la couleur de sa marque. Une caisse encombrante est grosse, une caisse fine est petite.
- **Un arc autour du fondaco** se remplit avec le magasin, et vire au rouge brique quand il est presque plein.
- Toucher le fondaco ouvre **l'étagère** : les caisses rangées sur des rayonnages.
  - Celles qu'une commande ouverte réclame sont cerclées d'or.
  - Une denrée périssable a une **auréole de fraîcheur** qui passe du vert au brun.
  - Pour jeter, on **glisse une pile vers la lagune** : les caisses tombent à l'eau avec un plouf. Pour brader, on la glisse vers la Dogana.
- Un atelier arrêté parce que le magasin est plein montre **une caisse qui déborde** sur sa tuile.

**La question du joueur.** « Je garde le marbre pour la grande commande de Vérone, ou je le jette pour faire de la place au poisson avant qu'il ne pourrisse ? »

### 2.2 L'extraction : envoyer des équipes aux gisements (décidé dans son principe)

**La règle.**
- Les matières premières lourdes ne poussent pas au domaine : marbre, pierre, fer, sel, bois de futaie, sable de verrier. Elles viennent de **gisements** placés sur la carte : carrières du Véronais, mines du Frioul, salines de Chioggia, forêts du Cadore, dunes du Lido.
- Un gisement a deux traits :
  - une **richesse** (le filon), qui baisse à mesure qu'on l'exploite et remonte lentement ;
  - une **qualité** (marbre commun ou marbre blanc), qui passe au produit fini (§ 2.5).
- Il faut d'abord le **prospecter** : un éclaireur révèle les gisements d'un secteur de la carte.
- Pour l'exploiter, on **envoie une équipe** :
  - des **ouvriers**, pris au domaine (§ 2.3) ;
  - des **outils** (pioches, scies, pelles, fabriqués par la forge, § 2.7), qui s'usent ;
  - des **vivres** (pain, poisson salé, vin), mangés chaque jour sur place. Faute de vivres, l'équipe ralentit puis rentre.
- Le rendement dépend du nombre d'ouvriers, avec **des retours décroissants** : dix ouvriers ne font pas deux fois cinq. Il dépend aussi de la qualité des outils et de la richesse du filon.
- Le produit s'entasse **au camp**. Il faut **aller le chercher en véhicule**, et un tas trop gros arrête le camp. L'extraction se branche donc sur les tournées (§ 3.2).

**Ce qu'on voit.**
- Les gisements sur la carte 3D : une carrière blanche taillée dans la colline, un puits de mine avec son treuil, des carrés de saline qui brillent.
- **La richesse se voit dans le décor** : le filon creusé, la colline entamée.
- **Le camp** : des **figurines d'ouvriers** qui piochent, en nombre réel ; un tas de blocs qui monte ; une cantine dont le **garde-manger se vide** (miches et tonneaux dessinés) ; des outils accrochés, qui ternissent en s'usant.
- Envoyer une équipe : **on glisse des figurines d'ouvriers** du domaine vers le gisement, et un petit convoi part sur la route.

**La question du joueur.** « Mes 8 ouvriers, je les mets à la carrière lointaine au filon riche, ou à la proche à moitié épuisée ? Combien de pain je leur laisse ? Et quel véhicule va chercher les blocs, sur quelle tournée ? »

### 2.3 Les bras : ouvriers, artisans, logement et table

**La règle.**
- Le domaine a une **population** : des ouvriers, logés dans des **maisons** qui prennent des cases.
- Chaque atelier a des **postes** :
  - un atelier sans assez d'ouvriers tourne au ralenti ;
  - un atelier sans travail libère ses bras ;
  - les mêmes bras servent aux ateliers **et** aux expéditions (§ 2.2) : c'est l'arbitrage central.
- **Les artisans** (verriers, tisserands, orfèvres) sont des ouvriers formés : à l'école de leur guilde, avec du temps et des ducats. Les recettes fines (§ 2.4) n'avancent qu'avec eux. Les **maîtres** d'aujourd'hui deviennent les meilleurs de ces artisans : ce système absorbe le personnel actuel.
- **La table** : la population mange chaque jour. Pain, puis poisson ou viande, puis vin.
  - Une table pauvre ralentit tout le domaine.
  - Une table variée accélère, et attire de nouveaux ouvriers jusqu'à la place des maisons.
  - Nourrir les siens consomme une part de sa production : ce n'est plus tout pour la vente.

**Ce qu'on voit.**
- De **petits personnages** vont des maisons aux ateliers, le matin.
- Un atelier montre **ses postes en silhouettes** : pleines s'ils sont occupés, vides sinon.
- Au-dessus des maisons, **une assiette et une cruche** se vident et se remplissent.
- Un ouvrier qu'on glisse d'un atelier à l'autre y marche.

**La question du joueur.** « Je forme deux verriers de plus, ou je garde ces bras pour la mine ? Je produis du vin pour mes gens, ou pour Vérone qui le paie bien ? »

### 2.4 Des chaînes longues, avec des restes

**La règle.**
- Les produits finis demandent **deux à quatre intrants**, et des étapes intermédiaires. Par exemple, le drap :
  - laine → filage (fil) ;
  - fil + teinture (guède, alun) → tissage ;
  - foulage au moulin à eau (§ 2.6) → drap.
- Beaucoup de recettes laissent **des sous-produits**, qui prennent de la place :
  - l'abattoir donne la viande, **les peaux** et **le suif** ;
  - la scierie donne des planches et **de la sciure** ;
  - le verrier donne du verre et **du calcin**.

  Ces restes se valorisent : peaux → tannerie, suif → chandelier, calcin → refondu, sciure → fours. Sinon, il faut les jeter (§ 2.1).
- Chaque atelier a **deux ou trois recettes** sur les mêmes intrants : une simple et rapide, une fine qui demande un artisan et paie bien plus.

**Ce qu'on voit.**
- Sur le domaine, des **charrettes animées** vont d'atelier en atelier. Un trait épais est un flux fort, un trait pointillé un flux faible.
- Un atelier qui attend un intrant a **une caisse vide qui clignote** à sa porte.
- Les sous-produits s'entassent **dans la cour** de l'atelier.
- **La vue des flux** : un toucher sur le médaillon d'une marchandise trace sur le domaine son chemin, de la matière au produit fini, et chaque goulot rougit.

**La question du joueur.** « Ma laine part au drap fin pour Venise, mais la teinture me manque : j'achète l'alun au marché, ou je monte une teinturerie qui me mangera une case de rivière ? »

### 2.5 La qualité qui se propage

**La règle.**
- La qualité d'un produit fini vient de **ses intrants** (le meilleur filon, le meilleur sable) **et** de qui le fait (un artisan, un maître). Elle a trois niveaux : commun, fin, exquis.
- Des **intrants de substitution** existent : la soude d'Alexandrie (marché, chère, verre exquis possible) ou les cendres de salicorne locales (gratuites, verre commun au mieux).
- Certaines commandes **exigent** du fin ou de l'exquis : une caisse cerclée d'or, payée deux à trois fois plus.

**Ce qu'on voit.** La qualité est **une couleur de cerclage sur la caisse** (aucun, argent, or), partout : au magasin, en soute, dans les commandes. Un atelier montre la qualité qu'il sort par un petit écu sur sa porte.

**La question du joueur.** « Ce marbre blanc du filon riche, je le garde pour les statues exquises de Venise, ou je le vends en blocs à Padoue ? »

### 2.6 Le plan du domaine : terroir, voisins, nuisances

**La règle.**
- **Le terroir** : rivière, forêt, argile, colline, littoral. Un atelier sur son terroir produit mieux. Le moulin à foulon et la scie hydraulique **exigent** la rivière.
- **Le voisinage**, qui existe déjà, devient spatial : deux ateliers liés côte à côte s'échangent leurs intrants sans charrette, donc plus vite.
- **Les nuisances** :
  - une tannerie ou une teinturerie **salit la rivière en aval**, et les moulins et pêcheries en dessous en souffrent ;
  - la fumée des fours gêne les maisons voisines, dont la table compte moins.

  La rivière a un sens : **l'ordre des ateliers le long de l'eau** est une énigme à lui seul.
- Les bonnes cases sont rares. Déplacer un atelier coûte un chantier.

**Ce qu'on voit.**
- Le terroir dessiné sur les tuiles : l'eau qui coule et son sens, les arbres, la terre rouge.
- La rivière qui **se teinte** en aval d'une tannerie.
- Les panaches de fumée qui dérivent sur les maisons.
- En plaçant un atelier, **un aperçu sur les cases** : vert là où il gagne, rouge là où il nuit à un voisin.

**La question du joueur.** « Ma teinturerie va en amont, près de la laine, ou en aval, pour ne pas gâter le moulin ? »

### 2.7 L'usure : les outils et la forge

**La règle.**
- Les ateliers et les équipes **usent des outils**, fabriqués à la forge à partir du fer et du charbon.
- Un atelier sans outils ralentit.
- De meilleurs outils (acier, artisan forgeron) durent plus longtemps et vont plus vite.

C'est une boucle interne : la mine nourrit la forge, qui nourrit la mine. Les **modules** d'atelier d'aujourd'hui deviennent ces outils et équipements, qu'on fabrique au lieu de les rechercher.

**Ce qu'on voit.** Un **râtelier** sur chaque atelier, avec ses outils dessinés, qui ternissent puis se brisent.

### 2.8 La critique : est-ce trop ?

- **Le risque** : une liste de sept mécaniques peut tourner au tableur, et contredit « une douzaine de systèmes visibles ».
- **La parade** : elles en **absorbent** d'autres, au lieu de s'y ajouter.

  | Ce qui arrive | Ce qu'il absorbe |
  | --- | --- |
  | Le magasin | La file de nuit |
  | Les bras | Le personnel et les maîtres |
  | Les outils | Les modules d'atelier et leur recherche |
  | Le plan du domaine | Le voisinage sur l'orbite |
  | Les goûts des villes (§ 3) | `madeWeight` |

  Le joueur ne voit que **cinq choses** : ses cases, ses gens, ses caisses, ses gisements et ses villes.
- **L'entrée en douceur** : chaque mécanique s'ouvre par palier de Casa. La Casa 1 n'a qu'argile, briques et un magasin ; l'extraction s'ouvre vers la Casa 3, la table vers la Casa 4, les nuisances et la qualité plus tard. Le joueur apprend une contrainte à la fois.

## 3. Les livraisons, version 2 : critiquées et resserrées

### 3.1 La critique de la version 1

| Idée de la version 1 | Verdict | Pourquoi |
| --- | --- | --- |
| Les goûts des villes | **Gardée, renforcée** | C'est elle qui casse « la demande suit l'offre ». |
| La ville rassasiée (prix qui baisse si on la sert souvent) | **Retirée** | Elle punit sans faire réfléchir : la réponse est toujours « tourner d'une ville à l'autre ». Les échéances et les contrats (§ 3.2) donnent un meilleur rythme. |
| Le fret de retour | **Gardé, généralisé** | C'est le cœur de l'optimisation. Il devient « la tournée qui charge et décharge ». |
| Les péages | **Retirés** | C'est un chiffre de plus, pas un choix visible. Le terrain et les véhicules spécialisés font mieux le même travail. |
| Le terrain des routes | **Gardé** | Il donne un sens au choix du véhicule. |

**Ce qui manquait vraiment** : aujourd'hui, on peut servir **toutes** les commandes. Tant que l'offre dépasse la demande, aucune règle de tournée ne fera réfléchir. Le principe de la version 2 : **il y a toujours plus de commandes que de quoi les servir.** Le joueur choisit lesquelles prendre.

### 3.2 Les règles

1. **Les goûts des villes.**
   - Chaque ville a deux ou trois marchandises de prédilection, dessinées sur son enseigne. Elle tire ses commandes parmi elles, **qu'on les produise ou non**.
   - Les grandes villes veulent du fini et du fin, les bourgs du brut.
   - On choisit **quelles villes servir**, et on bâtit pour elles.
2. **L'échéance.**
   - Une commande a un **sablier** sur sa caisse. Livrée à temps, elle paie plein ; en retard, moins. Le sablier vidé, elle part.
   - Les villes proposent plus de commandes qu'on n'en peut servir, et les meilleures sont souvent les plus pressées.
3. **Les contrats de ville.**
   - De temps en temps, une ville ouvre un **grand chantier** : l'Arena de Vérone veut 40 marbre, 20 bois et 10 fer en trois jours.
   - On le livre en plusieurs tournées, par plusieurs véhicules.
   - La récompense dépasse celle des commandes : un gros paiement, un titre, un plan.
4. **La tournée qui charge et décharge.**
   - Une tournée est une suite d'arrêts, et chaque arrêt **décharge** ou **charge** :
     - une ville : on livre ses commandes, et on peut acheter sa **matière locale** à bon prix ;
     - un camp d'extraction (§ 2.2) : on prend le tas ;
     - un autre fondaco : on transfère.
   - La soute ne se vide plus en ville pour rentrer à vide : elle se remplit au retour.
5. **L'encombrement en soute.** Les marchandises prennent leurs places, comme au magasin : un chariot de marbre est vite plein, un chariot de soie presque jamais.
6. **Les véhicules du terrain.**
   - Les routes ont leur terrain : la lagune et les fleuves, la plaine, les cols.
   - Le burchio est rapide sur l'eau, mais n'en sort pas.
   - La mule passe les cols, mais porte peu.
   - La charrette est reine en plaine, et lente en montagne.

### 3.3 Ce qu'on voit

- **Les commandes sur la ville** : des caisses sur son quai, avec leur marque, leur cerclage de qualité et leur **sablier**. Le contrat est un **chantier 3D** sur la ville (l'Arena en échafaudages), qui **monte à chaque livraison**.
- **La tournée** : on choisit le véhicule, puis on touche les arrêts. Sous la carte, une **frise de la tournée** : une case par arrêt, et sous chacune **la soute en grille**, qui se vide et se remplit d'arrêt en arrêt. On voit d'un coup d'œil où la soute est pleine, où elle roule à vide, et le temps de chaque tronçon.
- **Le terrain** sur les routes : l'eau bleue, les cols en lacets. Un tronçon lent pour le véhicule choisi est dessiné en pointillé.
- **Le retour chargé** : les caisses montent dans la charrette à l'arrêt, et le véhicule rentre visiblement plein.

### 3.4 La question du joueur

« Mon chariot part livrer le drap fin de Venise, pressé. Je passe par la carrière en revenant ? Il n'aura de place que pour 4 blocs. Ou je l'envoie demain avec la mule par le col, plus lente, mais libre ? »

## 4. La Porta, version 2 : l'équipage contre l'adversaire

### 4.1 Déplacer comme dans les Sims (fait)

- On choisit un véhicule, puis on touche où il va.
- Chaque véhicule garde son chemin et son **point d'arrivée** en vue, à sa couleur, même quand on en choisit un autre.
- Pas de tracé au doigt.

### 4.2 La reconnaissance avant d'entrer

- Le dock de la Porta montre la **carte de la bataille avant le départ** : les villes et leurs coffres, chaque garnison **en figurines**, les patrouilles en pointillés, le terrain (§ 4.5).
- C'est sur cette carte qu'on compose son équipage. Le palier choisi en change la carte.

### 4.3 Les contres : des dégâts et des protections

**La règle.**

Chaque arme a **un type de dégâts** :

| Type | Armes |
| --- | --- |
| Perçant | Arbalètes, arcs |
| Tranchant | Épées, hallebardes |
| Choc | Lances de cavalerie, masses |
| Poudre | Couleuvrine, bombarde |
| Feu | Feu grégeois |

Chaque adversaire porte **une protection** :

| Protection | Effet |
| --- | --- |
| Aucune | — |
| Maille | Résiste au tranchant |
| Plates | Résistent au perçant et au tranchant ; faibles à la poudre et au choc |
| Grand pavois | Bloque le perçant **de face** ; se contourne par le flanc |
| Cheval | Rapide ; faible au perçant et aux piques |

La table est fixe, simple, et toujours visible en icônes. Les unités de Rome deviennent des **rôles lisibles** :

| Unité de Rome | Ce qu'elle fait | Ce qui la bat |
| --- | --- | --- |
| **Arbalétriers** | Portée longue, fragiles, derrière un mur | La cavalerie, qui ferme la distance vite, ou la couleuvrine, qui tire de plus loin qu'eux |
| **Pavesiers** | Grand pavois, lents | Le perçant de face rebondit : il faut de la poudre ou du choc, ou les prendre de flanc |
| **Chevau-légers** | Rapides, chassent les transports | Les piques et les arbalètes, qui touchent tout le monde |
| **Hommes d'armes** | En plates, solides | Le choc et la poudre ; le perçant et le tranchant glissent |
| **Bombardes** | Dégâts de zone, très lentes | La vitesse, et la dispersion de l'équipage |
| **Gonfalonier** | Le chef, beaucoup de PV | Les dégâts qui montent sur la même cible (lances), la poudre, et les soins pour durer |
| **Incendiaire** | Brûle les reliques d'une ville | La vitesse, pour l'intercepter avant |

**Ce qu'on voit.**
- Chaque figurine de Rome porte **son écu de protection** : une petite icône au-dessus d'elle.
- Chaque arme de l'équipage porte **son icône de dégâts**.
- Sur la carte de reconnaissance, une fois l'équipage composé, chaque garnison **s'allume** :
  - en vert si l'équipage la bat ;
  - en ambre si c'est égal ;
  - en rouge si elle le domine.

  On lit tout de suite les trous de son build.

### 4.4 L'équipage et son équipement : une vraie réflexion

**Les types de combattants.** Ils remplacent les trois modèles d'aujourd'hui, et chacun a son rôle :

| Combattant | Profil | Rôle |
| --- | --- | --- |
| **Cavaliers** | Rapides, légers | Contre les arbalétriers et les bombardes ; fragiles |
| **Piquiers** | Lents, solides | Arrêtent la cavalerie, protègent ce qui est derrière eux |
| **Artilleurs** | Couleuvrine, poudre, très lents | Contre les pavois et les plates ; sans défense au contact |
| **Arbalétriers mercenaires** | Perçant à distance | Contre la cavalerie et ce qui n'a pas de plates |
| **Le transport** | — | Seul à charger les reliques, à protéger |

**Les places d'équipage.** La Porta en ouvre deux, trois puis quatre selon son niveau. Les composer, c'est le premier choix : deux cavaliers et un transport pour une carte d'arbalétriers ; un piquier, un artilleur et un transport pour une carte de pavesiers.

**L'équipement.** Chaque combattant a des **places typées** (arme, défense, accessoire) **et une charge** :
- **Les armes** choisissent le type de dégâts.
- **Les défenses** :

  | Défense | Contre quoi | Prix |
  | --- | --- | --- |
  | Maille | Le tranchant | Légère |
  | Plates | Le perçant et le tranchant | Lourdes, elles ralentissent |
  | Pavois actif | Un bouclier qu'on lève | Avec un temps de recharge |
- **Les accessoires** :
  - le cheval de guerre : plus de vitesse, plus de charge ;
  - l'étendard : les alliés proches frappent plus fort ;
  - le chirurgien : soins ;
  - la fumée : se cacher ;
  - la trompette : de la vitesse aux alliés ;
  - la poudre en plus : plus de coups pour la couleuvrine ;
  - les crochets : le transport charge plus vite.
- **La charge** : chaque pièce pèse. Un combattant trop chargé ralentit, sa jauge de charge se remplit. Des plates sur un cavalier, c'est possible, mais il n'est plus un cavalier.
- **Les synergies** : un piquier à côté de l'artilleur le couvre ; l'étendard ne sert que si l'équipage reste groupé ; la fumée sert le transport qui passe sous une garnison d'arbalétriers.

**Ce qu'on voit.** À la Remise, **la figurine s'habille** de ce qu'on lui met : le pavois sur le bras, la couleuvrine sur l'affût, les plates qui brillent, le cheval caparaçonné. Sa **jauge de charge** est une selle qui ploie. À côté, l'**aperçu contre la carte du jour** (§ 4.3) se met à jour pièce par pièce.

### 4.5 Le terrain de bataille (gardé)

| Terrain | Effet |
| --- | --- |
| Forêts | On y avance moins vite, et Rome n'y voit qu'à une case |
| Collines | Une case de portée en plus à qui s'y tient |
| Fleuve | Infranchissable, sauf à ses gués |

Un pavesier ne protège que de face, et la colline permet de le prendre de flanc : **le placement compte**. Le terrain se voit sur le diorama : arbres, reliefs, eau.

### 4.6 Les variantes de la semaine (secondaires)

Elles restent possibles, mais **ne décident pas du build** : c'est l'adversaire qui en décide. Une variante modifie la carte, par exemple le brouillard qui raccourcit la vision de Rome ; elle ne change pas la table des contres.

## 5. L'ordre proposé

| Lot | Contenu | Taille |
| --- | --- | --- |
| 1 | **Le magasin** (§ 2.1) : places et encombrement, plafond par fondaco, jeter et brader, l'arc, l'étagère, la caisse qui déborde | moyen |
| 2 | **Les goûts des villes et les échéances** (§ 3.2, 1 et 2) ; l'offre plus petite que la demande | moyen |
| 3 | **La tournée qui charge et décharge** (§ 3.2, 4 et 5) : la frise et la soute en grille | gros |
| 4 | **L'extraction** (§ 2.2) : gisements, prospection, camps, équipes, vivres ; l'enlèvement par la tournée | gros |
| 5 | **Les bras** (§ 2.3) : la population, les postes, la table, les artisans (le personnel absorbé) | gros |
| 6 | **Les chaînes longues, les restes et la qualité** (§ 2.4, 2.5) : refonte du référentiel des recettes | gros |
| 7 | **Le plan du domaine** (§ 2.6) et **les outils** (§ 2.7) : modules et voisinage absorbés | gros |
| 8 | **La Porta : la reconnaissance et les contres** (§ 4.2, 4.3) : dégâts, protections, Rome réécrite, aperçu vert/ambre/rouge | moyen |
| 9 | **La Porta : les combattants, les places d'équipage, l'équipement et la charge** (§ 4.4) ; le terrain (§ 4.5) | gros |
| 10 | Les contrats de ville (§ 3.2, 3), les véhicules du terrain (§ 3.2, 6), les périssables et la salaison (§ 2.1) | moyen |

Les lots 8 et 9 ne dépendent pas des autres, et peuvent passer avant si la Porta presse.

Chaque lot de commerce qui change une règle s'annonce dans les notes du chapitre. C'est une règle de joueurs, pas une règle d'or ; elle reste en place.

## 6. Les questions au porteur

1. **L'ordre** : le magasin d'abord (lot 1), puis les villes et la tournée (lots 2 et 3), puis l'extraction ? Ou l'extraction plus tôt ?
2. **Les bras (§ 2.3)** : faut-il nourrir sa population ? C'est le lot qui rend la production la plus « Anno ». C'est aussi celui où l'absence coûte le plus, puisque la table se vide.
3. **La Porta (§ 4.4)** : remplacer les trois modèles de véhicules de combat (cavalier, chariot de guerre, grand chariot) par des types de combattants (cavaliers, piquiers, artilleurs, arbalétriers) ? Les joueurs qui en ont déjà les gardent, convertis.
4. **Les mondes existants** : les stocks d'aujourd'hui dépassent les futurs plafonds. Faut-il les ramener au plafond au passage, ou les laisser fondre sans rien ajouter au-delà ?

## 7. La validation (5 novembre 2026, au soir)

Le porteur **valide la version 2 dans son ensemble**. Ses quatre questions (§ 6) prennent les choix recommandés : le magasin d'abord, les ouvriers nourris, les combattants à la place des véhicules de combat (ceux qui existent déjà convertis), les stocks en trop laissés se vider sans rien accepter au-delà. Chaque point reste ouvert à ses retours au moment de son lot.

**En attente.** Rien ne se code avant le « go » du porteur. Une autre session refait d'abord les visuels et les interactions. Chaque lot de ce plan **s'adaptera à cette refonte** : ses pièces, sa direction, ses gestes. Au moment du go, on relit l'état du dépôt et on ajuste les « Ce qu'on voit » de chaque lot avant de coder.
