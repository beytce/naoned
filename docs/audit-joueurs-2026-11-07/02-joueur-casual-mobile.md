# Audit joueur 02 — le joueur casual sur téléphone (7 novembre 2026)

Profil joué : joueur casual (Township, Hay Day, Pocket City), téléphone 390×844, tactile, sessions « métro » de 5 minutes, n'a lu aucune règle. Serveur isolé (port 4102, base en mémoire, `EMPIRE_INTERIOR=off`, la config de production), web compilé du dépôt. Joué uniquement par l'écran (taps, glissés, pincements), en regardant chaque capture. Captures : `/tmp/claude-0/-home-user-naoned/7091555e-9be4-5e80-9143-48409e2cdd8e/scratchpad/p2-casual/` (abrégé `P2/` ci-dessous ; chemin complet = ce dossier + nom du fichier).

Quatre sessions jouées (environ 11 h 15 à 12 h 10 UTC), puis le serveur a été coupé par un redémarrage de la machine. Après la relance, j'ai rejoué l'ouverture sur un monde vierge pour confirmer les bugs principaux (capture `115-r01-rejeu-cash.png`). Hors du champ (traité par une autre session) : la rotation de la caméra, et les livraisons vers des villes non reliées.

---

## (a) Résumé

1. Les trois premières minutes sont **bonnes** : Lorenzo, la main qui montre la case, le camp bâti tout de suite, le premier bois en 30 s, la mule qui part pour Padoue et les pièces qui tombent. On comprend le principe « je fabrique → je livre → je gagne ».
2. Après la première livraison, **tout se casse** : le guide réclame une « Briqueterie » sans dire pourquoi, sa main reste plantée sur l'onglet Fondaco pendant tout le reste de la partie, il annonce « Tout tourne » alors qu'un atelier est bloqué, puis **disparaît complètement** une fois la Casa 2 bâtie (son conseil ne vit plus que dans Médaillon → Conseil).
3. Le jeu devient ensuite **un mur d'attente** : plus aucune commande avant environ 2 h (« Prochaine commande à 14 h 59 »), des lots de 30 min, une briqueterie qui demande 10 argiles quand la carrière en fait 8, et 60 ducats en caisse. En 25 minutes, je suis bloqué sans rien d'utile à faire.
4. Il reste **de vrais bugs visibles** (le texte brut `{cash}` dans le guide, le prix des ateliers qui passe de 120 à 48, des listes qui se réordonnent sous le doigt, des info-bulles coupées, le repère « lot prêt » invisible, des boutons qui ne répondent pas) et **une avalanche de jargon** (Casa, Fondaco, Maison, palais, Dogana, Faveur, Sceau, Bande, Puissance, Héritage, Mercanti, Diplomatici, chartes, ordres à cours limité, anneau, voisinage…).
5. C'est joli (la porcelaine blanche et le rouge de Venise ont du charme), mais **pas encore vivant** : aucune célébration, aucun récapitulatif au retour, une carte minuscule au milieu d'un vide gris.

**Je continuerais ? 4/10** : je reviendrais une fois, par curiosité, après la première livraison ; je désinstallerais à la deuxième session, bloqué sans commandes ni argent.
**Publiable ? Non.** Il faut au minimum le guide jusqu'à la Casa 3, les commandes en continu les deux premières heures, la correction des bugs bloquants listés en (c) et un tri sévère du vocabulaire.

---

## (b) Récit de la première session, minute par minute

**0:00 — Écran de connexion / nom** (`P2/001-s01-apres-login.png`). Un lion doré, « FONDACO », « Venise 1450 · saison de novembre ». *Saison ?* On m'a dit que rien n'est remis à zéro… Six carrés en pointillés au-dessus d'une bande d'eau : on dirait des images cassées. Un nom m'est proposé (« Toni_da_Murano »), je le remplace par Casualo. Bien : c'est rapide.

**0:20 — « Fondez votre Maison »** (`P2/003-s02-t12s.png`). « Un fondaco près de Venise, **trois ateliers et cinq cents ducats**. » Une seconde plus tard, je n'ai **aucun atelier** et **650** ducats. Première incohérence, dès le premier écran. Et c'est quoi, un « fondaco » ?

**0:40 — Lorenzo, 3 bulles** (`P2/005-s03-t12s.png`, `P2/007-s04-guide0.png`, `P2/008-s04-guide1.png`). Bulle 1 claire. Bulle 2 : « **Votre caisse : {cash}.** » (texte brut non remplacé). Bulle 3 : « Suivez le **bouton doré** sous mon portrait » : le bouton est **rouge**. Si je recharge pendant l'intro, elle repart de 1/3.

**1:00 — La main sur la case** (`P2/010-s05-apres-commencer.png`). Très bien : la main désigne un « + » rouge. Le texte du bas est coupé (« bâtissez-y un camp de… »). Le « + » fait 28×28 px, sous la taille minimale confortable (44 px).

**1:15 — Fiche « Case libre »** (`P2/011-s06-tap-plus.png`). « Un atelier ici aura pour voisins ceux qui touchent cette case. » Je ne comprends pas pourquoi on me dit ça. La fiche est noire alors que tout le reste est blanc.

**1:30 — Catalogue** (`P2/012-s07-catalogue.png`). Dix ateliers d'un coup, tous à 120. « 11 Bois » : par quoi, par heure, par jour ? Le camp est surligné en rose, bien. Les icônes rondes ne disent rien (un ovale vert pour le bois ?).

**1:40 — Camp bâti instantanément** (`P2/014-s08-apres-batir-6s.png`). Il est mignon, mais **aucune célébration** : ni poussière, ni « Bravo ». −120 d sans animation. L'onglet Compagnie affiche un « ! » qui m'appelle et me distrait.

**2:00 — « Lancer la production »**, barre de 30 s (`P2/016-s09-lancer.png`). Clair et satisfaisant.

**2:40 — « Votre bois est prêt. Ramasser »**, puis « Padoue attend 11 bois : livrez-les. » (`P2/018-s11-ramasser-07.png`). La caméra glisse vers Padoue, la main montre la ville. Très bien, c'est le meilleur moment du jeu.

**3:00 — « Votre mule est en route »** (`P2/020-s12-livrer.png`). Une pastille « Padoue 0:43 » et un bouton « **Rappeler** » : rappeler quoi, la mule ? Pourquoi voudrais-je l'annuler ? Je ne vois **pas la mule** bouger sur la carte.

**4:00 — Payé : +96** (`P2/023-s13-route-arrivee.png`). 530 → 626 avec un petit « +96 ». Sous mon nom apparaît « **100 d par jour** ». Le retour de la mule (1:20) dure plus longtemps que l'aller (0:43). Et tout de suite : « **Briqueterie : bâtissez cet atelier.** » **Sans bouton**, et la **main pointe l'onglet Fondaco**. Je tape Fondaco : la caméra zoome sur le palais, l'onglet « Carte » reste allumé (`P2/024-s14-fondaco.png`). Je ne sais pas pourquoi une briqueterie.

**5:00 — Dans le Fondaco** (`P2/026-s15-interieur.png`, `P2/027-s16-details.png`). « Casa 1 · Votre Maison », « Casa 2 · 50 d ». Dans Détails, je comprends enfin : la Casa 2 demande 5 briques et 5 planches. Personne ne me l'a dit. Trois mots pour la même chose : Fondaco, Casa, Maison (le « ? » dira même « palais »).

**6:00 — Je touche mon camp** : « Il travaille. » Dedans : « **Prochain lot dans 24:07** ». Le premier lot a pris 30 s, le suivant prend 30 min. Le bouton « Améliorer » porte un badge « **max** » au niveau 1 (`P2/030-s18-camp-entrer.png`). Le bouton « Maître » ouvre « **La famille · Génération 1 · 0 points d'Héritage · Traits de lignée : Mercanti, Artigiani, Navigatori, Diplomatici (chartes −10 % de Faveur), Prudenti (salaires −5 %)** » et « Embaucher un facteur · 200 d » (`P2/032-s19-maitre.png`) : Lorenzo n'est-il pas déjà « mon facteur » ? Là, j'ai décroché.

**8:00 — Deuxième atelier, mauvais clic** (`P2/034-s21-catalogue2.png`, `P2/036-s22-retour.png`). Je rouvre le catalogue : **l'ordre a changé** (la Ferme en tête, le camp en 3e) et **les prix sont passés de 120 à 48**. Mon doigt, habitué à la position de la carrière, construit un **deuxième camp de bûcherons**. Aucune confirmation, aucune annulation possible.

**9:00 — « Un objectif du Carnet est rempli. Encaisser »**, qui disparaît au rechargement, remplacé par « Un atelier attend. Tout relancer », avec la main toujours sur Fondaco (`P2/036-s22-retour.png`).

**10:00 — Compagnie → Carnet** (`P2/038-s24-compagnie.png`). Une grille de 11 cercles, dont certains déjà remplis sans que je sache pourquoi (« Gagner 3 niveaux d'atelier 2/3 » alors que je n'ai rien amélioré). On y parle de « Faveur », « Sceau », « Dogana ». « Encaisser 5 objectifs » fait apparaître dans le bandeau un **drapeau « 50 » sans nom**, sans animation de récompense (`P2/040-s25-encaisse-08.png`). Dans l'onglet Associés : « Fonder une **guilde** » (on parlait de compagnie) et « convocation commune à la partie rapide ».

**12:00 — Carrière bâtie** sur la case de gauche, qui n'avait **plus de « + »** (les repères des cases libres ne s'affichent que pendant l'étape du guide). La fiche de la carrière dit « À l'arrêt » et son bouton s'appelle « **Relancer** », alors qu'elle n'a jamais été lancée (`P2/050-s30-carriere-in.png`). « Déplacer sur l'anneau » : quel anneau ?

**14:00 — La grande case du bas** ressemble à toutes les autres : « **Parcelle fermée · Ouverte à la Casa 9** » (`P2/053-s32-case-bas.png`). Le cadenas dit « Niv. 9 » et la fiche « Casa 9 ».

**15:00 — Achat d'une case** (`P2/054-s33-case-haut.png`, `P2/056-s34-achat-4s.png`). « Achète-la : **ton** domaine » (Lorenzo me vouvoie, les fiches me tutoient). Le premier « Acheter la case » n'achète pas : il ouvre une 2e feuille, avec un 2e bouton plus petit, au prix « **90,11 d** » (des décimales, contre « 90 ducats » une seconde avant), et « ses villes se découvrent à l'achat » sur une case qui n'a pas de ville.

**17:00 — Briqueterie bâtie, « ! » rouge** (`P2/062-s37-encaisser-05.png`), mais Lorenzo dit « **Tout tourne. Prochain lot à 12 h 52.** » Faux : la briqueterie est bloquée (« Il attend : Argile »), et il était 11 h 52 à ma montre (l'heure affichée est celle de Venise sans le dire).

**19:00 — La Porta**, verrouillée : un toast propre, « La Porta s'ouvre à la Casa 4 » (`P2/066-s39-porta.png`). Le médaillon « 1 » ouvre « Où vous en êtes » avec 6 mesures et des « ? » dont les **info-bulles sont coupées** (`P2/070-s40-revenu-q.png`). C'est là, par hasard, que je trouve le **Marché** (bouton « Dogana »).

**21:00 — Le Marché** (`P2/071-s40-dogana.png`). Briques et planches à 10 d : je peux **acheter** ce que le guide me demandait de fabriquer. Achat en deux taps (Acheter → Confirmer), bien. Mais après l'achat, **la liste se réordonne** (les articles en stock montent en tête) et mon tap suivant tombe sur une autre ligne (« Draps 0 en stock », `P2/076-s42-tap-briques-ligne.png`). Prix « 10,52 d ».

**23:00 — « Tout est prêt pour la Casa 2 » → Bâtir.** −50 d, **aucun effet visible** sur le palais, aucun compte à rebours sur la carte (`P2/080-s44-casa2.png`).

**Fin de la session 1 (≈ 25 min, bien plus que 5).**

**Session 2 (+4 min)** (`P2/081-s45-metro2-retour.png`). Le médaillon affiche « 2 » et l'anneau de zone a grandi. **Pas de « Bon retour », pas de récapitulatif, pas de fête pour la Casa 2.** Et surtout **Lorenzo a disparu de la carte**. Son conseil (« Scierie : bâtissez cet atelier. La Casa 3 demande des planches… ») n'existe plus que dans Médaillon → Conseil (`P2/085-s47-conseil.png`). Padoue et Vérone : « Aucune commande pour l'instant », la prochaine « à 14 h 59 », soit **2 h d'attente** (`P2/091-s50-verone-cmd.png`). Je vends 20 bois (sans confirmation, avec une jolie pluie de pièces), j'achète une case et je bâtis une scierie… qui n'a plus de bois, puisque je viens de le vendre.

**Session 3 (+5 min)** (`P2/106-s60-metro3-retour.png`). Scierie « ! », briqueterie « ! » (8 argiles sur 10 nécessaires), 60 ducats, aucune commande. « Ramasser et relancer » sur un atelier bloqué : **rien ne se passe, aucun message** (`P2/110-s63-relance-briq.png`). Je n'ai plus rien à faire. En vrai joueur, je ferme l'application.

---

## (c) Bugs

| # | Gravité | Reproduction | Attendu | Obtenu | Capture |
|---|---|---|---|---|---|
| B1 | **Haute** (1re minute, visible par 100 % des joueurs) | Nouveau compte → Fonder la Maison → Lorenzo, bulle 2/3 | « Votre caisse : 650 ducats. » | « Votre caisse : **{cash}**. » (texte brut). Reproduit sur un monde vierge après le redémarrage | `P2/007-s04-guide0.png`, `P2/115-r01-rejeu-cash.png` |
| B2 | Haute | Écran « Fondez votre Maison » | Le texte décrit le départ réel | « trois ateliers et cinq cents ducats », alors qu'on part sans atelier avec 650 d | `P2/003-s02-t12s.png`, `P2/010-s05-apres-commencer.png` |
| B3 | **Haute** | Après la 1re livraison, étapes « Briqueterie… », « Un atelier attend », « Un objectif… » | La main désigne l'objet à toucher, ou rien | La main reste figée **sur l'onglet Fondaco** pendant des dizaines de minutes, jusque dans la feuille Compagnie, même quand le bouton du guide indique autre chose (« Tout relancer ») | `P2/022-s13-route-b.png`, `P2/036-s22-retour.png`, `P2/043-s26-terraferme.png` |
| B4 | **Haute** | Étape « Briqueterie : bâtissez cet atelier. » | Un bouton qui ouvre une case libre et le catalogue, avec le pourquoi (« pour la Casa 2 il faut des briques ») | Ni bouton ni explication ; la main pointe l'onglet Fondaco, qui ne mène pas au catalogue | `P2/028-s17-carte.png` |
| B5 | **Haute** | Bâtir la Casa 2 puis revenir | Lorenzo continue (« Je vous dirai toujours quoi faire ») | La barre de Lorenzo **disparaît de la carte** ; le conseil n'existe plus que dans Médaillon → Conseil | `P2/081-s45-metro2-retour.png`, `P2/085-s47-conseil.png` |
| B6 | Moyenne | Briqueterie bâtie sans argile | Lorenzo signale l'atelier bloqué | « Tout tourne. Prochain lot à 12 h 52. » avec un « ! » rouge sur la briqueterie | `P2/062-s37-encaisser-05.png` |
| B7 | **Haute** | Bâtir le 1er atelier, puis rouvrir le catalogue | Ordre et prix stables | Le 1er atelier coûte 120, ensuite **tous coûtent 48**, sans explication ; **l'ordre change** (camp 1er → 3e). J'ai bâti un 2e camp par erreur, sans confirmation ni annulation | `P2/012-s07-catalogue.png`, `P2/034-s21-catalogue2.png`, `P2/036-s22-retour.png` |
| B8 | Moyenne | Marché : acheter des briques, puis toucher une autre ligne | La liste reste en place | Les articles en stock remontent en tête après l'achat ; le tap suivant tombe sur une autre marchandise (Draps). Risque d'achat erroné | `P2/075-s42-planches-ok.png`, `P2/076-s42-tap-briques-ligne.png` |
| B9 | Moyenne | Médaillon → toucher « ? » de Revenu du jour ou de Casa | Info-bulle lisible | **Info-bulle coupée** par la carte et le bord de l'écran | `P2/070-s40-revenu-q.png`, `P2/084-s46-casa-q.png` |
| B10 | **Haute** | Un lot prêt à la carrière, vue de carte par défaut | Le repère rouge « prêt » est visible | Le repère existe (`data-state="ready"`) mais avec **`opacity: 0`** ; rien ne signale le lot prêt sur la carte. Il n'apparaît pas non plus sur la capture | `P2/106-s60-metro3-retour.png` (inspection du DOM, script `s61.mjs`) |
| B11 | Moyenne | Hors étape du guide | On voit où bâtir et où acheter | Tous les « + » des parcelles libres et des cases libres ont `opacity: 0` : impossible de voir quelles cases sont libres, à acheter ou fermées (Casa 9). Une case fermée est identique à une case libre | `P2/028-s17-carte.png`, `P2/053-s32-case-bas.png` |
| B12 | Moyenne | Toucher le repère de la carrière (visible juste devant le camp) | Fiche de la carrière | Fiche du **camp de bûcherons** derrière : le canvas intercepte le tap et la sélection 3D prend un autre bâtiment | `P2/048-s29-carriere-fiche.png` |
| B13 | Moyenne | Atelier bloqué (briqueterie sans argile) → Fondaco → Ateliers → « Ramasser et relancer » | Message « Il manque 2 argiles » ou bouton désactivé | Rien ne se passe, aucun retour | `P2/110-s63-relance-briq.png` |
| B14 | Basse | Atelier neuf, jamais lancé | Bouton « Lancer » | « Relancer » | `P2/050-s30-carriere-in.png` |
| B15 | Basse | Atelier niveau 1 avec la Casa 1 | « Niveau 2 à la Casa 2 » | Badge « **max** » au niveau 1 ; le détail dit « Au plus haut » | `P2/030-s18-camp-entrer.png`, `P2/031-s19-ameliorer.png` |
| B16 | Basse | Achat de case | Un prix entier, une seule étape | « 94 ducats » sur la fiche, puis « 90,11 d » sur la 2e feuille ; Marché à « 10,52 d », « 105,2 d ». Décimales partout, et deux confirmations pour une case | `P2/056-s34-achat-4s.png`, `P2/075-s42-planches-ok.png` |
| B17 | Basse | Onglet Fondaco | L'onglet s'allume | La caméra va au palais mais l'onglet « Carte » reste actif ; les onglets Fondaco et Compagnie portent des badges (« 1 », « ! ») dont on ne trouve pas la cause | `P2/024-s14-fondaco.png` |
| B18 | Basse | Livraison en cours | La mule se voit sur la route | Pastille « Padoue 0:43 » mais pas de mule visible ; retour plus long que l'aller (1:20 contre 0:43) | `P2/020-s12-livrer.png`, `P2/022-s13-route-b.png` |
| B19 | Basse | Écran du nom | Visuel propre | Six carrés en pointillés au-dessus de l'eau, comme des images non chargées ; « saison de novembre » dans un monde sans saisons | `P2/001-s01-apres-login.png` |
| B20 | Basse | Heures affichées | Heure locale, ou « heure de Venise » écrit | « Prochain lot à 12 h 52 » à 11 h 52 (UTC) : un décalage d'une heure qui n'est pas annoncé | `P2/046-s27-apres.png` |
| B21 | Basse | Glisser la carte | La caméra reste près du domaine | On peut l'envoyer dans le vide gris ; le domaine sort de l'écran | `P2/089-s49-swipe-droite.png` |
| B22 | Basse | Bulle 3/3 de l'intro | « bouton rouge » | « Suivez le bouton **doré** » (il est rouge en Porcellana) | `P2/008-s04-guide1.png` |

**Bloquants d'économie (conception, mais vécus comme des bugs) :**
- **E1 — Plus de commandes pendant 2 h** après la commande d'accueil (Padoue et Vérone : « Prochaine commande à 14 h 59 »). Le seul revenu, ce sont des ventes de bois à 3 d (`P2/091-s50-verone-cmd.png`).
- **E2 — Recettes qui ne s'emboîtent pas** : la carrière fait 8 argiles par lot, la briqueterie en demande 10. Il faut 2 lots (1 h) pour en lancer un. Même chose pour la scierie (10 bois, alors que le camp en fait 11, partagé avec la briqueterie).
- **E3 — 30 s, puis 30 min** : le premier lot est accéléré, le suivant prend 60 fois plus de temps, sans transition (« Prochain lot dans 24:07 »).
- **E4 — Le piège vente/production** : le Marché propose de vendre le bois dont la scierie a besoin, sans avertissement. Le message « 4 gardés pour vos besoins » ne tient pas compte de la scierie en attente.

---

## (d) Moments de confusion et mots incompris

**Où j'ai hésité :**
1. Après la 1re livraison : « Briqueterie ? Pourquoi ? Avec quoi ? Où ? ». Ce n'est qu'en ouvrant Fondaco → Entrer → Détails que j'ai vu la Casa 2 et ses briques.
2. Pourquoi le guide me montre l'onglet Fondaco (B3).
3. « Où est mon stock ? » Aucun écran « Entrepôt ». On le découvre seulement dans le Marché (« 24 en stock »), lui-même caché derrière le médaillon. Pour un jeu où le Fondaco *est* l'entrepôt, c'est le plus grand trou.
4. « Où est le Marché ? » Médaillon → Dogana. Introuvable sans hasard.
5. « Où est passé Lorenzo ? » (B5).
6. « Quelles cases puis-je acheter ? » (B11).
7. « Pourquoi ma briqueterie ne démarre pas alors que j'ai ramassé de l'argile ? » (8 < 10, E2).
8. « Rappeler » pendant le voyage de la mule.
9. Le Carnet : des objectifs déjà remplis sans que je sache comment, et une récompense (drapeau « 50 ») sans nom.
10. « File jusqu'à 0 h 52 » et « La file couvre 12 heures » : demain soir ? cette nuit ? Et la fiche de l'atelier dit « Prochain lot dans 30 min ».

**Lexique incompris ou contradictoire (vu en 25 minutes) :**

| Mot | Problème |
|---|---|
| Fondaco / Casa / Maison / palais / comptoir | Cinq noms pour un même bâtiment ; « Casa 2 » ressemble à une 2e maison, pas à un niveau |
| Niv. 9 / Casa 9 | Le cadenas et la fiche ne disent pas le même mot |
| Dogana / Marché / San Marco / « le négoce » | Quatre noms pour le marché |
| Compagnie / guilde / associés | Trois noms pour le groupe d'amis |
| Faveur | Drapeau rouge « 50 » dans le bandeau, jamais nommé là où il apparaît |
| Sceau, Bande, Puissance, Héritage, Génération, Traits de lignée | Méta-jeu exposé dès la 6e minute |
| Mercanti, Artigiani, Navigatori, Diplomatici, Prudenti | De l'italien non traduit, avec « chartes », « salaires », « Faveur » |
| Maître | Le bouton d'un atelier qui ouvre « La famille » |
| facteur | Lorenzo « votre facteur » et « Embaucher un facteur · 200 d » |
| Ordres à cours limité | Jargon de bourse, promis à la Casa 3 |
| Voisinage +20 %, « voisins ceux qui touchent cette case » | Jamais expliqué |
| Déplacer sur l'anneau | Quel anneau ? |
| Terraferme, Campo, Porta, terres de Rome, reliques, partie rapide | Annoncés partout, inaccessibles avant la Casa 4 |
| « terres menacées » (réglages des notifications) | Inquiétant dans un jeu où « personne ne peut prendre ce que tu as bâti » |
| Tu / vous | Lorenzo vouvoie, les fiches tutoient (« À toi », « Achète-la », « ton domaine ») |

---

## (e) Ergonomie tactile

- **Cibles trop petites** : les repères de carte font 28×28 et 34×34 px ; les « ? » du médaillon 20×20 ; « Acheter la case » de la 2e feuille ≈ 48 px de large ; le bouton du guide (« Bâtir », « Livrer ») fait 36 px de haut. Le minimum visé devrait être 44 px.
- **Taps qui atterrissent ailleurs** : la sélection 3D prend le bâtiment derrière le repère (B12) ; les listes se réordonnent (B7, B8).
- **Aucune confirmation sur la construction** (120 d d'un coup), mais une double confirmation sur l'achat d'une case et sur l'achat au Marché, et aucune sur la vente. Les règles de confirmation sont incohérentes.
- **Textes coupés** : la bulle du guide sur une ligne (« bâtissez-y un camp de… ») ; les info-bulles des « ? » (B9).
- **Feuilles** : la barre d'onglets disparaît ou glisse sous la feuille (les onglets passent à y = 915 dans le DOM). On ne sait plus comment revenir, sinon par la croix.
- **Gestes** : le pincement et le glisser marchent, mais on peut sortir du domaine (B21). Aucun double-tap pour recentrer, ni bouton « recentrer ».
- **Lisibilité** : la carte toute blanche, avec les cases libres, fermées et achetables quasi identiques. Le rouge sert à la fois aux boutons, à la zone, aux routes, aux alertes et aux badges : on ne sait plus ce qui est urgent.
- **Styles mélangés** : la liste Fondaco → Ateliers utilise des vignettes colorées (maison bleue, toit orange) au milieu de l'univers porcelaine (`P2/094-s53-ateliers.png`) ; les fiches de la carte sont noires, les feuilles blanches.
- **Bonne surprise** : les boutons principaux (Bâtir, Entrer, Valider) sont grands et rouges, et la barre d'onglets est confortable (86×56).

---

## (f) Ce qui donnerait envie de revenir

Ce qui marche déjà :
- La boucle d'accueil : bâtir, 30 s, ramasser, livrer, être payé. En 3 minutes, on a compris le jeu.
- L'esthétique porcelaine : le palais, le camp de rondins, la grue de la carrière sont charmants.
- La pluie de pièces vers le compteur à la vente, et la caméra qui suit vers Padoue.
- « Rien ne se perd pendant l'absence » : rassurant.

Ce qui manque pour que je rouvre l'appli dans le métro :
- **Un retour récompensé** : « Pendant votre absence : +33 bois, +8 argiles, une commande de Vérone vous attend », avec un gros bouton « Tout ramasser ».
- **Toujours une commande à livrer** dans les 2 premières heures, avec une ville qui « s'anime » : des passants, des caisses sur le quai, une mule visible.
- **Un objectif visible** en permanence (« Casa 3 : 7/10 briques, 2/10 planches ») au lieu d'un carnet en grille.
- **Une fête à chaque palier** (Casa 2 : le palais grandit, des confettis, ce que ça débloque, en images).
- **Des notifications** (« Votre camp a fini ») : l'écran dit « pas encore activées sur ce serveur ».

---

## (g) Idées concrètes, classées par impact

**Impact très fort (avant toute publication)**
1. **Prolonger Lorenzo jusqu'à la Casa 3 au moins**, toujours sur la carte, avec toujours un bouton qui fait l'action (ouvrir la case libre et le catalogue sur le bon atelier, ouvrir le Marché…), toujours une phrase de « pourquoi » (« La Casa 2 demande 5 briques : bâtissons une briqueterie »), et la main sur l'objet réel, jamais sur un onglet. Corriger B1 à B6.
2. **Commandes continues au début** : une petite commande toutes les 10 à 15 min dans la zone pendant les 2 premières heures, toujours pour ce que je fabrique. Le joueur doit toujours avoir quelque chose à livrer.
3. **Recettes emboîtées au début** : carrière 10 → briqueterie 10 ; camp 12 → scierie 10 + briqueterie 2. Et une courbe de temps progressive (30 s, 2 min, 5 min, 15 min, 30 min) sur les premiers lots de chaque atelier.
4. **Un vrai écran Entrepôt** dans le Fondaco : les marchandises en icônes, avec la jauge du plafond (300/500), où vendre et quoi en faire. Mettre le Marché dans la barre ou sur la carte (San Marco), jamais derrière le médaillon.
5. **Rendre la carte lisible** : « + » visibles en permanence sur les cases achetables et libres, cadenas sur les fermées, repère « prêt » jamais masqué (B10, B11).

**Impact fort**
6. **Un seul mot par chose**, et la moitié des mots cachés au début : Fondaco (niveau 2, pas « Casa 2 »), Marché, Compagnie, ducats. Masquer Famille, Héritage, Traits, Bande, Puissance, Sceaux et Faveur jusqu'à ce qu'ils servent ; retirer « Maître » de la fiche d'atelier tant que l'intérieur est éteint.
7. **Listes stables** (catalogue, Marché) et **prix stables et lisibles** (entiers ; si le premier atelier est cher et les suivants à 48, l'expliquer ou harmoniser).
8. **Confirmer la construction** (ou permettre d'annuler 10 s) ; une seule étape pour acheter une case.
9. **Un écran de retour** (« Pendant votre absence… ») et une animation de palier.
10. **Un blocage expliqué** : « Il manque 2 argiles · la carrière en livre 8 dans 12 min · [Acheter 10 au Marché] ».

**Impact moyen**
11. Info-bulles des « ? » en feuille ou en popover qui reste dans l'écran.
12. Tutoiement **ou** vouvoiement, partout pareil.
13. La mule visible sur la route ; retirer ou expliquer « Rappeler ».
14. Un bouton « recentrer » et une carte bornée au domaine.
15. Vignettes de la liste Ateliers au style Porcellana ; fiches de carte claires.
16. Le Carnet : 3 objectifs à la fois, en phrases d'action (« Livrez 10 bois »), avec la récompense montrée et nommée.

**Impact faible / finition**
17. Heures en heure locale, ou « heure de Venise » écrit.
18. Retirer « saison de novembre » et les carrés en pointillés de l'écran du nom.
19. Cibles ≥ 44 px pour tous les repères et les « ? ».

---

### Comparaison avec docs/plan-premiers-pas.md (lu après avoir joué)

- Lot 2 (« guide jusqu'à la première commande ») : **tenu**. J'ai livré en ~4 min, et en ~91 s en suivant strictement les boutons. Mais le plan s'arrête là, alors que c'est **juste après** que le joueur casual décroche. « Puis le deuxième atelier et la montée du Fondaco » est écrit, mais à l'écran c'est fragile : pas de bouton, main sur l'onglet, puis disparition après la Casa 2.
- Lot 4 (« des repères qui parlent ») : promet « ses lots prêts en rouge » et « plus de repère vide ». J'ai vu le repère « prêt » de la carrière avec `opacity: 0` (B10), et tous les « + » de parcelles invisibles hors guide (B11).
- Lot 3 (stock et zone du Fondaco) : visible en chiffres (« Stock 300 → 500 »), mais **aucun écran ne montre le stock lui-même**.
- La « commande d'accueil garantie » marche ; ce qui manque, c'est la 2e, la 3e, la 4e commande.

### Ce qui n'a pas pu être testé
La Casa 3 et au-delà (Porta, Terraferme, Remise, charrette), les sessions espacées de plusieurs heures, les notifications (désactivées sur le serveur), l'absence d'une nuit. Une session de retour à +23 min était lancée quand la machine a redémarré : le monde en mémoire a été perdu, et l'ouverture a été rejouée pour confirmer B1 et le changement de prix 120 → 48.
