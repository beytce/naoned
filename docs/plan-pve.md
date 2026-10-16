# Un mode PvE coopératif — propositions (16 octobre 2026)

Demande du porteur : un mode joueur contre l'environnement, jouable seul, en coopération ou à plusieurs, qui rapporte des ducats ou des ressources.

**Statut : proposition, non codée.** Le gel des mécaniques (`docs/CADRAGE.md`, 16 octobre) tient jusqu'aux mesures de la bêta ; ce document prépare la décision, la piste retenue est notée dans `IDEAS.md`.

## Les contraintes qui décident

Un PvE qui « donne » des ducats ou des ressources touche au cœur de l'économie. Cinq règles du cadrage tranchent avant le goût :

1. **Pas de ducats gratuits.** Toute monnaie créée gonfle la masse monétaire (plafond : 2,5 × le capital de départ par joueur actif) et les prix. Un PvE ne paie des ducats **qu'en échange de marchandises livrées**, comme les villes et le Doge, à un prix borné.
2. **Le classement compte les ventes nettes.** Si le PvE paie mieux que les commandes, il devient la seule stratégie et vide le Rialto. Sa prime doit rester sous celle des commandes urgentes (+10 à +15 % au-dessus d'une commande ordinaire), avec un plafond par marchand et par jour.
3. **Des ressources qui viennent d'ailleurs.** Récompenser en briques, planches ou pain ferait concurrence aux joueurs qui les produisent. Les seules ressources à offrir sont celles qu'aucune région ne produit : épices, soie, fourrures, draps, sel, vin (les biens de la Muda). Elles entrent dans l'économie et se revendent au Rialto ou aux commandes du Doge.
4. **Équité.** Un joueur assidu finit 5 à 10 % devant un occasionnel, pas plus ; un joueur seul ne doit pas être distancé par les groupes. Toute récompense de groupe est partagée au prorata de l'apport, avec un plafond par compte (contre les doubles comptes).
5. **Sessions courtes.** Trois minutes sur mobile : le PvE se joue en décisions et en livraisons, pas en combat en temps réel.

## Cinq pistes

### A. Les commandes de compagnie (coopération, 2 à 4 marchands) — recommandée

Le Doge publie chaque jour quelques **grosses commandes à plusieurs marchandises** qu'un marchand seul ne peut pas remplir à temps, parce qu'elles demandent les produits des trois régions (par exemple « Arsenal : 60 planches, 40 briques, 120 pains en 6 h »).

- Un marchand ouvre une **compagnie** sur la commande ; les autres la rejoignent depuis le tableau ou par un lien (membres de la famille signalés en premier).
- Chacun livre par la route ce qu'il produit ; la barre de progrès est commune.
- Commande remplie à temps : chacun est payé pour ce qu'il a livré, **+10 % de prime de compagnie** ; un lot de biens de la Muda (épices, soie) est réparti au prorata. Ratée : on est payé pour ce qu'on a livré, sans prime.
- Variante solo : les mêmes commandes en petit format pour qui joue seul, sans prime de compagnie mais sans attente.

*Pourquoi* : elle sert ce qui existe déjà (interdépendance des régions, livraisons par la route, familles), paie contre des marchandises (rien de gratuit), et fait se parler des joueurs qui ne se croisaient que dans le carnet. Les briques, planches et pain sortent du circuit des joueurs vers une demande PNJ : c'est une demande en plus, pas une concurrence.

*Coût* : moyen. Le moteur a déjà les commandes, les livraisons groupées (`orderIds`) et les contrats ; il manque la compagnie (membres, parts) et son écran.

### B. Les grands chantiers de ville (tout le serveur ensemble)

Le moteur sait déjà ouvrir un chantier par semaine (`projects`), coupé depuis le calibrage (`needsPerPlayer` vide) et sans écran. Une ville annonce un ouvrage (l'Arsenal, le pont du Rialto, la digue de Chioggia) ; tous livrent briques, planches et pain, payés à prix fixe un peu au-dessus de la référence ; des **paliers** débloquent un avantage pour tout le serveur pendant 48 h (commandes de la ville +10 %, entretien −10 %), les plus gros contributeurs reçoivent un titre et l'ouvrage apparaît sur la carte.

*Pourquoi* : le moins cher (moteur existant), un objectif commun visible, un puits de matériaux. *Limite* : on y contribue sans se parler ; c'est du « tous ensemble », pas de la coopération.

*Coût* : faible à moyen (réglages, paliers, écran).

### C. Les expéditions lointaines (seul ou en groupe, en différé)

Envoyer un convoi vers un comptoir lointain (Bruges, Constantinople, Alexandrie) pour 8 à 24 h : on y engage des véhicules, du pain (vivres) et des marchandises à échanger. En route, deux ou trois **décisions** (col des Alpes fermé : attendre ou payer un guide ; marchand turc : vendre ici ou continuer). Au retour, des **biens de la Muda** proportionnels à la cargaison et aux choix ; jamais de perte totale. En groupe, les convois s'additionnent et ouvrent un palier de butin supérieur.

*Pourquoi* : le plus proche d'un « donjon » PvE, jouable en sessions courtes, qui récompense en ressources rares plutôt qu'en ducats. *Limite* : fait doublon avec la Muda (même biens), et les véhicules immobilisés manquent aux livraisons : à régler finement.

*Coût* : élevé (nouvelle boucle, événements, écrans, équilibrage).

### D. Les crises de la République (événement mondial)

L'Acte II tire déjà une crise (guerre de Chioggia, peste, embargo). En faire un **objectif collectif** : « La peste à Padoue : 2 000 pains livrés avant 48 h ». Réussite : bonus pour tous jusqu'à la fin de l'acte ; échec : les commandes de la ville baissent. Contributions payées au prix de référence, titre pour les dix premiers.

*Pourquoi* : donne un arc au mois, réutilise les actes. *Coût* : faible si l'on part de B (c'est un chantier daté et thématisé).

### E. Milan à l'assaut (PvE dans la Campagne)

Milan chevauche déjà toutes les 4 heures. Un week-end par saison, une **grande invasion** que les quatre familles doivent contenir ensemble ; terres tenues à la fin : gloire et un trésor de la République partagé.

*Pourquoi* : le combat existe déjà. *Limite* : retouche une mécanique fraîche et encore non mesurée ; les familles sont un affrontement, en faire une coopération brouille leur sens.

## Comparaison

| | Coop réelle | Ducats | Ressources | Risque économique | Coût | Cohérence avec le jeu |
| --- | --- | --- | --- | --- | --- | --- |
| A. Commandes de compagnie | forte (2-4) | contre livraison, +10 % | biens de la Muda | faible | moyen | très forte |
| B. Grands chantiers | faible (serveur) | contre livraison | — | faible | faible | forte |
| C. Expéditions | moyenne | — | biens de la Muda | moyen | élevé | moyenne |
| D. Crises | faible (serveur) | contre livraison | — | faible | faible | forte |
| E. Invasion de Milan | moyenne (familles) | trésor | — | moyen | moyen | moyenne |

## Recommandation

1. **Ne rien coder avant les mesures de la bêta.** Le gel existe pour savoir ce qui retient les joueurs ; un PvE ajouté maintenant brouillerait la mesure.
2. **Préparer A, c'est le vrai mode coopératif.** Le faire jouer d'abord aux bots du simulateur (`pnpm sim`) : masse monétaire ≤ 2,5 ×, écart assidu / occasionnel ≤ 10 %, part des ventes nettes venue des compagnies ≤ 25 %, Rialto toujours actif. Documenter dans `docs/calibration.md`.
3. **Si la bêta montre une rétention faible à J7**, rallumer **B** sous la forme **D** (un chantier de crise par saison, à l'Acte II) : quasi gratuit, et un premier test d'objectif commun. Puis A.
4. **Garder C pour la V1**, quand les compagnies auront montré que les joueurs coopèrent ; **écarter E** tant que la Campagne n'est pas mesurée.

Garde-fous communs : paiement seulement contre marchandises, prime plafonnée par marchand et par jour (`worlds.settings`), ressources offertes limitées aux biens de la Muda, parts au prorata avec plafond par compte, paires suspectes visibles dans `/admin`, rien d'achetable avec le Pass.

## Questions pour le porteur

- La prime de compagnie doit-elle compter au classement (ventes nettes) ou à part (un classement des compagnies, cosmétique) ?
- Compagnies ouvertes à tous, ou réservées aux membres d'une même famille ?
- Le mode solo (petites commandes) est-il voulu, ou le PvE doit-il pousser à jouer ensemble ?
