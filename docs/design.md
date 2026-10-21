# Identité visuelle

Le jeu s'appelle **Fondaco**, du nom des entrepôts où les marchands étrangers logeaient et commerçaient à Venise. Ambiance : Venise au Quattrocento, des ducats, la lagune. L'identité suit le guide « Fondaco — identité & palettes ».

## Logo : le lion ailé

Logo officiel (depuis le 18 octobre 2026) : le lion ailé de saint Marc, de face, rugissant, ailes déployées, debout sur les vagues, frappé en relief sur une médaille d'or à frise tressée, sur un fond olive très sombre. Pas de nom dans le logo.

- **Source** : `apps/web/brand/logo.webp` (1024 px, carré : la médaille sur son fond sombre, bord à bord). On ne le redessine pas : on remplace ce fichier.
- **Rendus** : `apps/web/scripts/icons.mjs` en tire toutes les tailles ; le fond autour d'un logo réduit (version masquable) est l'olive sombre de la source (`#16140C`). À relancer après tout changement de la source : `npx -y -p playwright-core node apps/web/scripts/icons.mjs`.
  - iPhone : `apple-touch-icon` 180 et 1024 px, carré plein sans transparence (iOS arrondit lui-même). Le 1024 px et les icônes Android ne sont pas mis en cache par le service worker (le système les télécharge à l'installation).
  - Android : 192 et 512 px arrondis, plus une version masquable dont le logo tient dans la zone sûre de 80 %.
  - `favicon.png` (64 px) et `icons/logo-256.webp`, le logo affiché dans le jeu.
- **Composants** (`apps/web/src/art/logo.tsx`) :
  - `Emblem` : le logo. Écran de connexion, introduction, chargement, cérémonie de fin de saison, Pass Négociant, sceau du Pass à côté du nom dans les classements.
  - `Logotype` : le logo et « Fondaco » côte à côte, dans la barre latérale sur PC.
- **Ducat** : pièce or frappée du galion du logo sur ses vagues (`Coin`).

## Palettes

Trois palettes, mêmes rôles aux mêmes endroits, au choix du joueur dans le Profil (mémorisé sur l'appareil) : « Lagune & Ducat », bleu nuit et par défaut depuis le 20 octobre 2026 (le brun de Noyer était jugé trop sombre et peu accueillant par le porteur, qui demandait de se rapprocher du bleu des jeux spatiaux mobiles), « Noyer & Ducat », sombre (l'intérieur du fondaco à la lueur des lampes), et « Parchemin & Lapis », claire, pour le plein jour. « Or de Venise » reste réservée au Pass. Seule une palette choisie par le joueur est gardée : un appareil qui avait seulement retenu l'ancien défaut passe à Lagune. La carte (portulan, `Terrain.tsx`) est elle aussi passée au bleu : terres ardoise, eaux bleu profond, encre cyan pâle. Les couleurs sont des variables CSS (`index.css`, `[data-palette]`) lues par Tailwind (`tailwind.config.js`).

| Rôle | Lagune & Ducat (défaut) | Noyer & Ducat | Parchemin & Lapis (clair) | Usage strict |
| --- | --- | --- | --- | --- |
| Fond (`night`, `night-2/3/4`) | `#16263E`, surfaces `#1D304D` `#243A5C` `#2E486E` | `#1E1611`, surfaces `#2A1F18` `#36291F` `#443327` | `#F3E9D4` | Application, cartes, feuilles : des surfaces assez écartées pour que les panneaux « montent » |
| Or (`gold`) | `#F4C554` | `#E8B24C` | `#845A0E` | Les montants en ducats, et **un seul bouton par écran** : celui à toucher. Jamais un badge, un onglet ni un titre |
| Lagune (`lagoon`) | `#6EE0B8` | `#7DB596` | `#286E4E` | Gains, production, « prêt ». Jamais un bouton ni un libellé neutre |
| Cinabre (`vermilion`) | `#FF8070` | `#EA7658` | `#AA3422` | Pertes réelles et urgences. Une chaîne qui attend sa matière n'est pas une alerte (rond creux, crème) |
| Lapis (`info`) | `#6EC8F5` | `#7E9CDB` | `#284EA0` | Sélection (anneau des repères), guide de Lorenzo, onglet et filtre actifs, liens, « vous » au classement |
| Texte (`cream`, `cream-dim`, `muted`) | `#ECF5FF` | `#F6E8CC` | `#2B2016` | Texte, sur-titres (crème atténué), badges neutres |
| Encre (`ink`) | fond | fond | crème clair | Texte posé sur l'or |

Les autres boutons sont « fantômes » (`Slab tone="ghost"`, `ActionButton tone="plain"`). Un test (`apps/web/test/theme.test.ts`) vérifie le contraste AA (4,5:1) de chaque couleur de texte sur `night`, `night-2` et `night-3`, pour chaque palette.

Les deux halos du fond suivent la palette (`--glow-a`, `--glow-b`) : cyan et vert d'eau pour Lagune, ambre et braise pour Noyer, vert d'eau et or pour les autres.

Les illustrations (ressources, bâtiments, blasons) et la carte gardent leurs propres couleurs dans toutes les palettes, réglées sur la palette par défaut (`art/palette.ts`).

## Typographie (embarquée, sans appel à Google)

- **Archivo Expanded** (Archivo variable, largeur 125 %) : titres et chiffres.
- **Space Grotesk** : texte courant et boutons.
- **Space Mono** : sur-titres de un à trois mots en capitales (`.label`, 12 px).
- Toute phrase ou temps restant en petit : `.note` (Space Grotesk 13 px, chiffres alignés). Aucun texte sous 12 px.

## Composants (`apps/web/src/ui.tsx`)

Formes inspirées des jeux de cartes mobiles : des biseaux plutôt que des arrondis, partout (`.cut` pour les cartes et les lignes, `.slab` pour les puces et les badges). Le cercle est réservé aux médaillons, avatars, pastilles et jauges ; les feuilles gardent leur poignée arrondie.
- `Slab` : bouton en parallélogramme (`.bevel`) posé sur une ombre pleine décalée de sa teinte sombre. À l'appui, la face s'enfonce sur son ombre, avec un tick haptique. Or pour l'unique action qui compte à l'écran, fantôme pour les autres ; jamais vert d'eau.
- `Panel` : carte à coins coupés (`.cut`), haut gauche et bas droit, avec un liseré. Une lueur intérieure s'ajoute quand elle doit attirer l'œil. Les tuiles et cartes de commande suivent la même coupe.
- `Badge`, puces du stock, pastilles de tri : petits biseaux (`.slab`).
- `Tabs` :
  - `pills` : choix d'une valeur, par exemple le tri ;
  - `underline` : parties d'un écran (Joueurs et Villes). Capitales sur un double trait crème et lapis qui glisse d'un onglet à l'autre.
- `CountUp` : un nombre qui court vers sa nouvelle valeur en 400 ms, comme la bourse de l'en-tête.
- `Stat` : tuile chiffrée (une durée, un gain en lagune, une perte en cinabre).
- `Switch` : interrupteur (escorte, navires, notifications), à la place des cases à cocher.
- `Sheet` : feuille du bas sur mobile, fenêtre centrée sur PC, fermeture par ×.
- `Ribbon` : barre de progression rayée ; `Big` : grands chiffres.

## Mouvement

- La carte ne bouge que sous le doigt : glisser la déplace (avec élan), deux doigts ou la molette zooment autour de leur milieu, un double toucher dans le vide la recadre. Un objet choisi glisse dans le champ s'il est caché sous le panneau, sans plus.
- Le panneau de la sélection monte du pied de l'écran ; un médaillon choisi s'entoure de lapis, une ville que la charrette peut servir respire, les autres s'estompent. Les routes en cours défilent en pointillés vers leur ville.
- Il n'y a plus de page : le Rialto, le Classement et le Profil sont des feuilles posées sur la carte ; la Famille est un calque de la même carte (la Campagne), que la porte « Commerce » ou le bouton retour ramène au commerce.
- Tout s'arrête pour qui demande moins de mouvement (`prefers-reduced-motion`).

## Gestes

- **Carte** : glisser, pincer, molette, double toucher (voir Mouvement).
- **Feuilles** (`ui.tsx`) : tirées vers le bas depuis le haut de leur défilement, elles suivent le doigt (avec résistance). Au-delà d'un tiers de leur hauteur ou d'un geste vif, elles se ferment ; sinon elles reviennent.

## Disposition : la carte d'abord (`game/map/`)

Un seul écran, la Vénétie en **portulan** à la lueur des lampes (`PortolanTerrain`, depuis l'audit UX du 19 octobre 2026) : parchemin chaud, Alpes à l'encre hachurée, fleuves en double trait, lagune et Adriatique lavées de vert, lignes de rhumb partant d'une rose des vents, régions nommées en capitales espacées. Les villes sont des **vignettes** de leurs monuments (`CityIcon` sur une plaque teintée de la couleur de la ville, Venise un peu plus grande) ; le comptoir doré du marchand est posé dans sa région ; ses charrettes sont garées à côté. Aucun onglet, aucun bandeau : tout part d'un lieu.

**Sur ordinateur** (≥ 1024 px), une colonne de 384 px reste à droite de la carte du commerce (`SideColumn`) : Commandes du jour (les mieux payées d'abord, « stock suffisant » marqué ; toucher une ligne choisit la ville), Ateliers, Marché. Le HUD, le panneau et la caméra la laissent libre (`--side`). Raccourcis : R récolter et relancer, A ateliers, M marché, C cargaisons, 1 à 9 un atelier, Échap.

| Pièce | Rôle | Composants |
| --- | --- | --- |
| **Carte** | Le sol (une couche que le processeur graphique déplace), les routes du comptoir en pointillés, les repères placés à la main à chaque image, sans rendu React. Les images ne tournent que si quelque chose bouge (caméra, élan, charrette en route) | `WorldMap`, `NightTerrain`, `geometry.ts` |
| **Repères** | Les villes en médaillons à leur teinte (pastille or : commandes couvertes par le stock ; vert d'eau : commandes ; vermillon : Criée), le comptoir doré au blason (anneau du prochain lot, pastille des lots prêts), les véhicules en jetons (vert d'eau en route). Elles se garent dans le secteur libre autour du comptoir, côté terre, et partent du bord du médaillon | `CityMarker`, `HomeMarker`, `CartMarker` |
| **HUD** | En haut, une grille à deux colonnes réservées (`minmax(0,1fr)` à gauche, au plus 46 % à droite) : rien ne s'écrit sur la colonne voisine, à 320 px comme à 390 px. À gauche, un seul bouton vers le Profil : le blason dans l'anneau de la saison, le nom, puis le rang, le niveau et le titre (le titre cède à la troncature, jamais le rang). Le rival de la semaine a sa ligne à lui sous la grille, sur toute la largeur (toucher : le Classement). Dessous, en colonne, la cloche des Avis, la bulle du Rialto, le cercle des ballots (seulement quand un ballot attend) et Lorenzo quand le guide est en pause. En haut à droite, en colonne, des compteurs : les ducats, l'Influence, la réserve de pain des ouvriers (« −6/j 14 » : la consommation du jour et le stock ; neutre, dorée quand elle ne couvre plus le prochain repas, vermillon quand ils ont faim, l'icône respirant alors un anneau), les véhicules libres et « + » pour en acheter. Toucher un compteur déplie à gauche de son icône une fiche (bandeau de sa couleur, flèche vers l'icône, ce qu'il est, ses chiffres, un bouton : Rialto, livre de la Maison, « Acheter du pain ») : fondu court qui glisse de l'icône, sortie plus brève ; une seule à la fois, la carte touchée la ferme. Les véhicules ouvrent un tiroir glissé du bord droit : chacun, où il est, le toucher le choisit sur la carte. Au pied, sans sélection, quatre portes rondes : Ateliers (sur le calque du commerce), Classement, Famille (Commerce sur le calque de la Campagne ; point vermillon quand la famille appelle), Aide. Tout ce qui se touche dans le HUD fait au moins 44 × 44 px (un petit rond garde son dessin, sa zone de toucher l'entoure) ; chaque bloc porte `data-hud`, que vérifie le test de mise en page (`apps/web/e2e/layout.mjs`) | `MapHud` |
| **Panneau** | Ce qui est choisi : titre, une ligne d'état (et sa barre), de grosses actions carrées, flèches vers l'objet suivant du même genre, croix. Sur ordinateur, flottant en bas à droite | `ContextPanel`, `ActionButton` |
| **Feuilles** | Le détail : ateliers, entrepôt, bâtir, cargaisons, Criée, Avis | `Sheet` |
| **Construire** | Le catalogue en cartes, deux onglets (Ateliers, Véhicules) : illustration et nombre déjà bâti à gauche ; nom, durée d'un lot (ou vitesse), recette, rôle dans le commerce, pain des ouvriers et prix à droite (en vermillon ce qui manque). Une carte qu'on ne peut pas prendre est assombrie et dit pourquoi (autre région, parcelles pleines, prix, amélioration d'un autre véhicule) ; celles des autres régions restent visibles, pour montrer qui produit quoi | `BuildCatalog` |
| **Feuilles de lieu** | Le Rialto (clés `rialto`, `trade:<r>`, `offers`) : le tableau des cours (Tout, En stock, En hausse ; taxe, décrets, mes offres), puis le négoce d'une marchandise dans la même feuille, ← retour. Le Classement (`ranking`) : semaine ou saison avec leur clôture, podium, liste, sa ligne épinglée au pied ; semaine passée et règles dans la même feuille | `RialtoSheet`, `RankingSheet` |
| **Profil** | Feuille (`profile`) ouverte par le blason ou le nom : blason et « Modifier », titre et paliers, patrimoine, chiffres, trophées, palmarès, Pass ; les réglages repliés au pied (palette, notifications, retours haptiques, aide, données, réinitialisation) | `ProfileSheet` |

| Lieu choisi | État | Actions |
| --- | --- | --- |
| **Comptoir** | Lots prêts, prochain lot et sa barre, ouvriers affamés | Récolter (ou Relancer) · Ateliers · Entrepôt · Bâtir |
| **Ville** | Commandes couvertes par le stock, Criée en cours, renouvellement | Cargaisons · Criée ; Venise : Rialto (et les galères de la Muda en tête du Rialto) |
| **Charrette au comptoir** | Au comptoir, chargée pour…, jauge de cale | Cargaisons · Partir |
| **Charrette en route** | Vers la ville ou retour, temps restant | Suivre |

### Règle du HUD

La carte est l'écran de jeu : le HUD la borde sans la couvrir. Avant d'y ajouter quoi que ce soit :

1. **Quatre bulles au plus par colonne**, quatre portes au plus au pied. Un nouvel élément en remplace un, ou va dans les Avis ou dans le panneau d'un lieu.
2. **Le HUD montre un état, ou mène à un lieu visité à chaque session.** Les ducats, le pain, les véhicules, les avis non lus, le Rialto, les ateliers. Une action ponctuelle (Criée, galères, mission) passe par les Avis ; une règle passe par l'Aide.
3. **Une bulle conditionnelle n'apparaît que lorsqu'il y a quelque chose à faire** (le ballot à ouvrir, le guide en pause), et disparaît ensuite.
4. **Les doubles chemins sont des raccourcis, pas des lieux.** Chaque lieu a sa place sur la carte (le Rialto à Venise, les ateliers au comptoir) ; une bulle ou une porte n'y mène que si le joueur y va à presque chaque session.
5. **Sur 390 × 844, la carte garde au moins les deux tiers de l'écran** sans sélection.
6. **Les mêmes quatre portes, aux mêmes places, sur chaque calque** : Ateliers · Classement · Terraferme/Commerce · Aide.
7. **La première session s'ouvre par étapes** (`game/unlocks.ts`) : comptoir, villes et cargaisons d'abord ; la bulle du Rialto, le Classement et la Terraferme après la première livraison (porte grisée, cadenas et condition au toucher, pas de pastille) ; l'Influence, les tâches du jour et le Livre de compte une fois le marché appris. Un guide passé ou fini ouvre tout.

Les **Avis** (la cloche) rassemblent ce qui était en bandeaux : jour et acte de la saison, dernier sprint, Criée, gazette ; puis le carnet du jour (premiers pas, tâches, Livre de compte), la saison (palier, maîtrise, ballots) et les nouvelles.

Le guide de Lorenzo vise des objets de la carte (`home`, `city-<code>`, `cart-<id>`) puis les boutons du panneau (`panel-harvest`, `panel-workshops`, `panel-cargo`, `panel-go`, `panel-rialto`) et la cloche (`hud-notices`) ; sa bulle passe au-dessus des feuilles.

## Illustrations

Tout est en SVG maison, dans `apps/web/src/art` : ressources, bâtiments (le moulin et la scierie tournent pendant la production), panorama de Venise, scènes des régions, blasons (3 formes × 6 émaux × 8 meubles), Lorenzo le facteur qui guide le joueur, médailles des trophées. Pas d'image externe.

## Guide du joueur

1. **Introduction** : 4 écrans illustrés avant le choix de la région (rejouable depuis le profil ou l'aide).
2. **Lorenzo** : guide interactif qui assombrit l'écran, entoure en lapis l'élément à toucher et explique pourquoi. Sa bulle ne couvre jamais sa cible ni le panneau ouvert ; si une fenêtre cache la cible, il demande de la fermer. Il ne fait jamais livrer le pain des ouvriers. `pnpm --filter @comptoirs/web e2e` joue le tutoriel jusqu'à la première livraison. Il lit l'état réel du jeu, donc il suit le joueur même s'il fait les choses dans un autre ordre. Un élément ciblé porte un attribut `data-coach` (sur PC, la cible visible est choisie entre la barre latérale et la barre du bas).
3. **Comment jouer** : aide permanente (icône « ? » en haut).

## Saison, présence et Pass

- **Cérémonie de clôture** (`Ceremony`) : à la première visite après la fin du mois, rang final révélé, podium, récompenses (titre, Pass, Renommée), puis choix de la région pour le nouveau mois.
- **Palmarès** (`Palmares`) : Renommée et titre, saisons terminées, statistiques et frise des dernières semaines ; sur le profil et en touchant un nom du classement.
- **Dernier sprint** : encadré doré dans les Avis les trois derniers jours ; l'hommage au Doge de la saison passée s'affiche au Marché.
- **Maîtrise** (`Mastery`, `art/mastery.tsx`) :
  - **Avis** : une tuile de progression vers le palier (niveaux d'ateliers), puis l'appel à choisir.
  - **Choix** : feuille ouverte d'elle-même la première fois, avec quatre cartes (emblème, devise, effets lus dans les réglages) et une confirmation « pour toute la saison ».
  - **Emblèmes** : marteau et enclume, roue, balance, sac d'épices, sous le blason du Domaine et dans le classement.
- **Actes de la saison** (`Acts`) : l'acte en cours dans les Avis ; sa carte s'ouvre d'elle-même à la première visite de chaque acte, après les premiers pas.
- **Notification d'acte** : à l'ouverture des actes II à IV, une notification « Acte II : la peste » (cloche et push), réglable comme les autres.
- **Fil de la guilde** (`Guilde`, `Thread`) : messages des membres, les miens à droite sur fond lagune, « Signaler » sous ceux des autres, saisie en bas ; pastille sur l'onglet Guilde quand un message n'a pas été lu ou qu'un vote attend.
- **Objectif de saison** (`SeasonGoal`, dans les Avis) : titre actuel et Renommée assurée, prochain palier et sa barre ; affiché après la première livraison.
- **Galères de la Muda** (`MudaPanel`, en tête du Rialto) : le délai des prochaines galères, puis une ligne par marchandise à quai (quantité, ce qu'il reste au marchand, prix du moment) qui ouvre son négoce ; le négoce rappelle le quota de la Muda.
- **Criée** (`Criee`) : la ville qui crie porte une pastille vermillon ; son panneau et les Avis ouvrent la vente, avec la quantité vendable et un retour haptique « alarme » quand elle s'ouvre.
- **Tâches du jour** (`Daily`) : trois tâches, la série de jours et le coffre, dans les Avis.
- **Produits frais** : sous un atelier prêt, « Frais : +5 % encore 23 min ».
- **Ballots de Faraj** (`Bales`) : tuile des Avis après les premiers pas, puis écran plein : la balle de toile flotte sur le quai, tremble et luit, le sceau de cire (marque de Faraj : croissant, mât, fanion, orbe) éclate, trois connaissements sortent face cachée. Une carte rare ou mieux luit avant d'être retournée ; cadres parchemin, lagune, lapis, pourpre et or (seul usage de l'or hors argent et action principale) ; éclat doré et reflet pour une légendaire. Probabilités et histoire de Faraj sous le ballot.
- **Pass Négociant** (`PassPanel`) : statut, avantages, comment le gagner, prix (paiement à venir). Sceau (le lion ailé) à côté du nom dans les classements ; palette « Or de Venise » réservée.
- **Sons** (`sound.ts`) : pièce, récolte, charrette, tampon et cloche, synthétisés en WebAudio (aucun fichier), courts et discrets ; activés par défaut, coupables dans le Profil.
- **Pièces vers la bourse** (`game/fx.tsx`) : quand les ducats montent, le gain s'élève là où le joueur a touché et des pièces filent jusqu'à la bourse du HUD ; rien sous `prefers-reduced-motion`.
- **Retours haptiques** (`haptics.ts`) : léger à chaque sélection sur la carte, double pour une action qui rapporte, long pour une erreur, alarme pour une Criée ; réglables dans le Profil. Sur iPhone, Safari ne vibre pas : un interrupteur natif caché donne un petit clic.

## Famille et Campagne (jusqu'au 18 octobre 2026)

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

## Terraferme

Le mode qui remplace la Campagne depuis le 18 octobre 2026 (`docs/plan-terraferme.md`) ; quand `terraferma.live` est éteint (mondes d'avant), rien n'en paraît et les familles reviennent. Allumé, sa porte « Terraferme » prend la place de « Famille » au pied de la carte (point vermillon : pas encore de camp de départ, un front en marche contre soi, une alliance proposée).

- **Calque** (`map/TerraLayer.tsx`, formes dans `terraShapes.ts`) : la même Vénétie la nuit, la caméra cadre toute la terre (Lombardie comprise). **La grille**, comme sur OpenFront : chaque case de terre en fin liseré crème, toujours visible (plus nette pendant qu'on vise), pour lire d'un coup d'œil ce qui est libre, à soi, à l'autre (décision du porteur, 18 octobre 2026). Les cases qu'un front peut prendre, au bord de ses terres, en pointillés or. Chaque marchand a **un tracé**, ses coins de case adoucis (un lissage puis des courbes par les milieux des bords), recalculé seulement quand une case change de main. **Mise au point sur le joueur** : ses terres à sa teinte, denses, cerclées d'or ; ses voisins à leur teinte, translucides ; ses alliés cerclés vert d'eau ; les autres en liserés crème très discrets (plus encore sous quatre cases) ; Milan hachuré sang-de-bœuf. Douze tons de bijou sourds (`TERRA_TONES`), deux voisins jamais du même, chacun gardant le sien d'une visite à l'autre quand c'est possible. Une case prise se teinte en 400 ms. **Les troupes sur la carte**, comme sur OpenFront : au milieu du plus grand morceau de chaque territoire (la case la plus loin de ses frontières, hors comptoir et villes), le nom et les troupes en réserve, en texte de carte qui grandit avec le territoire ; sous douze cases, le territoire est caché par son médaillon, qui porte alors le nombre lui-même. Les troupes parties sur un front quittent ce nombre : elles ne défendent plus. **Pendant votre absence** : en ouvrant le calque, la carte telle qu'il l'a laissée (sa dernière visite, gardée sur l'appareil), puis les cases prises depuis rejouées dans l'ordre en deux secondes sous une étiquette « Pendant votre absence » ; pas à la première visite de la semaine, ni pour qui demande moins de mouvement. Le moteur garde pour chaque case quand et sur qui elle a été prise (`taken`), la vue envoie celles du dernier jour. La nuit, une voile bleutée et « ☾ Nuit » sous le HUD.
- **Repères** : les villes en petits médaillons à leurs couleurs, anneau à la teinte de qui les tient ; le camp de départ de chacun en médaillon à son blason (le sien en or, plus grand, cerclé de ses troupes, respirant vermillon sous une menace ; ceux des voisins et alliés moyens, les autres petits). Les fronts en pointillés qui défilent vers leur cible (crème pour les autres), les siens et ceux qui le menacent avec leur force en pastille (or, vermillon), posée sur la prochaine case qu'ils prendront, avec le temps qu'il reste. **L'avancée prévue** : les cases que ces fronts prendront ensuite (douze au plus), en hexagones pointillés à leur couleur, la prochaine qui respire ; le serveur les calcule en rejouant la carte sur une copie, si personne n'agit (`forecastFronts`).
- **HUD** : dans la colonne de droite, sous la bourse, les troupes « 120 / 180 » et « Gloire · rang » ; dessous, la trêve et la fin de semaine, dont les lignes reviennent à la ligne dans la colonne sans jamais passer sur la gauche ; Guide, Escarmouche et Rejouer y font 44 px de haut. Pain et véhicules s'effacent.
- **Toucher la terre** : la case sous le doigt ; quand ce n'en est pas une qu'un front peut prendre, la plus proche à portée du doigt qui le peut (les cases sont petites avant de zoomer). Elle se cercle d'or ; viser une case du bord avive la grille.
- **Panneaux** (`ContextPanel`) : sans camp de départ, une invitation dorée au-dessus des portes, puis « M'installer ici » sur une terre libre. **Une case du bord** : sa terre ou son marchand, ce qu'elle coûte par case (ou, si un de ses fronts y va, l'heure où ses troupes y seront), un curseur de 10 à 100 % des troupes avec les soldats et les cases à prendre environ (vermillon si rien) et la défense qui restera à ses terres par case, « Attaquer » en or, « Rappeler » si un de ses fronts y va, l'alliance. **Un marchand** : ses cases et sa force ; Proposer ou Accepter l'alliance ; pour un allié, Envoyer (un quart de ses troupes, dans la limite du jour) et Rompre. **Le premier jour de la semaine** (placement) : sous le HUD, « Placement · la guerre dans … », et l'invitation à se poser dit le temps qui reste. Ensuite, sans camp : « La partie de la semaine a commencé » et le temps jusqu'à la prochaine ; un marchand qui a perdu toutes ses terres : « Vous avez perdu toutes vos terres », « Éliminé cette semaine » sous le HUD, la carte en spectateur. **Ses terres** : cases, troupes et maximum (barre) ; trois boutons, leur prix en pastille : « Max +20 » (or, le maximum relevé pour des ducats ; il ne donne pas de troupes, la ligne de recrutement le dit), Fort (sur la case touchée), Décret ; une ligne qui dit le recrutement (« Vos terres recrutent 13 troupes par heure : maximum dans 3 h 29 ») ou, au maximum, que seuls les ducats le relèvent ; ses fronts, un par ligne (« ⚔ 20 → Terre libre · 59 min », Rappeler) ; l'heure où un front ennemi prendra la case touchée. Le nom italien rocca ne paraît plus à l'écran : le Fort (dans le code `rocca`) ; le Village a disparu. **HUD des troupes** : « ⚔ 20 / 60 » et « +13/h » en vert d'eau (la nuit, « ☾ +13/h à 8 h » en crème : on ne recrute pas), un fil de lumière au pied de la pastille qui se remplit jusqu'au maximum. **Attaque** : sous le curseur, le bilan prévu (« 20 troupes → 1 case (−18) · 2 reviennent »), la durée de marche (de jour seulement) ; contre un marchand seulement, et s'il change, le nombre de défenseurs qui restera par case. **Fronts rentrés** : sans rien de touché, une carte au pied de l'écran liste les fronts rentrés depuis la dernière fois (« Terre libre : 2 cases prises, −16 troupes, 4 revenues », « Compris ») ; le moteur garde le compte de chaque front un jour (`returns`). Attaquer reste éteint tant que le curseur ne paie pas une case, avec la raison en vermillon (« Il faut au moins 18 troupes : montez le curseur », ou « attendez vos recrues » si toutes n'y suffisent pas).
- **Décret** (feuille) : celui en vigueur, puis les six décrets forts que le Signore pourrait imposer, avec leur cible (une marchandise, une ville) ; celui de la semaine ne peut pas être repris.

## Charger et partir

- **Charrette choisie** (`CartPanel`) : bord vert d'eau et croix en onglet ; nom, cale « 12/40 » et sa jauge, état (au comptoir, chargée pour…). Les villes qu'elle peut servir s'éclairent et leur route se dore, les autres s'estompent. Toucher une ville éclairée ouvre ses cargaisons ; toucher la ville de la cale prépare le départ.
- **Cargaisons** (`CargoSheet`) : feuille avec onglets Récompense, Distance, Ville ; une ligne par commande (pastille à cocher, marchandise, ville et durée, récompense en or), grisée avec sa raison quand elle ne va pas (autre ville, trop lourd, stock) ; la cale en bas avec sa jauge et ses commandes cochées ; « Prêt pour Vicence · 63 d ».
- **Départ** (`DeparturePanel`) : la route en pointillés vert d'eau jusqu'à la ville, « Départ vers Padoue · 10 s » et sa barre, les escortes en puces avec leur risque (choisir relance le compte), ✓ Partir et ✕ Annuler ; à zéro, la charrette part d'elle-même. Elle reste choisie : on la voit quitter le comptoir.

## Bon retour : le rapport de chaque visite

À chaque nouvelle session (après 30 minutes d'absence), une feuille « Bon retour au comptoir » dit ce qui s'est passé, en deux cartes : **Commerce** (le gagné en grand, puis une ligne par source et les livraisons arrivées ; « Rien de vendu » sinon) et **Terraferme** (la Gloire et le rang en tête ; les cases prises en vert d'eau, perdues en vermillon, les fronts rentrés et ce qu'ils ont coûté, les troupes « 40 / 60 · +13/h sur 7 cases », ou l'élimination). Le bouton du pied récolte et relance les ateliers. Les cases viennent du dernier changement de main de chaque case (`taken`), les fronts de leur compte (`returns`).

