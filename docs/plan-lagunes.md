# Les lagunes de 48 Maisons : plan (étape 2 de l'audit du 11 novembre 2026)

*Proposé le 12 novembre 2026, à la suite du compte et de la Maison qui reste (`docs/plan-compte.md`, fusionné). Décision du porteur D3 : des planches de 48 Maisons. Audit : `docs/audit-progression-2026-11-11/00-audit.md` § 5 et § 11. **Validé le 12 novembre 2026** avec les quatre recommandations du § 7.*

## 1. Le problème à régler

Une planche compte aujourd'hui 8 Maisons, 8 villes et 3 passages, sur 28 × 18 cases. C'est trop petit pour une vraie vie de voisinage : tout le monde est le rival de tout le monde, la Passe se joue sur trois tours seulement, et il faut une nouvelle planche tous les 8 joueurs.

Après cette étape, une **lagune** compte :

- **48 Maisons**, en **4 sestieri** de 12 voisins ;
- **une vingtaine de villes**, dont certaines demandées par un seul sestiere et d'autres par toute la lagune ;
- **une douzaine de tours** : une bouche par sestiere, des ponts et des canaux entre eux, des détroits au Large.

Et un serveur tient **une centaine de lagunes**, soit près de 5 000 joueurs.

## 2. Ce que voit le joueur

| Échelle | Ce qu'on voit | Les étiquettes |
| --- | --- | --- |
| **Ton sestiere** (à l'ouverture) | Tes 11 voisins, les villes qui vous sont proches, la bouche de ton sestiere | Le nom de chaque voisin ; ta Maison en rouge, ton rival marqué |
| **La lagune** | Les 4 sestieri et leurs noms posés sur l'eau, toutes les villes, toutes les tours | Seulement ta Maison, ton rival, le Doge et les villes ; les autres Maisons en petits pavillons |
| **Ton île** | Comme aujourd'hui | — |

- La pilule du haut dit ta place **dans ton sestiere** (« 3ᵉ sur 12 ») ; le palais du Doge donne aussi ta place dans la lagune.
- Le Doge reste celui de la lagune entière.
- Tes fils, ceux de ton rival et le détour sans duel se dessinent comme sur la maquette du 11 novembre (écran 2a).

## 3. Les règles

- **La carte** : une seule carte, la même pour toutes les lagunes, pour que les classements et les bancs se comparent. Elle est **décrite par un générateur** dans le moteur (positions, terrains, villes, tours), et non écrite case par case : on pourra en tirer d'autres plus tard.
- **Les sestieri** : chaque Maison appartient à un sestiere ; chaque sestiere a une bouche (une tour) qui mène au Large, et des villes proches. Les quatre sont équivalents, à une rotation près.
- **Les villes** :
  - *de sestiere* : proches, peu de demande, sans passage ;
  - *de lagune* : partagées par tous, plus riches, parfois derrière un pont ou un canal ;
  - *du Large* : les plus riches, derrière un détroit.
- **Toujours un détour** : chaque ville se rejoint sans duel, par un chemin plus long (repris de l'audit, § 7.1). Ce lot pose la règle dans le moteur ; les commandes scellées et les autres usages du Hex viendront à l'étape 4.
- **Le rival** est désigné **dans ton sestiere** : le plus proche au-dessus de toi parmi tes 11 voisins, un joueur d'abord.
- **Les Maisons de l'ordinateur** tiennent les places libres, avec des plans variés par sestiere (le verre, le bois, la terre, le sel…), et rendent leur place à un joueur qui arrive.

## 4. La technique

- **Moteur** : chaque Maison porte son sestiere ; un générateur pur `plancheLagoon` produit la carte de 48 Maisons à partir de ses paramètres (dans `worlds.settings`) ; le rang calcule la place dans le sestiere et le rival du sestiere. Tests d'abord, sur une fixture.
- **Performance** : une planche de 48 Maisons avance par tranches de dix minutes ; le banc mesure le temps d'une journée et d'une semaine de jeu, pour une lagune et pour cent.
- **Écran** : le sol en instances (déjà le cas), les îles voisines en petit, les étiquettes selon l'échelle ; le parcours à 390 px vérifie qu'on lit son sestiere sans chevauchement.

## 5. Les lots

| Lot | Contenu | Vérification |
| --- | --- | --- |
| G1 | **Le générateur de lagune** : 4 sestieri de 12 Maisons, une vingtaine de villes en trois cercles, une douzaine de tours, un détour sans duel vers chaque ville. Pur, tests d'abord. | tests : 48 places distinctes, 12 par sestiere, chaque ville atteignable sans duel, les 4 sestieri équivalents |
| G2 | **Le rang par sestiere** : la place dans le sestiere et dans la lagune, le rival choisi parmi ses voisins. | tests du moteur |
| G3 | **Au banc** : 48 Maisons sur une marée de six semaines ; demande des villes, plans des robots, péages. | aucune stratégie unique ne domine ; huit visites par jour ne rapportent pas nettement plus que trois ; `docs/calibration.md` |
| G4 | **Le serveur** : les lagunes de 48, le placement d'un nouveau compte dans le sestiere le moins rempli, le test de charge à cent lagunes. | tests du serveur ; temps de réponse mesurés |
| G5 | **L'écran** : les trois échelles (sestiere à l'ouverture, lagune, île), les étiquettes qui suivent l'échelle, les noms des sestieri sur l'eau. | parcours e2e à 390 px et sur ordinateur, captures |

Fusion sur la branche principale à la fin de G5.

## 6. Ce qui n'est pas dans cette étape

La discussion du sestiere (étape 7) ; les commandes scellées, la Muda et les détroits noirs (étapes 4 et 8) ; la marée d'encre et les ligues entre lagunes (étape 9) ; une carte différente par lagune.

## 7. Tranché (12 novembre 2026, le porteur suit les quatre recommandations)

1. **La carte** : la même pour toutes les lagunes.
2. **La planche de 8 Maisons** : on repart sur une lagune de 48 neuve ; les comptes restent.
3. **Le rival** : choisi dans le sestiere.
4. **L'ouverture** : sur ton sestiere.

## 8. État

| Lot | État |
| --- | --- |
| G1 | fait : `packages/engine/src/planche/lagune.ts` (`plancheLagoon`), les sestieri côte à côte, le continent au nord, le Large au sud ; chaque Maison porte son sestiere, chaque ville son cercle ; le détour (`detourBps`) : un fil tiré « par le détour » ne passe aucune tour, ne paie aucun péage et porte moins. Lagune de Venise : `venice1450.lagune.ts`, 52 × 26 cases, 48 Maisons en 4 sestieri (Cannaregio, Castello, Dorsoduro, San Polo), 19 villes (12 de sestiere, Murano, le Rialto, Chioggia, 4 du Large), 10 tours (4 bouches, 4 détroits, 2 canaux). 6 tests. |
| G2 | fait : `plancheStanding`, `plancheLaurel` acceptent un sestiere ; `planchePlace` donne la place parmi ses voisins (celle de la pilule), la tendance la suit, le rival est choisi dans le sestiere ; le Doge reste celui de la lagune. Sans sestieri, rien ne change. 3 tests. |
| G3 | fait : banc de la lagune (`BOARD=lagune`), réglage retenu pour la lagune (demande ×1,5, bobine qui revient en 20 min par case, patine de 10 % par jour) ; huit visites par jour : +10 à +19 % (contre +24 à +62 % sans réglage) ; sestieri à égalité à 6 % près ; un rival chaque semaine pour les 48 ; 0,2 s de calcul par jour de jeu ; `docs/calibration.md` § Les lagunes. Reste : la part des chantiers de l'île dans l'avantage des visites, la brique en surabondance. |
| G4 | fait : le serveur joue la lagune de 48 ; un nouveau venu va dans le sestiere le moins rempli ; une planche d'une autre carte (la planche de 8) est retirée, ses places libérées, son grand livre gardé ; les réponses sont compressées (7 Ko la planche au lieu de 74) et la planche se relit toutes les 20 s quand le canal en direct est ouvert ; test de charge `lagunes-charge` (cent lagunes : 15 s de calcul par jour de jeu, 12 Mo de mémoire) ; 3 tests du serveur. |
| G5 | fait : en ligne, l'écran dessine la lagune de 48 (terres tirées du moteur, `plancheLagoonLand`), s'ouvre sur sa Maison et son sestiere, dézoome sur la lagune entière (« lagune »), nomme ses voisins de près et seulement soi, son rival et le Doge de loin, pose les noms des sestieri sur l'eau ; la pilule donne la place dans le sestiere ; `&seul` garde la planche de 8. Parcours `e2e:compte` sur la lagune (compte, sablière, temps réel en 712 ms, redéploiement), captures dans `docs/lagunes-captures/`. La vue « lagune entière » n'a pas été capturée. |
