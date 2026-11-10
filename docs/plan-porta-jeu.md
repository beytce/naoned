# La Porta qui se joue : lisibilité, fluidité, idées (proposition du 10 novembre 2026)

*Demande du porteur : « une vraie amélioration du mode PvE. Animations belles et fluides, rendu très qualitatif, déplacements et fonctionnalités ludiques et sans ambiguïté, dans la DA générale. » Validé par le porteur le 10 novembre 2026 (« Lance ») avec les choix recommandés du § 5 ; l'état des travaux est au § 6. Les règles de la Porta restent celles de `docs/plan-porta.md` ; l'écran reste en Porcellana (`docs/plan-porta-porcellana.md`).*

## 1. Le constat (une bataille de palier 1 jouée le 10 novembre, téléphone 390 × 844)

| # | Ce qu'on voit | Pourquoi ça gêne |
| --- | --- | --- |
| 1 | Le combat se passe au bord de l'écran, ou hors de l'écran : la caméra ne suit rien | On perd un cavalier à 30 % de vie sans l'avoir vu se battre |
| 2 | Les pions font une dizaine de pixels, biscuit sur biscuit ; Rome ne se distingue pas du décor | Règle 8 : « tout se voit » n'est pas tenue |
| 3 | Deux véhicules à mener un par un, chacun en ligne droite vers un seul point | Deux fois plus de touchers que de décisions ; le transport part seul au feu |
| 4 | L'ordre part en HTTP et l'écran n'en dit rien avant l'instantané suivant (jusqu'à 250 ms plus le réseau) | On retouche, on doute que l'ordre soit pris |
| 5 | Les pions glissent d'un battement à l'autre (4 par seconde), à 30 images par seconde | Un mouvement saccadé dès que le réseau hésite |
| 6 | Un grand anneau rose apparaît sans explication ; la bombarde frappe sans prévenir ; rien ne dit qui vise qui | Les dégâts tombent sans cause visible |
| 7 | La dernière minute : un voile gris, le chiffre qui rougit | On ne sait pas si son transport a encore le temps de rentrer |
| 8 | Le décor (bosquets, rochers, pics) ne fait rien | On se demande si on peut traverser, si ça cache |
| 9 | L'en-tête prend le tiers haut de l'écran ; les cartes des véhicules ne montrent ni le pion ni ce qu'il fait | La carte est petite, l'état se lit mal |
| 10 | Chargements (10, 20, 35, 60 s) et recharge (45 s) écrits en dur dans l'écran ; la bulle du premier atelier s'affiche par-dessus la bataille ; le parcours `e2e/porta.mjs` cassait sur le tutoriel | Dettes à solder au passage (le parcours est réparé dans ce commit) |

## 2. Ce que font les jeux du genre

- **Hades' Star (étoiles rouges)** : une seule scène, un zoom continu ; les icônes de vaisseaux ont une taille plancher et s'écartent quand elles se chevauchent ; le panneau du bas porte les actions sans manger la carte ; depuis DARK NEBULA, des renforts arrivent en cours de partie par des portes, et la supernova est le seul vrai danger (`docs/hades-star/03` et `04`).
- **Into the Breach** : toute attaque ennemie est annoncée à l'écran avant de tomber. Ses auteurs : « on sacrifie toujours une idée cool à la clarté ». Chaque perte se lit comme sa propre faute.
- **Le RTS sur téléphone** (Iron Marines, War Legends, retour d'expérience de Hypemasters) : trois ou quatre escouades au plus ; presque personne n'utilise la sélection de groupe ; l'écran doit montrer le jeu, pas l'interface. Total War sur tablette : glisser le doigt trace le chemin.
- **Le « game feel »** : anticipation, impact, conséquence ; l'arrêt sur image et la secousse réservés aux coups lourds, sinon on ne les sent plus au bout de trois minutes ; au toucher, la vibration remplace le bouton.

## 3. La proposition

Trois lots. A et B ne changent aucun chiffre : ni le simulateur ni la calibration ne bougent. C change des règles et passe par le simulateur de 24 mois et les notes du chapitre.

### Lot A — Des ordres sans ambiguïté

| # | Quoi | Détail |
| --- | --- | --- |
| A1 | **Le convoi** | Par défaut, le transport suit son véhicule de combat, un peu plus d'une demi-case derrière (ordre `follow`, moteur). Un toucher déplace les deux. Toucher la carte d'un véhicule le détache ; « Regrouper » le rattache. |
| A2 | **Le toucher qui dit ce qu'il fait** | Sur une ville : « Charger ici » (le combat s'avance, le transport se pose au milieu et charge). Sur un ennemi : « Attaquer » (ordre `attack` : se met à portée et le suit dans sa laisse). Sur la Porte : « Rentrer » (ordre `leave` à l'arrivée, sans second toucher). Sur le sol : aller là. Le mot s'affiche une seconde au point touché. |
| A3 | **La route rouge** | Le chemin en ruban d'accent à chevrons, comme les routes de la Carte, avec le temps de trajet au bout (« 14 s »). Glisser depuis un véhicule trace un chemin par étapes (`move` avec une file de points, cinq au plus). |
| A4 | **L'aperçu avant de lâcher** | Doigt posé : la route fantôme, le temps, et les regards de Rome qu'elle traverse qui s'allument. On lâche pour ordonner, on glisse hors de la carte pour annuler. |
| A5 | **Rome annonce ses coups** | Un fil d'encre de chaque ennemi à sa cible. La zone de la bombarde se remplit au sol avant le coup (`nextShotAt` dans l'instantané). Un « ! » quand un chevau-léger repère le transport, un « ? » quand il le perd. L'incendiaire : sa route vers la ville visée et le décompte au-dessus d'elle. Les anneaux de vision ne s'allument que pour l'unité éveillée et pour l'aperçu A4. |
| A6 | **Le retour chiffré** | Chaque carte de véhicule porte son temps de retour à la Porte. Sous 15 s de marge, elle passe à l'accent et vibre une fois : « Rentre maintenant ». |
| A7 | **La caméra** | Elle suit le convoi tant qu'on ne l'a pas déplacée ; un bouton rond la rend. Des flèches au bord de l'écran pour un véhicule hors champ, rouges s'il est frappé. Premier cadrage : le convoi et la ville la plus proche. |
| A8 | **L'interface** | L'en-tête devient une pilule : les losanges des reliques et le chrono. Les cartes des véhicules : le pion dessiné, la vie en barre, un état en un mot (« En route », « Charge 6 s », « Sous le feu »). Les touches des composants avec leur pictogramme et leur portée montrée au sol quand on les presse. |
| A9 | **Le signe aux associés** | Un appui long pose un repère que le groupe voit trois secondes (« ici », « danger »). |

### Lot B — Le mouvement et le rendu

| # | Quoi | Détail |
| --- | --- | --- |
| B1 | **Les ordres par le socket, la réponse tout de suite** | L'ordre part sur le WebSocket déjà ouvert. Le repère de destination tombe sur la case et le pion se tourne à l'instant du toucher ; le serveur confirme ou reprend. |
| B2 | **Un mouvement continu** | Un tampon d'un battement et une vitesse constante entre les positions, au lieu d'un glissé recommencé à chaque instantané. 60 images par seconde quand l'appareil suit, 30 sinon (mesuré, comme la Carte). |
| B3 | **Des pions qu'on voit** | Taille plancher à l'écran (ils ne rétrécissent plus sous 28 px), socle de couleur : la maison en blanc et accent, Rome en encre, les associés en violet. Deux pions qui se chevauchent s'écartent. |
| B4 | **Le coup en trois temps** | L'élan (le pion se cabre), le trait (carreau, boulet, avec sa traînée), l'impact (éclats de porcelaine, recul). Arrêt de 80 ms et secousse seulement pour une mort, un boulet de bombarde ou le Gonfalonier. Les dégâts regroupés par seconde et par cible. |
| B5 | **La porcelaine casse** | Un pion tué se brise en éclats ; Rome laisse un tesson, la maison une roue. Un véhicule abîmé rentre en fumant vers la Porte. |
| B6 | **La relique qu'on prend** | Le coffre s'ouvre, la gemme saute sur le mulet, son losange vole jusqu'à la pilule du haut. Une légendaire : un éclat d'or et une vibration longue. |
| B7 | **L'ouverture et la fermeture** | Ouverture : les cases tombent en place depuis la Porte, les villes se posent, le convoi sort (2 s, passable d'un toucher). Dernière minute : les cases du bord se retournent une à une, face d'encre, du plus loin vers la Porte ; à zéro, tout est retourné. C'est le dessin, pas la règle : un véhicule sur une case retournée n'est perdu qu'à zéro. |
| B8 | **Le son et la vibration** | Les sons existants (`sound.ts`) étendus : ordre pris, alerte, coup lourd, relique, dernière minute. |

### Lot C — Idées de jeu (abandonné le 10 novembre 2026)

*Décision du porteur du 10 novembre 2026, après les lots A et B : ces quatre idées ne sont pas retenues et ne seront pas codées. Elles restent ici pour mémoire.*

| # | Idée | D'où | Effet |
| --- | --- | --- | --- |
| C1 | **Les cloches de Rome** : à mi-partie (paliers 3 à 6), des renforts sortent de la ville la plus lointaine ; l'heure est marquée sur le chrono dès le départ | Hades' Star, DARK NEBULA | Une courbe de tension : se presser au début, ou tenir |
| C2 | **Le décor compte** : un bosquet cache (la vision de Rome y est divisée par deux), une route pavée entre deux villes accélère de 25 % ; les pics ne se traversent pas | Constat 8 | Des chemins à choisir, lisibles sur la carte |
| C3 | **Trois sceaux de bataille** par palier : toutes ses reliques rapportées, aucun véhicule abîmé, rentré avant 5:00. Honorifiques, montrés sur le socle du palier | Jeux de tactique mobiles | Rejouer un palier déjà ouvert |
| C4 | **La prime du Gonfalonier** : sa chute ouvre son coffre, une relique de la plus haute rareté du palier pour chaque joueur présent | Le Colosse d'Hades' Star | Une raison d'affronter le boss au lieu de le contourner |

C2 demande un calcul de chemin dans le moteur (les pics) : c'est le plus gros morceau. C4 et C1 touchent aux gains et à la difficulté : `docs/calibration.md`, toutes les graines.

## 4. L'ordre des travaux

| Étape | Contenu | Vérification |
| --- | --- | --- |
| 1 | B1, B2, B3 : le socle du mouvement | `e2e/porta.mjs` (téléphone et bureau), mesure des images par seconde |
| 2 | A1, A2, A3, A6 : le convoi et les ordres (moteur : `follow`, `attack`, file de points, `leave` à l'arrivée ; tests d'abord sur la fixture) | Tests du moteur ; le banc `porta-bench` inchangé (le bot garde ses ordres) |
| 3 | A4, A5, A7, A8 : l'aperçu, les annonces de Rome, la caméra, l'interface | Captures avant et après |
| 4 | B4 à B8 : les coups, la casse, la relique, l'ouverture et la fermeture | Captures, `prefers-reduced-motion` respecté |
| 5 | Le tutoriel de la bataille (`empire/tutor/`) refait sur les nouveaux gestes ; A9 | `e2e/tutorial-empire.mjs` |
| 6 | (Abandonnée.) Lot C, idée par idée, chacune avec son réglage dans `worlds.settings.porta` | Simulateur de 24 mois, `docs/calibration.md`, notes du chapitre |

## 5. À trancher par le porteur

1. **Le périmètre** : A et B d'abord (recommandé), C ensuite, idée par idée.
2. **Le convoi par défaut (A1)** : oui (recommandé) ou deux véhicules séparés comme aujourd'hui.
3. **Les cases qui se retournent à la fermeture (B7)** : oui, ou garder un simple voile.
4. **Lot C** (tranché : aucune) : lesquelles des quatre idées garder. Recommandé : C3 et C4 d'abord (peu de moteur), C1 ensuite, C2 en dernier.

## 6. État (10 novembre 2026)

| Lot | État |
| --- | --- |
| A1 | fait : ordre `follow` (moteur), le convoi formé à l'ouverture, le maillon entre les deux cartes pour séparer ou regrouper |
| A2 | fait : `tell` (`porta/orders.ts`, testé) dit l'ordre et son mot ; ordres `attack` et `exit` (moteur) |
| A3 | fait : la route en ruban du kit (`porcellana/ribbon.ts`), le temps au bout ; un doigt glissé depuis un véhicule trace son chemin (`move` et `via`, cinq étapes) |
| A4 | fait pour le chemin tracé du doigt (la route fantôme, son temps, les regards de Rome traversés en accent) ; un simple toucher ordonne tout de suite, sans aperçu |
| A5 | fait : le fil d'encre vers la cible, la zone de la bombarde qui se remplit, « ! » et « ? », le décompte de l'incendiaire sur la ville. La route de l'incendiaire vers sa ville n'est pas dessinée |
| A6 | fait : le temps de retour sur chaque carte ; sous 15 s de marge, « Rentre maintenant », une vibration, et « Rentrer » passe à l'accent |
| A7 | fait : la caméra suit le convoi jusqu'au premier glissement ; un bouton pour toute l'île ou pour revenir au convoi (plus de double toucher : le premier des deux touchers donnait un ordre) ; flèches au bord pour un véhicule hors champ |
| A8 | fait : l'objectif en une pilule, les cartes (signe, vie en barre, état en un mot), les composants avec leur signe et leur portée au sol quand on les tient |
| A9 | fait : un appui long pose « Ici », ou « Danger » près d'une unité de Rome, vu trois secondes par le groupe (`PortaHub.ping`) |
| B1 | fait : les ordres par le socket, répondus par leur numéro, l'instantané renvoyé aussitôt ; l'anneau et le mot tombent à l'instant du toucher |
| B2 | fait : chaque pion continue à sa vitesse entre deux battements, puis rejoint la position du serveur ; une image par rafraîchissement de l'écran, une sur deux si l'appareil peine. **Pas mesuré sur un vrai téléphone** (le conteneur dessine en logiciel) |
| B3 | fait : taille plancher de 30 px, socles (la maison en accent, Rome en encre, un associé en violet), deux pions superposés s'écartent ; les maisons d'une ville reculent derrière sa place pour laisser voir le convoi qui charge |
| B4 | fait : l'élan du pion, le trait, les éclats ; arrêt de 80 ms et secousse pour une mort, un boulet ou le Gonfalonier ; dégâts regroupés par seconde |
| B5 | fait pour la casse (le pion se brise en éclats). Le véhicule abîmé qui rentre en fumant n'est pas fait |
| B6 | fait : la gemme saute du pied des maisons au mulet, puis son losange vole à la pilule du haut |
| B7 | fait : les cases tombent depuis la Porte à l'ouverture ; la dernière minute, elles se retournent côté encre du bord vers la Porte, celles des villes et de la Porte à la toute fin |
| B8 | fait avec les sons existants : la cloche du campanile à la dernière minute, une vibration à l'ordre, à l'alerte de retour et à la perte. Pas de son nouveau |
| Tutoriel | fait : quatre étapes à la première bataille (`portaFight`, docs/plan-tutoriels.md) |
| C | abandonné (décision du porteur du 10 novembre 2026) : aucune des quatre idées n'est retenue |

Vérification : `apps/web/e2e/porta.mjs` joue une bataille de deux minutes de bout en bout (tutoriel, convoi, « Charger ici », combat, chargement, fermeture, « Rentrer », sortie), en 390 × 844. Le disque SVG de secours (`Battle.tsx`, sans WebGL) garde les anciens gestes.
