# Plan de rupture : mise en place de l'audit du 27 octobre 2026

**À lire avant toute reprise.** Ce document est la source de vérité du chantier qui met en place `docs/audit-retention-2026-10-27.md` (propositions R1 à R12). Il est tenu à jour **à chaque commit**, pour qu'un autre compte Claude (ou le porteur) reprenne exactement là où le travail s'est arrêté.

## Décisions du porteur (27 octobre 2026)

- Les douze propositions de l'audit sont validées, toutes.
- On avance **vague par vague** : chaque vague est jouable seule, testée, calibrée et poussée avant la suivante.
- **Tout est documenté ici**, pour qu'un autre compte reprenne le travail, et inversement.
- **Claude écrit la Lettre du jour** (R10). Le porteur relit le texte quand il veut.
- **Les plafonds d'écart en cours de saison sont levés** : l'égalité se garde au départ du mois (1 000 ducats pour tous), pas pendant. Le Podestà, le Doge et les parts de Maison donnent un vrai avantage.
- Ce qui reste intangible : rien de puissant vendu contre de l'argent réel ; les nouveaux venus protégés 3 jours ; le jeu dort de 22 h à 8 h ; montants en entiers ; grand livre et journal des stocks ; logique dans `packages/engine` ; réglages dans `worlds.settings` ; règles annoncées avant le 1er du mois dès qu'il y a des joueurs.
- Le gel des mécaniques est levé pour ce lot (CLAUDE.md).

## Façon de travailler sur ce chantier

- Branche : `claude/rupture` (partie de `claude/audit-retention`). On pousse après chaque commit.
- Un commit par fonctionnalité, message en français comme l'historique.
- Chaque vague commence par un passage en mode plan (CLAUDE.md), appuyé sur ce document.
- Tests du moteur d'abord, sur la fixture figée `packages/engine/test/fixture.ts`.
- Vérifications avant chaque commit : `pnpm test`, `pnpm typecheck`, `pnpm lint`. En fin de vague : `pnpm sim` (5 graines), la simulation de la Terraferme, le test de mise en page (`docs/e2e.md`), et `docs/calibration.md` mis à jour.
- Les écrans suivent la direction Lagune (`docs/design.md`).

## État

| # | Proposition | Vague | État | Commit |
| --- | --- | --- | --- | --- |
| R1 | La guerre mange les marchandises | 1 | fait | `98c70c7`…`5fbc6b6` |
| R2 | La Signoria des villes | 1 | fait | `9d46868`…`d03784d` |
| R12 | Le grand ménage (part de la vague 1 : fournisseurs officiels, embargo) | 1 | fait | `acfc181` |
| R6 | Le Lustre (échelle de rang, fantômes) | 2 | fait | `ef52658`… |
| R11 | La Sera (20 h, incanto des galères) | 2 | fait | `572ffc3`… |
| R3 | Les Atouts | 3 | fait | `b7597e4`… (branche `claude/rupture-v3`) |
| R10 | La Lettre du jour | 3 | fait | `7b3c7d5`… (branche `claude/rupture-v3`) |
| R4 | La Dynastie | 4 | fait (calibration en fin de vague) | branche `claude/rupture-v4` |
| R5 | Le Grand Canal | 4 | à faire | branche `claude/rupture-v4` |
| R7 | Le Doge | 4 | en cours (moteur et serveur faits) | branche `claude/rupture-v4` |
| R8 | Le Broglio | 5 | à faire | — |
| R9 | Les parts de Maison | 5 | à faire | — |

## Où j'en suis

- **Fait (vague 1)** : R1 et R2 dans le moteur, chez les PNJ, au simulateur, sur le serveur (vue, route `GET /api/game/signoria`, notifications nommées) et à l'écran (jauge autour de la ville, feuille « Signoria », blason du Podestà sur la carte, pain des troupes au HUD, coûts de la guerre dans « Vos terres ») ; ménage (fournisseurs et embargo retirés à Venise) ; notes de saison ; CADRAGE et plan-terraferme à jour.
- **Vague 1 terminée** (28 octobre 2026). Le porteur a choisi de passer à la vague 2 plutôt que de forcer le pain et la croissance (« fais l'option qui te semble la mieux »).
- **Vague 2 en cours** (plan validé le 28 octobre, détail plus bas, « Vague 2 : le plan validé »). Ordre : Lustre moteur → Lustre serveur → Lustre écrans → incanto moteur (+ bataille à la minute) → incanto PNJ, simulateur, ménage → Sera serveur et écrans → calibration et docs.
- **Calibration faite** : deux essais (0,1 et 0,2 pain par troupe), 5 graines conformes chacun ; 0,1 retenu (`docs/calibration.md`, « Vague 1 »). Restent sous leur cible : la croissance du mois (1,12 à 1,18 pour 1,20) et le pain en fin de mois (56 à 60 % pour 65 %).
- **Vague 2 terminée** (28 octobre 2026) : calibration faite, incanto à 30 % de chaque arrivée, PNJ qui enchérissent avec 1,5 fois leur maximum en caisse (`docs/calibration.md`, « Vague 2 »). Restent sous leur cible, comme après la vague 1 : la croissance du mois (1,16 à 1,20 pour 1,20) et le pain (55 à 59 % pour 65 %), à mesurer avec de vrais joueurs.
- **Vagues 1 et 2 fusionnées** dans la branche par défaut (PR #51, 28 octobre 2026).
- **Vague 3 terminée** (28 octobre 2026) sur `claude/rupture-v3` : Atouts et Lettre du jour faits, calibrés (`docs/calibration.md`, « Vague 3 »), notes de saison et CADRAGE à jour. Les deux « moments » (l'Atout du lundi, la Lettre du matin) s'ouvrent d'eux-mêmes une fois, puis vivent sous la cloche (une ligne chacun, comptés dans le badge) : un rond de plus dans le HUD débordait à 320 px. À fusionner par une PR vers la branche par défaut quand la CI passe.
- **Vague 4 en cours** (plan validé le 28 octobre, détail plus bas, « Vague 4 : le plan validé » ; branche `claude/rupture-v4`, partie de `claude/rupture-v3` ; la vague 3 est fusionnée dans la branche par défaut, PR #52).
- **Étape suivante exacte** : les écrans du Doge — feuille « Le Sénat » (`apps/web/src/game/Doge.tsx`, `props.sheet === "senate"`, déjà la cible des pushes `doge`) sur `GET /api/game/election` : candidats en médaillons (`Portrait`), programme en mots (mutateur `fr.game.mutators.codes`, décret à écrire dans `game.doge.decrees`), voix en jauge, un seul bouton or « Voter pour … » (`POST /api/game/election/vote {candidate, boost}`, boost en pastilles 0 à `maxBoost`, coût `influencePerVoice`), et pour un candidat « Annoncer mon programme » (action `standForDoge {mutator, decree}`) ; une ligne sous la cloche pendant l'élection (comme `LetterLine`) ; le Doge du mois, son mutateur et son décret dans l'Aide (notes de saison) et à la connexion (avec le Grand Canal) ; e2e « senat ».
- **À savoir** :
  - La Signoria compte les livraisons parties entre 8 h et 22 h (Paris) ; le Podestà est nommé par `closeSignoriaDays` dans le tick, au changement de jour (minuit).
  - L'e2e de mise en page passe sur chaque format lancé seul (`SIZES=390x844`, `SIZES=320x568`) ; lancé sur les deux formats d'affilée, le second a échoué deux fois dans le guide, à une étape différente chaque fois (une charrette sur Venise, l'achat de briques), puis la machine a été redémarrée : à surveiller. Chromium : `CHROMIUM=/opt/pw-browsers/chromium`.
  - Mesures partielles de R1 seul (3 graines, avant la Signoria) : semaine III / semaine I = 1,14 à 1,17 (contre 0,97 à 1,08 avant) ; pain en fin de mois 56 à 60 % de la référence (cible ≥ 65 %, avertissement) ; la Terraferme mange 5,3 à 5,6 pains par actif et par jour, plus 2,7 à 3,3 pains et 2,5 à 2,7 briques pour « Max » et les forts.
- **Base :** 819 tests verts au départ (27 octobre 2026).

## Vague 1 : un seul jeu (R1, R2, et le ménage associé)

### R1 : la guerre mange les marchandises

But : la Terraferme devient le grand puits de marchandises. Le revenu des producteurs ne plafonne plus au jour 5, un pacifique s'enrichit en fournissant les belligérants.

- **Réglages** `terraferma.supply` (schéma dans `packages/engine/src/settings.ts`, valeurs de Venise dans `venice1450.settings.ts`) :
  - `breadPerTroopDay` : pain mangé par troupe et par jour ouvert, en 1/10 000 d'unité ;
  - `raiseBread` : pain demandé en plus des ducats par « + Troupes » ;
  - `buildingMaterials` : matériaux par bâtiment (rocca : briques ; mura : planches ; bombarda : bois et planches ; porto : planches).
- **État pur** (`terraferma.ts`) : `TerraPlayer.breadOwed` (accumulé à chaque pas ouvert, sur le modèle de `harvest`) et `TerraPlayer.unfed` (vrai tant que le pain manque : `recruitPerHour` rend 0).
- **Pont** (`terraWorld.ts`) : `serveTerraRations(tx, map)` dans `advanceTerraWorld`, à côté de `payHarvests` : retire le pain dû par `removeStock` (motif `terraferma_rations`), pose ou lève `unfed`.
- **Bâtiments et « + Troupes »** (`applyTerra`) : les matériaux et le pain sont retirés par `removeStock` (motif `terraferma`), en plus des ducats.
- **PNJ** (`bots.ts`) : une maison qui joue la Terraferme achète le pain qui lui manque.
- **Tests** : `packages/engine/test/terraferma-supply.test.ts`.

### R2 : la Signoria des villes

But : une ville se prend en y livrant ou en la tenant sur la Terraferme, sur la même jauge. Le lien entre les deux modes devient évident, chaque livraison a un enjeu, et un rival a un nom.

- **Module** `packages/engine/src/signoria.ts`, sur la forme de `suppliers.ts`.
- **État** : `state.signoria = { points: { [city]: { [player]: number } }, podesta: { [city]: { playerId, since } }, day }`.
- **Points** :
  - par le commerce : `arrive()` dans `deliveries.ts` appelle `signoriaArrived`, en proportion des ducats payés ;
  - par les armes : chaque case de ville tenue (`map.cityCode`) en rapporte à chaque pas ouvert (`advanceTerraWorld`) ;
  - rien de 22 h à 8 h.
- **Le Podestà** : à chaque clôture de jour, les points baissent (`decayBps`), le premier au-dessus de `minPoints` devient Podestà. Jamais un PNJ, 3 villes au plus par maison (`maxCities`). Événements `podesta_named`, `podesta_lost`, `signoria_overtaken`.
- **Effets** : droit de porte `tollBps` sur les livraisons des autres vers sa ville (transfert de caisse à caisse, motif `signoria_toll`, compté dans ses ventes nettes ; nouveaux venus exemptés `newcomerDays`) ; il voit les commandes de la ville `previewMinutes` avant les autres.
- **Tests** : `packages/engine/test/signoria.test.ts`.

### Le ménage de la vague 1

- Les fournisseurs officiels sont retirés de Venise (le code reste pour les anciens mondes).
- L'embargo diplomatique de la Terraferme est retiré : le droit de porte le remplace.
- Les fondaci restent : leurs livraisons nourrissent la jauge.

### Serveur et écrans

- Vue : la Signoria par ville (trois premiers, sa part, le Podestà) ; pour la Terraferme, le pain dû, `unfed`, les coûts en matériaux.
- Notifications : « Morosini vous a repris Padoue », « Vous êtes Podestà de Vicence », « Vos troupes ont faim » (sous le plafond de 3 par jour).
- Web : jauge dans la ville en orbite (`Signoria.tsx` remplace `Suppliers.tsx`) ; anneau et blason du Podestà sur la carte (`map/Markers.tsx`) ; pain dans le HUD de la Terraferme ; coûts en matériaux des bâtiments ; textes dans `i18n.ts` et `i18n.en.ts` ; une note de saison.

### Mesures de sortie

- Revenu de la semaine III divisé par celui de la semaine I ≥ 1,20 (cible manquée par les fondaci : 0,97 à 1,08).
- Au simulateur, chaque ville change de Podestà au moins une fois par semaine.
- Masse monétaire ≤ 2,5 fois le capital ; cours du pain en fin de mois ≥ 65 % de la référence.

## Vague 2 : le plan validé (28 octobre 2026)

**Le Lustre (R6).** `accounts.lustre` (0 au départ) ; paliers Popolano 0, Cittadino 100, Mercante 250, Patrizio 450, Senatore 700, Procuratore 1 000 (`settings.lustre`). Chaque semaine (bornes du classement), une Sfida contre un humain de Lustre voisin, sur le gain de ventes nettes de la semaine : +30 au gagnant, −20 au perdant, plancher 0, égalité 0. Sans adversaire : le fantôme d'un humain (sa courbe horaire d'une semaine passée, Lustre le plus proche, seul le joueur bouge) ; sans courbe humaine (lancement), une maison PNJ du monde en direct, marquée « PNJ ». Défi direct pour la semaine suivante, mise 10 à 50, accepté par l'autre. Changement de mois : deux paliers plus bas. Aucun effet économique.
- Moteur pur : `packages/engine/src/lustre.ts` (`tierOf`, `pairByLustre`, `sfidaDelta`, `applyLustre`, `softReset`, `ghostAt`), tests `test/lustre.test.ts`. Fait.
- Serveur : migration (`accounts.lustre`, tables `sfide` et `week_curves`), `apps/server/src/game/lustre.ts` (`recordCurves` chaque heure depuis le tick, `ensureSfide` à chaque tick, `settleSfide` sur `week_closed` comme `recordWeek`, `softResetLustre` à la clôture de saison) ; la Sfida remplace le rival de la semaine (`weeklyRival`, même forme pour le HUD) ; routes `GET /api/game/sfida`, `POST /api/game/sfida/challenge`, `POST /api/game/sfida/accept` ; avis `sfida`.
- Écrans : le palier à la place de « NIV. n » dans l'identité du HUD ; la ligne du rival ouvre la feuille « Sfida » (blasons ou fantôme, deux courbes, écart, échelle) ; « Défier » au classement.

**La Sera (R11).** Chaque jour de 20 h à 20 h 30 (`settings.sera`). L'incanto : chaque arrivée de la Muda met aux enchères 50 % de son lot en 3 lots, à la Sera du jour d'arrivée, fermant à 20 h 10, 20 h 20, 20 h 30 (prolongés de 2 min par une enchère des 2 dernières minutes) ; enchères à maximum (prix = deuxième maximum + 5 %, départ 60 % de la référence), ducats bloqués sur `hold:`, rendus quand on est dépassé ; le gagnant reçoit les marchandises (`addStock`, motif `incanto`), le prix est détruit ; un lot par marchand et par Sera. Le reste du lot au quai, sans hausse de prix (`muda.priceRiseBps` 0). L'heure de bataille à 20 h – 20 h 30 (minute ajoutée à `terraferma.battle`). Appels d'offres retirés à Venise.
- Moteur : `packages/engine/src/incanto.ts` (état `state.incanto`, commande `incantoBid`, ouverture et clôture par le tick), tests `test/incanto.test.ts` ; PNJ qui enchérissent ; rapport du simulateur.
- Serveur et écrans : l'incanto dans la vue ; avis `sera` à 19 h 55 et « enchère dépassée » ; bandeau « La Sera · 20 h » de 19 h 30 à 20 h 30, feuille « La Sera » (3 lots, prix, décompte, maximum, « Enchérir » en or, résultats du jour : Podestà changés, écart de la Sfida).

## Vague 3 : le plan validé (28 octobre 2026)

**Les Atouts (R3).** Chaque lundi, 3 Atouts tirés de la réserve du joueur (`atoutOffer`, secret du monde, mêmes toute la semaine, sans ceux déjà pris) ; il en prend 1 pour la saison (`chooseAtout`). Chacun donne et retire (effets signés, `settings.atouts.catalog`), additionnés à la maîtrise dans `specialtyEffects` (bornés à l'usage : au moins 1 véhicule, 1 offre, quota jamais négatif). Effets nouveaux : `rawYieldBps` (production brute), `cityPayBps` (paiement à l'arrivée), `signoriaBps` (points de Signoria). Réserve : 12 de départ, 4 débloqués au compte par un exploit (Podestà → `amico_podesta`, lot gagné à l'incanto → `armatore`, Signore → `condottiere`, rang Mercante → `procuratore`), passés au monde par `join.atoutPool` et `unlockAtout`. Les maîtrises restent pour cette vague (les fondre : plus tard).
- Fait : moteur (`atouts.ts`), tests `test/atouts.test.ts`, catalogue de Venise, PNJ (l'Atout de l'offre qui va à leur profil), rapport du simulateur (« Atouts : le plus pris ») ; serveur (`account_atouts`, déblocages, vue, gazette du lundi) ; écran `Atouts.tsx` (moment, puis ligne sous la cloche).
- À suivre : la diversité des choix (les PNJ prennent trop le Levantin, biais de leurs goûts) se mesurera avec de vrais joueurs.

**La Lettre du jour (R10).** Une lettre par jour de la saison, d'un personnage récurrent, deux choix, des drapeaux et des suites différées ; 31 lettres, écrites par Claude (FR et EN) ; gains petits et plafonnés (`letters.maxDucatsPerSeason`). Script mécanique dans `themes/venice1450.letters.ts` (inclus dans `settings.letters`), textes dans `i18n.ts` / `i18n.en.ts` sous `game.letters`. Moteur `letters.ts` (`letterOf`, `answerLetter`, `settleLetters` dans le tick), état `state.letters[player]`. Le coffre, les tâches et les ballots restent.
- Fait : moteur et tests (`test/letters.test.ts`) ; le mois écrit (`venice1450.letters.ts` : 30 jours, une lettre sans condition chaque jour après celles à drapeaux, 7 fins le dernier jour ; textes dans `apps/web/src/i18n.letters.ts` et `i18n.letters.en.ts`, contrôlés par `apps/web/test/letters.test.ts`) ; PNJ ; simulateur (« Lettre : ducats donnés… ») ; serveur (`view.letter` par `letterView`, action `answerLetter`, avis `letter` pour les suites, gazette « Une lettre de … vous attend ») ; écran `Letter.tsx` (la lettre sur son papier, son sceau, deux réponses or et fantôme avec ce qu'elles coûtent et donnent ; moment du matin ; ligne sous la cloche) ; liens des pushes `sfida`, `sera`, `letter` (`shortcut.ts`).
- Écrire une autre saison : un autre fichier de script et ses textes, mêmes ids ; le test du web dit ce qui manque.

## Vague 4 : le plan validé (28 octobre 2026)

Plan complet : la Dynastie (R4), le Grand Canal (R5), le Doge (R7). Décisions prises avec le plan :
- les plots du Grand Canal sont attribués d'office (on garde le sien en restant dans les 40 ; les nouveaux prennent les plus beaux plots libres dans l'ordre du classement ; 7 jours joués ; jamais de PNJ) ;
- le broglio se fait par programme public (mutateur et décret annoncés par chaque candidat), sans voix vendues contre des ducats ou des parts (vague 5) ;
- pas de destitution du Doge en cours de mois (règles stables ; dans IDEAS.md) ;
- le ménage se limite au décret du Signore (retiré, le Signore garde son titre et sa Gloire) et à la renommée en chiffre (retirée du palmarès). Les actes, les missions de la Maison et les privilèges restent.

**La Dynastie (R4).** Chaque mois, un membre de la Maison (prénom choisi parmi trois, `heirNames`) ; à la clôture, un héritier et un trait mérité dans le mois, un seul actif. Les traits ne sont que des options ou des informations : `settings.dynasty.traits[code].effects` est un `strictObject` de six clés (`urgentPreviewMinutes` ≤ 60, `atoutChoices`, `freeDailyRerolls`, `freeRespecs`, `letterPreview`, `signoriaRivals` ≤ 1), rien d'autre ne se lit. Moteur `dynasty.ts` (`traitEffects`, `knownTrait`, `heirNames`, `freeLeft`, `takeFreeRespec`), `join.trait`, `rerollDaily`/`resetSpecialty` avec `free`, branchements dans `specialtyEffects`, `atoutOffer` et `letterView` (`tomorrow`). Le « Fils de condottiere » du plan change sa maîtrise sans Influence une fois par saison : l'ouverture de la Terraferme n'est qu'un affichage du client, sans levier.
- Fait : moteur, tests `test/dynasty.test.ts` (8), catalogue de Venise (18 prénoms, 6 traits).
- Fait aussi : serveur — table `generations` (migration `0030_dynasty`), `apps/server/src/game/dynasty.ts` (`nextGeneration`/`startGeneration` au `join`, `recordGenerations` à la clôture : traits mérités lus dans `telemetry` — `incanto_won`, `podesta_named`, `terra_result` Signore, `letter_answered` ≥ 20, `daily_chest` série ≥ 7 — et le top 10 ; surnom ; `chooseHeir`, `dynastyView`), routes `GET /api/game/dynasty` et `POST /api/game/heir`, `/api/house/spend` gratuit quand le trait le donne, Signoria : 10 rivaux au lieu de 3 pour `signoriaRivals`, `view.dynasty`, export RGPD ; test `apps/server/test/dynasty.test.ts`.
- Fait aussi : écrans — `apps/web/src/game/Dynasty.tsx` (`HeirChoice` dans la cérémonie, où l'unique bouton or devient « Léguer … et commencer » ; `NamePicker` dans `Region.tsx` ; `Gallery` au profil), portrait SVG `art/portrait.tsx` (médaillon aux couleurs du blason, coiffe tirée du prénom, voile pour un prénom féminin, corno pour un Doge), gratuités dites dans `Daily.tsx` et `House.tsx`, « Demain, une lettre de … » dans `Letter.tsx` ; textes `game.dynasty` FR/EN ; étape e2e « heritier ».

**Le Doge (R7).** Moteur `doge.ts` : `electionOpen` (les `electionDays` derniers jours), `openElection` au tick (candidats figés : les `candidates` premiers de `seasonStandings`, sans PNJ ni `doge.previous`), `standForDoge {mutator, decree}` (mutateur du catalogue des mutateurs, décret de `doge.decrees` avec sa cible : ville pour `faveur`, marchandise pour `calmiere`), `voteDoge {candidate, influenceBoost}` (poids 1 + villes de Podestà + boost plafonné à `maxBoost`, boost gardé quand on change d'avis, `minDays` depuis l'arrivée), `dogeTally`, `electDoge` au tick avant `closeSeason` (`doge_elected` avec le programme). Le décret du Doge (`settings.doge.decree`, écrit par le serveur) vaut pour tous : `franchigia` (taxe − `taxCutBps`), `faveur` (+ `premiumBps` à la ville), `levante` (+ `quotaBps` à la Dogana), `calmiere` (plafond `capBps`), branchés dans `decreeTaxBps`, `favourBps`, `levantQuotaBps`, `calmiereCap`. Venise : 10 candidats, 7 jours, 3 jours joués, boost 3, +10 % / −1 pt / +25 % / 110 %.
- Fait : moteur, tests `test/doge.test.ts` (7).
- Fait aussi : serveur — table `doges` (migration `0031_doge`, clé : le mois gouverné `YYYY-MM`), `apps/server/src/game/doge.ts` (`recordDoge` à `doge_elected`, `dogeSettingsFor` : `createWorld` écrit `decree`, `mutator` et `previous` dans `settings.doge` du nouveau monde ; `electionView`), `monthMutator` (le mutateur du Doge, sinon le tirage), `mutatorNotice` (plus d'annonce du tirage suivant quand un Doge décidera), routes `GET /api/game/election`, `POST /api/game/election/vote` (le serveur prend `influencePerVoice` × les voix de boost nouvelles, rendues si le monde refuse), action `standForDoge`, catalogue : `previousDoge` = le Doge du mois (sinon le 1er du mois d'avant), avis `doge` (ouverture, candidat, élu, gagnant) ; test `apps/server/test/doge.test.ts`. Ménage : à Venise, `terraferma.close.decrees` est vide (le Signore garde titre et Gloire, plus de décret ; le bouton « Décret » de la Terraferme disparaît) ; la Renommée ne se dit plus en chiffres au palmarès ni à la cérémonie (son nom reste).
- À faire : écrans (feuille du Sénat, ligne sous la cloche, Doge à la connexion), mesure de chaque décret au simulateur (`--decree`).

**Le Grand Canal (R5)** : à faire, selon le plan (`canal_plots`, `GET /api/canal`, palais SVG, Canal à la connexion, onglet du classement).

## Les vagues suivantes (cadre fixé, à détailler en mode plan au moment venu)

- **Vague 2 : R6 le Lustre, R11 la Sera.** Comptes : `accounts.lustre` ; tables `sfide` (semaine, monde, a, b ou fantôme, mesure, résultat) et `week_curves` (courbe horaire des ventes nettes, pour rejouer les fantômes). La Sera, de 20 h à 20 h 30 : l'incanto des galères de la Muda (enchères de 3 minutes à prolongation) remplace le prix croissant de `muda.ts` et les appels d'offres (`tenders.ts`, retirés) ; l'heure de bataille passe à 30 minutes.
- **Vague 3 : R3 les Atouts, R10 la Lettre.** Les Atouts généralisent le sac d'effets des maîtrises (`specialtyEffects`) : plusieurs Atouts cumulés, les maîtrises deviennent des Atouts de départ. Catalogue dans `settings.atouts`, réserve débloquée dans `account_atouts`. La Lettre : contenu dans `themes/venice1450.letters.ts` (épisodes à conditions et drapeaux, gains bornés) ; elle absorbe le coffre, les tâches et les ballots.
- **Vague 4 : R4 la Dynastie, R5 le Grand Canal, R7 le Doge.** Tables de compte `generations`, `canal_plots`, `doges`. Élection la dernière semaine ; le Doge choisit le mutateur parmi trois (au lieu du tirage de `seasonMutator`) et un décret du mois.
- **Vague 5 : R8 le Broglio, puis R9 les parts de Maison.** Rumeurs tirées du secret du monde (`draw.ts`), échangeables, et un espion. Parts dans l'état du monde, sous séquestre au grand livre, dividendes hebdomadaires sur les ventes nettes, 49 parts au plus en circulation.

## Journal

- 27 octobre 2026 : audit validé, plan approuvé, document de reprise créé.
- 27 octobre 2026 : R1 moteur. Valeurs de départ à Venise : 0,1 pain par troupe et par jour ouvert, 10 pains par « + Troupes », rocca 10 briques, porto 10 planches, bombarda 10 bois + 10 planches, mura 5 briques + 15 planches. Le pain manquant est pardonné, mais le marchand ne recrute plus jusqu'à ce que du pain revienne dans son stock.
- 27 octobre 2026 : R1 chez les PNJ (le pain des troupes compte dans leurs rations, ils achètent les matériaux avant de bâtir) ; R2 dans le moteur (`signoria.ts`), le ménage, le serveur, les écrans, les notes de saison.
- 28 octobre 2026 : calibration de la vague 1 (0,1 pain retenu, 0,2 écarté) ; vague 1 terminée.
- 28 octobre 2026 : vague 2 planifiée et validée ; moteur du Lustre (`lustre.ts`, `settings.lustre`).
- 28 octobre 2026 : serveur du Lustre — migration `0028_lustre` (`accounts.lustre`, `sfide`, `week_curves`), `apps/server/src/game/lustre.ts` (courbes chaque heure et appariement depuis le tick dans `world.ts`, règlement sur `week_closed`, remise du mois sur `season_closed`), routes `/api/game/sfida`, `/challenge`, `/accept`, le rival de la semaine devient l'adversaire de la Sfida (`sfidaRival`, champ `sfida: true`), avis `sfida` et Lustre dans l'avis de la semaine, export RGPD ; test `apps/server/test/lustre.test.ts`.
- 28 octobre 2026 : écrans du Lustre — palier dans l'identité du HUD (« · POPOLANO » à la place de « NIV. n »), la ligne du rival devient « Sfida : … » et ouvre la feuille `Sfida.tsx` (deux camps, écart, courbes jusqu'à l'heure, échelle, défis reçus et lancés), « Défier » dans le palmarès d'un marchand ouvert depuis le classement (feuille `challenge:<id>:<nom>`) ; étape e2e « sfida ». Le serveur enregistre la courbe d'un marchand dès son arrivée.
- 28 octobre 2026 : moteur de l'incanto (`incanto.ts` : `openIncanto` appelé par `arriveMuda`, commande `incantoBid`, `closeIncantoLots` dans le tick, comptes `hold:`, motifs `incanto_lock`, `incanto_refund`, `incanto`), tests `test/incanto.test.ts` ; bataille à la minute (`terraferma.battle.toMinute`, `inBattle`), vue serveur et texte web.
- 28 octobre 2026 : incanto chez les PNJ (un maximum à 80–110 % de la référence selon le profil, sur le lot le moins cher, avec des ducats en réserve), au rapport du simulateur (« Incanto : lots vendus… », `incanto` parmi les puits) ; ménage à Venise : `incanto` allumé, appels d'offres retirés (test serveur remplacé), `muda.priceRiseBps` à 0, bataille de 20 h à 20 h 30.
- 28 octobre 2026 : la Sera sur le serveur et à l'écran — `view.sera` (lots, prix, minimum, maximum du marchand, tête), action `incantoBid` acceptée par `routes.ts`, avis `sera` (19 h 55, enchère dépassée) et cloche, rond « La Sera » dans le HUD tant que des lots sont ouverts, feuille `Sera.tsx` (lots par leurs marques, prix, statut, quatre maximums, un seul bouton or « Enchérir », vos villes de Podestà) ; étape e2e « sera » sur une réponse réécrite (aucun lot à l'ouverture d'un monde) ; test serveur « takes a maximum at the incanto ».
- 28 octobre 2026 : calibration de la vague 2 (incanto à 50 % : 3 à 5 lots vendus sur 30 ; à 30 % avec des PNJ moins frileux : 30 sur 30, retenu) ; vague 2 terminée.
- 28 octobre 2026 : vague 3 planifiée ; moteur des Atouts (`atouts.ts`, effets additionnés dans `specialtyEffects`, `rawYieldBps`, `cityPayBps`, `signoriaBps`), catalogue de Venise (16 Atouts), PNJ et rapport du simulateur.
- 28 octobre 2026 : serveur des Atouts — migration `0029_atouts` (`account_atouts`), `apps/server/src/game/atouts.ts` (`atoutPoolFor` au `join`, `recordAtoutUnlocks` sur `podesta_named`, `incanto_won`, `terra_result` Signore, `unlockByLustre` à la clôture de semaine ; les déblocages sont donnés au monde après la commande par `unlockAtout`), action `chooseAtout`, `view.atouts` (tenus, ouvert, offre, effets, verrouillés), gazette du lundi ; test `apps/server/test/atouts.test.ts`.
- 28 octobre 2026 : écrans des Atouts — `apps/web/src/game/Atouts.tsx` (feuille : trois cartes, gain en lagon ▲, perte en cinabre ▼, celle choisie cerclée de lapis, un seul bouton or « Prendre … » ; Atouts de la saison ; à débloquer et comment), moment qui s'ouvre de lui-même une fois par offre (guide fini, aucune feuille ouverte ; mémorisé `atouts:<offre>`), rond or « Atouts » dans le HUD tant que l'offre est ouverte, textes FR/EN des 16 personnages ; étape e2e « atouts » sur une réponse réécrite.
- 28 octobre 2026 : PR #51 (vagues 1 et 2) fusionnée dans la branche par défaut, reprise dans `claude/rupture-v3`. Moteur de la Lettre — `packages/engine/src/letters.ts` : `letterOf` (premier épisode du jour dont les drapeaux `needs`/`without` sont remplis ; `last` pour le dernier jour de la saison ; une lettre répondue reste la même), commande `answerLetter { choice }` (coût au puits `letter_cost`, gains `letter_reward` / `letter_gift` sous `maxDucatsPerSeason`, drapeaux, suite programmée), `settleLetters` au tick (suite tirée par `chanceBps`, événement `letter_followup`) ; `state.letters[joueur] = { flags, answered, pending, minted }` ; réglages `settings.letters` ; tests `packages/engine/test/letters.test.ts` (7).
- 28 octobre 2026 : la Lettre du jour écrite et branchée — un mois de lettres (30 jours, 7 fins), textes FR/EN, PNJ, simulateur, serveur (vue, réponse, avis `letter`, gazette), écran `Letter.tsx` ; les Atouts et la Lettre passent sous la cloche (un rond de plus débordait à 320 px) ; calibration de la vague 3 sur 5 graines, conformes (Lettre : 100 ducats au plus, 43 à 50 en moyenne ; Atouts : diversité hors cible chez les PNJ) ; vague 3 terminée.
- 28 octobre 2026 : vague 4 planifiée et validée ; moteur de la Dynastie (`dynasty.ts`, traits en liste blanche, `join.trait`, gratuités du trait, branchements), catalogue de Venise, tests.
- 28 octobre 2026 : vague 3 fusionnée (PR #52) ; serveur de la Dynastie (`generations`, mérites, surnom, héritier, prénoms, gratuités, rivaux de la Signoria).
- 28 octobre 2026 : écrans de la Dynastie (héritier à la cérémonie, prénom à la région, galerie et portraits, gratuités) ; la Dynastie est faite.
- 28 octobre 2026 : moteur du Doge (`doge.ts` : élection de la dernière semaine, programme, voix pondérées, élu à la clôture ; décret du mois pour tous dans `decrees.ts`), réglages de Venise, tests.
- 28 octobre 2026 : serveur du Doge (`doges`, réglages du mois écrits à la création du monde, routes de l'élection, avis) ; ménage : décret du Signore retiré à Venise, Renommée sans chiffres.
