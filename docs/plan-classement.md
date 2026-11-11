# Le rang, les lauriers et le rival de la semaine : plan (étape 6 de CADRAGE-v4 § 17)

*Proposé le 11 novembre 2026, à la suite de l'île (« on fera le classement et le rival par la suite », puis « Enchaîne »). Les règles de fond sont celles de `docs/CADRAGE-v4.md` § 10 ; l'aspect suit la toile de l'audit visuel du 11 novembre (`docs/audit-visuel-2026-11-11/00-audit.md`). **Validé le même jour**, avec les quatre recommandations du § 7.*

## 1. Le problème à régler

Aujourd'hui, la planche affiche une place (« 3ᵉ ») calculée sur l'argent gagné depuis le début. Elle ne repart jamais de zéro, elle récompense la taille, personne n'a de visage en face, et la Passe en ligne ne compte pour rien. Le porteur veut **une vraie rivalité : que chaque joueur ait envie de devenir le meilleur**. Il faut donc :

- un classement qui repart de zéro, où un nouveau peut être premier ;
- toujours quelqu'un **à portée**, nommé, qu'on voit sur la planche ;
- des façons de se mesurer **directement**, à égalité ;
- tout cela **sur la planche**, sans tableau à ouvrir (règle 8 : tout se voit).

Critère de réussite du cadrage : *les testeurs savent dire, sans rien ouvrir, leur rang et le nom de leur rival.*

## 2. Ce que le joueur voit et fait

| Moment | Ce qu'il voit | Ce qu'il fait |
| --- | --- | --- |
| **À chaque visite** | Dans la pilule du haut (ducats, cinq bobines), sa **place** et sa tendance (▲2). Sur la planche, les fils de **son rival** dans sa couleur, pointillés d'encre, et une petite étiquette « ton rival » sur sa Maison. | Rien à ouvrir : il sait où il en est. |
| **Sur une ville que les deux servent** | La jauge en parts (déjà là depuis l'audit) met face à face sa part et celle du rival : « Ca' Dandolo te passe devant à Padoue ». | Tirer un fil de plus, changer de marchandise, forcer un passage. |
| **En touchant sa place** | **Le palais du Doge** : une feuille, trois colonnes (les trois lauriers), son nom et celui du rival dans chacune, le Doge du moment coiffé en haut. | Comprendre ce qui compte, choisir où gagner. |
| **Le dimanche soir** | Le duel de la semaine se règle : le vainqueur **accroche le pavillon** du vaincu à sa façade pour une semaine. Un nouveau rival est désigné. | Revenir lundi voir son nouveau rival. |
| **Chaque jour** | **Le Problème du jour** : une position de la Passe, la même pour tous, un seul essai, résultats à minuit. Un rond rouge sur la tour du Lido tant qu'il n'est pas joué. | Une minute de réflexion, à égalité pure. |
| **Quand il le veut** | **Le défi par le fil** : tirer un fil vers l'île d'une autre Maison humaine lui propose deux Passes en direct (une fois le fil, une fois la chaîne). | Monter sa cote de la Passe, sans rien risquer d'autre. |
| **À la fin de la marée** | Les trois lauriers et le Doge proclamés ; la coiffe du Doge sur l'île du premier, les lauriers sur les façades, pour toute la marée suivante. Les rangs repartent de zéro. | Recommencer, avec une chance égale. |

## 3. Les règles

### 3.1 La marée et la semaine

- La planche reçoit **une horloge de marée** : une marée dure six semaines (§ 11), découpée en semaines du lundi 0 h au dimanche 24 h. C'est tout ce que ce plan prend de la marée d'encre : la montée du péril, les sorties et les ligues restent pour l'étape 9.
- À la fin d'une marée, les compteurs de rang repartent de zéro ; l'île, les ducats, les fils et le renom ne bougent pas.
- Le rythme suit `PLANCHE_PACE` en test, comme le reste de la planche.

### 3.2 Trois lauriers, un Doge (§ 10.2)

Chacun est un compteur entier tenu par le moteur, remis à zéro à chaque marée.

| Laurier | Mesure proposée | Ce qui empêche la taille de gagner |
| --- | --- | --- |
| **Le Négoce** | Ce que ses fils ont rapporté pendant la marée, **divisé par les heures-bobines tirées** (en deniers par bobine-heure). | Douze heures de fil mal placé valent moins que trois bien tenues. Un minimum d'heures-bobines (un jour de fil plein) pour figurer, sinon un seul fil chanceux gagnerait. |
| **La Passe** | Une **cote** entière (départ 1 200), façon échecs, mise à jour après chaque Passe **entre deux joueurs** (défi par le fil, tour d'un joueur forcée en personne). Les robots et les capitaines n'y comptent pas. Entre deux mêmes Maisons, le gain décroît de moitié à chaque nouveau duel de la semaine. | Pièces et budgets égaux ; la cote ne dépend que du résultat. |
| **La Garde** | Les **heures tenues** sur une tour, pondérées par le péril de sa case, plus un bonus par assaut repoussé. Deux tours au plus par Maison (§ 7). | On ne peut pas tenir plus de deux tours ; la nuit (trêve) compte comme tenue. |

- **La place** d'une Maison dans un laurier est son rang dans ce compteur.
- **Le Doge** est la Maison dont la **somme des trois places** est la plus petite (départage : le Négoce, puis la Passe). Un seul par monde et par marée.
- **La place affichée dans la pilule** est la place au classement du Doge (la somme des trois), pour qu'un seul chiffre parle.

### 3.3 Le sestiere

Le cadrage veut « la douzaine d'îles voisines ». La planche d'aujourd'hui a huit Maisons : **le sestiere est la planche entière** dans ce plan. Le découpage viendra avec la grande planche (étape 9).

### 3.4 Le rival de la semaine (§ 10.3)

- **Désigné le lundi**, pour chaque Maison humaine : la Maison **juste au-dessus d'elle** au classement du Doge, **humaine de préférence**, une Maison de l'ordinateur sinon (avec huit places et peu de joueurs, il faut un rival à chacun dès le premier jour). Jamais le même rival deux semaines de suite. Le premier a pour rival le deuxième.
- Le rival n'est pas forcément réciproque (A peut viser B, qui vise C).
- **Le duel de la semaine** se joue sur une seule mesure, lisible sur la planche : **ce que chacun a vendu pendant la semaine dans les villes qu'ils servent tous deux** (à défaut, ce que chacun a gagné en tout). Le gagnant accroche le pavillon du perdant à sa façade jusqu'au dimanche suivant.
- **Aucun message libre** : seulement des signes (un salut, un défi par le fil).
- Ce que gagne le vainqueur : un pavillon sur sa façade, rien d'autre (§ 10.6 : jamais une bobine, une pièce, un rendement).

### 3.5 Le Problème du jour (§ 10.4)

- Chaque jour, un problème tiré des vingt de `venice1450.passe.problems.ts` (le même pour tous, par la date), joué contre le solveur. Un seul essai ; on voit son résultat tout de suite, ceux des autres à minuit (combien l'ont résolu, en combien de coups).
- Il ne donne aucun rang : une série de jours réussis se voit sur la façade (un petit nœud par jour de la semaine), sans récompense qui expire (règle 8 du cadrage v4).
- Vingt problèmes suffisent pour trois semaines ; le générateur (`pnpm --filter @comptoirs/simulator passe-problems`) en produira d'autres avant la bêta.

### 3.6 Le défi par le fil (§ 10.4)

- Tirer un fil vers l'île d'une autre Maison **humaine présente** lui propose le défi ; elle accepte ou refuse (un refus ne coûte rien et ne se voit pas). Une fois par paire et par semaine.
- Deux Passes en direct, sur le salon du duel déjà en ligne (`/api/passe/room`) : chacun joue une fois le fil, une fois la chaîne. Chaque Passe compte pour la cote.
- Le fil tiré ne prend pas de bobine et disparaît à la fin du défi.

## 4. À l'écran (selon la toile du 11 novembre)

- **La pilule** : ducats, cinq bobines dessinées, puis la place et sa tendance, sans troncature à 390 px.
- **Le rival sur la planche** : ses fils dans la couleur de son pavillon, en encre pointillée plus marquée que les autres rivaux ; son étiquette de Maison prend un liseré et le mot « rival ». Une seule étiquette, trois tailles (principe 3 de la toile).
- **Le palais du Doge** : une feuille de papier, comme les autres fiches. Trois colonnes de podium, une par laurier, avec les médaillons des Maisons ; toi en rouge ; le rival souligné ; l'écart dit en une phrase (« 3 200 ducats derrière Ca' Dandolo cette semaine »). Une seule touche rouge : celle qui ramène à la planche, ou « Défier » si le rival est humain et présent.
- **Les marques** : la coiffe du Doge sur l'île du premier ; un laurier sur la façade de chaque premier de laurier ; le pavillon pris au rival accroché à la façade.
- **Le Problème du jour** : un rond rouge sur la tour du Lido ; le toucher ouvre la Passe du laboratoire sur la position du jour.

## 5. Les lots

| Lot | Contenu | Vérification |
| --- | --- | --- |
| R1 | **Le moteur du rang** : horloge de marée et semaines ; compteurs du Négoce (heures-bobines), de la Garde (heures tenues pondérées) ; cote de la Passe (fonction pure, entiers) ; places, Doge ; désignation du rival et duel de la semaine. Pur, tests d'abord, fixture. | tests du moteur ; l'invariant de la monnaie tient |
| R2 | **Au banc** : six semaines de planche avec les robots ; le Négoce ne revient pas à la plus grosse île ; huit visites par jour ne rapportent pas un rang nettement meilleur que trois ; chaque Maison a un rival chaque semaine, jamais le même deux fois. | `docs/calibration.md`, § Le rang |
| R3 | **À l'écran, seul** : la pilule et sa place, le rival sur la planche, le palais du Doge, les marques sur les façades, dans le laboratoire `?lab=planche&seul`. | parcours e2e à 390 px et sur ordinateur, captures |
| R4 | **En ligne** : le serveur tient la marée, les compteurs, le rival de chaque joueur, le règlement du dimanche ; routes `/api/planche` enrichies. | tests du serveur ; parcours à deux navigateurs |
| R5 | **Le Problème du jour** : tirage par la date, un essai par joueur, résultats à minuit, la marque sur la tour. | tests du serveur ; parcours e2e |
| R6 | **Le défi par le fil et la cote de la Passe** : proposer, accepter ou refuser, les deux Passes en direct, la cote mise à jour. | tests du serveur ; parcours à deux navigateurs |

Un commit par lot au moins ; je fusionne sur la branche principale à la fin de R4 (le rang et le rival jouables en ligne), puis après R6, sauf si tu veux tester plus tôt.

## 6. Ce qui n'est pas dans cette étape

Les ligues, la Sérénissime et la montée de monde (étape 9) ; la montée de l'encre et les sorties des capitaines (étape 9) ; le renom et les titres (avec l'apparat, plus tard) ; les compagnies (étape 8) ; les tutoriels du palais (étape 7) ; les pierres gravées en fin de marée (étape 9).

## 7. Tranché (11 novembre 2026, le porteur suit les quatre recommandations)

1. **Le Négoce** : le gain par heure-bobine tirée.
2. **Le rival** : un joueur de préférence, une Maison de l'ordinateur sinon.
3. **La place dans la pilule** : la place au classement du Doge.
4. **L'ordre** : le rang et le rival d'abord (R1 à R4, puis fusion), le Problème du jour et le défi ensuite (R5, R6).

## 8. État

| Lot | État |
| --- | --- |
| R1 | fait : `packages/engine/src/planche/rang.ts` (horloge de marée et semaines, Négoce par heure-bobine, Garde par heures tenues et péril, cote de la Passe reprise de `battleRatings`, places et Doge, rival désigné le lundi, duel du dimanche, lauriers proclamés en fin de marée), 13 tests ; règles dans `venice1450.planche.ts` (`rank`, `peril` des passages) |
| R2 | fait : section du rang dans le banc de la planche, `docs/calibration.md` § Le rang (un rival chaque semaine pour tous, jamais deux fois le même ; le Négoce ne revient pas à la plus grande île) ; une Maison prise par un joueur reçoit son rival tout de suite |
| R3 | fait : la place et sa tendance dans la pilule (un bouton), le rival marqué sur la planche (étiquette « rival », fils d'encre plus épais), la coiffe du Doge, les lauriers et les pavillons pris à côté des noms, le palais du Doge (`apps/web/src/porcellana/planche/Palais.tsx`), les nouvelles du lundi et du dimanche ; parcours `e2e:rang` à 390 px et sur ordinateur, captures dans `docs/classement-captures/` |
| R4 | fait : le serveur fait partir la marée le lundi à minuit (UTC, `mondayOf`), une Maison ne compte comme celle d'une personne qu'une fois prise, et reçoit son rival tout de suite ; 3 tests du serveur ; parcours `e2e:rang` en ligne à quatre invités |
| R5 | à faire |
| R6 | à faire |
