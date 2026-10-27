# Audit du mouvement, des boutons et des visuels (27 octobre 2026)

Demande du porteur : un audit complet des animations, des boutons et des visuels, et des améliorations notables pour un jeu « extrêmement beau et hyper attrayant à jouer », sans se tenir aux règles actuelles. Les propositions ci-dessous sont donc libres ; quand l'une heurte une règle écrite (or réservé, trois profondeurs, gel des mécaniques), elle le signale. Rien n'est codé : c'est une base de décision.

Matière : le code de `apps/web` (index.css, tailwind.config.js, ui.tsx, fx.tsx, sound.ts, haptics.ts, map/*), et les captures du test de mise en page (`pnpm --filter @comptoirs/web e2e`, 390 × 844), citées par leur nom d'étape.

## 1. Verdict

L'identité est forte et rare pour un jeu web de niche : la direction Lagune (un lieu est un astre), les marques des marchandises, les sons synthétisés, l'haptique jusque sur iPhone, les pièces qui volent vers la bourse, et surtout les **ballots de Faraj**, qui sont un vrai moment de jeu (anticipation, sceau qui éclate, cartes distribuées puis retournées, légendaire qui luit).

Mais le reste du jeu **s'affiche plus qu'il ne réagit**. Le ballot, qui est accessoire, est mieux mis en scène que la boucle principale (récolter, livrer, réinvestir) et que les deux moments qui fidélisent (bon retour, fin de saison). Toutes les animations partagent la même courbe et presque la même durée, aucune fenêtre ne sort en mouvement, et le retour d'une action arrive après la réponse du serveur. Résultat : un jeu beau en capture, plus plat sous le doigt.

Trois chantiers donnent l'essentiel du gain :

1. **Le toucher** : un bouton or qui brille vraiment, réagit à l'instant et répond au résultat.
2. **La boucle** : la récolte et la livraison mises en scène comme le ballot (les marchandises volent, la bourse roule).
3. **Le monde** : une lagune qui vit (eau, heure de Paris, astres qui respirent), sans jamais bouger sous le doigt.

## 2. Constats

### A. Boutons

| # | Constat | Preuve | Gravité |
|---|---|---|---|
| A1 | **Le halo de l'or est terne.** `shadow-[0_0_0_5px_rgb(var(--gold)/0.15)]` pose un anneau d'or à 15 % sur le bleu nuit : l'œil lit un anneau gris-olive, sale, autour de chaque bouton or, au lieu d'une lueur. Même défaut sous le soleil de la fin de saison. | Captures `connexion`, `comptoir`, `ballots`, `bon-retour`, `fin-de-saison` | Forte : c'est le bouton le plus vu du jeu |
| A2 | **La pression est minimale et identique partout** : `scale(0.97)` en 100 ms, aucun relâché, aucun état « en cours » (le bouton passe à 60 % d'opacité pendant l'appel), aucune réponse au succès ni à l'échec sur le bouton lui-même. | `ui.tsx:76`, `Orbit.tsx:205` | Forte |
| A3 | **Le bouton or du comptoir n'est pas un `Slab`** : « Récolter et relancer » et « Charger une mule » sont réécrits en ligne. Ils n'ont pas le tick haptique au toucher, et chaque évolution du `Slab` les ratera. | `Orbit.tsx:205`, `Orbit.tsx:516`, `Ghost` `Orbit.tsx:226` | Moyenne |
| A4 | **Le panneau de la charrette est resté d'avant la Lagune** : grosses actions carrées (`rounded-md`), croix dans un parallélogramme vert d'eau (coin coupé, et vert d'eau en bouton : deux règles de design.md enfreintes), « MULE » en Archivo capitales, anneau du guide carré autour. C'est le premier panneau que voit un nouveau joueur. | Capture `guide-ouvrez-les-cargaisons`, `Panel.tsx:131` | Forte (première session) |
| A5 | **Le focus clavier est un carré or autour d'un bouton rond** (la cloche), et l'or est réservé à l'action. | Capture `carte` (cloche), `index.css` `:focus-visible` | Moyenne |
| A6 | Survol sur ordinateur : `brightness-105`, imperceptible. Rien sur les fantômes. | `ui.tsx:76` | Faible |
| A7 | Un bouton éteint est à 35 % et muet : le toucher ne dit pas pourquoi (sauf Attaquer en Terraferme, qui le dit en texte). | `ui.tsx:73` | Moyenne |
| A8 | Casse incohérente : « POSEZ VOTRE CAMP DE DÉPART » en capitales, les autres pilules en casse de phrase. | Capture `terraferme` | Faible |

### B. Animations

| # | Constat | Preuve | Gravité |
|---|---|---|---|
| B1 | **13 classes d'animation mortes** dans index.css, vestiges du Domaine : `stagger`, `domain-bump`, `domain-gain`, `stock-beat`, `drift`, `worker-step`, `cart-roll`, `map-pulse`, `map-march`, `ambient`, et dans Tailwind `bump`, `pulsering`, `screen*`. Aucune n'est utilisée. Certaines sont exactement ce qui manque (le rebond de récolte, le gain qui monte, le battement du stock). | `grep` sur `src` | Moyenne (dette, et occasion) |
| B2 | **Aucune fenêtre ne sort en mouvement.** `Sheet` rend `null` dès la fermeture : la feuille disparaît d'un coup ; l'orbite aussi. Seules les fiches du HUD ont une sortie (`data-leaving`). Une entrée sans sortie se lit comme un bug. | `ui.tsx` `Sheet`, `Orbit.tsx` | Forte |
| B3 | **Le retour d'une action attend le serveur.** L'haptique et le son partent dans `act` après `await request()` : 100 à 400 ms de silence sur l'action la plus répétée du jeu (récolter). | `Game.tsx:466-477` | Forte |
| B4 | **La récolte ne montre pas ce qu'elle rapporte.** Les ducats volent vers la bourse, mais les marchandises (« +8 » sur l'étoile) disparaissent sans aller au magasin. Le cœur de la boucle n'a pas de geste. | `Orbit.tsx`, `fx.tsx` (pièces seulement) | Forte |
| B5 | **Le bon retour est statique** : « +2 660 d » s'affiche d'un bloc (pas de `CountUp`), les lignes aussi. C'est le moment où le joueur décide de rester. | Capture `bon-retour` | Forte |
| B6 | **La fin de saison tient en une animation** : le soleil du rang `animate-rise` 0,35 s ; le podium et les récompenses sont posés. C'est le sommet émotionnel du mois. | `Ceremony.tsx:41`, capture `fin-de-saison` | Forte |
| B7 | **L'orbite ne part pas de l'astre touché** : `orbit-in` agrandit depuis le centre de l'écran (0,9 → 1), quel que soit l'endroit de la carte. « On s'approche d'un astre » n'est pas encore vrai spatialement. | `index.css` `.orbit-in` | Moyenne |
| B8 | **Une seule courbe pour tout** (`cubic-bezier(0.22,1,0.36,1)`), des durées voisines (0,14 à 0,42 s) fixées une à une : pas de personnalité (rien ne pèse, rien ne rebondit), et pas de jeton commun. | `tailwind.config.js`, `index.css` | Moyenne |
| B9 | **La carte est figée hors du doigt** : astres immobiles, eau immobile, ciel immobile. Seuls bougent les pointillés des routes et le halo d'une ville éclairée. | Capture `carte` | Moyenne |
| B10 | **`prefers-reduced-motion` coupe tout à 0,01 ms**, y compris les fondus qui aident à comprendre (une feuille qui apparaît). La bonne pratique : garder les fondus courts, couper les déplacements et les boucles. | `index.css` | Faible |

### C. Visuels

| # | Constat | Preuve |
|---|---|---|
| C1 | **Le soleil du comptoir est un disque mat**, sans couronne ni rayon, alors qu'il est le centre du jeu. Il ne dit rien de la production. | Captures `carte`, `comptoir` |
| C2 | Le halo des moments forts (cérémonie, bon retour) est un disque gris : même cause que A1. | Capture `fin-de-saison` |
| C3 | Les villes se ressemblent toutes en astre : même rond, même ombre ; seule l'icône change. Pas de lumière propre (Venise devrait briller davantage). | Capture `carte` |
| C4 | Le fond est deux halos fixes et sept étoiles fixes ; pas de profondeur au déplacement. | `index.css` `.world-sky` |
| C5 | Cinq sons seulement, sans lien musical entre eux ; aucun son pour ouvrir un lieu, monter de niveau, servir une ville, gagner un rang ; aucune ambiance. | `sound.ts` |

## 3. Propositions

### 3.1 Un système de mouvement (la base de tout le reste)

Des jetons, dans un seul fichier (`motion.css`), et un test qui refuse une durée ou une courbe écrite en dur :

| Jeton | Valeur | Usage |
|---|---|---|
| `--t-tap` | 90 ms | Enfoncement d'un bouton |
| `--t-quick` | 160 ms | Fiches, sorties |
| `--t-base` | 260 ms | Feuilles, panneaux |
| `--t-place` | 420 ms | Approche d'un astre (orbite) |
| `--t-moment` | 900 à 1 400 ms | Gains, bon retour |
| `--ease-out` | `cubic-bezier(0.22,1,0.36,1)` | Ce qui arrive |
| `--ease-in` | `cubic-bezier(0.55,0,0.75,0.4)` | Ce qui part (toujours plus court que l'entrée) |
| `--spring` | `cubic-bezier(0.34,1.45,0.64,1)` | Ce qui se pose : boutons relâchés, marques qui atterrissent, podium |
| `--ease-coin` | `cubic-bezier(0.5,0,0.2,1)` | Trajectoires (pièces, marchandises) |

Trois principes : **rien n'attend une animation** (tout est interruptible, l'action part au toucher) ; **la sortie est toujours plus brève que l'entrée** ; **une seule chose spectaculaire à la fois**.

### 3.2 Le bouton or, « la pièce frappée »

Le bouton or est la signature du jeu : il doit avoir la matière d'un ducat.

- **Au repos** : dégradé vertical (or pâle en haut, or, or profond au pied), un filet de lumière à l'intérieur du bord haut, et une **ombre portée dorée** sous la pilule (`0 8px 24px -6px gold/0.55`) à la place de l'anneau gris. Sur fond nuit, l'or semble alors émettre de la lumière.
- **Quand l'action rapporte** (lots prêts, ballot) : un reflet qui traverse la pilule toutes les 5 s. Jamais sur une action neutre : le reflet veut dire « il y a quelque chose à prendre ».
- **À l'appui** (au `pointerdown`, pas au clic) : 90 ms, `scale(0.96)` et 1 px vers le bas, l'ombre se resserre, tick haptique immédiat.
- **Au relâché** : ressort vers 1,02 puis 1.
- **Pendant l'appel** : plus de 60 % d'opacité ; un arc de lumière fait le tour de la pilule (bord en `conic-gradient` qui tourne), le libellé reste lisible.
- **Succès** : la pilule « frappe » : éclair blanc de 120 ms, une onde dorée part du bouton, son de la pièce.
- **Échec** : trois oscillations horizontales en 240 ms, le filet passe au cinabre un instant, haptique « warn ».
- **Éteint** : au toucher, un léger refus (deux oscillations) et la raison dans une bulle au-dessus, au lieu du silence.

Les fantômes : le filet s'éclaircit au survol, le fond s'allume en `night-3` à l'appui. Les ronds du HUD : une onde lapis part du doigt. Le focus clavier : un anneau **lapis**, épousant la forme (le bouton porte lui-même `rounded-full`).

Préalable : un seul composant pour tout bouton or (le comptoir et la ville passent par `Slab`), et `ActionButton` refait en Lagune (ronds, croix en rond fantôme).

### 3.3 Les moments de la boucle

**La moisson (récolter et relancer)**, l'action la plus répétée, doit être la plus satisfaisante :

1. Au toucher : haptique et son immédiats ; chaque étoile prête **rebondit** (`domain-bump`, qui existe déjà), en cascade de 70 ms.
2. Sa marque de marchandise **s'envole en arc jusqu'à la puce du magasin**, qui bat et compte (`stock-beat`, qui existe déjà) ; généraliser `flyCoins` en `flyGoods`.
3. L'arc vert d'eau de l'étoile se vide en tournant puis repart en lapis : on voit le lot relancé.
4. Le son : une note par atelier, sur une gamme pentatonique ascendante ; cinq ateliers prêts font un petit arpège. Récolter beaucoup sonne mieux que récolter peu.

**La livraison** : quand une mule arrive, la ville s'illumine et lance une onde de sa couleur, les pièces partent de la ville (déjà fait), et la bourse **roule comme un compteur mécanique** (chiffres qui défilent verticalement), puis bat. Le gain s'affiche à côté de la bourse, en vert d'eau, et s'efface.

**Le chargement** : la route vers la ville choisie **se dessine** (tracé qui progresse) au lieu d'apparaître dorée ; chaque commande cochée tombe dans l'anneau de cale (`HoldRing`) avec un petit ressort.

**Le bâtiment et l'amélioration** : la parcelle pointillée se remplit, l'étoile naît d'un éclat et se met en orbite ; au niveau supérieur, l'anneau de l'étoile se **forge** segment par segment, avec le son du tampon.

### 3.4 Approcher un astre (l'orbite)

- Partir **de l'astre touché** : l'orbite s'ouvre depuis la position du marqueur (`transform-origin` mesuré, ou l'API View Transitions, prise en charge par Chrome et Safari 18, qui fait fondre le marqueur dans le soleil).
- Les étoiles **entrent en orbite** une par une (rotation de −25° à 0, 40 ms d'écart), la chaîne entre ateliers **se trace** puis coule.
- Le retour fait l'inverse, plus vite : le lieu se replie sur son marqueur.

### 3.5 Les feuilles

- Une **sortie** : la feuille descend et le voile s'efface en 160 ms avant de démonter (un état « fermeture » dans `Sheet`).
- Au lâcher d'un glissé, un vrai **ressort** (vitesse du doigt prise en compte) au lieu d'une transition fixe.
- Le contenu monte en cascade à l'ouverture (`stagger`, qui existe déjà).

### 3.6 Le bon retour et la fin de saison

**Bon retour** (le moment qui retient) :

- Le titre en lettres de lieu se révèle lettre à lettre (Cinzel s'y prête).
- Le gagné **court de 0 à son montant** en 1,2 s, avec un tic sonore à chaque palier ; puis les pièces partent de lui vers la bourse.
- Chaque ligne entre l'une après l'autre, son point **s'allume** à sa couleur.
- Toucher n'importe où accélère tout jusqu'à la fin (jamais d'attente imposée).

**Fin de saison** (une séquence de 5 à 6 s, que le toucher abrège) :

1. Nuit, la lagune seule, deux vagues qui bougent.
2. Le rang **se lève comme un astre** derrière les vagues (montée lente, la lueur grandit), des rayons tournent doucement pour le top 10.
3. Le podium **tombe en place** : troisième, deuxième, premier, chacun avec un ressort et sa note (bronze, argent, or).
4. Les récompenses se **frappent** une à une (tampon).
5. Pour le top 10, une pluie de **feuilles d'or** (particules dans un seul canvas, 2 s).

### 3.7 Les ballots

Déjà le meilleur moment ; trois touches :

- **Briser le sceau en maintenant le doigt** : la cire se fend progressivement (trois états), l'haptique monte, puis éclate. L'anticipation est le plaisir.
- Pour une carte légendaire, **arrêt sur image** de 80 ms au retournement (le « hit-stop » des jeux d'action), puis l'éclat.
- La rareté annoncée par le son avant d'être vue (une note plus haute par rang de rareté au moment où la carte commence à tourner).

### 3.8 Un monde vivant

La règle « la carte ne bouge que sous le doigt » vaut pour la caméra ; le décor, lui, peut vivre :

- **L'eau** : la texture de vagues dérive lentement sur la lagune et l'Adriatique ; un reflet discret passe sur l'eau.
- **L'heure de Paris** : le jeu dort de 22 h à 8 h ; la carte peut le dire. Aube rosée, jour, crépuscule doré, nuit profonde où les villes allument une **lanterne** et où le comptoir rougeoie. Cela donne une raison visuelle de revenir à des heures différentes, et rend « le jeu dort la nuit » palpable.
- **Les astres respirent** : très lentement (5 à 7 s), chacun avec son décalage, d'à peine 2 %. Venise a sa propre lueur, plus forte.
- **Le soleil du comptoir** : une couronne qui tourne lentement, et des **rayons dont la longueur suit la production horaire** (le « ≈ +61,6 d/h » du HUD, rendu visible). Le joueur voit son comptoir grandir.
- **Profondeur** : le ciel étoilé se déplace à 10 % de la vitesse de la carte (parallaxe).
- **Vie rare** : une gondole ou une mouette traverse la lagune une fois par minute ou deux. Rare, donc remarquée.
- Les charrettes laissent une traînée de poussière, et ont une ombre.

### 3.9 Les chiffres

- La bourse en **compteur mécanique** (rouleaux de chiffres), le delta à côté (vert d'eau ou cinabre) qui monte et s'efface.
- Tout chiffre qui change brille une fois (`stock-beat` généralisé).
- La frise du temps : quand une échéance arrive à zéro, son point **éclot** et glisse vers « maintenant ».

### 3.10 Son et haptique

- **Retour optimiste** : son et haptique au toucher ; si le serveur refuse, un son grave et l'haptique d'erreur, puis l'état réel. Le joueur ne doit jamais attendre pour sentir son geste.
- **Une palette accordée** : tous les sons dans une même gamme (dorienne ou pentatonique), la pièce, la récolte, la cloche s'harmonisent ; l'arpège de récolte, la note de chaque rang du podium.
- **Nouveaux sons** : ouvrir un lieu (souffle), monter de niveau (tampon et cloche), servir une ville (pièces), gagner un rang (deux notes ascendantes), perdre une case (note basse).
- **Ambiance facultative**, synthétisée, coupable : clapotis, cloches lointaines aux heures pleines (le campanile de Saint-Marc), mouettes rares.
- **Haptique** : un motif propre au tampon et au podium ; une montée pour le sceau maintenu.

### 3.11 Accessibilité, performance, réglage

- `prefers-reduced-motion` : garder les fondus de 120 ms et les changements de couleur, couper déplacements, rebonds, boucles et particules.
- Un réglage dans le Profil : **Effets complets · sobres · aucun** (sobres : pas de particules ni de vie ambiante).
- Seulement `transform` et `opacity` ; un seul canvas de particules partagé ; tout s'arrête quand l'onglet est caché (`visibilitychange`) et sur batterie faible si l'API le dit.
- Un test : chaque `@keyframes` déclaré est utilisé, et chaque durée passe par un jeton.

## 4. Feuille de route

| Lot | Contenu | Effort | Effet |
|---|---|---|---|
| **1. Le toucher** | A1 halo en ombre portée ; A2 pression, relâché, en cours, succès, échec ; A3 un seul `Slab` ; A4 panneau de la charrette en Lagune ; A5 focus lapis arrondi ; B2 sorties des feuilles et de l'orbite ; B3 retour optimiste ; B1 ménage des classes mortes (en recyclant `domain-bump`, `stock-beat`, `stagger`) | 2 à 3 jours | Immédiat, sur chaque toucher |
| **2. La boucle** | La moisson (marchandises qui volent, rebonds, arpège) ; la bourse en compteur mécanique ; la livraison ; la route qui se dessine ; le bon retour qui court | 3 à 4 jours | Le plaisir de la boucle principale |
| **3. Les lieux** | Orbite qui part de l'astre ; étoiles qui entrent en orbite ; soleil à couronne et rayons de production | 2 jours | « Un lieu est un astre » devient vrai |
| **4. Les sommets** | Fin de saison en séquence ; sceau maintenu et hit-stop des ballots ; forge du niveau | 3 jours | Les moments dont on parle |
| **5. Le monde** | Heure de Paris sur la carte ; eau ; respiration des astres ; parallaxe ; vie rare ; ambiance sonore ; réglage des effets | 4 à 5 jours | L'attachement au lieu |

## 5. Ce que ces propositions bousculent

- **L'or hors des montants et de l'action** : les feuilles d'or de la fin de saison et la couronne du soleil. Le soleil du comptoir est déjà doré ; la pluie d'or ne vaut que pour le top 10.
- **« La carte ne bouge que sous le doigt »** : la caméra reste immobile ; seul le décor (eau, lumière, vie rare) bouge.
- **Rayons de production** : purement visuels, lus dans la marge théorique déjà calculée ; aucune mécanique nouvelle.
- **Cycle jour/nuit** : visuel seulement, aligné sur le sommeil du jeu (22 h à 8 h) déjà en place.

La page de démonstration qui accompagne cet audit montre en mouvement le bouton or avant et après, la moisson, la bourse en compteur mécanique, la sortie des feuilles et le soleil à rayons.
