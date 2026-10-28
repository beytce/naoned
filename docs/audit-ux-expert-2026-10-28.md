# Audit UX des 24 maquettes Fondaco (28 octobre 2026)

Périmètre : les 24 fichiers `.dc.html` de `fondaco-maquettes/project/` (CarteAvant exclue), lus balise par balise. Toutes les positions et tailles citées sont en px dans le cadre 390 × 844.

---

## Verdict en 5 lignes

1. **La carte est réussie, mais elle est seule dans son monde.** C'est le seul écran qui respire (une phrase, une fiche, une action), et c'est aussi le seul qui bouge : 24 règles d'animation dans `Main`, **zéro** dans les 23 autres fichiers. Aucun moment de récompense n'est animé : récolte, livraison, coffre, enchère gagnée, fin de mois.
2. **Les actions de la carte n'agissent pas.** « Récolter », « Livrer » et « Préparer » ouvrent un autre écran, et le bouton « Ouvrir » d'à côté mène, dans 6 lieux sur 8, à la même page que le bouton en or.
3. **La navigation a deux grammaires.** La barre à 5 onglets n'existe que sur la carte ; ses 4 autres destinations l'effacent et affichent « ‹ Carte » ; la Conquête a sa propre barre à 4 portes, dont une s'appelle « Commerce ». Deux écrans (Calendrier, Tâches du jour) n'ont aucun lien entrant.
4. **Les écrans d'information sont restés à l'ancienne densité.** Huit écrans portent des onglets segmentés. Politique empile intro, deux rumeurs, une alerte, un pli à trois boutons et une grille de sources. Profil a 4 onglets, Fiche 3 onglets plus des puces de démonstration.
5. **Le lexique est appliqué aux titres, pas aux détails.** Il reste : ligues numérotées à l'envers, « pts », « taxe −2 points », « quota de la Douane », « référence », « ⚔ 25 », « 121/140 », « 42′ », « 3 d'Influence » (où « d » se lit comme les ducats), « frise », « en orbite », « Seigneur de Vicence ». S'y ajoutent des chiffres contradictoires d'un écran à l'autre.

---

## Les 10 recommandations les plus importantes (par impact)

### 1. Déplacer le mouvement : calmer la carte, animer les récompenses

**Constat.**
- `Main.dc.html` fait tourner en boucle infinie :
  - 4 halos dorés (`.glow`, 2,6 s) ;
  - la pièce de la bourse qui se retourne toutes les 5 s (`.coin`) ;
  - le reflet du bouton en or (`.gold`, `shine` 3,5 s infini) ;
  - deux rotations (`.spin` 40 s, `.spinfast` 16 s) ;
  - deux nuages en `filter: blur(12px)` animés ;
  - la caravane, le bateau et les vagues.

  Cela fait 12 boucles simultanées. Ailleurs, rien ne bouge : `grep animation` renvoie 0 sur les 23 autres fichiers. `BonRetour` affiche « +2 660 d » en statique, `Saison` affiche le « 4ᵉ » en statique, et l'enchère gagnée n'existe que comme une ligne dans Messages.

**Pourquoi c'est un problème.**
- Dans Hay Day ou Clash Royale, le décor bouge peu et lentement, et **la récompense explose**. C'est ce contraste qui crée le plaisir de revenir.
- Ici, c'est l'inverse : l'œil est sollicité en permanence sur la carte et rien ne marque le gain.
- Un `filter: blur` animé et des `offset-path` coûtent cher sur un Android d'entrée de gamme, ce qui provoque saccades et chauffe.

**Correction.**
- **Carte.**
  - Supprimer l'animation infinie `.coin` et ne la jouer qu'au gain (voir plus bas).
  - `.gold` : `animation: shine 1.2s ease-out .25s 1` (un seul reflet quand la fiche monte).
  - `.spinfast` : passer de 16 s à 40 s.
  - `.cloud` : remplacer `filter: blur(12px)` par un `background: radial-gradient(closest-side, rgba(194,212,234,.07), transparent)` non flouté.
  - Limiter les halos à 2 (voir n° 5) et les décaler (`animation-delay: -1.3s` sur le second).
- **Récolter** (fiche de la carte, `Comptoir`, `BonRetour`) :
  - 0 ms : le bouton se presse (`scale(.96)`, 100 ms) avec un retour haptique léger.
  - 80 ms : 6 à 8 marques de marchandise (12 px) partent du soleil des ateliers en courbe vers l'icône de l'onglet « Ateliers » (550 ms, `cubic-bezier(.5,0,.8,.4)`, décalage de 50 ms entre deux marques).
  - À l'arrivée de chaque marque, l'icône rebondit (`scale 1 → 1.15 → 1`, 150 ms).
  - Un « +8 farine » monte de 24 px et s'efface (600 ms).
  - Le halo du lieu s'éteint (400 ms).
  - La phrase de la fiche devient « Relancé · prochain lot à 14 h 30 ».
- **Livrer** :
  - la caravane (déjà dessinée, `.caravan`) part réellement vers la ville en 1,2 s ;
  - à l'arrivée, « +48 d » monte au-dessus de la ville ;
  - la bourse compte de 1 284 à 1 332 en 600 ms et la pièce fait **un seul** tour (`rotateY 360°`, 500 ms).
- **Bon retour** :
  - le chiffre compte de 0 à 2 660 en 900 ms (`ease-out`) ;
  - les 4 tuiles entrent ensuite l'une après l'autre (décalage de 60 ms, `translateY 12px → 0`, 250 ms).
- **Fin du mois** :
  - étape 1 : le disque doré passe de `scale(.6)` à 1 avec un rebond (450 ms) et des rayons tournent une fois ;
  - étape 2 : les marches du podium montent dans l'ordre 3 → 2 → 1 (350 ms, décalage de 150 ms) ;
  - étape 3 : chaque récompense glisse de la droite (décalage de 120 ms).
- **Enchère gagnée** : un cachet « Adjugé » tombe sur la carte du lot (`scale 1.4 → 1`, 250 ms, avec rebond), puis le contenu du lot se déplie.
- **Coffre du jour** : le couvercle s'ouvre (`rotateX`, 400 ms), puis 5 pièces jaillissent vers la bourse.
- **Atout pris** : la carte choisie vole vers ses ateliers (transition FLIP, 500 ms).
- **Lettre** : le cachet de cire se brise au choix (300 ms).
- **Tous les fichiers** : la règle `@media (prefers-reduced-motion: reduce)` de `Main` passe dans une feuille commune à tous les écrans. Sous cette règle, les trajectoires sont remplacées par un fondu enchaîné du chiffre (150 ms). On ne supprime pas l'information.

### 2. Faire agir le bouton en or sur place ; « Ouvrir » ne sert qu'à aller ailleurs

**Constat.** Dans `Main.dc.html`, `renderVals`, pour 6 lieux sur 8, `href` et `open` mènent au même fichier :
- Mes ateliers : `Comptoir` et `Comptoir` ;
- Padoue : `Ville` et `Ville` ;
- les 4 villes calmes : `Ville` et `Ville`.

Ailleurs :
- « Récolter » et « Livrer » sont des liens `<a>` qui changent d'écran.
- « Préparer » (Vérone) envoie vers `Palais` alors que le geste attendu est une livraison. `Palais` renvoie ensuite vers `Ville`, ce qui fait une boucle.
- Pour Vicence, Trévise, Mantoue et Ferrare, le bouton en or dit « Voir », alors qu'il n'y a rien à faire là-bas.

**Pourquoi c'est un problème.**
- La promesse de la carte est « un lieu, une phrase, une action ». Si l'action change d'écran, on revient au jeu de feuilles qu'on voulait quitter.
- Deux boutons qui mènent au même endroit obligent le joueur à se demander lequel choisir, pour rien.
- Un bouton en or sur « Voir » dévalue l'or.

**Correction.** La règle : l'or **fait**, le bouton fantôme **emmène**.
- **Mes ateliers** : `cta: 'Récolter 2 lots'`, transformé en `<button>` qui récolte sur place (animation du n° 1). Le bouton fantôme « Ouvrir » reste, vers `Comptoir`.
- **Padoue** : `cta: 'Livrer 30 pains · +48 d'`, en `<button>` sur place (la caravane part). Le bouton fantôme devient « Voir Padoue ».
- **Vérone** : `cta: 'Préparer 30 pains'`, avec `href: 'Ville.dc.html'` et la mule pré-remplie (au lieu de `Palais`). Le bouton fantôme devient « La rumeur », vers `Palais`.
- **Venise** : `cta: 'Voir les enchères'`, avec `href: 'Mole.dc.html'`. Le bouton fantôme devient « Entrer à Venise ».
- **Villes sans attente** : pas de bouton en or. Un seul bouton fantôme pleine largeur, « Voir Trévise ». Dans le JSX, rendre le `.gold` sous `<sc-if value="{{sel.waits}}">`.
- Masquer le bouton fantôme quand `sel.open === sel.href`.

### 3. Une seule grammaire de navigation

**Constat.**
- La barre à 5 onglets (`Main`, `<nav>` de 68 px) disparaît sur les 4 autres destinations : `Comptoir`, `Venise` et `Classement` affichent « ‹ Carte » en haut à gauche.
- `Terraferme` a sa propre barre (4 « portes » de 50 px, 88 px de haut), où la carte s'appelle **« Commerce »** et où l'onglet Conquête n'existe pas.
- `Cadran` et `Aujourdhui` n'ont **aucun lien entrant**. La note du canevas dit « se rejoignent par les Messages et les Ateliers », mais ni `Cloche` ni `Comptoir` n'y mènent.
- `Fiche` revient toujours à « ‹ Classement », même quand on vient du Marché, de l'élection, des 40 palais ou de Venise.
- `Connexion` : l'image des palais est un lien vers `Canal`, accessible à un visiteur non connecté, dont le retour mène à `Venise`.
- Liens morts `href="#"` ou `#aide` :
  - `Rialto` : 2 + 1 ;
  - `Profil` : 4 ;
  - `Production`, `Palais` et `Classement` : 1 chacun.
- Profondeur : `Main → Venise → Marché → Blé → Fiche` fait 5 niveaux. La règle Lagune en autorise 3.

**Pourquoi c'est un problème.**
- Sur mobile, le pouce apprend une barre. Si elle disparaît une fois sur deux, le joueur ne sait plus s'il est « dans un onglet » ou « dans un lieu ».
- « Commerce » pour désigner la carte est un troisième nom pour la même chose.
- Des écrans sans chemin d'accès n'existent pas pour le joueur.

**Correction.**
- **Barre persistante.**
  - Copier le `<nav aria-label="Les lieux">` de `Main` à l'identique en bas de `Comptoir`, `Venise`, `Classement` et `Terraferme`, avec l'onglet courant en `color: #f4c554` et `aria-current="page"`.
  - Supprimer le lien « ‹ Carte » de ces 4 en-têtes.
  - Dans `Terraferme`, supprimer le `<nav>` à 4 portes et remonter la frise de `top: 668px` à `top: 690px`, au-dessus de la barre de 68 px.
- **Écrans orphelins.**
  - Dans l'en-tête de `Main`, entre la bourse et la cloche, ajouter un bouton rond de 44 px « Tâches du jour » : un coffre de 20 px entouré d'un anneau de progression 1/3 en `#6ec8f5`, avec `href="Aujourdhui.dc.html"` et `aria-label="Tâches du jour : 1 sur 3"`.
  - Au pied d'`Aujourdhui`, sous le coffre, ajouter un lien texte « Le calendrier du mois › » vers `Cadran.dc.html`.
- **Retours.**
  - `Fiche` : remplacer « ‹ Classement » par « ‹ Retour » (historique).
  - `Lettre` et `Atout` : le voile et le lien de fin reviennent à l'écran d'origine.
- **Liens.**
  - `Connexion` : retirer le `<a href="Canal.dc.html">` autour du SVG et garder le SVG seul.
  - Remplacer chaque `href="#"` et `#aide` par une vraie cible, ou retirer l'élément de la maquette.
- **Profondeur.** Depuis `Negoce`, les noms du carnet d'ordres ne sont plus des liens (voir l'écran Négoce). La fiche d'un joueur s'ouvre en feuille par-dessus l'écran, pas comme un niveau de plus.

### 4. Couper les onglets et les sections des écrans d'information

**Constat.** Huit écrans portent des onglets segmentés :
- Cloche (4) ;
- Bâtir (2) ;
- Rialto (3, plus 3 filtres) ;
- Négoce (2) ;
- Palais (3) ;
- Classement (3) ;
- Fiche (3) ;
- Profil (4).

`Palais`, onglet Rumeurs, empile dans l'ordre :
1. un paragraphe d'introduction de 3 lignes ;
2. 2 cartes ;
3. une alerte espion ;
4. un pli « Manœuvres » contenant 2 offres, 3 boutons fantômes, une phrase d'avertissement et une grille de 4 sources.

`Venise` montre 4 lunes avec badges, **puis** une feuille de 3 lignes qui répète ces mêmes badges (offre d'actions, espion, 3 lots).

**Pourquoi c'est un problème.**
- Le porteur a jugé la carte « beaucoup trop chargée », et ces écrans le sont davantage.
- Un onglet est une décision à prendre avant même de voir le contenu. Snap et Clash Royale n'en ont jamais plus de 3 par écran, et presque jamais sur un écran d'action.

**Correction.**
- **`Cloche`** : supprimer la rangée d'onglets Tout, Commerce, Marchands, Politique. Six messages se lisent sans filtre, groupés par Aujourd'hui et Hier.
- **`Profil`** : un seul contenu (Maison). Héritage, Guilde et Réglages deviennent 3 lignes `.line` de 48 px avec chevron, sous les statistiques.
- **`Fiche`** :
  - supprimer les puces « vous venez de : » ;
  - supprimer les onglets et les remplacer par 3 lignes fixes :
    - « Palmarès : 2ᵉ, 5ᵉ, 1ᵉʳ · 3 générations » ;
    - « Actions : 22 d · vous en avez 12 » ;
    - « Contre vous : 2 duels gagnés, 1 perdu ».
- **`Palais`**, onglet Rumeurs :
  - supprimer le paragraphe d'introduction ;
  - déplacer l'alerte espion dans Messages ;
  - sortir les Manœuvres dans une feuille ouverte par un lien texte « Manœuvres › » ;
  - supprimer la grille « Vos sources » et inscrire la fiabilité de la source dans chaque carte (voir l'écran Palais).
- **`Venise`** : supprimer les 3 lignes de la feuille du bas et ne garder que la ligne du Doge.
- **`Rialto`** : supprimer la rangée de filtres « Tout · En stock · En hausse » (7 lignes n'en ont pas besoin) et garder « taxe 3 % » en légende.

### 5. Rendre l'or à l'action

**Constat.**
- **`Main`** :
  - les halos des 4 lieux en attente sont **dorés** (`rgba(244,197,84,.45)`) ;
  - Mes ateliers et Venise ont une bordure et un nom en `#f4c554` ;
  - la bourse est dorée ;
  - le bouton aussi, ce qui fait 7 taches d'or à l'écran.
- **`Batir`** : le bouton en or affiche « Il manque des matériaux », une action impossible.
- **`Palais`** : une carte de rumeur a une pilule menthe « Préparer une livraison pour Vérone › » **et** un bouton en or « Charger 30 pains pour Vérone ». Ce sont deux actions principales pour le même geste.
- **`Classement`** : l'action de balayage « Défier » est sur fond `#f4c554`.
- **`Terraferme`** : le camp est un disque en dégradé or, « Bataille 20 h » est en or, et l'état fermé n'a aucune action.
- **`Ville`** : la puce de rumeur est en or (`rgba(244,197,84,.14)`, bordure `#c89632`).

**Pourquoi c'est un problème.** La règle Lagune dit « une seule action en or ». Si tout ce qui compte est doré, l'œil ne trouve plus le bouton.

**Correction.**
- **Halos de `Main`**, une couleur par sens :
  - atelier prêt : `rgba(110,224,184,.45)` (vert d'eau, la couleur « prêt » du jeu) ;
  - ville qui achète : `rgba(110,200,245,.4)` ;
  - rumeur : `rgba(142,107,216,.45)` ;
  - enchères : `rgba(142,107,216,.45)`.
- **Bordures et noms de `Main`** : supprimer la bordure et le nom dorés de Mes ateliers et de Venise. Utiliser `border: #6d8db8` et `nameColor: #ecf5ff` partout. Le soleil reste doré par son remplissage, pas par son contour.
- **Halos simultanés** : 2 au plus. On trie par valeur (récolte, puis livraison, puis rumeur, puis enchères). Les autres lieux en attente reçoivent un point de 8 px de la couleur ci-dessus, en haut à droite du disque, sans animation.
- **`Batir`** : quand il manque des matériaux, le bouton en or devient l'action qui débloque, « Acheter 15 briques · 23 d », et le bouton fantôme sous la carte disparaît.
- **`Palais`** : supprimer la pilule menthe de la carte dont l'action est portée par le bouton en or (la première).
- **`Classement`** : fond de « Défier » en `#2e486e` avec le texte `#ecf5ff`.
- **`Terraferme`** :
  - le camp passe en `#1d304d`, bordure `#6ee0b8` de 3 px, avec le blason ;
  - « Bataille 20 h » passe en `#ff8070` ;
  - l'état fermé reçoit le bouton en or « Lancer un front » dans la barre au-dessus des onglets (voir l'écran Conquête).
- **`Ville`** : la puce de rumeur passe en violet, fond `rgba(142,107,216,.16)`, bordure `#8e6bd8`, texte `#d8ccf7`, ce qui est la couleur des rumeurs.

### 6. Finir le lexique : chiffres et unités

**Constat et remplacements :**

| Fichier | Texte actuel | Remplacer par |
| --- | --- | --- |
| Profil, Classement | « Ligue 1 · 30 pts », « monter vers la ligue 2 (+30). Perdre : −20 » | **Inverser** : Ligue 1 = la plus haute, comme au football. Nouveaux en Ligue 6. Texte : « Ligue 6 · 30/100 vers la ligue 5 » ; « Gagner dimanche : +30. Perdre : −20. » |
| Palais | « vous fait perdre 15 points de ligue » | « vous fait reculer dans votre ligue de duel » |
| Atout | « taxe −2 points » / « quota de la Douane −50 % » | « taxe du Marché : 3 % → 1 % » / « vous achetez 2 fois moins à la Douane » |
| Palais (élection) | « Taxe du Marché −1 point » / « Douane : +25 % à acheter » / « Saison : grand gel » | « taxe du Marché : 3 % → 2 % » / « la Douane vend 25 % de plus » / « Son mois : le grand gel » |
| Mole | « référence 56 d » ; crans « 100 % 110 % 125 % 150 % » | « prix conseillé 56 d » ; crans « 56 d · conseillé », « 62 d · +10 % », « 70 d · +25 % », « 84 d · +50 % » |
| Mole | « Vous payez le prix du deuxième plus 5 %. » | « Si vous gagnez, vous payez juste un peu plus que le 2ᵉ, pas votre maximum. » |
| Aujourdhui, Palais | « 3 d'Influence », « 20 influence » | « 3 Influence », « 20 Influence » (jamais « d' » : « d » veut dire ducats), avec une icône d'Influence de 14 px |
| Terraferme | « ⚔ 25 », « 121/140 », « +13/h », « pain des troupes : 1 j » | « attaque · 25 troupes », « 121 troupes sur 140 », « +13 troupes par heure », « vivres pour 1 jour » |
| Ville | « 42′ » | « 42 min » |
| Comptoir | « Pain des ouvriers : 2 j » ; puces « 50 vivres », « 25 charpente », « 0 brique » | « Ouvriers nourris 2 jours » ; puces par marchandise : « 50 pains », « 25 bois », « 0 brique » |
| Cadran | « Crise · Un acte de la saison : la République vacille. » | « Coup dur · Le grand gel : le blé coûte plus cher. » (dire l'effet) |
| Saison | « Seigneur de Vicence » | « Maître de Vicence » |
| Lettre | « La suite prend place sur la frise, au jour 14. » | « La suite arrive le jour 14 (dans votre calendrier). » |
| Metier | « Vos deux premiers ateliers, déjà en orbite. » | « Vous commencez avec ces deux ateliers. » |
| Connexion, Venise, Palais | « Doge du mois », « Doge (élue du mois) », « Doge (élue d'octobre) » | Partout, à la première apparition : « Doge, l'élu du mois », puis « Doge » seul |
| Classement | onglet « Saison » | « Mois » (comme la note du canevas) |
| Profil | « Niveau 3 · 420 / 600 points » ; « Prestige : Marchand » | « Niveau 3 · encore 180 pour le niveau 4 » ; « Prestige : Marchand (2ᵉ rang sur 5) » |
| Connexion | « La Banque publie sa monnaie chaque jour. » | Supprimer : c'est obscur et inutile à l'entrée. |

**Pourquoi c'est un problème.**
- « Ligue 1 » est lu par un joueur français comme l'élite : dire « vous êtes en Ligue 1 » à un débutant est un contresens.
- « d' » dans « 3 d'Influence » se lit « 3 ducats d'Influence ».
- « points » sans objet ne dit rien.

### 7. Corriger les données contradictoires d'un écran à l'autre

**Constat.**
- **Rang du joueur :**
  - `Venise` : « Les 40 palais · vous : 23ᵉ » ;
  - `Canal` : « Votre quai 23ᵉ » **et** « Pas encore de palais : 1 240 d vous séparent du 40ᵉ » ;
  - `Profil` : « pas encore parmi les 40 palais · 23ᵉ » ;
  - `Saison` : « votre palais : 4ᵉ des 40 ».

  Être 23ᵉ et ne pas être dans les 40 est impossible.
- **Duel :**
  - `Classement` (Semaine) : Casa Grimani « +1 980 d » ;
  - onglet Duel : « Casa Grimani : 1 181 d » (dans l'`aria-label`) et vous « +109 d » devant ;
  - dans la liste, Grimani est devant vous de 690 d.
- **Lots prêts** : `Main` en annonce « 2 lots prêts », `Comptoir` « 1 lot prêt », `BonRetour` « 3 lots ».
- **Blasons** : vous êtes vert `#7db596` (Profil, Classement « Ca' Morosini (vous) », Duel « Vous »), comme Casa Grimani dans la liste. Dans le Duel, Grimani devient rouge `#e36a4a`, la couleur de Foscari.
- **Jours** : `Cadran` place la fin de semaine le 12 (aujourd'hui, `(n-5)%7`) et le 19 ; `Classement` dit « fin dim. dans 2 j 6 h », donc le 14.
- **Troupes** : `BonRetour` affiche « 40 / 60 troupes », `Terraferme` « 121/140 ».

**Pourquoi c'est un problème.** Ces maquettes servent à décider. Un relecteur, ou un testeur en test utilisateur, butera sur ces écarts et jugera l'écran confus alors que c'est la donnée qui l'est. Surtout, le cas « 40 palais » révèle une **ambiguïté de concept** : est-ce le classement du mois, ou autre chose ?

**Correction.**
- Une seule vérité : « Les 40 palais = le classement du mois, top 40 ».
  - Le joueur est 4ᵉ de la semaine et **41ᵉ du mois**.
  - `Venise` : « vous : 41ᵉ, à 1 240 d » ;
  - `Canal` : « Votre quai · 41ᵉ » ;
  - `Profil` : « 41ᵉ · à 1 240 d du 40ᵉ palais » ;
  - `Saison` : « 41ᵉ sur 52 », ou garder 4ᵉ et l'aligner partout.
- Duel : Grimani « +1 181 d » dans la liste de la semaine, vous « +1 290 d ».
- Lots : 2 partout.
- Blason du joueur : une couleur réservée, `#6ec8f5`, partout (Profil, Classement, Duel, Conquête). Grimani reste `#7db596` partout.
- Calendrier : dimanche = 14. Les jours d'Atout tombent le 8, 15, 22 et 29, et les « coups durs » d'autres jours.

### 8. Respecter 44 px et 3:1 sur les contours

**Constat.**

| Élément | Taille actuelle |
| --- | --- |
| `Cadran` : 31 jours | `.day` de 16 px (jours ordinaires) et 22 px (événements), espacés de 24,7 px sur l'anneau |
| `Cloche` : onglets | 36 px |
| `Fiche` : puces `.ctx` | 32 px |
| `Ville` : flèches ‹ › | 32 px de large |
| `Negoce` : lignes du carnet d'ordres (liens) | environ 22 px de haut |
| `Negoce` : bouton « i » | 24 px |
| `Rialto` : filtres | `<span>` d'environ 29 px, non cliquables |
| `Comptoir` : cartes Atout | 26 × 38 px, dont celle qui ouvre l'Atout |
| `Comptoir` : puces du magasin | environ 32 px |
| `BonRetour` : `summary` | 32 px |
| Boutons « × » (`Main`, `Terraferme`) et « ? » (en-têtes) | 40 px |
| `Main` : petites villes | disque de 40 px |

Côté contraste, le contour `#42628c` des boutons fantômes, cartes et onglets sur `#1d304d` donne **2,1:1**, sous le seuil de 3:1 exigé pour un composant (WCAG 1.4.11). Les textes `#c2d4ea` sur `#1d304d` (8,8:1) et sur `#243a5c` (7,6:1) sont bons.

**Correction.**
- Tous les boutons d'icône (« × », « ? », ‹) passent à 44 px.
- `Cloche` : les onglets disparaissent (n° 4).
- `Fiche` : les puces disparaissent.
- `Ville` : flèches de 44 × 44 px.
- `Negoce` :
  - les lignes du carnet ne sont plus des liens ;
  - le « i » devient une ligne de détail repliée de 44 px : « Détail du prix › ».
- `Comptoir` :
  - l'Atout en attente devient un vrai bouton de 44 × 56 px ;
  - les puces passent à 44 px (`padding: 12px 14px`).
- `Main` : petites villes à 44 px.
- `Cadran` : seuls les jours à événement sont des boutons, avec une zone de toucher élargie (`::before { inset: -11px }`). Les jours d'élection, du 25 au 30, deviennent **un seul arc** cliquable. Les jours ordinaires deviennent de simples points `aria-hidden`.
- Contours : `#42628c` passe à `#6d8db8` (3,9:1) pour `.ghost`, `.card`, `.pill`, `.rd`, `.notch` et les boutons « × », dans tous les fichiers. `#42628c` reste réservé aux filets décoratifs.

### 9. Réparer les liens de « remplissage » qui mènent au mauvais endroit

**Constat.**
- **Bâtir et Ville** : `Batir` « Acheter 15 briques · 23 d au Marché » et `Ville` « Acheter 12 briques » ouvrent `Negoce`, qui est la page du **blé**. La phrase y affiche même « Rempli depuis Bâtir : il vous en manquait 15 » à côté de « 15 blé ».
- **Rialto** : « Gérer : émettre, racheter › » (onglet Actions, *votre* Maison) ouvre la `Fiche` de Casa Foscari.
- **Rialto** : la commande « 40 pains à 1,4 d · livrable depuis votre stock » ouvre la `Fiche` de Casa Venier, au lieu de proposer « Livrer ».
- **Classement** : le balayage « Espionner » ouvre `Palais` (onglet Rumeurs) et non une action d'espionnage.
- **Mole** : un lien « Conquête : la bataille du soir, 3 fronts à vous › » apparaît au milieu des enchères.

**Correction.**
- **`Negoce`** : maquette paramétrée par marchandise. Le lien de `Batir` et de `Ville` ouvre « Acheter / vendre · Briques » avec la quantité pré-remplie (15 ou 12) et la phrase « Il vous en manque 15 pour le four ».
- **`Rialto`** :
  - « Gérer mes actions › » mène à `Profil` (une ligne « Mes actions » à y ajouter) ;
  - la commande devient une ligne avec un bouton fantôme « Livrer · +56 d » à droite ;
  - le nom de Casa Venier reste le seul lien vers la fiche.
- **`Classement`** : « Espionner » ouvre une feuille de confirmation « Espionner Ca' Zane · 20 d ».
- **`Mole`** : supprimer le lien Conquête. La bataille de 20 h vit sur l'écran Conquête et dans Messages.

### 10. Corriger les chevauchements et débordements calculés

Ces chevauchements se déduisent des positions absolues.

- **`Comptoir`** :
  - les Atouts (`top: 446px`, hauteur 38 px avec rotation, x de 140 à 230) **recouvrent** le disque de la Boulangerie (`top: 476px`, x de 167 à 223) ;
  - l'étoile du Moulin (`left: 290px; width: 110px`) déborde jusqu'à 400 px, et le badge « +8 » (`right: -16px`) est coupé à 390.
- **`Ville`** : le lien `<a href="Palais.dc.html">` de 320 × 320 px (l'anneau) couvre toute la zone des commandes. Un toucher entre deux commandes ouvre Politique par erreur, et les commandes elles-mêmes ne font rien.
- **`Negoce`** : chaque colonne du carnet fait environ 155 px utiles. « Casa Foscari » plus « 6 × 1,04 d » en 13 px fait environ 165 px, donc le nom et la quantité se chevauchent.
- **`Saison`** : « Léguer « Élevé au Rialto » et commencer novembre » en 17 px fait environ 400 px pour 318 utiles, donc 2 lignes dans une pilule pensée pour une seule.
- **`Terraferme`** : rien entre `y = 485` et `y = 668`, soit 180 px vides, alors que la frise et les actions sont tassées en bas.

**Correction.**
- **`Comptoir`** :
  - déplacer les Atouts en haut à gauche (`left: 24px; top: 132px`), sans rotation au-delà de ±6° ;
  - Moulin : `left: 270px` ;
  - supprimer la rangée de boutons fantômes « Ateliers » et « Magasin » (les deux mènent à `Production`). La feuille passe à environ 124 px de haut, ce qui laisse la place à la barre d'onglets.
- **`Ville`** :
  - réduire le lien de l'anneau à la seule étiquette « vous 22 % · maître : Casa Foscari », une pilule de 44 px sous l'anneau ;
  - chaque commande devient un `<button>` de 96 × 96 px qui la sélectionne pour la mule.
- **`Negoce`** : une ligne par ordre en pleine largeur, avec « Ils vendent » au-dessus de « Ils achètent », à la place des deux colonnes.
- **`Saison`** : bouton « Léguer et commencer novembre », avec le trait choisi déjà visible au-dessus.
- **`Terraferme`** : agrandir la grille d'hexagones (`scale(1.25)` autour de `y = 365`) et remonter la frise à `top: 600px`.

---

## Écran par écran

### Main.dc.html (la carte, refonte)

1. **Fiche du lieu** : appliquer la règle du n° 2. Dans `renderVals`, ajouter `act: true` pour Mes ateliers et Padoue (bouton qui agit sur place), `gold: p.waits`, et rendre le `.gold` sous `<sc-if value="{{sel.waits}}">`. Remplacer « Voir » par un bouton fantôme pleine largeur « Voir Trévise ».
2. **Halos** : deux au plus, en couleur de sens (n° 5). Supprimer `border: '#f4c554'` et `nameColor: '#f4c554'` pour `sun` et `venice`.
3. **`.pname`** : `font: 600 12px`, `letter-spacing: .08em` (au lieu de 10 px et .12em). À 10 px en capitales, les noms de ville sont illisibles en plein soleil.
4. **Entrée de la fiche** : elle apparaît par `sc-if`, donc sans transition. Ajouter `@keyframes peekIn{from{transform:translateY(24px);opacity:0}}` et `.peek{animation:peekIn .32s cubic-bezier(.2,.8,.2,1)}`. Le reflet du bouton en or ne joue qu'une fois (n° 1).
5. **Phrase d'aide** : « Touchez un lieu qui brille » ne s'affiche que pendant les 3 premières sessions. Ajouter en en-tête le bouton « Tâches du jour » de 44 px (n° 3). Bourse : afficher « 1 284 » avec la pièce partout, et retirer « d » des en-têtes de `Comptoir` et de `Venise` pour unifier.

### Connexion.dc.html

1. Retirer le `<a href="Canal.dc.html">` autour du SVG des palais : un visiteur non connecté ne doit pas tomber dans le jeu.
2. « Doge du mois : Casa Foscari » devient « Élu du mois : Casa Foscari ».
3. Remplacer `<a href="Metier.dc.html" class="gold">` par `<button type="submit" class="gold">`. Sur l'`<input>`, ajouter `autocomplete="email" inputmode="email" required`.
4. La liste passe de 4 à 3 puces, sur une colonne : supprimer « La Banque publie sa monnaie chaque jour. » et garder « Une saison par mois, tous à égalité. » en premier.

### Metier.dc.html

1. « Vos deux premiers ateliers, déjà en orbite. » devient « Vous commencez avec ces deux ateliers. »
2. Ajouter `aria-pressed="{{n.on}}"` et `aria-pressed="{{j.on}}"` aux pilules de nom et aux cartes de métier : aujourd'hui, la sélection n'est que visuelle.
3. Le bouton « Ouvrir les ateliers de {{name}} » mène à `Main`. Libellé : « Commencer ». La carte s'ouvre avec la fiche « Mes ateliers » déjà levée et un halo vert d'eau, ce qui est le premier « touchez ici ».
4. Le champ « ou le vôtre » a un `value` figé : le lier à `name` via `onInput`, sinon la maquette ment.

### Cadran.dc.html (calendrier)

1. L'écran est orphelin : le relier depuis `Aujourdhui` (n° 3) et depuis la ligne « jour 12 sur 31 » du bouton « Tâches du jour ».
2. Jours ordinaires : des points `aria-hidden` de 8 px, pas des boutons. Événements : 28 px, avec une zone de toucher de 44 px. L'élection, du 25 au 30, devient un seul arc violet `#8e6bd8` de 10 px d'épaisseur, cliquable (n° 8).
3. Supprimer la légende à 4 puces (`flex-wrap`, 12 px) : le texte du centre dit déjà de quoi il s'agit quand on touche un jour.
4. « Crise · Un acte de la saison : la République vacille. » devient « Coup dur · Le grand gel : le blé plus cher. » (n° 6). Aligner les jours (dimanche = 14).
5. « Le résumé · Rejouer le Bon retour de ce jour » est une bonne idée, mais il n'y a pas de lien. Ajouter un bouton fantôme « Revoir ce jour » vers `BonRetour.dc.html` sous le texte du centre.

### Cloche.dc.html (messages)

1. Supprimer les 4 onglets (36 px, inutiles pour 6 messages).
2. Pastilles « P », « % », « ! », « L », « ◆ », « S » : ces lettres sont cryptiques. Les remplacer par l'icône du **lieu** concerné (blason de ville, lion de Venise, soleil des ateliers, coupe du classement), reprise de la barre d'onglets.
3. La pastille « non lu » (point de 10 px avec `aria-label` sur un `<span>`) devient un texte masqué « non lu, » en tête du lien, pour les lecteurs d'écran.
4. Message espion : sa ligne porte l'action « Le chasser · 20 d » en bouton fantôme de 44 px, retirée de `Palais`.
5. « Tout marquer lu » : `min-height: 44px`.

### Aujourdhui.dc.html (tâches du jour)

1. Orphelin : lien entrant depuis le bouton coffre de `Main` (n° 3). En pied, ajouter « Le calendrier du mois › » vers `Cadran`.
2. « Changer une tâche : 3 d'Influence · vous en avez 12 » devient un bouton fantôme de 44 px « Changer une tâche · 3 Influence » (avec l'icône), et un texte « vous en avez 12 » en 12 px. Ce n'est plus un lien vers `Profil`.
3. Coffre verrouillé : remplacer la pilule pointillée « Encore 2 tâches pour l'ouvrir » par une barre de progression sous le coffre (2/3 segments en `#6ec8f5`). Une pilule de 54 px qui n'est pas un bouton ressemble à un bouton désactivé.
4. Au passage à `done` : le coffre s'ouvre (n° 1), les points de série se remplissent l'un après l'autre (150 ms chacun), puis le bouton en or « Ouvrir le coffre · 13 d » apparaît en glissant.

### Comptoir.dc.html (mes ateliers)

1. Corriger le chevauchement Atouts / Boulangerie et le débordement du Moulin (n° 10).
2. Supprimer les deux boutons fantômes « Ateliers » et « Magasin », qui mènent tous les deux à `Production` (« Ateliers » sur l'écran Mes ateliers ne veut rien dire). La feuille ne garde que « 2 lots prêts » et « Récolter et relancer ».
3. Puces du magasin : « 50 vivres », « 25 charpente », « 0 brique » deviennent « 50 pains », « 25 bois », « 0 brique ». Hauteur 44 px.
4. « Pain des ouvriers : 2 j » devient « Ouvriers nourris 2 jours ». Lorenzo : libellé 11 px porté à 12 px, « Une lettre » devient « Lettre du jour ».
5. Ajouter la barre d'onglets (n° 3) et retirer « ‹ Carte ». Le bouton « Récolter et relancer » joue la récolte du n° 1 : marques qui volent du Moulin vers les puces, « +8 » qui monte, compteur de la puce qui s'incrémente.

### Production.dc.html (un atelier)

1. Le Moulin est « Prêt +8 » dans `Comptoir` mais cet écran ne propose que « Produire 5 lots ». Quand un lot est prêt, le bouton en or devient « Récolter 8 farines et relancer 5 lots ». Le titre « Moulin · niv. 1 » s'aligne sur l'orbite.
2. Choisir **un** réglage de quantité : garder les 3 préréglages (« 1 lot », « Jusqu'à ce soir », « Le plus possible ») et supprimer le sélecteur −/+, ou l'inverse. Les deux ensemble font deux contrôles pour un seul chiffre.
3. « Améliorer au niveau 2 » mène à `Batir` (un écran de *construction neuve*). Ouvrir plutôt une feuille sur place « Améliorer le moulin · 180 d, 10 briques ».
4. « ? » renvoie vers `#aide`, un lien mort : le retirer, ou ouvrir l'Aide au paragraphe Moulin. Taille 44 px.

### Batir.dc.html

1. **Bug de genre** : `'Bâtir la ' + chosen.name.toLowerCase()` produit « Bâtir la four à briques ». Ajouter `article: 'le'` ou `'la'` dans chaque objet et écrire « Bâtir le four à briques · 280 d ».
2. Le bouton en or « Il manque des matériaux » devient « Acheter 15 briques · 23 d », vers `Negoce` en version briques. Supprimer le bouton fantôme sous la carte (n° 5 et n° 9).
3. « Acheter 15 briques · 23 d au Marché » mélange quantité, prix et lieu. Si le bouton fantôme est gardé pour la 3ᵉ carte : « Acheter 15 briques ».
4. Supprimer le pli « 4 ateliers d'autres régions » : c'est une information de l'Aide, pas une action.
5. Onglets « Ateliers · Véhicules » : ajouter `role="tab"` et `aria-selected`, et sur les cartes `aria-pressed`.

### Lettre.dc.html

1. « La suite prend place sur la frise, au jour 14. » devient « La suite arrive le jour 14. Vous la verrez dans le calendrier. »
2. Les deux réponses ont un poids égal : retirer `sealgold` de « Prendre le poivre ». Mettre en or l'une des deux pousse à dépenser 60 d, alors que la lettre doit laisser le joueur choisir. Les deux boutons deviennent des cartes de 64 px avec contour `#6d8db8`. À la sélection, le choix s'éclaire en or (`.sealgold`) et le cachet se brise (n° 1).
3. Après la réponse, « Revenir à la carte » devient « Revenir à mes ateliers », vers `Comptoir`, puisqu'on vient de là (le voile y mène déjà).
4. Le cachet « F » (`right: -6px`) déborde du parchemin de 6 px, contre la marge de 18 px de la feuille. C'est voulu, mais le placer à `right: 8px` évite qu'il soit rogné à 320 px de large.

### Atout.dc.html

1. Titre « Trois figures de Venise » remplacé par « Votre Atout de la semaine ». Surtitre « LUNDI · UN BONUS, UN MALUS ».
2. Cartes de 200 px dans un carrousel : la 3ᵉ est cachée (seulement 1,7 carte visible). Passer à une **liste verticale de 3 cartes** de 100 px de haut (portrait 72 px à gauche, ▲ et ▼ à droite) pour comparer d'un coup d'œil.
3. Effets en mots simples : « ▲ taxe du Marché 3 % → 1 % / ▼ 2 fois moins d'achats à la Douane » ; « ▲ véhicules 25 % plus rapides / ▼ un véhicule de moins » ; « ▲ +10 % de produits transformés / ▼ −10 % de matières brutes ».
4. Bouton : « Prendre le Banquier » (le nom court, au lieu de « Prendre le Banquier du Rialto »).
5. Après le choix : supprimer « Sa carte se pose autour de vos ateliers : ses effets se lisent là où ils agissent. » La carte vole vers les ateliers (n° 1) et la phrase « Le Banquier rejoint vos ateliers. » suffit.

### Venise.dc.html

1. Supprimer les 3 lignes de la feuille du bas, qui répètent les badges des lunes (n° 4). Garder la seule ligne du Doge : « Doge, l'élu du mois : Casa Foscari · livraisons à Venise +10 % ».
2. Badge « ! » rouge sur Politique pour un espion : c'est une alarme pour un événement mineur. Mettre un point violet de 10 px (rumeur du jour) ; l'espion vit dans Messages.
3. Badge « 1 » doré sur Marché : passer en `#6ec8f5`, l'or restant à l'action (n° 5).
4. Sous-titre des Enchères « ce soir 20 h · arrivage demain » sur 2 lignes en 12 px dans 120 px : réduire à « ce soir 20 h ».
5. Barre d'onglets persistante, onglet « Venise » actif, et suppression de « ‹ Carte » (n° 3). En-tête : « 1 284 » avec la pièce, sans « d ».

### Rialto.dc.html (Marché)

1. Supprimer la rangée de filtres « Tout · En stock · En hausse » : ce sont des `<span>` non cliquables d'environ 29 px.
2. Marques incohérentes avec `GoodsMark` : Pain en `30%` (carré arrondi) ici, hexagone dans `Comptoir` ; Briques en `30%`, Épices en `4px`. Reprendre la même forme par étape partout (brut = rond, intermédiaire = carré, fini = hexagone), et le contour creux quand le stock est à 0.
3. Onglet « Entre joueurs » :
   - la commande de Casa Venier reçoit un bouton fantôme « Livrer · +56 d » ;
   - les deux `href="#"` « Commander à un joueur » et « Investir dans un joueur » ouvrent une feuille ou sont retirés de la maquette ;
   - la ligne « Investissement en cours » passe de 3 informations sur une ligne en gras à 2 lignes : « 500 d chez Ca' Zane · fin dans 3 j » et, en 12 px, « vous touchez 30 % de ses ventes ».
4. Onglet « Actions » : « Gérer : émettre, racheter › » devient « Gérer mes actions › », vers `Profil` (n° 9).
5. Prix décimaux (« 1,02 d », « 0,8 d ») face aux en-têtes en entiers (« 1 284 ») : afficher le prix **par 10** (« 10,2 d les 10 »), ou dire une fois « prix à l'unité » en légende. Sinon le joueur ne relie pas « 0,8 » à sa bourse.

### Negoce.dc.html (Acheter / vendre · Blé)

1. Rendre la maquette paramétrable par marchandise. « Rempli depuis Bâtir : il vous en manquait 15. » ne s'affiche que sur la page Briques (n° 9).
2. Carnet d'ordres : une ligne pleine largeur par ordre, au lieu de deux colonnes qui débordent (n° 10). Ne plus faire des noms des liens (cibles de 22 px, et un niveau de profondeur en plus). « Douane » devient « Douane (prix fixe) ».
3. L'onglet « À mon prix » ne montre aucun champ de prix : ajouter un sélecteur −/+ de prix (« 1,00 d ») sous la quantité quand il est actif. Sinon l'onglet ne fait rien.
4. « Vendre » est désactivé (`opacity: .45`) sans explication : remplacer par un texte de 13 px « Vous n'avez pas de blé à vendre » sous le bouton en or, et retirer le bouton fantôme.
5. Le « i » de 24 px devient une ligne repliable de 44 px « Détail du prix › » (prix, taxe 3 %, total).

### Palais.dc.html (Politique)

1. **Ordre des onglets** : l'écran s'ouvre sur Rumeurs mais l'onglet est au milieu. Ordre : « Rumeurs · Élection · Villes ».
2. **Rumeurs** :
   - supprimer le paragraphe « Chaque matin, deux infos… » ;
   - supprimer la pilule menthe de la 1ʳᵉ carte (son action est le bouton en or « Charger 30 pains pour Vérone ») ;
   - la 2ᵉ carte garde son lien en texte lapis « Voir les enchères › » ;
   - ajouter la source dans chaque carte : « source : le secrétaire du Sénat, juste 7 fois sur 8 ».
3. Déplacer l'alerte espion et « Le chasser · 20 d » dans Messages. Sortir les Manœuvres dans une feuille séparée, ouverte par « Manœuvres › » en bas de la liste. Dans cette feuille :
   - « 20 influence » devient « 20 Influence » ;
   - « perdre 15 points de ligue » devient « reculer dans votre ligue de duel ».
4. **Élection** : « Casa Foscari, Doge (élue d'octobre) » devient « Casa Foscari, Doge d'octobre ». Sur les cartes de candidat :
   - « Saison : grand gel » devient « Son mois : le grand gel » ;
   - « Douane : +25 % à acheter » devient « La Douane vend 25 % de plus ».
   - Le lien « Voir la fiche du candidat choisi › » passe au nom du candidat (souligné), ce qui fait une ligne de moins.
5. **Villes** : le paragraphe de 3 lignes devient « Celui qui livre le plus dans une ville la tient demain. » Le détail (3 %, 30 min) va dans l'Aide. « 2ᵉ, à 40 points » devient « 2ᵉ, à 40 livraisons du 1ᵉʳ » : dire l'unité.

### Mole.dc.html (Enchères)

1. Supprimer le lien « Conquête : la bataille du soir… » (n° 9).
2. Titre h2 « Votre prix maximum pour le lot 2 · référence 56 d » remplacé par « Jusqu'où montez-vous ? », avec en 13 px « prix conseillé 56 d ». Crans : « 56 d / conseillé », « 62 d / +10 % », « 70 d / +25 % », « 84 d / +50 % » (n° 6).
3. « Vous payez le prix du deuxième plus 5 %. Si quelqu'un met plus, vos ducats vous reviennent. » devient « Gagnant : vous payez juste au-dessus du 2ᵉ. Perdant : rien n'est payé. »
4. Le canevas annonce « de jour l'arrivage des bateaux », mais seule la version du soir existe. Ajouter l'état de jour (`props.evening: false`) : 3 lots, « Ouvre à 20 h », et le bouton en or « Me prévenir à 20 h ».
5. Lot gagné, à la clôture : la ligne du lot passe à « Adjugé » avec le cachet animé (n° 1). Le compte à rebours (cercle de 48 px) passe à `#ff8070` sous 5 min et palpite une fois par minute, sans boucle continue.

### Canal.dc.html (Les 40 palais)

1. Contradiction « Votre quai 23ᵉ » / « Pas encore de palais » à résoudre (n° 7).
2. Libellés de rang en 12 px sous les palais : passer à 14 px et ajouter le nom tronqué en 11 px, sinon on touche à l'aveugle.
3. Environ 230 px vides sous la fiche (de `y = 620` à 844) : monter la section à `top: 380px`, ou agrandir les palais (hauteurs × 1,2).
4. Ajouter une indication de défilement : les 12 premiers palais remplissent 860 px, mais rien ne dit qu'il y en a 40. Ajouter une ombre de bord droit `linear-gradient(90deg, transparent, #16263e)` de 32 px, et un saut « Aller à mon quai › » (bouton fantôme de 44 px).
5. « Ouvrir la fiche de la Maison » devient « Voir Casa Foscari ».

### Classement.dc.html

1. Onglet « Saison » remplacé par « Mois ». Ligues inversées et libellées (n° 6). Dans le Duel : « Gagner dimanche : +30 vers la ligue 5. Perdre : −20. »
2. Données du duel et couleurs de blason (n° 7).
3. Le balayage vers la gauche est indécouvrable. La phrase en 12 px « Glissez une ligne… » ne suffit pas, et le geste n'existe pas au clavier ni au lecteur d'écran. Garder le balayage comme raccourci, mais le bouton en or de la `Fiche` (« Défier en duel ») doit porter l'action. « Défier » perd son fond doré (n° 5) ; « Espionner » ouvre une confirmation (n° 9).
4. Les badges « PNJ » (icône de 16 px, `aria-label` sur un `<span>`) deviennent un texte « (ordinateur) » en 12 px après le nom, plus clair que l'engrenage.
5. Barre d'onglets persistante, onglet Classement actif, suppression de « ‹ Carte » ; « ? » passe à 44 px.

### Fiche.dc.html (fiche d'un joueur)

1. Supprimer la rangée « vous venez de : un lundi · le Marché · l'élection » : c'est un contrôle de démonstration. Le placer dans une note du canevas ou dans les `data-props` (`ctx`).
2. Remplacer les 3 onglets par 3 lignes fixes (n° 4). Le bouton en or reste contextuel, et c'est la bonne idée de cet écran.
3. « ‹ Classement » devient « ‹ Retour » (n° 3).
4. Palmarès : les 3 cercles vides de 44 et 52 px (portraits de générations) ressemblent à des chargements ratés. Y mettre le portrait SVG déjà utilisé dans `Profil` et `Saison`.
5. « ligue 3 » dans le sous-titre devient « Ligue 4 de duel » (numérotation inversée) ; « Doge, l'élu du mois » est correct.

### Profil.dc.html

1. Supprimer les 4 onglets : contenu Maison, puis 3 lignes « Héritage › », « Guilde › », « Réglages › » (n° 4).
2. Le texte en 11 px dans le SVG « pas encore parmi les 40 palais · 23ᵉ » devient « 41ᵉ · à 1 240 d du 40ᵉ palais », en HTML (pas en `<text>` SVG) et en 13 px.
3. « Marco Morosini, 1450 · 1ʳᵉ génération · ligue 1 » devient « Marco, 1ʳᵉ génération · Ligue 6 de duel ». « Ligue 1 · 30 pts » devient « Ligue 6 · 30/100 ».
4. « Niveau 3 · 420 / 600 points » : dire ce que donne le niveau, par exemple « Niveau 3 · encore 180 pour un 4ᵉ atelier », sinon la barre est décorative.
5. Réglages : 4 `href="#"`. Guilde : un champ sans bouton. Ajouter un bouton fantôme « Créer la guilde », ou retirer le champ de la maquette.

### Ville.dc.html (Vérone)

1. Réduire le lien de l'anneau qui capte les touchers (n° 10). Les commandes deviennent des `<button>` sélectionnables, avec la case « dans la mule » cochée en vert d'eau.
2. Trois liens vers `Palais` : la puce rumeur, l'anneau et le bouton fantôme « Qui tient la ville ». En garder un seul, la pilule sous l'anneau « vous 22 % · maître : Casa Foscari ›», et supprimer le bouton fantôme.
3. Le verbe change d'un écran à l'autre : « Livrer » sur la carte, « Charger une mule » ici. Bouton en or : « Livrer 2 commandes · +64 d ». Supprimer « mule libre » à droite, ou écrire « 1 mule libre ».
4. Commande urgente : « 42′ » devient « 42 min » ; « 16 d · urgente » en vert devient « 16 d · urgente » en `#ff8070`, cohérent avec le badge.
5. Flèches ‹ › de 44 × 44 px. Ajouter le geste de balayage horizontal annoncé dans la note du canevas, et sa trace visuelle : des points de pagination de 6 px sous le titre (7 villes).

### Terraferme.dc.html (Conquête)

1. Remplacer la barre à 4 portes (« Commerce ») par la barre commune à 5 onglets (n° 3).
2. État fermé sans action : ajouter le bouton en or « Lancer un front » au-dessus de la barre. La feuille ouverte garde « Mercenaires », « La semaine » et « Partie rapide » en boutons fantômes.
3. Libellés : « ⚔ 25 » devient « attaque · 25 » ; « 121/140 » avec l'anneau devient « 121 troupes » (le max en 12 px) ; « +13/h » devient « +13 troupes/h » ; « pain des troupes : 1 j » devient « vivres pour 1 jour » ; « 4ᵉ · 120 pts de conquête » devient « 4ᵉ de la conquête · 120 points ».
4. Le camp en disque doré passe à `#1d304d` avec une bordure vert d'eau (n° 5). « +9 » en 16 px sans contexte devient « +9 troupes » en 13 px, à côté de la case gagnée, avec une animation de montée.
5. Vide de 180 px (n° 10). La frise « front 17 h 30 · Bataille 20 h · fin dim. » en 11 px passe à 13 px. Deux rendez-vous à 20 h (enchères et bataille) se font concurrence : le signaler au porteur. Dans l'interface, montrer « 20 h : enchères puis bataille » de façon cohérente dans le calendrier.

### BonRetour.dc.html

1. Animation d'entrée : compteur, puis tuiles en cascade (n° 1).
2. Le bouton « Tout récolter et relancer · 3 lots » est un lien vers `Main` sans effet. Il devient un `<button>` qui récolte, joue la récolte, *puis* ramène à la carte. Compter 2 lots (n° 7).
3. `summary` « Le détail : villes 1 840 d · Marché 520 d · commandes de l'élu 300 d » sur 2 lignes et 32 px : le remplacer par « D'où vient ce bénéfice › » en 44 px, avec les 3 chiffres dans le pli. « 2 fronts rentrés (−18 troupes) · 40 / 60 troupes » est à aligner sur la Conquête (n° 7).
4. Tuile « Contrôle des villes · Maître de Vicence » : elle ouvre `Ville` (Vérone). La faire ouvrir Vicence, ou garder Vérone comme maquette générique et écrire « Maître de Vicence ›».
5. Le titre « Bon retour » en `#c2d4ea`, 18 px, est discret, ce qui est bien. « absent 8 h 40 » devient « Vous étiez absent 8 h 40 ».

### Saison.dc.html (fin du mois)

1. Chorégraphie des 4 temps (n° 1). C'est l'écran qui mérite le plus de mouvement de tout le jeu, et il n'en a aucun.
2. « 48 120 d de bénéfice · votre palais : 4ᵉ des 40 » : à aligner sur les 40 palais (n° 7).
3. Récompenses : « Seigneur de Vicence » devient « Maître de Vicence » ; « Prestige : Marchand » devient « Prestige : Marchand (2ᵉ rang) ». Les « ✦ » sont des `<span>` : les mettre dans une liste `<ul>`.
4. Héritier : la phrase « Choisissez le trait qu'il lègue : une option ou une information, jamais du rendement. » devient « Choisissez ce qu'il transmet à Piero. » « Jamais du rendement » est une règle de conception, pas une information pour le joueur.
5. Bouton en or trop long (n° 10) : « Léguer et commencer novembre ». « Continuer » reste un bouton fantôme ; on peut aussi avancer en touchant n'importe où, comme l'annonce le canevas (« avancés au toucher »).

---

## Ce qu'il faut garder tel quel

- **Le principe de la nouvelle carte** :
  - la carte plein écran ;
  - un seul en-tête (bourse et cloche) ;
  - une ligne d'aide ;
  - le zoom de caméra à 1,7 en 0,9 s `cubic-bezier(.2,.8,.2,1)` avec les autres lieux à 35 % d'opacité ;
  - la fiche qui monte avec un titre, une phrase et une action.

  Les phrases des lieux sont parfaites de concision : « Veut 30 pains, paie 48 d. Vous les avez. » Chaque lieu est un vrai `<button>` avec un `aria-label` qui dit « quelque chose vous attend », et la règle `prefers-reduced-motion` existe.
- **L'ambiance de la carte**, une fois calmée : la caravane sur sa route pointillée, le bateau qui entre dans la lagune, les vagues. Elle raconte le jeu sans texte.
- **`Production`** : le préréglage « Jusqu'à ce soir » et la ligne « Limité par le blé : 70 en stock, 10 par lot. Acheter du blé ». C'est exactement la bonne façon de dire une limite et de proposer sa solution.
- **Les cartes de rumeur de `Palais`** : « Si c'est vrai : … » et « Vous avez 50 pains : de quoi livrer 30 pains, soit environ +30 d. » C'est la meilleure écriture de la planche.
- **`Ville`** : les commandes en orbite, avec leur état en clair (« couvert », « il en manque 12 ») et l'anneau de contrôle en or et rouge.
- **`Mole`** : les anneaux de compte à rebours par lot, les états « Vous menez » et « Dépassé : enchérissez avant 20 h 20 », et les crans de mise (à rebaptiser seulement).
- **`Aujourdhui`** : trois tâches en anneaux, chacune liée à son lieu, le coffre et la série. C'est compact et clair.
- **`BonRetour`** : un grand chiffre, quatre tuiles et un bouton.
- **`Saison`** : le découpage en 4 temps et les 4 points d'étape.
- **`Lettre`** : le parchemin, le cachet, et deux réponses qui disent chacune leur conséquence (« −60 d · une suite viendra », « rien · il s'en souviendra »).
- **`Negoce`** : « Tout de suite / À mon prix » et « taxe comprise ». Ce sont les mots d'un joueur, pas d'un trader.
- **`Fiche`** : l'idée d'un bouton en or qui dépend de l'endroit d'où l'on vient (Défier, Voter, Acheter des actions).
- **`Canal`** : « 1 240 d de bénéfice vous séparent du 40ᵉ ». C'est un objectif chiffré, motivant.
- **`Connexion`** : pas de mot de passe, et la promesse « Rien à acheter qui fasse gagner ».
- **`Classement`** : le podium à trois blasons et la ligne « (vous) » cerclée d'or.
- **La palette** : les textes `#ecf5ff` et `#c2d4ea` sur `#1d304d` et `#243a5c` dépassent tous 7:1 ; les feuilles du bas ont des coins de 28 px et une poignée.
