# Audit joueur 01 : le joueur « gestion » (Anno, Factorio, Patrician)

7 novembre 2026. Joué sur PC (1280x800, Chromium, WebGL logiciel), serveur isolé du kit (port 4101, base
en mémoire, `EMPIRE_INTERIOR=on`, carte carrée). Deux parties : la première (compte
`marco.gestion@example.org`, captures `c*.png`) a été coupée par un redémarrage de la machine, la
seconde (`marco2.gestion@example.org`, captures `d*.png`) a été rejouée de zéro jusqu'à la Casa 2.
Environ 1 h 30 de temps de jeu réel en tout, une centaine d'actions. Aucun fichier du dépôt n'a été
modifié.

Captures : `/tmp/claude-0/-home-user-naoned/7091555e-9be4-5e80-9143-48409e2cdd8e/scratchpad/p1-gestion/shots/`
(abrégé `$S` ci-dessous ; chaque capture citée existe sous ce dossier, par exemple
`$S/d034.png` = `/tmp/claude-0/-home-user-naoned/7091555e-9be4-5e80-9143-48409e2cdd8e/scratchpad/p1-gestion/shots/d034.png`).

Réserve sur les mesures : la machine de test était très chargée pendant la première partie (charge
de 22 à 29 sur 4 cœurs, d'autres testeurs en parallèle) ; la lenteur de la 3D en WebGL logiciel
n'est donc **pas** comptée comme un défaut. Les animations prises au vol (panneaux à moitié fondus)
ne sont pas non plus comptées.

---

## (a) Résumé et note

1. La première minute est réussie : le guide de Lorenzo mène du vide à la première livraison payée en moins de deux minutes, la carte en porcelaine est belle, et l'intérieur d'atelier (postes, ouvriers, goulot en rouge, plan conseillé) est la meilleure idée du jeu pour un joueur de gestion.
2. Juste après, le jeu s'arrête : aucune commande de ville avant **2 h 30** (Padoue, Vérone) ou 2 h (Bologne, que la carte ne montre même pas) ; le guide se tait après la Casa 2. Il ne reste qu'à vendre 3 ducats l'unité à la Dogana.
3. Les chaînes de production ne sont pas des chaînes : rien ne passe d'un atelier à l'autre sans un clic « Récolter » dans chaque intérieur, et un atelier qui relance prend **tous** les intrants communs sans priorité (la scierie a affamé la briqueterie).
4. Les chiffres manquent là où le joueur décide : le coût de la Casa n'affiche pas les matériaux, une amélioration de poste ne montre ni son gain ni sa durée, l'embauche « de nuit » coûte 40 d et ne rapporte rien, les prix des ateliers passent de 120 à 48 sans explication.
5. Le vocabulaire et le monde se contredisent : « Remise » désigne deux choses, la Dogana n'est pas expliquée, Vérone est à deux cases de Venise, Ancône « s'ouvre » mais n'apparaît nulle part, et l'intro promet « trois ateliers et cinq cents ducats » alors qu'on démarre sans atelier avec 650.

**Publiable ? 4/10.** La base technique et visuelle est solide, mais pour un amateur de gestion la boucle se casse après dix minutes et les informations qui permettent d'optimiser sont cachées ou fausses.

---

## (b) Mon parcours

Partie 2 (la plus complète), dans l'ordre :

1. Connexion par lien magique, nom proposé « Anzoleta_dal_Legno » remplacé par « Marco_Gestion », écran « Fondez votre Maison » (`$S/s02-a.png`), « Fonder la Maison ».
2. Intro de Lorenzo en 3 cartes (« Passer »), puis toucher une case libre (`$S/d001.png`) : « Bâtir un atelier », catalogue « Bâtir ici » (`$S/d002a.png`), camp de bûcherons à 120 ducats. Il est debout tout de suite.
3. « Lancer la production » : le premier lot sort en 30 s. « Ramasser », puis « Livrer » à Padoue : la mule part, je reçois +96 ducats.
4. Le guide demande une briqueterie. Je pose une carrière d'argile (48 d), puis la briqueterie (48 d) sur les cases libres données au départ.
5. J'achète une parcelle libre (90,11 d) (`$S/d006.png`, `$S/d007.png`) et j'essaie une parcelle fermée près de San Marco (`$S/d006b.png`).
6. Je cherche à monter le Fondaco : le profil (médaillon « 1 », `$S/d007b.png`), puis la fiche du Fondaco et « Entrer » (`$S/d008.png`, `$S/d009.png`). « Casa 2 · 50 d » est grisé et ne dit pas pourquoi.
7. Je pose la scierie (48 d), le 4e atelier. J'ouvre Vérone (`$S/d013.png`) et je dézoome (`$S/d014.png`).
8. Je regarde l'onglet Porta (« s'ouvre à la Casa 4 ») et « Le quai » (`$S/d015b.png`).
9. J'entre dans les ateliers : camp (`$S/d016.png`), scierie (« Plan conseillé » : 19,5 → 20,9 planches/h, `$S/d018.png` → `$S/d019.png`), briqueterie (`$S/d021.png`). Je récolte chaque lot à la main.
10. La briqueterie attend l'argile (un lot de carrière = 8, la recette en veut 9) : j'achète 10 argile à la Dogana (31 d) (`$S/d022.png`) et je relance.
11. Carnet : 4 objectifs encaissés (+40 Faveur).
12. J'améliore le poste goulot du camp (« Améliorer · 120 d », `$S/d030.png`).
13. J'attends les lots, je récolte briques et planches (« 5/5 · pour la Casa 2 » dans la Remise), je monte la Casa 2 (`$S/d034.png`), puis l'écran « Votre maison grandit » (`$S/d036.png`) et la carte dézoomée (`$S/d037.png`).
14. Session suivante, après rechargement de la page : je récolte de nouveau, la scierie reprend le bois de la briqueterie (B4 reproduit), je relance la briqueterie à la main, et je mesure le camp une fois l'amélioration du poste finie (`$S/d045.png`). Toujours aucune commande, ni Ancône sur la carte.

Partie 1, en plus : vente de 11 bois à la Dogana (`$S/c036.png`), embauche d'un bûcheron de nuit (`$S/c021.png`, `$S/c025.png`), Carnet, Associés, Terraferme (`$S/c027.png`), plan conseillé de la carrière (`$S/c045.png`).

Non testé faute de temps : la Porta (Casa 4, 1 200 d plus 60 briques et 60 planches, soit plusieurs heures de jeu réel), la Remise de véhicules, les qualités `:fine` et `:exquisite`, les commandes régulières des villes (aucune n'est arrivée pendant la session) et l'absence longue (plafonds, file de 12 h).

---

## (c) Bugs

| # | Gravité | Titre | Reproduction | Attendu / obtenu | Capture |
|---|---|---|---|---|---|
| B1 | **Majeur** | Aucune commande pendant 2 à 2 h 30 après l'accueil | Fonder la Maison, livrer la commande d'accueil, puis lire `/api/empire` → `house.orders` | Attendu, selon le thème (`orders.firstLotBps`, « une première livraison dans la première session ») : une vraie commande dans la première session. Obtenu : `padova.next` et `verona.next` = arrivée + 2 h 30, `bologna.next` = + 2 h, listes vides. Le joueur n'a plus rien à livrer, alors que le Carnet demande « Livrer 40 unités aux villes ». | `$S/d037.png` (aucune caisse sur les villes) |
| B2 | **Majeur** | « Casa 2 » grisé sans raison affichée | Casa 1, 440 d en caisse, fiche du Fondaco → « Entrer » | Attendu : « 50 d + 5 briques + 5 planches », et ce qui manque. Obtenu : « Casa 2 · 50 d », bouton `disabled` à 70 % d'opacité, presque pareil qu'actif. Les matériaux ne se lisent que plus tard dans la Remise (« 5/5 · pour la Casa 2 »). | `$S/d009.png`, `$S/d010.png` |
| B3 | **Majeur** | L'embauche d'un ouvrier de nuit coûte et ne rapporte rien | Camp de bûcherons → poste « L'abattage » (le goulot) → « Embaucher un bûcheron · 40 d · nuit » | Attendu (plan-ateliers § 3.3 : « une équipe de nuit fait tourner un poste 24 h ») : un débit en hausse. Obtenu : −40 d, débit inchangé (36,1/h) ; le lot suivant s'est même allongé (`batchMs` de 1 080 043 à 1 096 558). Le code fait la **moyenne** du jour et de la nuit (`handsBps`, `interior/throughput.ts`) : un second ouvrier du même niveau ne sert à rien. | `$S/c021.png`, `$S/c025.png` |
| B4 | **Majeur** | « Récolter » relance aussitôt et prend tous les intrants communs | Scierie et briqueterie à l'arrêt, 11 bois au stock ; récolter le camp, puis la scierie | Attendu : un partage, ou au moins un choix. Obtenu : la scierie prend 9 bois d'un coup, la briqueterie (2 bois par lot) affiche « Il manque : Bois », sans alerte ni réglage de priorité. | `$S/d037.png` (Briqueterie « Il manque : Bois ») |
| B5 | Majeur | La Casa 2 n'ouvre pas Ancône, qui n'apparaît nulle part | Monter la Casa 2 (le dock promet « Stock 300 → 500 · +1 ville : Ancône ») | Obtenu : aucun repère d'Ancône sur la carte. L'API la dit pourtant « couverte » (`map.covered` : ancona, bologna, padova, verona), et Bologne aussi, qu'on ne voit pas davantage. Des villes de la zone sont invisibles. | `$S/d037.png` ; liste des repères dans le journal du pas d037 |
| B6 | Majeur | La fiche d'un lieu s'ouvre hors de l'écran, sous le panneau de gauche | Toucher le repère « Vérone » ou « Le Fondaco » | Attendu : la caméra centre le lieu dans la partie visible. Obtenu : la fiche de Vérone est coupée au bord gauche, Vérone cachée sous « Tes ateliers » ; celle du Fondaco flotte à côté de Padoue. | `$S/d013.png`, `$S/d008.png` |
| B7 | Mineur | La main de Lorenzo pointe le mauvais endroit | Tout le guide | Le texte dit « Touchez une case libre » et la main montre l'onglet « Carte » ; « Briqueterie : bâtissez » et la main montre l'onglet « Fondaco », puis « Compagnie ». Pendant toute la partie, la main reste sur un onglet. | `$S/d001.png`, `$S/c010.png`, `$S/d013.png` |
| B8 | Mineur | Le guide désigne une chose et le catalogue en surligne une autre | Guide « Briqueterie : bâtissez cet atelier », puis Fondaco → Bâtir | Le catalogue met en avant le **camp de bûcherons** (ligne rose, bouton rouge), pas la briqueterie. | `$S/c013.png` |
| B9 | Mineur | Le bouton du guide passe sous le doigt | Une construction finit pendant qu'on lit « Un objectif du Carnet est rempli · Encaisser » | Le bouton disparaît et devient « Un atelier attend · Tout relancer » : un clic rate ou part ailleurs. Plusieurs messages du guide n'ont d'ailleurs aucun bouton (« Un lot est prêt. », « Tout est prêt pour la Casa 2. », « Un atelier attend. »). | `$S/c014.png`, `$S/d027.png` |
| B10 | Mineur | Carte du guide tronquée et bouton vide | Juste après la pose du camp | « Votre camp de… » coupé, le bouton rouge n'a plus de texte. | `$S/c004.png` |
| B11 | Mineur | Annonce et gain réel diffèrent | Vendre 11 bois (« Vendre 11 à la Dogana · 33 d ») ; récolter la carrière (« Récolter +8 argile ») | La caisse gagne 37 d (538 → 575) et l'étiquette affiche « +36 » ; la récolte en donne 16. Trois nombres différents pour un même geste. | `$S/c036.png` |
| B12 | Mineur | Curseur de vente : barre et poignée désaccordées | Dogana → Bois → curseur « 11 sur 11 » | La poignée est au bout, la barre remplie à la moitié. | `$S/c036.png` |
| B13 | Mineur | Le prix d'un atelier change sans explication | Premier catalogue : chaque atelier à 120 ; deuxième : 48 | `shareOwningBps` (« le savoir circule ») baisse le prix, mais rien ne le dit. Pour le joueur, c'est un prix incohérent. | `$S/d002a.png`, `$S/c013.png` |
| B14 | Mineur | L'onglet actif ne suit pas l'écran | Entrer dans un atelier : l'onglet « Fondaco » s'allume, Échap ne ferme pas l'intérieur, l'onglet repasse sur « Carte » alors que l'intérieur reste affiché | Il faut la croix en haut à droite. | `$S/c025.png`, `$S/d030.png` |
| B15 | Mineur | Repères de l'intérieur invisibles au premier affichage, clic sur un poste sans effet | Entrer dans le camp, toucher un poste | Les étiquettes « Goulot · 36/h » sont dans la page avec `opacity: 0` ; l'anneau rouge apparaît mais pas la fiche du poste. Il a fallu toucher le repère. Possiblement lié au WebGL logiciel, à revérifier sur GPU. | `$S/c018.png`, `$S/c019.png` |
| B16 | Mineur | Décor de l'intérieur mal calé | Briqueterie : le séchoir flotte au-dessus de deux dalles, décalé de la grille ; le four est coupé par les boutons du bas. Le camp n'affiche que 2 postes sur 3 à l'entrée. | | `$S/d021.png`, `$S/d016.png` |
| B17 | Mineur | La bande « Remise » déborde | Plus de deux marchandises | La 3e pastille est coupée (« 1/ ») sans flèche ni défilement visible. | `$S/d037.png` |
| B18 | Mineur | L'écran de la Casa 2 dit faux | « Votre maison grandit · Casa 2 · Une place de plus pour vos ateliers et vos chantiers » | Les chantiers restent à 1 jusqu'à la Casa 5 (`buildSlots`). Le stock 300 → 500 et la ville promise ne sont pas rappelés. | `$S/d036.png` |
| B19 | Mineur | La mule de l'accueil se cache sous la barre du haut | Livrer à Padoue | La pastille « 0:36 » de la mule est à moitié sous le logo. | `$S/c009.png` |
| B20 | Mineur | Débit affiché à l'arrêt | Briqueterie « Attend argile » | L'en-tête affiche « 19,4 Briques/h » alors que rien ne tourne. | `$S/d021.png` |
| B21 | Majeur (pour un jeu d'optimisation) | Le « Goulot » n'est pas sur le poste le plus lent | Améliorer « L'abattage » du camp (120 d), attendre la fin du chantier (environ 27 min), entrer dans le camp | Les repères donnent 39/h (abattage), « Goulot · 40/h » (ébranchage), 47/h, « Sortie · 37/h ». Le goulot désigné n'est pas le minimum, et le joueur améliore le mauvais poste. | `$S/d045.png` (repères lus dans la page, invisibles sur la capture : voir B15) |
| B22 | Mineur | La fiche de la carte reste par-dessus l'intérieur | Toucher « ×1 Camp de bûcherons » dans la liste | L'intérieur s'ouvre, mais la fiche « Prêt ! Camp de bûcherons · Entrer » reste affichée par-dessus. | `$S/d045.png` |
| B23 | Mineur | Une amélioration de poste rapporte peu et ne le dit pas | Abattage niveau 1 → 2 : 120 d, environ 27 min | Le camp passe de 35,1 à 36,7 bois/h (+4,5 %), soit environ 5 d par heure de bois, rentabilisé en 24 h. Aucun chiffre n'est donné avant l'achat, et le poste amélioré a le même aspect qu'avant. | `$S/d030.png`, `$S/d045.png` |

Déjà traités par une autre session (vus brièvement, non détaillés) : la caméra ne tourne pas à 360°, et la mule livre des villes non reliées par des cases achetées.

---

## (d) Incohérences de règles et de monde

1. **Texte d'accueil périmé** : « Un fondaco près de Venise, trois ateliers et cinq cents ducats » (`$S/s02-a.png`). On démarre sans atelier avec 650 ducats (`plan-premiers-pas` lot 1). C'est la toute première promesse du jeu, et elle est fausse.
2. **« Saison de novembre »** sous le logo (`$S/s01-a.png`) dans un monde « sans remise à zéro ».
3. **Géographie écrasée** : Padoue, Vérone, Trévise et San Marco tiennent sur une douzaine de cases autour du Fondaco (`$S/d014.png`). Vérone est à deux cases de Venise ; Ancône (à 250 km, de l'autre côté de l'Adriatique) arrive à la Casa 2, avant Venise elle-même (`zoneCasa.venezia = 3`) et avant Trévise (Casa 4). Je vends pourtant déjà à la Dogana de Venise, censée être hors de ma zone.
4. **Parcelles du cœur de Venise** (à côté de San Marco) « ouvertes à la Casa 8, ta Casa n'atteint pas encore cette région », avec un bouton « Voir la case » qui ne fait rien d'utile (`$S/d006b.png`). La case touche le Marché où l'on commerce dès la première minute.
5. **Recettes qui ne s'emboîtent pas** : un lot de carrière donne 8 argile, la briqueterie en veut 10 (9 avec −10 % d'intrants). Le premier lot ne suffit jamais, et il faut acheter au Marché ou attendre 19 min. Même décalage entre le camp (11 bois) et la scierie (10 bois, 9 net) : il reste 2 bois qui ne servent à rien.
6. **Arbitrage sans production** : 10 argile (30 d) + 2 bois (6 d) donnent 6 briques (60 d) ; le Marché vend sans limite visible (voir aussi le rapport QA, QA-02). On gagne sans rien extraire.
7. **Les chiffres de l'intérieur se contredisent** : le camp affiche « +64 % sur le plan d'origine » avant tout geste ; la carrière a un goulot de 27/h et une sortie de 24/h. Le joueur ne sait pas ce qu'est le « plan d'origine » ni pourquoi la sortie est sous le goulot (la manutention n'est montrée nulle part).
8. **Faveur** : le Carnet en donne (+40), elle s'affiche dans la barre du haut (drapeau rouge), mais rien ne dit à quoi elle sert à ce stade.
9. **Carnet** : « Gagner un niveau d'atelier » est rempli par la simple pose d'un atelier neuf ; « Vendre à la Dogana » parle d'un lieu que le jeu ne présente jamais (« San Marco », « Le Marché », « la Dogana » : trois noms pour le même bâtiment).
10. **Compagnie** : « De 2 à 6 amis, d'un mois à l'autre » (encore le rythme mensuel), puis le bouton dit « Fonder une guilde ».
11. **Deux tutoiements** : « Touchez une case libre » et « Touche une case libre de ton domaine » sur le même écran ; Lorenzo vouvoie, les panneaux tutoient.

---

## (e) Désagréable ou dur à comprendre

- **« Remise » veut dire deux choses** : la bande du bas qui montre le stock du Fondaco (« Remise · 11 Bois ») et le bâtiment des véhicules (« Poser la Remise », « Le quai », `$S/d015b.png`). Pour un joueur de gestion, l'entrepôt est l'objet central : il lui faut un nom unique (« Magasin », « Stock du Fondaco »).
- **Unités ambiguës** : « 120 d », « 480 d », « 90,11 d » (avec centimes), et ailleurs une pièce suivie de « 48 ». « d » se lit « deniers » pour qui connaît Venise ; la barre du haut n'a pas d'unité. Les recettes affichent « 11 Bois » sans durée : il faut entrer dans l'atelier pour apprendre que c'est un lot de 18 min (36/h).
- **Collecte manuelle dans chaque intérieur** : « Récolter » n'existe que dans l'intérieur de l'atelier (ou dans le bouton du guide quand il en a un). Quatre ateliers, c'est quatre entrées et quatre sorties toutes les 18 min. Le plan-ateliers disait que « Tout relancer » disparaissait au profit de choses dans la halle ; en pratique on a perdu le raccourci sans gagner d'automatisme.
- **Deux clics pour une action** : « Ouvrir la Dogana » ouvre un dock « Venise » où il faut encore toucher « Dogana » ; « Acheter la case » ouvre un dock avec un second « Acheter la case » (`$S/d007.png`).
- **Caméra qui erre** : après certaines actions, elle reste centrée sur San Marco ou zoomée très près, et le panneau de gauche couvre en permanence un tiers de l'écran, souvent là où la caméra pose le lieu choisi.
- **Le guide se tait après la Casa 2** : plus aucun objectif, alors que c'est le moment où le joueur a besoin d'un cap (Casa 3 ? Porta à la Casa 4 ? commandes ?).
- **Fiche de poste sans chiffres de décision** : « Améliorer · 120 d » sans gain prévu ni durée ; « En chantier » sans minuteur ; une barre rouge sans légende (usure ? chantier ?) ; « Vite ou soigné » sans effet chiffré (`$S/d030.png`).
- **Couleurs hors charte** : barre de progression violette, anneaux du Carnet violets, dock bordé de violet, panneau de poste noir et bouton « Récolter » ocre, alors que Porcellana demande un monde blanc avec un seul accent rouge. Lorenzo parle d'un « bouton doré » qui est rouge.

---

## (f) Ce qui manque pour la profondeur de gestion

1. **Une vraie chaîne entre ateliers** : un fournisseur voisin qui alimente directement son client (le plan-ateliers § 3.7, point 9, l'annonce). Aujourd'hui tout passe par le stock et par des clics, et le ruban rouge entre deux ateliers sur la carte (`$S/d037.png`) promet un flux qui n'existe pas.
2. **Priorités d'intrants** : quel atelier sert d'abord (briqueterie avant scierie), ou des quotas (« garder 20 bois »).
3. **Un tableau de bord de production** : par marchandise, produit/h, consommé/h, net/h, stock et plafond, temps avant plein. C'est l'écran de base d'Anno ou de Factorio, et il manque. « Tout voir » ne montre que la liste des ateliers.
4. **Prévisions avant d'agir** : le gain d'une amélioration de poste, d'un ouvrier, d'un déplacement (« 36 → 41/h ») ; le coût total d'une Casa en ducats **et** matériaux, avec le temps estimé pour les réunir.
5. **Un carnet de commandes lisible** : quand arrive la prochaine commande de chaque ville, quoi et combien, pour planifier sa production. Aujourd'hui, rien n'apparaît pendant deux heures, sans compte à rebours.
6. **Des objectifs à moyen terme** : une feuille « Prochain palier » (Casa 3 : 100 d, 10 briques, 10 planches ; la Porta à la Casa 4 : 1 200 d, 60 et 60) avec une barre d'avancement.
7. **Une économie lisible** : l'historique des prix de la Dogana, l'impact de ses propres ventes (−6 % sur le bois après 11 unités, indiqué seulement par un triangle « ▼ »), une marge par recette (bois 3 d → planche 10 d).
8. **Des ouvriers qui comptent** : la fatigue, le savoir-faire et l'équipe de nuit doivent changer le débit de façon visible (B3), et le joueur doit voir la fatigue sur le pion.
9. **Une ville qui vit** : rien ne bouge entre les ateliers et les villes en dehors de la mule de l'accueil ; on ne voit ni caisses, ni porteurs, ni barques sur le canal. Pour « voir une ville s'animer », il faut voir la marchandise circuler.

---

## (g) Idées d'amélioration, classées par impact

**Impact fort**

1. **Commandes dès la première session** : une commande régulière par ville de la zone dans les 15 premières minutes (le `firstLotBps` prévu), puis le rythme de croisière, avec le compte à rebours de la prochaine sur le repère de chaque ville. Corrige B1.
2. **Coût complet partout** : chaque bouton de construction ou d'amélioration affiche ducats + matériaux + durée + gain chiffré, et dit pourquoi il est grisé (« manque 5 briques »). Corrige B2 et la fiche de poste.
3. **Flux automatique entre voisins** : un atelier qui touche son fournisseur (case voisine) tire ses intrants en continu, avec des caisses qui glissent sur le ruban rouge. C'est le cœur d'un jeu de chaînes, et c'est la règle d'or 8 (« tout se voit »).
4. **Récolte au niveau de la carte** : toucher l'anneau rouge « ×1 » d'un atelier sur la carte (ou un « Tout récolter » unique) au lieu d'entrer dans chaque intérieur.
5. **Priorité des intrants** par atelier (haute, normale, basse) ou réserve minimale par marchandise.
6. **Écran « Économie » du Fondaco** : produit/consommé/net par heure et par marchandise, stock/plafond, prochaines commandes, marges. C'est l'écran que le joueur de gestion ouvrira dix fois par session.

**Impact moyen**

7. Équipe de nuit = heures de travail en plus (débit ×2 ou presque sur le poste), comme le dit le plan ; ou bien retirer le bouton tant qu'il ne rapporte rien.
8. Recettes qui s'emboîtent (lot de carrière = 10 argile, ou briqueterie à 8) : le premier lot doit suffire au client.
9. Un seul nom par chose : « Marché de San Marco » partout (la Dogana comme sous-titre), « Magasin » pour le stock, « Remise » seulement pour les véhicules.
10. Caméra : centrer le lieu choisi dans la zone visible, hors du panneau de gauche ; garder la fiche à l'écran.
11. Lorenzo continue après la Casa 2 : « Casa 3 », « Ta première commande de Bologne arrive dans 12 min », « La Porta à la Casa 4 », avec une main qui montre l'objet dont il parle.

**Impact faible (finition)**

12. Corriger les textes périmés (« trois ateliers et cinq cents ducats », « saison de novembre », « d'un mois à l'autre », « bouton doré ») et choisir tu ou vous.
13. Unités claires : « 120 ducats » ou une pièce partout, sans centimes ; chaque recette affichée « 11 bois / 18 min ».
14. Remettre les couleurs à la charte Porcellana (violet et ocre retirés).
15. Un écran de la Casa qui rappelle exactement ce qui a été gagné (stock, ville, place).
16. Une géographie plausible (Venise au centre, Padoue et Trévise proches, Vérone et Ancône lointaines), sinon le joueur de Patrician décroche.
