# Identité visuelle

Le jeu s'appelle **Fondaco**, du nom des entrepôts où les marchands étrangers logeaient et commerçaient à Venise. Ambiance : Venise au Quattrocento, des ducats, la lagune. L'identité suit le guide « Fondaco — identité & palettes ».

## Logo : le lion ailé

Emblème : le lion ailé de saint Marc, dressé, ailes levées, qui tient un ducat frappé d'une galère. Style d'icône d'application : aplats, contour brun nuit épais, crème pour le lion et les ailes (trois rangées de plumes), crinière brune, ducat or au halo doré, mer vert d'eau sous la galère. Pas de nom dans le logo. Grille 120.

- **Source** : `apps/web/scripts/emblem.mjs` dessine l'emblème et écrit `public/icons/icon.svg`, `public/favicon.svg` et `src/art/emblemArt.tsx` (le même dessin pour React, couleurs en paramètre). Après un changement : `node apps/web/scripts/emblem.mjs`, puis les icônes, puis `pnpm format`.
- **Icône d'application** : le lion sur une tuile de noyer en dégradé (lueur chaude au centre).
  - Rendue nette à chaque taille depuis `public/icons/icon.svg` par `apps/web/scripts/icons.mjs`. À relancer après tout changement de la source : `npx -y -p playwright-core node apps/web/scripts/icons.mjs`.
  - iPhone : `apple-touch-icon` 180 et 1024 px, carré plein sans transparence (iOS arrondit lui-même).
  - Android : 192 et 512 px arrondis, plus une version masquable dont l'emblème tient dans la zone sûre de 80 %.
  - `favicon.svg`, en tuile arrondie.
- **Composants** (`apps/web/src/art/logo.tsx`) :
  - `Emblem` : l'emblème en couleur sur sa tuile arrondie. Écran de connexion, introduction, chargement, cérémonie de fin de saison, en-tête du Comptoir sur mobile.
  - `Logotype` : l'emblème et « Fondaco » côte à côte, dans la barre latérale sur PC.
  - `Sign` : le lion en une seule couleur (un sceau, découpé par un masque), pour les petites tailles et les fonds colorés : sceau du Pass dans les classements, Pass Négociant sur fond or.
- **Ducat** : pièce or frappée du lion ailé (`Coin`), comme le ducat de Venise.

## Palettes

Quatre palettes, mêmes rôles aux mêmes endroits, au choix du joueur dans le Profil (mémorisé sur l'appareil), plus « Or de Venise » réservée au Pass. Les couleurs sont des variables CSS (`index.css`, `[data-palette]`) lues par Tailwind (`tailwind.config.js`). « Noyer & Ducat » est la palette par défaut depuis octobre 2026 : l'intérieur du fondaco à la lueur des lampes, plus chaleureux que la lagune. Un appareil qui gardait « Lagune » sans l'avoir choisie passe à Noyer ; un choix fait dans le Profil est conservé.

| Rôle | Noyer & Ducat (défaut) | Lagune & Ducat | Pourpre du Doge | Parchemin & Lapis (clair) | Usage |
| --- | --- | --- | --- | --- | --- |
| Fond (`night`) | `#1E1611` | `#0F1B1E` | `#1C1016` | `#F3E9D4` | Application, panneaux (`night-2/3/4`) |
| Or (`gold`) | `#E8B24C` | `#E0AD4B` | `#DDB054` | `#C9952F` | Argent et action principale uniquement |
| Lagune (`lagoon`) | `#7DB596` | `#6DB3A2` | `#6FB5AA` | `#2D5486` | Gains, production, routes sûres |
| Cinabre (`vermilion`) | `#E36A4A` | `#E2694F` | `#F07A5C` | `#B2412D` | Corsaires, pertes, alertes |
| Texte (`cream`) | `#F6E8CC` | `#F1E4C6` | `#F4E6D0` | `#2B2016` | Texte |
| Encre (`ink`) | fond | fond | fond | texte | Texte posé sur l'or ou la lagune |

Les deux halos du fond suivent la palette (`--glow-a`, `--glow-b`) : ambre et braise pour Noyer, vert d'eau et or pour les autres.

Les illustrations (ressources, bâtiments, blasons) et les scènes 3D gardent leurs propres couleurs dans toutes les palettes, réglées sur la palette par défaut (`art/palette.ts`).

## Typographie (embarquée, sans appel à Google)

- **Archivo Expanded** (Archivo variable, largeur 125 %) : titres et chiffres.
- **Space Grotesk** : texte courant et boutons.
- **Space Mono** : petits libellés et navigation (`.label`).

## Composants (`apps/web/src/ui.tsx`)

Formes inspirées des jeux de cartes mobiles : des biseaux plutôt que des arrondis.
- `Slab` : bouton en parallélogramme (`.bevel`) posé sur une ombre pleine décalée de sa teinte sombre. À l'appui, la face s'enfonce sur son ombre, avec un tick haptique. Or pour l'action qui compte.
- `Panel` : carte à coins coupés (`.cut`), haut gauche et bas droit, avec un liseré. Une lueur intérieure s'ajoute quand elle doit attirer l'œil. Les tuiles et cartes de commande suivent la même coupe.
- `Badge`, puces du stock, pastilles de tri : petits biseaux (`.slab`).
- `Tabs` :
  - `pills` : choix d'une valeur, par exemple le tri ;
  - `underline` : parties d'un écran (Livraisons et Brigands, Joueurs et Villes, Port). Capitales sur un double trait crème et lagune qui glisse d'un onglet à l'autre.
- `CountUp` : un nombre qui court vers sa nouvelle valeur en 400 ms, comme la bourse de l'en-tête.
- `Stat` : tuile chiffrée (Traversée, Pirates en cinabre, Plus-value en lagune).
- `Switch` : interrupteur (escorte, navires, notifications), à la place des cases à cocher.
- `Sheet` : feuille du bas sur mobile, fenêtre centrée sur PC, fermeture par ×.
- `Ribbon` : barre de progression rayée ; `Big` : grands chiffres.

## Mouvement

- Un écran glisse depuis le côté de l'onglet d'où l'on vient. Ses blocs montent l'un après l'autre, à 45 ms d'écart.
- Une lueur d'ambiance suit la section, en fondu : or au Comptoir et au Marché, lagune aux Routes et au Port, vermillon à la Guilde. Une voile et une caisse floues dérivent lentement dans le fond.
- La section active, au pied de l'écran, porte un fanion en coin et, quand elle a un tiroir, un chevron qui dit qu'il se tire. Les libellés sont en capitales mono.
- Tout s'arrête pour qui demande moins de mouvement (`prefers-reduced-motion`).

## Gestes (`game/gestures.ts`)

- **Faucille** : un doigt posé sur un atelier prêt et glissé sur le Domaine récolte chaque atelier prêt qu'il touche.
  - Chaque récolte : rebond de l'atelier, « +N » qui s'envole, tick haptique.
  - Une traînée dorée suit le doigt, et les récoltes partent l'une après l'autre.
  - La page défile normalement si le geste part d'ailleurs. Fonctionne aussi à la souris.
- **Feuilles** : tirées vers le bas depuis le haut de leur défilement, elles suivent le doigt (avec résistance). Au-delà d'un tiers de leur hauteur ou d'un geste vif, elles se ferment ; sinon elles reviennent.
- **Tiroir** : un glissé horizontal sur son contenu passe à l'onglet suivant ou précédent. Il ne joue pas depuis une carte (`data-no-swipe`) ou un champ de saisie.

## Disposition : le cadre commun (`game/stage.tsx`)

Né sur l'onglet Famille et appliqué à tous les onglets du jeu : une section tient sur un écran, sans défilement de la page.

| Pièce | Rôle | Composants |
| --- | --- | --- |
| **Scène** | La carte ou le tableau de l'onglet, d'un bord à l'autre entre la barre du jeu et la navigation ; la hauteur est mesurée et se recale quand un bandeau (gazette, acte) s'intercale | `Stage`, `useStageHeight` |
| **Bandeau du haut** | L'état du moment : une barre translucide de chiffres touchables (le sien cerclé d'or), le « ? » de l'aide ; dessous, des puces : horloges, alertes | `Hud`, `HudBar`, `HudStat`, `HelpButton`, `Chips`, `Chip` |
| **Barre du bas** | Les deux ou trois gestes principaux, une invitation au-dessus | `Tray`, `TrayStat`, `TrayButton` |
| **Tiroir** | Tout le reste, en onglets. Replié, il porte la navigation du jeu : sa poignée au-dessus des six sections, seule rangée du pied de l'écran. Toucher une autre section y mène ; toucher la section active, la poignée, ou tirer vers le haut l'ouvre sur deux tiers de l'écran, ses onglets en tête ; la poignée, un glissé vers le bas ou le bouton retour le replient. Point vermillon sur la poignée quand un de ses onglets attend | `Drawer`, `useDrawer`, `SectionBar`, `SectionNav` |
| **Feuilles** | Le détail d'un élément touché (atelier, ville, port, marchandise, terre) | `Sheet` |
| **Pastilles** | Un choix parmi quelques-uns dans le tiroir ou une feuille (tri, mode, durée) | `Segmented` |

Codes de couleur des puces : vert d'eau à soi ou en cours, or argent ou récompense, vermillon danger. Sur grand écran (≥ 1024 px), le tiroir devient une colonne de 400 px à côté de la scène, toujours ouverte, ses onglets toujours visibles ; la barre latérale porte la navigation (raccourcis 1 à 6) et la carte du joueur. Un écran sans tiroir (Profil, Port avant son ouverture) garde la rangée des sections seule, en barre fixe.

| Onglet | Scène | Haut | Bas | Tiroir |
| --- | --- | --- | --- | --- |
| **Comptoir** | Le domaine 3D | Maison et rang, ateliers, stock, prochain lot, ouvriers affamés, convoi attaqué | Récolter n, Charger n, Bâtir, Carnet | Ateliers · Stock · Saison |
| **Routes** | La carte 3D du Veneto | Commandes à livrer, en route, véhicules libres, renouvellement, routes guettées | Barre du véhicule choisi, ou véhicules libres et commandes | Commandes (tri) · En route · Garage · Brigands |
| **Marché** | Le tableau des cours du Rialto, qui défile sous le bandeau | Marchandises, mes offres, stock, taxe, décrets | La marchandise en hausse et « Négocier » | (Négoce sur grand écran) · Offres · Villes · Décrets |
| **Famille** | La carte de la Campagne | Gloire des quatre familles, fin de semaine, trêve, Milan | Réserve, Lever, Engager, ouvrages | Campagne · Décrets · Famille · Fil |
| **Port** | La carte de la mer, ses vagues jusqu'aux bords ; un port touché ouvre sa fiche | Galères en mer, navires prêts, chaque convoi et son retour | Décharger ou galères libres, Envoyer un convoi | Convois · Ports · Flotte · Corsaires |
| **Classement** | Le podium de la période puis tout le classement | Semaine et saison (au choix) avec leur clôture | « Ton rang » épinglé | Semaine passée · Règles |

Le guide de Lorenzo vise des éléments de la scène (ateliers, véhicule) ou des onglets du tiroir (Commandes des Routes, Villes du Marché).

## Illustrations

Tout est en SVG maison, dans `apps/web/src/art` : ressources, bâtiments (le moulin et la scierie tournent pendant la production), panorama de Venise, carte marine, scènes des régions, blasons (3 formes × 6 émaux × 8 meubles), Lorenzo le facteur qui guide le joueur, médailles des trophées. Pas d'image externe.

## Guide du joueur

1. **Introduction** : 4 écrans illustrés avant le choix de la région (rejouable depuis le profil ou l'aide).
2. **Lorenzo** : guide interactif qui assombrit l'écran, entoure en or l'élément à toucher et explique pourquoi. Il lit l'état réel du jeu, donc il suit le joueur même s'il fait les choses dans un autre ordre. Un élément ciblé porte un attribut `data-coach` (sur PC, la cible visible est choisie entre la barre latérale et la barre du bas).
3. **Comment jouer** : aide permanente (icône « ? » en haut).

## Saison, présence et Pass

- **Cérémonie de clôture** (`Ceremony`) : à la première visite après la fin du mois, rang final révélé, podium, récompenses (titre, Pass, Renommée), puis choix de la région pour le nouveau mois.
- **Palmarès** (`Palmares`) : Renommée et titre, saisons terminées, statistiques et frise des dernières semaines ; sur le profil et en touchant un nom du classement.
- **Dernier sprint** : bandeau doré les trois derniers jours ; l'hommage au Doge de la saison passée s'affiche au Marché.
- **Gazette** (`Gazette`) : une ligne repliée (« En ce moment » ou « Bientôt », titre, compte à rebours) qui se déplie au toucher, seulement sur Comptoir, Routes et Marché, jamais pendant les premiers pas guidés par Lorenzo ; fermeture par ×. Le premier jour d'un acte, elle annonce l'acte (« Acte III », titre, récit) avant l'événement du jour ; sans événement, elle rappelle l'acte en cours.
- **Commandes de la route** (`Routes`, `roadKit.tsx`) : chaque commande montre son prix unitaire, l'écart avec le Rialto, les ducats par heure de route et un badge « Livrable » ; tri par gain à l'heure par défaut. La vue Liste est celle du tutoriel.
- **Domaine 3D** (`domain3d/`, three.js chargé à la demande dans un morceau séparé) : en tête du Comptoir, la Maison en vraie 3D temps réel.
  - **Caméra** orthographique à l'angle isométrique. Le cadre suit ce qui est bâti et glisse en douceur quand le Domaine grandit.
  - **Scène**, l'écran du Comptoir : bord à bord sur téléphone, environ 68 % de la hauteur (420 px au moins), 62 % sur ordinateur. L'en-tête de la Maison se pose sur la scène, sur un dégradé sombre. Le cadre se refait à chaque taille ; sur un écran plus haut que large, les marges du terrain débordent sur les côtés pour que les ateliers restent grands.
  - **Bande de stock** (`StockBand`) posée au pied de la scène, sur un dégradé : chaque bien détenu, icône et quantité ; une quantité qui change bat en doré. Un toucher ouvre l'entrepôt. On bâtit depuis la parcelle « + À bâtir » (plus de rangée de construction sous la scène).
- **Routes en 3D** (`routes3d/`, `Veneto3D` chargé à la demande, `VenetoWorld`) : la carte de la Vénétie au même format que le Domaine (bord à bord, deux tiers de l'écran). Caméra orthographique tournée vers le nord, du sud et d'en haut. Les Alpes, les collines, les bois, le lac de Garde, les fleuves, la lagune, le Lido et l'Adriatique viennent des tracés de `art/veneto.tsx`. Les sept villes sont des maquettes (remparts, campanile ; l'Arène de Vérone, le château d'Este de Ferrare, les coupoles du Santo, Saint-Marc sur l'eau). Les routes du marchand sont pavées (en or quand le véhicule choisi peut servir la ville, en rouge quand des brigands guettent), les convois y roulent sur l'heure du jeu et les camps se dressent au bord. Par-dessus : le nombre de commandes ouvertes (or quand le Doge en fait partie), le nom de la ville et son temps de route, l'urgence, l'horloge de chaque convoi, le « +N » payé ; la bande de stock au pied. La carte dessinée reste le repli, et sert toujours au mode brigands.
  - **Lumière** : soleil chaud avec ombres douces, lumière du ciel, rendu ACES. Au soir, lumière orangée ; la nuit bleutée, avec fenêtres, lanternes de la porte et lampadaires allumés.
  - **Matières** (`materials.ts`) : textures dessinées à la volée (herbe, enduit, planches, briques, tuiles, pavés) et ombres de contact sous chaque objet.
  - **Modèles** (`models.ts`, `actors.ts`) : volumes arrondis.
    - Ateliers avec fenêtres, colombages et accessoires : blé, ailes, four, cheminées, lame, loggia du palais.
    - Les niveaux dans le bâtiment : bannière, socle et étage, tour d'angle, toits dorés.
    - Charrettes, chariots et mules aux roues et pattes animées, ouvriers aux bras et jambes qui balancent.
    - Entrepôt dont les piles suivent le stock, porte, puits, tonneaux, lampadaires, buissons, fleurs, rochers.
  - **Moments forts** : un bâtiment neuf ou amélioré sort du sol avec un rebond, dans une gerbe d'étincelles dorées. Une récolte envoie des caisses en arc jusqu'à l'entrepôt. Fumées douces des cheminées et de la carrière.
  - **Interface par-dessus** (`Domain3D.tsx`) : bulles, plaques, « +N », bulles de pain et ⚔ suivent chaque objet à l'écran. Ce sont des boutons (avec `data-plot`, `data-coach`), donc le guide et le clavier fonctionnent. Un toucher sur la scène, ou la faucille, prend l'objet visé par lancer de rayon.
  - **Repli** : sans WebGL, ou avec la préférence `domain2d`, la scène dessinée ci-dessous. La préférence `domainPhase` (`day`, `dusk`, `night`) force l'heure pour les captures.
- **Fluidité des scènes 3D** (Domaine, Routes, Campagne ; `game/sceneLoop.ts`, `game/pacing.ts`) :
  - **Cadence** : chaque image tant que le joueur bouge la vue (glisser, élan, zoom) ou qu'un moment fort se joue ; 30 images par seconde quand seuls drapeaux, convois et ouvriers vivent ; une par seconde quand rien ne bouge (mouvements réduits), et tout de suite quand le jeu change quelque chose. Rien hors de l'écran ni dans un onglet caché.
  - **Netteté** : densité de pixels de l'écran, 2 au plus, dans un budget d'environ 2,6 millions de pixels (1,44 sur un écran de 1400 × 900) ; elle baisse par paliers de 20 % (0,75 au plus bas) quand les images arrivent en retard, et remonte quand tout va bien.
  - **Décor fusionné** (`domain3d/merge.ts`) : ce qui ne bouge pas (terre, villes, ateliers, entrepôt) est dessiné en un maillage par matière, par zones de 8 unités sur les grandes cartes ; drapeaux, ailes, fenêtres allumées et feux restent à part. Environ 370 ordres de dessin au lieu de 1 035 pour les Routes.
  - **Brouillard** recréé seulement quand l'heure change (un nouveau brouillard fait revérifier les shaders de chaque matière).
  - **Repères** par-dessus la scène : réécrits seulement quand ils bougent, masqués hors du cadre.
- **Carte de la Campagne, navigation** : la molette ou le pavé tactile zoome en douceur vers le curseur (la page ne défile pas dessous) ; deux doigts zooment autour de leur milieu et déplacent la carte ; lâchée en mouvement, la carte glisse et ralentit ; un glisser peut partir d'un badge de terre. Les ombres se calent sur la grille de leur carte et ne scintillent plus pendant le déplacement.
- **Domaine dessiné** (`Domain`, `art/domain.tsx`, repli) : la Maison en volume, vue de dessus en isométrique, sur la terre de sa région.
  - **Dessin** (`art/iso.tsx`, `art/isoBuildings.tsx`) : projection 2:1, boîtes à trois faces (dessus éclairé, face gauche, face droite plus sombre), toits à deux pans, pyramides, arbres en cônes.
  - **Décor** : sol de la région (champs, prés de la Lagune bordés d'un canal, prés des Dolomites sous les pics), chemins de dalles entre les parcelles. Crépuscule et nuit teintent la scène, les fenêtres s'allument.
  - **Cadrage** : la vue cadre ce qui est bâti, les deux prochaines parcelles et la cour. Elle commence près et s'élargit à mesure que le Domaine grandit.
  - **Ateliers** : douze parcelles de 2 × 2 cases, remplies depuis la cour vers le fond ; le palais à la place d'honneur, derrière. Chaque atelier a son volume et son accessoire animé quand il produit : ailes du moulin, fumée du four et de la briqueterie, lame de la scierie, blé ondulant.
  - **Niveaux** : II bannière, III socle de pierre et un étage, IV tour d'angle et fanion, V toits dorés et un étage de plus. Plaque en chiffres romains au pied ; petite flèche dorée quand une amélioration est abordable.
  - **Bâtir** : seules les deux prochaines parcelles libres sont en pointillé, avec « À bâtir ».
  - **Cour** : bande pavée devant les parcelles, avec l'entrepôt (hangar et piles selon le stock), les véhicules au dépôt et la porte vers la route. Le blason flotte sur le mât, au coin.
  - **Entrepôt** : le toucher ouvre le stock, avec « Vendre au marché » et « Livrer ».
  - **Véhicules** : au dépôt, une bulle ▶ dit qu'une commande couverte par le stock les attend.
    - Le toucher ouvre « Charger » : les trois commandes ouvertes les mieux payées que ce véhicule peut prendre avec le stock, puis le départ (escorte, « Charger et partir »).
    - Une livraison en cours se voit sur la route au-delà de la porte, chargée à l'aller, vide au retour, à sa place selon le trajet.
    - Une embuscade met une bulle ⚔ sur la charrette et sur la porte.
  - **Ouvriers** : un par niveau d'atelier, huit au plus. Ils vont et viennent entre leur atelier et l'entrepôt quand il produit, et attendent devant sa porte sinon.
    - Bulle crème du pain quand la réserve passe sous un jour, vermillon quand ils ont faim ; affamés, ils marchent plus lentement.
    - Le toucher ouvre leurs rations, avec « Cuire du pain » et « Acheter au marché ».
  - **Bandeau** : sa deuxième ligne compte les commandes couvertes par le stock et les véhicules libres. Le toucher ouvre « Charger » sur le véhicule qui a la meilleure.
  - Sur téléphone, le stock et les rations ne s'affichent plus sous le Domaine (l'entrepôt et les ouvriers les ouvrent). Sur ordinateur, ils restent dans la colonne de droite.
  - **Bulles d'état** au-dessus du toit, de même taille du premier plan au fond :
    - sac doré « +N » et icône de la marchandise : récolte prête ;
    - anneau lagune et temps restant : lot en cours ;
    - ▶ lagune qui respire : à l'arrêt, peut produire ;
    - pastille crème cerclée de rouge, avec la matière qui manque : à l'arrêt, faute d'intrant.
  - **Gestes** : toucher un atelier prêt récolte tout de suite ; la marchandise s'envole de la parcelle, puis la feuille de l'atelier s'ouvre si le travail est fini et peut reprendre. Tout autre atelier ouvre sa feuille ; une parcelle libre ouvre « Bâtir ici ». Une gerbe dorée salue une construction ou un niveau. Toute la parcelle répond au toucher, pas seulement le dessin.
  - **Feuille d'atelier** (une seule, clés `produce:<id>` et `upgrade:<id>`) : état en clair, récolte, production avec trois raccourcis (« 1 lot », « Jusqu'à ce soir » jusqu'à 21 h ou « Pour la nuit » jusqu'à 8 h, « Le plus possible »), la matière qui manque avec « Au marché » et l'atelier qui la produit, puis l'amélioration, repliée quand elle n'est pas abordable.
  - **Bandeau** sous la scène : « Tout récolter et relancer », sinon « Tout relancer » ou le prochain lot. Il remplace l'ancien grand compteur du Comptoir.
  - **Liste « Mes ateliers »** sous la scène : ouverte pendant les premiers pas guidés, repliée ensuite. Lorenzo désigne les ateliers sur la scène.
- **Maîtrise** (`Mastery`, `art/mastery.tsx`) :
  - **Comptoir** : une tuile de progression vers le palier (niveaux d'ateliers), puis l'appel à choisir.
  - **Choix** : feuille ouverte d'elle-même la première fois, avec quatre cartes (emblème, devise, effets lus dans les réglages) et une confirmation « pour toute la saison ».
  - **Emblèmes** : marteau et enclume, roue, balance, ancre, sous le blason du Domaine et dans le classement.
- **Frise de la saison** (`Acts`) : sous l'en-tête, le jour et l'acte en cours (chiffre romain et titre), une barre par acte (passés en lagune, en cours en or).
  - Un toucher ouvre la carte de l'acte, qui s'ouvre aussi d'elle-même à la première visite de chaque acte, après les premiers pas.
  - À l'acte III, le panneau de l'Arsenal (avancement, livrer, course des guildes) est dans l'onglet Guilde.
- **Tableau commun** (`Routes`) : une ligne rappelle que les commandes des villes sont communes ; celles que d'autres ont prises sont repliées sous « déjà prises », avec le nom du preneur. Badge « Disputée · N » (les autres marchands actifs qui peuvent la prendre) : rouge sur une commande livrable tout de suite, discret sinon. Les nouvelles des routes publient les trois plus grosses prises du jour (« Bob a raflé 30 briques pour Venise »).
- **Monument** (`RoadBoard`) : un obélisque blanc et or à côté de la ville d'un chantier d'acte gagné ; la feuille de la ville nomme la famille victorieuse.
- **Notification d'acte** : à l'ouverture des actes II à IV, une notification « Acte II : la peste » (cloche et push), réglable comme les autres.
- **Fil de la guilde** (`Guilde`, `Thread`) : messages des membres, les miens à droite sur fond lagune, « Signaler » sous ceux des autres, saisie en bas ; pastille sur l'onglet Guilde quand un message n'a pas été lu ou qu'un vote attend.
- **Objectif de saison** (`Comptoir`, `SeasonGoal`) : titre actuel et Renommée assurée, prochain palier et sa barre ; affiché après la première livraison.
- **Brigands** : encadré d'infamie (prises de la saison, prime sur la tête, primes reçues) sous l'aide de l'écran Brigands.
- **Criée** (`Criee`) : bandeau doré en tête de chaque écran tant qu'elle dure, avec la quantité vendable et un retour haptique « alarme » quand elle s'ouvre.
- **Tâches du jour** (`Daily`) : trois tâches, la série de jours et le coffre, dans la colonne de droite du Comptoir.
- **Produits frais** : sous un atelier prêt, « Frais : +5 % encore 23 min ».
- **Ballots de Faraj** (`Bales`) : tuile du Comptoir après les premiers pas, puis écran plein : la balle de toile flotte sur le quai, tremble et luit, le sceau de cire (marque de Faraj : croissant, mât, fanion, orbe) éclate, trois connaissements sortent face cachée. Une carte rare ou mieux luit avant d'être retournée ; cadres parchemin, lagune, lapis, pourpre et or (seul usage de l'or hors argent et action principale) ; éclat doré et reflet pour une légendaire. Probabilités et histoire de Faraj sous le ballot.
- **Pass Négociant** (`PassPanel`) : statut, avantages, comment le gagner, prix (paiement à venir). Sceau (le lion ailé) à côté du nom dans les classements ; palette « Or de Venise » réservée.
- **Retours haptiques** (`haptics.ts`) : léger au changement d'onglet, double pour une action qui rapporte, long pour une erreur, alarme pour une Criée ; réglables dans le Profil. Sur iPhone, Safari ne vibre pas : un interrupteur natif caché donne un petit clic.

## Famille et Campagne

- **Couleurs des familles** (`art/familyCrest.tsx`) : Contarini vert d'eau et tour, Morosini émeraude et épi, Mocenigo vermillon et ancre, Dandolo violet et lion, Milan encre et couronne ; jamais l'or, réservé à l'argent et au Pass. Les milices en vert-gris. Blason en bannière (`FamilyCrest`).
- **Onglet Famille** (`Famille.tsx`), carte d'abord. Sans famille : la carte en tête (46 % de l'écran, le titre en dégradé sur son pied), puis les quatre cartes (membres, levée selon la taille, Gloire, terres), la plus petite mise en avant, l'allégeance confirmée en deux temps. Avec une famille, sur téléphone, une seule page sans défilement : la carte d'un bord à l'autre entre la barre du jeu et la navigation (hauteur mesurée, `useStageHeight`).
  - **En haut** (`Scoreboard`) : un bandeau translucide, les quatre familles classées (blason, Gloire, rang ; la sienne cerclée d'or, un filet à sa couleur proportionnel à la Gloire) et « ? » pour l'aide ; dessous, des puces : fin de semaine, trêve (vert d'eau), Milan (vermillon).
  - **En bas** (`ActionBar`) : la réserve de lances, « Lever n » (vert d'eau), « Engager » (or, ouvre la feuille des lances), les ouvrages « n/max » ; au-dessus, l'invitation à glisser ses lances.
  - **Tiroir** (`Drawer`) : replié sur ses quatre onglets (Campagne, Décrets, Famille, Fil ; point vermillon pour une menace ou un message non lu), tiré vers le haut ou touché il couvre deux tiers de l'écran ; les lances ne se glissent plus tant qu'il est ouvert. Sur grand écran, une colonne de 400 px à côté de la carte.
- **Ouvrages** (`art/workIcon.tsx`) : rocca en tour crénelée, campo en tente à fanion vermillon, dogana en porte à la pièce d'or, à la couleur de la famille ; en contour pointillé tant qu'ils sont en chantier. Sur la carte, en médaillon au coin de la pastille de garnison. Dans la fiche d'une terre de sa famille : les trois ouvrages en lignes (icône, nom, rôle, effet, « Bâtir · prix ») ; sur une terre qui en porte un : l'ouvrage, son état et son bâtisseur, sur fond vermillon s'il est ennemi, avec le Mérite promis à qui le rase.
- **Carte de la Terraferme** : SVG carré, terres reliées en pointillés ; fiefs et forteresses en carrés, autres terres en ronds, à la couleur du détenteur, la garnison au centre (⚑ pour un fief), les villes du jeu nommées en or pâle. Contour or pointillé : à portée ; anneau vert d'eau : une marche de sa famille ; anneau vermillon qui bat : une marche ennemie, avec « ⚔ lances » au-dessus. Une terre touchée ouvre sa fiche (garnison, défense, Gloire, lances nécessaires, marches, attaquer ou renforcer) ; les terres à portée sont aussi listées sous la carte.
- **Bandeau des décrets** (`DecreeBanner`) : au Marché, sur les Routes et au Port ; lueur vert d'eau quand ils jouent pour le marchand, vermillon contre lui.
- **Routes 3D** : sous le nom d'une ville, le blason de la famille qui tient sa terre dans la Campagne.

## Charger et glisser

- **Barre du véhicule** (`Cargo.tsx`, `VehicleBar`) : en bas de la carte des Routes, bord vert d'eau et croix en onglet ; nom du véhicule, état (au dépôt, chargé pour…, en route), jauge de cale, boutons Charger, Envoyer, véhicule précédent ou suivant.
- **Cargaisons** (`CargoSheet`) : feuille avec onglets Récompense, Distance, Ville ; une ligne par commande (pastille à cocher, marchandise, ville et durée, récompense en or), grisée avec sa raison quand elle ne va pas (autre ville, trop lourd, stock) ; la cale en bas avec sa jauge et ses commandes cochées ; « Prêt pour Vicence · 63 d ».
- **Glisser** (`CarrierDrag`) : le véhicule chargé luit sur son dépôt (jeton cerclé de vert d'eau, cale en pastille) ; le doigt tire une ligne en pointillé, la ville visée s'entoure d'or (de vermillon si rien n'y va), une bulle dit ce qui partirait ; « ✕ Annuler » en revenant au dépôt. Le même geste sert à la Campagne : les lances (jeton cerclé d'or) partent du fief vers une terre.
- **Départ** (`DepartureBar`) : « Départ vers Padoue » et un compte à rebours de six secondes, les escortes en puces avec leur prix, Partir et Annuler.
- **Carte de la Campagne** (`campaign3d/`) : la maquette des Routes prolongée vers la Lombardie ; sol de chaque terre en aplat translucide de la couleur du détenteur (milices presque transparentes), frontières en bandes de couleur, drapeau du détenteur sur chaque terre, colonnes de petits soldats le long d'un tracé en pointillé ; garnison en pastille de la couleur du détenteur (cerclée d'or à portée, de vermillon battant si menacée), nom des villes du jeu en or pâle.
