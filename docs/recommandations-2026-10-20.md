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
