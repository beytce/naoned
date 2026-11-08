# Plan de publication (7 novembre 2026)

Source : l'audit des joueurs du 7 novembre 2026 (`docs/audit-joueurs-2026-11-07/`, synthèse
`00-synthese-chef-de-projet.md`). Six testeurs, notes de 2 à 5 sur 10 : le jeu n'est pas publiable.
Ce plan reprend les lots 0 à 7 de la synthèse avec les décisions du porteur, et fixe les critères
de « prêt à publier ». Les identifiants (P0-01, P1-12, P2-03…) renvoient à la synthèse.

Déjà fait ailleurs (#103) : le plateau à 360° et les livraisons par les seules cases achetées.

## Décisions du porteur (7 novembre 2026)

| # | Question | Décision |
|---|---|---|
| D1 | Glossaire et ton | Glossaire de la synthèse § 4.1 **tel quel** : le Fondaco **niveau N** (plus de « Casa N » à l'écran), l'**Entrepôt** pour le stock, la **Remise** pour les seuls véhicules, le **Marché de San Marco** seul nom du marché, **Récolter**, **Lancer**, la **Compagnie**, les **ducats** sans décimales ; **« tu » partout**, Lorenzo compris. Puissance, Bande, Héritage, lignée, Terraferme masqués tant qu'ils ne servent pas. |
| D2 | Faveur et Sceaux | **Usage minimal** : la Faveur accélère un chantier, plafonnée (3 par jour, CADRAGE § 5.4) ; les Sceaux s'échangent contre des plans et des embellissements. |
| D3 | Perle | **Bêta sans perle**, assumée. Elles viendront après, une fois la boucle solide. |
| D4 | Règle d'or 3 | **« L'absence ne coûte rien » est retirée.** Nouvelle règle 3 : **« Rien ne s'accumule sans fin, et rien ne tourne sans toi. »** Stocks, production et commandes ont un plafond ; un atelier dont les lots sont prêts **s'arrête et attend ta récolte** (récolte manuelle obligatoire) : on ne perd rien de ce qui est fait, mais on ne gagne pas quand on ne joue pas. Les commandes n'expirent pas, rien ne pourrit dans un atelier, personne ne prend rien (règles 1 et 2 inchangées). |
| D5 | Matériaux au Marché | Le Marché vend briques, planches et pain, **nettement plus cher que les produire**, avec un stock du jour **par joueur**. |
| D6 | « Le savoir circule » | **Supprimé** : prix des ateliers fixes, lisibles. |
| D7 | Courbe du Fondaco | **Lisser** les niveaux 3 → 5 (simulateur de 24 mois) et ouvrir une **Porta de découverte** (solo, courte) au niveau 3 ; ouvertures étalées sur 3, 4, 5. |
| D8 | Échelle | **Plateau stylisé assumé** : une seule carte, Venise et sa lagune au centre, villes rapprochées, échelle non réaliste écrite dans l'aide. Pas de seconde carte. |
| D9 | Palettes | **Porcellana seule**, un seul accent rouge ; violet et moutarde retirés ; les autres palettes du profil retirées. |
| D10 | Intérieur des ateliers | **Allumé à la bêta, après recalibrage** (nuit, goulot, postes explicites ; il produit ×3 aujourd'hui). |
| D11 | Historicité | **Oui, au fil des lots** : noms et rangements au lot 1 ; chaînes géographiques (Murano et la soude, Chioggia et le sel, l'Arsenal, le bois du Cadore) au lot 7. |
| D12 | Méthode | Ce plan validé une fois, puis les lots **enchaînés sans arrêt** ; **une PR par lot** vers la branche par défaut ; arrêt seulement sur un doute réel. |

### Ce que D4 change

- **CADRAGE-v3 § 2 et CLAUDE.md** : la règle 3 est réécrite (lot 1). Les mentions « l'absence ne
  coûte rien » du cadrage (§ 4, commandes ; § 9, salaires) sont relues : les salaires restent
  « jamais pendant l'absence » (on ne paie pas quand on ne vend pas), les commandes restent
  plafonnées sans expirer.
- **Moteur** : aujourd'hui, « Récolter » remplit une file de 12 h (`queueHours`,
  `empire/settings.ts:204`) qui tourne pendant l'absence. Désormais, un atelier a une **réserve de
  lots prêts** (quelques lots, réglée dans `worlds.settings`) : il produit jusqu'à la remplir, puis
  s'arrête et l'anneau « prêt » l'annonce ; récolter vide la réserve vers l'Entrepôt et relance.
  La file courte se règle au simulateur (cible : un passage toutes les 2 à 4 h rapporte plein ; une
  nuit rapporte une réserve, pas douze heures).
- **Le Flux du lot 4 change de nature** : plus d'acheminement automatique. Il devient « des chaînes
  lisibles » : récolter fait partir des caisses visibles sur la route vers l'Entrepôt, un atelier
  aval lancé prend ses intrants selon des priorités, et « Tout récolter » existe en un geste.
- **Écran de retour** (I1) : il montre ce qui attend la récolte, ce qui a été livré, les commandes
  arrivées, et un gros « Tout récolter ».

## Les lots

Chaque lot : tests d'abord pour le moteur (fixture `test/fixture.ts`), simulateur de 24 mois
(toutes les graines) pour tout changement d'équilibrage avec une entrée dans `docs/calibration.md`,
petits commits, `pnpm test`, `pnpm typecheck`, `pnpm lint` verts, une PR à la fin. Les changements
de règles du commerce s'annoncent dans les notes du chapitre.

### Lot 0 — Durcir (sécurité, règle 3 au Marché, livraisons)

- P0-01 : liste blanche des biens, rôles et codes (enum tiré du thème dans les schémas zod) ;
  `Object.hasOwn` et inventaires sans prototype ; refus de `NaN` et des quantités non entières ;
  tests avec `__proto__`, `constructor`, `toString`, `valueOf`.
- P0-02 : achat au Marché borné par la place libre de l'Entrepôt et par le stock du jour ; prix
  intégré unité par unité ; refus clair « Entrepôt plein ».
- P0-03 : un trajet échu se règle à la lecture (`GET /api/empire`) et le client règle aussi au
  montage et au retour en ligne.
- P0-09 : le lot d'accueil (`once`) ne se recadence jamais.
- P0-11 : tout refus serveur a un code juste et un message ; « Relancer » sans effet → refus explicite.
- P1-21 et D5 : stock du jour du Marché **par maison**.
- **Sortie** : un fuzz des commandes `empire*` ne provoque aucun 500 ; aucun stock au-dessus du
  plafond par aucun chemin ; invariants du grand livre `ok`.

### Lot 1 — Correctifs rapides, glossaire, règle 3 écrite

- Règle d'or 3 réécrite (D4) dans CADRAGE-v3 § 2 et CLAUDE.md.
- P0-04 : accueil réécrit selon CADRAGE-v3 (persistant, personne ne pille, rien à acheter qui fasse
  gagner) ; `{cash}` ; « trois ateliers et cinq cents ducats » ; « bouton doré » ; « saison de
  novembre » ; restes du monde mensuel en mode empire. Test : aucune accolade dans un texte rendu,
  aucun mot du monde mensuel en mode empire.
- D1 : glossaire appliqué à tout `i18n.ts` (fr et en), tutoiement, nombres entiers à l'écran,
  masquage de Puissance, Bande, Héritage, lignée, Terraferme avant leur usage. Test du glossaire.
- D9 : Porcellana seule, violet et moutarde retirés, palettes du profil retirées.
- D6 : « le savoir circule » supprimé, prix des ateliers fixes.
- P0-08 : l'équipe de nuit ajoute des heures (somme bornée, pas moyenne).
- P1-04, P1-05, P1-07, P1-08, P1-10, P1-11, P1-12, P1-14, P1-15, P1-18 (panneau opaque et
  repliable, sortie de l'intérieur par Échap/retour/onglet, listes stables, badges, cibles de 44 px,
  coût complet et manque affichés, unités par durée, salaires dits, écrans qui disent vrai).
- D11, première part : anachronismes retirés (miroirs), sel rangé en production locale, noms.

### Lot 2 — Les deux premières heures

- P0-05 : le créneau de commande n'est plus brûlé à vide (`orders.ts:164-170`) ; commandes
  d'apprentissage (une par ville de la zone dans les 15 premières minutes), puis une toutes les 10
  à 15 min pendant 2 h, puis la croisière ; compte à rebours sur le repère de chaque ville.
- P0-06 : Lorenzo jusqu'à la Porta de découverte : la main sur la vraie cible, un bouton qui fait
  l'action et une phrase de « pourquoi » à chaque étape, ordre carrière → briqueterie, jamais
  d'impasse (acheter une case, acheter le manque au Marché) ; test des ordres de construction.
- D4 dans le moteur : réserve de lots prêts, arrêt à plein, « Tout récolter » ; I1, l'écran de retour.
- P1-22 : recettes qui s'emboîtent, premiers lots en courbe (30 s, 2, 5, 15 min).
- P2-05 : Prochains paliers (trois objectifs visibles, barre et temps estimé).
- D7 : courbe du Fondaco lissée, Porta de découverte au niveau 3, ouvertures étalées (P1-23).
- **Sortie** : au simulateur et au parcours e2e, une décision et une commande toutes les 15 min
  pendant 2 h ; niveau 3 en moins de 45 min.

### Lot 3 — La carte qui parle

- P0-12 : nom permanent de chaque ville et du Marché ; repères écartés, hors de la barre et du
  panneau ; « prêt » et « + » toujours visibles ; zones de 44 px.
- P1-01, P1-02, P1-03, P1-06, P1-09 : grammaire des cases (libre, achetable, fermée), routes fixes
  dessinées, fiche ancrée et caméra qui centre, bouton « Revenir au Fondaco », carte bornée, Porta
  fermée en biscuit avec ce qui l'ouvre, ancien dock repassé en fiche.
- D8 et P1-24 : plateau stylisé assumé ; Venise et sa lagune au centre, le Fondaco près du Rialto,
  ordre d'ouverture Venise → Padoue/Trévise → Vérone → Bologne/Ancône ; une ville couverte est
  toujours visible ; campanile réservé au Marché ; l'échelle dite dans l'aide.
- L'Entrepôt : fiche du Fondaco avec jauges par marchandise et plafond ; une seule entrée du Marché
  (le bâtiment San Marco).

### Lot 4 — Des chaînes lisibles (le Flux, version D4)

- P0-07 : un atelier lancé prend ses intrants selon des priorités (haute, normale, basse) et une
  réserve minimale par marchandise (P2-02) ; il ne vide plus le stock des autres.
- Récolter fait partir des caisses visibles vers l'Entrepôt (P3-01) ; signatures d'atelier selon
  l'état : marche, manque, plein et en attente de récolte (P3-02).
- P2-03 : écran Économie de l'Entrepôt (produit, consommé, net, temps avant plein, marge par recette),
  visuel d'abord.
- P2-04 : carnet de commandes prévisible sur chaque ville.
- P1-13 : prévisions chiffrées avant chaque amélioration ; goulot juste.
- D10 : intérieur recalibré (×3 ramené au simulateur), postes explicites, puis allumé.

### Lot 5 — Le méta-jeu

- D2 : Faveur (accélération plafonnée d'un chantier) et Sceaux (plans, embellissements).
- P1-20 : bonus et Carnet comptés seulement sur ce qui est produit.
- P1-16, P1-17 : revenu du jour juste (24 h glissantes).
- P2-09 : notifications PWA par type (lot prêt — plus important avec D4 —, commande, chantier,
  Entrepôt plein).
- D3 : pas de perle ; l'interface n'en parle pas.

### Lot 6 — La ville vit

- P3-01 à P3-10 : trajets suivis par la caméra au premier envoi, pièces qui volent, habitants selon
  le niveau du Fondaco, l'eau qui vit, jour et nuit à l'heure du joueur, bâtir qui se voit et fête
  de palier, villes qui réagissent, Marché en scène sur la place, intérieurs selon le métier, sons.
  Chaque animation dit un état ; toutes coupées en « moins d'animations ».
- I5 (embellissements, usage des Sceaux), I12 (réglage de qualité 3D pour mobile).

### Lot 7 — Les chaînes de Venise

- D11, seconde part : Murano et la soude, Chioggia et le sel, l'Arsenal, le bois du Cadore sur la
  Piave, chacun sur le plateau stylisé ; simulateur de 24 mois.

## Critères « prêt à publier » (bêta publique)

1. Aucun 500 provoquable par une saisie de joueur (fuzz) ; grand livre et stocks `ok` après fuzz.
2. Aucun stock au-dessus du plafond par aucun chemin ; aucun effet d'un joueur sur un autre hors
   Terraferme et Contesa ; rien à vendre (bêta sans perle).
3. Aucune accolade, aucun mot du monde mensuel, glossaire appliqué (test), « tu » partout.
4. Première session : première livraison en moins de 3 min ; une décision et une commande toutes les
   15 min pendant 2 h ; Fondaco niveau 3 en moins de 45 min ; personne bloqué.
5. À chaque retour : l'écran de retour et au moins une action utile ; livraison échue toujours réglée.
6. Simulateur de 24 mois (toutes les graines) : objectif à moins de 24 h pour le joueur médian ;
   prochain palier en 2 à 7 jours de revenu.
7. Noms des villes et du Marché visibles ; cibles de 44 px ; contraste 4,5:1.
8. 30 images/s sur un Android d'entrée de gamme au réglage bas.
9. Retest des six profils : moyenne au moins 6,5/10, aucun à 5 ou moins.

## État

| Lot | État | PR |
|---|---|---|
| 0 | fait : clés réservées refusées (fuzz du moteur, 4 graines), plafond et prix montant à l'achat, part du jour par maison, trajets échus réglés à la lecture, lot d'accueil jamais recadencé, refus toujours dits (test sur tous les codes de l'empire) | |
| 1 | fait : règle 3 réécrite (CADRAGE-v3, CLAUDE.md), accueil de l'empire, glossaire et « tu » (test), `{cash}`, Porcellana seule et un seul rouge (la sélection à l'encre bleue, test daltonisme), « le savoir circule » éteint, Puissance et Sceaux masqués avant usage, ce qui manque au Fondaco dit, salaires dits, noms à espaces, sortie de l'intérieur, listes stables, panneau opaque, cristallo. Reportés : équipe de nuit (le moteur la fait relayer contre la fatigue, c'est l'écran qui ne le montre pas → lot 4) ; badges, cibles de 44 px, unités par durée (→ lot 3) ; le sel (→ lot 7) | |
| 2 | fait : le tour des villes n'est plus brûlé, cadence d'apprentissage (12 min pendant 2 h), file de 4 h (règle 3), courbe 50/250/1 200/6 400, Porta de découverte au niveau 3, Terraferme au 5, chaînes emboîtées, Lorenzo jusqu'au niveau 4 sans impasse (matière d'abord, parcelle, achat au Marché), écran de retour avec les commandes. Simulateur : 4/9 sur les trois graines, comme la référence (calibration.md) ; à reprendre : la sortie de la première bande, l'épargne des jeunes | |
| 3 | fait : noms des villes et du Marché, « + » des cases libres et lots prêts toujours visibles, cibles de 44 px, carte centrée hors du panneau, fiche Entrepôt, routes fixes vers les villes servies (chevrons seulement pendant un trajet, route immobile et pâle sinon), cadenas 3D retiré (un seul signe : le repère « niv. N »), Porta fermée en biscuit près du Fondaco avec le niveau qui l'ouvre, lagune autour de San Marco (la terre vide autour de Venise dessinée en eau), deux repères au même point écartés (chaque ville nommée), premier Fondaco près du Rialto : Venise, Padoue et Trévise d'abord, puis Vérone, Trente et Udine, Bologne et Ancône plus tard (sans passage au simulateur, décision du porteur) | |
| 4 | fait pour la bêta : priorités d'intrants, flux par heure, prochaine commande, goulot par étape, fatigue et équipe de nuit dites, référence de cadence dite. Le « ×3 » de l'intérieur : un atelier neuf tourne 1,6 fois l'atelier sans intérieur par conception (la référence est le plan usé et fatigué, lot A8) ; le monde au simulateur tient (calibration.md, lot A8 : prix, commandes, épargne comme sans intérieur, la demande des villes borne les revenus). Pas de recalibrage du débit ; les intérieurs sont allumés en production (D10) | |
| 5 | fait : la Faveur hâte un chantier (10, 20, 40 par jour), les Sceaux posent des embellissements autour du Fondaco (puits 1, bannières 1, gondole 2, statue 3), vus sur la carte, sans rendement (règle 4) ; prime et Carnet seulement sur ce qui n'est pas racheté ; notification de l'atelier arrêté ; pas de perle (D3) | |
| 6 | fait : la caméra suit le véhicule envoyé, les lots prêts en caisses devant l'atelier, des passants autour du Fondaco (un de plus par niveau), le jour et la nuit à l'heure du joueur, des barques sur la lagune, les embellissements des Sceaux, les villes qui hissent les bannières de la Maison (3, 10, 25 livraisons). le Marché en scène (un étal par marchandise de la Maison, auvent rouge au-dessus du cours), les sons (campanile à l'heure du joueur, ressac de la lagune, scie et four quand on touche un atelier qui travaille). les intérieurs selon le métier (chaque poste habillé par ce qu'il fait : métier à tisser, rouet, table du tailleur, pétrin, hache, tamis, bassin, sillons, briques, vitres, canne du souffleur, toisons, presse, sacs et balance, cordes ; vue du laboratoire « ?lab=porcellana&vue=postes ») | |
| 7 | fait : saline de Chioggia (sel sans intrant), champ de chanvre et corderie de la Tana (cordages pour les navires), fornace de Murano (la soude du Levant en bonus : 10 sable + 2 soude → 6 verre, le bois reste possible), zattere du Cadore sur l'eau près des camps de bûcherons. Simulateur : graine 1 à 4/9, comme la référence | |
