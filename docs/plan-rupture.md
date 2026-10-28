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
| R6 | Le Lustre (échelle de rang, fantômes) | 2 | fait (calibration de la vague à faire) | `ef52658`… |
| R11 | La Sera (20 h, incanto des galères) | 2 | en cours | — |
| R3 | Les Atouts | 3 | à faire | — |
| R10 | La Lettre du jour | 3 | à faire | — |
| R4 | La Dynastie | 4 | à faire | — |
| R5 | Le Grand Canal | 4 | à faire | — |
| R7 | Le Doge | 4 | à faire | — |
| R8 | Le Broglio | 5 | à faire | — |
| R9 | Les parts de Maison | 5 | à faire | — |

## Où j'en suis

- **Fait (vague 1)** : R1 et R2 dans le moteur, chez les PNJ, au simulateur, sur le serveur (vue, route `GET /api/game/signoria`, notifications nommées) et à l'écran (jauge autour de la ville, feuille « Signoria », blason du Podestà sur la carte, pain des troupes au HUD, coûts de la guerre dans « Vos terres ») ; ménage (fournisseurs et embargo retirés à Venise) ; notes de saison ; CADRAGE et plan-terraferme à jour.
- **Vague 1 terminée** (28 octobre 2026). Le porteur a choisi de passer à la vague 2 plutôt que de forcer le pain et la croissance (« fais l'option qui te semble la mieux »).
- **Vague 2 en cours** (plan validé le 28 octobre, détail plus bas, « Vague 2 : le plan validé »). Ordre : Lustre moteur → Lustre serveur → Lustre écrans → incanto moteur (+ bataille à la minute) → incanto PNJ, simulateur, ménage → Sera serveur et écrans → calibration et docs.
- **Calibration faite** : deux essais (0,1 et 0,2 pain par troupe), 5 graines conformes chacun ; 0,1 retenu (`docs/calibration.md`, « Vague 1 »). Restent sous leur cible : la croissance du mois (1,12 à 1,18 pour 1,20) et le pain en fin de mois (56 à 60 % pour 65 %).
- **Étape suivante exacte** : le moteur de l'incanto (`packages/engine/src/incanto.ts`, tests `test/incanto.test.ts` d'abord) et la bataille à la minute (`terraferma.battle` avec `toMinute`, `clock.ts`).
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
