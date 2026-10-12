# Identité visuelle

Le jeu s'appelle **Fondaco**, du nom des entrepôts où les marchands étrangers logeaient et commerçaient à Venise. Ambiance : Venise au Quattrocento, des ducats, la lagune. L'identité suit le guide « Fondaco — identité & palettes ».

## Logo : le signe de quatre

Marque de marchand du Quattrocento redessinée en géométrie simple : grille 120, trait 12, bouts arrondis, fanion plein (`apps/web/src/art/logo.tsx`, composants `Sign` et `Logotype`).

- **Icône d'application** : carré arrondi or, signe sombre (`public/icons`, `public/favicon.svg`).
- **Ducat** : pièce or frappée du signe (`Coin`).
- Le signe ouvre l'écran de connexion et l'introduction ; le logotype (signe + « Fondaco ») tient la barre latérale sur PC et l'en-tête sur mobile.

## Palettes

Trois palettes, mêmes rôles aux mêmes endroits, au choix du joueur dans le Profil (mémorisé sur l'appareil). Les couleurs sont des variables CSS (`index.css`, `[data-palette]`) lues par Tailwind (`tailwind.config.js`).

| Rôle | Lagune & Ducat (défaut) | Pourpre du Doge | Parchemin & Lapis (clair) | Usage |
| --- | --- | --- | --- | --- |
| Fond (`night`) | `#0F1B1E` | `#1C1016` | `#F3E9D4` | Application, panneaux (`night-2/3/4`) |
| Or (`gold`) | `#E0AD4B` | `#DDB054` | `#C9952F` | Argent et action principale uniquement |
| Lagune (`lagoon`) | `#6DB3A2` | `#6FB5AA` | `#2D5486` | Gains, production, routes sûres |
| Cinabre (`vermilion`) | `#E2694F` | `#F07A5C` | `#B2412D` | Corsaires, pertes, alertes |
| Texte (`cream`) | `#F1E4C6` | `#F4E6D0` | `#2B2016` | Texte |
| Encre (`ink`) | fond | fond | texte | Texte posé sur l'or ou la lagune |

Les illustrations (ressources, bâtiments, blasons) gardent leurs propres couleurs dans toutes les palettes.

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
- Une lueur d'ambiance suit la section, en fondu : or au Comptoir et au Marché, lagune aux Routes et au Port, vermillon aux Familles. Une voile et une caisse floues dérivent lentement dans le fond.
- L'onglet actif de la barre du bas porte un trait biseauté et un fanion en coin. Les libellés sont en capitales mono.
- Tout s'arrête pour qui demande moins de mouvement (`prefers-reduced-motion`).

## Gestes (`game/gestures.ts`)

- **Faucille** : un doigt posé sur un atelier prêt et glissé sur le Domaine récolte chaque atelier prêt qu'il touche.
  - Chaque récolte : rebond de l'atelier, « +N » qui s'envole, tick haptique.
  - Une traînée dorée suit le doigt, et les récoltes partent l'une après l'autre.
  - La page défile normalement si le geste part d'ailleurs. Fonctionne aussi à la souris.
- **Porter un véhicule** : un véhicule libre se prend sur la carte (plateau « Glissez vers une ville ») ou dans l'écurie.
  - Pendant le glissé, les villes qu'il peut servir s'allument ; celle survolée pulse en or, avec un tick.
  - Le lâcher sur une ville ouvre sa feuille avec la commande la mieux payée que le véhicule peut prendre, prête à partir.
  - Lâché ailleurs, il revient à sa place.
- **Feuilles** : tirées vers le bas depuis le haut de leur défilement, elles suivent le doigt (avec résistance). Au-delà d'un tiers de leur hauteur ou d'un geste vif, elles se ferment ; sinon elles reviennent.
- **Sous-onglets** : un glissé horizontal passe de la carte à la liste aux Routes, et des joueurs aux villes au Marché. Il ne joue pas depuis un véhicule ou un champ de saisie.

## Disposition

**Mobile** : en-tête (logotype, bourse, cloche, blason), ligne « Jour 1 sur 42 » avec sa barre, barre du bas Comptoir · Marché · Contrats · Port · Classement.

**PC (≥ 1024 px)** : une disposition de jeu, pas une application étirée.

- Barre latérale fixe : logotype, navigation (raccourcis clavier 1 à 5), carte du joueur (blason, titre, rang).
- Comptoir sur deux colonnes : héros et ateliers à gauche ; objectif, premiers pas, livre de comptes, vivres et entrepôt dans une colonne fixe à droite.
- Marché : liste des ressources à gauche, panneau d'achat-vente toujours ouvert à droite (pas de feuille).
- Port : carte marine fixe à gauche, ports à droite ; flotte et arsenal en grille.
- Contrats en trois colonnes ; classement et profil centrés.

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
- **Domaine** (`Domain`, `art/domain.tsx`) : en tête du Comptoir, la scène de la Maison sur la terre de sa région.
  - **Décor** : champs et moulin de la Terraferma, canaux et silhouette de Venise de la Lagune, pics et sapins des Dolomites. Ciel de jour, de crépuscule ou de nuit selon l'heure de Paris.
  - **Ateliers** : douze parcelles, remplies du premier plan (grands ateliers) vers le fond ; le palais occupe la place d'honneur.
  - **Ornements cumulés** : niveau II bannière, III socle de pierre, IV tour et fanion, V couronne dorée et halo. Plaque en chiffres romains ; petite flèche dorée au pied quand une amélioration est abordable.
  - **Bâtir** : seules les deux prochaines parcelles libres sont en pointillé, avec « À bâtir ».
  - **Cour** : véhicules au dépôt et caisses selon le stock, blason sur le mât.
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
  - À l'acte III, le panneau de l'Arsenal (avancement, livrer, course des familles) est en tête de l'onglet Familles.
- **Tableau commun** (`Routes`) : une ligne rappelle que les commandes des villes sont communes ; celles que d'autres ont prises sont repliées sous « déjà prises », avec le nom du preneur. Badge « Disputée · N » (les autres marchands actifs qui peuvent la prendre) : rouge sur une commande livrable tout de suite, discret sinon. Les nouvelles des routes publient les trois plus grosses prises du jour (« Bob a raflé 30 briques pour Venise »).
- **Monument** (`RoadBoard`) : un obélisque blanc et or à côté de la ville d'un chantier d'acte gagné ; la feuille de la ville nomme la famille victorieuse.
- **Notification d'acte** : à l'ouverture des actes II à IV, une notification « Acte II : la peste » (cloche et push), réglable comme les autres.
- **Fil de la famille** (`Familles`, `Thread`) : messages des membres, les miens à droite sur fond lagune, « Signaler » sous ceux des autres, saisie en bas ; pastille sur l'onglet Familles quand un message n'a pas été lu.
- **Objectif de saison** (`Comptoir`, `SeasonGoal`) : titre actuel et Renommée assurée, prochain palier et sa barre ; affiché après la première livraison.
- **Brigands** : encadré d'infamie (prises de la saison, prime sur la tête, primes reçues) sous l'aide de l'écran Brigands.
- **Criée** (`Criee`) : bandeau doré en tête de chaque écran tant qu'elle dure, avec la quantité vendable et un retour haptique « alarme » quand elle s'ouvre.
- **Tâches du jour** (`Daily`) : trois tâches, la série de jours et le coffre, dans la colonne de droite du Comptoir.
- **Produits frais** : sous un atelier prêt, « Frais : +5 % encore 23 min ».
- **Ballots de Faraj** (`Bales`) : tuile du Comptoir après les premiers pas, puis écran plein : la balle de toile flotte sur le quai, tremble et luit, le sceau de cire (marque de Faraj : croissant, mât, fanion, orbe, sœur du signe de quatre) éclate, trois connaissements sortent face cachée. Une carte rare ou mieux luit avant d'être retournée ; cadres parchemin, lagune, lapis, pourpre et or (seul usage de l'or hors argent et action principale) ; éclat doré et reflet pour une légendaire. Probabilités et histoire de Faraj sous le ballot.
- **Pass Négociant** (`PassPanel`) : statut, avantages, comment le gagner, prix (paiement à venir). Sceau (le signe de quatre) à côté du nom dans les classements ; palette « Or de Venise » réservée.
- **Retours haptiques** (`haptics.ts`) : léger au changement d'onglet, double pour une action qui rapporte, long pour une erreur, alarme pour une Criée ; réglables dans le Profil. Sur iPhone, Safari ne vibre pas : un interrupteur natif caché donne un petit clic.
