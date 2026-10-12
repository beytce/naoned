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

- `Slab` : bouton arrondi, or pour l'action qui compte.
- `Panel` : carte arrondie, liseré coloré quand elle doit attirer l'œil.
- `Tabs` : sélecteur segmenté (pastille claire sur l'option choisie), comme Routes / Flotte / Corsaires.
- `Stat` : tuile chiffrée (Traversée, Pirates en cinabre, Plus-value en lagune).
- `Switch` : interrupteur (escorte, navires, notifications), à la place des cases à cocher.
- `Sheet` : feuille du bas sur mobile, fenêtre centrée sur PC, fermeture par ×.
- `Ribbon` : barre de progression rayée ; `Big` : grands chiffres.

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
- **Gazette** (`Gazette`) : une ligne repliée (« En ce moment » ou « Bientôt », titre, compte à rebours) qui se déplie au toucher, seulement sur Comptoir, Routes et Marché, jamais pendant les premiers pas guidés par Lorenzo ; fermeture par ×.
- **Commandes de la route** (`Routes`, `roadKit.tsx`) : chaque commande montre son prix unitaire, l'écart avec le Rialto, les ducats par heure de route et un badge « Livrable » ; tri par gain à l'heure par défaut et bouton « Meilleur choix ». La vue Liste est celle du tutoriel.
- **Fil de la famille** (`Familles`, `Thread`) : messages des membres, les miens à droite sur fond lagune, « Signaler » sous ceux des autres, saisie en bas ; pastille sur l'onglet Familles quand un message n'a pas été lu.
- **Objectif de saison** (`Comptoir`, `SeasonGoal`) : titre actuel et Renommée assurée, prochain palier et sa barre ; affiché après la première livraison.
- **Brigands** : encadré d'infamie (prises de la saison, prime sur la tête, primes reçues) sous l'aide de l'écran Brigands.
- **Criée** (`Criee`) : bandeau doré en tête de chaque écran tant qu'elle dure, avec la quantité vendable et un retour haptique « alarme » quand elle s'ouvre.
- **Tâches du jour** (`Daily`) : trois tâches, la série de jours et le coffre, dans la colonne de droite du Comptoir.
- **Produits frais** : sous un atelier prêt, « Frais : +5 % encore 23 min ».
- **Ballots de Faraj** (`Bales`) : tuile du Comptoir après les premiers pas, puis écran plein : la balle de toile flotte sur le quai, tremble et luit, le sceau de cire (marque de Faraj : croissant, mât, fanion, orbe, sœur du signe de quatre) éclate, trois connaissements sortent face cachée. Une carte rare ou mieux luit avant d'être retournée ; cadres parchemin, lagune, lapis, pourpre et or (seul usage de l'or hors argent et action principale) ; éclat doré et reflet pour une légendaire. Probabilités et histoire de Faraj sous le ballot.
- **Pass Négociant** (`PassPanel`) : statut, avantages, comment le gagner, prix (paiement à venir). Sceau (le signe de quatre) à côté du nom dans les classements ; palette « Or de Venise » réservée.
- **Retours haptiques** (`haptics.ts`) : léger au changement d'onglet, double pour une action qui rapporte, long pour une erreur, alarme pour une Criée ; réglables dans le Profil. Sur iPhone, Safari ne vibre pas : un interrupteur natif caché donne un petit clic.
