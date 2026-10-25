# Expert 2 — Multijoueur, social, live-ops et modes de jeu : version finale

24 octobre 2026. Ce document applique le verdict du chef (`chef.md`). Aucun fichier du dépôt n'a été modifié.

Une seule mesure a été faite, par un script de travail, `scratchpad/measure/signore.ts`. Il importe `runTerra` du prototype sans rien toucher. Elle est détaillée en E2-1.

## Diagnostic (inchangé)

**Ce qui marche.** La Terraferme est fidèle à OpenFront en asynchrone. Le commerce entre joueurs est réel, la nuit et l'anti-pay-to-win sont tenus.

**Ce qui manque.**
1. Des PNJ qui ne sont pas des partenaires, et qui captent le Signore.
2. Aucun lien qui survive à la semaine.
3. Un jeu en direct qui exige une foule.
4. Aucun objectif commun qui dépende des humains.
5. Des mois tous identiques, et une fin de saison sans titre propre à la Terraferme.

---

### E2-1 — Le Signore est un marchand humain ; une maison qui se retire rend ses terres

Verdict chef : À CORRIGER, lot 0 → corrections appliquées : 1. drapeau `npc` posé par le serveur, testé ; 2. paliers d'Influence calculés sur le rang parmi les humains, Influence ajoutée mesurée ; 3. Signore humain avec une Gloire > 0 et au moins une case, mode en équipes compris ; 4. `terraWithdraw` testé ; 5. « ≈ 85 % » remplacé par une mesure ; 6. lot 0.

**Type :** correction. **Coût :** S. **Lot :** 0.

**Constat** (vérifié par le chef).
- `closeTerra` (`terraferma.ts:1266-1270`) ne filtre que les nations.
- Les PNJ tirent leur décret au hasard (`bots.ts:337-340`).
- `BotDriver.retire` (`apps/server/src/game/bots.ts:362-378`) n'annule que les ordres du Rialto.
- Le moteur n'a aucun drapeau PNJ.

**Mesure, qui remplace le « ≈ 85 % » calculé.**
- Protocole : prototype `runTerra` (règles de Venise), 40 marchands. Cinq d'entre eux sont tenus pour humains, tirés par graine : 2 assidus, 2 réguliers, 1 occasionnel. Les profils humains sont donc plus actifs que la moyenne, ce qui avantage les humains.
- Résultats, avant correction :

| Graines | Semaines avec un Signore PNJ | Influence de la Terraferme reçue par les 5 humains, par semaine (moyenne) |
| --- | --- | --- |
| 1 à 5 | 2 / 5 | 30,0 |
| 6 à 15 | 9 / 10 | 22,6 |
| **Total** | **11 / 15 (73 %)** | **25,1** |

- Après correction, par construction : 0 / 15 semaines avec un Signore PNJ. Aucune semaine n'est restée sans humain éligible (0 / 15).
- Influence des 5 humains par semaine : 60 (20 + 12 + 12 + 8 + 8). C'est **+34,9 par semaine pour 5 humains, soit environ +7 par humain**. L'écart se réduit quand le nombre d'humains grandit : à 40 humains, il est nul.
- La mesure contractuelle reste `pnpm sim --terra --players 5`. Le simulateur du commerce ne distingue pas encore humains et PNJ. Le premier commit de ce chantier ajoute donc l'option `--humans <n>` : n marchands marqués humains, tirés de la graine selon le mélange ci-dessus. Il consigne ensuite le tableau avant/après sur 5 graines dans calibration.md. Cible après : 0 %.

**Proposition.**
1. **Drapeau `npc`.** `TerraPlayer.npc` est posé par le serveur dans le contexte de la commande, à partir de `accounts.isBot` (`world.execute` le reçoit avec l'identité, jamais dans le corps de la commande). Test : un `terraPlace` humain qui porte `npc: true` dans son corps est refusé (`invalid_command`), et le joueur reste `npc: false`.
2. **Paliers d'Influence par rang humain.** Dans `closeTerra`, le rang qui sert aux paliers (signore, podium, top10, quarter, participant) se calcule parmi les seuls humains. Les PNJ restent au classement affiché, avec le badge d'`ux-m3` (aucun nouveau badge), sans palier ni Influence.
3. **Signore.** C'est le premier humain qui a une Gloire > 0 **et** au moins une case tenue à la clôture. S'il n'y en a aucun, il n'y a pas de décret. La même règle vaut pour `best` en semaine d'équipes (le meilleur humain éligible de l'équipe gagnante).
4. **`terraWithdraw`**, appelée par `retire()` :
   - cases rendues à la milice de leur terrain ;
   - fronts rappelés ;
   - alliances dissoutes, avec l'avis `terra_alliance_broken {reason: "withdrawn"}` à chaque allié.

   Tests sur la fixture : aucune case, aucun front ni aucune alliance ne reste au nom du retiré, et l'allié reçoit l'avis.
5. **Elo** (`terraRecord.ts`, `newRatings`) : les PNJ sortent du champ.

**Mesures de réussite :** test « Signore PNJ impossible » ; `pnpm sim --terra --players 5`, 5 graines, 0 % ; Influence ajoutée par semaine notée dans calibration.md.

**Règle transgressée :** aucune.
**Impact :** fort.
**Risque :** un humain faible devient Signore. La règle « au moins une case » le borne.

---

### E2-2 — Trois convocations d'escarmouche par jour

Verdict chef : À CORRIGER, lot 2 → corrections appliquées : 1. les trois convocations seulement, notification déclarée à E3-1 ; 2. la file de 30 minutes part dans IDEAS.md avec son seuil ; 3. une ligne dans `/admin` par créneau ; 4. plus de repli vers la Condotta. Coût revu.

**Type :** correction. **Coût :** S (créneaux, salle ouverte à l'avance, un type de notification) ; la file, qui était le M, est retirée. **Lot :** 2, en ligne en cours de mois (aucun effet de règle).

**Constat.**
- La salle dure 60 s et il faut 2 humains (`venice1450.settings.ts:322-327`).
- La probabilité qu'une partie soit classée vaut environ 2(N−1)/840 : 4,5 % à N = 20, 11,5 % à N = 50 (calcul validé par le chef).

**Proposition.**
- Réglage `skirmish.slots: ["12:30", "18:30", "21:15"]` (heure de Paris, dernière partie finie à 21 h 30).
- Pour chaque créneau, la salle s'ouvre 10 minutes avant (`skirmish.slotLobbyMinutes: 10`) et part à l'heure dite. Elle est complétée par des condottieri et classée s'il y a au moins 2 humains (règles d'aujourd'hui).
- Hors créneau : la salle de 60 s d'aujourd'hui, inchangée.
- Notification `skirmish_call`, 15 minutes avant, sur abonnement (coupée par défaut, réglable dans le Profil). Ce type est **déclaré à E3-1**, qui l'intègre à son plafond global de `notifier.ts`. E2-2 n'écrit aucun plafond et respecte les heures calmes.
- `/admin`, section « Escarmouches » : une ligne par jour et par créneau (12 h 30, 18 h 30, 21 h 15, hors créneau), avec les parties classées, les parties amicales et le nombre moyen d'humains.

**Mesure :** au moins 40 % de parties classées parmi celles lancées en convocation (critère du lot 2).

**Règle transgressée :** aucune.
**Impact :** fort pour le seul mode « ensemble, maintenant ».
**Risque :** des créneaux vides au début ; la mesure de novembre en décide.

---

### E2-3 — Les missions de la Maison mortes sous la Terraferme

Verdict chef : À CORRIGER, lot 0 → corrections appliquées : 1. liste de `plan-terraferme.md` l.116, troupes comptées chez l'émetteur ; 2. `terra_alliance_made` retiré ; 3. `project_delivery` retiré ; 4. `groupMax` de 2 et test d'émission ; 5. lot 0.

**Type :** correction. **Coût :** S. **Lot :** 0.

**Constat** (vérifié).
- `levy_collected`, `march_sent`, `assault_won`, `land_defended` et `work_built` ne sont émis que par `campaign.ts`, éteint quand `terraferma.live` est vrai (`venice1450.settings.ts:1137-1141`).
- Espérance perdue : 9,4 Influence sur 31,8 par tableau.

**Proposition.** Les 5 missions mortes sont remplacées par la liste de `plan-terraferme.md` l.116, toutes marquées `group: "terra"` :

| Mission | Événement | Nombre | Influence |
| --- | --- | --- | --- |
| Poser son comptoir de guerre | `terra_placed` (existe, `terraWorld.ts:358`) | 1 | 2 |
| Prendre des cases | `terra_cell_taken` (**nouveau**, émis par `terraWorld` pour chaque case de `s.taken` gagnée pendant la commande ou le pas) | 15 | 3 |
| Tenir une ville | `terra_cell_taken`, filtre `{city: true}` | 1 | 4 |
| Bâtir une Rocca | `terra_built`, filtre `{kind: "rocca"}` (existe, `terraWorld.ts:392`) | 1 | 3 |
| Envoyer des troupes à un allié | `terra_troops_sent` (**nouveau**, émis vers l'**émetteur** au cas `terraSend`, à côté de `terra_troops_received` qui va au destinataire, l.384) | 1 | 3 |

- Ni `terra_alliance_made` (émis vers le seul demandeur, et les PNJ acceptent tout), ni `project_delivery` (en attente d'E2-6).
- `house.missions.groupMax: { terra: 2 }`. `missionsOf` saute un tirage du groupe au-delà de 2 et prend la mission suivante dans l'ordre du tirage. La Terraferme reste facultative : au moins 8 missions de commerce par tableau.
- Pool final : 12 missions de commerce et 5 de la Terraferme. Espérance par tableau (8 missions de commerce à 3,17 en moyenne et 2 de la Terraferme à 3,0) : environ 31,3, soit l'espérance d'avant (31,8), mais entièrement faisable.
- Tests :
  - « chaque événement du pool est émis par au moins une commande quand `terraferma.live` » ;
  - « jamais plus de 2 missions `terra` par tableau sur 100 tableaux tirés ».

**Règle transgressée :** aucune.
**Impact :** moyen et immédiat.
**Risque :** nul.

---

### E2-4 — Des PNJ qui sont de vrais alliés

Verdict chef : À CORRIGER, lot 2 → corrections appliquées : 1. jamais de ducats d'un PNJ, testé ; 2. au plus un PNJ allié par humain ; 3. mesures au simulateur conservées ; 4. avance de session dans le pilote serveur, moteur pur ; 5. lot 2, en cours de mois.

**Type :** amélioration. **Coût :** M. **Lot :** 2, en ligne en cours de mois (comportement des PNJ, pas une règle).

**Constat** (vérifié). Les PNJ acceptent toute alliance et choisissent par ordre alphabétique (`bots.ts:343-357`). Ils ne secourent ni ne ripostent jamais, et ne signalent rien.

**Proposition** (`packages/engine/src/bots.ts`, pur).
- **Choisir.** Le PNJ propose d'abord l'alliance à un voisin humain sans allié PNJ, puis à un PNJ. Il refuse la demande d'un humain qui a déjà un allié PNJ : **au plus un PNJ allié par humain**.
- **Secourir.** Après un `help` d'un allié dans les 2 dernières heures, avec un front qui le vise, le PNJ envoie `min(25 % de ses troupes, giftShareBps)` par `terraSend`.
- **Riposter.** Si l'agresseur de son allié est son voisin, il lance un front contre lui à 30 % de ses troupes.
- **Parler.** `thanks` après un don reçu, `attack` sur la case qu'il vise (montré aux seuls alliés).
- **Trahir.** Seul le caractère « opportuniste » rompt, jamais avant le jeudi, avec le préavis de 2 h.
- **Jamais de ducats.** Un PNJ n'émet jamais `terraGift` ni aucun transfert de monnaie vers un joueur. Test moteur : sur une semaine de la fixture, aucune écriture `terra_gift` n'a un PNJ pour débiteur.
- **Réactivité.** Le pilote serveur (`apps/server/src/game/bots.ts`, `BotDriver`) avance la session du PNJ à 30 minutes au plus tard après un `help` d'un allié. Le moteur ne connaît pas le temps réel.

**Mesures** (`pnpm sim --terra`, 5 graines) :
- écart de cases médianes entre humains alliés à un PNJ et non alliés ≤ +30 % ;
- éliminés ≤ 2 par semaine.

**Règle transgressée :** aucune.
**Impact :** fort à faible population.
**Risque :** porter un humain passif ; l'écart de +30 % le borne.

---

### E2-5 — La Condotta → IDEAS.md

Verdict chef : REFUSÉ → réduite à une entrée IDEAS.md.

> **Condotta (coopération de 1 à 4 joueurs contre les nations, sur le moteur des escarmouches)** — Refus maintenu pour ce cycle : deuxième mode de guerre, et récompense économique écartée.
> Déclenchement : au moins 30 % des actifs humains jouent une escarmouche par semaine en novembre (`/admin`).
> Si l'idée revient : aucune récompense en ducats, en marchandises ni en accès à la Muda.

---

### E2-6 — L'Arsenal de la semaine : la commande de compagnie à paliers

Verdict chef : À CORRIGER, lot 2, en ligne le 1er décembre → corrections appliquées : 1. la commande hebdomadaire remplace celle des 2 jours ; 2. monnaie chiffrée par palier, Or ≤ 1,5 ×, prime au-delà du Bronze à +5 % ; 3. Influence de l'Or soumise à 2 % du palier **et** une unité livrée après le Bronze ; 4. PNJ au Bronze seulement, testé ; 5. 1er décembre.

**Type :** amélioration. **Coût :** S à M. **Lot :** 2, en ligne le 1er décembre, sous l'accord du porteur (décision 6).

**Constat** (vérifié). Les PNJ livrent leur part (`bots.ts:681-690`). À 35 PNJ sur 40, la commande se remplit à environ 87 % sans humain.

**Proposition.**
- **Une commande par semaine**, du lundi au dimanche, qui **remplace** la commande tous les 2 jours (`projects.intervalDays` 2 → 7, `durationDays` 2 → 7).
- **Bronze** = 3,5 fois le besoin d'aujourd'hui par actif : 14 pains, 10,5 briques et 10,5 planches, arrondis à 14, 11 et 11. C'est le même volume hebdomadaire qu'aujourd'hui.
- **Argent** = Bronze × 1,25, **Or** = Bronze × 1,5 (`projects.tiersBps: [10_000, 12_500, 15_000]`).
- Prime de livraison : +10 % jusqu'au Bronze, **+5 % au-delà** (`projects.premiumAboveBps: 500`). Le bonus de +10 % au Bronze est gardé ; il n'y a pas de bonus en monnaie aux paliers supérieurs.

**Monnaie créée par actif et par semaine**, aux prix de référence (pain 1,80 d, brique et planche 2,20 d), commande remplie :

| | Biens livrés | Paiement | Bonus | Total | Rapport à aujourd'hui |
| --- | --- | --- | --- | --- | --- |
| Aujourd'hui (3,5 commandes à +10 % et +10 %) | 71,4 d | 78,5 d | 7,9 d | **86,4 d** | 1,00 × |
| Bronze | 71,4 d | 78,5 d | 7,9 d | **86,4 d** | 1,00 × |
| Argent (+17,9 d de biens à +5 %) | 89,3 d | 97,3 d | 7,9 d | **105,2 d** | 1,22 × |
| Or (+35,7 d de biens à +5 %) | 107,1 d | 116,0 d | 7,9 d | **123,9 d** | **1,43 ×** ≤ 1,5 × |

(Avec +10 % au-delà du Bronze, l'Or ferait 125,7 d, soit 1,45 ×. Le +5 % exigé garde la marge.)

**Effets des paliers**, sans création de monnaie :
- Argent : lot de la Muda +25 % aux galères de la semaine suivante (le puits est gardé).
- Or : galère de l'Arsenal sur la carte la semaine suivante, « Livre d'or » des contributeurs dans la gazette, et 3 Influence à chaque contributeur qui a livré **au moins 2 % du palier Or et au moins une unité après le Bronze**.

**PNJ :** ils livrent au plus leur part, et seulement tant que le Bronze n'est pas atteint. Test moteur : une fois le Bronze atteint, aucune `project_delivery` d'un PNJ n'est acceptée par le pilote (`bots.ts`). Le contrôle se fait côté PNJ, pas dans la règle.

**Mesures :** `pnpm sim`, 5 graines conformes, masse ≤ 2,5 ×, monnaie créée par l'Arsenal ≤ 1,5 × l'actuelle (relevée dans calibration.md). En novembre, `/admin` : part des semaines à l'Argent et à l'Or.

**Règle transgressée :** le gel des mécaniques (refonte d'un système du lot du 20 octobre), levé par le chef sous l'accord du porteur.
**Impact :** moyen à fort.
**Risque :** l'Or inatteignable avec peu d'humains. On l'accepte : l'Argent reste l'objectif réaliste.

---

### E2-7 — Les ligues → IDEAS.md

Verdict chef : REFUSÉ pour ce cycle → réduite à une entrée IDEAS.md, propriétaire des ligues (avec E1-9).

> **Ligues hebdomadaires (groupes de 10, cinq divisions, montée et descente ; reprend les divisions d'E1-9)** — Écartées tant qu'une ligue serait surtout remplie de PNJ.
> Déclenchement : au moins 60 humains actifs sur une semaine (`/admin`).
> La métrique reste les ventes nettes ; les PNJ ne prennent ni montée ni récompense.

---

### E2-8 — Compagnies : un groupe d'amis qui survit au mois, sans trésor (fusion avec E3-7)

Verdict chef : À CORRIGER, lot 2 → corrections appliquées : 1. 2 à 6 membres, couche compte, sans `world_id` ; 2. lien `?ref=…&co=…` et région manquante mise en avant (repris d'E3-7) ; 3. périmètre exact de ce qu'elle donne ; 4. liste exacte de ce qu'elle ne donne pas ; 5. prérequis `terra-3` (étapes 0 et 1) et E3-2 ; 6. mesures ; 7. lot 2, en cours de mois.

**Type :** nouvelle fonctionnalité. **Coût :** M. **Lot :** 2, en ligne en cours de mois (aucun effet de règle), sous l'accord du porteur (décision 3).

**Prérequis :**
- `terra-3`, étapes 0 et 1 : ménage des familles et `chatRules.ts` extrait avec ses tests inchangés ;
- E3-2 : normalisation des e-mails (`email_canonical`) en production.

**Proposition.**
- **Structure.** De 2 à 6 membres, au niveau du compte. Tables `companies` et `company_members` sans `world_id`, comme `accounts` : la compagnie survit aux saisons. On la quitte librement, avec un délai de 7 jours avant d'en rejoindre une autre.
- **Entrée** (repris d'E3-7). Profil, puis « Inviter un associé » : lien `/?ref=<code>&co=<id>`. L'invité arrive sur le choix de la région avec celle qui manque à la compagnie mise en avant (« Votre compagnie a un boulanger : devenez briquetier »). Si les trois régions sont prises, aucune n'est mise en avant.
- **Ce qu'elle donne, et rien d'autre :**
  1. un fil de compagnie sur `chatRules.ts` (280 caractères, filtre, sans liens, rythme, masquage au troisième signalement) ;
  2. la convocation d'escarmouche « avec ma compagnie » (E2-2) : les membres reçoivent `skirmish_call` pour le créneau qu'un membre a choisi, dans le plafond d'E3-1 ;
  3. un palmarès commun (saisons jouées ensemble, titres de ses membres) ;
  4. un marquage « ami » des membres sur la carte de la Terraferme (liseré, pas d'alliance).
- **Ce qu'elle ne donne pas :** ni trésor, ni transfert, ni offre réservée, ni prime, ni semaine en équipes par compagnie, ni alliance automatique. Les règles d'alliance (2 au plus) ne changent pas.

**Mesures** (`/admin`, humains) :
- invitations envoyées par joueur (cible du CADRAGE : 0,5) ;
- J7 des membres d'une compagnie comparé à celui des joueurs seuls.

**Référence :** les corporations de Hades' Star ; dans E3-7, les guildes de Forge of Empires.

**Règle transgressée :** la décision du porteur du 17 octobre (« chacun pour soi », familles retirées) et le report du fil d'alliance, levés par le chef sous l'accord du porteur. Raison : un groupe choisi et sans pouvoir économique.

**Impact :** le plus fort sur J30 et sur le retour d'une saison à l'autre.
**Risque :** écrans vides. La compagnie n'apparaît qu'à qui invite ou est invité.

---

### E2-9 — Le mutateur du mois (propriétaire, catalogue repris d'E1-8)

Verdict chef : À CORRIGER, lot 2, en ligne le 1er décembre → corrections appliquées : 1. novembre sans mutateur ; 2. premier tirage pour le 1er décembre, annoncé le 24 novembre ; 3. catalogue de 3, dont au moins un de commerce pur, aucun réservé à la Terraferme ; 4. clés interdites refusées par le schéma, testé ; 5. option `--mutator`, 5 graines, une ligne dans calibration.md ; 6. tirage déterministe, sans choix par le Doge. Catalogue tiré d'E1-8 (clés existantes seulement).

**Type :** live-ops. **Coût :** S pour le mécanisme ; validation de chaque mutateur par E1. **Lot :** 2, en ligne le 1er décembre, sous l'accord du porteur (décision 5).

**Proposition.**
- **Mécanisme.**
  - `theme.seasonMutators: [{ code, weight, override }]`.
  - À l'ouverture d'une saison (`season.ts`), le tirage `draw(ctx, "mutator:<mois>")`, déterministe et tiré du secret du monde, choisit un mutateur.
  - Son `override` est fusionné dans `worlds.settings` du monde suivant.
  - Le texte est écrit en tête de `fr.game.seasonNotes`.
- **Calendrier.**
  - Novembre 2026 se joue **sans mutateur** : c'est la saison de référence.
  - Le premier tirage, pour le 1er décembre, est fait et annoncé dans `seasonNotes` le 24 novembre.
  - Ensuite, chaque mois, le 24.
- **Garde-fou dans le schéma** (`settings.ts`). `override` n'accepte qu'une **liste blanche** de chemins : `cities.*.*.basePrice`, `cities.*.*.dailyCapacityPerPlayer`, `muda.lotPerActivePlayer`, `muda.priceRiseBps`, `terraferma.milan.troops`. Tout autre chemin est refusé : en particulier `pass.*`, le grand livre, les quotas de la Dogana (`marketMaker.*`), `openHours`, les heures calmes et `battle`. Test `settings.test.ts` : un override sur `pass.perks`, `marketMaker.playerBuyPerDay` ou `terraferma.openHours` est refusé.
- **Catalogue de départ : 3 mutateurs, tous tirés d'E1-8 et réduits aux clés existantes.**

| Code | Effet (clés existantes) | Domaine |
| --- | --- | --- |
| `embargo_ottoman` — Embargo ottoman | `muda.lotPerActivePlayer` ÷ 2, `muda.priceRiseBps` × 2 | commerce pur |
| `grand_gel` — Grand gel | `cities.*.planks.basePrice` +20 %, `cities.*.wood.dailyCapacityPerPlayer` +30 % | commerce pur |
| `guerra_milano` — Guerre de Milan | `terraferma.milan.troops` × 1,5 ; `cities.*.bricks.basePrice` et `cities.*.planks.basePrice` +25 % | commerce et Terraferme (pas seulement la Terraferme) |

  La « Peste » d'E1-8 attend E1-4, comme l'a décidé le chef. Le Jubilé, la Sensa prolongée, la Carestia et les Bombardes sont écartés du départ : ils demandent des clés absentes de la liste blanche ou ne touchent que la Terraferme.
- **Validation.** Option `pnpm sim --mutator <code>` ; chaque mutateur passe 5 graines conformes (masse ≤ 2,5 ×, indice des prix dans sa plage) avec une ligne dans calibration.md, fournie par E1. Un mutateur non conforme sort du catalogue.

**Règle transgressée :** le gel (nouvelle mécanique de saison), levé par le chef sous l'accord du porteur. Compatible avec « une règle stable dans le mois ».
**Impact :** fort sur le retour du 1er du mois.
**Risque :** un mutateur déséquilibré pendant un mois ; d'où la liste blanche et la simulation.

---

### E2-10 — Les titres de fin de mois

Verdict chef : À CORRIGER (réduite) → corrections appliquées : 1. titres au palmarès seulement, sans effet économique ni Renommée ; 2. présents pour la cérémonie du 30 novembre ; 3. élection du Doge en entrée IDEAS.md.

**Type :** nouvelle fonctionnalité (cosmétique). **Coût :** S. **Lot :** 2, en ligne en cours de mois, avant la cérémonie du 30 novembre.

**Proposition.**
- **Capitano generale della Terraferma** : l'humain qui a reçu le plus d'Influence de la Terraferme sur le mois (somme des `influence_earned {source: "terraferma"}`, PNJ exclus). En cas d'égalité, la Gloire cumulée départage.
- **Gonfalone** : le Signore humain de la dernière semaine du mois, privé de décret (`terraWorld.ts:239`).
- Les deux titres s'inscrivent au palmarès (`season.ts`, `palmares`) et s'affichent à la cérémonie (`Ceremony.tsx`). **Aucune Renommée, aucun Pass, aucun effet économique.**
- Test : la clôture de saison sur la fixture attribue les deux titres à des humains, et aucun quand aucun humain n'est éligible.

Entrée IDEAS.md :

> **Élection du Doge en fin de mois (les 5 premiers humains candidats, un vote par compte vérifié, le Doge choisit le mutateur suivant parmi 3)** — Reportée.
> Déclenchement : alias e-mail normalisés (E3-2) **et** au moins 50 votants éligibles (e-mail vérifié, 7 jours actifs dans la saison).
> Choix limité au catalogue validé d'E2-9.

**Règle transgressée :** aucune (cosmétique).
**Impact :** moyen : un enjeu de Terraferme sur le mois.
**Risque :** nul.

---

### E2-11 — Les théâtres → IDEAS.md

Verdict chef : REFUSÉ → réduite à une entrée IDEAS.md.

> **Théâtres de la Terraferme (40 marchands au plus par carte, un Signore et un décret par théâtre)** — Écartés : chantier L sans foule à servir.
> Déclenchement : 30 humains actifs dans la Terraferme sur une semaine, **ou** une demande du test de charge (vue Terraferme trop lente ou trop lourde).
> Constat à reprendre : une seule carte de 25 cases par actif (`terraferma.ts:331`).

---

### Entrée IDEAS.md issue d'E2-2 : la file d'attente d'escarmouche

> **File d'escarmouche classée (place tenue 30 min, notification « partie trouvée », absents remplacés par des condottieri)** — Reportée derrière les convocations d'E2-2.
> Déclenchement : moins de 40 % de parties classées parmi celles lancées en convocation, sur les deux dernières semaines de novembre (`/admin`).
> Notification déclarée à E3-1, dans son plafond global.

---

### Annexe B, point 2 — Le kit de campagne périmé (propriétaire E2, lot 0)

Verdict chef : lot 0, propriétaire E2 → à appliquer dans `docs/marketing/campagne.md`.
- **l.14** : « Les grandes familles… » devient « **La Terraferme** : chacun pose son camp, s'étend, s'allie ; le Signore de la semaine impose un décret au marché ».
- **l.22** : « une salle par famille » devient « #terraferme ».
- **l.25** : « 2 nov. Ouverture des familles… post 04 » devient « 2 nov. La Terraferme s'ouvre après la première journée de commerce : post 04 "Posez votre camp" ».
- **l.26** : « famille gagnante » devient « le Signore de la semaine et son décret ».
- **l.34** : « carte des familles » devient « carte de la Terraferme ».
- **l.53** : la ligne devient « Chaque semaine, la Terraferme se dispute à la manière d'OpenFront ; le Signore impose son décret au marché la semaine suivante ».
- **l.76** : « grandes familles » devient « la Terraferme ».
- **l.85** : `post-04-familles` devient `post-04-terraferme` (« Posez votre camp, prenez la Terraferme »).
- **l.100 et l.102** : les captures et `mock.mjs` mettent en scène une semaine de Terraferme, et non plus de familles.

Critère : `grep -n -i "famille" docs/marketing/campagne.md` ne renvoie plus rien qui promette une mécanique.

---

## Récapitulatif

| Proposition | Verdict | Lot |
| --- | --- | --- |
| E2-1 Signore humain, `terraWithdraw` | corrigée | 0 |
| E2-3 Missions mortes | corrigée | 0 |
| Kit de campagne | — | 0 |
| E2-2 Convocations | corrigée | 2 (en cours de mois) |
| E2-4 PNJ alliés | corrigée | 2 (en cours de mois) |
| E2-8 Compagnies | corrigée, fusion avec E3-7 | 2 (en cours de mois, accord du porteur) |
| E2-10 Titres de fin de mois | réduite | 2 (avant le 30 novembre) |
| E2-6 Arsenal à paliers | corrigée | 2 (1er décembre, accord du porteur) |
| E2-9 Mutateur du mois | corrigée, catalogue d'E1-8 | 2 (1er décembre, annoncé le 24 novembre, accord du porteur) |
| E2-5, E2-7, E2-11, file d'E2-2, élection du Doge | IDEAS.md avec leur seuil | — |
