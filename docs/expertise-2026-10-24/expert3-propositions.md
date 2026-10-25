# Expert 3 : mobile/PC, premières minutes, rétention, F2P

24 octobre 2026, état du dépôt `431b862`. J'ai joué la première session complète en 390 × 844 avec le banc `apps/web/e2e/layout.mjs` (build du jour), et les 35 captures sont dans `scratchpad/experts/e3shots/390x844/`. Je cite ces captures par leur numéro. J'ai lu le code de `apps/web/src`, le notifier du serveur et les réglages de Venise. Je n'ai modifié aucun fichier du dépôt.

## 1. Diagnostic

- **Ce qui marche.** Le premier geste rapporte en 30 s (capture 08). La commande de bienvenue express fait 45 s par trajet et paie 150 d (capture 15). Lorenzo suit l'état réel du jeu au lieu d'un script (`Coach.tsx:103`). La DA a du caractère, la feuille des cargaisons est claire et l'éthique est affichée dès l'accueil (capture 01).
- **Avant de jouer, le jeu fait décrocher.** Il faut saisir son e-mail, sortir de l'application pour lire le mail, revenir avec le code, choisir un pseudo, lire 4 diapositives d'environ 70 mots (capture 03), puis choisir un métier (capture 04). Le premier geste n'arrive donc qu'après 3 à 5 minutes et un changement d'application. Rien ne mesure ce qu'on perd à ce stade : la télémétrie commence au compte créé.
- **À la 10e minute, le tutoriel s'arrête au mauvais moment.** On achète des briques « pour améliorer vos ateliers » (capture 17), mais on ne les emploie jamais : `first_upgrade` n'arrive qu'au jour 3 (`venice1450.settings.ts:522`). La dernière carte dit « revenez toutes les 12 heures » (capture 22) sans donner de rendez-vous et sans demander les notifications. Juste derrière, les Avis du jour 1 affichent un mur de boutons grisés (capture 33).
- **Pendant la première semaine, rien n'appelle le joueur.** Les notifications sont enfouies au pied du Profil (`Profil.tsx:454`) et celles de la nuit sont jetées (`notifier.ts:385`). La série du coffre retombe à 0 au premier jour manqué. Il n'y a ni unité sociale (le chat est mort, le rival est un PNJ) ni moyen d'amener un ami : pas d'aperçu de lien, pas de `?ref=`, un partage une fois par mois seulement. Enfin, l'interface n'existe qu'en français, alors que la campagne vise r/incremental_games en anglais.
- **Le Pass ne se vendra pas en l'état.** Il offre peu (de l'information, en partie gratuite) et il est donné gratuitement aux joueurs assidus, c'est-à-dire à ceux qui l'auraient acheté.

## 2. Propositions, par priorité

### E3-1 : La fin du guide fixe le rendez-vous : file pleine jusqu'au soir, une demande de notification au pic, une gazette à 8 h 05

**Type :** amélioration (elle reprend `live-1`, n° 25 de `plan-finalisation.md`, approuvé mais non livré, en déplaçant le moment de la demande).

**Constat**
- Dernière carte du guide (`i18n.ts:1957`, capture 22) : « Revenez récolter au moins toutes les 12 heures ». C'est une consigne vague, sans heure ni raison précise.
- À ce moment, la ferme tourne sur un seul lot de 30 min. Le joueur ferme donc l'onglet avec une file presque vide.
- Les notifications ne se proposent qu'en bas du Profil (`Profil.tsx:454`, `PushSettings.tsx`).
- Tout ce qui tombe entre 22 h et 8 h est jeté sans rattrapage (`notifier.ts:385`, `return`).
- Toutes les notifications ouvrent `/` (`notifier.ts:420`).
- Les vagues de commandes, toutes les 4 h (`venice1450.settings.ts:630`), sont le meilleur motif de retour du jeu, et aucune notification ne les signale.

**Proposition**
- **Remplacer la carte « Bravo » par une carte « Rendez-vous », avec deux boutons dans l'ordre.**
  1. **« Tout lancer jusqu'à ce soir »**, en or. Il réutilise le préréglage « Jusqu'à ce soir » de la feuille de production, déjà calculé (capture 08 : 22 lots), pour chaque atelier qui peut tourner (`harvestAndRestart`).
  2. Une phrase datée, puis **« Me prévenir »**. Par exemple : « Votre ferme finit à 21 h 40. Nouvelle vague de commandes à 16 h. Les galères de la Muda arrivent jeudi à 9 h. Je vous préviens ? » Le bouton appelle `enablePush` (`push.ts:43`) : la fenêtre du navigateur n'apparaît qu'après ce toucher.
  - Sur iPhone hors écran d'accueil (`needsHomeScreen()`), le bouton ouvre une fiche illustrée en 2 étapes.
  - Après un refus, une seule relance, à la 3e session.
- **Une gazette du matin à 8 h 05, en une seule notification.** Elle regroupe ce que la nuit a gardé : lots prêts, livraisons payées, offres prises, et le nombre de commandes de la vague de 8 h que le stock couvre. Elle réutilise `welcomeBack()` (`welcome.ts`).
- **Une notification de vague** : « Vague de 12 h : 3 commandes que votre stock couvre à Padoue et Trévise ». Elle part seulement si au moins 2 commandes sont couvertes et si le joueur est absent depuis plus de 2 h.
- **Un plafond global de 3 notifications par compte et par jour**, hors attaques urgentes, tenu dans `notifier.ts` comme l'exige le chef.
- **Des liens profonds** : `url: "/?open=cargo&src=push&kind=…"`. La télémétrie `push_open` est rattachée au `session_start`.

**Référence**
- *Hades' Star* : on quitte toujours une session après avoir lancé des minuteurs longs (transports, recherches), et le jeu notifie leur fin. Le joueur revient donc à une heure qu'il connaît, pas « quand il y pense ».
- *Duolingo* : il demande la permission juste après la première leçon, au pic de motivation, avec sa propre carte avant la fenêtre du système. C'est devenu le standard pour obtenir l'acceptation.

**Règle transgressée :** aucune. Les heures calmes restent respectées : la gazette condense la nuit au lieu de la jeter.

**Coût, impact, risque**
- **Coût : M** (carte du guide, deux types de notification, plafond, liens profonds, tests `notify.test.ts`).
- **Impact : critique sur le J1** (cible du cadrage : 40 %). Mesures :
  - au moins 40 % d'acceptation chez ceux qui voient la carte ;
  - J1 et J7 des joueurs avec ou sans notifications, comparés dans `/admin`.
- **Risque : le bruit.** Le plafond de 3 par jour et la condition « au moins 2 commandes couvertes » le bornent.

### E3-2 : Mesurer ce que coûte l'e-mail, puis faire jouer avant de le demander (invité verrouillé)

**Type :** correction (mesure) puis nouvelle fonctionnalité.

**Constat**
- Le parcours avant le premier geste :
  - e-mail (`App.tsx:129-215`) ;
  - attente du mail Resend, avec un risque d'indésirables noté dans `docs/marketing/campagne.md` ;
  - code ;
  - pseudo (capture 02) ;
  - 4 diapositives (capture 03) ;
  - métier (capture 04).
- La télémétrie ne commence qu'au compte créé : on ignore combien de visiteurs de Reddit s'arrêtent à l'écran d'e-mail.
- Le porteur a refusé le jeu en invité le 21 octobre (`plan-finalisation.md` n° 20). Il voulait protéger la règle « un compte par e-mail vérifié ». Or cette défense n'existe pas : `emailSchema` (`auth/service.ts:16`) fait seulement `trim().toLowerCase()`. `moi+1@gmail.com`, `moi+2@gmail.com`, etc. donnent donc autant de comptes qu'on veut, et aucun domaine jetable n'est filtré.

**Proposition, en deux temps**
1. **Tout de suite (S)**, un entonnoir anonyme côté serveur :
   - compteur quotidien `landing_view` sans cookie (une ligne par jour et par `utm_source`) ;
   - puis `link_requested`, `signed_in`, `region_chosen` et `first_produce`, horodatés ;
   - mention dans `Legal.tsx`.
   En parallèle, normaliser les adresses (retirer le `+suffixe`, et les points pour gmail) afin de rendre réelle la défense invoquée.
2. **Si moins de 50 % des `landing_view` arrivent à `signed_in` pendant la première semaine de la saison de novembre**, ouvrir l'invité avec les quatre conditions du chef du 20 octobre :
   - aucun transfert de valeur vers un autre humain (Dogana, villes et maisons PNJ seulement) ;
   - aucune fusion de joueurs ;
   - absent des classements publics ;
   - purge à 72 h.
   L'e-mail est demandé **à la première paie** : « Mettez vos 150 ducats à l'abri », juste après l'envol des pièces de `ftue-1`. C'est le moment où le joueur a quelque chose à perdre. Le code à 6 chiffres existe déjà (commit `acc5302`), ce qui retire la moitié du coût estimé de `ftue-3`.

**Référence**
- *OpenFront*, la référence de l'équipe pour la Terraferme, se joue en un clic sans compte.
- *Melvor Idle* et *Universal Paperclips* se lancent sans inscription.
- *Hades' Star* fait jouer d'abord et lie le compte ensuite.
- Dans un jeu par navigateur, le visiteur qui vient d'un lien Reddit décide en moins d'une minute.

**Règle transgressée :** **décision du porteur du 21 octobre** (pas de jeu en invité). Justification :
- la mesure tranche, pas l'intuition ;
- la règle qu'elle protégeait ne protège rien aujourd'hui ;
- les garde-fous anti-transfert du chef rendent un invité inoffensif pour l'économie.

**Coût, impact, risque**
- **Coût :** S pour la mesure ; L pour l'invité.
- **Impact :** potentiellement le plus fort de tout le lot sur les inscriptions venues de communautés (critère de sortie : 100).
- **Risque :** des invités fantômes dans le monde. Ils sont invisibles au classement et purgés à 72 h. La règle sur les transferts est testée côté moteur.

### E3-3 : La première amélioration pendant le guide : on voit grandir sa maison à la 7e minute

**Type :** amélioration (elle reprend `ftue-2`, n° 22, non livré, en plus court).

**Constat**
- Le pas `market_buy` fait acheter des briques « pour améliorer vos ateliers » (`Coach.tsx:203-221`, capture 17), puis le guide passe au Livre de compte.
- Les textes `coach.invest`, `goComptoir` et `investLater` existent (`i18n.ts`) mais ne sont jamais appelés : vérifié par recherche, aucune occurrence dans les `.tsx`.
- La mission `first_upgrade` s'ouvre au jour 3 (`venice1450.settings.ts:522`).
- Pourtant, passer la ferme au niveau 2 coûte 210 d, 15 briques et 15 planches (`:905`, plus 35 % de croissance) : c'est abordable avec 1 000 d dès la 6e minute.
- Résultat : la promesse « bâtir une maison » ne se voit pas le premier jour (niveau moyen 1,3 selon l'audit du 16 octobre).

**Proposition**
- Ajouter un 7e objectif `upgrade` entre `market_buy` et `mission` (`STEPS`, `Coach.tsx:12`).
- Le pas d'achat pré-remplit la quantité qui manque à l'amélioration de l'atelier brut : 15 briques et 15 planches, sous le quota Dogana de 25.
- Lorenzo mène ensuite à « Améliorer au niveau 2 » (capture 08, en bas de la feuille).
- L'amélioration est mise en scène :
  - l'ornement du Domaine apparaît (bannière du niveau 2) ;
  - « +25 % par lot » s'envole de l'atelier ;
  - le son est celui de la pièce.
- `first_upgrade` passe à `day: 1`, avec sa récompense inchangée (10 briques et 10 planches).
- Contrôle : `pnpm sim` sur toutes les graines, et une ligne dans `docs/calibration.md`.

**Référence :** dans les dix premières minutes de *Hades' Star*, on améliore plusieurs modules ; dans *Forge of Empires*, le premier bâtiment monte en quelques secondes. Le joueur part en se disant « je grandis », pas « j'attends ».

**Règle transgressée :** aucune (réglage d'équilibrage validé par la simulation).

**Coût, impact, risque**
- **Coût : S à M.**
- **Impact : fort.** C'est le premier « je progresse », et il ancre la boucle produire → vendre → réinvestir.
- **Risque :** un guide plus long d'environ 40 s. La porte du chef (guide en moins de 10 min) reste tenue.

### E3-4 : La vitrine du lancement du 1er novembre : aperçus de lien, manifeste, service worker, `?ref=`

**Type :** correction.

**Constat**
- `apps/web/index.html` n'a **aucune** balise `og:` ni `twitter:`. Un lien posté le 1er novembre sur Reddit ou Discord s'affichera nu, alors que `docs/marketing/visuels/og-1200x630.jpg` existe déjà.
- Le manifeste (`vite.config.ts:31-50`) n'a ni `id`, ni `screenshots`, ni `shortcuts`, ni `categories`. Chrome Android n'affiche donc pas la fenêtre d'installation riche, et aucun `beforeinstallprompt` n'est écouté.
- `push-sw.js:5` affiche le titre de secours « Comptoirs », l'ancien nom.
- `push-sw.js:8` prend comme `badge` l'icône en couleur : Android la rend comme un carré blanc dans la barre d'état.
- `chronicle.ts:78` partage une image sans URL.
- Performance mesurée au build du jour : 208 ko gzip en un seul fichier JS, 15 ko de CSS, 1,2 Mo précachés. C'est sous le budget de 250 ko : pas de chantier de performance urgent.

**Proposition**
- Balises `og:` et `twitter:summary_large_image` pointant vers `/og.png`, l'image de la campagne copiée dans `public/`.
- Manifeste complet :
  - `id: "/"`, `categories: ["games","strategy"]` ;
  - 3 captures étroites et 2 larges, prises par le script du banc ;
  - raccourcis Cargaisons, Rialto et Classement ;
  - `launch_handler: { client_mode: "focus-existing" }`.
- Badge monochrome de 96 px et titre « Fondaco ».
- Partager porte `https://<domaine>/?ref=<code>`. Le `ref` et les `utm_*` sont gardés en `sessionStorage` dans un `try/catch`, puis enregistrés à l'inscription.
- L'invitation à installer arrive à la 2e session, jamais dans la même session que la demande de notification d'E3-1.
- C'est le lot `live-3` et `live-6` (n° 26 et 29), approuvé et non livré, **à faire avant le 1er novembre**.

**Référence :** *Wordle* s'est propagé grâce à un partage qui porte le lien et un aperçu lisible. Sans aperçu, un post Reddit perd sa vignette, et donc ses clics.

**Règle transgressée :** aucune.

**Coût, impact, risque**
- **Coût : S** (1 jour).
- **Impact : critique pour l'acquisition du 1er novembre.**
- **Risque :** nul.

### E3-5 : L'avant-jeu en 30 secondes : pseudo proposé, une seule diapositive, métier recommandé

**Type :** amélioration.

**Constat**
- 4 diapositives (`i18n.ts:66-87`). La première explique les ventes nettes avant même que le joueur ait vendu quoi que ce soit (capture 03 : 70 mots).
- Le pseudo est obligatoire avant de jouer (capture 02).
- Le choix du métier ne dit pas quelle région manque de marchands (capture 04). C'est pourtant la première décision qui pèse sur la liquidité des carnets, le risque n° 1 du cadrage.

**Proposition**
- Un pseudo tiré d'une liste de noms vénitiens (« Casa Bembo »), modifiable plus tard dans le Profil, avec un seul bouton « Continuer ». En cas de doublon global, ajouter un suffixe.
- Une seule diapositive : le podium et une phrase (« Un mois. Le meilleur vendeur devient Doge. »). Les textes « Comment », « Le commerce » et « Le rythme » passent dans les bulles de Lorenzo, au pas concerné.
- Sur le choix du métier, une pastille « Recommandé ce mois-ci » sur la région la moins peuplée en joueurs humains actifs : « Peu de briquetiers : vos briques trouveront preneur ». Le serveur connaît déjà les régions des joueurs.

**Référence :** dans *Hades' Star*, l'histoire tient en une ligne et on est sur la carte en quelques secondes. Le choix guidé vers la région manquante joue le rôle d'un matchmaking qui équilibre les rôles d'une équipe.

**Règle transgressée :** aucune.

**Coût, impact, risque**
- **Coût : S.**
- **Impact : fort.** Mesure : temps médian entre l'ouverture et `first_produce` dans `/admin`. Les régions sont aussi mieux réparties, donc les carnets plus pleins.
- **Risque :** un pseudo par défaut gardé par paresse, ce qui est sans gravité. Une recommandation qui oscille d'un joueur à l'autre se règle par un seuil d'écart de 20 %.

### E3-6 : Un jour 1 lisible : plus de mur de boutons grisés, des ducats ronds

**Type :** correction.

**Constat**
- **Capture 33, les Avis au jour 1.** Chacune des 3 tâches montre un bouton grisé « Changer · 3 ✦ » et la ligne « Il faut 3 ✦ d'Influence pour la changer » (`Daily.tsx:47-75`), alors que le joueur a 0 ✦. Ces 6 éléments ne servent à rien et repoussent le coffre et le Livre de compte sous la ligne de flottaison.
- **Captures 34 et 24.** Le HUD affiche « 1 128,55 », le rival « −29,72 d », un achat « 10,2 d ». `format.ts:1-4` met jusqu'à 2 décimales partout. C'est le constat V7 de l'audit du 19 octobre, jamais corrigé.

**Proposition**
- Le bouton « Changer » n'apparaît que si `influence ≥ coût`. Sinon, une seule ligne `.meta` sous la liste : « Changer une tâche : 3 ✦ (vous : 0) ».
- Un formateur `whole()` : les montants de 100 d ou plus s'affichent sans décimales (bourse, rival, classement, Bon retour, cargaisons). Les prix unitaires de moins de 10 d gardent leurs 2 décimales au Rialto. Un test dans `format.test.ts`.

**Référence :** *Melvor Idle* et *Universal Paperclips* montrent des chiffres ronds qui montent. Les centimes réservés au prix unitaire, c'est la convention d'une cote de bourse.

**Règle transgressée :** aucune. L'affichage seul change : les montants restent des entiers en deniers.

**Coût, impact, risque**
- **Coût : S.**
- **Impact : moyen.** C'est le premier écran « système » que voit le joueur.
- **Risque :** nul.

### E3-7 : La Compagnie : un lien d'invitation qui forme un trio boulanger, briquetier, charpentier

**Type :** nouvelle fonctionnalité.

**Constat**
- Le jeu repose sur l'interdépendance des trois métiers (« Vous ne pouvez pas tout faire seul », `i18n.ts:79`), mais rien ne permet de jouer *avec quelqu'un* :
  - guildes et familles ont été retirées ;
  - `familyChat.ts` est du code mort à nettoyer ;
  - le rival est une maison PNJ (capture 34) ;
  - aucune invitation n'existe (KPI du cadrage : 0,5 invitation par joueur) ;
  - la chronique se partage une fois par mois.
- Dans la première semaine, celui qui joue seul face à 40 PNJ n'a aucune raison sociale de revenir.

**Proposition**
- Profil, puis « Inviter un associé » : un lien `/?ref=<code>&co=<id>`.
- L'invité arrive sur le choix du métier avec la région qui manque à la compagnie mise en avant : « Votre compagnie a un boulanger : devenez briquetier ».
- Une compagnie réunit 2 à 4 marchands, pour la saison (on la reforme en un toucher au mois suivant). Elle donne :
  1. **un fil de compagnie** qui réutilise `familyChat.ts` (280 caractères, filtre, signalements déjà écrits) et publie seul les besoins des membres, tirés de leurs offres d'achat ouvertes (« Bembo cherche 20 planches à 2,4 d ») ;
  2. **des offres « réservées à ma compagnie »** au Rialto, bornées entre 60 et 150 % de la référence comme les autres ;
  3. **les commandes de compagnie déjà en jeu**, mises en évidence pour elle, **sans aucune prime de plus** ;
  4. un titre cosmétique de la semaine pour la compagnie la mieux classée en ventes nettes par membre.
- Le classement reste individuel. Aucun ducat n'est créé.

**Référence :** dans *Hades' Star*, la corporation est la première raison de rester : les étoiles blanches et le chat de corpo font revenir des joueurs qui auraient décroché seuls. Les guildes de *Forge of Empires* jouent le même rôle. Ici, l'unité sociale *est* la mécanique du jeu, l'interdépendance des régions, et non un système plaqué dessus.

**Règle transgressée :** **le gel des mécaniques** (hors du lot du 20 octobre), et `IDEAS.md` (« Parrainage avec blason exclusif », non retenu). Justification :
- c'est la seule boucle virale et sociale du jeu ;
- elle crée zéro monnaie ;
- elle recycle du code existant (le fil, les commandes de compagnie) ;
- elle remplit les carnets, le risque n° 1.

**Coût, impact, risque**
- **Coût : M** (table `companies`, route d'invitation, fil recyclé, offres réservées).
- **Impact : fort.** Mesures :
  - invitations envoyées par joueur ;
  - J7 des membres de compagnie face aux solitaires.
- **Risque :**
  - un multi-compte qui alimente son compte principal : ce n'est pas plus facile qu'avec les offres publiques, et c'est borné en prix ;
  - des compagnies vides dans un petit monde : la compagnie reste facultative.

### E3-8 : L'interface en anglais avant de poster sur les subreddits anglophones

**Type :** nouvelle fonctionnalité.

**Constat**
- La campagne vise r/incremental_games, r/BrowserGames et r/WebGames, puis itch.io (`campagne.md`). Le post anglais doit avouer « The interface is in French for now ».
- Le texte est déjà centralisé : `i18n.ts` (2 580 lignes, importé par 56 fichiers), `notify/texts.ts` (311 lignes), `mail/templates.ts` (29 lignes). Le recensement trouve 4 chaînes en dur hors de ces fichiers.

**Proposition**
- Un dictionnaire `en` typé `typeof fr` : TypeScript signale toute clé manquante.
- La langue vient de `navigator.language`, avec un sélecteur dans le Profil et une colonne `accounts.lang` pour les notifications et les e-mails.
- Une relecture par un anglophone du genre (gestion), puis `layout.mjs` rejoué avec `LANG=en`.
- Le monde reste unique : français et anglais jouent dans le même carnet, ce qui densifie la liquidité au lieu de la fragmenter.

**Référence :** *Hades' Star* et *OpenFront* sont anglais d'abord. *Melvor Idle* a commencé en anglais et ouvert les traductions ensuite. Pour une niche de « tableurs », l'audience anglophone est plusieurs fois l'audience francophone.

**Règle transgressée :** CLAUDE.md (« Langue de l'interface : français, i18n prévu ») et périmètre MVP. Justification : le critère de sortie (100 inscrits venus de communautés) dépend des canaux que la campagne a elle-même choisis, et ces canaux sont anglophones.

**Coût, impact, risque**
- **Coût : M** (2 à 3 jours, relecture comprise).
- **Impact : fort sur l'acquisition et la liquidité.**
- **Risque :** chaque nouvelle chaîne s'écrit deux fois. Le typage l'impose et la revue le vérifie.

### E3-9 : Le Pass devient « Mécène de la Sérénissime » : zéro effet de jeu, payable tout de suite, jamais donné

**Type :** amélioration (modèle économique).

**Constat**
- Le Pass est désactivé (`settings.pass.enabled: false`, `venice1450.settings.ts:808-815`). Ses avantages :
  - cours sur 30 jours (7 pour tous) ;
  - tableau de bord sur 30 jours ;
  - carnet à 10 offres (5 pour tous) ;
  - sceau et palette.
- Il est **donné** au top 10 de chaque semaine (`weekly.ts:12`, `grantPass`), et au top 10, top 10 % et top 25 % de la saison (CADRAGE, tableau des récompenses). Dans un monde de 100 humains, l'acheteur naturel, le joueur assidu, l'aura gratuitement.
- Comme il donne encore de l'information, son paiement reste bloqué par `pnpm sim --pass 0.2` sur toutes les graines.
- Résultat : un produit peu désirable, distribué gratuitement à sa cible, et invendable par construction.

**Proposition**
1. **Le cours sur 30 jours et le carnet à 10 offres deviennent gratuits pour tous.** Il n'y a plus d'asymétrie d'information, et le jeu se simplifie.
2. **Le Mécène (3,99 €/mois, 1,49 € la semaine)** devient purement cosmétique et de soutien :
   - palette Or de Venise et sceau ;
   - ornements du Domaine ;
   - nom doré dans le Journal du Rialto ;
   - chronique de saison illustrée ;
   - une voix au vote du thème de la saison suivante.
3. **Le classement récompense par des trophées exclusifs et non achetables** (cadre de blason du Doge, bannière de podium, titre de la semaine). Ils ont plus de prestige qu'un Pass que tout le monde peut acheter.
4. **Sans aucun effet de jeu, la condition de simulation devient triviale** (écart de 0 %, gardé en test). Le paiement Stripe peut s'ouvrir dès que les CGV sont prêtes.
- **Ordre de grandeur honnête** : 300 joueurs × 4 % × 3,99 € ≈ 50 € par mois, soit l'hébergement Railway, pas un salaire. La vraie ligne de revenu reste les mondes privés pour les communautés (V2 du cadrage, sur le modèle de *Minecraft Realms*), à ouvrir quand l'instance pourra tenir plusieurs mondes.

**Référence :**
- *Path of Exile* finance un jeu de niche exigeant avec des cosmétiques et des packs de soutien seulement.
- *Melvor Idle* doit la bienveillance de sa communauté à zéro pay-to-win.
- *Hades' Star* est le contre-exemple : ses cristaux accélèrent le jeu, et c'est sa critique n° 1.

**Règle transgressée :** CLAUDE.md, « avantages… utiles seulement à un joueur actif ; tous gagnables au classement », et le verrou de paiement lié à la simulation. Justification :
- ces règles protègent l'équité ;
- un Pass sans aucun effet de jeu ne la menace pas ;
- le rendre « gagnable » détruit ses ventes ;
- l'équité gagne même un cran, puisque l'information devient gratuite pour tous.

**Coût, impact, risque**
- **Coût :** S pour les réglages, l'interface et les trophées ; M pour le paiement Stripe et les CGV.
- **Impact :** un revenu possible, au lieu de zéro, et un message « zéro avantage » imparable dans les posts.
- **Risque :** des cosmétiques trop pauvres pour se vendre. Il faut 3 pièces dessinées au lancement, pas plus.

### E3-10 : Une série clémente : un jour de grâce par semaine, et un seul rappel

**Type :** amélioration (règle).

**Constat**
- La série du coffre retombe à 0 au premier jour manqué (`activity.ts:218`, `:262`).
- Le coffre vaut 10 d au premier jour et 22 d à cinq jours (`venice1450.settings.ts:756`).
- La perte économique est minime, mais la sanction psychologique est maximale. C'est le moment classique où un joueur de la première semaine décroche (« j'ai raté un jour, tant pis »).
- Le « sceau de grâce » attend l'arbitrage du porteur dans `IDEAS.md`.

**Proposition**
- Une absence d'un jour par période de 7 jours ne casse pas la série. C'est automatique, rien à acheter ni à gagner.
- Le coffre affiche « Série : 4 jours · grâce disponible ».
- Un rappel push à 19 h, seulement si la série atteint au moins 3 jours et que le coffre est fermé. Il compte dans le plafond d'E3-1.
- La règle prend effet au changement de mois et s'écrit dans `fr.game.seasonNotes`.

**Référence :** *Duolingo* a introduit le gel de série parce que la série brisée était son premier point de départ des joueurs. Une série clémente garde l'habitude sans punir la vie réelle.

**Règle transgressée :** le gel des mécaniques (petit changement de règle). Arbitrage écrit du porteur requis.

**Coût, impact, risque**
- **Coût : S** (moteur et test sur la fixture, `pnpm sim`).
- **Impact : moyen sur le J7.**
- **Risque :** environ +2 % de monnaie des coffres. À mesurer en simulation.

### E3-11 : Daltonisme et taille du texte : un test, pas une promesse

**Type :** correction (accessibilité).

**Constat**
- J'ai calculé l'écart de couleur (ΔE Lab, avec la simulation de Machado) entre les couleurs de rôle de `index.css:29-37` :
  - vert d'eau (gain, allié en Terraferme) face au vermillon (perte, ennemi) : **92 en vision normale, 31 en deutéranopie, 24 en protanopie** ;
  - or (« à vous » en Terraferme) face au vermillon : **53, et 28 en deutéranopie**.
- Environ 8 % des hommes sont concernés, sur une cible adulte majoritairement masculine.
- Les tests actuels (`theme.test.ts`, `terraTones.test.ts`) vérifient le contraste et l'écart entre tons, mais jamais sous simulation de daltonisme.
- 9 fichiers gardent des tailles en `text-[9px]` à `text-[11px]` (TerraLayer en a 11).

**Proposition**
- Étendre `theme.test.ts` avec la matrice de Machado : chaque paire de rôles doit garder un ΔE d'au moins 40 en deutéranopie et en protanopie, ou porter un signe autre que la couleur (+/−, pointillé, anneau). Le test doit lister les exceptions.
- Décaler le vermillon vers un rouge-magenta (par exemple 235 90 125, à valider en AA) pour le séparer de l'or et du vert d'eau.
- Un réglage « Taille du texte » à 100, 115 ou 130 % dans le Profil, par la taille de police de la racine (Tailwind est en rem). Les `text-[Npx]` passent en rem.

**Référence :** *Mini Metro* propose un mode daltonien, sur une carte où la couleur porte tout le sens, comme dans la Terraferme.

**Règle transgressée :** aucune.

**Coût, impact, risque**
- **Coût : S.**
- **Impact :** moyen pour 6 à 8 % des joueurs, nul pour les autres.
- **Risque :** toucher la palette rouvre des captures du banc. Le test de contraste existant les garde.

## Ordre conseillé

| Quand | Lot |
| --- | --- |
| Avant le 1er novembre | E3-4 (S), E3-6 (S), le volet mesure d'E3-2 (S) |
| Semaine 1 de la saison | E3-1 (M), E3-3 (S à M), E3-5 (S) |
| Avant de poster en anglais | E3-8 (M) |
| Sur arbitrage du porteur | E3-2 volet invité (L, si les chiffres le demandent), E3-7 (M), E3-9 (S puis M), E3-10 (S) |
| En continu | E3-11 (S) |
