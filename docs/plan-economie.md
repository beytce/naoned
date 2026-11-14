# L'économie : plan (lot C de l'audit d'ensemble du 13 novembre 2026)

*Proposé le 14 novembre 2026, après les duels honnêtes (`docs/plan-duels.md`, fusionné). Décisions D4 et D5 de `docs/audit-2026-11-13/00-synthese.md`. Sources : `07-economiste.md` (E1 à E7, réglages R1 à R6, mesurés), `02-joueur-stratege.md` (S1 à S4), `05-expert-game-design.md`, `01-joueur-debutant-mobile.md` (R5 : le niveau 2 jamais fêté). **Validé le 14 novembre 2026** avec les trois recommandations du § 7. Critère : sur un an, le Large reste une récompense sans écraser le reste ; les ducats achètent quelque chose qui compte, sans vendre de puissance ; chaque semaine fait monter, du premier jour au dernier niveau.*

## 1. Le problème à régler

- **Le Large écrase tout** : 62 % de la valeur de la demande ; le détour vend 37 fois plus que sans, dès le niveau 1, et ses jauges ne descendent jamais sous 81 % (E1, P0-4).
- **Les ducats ne servent plus à rien dès la 3ᵉ semaine** : le revenu plafonne vers 22 000 ducats par semaine et par Maison ; les puits n'absorbent que 44 à 46 % de la monnaie créée ; 458 000 ducats inutiles en semaine 26 (E2, E3).
- **La progression est un calendrier, et le haut est vide** : le plafond de 500 par semaine est atteint par tous ; le niveau 30 tombe en semaine 34, puis plus rien ; douze niveaux n'ouvrent rien ; le niveau 15 promet un rang 3 d'ateliers qui n'existe pas (E4, E5).
- **Le Prestige n'est crédité que le lundi** : la première semaine ne monte pas, le niveau 2 n'est jamais fêté (P1-3).
- **Aucun chiffre de rendement** : ce que rapporte un fil, une ville, un atelier à l'heure ne se lit nulle part ; « toi 0 % » est faux sur une ville du Large (P1-4).
- **Les Maisons de l'ordinateur cessent de bâtir** dès qu'elles butent sur l'Arsenal ; leur île reste figée, et tous les bancs sous-estiment les puits (E7).

## 2. Ce que voit le joueur

- **Le Large est une récompense, à partir de la Casa (niveau 6)** : on y vend encore quatre à cinq fois plus qu'en sestiere, mais il se dispute, ses jauges baissent, et le reste de la lagune compte.
- **Ce que rapporte chaque chose se lit sur la planche** : sur un fil, « ≈ 1 240 d./h » ; sur une ville, la part de chacun ; sur un atelier, ce qu'il produit à l'heure. Le chiffre accompagne l'objet, il ne le remplace pas (règle 10).
- **Le Prestige monte au fil de l'eau** : chaque vente, chaque duel gagné le crédite aussitôt, sous le même plafond de la semaine ; le niveau 2 tombe le premier soir, fêté.
- **Les ducats bâtissent des ouvrages** : visibles de tous sur l'île, sans rendement, à coût croissant ; ils racontent la Maison et la classent à la Gazette.
- **Le haut de la progression couvre l'année** : la courbe s'allonge (le niveau 30 vers la semaine 47), et chaque palier ouvre quelque chose qu'on voit.

## 3. Les règles

### 3.1 Le Large (C1, décision D4, réglage R1 mesuré)

- Prix des villes de l'anneau `large` × 0,6 ; plancher `floorBps` 5 000 → 3 000 ; détour `detourBps` 6 000 → 2 000.
- **Le détour s'ouvre au niveau 6** (`detourMinLevel`, une ligne dans `plancheThread`).
- Attendu (mesuré par l'économiste) : détour × 37 → × 4,8 ; monnaie créée − 40 % ; part du Large dans les ventes 31 à 44 %.

### 3.2 Le Prestige (C2, R2 et R5)

- **Au fil de l'eau** : le Prestige gagné est crédité à mesure, sous le plafond de la semaine (500, plus le rattrapage), au lieu d'un crédit unique le lundi ; le lundi ne fait plus que remettre le compteur de la semaine.
- `commerce.perDucats` 50 → 15 : le Prestige du commerce s'atteint sans le Large.
- `curve` 20 → 28 : le niveau 30 vers la semaine 47.
- Les niveaux muets ouvrent quelque chose : des bobines, des cases, et les ouvrages (6, puis les grands au 15).

### 3.3 Le puits : les ouvrages (C3, décision D5)

- Des ouvrages de prestige sur une case de l'île : visibles de tous, sans rendement, à coût croissant (chaque ouvrage coûte plus que le précédent) ; les ducats sont brûlés au grand livre.
- Les ouvrages ordinaires dès la Casa (niveau 6) ; **les grands ouvrages au niveau 15** : c'est le rang 3 promis.
- La Gazette nomme l'ouvrage de la semaine ; la fiche de la Maison les compte. Ordre de grandeur à absorber : environ 4 000 ducats par Maison et par semaine une fois R1 appliqué.

### 3.4 Les sources récentes (C4, R3 et R4)

Les plans (détroits noirs) à un essai par jour et cinq reliques ; le phare trois fois plus lent.

### 3.5 Le rendement affiché (C5)

- Le moteur donne, par fil, la vente moyenne à l'heure de la dernière tranche (`plancheThreadYield`), et par atelier ce qu'il produit à l'heure ; la part de chacun dans une ville compte les fils du détour.
- Sur la planche : une étiquette sur le fil choisi, la part sur la fiche de la ville, la production sur l'atelier de l'île.

### 3.6 L'ordinateur (C6, E7)

- `plancheRobotBuild` laisse l'Arsenal hors de son critère « tout est au sommet » et de ses montées ; il recommence à acheter des cases et à monter ses ateliers.

## 4. La technique

- **Moteur** : tests d'abord, sur des fixtures. `plancheThread` (le détour et son niveau), `maison.ts` / `rang.ts` (le crédit au fil de l'eau sous le plafond), le puits (selon la question 1), `plancheThreadYield`, `robot.ts`.
- **Thème** : les réglages dans `venice1450.lagune.ts`, jamais ailleurs.
- **Bancs** : le banc de l'économiste (`eco-bench`, ajouté au simulateur cette fois : 48 Maisons, quatre profils), `maison-bench`, `arsenal-bench`, `muda-bench` ; avant et après dans `docs/calibration.md`.
- **Serveur** : une commande au journal pour le puits ; la vue porte les rendements.
- **Écran** : l'étiquette du fil, la part de la ville, l'atelier, le puits sur l'île, le niveau fêté le jour même.
- **Règles stables** : un changement d'équilibrage s'annonce avant de s'appliquer (la Gazette le dit) ; pas encore de joueurs réels, donc appliqué à la fusion.

## 5. Les lots

| Lot | Contenu | Validation |
| --- | --- | --- |
| C1 | Le Large : prix, plancher, détour au niveau 6. | tests du moteur, `eco-bench` |
| C2 | Le Prestige au fil de l'eau, `perDucats` 15, courbe 28, les paliers. | tests, `maison-bench` |
| C3 | Le puits. | tests, `eco-bench` (part de la monnaie absorbée) |
| C4 | Les plans et le phare ralentis. | `muda-bench`, calcul |
| C5 | Le rendement affiché : fil, ville, atelier. | tests, e2e à 390 px, captures |
| C6 | L'ordinateur débloqué. | `arsenal-bench`, `maison-bench` |
| C7 | La mesure d'ensemble sur 24 mois du simulateur, `docs/calibration.md`, PR. | bancs |

## 6. Ce qui n'est pas dans ce lot

Les douze systèmes et le ruban de la semaine (lot D), le premier quart d'heure (lot E), la compagnie sûre (lot F) ; l'argent réel (aucune accélération payante, D7).

## 7. Tranché (14 novembre 2026)

1. **La forme du puits.** (a) Des **ouvrages de prestige** sur l'île : campanile, loggia, fontaine… visibles de tous, sans rendement, à coût croissant, classés à la Gazette ; (b) l'**entretien des tours** en ducats brûlés chaque jour ; (c) les deux. *Recommandation : (a). L'entretien est une taxe qui court pendant qu'on dort, contre la règle 8 ; les ouvrages se voient (règle 10) et ne se perdent pas (règle 3).*
2. **Le rang 3 promis au niveau 15.** (a) Les **grands ouvrages** sont le rang 3 : le niveau 15 ouvre les plus beaux ouvrages (un seul puits, pas un système de plus, D1) ; (b) créer des ateliers de rang 3 (une production de plus) ; (c) retirer le rang 3 et faire ouvrir autre chose au niveau 15. *Recommandation : (a).*
3. **Les sources récentes** (plans des détroits noirs, phare). (a) Ralentir comme l'économiste l'a mesuré (un essai noir par jour, cinq reliques un plan ; le phare trois fois plus lent) ; (b) n'y pas toucher dans ce lot. *Recommandation : (a), puisque le puits et la courbe changent en même temps.*

## 8. État

Validé ; lots à venir.
