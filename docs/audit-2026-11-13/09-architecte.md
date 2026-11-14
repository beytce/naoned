# 09 — Architecte logiciel et performance (audit d'ensemble du 13 novembre 2026)

Auditeur : architecte logiciel et performance. J'ai lancé un serveur local à moi (port 3699, base
PGlite à part, `NODE_ENV=test`) sur le web déjà construit. J'ai créé 60 comptes par le vrai lien
magique : ils remplissent deux lagunes, Murano (48 Maisons) et Burano (12). J'ai joué du lundi
16 novembre au dimanche 6 décembre (heure du jeu), en relançant le serveur sur la même base.
Mesures brutes : `captures/architecte/mesures.md`. Scripts : `captures/architecte/scripts/`.
Les chiffres viennent d'une machine partagée avec d'autres auditeurs. Ils valent comme ordres de
grandeur, et chaque comparaison a été faite dans les mêmes conditions.

## 1. Verdict

**Note : 5/10 pour « l'architecture tient-elle une bêta ? »** Elle tient une bêta **fermée de
100 à 300 joueurs** après trois correctifs ciblés, mais **pas quelques milliers** sans changer de
forme.

Le choix de fond est bon : chaque lagune vit comme un acteur en mémoire, avec un moteur pur et
déterministe, un journal de commandes écrit avant la réponse et des instantanés. Il est simple, il se
rejoue et il se teste. Trois choses, en revanche, cassent la tenue en charge, et je les ai mesurées :
1. **La poussée en temps réel est quadratique.** Chaque geste réussi fait relire la planche entière
   et la Maison à chacun des 48 joueurs de la lagune. Avec 48 joueurs qui font un geste par minute,
   le serveur passe de 6 % à 62 % d'un cœur, et un geste attend 0,5 s en médiane et jusqu'à 4,5 s.
2. **Tous les duels se jouent sur la boucle d'événements.** C'est vrai aussi des **sorties des
   capitaines**, qui se jouent pendant l'avance, au premier qui lit. Une semaine avec une seule tour
   tenue a bloqué le serveur **6,9 s** d'un bloc.
3. **Le serveur ne peut tourner qu'en une seule instance.** Les files sont en mémoire, un verrou
   global sert à chaque requête, la passation au déploiement est confiée à l'ancien monde, et des
   états ne vivent qu'en mémoire (assauts, défis, présence).

## 2. Ce que j'ai fait

- **Lundi 16, 10 h.** 60 comptes créés par `/api/auth/request` puis `/api/auth/verify`, chacun
  depuis sa propre adresse de bouclage (la limite de débit compte par adresse IP), avec un nom pour
  chaque compte. La 49ᵉ Maison a ouvert Burano. 96 gestes (sablière et ferme), 144 achats de case,
  puis des fils tendus et repris au Rialto en continu.
- **Charge.** Interrogation à 2 s par 20 puis 60 joueurs. 48 prises WebSocket ouvertes qui
  réagissent comme le vrai client (`LabPlanche.tsx:611-614` : relire `/api/planche` et
  `/api/maison`). Un geste par joueur et par minute, puis une rafale. Pendant tout ce temps,
  `/api/health` est interrogé toutes les 100 à 250 ms pour voir si la boucle bloque.
- **Le temps.** Relances à mardi 17 (+1 jour), mardi 24 (+1 semaine), puis dimanche 6 décembre,
  après qu'une Maison a pris la Bouche de Cannaregio en trois Passes (ligne calculée hors ligne).
  À chaque relance, j'ai mesuré le démarrage et la première lecture.
- **Bancs du moteur** (hors serveur) : avance de 1 h, 1 jour, 1 semaine et 6 semaines ; profil
  processeur d'une semaine ; coût d'une sortie sur chaque plateau ; taille de l'état ; tas par
  lagune.
- **Client** (Chromium, 390 × 844 et 1280 × 800) : poids chargé, tas JS avant et après le
  ramasse-miettes, appels de dessin par image, tampons WebGL créés et supprimés pendant que
  d'autres joueurs tendent des fils. Captures : `captures/architecte/01-planche-phone.png` et
  `01-planche-desktop.png`.
- **Lecture du code** : `planche.ts`, `plancheStore.ts`, `plancheLagoons.ts`, `plancheRoutes.ts`,
  `guerre.ts`, `plancheGazette.ts`, `serialize.ts`, `live.ts`, `server.ts`, le moteur `planche/`,
  `PlancheBoard.tsx`, `LabPlanche.tsx`, les migrations 0037 à 0042, le `Dockerfile`.

## 3. Constats

| Id | Gravité | Constat | Preuve | Proposition |
|---|---|---|---|---|
| A1 | **P0** | **La poussée WebSocket est quadratique.** Après chaque commande réussie, `onChange` prévient **tous** les joueurs assis de la lagune (`routes.ts:322`). Chaque client relit alors `/api/planche` (60 ko bruts, 5 à 7 ko gzip) **et** `/api/maison` (`LabPlanche.tsx:611-614`), sans délai ni regroupement. Pour *n* joueurs qui font *g* gestes par seconde, cela donne 2·*n*²·*g* lectures par seconde. | 48 joueurs, un geste par minute chacun : **2 304 poussées et 4 717 lectures en 60 s**. Résultat : 62 % d'un cœur, geste p50 507 ms, p95 1,9 s, max 4,5 s, lecture p95 956 ms, RSS 1,25 Go. **Même scénario sans relire à la poussée : 6 % d'un cœur, geste p50 16 ms.** Rafale de 144 gestes simultanés : 6 912 poussées, 13 404 lectures, 100 s de processeur, un geste attend jusqu'à **67 s**, `/api/health` jusqu'à **19 s**. Le volume pour un joueur dans une lagune active : environ 49 lectures par minute × 6,7 ko, soit **330 ko/min, environ 20 Mo/h de données mobiles**. | Pousser la **version** (`{type:"planche", v}`) et ne relire que si elle a changé, avec un délai de 2 à 5 s qui regroupe les poussées. Ne relire `/api/maison` qu'après **ses propres** gestes. Ensuite, un diff par joueur (ses fils, les jauges des villes, les tours), et non l'état entier. Gain attendu : lectures divisées par 10 ou plus. |
| A2 | **P0** | **Les sorties des capitaines bloquent tout le serveur pendant l'avance.** `plancheSortiesSettle` joue la partie entière, capitaine contre lieutenant, de façon synchrone dans `plancheDocAdvance` (`planche.ts:246-262`). Elle se déclenche chez le premier qui lit ou qui agit après 18 h (UTC). Il y a 6 capitaines par lagune et par semaine dès qu'une Maison tient une tour. | Une sortie coûte 0,14 à 0,2 s sur lido 5×5, **0,8 à 1,2 s** sur chioggia 7×7 et **4,1 à 4,6 s** sur otrante 9×9 (`scripts/sortie.mts`). En vrai : une tour tenue, relance une semaine plus tard, première lecture **6 867 ms**, et `/api/health` **n'a reçu aucune réponse** pendant ce temps. Projection : 60 lagunes à 18 h, c'est 1 à 4 minutes de serveur figé chaque soir. | Jouer les sorties **hors du chemin de lecture**. Les résoudre par une tâche planifiée à 18 h, lagune par lagune, dans un **`worker_thread`**, puis écrire le résultat comme une commande `sortie` au journal (le format existe déjà). Le rejeu ne recalcule plus le duel. |
| A3 | **P1** | **Les duels des joueurs passent tous sur la boucle d'événements** (Q3 du rapport 08, mesuré à nouveau). Sont concernés `force`, `noir`, `muda`, `sortie`, `order` et `daily` (`planche.ts:751`, `:802`, `:869`). | `force` : 1 647 à 1 820 ms, `/api/health` à 1 617 ms pendant le duel. | Une réserve de workers (2 à 4) avec une file bornée par lagune et par compte. Le moteur est pur, donc le passage en worker est mécanique. |
| A4 | **P1** | **Une seule instance possible, par construction.** (a) L'ordre des commandes tient à une promesse en mémoire par lagune (`planche.ts` `serial`). (b) **Toutes** les requêtes de **toutes** les lagunes passent deux fois dans un verrou global : `turnLeagues`, puis `seatOf` avec un `select planche_seats` à l'intérieur (`plancheRoutes.ts:134-135`, `plancheLagoons.ts:121`, `:244`). (c) Assauts en cours, défis, salles de Passe et présence (`seen`) ne vivent qu'en mémoire. (d) `PlancheLost` n'a **aucun gestionnaire** : seul `GameWorld.onLostOwnership` de l'ancien monde arrête l'ancienne instance (`server.ts:95-104`). | `grep PlancheLost` ne trouve que les deux `throw` (`plancheStore.ts:308`, `:426`). Pendant la relève, l'ancienne instance répond encore aux lectures avec son état en mémoire et renvoie 500 à chaque geste. Elle ne s'arrête qu'au prochain tick de l'ancien monde (60 s au plus). | Court terme : un `onLost` sur `PlancheLagoons` qui déclenche le `shutdown`, et un cache en mémoire compte → lagune, pour sortir `seatOf` du verrou. `turnLeagues` passe sur une minuterie. Pour quelques milliers de joueurs : voir § 6. |
| A5 | **P1** | **Le coût de l'avance vient pour moitié de `structuredClone` sur l'état entier.** Chaque opération du moteur clone toute la lagune (30 appels dans `planche/`, dont chaque visite de robot). L'avance rejoue heure par heure, donc son coût croît avec l'absence et avec la taille de l'état. | Banc : 1 h ≈ 3 à 6 ms, 1 jour 152 ms, 1 semaine 519 ms, **6 semaines 4,7 s**. Profil d'une semaine : `structuredClone` **443 ms sur 850 ms** en temps propre, `plancheRobot` 390 ms en inclusif. Serveur : première lecture après une semaine 363 à 560 ms. | Partage de structure (copie seulement des Maisons touchées, ou `immer`) dans le moteur, avec les tests en place. Gain attendu : avance divisée par 3 à 5. Une avance de fond toutes les heures par lagune, dans un worker, pour qu'aucune lecture ne paie une semaine. |
| A6 | P1 | **L'avance est calculée deux fois** : hors file, puis dans la file. `noir`, `sortie` et `muda` appellent `plancheDocAdvance` pour le refus, puis `act` avance encore (`planche.ts:650`, `:672`, `:734`). `gazetteOf` fait de même sur une copie qu'il jette (`plancheGazette.ts:38`). Une sortie due est alors **jouée deux fois**. | Lecture du code. | Calculer le refus dans la commande elle-même (comme `sortie`, dans `plancheDocApply`), et rédiger la Gazette à partir de l'état avancé par le hub. |
| A7 | P1 | **La lecture renvoie l'état brut de 48 Maisons et le reconstruit à chaque fois.** `toJson` de tout l'état, puis 6 requêtes en base par lecture : session, nom, siège, compagnies, signes, saluts (`plancheRoutes.ts:128-156`). Pas d'ETag. Les 48 lectures qui suivent une même poussée refont le même travail. | 39 ko (neuf) → 57 ko (1 jour) → 64 à 69 ko (1 semaine) → 86 ko (6 semaines, banc). Les Maisons font 89 % du volume. Processeur : **9 à 13 ms par lecture** avec la base dans le processus. Un cœur sature vers 80 à 100 lectures par seconde. | Sérialiser **une fois par version** la partie publique (déjà compressée), filtrée des secrets (Q1 du rapport 08). Ajouter par joueur sa part (`me`, ses ruses, ses fils) et un ETag (304). Mettre en cache le nom, les compagnies et les signes pour quelques secondes. |
| A8 | P1 | **Le client fuit la mémoire du GPU et dessine beaucoup.** Les `useMemo` de `PlancheBoard` se reconstruisent dès qu'un fil de la lagune change (`threads`, `PlancheBoard.tsx:623`). Ils créent de nouvelles géométries passées en `<primitive>` (`:889-900`), que React Three Fiber ne libère pas. Aucun `dispose()` des géométries ou des matériaux. La boucle de rendu tourne en continu (`useFrame`, `:822`, pas de `frameloop="demand"`), avec `dpr` jusqu'à 2. | 3 457 à 3 623 tampons WebGL créés, **0 supprimé** ; **+250 tampons** après 10 fils tendus par d'autres (+84 au second essai). Environ **950 appels de dessin par image**. Tas JS : 590 à 613 Mo avant le ramasse-miettes, 22 Mo après (beaucoup d'allocations à chaque image). | Libérer l'ancien objet au changement (`useEffect` qui fait `dispose` du précédent). Instancier les Maisons, les cases et les pions (`InstancedMesh`) pour viser moins de 150 appels. Passer en `frameloop="demand"` avec une invalidation pendant les animations, et à 30 images/s quand rien ne bouge. `dpr` plafonné à 1,5 sur téléphone. |
| A9 | P1 | **La page d'accueil charge tout l'ancien jeu.** `main.tsx:3` importe `App` (empire, Porta, Terraferme, monde mensuel) de façon statique, même quand la racine ouvre la planche (chargée, elle, en différé). | `index-*.js` : **1,74 Mo (542 ko gzip)** chargé d'emblée ; `ribbon-*.js` (three.js) 877 ko (235 ko gzip) ; `LabPlanche-*.js` 229 ko (75 ko gzip). La racine fait 30 requêtes et **3,35 Mo** décodés. | `const App = lazy(() => import("./App.js"))`. Gain attendu : plus de 1 Mo de moins au premier écran du téléphone. Ajouter un budget de taille dans la CI (par exemple `index` < 250 ko gzip). |
| A10 | P2 | **L'ancien jeu tourne et écrit toujours en production.** `GameWorld` fait son tick chaque minute, `BotRunner` et `Notifier` tournent, et l'audit horaire des invariants ne regarde que lui (`server.ts:38-56`, `:109-117`). Chaque minute, la poussée `tick` part vers toutes les prises, planche comprise (`live.ts:81-85`). | Sans aucun joueur dans l'ancien monde, ses robots ont écrit **plus de lignes au grand livre que la planche** pendant mon essai : `escrow_release` 290, `escrow_lock` 189, `market_maker_sell` 135, `trade` 86, contre 249 `planche_sale`. Poids du code ancien : moteur hors planche environ 22 000 lignes sur 41 000 ; serveur environ 12 600 sur 16 500 ; web `empire/` + `game/` + `terra/` environ 54 000 sur 94 000. | Arrêter l'ancien monde par un drapeau (`LEGACY=off` : ni tick, ni robots, ni notifications, routes `/ancien` en lecture seule). Puis retirer le code en un lot, une fois `PlancheLost` sorti de sa dépendance (A4). |
| A11 | P2 | **Les règles de `CLAUDE.md` ne décrivent plus le code.** (a) Le grand livre de la planche est **déduit après coup** des compteurs `book` (`ledgerSince`, `plancheStore.ts:63-101`) : la vérité est l'état JSON, pas `ledger_entries`. (b) Les stocks de la planche n'ont pas de `stock_movements`. (c) Il n'y a pas de verrou par (monde, ressource), mais une file en mémoire. (d) Les paramètres vivent dans le code du thème et sont **recopiés** dans `worlds.settings` à chaque chargement (`plancheStore.ts:225`). Un changement d'équilibrage s'applique donc au déploiement, sans annonce, et le journal est rejoué avec les nouvelles règles. (e) Un changement de carte **retire automatiquement toutes les lagunes** (`plancheLagoons.ts:57-69`). | Lecture du code. `grep stock_movements` ne trouve que `world.ts` et `profile.ts`. | Écrire dans `CLAUDE.md` le modèle réel : journal de commandes, l'état comme vérité, le grand livre comme contrôle réconcilié chaque heure (Q10). Versionner le thème : `worlds.settings.themeVersion`, et un journal rejoué avec la version qui l'a écrit. Mettre derrière une commande manuelle la retraite d'une lagune pour cause de carte (règle d'or 1). |
| A12 | P2 | **Les instantanés réécrivent toute la lagune chaque minute.** Ils partent dès qu'il s'est passé 60 s ou 200 versions (`plancheStore.ts:294`). L'état fait 70 à 90 ko en `jsonb`, et plus quand les îles sont pleines. | `world_states` : 808 ko après 3 semaines, deux lagunes. Une lagune active réécrit environ 90 ko × 1 440, soit **130 Mo par jour** de lignes (TOAST et WAL), à nettoyer par l'autovacuum. Le journal `world_commands` est vidé à chaque instantané (bien). | Un instantané toutes les 10 min ou 2 000 versions (le journal suffit à la reprise), compressé (`bytea` gzip, environ ÷10). Surveiller la taille de `world_states` et l'autovacuum dans l'audit horaire. |
| A13 | P2 | **La production démarre par `tsx`**, qui compile le TypeScript au chargement, avec toute la monorepo et ses dépendances de développement (`Dockerfile`, `CMD ["node_modules/.bin/tsx", "src/server.ts"]`). | Démarrage local de 3 à 5 s, dont environ 1 s pour charger les modules (profil). Image lourde. | Construire le serveur (`tsc` ou `esbuild`) et utiliser `pnpm deploy --prod` pour l'image d'exécution. |
| A14 | P2 | **`LabPlanche.tsx` porte toute la planche.** Le fichier fait 2 689 lignes, contient 75 hooks, la lecture réseau, l'interrogation, la poussée, le mode hors ligne (`&seul`) et l'interface entière. Il s'appelle encore « Lab » alors qu'il ouvre la racine du site. | `wc -l` ; `grep -c "useState\|useEffect\|useMemo\|useCallback\|useRef"` = 75. | Extraire un `usePlanche()` (réseau, version, poussée), séparer le mode hors ligne, renommer en `Planche.tsx`. C'est la condition pour corriger A1 et A8 proprement. |

## 4. Ce qui marche (à garder)

- **Le moteur pur et déterministe**, partagé par le serveur, le client et les bancs. On mesure,
  on rejoue et on teste sans base. Le passage des duels en worker (A2, A3) en sera mécanique.
- **Le journal avant la réponse, et les instantanés.** Une commande est écrite (`world_commands`)
  avant d'être répondue. La reprise rejoue au plus 60 s ou 200 commandes. Le démarrage reste de
  3 à 5 s. Un document de lagune pèse 0,2 Mo en mémoire : la mémoire n'est pas le problème, même
  à 100 lagunes.
- **Une passation déjà à moitié construite** : un propriétaire dans `world_states.owner` et une
  insertion conditionnelle (`where exists … owner = instance`). C'est la bonne base pour des baux
  par lagune (§ 6).
- **Des réponses compressées** (gzip au-delà de 1 ko, environ ÷13 sur la planche), et des limites
  de débit par session.
- **L'interrogation tombe à 20 s quand la prise WebSocket est ouverte** : une seule lecture en
  20 s au repos. Sans réaction aux poussées, 48 joueurs actifs coûtent 6 % d'un cœur.
- **Des migrations 0037 à 0042 additives et petites** : de nouvelles tables (`guerre_*`,
  `planche_signs`, `company_beacon*`, `gazettes`, `planche_*_leagues`, `planche_tides`), une
  colonne, des index sur les clés de lecture, des clés étrangères avec `cascade`. Aucune réécriture
  de table.
- **Le volume de l'état reste borné** : le Livre est plafonné à 40 entrées (`MAISON_KEEP`), le
  Problème du jour ne garde que deux jours, le journal est purgé à chaque instantané.

## 5. Capacité estimée aujourd'hui

Le modèle s'appuie sur ce que j'ai mesuré : 9 à 13 ms de processeur par lecture, et 2 lectures
par joueur assis à chaque geste réussi. Une lagune compte *n* joueurs en ligne qui font un geste
par minute.
- *n* = 7 (une bêta ordinaire, 15 % de présence) : environ 2 lectures/s par lagune.
- *n* = 48 (une lagune de tête très active) : environ **79 lectures/s, 62 % d'un cœur à elle seule**.

| Bêta | Lagunes | En ligne au pic | Charge de lecture | Duels (Passe ~1,7 s) | Sorties à 18 h | Tient ? |
|---|---|---|---|---|---|---|
| 300 joueurs | 7 | ~45 | 10 à 15 % d'un cœur | ~6 % d'un cœur, par blocs de 1,7 s | 7 à 30 s de serveur figé | **Oui, avec des à-coups**, si l'on corrige A2 |
| 3 000 joueurs | 63 | ~450 | **1 à 1,3 cœur** (au-delà d'un processus Node) | ~35 % d'un cœur | **1 à 4 min figé** chaque soir | **Non** |

Les lagunes se remplissent dans l'ordre (`seatOf` prend la première qui a une place). Les plus
anciennes sont donc les plus pleines et les plus actives : la charge réelle se concentre, et le
cas « 48 en ligne » arrivera tôt, dans la Sérénissime notamment.

## 6. Cible d'architecture

**Étape 1 : une bêta de quelques centaines de joueurs, sur une instance, environ 2 semaines.**
1. **Poussée par version, regroupée** (A1). Lecture servie depuis un **cache par version**, avec
   ETag, et une vue par joueur sans les secrets (A7, Q1). Cible : moins de 3 ms de processeur par
   lecture, et lectures divisées par 10.
2. **Duels et sorties dans une réserve de `worker_threads`** (A2, A3). Les sorties sont résolues à
   l'heure par une tâche planifiée et écrites au journal, plus jamais pendant une lecture. Cible :
   `/api/health` sous 50 ms au p99, même à 18 h.
3. **Moteur sans clonage complet** (A5) et **plus d'avance en double** (A6). Cible : une semaine
   d'avance sous 150 ms.
4. **Sortir le verrou global du chemin de lecture**, et donner à la planche **son propre
   gestionnaire `PlancheLost`** (A4).
5. **Client** : `App` en différé (A9) ; `dispose` des objets, instanciation, `frameloop="demand"`
   (A8). Cible : moins de 600 ko gzip au premier écran, moins de 150 appels de dessin, 0 tampon
   qui fuit.
6. **Un banc de charge dans la CI** : les scripts de `captures/architecte/scripts/`, avec 48
   joueurs et un geste par minute, et un échec si le geste p95 dépasse 200 ms.

Budget : 1 service Railway à 1 vCPU et 1 Go, avec Postgres géré. Capacité visée : 40 à 60 lagunes,
soit 2 000 à 3 000 comptes, dont environ 300 en ligne.

**Étape 2 : quelques milliers de joueurs, plusieurs instances.**
- **Une lagune devient un acteur sous bail.** `world_states.owner` reçoit une échéance
  (`lease_until`), renouvelée toutes les 10 s. Une instance prend N lagunes. Le routage est
  collant par lagune : le compte connaît sa lagune (`planche_seats`), un en-tête ou un sous-domaine
  aiguille la requête, ou bien une instance qui ne tient pas la lagune relaie vers celle qui la
  tient.
- **Les poussées entre instances** passent par Postgres `LISTEN/NOTIFY` (assez à cette échelle),
  sinon par Redis.
- **Les états qui ne vivent qu'en mémoire** (assauts, défis, présence) passent en base ou dans
  l'acteur de leur lagune, avec reprise.
- **Postgres** : pgbouncer devant le pool de 10, `ledger_entries` partitionnée par mois, contrôle
  horaire du grand livre de la planche (Q10).

Budget pour 3 000 comptes (63 lagunes, environ 450 en ligne) : 2 instances à 1 vCPU (une troisième
en relève), environ 0,5 à 0,7 cœur par instance au pic une fois l'étape 1 faite. Pour 10 000
comptes : 4 à 5 instances. Le moteur et le journal ne changent pas. Seuls l'hôte des lagunes et le
routage changent.

## 7. Trois recommandations prioritaires

1. **Couper la poussée quadratique** (A1, A7) : pousser une version, regrouper, relire seulement
   si la version a changé et `/api/maison` seulement après ses propres gestes, et servir la lecture
   depuis un cache par version. C'est le correctif au meilleur rendement (62 % → environ 6 % d'un
   cœur dans mon essai), et il économise aussi les données mobiles des joueurs.
2. **Sortir tous les duels de la boucle d'événements, et les sorties du chemin de lecture** (A2,
   A3, A6) : une réserve de `worker_threads`, et les sorties résolues à 18 h par une tâche
   planifiée qui écrit une commande au journal. Sans cela, chaque soir à 18 h, le serveur se fige
   environ une seconde par lagune.
3. **Préparer la seconde instance et alléger le client** (A4, A8, A9, A10) : un gestionnaire
   `PlancheLost` propre à la planche, `seatOf` hors du verrou global, l'ancien jeu arrêté par un
   drapeau puis retiré, `App` en différé, et la fuite de géométries corrigée. Puis écrire dans
   `CLAUDE.md` le modèle réel (journal et état comme vérité, grand livre réconcilié), à la place de
   règles que la planche ne suit plus (A11).
