# Audit motion design (4 novembre 2026)

Expert : motion design jeu et interface (animation d'UI, game feel, timing, chorégraphie, figurines 3D, accessibilité du mouvement). Audit en lecture seule du code de `apps/web` à `b9297e3` et des captures mobiles du parcours (`shots/map3d`, `shots/empire`, `shots/porta`, 390 × 844 et 320 × 568). Aucune vidéo n'était disponible (`shots/map3d/video-tmp` est vide, le log montre une page fermée en cours d'enregistrement). Les constats sur le mouvement viennent donc de la lecture du code (boucles `useFrame`, keyframes, durées) et sont recoupés avec les images fixes.

Référence : règle d'or 8 (« Tout se voit »), docs/design.md § Mouvement, audit du 27 octobre (`docs/audit-animations-2026-10-27.md`), synthèse de la carte du 3 novembre.

---

## 1. Résumé

Le **plateau 3D a de la matière** : eau animée par un shader, fumées, fanion d'or, moulins, âne de Quaternius qui marche et se repose, montée des tuiles du domaine en anneaux, figurines KayKit de la Porta avec fondus enchaînés de 0,2 s, projectiles et dégâts qui montent. Les durées de base sont définies en jetons depuis le 27 octobre, et `test/motion.test.ts` interdit les animations mortes.

Mais **le passage au monde persistant et à la 3D a fait perdre les acquis de « la boucle »** obtenus pour le jeu mensuel en octobre. Dans l'empire :

- la récolte ne fait voler aucune marchandise : `flyGoods` ne trouve aucune cible et ne fait rien ;
- le bouton or ne frappe plus et ne refuse plus : `pressResult` n'est jamais appelé ;
- la bourse ne roule pas : la valeur change d'un coup ;
- l'arrivée d'une mule n'a ni son, ni vibration, ni pièces vers la bourse ;
- toute la Porta, combat compris, est **muette et sans vibration**.

À cela s'ajoutent trois défauts de structure :

1. **Le monde se fige 10 s après le dernier toucher** (`AWAKE_MS`). Fumée et eau s'arrêtent en plein mouvement : la carte « vivante » est une photo dès qu'on la regarde sans y toucher.
2. **La caméra ignore `prefers-reduced-motion`** : plongées et glissés de 450 ms, qui zooment tout l'écran, sont le premier déclencheur vestibulaire.
3. **La grammaire du mouvement n'est qu'à moitié appliquée** : environ 44 règles CSS sur 63 écrivent leur durée et leur courbe en dur, et aucune durée JS ne passe par un jeton.

Verdict : une bonne base technique et un plateau beau en capture, mais un retour d'action **plus pauvre qu'avant la 3D** sur les gestes qui comptent (récolter, livrer, être payé, combattre). C'est le chantier prioritaire : il est surtout fait de rebranchements (effort S à M), pas de création.

---

## 2. Ce que l'audit du 27 octobre a corrigé, ou non

| N° 27/10 | Sujet | État au 4 novembre |
|---|---|---|
| A1–A8 | Bouton or en pièce frappée, pression, focus, panneau | **Corrigé** (lot 1). Mais la frappe et le refus (`pressResult`) ne sont branchés que dans `game/Game.tsx:485-517`, pas dans l'empire (voir M2). |
| B1 | Classes mortes | **Corrigé**, et protégé par `test/motion.test.ts`. |
| B2 | Sorties des fenêtres | **Corrigé** pour les feuilles et l'orbite (`useLeaving`, `ui.tsx:714`). **Non** pour le domaine 3D, la scène de la Porta et la bataille, qui disparaissent d'un coup (M5). |
| B3 | Retour optimiste | **Corrigé** dans le jeu mensuel. **Régression** dans l'empire : `act` attend le serveur avant `feel` (`EmpireGame.tsx:185-196`). Seul le tick haptique du `Slab` part au toucher. |
| B4 | La récolte montre ce qu'elle rapporte | **Régression** : aucun `data-goods-from` ou `data-goods-to` dans `empire/`, donc `flyGoods` sort sans rien faire (`game/fx.tsx:128`, `:187`) (B1 ci-dessous). |
| B5 | Le bon retour court | Remplacé dans l'empire par `useAwayRecap` (`EmpireGame.tsx:986`) : les pièces volent depuis chaque ville. **Partiel** : ni son, ni total qui court. |
| B6 | Fin de saison | Sans objet dans l'empire persistant. Le moment équivalent, la Casa atteinte (`Moment.tsx`), tient en un `orbit-in` de 420 ms (m4). |
| B7 | Orbite depuis l'astre | **Corrigé** en 2D. En 3D, la caméra plonge vers le domaine, ce qui est juste. |
| B8 | Une courbe, pas de jetons | **Partiel** : 5 jetons existent, répartis dans deux blocs `:root` (`index.css:234` et `:1205`). Environ 44 règles et toutes les durées JS restent en dur (M7). |
| B9 | Carte figée | **Partiel** : la 3D vit, mais seulement 10 s après un toucher (B2). |
| B10 | Mouvement réduit trop brutal | **Non corrigé** : `index.css:246` coupe toujours toute animation à 0,01 ms, et la caméra JS n'est pas couverte du tout (B3). |

---

## 3. Inventaire

**CSS** (`index.css`, 63 règles `animation:`). Elles se rangent en familles :

- ballots (11) ;
- orbite et soleil (8) ;
- feuilles et voile (4) ;
- HUD (5) ;
- `Slab` : reflet, attente, frappe, refus (4) ;
- pied de carte (`slot-in` et `slot-out`) ;
- arrivée (`hop-ring`, `hop-wave`, `hop-jump`, `hop-rise`, `hop-coin`) ;
- pose d'un comptoir (`post-fill`, `post-burst`, `post-wave`) ;
- plateau (`plateau-wave`, `plateau-fog`, `plateau-flag`, `mist-drift`) ;
- ville (`city-wanted`, `city-pill-breathe`) ;
- Porta (`battle-closing`, `battle-damage`, `porta-in`, `porta-relic`).

**Tailwind** : `floaty`, `rise`, `fade`, `sheet`, `pop`, toutes en dur (`tailwind.config.js:57-63`).

**WAAPI** (`game/fx.tsx`) : pièces vers la bourse (720 ms et 60 ms d'écart), onde d'une ville (900 ms), marchandises en arc, gain qui monte (1 400 ms).

**3D, carte** (`map3d/`) :

- eau : shader dont `uTime` avance (`life.tsx:181-222`) ;
- fumée : 5 bouffées, soit 5 matériaux transparents par cheminée (`life.tsx:83-131`) ;
- fanion : sommets recalculés et `computeVertexNormals` à chaque image (`life.tsx:134-178`) ;
- moulins : un tour en 8 s (`props3d.tsx:199`) ;
- âne : mélangeur d'animations Walk et Idle (`life.tsx:43-71`, `fleet3d.tsx:56-83`) ;
- montée du domaine : 0,45 s, cubique, par anneau (`Board3D.tsx:943-967`) ;
- caméra : glissé de 450 ms en sortie cubique avec zoom logarithmique, élan au doigt (`useCamera.ts:98-131`, `:357`).

**3D, Porta** (`porta/Battle3D.tsx`) :

- trajet linéaire sur un battement de 250 ms (`:221`, `:524-548`) ;
- regard amorti à 0,2 par image ;
- projectiles en ligne et boulets en arc (380 ms), étincelles (220 ms) ;
- anneaux de trompette et de chirurgien ;
- anneau de chargement ;
- figurines : fondu enchaîné de 0,2 s, cheval 0,25 s (`minis.tsx:186`, `:265`) ;
- flamme de torche avec `pointLight` (`figure.tsx:250`).

**Son** : 5 sons synthétisés et un carillon pentatonique (`sound.ts`). L'empire n'en utilise que 3 (`harvest`, `coin`, `bell`). `cart`, `stamp` et `chime` y sont absents.

**Haptique** : 4 motifs (`haptics.ts:6`). Sur iPhone, un seul tick quel que soit le motif.

---

## 4. Constats

### Bloquants

**B1. La récolte de l'empire n'a aucun geste visuel.**
- Preuve : `feel()` appelle `flyGoods(gains)` (`EmpireGame.tsx:656`). Or `grep data-goods- src/empire` ne renvoie rien. `flyGoods` puis `flyFromPlace` sortent tout de suite (`game/fx.tsx:128-131`, `:186-188`).
- Côté 3D, les caisses « prêt » de l'atelier se démontent d'un coup (`Board3D.tsx:1040-1057`), et l'étiquette « +n » devient une minuterie.
- La récolte est l'action la plus répétée du jeu, et elle ne se voit pas : c'est une violation directe de la règle 8.

**B2. Le monde se fige dès qu'on le regarde.**
- Preuve : `AWAKE_MS = 10_000` et `Ticker` (`Board3D.tsx:477-508`). Passé ce délai, plus aucune image n'est demandée.
- Fumée, eau, fanion et moulins s'arrêtent **à mi-course** : une bouffée reste suspendue en l'air, puisque `Smoke` ne revient à sa pose de repos que si `!live` (`life.tsx:121`).
- Sur un jeu « que l'on ouvre plusieurs fois par jour pour regarder son empire », l'état de repos est justement celui que l'on voit le plus.
- Économiser la batterie est légitime, mais le moyen choisi (tout ou rien) détruit l'effet recherché.

**B3. La caméra ignore le mouvement réduit.**
- Preuve : aucun `matchMedia` dans `useCamera.ts`. `easeTo` glisse toujours 450 ms, avec un zoom pouvant aller jusqu'à ×5 : plongée dans le domaine, « Maison », double toucher, suivi d'un véhicule. L'élan continue aussi après le lâcher.
- La montée des tuiles du domaine joue elle aussi en mode réduit, car elle appelle `invalidate()` elle-même (`Board3D.tsx:966`).
- C'est le premier déclencheur de malaise vestibulaire (WCAG 2.3.3, et pratique courante sur iOS et Android).

### Majeurs

**M1. Être payé n'a pas de récompense en direct.**
- À l'arrivée, `Fleet.tsx:112-149` affiche les anneaux, le saut et « +d », puis appelle `settle()`, qui fait `take(answer)` sans `feel` (`EmpireGame.tsx:198-213`).
- Il n'y a ni son de pièce, ni vibration, ni pièces vers la bourse, et le chiffre de la bourse change sans battement.
- Le seul vol de pièces est celui du retour d'absence, et il est muet.
- Or le paiement est le sommet de la boucle livrer → être payé.

**M2. Le bouton or ne répond plus au résultat dans l'empire.**
- `pressed()` mémorise bien le bouton (`ui.tsx:77`), mais `pressResult` n'est appelé que dans `game/Game.tsx`.
- « Livrer », « Récolter », « Bâtir » et « Améliorer » ne frappent donc jamais, et ne refusent jamais. Une erreur ne produit qu'un toast 3,2 s plus tard, en haut.

**M3. Le retour d'action arrive après le serveur, et il ment parfois.**
- `act` fait `await` puis `feel` (`EmpireGame.tsx:185-196`), soit 100 à 400 ms de silence sur mobile.
- `feel` déduit le son d'un écart de stock : **acheter au marché joue « harvest » et la vibration « success »**, et dépenser ne fait rien.
- « Livrer » et « Partir » ne jouent jamais le son `cart`.

**M4. La Porta est muette, et la victoire comme la défaite ne sont pas mises en scène.**
- Aucun `sound` ni `haptic` dans `empire/porta/`.
- Fin de bataille : une ligne de texte et un `Slab` (`BattleDiorama.tsx:203-209`).
- Retour : des carrés de relique de 16 px qui apparaissent en `porta-relic` à 120 ms d'écart (`PortaScene.tsx:213-238`). Le cadre `porta-back` lui-même n'a pas d'animation.
- Une relique légendaire et une commune se reçoivent de la même façon. C'est le mode « en direct, une dizaine de minutes », celui qui devrait être le plus intense.

**M5. Les sorties en 3D sont des coupes franches.**
- `leave()` fait `setOpened(null)` tout de suite (`EmpireMap.tsx:399-404`) : `Domain3D` se démonte et la carte réapparaît d'un coup (règle `[data-domain]`) pendant que la caméra glisse encore 450 ms. On voit un saut de décor au milieu d'un mouvement.
- Même chose à la fermeture de `PortaScene`, qui n'a qu'un `porta-in`, et de la bataille.
- Cela viole la règle de design.md « Toute entrée a sa sortie, plus brève ».

**M6. Les véhicules tournent et changent d'allure sans transition.**
- `rotation.y` reçoit directement le cap de la route (`fleet3d.tsx:65`) : à chaque coude, et à l'arrivée en orbite, l'âne pivote en une image.
- Le passage de Walk à Idle se fait par des poids 0/1 (`fleet3d.tsx:69-71`, `figure.tsx:188-191`), donc saute d'une pose à l'autre, alors que `minis.tsx` sait déjà faire des fondus enchaînés.
- La cadence de la marche ne suit pas la vitesse au sol (`mixer.update(dt)` à vitesse fixe) : les sabots glissent.

**M7. La grammaire du mouvement est déclarée mais pas tenue.**
- Environ 44 animations CSS sur 63 écrivent durée et courbe en dur : `ease-out`, `ease-in-out`, plusieurs `cubic-bezier` presque identiques (`index.css:836`, `:859`, `:905`, `:931`).
- Les jetons sont répartis en deux blocs `:root`.
- En JS, rien n'est tokenisé : 450 (`useCamera.ts:123`), 720, 900 et 1 400 (`fx.tsx`), `BEAT=250`, 380, 220 et 450 (`Battle3D.tsx`), `RISE=0.45`, 0,22 et 0,2 s (feuille au doigt, `ui.tsx:752`, `:784`), 3 200 (toast).
- `--t-moment` vaut 420 ms dans `index.css:1207`, alors que l'audit du 27/10 le fixait à 900–1 400 ms : un « moment » dure aussi peu qu'une entrée.
- `motion.test.ts` ne vérifie pas les jetons, alors que design.md l'affirme (« Une nouvelle règle les prend »).

**M8. Le combat saccade à chaque irrégularité du réseau, et le coup touche avant le projectile.**
- Interpolation : chaque unité va de `from` à `to` en exactement 250 ms, puis s'arrête (`Battle3D.tsx:243-260`, `:529`). Un paquet qui arrive 30 ms en retard donne 30 ms d'arrêt. Il n'y a ni tampon ni extrapolation, et `BEAT` est en dur alors que `stepMs` est un paramètre (`settings.ts:146`).
- Synchronisation : `hurt` déclenche `Hit_A` au début du battement, alors que le carreau met 380 ms à arriver (`Battle3D.tsx:518-522`, `:745-750`). L'effet arrive avant la cause.
- Le chiffre de dégâts naît lui aussi au début du battement (`BattleDiorama.tsx:325-337`).

**M9. Les morts disparaissent sans fondu.**
- Le commentaire de `Battle3D.tsx:6` promet « a dead man falls and fades ».
- En réalité, `return null` intervient au bout de 3 s (`:550`) : après `Death_A`, le corps disparaît d'une image à l'autre.

**M10. Le coût des animations est mal placé.**
- `frameloop="always"` en bataille, avec `antialias: true` et `dpr` 1,5 (`Battle3D.tsx:293-296`). Sur un écran 120 Hz, cela fait 120 images/s, sans plafond.
- Une `pointLight` par torche (`figure.tsx:262`) : chaque incendiaire qui apparaît ou meurt change le nombre de lumières et **recompile les shaders de toute la scène**, d'où un à-coup en plein combat.
- L'anneau de chargement reconstruit sa géométrie à chaque battement (`Battle3D.tsx:694-704`).
- `city-pill-breathe` anime `box-shadow` (`index.css:1557`) : la pilule est repeinte à chaque image, contre la règle « transform et opacity seulement ».
- Barres en `transition-[width]` sur 1 000 ms linéaires (`VehiclePanel.tsx:125`) et `transition-all` (`ui.tsx:432`, `:512`).

### Mineurs

- **m1. L'élan de la carte dépend de la fréquence d'image** : `v*16` et `*0.92` par image (`useCamera.ts:110-113`). Un lancer va deux fois plus loin, et s'arrête deux fois plus vite, à 120 Hz qu'à 60 Hz.
- **m2. Ombres figées** : l'ombre des ailes de moulin et de la fumée (le moulin porte `castShadow`) ne bouge pas, car `shadowMap.autoUpdate=false`.
- **m3. Chargement en or** : la carte et la bataille attendent derrière un spinner or (`EmpireMap.tsx:680`, `BattleDiorama.tsx:48`), alors que l'or est réservé à l'action. Rien ne dit ce qui se prépare.
- **m4. La Casa atteinte**, plus haut moment de la progression, tient en un `orbit-in` de 420 ms, une cloche et un tick. Les ouvertures (✦) arrivent d'un bloc, sans cascade, sans éclat.
- **m5. L'anneau de vie en bataille** saute par dixièmes (`HP[Math.round(share*10)]`, `Battle3D.tsx:557`), sans trace de la vie perdue.
- **m6. La montée du domaine** agrandit chaque tuile depuis un point (`scale.setScalar`), sans qu'elle monte du sol : on lit « apparaît » plutôt que « se soulève ».
- **m7. Le chantier en 3D** n'est que deux caisses immobiles. L'avancement ne se lit que dans la minuterie.
- **m8. iOS** : `iosTick` ignore le motif, si bien que succès, avertissement et alarme se sentent pareil.
- **m9. `porta-in`** sort de 1,08 vers 1 en `ease-out` brut, sans `porta-out`. `battle-damage` est en `ease-out` brut.
- **m10. Le mode réduit** coupe aussi les fondus utiles (B10 du 27/10), et les boucles infinies finissent figées sur leur dernière image.

---

## 5. Recommandations détaillées

### R1. La moisson en 3D, et la marchandise jusqu'au magasin (B1) · effort M
1. **Au toucher**, sans attendre le serveur :
   - jouer `chime(i)` pour chaque atelier prêt, en arpège de 70 ms ;
   - vibration `tap`.
2. **Sur le plateau** :
   - les deux caisses de l'atelier sautent : montée de 0,6 unité en 180 ms avec `--ease-out`, puis écrasement 1,15 × 0,85 ;
   - elles se dissolvent en 220 ms avec `--ease-in` ;
   - l'anneau lagune émet une onde : échelle 1 → 1,8, opacité 0,9 → 0, en 500 ms.
3. **Vers le HUD** : un `GoodsMark` de 20 px part du point projeté de l'atelier, en suivant la position au sol en temps réel comme `fleetSpots` le fait. Il trace un arc dont la hauteur vaut 30 % de la distance, en 650 ms avec `--ease-travel`, 60 ms d'écart entre ateliers. Il arrive sur une puce « magasin », à ajouter au HUD du domaine (`data-goods-to`).
4. **La puce** fait un battement d'échelle 1 → 1,18 → 1 en 260 ms avec `--spring`, et le nombre court avec `CountUp`, 400 ms.
5. **Relance** : l'atelier recommence à fumer tout de suite. La fumée sort en 3 bouffées rapprochées : c'est le signe de la relance.

### R2. Un monde qui vit au repos, à budget fixe (B2) · effort M
- Remplacer le tout ou rien par **trois régimes** :
  - **actif** : 30 images/s tant qu'un doigt touche ou qu'un véhicule roule ;
  - **ambiant** : 12 images/s pendant 90 s, sans AO ni ombres ;
  - **veille** : 0 image/s, quand l'onglet est caché, après 90 s sans toucher, ou si `navigator.getBattery` signale une batterie faible.
- **En veille, toujours revenir à une pose de repos** : bouffées remises à la base et opacité 0 en 400 ms, fanion à plat, eau qui ralentit (`uTime` ramené vers 0 sur 600 ms). Jamais d'arrêt sur une image en cours.
- **Option moins chère** : peindre une couche CSS de vaguelettes au-dessus du canvas en veille, comme le `plateau-wave` existant. Elle ne coûte presque rien au GPU.

### R3. Mouvement réduit complet (B3, m10) · effort S
- Créer `motion.ts` : `prefersReduced()` en lecture directe, plus un hook partagé (`useLive` existe déjà dans `Board3D.tsx:131`, à remonter).
- `easeTo` : en mode réduit, un **fondu enchaîné** à la place du déplacement. Capturer l'opacité du canvas, couper à la nouvelle caméra, puis fondre de 0,6 à 1 en 120 ms. Pas d'élan.
- Désactiver la montée du domaine et les arcs de pièces. Garder les changements d'état visibles : la pilule d'or reste or, le « +d » est affiché 1,2 s sans bouger.
- Remplacer la règle globale à 0,01 ms par une liste : couper `transform`, les boucles et les particules, et garder les fondus en 120 ms (`--t-fade-reduced`).
- Ajouter un réglage dans le Profil : « Effets : complets · sobres · aucun ».

### R4. Être payé (M1) · effort S
- Dans `Fleet.tsx` à l'arrivée, ou dans `settle()` quand `cash` monte :
  - `sound("coin")`, `haptic("success")` ;
  - `flyCoins(pay, { from: "[data-city=…]", note: ville })` ;
  - battement de la bourse.
- Chorégraphie, depuis T0 = arrivée de l'âne :
  - T0 : la caisse saute (`hop-jump`, 500 ms) ;
  - T0+250 : onde lagune ;
  - T0+400 : les pièces partent, 7 pièces à 60 ms d'écart sur 720 ms ;
  - T0+1 120 : la bourse bat et roule avec `Odometer`, déjà dans `ui.tsx:376`, à brancher sur la valeur `ducats` de `Hud.tsx`.
- Le « +d » qui monte reste en place. Supprimer `hop-coin`, qui fait doublon.
- Retour d'absence : même chose, avec un `chime` montant par livraison et un total qui court en 1,2 s.

### R5. Retour optimiste juste (M2, M3) · effort S
- Dans `act` de l'empire : `pressResult(!answer.error)` après la réponse.
- Au toucher, un son **par intention**, pas par écart de stock :
  - Récolter : `chime` ;
  - Livrer et Partir : `cart` ;
  - Bâtir et Améliorer : `stamp` ;
  - Acheter : `coin` inversé (nouvelle note descendante, plus sourde) ;
  - Refus : note grave de 160 Hz sur 180 ms, plus `haptic("warn")`.
- `feel` ne garde que les vols : marchandises et pièces.

### R6. Sorties en 3D (M5) · effort S
- `leave()` : passer à un état `leaving` de 260 ms.
- Les tuiles du domaine **redescendent en ordre inverse** : anneau extérieur d'abord, échelle Y 1 → 0, `--ease-in`, 40 ms d'écart.
- Pendant ce temps, la couche normale de la carte revient en fondu : opacité 0 → 1 en 260 ms, au lieu du `display:none`.
- Démonter seulement à la fin.
- Porta : ajouter `porta-out`, échelle 1 → 1,04 et opacité 1 → 0, 160 ms, `--ease-in`.

### R7. Âne et figurines (M6) · effort S
- **Lacet amorti** : `yaw += shortestAngle(target − yaw) · (1 − e^(−12·dt))`, soit environ 90 % du virage en 190 ms.
- **Allure** : `walking.crossFadeTo(resting, 0.25)` à l'arrivée et `resting.crossFadeTo(walking, 0.2)` au départ.
- **Cadence** : `walking.timeScale = vitesseSol / foulée`, où la foulée est la distance parcourue par un cycle Walk, mesurée une fois. Borner entre 0,6 et 1,6.
- **Départ et arrivée** : une petite anticipation au départ (l'âne se tasse de 4 % pendant 120 ms) et un **arrêt progressif** sur les 300 dernières ms du trajet (`ease-out` sur la position), plutôt qu'un arrêt net à vitesse pleine.

### R8. Combat lisible et en rythme (M8, M9, m5) · effort M
- **Interpolation avec tampon** : afficher l'état à `now − stepMs`, avec un tampon de deux instantanés et `stepMs` lu dans les données de la bataille, jamais en dur. Les unités avancent alors à vitesse constante. Si le tampon est vide, extrapoler 100 ms au plus.
- **Impact** : retarder `hit` et le chiffre de dégâts de la durée du vol (380 ms pour un carreau, 220 ms pour un coup au corps à corps). À l'impact :
  - éclair blanc sur la cible (émissif 0 → 1,5 → 0 en 90 ms) ;
  - **hit-stop** de 60 ms sur la cible seule (son mélangeur en pause) ;
  - recul de 0,3 unité en 120 ms avec `--spring`.
- **Unité à soi touchée** : `haptic("tap")`. **Unité à soi détruite** : `haptic("warn")`, plus une note grave.
- **Mort** : `Death_A` joue jusqu'au bout, le corps reste 1,5 s, puis s'enfonce (Y −0,8) et s'efface (opacité 1 → 0) en 600 ms avec `--ease-in`.
- **Vie** : l'anneau descend en 200 ms avec `--ease-out`, suivi d'une trace claire qui rattrape en 500 ms après 300 ms de pause : la vie perdue se lit.

### R9. Fin de bataille et retour de la Porta (M4) · effort M
Séquence de 3 à 4 s, abrégée par un toucher.

**Victoire ou sortie réussie** :
1. La caméra recule doucement : zoom ×0,85 en 900 ms avec `--ease-out` (en mode réduit, un fondu).
2. Le titre en Cinzel monte : 18 px en 360 ms.
3. Chaque relique sort de la mule en arc vers son coffre. Une relique toutes les 220 ms, une note du carillon par rareté : commune do, rare mi, précieuse sol, légendaire do aigu, avec un hit-stop de 80 ms et un halo or qui tourne.
4. Le bouton or entre en dernier, en 260 ms avec `--spring`.

**Perte** :
- vignettage cinabre, opacité 0 → 0,6 en 400 ms ;
- l'icône du véhicule perdu se fissure (`slab-nope` réutilisé) ;
- note descendante ;
- jamais de punition prolongée : 1,5 s au plus.

### R10. Coûts (M10, m1) · effort S
- Bataille : `frameloop="demand"` avec un `Ticker` plafonné à 30 images/s comme sur la carte. Après la fin, 0.
- Torches : remplacer la `pointLight` par un sprite additif émissif, sans lumière.
- Anneau de chargement : une géométrie fixe, avec `drawRange` ou un shader d'arc piloté par une variable.
- `city-pill-breathe` : remplacer l'ombre animée par un pseudo-élément halo animé en `transform: scale` et `opacity`.
- Barres : `transform: scaleX`.
- Élan : rendre la friction indépendante de la fréquence d'image, `v *= 0.92^(dt/16.67)` et déplacement `v·dt`.

### R11. Casa atteinte (m4) · effort S
1. Le voile entre en 260 ms.
2. Le palais monte de 24 px avec `--spring` en 520 ms.
3. 400 ms plus tard, « CASA n » se révèle lettre par lettre, 30 ms par lettre.
4. Chaque ouverture ✦ entre en cascade de 80 ms, avec un `chime` montant.
5. Le bouton or entre en dernier, et `--t-moment` passe à 900 ms.
6. Un éclat d'or derrière le palais, une seule fois : rotation de 20° et opacité 0 → 0,5 → 0 en 1,4 s.

### R12. Chargement (m3) · effort S
- Remplacer le spinner or par **une tuile qui se pose** : un hexagone lapis qui monte du bas avec `--spring`, en boucle de 900 ms, avec trois tuiles décalées de 150 ms. Le texte dit ce qui se prépare.
- Fondre le canvas à l'arrivée : opacité 0 → 1 en 260 ms, au lieu d'une coupe.

---

## 6. Système de tokens de mouvement proposé

Une seule source : `apps/web/src/motion.ts`, qui exporte les jetons pour le JS, les shaders et le moteur 3D, et **génère** les variables CSS (un bloc `:root` unique, injecté ou vérifié par test). Tailwind lit les mêmes valeurs (`transitionDuration`, `transitionTimingFunction`, `animation`).

### Durées

| Jeton | Valeur | Usage |
|---|---|---|
| `--t-tap` | 90 ms | enfoncement, tick |
| `--t-quick` | 160 ms | sorties, fiches, info-bulles |
| `--t-base` | 260 ms | entrées : feuilles, panneaux, pied de carte |
| `--t-camera` | 450 ms | glissé de caméra (court) |
| `--t-camera-far` | 700 ms | caméra de loin à près (×3 et plus) |
| `--t-travel` | 650–720 ms | vols : marchandises, pièces |
| `--t-impact` | 90 ms | éclair d'impact |
| `--t-hitstop` | 60 ms (80 pour la légendaire) | arrêt sur image |
| `--t-moment` | 900 ms | entrée d'une récompense |
| `--t-sequence` | 3 000–4 000 ms | fin de bataille, Casa (toujours abrégeable) |
| `--stagger` | 60 ms (pièces) / 80 ms (listes) / 220 ms (reliques) | cascades |
| `--t-fade-reduced` | 120 ms | seul mouvement gardé en mode réduit |

### Courbes

| Jeton | Valeur | Usage |
|---|---|---|
| `--ease-out` | `cubic-bezier(0.22,1,0.36,1)` | ce qui arrive |
| `--ease-in` | `cubic-bezier(0.55,0,0.75,0.4)` | ce qui part |
| `--ease-inout` | `cubic-bezier(0.65,0,0.35,1)` | caméra, allers-retours |
| `--spring` | `cubic-bezier(0.34,1.45,0.64,1)` | ce qui se pose |
| `--ease-travel` | `cubic-bezier(0.5,0,0.2,1)` | trajectoires |
| `--ease-breathe` | `ease-in-out`, période 2,4 s | respiration (or prêt) |

En 3D, une fonction `damp(current, target, λ, dt)`, avec λ = 12 pour la rotation et 8 pour la caméra suivie.

### Règles, vérifiées par `motion.test.ts`
1. Aucune durée ni courbe littérale dans `animation:` ou `transition:` du CSS : seulement `var(--t-*)` et `var(--ease-*)`, et la liste des boucles ambiantes en exception déclarée.
2. Aucun nombre magique de durée dans `useFrame`, `animate()` ou `setTimeout` d'effet : import depuis `motion.ts` (vérification par motif).
3. Toute `@keyframes` qui anime autre chose que `transform`, `opacity` ou `stroke-dash*` est refusée.
4. Toute entrée a une sortie plus brève, et chaque classe `*-in` a son `*-out`.
5. Toute animation porte sa règle de mouvement réduit, ou appartient à la liste « fondu gardé ».
6. **Un seul spectacle à la fois** : une file `fx.queue()` sérialise les moments (Casa, fin de bataille, retour d'absence) et les sépare de 300 ms.

### Couplage son et haptique

Une table `feedback.ts` : intention → { son, motif haptique, animation }. Les trois partent du même point d'appel, à l'instant du geste (intention) ou de l'impact (résultat), jamais à la détection d'un écart de stock.

---

## 7. Top 10 priorisé

| # | Action | Constat | Effort |
|---|---|---|---|
| 1 | Mouvement réduit complet : caméra en fondu, montée du domaine coupée, fondus de 120 ms gardés | B3, m10 | S |
| 2 | Moisson visible en 3D : caisses qui sautent, marques jusqu'au magasin, arpège au toucher | B1 | M |
| 3 | Être payé : son, vibration, pièces de la ville vers la bourse, `Odometer` sur la bourse | M1 | S |
| 4 | Retour optimiste et juste : `pressResult` branché, son par intention, achat ≠ récolte | M2, M3 | S |
| 5 | Monde vivant au repos : régime ambiant à 12 images/s pendant 90 s, pose de repos à la veille | B2 | M |
| 6 | Combat : interpolation avec tampon, impact synchronisé, hit-stop, mort qui s'efface | M8, M9 | M |
| 7 | Fin de bataille et retour de la Porta mis en scène, son et vibration dans toute la Porta | M4 | M |
| 8 | Sorties en 3D : le domaine se replie, la carte revient en fondu, `porta-out` | M5 | S |
| 9 | Âne : lacet amorti, fondus Walk/Idle, cadence calée sur la vitesse | M6 | S |
| 10 | `motion.ts` et test des jetons ; coûts (bataille à la demande, torches sans lumière, pilule sans ombre animée, élan indépendant de la fréquence) | M7, M10, m1 | M |

À suivre ensuite : la Casa atteinte (R11), le chargement (R12), les ombres et le chantier en 3D (m2, m7), l'haptique iOS (m8).
