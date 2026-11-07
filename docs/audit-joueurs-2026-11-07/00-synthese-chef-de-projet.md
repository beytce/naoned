# Synthèse du chef de projet : audit joueurs du 7 novembre 2026

*Consolidation des six rapports du dossier (01 gestion, 02 casual mobile, 03 expert F2P, 04 UX/UI, 05 city-builder, 06 QA), vérification dans le code (aucun code modifié) et benchmark de 15 jeux du genre. Références : `R1` à `R6` = rapports 01 à 06, suivis de l'identifiant du bug dans le rapport (ex. `R6 QA-01`). Captures : `/tmp/claude-0/-home-user-naoned/7091555e-9be4-5e80-9143-48409e2cdd8e/scratchpad/` (abrégé `CAP/`).*

*En cours ailleurs (une autre session, non repris ici) : la rotation de caméra à 360° ; l'interdiction de livrer des villes non reliées par des cases achetées (mule sur l'eau, `R6 QA-07`, `citiesCovered` en cercle, `packages/engine/src/empire/map.ts:182-190`).*

---

## 1. Verdict

**Pas publiable.** Notes des testeurs : gestion 4/10, casual 4/10 (« je désinstallerais à la 2ᵉ session »), expert F2P 3,5/10, UX/UI 5/10, city-builder « la ville vit-elle ? » 2/10, QA 3/10. **Moyenne ≈ 3,6/10.** Unanimité sur deux points : les dix premières minutes sont au niveau d'un jeu commercial (porcelaine, guide jusqu'à la première livraison payée en < 2 min, intérieur d'atelier), et tout s'effondre juste après.

Les trois causes racines :

1. **La boucle se vide après dix minutes.** Aucune commande pendant 2 h à 2 h 45 (cause trouvée dans le code : le départ sans atelier « brûle » le premier tirage de commande, § 2, P0-05), des chaînes qui ne coulent pas (récolte et relance à la main, intrants pris une seule fois), un guide qui se tait après la Casa 2, des monnaies de récompense mortes (Faveur, Sceaux) et un mur à la Casa 4. Le joueur n'a ni quoi faire, ni raison de revenir.
2. **Les couches successives ne sont pas nettoyées.** Textes du jeu mensuel (accueil, saisons, « partie rapide »), couleurs Lagune et Jour (violet, moutarde, or), cinq palettes, ancien dock, un même lieu sous quatre noms, deux choses sous un même nom (« Remise »). La règle « chaque système absorbe les anciens » n'est pas tenue à l'écran.
3. **« Tout se voit » (règle d'or 8) n'est pas encore vrai.** La carte ne nomme pas les villes, les trajets ne se voient pas, le Marché est un tableur, rien ne bouge (ni habitants, ni fumée, ni barque), l'échelle et la géographie sont incohérentes (une case = ~75 km mais porte trois sapins ; Venise sans lagune ; on sert Bologne avant Venise).

S'y ajoute un **socle non durci** : un joueur quelconque casse la Porta et la Terraferme de tout le serveur avec une requête (`__proto__`), et le Marché ignore le plafond du Fondaco (règle d'or 3). Les 1 662 tests passent mais ne couvrent aucun de ces cas.

---

## 2. Vérifications dans le code (points douteux ou contradictoires)

| Point | Verdict | Preuve |
|---|---|---|
| Faille prototype `__proto__` (`R6 QA-01`) | **Confirmé.** Le fichier n'est pas `apps/server/src/game/tx.ts` mais `packages/engine/src/tx.ts`. `inventoryLine` lit `inv[resource]` sur un objet ordinaire : pour `"__proto__"` il renvoie `Object.prototype` (vrai), qui devient la « ligne » de stock et reçoit les écritures. En amont, `sellAt` accepte le bien car `r.produces["__proto__"]` n'est pas `undefined` ; `heldAt` rend `NaN`, et `n <= 0` est faux pour `NaN`, donc on continue. La route ne filtre que la longueur. | `packages/engine/src/tx.ts:307-319` ; `packages/engine/src/empire/trade.ts:272-279` ; `apps/server/src/game/empire.ts:147,153,200` (`good: z.string().max(40)`) |
| Clés `constructor`, `valueOf`, `toString` (`R6 QA-05/06`) | **Confirmé.** Même motif `obj[saisie]` sans `Object.hasOwn`. | `packages/engine/src/empire/staff.ts:53` ; `trade.ts:272` et `:312` |
| Plafond du Fondaco ignoré au Marché (`R6 QA-02`) | **Confirmé.** `buyAt` ne lit ni `storeCap` ni la profondeur ; `putAt` n'a pas de plafond. | `trade.ts:301-335` ; `packages/engine/src/empire/stores.ts:89-102` |
| Prix figé sur tout l'ordre (`R6 QA-03`) | **Confirmé.** `unit` calculé une fois (l. 314), pression appliquée après l'achat (l. 329). | `trade.ts:314`, `:329` |
| Livraison non réglée à la réouverture (`R3 B1`, `R6 QA-04`) | **Confirmé.** Le client ne programme le règlement que pour les arrivées futures (`filter((t) => t > p.now)`) ; `GET /api/empire` ne règle rien. Le plan des premiers pas (lot 2) se dit « rebranché » : il ne l'est que pour une page restée ouverte. | `apps/web/src/empire/EmpireGame.tsx:319-329` ; `apps/server/src/game/empire.ts:380-385` |
| Aucune commande pendant ~2 h (`R1 B1`, `R2 E1`, `R3 D1`, `R5`, `R6 QA-11`) | **Confirmé, et cause racine trouvée** (aucun testeur ne l'a vue) : à la fondation la maison n'a aucun atelier (premiers pas, lot 1), donc `orderGoodsOf` est vide, `drawOrder` rend `null`, et la boucle fait `continue` **en avançant quand même `next` d'un intervalle**. Le premier créneau est brûlé : la première vraie commande tombe à fondation + `everyMinutes` (600/360/225/163/128 min selon la taille). En plus, `firstLotBps` = 2 500 (un quart de lot). C'est une régression introduite par le départ vide, pas un choix d'équilibrage. | `packages/engine/src/empire/orders.ts:74-79`, `:121`, `:164-170` ; `packages/engine/src/themes/venice1450.empire.ts:319`, `:328` |
| `{cash}` dans le guide (`R2 B1`, `R3 B2`, `R4 10.1`, `R6 QA-08`) | **Confirmé.** Le remplacement n'est fait que sur le corps ; `{cash}` est dans le titre. | `apps/web/src/empire/Guide.tsx:264-266` ; `apps/web/src/i18n.ts:1064` |
| Textes d'accueil du jeu mensuel (`R1 d1-2`, `R3 B3/B10`, `R4 0.1`, `R6 QA-09`) | **Confirmé.** « saison de … », « en un mois », « Le jeu dort la nuit », « Rien à acheter… ni vitesse » (faux depuis les perle), « Une saison par mois : tout le monde repart à égalité » ; « trois ateliers et cinq cents ducats » ; « bouton doré » ; « De 2 à 6 amis, d'un mois à l'autre… partie rapide ». | `i18n.ts:58-68` (rendu `App.tsx:140,211`), `:214`, `:1069`, `:3553` |
| Monnaies mortes Faveur et Sceaux (`R3 D2`, `R1 d8`) | **Confirmé.** Elles ne font qu'augmenter ; aucune commande ne les dépense. `charterFavourOf` existe mais n'est appelé nulle part (la charte en Faveur a été retirée, CADRAGE-v3 § 13 étape 9). Le Carnet ne paie donc rien. | `empire/carnet.ts:136-139`, `condotta.ts:22`, `terra.ts:105,129` ; `house.ts:437` (mort) |
| Perle absentes (`R3`, `R6`) | **Confirmé.** Aucune occurrence dans le moteur, le serveur ou l'écran de l'empire. La règle d'or 4 n'a pas d'objet. | recherche `perl` dans `packages/engine/src`, `apps/server/src`, `apps/web/src/empire` |
| Ouvrier de nuit inutile (`R1 B3`) | **Confirmé, défaut de conception.** Une seule équipe « couvre la journée » ; deux équipes donnent la **moyenne** des deux. Un second ouvrier de même niveau la nuit = 0 gain, 40 d perdus. | `packages/engine/src/empire/interior/throughput.ts:208-231` |
| Lot d'accueil de 30 s qui passe à 18 min dès un geste d'intérieur (`R6 QA-10`) | **Confirmé.** `repaceWorkshop` ne protège pas un job `once`. | `packages/engine/src/empire/workshops.ts:239-247` |
| « Relancer » muet (`R2 B13`, `R6 QA-13`) | **Confirmé.** Retour silencieux quand rien ne peut partir. | `workshops.ts:199` |
| Recettes qui ne s'emboîtent pas (`R1 d5`, `R2 E2`) | **Confirmé.** Carrière 8 argile / briqueterie 10 ; camp 11 bois / scierie 10 + briqueterie 2. | `packages/engine/src/themes/venice1450.ts:72,79,99,106` |
| Mur de la Casa 4 (`R3 D7`) | **Confirmé.** Casa 2 : 50 d + 5/5 ; Casa 3 : 100 d + 10/10 ; Casa 4 : 1 200 d + 60/60 (×12) ; Casa 5 : 6 400 d + 180/180. | `venice1450.empire.ts:18-21` |
| « +96 » au lieu de « +100 » : taxe (R3, R4) ou salaires (R6) ? | **Ce sont les salaires** (`wagesOn`, CADRAGE § 5.2), pas une taxe. Le cadrage exige qu'ils soient lisibles (« Salaires : −1 240 d sur 6 200 d ») : ils ne le sont pas. | `trade.ts:75-88` |
| Prix d'atelier 120 → 103 → 48 (`R1 B13`, `R2 B7`, `R3 B7`) | **Voulu mais invisible et instable** : rattrapage « le savoir circule » calculé sur la population du monde. Dans un monde presque vide, la baisse est maximale et dérivera à mesure que les joueurs arrivent. | `packages/engine/src/empire/catchup.ts` ; plan-premiers-pas lot 1 |
| Intro revue sur chaque appareil (`R6 QA-19`) | **Confirmé** : `localStorage` seulement. | `Guide.tsx:218-236` |
| La mule se voit-elle ? (R3 « oui », R2/R4/R5 « non ») | **Les deux** : la pastille de trajet existe, le modèle part hors champ car la caméra va à la ville ; la mule n'est jamais cadrée. À traiter comme « non vu » pour le joueur. | `R4 1.8`, `R5 B1` |
| Intérieur allumé ≈ ×3 de production (`R6 c7`) contre +4,5 % par amélioration de poste (`R1 B23`) | Non contradictoires : l'intérieur change la base (bonus d'emblée « +60 % sur le plan d'origine », `R4 6.2`), l'amélioration est marginale. **À recalibrer au simulateur avant d'allumer l'intérieur en production.** | `R6`, `R1`, `R4` |

---

## 3. P0 : bloquants avant toute publication

| ID | Problème | Testeurs | Preuve | Correction proposée | Effort |
|---|---|---|---|---|---|
| P0-01 | **Déni de service par `__proto__`** : Porta et Terraferme en 500 pour tous jusqu'au redémarrage ; `constructor`/`valueOf` acceptés (employé fantôme payé 200 d), 500 sur `toString`. | 1 (R6 QA-01, 05, 06) | `tx.ts:307-319`, `trade.ts:272-279`, `staff.ts:53`, `empire.ts:147,153,200` | Liste blanche des biens et des rôles dans les schémas zod (enum construit depuis le thème) ; `Object.hasOwn` partout où une saisie indexe un objet (recherche systématique `[good]`, `[role]`, `[code]`) ; `Object.create(null)` pour les inventaires ; rejeter `NaN` (`!(n > 0)`). Tests de non-régression avec les clés réservées. | S |
| P0-02 | **Marché sans plafond (règle d'or 3)** et prix figé : 100 000 bois et 100 000 épices au prix du début. | 1 (R6 QA-02, 03) ; arbitrage vu par R1 d6 | `trade.ts:301-335`, `stores.ts:89-102` | Borner l'achat par la place libre du Fondaco (`storeCap − stock`) et par la profondeur du jour ; prix intégré unité par unité (ou par tranches) ; refus clair « Fondaco plein ». | S |
| P0-03 | **Livraison non réglée à la réouverture** : mule « en route » sans fin, caisse non créditée, guide bloqué. | 2 (R3 B1, R6 QA-04) | `EmpireGame.tsx:319-329`, `empire.ts:380-385` | Régler les trajets échus à la lecture (le CADRAGE § 13 étape 4 le dit : « l'arrivée se règle à la lecture ») : `GET /api/empire` exécute un `empireSettle` si un trajet est échu, ou le client l'appelle au montage et à chaque retour en ligne (et pas seulement pour les arrivées futures). | S |
| P0-04 | **Textes faux dès l'accueil** : page d'accueil du jeu mensuel (risque juridique sur « ni vitesse »), « trois ateliers et cinq cents ducats », `{cash}`, « bouton doré », « saison de novembre », « d'un mois à l'autre… partie rapide… guilde ». | 6 (tous) | `i18n.ts:58-68, 214, 1064, 1069, 3553` ; `Guide.tsx:266` | Réécrire l'accueil selon CADRAGE-v3 (persistant, personne ne pille, les perle achètent du temps, quelques minutes plusieurs fois par jour) ; remplacer `{cash}` dans le titre ; test qui interdit toute accolade dans le rendu ; relire tout `i18n.ts` pour les restes du monde mensuel quand `WORLD_KIND=empire`. | S |
| P0-05 | **Désert de 2 h après l'accueil** (aucune commande). | 6 (R1 B1, R2 E1, R3 D1, R4 5.4, R5, R6 QA-11) | `orders.ts:164-170` (créneau brûlé sans bien), `venice1450.empire.ts:319,328` | 1) Corriger le créneau brûlé : ne pas avancer `next` quand aucun bien n'est tirable. 2) Commandes d'apprentissage : une commande par ville de la zone dans les 10–15 premières minutes, puis une cadence de démarrage (une toutes les 10–15 min pendant 2 h, cf. Hay Day/Township), puis la croisière. 3) Compte à rebours sur le repère de chaque ville. Valider au simulateur de 24 mois. | M |
| P0-06 | **Guide cassé après la 1ʳᵉ livraison** : main figée sur un onglet, étape « Briqueterie » sans bouton ni argile, « Tout tourne » faux, bulle tronquée, guide disparu après la Casa 2, cul-de-sac « Scierie » sans case libre. | 6 (R1 B7-B10, R2 B3-B6, R3 B4/B9, R4 10.2-10.5, R5 B4-B5, R6) | captures `CAP/p2-casual/022-s13-route-b.png`, `CAP/p4-ux/11-carte-producing.png`, `CAP/p3-expert-jeu/m14-step0.png` | Main sur la cible réelle de l'étape (case, atelier, ville, bouton) ou absente ; chaque étape a un bouton qui *fait* l'action (ouvrir la case libre et le catalogue sur le bon atelier, acheter une parcelle, acheter le manque au Marché) et une phrase de « pourquoi » ; ordre carrière → briqueterie ; guide présent jusqu'à la Porta (Casa 4) ; test des quatre ordres de construction. | M |
| P0-07 | **Chaînes cassées par conception** : un atelier relancé prend tous les intrants communs (la scierie affame la briqueterie) ; un atelier aval relancé sans intrant reste arrêté même quand l'intrant arrive ; récolte manuelle dans chaque intérieur. Contraire à la règle d'or 3 (l'absence coûte de la production aval). | 5 (R1 B4, R2 E4, R3 D5, R4 6.7, R5) | `workshops.ts:190-205` (relance), `R1 $S/d037.png` | Voir P2-01 (le Flux). Minimum pour publier : relance automatique dès que l'intrant est là, et priorité simple (bruts d'abord est déjà dans `relaunchAll`, à étendre au partage). | M |
| P0-08 | **Ouvrier de nuit payé pour rien**. | 1 (R1 B3) | `interior/throughput.ts:227-231` | Équipe de nuit = heures en plus (somme bornée, pas moyenne), comme plan-ateliers § 3.3 ; ou retirer le bouton tant que ce n'est pas fait. Intérieur éteint en production : à corriger avant de l'allumer. | S |
| P0-09 | **Lot d'accueil allongé à 18 min** par un geste d'intérieur. | 1 (R6 QA-10) | `workshops.ts:239-247` | `if (job.once) return` dans `repaceWorkshop`. | S |
| P0-10 | **Monnaies mortes** : Faveur et Sceaux encaissés sans usage ; le Carnet, seule boucle hebdomadaire, ne paie rien. | 3 (R1 d8, R2, R3 D2) | `carnet.ts:136-139`, `house.ts:437` | Décision du porteur (Q1) : donner un usage minimal (accélération plafonnée d'un chantier en Faveur, 3 par jour, CADRAGE § 5.4 ; Sceaux contre plans et cosmétiques) **ou** masquer les deux jusqu'à ce qu'ils servent. | M |
| P0-11 | **Erreurs muettes** : « Relancer » 200 sans effet ; seconde pose rapide 422 sans message ; codes trompeurs (`vehicle_busy` pour une ville inconnue). | 3 (R2 B13, R5 B7, R6 QA-13/14) | `workshops.ts:199`, `moves.ts:326` | Refus explicites (`insufficient_stock` avec le manque), toast systématique sur tout refus serveur. | S |
| P0-12 | **Carte muette** : aucun nom de ville à l'écran, repères qui se chevauchent ou passent sous la barre, San Marco sans repère, lot prêt et cases libres à `opacity: 0` hors guide. Un jeu de commerce dont on ne lit pas la géographie. | 4 (R2 B10/B11, R4 1.1-1.4, R5 B9, R1 B6) | `CAP/p4-ux/17-after-ramasser.png`, `CAP/p4-ux/26-san-marco.png` | Étiquette de nom permanente (à partir d'un zoom) sur chaque ville et sur le Marché ; écartement des repères ; zone utile sous la barre et hors du panneau ; repères « prêt » et « + » toujours visibles ; zones tactiles de 44 px. | M |

Total P0 : environ 2 à 3 semaines à une personne, dont la moitié en S.

---

## 4. P1 : cohérence et compréhension

### 4.1 Vocabulaire : un glossaire unique

Relevé par 6 testeurs sur 6. Proposition (à valider, Q3) :

| Notion | Mots vus aujourd'hui | Mot unique proposé | Remarque |
|---|---|---|---|
| Ton siège et son niveau | Fondaco, Casa, Maison, palais, comptoir, Domaine | **le Fondaco**, **niveau N** | « Casa N » disparaît de l'écran (lu comme « une 2ᵉ maison »). « Maison » = la famille marchande seulement (le joueur) |
| Le stock | Remise (bas d'écran), stock, réserve | **l'Entrepôt** (du Fondaco) | Écran dédié : jauges par marchandise et plafond |
| Le garage des véhicules | Remise, le quai, Convoi | **la Remise** (au quai) | Seul sens de « Remise » |
| Le marché | San Marco, Marché, Dogana, négoce, Venise | **le Marché de San Marco** | « Dogana » en sur-titre d'ambiance ; une seule entrée (le bâtiment), retirer l'entrée du profil |
| Prendre la production | Ramasser, Récolter, Encaisser, Relancer | **Récolter** | « Relancer » disparaît avec la relance auto ; « Encaisser » réservé au Carnet |
| Lancer un atelier | Lancer, Relancer | **Lancer** | |
| Groupe d'amis | Compagnie, guilde, associés | **la Compagnie**, **associés** | « guilde » retiré |
| Lieux fermés | Hors zone, Niv. 4, Parcelle fermée, Casa 9, cadenas 3D | **Fermé · Fondaco niv. N** | Un seul signe : le cadenas en pilule |
| Monnaies | ducats, d, deniers, Faveur, Sceaux, perle | **ducats** (pièce + nombre entier), Faveur, Sceaux, perle | Jamais de décimales à l'écran (« 90,11 d », « 10,52 d ») ; « d » ambigu avec deniers |
| Ton du jeu | vous / tu | **tu** partout | Lorenzo compris |
| Le guide | Lorenzo, facteur, Conseil | **Lorenzo** | « Embaucher un facteur » à renommer (confusion) |

À masquer tant qu'ils ne servent pas (R2, R3, R4) : Puissance, Bande, Héritage, Génération, Traits de lignée (Mercanti…), Sceaux, « ordres à cours limité », « anneau », Terraferme/Campo/partie rapide avant la Casa 4.

### 4.2 Lisibilité de la carte et navigation

| ID | Problème | Testeurs | Correction | Effort |
|---|---|---|---|---|
| P1-01 | Grammaire des cases : libre à soi, achetable, fermée se ressemblent ; trois signes pour « fermé » ; « Voir la case » inutile | 4 (R1 d4, R2 B11, R4 1.6, R5) | Pastille rouge « + » = libre à soi ; « + » gravé et prix = achetable ; cadenas pilule = fermé ; retirer le cadenas 3D | S |
| P1-02 | Routes absentes hors trajet ; ruban rouge qui promet un flux qui n'existe pas | 3 (R1 f1, R4 1.7, R5) | Route fixe atelier → Fondaco → villes de la zone ; chevrons seulement en trajet | M |
| P1-03 | Fiche hors écran, sans ancre, qui bouge pendant la caméra ; caméra qui erre ; pas de « recentrer » ; carte sortable dans le vide | 4 (R1 B6, R2 B21, R4 1.10-1.12, R5 B12) | Centrer le lieu dans la zone utile, fiche ouverte à la fin du glissement avec un bec vers le repère, bouton « Revenir au Fondaco », carte bornée | M |
| P1-04 | Panneau de gauche à 30 % de l'écran PC, translucide (bâtiments fantômes) | 4 (R1, R3 B9, R4 1.5, R5) | Hauteur du contenu, opaque, repliable | S |
| P1-05 | Intérieur d'atelier = piège : Échap, retour Android et onglets ne le ferment pas ; fiche de carte par-dessus | 3 (R1 B14/B22, R4 6.4, R2) | Un onglet ferme toute scène plein écran ; Échap/retour ferment ; fil d'Ariane | S |
| P1-06 | Porta verrouillée muette | 2 (R4 7.1, R2) | Montrer la Porta fermée en biscuit avec « S'ouvre au Fondaco niv. 4 · encore 3 niveaux » : le meilleur teaser du jeu | S |
| P1-07 | Listes qui se réordonnent sous le doigt (catalogue, Marché) ; construction sans confirmation mais double confirmation pour une case | 1 (R2 B7/B8, e) | Ordre stable ; règle unique : une confirmation pour toute dépense > 10 % de la caisse, ou annulation 5 s | S |
| P1-08 | Badges incohérents (« 1 », « ! », « ×1 », médaillon « 1 ») | 2 (R2 B17, R4 1.13, 3.3, 8.3) | Badge rond rouge chiffré = chose à faire, uniquement ; médaillon « niv. 1 » | S |
| P1-09 | Directions superposées : violet, moutarde, or, fiches noires contre feuilles blanches, ancien dock à tuiles, cinq palettes au profil | 4 (R1 e, R2 e, R4 c/9.2, R5 B13) | Un seul accent rouge ; sélection à l'encre ; ancien dock repassé en « fiche puis dock à une décision » ; palettes retirées sauf Porcellana (Q6) | M |
| P1-10 | Cibles tactiles 28 px ; info-bulles coupées ; heures absolues sans fuseau | 2 (R2 e/B9/B20, R4 d) | 44 px de zone de toucher ; info-bulles en feuille ; comptes à rebours partout | S |
| P1-11 | Nom proposé avec tirets bas | 2 (R4 0.4, R5) | Espaces à l'affichage | S |

### 4.3 Chiffres de décision et économie lisible

| ID | Problème | Testeurs | Correction | Effort |
|---|---|---|---|---|
| P1-12 | « Casa 2 » grisé sans dire pourquoi ; coût complet invisible | 3 (R1 B2, R2 5:00, R3) | Partout : ducats + matériaux + durée + ce qui manque (« manque 5 briques ») | S |
| P1-13 | Amélioration de poste, embauche, déplacement sans gain chiffré ; « +60 % » gratuit à la pose ; « Goulot » sur le mauvais poste | 3 (R1 B21/B23, R4 6.2/6.5) | Prévision « 36 → 41/h » avant achat ; gain affiché seulement après un geste ; goulot = vrai minimum (vérifier le calcul, `R1 B21`) | M |
| P1-14 | Unités : « 11 Bois » sans durée ; débit affiché à l'arrêt | 3 (R1 B20, R2, R4 2.2) | « 11 bois / 18 min (≈ 36/h) » partout | S |
| P1-15 | Salaires prélevés sans être dits (« +96 » pour 100) | 4 (R3, R4 1.9, R5 B6, R6 QA-12) | Fiche de commande : « 100 d − 4 d de salaires = 96 d » ; même règle au Marché (taxe) | S |
| P1-16 | Prix d'atelier qui change (rattrapage invisible et dépendant de la population) | 3 (R1 B13, R2 B7, R3 B7/D6) | Afficher « −60 % : le savoir circule » ; plancher de population pour le calcul (Q4) | S |
| P1-17 | Revenu du jour faux (« 100 d par jour » après une commande ; gonflé par les allers-retours) | 3 (R2, R3 B6, R6 QA-20) | Revenu net moyen sur 24 h glissantes, montré quand il a du sens | S |
| P1-18 | Écran Casa 2 qui ment (« une place de plus pour vos chantiers ») | 1 (R1 B18) | Rappeler exactement ce qui est gagné | S |

### 4.4 Économie : failles et cohérence

| ID | Problème | Testeurs | Correction | Effort |
|---|---|---|---|---|
| P1-19 | La Casa et la Porta s'achètent au Marché (briques, planches, pain à 10 d) : la chaîne que le guide impose devient facultative | 4 (R2, R3 D3, R5, R6 c6) | Décision (Q2) : soit l'achat est un raccourci assumé et le guide le propose (bon pour J1), soit le Marché ne vend pas les matériaux de Fondaco | S |
| P1-20 | Arbitrages sans risque : bonus nouveaux venus +20 % sur des bruts rachetés ; commandes servies depuis le Marché (+12 %) ; Carnet rempli par allers-retours | 2 (R1 d6, R6 c2/c3/c5) | Bonus et Carnet seulement sur ce qui est produit (marquer l'origine au journal des stocks, ou ne compter que les ventes de biens fabriqués) | M |
| P1-21 | Profondeur du Marché commune et remise à zéro chaque jour : le premier joueur UTC vide la région ; un joueur peut fermer la vente d'un bien à tous | 2 (R3 D4, R6 c4) | Profondeur par maison (ou fenêtre glissante par maison) : supprime la nuisance entre joueurs (esprit de la règle 1) | M |
| P1-22 | Recettes qui ne s'emboîtent pas ; 30 s puis 30 min sans transition | 3 (R1 d5, R2 E2/E3, R5) | Carrière 10 → briqueterie 10 ; camp 12 → scierie 10 + briqueterie 2 ; premiers lots de chaque atelier en courbe (30 s, 2, 5, 15 min) | S + simulateur |
| P1-23 | Mur de la Casa 4 (×12) qui ouvre trois systèmes d'un coup | 2 (R3 D7, R1) | Lisser 3 → 4 → 5 ; ouvrir une Porta solo de découverte au niveau 3 ; étaler les ouvertures (Q5) | M + simulateur |

### 4.5 Géographie et échelle

Relevé par 3 testeurs (R1 d3, R5 d, R4 1.3). Vérifié : Venise `11,8`, Bologne `10,13` (Romagne, couverte par le cercle de portée au niveau 1 alors que sa case demande la Casa 9), Ancône `12,13` (`packages/engine/src/themes/venice1450.squares.ts:189,196,218`).

- **Incohérences** : Venise sans lagune ; le Fondaco « près de Venise » à trois cases au sud ; on sert Bologne et Ancône avant Venise et Trévise ; Vérone au sud de Venise ; un campanile de San Marco sur la case de Trévise ; une case vaut ~75 km mais porte trois sapins ; Ancône et Bologne « couvertes » mais invisibles.
- **Correction minimale (P1-24, M)** : la zone suit les cases (en cours ailleurs pour la livraison) ; ordre d'ouverture Venise → Padoue/Trévise → Vérone → Bologne/Ancône ; une ville couverte est toujours visible et nommée ; lagune et rive autour de San Marco ; campanile réservé au Marché.
- **Décision de fond (Q7)** : l'échelle. Deux options : (a) un **domaine** à l'échelle de l'îlot (case = 100 m) et une **carte du commerce** séparée où les villes sont des icônes (Anno, Pharaoh), on zoome de l'une à l'autre ; (b) assumer une carte stylisée « plateau de jeu » (case = une étape de route), et l'écrire dans l'aide. L'option (a) sert mieux « voir une ville s'animer » ; elle est plus chère.

---

## 5. P2 : profondeur de gestion

Le joueur de gestion (R1) et l'expert (R3) convergent : la profondeur existe dans le moteur (intérieur, voisinage, qualités, file de 12 h) mais le joueur n'a **ni flux, ni priorités, ni tableau, ni prévisions**. Proposition : un seul système nouveau, **le Flux**, qui absorbe Récolter, Relancer, Tout relancer et le ruban rouge.

| ID | Proposition | Testeurs | Référence | Effort |
|---|---|---|---|---|
| P2-01 | **Le Flux** : les lots rejoignent l'Entrepôt seuls, en caisses visibles sur la route ; un atelier aval tire ses intrants au fil de sa file ; à plein, les caisses s'empilent devant l'atelier (règle 3 visible). « Récolter » ne reste que comme geste-récompense facultatif (toucher l'anneau sur la carte) | 5 (R1 f1/g3-4, R3 D5, R4 6.7, R5 f4, R2) | Anno 1800 (routes et charrettes), Factorio (convoyeurs), Township (ramassage d'un tap) | L |
| P2-02 | **Priorités d'intrants** par atelier (haute, normale, basse) et **réserve minimale** par marchandise (« garder 20 bois ») ; le Marché avertit avant de vendre une réserve | 3 (R1 f2, R2 E4, R3) | Patrician (min/max de stock par comptoir), Anno (dépôt) | M |
| P2-03 | **Écran Économie de l'Entrepôt** : par marchandise, produit/h, consommé/h, net/h, stock/plafond, temps avant plein, prochaines commandes, marge par recette. Visuel d'abord (barres sur les caisses), chiffre ensuite | 3 (R1 f3/g6, R2 g4, R4 3.1) | Anno 1800 (statistiques, besoins intégrés au patch 6.0) | M |
| P2-04 | **Carnet de commandes prévisible** : prochaine commande de chaque ville (quoi, combien, quand) sur le repère ; caisse au quai quand le stock la couvre | 3 (R1 f5, R3, R4 5.4) | Hay Day (tableau de commandes et camion), Hades' Star (cargaisons visibles sur chaque planète) | M |
| P2-05 | **Prochains paliers** (promis au CADRAGE § 4.1) : trois objectifs visibles sur trois axes, avec barre et temps estimé, à la place du panneau de gauche vide | 4 (R1 f6, R2 f, R3 #11, R4) | Township (niveau toutes les 5–15 min au début) | M |
| P2-06 | **Ouvriers lisibles** : fatigue et usure sur le pion et le poste, équipe de nuit = heures en plus, effet chiffré | 2 (R1 f8, R4 6.5) | Banished, Manor Lords (habitants qui ont un rôle) | M |
| P2-07 | **Historique des prix** et impact de ses propres ventes au Marché | 1 (R1 f7) | Patrician (prix par ville), Port Royale | S |
| P2-08 | **Voisinage visible** : bonus montré en fantôme à la pose (catalogue en tiroir visuel) ; quartiers nommés quand des ateliers se groupent | 3 (R4 2.1, R5 f14, R2) | Islanders (score de placement montré avant la pose) | M |
| P2-09 | **Notifications PWA** par type (lot prêt, commande arrivée, chantier fini, Entrepôt plein) | 2 (R2 f, R3 #13) | Hades' Star, Hay Day | S |

À ne pas faire maintenant (garde-fou « douzaine de systèmes ») : routes commerciales automatisées entre régions façon Patrician (les reviews de Patrician IV et Port Royale 4 montrent que l'automatisation mal outillée devient elle-même une corvée).

---

## 6. P3 : « la ville vit »

R5 note 2/10 ; R1, R3, R4 le demandent aussi. Principe : **chaque animation dit un état du jeu** (règle 8), aucune n'est décorative seule, toutes coupées en « moins d'animations ».

| ID | Proposition | État du jeu montré | Testeurs | Effort |
|---|---|---|---|---|
| P3-01 | **Chaque trajet se voit** : mule ou charrette avec sa caisse rouge, suivie par la caméra au premier trajet, pièces qui volent vers la bourse à l'arrivée, compteur qui roule | livraison, paiement | 5 (R2 B18, R3, R4 1.8/1.9, R5 B1, R1) | M |
| P3-02 | **Signatures d'atelier** : fumée (briqueterie, verrerie), roue (moulin), scie, hache ; fumée grise ou arrêt quand il manque un intrant ; caisses empilées quand c'est plein | marche, manque, plein | 3 (R5 f7, R4 6.1, R1) | M |
| P3-03 | **Habitants proportionnels au niveau du Fondaco** : maisons à cheminées en entonnoir, passants, marché du matin sur le campo ; porteurs entre ateliers et Entrepôt | progression | 2 (R5 f6, R3 e) | L |
| P3-04 | **L'eau vit** : lagune, rive, barques et gondoles amarrées, reflets ; une barque sur le Brenta pour un trajet par eau | géographie, trajets | 1 (R5 e5) | M |
| P3-05 | **Jour et nuit à l'heure du joueur** : lanternes le soir (et une « Porcellana de nuit » pour l'écran du soir sur téléphone) | temps réel, file de 12 h | 2 (R5 f10, R4 d3) | M |
| P3-06 | **Bâtir se voit** : la case se soulève, échafaudage, poussière ; fête de palier (le Fondaco prend un étage, ce que ça ouvre en images) | construction, niveau | 3 (R2 1:40/f, R4 2.4, R3 e) | S à M |
| P3-07 | **Les villes réagissent** : chantier à Padoue après des briques, blason qui grandit avec la fidélité | effet des livraisons | 1 (R5 f11) | M |
| P3-08 | **Le Marché en scène** sur la place San Marco : étals, une caisse par marchandise (taille = stock, couleur = au-dessus/au-dessous du cours), « Vendre » en rouge | marché | 4 (R3 D10, R4 4.1, R5, R2) | L |
| P3-09 | **Intérieurs selon le métier** : clairière pour le camp, fosse et four pour la briqueterie, *fornace* pour Murano ; postes explicites ; billes qui passent d'un poste à l'autre | flux interne | 3 (R4 6.1, R5 d/f12, R1 B16) | L |
| P3-10 | **Sons** liés aux états : cloches à l'heure, scie, four, ressac, pièces | tout | 2 (R5 f16, R3) | M |
| P3-11 | **Événements visibles** du chapitre : galère qui arrive (prix qui bougent), acqua alta, fête (Sensa, Carnaval, Redentore) | calendrier | 1 (R5 f15) ; CADRAGE § 4.3 | M (après le reste) |

---

## 7. Nouvelles idées (testeurs et benchmark)

Chaque idée est reliée à une règle d'or et à un jeu de référence. Celles hors du chemin de CADRAGE-v3 § 13 vont dans `IDEAS.md` tant que le porteur ne les a pas retenues.

| # | Idée | Règle d'or | Référence | Origine |
|---|---|---|---|---|
| I1 | **Écran « Pendant ton absence »** : lots récoltés, livraisons payées, commandes arrivées, un gros « Tout récolter » | 3, 7 | Idle games (Pecorella, GDC 2016 : chaque retour est un moment de fête) | R2, R3 |
| I2 | **Commandes d'apprentissage** puis cadence de démarrage, toujours sur ce que le joueur fabrique | 7 | Hay Day (plus de commandes de camion en début de partie, mise à jour 2025), Township (boucle commande → terrain) | R1, R2, R3, R5 |
| I3 | **Le Flux** (caisses sur les routes, tirage continu) | 3, 8 | Anno 1800, Factorio | R1, R3, R5 |
| I4 | **Porta de découverte au niveau 3** (palier 1 solo, 10 min) | 2, 5, 7 | Hades' Star (étoiles rouges ouvertes tôt, 10–15 min, scanner qui borne l'Influence) | R3 |
| I5 | **Embellissements gagnés en jouant** (puits, statues, ponts, gondoles), sans effet de puissance ; usage naturel des Sceaux | 4, 8 | Islanders, Townscaper, Dorfromantik | R5 |
| I6 | **Chaînes géographiques historiques** : bois du Cadore en *zattere* sur la Piave, sel de Chioggia, soude d'Alexandrie pour Murano, Arsenal (chanvre, poix) | 8 | Patrician (chaque ville a ses productions et pénuries) | R5 |
| I7 | **Domaine et carte du commerce** sur deux zooms | 8 | Anno, Pharaoh | R5 |
| I8 | **Vitrine de la promesse** : façade du palais qui prend des étages, galerie des Maisons de sa bande | 1, 6, 8 | Hades' Star (étoile privée qu'on montre), Township | R3 |
| I9 | **Quartiers (*sestieri*)** nommés quand des ateliers se groupent, bonus de voisinage montré en bannière | 8 | Islanders (bonus d'adjacence lisible) | R5 |
| I10 | **Fêtes du chapitre** visibles sur la carte, avec objectif commun à paliers | 7, 8 | Township (événements), CADRAGE § 4.3 | R5 |
| I11 | **Abonnement d'information** (historique des prix, tableau étendu) : seul modèle d'achat qui ne heurte pas la règle 4, avec les perle | 4 | Pocket City (pas d'achat qui fasse gagner, très bien reçu) ; contre-exemple Forge of Empires, Anno Online | R3 |
| I12 | **Réglage de qualité 3D** et repli 2D pour mobile d'entrée de gamme | 7 | Hades' Star (2D légère sur tout mobile) | R3 B11 |

Garde-fous tirés du benchmark : ne jamais vendre la vitesse au point de créer un mur (plainte n° 1 de Forge of Empires et Township) ; ne jamais exiger d'être présent à heure fixe (plaintes de Travian sur les attaques de nuit, « trêve de nuit » ajoutée) ; ne jamais refondre la progression des joueurs installés (la bascule vers Dark Nebula a vidé les corporations de Hades' Star).

---

## 8. Benchmark

*Méthode : 25 recherches web. Limite : la récupération directe de Steam Community et de Deconstructor of Fun est bloquée dans cette session (réseau) ; les constats viennent des extraits de recherche, de la presse et des blogs officiels. Les agrégateurs automatiques (vaporlens, marlvel, gamebrain) sont pris comme signaux faibles.*

### Hades' Star (modèle explicite)
- **Ce qu'on aime** : jouer « aussi peu ou autant qu'on veut », personne ne vole rien hors ligne ; étoiles rouges courtes (10–15 min) et coopératives ; cargaisons générées par chaque planète, qu'on transporte pour des crédits.
- **Ce qui fait partir** : la bascule forcée vers Dark Nebula (« le ressenti n'était plus le même », corporations vidées), un développeur jugé sourd aux retours, des plaintes de répétition ; la coordination en temps réel des hauts niveaux.
- **Pour Fondaco** : ouvrir le PvE court tôt (la Porta au niveau 4 est tard) ; les cargaisons « visibles sur chaque planète » = commandes visibles sur chaque ville ; Dark Nebula a rendu les cargaisons facultatives au début pour corriger une progression lente : le désert des 2 h est exactement ce problème ; ne jamais refondre la progression des joueurs installés (règle 1 et « règles stables »).
- Sources : https://lemmy.toldi.eu/post/1497859 ; https://feddit.it/post/13730491/10994226 ; https://blog.hadesstar.com/2023/10/dark-nebula-upgrade-guide.html ; https://blog.hadesstar.com/2023/03/red-star-changes-in-dark-nebula.html ; https://hades-star.fandom.com/wiki/White_Stars ; https://apps.apple.com/au/app/hades-star/id1058502954 ; https://mmohuts.com/?p=147325 ; https://primagames.com/eguides/mobile-gaming-eguide-tips-tricks-and-strategies-for-todays-hottest-mobile-games/hades-star/profit-driven-galactic-exploration

### Patrician III / IV
- **Aime** : « le monde semble vivant », chaque ville a ses chaînes, pénuries et besoins ; les convois comme « artères commerciales » ; profondeur dans un paquet simple.
- **Part** : automatisation des routes mal faite (certains reviennent de IV à III), impossible de voir toutes ses routes d'un coup, début lent et répétitif.
- **Pour Fondaco** : des villes aux besoins propres et visibles ; un écran qui montre tous les trajets ; outiller l'automatisation avant de l'imposer.
- Sources : https://www.gog.com/en/game/patrician_3?page=4 ; https://www.wasdland.com/game/patrician-iii-33570/ ; https://worthplaying.com/article/2010/11/15/reviews/78213-pc-review-patrician-iv-conquest-by-trade/ ; https://www.cgmagonline.com/review/game/patrician-iv/ ; https://www.gog.com/game/patrician_iv ; https://www.pcgamer.com/patrician-iv-review

### Rise of Venice et Port Royale 4 (même éditeur, même genre)
- **Aime** : le commerce lui-même, les visuels.
- **Part** : attente des navires, campagne « trop guidée, boguée, ennuyeuse » (Rise of Venice : avis mitigés, Metascore 66) ; Port Royale 4 : interface peu intuitive, panneau des ressources séparé des routes, automatisation qui demande elle-même du travail fastidieux (OpenCritic 6,9, 40 % recommandent).
- **Pour Fondaco** : même thème vénitien, même piège. L'attente doit être remplie de décisions ; stock, flux et routes sur un même écran.
- Sources : https://store.steampowered.com/app/227020 ; https://legacy.prod.metacritic.com/game/pc/rise-of-venice/user-reviews ; https://www.gamepressure.com/editorials/reviews/what-do-we-do-with-the-drunken-gameplay-port-royale-4-review/z5320 ; https://gamingtrend.com/reviews/a-few-barnacles-on-the-hull-port-royale-4-review/ ; https://opencritic.com/game/9443/view/reviews

### Anno 1800 et Anno mobile
- **Aime** : l'écran de statistiques (production contre consommation, calculateur de besoins intégré au patch 6.0), les besoins de la population qui pilotent tout, des chaînes qui s'emmêlent en puzzles logistiques ; la vue à la première personne cachée, appréciée pour l'immersion.
- **Part** : Anno Online et les déclinaisons mobiles, jugées « Anno de nom seulement » et pay-to-win (44 % d'avis positifs pour Anno Online).
- **Pour Fondaco** : l'écran Économie (P2-03) est l'outil central du genre ; la demande des villes doit être visible ; ne jamais monétiser la progression.
- Sources : https://anno1800.fandom.com/wiki/Statistics ; https://www.pcgamer.com/anno-1800-tips-guide/ ; https://www.gamespot.com/reviews/anno-1800-review-hidden-figures/1900-6417131/ ; https://www.pcgameshardware.de/Anno-1800-Spiel-61247/News/Geheimer-First-Person-Modus-per-Tastenkombination-aktivierbar-1279979/ ; https://gamebrain.co/game/anno-online ; https://www.metacritic.com/game/anno-online/

### Hay Day et Township
- **Aime** : boucle planter → récolter → transformer → commandes (tableau, camion, bateau) ; aucun tutoriel forcé ni punition (Township : pas de culture qui flétrit) ; Supercell a ajouté **plus de commandes de camion et plus de champs tôt** pour lisser le début (2025).
- **Part** : murs de paiement, événements chers, énergie, monétisation agressive (Township).
- **Pour Fondaco** : toujours une commande à livrer au début ; récompense du ramassage (icônes qui volent) ; zéro punition ; garder la règle 4 comme différence affichée.
- Sources : https://apps.apple.com/PK/app/id506627515 ; https://gamedeveloper.com/business/game-monetization-design-analysis-of-hay-day ; https://www.blog.udonis.co/mobile-marketing/mobile-games/hay-day-monetization ; https://www.gcores.com/articles/180641 ; https://redlib.belloworld.it/r/TownshipGame/comments/1eu96lx/expensive_event ; https://www.commonsensemedia.org/app-reviews/township-farm-city-building/user-reviews/adult

### Pocket City (1 et 2)
- **Aime** : achat unique, aucun achat intégré, tout se débloque en jouant.
- **Part** : moins profond que ses modèles, meilleur par courtes sessions.
- **Pour Fondaco** : la promesse « rien à acheter qui fasse gagner » est un argument de vente en soi, à écrire sur l'accueil (en version v3).
- Sources : https://www.148apps.com/reviews/pocket-city-review ; https://destructoid.com/?p=227371 ; https://apps.apple.com/gb/app/pocket-city-2/id1533709428 ; https://toucharcade.com/2023/04/14/toucharcade-game-of-the-week-pocket-city-2/

### Banished
- **Aime** : des habitants qui sont « de vraies vies qui gèlent et ont faim », l'hiver dur mais juste.
- **Part** : fin de partie plate une fois la ville autosuffisante ; villageois jugés bêtes.
- **Pour Fondaco** : la tension doit venir d'objectifs et d'événements (Porta, fêtes, ères), pas d'une menace sur le bâti (règle 1) ; prévoir le milieu de partie dès maintenant.
- Sources : https://thegamefanatics.com/banished-review-starts-bang-ends-whimper/ ; https://eip.gg/reviews/banished-review/ ; https://bit-tech.net/reviews/gaming/pc/banished-review/1/ ; https://vaporlens.app/app/242920/banished

### Factorio
- **Aime** : la montée progressive (une mine, un convoyeur, une fonderie), des problèmes neufs à résoudre sans fin, le perfectionnisme (« il n'y a pas de parfait, on y revient »).
- **Pour Fondaco** : la satisfaction vient de *voir* le flux et d'optimiser un goulot lisible ; l'intérieur d'atelier est sur cette voie mais le goulot désigné est faux (R1 B21) et rien ne relie deux ateliers.
- Sources : https://lemmy.4d2.org/post/49344 ; https://players.com.ua/en/news/6-years-of-factorio-how-an-engineer-simulator-turned-into-a-digital-drug-for-perfectionists/ ; https://notes.hamatti.org/Gaming/Video-games/Reviews/Factorio ; https://hn.jakechampion.name/item/27446910

### Islanders, Townscaper, Dorfromantik
- **Aime** : calme, pas de pression ; Islanders : score de placement par voisinage, « très satisfaisant de voir les points tomber » ; Dorfromantik ajoute des objectifs à Townscaper, qui manque de but.
- **Part** : répétition après quelques heures (Islanders).
- **Pour Fondaco** : montrer le bonus de voisinage *avant* la pose ; embellir sans puissance ; un but toujours visible.
- Sources : https://vaporlens.app/app/1046030/islanders ; https://checkpointgaming.net/reviews/2025/07/islanders-new-shores-review-a-whole-new-world/ ; https://boingboing.net/2022/04/29/dorfromantik-a-gorgeous-relaxing-village-building-game.html ; https://www.ixbt.com/live/comments/2023995 ; https://nodal.gg/game/townscaper-1291340

### Travian et Forge of Empires (persistants)
- **Aime** : planification longue, interaction entre joueurs, files de construction.
- **Part** : Travian exige d'être présent (attaques à 3–5 h du matin, d'où la trêve de nuit) ; trop peu à faire pour un nouveau. Forge of Empires : pay-to-win, minuteurs longs, développeur jugé sourd, multi-comptes.
- **Pour Fondaco** : les règles 1, 2, 4 et 7 sont exactement les remèdes ; les tenir à la lettre et le dire ; occuper le nouveau dès la première heure.
- Sources : https://support.travian.com/support/solutions/articles/7000071800-weekend-warrior-game-mechanics ; https://www.romanarmytalk.com/rat/printthread.php?tid=8542 ; https://mmoreviews.com/?p=56387 ; https://www.mmobomb.com/review/forge-of-empires ; https://legacy.prod.metacritic.com/game/pc/forge-of-empires/user-reviews ; https://uk.trustpilot.com/review/forgeofempires.com

### Idle tycoons et « Merchant »
- **Aime** : la progression hors ligne calculée comme en ligne, le retour comme un moment de fête (Pecorella, GDC 2015 et 2016).
- **Part** : grind de fin de partie, manque de confort (répétition automatique).
- **Pour Fondaco** : écran de retour (I1) ; automatiser la corvée (Flux), garder la décision.
- Sources : https://www.gamedeveloper.com/design/the-rise-of-games-you-mostly-don-t-play ; https://pt.slideshare.net/AnthonyPecorella/idle-chatter-gdc-2016-59734260 ; https://gdcvault.com/play/1023208/Idle-Chatter-What-We-Can ; https://www.gameanalytics.com/blog/how-to-keep-players-engaged-and-coming-back-to-your-idle-game ; https://gamebrain.co/game/merchant

### Manor Lords
- **Aime** : des villes « habitées plutôt qu'optimisées », des familles avec un rôle, une économie intuitive.
- **Part** : systèmes de long terme minces, efficacité qui l'emporte sur l'esthétique.
- **Pour Fondaco** : les habitants et porteurs doivent porter de l'information (qui travaille, qui transporte) ; éviter les systèmes « posés » sans profondeur (garde-fou de la douzaine).
- Sources : https://www.videogamer.com/reviews/manor-lords-review/ ; https://www.altchar.com/reviews/manor-lords-early-access-review-an-incredible-achievement-a5Ko05s6TRCT ; https://strategyandwargaming.com/2024/04/27/manor-lords-review-the-best-medieval-game-of-all-time

### Bonnes pratiques de première session (FTUE)
- La plupart des joueurs ne reviennent pas après la session 1 ; montrer le meilleur tout de suite ; apprendre en jouant ; donner une raison de revenir (objectif suivant) ; pécher par facilité ; J1 visé ≈ 40–45 %.
- Sources : https://unity.com/how-to/improve-retention-every-stage-player-lifecycle ; https://www.pocketgamer.biz/pgc-digital-how-to-enhance-the-first-time-user-experience ; https://create.roblox.com/docs/production/game-design/onboarding ; https://gamedeveloper.com/design/best-practices-for-a-successful-ftue-first-time-user-experience-

---

## 9. Feuille de route proposée

Chaque lot = un plan validé par le porteur avant le code, des tests d'abord pour le moteur, le simulateur de 24 mois pour tout changement d'équilibrage (`docs/calibration.md`), de petits commits. Les idées hors chemin vont dans `IDEAS.md`.

**Cible : une douzaine de systèmes visibles.** Carte (cases, routes, villes) · Fondaco et Entrepôt · Ateliers (intérieur) · Flux · Commandes des villes · Marché de San Marco · Remise et véhicules · Porta · Carnet et Prochains paliers · Compagnie · Terraferme · Lorenzo. Absorbés : Récolter/Relancer/Tout relancer (→ Flux), modules d'atelier et maître (→ intérieur, déjà décidé), Dogana du profil (→ Marché), Puissance/Bande/Héritage (cachés jusqu'à usage).

| Lot | Contenu | Durée indicative | Sortie |
|---|---|---|---|
| **0. Durcir** | P0-01, P0-02, P0-03, P0-09, P0-11 ; tests de clés réservées, plafond à l'achat, arrivée passée, lot `once` | 2–3 j | Aucune requête ne casse le serveur ; règle 3 tenue au Marché |
| **1. Correctifs rapides** | P0-04 (textes, `{cash}`, test sans accolade), P0-08 (nuit : retirer ou corriger), P1-04, P1-07, P1-08, P1-10, P1-11, P1-15, P1-18 ; tutoiement ; violet et moutarde retirés | 3–4 j | Premier écran juste, aucun texte du monde mensuel |
| **2. Les deux premières heures** (plan « premiers pas, suite ») | P0-05 (créneau brûlé + commandes d'apprentissage), P0-06 (Lorenzo jusqu'à la Porta), P1-12, P1-22 (recettes emboîtées, courbe des premiers lots), I1 (écran de retour), P2-05 (Prochains paliers), P1-19 (décision matériaux) | 1,5–2 sem. + simulateur | Toujours quelque chose à faire pendant 2 h ; guide sans trou |
| **3. La carte qui parle et le glossaire** | P0-12, P1-01, P1-02, P1-03, P1-05, P1-06, P1-09, glossaire appliqué (§ 4.1), Entrepôt (fiche du Fondaco), Marché à une seule entrée, P1-24 (ordre d'ouverture des villes, lagune minimale) | 2 sem. | Un nouveau sait où il est, où est son stock, où vendre |
| **4. Le Flux** (nouveau système qui absorbe la récolte) | P0-07, P2-01, P2-02, P2-03, P2-04, P3-01, P3-02 | 3 sem. + simulateur | Une chaîne posée coule seule et se voit |
| **5. Méta et monétisation** | P0-10 (Faveur, Sceaux), perle minimales (solde au grand livre, accélération, gain au Carnet) ou décision de publier sans, P1-23 (lisser Casa 3–5, Porta de découverte), P1-20, P1-21, P1-16, P2-09 (notifications) | 2–3 sem. + simulateur | Le Carnet paie ; un objectif à moins de 24 h toujours visible |
| **6. La ville vit** | P3-03 à P3-10, P3-06 (fête de palier), I5 (embellissements), réglage de qualité 3D (I12) | 3–4 sem. | « La ville vit-elle ? » ≥ 6/10 au retest |
| **7. L'échelle** (si Q7 = deux cartes) | Domaine et carte du commerce, lagune complète, chaînes géographiques (I6) | à chiffrer après décision | — |

Avant d'allumer l'intérieur des ateliers en production : recalibrer (×3 mesuré, R6) et corriger goulot, nuit, postes explicites (R1 B21, R4 6.1).

### Critères « prêt à publier » (bêta publique)

1. **Sécurité** : zéro 500 provoquable par une saisie de joueur (fuzz des commandes `empire*` avec clés réservées, NaN, très grands nombres) ; invariant grand livre et stocks `ok` après fuzz.
2. **Règles d'or** : aucun stock au-dessus du plafond par aucun chemin (achat, livraison, accueil, intérieur) ; aucun effet d'un joueur sur un autre hors Terraferme/Contesa (profondeur de Marché par maison) ; rien de vendu qui ne soit du temps.
3. **Textes** : zéro accolade, zéro mot du monde mensuel, glossaire appliqué (vérifié par un test sur `i18n.ts`), un seul registre.
4. **Première session** (test avec 5 joueurs neufs, PC et téléphone) : première livraison < 3 min ; **au moins une décision et une commande disponibles toutes les 15 min pendant 2 h** ; Casa 3 atteinte en < 45 min ; aucun joueur bloqué sans savoir quoi faire.
5. **Retour** : à chaque réouverture, un résumé et au moins une action utile ; livraison échue toujours réglée.
6. **Simulateur de 24 mois** (toutes les graines) : objectif à moins de 24 h pour le joueur médian « toujours » (§ 13) ; prochain palier en 2 à 7 jours de revenu ; ratio puits/sources dans la cible.
7. **Lisibilité** : noms des villes et du Marché visibles ; zones tactiles ≥ 44 px ; contraste ≥ 4,5:1.
8. **Performance** : 30 i/s sur un Android d'entrée de gamme avec le réglage bas.
9. **Retest des six profils** : moyenne ≥ 6,5/10, aucun ≤ 5.

---

## 10. Questions ouvertes à trancher par le porteur

1. **Faveur et Sceaux** : leur donner un usage maintenant (accélération plafonnée en Faveur, plans et cosmétiques en Sceaux) ou les masquer jusqu'à leur système ?
2. **Le Marché vend-il les matériaux du Fondaco et le pain de la Porta ?** Raccourci assumé (proposé par Lorenzo) ou chaîne obligatoire ?
3. **Glossaire** (§ 4.1) : « Casa » disparaît-elle de l'écran au profit de « Fondaco niveau N » ? « Entrepôt » pour le stock ? Tutoiement partout ?
4. **Rattrapage « le savoir circule »** : plancher de population, ou prix d'atelier fixe au départ ?
5. **Courbe Casa 3 → 4 → 5** : lisser, et ouvrir une Porta solo de découverte au niveau 3 ?
6. **Palettes** : ne garder que Porcellana (et trois accents) ? Fiche d'encre noire (jeu actuel, design.md) ou carte de papier (plan-porcellana § 1) ?
7. **Échelle** : domaine + carte du commerce (deux zooms), ou plateau stylisé assumé ? Venise et sa lagune au centre ?
8. **Perle et modèle économique** : livrer un minimum avant la bêta, ou publier sans monétisation en l'assumant ?
9. **Récolte** : le Flux remplace-t-il le geste « Récolter » (gardé seulement comme bonus facultatif), au risque de perdre le geste Hay Day ?
10. **Intérieur des ateliers** : l'allumer à la publication (avec recalibrage) ou après ?
11. **Historicité** : retirer les anachronismes (miroirs en 1450), ranger le sel en production locale (Chioggia), confiner la verrerie à Murano ?
