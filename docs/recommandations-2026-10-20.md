# Recommandations du 20 octobre 2026 : ce qui manque à Fondaco

Établies à partir des avis de joueurs sur des jeux voisins (Sim Companies, Travian, OGame, Forge of Empires, OpenFront, Hades' Star, Port Royale) et de l'audit UX du 19 octobre. Le porteur a demandé de tout lancer (le jeu est en conception pure) ; ce qui a été fait est suivi en bas.

## Ce que les joueurs reprochent au genre

| Reproche | Exemples | Réponse de Fondaco |
| --- | --- | --- |
| Pay-to-win | Travian Kingdoms, Forge of Empires, OGame | Pas de monnaie, ressource ni vitesse vendues ; à montrer (Rapport de la Banque) |
| Se lever la nuit, s'épuiser | OGame, Travian (attaques nocturnes, pas de défense automatique) | Le jeu dort de 22 h à 8 h ; ne jamais perdre tout pendant une absence |
| Trop d'attente, pas assez d'interaction | Sim Companies | Des décisions à chaque session (courbe des prix, rival, commandes de compagnie) |
| Les vétérans écrasent les nouveaux | Sim Companies, OGame | Saisons d'un mois |
| Rivaux sans visage | Port Royale 3 | Le rival de la semaine |
| Alliances sans outil de coordination | Travian | Journal du Rialto, lien de la communauté |
| Règles qui changent sous les pieds | Hades' Star (Dark Nebula), Forge of Empires | Règles stables pendant une saison, notes de saison |
| Le transport devient une corvée | Hades' Star (« livrer des cargaisons, beurk ») | Le fattore |

## Le lot

| # | Recommandation | État |
| --- | --- | --- |
| P0-1 | Terraferme facultative, ouverte après la première journée de commerce (et une première livraison) | Fait |
| P0-2 | Règles stables pendant une saison, notes de saison au pied de l'Aide | Fait |
| P0-3 | Trois compteurs sur la carte : ducats, rang, charrettes ; le pain quand il manque, l'Influence dans le Profil | Fait |
| P0-4 | Capitale imprenable pour qui n'attaque aucun marchand de la semaine (`peacefulSafe`) | Fait |
| P0-5 | Télémétrie de rétention (J1 à J30, sessions, tutoriel) | Existait déjà (`/admin`) |
| P1-6 | Rival de la semaine sous le rang, caractère des maisons de l'ordinateur | Fait |
| P1-7 | Commandes de compagnie : tous les 2 jours, pain + briques + planches, +10 % à la livraison, +10 % pour tous une fois remplie | Fait |
| P1-8 | Courbe des prix sur 7 jours pour tous, face à la référence | Fait ; les rumeurs de la gazette ne sont pas faites (la gazette annonce déjà ses événements la veille) |
| P1-9 | Journal du Rialto dans les avis, lien de la communauté (`COMMUNITY_URL`) | Fait |
| P1-10 | Chronique de saison à partager (image) | Fait ; l'enchère des galères et l'élection du Doge restent dans IDEAS.md |
| P1-11 | Le fattore : 2 départs par jour, 2 h après la dernière action, 15 % de commission détruite | Fait |
| D | Rapport de la Banque (public, `/api/bank`), livre de compte en CSV, promesses sur l'accueil | Fait |

## Suite : la Terraferme plus proche d'OpenFront (20 octobre 2026)

Heure de bataille, escarmouches en direct, soldats ou paysans, ports et barques, nations de 1450, bombardes et remparts, diplomatie, semaines en équipes, rejeu et cote : voir `docs/plan-terraferme.md`, « Se rapprocher d'OpenFront ».

## Suite : la refonte du commerce (20 octobre 2026)

Constat du porteur : le commerce était faible à côté de la Terraferme — quelques livraisons, des ateliers qui grandissent lentement, sans que l'intérêt de chaque choix soit clair. Trois phases, dans le lot du gel levé :

**Phase 1 — rendre les choix lisibles**
- **C1 Fiche d'atelier chiffrée** : marge par heure aux prix de référence, ce qu'ajoute le niveau suivant et en combien de temps il se rembourse ; le « meilleur placement » marqué (`advice.ts`, `workshopEconomics`, `bestUpgrade`).
- **C2 Tableau de bord du comptoir** : marge par heure, ventes nettes du jour et de la semaine, courbe des sept derniers jours face au rival et au premier (`GET /api/game/dashboard`).
- **C3 Lorenzo conseille** la prochaine meilleure action : récolter, relancer un atelier oisif, livrer la commande de compagnie, l'amélioration abordable la plus vite remboursée (`nextActions`).

**Phase 2 — la compétition entre marchands**
- **C4 Fournisseur officiel** : par ville et par marchandise, qui livre le plus dans la semaine (au moins `minUnits`) est payé `bonusBps` de plus la semaine suivante ; blason sur la carte, classement en direct (`suppliers.ts`).
- **C5 Appels d'offres du Doge** : tous les deux jours, une quantité sous un plafond ; offres scellées avec caution, les moins chers l'emportent, la caution du gagnant qui ne livre pas sort du jeu (`tenders.ts`).
- **C6 Entrepôts des villes** : deux places par ville aux enchères chaque semaine (ducats détruits) ; le titulaire livre les commandes de la ville sur-le-champ, sans charrette, `unitsPerDay` par jour (`warehouses.ts`).

**Phase 3 — de quoi grandir**
- **C7 Chaînes de luxe** ouvertes par les titres (`settings.unlocks`, aux seuils des titres) : verre de Murano (sable → verre → miroirs) au Marchand, draperie (laine → drap → vêtements) au Négociant, épices préparées (épices de la Muda) à l'Armateur. Leurs marchandises ne sont demandées qu'à qui les fabrique (`unlocks.ts`).
- **C8 Manufactures** : au-delà du niveau 5, jusqu'au 10, sur une voie choisie une fois — volume (lots plus gros) ou qualité (mêmes lots, payés `qualityBpsPerLevel` de plus par niveau par les villes).
- **C9 Affaires entre marchands** : commandes sous séquestre (ducats bloqués, taxe du marché comme au Rialto, comptées dans les ventes nettes comme une vente au Rialto) et colleganza (capital avancé, rendu à l'échéance avec une part des ventes nettes du marchand, qui passe de son classement à celui de l'investisseur) (`partners.ts`).
- **C10 Prêts de la Banque** : jusqu'à une part du patrimoine, quelques jours, intérêt simple détruit ; à l'échéance la Banque se paie sur la caisse, le reste majoré est prélevé sur les rentrées ; la dette se déduit du patrimoine (`loans.ts`).

Tout passe par le grand livre (nouvelles causes : `supplier_bonus`, `tender_*`, `warehouse_*`, `quality_premium`, `commission*`, `colleganza_*`, `loan*`) et le journal des stocks (`tender_delivery`, `commission`). Les PNJ enchérissent aux appels d'offres, honorent les commandes, acceptent les colleganze, le bâtisseur monte les chaînes de luxe et tous passent en manufacture (l'artisan en qualité) ; ils ne prennent ni entrepôts ni prêts. Calibrage : `docs/calibration.md`, « La refonte du commerce ».
