# Refonte totale : un empire marchand sans remise à zéro

*Synthèse du 29 octobre 2026, à partir de deux notes d'expert :*
- *`expert-progression.md`, sur la progression persistante et l'économie ;*
- *`expert-meta.md`, sur le méta-jeu, le social et la rétention.*

*Rien n'est codé. Ce document attend les arbitrages du porteur (§ 4) avant tout plan de mise en œuvre.*

## 0. La demande du porteur

Le porteur lève toutes les règles de conception antérieures. Le jeu n'est plus une suite de mois qui repartent de zéro. Le joueur se développe sans reset et a la vraie impression de grandir, pendant des mois et des années.

Une seule exception : **la Terraferme reste en saisons courtes**. Une refonte visuelle et des interactions suivra.

Les contraintes d'ingénierie restent :
- montants entiers ;
- grand livre en partie double ;
- logique pure dans `packages/engine`.

## 1. La thèse commune

Les deux experts arrivent indépendamment à la même image :

> **La Maison est un empire marchand qui s'étend de la lagune à Bruges.** Elle grandit en profondeur (ateliers, palais, flotte) et en étendue (des comptoirs dans des régions nouvelles), au rythme de chantiers qui s'allongent. La puissance grandit sans fin, mais **toute compétition se joue entre Maisons de même calibre**. Le mois devient un chapitre politique, le trimestre une ère historique (1450 → 1453 → …). **La Terraferme reste une partie d'une semaine**, qui nourrit le permanent sans le décider.

Une règle d'or, reprise des deux notes :

> **Rien de ce que le joueur a bâti ne se perd.** Seules les positions disputées se perdent, parce que d'autres les prennent : Podestà, Doge, charges, palais du Grand Canal, Terraferme.

## 2. Ce sur quoi ils sont d'accord (à retenir tel quel)

### 2.1 Ce qui grandit

| Axe | Contenu | Ce qu'on voit grandir |
| --- | --- | --- |
| **La Casa** | Jauge maîtresse, niveaux 1 à 20 puis la Maestria sans fin. Elle plafonne le reste et ouvre les paliers | La façade du palais sur le Grand Canal, qui prend des étages |
| **Les ateliers** (botteghe) | Niveaux 1 à 20 (25 pour son Arte), dans chaque région où l'on a un comptoir. Quatre étages de chaîne : brut, travaillé, fini, grand ouvrage | L'atelier change de forme tous les cinq niveaux |
| **La flotte** | Huit véhicules, de la mule à la galère de Flandre, avec des **modules** (cale, vitesse, escorte, assurance) | Les convois qui circulent sur ses routes |
| **Les comptoirs et la carte** | Dix régions, de la Vénétie à la Flandre. Chacune s'ouvre par une charte, un voyage d'ouverture, puis un comptoir à bâtir | Le brouillard qui se lève, la carte qui se dézoome |
| **La famille et le savoir** | Des membres de la famille placés comme agents (le fattore en premier), un arbre de savoirs à choix exclusifs, une Arte exclusive | La galerie des portraits, l'arbre qui se remplit |

Les deux experts insistent sur trois points :
- ces axes **absorbent** les systèmes actuels au lieu de s'y ajouter ;
- on passe d'une trentaine de systèmes à une douzaine visibles ;
- un **seul chiffre de puissance**, calculé sur ce qui est bâti et pas sur la caisse, sert à apparier.

### 2.2 Le rythme

- **Trois horloges** :
  - la récolte, en heures ;
  - le chantier, de quelques minutes à 7 jours ;
  - l'ambition, en semaines : une région, une galère, une charge.

  En ouvrant le jeu, on trouve toujours une horloge arrivée à terme.
- **Les chantiers avancent la nuit.** La file de production couvre 12 h, pour tous, et ne se vend jamais.
- **Une tournée de 5 minutes** : tout ramasser, relancer, un geste pour un associé, un choix qui compte, une question ouverte pour revenir.
- **On ne culpabilise jamais.**
  - Plus de série, de coffre quotidien ni de produits frais. Un **Carnet de la semaine** les remplace, à remplir n'importe quand.
  - Au retour d'une absence, on trouve un résumé et un vent en poupe sur les objectifs, jamais une perte.
- **Le calendrier** :
  - la semaine est rythmée par la Terraferme, qui s'ouvre le lundi et se clôt le dimanche ;
  - le mois porte l'élection du Doge et une foire ;
  - **le trimestre est une ère historique** qui ouvre du contenu pour tous, sans rien effacer. Par exemple, la chute de Constantinople en 1453 ferme une route et en ouvre une autre.

### 2.3 Ne pas écraser les nouveaux

Les deux experts proposent des parades, à cumuler :
- **Toute compétition par bande de puissance**, à la manière d'Hades' Star. Cela vaut pour la Sfida, le classement, la Sera, la Terraferme par théâtres, les expéditions et la guerre de compagnies. Le classement absolu du patrimoine disparaît.
- **Le nouveau a toujours de quoi vendre** : chaque comptoir a son carnet de commandes privé, et les petites commandes de Vénétie sont réservées aux petites Maisons.
- **Le nouveau est utile au vétéran**, qui lui achète ses matières brutes.
- **Le rattrapage par le coût** : ce que la moitié du monde possède devient moins cher et plus rapide. Le sommet n'est jamais rabaissé.
- **La protection des nouveaux** : 30 jours, aucune cible d'espion, de rumeur ni de front venant d'une bande plus forte.
- **Aucun pillage de ce qui est bâti**, hors de la Terraferme, qui repart chaque semaine.

**Cible commune** : un nouveau dans un monde d'un an atteint la puissance médiane en 4 à 6 mois.

### 2.4 Le haut niveau

Le sommet doit rester ouvert :
- **des charges uniques et perdables** : Podestà, Console d'Alexandrie, Bailo de Constantinople, Procurateur, Doge ;
- **des Grandes Œuvres** communes, à niveaux sans fin, qui changent le monde pour tous ;
- **le palais**, en étages de pure vanité ;
- **les parts de Maison**, qui deviennent une vraie bourse ;
- **la Maestria**, des niveaux d'atelier infinis à +1 %.

### 2.5 La Terraferme

- Elle reste **hebdomadaire, à armes égales**, appariée par sa propre cote et non par la puissance.
- **L'empire paie l'entrée en marchandises.** Une ration journalière égale pour tous plafonne l'avantage des riches.
- Elle rend de la gloire, de la monnaie politique, des **trophées**, des cosmétiques et le décret du Signore de la semaine.
- Elle ne rend **jamais de rendement de production**.
- Sa part reste plafonnée, de l'ordre de 10 à 15 % de la progression d'une semaine.

### 2.6 La monétisation

- **Jamais** de ducats, de ressources, de temps (accélération), de chantier en plus, de file plus longue ni de troupes.
- On vend l'information et le confort (abonnement), les cosmétiques et, idée du second expert, **le mécénat de compagnie**, qui offre l'abonnement à des associés.

### 2.7 Ce qu'on supprime, transforme, garde

| Système | Décision |
| --- | --- |
| Saisons mensuelles avec reset | **Supprimées** pour le commerce. `worlds.ends_at` ne borne plus que la Terraferme |
| Ateliers 1–5, manufactures 6–10, palazzo, maîtrises | Fondus dans la Casa, les ateliers 1–20 et les Arti |
| Classement mensuel des ventes nettes | Supprimé en absolu, remplacé par des classements **par bande** (croissance, livraisons, Lustre) |
| Atouts hebdomadaires | Deviennent des personnages ou traits permanents, liés à la famille |
| Dynastie et héritier | Gardée et ralentie : la famille devient la collection des agents |
| Influence et missions | Une monnaie politique gagnée en servant l'État, jamais achetable |
| Lettre du jour | Un feuilleton sans fin, en arcs, avec mémoire |
| Grand Canal | Un immobilier persistant |
| Signoria, Doge, Broglio, Sera, Muda, parts | Gardés et prolongés : la persistance leur donne une mémoire |
| Coffre, série, tâches du jour, produits frais, bonus de retardataire | Supprimés, au profit du Carnet de la semaine et du rattrapage par le coût |

## 3. Le modèle proposé (mes recommandations sur ce qui diverge)

Les experts divergent sur six points. Pour chacun, voici ma recommandation, à arbitrer au § 4.

1. **Le frein des gros : entretien ou pas.**
   - L'expert de l'économie veut un entretien qui croît plus vite que la taille.
   - L'expert de la rétention le refuse, parce qu'il punirait l'absent.
   - **Recommandation : des salaires prélevés sur les recettes, jamais sur la caisse ni pendant l'absence.**
     - Une part de chaque vente part en salaires du comptoir : 3 % pour une petite Maison, 20 à 25 % pour un empire.
     - Ce prélèvement ne passe jamais sous zéro, ne coûte rien à qui ne vend pas et ne détruit rien.
     - S'y ajoutent les puits voulus par le joueur : palais, Grandes Œuvres, fondaco de compagnie, guerre.
     - La **décime** sur la trésorerie qui dort est gardée en réserve, si la masse monétaire s'emballe au simulateur.
2. **La guilde : pilier ou amplificateur.**
   - **Recommandation : un empire jouable seul, une compagnie qui démultiplie.**
     - Toute la progression de base se fait seul, l'interdépendance passant par le marché.
     - La compagnie ouvre le contenu coopératif (expéditions, Condotta à paliers, guerre de compagnies), l'entraide quotidienne et un grand chantier commun sans rendement.
     - C'est là que se trouve le meilleur contenu, sans qu'il soit obligatoire.
3. **La courbe : de grands chiffres ou des rendements très décroissants.**
   - **Recommandation : des chiffres qui se sentent, des coûts qui montent plus vite.**
     - La production d'un atelier niveau 20 vaut environ 77 fois la base, ce qui se voit.
     - Le coût d'un niveau croît plus vite encore, si bien que le temps de remboursement s'allonge de lui-même.
     - L'équité vient des bandes, pas de l'écrasement de la courbe.
4. **Les monnaies.**
   - **Recommandation : trois au plus.**
     - **Ducats**.
     - **Faveur**, la monnaie politique, gagnée en servant l'État, jamais achetable.
     - **Sceaux**, rares, gagnés en coopération et à la Terraferme. Ils débloquent agents, plans et cosmétiques, jamais du rendement brut.

     Les trophées de la Terraferme deviennent des Sceaux, pour éviter une quatrième monnaie.
5. **La guerre de compagnies.**
   - **Recommandation : la Contesa sur le moteur de la Terraferme, une semaine sur deux**, avec des rosters appariés par puissance.
   - Les autres semaines restent la Terraferme d'aujourd'hui, chacun pour soi avec alliances, par théâtres de bande.
6. **Le rythme de la famille.**
   - **Recommandation : une génération par trimestre, alignée sur l'ère historique.**
     - À la succession, l'héritier hérite de tout.
     - La Maison gagne un point d'**Héritage**, qui ouvre des traits de lignée permanents : un « prestige » qui ajoute sans rien retirer.

## 4. Les arbitrages demandés au porteur

| # | Question | Recommandation |
| --- | --- | --- |
| A | Frein des gros : salaires sur les recettes, entretien sur la caisse, ou rien | Salaires sur les recettes, jamais pendant l'absence |
| B | Guilde : pilier obligatoire ou amplificateur | Amplificateur fort, empire jouable seul |
| C | Guerre de compagnies : Contesa une semaine sur deux, chaque semaine, ou pas | Une semaine sur deux |
| D | Univers : de la Vénétie à la Flandre (dix régions), ou rester dans la Vénétie et l'Adriatique | Dix régions, ouvertes par ère, quatre au lancement |

Points qui ne demandent pas d'arbitrage, puisque le porteur lève les règles :
- **la bascule** se fait par un dernier reset, avec la Casa 1 pour tous (il n'y a pas encore de joueurs) ;
- **`CLAUDE.md`** est à réécrire : il fige aujourd'hui les saisons d'un mois et les règles du Pass Négociant.

## 5. La suite proposée

Chaque étape est validée avant la suivante.

1. **Un nouveau cadrage** (`docs/CADRAGE-v2.md`), une fois les arbitrages faits, puis la mise à jour de `CLAUDE.md`.
2. **Le simulateur de 24 mois**, avant toute calibration. Il fait arriver des cohortes aux mois 0, 3, 6 et 12, et mesure :
   - le temps pour atteindre chaque palier de Casa ;
   - le temps qu'il faut à un nouveau pour atteindre la puissance médiane ;
   - l'indice des prix ;
   - le ratio entre puits et sources de monnaie ;
   - la part de la Terraferme dans la progression.
3. **Le socle**, jouable seul en Vénétie :
   - la fin du reset ;
   - la Casa 1–20, les ateliers 1–20 et les chantiers en parallèle ;
   - les salaires ;
   - le chiffre de puissance et ses bandes ;
   - le Carnet de la semaine ;
   - la file de nuit de 12 h.
4. **L'étendue** : les comptoirs et les régions (Lombardie, Frioul), le chariot et le burchio.
5. **L'identité** : l'Arte, les savoirs, la famille comme agents.
6. **La compagnie** : rôles, succession, entraide, Condotta à paliers, puis la Contesa.
7. **La mer** : la Dalmatie, l'Arsenal, les navires à modules, la Muda des joueurs.
8. **Les ères et les Annales**, le Grand Canal en immobilier, le Levant.
9. **La refonte visuelle et des interactions**, qui suit chaque étape : la carte qui s'étend, la façade qui monte, les convois.

La refonte UX en cours s'arrête au lot 8, et le lot 9 est suspendu : ses écrans seront repensés pour le nouveau modèle.
