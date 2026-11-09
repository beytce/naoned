# Audit de la Terraferme vue par un joueur d'OpenFront

*8 novembre 2026. Auteur : un joueur expert d'OpenFront, analyste game design. Code lu : l'extrait de la refonte Porcellana (lots T1 à T5). Les chemins cités sont relatifs à la racine du dépôt.*

---

## 1. OpenFront en bref

### La boucle de jeu

Tu arrives sur la page d'accueil, tu tapes un pseudo et tu rejoins un salon public (FFA, Équipes ou « spécial », avec des variantes). Tu choisis ton point de départ sur une vraie carte du monde (Europe, Afrique, monde…) pendant une phase d'apparition d'environ 20 secondes. Ensuite, tu t'étends sur la terre libre, tu tombes sur tes voisins, tu t'allies ou tu les attaques. Tu construis villes, ports et défenses, tu finis à la bombe. La partie s'arrête quand un joueur ou une équipe tient 80 % de la terre (70 % en équipes). Elle dure **10 à 30 minutes**, puis tu en relances une autre aussitôt.

### Les mécaniques clés (chiffres lus dans le code, dépôt `openfrontio/OpenFrontIO`, novembre 2026)

| Mécanique | Règle et chiffres |
| --- | --- |
| Temps | Un tick toutes les 100 ms (`Config.msPerTick`). Tout est continu. |
| Troupes max | `2 × (cases^0,6 × 1 000 + 50 000)` + **250 000 par niveau de ville** (`Config.troopCap`). **Le plafond grandit avec ton territoire.** |
| Croissance | Par tick : `10 + troupes^0,73 / 4`, multiplié par `(1 − troupes/max)`. Elle est la plus rapide vers 40 % du plafond, d'où l'art de « garder sa réserve à mi-hauteur ». |
| Départ | 25 000 troupes pour un humain. Les bots ont un plafond divisé par 3 et une croissance divisée par 2. Les nations IA vont de 0,5× à 1,25× selon la difficulté. |
| Attaque | Tu envoies une part de tes troupes (20 % par défaut, réglable avec le curseur du **ratio d'attaque**). Le front avance sur **toute la frontière commune**. Plus ta pile est grosse face au défenseur, moins chaque case te coûte (rapport borné de 0,6 à 2) et plus tu avances vite (`EngineConfig.attackLogic`). Le défenseur perd sa densité (troupes ÷ cases) à chaque case perdue. |
| Terrain | Plaine (pertes 80, coût de vitesse 16,5), collines (100 / 20), montagne (120 / 25). |
| Grands empires | Un bonus en sigmoïde rend les gros empires plus rapides et moins coûteux à l'attaque, pour que la fin de partie ne s'enlise pas. |
| Bâtiments | Ville, port et usine : 125 k d'or, le prix double à chacun, jusqu'à 1 M au plus. Poste de défense : 50 k puis +50 k, jusqu'à 250 k ; il multiplie les pertes de l'attaquant par 5 et ralentit son avance par 3. SAM : 1,5 M puis 3 M. Silo : 1 M. |
| Or | 100 par tick de base, plus les **navires marchands** entre ports : environ 75 k en sigmoïde de la distance, plus 50 par case parcourue. Les trains passent entre les usines. Quand tu prends un joueur, tu gagnes la moitié de son or (tout l'or d'un bot). |
| Mer | Les débarquements emportent 1/5 des troupes. Les navires de guerre (250 k à 1 M) gagnent des niveaux de vétérance, coulent les transports et capturent les marchands. |
| Armes lourdes | Bombe A à 750 k, bombe H à 5 M, MIRV à 25 M (+15 M par MIRV déjà tiré dans la partie). Les retombées défendent mieux le sol touché. Le SAM intercepte les bombes. |
| Alliances | Une demande expire en 20 s. Une alliance dure 5 minutes, puis se renouvelle ou non. Le **traître** subit pendant 30 s une défense ×0,5 et une vitesse ×0,8. Les nouveaux alliés détruisent les bombes qu'ils se lancent. |
| Communication | Emojis, chat rapide, embargo, dons d'or et de troupes. |
| Anti-blocage | En option : l'*overtime* (le seuil de victoire baisse de 2 points par minute après 30 min) et la « Doomsday Clock » (le camp sous la barre perd ses troupes, puis son territoire pourrit). |

### Ce qui rend OpenFront addictif

1. **Le premier contact arrive dans la minute.** Dès la deuxième minute, tu décides qui manger.
2. **La vague.** Ta couleur coule sur la carte en direct, à une vitesse qui dépend de ta masse. C'est le plaisir viscéral du genre.
3. **Le dosage.** Le curseur du ratio d'attaque et la courbe de croissance donnent un vrai savoir-faire : garder sa réserve vers 40 %, ne jamais vider sa frontière.
4. **La politique en temps réel.** Une alliance de 5 minutes, une trahison au mauvais moment, une poignée d'emojis.
5. **L'escalade finale** : les silos, les bombes, les SAM, la course au MIRV. Chaque partie a son climax.
6. **« Encore une. »** Une défaite ne coûte que 15 minutes, et la suivante démarre aussitôt.
7. **Aucune barrière.** Le jeu se lance dans le navigateur, sans compte, sur une carte du monde réel que tout le monde reconnaît.

### Son public et son modèle

- Un public large : 200 000 à 250 000 joueurs par jour d'après l'étude de cas de la régie Playwire (chiffre du vendeur), et environ 1 million de joueurs par mois d'après le Patreon d'avril 2025 (chiffre déclaré).
- Le jeu est sorti sur Steam en accès anticipé en septembre 2026, il a une application iOS et il est relayé par des portails (CrazyGames).
- Il gagne de l'argent par la publicité, un magasin de cosmétiques (motifs, drapeaux), Patreon et Steam. Aucune puissance n'est à vendre.
- Il a un classé 1v1 avec Elo, puis un classé en équipe et en clans, des tournois (« OpenFront Masters »), des profils publics et des salons réservés aux comptes de confiance.

### Ses faiblesses (ce que les joueurs critiquent)

- **Le *teaming*** en FFA : des clans s'allient en douce. Les développeurs ont répondu par des profils publics, un bouton de signalement et une partie publique sur quatre réservée aux comptes de confiance.
- **La trahison** vécue comme injuste. Les patchs ont ajouté une confirmation et la destruction des bombes entre nouveaux alliés.
- **Les bombes à la chaîne** en fin de partie et l'**effet boule de neige** : le premier gros joueur écrase tout, d'où le bonus des grands territoires, réglé et plafonné à plusieurs reprises.
- **Les parties qui s'enlisent**, d'où l'*overtime* et la Doomsday Clock.
- **Les bots en masse** sur les petites cartes, et le jeu mobile moins confortable que sur PC.

**Sources** : [dépôt GitHub OpenFrontIO](https://github.com/openfrontio/OpenFrontIO) (README ; `packages/engine-lib/src/configuration/Config.ts`, `packages/engine/src/configuration/EngineConfig.ts`, lus au commit du 7 novembre 2026) ; notes de version [v0.29.14](https://newreleases.io/project/github/openfrontio/OpenFrontIO/release/v0.29.14), [v0.30.0](https://newreleases.io/project/github/openfrontio/OpenFrontIO/release/v0.30.0), [v0.33.13](https://newreleases.io/project/github/openfrontio/OpenFrontIO/release/v0.33.13), [v0.34.13](https://newreleases.io/project/github/openfrontio/OpenFrontIO/release/v0.34.13) ; [étude de cas Playwire](https://www.playwire.com/cases-studies/openfront-io) ; [Patreon OpenFront](https://www.patreon.com/OpenFront/posts/support-future-125640087) ; [raijin.gg (estimations Steam)](https://raijin.gg/app/3560670/OpenFront) ; guides de la communauté ([openfrontpro, ratio d'attaque](https://openfrontpro.pages.dev/mechanics/attack-ratio), [villes](https://openfrontpro.pages.dev/buildings/city), [croissance](https://openfrontpro.pages.dev/mechanics/population-growth)) ; [actualité Water Nukes (communityone)](https://communityone.io/servers/1360870529568870410/moon-openfrontio/news/water-nukes-openfront-gamemode-2026-05-15/) ; [rawg.io](https://rawg.io/games/openfront). *Limites de l'enquête : Reddit, la page Steam et gamingonlinux.com étaient bloqués par le réseau de la session. Le ressenti des joueurs vient des notes de version et de commentaires épars, pas d'un dépouillement de r/OpenFrontIO.*

---

## 2. Comparaison point par point

| Point | OpenFront | La Terraferme (refonte) | Verdict du fan |
| --- | --- | --- | --- |
| **Durée** | 10 à 30 min, en direct | **Une semaine** du lundi au dimanche (`empire/terra.ts`). Une semaine sur deux, c'est la Contesa en compagnies (`isContesaWeek`), donc le chacun-pour-soi n'a lieu qu'**une semaine sur deux** | Le cœur du problème |
| **Rythme** | Un tick à 100 ms | Un pas toutes les **30 min**, de 8 h à 22 h seulement (`venice1450.settings.ts:264-265`). La « bataille du soir » va de 20 h à 20 h 30, avec un pas toutes les 3 min (l. 269) | Asynchrone, lent, avec une nuit morte |
| **Premier contact** | 1 à 2 min | **33 h** avant le premier front entre marchands (`docs/calibration.md`, § cases carrées) | Une éternité |
| **Plafond de troupes** | Grandit avec les cases (puissance 0,6) et les villes | **Fixé à 60** (`base: 60, perCell: 0`, l. 305-306). Il ne monte qu'avec les **ducats** (`capRaise`, l. 321) | La boucle « je m'étends donc je grossis » est coupée |
| **Croissance** | Courbe en cloche, à son maximum vers 40 % du plafond | Linéaire : 6 + 1 par case + 3 par ville par heure ouverte, ×2 si personne ne cultive (`terraferma.ts:581-591`). Au départ, « +11/h » (captures `t5-*.png`) | Lisible, mais sans savoir-faire de dosage |
| **Ratio d'attaque** | Curseur de 1 à 100 %. Une pile plus grosse paie moins et va plus vite | Curseur de 10 à 100 % (`minShareBps`). **La vitesse est fixe : une case par pas**, quelle que soit la pile (`cellsPerStep: 1`, `terraferma.ts:1661`). Sur terre libre, une case par heure (`neutralEverySteps: 2`, l. 1660) | Aucune « vague » : 10 ou 500 hommes avancent au même pas |
| **Échange des pertes** | L'attaquant perd 80 à 120 × un rapport × (base + densité). La défense est avantagée sauf face à une pile écrasante | L'attaquant paie la densité × terrain × ville × fort (`cellCost`, `terraferma.ts:729-756`). Le défenseur perd sa densité (l. 1668) : **1 pour 1 en plaine**, et la taille de la pile n'y change rien | Plus de bonus de masse, plus de tactique de concentration |
| **Front** | Toute la frontière commune avance | Une seule case à la fois, la plus proche de la visée (`nextCell`, l. 1609). Trois fronts au plus (l. 852) | Un « serpent » d'une case de large |
| **Terrain** | 3 types, peu de défense en plus, surtout de la lenteur | 4 types, ×1 à ×2 en défense, milices de 8 à 28 (l. 287-292) | Correct, et même plus lisible |
| **Bâtiments** | 6 bâtiments utiles, au prix qui double à chaque exemplaire | Fort (×1,6 sur 5 cases), port, bombarde, remparts, bourg en option (l. 312-319). Un bâtiment pour tant de cases (`perCells`) | Bonne idée du quota par terres. Les bâtiments sont peu nombreux et payés en **ducats du commerce** |
| **Mer** | Débarquements, navires de guerre, commerce maritime au cœur de l'économie | Barques d'un rivage à l'autre (10 min par case d'eau), galères qui coulent 30 % d'un débarquement (`porto`, l. 315). Aucun revenu maritime dans la partie | Accessoire |
| **Économie interne** | L'or vient de la partie elle-même (terres, ports, trains, conquête) | L'argent vient **de l'empire** (ducats, pain, planches). La vente de troupes, `troopBuy` (l. 324), donne 20 troupes pour 100 d, trois fois par jour | Ce qui compte est fait hors de la partie |
| **Alliances** | 5 min, renouvelables ; trahison punie 30 s | 2 alliés au plus ; une rupture prend effet au bout de 2 h ; le traître (plus de 2 ruptures dans la semaine) est puni 24 h (`settings.ts:624-631`) | Cohérent à l'échelle de la semaine, mais sans tension sur l'instant |
| **Armes lourdes** | Bombes A et H, MIRV, SAM | Bombarde : portée 4, **un tir par jour**, 150 d (l. 318) | Aucun climax |
| **Bots** | Bots faibles pour remplir, nations IA réglables | Milan, quatre nations de caractère (Gonzague, Este, Aquilée, Empire), les maisons PNJ | **Le point fort de la Terraferme** : des PNJ historiques avec un comportement |
| **Fin de partie** | 80 % de la terre, ou l'*overtime* | 80 % (`winBps`, l. 1557). Sinon, au dimanche, le classement à la Gloire. Au simulateur, le premier tient **6 à 7 % de la carte** (`calibration.md`) | Personne ne gagne vraiment : on finit aux points |
| **Lisibilité** | Couleurs franches, nom et troupes inscrits dans le territoire | Porcelaine blanche, toi en rouge, les autres en « encres » grises. Chaque case porte un relief (dôme, pyramide). Les voisins se distinguent mal de la terre libre (`t5-front.png`, `t2-plateau.png`) | Très beau, mais la carte politique est illisible |
| **Accès** | Un pseudo, puis « Jouer » | Il faut un compte, une Maison, la **Casa 4** et un Campo posé (`checkCamp`, `empire/terra.ts:181`), puis payer l'entrée en planches de Venise | Un fan d'OpenFront n'y arrivera jamais |
| **Partie rapide** | C'est tout le jeu | Le moteur a déjà l'**escarmouche** : 15 min, 8 joueurs, 30 cases chacun, un pas toutes les 5 s (`skirmish.ts`, réglages l. 361-375). Mais elle ne connaît que « lancer » et « rappeler » (`skirmish.ts:235-237`), trois appels par jour seulement, une seule partie classée par jour, et **elle n'est pas branchée dans l'écran de l'empire** (seulement dans les anciens écrans `apps/web/src/game/`) | La moitié du chemin est faite, et elle est cachée |

---

## 3. Ce qui manque ou déçoit un fan d'OpenFront (du plus grave au moins grave)

1. **Il n'y a pas de partie en direct.** Le plaisir d'OpenFront, c'est réagir en quelques secondes : contre-attaquer, boucher une brèche, trahir au bon moment. Ici, un front prend une case toutes les 30 minutes pendant que tu travailles. Tu perds des terres sans les voir partir, puis tu les regardes rejouées au retour (lot T6). Ça ressemble à du Travian, pas à OpenFront. La demi-heure de bataille du soir à 20 h ne rattrape pas ce rythme : ce sont 10 pas en tout, à une heure fixe.
2. **Ton argent compte plus que ton jeu.** Le plafond est bloqué à 60 et ne se relève qu'avec les ducats. S'y ajoutent la vente de troupes et des bâtiments payés en ducats. La mesure est sans appel : un « riche » est **Signore 10 fois sur 10**, avec ou sans la vente (`docs/calibration.md`, § troupes achetées ; question 3 de `docs/plan-terraferme-porcellana.md` § 7). Pour un fan d'OpenFront, où tout le monde part à égalité, c'est rédhibitoire. Ça contredit aussi la promesse « à armes égales » de CADRAGE-v3 § 8, même avec la règle 4 réécrite.
3. **Il n'y a pas de vague.** La vitesse ne dépend ni de la masse engagée ni de la largeur du front (`terraferma.ts:1661-1676`). Le curseur ne règle que *jusqu'où* tu iras, jamais *à quelle vitesse*. Le geste central d'OpenFront, « j'envoie 60 % et je déferle », a disparu.
4. **Le territoire ne nourrit pas l'armée.** Les terres augmentent un peu le recrutement, mais pas le plafond (`capOf`, l. 566-579). Sans boule de neige, il n'y a ni course à l'expansion ni de vrai sens à « manger le bot d'à côté ».
5. **Personne ne gagne vraiment.** Au simulateur, le premier tient 6 à 7 % de la carte et les trois premiers 17 à 20 %. La semaine finit aux points de Gloire, sans conquête. OpenFront se termine sur un vainqueur.
6. **Pas de climax.** Une bombarde qui tire une fois par jour sur 4 cases n'a rien d'une bombe H. Il n'y a ni escalade ni défense antiaérienne qui compte.
7. **La carte se lit mal.** Toutes les encres grises se ressemblent, et le relief de chaque case (dômes, pyramides) écrase les frontières. Sur `t5-front.png`, on ne sait pas qui tient quoi autour de « Ton camp ». Sur téléphone, la pilule « Case du bord · À l'arrêt » chevauche le dock (`t5-telephone-front.png`).
8. **L'entrée est fermée aux nouveaux.** Il faut la Casa 4, un Campo, des planches, un théâtre de la semaine en cours, et ne pas tomber une semaine de Contesa.
9. **L'escarmouche est sous-exploitée.** C'est le bon format, mais réduit à deux ordres, avec des bots qui attaquent toujours « le plus faible » (`aiMoves`, `skirmish.ts:188`), sans bâtiments, sans alliances et sans mer. Elle n'ouvre qu'à 12 h 30, 18 h 30 et 21 h 15 (`calls`, l. 374).
10. **Les détails.** Le texte passe du « tu » au « vous » (« Ton camp » d'un côté ; « Vos terres » et « Votre camp » dans `apps/web/src/i18n.ts:1021-1022`, contre la décision D1 du plan de publication). Un commentaire n'est plus à jour : « the six around it » (`terraferma.ts:740`), alors qu'un fort couvre désormais 5 cases.

**Ce que le fan aimera** : la carte de la Vénétie historique, les nations de 1450 avec leur caractère, les poches encerclées qui tombent (`fallPockets`), la capitale protégée tant qu'on n'attaque personne (`peacefulSafe`), la prévision des fronts avec ses équerres, et la beauté de la coulée d'émail. La base est saine. C'est le **tempo** et l'**économie** qui l'éloignent du genre.

---

## 4. Recommandations

Les recommandations sont classées par impact. L'effort est noté S (quelques jours), M (une à deux semaines) ou L (plus d'un mois).

### R1. Une « Partie rapide » en direct à côté de la semaine (priorité absolue)

- **Le quoi.** Sortir l'escarmouche de l'ombre et en faire le mode phare du genre :
  - un salon public qui se lance dès 8 à 30 joueurs, complété par des bots ;
  - 10 à 15 minutes, sur la carte de la Vénétie (environ 600 cases ; plus tard, l'Italie ou la Méditerranée) ;
  - toutes les règles : forts, ports et barques, remparts, bombarde, alliances, signaux ;
  - victoire à 80 % ou au plus de terres au gong ;
  - un salon toutes les deux ou trois minutes, à toute heure, au lieu de trois appels par jour ;
  - des salons privés par lien, pour jouer entre amis.

  Côté code : brancher `apps/server/src/game/skirmish.ts` sur `/api/empire`, réutiliser `TerraPlay.tsx` et `porcellana/terra/` (qui savent déjà animer une semaine en accéléré, voir `?lab=porcellana&vue=terraferme`), et étendre `SkirmishAction` à `terraBuild`, `terraAlly`, `terraNaval` et `terraFire`.
- **Le pourquoi.** C'est ce qu'un fan d'OpenFront vient chercher. Le moteur pur et déterministe le permet déjà, et la règle 7 le demande (« modes en direct courts, une dizaine de minutes »).
- **L'effort.** M à L : le moteur existe, il faut le salon WebSocket, l'interface et l'IA.
- **Les règles d'or.**
  - Règle 1 : tenue, rien de l'empire n'est en jeu.
  - Règle 4 : **aucune ressource de l'empire n'entre**, ni ducats, ni troupes achetées, ni pain. C'est l'argument « armes égales » qu'on montre aux fans.
  - Règle 6 : appariement par cote Elo propre à la partie rapide.
  - Règle 7 : c'est exactement elle.
  - Règle 8 : la coulée d'émail et les rubans sont faits pour ça.
  - Règle 2 : le risque n'y concerne qu'une partie jetable, jamais l'empire.
- **Récompense.** Elle reste plafonnée, comme les 45/30/20/10 de Gloire actuels. Pas plus d'une à trois parties classées par jour qui rapportent, et le reste pour le plaisir et l'Elo. Ça tient le plafond de 10 à 15 % de la progression.

### R2. Le territoire fait l'armée, pas le compte en banque

- **Le quoi.** Rétablir `troops.perCell` et `perCity` (par exemple 3 par case et 25 par ville), avec un plafond qui grandit comme dans OpenFront (une puissance de 0,6 à 0,8 des cases peut s'écrire en entiers par table). Retirer `troopBuy` et `capRaise` de la partie rapide. Pour la semaine, au moins plafonner la dépense hebdomadaire (question 3 du plan).
- **Le pourquoi.** La boule de neige « je mange, donc je grossis » est la colonne vertébrale du genre. Le constat du simulateur (riche Signore 10 sur 10) est le pire signal qu'on puisse envoyer à cette communauté.
- **L'effort.** S pour les réglages, plus le simulateur sur toutes les graines et `docs/calibration.md`.
- **Les règles d'or.** Cette recommandation renforce la règle 4 dans son esprit premier (« la Terraferme reste à armes égales »). La décision du porteur du 7 novembre est à rediscuter pour la semaine. Pour la partie rapide, elle n'a pas lieu d'être.

### R3. La vague : une vitesse qui dépend de la masse et de la largeur

- **Le quoi.** Faire de `cellsPerStep` une fonction de `troupes du front ÷ coût de la case` et de la longueur de la frontière commune, avec une borne. Une pile écrasante prend 3 à 4 cases par pas sur plusieurs cases du front ; une pile juste en prend une. Donner un rabais à la pile écrasante comme OpenFront (rapport borné de 0,6 à 2), pour que l'attaquant perde **plus** que le défenseur à égalité et **moins** en écrasant.
- **Le pourquoi.** Ça rend son sens au curseur et crée le dilemme d'OpenFront : vider sa réserve pour aller vite, ou garder sa défense.
- **L'effort.** M : le moteur, les tests d'abord sur la fixture, `forecastFronts` (déjà générique) et `frontLayer.ts` pour un ruban plus large.
- **Les règles d'or.** Neutre. Règle 8 : la vague se voit.

### R4. Une courbe de croissance à doser

- **Le quoi.** Remplacer le recrutement linéaire par une courbe en cloche, à son maximum vers 40 à 50 % du plafond et nulle au plafond (en entiers, par table). La réserve affichée en anneau (barre du haut) prend une zone verte idéale.
- **Le pourquoi.** C'est le savoir-faire qui distingue un bon joueur d'OpenFront. Ici, il récompense le joueur actif sans exiger sa présence.
- **L'effort.** S à M. **Les règles d'or** : la règle 3 tient, la croissance s'arrête au plafond sans rien perdre.

### R5. Un climax de fin de partie

- **Le quoi.** En partie rapide, une « Grande bombarde » de fin de partie : chère, une seule par joueur, portée large, qui brûle une zone et laisse un sol plus dur à reprendre (les retombées d'OpenFront). Les **remparts** deviennent la parade, ils interceptent une partie des tirs dans leur rayon. En partie rapide, la bombarde ordinaire tire toutes les une ou deux minutes, et plus une fois par jour.
- **Le pourquoi.** C'est le pic d'émotion et le moment qu'on partage en vidéo.
- **L'effort.** M. **Les règles d'or** : règle 8 (l'arc du boulet et la bouffée de porcelaine existent déjà, lot T4) ; règle 4 (rien ne s'achète).

### R6. Des alliances à l'échelle de la partie rapide

- **Le quoi.** En partie rapide, une alliance de 5 minutes qu'on renouvelle, une rupture visible 10 s à l'avance, un traître affaibli 30 s, des dons de troupes, les quatre signaux plus quelques emojis. Contre le *teaming* : pas d'alliance entre membres d'une même compagnie en FFA classé, et la compagnie joue ensemble dans un mode Équipes dédié.
- **Le pourquoi.** C'est la politique en direct d'OpenFront, sans son pire défaut.
- **L'effort.** S, car tout est réglable dans `alliances`.

### R7. Une carte politique lisible

- **Le quoi.** Donner une teinte d'émail propre à chaque voisin direct (5 à 8 teintes de porcelaine désaturées, le rouge restant à toi), atténuer le relief des cases tenues (le plan le fait déjà sous les bâtiments), et inscrire le nom et les troupes **dans** le territoire, à une taille qui suit sa surface, comme OpenFront. Une barre « 80 % » en haut montre où en est le meneur.
- **Le pourquoi.** La règle 8 dit « tout se voit ». Aujourd'hui, le *qui tient quoi* ne se voit pas.
- **L'effort.** S à M (`glaze.ts`, `picture.ts`). **Les règles d'or** : règle 8 directement. C'est la question 2 du plan (« Encres » ou une teinte par voisin) : je réponds une teinte par voisin.

### R8. Une semaine qui démarre plus vite et se termine

- **Le quoi.** Des théâtres de 16 à 24 marchands au lieu de 40, et des départs plus proches, pour un premier contact sous 6 h au lieu de 33 h. Une bataille du soir plus longue (de 20 h à 21 h) et plus dense. Un seuil de victoire qui baisse au fil de la semaine (l'*overtime* d'OpenFront : 80 % le lundi, 40 % le dimanche), pour qu'une conquête termine souvent la semaine.
- **Le pourquoi.** Le format hebdomadaire a sa place pour le joueur de Fondaco, mais il doit produire des histoires.
- **L'effort.** S pour les réglages et M pour l'*overtime*. **Les règles d'or** : règle 7, la semaine n'exige pas d'être présent puisque les fronts marchent seuls et la nuit protège. La règle « un changement prend effet le lundi suivant » s'applique.

### R9. Des bots et des nations dignes de ce nom en partie rapide

- **Le quoi.** Les nations de 1450 en partie rapide, avec leur caractère (défensif, opportuniste, pillard) et une difficulté réglable. Des bots de remplissage faibles (plafond divisé par 3, comme OpenFront), qui servent de « nourriture » au début.
- **Le pourquoi.** Un salon qui démarre toujours plein, même à 3 h du matin, et une première minute gratifiante.
- **L'effort.** M (`bots.ts` et `aiMoves` à enrichir).

---

## 5. Comment aller chercher les fans d'OpenFront

1. **Jouer sans compte, en deux clics.** Sur la page d'accueil, à côté de l'empire, un bouton « Partie rapide » demande un pseudo puis lance la partie. On propose le compte *après* la première partie (« garde ta cote et ton blason »), et le pont vers l'empire après la troisième (« à Venise, ton empire t'attend, et la Terraferme de la semaine aussi »). Il ne faut **aucune** dépendance à la Casa 4 ni au Campo pour la partie rapide.
2. **Un lien de salon à partager.** « Rejoins ma partie » envoie un lien direct (PWA, mobile compris). Un salon privé reçoit aussi des bots.
3. **Le classement et la cote.** Une Elo publique, des bandes visibles (règle 6), une saison courte de classement (un mois), des profils publics avec les dernières parties. C'est aussi l'arme anti-*teaming* d'OpenFront.
4. **Les replays et les vidéos.** Le moteur déterministe permet le replay gratuit (graine plus ordres). Ajouter un bouton « Exporter les 30 dernières secondes » ou un replay accéléré de toute la partie (le « pendant ton absence » du lot T6 en est la base) : la coulée d'émail sur la porcelaine est une signature visuelle qui se partage. Viser les créateurs YouTube et Twitch du genre avec un mode spectateur.
5. **La communauté.** Un Discord avec des tournois du week-end en partie rapide et des clans, qui seront les compagnies de Fondaco. Une présence sur r/OpenFrontIO et dans les communautés des « .io » de conquête, sans dénigrer ni copier : « la conquête de l'Italie de 1450, sur mobile, en 12 minutes ».
6. **Les portails.** Une version partie rapide seule, légère, pour CrazyGames ou Poki, qui renvoie vers Fondaco.
7. **La monétisation compatible.** Uniquement des cosmétiques : blasons, émaux, drapeaux, animations de prise de case (règle 4). Les fans d'OpenFront y sont habitués et rejettent tout le reste.
8. **La différence assumée.** Ne pas copier OpenFront, mais vendre ce qu'il n'a pas : une carte historique tactile, des nations de caractère, une esthétique unique, et un empire marchand persistant pour qui veut plus qu'une partie. Aucun nom, aucun visuel ni aucune marque d'OpenFront : on s'inspire des mécaniques, qui ne sont pas protégées.

---

## Conclusion

La Terraferme reprend le *vocabulaire* d'OpenFront (fronts, ratio, densité, 80 %, alliances, trahison) mais pas son *tempo* ni son *égalité*. Le fan y trouvera une belle carte et un jeu de gestion de guerre asynchrone, pas le frisson d'une vague en direct. La bonne nouvelle, c'est que le moteur contient déjà tout ce qu'il faut pour une partie rapide de 15 minutes. La décision la plus rentable est de la finir, de l'ouvrir sans compte, et d'y garantir des armes vraiment égales.
