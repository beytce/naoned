# Audit UX/UI expert — Fondaco (7 novembre 2026)

*Auditeur : expert UX/UI senior, jeux de gestion et mobiles. Build `apps/web/dist` du 7 novembre, monde « empire » en cases carrées, intérieur des ateliers allumé (`EMPIRE_INTERIOR=on`), base en mémoire. Joué au clavier et à la souris en 1280×800, au toucher en 390×844 et 320×568, en mode sombre système et avec « moins d'animations ». Parcours fait : connexion, fondation, guide de Lorenzo, case libre, catalogue, camp de bûcherons, production, ramassage, livraison d'accueil à Padoue, paiement, intérieur de l'atelier, onglets Fondaco, Porta (verrouillée), Compagnie, profil, recherche, Venise et la Dogana, commandes de Padoue. La Porta n'a pas pu être jouée (elle demande le Fondaco niv. 4, hors de portée en une session). La rotation de caméra et les livraisons vers des villes non reliées sont exclues : une autre session les corrige.*

*Limite de l'essai : la machine de test, partagée et en WebGL logiciel, était très chargée (une capture prenait 1 à 2 minutes). Je n'ai retenu aucune lenteur ni aucun repère invisible qui pourrait venir de cette charge : ce qui suit a été vu plusieurs fois, ou confirmé dans le code.*

---

## (a) Verdict

**Note : 5/10. Pas publiable en l'état côté UX/UI.**

1. La matière Porcellana est belle et tenue (porcelaine, biseaux, palazzo, cabane) : la carte a l'allure d'un vrai jeu. L'intérieur de l'atelier, avec ses rubans et ses débits posés sur les postes, est la meilleure idée de « tout se voit » du jeu.
2. En revanche, **la carte ne dit pas où l'on est** : aucune ville n'est nommée à l'écran, les repères se chevauchent ou passent sous la barre du haut, et un bourg (Trévise) porte un campanile qu'on prend pour celui de San Marco.
3. **Le vocabulaire se contredit** : la page d'accueil vend encore le jeu mensuel (saisons, remise à égalité, « rien à acheter… ni vitesse »), puis « trois ateliers et 500 ducats » quand on en reçoit zéro et 650. On a aussi Remise, Fondaco, Casa, Maison et Domaine pour des notions voisines, et Marché, Dogana, San Marco et Venise pour un seul lieu.
4. **Le guide de Lorenzo est utile mais abîmé** : `{cash}` affiché tel quel, la main qui pointe le mauvais onglet pendant toute la partie, une étape « Briqueterie » sans bouton et dont il manque l'argile, et une bulle tronquée.
5. Le Marché, les commandes, la Compagnie et le profil restent des **listes et des tableaux** dans des feuilles d'ancien style, qui contredisent la règle d'or 8 et la décision D8. **Les directions superposées se voient encore** : le doré de « Récolter », le violet des sélections et des anneaux, les palettes Jour et Lagune proposées.

---

## (b) Problèmes par écran

Gravité : **P0** bloque la publication · **P1** majeur · **P2** gênant · **P3** finition.

### 0. Accueil et fondation

| # | Problème | Gravité | Recommandation |
|---|---|---|---|
| 0.1 | La page d'accueil promet l'**ancien jeu** : « Bâtissez une maison de commerce **en un mois** », « **Une saison par mois** : tout le monde repart à égalité », « Rien à acheter… **ni vitesse** ». Le CADRAGE-v3 dit l'inverse (empire persistant, règle 4 : le temps s'achète en perles). Capture : `/tmp/claude-0/-home-user-naoned/7091555e-9be4-5e80-9143-48409e2cdd8e/scratchpad/p4-ux/01-landing.png` | **P0** (promesse mensongère, et risque juridique sur la vente de temps) | Réécrire les quatre puces avec la v3 : « Ton empire ne sera jamais remis à zéro », « Personne ne peut te piller », « Les perles achètent du temps, jamais de la puissance », « Quelques minutes, plusieurs fois par jour ». |
| 0.2 | « Fondez votre Maison » annonce « **trois ateliers et cinq cents ducats** », mais on reçoit zéro atelier et 650 ducats (plan des premiers pas, lot 1). Capture : `/tmp/claude-0/-home-user-naoned/7091555e-9be4-5e80-9143-48409e2cdd8e/scratchpad/p4-ux/03-first-map.png` | **P1** | « Un fondaco près de Venise, trois cases à bâtir et 650 ducats. » Mieux encore : montrer les trois cases en image. |
| 0.3 | Le médaillon lion doré et le titre FONDACO en or sur l'écran d'accueil contredisent « une seule couleur d'accent ». Les puces violettes sont des restes de Lagune. | P3 | Marque en encre et accent rouge, comme la pilule « Fondaco » du jeu. |
| 0.4 | Le nom proposé apparaît avec ses tirets bas (« Lunardo_da_Chioggia ») dans le HUD mobile. | P2 | Générer des noms avec des espaces, ou remplacer `_` par une espace à l'affichage. |

### 1. Carte (bureau et téléphone)

| # | Problème | Gravité | Recommandation |
|---|---|---|---|
| 1.1 | **Aucun nom de ville à l'écran.** Les repères de ville sont des pastilles de 28 px, sans libellé (le nom n'est que dans `aria-label`). Quand Lorenzo dit « Padoue attend 11 bois », le joueur ne sait pas quel îlot est Padoue. Captures : `/tmp/claude-0/-home-user-naoned/7091555e-9be4-5e80-9143-48409e2cdd8e/scratchpad/p4-ux/17-after-ramasser.png`, `/tmp/claude-0/-home-user-naoned/7091555e-9be4-5e80-9143-48409e2cdd8e/scratchpad/p4-ux/18-livrer-dock.png` | **P0** (jeu de commerce dont on ne lit pas la géographie) | Une étiquette de nom en Nunito sur chaque ville et sur San Marco, toujours visible à partir d'un certain zoom, en pilule de papier à côté du repère. Le prototype numérotait et nommait chaque lieu. |
| 1.2 | **Repères qui se chevauchent et qui passent sous la barre du haut** : « San Marco » à (1099, −10) et le cadenas « Niv. 4 » de Trévise à (1074, −11). En visant San Marco, j'ai ouvert Trévise. Capture : `/tmp/claude-0/-home-user-naoned/7091555e-9be4-5e80-9143-48409e2cdd8e/scratchpad/p4-ux/26-san-marco.png` | **P1** | Écarter les repères à la projection (l'ancien `declutter`, sur des rectangles écran) et les garder dans la zone utile (sous `--topbar`, hors du panneau de gauche), avec une flèche de bord pour ce qui sort du cadre. |
| 1.3 | **Trévise, un bourg, porte un grand campanile** collé à la basilique de San Marco : on lit « San Marco = campanile et coupoles » comme dans le prototype, mais le campanile appartient à la case d'une autre ville. Capture : `/tmp/claude-0/-home-user-naoned/7091555e-9be4-5e80-9143-48409e2cdd8e/scratchpad/p4-ux/27-marche.png` | P1 | Réserver le campanile de San Marco à la case du Marché, donner à Trévise une petite église (taille « bourg » du catalogue), et ne pas poser deux îlots-repères côte à côte. |
| 1.4 | **San Marco n'a pas de repère visible** (ni pastille, ni nom) alors que D8 en fait la seule entrée du Marché. Je ne l'ai atteint que par la recherche, qui ouvre un panneau « Venise » (et non la fiche « San Marco · la Dogana »). Capture : `/tmp/claude-0/-home-user-naoned/7091555e-9be4-5e80-9143-48409e2cdd8e/scratchpad/p4-ux/49-sanmarco-fiche.png` | **P1** | Repère permanent « Marché » sur San Marco ; sélection, puis fiche d'encre « San Marco · la Dogana » et touche « Entrer ». La recherche doit amener la caméra et sélectionner, pas sauter au dock. |
| 1.5 | **Le panneau de gauche mange 30 % de l'écran** en 1280 px pour une liste d'un atelier. Le bas du panneau, en papier translucide, laisse paraître des bâtiments fantômes, ce qui ressemble à un bug de rendu. Captures : `/tmp/claude-0/-home-user-naoned/7091555e-9be4-5e80-9143-48409e2cdd8e/scratchpad/p4-ux/11-carte-producing.png`, `/tmp/claude-0/-home-user-naoned/7091555e-9be4-5e80-9143-48409e2cdd8e/scratchpad/p4-ux/30-atelier.png` | P1 | Panneau à la hauteur de son contenu (il s'arrête sous le dernier atelier), opaque, repliable. L'anneau de zone et la carte reprennent la place. |
| 1.6 | **Deux « + » pour deux sens** : le « + » gravé de la parcelle (achetable ou fermée) et la pastille rouge « + » (case libre à soi). S'y ajoutent des **cadenas noirs en 3D** sur les cases fermées et un cadenas « Niv. 8 » en pilule : trois signes pour « fermé ». | P2 | Une grammaire : case à soi libre = pastille rouge « + » ; parcelle achetable = « + » gravé et prix au survol ; fermée = cadenas en pilule seulement (retirer le cadenas 3D, noir d'encre, qui pèse plus lourd que le Fondaco). |
| 1.7 | **Routes quasi absentes** : en dehors d'un trajet, aucun ruban rouge du camp au Fondaco ni du Fondaco aux villes. La carte se lit comme un empilement de bâtiments, ce que le porteur reprochait. Comparer `/tmp/claude-0/-home-user-naoned/7091555e-9be4-5e80-9143-48409e2cdd8e/scratchpad/p4-ux/11-carte-producing.png` à `docs/direction-artistique-2026-11/porcellana/carte-selection.png` | P1 | Dessiner toujours la route atelier → Fondaco → villes de la zone (ruban fixe), et ne faire défiler les chevrons que pendant un trajet. |
| 1.8 | **La mule en route ne se voit pas** : la caméra part vers Padoue, la mule est hors champ, et seule une puce « 0:40 » coupée sous le coin du logo signale le trajet. Capture : `/tmp/claude-0/-home-user-naoned/7091555e-9be4-5e80-9143-48409e2cdd8e/scratchpad/p4-ux/18-livrer-dock.png` | P1 | Pendant le premier trajet, cadrer la route entière (Fondaco et ville). Placer la puce du véhicule sous la barre, entière ; la toucher suit le véhicule. |
| 1.9 | **Le paiement est presque invisible** : un « +96 » texte fugace (la commande annonçait 100 d, sans explication de l'écart). Aucune pièce qui vole vers la bourse, aucun son, et la bourse ne pulse pas. Capture : `/tmp/claude-0/-home-user-naoned/7091555e-9be4-5e80-9143-48409e2cdd8e/scratchpad/p4-ux/20-livraison-arrivee.png` | P1 | Pièces qui partent de la ville vers le compteur de ducats, compteur qui roule, et le détail sur la fiche (« 100 − 4 de péage »). C'est le moment-récompense de la boucle. |
| 1.10 | **La fiche d'encre flotte sans ancre** : pas de flèche ni de filet vers son lieu. Après le glissement de la caméra, on ne sait pas toujours quelle case est choisie (sur la case libre : ni levée ni anneau visibles sur bureau). Capture : `/tmp/claude-0/-home-user-naoned/7091555e-9be4-5e80-9143-48409e2cdd8e/scratchpad/p4-ux/07-pin-click.png` | P2 | Un filet ou un bec vers le repère, comme le prototype (fiche « à côté du repère »), et une levée et un anneau franchement visibles. |
| 1.11 | La fiche **bouge pendant l'animation de caméra** : son bouton n'est pas « stable » pendant environ 1 s (Playwright refuse de cliquer). Un toucher rapide rate. | P2 | Ouvrir la fiche à la fin du glissement, ou la poser à un endroit fixe de l'écran (en bas sur téléphone, c'est déjà le cas). |
| 1.12 | **Échap ferme le dock mais laisse la caméra** loin du Fondaco, zoomée sur un îlot. Rien n'indique comment revenir, sinon la boussole sans libellé. | P2 | « Revenir au Fondaco » visible (libellé ou infobulle) ; fermer une fiche ramène la vue d'avant. |
| 1.13 | Le **badge « 1 » du médaillon** (la Casa) se confond avec les badges « 1 » des repères (lots prêts, commandes) et de l'onglet Fondaco. | P2 | Médaillon avec « Casa 1 » ou son anneau de progression ; réserver le badge rond rouge chiffré aux choses à faire. |

### 2. Fiche de case et catalogue « Bâtir ici »

| # | Problème | Gravité | Recommandation |
|---|---|---|---|
| 2.1 | Le catalogue est une **liste modale** de dix lignes identiques (« Bâtir · 120 »), titrée « Vénétie » (la région, pas la case), sans aperçu du bâtiment sur la case. Capture : `/tmp/claude-0/-home-user-naoned/7091555e-9be4-5e80-9143-48409e2cdd8e/scratchpad/p4-ux/08b-catalog.png` | P1 (règle 8) | Un tiroir de vignettes rondes ou de maquettes 3D en bas ; toucher une vignette pose un fantôme du bâtiment sur la case, montre ses voisins (bonus de voisinage) et la route ; « Bâtir » confirme. |
| 2.2 | « 11 Bois », « 8 Blé » **sans unité de temps** (par lot ? par heure ?). L'intérieur affiche 35 bois/h, la liste « 11 Bois » : les chiffres ne se raccordent pas. | P1 | « 11 bois par lot · 1 lot / 18 min » ou « ≈ 35/h », partout pareil. |
| 2.3 | Le bouton de la fiche dit « Bâtir un atelier », alors que design.md prévoit une touche « Entrer ». L'étiquette « Prêt ! » colle sur une case libre où rien n'est prêt. | P3 | Réserver « Prêt ! » aux lots et commandes prêts. |
| 2.4 | Bâtir est **instantané et muet** : la cabane apparaît sans chute de case, sans échafaudage, sans poussière. Le premier geste fort du jeu n'a pas de récompense. | P2 | Petite séquence d'une seconde : la case se soulève, le bâtiment monte, un nuage de poussière (coupé en « moins d'animations »). |

### 3. Fondaco (onglet)

| # | Problème | Gravité | Recommandation |
|---|---|---|---|
| 3.1 | L'onglet Fondaco **n'ouvre pas de lieu reconnaissable** : il zoome la carte et pose une barre « ‹ Carte · Domaine · Casa 1 · Bâtir · Le quai ». Quand un intérieur d'atelier est ouvert, l'onglet s'allume mais l'intérieur reste à l'écran. Capture : `/tmp/claude-0/-home-user-naoned/7091555e-9be4-5e80-9143-48409e2cdd8e/scratchpad/p4-ux/33-fondaco-tab.png` | **P1** (navigation incohérente) | Un onglet doit toujours fermer la scène plein écran en cours (intérieur, dock) et montrer son lieu. Le Fondaco doit avoir sa fiche (stock par marchandise en jauges, anneau de zone, niveau suivant : « stock 200 → 300, +2 villes »), comme le promet le plan des premiers pas, lot 3. |
| 3.2 | Le stock du Fondaco s'appelle « **Remise** » au pied de l'écran (« Remise · 11 Bois »), alors que la Remise est aussi le garage des véhicules (« La Remise · Achète et monte tes véhicules » dans le catalogue). Le brief dit « Fondaco = entrepôt ». | **P1** (vocabulaire) | Pied d'écran : « Entrepôt » ou « Au Fondaco » ; la Remise reste le garage des véhicules (quai). |
| 3.3 | Le badge « 1 » de l'onglet Fondaco s'allume quand un lot est prêt, alors que le lot est un atelier sur la Carte. | P2 | Badge sur l'atelier et sur la bulle de Lorenzo ; l'onglet Fondaco ne porte de badge que pour un geste à faire dans le Fondaco. |

### 4. Marché (Dogana)

| # | Problème | Gravité | Recommandation |
|---|---|---|---|
| 4.1 | **C'est un tableur** : neuf lignes « marchandise · prix · = · Acheter 10 ». Le sous-titre dit « Touchez une marchandise pour la vendre ou la livrer », mais seule l'action « Acheter 10 » se voit ; vendre est caché. Capture : `/tmp/claude-0/-home-user-naoned/7091555e-9be4-5e80-9143-48409e2cdd8e/scratchpad/p4-ux/51-dogana.png` | **P0** (règle 8, D8, et action principale introuvable) | Le Marché en scène : étals sur la place San Marco, une caisse par marchandise (taille = stock, couleur = au-dessus ou au-dessous du cours) ; toucher une caisse ouvre un dock « Vendre / Acheter » avec un curseur de quantité et le gain affiché avant. « Vendre » en rouge quand on a du stock. |
| 4.2 | Le signe « = » sous chaque prix n'est pas expliqué. « au cours » se répète neuf fois. | P2 | Flèche ↑↓ colorée et écart en % ; rien quand c'est au cours. |
| 4.3 | **Un lieu, quatre noms** : « San Marco » (recherche), « Le Marché · la Dogana » (résultat), « Venise · Vénétie · Fondaco 1 » (panneau), « Le négoce · Le Marché » (feuille), et le carnet dit « Vendre à la Dogana ». En plus, l'entrée « Dogana » reste dans le profil (contredit D8 : « il n'y a plus d'autre entrée »). | P1 | Un nom joueur : **le Marché (San Marco)** ; « Dogana » seulement en sur-titre d'ambiance. Retirer l'onglet Dogana du profil. |
| 4.4 | Le panneau « Venise » (icônes Dogana, Fondaco 480 d, Convoi, Détails) est un **reste de l'ancien dock** : petites tuiles blanches cerclées de violet, sans fiche d'encre ni touche rouge. Le « Fondaco 480 d » ne dit pas ce qu'on achète. | P1 | Repasser ce panneau sur le modèle « fiche, puis dock à une décision ». « Fondaco · 480 d » devient « Ouvrir un comptoir à Venise · 480 d » avec ce qu'il rapporte. |

### 5. Commandes et livraisons

| # | Problème | Gravité | Recommandation |
|---|---|---|---|
| 5.1 | Le panneau de Padoue affiche « **1 commande sur 3** » : c'est le « n/plafond » que la refonte claire voulait supprimer (« Plus de "n/plafond" »). Capture : `/tmp/claude-0/-home-user-naoned/7091555e-9be4-5e80-9143-48409e2cdd8e/scratchpad/p4-ux/52-padoue-commandes.png` | P1 | Retirer ; les caisses au quai suffisent. |
| 5.2 | **Deux chemins pour livrer** : le bouton « Livrer » de Lorenzo envoie la mule sans confirmation ni choix, alors que la ville ouvre un dock avec la carte de commande et « Livrer · 1 lot · 100 d / Mule · 2 min ». Le même mot fait deux gestes différents. | P1 | Le bouton de Lorenzo ouvre le dock de la ville (route tracée, véhicule, durée, gain), et la confirmation se fait là. Sinon, un « annuler » de 5 s. |
| 5.3 | La carte de commande coche en **violet** (sélection `--info`), cerclée d'or : trois couleurs sur une vignette. | P2 | Sélection à l'accent ou à l'encre (voir (c)). |
| 5.4 | « Prochaine commande à 19 h 58 » est une heure absolue, sans fuseau ni compte à rebours, alors que partout ailleurs le jeu compte en « 00:41 ». | P3 | « Nouvelle commande dans 2 h 10 ». |
| 5.5 | La commande garde l'ancien sens de la Faveur ; la ville ne dit pas ce qu'elle rapporte d'autre (réputation, zone). | P3 | Ligne « +1 Faveur de Padoue » avec le fanion dessiné. |

### 6. Atelier : fiche et intérieur

| # | Problème | Gravité | Recommandation |
|---|---|---|---|
| 6.1 | **Les postes sont trois bancs identiques** (boîtes beiges) : on ne lit ni hache, ni scie, ni charrette. Le plan exige « explicites (on reconnaît une scie, un four…) ». Capture : `/tmp/claude-0/-home-user-naoned/7091555e-9be4-5e80-9143-48409e2cdd8e/scratchpad/p4-ux/32-interieur.png` | P1 | Un modèle par poste du camp (abattage, ébranchage, empilage), un geste qui bouge quand il travaille. |
| 6.2 | **« +60 % sur le plan d'origine » sur un atelier qu'on vient de bâtir**, sans avoir rien fait. Le joueur ne comprend pas qu'il aurait déjà optimisé. Les trois losanges vides (la qualité) ne sont pas expliqués. | P1 | Ne montrer le gain qu'après un geste du joueur ; légende ou « ? » sur les losanges. |
| 6.3 | **« Récolter +11 bois » est doré** (moutarde) : c'est l'or de « Jour et le verre », alors que D2 réserve l'action à l'accent rouge. Le bouton « Rien de mieux à proposer » est un bouton gris désactivé qui ressemble à une action. | P1 | Récolter en touche rouge ; le conseil de Lorenzo devient une bulle de texte, pas un bouton mort. |
| 6.4 | **L'intérieur est un piège de navigation** : Échap ne le ferme pas, les onglets s'allument mais il reste à l'écran, et la recherche s'ouvre par-dessus. Seule la croix en haut à droite sort. Captures : `/tmp/claude-0/-home-user-naoned/7091555e-9be4-5e80-9143-48409e2cdd8e/scratchpad/p4-ux/33-fondaco-tab.png`, `/tmp/claude-0/-home-user-naoned/7091555e-9be4-5e80-9143-48409e2cdd8e/scratchpad/p4-ux/36-marche-dock.png` | **P1** | Échap et le retour Android ferment ; un onglet ferme l'intérieur ; un fil d'Ariane « ‹ Carte · Camp de bûcherons ». |
| 6.5 | Le débit baisse sous les yeux (35,3, puis 35,2, puis 34,9/h en quelques minutes) sans dire pourquoi (usure, fatigue). | P2 | Une petite icône d'usure sur le poste concerné et une ligne « −1 % : la scie s'use » au toucher. |
| 6.6 | La fiche d'atelier sur la carte dit « Niveau 1 · Il travaille. » : pas de marchandise, pas de temps restant, pas de stock prêt. La liste de gauche dit « Lot dans 02:11 ». | P2 | Fiche : « Bois · lot dans 2 min · ×1 prêt », avec l'anneau. |
| 6.7 | La production d'un atelier demande un geste « Ramasser » puis « Relancer » (« Ramasser et relancer »). Pour un jeu « l'absence ne coûte rien », la relance manuelle est une corvée, et le vocabulaire varie : Ramasser, Récolter, Encaisser, Relancer. | P2 | Un seul verbe (« Récolter ») ; relance automatique tant que les intrants sont là, ou un réglage. |

### 7. Porta

| # | Problème | Gravité | Recommandation |
|---|---|---|---|
| 7.1 | Toucher l'onglet **Porta verrouillé ne fait rien** : pas de bulle, pas de son, pas de raison. Seul un petit cadenas grisé l'indique. Capture : `/tmp/claude-0/-home-user-naoned/7091555e-9be4-5e80-9143-48409e2cdd8e/scratchpad/p4-ux/22-porta-tab.png` | P1 | Montrer la Porta fermée (le lieu en biscuit avec sa grille) et « S'ouvre au Fondaco niv. 4 · encore 3 niveaux », avec le chemin. C'est le meilleur teaser du jeu. |
| 7.2 | Non jouée (verrouillée) : à auditer après la montée au niveau 4. | — | — |

### 8. Compagnie

| # | Problème | Gravité | Recommandation |
|---|---|---|---|
| 8.1 | Le carnet est une **grille de 12 anneaux** dont plusieurs se répètent (« Relancer 3 fois » et « Relancer 10 fois », « Livrer 10 » et « Livrer 40 », « Encaisser 50 » et « Encaisser 150 »). Les anneaux sont **violets**. Captures : `/tmp/claude-0/-home-user-naoned/7091555e-9be4-5e80-9143-48409e2cdd8e/scratchpad/p4-ux/46-320-compagnie.png`, `/tmp/claude-0/-home-user-naoned/7091555e-9be4-5e80-9143-48409e2cdd8e/scratchpad/p4-ux/23-compagnie.png` | P2 | Trois à cinq objectifs à la fois, les paliers d'un même objectif en un seul anneau à crans, l'anneau à l'accent rouge. |
| 8.2 | « Votre Puissance 150 · Bande 1 · Sceaux 0 » : trois chiffres sans image ni utilité au niveau 1. Le texte explicatif parle de compétition à un joueur seul. | P3 | Cacher Puissance et Bande jusqu'à ce qu'il y ait un appariement ; montrer les Sceaux par l'objet dessiné (`coins.tsx`). |
| 8.3 | Le badge « ! » de l'onglet Compagnie s'allume dès le départ et ne dit pas pourquoi (un objectif à encaisser ?). | P2 | Badge chiffré « 1 » avec, dans la feuille, l'anneau plein qui pulse. |

### 9. Profil (médaillon)

| # | Problème | Gravité | Recommandation |
|---|---|---|---|
| 9.1 | « Votre Maison · Où vous en êtes » est un **tableau de six chiffres** (Casa, Puissance, Bande, Faveur, Sceaux, Revenu du jour) avec un « ? » chacun, puis les palettes, puis les notifications. Capture : la feuille n'est sortie qu'en texte (capture prise avant son animation) ; texte relevé dans `/tmp/claude-0/-home-user-naoned/7091555e-9be4-5e80-9143-48409e2cdd8e/scratchpad/p4-ux/tour5.txt` | P2 | Le médaillon montre la Casa et sa route ; le reste en onglets Famille, Réglages, Aide. |
| 9.2 | **Cinq palettes au choix** (Porcellana, Jour & Ducat, Lagune & Ducat, Noyer & Ducat, Parchemin & Lapis) : on peut annuler toute la direction Porcellana d'un toucher, et chaque palette multiplie les états à tester. D3 prévoyait seulement le choix de l'accent. | P1 | Ne garder que Porcellana et, si besoin, trois accents (D3) ; retirer les palettes des directions remplacées. |
| 9.3 | Le HUD mobile affiche « 0 d par jour » sous le nom dès le départ, puis « Revenu du jour 100 d » dans le profil. | P3 | Une seule mesure, montrée quand elle n'est pas nulle. |

### 10. Guide (Lorenzo)

| # | Problème | Gravité | Recommandation |
|---|---|---|---|
| 10.1 | **« Votre caisse : {cash}. »** : variable non remplacée dans le titre. Dans `apps/web/src/empire/Guide.tsx` (ligne 266), seul le texte du corps passe par `.replace("{cash}", …)`, pas le titre (`i18n.ts:1064`). Capture : `/tmp/claude-0/-home-user-naoned/7091555e-9be4-5e80-9143-48409e2cdd8e/scratchpad/p4-ux/05-guide-2.png` | **P0** (deuxième écran du jeu) | Appliquer le remplacement au titre, et ajouter un test qui interdit les accolades restantes dans le rendu. |
| 10.2 | **La main de Lorenzo pointe l'onglet Carte**, puis l'onglet Fondaco, **pendant toute la partie**, quel que soit le message (« Ramassez », « Livrez », « Briqueterie »). Captures : `/tmp/claude-0/-home-user-naoned/7091555e-9be4-5e80-9143-48409e2cdd8e/scratchpad/p4-ux/11-carte-producing.png`, `/tmp/claude-0/-home-user-naoned/7091555e-9be4-5e80-9143-48409e2cdd8e/scratchpad/p4-ux/24-profil.png` | **P1** | La main suit la cible de l'étape (la case, l'atelier, la ville, le bouton) et disparaît quand il n'y en a pas. |
| 10.3 | « **Suivez le bouton doré** sous mon portrait » : le bouton est rouge. | P2 | « le bouton rouge ». |
| 10.4 | La bulle tronque son texte (« Touchez une case libre et bâtissez-y un camp de… », « Votre camp de… ») et le bouton se vide de son libellé pendant la transition. Capture : `/tmp/claude-0/-home-user-naoned/7091555e-9be4-5e80-9143-48409e2cdd8e/scratchpad/p4-ux/09-after-build.png` | P1 | Bulle sur deux ou trois lignes sans ellipse ; bouton sous le texte quand il ne tient pas à côté. |
| 10.5 | Après la première livraison : « **Briqueterie : bâtissez cet atelier.** », sans bouton, alors que la briqueterie demande 10 argile, qu'on ne produit pas. Le guide mène à un atelier bloqué. Capture : `/tmp/claude-0/-home-user-naoned/7091555e-9be4-5e80-9143-48409e2cdd8e/scratchpad/p4-ux/20-livraison-arrivee.png` | **P1** | Deuxième étape guidée : la carrière d'argile (ou la scierie, qui transforme le bois qu'on a). Toujours un bouton qui mène à la case. |
| 10.6 | Le guide **dit « vous », le panneau dit « tu »** (« Tes ateliers », « Touche une case libre de ton domaine »), la fiche dit « À toi ». | P2 | Choisir le tutoiement (ton du jeu mobile) et l'appliquer partout. |
| 10.7 | L'intro 1/3 voile tout l'écran (la carte et le HUD en grisé). Le point 2/3 parle de la caisse sans la mettre en lumière. | P3 | Projecteur sur l'objet dont parle chaque page. |
| 10.8 | Le bouton CTA de la bulle porte un **reflet animé permanent** (dégradé qui balaie), visible en capture comme un bouton à moitié blanc. Contraire à « rien ne bouge sans raison », et il ne s'éteint pas en « moins d'animations » d'après la capture 320. | P3 | Une pulsation lente, seulement à la première apparition, coupée en `prefers-reduced-motion`. |

---

## (c) Incohérences du design system et du vocabulaire

**Couleurs (D2 : un seul accent).** Le jeu porte aujourd'hui cinq teintes qui disent « action » ou « choisi » :
- le rouge de Venise (boutons, routes) ;
- le **moutarde** (« Récolter », hérité de Jour) ;
- le **violet** (anneaux du carnet, coche des commandes, barre de progression de Lorenzo, sélection `--info`) ;
- l'**or** (lion de l'accueil, contour des cartes de commande) ;
- les losanges violets du Marché.

Le violet a été gardé pour les daltoniens (L3), mais il devient une seconde couleur d'interface. Recommandation : la sélection à l'**encre** (contour noir épais et coche), ce qui se distingue par la forme et non par la teinte ; le violet retiré.

**Surfaces.** Trois familles cohabitent :
- la fiche d'encre noire (Porcellana ludique) ;
- les feuilles blanches à croix ronde (catalogue, Marché, Compagnie) ;
- l'**ancien dock** à tuiles-icônes cerclées de violet (Venise, Trévise).

Une même action (ouvrir une ville) donne tantôt une fiche, tantôt le vieux dock. Note : plan-porcellana § 1 prévoit une fiche « carte de papier `#FBFAF7` », design.md § ludique une « carte d'encre ». Le jeu suit la seconde, et c'est très bien, mais le plan n'est pas à jour.

**Typographie.** Nunito et Manrope partout : c'est cohérent. Restent les classes `text-cream`, `bg-night-3` (Lagune) dans le DOM, signe que les feuilles n'ont pas été reprises et seulement repeintes.

**Vocabulaire (à trancher en un glossaire).**

| Notion | Mots rencontrés | Proposition |
|---|---|---|
| Ton QG et son niveau | Fondaco, Casa, Maison, Domaine, « Le Fondaco » repère, « Fondaco niv. 4 », « Monter la Casa d'un palier », « Domaine · Casa 1 » | **Fondaco** et **niveau** (Casa disparaît de l'écran) |
| Stock de marchandises | Remise (pied d'écran), stock, réserve | **Entrepôt** (du Fondaco) |
| Garage des véhicules | Remise, le quai, Convoi | **Remise** (au quai) |
| Marché | San Marco, Marché, Dogana, négoce, Venise | **Marché de San Marco** |
| Prendre la production | Ramasser, Récolter, Encaisser, Ramasser et relancer, Relancer | **Récolter** (+ relance auto) |
| Lieux fermés | Hors de ta zone, Niv. 4, Parcelle fermée, cadenas | **Fermé · Fondaco niv. N** |
| Adresse | vous / tu | **tu** |
| Monnaie de récompense | Faveur, Sceaux, perles, Puissance | les objets dessinés, nommés une fois dans l'aide |

**Composants.** Badges : « 1 » rouge (lot prêt), « ! » rouge (Compagnie), « ×1 » (liste), « 1 » du médaillon : quatre formes pour « quelque chose t'attend » et une qui n'en est pas une.

---

## (d) Accessibilité

1. **Cibles tactiles trop petites** : les repères de la carte font **28×28 px** (« + », villes, Fondaco, cases libres), les cadenas « Niv. N » 66×28, la croix de la fiche 30×30. Mesuré à 320×568 et 390×844 ; la norme WCAG 2.5.5 et les guides iOS et Android demandent 44 px. Recommandation : zone de toucher de 44 px autour de chaque repère (pseudo-élément), visuel inchangé.
2. **Texte gris clair sur papier** : les sous-titres de fiche (« Vénétie · bourg », « À toi · un atelier… ») en gris sur l'encre noire, et « au cours » en gris sur blanc dans le Marché, sont à la limite de 4,5:1. À vérifier au contrastomètre et à foncer.
3. **Mode sombre ignoré** : avec `prefers-color-scheme: dark`, l'écran reste porcelaine. C'est un choix défendable, mais la palette porcelaine et son blanc éblouissent le soir sur téléphone. Prévoir une « Porcellana de nuit » (porcelaine bleutée), ou au moins réduire la luminance des surfaces blanches. Capture : `/tmp/claude-0/-home-user-naoned/7091555e-9be4-5e80-9143-48409e2cdd8e/scratchpad/p4-ux/45-320-dark.png`
4. **Moins d'animations** : la carte se pose sans arrivée (bien). Le reflet animé du bouton de Lorenzo et les rubans qui défilent sont à couper aussi.
5. **Le nom des villes n'existe qu'en `aria-label`** : un lecteur d'écran les lit, un voyant ne les voit pas (on inverse l'accessibilité).
6. **Navigation au clavier** : Échap ferme les feuilles mais pas l'intérieur ; l'ordre de tabulation passe d'abord par les quinze repères de la carte (y compris des repères invisibles, à opacité 0), avant la barre du haut. Mettre la barre en premier et retirer les repères masqués de l'ordre de tabulation (`tabIndex=-1` quand `data-out=false`).
7. **Les états ne reposent que sur la couleur** : rouge pour « commande couverte », violet ou vert pour la progression. Ajouter une forme (coche, caisse pleine).
8. **Les compteurs ont des `aria-label`** (« Ducats : 650 »). C'est bien, à généraliser aux badges « ! ».

---

## (e) Bugs visuels

| # | Bug | Capture |
|---|---|---|
| E1 | `{cash}` non remplacé dans le titre du guide 2/3 (`Guide.tsx:266`). | `/tmp/claude-0/-home-user-naoned/7091555e-9be4-5e80-9143-48409e2cdd8e/scratchpad/p4-ux/05-guide-2.png` |
| E2 | Bulle de Lorenzo tronquée et bouton vidé de son libellé (pilule rouge vide). | `/tmp/claude-0/-home-user-naoned/7091555e-9be4-5e80-9143-48409e2cdd8e/scratchpad/p4-ux/09-after-build.png` |
| E3 | Repères San Marco et Trévise empilés et coupés sous la barre du haut (y = −10). | `/tmp/claude-0/-home-user-naoned/7091555e-9be4-5e80-9143-48409e2cdd8e/scratchpad/p4-ux/22-porta-tab.png` (haut droite) |
| E4 | Puce de trajet « 0:40 » à demi cachée sous le logo, au coin du panneau de gauche. | `/tmp/claude-0/-home-user-naoned/7091555e-9be4-5e80-9143-48409e2cdd8e/scratchpad/p4-ux/18-livrer-dock.png` |
| E5 | Bâtiments fantômes visibles à travers le bas du panneau de gauche. | `/tmp/claude-0/-home-user-naoned/7091555e-9be4-5e80-9143-48409e2cdd8e/scratchpad/p4-ux/30-atelier.png` |
| E6 | Bande dégradée horizontale (y ≈ 100–165) qui coupe le panneau et la carte pendant l'arrivée. | `/tmp/claude-0/-home-user-naoned/7091555e-9be4-5e80-9143-48409e2cdd8e/scratchpad/p4-ux/06-after-guide.png` |
| E7 | Main de tutoriel figée sur l'onglet Carte ou Fondaco, quel que soit le message. | `/tmp/claude-0/-home-user-naoned/7091555e-9be4-5e80-9143-48409e2cdd8e/scratchpad/p4-ux/27-marche.png` |
| E8 | L'onglet Fondaco s'allume mais l'intérieur d'atelier reste par-dessus. | `/tmp/claude-0/-home-user-naoned/7091555e-9be4-5e80-9143-48409e2cdd8e/scratchpad/p4-ux/33-fondaco-tab.png` |
| E9 | Le cadenas « Niv. 4 » de Trévise flotte au-dessus de la flèche du campanile, coupé par la barre. | `/tmp/claude-0/-home-user-naoned/7091555e-9be4-5e80-9143-48409e2cdd8e/scratchpad/p4-ux/24-profil.png` |
| E10 | Reflet animé du CTA capturé à mi-course : bouton blanc et rouge, illisible. | `/tmp/claude-0/-home-user-naoned/7091555e-9be4-5e80-9143-48409e2cdd8e/scratchpad/p4-ux/24-profil.png` |
| E11 | Nom de marchand avec tirets bas dans le HUD mobile. | `/tmp/claude-0/-home-user-naoned/7091555e-9be4-5e80-9143-48409e2cdd8e/scratchpad/p4-ux/m1.txt` (texte) |
| E12 | « +96 » après une commande annoncée à 100 d, sans explication. | `/tmp/claude-0/-home-user-naoned/7091555e-9be4-5e80-9143-48409e2cdd8e/scratchpad/p4-ux/tour3.txt` (texte) |

Aucune erreur JavaScript ni réponse HTTP en erreur pendant le jeu, hormis les 401 attendus sur `/api/me` avant la connexion.

---

## (f) Top 15 des améliorations, par impact et effort

| Rang | Amélioration | Impact | Effort |
|---|---|---|---|
| 1 | Corriger `{cash}` et ajouter un test « aucune accolade dans le rendu » | Fort (2ᵉ écran du jeu) | Très faible |
| 2 | Réécrire l'accueil et l'écran de fondation selon la v3 (persistant, 0 atelier et 650 d, perles = temps) | Fort (confiance, juridique) | Très faible |
| 3 | Noms des villes et du Marché toujours affichés sur la carte, et repères écartés et gardés hors de la barre | Très fort (lisibilité du commerce) | Faible |
| 4 | La main de Lorenzo suit la cible de l'étape ; 2ᵉ étape « carrière d'argile » avec un bouton ; bulle sans troncature ; tutoiement partout | Fort (rétention J0) | Faible |
| 5 | Glossaire tranché et appliqué (Fondaco/niveau, Entrepôt, Remise = véhicules, Marché de San Marco, Récolter) | Fort | Faible |
| 6 | Un seul accent : Récolter en rouge, sélection à l'encre, violet et moutarde retirés, palettes d'avant retirées du profil | Moyen à fort (identité Porcellana) | Faible |
| 7 | Navigation : un onglet ferme toute scène plein écran ; Échap et retour ferment l'intérieur ; Porta verrouillée qui explique et montre son lieu | Fort | Faible à moyen |
| 8 | Zones tactiles de 44 px autour de chaque repère ; repères masqués retirés de la tabulation | Fort (mobile) | Faible |
| 9 | Récompense de livraison : pièces vers la bourse, compteur qui roule, détail du montant ; premier trajet cadré en entier | Fort (boucle de jeu) | Moyen |
| 10 | Routes permanentes atelier → Fondaco → villes (rubans fixes, chevrons seulement en trajet) | Fort (la carte redevient une carte) | Moyen |
| 11 | « Livrer » de Lorenzo ouvre le dock de la ville ; supprimer « 1 commande sur 3 » ; heure en compte à rebours | Moyen | Faible |
| 12 | Panneau de gauche à la hauteur de son contenu, opaque et repliable | Moyen | Faible |
| 13 | Le Marché en scène sur la place San Marco (caisses par marchandise, Vendre en rouge) à la place du tableau | Très fort (règle 8, D8) | Fort |
| 14 | Intérieur : postes explicites (modèles distincts), gain affiché seulement après un geste, losanges expliqués, usure montrée sur le poste | Fort (profondeur lisible) | Moyen à fort |
| 15 | Catalogue « Bâtir ici » en tiroir visuel avec fantôme sur la case et voisinage montré ; chiffres « par lot / par heure » unifiés | Moyen à fort | Moyen |

À faire juste après : un « Porcellana de nuit » pour le soir sur téléphone ; le carnet réduit à 3–5 objectifs à crans ; une fiche du Fondaco montrant l'avant et l'après du niveau suivant.

---

*Captures et notes brutes de l'essai : `/tmp/claude-0/-home-user-naoned/7091555e-9be4-5e80-9143-48409e2cdd8e/scratchpad/p4-ux/` (images `01-…` à `52-…`, textes `tour*.txt`, `m*.txt`). Aucun fichier du dépôt modifié hors ce rapport.*
