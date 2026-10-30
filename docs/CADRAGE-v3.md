# Fondaco — Document de cadrage (v3) : un empire marchand sans remise à zéro

*Rédigé le 29 octobre 2026, à la décision du porteur. Ce cadrage fait foi pour toute la conception à partir de cette date. Il remplace la partie conception de `docs/CADRAGE.md` (v2) ; les parties techniques de la v2 restent valables, sauf mention contraire au § 12.*

*Origine : `docs/refonte-2026-10-29/`. On y trouve la synthèse et ses quatre arbitrages, ainsi que les deux notes d'expert : `expert-progression.md` et `expert-meta.md`.*

*Tous les chiffres de ce document sont des **ordres de grandeur, à calibrer au simulateur de 24 mois** (§ 13). Aucun n'est encore simulé.*

## 1. Vision et promesse

Fondaco est un jeu de commerce multijoueur en 2D, sur navigateur PC et mobile (PWA), dans la Venise de 1450.

**Pitch** : un empire marchand qui grandit pendant des années, de la lagune à Bruges ; et, à côté, la Terraferme, une guerre d'une semaine à armes égales.

**Promesse joueur** : « J'ai commencé avec une mule à Mestre. Un an plus tard, j'ai un palais sur le Grand Canal, des comptoirs jusqu'à Alexandrie, une flotte dans la Muda et un siège au Sénat. »

**Ce qui ne change pas** :
- le positionnement : un jeu de niche, assumé, dont la profondeur est lisible ;
- la cible : des adultes de 25 à 55 ans, en sessions courtes sur mobile et longues sur PC ;
- les canaux d'acquisition : les communautés de jeux de gestion et de jeux par navigateur.

**Ce qui change** : le commerce ne repart plus de zéro chaque mois. Le monde est **persistant**. Seule la Terraferme garde des saisons courtes, d'une semaine.

## 2. Les règles d'or

Elles remplacent les règles de conception de la v2.

1. **Rien de ce que le joueur a bâti ne se perd.** Ni par le temps, ni par l'absence, ni par un autre joueur (hors de la Terraferme, qui repart chaque semaine).
2. **On ne punit jamais l'absence.** Il n'y a ni série à casser, ni coût qui court pendant qu'on est parti, ni marchandise qui pourrit en entrepôt pendant une absence.
3. **Seules les positions disputées se perdent**, parce que d'autres les prennent : Podestà, charges, Doge, emplacement du Grand Canal, classement de la Terraferme.
4. **Toute compétition se joue par bande de puissance.** Le vétéran est une légende qu'on voit, jamais un prédateur qu'on croise.
5. **On ne vend jamais de temps ni de puissance** : ni ducats, ni ressources, ni accélération, ni chantier, ni file en plus.
6. **Chaque système absorbe les anciens au lieu de s'y ajouter.** La cible est une douzaine de systèmes visibles, pas trente.

## 3. Ce qui grandit : cinq axes

| Axe | Contenu | Ce qu'on voit grandir |
| --- | --- | --- |
| **La Casa** | Le palais-comptoir de la Maison, niveaux 1 à 20, puis la Maestria sans fin. Jauge maîtresse : elle plafonne les autres axes et ouvre les paliers | La façade sur le Grand Canal, qui prend des étages |
| **Les ateliers** (botteghe) | Niveaux 1 à 20 (25 pour son Arte), dans chaque région où la Maison a un comptoir. Quatre étages de chaîne : brut, travaillé, fini, grand ouvrage | L'atelier qui change de forme tous les cinq niveaux |
| **La flotte** | Huit véhicules, de la mule à la galère de Flandre, avec des modules (cale, vitesse, escorte, comptable, pavillon, assurance) | Les convois sur ses routes |
| **Les comptoirs et la carte** | Dix régions, de la Vénétie à la Flandre. Chacune s'ouvre par une charte, un voyage d'ouverture, puis un comptoir à bâtir (niveaux 1 à 10) | Le brouillard qui se lève, la carte qui se dézoome |
| **La famille et le savoir** | Les membres de la famille comme agents, l'arbre des savoirs (Scuola d'Abaco), l'Arte | La galerie des portraits, l'arbre qui se remplit |

### 3.1 La Casa, jauge maîtresse

Le prochain palier coûte **2 à 7 jours de revenu courant**, jamais plus de 10. Au début, c'est l'argent qui freine ; au sommet, c'est le temps.

| Niveau | Chantier | Ce qu'il ouvre | Atteint vers (joueur médian) |
| --- | --- | --- | --- |
| 1 | — | 4 places d'atelier en Vénétie, 2 mules | Jour 0 |
| 2–3 | 2 à 10 min | Ateliers niveau 2 et 3, charrette, ordres à cours limité au Rialto | Jour 1 |
| 4 | 30 min | La Scuola d'Abaco (savoirs) | Jour 3 |
| 5 | 1 h | **2e chantier en parallèle** ; burchio (bateau de la Brenta et du Pô) | Semaine 1 |
| 6 | 2 h | Charte de Lombardie | Semaine 2 |
| 7 | 4 h | **Choix de l'Arte** | Semaine 3 |
| 8 | 8 h | **Stato da Mar ou Stato da Terra** ; Frioul et Istrie | Mois 1 |
| 9–10 | 12 à 18 h | Marciliana, Romagne et Marches ; l'Arsenal privé et la Dalmatie | Mois 1,5 à 2,5 |
| 11–13 | 1 à 2 j | Cocca ; Allemagne ou Grèce selon le Stato ; Arte mineure | Mois 3 à 5 |
| 14–16 | 2,5 à 3,5 j | Galea grossa, le Levant ; **3e chantier** ; Constantinople et la mer Noire | Mois 7 à 12 |
| 17–19 | 4 à 6 j | Charges de Procuratie ; galère de Flandre, Bruges et Londres ; **4e chantier** | An 1,3 à 2 |
| 20 | 7 j | Couronne de la façade ; Maestria (niveaux infinis) | An 2,5 |

À partir du niveau 8, chaque palier demande un matériau d'une autre région : chêne de Dalmatie, fer, marbre d'Istrie, soie, alun. **La Casa oblige à commercer avec les joueurs des autres routes.**

**À partir de la Casa 9, l'empire doit suivre** (ajout du calibrage, 30 octobre 2026). Bâtir la Casa n demande n − 3 ateliers au niveau n − 1, douze au plus, comme le niveau maître d'Hades' Star. Sans cette exigence, si chaque palier ne coûte que 2 à 7 jours de revenu, les vingt paliers se font en quelques mois. Le vrai frein du milieu et du haut de partie est donc d'élever ses ateliers, dont les chantiers s'allongent jusqu'à 12 jours.

**Coûts calibrés** (ducats, plus les matériaux), au simulateur de 24 mois (`docs/calibration.md`, § Empire ; réglages : `venice1450.empire.ts`) :

| Casa | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Ducats | 50 | 100 | 150 | 400 | 1 000 | 1 600 | 2 500 | 3 800 | 5 500 | 7 500 | 10 000 | 13 500 | 17 000 | 22 000 | 27 000 | 34 000 | 41 000 | 49 000 | 64 000 |

### 3.2 Les ateliers

- **Places** : 4 en Vénétie au départ, +1 aux niveaux 2, 5, 8 et 12 de la Casa. Chaque comptoir de région en ajoute 2 à 4, avec le bonus des matières locales.
- **Niveau maximum** : le niveau de la Casa.
- **Production d'un lot** : Y(n) = n × (1 + 0,15 × (n − 1)) fois la base. Un niveau 20 produit environ 77 fois la base : **des chiffres qui se sentent**.
- **Coût d'un niveau** : base × 1,3^(n − 1), base calibrée à 120 ducats. Le coût croît plus vite que la production : le temps de remboursement passe de moins d'un jour (niveaux 1 à 5) à 3 à 5 semaines (niveaux 16 à 20).
- **Chantier d'un niveau** : de 1 minute (niveau 1) à 12 jours (niveaux 20 et plus).

### 3.3 Le charroi et la flotte

| Véhicule | Ouvert à (Casa) | Capacité | Trajets | Modules | Fabriqué par |
| --- | --- | --- | --- | --- | --- |
| Mule | 1 | 25 | Vénétie, 1 à 3 h | 0 | On l'achète |
| Charrette | 3 | 40 | Vénétie | 1 | On l'achète |
| Burchio | 5 | 90 | Brenta et Pô, 2 à 5 h | 2 | Un atelier |
| Chariot bâché | 6 | 70 | Lombardie, 4 à 6 h | 1 | Un atelier |
| Marciliana | 9 | 150 | Adriatique, 8 à 16 h | 2 | L'Arsenal privé |
| Cocca | 11 | 300 | Dalmatie, Grèce, 1 à 2 j | 3 | L'Arsenal privé |
| Galea grossa | 14 | 500 | Levant, 3 à 5 j | 4 | L'Arsenal privé |
| Galère de Flandre | 18 | 800 | Bruges, 10 à 14 j | 4 | L'Arsenal privé |

**Les galères partent avec la Muda d'État**, à date fixe. Le risque d'un voyage (tempête, corsaires) reste faible et affiché. Il porte sur 3 à 8 % de la cargaison, jamais sur le navire, et il est assurable.

### 3.4 Les comptoirs et les dix régions

Les dix régions, dans l'ordre d'ouverture :
1. Vénétie ;
2. Lombardie ;
3. Frioul et Istrie ;
4. Romagne et Marches ;
5. Dalmatie ;
6. Allemagne (Stato da Terra d'abord) ;
7. Grèce (Stato da Mar d'abord) ;
8. Levant ;
9. Constantinople et la mer Noire ;
10. Flandre et Angleterre.

**Quatre sont ouvertes au lancement** : la Vénétie, la Lombardie, le Frioul et Istrie, la Romagne et les Marches. Les autres s'ouvrent au fil des ères (§ 4.3).

**Ouvrir une région** se fait en trois moments :
1. on achète la charte, en Faveur ;
2. on fait le voyage d'ouverture, qu'on regarde avancer sur la carte ;
3. on bâtit le comptoir.

**Le comptoir** donne des places d'atelier, un **carnet de commandes local**, et un poste pour un membre de la famille.

**Stato da Mar ou Stato da Terra** (Casa 8) est le premier grand choix exclusif. L'autre branche s'ouvre à la Casa 15, avec des chartes deux fois plus chères.

### 3.5 Ce qui rend deux Maisons différentes

- **L'Arte** (Casa 7), une seule, parmi les Lanaioli, les Vetrai, les Speziali, les Arsenalotti et les Banchieri.
  - Elle porte les ateliers de sa chaîne jusqu'au niveau 25 et donne un atelier unique au sommet.
  - On peut en changer, au prix d'un renoncement : ses ateliers retombent au niveau 15.
  - Une Arte mineure s'ajoute à la Casa 13.
- **Les savoirs** : quatre branches (Abaco, Navigation, Arti, Diplomazia), un savoir à la fois (deux à partir de la Casa 12), de 30 minutes à 10 jours. Chaque branche se termine par un **choix exclusif** entre deux capstones. L'arbre entier demanderait plus de trois ans : on choisit.
- **La famille** :
  - Chaque membre a un trait qui donne et qui retire ; le catalogue des Atouts actuel s'y prête.
  - On place un membre par comptoir. Le fattore est le premier agent, et s'améliore.
  - **Une génération par trimestre**, alignée sur l'ère. L'héritier hérite de tout, et la Maison gagne un point d'**Héritage** qui ouvre un trait de lignée permanent. C'est un « prestige » qui ajoute sans rien retirer.

### 3.6 Un seul chiffre : la Puissance

La Puissance est la somme pondérée des niveaux bâtis : Casa, ateliers, comptoirs, flotte, savoirs. **Jamais la caisse.**

Elle sert à **apparier** et à **découper les bandes**. Les noms des bandes sont à figer :
- *Bottega*, *Casa*, *Ca'*, *Palazzo*, *Procuratia* chez l'expert de la progression ;
- *Bottega*, *Casa*, *Ca'*, *Palazzo*, *Fondaco* chez l'expert du méta-jeu.

On l'affiche avec sa courbe depuis le premier jour, par exemple : « Votre Maison a doublé en six semaines ».

## 3 bis. La profondeur : trois métiers et des modules

*Le détail est dans `docs/refonte-2026-10-29/profondeur.md`, qui fait foi pour ces systèmes. Ce qui suit en est le résumé.*

**Trois métiers, trois flottes**, sur le modèle d'Hades' Star (transport, extraction, combat). Chacun a sa boucle et son jeu actif, et un marchand peut se spécialiser :

| Métier | Boucle |
| --- | --- |
| **Le négoce** | Acheter là où c'est bon marché, vendre là où c'est cher, entre des marchés régionaux qui ont chacun leurs prix. Honorer les commandes et les contrats à terme. La valeur d'une cargaison croît avec la distance |
| **L'exploitation** | Des gisements apparaissent sur la carte et s'épuisent (salines, forêts, carrières, mines, pêcheries, alun). On y envoie des équipes ; le premier arrivé et le mieux équipé en tire le plus |
| **Les armes** | Des galères armées et des compagnies de condottieri pour escorter, chasser les corsaires et partir en expédition |

**Les modules.** Chaque navire, équipe ou compagnie a des emplacements par type, ouverts par son niveau :
- les modules de **négoce** : cale, voilure, débarquement prompt, courrier, comptoir flottant, prime de convoi, pavillon neutre, portulan, lettre de change, rappel ;
- les modules d'**exploitation** : rendement, grande campagne, concession lointaine, prospection, gestion durable, charrois ;
- les modules d'**armes** : armes, défense, soutien.

Chaque module va du niveau 1 au niveau 10. On le **recherche** une fois, à la Scuola ou à l'Arsenal privé :
- une place de recherche, deux à la Casa 12, trois à la Casa 18 ;
- de 30 minutes à 10 jours ;
- des ducats, puis des **plans** à partir du niveau 4.

Plus de quarante modules sur dix niveaux : on ne maximise jamais tout. **Le choix des modules fait l'identité de la Maison.**

## 3 ter. Les expéditions à paliers et les reliques

- **L'expédition** (l'équivalent des Red Stars) :
  - une partie coopérative de 1 à 5 Maisons, en direct (10 à 15 minutes) ou en différé sur 24 h ;
  - **paliers 1 à 12**, ouverts par le palier précédent et le niveau de sa galère armée ;
  - les lieux : la côte barbaresque, les épaves ioniennes, la route de Tana, les ruines de Byzance, les caravanes du Sinaï.
- **Les reliques** (portulans, codex, objets d'art, pièces d'armes) :
  - elles se **déchiffrent** à la Scuola, de 1 h à 2 jours, en plans de modules, en plans de savoirs, en ornements du palais ;
  - elles se **vendent au Rialto** : un marché des reliques ;
  - le palier fixe leur qualité.
- **La partie rapide** (l'ancienne Condotta, l'équivalent des Blue Stars) : de 4 à 5 joueurs en direct, à armes égales. Elle rend quelques Sceaux.

## 3 quater. Des marchés vivants et la colleganza

- **Un marché par région**, avec sa propre offre et sa propre demande. L'arbitrage entre régions est le métier du négociant.
- **Les nouvelles voyagent à la vitesse des navires.**
  - On connaît en direct les prix des régions où l'on a un comptoir.
  - Ailleurs, on ne connaît que le dernier prix rapporté, **daté** : par ses convois, une rumeur ou un associé.
  - Le portulan, le Courrier de compagnie et les comptoirs réduisent ce retard. **L'information est une ressource.**
- **Les crises** (tempête, peste, guerre, récolte) déplacent les prix, annoncées par des rumeurs plus ou moins fiables.
- **Les contrats à terme** : livrer telle quantité à tel port dans N jours, à prix fixé, adossés au séquestre.
- **La colleganza** : un investisseur finance la cargaison d'un voyageur. Au retour, le bénéfice se partage, par exemple trois quarts pour l'investisseur et un quart pour le voyageur.
  - Le partage est automatique, au grand livre, et une perte se partage aussi.
  - La réputation du voyageur est publique.
  - **Le vétéran investit dans les voyages des nouveaux**, et les deux y gagnent.

## 3 quinquies. Le personnel

Ce sont les « héros » du jeu, à collectionner et à faire grandir, du niveau 1 au niveau 30, avec un choix de compétence à chaque palier :

| Rôle | Où | Effet |
| --- | --- | --- |
| **Capitaine** | Un navire | S'ajoute aux modules : vitesse, prix d'escale ou risque |
| **Maître artisan** | Un atelier | La qualité des produits et le rendement |
| **Facteur** | Un comptoir | Automatise le routinier, rapporte les prix |
| **Condottiere** | Une compagnie armée | Tactique en escorte et en expédition |
| **Ambassadeur** | Une cour étrangère | Chartes moins chères, avance sur les nouvelles |

- On les recrute par la famille (§ 3.5), par l'embauche ou par une relique rare (un personnage historique).
- Ils ont une rareté (commun, rare, illustre), et **aucun ne se vend**.
- Les places sont limitées par la Casa : **on compose**.

**La production gagne aussi en profondeur** :
- trois qualités (ordinaire, fine, exquise), la cour payant l'exquise trois fois plus ;
- des modules d'atelier ;
- des **voisinages** : deux ateliers qui se suivent dans une chaîne, placés côte à côte, se donnent un bonus. La disposition du comptoir devient un petit puzzle ;
- des recettes alternatives selon les intrants de la région.

## 3 sexies. Un monde qui se découvre et qui menace

- **Le brouillard** : chaque région est faite de zones à explorer. On y découvre des gisements, des ports francs, des épaves, et des marchés cachés qui ne vendent qu'aux découvreurs pendant une semaine.
- **Les menaces non joueurs**, l'équivalent de Cerberus : corsaires barbaresques, Uscoques, pirates catalans, puis les flottes ottomanes.
  - Elles patrouillent **les routes lointaines seulement**, plus fortes à mesure qu'on s'éloigne.
  - Un convoi mal escorté perd **une part de sa cargaison, jamais le navire**.
  - Les vaincre rapporte des reliques et du butin.
- **Les ports francs** : des relais neutres où une compagnie bâtit un comptoir partagé.

## 3 septies. Ce qui s'ouvre, palier par palier

La profondeur s'ouvre progressivement, chaque fois avec un objectif du guide :

| Casa | Ce qui s'ouvre |
| --- | --- |
| 1–3 | Le négoce simple en Vénétie, le Rialto |
| 4 | La Scuola, les modules de négoce 1 à 3, le premier capitaine |
| 5 | Le 2e chantier, le burchio, **l'exploitation** |
| 6 | La Lombardie : un second marché, les nouvelles datées |
| 7 | L'Arte, les modules d'atelier, les qualités, les maîtres |
| 8 | Le Stato, les contrats à terme |
| 9 | **Les armes**, l'Arsenal privé, les corsaires de l'Adriatique |
| 10 | **Les expéditions**, paliers 1 à 3, les reliques |
| 11 | **La colleganza**, les ambassadeurs |
| 12 | La 2e place de recherche, Allemagne ou Grèce, le brouillard des zones |
| 14+ | Le Levant, les paliers 4 à 9, les ports francs |
| 18+ | La Flandre, les paliers 10 à 12, la 3e place de recherche |

## 4. Le rythme

### 4.1 Trois horloges, une tournée

- **Trois horloges** :
  - la récolte, en heures ;
  - le chantier, de quelques minutes à 7 jours, 2 à 4 en parallèle ;
  - l'ambition, en semaines : une région, une galère, une charge.

  En ouvrant le jeu, on trouve toujours une horloge arrivée à terme. **À tout moment, trois objectifs visibles à moins d'une semaine, sur trois axes** (écran « Prochains paliers »).
- **Les chantiers avancent la nuit.** La **file de production couvre 12 h**, pour tous, et ne se vend jamais.
- **La tournée de 5 minutes**, où chaque session contient une vraie décision :
  1. tout ramasser et relancer ;
  2. lire les nouvelles du jour : les prix datés des autres régions, les crises annoncées ;
  3. décider d'une route : sa cargaison, ses modules, son escorte ;
  4. envoyer une équipe sur un gisement frais ;
  5. financer une colleganza, lancer une recherche, déchiffrer une relique ;
  6. un geste pour un associé ;
  7. le soir, une expédition.

  Un exemple complet est au § L de `profondeur.md`.

  On joue bien avec deux tournées par jour ; l'assidu gagne des **occasions**, pas un multiplicateur.

### 4.2 Sans culpabiliser

- **Supprimés** : le coffre quotidien et sa série, les tâches du jour, les produits frais, le bonus de retardataire.
- **Le Carnet de la semaine** les remplace : 10 à 12 objectifs à remplir n'importe quand du lundi au dimanche, et deux à rattraper de la semaine précédente.
- **Le retour du marchand** : après une absence, un résumé (Annales, compagnie, prix) et un vent en poupe (les objectifs du Carnet comptent double pendant 3 jours après 7 jours d'absence).

### 4.3 Le calendrier

| Échelle | Ce qui s'y passe |
| --- | --- |
| **Jour** | 8 h le Broglio et la Lettre ; les vagues de commandes ; la Condotta de compagnie à midi (fenêtre, pas obligation) ; **20 h la Sera** (incanto, bataille de la Terraferme) ; minuit, la Signoria |
| **Semaine** | Lundi : nouvelle Terraferme, nouveau Carnet, nouvelles Sfide. Jeudi : inscription des rosters de Contesa. Dimanche : clôture et le Gazzettino (palmarès, promotions de bande) |
| **Mois** | Un **chapitre** : l'élection du Doge (son décret vaut le mois suivant) et une **foire** (la Sensa, le Carnaval…) avec un objectif commun à paliers |
| **Trimestre** | Une **ère historique** : 1450 les comptoirs, 1451 la guerre de Lombardie, 1452 l'ouverture du Levant, 1453 la chute de Constantinople, puis la paix de Lodi… Chaque ère ouvre du contenu pour tous (une région, une chaîne, une route) et rebat les prix par un événement, sans rien effacer. Annoncée trois mois à l'avance |

## 5. L'économie sans reset

### 5.1 Sources et puits

| Sources de ducats | Part visée | Puits | Part visée |
| --- | --- | --- | --- |
| Commandes des villes (carnets locaux et tableau commun) et **arbitrage entre marchés régionaux** | ≈ 70 % | Constructions (Casa, ateliers, comptoirs, navires) | ≈ 55 % |
| Ventes à la Dogana | ≈ 10 % | **Salaires sur les recettes** | ≈ 15 % |
| Contrats de l'État (Doge, Muda, Grandes Œuvres) | ≈ 15 % | Taxes : Rialto 3 %, gabelles lointaines 5 à 10 %, péages | ≈ 12 % |
| Terraferme, Lettres, butin des corsaires | ≤ 5 % | Recherche des modules et savoirs | ≈ 8 % |
| | | Assurances, Grandes Œuvres, palais, Maestria, cosmétiques en ducats | le reste |

Ces ducats passent seulement d'un joueur à l'autre, ils ne créent ni ne détruisent de monnaie : la **colleganza** (partage du bénéfice), les **contrats à terme** et le **marché des reliques**. Ils passent par le séquestre et le grand livre, comme le Rialto.

### 5.2 Les salaires (arbitrage A)

C'est le frein des grosses Maisons. **Une part de chaque recette part en salaires du comptoir** : environ 3 % pour une petite Maison, 20 à 25 % pour un empire de Casa 18.

Le prélèvement est :
- **pris sur les recettes, jamais sur la caisse** ;
- **jamais pendant l'absence** : qui ne vend pas ne paie rien ;
- jamais sous zéro, et il ne détruit rien ;
- lisible : « Salaires : −1 240 d sur 6 200 d de ventes ».

**La décime** reste en réserve : un impôt vénitien sur la trésorerie qui dort au-delà d'un seuil élevé. On ne l'active que si la masse monétaire s'emballe au simulateur.

### 5.3 Les prix et l'inflation

- Les prix des villes restent **ancrés à la référence**, entre 60 et 150 %.
- **La Dogana** vend au plafond et achète au plancher : elle régule.
- L'indicateur principal est un **indice des prix**, cible 80 à 130 sur 24 mois.
- Le ratio entre puits et sources est suivi **par cohorte** : 0,6 à 0,8 avant 3 mois, 0,9 à 1,0 au-delà.
- Les entrepôts ont une capacité. Le pain stocké se gâte (−2 % par jour après 3 jours) : c'est un plafond de stockage, pas un coût d'absence, car rien ne pourrit dans une file ni dans un atelier.

### 5.4 Trois monnaies, pas plus

| Monnaie | Se gagne | S'achète | Sert à |
| --- | --- | --- | --- |
| **Ducats** | Le commerce | Jamais contre de l'argent réel | Tout ce qui est économique |
| **Faveur** (l'Influence refondue) | En servant l'État : commandes du Doge et de la Signoria, Grandes Œuvres, Terraferme | Jamais | Chartes de région, voix, candidatures, accélération plafonnée d'un chantier (3 par jour, coût croissant) |
| **Sceaux** (rares) | La coopération (Condotta, Expédition, Contesa) et la Terraferme. Ils absorbent les trophées | Jamais | Agents, plans de manufacture, sidegrades de guerre, cosmétiques. **Jamais du rendement brut** |

## 6. Nouveaux et anciens

Le point où un jeu persistant se gagne ou se perd. Les parades se cumulent :

1. **Les bandes** de Puissance pour toute compétition : Sfida, classements, Sera (un lot par bande), Terraferme par théâtres, Condotta, Expédition, Contesa.
2. **Une demande privée par comptoir** : un carnet local que personne d'autre ne prend.
3. **Des commandes réservées** : les petites commandes de Vénétie (moins de 30 unités) sont réservées aux Maisons de Casa 10 ou moins.
4. **Le nouveau est utile au vétéran**, qui achète ses matières brutes. Jusqu'à la Casa 8, les bruts rapportent +20 %.
5. **Le savoir circule** : un niveau de Casa ou d'atelier que plus de 35 % des Maisons actives possèdent coûte jusqu'à 60 % moins cher et se bâtit jusqu'à 70 % plus vite (calibré ; le cadrage disait la moitié, 50 % et 60 %). Le sommet n'est jamais rabaissé.
6. **La protection** : 30 jours, tant qu'on reste dans la première bande. Le nouveau ne peut être visé ni par un espion, ni par une rumeur, ni par un front d'une bande supérieure. Il ne paie pas de droit de porte.
7. **L'apprentissage** (*garzone*) : un nouveau se place chez une Maison qui accueille. Le maître gagne des Sceaux à chaque jalon de l'apprenti ; l'apprenti voit sa production achetée au prix de référence pendant 14 jours.
8. **Aucun pillage** de ce qui est bâti, hors de la Terraferme.

**Cible** : un nouveau dans un monde d'un an atteint la Puissance médiane en **4 à 6 mois**, sans jamais rattraper les dix premiers par le seul rattrapage.

**Les inactifs** :
- à 7 jours, ils quittent les rôles de compagnie ;
- à 14 jours, la Maison **s'endort** : elle sort des cartes et des appariements, et ne produit plus au-delà d'une file pleine ;
- à 30 jours, son emplacement du Grand Canal est **mis en location** (le bien reste à elle) ;
- au retour, tout se réveille.

**Les mondes** : un seul monde par langue tant que possible, car la liquidité du Rialto prime. On n'ouvre un monde jeune que sur un signal mesuré.

## 7. Le social : la Compagnia en amplificateur (arbitrage B)

**L'empire se joue entièrement seul**, et l'interdépendance passe par le marché. La compagnie **démultiplie** : elle porte le meilleur contenu sans être obligatoire.

- **Forme** : 5 à 25 associés (30 avec le fondaco de compagnie au maximum).
  - Rôles : *Capo*, deux à quatre *Consiglieri*, *Cassiere*. Des vocations affichées, sans bonus.
  - **Succession automatique** : un Capo absent 7 jours cède sa place.
  - Une compagnie à la fois, 3 jours d'attente pour en changer.
- **L'entraide** : toutes les 8 h, chaque associé peut demander un lot d'un bien ; un autre le fournit en un geste.
  - C'est une **vente au prix de référence**, inscrite au grand livre et au journal des stocks, sans taxe du Rialto. Le fournisseur gagne en plus du Mérite.
  - Plafonds contre les doubles comptes : rien avant 3 jours d'ancienneté, un volume par jour et par compte.
- **Le contenu coopératif** :
  - **la Condotta**, à la Red Star : une partie en direct de 10 minutes, 1 à 4 associés, paliers 1 à 12 ;
  - **l'Expédition** : une galère de compagnie vers Bruges, Alexandrie ou Constantinople, chargée à plusieurs, trois jours de voyage avec une décision par jour, difficulté par palier ;
  - **le fondaco de compagnie** : un grand puits de matériaux qui ouvre des options communes plafonnées, **jamais de rendement de production**.
- **La Contesa** (arbitrage C) : la guerre de compagnies sur le moteur de la Terraferme, **une semaine sur deux**.
  - Chaque compagnie inscrit un roster de 5, 10 ou 15 associés, apparié par la somme de leurs Puissances, à la White Star.
  - La guerre mange les marchandises des associés ; les non-inscrits ravitaillent par l'entraide.
  - Elle rapporte des Sceaux, une pièce du fondaco, le Lustre de compagnie et le blason sur les villes tenues.
- **Ce que la profondeur lui ajoute** (`profondeur.md`, § I) :
  - le **Courrier de compagnie**, qui partage les prix de tous les comptoirs des associés ;
  - un **comptoir de compagnie** dans un port franc lointain ;
  - les **expéditions de compagnie**, aux paliers 7 à 12 ;
  - une **colleganza de compagnie**, un fonds commun qui finance les voyages des associés.
- **La réputation** : des contrats de fourniture de longue durée et une réputation publique de marchand (les contrats honorés). Le roulage, c'est-à-dire confier une cargaison à la mule d'un autre.

## 8. La Terraferme, seule en saisons courtes

- **Une partie d'une semaine**, du lundi au dimanche, qui repart de zéro. Les semaines alternent :
  - les semaines impaires, chacun pour soi avec des alliances ;
  - les semaines paires, la Contesa.
- **À armes égales**, quel que soit le niveau de la Casa. L'appariement se fait par la cote de la Terraferme (Elo), en **théâtres** de 20 à 40 marchands par bande.
- **L'empire paie l'entrée en marchandises** : pain, briques, planches. Une **ration journalière égale pour tous** plafonne l'avantage des riches, et les petites Maisons reçoivent une ration de la République.
- **Ce qu'elle rapporte au permanent** est plafonné à 10 à 15 % de la progression hebdomadaire d'un joueur médian :
  - de la Faveur ;
  - des Sceaux (2 trophées par semaine au plus) ;
  - des sidegrades de guerre, jamais plus forts ;
  - les bannières sur la façade ;
  - le décret du Signore de la semaine ;
  - le grade honorifique.

  **Jamais de rendement de production.**
- Les règles d'une semaine restent stables pendant la semaine : un changement prend effet le lundi suivant.

## 9. La politique et le haut niveau

| Institution | Accès | Pouvoir |
| --- | --- | --- |
| **Charges de région** : Podestà (Vénétie), Console d'Alexandrie, Bailo de Constantinople, Capitano de la Muda | La Signoria de sa région, donc entre joueurs du palier qui y commercent ; 3 villes au plus, villes de départ disputables par les débutants | Droit de porte, avance sur les commandes |
| **Grand Conseil** | Patrizio et au-dessus (le *cursus honorum*) | Vote l'œuvre publique de la foire |
| **Sénat** | Les 30 premiers du *cursus*, plus un siège par compagnie de premier rang | Présente les candidats au Doge |
| **Doge** | Élu chaque mois, sans réélection consécutive (3 mois d'attente) | Le décret du mois suivant, son portrait, sa ligne aux Annales |
| **Conseil des Dix** | Tiré au sort chaque mois parmi les Senatori actifs | Annuler le décret suivant, démasquer un espion |
| **Procurateur** | Casa 17, élu par trimestre | Une charge de prestige et une voix |

**Le sommet reste ouvert** :
- **les Grandes Œuvres** (la Basilique, l'Arsenal, le pont du Rialto) : des chantiers communs à niveaux infinis, qui changent le monde pour tous, avec la plaque des donateurs ;
- **la Maestria** : des niveaux d'atelier infinis, à +1 % chacun ;
- **le palais** : des étages de pure vanité ;
- **le Grand Canal** : 40 emplacements devenus de l'**immobilier persistant**, acquis aux enchères de fin d'ère et perdus seulement par la vente ou une longue inactivité ;
- **les parts de Maison** : sans rachat forcé, une vraie bourse ;
- **les Annales de Venise** : une page publique écrite par le serveur à partir des événements, sans texte libre. C'est l'outil d'acquisition d'un monde ancien.

## 10. La monétisation

**On ne vend jamais** :
- de ducats, de ressources ou de Sceaux ;
- de temps (accélération) ;
- de chantier en plus ni de file plus longue ;
- de troupes ;
- aucun avantage dans les bandes, à la Terraferme ou à la Contesa.

Les cosmétiques de rang (corno du Doge, façade de Procurateur) se méritent, ils ne s'achètent pas.

| Offre | Contenu |
| --- | --- |
| **Abonnement** (le Pass Négociant, refondu) | De l'information et du confort : historique des prix, alertes, tableau de bord étendu, préréglages de file (le même geste, plus confortable, jamais plus long). Une façade ou une bannière par mois, à garder |
| **Mécénat de compagnie** | Un associé offre l'abonnement à 5 ou 10 associés pour un mois. L'acte se voit aux Annales de la compagnie |
| **Cosmétiques** | Façades et étages décoratifs, gondoles, bannières de compagnie, portraits, sceaux de lettre |

Un rapport public dit ce qui a été vendu.

## 11. Ce qui change dans l'existant

| Système actuel | Décision |
| --- | --- |
| Saisons d'un mois civil, reset le 1er | **Supprimées** pour le commerce. Le mois est un chapitre, le trimestre une ère |
| Ateliers 1–5, manufactures 6–10, palazzo, chaînes de luxe | Fondus dans la Casa 1–20 et les ateliers 1–20 |
| Maîtrises (4) | Deviennent les Arti (5, exclusives, persistantes) |
| Fondaci, privilèges d'Influence | Deviennent les comptoirs de région et leurs chartes |
| Atouts hebdomadaires | Deviennent les traits du personnel (§ 3 quinquies) et de la famille |
| Dynastie et héritier | Gardée : une génération par trimestre, l'Héritage, la famille comme agents |
| Influence, missions de la Maison | Deviennent la Faveur et les commandes de la Signoria (dans le Carnet) |
| Classement mensuel des ventes nettes | Supprimé en absolu, remplacé par des classements **par bande** (croissance, livraisons) et la Puissance |
| Lustre et Sfida | Gardés, par bande ; le Lustre décroît doucement à chaque ère |
| Grand Canal (40 palais) | Devient de l'immobilier persistant |
| Doge, Signoria, Broglio, Sera, Muda, parts de Maison | Gardés et prolongés. La Sera vend aussi des places dans la Muda |
| Lettre du jour | Devient un feuilleton sans fin, en arcs, avec mémoire |
| Coffre, série, tâches du jour, produits frais, ballots, bonus de retardataire | Supprimés, au profit du Carnet de la semaine et du « savoir circule » |
| Guildes (2 à 6 amis) | Deviennent la Compagnia (§ 7) |
| Condotta | Devient la **partie rapide** (§ 3 ter). Les paliers 1 à 12 passent aux **expéditions** |
| Fattore | Devient le **facteur**, le premier personnel, qui automatise le routinier |
| Pass Négociant | Refondu en abonnement d'information et de confort (§ 10). La règle « écart ≤ 5 % au simulateur » disparaît avec les saisons |
| Refonte UX (lots 1 à 8 faits) | Les acquis restent : barre à 5 onglets, Lagune, feuilles, un seul or. **Le lot 9 est suspendu**, car ses écrans seront repensés pour ce modèle |

## 12. Technique : ce qui reste, ce qui bouge

**Reste**, sans changement :
- les montants en entiers (deniers) et les taux en points de base ;
- le grand livre en partie double et le journal des stocks, avec leurs six invariants ;
- `world_id` sur la couche monde et `theme_id` sur le référentiel ;
- le moteur pur dans `packages/engine`, utilisé à l'identique par le serveur et le simulateur ;
- la production calculée à la lecture ;
- une transaction par opération de marché, avec un verrou par (monde, ressource) ;
- les paramètres dans `worlds.settings` ;
- la stack, PGlite en développement et Railway en production.

**Bouge** :
- `worlds.ends_at` ne borne plus le commerce. **Seule la Terraferme a des semaines** (son propre calendrier).
- **Les chantiers** se calculent à la lecture, comme la production : fin = début + durée, avec une file de chantiers par Maison.
- **Les salaires** s'écrivent au grand livre à chaque vente, sur un compte système de destruction.
- **Les régions, les chartes, les ères et leur calendrier** vivent dans `worlds.settings`.
- **La bascule** se fait par un dernier reset (la Casa 1 pour tous), puisqu'il n'y a pas encore de joueurs. Ce qu'on reprend :
  - l'Influence, convertie en Faveur un pour un ;
  - le Lustre ;
  - les portraits de la Dynastie, qui deviennent des ancêtres.

## 12 bis. Arbitrages du 30 octobre 2026 (après le premier calibrage)

1. **Le nouveau se mesure dans sa bande.** La cible « un nouveau dans un monde d'un an atteint la Puissance médiane en 4 à 6 mois » devient : « il atteint la Puissance médiane de sa bande en 4 à 6 mois ». C'est cohérent avec la règle d'or 4 : toute compétition se joue par bande.
2. **Les recettes de haut niveau demandent des bruts de Vénétie en quantité.** Au-delà du niveau 12, un atelier et les grands ouvrages consomment plus de bruts (blé, argile, bois, sel) qu'un vétéran ne peut en produire. Il les achète donc au Rialto, où vendent les jeunes Maisons, et le jeune devient utile au vétéran.
3. **Les places de la Muda se gagnent cher.** Les grandes galères (galea grossa, galère de Flandre) ne partent qu'avec la Muda d'État. Leurs places s'achètent à l'incanto du soir, et les cargaisons de luxe (épices, soie) valent des semaines de revenu. On s'associe pour remplir une place : la colleganza vit de là.

**Dans le simulateur** (calibration.md, § Empire persistant) :
- le nouveau est comparé chaque jour à la médiane des Maisons plus anciennes de sa bande ;
- dès le niveau 12, chaque unité faite mange 5 % d'une unité de brut de Vénétie par niveau à partir de 12 ;
- la galea et la galère de Flandre ne partent qu'avec une place de la Muda. Il y a deux incanti par semaine et des places pour la moitié des armateurs. L'enchère est de Vickrey, avec une réserve d'un jour de revenu, et le prix est détruit. Le gagnant à court de caisse lève le reste en colleganza sur son convoi.

## 13. Le chemin

Chaque étape fait l'objet d'un plan, validé avant le code.

1. **Ce cadrage**, puis `CLAUDE.md` mis à jour.
2. **Le simulateur de 24 mois**, avant toute calibration : des cohortes arrivent aux mois 0, 3, 6 et 12.

   | Mesure | Cible |
   | --- | --- |
   | Temps jusqu'à chaque palier de Casa | Proche du § 3.1 ; les cohortes tardives 20 à 40 % plus vite |
   | Objectif à moins de 24 h pour un joueur médian | Toujours |
   | Prochain palier de Casa, en jours de revenu | 2 à 7 |
   | Nouveau à la Puissance médiane de sa bande (§ 12 bis) | 4 à 6 mois |
   | Indice des prix | 80 à 130 sur 24 mois |
   | Ratio entre puits et sources | 0,6–0,8 avant 3 mois, 0,9–1,0 au-delà |
   | Part de la Terraferme dans la progression | ≤ 15 % |
   | Bruts des jeunes Maisons vendus à Venise (§ 12 bis), en part de leurs recettes | ≥ 10 % (proposé ; la part des vétérans, ≥ 30 % au départ, est hors de portée avec des cohortes par paquets) |
   | Écart de prix entre régions (arbitrage) | Assez pour payer le voyage, jamais assez pour rendre les commandes inutiles |
   | Part des Maisons qui vivent surtout d'un seul métier | ≥ 30 % (la spécialisation est viable) |
   | Convois de la Muda financés en colleganza (§ 12 bis) | ≥ 20 % |

   Le simulateur modélise aussi les marchés régionaux et le retard des nouvelles, les modules (en multiplicateurs), l'exploitation des gisements, les expéditions (en boîte noire de reliques) et la colleganza.

3. **Le socle**, jouable seul en Vénétie :
   - la fin du reset ;
   - la Casa 1–20, les ateliers 1–20, les chantiers en parallèle ;
   - les salaires ;
   - la Puissance et ses bandes ;
   - le Carnet de la semaine ;
   - la file de nuit de 12 h ;
   - les Maisons endormies.
4. **L'étendue et le négoce** : les comptoirs, la Lombardie et le Frioul, les marchés régionaux et les nouvelles datées, le chariot et le burchio, les modules de négoce et la recherche ; l'exploitation des gisements.
5. **L'identité** : l'Arte, les savoirs, le personnel et la famille, les qualités et les voisinages d'ateliers.
6. **La compagnie** : rôles, succession, entraide, Condotta à paliers, puis la Contesa et les théâtres de la Terraferme.
7. **La mer et les armes** : la Dalmatie, l'Arsenal, les navires à modules, la Muda des joueurs, les corsaires ; puis les expéditions et les reliques, et la colleganza.
8. **Les ères et les Annales**, la politique étendue, le Grand Canal en immobilier, le Levant.
9. **La refonte visuelle et des interactions**, qui suit chaque étape : la carte qui s'étend, la façade qui monte, les trois flottes et leurs emplacements de modules, les convois, la carte d'expédition.
