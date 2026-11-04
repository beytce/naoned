# Audit des experts du 4 novembre 2026 : synthèse et plan

Cinq experts, en lecture seule, sur les mêmes captures (parcours de l'empire en 390×844 et 320×568, carte 3D, Porta ; passe PC 1440×900 pour l'UI) et sur le code. Rapports complets à côté de ce fichier :

| Rapport | Bloquants | Majeurs | Mineurs |
|---|---:|---:|---:|
| rapport-3d.md : 3D temps réel (three.js, R3F, perf mobile) | 3 | 10 | 12 |
| rapport-motion.md : motion design, game feel | 3 | 10 | 10 |
| rapport-blender.md : Blender, assets et pipeline | 3 | 10 | 8 |
| rapport-ux.md : UX mobile free-to-play | 2 | 10 | 14 |
| rapport-ui.md : UI et direction artistique | 3 | 9 | 5 |

Limite de la mesure : le conteneur n'a pas de GPU (WebGL logiciel). Les chiffres de perf (96,5 % d'images au-dessus de 32 ms sous CPU ×4) sont pessimistes. Les appels de dessin, le poids des fichiers et le travail CPU sont fiables. Une mesure sur de vrais téléphones (`?perf=1`) reste à faire.

## 1. Ce qui tient depuis l'audit du 3 novembre

« Livrer » en 2 touchers, Lorenzo jusqu'à la Casa 2, ateliers visibles dans leur domaine, « Maison » ramène au fondaco, écran de chargement, filet `Guard3D` et repli SVG, 3D en précache, kit en cache, rendu à la demande de la carte, scène refaite seulement quand la carte change, zones de toucher séparées, un contour d'or par secteur, lagune au départ.

## 2. Les convergences (signalées par plusieurs experts)

| Thème | Experts | Constat |
|---|---|---|
| **La bataille de la Porta ne se lit pas** | 3D B2, UI U-13, motion M8-M9, Blender M5 | Figurines de 4 à 12 px, aussi grandes que les sapins, sans ombre ni marque de camp ; Rome d'un autre rouge que l'interface ; coups qui touchent avant le projectile, morts qui disparaissent d'un coup, saccades au moindre retard réseau ; bataille muette. Contraire à la règle d'or 8. |
| **L'or ne veut plus dire « à toi d'agir »** | UI U-1, UX M5, 3D M9 | 2 à 4 ors par écran (pilule de ville, « Rappeler », Lorenzo, « Casa 1 », sélections bordées d'or, onglet « Combat ») ; et le seul or qui compte (le secteur achetable) est un trait de 1 px. |
| **Le HUD et le cadrage mangent l'écran** | UI U-2, UX M7, 3D M8 et m11 | À 320 px, la bourse recouvre le nom de la Maison et Venise passe sous le HUD ; l'armurerie ne montre aucune arme ; sur PC le monde ne tient qu'un tiers de l'écran. La caméra ne connaît pas la zone utile entre le HUD et la feuille. |
| **Les actions clés ne se ressentent plus** | motion B1, M1-M3 ; UX M1 | La récolte de l'empire n'a aucun geste (`flyGoods` sans cible, caisses qui disparaissent) ; être payé ne fait rien (`settle()`) ; le bouton or ne répond plus au résultat ; un achat joue le son de la récolte ; le retour après 8 h est muet. |
| **Tout le jeu paie la 3D de la Porta** | 3D B1, B3, M1-M2 ; Blender M1-M4 | three.js et 3,3 Mo de modèles chargés au démarrage pour tous, même sur le repli SVG ; Porta et armurerie en rendu continu à 60 images/s au-dessus de la carte encore vivante (2 à 3 contextes WebGL) ; fuites de matériaux et `pointLight` qui recompile les shaders en combat ; `minis.glb` (2,2 Mo) non optimisé ; kit désindexé au chargement (×2 sommets). |
| **Le mouvement n'a pas de grammaire** | motion M7, B3 ; UI U-6 | ~44 animations CSS sur 63 et toutes les durées JS en dur ; la caméra ignore « réduire les animations » ; 4 ors différents et 110 couleurs en dur dans `empire/`. |
| **Le jeu n'a pas de visage vénitien** | Blender B3, M9 ; UI U-12 | Le fondaco est une maison KayKit à colombages avec une tour de château ; ni gondole, ni galère, ni Venise, ni Porta propre ; deux directions artistiques en concurrence (illustrations peintes et plateau KayKit). |
| **Le joueur perd le fil après la Casa 2** | UX B2, M2 | Plus aucun objectif visible ; Marché, Carnet et Famille restent des listes de texte. |

Seuls dans leur rapport, mais bloquants : un toucher au Marché achète sans verbe ni filet (UX B1 : la caisse passe de 328 d à 19 d) ; les sources de `minis.glb` et de l'âne ne sont pas dans le dépôt, et la provenance Quaternius n'est pas vérifiée (Blender B1, B2).

## 3. Le plan, en lots

Chaque lot : son plan détaillé validé avant de coder, un commit par correctif, captures avant et après, tests, lint, typecheck, e2e (`e2e:empire`, `e2e:map3d`, `porta`). Aucun lot ne touche à l'équilibrage, sauf le seuil d'absence (lot 5, réglage dans `worlds.settings`, annoncé dans les notes du chapitre). Effort : S ≤ ½ journée, M ≈ 1 à 2 jours, L ≥ 3 jours.

### Lot 0 · Filets et fuites (≈ 2 jours, tout en S)
Ce qui fait perdre de l'argent, de la batterie ou la session.
1. Marché : « Acheter 10 · prix » avec un verbe ; confirmation au-delà de 25 % de la caisse, ou annulation pendant 5 s (UX B1).
2. `PortaScene`, `ArmsScene` en `lazy()` ; `useGLTF.preload` déplacés au montage de la carte et de la Porta ; test de taille du paquet principal (sans `WebGLRenderer`) et garde du précache à 2,5 Mo (3D B1, M10).
3. Porta et armurerie en `frameloop="demand"`, bataille plafonnée à 30 images/s ; carte gelée sous un calque 3D plein écran (3D B3).
4. `glow()` mémoïsé, torche sans `pointLight`, anneau de chargement en géométrie unique (3D M1, M2).
5. Bataille en repli sur `Battle.tsx` au lieu de recharger la page (3D M7).
6. Messages justes : « Il manque 22 bois », Lorenzo jamais tronqué, plus d'« onglet Compagnie » ; bourse en ducats entiers (UX M3, M4, M7).

### Lot 1 · Un seul or, un HUD léger (≈ 4 jours, M)
1. Un arbitre `GoldSlot` et un test e2e « au plus un or actif par écran » ; « Rappeler », « Sortir par la porte », sélections en lapis ou fantôme (UI U-1, UX M5).
2. Contours d'or en rubans de 0,6 à 0,8 u, au lieu de traits de 1 px (3D M9).
3. Bourse d'une ligne, Faveur et Sceaux cachés à 0, revenu du jour seulement sur un jour plein, grille sans chevauchement à 320 px (UI U-2, UX M7).
4. Vrai état désactivé (texte `muted` à 6,2:1, plus d'`opacity-35`), lagon et lapis rendus à leur rôle, textes sous 12 px remontés (UI U-5, U-7, U-9).
5. Lecteur d'écran : valeurs du HUD lues, gains annoncés (`aria-live`) ; état « Hors ligne » et nouvel essai (UX M8, M10).

### Lot 2 · Cadrer la zone utile (≈ 3 jours, M)
1. `camera.setViewOffset` mesuré entre le HUD et la feuille, pour la carte, le domaine, l'armurerie et la Porta (3D M8, m11 ; UI U-2).
2. Armurerie : socles devant la halle, véhicule absent figuré (silhouette, « à la Porta »).
3. Noms de la carte à taille d'écran fixe (au lieu de ~8 px au dézoom) ; pilules ancrées au modèle (UI U-3, U-12).
4. PC 1440×900 : zoom de départ plus fort, panneaux en bas à droite, focus des ronds du pied (UI U-14).

### Lot 3 · Le retour d'action (≈ 5 jours, M)
1. `motion.ts` : jetons de durée et de courbe (`--t-tap` 90 ms … `--t-moment` 900 ms), générés en CSS, et `motion.test.ts` (rapport motion § 6) ; `feedback.ts` : intention → son, vibration, animation.
2. Mouvement réduit complet : caméra en fondu de 120 ms, montée du domaine coupée (motion B3).
3. La moisson en 3D : les caisses sautent, les marques volent au magasin, arpège au toucher (motion B1).
4. Être payé : pièces vers la bourse, `Odometer`, son et vibration à l'arrivée (motion M1).
5. Retour optimiste juste : `pressResult` dans l'empire, le bon son pour chaque action (motion M2, M3).
6. Sorties du domaine et de la Porta en fondu ; l'âne tourne et change d'allure en douceur (motion M5, M6).
7. Monde vivant au repos : régime ambiant à 12 images/s pendant 90 s, puis une pose de repos, au lieu de figer au bout de 10 s (motion B2).

### Lot 4 · Une bataille qui se lit (≈ 6 jours, M à L)
1. Figurines ×2 à ×2,5 (au moins 28 px à 390 px de large) ou caméra plus proche ; décor réduit de moitié et plus bas que les unités ; ombre au sol et anneau de camp ; pion à taille d'écran fixe (3D B2, UI U-13).
2. Mise à l'échelle des figurines par le corps, pas par la coiffe (Blender M6) ; pins sous l'église.
3. PV crème puis cinabre, un seul rouge de Rome, composants en entier.
4. Rythme : tampon d'interpolation, `BEAT` lu du serveur, projectile qui arrive avant le coup, fondu des morts, carreau distinct du boulet (motion M8, M9 ; 3D m6, m7).
5. Son et vibration de la Porta ; fin de bataille mise en scène (victoire, défaite, reliques), toujours abrégeable (motion M4).
6. La Porta dans les trois profondeurs : on y plonge comme dans un domaine, ses commandes restent au-dessus du décor, « Entrée : gratuite » (UX M9).

### Lot 5 · Le fil du joueur (≈ 5 jours, M ; décisions du porteur)
1. Après la Casa 2, un ruban de 3 jalons (Casa suivante, meilleure commande, Carnet), qui ouvre un lieu, sans bouton en or (UX B2).
2. Retour d'absence dès 2 à 3 h (réglage dans `worlds.settings`), en moment visuel de 3 s puis « Tout ramasser » (UX M1).
3. Notifications opt-in, trois sortes : files pleines, commande, chantier fini (UX M1).
4. Marché ouvert sur ce qu'on tient et ce que les villes demandent ; Carnet à 3 objectifs ; Famille masquée avant sa Casa ; marques de marchandises à 20 px au moins avec leur pictogramme (UX M2, M6 ; UI U-10).

### Lot 6 · Perf et pipeline des assets (≈ 5 jours, S à M)
1. Sources des figurines et de l'âne versées (Git LFS) ou référencées (`art-src/models/SOURCES.json` : URL, commit, SHA-256) ; script de l'âne ; empreintes Quaternius vérifiées contre l'archive officielle (Blender B1, B2).
2. `minis.glb` allégé : canaux statiques, os d'IK et accessoires inutiles retirés, couleurs, poids et normales en 8 bits ; 2,2 Mo → ~1,2 Mo, sans WebAssembly (Blender M1-M3, 3D M5).
3. Kit gardé indexé, attributs partagés entre variantes (Blender M4, 3D m2).
4. Âne et cheval en une primitive ; fumées en un `InstancedMesh` ; matériaux libérés au démontage (3D M6, m3).
5. Paliers de qualité : dpr, composer coupé, `TiltShift2` monté seulement de près, ombres 1024, détection d'un rendu logiciel au démarrage, SVG proposé sous 10 images/s (3D M3, M4).
6. Échelle unique (1 u = 1 m, table d'exagération) ; `check-models.mjs` en CI ; `export.py` Blender en ligne de commande (Blender M5, M10).
7. Mesures sur un Android d'entrée de gamme et un iPhone ancien, avant et après.

### Lot 7 · Le visage vénitien (L, en sous-lots M ; après la décision de DA)
Dans l'ordre du rapport Blender (§ 6) : atlas-palette maison (A2), **fondaco vénitien** (A1), mule bâtée et cheval sur un squelette commun (A3), gondole et burchio (A4), villes vénitiennes (A5), Porta de Rome (A6), ateliers des métiers (A7), marchandises en 3D (A8), LOD des bâtiments gardés (A10) ; vignettes 2D rendues depuis Blender (A12). La galère (A9) plus tard.

### Ordre conseillé
Lot 0, puis lots 1 et 2 ensemble (tous deux sur le HUD et la caméra), puis lot 3, puis lot 4. Le lot 6 peut avancer en parallèle (il ne touche que la 3D et les outils). Le lot 5 attend les décisions ci-dessous ; le lot 7, la décision de DA.

## 4. Décisions du porteur

Le 4 novembre 2026, le porteur a répondu oui aux sept questions et lancé les lots.

1. **Ruban de jalons après la Casa 2** : des jalons qui ouvrent un lieu, sans or, respectent-ils « plus aucun bouton ne joue à la place du joueur » ?
2. **Notifications** (renvoyées en IDEAS.md le 3 novembre) : les reprendre, en opt-in, limitées à trois sortes ?
3. **Seuil du retour d'absence** : 12 h aujourd'hui ; 2 ou 3 h, en réglage ?
4. **Confirmation d'achat au Marché** : elle ne change pas les règles ; peut-elle partir sans note du chapitre ?
5. **CSP** : autoriser `'wasm-unsafe-eval'` pour la compression meshopt (×3 à ×5 sur les trois `.glb`) ?
6. **Direction artistique** : la 3D fait-elle foi pour tout ce qui est dans le monde, les illustrations peintes étant réservées aux portraits, reliques et cartes ?
7. **Porta** : l'ouvrir comme un domaine (trois profondeurs) plutôt qu'en scène plein écran ?

## 5. Ce qui est fait (4 novembre au soir)

Tout est sur la branche `claude/audit-experts-2026-11-04`, un commit par correctif. Tests (1 377), lint et typecheck au vert ; e2e `empire`, `porta` et `map3d` passés (le parcours `map3d` plante, comme avant ces lots, à l'enregistrement de sa vidéo : le Chromium du conteneur et le Playwright du dépôt ne sont pas de la même version ; une étape d'attente d'`empire` est parfois en retard au premier essai).

| Lot | Fait | Reste |
|---|---|---|
| 0 | Confirmation d'achat au Marché (au-delà d'un quart de la bourse) ; 3D de la Porta chargée à sa première ouverture (paquet de départ 2,46 → 1,53 Mo, vérifié au build) ; Porta, armurerie et bataille à la demande à 30 images/s, carte endormie dessous ; matériaux de la bataille gardés, torche sans lumière ; bataille en 2D si la 3D échoue ; messages justes ; bourse en ducats entiers, Faveur et Sceaux cachés à 0 | — |
| 1 | Arbitre « un seul or » (test e2e à chaque capture) ; sélections, minuteurs et badges en lapis ou crème ; ruban d'or de 0,75 u ; état désactivé lisible ; lagon réservé au « prêt » ; textes sous 12 px remontés ; HUD lu par un lecteur d'écran ; état hors ligne | Revenu du jour « seulement sur un jour plein » (demande une donnée du serveur) |
| 2 | Bande utile entre le HUD et le pied (carte, secteur de départ, domaine) ; Porta et armurerie cadrées entre leur tête et leur feuille ; noms de la carte à 12 px à tout zoom ; panneaux en bas à droite sur PC | Pilule au-dessus du modèle 3D (UI U-12) |
| 3 | `motion.ts` et jetons CSS tenus par un test ; caméra coupée en mouvement réduit, élan à l'horloge ; moisson visible (marques lancées des ateliers au fondaco) ; bouton or frappé ou secoué à la réponse ; sons justes (achat, départ) ; paiement à l'arrivée ressenti ; vie de la carte 90 s à 12 images/s ; âne qui tourne et change d'allure en douceur | Sorties du domaine et de la Porta en fondu (M5) ; compteur de bourse animé |
| 4 | Unités ×1,9 avec ombre, décor réduit de moitié, premier cadrage deux fois plus près sur ses véhicules ; figurines mises à l'échelle par le corps ; un seul rouge de Rome, PV crème puis cinabre, composants en entier ; rythme mesuré sur les instantanés, coup senti à l'arrivée du carreau, morts qui s'enfoncent ; sons et vibrations ; retour de la Porta mis en scène | La Porta ouverte comme un domaine (décision 7 : refonte de sa navigation, effort L, à planifier) |
| 5 | Retour d'absence par réglage (`empire.away.afterMinutes`, 150 à Venise), dans les notes du chapitre ; trois jalons après la Casa 2 ; notifications opt-in (file finie, chantier fini, ville pleine), réglées dans la feuille de la Maison | Marché « ouvert sur ce qu'on tient », Carnet à 3 objectifs (équilibrage : simulateur de 24 mois), Famille masquée avant sa Casa (non fait : le moteur ne la rattache à aucune Casa et le parcours e2e montre ses traits dès la Casa 1 ; à trancher) |
| 6 | Kit gardé indexé (moitié des sommets) ; paliers de qualité (rendu logiciel détecté, sans effets au palier bas, tilt-shift seulement de près) : images > 32 ms 96,5 → 82,3 %, p95 500 → 83 ms (CPU ×4, sans GPU) ; `minis.glb` allégé (2,14 → 1,27 Mo) ; meshopt sur les trois modèles et CSP `'wasm-unsafe-eval'` ; `SOURCES.json` avec les empreintes ; test des modèles servis | Âne en une primitive, fumées instanciées, LOD, accessoires fusionnés, os d'IK retirés (demandent les sources) ; empreintes Quaternius à comparer à l'archive officielle ; script de l'âne ; mesures sur de vrais téléphones |
| 7 | Fondaco vénitien maison (arcades sur l'eau, pierre d'Istrie, merlons, toit d'or, tourelle, cheminée en entonnoir) ; gondole amarrée à chaque ponton | Atlas-palette, mule bâtée, villes vénitiennes, Porta de Rome, ateliers des métiers, marchandises en 3D, vignettes rendues depuis la 3D, galère : à modéliser (Blender, absent du conteneur) |
