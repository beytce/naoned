# Plan d'action : les familles et la société vénitienne

> **Abandonné (octobre 2026).** Les familles sont remplacées par les guildes, leurs carats et leurs votes, et par les guerres de concessions : voir `docs/CADRAGE.md`, section « Guildes, guerres de concessions, Rialto nécessaire ». Les phases suivantes ci-dessous ne sont pas prévues ; certaines idées (commandite, prêts) restent dans `IDEAS.md`.

11 octobre 2026. Suite de la réflexion sur les activités de l'époque : chaque activité ouvre une possibilité nouvelle, met des joueurs face à face et préserve l'économie.

## Principes

1. **Multijoueur d'abord** : chaque activité met des joueurs ensemble (alliés, rivaux, débiteurs), et ce qui se passe entre eux se voit dans le monde (classement, gazette, carte). Les maisons marchandes PNJ jouent aussi ces activités pour qu'un monde peu peuplé reste vivant.
2. **Aucune nouvelle source de monnaie** : une activité redistribue entre joueurs (masse monétaire stable) ou détruit des ducats (puits). Les seules créations restent des budgets existants, redistribués.
3. **Une possibilité, pas un multiplicateur** : une faveur ouvre une commande, une route ou un droit, jamais un rendement de production.
4. **Pass Négociant** : information et confort seulement ; jamais un meilleur taux, plus de votes, une dot moins chère.
5. **Tout réglé dans `worlds.settings`**, validé au simulateur (toutes les graines conformes et `--pass 0.2`) et documenté dans `docs/calibration.md`.

## Phase 1 : les familles patriciennes (faite)

Quatre grandes familles se disputent l'influence chaque semaine. Chaque marchand prête allégeance à l'une d'elles pour la saison ; les membres la font monter **ensemble**.

| Famille | Domaine | Ce qu'elle commande |
| --- | --- | --- |
| Contarini | Les bâtisseurs | Briques, planches |
| Morosini | La terre ferme | Blé, farine, pain, bois |
| Mocenigo | La mer | Sel, vin, planches |
| Dandolo | Le Levant | Épices, soie, fourrures, draps |

Chaque famille demande des marchandises de plusieurs régions ou d'outre-mer : la servir oblige à commercer avec les autres.

| Règle | Détail |
| --- | --- |
| **Allégeance** | Ouverte quelques jours après l'arrivée (`families.openDay`), une fois pour la saison. Le nombre de membres de chaque famille est affiché au choix |
| **Commande de famille** | Une par jour et par membre, dans le domaine de la famille, payée avec la même prime que les commandes du Doge. Le Doge passe de 3 à 2 commandes par jour : le budget de monnaie créée ne bouge pas |
| **Mécénat** | Don de ducats à sa famille (chapelle, fresque, fête), plafonné par jour. Les ducats sont **détruits** : c'est un puits, qui coûte du patrimoine |
| **Influence** | Une commande et chaque tranche de mécénat rapportent de l'influence à son auteur, pour la semaine et pour la saison |
| **Classement des familles** | Chaque semaine : somme de l'influence de chaque membre (plafonnée par membre) divisée par le nombre de membres actifs (au moins `minMembers`). Une petite famille assidue peut battre une grande famille passive, et rejoindre la famille en tête ne suffit pas pour gagner |
| **Famille au pouvoir** | La famille gagnante tient la Seigneurie la semaine suivante : ses membres touchent une prime de plus sur leurs commandes de famille (bornée : une commande par jour), et chacun en est notifié |
| **Contumacia** | À Venise, on ne pouvait pas enchaîner deux fois la même charge : la famille au pouvoir compte son score un tiers plus bas. Sans cette règle, au simulateur, la famille aux commandes les plus faciles gagnait 12 semaines sur 15 |
| **Champion** | Le meilleur contributeur de chaque famille de la semaine est affiché au classement des familles |
| **Visibilité** | Écran Familles : classement en direct, membres et leurs contributions de la semaine, famille au pouvoir |

Économie : la commande de famille remplace une commande du Doge (création inchangée, sauf la prime de la famille au pouvoir, petite et plafonnée), et le mécénat est un nouveau puits. Ni l'influence ni le mécénat ne comptent dans le patrimoine.

Pass Négociant : pas d'avantage dans cette phase. L'échange de commande du Pass reste limité aux commandes du Doge.

Livraison :

1. Moteur (tests d'abord, fixture figée) : paramètres, état, commandes `joinFamily`, `fulfillFamilyOrder`, `patronize`, clôture hebdomadaire dans le tick.
2. Maisons PNJ : elles choisissent une famille, livrent ses commandes et font du mécénat selon leur profil.
3. Simulateur : influence et mécénat par famille, vainqueurs des semaines, puits du mécénat ; réglage de Venise et `docs/calibration.md`.
4. Serveur : actions, vue (familles, membres, contributions), notifications (famille au pouvoir, résultats de la semaine).
5. Interface : onglet Familles dans Contrats (choix, commande du jour, mécénat, classement, membres).

## Phase 2 : les mariages entre maisons

Un pacte d'une saison entre deux joueurs, scellé par une dot détruite des deux côtés (puits). Les époux partagent un nom de Maison dans un classement de Prestige (influence et mécénat, Renommée seulement), voient les convois et les offres l'un de l'autre, et peuvent se livrer des marchandises entre eux. On peut s'unir hors de sa famille : c'est un pont entre factions. Garde-fous : un mariage par saison, transferts plafonnés et suivis par le rapport des paires suspectes.

## Phase 3 : la commandite (*colleganza*)

Financer le convoi d'un autre joueur : l'investisseur avance des ducats, 3/4 du bénéfice pour lui, 1/4 pour le capitaine ; une prise des corsaires réduit les parts au prorata. Parts fixées par la règle (pas de transfert déguisé). Les familles de la mer et du Levant gagnent de l'influence sur les commandites de leurs membres.

## Phase 4 : l'enchère des galères (*incanto*)

Chaque semaine, la République met aux enchères quelques places sur les lignes d'Alexandrie et de Flandres (escorte d'État, prime de vente). Les ducats des enchères gagnantes sont détruits : le puits de fin de saison des joueurs riches. Enchère individuelle ou en commun au sein d'une famille.

## Phase 5 : les prêts du Rialto et le Grand Conseil

- **Prêts** : carnet de prêts entre joueurs, de 1 à 7 jours, taux plafonné (usure), gage en marchandises sous séquestre (jamais un navire ni un atelier), défaut publié dans la gazette.
- **Grand Conseil** : chaque semaine, vote d'un décret parmi trois (tous réglés à l'avance), poids selon le niveau du palais ; la famille au pouvoir propose les décrets.

## Plus tard

- Assurance maritime (après une détection de collusion assureur-corsaire).
- Dynastie entre saisons : chaque saison est une génération de la Maison ; récit et cosmétiques seulement (couche compte).
- Pass : registre de solvabilité, alertes de commandite, décompte du Conseil en direct.
