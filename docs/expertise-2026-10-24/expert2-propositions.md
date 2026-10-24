# Expert 2 — Multijoueur, social, live-ops et modes de jeu

24 octobre 2026. Lecture : CLAUDE.md, CADRAGE, plans (finalisation, familles, terraferme, campagne, pve, livraisons), IDEAS.md, recommandations du 20 octobre, calibration.md ; code `apps/server/src/game/{terra,skirmish,weekly,bots,season,terraRecord,routes}.ts`, `packages/engine/src/{terraferma,terraWorld,skirmish,bots,projects,house,weekly,partners,acts}.ts`, `themes/venice1450.settings.ts`. Aucun fichier du dépôt modifié.

## 1. Diagnostic

**Ce qui marche.** La Terraferme reprend fidèlement OpenFront dans un format asynchrone : des fronts qui avancent seuls, l'heure de bataille, des nations aux caractères distincts, des décrets qui pèsent vraiment sur l'économie. Le commerce entre joueurs existe (carnet, commissions, colleganza, appels d'offres). La nuit et le refus du pay-to-win sont tenus, et les saisons courtes protègent les nouveaux venus.

**Ce qui manque pour jouer ensemble et revenir.**
1. Le monde est peuplé d'ordinateurs qui ne sont pas des partenaires. Un allié PNJ est muet. Le Signore, la grande récompense politique, revient le plus souvent à un PNJ, avec un décret tiré au hasard.
2. Aucun lien ne survit à la semaine. Les alliances durent sept jours, à deux alliés au plus, et les familles comme les guildes ont été retirées. On ne revient jamais le mois suivant « avec » quelqu'un.
3. Le jeu en direct exige une foule : une escarmouche classée est presque impossible à moins de 100 humains.
4. Aucun objectif coopératif ne dépend de ma présence : les PNJ remplissent seuls les commandes de compagnie.
5. Chaque mois rejoue la même partie (même carte, mêmes règles), et la saison se termine sans point d'orgue.
6. Les classements sont absolus : le milieu du tableau n'a jamais rien à gagner.

## 2. Propositions, par priorité

---

### E2-1 — Le Signore est un marchand humain ; une maison qui se retire rend ses terres
**Type :** correction.

**Constat.**
- `closeTerra` (`packages/engine/src/terraferma.ts` l.1266-1320) classe tous les joueurs qui ne sont pas des nations, PNJ compris. Le premier devient Signore et impose `s.programme[signore]`.
- Les PNJ choisissent ce programme au hasard (`bots.ts`, `terraPlay`, l.336-340 : `decrees[Math.floor(rng*len)]`).
- Avec `bots.population: 40` et 5 humains, un PNJ est Signore environ 7 semaines sur 8 si les niveaux sont égaux. La Dîme (3 % de chaque livraison, `dime.tollBps 300`) et le Monopole (+15 points de taxe) font alors passer les ducats des humains vers un ordinateur.
- Le moteur ne sait même pas qui est un PNJ : il n'y a aucun drapeau dans `state.ts`.
- `BotDriver.retire` (`apps/server/src/game/bots.ts` l.362-378) n'annule que les ordres du Rialto. Le territoire de la maison retirée continue de recruter, de rapporter de la Gloire et de compter dans le classement. Ses alliances restent actives, et l'allié humain garde un partenaire fantôme sans être prévenu.

**Proposition.**
- Ajouter `npc: true` sur `TerraPlayer`, posé par la commande `terraPlace` quand elle vient du pilote des PNJ. Le serveur connaît déjà `accounts.isBot`, donc le moteur reste pur.
- `closeTerra` calcule `signore` sur les seuls humains qui ont une Gloire > 0. Les PNJ restent au classement, avec leur badge, sans Influence ni décret.
- S'il n'y a aucun humain, il n'y a pas de décret.
- Nouvelle commande `terraWithdraw`, émise par `retire()` :
  - les cases reviennent à la milice ;
  - les fronts sont rappelés ;
  - les alliances sont dissoutes, avec l'avis « La maison X se retire de la Terraferme : votre alliance prend fin » (`terra_alliance_broken`, raison `withdrawn`).
- Le classement Elo (`terraRecord.ts`, `newRatings`) exclut les PNJ du champ.

**Référence.** Les « nations » d'OpenFront occupent la carte, mais elles ne gagnent jamais la partie à la place d'un joueur. Une récompense qui va à l'ordinateur est vécue comme un vol.

**Règle transgressée :** aucune.

**Coût :** S (un champ, un filtre, une commande ; tests sur la fixture).
**Impact :** fort. Le décret, cœur politique de la semaine, redevient un enjeu entre personnes.
**Risque :** un humain faible peut devenir Signore avec peu de Gloire. On peut exiger au moins une case tenue à la clôture. Mesure : `pnpm sim --terra --players 5`, part des semaines avec un Signore PNJ (aujourd'hui ≈ 85 %, cible 0 %).

---

### E2-2 — Des escarmouches classées qui ont lieu : file d'attente notifiée et trois convocations par jour
**Type :** correction.

**Constat.**
- `SkirmishHub.join` (`apps/server/src/game/skirmish.ts`) ouvre une salle de `lobbySeconds: 60`. Une partie n'est classée qu'avec `minHumans: 2` (`venice1450.settings.ts` l.316-328, `skirmishRanked` dans `engine/src/skirmish.ts`).
- Prenons N humains qui lancent chacun une escarmouche par jour, à une minute tirée au hasard dans les 840 minutes ouvertes. La probabilité qu'un autre humain tombe dans la même fenêtre vaut environ 2(N−1)/840 :
  - 4,5 % pour N = 20 ;
  - 11,5 % pour N = 50 ;
  - 21 % pour N = 100.
- Sur un serveur de niche, le mode en direct se réduit donc à une partie amicale, sans enjeu, contre sept condottieri. La mesure du chantier terra-1 (6 % de la Gloire d'un régulier) supposait deux ou trois marchands par partie. Elle ne tient donc pas avec une population réelle.

**Proposition.**
1. **File d'attente classée**, comme pour les Étoiles Rouges de Hades' Star.
   - « Chercher une partie classée » tient la place jusqu'à 30 minutes (`skirmish.queueMinutes`).
   - Dès qu'un deuxième humain entre, chacun reçoit une notification « Partie trouvée, départ dans 3 min » (`lobbySeconds` 60 → 180).
   - Un absent est remplacé par un condottiere ; la partie reste classée s'il y a au moins deux humains au départ.
2. **Trois convocations par jour**, à 12 h 30, 18 h 30 et 21 h 15 (après l'heure de bataille, fin avant 21 h 45 ; `skirmish.slots`).
   - La salle ouvre 10 minutes avant ; un avis part 15 minutes avant, sur abonnement, comme `battle.warnMinutes`.
   - Concentrer la présence sur trois créneaux donne environ deux humains par créneau, dès que 20 % de 30 humains y viennent.
3. Hors file et hors convocation : partie amicale, comme aujourd'hui.

Les notifications respectent les heures calmes et entrent dans le plafond global exigé par plan-finalisation.

**Référence.**
- Hades' Star : on s'inscrit dans la file d'une Étoile Rouge, le téléphone sonne quand le groupe est complet, et l'on a le temps d'arriver. C'est exactement la solution pour une petite population.
- Rocket League : tournois à heure fixe.

**Règle transgressée :** aucune (réglages et serveur).

**Coût :** S.
**Impact :** fort. C'est le seul mode « ensemble, maintenant » du jeu.
**Risque :** des créneaux vides au lancement. Prévoir un repli vers la Condotta (E2-5) quand on est seul. Mesure dans `/admin` : part des parties classées / amicales, cible ≥ 40 % de parties classées parmi les parties lancées en convocation.

---

### E2-3 — Les missions de la Maison mortes sous la Terraferme
**Type :** correction.

**Constat.**
- Le tableau de missions (`venice1450.settings.ts` l.1116-1141) tire 10 missions sur 17 (`house.ts`, `missionsOf`, identiques pour tous).
- Cinq d'entre elles écoutent des événements de l'ancienne Campagne : `levy_collected`, `march_sent`, `assault_won`, `land_defended` et `work_built`. Ces événements ne sont émis que par `campaign.ts`, éteint depuis le 18 octobre.
- En moyenne, 2,9 missions par tableau sont donc impossibles, soit environ 9,4 Influence sur 31,8 tous les trois jours et demi (30 % de l'Influence gagnable).
- Le remplacement était pourtant écrit dans `docs/plan-terraferme.md` l.116.

**Proposition.**
- Remplacer les cinq missions mortes par :
  - `terra_placed` ×1 (2 Influence) ;
  - `terra_front` ×3 (3) ;
  - `terra_built` ×1 (3) ;
  - `terra_alliance_made` ×1 (2) ;
  - `project_delivery` ×3 (3), pour livrer à l'Arsenal (E2-6).
- Ajouter un champ `group: "terra"` et un plafond de 2 missions de ce groupe par tableau (`missions.groupMax`). La Terraferme est facultative (P0-1) : un pur marchand garde au moins 8 missions faisables.
- Test moteur : chaque `event` du pool est émis par au moins une commande du monde quand `terraferma.live` est vrai.

**Référence :** aucune nécessaire ; c'est un défaut.

**Règle transgressée :** aucune.

**Coût :** S.
**Impact :** moyen et immédiat (Influence, sentiment d'injustice).
**Risque :** nul.

---

### E2-4 — Des PNJ qui sont de vrais alliés
**Type :** amélioration.

**Constat.**
- Un PNJ s'allie au premier voisin par ordre alphabétique d'identifiant (`bots.ts` l.356 : `[...next].sort()[0]`) et accepte toute demande (l.345).
- Il n'envoie jamais de troupes (`terraSend`), ne répond jamais à un signal `help`, ne riposte jamais pour un allié et ne signale jamais rien.
- Dans un monde à 85 % artificiel, l'alliance, seule mécanique sociale de la Terraferme, est donc creuse pour l'humain qui la vit.

**Proposition** (moteur pur, `bots.ts`, profils et caractère existants, P1-6) :
- **Choisir.** Le PNJ propose d'abord l'alliance à un voisin humain qui n'a pas d'allié, puis à un PNJ. Selon son caractère, il refuse un humain trois fois plus fort que lui (l'« opportuniste » refuse moins).
- **Secourir.** Quand un allié a lancé `help` dans les 2 dernières heures et qu'un front le vise, le PNJ envoie `min(25 % de ses troupes, part de don autorisée)` à sa session suivante. Le pilote serveur avance cette session à 30 minutes au plus tard après le signal.
- **Riposter.** Si l'agresseur de son allié est son voisin, il lance un front contre lui à 30 % de ses troupes.
- **Parler.** Il envoie `thanks` après un don reçu, et `attack` sur la case qu'il vise quand il est allié à un humain (signal montré aux seuls alliés).
- **Trahir selon son caractère.** Seul l'« opportuniste » rompt, jamais avant le jeudi et avec les 2 heures de préavis de la règle.
- **Jamais de ducats** entre un PNJ et un humain : des troupes seulement, qui ne sont pas de la monnaie. Cela évite tout transfert de valeur exploitable.

**Référence.**
- Civilization : des chefs IA à « agendas » lisibles. Le joueur leur prête des intentions, donc une relation.
- Les PNJ des Diplomacy en ligne qui tiennent une place vacante.

**Règle transgressée :** aucune (comportement des PNJ, simulé).

**Coût :** M.
**Impact :** fort à faible population : c'est la vie sociale réelle du lancement.
**Risque :** des PNJ trop généreux portent un humain passif. Mesure `pnpm sim --terra` : écart de cases médianes entre humains alliés à un PNJ et non alliés ≤ +30 % ; éliminés ≤ 2 par semaine (cible terra-4).

---

### E2-5 — La Condotta : une Étoile Rouge vénitienne, en coopération à 1-4 contre les nations
**Type :** mode de jeu.

**Constat.**
- Le seul mode court est l'escarmouche en mêlée générale (E2-2), qui demande des adversaires humains.
- Le moteur sait déjà tout ce qu'il faut pour un mode coopératif : alliances et `teamMode` (`terraferma.ts` l.620-633), nations à comportements (`defensive`, `opportunist`, `raider`, `slow`). Pourtant `skirmishConfig` met `nations: []` et `teams: undefined` (`engine/src/skirmish.ts` l.52-80).
- IDEAS.md a écarté les « étoiles rouges (les ballots de Faraj tiennent ce rôle) ». C'est une confusion : un ballot est une minuterie de butin, pas une activité qu'on joue ensemble.

**Proposition.**
- **La partie.** 12 minutes, avec le moteur des escarmouches. 1 à 4 marchands alliés se posent au centre ; 2 à 3 nations tirées du catalogue (Mantoue, Ferrare, l'Empire) partent des bords.
- **Victoire :** tenir Padoue et au moins 35 % des cases à la fin.
- **Niveaux 1 à 12 par compte** (`accounts.condottaLevel`). Les troupes des nations valent `base × (1 + 0,15 × (niveau − 1))`. Gagner au niveau n ouvre le niveau n + 1. Un groupe joue au niveau le plus haut ouvert à tous ses membres, comme en Étoile Rouge.
- Les niveaux 9 à 12 sont réglés pour 2 à 3 joueurs : seul, on plafonne vers 8. C'est l'attraction sociale, sans pénaliser le solo.
- **Récompense, une par jour, de 8 h à 22 h** : une « lettre de la Muda », droit d'acheter 2 unités de plus aux prochaines galères au prix de référence (au lieu du prix qui monte jusqu'à +60 %).
  - Aucune marchandise ni aucun ducat n'est créé, et le puits de la Muda est gardé.
  - S'y ajoutent le grade cosmétique, de *Condottiere di ventura* à *Capitano generale*, au profil, et l'événement `condotta_won` pour les missions.
- **Aucune Gloire :** la Terraferme hebdomadaire reste propre.
- **Entrée :** la file d'E2-2, avec « Avec ma compagnie » si E2-8 existe.

**Référence.** Hades' Star : les Étoiles Rouges sont l'activité quotidienne la plus jouée du jeu. Elles fonctionnent en coopération de 1 à 4, avec des niveaux qui exigent de se grouper, une file notifiée et des parties courtes. Elles marchent parce qu'elles se jouent avec n'importe qui de présent, à faible population, sans perdant humain.

**Règle transgressée.**
- Le gel des mécaniques : nouvelle mécanique hors du lot du 20 octobre, qui demande l'arbitrage écrit du porteur.
- Une décision consignée dans IDEAS.md (« étoiles rouges écartées »).
- Justification : c'est le seul mode coopératif jouable quand le serveur est vide, et il réemploie un moteur fait à 90 %.

**Coût :** M (variante de `skirmishConfig`, échelle de niveau, colonne de compte, champ `muda.letters` dans l'état ; réemploi de `SkirmishBar`).
**Impact :** fort sur J7 : un rendez-vous quotidien qui n'exige personne.
**Risque :** les lettres de la Muda privent les retardataires des premiers prix. On plafonne à 2 unités par jour et à 20 % du lot réservable par des lettres (`muda.lettersMaxBps`). Mesure : `pnpm sim` (toutes graines), recette de la Muda détruite ≥ 90 % de l'actuelle.

---

### E2-6 — L'Arsenal de la semaine : la commande de compagnie à trois paliers, que seuls les humains montent
**Type :** amélioration.

**Constat.**
- `projects` (`venice1450.settings.ts` l.1181-1187) passe une commande tous les 2 jours : 4 pains, 3 briques et 3 planches par marchand actif, avec +10 % de prime et +10 % de bonus une fois remplie.
- Les PNJ livrent « leur part » (`bots.ts` l.682 ; calibration.md l.1110). Avec 35 PNJ sur 40, la commande se remplit à environ 87 % sans aucun humain.
- Il n'y a ni palier, ni nom de contributeur, ni effet sur le monde (`projects.ts`, `completeProject`). C'est l'inverse d'un objectif commun.

**Proposition.**
- Une commande par semaine, du lundi au dimanche (au rythme de la Terraferme), avec trois paliers : Bronze = le besoin d'aujourd'hui, Argent ×2, Or ×3.
- Les PNJ ne contribuent qu'au Bronze.
- Paiement : livraison à +10 %, comme aujourd'hui (création inchangée par unité livrée). Le bonus de +10 % au Bronze est gardé.
- L'Argent donne au monde entier un lot de la Muda +25 % aux galères de la semaine suivante (plus d'offre, puits gardé).
- L'Or donne la galère de l'Arsenal sur la carte la semaine suivante, le « Livre d'or » des contributeurs (pseudos, quantités) dans la gazette et 3 Influence à chaque contributeur d'au moins 2 % du palier.
- La barre commune et le top 5 des contributeurs sont visibles sur la carte du commerce.

**Référence.** Clash of Clans, *Clan Games* : des paliers communs ; chacun reçoit la récompense des paliers atteints s'il a contribué un minimum. On voit qui a porté le groupe, et le palier suivant se discute.

**Règle transgressée :** aucune (réglages et extension de `projects`).

**Coût :** S à M.
**Impact :** moyen à fort. Premier objectif où un humain change le résultat.
**Risque :** monnaie créée au plus ×3 par rapport à aujourd'hui sur ces biens si l'Or est atteint. À valider par `pnpm sim` (masse ≤ 2,5 ×, toutes graines) et à documenter dans calibration.md.

---

### E2-7 — Ligues hebdomadaires de dix marchands
**Type :** nouvelle fonctionnalité.

**Constat.**
- `weeklyStandings` (`engine/src/weekly.ts`) classe les ventes nettes en absolu. Les titres vont au top 3 et le Pass au top 10 (`apps/server/src/game/weekly.ts`).
- Dès la deuxième semaine, les mêmes assidus tiennent le haut. Un joueur moyen n'a qu'une cible, le rival de la semaine (l.164-212), et rien à gagner.

**Proposition.**
- Chaque lundi, groupes de 10 marchands de ventes nettes voisines la semaine précédente (fonction pure `leagueGroups`, tirage déterministe). Pour la première semaine de saison : par région, puis au hasard.
- Cinq divisions : Bottega, Campo, Rialto, Procuratie, Palazzo.
- Les 3 premiers montent et les 3 derniers descendent ; on garde sa division d'un mois à l'autre (couche compte), avec un recul d'une division au changement de saison.
- Les PNJ remplissent les groupes comme rivaux, mais ne prennent ni montée ni récompense.
- Récompenses : 5/3/2 Influence aux trois premiers humains du groupe. Le titre « Doge de la semaine » reste au classement général, qui reste affiché.
- Le rival de la semaine devient celui du groupe.

**Référence.** Duolingo, Clash Royale : la ligue de taille fixe donne chaque semaine une course gagnable, quel que soit le niveau. C'est l'un des leviers d'engagement hebdomadaire les plus copiés du mobile.

**Règle transgressée :** le choix du cadrage (« Classement hebdomadaire : ventes nettes », top 10 → Pass). La métrique reste les ventes nettes ; seul le découpage change.

**Coût :** M (fonction pure, table `league_weeks` avec `world_id`, onglet du classement).
**Impact :** fort sur la rétention hebdomadaire du milieu de tableau.
**Risque :** des groupes faits surtout de PNJ, donc des courses « contre l'ordinateur ». C'est acceptable si E2-4 rend les PNJ crédibles. Mesure : rétention à J14 par division.

---

### E2-8 — Compagnies : un groupe d'amis qui survit au mois, sans trésor
**Type :** nouvelle fonctionnalité.

**Constat.**
- Guildes (carats, trésor, concessions), puis familles, ont été retirées, chaque fois pour leur complexité économique (CADRAGE, « Guildes… », « Les quatre familles… »).
- Il ne reste que l'alliance de la Terraferme : 2 alliés, une semaine. Le fil de famille est mort (`familyChat.ts` l.73 lit `families.memberOf`, routes `/api/game/family/*` toujours montées l.709-726), et le chef a repoussé le fil d'alliance (plan-finalisation, terra-3, étape 2).
- Résultat : rien ne fait revenir le 1er du mois *avec* quelqu'un, alors que les canaux d'acquisition visés sont des communautés Discord, qui arrivent en groupe (CADRAGE, « Canaux d'acquisition »).

**Proposition.**
- **Structure.** Une compagnie de 2 à 8 membres, au niveau du compte (elle survit aux saisons), avec un nom et une bannière tirée du blason. On la crée gratuitement, on y entre par un lien (le `?ref=` de live-3) et l'on peut la quitter librement, avec un délai de 7 jours avant d'en rejoindre une autre.
- **Ce qu'elle donne :**
  - un fil de compagnie, avec les règles de `chatRules.ts` de terra-3 ;
  - la file des escarmouches et de la Condotta « avec ma compagnie », dont les membres reçoivent la convocation ;
  - les contributions à l'Arsenal affichées par compagnie ;
  - un palmarès commun (saisons jouées ensemble, Renommée cumulée) ;
  - dans la Terraferme, les membres signalés « amis » sur la carte.
- **Ce qu'elle ne donne pas :** ni trésor, ni transfert, ni décret, ni alliance automatique. Les règles d'alliance (2 au plus) ne changent pas, ce qui évite un bloc de 8 qui figerait la carte.
- La semaine en équipes (`teams.weeks [2]`) peut se jouer par compagnie quand au moins 3 compagnies comptent au moins 3 humains actifs, sinon par région.

**Référence.** Hades' Star (les corporations), Clash of Clans (les clans), EVE (les corporations). Dans tous les jeux persistants, le groupe est la première raison de revenir : on ne laisse pas tomber les siens. Hades' Star montre qu'un groupe de 5 à 15 personnes, sans économie partagée, suffit.

**Règle transgressée.**
- La décision du porteur du 17 octobre 2026 (« chacun pour soi », plus de familles), et le report du fil d'alliance par le chef.
- Justification : le groupe est choisi et non imposé, et il n'a aucun pouvoir économique. Les deux raisons des retraits précédents (complexité, multi-compte) ne s'appliquent donc pas.
- Les tables sont de la couche compte, sans `world_id`, comme `accounts`.

**Coût :** M à L (2 tables, fil, feuille, convocation).
**Impact :** le plus fort à moyen terme sur J30 et le retour de saison en saison.
**Risque :** écrans vides au lancement. Ne montrer la compagnie qu'aux invités par lien, ou à partir du 2e jour. Le coût de modération est déjà couvert par chatRules.

---

### E2-9 — Le mutateur du mois : une règle de saison tirée d'un catalogue
**Type :** live-ops.

**Constat.**
- Même carte (`terraferma.geography`), mêmes réglages, mêmes actes (`acts`, l.831) chaque mois : seule la crise de l'acte II varie, parmi trois.
- La deuxième saison est une rediffusion. Rien n'annonce le 1er du mois comme un événement.

**Proposition.**
- `theme.seasonMutators: [{ code, weight, override }]` : à l'ouverture d'une saison (`season.ts`), un mutateur est tiré du secret du monde (ou choisi par le Doge, E2-10).
- Il est fusionné dans `worlds.settings` et écrit automatiquement en tête des `seasonNotes`. Il reste stable tout le mois, ce qui respecte la règle de CLAUDE.md.
- Premier catalogue, avec des réglages qui existent déjà :
  - **Guerre de Ferrare** : `nations[].troops` ×1,5, `close.influence` ×1,5 ;
  - **Carestia** : capacité des villes en pain et en blé +30 %, rendement des fermes −15 % ;
  - **Le Levant afflue** : `muda.lotPerActivePlayer` ×1,5, poids des commandes d'exotiques ×2 ;
  - **Les bombardes de Mehmed** : `bombarda.price` −50 %, `shotsPerDay` 2, `mura.price` −30 % ;
  - **Hiver alpin** : montagne `defenseBps` 25 000, `troops.recruit.base` −2.
- Chaque mutateur est validé par `pnpm sim --mutator <code>` (toutes graines) et documenté dans calibration.md.

**Référence.** Path of Exile (ligues), Diablo (saisons), Hearthstone (Tavern Brawl), serveurs spéciaux de Travian. Une règle neuve par cycle fait de chaque remise à zéro une nouvelle partie, à un coût de contenu presque nul.

**Règle transgressée :** aucune (réglages, stables dans la saison).

**Coût :** S pour le mécanisme, plus une simulation par mutateur.
**Impact :** fort sur le retour du 1er du mois et sur la communication (« ce mois-ci : la Guerre de Ferrare »).
**Risque :** un mutateur déséquilibré tient un mois entier. D'où la validation au simulateur obligatoire et un catalogue court.

---

### E2-10 — Une fin de mois qui se joue : élection du Doge et Capitano generale de la Terraferme
**Type :** live-ops et nouvelle fonctionnalité.

**Constat.**
- La dernière semaine de Terraferme ne donne pas de décret (`terraWorld.ts` l.239 : `next < seasonWeeks`) et rien ne la remplace. Il n'existe aucun honneur mensuel de la Terraferme au palmarès (`season.ts` ne lit que les ventes nettes).
- La fin de saison est un classement figé et une cérémonie (`Ceremony.tsx`), sans rien que les joueurs fassent ensemble.
- IDEAS.md garde « l'élection du Doge » et « le Doge nomme un événement de la saison suivante » sans les avoir conçus.

**Proposition.**
- **Élection du Doge, du J−3 au J−1.**
  - Candidats : les 5 premiers humains de la saison au J−3, chacun avec un programme de 140 caractères (filtre de chatRules).
  - Électeurs : comptes à l'e-mail vérifié, actifs au moins 7 jours dans la saison, une voix chacun.
  - Le Doge élu choisit le mutateur du mois suivant parmi 3 tirés du catalogue validé (E2-9) et nomme une nouvelle de la gazette. Il reçoit le titre au palmarès et +50 de Renommée.
- **Capitano generale della Terraferma** : l'humain qui a le plus d'Influence de la Terraferme sur le mois. Titre au palmarès et +30 de Renommée.
- Le Signore de la dernière semaine, privé de décret, reçoit à la place le « Gonfalone » au palmarès.
- Tout cela relève de la couche compte : aucun effet économique.

**Référence.**
- EVE Online, élections du CSM : le vote crée une méta politique et des campagnes sur les canaux communautaires.
- Rise of Kingdoms : le Roi du royaume distribue des titres.
- Et l'histoire même de Venise, avec l'élection du Doge par ballottino.

**Règle transgressée :** le gel des mécaniques (nouvelle mécanique hors du lot), à faire arbitrer par écrit par le porteur.

**Coût :** M (table des votes avec `world_id`, feuille, notification de J−3).
**Impact :** fort sur les trois derniers jours, le moment où un joueur décroche. Le mois suivant appartient aux joueurs.
**Risque :** brigues Discord et multi-comptes. Le vote exige un e-mail vérifié et 7 jours d'activité, et il ne choisit qu'entre options validées : un abus ne casse donc rien.

---

### E2-11 — Des théâtres de 40 marchands au plus pour la Terraferme
**Type :** correction de passage à l'échelle.

**Constat.**
- `terraMap` (`terraferma.ts` l.330-331) dessine une seule carte de `cellsPerActive 25 × max(20, actifs)` cases : 2 500 cases à 100 actifs, 7 500 à 300 (cible MVP : 200-500).
- Le budget de 60 i/s a été mesuré à 800 cases et 40 marchands (`plan-terraferme.md` l.152). `terraView` renvoie toute la carte (`owner`, tous les `holders`) toutes les 3 secondes pendant l'heure de bataille.
- Côté jeu, avec 300 marchands :
  - le classement de Gloire n'a plus de sens ;
  - le palier « premier quart » vaut 75 joueurs ;
  - un seul Signore impose sa Dîme à tout le serveur.

**Proposition.**
- Théâtres de 40 marchands au plus (`terraferma.theatre.max`), complétés par des PNJ jusqu'à 20.
- Un marchand qui se pose rejoint le théâtre qui a le moins d'humains, avec sa compagnie et ses alliés (E2-8) ; un nouveau théâtre s'ouvre quand tous sont pleins.
- Chaque théâtre a sa carte de Vénétie et son Signore, dont le décret ne s'applique qu'aux marchands du théâtre (avantages comme taxes). Les paliers d'Influence se calculent par théâtre.

**Référence.** OpenFront plafonne ses parties publiques. Une mêlée générale lisible tient en dizaines de joueurs, pas en centaines.

**Règle transgressée :** aucune.

**Coût :** L (`terra` devient un tableau dans l'état, le tick boucle, la vue est filtrée, le placement des PNJ est réparti).
**Impact :** nul aujourd'hui, critique au-delà de 40 humains actifs. À déclencher sur ce seuil, pas avant.
**Risque :** décrets concurrents entre théâtres sur un même Rialto. Le décret est limité aux membres du théâtre, et le Monopole ne taxe que leurs ventes.

---

## Ordre conseillé

1. **Tout de suite, avant le playtest** : E2-1, E2-3 et E2-2 (S chacun ; des corrections qui rendent honnête ce qui existe).
2. **Lot coopératif** : E2-4, puis E2-6, puis E2-5. Arbitrage écrit du porteur pour E2-5.
3. **Lot « revenir »** : E2-9, puis E2-7 et E2-10. Arbitrage pour E2-10.
4. **Dès que 20 humains au moins jouent ensemble** : E2-8.
5. **Au seuil de 40 humains actifs** : E2-11.

Dépendances avec plan-finalisation :
- terra-3 : ménage des familles et `chatRules.ts`, prérequis d'E2-8 et d'E2-10 ;
- ux-m3 : drapeau PNJ unique, qu'E2-1 réutilise ;
- live-1 : plafond global des notifications, qui couvre E2-2.
