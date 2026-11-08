# Audit joueur n° 5 : l'amateur de city-builders (et de Venise)

*7 novembre 2026. Profil : Townscaper, Islanders, Anno, Pharaoh, Banished, Manor Lords, Dorfromantik ; passionné de la Venise du Quattrocento. Partie jouée par l'écran, sur PC (1280x800) et un peu sur téléphone (390x844), serveur isolé (port 4105, intérieur des ateliers allumé, base en mémoire). Le serveur a redémarré en cours de partie (machine relancée), j'ai donc refait un compte et rejoué l'accueil.*

*Limite de l'essai : le WebGL est logiciel et la machine était partagée. Une capture prenait 45 à 130 s, je n'ai donc vu les animations qu'image par image. Ce qui touche au mouvement fin (fluidité, chevrons, fumée) est à revoir sur une vraie machine. Je n'ai pas pu juger le son (navigateur sans tête). Captures : `/tmp/claude-0/-home-user-naoned/7091555e-9be4-5e80-9143-48409e2cdd8e/scratchpad/p5-citybuilder/`.*

## (a) Résumé

1. Le plateau en porcelaine est **beau en image fixe** : Fondaco crénelé, San Marco et son campanile, la coupole du Santo à Padoue, le four voûté de la briqueterie. C'est un vrai diorama, lisible.
2. Mais **la ville ne vit pas**. Pas un habitant, pas une barque sur l'eau, pas de fumée, pas de cycle jour-nuit. Je n'ai jamais vu la mule de ma livraison. Les seuls êtres vivants que j'ai aperçus, ce sont deux mules au repos au pied du Fondaco, sur téléphone.
3. **L'échelle est incohérente.** Une case vaut environ 75 km (l'Europe tient en 30 cases), mais elle porte un seul bâtiment et trois arbres. Venise touche Padoue, une forêt de sapins pousse entre le Fondaco et San Marco, et Venise est posée sur la terre ferme, entourée de parcelles agricoles, sans lagune.
4. **Après l'accueil (environ 2 minutes), il ne se passe plus rien** : aucune commande avant environ 2 h, un lot de bois toutes les 18 min, à ramasser à la main. Pour un joueur de gestion, c'est une maquette qu'on regarde attendre.
5. L'intérieur des ateliers est une **salle carrelée et fermée**, avec trois établis identiques et des pions d'échecs. Pour un camp de bûcherons, abattre des arbres sous un toit casse l'immersion.

**La ville vit-elle ? 2/10.** **Publiable ? Non**, ni comme city-builder ni comme jeu de gestion « vivant ». Comme diorama marchand sobre, c'est presque prêt visuellement, mais rien ne bouge et le monde n'a pas de géographie crédible.

## (b) Parcours

1. Connexion, nom proposé (« Zuan Bembo » devient « Zuan_Bembo », avec un tiret bas peu vénitien). Écran « Fondez votre Maison » : *« un fondaco près de Venise, **trois ateliers** et cinq cents ducats »*. En réalité, on a 650 ducats et aucun atelier (le texte précède le lot 1 des premiers pas) (`02-start.png`).
2. Lorenzo en trois cartes : *« Suivez le **bouton doré** »*, alors que le bouton est rouge (Porcellana). Sa main pointe l'onglet « Carte », puis l'onglet « Fondaco », alors que la consigne parle d'une case (`05-after-lorenzo.png`, `11-zoomout.jpg`).
3. « Bâtir », puis le camp de bûcherons, posé sur la case voisine du Fondaco, à une case de Padoue et à deux de San Marco (`07b-built.png`). « Lancer la production », bois prêt en 30 s, « Ramasser », « Padoue attend 11 bois », « Livrer ». La mule part pour 45 s, mais on ne la voit nulle part, et la caméra ne va pas à Padoue (`10-deliv-0.jpg`, `30-deliv-0.jpg`). Le gain est annoncé « +100 » mais la caisse ne prend que 96 (530 → 626).
4. Lorenzo enchaîne : *« Briqueterie : bâtissez cet atelier »*, alors que je n'ai pas d'argile. Je bâtis donc une carrière d'argile, puis la briqueterie. La deuxième pose rapide échoue en silence (HTTP 422, aucun message). La carrière n'apparaît dans « Tes ateliers » qu'au rechargement (`17-two-more.jpg`, puis `18-after-briq.jpg`).
5. Dézoom maximal : le monde entier visible fait **une quinzaine de cases** qui flottent dans le vide (`11-zoomout.jpg`). Je cherche « Padoue » : la fiche s'ouvre, mais la caméra ne bouge pas (`12-padoue.jpg`).
6. L'intérieur du camp de bûcherons reste vide plus de 20 s, puis apparaît : une salle murée, trois établis alignés, trois pions (`14-interior-b.jpg`).
7. Rotation au clic droit : quelques degrés seulement (`31-rotated.jpg`).
8. San Marco, puis « Ouvrir la Dogana », puis une deuxième fiche « Venise » à quatre icônes, puis « Dogana » : la liste des prix (`33-market.jpg`, `34-dogana.jpg`). Le bois vaut 3 d, les briques 10 d : pour la Casa 2, il suffit d'acheter 5 briques et 5 planches pour 100 d, sans rien produire.
9. Onglet Fondaco : la même carte, avec une feuille « Bâtir / Le quai ». Onglet Compagnie : le carnet de la semaine (chiffres). Téléphone : la carte est lisible, deux mules au pied du Fondaco (`36-mobile.jpg`).

**Déjà connus (autre session) :**
- La rotation limitée est **confirmée** : quelques degrés au clic droit.
- La mule qui marche sur l'eau : **pas vue**, puisque je n'ai jamais vu la mule du tout. Ma seule livraison allait à Padoue, voisine d'une case.

## (c) Bugs

| # | Bug | Reproduction | Gravité | Capture |
|---|---|---|---|---|
| B1 | **La livraison ne se voit pas.** Pendant les 45 s du trajet vers Padoue, aucune mule ni charrette sur la carte, et la caméra ne va pas à la ville (pourtant annoncé au lot 4 des premiers pas). | Accueil jusqu'à « Livrer », puis regarder la carte. | **Bloquant** pour la promesse « tout se voit » | `…/p5-citybuilder/10-deliv-0.jpg`, `…/30-deliv-0.jpg` |
| B2 | Le texte de fondation promet « trois ateliers et cinq cents ducats ». On a 0 atelier et 650 ducats. | Nouveau compte. | Moyenne (première phrase du jeu fausse) | `…/02-start.png` |
| B3 | Lorenzo dit « bouton doré », alors que le bouton est rouge. | Intro, carte 3/3. | Faible | — |
| B4 | La main de Lorenzo pointe les onglets « Carte » puis « Fondaco » au lieu de la case ou de l'objet à toucher. | Après l'intro, puis après la livraison. | Moyenne (le guide égare) | `…/05-after-lorenzo.png`, `…/11-zoomout.jpg` |
| B5 | Lorenzo demande une briqueterie alors que la maison n'a pas d'argile ; la briqueterie bâtie affiche aussitôt « Il manque : Argile ». | Après la première livraison. | Moyenne (chaîne illogique dès la 2ᵉ étape) | `…/19-toutvoir.jpg` |
| B6 | Le paiement est annoncé « +100 », mais la caisse ne reçoit que 96. | 530 → 626 après la livraison d'accueil. | Faible (mais un jeu de commerce doit tomber juste) | `…/30-deliv-0.jpg`, puis `…/31-rotated.jpg` |
| B7 | Deux poses d'atelier à la suite : la seconde renvoie un 422, en silence. | Poser une carrière, rouvrir une case libre, poser une briqueterie dans les 5 s. | Moyenne | log réseau |
| B8 | Un atelier tout juste bâti n'apparaît pas dans « Tes ateliers » avant l'action suivante ou le rechargement. | Bâtir la carrière d'argile. | Moyenne | `…/17-two-more.jpg` |
| B9 | La recherche « Padoue » ouvre la fiche mais ne déplace pas la caméra. Padoue reste inaccessible du regard tant qu'on ne sait pas que c'est la case aux maisons voisine. | Recherche, puis Entrée. | Moyenne | `…/12-padoue.jpg` |
| B10 | L'intérieur d'atelier reste blanc plus de 20 s à l'ouverture (à confirmer sur GPU réel). | Clic sur l'atelier dans la liste. | À vérifier | `…/14-interior-a.jpg`, `…/15-station.jpg` |
| B11 | L'eau apparaît dans plusieurs captures en dalles à des hauteurs différentes, en escalier, plus de 10 s après le chargement. Ce serait l'animation d'arrivée qui ne finit pas quand les images sont lentes (à confirmer sur GPU réel). | Recharger la carte. | À vérifier | `…/17a-catalogue.jpg`, `…/35-fondaco-tab.jpg` |
| B12 | La caméra démarre à un endroit et à un zoom différents à chaque chargement. | Recharger. | Faible | `…/10a-before.jpg` et `…/08-producing.png` |
| B13 | La fiche « Case libre » est une carte **noire**, alors que Porcellana demande une carte de papier `#FBFAF7`. | Toucher une case libre. | Faible (cohérence DA) | `…/17a-catalogue.jpg` |
| B14 | Le Marché demande trois touches : San Marco, « Ouvrir la Dogana », une fiche « Venise » à quatre icônes, puis « Dogana ». La D8 voulait un seul bouton rond. | Toucher San Marco. | Faible | `…/33-market.jpg` |

## (d) Incohérences du monde

### Géographie et échelle (le cœur du problème)

- **Une case, c'est une province, mais elle se dessine comme une parcelle.** L'Europe entière tient sur une grille d'environ 30 × 30 cases de 15 unités (`venice1450.squares.ts`). Une case vaut donc à peu près 75 km. Pourtant, elle porte un atelier, deux sapins et un tas de bûches. Le joueur croit voir un village, alors qu'on lui montre une carte d'Europe. Il faut choisir : soit un **domaine** (une case = un îlot ou un champ de 100 m), soit une **carte du commerce** (une case = une province, avec des icônes). Le jeu fait les deux à la fois, et rien n'a d'échelle.
- **Venise n'est pas dans sa lagune.** San Marco est posé sur une dalle de terre, entouré de parcelles « + » (dont deux « Niv. 8 » collées à la basilique). La seule eau visible est un ruban rectangulaire entre le Fondaco et San Marco, une boîte aux bords à pic qui s'arrête net dans le vide (`34-dogana.jpg`). Pas de lido, pas d'îles, pas de canaux, pas de rive. Pour un jeu « Venise 1450 », c'est le contresens majeur.
- **Le « Fondaco près de Venise » est à trois cases au sud de Venise** (case 10,11 ; Venise 11,8), à hauteur de Vérone et de Rovigo. Au niveau 1, sa zone couvre **Bologne** (en Romagne) mais **pas Venise**, qui n'arrive qu'à la Casa 3. Un marchand vénitien qui livre Bologne mais pas le Rialto, c'est absurde.
- Padoue touche Venise (une case) et touche mon camp de bûcherons. Vérone est à deux cases du Fondaco et **au sud** de Venise (dans la réalité, elle est à la même latitude, 110 km à l'ouest). Trévise est verrouillée « Niv. 4 », alors qu'elle est à 30 km.
- **Le monde se termine au bord du plateau** : au dézoom maximal, quinze cases dans le blanc. Les villes de la zone (Bologne, Vérone) n'y sont pas visibles. Le joueur n'a aucune carte mentale de l'Italie.
- **Les routes.** Il n'y a qu'un ruban rouge, de l'atelier au Fondaco. Aucune route ne mène du Fondaco vers Padoue, ni vers un quai ou San Marco. La carrière d'argile n'est reliée à rien (`18-after-briq.jpg`).

### Logique

- **Le stock s'appelle « Remise »** (pastille en bas : « Remise · 11 Bois »), alors que la Remise est aussi un bâtiment de véhicules qu'on n'a pas encore bâti (« dès la Casa 2 »). Le Fondaco, qui est l'entrepôt, n'est jamais nommé comme tel dans l'interface du stock.
- **On ramasse le bois à la main** au lieu de le voir rouler jusqu'au Fondaco par la route rouge. La route existe mais ne porte rien.
- Le Marché vend des briques et des planches à 10 d : la première montée du Fondaco s'achète sans produire. Ça vide de sens la chaîne que Lorenzo pousse.
- Il n'y a aucune commande pendant environ 2 h après l'accueil (`nextAt` des trois villes) : la boucle « produire, livrer » s'arrête net.

### Histoire et chaînes

- **Un camp de bûcherons à côté de San Marco.** Venise n'avait pas de forêt. Le bois venait du Cadore et du Cansiglio (forêt de l'Arsenal), descendu en **zattere** (radeaux) sur la Piave et le Brenta. Ce serait une magnifique chaîne visible, et le jeu la remplace par trois sapins.
- **« Verrerie de Murano » se bâtit n'importe où sur la terre ferme.** Depuis 1291, les verriers sont confinés à Murano. Il faudrait au moins une case d'île ou de lagune.
- **Le verre = sable + bois.** Il manque la **soude** (*allume catino*, cendres de plantes du Levant), l'import clé de la verrerie vénitienne et un lien naturel avec la mer.
- **Les miroirs = verre + planches, en 1450.** Le miroir de Murano (étain-mercure) date du début du XVIᵉ siècle (dal Gallo, 1507) : c'est un anachronisme, et il manque l'étain et le mercure.
- **Le sel est rangé en « luxe d'Orient »**, alors que c'est **le** monopole vénitien, tiré des salines de Chioggia, toutes proches. La Vénétie « produit du sel », mais aucun atelier de saline ne figure au catalogue.
- Le vin est rangé lui aussi en « Orient / luxe ». Les draps et la soie sont importés seulement, alors que la soierie vénitienne (velours, damas) était une industrie phare de la ville.
- Il n'y a ni chanvre ni cordages, ni poix, ni chantier naval : **l'Arsenal**, la plus grande usine d'Europe en 1450, est absent des chaînes de la Vénétie.
- **La carrière d'argile est dessinée comme une carrière de pierre** (grue, blocs taillés). Une glaisière, c'est une fosse humide, des tas de glaise et des briques qui sèchent.
- **L'intérieur du camp de bûcherons est une salle fermée**, avec trois établis identiques (abattage, ébranchage, empilage). L'abattage se fait en forêt ; ici, ni arbre, ni bille qui passe d'un poste à l'autre (`links: []`).

## (e) Ce qui manque pour qu'une ville semble vivante

1. **Des gens.** Aucun habitant, porteur, gondolier, marchand ou moine. Les ateliers ont des « mains » au moteur (`hands`), mais on ne les voit que comme des pions dans l'intérieur.
2. **Du mouvement lié au jeu.** La mule entre l'atelier et le Fondaco quand un lot sort, la charrette vers la ville pendant la commande, la barque sur l'eau. La grammaire Porcellana prévoit déjà « les charrettes et les navires y roulent quand un trajet est en cours » : je ne l'ai pas vu.
3. **Des signes de travail.** Fumée de la briqueterie et de la verrerie, hache qui tombe, roue du moulin, bâtiment qui s'éteint « à l'arrêt ». Le seul signe que j'ai vu, c'est le petit drapeau rouge.
4. **Le temps.** Pas de jour et de nuit, pas de saison (le jeu a des « chapitres » mensuels qui ne se voient pas), pas de cloches de San Marco à l'heure.
5. **De l'eau qui vit.** Reflets, petites vagues, gondoles amarrées, une rive, des pieux (*bricole*).
6. **Mes choix qui changent la ville.** Aujourd'hui, un atelier = un modèle posé sur une dalle. Les villes livrées ne changent pas (Padoue reste identique après ma livraison).
7. **Un monde autour.** Des terres hors domaine dessinées en relief, même inaccessibles : les Préalpes au nord, le Pô, la mer à l'est. Au lieu du vide blanc.
8. **Moins d'interface sur la carte.** Le panneau de gauche mange un tiers de l'écran PC en permanence.

## (f) Idées concrètes, classées par impact

**Impact majeur (à faire avant publication)**
1. **Montrer chaque trajet.** Une mule ou une charrette par livraison, avec sa caisse rouge, qui suit la route case par case. La caméra la suit pendant l'accueil. Au retour, le sac de ducats tinte au-dessus du Fondaco.
2. **Faire de la lagune le centre du plateau.** Venise sur ses îles (San Marco, le Rialto, Murano, Chioggia), l'eau partout autour, la terre ferme à l'ouest. Le Fondaco **sur le Grand Canal**, au Rialto, comme le vrai Fondaco dei Tedeschi. Les ateliers de la terre ferme reliés par le Brenta, en barque.
3. **Trancher l'échelle.** Deux niveaux de carte :
   - le **domaine** (cases de 100 m : ateliers, quais, maisons qui poussent) ;
   - la **carte du commerce** (cases-provinces, villes en icônes, routes et lignes de galères).
   On zoome de l'une à l'autre (Anno, Pharaoh). Les villes livrées restent sur la carte du commerce.
4. **Supprimer le « Ramasser » manuel.** Le lot rejoint le Fondaco seul, par la route, en caisse visible. La règle d'or 3 (plafond) reste respectée : quand le stock est plein, les caisses s'empilent devant l'atelier, et ça se voit.
5. **Remplir le creux qui suit l'accueil.** Une deuxième et une troisième commande garanties dans les 10 premières minutes (Padoue, puis Venise), et un lot qui tombe en 2 à 3 min au début.

**Impact fort**
6. **Habitants proportionnels à la Casa.** Chaque niveau du Fondaco ajoute des maisons à cheminées en entonnoir autour de lui, des passants et un marché du matin sur le campo. La ville grandit avec moi, comme Townscaper ou Kingdoms and Castles.
7. **Des signatures animées par atelier, liées à l'état du jeu.** Fumée (briqueterie, verrerie, boulangerie), roue (moulin), scie (scierie), moutons (bergerie). Elles s'arrêtent à l'arrêt, avec une fumée grise quand il manque un intrant. Le moteur le sait déjà (« Il manque : Argile »).
8. **Des chaînes géographiques.**
   - Le bois descend du Cadore en **zattere** sur la Piave : une case de forêt en montagne, une rivière, un radeau visible.
   - Le verre exige une case de Murano et de la **soude** venue d'Alexandrie ou de Syrie par galère.
   - Le sel vient des **salines de Chioggia** : un atelier de saline sur une case de lagune, avec des bassins miroitants.
9. **Ajouter l'Arsenal et ses chaînes** (chanvre, cordes, poix, bois de chêne d'Istrie), qui débouchent sur des galères qu'on voit sortir.
10. **Jour, nuit et saisons** à l'heure réelle du joueur. Lanternes le soir, brume d'hiver sur la lagune. Le « chapitre » du mois se voit par une fête : Carnaval en février, Sensa (le mariage avec la mer) en mai, Redentore en juillet.

**Impact moyen**
11. **Les villes réagissent aux livraisons.** Chantier à Padoue après une commande de briques, lumières de fête, et leur blason qui grandit avec la fidélité.
12. **Les intérieurs selon le métier.** Clairière à ciel ouvert pour le camp, fosse et four pour la briqueterie, *fornace* à Murano. Les billes ou les briques passent d'un poste à l'autre, et les ouvriers ont des silhouettes de métier, pas des pions.
13. **Embellissement sans effet de puissance** (règle 4) : puits (*vere da pozzo*), statues, ponts, gondoles, gagnés en jouant. Islanders et Townscaper montrent que c'est ce qui attache.
14. **Quartiers (*sestieri*)** : regrouper des ateliers voisins donne un nom de quartier et un petit bonus de voisinage visible (bannière). Le voisinage par cases existe déjà au moteur (D7).
15. **Événements visibles** : galère de Flandre ou d'Alexandrie qui arrive (prix qui bougent à la Dogana), acqua alta qui inonde le campo une heure, peste lointaine qui ferme une ville (cadenas noir), le doge en *bucintoro*.
16. **Sons** : cloches, cris des gondoliers, scie, four, ressac (je n'ai pas pu les vérifier).

**Petites corrections rapides**
- Le texte de fondation (B2), le « bouton doré » (B3), la main de Lorenzo (B4).
- Faire demander par Lorenzo la carrière d'argile **avant** la briqueterie (B5).
- Le « +100 » qui ne donne que 96 (B6) ; l'erreur 422 qui ne s'affiche pas (B7).
- Renommer la pastille « Remise » du stock en « Fondaco » ou « Magazzino ».
- Le panneau de gauche, repliable sur PC.
- La carrière d'argile dessinée en glaisière.
