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
| W1 | à faire |
| W2 | à faire |
| W3 | à faire |
| W4 | à faire |
| W5 | à faire |
