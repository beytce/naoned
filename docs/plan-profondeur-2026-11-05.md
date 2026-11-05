# Plan : un jeu de gestion qui fait réfléchir (version 3, après l'équipe d'experts)

*Historique : la version 2, validée par le porteur le 5 novembre au soir, est dans `docs/plan-profondeur-2026-11-05-v2.md`, avec les décisions et les correctifs déjà faits. À la demande du porteur, elle a été passée à une équipe : une documentaliste (25 jeux de gestion étudiés), un game designer senior, un économiste de jeu, un panel de trois joueurs (une min-maxeuse Factorio/Anno, un joueur de Patrician/Offworld, une joueuse mobile Hades' Star/Mini Metro), et un duo tactique et lisibilité. Leurs rapports sont dans `docs/expertise-profondeur-2026-11-05/`. La version 3 en tient compte.*

*Rien ne se code avant le « go » du porteur. Une autre session refait d'abord les visuels et les interactions : chaque lot s'y adaptera, et ses « Ce qu'on voit » se relisent au moment du go.*

## 0. Ce que l'équipe a changé, en une page

1. **La vraie cause de « on produit trop » est arithmétique, et le plan v2 ne la touchait pas.**
   - **Un défaut du moteur, que j'ai vérifié** : `relaunchWorkshop` prend les intrants **par fournée**, alors que `collectWorkshop` rend les produits **× Y(n)**. Au niveau 10, Y vaut 23,5 : une scierie fait 141 planches avec 10 bois. La transformation crée de la matière, et aucune chaîne ne contraint plus rien. Le simulateur, lui, multiplie les intrants, si bien qu'il **sous-estime** la surproduction.
   - **Une offre qui grandit au carré** (ateliers × Y(n)) **face à une demande bornée** : 31 villes, un lot de valeur fixe, des villes qui commandent ce que la Maison fait déjà. Le ratio production / commandes vaut ~0,4 à la Casa 1, ~3,5 à la Casa 5, ~9 à la 10 et ~25 à la 20 (`expert-economie.md` § 1).
   - **Conséquence** : un plafond de magasin, des vivres ou des outils **détruiraient le surplus sans rien faire réfléchir**. Il faut d'abord ramener l'offre et la demande à la même échelle.
2. **Le plan v2 ajoutait sept contraintes, et presque aucun choix.** Les jeux qui durent (Against the Storm, Anno, Captain of Industry) livrent chaque frein **avec le choix qui le contourne**. La v3 associe à chaque contrainte un levier, et coupe les contraintes sans levier.
3. **Il y avait des stratégies dominantes**, trouvées en une semaine par un min-maxer :
   - le luxe léger écrase le lourd (paie par lot, mais encombrement par place) ;
   - brader l'emporte toujours sur jeter, et acheter local puis brader fait une machine à ducats ;
   - le camp et la soute servent d'entrepôts gratuits ;
   - l'extraction se résout en répartissant les ouvriers jusqu'à rendement égal ;
   - le plan du domaine se copie depuis un wiki ;
   - à la Porta, la poudre ne perd contre rien, et la couleuvrine (portée 3) abat déjà les arbalétriers immobiles de Rome (portée 2).
4. **L'absence était punie par cinq canaux à la fois** : magasin plein, périssables, table, vivres, outils. Les cinq experts disent la même chose : pour des sessions de quelques minutes, **l'absence plafonne le gain, elle ne détruit pas l'acquis**. La v3 garde le plafond, et fait du reste un choix (question 2 au porteur).
5. **Ce qui fait parler une communauté** : du non-évident (le plan l'a), de l'**incertain** (rumeurs, légions tirées), de la **variété** (terroir propre à chaque Maison, plans tirés, goûts qui glissent) et du **partagé** (chantiers communs, plans et tournées partageables). La v3 ajoute les trois derniers.

## 1. La grammaire visuelle : douze signes, partout les mêmes

*D'après `expert-porta-visuel.md` § B.3.* « Visuel » ne veut pas dire « beaucoup de dessins ». Cela veut dire **peu de signes, toujours les mêmes, lisibles d'un coup d'œil**, avec les chiffres à un toucher.

| # | Signe | Ce qu'il dit, partout |
| --- | --- | --- |
| 1 | La marque (`GoodsMark`) | Quelle marchandise |
| 2 | La caisse à taille (demi, 1, 2, 3 hauteurs) | Combien de place elle prend |
| 3 | Le cerclage (aucun, argent, or, or éclatant) | Le rang : qualité d'une caisse, rareté d'une relique |
| 4 | L'arc qui se vide | Le temps qui reste avant une perte (échéance, fraîcheur, fermeture) |
| 5 | L'arc qui se remplit | Le travail en cours (production, chargement, chantier, recharge) |
| 6 | L'anneau à crans | La place occupée (magasin, soute, camp, charge) |
| 7 | La silhouette, pleine ou en creux | Des bras (ouvriers, postes, combattants) |
| 8 | Le creux qui respire | Ce qui manque, sans alarme |
| 9 | Le débordement (une caisse qui bascule, cinabre) | Bloqué |
| 10 | Le fil (épaisseur = débit, pointillé = lent) | Un mouvement : flux, route, tournée |
| 11 | L'épingle | Où un véhicule va arriver, et ce qui l'y attend |
| 12 | L'écu et la pointe | Le contre : ce qui protège, ce qui frappe |

**Trois principes.**
- **On montre l'exception, pas l'état.** Un atelier qui tourne ne montre rien ; un atelier bloqué déborde.
- **Trois distances d'information** : la carte, sans aucun chiffre ; le lieu, avec des signes ; le toucher, avec les chiffres.
- **Des lentilles exclusives**, une à la fois : flux, place, bras, qualité.

**Trois conflits de la v2, tranchés.**
- La qualité se lit au **cerclage**, pas à un écu : l'écu reste à la Porta.
- Le sablier devient un **arc qui se vide**.
- La rareté des reliques passe au cerclage, et quitte le vert d'eau et le lapis, qui ont déjà un sens.

## 2. Le socle : remettre l'offre et la demande à la même échelle

### 2.1 Corriger les intrants (lot 0, un correctif)

- Dans `relaunchWorkshop`, les intrants seront pris × Y(n), comme les produits ; `highRecipeRaw` sera compté en unités.
- Le simulateur sera aligné sur le moteur.
- Cela change une règle du commerce : l'annonce se fait dans les notes du chapitre.
- Ce correctif seul fait déjà remonter la tension : une chaîne redevient un goulot.

### 2.2 La caisse et les postes (décision à prendre maintenant, code au lot 5)

*D'après `expert-economie.md` § 2.0, soutenu par le designer.*

**La caisse** devient l'unité du magasin, de la soute et des commandes : environ 100 ducats pour un brut, 300 pour un fini, 500 pour un luxe. Une commande d'aujourd'hui vaut environ 4 caisses. Les nombres deviennent petits et lisibles : on voit les caisses une à une.

**Le niveau d'un atelier ouvre des postes**, et ce sont **les bras qui produisent**. Le multiplicateur gratuit Y(n) disparaît.
- La production croît d'environ ×30 sur la partie, au lieu de ×700.
- La progression vient de la **valeur par caisse** : produit fini, qualité, contrats.

Sans cette compression, chaque puits (une place par caisse, une ration par ouvrier) est écrasé par les volumes, et chaque lot serait calibré deux fois.

### 2.3 La demande à la mesure de la Maison, plus grande que ce qu'on peut servir (lot 1)

**Le lot** : la taille d'une commande suit la Casa de la Maison (table `orders.lotByCasa`), comme les cargaisons de Hades' Star qui grossissent avec la planète.

**L'offre** est réglée sur environ **deux fois ce qu'une Maison médiane de son palier peut servir**. Le taux de service visé :

| Paliers | Taux de service visé |
| --- | --- |
| Casa 1 à 3 | 75 à 90 % |
| Casa 4 à 9 | 50 à 70 % |
| Casa 10 et plus | 45 à 65 % |

En dessous de 40 %, c'est de la frustration. Au-dessus de 80 % au milieu de partie, la surproduction est revenue.

**Les goûts des villes.**
- Chaque ville a deux ou trois marchandises de prédilection, dessinées sur son enseigne, **qu'on les produise ou non**.
- Un **filet** de 25 % des commandes vient de ce que la Maison fait déjà (70 % aux Casa 1 et 2).
- Les goûts **glissent un peu à chaque chapitre** (un goût sur trois change, annoncé à l'avance), sinon la carte se résout en une semaine.

**Les commandes qu'on accepte.**
- Une commande en attente **ne coûte rien** si on l'ignore : elle part un jour, et c'est tout.
- On l'**accepte** d'un toucher : elle passe dans un **carnet de places limité** (3 au départ, plus avec la Casa), et c'est alors que son arc se met à tourner.
- Livrée dans les temps, elle paie plein, avec une **prime de fraîcheur**. En retard, elle paie moins.
- Seul ce qu'on a choisi craint le retard.

**La paie.**
- Elle se calcule **par place** et non par lot, pour que le marbre lourd vaille sa place à côté de la soie.
- Elle tient compte de la **distance** (la prime existe déjà, renforcée) et de la **fraîcheur** (OpenTTD, Railroad Tycoon).

**La mercuriale lente.** Un indice régional quotidien baisse un peu quand tout le serveur livre la même chose (de −20 % à +25 %, la part de chaque Maison plafonnée). C'est l'effet Offworld, sans l'avantage de jouer en continu. Ce que tout le monde fait vaut un peu moins ; une niche vaut un peu plus.

*Ce qu'on voit* :
- sur la ville, ses caisses de commande (signes 1 à 3) et son enseigne de goûts ;
- dans le carnet, les commandes acceptées et leur arc qui se vide (signe 4) ;
- au toucher, une flèche de mercuriale à côté de la marque.

*La question du joueur* : « Quelles 3 commandes je prends parmi les 9 de la région, sachant que mon chariot peut en faire 2 avant ce soir ? »

## 3. Les tournées (lot 2)

### 3.1 La tournée qui charge et décharge (gardée de la v2, verrouillée)

Une tournée est une suite d'arrêts. Chaque arrêt décharge des commandes et peut **charger** :
- la **matière locale** d'une ville ;
- le **tas d'un camp** (§ 4.4) ;
- un **transfert** vers un autre fondaco.

**Les fuites fermées.**
- **Le prix de brade** est toujours inférieur au prix d'achat local : acheter pour brader ne rapporte rien.
- **La matière locale** n'est vendue qu'en quantité limitée par jour et par ville.
- **Une soute à quai** compte dans la place du fondaco : ce n'est pas un entrepôt gratuit.

**L'encombrement en trois classes** (demi, 1, 3 places) vaut dans la soute comme au magasin. La mule peut porter au moins une commande de chaque classe, et une commande lourde se livre en plusieurs fois.

### 3.2 Les lignes enregistrées (nouveau : le panel, Mini Metro, Patrician)

Une tournée qui marche s'**enregistre** comme une **ligne** : un fil de couleur sur la carte, et un véhicule qui la parcourt seul.
- Elle ne prend que les commandes déjà acceptées et le fret prévu.
- Elle **prélève une part** de la paie, le salaire du capitaine (environ 15 %).
- On peut la partager en code court : « ma ligne Venise–Padoue–Trévise ».

Pour le joueur mobile, c'est l'automatisation qui montre son résultat. Pour la min-maxeuse, la tournée à la main paie mieux.

### 3.3 Le terrain et les véhicules (gardés de la v2)

Eau, plaine et cols ; burchio, charrette et mule. Les péages restent retirés.

### 3.4 Ce qu'on voit

- **La frise de la tournée** : une case par arrêt, et sous chacune la **soute en grille** (signes 2 et 6). Elle se vide et se remplit d'arrêt en arrêt ; un trou dit qu'on roule à vide.
- **Le fil** de la tournée sur la carte, plein ou pointillé selon le terrain.
- **L'épingle** d'arrivée de chaque véhicule.

*La question du joueur* : « Je fais le détour par la carrière ? Il ne me reste que 2 places au retour, et le marbre en prend 3. »

## 4. La production : des choix, pas des freins

### 4.1 Le magasin et le quai de l'atelier (lot 3)

**La vraie absorption, demandée par le designer.** La **file de nuit disparaît** : un atelier verse sur **son quai** jusqu'à son plafond, puis s'arrête. Le fondaco a un magasin plafonné, en places, comme dans la v2.

**Jeter, brader, transférer.**
- On jette en glissant une pile vers la lagune.
- On brade à un prix toujours sous la valeur des intrants, et hors du marché partagé.
- On transfère avec la tournée (§ 3.1).

**Les stocks d'aujourd'hui, au-delà du futur plafond**, fondent sans que rien n'y entre. L'économiste propose aussi de les convertir en ducats sur quatre semaines (question 5 au porteur).

*Ce qu'on voit* :
- l'anneau à crans autour du fondaco (signe 6) ;
- les piles de caisses à taille sur le quai (signe 2) ;
- l'atelier plein qui déborde (signe 9).

### 4.2 Les recettes à intrants au choix, notées en étoiles (lot 4 ; Against the Storm)

*C'est la meilleure réponse à « la production est trop simple », selon la documentaliste et le panel.*

Une recette accepte des **intrants au choix**. Par exemple, du verre avec du sable et de la soude d'Alexandrie, **ou** du sable et des cendres de salicorne.

Chaque atelier fait une recette avec **1, 2 ou 3 étoiles** :
- l'étoile dit son efficacité : intrants par caisse et vitesse ;
- deux ateliers peuvent faire la même chose, l'un bien, l'autre mal.

On ne cherche plus « +x % ». On cherche **quel atelier fait quoi, avec quoi** :
- le four à 3 étoiles pour le verre fin mange la soude, rare ;
- le four à 1 étoile fait du verre commun avec les cendres de la lagune.

*Ce qu'on voit* :
- les étoiles sur la porte de l'atelier ;
- au toucher d'une recette, ses intrants possibles en marques, l'actuel en plein et les autres en creux (signe 8) ;
- la lentille des flux, avec les fils (signe 10) et le goulot qui rougit.

### 4.3 Des chaînes courtes, un reste par chaîne, et la qualité (lot 4)

**Des chaînes de deux ou trois étages**, aux ratios simples en entiers (1 → 2, 2 + 1 → 1), pour que les guides restent lisibles.

**Un sous-produit par chaîne**, qui doit aller quelque part : l'abattoir donne des peaux, la scierie de la sciure, le verrier du calcin. Pour qu'aucune boucle ne soit gratuite, le **calcin refondu rend moins** qu'il n'a coûté.

**La qualité vient des intrants, des étoiles et des maîtres**, et se voit au cerclage. Les commandes exquises sont **rares et incertaines** (une ou deux par jour dans la région, annoncées par la rumeur, § 6.2) : c'est un pari, pas un seuil de rentabilité.

### 4.4 L'extraction, simplifiée (lot 5)

**Les gisements sont tirés pour chaque Maison** : deux Maisons n'ont pas la même carte de filons. Ils se révèlent par la prospection, et le **carottage** se paie pour connaître la richesse avant de s'engager (la valeur de l'information).

**Un camp a trois tailles** (petit, moyen, grand), et non un nombre libre d'ouvriers. Le choix porte sur le **lieu** et la **taille**, pas sur une répartition jusqu'au rendement égal.
- Le petit camp coûte peu de bras et rend peu.
- Le grand demande un fondaco proche, ou des tournées fréquentes.

**Le tas** s'accumule jusqu'au plafond du camp, petit (ce n'est pas un entrepôt), puis le camp s'arrête : **rien ne se perd**. Il faut aller le chercher en tournée (§ 3.1).

**Les vivres**, si le porteur maintient la table (question 2), ne se mangent **que pendant le travail**. Faute de vivres, le camp s'arrête ; il ne rentre pas, et ne perd rien.

*Ce qu'on voit* :
- le gisement entamé dans le décor ;
- les silhouettes d'ouvriers au travail (signe 7) ;
- le tas en caisses à taille (signe 2) ;
- l'anneau du camp (signe 6), qui déborde quand il est plein (signe 9).

### 4.5 Les bras (lot 5)

**Le niveau ouvre des postes** (§ 2.2). Les **mêmes bras** servent aux ateliers et aux camps : c'est la rareté à double usage, celle d'Anno, de Banished et de FTL.

**Les artisans** sont des ouvriers formés ; les maîtres d'aujourd'hui en deviennent les meilleurs. **Monter un atelier sans ses artisans le laisse à vide**, comme dans Anno : on ne monte pas tout à la fois.

**La table**, selon ce que choisira le porteur (question 2) :
- **le banquet** (ce que recommandent le designer et le panel) : on organise un banquet en donnant du vin et du poisson, et le domaine produit mieux pendant quelques heures. C'est un bonus qu'on choisit, pas un malus qu'on subit ;
- **ou la table de la v2**, avec deux planchers : elle ne se mange que pendant la production, et la faim ralentit sans rien détruire.

### 4.6 Le domaine : un terroir propre à chaque Maison (lot 6)

**Le terroir est tiré pour chaque Maison** : rivière, forêt, argile, colline. Deux domaines ne se ressemblent pas, et un plan du wiki ne se copie plus tel quel.

**Le voisinage devient spatial.** En plaçant un atelier, un **aperçu en cercles** (Islanders) montre où il gagne, en vert, et où il nuit, en rouge.

**Les nuisances** (la rivière salie en aval) viennent en deuxième temps, avec l'aperçu, et seulement si le lot 6 manque de tension.

**Les plans tirés parmi trois** (Against the Storm) : à chaque palier, on choisit un nouvel atelier ou une recette **parmi trois tirés**, au lieu d'un catalogue. Deux joueurs n'ont pas la même Maison, et ils se **conseillent** au lieu de copier.

**Les pierres angulaires de la Maison**, choisies vers la Casa 7 parmi trois :
- « Les verriers de Murano » : verre +1 étoile, sable ×2 ;
- « Le Fondaco des Allemands » : fer et laine moins chers, drap moins payé ;
- etc.

C'est la vocation de la Maison, qui ferme des portes.

### 4.7 Coupé ou reporté (`IDEAS.md`)

| Mécanique | Pourquoi elle sort |
| --- | --- |
| Les outils qui s'usent et la forge d'entretien | « +x % » et entretien. Remplacés par les étoiles (§ 4.2) |
| Les périssables pendant l'absence | Gardés seulement en soute : la fraîcheur paie à la livraison (§ 2.3) |
| La population qui grandit avec la table | Les postes suffisent |
| Les nuisances | Reportées en deuxième temps du lot 6 (§ 4.6) |

## 5. La Porta : des contres sans build dominant (lots 7 et 8)

### 5.1 La table des contres, refaite en cycle (lot 7)

*D'après `expert-design.md` § 5.2 et `expert-porta-visuel.md` P1.*

**Quatre dégâts** : perçant, taille, choc, poudre. **Quatre protections** : aucune, maille, plates, pavois. Chaque dégât a **une protection où il excelle, et une qui le contre**.

| Dégâts → / Protection ↓ | Perçant | Taille | Choc | Poudre |
| --- | --- | --- | --- | --- |
| Aucune (troupe légère) | **+50 %** | = | = | −25 % |
| Maille | = | **−50 %** | **+50 %** | = |
| Plates | **−50 %** | **+50 %** | = | = |
| Pavois | **−75 % de face** | = | = | **+50 %** |
| *Cheval (un trait)* | +25 % | = | −25 % | = |

**Le feu** devient un effet (brûler une ville, une zone), pas un cinquième type de dégâts.

**La poudre** a ses limites :
- une **portée minimale** ;
- une **mise en batterie** de quelques secondes avant de tirer ;
- un boulet qui met du temps à arriver.

La couleuvrine ne bat donc plus les arbalétriers gratuitement : il faut la protéger pendant qu'elle s'installe.

**Les unités de Rome portent chacune une protection** : les arbalétriers rien, les pavesiers le pavois, les chevau-légers la maille et le cheval, les hommes d'armes les plates, les bombardes rien.

**Le Gonfalonier change de protection en cours de combat** : plates, puis maille à mi-vie. Contre lui, il faut deux types de dégâts : c'est **la** pièce qui oblige à un équipage mixte.

**Le pavois a une orientation** : un **cône dessiné au sol**. De flanc, il ne protège pas.

**Le protecteur existe enfin.** Le piquier a une **zone de contrôle** (le hérisson) : Rome qui y entre le vise d'abord. Le **réexamen** de Rome se voit, comme dans Into the Breach : une petite horloge sur l'unité dit quand elle peut changer de cible.

### 5.2 Rome annonce ce qu'elle va faire (lot 7 ; Slay the Spire, Into the Breach)

Au-dessus de chaque unité de Rome, une **intention** : la cible visée (un fil vers elle), une salve qui charge, une bombarde qui pointe une zone dessinée au sol.

Le temps réel prend alors son sens : on déplace le transport **hors du cercle annoncé**, on lève le pavois **avant** la salve.

### 5.3 La reconnaissance qui explique sans conclure (lot 7)

**Trois portes au choix par jour**, chacune avec sa carte : garnisons en figurines avec leur écu (signe 12), coffres cerclés (signe 3), patrouilles en fil (signe 10).

**Pas de verdict vert, ambre ou rouge**, qui ferait le choix à la place du joueur (le designer et le duo tactique sont d'accord). À la place, **trois pastilles qui expliquent** : par exemple « 2 pavesiers : votre perçant rebondit de face », avec une coche, un trait ou une croix en forme, jamais par la couleur seule.

**Rééquiper au quai de la Porta** : aujourd'hui, il faut retourner à la Remise, ce qui rend la reconnaissance inutile. Le build se verrouille ensuite à l'entrée dans la file.

### 5.4 L'équipage : deux combattants, un transport, une seule contrainte (lot 8)

**Les combattants** : cavaliers, piquiers, artilleurs, arbalétriers, chacun avec un **profil net**. Les trois véhicules de combat d'aujourd'hui sont convertis.

**Deux combattants et un transport au plus par joueur** : au-delà, le micro sur téléphone devient illisible. Le second peut **escorter** d'un toucher. On ne pilote vraiment qu'une figurine à la fois, comme dans Hades' Star.

**Une seule contrainte d'équipement** : des places typées (arme, défense, accessoire), et une **charge en trois crans** (léger, moyen, lourd), qui donne trois classes de vitesse. Pas de jauge fine en plus des places : c'était deux contraintes sur la même chose.

**Les tenues enregistrées** : on enregistre deux ou trois builds par combattant, et on change en un toucher au quai. Sans cela, le joueur mobile ne change jamais de build.

**Des copies de composants bon marché** : on peut essayer un build sans le payer au prix fort.

**Les synergies se voient au sol** :
- l'étendard dessine un cercle ;
- le piquier, son hérisson ;
- l'artilleur, son cône de tir.

On les découvre en regardant, pas en lisant.

**Les munitions fabriquées au fondaco** (poudre, carreaux) relient la production à la Porta : une Maison qui ne fait pas de salpêtre achète sa poudre, ou change de build.

### 5.5 La rejouabilité et le téléphone (lot 8)

**Des compositions de Rome tirées à chaque bataille**, par archétype : la garnison d'arbalétriers, le mur de pavois, la chasse des chevau-légers. La table, elle, reste fixe : on apprend une fois, et chaque carte est différente.

**Moins de villes que de quoi les prendre** : on choisit sa route parmi les coffres.

**Le terrain** : la colline d'abord, seule (une case de portée en plus). Forêts et gués viendront ensuite.

**Une Porta courte** pour le métro : un palier de 5 minutes. Et un véhicule qui **rentre seul vers la porte** si le joueur se déconnecte (le panel).

**Un tournoi de builds au banc** (`porta-bench`) **avant de coder l'écran**, pour vérifier qu'aucun build ne gagne partout.

## 6. Ce qui fait parler la communauté (nouveau)

### 6.1 Les chantiers communs, par bande de Puissance (lot 9 ; Stardew, Hades' Star)

Une ville ouvre un **grand œuvre** (l'Arena de Vérone) pour toutes les Maisons de la même bande. On livre ensemble ; le chantier 3D monte sur la ville. La récompense va à tous, avec une part pour chacun selon ce qu'il a livré, sans rivalité : rien ne se prend, la règle d'or 1 tient.

C'est le sujet de conversation naturel d'une compagnie.

### 6.2 La rumeur (lot 9 ; CADRAGE § 3 quater)

Chaque matin, la Lettre annonce **ce qui va se passer** : « Venise cherchera du verre exquis jeudi », « les mines du Frioul sont riches ce mois ». L'information se paie ou se gagne (l'espion de la compagnie).

C'est l'**incertain** qui rend un pari intéressant (§ 4.3), et qui fait parler.

### 6.3 Le temps : saisons et commandes à terme (lot 9)

- **Les saisons** : la soie au printemps, les vendanges à l'automne, le sel l'été. Stocker pour plus tard donne au magasin plafonné sa valeur d'arbitrage.
- **La promessa** : une grosse commande à livrer dans 3 jours, scellée à l'avance, bien payée. On s'y engage, et on doit l'honorer, sinon on paie un dédit.

### 6.4 Les plans partageables

Un plan de domaine, une ligne de tournée ou une tenue de combattant s'exporte en **code court**, et se colle chez soi en fantôme. Ce sont les captures qu'on poste, et donc les conversations.

## 7. L'ordre (v3)

| Lot | Contenu | Pourquoi à cette place |
| --- | --- | --- |
| 0 | Corriger les intrants × Y(n) ; aligner le simulateur | C'est un défaut du moteur, et tout le reste en dépend |
| 1 | La demande à la mesure de la Maison : lot par Casa, offre ×2, goûts qui glissent, carnet de commandes acceptées, paie par place, distance et fraîcheur, mercuriale lente | C'est le seul lot qui attaque la cause ; il rend la tournée intéressante à lui seul |
| 2 | La tournée qui charge et décharge, la frise, l'encombrement, les lignes enregistrées | Elle existe déjà (`driveRound`), il faut l'étendre |
| 3 | Le magasin et le quai de l'atelier (la file de nuit absorbée), jeter et brader, la grammaire visuelle de base (signes 1, 2, 6 et 9) | Livré juste après la demande, pour ne pas montrer des ateliers arrêtés sans rien à décider |
| 4 | Le référentiel : recettes à intrants au choix et étoiles, chaînes courtes, un sous-produit par chaîne, la qualité, la lentille des flux | Il donne à l'extraction ses marchandises (marbre, fer, sel) |
| 5 | La caisse et les postes (§ 2.2), les bras, l'extraction simplifiée, le banquet ou la table | Il dépend du référentiel |
| 6 | Le domaine : le terroir propre à chaque Maison, l'aperçu en cercles, les plans parmi trois, les pierres angulaires | Il dépend des bras |
| 7 | La Porta, les contres : la table en cycle, la poudre bornée, le Gonfalonier, l'orientation, le hérisson, les intentions, la reconnaissance qui explique, le rééquipement au quai, le tournoi au banc | Indépendant : il peut passer avant si la Porta presse |
| 8 | La Porta, l'équipage : les combattants, deux et un transport, les crans de charge, les tenues, les munitions fabriquées, les archétypes, la colline, la Porta courte | Après le lot 7 |
| 9 | La communauté : les chantiers communs, la rumeur, les saisons, la promessa, les codes de partage | Une fois que les choix existent, on les partage |

## 8. Les questions au porteur

1. **La caisse et les postes (§ 2.2).** C'est le changement le plus profond : il remplace le rendement Y(n) par des bras, et les grands nombres par des caisses qu'on compte. Toute l'équipe le juge nécessaire pour que les stocks, les vivres et les bras pèsent. D'accord ?
2. **L'absence.** Vous avez retiré la règle d'or 3. Les cinq experts recommandent pourtant de ne la faire coûter que par le **plafond** : un magasin ou un camp plein s'arrête, et une commande acceptée en retard paie moins. Rien de ce qu'on a gagné ne serait détruit pendant qu'on est absent. Pour la table, deux voies :
   - **le banquet** (recommandé) : un bonus choisi ;
   - **la table qui se vide** : un malus subi, avec ses planchers.
3. **Le simulateur.** Vous l'avez rendu facultatif. L'économiste et le designer conseillent de le rendre obligatoire **pour les lots qui touchent l'économie** (0, 1, 3, 4, 5). C'est un monde persistant, sans remise à zéro, et la fin de partie est déjà hors cible. Leur test : si un bot glouton joue aussi bien qu'un bot réfléchi, la mécanique ne crée pas de décision. Le remettre pour ces lots ?
4. **La Porta.** La version 2 avait l'aperçu vert, ambre ou rouge. La version 3 le remplace par trois pastilles qui expliquent sans conclure, et limite l'équipage à deux combattants et un transport. D'accord ?
5. **Les stocks existants.** Les laisser fondre sous le plafond, ou les convertir en ducats sur quatre semaines ?
6. **Le lot 0** (le défaut des intrants) est un correctif du moteur. Le faire **dès votre go**, en premier, avec son annonce dans les notes du chapitre ?

## 9. Les décisions du porteur sur la version 3 (5 novembre 2026)

« Oui à tout », en attendant la refonte visuelle avant le go.

1. **La caisse et les postes** (§ 2.2) : oui. Le rendement Y(n) cède la place aux bras, et les volumes aux caisses.
2. **L'absence** ne coûte que par le **plafond** : un magasin ou un camp plein s'arrête, et une commande acceptée en retard paie moins. La table devient **le banquet**, un bonus choisi.
3. **Le simulateur redevient obligatoire pour les lots qui touchent l'économie** (0, 1, 3, 4, 5), toutes les graines, avec le test « bot glouton contre bot réfléchi ». CLAUDE.md est mis à jour.
4. **La Porta** : trois pastilles qui expliquent, sans verdict coloré ; deux combattants et un transport au plus.
5. **Les stocks existants** : convertis en ducats sur quatre semaines, comme le recommande l'économiste, pour que le magasin plafonné ait un effet sur les vétérans. À confirmer au moment du lot 3 : la question proposait deux voies.
6. **Le lot 0** (les intrants × Y(n)) passe en premier dès le go, avec son annonce dans les notes du chapitre.

**En attente** : le go vient après la refonte visuelle et des interactions menée par une autre session. Au go, on relit l'état du dépôt et on adapte la grammaire visuelle (§ 1) et chaque « Ce qu'on voit » à cette refonte avant de coder.
