# Audit du 13 novembre 2026 · 02 · Le joueur stratège (ordinateur, 1280 × 800)

Point de vue : un joueur assidu de jeux de gestion, d'optimisation et de city-builders, qui lit les chiffres, cherche la meilleure combinaison et revient plusieurs fois par jour. Partie jouée sur le vrai serveur (port 3622, base PGlite à moi), relancé à des heures choisies du lundi 16 novembre au mardi 1er décembre 2026 (J+15). Maison : **Ca' Calcolo**, cannaregio-1, lagune de Murano.

---

## 1. Verdict

**Note : 4/10 pour la question « assez de profondeur pour des mois ? ».**

La boucle de base est bonne : on tire un fil, on l'entretient (patine), on bâtit une île dont les bonus de voisinage se lisent, et l'Arsenal transforme les marchandises en navires. Mais l'économie actuelle a **une stratégie dominante trouvée en dix minutes**, et rien ne la contredit. Au niveau 1, le **détour vers les villes du Large** est ouvert : je vends du sel 28 à 30 ducats à Candie et Constantinople au lieu de 2 à 5 à Trévise. Au bout de deux semaines, j'avais vendu 25 fois plus que la meilleure Maison de mon sestiere. Mes 294 000 ducats ne servent plus à rien, et le niveau monte de 500 de Prestige par semaine, quoi que je fasse. L'optimisation est récompensée en ducats, une monnaie qui ne mène à rien, et jamais en progression. C'est le contraire de ce que cherche un stratège.

---

## 2. Ce que j'ai fait

| Jour (heure UTC) | Gestes |
| --- | --- |
| Lun 16, 8 h | Connexion par lien magique et fondation de Ca' Calcolo. L'île a 4 cases (3 de sable, 1 de pré) et 3 000 ducats. |
| Lun 16, 9 h | **À l'écran** : achat d'une case de rive (400 ducats), une saline posée sur la meilleure case (+50 %, d'après le geste « en main »), puis une sablière (+50 %). Sur la planche, j'ouvre les cartes de Rialto, Trévise, Chioggia, Candie et Constantinople, puis je tire **à l'écran** un fil de sel vers Constantinople **par le détour** (60 % de la charge). |
| Lun 16, 9 h 45 | Fils de sel vers Candie (par le détour) et Trévise : les 3 bobines sont prises. |
| Mar 17, 9 h 30 – 10 h 15 | **À l'écran** : la planche, la feuille de la Maison, le classement, puis le **Problème du jour, résolu** (D2 puis B6/C6 : « Passé : c'était la clef »). |
| Mar 17, 11 h | Passe : **la même suite de 5 coups, rejouée 3 fois en une seconde, prend le Canal 1**. Une suite trouvée pour la bouche de Dorsoduro brise aussi un sceau. |
| Mer 18, 9 h – 12 h | **À l'écran** : « Reprendre » le fil de Trévise, puis la feuille de la Muda. Le fil vers le môle (sable) ne part qu'après le retour de la bobine. |
| Jeu 19 – dim 22 | Suivi de l'état, puis la Gazette à l'écran (dimanche). |
| Lun 23, 8 h – 15 h | La fin de semaine me fait passer du **niveau 1 au niveau 6** d'un coup. J'achète 7 cases, bâtis une verrerie et un camp de bûcherons, monte les ateliers au niveau 2, bâtis l'Arsenal. **À l'écran** : l'Arsenal (une galère mise en chantier), le port et l'île. 3 fils de verre vers le Large, par le détour. |
| Jeu 26, 9 h | Ateliers montés au niveau 3, une deuxième sablière. |
| Lun 30, 9 h | Fin de la semaine 2 : niveau 8. Pendant mon absence, le Canal 1 a été repris par 3 sorties de capitaines. |
| Mar 1er déc., 10 h | **À l'écran** : la feuille de la Maison au niveau 8. |

Une visite utile dure 2 à 5 minutes. À partir du mardi de la première semaine, il n'y a **plus aucune décision à prendre** jusqu'au lundi suivant, à part le Problème du jour et la Muda.

**Le relevé de la partie** (vendu cumulé, d'après `house.book.sold`) :

| Moment | Moi | Meilleure Maison du sestiere | Mes ducats | Niveau |
| --- | --- | --- | --- | --- |
| Lun 16, 18 h | 3 345 | 16 | 4 745 | 1 |
| Mer 18, 9 h | 18 568 | 1 037 | 20 196 | 1 |
| Lun 23, 8 h | 75 582 | 2 330 | 77 745 | 6 |
| Jeu 26, 9 h | 183 759 | 14 635 | 155 092 | 6 |
| Lun 30, 9 h | 361 438 | 25 064 | 294 027 | 8 |

Le livre de compte tombe juste : départ + ventes − île + péages reçus = ducats, à 0 denier près (sondé le 23 et le 30 novembre). Je n'ai trouvé **aucune incohérence de stock, de prix ni de bobines** dans le moteur.

---

## 3. Constats

| Id | Gravité | Constat | Preuve | Proposition |
| --- | --- | --- | --- | --- |
| S1 | **P0** | **Le détour vers le Large est ouvert dès le niveau 1 : c'est une stratégie dominante.** À Constantinople et Candie, le sel se paie 28 à 30 ducats ; au Rialto, 4, et à Trévise, 5 puis 2 une fois la jauge partagée. Avec 60 % de la charge, un fil par le détour rapporte environ 180 ducats/h, contre 40 à 50 pour le meilleur fil proche. Une seule saline nourrit deux fils pareils. Le premier jour, j'ai fait 3 345 ducats en 8 h ; la meilleure Maison du sestiere, 16. | `planche.ts:631` : le détour n'est conditionné qu'à `detourBps` (60 %, `venice1450.lagune.ts:250`), ni au niveau ni à la distance. Le relevé ci-dessus : 361 k contre 25 k à J+14. Captures `02-carte-constantinople-sel.png`, `10-constantinople-toi-0.png`. | Ouvrir le Large par niveau (les bouches au niveau 6, les détroits au niveau 11, par exemple), ou faire dépendre le détour de la distance (charge, temps). Revoir le prix du sel au Large (3 000 et 2 800 deniers, soit six fois Trévise). Valider ensuite au simulateur. |
| S2 | **P0** | **Les jauges du Large ne s'épuisent jamais par le détour, donc les « parts des villes » ne jouent pas.** Un fil par le détour porte 6/h, alors que la ville en regagne 12/h (8 × 1,5). Mes 5 fils du Large sont restés à jauge pleine pendant 14 jours (`left = cap` : 300 ou 330). Le prix reste au maximum, il n'y a aucune concurrence et aucune raison de diversifier. | Relevés du 16, du 19, du 26 et du 30 novembre : `gauge left=300/330` pour chaque fil. `planche.ts:472`. | Rendre les jauges du Large plus étroites que la somme des fils qui y vont, pour que deux Maisons s'y disputent quelque chose. |
| S3 | **P1** | **La carte d'une ville affiche « toi 0 % » alors que mon fil y vend.** La part se calcule sur ce qui est dépensé de la jauge ; une jauge pleine donne 0 % à tout le monde. Le joueur croit que son fil ne sert à rien. | Capture `10-constantinople-toi-0.png` (« toi 0 % · libre 100 % »). `plancheShares`, `planche.ts:462-490`. | Montrer ce que le fil a **vendu** (unités et ducats de la dernière heure ou du jour), pas seulement la part d'une jauge. |
| S4 | **P1** | **Aucune carte ne dit combien rapporte un fil, une ville ou un atelier.** La carte d'une ville donne le prix unitaire ; la Maison donne la production par heure (« sel 54 par heure ») ; le menu « Bâtir » donne le prix et le terrain, sans rendement. Il faut un tableur pour comparer « sel à Candie, 28 × 6/h » et « verre à Candie, 48 × 6/h, avec la patine perdue ». | Captures `00-batir-sans-chiffres.png` et `02-carte-constantinople-sel.png` ; la carte de la Maison (v11.log). | Une seule ligne par fil, « ≈ 250 ducats/h (+50 % de patine) », sur la carte de la ville et dans la liste des fils de la Maison. Dans « Bâtir », le rendement par heure à côté du gain en %. |
| S5 | **P1** | **Le niveau ne récompense pas l'optimisation.** Le Prestige de commerce est plafonné à 55 par jour, soit 2 750 ducats vendus ; je les dépassais dès le lundi midi. Le total est plafonné à 500 par semaine et n'est crédité que le dimanche. Tout joueur un peu actif monte exactement au même rythme : du niveau 1 au niveau 6 en un saut à J+7, au niveau 8 à J+14, et ainsi de suite (le niveau 11 à J+28, le niveau 30 vers la 34ᵉ semaine). | `rang.ts:470` (le crédit à la semaine) ; `weeklyCap: 500` (`venice1450.lagune.ts:306`) ; `commerce.dailyCap: 55`. La feuille de la Maison (v05.log) : « Le Prestige de la semaine 55 / 500 » dès le premier jour. | Garder le plafond (règle 7), mais donner au stratège un **but en ducats** : des bâtiments de prestige, des chantiers, des commandes coûteuses. Ou créditer le Prestige au jour le jour, pour que le niveau 2 tombe le mardi. |
| S6 | **P1** | **Les ducats n'ont plus d'usage après la première heure.** Au niveau 1, les bobines bloquent tout : une saline (30/h) dépasse déjà ce que 3 fils emportent (22/h). J'ai acheté une sablière pour rien (240 de sable en stock, invendable). À J+14 : 294 000 ducats ; l'île entière, montée au niveau 3, en a coûté 72 000, et l'Arsenal paie en marchandises. | Le relevé ci-dessus ; « Tes marchandises, pas tes ducats » (la feuille de l'Arsenal, capture `07-arsenal-galere.png`). | Un puits de ducats lié au jeu : l'entretien des tours, les cales en plus, les cases au-delà du plafond, les ouvrages de prestige. Ou bien ne plus afficher une bourse qui grossit sans but. |
| S7 | **P1** | **La Passe se rejoue à l'identique : une suite gagnante gagne toujours.** Le lieutenant du serveur joue sans hasard (`passeThink` sans `rng`), et l'essai n'est pas limité. La même suite de 5 coups sur le Canal 1 a brisé 3 sceaux en une seconde et m'a donné la tour ; une suite trouvée hors du jeu brise la bouche de Dorsoduro. Les suites circuleront sur les forums, et les sceaux (15 de Prestige chacun) et les tours deviennent gratuits. | `apps/server/src/game/planche.ts:817` ; la route `/api/planche/force` est seulement limitée à 20 par minute (`plancheRoutes.ts:296`). Mesure : `canal-1 try 1/2/3 → ok, ok, tour prise`. | Une graine de hasard par jour et par tour (le serveur la tire et la donne au client), et un essai par tour et par jour. |
| S8 | **P2** | **Reprendre un fil coûte des heures de bobine, et le jeu ne le dit pas.** Le retour compte 20 min par case, soit 3 h depuis Trévise et **11 h 20 depuis le môle de la Muda** (34 cases) : la bobine est restée absente de 8 h 45 à plus de 15 h. Le message dit seulement « la bobine revient au quai ». | `rewindMsPerTile: 20 min` (`venice1450.lagune.ts:255`) ; « Fil repris… » (`LabPlanche.tsx:1202`) ; mesure : `rewinding until 12:00:46` pour une reprise faite à 8 h 20. | Afficher « de retour dans 3 h 20 » avant « Reprendre », et sur la bobine dans le bandeau. C'est un bon compromis, s'il se voit. |
| S9 | **P2** | **La Muda immobilise une bobine pour presque rien.** Le plafond est de 20 unités par jour, et une fois atteint le fil ne fait plus rien. Les 60 unités chargées m'ont rapporté 144 ducats, plus 30 de Prestige ; le retour de la bobine a pris 11 h. Le fil vers le môle reste en place après le vendredi, sans le dire. | `dailyCap: 20` (`venice1450.lagune.ts:493`) ; mes fils du 19 au 23 novembre (`mole-de-san-marco/sand d=115.8 h`). | Une charge en un geste (« charger 20 de sable aujourd'hui ») sans bobine, ou un fil qui se reprend tout seul quand le plafond du jour est atteint. |
| S10 | **P2** | **Le bouton de la Muda se propose sans bobine libre et échoue en silence.** Le bouton « Sable · 240 » est là ; le serveur refuse (`planche_no_bobbin`), et la feuille ne dit rien. | v09.log : `threaded false` ; la réponse de l'API : `409 planche_no_bobbin`. `Muda.tsx:237`. | Le désactiver avec la raison : « aucune bobine libre, de retour à 12 h ». |
| S11 | **P2** | **Les niveaux 9 et 10 n'ouvrent rien : un creux de deux semaines.** Au niveau 8 (J+14), la feuille annonce le prochain palier au niveau 11, soit à 2 000 de Prestige, deux semaines plus loin. Le bel ouvrage (tier 3) est au niveau 15, à la 8ᵉ semaine. Entre J+3 et J+7, rien ne s'ouvre non plus : je suis resté au niveau 1 toute la première semaine, avec 55 de Prestige le premier jour. | `venice1450.lagune.ts:296-297` ; la feuille de la Maison du 1er décembre (« 11 · l'île à 28 cases · à 2 000 »). | Un palier à chaque niveau (une cale, un emplacement de port, un navire, une case). |
| S12 | **P2** | **La durée des chantiers est fausse de 0 à 10 minutes.** L'île compte le temps sur `state.now`, qui n'avance que par tranches de 10 min. Une sablière de 5 min affichait « chantier · 7 min », et l'amélioration reste grisée jusqu'à la tranche suivante. | `IleScreen.tsx:65` (`const now = state.now`) ; v03.log : « Sablière · 1 chantier · 7 min » juste après la pose. | Prendre l'heure du serveur, plus le temps écoulé depuis la dernière lecture, pour les comptes à rebours. |
| S13 | **P2** | **Les Maisons de l'ordinateur ne font pas de concurrence.** Le 18 novembre, la meilleure du sestiere avait vendu 1 037 ducats, et moi 18 568. Une seule (Ca' Donà, d'un autre sestiere) a partagé une jauge : Trévise, où le sel est tombé à 2 ducats. Elles ne prennent pas le Large. | Le relevé du « sestiere earned » (les fichiers `view-*.json` de mon dossier de travail). | Rendre les Maisons de l'ordinateur aussi bonnes qu'un joueur appliqué, avec le détour (`plancheRobot` sait déjà le prendre). Sinon le classement du sestiere est acquis d'avance. |
| S14 | **P2** | **La Gazette ne raconte que la Muda.** La première semaine : « La Muda rentre, 0 détroit passé », trois lignes de chargeurs, et c'est tout. Rien sur les ventes, la tour prise, le rival battu ni les niveaux. | Capture `06-gazette-dimanche.png`. | Ajouter la plus grosse vente, la tour prise et les niveaux gagnés : le stratège veut se voir dans la presse. |
| S15 | **P2** | **À 1280 × 800, les boutons de gauche chevauchent le choix d'échelle.** « Problème du jour » recouvre le haut de la pastille « lagune / sestiere / île ». | Captures `03-planche-mardi-fils.png` et `02-carte-constantinople-sel.png`. | Décaler la pastille sous la colonne de boutons, ou replier la colonne. |
| S16 | **P2** | **Une tour prise se perd sans qu'on puisse la défendre si l'on n'est pas là.** Trois sorties de capitaines (Dragut, Turgut, Kemal Reis) dans la semaine 2 m'ont repris le Canal 1 ; je l'ai appris au Livre (« sortie… perdu »). La pose d'une garde n'est jamais proposée au moment où l'on prend la tour. | `maison.livre` du 30 novembre ; `canal-1 → corsair:Kemal Reis`. | À la prise d'une tour, proposer tout de suite « pose ta garde » ; annoncer la sortie dans le bandeau de la planche. |

---

## 4. Ce qui marche

- **Le livre de compte est exact** : ventes, île, péages reçus et Muda tombent juste au denier près, sur deux semaines.
- **L'île en main** : le « +50 % » s'affiche sur chaque case libre selon le terrain et le voisinage, et la meilleure case est désignée. C'est le meilleur geste de gestion du jeu, lisible sans tableur.
- **La patine** (+10 % par jour, jusqu'à +50 %, perdue si l'on reprend le fil), avec le **retour des bobines** : une vraie tension entre garder un fil et le déplacer, quand elle se voit.
- **L'Arsenal** : « tes marchandises, pas tes ducats », avec le coût en marchandises et le stock à côté (« 80 bois (116) »). Le lien entre l'île et la flotte est clair.
- **Le Problème du jour** : une vraie position (un coup double, D2 puis B6 ou C6), courte et satisfaisante, une fois par jour.
- **La feuille de la Maison** annonce les quatre prochains paliers avec leur seuil en Prestige.
- **La fiche de la Maison sur la planche** : « Ton île fait : bois (40 par heure), sel (54 par heure), verre (31 par heure) », avec l'entrepôt et son plafond. C'est le bon format ; il manque l'équivalent pour les fils.
- **L'alerte de l'entrepôt** (« Sel presque plein : l'atelier va s'arrêter ») applique bien la règle 3.

---

## 5. Mes trois recommandations prioritaires

1. **Casser la stratégie dominante du détour et rendre les villes disputées (S1, S2, S13).** Ouvrir le Large par niveau ou faire payer le détour par la distance, resserrer les jauges du Large pour qu'elles s'épuisent, et donner le détour aux Maisons de l'ordinateur. Le test : au simulateur de 24 mois, un fil par le détour au niveau 1 ne doit pas rapporter plus de 2 fois le meilleur fil proche, et les jauges du Large doivent descendre sous 50 % une partie de la journée.
2. **Afficher ce que rapporte chaque fil, en ducats par heure, et ce que coûte sa reprise (S3, S4, S8, S10).** Une ligne « ≈ x ducats/h · patine +y % · retour en z h » sur chaque fil et dans « Bâtir ». C'est ce qui transforme le jeu en jeu de décisions, sans tableur.
3. **Donner un but aux ducats et un palier à chaque niveau, et rendre la Passe non rejouable à l'identique (S5, S6, S7, S11).** Des usages des ducats liés au jeu (ouvrages de prestige, cales, entretien des tours), un déblocage à chaque niveau entre 8 et 15, et une graine du jour pour le lieutenant, avec un essai par tour et par jour. Sans cela, après J+7 l'optimiseur n'a plus rien à optimiser, et la tour se gagne par une suite copiée.

---

*Captures* : `docs/audit-2026-11-13/captures/stratege/`, de 00 à 10. Celle de la Maison au niveau 8 (09) a expiré sur la machine chargée ; son texte est cité au constat S11. *Scripts et journaux* : `/tmp/claude-0/-home-user-naoned/cabcd3da-95f1-5456-b8d1-734e5fa37f88/scratchpad/audit-stratege/`. Le serveur du port 3622 est arrêté.
