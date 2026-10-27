# Audit de rétention et propositions de rupture (27 octobre 2026)

Demande du porteur : un audit complet du jeu par un expert du jeu mobile. Il porte sur les modes de jeu, l'évolution du joueur, l'envie de rouvrir l'application le lendemain et l'envie de devenir « le meilleur ». Constat du porteur : le jeu tourne autour de la Terraferme et du comptoir de livraison, il y a peu de lien entre les deux, peu d'objectifs d'évolution et pas de vraie envie de dominer. Le porteur autorise à contourner les règles en place et veut une révolution du genre, pas un jeu « classique ».

Lu pour cet audit : `docs/CADRAGE.md`, `docs/plan-terraferme.md`, `docs/plan-progression.md`, `docs/plan-livraisons.md`, `docs/recommandations-2026-10-20.md`, `docs/expertise-2026-10-24.md`, `docs/propositions-design-2026-10-25.md`, `docs/calibration.md` (mesures du 26 octobre), `IDEAS.md`, les réglages de Venise (`venice1450.settings.ts`) et les écrans de `apps/web/src/game`.

**Rien n'est codé.** Ce document attend les décisions du porteur, comme le veut CLAUDE.md.

---

## 1. Le verdict en une page

Fondaco est un moteur économique remarquable habillé d'une très belle direction artistique. Mais il n'a **pas encore de fantasme central**.

Le joueur ne sait pas ce qu'il est en train de devenir. Il remplit des commandes, il conquiert des hexagones, et ces deux activités ne se nourrissent presque pas l'une l'autre. Le mois repart de zéro. L'Influence, seule chose qui dure, n'achète aujourd'hui qu'un nom doré. Et « être premier », c'est être premier en *ventes nettes*, un chiffre que personne ne voit dans le monde.

Le jeu fait revenir **par obligation** : minuteries, vagues de commandes, coffre quotidien, ballots. Il ne fait pas encore revenir **par désir** : curiosité de la suite, rivalité personnelle, peur de perdre ce qu'on a, envie d'être vu.

La proposition de fond tient en une phrase :

> **Fondaco doit devenir le premier jeu où l'économie *est* la guerre.** Une seule carte, une seule ambition : faire de sa Maison la première de Venise, et de soi-même le Doge. Chaque mois est une partie qu'on rejoue avec un nouveau jeu en main, et la Maison s'écrit de génération en génération.

Les trois leviers les plus forts, à faire en premier :
1. **La guerre mange les marchandises** (R1) et **les villes se prennent aussi par le commerce** (R2). Les deux modes deviennent un seul jeu.
2. **Le Lustre** (R6), une échelle de rang à la Clash Royale, jouable même à faible population. **Le Doge** (R7), une couronne unique et visible. Avec eux, « être le meilleur » devient concret.
3. **Les Atouts** (R3), un tirage à la roguelite chaque semaine, et **la Dynastie** (R4). Chaque mois devient différent, et la Maison a enfin une progression à long terme.

---

## 2. Le diagnostic

### 2.1 Ce qui est excellent, à garder absolument

| Atout | Pourquoi c'est rare |
| --- | --- |
| Un vrai moteur d'économie (grand livre, carnet, Dogana qui suit l'offre) | Presque aucun jeu mobile n'a une économie honnête et mesurée. C'est la fondation qui rend possibles les propositions ci-dessous |
| Des saisons d'un mois civil | Le meilleur remède connu contre « les vétérans écrasent les nouveaux » |
| Aucune vente de puissance | Argument d'acquisition fort auprès des joueurs de Travian, d'OGame et de Forge of Empires, échaudés |
| La Terraferme à la OpenFront, asynchrone | Un front lancé en 3 minutes qui avance seul : une très bonne idée de jeu mobile |
| Le jeu dort de 22 h à 8 h | Le respect du joueur adulte est un argument de rétention à long terme |
| La direction Lagune : les astres, l'orbite, une seule action en or | Une identité visuelle singulière dans le genre |
| La Condotta, les compagnies, le mutateur du mois, la série clémente | Les bons instincts du lot 2 |

### 2.2 Les sept problèmes de fond

#### P1. Deux jeux posés côte à côte

Voici ce qui circule aujourd'hui entre le commerce et la Terraferme :

| Du commerce vers la Terraferme | De la Terraferme vers le commerce |
| --- | --- |
| Des ducats, détruits, pour relever le maximum de troupes (+20 pour 100 d, trois fois par jour) et bâtir un Fort | Les paysans : un peu de blé, d'argile et de bois |
| | 3 d par heure ouverte pour deux villes reliées à la capitale |
| | Le décret du Signore, pour un seul joueur par semaine |
| | La Gloire, qui donne de l'Influence (qui n'achète qu'un nom doré) |

La Terraferme ne **consomme aucune marchandise**. Le commerce n'a donc **aucune raison** d'aller la nourrir, et la guerre ne change rien au marché. On joue à deux jeux sur deux calques, avec deux classements (les ventes nettes et la Gloire). En plus, elle s'ouvre seulement après la première journée de commerce : elle est vécue comme un mode à part.

#### P2. La croissance s'arrête au jour 5

L'équipe d'experts l'a mesuré : **le revenu plafonne dès J+5, car la demande est fixe**. Les fondaci devaient corriger ce défaut. Mesurés le 26 octobre, ils n'y arrivent pas : le rapport du revenu de la Lombardie (semaine III) à celui de l'Installation (semaine I) vaut **0,97 à 1,08**, pour une cible de 1,20.

Au bout de cinq jours, le joueur a donc atteint son régime de croisière. Les trois semaines suivantes répètent la même session. C'est exactement « le jeu devient vite redondant », le constat d'octobre du porteur, et il n'est toujours pas résolu.

#### P3. Rien ne dure, donc rien ne se construit

| Ce qui dure entre les saisons | Ce que ça apporte |
| --- | --- |
| Niveau permanent | Honorifique, aucun effet |
| Renommée et titres | Honorifiques |
| Palmarès | Une liste |
| Influence (128 à 137 par saison au médian) | **Un seul privilège au catalogue : le nom doré, à 40.** Le catalogue est épuisé avant la fin de la première saison |
| Grade de la Condotta, cote Elo | Affichés au profil |

Le plan de progression (`plan-progression.md`) est bon sur le papier : Levant, Lombardie, Frioul, laine, verre. Mais ce contenu n'existe pas. La Maison « qui dure » est aujourd'hui une coquille vide. Un joueur à J30 n'a aucune raison d'attendre le 1er du mois suivant.

#### P4. Être le meilleur ne se voit pas et ne se ressent pas

- Le classement porte sur les **ventes nettes**, un chiffre comptable. Personne ne voit dans le monde que tel joueur est premier.
- **Une quarantaine de maisons PNJ** occupent le classement. Battre un ordinateur ne donne aucune fierté.
- Les récompenses du podium sont des semaines de **Pass**, et le Pass est désactivé.
- Il n'y a **pas de rival nommé** avec un enjeu. Le « rival de la semaine » est une ligne sous le rang, sans conséquence.
- La seule couronne visible, le Signore, est hebdomadaire et ne concerne que la Terraferme.

Les jeux qui donnent envie d'être le meilleur rendent la position **visible**, **rare**, **contestée** et **perdable**. Fondaco n'a aujourd'hui aucune des quatre.

#### P5. Revenir par obligation, pas par désir

Voici le classement des raisons de rouvrir l'application aujourd'hui, selon le moteur psychologique de chacune :

| Raison de revenir | Moteur | Force à J30 |
| --- | --- | --- |
| Récolte prête, file de 8 h | Minuterie (corvée) | Faible : on finit par la vivre comme une tâche |
| Vagues de commandes (8, 11, 14, 17, 20 h) | Minuterie et peur de rater | Moyenne |
| Coffre du jour et série | Habitude | Faible à moyenne, s'use |
| Ballots de Faraj | Butin aléatoire | Faible (rien d'enjeu) |
| Missions de la semaine | Liste à cocher | Faible |
| Galères de la Muda | Rendez-vous | Moyenne |
| Heure de bataille de 20 h | **Rendez-vous social** | Forte, mais seulement sur la Terraferme |
| Front attaqué | **Quelqu'un m'a fait quelque chose** | Forte, mais seulement sur la Terraferme |
| La suite d'une histoire | Curiosité | **Absente** |
| Un rival qui m'a dépassé | Rivalité personnelle | **Absente** |
| Ma position menacée | Peur de perdre | **Absente** dans le commerce |
| Mes amis m'attendent | Obligation sociale | Faible (compagnies sans enjeu) |

Les trois moteurs les plus puissants à long terme sont la **curiosité**, la **rivalité** et l'**obligation sociale**. Ce sont précisément les plus faibles du jeu.

#### P6. Trop de systèmes, chacun pèse peu

Inventaire des systèmes en jeu, ou presque : production, rations, ateliers et manufactures, chaînes de luxe, maîtrises, livraisons, véhicules, fattore, tableau commun et urgentes, commandes du Doge, fondaci, fournisseurs officiels, appels d'offres, Arsenal de la semaine, Dogana, Rialto et offres, commandes entre marchands, colleganza, galères de la Muda, événements, actes, mutateurs, ballots, coffre, tâches, missions, Influence, privilèges, Terraferme (fronts, forts, ports, bombardes, remparts, paysans, nations, diplomatie, semaine en équipes), heure de bataille, escarmouches, Condotta, compagnies, rival, Renommée, niveau, palmarès.

C'est **plus de trente systèmes** pour des sessions de 3 à 5 minutes. Chacun a été ajouté pour corriger un manque de sens. Aucun n'est devenu le cœur. Le joueur ne retient pas de règles ; il retient une **promesse**. Il faut moins de systèmes, et plus profonds.

#### P7. Le garde-fou est devenu le game design

Les règles d'équité sont saines, mais elles ont fini par écrire le jeu. Partout on trouve des plafonds : écart de 5 % pour le Pass, de 15 % pour la Maison complète, de 150 % entre assidus et occasionnels. Les décrets sont bornés à 15 % du revenu. Presque chaque dépense est détruite, et l'Influence est plafonnée par semaine. Le résultat est un jeu où **rien ne se sent puissant**. Or le fantasme de puissance est le carburant du genre.

La bonne équité est **l'équité des chances au départ** : le 1er du mois, tout le monde repart à 1 000 ducats. Elle n'exige pas d'écraser les écarts en cours de partie. Dans une partie d'un mois, un joueur brillant **doit** pouvoir dominer. C'est ce que les autres veulent voir et devenir.

### 2.3 La note

| Critère | Note | Commentaire |
| --- | --- | --- |
| Session de 3 minutes | 7/10 | Fluide, une action en or, « Tout récolter et relancer » |
| Premier jour (D1) | 6/10 | Guide soigné, mais le joueur ne sait pas ce qu'il vise |
| Première semaine (D7) | 5/10 | Le plateau du J+5 arrive tôt |
| Premier mois (D30) | 3/10 | Rien à attendre de la saison suivante |
| Profondeur, maîtrise | 8/10 | Le moteur est riche |
| Lisibilité | 5/10 | Trop de systèmes, malgré la Lagune |
| Social | 4/10 | Alliances d'une semaine, compagnies sans enjeu |
| Fantasme de puissance, envie d'être premier | 2/10 | Le point le plus faible |
| Originalité | 6/10 | Les briques sont originales, le tout ressemble encore au genre |

---

## 3. La thèse : trois piliers

1. **Une seule carte, une seule économie.** Le commerce produit, la guerre consomme, les villes se prennent des deux façons. On joue soit marchand, soit condottiere, soit les deux, mais toujours au même jeu, et chacun a besoin de l'autre. C'est la leçon d'*EVE Online* : la guerre fait vivre l'industrie.
2. **Une saison est une partie.** Chaque mois a son arc, ses choix de build (les Atouts), sa montée en puissance de semaine en semaine et sa finale (l'élection du Doge). On le joue comme une partie de roguelite, pas comme un emploi.
3. **Une Maison qui s'écrit.** Entre les saisons, on ne garde pas la puissance mais **l'identité** : une lignée, un palais au Grand Canal, un rang dans le Lustre, une collection d'Atouts. Ce qui dure, c'est **la variété** et **la gloire**, jamais la force.

---

## 4. Les propositions

Pour chaque proposition, on trouve : quoi, pourquoi, inspiration, règle du projet levée, garde-fou, et ce qu'on mesure.

### R1. La guerre mange les marchandises

**Quoi.**
- Sur la Terraferme, les troupes **mangent du pain** : leur entretien est par exemple 1 pain pour 10 troupes par jour ouvert. Sans pain, le recrutement s'arrête.
- Lever des troupes coûte du **pain** et des **ducats**. Un Fort coûte des **briques**, des remparts des **planches**, une bombarde du **bois** et des **planches**.
- Pendant l'heure de bataille, un front consomme du pain à chaque pas.
- Le maximum de troupes ne s'achète plus en ducats seuls : il se nourrit.

**Pourquoi.** C'est **la réponse directe à P1 et P2**. La guerre devient le grand puits de marchandises qui manquait :
- le revenu des producteurs ne plafonne plus au J+5, puisque la demande grandit avec la guerre ;
- le prix du pain bouge avec les fronts, ce qui donne des coups à jouer au Rialto ;
- un joueur pacifique s'enrichit en **fournissant** les belligérants : c'est le rôle du marchand d'armes ;
- un belligérant doit commercer, ou acheter au Rialto, pour faire la guerre.

**Inspiration.** *EVE Online* : chaque vaisseau détruit est une commande pour un industriel. *Travian* : les troupes mangent du blé.

**Règle levée.** Aucune règle de CLAUDE.md, seulement des décisions de Terraferme (« le maximum de troupes ne monte qu'avec les ducats »).

**Garde-fou.**
- Les rations militaires passent par le journal des stocks, comme les rations d'atelier.
- La Dogana vend du pain sous plafond, pour qu'un belligérant ne soit jamais pris en otage par un monopole.

**Mesure.** Ratio Lombardie / Installation ≥ 1,20 (la cible manquée des fondaci) ; part du pain consommé par la Terraferme ; cours du pain pendant les heures de bataille.

### R2. Les villes se prennent aussi par le commerce : la Signoria des villes

**Quoi.** Chaque ville de la carte (les sept du commerce et celles de la Terraferme) a un **Podestà** : la Maison qui la contrôle. On en prend le contrôle **de deux façons, sur la même jauge** :
- **par le commerce** : chaque unité livrée à la ville, par commande, fondaco ou Arsenal, ajoute à sa part d'influence locale ;
- **par les armes** : tenir la ville sur la Terraferme ajoute une part fixe chaque heure ouverte, et l'assiéger fait baisser celle du Podestà.

Le Podestà de la semaine reçoit trois choses :
- les commandes de la ville **une demi-heure avant tout le monde** ;
- un petit **droit de porte** sur les livraisons des autres (2 à 4 %, un transfert entre joueurs, pas une création) ;
- son **blason sur la ville**, visible par tous sur la carte du commerce.

La jauge se dispute **tous les jours**. On la voit en direct dans la ville en orbite : « Morosini 41 % · vous 33 % · Dandolo 12 % ».

**Ce qu'elle fusionne.** Les fournisseurs officiels, les fondaci et la tenue des villes de la Terraferme deviennent **un seul système**, qui se lit d'un regard.

**Pourquoi.**
- Le lien entre les modes devient **évident** : livrer à Padoue et assiéger Padoue servent le même but.
- Chaque commande livrée a un **enjeu au-delà de son prix**.
- On obtient un rival nommé (« Morosini vous a repris Padoue ») et une notification qui fait revenir.

**Inspiration.** Les points de contrôle de *Planetside* et de *Foxhole* ; l'influence de faction d'*Elite Dangerous* (on la fait bouger par le commerce, les missions ou le combat).

**Règle levée.** Le Podestà prend une part sur les autres : un avantage réel pendant la saison (voir P7).

**Garde-fou.**
- Une Maison tient **trois villes au plus**.
- Les nouveaux venus ne paient pas le droit de porte pendant 3 jours.
- La nuit, la jauge est gelée.

**Mesure.** Changements de Podestà par semaine (cible : chaque ville change au moins une fois) ; part des joueurs qui tiennent une ville au moins un jour.

### R3. Les Atouts : chaque saison est une partie à jouer autrement

**Quoi.**
- Chaque lundi, le joueur **choisit un Atout parmi trois** cartes tirées : quatre Atouts en fin de mois. Ce sont des **personnages de Venise** qui plient une règle pour lui :
  - *Le Banquier du Rialto* : vos offres au Rialto ne paient pas de taxe, mais vous ne pouvez plus vendre à la Dogana ;
  - *Le Patriarche* : les églises commandent du vin et de la cire, et vous seul pouvez les livrer ;
  - *Le Capitaine de galère* : vous achetez à la Muda avant tout le monde, mais un seul lot ;
  - *L'Ingénieur de l'Arsenal* : vos forts coûtent des planches au lieu de briques, et vos bombardes tirent deux fois ;
  - *La Courtisane* : vous voyez les offres cachées d'un rival chaque jour ;
  - *Le Gondolier* : une livraison par jour vers Venise ne prend pas de mule.
- Les Atouts **se combinent** : les combinaisons font les « builds » dont on parle sur Discord.
- Entre les saisons, on **débloque** de nouveaux Atouts dans sa réserve de tirage, par des exploits : tenir une ville 7 jours, finir dans le top 10 du Lustre, remplir l'Or de l'Arsenal.

**Pourquoi.**
- Chaque mois **se joue différemment**, ce qui répond au « redondant ».
- On a des décisions de build dont on discute, et on veut retrouver la combinaison qu'on a ratée.
- On obtient enfin une **progression à long terme sans puissance** : débloquer, c'est élargir ses choix, pas devenir plus fort.

**Inspiration.** Les jokers de *Balatro* ; le tirage de cartes et les déblocages de *Slay the Spire* ; les talents d'*Hades*.

**Règle levée.** Les maîtrises se fondent dans les Atouts (une maîtrise devient un Atout de départ). Il y a aussi des réglages par joueur, toujours dans `worlds.settings` (le catalogue des Atouts y vit).

**Garde-fou.**
- Chaque Atout est **un échange** : il donne et il retire.
- Le simulateur mesure chaque Atout seul, et aucun ne doit dépasser +10 % à activité égale.
- Le nouveau tire dans une réserve de départ de 12 Atouts, tous viables.

**Mesure.** Diversité des choix (aucun Atout pris par plus de 25 % des joueurs) ; rétention de la semaine 2 à la semaine 4.

### R4. La Dynastie : chaque saison est une génération

**Quoi.**
- Le joueur ne joue plus « un compte », il joue **une lignée**. Chaque saison, il incarne un membre de sa Maison : *Marco Morosini, 1450*.
- À la clôture, il **désigne un héritier** : il choisit un **trait** parmi ceux qu'il a mérités dans la saison.
  - Exemples : « Né sur les quais » (vous connaissez les galères, et la Muda vous montre son lot une heure plus tôt), « Fils de condottiere » (votre camp de départ peut se poser au deuxième jour), « Élevé au Rialto ».
  - Chaque trait apporte **une option, jamais du rendement**.
- Le **portrait** de chaque génération s'accroche dans la galerie du palais. L'**arbre** de la lignée se lit au profil.
- Une saison ratée fait aussi une histoire : « Pietro le Ruiné, 1452 ».

**Pourquoi.**
- C'est enfin une **raison d'attendre le 1er du mois** : on veut voir son héritier jouer.
- Le reset devient **narratif au lieu d'être punitif**. On ne perd pas sa fortune ; on la lègue à l'histoire.
- C'est un objet émotionnel qu'on montre : le portrait, la lignée.

**Inspiration.** L'héritier aux traits de *Rogue Legacy* ; la dynastie de *Crusader Kings* ; la « Maison » de l'actuel `plan-progression.md`, enfin remplie.

**Règle levée.** Aucune (pas de puissance transmise).

**Garde-fou.** Un seul trait actif ; aucun trait ne touche aux quantités, aux prix ni au temps de production.

**Mesure.** Retour au J1 de la saison suivante (cible ≥ 60 % des joueurs actifs à J30).

### R5. Le Grand Canal : la gloire qui se voit et qui se perd

**Quoi.**
- Une **carte persistante, commune à tous** : le Grand Canal, avec **40 emplacements de palais**, du Rialto à San Marco.
- Le classement final de chaque saison **redistribue** les emplacements. Le premier choisit le sien, puis le deuxième, etc. Un emplacement se garde tant qu'on reste dans les 40, et il **se perd** si l'on en sort.
- La façade du palais s'orne de ce qu'on a gagné : pièces de la Dynastie, Atouts débloqués, villes tenues, couronne du Doge.
- Le Grand Canal est **le premier écran que voit tout joueur au lancement de l'application** : la vitrine des meilleurs.
- Hors des 40, chacun a sa maison dans un **sestiere** (Cannaregio, Castello, Dorsoduro…), visible quand on zoome.

**Pourquoi.**
- La gloire devient **rare** (40 places), **visible** (premier écran), **contestée** (redistribuée chaque mois) et **perdable**. Ce sont les quatre conditions de P4.
- C'est aussi un argument d'acquisition : une image superbe à partager.

**Inspiration.** La propriété de systèmes d'*EVE Online* ; le Hall of Fame des arcades ; les maisons visibles de *Animal Crossing*.

**Règle levée.** Une couche de compte persistante qui affiche le rang des joueurs : purement cosmétique.

**Garde-fou.** Les PNJ n'occupent jamais d'emplacement.

**Mesure.** Ouvertures de la fiche d'un palais ; partages de l'image du Grand Canal.

### R6. Le Lustre : une échelle de rang qui marche même à 30 joueurs

**Quoi.**
- Chaque semaine, le joueur est opposé à **un adversaire de son rang**, pour une **Sfida** : celui qui fait le plus de ventes nettes dans la semaine, ou de Gloire, au choix du défi tiré.
- Le gagnant prend des **points de Lustre** au perdant, comme les trophées de *Clash Royale*.
- Les paliers sont les **rangs sociaux de Venise** : Popolano, Cittadino, Mercante, Patrizio, Senatore, Procuratore di San Marco. Chaque palier a son blason, son cadre de portrait et sa place à la messe de San Marco (cosmétique).
- **Faible population** : si personne de son rang n'est libre, on affronte le **fantôme** d'un vrai joueur. C'est sa semaine passée, rejouée heure par heure : on voit sa courbe monter face à la sienne. Plus besoin de 60 humains pour les ligues (IDEAS.md).
- **Remise partielle** à chaque saison : on redescend de deux paliers, pas à zéro.
- On peut aussi lancer **un défi direct** à un joueur nommé, avec une mise de Lustre : « Je défie Morosini ».

**Pourquoi.**
- C'est l'échelle qui donne envie d'être le meilleur : un chiffre qui monte, un palier à atteindre, un adversaire au visage connu, et la peur de redescendre.
- Elle **transforme les ventes nettes**, chiffre abstrait, en duels compréhensibles.
- Le fantôme résout la faible population **dès le lancement**.

**Inspiration.** Trophées et arènes de *Clash Royale* ; fantômes de *Trackmania* et de *Mario Kart* ; défis asynchrones de *Words With Friends*.

**Règle levée.** Le seuil de 60 humains des ligues (IDEAS.md).

**Garde-fou.** Les fantômes viennent seulement d'humains. Le Lustre n'a aucun effet économique.

**Mesure.** Sessions par jour pendant une Sfida serrée ; part des joueurs qui lancent un défi direct.

### R7. Le Doge : une couronne unique, une finale de saison

**Quoi.**
- La **dernière semaine** de chaque mois devient **l'élection du Doge**. Les 10 premières Maisons sont candidates.
- Les voix se gagnent par le **broglio**, les intrigues de couloir : villes tenues (chaque Podestà vote), Influence dépensée, alliances. Les autres joueurs **vendent leur voix** à un candidat contre une promesse publique, comme un décret, une part de droit de porte ou un partage.
- Le Doge élu **gouverne le mois suivant** :
  - il choisit le **mutateur** parmi trois ;
  - il fixe **un décret** de la République pour tout le mois ;
  - son **portrait est sur l'écran de connexion de tous les joueurs** pendant un mois ;
  - son palais occupe le palais des Doges sur le Grand Canal.
- Il peut aussi être **destitué** à mi-mois par un vote du Conseil des Dix (les 10 premiers du Lustre), s'il abuse.

**Pourquoi.**
- Le mois gagne une **finale**, un arc qui monte vers un sommet. C'est ce qui manque aux actes actuels, qui sont des modificateurs.
- La récompense est **un pouvoir réel et une visibilité totale**, le fantasme le plus fort du genre : « Je suis le Doge ».
- La dernière semaine génère de la **diplomatie entre humains**, donc des messages, des trahisons et des histoires racontées sur Discord.

**Inspiration.** La merveille de fin de serveur de *Travian* ; l'élection de *Diplomacy* et de *Werewolf* ; le vrai broglio vénitien.

**Règle levée.** « Règles stables pendant une saison » : le décret du Doge est **annoncé avant le 1er** et vaut tout le mois, donc la règle est tenue. Le déclencheur « 50 votants » d'IDEAS.md est levé, car les PNJ ne votent pas mais les Podestà comptent.

**Garde-fou.**
- Un décret du Doge est pris dans un catalogue mesuré au simulateur.
- Le Doge ne peut pas se représenter le mois suivant (la *contumacia* vénitienne).

**Mesure.** Part des joueurs actifs qui votent ; messages pendant la semaine d'élection.

### R8. Le Broglio : l'information est une marchandise

**Quoi.**
- Aujourd'hui, la gazette annonce les événements **à tous**, la veille. On la remplace par des **rumeurs privées**.
- Chaque matin, chaque joueur reçoit **deux rumeurs** : « On dit qu'une disette frappera Vérone jeudi », « Les galères de la Muda auront du retard ».
  - Certaines sont **vraies**, d'autres **fausses**, avec une fiabilité affichée selon la source (« un gondolier », 40 % ; « un secrétaire du Sénat », 85 %).
- Les rumeurs **s'échangent et se vendent** entre joueurs. On peut aussi **en inventer une fausse** et la mettre en circulation, ce qui coûte de l'Influence ; un menteur démasqué perd du Lustre.
- Un **espion** posté chez un rival montre une fois par jour une de ses offres ou de ses fronts.

**Pourquoi.**
- C'est la vraie rupture dans le genre : aucun jeu de commerce ne fait de **l'information** une ressource jouable entre joueurs.
- Chaque matin a **sa surprise personnelle**, donc une raison d'ouvrir l'application.
- On y gagne de la parole entre joueurs, de la méfiance et des coups montés : de l'**histoire**.

**Inspiration.** Le marché de l'information de *Diplomacy* ; *Offworld Trading Company* (espionnage, coups montés) ; le vrai Rialto, qui vivait de nouvelles.

**Règle levée.** « Tout est public, rien de caché sur la carte » (IDEAS.md).

**Garde-fou.**
- Les tirages viennent du secret du monde, et le serveur sait toujours ce qui est vrai.
- Une fausse rumeur ne peut pas viser un joueur nommé.
- Le nouveau venu n'a que des sources fiables pendant 3 jours.

**Mesure.** Rumeurs échangées par joueur et par jour ; ouverture des Avis le matin.

### R9. Les parts de Maison : la prise de contrôle hostile

Proposition la plus radicale, à faire **après** les autres.

**Quoi.**
- Dès la semaine II, chaque Maison est **cotée au Rialto** : 100 parts, dont 49 en circulation, émises par la Maison elle-même pour lever des ducats.
- Les autres achètent et vendent ces parts. Détenir des parts d'une Maison donne une **part de ses ventes nettes** de la semaine, comme la colleganza aujourd'hui, mais échangeable.
- Une Maison peut **racheter ses propres parts** pour se protéger.
- Qui détient **plus de 30 %** d'une Maison siège à son conseil et voit ses comptes.

**Pourquoi.**
- Un rival devient **une cible qu'on achète**, pas seulement qu'on dépasse.
- Le Rialto gagne un actif vivant, dont le cours suit **la réputation des joueurs**.
- On peut parier sur les autres : « J'ai investi dans Morosini, je veux qu'il gagne Padoue. »

**Inspiration.** *Offworld Trading Company*, qui se gagne par le rachat des concurrents.

**Règle levée.** « Pas de transfert de classement entre joueurs » : la colleganza en fait déjà un.

**Garde-fou.**
- Le contrôle total (plus de 50 %) est **impossible** : 51 parts restent toujours au fondateur.
- Il n'y a pas de cotation avant le jour 8 ni pour un joueur arrivé depuis moins de 7 jours.
- Les parts sont soldées le dernier jour du mois.

**Mesure.** Volume des parts échangées ; plaintes (signalements) ; rétention des joueurs cotés.

### R10. La Lettre du jour : un fil rouge qui donne envie de lire la suite

**Quoi.**
- Chaque jour, **une seule carte de décision** arrive d'un personnage récurrent : Faraj d'Alexandrie, Lorenzo, la veuve Contarini, un cardinal, un espion milanais.
- Deux choix, d'un geste à gauche ou à droite. Les conséquences arrivent **le lendemain ou plus tard** : « Faraj vous demande d'avancer 200 d pour une cargaison de soie. Il reviendra dans trois jours… peut-être. »
- La Lettre de la saison raconte **une histoire en 30 épisodes**, différente selon les choix. Elle se termine le dernier jour par une conclusion propre à la Maison.
- **Chaque soir, la session se termine sur une question ouverte** : « Demain à 9 h, le navire de Faraj sera en vue. »

**Pourquoi.**
- La **curiosité** est le moteur le plus puissant et le moins fatigant de la rétention à J1. C'est le moteur absent de P5.
- La Lettre ne coûte pas de population et marche seul.
- Elle donne un visage au monde, aujourd'hui fait de règles et de chiffres.

**Inspiration.** *Reigns* (le choix d'un geste, des conséquences longues) ; *Fallen London* (les storylets) ; les épisodes de *Choices*.

**Règle levée.** Aucune.

**Garde-fou.** Les gains en ducats ou en marchandises de la Lettre sont bornés comme les ballots (mesurés au simulateur). L'écriture est un coût de contenu, à prévoir.

**Mesure.** Retour à J1 et à J2 ; part des Lettres ouvertes avant midi.

### R11. La Sera : un rendez-vous par jour où tout se joue

**Quoi.** De 20 h à 20 h 30 (heure de Paris), le moment fort de la journée réunit :
- l'**heure de bataille** de la Terraferme, raccourcie à 30 minutes ;
- l'**incanto** : la vente aux enchères en direct des galères de la Muda, qui remplace le prix croissant actuel. Trois lots, des enchères de 3 minutes, et les autres voient qui enchérit ;
- les **résultats du jour** : les villes qui changent de Podestà, la Sfida du jour dans le Lustre et la Lettre du soir.

**Pourquoi.**
- Un rendez-vous **synchrone** crée la présence des autres : on les voit enchérir.
- C'est un moment qu'on raconte, et le pic de connexion se concentre là, ce qui compte à faible population.
- C'est la vraie version, à Venise, de l'enchère des galères, déjà dans IDEAS.md (phase 4 des familles).

**Inspiration.** *HQ Trivia* (le rendez-vous de 21 h) ; les journées communautaires de *Pokémon GO* ; les guerres de clans à heure fixe.

**Règle levée.** Aucune ; la nuit commence toujours à 22 h.

**Garde-fou.** L'absent de la Sera ne perd rien de ce qu'il a : il manque seulement une occasion. Un ordre d'enchère maximum peut être laissé d'avance.

**Mesure.** Part des actifs présents à la Sera ; enchères par lot.

### R12. Le grand ménage : moins de systèmes, plus profonds

Le principe : chaque proposition ci-dessus **en absorbe d'autres**. Le jeu cible compte une dizaine de systèmes visibles, au lieu de plus de trente.

| Aujourd'hui | Devient |
| --- | --- |
| Fournisseurs officiels, fondaci, entrepôts, tenue des villes sur la Terraferme | La Signoria des villes (R2) |
| Maîtrises, chaînes de luxe ouvertes par les titres, manufactures (voie choisie) | Les Atouts (R3) |
| Ballots de Faraj, coffre du jour, tâches du jour | La Lettre du jour (R10), qui peut contenir un ballot |
| Missions de la Maison et privilèges | Les déblocages d'Atouts, la Dynastie et le Grand Canal (R3, R4, R5) |
| Gazette publique, événements | Le Broglio (R8) ; les grands événements restent publics |
| Appels d'offres du Doge, prix croissant de la Muda | L'incanto de la Sera (R11) |
| Signore de la semaine, décret, actes | Le Doge du mois (R7) ; le Signore devient le premier de la Terraferme de la semaine, sans décret |
| Classement des ventes nettes, rival, Renommée, niveau | Le Lustre (R6) ; les ventes nettes restent le score de la saison |
| Escarmouches classées | Gardées, elles alimentent le Lustre |
| Commandes entre marchands, colleganza | Les parts de Maison (R9), plus tard |

À **retirer** de l'écran du joueur : le nom doré seul au catalogue, la Renommée comme chiffre, le niveau permanent sans effet.

---

## 5. La boucle cible, à toutes les échelles

| Échelle | Ce que fait le joueur | Pourquoi il revient |
| --- | --- | --- |
| 3 minutes | Récolter, livrer à la ville qu'on dispute, nourrir son front, lire la Lettre | La jauge de la ville a bougé, une rumeur arrive |
| La journée | Trois ou quatre sessions, puis la Sera à 20 h | L'enchère, la bataille, la Sfida, et la question ouverte du soir |
| La semaine | Choisir son Atout le lundi, disputer ses villes, gagner sa Sfida | Le palier du Lustre, le Podestà de la semaine |
| Le mois | Monter en puissance, puis l'élection du Doge | La couronne, l'emplacement au Grand Canal |
| Les années | La Dynastie, les Atouts débloqués, le rang au Lustre | Voir l'héritier jouer, compléter la galerie, remonter au Lustre |

## 6. Le parcours d'un joueur, raconté

- **J0.** Giulia choisit les Dolomites. La première Lettre arrive, de Faraj. Elle lance sa scierie et livre Trévise. La jauge de la ville affiche « vous 4 % ». Le soir, une question ouverte : « Un charpentier de l'Arsenal veut vous parler demain. »
- **J1.** Elle revient pour la Lettre. Elle découvre qu'un condottiere voisin achète des planches pour ses remparts : elle vend au Rialto 20 % au-dessus de la référence. Première Sfida : face au fantôme de « Tomaso », elle perd de peu.
- **J4.** Morosini tient Trévise. Giulia y livre chaque jour pour la reprendre, et pose son camp sur la Terraferme pour l'assiéger. Les deux modes servent le même but.
- **J7.** Elle tire son deuxième Atout, *l'Ingénieur de l'Arsenal*. Son build « planches et remparts » prend forme. Elle passe Cittadino au Lustre.
- **J21.** Podestà de Trévise et de Vicence, elle vend ses deux voix au candidat Dandolo contre la promesse d'un Calmiere sur les briques.
- **J30.** Dandolo est élu Doge. Giulia finit 23e et prend son premier emplacement au Grand Canal. Elle désigne son héritier, « Élevée au Rialto ». Elle débloque *la Courtisane*.
- **J31.** Elle revient le jour même, pour voir son héritier commencer et pour avoir tiré la Courtisane.

## 7. Les règles du projet que ces propositions lèvent

| Règle | Proposition | Pourquoi la lever |
| --- | --- | --- |
| Écarts plafonnés en cours de saison (≤ 15 % pour la Maison complète, décrets ≤ 15 % du revenu) | R2, R7, R9 | La puissance en cours de partie est le carburant du genre. L'équité se garde au départ de chaque mois (P7) |
| « Le maximum de troupes ne monte qu'avec les ducats » | R1 | La guerre doit consommer des marchandises |
| Rien de caché | R8 | L'information devient une ressource |
| Seuils d'IDEAS.md (60 humains pour les ligues, 50 votants pour le Doge) | R6, R7 | Les fantômes et les Podestà rendent ces modes jouables tout de suite |
| Le social sans pouvoir économique | R7, R9 | Les voix et les parts sont des leviers entre joueurs, bornés |
| Gel des mécaniques hors du lot | Tout | Le porteur l'a demandé pour cet audit |

Règles **gardées** sans exception :
- jamais de puissance vendue contre de l'argent réel ;
- montants en entiers ;
- grand livre et journal des stocks ;
- logique dans `packages/engine` ;
- paramètres dans `worlds.settings` ;
- le jeu dort la nuit ;
- règles annoncées avant le 1er du mois.

## 8. La feuille de route proposée

Chaque vague se mesure au simulateur avant d'être jouée, puis en bêta.

| Vague | Contenu | Pourquoi d'abord | Mesure de sortie |
| --- | --- | --- | --- |
| 1 · Un seul jeu | R1 (la guerre mange) et R2 (la Signoria des villes), avec le ménage correspondant de R12 | Corrige P1 et P2, les deux défauts structurels | Lombardie / Installation ≥ 1,20 ; chaque ville change de Podestà au moins une fois par semaine au simulateur |
| 2 · Être le meilleur | R6 (le Lustre, avec les fantômes) et R11 (la Sera, avec l'incanto) | Donne l'échelle et le rendez-vous | Sessions par jour ≥ 3 ; présence à la Sera ≥ 40 % des actifs |
| 3 · Une saison qui se rejoue | R3 (les Atouts) et R10 (la Lettre) | Le cœur de la rétention de J7 à J30 | Rétention de J7 à J30 ; diversité des Atouts |
| 4 · Ce qui dure | R4 (la Dynastie), R5 (le Grand Canal) et R7 (le Doge) | Le passage d'une saison à l'autre | Retour au J1 de la saison suivante ≥ 60 % |
| 5 · La rupture | R8 (le Broglio), puis R9 (les parts de Maison) | Les plus risquées, une fois la population là | Échanges entre joueurs, signalements |

Ce qui ne demande **aucun code** et peut commencer tout de suite :
- l'écriture de la première saison de la Lettre (30 épisodes) ;
- le catalogue de départ des 12 Atouts ;
- les dessins du Grand Canal et des sept rangs du Lustre.

## 9. Les risques

| Risque | Parade |
| --- | --- |
| La domination décourage les plus faibles | Le Lustre les oppose à leur rang. La Lettre et les Atouts se jouent seuls. Tout repart au 1er du mois |
| La faible population | Les fantômes (R6), les PNJ qui livrent les villes (R2, mais sans jamais être Podestà), la Lettre en solo, la Sera qui concentre les présents |
| La charge de contenu (Lettre, Atouts, dessins) | Écrire avant de coder. Commencer avec 12 Atouts et une saison de Lettre |
| La toxicité (broglio, rumeurs, parts) | Rumeurs jamais nominatives, modération du fil, voix achetées par promesses publiques seulement |
| Le retour du sentiment de « trop de systèmes » | R12 est une condition, pas une option : on ne livre une vague qu'avec son ménage |
| Le mauvais tirage d'Atouts | Un nouveau tirage par semaine, payé en Influence, ce qui donne enfin un usage à l'Influence |

## 10. Les décisions demandées au porteur

1. **La thèse** : « l'économie est la guerre ». Les deux modes fusionnent par R1 et R2. Oui ou non ?
2. **La puissance en cours de saison** : lever les plafonds d'écart pendant la saison, et garder l'équité au départ du mois (P7). Oui ou non ?
3. **L'ordre des vagues** : celui du § 8, ou un autre (par exemple le Lustre en premier, parce qu'il est le plus simple).
4. **La Lettre du jour** : qui l'écrit ? Le porteur, Claude sur sa direction, ou les deux ?
5. **Le Broglio et les parts de Maison** : les garder dans le plan, ou les ranger dans IDEAS.md jusqu'à la bêta ?
6. **Ce qu'on retire** (R12) : valider la liste, ou la modifier.
