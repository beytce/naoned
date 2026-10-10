# Comptoirs — Document de cadrage (v2)

10 octobre 2026 · nom de code du dépôt : `naoned`

## Décisions de la v2

Cette version tranche les points ouverts de la v1. Chaque décision est reprise dans la section concernée.

| Sujet | v1 | v2 | Pourquoi |
| --- | --- | --- | --- |
| Positionnement | « Simple », « pour les streamers » | **Niche assumée** : joueurs de gestion et de stratégie | Les jeux de marché ont des communautés petites mais fidèles et rentables |
| Ressources du MVP | 10 ressources, 4 chaînes | **7 ressources, 3 chaînes** | Carnets d'ordres deux fois plus denses avec le même nombre de joueurs |
| Marché | Mondial ou régional : non précisé | **Un carnet par ressource et par monde** | Ne pas fragmenter la liquidité |
| PNJ teneur de marché | Retiré à J+14 | **Permanent**, écart de 4 % à 20 %, profondeur plafonnée | Garde-fou de liquidité au moment où la rétention chute |
| Types d'ordres | Cours limité uniquement | Cours limité **+ ordre immédiat** avec protection de prix | Une session mobile de 3 minutes ne peut pas surveiller un carnet |
| Production | Calculée par le tick | **Calcul paresseux** à la lecture | Plus simple, ne coûte rien quand personne ne joue |
| Grand livre | Monnaie seulement | Monnaie **+ journal des mouvements de stock** | Les bugs de duplication touchent aussi les stocks |
| Valorisation de fin de saison | Prix moyen sur 24 h | **Principe de prudence** pour les stocks : min(prix de référence, prix moyen pondéré sur 7 jours) ; bâtiments au coût | Le prix sur 24 h est manipulable entre comptes complices |
| Indicateur monétaire principal | Ratio création/destruction entre 0,9 et 1,1 | **Indice des prix** + plafond de masse monétaire par joueur actif ; le ratio n'est qu'un diagnostic | Voir « Ajustements issus du simulateur » |
| Guildes | Nom, membres, chat | + **Grands chantiers** hebdomadaires | Le multijoueur doit se voir, pas seulement exister dans le carnet |
| Référentiel | Sans `world_id`, sans thème | Ressources et recettes rattachées à un **thème** | Les recettes changent d'une saison historique à l'autre |
| Jeton Sceau | V2 | **Abandonné** | Revient à vendre de la monnaie de jeu |
| Abonnement | Production automatisée, 20 ordres | **Confort d'analyse uniquement** | La production automatisée achète du pouvoir économique |
| Roadmap | Interface au jalon 6 | **Simulateur au jalon 1, tranche jouable au jalon 3** | Valider l'équilibrage et le plaisir de jeu avant de durcir le moteur |
| Critère de sortie | 50 testeurs, 30 % à J+14 | 100 inscrits **venus de communautés**, 25 % à J+14 | Des amis testeurs ne mesurent pas la rétention réelle |

### Ajustements issus du simulateur (jalon 1)

Les premières simulations ont révélé des défauts de conception que des réglages de paramètres ne corrigeaient pas. Détail et chiffres dans `docs/calibration.md`.

| Constat du simulateur | Décision |
| --- | --- |
| Seul le pain faisait entrer de la monnaie : deux régions sur trois dépendaient entièrement des boulangers | Les villes achètent aussi des briques et des planches ; chaque région a son débouché |
| Matières brutes produites 2 à 3 fois plus vite que consommées : les prix s'effondraient | Chaque région reçoit une chaîne complète au départ, et le bonus régional porte la production brute exactement au besoin du transformateur |
| Une amélioration était impossible tant que la file tournait, donc jamais | L'amélioration est possible à tout moment et s'applique aux lots suivants |
| Bâtiments comptés à 50 % : investir faisait baisser le classement, les joueurs thésaurisaient | Bâtiments comptés à leur coût |
| En fin de saison, plus rien de productif à financer : la trésorerie s'accumulait | **Palais** : bâtiment de prestige sans production, compté à son coût, qui détruit des ducats et consomme des matériaux ; entretien qui croît plus vite que le niveau |
| Le PNJ rachetait à 90 % du prix de référence quand le marché était à 35 % : subvention exploitable | Le PNJ suit le marché **à la baisse uniquement** (jusqu'à 50 % du prix de référence) |
| La masse monétaire par joueur actif croît avec la taille des affaires (épargne pour l'amélioration suivante) alors que les prix restent stables | L'inflation se mesure par l'indice des prix ; la masse monétaire par joueur actif a un plafond (2,5 × le capital de départ) et sa croissance devient un diagnostic |

## Vision et positionnement

Comptoirs est un jeu de commerce multijoueur en 2D, jouable sur navigateur PC et mobile. Chaque joueur développe un comptoir marchand dans un monde partagé dont les prix sont fixés par les joueurs.

**Pitch** : le Travian du commerce, en saisons historiques de 6 semaines, avec une économie réelle et lisible.

**Promesse joueur** : partir de rien, bâtir une maison de commerce en 6 semaines, et peser réellement sur les prix d'un marché vivant.

**Positionnement** : jeu de niche, assumé. On vise quelques milliers de joueurs très engagés plutôt qu'un large public. La profondeur économique est un atout, pas un défaut à cacher ; l'effort porte sur la **lisibilité** et sur une prise en main guidée en 10 minutes.

**Différenciation** face à Sim Companies, Torn, OGame ou Albion :

- Des saisons historiques de 6 semaines (Venise 1450 pour la première), remises à zéro, pour qu'aucun nouveau venu ne soit écrasé.
- Une économie lisible : carnet d'ordres visuel, graphiques simples, conseiller qui explique les prix, journal de bourse public.
- Une économie saine par construction : grand livre en partie double, indicateurs publics de masse monétaire et d'inflation.
- Aucun pay-to-win : on ne vend jamais de ressources, de monnaie de jeu ni de production.

**Cible** : adultes de 25 à 55 ans, amateurs de gestion, de stratégie et de tableurs, qui jouent en sessions courtes sur mobile et longues sur PC.

**Canaux d'acquisition** : communautés Reddit et Discord de jeux de gestion, de jeux incrémentaux et de jeux par navigateur ; bouche-à-oreille entre saisons. Pas de publicité payante au départ. Les streamers et les mondes privés sont reportés en V2 (voir `IDEAS.md`).

## Périmètre du MVP

Le MVP vise un seul monde de 200 à 500 joueurs, une saison de 6 semaines sur le thème Venise 1450, en web uniquement (PWA installable).

| Inclus dans le MVP | Exclu du MVP (voir `IDEAS.md`) |
| --- | --- |
| Inscription par lien magique e-mail | Connexion Google / Apple |
| 1 monde, 1 saison, 3 régions | Plusieurs mondes en parallèle, mondes privés |
| 7 ressources, 3 chaînes de production | Textile, ameublement, autres thèmes historiques |
| Carnet d'ordres (cours limité + ordre immédiat) | Contrats entre joueurs, prêts |
| PNJ teneur de marché permanent + demande des villes | Événements pilotés par le chat Twitch |
| Grands chantiers de ville par guilde | Cartels, entrepôts partagés |
| Guildes simples (nom, membres, chat texte modéré) | Classement inter-saisons |
| Classement par patrimoine | API publique |
| Tableau de bord joueur + graphiques de prix | Application en magasin (Capacitor), notifications push |
| Télémétrie dans PostgreSQL + vues pour Power BI | Boutique, pass saisonnier, abonnement |

**Critère de sortie du MVP** : une saison complète avec au moins 100 inscrits venus de communautés extérieures (pas uniquement des proches), au moins 25 % encore actifs à J+14, aucun bug bloquant et aucun écart sur les contrôles d'invariants du grand livre.

## Les 10 premières minutes

C'est la partie la plus importante pour la rétention à J1. Le joueur ne voit pas le carnet d'ordres avant d'avoir compris la production.

1. **Minute 0** : choix de la région, présentée par sa ressource bonifiée (blé, argile ou bois). Le joueur reçoit 1 000 ducats et la chaîne de sa région (voir le tableau des régions).
2. **Minute 1** : le conseiller propose une commande de la ville : « La Sérénissime demande 20 pains » (ou des briques, ou des planches). Le joueur lance la récolte puis la transformation, en durée accélérée pour le tutoriel (30 secondes au lieu de 2 heures).
3. **Minute 3** : il livre la commande et touche ses premiers ducats. C'est la vente aux villes.
4. **Minute 5** : le conseiller lui montre qu'il lui manque le matériau d'une autre région (planches ou briques) pour améliorer un bâtiment. Premier **ordre immédiat** d'achat, guidé.
5. **Minute 8** : amélioration du bâtiment et lancement d'une production de 8 h.
6. **Minute 10** : le carnet d'ordres se débloque, avec une explication en trois écrans (achat, vente, séquestre). Le conseiller propose de placer un premier ordre à cours limité.

Chaque étape écrit un événement `tutorial_step` pour mesurer où les joueurs abandonnent.

## Boucle de jeu et mécaniques

La boucle tient en cinq gestes : produire, vendre, réinvestir, se spécialiser, commercer avec les autres.

1. **Produire** : chaque bâtiment transforme des intrants en extrants selon une recette, en un temps donné (ex. moulin : 10 blé → 8 farine en 2 h).
2. **Vendre** : aux villes PNJ (prix décroissant avec la quantité vendue dans la journée), au PNJ teneur de marché, ou aux autres joueurs via le carnet.
3. **Réinvestir** : construire ou améliorer des bâtiments (niveaux 1 à 5), débloquer des recettes.
4. **Se spécialiser** : chaque région maîtrise une chaîne et produit un seul des deux matériaux de construction ; tout le monde a besoin des deux, ce qui force les échanges.
5. **Commercer** : acheter les intrants qu'on ne produit pas, revendre ses surplus, spéculer.

**Les 7 ressources du MVP**

| Chaîne | Brute | Intermédiaire | Finie | Débouché principal |
| --- | --- | --- | --- | --- |
| Alimentation | Blé | Farine | Pain | Villes PNJ |
| Construction | Argile | — | Briques | Bâtiments, palais, grands chantiers, villes PNJ |
| Charpente | Bois | — | Planches | Bâtiments, palais, grands chantiers, villes PNJ |

| Région | Bonus +30 % | Bâtiments de départ |
| --- | --- | --- |
| Terraferma | Blé | Ferme, moulin, boulangerie |
| Lagune | Argile | Carrière, briqueterie |
| Dolomites | Bois | Camp de bûcherons, scierie |

Les briques et les planches servent à construire et à améliorer tous les bâtiments, au palais et aux grands chantiers : c'est la demande structurelle entre joueurs, puisque chaque région n'en produit qu'un. Les villes achètent du pain (la plus grosse demande), des briques et des planches. Avec le bonus de +30 %, un bâtiment brut de la région alimente exactement le transformateur de niveau équivalent ; un bâtiment brut hors de sa région produit moins.

**Palais** : bâtiment de prestige, sans production, améliorable jusqu'au niveau 5. Il coûte des ducats, des briques et des planches, compte à son coût dans le patrimoine et se voit sur la carte. C'est le puits de monnaie et de matériaux pour les joueurs qui n'ont plus rien de rentable à financer.

**Rythme** : la production tourne en continu, hors ligne compris, avec une file plafonnée à 8 h. Une session mobile type dure 3 à 5 minutes (récolter, relancer, passer 2 ordres) ; une session PC type dure 20 à 40 minutes (optimiser, analyser les prix).

**Production paresseuse** : la production n'est pas calculée par le tick. Chaque bâtiment stocke l'heure de début et la recette en cours ; à chaque lecture, le moteur calcule ce qui est terminé depuis. Un joueur absent ne coûte rien au serveur.

**Grands chantiers** : chaque lundi, une ville annonce un chantier (ex. « Arsenal : 10 000 briques et 6 000 planches avant dimanche »). Les guildes livrent les matériaux et sont payées par la ville à un prix fixe légèrement supérieur au prix de référence. Les trois guildes qui ont le plus livré reçoivent un cosmétique de guilde, et le chantier terminé apparaît sur la carte de la ville. Un joueur sans guilde peut livrer sous une bannière « Indépendants ».

**Arrivée en cours de saison** : les inscriptions restent ouvertes jusqu'à J+28. Un joueur qui arrive après J+7 reçoit un bonus de rendement de +50 % pendant 72 h. Pas de second monde en parallèle au MVP : la liquidité prime.

**Fin de saison** : au bout de 6 semaines, le classement se fige sur le patrimoine, calculé selon le principe de prudence :

- trésorerie, y compris le séquestre ;
- stocks valorisés au **plus bas** du prix de référence et du prix moyen pondéré par les volumes sur 7 jours (avec un volume minimum ; à défaut, le prix de référence) ;
- bâtiments, palais compris, à leur coût de construction cumulé (matériaux au prix de référence), pour que l'investissement ne pénalise pas le classement.

Les 3 premiers et le top 10 % reçoivent des cosmétiques permanents. Un classement séparé récompense les guildes sur les grands chantiers.

## Économie et marché

L'économie repose sur un carnet d'ordres par ressource et par monde (pas par région), un PNJ teneur de marché permanent, et des sources et des puits de monnaie suivis chaque jour.

**Carnet d'ordres**

- **Ordre à cours limité** : prix + quantité, en achat ou en vente, valable 72 h maximum.
- **Ordre immédiat** : exécuté tout de suite contre le carnet (ordres des joueurs et du PNJ), avec un prix limite implicite à ±10 % du meilleur prix affiché ; la partie non exécutable est annulée, jamais laissée dans le carnet.
- Appariement prix puis temps : l'ordre le plus ancien au meilleur prix est servi en premier ; la transaction se fait au prix de l'ordre déjà présent.
- À la pose, la monnaie (achat) ou le stock (vente) est bloqué en séquestre ; annulation possible à tout moment.
- Au plus 10 ordres ouverts par joueur.
- Toute la monnaie est stockée en entiers (1 ducat = 100 deniers), jamais en flottants.
- L'appariement est sérialisé par carnet : un verrou transactionnel par couple (monde, ressource) empêche deux appariements simultanés sur la même ressource.

**PNJ teneur de marché (permanent)**

- Il place des ordres d'achat et de vente autour du prix de référence de chaque ressource.
- Son écart part de 4 % au lancement et s'élargit jusqu'à 20 % à J+14, puis reste à 20 %. Il sert alors de plancher et de plafond : les joueurs font mieux entre eux, mais le jeu reste jouable avec peu de monde connecté.
- Sa profondeur est plafonnée : une quantité maximale par ressource et par jour, réglée dans les paramètres du monde.
- Son prix de référence est fixé dans les paramètres du monde et ajustable sans redéploiement. Il suit le marché **à la baisse uniquement** : il cote autour du plus bas du prix de référence et du prix moyen pondéré sur 7 jours (comme la valorisation), sans descendre sous 50 % du prix de référence. Il ne peut donc pas être poussé à acheter cher, et il ne soutient pas un prix que les joueurs ont abandonné.
- Ses achats créent de la monnaie et ses ventes en détruisent ; tout passe par le grand livre, sur un compte système dédié.

**Sources de monnaie** (création)

- Ventes aux villes PNJ : chaque ville achète du pain, des briques et des planches selon une courbe de demande dont le prix baisse avec la quantité vendue dans la journée, puis se régénère. La capacité de chaque ville est fixée par joueur actif, pour que la demande suive la taille du monde.
- Paiements des grands chantiers.
- Achats nets du PNJ teneur de marché.
- Capital de départ : 1 000 ducats par joueur.

**Puits de monnaie** (destruction)

- Taxe de marché de 3 % sur chaque transaction entre joueurs, payée par le vendeur.
- Entretien des bâtiments en ducats, prélevé chaque jour ; il croît plus vite que le niveau (un bâtiment de niveau L coûte base × L × (1 + 20 % × (L − 1))). Un joueur qui ne peut pas payer ne peut plus lancer de production pendant 24 h.
- Part en ducats du coût de construction et d'amélioration, palais compris (le reste se paie en briques et en planches, qui ne sont pas un puits de monnaie).
- Ventes nettes du PNJ teneur de marché.

**Indicateurs de santé**

| Indicateur | Rôle | Cible |
| --- | --- | --- |
| Indice des prix du panier des 7 ressources (base 100 à J1) | Indicateur principal d'inflation | 80 à 130 chaque jour |
| Masse monétaire par joueur actif (argent des seuls joueurs actifs) | Garde-fou | ≤ 2,5 × le capital de départ toute la saison |
| Croissance de la masse monétaire par joueur actif | Diagnostic | Moyenne glissante sur 7 jours dans ±2 %/jour à partir de J+14 |
| Ratio monnaie créée / détruite par jour | Diagnostic | Alerte en dehors de 0,8 à 1,3 |
| Volume échangé entre joueurs vs avec le PNJ | Santé du marché | Part des joueurs > 50 % à J+14 |

**Paramètres d'équilibrage** : tous dans `worlds.settings` (JSON), modifiables sans redéploiement. Les montants sont en deniers et les taux en points de base (1 % = 100 points), pour rester en entiers. Les valeurs de Venise 1450, réglées avec le simulateur, sont dans `packages/engine/src/themes/venice1450.settings.ts` et expliquées dans `docs/calibration.md`.

## Comptabilité et invariants

Chaque mouvement de monnaie passe par un grand livre en partie double ; chaque mouvement de stock passe par un journal des stocks. Aucun solde n'est modifié sans écriture correspondante, ce qui rend la triche et les bugs traçables.

**Comptes du grand livre** : un compte de trésorerie et un compte de séquestre par joueur, un compte par guilde (V1), et des comptes système par monde : création (villes, chantiers, PNJ acheteur, capital de départ), destruction (taxes, entretien, construction, PNJ vendeur).

**Journal des stocks** : chaque entrée ou sortie (production, consommation, achat, vente, séquestre, livraison de chantier) écrit une ligne avec le joueur, la ressource, la quantité signée et le motif.

**Invariants vérifiés par les tests et chaque nuit en production** :

1. Chaque écriture est équilibrée (débit = crédit), garanti par la structure de la table.
2. Pour chaque compte, le solde stocké est égal à la somme de ses écritures.
3. Masse monétaire des joueurs = total créé − total détruit.
4. Pour chaque joueur et chaque ressource, le stock stocké (disponible + séquestre) est égal à la somme du journal des stocks.
5. Aucune trésorerie, aucun séquestre et aucun stock n'est négatif (contrainte en base).
6. Le séquestre de chaque joueur est égal au montant restant de ses ordres ouverts.

Un écart sur l'un de ces contrôles est une alerte bloquante.

## Architecture technique

Un seul code web sert PC et mobile ; la logique de jeu vit dans un paquet pur et testé, appelé par l'API, par la tâche planifiée et par le simulateur.

```
        Client web PWA (React + Vite, même code PC et mobile)
                     │  HTTPS + WebSocket
                     ▼
        Serveur API (Node + Fastify, REST + WebSocket)
          │                      │ transactions SQL
          ▼                      │
  packages/engine                │      Tâche planifiée (tick 60 s)
  production, marché,            │      expirations, PNJ, villes,
  grand livre, invariants        │      entretien, chantiers
  (fonctions pures,              │             │ écritures
   sans accès base)              ▼             ▼
          ▲         ┌──────────── PostgreSQL ────────────┐
          │         │ Couche compte (permanente)         │
  apps/simulator    │   accounts, worlds, themes,        │
  bots en mémoire   │   resources, recipes, telemetry    │
  → CSV Power BI    │ Couche monde (par saison)          │
                    │   players, buildings, orders,      │
                    │   trades, ledger, stock_movements… │
                    │   tout avec world_id               │
                    └─────────────────┬──────────────────┘
                                      │ vues SQL
                                      ▼
                                   Power BI
```

Le moteur n'accède jamais à la base : il reçoit un état, renvoie un nouvel état et la liste des écritures à passer ; c'est l'appelant qui écrit en base dans une transaction. Le simulateur utilise exactement le même moteur, ce qui garantit que l'équilibrage réglé en simulation est celui du jeu.

| Brique | Choix | Raison |
| --- | --- | --- |
| Interface | React + Vite + Tailwind, en PWA | Un seul code, installable sur mobile |
| Serveur | Node + Fastify, TypeScript | Même langage que l'interface et le moteur |
| Base | PostgreSQL + Drizzle ORM | Transactions fiables, verrous transactionnels pour le marché |
| Temps réel | WebSocket | Carnet d'ordres et prix en direct |
| Tâche planifiée | Tick toutes les 60 s | Expirations, PNJ, villes, entretien, chantiers (pas la production) |
| Simulateur | Script Node en mémoire | Équilibrage avant d'avoir des joueurs, sortie CSV |
| Hébergement | Railway, un seul service (API + web) depuis le Dockerfile | Déploiement depuis GitHub, PostgreSQL intégré ; quelques euros par mois au départ (à vérifier) |
| E-mails | Resend | Envoi des liens de connexion par API ; offre gratuite suffisante pour la bêta |
| Base locale | PGlite (PostgreSQL embarqué) | Développement et tests sans installer de serveur |

**Mondes** : un monde est une ligne de la table `worlds`, pas une machine. Ouvrir une nouvelle saison revient à créer un nouveau `world_id` rattaché à un thème ; la couche compte (profil, cosmétiques, historique) reste commune à tous les mondes.

**Mobile** : PWA au MVP. Sur iPhone, les notifications push ne fonctionnent que si la PWA est installée ; elles sont donc reportées en V1, avec un emballage Capacitor pour la présence en magasin d'applications.

## Modèle de données

Le modèle sépare trois couches : la couche compte, permanente ; le référentiel, rattaché à un thème ; la couche monde, remise à zéro à chaque saison, où toute table porte un `world_id`.

| Table | Couche | Contenu principal |
| --- | --- | --- |
| `accounts` | Compte | E-mail, pseudo, date d'inscription, cosmétiques possédés |
| `login_tokens` | Compte | Liens de connexion : empreinte SHA-256 du jeton, e-mail, expiration (15 min), usage unique |
| `sessions` | Compte | Sessions navigateur : empreinte du cookie, compte, expiration (30 jours) |
| `themes` | Référentiel | Nom (ex. Venise 1450), régions, villes |
| `resources` | Référentiel | Thème, code, nom, chaîne |
| `recipes` | Référentiel | Thème, bâtiment, intrants, extrants, durée, niveau requis |
| `worlds` | Compte | Thème, nom, dates de début et de fin, statut, paramètres d'équilibrage (JSON) |
| `players` | Monde | Lien compte × monde, région, trésorerie, séquestre, date d'arrivée |
| `buildings` | Monde | Joueur, type, niveau, recette en cours, heure de début |
| `inventories` | Monde | Joueur × ressource : quantité disponible, quantité en séquestre |
| `stock_movements` | Monde | Joueur, ressource, quantité signée, motif, référence |
| `orders` | Monde | Joueur, ressource, sens, type, prix, quantité restante, statut, expiration |
| `trades` | Monde | Ordre acheteur, ordre vendeur, prix, quantité, taxe, horodatage |
| `ledger_accounts` | Monde | Type (joueur, séquestre, système), propriétaire |
| `ledger_entries` | Monde | Compte débité, compte crédité, montant, motif, référence |
| `guilds`, `guild_members` | Monde | Nom, membres, rôles |
| `projects`, `project_deliveries` | Monde | Grands chantiers : ville, besoins, échéance ; livraisons par joueur et guilde |
| `events` | Monde | Événements de jeu (pénurie, tempête) avec effets et durée |
| `telemetry` | Compte | Journal d'événements analytiques (voir KPIs) |

Les prix de référence ne sont pas dans `resources` mais dans `worlds.settings`, pour pouvoir les ajuster par monde.

**Règles** : montants en entiers (`bigint`), horodatages en UTC, toute opération de marché dans une transaction SQL unique avec verrou par carnet, et des contraintes qui interdisent une quantité, une trésorerie ou un séquestre négatifs.

## Monétisation

Le jeu est gratuit et ne vend jamais de ressources, de monnaie de jeu ni de production ; les revenus viennent du confort d'analyse, du cosmétique et des saisons. Rien n'est développé au MVP, mais le modèle de données doit le permettre.

| Offre | Contenu | Phase |
| --- | --- | --- |
| Abonnement Négociant | Alertes de prix, graphiques avancés, historique long, export CSV de ses propres données, conseiller détaillé | V1 |
| Pass saisonnier | Récompenses cosmétiques à paliers sur la saison (blasons, styles de ville) | V1 |
| Cosmétiques à l'unité | Blasons, façades, bannières de guilde | V1 |
| Mondes privés | Monde dédié pour une communauté, une école ou une entreprise, facturé par saison | V2 |

**Garde-fou** : aucun avantage payant ne modifie la production, la trésorerie, la taille de la file de production ou le nombre d'ordres. L'abonnement aide à mieux décider, pas à produire plus. Le Jeton Sceau (monnaie de jeu achetable indirectement) est abandonné pour cette raison.

## Données personnelles

- Données collectées : e-mail, pseudo, événements de jeu. Rien d'autre.
- Mentions légales et politique de confidentialité en ligne dès la bêta.
- Télémétrie conservée 24 mois, puis agrégée ; les vues Power BI n'exposent pas l'e-mail.
- Suppression du compte sur demande depuis le profil : l'e-mail est effacé, le pseudo est anonymisé dans les classements passés.

## Roadmap par jalons

Le développement avance en 8 jalons ; chacun se termine par un critère vérifiable. Compter 4 à 6 mois en soirées et week-ends. L'équilibrage et le plaisir de jeu sont validés avant de durcir le moteur et l'interface.

1. **Moteur minimal et simulateur** (fait, voir `docs/calibration.md`) : `packages/engine` (production, ordres immédiats et à cours limité, PNJ, villes, taxe, entretien) en mémoire, et `apps/simulator` qui fait jouer 50 bots de profils différents pendant 42 jours.
   - Terminé quand : le simulateur produit un CSV journalier des indicateurs de santé, et ils restent dans les cibles sur 42 jours.
2. **Socle** (fait, en ligne sur Railway) : monorepo, base PostgreSQL, migrations, authentification par lien magique, déploiement en ligne.
   - Terminé quand : on se connecte depuis un téléphone sur l'URL de production.
3. **Tranche jouable** (code fait ; reste la semaine de test) : production, vente aux villes et ordres immédiats contre le PNJ, avec une interface sommaire mais utilisable sur mobile, et le tutoriel des 10 premières minutes.
   - Terminé quand : 5 à 10 personnes jouent une semaine et on a recueilli leurs retours.
4. **Grand livre et journal des stocks en base** : comptes, écritures, invariants, contrôle nocturne.
   - Terminé quand : un test de 10 000 opérations aléatoires vérifie les 6 invariants à chaque étape.
5. **Carnet d'ordres en base** : la logique d'appariement, de séquestre et d'expiration est déjà dans le moteur (jalon 1) ; ce jalon la persiste avec des verrous par carnet et traite la concurrence entre requêtes.
   - Terminé quand : les tests passent sur PostgreSQL, dont les cas concurrents (annulation pendant un appariement, deux ordres simultanés sur le même carnet).
6. **Interface soignée** : écran comptoir, écran marché (carnet + graphique de prix), conseiller, classement, responsive mobile.
   - Terminé quand : une session mobile de 3 minutes est faisable d'une main.
7. **Social et saison** : guildes, chat modéré, grands chantiers, cycle de vie du monde (ouverture, fin, classement figé, cosmétiques), bonus des arrivants tardifs.
   - Terminé quand : une saison accélérée de 2 jours se joue de bout en bout.
8. **Télémétrie et bêta** : événements analytiques, vues pour Power BI, mentions légales, bêta ouverte annoncée dans les communautés.
   - Terminé quand : le critère de sortie du MVP est atteint.

## KPIs et télémétrie

Chaque action importante écrit une ligne dans la table `telemetry` (compte, monde, type d'événement, horodatage, propriétés JSON) ; une vue SQL par famille d'indicateurs alimente Power BI.

| Famille | Indicateur | Cible bêta |
| --- | --- | --- |
| Rétention | J1 / J7 / J30 | 40 % / 20 % / 10 % |
| Engagement | Sessions par jour et par joueur actif | ≥ 3 |
| Engagement | Part des sessions jouées sur mobile | ≥ 40 % |
| Onboarding | Tutoriel des 10 premières minutes terminé | ≥ 70 % |
| Onboarding | Premier ordre à cours limité placé dans les 48 h | ≥ 50 % |
| Marché | Ordres exécutés par jour et par joueur actif | ≥ 2 |
| Marché | Écart moyen achat-vente entre joueurs, par ressource | < 10 % du prix |
| Marché | Part du volume échangé entre joueurs (hors PNJ) à J+14 | > 50 % |
| Économie | Indice des prix du panier (base 100 au jour 1) | 80 à 130 |
| Économie | Masse monétaire par joueur actif | ≤ 2,5 × le capital de départ |
| Équité | Indice de Gini du patrimoine à J+21 | < 0,6 |
| Social | Joueurs actifs membres d'une guilde | ≥ 50 % |
| Viralité | Invitations envoyées par joueur | ≥ 0,5 |

**Événements à journaliser dès le jalon 3** : `session_start`, `harvest`, `build`, `order_placed`, `order_cancelled`, `trade_executed`, `city_sale`, `guild_joined`, `project_delivery`, `invite_sent`, `tutorial_step`.

## Risques et parades

Le risque principal n'est pas technique : c'est un marché vide ou déséquilibré qui fait fuir les joueurs dans la première semaine.

| Risque | Parade |
| --- | --- |
| Marché vide | PNJ teneur de marché permanent, 7 ressources seulement, un seul carnet par ressource et par monde, ordres immédiats |
| Inflation ou déflation | Indice des prix et masse monétaire par joueur actif suivis chaque jour ; palais comme puits de fin de saison ; équilibrage réglé par le simulateur ; paramètres modifiables sans redéploiement |
| Manipulation du classement | Valorisation prudente des stocks (plus bas du prix de référence et du prix moyen sur 7 jours) ; détection d'échanges à prix aberrants |
| Vétérans qui écrasent les nouveaux | Saisons de 6 semaines ; bonus de +50 % pendant 72 h pour les arrivants après J+7 |
| Bots et multi-comptes | Un compte par e-mail vérifié ; détection des échanges répétés entre les mêmes comptes à des prix éloignés du marché |
| Bugs de duplication de monnaie ou de stock | Grand livre + journal des stocks ; 6 invariants testés et contrôlés chaque nuit |
| Jeu peu amusant malgré un moteur solide | Tranche jouable au jalon 3, avant le carnet complet et l'interface soignée |
| Multijoueur peu visible | Grands chantiers de guilde ; journal de bourse public |
| Toxicité dans le chat | Chat de guilde uniquement au MVP, filtre de mots, bouton de signalement |
| Périmètre qui gonfle | Toute idée hors MVP va dans `IDEAS.md`, pas dans le code |
| Acquisition | Communautés Reddit et Discord de jeux de gestion ; bêta ouverte annoncée au jalon 8 |

## Démarrer avec Claude Code

Les règles de travail sont dans `CLAUDE.md` à la racine. Avancer jalon par jalon, avec un prompt par jalon, en mode plan :

1. « Lis docs/CADRAGE.md et CLAUDE.md. Propose l'arborescence du monorepo et le plan du jalon 1 (moteur minimal et simulateur), sans coder. »
2. « Implémente le jalon 1 : tests d'abord pour packages/engine, puis le simulateur de 50 bots sur 42 jours avec un CSV d'indicateurs journaliers. »
3. « Jalon 2 : socle et déploiement sur Railway ou Fly.io. »
4. « Jalon 3 : tranche jouable avec le tutoriel des 10 premières minutes. »
5. « Jalon 4 : écris d'abord les tests des 6 invariants, dont le test de 10 000 opérations aléatoires, puis le grand livre et le journal des stocks en base. »
6. « Jalon 5 : liste tous les cas limites du carnet d'ordres, écris les tests, puis le moteur et les verrous. »

**Conseils pratiques**

- Le CSV du simulateur se branche directement dans Power BI : règle l'équilibrage là, avant d'avoir de vrais joueurs.
- Garde le moteur pur : tout ce qui est testé en simulation doit être exactement ce qui tourne en production.
- Si ton jeu de gestion existant a un moteur de production réutilisable, montre-le à Claude Code au jalon 1.
