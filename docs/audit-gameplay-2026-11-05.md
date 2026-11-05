# Audit du gameplay et de sa fluidité (5 novembre 2026)

*Demande du porteur, après la refonte claire : « fais une passe complète sur le gameplay et sa fluidité. Le nombre de villes est peut-être trop important. Le geste pour la livraison s'est perdu et ne correspond qu'à du clic bouton maintenant. Beaucoup de choses sont peu interactives. »*

*Méthode : lecture des réglages de Venise (`packages/engine/src/themes/venice1450.*.ts`), du moteur des commandes et des trajets, de l'écran (`apps/web/src/empire/`), de `docs/calibration.md` ; parcours e2e de l'empire et de la Porta rejoués. Aucune règle n'est changée par cet audit : chaque proposition attend la validation du porteur, et celles qui touchent l'équilibrage passent au simulateur de 24 mois.*

## 1. Ce qu'est une session aujourd'hui

Une session type, une fois le tutoriel passé :

| Geste | Touchers | Ce que le joueur décide |
| --- | --- | --- |
| Ouvrir le jeu, lire la carte « le mieux maintenant » | 0 | rien |
| « Livrer » sur la carte (ou toucher la ville, puis « Livrer ») | 1 à 2 par ville | rien : le jeu choisit les commandes (toutes celles que le stock couvre, les mieux payées d'abord) et le véhicule (le plus petit qui les prend) |
| Onglet Fondaco, « Tout récolter » | 2 | rien |
| Parfois : améliorer un atelier, bâtir | 3 à 5 | oui (quoi améliorer) |
| Attendre le retour du véhicule (5 à 20 min) | 0 | rien |

Bilan : **3 à 8 touchers et environ 30 secondes de jeu**, puis plus rien à faire avant des heures. Les réglages le confirment : une ville donne une commande toutes les 4 h 15 (capitale) à 20 h (bourg), avec un plafond de 1 à 3 ; le simulateur est calé sur **une tournée par session** (`roundsPerSession` = 1, calibration du 3 novembre). La règle d'or 7 (« quelques minutes, plusieurs fois par jour ») est tenue par le bas : la session est courte parce qu'il n'y a rien à y faire, pas parce qu'elle est dense.

## 2. Les constats

### 2.1 Le geste de livraison a disparu (critique)

- La transposition de Hades' Star (`docs/hades-star-livraisons.md`) reposait sur trois gestes : **toucher un véhicule** éclaire les villes à sa portée, **glisser le véhicule sur une ville**, enchaîner les arrêts. Le code de ce glisser existe toujours (`map/Fleet.tsx`, `startDrag`, `onMove`).
- Mais sur le plateau 3D, affiché par défaut depuis le 3 novembre, **les jetons des véhicules ne sont plus dessinés** (`Fleet.tsx` : `{!MAP_3D && …}`, décision « no medal on the map »). Il ne reste qu'un jeton par véhicule en route, sous le nom de la maison (`Trips`). On ne peut plus rien saisir sur la carte.
- La livraison est devenue **« toucher une ville → bouton d'or »**, et depuis la refonte claire, **un seul bouton d'or** sur la carte « le mieux maintenant ». Le jeu choisit tout (`deliveryPlan` : commandes, véhicule, ordre). Il n'y a plus de décision, ni de tournée à composer.

### 2.2 Trop de villes, pour trop peu de commandes (majeur)

- La carte compte **68 villes en 10 régions** (`venice1450.map.ts`) : 14 de taille 1, 29 de taille 2, 13 de taille 3, 8 de taille 4, 4 de taille 5. La Vénétie seule en a 9.
- Une ville de taille 1 ou 2 (43 villes sur 68) donne **une commande toutes les 12 à 20 h, une seule à la fois**. Une session trouve donc la plupart des villes vides ou à 1 commande. Leurs noms, leurs pastilles et leurs maisons remplissent l'écran sans rien proposer.
- Sur la capture du porteur, 16 noms de ville sont à l'écran pour 5 villes qui demandent quelque chose.
- Le désencombrement du lot 2 cache les chevauchements, mais ne règle pas le fond : **la densité de villes ne correspond pas à la densité d'action**.

### 2.3 Les gestes du domaine sont doublés par des boutons (majeur)

- Toucher un atelier prêt récolte son lot (`map/Domain.tsx`, `DomainLabels`). Mais le bouton d'or « Tout récolter » du pied, la pastille du Fondaco et la carte de Lorenzo poussent tous vers le bouton, et personne ne touche l'atelier.
- Pendant le tutoriel, le bouton d'or de Lorenzo **fait le geste à la place du joueur** (« Tout relancer », « Bâtir : Briqueterie »). Le joueur apprend à toucher la carte de Lorenzo, pas les objets du jeu.
- Améliorer un atelier, bâtir et monter la Casa sont des boutons dans des docks. Les chantiers se voient (minuteurs), mais on ne les touche pas, on n'y assiste pas.

### 2.4 Peu de retour, peu de moment (majeur)

- **L'arrivée d'un véhicule en ville** est réglée en silence (`settle` : l'état est rafraîchi, des pièces volent vers la bourse). Rien ne se passe **sur la ville** : pas de caisses déchargées, pas de pièces qui jaillissent de la ville, pas de pastille qui se vide sous les yeux.
- **Le départ** : la note « en route · Suivre » est bien là, mais on ne voit pas les caisses monter dans la charrette.
- **La récolte** : les marchandises volent vers le magasin (bien), mais depuis un bouton du pied, pas depuis l'atelier.

### 2.5 Fluidité technique (moyen)

- Chaque geste attend la réponse du serveur (`act` : `busy`, puis la réponse) avant que l'écran change. Sur mobile, cela fait 200 à 600 ms de bouton « en attente » à chaque toucher. Or **le moteur est pur et déjà importé par le web** (`@comptoirs/engine` dans `map/logic.ts` et `Board3D.tsx`) : l'écran pourrait appliquer le geste tout de suite et laisser le serveur confirmer.
- La Porta et la Compagnie s'ouvrent par-dessus la carte sans la barre des lieux (refonte claire, reste des lots 4 et 5) : on en sort par la croix.
- Le passage carte → domaine est fluide (voile de 160 ms) ; l'entrée dans le domaine dépend d'un toucher sur le repère du fondaco que la caméra peut encore déplacer (vu en e2e).

### 2.6 Ce qui marche

- La Porta : un vrai mode, à gestes (choisir son véhicule, toucher une destination), avec une fin.
- Les commandes en caisses, la carte « le mieux maintenant », le pied du Fondaco : on comprend quoi faire. Le problème n'est plus de trouver l'action, c'est qu'elle ne demande rien.

## 3. Les propositions

Chaque proposition dit ce qu'elle change, et si elle passe au simulateur.

### P1. Rendre le geste de livraison (priorité 1, sans équilibrage)

**La tournée qu'on trace du doigt**, d'après Hades' Star :

1. Les véhicules au quai sont **des figurines qu'on touche** sur le plateau 3D, au pied du fondaco (les figurines existent déjà : `map3d/fleet3d.tsx`). Touché, un véhicule s'éclaire, sa soute s'affiche (places libres en caisses), et les villes à sa portée avec des commandes que le stock couvre s'allument en or.
2. **On glisse du véhicule vers une ville** : une route d'or suit le doigt, s'aimante sur la ville. Lâcher ajoute l'arrêt, et les caisses de la ville sautent dans la soute (petite animation).
3. **On continue sans lever le doigt** (ou par un nouveau glisser depuis la ville) vers une deuxième ville : la tournée s'allonge, la soute se remplit. La soute pleine, plus aucune ville ne s'allume.
4. Lâcher dans le vide (ou toucher « Partir ») : le véhicule part, la route reste tracée, le jeton suit.

Ce que le joueur décide enfin : **quelle ville, dans quel ordre, avec quel véhicule**. La soute limitée et la prime de distance (`distanceBps`) rendent le choix réel.

- Le bouton « Livrer » reste en accessibilité (clavier, lecteur d'écran, `prefers-reduced-motion`), mais **n'est plus l'or de la carte**. La carte « le mieux maintenant » montre le chemin (« Glissez la charrette vers Venise »), et sa main animée fait le geste une fois.
- Le moteur sait déjà faire : `empireMove` (un arrêt), `maxStops: 15`, la tournée et le retour automatique (`returnHome`). C'est un chantier d'écran (`EmpireMap`, `Fleet`, `Board3D`), sans règle nouvelle.

### P2. Moins de villes, chacune qui compte (priorité 1, avec simulateur)

Deux temps :

- **P2a, tout de suite et sans équilibrage** : une ville que **ni vos fondaci ne servent, ni vos véhicules n'atteignent** s'affiche en silhouette, sans nom ni pastille (son nom au toucher ou avec Alt). Les villes servies sans commande perdent leur pastille. Sur la capture du porteur, on passerait de 16 noms à environ 6.
- **P2b, à valider au simulateur** : réduire la carte à **environ 3 villes par région, soit une trentaine** (une capitale, une ou deux villes moyennes ; les 43 bourgs et petites villes fusionnés dans leurs voisines), en gardant le revenu horaire constant. Leurs commandes deviennent plus fréquentes ou plus grosses (intervalles divisés par 2 à 3, plafonds de 2 à 4), pour qu'une session trouve **2 à 4 villes à servir, à composer en tournée**. À valider aux 24 mois, toutes les graines, et à documenter dans `docs/calibration.md`. Comme une règle du commerce change, elle s'annonce dans les notes du chapitre.

### P3. Une session de quelques minutes qui a du contenu (priorité 2, avec simulateur)

L'objectif : 2 à 4 minutes de gestes utiles par session, sans rien perdre quand on est absent (règle 3).

- **Des tournées plus courtes et plus nombreuses** dans une session : avec P2b, des trajets de 1 à 3 min vers les villes proches (aujourd'hui 5 à 20 min) et 2 véhicules dès le départ. Le joueur lance deux tournées, récolte et améliore pendant qu'elles roulent, puis les accueille. Les longues routes (20 min) restent celles des villes lointaines, mieux payées.
- **L'arrivée comme moment** : la ville reçoit ses caisses, des pièces en jaillissent vers la bourse, la pastille se vide. Si le joueur est là, il voit sa paie arriver, ville par ville ; s'il est absent, tout est réglé au retour, comme aujourd'hui.

### P4. Les objets d'abord, les boutons ensuite (priorité 2, sans équilibrage)

- **Récolter par l'objet** : toucher un atelier prêt récolte (c'est déjà le cas), et **glisser le doigt sur plusieurs ateliers** les récolte tous d'un passage, les marchandises volant de chacun vers le magasin. « Tout récolter » devient une commodité, ouverte à partir de la Casa 3, sans or.
- **Lorenzo montre, il ne fait pas** : une main animée pointe l'objet à toucher (l'atelier, la ville, la charrette). Le bouton d'or de sa carte disparaît après la première fois de chaque geste.
- **Les chantiers qu'on voit et qu'on touche** : un échafaudage sur la tuile pendant la construction, le minuteur dessus ; touché, il ouvre son dock (et l'accélération en perle, règle 4). À la fin, une petite animation sur la tuile (le bâtiment qui monte, la poussière), avant la carte du moment.

### P5. Fluidité (priorité 1, sans équilibrage)

- **Des gestes optimistes** : l'écran applique tout de suite le résultat calculé par le moteur partagé, le serveur confirme ; s'il refuse, l'écran revient en arrière avec la secousse (`pressResult(false)`). À faire d'abord pour la récolte, le départ d'un véhicule et la réclamation du Carnet.
- **La barre des lieux partout** : la Porta et la Compagnie s'ouvrent comme des lieux, avec la barre en bas, au lieu d'une feuille ou d'un plein écran fermé par une croix.
- **Le domaine à un toucher** : l'onglet Fondaco et le toucher du fondaco y entrent toujours, même pendant un glissé de caméra.

## 4. Ordre proposé

| Étape | Contenu | Simulateur | Taille |
| --- | --- | --- | --- |
| 1 | P5 : les gestes optimistes, la barre des lieux sur la Porta et la Compagnie | non | moyen |
| 2 | P1 : la tournée tracée du doigt (figurines au quai, glisser, enchaîner, partir) ; « Livrer » en repli | non | gros |
| 3 | P2a : les villes hors d'atteinte en silhouette | non | petit |
| 4 | P4 : récolter en glissant, Lorenzo qui montre, les chantiers visibles | non | moyen |
| 5 | P2b + P3 : une trentaine de villes, des commandes plus fréquentes, des trajets proches plus courts, l'arrivée en moment | **oui**, 24 mois, toutes les graines | gros |

## 5. Les questions au porteur

1. **La tournée tracée du doigt (P1)** : glisser d'une traite (véhicule → ville → ville) ou par étapes (un glisser par arrêt, « Partir » à la fin) ? Je recommande les deux : d'une traite si le doigt continue, sinon par étapes.
2. **Moins de villes (P2b)** : une trentaine (3 par région), ou plus radical (une vingtaine, 2 par région) ? Et les villes retirées : fusionnées dans leurs voisines (leur poids reporté), ou gardées en décor sans commande ?
3. **Le rythme (P3)** : viser 2 à 4 minutes de gestes par session, avec des trajets proches de 1 à 3 minutes ? Cela change l'équilibre du 3 novembre (« une tournée par session ») : à valider au simulateur.
4. **« Tout récolter »** : le garder dès le début (en fantôme), ou seulement à partir de la Casa 3 ?

## 6. Les décisions du porteur (5 novembre 2026)

1. **La tournée** : les deux gestes. Si le doigt reste posé, on glisse de ville en ville d'un seul geste ; sinon, un glisser par arrêt, puis « Partir ». « Livrer » reste en secours, sans or.
2. **Les villes** : une trentaine, 3 par région (une capitale, une ou deux villes moyennes), à valider au simulateur de 24 mois.
3. **Les villes retirées** : fusionnées dans leur voisine restante, qui reprend leur poids en commandes (le revenu total ne bouge pas).
4. **Le rythme** : 2 à 4 minutes de gestes par session (des trajets proches de 1 à 3 min, des commandes plus fréquentes), validé au simulateur ; l'absence ne coûte toujours rien.
5. **« Tout récolter »** : à partir de la Casa 3, sans or ; avant, on touche et on glisse sur les ateliers.
6. **Lorenzo** montre l'objet à toucher (une main animée) ; son bouton d'or disparaît après la première fois de chaque geste.
7. **L'ordre** : l'écran d'abord (étapes 1 à 4 : fluidité, tournée au doigt, villes en silhouette, objets d'abord), l'équilibrage ensuite (étape 5 : une trentaine de villes et le nouveau rythme).
