# La Guerre de la semaine : plan (étape 6 de l'audit du 11 novembre 2026)

*Proposé le 12 novembre 2026, à la suite de l'Arsenal et de la flotte (`docs/plan-arsenal.md`, fusionné). Audit : `docs/audit-progression-2026-11-11/00-audit.md` § 6, révisé par `01-audit-guerre.md` (l'assaut en trois passes et trois manches, les ruses changées une fois par jour, le meilleur assaut compte ; tranchés le 11 novembre). Maquette : écrans 3b (la carte de la guerre), 3c (l'assaut), 3d (le port et ses ruses), 3e (le bilan). **Validé le 12 novembre 2026** avec les quatre recommandations du § 7.*

## 1. Le problème à régler

Les joueurs ont une flotte et un port (étape 5) mais rien à en faire. Le porteur veut « un système où les joueurs s'affrontent en utilisant le développement qu'ils ont eu dans le jeu », sur une semaine, sans pillage (règle 1), à niveau égal (règle 6), en quelques minutes par jour (règle 7).

Après cette étape : **chaque semaine, ta flottille affronte une flottille de même Puissance ; chaque jour, tu lances un assaut de trois minutes sur le port d'un adversaire, tel qu'il l'a bâti ; ton port se défend seul, comme tu l'as préparé.**

## 2. Ce que voit le joueur

| Où | Ce qu'il voit | Ce qu'il fait |
| --- | --- | --- |
| **La carte de la guerre** (écran 3b) | Les ports de la flottille adverse, leurs sceaux déjà pris par les tiens, le score des deux flottilles, le jour de la semaine. | Choisir un port. |
| **L'assaut** (écran 3c) | Le port adverse en Porcellana : ses trois passes, leurs défenses, et au-dessus de chacune ce que la défense annonce pour la manche. Ses navires en bas, en cartes. | Trois manches : poser ses navires sur les passes ; dix secondes d'animation ; les tours tombent, les navires rentrent abîmés. |
| **Le bilan** (écran 3e) | Les sceaux brisés, les dégâts, le Prestige gagné, le replay. | Revoir, ou partager. |
| **Ton port** (écran 3d) | Les défenses (étape 5) et, pour chaque passe, une **ruse secrète** ; les assauts subis, leurs replays. | Changer ses ruses une fois par jour. |
| **Le port d'entraînement** (le Lido des corsaires) | Un port sans enjeu, à toute heure, et son tutoriel guidé de trois manches. | Apprendre sans rien risquer. |

## 3. Les règles

### 3.1 L'assaut (`01-audit-guerre.md` § 4)

- **Un port a trois passes ; l'assaillant a trois manches ; chaque tour qui tombe brise un sceau** (trois au plus).
- À chaque manche, **le port annonce** ce que chaque défense fera ; l'assaillant pose ses navires (tous ceux qui ne sont pas abîmés) ; la manche se résout passe par passe.
- **Les pièces**, une règle chacune : galère *solide* (la tour la vise en premier), brigantin *rapide* (change de passe entre deux manches), brûlot *brûle* (la chaîne ou un navire, puis disparaît), galéasse *bombarde* (double contre une tour, dès la 2ᵉ manche), nef *répare* (1 de coque aux navires de sa passe). La tour tire 3 sur le premier navire, la chaîne ferme la passe tant qu'elle tient, la batterie frappe 1 chaque navire.
- **Les ruses** : une par passe, secrète, parmi trois (*la chaîne qui se lève à la 2ᵉ manche*, *le brûlot caché*, *les renforts à la 3ᵉ manche*). Elle se révèle quand elle joue ; changée une fois par jour.
- **Rien n'est pris** : un navire coulé rentre abîmé et se répare à l'Arsenal (étape 5). Un sceau brisé ne coûte rien au défenseur.
- **Pur et rejoué** : l'assaut est une fonction du port, de la flotte, des placements et d'une graine. Le serveur le rejoue ; c'est son verdict qui compte, et il sert de replay.

### 3.2 La semaine

| Jour | Ce qui se passe |
| --- | --- |
| **Lundi** | Le jeu forme les **flottilles** et les apparie. Chacun prépare son port et ses ruses. |
| **Mardi à samedi** | **Un assaut par jour et par joueur**, sur un port de la flottille adverse. |
| **Dimanche** | La flottille qui a brisé le plus de sceaux gagne. Le bilan et les replays. |

- **Sur chaque port, seul le meilleur assaut compte** (0 à 3 sceaux). Le score d'une flottille est la somme des meilleurs assauts.
- **Les dégâts comptent aussi** : un assaut à zéro sceau rapporte au moins un tiers du Prestige d'un sceau.
- **Personne n'est obligé** : qui ne joue pas n'enlève rien à sa flottille ; son port se défend seul.

### 3.3 Les flottilles

- **Avant les compagnies** (étape 7), le jeu forme des **flottilles de six** Maisons de la même bande de Puissance (règle 6). La compagnie les remplacera, sans changer l'assaut.
- Une flottille rencontre une flottille de la même bande. Quand les joueurs manquent, des **Maisons de l'ordinateur** de la même Puissance complètent : leurs ports, armés par elles (étape 5), sont des cibles comme les autres.

### 3.4 Le Prestige (dans le plafond de la semaine)

- Par sceau brisé, par dégâts, par défense qui tient (laurier de la Garde), et pour la flottille victorieuse. Le barème se règle au banc.

## 4. La technique

- **Moteur** : `packages/engine/src/guerre/` : l'assaut (pur, avec graine), les intentions annoncées, les ruses, la résolution par passe et par manche, le replay ; puis la semaine (flottilles, appariement par bandes, meilleur assaut, score). Tests d'abord, sur une fixture.
- **Serveur** : la guerre de la semaine par lagune (ou entre lagunes), les assauts comme commandes au journal, les ruses du port, les replays gardés ; le règlement du dimanche avec le Prestige.
- **Écran** : la carte de la guerre, l'assaut en Porcellana (trois colonnes, le port dessiné avec ses vrais bâtiments), le bilan et le replay, les ruses dans le port, le port d'entraînement et son tutoriel guidé.

## 5. Les lots

| Lot | Contenu | Vérification |
| --- | --- | --- |
| W1 | **Le moteur de l'assaut** : pièces, défenses, intentions, ruses, trois manches, replay. | tests du moteur |
| W2 | **Le banc de l'assaut** : flottes et ports de la lagune (étape 5), placements au hasard et placements réfléchis. | aucune composition ne gagne plus de 55 % contre l'ensemble des défenses ; le meilleur placement gagne nettement plus qu'au hasard ; environ 30 % d'assauts à trois sceaux, 1,6 sceau en moyenne ; `docs/calibration.md` |
| W3 | **Le port d'entraînement** : le Lido des corsaires, l'écran de l'assaut, le bilan et le replay, les ruses dans le port, le tutoriel guidé. | parcours e2e à 390 px et sur ordinateur ; un assaut en 3 minutes |
| W4 | **La Guerre** : la semaine, les flottilles, l'appariement, la carte de la guerre, le meilleur assaut, le Prestige, le dimanche. | tests du serveur ; parcours e2e |
| W5 | **Le banc de la guerre** : une saison de guerres entre flottilles de bandes égales. | l'issue est proche de 50 % ; le Prestige reste sous le plafond ; `docs/calibration.md` |

Fusion sur la branche principale à la fin de W5 ; le port d'entraînement (W3) peut être fusionné plus tôt pour être essayé.

## 6. Ce qui n'est pas dans cette étape

Les compagnies et leur discussion (étape 7), les réservations de ports et les signes sur la carte (avec la compagnie), les détroits qui donnent le vent (plus tard), la Gazette (étape 8), les détroits noirs et la perte définitive (étape 8).

## 7. Tranché (12 novembre 2026, le porteur suit les quatre recommandations)

1. **Les flottilles de six**, formées par le jeu chaque lundi par bande de Puissance, complétées par des Maisons de l'ordinateur ; la compagnie les remplacera.
2. **L'appariement dans toutes les lagunes** du serveur, par bande de Puissance.
3. **Le geste** : toucher le navire, puis la passe (glisser aussi sur ordinateur).
4. **Le Prestige** : 20 par sceau, 7 pour un assaut sans sceau mais avec des dégâts, 10 par assaut repoussé en défense (40 au plus par semaine), 60 pour la flottille victorieuse ; dans le plafond de la semaine.

## 8. État

| Lot | État |
| --- | --- |
| W1 | fait : `packages/engine/src/guerre/assaut.ts` (pur et sans hasard : l'assaut est donné par le port, la flotte et les trois placements ; les intentions annoncées ; la chaîne qui retient ou que deux galères rompent en y passant leur manche ; le brûlot qui la brûle ; la tour qui vise la galère d'abord ; la batterie qui frappe tout ; la galéasse double contre la tour dès la 2ᵉ manche ; la nef qui répare ; le brigantin qui change de passe ; les navires gardés en réserve qui entrent plus tard ; les trois ruses ; une passe tombe quand rien n'y tient plus et qu'un navire y flotte encore ; le replay) ; `guerre/port.ts` (le port d'une Maison avec ses ruses, sa flotte en état de naviguer ; les ruses posées une fois par jour) ; règles et Prestige de la lagune de Venise. 8 tests. |
| W2 | fait : banc `assaut-bench` (`docs/calibration.md` § L'assaut). Ruses adoucies (le brûlot caché fait 2, les renforts sont deux barques de 1 · 2), le brûlot sans chaîne fait 4 à une tour, le brigantin a 3 de coque ; aucune flotte n'est la meilleure sur plus d'un tiers des ports ; le placement réfléchi brise nettement plus que le hasard ; **hors cible** : 1,3 à 1,5 sceau par assaut et peu d'assauts à trois sceaux, avec un assaillant de banc qui ne voit qu'une manche : à remesurer avec les testeurs. |
| W3 | fait : le Lido des corsaires (port d'entraînement de la lagune : la bouche fermée d'une chaîne et d'une tour, une tour au nord, une batterie au sud, deux ruses), ouvert depuis la fiche de sa Maison et depuis l'Arsenal, avec sa flotte ou une flotte prêtée ; l'écran de l'assaut (`apps/web/src/porcellana/guerre/AssautScreen.tsx`, en 2D Porcellana : les trois passes et ce qu'elles annoncent, les défenses et leur coque, la ruse révélée, la passe tombée ; ses navires en cartes, toucher un navire puis une passe ; la manche racontée ligne à ligne ; le bilan : sceaux, dégâts, navires abîmés, rejouer) ; le tutoriel guidé des trois manches à la première fois (qui mène à deux sceaux) ; les ruses secrètes dans la fiche du port, gardées une fois par jour (commande `ruses` au journal, route `/api/planche/port/ruses`). **Le port en 3D avec les vrais bâtiments reste à faire** (W4). 1 test du serveur ; parcours `e2e:assaut`, captures dans `docs/guerre-captures/`. |
| W4 | fait :
- **le moteur** (`guerre/semaine.ts`) : les flottilles de six par bande de Puissance, complétées par les Maisons de l'ordinateur et appariées à la flottille de la même bande ; le retardataire entre à la place d'une Maison de l'ordinateur que nul assaut n'a touchée, ou ouvre sa propre guerre ; le score où seul le meilleur assaut de chaque port compte ; le Prestige du barème retenu ; le Prestige versé dans la semaine de la Maison (`plancheGrant`) ;
- **le serveur** (`apps/server/src/game/guerre.ts`, tables `guerre_weeks` et `guerre_assaults`, migration 0037) : les flottilles formées au premier regard de la semaine dans toutes les lagunes ; un assaut par jour du mardi au samedi, joué manche par manche sur le serveur (les ruses cachées tant qu'elles n'ont pas joué ; le jour est pris dès le début de l'assaut) ; son port et sa flotte gardés pour le replay ; les navires coulés rentrés abîmés à l'Arsenal ; le dimanche, le Prestige versé une fois ; routes `/api/guerre`, `/api/guerre/start`, `/api/guerre/round` ;
- **l'écran** : la pastille « La Guerre » sous le médaillon, la fiche de la guerre (`GuerreSheet.tsx` : la phase de la semaine, le score des deux flottilles, les ports adverses et leurs sceaux pris, « Assaillir », sa flottille, les assauts subis), l'assaut joué par le serveur, « Reprendre l'assaut ».

3 tests du moteur, 2 du serveur ; parcours `e2e:guerre` (la vraie formation des flottilles ; l'assaut répondu par des états du moteur joués d'avance), captures dans `docs/guerre-captures/`. Fait ensuite (12 novembre 2026, à la demande du porteur) : **l'assaut en 3D** (`AssautBoard.tsx` : l'île attaquée au nord avec ses vraies cases et ses vrais bâtiments, envoyée par le serveur au début de l'assaut ; trois passes d'eau ; à leur embouchure les tours, les batteries et leur coque, la chaîne tendue, les barques des renforts ; les navires en réserve au sud puis en file dans leur passe, qui y naviguent, coulent, gris ; les éclairs des tirs, les tours qui s'écroulent, le sceau rouge qui tourne sur la passe tombée ; les fiches des passes qui suivent la scène ; toucher une passe y envoie le navire choisi) ; **le replay** d'un assaut mené ou subi (`/api/guerre/assault/:id`, « Revoir » dans la fiche, la scène rejouée manche par manche) ; **la carte de la guerre** dessinée (les deux flottilles face à face, leurs sceaux pris, son port cerclé de rouge, les ports réservés). |
| W5 | fait : banc `guerre-bench` (`docs/calibration.md` § La Guerre de la semaine) : 73 % des guerres se jouent à trois sceaux près ou moins ; la flottille la plus puissante n'en gagne que 38 % (la Puissance surestime sans doute les défenses du port) ; 0,95 sceau par assaut ; Prestige de guerre de 100 par semaine en médiane, 180 pour les plus actifs. |
