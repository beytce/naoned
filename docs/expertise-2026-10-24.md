# L'équipe d'experts : synthèse du 24 octobre 2026

Trois experts en jeux mobile et PC persistants, de la famille de Hades' Star, ont lu le dépôt (`431b862`). Ils ont proposé 32 changements, chacun dans son domaine. Le chef, intransigeant, a vérifié les constats décisifs dans le code, puis il a validé, refusé ou exigé des corrections. Chaque expert a corrigé une fois, sans autre aller-retour. L'équipe avait le droit de lever les règles du projet, en le disant ; aucune règle technique de sûreté n'a été levée.

**Les pièces :** dans `docs/expertise-2026-10-24/`, on trouve `chef.md` (verdicts, lots, décisions, annexes de vérification) et, pour chaque expert, `expertN-propositions.md` (premier tour) puis `expertN-final.md` (après le retour du chef). Les scripts et captures cités par les experts (`scratchpad/…`) étaient éphémères et ne sont pas conservés.

| Expert | Domaine |
| --- | --- |
| E1 | Boucle de jeu, économie, progression (chiffres sur 5 graines de `pnpm sim`) |
| E2 | Multijoueur, social, live-ops, modes de jeu |
| E3 | Mobile et PC, premières minutes, notifications, modèle économique, acquisition |

**Les dates du chef (lancement au 1er novembre, date butoir au 31 octobre) sont retirées à la demande du porteur** : le lancement n'est pas daté. Dans `chef.md`, elles restent comme historique.

**Rien n'est codé.** Ce document attend la validation du porteur, comme le veut CLAUDE.md.

## Ce que le chef a vérifié dans le code

- **Vrai :**
  - Le Signore de la semaine peut être un PNJ : `closeTerra` ne filtre que les nations. Une mesure d'E2 sur un prototype donne un PNJ Signore 11 semaines sur 15. Dîme et Monopole prennent alors des ducats aux humains au profit d'un ordinateur.
  - Une maison qui se retire garde ses terres.
  - Des vagues de commandes s'ouvrent à 0 h et à 4 h (`deliveries.ts:653-657`), alors que le jeu promet de dormir de 22 h à 8 h.
  - `a+1@gmail.com` crée un second compte (`auth/service.ts:16`). Avec le don de 50 d par jour entre alliés (`terra_gift`), c'est un tuyau à multi-comptes.
  - 5 missions de la Maison sur 17 sont mortes depuis la fin de la Campagne : 9,4 points d'Influence espérés perdus sur 31,8 par tableau.
- **Personne ne l'avait vu :** `Comptoir.tsx:610` attend l'étape de tutoriel `invest`, que le serveur n'enregistre jamais. Résultat : la feuille de production propose **1 lot par défaut à tout le monde, pour toujours**.
- **Autres trouvailles :**
  - Le kit de campagne vend encore les familles, qui n'existent plus.
  - Le commentaire « niveau 5 : × 2 » des réglages est faux : c'est × 10.
- **Exagéré ou faux :**
  - La nuit, seul le push est perdu ; l'avis reste dans la cloche.
  - Les chiffres d'amélioration d'E3 étaient faux. Le niveau 2 coûte 283,5 d et 11 + 11 matériaux, pour une production × 2,5 ; E3 les a corrigés.
  - Le « 85 % » de Signore PNJ d'E2 était calculé, pas mesuré ; E2 l'a mesuré.

## La direction fixée par le chef

1. **Au lancement, un jeu de commerce honnête et qui dort la nuit.** Plus de commandes la nuit, plus de récompense captée par un PNJ, plus de système non simulé : prêts et entrepôts sont coupés.
2. **Ensuite, la croissance par la demande et la règle du mois.** On construit les *fondaci*, des agences en ville qui apportent des commandes personnelles. Le revenu plafonne aujourd'hui dès J+5, car la demande est fixe. On construit aussi la règle du mois (mutateur). Les deux partent ensemble.
3. **Le social se limite à une compagnie d'amis**, sans aucun pouvoir économique. Il n'y a pas de deuxième mode de guerre, et pas de ligue tant que la population manque.
4. **Pas de calendrier fixé.** La date de lancement n'est pas arrêtée (décision du porteur, 24 octobre), et les dates du chef sont donc retirées. Avant le lancement, tout peut partir dès que c'est prêt. Une fois qu'il y a des joueurs, la règle de CLAUDE.md s'applique : un changement de règle prend effet au changement de mois, avec ses notes de saison. Les corrections de bogue et d'interface peuvent partir en cours de mois.

## Le bilan des 32 propositions

| | Premier verdict du chef | Après la correction |
| --- | --- | --- |
| Validées telles quelles | 3 : E1-5, E3-4, E3-10 | inchangées |
| À corriger | 22 | 21 corrigées. **E1-2 a été retirée par son auteur** : sur 5 graines, aucun plafond par vague ne tient ses cibles. |
| Refusées | 7 : 4 doublons fusionnés (E1-8, E1-9, E1-10, E3-7) et 3 sujets reportés (E2-5, E2-7, E2-11) | réduites à des entrées pour IDEAS.md, avec un seuil chiffré |

## Le plan, lot par lot

### Lot 0 : corrections, en premier

| Sujet | Proposition | Ce qu'on fait |
| --- | --- | --- |
| Bogue `invest` | Annexe B, E3-3 | La feuille de production propose à nouveau `canStart` une fois le guide fini. Le pas `invest` est enregistré par `tutorial.ts`. La condition inclut aussi `mission`, pour débloquer les comptes qui ont déjà fini le guide. |
| Signore humain | E2-1 | Un drapeau `npc` posé par le serveur dans le moteur. Le Signore et les paliers d'Influence vont aux humains seuls. `terraWithdraw` rend les terres. Le simulateur gagne `--humans`. |
| Missions mortes | E2-3 | Deux nouveaux événements, `terra_cell_taken` et `terra_troops_sent`. Les missions sans émetteur sont retirées. Au plus 2 missions Terraferme par tableau. Un test vérifie que chaque événement du pool est bien émis. |
| Un compte par e-mail | E3-2, point 1 | `email_canonical` unique, qui enlève les `+suffixe` et les points chez Gmail. Une liste statique de domaines jetables. Un test referme `terra_gift` entre deux comptes de même adresse canonique. |
| Lisibilité du jour 1 | E3-6 | Plus de mur de boutons « Changer · 3 ✦ » grisés. `whole()` tronque les ducats au lieu de les arrondir. |
| Service worker | E3-4 (partie) | Le titre « Comptoirs » devient « Fondaco ». Le badge passe en couleur. |
| Kit de campagne | Annexe B | Toute promesse de familles disparaît de `docs/marketing/campagne.md`, au profit de « la Terraferme et son Signore ». |
| Commentaire de réglage | Annexe B | « Niveau 5 : × 2 » est corrigé en × 10. |

**Critère de réussite :**
- `pnpm test`, `pnpm typecheck` et `pnpm lint` sont au vert.
- Les tests « événements émis » et « Signore PNJ impossible » passent, avec 0 % de Signore PNJ sur 5 graines.
- Une inscription avec `a+1@gmail.com` est refusée si `a@gmail.com` existe déjà.
- L'e2e passe en 390×844 et en 320×568.

### Lot 1 : avant le lancement

1. **E1-1, des vagues de jour seulement.**
   - Vagues à 8, 11, 14, 17 et 20 h, heure de Paris, testées aux deux changements d'heure. Les commandes urgentes ferment à 19 h au plus tard.
   - E1 a mesuré qu'enlever les vagues de nuit pénalise les occasionnels : les PNJ, qui ne dorment pas, retrouvaient ces commandes le matin. Deux règles sont donc obligatoires : les vagues de 17 h et 20 h restent ouvertes jusqu'au lendemain 10 h, et personne ne prend au tableau commun entre 22 h et 8 h.
   - **Condition de départ :** l'occasionnel prend au moins 0,37 fois ce que prend l'assidu, et l'écart entre assidus et occasionnels reste à 145 % au plus. Sinon, on retravaille la règle avant de la livrer.
2. **E1-5, couper prêts et entrepôts.** Ils ne sont pas simulés, et emprunter ne coûte rien au classement. La coupure rend aussi inutile le chantier `loop-m1`.
3. **E3-4, la vitrine.** Balises `og:` pour les aperçus de lien, un manifeste complet (`id`, captures, raccourcis) et le suivi `?ref=`.
4. **E3-2, point 2, l'entonnoir.** Une mesure anonyme dans `/admin` : `landing_view`, puis `first_produce`, par jour.
5. **E3-1, point 1, le rendez-vous de fin de guide.**
   - La file de production est lancée jusqu'au soir, et la demande de notification arrive à ce moment-là.
   - Une gazette part à 8 h 05.
   - Un plafond global de 3 push par jour est tenu dans une seule fonction. Les attaques passent hors plafond.
6. **E3-3, la première amélioration pendant le guide.** Le guide reste sous 10 minutes dans l'e2e.
7. **E3-5, l'avant-jeu en 90 s au plus.** Un pseudo proposé, distinct des noms PNJ, et une seule diapositive. Le métier est recommandé seulement sous seuils : un écart de plus de 20 % et au moins 10 humains.

**Critère de réussite :**
- `pnpm sim` est conforme sur 5 graines, et calibration.md est à jour.
- Aucune vague ne s'ouvre entre 22 h et 8 h sur 31 jours.
- Un lien collé dans Discord affiche l'image de l'aperçu.
- Le premier lot de production part en 90 s au plus.
- Une seule `seasonNotes` pour la première saison.
- **La porte de publication n'est pas négociable :** test de charge à 300 comptes, répétition du changement de saison et restauration de sauvegarde attestée. S'il en manque une, on ouvre en bêta fermée, sur Discord seulement, sans post Reddit.

### Lot 2 : après le lot 1, avant ou après le lancement

**Peut partir à tout moment, car sans effet sur les règles :**
- **E2-2, trois convocations d'escarmouche par jour.** Aujourd'hui, la salle d'attente dure 60 s et exige 2 humains : une partie classée n'arrive presque jamais.
- **E2-4, des PNJ alliés qui secourent, ripostent et parlent.** Ils ne donnent jamais de ducats, et un humain a au plus un PNJ allié.
- **E2-8, les compagnies.** De 2 à 6 amis, recrutés par lien d'invitation, sans trésor ni pouvoir économique. La compagnie survit au changement de mois.
- **E2-10, les titres de fin de mois.** Capitano generale et Gonfalone.
- **E3-1, point 2,** le reste des notifications.
- **E3-8, l'interface en anglais,** mentions légales comprises.
- **E3-9, point 2 : l'information du Pass devient gratuite.**
- **E3-11, daltonisme et taille du texte.** Des signes non colorés d'abord, puis le test, et la palette en dernier recours. La taille du texte passe en `rem`.

**Ce sont des règles : elles partent ensemble, dès que prêtes avant le lancement, ou au changement de mois s'il y a déjà des joueurs :**
- **E1-3, les fondaci.**
  - Elles remplacent les entrepôts : une commande personnelle par niveau, 6 niveaux au plus.
  - Les PNJ doivent être simulés avant la mise en ligne.
  - La monnaie créée par jour reste une estimation à valider au simulateur.
- **E1-4, les ouvriers mangent quand ils travaillent.** Les rations se paient au lot lancé, pour freiner la surproduction et faire vivre le pain. Coefficients divisés par deux, après la mesure de 72 pains par comptoir et par jour.
- **E1-6, des maîtrises qui touchent la vraie contrainte.** Aujourd'hui, Maître d'atelier est pris 16 fois sur 33 et Roulier ne sert à rien.
- **E1-7, un seul « Livre de la Maison ».** Il réunit les tâches du jour et 8 missions par semaine, sur le pool corrigé au lot 0.
- **E2-6, l'Arsenal de la semaine.** Une commande de compagnie à paliers, dont les paliers au-delà du Bronze ne se montent qu'entre humains. Elle crée au plus 1,5 fois la monnaie d'aujourd'hui (1,43 au palier Or).
- **E2-9, le mutateur du mois.**
  - Le catalogue de départ compte 3 mutateurs : Embargo ottoman, Grand gel, Guerre de Milan.
  - Une liste blanche, testée, limite les mutateurs aux clés de réglage qui existent déjà.
  - La première saison se joue sans mutateur ; chaque mutateur est annoncé une semaine avant le mois où il s'applique.
- **E3-10, une série clémente.** Un jour de grâce par semaine, et un seul rappel.

**Critère de réussite :**
- Mesuré dans `/admin` sur les humains de la première saison :
  - J1 ≥ 40 % et J7 ≥ 20 % ;
  - au moins 0,5 invitation par joueur ;
  - au moins 40 % des parties classées jouées en convocation.
- Pour le paquet de règles :
  - 5 graines conformes avec tous les changements ensemble ;
  - cours du Veneto en fin de mois ≥ 65 % de la référence ;
  - masse monétaire ≤ 2,5 fois le capital ;
  - aucune maîtrise choisie par plus de 40 % des joueurs.

### Plus tard : dans IDEAS.md, chaque idée avec son seuil de déclenchement

| Idée | Se déclenche quand |
| --- | --- |
| Ligues hebdomadaires (E2-7, E1-9) | ≥ 60 humains actifs sur une semaine |
| La Condotta, des Étoiles Rouges vénitiennes (E2-5) | ≥ 30 % des actifs jouent une escarmouche par semaine |
| Théâtres de 40 marchands (E2-11) | 30 humains actifs dans la Terraferme, ou le test de charge |
| Privilèges d'ouverture (E1-10) | Influence médiane non dépensée ≥ 100 à J30 |
| L'élection du Doge (E2-10) | Alias normalisés et ≥ 50 votants |
| File d'attente d'escarmouche (E2-2) | < 40 % des parties classées jouées en convocation |
| Jouer en invité (E3-2) | Décision du porteur sur les chiffres de l'entonnoir |
| Paiement du Mécène (E3-9) | V1, après les CGV |

## Les règles du projet que l'équipe propose de lever

| Règle | Levée par | Pourquoi |
| --- | --- | --- |
| Le gel des mécaniques | E1-3, E1-4, E1-6, E1-7, E2-6, E2-9, E3-10 | Sans croissance par la demande ni renouvellement mensuel, rien ne fait revenir à J30. |
| « Chacun pour soi, pas de guildes » (décision du 17 octobre) | E2-8 | Les groupes d'amis sont le premier moteur de rétention des jeux persistants. Ici, la compagnie n'a aucun pouvoir économique. |
| Deux clauses du Pass dans CLAUDE.md : quota de Pass gagnable au classement, et `pnpm sim --pass 0.2` comme condition de paiement | E3-9 | Un Pass purement cosmétique (« Mécène ») rend la question du pay-to-win sans objet. Le Pass n'est plus donné au classement (au changement de mois s'il y a déjà des joueurs). |
| Interface en français seulement | E3-8 | La campagne vise des communautés anglophones. |

## Les 12 décisions qui reviennent au porteur

Chaque décision est donnée avec la recommandation du chef.

1. **Les fondaci, et le retrait des entrepôts (E1-3) :** oui, avec le paquet de règles du lot 2.
2. **Couper prêts et entrepôts avant le lancement (E1-5) :** oui.
3. **Les compagnies (E2-8) :** oui, sans pouvoir économique.
4. **Le jeu en invité (E3-2) :** non pour l'instant ; décision sur l'entonnoir mesuré, après au moins 300 `landing_view`.
5. **Le mutateur du mois (E2-9) :** oui ; la première saison sans mutateur, le premier à la saison suivante.
6. **L'Arsenal de la semaine (E2-6) :** oui, avec le paquet de règles, à création de monnaie ≤ 1,5 fois celle d'aujourd'hui.
7. **L'interface en anglais (E3-8) :** oui. Lancement francophone, les posts anglais viennent après.
8. **Le Pass devient « Mécène » cosmétique, avec l'information gratuite pour tous (E3-9) :** oui ; le paiement arrive en V1.
9. **Une nouvelle cible d'écart dans la course aux commandes (≤ 150 %), à écrire dans le CADRAGE :** oui.
10. **La série clémente (E3-10) :** oui, avec le paquet de règles.
11. **Lancement public :** à la date que tu choisiras, seulement si le lot 0 et la porte de publication sont au vert ; sinon, bêta fermée sur Discord.
12. **Le monde du lancement :** vérifier `worlds.ends_at`. Remettre le monde à zéro au 1er du mois du lancement, pour que la première saison soit un mois complet. Mettre à jour le kit de campagne, qui promet « la saison de novembre s'ouvre le 1er ».

## Un écart entre le chef et la correction

Le chef avait mis **E1-2** (une part réservée de chaque vague) au lot 1. Son auteur l'a retirée après l'avoir mesurée sur 5 graines :
- avec un plafond de 3 commandes en 90 minutes, les commandes perdues passent de 33 à 43 par session ;
- avec 2 commandes en 240 minutes, la part des occasionnels tombe de 0,37 à 0,25 ;
- la cible d'écart (≤ 150 %) est déjà tenue aujourd'hui (145 %) ;
- « commandes perdues » mesure la saturation du tableau, pas une course au clic.

Le critère « commandes perdues ≤ 10 par session » du chef repose sur cette lecture fausse. Il faut le remplacer par la condition de départ d'E1-1.
