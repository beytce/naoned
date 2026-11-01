# Audit de profondeur : l'acharné et le joueur du dimanche (1er novembre 2026)

*Demande du porteur : s'imprégner de toute l'expérience de joueur de Hades' Star (ce qu'on y fait, à quel rythme, ce qui le rend profond), puis proposer ce que Fondaco peut en tirer pour que les joueurs acharnés y trouvent leur bonheur, sans fermer le jeu aux joueurs occasionnels.*

*Ce document est un audit et une liste de propositions. Rien n'est décidé. Chaque proposition retenue suivra le chemin habituel : un plan validé, les tests du moteur d'abord, le simulateur de 24 mois et `docs/calibration.md`. Ce qui n'est pas retenu va dans `IDEAS.md`.*

---

## 0. Méthode et limites

- **Les sources lues en direct** : aucune. Le réseau de la session refuse `hades-star.fandom.com`, `steamcommunity.com`, `blog.hadesstar.com` et les miroirs de Reddit. Pour vérifier les chiffres, il faut autoriser ces domaines dans les réglages réseau de l'environnement.
- **Ce qui a servi** :
  - les quatre recherches du 1er novembre (`docs/hades-star/01` à `04`), qui couvrent déjà les mécaniques en détail ;
  - de nouvelles recherches orientées vers **l'expérience du joueur** : les conseils des vétérans, les outils de la communauté, les plaintes, les succès ;
  - une lecture du code actuel de l'empire (`packages/engine/src/empire/`, `apps/web/src/empire/`) et du cadrage (CADRAGE-v3).
- **Ce que ce document n'est pas** : une nouvelle description des modules ou des Cerberus. Pour cela, voir `docs/hades-star/`. Ici, on regarde **qui joue, comment, et pourquoi il reste**.

---

## 1. Le verdict en une page

**Hades' Star tient deux publics avec un seul jeu.** Le joueur occasionnel passe trois fois par jour : il envoie ses cargaisons, fait une étoile rouge facile et touche le revenu garanti des étoiles bleues. Le joueur acharné joue au même jeu, avec les mêmes gestes, mais il :
- optimise chaque couche d'une même action (livrer : modules, drone, relais, planète de stockage, lignes de saut) ;
- compose un équipement sous contrainte (places typées, plans rares, on ne maximise jamais tout) ;
- choisit le risque (étoiles rouges sombres) ;
- coordonne une corporation (étoiles blanches, événement rouge, étoiles quantiques) ;
- construit ses propres outils (un bot Discord qui suit les modules des associés, des cartographes d'étoile blanche, des calculateurs).

**La recette** : un **plancher bas** (un geste simple suffit à progresser) et un **plafond haut** (le même geste peut se faire beaucoup mieux, et ça se voit).

**Fondaco a déjà le plancher**, et les bonnes règles : rien ne se perd, l'absence ne coûte rien, la compétition se joue par bande.

**Il lui manque surtout le plafond.** Depuis la décision « un seul métier » (1er novembre), le cœur du jeu est la livraison saut par saut. Or :
1. **La compétence ne paie presque pas.** La paie d'une unité dépend de la ville et de la distance, pas de la façon de livrer. Le seul talent récompensé est de ne pas laisser les vagues déborder. Les bonus de tournée sont écartés depuis le chantier 1.
2. **Il n'y a plus de classement du commerce.** Il a été retiré avec les ventes, « on y réfléchira plus tard » (`IDEAS.md`). L'acharné n'a plus d'échelle où se mesurer, sauf les reliques de la Porta.
3. **Il n'y a aucun chiffre pour optimiser.** Pas de revenu par véhicule ni par heure, pas d'historique, pas de décomposition d'un prix. On ne peut pas s'améliorer sans mesure.
4. **Les choix de build pèsent peu.** Six modules de commerce, gratuits et instantanés à monter, sans contrepartie : il y a souvent une bonne réponse, et on la trouve vite.
5. **Le social est en temps réel ou en échange de lots.** Il manque le coopératif **asynchrone et à fenêtre**, que Hades' Star a dû inventer (événement rouge, étoiles quantiques) après l'usure des étoiles blanches.

**Les cinq propositions qui comptent le plus** (détail au § 5) :

| # | Proposition | Pour l'acharné | Pour le joueur du dimanche |
| --- | --- | --- | --- |
| A2 | **La tournée suggérée et sa note** | Battre la suggestion à la main ; une note sur 100 | Un bouton « Tracer » qui fait 85 % du chemin |
| E2 | **Les chiffres dépliables** | Chaque prix décomposé : base, taille, distance, modules, savoirs | Rien ne change s'il ne touche pas |
| D1 | **Le Libro d'oro** : classement de la semaine par bande, sur le rendement, et des records | Une échelle juste, où le petit bat le gros | Une saison qui récompense la régularité, pas le rang |
| B1 | **Des modules à double tranchant** | Des builds, et pas une réponse évidente | Le montage automatique reste |
| F1 | **La Grande Commande de compagnie**, un week-end par mois | De la logistique à vingt | Une tournée suffit pour toucher sa part |

---

## 2. Hades' Star vu par le joueur

### 2.1 Ce qu'on y fait, par horizon de temps

| Horizon | Joueur du dimanche | Joueur acharné |
| --- | --- | --- |
| **30 secondes** | Ouvrir, voir que tout tourne, refermer | Vérifier qu'aucun stock de crédits n'est au plafond, relancer un chantier qui vient de finir |
| **5 minutes** (2 à 4 fois par jour) | Charger les cargaisons, les envoyer ; lancer une étoile rouge privée de bas niveau | Faire passer ses cargaisons par un **drone de livraison** et une **planète de stockage**, avec les trois modules de commerce au maximum ; « drone shipping » est, selon les vétérans, la meilleure façon d'augmenter son revenu |
| **Une soirée** | Quelques étoiles bleues : le revenu garanti tombe même sans victoire | Des étoiles rouges de haut niveau à plusieurs, en vocal ; des étoiles **rouges sombres**, où l'on peut perdre ses vaisseaux pour progresser plus vite |
| **Une semaine** | Des objectifs, une recherche lancée | Planifier les chantiers pour ne jamais buter sur le **plafond de stockage** des crédits ; le timing des niveaux de planète |
| **Un mois** | La saison des étoiles bleues récompense qui a joué régulièrement | **L'événement rouge de corporation** : 48 heures, un week-end, seules les étoiles privées comptent, la corporation entière pousse |
| **Cinq jours, quand la corporation le décide** | Prêter un transport ou un mineur | **Les étoiles blanches** : 10 contre 10, le temps ralenti, la **Machine à remonter le temps** pour simuler les combats et partager le plan |
| **Une année et plus** | Monter ses planètes | Monter le scanner rouge (le niveau 12 demande des années ; un vétéran estime « environ 6 ans » pour un joueur RS11), monter ses modules au niveau 15 avec des plans rares, tous les succès (« plus de 750 jours ») |

### 2.2 Ce qui fait sa profondeur

1. **Une même action, plusieurs couches.** Livrer, c'est d'abord toucher une planète. Puis on apprend les modules (Trade Boost, Trade Burst), le drone qui donne un bonus par nombre de cargaisons livrées à une même planète, les stations de commerce qui paient plus (« faites une station à trois places de commerce dès que possible », conseille un joueur), les lignes de saut entre les planètes du centre et chaque côté de la carte. **Le casual n'a besoin d'aucune de ces couches. L'acharné les empile.**
2. **Des places rares et typées.** Un cuirassé a une arme, un bouclier, de une à quatre places de soutien. Les plans viennent du PvE. On ne peut pas tout avoir : **le build est une identité**.
3. **Le risque choisi.** L'étoile rouge sombre est ouverte à une minorité, qui accepte la perte définitive contre plus de gains. Le mode normal ne détruit plus un vaisseau tombé au combat depuis 2023.
4. **L'information est une compétence.** Le Shipment Computer affiche les cargaisons par destination. La Machine à remonter le temps des étoiles blanches simule l'issue d'un combat. Le joueur qui lit mieux joue mieux.
5. **Des échelles très longues et visibles.** Le niveau du scanner rouge borne l'Influence, donc le classement. Les succès Steam (coloniser 16 planètes, monter une planète très haut) sont rares et lents.
6. **La corporation.** Elle fait cohabiter des styles très différents. Avec les étoiles quantiques (octobre 2026), elle échange et donne des artefacts, et partage des replays de combat.
7. **La communauté construit des outils.** Le bot « Compendium » suit les modules de chaque joueur et de ses associés, prépare les rosters d'étoile blanche et les files d'étoile rouge. Des cartographes d'étoile blanche existent sur GitHub. **Quand des joueurs écrivent des outils, c'est que les chiffres du jeu valent d'être calculés.**

### 2.3 Ce qui le rend accessible

- Tout est **asynchrone** et se joue en quelques minutes, sur téléphone comme sur PC.
- Les artefacts sont **instanciés** : on ne vole jamais un coéquipier.
- Le revenu garanti des étoiles bleues, **même sans victoire**, et des saisons qui récompensent **tous ceux qui ont joué régulièrement**, pas seulement les premiers.
- Les appariements par niveau : on affronte des joueurs de sa taille.

### 2.4 Ce qui le fait détester

- **La lenteur** : des chantiers de 7 à 10 jours, des années pour le sommet, un jeu « bridé par le temps », et l'accélération vendue (« pay-to-rush »).
- **Les étoiles blanches** : on se réveille sur un désastre parce que l'adversaire jouait la nuit. Cinq jours d'attention, à vingt.
- **Le piège** : des modules qui mangeaient l'hydrogène, sans retour possible. Les développeurs l'ont reconnu en 2022.
- **La perte non choisie** : les vaisseaux pris par la supernova après la refonte, et des joueurs qui partent faute de pouvoir les remplacer.
- **Des choix irréversibles** : un scanner mal placé coûte « plusieurs millions de plus » pour les derniers secteurs, selon les guides.

---

## 3. Fondaco aujourd'hui : l'audit

On note chaque pilier sur deux axes : le **plafond** (ce que l'acharné peut y optimiser) et le **plancher** (ce que le joueur du dimanche en tire sans effort). De 1 (faible) à 5 (fort).

| Pilier | Ce qui existe | Plafond | Plancher | Remarque |
| --- | --- | --- | --- | --- |
| **La livraison saut par saut** | Glisser, 10 s, ✓ ou ✕, 15 arrêts, chargement automatique | 2 | 4 | Le geste est bon. L'ordre des arrêts ne change presque rien à la paie : seul le temps du véhicule compte |
| **Les commandes des villes** | Vagues de 2 h, 6 au plus ; paie selon la taille et la distance (`orders.sizeBps`, `distanceBps`) | 2 | 5 | Sans culpabilité, c'est réussi. Mais tout se vaut : aucune commande rare, aucune commande à préparer |
| **Les modules des véhicules** | Six modules de commerce, dont le Livre de route, le Fouet et l'Estafette ; une place par niveau de modèle | 2 | 4 | Montage gratuit et instantané (bien). Aucun module n'a de contrepartie : il y a une bonne réponse |
| **Les ateliers et les chaînes** | Niveaux 1 à 20 (25 pour l'Arte), voisinages, qualités, la cour | 4 | 3 | La plus grande profondeur actuelle. Elle se voit mal depuis la carte |
| **La Casa et les comptoirs** | Paliers, cercle d'action, cases de proche en proche | 3 | 4 | Le placement d'un comptoir est un vrai choix, mais **irréversible** (le piège du scanner) |
| **Les savoirs et le personnel** | Quatre branches, capstones exclusifs, chemins tous les cinq niveaux | 4 | 3 | Bons choix exclusifs. Aucun moyen de revenir sur une erreur, sauf l'Arte |
| **La Porta** | Bataille en direct, paliers 1 à 6, composants, reliques, classement de la semaine | 4 | 2 | Le meilleur contenu pour l'acharné. Dur à aborder seul pour un nouveau |
| **La compagnie** | Rôles, entraide, Condotta, Contesa | 3 | 3 | L'entraide est bonne. Aucun objectif commun asynchrone |
| **La Terraferme et la Contesa** | Une semaine à armes égales, par théâtres | 4 | 2 | Le seul PvP. Demande de la présence |
| **Le classement** | Reliques de la Porta seulement | 1 | 1 | **Le trou le plus visible** |
| **L'information** | Les commandes, l'infobulle du trajet | 1 | 3 | Aucun journal, aucun graphique, aucune décomposition |
| **Les objectifs** | Le Carnet de la semaine | 2 | 4 | Bien pour le rythme. Pas de défis optionnels, pas de succès à long terme |

### 3.1 Les sept manques

- **M1. La compétence au cœur du jeu ne se mesure pas.** Deux joueurs qui livrent les mêmes commandes, l'un très bien, l'autre au hasard, gagnent presque la même chose. La seule différence est le temps du véhicule libéré.
- **M2. Pas d'échelle de rang.** L'acharné n'a nulle part où voir qu'il est bon.
- **M3. Pas de chiffres.** Ni revenu par véhicule, ni historique, ni « d'où vient ce prix ».
- **M4. Des modules sans arbitrage.** Le montage automatique trouve déjà presque le meilleur.
- **M5. Aucun objectif commun asynchrone.** Les associés s'entraident par lots, mais ne poursuivent rien ensemble hors de la Contesa.
- **M6. Aucune collection ni succès.** Rien ne garde la trace de ce qu'une Maison a accompli.
- **M7. Des erreurs sans retour.** Un comptoir mal posé, un capstone mal choisi : le joueur du dimanche le paie pour toujours.

---

## 4. Les principes : un plancher bas, un plafond haut

Ces principes s'appuient sur les règles d'or (CADRAGE-v3 § 2). Ils doivent guider chaque proposition.

1. **Un même geste, plusieurs couches.** On n'ajoute pas un système pour l'acharné : on rend plus profond le geste que tout le monde fait déjà (livrer).
2. **Un bon réglage par défaut, une main fine en option.** Le chargement, le montage des modules et la tournée se font seuls. L'acharné les reprend à la main et fait mieux. L'écart doit être **visible** (une note), mais **petit en ducats** (de l'ordre de 10 à 20 %), pour que le joueur du dimanche ne se sente jamais puni.
3. **L'acharné gagne de la reconnaissance et des occasions, pas un multiplicateur.** Des titres, des records, des cosmétiques, des places au classement de sa bande. Jamais de rendement qui creuse un écart hors de sa bande.
4. **Tout chiffre se déplie.** Un appui long (ou le survol sur PC) montre la formule. Le joueur du dimanche ne le voit pas, l'acharné ne voit que ça.
5. **Toute erreur se répare.** Un choix exclusif se change, contre un coût et un délai, jamais gratuitement et jamais impossiblement (la leçon du piège à hydrogène et du scanner mal placé).
6. **Le coopératif a une fenêtre, pas une veille.** 48 heures où l'on contribue quand on veut, jamais cinq jours où l'adversaire joue pendant qu'on dort (la leçon des étoiles blanches).
7. **La régularité est récompensée au seuil, pas au rang.** Qui atteint un seuil modeste gagne la saison ; les premiers gagnent en plus un titre (la leçon des saisons bleues).

---

## 5. Les propositions

Chaque proposition dit : ce que c'est, d'où elle vient dans Hades' Star, ce qu'y trouve l'acharné, ce qu'y trouve le joueur du dimanche, les garde-fous, et ce qu'il faudrait mesurer. Les familles vont du cœur (A) à l'accessibilité (G).

### A. Le cœur : livrer avec talent

#### A1. Les bonus de tournée
- **Quoi** : trois primes lisibles, affichées au départ de la tournée :
  - **commande complète** : une commande remplie en entier d'un coup, +10 % sur ses unités ;
  - **ville servie** : toutes les commandes d'une vague d'une ville remplies au même arrêt, +5 % de plus ;
  - **belle tournée** : à partir de 5 arrêts payants sans repasser par un comptoir, +1 % par arrêt (plafonné).
- **D'où** : Trade Boost et Trade Burst, et le drone qui paie selon le nombre de cargaisons livrées à une même planète.
- **Pour l'acharné** : préparer ses chargements pour enchaîner les primes.
- **Pour le joueur du dimanche** : le chargement automatique vise déjà les commandes complètes ; il touche la première prime sans le savoir.
- **Garde-fous** : le porteur a écarté ces bonus au chantier 1. On les rouvre avec une mesure : l'écart de revenu entre un bot « soigneux » et un bot « au hasard » au simulateur doit rester entre 10 et 20 %. Tout dans `worlds.settings`, à annoncer dans les notes du chapitre.

#### A2. La tournée suggérée et sa note
- **Quoi** :
  - un bouton **« Tracer »** sur le véhicule choisi propose une tournée (jusqu'à 15 arrêts) qui sert les commandes les mieux payées dans le moins de temps ; le joueur la lance telle quelle, ou la modifie ;
  - à l'arrivée, une **note de tournée** sur 100 : la paie obtenue par minute de véhicule, comparée à la meilleure tournée que le moteur a trouvée avec le même chargement.
- **D'où** : la logique des transports de Hades' Star (le joueur choisit l'ordre), et la Machine à remonter le temps (on voit l'issue avant de partir).
- **Pour l'acharné** : un **puzzle quotidien** avec un score. Battre « Tracer » (une note au-dessus de 100 si le joueur trouve mieux que l'heuristique), viser les records.
- **Pour le joueur du dimanche** : un geste, et la tournée est bonne.
- **Garde-fous** : la suggestion ne joue pas à la place du joueur : elle propose, il lance (décision du 31 octobre, « plus aucun bouton ne joue à la place du joueur »). À faire valider par le porteur sur ce point précis. Le calcul est une fonction pure du moteur (un voyageur de commerce sur 15 arrêts au plus, par recherche locale), donc testable sur la fixture.
- **Mesure** : la part des tournées tracées à la main, et la note médiane.

#### A3. Les relais de poste
- **Quoi** : un bâtiment à poser sur une case à soi, la **stazione di posta**. Deux relais reliés forment une **ligne** : un saut le long de la ligne va deux fois plus vite. Une Maison a un relais par tranche de quelques niveaux de Casa.
- **D'où** : les lignes de saut (warp lanes) et leurs nœuds, et le conseil des vétérans de relier le centre à chaque côté de la carte.
- **Pour l'acharné** : un **puzzle de placement** sur sa carte, qui change avec chaque comptoir posé.
- **Pour le joueur du dimanche** : un relais posé au hasard aide déjà. La carte montre une ligne en pointillé doré : c'est beau, et ça se lit.
- **Garde-fous** : un relais se déplace (contre un coût modéré, principe 5). Il ne réduit que le temps, jamais une paie.

#### A4. Les commandes de la cour
- **Quoi** : de temps en temps, une vague apporte une **commande dorée** : grosse, d'une marchandise fine ou exquise, ou d'une région lointaine. Elle paie en Faveur ou en Sceaux en plus des ducats.
  - Elle reste tant qu'on ne l'a pas livrée (une à la fois par Maison), sans délai. L'absence ne la fait pas perdre.
- **D'où** : les cargaisons rares de Hades' Star, qui rapportent des cristaux.
- **Pour l'acharné** : une commande à **préparer** : stocker, transférer entre comptoirs, monter la qualité.
- **Pour le joueur du dimanche** : un petit événement visible sur la carte (la ville brille), qu'il remplit à son rythme.
- **Garde-fous** : jamais de rendement ; les Sceaux ne s'achètent jamais (§ 5.4 du cadrage). La fréquence est réglée dans `worlds.settings`.

### B. Le build : des choix qui font une Maison

#### B1. Des modules à double tranchant
- **Quoi** : de nouveaux modules de commerce, chacun bon dans un style et moins bon ailleurs :

  | Module | Gain | Prix |
  | --- | --- | --- |
  | Grand bât | Capacité +25 % | Saut 15 % plus lent |
  | Coursier | Saut 25 % plus rapide | Capacité −20 % |
  | Colporteur | Prime +10 % dans les villes de taille 1 et 2 | Rien dans les villes de taille 4 et 5 |
  | Fournisseur de la cour | Prime +10 % dans les villes de taille 4 et 5 | Rien dans les petites |
  | Marchand forain | Vend au marché de la ville le surplus de la cale, au prix du marché | La place qu'il prend |

- **D'où** : les places limitées et les contres de Hades' Star ; aucun module n'y est bon partout.
- **Pour l'acharné** : des **builds** (le véhicule des capitales, la mule des bourgs) qui dépendent de sa carte.
- **Pour le joueur du dimanche** : le montage automatique reste (`ensureFitted`), avec une règle simple : il choisit selon les villes du cercle du comptoir.
- **Garde-fous** : monter et démonter reste gratuit et instantané. Chaque module se valide au simulateur.

#### B2. Les équipements enregistrés
- **Quoi** : enregistrer l'équipement d'un véhicule sous un nom (« Capitales », « Bourgs ») et l'appliquer en un geste à tous les véhicules d'un modèle.
- **Pour l'acharné** : changer de stratégie en dix secondes.
- **Garde-fous** : du confort, gratuit pour tous. On ne le met pas dans l'abonnement, parce qu'il touche au cœur du jeu.

#### B3. La vocation d'un comptoir
- **Quoi** : au niveau 5, un comptoir choisit une vocation, exclusive :
  - **entrepôt** : un stock plus grand, et les transferts vers lui plus rapides ;
  - **relais** : les véhicules qui y passent rechargent sans module ;
  - **marché** : les commandes de son cercle un peu plus grandes.
- **D'où** : les stations de Hades' Star, et la « planète de stockage » des vétérans.
- **Pour l'acharné** : une carte qui s'organise en réseau.
- **Pour le joueur du dimanche** : un choix à trois boutons, réversible (principe 5).

#### B4. Désapprendre à la Scuola
- **Quoi** : une fois par ère, changer un capstone ou un chemin du personnel, contre un coût en ducats et le temps de réapprendre.
- **D'où** : à l'inverse du piège à hydrogène.
- **Pour l'acharné** : s'adapter au méta de l'ère.
- **Pour le joueur du dimanche** : une erreur n'est plus éternelle.

#### B5. Déménager un comptoir
- **Quoi** : déplacer un comptoir dans son secteur, contre un coût et un chantier ; ses ateliers et son stock le suivent.
- **D'où** : le scanner mal placé de Hades' Star, qui ne se déplace plus.
- **Garde-fous** : rien de bâti ne se perd ; le coût est un puits de ducats.

### C. Le risque choisi et les défis

#### C1. La Porta noire et la bénédiction
Déjà proposées (`docs/hades-star/03`, § 6.2 et § 6.3) et retenues pour le chantier 3. On y ajoute un point : **la Porta noire doit montrer clairement son risque avant d'entrer**, avec une case à cocher et la valeur de ce qui est engagé. C'est l'étoile rouge sombre : un choix de la minorité.

#### C2. Les Gageures de la semaine
- **Quoi** : trois défis optionnels par semaine, chacun avec une contrainte :
  - « 500 unités livrées avec des mules seulement » ;
  - « une tournée de 12 arrêts et plus avec une note de 95 » ;
  - « le palier 4 de la Porta sans chirurgien ».
- **Récompense** : un sceau de cire sur la page de la Maison, un titre ; jamais de rendement.
- **Pour l'acharné** : des contraintes, donc de la créativité.
- **Pour le joueur du dimanche** : la plus simple des trois est à sa portée ; elles restent deux semaines, comme le Carnet.

#### C3. Les Distinctions de la Maison
- **Quoi** : une quarantaine de distinctions à paliers (bronze, argent, or), sur le long terme :
  - 10 000 commandes livrées ;
  - toutes les villes d'une région servies ;
  - une tournée de 15 arrêts payants ;
  - les six paliers de la Porta ;
  - un capstone dans chaque branche ;
  - cinq générations de la famille.
- **Où les voir** : dans la galerie de la Casa, et une pièce de la façade par distinction d'or.
- **D'où** : les succès de Hades' Star (rares et lents) et les Distinctions de son profil.
- **Pour l'acharné** : la collection, le « 100 % ».
- **Pour le joueur du dimanche** : les premières tombent seules et montrent ce que le jeu contient.

### D. La compétition lisible

#### D1. Le Libro d'oro
- **Quoi** : il comble le trou du classement (`IDEAS.md`, « Un seul métier »).
  - **Le classement de la semaine, par bande de Puissance**, sur le **rendement** : les ducats gagnés aux commandes divisés par la Puissance. Le petit qui joue bien bat le gros qui joue mal, ce qui respecte la règle d'or 4.
  - **Les records**, par bande et pour tout le monde : la plus belle tournée (note et paie), le plus gros jour de livraisons, la Porta la plus rapide à chaque palier.
- **D'où** : l'Influence de Hades' Star, plafonnée par le scanner rouge. Ici, c'est la bande qui plafonne.
- **Garde-fous** :
  - le rendement doit être calculé sur ce qui est bâti, jamais sur la caisse ;
  - à vérifier au simulateur qu'aucune stratégie ne le force (par exemple, garder sa Puissance basse exprès) ; si c'est le cas, classer sur les ducats livrés dans la bande ;
  - aucun ducat à la clé, des titres et une ligne au Gazzettino du dimanche.

#### D2. La saison du chapitre
- **Quoi** : chaque mois (le chapitre), **tous ceux qui ont livré au moins N jours** reçoivent la récompense de la saison : un cosmétique du mois (une gondole, une bannière). Les dix premiers du Libro d'oro de leur bande gagnent en plus un titre.
- **D'où** : les saisons des étoiles bleues depuis la refonte, qui paient la régularité.
- **Garde-fous** : un seuil bas (par exemple 8 jours sur 30), pour ne jamais créer de série à tenir. L'absence ne fait rien perdre de ce qu'on a.

#### D3. Rejouer une tournée
- **Quoi** : un record du Libro d'oro se rejoue sur la carte, comme un replay : on voit le véhicule faire ses sauts.
- **D'où** : les replays de combat partagés (octobre 2026).
- **Pour l'acharné** : apprendre des meilleurs, montrer son travail.

### E. L'information et les outils

#### E1. Le Registre
- **Quoi** : un écran de chiffres dans la feuille de la Casa :
  - le revenu par véhicule, par comptoir et par ville, sur 7 jours ;
  - la paie par minute de véhicule ;
  - les commandes livrées et laissées au plafond ;
  - une courbe de la Puissance depuis le premier jour (déjà prévue au § 3.6 du cadrage).
- **Garde-fous** : l'essentiel (7 jours) est gratuit. L'historique long (90 jours, export CSV) peut aller à l'abonnement : c'est de l'information, ce que le cadrage autorise (§ 10).

#### E2. Les chiffres dépliables
- **Quoi** : tout prix, toute durée, toute capacité se déplie à l'appui long : la base, puis chaque effet avec sa source (taille de la ville, distance, module, savoir, Arte, personnel). Le moteur a déjà `houseEffect` : il suffit d'en exposer le détail.
- **Pour l'acharné** : comprendre la formule, donc l'optimiser.
- **Pour le joueur du dimanche** : rien ne change s'il ne touche pas.

#### E3. L'aperçu du départ
- **Quoi** : pendant les 10 s du départ, l'infobulle montre aussi **la paie attendue** et les primes (A1) de la tournée.
- **D'où** : la Machine à remonter le temps.

#### E4. Les modules des associés
- **Quoi** : dans la feuille de la compagnie, voir les modèles, les niveaux et les modules de chaque associé.
- **D'où** : le bot « Compendium », qui fait exactement ça pour les corporations, parce que le jeu ne le fait pas.

#### E5. Une lecture publique des chiffres
- **Quoi** : l'API publique en lecture, notée en V2 dans `IDEAS.md`, pour que la communauté construise ses outils.
- **Garde-fous** : rien de privé (ni stock, ni caisse) ; seulement ce que montrent déjà le Libro d'oro et les Annales.

### F. Le coopératif sans fatigue

#### F1. La Grande Commande de compagnie
- **Quoi** : un week-end par mois (48 heures), chaque compagnie reçoit une immense commande d'une capitale, en plusieurs marchandises et en paliers (« armer la flotte de l'Arsenal »).
  - Chaque associé livre quand il veut, de ses comptoirs. Chaque unité est payée à l'arrivée.
  - Chaque palier atteint donne à **tous ceux qui ont livré au moins une tournée** une récompense commune : Sceaux, une pièce du fondaco de compagnie, une bannière.
  - Un classement des compagnies, par la somme des Puissances, comme la Contesa.
- **D'où** : l'événement rouge de corporation (48 heures, un week-end par mois), les étoiles quantiques, et les « commandes de compagnie » déjà notées dans `IDEAS.md` (PvE coopératif).
- **Pour l'acharné** : de la logistique à vingt : qui livre quoi, d'où, quand.
- **Pour le joueur du dimanche** : une tournée suffit pour toucher sa part.
- **Garde-fous** : jamais de ducats sans marchandises livrées, une part plafonnée par compte, rien en temps réel obligatoire.

#### F2. Le roulage
- **Quoi** : confier une cargaison au véhicule d'un associé, qui la livre contre une part de la paie. Déjà noté dans `IDEAS.md`.
- **D'où** : le dépôt de cargaison entre coéquipiers dans les étoiles blanches.

#### F3. Les reliques dans la compagnie
- **Quoi** : donner une relique à un associé, sous plafonds (ancienneté, un don par jour).
- **D'où** : l'échange d'artefacts dans les corporations (octobre 2026), qui a remplacé un échange de gré à gré sans garde-fou.

### G. Le joueur du dimanche

#### G1. Le prochain geste
- **Quoi** : un seul bouton doré visible à tout moment, qui dit le prochain bon geste (« Livrer Padoue : 3 commandes », « Le chantier de la Casa est fini »). Il répond au premier problème de l'audit UX du 31 octobre : « on ne sait pas quoi faire ».
- **Garde-fous** : il désigne, il ne joue pas (décision du 31 octobre).

#### G2. Le commis
- **Quoi** : un véhicule laissé à quai plus de 6 heures livre seul, une fois, les commandes de son comptoir, à 70 % de la paie et sans prime.
- **D'où** : le relais de livraison de Hades' Star, qui est payant chez eux.
- **Garde-fous** : jamais vendu. Moins bon que la main, pour que jouer plus rapporte plus. Il ne rend pas l'absence coûteuse : il la rend un peu moins vide. C'est une décision du porteur (déjà notée dans `IDEAS.md`).

#### G3. Deux lectures de l'écran
- **Quoi** : un réglage **Simple / Détaillé**. En simple : trois chiffres, les commandes, le bouton doré. En détaillé : les notes de tournée, les formules dépliées, le Registre en raccourci.
- **Pour qui** : chacun choisit le jeu qu'il veut voir, sur le même moteur.

#### G4. Un tutoriel qui ouvre la profondeur
- **Quoi** : quand un joueur atteint un palier, un objectif du guide lui montre **une couche** de plus : « montez un module », « tracez une tournée à la main », « battez votre note ». Le guide s'arrête à la Casa 2 aujourd'hui ; il s'agit de petites leçons, jamais d'un bouton qui joue.

---

## 6. Ce qu'il ne faut pas prendre à Hades' Star

| À éviter | Pourquoi | Ce que Fondaco fait à la place |
| --- | --- | --- |
| Un affrontement de 5 jours en temps réel entre compagnies | On se réveille sur un désastre ; l'usure | La Contesa sur une semaine, à armes égales ; la Grande Commande en 48 h, sans adversaire |
| Vendre l'accélération | « Pay-to-rush » ; on vend du temps | Rien ne s'achète qui fait progresser (règle d'or 5) |
| La perte non choisie | Les départs après la refonte | La perte seulement à la Porta noire, choisie |
| Une ressource qui verrouille | Le piège à hydrogène | Pas de coût qui court ; tout choix se répare (B4, B5) |
| Des années pour le sommet, par des chantiers de 10 jours | « Un jeu bridé par le temps » | Chantiers de 7 jours au plus, le savoir qui circule, la Maestria pour l'infini |
| Le relais de livraison payant | De la production automatisée vendue | Le commis gratuit et moins bon (G2) |
| L'échange de gré à gré sans garde-fou | Les arnaques entre joueurs | Les dons sous plafonds, au grand livre |

---

## 7. La feuille de route proposée

Chaque lot passe par un plan validé avant le code. L'ordre va du moins cher au plus cher, et de l'information vers les systèmes.

| Lot | Contenu | Coût | Ce qu'il débloque |
| --- | --- | --- | --- |
| **1. Lire** | E2 (chiffres dépliables), E3 (aperçu du départ), E1 (Registre de 7 jours), G3 (Simple / Détaillé) | Petit : surtout de l'écran ; le moteur expose ce qu'il calcule | La compétence devient visible |
| **2. Le puzzle** | A2 (Tracer et la note), A1 (bonus de tournée), G1 (le prochain geste) | Moyen : une fonction pure de tournée, le simulateur | Le plafond du cœur du jeu |
| **3. L'échelle** | D1 (Libro d'oro), D2 (saison du chapitre), C3 (Distinctions) | Moyen : serveur et écran, peu de moteur | L'acharné a un rang, le joueur du dimanche une saison |
| **4. Le build** | B1 (modules à double tranchant), B2 (équipements), B4 et B5 (réparer ses erreurs) | Moyen : moteur et simulateur | Des Maisons différentes |
| **5. Ensemble** | F1 (Grande Commande), E4 (modules des associés), F2 (roulage) | Gros : un événement, de la coordination | Le coopératif asynchrone |
| **6. Le réseau** | A3 (relais de poste), B3 (vocations), A4 (commandes de la cour), C2 (Gageures), G2 (commis) | Gros : nouvelles règles de carte | La carte devient un réseau |

La Porta (chantier 3 de `docs/hades-star/00-synthese.md`) reste à sa place, avec C1.

---

## 8. Ce qu'il faudrait mesurer

Au simulateur de 24 mois (toutes les graines), avec trois profils de bots ajoutés : **le soigneux** (tournées optimales, modules choisis), **le régulier** (« Tracer » à chaque fois, montage automatique) et **le distrait** (une session par jour, au hasard) :

| Mesure | Cible proposée |
| --- | --- |
| Écart de revenu entre le soigneux et le régulier | 10 à 20 % |
| Écart entre le régulier et le distrait, par jour joué | ≤ 30 % |
| Temps pour quitter la première bande, distrait | Dans la cible du cadrage (4 à 6 mois), ou à peine au-delà |
| Le rendement du Libro d'oro ne pousse pas à garder sa Puissance basse | Aucun bot qui gagne en refusant de bâtir |
| Part des Sceaux venus de la Grande Commande | Dans le plafond de la Terraferme (10 à 15 % de la progression) |

Avec de vrais joueurs : la part des tournées tracées à la main, la note médiane, l'ouverture du mode Détaillé, la participation à la Grande Commande (cible : plus de 60 % des associés actifs livrent au moins une tournée).

---

## 9. Les décisions demandées au porteur

1. **Le bouton « Tracer »** propose une tournée sans la lancer : est-ce compatible avec « plus aucun bouton ne joue à la place du joueur » ?
2. **Les bonus de tournée** (A1), écartés au chantier 1 : les rouvrir, avec la cible d'écart de 10 à 20 % ?
3. **Le classement du commerce** : le rendement (ducats des commandes divisés par la Puissance), les ducats livrés dans la bande, ou autre chose ?
4. **Le commis** (G2) : le donner à tous, borné et moins bon que la main ?
5. **L'historique long dans l'abonnement** (E1) : de l'information qui aide l'acharné, ce que le cadrage autorise. D'accord ?
6. **Réparer ses erreurs** (B4, B5) : une fois par ère, contre un coût ?
7. **L'ordre des lots** du § 7 : commencer par « Lire » ?

---

## 10. Sources

- Recherches précédentes : `docs/hades-star/00-synthese.md` à `04-interface-animations.md`, `docs/hades-star-livraisons.md`, qui citent le wiki fandom, Steam, TouchArcade, NamuWiki et TV Tropes.
- Wiki fandom (lu par extraits de moteur de recherche) : [White Stars](https://hades-star.fandom.com/wiki/White_Stars).
- Discussions Steam : [Tips or Advice?](https://steamcommunity.com/app/755800/discussions/0/2944710017702805410/), [discussion 1639789306549292906](https://steamcommunity.com/app/755800/discussions/0/1639789306549292906), [discussion 1870622978440442784](https://steamcommunity.com/app/755800/discussions/0/1870622978440442784), [discussion 4357872099805831302](https://steamcommunity.com/app/755800/discussions/0/4357872099805831302), [discussion 1639793203772933375](https://steamcommunity.com/app/755800/discussions/0/1639793203772933375).
- Succès Steam : [Global Gameplay Stats](https://steamcommunity.com/stats/755800/achievements).
- Blog officiel : [Dark Nebula upgrade guide](https://blog.hadesstar.com/2023/10/dark-nebula-upgrade-guide.html), [Shipment changes in DARK NEBULA](https://blog.hadesstar.com/2023/02/shipment-changes-in-dark-nebula.html) (non lus en direct).
- Guide : [Prima Games, Hades' Star](https://primagames.com/eguides/mobile-gaming-eguide-tips-tricks-and-strategies-for-todays-hottest-mobile-games/hades-star/profit-driven-galactic-exploration).
- Outils de la communauté : [le bot Compendium (Patreon de McGoldric)](https://www.patreon.com/mcgoldric), [White Star Cartographer (GitHub)](https://www.github.com/whitestarcartographer/whitestarcartographer.github.io).
- Magasins : [Xbox, DARK NEBULA](https://www.xbox.com/games/store/hades-star-dark-nebula/9NN38XKP4M2J) (la Machine à remonter le temps), [App Store](https://apps.apple.com/us/app/-/id1598157241), [PhoneArena](https://www.phonearena.com/news/Hades-Star-is-a-mobile-MMO-strategy-which-kind-of-reminds-us-of-EVE-Online_id96357).
- **Domaines à autoriser** pour vérifier en direct : `hades-star.fandom.com`, `steamcommunity.com`, `blog.hadesstar.com`, `reddit.com`.
