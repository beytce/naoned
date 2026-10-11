# Plan d'action : les livraisons par la route

11 octobre 2026. **Plan à valider avant de coder.** Constat : une session se résume à « Tout récolter et relancer » ; vendre aux villes est instantané et ne demande aucun choix. Les livraisons transforment chaque vente à une ville en décision (quoi livrer, avec quoi, escorté ou non) et en rendez-vous (revenir à l'arrivée, réagir à une attaque).

## Principes

1. **Remplacer, pas ajouter** : la vente instantanée aux villes disparaît, remplacée par des commandes à livrer. Le marché commun (Dogana, offres entre joueurs) reste inchangé. La monnaie créée par jour reste celle d'aujourd'hui (ventes aux villes + Doge + familles), redistribuée en commandes.
2. **Le transport est un puits** : véhicules, entretien et escortes détruisent des ducats.
3. **Le brigandage est un pari, pas une rente** : en moyenne, il rapporte un peu plus qu'il ne coûte à un brigand actif, et coûte peu à un livreur prudent. Une partie du butin est détruite : brigander ne crée jamais de valeur.
4. **Le joueur absent n'est jamais ruiné** : pas d'attaque la nuit, perte plafonnée, l'escorte protège sans présence.
5. **Pass Négociant** : aucun avantage (pas de véhicule en plus, pas d'escorte moins chère, pas de délai de réaction plus long).
6. Tout dans `worlds.settings`, validé par `pnpm sim` (toutes graines, `--pass 0.2`), documenté dans `docs/calibration.md`. Les maisons PNJ livrent et posent des bandes.

## Les commandes

| Règle | Détail |
| --- | --- |
| **Tableau du jour** | 10 à 15 commandes personnelles par jour (tirées du secret du monde), affichées sur une carte des villes. Pas de concurrence entre joueurs sur une commande |
| **Contenu** | Une ville, une ressource, une quantité, un prix total, une échéance (fin de journée, ou quelques heures pour une commande urgente) |
| **Prix** | Commandes de ville : autour du prix de référence, plus le transport (plus la ville est loin, mieux elle paie). 2 commandes du Doge et 1 de famille par jour gardent leur prime (+20 %) et sont mises en avant sur la carte |
| **Criées du Rialto** | Deviennent des commandes urgentes à prime, ouvertes 1 h, livrables seulement depuis les villes proches |
| **Paiement** | À l'arrivée, par le grand livre ; la marchandise quitte le stock au départ (journal des stocks), passe « en route » et compte au patrimoine pendant le trajet |
| **Échec** | Commande non livrée à l'échéance : elle disparaît, sans pénalité |

## Les véhicules

| Véhicule | Capacité | Vitesse | Coût | Entretien |
| --- | --- | --- | --- | --- |
| Mule | petite | rapide | faible | faible |
| Charrette | moyenne | normale | moyen | moyen |
| Chariot | grande | lente | élevé (ducats + planches) | élevé |

- Une charrette au départ, **4 véhicules au plus** : c'est la limite de ventes simultanées, et le cœur du choix.
- Trajet de 20 min à 2 h selon la distance et le véhicule. Retour à vide inclus dans la durée affichée.
- Comptés au patrimoine à leur coût, comme les navires. Un véhicule n'est jamais perdu.

## L'escorte

- Louée à chaque livraison, en % de la valeur de la cargaison (puits). Deux niveaux : gardes (réduit fortement la chance d'attaque réussie) et compagnie armée (presque sûr, plus cher).
- Sans escorte, le livreur compte sur sa **riposte** (voir plus bas).

## Les brigands (joueurs et PNJ)

| Règle | Détail |
| --- | --- |
| **Poser une bande** | Un joueur choisit une route (ville ↔ région) et une durée (2 à 6 h). Coût : ducats détruits + vivres (pain). Une seule bande active par joueur |
| **Nombre d'attaques limité** | Une bande tente **au plus 2 attaques** pendant sa durée, sur des livraisons qui passent à mi-trajet. Au-delà, elle ne fait que gêner (la route reste marquée). Une route très fréquentée n'est donc pas une mine d'or |
| **Chance de réussite** | Selon la force de la bande face à l'escorte : environ 40 % contre une livraison seule (avant riposte), 15 % contre des gardes, 5 % contre une compagnie |
| **Riposte** | Livraison sans escorte attaquée : le livreur reçoit un push et a **10 minutes** pour riposter (un bouton). S'il riposte, l'attaque échoue et **la bande est dispersée** (fin de la pose, vivres perdus) |
| **Butin** | Une attaque réussie prend **30 % de la cargaison**, jamais plus. Le brigand reçoit **la moitié** de ce qui est pris (le reste est « perdu dans la fuite », détruit) |
| **Garde-fous repris de la mer** | Pas d'attaque entre 22 h et 8 h (heure de Paris) ; 3 jours d'immunité pour un nouveau venu ; pas d'attaque d'un joueur deux fois moins riche ; une seule attaque réussie par victime et par 24 h ; jamais sur sa propre famille ; une livraison n'est attaquée qu'une fois |
| **Transparence** | La carte montre les routes guettées (sans dire par qui). La victime apprend le nom du brigand ; les attaques paraissent dans la gazette |
| **Brigands PNJ** | Quelques bandes PNJ à faible fréquence, pour que l'escorte ait un sens dans un monde peu peuplé |

**Pourquoi ce n'est pas toujours rentable pour le brigand** : il paie d'avance, ne touche que la moitié de 30 % d'une cargaison, au plus 2 fois ; une victime présente le disperse ; une victime prudente évite la route ou s'escorte. Cible au simulateur : rendement du brigandage entre 0 et +20 % de la mise pour un brigand actif, perte moyenne des livreurs inférieure à 3 % de la valeur livrée, et un livreur prudent jamais derrière un brigand à activité égale.

## Une autre interaction entre joueurs (proposée, phase 4)

**Le roulage** : un joueur sans véhicule libre confie une commande à un autre joueur, qui la livre avec ses propres véhicules contre une part du prix. Les joueurs riches en charrettes deviennent transporteurs et les liens se créent sans conflit. Le risque de brigandage est porté par le transporteur, et sa réputation (livraisons réussies) est affichée.

## Étapes (un commit par ligne)

| Phase | Contenu |
| --- | --- |
| 1. Moteur | Tirage des commandes du jour, véhicules (achat, entretien, capacité, durée), départ et arrivée d'une livraison, bandes, résolution d'attaque (chance, riposte, butin, garde-fous), invariants. Tests d'abord, avec la fixture |
| 2. Équilibrage | Réglages de Venise, PNJ qui livrent, posent des bandes et ripostent selon leur assiduité, suppression de la vente instantanée aux villes, recalibrage dans `docs/calibration.md` |
| 3. Serveur | Tables (`vehicles`, `deliveries`, `bandit_bands`, commandes du jour), migration, routes, tick (mi-trajet, fin du délai de riposte, arrivée), grand livre et journal des stocks, notifications push (attaque, arrivée, riposte réussie) |
| 4. Interface | Carte des villes et des routes guettées, fiche de commande (véhicule, escorte), alerte d'attaque avec compte à rebours, écran Brigands, missions et tutoriel mis à jour |
| 5. Plus tard | Le roulage (ci-dessus) |

## Points ouverts

- Faut-il une durée minimale de trajet, pour que la riposte ait toujours le temps d'arriver (une attaque à mi-trajet d'un trajet de 20 min) ? Proposé : l'attaque suspend la livraison jusqu'à la fin du délai de riposte.
- Les commandes du Doge et des familles hors de Venise (outre-mer) restent livrées par la mer : pas de changement.
