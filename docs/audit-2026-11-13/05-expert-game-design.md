# Audit du 13 novembre 2026 — 05. L'expert game design (free-to-play mobile et PC)

*Rôle : concepteur de jeux free-to-play (Hades' Star, Clash of Clans, Travian, Chess.com, Marvel Snap) : rétention, boucles, économie, monétisation éthique. Serveur à moi (port 3655, base PGlite à part), web déjà construit. Deux Maisons fondées à l'écran sur téléphone (390 × 844) : **Ca' Assidua** (trois visites par jour) et **Ca' Rara** (trois visites dans la semaine), du lundi 16 au lundi 23 novembre 2026 (heure du jeu), en relançant le serveur 21 fois sur la même base. Captures : `docs/audit-2026-11-13/captures/game-design/`.*

## 1. Verdict

**Ce jeu peut-il retenir des joueurs un an ? 4 / 10 aujourd'hui ; 7 / 10 atteignable avant la bêta sans rien inventer.**

Le cœur est rare et bon : un geste unique (le fil) qui fait vivre une économie partagée, et un vrai jeu de réflexion (la Passe) à armes égales. C'est exactement ce qui retient un an chez Chess.com ou Hades' Star. Mais autour de ce cœur, le jeu a empilé en trois jours (11 au 13 novembre) **vingt-trois systèmes visibles et dix-huit compteurs**. La première semaine est creuse : le niveau ne monte que le lundi, la moitié des lieux répondent « pas encore » et le joueur occasionnel finit sa semaine au niveau 1. Le haut de la progression est vide : après le niveau 16, rien de neuf ne s'ouvre et les ducats n'ont plus d'emploi. Il faut **resserrer avant d'ajouter** : douze systèmes, ouverts par étapes, un niveau qui monte dès qu'on l'a gagné, une raison de revenir chaque jour annoncée hors du jeu.

## 2. Ce que j'ai fait

- **Lundi 16, 10 h** : deux comptes créés à l'écran (courriel, lien magique, « Fonde ta Maison »), arrivée sur la planche (`01-arrivee-lundi.png`).
- **Pendant la semaine** : Ca' Assidua est jouée trois fois par jour (9 h, 14 h, 20 h) et Ca' Rara trois fois en tout (lundi, mercredi, samedi). À chaque visite, je joue les gestes d'un bon marchand : ceux que le marchand de l'ordinateur du moteur (`plancheRobot`) choisirait sur l'état réel. Concrètement : bâtir, acheter une case, tirer ou reprendre un fil, par les vraies routes de l'API. Je relève à chaque fois la bourse, les ventes, le Prestige de la semaine, le niveau et l'entrepôt (journal ci-dessous).
- **Lundi 23, 9 h** : le moment de la montée de niveau de Ca' Assidua, à l'écran (`02-lundi-montee-a.png`), puis la fiche de la Maison (`03-fiche-maison-n3.png`). Lecture de `/api/maison`, `/api/gazette` et `/api/guerre` pour les deux Maisons.
- **Lus** :
  - `CLAUDE.md`, `docs/CADRAGE-v4.md` ;
  - l'audit du 11 novembre, ses neuf plans (compte, lagunes, progression-maison, hex-commerce, arsenal, guerre, compagnie, muda, marée) et `docs/calibration.md` (bancs de la progression, de la Passe, de l'Arsenal, de la Guerre, du phare, de la Muda et de la marée) ;
  - le moteur `packages/engine/src/planche/` (maison, rang, ligue, jour, commandes) et le thème `venice1450.lagune.ts` ;
  - les rapports 01, 03, 04 et 08 de cet audit.

**Le journal de la semaine** (relevé à chaque visite, sans Passe ni Guerre : seulement le commerce) :

| Moment | Ca' Assidua (21 visites) | Ca' Rara (3 visites) |
| --- | --- | --- |
| Lundi 16, 20 h | 954 ducats vendus ; bois 240 / 240 et sable 232 : deux ateliers sur quatre à l'arrêt | — |
| Mercredi 18 | 1 926 vendus, Prestige de la semaine en attente : 36 ; niveau 1 | 0 vendu, sable 240 / 240, niveau 1 |
| Samedi 21, 20 h | 2 570 vendus ; en attente : 45 ; **toujours niveau 1** | 154 vendus |
| **Lundi 23, 9 h** | **153 de Prestige crédités d'un coup → niveau 3** | **14 de Prestige → niveau 1** |

Ces 153 points se décomposent ainsi : 49 du commerce, 100 pour la 1ʳᵉ place du sestiere, et le reste en arrondis. Les 14 de Ca' Rara : 2 du commerce et 12 pour la dernière place. **L'écart d'une semaine est de 1 à 11**, et il vient pour l'essentiel du prix de la place, pas du plafond.

## 3. Constats

| Id | Gravité | Constat | Preuve | Proposition |
| --- | --- | --- | --- | --- |
| G1 | P0 | **Trop de systèmes pour une seule planche.** J'en compte **23 visibles** (inventaire au § 4), avec **18 compteurs** : ducats, Prestige, plafond et report, niveau, Puissance, cote, place, trois sortes de « sceaux », nœuds, reliques, plans, heures de Garde, pierres, pavillons, points du phare, part d'une ville, patine, péril. La règle du projet dit « une douzaine, pas trente ». CADRAGE-v4 § 16 avait même **retiré** la Puissance, les Sceaux et les modes ; l'audit du 11 novembre les a remis. Le débutant (rapport 01) a rencontré 46 mots inconnus le premier jour. | § 4 ; rapport 01 (« Mots inconnus : 46 ») ; `CADRAGE-v4.md:391` (« la Puissance… retirées ») | Un plan de **fusion et d'ouverture par étapes** (§ 4) : 12 systèmes, et 3 seulement le premier jour. |
| G2 | P1 | **Le niveau ne monte que le lundi.** Le Prestige du jour et des victoires est mis en attente et crédité au tournant de la semaine (`growWeek`). Un joueur qui arrive un lundi attend **sept jours** sa première montée ; un joueur qui arrive un dimanche soir l'a dans l'heure. Même le Problème du jour réussi ne donne qu'un chiffre « en attente ». Ca' Assidua est restée niveau 1 pendant 21 visites, puis a sauté du 1 au 3 : la montée vers le niveau 2 (la 4ᵉ bobine) n'a jamais eu son moment. | Journal ci-dessus ; `rang.ts:438-488` (`raise` seulement dans `growWeek`) ; `02-lundi-montee-a.png` | Créditer le Prestige **au fil de l'eau**. Garder le plafond de la semaine comme plafond de **gain**, pas comme date de paiement. Le niveau monte dès que le seuil est franchi, et chaque niveau a son moment. |
| G3 | P1 | **Le moment de la montée ne dit pas ce qui est nouveau.** « Niveau 3 · Bottega · 4 bobines, une île de 12 cases, une tour » décrit l'état, pas le gain. Les **ouvrages** (scierie, briqueterie, verrerie : le vrai saut du niveau 3) n'y figurent pas, et la bobine du niveau 2 est passée sous silence. | `02-lundi-montee-a.png` ; `Maison.tsx:357-358` (n'affiche que `caps.bobbins`, `tiles`, `towers`) | « Nouveau : la 4ᵉ bobine · les ouvrages (scierie, verrerie…) », avec l'objet dessiné et un geste « Bâtir une scierie ». |
| G4 | P1 | **Le chemin des niveaux cache les grands buts.** La fiche annonce au niveau 6 « une deuxième tour ». Elle ne dit ni **l'Arsenal ni la Guerre**, qui s'y ouvrent pourtant, et le niveau 11 n'est que « l'île à 28 cases », sans **les détroits noirs**. Le but du mois, celui qui fait revenir, est invisible. | `03-fiche-maison-n3.png` ; `plancheRoutes.ts:180-195` (`opens` ne lit que bobines, cases, étage, tours) ; `venice1450.lagune.ts:336` et `:417` (`minLevel` 6 et 11) | Mettre au chemin tout ce qu'un niveau ouvre (lieux, navires, détroits), avec une image. Le niveau 6 doit se lire « l'Arsenal et la Guerre de la semaine ». |
| G5 | P1 | **Le prix de la place écrase l'occasionnel, contre les robots.** La place dans le sestiere vaut de 100 (1ᵉʳ) à 12 (12ᵉ). Un joueur qui vient trois fois dans la semaine finit dernier, **derrière onze Maisons de l'ordinateur**, et ne gagne que 14 de Prestige : niveau 1 après une semaine. Le rattrapage n'y fait rien. Il relève le **plafond** de la semaine suivante (500 + 243 pour Ca' Rara), mais ce plafond, l'occasionnel ne l'approche jamais. Il ne profite qu'à l'assidu qui a manqué une semaine. | Journal ; `maison.ts:67-79` (`placeTop - (place-1) × placeStep`) et `maison.ts:127-135` (`maisonWeek` : le report s'ajoute au plafond) ; `/api/maison` de Ca' Rara : `carry: 243` | Classer la place entre **personnes seulement** (comme les lauriers). Remplacer le report par un **bonus de retour** : les premiers points d'une semaine valent double jusqu'à un seuil, comme le « repos » des MMO. Un plancher de Prestige pour qui a joué au moins trois jours. |
| G6 | P1 | **La première économie ne vend pas ce qu'elle produit.** Dès le premier soir, le bois et le sable de Ca' Assidua sont pleins (240 / 240) et le restent toute la semaine. Seul le sel trouve preneur. Avec un bon placement, une semaine rapporte 2 900 ducats, alors qu'un atelier en coûte 600 et sa première amélioration 3 000. L'occasionnel : 247 ducats en une semaine. Au Prestige du commerce (1 point pour 50 ducats, 55 par jour au plus), un débutant fait **2 à 7 points par jour** ; le plafond de 55 ne sert qu'aux Maisons de niveau 10. | Journal (`stock wood 240, sand 240`) ; rapport 01 (D4 : 319 ducats en 23 h) ; `venice1450.lagune.ts:308` | Revoir au banc les **premières 72 heures** (pas seulement les huit semaines) : une ville proche qui achète chaque matière brute à un prix qui rembourse le premier atelier en un jour, et un Prestige du commerce dégressif (les premiers ducats du jour comptent plus). |
| G7 | P1 | **Les ligues dispersent une petite population.** À la fin de la marée, le sixième du haut de **chaque** lagune monte, arrondi au supérieur : avec un ou deux joueurs, le premier monte toujours, seul, dans une lagune de 47 robots. Les ligues ne changent **aucune règle** (ni prix, ni corsaires, ni gains). Elles déplacent la Maison, rembobinent ses fils (sa patine est perdue) et la séparent de ses voisins et de sa Muda. Le rapport 04 l'a vécu (S6). | `plancheLagoons.ts:139` (`Math.ceil(players.length * share)`) ; aucun usage de la ligue dans les règles du moteur (`grep league packages/engine/src/planche`) ; `ligue.ts` (fils rembobinés) | **Geler les ligues** tant qu'une lagune n'a pas au moins 24 personnes actives. Pour la bêta : une seule lagune, et la Sérénissime en vitrine. Une ligue doit ensuite **changer quelque chose** (des corsaires plus forts, un décret de plus), sinon c'est un déménagement. |
| G8 | P1 | **Le haut de la progression est vide.** Après le niveau 16, les quatorze niveaux suivants n'ouvrent que des bobines (9 à 12) et 4 cases. Pas de bâtiment de prestige, pas de pièce de la Passe, rien de ce que promettait l'audit du 11 novembre (§ 8.1, « 21 à 30 »). Les ducats s'accumulent (puits / sources entre 0,44 et 0,72 au banc) sans rien à acheter au sommet : la teinture des bobines et l'apparat (CADRAGE-v4 § 13.3) ne sont pas faits. | `venice1450.lagune.ts:291-304` ; `calibration.md` § L'Arsenal (ratio puits / sources) ; aucune occurrence de teinture ni de tresse dans `planche/` | Un **puits de fin de jeu** utile et visible : bâtiments de prestige sur l'île (le palais, le campanile), la teinture des bobines, des pièces de caractère gagnées aux capitaines. Chaque niveau après 16 ouvre **une chose qu'on voit**. |
| G9 | P1 | **Rien ne rappelle le joueur hors du jeu.** La planche n'envoie aucune notification : ni l'entrepôt plein, ni la sortie de capitaine annoncée 24 h avant (le plan dit « par une notification »), ni la Guerre qui commence, ni le rival qui passe devant, ni la Gazette. Le push de l'ancien jeu existe, mais il n'est pas branché sur la planche. | `notify/notifier.ts` n'est appelé par aucun `planche*.ts` (seul `notify` du direct, `plancheRoutes.ts:40`) ; `plan-maree.md` § 3.2 ; `web/src/game/push.ts` (ancien jeu) | Six notifications au plus, réglables, regroupées (§ 7). |
| G10 | P1 | **La rétention de la planche ne se mesure pas.** Les courbes J1, J3, J7, J14 et J30 de l'administration lisent `players` et `telemetry` de l'ancien monde ; la planche n'écrit ni l'un ni l'autre, hors compagnie. On ne pourra pas juger la bêta (critère « 40 % reviennent la deuxième semaine »). | `admin.ts:18-40` ; `grep insert(telemetry)` : seulement `plancheCompany.ts` pour la planche | Une ligne de télémétrie par visite et par geste clé (premier fil, premier atelier, première Passe, montée de niveau), et la courbe J1/J7/J30 de la planche à l'administration. |
| G11 | P2 | **Des rendez-vous à heure fixe, contre la règle « rien ne tourne sans toi » bien comprise.** Commandes scellées à 9 h et 17 h UTC, valables 4 h ; sorties à 18 h UTC ; Muda le samedi de 8 h à 20 h UTC ; défi à accepter en 2 minutes. CADRAGE-v4 (règle 8) dit « aucune récompense qui expire ». Hades' Star tient ses rendez-vous **à l'heure du joueur** ou sur plusieurs jours. | `venice1450.lagune.ts:327` (`hours: [9, 17]`), sorties `hour: 18` ; rapport 03 (C14) | Commandes ouvertes **à la première visite de la demi-journée** (pas à heure fixe) ; Muda chargée et forcée du mercredi au samedi ; l'heure de la sortie choisie par le tenant dans une plage. |
| G12 | P2 | **Les règles d'or du dépôt ne disent plus le jeu.** `CLAUDE.md` garde les règles du 1er novembre (la Porta, Rome, la Terraferme, la Contesa, les perles, les modules, les reliques de la Porta). Or tout le code de la planche suit CADRAGE-v4, encore marqué « à valider ». Deux exemples. La règle 2 (« le risque vient de Rome, jamais d'un autre joueur ») est contredite par les tours prises entre joueurs et par la Guerre. La règle 3 (« on ne gagne pas sans jouer ») est contredite par les fils qui vendent pendant l'absence. | `CLAUDE.md` § Règles d'or ; `CADRAGE-v4.md:5-7` (« à valider ») et § 2 | Faire valider CADRAGE-v4 et réécrire les huit règles d'or pour la planche (§ 5). Tant que deux textes font foi, chaque plan se juge contre le mauvais. |
| G13 | P2 | **La semaine converge sur dimanche et lundi, et le milieu est creux avant le niveau 6.** Lundi : Prestige, niveau, rival, Guerre (préparer son port), marée. Samedi : Muda. Dimanche : Gazette, rival, place. Du mardi au vendredi, un joueur de niveau inférieur à 6 n'a que le commerce, le Problème du jour et deux commandes qu'il ne peut souvent pas servir (rapport 01, D6). | Journal ; `plan-muda.md`, `plan-guerre.md` (calendriers) ; rapport 01 (D12) | Un **objectif du jour** tiré de l'état de la Maison (« livre 40 sels à Rovigo », « force le canal 1 ») avec un petit Prestige crédité tout de suite, à la manière des « défis du jour » de Marvel Snap, mais sans série ni récompense qui expire. |
| G14 | P2 | **Rien à vendre, et rien de prêt pour vendre.** La planche n'a ni perle, ni boutique, ni objet d'apparat. Le seul code de paiement est le Pass de l'ancien jeu, débranché. Ce n'est pas un défaut pour la bêta (D3 : bêta sans perle). Mais le modèle doit être choisi **maintenant**, car il décide de ce qu'on rend visible (§ 6). | `pass.ts:19` (`PASS_PAYMENT_OPEN = false`) ; aucune occurrence de perle dans `planche/` | Le § 6. |

## 4. L'inventaire des systèmes, et ce que j'en ferais

Vingt-trois systèmes se voient aujourd'hui sur la planche, dans ses fiches et dans ses six boutons. Je propose d'en garder **douze**, regroupés en quatre familles, et de n'en montrer que **trois le premier jour**.

| # | Aujourd'hui | Décision | Devient | S'ouvre |
| --- | --- | --- | --- | --- |
| 1 | Fils et bobines (patine, détour, péage) | **Garder** | 1. **Les fils** | Jour 1 |
| 2 | Île (cases, ateliers, voisinages, entrepôt) | **Garder** | 2. **L'île** | Jour 1 |
| 3 | Villes (demande commune, parts) | **Garder** | 3. **Les villes** | Jour 1 |
| 4 | Commandes scellées | **Fusionner** dans les villes : une ville « a une commande » quand on peut la servir | (villes) | Niveau 3 |
| 5 | Tours, sceaux, garde préparée, péage | **Garder** | 4. **Les tours** (forcer, tenir, garder) | Jour 1 : une tour d'entraînement ; les vraies au niveau 2 |
| 6 | Sorties des capitaines | **Fusionner** dans les tours (une tour tenue « est attaquée demain ») | (tours) | Avec la première tour tenue |
| 7 | Détroits noirs, reliques, plans | **Fusionner** dans les tours (les tours noires du Large) ; reliques et plans en un seul objet, le plan | (tours) | Niveau 11 |
| 8 | Problème du jour | **Garder** | 5. **Le Problème du jour** | Jour 2 |
| 9 | Défi par le fil, cote, laurier de la Passe | **Garder**, en un seul lieu | 6. **Le duel** | Niveau 4, ou à la demande d'un ami |
| 10 | Niveau, Prestige, titres, façade, Livre | **Garder**, en un seul compteur à l'écran (le niveau et son anneau) | 7. **La Maison** | Jour 1 |
| 11 | Rang, pastille, trois lauriers, Doge, palais | **Garder**, mais un seul rang visible au début | 8. **Le rang** | Semaine 2 |
| 12 | Rival de la semaine, pavillons | **Fusionner** dans le rang (le barreau du dessus) | (rang) | Semaine 1, mais seulement un rival **joueur** |
| 13 | Arsenal, navires, défenses, réparations | **Fusionner** avec la Guerre en un seul lieu, **le Port** | 9. **Le Port** | Niveau 6, **caché avant** |
| 14 | Guerre de la semaine, flottilles, ruses | (Port) | (Port) | Niveau 6 |
| 15 | Lido d'entraînement | (Port) : le premier assaut, guidé | (Port) | Niveau 6 |
| 16 | Puissance | **Cacher** : elle sert à l'appariement, le joueur n'a pas à la lire (règle 6) | — | — |
| 17 | Compagnie, phare, discussion, signes | **Garder** | 10. **La compagnie** | Semaine 1, ou par invitation dès le jour 1 |
| 18 | Saluts et félicitations | **Fusionner** dans la compagnie et le rival | (compagnie) | — |
| 19 | Muda | **Garder**, comme le grand rendez-vous de la semaine | 11. **La Muda** | Semaine 2 |
| 20 | Gazette | **Fusionner** : ce n'est pas un système, c'est la **carte du dimanche** (le bilan de tout), à partager | (vue) | Premier dimanche |
| 21 | Marée d'encre, pierres, fin de marée | **Garder**, comme la saison | 12. **La marée** | Semaine 2 (l'encre se voit avant) |
| 22 | Décrets du Doge | **Retirer** jusqu'à 200 joueurs actifs : un seul Doge par lagune décide pour 47 robots | — | Plus tard |
| 23 | Ligues, Sérénissime | **Geler** (G7) ; la Sérénissime reste en vitrine | — | Plus tard |

**Les compteurs** : au premier jour, trois seulement (ducats, bobines, niveau). Les sceaux s'appellent **sceaux** aux tours seulement ; à la Guerre, ce sont des **brèches** (un mot par sens). Reliques et plans ne font qu'un objet. La Puissance disparaît de l'écran.

**L'ouverture par étapes**, sous le projecteur des tutoriels (décision du 8 novembre). Chaque lieu s'annonce le jour où il s'ouvre (« Le Port s'ouvre : ta première galère t'attend »), et aucun bouton « pas encore » n'est montré.

| Quand | Ce qui s'ouvre |
| --- | --- |
| Jour 1, 15 premières minutes | L'île, un atelier, un fil vers une ville proche, une tour d'entraînement gagnée : niveau 2 |
| Jour 2 | Le Problème du jour ; les vraies tours |
| Semaine 1 | Le rival (une personne), la compagnie ; la première carte du dimanche |
| Semaine 2 (niveaux 3 à 5) | Les ouvrages, les commandes des villes, la Muda, le rang, la marée |
| Niveau 6 (semaine 2 à 3) | Le Port : l'Arsenal et la Guerre |
| Niveau 11 | Les tours noires du Large et les plans |

## 5. Les règles d'or : tenues ou non (celles de `CLAUDE.md`, lues à la lumière de CADRAGE-v4)

| Règle | État | Où ça casse |
| --- | --- | --- |
| 1. Ton empire t'appartient | **Tenue** | Rien n'est pris à l'île ; un port assailli ne perd rien de réel. |
| 2. Le risque vient du jeu | **Changée sans le dire** | Les tours passent d'un joueur à l'autre, et la Guerre se joue entre joueurs (G12). C'est un bon changement (« on te devance, on ne te vole pas »), mais il doit être écrit. |
| 3. Rien ne s'accumule sans fin, rien ne tourne sans toi | **Moitié tenue** | Les plafonds tiennent : entrepôt de 240, Prestige de 500 par semaine, phare, Muda. Mais les **ducats** s'accumulent sans emploi au sommet (G8). Et les fils vendent pendant l'absence, contre la phrase du 7 novembre, mais c'est voulu par CADRAGE-v4 (règle 8). Je garde ce revenu passif : c'est lui qui rend le jeu jouable en trois visites. |
| 4. Le temps s'achète, la puissance jamais | **Tenue par absence** | Rien n'est à vendre (§ 6). |
| 6. On affronte des joueurs de son niveau | **Tenue à la Guerre, pas ailleurs** | La Guerre apparie par bandes de Puissance, et elle est équilibrée au banc (la flottille la plus puissante ne gagne que 38 %). Mais **la place dans le sestiere**, qui fait la plus grosse part du Prestige d'un débutant, met un niveau 1 contre onze robots au niveau médian (G5). Le défi par le fil se fait sans bande, ce qui est acceptable puisqu'il est refusable. |
| 7. Quelques minutes, plusieurs fois par jour ; aucun mode n'exige d'être présent | **Tenue pour la durée, pas pour l'heure** | Chaque mode dure moins de dix minutes. Mais quatre rendez-vous sont à heure fixe UTC (G11), et le défi expire en deux minutes. |

**Où l'assidu écrase l'occasionnel** :

- **La place du sestiere** : 100 contre 12 (mesuré, G5).
- **Les tours** : +46 % de commerce pour qui les tient (`calibration.md` § La Passe dans le commerce). Elles se prennent en rejouant une ligne gagnante (rapports 03 C2 et 08 Q2), et elles se défendent mieux quand on répond aux sorties de 18 h.
- **Le laurier de la Garde**, qui compte des heures tenues.
- **Le rattrapage**, qui ne profite qu'à lui (G5).

Le plafond de 500 par semaine, lui, fait bien son travail : sur un an, l'assidu ne va pas plus de 30 à 40 % plus vite. Le défaut n'est pas la vitesse du haut, c'est **le plancher du bas**.

## 6. La monétisation (après la bêta, D3 : bêta sans perle)

**Le principe** : dans ce jeu, presque tout se classe. Les ventes font le Négoce et la place, les tours font la Garde, la Passe fait la cote. Acheter du temps de chantier ou de production, c'est donc acheter du rang. **Je déconseille donc les perles d'accélération**, y compris pour les chantiers, contrairement à la lettre de la règle 4. Hades' Star le fait, mais son classement ne mesure pas le commerce. Ce qu'on peut vendre, par ordre de priorité :

| Offre | Ce qu'elle contient | Pourquoi elle ne trahit rien | Prêt ? |
| --- | --- | --- | --- |
| **L'atelier de la Passe** (abonnement, sur le modèle de Chess.com) | Problèmes d'archive à volonté (sans Prestige), le revoir de ses duels avec l'analyse du moteur, des leçons, la « course aux problèmes ». Le Problème du jour reste gratuit et unique. | On paie pour **apprendre**, pas pour gagner ; jamais d'analyse pendant un duel classé. Le moteur, le solveur (`passeKeys`) et les vingt problèmes existent. | Moteur prêt ; il faut un générateur de positions (rapport 03, C11) et une page d'analyse. |
| **L'apparat** | Meubles et couleurs de pavillon, rubans du fil (couleur seule, à ne pas confondre avec la teinture qui joue), façades, barques, cadres de la carte du dimanche. | Purement visuel ; Porcellana s'y prête (petits objets de porcelaine). | Le pavillon existe (5 couleurs, 8 meubles), la façade aussi ; il n'y a ni catalogue ni magasin. |
| **Le mécénat de la marée** (un passe de six semaines) | Une piste gratuite et une piste payante, d'apparat seulement, qui avancent **en jouant**. | Pas de ducats, de Prestige, de bobine ni de plan dedans. Il épouse la saison qui existe déjà. | La marée est là ; la piste est à faire. |
| **Le pack de fondateur** (bêta) | Un pavillon et un titre « Fondateur » pour les premiers testeurs. | Un merci, sans effet. | Facile. |

**Jamais** : des bobines, des cases, du Prestige, un assaut ou un essai de plus, une place de ligue, un tirage du lieutenant, ni la vitesse d'une tour, d'un navire ou d'un chantier.

## 7. Ce qui manque pour une bêta

| Moment | Ce qui manque | Proposition |
| --- | --- | --- |
| **Le premier jour** | Pas de guide sur la planche (rapport 01, D1). Pas de niveau avant lundi (G2). Une économie qui ne rembourse pas le premier atelier (G6). | Le parcours de quinze minutes du § 4 (atelier, fil, tour d'entraînement), qui finit sur le **niveau 2 crédité tout de suite**. |
| **Les notifications** | Aucune (G9). | Six au plus, regroupées, avec un réglage : entrepôt plein ; ta tour est attaquée demain ; la Guerre commence (dès le niveau 6) ; ton rival passe devant ; défi reçu ; la carte du dimanche est parue. Jamais plus de deux par jour. |
| **Le retour** | Rien n'accueille au retour (rapport 01, D14). | La **carte du retour** : ce que tes fils ont vendu, ce qui est plein, ce qui s'est ouvert, et **une** action proposée. |
| **Le partage** | La Gazette ne se partage pas. L'invitation copie, sans feuille de partage (rapport 04, S18). | La carte du dimanche en image, avec `navigator.share` (l'ancien jeu le fait déjà, `web/src/game/chronicle.ts:81`). Le lien d'invitation avec un texte prêt. |
| **La mesure** | Pas de rétention de la planche (G10). | Télémétrie et courbes J1, J7, J30 avant d'inviter qui que ce soit. |
| **La population** | Des ligues qui isolent (G7), des robots partout. | Une lagune, des ligues gelées, un rival toujours humain s'il y en a un dans la lagune. |
| **L'honnêteté des duels** | Une ligne gagnante se rejoue et se partage (rapports 03 C1-C2, 08 Q2). | Le lieutenant tiré au sort par le serveur au premier coup. Sans cela, le Problème du jour, les tours et le classement ne veulent rien dire. |

## 8. Ma position sur les autres rapports

- **01, le débutant (4 / 10)** : **d'accord sur tout**, et j'en donne la cause de conception. Son « rien de nouveau mardi » vient de G2 (le niveau du lundi) et de G13 (le creux de semaine). Son « Puissance trois fois différente » disparaît si la Puissance n'est plus montrée (§ 4). Sa première recommandation (un quart d'heure guidé qui finit au niveau 2) est la plus rentable de tout l'audit.
- **03, le compétitif (5 / 10)** : **d'accord, et je monte C1-C2 au premier rang de la conception**, pas seulement de la sécurité. Un jeu dont le meilleur atout est un duel de réflexion ne peut pas laisser une victoire se copier : c'est ce qui vide le Problème du jour, la Garde et les tours. Sur C6 (le laurier de la Passe qui pousse à refuser), je propose plus simple : **pas de laurier de la Passe sans trois défis joués dans la marée**. Je suis plus réservé sur C10 (retirer l'aide dans les défis classés) : la lecture des chemins est ce qui rend la Passe abordable. Je la garderais, avec un réglage « sans aide » pour les joueurs confirmés, sans bonus de cote.
- **04, le social (4 / 10)** : **d'accord**. J'ajoute que S5 (une compagnie de débutants ne peut rien faire à la Guerre) et S16 (le phare ne sert qu'aux armés) viennent d'un même choix : **la compagnie a été branchée sur la Guerre, qui s'ouvre au niveau 6**. Le phare devrait d'abord **repousser l'encre** autour des tours de la compagnie, ce qu'il fait à peine (0,05 rangée par niveau), et nourrir la Muda : deux choses que tout le monde voit dès la semaine 1. Sur S6 (la ligue sépare les amis), ma réponse est plus radicale : geler les ligues (G7).
- **08, QA et sécurité (4 / 10 pour une bêta ouverte)** : d'accord avec la conclusion (bêta fermée entre amis possible tout de suite). Du point de vue de la conception, Q1 (les ruses lisibles), Q2 et Q7 (les lignes rejouées) sont des **défauts de règle**, pas seulement des trous : ils décident si la Guerre et la Passe sont des jeux.

## 9. Ce qui marche, à garder

- **Le fil** : un seul geste, visible, qui porte toute l'économie et se comprend sans mots. C'est l'idée qui distingue Fondaco de tout le genre.
- **La Passe** : un vrai jeu de la famille d'Hex, à armes égales, en deux minutes. La profondeur se mesure : la force 3 bat la force 2 dans 83 % des parties (rapport 03). C'est le « Chess.com » du jeu, et sa monétisation la plus saine (§ 6).
- **Le plafond de Prestige à 500 par semaine** : il borne l'écart du haut sur un an. Bonne décision, à garder (il faut seulement réparer le bas, G5).
- **La patine** : tenir une route paie, et redistribuer huit fois par jour n'apporte rien. C'est la meilleure règle anti-assidu du jeu.
- **La Guerre telle que calibrée** : des guerres serrées (73 % à trois sceaux près), la flottille la plus puissante qui ne gagne que 38 % des fois, l'assaut joué sur le serveur, rien de pris, et un port assailli qui ne perd rien.
- **La Muda** : un rendez-vous commun lisible, plafonné à 20 par jour pour ne pas devenir obligatoire. C'est le meilleur moment collectif de la semaine.
- **La montée de niveau comme un moment à part** (`02-lundi-montee-a.png`) : la forme est juste, il manque le contenu (G3).
- **La méthode** : chaque réglage passe au banc et entre dans `calibration.md`. Il faut seulement ajouter le banc des **72 premières heures** et celui du joueur occasionnel.

## 10. Mes trois recommandations prioritaires

1. **Resserrer à douze systèmes, ouverts par étapes** (G1, G4, G13 ; § 4). Fusionner l'Arsenal et la Guerre en un Port caché jusqu'au niveau 6. Fondre les commandes dans les villes, et les sorties et les détroits noirs dans les tours. La Gazette devient la carte du dimanche. Retirer les décrets, geler les ligues, cacher la Puissance. Trois lieux le premier jour, chaque nouveau lieu annoncé le jour de son ouverture, et aucun bouton « pas encore ».
2. **Réparer la première semaine** (G2, G3, G5, G6 ; rapport 01). Le Prestige crédité au fil de l'eau, sous le même plafond hebdomadaire. Le niveau 2 dans la première séance. Une montée qui dit ce qu'elle ouvre. La place du sestiere comptée entre personnes, et un bonus de retour à la place du report de plafond. Une économie des 72 premières heures qui rembourse le premier atelier dans la journée, vérifiée au banc.
3. **Donner au joueur une raison de revenir qui vienne du jeu, pas de l'horloge** (G8, G9, G10, G11). Six notifications utiles. La carte du retour. Des rendez-vous à son heure plutôt qu'à heure UTC fixe. La télémétrie de la planche avant la bêta. Et, pour l'horizon d'un an, un puits de fin de jeu visible (bâtiments de prestige, teinture, pièces de caractère), avec l'apparat et l'atelier de la Passe comme seuls objets à vendre.

## Annexe : les captures

| Capture | Ce qu'elle montre |
| --- | --- |
| `01-arrivee-lundi.png` | L'arrivée : six lieux à gauche dès la première seconde, une commande scellée impossible en bas, aucune ville à portée de pouce. |
| `02-lundi-montee-a.png` | Lundi 23, 9 h : la première montée de niveau, d'un coup du 1 au 3, après sept jours ; elle dit l'état, pas ce qui est nouveau (les ouvrages manquent). |
| `03-fiche-maison-n3.png` | La fiche de la Maison : « 0 / 673 » (le report relève le plafond) ; le niveau 6 annoncé comme « une deuxième tour », sans l'Arsenal ni la Guerre. |
