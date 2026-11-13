# Audit du 13 novembre 2026 : le joueur compétitif

*Rôle : joueur de duel (échecs, Hex), sur ordinateur, 1280 × 800. Serveur à moi (port 3633, base PGlite à part), deux comptes (Ca' Ana et Ca' Ben, deux sestieri de la Lagune de Murano), du mardi 17 au lundi 23 novembre 2026 (heure du jeu). Captures : `docs/audit-2026-11-13/captures/competitif/`. Mesures : le moteur `packages/engine/src/passe/` rejoué par mes scripts, et `passe-bench 12`.*

## 1. Verdict : 5 sur 10, « est-ce qu'il y a de quoi devenir bon ? »

**Oui pour le duel, non pour tout ce qui l'entoure.** La Passe est un vrai jeu de connexion, de la famille d'Hex : il y a des choses à apprendre, voir plus loin fait gagner (la force 3 bat la force 2 dans 83 % des parties), et le Problème du jour est bien construit (une seule clef par position, vérifiée). Mais **tout duel contre l'ordinateur est déterministe et rejoué par le serveur depuis la seule liste des coups du joueur** : on peut rejouer sans fin un duel perdu, et une ligne gagnante une fois trouvée gagne toujours, pour tout le monde. Ça vaut pour les tours de corsaires, le Problème du jour, les commandes scellées, les détroits noirs et les sorties. Le défi entre joueurs, lui, est un vrai duel, mais sa cote est biaisée (la première Passe pèse double, et c'est le défieur qui y tient le fil), et on peut le perdre sans avoir joué une seule pièce.

## 2. Ce que j'ai fait

- **Mardi 17, 10 h** : fondé Ca' Ana et Ca' Ben à l'écran (lien magique, nom, fondation). Pour Ana :
  - **le Problème du jour** (`deux-01`, « le fil passe en 2 coups »), joué à l'écran avec deux mauvais coups, perdu (« Ce n'était pas la clef »), puis la page **rechargée** au lieu de « Revenir à la planche » ;
  - le même problème rejoué et réussi ;
  - pour Ben, la même solution envoyée par l'API, **sans jouer**.
- **Mardi 17, le canal 1 (Kemal Reis, damier du Lido, 5 × 5)** :
  - deux essais perdus envoyés à l'API ;
  - le duel joué à l'écran par Ana avec une ligne calculée d'avance contre le lieutenant (force 3) : gagné en 5 barges, un sceau brisé ;
  - la même ligne renvoyée aussitôt par Ana : un deuxième sceau ;
  - la même ligne envoyée par Ben à l'API : le troisième sceau, et **la tour passe à Ben**.
- **Mardi 17, le défi par le fil** :
  - Ana défie Ben depuis sa fiche ; Ben voit la carte « Ca' Ana te défie par le fil » et accepte ;
  - deux Passes dans la Bouche de Chioggia (7 × 7), puis une troisième revanche dans la même salle ;
  - un nouveau défi tenté la même semaine ;
  - la cote, le rival et le rang lus avant et après.
- **Mardi 17, la Guerre** :
  - la fiche « La Guerre de la semaine » ;
  - l'assaut réel refusé (`guerre_no_fleet` : pas d'Arsenal avant le niveau 6) ;
  - l'assaut d'entraînement du Lido des corsaires, en trois manches, jusqu'au bilan.
- **Lundi 23, 19 h** (serveur relancé sur la même base) : les sorties des capitaines de la semaine, le résultat de la Guerre, les drapeaux du rival, le Prestige et les niveaux.
- **Hors écran** :
  - `passe-bench 12` ;
  - tous les coups acceptés par le serveur pour chacun des 20 problèmes ;
  - le fil joué par l'esprit du jeu contre le lieutenant de chaque damier ;
  - l'effet des styles des capitaines sur 40 positions ;
  - les sorties sans défenseur sur un canal.
- **Lu sans le jouer** :
  - les détroits noirs (niveau 11 : je n'ai pas monté de Maison jusque-là) ;
  - les ligues et la Sérénissime (une seule lagune sur mon serveur).

## 3. Constats

| Id | Gravité | Constat | Preuve | Proposition |
| --- | --- | --- | --- | --- |
| C1 | P0 | **Un duel perdu contre l'ordinateur ne coûte rien si l'on recharge la page.** Le client joue tout le duel seul et n'envoie le résultat qu'au clic sur « Revenir à la planche ». Rien n'est inscrit au début du duel. Le « Un seul essai » du Problème du jour, la cargaison « perdue » d'un détroit noir (la perte définitive de la règle 2) et le « Un seul essai » d'une commande scellée se contournent donc en fermant l'onglet. | Mesuré : problème perdu, page rechargée, `state.daily` vaut toujours `null` et « Jouer la position » est encore offert ; deuxième essai réussi et payé (Prestige, nœud). Code : `LabPlanche.tsx:979-989` (`onEnd`), même schéma pour `/noir` (l. 1076-1085), `/order` (l. 1007-1015) et `/sortie` (l. 1040-1049). Capture `03-probleme-rate.png`. | Inscrire l'essai côté serveur **au premier coup** (une commande `start` au journal qui consomme l'essai, ou risque la cargaison et le sceau), puis jouer le duel coup par coup sur le serveur, comme le fait déjà l'assaut de la Guerre. |
| C2 | P0 | **Le lieutenant est déterministe, et le serveur rejoue la liste des coups.** Une ligne gagnante contre une tour gagne à chaque fois, pour n'importe quel joueur, sans jouer. Un essai perdu à l'API ne coûte rien (`duel_lost` et rien d'autre), avec 20 essais par minute. Les détroits noirs ont le même damier pour tout le monde et sur tous les serveurs (« the same on every server »). Une seule solution publiée sur un forum ouvre donc chaque tour et chaque détroit du jour. | Mesuré : la ligne `[8,12,17,22,3]` brise un sceau pour Ana, un deuxième aussitôt, puis Ben l'envoie à l'API et prend la tour (`canal-1`, détenteur `castello-1`), sans avoir joué. Code : `planche.ts:802-830` (`passeThink` sans graine), `noir.ts:115-131`. | Mettre de l'aléa côté serveur (une graine tirée au premier coup, gardée pour la partie, et `passeThink(s, mind, rng)` qui sait déjà jouer avec), et ne rien accepter d'autre que le coup suivant d'une partie ouverte sur le serveur. |
| C3 | P1 | **Le fil qui commence bat le lieutenant à sa propre force.** Sans hasard, le fil joué par l'esprit du jeu à la force 3 gagne sur le Lido (5 × 5), à Segna, à Zara, à Curzola et aux Dardanelles. Sur le Lido, il gagne 30 parties sur 30 même avec un peu d'aléa. Le Lido est le damier de tous les canaux de la lagune (`venice1450.lagune.ts:243`). Forcer un canal est donc à la portée de tout joueur qui joue « comme la machine ». | Mon script : sur le Lido, le fil à la force 3 contre le lieutenant à la force 3 gagne 30 sur 30, en 5 barges au mieux ; à Segna, 30 sur 30. À Chioggia et à Otrante, il ne gagne que 5 et 4 sur 30. | Donner au canal une maille d'avance, ou un écueil, ou le lieutenant à la force 4 ; mesurer au banc **sans ouverture tirée au sort** (c'est ainsi que joue le serveur). |
| C4 | P1 | **La cote du défi est biaisée.** Les deux Passes d'un défi n'ont pas le même poids : k = 32 pour la première, puis k = 16 (« half as much each time the pair meets again »). Or c'est toujours le défieur qui tient le fil dans la première, et le fil commence. Un défi gagné une fois de chaque côté n'est donc pas nul : le vainqueur de la première Passe gagne au net. | Mesuré : Ana et Ben à une Passe partout, et pourtant 1 200 / 1 200 devient **1 193 / 1 207**. Code : `rang.ts:389`, `plancheDefi.ts:109` (le défieur ouvre la salle, l'hôte tient le fil à la première Passe). Le banc : sur la Bouche de Chioggia, le fil passe dans 50 à 67 % des parties (`bench.md`). | Compter le défi comme **un seul match** (2-0, 1-1, 0-2) avec un seul k, ou donner le même k aux deux Passes ; tirer au sort qui tient le fil le premier. |
| C5 | P1 | **On perd une Passe comptée sans avoir joué une pièce.** La pendule part dès l'acceptation (`begin`), pas quand les deux écrans sont prêts. Après 15 s, le lieutenant (force 2) joue pour l'absent, et la pendule rattrape tout le retard d'un coup à la lecture suivante. | Mesuré : la scène 3D a mis du temps à charger, et la 1ʳᵉ Passe s'est jouée tout entière par les deux lieutenants (`late: {thread: 7, chain: 7}`). Elle a compté : Ana a perdu 16 de cote. Code : `passe.ts:121-126` et `passe.ts:134-145`. | Démarrer la pendule quand les deux joueurs ont ouvert la salle. Ne pas compter une Passe où un camp n'a posé aucune pièce de sa main (ou la déclarer forfait, sans cote). Dire à la fin combien de pièces le lieutenant a posées. |
| C6 | P1 | **Le laurier de la Passe pousse à refuser tout défi.** Tout le monde commence à 1 200 et partage la 1ʳᵉ place tant qu'il ne joue pas. Une seule défaite fait tomber au dernier rang du laurier, et le Doge est la somme des places des trois lauriers. Comme le refus ne se voit pas, la stratégie sûre est de n'accepter que des adversaires plus faibles, ou personne. | Capture `09-guerre-fiche.png` : Ana passe de la 1ʳᵉ à la **12ᵉ ▼11 sur 12** dans la journée, après une Passe perdue (jouée par le lieutenant, C5). Code : `rang.ts`, `plancheLaurel` (des égaux partagent leur place). | Classer le laurier sur une cote **avec un minimum de Passes jouées** (par exemple trois défis dans la marée pour y figurer). Ou bien une cote qui monte par la seule participation (la partie jouée compte pour un peu), et la place égale pour qui ne joue pas. |
| C7 | P1 | **Toutes les sorties de la semaine visent la seule tour tenue par une personne.** Chaque capitaine sort contre « the nearest tower a person holds ». Avec une seule tour humaine, les six capitaines de la lagune visent la même. Sans défenseur, sur un canal nu, le capitaine passe à chaque fois (styles mur, rives et meute). | Lu le lundi 23 : 6 sorties contre `canal-1`, dont **3 le mardi à 18 h** ; la tour n'a que 3 sceaux. Mon script : sortie sans défenseur sur le Lido, le capitaine passe dans les 3 styles. Code : `sorties.ts:74-76`. | Au plus une sortie par tour et par jour, au plus deux par semaine. Répartir les capitaines entre les tours, ou ne faire sortir que le capitaine dont on a pris la tour. |
| C8 | P1 | **Le dernier sceau vole le travail des deux premiers.** Ana a brisé 2 sceaux à l'écran ; Ben a brisé le troisième par l'API et a pris la tour. Lundi, Ben a 121 de Prestige et le niveau 3, Ana 62 et le niveau 2. Le temps tenu de la tour (sa Garde) compte pour Ben. | Lecture du lundi 23 : `maison.prestige` 121 contre 62 ; `guardAt` 478 800 000 ms pour Ben. | Que les sceaux soient comptés par Maison (la tour va à celle qui en a brisé le plus dans la journée), ou que la tour ne tombe qu'à trois sceaux brisés par la même Maison. |
| C9 | P2 | **Les styles des capitaines ne se sentent pas.** Le style « mur » ne change **aucun** coup : le jeu penche déjà vers le centre sans style, et « mur » ne fait que l'amplifier. « Meute » change le coup 11 fois sur 40, « rives » 22 fois sur 40. Pour forcer une tour, aucun style n'est même passé : tous les corsaires (Ivo le Borgne, Dragut…) jouent pareil, seul le nom change. | Mon script : 0, 11 et 22 coups différents sur 40 positions ; à Segna, le fil gagne 17 parties sur 30 contre « aucun » et contre « mur », 21 sur 30 contre « rives ». Code : `mind.ts:88` et `mind.ts:97` ; `planche.ts:817` (`{ depth }` sans `style`). | Donner à chaque corsaire son style au forçage aussi. Faire de « mur » un vrai style (bloquer le chemin le plus court de l'adversaire au plus près de sa rive), et annoncer le style sur la fiche de la tour. |
| C10 | P2 | **L'aide à l'écran joue la moitié du duel entre joueurs.** Dans un défi classé, les deux camps voient le chemin le plus court de chacun et « la case que les deux veulent » (« Les deux chemins se croisent en D1. »). Pour un joueur de Hex, cette lecture est le cœur du jeu ; de plus, l'heuristique est trompeuse (elle ignore les ponts). | Captures `04b-passe-tour.png` et `07-defi-passe-ben-r2.png`. Code : `LabPasse.tsx:251` (calculé dès qu'il n'y a pas de problème, donc aussi en salle). | Garder l'aide contre les corsaires et les premiers défis, et la retirer des défis classés (ou en faire un réglage « sans aide » qui double la cote). |
| C11 | P2 | **Le Problème du jour est court et revient.** Il y a 20 positions, toutes en 2 ou 3 coups, parcourues en boucle (`plancheDaily`) : la même position revient tous les 20 jours. La clef est aussi dans le paquet JavaScript (`problem.key`, « Voir la clef » au labo). Un joueur moyen la trouve en essayant les 3 à 7 coups qui raccourcissent le plus son chemin. | Mon script : chaque clef est parmi les coups qui minimisent la distance (3 candidats pour 13 problèmes sur 20). Mesuré : Ben réussit avec la ligne d'Ana par l'API (C1, C2). `jour.ts:39-45`. | Un générateur de positions (le moteur `passeKeys` sait déjà vérifier qu'une clef est unique), des problèmes en 4 et 5 coups le week-end, et la clef gardée sur le serveur. |
| C12 | P2 | **Prestige de la Guerre : frapper le port le plus faible chaque jour rapporte autant que gagner la guerre.** Le Prestige compte 20 par sceau à **chaque** assaut, alors que le score de la flottille ne garde que le meilleur assaut par port. Contre des ports de l'ordinateur à Puissance 0 et « Pas de navire », c'est 60 par jour. | Code : `semaine.ts:128`. Capture `09-guerre-fiche.png` : la flottille adverse n'est faite que de Maisons de l'ordinateur à Puissance 0 (deux joueurs sur la lagune). | Ne compter le Prestige des sceaux que pour les sceaux **nouveaux** d'un port (au-delà du meilleur assaut déjà fait). |
| C13 | P2 | **Les joueurs faibles n'ont pas de Guerre.** La Guerre est ouverte, mais sans flotte l'assaut est refusé (`guerre_no_fleet`, Arsenal au niveau 6). La fiche montre tout de même « Pas de navire » sur chaque port adverse, sans dire quoi faire ni quand. | Mesuré : `/api/guerre/start` répond 409 `guerre_no_fleet`. Capture `09-guerre-fiche.png`. | Écrire sur la fiche « Ta flotte viendra avec l'Arsenal, au niveau 6 » et renvoyer au port d'entraînement. |
| C14 | P2 | **Le défi expire en 2 minutes réelles, sans que la carte le dise.** Le défié a vu la carte « Accepter », a accepté au bout de 3 minutes, et la réponse a été un 409 (`planche_defi_none`). | Journal du serveur : défi à `…246878`, réponse 409 à `…436046` (189 s). Capture `06-defi-recu.png`. Code : `plancheDefi.ts` (`waitMs` 120 000). | Afficher le compte à rebours sur la carte, et la retirer quand le défi expire. |
| C15 | P2 | **On ne voit pas la cote avant de défier, ni le bilan après.** La fiche d'une Maison affiche sa Puissance, mais pas sa cote ni ses défis récents. La fin du défi ne montre que la dernière Passe (« Ta chaîne est tendue d'une rive à l'autre »), sans score du défi, sans cote gagnée ou perdue, et sans dire que la première Passe a été jouée par le lieutenant. | Captures `05-defi-fiche.png` et `08-defi-fin.png`. | Montrer la cote et la place au laurier sur la fiche. Un bilan du défi : « 1-1 · ta cote 1 193 (−7) · le lieutenant a posé 7 de tes pièces ». |
| C16 | P2 | **On peut gonfler sa cote avec des comptes de complaisance.** Un défi par paire et par semaine, mais aucune limite au nombre de paires. Les comptes coûtent un courriel (lien magique), et la cote revient à 1 200 à chaque marée. | Code : `plancheMayChallenge` (`rang.ts:365`) ne regarde que la paire de la semaine. | Ne compter la cote qu'entre comptes d'un certain âge ou d'un certain niveau, plafonner les défis comptés par semaine, et réduire k contre une cote qui ne bouge jamais. |

### Les mesures derrière les constats

**Le fil contre le lieutenant à la force 3, comme le serveur rejoue un forçage** (sans graine, sans ouverture tirée au sort ; script `analyse.ts tour`) :

| Damier | Fil « droit au milieu » | Fil à la force 3 | Fil à la force 4 | Fil à la force 3 et un peu d'aléa : parties gagnées sur 30 | Barges au mieux |
| --- | --- | --- | --- | --- | --- |
| Lido 5 × 5 (tous les canaux) | perdu | gagné | gagné | 30 | 5 |
| Segna 7 × 7 | perdu | gagné | gagné | 30 | 7 |
| Chioggia 7 × 7 (les bouches, le défi) | perdu | perdu | gagné | 5 | 9 |
| Otrante 9 × 9 (les détroits) | perdu | perdu | gagné | 4 | 11 |
| Zara 7 × 7 (Muda) | perdu | gagné | gagné | 22 | 7 |
| Curzola 7 × 7 (Muda) | perdu | gagné | gagné | 6 | 7 |
| Dardanelles 9 × 9 (noir) | perdu | gagné | gagné | 7 | 9 |
| Portofino 9 × 9 (noir) | perdu | perdu | gagné | 4 | 10 |
| Pô 9 × 9 (noir) | perdu | perdu | perdu | 0 | — |

Lecture : la difficulté va bien du canal au Large, et le Pô tient. Mais sur chaque damier sauf le Pô, **une ligne gagnante existe et se trouve**, et le serveur l'accepte autant de fois qu'on la lui envoie.

**Les styles** (le camp de la chaîne à jouer, force 3, 40 positions de Segna tirées au hasard ; script `analyse.ts style`) :

| Style | Coups différents du jeu sans style | Le fil (force 3) gagne sur 30 |
| --- | --- | --- |
| aucun | — | 17 |
| mur | **0** | 17 |
| rives | 22 | 21 |
| meute | 11 | 17 |

**Le Problème du jour** (tous les coups acceptés par `solves`, contre les réponses de la force 3) : 19 problèmes sur 20 n'acceptent que leur clef ; `trois-16` accepte aussi la case 27. Pour chacun, la clef est parmi les coups qui raccourcissent le plus le chemin du fil (3 à 12 candidats).

**Le défi** (mesuré à l'écran et à l'API) :

| Étape | Cote d'Ana | Cote de Ben | Note |
| --- | --- | --- | --- |
| Avant | 1 200 | 1 200 | les deux 1ᵉʳˢ du laurier, à égalité |
| 1ʳᵉ Passe (Ana au fil), k = 32 | 1 184 | 1 216 | jouée tout entière par les lieutenants (7 pièces chacun) |
| 2ᵉ Passe (Ben au fil), k = 16 | 1 193 | 1 207 | gagnée par Ana à la chaîne |
| 3ᵉ revanche | 1 193 | 1 207 | ne compte pas : bien |
| Nouveau défi la même semaine | — | — | `planche_defi_week` : bien |

## 4. Ce qui marche

- **La Passe elle-même** : des règles nettes (six voisins, le courant en diagonale, jamais de nulle), des pièces spéciales lisibles (« Brûlot · brûle B3 ou D3 », « Bombarde »), des parties de 7 à 12 barges, soit deux minutes. Le jeu récompense la réflexion : la force 3 bat la force 1 dans 92 % des parties et la force 2 dans 83 % (`bench.md`). C'est le meilleur atout compétitif du jeu.
- **Les problèmes sont justes** : 19 sur 20 n'ont qu'une clef acceptée par le serveur. `trois-16` en accepte une deuxième (la case 27) contre les réponses de la force 3, alors que `passeKeys` n'en voit qu'une. Le verdict « Passé : c'était la clef » est net, et le refus d'un deuxième envoi (`planche_daily_tried`) tient une fois l'essai envoyé.
- **Le défi en direct** : la carte d'invitation est claire (« Deux Passes en direct : chacun une fois le fil, une fois la chaîne… Rien d'autre ne se risque »). La revanche échange bien les camps. Une troisième revanche dans la même salle ne compte pas, et un deuxième défi la même semaine est refusé (`planche_defi_week`). La pendule de 15 s et son anneau se lisent bien.
- **La lecture de la menace** (les cases qui manquent à chaque camp, le chemin, la case qui décide) est excellente pour apprendre contre les corsaires (C10 : à retirer seulement des défis classés).
- **L'assaut de la Guerre est joué sur le serveur, manche par manche**, et « le jour est pris dès le début ». C'est exactement le modèle qui manque aux duels contre l'ordinateur (C1, C2). L'écran d'entraînement annonce ce que fera chaque défense (« La chaîne ferme la passe », « La tour tire 3 sur la galère ») : c'est un vrai problème de placement, lisible (`10-assaut-entrainement.png`, `11-assaut-bilan.png` : « 1 sceau brisé, dégâts au port : 37 % »).
- **Le classement par bande de Puissance** pour la Guerre, et la Guerre jouée en quelques minutes par jour : conformes aux règles 6 et 7.

## 5. Mes trois recommandations prioritaires

1. **Faire de chaque duel contre l'ordinateur une partie tenue par le serveur** (C1, C2, C3) :
   - l'essai, la cargaison ou le sceau engagés au premier coup ;
   - les coups joués un par un sur le serveur ;
   - une graine tirée côté serveur pour le lieutenant et les capitaines.

   Tant que ce n'est pas fait, chaque essai unique et chaque perte définitive se contourne en rechargeant la page, et toute victoire se partage en copiant une liste de coups. Pour un joueur compétitif, cela vide de leur sens les tours, les détroits noirs et le Problème du jour.
2. **Rendre la cote honnête** (C4, C5, C6, C15) :
   - le défi compté comme un match, avec un seul k ;
   - le premier fil tiré au sort ;
   - la pendule lancée quand les deux écrans sont prêts, et une Passe jouée par les lieutenants qui ne compte pas ;
   - un minimum de défis pour figurer au laurier ;
   - la cote visible sur la fiche, et un bilan du défi à la fin.
3. **Donner du relief aux adversaires de l'ordinateur** (C7, C9, C11) :
   - des styles de capitaines qui changent vraiment le jeu, y compris au forçage, et annoncés sur la fiche ;
   - des sorties réparties entre les tours, au plus une par tour et par jour ;
   - des problèmes générés, plus longs le week-end.

   C'est ce qui fait qu'on revient chaque jour pour s'améliorer, pas pour réciter une ligne.
