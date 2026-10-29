# La profondeur : métiers, modules, expéditions, marchés vivants

*Document de conception du 29 octobre 2026, à la demande du porteur, qui jugeait le cadrage v3 encore trop superficiel. Il complète `docs/CADRAGE-v3.md`, qui le résume dans ses sections 3 bis à 3 sexies. Rien n'est codé. Tous les chiffres sont des ordres de grandeur, à calibrer au simulateur de 24 mois.*

## Pourquoi

Sans ses formules, le v3 restait « produire, livrer des commandes, monter des niveaux en attendant ». Hades' Star tient des années pour cinq raisons :
1. **Trois métiers**, chacun avec sa boucle et son jeu actif : le transport, l'extraction et le combat.
2. **Des modules** en nombre limité, à rechercher longuement : deux joueurs de même niveau ont des empires différents.
3. **Des contenus à paliers** qui demandent ces modules : les Red Stars en coopération, les Blue Stars en escarmouche, les White Stars en guerre de corporations.
4. **Des reliques et des plans**, gagnés dans ces contenus, qui nourrissent la recherche.
5. **Un monde qui se découvre**, avec ses secteurs et ses menaces (Cerberus).

Ce document traduit ces cinq sources en commerce vénitien de 1450, sans copier. Il y ajoute ce qu'Hades' Star n'a pas et qu'un jeu de commerce doit avoir : **des marchés régionaux où les nouvelles voyagent**, et la **colleganza**, le contrat de financement des voyages inventé par Venise.

Ce qui reste intangible : les règles d'or du v3 (§ 2) et les quatre arbitrages du porteur.

---

## A. Trois métiers, trois flottes : le cœur de la profondeur

Chaque Maison a trois flottes, ouvertes progressivement. Chacune a sa boucle, ses modules et son jeu actif.

| Métier (équivalent Hades' Star) | Boucle | Jeu actif en 5 minutes |
| --- | --- | --- |
| **Le négoce** (Transport) | Acheter là où c'est bon marché, vendre là où c'est cher. Honorer les commandes et les contrats. La valeur d'une cargaison croît avec la distance | Choisir sa route et son escale, composer une cargaison mixte, décider face à une tempête ou une rumeur |
| **L'exploitation** (Miner) | Des **gisements** apparaissent sur la carte et s'épuisent : salines de Chioggia, forêts du Cadore, carrières d'Istrie, mines d'argent du Tyrol, pêcheries de Dalmatie, alun de Phocée. On y envoie ses équipes d'exploitation | Repérer un gisement frais avant les autres, choisir entre en tirer vite (et l'épuiser) ou durer, le défendre de la concurrence par ses modules |
| **Les armes** (Battleship) | Galères armées et compagnies de condottieri, pour escorter, chasser les corsaires et partir en expédition | Composer une escorte, répondre à une attaque de corsaires sur une route, entrer en expédition |

On n'est pas obligé de tout faire : **un marchand peut se spécialiser**. L'Arte et le Stato poussent vers un métier, et la colleganza (§ E) permet de vivre de l'argent des autres.

---

## B. Les modules : deux empires, deux visages

Chaque navire, convoi, équipe ou compagnie a des **emplacements par type**, ouverts par son niveau. Chaque module a les niveaux 1 à 10. On le **recherche** une fois, et il sert à tous ses porteurs. Changer un module se fait au port, gratuitement.

### B.1 Modules de négoce (navires et convois marchands)

| Module | Effet | Équivalent Hades' Star |
| --- | --- | --- |
| **Cale** | +capacité | Cargo Bay Extension |
| **Voilure ou attelage** | +vitesse | — |
| **Débarquement prompt** | Décharge et repart sans perdre l'heure de port | Offload |
| **Courrier** | Livre une commande d'une ville voisine sans escale | Dispatch |
| **Comptoir flottant** | Vend directement au port d'escale, à son prix du jour | Trade Station |
| **Prime de convoi** | +X % sur les commandes groupées d'une même ville | Trade Burst |
| **Pavillon neutre** | Passe une zone de guerre sans péage ni saisie | — |
| **Portulan** | Révèle les prix d'arrivée avant le départ (§ D) | — |
| **Lettre de change** | Paie l'achat au port d'arrivée sans transporter de ducats | — |
| **Rappel** | Fait rentrer un convoi en route, avec sa cargaison | Recall |

### B.2 Modules d'exploitation (équipes de prospecteurs, de bûcherons, de saulniers)

| Module | Effet | Équivalent Hades' Star |
| --- | --- | --- |
| **Rendement** | +extraction par heure | Mining Boost |
| **Grande campagne** | ×4 pendant 1 h, puis repos | Mining Boost actif |
| **Concession lointaine** | Exploite un gisement sans y avoir de comptoir | Remote Mining |
| **Prospection** | Fait apparaître un gisement caché dans sa région | Genesis |
| **Gestion durable** | Le gisement s'épuise moins vite (moins de rendement immédiat) | — |
| **Charrois** | Ramène la production au comptoir sans passer par le négoce | — |

### B.3 Modules d'armes (galères armées, compagnies de condottieri)

| Module | Type | Exemples |
| --- | --- | --- |
| **Armes**, un emplacement | Offensif | Arbalétriers (contre une cible), bombarde (dégâts de zone), feu grégeois (dégâts dans la durée), couleuvrine (portée) |
| **Défense**, un emplacement | Protection | Pavois (bouclier passif), mantelets (bouclier actif), cuirasse (encaisse un coup lourd) |
| **Soutien**, un à trois emplacements | Utilité | Chirurgien (soigne), éclaireur (voit loin), ravitailleur (allonge l'expédition), ingénieur (détruit les défenses), trompette (accélère une alliée) |

### B.4 La recherche

- **Où** : la Scuola (négoce, exploitation) et l'Arsenal privé (armes).
- **Places** : une recherche à la fois, deux à la Casa 12, trois à la Casa 18.
- **Durée** : de 30 minutes (niveau 1) à 10 jours (niveau 10).
- **Coût** : des ducats, plus des **plans** à partir du niveau 4 (§ C).
- **Sans fin** : à tous les niveaux, on ne maximise pas tout. Plus de 40 modules × 10 niveaux, cela fait des années de recherche. **On choisit ses modules comme on choisit ses talents** : c'est l'identité de la Maison.

---

## C. Les expéditions à paliers (Red Stars) et les reliques

### C.1 L'expédition

- **Joueurs** : une partie coopérative de 1 à 5 Maisons, en **direct, 10 à 15 minutes**, ou en **différé sur 24 h** (une décision par tour, toutes les 4 h, pour les joueurs mobiles).
- **Paliers** : 1 à 12, ouverts par la réussite du palier précédent **et** le niveau de sa galère armée.
- **Lieux** :
  - la côte barbaresque ;
  - les épaves de la mer Ionienne ;
  - la route de Tana ;
  - les ruines de Byzance après 1453 ;
  - les caravanes du Sinaï.
- **Déroulement** : on progresse sur une petite carte, on affronte des vagues de corsaires et on récupère des **reliques** avant que le temps ou les ravitaillements manquent.

### C.2 Les reliques

| Relique | Se déchiffre en |
| --- | --- |
| **Portulans et cartes** | Plans de modules de négoce ; ouverture anticipée d'une route |
| **Codex et manuscrits grecs** | Plans des savoirs ; accélération d'une recherche |
| **Objets d'art** (icônes, verres, tapis) | Ornements du palais (cosmétique, Lustre) ; ou vente au Rialto aux collectionneurs |
| **Pièces d'armes** | Plans de modules d'armes |

- Le **déchiffrage** prend du temps (de 1 h à 2 jours) et une place à la Scuola.
- Les reliques se **vendent entre joueurs** au Rialto : un marché des reliques, et une raison de commercer pour le pur combattant.
- **Le palier fixe la qualité des reliques.** Le vétéran fait des paliers 10 à 12, le nouveau les paliers 1 à 3, et chacun obtient ce qu'il lui faut.

### C.3 Les escarmouches (Blue Stars)

La Condotta actuelle devient la **partie rapide** : de 4 à 5 joueurs en direct, à armes égales, sur un palier unique. Elle sert à apprendre les armes et rend quelques Sceaux.

---

## D. Des marchés vivants : chaque région a ses prix, et les nouvelles voyagent

C'est la profondeur propre à un jeu de commerce, celle qu'Hades' Star n'a pas.

- **Un marché par région**, avec sa propre offre et sa propre demande. Le blé est bon marché en Romagne, cher à Venise. Les épices sont bon marché à Alexandrie, chères à Bruges. **L'arbitrage entre régions devient le métier du négociant**, et la valeur d'une cargaison croît avec la distance.
- **Les nouvelles voyagent à la vitesse des navires.**
  - On connaît **en direct** les prix des régions où l'on a un comptoir.
  - Pour les autres, on ne connaît que **le dernier prix rapporté** : par ses convois, par une rumeur du Broglio, par un associé.
  - Les prix affichés sont **datés** (« Alexandrie, poivre, il y a 4 jours »).
  - Le module *Portulan*, le Courrier de compagnie et les comptoirs réduisent ce retard. **L'information devient une ressource**, comme pour les vrais marchands vénitiens et leurs lettres.
- **Les crises** déplacent les prix :
  - une tempête retient la Muda ;
  - une peste ferme un port ;
  - une guerre double le prix du fer ;
  - une bonne récolte fait chuter le blé.

  Elles viennent du calendrier des ères et d'événements tirés, annoncés par des rumeurs plus ou moins fiables. **Celui qui sait avant les autres gagne.**
- **Les contrats à terme** : on s'engage à livrer 500 balles de coton à Venise dans 20 jours, à prix fixé. Ils sont adossés au séquestre, au grand livre. On spécule, on se couvre.

---

## E. La colleganza : vivre de l'argent des autres

C'est le contrat inventé par Venise : un **investisseur** (*stans*) finance la cargaison d'un **voyageur** (*tractator*). Au retour, le bénéfice se partage, trois quarts pour l'investisseur, un quart pour le voyageur, ou selon les termes.

- **Le voyageur** publie un voyage : la route, la galère, la date de la Muda, la part offerte.
- **Les investisseurs** souscrivent : les ducats sont mis sous séquestre, puis la cargaison est achetée.
- **Au retour**, le partage est automatique, au grand livre. Une perte (corsaires, tempête) est partagée selon les termes.
- **La réputation** de chaque voyageur est publique : taux de retour, rendement moyen, voyages honorés.

**Ce que ça apporte** :
- un vétéran riche **investit dans les voyages des nouveaux**, qui ont la galère et le temps mais pas le capital, et les deux y gagnent ;
- le nouveau grandit plus vite **grâce** aux anciens ;
- c'est le lien d'Eve, historique et lisible.

---

## F. Le personnel : capitaines, maîtres, facteurs, condottieri

Ce sont les « héros » du jeu, à collectionner et à faire grandir, comme les pilotes et les drones d'Hades' Star.

| Rôle | Où | Effet |
| --- | --- | --- |
| **Capitaine** | Un navire | Ses compétences s'ajoutent aux modules : navigateur (vitesse), marchand (prix d'escale), vieux loup (risque) |
| **Maître artisan** | Un atelier | La qualité des produits (§ G) et le rendement de son métier |
| **Facteur** | Un comptoir | Il automatise : relance la file, honore les commandes simples, envoie des rapports de prix |
| **Condottiere** | Une compagnie armée | Tactique en expédition et en escorte |
| **Ambassadeur** | Une cour étrangère (Caire, Constantinople, Buda) | Chartes moins chères, avance sur les nouvelles, protection en cas de crise |

- **Le recrutement** se fait par la famille (les fils, les neveux, les gendres) ou par l'embauche (taverne, Scuola, rachat de contrat), et par les reliques rares (des personnages historiques).
- **La progression** : niveaux 1 à 30, et à chaque palier un choix de compétence entre deux, sans retour.
- **La rareté** : commun, rare, illustre. Aucune n'est jamais vendue.
- **Les places** sont limitées par la Casa : on ne place pas tout le monde, **on compose**.

---

## G. La production en profondeur

- **Trois qualités** : ordinaire, fine, exquise. La qualité dépend du maître, des modules de l'atelier et des intrants. Une commande de la cour paie la qualité exquise trois fois plus cher.
- **Les modules d'atelier** : 1 à 3 emplacements, par exemple outillage (rendement), apprentis (vitesse), maître (qualité), four amélioré (consommation).
- **Les voisinages** : deux ateliers voisins sur l'astre d'un comptoir se donnent un bonus si leur chaîne se suit, par exemple le moulin à côté de la boulangerie. **La disposition du comptoir devient un petit puzzle**, comme le placement dans Anno ou Factorio.
- **Des recettes alternatives** : le même produit fini par deux chemins, selon les intrants disponibles dans la région. On s'adapte aux prix.

---

## H. Un monde qui se découvre et qui menace (secteurs et Cerberus)

- **Le brouillard** : chaque région est découpée en **zones** (côtes, îles, cols) à explorer par un voyage. On y découvre des gisements, des ports francs, des épaves, des **marchés cachés** (un souk qui ne vend qu'aux découvreurs pendant une semaine).
- **Les menaces non joueurs**, l'équivalent de Cerberus :
  - corsaires barbaresques, Uscoques, pirates catalans ;
  - plus tard, les flottes ottomanes.

  Elles **patrouillent les routes de haut niveau**. Un convoi sans escorte suffisante risque une **part de sa cargaison, jamais le navire**. Les menaces sont **plus fortes sur les routes lointaines** : le débutant de Vénétie n'en voit pas. Les vaincre rapporte des reliques et du butin.
- **Les ports francs et les relais** : des ports neutres où plusieurs joueurs peuvent installer un relais commun (la compagnie y bâtit un comptoir partagé). C'est une colonie de guilde, comme les corporations d'Hades' Star.

---

## I. La compagnie, plus profonde (le rôle d'amplificateur, arbitrage B)

S'ajoutent au v3 :
- **le Courrier de compagnie**, qui partage les prix de tous les comptoirs des associés : l'information circule dans la compagnie (§ D) ;
- **le comptoir de compagnie** dans un port franc lointain (§ H) ;
- **les expéditions de compagnie** à paliers 7 à 12, réservées aux compagnies ;
- **la colleganza de compagnie**, un fonds commun qui finance les voyages des associés ;
- **la Contesa** (arbitrage C) : la compagnie y apporte le **ravitaillement** en marchandises et l'**information**. La Terraferme reste à armes égales, et les modules d'armes n'y entrent pas.

---

## J. Ce qui s'ouvre, palier par palier (l'apprentissage en douceur)

La profondeur ne doit pas noyer : comme dans Hades' Star, chaque système **s'ouvre** au bon moment, avec un objectif de guide.

| Casa | Ce qui s'ouvre |
| --- | --- |
| 1–3 | Négoce simple en Vénétie (commandes, mules) ; le Rialto |
| 4 | La Scuola : recherche des **modules de négoce** 1 à 3 ; le premier capitaine |
| 5 | Le 2e chantier ; le burchio et ses 2 emplacements ; **l'exploitation** (salines de Chioggia) |
| 6 | La Lombardie : **un second marché**, et les nouvelles datées (§ D) |
| 7 | L'Arte ; les modules d'atelier, les **qualités** et les maîtres artisans |
| 8 | Le Stato ; le Frioul et l'Istrie ; les **contrats à terme** |
| 9 | **Les armes** : la première galère armée, l'Arsenal privé ; les corsaires sur l'Adriatique |
| 10 | **Les expéditions**, paliers 1 à 3 ; les reliques et leur déchiffrage |
| 11 | **La colleganza** (voyageur et investisseur) ; les ambassadeurs |
| 12 | 2e place de recherche ; Allemagne ou Grèce ; le **brouillard des zones** |
| 14+ | Le Levant, la galea grossa, les paliers d'expédition 4 à 9, les ports francs |
| 18+ | La Flandre ; les paliers 10 à 12 ; la 3e place de recherche |

---

## K. La tournée de 5 minutes, maintenant

Elle n'est plus « récolter et relancer » seulement. On y fait par exemple :
1. tout ramasser ;
2. **lire les nouvelles du jour** : le poivre a baissé à Alexandrie il y a 3 jours, une tempête dans l'Ionienne ;
3. **décider d'une route** : la galère vers Bruges ou vers Tana, sa cargaison, son escorte ;
4. **un gisement frais** est apparu à Pola : y envoyer une équipe ;
5. **un voyage de colleganza** à financer ;
6. un module à lancer en recherche, une relique à déchiffrer ;
7. le soir, une **expédition** de palier 6 avec deux associés.

**Chaque session contient de vraies décisions**, et pas seulement des minuteurs.

---

## L. Une partie, en exemple

*La Maison Morosini, Casa 12, cinq mois après son arrivée, Stato da Mar, Arte des Speziali.*

- **8 h 10, la tournée du matin (4 minutes).**
  - Elle récolte ses raffineries de sucre de Venise : une fournée en qualité fine, grâce à son maître Zuane.
  - Les nouvelles du jour : le poivre a baissé de 12 % à Alexandrie, mais la nouvelle a 4 jours ; une tempête est signalée dans l'Ionienne.
  - Un gisement de sel frais est apparu près de Pola. Elle y envoie son équipe de saulniers (module *Grande campagne* niveau 3).
- **12 h 30, au déjeuner (2 minutes).**
  - Un voyageur de sa compagnie publie une colleganza vers Tana avec la Muda du vendredi : elle y place 4 000 ducats pour les trois quarts du bénéfice.
  - Elle lance la recherche de *Portulan* niveau 5 (2 jours), avec deux plans tirés d'une relique.
- **20 h, la Sera (10 minutes).**
  - Elle gagne une place dans la Muda de Beyrouth à l'incanto.
  - Sa galea grossa part avec deux modules choisis pour l'occasion : *Cale* et *Pavillon neutre*, parce que la route passe près d'une zone de guerre.
- **21 h, l'expédition (12 minutes).**
  - Avec deux associés, elle tente le palier 6 des épaves ioniennes.
  - Elle perd un navire d'escorte, sans conséquence au-delà de la partie, et rapporte un codex grec et une icône.
  - Le codex sera déchiffré demain, l'icône vendue au Rialto à un collectionneur.
- **Le dimanche**, sa galère revient de Beyrouth.
  - Le coton se vend 40 % au-dessus de son prix d'achat à Venise.
  - Elle livre une commande à terme signée il y a 20 jours.
  - Les salaires prélèvent 14 % de la recette.

**Chaque session contenait une décision.**

## M. Ce qui protège la simplicité

- **On n'ouvre pas tout d'un coup** (§ J). Un joueur de la première semaine ne voit que le négoce de Vénétie.
- **Chaque système a son écran et un seul geste en or**, selon la direction Lagune : l'astre d'un navire montre ses emplacements de modules, et l'expédition a sa carte.
- **Rien n'est obligatoire.** Un pur négociant peut ignorer les armes et vivre de l'arbitrage et de la colleganza. Un pur combattant peut vendre ses reliques.
- **Le facteur automatise le routinier** (relancer, honorer les commandes simples) à mesure que l'empire grandit, comme l'automatisation méritée d'Hades' Star.

## N. Les équivalences avec Hades' Star, en un tableau

| Hades' Star | Fondaco |
| --- | --- |
| Planètes, système d'origine | Comptoirs, Vénétie |
| Transports et modules de commerce | Navires et convois marchands, modules de négoce |
| Mineurs et hydrogène | Équipes d'exploitation et gisements ; le pain des troupes et le biscuit des galères comme carburant |
| Cuirassés, armes, boucliers, soutiens | Galères armées et condottieri, modules d'armes, de défense et de soutien |
| Red Stars et artefacts | Expéditions à paliers et reliques |
| Blue Stars | La partie rapide (l'ancienne Condotta) |
| White Stars | La Contesa (sur la Terraferme, à armes égales) |
| Cerberus | Corsaires, Uscoques, flottes ottomanes |
| Secteurs et brouillard | Zones de chaque région, marchés cachés, ports francs |
| Corporation | Compagnia, comptoir de compagnie, Courrier |
| Influence (appariement) | Puissance |
| Cristaux payants qui accélèrent | **Refusés** : on ne vend jamais de temps |
