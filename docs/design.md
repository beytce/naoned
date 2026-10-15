# Identité visuelle

Le jeu s'appelle **Fondaco**, du nom des entrepôts où les marchands étrangers logeaient et commerçaient à Venise. Ambiance : Venise au Quattrocento, des ducats, la lagune. L'identité suit le guide « Fondaco — identité & palettes ».

## Logo : le lion ailé

Logo officiel : le lion ailé de saint Marc, de face, rugissant, ailes déployées, qui tient dans ses griffes un ducat d'or frappé d'un galion sur les vagues, sur une tuile brune aux coins arrondis. Pas de nom dans le logo.

- **Source** : `apps/web/brand/logo.webp` (1024 px, carré arrondi sur fond blanc). On ne le redessine pas : on remplace ce fichier.
- **Rendus** : `apps/web/scripts/icons.mjs` en tire toutes les tailles ; les coins blancs de la source deviennent le brun du logo (`#73371E`). À relancer après tout changement de la source : `npx -y -p playwright-core node apps/web/scripts/icons.mjs`.
  - iPhone : `apple-touch-icon` 180 et 1024 px, carré plein sans transparence (iOS arrondit lui-même). Le 1024 px et les icônes Android ne sont pas mis en cache par le service worker (le système les télécharge à l'installation).
  - Android : 192 et 512 px arrondis, plus une version masquable dont le logo tient dans la zone sûre de 80 %.
  - `favicon.png` (64 px) et `icons/logo-256.webp`, le logo affiché dans le jeu.
- **Composants** (`apps/web/src/art/logo.tsx`) :
  - `Emblem` : le logo. Écran de connexion, introduction, chargement, cérémonie de fin de saison, Pass Négociant, sceau du Pass à côté du nom dans les classements.
  - `Logotype` : le logo et « Fondaco » côte à côte, dans la barre latérale sur PC.
- **Ducat** : pièce or frappée du galion du logo sur ses vagues (`Coin`).

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

Les illustrations (ressources, bâtiments, blasons) et la carte gardent leurs propres couleurs dans toutes les palettes, réglées sur la palette par défaut (`art/palette.ts`).

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

- La carte ne bouge que sous le doigt : glisser la déplace (avec élan), deux doigts ou la molette zooment autour de leur milieu, un double toucher dans le vide la recadre. Un objet choisi glisse dans le champ s'il est caché sous le panneau, sans plus.
- Le panneau de la sélection monte du pied de l'écran ; un médaillon choisi s'entoure de vert d'eau, une ville que la charrette peut servir respire, les autres s'estompent. Les routes en cours défilent en pointillés vers leur ville.
- Il n'y a plus de page : le Rialto, le Classement et le Profil sont des feuilles posées sur la carte ; la Famille et le Port sont des calques de la même carte (Campagne, Mer), que la porte « Commerce » ou le bouton retour ramènent au commerce.
- Tout s'arrête pour qui demande moins de mouvement (`prefers-reduced-motion`).

## Gestes

- **Carte** : glisser, pincer, molette, double toucher (voir Mouvement).
- **Feuilles** (`ui.tsx`) : tirées vers le bas depuis le haut de leur défilement, elles suivent le doigt (avec résistance). Au-delà d'un tiers de leur hauteur ou d'un geste vif, elles se ferment ; sinon elles reviennent.

## Disposition : la carte d'abord (`game/map/`)

Un seul écran, la carte de la Vénétie la nuit, inspirée des jeux de commerce spatial sur mobile : les villes à la place des planètes, le comptoir du marchand parmi elles, ses charrettes garées à côté comme des vaisseaux. Aucun onglet, aucun bandeau : tout part d'un lieu.

| Pièce | Rôle | Composants |
| --- | --- | --- |
| **Carte** | Le sol (une couche que le processeur graphique déplace), les routes du comptoir en pointillés, les repères placés à la main à chaque image, sans rendu React. Les images ne tournent que si quelque chose bouge (caméra, élan, charrette en route) | `WorldMap`, `NightTerrain`, `geometry.ts` |
| **Repères** | Les villes en médaillons à leur teinte (pastille or : commandes couvertes par le stock ; vert d'eau : commandes ; vermillon : Criée), le comptoir doré au blason (anneau du prochain lot, pastille des lots prêts), les charrettes en jetons (vert d'eau en route, vermillon battant si arrêtées). Elles se garent dans le secteur libre autour du comptoir, côté terre, et partent du bord du médaillon | `CityMarker`, `HomeMarker`, `CartMarker` |
| **HUD** | En haut à gauche, le blason dans l'anneau de la saison, le nom, le titre et le rang ; dessous la cloche des Avis et Lorenzo quand le guide est en pause. En haut à droite, les ducats, les charrettes libres, « + » pour en acheter. Au pied, sans sélection, trois portes rondes : Classement, Famille (Commerce sur le calque de la Campagne ; point vermillon quand la famille appelle), Aide. Toucher son rang ouvre le Classement | `MapHud` |
| **Panneau** | Ce qui est choisi : titre, une ligne d'état (et sa barre), de grosses actions carrées, flèches vers l'objet suivant du même genre, croix. Sur ordinateur, flottant en bas à droite | `ContextPanel`, `ActionButton` |
| **Feuilles** | Le détail : ateliers, entrepôt, bâtir, cargaisons, Criée, brigands, Avis | `Sheet` |
| **Feuilles de lieu** | Le Rialto (clés `rialto`, `trade:<r>`, `offers`) : le tableau des cours (Tout, En stock, En hausse ; taxe, décrets, mes offres), puis le négoce d'une marchandise dans la même feuille, ← retour. Le Classement (`ranking`) : semaine ou saison avec leur clôture, podium, liste, sa ligne épinglée au pied ; semaine passée et règles dans la même feuille | `RialtoSheet`, `RankingSheet` |
| **Profil** | Feuille (`profile`) ouverte par le blason ou le nom : blason et « Modifier », titre et paliers, patrimoine, chiffres, trophées, palmarès, Pass ; les réglages repliés au pied (palette, notifications, retours haptiques, aide, données, réinitialisation) | `ProfileSheet` |

| Lieu choisi | État | Actions |
| --- | --- | --- |
| **Comptoir** | Lots prêts, prochain lot et sa barre, ouvriers affamés | Récolter (ou Relancer) · Ateliers · Entrepôt · Bâtir |
| **Ville** | Commandes couvertes par le stock, Criée en cours, renouvellement | Cargaisons · Criée · Brigands (après leur ouverture) ; Venise : Rialto · Port (le calque Mer, ou la feuille « le port s'ouvre bientôt » avant son jour) |
| **Charrette au comptoir** | Au comptoir, chargée pour…, jauge de cale | Cargaisons · Partir |
| **Charrette en route** | Vers la ville ou retour, temps restant ; arrêtée par des brigands | Riposter · Suivre |

Les **Avis** (la cloche) rassemblent ce qui était en bandeaux : jour et acte de la saison, dernier sprint, entretien impayé, Criée, gazette ; puis le carnet du jour (premiers pas, tâches, Livre de compte), la saison (palier, maîtrise, ballots) et les nouvelles.

Le guide de Lorenzo vise des objets de la carte (`home`, `city-<code>`, `cart-<id>`) puis les boutons du panneau (`panel-harvest`, `panel-workshops`, `panel-cargo`, `panel-go`, `panel-rialto`) et la cloche (`hud-notices`) ; sa bulle passe au-dessus des feuilles.

## Illustrations

Tout est en SVG maison, dans `apps/web/src/art` : ressources, bâtiments (le moulin et la scierie tournent pendant la production), panorama de Venise, carte marine, scènes des régions, blasons (3 formes × 6 émaux × 8 meubles), Lorenzo le facteur qui guide le joueur, médailles des trophées. Pas d'image externe.

## Guide du joueur

1. **Introduction** : 4 écrans illustrés avant le choix de la région (rejouable depuis le profil ou l'aide).
2. **Lorenzo** : guide interactif qui assombrit l'écran, entoure en or l'élément à toucher et explique pourquoi. Il lit l'état réel du jeu, donc il suit le joueur même s'il fait les choses dans un autre ordre. Un élément ciblé porte un attribut `data-coach` (sur PC, la cible visible est choisie entre la barre latérale et la barre du bas).
3. **Comment jouer** : aide permanente (icône « ? » en haut).

## Saison, présence et Pass

- **Cérémonie de clôture** (`Ceremony`) : à la première visite après la fin du mois, rang final révélé, podium, récompenses (titre, Pass, Renommée), puis choix de la région pour le nouveau mois.
- **Palmarès** (`Palmares`) : Renommée et titre, saisons terminées, statistiques et frise des dernières semaines ; sur le profil et en touchant un nom du classement.
- **Dernier sprint** : encadré doré dans les Avis les trois derniers jours ; l'hommage au Doge de la saison passée s'affiche au Marché.
- **Maîtrise** (`Mastery`, `art/mastery.tsx`) :
  - **Avis** : une tuile de progression vers le palier (niveaux d'ateliers), puis l'appel à choisir.
  - **Choix** : feuille ouverte d'elle-même la première fois, avec quatre cartes (emblème, devise, effets lus dans les réglages) et une confirmation « pour toute la saison ».
  - **Emblèmes** : marteau et enclume, roue, balance, ancre, sous le blason du Domaine et dans le classement.
- **Actes de la saison** (`Acts`) : l'acte en cours dans les Avis ; sa carte s'ouvre d'elle-même à la première visite de chaque acte, après les premiers pas.
- **Notification d'acte** : à l'ouverture des actes II à IV, une notification « Acte II : la peste » (cloche et push), réglable comme les autres.
- **Fil de la guilde** (`Guilde`, `Thread`) : messages des membres, les miens à droite sur fond lagune, « Signaler » sous ceux des autres, saisie en bas ; pastille sur l'onglet Guilde quand un message n'a pas été lu ou qu'un vote attend.
- **Objectif de saison** (`SeasonGoal`, dans les Avis) : titre actuel et Renommée assurée, prochain palier et sa barre ; affiché après la première livraison.
- **Brigands** (`Bandits`, depuis une ville) : la route et la durée, le coût, l'encadré d'infamie (prises de la saison, prime sur la tête, primes reçues), les bandes en cours et leur butin.
- **Criée** (`Criee`) : la ville qui crie porte une pastille vermillon ; son panneau et les Avis ouvrent la vente, avec la quantité vendable et un retour haptique « alarme » quand elle s'ouvre.
- **Tâches du jour** (`Daily`) : trois tâches, la série de jours et le coffre, dans les Avis.
- **Produits frais** : sous un atelier prêt, « Frais : +5 % encore 23 min ».
- **Ballots de Faraj** (`Bales`) : tuile des Avis après les premiers pas, puis écran plein : la balle de toile flotte sur le quai, tremble et luit, le sceau de cire (marque de Faraj : croissant, mât, fanion, orbe) éclate, trois connaissements sortent face cachée. Une carte rare ou mieux luit avant d'être retournée ; cadres parchemin, lagune, lapis, pourpre et or (seul usage de l'or hors argent et action principale) ; éclat doré et reflet pour une légendaire. Probabilités et histoire de Faraj sous le ballot.
- **Pass Négociant** (`PassPanel`) : statut, avantages, comment le gagner, prix (paiement à venir). Sceau (le lion ailé) à côté du nom dans les classements ; palette « Or de Venise » réservée.
- **Retours haptiques** (`haptics.ts`) : léger à chaque sélection sur la carte, double pour une action qui rapporte, long pour une erreur, alarme pour une Criée ; réglables dans le Profil. Sur iPhone, Safari ne vibre pas : un interrupteur natif caché donne un petit clic.

## Le Port : calque de la Mer (`map/SeaLayer.tsx`)

- Venise → Port bascule la carte sur la mer, comme la porte Famille sur la Campagne : la Vénétie s'efface sous l'eau, la caméra glisse sur la Méditerranée. Carte stylisée, posée pour un téléphone tenu droit (la vraie est large) : la géographie est gardée, Bruges à un glissé vers l'ouest.
- **Repères** : l'Arsenal de Venise en médaillon doré (pastille des galères à décharger) ; chaque port en médaillon lagune avec ce qu'il rapporte et sa plus-value ; les galères en jetons qui sortent du bord de l'Arsenal, vont au port et reviennent, dorées à quai, vermillon abordées. Les routes en pointillés suivent la mer par escales, rouges si des corsaires guettent, animées quand une galère y navigue.
- **Panneaux** : l'Arsenal (galères en mer, navires prêts ; Décharger, Flotte, Corsaires, Journal) ; un port (durée, pirates, ce qu'il rapporte ; Envoyer un convoi, Fiche ; ‹ › entre les ports) ; une galère (vers où, retour dans…, sa barre ; Décharger à quai, abordage).
- **HUD** : les galères en mer et les navires prêts prennent la place des charrettes.

## Famille et Campagne

- **Couleurs des familles** (`art/familyCrest.tsx`) : Contarini vert d'eau et tour, Morosini émeraude et épi, Mocenigo vermillon et ancre, Dandolo violet et lion, Milan encre et couronne ; jamais l'or, réservé à l'argent et au Pass. Les milices en vert-gris. Blason en bannière (`FamilyCrest`).
- **Calque de la Campagne** (`map/CampaignLayer.tsx`) : la porte Famille bascule la carte du monde sur la Campagne, les terres ayant le même repère que les villes. La caméra glisse vers la Terraferme et cadre la partie dessinée ; la Lombardie de Milan, à l'ouest, est à un glissé. Villes, routes et charrettes laissent la place aux terres.
  - **Sol** : chaque terre dans la couleur de son détenteur (milices presque transparentes), frontières où deux détenteurs se touchent (`territory.ts`), marches en pointillés qui défilent avec leur colonne en pastille.
  - **Terres** (`LandMarker`) : disque à la couleur du détenteur, garnison au centre (⚑ pour un fief), bord or si ses lances y sont, anneau or pointillé à portée, anneau vermillon qui bat sous une marche ennemie, ouvrage en médaillon. Les noms : villes, forteresses et son fief ; les autres quand on les choisit.
  - **HUD** : les ducats, puis les quatre familles en rangée (blason et Gloire, la sienne cerclée d'or), et dessous la fin de semaine, la trêve, Milan.
  - **Son fief** ouvre le panneau de la famille : rang et Gloire, réserve et levée (sa barre), Lances (lever, engager), Marches (les marches à rejoindre, les ouvrages), Décrets (en vigueur, programme et vote), Famille (classement des familles, membres, semaines passées, fil).
  - **Une terre** : détenteur, garnison, défense, marche ennemie ou amie en cours ; Attaquer ou Renforcer (la fiche de la terre et son nombre de lances), Rejoindre une marche, Fiche ; ‹ › vers la terre suivante à portée.
  - **Sans famille** : le panneau des quatre familles, Allégeance (les quatre cartes, la plus petite mise en avant, confirmation en deux temps) et Règles.
- **Ouvrages** (`art/workIcon.tsx`) : rocca en tour crénelée, campo en tente à fanion vermillon, dogana en porte à la pièce d'or, à la couleur de la famille ; en contour pointillé tant qu'ils sont en chantier. Sur la carte, en médaillon au coin de la pastille de garnison. Dans la fiche d'une terre de sa famille : les trois ouvrages en lignes (icône, nom, rôle, effet, « Bâtir · prix ») ; sur une terre qui en porte un : l'ouvrage, son état et son bâtisseur, sur fond vermillon s'il est ennemi, avec le Mérite promis à qui le rase.
- **Bandeau des décrets** (`DecreeBanner`) : au Rialto, dans les Décrets de la famille et dans le Journal de l'Arsenal ; lueur vert d'eau quand ils jouent pour le marchand, vermillon contre lui.

## Charger et partir

- **Charrette choisie** (`CartPanel`) : bord vert d'eau et croix en onglet ; nom, cale « 12/40 » et sa jauge, état (au comptoir, chargée pour…). Les villes qu'elle peut servir s'éclairent et leur route se dore, les autres s'estompent. Toucher une ville éclairée ouvre ses cargaisons ; toucher la ville de la cale prépare le départ.
- **Cargaisons** (`CargoSheet`) : feuille avec onglets Récompense, Distance, Ville ; une ligne par commande (pastille à cocher, marchandise, ville et durée, récompense en or), grisée avec sa raison quand elle ne va pas (autre ville, trop lourd, stock) ; la cale en bas avec sa jauge et ses commandes cochées ; « Prêt pour Vicence · 63 d ».
- **Départ** (`DeparturePanel`) : la route en pointillés vert d'eau jusqu'à la ville, « Départ vers Padoue · 10 s » et sa barre, les escortes en puces avec leur risque (choisir relance le compte), ✓ Partir et ✕ Annuler ; à zéro, la charrette part d'elle-même. Elle reste choisie : on la voit quitter le comptoir.
