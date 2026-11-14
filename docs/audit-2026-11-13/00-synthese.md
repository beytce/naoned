# Synthèse du chef de projet : audit d'ensemble du 13 novembre 2026

**Validé par le porteur le 13 novembre 2026 : les décisions D1 à D8 du § 5 et l'ordre des lots du § 6 (« Je valide tout »).**

*Neuf auditeurs ont joué le vrai jeu (le web construit, un serveur local par auditeur, l'horloge avancée par relances sur la même base) et lu le code, après la fin du chemin de l'audit du 11 novembre (étapes 1 à 9, fusionnées). Rapports : `01` débutant sur téléphone, `02` stratège, `03` compétitif, `04` social, `05` game design F2P, `06` UX et direction artistique, `07` économiste, `08` QA et sécurité, `09` architecte ; captures dans `captures/`. Références : `R1` à `R9` = rapports 01 à 09, suivies de l'identifiant du constat (ex. `R8 Q1`). Aucun code n'a été modifié par l'audit.*

---

## 1. Verdict

**Pas encore publiable ; une bêta fermée de 100 à 300 joueurs est à portée de trois à quatre semaines de travail, sans rien inventer.**

| Auditeur | Question | Note |
| --- | --- | --- |
| R1 débutant sur téléphone | Est-ce que je reviendrais demain ? | 4 |
| R2 stratège | Assez de profondeur pour des mois ? | 4 |
| R3 compétitif | De quoi devenir bon ? | 5 |
| R4 social | Y amènerais-je mes amis ? | 4 |
| R5 game design F2P | Retenir des joueurs un an ? | 4 (7 atteignable avant la bêta) |
| R6 UX et direction artistique | Beau, clair, cohérent ? | 5,5 (beau 7, clair 4, cohérent 5,5) |
| R7 économiste | L'économie tient-elle un an ? | 4 |
| R8 QA et sécurité | Bêta publique demain ? | 4 |
| R9 architecte | L'architecture tient-elle une bêta ? | 5 |

**Moyenne ≈ 4,4 / 10.** Unanimité sur ce qui marche : **le cœur est rare et bon.** Le fil (une économie partagée en un geste), la Passe (un vrai duel de réflexion, la force 3 bat la force 2 dans 83 % des parties), l'île au terrain visible, la porcelaine et l'eau qui vire à l'encre, la marque, un grand livre juste au denier près sur des semaines, aucun geste confirmé perdu sur un `kill -9`.

Les quatre causes racines :

1. **Trop de systèmes, posés par-dessus la planche plutôt que fondus dedans.** Vingt-trois systèmes visibles et dix-huit compteurs (R5), six pilules sous le médaillon qui couvrent la colonne gauche et cachent dix étiquettes (R6 U1), 46 mots inconnus le premier jour (R1), et **aucun guide sur la planche** alors que les tutoriels guidés sont une décision du porteur (R1 D1). La règle « une douzaine de systèmes visibles, pas trente » n'est plus tenue.
2. **Une économie que le Large écrase, des ducats et des niveaux sans but.** Le Large fait 62 % de la valeur de la demande ; le détour y vend 37 fois plus que sans (R7 E1, R2 S1), dès le niveau 1. Les puits n'absorbent que 44 à 46 % de la monnaie créée ; 294 000 ducats inutiles à J+14 (R2), 458 000 à la semaine 26 (R7). Le plafond de Prestige rend la progression identique pour tous (l'assidu n'a que 19 % d'avance, R7 E4) et creuse la première semaine (le niveau ne monte que le lundi, R5).
3. **Les duels contre l'ordinateur se rejouent et se partagent.** Le lieutenant ne tire rien au hasard, le serveur rejoue la liste de coups envoyée, et le résultat n'est envoyé qu'au retour à la planche : une ligne gagnante prend une tour pour tout le monde, un essai perdu ne coûte rien en rechargeant la page (R3 C1-C2, R8 Q2, R2 S7). Les détroits noirs (la perte définitive de la règle 2), les commandes scellées, le Problème du jour et les sorties en héritent.
4. **Un serveur qui ne tient pas la charge d'une lagune active.** Chaque geste fait relire la planche entière à tous (poussée quadratique : 48 joueurs, 62 % d'un cœur, un geste à 4,5 s au pire, R9 A1) ; les duels et les sorties sont joués de façon synchrone dans la boucle (jusqu'à 6,9 s de serveur figé à 18 h, R9 A2, R8 Q3) ; l'état brut des 48 Maisons part à chaque lecture, ruses secrètes comprises (R8 Q1).

---

## 2. Vérifications dans le code

| Point | Verdict | Preuve |
| --- | --- | --- |
| Les ruses du port lisibles par tous (`R8 Q1`) | **Confirmé.** La vue renvoie `this.doc.state` entier, `houses[x].ruses` compris ; `hideRuses` ne masque que l'état de l'assaut. | `apps/server/src/game/planche.ts:545` ; `guerre.ts` (`hideRuses`) |
| Résultat d'un duel envoyé au retour seulement (`R3 C1`) | **Confirmé.** `duel.onEnd` n'est appelé qu'au clic sur « Revenir à la planche » (ou « Rompre ») : recharger la page efface l'essai. | `apps/web/src/porcellana/passe/LabPasse.tsx` (bouton `data-passe-back`) ; `LabPlanche.tsx` (`act(..., ["/daily" …])`) |
| Duels rejouables (`R3 C2`, `R8 Q2`) | **Confirmé.** `passeThink` sans générateur : même position, même réponse ; le serveur rejoue les coups reçus. | `apps/server/src/game/planche.ts` (`force`, `replays`, `solves`) ; `packages/engine/src/passe/mind.ts:101` |
| Don au phare sans rien donner (`R8`) | **Confirmé.** `take()` lit `h.stock[g]` sans `Object.hasOwn` : `toString` passe la garde. | `packages/engine/src/planche/arsenal.ts:135-139` |
| Détour vers le Large sans condition (`R2 S1`, `R7 E1`) | **Confirmé.** Seule condition : la ville a un `detourBps`. | `packages/engine/src/planche/planche.ts:631` |
| Poussée quadratique (`R9 A1`) | **Confirmé.** Chaque message `planche` du direct fait relire `/api/planche` et `/api/maison`. | `apps/web/src/porcellana/planche/LabPlanche.tsx:609-614` |
| Sorties jouées dans la boucle (`R9 A2`) | **Confirmé.** `plancheSortiesSettle` à chaque heure de `plancheDocAdvance`, synchrone. | `apps/server/src/game/planche.ts` (`plancheDocAdvance`) |
| Montée de ligue non atomique (`R8`) | **Confirmé.** `leave` puis `arrive` dans deux planches et deux écritures ; la marée est marquée réglée avant. | `apps/server/src/game/plancheLagoons.ts` (`turnLeagues`, `move`) |
| L'ordinateur bloqué sur l'Arsenal niveau 3 (`R7 E7`) | **Plausible, cohérent avec R2 S13** (l'ordinateur ne fait pas concurrence) : l'Arsenal 3 demande un plan depuis l'étape 8. | `packages/engine/src/planche/robot.ts:153,202,205` |
| `CLAUDE.md` ne décrit plus la planche (`R5`, `R9 A11`) | **Confirmé.** Les règles d'or parlent de la Porta, de Rome et des perles ; la planche suit CADRAGE-v4, encore marqué « en cours de validation » ; grand livre déduit de l'état, pas de `stock_movements`, file en mémoire au lieu des verrous par (monde, ressource). | `CLAUDE.md` ; `apps/server/src/game/plancheStore.ts` (`ledgerSince`) |

---

## 3. Les constats, consolidés

### P0 : à corriger avant toute bêta

| Id | Constat | Sources |
| --- | --- | --- |
| P0-1 | **Aucun guide sur la planche** : ni premier quart d'heure, ni ville visible à l'arrivée (Rialto hors écran), un premier atelier qui ne se rembourse pas dans la journée. | R1 D1, R5 |
| P0-2 | **Duels contre l'ordinateur rejouables et partageables** ; l'essai n'est pas engagé au premier coup. | R3 C1-C2, R8 Q2, R2 S7 |
| P0-3 | **Ruses secrètes lisibles par tous** ; plus largement, l'état brut de toutes les Maisons part à chaque joueur. | R8 Q1, R9 A7 |
| P0-4 | **Le Large domine** (détour × 37, ses jauges ne descendent jamais sous 81 %). | R7 E1, R2 S1-S2 |
| P0-5 | **Poussée quadratique et duels synchrones** : une lagune active fige le serveur. | R9 A1-A3, R8 Q3 |

### P1 : graves

| Id | Constat | Sources |
| --- | --- | --- |
| P1-1 | Vingt-trois systèmes visibles ; six pilules qui couvrent la planche ; lieux « pas encore » ouverts au premier jour. | R5, R6 U1, R1 |
| P1-2 | Les ducats sans usage après la 3ᵉ semaine ; une douzaine de niveaux qui n'ouvrent rien ; le rang 3 (bel ouvrage) promis au niveau 15 n'existe pas. | R7 E2-E5, R2 |
| P1-3 | Le Prestige crédité le lundi seulement : la première semaine sans montée, le niveau 2 jamais fêté. | R5, R1 |
| P1-4 | Aucun chiffre de rendement (un fil, une ville, un atelier par heure) ; « toi 0 % » faux sur la ville du Large. | R2 S3-S4 |
| P1-5 | La compagnie n'est pas sûre : masquage au 3ᵉ signalement seulement, ni exclusion ni blocage, l'administration ne voit pas les signalements, filtre contourné. | R4 S1-S4 |
| P1-6 | Rien à faire ensemble avant le niveau 6 (l'Arsenal) : le phare ne sert à rien d'ici là ; la montée de ligue sépare les amis sans prévenir. | R4 S5-S6, R5 |
| P1-7 | La cote du défi biaisée (la première Passe compte double), la pendule qui part avant l'écran, le laurier de la Passe où refuser tous les défis est la stratégie sûre. | R3 C4-C6 |
| P1-8 | Les six capitaines sortent tous contre la seule tour tenue ; le dernier sceau rafle la tour. | R3 C7-C8, R2 |
| P1-9 | Un rouge qui ne veut plus dire « à toi » (au moins sept rouges et deux couleurs étrangères) ; 43 étiquettes à la lagune sur téléphone, 18 recouvertes ; textes de 7 à 9 px ; 51 à 79 cibles sous 44 px par écran. | R6 U2-U6 |
| P1-10 | Les fiches récentes en listes et en texte (Guerre, palais, Muda, Gazette, Livre, journal de l'assaut) : la règle 8 n'est pas tenue. | R6 U5 |
| P1-11 | Pollution par clé héritée dans le don au phare ; montée de ligue coupée = Maison perdue ; plans qui s'entassent (34 inutilisés à 26 semaines). | R8, R7 E6 |
| P1-12 | Une seule instance possible ; le client fuit la mémoire du GPU ; la page d'accueil charge tout l'ancien jeu (1,74 Mo) ; l'ancien jeu tourne et écrit toujours. | R9 A4, A8-A10 |
| P1-13 | Aucune notification ni carte du retour ; la rétention de la planche ne se mesure pas (pas de télémétrie). | R5 |

### P2 : gênants (extraits ; liste complète dans chaque rapport)

Compte à rebours de chantier figé (R1, R2) ; trois Puissances et deux rangs différents à l'écran (R1, R6) ; un même passage sous deux noms (R1) ; le style « mur » sans effet (R3 C9) ; problèmes du jour qui reviennent tous les 20 jours (R3 C11) ; la Gazette qui ne parle ni des compagnies ni des tours (R4, R2) ; le rival toujours une Maison de l'ordinateur (R1, R4) ; « Quitter la compagnie » sans confirmation (R4) ; JSON mal formé en 500 (R8) ; instantané complet réécrit chaque minute (R9 A12) ; `LabPlanche.tsx` de 2 689 lignes (R9 A14).

---

## 4. Ce qu'il faut garder

- **Le fil** et ses parts des villes, la patine, le détour comme vrai compromis une fois réglé (R2, R5).
- **La Passe**, écran de référence (R6), duel profond (R3), et le Problème du jour, « court et satisfaisant » (R2).
- **L'île** : le gain affiché sur chaque case en main est « le meilleur geste de gestion du jeu » (R2).
- **L'assaut de la Guerre joué manche par manche sur le serveur** : le modèle à reprendre pour tous les duels contre l'ordinateur (R3).
- **Le lien d'invitation, la fondation de compagnie, les saluts sans texte libre** (R4).
- **Le grand livre juste, `Object.hasOwn` presque partout, zod sur chaque route, les droits qui tiennent** (R8).
- **La porcelaine, l'encre, la marque, deux polices, les mouvements réduits respectés** (R6).

---

## 5. Les décisions à prendre

| Id | Question | Proposé |
| --- | --- | --- |
| **D1** | Combien de systèmes à l'écran ? | **Douze**, trois le premier jour, les autres ouverts par étape et annoncés le jour de leur ouverture (R5) : l'Arsenal, la Guerre et le Lido fondus en un lieu, **le Port**, caché jusqu'au niveau 6 ; les commandes scellées fondues dans les villes ; les sorties et les détroits noirs dans les tours ; la Gazette devient la carte du dimanche. |
| **D2** | Que faire des décrets et des ligues, à peine faits ? | **Geler les ligues** pour la bêta (une seule ligue, pas de déménagement) et **retirer les décrets** de l'écran (R5) ; les reprendre quand il y aura des lagunes pleines de joueurs. |
| **D3** | La pile de pilules | **« La semaine »** : un ruban de sept jours en bas, une pastille seulement quand un geste t'attend ; le phare, le convoi, l'encre et le palais deviennent des objets de la planche (R6, maquette `captures/ux/maquette-pile.png`). |
| **D4** | Le Large | **R1 de l'économiste** : prix × 0,6, plancher à 3 000, détour à 20 % et à partir du niveau 6 (détour × 37 → × 4,8, mesuré). |
| **D5** | Les ducats et le haut de la progression | Un **puits** sans rendement personnel : l'entretien des tours en ducats brûlés, ou des ouvrages de prestige ; Prestige crédité au fil de l'eau sous le même plafond ; `perDucats` 50 → 15 ; courbe 20 → 28 ; supprimer ou créer le rang 3. |
| **D6** | Les duels contre l'ordinateur | **Joués par le serveur coup à coup** (comme l'assaut) : l'essai engagé au premier coup, une graine tirée par le serveur, gardée au journal. |
| **D7** | La monétisation future | Pas d'accélération payante ici (la production fait le rang, R5) ; plus tard : apparat, passe de marée cosmétique, abonnement d'étude de la Passe, pack de fondateur pour la bêta. |
| **D8** | `CLAUDE.md` | **Réécrire les règles d'or et les règles techniques pour la planche** (CADRAGE-v4 à valider d'abord), et décider du sort de l'ancien jeu : le retirer du serveur et de la page d'accueil (R9 A9-A10). |

---

## 6. Le plan proposé (à valider)

| Lot | Contenu | Validation |
| --- | --- | --- |
| **A. Le socle** (P0-3, P0-5, P1-11, P1-12) | Une vue par joueur sans les champs secrets ; poussée par version et lecture servie d'un cache ; duels et sorties dans un `worker_thread`, sorties hors du chemin de lecture ; `own()` dans `take`, `give`, `ships`, `defenses` ; déménagement de ligue en deux phases (ou ligues gelées) ; ancien jeu sorti de la page d'accueil ; fuite de géométries corrigée ; banc de charge en CI. | banc de charge : 48 joueurs actifs sous 10 % d'un cœur, aucune lecture au-delà de 200 ms ; tests de sécurité des routes |
| **B. Les duels honnêtes** (P0-2, P1-7, P1-8) | Le serveur joue les duels contre l'ordinateur coup à coup, graine au journal ; un essai par tour et par jour ; la cote du défi en un seul match, pendule au départ des deux écrans, minimum de défis au laurier ; sorties réparties entre les tours ; styles réels des capitaines. | tests du moteur et du serveur ; un rejeu de ligne refusé |
| **C. L'économie** (P0-4, P1-2, P1-3, P1-4) | Les réglages R1, R2, R5 de l'économiste ; le puits décidé en D5 ; Prestige au fil de l'eau ; ce que rapporte un fil et un atelier affiché ; l'ordinateur débloqué (E7). | `muda-bench`, `maison-bench`, banc de l'économiste, simulateur de 24 mois ; `docs/calibration.md` |
| **D. Douze systèmes et la semaine** (P1-1, P1-9, P1-10) | Le Port, les tours qui portent sorties et détroits noirs, les villes qui portent les commandes ; le ruban de la semaine ; une étiquette en trois tailles avec priorité et regroupement ; un seul rouge par jeton ; chaque fiche qui part d'une image ; 44 px et 11 px au moins. | e2e à 390 px et sur ordinateur, captures, revue avec la toile |
| **E. Le premier quart d'heure et le retour** (P0-1, P1-13) | Le guide de la planche (île, ferme, Rialto, fil, une tour d'entraînement gagnée, niveau 2 au bout) ; la carte « pendant ton absence » ; six notifications au plus ; télémétrie de la planche (J1, J7, J30). | e2e du premier quart d'heure ; un joueur neuf au niveau 2 en moins de 20 minutes |
| **F. La compagnie sûre** (P1-5, P1-6) | Masquage au premier signalement dans une petite compagnie, exclusion, blocage, signalements à l'administration, filtre renforcé ; un geste commun avant le niveau 6 ; amis jamais séparés sans prévenir. | tests des routes, e2e à trois comptes |

Ordre proposé : **A et B d'abord** (sans eux, rien d'autre ne tient), puis **C**, puis **D et E ensemble** (ce sont les mêmes écrans), puis **F** ; une bêta fermée de 100 à 300 joueurs après A, B, C et E.

---

## 7. Ce qui reste hors de cet audit

Les ligues et les commandes scellées n'ont pas été remesurées à l'économie (R7) ; l'assaut réel de la Guerre n'a pas été joué faute de flotte par le joueur compétitif (R3) ; la Sérénissime n'a été vue qu'en lecture. Les joueurs simulés décident comme le marchand de l'ordinateur et dépensent donc probablement moins qu'un vrai joueur (R7).
