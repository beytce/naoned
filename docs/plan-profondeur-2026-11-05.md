# Plan : un jeu de gestion qui fait réfléchir (5 novembre 2026, au soir)

*Demande du porteur, après avoir joué : « on produit trop, on a très souvent des stocks surchargés, on peut quasiment faire toutes les commandes en permanence sans aucune difficulté, la production est trop simple. » Il veut que le joueur cherche à optimiser ses livraisons et ses trajets, que la production offre des optimisations qui ne sont pas évidentes (pas « +x % de cadence »), et que la Porta demande de choisir un build et un trajet selon la carte et la position de Rome. Objectif : une communauté de joueurs de gestion qui se posent des questions et se donnent des conseils. Condition : tout reste visuel, jamais un tableur.*

*Ce plan ne change aucune règle. Chaque lot attend la validation du porteur ; ceux qui touchent l'équilibrage passent au simulateur de 24 mois (toutes les graines) et se documentent dans `docs/calibration.md`.*

## 0. Déjà corrigé (ce soir, sans changer de règle)

| Retour | Cause | Correction |
| --- | --- | --- |
| Enlever le bouton de la meilleure commande | La carte « le mieux maintenant » choisissait la ville et la livraison à la place du joueur | Carte retirée (`map/BestNow.tsx` supprimé) : le joueur compose ses tournées |
| « Aucun véhicule à quai » alors qu'on en a | Après une bataille, les véhicules restent au quai de la Porta (règle du plan Porta § 8) ; l'écran des commandes les comptait comme absents sans le dire. Même message pour un véhicule en réparation, ou garé dans un fondaco qui ne sert pas la ville | Le dock de la ville dit où sont les véhicules (à la Porta, en réparation jusqu'à telle heure, dans un autre fondaco) ; « Rappeler de la Porta » en un toucher (`deliveryPlan`, `OrdersPanel`) |
| Impossible de remplir le transport de reliques | Au début de la bataille, c'est le véhicule de combat qui est choisi ; toucher une ville l'y envoie, lui, et seul le transport charge. Rien ne le disait | Sous l'objectif, l'étape suivante en or (« Seul le transport charge les coffres : touchez-le… », « Il charge : restez dans la ville… », « Ramenez-le à la Porte ») ; la carte du transport et les villes aux coffres battent en or quand c'est elles qu'il faut toucher (`relicStep`) |

## 1. Le diagnostic : pourquoi tout est facile

1. **Les commandes demandent ce qu'on produit déjà.** Les villes tirent d'abord les marchandises des recettes en marche (`orders.madeWeight` = 3). Le joueur n'a jamais à se demander quoi produire : la demande suit l'offre.
2. **Les stocks n'ont pas de plafond.** La file de nuit (12 h) remplit le magasin sans limite ; un joueur un peu installé a de quoi couvrir toutes les commandes. Cela contredit aussi la règle d'or 3 (« rien ne s'accumule sans fin »).
3. **La production n'a qu'un axe : monter le niveau.** Rendement Y(n), modules « + % », voisinage sur l'orbite : tout va dans le même sens, il n'y a jamais de choix entre deux bonnes options.
4. **La tournée n'a qu'un critère : la soute.** Une ville paie pareil quel que soit le moment ; le retour se fait à vide ; aucune route n'est meilleure qu'une autre, sinon par la prime de distance (+1 % par dizaine d'unités).
5. **La Porta se joue sans regarder la carte.** On choisit son meilleur véhicule et un transport sans voir le terrain ; la carte n'a ni relief ni chemin ; Rome ne se contourne guère.

Le remède n'est pas d'ajouter des systèmes (la règle : « chaque système absorbe les anciens »), mais de **donner des arbitrages** aux systèmes qui existent : l'atelier, le magasin, la ville, la tournée, la bataille.

## 2. Les propositions

### P1. Le magasin qu'on voit, et qui se remplit (stocks ; sans équilibrage d'abord, puis au simulateur)

*Ce que voit le joueur.* Chaque fondaco a **un quai de caisses** sur le plateau 3D : une pile par marchandise, à la couleur de sa marque (`GoodsMark`), qui monte avec le stock ; une **jauge en arc** autour du fondaco dit le magasin plein. Toucher le fondaco ouvre **l'étagère** : une rangée par marchandise, des caisses dessinées (une caisse = un lot de commande), en or celles qu'une commande servie attend déjà, et à droite une petite flèche **entrée / sortie** (ce que les ateliers y mettent par heure, ce que les commandes ouvertes en demandent). On lit d'un coup d'œil : « j'ai trop de briques, pas assez de verre ».

*La règle (à valider au simulateur).* Un **plafond de magasin par fondaco**, qui monte avec son niveau. Plein, les ateliers qui y versent **s'arrêtent sans rien perdre** (règle d'or 3), leur tuile montre une caisse qui déborde. D'où de vraies questions :
- quoi garder, quoi vendre à la Dogana, quoi transformer ;
- quel fondaco reçoit quel atelier (un atelier verse dans son fondaco) ;
- quand déplacer des caisses d'un fondaco à l'autre (un transfert par véhicule, à redonner : celui d'avant a été retiré le 1er novembre).

### P2. Des ateliers qui demandent un choix, pas un niveau (production ; au simulateur)

Trois leviers, chacun visible sur le domaine, aucun « + % de cadence » :

1. **Le terroir de la tuile.** Les cases du domaine ont des traits dessinés sur le plateau : **rivière** (moulins, teinturiers, tanneurs), **forêt** (scierie, charbonnier), **argile** (briqueterie, poterie), **colline** (vigne, pierre). Un atelier sur son terroir produit mieux ; ailleurs, il produit quand même. Les bonnes cases sont rares et convoitées par plusieurs ateliers : il faut choisir qui les prend. Le voisinage actuel (deux ateliers liés côte à côte) reste et se combine : la vraie énigme est **le plan du domaine**, comme une partie d'Anno ou d'Islanders.
2. **Deux recettes par atelier, deux logiques.** Chaque atelier a une recette **simple** (une matière brute, rapide, peu payée) et une recette **fine** (deux intrants, plus lente, payée bien plus, et qui seule compte pour les grosses commandes des grandes villes). Exemple : la briqueterie fait des briques (argile) ou des tuiles vernissées (argile + bois de chauffe). Passer à la fine demande d'avoir monté la chaîne qui la nourrit ; la laisser à la simple garde l'intrant pour autre chose. Sur la tuile, l'atelier montre ce qu'il fait par sa fumée et sa marque ; les intrants arrivent par des **charrettes animées sur les chemins du domaine**, et un atelier qui attend un intrant a une caisse vide qui clignote.
3. **La qualité contre la quantité.** Les maîtres donnent déjà une part de lots fins et exquis (l'effet `quality`) ; on en fait un vrai choix : certaines commandes demandent du **fin** ou de l'**exquis** (une caisse cerclée d'or), payées deux ou trois fois plus. Un maître en qualité fait moins de lots, mais des lots qui valent plus. Où le mettre dépend des villes que l'on sert.

Le joueur se demande alors : « Mon argile va-t-elle aux briques pour Padoue, ou aux tuiles pour Venise ? Ma case de rivière, je la donne au moulin ou au teinturier ? Mon maître en qualité, je le mets au verre ou à la soie ? » Il n'y a pas de bonne réponse unique : elle dépend de la carte, des villes servies et des autres ateliers. C'est exactement ce dont une communauté discute.

### P3. Des villes qui ont leurs goûts, et des tournées à composer (livraisons ; au simulateur)

1. **Les goûts des villes.** Chaque ville a **deux ou trois marchandises de prédilection** (dessinées sur son enseigne : Vérone le vin et le marbre, Padoue les briques et le drap…) et des commandes tirées surtout parmi elles, **qu'on les produise ou non**. `madeWeight` disparaît. Servir une région demande d'en avoir monté les chaînes : on choisit quelles villes on veut servir, et on bâtit pour elles.
2. **La ville rassasiée.** Une ville livrée souvent du même produit le paie moins pour un temps (sa jauge d'appétit, un petit pot qui se vide sur son enseigne, se remplit à nouveau tout seul). Varier les villes et les marchandises paie mieux que livrer toujours la même. L'absence ne coûte rien : la jauge remonte pendant qu'on n'est pas là.
3. **Le fret de retour.** Chaque ville **vend une matière locale** à bas prix (le bois du Frioul, l'argile de Trévise, la laine de Vérone). Un véhicule qui la livre peut **revenir chargé** : au lieu de rentrer à vide, sa soute se remplit sur la ville, et la matière va au fondaco de départ. Tracer la tournée devient un vrai problème : quelles villes servir, dans quel ordre, et par où revenir pour ramener ce dont la production a besoin. Sur la carte, le retour se trace du doigt comme l'aller, et les caisses de fret montent dans la charrette.
4. **Les routes qui comptent.** Les routes de la carte ont un **terrain** déjà dessiné : la lagune et les fleuves rapides pour le burchio, la plaine pour la charrette, les cols lents. Un péage à chaque frontière de région (petit, payé en ducats, vers le puits). La route la plus courte n'est plus toujours la meilleure : on voit sur la ligne d'or le temps et le péage de chaque tronçon pendant qu'on la trace.

### P4. La Porta : lire la carte, choisir son build et sa route (Porta ; banc de la Porta)

1. **Reconnaître avant d'entrer.** Le dock de la Porta montre **la carte de la bataille avant le départ** (elle est tirée de la graine) : les villes et leurs coffres (couleurs des raretés), les garnisons (figurines d'arbalétriers, de hallebardiers, de bombardes), les chemins des chevau-légers en pointillés, la ville du Gonfalonier. C'est là qu'on choisit son équipage, en voyant contre quoi on part.
2. **Une composition d'équipage, pas un seul véhicule.** La Porta, selon son niveau, ouvre **des places d'équipage** (2 au départ, 3 puis 4) : un combat et un transport, ou un combat et deux transports (plus de reliques, plus fragiles), ou deux combats et un transport (plus sûr). Chaque choix se voit sur le quai de la Porta, figurines en rang.
3. **Rome a des forces et des faiblesses lisibles.** Une pastille par unité, visible sur la carte de reconnaissance : l'arbalétrier tire à 2 cases, la couleuvrine (3 cases) le bat sans être touchée ; les chevau-légers vont par groupes, les arbalètes (tir à tous) les fauchent ; le Gonfalonier encaisse, les lances (qui montent sur la même cible) le percent ; la fumée fait passer un transport sous le nez d'une garnison. Le build se pense contre la carte du jour.
4. **Un terrain qui change le chemin.** La carte de bataille gagne des **forêts** (on y va plus lentement, mais Rome n'y voit qu'à une case), des **collines** (+1 case de portée aux armes de qui s'y tient), un **fleuve** avec deux gués. Le trajet le plus court passe sous les arbalétriers ; le plus sûr passe par la forêt, mais coûte du temps sur les 10 minutes.
5. **Tracer le chemin, pas seulement le but.** On trace la route du véhicule du doigt (comme la tournée de livraison) : des points de passage, la ligne suit le doigt et contourne. Un transport peut suivre le combat (« escorter ») d'un toucher sur lui.
6. **Les variantes de la semaine.** Chaque semaine, la Porta a **un trait** affiché sur sa carte, qui change le meilleur build : brouillard (vision de Rome réduite, la fumée inutile), fête de Rome (chevau-légers doublés), pluie (couleuvrines plus lentes), procession (le Gonfalonier marche entre les villes). Le classement hebdomadaire existe déjà : la question « quel build pour la semaine du brouillard ? » est celle que la communauté se posera.

## 3. Ce qui reste fidèle aux règles d'or

- **Rien ne se pille, rien ne se perd par l'absence** : le magasin plein arrête la production sans perte ; l'appétit des villes remonte seul ; les routes et péages ne sont que des choix.
- **Le temps s'achète, la puissance jamais** : aucune de ces mécaniques ne se vend en perle.
- **Tout se voit** : chaque proposition a son image d'abord (piles de caisses, jauge en arc, terroirs dessinés, charrettes sur les chemins, enseignes des villes, fret qui monte, carte de reconnaissance, terrain de bataille) ; les chiffres l'accompagnent dans les docks.
- **Une douzaine de systèmes** : rien de neuf à apprendre à part. Le magasin absorbe la « file de nuit » (le plafond, c'est lui) ; les goûts des villes remplacent `madeWeight` ; le fret de retour remplace le retour à vide ; la reconnaissance remplace le choix aveugle du palier.

## 4. L'ordre proposé

| Lot | Contenu | Simulateur | Taille |
| --- | --- | --- | --- |
| 1 | P1, l'image : le quai de caisses, la jauge, l'étagère avec entrée / sortie | non | moyen |
| 2 | P1, la règle : le plafond du magasin par fondaco | **oui** | petit (moteur) |
| 3 | P3.1 et P3.2 : les goûts des villes et la ville rassasiée | **oui** | moyen |
| 4 | P2.2 et P2.3 : deux recettes par atelier, les commandes fines | **oui** | gros (référentiel et écran) |
| 5 | P2.1 : les terroirs du domaine | **oui** | moyen |
| 6 | P3.3 et P3.4 : le fret de retour, les routes et péages | **oui** | gros |
| 7 | P4.1, P4.3 : la reconnaissance avant la bataille, les pastilles de Rome | banc Porta | moyen |
| 8 | P4.2, P4.4, P4.5 : l'équipage, le terrain, le chemin tracé | banc Porta | gros |
| 9 | P4.6 : les variantes de la semaine | banc Porta | petit |

Chaque lot de commerce qui change une règle s'annonce dans les notes du chapitre avant de s'appliquer.

## 5. Les questions au porteur

1. **Le magasin plafonné (P1)** : d'accord pour qu'un fondaco plein arrête ses ateliers, sans perte ? Plafond par fondaco (recommandé, il donne du sens au choix du fondaco) ou un seul pour la Maison ?
2. **Les goûts des villes (P3.1)** : les commandes ne suivent plus ce qu'on produit. C'est le plus gros changement de sensation : il faut bâtir pour servir. D'accord ?
3. **Le fret de retour (P3.3)** : le garder, ou le laisser à plus tard (c'est le lot le plus lourd côté écran) ?
4. **La Porta (P4)** : par où commencer ? Je recommande la reconnaissance avant la bataille (lot 7), qui change tout de suite la façon de jouer sans toucher au combat.
5. **L'ordre** : stocks d'abord (lots 1 et 2), puis villes, puis ateliers, puis Porta ? Ou la Porta plus tôt ?
