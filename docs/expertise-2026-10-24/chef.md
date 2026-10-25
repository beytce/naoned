# Le Chef : verdict sur les 32 propositions (24 octobre 2026)

Dépôt à `431b862`. J'ai vérifié moi-même les affirmations décisives (liste en annexe A). Je n'ai modifié aucun fichier du dépôt. Il n'y aura qu'un seul aller-retour : chaque correction demandée ci-dessous est un contrat. Si elle n'est pas faite, la proposition tombe.

---

## 1. Verdict général

1. **Ce que l'équipe a vu juste.** Le défaut central est économique : la demande est fixe et la production croît avec les niveaux (E1). Le Signore et les missions de la Maison récompensent des ordinateurs ou des événements morts (E2). La défense « un compte par e-mail » est fictive, et la vitrine du 1er novembre n'est pas prête (E3). Tout cela est vrai dans le code.
2. **Ce qu'elle a raté.** Un bogue qui touche tous les joueurs : `Comptoir.tsx:610` lit l'étape de tutoriel `invest`, que le serveur n'enregistre jamais (`tutorial.ts` ne connaît que 6 étapes). La feuille de production propose donc **1 lot par défaut, pour toujours**. Deuxième oubli : le kit de campagne (`docs/marketing/campagne.md` l.25, 76) vend encore « grandes familles » et « Prêtez allégeance » le 2 novembre, alors que les familles sont retirées. Troisième oubli : les alliés s'envoient jusqu'à 50 d par jour (`terra_gift`), un canal ouvert aux multi-comptes faits d'alias.
3. **Ses fautes.** Chiffres faux sur l'amélioration (E3-3 : le niveau 2 coûte 283,5 d et 11+11 matériaux, et il fait ×2,5 et non +25 %). Une seule graine de simulation pour E1. Un « ≈ 85 % » de Signore PNJ calculé, pas mesuré (E2-1). Des coûts « S » qui sont des M (E2-2). Et trois experts qui écrivent chacun leur compagnie, leur mutateur ou leur ligue.
4. **La direction que je fixe.** Le 1er novembre, on lance un jeu de commerce **honnête et dormant** : plus de commandes la nuit, plus de récompense volée par un PNJ, plus de système non simulé (prêts et entrepôts coupés). En novembre, on construit **la croissance par la demande** (fondaci) et **la règle du mois**, qui partent ensemble le 1er décembre. Le social se limite à une compagnie d'amis sans aucun pouvoir économique. Aucun deuxième mode de guerre. Aucune ligue avant d'avoir une population.
5. **Règle de calendrier, sans exception.** Les joueurs arrivent le 1er novembre. Toute modification de règle qui n'est pas fusionnée sur `main` **le 31 octobre à 18 h** (heure de Paris) part le **1er décembre**, avec ses notes de saison. Les corrections de bogue et d'interface peuvent partir en cours de mois.

---

## 2. Doublons et arbitrages (un seul propriétaire par sujet)

| Sujet | Propositions | Propriétaire | Ce qui est repris des autres |
| --- | --- | --- | --- |
| Règle du mois (mutateur) | E1-8, E2-9, E2-10 (le choix par le Doge) | **E2 (E2-9)** | Du catalogue d'E1-8 : seuls les mutateurs qui utilisent des clés de réglage existantes. Le choix par le Doge (E2-10) est refusé pour ce cycle. E1 fournit la validation au simulateur de chaque mutateur. |
| Ligues et divisions | E1-9, E2-7 | **E2 (E2-7)**, envoyée dans IDEAS.md | E1-9 est refusée (doublon). E2 rédige l'entrée IDEAS avec son seuil de déclenchement. |
| Compagnie d'amis | E2-8, E3-7 | **E2 (E2-8)** | D'E3-7 : le lien d'invitation et la région manquante mise en avant à l'arrivée de l'invité. Les offres réservées à la compagnie sont refusées (canal de transfert entre multi-comptes). |
| Notifications : rendez-vous, gazette, plafond, vague, série | E3-1, E3-10 (rappel de 19 h), E2-2 (convocations), live-1, terra-3, loop-1 | **E3 (E3-1)**, seul propriétaire du plafond global dans `notifier.ts` | E2-2 et E3-10 déclarent leurs types de notification à E3-1 et n'écrivent aucun plafond eux-mêmes. |
| Vagues de commandes | E1-1, E1-2, E3-1 (notification de vague), E1-6 (Roulier) | **E1 (E1-1 + E1-2)** | E3-1 lit les heures de vague dans les réglages et n'en code aucune en dur. |
| Missions de la Maison | E2-3 (contenu mort), E1-7 (cadence hebdomadaire) | **E2-3** pour la correction de lot 0 ; **E1-7** pour la refonte en Carnet (lot 2) | E1-7 repart du pool corrigé par E2-3. |
| Entrepôts et prêts | E1-3, E1-5 | **E1 (E1-5)** pour la coupure, **E1-3** pour le remplacement | — |
| Mesure de l'entonnoir, alias e-mail, invité | E3-2, `ftue-3` (refusé) | **E3 (E3-2)** | — |
| Fin de mois (titres) | E2-10, le Gonfalone, `loop-3` | **E2 (E2-10 réduite)** | — |
| Sceau PNJ | E2-1, `ux-m3` (livré) | `ux-m3` reste le seul propriétaire de l'affichage | E2-1 ajoute un drapeau dans le moteur, sans aucun nouveau badge. |

---

## 3. Verdict par proposition

### Expert 1

**E1-1, plus aucune vague la nuit : À CORRIGER.**
Constat vérifié : `packages/engine/src/deliveries.ts:653-657`, `opensAt = dayStart + (rank % perDay) × 4 h`. Les vagues s'ouvrent donc à 0 h et à 4 h, et celle de 20 h reste ouverte jusqu'à 4 h. Corrections exigées :
1. Réglage `waves: { hours: [8, 11, 14, 17, 20], openHours: 8 }`. Les heures s'entendent **à l'horloge de Paris** (`hourIn`), pas en décalage depuis `dayStart`, qui avance par tranches de 24 h depuis `startAt` et dérive d'une heure à chaque changement d'heure. Test sur la fixture : un jour de passage à l'heure d'hiver et un jour de passage à l'heure d'été.
2. Les commandes ouvertes à 17 h et à 20 h expirent le lendemain à 10 h. Leur période réservée d'E1-2 se décompte **en heures ouvertes (8 h à 22 h)**. Un insomniaque ne peut donc pas vider la vague de 20 h à 23 h 30.
3. Même règle pour les **urgentes** : aucune `opensAt` entre 22 h et 8 h. Vérifiez leur ouverture et dites-le explicitement.
4. Tests : aucune `opensAt` dans [22 h, 8 h) sur 31 jours de fixture ; total de commandes du jour inchangé à ±1 ; `pnpm sim` sur 5 graines, toutes conformes ; une ligne dans calibration.md.
5. Lot 1. Si la proposition n'est pas fusionnée le 31 octobre à 18 h, elle part le 1er décembre.

**E1-2, une part réservée de chaque vague : À CORRIGER.**
Le diagnostic (course au clic) est juste. Les chiffres viennent d'**une seule graine** : c'est insuffisant. Corrections exigées :
1. Mesurez les trois chiffres de base (commandes perdues par session, part des prises dans la première heure, écart entre assidus et occasionnels) sur les **5 graines**, avant et après, dans le même tableau. La médiane fait foi.
2. Réglages `deliveries.waves.capPerMerchant: 3` et `capMinutes: 90`. Le plafond compte **par compte**, tous véhicules confondus. Il s'applique aux PNJ comme aux humains, avec un test pour chacun.
3. La nouvelle cible d'écart (assidus ≤ 150 % devant les occasionnels en ventes nettes) contredit la lecture naïve du CADRAGE l.377 (« 5 à 10 % »), qui ne vise que les bonus de présence. Écrivez la distinction dans calibration.md et soumettez-la au porteur (décision 9).
4. Affichage : « Réservée aux retardataires encore 47 min » se calcule en heures ouvertes (voir E1-1, point 2).
5. Cibles conservées : ≤ 10 commandes perdues par session, ≥ 88 % de commandes prises.
6. Lot 1, avec la même date butoir.

**E1-3, les fondaci : À CORRIGER.**
C'est la meilleure proposition du lot. Elle traite la cause du « peu l'impression de se développer » et elle retire un système. Corrections exigées :
1. Prouvez le plafonnement du revenu dès J+5 sur **5 graines** : ratio des ventes nettes par jour J20-J29 / J4-J8, Sensa exclue, avec la médiane et l'écart entre graines.
2. Un tableau de la monnaie créée **par jour** : par fondaco et par niveau, pour un marchand médian à 1, 2 et 3 fondaci, comparée aux commandes communes retirées (`sharedOrdersPerActivePlayer` de 4 à 2). Cible : monnaie payée par joueur actif et par jour à ±10 % d'aujourd'hui.
3. Les PNJ ouvrent et montent des fondaci dans le simulateur **avant** toute mise en ligne. C'est la leçon de `loop-m1` : sans cela, la proposition est refusée.
4. Le prix des commandes personnelles reste sous le prix du tableau commun (suggestion : −5 %). Sinon le fondaco tue le tableau. Justifiez le chiffre retenu.
5. Coûts : les ducats sont détruits par une écriture `ledger_entries`, les matériaux sortent par `stock_movements`. Aucune exception.
6. Retrait des entrepôts par les réglages (`warehouses.perCity: 0`), comme E1-5.
7. Interface : une seule feuille par ville, aucune nouvelle porte dans le HUD.
8. Livrable : le plan d'abord, validé par le porteur, puis le code en novembre, en ligne le **1er décembre**.
Règle levée : le gel des mécaniques (hors du lot du 20 octobre). Raison : c'est la seule proposition qui attaque la cause du constat du porteur, et elle remplace les entrepôts au lieu de s'y ajouter. Elle reste soumise à son arbitrage écrit (décision 1).

**E1-4, des rations au lot lancé : À CORRIGER.**
Corrections exigées :
1. Un marchand sans pain n'est **jamais bloqué** : le lot démarre ralenti (`slowdownBps` actuel), comme aujourd'hui. Les lots du tutoriel (`fastBatchesPerBuilding`) sont exemptés. Testez les deux cas sur la fixture.
2. Le prélèvement passe par `stock_movements`, en entiers. Écrivez la règle d'arrondi exacte (« 1 pain tous les 2 lots » : sur quel compteur, remis à zéro quand ?).
3. Mesurez la consommation réelle par comptoir et par jour sur 5 graines, à la place de votre estimation de « 40 à 80 ». Le simulateur la donne.
4. Cibles conservées : pain ≥ 75 % de la référence ; matières premières ≥ 65 % ; Vénétie ≤ 115 % des autres régions.
5. Lot 2, en ligne le 1er décembre, à faire passer **avant** E1-3 dans le simulateur (les deux jouent sur les mêmes cours).

**E1-5, couper les prêts et les entrepôts : VALIDÉ.**
Vérifié : `turnover.ts`, `COSTS` ne contient pas les intérêts, donc l'emprunt ne coûte rien au classement. Calibration.md l.1150 confirme que les PNJ ne prennent « ni entrepôts ni prêts ». Mise en œuvre : `loans.maxAmount: 0` et `warehouses.perCity: 0`, avec un test qui prouve que le schéma zod accepte 0 et que les commandes sont refusées. Les entrées d'interface disparaissent. `loop-m1` est clos sans objet. Lot 1. C'est un retour sur le lot du 20 octobre : il faut l'accord du porteur (décision 2).

**E1-6, des maîtrises sur la vraie contrainte : À CORRIGER.**
Corrections exigées :
1. La partie Roulier dépend d'E1-2 : livrez-la après.
2. La partie Négociant (quota Dogana ×3, plancher à 85 %) **crée de la monnaie** : chiffrez-la par jour sur 5 graines. Passez le plancher à 80 % si la masse monétaire dépasse 2,5 × le capital.
3. Les urgentes visibles 20 minutes plus tôt : c'est de l'information, donc acceptable. Elles ne sont pas prenables plus tôt.
4. Cibles conservées : aucune maîtrise au-dessus de 40 % des choix ; ≤ 10 % d'écart à profil égal.
5. Lot 2, en ligne le 1er décembre.

**E1-7, un seul carnet : À CORRIGER.**
Corrections exigées :
1. Partez du pool corrigé par E2-3.
2. Donnez le tableau exact : 8 missions par semaine, l'Influence de chacune, et l'Influence espérée par semaine. Cible : égale, à ±5 %, à 2 × l'espérance actuelle **corrigée** (missions mortes exclues).
3. Le nom « Carnet » est déjà pris par « Carnet du jour » dans les Avis et par le tiroir `ux-1` (« Carnet de route »). Choisissez un seul nom et une seule porte : pas de troisième carnet.
4. Lot 2, en ligne le 1er décembre (le rythme de l'Influence est une règle).

**E1-8, le mutateur du mois : REFUSÉ (doublon).** Fusionné dans E2-9. Vos mutateurs entrent au catalogue s'ils n'utilisent que des clés de réglage existantes. La « Peste » attend E1-4.

**E1-9, des divisions : REFUSÉ (doublon).** Fusionné dans E2-7, qui part elle-même dans IDEAS.md.

**E1-10, des privilèges d'ouverture : REFUSÉ.** Pas avant d'avoir vu une saison réelle d'Influence ni avant les fondaci, dont dépend le « Fondaco héréditaire ». Rédigez une entrée IDEAS.md avec sa mesure de déclenchement : Influence médiane non dépensée ≥ 100 à J30 chez les humains, en décembre.

### Expert 2

**E2-1, un Signore humain, une maison qui se retire rend ses terres : À CORRIGER.**
Vérifié : `closeTerra` (`terraferma.ts:1266-1270`) ne filtre que les nations, et `bots.ts:337-340` tire le décret au hasard. `BotDriver.retire` (`apps/server/src/game/bots.ts:362-378`) n'annule que les ordres du Rialto. Le moteur n'a aucun drapeau PNJ. Corrections exigées :
1. Le drapeau `npc` est posé **par le serveur** à partir de `accounts.isBot`, dans le contexte de la commande. Il ne vient jamais d'un champ que le client peut envoyer. Test : une commande `terraPlace` d'un humain qui porte `npc: true` est ignorée ou refusée.
2. Les paliers d'Influence (podium, top 10, premier quart) se calculent **sur le rang parmi les humains**. Les PNJ restent affichés mais transparents. Mesurez l'Influence ajoutée par semaine.
3. Signore : un humain avec une Gloire > 0 **et au moins une case tenue à la clôture**. Sans un tel humain, il n'y a pas de décret. Même règle pour le mode en équipes (`best`).
4. `terraWithdraw` : cases rendues à la milice, fronts rappelés, alliances dissoutes avec l'avis `terra_alliance_broken`, raison `withdrawn`, testé.
5. Remplacez « ≈ 85 % » par une mesure : `pnpm sim --terra --players 5`, sur 5 graines, part des semaines avec un Signore PNJ avant et après. Cible après : 0 %.
6. Lot 0.

**E2-2, des escarmouches classées qui ont lieu : À CORRIGER.**
Le calcul de probabilité est juste. Le coût « S » est faux : une file tenue 30 minutes, avec notification et remplacement, c'est un M. Corrections exigées :
1. Lot 2 : **les trois convocations seulement** (12 h 30, 18 h 30, 21 h 15), salle ouverte 10 minutes avant, avis 15 minutes avant, sur abonnement. Notification déclarée à E3-1, dans son plafond.
2. La file de 30 minutes va dans IDEAS.md, déclenchée si moins de 40 % des parties lancées en convocation sont classées sur les deux dernières semaines de novembre.
3. Une ligne dans `/admin` : parties classées et amicales par créneau.
4. Aucun repli vers la Condotta (refusée).

**E2-3, les missions mortes : À CORRIGER.**
Vérifié : les 5 événements ne sont émis que par `campaign.ts`, mort quand `terraferma.live`. L'espérance est de 9,4 Influence sur 31,8 par tableau. Corrections exigées :
1. Suivez la liste déjà décidée dans `docs/plan-terraferme.md` l.116 : poser son comptoir, prendre N cases, tenir une ville, bâtir une Rocca, envoyer des troupes à un allié (`terra_troops_received`, compté chez l'émetteur).
2. Refusez `terra_alliance_made` : il n'est émis que vers le demandeur (`terraWorld.ts:376`), et les PNJ acceptent toute demande. Ce serait de l'Influence gratuite.
3. Refusez `project_delivery` tant qu'E2-6 n'est pas en ligne.
4. Plafond `groupMax` de 2 missions Terraferme par tableau, et le test « chaque événement du pool est émis par au moins une commande quand `terraferma.live` ».
5. Lot 0 (une correction de bogue, pas une règle).

**E2-4, des PNJ vrais alliés : À CORRIGER.**
Corrections exigées :
1. Un PNJ ne donne **jamais de ducats** : ni `terra_gift`, ni rien d'autre. Test exigé.
2. Au plus un PNJ allié par humain.
3. Mesures au simulateur conservées : écart de cases ≤ +30 % entre humains alliés à un PNJ et non alliés, éliminés ≤ 2 par semaine, sur 5 graines.
4. L'avance de session à 30 minutes reste dans le pilote serveur, et le moteur reste pur.
5. Lot 2. Mise en ligne en cours de mois autorisée : c'est un comportement des PNJ, pas une règle.

**E2-5, la Condotta : REFUSÉ.** Un deuxième mode de guerre de 12 minutes dans un jeu de commerce de 3 minutes, avant même de savoir si quelqu'un joue le premier. La récompense « lettre de la Muda » achète en plus un avantage économique avec du temps de jeu de guerre. Le refus d'IDEAS.md est maintenu. Entrée IDEAS mise à jour, avec sa mesure : au moins 30 % des actifs jouent une escarmouche par semaine en novembre.

**E2-6, l'Arsenal de la semaine : À CORRIGER.**
Vérifié : `bots.ts:681` fait livrer leur part aux PNJ. Corrections exigées :
1. La commande hebdomadaire **remplace** la commande tous les 2 jours (pas les deux à la fois).
2. Chiffrez la monnaie créée par semaine aux paliers Bronze, Argent et Or, comparée à aujourd'hui. Plafond : création totale ≤ 1,5 × l'actuelle à Or. Si ce plafond ne tient pas, baissez la prime de livraison au-delà du Bronze à +5 %.
3. Les 3 Influence de l'Or exigent un minimum absolu de 2 % du palier **et** au moins une unité livrée après le Bronze.
4. Les PNJ ne livrent qu'au Bronze, avec un test.
5. Lot 2, en ligne le 1er décembre.
Règle levée : le gel (refonte d'un système du lot du 20 octobre en objectif commun, idée « L'Arsenal arme une flotte » d'IDEAS.md). Raison : c'est le premier objectif où la présence humaine change le résultat, et il ne crée pas de nouveau système. Accord du porteur requis (décision 6).

**E2-7, ligues de dix : REFUSÉ (pour ce cycle).** Une ligue de 10 remplie de PNJ est une course contre l'ordinateur. Rédigez l'entrée IDEAS.md (propriétaire des ligues, avec ce qui vient d'E1-9) et son seuil : au moins 60 humains actifs sur une semaine.

**E2-8, compagnies (fusion avec E3-7) : À CORRIGER.**
Corrections exigées :
1. Taille de 2 à 6 membres, au niveau du compte, sans `world_id` (comme `accounts`).
2. On y entre par un lien `?ref=…&co=…` (repris d'E3-7). L'invité arrive avec la région manquante à la compagnie mise en avant.
3. Ce qu'elle donne : un fil de compagnie sur `chatRules.ts`, la convocation d'escarmouche « avec ma compagnie », un palmarès commun et un marquage « ami » sur la carte de la Terraferme.
4. Ce qu'elle ne donne pas : ni trésor, ni transfert, ni offre réservée, ni prime, ni semaine en équipes par compagnie, ni alliance automatique.
5. Prérequis : les étapes 0 et 1 de `terra-3` livrées, et la normalisation des e-mails (E3-2) en production.
6. Mesures : invitations par joueur (cible du CADRAGE : 0,5), et J7 des membres comparé à celui des solitaires.
7. Lot 2, mise en ligne possible en cours de mois (aucun effet de règle).
Règle levée : la décision du porteur du 17 octobre (« chacun pour soi », familles retirées) et le report du fil d'alliance. Raison : un groupe choisi, sans aucun pouvoir économique, n'a aucun des deux défauts qui ont fait retirer guildes et familles, et le jeu arrive par des communautés Discord. Accord du porteur requis (décision 3).

**E2-9, le mutateur du mois (propriétaire) : À CORRIGER.**
Corrections exigées :
1. **Novembre se joue sans mutateur** : c'est la saison de référence.
2. Le premier mutateur est tiré pour le 1er décembre et annoncé le 24 novembre dans `seasonNotes`.
3. Catalogue de départ : **3 mutateurs**, au moins un de commerce pur (par exemple Carestia ou Le Levant afflue), et aucun qui ne touche que la Terraferme (elle est facultative).
4. Un mutateur ne touche jamais au Pass, au grand livre, aux quotas de sécurité ni aux heures de nuit. Un test le refuse dans le schéma.
5. Ajoutez l'option `--mutator <code>` au simulateur. Chaque mutateur passe 5 graines conformes, et une ligne dans calibration.md.
6. Le tirage est déterministe et vient du secret du monde. Pas de choix par le Doge (E2-10).
Règle levée : le gel (une nouvelle mécanique de saison). Raison : un coût de contenu presque nul pour la raison de revenir le 1er du mois, et compatible avec « une règle stable dans le mois ». Accord du porteur requis (décision 5).

**E2-10, fin de mois jouée : À CORRIGER (réduite).**
Corrections exigées :
1. Gardez **seulement** les titres au palmarès, sans effet économique et sans Renommée ajoutée : Capitano generale (Influence de la Terraferme sur le mois, humains seulement), et le Gonfalone pour le Signore de la dernière semaine.
2. Présents pour la cérémonie du 30 novembre.
3. L'élection du Doge part dans IDEAS.md. Conditions de déclenchement : alias normalisés, au moins 50 votants éligibles, choix limité au catalogue validé d'E2-9.

**E2-11, des théâtres de 40 : REFUSÉ.** C'est un chantier L pour une foule qui n'existe pas. Entrée IDEAS.md, déclenchée à 30 humains actifs dans la Terraferme sur une semaine, ou si le test de charge le demande.

### Expert 3

**E3-1, le rendez-vous de fin de guide (propriétaire des notifications) : À CORRIGER.**
Vérifié : `notifier.ts:385` ne pousse rien entre 22 h et 8 h, et `url: "/"` est fixe (l.420). Correction de votre texte : l'avis reste dans la cloche, c'est seulement le **push** qui est perdu. Corrections exigées :
1. Lot 1 : la carte « Rendez-vous » (« Tout lancer jusqu'à ce soir », puis « Me prévenir »), la demande de permission après le toucher, la gazette de 8 h 05 et le **plafond global de 3 push par compte et par jour**, tenu à un seul endroit, avec un test qui croise tous les types. Les attaques urgentes sont hors plafond.
2. Lot 2 : la notification de vague, qui lit les heures d'E1-1 dans les réglages, et le rappel de série d'E3-10.
3. Liens profonds : une liste blanche des valeurs d'`open`. Le client ignore toute valeur inconnue.
4. La phrase datée n'annonce que des heures calculées par le serveur, jamais en dur.
5. Mesures : acceptation ≥ 40 % chez ceux qui voient la carte, et J1 avec ou sans notifications dans `/admin`.

**E3-2, mesurer l'e-mail, puis l'invité : À CORRIGER.**
Vérifié : `emailSchema = z.string().trim().toLowerCase().email()` (`auth/service.ts:16`). Le volet invité rouvre un refus du porteur. Corrections exigées :
1. **Lot 0 :** une colonne `email_canonical` **unique** (migration nommée `email_canonical`). On retire le `+suffixe` pour tous les domaines, et les points pour `gmail.com` et `googlemail.com` (un seul domaine canonique). L'e-mail affiché reste tel que saisi. Avant l'index unique, une requête liste les doublons existants. Une liste statique de domaines jetables est refusée à l'inscription, sans appel externe.
2. **Lot 1 :** l'entonnoir anonyme `landing_view` → `link_requested` → `signed_in` → `region_chosen` → `first_produce`, sans cookie, par jour et par `utm_source`, avec sa mention dans `Legal.tsx`.
3. Le seuil de l'invité se fixe sur données : au moins 300 `landing_view`. Ce n'est **pas** un déclenchement automatique : le chiffre va au porteur fin novembre (décision 4).
4. Le volet invité n'est pas développé en novembre.

**E3-3, la première amélioration pendant le guide : À CORRIGER.**
Vos chiffres sont faux. Par `costForLevel` (`buildings.ts:20-31`), le niveau 2 d'une ferme coûte 283,5 d et 11 briques + 11 planches. Et `production.ts:59-62` donne au niveau 2 **2,5 fois** la production du niveau 1, pas « +25 % par lot ». Corrections exigées :
1. La quantité pré-remplie se calcule : `costForLevel` moins le stock, plafonnée au quota de la Dogana. Rien en dur.
2. Le message dit ce que montre le moteur (« ×2,5 par lot »), à partir de `addedOutputBps`.
3. Le nouveau pas s'appelle **`invest`** et il est enregistré par `tutorial.ts` sur l'événement `upgrade`. Cela corrige du même coup le bogue de `Comptoir.tsx:610`, au lot 0 (voir annexe B). Sinon, renommez les deux côtés ensemble.
4. `first_upgrade` passe au jour 1 : c'est une règle, donc avant le 31 octobre à 18 h, ou le 1er décembre.
5. Le guide reste sous 10 minutes dans l'e2e de `ux-m1`, mesuré.

**E3-4, la vitrine du 1er novembre : VALIDÉ.**
Vérifié : `index.html` n'a aucune balise `og:`, `push-sw.js:5` affiche « Comptoirs » et `:8` utilise l'icône en couleur comme badge. Mise en œuvre telle quelle (`live-3` et `live-6`). Le `ref` et les `utm_*` s'enregistrent dans la même chaîne de migrations que `email_canonical`. Le titre et le badge passent au lot 0, le reste au lot 1.

**E3-5, l'avant-jeu en 30 secondes : À CORRIGER.**
Corrections exigées :
1. Votre exemple « Casa Bembo » est le nom d'une maison PNJ (`apps/server/src/game/bots.ts:37`). La liste des pseudos proposés doit être **disjointe** de celle des PNJ, avec un test.
2. Le pseudo par défaut porte un marqueur modifiable une fois, gratuitement, dans le Profil.
3. La recommandation de région ne s'affiche que si l'écart entre régions dépasse 20 % **et** si au moins 10 humains actifs sont inscrits. Sinon, aucune pastille.
4. La diapositive unique garde la phrase sur l'éthique (pas de pay-to-win), qui est notre argument.
5. Lot 1. Mesure : temps médian de l'ouverture à `first_produce` ≤ 90 s dans l'e2e.

**E3-6, un jour 1 lisible : À CORRIGER.**
Vérifié sur la capture 33. Corrections exigées :
1. `whole()` **tronque** vers zéro et n'arrondit jamais. Une bourse de 1 128,80 s'affiche 1 128, jamais 1 129, et le test d'achat utilise toujours le montant exact.
2. Le libellé unique du coût du changement remplace le texte que le lot de design a ajouté au commit `709def7`, sans le dupliquer.
3. Lot 0.

**E3-7, la Compagnie : REFUSÉ (doublon).** Fusionnée dans E2-8. Les offres « réservées à ma compagnie » sont refusées : avec les alias e-mail, c'est un tuyau de transfert vers le compte principal.

**E3-8, l'interface en anglais : À CORRIGER.**
Corrections exigées :
1. Lot 2 (novembre). Le lancement du 1er novembre se fait sur les communautés **francophones**. Les posts anglais (r/incremental_games et suivants) partent après la livraison de l'anglais.
2. Le périmètre inclut `notify/texts.ts`, `mail/templates.ts`, `seasonNotes`, l'Aide et **les mentions légales** (`Legal.tsx`). Sans les mentions légales, pas de lancement anglophone.
3. Un dictionnaire `en` typé `typeof fr`, avec un test qui échoue sur une clé manquante. `layout.mjs` rejoué en anglais aux deux formats.
4. Les noms propres vénitiens restent en italien.
Règle levée : « Langue de l'interface : français » et le périmètre MVP (CLAUDE.md). Raison : la campagne a choisi elle-même des canaux anglophones, et le critère de sortie (100 inscrits venus de communautés) en dépend. Accord du porteur requis (décision 7).

**E3-9, le Mécène de la Sérénissime : À CORRIGER.**
Vérifié : `weekly.ts:89-92` donne le Pass au top 10 de chaque semaine, et `season.ts:128` aux paliers de la saison. Le Pass est éteint (`pass.enabled: false`). Correction de votre texte : `deepBook` est la **profondeur affichée** du carnet (`view.ts:581`, 10 niveaux au lieu de 5), pas 10 offres ouvertes. Corrections exigées :
1. Retirez « une voix au vote du thème » : on ne paie pas pour voter.
2. Le cours sur 30 jours et la profondeur de 10 deviennent gratuits pour tous, dans le lot 2 (affichage seul, sans simulation).
3. Le Mécène n'a **aucun** effet de jeu, garanti par un test dans le schéma qui refuse toute clé non cosmétique. `pnpm sim --pass` reste dans la CI et doit montrer 0 % d'écart.
4. Trois cosmétiques dessinés avant toute vente.
5. Paiement Stripe et CGV : V1, hors novembre.
6. Plus aucun don de Pass au classement, remplacé par des trophées non achetables.
Règle levée : CLAUDE.md, avantages « utiles seulement à un joueur actif ; tous gagnables au classement ». Raison : ces deux clauses protègent l'équité d'un Pass qui a des effets. Un soutien purement cosmétique ne la menace pas, et le rendre gagnable détruit son seul acheteur. L'écart ≤ 5 % reste vérifié (il devient 0). Décision du porteur (décision 8).

**E3-10, une série clémente : VALIDÉ.** Une absence d'un jour par période de 7 jours ne casse pas la série. Le rappel de 19 h est déclaré à E3-1 et reste dans son plafond. La règle entre en vigueur le 1er décembre, avec sa note de saison. Règle levée : le gel (le sceau de grâce attend l'arbitrage du porteur dans IDEAS.md). Raison : environ +2 % de monnaie des coffres pour retirer le premier motif de décrochage de la semaine 1. Accord du porteur requis (décision 10).

**E3-11, daltonisme et taille du texte : À CORRIGER.**
Corrections exigées :
1. D'abord les **signes non colorés** (+/−, pointillé pour les alliés, anneau pour les ennemis), et le test de Machado (ΔE ≥ 40 en deutéranopie et en protanopie, ou un signe).
2. Le vermillon ne change que si le test échoue encore après les signes. La palette sort tout juste du lot de design : pas de refonte sans preuve.
3. Réglage de taille du texte à 100, 115 ou 130 %. Les `text-[Npx]` passent en `rem` dans le même commit, et l'e2e reste vert à 130 %.
4. Lot 2.

---

## 4. Ordre d'exécution imposé

### Lot 0 : corrections immédiates (avant le 28 octobre)
- Annexe B, bogue `invest` : la feuille de production repasse à `canStart` par défaut une fois le guide fini. Le nouveau pas `invest` d'E3-3 est enregistré par `tutorial.ts`.
- E2-1 : Signore humain, `terraWithdraw`.
- E2-3 : missions mortes.
- E3-2, point 1 : `email_canonical` et domaines jetables.
- E3-6.
- E3-4 : titre et badge de `push-sw.js`.
- Kit de campagne : supprimer « grandes familles », « Prêtez allégeance », « une salle par famille » et « famille gagnante » de `docs/marketing/campagne.md`, à remplacer par « la Terraferme et son Signore ».

**Critère de réussite :**
- `pnpm test`, `pnpm typecheck` et `pnpm lint` au vert.
- Test « chaque événement du pool de missions est émis » au vert.
- Test « Signore PNJ impossible » au vert, et `pnpm sim --terra --players 5` à 0 % de Signore PNJ sur 5 graines.
- Deux inscriptions `a+1@gmail.com` et `a@gmail.com` refusées comme doublon.
- e2e `ux-m1` vert à 390×844 et 320×568.
- `grep -n "famille" docs/marketing/campagne.md` ne renvoie plus rien qui promette une mécanique.

### Lot 1 : avant le lancement du 1er novembre (date butoir des règles : 31 octobre, 18 h)
Par ordre de priorité. Ce qui n'est pas fusionné à la date butoir glisse au 1er décembre pour les règles, et en novembre pour l'interface.
1. E1-1, vagues de jour.
2. E1-2, part réservée.
3. E1-5, prêts et entrepôts coupés.
4. E3-4, aperçus de lien, manifeste et `?ref=`.
5. E3-2, point 2 : l'entonnoir.
6. E3-1, point 1 : rendez-vous, gazette et plafond.
7. E3-3.
8. E3-5.

**Critère de réussite :**
- `pnpm sim` sur 5 graines, toutes conformes, avec calibration.md à jour.
- Aucune `opensAt` entre 22 h et 8 h sur 31 jours.
- Commandes perdues par session ≤ 10, prises ≥ 88 %, assidus ≤ 150 % devant les occasionnels (médiane des 5 graines).
- Un lien du jeu collé dans Discord affiche l'image `og` (vérifié à la main, avec une capture).
- `/admin` affiche `landing_view` et `first_produce` par jour.
- e2e : premier `first_produce` ≤ 90 s, guide complet (amélioration comprise) ≤ 10 min.
- `seasonNotes` de novembre unique, qui récapitule toutes les règles changées.
- **Porte de publication de `plan-finalisation.md` non négociable** : test de charge à 300 comptes, répétition du changement de saison, restauration de sauvegarde attestée. Si l'un des trois manque, on ouvre le 1er novembre en bêta fermée (Discord seulement), sans post Reddit.

### Lot 2 : novembre
- **Mise en ligne en cours de mois autorisée** (sans effet de règle) : E2-2 (convocations), E2-4, E2-8, E3-8, E3-11, E3-1 (point 2, sans le rappel de série), E2-10 (titres), E3-9 (point 2, affichage gratuit).
- **Développé en novembre, en ligne le 1er décembre** (règles) : E1-4, puis E1-3, E1-6, E1-7, E2-6, E2-9 (annoncé le 24 novembre), E3-10.

**Critère de réussite :**
- Mesuré sur la saison de novembre, humains seulement, dans `/admin` : J1 ≥ 40 % et J7 ≥ 20 % (CADRAGE), ≥ 0,5 invitation par joueur, ≥ 40 % de parties classées en convocation.
- Pour le paquet du 1er décembre : 5 graines conformes avec **tous** les changements ensemble, revenu J20-J29 / J4-J8 ≥ 1,4, cours du Veneto en fin de mois ≥ 65 % de la référence, masse monétaire ≤ 2,5 × le capital, aucune maîtrise > 40 %.
- `seasonNotes` de décembre publié le 24 novembre.

### Plus tard : IDEAS.md (une entrée par sujet, chacune avec sa mesure de déclenchement)
| Sujet | Proposition | Déclenchement |
| --- | --- | --- |
| Ligues | E2-7 | ≥ 60 humains actifs sur une semaine |
| Condotta | E2-5 | ≥ 30 % des actifs jouent une escarmouche par semaine |
| Théâtres | E2-11 | 30 humains actifs dans la Terraferme, ou le test de charge |
| Privilèges d'ouverture | E1-10 | Influence médiane non dépensée ≥ 100 à J30 |
| Élection du Doge | E2-10 | Alias normalisés et ≥ 50 votants éligibles |
| File d'escarmouche | E2-2 | < 40 % de parties classées en convocation |
| Jeu en invité | E3-2 | Décision du porteur sur les chiffres de l'entonnoir |
| Paiement du Mécène | E3-9 | V1, après les CGV |

**Critère de réussite :** chaque entrée est présente dans IDEAS.md avec son seuil chiffré, et aucune ligne de code n'est écrite pour ces sujets.

---

## 5. Décisions qui reviennent au porteur

1. **Fondaci et retrait des entrepôts (E1-3), avec levée du gel** : je recommande oui, en ligne le 1er décembre, sous les conditions d'E1-3.
2. **Couper prêts et entrepôts avant le lancement (E1-5)**, ce qui revient sur le lot du 20 octobre : je recommande oui, car ils ne sont pas simulés et l'emprunt ne coûte rien au classement.
3. **Compagnies (E2-8)**, qui rouvrent « chacun pour soi » du 17 octobre : je recommande oui, sans aucun pouvoir économique.
4. **Jeu en invité (E3-2)**, qui rouvre le refus du 21 octobre : je recommande non en novembre ; décision fin novembre sur l'entonnoir mesuré (au moins 300 `landing_view`).
5. **Mutateur du mois (E2-9)**, nouvelle mécanique de saison : je recommande oui, novembre sans mutateur, premier mutateur le 1er décembre.
6. **Arsenal hebdomadaire à paliers (E2-6)** : je recommande oui, le 1er décembre, à création de monnaie ≤ 1,5 × l'actuelle.
7. **Interface anglaise (E3-8) et ordre de la campagne** : je recommande oui ; lancement francophone le 1er novembre, posts anglais après la livraison de l'anglais et des mentions légales en anglais.
8. **Pass changé en Mécène purement cosmétique, information gratuite pour tous, plus de Pass donné au classement (E3-9)**, ce qui lève deux clauses de CLAUDE.md : je recommande oui ; paiement en V1.
9. **Nouvelle cible d'écart de la course aux commandes (≤ 150 %)**, à distinguer des 5 à 10 % des bonus de présence du CADRAGE : je recommande oui, écrite dans le CADRAGE et dans calibration.md.
10. **Série clémente (E3-10)** : je recommande oui, le 1er décembre.
11. **Lancement public du 1er novembre** : je recommande oui seulement si le lot 0 et la porte de publication (charge, changement de saison, sauvegarde) sont verts ; sinon, bêta fermée sur Discord.
12. **Monde du 1er novembre** : vérifiez `worlds.ends_at`. Si la première saison de 41 jours court jusqu'au 30 novembre, je recommande de remettre le monde à zéro le 1er novembre, puisque la campagne promet « la saison de novembre s'ouvre le 1er ».

---

## Annexe A : vérifications faites dans le code

| Affirmation | Verdict | Preuve |
| --- | --- | --- |
| Le Signore peut être un PNJ (E2-1) | **Vrai** | `terraferma.ts:1266-1270` ne filtre que `isNation`. `bots.ts:337-340` tire le décret au hasard. Le moteur n'a aucun drapeau PNJ. |
| Une maison retirée garde ses terres (E2-1) | **Vrai** | `apps/server/src/game/bots.ts:362-378` n'annule que les ordres du Rialto (`cancelOrder`). |
| « ≈ 85 % de Signore PNJ » (E2-1) | **Non mesuré** | C'est un calcul (35 PNJ sur 40), pas une sortie du simulateur. |
| Vagues à 0 h et 4 h (E1-1) | **Vrai** | `engine/src/deliveries.ts:653-657`, réglage `waves: { everyHours: 4, openHours: 8 }` (`venice1450.settings.ts:630`). `dayStart = startAt + day × 24 h` (l.599). |
| Notifications nocturnes jetées (E3-1) | **Vrai pour le push, exagéré pour l'avis** | `notifier.ts:385` : `return` avant tout push si 22 h à 8 h, alors que l'avis est enregistré dans la cloche (l.373-382). `url: "/"` à la l.420. Aucun plafond quotidien. |
| Alias e-mail illimités (E3-2) | **Vrai** | `auth/service.ts:16` : `trim().toLowerCase().email()`, sans canonisation ni filtre de domaines jetables. |
| Missions de la Maison mortes (E2-3) | **Vrai, chiffres exacts** | `venice1450.settings.ts:1137-1141`. Événements émis seulement par `campaign.ts` (l.460, 468, 775, 878, 928), éteint par `familiesOn` quand `terraferma.live` (`families.ts:18-21`). Espérance : 16 × 10/17 = 9,4 sur 54 × 10/17 = 31,8. |
| Prêts gratuits au classement (E1-5) | **Vrai** | `turnover.ts:31-40`, `COSTS` sans intérêts. Calibration.md l.1150 : « ni entrepôts ni prêts ». |
| Niveau 5 = ×10 (E1, diagnostic) | **Vrai** | `buildings.ts:45` et `production.ts:59-62` : `level × (1 + (level−1) × 0,25)`. Le commentaire « a level 5 workshop: × 2 » des réglages (l.823) est **faux** et doit être corrigé au lot 0. |
| Amélioration au niveau 2 : « 210 d, 15+15, +25 % par lot » (E3-3) | **Faux** | `costForLevel` donne 283,5 d et 11+11 matériaux, pour une production ×2,5. |
| `deepBook` = « carnet à 10 offres » (E3-9) | **Inexact** | `view.ts:581` : profondeur affichée de 10 au lieu de 5. |
| Pass donné au top 10 (E3-9) | **Vrai** | `apps/server/src/game/weekly.ts:89-92`, `season.ts:128`. |
| Aucune balise `og:`, « Comptoirs » dans le service worker (E3-4) | **Vrai** | `index.html` (0 occurrence), `push-sw.js:5` et `:8`. |
| Clés du coach `invest`, `goComptoir`, `investLater` mortes (E3-3) | **Vrai** | Elles n'apparaissent que dans `i18n.ts`. |
| PNJ qui remplissent les commandes de compagnie (E2-6) | **Vrai** | `bots.ts:681-690`. |
| Escarmouche : 60 s de salle, 2 humains au minimum (E2-2) | **Vrai** | `venice1450.settings.ts:322-327`. |
| Les PNJ acceptent toute alliance et choisissent par ordre alphabétique (E2-4) | **Vrai** | `bots.ts:343-355`. |

## Annexe B : ce que personne n'a vu

1. **Le bogue `invest`.** `apps/web/src/game/Comptoir.tsx:610` : `const learning = !props.view.tutorial.includes("invest")`, puis `useState(learning ? 1 : …canStart)`. Or `apps/server/src/game/tutorial.ts` n'enregistre jamais `invest`. Résultat : la feuille propose 1 lot par défaut à tous les joueurs, pour toute la saison. C'est l'inverse de « lancez toute la nuit ». Lot 0, propriétaire E3 (avec E3-3).
2. **Le kit de campagne périmé.** `docs/marketing/campagne.md` l.20, 25, 26 et 76 annonce des familles qui n'existent plus. Lot 0, propriétaire E2.
3. **Le don de ducats entre alliés** (`terra_gift`, jusqu'à 50 d par jour, `terraWorld.ts:421`). Avec les alias, c'est un tuyau vers un compte principal. La normalisation d'E3-2 le referme. Ajoutez aux tests d'E3-2 un cas « deux comptes de même `email_canonical` impossibles ».
4. **Le commentaire de réglage faux** (« level 5 : × 2 », `venice1450.settings.ts:823`). Il a sans doute induit E3-3 en erreur. Lot 0.
