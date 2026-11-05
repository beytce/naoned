# Recherche : ce qui donne de la profondeur aux jeux de gestion, et ce que Fondaco peut en tirer

*Note de documentaliste et de game designer, 5 novembre 2026. Elle accompagne `docs/plan-profondeur-2026-11-05.md` (version 2, validée par le porteur) et ne le remplace pas. Elle ne décide rien : elle propose.*

## 0. En bref

Les jeux étudiés ne sont pas profonds parce qu'ils ont beaucoup de systèmes. Ils le sont parce que **chaque ressource rare sert à deux choses à la fois**, et parce que **le joueur voit le problème avant de le subir**. Six motifs reviennent partout :

1. **Une rareté qui oblige à choisir** : Mini Metro donne un train et un choix entre deux améliorations par semaine ; Against the Storm propose des commandes qu'on ne peut pas toutes prendre ; Hades' Star fixe un nombre de places de module.
2. **La valeur dépend du trajet, pas seulement de la marchandise** : dans OpenTTD, on est payé à la distance et au délai ; dans Patrician et Railroad Tycoon 3, le prix change de ville en ville ; dans Hades' Star, une livraison vaut plus loin.
3. **Les intrants interchangeables et les recettes notées** : Against the Storm (ingrédients au choix, étoiles d'efficacité), Satisfactory (recettes alternatives), Anno 1800 (objets qui changent l'intrant). L'optimisation n'est plus « +x % » : elle porte sur **quoi** transformer, et **où**.
4. **Ce qui sort de trop doit aller quelque part** : les sous-produits de Captain of Industry, les cendres et les déchets d'Oxygen Not Included. Le goulot se déplace.
5. **L'adversaire s'annonce** : les intentions de Slay the Spire, les attaques télégraphiées d'Into the Breach, l'aperçu de la vague dans Kingdom Rush. On compose son équipe contre ce qu'on voit, pas contre une moyenne.
6. **Le problème se voit dans le monde** : les porteurs et leurs fanions dans The Settlers, les vendeuses du marché de Caesar III, les stations qui débordent dans Mini Metro, les icônes « sortie pleine » de Factorio.

Le plan actuel coche déjà beaucoup de ces cases. Ses deux faiblesses : il **ajoute des contraintes plus vite que des leviers de choix**, et il ne dit pas encore **comment la valeur d'une tournée se calcule**. Sans cela, la tournée « qui charge et décharge » restera un remplissage de soute (§ 6).

## 1. Méthode et limites

- **Recherche par moteur web.** Les wikis, les forums (Steam, GOG), les comptes rendus de conférences GDC, les entretiens et les guides ; les URL sont au § 7.
- **La lecture directe des pages (WebFetch) était bloquée** dans cette session : les hôtes `hades-star.fandom.com`, `wiki.openttd.org` et `www.openttd.org` n'étaient pas résolus. Les faits viennent donc des extraits des résultats de recherche, et de ma connaissance des jeux quand elle est sûre. Un fait tiré de ma seule connaissance est marqué *(connaissance du jeu)* ; un chiffre précis n'est cité que s'il vient d'une source.
- **Les débats de communauté** (listes de rang, « meilleur build », fils « que choisir ») sont pris comme **signe de profondeur**. Si une communauté discute d'un choix, ce choix existe.

## 2. Commerce et marchés

### 2.1 Patrician III / IV (Ascaron, Kalypso), le commerce hanséatique

**Mécaniques :**
- **Le prix glisse à chaque unité.** On achète en ville, et chaque lot coûte un peu plus que le précédent ; on vend, et chaque lot rapporte un peu moins *(connaissance du jeu)*. La quantité optimale à acheter ou à vendre est donc **une décision**, pas un « tout ».
- **Les villes ont une consommation et des productions propres.** Le marché affiche la consommation par semaine, mais la production par jour, ce qui piège les joueurs (fil GOG « consumption vs production »). Les joueurs conseillent de tenir **deux semaines de besoins en stock** dans la ville, et de vendre au « prix de satisfaction maximale » pour que la population grandisse (fils Steam).
- **Les routes automatiques à bornes de prix** (Patrician IV) : pour chaque ville et chaque marchandise, un prix plancher à la vente et un prix plafond à l'achat. Le correctif 1.2 a ajouté un réglage des quantités par pas de 10 %. Une critique juge le système trop compliqué.
- **La production locale dépend du contentement** : des citoyens heureux fournissent des ouvriers aux entreprises du joueur ; sans cela, les ateliers tournent à vide.

**Pourquoi ça marche.** La tension se joue entre **remplir la soute** et **ne pas casser le prix**. Le meilleur trajet n'est pas le plus rentable par unité, mais celui qui laisse la ville en bon état pour la prochaine fois. Le joueur devient le régulateur de son réseau.

**Ce qu'on voit.** Une barre de prix par marchandise (les guides de Port Royale décrivent quatre crans, de « rare » à « saturé »), un curseur de quantité où le prix bouge en direct, des convois sur la carte de la Baltique.

**Ce qu'en dit la communauté.** Des fils entiers sur « comment éviter que l'IA rachète tout » et sur les stocks de deux semaines, et des tableurs de routes. C'est aussi le **contre-exemple** : la profondeur y est réelle, mais elle **se lit dans des tableaux**. C'est exactement ce que la règle d'or 8 interdit.

### 2.2 Port Royale 4 (Gaming Minds)

**Mécaniques :**
- **Des jauges à quatre crans** par marchandise et par ville, de 0 (rare, prix maximal) à 4 (stock trop haut, prix au plus bas). La lecture est immédiate.
- **La production efficace par ville** : chaque ville produit bien certaines marchandises. La production du joueur sert à fabriquer en masse du peu cher pour les colonies qui en manquent, pas à faire de gros profits.
- **Le vent** : une route sous le vent passe de quelques semaines à quelques jours (critique de Gamewatcher).

**Le piège.** L'automatisation « standard » achète ce que la ville produit et le vend là où c'est demandé. Mais l'interface des routes ne montre pas la demande, seulement la production, et les profits sont difficiles à suivre (aperçu de Niche Gamer ; critique de Prima). **Leçon** : une route automatique doit **montrer son résultat**, pas seulement ses réglages.

### 2.3 Offworld Trading Company (Mohawk Games, Soren Johnson)

**Mécaniques :**
- **Un seul marché, piloté par les joueurs** : treize ressources dont le prix bouge en temps réel. Inonder le marché d'une ressource fait baisser son prix, ce qui frappe les rivaux qui en ont stocké.
- **La rareté est le moteur.** L'expansion coûte des ressources, les concessions sont limitées, et un manque devient plus dur à combler avec le temps.
- **Pas de combat** : on gagne en rachetant ses concurrents en bourse. Le marché noir sert à harceler (pirates, impulsion électromagnétique).

**Pourquoi ça marche.** Chaque unité produite **a une valeur qui dépend des autres**. Produire « plus » n'est jamais une réponse en soi : il faut produire **ce qui manque**, et le reste s'effondre.

**Ce qu'on voit.** Un bandeau des cours permanent, des flèches qui montent et descendent, des véhicules qui partent livrer au QG.

**Pour Fondaco.** Fondaco n'a pas de PvP économique direct (règle d'or 1). Mais le **marché par région** (CADRAGE-v3 § 3 quater) est déjà partagé : la leçon d'Offworld est d'y faire **vivre la rareté** (une marchandise que tout le monde produit doit s'y voir baisser), sans prise ni vol.

### 2.4 Railroad Tycoon 3 (PopTop)

**Mécaniques :**
- **Un champ de prix** : la marchandise se déplace le long du gradient d'un prix, les sites de production et de demande en sont les sources et les puits. Les charges avancent lentement d'elles-mêmes, par route et par fleuve, même sans le joueur (Wikipédia).
- **Les industries liées** : une brasserie ne sert à rien sans grain. Quand le grain manque autour d'elle, son prix monte (Giant Bomb).
- **Le prix par gare** : la différence de prix entre deux gares est la prime du transporteur (guide GameFAQs).

**Pourquoi ça marche.** La carte **est** l'économie. On voit où le prix est haut, et le chemin de fer vient « court-circuiter » un flux qui existait déjà.

### 2.5 Caesar III / Pharaoh (Impressions Games), la distribution

**Mécaniques :**
- **Les marcheurs** : un marché envoie deux personnes, l'une qui erre et vend aux maisons, l'autre qui va chercher au grenier ou à l'entrepôt (fil GOG). Les services se diffusent par des gens qui marchent dans les rues, et non par un rayon invisible. Une maison est servie si un marcheur passe devant.
- **Les tampons** : dans Pharaoh, chaque bazar a trois vendeuses ; le grenier ne vend pas, il sert de tampon (fil Steam de Pharaoh: A New Era).

**Pourquoi ça marche.** La logistique est **spatiale et visible** : une maison qui se dégrade, c'est qu'aucune vendeuse ne passe devant. Le plan de la ville est l'énigme.

**Débat.** Les joueurs se plaignent de vendeuses qui ne vont pas chercher ce qui manque (« stuck in the market loop »). Une règle visible mais **opaque dans ses priorités** frustre plus qu'une règle cachée.

## 3. Production et chaînes

### 3.1 Anno 1800 (Ubisoft Mainz)

**Mécaniques :**
- **Les niveaux de population** : cinq dans l'Ancien Monde. Les besoins de base font grandir la population ; les besoins de luxe donnent du bonheur et des revenus. Une maison ne monte de niveau que pleine, et ses besoins de base remplis (wiki Anno 1800).
- **La main-d'œuvre a un niveau** *(connaissance du jeu)* : une usine d'Artisans demande des Artisans. Faire monter ses Ouvriers en Artisans **vide** les usines qui en avaient besoin. Monter n'est pas gratuit.
- **Les ratios** : la plupart des chaînes ne sont pas 1:1, mais 2:1 ou 3:2 (guide de Prima Games). Des calculateurs communautaires existent.
- **Les syndicats et leurs objets** : un bâtiment qui renforce la production autour de lui. Ses objets changent **l'intrant** (la fabrique d'armes prend de la bauxite au lieu de l'acier ; la fabrique de cigares, du bois au lieu du placage), ou ajoutent un produit. Les spécialistes légendaires suppriment des chaînes entières (wiki Anno 1800 ; TheGamer).
- **Les sessions et les routes de commerce** : chaque île a ses fertilités, et les routes relient les îles. Les quais sont un goulot : les navires y attendent, et les routes circulaires embouteillent (fils Steam).
- **Les expéditions** *(connaissance du jeu)* : on charge un navire d'objets qui ont des attributs (force, diplomatie, foi, médecine, navigation…). Les événements testent ces attributs. **On s'équipe contre un type d'épreuve.**

**Pourquoi ça marche.** Chaque montée de niveau crée **un nouveau manque**. La ville n'est jamais finie : la réussite ouvre le problème suivant. Les objets de syndicat rendent la disposition (quel bâtiment à côté de quel syndicat) aussi importante que la quantité.

**Ce qu'on voit.** Des icônes de besoins au-dessus des maisons, la fumée des usines, les charrettes sur les routes, les navires au quai, et un panneau « production / consommation » par marchandise (le côté tableur, assumé, d'Anno).

### 3.2 Against the Storm (Eremite Games)

**Mécaniques :**
- **Les recettes à intrants au choix** : un bâtiment fait un produit à partir de plusieurs combinaisons d'ingrédients. Le jeu marque d'une bordure spéciale les ingrédients interchangeables (wiki Hooded Horse).
- **Les étoiles d'efficacité** : chaque recette, dans chaque bâtiment, a de 0 à 3 étoiles. Le même pain se fait mieux au four qu'au feu de camp. Les guides font des diagrammes de Venn des ingrédients et des tableaux « quel bâtiment, combien d'étoiles » (NAGuide).
- **Les plans au tirage** : on ne choisit pas ses bâtiments dans un catalogue. On en tire un parmi quelques-uns, à chaque palier de réputation *(connaissance du jeu ; guide Casual Game Guides)*. On construit **avec ce qu'on a**.
- **Les commandes (Orders)** : des objectifs de la Reine, qui rapportent de la réputation. Plusieurs sont **au choix**, certains ont un temps limité *(connaissance du jeu)*. Livrer une commande baisse l'Impatience, mais monte l'Hostilité. Des joueurs **attendent** donc avant de rendre une commande (wiki Hooded Horse, « Reputation »).
- **Les pierres angulaires (Cornerstones)** : chaque année, un bonus permanent à choisir parmi plusieurs. Elles orientent toute la partie. Les débats sont vifs : « la plupart sont inutiles » contre « celles qui baissent l'Hostilité sont les meilleures » (fils Steam).
- **La tempête et l'Hostilité** : un cycle bruine, éclaircie, tempête. Ouvrir des clairières dangereuses rapporte, mais monte l'Hostilité.

**Pourquoi ça marche.** Le concepteur Michał Ogłoziński explique que la ville est un **avatar** : les commandes, l'exploration, la résolution et les pierres angulaires en sont nées (Game Developer). Le joueur ne cherche pas la recette parfaite. Il cherche **la meilleure avec ce qu'il a tiré**. Le cofondateur Łukasz Korzanowski dit vouloir garder intéressant ce qui est d'ordinaire le meilleur moment du genre : les deux premières heures, celles des problèmes qui se chevauchent.

**Ce qu'on voit.** Les étoiles sur chaque recette, la bordure des intrants interchangeables, la jauge d'Impatience et d'Hostilité, le ciel qui s'assombrit avec la tempête.

**Critique.** Une analyse de design (Radiator Blog) juge la fin de partie faible, faute d'autre but que des points de victoire génériques. Ogłoziński reconnaît qu'il faut mieux récompenser la spécialisation.

### 3.3 Factorio (Wube) et Satisfactory (Coffee Stain)

**Mécaniques :**
- **Les ratios et la saturation** : un tapis plein se voit, un tapis clairsemé aussi. Le débit est devenu un nombre entier exprès pour que les ratios se calculent (fil du Friday Facts n° 276). Une machine montre une icône quand **elle manque d'intrant** ou quand **sa sortie est pleine** *(connaissance du jeu)*.
- **Le goulot qui se déplace** : doubler une étape déplace le manque sur la suivante. Un joueur note que le goulot est « difficile à diagnostiquer sans tests poussés ou le wiki » (même fil). La lisibilité du goulot est donc un **travail de design**, pas un acquis.
- **Les recettes alternatives** (Satisfactory) : on les découvre en ouvrant des disques durs ; chaque disque propose un choix de deux recettes, avec une seule relance. On peut garder des disques pour choisir plus tard (Prima Games, Dexerto). Les listes de rang se contredisent : le « Heavy Encased Frame » fait l'unanimité, le reste non. **C'est le signe d'un vrai choix.**

**Pourquoi ça marche.** L'optimisation porte sur **la forme du réseau**, pas sur un chiffre. Une recette alternative change **quelles mines** on exploite, donc où l'on bâtit.

**Le piège pour Fondaco.** Factorio est un jeu de longues sessions au clavier. Ses ratios doivent rester **sous le capot** : le joueur mobile voit un atelier qui attend, pas un ratio de 3:2.

### 3.4 Captain of Industry (MaFi Games), les sous-produits

**Mécaniques :**
- **Tout sous-produit doit aller quelque part.** Le laitier vient de la fonte ; le soufre vient du pétrole et des fumées. Le laitier broyé sert au béton, ou se déverse en mer comme remblai ; le soufre sert au caoutchouc, à l'acide, aux engrais et au tofu, ou se brûle (wiki officiel ; fils Steam).
- **Chaque façon de s'en débarrasser coûte** : déverser crée une pollution des sols, brûler une pollution de l'air (wiki, « Waste »).
- **Les choix de chaîne réduisent les restes** : refondre de la ferraille ne produit pas de laitier.

**Pourquoi ça marche.** Le sous-produit transforme une chaîne en **réseau** : il crée une raison de bâtir l'atelier qui le valorise, et une pénalité visible si on ne le fait pas.

**Débat.** Certains joueurs finissent à court de mer où déverser, d'autres n'ont jamais eu de problème de laitier. La contrainte **se règle** : elle ne punit pas tout le monde pareil.

### 3.5 Banished (Shining Rock) et Frostpunk (11 bit studios)

**Banished :**
- **Les gens font tout et consomment tout** : nourriture, bois de chauffe, vêtements, outils. Les outils s'usent.
- **La cascade** classique : moins de pierre et de fer, donc moins d'outils, donc moins de nourriture, donc la famine (fils Steam). Elle est **lisible a posteriori**, mais mal annoncée.
- **Croître lentement** : accueillir trop de nomades d'un coup provoque une famine. Le choix de **ne pas grandir** est une décision.

**Frostpunk :**
- **Le livre des lois** : des décisions souvent **irréversibles**, ordonnées pour faire glisser le joueur pas à pas (« la grenouille qu'on chauffe », entretien de PC Gamer). Aucune n'est meilleure dans l'absolu (GameSpot).
- **Le générateur et ses anneaux** : la chaleur rayonne en cercles autour du centre. La monter chauffe plus, mais brûle bien plus de charbon. **La géographie de la ville suit la chaleur.**

**Pour Fondaco.** La boucle des outils de Banished est exactement celle du § 2.7 du plan (la mine nourrit la forge, qui nourrit la mine). Son défaut est de **s'effondrer en silence**. Les cercles de Frostpunk sont un modèle de **zone d'effet visible** (pour les nuisances et le voisinage, § 2.6).

### 3.6 Workers & Resources: Soviet Republic (3Division) et Oxygen Not Included (Klei)

**Workers & Resources :**
- **Rien n'apparaît de nulle part** : chaque ouvrier va au travail en bus, et chaque matière est transportée par un véhicule.
- **L'ordre des arrêts compte** : les joueurs ordonnent les arrêts de bus par importance, pour que les ouvriers arrivent à la mine avant l'usine (fil Steam). Un immeuble peut désigner jusqu'à cinq lieux de travail.
- Un seul véhicule bloqué peut faire s'effondrer toute la logistique (Gamepressure).

**Oxygen Not Included :**
- **Les problèmes émergents** : chaque solution apporte un nouveau problème, par rareté et par effet domino (Gideon's Gaming). La pression, la température et les germes suivent une physique.
- **Les calques** *(connaissance du jeu)* : oxygène, électricité, plomberie, température. Un toucher montre **une seule couche** de l'économie sur le plan.

**Pour Fondaco.** W&R est **l'extrême à ne pas atteindre** : vrai, mais épuisant. Son idée utile est **l'ordre des arrêts** (§ 3.2, 4 du plan). ONI apporte **le calque** : c'est la bonne forme pour la « vue des flux » du § 2.4 du plan.

### 3.7 Dwarf Fortress (Bay 12), la qualité qui se voit

**Mécaniques :**
- **Six niveaux de qualité marqués par des symboles autour du nom** : -objet-, +objet+, \*objet\*, ≡objet≡, ☼objet☼ *(connaissance du jeu)*. Les joueurs trient les dépôts par qualité et refondent ce qui n'est pas un chef-d'œuvre (guide Steam).
- **Les dépôts tampons** : un petit dépôt collé à l'atelier évite au maçon d'aller chercher une pierre à des centaines de cases. Les conteneurs lourds ralentissent le transport (wiki Dwarf Fortress).

**Pour Fondaco.** Le **cerclage** du § 2.5 du plan est la même idée, et elle est bonne : un signe sur l'objet, partout, sans fiche. Le dépôt collé à l'atelier préfigure le **voisinage spatial** (§ 2.6).

## 4. Logistique et transport

### 4.1 OpenTTD et Transport Tycoon

**Mécaniques :**
- **La paie = taux × quantité × distance × facteur de délai.** Chaque marchandise a deux seuils de jours (days1, days2) au-delà desquels elle paie moins. La distance est celle de Manhattan entre les deux gares (wiki OpenTTD, « Cargo income »).
- **La distance optimale** : environ 70 jours pour ce qui se gâte (passagers, courrier, denrées), environ 130 jours pour le reste (FAQ OpenTTD).
- **La note de la gare** : une gare servie souvent reçoit plus de marchandise ; sous 50 %, même la marchandise en attente disparaît peu à peu. Elle dépend du temps depuis le dernier passage, de la vitesse des véhicules et de la marchandise qui attend (wiki OpenTTD ; spécifications NewGRF).
- **L'ordre « attendre plein »** *(connaissance du jeu)* : partir plein et tard, ou partir à moitié et tôt.

**Pourquoi ça marche.** Trois leviers tirent en sens contraire : **plus loin** (paie plus), **plus vite** (le délai baisse la paie), **plus souvent** (la note de la gare). Une bonne ligne est un compromis, et chaque marchandise a le sien. Le poisson ne va pas loin ; le charbon, si.

**Ce qu'on voit.** La note de la gare en pourcentage coloré, la marchandise qui s'entasse sur le quai, et un graphique de paie par marchandise selon les jours de trajet.

### 4.2 The Settlers (Blue Byte)

**Mécaniques :**
- **La chaîne humaine** : les porteurs prennent un objet à un fanion et le portent au suivant ; huit objets au plus par fanion (oldgames.sk).
- **L'embouteillage** : si plusieurs flux passent par le même fanion, la route se bouche. Les guides conseillent de contourner le fanion du château (settlers2.net).
- **Les priorités** de transport réglables ; les collines ralentissent les porteurs, et les ânes aident.
- Dans *New Allies* : les porteurs sont la population. En faire des soldats ralentit tout.

**Pourquoi ça marche.** Le goulot **a une adresse** : on le voit, c'est le fanion où les caisses s'entassent. On le corrige en traçant une deuxième route.

### 4.3 Mini Metro (Dinosaur Polo Club)

**Mécaniques :**
- **Les ressources minimales** : quelques lignes, quelques trains, quelques tunnels. Chaque semaine, une locomotive de plus, et **un choix entre deux** améliorations : wagon, ligne, tunnel, station agrandie (Pocket Gamer, Android Central).
- **L'échec visible** : une station surchargée s'entoure d'un cercle de minuterie qui se remplit.

**Pourquoi ça marche.** Un critique l'a résumé : ce n'est pas un jeu de gestion de ressources, c'est un jeu de gestion de **peu** de ressources (csanyk.com). Le choix de la semaine **change la stratégie**.

**Débat.** Les wagons seraient de loin la meilleure amélioration, ce qui affaiblit le choix (Android Central). Un choix entre deux ne vaut que si **les deux options gagnent selon la situation**.

### 4.4 Hades' Star (Parallel Space), le modèle de Fondaco

**Mécaniques :**
- **Les livraisons (shipments)** : chaque planète, lune ou station commerciale en génère avec le temps. Chacune a une destination et une valeur, et un transport les porte (guide de Prima Games ; Steam).
- **L'indicateur de destinations** : la recherche « Shipment Computer » montre, sur chaque planète, combien de livraisons vont où (fil Steam).
- **Les modules de commerce** : extension de soute ; Trade Boost (bonus de livraison) ; Trade Burst, qui livre tout à l'arrivée sur une station, même ce qui va ailleurs, avec une paie réduite (wiki Hades' Star). Un module charge d'un coup les livraisons de plus faible valeur d'un avant-poste, avec 20 minutes de recharge.
- **Le drone de livraison** : non pilotable, il ramasse jusqu'à 10 livraisons qu'il peut porter. Son bonus monte avec le nombre de livraisons par planète (NamuWiki ; Steam). Les joueurs **pré-groupent** les livraisons sur une planète proche du couloir pour que le drone les prenne (Steam).
- **Les places de module, en nombre limité**, sur chaque vaisseau. Le cuirassé des étoiles rouges a des places d'arme, de bouclier et de soutien (NamuWiki ; wiki).

**Pourquoi ça marche.** **Le joueur fait lui-même la logistique sans tableur** : il voit les livraisons comme des points sur les planètes, il touche un transport, il touche une planète. L'optimisation (grouper, choisir quel module porte le transport) est **émergente**, et la communauté en discute (fils Steam sur le cumul des modules).

**Pour Fondaco.** Hades' Star est déjà la référence du cadrage. Sa **pré-mise en commun des livraisons** (on rassemble sur un relais pour qu'un transport ramasse tout) est une idée simple que le plan n'a pas encore (§ 5, proposition 5).

## 5. Composition d'équipe et contres

### 5.1 Hades' Star : les étoiles rouges et les étoiles blanches

**Mécaniques :**
- **Le cuirassé et ses modules.** Armes (laser, batterie, barrage…), boucliers (alpha, delta, passif, omega, miroir, de zone…) et soutiens (impulsion électromagnétique, téléportation, prolongateur d'étoile rouge…), à poser sur des places en nombre limité (tableau des modules du wiki ; NamuWiki).
- **Les vaisseaux de Cerberus ont chacun un comportement** *(connaissance du jeu, simplifié)* : la sentinelle immobile, l'intercepteur rapide qui chasse, le gardien qui protège ses voisins, le colosse lent. **Les rôles se lisent à la silhouette.**
- **Le « dispatch »** : faute de boucliers de zone ou de souffle suffisants, on perd sa flotte de soutien (wiki).

**Ce que la communauté en dit.** Des fils « quel bouclier pour quel niveau d'étoile rouge », des débats sur le cumul des modules, et des builds partagés.

### 5.2 Darkest Dungeon (Red Hook)

**Mécaniques :**
- **Les rangs** : quatre places, chaque compétence ne s'utilise que depuis certains rangs et ne frappe que certains rangs adverses. La forme classique : un tank devant, deux attaquants, un soutien derrière (guides de TheGamer et de Gfinity).
- **Le déplacement subi** : un ennemi qui repousse ou tire un héros casse sa formation *(connaissance du jeu)*.
- **L'approvisionnement avant le départ** *(connaissance du jeu)* : torches, vivres, pelles, bandages, achetés avant l'expédition. Trop peu, on échoue ; trop, on a payé pour rien. **La préparation est un pari sur ce qu'on va rencontrer.**

**Pourquoi ça marche.** Les classes ne sont pas « fortes » ou « faibles » : elles le sont **à un rang, contre un adversaire**. Les listes de rang mettent les plus flexibles en tête (Croisé, Maître-chien), ce qui montre que la flexibilité est une valeur.

### 5.3 Into the Breach (Subset Games)

**Mécaniques :**
- **L'information parfaite** : toutes les attaques ennemies sont annoncées sur la grille au début du tour. Le concepteur Matthew Davis voulait que chaque mort semble être **la faute du joueur** ; le hasard est réduit au minimum (Game Developer ; GDC 2019).
- **Peu d'unités, beaucoup de synergies** : trois mechs par escouade, qui repoussent, tirent, bloquent.
- **Des combats courts** : un compteur de tours limité, et le télégraphe qui accélère le rythme (Wikipédia).

**Pourquoi ça marche.** Le joueur ne joue pas contre le hasard mais contre **un problème posé**. Il gagne en lisant la carte.

### 5.4 Slay the Spire (Mega Crit)

**Mécaniques :**
- **Les intentions** : une icône au-dessus de chaque ennemi dit ce qu'il fera au prochain tour (attaque et dégâts, défense, malédiction). Elles ont remplacé un ancien système « Next Turn » (Wikipédia).
- **La carte des chemins** : on voit à l'avance les salles d'élite, les feux de camp et les marchands, et l'on choisit son chemin selon son paquet *(connaissance du jeu)*.
- **L'équilibrage par les données** : un outil maison enregistrait chaque partie des testeurs (GDC 2019, Anthony Giovannetti).

**Pour Fondaco.** L'intention de Slay the Spire est le **modèle exact** de l'écu de protection au-dessus de chaque figurine de Rome (§ 4.3 du plan). La carte des chemins préfigure la reconnaissance de la Porta (§ 4.2).

### 5.5 FTL (Subset Games)

**Mécaniques :**
- **Les boucliers par couches** : les lasers et les rayons sont arrêtés par les boucliers, les missiles les traversent. Le combo classique est **ion, puis rayon et laser** : l'ion abat le bouclier, les autres frappent (fils Steam).
- **L'énergie à répartir** *(connaissance du jeu)* : un réacteur à barres, que l'on distribue entre armes, boucliers, moteurs et systèmes. **Une jauge de capacité qui force à choisir.**

**Pour Fondaco.** La **charge** du § 4.4 du plan est cette jauge d'énergie. La synergie d'ouverture (abattre la protection, puis frapper) donne une idée : une arme qui **ouvre** (la poudre brise les plates) et une autre qui **exploite**.

### 5.6 Kingdom Rush (Ironhide) et Bloons TD 6 (Ninja Kiwi)

**Kingdom Rush :**
- **Armure contre résistance magique** : l'armure réduit les dégâts physiques de son pourcentage, la résistance magique les dégâts magiques ; les dégâts vrais ignorent les deux. Les mages ignorent l'armure, l'artillerie ignore la moitié de l'armure, les archers servent contre ce qui résiste à la magie (Ironhide ; wiki).
- **Le conseil officiel** : une tour de chaque type pour tout couvrir. Les exceptions font le sel : le Worg, rapide et résistant à la magie, est le cauchemar des mages.
- **L'aperçu de la vague** *(connaissance du jeu)* : une icône sur le chemin annonce la prochaine vague, et on peut la consulter.

**Bloons TD 6 :**
- **Des propriétés qui immunisent** : le camouflage (invisible pour la plupart des tours), le plomb (insensible au tranchant et au froid), le violet (insensible à l'énergie, au feu, au plasma ; les sources divergent). Le jeu encode cela par une liste de propriétés auxquelles chaque attaque ne peut rien (Bloons Wiki).
- **Les propriétés se combinent** sur un même ballon : camouflé et plombé. Une seule tour ne suffit jamais.

**Pourquoi ça marche.** **Une table courte, fixe et visible**, et des adversaires qui **combinent** deux traits. Le joueur apprend la table en dix minutes, mais compose différemment à chaque carte.

## 6. Boucle courte, placement, cartes

### 6.1 Stardew Valley (ConcernedApe)

- **L'énergie du jour** : on se réveille avec une réserve, et labourer en coûte (wiki Stardew Valley). Chaque jour pose une question : « qu'est-ce que je fais aujourd'hui ? ».
- **Les saisons** : 28 jours, et les cultures hors saison meurent au changement. Le calendrier force à planifier.
- **Les paquets du Centre communautaire** *(connaissance du jeu)* : des collections d'objets à rendre (un de chaque poisson du printemps, des cultures de qualité or…), avec un tableau dessiné qui se remplit. **Ce sont des contrats de ville en tout point**, et la communauté en publie des listes de planification.
- **La qualité en étoiles** sur l'objet (argent, or, iridium), visible partout *(connaissance du jeu)*.

### 6.2 Islanders (Grizzly Games)

- **Le score par placement** : chaque bâtiment a une zone d'influence, et ses points dépendent de ses voisins et du terrain. Certains ont un score de base négatif, qu'il faut compenser par de bons voisins (islaguru.com).
- **Le paquet suivant** : atteindre un seuil de points ouvre un choix entre deux paquets de bâtiments.
- **L'aperçu chiffré** *(connaissance du jeu)* : en déplaçant un bâtiment, les points gagnés et perdus s'affichent en direct au-dessus des voisins.

**Pourquoi ça marche.** Un seul geste (placer), une seule ressource (les points), et l'aperçu **avant** la décision. C'est le modèle de l'aperçu vert et rouge du § 2.6 du plan.

### 6.3 Cultist Simulator (Weather Factory)

- **Des cartes qui pourrissent** : certaines ont leur minuterie, et se changent en une autre carte quand elle se vide (l'agitation devient de l'effroi).
- **Des minuteries courtes**, de 30 ou 60 secondes, pour ne pas noyer le joueur (Game Developer).
- **Des objets « significatifs mais jetables »** : ils vont et viennent (Alexis Kennedy).

**Pour Fondaco.** Le périssable (§ 2.1 du plan) gagne à suivre cette forme : **la caisse elle-même** change d'aspect et finit par devenir une autre chose (le poisson devient « poisson gâté », que le tanneur ou le jardinier acceptent), plutôt qu'une perte sèche.

## 7. Les motifs transverses

| Motif | Jeux | Ce qu'il fait |
| --- | --- | --- |
| **Une rareté à double usage** | Anno (ouvriers par niveau), Banished (les mêmes bras), FTL (l'énergie), Mini Metro | Chaque ressource rare sert deux besoins, d'où un arbitrage permanent |
| **Une valeur qui dépend du trajet et du temps** | OpenTTD, Hades' Star, Patrician, Railroad Tycoon 3 | La même caisse vaut plus ou moins selon où, quand et à qui |
| **Choisir parmi deux ou trois** | Against the Storm, Satisfactory, Mini Metro, Islanders | Moins de catalogue, plus de décisions ; on fait avec ce qu'on a |
| **Des intrants interchangeables, notés** | Against the Storm, Anno (objets), Satisfactory | Optimiser **quoi** et **où**, pas « +x % » |
| **Le sous-produit oblige** | Captain of Industry, ONI | La chaîne devient un réseau ; le goulot se déplace |
| **L'adversaire s'annonce** | Into the Breach, Slay the Spire, Kingdom Rush | On compose contre ce qu'on voit ; l'échec est sa faute |
| **Une table courte de contres, des traits combinés** | Kingdom Rush, Bloons, FTL | Facile à apprendre, chaque carte différente |
| **Le goulot a une adresse** | Settlers, Factorio, Mini Metro, Caesar III | On voit où ça coince ; on corrige au bon endroit |
| **L'aperçu avant le geste** | Islanders, Into the Breach | Le joueur teste sans payer ; la décision est réfléchie |
| **Une automatisation qui montre son résultat** | Hades' Star (oui), Port Royale (non) | Sans retour visible, l'automatisation devient opaque |

## 8. Leçons pour Fondaco : dix-huit propositions

Chaque proposition donne : (a) la mécanique, (b) le jeu source, (c) la décision créée, (d) sa représentation dans Fondaco, (e) les pièges. Elles se rattachent aux lots du plan ; aucune n'ajoute un « système » de plus sans en absorber un.

### P1. La paie de la livraison selon la fraîcheur et la distance (lot 2)
- **(a)** Une commande paie selon la distance de la ville au fondaco qui l'a servie, et selon le temps écoulé depuis le départ de la caisse. Chaque marchandise a sa courbe : le poisson perd vite, le marbre jamais.
- **(b)** OpenTTD (days1/days2, distance de Manhattan) ; Hades' Star (la livraison vaut plus loin).
- **(c)** « Je sers Padoue, proche et sûre, ou Vérone, qui paie plus, mais dont le poisson arrivera tiède ? » Le joueur choisit **quoi envoyer où**, et pas seulement « tout ».
- **(d)** Le **sablier** du plan, posé sur la caisse en soute, **pas seulement sur la commande**. Il coule pendant le trajet ; la pièce d'or au-dessus de la caisse rétrécit à vue.
- **(e)** Ne pas afficher la formule. Une courbe par **famille** de marchandises (trois : frais, ordinaire, durable), pas une par marchandise.

### P2. Une offre de commandes qu'on ne peut pas toutes prendre, et un tirage parmi deux (lot 2)
- **(a)** Chaque ville présente ses commandes en **paires** : on en accepte une, l'autre part. Les commandes acceptées occupent des **places de carnet** limitées (par exemple 3 au début, 6 à la Casa 10).
- **(b)** Against the Storm (commandes au choix et à temps) ; Mini Metro (deux améliorations, une seule prise).
- **(c)** Le joueur s'engage. Il ne prend plus tout : il prend **ce que son réseau sait faire**, ou ce qui le pousse à bâtir.
- **(d)** Deux caisses côte à côte sur le quai de la ville. On en tire une vers sa charrette, l'autre s'éloigne en barque. Le carnet est une **rangée de crochets** au quai du fondaco, chaque commande prise y pend.
- **(e)** Les deux options doivent **gagner selon la situation** (la leçon des wagons de Mini Metro). Si l'une est toujours meilleure, le choix est faux.

### P3. Les goûts des villes, mais aussi leur saturation visible au marché régional (lots 2 et 10)
- **(a)** Les goûts des villes (gardés au § 3.2 du plan) sont **complétés** par une jauge de saturation **au marché régional** : une marchandise vendue en masse par tout le monde voit son prix baisser.
- **(b)** Offworld Trading Company ; Port Royale (quatre crans) ; Patrician (le prix qui glisse à chaque unité).
- **(c)** « Tout le monde fait du verre cette semaine ; moi je passe au drap. » La rareté collective oriente la production **sans PvP direct**.
- **(d)** Au Rialto, chaque marchandise a une **pile sur l'étal** : haute, le prix est bas ; basse, il monte. On vend en glissant ses caisses sur la pile, et l'on voit le prix reculer à chaque caisse.
- **(e)** Le plan a retiré « la ville rassasiée » parce qu'elle poussait seulement à tourner de ville en ville. Ici, c'est le **marché commun** qui sature, et la réponse est de **changer de production**, pas de ville. Ne pas cumuler les deux.

### P4. La tournée à ordre d'arrêts et le fret de retour (lot 3)
- **(a)** L'ordre des arrêts change le résultat : livrer d'abord le frais, ramasser le lourd en dernier pour ne pas ralentir tout le trajet. Un véhicule chargé de marbre roule plus lentement.
- **(b)** Workers & Resources (ordre des arrêts) ; OpenTTD (attendre plein ou partir) ; The Settlers (les collines ralentissent).
- **(c)** « Carrière d'abord, ou Vérone d'abord ? » Le même ensemble d'arrêts donne deux résultats.
- **(d)** La **frise de la tournée** du plan, avec la soute en grille sous chaque arrêt. On **glisse** un arrêt pour le permuter ; les sabliers et la pièce d'or de la tournée se recalculent en direct.
- **(e)** Limiter à **quatre arrêts** par tournée, sinon c'est un problème de voyageur de commerce qu'on résout sur PC, pas en trois minutes. Toujours proposer un ordre par défaut raisonnable.

### P5. Le relais : grouper les caisses pour qu'un véhicule les prenne d'un coup (lot 3)
- **(a)** Un fondaco secondaire, un camp ou un quai peut servir de **relais** : on y dépose des caisses destinées à plusieurs villes, et un grand véhicule les y reprend toutes.
- **(b)** Hades' Star (les joueurs pré-groupent leurs livraisons près du couloir pour le drone) ; OpenTTD (les transferts).
- **(c)** « Je fais deux petites tournées, ou une petite et une grande depuis le relais de Padoue ? » Il naît une **architecture du réseau**.
- **(d)** Sur la carte, un relais a une **petite grue** et des caisses aux couleurs de plusieurs villes. Une flèche pointillée relie chaque caisse à sa destination.
- **(e)** C'est un levier de joueur avancé : à ouvrir tard (Casa 8 et plus), quand le joueur a trois véhicules au moins.

### P6. Les recettes à intrants au choix, notées en étoiles (lot 6)
- **(a)** Chaque produit fini a **deux ou trois recettes**, avec des intrants différents. Chaque atelier fait chaque recette avec une note de 1 à 3 étoiles (la vitesse). Le même drap se fait mieux au moulin de rivière qu'à l'atelier de ville.
- **(b)** Against the Storm (étoiles, ingrédients interchangeables) ; Anno 1800 (objets qui changent l'intrant) ; Satisfactory.
- **(c)** « Je fais le verre à la soude d'Alexandrie, ou aux cendres de salicorne ? À Murano, trois étoiles ; ailleurs, une. » L'optimisation porte sur **quoi** et **où**, ce que demande le porteur.
- **(d)** Sur l'atelier, la recette en cours est **une petite enseigne pendue** : les icônes des intrants, et de 1 à 3 étoiles. Un intrant interchangeable a une **bordure tressée**. Toucher l'enseigne fait tourner les recettes possibles, et les caisses du magasin qui conviennent s'allument.
- **(e)** C'est la **meilleure** réponse à « la production est trop simple » : elle ajoute du choix sans contrainte nouvelle. Garder trois étoiles au plus, et ne jamais montrer de tableau croisé.

### P7. Les plans au tirage, plutôt qu'un catalogue (lots 6 et 7)
- **(a)** Les recettes fines, les ateliers spéciaux et les outils de haut niveau ne s'achètent pas au catalogue. À chaque palier (Casa, Arte, relique déchiffrée), on en **tire un parmi trois**.
- **(b)** Against the Storm (plans au tirage) ; Satisfactory (disques durs, choix parmi deux, une relance) ; Hades' Star (les reliques donnent des plans, déjà dans la règle d'or 5).
- **(c)** Deux joueurs de même niveau ont **des domaines différents**. Les conseils deviennent : « avec le moulin à foulon et la teinturerie, va vers le drap fin ».
- **(d)** Trois **parchemins scellés** sur la table du palais ; on en brise un, les deux autres se referment. On peut en garder un de côté pour plus tard (la bibliothèque des disques durs de Satisfactory).
- **(e)** Un monde persistant ne pardonne pas un tirage raté pour toujours. Prévoir une **relance payée en Faveur** et un moyen lent de tout finir par obtenir.

### P8. Les pierres angulaires de la Maison (absorbe une partie de l'Arte et du Stato)
- **(a)** À quelques paliers (Casa 7, 10, 14), un **choix permanent parmi trois** qui oriente la Maison : « les denrées se gâtent deux fois moins vite », « les mules portent un tiers de plus en montagne », « chaque sous-produit vendu à la Dogana rapporte le double ».
- **(b)** Against the Storm (pierres angulaires) ; l'Arte et le Stato du CADRAGE-v3 sont déjà de ce type.
- **(c)** Le joueur se spécialise ; la communauté débat (« la meilleure pierre pour une Maison de mer »).
- **(d)** Une **pierre gravée** posée dans la façade de la Casa, visible sur la carte : on lit la Maison d'un coup d'œil.
- **(e)** Ne pas les multiplier (trois ou quatre au total). Elles **absorbent** des bonus d'aujourd'hui, elles ne s'y ajoutent pas.

### P9. Les sous-produits qui doivent aller quelque part, et la caisse qui pourrit en autre chose (lots 1 et 6)
- **(a)** Les sous-produits du § 2.4 du plan occupent la place du magasin. Le périssable, au lieu de disparaître, **devient** un sous-produit (poisson gâté, fruits blets), que certains ateliers prennent (engrais, tannerie, porcs).
- **(b)** Captain of Industry (laitier, soufre) ; Cultist Simulator (la carte qui se change en une autre).
- **(c)** « Je bâtis la tannerie pour mes peaux, ou je les brade ? » Le sous-produit crée une **raison** de bâtir, et pas seulement une pénalité.
- **(d)** Les restes s'entassent **dans la cour** de l'atelier, comme le dit le plan. La caisse de poisson change de teinte, se couvre de mouches, puis devient un tas brun qu'on peut glisser vers le jardin.
- **(e)** Pas plus d'**un** sous-produit par recette, et chacun doit avoir **au moins deux débouchés**, dont un simple (la Dogana).

### P10. La main-d'œuvre par niveau : monter vide les ateliers d'en bas (lot 5)
- **(a)** Les **artisans** du § 2.3 du plan sont formés à partir des ouvriers. Former un verrier **retire** un ouvrier du four à chaux. Les besoins de table montent avec le niveau (l'artisan veut du vin).
- **(b)** Anno 1800 (main-d'œuvre par niveau, besoins de base et de luxe) ; Banished (les mêmes bras pour tout).
- **(c)** « Je forme mon troisième verrier maintenant, ou j'attends d'avoir une maison de plus ? » Monter n'est pas gratuit.
- **(d)** Des **figurines** de deux couleurs (blouse brune pour l'ouvrier, tablier bleu pour l'artisan). Au-dessus des maisons, l'assiette et la cruche du plan, plus un **verre de vin** pour les artisans.
- **(e)** C'est le lot où l'absence coûte le plus. Prévoir une **table qui ne s'effondre pas** (Banished s'effondre en silence) : la faim ralentit, mais ne tue jamais, et une icône de la Lettre l'annonce **avant**.

### P11. Les icônes d'état d'atelier et le calque des flux (lots 6 et 7)
- **(a)** Chaque atelier montre **un seul** état à la fois : « attend un intrant », « sortie pleine », « manque de bras », « outils brisés ». La vue des flux (§ 2.4 du plan) devient un **calque** qu'on active : flux de bois, de fer ou de laine.
- **(b)** Factorio (icônes de machine) ; Oxygen Not Included (calques) ; The Settlers (le goulot a une adresse).
- **(c)** Le joueur trouve son goulot **sans chercher**. Il le corrige au bon endroit, et le suivant apparaît : c'est le plaisir de Factorio, sur mobile.
- **(d)** Les quatre icônes en relief sur la tuile, comme la caisse qui déborde du plan. Le calque **assombrit** le domaine et ne laisse briller que les charrettes de la marchandise choisie, avec le goulot en rouge brique.
- **(e)** Ne **jamais** montrer de ratio chiffré. Le goulot est une couleur, pas un nombre.

### P12. La zone d'effet en cercles, pour les nuisances et les voisins (lot 7)
- **(a)** La tannerie, le four et le moulin ont une **zone** autour d'eux (et vers l'aval, pour la rivière). Le placement montre à l'avance ce qu'on gagne et ce qu'on perd.
- **(b)** Frostpunk (anneaux de chaleur) ; Islanders (points chiffrés en direct au-dessus des voisins).
- **(c)** « En amont ou en aval ? » Le plan du domaine devient l'énigme qu'annonce le plan.
- **(d)** En plaçant, des **anneaux** pâles et, au-dessus de chaque voisin, un petit **+** vert ou **−** rouge (le style Islanders). La rivière se teinte en direct.
- **(e)** Les cases rares et le chantier de déplacement rendent l'erreur coûteuse : il faut l'aperçu, sinon c'est punitif.

### P13. L'approvisionnement de l'équipe d'extraction comme un pari (lot 4)
- **(a)** Avant de partir, l'équipe se charge de vivres et d'outils. Le gisement a un **trait** visible (filon dur, terrain humide, loin de l'eau) qui use plus certaines choses. Ce qui revient non consommé est rendu au magasin.
- **(b)** Darkest Dungeon (torches, vivres, pelles achetés avant l'expédition) ; les expéditions d'Anno 1800 (des objets aux attributs contre des épreuves).
- **(c)** « Carrière humide : plus de bois d'étai, moins de pain ? » Une préparation **adaptée au lieu**, pas un « maximum de tout ».
- **(d)** La **charrette de l'équipe** au départ : on y glisse des miches, des tonneaux, des pioches. Au camp, le garde-manger se vide (déjà prévu). Le trait du gisement est une **icône sur sa colline** (gouttes, roche, soleil).
- **(e)** Deux ou trois traits au plus. Une préparation par défaut (« comme la dernière fois ») pour la session de deux minutes.

### P14. La table des contres : courte, fixe, et des adversaires qui combinent deux traits (lot 8)
- **(a)** La table du § 4.3 du plan (cinq dégâts, cinq protections) est le bon format. La profondeur vient d'une garnison qui **mêle deux traits** : des pavesiers devant des arbalétriers, des hommes d'armes à cheval.
- **(b)** Kingdom Rush (armure et résistance magique) ; Bloons (camouflé et plombé) ; FTL (ion puis laser).
- **(c)** « Ma poudre ouvre le pavois, mes arbalètes finissent les arbalétriers derrière. » Un build pense **en deux temps** : ouvrir, puis exploiter.
- **(d)** L'écu de protection au-dessus de la figurine, et un **deuxième écu** plus petit pour le second trait. Sur l'arme, l'icône de dégâts ; quand elle convient, l'écu adverse **se fend** dans l'aperçu.
- **(e)** Ne pas dépasser cinq types de dégâts et cinq protections. Les traits combinés n'apparaissent qu'à partir du palier 3.

### P15. Les intentions de Rome, annoncées sur le diorama (lot 8)
- **(a)** Chaque garnison montre **ce qu'elle va faire** dans les dix prochaines secondes : tirer sur tel véhicule, charger vers le transport, lever le pavois. L'incendiaire montre la ville qu'il vise.
- **(b)** Slay the Spire (intentions) ; Into the Breach (attaques télégraphiées, « chaque mort est la faute du joueur »).
- **(c)** Pendant la bataille, on **réagit à ce qu'on voit** : retirer le transport, lancer la fumée, envoyer le cavalier sur l'incendiaire. Le temps réel garde du sens.
- **(d)** Une **flèche fantôme** de la garnison vers sa cible (dans le style du chemin « à la manière des Sims », déjà fait), et une icône d'intention au-dessus d'elle.
- **(e)** C'est le complément naturel du chemin visible des véhicules (fait). Sans cela, la bataille de dix minutes reste une course de PV.

### P16. Les rangs d'équipage et le « déplacement subi » (lot 9)
- **(a)** L'équipage marche en **formation** : avant et arrière. Le piquier devant protège l'artilleur derrière ; le chevau-léger de Rome cherche à **contourner** pour frapper l'arrière.
- **(b)** Darkest Dungeon (rangs, compétences par rang) ; Into the Breach (le placement est l'attaque).
- **(c)** « Mon artilleur est sans défense au contact : je mets le piquier devant, et je garde les deux ensemble. » La synergie du plan (« un piquier à côté de l'artilleur le couvre ») devient **une règle de position** visible.
- **(d)** Un lien de formation, une **corde** dessinée entre deux figurines proches, qui brille quand le bonus joue et se rompt quand elles s'écartent.
- **(e)** Ne pas imposer la micro-gestion : la formation suit le véhicule meneur, sans ordres supplémentaires.

### P17. La charge comme une jauge d'énergie à répartir (lot 9)
- **(a)** La charge du § 4.4 du plan se lit comme le **réacteur** de FTL : un nombre fixe de crans, que l'arme, la défense et l'accessoire se partagent.
- **(b)** FTL (barres d'énergie) ; Hades' Star (places de module limitées).
- **(c)** « Les plates prennent trois crans : il m'en reste un pour l'étendard, ou rien pour le chirurgien. » Chaque pièce **exclut** une autre.
- **(d)** La **selle qui ploie** du plan, avec des **crans** visibles, et des pièces qui s'emboîtent comme des tuiles. Une pièce qui ne rentre pas reste grisée.
- **(e)** Ne pas avoir **à la fois** des places typées **et** une charge libre : choisir l'un des deux comme contrainte principale. La recommandation : des places typées pour la forme, la charge seulement pour la vitesse.

### P18. Les contrats de ville comme les paquets du Centre communautaire (lot 10)
- **(a)** Le grand chantier (l'Arena) se remplit par **cases dessinées** : une case par lot à livrer, certaines exigent du « fin ». Chaque case remplie montre un morceau du chantier.
- **(b)** Stardew Valley (paquets du Centre communautaire) ; Anno 1800 (les grands ouvrages par étapes) *(connaissance des jeux)*.
- **(c)** « Ce marbre blanc, je le garde pour la case exquise de l'Arena. » Le contrat donne un sens à la qualité et au stockage.
- **(d)** Le **chantier 3D** du plan, avec son échafaudage qui monte, plus un **tableau** posé à côté, avec ses cases à remplir, comme le tableau des paquets de Stardew.
- **(e)** Un contrat ne doit pas demander de présence pendant des jours (règle d'or 7) : trois jours, sans pénalité si on n'y participe pas.

## 9. Le plan actuel à la lumière de ces jeux

### 9.1 Ce qui est bon

- **La place du magasin comme vraie monnaie** (§ 2.1). C'est la contrainte de Mini Metro et de Darkest Dungeon (le sac limité). Elle force le choix « je garde ou je jette », et elle est très visuelle (caisses, arc, plouf dans la lagune).
- **« Il y a toujours plus de commandes que de quoi les servir »** (§ 3.1). C'est le principe d'Against the Storm et de Mini Metro. C'est la décision la plus importante du plan.
- **Le retrait de la ville rassasiée et des péages.** Le plan a raison : une pénalité qui n'a qu'une réponse (tourner) ne fait pas réfléchir.
- **La table des contres fixe et visible** (§ 4.3) et l'aperçu vert, ambre, rouge. C'est Kingdom Rush et Bloons, au bon niveau de simplicité.
- **Le cerclage de qualité** (§ 2.5). C'est le marqueur de Dwarf Fortress et les étoiles de Stardew : un signe sur l'objet, partout.
- **L'absorption** (§ 2.8) : magasin pour la file de nuit, bras pour le personnel, outils pour les modules. C'est la discipline qui manque à beaucoup de jeux de gestion.
- **L'entrée par paliers** (§ 2.8) : une contrainte à la fois, comme Anno qui ouvre les besoins niveau par niveau.

### 9.2 Ce qui est faible, ou manque

1. **Le plan ajoute surtout des contraintes, peu de leviers.** Magasin plafonné, extraction, vivres, outils, nuisances, périssables : sept freins. Les leviers de choix (recettes alternatives, substitution) sont au § 2.4 et 2.5, mais ils sont brefs. Les jeux étudiés équilibrent chaque frein par **un choix qui le contourne** (Against the Storm : la tempête, mais les pierres angulaires ; Captain of Industry : le laitier, mais la ferraille). Proposition : chaque lot de contrainte livre **avec lui** son levier (P6, P7, P8, P9).
2. **La valeur d'une tournée n'est pas définie.** Le plan dit « la soute se remplit au retour », mais pas pourquoi une tournée **vaudrait** plus qu'une autre au-delà du remplissage. OpenTTD et Hades' Star le règlent par **distance et délai**. Sans P1, la frise de la tournée montrera des caisses, mais pas de raison de les ordonner.
3. **Le risque de cascade silencieuse.** Bras, table, outils et vivres forment une boucle à la Banished. Banished est apprécié, mais sa cascade est le premier sujet de plainte. Il faut des **avertissements en avance** (dans la Lettre du matin) et des **planchers** (la faim ralentit, ne tue pas), d'autant que la règle d'or 7 veut des sessions de quelques minutes.
4. **Trop de jauges qui se vident à la fois.** Garde-manger du camp, assiette des maisons, outils qui ternissent, fraîcheur des caisses, richesse du filon, sablier des commandes : six minuteries. Cultist Simulator les garde courtes et rares. Proposition : **une seule horloge par lieu** ; le reste se lit à l'ouverture (la Lettre).
5. **La Porta manque d'intentions.** La reconnaissance (§ 4.2) montre ce qui est là avant de partir, mais pas ce que Rome **va faire** pendant la bataille. Le temps réel ne prend son sens qu'avec P15.
6. **Places typées et charge, deux contraintes sur la même chose** (§ 4.4). Hades' Star n'a que des places ; FTL n'a que l'énergie. Les deux ensemble risquent le tableur d'équipement (P17).
7. **La formation n'est qu'une synergie de texte.** « Un piquier à côté de l'artilleur le couvre » doit devenir une **règle de position visible** (P16), sinon personne ne la découvrira.
8. **Le hasard des plans n'est pas exploité.** Le plan donne à tous le même catalogue de recettes et d'outils. C'est le tirage (Against the Storm, Satisfactory) qui fait que deux joueurs se **conseillent** au lieu de copier le même guide (P7). C'est l'objectif même du porteur : « une communauté qui se pose des questions ».
9. **Le marché régional est absent du plan.** Le CADRAGE-v3 (§ 3 quater) prévoit un marché par région et des nouvelles datées. Le plan de profondeur n'y touche pas, alors que c'est le levier le plus simple contre « on produit trop » : ce qui est trop produit doit **valoir moins** (P3).

### 9.3 L'ordre suggéré, à la lumière de cette recherche

Sans changer l'ordre validé, on peut **joindre à chaque lot son levier** :

| Lot | Contrainte du plan | Levier à livrer avec |
| --- | --- | --- |
| 1 Le magasin | Places, plafond | Brader à un prix qui dépend de la saturation (P3) ; le périssable qui devient un sous-produit (P9) |
| 2 Villes et échéances | Plus de commandes que de capacité | Paie selon la distance et la fraîcheur (P1) ; le choix parmi deux et le carnet (P2) |
| 3 La tournée | Soute en places | L'ordre des arrêts (P4) ; plus tard, le relais (P5) |
| 4 L'extraction | Équipes, vivres, outils | L'approvisionnement selon le trait du gisement (P13) |
| 5 Les bras | Table, postes | La main-d'œuvre par niveau (P10), avec un plancher |
| 6 Chaînes et qualité | Intrants multiples, restes | Recettes notées en étoiles (P6) ; plans au tirage (P7) |
| 7 Domaine et outils | Nuisances, cases rares | L'aperçu en cercles (P12) ; les icônes d'état et le calque (P11) |
| 8 Porta, contres | Table fixe | Traits combinés (P14) ; intentions de Rome (P15) |
| 9 Porta, équipage | Places, charge | Formation (P16) ; une seule contrainte d'équipement (P17) |
| 10 Contrats | Grand chantier | Le tableau des cases (P18) ; les pierres angulaires (P8) à placer au moment de la Casa 7 |

## 10. Sources

**Commerce et marchés**
- Patrician IV, notes de mise à jour 1.2 (Steam) : https://store.steampowered.com/news/4515
- Patrician IV, manuel (Rune-Soft) : https://www.rune-soft.com/upload/documents/Manual_PDF_Patrician4%20.pdf
- Patrician IV, critique (Hooked Gamers) : https://www.hookedgamers.com/pc/patrician_iv/review/article-595-2.html
- Patrician IV, critique (Worthplaying) : https://www.worthplaying.com/article/2010/11/15/reviews/78213-pc-review-patrician-iv-conquest-by-trade/
- Patrician III, consommation et production (GOG) : https://www.gog.com/forum/patrician_series/consumption_vs_production
- Patrician III, problèmes de production (GOG) : https://www.gog.com/forum/patrician_series/p3_production_woes_how_do_you_handle_it/page1
- Patrician III, fils Steam : https://steamcommunity.com/app/33570/discussions/0/135507855755812062 ; https://steamcommunity.com/app/33570/discussions/0/1780513643845057494
- Port Royale 4, critique (Prima Games) : https://primagames.com/featured/port-royale-4-review
- Port Royale 4, aperçu de la bêta (Niche Gamer) : https://nichegamer.com/2020/05/26/port-royale-4-beta-hands-on-preview/
- Port Royale 4, commerce et production (Gamewatcher) : https://www.gamewatcher.com/port-royale-4-trade ; https://www.gamewatcher.com/port-royale-4-production-and-town-management
- Port Royale 4, critique (Gamewatcher) : https://www.gamewatcher.com/reviews/port-royale-4-review/13221
- Offworld Trading Company, annonce (Stardock) : https://www.stardock.com/blog/454368/auctions-espionage-sabotage-patents-stocks-and-the-black-market-stardock-reveals-mohawk-games-economic-real-time-strategy-game-offworld-trading-company
- Offworld Trading Company (PC Gamer) : https://www.pcgamer.com/offworld-trading-company-is-an-economic-rts-from-the-designer-of-civ-4/
- Offworld Trading Company (PCGamesN) : https://www.pcgamesn.com/economic-rts-offworld-trading-company-game-civs-soren-johnson-always-wanted-make
- Offworld Trading Company, critique (Gamepressure) : https://www.gamepressure.com/editorials/reviews/offworld-trading-company-review-raging-capitalism-on-the-red-plan/z5ad
- Railroad Tycoon 3 (Wikipédia) : https://en.wikipedia.org/wiki/Railroad_Tycoon_3
- Railroad Tycoon 3 (Giant Bomb) : https://www.giantbomb.com/app.php/railroad-tycoon-3/3030-20325/
- Railroad Tycoon 3, jeu (StrategyWiki) : https://strategywiki.org/wiki/Railroad_Tycoon_3/Gameplay
- Caesar III, la boucle du marché (GOG) : https://www.gog.com/forum/caesar_series/caesar_3_stuck_in_the_market_loop
- Caesar III, plan de ville (GOG) : https://www.gog.com/forum/caesar_series/caesar_3_how_are_you_designing_your_city
- Pharaoh: A New Era (Steam) : https://steamcommunity.com/app/1351080/discussions/0/3782499316875275035

**Production et chaînes**
- Anno 1800, population (wiki) : https://anno1800.fandom.com/wiki/Population?oldid=3313
- Anno 1800, conseils (PC Gamer) : https://www.pcgamer.com/anno-1800-tips-guide/
- Anno 1800, guide (Prima Games) : https://primagames.com/featured/anno-1800-guide-tips-money
- Anno 1800, fabrique d'armes et alternatives (wiki) : https://anno1800.fandom.com/wiki/Weapon_Factory ; https://anno1800.fandom.com/wiki/Cigar_Factory
- Anno 1800, objets de syndicat légendaires (wiki) : https://anno1800.fandom.com/wiki/Trade_Union_items:_legendary
- Anno 1800, meilleurs objets (TheGamer) : https://www.thegamer.com/anno-1800-best-items/
- Anno 1800, quais (wiki) : https://anno1800.fandom.com/wiki/Pier
- Anno 1800, routes commerciales (Steam) : https://steamcommunity.com/app/916440/discussions/0/3767860082232200440
- Anno 1800, devblog sur le commerce (Anno Union) : https://anno-union.com/devblog-your-own-trading-empire/
- Against the Storm, recettes (wiki Hooded Horse) : https://hoodedhorse.com/wiki/Against_the_Storm/Recipes
- Against the Storm, module des recettes (étoiles) : https://wiki.hoodedhorse.com/Against_the_Storm/Module:Recipe
- Against the Storm, commandes et réputation (wiki) : https://wiki.hoodedhorse.com/Against_the_Storm/Orders ; https://wiki.hoodedhorse.com/Against_the_Storm/Reputation
- Against the Storm, Impatience de la Reine (wiki) : https://hoodedhorse.com/wiki/Against_the_Storm/Queen%27s_Impatience
- Against the Storm, entretien de conception (Game Developer) : https://www.gamedeveloper.com/business/how-against-the-storm-managed-to-mix-city-building-and-roguelite-play
- Against the Storm, revue de design (Radiator Blog) : https://www.blog.radiator.debacle.us/2023/06/design-review-of-against-storm-by.html
- Against the Storm, pierres angulaires (Steam) : https://steamcommunity.com/app/1336490/discussions/0/571539955565949798/
- Against the Storm, guide de stratégie (Benedict Jacka) : https://benedictjacka.co.uk/other-writing/against-the-storm-strategy-guide/
- Against the Storm, choix des pierres, commandes et plans (Casual Game Guides) : https://casualgameguides.com/walkthroughs/against-the-storm/cornerstones-orders-blueprints-priority
- Factorio, Friday Facts n° 276 (forum) : https://forums.factorio.com/viewtopic.php?p=392530
- Satisfactory, recettes alternatives (Prima Games) : https://primagames.com/featured/complete-satisfactory-alternate-recipes-guide-all-recipes-ranked-best-to-worst-and-how-to-unlock
- Satisfactory, liste de rang (Dexerto) : https://dexerto.com/gaming/satisfactory-hard-drive-tier-list-best-alternate-recipes-ranked-2896482
- Satisfactory, disques durs (wiki) : https://satisfactory.wiki.gg/wiki/Hard_Drive_Research
- Captain of Industry, laitier et déchets (wiki) : https://wiki.coigame.com/Slag ; https://wiki.coigame.com/Waste
- Captain of Industry, soufre (Steam) : https://steamcommunity.com/app/1594320/discussions/0/3437955554621977155
- Banished, outils et cascade (Steam) : https://steamcommunity.com/app/242920/discussions/0/540734255170179514
- Banished, production (Gamepressure) : https://www.gamepressure.com/banished/production-and-processing-of-resources/z66097
- Frostpunk, entretien sur le livre des lois (PC Gamer) : https://www.pcgamer.com/frostpunk-developers-on-hope-misery-and-the-ultimately-terrifying-book-of-laws
- Frostpunk, critique (GameSpot) : https://gamespot.com/reviews/frostpunk-review-damned-if-you-do-damned-if-you-do/1900-6416899/
- Workers & Resources, trajets et arrêts (Steam) : https://steamcommunity.com/app/784150/discussions/0/5057002258666909766
- Workers & Resources, conseils (Gamepressure) : https://www.gamepressure.com/workers-resources-soviet-republic/tips-and-tricks/zb10a3f
- Workers & Resources, guide du trafic (gameplay.tips) : https://gameplay.tips/guides/workers-resources-soviet-republic-the-ultimate-complex-traffic-guide.html
- Oxygen Not Included, analyse (Gideon's Gaming) : https://gideonsgaming.com/the-genius-design-of-oxygen-not-included-a-review/
- Oxygen Not Included, mécaniques (wiki) : https://oxygennotincluded.wiki.gg/wiki/Category:Game_Mechanics
- Dwarf Fortress, conception des dépôts (wiki) : https://dwarffortresswiki.org/index.php/Stockpile_design
- Dwarf Fortress, bacs et tonneaux (wiki) : https://dwarffortresswiki.org/index.php/Using_bins_and_barrels

**Logistique et transport**
- OpenTTD, revenus des marchandises (wiki) : https://wiki.openttd.org/en/Manual/Game%20Mechanics/Cargo%20income
- OpenTTD, mécaniques (wiki) : https://wiki.openttd.org/en/Manual/Game%20Mechanics/
- OpenTTD, FAQ : https://wiki.openttd.org/en/Manual/FAQ%20gameplay
- OpenTTD, marchandises (spécifications NewGRF) : https://newgrf-specs.tt-wiki.net/wiki/NML:Cargos
- The Settlers (oldgames.sk) : https://oldgames.sk/en/game/settlers-the
- The Settlers II, routes (settlers2.net) : https://settlers2.net/guides/roads/
- The Settlers: New Allies (Ubisoft) : https://news.ubisoft.com/en-gb/article/54IHIBPSLbTyrtzQchvDQj/the-settlers-new-allies-out-now-on-pc
- Mini Metro, postmortem (Game Developer) : https://www.gamedeveloper.com/audio/postmortem-dinosaur-polo-club-s-i-mini-metro-i-
- Mini Metro, critique (Pocket Gamer) : https://www.pocketgamer.com/articles/071794/mini-metro-review-a-smart-and-satisfying-transportation-puzzler/
- Mini Metro, critique (Android Central) : https://www.androidcentral.com/mini-metro-retro-review
- Mini Metro, analyse (csanyk.com) : https://csanyk.com/tag/mini-metro
- Hades' Star, modules de commerce (wiki) : https://hades-star.fandom.com/wiki/Trade_Modules?oldid=6391
- Hades' Star, wiki : https://hades-star.fandom.com/wiki/Hades'_Star_Wiki
- Hades' Star, modules (NamuWiki) : https://en.namu.wiki/w/Hades'%20Star/%EB%AA%A8%EB%93%88
- Hades' Star, fils Steam : https://steamcommunity.com/app/755800/discussions/0/1870622978440442784 ; https://steamcommunity.com/app/755800/discussions/0/1639793203772933375 ; https://steamcommunity.com/app/755800/discussions/0/2944710017702805410/
- Hades' Star, guide (Prima Games) : https://primagames.com/eguides/mobile-gaming-eguide-tips-tricks-and-strategies-for-todays-hottest-mobile-games/hades-star/profit-driven-galactic-exploration
- Hades' Star, artefacts (TouchTapPlay) : https://www.touchtapplay.com/hades-star-artifacts-guide-everything-you-need-to-know/

**Composition et contres**
- Darkest Dungeon, compositions (TheGamer) : https://www.thegamer.com/darkest-dungeon-best-party-builds-guide/
- Darkest Dungeon, classes (GameSkinny) : https://www.gameskinny.com/tips/darkest-dungeon-hero-class-guide/
- Darkest Dungeon, arrière-ligne (Steam) : https://steamcommunity.com/app/262060/discussions/0/135511455866146135
- Into the Breach, postmortem GDC 2019 (GDC) : https://www.gdconf.com/news/get-inside-look-making-breach-gdc-2019
- Into the Breach, conception (Game Developer) : https://gamedeveloper.com/design/video-how-subset-games-designed-i-into-the-breach-i-
- Into the Breach (Wikipédia) : https://en.wikipedia.org/wiki/Into_the_Breach
- Into the Breach, UX (Prototypr) : https://blog.prototypr.io/into-the-breachs-ux-makes-you-feel-smart-a9cb03210757
- Slay the Spire, conférence GDC 2019 (GDC Vault) : https://www.gdcvault.com/browse/gdc-19/play/1025731
- Slay the Spire, équilibrage par les données (Game Developer) : https://www.gamedeveloper.com/design/learn-i-slay-the-spire-i-s-metrics-driven-approach-to-game-balancing-at-gdc-2019
- Slay the Spire (Wikipédia) : https://en.wikipedia.org/wiki/Slay_the_Spire
- FTL, ce que les auteurs changeraient (Shacknews) : https://www.shacknews.com/article/78422/ftl-devs-there-are-some-things-we-should-have-done
- FTL, combos d'armes (Steam) : https://steamcommunity.com/app/212680/discussions/0/611696927911923060
- Kingdom Rush, types d'armure (Ironhide) : https://support.ironhidegames.com/support/solutions/articles/4000223666-armor-types-breakdown-kingdom-rush-battles-guide
- Kingdom Rush, mage des arcanes (wiki) : https://kingdomrushtd.fandom.com/wiki/Arcane_Wizard
- Bloons TD 6, immunités (Bloons Wiki) : https://www.bloonswiki.com/Bloon_immunity ; https://www.bloonswiki.com/Damage_types ; https://www.bloonswiki.com/Camo_Bloon_(BTD6)

**Boucle courte, placement, cartes**
- Stardew Valley, cultures et saisons (wiki) : https://stardewvalleywiki.com/Crops ; https://wiki.stardewvalley.net/Seasons
- Stardew Valley, boucle quotidienne (Game Tyrant) : https://gametyrant.com/news/from-crops-to-connections-how-stardew-valley-redefines-life-simulation-gaming
- Islanders (islaguru.com) : https://islaguru.com/articles/islanders-game
- Cultist Simulator, conception (Game Developer) : https://gamedeveloper.com/design/why-the-i-cultist-simulator-i-devs-built-their-lovecraftian-game-on-a-house-of-cards
- Cultist Simulator, Alexis Kennedy (Medium) : https://medium.com/@alexiskennedy/alexis-kennedy-on-the-cultist-simulator-the-way-through-the-wood-part-1-c53ca6a39e0
- Cultist Simulator (Wikipédia) : https://en.wikipedia.org/wiki/Cultist_Simulator
