# Recherche : ce qui rendrait Fondaco original (4 novembre 2026)

*Demande du porteur : « Je trouve le jeu légèrement fade dans son gameplay ; il ressemble à beaucoup de jeux existants. Rien ne ferait dire à quelqu'un : tiens, ce jeu est original, je vais y jouer et y passer du temps. » Ce document cherche ce qui pourrait donner ce sentiment.*

*C'est une recherche et une liste de propositions. **Rien n'est décidé.** Chaque piste retenue suivra le chemin habituel : un plan validé, les tests du moteur d'abord, le simulateur de 24 mois. Ce qui n'est pas retenu va dans `IDEAS.md`.*

---

## 0. Méthode

- **Lu dans le dépôt** : `docs/CADRAGE-v3.md` (règles d'or, § 3 à § 13 et les décisions du 31 octobre au 2 novembre), `docs/audit-profondeur-2026-11-01.md`, `IDEAS.md`, l'historique récent des commits.
- **Cherché au dehors** : ce qui distingue un jeu à la première impression (crochet et ancre) ; les jeux qui ont rendu original un geste banal (*Papers, Please*, *Sunless Sea*, *Foxhole*, *Death Stranding*, *Wordle*, *Offworld Trading Company*, *Eco*) ; ce qu'on reproche à Hades' Star ; l'histoire du commerce vénitien (colleganza, correspondance des marchands).
- **Limites** : les recherches sur le web ont surtout rendu de la presse et des blogs, rarement des analyses de concepteurs. Les sources sont au § 7 ; les affirmations qui n'en viennent pas relèvent du jugement de conception.

---

## 1. Le diagnostic en une page

**Fondaco a une ancre, pas de crochet.**

Les conseils de commercialisation des jeux indépendants distinguent deux choses ([howtomarketagame, « know your game's anchor »](https://howtomarketagame.com/2019/12/23/know-your-games-anchor/)) :
- **le crochet**, ce qui rend le jeu unique, fait venir le joueur sur la page ;
- **l'ancre**, ce qui le rend familier, le rassure et le fait acheter.

Il faut les deux, et le crochet doit se comprendre en quelques secondes : le joueur décide à peu près dans les 15 à 30 premières secondes d'une bande-annonce ([wayline](https://www.wayline.io/blog/fixing-no-wishlists-indie-game-marketing)).

**L'ancre de Fondaco est forte** : un bâtisseur de gestion, des chantiers en temps, un empire qui grandit, des véhicules qui livrent. Le joueur de jeux mobiles comprend tout de suite.

**Le crochet a disparu**, et on voit quand :
1. **Chaque système est la traduction d'un système de Hades' Star.** Les règles d'or du 1er novembre citent Hades' Star à chaque ligne. Les commandes des villes sont les cargaisons ; la Porta, les étoiles rouges ; la Contesa, les étoiles blanches ; les modules, la Remise et les perle viennent de là aussi. Venise y est un habillage. Or le seul avis de joueur trouvé sur la suite, *Hades' Star: DARK NEBULA*, dit que l'original « s'est enfermé dans une impasse, devenu trop répétitif et prévisible » ([worldsapps](https://worldsapps.com/de/reviews-hades-star-dark-nebula)). En copiant la formule, on copie aussi sa fatigue.
2. **Ce qui était vénitien a été retiré le 1er novembre** (« un seul métier, livrer », CADRAGE-v3 § 3.3). Sont partis : la mer, la Muda, la colleganza, les corsaires, l'assurance, les gisements. Restent aussi en sommeil les nouvelles datées et les marchés régionaux. **C'étaient précisément les mécaniques qu'aucun autre jeu n'a.** Le retrait était juste pour la lisibilité ; il a coûté l'identité.
3. **Le verbe central, « livrer saut par saut », est un verbe connu** (Hades' Star, Mini Metro, les jeux de livraison). Rien, dans la manière de livrer, n'est vénitien.

**La phrase test.** Un jeu original se dit en une phrase : « C'est le jeu où… ». Pour Fondaco, aujourd'hui, la phrase est « c'est Hades' Star à Venise ». Le but de ce document est de trouver une fin de phrase qu'on ne peut dire d'aucun autre jeu.

---

## 2. Ce que font les jeux qu'on retient

| Jeu | Le geste banal | Ce qui le rend original | Leçon pour Fondaco |
| --- | --- | --- | --- |
| *Papers, Please* | Vérifier des papiers | Le geste porte le récit : chaque règle nouvelle raconte le régime, chaque erreur coûte à la famille ; le joueur a très peu d'information sur le monde ([Game Developer](https://www.gamedeveloper.com/design/designing-the-bleak-genius-of-i-papers-please-i-)) | Le geste de livrer doit **dire quelque chose** de Venise, pas seulement rapporter des ducats |
| *Sunless Sea* | Faire du commerce en mer | Le commerce est un prétexte : ce qui paie le plus, ce sont les histoires et l'exploration ; le risque (la terreur, le combustible) rend chaque voyage mémorable ([USgamer](https://www.usgamer.net/articles/you-might-need-a-bigger-boat), [Destructoid](https://destructoid.com/?p=183911)) | Un voyage lointain doit **rapporter une histoire**, pas seulement une prime de distance |
| *Foxhole* | Porter des caisses | Des joueurs passent des soirées entières à transporter, parce que **des centaines d'autres attendent ce qu'ils portent** et le voient arriver ([StartMenu](https://www.startmenu.co.uk/home/review-foxhole-im-doing-my-part)) | Livrer doit **servir quelqu'un de visible** : une autre Maison, la ville, la République |
| *Death Stranding* | Marcher en portant des colis | On ne croise jamais personne, mais on sent les autres partout : leurs ponts, leurs routes, leurs chemins qui s'aplanissent à force d'être pris ([Shacknews](https://shacknews.com/article/125784/a-big-goal-of-death-stranding-directors-cut-was-improving-the-asynchronous-multiplayer), [TweakTown](https://www.tweaktown.com/news/67603/death-strandings-multiplayer-unconventional/index.html)) | Un monde multijoueur **sans PvP** peut quand même montrer les autres : c'est la piste sociale qui respecte les règles d'or 1 et 2 |
| *Wordle* | Deviner un mot | Le même mot pour tous, une fois par jour, et un résultat partageable qui ne dévoile rien ([Smithsonian](https://www.smithsonianmag.com/smart-news/heres-why-the-word-game-wordle-went-viral-180979439/)) | Une **affaire du jour commune**, avec son résultat à partager, tient en 5 minutes et fait parler hors du jeu |
| *Offworld Trading Company* | Acheter, vendre | Le marché remplace l'armée : on gagne par les prix, et le marché réagit en direct à ce que font les joueurs ([PC Gamer](https://www.pcgamer.com/offworld-trading-company-preview-a-cutthroat-rts-with-no-combat), [GDC](https://gdcvault.com/play/1024492/contactUs)) | Le marché peut être un terrain de jeu, pas seulement un tableau de prix |
| *Eco* | Construire, récolter | Les joueurs votent des lois que le serveur applique ; les données du monde servent de preuve dans les débats ([Wikipedia](https://wikipedia.com/wiki/Eco_(2018_video_game)), [Game Developer](https://www.gamedeveloper.com/design/building-a-global-survival-game)) | Le Doge, le Sénat et la Signoria peuvent **changer vraiment la carte**, pas seulement un pourcentage |

**Ce qu'ils ont en commun** : aucun n'a inventé un nouveau geste. Chacun a pris un geste ordinaire et lui a donné **une conséquence qu'on ne trouve nulle part ailleurs**. C'est ce qui manque à « livrer » dans Fondaco.

---

## 3. L'atout que Fondaco n'exploite pas : l'histoire vraie

Venise en 1450 n'est pas un décor neutre. Trois réalités historiques sont de vraies mécaniques de jeu, et aucun jeu grand public ne les a :

1. **L'information voyageait à la vitesse des mules et des galères.** La correspondance des marchands suivait les cargaisons, les prix et les arrivées, et c'est elle qui décidait des achats et des reventes ([ancient-history-sites](https://www.ancient-history-sites.com/?p=148979)). Le marchand qui savait le premier gagnait.
2. **La colleganza faisait d'un inconnu un associé.** Un investisseur sédentaire finançait un voyageur ; au retour, il reprenait sa mise et les trois quarts du bénéfice. Une étude de 2025 montre que les mêmes familles passaient d'un rôle à l'autre, et que la colleganza menait au Grand Conseil ([iris.unive.it](https://iris.unive.it/handle/10278/5093547), [digibug](https://digibug.ugr.es/handle/10481/108398)). La mobilité sociale passait par la confiance entre marchands.
3. **L'histoire avait un calendrier connu.** La chute de Constantinople (29 mai 1453), la paix de Lodi (1454), les Mude qui partaient à date fixe. CADRAGE-v3 § 4.3 prévoit déjà des ères ; elles n'ont pas encore de conséquence jouable.

Ces trois réalités répondent chacune à une règle d'or sans la plier : l'information ne se vole pas (règle 1), la colleganza ne prend que ce qu'on a choisi d'engager (règle 2), le calendrier arrive pour tous en même temps (règle 6).

---

## 4. Sept pistes de crochet

Chaque piste est jugée sur quatre critères :
- **la phrase** : finit-elle « c'est le jeu où… » de manière unique ?
- **l'image** (règle 8) : se voit-elle sur la carte en 5 secondes ?
- **les règles d'or** : les respecte-t-elle sans exception ?
- **l'absorption** (« chaque système absorbe les anciens ») : transforme-t-elle ce qui existe, ou s'ajoute-t-elle ?

### P1. Les nouvelles voyagent : on ne voit le monde que par ce que les véhicules rapportent

**La phrase** : « C'est le jeu où tu ne vois le monde qu'à travers les lettres que tes mules te rapportent. »

**Comment** :
- Les commandes d'une ville lointaine, ses prix, ses crises n'apparaissent sur la carte que **quand un véhicule en revient**. Chaque information porte son âge et pâlit avec lui ; une ville qu'on n'a pas visitée depuis deux jours est grise, ses bulles sont des fantômes.
- **La lettre est un objet** : elle arrive sur la carte avec le véhicule, on la touche, elle se déplie en une ou deux lignes (« À Vérone, le sel manque ; la commande double jusqu'à jeudi »). C'est la Lettre du jour (§ 11), devenue une conséquence du voyage.
- **Les rumeurs** arrivent aussi, plus ou moins sûres : une crise annoncée qui n'aura pas lieu. Le joueur apprend à juger ses sources.
- Le facteur, le Portolano et les fondaci réduisent ce retard : la progression achète **de la vue**, pas seulement du rendement.

**Pourquoi c'est un crochet** : le geste de livrer reste le même, mais il prend un second sens : **chaque tournée est aussi une reconnaissance**. Le joueur n'optimise plus seulement une route, il choisit ce qu'il veut apprendre. C'est le cœur de *Papers, Please* (peu d'information, des choix sous incertitude), appliqué au commerce.

**L'image** : une carte vivante où le connu est net et le lointain pâlit ; des lettres scellées qui arrivent avec les mules. Rien de tel dans Hades' Star.

**Règles d'or** : toutes respectées. L'absence ne coûte rien (l'information vieillit, rien ne se perd).

**Absorption** : forte. Elle reprend les nouvelles datées (étape 4, déjà dans le moteur), la Lettre du jour, les crises du § 3 quater et le Portolano, et les rend visibles par le seul geste de livrer.

### P2. Les routes des autres : un monde que tous les marchands dessinent

**La phrase** : « C'est le jeu où les chemins que prennent tous les marchands deviennent des routes. »

**Comment** (à la *Death Stranding*) :
- Chaque passage d'un véhicule, de n'importe quelle Maison, use un peu le chemin entre deux villes. Un chemin très pris devient **une route**, puis **une route pavée** : plus rapide pour tous.
- Les Maisons peuvent financer ensemble **un pont, un relais, une écluse sur la Brenta** (le « burchiello », déjà dans `IDEAS.md`) ; le nom des donateurs y reste, comme la plaque des Grandes Œuvres.
- Une route délaissée retourne doucement au chemin. Ce qui est bâti par une Maison ne se perd jamais (règle 1) ; seule l'usure commune bouge.
- Un geste léger de reconnaissance : remercier la Maison dont on vient d'emprunter le pont.

**Pourquoi c'est un crochet** : le jeu est **solo dans ses règles et collectif dans son paysage**. On ne croise jamais un autre joueur, mais la carte montre partout qu'ils existent. C'est exactement ce que les règles d'or 1 et 2 permettent et que le PvP interdit.

**L'image** : les traits des routes qui épaississent sur la carte au fil des semaines, les ponts avec leurs bannières.

**Absorption** : moyenne. Elle donne enfin un sens visible aux autres Maisons sur la carte du commerce. Elle demande une donnée partagée par monde (l'usure des arêtes), à calibrer au simulateur.

### P3. La colleganza revient, comme verbe social central

**La phrase** : « C'est le jeu où tu peux financer le voyage d'un inconnu et partager son bénéfice. »

**Comment** : un joueur publie une tournée lointaine (une grande commande, une ville loin de son fondaco) ; d'autres misent ; au retour, le partage est automatique au grand livre (trois quarts à l'investisseur, un quart au voyageur, comme en 1450). La réputation du voyageur est publique.

**Pourquoi c'est un crochet** : peu de jeux laissent **investir dans la partie d'un autre**. Le vétéran y place son argent dormant ; le nouveau y trouve un capital. C'était déjà le § 3 quater ; il a été retiré avec la mer.

**L'image** : le véhicule du voyageur porte les fanions de ses associés ; on le suit sur la carte.

**Règles d'or** : à vérifier de près. La mise est engagée par choix, comme la Porta noire ; jamais rien n'est pris sans consentement. Une perte partagée doit rester rare et lisible.

**Absorption** : forte, le moteur existe (7a), il faut le rattacher aux tournées de terre.

### P4. L'histoire en direct : le monde vit 1450 → 1454 au calendrier

**La phrase** : « C'est le jeu où, le jour dit, Constantinople tombe pour tout le monde, et ce que vous avez livré avant change la suite. »

**Comment** :
- Les ères du § 4.3 deviennent **des événements datés, annoncés des semaines à l'avance**, qui touchent toute la carte en même temps.
- Avant l'événement, une grande demande commune (le blé et les armes pour Constantinople, par exemple). **Le total livré par le serveur décide d'une variante** : la ville tient quelques jours de plus, une route reste ouverte, les réfugiés grecs apportent un savoir à Venise.
- Après, la carte change pour tous : une route se ferme, une autre s'ouvre, des prix se renversent. Rien de bâti ne se perd (règle 1).

**Pourquoi c'est un crochet** : un **rendez-vous commun et daté**, qui se raconte hors du jeu (« le serveur a tenu Constantinople trois jours de plus »). C'est la force de *Wordle* (le même pour tous) appliquée à un monde persistant, et une matière à communication que peu de jeux ont : la vraie histoire.

**L'image** : la carte qui change, l'annonce aux Annales, le décompte des jours.

**Absorption** : forte. Elle donne enfin un contenu jouable aux ères, aux Grandes Œuvres et aux Annales, déjà prévues.

### P5. L'affaire du jour : le même problème pour tous, un résultat à partager

**La phrase** : « Chaque jour, tous les marchands reçoivent la même affaire ; on compare qui l'a faite le mieux. »

**Comment** : une petite tournée imposée (mêmes villes, même stock de départ, même graine), jouable en deux minutes dans un cadre à part, notée ; un résultat sous forme d'une petite image (la route en pictogrammes) qu'on peut partager sans tout dévoiler. Classement par bande, sans récompense de puissance.

**Pourquoi c'est un crochet** : il fait parler du jeu en dehors du jeu et donne au joueur acharné une échelle de compétence pure (cf. la proposition A2 de l'audit du 1er novembre).

**Risque** : c'est un mode de plus. À n'envisager que si P1 ou P4 est retenue comme crochet principal.

### P6. La politique qui change vraiment le monde

**La phrase** : « Le Doge est un joueur, et son décret ferme une route pour un mois. »

**Comment** : le Doge, le Sénat et la Signoria (§ 9) votent des décisions **qui se voient sur la carte** : un embargo sur une région, une Muda vers un port, une foire qui fait monter les commandes d'une ville. Comme dans *Eco*, le serveur applique la loi.

**Pourquoi c'est un crochet** : la politique vénitienne est célèbre ; aucun jeu de gestion mobile ne la joue. **Risque** : elle demande beaucoup de joueurs actifs (cf. les seuils de déclenchement d'`IDEAS.md`) et peut créer de la rancœur. À garder pour plus tard.

### P7. La Muda : un convoi commun, à date fixe, qu'on voit partir

**La phrase** : « Deux fois par semaine, la flotte de toute Venise part ensemble, et votre cargaison est dedans. »

**Comment** : la mer revient sous une seule forme, la Muda d'État : les joueurs chargent leurs lots au quai pendant la journée ; à 18 h, toutes les galères partent ensemble sur la carte de tous ; elles reviennent des jours plus tard avec des épices, des nouvelles (P1) et des histoires (une tempête, un port fermé).

**Pourquoi c'est un crochet** : un rendez-vous visuel commun, très vénitien, qui donne au monde un pouls. Elle rendrait aussi à Fondaco la mer, qui est son image la plus évidente.

**Absorption** : elle rouvre une partie de ce qui a été retiré le 1er novembre ; elle doit rester **une seule mécanique**, sans navires, modules ni Arsenal à soi, pour ne pas refaire la complexité retirée.

---

## 5. La recommandation

**Un seul crochet, porté partout ; deux au plus.** Un jeu qui a sept idées n'en a aucune.

**Crochet principal recommandé : P1, les nouvelles voyagent.**
- C'est la seule piste qui **change le sens du geste existant** au lieu d'ajouter un mode : les tournées saut par saut restent, elles deviennent aussi une reconnaissance.
- Elle est **historiquement juste**, donc défendable et racontable.
- Elle se voit en une capture d'écran : une carte nette autour de soi, pâlie au loin, des lettres qui arrivent.
- Le moteur a déjà les nouvelles datées (étape 4) ; le travail est surtout dans l'image et le réglage.

**Second, pour le monde partagé et la communication : P4, l'histoire en direct**, avec P7 (la Muda) comme son rendez-vous de la semaine. C'est ce qui donne aux joueurs **quelque chose à raconter** et au porteur quelque chose à annoncer.

**P2, les routes des autres**, est la meilleure piste sociale compatible avec les règles d'or ; elle peut venir ensuite, car elle a besoin de joueurs pour se voir.

**La phrase visée** : « Fondaco, c'est le jeu où tu ne vois le monde qu'à travers ce que tes mules rapportent, dans une Venise qui vit 1450 au jour près. »

---

## 6. Comment vérifier, avant de coder

1. **La phrase** : la faire lire à cinq joueurs de jeux de gestion qui ne connaissent pas Fondaco ; leur demander à quel jeu cela leur fait penser. Si la réponse est « Hades' Star » ou « un jeu mobile de plus », le crochet n'est pas encore là.
2. **La capture** : faire une maquette d'une seule image du crochet (la carte qui pâlit, les lettres) et la montrer 5 secondes. Le test de la bande-annonce de 15 à 30 secondes ([wayline](https://www.wayline.io/blog/fixing-no-wishlists-indie-game-marketing)) s'applique à l'écran d'accueil comme à la page de magasin.
3. **Le simulateur de 24 mois** : pour P1, mesurer si l'information retardée crée de vraies décisions (part des tournées choisies pour apprendre plutôt que pour payer) sans pénaliser le joueur occasionnel (règle 7). Pour P4, mesurer la part de la progression qu'un événement daté déplace.
4. **Le prototype en papier** : une tournée de P1 se joue avec quelques cartes et un plateau ; c'est le moyen le plus rapide de savoir si « apprendre » est amusant avant de toucher au moteur.

---

## 7. Sources

**Crochet et ancre, première impression**
- [howtomarketagame : know your game's anchor](https://howtomarketagame.com/2019/12/23/know-your-games-anchor/)
- [Wayline : fixing the « no wishlists »](https://www.wayline.io/blog/fixing-no-wishlists-indie-game-marketing)
- [Bugnet : what makes players wishlist a game](https://bugnet.io/blog/what-makes-players-wishlist-a-game)

**Hades' Star**
- [Avis de joueurs sur Hades' Star: DARK NEBULA (worldsapps)](https://worldsapps.com/de/reviews-hades-star-dark-nebula)
- [Metacritic : Hades' Star](https://www.metacritic.com/game/hades-star/)

**Jeux de référence**
- [Game Developer : designing the bleak genius of Papers, Please](https://www.gamedeveloper.com/design/designing-the-bleak-genius-of-i-papers-please-i-)
- [GDC Vault : narrative review de Papers, Please](https://media.gdcvault.com/gdc2015/GameNarrativeReview/Skaggs_PapersPlease.pdf)
- [USgamer : Sunless Sea](https://www.usgamer.net/articles/you-might-need-a-bigger-boat)
- [Destructoid : Sunless Sea](https://destructoid.com/?p=183911)
- [StartMenu : Foxhole, I'm doing my part](https://www.startmenu.co.uk/home/review-foxhole-im-doing-my-part)
- [Foxhole wiki : logistique](https://foxhole.wiki.gg/wiki/Logistics)
- [Shacknews : le multijoueur asynchrone de Death Stranding](https://shacknews.com/article/125784/a-big-goal-of-death-stranding-directors-cut-was-improving-the-asynchronous-multiplayer)
- [TweakTown : Death Stranding's multiplayer](https://www.tweaktown.com/news/67603/death-strandings-multiplayer-unconventional/index.html)
- [Smithsonian : why Wordle went viral](https://www.smithsonianmag.com/smart-news/heres-why-the-word-game-wordle-went-viral-180979439/)
- [PC Gamer : Offworld Trading Company, a cutthroat RTS with no combat](https://www.pcgamer.com/offworld-trading-company-preview-a-cutthroat-rts-with-no-combat)
- [GDC Vault : Offworld Trading Company, an RTS without guns](https://gdcvault.com/play/1024492/contactUs)
- [Eco (Wikipedia)](https://wikipedia.com/wiki/Eco_(2018_video_game))
- [Game Developer : building a global-survival game (Eco)](https://www.gamedeveloper.com/design/building-a-global-survival-game)

**Histoire vénitienne**
- [Analyse des contrats de colleganza et de la Serrata (Université de Grenade)](https://digibug.ugr.es/handle/10481/108398)
- [Réseau de la colleganza, Social Network Analysis and Mining, 2025 (Ca' Foscari)](https://iris.unive.it/handle/10278/5093547)
- [Commenda (Wikiwand)](https://wikiwand.com/EN/Commenda)
- [Venetian trade, ports and merchant networks](https://www.ancient-history-sites.com/?p=148979)
