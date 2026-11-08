# Audit de la refonte de la Terraferme : synthèse (8 novembre 2026)

Trois experts ont relu la refonte de la Terraferme en Porcellana. Elle se trouve sur la branche `claude/magical-bohr-1x8m5v` (lots T1 à T5, `docs/plan-terraferme-porcellana.md`) et **n'est pas fusionnée** : aucune pull request n'a été ouverte. Elle est en retard de 92 commits sur `claude/brave-rubin-8rti3o`, et une fusion d'essai donne 4 conflits.

| Rapport | Angle |
|---|---|
| [01-expert-openfront.md](01-expert-openfront.md) | Un joueur d'OpenFront (openfront.io), documenté par le code source du jeu et ses notes de version : ce qui manque pour plaire à ses fans |
| [02-expert-ux-ui.md](02-expert-ux-ui.md) | Lisibilité, parcours, mobile, retours, écart avec la maquette ; laboratoire lancé et capturé (`captures/`) |
| [03-expert-fondaco.md](03-expert-fondaco.md) | Respect des règles d'or et du plan de publication, conflits de fusion, boucle d'interdépendance des modes |

## 1. Ce sur quoi les trois experts s'accordent

1. **Le travail visuel est bon et se garde.** Plateau en porcelaine, émail qui coule, rubans de front, bâtiments, dock : c'est la Terraferme la plus fidèle à la règle 8 qu'on ait eue.
2. **L'argent décide trop.** C'est le défaut le plus grave, relevé par l'expert OpenFront et l'expert Fondaco.
   - Le maximum de troupes est fixe (60) et ne monte qu'avec les ducats. Forts, bombarde, hausse du maximum et achat de troupes se paient aussi en ducats.
   - Au simulateur, un marchand riche est Signore 10 graines sur 10, même sans l'achat de troupes.
   - Ça contredit l'esprit des règles 4 (« à armes égales ») et 6 (« jamais sur la caisse »), et c'est rédhibitoire pour un fan d'OpenFront.
3. **Le rythme est à l'opposé d'OpenFront.** Un pas toutes les 30 minutes, 33 h avant le premier front entre marchands, une case par pas quelle que soit la taille du front. Les terres ne grossissent pas l'armée, il n'y a pas de boule de neige et personne ne gagne avant les points du dimanche.
4. **La partie rapide existe déjà dans le moteur, mais elle est cachée.** L'escarmouche (`skirmish.ts` : 15 minutes, 8 joueurs, un pas toutes les 5 s) vit dans le monde mensuel et n'est pas branchée dans l'empire. C'est le pont vers OpenFront le moins cher.
5. **L'interface n'est pas prête à publier.**
   - Textes au « vous », contre la décision D1 : le test du glossaire casse.
   - Presque impossible de s'allier : toucher un voisin ouvre « Attaquer ».
   - Le dock du front promet un chiffre faux (« jusqu'à 30 cases »).
   - Aucune pilule de retour après un ordre.
   - Un peu plus de la moitié de la maquette seulement, alors que T5 est noté « fait ».
   - Plateau en boîte de 72 vh dans l'onglet Compagnie, cibles tactiles sous 44 px.
6. **La carte politique se lit mal.** Voisins en trois nuances d'encre, marchands éloignés estompés, relief trop présent. Une teinte par voisin et le nom avec la force sur chaque terre sont demandés par l'expert OpenFront comme par l'expert UX/UI.

## 2. La proposition centrale : deux formats sur un même plateau

| | **La Semaine** (celle du cadrage) | **La Bataille** (nouvelle, façon OpenFront) |
|---|---|---|
| Rythme | Asynchrone, du lundi au dimanche | En direct, 12 à 15 minutes (règle 7) |
| Moteur | `terraferma.ts` | `skirmish.ts`, porté dans l'empire |
| Équité | Trésor de guerre de la semaine **égal pour tous** dans un théâtre, intendance par la route plafonnée ; plus d'achat de troupes | **Strictement égale** : rien de l'empire n'y entre, monnaie propre à la partie |
| Armée | Le territoire fait l'armée (maximum qui grandit avec les terres) | Pareil, avec croissance rapide et vitesse selon la masse engagée et la largeur du front |
| Fin | Seuil de victoire qui baisse au fil de la semaine, théâtres plus petits | Grande bombarde de fin de partie (pas de bombe atomique), remparts comme parade |
| Appariement | Bande de Puissance | Cote (Elo) seule, puisque tout le monde a les mêmes armes |
| Rôle | Le mode de fond, relié à l'empire | La porte d'entrée : salons toujours pleins grâce aux bots, liens à partager, jouable tôt, peut-être sans compte |

Une Bataille classée par jour peut rapporter de la Gloire à la Semaine, avec un plafond (lien H). Ainsi le fan d'OpenFront trouve son format, et la Semaine reste celle du cadrage.

## 3. L'interdépendance des modes (rapport 03, § 3)

Principe : **chaque mode est le chemin le plus court vers quelque chose, jamais le seul.**
- Vers la Terraferme ne circulent que du **temps** et de la **logistique plafonnée**.
- Depuis la Terraferme ne sortent que du **prestige**, de l'**accès** et des **occasions**, jamais du rendement.

Les neuf liens, de A à I :

- **A. L'intendance par la route** : les ateliers livrent le Campo en tournée. Les décisions du porteur du 7 novembre s'appliquent.
- **B. Le trésor de guerre égal** remplace l'achat de troupes.
- **C. Les commandes de guerre** : une ville disputée publie des commandes ouvertes à tous, même aux pacifiques.
- **D. Les villes tenues** : une bannière sur la carte de tous et une lettre de la Signoria.
- **E. Les Sceaux de guerre** s'échangent contre des plans.
- **F. Les étendards de Rome** : un cosmétique de la Porta planté sur le camp.
- **G. Les convois de compagnie** pendant la Contesa.
- **H. La Bataille du jour** rapporte de la Gloire plafonnée.
- **I. Le Carnet en trois colonnes** : commerce, Porta et Terraferme.

Aujourd'hui, la Terraferme pèse 0,1 % de la progression, alors que le plafond est de 15 % : les liens ont de la marge.

## 4. Pour aller chercher les fans d'OpenFront (rapport 01, § 5)

Il faut d'abord la Bataille ; viennent ensuite :
- jouer sans compte, sans exiger le Fondaco niveau 5 ;
- des liens de salon à partager ;
- une cote et des profils publics ;
- des replays, que le moteur déterministe permet déjà ;
- un Discord avec tournois et clans ;
- une version légère pour les portails de jeux web ;
- des cosmétiques seulement à vendre.

L'Italie de 1450 est la différence assumée : on reprend les mécaniques d'OpenFront, jamais son nom ni son visuel.

## 5. Ordre proposé

1. **Remettre la branche à jour et la fusionner** :
   - résoudre les 4 conflits : `CLAUDE.md` (garder la règle 3 réécrite), `docs/calibration.md`, `Lab.tsx`, `catalogue.ts` ;
   - passer les textes au « tu » ;
   - garder la grille hexagonale par défaut et l'achat de troupes fermé (`troopBuy` absent) en attendant la décision du porteur.
2. **Les P0 de l'interface** (rapport 02, § 9) : voisin accessible, promesse juste du front, pilules de retour, plein écran, cibles de 44 px.
3. **T5b : l'équité de la Semaine** : trésor de guerre égal, intendance par la route, territoire qui fait l'armée. À mesurer au simulateur, toutes les graines.
4. **T6** : le retour (« pendant ton absence »), les villes tenues.
5. **T6b : la Bataille** (`skirmish.ts` dans l'empire, salons avec bots, cote).
6. **T7** : passage à la grille carrée un lundi, puis les autres liens (commandes de guerre, Carnet, Contesa).

## 6. Questions au porteur

1. **L'achat de troupes avec les ducats** : le garder, ou le remplacer par un trésor de guerre égal et l'intendance par la route ? Les experts recommandent de le remplacer. Faut-il aussi plafonner toute dépense en ducats à la Terraferme (forts, maximum) et supprimer le don de ducats entre alliés ?
2. **La Bataille**, une partie en direct de 12 à 15 minutes à armes égales : on la fait ?
   - Ouverte dès le premier jour, avant le Fondaco niveau 5 et même sans compte, pour attirer les fans d'OpenFront ? Ça déroge à D1.
   - Appariée par la cote seule ?
   - Durée de 15 minutes, ou 20 comme OpenFront en assouplissant la règle 7 ?
3. **Le territoire fait l'armée** : le maximum de troupes grandit-il avec les terres, comme sur OpenFront ?
4. **La refonte dans le plan de publication** : un lot 8 de la bêta, ou après ?
5. **Les villes tenues** : une bannière par théâtre ou par bande ? Que se passe-t-il quand deux Maisons tiennent la même ville ?
6. **Le Bourg** : gardé, mais fermé pour la bêta ?
7. **Fusionner maintenant** les lots T1 à T5, avec la grille hexagonale et l'achat de troupes fermés ?
