# Audit UX : jeu mobile free-to-play et jeu de gestion (4 novembre 2026)

Angle : premier lancement, les 10 premières minutes, la boucle de session courte, le nombre de touchers, les trois profondeurs, le pied de la carte, les états vides, d'erreur, d'attente et hors ligne, le retour après absence, les notifications, la lisibilité des chiffres, les cibles tactiles, PC contre mobile, l'accessibilité, et le respect des règles d'or 3, 7 et 8.

Références : Hades' Star (la carte est tout le jeu, une tournée de 3 minutes, des notifications « stockage plein »), Clash of Clans et Township (récolte au toucher, retour après absence en un écran), Pocket City (une feuille, un geste).

**Méthode**
- J'ai lu les 75 captures du parcours, dans l'ordre : `empire` en 390×844 et 320×568, `map3d` et `porta`, dans `scratchpad/shots/`.
- J'ai lu le code de `apps/web/src/empire/` (EmpireGame, Guide, next, Hud, RoundButtons, OrdersPanel, Market, Moment), de `ui.tsx`, de `i18n.ts` et de `packages/engine/src/empire/view.ts`.
- J'ai comparé avec les audits du 31 octobre et du 3 novembre (`audit-ux-empire-2026-10-31.md`, `audit-carte-2026-11-03/`).
- Je n'ai modifié aucun fichier du dépôt, à part ce rapport.
- Je n'ai pas relancé de capture : celles du dossier datent du même code. Le PC en 1440×900 n'a donc pas été mesuré ; je le juge sur le code seul.

---

## 1. Résumé

**Depuis le 31 octobre, le jeu a fait un vrai bond.**
- La carte 3D est belle et lisible au premier écran.
- Lorenzo dit le prochain geste, avec un bouton en or qui le fait.
- Les ateliers se voient dans leur domaine, avec des puces d'état (« À lancer », « attend bois », « 30:00 »).
- « Livrer » depuis la ville se fait en 2 touchers (ville, puis « Livrer · 1 lot · 353,22 d »). Avant, il en fallait 6 à 8 et un glisser.
- La mule rentre seule ; « Maison » ramène au fondaco ; il y a un écran de chargement et un filet si la 3D échoue.

L'essentiel du lot 0 et des lots 1 à 5 de l'audit de la carte est livré (commits `52ea752` à `805363a`).

**Il reste trois trous qui pèsent sur la rétention, plus qu'un défaut de surface.**

1. **Après la Casa 2, plus rien ne dit quoi faire.**
   - Lorenzo se retire (`next.ts:228`, `inTutorial` vaut Casa < 2), et la carte « Prochain pas » disparaît avec lui.
   - Il ne reste qu'un « ? » qui donne un conseil en mots.
   - Or le cadrage demande « à tout moment, trois objectifs visibles à moins d'une semaine, sur trois axes » (CADRAGE-v3 § 4.1). Le Carnet reste une liste de 9 corvées grisées (capture `7-compagnie`).
   - C'est le moment classique de décrochage d'un jeu de gestion : le jour 1, quand le tutoriel s'arrête.
2. **Le retour après absence est muet en dessous de 12 h.**
   - La feuille « Pendant votre absence » ne s'ouvre qu'après 12 h sans action (`view.ts:352`).
   - Après une nuit de 8 h ou une journée de travail, la session typique de la règle d'or 7, on ne voit qu'une volée de pièces (`useAwayRecap`, `EmpireGame.tsx:968`) et « Un atelier attend ».
   - Il n'y a aucune notification : le module push du jeu mensuel (`game/push.ts`) n'est pas branché sur l'empire. Rien ne rappelle « vos files sont pleines » ni « Padoue a une commande ».
   - La règle d'or 3 (« une fois plein, ça s'arrête ») n'a pas son pendant : rien ne dit que c'est plein.
3. **Le marché et la compagnie sont des tableurs.**
   - Le Marché : 9 lignes « 3 d · = au cours » et des boutons « +10 · 700 d » sans verbe.
   - Le Carnet : 9 lignes et 9 « Encaisser » grisés.
   - La Famille : 5 traits et 3 « Embaucher » à la Casa 1.
   - Ces trois feuilles restent du texte. Elles contredisent la règle d'or 8 et le principe « montrer ce qui est ouvert, taire le reste » (audit du 31 octobre, P4), qui n'est appliqué qu'à moitié.

**Le bloquant d'ergonomie** : au Marché, un toucher achète 10 unités sans confirmation ni annulation.
- « +10 · 471,1 d » vide une caisse de 500 d d'un coup (`Market.tsx:113-117`).
- Le parcours e2e le montre : la caisse passe de 328 d à 19,4 d (`320x568-14` puis `15`).
- Pour un nouveau joueur, c'est la façon la plus rapide de se ruiner à la minute 3.

---

## 2. Parcours annotés

### 2.1 Les 10 premières minutes (390×844)

| # | Capture | Ce qu'on voit | Touchers | Verdict |
|---|---|---|---|---|
| 1 | `1-fonder` | « Fondez votre Maison », pseudo auto « Casa_390 », un seul bouton or | 1 | Bien. Le nom est imposé et ne se change pas ici : on le retrouve sur la carte (« FONDACO CASA_390 »). |
| 2 | `1b-intro` | Lorenzo 1/3 : la boucle en une phrase, carte voilée | 3 (Suivant ×3) ou 1 (Passer) | Correct, mais trois cartes de texte avant de toucher quoi que ce soit. Le « Suivant » or concurrence la carte. |
| 3 | `1c-fondaco` | « Poser votre fondaco · gratuit », bouton grisé tant qu'aucun point n'est touché ; « Plus tard » | 2 | **Friction inutile** : le joueur ne sait pas où poser, ni pourquoi l'endroit compte. Le libellé « FONDACO CASA_390 » est déjà sur la carte avant la pose. « Plus tard » laisse un fondaco non posé, et l'explication ne revient qu'au panneau de la Casa. |
| 4 | `1c-secteur` | La carte, Lorenzo « Un atelier attend. » + « Tout relancer » | 1 | Très bien : premier geste utile à la seconde 20. |
| 5 | `1d-calque` | Identique à `1c-secteur` : le calque n'est pas visible sur la capture | — | La couche d'information (appui long) reste introuvable : aucun indice (C8 du 3 novembre, non corrigé). |
| 6 | `2-maison` / `3-relance` | Domaine en 3D, puces d'état, « Bâtir ici » ; Lorenzo « Bâtissez cet atelier :… » tronqué ; « Prochain lot dans 30:00 » | 1 + 1 | Le domaine se lit bien. **Le texte de Lorenzo est coupé** (`line-clamp-2`, `Guide.tsx:96`) sur le nom même de l'atelier ; en 320, il ne reste que « Bâtisse cet… ». |
| 7 | `4-panneau` | Carrière : deux carrés « Niveau max » (verrou) et « Détails » | 1 | Le panneau d'un atelier n'offre ni « Ramasser » ni l'état. Un cadenas « Niveau max » à la Casa 1 se lit comme un échec. |
| 8 | `4b-atelier` | Feuille de l'atelier : « File jusqu'à 4 h 03 », « Ramasser et relancer » en fantôme, badge « Max. de la Casa » | 2 | Le temps est en phrase et en barre, pas en arc (règle Lagune). L'action principale n'est pas en or. |
| 9 | `11-nouvel-atelier` | Production : la Briqueterie en or « Bâtir · 48 d », bien mise en avant | 2 (Lorenzo → feuille → Bâtir) | Bien en 390. **En 320, la description du Fondaco s'écrit un mot par ligne** sur 300 px (`320x568-11`) : la colonne du texte est écrasée par le bouton. |
| 10 | `12-attente` | « Tout tourne. Prochain lot à 16 h 04. » + arc | 0 | Bon état d'attente. Mais rien à faire pendant 30 min, et aucune invitation à revenir (notification, rappel). |
| 11 | `14-commandes` | Padoue : « Bois × 33 · Il en manque 33 · 116,56 d » ; « Rien en stock pour ces commandes : produisez-les d'abord. » ; « Prochaine commande à 23 h 33 » | 1 | Clair. Mais la phrase ne dit pas **quel atelier** produit le bois, ni qu'il est au domaine. |
| 12 | `15-livrer` | 11 bois en stock : « Il en manque 22 », mais toujours « **Rien en stock** » | — | **Message faux** : le stock est partiel, pas nul (`OrdersPanel.tsx:62`, `blockStock` unique). |
| 13 | `320-15` → `18` | « Livrer · 1 lot · 353,22 d », puis jeton « Padoue 0:30 · Rappeler », retour, « +358,88 d » | 2 | **La meilleure boucle du jeu**, en 2 touchers. Mais, au même instant, deux ors : « Rappeler » et « Vendre ». Et « 353,22 d par jour » s'affiche après une seule livraison : le revenu du jour est extrapolé. |
| 14 | `13-case` | Romagne : cadenas « Casa 9 » | 1 | Cul-de-sac (C23 du 3 novembre, non corrigé). |
| 15 | `19-dezoom`, `19b` | Vue lointaine ; tuiles de 20 px | — | Paliers de zoom, OK. Au plus loin, plus rien n'est touchable à 44 px. |

**Bilan** : la boucle « relancer → bâtir → attendre → livrer » tient en 10 minutes et environ 12 touchers. C'est un vrai progrès. La première livraison n'est cependant possible que si le joueur produit 33 bois, soit 3 lots d'environ 30 min, et la Scierie mange ce bois en même temps (« attend bois »). En première session réelle, sans le stock que le test achète, il n'y a donc pas de livraison avant 1 h 30 environ. Ce point est connu (audit du 3 novembre, § 3, et lot 6) ; je n'ai pas vérifié le calibrage `b7b8454` au simulateur.

### 2.2 La Porta (390×844)

| Capture | Constat |
|---|---|
| `2-carte`, `3-panneau` | La Porta est bien posée et lisible. Son panneau propose « La bataille » et « Les armes ». |
| `1-armes` | La scène des armes est **une quatrième profondeur**, plein écran, sans carte, avec une feuille en plus dessous. Les véhicules fermés (Casa 11, Casa 14) sont montrés en entier. |
| `4-porta` | Scène de la Porta : un or « Entrer · palier 1 », plus deux « L'antiquaire » (dans la scène, et en bouton au contour d'or) et « Envoyer · mule » en lapis. « **Entrée : 0 pains** » : faute d'accord, et l'entrée gratuite est mal dite. Les puces « Cavalier » et « mule » sont en aplat lapis, ce qui les fait lire comme des boutons choisis. |
| `5-bataille` | Bataille : « Touchez la destination. » sans dire quel véhicule est choisi. Les unités font environ 10 px sur l'île entière, et les ennemis et les reliques ne se distinguent pas. **Le seul or est « Sortir par la porte »**, l'action de fuite, dès la seconde 2. |
| `6b-bataille-pres` | Zoomé, la croix de fermeture passe sous le décor et « Sortir » disparaît. |
| — | Les boutons ronds des composants (`Battle.tsx:363`) écrivent leur nom en 10 px (`text-[0.625rem]`). |

**Règle d'or 7** : une bataille de 10 minutes, c'est conforme. Mais rien ne dit « Porta ouverte jusqu'à… » sur la carte.

---

## 3. Ce qui est corrigé depuis les audits précédents (vérifié)

| Constat d'origine | État |
|---|---|
| 31 oct. P1 : on ne sait pas quoi faire | **Corrigé jusqu'à la Casa 2** (`next.ts`, `NextStepCard`). Rouvert au-delà (M1). |
| 31 oct. P2 : vocabulaire | Partiellement : bulles sur la HUD (`Hud.tsx:141`), `Term` dans la feuille Maison. La HUD montre encore 4 pictos sans mot (étoile verte, croix rouge, roue). |
| 31 oct. P4 : systèmes fermés montrés trop tôt | **Non corrigé** : Famille, personnel, traits, Terraferme « Casa 4 », chariots de combat Casa 11 et 14. |
| 31 oct. P6 : aucun retour | Corrigé : `feel()` (`EmpireGame.tsx:648`) fait voler marchandises et pièces, avec son et vibration ; `CasaMoment`. |
| 31 oct. Lot E : Carnet à 3 objectifs | **Non fait** : 9 lignes et plus (`7-compagnie`). |
| 3 nov. C1, C13, C14, C18, C20, B1 à B7 | Corrigés : Maison, Livrer en 2 touchers, domaine, chargement, ErrorBoundary, cache. |
| 3 nov. C8 : calque introuvable | **Non corrigé** (pas de bouton œil ; R8 renvoyé à IDEAS). |
| 3 nov. C12 : textes sous 12 px | Corrigé sur la carte ; il en reste 4 hors de la carte (`Battle.tsx:153`, `:363`, `ArmsSheet.tsx:124`, `Term.tsx:23`). |
| 3 nov. C17 : icônes seules dans la feuille du véhicule | **Non corrigé** (`map3d/3-mule` : ▢ → ⚒ sans libellé). |
| 3 nov. C19 : trou au centre du pied | **Non corrigé** (`1c-secteur` : Maison à gauche, 3 ronds à droite). |
| 3 nov. C23 : case « Casa 9 » en cul-de-sac | **Non corrigé** (`13-case`). |

---

## 4. Constats

Notation : **B** bloquant, **M** majeur, **m** mineur ; effort **S** (moins d'un jour), **M** (2 à 4 jours), **L** (une semaine ou plus).

### Bloquants

**B1. Un toucher au Marché achète sans filet.**
- Preuve : `Market.tsx:108-119`, `Slab` « +10 · prix » → `empireBuy` direct. Captures `6-marche` et `320x568-15` (caisse de 328 d à 19,4 d).
- Le bouton n'a pas de verbe (« +10 · 471,1 d » ne dit pas « Acheter ») et se trouve sur une ligne dont le toucher ouvre la vente. On achète en voulant vendre.
- Il n'y a ni confirmation au-delà d'un seuil de caisse, ni annulation.
- **Recommandation** : libellé « Acheter 10 · 471 d ». Au-delà de 25 % de la caisse, un second toucher confirme (le bouton passe à « Confirmer · 471 d » pendant 3 s). Ou une puce « Annuler » de 5 s, comme pour « Livrer » (même mécanique que le rappel). Effort **S**.

**B2. Après la Casa 2, aucun objectif visible.**
- Preuve : `inTutorial` (`next.ts:227-229`) ; le pied n'affiche Lorenzo que si `tutorial` (`EmpireGame.tsx:347`) ; `HelpSheet` ne donne que des mots.
- C'est contraire à CADRAGE § 4.1 (« trois objectifs visibles ») et au cadrage du 31 octobre lui-même (« il ne reste qu'un ? qui donne son conseil », donc un conseil, pas un objectif). C'est le point de décrochage du jour 1.
- **Recommandation** : garder la décision du porteur (Lorenzo ne joue plus à la place du joueur), mais poser en haut de l'écran un **ruban de trois jalons** sans bouton or : la Casa suivante (matériaux, en marques pleines ou creuses), la meilleure commande atteignable, l'objectif du Carnet le plus avancé. Chaque jalon touché ouvre son lieu, la caméra allant vers la ville ou le domaine. C'est le « Prochains paliers » du cadrage, et c'est visuel (règle d'or 8). Effort **M**. À faire valider au porteur.

### Majeurs

**M1. Le retour de 8 h est muet, et il n'y a aucune notification.**
- Preuve : seuil à 12 h (`view.ts:352`) ; `useAwayRecap` ne rejoue que les pièces des livraisons ; aucun appel à `game/push.ts` depuis `empire/`.
- Hades' Star et tous les jeux de gestion mobiles vivent de « stockage plein » et « chantier fini ».
- **Recommandation** :
  - abaisser le seuil à 2 ou 3 h, en réglage dans `worlds.settings` ;
  - faire du retour un *moment* visuel de 3 s sur la carte (les piles qui montent sur les ateliers, les caisses des villes, les pièces), puis un seul or « Tout ramasser » ;
  - brancher les notifications (opt-in après la première livraison) : « Vos files sont pleines », « Padoue attend 30 planches », « Chantier achevé ».

  La règle d'or 3 y gagne son signal : « plein » se dit, rien n'est perdu. Effort **M**. Les notifications sont notées hors chantier en IDEAS.md : décision du porteur à reprendre.

**M2. Les feuilles Marché, Compagnie et Famille sont des tableurs.**
- Preuve : `6-marche` (9 lignes « = au cours ») ; `7-compagnie` (9 objectifs) ; `8-famille` (traits et embauches à la Casa 1).
- C'est contraire à la règle d'or 8 et à P4 et au lot E du 31 octobre.
- **Recommandation** :
  - Marché : en tête, ce que **vous tenez** (marques pleines et quantité) et ce que demandent les villes ; les autres marchandises repliées sous « Acheter ».
  - Carnet : 3 objectifs, chacun avec sa marque et son arc.
  - Famille et personnel : masqués jusqu'à leur Casa moins une, en une ligne « Bientôt ».

  Effort **M** (Marché et Carnet), **S** (masquage).

**M3. Le message « Rien en stock » est faux en stock partiel et ne dit pas comment faire.**
- Preuve : `OrdersPanel.tsx:62`, `i18n.ts:311` ; capture `15-livrer` (« Il en manque 22 » puis « Rien en stock »).
- **Recommandation** : « Il manque 22 bois : votre Camp de bûcherons en fait 11 toutes les 30 min, prêt vers 16 h 40 », avec un bouton fantôme « Voir le domaine ». Effort **S**.

**M4. Le texte de Lorenzo est tronqué sur sa partie utile.**
- Preuve : `Guide.tsx:96` (`line-clamp-2`) ; `3-relance` (« Bâtissez cet atelier :… »), `320x568-3` (« Bâtisse cet… »), `320x568-17` (« Un objectif du Carnet (ongle… »).
- **Recommandation** : des phrases écrites pour une ligne et demie, le nom d'abord (« Bâtissez la Briqueterie »), et le bouton qui ne répète pas le texte (« Bâtir · 48 d »). Retirer « (onglet Compagnie) », qui n'existe plus (il n'y a plus d'onglets). Effort **S**.

**M5. Deux boutons or à la fois, et l'or sur la mauvaise action.**
- Preuves :
  - `320x568-16` : « Rappeler » (`Trips`) et « Vendre » (Lorenzo) ;
  - `porta/4-porta` : « Entrer » or et « L'antiquaire » bordé d'or ;
  - `porta/5-bataille` : seul or « Sortir par la porte » ;
  - `1b-intro` : « Suivant » or au-dessus de la carte.
- **Recommandation** : « Rappeler » en fantôme ; « Sortir » en fantôme tant que rien n'est chargé ; l'or de la bataille sur l'action du véhicule choisi, ou rien. Effort **S**.

**M6. Le marché à 320 px rend les marchandises indiscernables.**
- Preuve : `320x568-6` : « Épic… », « D… », « Briq… », « Plan… ». Épices, Draps et Sel ont la même marque (losange pourpre de l'outre-mer).
- **Recommandation** : le bouton d'achat passe sous le nom sous 360 px (ou devient une icône « + » de 44 px), le nom ne se coupe jamais, et le pictogramme est gravé dans la marque à 28 px (design.md : « dès 20 px »). Effort **S**.

**M7. La HUD : chiffres à centimes, pictos muets, revenu trompeur.**
- Preuves :
  - La bourse affiche « 358,88 d », « 0,86 d », « 34,85 d » et « 353,22 d par jour » via `d()` (`map/logic.ts:143`, `Hud.tsx:99`). Le jeu mensuel avait `whole()` (`format.ts:41`) précisément pour la bourse.
  - Le revenu du jour est extrapolé dès la première vente (`trade.ts:118`).
  - Trois des quatre compteurs (Faveur, Sceaux, flotte) sont des pictos sans mot ; 0 Faveur et 0 Sceau occupent 2 lignes sur 4 pendant des jours.
  - En 320, la HUD recouvre la pastille de Venise (`320x568-14`).
- **Recommandation** :
  - `whole()` pour la bourse et le revenu ;
  - « revenu du jour » seulement après un jour plein, sinon « aujourd'hui : +353 d » ;
  - Faveur et Sceaux cachés tant qu'ils valent 0 ;
  - la flotte en jetons de mules (déjà dans `Trips`).

  Effort **S**.

**M8. Lecteur d'écran : la HUD ne lit pas ses valeurs.**
- Preuve : `Hud.tsx:140`, `aria-label={label}` sur le bouton, ce qui remplace le contenu, y compris le `sr-only` « Ducats : 500 d ».
- Le toast est un `<output>` (correct), mais les gains (`flyCoins`) ne sont annoncés nulle part.
- La carte 3D n'a pas d'alternative textuelle des lieux en dehors des repères HTML.
- **Recommandation** : `aria-label={`${label} : ${value}`}` ; une région `aria-live="polite"` qui dit « +358 d, Padoue » ; vérifier que les repères `[data-city]` portent leur nom et leur état de commande. Effort **S**.

**M9. La Porta ajoute une quatrième profondeur et cache ses commandes en zoom.**
- Preuve : `porta/1-armes`, `4-porta` (scène plein écran puis feuille), `6b` (croix et « Sortir » absentes).
- C'est contraire à « trois profondeurs, pas plus » (design.md, Lagune).
- **Recommandation** : la Porta s'ouvre comme un domaine (même plongée, même chevron, même barre au pied) ; la croix et l'action restent au-dessus du décor (`z` et `pointer-events`) ; « Entrée : gratuite » ou « 1 pain ». Effort **M**.

**M10. Pas d'état hors ligne ni d'erreur réseau dite.**
- Preuve : `refresh` avale l'erreur (`EmpireGame.tsx:163`) ; `act` affiche « erreur inconnue » (`:186`) ; aucune lecture de `navigator.onLine`.
- Dans le métro, le joueur touche « Tout relancer », le bouton tourne, puis un toast vague s'affiche.
- **Recommandation** : un jeton « Hors ligne · reprise auto » dans la HUD ; les gestes mis en file ou refusés avec « Pas de réseau : réessayez » ; un nouvel essai à la reconnexion. Effort **S**.

### Mineurs

- **m1. Pose du premier fondaco** (`1c-fondaco`). Proposer un point pré-choisi (le meilleur, avec son cercle) et un or actif « Poser ici » dès l'ouverture : 1 toucher au lieu de 2. Masquer le libellé du fondaco tant qu'il n'est pas posé. **S**.
- **m2. Le panneau d'un atelier** (`4-panneau`). Montrer l'état et « Ramasser » si prêt ; remplacer le cadenas « Niveau max » par « Niveau 2 à la Casa 2 ». **S**.
- **m3. Le temps en phrases** (« File jusqu'à 4 h 03 », « Prochaine commande à 23 h 33 »). L'arc de 12 h sur la feuille de l'atelier ; un arc sur la pastille de la ville. **S**.
- **m4. Trou au centre du pied** (C19, toujours là). Y mettre le « ? » (après le tutoriel) ou l'œil du calque. **S**.
- **m5. Le calque d'information sans indice** (C8). Un bouton œil, ou une phrase de Lorenzo à la première attente. **S**.
- **m6. Case « Casa 9 »** (C23). Dire ce qu'elle ouvre et quand ; ne border d'or que les cases achetables. **S**.
- **m7. Textes à 10 et 11 px** hors de la carte : `Battle.tsx:153`, `:363`, `ArmsSheet.tsx:124`, `Term.tsx:23`. **S**.
- **m8. Couleurs en dur dans les ronds** (`RoundButtons.tsx:89`, `bg-[#1D304D]`). Elles cassent la palette claire « Parchemin » ; utiliser `bg-night-2`. **S**.
- **m9. Focus clavier carré** sur un rond (`9-carte`, « Famille »). Contraire à design.md (« un contrôle rond porte son arrondi »). **S**.
- **m10. Texte périmé** : « chartes −10 % de Faveur » (trait Diplomatici, `i18n.ts:754`), alors que la charte en Faveur est supprimée (§ 12 ter). **S**.
- **m11. Cibles tactiles.**
  - Compteurs de la HUD à 36 px de haut (`min-h-9`, `Hud.tsx:139`), pastilles du marché à `min-h-9` (`Market.tsx:68`) : sous 44 px.
  - Les ronds (48 px), les boutons de panneau (48 px) et les cartes de commande (52 px) sont bons.
  - **S**.
- **m12. PC (code seul).**
  - Les feuilles deviennent des fenêtres et le panneau de commandes fait 30rem ; c'est bien.
  - Mais le calque (Alt), le clavier (ZQSD, virgule, point) et le clic droit ne sont annoncés nulle part.
  - Un raccourci « ? » ou une ligne dans l'aide suffirait. **S**.
- **m13. Daltonisme.**
  - L'état des commandes repose sur l'or contre le vert d'eau (pastille de ville), et le plein contre le creux des marques.
  - Le creux et le plein sont un bon double codage ; l'anneau « plein » cinabre contre vert ne l'est pas.
  - Ajouter un motif (coche, point) sur la pastille « Livrer possible ». **S**.
- **m14. Pseudo auto « Casa_390 »** sur la carte et la HUD (et coupé en 320). Proposer de nommer sa Maison à la fondation, en un champ prérempli. **S**.

---

## 5. Touchers par action clé (mesurés sur les captures et le code)

| Action | 31 oct. | 3 nov. | Aujourd'hui | Cible |
|---|---|---|---|---|
| Récolter et relancer tout | 2 | 1 | **1** (Lorenzo ou bandeau) | 1 |
| Bâtir l'atelier qui manque | 4+ | 3 | **2** (Lorenzo → Bâtir) | 2 |
| Livrer une commande | — | 6 à 8 + glisser | **2** (ville → Livrer) | 2 |
| Vendre un surplus | 3 | 3 | 3 (Marché → ligne → Vendre) | 2 (pastille de stock → Vendre) |
| Savoir quoi faire après la Casa 2 | — | — | **2 et des mots seulement** (? → lire) | 0 (toujours visible) |
| Retour après 8 h, tout reprendre | — | — | 1, sans savoir ce qui s'est passé | 1, avec un moment de 3 s |
| Entrer à la Porta | — | — | 3 (Porta → La bataille → Entrer) | 2 |

---

## 6. Règles d'or

- **Règle 3 (plafonds sans perte)** : respectée côté moteur, mais **invisible**. Aucune file « pleine » n'est signalée sur la carte, aucune notification. Il faut une pile pleine dessinée sur l'atelier et une pastille « plein » (M1).
- **Règle 7 (quelques minutes, plusieurs fois par jour)** : la tournée tient en moins de 2 minutes jusqu'à la Casa 2. Au-delà, sans objectif (B2) ni rappel (M1), rien n'appelle la session suivante. La Porta en 10 minutes est conforme.
- **Règle 8 (tout se voit)** :
  - conforme pour la carte, le domaine, les livraisons et la bataille ;
  - non conforme pour le Marché, le Carnet, la Famille et la Production (listes de texte) ;
  - non conforme pour le retour d'absence (liste de marchandises dans une feuille, `AwaySheet`).

---

## 7. Top 10 priorisé

1. **B1 (S)** : au Marché, « Acheter 10 · prix », confirmation au-delà de 25 % de la caisse ou annulation de 5 s.
2. **B2 (M)** : un ruban de 3 jalons toujours visible après la Casa 2 (Casa suivante, meilleure commande, Carnet), qui ouvre le lieu au toucher. Décision du porteur requise.
3. **M1 (M)** : le retour d'absence dès 2 à 3 h, en moment visuel de 3 s, puis « Tout ramasser » ; notifications opt-in « files pleines », « commande », « chantier fini ».
4. **M3 et M4 (S)** : des messages justes et entiers. « Il manque 22 bois : votre Camp en fait 11/30 min » ; Lorenzo jamais tronqué, le nom d'abord, sans « (onglet Compagnie) ».
5. **M5 (S)** : un seul or par écran. « Rappeler » et « Sortir par la porte » en fantôme ; l'or de la Porta sur l'action du véhicule.
6. **M7 (S)** : la bourse en ducats entiers (`whole()`), le revenu du jour seulement sur un jour plein, Faveur et Sceaux cachés à 0, et la HUD ne recouvre plus Venise en 320.
7. **M2 (M)** : le Marché ouvert sur ce que vous tenez et ce que les villes demandent ; le Carnet à 3 objectifs ; Famille et personnel masqués avant leur Casa.
8. **M6 et le 320 px (S)** : les noms des marchandises jamais coupés, les pictos gravés dans les marques, la Production sans colonne d'un mot par ligne.
9. **M8 et M10 (S)** : accessibilité et réseau. Les valeurs de la HUD lues (`aria-label`), les gains annoncés (`aria-live`), un état « Hors ligne » et un nouvel essai.
10. **M9 (M)** : la Porta dans le modèle des trois profondeurs (plongée comme un domaine), ses commandes toujours au-dessus du décor, « Entrée : gratuite ».

## 8. Questions au porteur

1. Le ruban de trois jalons après la Casa 2 respecte-t-il votre décision « plus aucun bouton ne joue à la place du joueur » ? Je propose des jalons qui **ouvrent un lieu**, sans action en or.
2. Les notifications push (renvoyées en IDEAS.md le 3 novembre) : peut-on les reprendre, en opt-in, limitées à trois sortes ?
3. Le seuil du retour d'absence : 12 h dans le moteur. On le passe à 2 ou 3 h, en réglage dans `worlds.settings` ?
4. Au commerce, B1 (confirmation d'achat) ne change pas les règles : peut-il partir sans note du chapitre ?
