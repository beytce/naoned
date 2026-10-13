# Fondaco (ex-Comptoirs) — Document de cadrage (v2)

10 octobre 2026 · nom de code du dépôt : `naoned`

## Décisions de la v2

Cette version tranche les points ouverts de la v1. Chaque décision est reprise dans la section concernée.

| Sujet | v1 | v2 | Pourquoi |
| --- | --- | --- | --- |
| Positionnement | « Simple », « pour les streamers » | **Niche assumée** : joueurs de gestion et de stratégie | Les jeux de marché ont des communautés petites mais fidèles et rentables |
| Ressources du MVP | 10 ressources, 4 chaînes | **7 ressources, 3 chaînes** | Carnets d'ordres deux fois plus denses avec le même nombre de joueurs |
| Marché | Mondial ou régional : non précisé | **Un carnet par ressource et par monde** | Ne pas fragmenter la liquidité |
| PNJ teneur de marché | Retiré à J+14 | **Permanent**, écart de 4 % à 20 %, profondeur plafonnée | Garde-fou de liquidité au moment où la rétention chute |
| Types d'ordres | Cours limité uniquement | Cours limité **+ ordre immédiat** avec protection de prix | Une session mobile de 3 minutes ne peut pas surveiller un carnet |
| Production | Calculée par le tick | **Calcul paresseux** à la lecture | Plus simple, ne coûte rien quand personne ne joue |
| Grand livre | Monnaie seulement | Monnaie **+ journal des mouvements de stock** | Les bugs de duplication touchent aussi les stocks |
| Valorisation de fin de saison | Prix moyen sur 24 h | **Principe de prudence** pour les stocks : min(prix de référence, prix moyen pondéré sur 7 jours) ; bâtiments au coût | Le prix sur 24 h est manipulable entre comptes complices |
| Indicateur monétaire principal | Ratio création/destruction entre 0,9 et 1,1 | **Indice des prix** + plafond de masse monétaire par joueur actif ; le ratio n'est qu'un diagnostic | Voir « Ajustements issus du simulateur » |
| Guildes | Nom, membres, chat | + **Grands chantiers** hebdomadaires | Le multijoueur doit se voir, pas seulement exister dans le carnet |
| Référentiel | Sans `world_id`, sans thème | Ressources et recettes rattachées à un **thème** | Les recettes changent d'une saison historique à l'autre |
| Jeton Sceau | V2 | **Abandonné** | Revient à vendre de la monnaie de jeu |
| Abonnement | Production automatisée, 20 ordres | **Pass Négociant : avantages légers et plafonnés, gagnables au classement** | La production automatisée achète du pouvoir économique ; un léger avantage pour qui joue, mesuré par le simulateur, reste acceptable |
| Roadmap | Interface au jalon 6 | **Simulateur au jalon 1, tranche jouable au jalon 3** | Valider l'équilibrage et le plaisir de jeu avant de durcir le moteur |
| Critère de sortie | 50 testeurs, 30 % à J+14 | 100 inscrits **venus de communautés**, 25 % à J+14 | Des amis testeurs ne mesurent pas la rétention réelle |

### Ajustements issus du simulateur (jalon 1)

Les premières simulations ont révélé des défauts de conception que des réglages de paramètres ne corrigeaient pas. Détail et chiffres dans `docs/calibration.md`.

| Constat du simulateur | Décision |
| --- | --- |
| Seul le pain faisait entrer de la monnaie : deux régions sur trois dépendaient entièrement des boulangers | Les villes achètent aussi des briques et des planches ; chaque région a son débouché |
| Matières brutes produites 2 à 3 fois plus vite que consommées : les prix s'effondraient | Chaque région reçoit une chaîne complète au départ, et le bonus régional porte la production brute exactement au besoin du transformateur |
| Une amélioration était impossible tant que la file tournait, donc jamais | L'amélioration est possible à tout moment et s'applique aux lots suivants |
| Bâtiments comptés à 50 % : investir faisait baisser le classement, les joueurs thésaurisaient | Bâtiments comptés à leur coût |
| En fin de saison, plus rien de productif à financer : la trésorerie s'accumulait | **Palais** : bâtiment de prestige sans production, compté à son coût, qui détruit des ducats et consomme des matériaux ; entretien qui croît plus vite que le niveau |
| Le PNJ rachetait à 90 % du prix de référence quand le marché était à 35 % : subvention exploitable | Le PNJ suit le marché **à la baisse uniquement** (jusqu'à 50 % du prix de référence) |
| La masse monétaire par joueur actif croît avec la taille des affaires (épargne pour l'amélioration suivante) alors que les prix restent stables | L'inflation se mesure par l'indice des prix ; la masse monétaire par joueur actif a un plafond (2,5 × le capital de départ) et sa croissance devient un diagnostic |

### Le monde vivant (après le premier test de la bêta)

Constat du premier test : seuls les briques et les planches intéressaient les autres joueurs. Le blé, la farine, l'argile, le bois et même le pain n'avaient pas d'acheteur parmi eux.

| Mécanique | Règle | Ce que ça change |
| --- | --- | --- |
| **Rations** | Chaque niveau d'atelier mange 2 pains par jour ; sans pain, les nouveaux lots durent 50 % de plus | Tout le monde achète du pain aux boulangers |
| **Combustible** | Boulangerie : 8 farine + 2 bois → 10 pains ; briqueterie : 10 argile + 2 bois → 6 briques | Le bois devient indispensable au boulanger et au briquetier ; les Dolomites en produisent un excédent à vendre |
| **Contrats du Doge** | 3 commandes par jour et par joueur, toutes ressources, payées 20 % au-dessus du prix de référence | Blé, farine, argile et bois trouvent preneur ; un objectif concret chaque jour |
| **Événements de marché** | Tous les 2 jours, 24 h : disette, incendie, tempête, récolte abondante, foire de la Sensa. Annoncés la veille par la gazette | Les prix bougent, il y a des coups à anticiper |
| **Galères** | Constantinople (12 h, soie, +35 %) ou Alexandrie (24 h, épices, +60 %). Cargaison payée au prix de référence, risque de pirates (10 % / 20 %), escorte payante (3 % / 6 %) | La signature vénitienne ; un usage pour les marchandises bon marché ; une décision de risque |

Chaque métier dépend désormais des deux autres : le boulanger vend son pain à tous et achète bois, briques et planches ; le briquetier achète pain, bois et planches ; le charpentier achète pain et briques. Les tirages (événements, contrats, pirates) viennent d'un secret du monde qui ne quitte pas le serveur.

### Un monde habité dès le premier joueur (bêta)

| Fonction | Règle |
| --- | --- |
| **Maisons marchandes (PNJ)** | Des marchands tenus par l'ordinateur complètent le monde jusqu'à 15 marchands actifs (`worlds.settings.bots.population`). Ce sont les bots du simulateur, qui jouent avec les mêmes commandes et les mêmes limites que les joueurs : tout passe par le grand livre et le journal des stocks. Ils jouent 1 à 5 sessions par jour, entre 7 h et 23 h (UTC) |
| **Transparence** | Un badge « PNJ » les signale dans le classement. Ils n'ont pas d'adresse e-mail réelle et ne peuvent pas ouvrir de session. Ils sont exclus des récompenses hebdomadaires |
| **Retrait** | Quand un joueur réel devient actif, une maison se retire (au plus une par heure) : ses ordres sont annulés, elle cesse de jouer et quitte le classement. Si le monde se vide, une maison retirée revient avant qu'on en crée une nouvelle |
| **Classement hebdomadaire** | Gain de patrimoine de la semaine, en ducats. Une semaine = 7 jours depuis l'ouverture du monde (mêmes bornes que les grands chantiers), la dernière court jusqu'à la fin du mois ; un nouveau venu part de son patrimoine à l'arrivée. Titres de la semaine pour le podium, Pass Négociant 7 jours pour le top 10 (joueurs réels) |
| **Notifications** | Dans le jeu (cloche) et en push (PWA) : récolte prête, galère rentrée, ordre exécuté, événement, résultat de la semaine. Chaque type peut être coupé ; pas de push entre 22 h et 8 h (heure de Paris) |

### La mer : neuf ports, flotte et corsaires

Inspiré de Mercato Venezia : du risque et de l'affrontement entre joueurs, sans jamais tout perdre.

| Mécanique | Règle |
| --- | --- |
| **Neuf ports** | Raguse et Corfou (sel), Candie et Chypre (vin), Constantinople (soie), Acre et Alexandrie (épices), Caffa (fourrures), Bruges (draps), de 6 h à 48 h de mer. Chaque port paie nos marchandises à ses prix : des envies durables (l'Égypte paie le bois +40 %) et une variation hebdomadaire de ±25 % tirée du secret du monde |
| **Nouvelles marchandises** | Sel, vin, fourrures et draps se vendent aux villes et figurent dans une commande du Doge sur cinq. Elles ne servent jamais aux constructions ni aux chantiers |
| **Flotte** | Cogue, galère, caraque, construites à l'Arsenal (ducats et planches), avec entretien, et comptées dans le patrimoine. Au plus 4 navires. Un convoi part sur ses propres navires (navire marchand + 0 à 3 escortes), paie des droits de port (30 % de l'affrètement), emporte des vivres par navire et va au pas du plus lent. L'affrètement d'une galère reste possible |
| **Avaries** | Un navire n'est jamais coulé. Les pirates ou un abordage réussi endommagent le navire marchand, un abordage raté les corsaires ; un navire endommagé reste au port jusqu'à sa réparation (ducats, 6 à 8 h de chantier) |
| **Lettres de marque** | Un joueur envoie ses navires croiser 12 h sur une route (100 ducats et des vivres). Chaque convoi d'un autre joueur qui passe à mi-voyage peut être abordé ; la chance va de 15 % à 75 % selon l'attaque des corsaires face à la défense du convoi. Une prise emporte 30 % de chaque ligne de cargaison, dans la limite des cales ; un échec arrête la chasse |
| **Garde-fous** | 3 jours d'immunité à l'arrivée ; pas de pillage d'un joueur deux fois moins riche ; un seul pillage réussi par victime et par 24 h ; perte limitée à 30 % d'une cargaison ; jamais de navire, d'atelier ni de trésorerie à quai perdus |
| **Transparence** | La carte montre les routes guettées (sans dire par qui). La victime et le corsaire sont notifiés et voient le nom de l'autre ; les « nouvelles du large » publient les prises |

### Le marché entre joueurs (après le deuxième test de la bêta)

| Fonction | Règle |
| --- | --- |
| **Dogana** | Le PNJ teneur de marché s'appelle la Dogana, la douane de la République (le nom Fondaco est réservé au jeu). Chaque marchand peut lui acheter 25 unités et lui en vendre 10 par ressource et par jour ; à plusieurs, ces quotas se partagent 250 unités par jour et par ressource |
| **Offres à son prix** | Tout joueur peut laisser une offre d'achat ou de vente à son prix (72 h au plus, 10 offres ouvertes). Le stock ou les ducats sont mis de côté jusqu'à la conclusion ou l'annulation |
| **Carnet visible** | La fiche d'une ressource montre les cinq meilleures offres de chaque côté, avec le nom de leur auteur (badge PNJ pour les maisons, « Dogana ») et le quota restant du joueur |
| **Offre conclue** | Une notification prévient l'auteur d'une offre quand quelqu'un la prend |

### Interdépendance des régions (après le troisième test de la bêta)

| Règle | Détail |
| --- | --- |
| **Matières premières locales** | Le blé ne pousse qu'en Terraferma, l'argile ne se trouve que dans la Lagune, le bois que dans les Dolomites. Moulin, boulangerie, briqueterie, scierie et palais se construisent partout : il faut acheter ses matières premières aux autres régions |
| **Prime à la spécialisation** | +25 % de rendement par niveau au-delà du premier : mieux vaut un grand atelier que plusieurs petits, et acheter le reste |

### Rétention : les sept premiers jours (après l'audit de la bêta)

| Fonction | Règle |
| --- | --- |
| **Comptoir en sommeil** | Sans visite depuis 24 h, l'entretien tombe à 25 % et les ouvriers ne connaissent pas la faim. Le joueur qui revient retrouve un comptoir intact |
| **Bon retour** | Après 4 h d'absence, un récapitulatif tiré des journaux : gains par source, entretien payé, lots prêts, nouvelles reçues, et un bouton pour tout récolter et relancer |
| **Un geste** | « Tout récolter et relancer » récolte chaque atelier et remplit chaque file selon le stock, en une seule transaction |
| **Ballots de Faraj** | Faraj d'Alexandrie, dont le grand-père du joueur a sauvé la cargaison, envoie un ballot toutes les 6 h (2 au plus en attente) : 3 cartes de 1 à 5 unités, du blé commun à la soie légendaire (0,25 % par carte). Probabilités publiques, rien à acheter, rien de plus avec le Pass. Environ 11,5 % de matière en plus (`docs/calibration.md`) |
| **Livre de compte** | Dix missions ouvertes sur sept jours (première vente à une ville, premier contrat, première offre, premier convoi, première amélioration…), récompensées en marchandises ou en quelques ducats. Le tutoriel se termine en encaissant la première |
| **Ouverture progressive** | Le Port s'ouvre au jour 3 (mission « premier convoi »), les lettres de marque au jour 6 (« premier navire ») ; un joueur déjà en mer n'est jamais bloqué |
| **Tableau de rétention** | Page `/admin` réservée aux adresses `ADMIN_EMAILS` : retour à J+1, 3, 7, 14, 30, sessions par jour, entonnoir du tutoriel, dernière visite. PNJ exclus |

### Les familles patriciennes (premier lien social) — remplacées par les guildes, puis revenues autrement

Remplacées en octobre 2026 par les guildes et les guerres de concessions, puis revenues sous une autre forme : les quatre familles se disputent la Campagne de Terraferme (section « Les quatre familles et la Campagne de Terraferme »). Pour mémoire, la première version :

Plan complet et phases suivantes (mariages, commandite, enchère des galères, prêts, Grand Conseil) : `docs/plan-familles.md`.

| Mécanique | Règle |
| --- | --- |
| **Allégeance** | Contarini (bâtisseurs), Morosini (terre ferme), Mocenigo (mer), Dandolo (Levant). Ouverte 4 jours après l'arrivée, une fois pour la saison |
| **Commande de famille** | Une par jour et par membre, dans le domaine de la famille, à la prime du Doge. Le Doge passe à 2 commandes par jour : la monnaie créée ne bouge pas |
| **Mécénat** | Ducats offerts à sa famille, plafonnés par jour, **détruits** : un puits qui coûte du patrimoine. Ni l'influence ni le mécénat ne comptent au classement |
| **Semaine des familles** | Influence plafonnée par membre, divisée par le nombre de membres actifs (au moins 3) : une petite famille assidue bat une grande famille passive. La gagnante tient la Seigneurie la semaine suivante (commandes de famille +10 %), avec une *contumacia* qui réduit son score pour que le pouvoir change de mains |
| **Visibilité** | Onglet Familles : classement en direct, champions, membres et leurs contributions ; notification du résultat de la semaine |
| **Fil de la famille** | Les membres d'une famille s'écrivent dans l'onglet Familles : 280 caractères, un message toutes les 10 s et 50 par jour, filtre de mots, pas de liens. Trois signalements masquent un message ; les signalements sont sur la page `/admin` |
| **PNJ** | Les maisons marchandes prêtent allégeance, livrent les commandes et font du mécénat, pour qu'un petit monde ait des familles vivantes |

### Les routes et les brigands (le pendant terrestre de la mer)

Note d'implémentation : `docs/plan-livraisons.md` ; réglages calibrés : `docs/calibration.md`. Constat de départ : une session se résumait à « Tout récolter et relancer », et vendre aux villes ne demandait aucun choix.

| Mécanique | Règle |
| --- | --- |
| **Fin de la vente instantanée** | Les villes ne rachètent plus au comptoir et les Criées disparaissent. Le marché commun (Dogana, offres entre joueurs) ne change pas |
| **Événements sur la route** | Un événement de marché agit sur le tableau de commandes de son jour : prix des commandes qu'il touche (ville et marchandise, Doge et familles compris) et 3 commandes de ville envoyées là où il demande davantage (`deliveries.eventOrdersPerDay`), dans le total du jour |
| **Tableau de commandes** | (Avant la demande commune, ci-dessous.) 12 à 16 commandes personnelles par jour, tirées du secret du monde, que personne d'autre ne peut prendre : les deux commandes du Doge et celle de la famille (à leur prime), deux urgentes (ouvertes une heure entre 8 h et 21 h, +15 %), le reste en commandes de ville. Une ville commande ce qu'elle demande ; le prix vaut la référence +50 % par heure de route. Les commandes expirent à minuit. Les marchandises d'outre-mer peuvent être commandées par les villes ; les commandes d'outre-mer du Doge et des familles se remettent toujours au comptoir |
| **Sept villes** | Venise, Padoue, Vérone, Vicence, Trévise, Mantoue, Ferrare ; de 20 min à 1 h 50 de route selon la région de départ |
| **Véhicules** | Mule (15 unités, lente), charrette (40, donnée à l'arrivée), chariot (90, rapide) ; 4 au plus, achetés en ducats et planches (détruits), avec entretien, comptés au patrimoine. Un trajet aller dure 2 h au plus ; le véhicule revient à vide, la ville paie à l'arrivée |
| **Escortes** | Gardes (4 % de la valeur de la cargaison) ou compagnie (9 %), détruits. Une escorte protège sans qu'il soit besoin d'être là |
| **Brigands** | Dès le jour 6, un joueur poste une bande sur une route pour 2, 4 ou 6 h (une mise détruite). À mi-parcours d'une livraison, la plus ancienne bande de la route tente sa chance, deux fois au plus par bande. Sans escorte, la livraison s'arrête et le joueur a 10 minutes pour riposter : une riposte fait échouer l'attaque et disperse la bande. Une prise emporte 30 % de chaque ligne ; le brigand en garde la moitié, le reste se perd dans la fuite. La livraison est payée au prorata de ce qui arrive. Des bandes de l'ordinateur guettent aussi, pour qu'un petit monde ait du risque |
| **Garde-fous** | Aucune attaque entre 22 h et 8 h (heure de Paris), ni contre un nouveau venu (3 jours), un marchand deux fois moins riche que le brigand, un membre de sa famille, ni deux fois en 24 h contre la même victime (délai partagé avec la mer). Le véhicule revient toujours |
| **Équilibre** | La monnaie payée pour les marchandises reste celle d'avant (villes, Doge, familles, Criées), à ±10 % ; le transport est un puits ; brigander ne crée jamais de valeur mais devient un vrai rôle : une bande garde tout son butin (trois attaques au plus) et un brigand assidu gagne de +30 à +150 % de sa mise, sans rattraper un livreur à l'heure |
| **Infamie et primes** | Chaque prise fait monter l'infamie du brigand pour la saison. Repousser la bande d'un marchand (escorte ou riposte) vaut au livreur une prime du Doge : 5 ducats, +20 % par prise du brigand, 30 au plus (`bandits.bounty`) |
| **Pass Négociant** | Aucun avantage sur la route : ni véhicule, ni escorte moins chère, ni délai de riposte, ni commande échangée (l'échange de commande du Doge disparaît avec le tableau) |
| **Notifications** | Attaque (immédiate, jamais regroupée, ouvre le jeu sur l'alerte), livraison payée, attaque réussie ou repoussée (aux deux joueurs, avec le nom de l'autre), fin de bande. La gazette publie les prises, sans noms |

### Un empire qui se voit, un mois qui se raconte (retour du porteur, octobre 2026)

Constat : le jeu devient vite redondant et on a peu l'impression de se développer. Une session se résume au même tour, les prix ne bougent pas, le mois n'a pas d'arc, les autres joueurs ne pèsent presque pas sur soi, aucun choix n'engage.

| Mécanique | Règle |
| --- | --- |
| **Domaine** | En tête du Comptoir, la Maison dessinée sur la terre de sa région. Les ateliers occupent douze parcelles, le palais la place d'honneur. Chaque niveau ajoute un ornement (bannière, socle, tour, couronne dorée). Ciel selon l'heure de Paris. Purement visuel |
| **Maîtrises** | À 5 niveaux d'ateliers, le marchand choisit une maîtrise pour toute la saison : Maître d'atelier (+10 % sur ce qui se transforme), Roulier (véhicules 25 % plus rapides, un de plus), Négociant (quotas Dogana +25 %, taxe −2 points, 3 offres de plus) ou Armateur (droits de port −50 %, cales +25 %). Réglages `specialties` |
| **Saison en actes** | Quatre actes, un par semaine, comprimés si le monde ouvre tard (`acts`). I l'installation ; II une crise tirée du secret du monde (guerre de Chioggia, peste ou embargo du Levant) ; III la guerre de Lombardie (Milan moitié plus fort dans la Campagne ; auparavant l'Arsenal, un chantier disputé) ; IV la Sensa, commandes +15 % et plus nombreuses. Le modificateur d'acte se multiplie avec l'événement du jour |
| **Demande commune** | Les commandes des villes forment un tableau du monde, tiré chaque jour : 10 commandes de ville et 2 urgentes par marchand actif (`sharedOrdersPerActivePlayer`), complété si un marchand arrive dans la journée. Les commandes de ville sont payées la référence +10 % (`cityPriceBps`, contre +25 % sur le tableau personnel), plus le bonus de route. Le premier qui envoie un véhicule prend la commande ; le prix dépend de la route depuis sa région. Les matières premières restent réservées à leurs producteurs ; les commandes du Doge, de la famille et de bienvenue restent personnelles. Le bouton « Meilleur choix » disparaît |

### Guildes, guerres de concessions, Rialto nécessaire (retour du porteur, octobre 2026)

> **Guildes, carats, concessions et guerres remplacés le 13 octobre 2026** par les quatre familles et la Campagne de Terraferme (section suivante). Le Rialto nécessaire reste. Pour mémoire :

Constat : le marché ne sert à rien (les livraisons rapportent bien plus, les prix restent collés à la référence), les familles n'ont pas d'intérêt (l'influence ne rapporte rien, ni vote ni trésor), et il manque un vrai affrontement entre joueurs (le brigandage rapporte peu et frappe au hasard). Choix du porteur : des **guildes** où l'on investit, des **guerres commerciales pour des concessions**, un **Rialto rendu nécessaire**, le brigandage **en temps de guerre seulement**, le Port inchangé.

La boucle : produire (Comptoir) → livrer (Routes) → s'approvisionner et revendre au Rialto → investir dans sa guilde → conquérir et défendre des concessions. Une guerre fait monter la demande d'un bien dans une ville : elle profite aux belligérants, aux fournisseurs sans guilde et aux vendeurs du Rialto.

| Mécanique | Règle |
| --- | --- |
| **Guilde** | Fondée pour 50 d (détruits) avec une mise de 100 d au moins, 12 membres au plus, une guilde à la fois, dès le jour 2 (`guilds`). Le trésor est un compte du grand livre (`guild:<id>`) |
| **Carats** | Chaque ducat versé au trésor achète des carats à leur valeur du moment (trésor ÷ carats émis) : investir ne change pas le patrimoine, et les carats comptent au classement à leur valeur. Partir rend les carats moins un cinquième, qui reste à la guilde ; le dernier membre reprend tout. En fin de saison, le trésor est partagé par carats. Pas d'achat de matières par la guilde |
| **Votes** | Pondérés par les carats, aucun membre ne pesant plus de 40 % des carats. Une proposition passe dès qu'elle réunit la majorité de la guilde, ou au bout de 24 h si les oui l'emportent sur les non ; proposer vaut voter pour. Sujets : guerre, péage (0 à 8 %), part des recettes versée en dividendes, prime aux fournisseurs (0 à 0,50 d par unité), ouverture, exclusion (rachat à pleine valeur) |
| **Concessions** | Douze biens dans les villes (`concessions`), à la Seigneurie au départ. Le détenteur lève son péage sur les livraisons des autres de ce bien à cette ville (versé au trésor, dividendes compris) et paie 10 % de plus à ses membres pour les leurs |
| **Guerre commerciale** | Déclarée par vote : un trésor de guerre de 150 d quitte le trésor, une offensive à la fois par guilde. Pendant 48 h, chaque unité du bien livrée à la ville compte pour son camp ; celles du défenseur comptent 20 % de plus ; la Seigneurie défend par un seuil d'une unité par marchand actif. La ville commande davantage ce bien (un quart de commande par marchand actif et par jour). Le camp qui a le plus livré tient la concession, protégée 72 h (`wars`) |
| **Fournisseurs** | Un marchand sans guilde s'engage auprès d'un camp : ses livraisons comptent pour lui, et la guilde de ce camp lui paie sa prime par unité tant que son trésor le permet |
| **Brigandage de guerre** | Une bande ne se poste que sur la route d'une ville en guerre, par un marchand de l'un des camps, et ne frappe que les convois de l'autre camp portant le bien de la guerre (`bandits.warOnly`). Plus de bandes de l'ordinateur |
| **Rialto nécessaire** | Le prix des commandes des villes suit le Rialto : moitié prix de référence, moitié prix moyen échangé jusqu'à la veille (avec un volume suffisant), entre 80 et 150 % de la référence (`deliveries.marketIndex`). Un prix fixé pour la journée et borné : vendre à perte un jour ne fait baisser les villes que de moitié, et pas sous 80 %. La Dogana devient un filet de sécurité : 10 achats et 5 ventes par jour et par bien |
| **Le monument** | Le chantier de l'Arsenal (Acte III) se dispute entre guildes : la gagnante reçoit 300 d à son trésor et son monument sur la carte |
| **Pass Négociant** | Aucun avantage de guilde ni de guerre : ni carat, ni voix, ni péage, ni prime |
| **Écrans** | Onglet Guilde (fonder, rejoindre, investir, voter, concessions, guerres, fil de guilde). Routes en 3D : blasons des détenteurs sous les villes, minuteur et rapport de force d'une guerre. Fiche de ville : la guerre et ses concessions. Marché : « Demandes de guerre » |

### Les quatre familles et la Campagne de Terraferme (retour du porteur, octobre 2026)

Constat du porteur : le système de guilde ne lui plaît pas. Il veut quatre grandes familles qui s'affrontent, où l'on investit seulement avec des ducats (aucune livraison pour la famille), un affrontement continu chaque semaine qui oblige à participer toute la semaine, et des lois et décrets imposés par la famille gagnante, qui pèsent sur le marché et sur le jeu. Choix retenu : une conquête territoriale asynchrone « à la OpenFront », au rythme des sessions mobiles (proposition : `docs/plan-campagne.md`).

| Mécanique | Règle |
| --- | --- |
| **Familles** | Contarini, Morosini, Mocenigo, Dandolo. Allégeance dès le jour 2, pour la saison (`families`). Une famille plus petite que la moyenne lève jusqu'à 50 % de lances en plus, une plus grande jusqu'à 25 % de moins. Les maisons PNJ rejoignent la famille qui compte le moins de joueurs réels |
| **Carte** | La Terraferme où elle est : 25 terres sur la carte du Veneto, la Lombardie à l'ouest. Fiefs des familles (imprenables) à Feltre (Morosini), Udine (Dandolo), Piove di Sacco (Contarini) et Rovigo (Mocenigo) ; les cinq forteresses de Milan à l'ouest (Brescia, Bergame, Crema, Lodi, Crémone) ; les six villes du jeu, bourgs et villages entre les deux ; voisinages par la géographie (`campaign.lands`). Sur la maquette 3D des Routes, le sol de chaque terre est peint à la couleur de son détenteur, avec ses frontières ; la carte se déplace du doigt et se pince |
| **Semaine** | Chaque lundi (mêmes bornes que le classement hebdomadaire), la carte rouvre : les fiefs aux familles, le reste aux milices et à Milan, avec des garnisons qui croissent avec les marchands actifs |
| **Lances** | Levée gratuite : 2 lances par heure de 8 h à 22 h, 24 en attente au plus, à ramasser en venant. Engagement : 20 lances à 1 d puis 20 à 2 d par jour, ducats **détruits**. Toute lance part 48 h après avoir été levée ou engagée |
| **Marches** | On glisse ses lances depuis son fief jusqu'à la terre (ou on touche la terre), puis on confirme. Vers une terre de sa famille (renfort) ou voisine d'une de ses terres (attaque), jamais un fief. 20 min, +10 min par terre au-delà de la première depuis le fief. Aucune arrivée entre 22 h et 8 h : une marche du soir arrive à 8 h. Les marches se voient sur la carte ; les membres peuvent rejoindre un assaut en cours |
| **Combat** | Déterministe : l'attaque prend la terre si elle dépasse la garnison fois la défense (village ×1, bourg ×1,2, ville ×1,5, forteresse ×2) ; il reste la différence en garnison. Sinon la garnison perd l'attaque divisée par sa défense |
| **Gloire** | Chaque heure ouverte, une terre rapporte sa valeur à la famille qui la tient (village 1, bourg 2, ville 3, forteresse 4) |
| **Milan (PvE)** | Toutes les 4 heures ouvertes, Milan chevauche contre la famille en tête : sa terre la plus faible sur la frontière de Milan, avec 10 lances + 2 par marchand actif, doublées à 100 % d'avance. Ses forteresses se regarnissent chaque jour. L'acte III (la guerre de Lombardie) le rend moitié plus fort |
| **Mérite** | Une lance par bataille gagnée (attaque ou défense), un point pour 10 lances tenues une heure en garnison. Il pèse le vote du programme (aucun membre au-delà de 25 %) et partage la gabelle et le péage. Le premier de chaque famille est son capitaine |
| **Décrets** | Pendant la semaine, chaque famille vote son programme de deux décrets, public. La gagnante l'impose la semaine suivante ; jamais le même décret deux semaines de suite. Catalogue (`decrees`) : Privilège du Fondaco (taxe du Rialto 1 %, quotas de la Dogana +50 % pour les membres), Gabelle sur un bien (+4 points de taxe sur les ventes des autres, partagés entre les membres), Faveur d'une ville (livraisons des membres +10 %, ses commandes urgentes à eux la première demi-heure), Péage de Terraferme (3 % des livraisons des autres vers les villes que la famille tenait en fin de semaine), Lettres de course (seuls ses membres postent des brigands, contre les autres familles), Tarif du Levant (droits de port −50 % pour les membres, +25 % pour les autres), Calmiere (aucune offre d'un bien au-dessus de 115 % de la référence), Franchise (entretien −20 % pour les membres) |
| **Dernière semaine** | Pas de décrets : la famille gagnante remporte la saison |
| **Monnaie** | Lances : un puits. Gabelle et péage : un transfert entre joueurs par le compte de la famille (`family:<code>`), partagé à la clôture de la semaine. Faveur : seule création, bornée |
| **Brigandage** | Seulement sous les lettres de course (`bandits.decreeOnly`), jamais entre membres d'une même famille |
| **Guildes d'un monde existant** | Au premier tick, chaque trésor est rendu à ses membres par carats ; guildes, concessions et guerres disparaissent |
| **Écrans** | Onglet Famille : choix de la famille, Gloire des quatre familles, lances, carte de la Terraferme, marches, programme, décrets, membres, semaines passées, fil de famille. Bandeau des décrets au Marché, sur les Routes et au Port. Blason de la famille qui tient la terre d'une ville sous son nom, sur les Routes. Notifications : terre menacée (immédiate), terre perdue, résultat de la semaine, part des décrets |
| **Pass Négociant** | Hors sujet pour cet ajout : le Pass sera entièrement revu (porteur) |

### Charger et glisser (retour du porteur, octobre 2026)

Inspiré des quais d'un jeu de commerce spatial : on remplit un véhicule, puis on le glisse jusqu'à sa destination.

| Mécanique | Règle |
| --- | --- |
| **Chargement** | Un véhicule emporte jusqu'à 4 commandes du jour, toutes pour la même ville, dans sa capacité (`deliveries.maxOrdersPerLoad`). Chaque commande est payée à l'arrivée pour ce qui reste de sa marchandise ; l'escorte se paie sur tout le chargement |
| **Geste** | Toucher le dépôt ou un véhicule le sélectionne (barre du véhicule en bas de la carte). « Charger » ouvre les Cargaisons : on coche les commandes, la cale se remplit. On glisse ensuite le véhicule du dépôt jusqu'à la ville (ou on la touche) ; une barre « Départ vers… » laisse six secondes pour choisir l'escorte, partir ou annuler |
| **Équilibre** | 4 commandes de ville par marchand actif au tableau commun (au lieu de 10), villes à +10 %, +30 % par heure de route : la monnaie payée reste dans sa cible (`docs/calibration.md`) |

## Vision et positionnement

Fondaco est un jeu de commerce multijoueur en 2D, jouable sur navigateur PC et mobile. Chaque joueur développe un comptoir marchand dans un monde partagé dont les prix sont fixés par les joueurs.

**Pitch** : le Travian du commerce, en saisons historiques d'un mois, avec une économie réelle et lisible.

**Promesse joueur** : partir de rien, bâtir une maison de commerce en un mois, et peser réellement sur les prix d'un marché vivant.

**Positionnement** : jeu de niche, assumé. On vise quelques milliers de joueurs très engagés plutôt qu'un large public. La profondeur économique est un atout, pas un défaut à cacher ; l'effort porte sur la **lisibilité** et sur une prise en main guidée en 10 minutes.

**Différenciation** face à Sim Companies, Torn, OGame ou Albion :

- Des saisons d'un mois civil (Venise 1450 pour la première), remises à zéro, pour qu'aucun nouveau venu ne soit écrasé.
- Une économie lisible : carnet d'ordres visuel, graphiques simples, conseiller qui explique les prix, journal de bourse public.
- Une économie saine par construction : grand livre en partie double, indicateurs publics de masse monétaire et d'inflation.
- Pas de pay-to-win écrasant : on ne vend jamais de ressources, de monnaie de jeu ni de production ; le Pass Négociant donne un léger avantage à qui joue, et se gagne aussi au classement.

**Cible** : adultes de 25 à 55 ans, amateurs de gestion, de stratégie et de tableurs, qui jouent en sessions courtes sur mobile et longues sur PC.

**Canaux d'acquisition** : communautés Reddit et Discord de jeux de gestion, de jeux incrémentaux et de jeux par navigateur ; bouche-à-oreille entre saisons. Pas de publicité payante au départ. Les streamers et les mondes privés sont reportés en V2 (voir `IDEAS.md`).

## Périmètre du MVP

Le MVP vise un seul monde de 200 à 500 joueurs, des saisons d'un mois civil sur le thème Venise 1450, en web uniquement (PWA installable).

| Inclus dans le MVP | Exclu du MVP (voir `IDEAS.md`) |
| --- | --- |
| Inscription par lien magique e-mail | Connexion Google / Apple |
| 1 monde, 1 saison, 3 régions | Plusieurs mondes en parallèle, mondes privés |
| 7 ressources, 3 chaînes de production | Textile, ameublement, autres thèmes historiques |
| Carnet d'ordres (cours limité + ordre immédiat) | Contrats entre joueurs, prêts |
| PNJ teneur de marché permanent + demande des villes | Événements pilotés par le chat Twitch |
| Grands chantiers de ville par guilde | Cartels, entrepôts partagés |
| Guildes simples (nom, membres, chat texte modéré) | Classement inter-saisons |
| Classement par patrimoine | API publique |
| Tableau de bord joueur + graphiques de prix | Application en magasin (Capacitor), notifications push |
| Télémétrie dans PostgreSQL + vues pour Power BI | Boutique, pass saisonnier, abonnement |

**Critère de sortie du MVP** : une saison complète avec au moins 100 inscrits venus de communautés extérieures (pas uniquement des proches), au moins 25 % encore actifs à J+14, aucun bug bloquant et aucun écart sur les contrôles d'invariants du grand livre.

## Les 10 premières minutes

C'est la partie la plus importante pour la rétention à J1. Le joueur ne voit pas le carnet d'ordres avant d'avoir compris la production.

1. **Minute 0** : choix de la région, présentée par sa ressource bonifiée (blé, argile ou bois). Le joueur reçoit 1 000 ducats et la chaîne de sa région (voir le tableau des régions).
2. **Minute 1** : le conseiller propose une commande de la ville : « La Sérénissime demande 20 pains » (ou des briques, ou des planches). Le joueur lance la récolte puis la transformation, en durée accélérée pour le tutoriel (30 secondes au lieu de 2 heures).
3. **Minute 3** : il livre la commande et touche ses premiers ducats. C'est la vente aux villes.
4. **Minute 5** : le conseiller lui montre qu'il lui manque le matériau d'une autre région (planches ou briques) pour améliorer un bâtiment. Premier **ordre immédiat** d'achat, guidé.
5. **Minute 8** : amélioration du bâtiment et lancement d'une production de 8 h.
6. **Minute 10** : le carnet d'ordres se débloque, avec une explication en trois écrans (achat, vente, séquestre). Le conseiller propose de placer un premier ordre à cours limité.

Chaque étape écrit un événement `tutorial_step` pour mesurer où les joueurs abandonnent.

## Boucle de jeu et mécaniques

La boucle tient en cinq gestes : produire, vendre, réinvestir, se spécialiser, commercer avec les autres.

1. **Produire** : chaque bâtiment transforme des intrants en extrants selon une recette, en un temps donné (ex. moulin : 10 blé → 8 farine en 2 h).
2. **Vendre** : aux villes PNJ (prix décroissant avec la quantité vendue dans la journée), au PNJ teneur de marché, ou aux autres joueurs via le carnet.
3. **Réinvestir** : construire ou améliorer des bâtiments (niveaux 1 à 5), débloquer des recettes.
4. **Se spécialiser** : chaque région maîtrise une chaîne et produit un seul des deux matériaux de construction ; tout le monde a besoin des deux, ce qui force les échanges.
5. **Commercer** : acheter les intrants qu'on ne produit pas, revendre ses surplus, spéculer.

**Les 7 ressources du MVP**

| Chaîne | Brute | Intermédiaire | Finie | Débouché principal |
| --- | --- | --- | --- | --- |
| Alimentation | Blé | Farine | Pain | Villes PNJ |
| Construction | Argile | — | Briques | Bâtiments, palais, grands chantiers, villes PNJ |
| Charpente | Bois | — | Planches | Bâtiments, palais, grands chantiers, villes PNJ |

| Région | Bonus +30 % | Bâtiments de départ |
| --- | --- | --- |
| Terraferma | Blé | Ferme, moulin, boulangerie |
| Lagune | Argile | Carrière, briqueterie |
| Dolomites | Bois | Camp de bûcherons, scierie |

Les briques et les planches servent à construire et à améliorer tous les bâtiments, au palais et aux grands chantiers : c'est la demande structurelle entre joueurs, puisque chaque région n'en produit qu'un. Les villes achètent du pain (la plus grosse demande), des briques et des planches. Avec le bonus de +30 %, un bâtiment brut de la région alimente exactement le transformateur de niveau équivalent ; un bâtiment brut hors de sa région produit moins.

**Palais** : bâtiment de prestige, sans production, améliorable jusqu'au niveau 5. Il coûte des ducats, des briques et des planches, compte à son coût dans le patrimoine et se voit sur la carte. C'est le puits de monnaie et de matériaux pour les joueurs qui n'ont plus rien de rentable à financer.

**Rythme** : la production tourne en continu, hors ligne compris, avec une file plafonnée à 8 h. Une session mobile type dure 3 à 5 minutes (récolter, relancer, passer 2 ordres) ; une session PC type dure 20 à 40 minutes (optimiser, analyser les prix).

**Production paresseuse** : la production n'est pas calculée par le tick. Chaque bâtiment stocke l'heure de début et la recette en cours ; à chaque lecture, le moteur calcule ce qui est terminé depuis. Un joueur absent ne coûte rien au serveur.

**Grands chantiers** : chaque lundi, une ville annonce un chantier (ex. « Arsenal : 10 000 briques et 6 000 planches avant dimanche »). Les guildes livrent les matériaux et sont payées par la ville à un prix fixe légèrement supérieur au prix de référence. Les trois guildes qui ont le plus livré reçoivent un cosmétique de guilde, et le chantier terminé apparaît sur la carte de la ville. Un joueur sans guilde peut livrer sous une bannière « Indépendants ».

**Arrivée en cours de saison** : les inscriptions restent ouvertes jusqu'au dernier jour du mois. Un joueur qui arrive après J+5 reçoit un bonus de rendement de +50 % pendant 72 h. Pas de second monde en parallèle au MVP : la liquidité prime.

**Fin de saison** : le dernier jour du mois à minuit (heure de Paris), le classement se fige sur le patrimoine, calculé selon le principe de prudence :

- trésorerie, y compris le séquestre ;
- stocks valorisés au **plus bas** du prix de référence et du prix moyen pondéré par les volumes sur 7 jours (avec un volume minimum ; à défaut, le prix de référence) ;
- bâtiments, palais compris, à leur coût de construction cumulé (matériaux au prix de référence), pour que l'investissement ne pénalise pas le classement.

Récompenses de fin de saison, entre joueurs réels (les PNJ ne prennent pas de place) :

| Rang final | Récompense | Renommée |
| --- | --- | --- |
| 1er | Doge de la saison : Pass Négociant toute la saison suivante, son blason honoré à la Dogana pendant la saison suivante | 100 |
| 2e et 3e | Podium : Pass toute la saison suivante | 65 |
| 4e à 10e | Top 10 : Pass toute la saison suivante | 40 |
| Top 10 % | 3 semaines de Pass | 25 |
| Top 25 % | 1 semaine de Pass | 15 |
| Au moins 7 jours joués | Marchand de la saison | 5 |

**Paliers de saison** : le titre de marchand tenu à la clôture (selon le patrimoine) ajoute de la Renommée, quel que soit le rang : Boutiquier +3, Marchand +5, Négociant +10, Armateur +15, Patricien +20, Sénateur +25, Doge +30. L'objectif de saison (prochain palier) est affiché au Comptoir.

La Renommée s'additionne de saison en saison (titres : Habitué du Rialto, Marchand notable, Marchand illustre, Légende de Venise, Lion de Saint-Marc). Elle ne donne jamais d'avance économique : chaque saison, tout le monde repart à égalité. Le palmarès (saisons, semaines, Renommée) est visible sur le profil et depuis le classement.

**Enchaînement** : le premier tick après minuit clôt la saison (classement final, récompenses), ferme le monde et ouvre le mois suivant ; les joueurs choisissent leur région et repartent de zéro après une cérémonie de clôture. Trois jours avant la fin, une notification « dernier sprint » ; à l'ouverture, une invitation à revenir. Un monde ouvert en cours de mois court jusqu'à la fin du mois (ou du suivant s'il reste moins de 14 jours).

**Présence active** (gratuit pour tous, réglé dans `worlds.settings`) : produits frais (+5 % pour une récolte ramassée dans les 30 minutes), Criées du Rialto (3 fois par jour entre 8 h et 22 h, 20 minutes, une ville rachète pain, briques ou planches 10 à 20 % au-dessus de la référence, 6 unités par marchand), tâches du jour (3 tirées au sort, un coffre de 10 à 22 ducats selon la série de jours). Cible : un joueur assidu finit 5 à 10 % devant un joueur occasionnel.

Un classement séparé récompense les guildes sur les grands chantiers.

## Économie et marché

L'économie repose sur un carnet d'ordres par ressource et par monde (pas par région), un PNJ teneur de marché permanent, et des sources et des puits de monnaie suivis chaque jour.

**Carnet d'ordres**

- **Ordre à cours limité** : prix + quantité, en achat ou en vente, valable 72 h maximum.
- **Ordre immédiat** : exécuté tout de suite contre le carnet (ordres des joueurs et du PNJ), avec un prix limite implicite à ±10 % du meilleur prix affiché ; la partie non exécutable est annulée, jamais laissée dans le carnet.
- Appariement prix puis temps : l'ordre le plus ancien au meilleur prix est servi en premier ; la transaction se fait au prix de l'ordre déjà présent.
- À la pose, la monnaie (achat) ou le stock (vente) est bloqué en séquestre ; annulation possible à tout moment.
- Au plus 10 ordres ouverts par joueur.
- Toute la monnaie est stockée en entiers (1 ducat = 100 deniers), jamais en flottants.
- L'appariement est sérialisé par carnet : un verrou transactionnel par couple (monde, ressource) empêche deux appariements simultanés sur la même ressource.

**PNJ teneur de marché (permanent)**

- Il place des ordres d'achat et de vente autour du prix de référence de chaque ressource.
- Son écart part de 4 % au lancement et s'élargit jusqu'à 20 % à J+14, puis reste à 20 %. Il sert alors de plancher et de plafond : les joueurs font mieux entre eux, mais le jeu reste jouable avec peu de monde connecté.
- Sa profondeur est plafonnée : une quantité maximale par ressource et par jour, réglée dans les paramètres du monde.
- Son prix de référence est fixé dans les paramètres du monde et ajustable sans redéploiement. Il suit le marché **à la baisse uniquement** : il cote autour du plus bas du prix de référence et du prix moyen pondéré sur 7 jours (comme la valorisation), sans descendre sous 50 % du prix de référence. Il ne peut donc pas être poussé à acheter cher, et il ne soutient pas un prix que les joueurs ont abandonné.
- Ses achats créent de la monnaie et ses ventes en détruisent ; tout passe par le grand livre, sur un compte système dédié.

**Sources de monnaie** (création)

- Ventes aux villes PNJ : chaque ville achète du pain, des briques et des planches selon une courbe de demande dont le prix baisse avec la quantité vendue dans la journée, puis se régénère. La capacité de chaque ville est fixée par joueur actif, pour que la demande suive la taille du monde.
- Paiements des grands chantiers.
- Contrats du Doge et commandes de famille (même budget que trois contrats du Doge, plus la prime de la famille au pouvoir).
- Achats nets du PNJ teneur de marché.
- Capital de départ : 1 000 ducats par joueur.

**Puits de monnaie** (destruction)

- Taxe de marché de 3 % sur chaque transaction entre joueurs, payée par le vendeur.
- Entretien des bâtiments en ducats, prélevé chaque jour ; il croît plus vite que le niveau (un bâtiment de niveau L coûte base × L × (1 + 20 % × (L − 1))). Un joueur qui ne peut pas payer ne peut plus lancer de production pendant 24 h.
- Part en ducats du coût de construction et d'amélioration, palais compris (le reste se paie en briques et en planches, qui ne sont pas un puits de monnaie).
- Ventes nettes du PNJ teneur de marché.
- Mécénat des familles (plafonné par jour).

**Indicateurs de santé**

| Indicateur | Rôle | Cible |
| --- | --- | --- |
| Indice des prix du panier des 7 ressources (base 100 à J1) | Indicateur principal d'inflation | 80 à 130 chaque jour |
| Masse monétaire par joueur actif (argent des seuls joueurs actifs) | Garde-fou | ≤ 2,5 × le capital de départ toute la saison |
| Croissance de la masse monétaire par joueur actif | Diagnostic | Moyenne glissante sur 7 jours dans ±2 %/jour à partir de J+14 |
| Ratio monnaie créée / détruite par jour | Diagnostic | Alerte en dehors de 0,8 à 1,3 |
| Volume échangé entre joueurs vs avec le PNJ | Santé du marché | Part des joueurs > 50 % à J+14 |

**Paramètres d'équilibrage** : tous dans `worlds.settings` (JSON), modifiables sans redéploiement. Les montants sont en deniers et les taux en points de base (1 % = 100 points), pour rester en entiers. Les valeurs de Venise 1450, réglées avec le simulateur, sont dans `packages/engine/src/themes/venice1450.settings.ts` et expliquées dans `docs/calibration.md`.

## Comptabilité et invariants

Chaque mouvement de monnaie passe par un grand livre en partie double ; chaque mouvement de stock passe par un journal des stocks. Aucun solde n'est modifié sans écriture correspondante, ce qui rend la triche et les bugs traçables.

**Comptes du grand livre** : un compte de trésorerie et un compte de séquestre par joueur, un compte par guilde (V1), et des comptes système par monde : création (villes, chantiers, PNJ acheteur, capital de départ), destruction (taxes, entretien, construction, PNJ vendeur).

**Journal des stocks** : chaque entrée ou sortie (production, consommation, achat, vente, séquestre, livraison de chantier) écrit une ligne avec le joueur, la ressource, la quantité signée et le motif.

**Invariants vérifiés par les tests et chaque nuit en production** :

1. Chaque écriture est équilibrée (débit = crédit), garanti par la structure de la table.
2. Pour chaque compte, le solde stocké est égal à la somme de ses écritures.
3. Masse monétaire des joueurs = total créé − total détruit.
4. Pour chaque joueur et chaque ressource, le stock stocké (disponible + séquestre) est égal à la somme du journal des stocks.
5. Aucune trésorerie, aucun séquestre et aucun stock n'est négatif (contrainte en base).
6. Le séquestre de chaque joueur est égal au montant restant de ses ordres ouverts.

Un écart sur l'un de ces contrôles est une alerte bloquante.

## Architecture technique

Un seul code web sert PC et mobile ; la logique de jeu vit dans un paquet pur et testé, appelé par l'API, par la tâche planifiée et par le simulateur.

```
        Client web PWA (React + Vite, même code PC et mobile)
                     │  HTTPS + WebSocket
                     ▼
        Serveur API (Node + Fastify, REST + WebSocket)
          │                      │ transactions SQL
          ▼                      │
  packages/engine                │      Tâche planifiée (tick 60 s)
  production, marché,            │      expirations, PNJ, villes,
  grand livre, invariants        │      entretien, chantiers
  (fonctions pures,              │             │ écritures
   sans accès base)              ▼             ▼
          ▲         ┌──────────── PostgreSQL ────────────┐
          │         │ Couche compte (permanente)         │
  apps/simulator    │   accounts, worlds, themes,        │
  bots en mémoire   │   resources, recipes, telemetry    │
  → CSV Power BI    │ Couche monde (par saison)          │
                    │   players, buildings, orders,      │
                    │   trades, ledger, stock_movements… │
                    │   tout avec world_id               │
                    └─────────────────┬──────────────────┘
                                      │ vues SQL
                                      ▼
                                   Power BI
```

Le moteur n'accède jamais à la base : il reçoit un état, renvoie un nouvel état et la liste des écritures à passer ; c'est l'appelant qui écrit en base dans une transaction. Le simulateur utilise exactement le même moteur, ce qui garantit que l'équilibrage réglé en simulation est celui du jeu.

| Brique | Choix | Raison |
| --- | --- | --- |
| Interface | React + Vite + Tailwind, en PWA | Un seul code, installable sur mobile |
| Serveur | Node + Fastify, TypeScript | Même langage que l'interface et le moteur |
| Base | PostgreSQL + Drizzle ORM | Transactions fiables, verrous transactionnels pour le marché |
| Temps réel | WebSocket | Carnet d'ordres et prix en direct |
| Tâche planifiée | Tick toutes les 60 s | Expirations, PNJ, villes, entretien, chantiers (pas la production) |
| Simulateur | Script Node en mémoire | Équilibrage avant d'avoir des joueurs, sortie CSV |
| Hébergement | Railway, un seul service (API + web) depuis le Dockerfile | Déploiement depuis GitHub, PostgreSQL intégré ; quelques euros par mois au départ (à vérifier) |
| E-mails | Resend | Envoi des liens de connexion par API ; offre gratuite suffisante pour la bêta |
| Base locale | PGlite (PostgreSQL embarqué) | Développement et tests sans installer de serveur |

**Mondes** : un monde est une ligne de la table `worlds`, pas une machine. Ouvrir une nouvelle saison revient à créer un nouveau `world_id` rattaché à un thème ; la couche compte (profil, cosmétiques, historique) reste commune à tous les mondes.

**Mobile** : PWA au MVP. Sur iPhone, les notifications push ne fonctionnent que si la PWA est installée ; elles sont donc reportées en V1, avec un emballage Capacitor pour la présence en magasin d'applications.

## Modèle de données

Le modèle sépare trois couches : la couche compte, permanente ; le référentiel, rattaché à un thème ; la couche monde, remise à zéro à chaque saison, où toute table porte un `world_id`.

| Table | Couche | Contenu principal |
| --- | --- | --- |
| `accounts` | Compte | E-mail, pseudo, date d'inscription, cosmétiques possédés |
| `login_tokens` | Compte | Liens de connexion : empreinte SHA-256 du jeton, e-mail, expiration (15 min), usage unique |
| `sessions` | Compte | Sessions navigateur : empreinte du cookie, compte, expiration (30 jours) |
| `themes` | Référentiel | Nom (ex. Venise 1450), régions, villes |
| `resources` | Référentiel | Thème, code, nom, chaîne |
| `recipes` | Référentiel | Thème, bâtiment, intrants, extrants, durée, niveau requis |
| `worlds` | Compte | Thème, nom, dates de début et de fin, statut, paramètres d'équilibrage (JSON) |
| `players` | Monde | Lien compte × monde, région, trésorerie, séquestre, date d'arrivée |
| `buildings` | Monde | Joueur, type, niveau, recette en cours, heure de début |
| `inventories` | Monde | Joueur × ressource : quantité disponible, quantité en séquestre |
| `stock_movements` | Monde | Joueur, ressource, quantité signée, motif, référence |
| `orders` | Monde | Joueur, ressource, sens, type, prix, quantité restante, statut, expiration |
| `trades` | Monde | Ordre acheteur, ordre vendeur, prix, quantité, taxe, horodatage |
| `ledger_accounts` | Monde | Type (joueur, séquestre, système), propriétaire |
| `ledger_entries` | Monde | Compte débité, compte crédité, montant, motif, référence |
| `guilds`, `guild_members` | Monde | Nom, membres, rôles |
| `projects`, `project_deliveries` | Monde | Grands chantiers : ville, besoins, échéance ; livraisons par joueur et guilde |
| `events` | Monde | Événements de jeu (pénurie, tempête) avec effets et durée |
| `telemetry` | Compte | Journal d'événements analytiques (voir KPIs) |

Les prix de référence ne sont pas dans `resources` mais dans `worlds.settings`, pour pouvoir les ajuster par monde.

**Règles** : montants en entiers (`bigint`), horodatages en UTC, toute opération de marché dans une transaction SQL unique avec verrou par carnet, et des contraintes qui interdisent une quantité, une trésorerie ou un séquestre négatifs.

## Monétisation

Le jeu est gratuit et ne vend jamais de ressources, de monnaie de jeu ni de production. Le Pass Négociant donne un léger avantage à qui joue ; il se gagne aussi au classement.

| Offre | Contenu | Phase |
| --- | --- | --- |
| Pass Négociant (3,99 € la saison, 1,49 € la semaine) | Quota Dogana +20 %, 2 offres ouvertes de plus, produits frais +8 % au lieu de +5 %, une commande du Doge échangée par jour, carnet à 10 offres, 7 jours d'historique des prix, vigie des corsaires, alertes des Criées et des bonnes affaires, sceau et palette « Or de Venise ». Gagné par le top 10 de la semaine (7 jours) et selon le rang final de la saison | Fait (paiement Stripe à brancher) |
| Cosmétiques à l'unité | Blasons, façades, bannières de guilde | V1 |
| Mondes privés | Monde dédié pour une communauté, une école ou une entreprise, facturé par saison | V2 |

**Garde-fou** : jamais de ducats, de ressources, de vitesse de production ni de file plus longue (elle avantagerait les absents). À activité égale, l'écart de patrimoine entre abonnés et gratuits reste sous 5 %, les abonnés ne dépassent pas 35 % du top 10, et un gratuit assidu finit devant un abonné occasionnel : trois contrôles bloquants de `pnpm sim --pass 0.2`. **Le paiement du Pass reste débranché tant que ces trois contrôles ne sont pas conformes sur toutes les graines** (audit d'octobre 2026, R7). Le Jeton Sceau (monnaie de jeu achetable indirectement) reste abandonné.

## Données personnelles

- Données collectées : e-mail, pseudo, événements de jeu. Rien d'autre.
- Mentions légales et politique de confidentialité en ligne dès la bêta.
- Télémétrie conservée 24 mois, puis agrégée ; les vues Power BI n'exposent pas l'e-mail.
- Suppression du compte sur demande depuis le profil : l'e-mail est effacé, le pseudo est anonymisé dans les classements passés.

## Roadmap par jalons

Le développement avance en 8 jalons ; chacun se termine par un critère vérifiable. Compter 4 à 6 mois en soirées et week-ends. L'équilibrage et le plaisir de jeu sont validés avant de durcir le moteur et l'interface.

1. **Moteur minimal et simulateur** (fait, voir `docs/calibration.md`) : `packages/engine` (production, ordres immédiats et à cours limité, PNJ, villes, taxe, entretien) en mémoire, et `apps/simulator` qui fait jouer 50 bots de profils différents pendant 42 jours.
   - Terminé quand : le simulateur produit un CSV journalier des indicateurs de santé, et ils restent dans les cibles sur 42 jours.
2. **Socle** (fait, en ligne sur Railway) : monorepo, base PostgreSQL, migrations, authentification par lien magique, déploiement en ligne.
   - Terminé quand : on se connecte depuis un téléphone sur l'URL de production.
3. **Tranche jouable** (code fait ; reste la semaine de test) : production, vente aux villes et ordres immédiats contre le PNJ, avec une interface sommaire mais utilisable sur mobile, et le tutoriel des 10 premières minutes.
   - Terminé quand : 5 à 10 personnes jouent une semaine et on a recueilli leurs retours.
4. **Grand livre et journal des stocks en base** : comptes, écritures, invariants, contrôle nocturne.
   - Terminé quand : un test de 10 000 opérations aléatoires vérifie les 6 invariants à chaque étape.
5. **Carnet d'ordres en base** : la logique d'appariement, de séquestre et d'expiration est déjà dans le moteur (jalon 1) ; ce jalon la persiste avec des verrous par carnet et traite la concurrence entre requêtes.
   - Terminé quand : les tests passent sur PostgreSQL, dont les cas concurrents (annulation pendant un appariement, deux ordres simultanés sur le même carnet).
6. **Interface soignée** : écran comptoir, écran marché (carnet + graphique de prix), conseiller, classement, responsive mobile.
   - Terminé quand : une session mobile de 3 minutes est faisable d'une main.
7. **Social et saison** : guildes, chat modéré, grands chantiers, cycle de vie du monde (ouverture, fin, classement figé, cosmétiques), bonus des arrivants tardifs.
   - Terminé quand : une saison accélérée de 2 jours se joue de bout en bout.
8. **Télémétrie et bêta** : événements analytiques, vues pour Power BI, mentions légales, bêta ouverte annoncée dans les communautés.
   - Terminé quand : le critère de sortie du MVP est atteint.

## KPIs et télémétrie

Chaque action importante écrit une ligne dans la table `telemetry` (compte, monde, type d'événement, horodatage, propriétés JSON) ; une vue SQL par famille d'indicateurs alimente Power BI.

| Famille | Indicateur | Cible bêta |
| --- | --- | --- |
| Rétention | J1 / J7 / J30 | 40 % / 20 % / 10 % |
| Engagement | Sessions par jour et par joueur actif | ≥ 3 |
| Engagement | Part des sessions jouées sur mobile | ≥ 40 % |
| Onboarding | Tutoriel des 10 premières minutes terminé | ≥ 70 % |
| Onboarding | Premier ordre à cours limité placé dans les 48 h | ≥ 50 % |
| Marché | Ordres exécutés par jour et par joueur actif | ≥ 2 |
| Marché | Écart moyen achat-vente entre joueurs, par ressource | < 10 % du prix |
| Marché | Part du volume échangé entre joueurs (hors PNJ) à J+14 | > 50 % |
| Économie | Indice des prix du panier (base 100 au jour 1) | 80 à 130 |
| Économie | Masse monétaire par joueur actif | ≤ 2,5 × le capital de départ |
| Équité | Indice de Gini du patrimoine à J+21 | < 0,6 |
| Social | Joueurs actifs membres d'une guilde | ≥ 50 % |
| Viralité | Invitations envoyées par joueur | ≥ 0,5 |

**Événements à journaliser dès le jalon 3** : `session_start`, `harvest`, `build`, `order_placed`, `order_cancelled`, `trade_executed`, `city_sale`, `guild_joined`, `project_delivery`, `invite_sent`, `tutorial_step`.

## Risques et parades

Le risque principal n'est pas technique : c'est un marché vide ou déséquilibré qui fait fuir les joueurs dans la première semaine.

| Risque | Parade |
| --- | --- |
| Marché vide | PNJ teneur de marché permanent, 7 ressources seulement, un seul carnet par ressource et par monde, ordres immédiats |
| Inflation ou déflation | Indice des prix et masse monétaire par joueur actif suivis chaque jour ; palais comme puits de fin de saison ; équilibrage réglé par le simulateur ; paramètres modifiables sans redéploiement |
| Manipulation du classement | Valorisation prudente des stocks (plus bas du prix de référence et du prix moyen sur 7 jours) ; détection d'échanges à prix aberrants |
| Vétérans qui écrasent les nouveaux | Saisons de 6 semaines ; bonus de +50 % pendant 72 h pour les arrivants après J+7 |
| Bots et multi-comptes | Un compte par e-mail vérifié ; détection des échanges répétés entre les mêmes comptes à des prix éloignés du marché |
| Bugs de duplication de monnaie ou de stock | Grand livre + journal des stocks ; 6 invariants testés et contrôlés chaque nuit |
| Jeu peu amusant malgré un moteur solide | Tranche jouable au jalon 3, avant le carnet complet et l'interface soignée |
| Multijoueur peu visible | Grands chantiers de guilde ; journal de bourse public |
| Toxicité dans le chat | Chat de guilde uniquement au MVP, filtre de mots, bouton de signalement |
| Périmètre qui gonfle | Toute idée hors MVP va dans `IDEAS.md`, pas dans le code |
| Acquisition | Communautés Reddit et Discord de jeux de gestion ; bêta ouverte annoncée au jalon 8 |

## Démarrer avec Claude Code

Les règles de travail sont dans `CLAUDE.md` à la racine. Avancer jalon par jalon, avec un prompt par jalon, en mode plan :

1. « Lis docs/CADRAGE.md et CLAUDE.md. Propose l'arborescence du monorepo et le plan du jalon 1 (moteur minimal et simulateur), sans coder. »
2. « Implémente le jalon 1 : tests d'abord pour packages/engine, puis le simulateur de 50 bots sur 42 jours avec un CSV d'indicateurs journaliers. »
3. « Jalon 2 : socle et déploiement sur Railway ou Fly.io. »
4. « Jalon 3 : tranche jouable avec le tutoriel des 10 premières minutes. »
5. « Jalon 4 : écris d'abord les tests des 6 invariants, dont le test de 10 000 opérations aléatoires, puis le grand livre et le journal des stocks en base. »
6. « Jalon 5 : liste tous les cas limites du carnet d'ordres, écris les tests, puis le moteur et les verrous. »

**Conseils pratiques**

- Le CSV du simulateur se branche directement dans Power BI : règle l'équilibrage là, avant d'avoir de vrais joueurs.
- Garde le moteur pur : tout ce qui est testé en simulation doit être exactement ce qui tourne en production.
- Si ton jeu de gestion existant a un moteur de production réutilisable, montre-le à Claude Code au jalon 1.
