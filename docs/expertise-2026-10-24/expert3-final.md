# Expert 3 : mobile/PC, premières minutes, rétention, F2P (version finale)

24 octobre 2026, dépôt `431b862`. Version finale après le verdict du chef (`chef.md`), en un seul tour de correction. Aucun fichier du dépôt n'a été modifié.

J'ai revérifié les chiffres du chef dans le code avant de corriger :
- **Coût du niveau 2 de la ferme.** `buildings.ts:20-31` (`costForLevel`) donne 21 000 × 1,35 = 28 350 deniers, soit **283,5 d**. Les matériaux valent ⌈15 × 1,35 × 0,5⌉ = **11 briques et 11 planches** (`upgradeMaterialsBps: { "2": 5_000 }`, `venice1450.settings.ts:899`).
- **Production du niveau 2.** `buildings.ts:43-50` (`outputBps`) donne 2 × 1,25 = **×2,5** par rapport au niveau 1 (`addedOutputBps(1)` = 15 000).
- **La nuit.** L'avis est enregistré dans la cloche (`notifier.ts:373-382`). Seul le push est abandonné, à `:385`.
- **Bogue `invest`.** `Comptoir.tsx:610` lit `tutorial.includes("invest")`, alors que `TUTORIAL_STEPS` (`apps/server/src/game/tutorial.ts:4-11`) ne contient pas `invest`.
- **`deepBook`.** C'est la profondeur affichée du carnet, 10 lignes au lieu de 5 (`view.ts:581`).
- **Nom PNJ.** « Bembo » est une maison PNJ (`apps/server/src/game/bots.ts:37`).

Les captures de la session jouée sont dans `scratchpad/experts/e3shots/390x844/`.

## 1. Diagnostic

- **Ce qui marche.**
  - Le premier lot sort en 30 s (capture 08).
  - La commande de bienvenue express arrive en 45 s et paie 150 d (capture 15).
  - Lorenzo suit l'état réel du jeu (`Coach.tsx:103`).
  - La direction artistique a du caractère, et l'éthique est affichée dès l'accueil (capture 01).
- **Ce qui fait décrocher avant de jouer.** Le joueur doit saisir son e-mail, sortir de l'application, revenir avec le code, choisir un pseudo, lire 4 diapositives de 70 mots environ, puis choisir son métier (captures 01 à 04). Rien ne mesure cette perte : la télémétrie commence au compte créé.
- **Ce qui fait décrocher à la 10e minute.**
  - Le joueur achète des briques sans jamais améliorer d'atelier (`first_upgrade` n'arrive qu'au jour 3, `venice1450.settings.ts:522`).
  - La feuille de production propose 1 lot par défaut pour toute la saison (bogue `invest`, `Comptoir.tsx:610`).
  - Le guide se termine sur « revenez toutes les 12 heures » (capture 22), sans rendez-vous.
  - Les Avis du jour 1 montrent un mur de boutons grisés (capture 33).
- **Ce qui fait décrocher la première semaine.**
  - Aucune demande de notification en jeu (`Profil.tsx:454`).
  - Les push de la nuit sont perdus (les avis, eux, restent dans la cloche).
  - La série retombe à 0 au premier jour manqué.
  - Aucun aperçu de lien ni `?ref=`.
  - Interface en français seulement.
- **Le Pass ne se vend pas.** Il offre peu et il est donné à ceux qui l'auraient acheté.

## 2. Propositions, par priorité

### E3-1 : La fin du guide fixe le rendez-vous : file pleine, une demande de notification au pic, une gazette à 8 h 05, un plafond global

**Verdict du chef :** À CORRIGER.

**Corrections appliquées :**
- découpage en lot 1 et lot 2 ;
- la nuit, seul le push est perdu ;
- plafond global de 3 push par compte et par jour, tenu à un seul endroit, avec un test qui croise tous les types, attaques urgentes hors plafond ;
- heures de vague lues dans les réglages d'E1-1 ;
- liste blanche des valeurs d'`open` ;
- phrase datée calculée par le serveur ;
- les mesures exigées.

**Type :** amélioration. Elle reprend `live-1`, n° 25, approuvé mais non livré. Je suis le seul propriétaire des notifications et du plafond global.

**Constat**
- La dernière carte du guide (`i18n.ts:1957`, capture 22) n'a ni heure, ni raison, ni demande de notification.
- Les notifications ne s'activent qu'au pied du Profil (`Profil.tsx:454`).
- Entre 22 h et 8 h, l'avis est enregistré dans la cloche (`notifier.ts:373-382`), mais le push est abandonné sans rattrapage (`:385`).
- `url: "/"` est fixe (`:420`).
- Il n'existe aucun plafond quotidien : seule une limite d'un push par heure et par type s'applique (`:404-417`).

**Lot 1 (avant le 1er novembre)**
1. **Une carte « Rendez-vous » remplace « Bravo ».**
   - Bouton or « Tout lancer jusqu'à ce soir » : il applique, à chaque atelier qui peut tourner, la quantité « jusqu'à ce soir » déjà calculée par `untilRest` (`Comptoir.tsx:586`, `:618-620`).
   - Phrase datée, puis bouton « Me prévenir ». **Toutes les heures citées viennent d'une liste `agenda` calculée par le serveur et ajoutée à la vue** : fin de la file de chaque atelier, prochaine vague lue dans les réglages, prochaine Muda. Le client n'écrit aucune heure en dur.
   - La fenêtre de permission du navigateur ne s'ouvre qu'après le toucher sur « Me prévenir » (`enablePush`, `push.ts:43`).
   - Sur iPhone hors écran d'accueil (`needsHomeScreen()`), le bouton ouvre la fiche en deux étapes.
   - Une seule relance, à la 3e session (compteur tenu par le serveur, `accounts.pushAskCount`).
2. **La gazette de 8 h 05.** Un nouveau type `morning` reprend ce que la nuit a gardé dans la cloche : lots prêts, livraisons payées, offres prises. Elle réutilise `welcomeBack()` (`welcome.ts`). Le dédoublonnage se fait par `data.day`, sur le modèle de `weekResults`.
3. **Un plafond global de 3 push par compte et par jour (heure de Paris)**, tenu dans une seule fonction de `notifier.ts` (`underDailyCap`), appelée avant chaque envoi.
   - Les types `URGENT` (attaques) sont hors plafond.
   - E2-2 (convocations) et E3-10 (rappel de 19 h) **déclarent** leur type à cette fonction et n'écrivent aucun plafond eux-mêmes.
   - Test `apps/server/test/notify.test.ts` qui croise tous les types de `NOTIFICATION_KINDS`, `morning` compris : jamais plus de 3 par jour, une attaque toujours envoyée, rien entre 22 h et 8 h, la gazette une seule fois par jour.
4. **Liens profonds.**
   - Le payload porte `url: "/?open=<v>&src=push&kind=<k>"`.
   - Liste blanche côté client : `open ∈ {cargo, rialto, workshops, notices, ranking, terra}`. Toute autre valeur est ignorée et ouvre l'accueil. Test unitaire web.
   - La télémétrie `push_open {kind}` est rattachée au `session_start`.

**Lot 2 (novembre, en cours de mois)**
- **La notification de vague.** Elle lit les heures de vague dans les réglages d'E1-1 (`waves.hours`), sans aucune heure en dur. Elle n'est envoyée que si au moins 2 commandes de la vague sont couvertes par le stock et si le joueur est absent depuis plus de 2 h. Elle compte dans le plafond.
- **Le rappel de série d'E3-10.** Il passe le 1er décembre, avec sa règle, et compte aussi dans le plafond.

**Mesures**
- Acceptation d'au moins 40 % chez ceux qui voient la carte, par la télémétrie `push_ask {accepted, attempt, ios_standalone}`.
- J1 des joueurs avec et sans notifications, comparés dans `/admin`.

**Référence**
- *Hades' Star* : on quitte la partie après avoir lancé des minuteurs longs, et leur fin est notifiée.
- *Duolingo* : il demande la permission après la première leçon, avec sa propre carte avant celle du navigateur.

**Règle transgressée :** aucune. Les heures calmes sont respectées.

**Coût, impact, risque**
- **Coût :** M.
- **Impact :** critique sur le J1, dont la cible est 40 %.
- **Risque :** le bruit, borné par le plafond de 3 et testé.

### E3-2 : Rendre réel « un compte par e-mail », mesurer l'entonnoir, puis soumettre l'invité au porteur sur chiffres

**Verdict du chef :** À CORRIGER.

**Corrections appliquées :**
- lot 0 : `email_canonical` unique, avec la règle de canonisation exacte, la requête des doublons et la liste statique de domaines jetables ;
- lot 1 : l'entonnoir anonyme ;
- un seuil d'au moins 300 `landing_view`, qui donne une décision au porteur fin novembre, sans déclenchement automatique ;
- l'invité n'est pas développé en novembre ;
- le test des deux comptes de même `email_canonical`, qui referme aussi `terra_gift`.

**Type :** correction, puis une décision à prendre.

**Constat**
- `emailSchema = z.string().trim().toLowerCase().email()` (`auth/service.ts:16`). `a+1@gmail.com`, `a+2@gmail.com` ou `a.b@gmail.com` créent autant de comptes qu'on veut, et aucun domaine jetable n'est filtré. La défense « un compte par e-mail vérifié » (CADRAGE) n'existe donc pas.
- Le don entre alliés (`terra_gift`, 50 d par jour, `terraWorld.ts:421`) ouvre ainsi un tuyau vers un compte principal.
- Personne ne mesure combien de visiteurs s'arrêtent à l'écran d'e-mail.

**Proposition**
1. **Lot 0 : la canonisation de l'e-mail.**
   - Nouvelle colonne `accounts.email_canonical`, **unique**. Migration : `pnpm --filter @comptoirs/server db:generate --name email_canonical`. C'est la même chaîne de migrations que `ref` et `utm_*` d'E3-4.
   - Règle de canonisation, en fonction pure testée : minuscules ; `+suffixe` retiré pour **tous** les domaines ; points retirés pour `gmail.com` et `googlemail.com` ; `googlemail.com` ramené à `gmail.com`.
   - L'e-mail affiché et utilisé pour l'envoi reste tel que saisi.
   - Avant l'index unique, une requête liste les doublons existants (`SELECT email_canonical, count(*) … HAVING count(*) > 1`). La liste est soumise au porteur avant la migration.
   - Une liste statique de domaines jetables, versionnée dans `apps/server/src/auth/disposable.ts`, sans aucun appel externe, est refusée à l'inscription avec un message clair.
   - Tests (`apps/server/test/auth.test.ts`) :
     - `a+1@gmail.com` puis `a@gmail.com` : la seconde inscription aboutit au même compte, jamais à un deuxième ;
     - `a.b@googlemail.com` et `ab@gmail.com` donnent le même `email_canonical` ;
     - un domaine jetable est refusé ;
     - **deux comptes ne peuvent jamais avoir le même `email_canonical`**, ce qui referme le canal `terra_gift` entre alias.
2. **Lot 1 : l'entonnoir anonyme.**
   - Étapes : `landing_view` → `link_requested` → `signed_in` → `region_chosen` → `first_produce`.
   - Sans cookie : des compteurs agrégés par jour et par `utm_source`, sans identifiant pour les étapes d'avant le compte.
   - Affichage dans `/admin`, et mention dans `Legal.tsx`.
3. **La décision sur l'invité.** Quand au moins 300 `landing_view` auront été mesurés, le taux `signed_in / landing_view` va au porteur fin novembre (décision 4 du chef). Il n'y a **aucun déclenchement automatique**. Le volet invité **n'est pas développé en novembre**. S'il est décidé plus tard, il reprend les quatre conditions du chef du 20 octobre (aucun transfert de valeur vers un humain, aucune fusion, absent des classements, purge), et l'e-mail est demandé à la première paie.

**Référence :** *OpenFront*, *Melvor Idle* et *Hades' Star* font jouer avant de lier un compte. Mais ici, on mesure d'abord.

**Règle transgressée :** aucune en novembre. Le refus du porteur du 21 octobre n'est rouvert que sur chiffres, et par lui.

**Coût, impact, risque**
- **Coût :** S pour le lot 0, S pour le lot 1.
- **Impact :**
  - une défense anti-multi-compte qui devient réelle ;
  - le canal `terra_gift` refermé ;
  - un chiffre pour trancher sur l'invité.
- **Risque :**
  - un joueur légitime qui utilisait deux alias perd son second compte : la liste des doublons passe par le porteur avant la migration ;
  - une liste jetable incomplète : elle est versionnée et se complète.

### E3-3 : La première amélioration pendant le guide (pas `invest`), et la fin du bogue « 1 lot par défaut »

**Verdict du chef :** À CORRIGER.

**Corrections appliquées :**
- chiffres corrigés (283,5 d, 11 briques et 11 planches, ×2,5) ;
- quantité pré-remplie calculée, rien en dur ;
- message tiré d'`addedOutputBps` ;
- pas nommé `invest`, enregistré par `tutorial.ts` sur l'événement `upgrade`, ce qui corrige `Comptoir.tsx:610` ;
- `first_upgrade` au jour 1 traité comme une règle ;
- guide mesuré sous 10 minutes dans l'e2e.

**Type :** correction (au lot 0, le bogue) et amélioration (au lot 1, le pas du guide). Elle reprend `ftue-2`, n° 22.

**Constat**
- Le pas `market_buy` fait acheter des briques « pour améliorer vos ateliers » (`Coach.tsx:203-221`, capture 17), puis passe au Livre de compte.
- `coach.invest`, `goComptoir` et `investLater` n'apparaissent que dans `i18n.ts`.
- `Comptoir.tsx:609-610` : `learning = !props.view.tutorial.includes("invest")` puis `useState(learning ? 1 : canStart)`. Or `TUTORIAL_STEPS` (`apps/server/src/game/tutorial.ts:4-11`) ne contient pas `invest`. **La feuille propose donc 1 lot par défaut à tout le monde, toute la saison.**
- Chiffres vérifiés :
  - le niveau 2 de la ferme coûte **283,5 d, 11 briques et 11 planches** (`costForLevel`, `buildings.ts:20-31`, et `upgradeMaterialsBps["2"] = 5_000`) ;
  - il produit **×2,5** par rapport au niveau 1 (`outputBps`, `buildings.ts:43-46`).
- Le commentaire « level 5 workshop: × 2 » de `venice1450.settings.ts:823` est faux, puisque le niveau 5 donne ×10. C'est lui qui m'avait induit en erreur ; il est corrigé au lot 0.

**Proposition**
1. **Lot 0 : le pas `invest`.**
   - `TUTORIAL_STEPS` gagne `invest` entre `market_buy` et `mission`. `stepsReached` le marque sur l'événement moteur `upgrade`.
   - Une fois le pas atteint, `Comptoir.tsx:610` propose de nouveau `canStart` par défaut. Pour les joueurs qui ont déjà passé `mission`, `learning` vaut aussi `false` : la condition devient `!tutorial.includes("invest") && !tutorial.includes("mission")`, sinon les comptes existants resteraient bloqués à 1 lot.
   - Test web : un joueur qui a fini son guide voit `canStart` par défaut.
   - Test serveur : `upgrade` marque `invest`.
   - Le commentaire de `venice1450.settings.ts:823` est corrigé en « × 10 au niveau 5 ».
2. **Lot 1 : le pas du guide.**
   - `STEPS` de `Coach.tsx:12` suit `TUTORIAL_STEPS`, avec 7 objectifs.
   - **Quantité pré-remplie**, pour chaque matériau de `costForLevel(atelier brut, niveau + 1)` :
     `max(0, besoin − stock)`, plafonné par `book.quota.buy` (quota Dogana du jour).
     Rien n'est écrit en dur : sur Venise, le guide propose aujourd'hui 11 briques et 11 planches.
   - Le guide ouvre la feuille de l'atelier sur « Améliorer au niveau 2 ».
   - Le texte affiché vient du moteur : « Niveau 2 : ×{(outputBps(2) / outputBps(1))} par lot », calculé depuis `addedOutputBps`, ce qui donne aujourd'hui « ×2,5 par lot ». Il s'envole de l'atelier avec l'ornement du Domaine et le son de la pièce.
3. **Règle : `first_upgrade` passe à `day: 1`** (`venice1450.settings.ts:522-526`, récompense inchangée).
   - Fusionnée sur `main` avant le 31 octobre à 18 h, ou bien en vigueur le 1er décembre.
   - Validation par `pnpm sim` sur 5 graines, avec une ligne dans `docs/calibration.md` et une ligne dans `seasonNotes`.
4. **Mesure** dans l'e2e de `ux-m1` (`layout.mjs`) : le guide complet, amélioration comprise, doit tenir en 10 minutes au plus. Les temps sont écrits dans `timings.json`.

**Référence :** dans *Hades' Star*, on améliore plusieurs modules dans les dix premières minutes. Le joueur part avec « je grandis ».

**Règle transgressée :** aucune. Le changement d'équilibrage est validé au simulateur et respecte la date butoir.

**Coût, impact, risque**
- **Coût :** S pour le lot 0, S à M pour le lot 1.
- **Impact :**
  - fort : le premier « je progresse » ;
  - le bogue corrigé touche **tous** les joueurs, à chaque lancement de production.
- **Risque :** guide plus long d'environ 40 s, sous la porte de 10 minutes, mesurée.

### E3-4 : La vitrine du lancement du 1er novembre : aperçus de lien, manifeste, service worker, `?ref=`

**Verdict du chef :** VALIDÉ.

**Corrections appliquées :** aucune. Le texte est inchangé. Le chef précise seulement le découpage : le titre et le badge de `push-sw.js` passent au lot 0, le reste au lot 1, et `ref` et `utm_*` vont dans la même chaîne de migrations que `email_canonical`.

**Type :** correction.

**Constat**
- `apps/web/index.html` n'a **aucune** balise `og:` ni `twitter:`. Un lien posté le 1er novembre sur Reddit ou Discord s'affichera nu, alors que `docs/marketing/visuels/og-1200x630.jpg` existe.
- Le manifeste (`vite.config.ts:31-50`) n'a ni `id`, ni `screenshots`, ni `shortcuts`, ni `categories`. Chrome Android n'affiche donc pas la fenêtre d'installation riche, et aucun `beforeinstallprompt` n'est écouté.
- `push-sw.js:5` affiche le titre de secours « Comptoirs », l'ancien nom.
- `push-sw.js:8` prend comme `badge` l'icône en couleur, qu'Android rend en carré blanc.
- `chronicle.ts:78` partage une image sans URL.
- Performance mesurée au build du jour : 208 ko gzip en un seul fichier JS, 15 ko de CSS, 1,2 Mo précachés. C'est sous le budget de 250 ko.

**Proposition**
- Balises `og:` et `twitter:summary_large_image` vers `/og.png`, l'image de la campagne copiée dans `public/`.
- Manifeste complet :
  - `id: "/"`, `categories: ["games","strategy"]` ;
  - 3 captures étroites et 2 larges, prises par le script du banc ;
  - raccourcis Cargaisons, Rialto et Classement ;
  - `launch_handler: { client_mode: "focus-existing" }`.
- Badge monochrome de 96 px et titre « Fondaco ».
- Partager porte `https://<domaine>/?ref=<code>`. `ref` et `utm_*` sont gardés en `sessionStorage` dans un `try/catch`, puis enregistrés à l'inscription.
- Invitation à installer à la 2e session, jamais dans la même session que la demande de notification d'E3-1.
- C'est le lot `live-3` et `live-6` (n° 26 et 29), à faire avant le 1er novembre.

**Référence :** *Wordle* s'est propagé par un partage qui porte un lien et un aperçu lisible.

**Règle transgressée :** aucune.

**Coût, impact, risque**
- **Coût :** S (1 jour).
- **Impact :** critique pour l'acquisition du 1er novembre.
- **Risque :** nul.

### E3-5 : L'avant-jeu en 30 secondes : pseudo proposé, une seule diapositive, métier recommandé sous conditions

**Verdict du chef :** À CORRIGER.

**Corrections appliquées :**
- liste de pseudos disjointe de celle des PNJ, avec un test ;
- marqueur « modifiable une fois, gratuitement » ;
- pastille de région seulement si l'écart dépasse 20 % et si au moins 10 humains actifs sont inscrits ;
- phrase sur l'éthique gardée sur la diapositive ;
- lot 1 ;
- mesure : au plus 90 s jusqu'à `first_produce` dans l'e2e.

**Type :** amélioration.

**Constat**
- 4 diapositives (`i18n.ts:66-87`). La première explique les ventes nettes avant même la première vente (capture 03).
- Le pseudo est obligatoire avant de jouer (capture 02).
- Le choix du métier ne dit pas quelle région manque de marchands (capture 04).

**Proposition (lot 1)**
1. **Pseudo proposé.**
   - Il est tiré d'une liste de noms vénitiens `HOUSE_NAMES`, **disjointe** de la liste des maisons PNJ de `apps/server/src/game/bots.ts` (Venier, Barbarigo, Corner, Bembo, etc.).
   - Test serveur : l'intersection des deux listes est vide, et un pseudo proposé n'est jamais un pseudo déjà pris (suffixe ordinal en cas de doublon global).
   - Le compte porte `pseudoDefault: true` : le Profil propose « Changer de nom (une fois, gratuit) ». Après le changement, le marqueur tombe.
2. **Une seule diapositive** : le podium, « Un mois. Le meilleur vendeur devient Doge. », et **la phrase sur l'éthique** : « Rien à acheter qui fasse gagner : ni ducats, ni marchandises, ni vitesse. » Les textes « Comment », « Le commerce » et « Le rythme » passent dans les bulles de Lorenzo, au pas concerné.
3. **Pastille « Recommandé ce mois-ci »** sur la région qui compte le moins d'humains actifs. Elle n'apparaît **que si** l'écart avec la région la plus peuplée dépasse 20 % **et** si au moins 10 humains actifs sont inscrits. Sinon, aucune pastille. C'est une fonction pure testée sur ses deux seuils.
4. **Mesure** : dans l'e2e, le temps médian de l'ouverture à `first_produce` est d'au plus 90 s. Il est suivi aussi dans `/admin`, grâce à l'entonnoir d'E3-2.

**Référence :** dans *Hades' Star*, on est sur la carte en quelques secondes. Le choix guidé vers la région manquante joue le rôle d'un équilibrage des rôles.

**Règle transgressée :** aucune.

**Coût, impact, risque**
- **Coût :** S.
- **Impact :** fort sur le temps jusqu'au premier geste et sur la répartition des régions.
- **Risque :** un pseudo par défaut gardé, sans gravité. Les seuils évitent une pastille qui oscille dans un petit monde.

### E3-6 : Un jour 1 lisible : plus de mur de boutons grisés, des ducats entiers tronqués

**Verdict du chef :** À CORRIGER.

**Corrections appliquées :**
- `whole()` tronque vers zéro et n'arrondit jamais, avec un test ;
- les achats utilisent toujours le montant exact ;
- le libellé unique du coût remplace le texte du commit `709def7`, sans doublon ;
- lot 0.

**Type :** correction (lot 0).

**Constat**
- **Capture 33.** Pour chacune des 3 tâches, un bouton grisé « Changer · 3 ✦ » et la ligne `rerollNeed` (« Il faut 3 ✦ d'Influence pour la changer. », `i18n.ts:1832`), ajoutée par le commit `709def7` dans `Daily.tsx:69-75`, alors que le joueur a 0 ✦.
- **Captures 34 et 24.** « 1 128,55 » dans la bourse, « −29,72 d » pour le rival. `format.ts:1-4` met jusqu'à 2 décimales partout.

**Proposition (lot 0)**
1. **Le bouton « Changer »** (`Daily.tsx:47-58`) n'est rendu que si `influence ≥ spend.dailyReroll`.
   - Les 3 lignes `rerollNeed` par tâche (`Daily.tsx:69-75`) sont **remplacées** par une seule ligne `.meta` sous la liste : `rerollCost(n, have)`, « Changer une tâche : 3 ✦ (vous : 0) ».
   - La clé `rerollNeed` est supprimée, pour éviter tout doublon.
2. **Un formateur `whole(deniers)`** qui **tronque vers zéro** (division entière en `bigint` par 100, jamais d'arrondi) : 1 128,80 s'affiche 1 128, jamais 1 129 ; −29,72 s'affiche −29.
   - Il sert aux montants de 100 d ou plus : bourse, rival, classement, Bon retour, totaux des cargaisons.
   - Les prix unitaires de moins de 10 d gardent `d()` et leurs 2 décimales au Rialto.
   - Tests dans `apps/web/test/format.test.ts` : 1 128,80 donne « 1 128 », −29,72 donne « −29 », 99,99 passe par `d()`.
   - Les feuilles d'achat et de vente, leur confirmation et le test d'achat utilisent **toujours le montant exact** (`d()`), jamais `whole()`.

**Référence :** *Melvor Idle* affiche des chiffres ronds, et les centimes restent au prix unitaire, comme sur une cote.

**Règle transgressée :** aucune. Seul l'affichage change.

**Coût, impact, risque**
- **Coût :** S.
- **Impact :** moyen.
- **Risque :** nul. La troncature garantit qu'on n'affiche jamais plus que ce qu'on a.

### E3-7 : La Compagnie

**Verdict du chef :** REFUSÉ (doublon).

**Corrections appliquées :** proposition retirée et fusionnée dans E2-8, seul propriétaire. E2-8 reprend d'E3-7 :
- le lien d'invitation `?ref=…&co=…` ;
- la région qui manque à la compagnie, mise en avant à l'arrivée de l'invité.

Les offres « réservées à ma compagnie » sont abandonnées. Je ne la redéfends pas.

### E3-8 : L'interface en anglais, avant les posts anglophones

**Verdict du chef :** À CORRIGER.

**Corrections appliquées :**
- lot 2 (novembre) ;
- lancement du 1er novembre sur les communautés francophones, posts anglais seulement après la livraison ;
- périmètre élargi à `notify/texts.ts`, `mail/templates.ts`, `seasonNotes`, l'Aide et `Legal.tsx` ;
- test de clé manquante ;
- `layout.mjs` rejoué en anglais aux deux formats ;
- noms vénitiens gardés en italien.

**Type :** nouvelle fonctionnalité (lot 2).

**Constat**
- La campagne vise r/incremental_games, r/BrowserGames, r/WebGames et itch.io (`campagne.md`). Le post anglais avoue « The interface is in French for now ».
- Le texte est centralisé :
  - `i18n.ts` : 2 580 lignes, importé par 56 fichiers ;
  - `notify/texts.ts` : 311 lignes ;
  - `mail/templates.ts` : 29 lignes.

**Proposition (lot 2)**
1. **Périmètre.**
   - `apps/web/src/i18n.ts`, Aide et `fr.game.seasonNotes` compris ;
   - `apps/server/src/notify/texts.ts` et `apps/server/src/mail/templates.ts` ;
   - **les mentions légales** (`apps/web/src/legal/Legal.tsx`, `legal/info.ts`) : sans elles, pas de lancement anglophone.
2. **Typage.** Un dictionnaire `en` déclaré `const en: typeof fr`. Test `apps/web/test/i18n.test.ts` : il parcourt `fr` et échoue sur toute clé absente de `en`, ou sur une valeur de type différent. Même test côté serveur pour les textes des notifications et des e-mails.
3. **Choix de la langue.**
   - Elle vient de `navigator.language`, avec un sélecteur dans le Profil.
   - `accounts.lang` sert aux notifications et aux e-mails.
   - Un seul monde : les deux langues jouent dans le même carnet.
4. **Noms propres.** Les noms vénitiens et italiens restent en italien : villes, Rialto, Dogana, Muda, fattore, colleganza, Signore, maisons.
5. **E2e.** `layout.mjs` rejoué avec `LANG=en` à 390 × 844 et 320 × 568, avec les mêmes règles d'`assert.mjs`.
6. **Calendrier.** Le 1er novembre, lancement sur les communautés francophones. Les posts anglais (r/incremental_games et suivants) partent après la livraison de l'anglais **et** de ses mentions légales. Il faut mettre à jour l'ordre des posts dans `campagne.md`.

**Référence :** *Hades' Star* et *OpenFront* sont anglais d'abord. *Melvor Idle* a ouvert ses traductions ensuite.

**Règle transgressée :** CLAUDE.md (« Langue de l'interface : français ») et le périmètre MVP. Justification : la campagne a choisi elle-même des canaux anglophones, et le critère de sortie (100 inscrits venus de communautés) en dépend. **Accord du porteur requis (décision 7).**

**Coût, impact, risque**
- **Coût :** M (2 à 3 jours, relecture par un anglophone comprise).
- **Impact :** fort sur l'acquisition et la liquidité.
- **Risque :** chaque chaîne s'écrit deux fois. Le test de clé manquante l'impose.

### E3-9 : Le Pass devient « Mécène de la Sérénissime » : aucun effet de jeu, jamais donné

**Verdict du chef :** À CORRIGER.

**Corrections appliquées :**
- `deepBook` décrit correctement (profondeur affichée de 10 au lieu de 5) ;
- vote du thème retiré ;
- information gratuite pour tous au lot 2, en affichage seul ;
- test de schéma qui refuse toute clé non cosmétique ;
- `pnpm sim --pass` gardé en CI à 0 % d'écart ;
- trois cosmétiques dessinés avant toute vente ;
- Stripe et CGV en V1 ;
- plus aucun Pass donné au classement, remplacé par des trophées non achetables.

**Type :** amélioration (modèle économique).

**Constat**
- Le Pass est éteint (`pass.enabled: false`, `venice1450.settings.ts:808-815`). Ses avantages actuels :
  - cours sur 30 jours (7 pour tous) ;
  - tableau de bord sur 30 jours ;
  - `deepBook`, c'est-à-dire **une profondeur affichée du carnet de 10 lignes au lieu de 5** (`view.ts:581`) ;
  - sceau et palette.
- Il est donné au top 10 de chaque semaine (`weekly.ts:89-92`) et aux paliers de la saison (`season.ts:128`). L'acheteur naturel, le joueur assidu, l'obtient donc gratuitement.

**Proposition**
1. **Lot 2 (novembre, affichage seul, sans simulation).** Le cours sur 30 jours, le tableau de bord sur 30 jours et la profondeur de 10 deviennent **gratuits pour tous** (`view.ts:581` : `depth = 10`).
2. **Le Mécène (3,99 € par mois, 1,49 € la semaine).** Purement cosmétique et de soutien :
   - palette Or de Venise et sceau ;
   - ornements du Domaine ;
   - nom doré dans le Journal du Rialto ;
   - chronique de saison illustrée.

   Il n'y a **pas de vote du thème** : on ne paie pas pour voter.
3. **Aucun effet de jeu, garanti par le schéma.** `settings.pass.perks` n'accepte plus que des clés cosmétiques déclarées (`cosmetics`, `seal`, `domainOrnaments`, `goldenName`, `illustratedChronicle`). Un test du schéma refuse toute autre clé. Les quatre réglages déjà forcés à 0 le restent. `pnpm sim --pass 0.2` reste en CI et doit montrer **0 %** d'écart.
4. **Trois cosmétiques dessinés avant toute vente.** Sans eux, `pass.enabled` reste à `false`.
5. **Le classement ne donne plus de Pass.**
   - `grantPass` est retiré de `weekly.ts:89-92` et de `season.ts:128`.
   - Il est remplacé par des **trophées non achetables** : cadre de blason du Doge, bannière de podium, titre de la semaine.
   - C'est un changement de règle des récompenses : il entre en vigueur au changement de mois, avec ses `seasonNotes`.
6. **Paiement Stripe et CGV : V1**, hors novembre.

**Ordre de grandeur honnête :** 300 joueurs × 4 % × 3,99 € ≈ 50 € par mois, soit l'hébergement. Le vrai revenu viendra des mondes privés (V2 du cadrage).

**Référence**
- *Path of Exile* finance un jeu de niche avec des cosmétiques et des packs de soutien seulement.
- *Melvor Idle* : zéro pay-to-win, et une communauté bienveillante.
- *Hades' Star* est le contre-exemple, avec ses cristaux qui accélèrent le jeu.

**Règle transgressée :** CLAUDE.md, avantages « utiles seulement à un joueur actif ; tous gagnables au classement ». Justification : ces clauses protègent l'équité d'un Pass qui a des effets. Un soutien purement cosmétique ne la menace pas, et le rendre gagnable détruit son seul acheteur. L'écart de 5 % au plus reste vérifié, et il devient 0. **Décision du porteur (décision 8).**

**Coût, impact, risque**
- **Coût :** S (réglages, schéma, trophées, affichage gratuit). M en V1 pour Stripe et les CGV.
- **Impact :**
  - un revenu possible plutôt que zéro ;
  - un argument « zéro avantage » imparable ;
  - plus d'asymétrie d'information.
- **Risque :** des cosmétiques trop pauvres. La règle « 3 pièces dessinées avant toute vente » le borne.

### E3-10 : Une série clémente : un jour de grâce par semaine, et un seul rappel

**Verdict du chef :** VALIDÉ.

**Corrections appliquées :** aucune. Le texte est inchangé. Le chef précise : la règle entre en vigueur le 1er décembre, et le rappel de 19 h est déclaré à E3-1, dans son plafond.

**Type :** amélioration (règle).

**Constat**
- La série du coffre retombe à 0 au premier jour manqué (`activity.ts:218`, `:262`).
- Le coffre vaut 10 d au premier jour et 22 d à cinq jours (`venice1450.settings.ts:756`).
- La perte économique est minime, mais la sanction psychologique est maximale : c'est le moment classique où l'on décroche la première semaine.
- Le « sceau de grâce » attend l'arbitrage du porteur dans `IDEAS.md`.

**Proposition**
- Une absence d'un jour par période de 7 jours ne casse pas la série. C'est automatique, rien à acheter ni à gagner.
- Le coffre affiche « Série : 4 jours · grâce disponible ».
- Un rappel push à 19 h, seulement si la série atteint au moins 3 jours et que le coffre est fermé. Il compte dans le plafond d'E3-1.
- La règle entre en vigueur au changement de mois (le 1er décembre) et s'écrit dans `fr.game.seasonNotes`.

**Référence :** *Duolingo* a introduit le gel de série parce que la série brisée était son premier point de départ des joueurs.

**Règle transgressée :** le gel des mécaniques. **Arbitrage écrit du porteur requis (décision 10).**

**Coût, impact, risque**
- **Coût :** S (moteur et test sur la fixture, `pnpm sim`).
- **Impact :** moyen sur le J7.
- **Risque :** environ +2 % de monnaie des coffres, à mesurer en simulation.

### E3-11 : Daltonisme et taille du texte : les signes d'abord, le test ensuite, la palette en dernier

**Verdict du chef :** À CORRIGER.

**Corrections appliquées :**
- signes non colorés d'abord, puis le test de Machado (ΔE d'au moins 40, ou un signe) ;
- le vermillon ne change que si le test échoue encore ;
- réglage de taille du texte, avec les `text-[Npx]` passés en `rem` dans le même commit et l'e2e vert à 130 % ;
- lot 2.

**Type :** correction (accessibilité, lot 2).

**Constat**

ΔE Lab mesuré par simulation de Machado sur les tokens de `index.css:29-37` :

| Paire de couleurs | Vision normale | Deutéranopie | Protanopie |
| --- | --- | --- | --- |
| Vert d'eau / vermillon | 92 | 31 | 24 |
| Or / vermillon | 53 | 28 | — |

Les tests actuels (`theme.test.ts`, `terraTones.test.ts`) ne simulent pas le daltonisme. 9 fichiers gardent des tailles en `text-[9px]` à `text-[11px]`, dont 11 occurrences dans TerraLayer.

**Proposition (lot 2), dans cet ordre**
1. **Les signes non colorés d'abord**, partout où un rôle de couleur porte un sens :
   - « + » et « − » devant chaque gain et chaque perte ;
   - **pointillé** pour les alliés et **anneau** pour les ennemis, sur la Terraferme ;
   - icône ou texte à côté de chaque statut.
2. **Le test de Machado** dans `apps/web/test/theme.test.ts`. Pour chaque paire de rôles (or, vert d'eau, vermillon, lapis, eau), il exige un ΔE d'au moins 40 en deutéranopie et en protanopie, **ou** une entrée dans une table `NON_COLOR_CUE` qui nomme le signe utilisé. Un test d'inventaire vérifie que ce signe est bien rendu.
3. **Le vermillon ne change que si le test échoue encore après les signes.** Le changement doit rester AA (test de contraste existant). Pas de refonte de la palette sans cette preuve.
4. **Le réglage « Taille du texte »** à 100, 115 ou 130 % dans le Profil, par la taille de police de la racine.
   - Dans **le même commit**, tous les `text-[Npx]` passent en `rem`.
   - Un test interdit les nouveaux `text-[Npx]`.
   - `layout.mjs` est rejoué à 130 % aux deux formats, et doit rester vert.

**Référence :** *Mini Metro* propose un mode daltonien, sur une carte où la couleur porte le sens.

**Règle transgressée :** aucune.

**Coût, impact, risque**
- **Coût :** S à M.
- **Impact :** moyen pour 6 à 8 % des joueurs.
- **Risque :** le passage à 130 % peut casser des libellés. L'e2e à 130 % le garde.

## Ordre d'exécution (celui du chef)

| Lot | Contenu |
| --- | --- |
| **Lot 0** (avant le 28 octobre) | E3-3, point 1 : bogue `invest` et commentaire faux des réglages. E3-2, point 1 : `email_canonical` et domaines jetables. E3-6. E3-4 : titre et badge de `push-sw.js` |
| **Lot 1** (avant le 1er novembre ; règles fusionnées au 31 octobre à 18 h) | E3-4, le reste. E3-2, point 2 : l'entonnoir. E3-1, lot 1 : rendez-vous, gazette, plafond. E3-3, lot 1 (et `first_upgrade` au jour 1 si fusionné à temps, sinon le 1er décembre). E3-5 |
| **Lot 2** (novembre, en cours de mois) | E3-1, lot 2 : notification de vague, sans le rappel de série. E3-8. E3-9, point 1 : affichage gratuit. E3-11 |
| **1er décembre** (règles) | E3-10 et son rappel. E3-9, point 5 : plus de Pass au classement |
| **Plus tard** | Paiement du Mécène (V1, après les CGV). Jeu en invité, sur décision du porteur fin novembre (au moins 300 `landing_view`) |
