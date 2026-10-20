# Plan de finalisation — le studio (20 octobre 2026)

Cinq experts du jeu mobile ont audité Fondaco (premières minutes, boucle de commerce, Terraferme et social, UX/UI, rétention et monétisation) et proposé 29 idées ; leur chef, intransigeant, les a jugées en deux tours. **Rien n'est exécuté avant la validation du porteur** (CLAUDE.md).

## Verdict du chef

Ce second tour est enfin un plan, et plus un catalogue. J'ai vérifié les points litigieux dans le code. Les réglages du Pass vendent encore de la production et de la file : freshBonusBps 800, marketMakerQuotaBps 2 000 et extraOpenOrders 2 dans venice1450.settings.ts:800-802. welcome.ts:39 recopie 8 raisons, dont une morte. nextActions ne connaît que 4 cas. first_upgrade tombe au jour 3. Le CI ne lance aucun e2e. familyChat lit encore families.memberOf. Le diagnostic est donc juste. Mais les équipes livrent toujours la même chose en double ou en quadruple : trois codes à 6 chiffres, quatre badges PNJ, deux e2e, deux protocoles de playtest, deux fonctions de couverture des commandes. Je fixe un seul propriétaire pour chacune. J'écarte aussi ce qui sort du lot du 20 octobre : le classement des Recrues et le blason. Plus grave, l'entonnoir invité casse la seule défense contre le multi-compte, « un compte par e-mail vérifié » (CADRAGE l.600). Des invités gratuits pourraient nourrir un compte principal par le Rialto, la colleganza ou terraSend. Si ce plan est exécuté tel que je l'ordonne, Fondaco devient un jeu mobile honnête et lisible. Il n'est pas encore publiable : il manque l'anti-multi-compte des invités, un plafond global de notifications, un test de charge, la répétition du changement de saison et un playtest réussi.

**Publiable une fois ce plan exécuté : non, pas encore.**

## Ce qu'il exige encore avant publication

- Connexion sur PWA iOS installé : le lien magique s'ouvre dans Safari, qui ne partage pas le stockage du PWA. Ajouter dans l'e-mail un code à 6 chiffres à saisir dans l'application (même jeton, limité en tentatives). Bloquant pour une cible mobile d'abord.
- Simulation incomplète de l'économie publiée : les bots ne prennent ni entrepôts ni prêts (calibration.md, refonte du commerce), et ces mécaniques créent ou détruisent de la monnaie. Faire jouer les deux aux bots, puis passer pnpm sim sur toutes les graines avant publication.
- Simulation de la Terraferme sur les règles actuelles (heure de bataille, escarmouches, nations, ports, bombardes) avec le rapport cases/Gloire/éliminés par profil. Le dernier tableau assidus/occasionnels date d'avant le lot OpenFront.
- Persistance des escarmouches : elles sont tenues en mémoire et perdues au redémarrage. Avec des parties classées, il faut au minimum ne rien consommer ni payer pour une partie interrompue, et l'annoncer au joueur.
- Ménage du code mort avant publication : familyChat et Famille.tsx, les clés i18n du coach jamais utilisées, l'avantage « Alertes des Criées » alors que criees.perDay vaut 0, et les systèmes coupés encore visibles.
- Playtest avec 5 à 8 vrais nouveaux joueurs sur mobile (enregistrement de l'écran, sans aide) sur les 15 premières minutes, après ftue-1, ftue-3, ux-1 et ftue-6. Critères : premier « Produire » en 60 s, première paie en 5 min, « quoi livrer » trouvé en 10 s.
- Test e2e de la première session complète (de l'invité au Livre de compte) en 390×844 et 320×568, en CI, qui échoue sur tout chevauchement ou débordement horizontal.
- Budget de performance mesuré sur un Android d'entrée de gamme : 60 i/s sur la carte Terraferme, poids du bundle initial, temps jusqu'au premier « Produire » en 4G simulée.
- Arbitrage écrit du porteur sur toute nouvelle mécanique hors du lot du 20 octobre (sceau de grâce, Repli de terra-4), conformément au CLAUDE.md : sans cet arbitrage, la mécanique va dans IDEAS.md.
- Distinction visible entre maisons PNJ et joueurs humains au classement et dans les rivaux : au lancement, le rival « Comm884 » ou « Testeur826 » doit être identifiable.
- Anti-multi-compte des invités (introduit par ftue-3) : CADRAGE l.600 ne protège que par « un compte par e-mail vérifié ». Exiger que les invités non vérifiés ne puissent transférer aucune valeur à un autre humain (échanges entre joueurs au Rialto, colleganza, commandes à prix, commissions, terraSend, dons de ducats, alliances), étendre aux invités la détection des échanges répétés à prix aberrants, et le tester côté engine et serveur.
- Plafond global de notifications par compte et par jour, tenu dans un seul endroit du notifier : commerce (loop-1), morning et streak (live-1), signaux (terra-3), attaques (terra-5), parties interrompues (terra-m1). Exiger un test qui croise tous les types et une requête de contrôle dans /admin.
- Test de charge du serveur avant publication : monde de 300 à 500 comptes joués par le pilote de bots, WebSocket ouverts, tick et vue complète (orderInsight, agenda, vue terra), sur la taille d'instance Railway réelle. Mesurer le p95 de la vue et de la commande, la mémoire, puis faire un redémarrage à chaud avec recover() et les invariants vérifiés au boot.
- Répétition générale du changement de saison sur serveur avec horloge simulée : clôture de la première saison de 41 jours, Cérémonie filtrée sur emailVerifiedAt, purge des invités, report du niveau, de la Renommée et de l'Influence, ouverture du mois suivant, seasonNotes affichées. Aucun test ne couvre aujourd'hui ce passage avec les nouvelles règles.
- Une seule chaîne de migrations ordonnée et testée sur PGlite et PostgreSQL (guest_accounts, login_code, skirmish_matches, push_ask, signup_source) : ftue-3 et ux-m2 touchent la même table login_tokens, donc une seule migration. Faire l'essai de restauration de sauvegarde exigé par docs/deploiement.md, qui n'est pas encore attesté.
- Mise à jour de la politique de confidentialité (apps/web/src/legal/Legal.tsx) pour les nouvelles données : IP pour la limite des invités, signupSource et ref, standalone et télémétrie push, conservation et purge des invités à 7 jours.
- Pour la première saison, des seasonNotes uniques et cohérentes qui récapitulent toutes les règles changées par ce lot (Pass sans avantage de jeu, escarmouches classées une par jour, classement final réservé aux e-mails vérifiés, harvest coupé par défaut), plutôt qu'une ligne ajoutée par chaque équipe.

## Plan approuvé, dans l'ordre d'exécution

### 1. Un Pass Négociant conforme : zéro rendement, zéro file en plus, une liste d'avantages tirée des réglages (`live-2` · effort S · impact critique)

*Expert rétention, live-ops et monétisation éthique*

**Problème.** Trois réglages du Pass vendent de la production ou de l'accès au marché, ce que CLAUDE.md interdit. pass.freshBonusBps = 800 remplace le bonus de fraîcheur de base sur la quantité récoltée (production.ts:66-72). marketMakerQuotaBps = 2 000 donne +20 % de quota à la Dogana. extraOpenOrders = 2 ajoute deux offres au Rialto (market.ts:97), soit une file plus longue (venice1450.settings.ts:798-804). Désactiver le Pass (enabled: false) ne rend pas les réglages conformes. PassPanel.tsx affiche « Alertes des Criées » (t.perks.alerts) et « info » en dur, alors que criees.perDay vaut 0. Calibration.md constate que `pnpm sim --pass 0.2` est non conforme sur plusieurs graines.

**Proposition.** Le Pass ne garde que de l'information en lecture seule (courbe des prix sur 30 jours au lieu de 7, détail du tableau de bord) et du cosmétique (sceau, cadre de chronique, palette). Aucun effet sur les quantités, le quota, le nombre d'offres ou le temps. L'export CSV du livre de compte reste gratuit pour tous, comme aujourd'hui. Le panneau ne liste que les avantages réellement actifs, déduits des réglages, et affiche une phrase de confiance : « Un abonné ne produit pas un grain de plus que vous : la simulation le vérifie chaque saison (Rapport de la Banque) ». Le paiement reste débranché (« Achat bientôt disponible ») tant que la simulation n'est pas conforme sur 10 graines.

**Plan.**
- Test d'abord, packages/engine/test/production.test.ts (fixture test/fixture.ts) : deux joueurs identiques, l'un avec le Pass actif et l'autre sans, récoltent exactement les mêmes quantités, avec ou sans fraîcheur. Ajouter dans market.test.ts : la même limite d'offres ouvertes avec ou sans Pass.
- packages/engine/src/themes/venice1450.settings.ts:798-804 : freshBonusBps 0, marketMakerQuotaBps 0, extraOpenOrders 0 ; garder les champs pour la compatibilité du schéma (settings.ts:242-253, 824-827). Les avantages des spécialités et de la Maîtrise (trader, Mastery.tsx) se gagnent par le jeu : ils ne changent pas.
- packages/engine/src/settings.ts : refinement zod qui refuse un réglage de Pass non nul sur freshBonusBps, marketMakerQuotaBps et extraOpenOrders, pour qu'un futur thème ne puisse pas le réintroduire. Test dédié.
- apps/web/src/game/PassPanel.tsx:36-45 : supprimer t.perks.alerts et sa clé dans apps/web/src/i18n.ts (fr.game.pass.perks.alerts) ; construire la liste uniquement à partir de pass.perks (nouveaux booléens history30Days et dashboardDetail, plus cosmetics) ; ajouter fr.game.pass.trust.
- apps/web/src/game/Marche.tsx et Dashboard.tsx : courbe sur 30 jours et détail réservés au Pass, en lecture seule ; apps/server/src/game/dashboard.ts sert 30 jours seulement à un abonné. L'export CSV de routes.ts n'est pas touché.
- Lancer `pnpm sim --pass 0.2` sur 10 graines et calculer l'écart abonné/non-abonné par la moyenne (calibration.md:288). L'écart restant ne doit venir que de la divergence des parties rejouées. Ajouter la section « Pass Négociant — avantages à zéro » dans docs/calibration.md, avec le tableau par graine.
- CLAUDE.md (règle Pass) et docs/CADRAGE.md : nouvelle liste des avantages (information et cosmétique) ; ligne dans fr.game.seasonNotes.
- Garde-fou : apps/server/src/game/pass.ts refuse tout achat tant que settings.pass.enabled est faux ; le paiement reste débranché jusqu'à un rapport de simulation conforme.

**Mesure.** Le nouveau test production.test.ts passe. `pnpm sim --pass 0.2` est conforme sur 10 graines : écart moyen de patrimoine d'au plus 5 %, et un gratuit assidu devant un abonné occasionnel. Aucune occurrence de t.perks.alerts dans le code (grep). En bêta, la part des abonnés dans le top 10 hebdomadaire reste comparable à leur part des joueurs actifs.

**Le chef.** C'est le premier bloquant, et je l'ai vérifié : production.ts:66 lit pass.freshBonusBps, et market.ts:97 et 151 lisent extraOpenOrders et marketMakerQuotaBps. Le correctif est conforme au CLAUDE.md et ne coûte presque rien. Conditions : mettre les trois réglages à 0 et ajouter le raffinement zod qui refuse une valeur non nulle, avec son test. Les effets de la spécialité trader (Maîtrise) se gagnent au jeu : on n'y touche pas. Supprimer « Alertes des Criées ». La liste des avantages se lit uniquement dans les réglages. On ne modifie PAS la règle du CLAUDE.md, qui est déjà juste : seuls CADRAGE et seasonNotes changent. Le paiement reste débranché tant que pnpm sim --pass 0.2 n'est pas conforme sur 10 graines.

### 2. Escarmouches : une partie classée par jour, entre humains, jamais la nuit (`terra-1` · effort S · impact critique)

*Expert Terraferme, compétition et social*

**Problème.** apps/server/src/game/skirmish.ts `join()` ouvre une salle à toute heure, sans limite par jour. `createSkirmish` (packages/engine/src/skirmish.ts l.79) complète avec des `bot:k`, et `skirmishConfig` force openHours à 0-24. À la fin, chaque humain reçoit `terraSkirmishGlory` : 200/120/80/30 (venice1450.settings.ts), et terraWorld.ts l.346 n'accepte qu'un plafond de 1 000 par commande. Un joueur seul gagne donc contre 7 condottieri toutes les 16 minutes, y compris à 3 h du matin. Comparaison : un assidu fait environ 5 300 de Gloire médiane par semaine (docs/calibration.md). Une victoire par jour, c'est déjà 1 400, soit +26 %. Dix victoires, et la semaine est pliée. Le Signore et son décret, qui touche l'économie de tous, se gagnent en farmant des bots. Les promesses « le jeu dort la nuit » et « pas d'avantage au no-life » tombent aussi.

**Proposition.** La Gloire ne se gagne qu'en « partie classée » : la première escarmouche du jour d'un marchand, entre 8 h et 22 h, avec au moins 2 humains. Les suivantes sont des « parties amicales » qui ne rapportent rien (sauf peut-être un hommage au profil). Le barème passe de 200/120/80/30 à quelque chose comme 60/40/25/10, calibré pour peser au plus 10 % de la Gloire médiane d'un régulier. La barre d'escarmouche affiche « Partie classée · 1 aujourd'hui » ou « Partie amicale : sans Gloire ». La nuit, le bouton ⚔ ESCARMOUCHE du HUD devient « ☾ Escarmouches dès 8 h ».

**Plan.**
- Tests d'abord : packages/engine/test/terraWorld.test.ts (fixture figée). Cas à couvrir : un second `terraSkirmishGlory` le même jour est refusé (`already_ranked`), un refus la nuit (`night`), un refus à moins de `minHumans` humains.
- packages/engine/src/settings.ts, schéma `skirmish` : ajouter `rankedPerDay` (qty, défaut 1) et `minHumans` (positive, défaut 2). Les barèmes vont dans themes/venice1450.settings.ts.
- packages/engine/src/terraferma.ts : ajouter `skirmishRankedToday` sur l'état du joueur (jour de Paris, comme `today.raises`). terraWorld.ts : contrôler les règles dans le cas `terraSkirmishGlory`, avec `isOpen(cfg, now)` pour la nuit. Ajouter une fonction pure `skirmishRanked(cfg, humans, now)` exportée pour le serveur.
- packages/engine/src/skirmish.ts : stocker `ranked: boolean` sur le Skirmish à sa création. apps/server/src/game/skirmish.ts : n'appeler `terraSkirmishGlory` que si `ranked`, puis renvoyer `ranked` et `rankedLeft` dans la vue.
- apps/web/src/game/map/TerraLayer.tsx `SkirmishBar` et `TerraHud` (l.1092) : afficher le badge classée/amicale et l'état de nuit. Textes dans apps/web/src/i18n.ts, `fr.game.skirmish`.
- Simulateur : apps/simulator, profils terra. Ajouter une escarmouche par jour pour les assidus et les réguliers, puis mesurer la part de Gloire venue des escarmouches. Lancer `pnpm sim --terra` (toutes graines) puis `pnpm sim`, et documenter dans docs/calibration.md, section « Escarmouches ».
- Note de saison (`fr.game.seasonNotes`) si un monde est déjà ouvert.

**Mesure.** Simulateur : part de la Gloire hebdomadaire venue des escarmouches ≤ 10 % de la médiane des réguliers, Signore jamais décidé par les escarmouches. Test moteur des trois refus. Télémétrie `/admin` : parties classées et amicales par jour, et aucune Gloire créditée entre 22 h et 8 h dans le journal (`terra_skirmish`).

**Le chef.** Déjà approuvée au premier tour. Les escarmouches classées sont limitées à une par jour et ouvertes à des heures fixes, ce qui met fin au farm de Gloire à 200 contre 7 bots. Elle doit être livrée avec terra-m1 : le quota ne se consomme qu'au paiement.

### 3. Escarmouches persistées : rien de consommé ni payé pour une partie interrompue, et le joueur le sait (`terra-m1` · effort M · impact fort)

*Expert Terraferme, compétition et social*

**Problème.** SkirmishHub (apps/server/src/game/skirmish.ts) garde le salon, la partie et le drapeau `paid` en mémoire, avec ce commentaire : « Lost on a restart ». Après un redémarrage, la partie disparaît sans un mot, et un paiement interrompu en plein milieu de la boucle `for (const r of m.result.ranking)` peut créditer certains joueurs et pas d'autres. Avec des parties classées (terra-1, quota d'une par jour), consommer le quota d'une partie perdue serait injuste, et payer deux fois serait une faille.

**Proposition.** Chaque partie a une ligne en base : skirmish_matches (id, world_id, players, ranked, status open|playing|paid|aborted, started_at). Le paiement passe par une commande unique terraSkirmishPay {matchId, ranks}. Elle est idempotente sur matchId, crédite tous les humains dans la même transaction et ne consomme le quota classé qu'à ce moment-là. Au démarrage, toute partie en open ou playing passe à aborted, sans paiement ni consommation de quota. Les joueurs concernés voient alors « Partie interrompue par une maintenance : aucune Gloire, votre partie classée du jour reste disponible » (bandeau dans SkirmishBar et notification).

**Plan.**
- Moteur, tests d'abord (packages/engine/test/terraWorld.test.ts, fixture figée) : la commande terraSkirmishPay {matchId, ranks} crédite tous les humains, et un second appel avec le même matchId est refusé (`already_paid`, matchId gardé dans s.skirmishPaid de la semaine). Le quota classé de terra-1 n'est consommé que par cette commande. terraSkirmishGlory par joueur est retiré.
- Base : apps/server/src/db/schema.ts reçoit la table skirmish_matches (avec world_id). Lancer pnpm --filter @comptoirs/server db:generate --name skirmish_matches.
- Serveur : apps/server/src/game/skirmish.ts insère la ligne à createSkirmish, la passe à playing puis à paid dans la même transaction que world.execute(terraSkirmishPay), et la passe à aborted au démarrage (méthode recover() appelée dans app.ts avant start()). status() renvoie `interrupted: true` aux joueurs d'une partie aborted récente.
- Notifications : un événement skirmish_aborted pour chaque humain de la partie, avec son texte dans apps/server/src/notify/texts.ts (soumis aux quiet hours).
- Web : apps/web/src/game/map/TerraLayer.tsx SkirmishBar affiche le bandeau d'interruption. Texte dans apps/web/src/i18n.ts, fr.game.skirmish.interrupted.
- Tests serveur (apps/server/test/skirmish.test.ts) : un redémarrage simulé en pleine partie la passe à aborted, n'émet aucune Gloire et laisse le quota intact ; un double paiement est refusé ; tous les humains sont crédités ou aucun.

**Mesure.** Tests serveur du redémarrage et du double paiement. Télémétrie /admin : parties aborted par semaine, zéro journal terra_skirmish en double pour un même matchId, et aucun quota classé consommé par une partie aborted.

**Le chef.** Vérifié : skirmish.ts:23 dit « Lost on a restart », et le drapeau paid vit en mémoire. Avec des parties classées, payer deux fois ou consommer le quota d'une partie perdue n'est pas acceptable. Le paiement passe par une commande unique, idempotente par matchId et atomique, et recover() met les parties en aborted au démarrage. C'est le minimum honnête. La reprise d'une partie en cours va dans IDEAS.md, comme proposé.

### 4. Garde-fou de mise en page en CI : la première session complète à 390×844 et 320×568, qui échoue sur tout chevauchement (correction du HUD Terraferme comprise) (`ux-m1` · effort M · impact critique)

*Directrice UX/UI mobile et direction artistique*

**Problème.** Dans t_terra.png, « Rival : Testeur826 » est écrit par-dessus « Trêve, la guerre dans 23 h 24 ». La colonne gauche du HUD (Hud.tsx:231, max-w-[52vw]) et la note de droite (TerraLayer.tsx:1068, max-w-[58vw]) occupent 110 % de la largeur. Le libellé « Mantoue » est aussi recouvert par un pion. Le CI (.github/workflows/ci.yml) lance lint, typecheck, test et build, mais aucun e2e : rien n'empêche ces régressions. tutorial.mjs ne tourne qu'à la main, en 390×844.

**Proposition.** Le HUD du haut devient une grille à deux colonnes réservées (identité à gauche, état à droite) avec minmax(0,1fr), et chaque ligne se tronque proprement dans sa colonne. Le rival passe sous la grille, sur une ligne à lui. Un e2e Playwright en CI rejoue la première session complète : invité, pseudo, Produire, récolte, transformation, première vente, tiroir, Affaires, Terraferme, Livre de compte. Il tourne à 390×844 et 320×568 et échoue dès que deux éléments interactifs ou textes du HUD se recouvrent, ou que la page déborde horizontalement.

**Plan.**
- Hud.tsx et TerraLayer.tsx : mettre en-tête en grid grid-cols-[minmax(0,1fr)_minmax(0,auto)] gap-2. Retirer les max-w en vw ; la note de droite passe en max-w-[46%] dans sa cellule avec truncate par ligne. La ligne du rival sort de la colonne pseudo et s'affiche sous la grille, en text-[13px] truncate.
- Nouveau apps/web/e2e/layout.mjs, avec helpers partagés dans e2e/assert.mjs. assertNoOverflow : document.scrollingElement.scrollWidth <= innerWidth. assertNoOverlap : pour tous les [data-hud] et [role=button] visibles, intersections des getBoundingClientRect deux à deux supérieures à 2 px interdites, avec une liste blanche explicite (badges et pastilles). Ces assertions tournent après chaque étape du parcours.
- Parcours : connexion invité (ou code à 6 chiffres, ux-m2), Produire, récolte, transformation, première vente, ouverture du tiroir et livraison, porte Affaires et ses 3 onglets, Terraferme pendant la trêve (le cas de t_terra.png), Livre de compte. Captures enregistrées en artefact CI.
- Serveur de test : démarrer apps/server sur PGlite avec un monde de fixture (horloge figée, trêve active), via un script pnpm e2e dans apps/web/package.json.
- ci.yml : job e2e après build qui installe chromium (playwright-core est déjà là), lance pnpm e2e et publie les captures en cas d'échec.
- Ajouter data-hud aux blocs du HUD (Hud.tsx, TerraLayer.tsx) pour cibler l'assertion sans dépendre des classes.

**Mesure.** Le job e2e passe au vert sur main aux deux tailles. Le cas t_terra.png, rejoué avant correction, fait échouer le test ; il passe après. Zéro chevauchement ni débordement sur 20 exécutions consécutives (stabilité). Aucune régression de mise en page signalée en playtest.

**Le chef.** C'est le filet de sécurité de tout le lot, donc il passe en premier. Vérifié : ci.yml lance lint, typecheck, test et build, sans aucun e2e. La grille du HUD en minmax(0,1fr) règle le chevauchement de t_terra.png à la racine, au lieu de jouer sur les max-w en vw. Ux-m1 est le SEUL propriétaire de l'infrastructure e2e : un script de parcours, les helpers assertNoOverflow et assertNoOverlap, le job CI et les captures. ftue-m1 s'y branche, sans second script. Ajouter à assertNoOverlap un contrôle de taille minimale des cibles tactiles (44 px) sur les [data-hud] interactifs.

### 5. Passe de lisibilité : finir l'abus de capitales Space Mono et viser 44 px partout (`ux-3` · effort S · impact fort)

*Directrice UX/UI mobile et direction artistique*

**Problème.** index.css l.150 réserve .label (font-mono, uppercase, tracking 0.12em) aux « kickers de un à trois mots », mais 68 usages lui passent du texte dynamique. Exemples réels : Company.tsx l.68, « 1,98 D · EN STOCK : 40 », où le denier « d » devient « D » et la ligne casse sur deux lignes (n_company.png) ; Company.tsx l.33, « 0 / 400 · SE TERMINE DANS 1 J 21 H », avec le « H » seul à la ligne (n_notices.png) ; Coach.tsx, « PROCHAIN OBJECTIF « LIVRER TROIS COMMANDES » DANS 23 H 59 » sur deux lignes en vert ; Tenders, « CLÔTURE DANS 21 H 56 · 0 OFFRE SCELLÉE » (c_tender.png). Côté cibles tactiles : Slab size='sm' (ui.tsx l.33, px-4 py-2 text-xs, environ 32 px de haut) est utilisé 41 fois, dont le bouton « Livrer » de la Compagnie et celui de Lorenzo. Segmented (ui.tsx l.639, py-1.5) sert aux onglets Commandes/Colleganza/Banque (c_deals.png), d'environ 28 px.

**Proposition.** Une règle typographique simple et vérifiée : capitales espacées pour les étiquettes fixes seulement (« RÉCOMPENSE », « VOTRE SAISON ») ; toute donnée (prix, durée, stock, compte) passe en .meta, police sans tabular-nums 13 px, couleur muted, sans capitales. « 1,98 d · 40 en stock » se lit d'un coup d'œil. Toutes les commandes tactiles font au moins 44 × 44 px : Slab sm garde son allure, mais sa zone de toucher s'étend par un pseudo-élément, et Segmented passe à min-h-10 avec un espacement plus large.

**Plan.**
- index.css : ajouter .meta { @apply font-sans text-[13px] leading-snug text-muted tabular-nums } et documenter la règle dans le commentaire de .label.
- Remplacer className='label …' par 'meta …' partout où le contenu contient une expression ({…}) : Company.tsx l.33/68/100, Coach.tsx l.318, Bell.tsx l.170, Tenders.tsx, Deals.tsx, Warehouse.tsx, Suppliers.tsx, Top.tsx l.203 (68 occurrences listées par grep « className="label » contenant « { »).
- ui.tsx Slab : ajouter « before:absolute before:-inset-y-2 before:inset-x-0 » en sm pour atteindre 44 px de zone tactile sans changer le dessin. Segmented : py-2.5 min-h-10.
- Garde-fou : test vitest apps/web/test/typography.test.ts qui lit les .tsx de src/game et échoue si un élément className contenant 'label' a pour enfant une expression JSX appelant d(, clock(, ducats( ou minutesLabel(.
- Capture avant/après des écrans Compagnie, Avis, Appels d'offres en 390×844 avec les scripts shot*.cjs existants.

**Mesure.** Test typography.test.ts au vert. Audit Lighthouse accessibilité « tap targets » à 100 % sur la carte et les feuilles. Plus aucun retour à la ligne dans les métadonnées des captures 390 px. En playtest : temps de lecture d'une ligne de commande de compagnie (cible : moins de 1 s).

**Le chef.** Approuvée au premier tour et maintenue. À livrer avant le tiroir et la porte Affaires pour ne pas bâtir sur une base mouvante. Elle doit passer l'e2e de ux-m1 aux deux formats.

### 6. Anatomie unique des feuilles : en-tête fixe, l'action d'abord, la règle repliable (`ux-4` · effort M · impact fort)

*Directrice UX/UI mobile et direction artistique*

**Problème.** Sheet (ui.tsx l.567) place la CloseButton en absolute à l'intérieur du dialog qui défile : dès qu'on descend, la croix et le titre disparaissent (n_notices.png : ni titre ni croix, une boîte vide en haut). Chaque feuille de commerce commence par un pavé de règles avant l'action : Appels d'offres du Doge, 5 lignes (« Le Doge demande… caution perdue ») ; Entrepôt de Venise, 4 lignes ; Fournisseurs, 3 lignes ; Affaires entre marchands, 3 lignes (c_tender, c_warehouse, c_suppliers, c_deals). Au 10e passage, le joueur relit encore la règle pour trouver le curseur. Les titres h3 sont recopiés à la main dans chaque feuille (Company.tsx l.92, Comptoir.tsx l.813, Notices.tsx).

**Proposition.** Une seule anatomie pour toutes les feuilles. En-tête collant : surtitre en kicker (ville ou catégorie), titre, croix, toujours visibles, avec un fond qui se floute au défilement. Ensuite l'état et l'action principale (curseur, quantité, bouton or). La règle passe dans un repli « Comment ça marche ? » : ouvert la première fois, puis fermé et mémorisé par feuille. Résumé en une ligne sous le titre (« Pli scellé · caution 20 % · plafond 3,08 d »). Sur ordinateur, même structure dans la fenêtre centrée.

**Plan.**
- ui.tsx : nouveaux composants SheetHeader({kicker, title, summary}) en sticky top-0 -mx-5 px-5 bg-night-2/90 backdrop-blur, avec la CloseButton intégrée (retirée du absolute de Sheet), et Rules({id, children}) en <details> stylé, ouvert si store.get(`rules:${id}`) est vide, mémorisé à la fermeture.
- Migrer les feuilles : Tenders.tsx, Warehouse.tsx, Suppliers.tsx, Deals.tsx, Company.tsx, Dashboard.tsx, Comptoir.tsx (store, buildHere), Notices.tsx, Marche.tsx (Rialto). Pour chacune : SheetHeader + action + Rules({t.help}).
- i18n.ts : ajouter les résumés d'une ligne fr.game.tenders.summary(cap, caution), fr.game.warehouse.summary(places, min), fr.game.suppliers.summary, fr.game.ui.howItWorks = 'Comment ça marche ?'.
- Le Coach doit encore pouvoir pointer dans une Rules fermée : forcer open quand le guide cible un data-coach à l'intérieur.
- Captures 390×844 et 1280×860 de chaque feuille migrée ; vérifier le tirage vers le bas (useDragToClose ne démarre que si scrollTop = 0, à garder avec l'en-tête sticky).

**Mesure.** Délai entre l'ouverture d'une feuille et la première action (télémétrie 'sheet_open' / action), cible : −40 % dès la 3e ouverture. Taux de dépliage de « Comment ça marche ? » après la première fois, qui doit rester faible si les résumés suffisent. Plus aucune capture sans titre ni croix visibles.

**Le chef.** Approuvée au premier tour et maintenue. Mêmes exigences : e2e de ux-m1 vert en 390×844 et 320×568.

### 7. Un mot, une icône : démêler Entrepôt, Fournisseurs et Vendre (`ux-5` · effort S · impact moyen)

*Directrice UX/UI mobile et direction artistique*

**Problème.** Dans i18n.ts l.156 et l.167, buttons.store = « Entrepôt » (votre stock au comptoir, HomePanel) et buttons.warehouse = « Entrepôt » (la place aux enchères dans une ville, Warehouse.tsx) : deux concepts sous le même mot, avec la même icône Icon.store (MapScreen.tsx l.893 et l.990). Fournisseurs utilise Icon.trophy (MapScreen.tsx l.1000), le trophée de la porte Classement visible au même moment (c_suppliers.png : trophée dans le panneau Venise et dans la barre du bas). « Vendre à la ville » (sellToCity) reprend Icon.cargo de Cargaisons. Sur un petit écran, l'icône sert de libellé : ces collisions envoient le joueur au mauvais endroit.

**Proposition.** Un lexique et une iconographie sans doublon. Le comptoir garde « Magasin » (icône de caisses), la ville garde « Entrepôt » (icône d'arcade fermée avec une clé). Fournisseurs devient un étendard ou un blason, puisque son blason flotte sur la carte. Vendre passe à une main tendant une pièce. Le trophée reste réservé au classement. Une planche « Iconographie » dans l'Aide (Help.tsx) montre chaque icône avec son mot. Les badges de couleur suivent la règle des tokens : or = argent et action principale, lagune = gain, cinabre = urgence, lapis = sélection.

**Plan.**
- apps/web/src/game/map/icons.tsx : dessiner Icon.banner (fournisseurs), Icon.vault (entrepôt de ville), Icon.sell (vendre), Icon.crates (magasin), au trait 1.75 px des icônes existantes, en currentColor.
- MapScreen.tsx : HomePanel l.893 en Icon.crates + label buttons.store ; CityPanel l.982 en Icon.vault, l.1000 en Icon.banner, sellToCity en Icon.sell.
- i18n.ts : buttons.store = 'Magasin' ; vérifier les occurrences « entrepôt » pour le stock du joueur (fr.game.domain.store.title, Aide, Coach), puis mettre à jour help.test.ts.
- Test apps/web/test/icons.test.ts : une table action→icône exportée de MapScreen (ACTION_ICONS) ne contient aucun doublon d'icône pour deux libellés différents.
- Help.tsx : section « Les icônes » générée depuis ACTION_ICONS.

**Mesure.** icons.test.ts au vert. En playtest de 5 personnes, sur la consigne « Où voyez-vous votre stock ? » puis « Où louer une place à Venise ? », le premier toucher doit être correct 5 fois sur 5. Télémétrie : baisse des ouvertures de feuille immédiatement refermées (moins de 2 s) sur warehouse:* et store.

**Le chef.** Approuvée au premier tour et maintenue. Elle passe avant loop-1, qui réutilise ses icônes d'avis : aucune icône nouvelle ailleurs.

### 8. Consignes vraies, calendrier juste, rival masqué au départ (`ftue-6` · effort S · impact fort)

*Experte premières minutes et onboarding*

**Problème.** fr.game.ledger.items renvoie vers une interface qui n'existe plus : « Onglet Contrats », « Marché → Villes », « Routes → Vos véhicules ». Notices.tsx:23-27 calcule le total avec Math.round et les jours restants avec Math.ceil, d'où « Jour 1 sur 41 » à côté de « 42 jours ». view.day (dayIndex de l'engine, en tranches de 24 h depuis le début du monde) suit un autre calendrier que le calendrier civil de Paris. La première saison de 41 jours (seasonBounds, minDays 14) est voulue. Mais la diapositive d'intro annonce « un mois ». Le rival s'affiche dès la première minute, alors que les ventes nettes sont nulles. Les clés coach goMarket, goCities, goList, deliveryUnderway, goComptoir et invest ne sont pas utilisées (sauf celles que ftue-2 reprend).

**Proposition.** Une seule source pour les jours. « Jour 3 sur 41 · 39 jours restants » est toujours cohérent, sur le calendrier civil de Paris. L'intro dit « jusqu'au 30 novembre » quand la saison dépasse un mois civil, et « un mois » sinon. Chaque mission du Livre de compte décrit l'interface réelle (« Touchez une charrette sur la carte, puis cochez une commande ») et a un bouton « Y aller », qui ouvre la bonne feuille ou la bonne sélection avec la même convention que Advice.tsx line(). La ligne Rival du HUD et de Top.tsx reste cachée tant que les ventes nettes du joueur sont nulles. Quand elle apparaît, un rival PNJ porte la marque « maison » (le flag bot existe déjà dans l'état), ce qui permet de reconnaître Comm884 dès le lancement.

**Plan.**
- Engine (tests d'abord, test/fixture.ts) : déplacer offsetAt et monthStart de apps/server/src/game/calendar.ts vers packages/engine/src/clock.ts, sans changer leur logique, et exporter seasonDays(startsAt, endsAt, now, tz='Europe/Paris') → { day, total, left }. Calcul en jours civils locaux : total = nombre de minuits locaux entre startsAt et endsAt, day = jours civils écoulés + 1, left = total - day + 1, avec 1 ≤ day ≤ total et l'invariant day + left - 1 === total. Tests : saison d'un mois civil (31, 30, 28 et 29 jours), première saison de 41 jours ouverte le 20 octobre, passage à l'heure d'hiver du 25 octobre, dernier jour à 23 h 59, now hors bornes. apps/server/src/game/calendar.ts réimporte depuis l'engine, et apps/server/test/calendar.test.ts reste vert sans modification.
- Ne pas toucher à seasonBounds ni à minDays.
- Web : apps/web/src/game/map/Notices.tsx utilise seasonDays(catalog.world.startsAt, catalog.world.endsAt, now) pour le libellé et pour les jours restants. Supprimer les deux calculs locaux. Test apps/web/test/seasonDays.test.ts sur la chaîne affichée.
- Contenu : intro.slides[0] reçoit (endsAt, isLong). isLong vaut vrai quand la saison dépasse le mois civil de startsAt, et le texte dit alors « jusqu'au 30 novembre » (date formatée dans le fuseau de Paris).
- Contenu : réécrire fr.game.ledger.items (first_city_sale, first_delivery, first_vehicle, first_contract, first_project, new_workshop et les autres) sur l'interface actuelle : portes du HUD, carte, charrette, feuille Commandes.
- Web : Ledger.tsx. Une table MISSION_GO: Record<missionId, (props) => void> renvoie setSheet(...) ou setSelection(...) comme Advice.tsx line(), et chaque mission ouverte et non encaissée affiche un bouton « Y aller ». Un test vérifie que chaque mission de venice1450.settings.ts a une entrée.
- Web : apps/web/src/game/map/Hud.tsx exporte HUD_DOORS = [{ id: 'workshops', label }, { id: 'ranking', label }, { id: 'layer', label }, { id: 'help', label }], et le rendu des Door lit cette liste (une seule source). Test apps/web/test/help.test.ts : chaque nom d'écran cité par les textes de missions et du coach, via une table de références explicite (ledgerRefs: missionId → doorId | sheetId), doit exister dans HUD_DOORS ou dans les identifiants de feuilles exportés. Pas d'expression régulière sur le texte libre.
- Ménage : supprimer de i18n.ts les clés du coach jamais lues (goMarket, goCities, goList, deliveryUnderway une fois ftue-1 livrée). Garder invest, investLater et goComptoir pour ftue-2. Un test liste les clés de fr.game.coach et échoue si une clé n'est référencée ni dans Coach.tsx ni dans HudTips.tsx.
- Web : Top.tsx et map/Hud.tsx masquent la ligne Rival tant que view.netSales === 0n. Badge « maison » à côté d'un rival ou d'une ligne de classement quand le joueur est un bot, avec la clé fr.game.top.house et une infobulle « Maison marchande de la République, pas un joueur ».
- Bulle unique sur les pastilles des villes (clé store pipsSeen) : « Commandes ouvertes ; en vert, celles que votre stock couvre ».

**Mesure.** pnpm test : seasonDays (cas civils et changements d'heure), test des portes sur HUD_DOORS, test des clés du coach mortes, test de couverture MISSION_GO. Télémétrie mission_claimed par id entre J0 et J3 : first_contract et first_vehicle doivent monter. Lors du playtest ftue-m1 : aucun joueur ne cherche un « onglet » inexistant.

**Le chef.** Vérifié : Notices.tsx:23-27 calcule le total avec Math.round et les jours restants avec Math.ceil. Une seule source pure dans l'engine (seasonDays), testée sur la fixture avec les changements d'heure, c'est la bonne correction. Les boutons « Y aller » et la table de références explicite (sans regex) sont bons. Trois conditions. 1) Retirer le badge « maison » : ux-m3 est le seul propriétaire du marquage PNJ, avec fr.game.npc, et on ne crée pas de clé fr.game.top.house. 2) HUD_DOORS inclut 'affairs' dès que ux-2 est livrée. 3) deliveryUnderway est supprimée par ftue-1, pas avant.

### 9. Commande de bienvenue express : 45 s, compte à rebours, première paie (`ftue-1` · effort S · impact critique)

*Experte premières minutes et onboarding*

**Problème.** La commande de bienvenue (deliveries.ts:344-362) part à dos de mule, avec un trajet de 20 à 45 min ajusté par speedBps 7 500 (deliveries.ts:794 : trip = minutes * MINUTE_MS). Pendant ce temps, Coach.tsx n'affiche que le texte mort deliveryUnderway, et unlocks.ts garde le Rialto et le classement fermés jusqu'à sell_city. La première paie, 150 d, tombe au bout de 27 à 60 min, souvent après que le joueur a fermé l'onglet.

**Proposition.** Pendant la fenêtre du tutoriel, la commande de bienvenue, et elle seule, fait l'aller en 45 s et le retour en 45 s. Sur la charrette de la carte et dans la bulle de Lorenzo, un compte à rebours s'affiche (« Les routes sont dégagées ce matin : arrivée dans 0:32 »). À l'arrivée, les pièces volent vers la bourse (flyCoins) et un toast annonce « +150 d · Première paie ». Le pas sell_city reste validé à l'arrivée, comme avant (delivery_arrived), ce qui garde la télémétrie intacte. La livraison suivante affiche sa durée normale, avec la mention « trajet normal : 34 min ».

**Plan.**
- Engine, tests d'abord sur test/fixture.ts : dans packages/engine/src/settings.ts, étendre tutorial avec welcomeTripSeconds: qty.default(0). Valeur 0 : aucun effet.
- Engine : packages/engine/src/deliveries.ts:351. Le push de la commande de bienvenue pose welcome: true sur l'Order (champ optionnel ajouté au type dans state.ts). Pas d'heuristique sur la ville ou la quantité.
- Engine : deliveries.ts:794. Si toutes les commandes chargées portent welcome, que welcomeTripSeconds > 0 et que tx.now < player.joinedAt + tutorial.minutes * MINUTE_MS, alors trip = welcomeTripSeconds * 1000. arriveAt = now + trip et backAt = now + 2 * trip restent tels quels, donc busyUntil = backAt est cohérent et la charrette est libre 90 s après le départ. La Delivery reçoit aussi welcome: true pour la vue.
- Tests engine (packages/engine/test/deliveries.test.ts) : (a) bienvenue express : arriveAt − departAt = 45 s, backAt − departAt = 90 s, véhicule libre à backAt, et une deuxième livraison possible à backAt ; (b) commande normale : durée inchangée ; (c) bienvenue après la fenêtre du tutoriel : durée normale ; (d) chargement mixte bienvenue + commande normale : durée normale ; (e) welcomeTripSeconds = 0 : durée normale ; (f) le paiement de 150 d passe par le grand livre, et les invariants tiennent.
- Thème : venice1450.settings.ts, tutorial.welcomeTripSeconds: 45.
- Serveur : tutorial.ts ne change pas (sell_city reste lié à delivery_arrived et city_sale). La vue expose delivery.welcome et arriveAt.
- Web : Coach.tsx. Remplacer deliveryUnderway par coach.welcomeEnRoute(clock(arriveAt − now)), avec une cible data-coach sur la charrette de la carte. Le compte à rebours s'affiche aussi sur l'étiquette de la charrette (roadKit.tsx).
- Web : Game.tsx, à la réception de la notice delivery_arrived quand delivery.welcome est vrai : flyCoins depuis la ville vers la bourse, et toast fr.game.coach.firstPay(d(payment)). Une seule fois (clé store firstPaySeen).
- Web : à la confirmation de la livraison suivante, afficher fr.game.cargo.normalTrip(minutes).
- Sim : pnpm sim (toutes les graines conformes). Les bots passent par le même code mais ne livrent qu'une commande de bienvenue : effet négligeable, à confirmer. Une ligne dans docs/calibration.md.

**Mesure.** Tests engine (a) à (f). Dans /admin, entonnoir tutorial avec horodatage : temps médian entre l'inscription et sell_city ≤ 5 min (aujourd'hui 27 à 60 min). Playtest ftue-m1 : première paie en moins de 5 min pour au moins 7 joueurs sur 8.

**Le chef.** Vérifié : deliveries.ts:787 calcule trip = minutes * MINUTE_MS, tutorial.minutes vaut 30, et la première paie tombe au bout de 27 à 60 min. Un drapeau welcome posé sur l'Order, sans heuristique, un réglage à 0 par défaut et un retour à la durée normale pour un chargement mixte (test d) : c'est propre et borné au tutoriel. Le pas sell_city reste lié à delivery_arrived, donc la télémétrie est intacte. La ligne dans calibration.md et pnpm sim sont exigés malgré l'effet négligeable.

### 10. Connexion par code à 6 chiffres dans l'e-mail, pour le PWA iOS installé (`ux-m2` · effort S · impact critique)

*Directrice UX/UI mobile et direction artistique*

**Problème.** AuthService (apps/server/src/auth/service.ts:93-101) envoie seulement un lien /connexion?token=…. Sur iPhone, un PWA installé ne partage pas son stockage avec Safari : le lien ouvre le jeu dans Safari, et le PWA reste déconnecté. Pour un jeu mobile d'abord, l'entonnoir casse à la première reconnexion. La table login_tokens (schema.ts:46) n'a ni code ni compteur de tentatives.

**Proposition.** L'e-mail contient le lien ET un code à 6 chiffres en gros (« 482 913 »), valable aussi longtemps que le lien. Après « Recevoir le lien », l'écran de connexion propose directement un champ de 6 cases (inputmode numeric, autocomplete one-time-code, collage accepté) avec la phrase « Sur iPhone, saisissez le code reçu ici plutôt que de toucher le lien ». Le lien et le code ouvrent la même session, et l'un ou l'autre consomme le jeton. Après 5 essais faux, le jeton est brûlé : il faut en redemander un.

**Plan.**
- Schéma : apps/server/src/db/schema.ts, ajouter à loginTokens codeHash text et attempts integer default 0, plus un index sur (email, codeHash). Puis pnpm --filter @comptoirs/server db:generate --name login_code.
- Service : sendLink génère un code avec crypto.randomInt(0, 1_000_000), mis en forme sur 6 chiffres, et stocke son hash (hashToken du couple email:code) avec le même expiresAt. Nouvelle méthode verifyCode(email, code) : une seule transaction qui sélectionne le dernier jeton non utilisé et non expiré pour cet email, incrémente attempts, compare en temps constant ; si attempts > 5, usedAt = now et AuthError('too_many_requests'). Le succès suit le même chemin que verify(), qu'on factorise en openSession(email).
- Routes : POST /api/auth/code { email, code }, limitée par IP et par e-mail avec le limiteur existant. Réponse d'erreur uniforme, sans indiquer si le compte existe.
- Mail : apps/server/src/mail/templates.ts, magicLinkMail(email, link, code, minutes), code en tête en texte et en HTML, lien en dessous.
- Web : écran de connexion (Welcome.tsx ou l'écran de n_login.png), état « e-mail envoyé » avec CodeInput (6 cases, autocomplete='one-time-code', collage, envoi automatique au 6e chiffre). Mise en avant si navigator.standalone ou display-mode: standalone.
- i18n.ts : fr.auth.code.{prompt, iosHint, wrong(left), burned, resend}.
- Tests serveur, d'abord : apps/server/test/auth-code.test.ts. Le code ouvre la session ; le lien seul, puis le code, échoue (usage unique) ; 5 codes faux brûlent le jeton ; un code expiré échoue ; l'email d'autrui échoue ; même réponse pour un compte inexistant.
- E2E : dans layout.mjs (ux-m1), une variante qui lit le code dans le mailer de test et le saisit.

**Mesure.** auth-code.test.ts au vert. E2E de connexion par code au vert. Télémétrie : taux de connexion réussie après envoi de l'e-mail, séparé lien/code et standalone/navigateur (cible : au moins 90 % en standalone iOS, contre environ 0 aujourd'hui). Test manuel sur un iPhone avec le PWA installé : reconnexion en moins de 60 s.

**Le chef.** Bloquant pour le PWA iOS. C'est la SEULE implémentation du code à 6 chiffres : ftue-3 et live-6 la consomment, sans en écrire d'autre, avec une seule migration login_tokens (--name login_code). Précisions imposées. Le hash est lié au jeton : sha256(code + ':' + tokenHash). Le jeton est brûlé au 5e essai faux (attempts ≥ 5) : le texte « attempts > 5 » laisse passer un essai de trop. La durée est celle du lien. La comparaison se fait avec timingSafeEqual. La réponse est identique pour un compte inexistant. Le limiteur porte sur l'IP ET sur l'e-mail. Le lien et le code s'excluent : le premier utilisé consomme le jeton.

### 11. Maisons PNJ et marchands humains distingués partout : rival, Terraferme, escarmouches (`ux-m3` · effort S · impact fort)

*Directrice UX/UI mobile et direction artistique*

**Problème.** Le badge PNJ existe au classement (Top.tsx:71 et 126) et au palmarès, mais ailleurs les bots ressemblent à des joueurs. Le rival du HUD est une chaîne nue (MapScreen.tsx:88, rivalLine), alors que GameResponse.rival.bot existe. Dans t_terra.png, « Rival : Testeur826 » ne dit pas si c'est une machine. Le résultat d'escarmouche (SkirmishStatus.result) ne porte pas de champ bot. Au lancement, quand les bots seront majoritaires, un joueur qui croit battre des humains se sentira trompé en l'apprenant.

**Proposition.** Un seul signe, constant : un petit sceau « PNJ » (Badge tone='ghost' déjà défini, avec l'infobulle fr.game.npcHelp) accolé au nom d'une maison PNJ, partout où un nom apparaît. C'est le cas du rival du HUD (« Rival : Comm884 · PNJ »), du classement, du résultat et du lobby d'escarmouche (« 3 marchands · 4 PNJ »), des propriétaires de cases et de capitales en Terraferme, des contreparties des Commandes et Colleganza, et du Journal. Le lobby d'escarmouche annonce aussi la composition avant d'entrer.

**Plan.**
- Composant : apps/web/src/game/Name.tsx, <MerchantName pseudo bot />, qui rend le pseudo et le Badge PNJ, avec truncate sur le pseudo seulement. Remplacer les rendus de pseudo dans Top.tsx, Palmares.tsx, Deals.tsx, Journal.tsx, Region.tsx et TerraLayer.tsx.
- Hud.tsx et MapScreen.tsx : rival passe de string à {name, bot}. Hud rend <MerchantName>, et rivalLine ne fait plus que la mise en forme.
- Serveur : apps/server/src/game/skirmish.ts et le type SkirmishStatus (types.ts) ajoutent bot: boolean à chaque ligne de result et des comptes humans/bots au lobby. terra.ts, dans la vue des cases et capitales, ajoute bot aux propriétaires, lu sur accounts.isBot comme dans routes.ts:318. Les vues avec names reprennent le tableau bots déjà présent (types.ts:660).
- i18n.ts : fr.game.skirmish.lobbyMix(humans, bots), en réutilisant fr.game.npc et npcHelp.
- Test : apps/web/test/names.test.ts, qui vérifie que tout composant de src/game affichant un champ pseudo passe par MerchantName (grep statique, sur le modèle de typography). Côté serveur, test que skirmish result et la vue terra exposent bot.
- E2E : dans layout.mjs, vérifier que le rival PNJ de la fixture affiche le badge, sans chevauchement à 320 px.

**Mesure.** names.test.ts et tests serveur au vert. En playtest, à la question « votre rival est-il un humain ? », 5 bonnes réponses sur 5. Aucune plainte de type « je jouais contre des bots sans le savoir » dans les retours du lancement.

**Le chef.** Vérifié : weeklyRival renvoie déjà bot (weekly.ts:183), mais le HUD ne reçoit qu'une chaîne (Hud.tsx:131). Ux-m3 devient le SEUL propriétaire du marquage PNJ. Il absorbe : de terra-m2, isBotAccount() côté serveur, bot dans la vue terra et le texte « PNJ » des notifications ; de live-4 et ftue-6, le badge au classement, à la Semaine, dans le Journal et dans les rivaux. Un composant MerchantName, un libellé fr.game.npc et une infobulle npcHelp, rien d'autre. Le pseudo se tronque avant le badge, ce que vérifie l'e2e à 320 px.

### 12. Ménage des familles, puis fil d'alliance à audience figée et « À l'aide » poussé (`terra-3` · effort M · impact fort)

*Expert Terraferme, compétition et social*

**Problème.** familyChat.ts `familyOfAccount` lit `world.current.families?.memberOf`, qui n'existe plus : /api/game/family/messages renvoie toujours 403 `not_member`. notifier.ts (l.165) lit le même champ mort. Famille.tsx n'est plus monté comme écran, mais il exporte encore DecreeBanner (importé par Marche.tsx), familyName et landName (Bell.tsx, CampaignLayer.tsx). `gameApi.reportMessage` n'est appelé que depuis Famille.tsx. Les signaux `help` et `attack` (terraferma.ts l.1118) ne figurent pas dans TERRA_NEWS : l'allié absent ne reçoit jamais un « À l'aide ». Le plan promet pourtant « le fil de famille (devenu fil d'alliance) » (plan-terraferme.md l.116).

**Proposition.** Étape 0, le ménage : le code des familles disparaît (routes /api/game/family/*, joinFamily, Famille.tsx, l'écran de campagne familiale, les appels d'API morts et la lecture de memberOf dans notifier.ts). Les trois exports encore utilisés sont déplacés tels quels, sans changer de comportement. Étape 1 : les règles de chat (filtre, REFUSED, 280 caractères, sans liens, rythme, quotas, masquage après 3 signalements) passent dans chatRules.ts, avec les tests existants au vert, inchangés. Étape 2 : le joueur ouvre un fil « Conseil de guerre » depuis le panneau d'un allié ou depuis « Vos terres ». L'audience d'un message est figée à l'envoi : ce sont les alliés du moment. Une ligne du fil l'explique : « Seuls vos alliés au moment de l'envoi lisent ce message. » Étape 3 : les signaux help et attack sont poussés aux alliés avec le pseudo, par exemple « Testeur826 appelle à l'aide : Ferrare marche sur lui ». Le rythme reste celui de `signal()` (diplomacy.signalMinutes), sans quota nouveau, et rien n'est poussé entre 22 h et 8 h (quiet hours du notifier). L'écran d'admin des messages signalés est conservé et branché sur la nouvelle table.

**Plan.**
- Ménage, un commit à lui seul : apps/web/src/game/Famille.tsx est supprimé après le déplacement de DecreeBanner, familyName et landName vers apps/web/src/game/decree.tsx et apps/web/src/game/names.ts (mêmes signatures). Mettre à jour les imports dans Marche.tsx, Bell.tsx et map/CampaignLayer.tsx, puis supprimer CampaignLayer s'il n'est plus monté (le vérifier avec grep). Dans apps/web/src/game/api.ts, retirer familyMessages, postFamilyMessage, reportMessage et joinFamily. Dans apps/server/src/game/routes.ts, retirer les routes /api/game/family/*, joinFamily (l.94) et `familyLatestAt` (l.349). Dans apps/server/src/notify/notifier.ts, retirer la diffusion par memberOf (l.165-170). Retirer aussi les clés i18n orphelines `family`, `famille` et `toCampaign`. Lancer pnpm typecheck, pnpm test et pnpm lint.
- Extraction sans changement de comportement : apps/server/src/game/chatRules.ts reçoit clean, REFUSED, la longueur, le rythme et les quotas de familyChat.ts. Les tests existants de familyChat sont déplacés vers apps/server/test/chatRules.test.ts sans toucher aux assertions, et restent au vert. Ensuite seulement, familyChat.ts est supprimé.
- Base : apps/server/src/db/schema.ts reçoit la table terra_messages (world_id, week, account_id, audience jsonb figée à l'envoi, body, hidden, reports, created_at). Lancer pnpm --filter @comptoirs/server db:generate --name terra_messages. Les signaux ne sont pas copiés dans cette table : ils sont lus dans s.signals.
- Moteur, tests d'abord (packages/engine/test/terraferma.test.ts, fixture figée) : un export pur `alliesOf(state, id)`, s'il n'existe pas déjà, testé avec zéro, un et deux alliés et une alliance rompue.
- Serveur : apps/server/src/game/allianceChat.ts expose allianceThread(reader), qui renvoie les messages de la semaine dont l'expéditeur est le lecteur ou dont l'audience le contient, plus ses signaux d'alliés comme lignes système. postAllianceMessage refuse avec `not_allied` quand alliesOf est vide. Routes dans routes.ts : GET et POST /api/game/terra/messages, POST /api/game/terra/messages/:id/report. L'écran d'admin des messages signalés lit terra_messages.
- Notifications : dans apps/server/src/notify/notifier.ts, ajouter `terra_signal` à TERRA_NEWS. Dans packages/engine/src/terraWorld.ts, au cas terraSignal, émettre `terra_signal` vers chaque allié pour les kinds help et attack seulement, après le contrôle de rythme de signal() : un signal refusé n'émet rien. Les quiet hours existantes (22 h – 8 h, l.428) s'appliquent : rien n'est poussé la nuit. Texte nommé dans apps/server/src/notify/texts.ts terraText.
- Web : apps/web/src/game/AllianceThread.tsx (Sheet), avec le bouton « Conseil » dans map/TerraLayer.tsx TerraPanel (panneau d'un allié et « Vos terres »), une pastille de non-lus sur la porte Terraferme (map/Hud.tsx Door) et gameApi.allianceThread, postAlliance et reportAlliance. Textes dans apps/web/src/i18n.ts, sous terra.thread.
- Tests serveur dans apps/server/test/allianceChat.test.ts : un ex-allié ne lit pas les messages postés après la rupture mais garde ceux d'avant ; un nouvel allié ne lit pas l'historique antérieur ; la modération reprend les cas de chatRules (lien refusé, mot filtré, masquage au troisième signalement) ; l'envoi sans allié renvoie 409 `not_allied` ; un signal help est notifié aux alliés, pas un signal thanks ; aucun push n'est envoyé entre 22 h et 8 h.

**Mesure.** Zéro 403 `not_member` dans les journaux. grep -r "families\|Famille" apps/ ne renvoie plus que les noms des maisons des bots (bots.ts). Les tests existants de chatRules passent sans modification. Télémétrie : part des alliances qui échangent au moins un message, délai entre un « À l'aide » et le premier terraSend d'un allié, aucun terra_signal poussé entre 22 h et 8 h.

**Le chef.** Périmètre réduit aux étapes 0, 1 et 3. Vérifié : notifier.ts:165 et familyChat.ts:73 lisent families.memberOf, donc /family/messages répond toujours 403, et Marche.tsx, Bell.tsx et CampaignLayer.tsx importent encore Famille. Le ménage (déplacement des trois exports, suppression des routes et des clés i18n orphelines) et l'extraction de chatRules avec les tests inchangés sont exigés. Pousser les signaux help et attack aux alliés, dans le rythme de signal() et hors heures calmes, a beaucoup de valeur pour peu de code. L'étape 2 (fil « Conseil de guerre », table terra_messages) va dans IDEAS.md : au lancement, avec un monde surtout peuplé de PNJ, un chat d'alliance serait un écran vide au coût de modération réel. On la reprendra quand la télémétrie montrera des alliances entre humains.

### 13. Des chiffres honnêtes : marge valorisée au plus bas entre la référence et l'index du jour (`loop-5` · effort M · impact fort)

*Expert boucle de commerce et sensation de progression*

**Problème.** marginAt et outputValue (advice.ts l. 10-60) valorisent tout aux referencePrices. Or calibration.md note que les matières premières finissent à 50-60 % de la référence. La fiche d'atelier, l'étoile « meilleur placement » et le délai de remboursement surestiment donc les ateliers de matières premières. Le tableau de bord affiche côte à côte « Par heure 32,8 d » et « Aujourd'hui 0 d » : le joueur lit le potentiel comme un revenu.

**Proposition.** saleValue(res) = min(référence, indexedPrice(ctx, state, res, jour)), en entiers. indexedPrice est l'index des commandes de ville du jour : celui de la veille, borné par floorBps et capBps, qui est déjà le prix réellement payé par les villes. On n'appelle pas directement le vwap du Rialto. Avec le min, aucune manipulation à la hausse ne peut gonfler un conseil. Une vente à perte ne peut faire baisser l'index que jusqu'au plancher, avec un jour de retard, et elle baisse aussi le prix réel des commandes : le conseil reste vrai. Les intrants sont valorisés de la même façon (coût d'opportunité). La base se règle par settings.advice.priceBasis, « reference » ou « index », « index » par défaut. Le tableau de bord distingue « Réalisé aujourd'hui » et « Potentiel/h », grisé avec une info-bulle « aux prix du jour ». Il n'y a pas de courbe de cohorte. Le volet « jours de saison » passe dans ftue-6.

**Plan.**
- Tests d'abord, dans packages/engine/test/advice.test.ts sur la fixture. Cas couverts : sans échange, saleValue vaut la référence ; avec un index à 55 % pour le blé, marginPerHour de la ferme baisse et bestUpgrade change d'atelier ; avec un index au-dessus de la référence, saleValue reste à la référence ; avec priceBasis 'reference', on retrouve les valeurs actuelles ; aucun float (contrôle de typeof sur les champs bigint).
- packages/engine/src/settings.ts : advice: z.object({ priceBasis: z.enum(['reference','index']) }).optional(), absent par défaut pour reference, ce qui garde la compatibilité ascendante. Puis worlds.settings de Venise mis à 'index' par une migration de données.
- packages/engine/src/advice.ts : saleValue(ctx, state, res, day), utilisée dans marginAt et outputValue. Le jour est calculé à partir de ctx.startAt, comme dans orderUnitPrice.
- apps/web/src/game/Dashboard.tsx et i18n.ts : fr.game.dashboard.realized, potential et potentialHelp. La case Potentiel/h est grisée et porte l'info-bulle. Suppression de la juxtaposition actuelle « Par heure / Aujourd'hui ».
- Comptoir.tsx Workshop : afficher « ≈ 18,4 d/h aux prix du jour », la référence restant en petit.
- apps/simulator : si bots.ts s'appuie sur bestUpgrade ou workshopEconomics, faire passer pnpm sim sur toutes les graines. Dans tous les cas, ajouter au rapport une ligne « délai de remboursement annoncé / réel » (médiane par graine). Le délai réel est le temps mis par la marge réalisée de l'atelier, aux prix de vente effectifs, pour couvrir le coût de l'amélioration. Consigner l'écart avant et après dans docs/calibration.md.

**Mesure.** Tests du moteur ; pnpm sim conforme sur toutes les graines ; dans report.md, un écart entre délai annoncé et délai réel inférieur à 25 %, contre environ 2x attendu avec la base référence.

**Le chef.** Des chiffres honnêtes, ou rien. Valoriser au min(référence, indexedPrice) se fait en entiers et ne se manipule pas à la hausse. « Réalisé » et « Potentiel/h » enfin séparés. Vérifié : bots.ts n'appelle ni nextActions ni bestUpgrade. Mais loop-m1 va lire le délai de remboursement annoncé, d'où le placement avant elle. priceBasis est optionnel, avec reference par défaut, et vaut 'index' dans le thème. La migration de données ne vise que les mondes qui existent. Exigé : la ligne « délai annoncé / réel » dans report.md, avec un écart inférieur à 25 %, consignée dans calibration.md.

### 14. Les bots prennent entrepôts et prêts : la simulation couvre enfin toute l'économie publiée (`loop-m1` · effort M · impact critique)

*Expert boucle de commerce et sensation de progression*

**Problème.** calibration.md (l. 1150 et 1160) note que les PNJ ne prennent « ni entrepôts ni prêts ». bots.ts n'émet jamais bidWarehouse, borrow ni repayLoan. Or ces deux mécaniques créent ou détruisent de la monnaie : les enchères d'entrepôt sont détruites, les intérêts sont de 1 %/jour et la pénalité de retard de +20 %. La masse monétaire, l'écart assidu/occasionnel et la vérification `pnpm sim --pass 0.2` sont donc validés sur une économie qui n'est pas celle qu'on publie.

**Proposition.** Chaque profil de bot reçoit une politique simple, réglable dans les settings du simulateur. Les entrepôts : le bot enchérit dans la ville où il livre le plus, jusqu'à X % de sa marge attendue des 40 unités par jour, et l'assidu enchérit plus que l'occasionnel. Les prêts : le bot emprunte pour une amélioration dont le délai de remboursement annoncé (loop-5) est inférieur à la durée du prêt, rembourse dès que sa caisse le permet, et l'occasionnel se met parfois en retard (part réglable) pour exercer la pénalité. Le rapport de simulation ajoute la monnaie créée ou détruite par cause (warehouse_rent, loan_interest, pénalité), le taux de prêts en retard, la part d'entrepôts tenus par profil et l'écart de patrimoine avec et sans Pass.

**Plan.**
- Tests d'abord, dans packages/engine/test/bots.test.ts sur la fixture : un bot enchérit pour un entrepôt seulement si sa caisse dépasse minBid plus une réserve, n'emprunte jamais au-delà de maxShareBps, rembourse avant le terme quand il en a les moyens, et ne fait rien si settings.loans ou settings.warehouses sont absents.
- packages/engine/src/bots.ts : méthodes warehouses(s) et loans(s), appelées dans le tour du bot à côté de this.tenders(s) (l. 268). Elles émettent les commandes existantes bidWarehouse, borrow et repayLoan (commands.ts l. 130, 426, 446). Paramètres par profil dans les settings du simulateur, jamais en dur.
- apps/simulator/src/cli.ts : les causes warehouse_rent, loan_repay et loan_interest existent déjà (l. 67-81). Ajouter au rapport la section « Entrepôts et prêts » et la ligne de monnaie nette par cause.
- pnpm sim sur toutes les graines, puis pnpm sim --pass 0.2 (écart ≤ 5 %, et un gratuit assidu devant un abonné occasionnel). Tous les invariants doivent tenir (invariants.ts : partie double, aucun solde négatif).
- docs/calibration.md : une nouvelle entrée datée avec le tableau, et l'ajustement éventuel de settings.loans ou settings.warehouses si la croissance de la masse sort de la cible.

**Mesure.** pnpm sim conforme sur toutes les graines, avec les deux variantes de bots ; masse par joueur actif sous le plafond ; écart Pass ≤ 5 % ; taux de prêts en retard et part d'entrepôts par profil consignés dans calibration.md.

**Le chef.** C'est mon propre bloquant, et il est bien traité. Les bots passent par les commandes existantes (bidWarehouse, borrow, repayLoan), les politiques par profil vivent dans les réglages du simulateur, et deux variantes (prudente, vorace) sont jouées. Le rapport donne la monnaie créée ou détruite par cause. Rien n'est publié sans pnpm sim conforme sur toutes les graines, pnpm sim --pass 0.2 conforme (après live-2) et les invariants tenus. Si un réglage de prêts ou d'entrepôts bouge, l'entrée datée de calibration.md le justifie.

### 15. Mesurer l'heure de bataille avant de soigner ; Repli défensif seulement si les cibles sont manquées (`terra-4` · effort M · impact critique)

*Expert Terraferme, compétition et social*

**Problème.** L'heure de bataille (battle 20-21 h, stepMinutes 3, terraferma.ts l.1302-1321) fait marcher les fronts dix fois plus vite, et elle n'a jamais été jouée au simulateur : apps/simulator/src/terra.ts n'en tient aucun compte, et calibration.md l'expédie en une phrase (l.1132). Le dernier tableau assidus/occasionnels date d'avant le lot OpenFront : cases médianes des occasionnels 2 à 9, Gloire des assidus à 246-313 % de la leur. On ne sait donc pas si l'heure de bataille aggrave cet écart.

**Proposition.** Étape 1, sans aucune ligne de mécanique : le simulateur Terraferme joue les règles actuelles, heure de bataille comprise, sur toutes les graines. On ajoute des horaires de présence par profil : l'assidu joue à 20 h, l'occasionnel une fois par jour à une heure tirée hors de 20 h. Un tableau documente par profil les cases médianes, la Gloire médiane, l'écart assidus/occasionnels et les éliminés, avec et sans heure de bataille. Étape 2, seulement si les cibles sont manquées (cases médianes des occasionnels < 10, écart > 200 % ou éliminés > 2 par semaine) : on soumet au porteur le Repli seul. Ce mécanisme défensif et déterministe rappelle les fronts dehors quand un front ennemi vise mes terres. Il s'active après orders.idleMinutes sans action, se règle dans les settings et se journalise. Il n'est codé qu'après l'arbitrage écrit du porteur, sinon il va dans IDEAS.md. Puis on remesure. La Riposte automatique est abandonnée.

**Plan.**
- Étape 1, simulateur : apps/simulator/src/terra.ts reçoit dans TerraProfile une liste `hours` (heures de Paris où le bot agit) : assidu [9, 13, 20], régulier [12, 20], occasionnel une heure tirée de la graine hors de 20 h. play() ne joue qu'à ces heures. La résolution passe par les pas réels du moteur (stepMinutesAt et inBattle), sans réimplémenter le rythme. Ajouter l'option --no-battle (battle: undefined dans les settings copiés) pour la comparaison.
- Étape 1, rapport : apps/simulator/src/terra-cli.ts ajoute par profil les cases médianes, la Gloire médiane, l'écart Gloire assidus/occasionnels en %, les éliminés (0 case à la clôture), les cases perdues entre 20 h et 21 h et les fronts entre marchands. Lancer pnpm sim --terra sur toutes les graines, avec et sans bataille.
- Étape 1, documentation : docs/calibration.md, nouvelle section « Heure de bataille (mesure du 20 octobre 2026) », avec les deux tableaux, les graines et la conclusion par rapport aux cibles. Ce commit est fait avant toute décision.
- Étape 2, conditionnelle : si au moins une cible est manquée, rédiger une note d'arbitrage pour le porteur (Repli : effet, règle, réglages). Sans réponse écrite, le Repli est noté dans IDEAS.md et rien n'est codé.
- Étape 2, après accord écrit, tests d'abord (packages/engine/test/terraferma.test.ts, fixture figée) : le Repli rappelle les fronts du défenseur dès le pas où un front ennemi vise une de ses cases. Il ne joue pas si le marchand a agi depuis moins de idleMinutes. Il est déterministe (ordre trié par heure puis par id) et émet terra_order_fired. Il ne lance jamais de front.
- Étape 2, code : packages/engine/src/settings.ts reçoit terraferma.orders {enabled, idleMinutes} ; valeurs dans themes/venice1450.settings.ts. Dans packages/engine/src/terraferma.ts : lastActionAt, orders.retreat, applyRetreat() appelée dans la résolution (l.1353, avant les fronts). Dans terraWorld.ts : la commande terraOrders. Côté serveur, me.orders dans terra.ts. Côté web, une bascule dans TerraPanel « Vos terres », une ligne au Journal et dans le récapitulatif, une ligne au Guide (TerraGuide.tsx, section Défendre) et les textes dans i18n.ts.
- Étape 2, remesure : pnpm sim --terra (toutes graines), pnpm sim et pnpm sim --pass 0.2. Mettre à jour docs/calibration.md avec le tableau avant/après.

**Mesure.** Étape 1 : un tableau par profil sur toutes les graines, avec et sans bataille, dans docs/calibration.md. Les cibles sont : cases médianes des occasionnels ≥ 10, écart de Gloire ≤ 200 %, éliminés ≤ 2 par semaine, fronts entre marchands ≥ 500. Étape 2, si elle a lieu : mêmes cibles après le Repli, tests moteur au vert, pnpm sim --pass 0.2 conforme.

**Le chef.** La mesure avant le remède : c'est exactement ce que je voulais. L'étape 1 (horaires de présence par profil, pas réels du moteur via stepMinutesAt et inBattle, option --no-battle, tableau par profil sur toutes les graines) est obligatoire et fait l'objet de son propre commit. L'étape 2 (Repli) n'existe qu'avec un arbitrage écrit du porteur. Sans lui, elle va dans IDEAS.md. On préfère un réglage (battle.to, stepMinutes) à une mécanique, comme l'écrivent les auteurs eux-mêmes.

### 16. Désencombrer le HUD et les panneaux de la Terraferme pour le pouce (`terra-6` · effort M · impact moyen)

*Expert Terraferme, compétition et social*

**Problème.** `TerraHud` (TerraLayer.tsx l.1069-1137) empile dans la colonne de droite jusqu'à 12 lignes : placement, trêve, « fin dans », nuit, équipe, Guide, ⚔ ESCARMOUCHE, ⟲ Revoir la semaine, « Bataille chaque soir à 20 h », « 32 fronts en marche », deux lignes de Milan. La capture t_terra.png en montre déjà six sous les troupes. Les noms des nations écrasent les médaillons des villes : « Mantoue (Gonzague) 121 » est écrit par-dessus « MANTOUE », « Ferrare (Este) 102 » par-dessus « FERRARE ». Dans « Vos terres », le `ContextPanel` aligne jusqu'à 6 ActionButtons (Max +20, Port, Bombarde, Remparts, Fort, Décret), plus les signaux et le curseur paysans. Le panneau d'un allié en aligne jusqu'à 6 (Envoyer, Donner 10 d, Rompre, Embargo, Désigner aux alliés, Alliance). Sur un écran de 390 px, le pouce ne sait plus où aller.

**Proposition.** En haut à droite : une seule « puce de phase » à la manière d'OpenFront, colorée selon l'état (Trêve 23 h 24 en or, Guerre en crème, ⚔ BATAILLE 34 min en cinabre qui respire, ☾ Nuit en lagune), avec en dessous « fin dans 5 j 6 h ». Le reste passe dans un bouton rond « ≡ » qui ouvre une feuille Terraferme : Guide, Escarmouche, Revoir la semaine, Classement de Gloire (terra-2), Décret, fronts en marche et chevauchées de Milan. Dans « Vos terres » : deux gros boutons (« + Troupes » et « Bâtir ici ») ; « Bâtir ici » ouvre une rangée d'icônes limitée à ce qui est constructible sur la case touchée, avec la raison si c'est grisé (« Fort : 1 pour 15 terres, vous en avez 12 »). Panneau d'un allié : « Envoyer des troupes » en or, les autres actions dans « Plus ». Les nations s'affichent comme sous-titre de la ville (« MANTOUE · Gonzague ⚔121 ») au lieu d'une étiquette flottante.

**Plan.**
- apps/web/src/game/map/TerraLayer.tsx : extraire de `TerraHud` une fonction pure `terraPhase(v, now)` qui renvoie truce, placing, war, battle, night ou closed (testée en Vitest côté web si le projet le permet, sinon dans un util) et un composant `PhaseChip`. Les liens partent dans `TerraMenuSheet`.
- apps/web/src/game/map/Hud.tsx : ajouter l'orbe « ≡ » sur le calque terra à côté de la cloche, reprendre l'`Orb` existante et ajouter un badge si une bataille est en cours.
- TerraLayer.tsx `TerraPanel` : regrouper les bâtiments dans `BuildRow`. Exposer depuis la vue (apps/server/src/game/terra.ts) `me.buildable[kind]: {ok, reason}`, calculé par une fonction pure du moteur `canBuild(state, cfg, id, cell, kind)`, déjà implicite dans les refus, et la tester.
- Étiquettes : `terraMarkers` et `TerraCity` (TerraLayer.tsx l.764 et l.896) fusionnent la nation et la ville quand la capitale d'une nation est une ville. Ajouter une règle d'évitement des collisions pour les étiquettes de nations sans ville (Aquilée, l'Empire).
- Textes dans apps/web/src/i18n.ts (`terra.phase.*`, `terra.menu.*`, `terra.build.reason.*`). Mettre à jour docs/design.md, section « Terraferme ».
- Vérification : refaire les captures 390×844 (scripts shot*.cjs du scratchpad) et comparer à t_terra.png et m_terra.png. Aucun chevauchement ni débordement horizontal, et 60 i/s tenus (le budget du plan).

**Mesure.** Captures mobiles avant et après sans chevauchement d'étiquettes. Nombre d'éléments visibles à droite ≤ 3. Télémétrie : délai entre le toucher d'une case et la première action, taux de « Bâtir » refusé par le serveur (doit tomber près de 0 grâce aux raisons affichées), ouvertures du Guide et de l'escarmouche depuis le menu.

**Le chef.** Approuvée au premier tour et maintenue. Elle est livrée après la mesure de terra-4, pour être jugée sur des chiffres de Terraferme à jour.

### 17. Carnet de route : un seul tiroir mobile dont la bande repliée est Lorenzo (fusion ux-1, loop-2 et loop-4) (`ux-1` · effort M · impact critique)

*Directrice UX/UI mobile et direction artistique*

**Problème.** Sur téléphone, il n'existe aucune liste des commandes : SideColumn n'est montée que si useWide(), et le CityPanel affiche seulement un nombre. Dans n_map.png, le quart bas de la carte est vide (insets.bottom: 100 dans MapScreen.tsx). Le moteur nextActions (packages/engine/src/advice.ts:140) ne connaît que harvest, produce, company et upgrade : il ne propose jamais de livrer une commande de ville ni un marché du Doge gagné, alors que la caution est en jeu. Trois équipes proposaient trois surfaces concurrentes pour ce même besoin (tiroir, AdviceBar, liste enrichie).

**Proposition.** Un seul chantier, un seul composant. (1) Moteur : nextActions gagne deux cas, 'tender' (marché gagné non livré, avec l'échéance et la caution en jeu) et 'deliver' (commande de ville ouverte que le stock couvre, la mieux payée, seulement si une charrette est libre). L'ordre est fixé et testé : tender > harvest > produce > deliver > company > upgrade. Supplier et loan attendront. (2) Le tiroir mobile a trois crans (56 px, 45 dvh, 88 dvh) et sa bande repliée EST le bandeau de Lorenzo : elle affiche le premier élément de nextActions avec son bouton (« Livrez 19 pain à Mantoue · 53 d · [Charger] » ou « Marché du Doge : 40 drap à Venise avant 21 h · caution 10,48 d · [Livrer] »). L'AdviceTile et l'AdviceBar disparaissent, sans composant séparé. (3) Chaque ligne de commande s'appuie sur orderInsight, réduit au strict nécessaire et en entiers : couverture have/qty, échéance en minutes, durée de l'aller en minutes, étiquettes Urgente, Doge, Compagnie et Fournisseur. Pas de tri « ducats par heure de charrette » : on trie les commandes couvertes d'abord, puis par valeur. (4) Un seul composant OrderList, partagé par SideColumn et le tiroir. (5) Le tiroir reste masqué tant que le tutoriel n'a pas franchi sell_city, et aussi quand un panneau de sélection est ouvert. Le geste ne se capte que sur la poignée, la carte reste libre. Toucher une ligne centre la ville et ouvre Cargaisons avec la commande déjà cochée.

**Plan.**
- Moteur, tests d'abord : dans packages/engine/test/advice.test.ts, sur test/fixture.ts uniquement. Cas 'deliver' : renvoyé si le stock couvre la commande et qu'une charrette est libre, absent sinon, et c'est la commande la mieux payée qui est choisie. Cas 'tender' : renvoyé si le joueur a un awarded non livré (tenders.ts:146), absent une fois livré ou après échéance. Un test d'ordre construit un état où les six cas coexistent et vérifie la séquence tender, harvest, produce, deliver, company, upgrade.
- Moteur : packages/engine/src/advice.ts, étendre NextAction avec { kind:'tender'; tenderId; city; resource; quantity; dueAt; caution: Deniers } et { kind:'deliver'; city; orderId; resource; quantity; value: Deniers }, puis les insérer à leur rang. Montants en bigint.
- Moteur, tests d'abord : packages/engine/test/orders.test.ts, puis packages/engine/src/orderInsight.ts. orderInsight(ctx, state, playerId, order, now) renvoie { have, qty, dueInMinutes, tripMinutes, tags }. tripMinutes vient de travelMinutesFor (deliveries.ts:172). Les tags sont 'urgent' (échéance < 2 × aller), 'doge', 'company' et 'supplier' ; le seuil d'urgence est lu dans worlds.settings (settings.ts) avec une valeur par défaut. Tout est en nombres entiers.
- Serveur : apps/server/src/game/view.ts, joindre orderInsight à chaque commande sérialisée et nextActions à la vue. Budget de la vue : un test apps/server/test/view-budget.test.ts construit un monde de taille simulateur (7 villes, 60 commandes, 30 joueurs) et échoue si orderInsight dépasse 2 ms pour toutes les commandes, ou si la vue complète dépasse son temps actuel de plus de 10 % (mesure médiane sur 20 passes).
- Web : nouveau apps/web/src/game/map/OrderList.tsx (lignes avec ResourceIcon 24, quantité, have/qty, gain, aller, étiquettes), qui remplace Orders dans SideColumn.tsx et sert tel quel dans le tiroir.
- Web : nouveau apps/web/src/game/map/RouteDrawer.tsx. Crans 56 px, 45 dvh et 88 dvh ; geste repris de useDragToClose (ui.tsx), attaché seulement à la poignée et à la bande ; cran mémorisé dans store('drawer'). La bande rend nextActions[0] via le rendu des cas d'Advice.tsx, déplacé dans adviceLine(). Le monter dans MapScreen.tsx si !wide && layer==='trade' && tutorial.includes('sell_city') && !panelUp. Passer insets.bottom de 100 à 160.
- Web : Advice.tsx devient adviceLine() (texte et action), sans tuile. L'AdviceTile est retirée de SeasonTiles (Comptoir.tsx). Le bouton Charger appelle select({kind:'city'}) puis ouvre Cargo.tsx avec la prop preselect=orderId. Pour un tender, le bouton ouvre le Body des Appels d'offres sur ce marché.
- i18n.ts : fr.game.drawer.{orders, empty, handle}, fr.game.advice.{deliver, deliverGo, tender, tenderGo}, fr.game.orders.tags.{urgent, doge, company, supplier}, fr.game.orders.trip(min).
- E2E : étendre apps/web/e2e/tutorial.mjs en 390×844 et 320×568. Capture du tiroir à chaque cran ; étape « livrer depuis le tiroir » (toucher la bande, Charger, Cargaisons avec la commande cochée, envoi, charrette partie). Vérifier que le tiroir est absent avant sell_city et quand un panneau est ouvert. Assertion qu'aucun débordement horizontal n'apparaît (voir ux-m1).

**Mesure.** Tests advice.test.ts et orders.test.ts au vert sur la fixture, test d'ordre compris. view-budget.test.ts au vert. E2E 390×844 et 320 px au vert avec l'étape de livraison depuis le tiroir. Événement de télémétrie 'drawer_load' : part des livraisons lancées depuis le tiroir, et délai entre l'ouverture de l'app et la première charrette partie (cible : divisé par 2). En playtest, « quoi livrer » doit être trouvé en moins de 10 s sans aide. Taux de marchés gagnés livrés avant échéance, avant et après.

**Le chef.** C'est le cœur du jeu sur téléphone, et la fusion est juste : un tiroir, une bande Lorenzo, un OrderList, un seul orderInsight (pas d'orderCoverage). J'impose un ordre unique, puisque loop-2 et ux-1 se contredisaient : marché gagné urgent (échéance < 2 × aller) > récolte > production > livraison > marché gagné non urgent > compagnie > amélioration. Un atelier oisif perd du temps qu'on ne rattrape pas, alors qu'une livraison couverte attend sans rien perdre ; produire ne prend qu'une touche. Le test d'ordre couvre les sept rangs. Le seuil d'urgence est lu dans les réglages. Je refuse les seuils en millisecondes absolues dans view-budget.test.ts : ils seraient instables en CI. On les remplace par un test de complexité, au plus un travelMinutesFor par couple ville-véhicule et par vue. La mesure réelle sur 200 joueurs se fait avec le script de perf, avec un cache par version de l'état si besoin.

### 18. Les dénouements du commerce deviennent des avis, et l'accueil compte toutes les rentrées (`loop-1` · effort M · impact critique)

*Expert boucle de commerce et sensation de progression*

**Problème.** NOTIFICATION_KINDS (apps/server/src/notify/notifier.ts l. 28) n'a aucun type commerce. Le moteur émet pourtant tender_awarded, tender_forfeited, suppliers_named, warehouses_awarded, loan_late, loan_repaid, colleganza_settled et commission_filled. Un joueur peut donc perdre sa caution sans avoir été prévenu. De son côté, welcome.ts (l. 39) recopie en dur 8 causes. Il oublie supplier_bonus, tender_delivery, quality_premium, commission, colleganza_share, project_bonus, criee_sale et decree_favour, alors que SALES (packages/engine/src/turnover.ts) les liste déjà.

**Proposition.** 1) Dans l'accueil « Pendant votre absence », les rentrées sont dérivées de SALES, plus mission_reward. On ne compte que les crédits versés sur la caisse du marchand. Les transferts entre deux comptes du même marchand sont exclus, ainsi que le côté débit de commission et de colleganza_share, qui figurent aussi dans COSTS. 2) Un nouveau type d'avis « commerce », activable à part sous le nom « Affaires du comptoir ». Tous les dénouements d'un même scan arrivent en un seul avis groupé par joueur, par exemple « Marché du Doge gagné : 60 planches, à livrer avant mer. 18 h · Titre du pain à Venise · Colleganza soldée +84 d ». 3) Un rappel d'échéance part une seule fois par marché gagné et non livré, 3 h avant dueAt. Si cet instant tombe entre 22 h et 8 h (heure de Paris), le rappel est avancé au dernier scan avant 22 h. 4) Dans Bell.tsx, chaque avis porte l'icône définie par ux-5 (aucune icône nouvelle) et un bouton qui ouvre la bonne feuille.

**Plan.**
- Tests d'abord, dans packages/engine/test/clock.test.ts sur la fixture : la fonction pure reminderAt(dueAt, leadMs, quiet) renvoie dueAt − 3 h, ou 21 h 59 la veille au soir quand dueAt − 3 h tombe dans la plage 22-8. Elle est exportée dans packages/engine/src/clock.ts.
- apps/server/src/game/welcome.ts : remplacer la clause « reason in (…) » par « reason = any(${[...SALES, 'mission_reward']}) and to_account = cash and from_account not in (comptes cash/escrow/hold du joueur) ». Importer SALES depuis @comptoirs/engine, pour qu'aucune liste ne soit plus tenue à la main.
- apps/server/src/notify/notifier.ts : ajouter « commerce » à NOTIFICATION_KINDS et une fonction tradeNews(fx, now) qui lit les événements du scan. Pour tender_awarded, seuls les gagnants (data.awards). Pour suppliers_named, gagnés et perdus, le titulaire précédent étant lu dans state.suppliers avant l'effet. Puis warehouses_awarded, loan_late, loan_repaid, colleganza_settled (investisseur et marchand) et commission_filled (acheteur). Les PNJ sont exclus. Les dénouements sont regroupés en un seul Notice par joueur et par scan, sur le modèle de la Map grouped existante (l. 97).
- notifier.ts scan() : rappel d'échéance quand now ≥ reminderAt(dueAt) et que le marché n'est pas livré. Il est dédupliqué par une ligne notifications (kind commerce, data.event = « tender_due », data.tenderId) : s'il en existe déjà une, rien ne part.
- apps/server/src/notify/texts.ts : un cas « commerce » par data.event, avec des textes en français.
- apps/web/src/i18n.ts : fr.game.notices.commerce.*, push.kinds.commerce = « Affaires du comptoir », et welcome.sources complété pour toutes les causes de SALES (une clé manquante ferait échouer le test).
- apps/web/src/game/Bell.tsx : afficher ces avis avec les icônes de ux-5 et un bouton qui ouvre tenders, suppliers:<ville> ou la porte Affaires de ux-2.
- Tests : apps/server/src/notify/notifier.test.ts. Cas couverts : un tender_awarded donne un avis ; rien pour un PNJ ; trois dénouements du même scan donnent un seul push ; le rappel part une fois, et pas deux au scan suivant ; une échéance à 9 h donne un rappel la veille avant 22 h. Dans apps/server/src/game/welcome.test.ts : supplier_bonus et colleganza_share crédités apparaissent, un débit de commission n'apparaît pas, et chaque raison de SALES a sa clé dans welcome.sources.

**Mesure.** Tests du notifier, de welcome et de reminderAt. Télémétrie /admin : part des cautions perdues (tender_forfeited / marchés gagnés), objectif divisé par 2 en bêta ; part des joueurs qui rouvrent la feuille Appels d'offres dans les 3 h après l'avis.

**Le chef.** Vérifié : welcome.ts:39 tient 8 raisons à la main, dont family_order_reward, une raison morte, et ne connaît pas supplier_bonus ni tender_delivery. NOTIFICATION_KINDS n'a aucun type commerce. Dériver les rentrées de SALES, avec un test qui échoue sur une clé manquante, est la bonne correction. Un seul avis groupé par scan et un seul rappel d'échéance, avancé avant 22 h : c'est raisonnable. Condition : ces avis entrent dans le plafond global de notifications (voir les manques).

### 19. Moments de gloire : titres, niveaux, rangs et victoires célébrés (`loop-3` · effort M · impact fort)

*Expert boucle de commerce et sensation de progression*

**Problème.** Le seul retour positif du jeu est flyCoins dans fx.tsx : toujours 6 pièces, quel que soit le gain. Dans Game.tsx, le toast ne sert qu'aux erreurs (setToast(fr.game.errors…)). Passer de Colporteur à Marchand, qui ouvre la chaîne du verre de Murano (C7, settings.unlocks), ne déclenche rien : le titre change en silence dans l'en-tête de la carte (MapScreen.tsx l. 661). Il en va de même pour un niveau gagné (level.ts), un atelier amélioré, le rival dépassé (le texte passe de « Rival : X, +12 d » à « Talonné par X » sans aucun effet) et un gain de rang. sound.ts n'a que 5 sons courts (coin, harvest, cart, stamp, bell) et aucun son de triomphe. Le sommet émotionnel d'un jeu de « devenir le plus riche » manque.

**Proposition.** Une couche « Fanfare » détecte les changements entre deux vues, comme le fait flyCoins pour la caisse, et joue un moment adapté. Le changement de titre affiche un bandeau plein écran : blason, sceau qui s'imprime, « Vous voilà Marchand », puis ce qui s'ouvre (« Verrerie de Murano : sable → verre → miroirs ») et un bouton « Bâtir la verrerie ». Un niveau gagné fait pulser l'anneau du blason et affiche « Niv. 4 ». Le rival dépassé affiche un bandeau « Vous passez devant Comm884 » et le rang qui défile (#34 → #29). Une amélioration d'atelier fait « pop » la carte de l'atelier, avec le gain par heure (+4,2 d/h) qui monte. Le nombre de pièces et la durée suivent le gain (6 pièces sous 20 d, 12 jusqu'à 200 d, 20 au-delà) et la bourse du HUD affiche un compteur qui défile. Les moments passent dans une file, un seul à la fois, et respectent prefers-reduced-motion.

**Plan.**
- apps/web/src/game/fanfare.tsx (nouveau) : une file d'événements, un composant FanfareLayer monté à côté de FxLayer, et les variantes title, level, rival, rank, upgrade, supplier et tender (la dernière branchée sur les avis de loop-1).
- apps/web/src/game/Game.tsx : dans apply() et refresh(), comparer la vue précédente (viewRef) à la nouvelle : standing.title.current.name, level.level, rival (chase vers chased), le rang, buildings[].level. Ne rien déclencher au premier chargement (loaded.current).
- apps/web/src/game/fx.tsx : le nombre de pièces devient fonction du gain, et un compteur qui défile s'affiche sur [data-fx="purse"] dans map/Hud.tsx.
- apps/web/src/sound.ts : ajouter les SoundKind fanfare (arpège de 3 voix triangle) et rankUp ; apps/web/src/haptics.ts : utiliser success, puis alarm léger pour un titre.
- apps/web/src/i18n.ts : fr.game.fanfare (title, unlocked, level, overtook, rankUp, upgraded). Pour C7, réutiliser les noms de chaînes du catalogue (unlocks).
- Tests : apps/web/src/game/fanfare.test.ts sur la détection pure (diffView(prev, next) qui renvoie les moments), sans DOM.

**Mesure.** Test de diffView. Télémétrie : bâtiments de luxe construits dans les 24 h après le titre (avec et sans le bouton « Bâtir ») ; durée de session le jour d'un changement de titre comparée à la médiane.

**Le chef.** Approuvée au premier tour et maintenue. Elle est placée après ux-1 et loop-1 pour réutiliser la liste et les avis, sans nouvelle surface.

### 20. Jouer en invité, rattacher son e-mail ensuite, code à 6 chiffres (`ftue-3` · effort L · impact critique)

*Experte premières minutes et onboarding*

**Problème.** Aujourd'hui, pour jouer : e-mail → lien magique (n_login.png) → pseudo → 4 diapositives (Intro.tsx) → métier (Region.tsx). Plus de 3 minutes et une sortie de l'application avant le premier geste. Sur un PWA iOS installé, le lien magique s'ouvre dans Safari, qui ne partage pas les cookies du PWA : la connexion par e-mail seule est cassée pour notre cible. accounts.email est NOT NULL (schema.ts:26) et le pseudo est unique sur tout le serveur (accounts_pseudo_key).

**Proposition.** On ouvre l'application, on touche « Jouer » et on choisit son métier (une carte par métier : illustration, ce qu'on produit, ce qu'on achète). Une seule diapositive d'histoire, puis le comptoir, avec un nom tiré du thème (« Casa Contarini », modifiable). Le compte invité tient dans un cookie httpOnly. À la fin du guide : « Mettez votre maison à l'abri ». L'e-mail reçu contient le lien ET un code à 6 chiffres, qu'on tape dans l'application, ce qui contourne le problème du PWA iOS. Aucune fusion de joueurs : si l'adresse a déjà une maison dans ce monde, on choisit laquelle garder. Le classement final et la Cérémonie exigent un e-mail vérifié.

**Plan.**
- Schéma : apps/server/src/db/schema.ts. accounts.email devient nullable (index unique partiel WHERE email IS NOT NULL), ajout de guest boolean NOT NULL default false et de emailVerifiedAt timestamp null. Sur login_tokens, ajout de codeHash text et attempts int default 0. pnpm --filter @comptoirs/server db:generate --name guest_accounts. La migration remplit emailVerifiedAt pour les comptes existants.
- Auth (apps/server/src/auth/service.ts) : createGuest(ip). Elle refuse au-delà de settings.guests.maxPerWorld (nouveau réglage zod, transmis par worlds.settings) et ouvre une session dans le cookie httpOnly existant (SESSION_COOKIE, SameSite=Lax, Secure). Route POST /api/auth/guest dans app.ts avec config.rateLimit { max: 5, timeWindow: '1 hour' } par IP.
- Auth : requestLink(email) génère le même jeton plus un code à 6 chiffres (crypto.randomInt), avec codeHash = sha256(code + tokenHash) et une durée de LINK_VALID_MINUTES. magicLinkMail affiche le code en gros. Nouvelle route POST /api/auth/code { email, code } : compare en temps constant, incrémente attempts, invalide après 5 essais, usage unique atomique comme verify(). Limitée à 10 essais par 15 minutes par IP.
- Auth : attachEmail(session, email) envoie lien et code. À la vérification, si aucun autre compte vérifié n'a cette adresse, l'invité devient vérifié (email, emailVerifiedAt, guest=false) : simple mise à jour d'attributs, aucun mouvement d'argent ni de stock. Si un compte existe déjà avec un joueur dans ce monde, réponse conflict { keep: 'guest' | 'existing' }. Garder l'existant : la session bascule et l'invité est abandonné (il sera purgé par la règle 7 j). Garder l'invité : l'adresse passe à l'invité seulement si le compte existant n'a aucun joueur actif dans le monde ; sinon, refus explicite. Dans tous les cas, jamais de transfert de ducats ni de stock : ledger_entries et stock_movements ne sont pas touchés.
- Pseudo par défaut : themes/venice1450 reçoit houseNames (contenu : ~120 familles vénitiennes). Le tirage écarte les noms déjà pris dans le monde et retombe sur « nom + ordinal » si la liste est épuisée. Il respecte l'index unique global.
- Classement en direct : exclure les invités sans action depuis 7 jours (lastActionAt). Tâche de purge quotidienne : invité inactif depuis 7 jours ET sans vente (aucun événement city_sale, delivery_arrived ou order_placed rempli) → deleteAccount(db, id) existant (apps/server/src/account.ts:109), sans chemin de suppression parallèle.
- Règle : le classement final et la Ceremony filtrent emailVerifiedAt IS NOT NULL. L'écrire dans fr.game.help et dans fr.game.seasonNotes. Le joueur invité voit dans le Classement « Rattachez un e-mail pour figurer au classement final ».
- Web : App.tsx, l'écran d'entrée propose « Jouer » et « J'ai déjà une maison » (e-mail + champ code à 6 chiffres, inputmode=numeric, autocomplete=one-time-code). Intro.tsx passe à une seule diapositive (Goal, avec le podium), et les textes Loop et Rythme vont dans les bulles du coach au pas concerné. Region.tsx : cartes allégées. PseudoForm devient facultatif.
- Web : carte « Mettre ma maison à l'abri » à la fin du guide (Coach.tsx), et rappel dans Welcome.tsx à chaque retour tant que le compte est invité.
- Tests apps/server/test/auth.test.ts : invité créé (cookie httpOnly), limite par IP (429), plafond par monde, code juste, code faux, 5 essais puis invalidation, code expiré, code à usage unique, attach sans conflit, attach en conflit avec les deux choix, aucune ligne de ledger_entries ou stock_movements créée par attach, purge (invité vendeur conservé, invité inactif sans vente supprimé par deleteAccount), Cérémonie sans invité, unicité du pseudo par défaut.
- Admin : apps/server/src/game/admin.ts, ajouter à l'entonnoir les étapes guest_created, region_chosen et email_attached, avec horodatage.

**Mesure.** Tests d'auth listés ci-dessus et migration générée. /admin : taux de passage de l'ouverture au premier produce ≥ 85 % et temps médian ≤ 60 s. Taux de rattachement d'e-mail à J1 et J7. Test manuel sur iPhone avec le PWA installé : connexion par code réussie sans passer par Safari.

**Le chef.** C'est critique : l'entonnoir e-mail est cassé sur un PWA iOS installé. Quatre conditions sont non négociables. 1) Le code est celui de ux-m2, avec une seule migration login_tokens. 2) Le compte invité casse la défense « un compte par e-mail vérifié » (CADRAGE l.600). Jusqu'à la vérification de son e-mail, un invité ne peut transférer aucune valeur à un autre humain : pas d'échange avec un autre joueur au Rialto, pas de colleganza, de commande à prix, de commission, de terraSend, de don de ducats ni d'alliance. Les achats et ventes face à la Dogana et aux villes restent permis. Des tests le vérifient. 3) En cas de conflit d'adresse, on ne supprime ni ne dépouille jamais un compte qui a un historique (palmarès, Influence, Renommée). « Garder l'invité » n'est possible que si le compte existant n'a aucun historique, et il est alors supprimé par deleteAccount. Sinon, on garde l'existant. 4) L'id du joueur est l'id du compte : aucune réaffectation de joueur, aucun mouvement dans ledger_entries ni stock_movements.

### 21. Porte « Affaires » à onglets, la cloche limitée aux avis, l'anneau de saison qui ouvre « Ma saison » (`ux-2` · effort M · impact fort)

*Directrice UX/UI mobile et direction artistique*

**Problème.** NoticesSheet (Notices.tsx) empile sous une cloche sans libellé la saison, la Criée, la gazette, le Carnet, SeasonTiles (Conseiller, Tableau de bord, Appels d'offres, Affaires, Compagnie, Maîtrise, Balle), le Journal et les Nouvelles : plus de 3 écrans (n_notices.png). Les outils de décision C2, C3, C5, C9, C10 et P1-7 ne sont accessibles que par là. Le nav (Hud.tsx:351) en gap-4 avec des portes larges n'a été vérifié qu'avec 4 portes.

**Proposition.** Une porte « Affaires » ouvre une feuille à trois onglets : Conseil (le Tableau de bord seul, puisque Lorenzo vit dans la bande du tiroir ux-1), Contrats (Appels d'offres, Compagnie, Fournisseurs) et Marchands (Commandes, Colleganza, Banque). La cloche ne garde que les nouvelles, la Criée, la gazette et le Journal. Toucher l'anneau de saison (SeasonRing) ouvre « Ma saison » : Carnet, objectif, Maîtrise, Balle. La barre du bas compte 5 portes : Ateliers, Affaires, Classement, Terraferme, Aide. Elles tiennent à 320 px sans tronquer aucun libellé ; si la mesure échoue, on passe aux libellés courts déjà prévus (« Ateliers », « Affaires », « Rang », « Terre », « Aide »). La porte reste verrouillée jusqu'à sell_city (message « Après votre première vente »), et le coach la présente une seule fois.

**Plan.**
- Extraction sans duplication : dans Dashboard.tsx, Tenders.tsx, Company.tsx, Deals.tsx, Suppliers.tsx et Bank.tsx, sortir le contenu de chaque *Sheet dans un composant exporté *Body (DashboardBody, TendersBody…). Le *Sheet existant devient <Sheet><XBody/></Sheet> : aucun JSX copié.
- Nouveau apps/web/src/game/Affairs.tsx : Sheet avec Tabs variant='underline' (ui.tsx), onglets 'advice', 'contracts' et 'merchants' qui montent les *Body, onglet mémorisé dans store('affairsTab'). Une table AFFAIRS_ALIAS fait correspondre les anciennes clés aux onglets : setSheet('dashboard'|'tenders'|'company'|'suppliers'|'deals'|'bank') ouvre Affairs sur le bon onglet et fait défiler jusqu'à la bonne section. Advice.tsx:33 et tous les appelants existants restent inchangés.
- Hud.tsx : ajouter <Door label={m.buttons.affairs} coach='door-affairs' dot={affairesSaisissables} locked={locks.affairs}>. Le nav passe de gap-4 à gap-1 avec des portes w-[64px] et un libellé text-xs whitespace-nowrap. Le libellé court est choisi par une règle CSS (@container ou media max-width:340px) qui bascule sur fr.game.map.buttons.short.*.
- unlocks.ts : 'affairs' verrouillé jusqu'à tutorial.includes('sell_city'), message fr.game.unlocks.affairs = 'Après votre première vente'. Mettre à jour unlocks.test.ts.
- Coach.tsx : étape unique 'door-affairs', déclenchée au premier rendu déverrouillé, mémorisée dans store, qui pointe data-coach='door-affairs'.
- Notices.tsx : retirer le Carnet (FirstSteps, Daily, Ledger) et SeasonTiles ; garder la saison et son acte, la Criée, la gazette, le Journal et les Nouvelles.
- Hud.tsx et nouveau apps/web/src/game/MySeason.tsx : le SeasonRing ouvre MySeason (Carnet, SeasonGoal, MasteryTile, BaleTile). Le pseudo continue d'ouvrir le profil.
- SideColumn.tsx (ordinateur) : 4e onglet 'Affaires' qui monte le même Affairs en ligne (prop inline).
- i18n.ts : fr.game.map.buttons.affairs = 'Affaires', buttons.short.{workshops, affairs, ranking, layer, help}, fr.game.affairs.tabs.{advice:'Conseil', contracts:'Contrats', merchants:'Marchands'}, fr.game.mySeason.title. Mettre à jour les passages de l'Aide qui citent la cloche, puis apps/web/test/help.test.ts.
- E2E : dans tutorial.mjs, à 320×568 et 390×844, mesurer pour chaque porte que scrollWidth <= clientWidth du libellé (aucune troncature) et que les boîtes des portes ne se recouvrent pas ; ouvrir chaque onglet d'Affaires et MySeason.

**Mesure.** E2E 320×568 : aucun libellé tronqué ni chevauchement de porte. help.test.ts et unlocks.test.ts au vert. Télémétrie 'sheet_open' : ouvertures par joueur actif et par jour de Tableau de bord, Appels d'offres et Marchands (cible : ×3). Profondeur moyenne de défilement de la feuille Avis divisée par 2. pnpm sim inchangé, puisque c'est de l'interface.

**Le chef.** Une cloche qui empile plus de 3 écrans d'outils de décision, c'est un défaut d'architecture. Les *Body sont extraits sans JSX copié, un commit par feuille, et AFFAIRS_ALIAS est gelé et documenté. Les libellés courts servent de repli explicite si l'e2e à 320 px les tronque. Le Carnet passe dans « Ma saison ». Conditions : HUD_DOORS (ftue-6) est mis à jour dans le même commit que la porte, et help.test.ts reste vert.

### 22. Pas « Réinvestir » : la bonne quantité à acheter, une amélioration au jour 0 (`ftue-2` · effort M · impact fort)

*Experte premières minutes et onboarding*

**Problème.** coach.invest, investLater et goComptoir ne sont jamais utilisés. Le guide ne fait pas faire d'amélioration alors que l'intro et coach.done la promettent. first_upgrade est réglée au jour 3, et sa récompense (10 briques, 10 planches) tombe après l'amélioration qu'elle devait financer. La récompense de first_delivery (10 pains, 5 bois) est la même pour toutes les régions : un joueur de Terraferma n'a ni briques ni planches. Le pas « acheter » ne dit pas quoi ni combien acheter.

**Proposition.** Le guide passe à 7 pas : produire, récolter, transformer, livrer, acheter, réinvestir, Livre de compte. La récompense de la première livraison apporte les matériaux qui manquent à la région du joueur. Au pas « acheter », Lorenzo dit « Il vous manque 3 planches pour agrandir votre ferme » : la quantité exacte, d'après le coût exposé par l'engine. Au pas « réinvestir », il faut au plus 3 touches (porte Ateliers → Améliorer sur l'atelier conseillé → Confirmer), avec un bouton Passer. Le bâtiment s'anime en montant de niveau (animation coupée par reduced-motion), puis s'affiche « Niveau 2 : +25 % par lot ». first_upgrade s'encaisse aussitôt : une modeste somme en ducats.

**Plan.**
- Engine, tests d'abord sur la fixture : packages/engine/src/advice.ts. nextActions expose pour l'amélioration conseillée { buildingId, cost: BuildingCost (costForLevel de buildings.ts:20), missing: Record<resource, qty> } calculé avec le stock et la caisse du joueur. Le web n'a plus à recalculer de coût. Tests : manque nul, manque partiel, caisse insuffisante.
- Engine : settings.ts, les missions reçoivent reward.byRegion: z.record(z.object({ goods, ducats })).optional(), qui s'ajoute à reward. missions.ts (encaissement) lit la région du joueur, et les mouvements passent par stock_movements et le grand livre comme aujourd'hui. Tests sur la fixture : récompense selon la région, et récompense de base inchangée sans byRegion.
- Thème : venice1450.settings.ts. first_delivery.reward.byRegion donne, pour chaque région, les matériaux de l'amélioration au niveau 2 de son atelier conseillé, moins le stock de départ (startingStock). Un test de thème (packages/engine/test/theme.test.ts, seul endroit qui lit Venise) vérifie que startingStock + récompense couvre missing pour chaque région. first_upgrade : day 0, reward { ducats: 15 000 d } environ (15 d, à caler par la simulation), plus de matériaux.
- Serveur : apps/server/src/game/tutorial.ts, ajouter 'upgrade' entre market_buy et mission, détecté par l'événement engine upgrade. L'entonnoir de admin.ts suit automatiquement.
- Web : Coach.tsx. Le pas buy affiche coach.buy(ressource, view.next.missing[r]) et cible le Rialto sur cette ressource avec la quantité préremplie. S'il ne manque rien, le pas est sauté. Pas upgrade : porte door-workshops → data-coach upgrade-${buildingId} (Comptoir.tsx) → data-coach upgrade-confirm (feuille upgrade). Textes coach.invest, goComptoir, investLater (si la caisse manque) et bouton Passer (clé store skipUpgrade, sur le modèle de skipMarketBuy).
- Web : unlocks.ts. house s'ouvre aussi quand upgrade est fait ou passé. Mise à jour de apps/web/test/unlocks.test.ts.
- Web : classe .level-up dans index.css (pulsation et étincelles sur le bâtiment de la carte et dans la fiche), désactivée sous @media (prefers-reduced-motion: reduce). Toast fr.game.coach.levelUp(level, bps).
- Sim : pnpm sim sur toutes les graines, puis pnpm sim --pass 0.2. Documenter dans docs/calibration.md l'effet de la récompense par région et de l'amélioration au jour 0 sur la médiane du patrimoine à J7 et sur l'écart entre les profils.
- Mesure de durée : l'e2e de ftue-m1 chronomètre le guide complet (produire → mission) avec ftue-1 en place. La cible est 10 min au plus, lots accélérés de 30 s compris.

**Mesure.** Tests engine (missing, byRegion), test de thème sur la couverture des matériaux, unlocks.test. /admin : part des joueurs au pas upgrade et part des joueurs avec au moins une amélioration à J0. pnpm sim et --pass 0.2 conformes, écart ≤ 5 %. Durée du tutoriel ≤ 10 min dans l'e2e.

**Le chef.** Vérifié : first_upgrade a day: 3 (venice1450.settings.ts:513), et coach.invest n'est jamais lu. Une amélioration au jour 0 avec la quantité exacte manquante, calculée par l'engine, tient la promesse de l'intro. La récompense par région, avec le test de couverture sur le thème, lève le blocage. Le texte mélange les unités (« 15 000 d », puis « 15 d ») : le montant de first_upgrade s'écrit en deniers, en bigint, et c'est la simulation qui le fixe. pnpm sim, pnpm sim --pass 0.2 et l'entrée dans calibration.md sont obligatoires. Elle vient après loop-5, dont dépendent missing et le coût affiché, et après ftue-1 et ftue-3. Le guide complet doit tenir en 10 min au plus dans l'e2e.

### 23. La course à la Signoria : classement de Gloire visible, rival unique, décret public du favori (`terra-2` · effort M · impact fort)

*Expert Terraferme, compétition et social*

**Problème.** terra.ts (l.246) envoie `ranking` (top 10) et `players`, typés dans types.ts (l.1050), mais le client ne les affiche jamais. La pastille montre seulement « 2 410 Gloire · 7e ». Le rival n'apparaît que sur le calque commerce (Hud.tsx l.231, `layer === "trade"`). Le décret du favori est public dès son choix selon les règles en vigueur : plan-terraferme.md l.97 et le commentaire de terraferma.ts l.159 et l.1203, « public, it may change until the close ». La vue n'expose pourtant que `me.programme` (terra.ts l.243).

**Proposition.** La pastille Gloire devient touchable et affiche « 7e/40 ». Elle ouvre une feuille « La course à la Signoria » : le top 10 (blason, cases, Gloire par heure) puis la ligne du joueur, épinglée, avec ses voisins de rang. La phrase clé, de jour seulement : « 140 Gloire derrière Testeur826 (6e) · au rythme actuel, vous le passez vers 18 h ». La nuit et pendant la trêve, la projection disparaît au profit de « Le front dort jusqu'à 8 h ». Une barre de paliers indique « Premier quart : +5 Influence, encore 2 places », lue dans cfg.close.influence. En tête, le favori et son décret choisi : le plan rend ce choix public, le favori n'a donc rien de nouveau à révéler. Les règles restent inchangées. Sur le calque Terraferme, une seule ligne de rival : celui qui est juste au-dessus du joueur, par exemple « Rival : Testeur826, 140 devant ». C'est le seul rival de ce calque ; terra-5 n'en ajoute pas.

**Plan.**
- Vérification des règles (faite) : plan-terraferme.md l.97 dit « public dès son choix, il change jusqu'à la clôture », et terraferma.ts définit `programme` comme public (l.159). Aucune règle nouvelle : on expose seulement s.programme[favori].
- Moteur, tests d'abord (packages/engine/test/terraferma.test.ts, fixture figée) : `gloryRate(state, cfg, id, at)` renvoie un entier, la Gloire par heure ouverte calculée avec les barèmes existants (cases × perCell + villes × perCity, en entiers et arrondis vers le bas). Elle vaut 0 la nuit, pendant la trêve et après la clôture. `overtakeAt(state, cfg, a, b, at)` renvoie un timestamp entier ou null : null si l'écart ne se comble pas, si le rythme est nul ou si la date dépasse la clôture. Le calcul saute les heures de nuit. Cas testés : écart comblé de jour, écart comblé seulement le lendemain, rythme inférieur et nuit.
- Serveur : dans apps/server/src/game/terra.ts, ajouter à la vue `meRow` {rank, glory, rate}, `around` {above, below} avec pseudo, écart et overtakeAt (null la nuit), `tiers` (seuils de rang des paliers, lus dans cfg.close.influence et players), `favourite` {holder, programme: s.programme?.[id] ?? null} et `gloryPerHour` sur chaque ligne de ranking. Ajouter un test de forme de la vue dans apps/server/test/terra.test.ts.
- Types : mettre à jour apps/web/src/game/types.ts (TerraView l.1050).
- Web : apps/web/src/game/map/TerraLayer.tsx rend la pastille Gloire touchable et ouvre la nouvelle TerraRankingSheet, qui reprend `Line` de Top.tsx et son badge PNJ. Ajouter t().rank(rank, players). Dans map/Hud.tsx, la ligne rival est rendue aussi pour `layer === "terra"`, à partir de `around.above`. Dans Top.tsx, un onglet « Gloire » s'ajoute quand terraferma.live est actif.
- Textes dans apps/web/src/i18n.ts : terra.ranking existe déjà, ajouter overtake (« au rythme actuel, vous le passez vers {h} »), sleeping, tierLeft et favourite.
- Test de rendu à 390 px (Playwright, viewport 390×844) : feuille ouverte avec 10 lignes et des pseudos de 16 caractères, scrollWidth ≤ clientWidth, aucun chevauchement entre la pastille et la ligne rival.

**Mesure.** Tests moteur de gloryRate et overtakeAt en entiers. Le test de rendu à 390 px passe sans débordement. Télémétrie : ouvertures de la feuille, sessions Terraferme entre 19 h et 21 h avant et après, part des joueurs qui lancent un front dans l'heure qui suit l'ouverture. Aucun changement d'équilibrage, donc pas de passage au simulateur.

**Le chef.** Vérifié : ranking est calculé dans terra.ts et jamais affiché. Un classement de Gloire invisible tue la compétition. gloryRate et overtakeAt sont des fonctions pures en entiers, testées sur la fixture, et rien ne s'affiche la nuit. Le décret du favori, déjà public selon plan-terraferme l.97, est montré sans nouvelle règle. Conditions : un seul composant de classement, monté dans la feuille ET dans l'onglet Gloire de Top, sans double rendu. Le rival du calque Terraferme passe par la ligne sous la grille de ux-m1 et par MerchantName (ux-m3). Le test à 390 px est intégré à l'e2e de ux-m1, pas lancé à part.

### 24. Des agresseurs nommés : notification avec l'heure de la première case, récapitulatif par coupable, bouton Riposter (`terra-5` · effort S · impact fort)

*Expert Terraferme, compétition et social*

**Problème.** texts.ts écrit « Un voisin lance 34 troupes contre votre territoire ». terraWorld.ts (l.297 et l.343) émet terra_attacked avec {by, troops, aim}, sans l'heure de la première case. Le récapitulatif « Bon retour » (Welcome.tsx l.66-90) ne donne que des totaux. docs/recommandations cite « Rivaux sans visage (Port Royale 3) » comme reproche majeur du genre.

**Proposition.** La notification devient « Testeur826 marche sur vos terres avec 34 troupes · première case vers 14 h 30 ». Si l'agresseur est un PNJ, il porte la mention PNJ, et une nation est nommée comme telle (« Ferrare (Este) »). Le toucher ouvre la carte Terraferme centrée sur la frontière visée, avec le panneau d'attaque contre l'agresseur déjà ouvert. Le récapitulatif liste les coupables : « Testeur826 vous a pris 6 terres · Ferrare 2 », chacun avec un bouton « Riposter » qui ouvre la même vue. Cette idée n'ajoute ni Gloire de reconquête, ni prevOwner/lostAt, ni rival de guerre : le rival de ce calque est celui de terra-2.

**Plan.**
- Moteur, tests d'abord (packages/engine/test/terraWorld.test.ts, fixture figée) : terra_attacked porte `firstAt`, l'heure prévue de la première case. On la calcule avec la fonction qui produit déjà takes[0].at dans la vue des fronts, extraite en export pur si elle vit côté serveur. Test : firstAt est un entier ; il est décalé à 8 h si le front part pendant la nuit et après la trêve s'il part pendant la trêve.
- Moteur : packages/engine/src/terraWorld.ts (l.297 et l.343) ajoute firstAt dans le payload. Aucune règle de résolution n'est touchée.
- Serveur : apps/server/src/notify/texts.ts, dans terraText et terra_attacked (l.173), résout le pseudo par accounts (le flag bot vient de terra-m2) ou le nom de la nation, puis formate firstAt à l'heure de Paris avec `clock`. L'URL de la notification devient /jeu?layer=terra&cell={aim}&against={by}.
- Serveur : apps/server/src/game/welcome.ts renvoie terra.by: {holder, pseudo, bot, cells}[], agrégé depuis les événements de prise de la semaine depuis la dernière visite, trié par cases décroissantes et limité à 5 lignes.
- Web : Welcome.tsx affiche les lignes par agresseur et leur bouton « Riposter ». MapScreen.tsx lit ?layer=terra&cell=&against= et transmet la sélection à TerraLayer, qui centre la frontière et ouvre TerraPanel en mode attaque. Textes dans apps/web/src/i18n.ts (terra.attackedBy, terra.recap.by, terra.riposte).
- Tests serveur : le texte de notification contient le pseudo et l'heure ; un PNJ porte « PNJ » ; une nation porte son nom ; welcome.ts agrège deux agresseurs dans le bon ordre.
- Aucun changement d'équilibrage : pas de passage au simulateur.

**Mesure.** Télémétrie : taux d'ouverture des notifications nommées comparé à la période anonyme, part des retours qui lancent un front dans les 10 minutes depuis « Riposter », retour à J+1 après une perte de terres. Test moteur de firstAt et tests de texte côté serveur.

**Le chef.** Nommer l'agresseur et proposer une riposte en un toucher : c'est la boucle émotionnelle du genre, pour un coût minime et sans aucune règle touchée. firstAt est extrait en fonction pure et testé contre la nuit et la trêve. Le marquage PNJ passe par ux-m3. Condition : les notifications terra_attacked entrent dans le plafond global (au plus une par agresseur et par heure).

### 25. Le rendez-vous quotidien : une seule demande de notification, une gazette du matin, un rappel « série en danger » (`live-1` · effort M · impact critique)

*Expert rétention, live-ops et monétisation éthique*

**Problème.** Les notifications ne s'activent que tout en bas du Profil (Profil.tsx:451, PushSettings.tsx). Aucun moment de jeu ne les propose. Ce qui arrive entre 22 h et 8 h va dans la cloche mais n'est jamais poussé (notifier.ts send(), retour anticipé sur les heures calmes). NOTIFICATION_KINDS n'a ni 'morning' ni 'streak', alors que la série du coffre retombe à 0 au premier jour manqué (activity.ts:218, 262). 'harvest' est actif par défaut (schema.ts:35, pushOff = []) avec des lots de 30 minutes : le premier contact avec les notifications serait du bruit. Ce chantier fusionne ftue-5.

**Proposition.** (a) Une seule demande, au bon moment. La première fois que le joueur lance un lot de 30 minutes, Lorenzo propose : « Je vous préviens quand vos charrettes arrivent, et chaque matin à 8 h ? ». La carte porte notre propre bouton « Activer » ; la demande du navigateur ne part qu'au clic. Sur iPhone hors écran d'accueil, la carte montre la fiche « Sur l'écran d'accueil » en deux étapes. Après un « Plus tard », elle revient au plus une fois, à la 3e session, puis plus jamais. (b) La Gazette du matin, à 8 h 05 heure de Paris : lots prêts, livraisons payées cette nuit, nouvelle du jour, série en cours. (c) « Série en danger » à 19 h, si le coffre du jour n'est pas ouvert et que la série vaut au moins 2 jours. Au plus 2 notifications de ce genre par jour, dédoublonnées par jour, chacune coupable dans le Profil. (d) 'harvest' est coupé par défaut ; le ballot plein passe dans la gazette. Le sceau de grâce n'est pas codé : il va dans IDEAS.md jusqu'à un arbitrage écrit du porteur.

**Plan.**
- Orchestrateur partagé avec live-6 : apps/web/src/game/Invitations.tsx (nouveau), monté une fois dans Comptoir.tsx. Il affiche au plus UNE invitation par session et tient la règle : demande de notification au premier lot de 30 min, retour éventuel à la 3e session ; invitation à installer à la 2e session, jamais dans la même session qu'une demande de notification. Le compteur de sessions vient du serveur (nombre de session_start), pas du stockage local.
- apps/web/src/game/PushAsk.tsx (nouveau) : réutilise enablePush (push.ts) et le texte homeScreen existant ; i18n fr.game.pushAsk.{title,body,enable,later,iosSteps}.
- apps/server/src/db/schema.ts : accounts.pushOff passe au défaut ['harvest'] ; ajout de accounts.pushAskedAt et accounts.pushAskCount. Migration `pnpm --filter @comptoirs/server db:generate --name push_ask`, qui met aussi à jour les comptes existants (ajout de 'harvest' dans push_off).
- apps/server/src/notify/notifier.ts : nouveaux types 'morning' et 'streak' dans NOTIFICATION_KINDS. morningDigest(now) se déclenche dans scan() au premier passage après 08:05, est dédoublonné par notifications.data.day (même modèle que weekResults) et réutilise welcomeBack() (welcome.ts). streakAtRisk(now) se déclenche à 19:00 à partir de dailyView. Plafond : au plus 2 notifications par compte et par jour pour 'morning' et 'streak' réunis.
- apps/server/src/notify/texts.ts : textes des deux types ; apps/web/src/i18n.ts : fr.game.notices.push.kinds.morning et .streak (pour couper chacun dans le Profil).
- apps/web/public/push-sw.js : ajouter ?src=push&kind=<kind> à l'URL ouverte. Le serveur enregistre la télémétrie 'push_open' {kind} au session_start correspondant, et 'push_ask' {accepted, attempt, ios_standalone} depuis PushAsk.
- apps/server/src/game/admin.ts : rétention J1/J7/J30 séparée entre joueurs avec et sans notifications.
- Tests : apps/server/test/notify.test.ts : gazette envoyée une seule fois par jour, rien pendant les heures calmes, série en danger seulement si le coffre est fermé et la série ≥ 2, plafond de 2, 'harvest' coupé pour un nouveau compte.
- IDEAS.md : « Sceau de grâce (série clémente) — en attente d'arbitrage du porteur ». Ligne dans fr.game.seasonNotes.

**Mesure.** Au moins 35 % d'acceptation parmi les joueurs qui voient la carte (push_ask) ; taux d'ouverture de 'morning' (push_open/morning, divisé par les envois) ; J1 et J7 des joueurs avec notifications face aux autres dans /admin ; aucun compte ne reçoit plus de 2 notifications morning/streak par jour (test et requête de contrôle).

**Le chef.** Une seule demande de notification, posée au bon moment avec notre propre bouton, la gazette à 8 h 05, le rappel de série à 19 h, harvest coupé par défaut et le compteur de sessions tenu par le serveur : c'est exactement ce qu'il faut. Le sceau de grâce va dans IDEAS.md, faute d'arbitrage. Le plafond « 2 par jour pour morning et streak » est un plafond local : il faut aussi le plafond global (voir les manques). L'orchestrateur Invitations.tsx est le seul endroit qui décide des invitations.

### 26. Installer et se connecter dans l'application : manifeste complet, invitation à la 2e session, code à 6 chiffres (`live-6` · effort M · impact fort)

*Expert rétention, live-ops et monétisation éthique*

**Problème.** Le manifeste (vite.config.ts:31-50) n'a ni id, ni screenshots, ni shortcuts, ni categories. Chrome n'affiche donc pas la fenêtre d'installation riche. Aucun écouteur beforeinstallprompt n'existe. session_start (routes.ts:377) ne note pas si le jeu tourne en standalone, donc l'effet de l'installation ne se mesure pas. Bloquant : sur un PWA iOS installé, le lien magique s'ouvre dans Safari, qui ne partage pas le stockage du PWA, et le joueur ne peut pas se connecter dans l'application. Or l'installation conditionne les notifications sur iOS (live-1).

**Proposition.** (1) Manifeste complet : id '/', categories ['games','strategy'], orientation 'any', description longue ; captures étroites (390×844 : carte avec commandes, tableau de bord, Terraferme, cérémonie) et larges (1920×1080) ; raccourcis Commandes, Marché, Classement. (2) Invitation discrète à la 2e session, par l'orchestrateur de live-1 (jamais dans la même session que la demande de notification). Elle utilise beforeinstallprompt sur Android et le bureau, et une fiche illustrée en 2 étapes sur iOS. Si elle est refusée, elle ne revient pas avant 7 jours ; un second refus la ferme pour de bon. (3) L'e-mail de connexion contient, en plus du lien, un code à 6 chiffres à saisir dans l'application, adossé au même jeton : 5 tentatives au plus, valable 15 minutes, à usage unique. L'écran de connexion propose « J'ai reçu un code ». (4) Télémétrie : standalone dans session_start, 'install_prompt' {outcome}, 'installed'. La TWA Android, assetlinks et la fiche Play viennent après la bêta web (IDEAS.md).

**Plan.**
- apps/web/vite.config.ts : compléter manifest (id, categories, orientation, screenshots avec form_factor 'narrow' et 'wide', shortcuts avec icônes 96 px).
- apps/web/scripts/store-shots.cjs (versionné, à partir des scripts Playwright du scratchpad) : génère apps/web/public/store/*.webp ; documenté dans docs/deploiement.md.
- apps/web/src/main.tsx : capture de beforeinstallprompt et de appinstalled dans un petit module install.ts ; apps/web/src/game/InstallPrompt.tsx affiché par Invitations.tsx (live-1) ; i18n fr.install.{title,body,cta,later,iosSteps}.
- apps/web/src/game/api.ts : ajouter standalone (matchMedia('(display-mode: standalone)') ou navigator.standalone) aux props de session_start ; apps/server/src/game/routes.ts:377 l'enregistre ; ajout de 'install_prompt' et 'installed'.
- Code de connexion : apps/server/src/db/schema.ts, login_tokens gagne code_hash et attempts (migration `--name login_code`). apps/server/src/auth/tokens.ts et service.ts : génération du code (crypto.randomInt, hash SHA-256), vérification en temps constant, 5 essais maximum, puis invalidation du jeton ; même expiration et même usedAt que le lien. apps/server/src/mail/templates.ts : code bien lisible dans l'e-mail. Écran de connexion web : champ de 6 chiffres (inputmode numeric, autocomplete one-time-code).
- Tests serveur : le code connecte une seule fois ; 6e tentative refusée ; code expiré refusé ; le lien et le code s'excluent (le premier utilisé invalide l'autre).
- apps/server/src/game/admin.ts : J7 des joueurs installés face aux autres.
- IDEAS.md : TWA Bubblewrap, /.well-known/assetlinks.json, fiche Play, après la bêta web.

**Mesure.** Lighthouse : le jeu est « installable » et la fenêtre riche s'affiche dans Chrome Android. Taux installed/install_prompt. Sur iPhone, connexion réussie dans le PWA installé avec le code (vérifiée au playtest et par un test e2e). J7 des joueurs installés face aux autres dans /admin.

**Le chef.** Volet code exclu : ux-m2 en est le seul propriétaire, et un troisième code à 6 chiffres ne sera pas écrit. Le reste est approuvé : manifeste complet (id, captures étroites et larges, raccourcis), invitation à installer à la 2e session par l'orchestrateur de live-1, standalone dans session_start, install_prompt et installed. Les captures du store se génèrent par un script versionné. La TWA et la fiche Play vont dans IDEAS.md.

### 27. Ouvertures par jalons sur 3 jours, une seule feuille Discovery (`ftue-4` · effort M · impact fort)

*Experte premières minutes et onboarding*

**Problème.** Au jour 1, les Avis empilent la Gazette, l'Acte, les Premiers pas, les tâches avec la relance d'Influence, la compagnie, la Maîtrise et le Journal (c_notices.png). Le panneau Commandes affiche 25 lignes. Les systèmes C4 à C10 sont visibles sans préparation. unlocks.ts ne gère que rialto, ranking, terraferma et house. Un calendrier de 7 jours serait trop lent pour une compétition mensuelle, et il ignorerait ce que le joueur a déjà appris.

**Proposition.** Chaque système s'ouvre au premier des deux jalons atteint : une action faite ou un délai écoulé, et tout est ouvert au plus tard 72 h après l'arrivée. Exemples : les tâches du jour et les contrats du Doge à la fin du guide ou après 12 h. Les offres « À mon prix » et un 2e véhicule à 3 ventes au Rialto ou après 24 h. Les appels d'offres et le fournisseur officiel à 3 livraisons ou après 36 h. La compagnie, les entrepôts, la colleganza et les prêts à 10 livraisons ou après 60 h. La Maîtrise à 72 h. Chaque ouverture affiche une seule fois la feuille « Nouveau : … » (2 phrases, un bouton qui y mène). « Je connais le jeu » dans le Profil ouvre tout, comme le fait d'avoir déjà fini une saison. Les gardes sont purement visuelles.

**Plan.**
- Pré-requis : livré après ux-2, qui fixe la navigation (portes et feuilles).
- Engine : settings.ts, onboarding: z.object({ unlocks: z.record(z.object({ afterHours: qty, event: z.string().optional(), count: qty.default(0) })), lateCompressAfterDay: qty, lateFactorBps: bps }).default(...) avec un défaut vide (tout ouvert). Les gardes ne sont jamais lues par une commande ni par la tick : le serveur n'en dépend pas. Thème venice1450.settings.ts : jalons ci-dessus, afterHours ≤ 72.
- Serveur : la vue catalogue transmet settings.onboarding. La vue joueur transmet les compteurs d'événements utiles (comptage déjà disponible pour les missions) et seasonsFinished (au moins une saison close dans Palmarès).
- Web : apps/web/src/game/unlocks.ts. Unlocks devient Record<SystemId, boolean> calculé par unlockedAt(def, counts, ageMs, flags). C'est ouvert si : guideOff, ou « Je connais le jeu » (clé store knowGame), ou seasonsFinished > 0, ou count atteint, ou ageMs ≥ afterHours scaled. Pour un joueur arrivé après lateCompressAfterDay, afterHours est multiplié par lateFactorBps (par exemple 5 000, soit 72 h → 36 h). Les clés existantes rialto, ranking, terraferma et house restent avec la même sémantique.
- Web : gardes visuelles dans Daily.tsx, Deals.tsx, Tenders.tsx, Warehouse.tsx, Suppliers.tsx, Bank.tsx (prêts), Mastery.tsx, Company.tsx, et dans le filtre du panneau Commandes (contrats du Doge), sur le modèle des gardes rialto et ranking existantes.
- Web : un seul composant Discovery.tsx (feuille illustrée, titre, 2 phrases, bouton « Voir ») déclenché une fois par système (clé store discovered:<id>). File d'attente : au plus une feuille par retour de session. Textes fr.game.discovery[id].
- Profil.tsx : interrupteur « Je connais le jeu ».
- Tests apps/web/test/unlocks.test.ts : ouverture par action, ouverture par délai, au plus tard 72 h, compression pour un retardataire, knowGame, seasonsFinished, réglages vides = tout ouvert.
- Sim : pnpm sim pour confirmer que les bots sont indifférents (les gardes ne sont pas dans l'engine). Une ligne dans docs/calibration.md.

**Mesure.** Tests unlocks. /admin : part des joueurs qui utilisent chaque système dans les 48 h suivant son ouverture (order_placed limit, tender_bid, commission, loan…). Rétention J1 à J3 de la cohorte. Nombre de blocs visibles dans les Avis au jour 1 : au plus 3, vérifié par l'e2e de ftue-m1.

**Le chef.** Le premier jour est saturé (c_notices.png). Des ouvertures au premier jalon atteint, une action ou un délai, avec un plafond de 72 h, une compression pour les retardataires, « Je connais le jeu » et des gardes purement visuelles absentes de l'engine : c'est la bonne mesure pour un mois de compétition. Elle vient après ux-2, une seule feuille Discovery par session. Réglages vides : tout est ouvert. Condition : une notification de loop-1 sur un système encore fermé ouvre ce système (ouverture par l'événement), pour éviter un avis qui pointe vers un écran invisible.

### 28. Agenda du comptoir : « Prochain : … », et « À tout à l'heure » après une relance générale (`loop-6` · effort S · impact moyen)

*Expert boucle de commerce et sensation de progression*

**Problème.** Rien dans le HUD ne dit quand revenir : prochaine récolte, retour des charrettes, fermeture d'un appel d'offres, fin de la commande de compagnie. Un jeu de sessions courtes vit de ce « reviens à telle heure ».

**Proposition.** agenda() est une fonction pure du moteur qui liste les prochains points (récoltes, retours de charrettes, closesAt et dueAt des appels d'offres, expiresAt des projets, Criée), en tenant compte de la nuit : un point qui tombe entre 22 h et 8 h est marqué « au réveil » et reporté à 8 h. Une pastille de texte discrète sous les compteurs affiche « Prochain : récolte dans 42 min ». Elle est masquée quand le prochain point est à plus de 3 h, et ce n'est pas un nouveau compteur (P0-3). Après une relance générale (collectAndRestart), une carte « À tout à l'heure : à 14 h 20, 3 récoltes et 2 charrettes » s'affiche. Pas de route /remind ni de push ponctuel : les notifications passent toutes par live-1.

**Plan.**
- Tests d'abord, dans packages/engine/test/agenda.test.ts sur la fixture. Cas couverts : tri par date ; regroupement des récoltes de la même minute ; horizon respecté ; un retour de charrette à 23 h est marqué au réveil et daté de 8 h ; rien pour les bâtiments d'un autre joueur ; liste vide si tout est oisif.
- packages/engine/src/agenda.ts (nouveau, pur) : agenda(ctx, state, playerId, now, horizonMs) renvoie une liste de { at, kind, ref, count }, avec la nuit lue via hourIn et hourWithin (clock.ts). Exporté dans index.ts.
- apps/server/src/game/view.ts : view.agenda contient les 12 prochains points sur 24 h.
- apps/web/src/game/map/Hud.tsx : la pastille « Prochain », rendue seulement si agenda[0].at − now ≤ 3 h.
- apps/web/src/game/Comptoir.tsx WorkshopsSummary : après collectAndRestart, la carte « À tout à l'heure », calculée à partir de view.agenda et refermable d'une touche.
- apps/web/src/i18n.ts : fr.game.agenda (kinds, next, atWake, seeYou).
- Aucun appel au notifier : live-1 reste le seul canal de push.

**Mesure.** Tests du moteur. Télémétrie /admin : part des retours dans les 15 min autour d'un point de l'agenda ; part d'ateliers oisifs plus d'une heure (objectif −30 %).

**Le chef.** Périmètre réduit. agenda() pur, testé, qui reporte à 8 h ce qui tombe la nuit, et la carte « À tout à l'heure » après collectAndRestart : approuvés, c'est le « reviens à telle heure » qui manquait. La pastille « Prochain » dans le HUD n'est livrée que si l'e2e de ux-m1 passe avec elle en 320×568 à côté de la bande Lorenzo. Sinon, elle va dans IDEAS.md. Aucun push : live-1 reste le seul canal.

### 29. Partager pour recruter. Phase 1 : aperçus de lien, ?ref= dans chaque partage, carte de podium méritée (`live-3` · effort S · impact fort)

*Expert rétention, live-ops et monétisation éthique*

**Problème.** apps/web/index.html n'a aucune balise og ni twitter : un lien collé dans Discord ou WhatsApp s'affiche sans image ni description. La chronique (chronicle.ts) se partage par navigator.share({ files, text }) sans aucune URL, et l'image ne porte pas d'adresse. La télémétrie ne garde aucune source d'inscription. Un partage ne peut donc ramener personne.

**Proposition.** Phase 1, maintenant. (1) Les balises og et twitter (summary_large_image) de index.html pointent vers /og.png (1200×630, le lion de l'écran de connexion), avec « Bâtissez une maison de commerce en un mois, sur un marché tenu par les joueurs ». (2) Chaque partage porte https://<domaine>/?ref=<code>, dans le texte et sur l'image, sous le pied de page. (3) La source d'arrivée (ref, utm_*) est gardée en sessionStorage, avec try/catch, jusqu'à l'inscription, puis enregistrée sur le compte. (4) La carte du podium de la semaine ne se partage que si le joueur est dans le top 25 % de la semaine ou a gagné un titre (Doge, Procurateur, Sénateur). Phase 2, seulement après live-5 : récompenses de parrainage cosmétiques (pièce de blason), 5 filleuls récompensés au plus, avec des conditions d'activité réelle (3 jours distincts, 5 livraisons). Elle est notée dans IDEAS.md d'ici là.

**Plan.**
- apps/web/index.html : og:title, og:description, og:image (URL absolue), og:url, og:type, twitter:card ; apps/web/public/og.png 1200×630.
- apps/server/src/db/schema.ts : accounts.refCode (unique, généré à l'inscription), accounts.signupSource jsonb {ref, utm_source, utm_medium, utm_campaign} ; migration `db:generate --name signup_source`.
- apps/web/src/main.tsx : lecture de ?ref et des utm_* à l'arrivée, écriture dans sessionStorage dans un try/catch (un stockage indisponible ne casse rien), envoi à l'inscription ; apps/server/src/account.ts valide le format (ref connu sinon ignoré) et enregistre la télémétrie 'signup' {source, ref}.
- apps/web/src/game/chronicle.ts : paramètre url ajouté au texte et au pied d'image ; weeklyCardImage() réutilise le gabarit ; i18n fr.game.chronicle.footerUrl et fr.game.week.share.
- apps/web/src/game/Top.tsx (onglet Semaine) et Ceremony.tsx : bouton Partager, visible seulement si rank ≤ ceil(participants/4) ou si award n'est pas nul ; télémétrie 'share' {kind}.
- apps/server/src/game/admin.ts : inscriptions et J1/J7 par source.
- Test serveur : un ref inconnu est ignoré ; signupSource est enregistré une seule fois.
- IDEAS.md : phase 2, parrainage cosmétique, après live-5.

**Mesure.** Les aperçus s'affichent correctement dans les outils de débogage de Facebook et Twitter et dans Discord. Partages par joueur actif et par semaine (télémétrie share), part des inscriptions avec un ref, J7 par source dans /admin.

**Le chef.** Un lien collé sans aperçu ne recrute personne : les balises og, l'image versionnée et ?ref= dans chaque partage sont le minimum d'un lancement. Sans aucune récompense, c'est de l'attribution pure. La source se rattache à la création du compte invité (ftue-3), sans attendre l'e-mail. La phase 2 (parrainage) va dans IDEAS.md. La politique de confidentialité (Legal.tsx) doit mentionner signupSource.

### 30. Budget de performance sur un Android d'entrée de gamme et protocole de playtest à 5–8 nouveaux joueurs (`ux-m4` · effort M · impact fort)

*Directrice UX/UI mobile et direction artistique*

**Problème.** Seuls des scripts locaux existent (scratchpad/perf.cjs : CPU ×4, longtasks, nœuds DOM), hors CI, sans seuil ni budget du bundle. Rien ne garantit 60 images par seconde sur la carte Terraferme (des centaines de path SVG), ni un premier « Produire » rapide en 4G. Aucun playtest de vrais nouveaux joueurs sur mobile n'a été mené après ces refontes, alors que la publication en dépend.

**Proposition.** Un budget chiffré, vérifié en CI. Bundle initial JS de 250 ko au plus en gzip (la Terraferme et l'Aide chargées à la demande). Premier « Produire » en moins de 5 s en 4G simulée (Fast 4G, CPU ×4). Sur la carte Terraferme, en CPU ×4, aucune longtask de plus de 50 ms pendant un déplacement de 2 s et au moins 55 i/s mesurées. Une passe manuelle sur un vrai Android d'entrée de gamme (type Galaxy A05) confirme les chiffres. Ensuite, un protocole de playtest écrit, à lancer une fois ftue-1, ftue-3, ux-1 et ftue-6 livrés : 5 à 8 nouveaux joueurs sur leur téléphone, écran enregistré, sans aide, sur 15 minutes. Critères : premier Produire en 60 s, première paie en 5 min, « quoi livrer » trouvé en 10 s.

**Plan.**
- apps/web/vite.config.ts : manualChunks ou import() dynamique pour TerraLayer, CampaignLayer, Help et Palmares. Nouveau script apps/web/scripts/bundle-budget.mjs qui lit dist/assets, calcule la taille gzip du chunk d'entrée et de ses dépendances préchargées, et échoue au-delà de 250 ko.
- Nouveau apps/web/e2e/perf.mjs, repris de perf.cjs, avec CDP Network.emulateNetworkConditions (Fast 4G) et Emulation.setCPUThrottlingRate 4. Il mesure le temps entre goto et le clic possible sur [data-coach=produce], puis, sur la Terraferme, les longtasks et les i/s par requestAnimationFrame pendant un déplacement scripté. Seuils dans e2e/budget.json.
- ci.yml : ajouter bundle-budget au job build, et perf.mjs au job e2e (ux-m1), en mode avertissement pendant une semaine puis bloquant.
- Si le budget de la carte échoue : TerraLayer.tsx regroupe les hexagones statiques dans un seul path mémorisé, met les pions en couche séparée et coupe les filtres (drop-shadow) pendant le déplacement. Les gains se mesurent avec perf.mjs.
- Protocole : docs/playtest.md (recrutement, consigne unique « découvrez le jeu », enregistrement de l'écran, grille horodatée des trois critères, questions de fin dont celles de ux-5 et ux-m3). Les résultats sont consignés dans docs/playtest-<date>.md.
- Télémétrie : événements 'first_produce' et 'first_paid' horodatés depuis 'app_open' (admin.ts) pour suivre les mêmes critères en production.

**Mesure.** bundle-budget et perf.mjs au vert en CI. Rapport sur un appareil réel : au moins 55 i/s sur la carte et premier Produire en moins de 5 s en 4G. Playtest : au moins 6 joueurs sur 8 atteignent chacun des trois critères. Sinon, les écarts deviennent des correctifs prioritaires avant publication.

**Le chef.** Un jeu mobile d'abord doit tenir sur un Android d'entrée de gamme, et je veux des chiffres : un bundle initial de 250 ko gzip au plus, un premier Produire en moins de 5 s en 4G simulée, 55 i/s sur la carte Terraferme. Les seuils CI se calculent sur la médiane de 5 passes, en avertissement d'abord, puis bloquants. Un vrai appareil tranche avant la publication. Le protocole de playtest appartient à ftue-m1 : ux-m4 n'écrit pas de second docs/playtest.md.

### 31. Porte de publication : e2e de la première session en CI, puis playtest sur mobile (`ftue-m1` · effort M · impact critique)

*Experte premières minutes et onboarding*

**Problème.** apps/web/e2e/tutorial.mjs existe (playwright-core 1.48.2), mais il ne tourne pas en CI. Il ne teste ni les formats 390×844 et 320×568, ni les chevauchements (t_terra.png : le rival est écrit par-dessus la trêve), ni le débordement horizontal, ni les durées. Aucun playtest n'a mesuré les trois critères du chef : premier « Produire » en 60 s, première paie en 5 min, « quoi livrer » trouvé en 10 s.

**Proposition.** Un test e2e en CI rejoue la première session complète, de l'invité au Livre de compte encaissé, en 390×844 et 320×568. Il échoue au premier chevauchement entre éléments du HUD, au premier débordement horizontal et à toute clé i18n affichée brute. Il enregistre les durées de chaque pas et échoue si le guide dépasse 10 min. Ensuite, playtest protocolé avec 5 à 8 vrais nouveaux joueurs sur mobile, écran enregistré et sans aide, sur les 15 premières minutes.

**Plan.**
- Serveur : en mode test uniquement, un réglage de monde à fastBatchSeconds court et la fixture e2e. Pas de raccourci côté production.
- apps/web/e2e/first-session.mjs (à partir de tutorial.mjs) : POST /api/auth/guest, choix du métier, puis les 7 pas du coach en suivant les data-coach, rattachement d'e-mail avec le code lu dans le mailer de test, encaissement de first_upgrade. Le tout avec deux viewports (390×844, 320×568) et isMobile/hasTouch.
- Contrôles à chaque pas : document.scrollingElement.scrollWidth ≤ innerWidth. Aucune paire d'éléments [data-hud] visibles dont les rectangles se recoupent (helper overlap(), marquer les éléments du HUD avec data-hud). Aucun texte qui ressemble à une clé (fr.game.*) ni « undefined » ou « NaN ». Au plus 3 blocs dans la feuille des Avis au jour 1 (après ftue-4). Le libellé Jour n sur N est cohérent avec les jours restants (ftue-6).
- Chronométrage : temps écoulé à chaque pas écrit dans e2e/out/timings.json. Échec si le premier produce dépasse 60 s ou si le guide complet dépasse 10 min.
- CI : job e2e dans le workflow existant (pnpm --filter web e2e après build et migration PGlite), avec captures d'écran archivées en cas d'échec.
- Playtest (après ftue-1, ftue-3, ux-1 et ftue-6) : protocole écrit dans docs/playtest.md (recrutement de joueurs qui n'ont jamais vu le jeu, sur leur téléphone, enregistrement de l'écran, consigne unique « jouez 15 min », aucune aide). Grille : premier Produire ≤ 60 s, première paie ≤ 5 min, « quoi livrer » trouvé ≤ 10 s, points de blocage horodatés. Résultats et correctifs consignés dans le même fichier.
- Télémétrie : les horodatages par pas de l'entonnoir /admin (ftue-1 et ftue-3) servent de comparaison entre playtest et production.

**Mesure.** Job CI vert sur les deux formats, timings.json sous les seuils. Playtest : au moins 6 joueurs sur 8 respectent chacun des trois critères. Sinon, les correctifs repassent par la même grille avant publication.

**Le chef.** C'est la porte de publication. Elle se branche sur l'infrastructure de ux-m1, sans second script ni second job : elle ajoute timings.json, le seuil de 60 s pour le premier produce et de 10 min pour le guide, au plus 3 blocs dans les Avis au jour 1 et l'absence de clé i18n brute, de undefined ou de NaN. Elle est seule propriétaire de docs/playtest.md. Le critère de publication est au moins 6 joueurs sur 8 pour chacun des trois seuils, plus « rival humain ou PNJ ? » bien répondu par tous. Sinon, on corrige puis on repasse la même grille.

## À revoir

- **Arriver en cours de mois : classement des Recrues, maisons PNJ identifiables, fin de mois annoncée** (`live-4`) — La partie badge est un doublon : elle passe dans ux-m3. L'onglet « Recrues » est un nouveau classement avec un titre, qui ne figure pas dans recommandations-2026-10-20.md : le CLAUDE.md le renvoie dans IDEAS.md sans arbitrage écrit du porteur. Il repose en plus sur « un compte par e-mail vérifié », que les invités de ftue-3 affaiblissent. Seule l'annonce de fin de saison est utile et sans risque. Exigence : Réduire à : (1) le message de Lorenzo pour une arrivée dans les 7 derniers jours, qui dit ce qui repart à zéro (ducats) et ce qui suit le joueur (niveau, Renommée, Influence), daté avec seasonDays de ftue-6 (une seule source) ; (2) le compte à rebours à partir de J-3, dans le Profil et sous la grille du HUD, validé par l'e2e de ux-m1 en 320×568 ; (3) la ligne dans seasonNotes. Retirer le badge PNJ (ux-m3). Mettre l'onglet Recrues dans IDEAS.md avec une note d'arbitrage pour le porteur. Ne rien coder de rookies.ts sans sa réponse écrite.

## Rejetées

- **Le conseiller apprend « livrer » et « marché à livrer », dans un ordre de priorité testé** (`loop-2`) — Doublon intégral du volet moteur de ux-1, dont l'ordre de priorité contredisait le sien (livraison avant production contre production avant livraison). L'ordre retenu est celui que j'impose dans ux-1. Une seule extension de NextAction, une seule table ADVICE_ORDER.
- **Fondu dans ux-1 : couverture, échéance et trajet de chaque commande, calculés par le moteur** (`loop-4`) — Doublon de orderInsight (ux-1). On ne crée pas deux fonctions pures pour la même ligne (orderCoverage et orderInsight). Les champs utiles (have, need, minutes d'aller, échéance) entrent dans orderInsight. La télémétrie du rang de la commande choisie est reprise dans ux-1 (drawer_load).
- **PNJ et humains distingués partout où un rival apparaît** (`terra-m2`) — C'est le quatrième badge PNJ proposé, et son diagnostic est inexact : weekly.ts:183 renvoie déjà bot pour le rival, le défaut est côté client. Les apports serveur (isBotAccount unique, bot dans la vue terra et dans les noms d'escarmouche, « PNJ » dans les textes de notification) sont repris par ux-m3, seul propriétaire.
- **Blason de la Maison : 6 pièces au lancement, sur des emplacements génériques, visibles partout** (`live-5`) — C'est un nouveau système (emplacements de blason, accounts.heraldry, route d'équipement, 6 pièces SVG) absent du lot du 20 octobre, et il ne bloque pas le lancement : le paiement du Pass reste débranché, il n'a donc pas besoin de cosmétiques maintenant. Le CLAUDE.md impose IDEAS.md sans arbitrage écrit. À rouvrir après le lancement avec cet arbitrage, et le test de neutralité économique qu'elle propose sera alors exigé.
