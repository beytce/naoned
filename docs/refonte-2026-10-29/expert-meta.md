# Fondaco sans remise à zéro : le méta-jeu, le social, le rythme et la rétention

*Note d'expert, 29 octobre 2026. Angle : le méta-jeu, les liens entre joueurs, le live-ops et la rétention dans un monde persistant (Hades' Star, Clash of Clans et Clash Royale, Rise of Kingdoms, EVE Online, Albion, Travian). Je n'ai rien modifié dans le dépôt.*

Lu : le cadrage, l'audit du 27 octobre, les plans (rupture, Terraferme, PvE, Campagne), les recommandations du 20 octobre, `IDEAS.md`, les écrans de `apps/web/src/game` et les modules de `packages/engine/src`.

---

## 0. La thèse en une page

Le reset mensuel faisait cinq choses à la fois. Il **égalisait** les chances. Il donnait une **finale** au mois. Il offrait un **nouveau départ** à qui avait raté le sien. Il **purgeait** l'inflation et les monopoles. Et il **renouvelait** le contenu, puisque rejouer le mois *était* le contenu. Le supprimer sans remplacer ces cinq fonctions donne un Sim Companies : riche, lent, et dominé par les vétérans.

Ma proposition tient en trois phrases :

> **1. La puissance grandit sans fin, mais le contenu se joue par bandes de puissance.** C'est la leçon d'Hades' Star (Étoiles rouges par niveau, Étoiles blanches appariées par force). Le vétéran est une légende qu'on voit ; il n'est pas un prédateur qu'on croise.
>
> **2. La Compagnia, c'est-à-dire la guilde, devient la cellule du jeu.** Elle porte l'entraide quotidienne, le contenu coopératif de la semaine et la guerre de guildes. On ne revient pas des années pour un tableur, mais pour ses quinze associés.
>
> **3. Les saisons courtes ne survivent qu'à deux endroits.** D'abord la Terraferme, une arène d'une semaine qui *nourrit* le permanent sans le *déséquilibrer*. Ensuite le calendrier politique et historique : un Doge chaque mois, et une « ère » chaque trimestre, qui fait avancer Venise de 1450 vers 1453 et au-delà. Le mois cesse d'être une partie. Il devient un **chapitre**.

Le joueur doit pouvoir dire, au bout d'un an : « J'ai commencé avec une charrette à Mestre. Aujourd'hui j'ai un palais sur le Grand Canal, trois comptoirs, une flotte de la Muda, un siège au Sénat. Ma compagnie a tenu Padoue tout l'hiver, et j'ai formé deux apprentis qui sont devenus nos meilleurs condottieri. »

---

## 1. Ce que le reset faisait, et ce qui le remplace

| Fonction du reset | Ce qui la remplace dans un monde persistant |
| --- | --- |
| **Égalité des chances** | Les **bandes de puissance** : toute compétition (Terraferme, Sfida, guerre de guildes, expéditions) apparie par Rang de Maison. Protection longue des nouveaux (§ 5) |
| **Une finale par mois** | L'**élection du Doge** reste mensuelle. La **fin d'ère**, chaque trimestre, est la grande finale |
| **Un nouveau départ** | La **réorientation sans perte** : changer de spécialité, de région de cœur ou de compagnie coûte du temps, jamais ce qu'on a bâti. À côté, la Terraferme donne un nouveau départ chaque lundi, pour qui veut se battre |
| **La purge de l'inflation et des monopoles** | Des **puits volontaires et désirables** (le palais, le Fondaco de la compagnie, les œuvres publiques, la guerre qui mange les marchandises), une **décime** progressive sur les fortunes oisives |
| **Le renouvellement du contenu** | Du **contenu systémique**, produit par les joueurs eux-mêmes : la politique, la Terraferme, les guerres de guildes, le marché. À côté, un **calendrier historique** écrit à l'avance, une ère par trimestre |

Règle de conception que je propose d'écrire en tête du nouveau cadrage :

> **Rien de ce que le joueur a bâti ne se perd. On ne le punit jamais d'avoir été absent. Seules les positions contestées (Podestà, Doge, palais, Terraferme) se perdent, parce que d'autres les prennent.**

---

## 2. La forme de la progression, vue du méta-jeu

Le détail revient à l'expert de la progression ; le méta-jeu a besoin de **quatre axes lisibles** et d'**un seul chiffre de puissance**.

### 2.1 Quatre axes, à la manière des modules d'Hades' Star

| Axe | Ce qui grandit | Ce que le joueur ressent |
| --- | --- | --- |
| **Le Comptoir** (profondeur) | Les ateliers jusqu'au niveau 10 et au-delà, puis les manufactures et les chaînes de luxe (verre, drap, épices) | « Je produis des choses que les débutants ne savent pas faire » |
| **Le Réseau** (largeur) | Des comptoirs secondaires (Mestre, Padoue, puis la Lombardie, le Frioul, et le Levant par la Muda), des véhicules, des routes, le fattore qu'on améliore | « Ma Maison est sur la carte, partout » |
| **La Maison** (les gens) | Les membres de la famille, qui deviennent des **agents** : le fattore, le capitaine de galère, le condottiere, l'ambassadeur. Chacun progresse et prend un rôle | « Ce sont *mes* gens, ils ont un nom » |
| **Le Rang** (le statut) | Le *cursus honorum* vénitien : Popolano, Cittadino, Mercante, Patrizio, Senatore, Procuratore. On le gagne par des actes publics et des contributions à la République, pas par le chiffre d'affaires seul | « On me reconnaît » |

### 2.2 Les longues attentes, celles qu'on aime

Le joueur mobile aime les attentes **qui portent une décision** et qui durent **plus longtemps que son absence**, comme les améliorations de plusieurs jours d'Hades' Star.

- **Un ou deux chantiers en parallèle** (le second se gagne, il ne s'achète jamais). Leur durée grandit avec le niveau : 10 minutes au début, 2 jours au niveau 8, 5 jours pour une manufacture de haut niveau.
- **Une file de production longue, qui couvre la nuit.** On lance ses longues recettes à 21 h 45, on retrouve le résultat au réveil. La file de 8 h punissait le sommeil : 12 h pour tous, jamais vendue.
- **Les expéditions de la Muda**, de 1 à 3 jours, et les **voyages d'agents**.

Il faut toujours trois horloges à des échelles différentes : la récolte (heures), le chantier (jours), l'ambition (semaines). Le joueur qui ouvre l'application trouve au moins une horloge arrivée à terme.

### 2.3 Un seul chiffre de puissance : le Rang de Maison

C'est un score calculé à partir de ce qui est **bâti** (ateliers, réseau, agents), et non de la caisse, pour qu'on ne puisse pas le gonfler en accumulant des ducats. C'est « l'influence » d'Hades' Star. Il sert **uniquement à apparier**. On l'affiche sobrement (« Maison de rang 34 ») et on le découpe en **bandes** : Bottega, Casa, Ca', Palazzo, Fondaco, et ainsi de suite.

---

## 3. Le rythme

### 3.1 Les 5 minutes : « la tournée »

Une session type sur mobile, toujours dans le même ordre, en moins de cinq minutes :

1. **Tout ramasser** (l'action en or, déjà là) : récoltes, chantiers terminés, retours de mules et de galères.
2. **Relancer** les files. La file d'attente préparée (« répéter ma file ») fait que relancer prend un geste.
3. **Répondre à la compagnie** : une demande d'aide en attente (§ 4.2), un signal sur la carte de la Terraferme.
4. **Un choix qui compte** : la Lettre du jour, une rumeur du Broglio, une enchère à laisser pour la Sera, un front à lancer.
5. **Repartir sur une question ouverte** : « Galère de Flandre en vue demain 9 h », « Morosini à 3 points de vous à Padoue ».

On joue **bien** avec deux tournées par jour, **mieux, pas plus**, avec cinq : l'assidu gagne des **occasions** (la Sera, un front, une urgente), pas un multiplicateur.

### 3.2 Ne jamais culpabiliser

Sans reset, l'obligation devient **toxique** : une série perdue après huit mois, c'est un désinstallement.

| Aujourd'hui | Devient |
| --- | --- |
| Coffre du jour avec série, tâches du jour | **Le Carnet de la semaine** : 10 à 12 objectifs à remplir n'importe quand du lundi au dimanche. Le budget est hebdomadaire, sans série à casser. On peut en rattraper deux de la semaine précédente |
| Produits frais (+5 % en 30 minutes) | Supprimé : c'est une prime à la surveillance de l'écran |
| Ressources qui s'abîment, entretien | **Jamais.** Un bâtiment n'a pas d'entretien qui court pendant l'absence |
| Retour après une absence | **« Le retour du marchand »** : un résumé de ce qui s'est passé (Annales, compagnie, prix), des files qui ont tourné jusqu'au bout, et un **vent en poupe** : les objectifs du Carnet comptent double pendant 3 jours après 7 jours d'absence |

Ce qui fait revenir est **le désir** (la Lettre, la jauge, l'associé qui attend ses planches), jamais la peur d'une perte.

### 3.3 La journée

| Heure (Paris) | Rendez-vous |
| --- | --- |
| 8 h | Le Broglio (deux rumeurs), la Lettre, l'ouverture du monde |
| 8 h – 20 h | Les vagues de commandes, la jauge de Signoria, la Terraferme qui avance seule |
| 12 h 30 | **La Condotta** de la compagnie (Red Star) : une fenêtre de convocation, pas une obligation |
| 20 h – 20 h 30 | **La Sera** : l'incanto des galères, l'heure de bataille de la Terraferme, les résultats du jour |
| 21 h 45 | « Lancer la nuit » : le geste qui prépare les files de 12 h |
| 0 h | La Signoria désigne ses Podestà |

### 3.4 La semaine : un calendrier fixe, comme les guerres de clans

| Jour | Ce qui se passe |
| --- | --- |
| **Lundi** | Nouvelle carte de la Terraferme, placement (24 h). Le Carnet de la semaine se renouvelle. Nouvelles Sfide |
| **Mardi – mercredi** | Expansion sur la Terraferme. Les expéditions de compagnie s'ouvrent (§ 4.3). Demandes de guerre au Rialto |
| **Jeudi** | Inscription des rosters pour la Contesa de la semaine suivante (§ 4.4) |
| **Vendredi – samedi** | Pic de la Terraferme. La Sera prolongée le samedi (deux incanti) |
| **Dimanche** | Clôture de la Terraferme et des Sfide. **Le Gazzettino de la semaine** : les Annales, les palmarès, les promotions de bande |

### 3.5 Le mois et le trimestre : des chapitres

- **Le mois** a sa finale politique : l'élection du Doge pendant la dernière semaine, et le décret du Doge qui vaut tout le mois suivant. Le mois porte aussi **une foire** : la Sensa, le Carnaval, la foire de Padoue. : deux à quatre jours, un objectif commun du serveur à paliers (`plan-pve.md`, piste D).
- **Le trimestre est une ère** : 1450 « Les comptoirs », 1451 « La guerre de Lombardie », 1452 « L'ouverture du Levant », 1453 « La chute de Constantinople ». Chaque ère apporte une **ouverture de contenu** pour tous (une région, une chaîne, une route de galère, un type d'agent) et un **événement du monde** qui rebat les prix (la chute de Constantinople ferme une route, en ouvre une autre). Elle se clôt sur une fin d'ère : couronnement dans chaque bande, médailles aux Annales, cosmétiques datés (« Vétéran de 1453 »).

C'est le cœur du live-ops : **l'histoire réelle est un calendrier de contenu gratuit**, déjà écrit, que tout le monde comprend. Annoncée trois mois à l'avance, elle donne un **horizon** : « être prêt pour le Levant ».

---

## 4. Le social : la Compagnia comme pilier

### 4.1 La forme

La guilde actuelle (2 à 6 amis, ni trésor ni avantage) est le bon germe. Elle doit devenir la **corporation d'Hades' Star**.

- **Taille** : 5 à 25 associés, et 30 au plus avec le Fondaco de compagnie au niveau maximal.
- **Rôles officiels** : le *Capo* (fondateur ou élu), deux à quatre *Consiglieri* (ils convoquent, acceptent, organisent la Contesa) et le *Cassiere* (il gère le trésor).
- **Vocations libres** affichées sur la fiche de chaque associé : Producteur (avec sa chaîne), Roulier, Condottiere, Banquier, Émissaire. Elles ne donnent aucun bonus. Elles servent à lire le roster : « Il nous manque un briquetier ».
- **Succession automatique** : un Capo absent 7 jours cède sa place au Consigliere le plus actif. C'est la première cause de mort des corporations d'Hades' Star et des clans de Clash.
- **Une compagnie à la fois.** La quitter impose 3 jours d'attente, au lieu de 7 aujourd'hui, pour ne pas enfermer.

### 4.2 L'entraide de tous les jours : les demandes

C'est le mécanisme qui a fait la rétention de Clash Royale : les **dons de cartes**.

- Toutes les 8 heures, chaque associé peut **demander** un lot d'un bien (par exemple 30 planches).
- Un autre associé le **fournit** en un geste depuis son stock. Pour respecter l'économie, ce n'est pas un don : c'est une **vente automatique au prix de référence**, inscrite au grand livre et au journal des stocks, sans taxe du Rialto. Le fournisseur gagne en plus du **Mérite de compagnie** et des points de Rang.
- Plafonds : un associé de moins de 3 jours ne fournit rien. Le volume fourni par jour et par compte est plafonné (contre les doubles comptes).

Effet recherché : chaque tournée comporte un **geste pour quelqu'un d'autre**, avec un nom et un merci. C'est l'obligation sociale positive qui manquait (P5 de l'audit).

### 4.3 Le contenu coopératif : trois formats

| Format | Modèle | Règle | Récompense |
| --- | --- | --- | --- |
| **La Condotta** (existe, à enrichir) | Étoiles rouges | Une partie en direct de 10 minutes, de 1 à 4 associés, contre les nations de 1450. **Paliers 1 à 12**, ouverts par la victoire du palier précédent *et* par le Rang de Maison. Une partie récompensée par jour | Des **Sceaux** (aujourd'hui, rien qu'un grade) : une monnaie rare qui débloque agents, plans de manufacture et cosmétiques, plus nombreux aux hauts paliers |
| **L'Expédition** (nouveau, asynchrone) | Étoiles bleues ou expéditions d'Albion, en différé | La compagnie arme une galère vers Bruges, Alexandrie ou Constantinople : 3 à 6 associés chargent des marchandises (il faut les trois régions), puis trois jours de voyage avec une décision collective par jour. **Difficulté par palier** choisie au départ | Les biens de la Muda (épices, soie), répartis au prorata, plus des Sceaux. Jamais de ducats gratuits |
| **Le Grand Ouvrage** (le chantier de compagnie) | Le niveau de corporation | La compagnie bâtit son **Fondaco** sur le Grand Canal, niveau par niveau. C'est un très gros puits de briques, de planches et de ducats | Chaque niveau ouvre des options **communes et plafonnées** : un entrepôt partagé, un fil d'expédition de plus, un emplacement de Condotta, des cosmétiques. **Jamais de rendement de production** |

### 4.4 La guerre de guildes : la Contesa, sur la Terraferme

Pas de nouveau moteur : l'audit (P6) a raison, il y a trop de systèmes.

- **La Terraferme alterne ses semaines.** Semaines impaires : chacun pour soi avec des alliances, comme aujourd'hui. Semaines paires : la **Contesa**, compagnie contre compagnie.
- **L'appariement à la White Star** : la compagnie inscrit un **roster** de 5, 10 ou 15 associés. Le serveur apparie deux à quatre compagnies dont la puissance du roster est voisine (somme des Rangs de Maison). Un associé inscrit est engagé pour toute la semaine.
- **La guerre mange les marchandises** (R1) : le pain des troupes et les matériaux des forts sortent du stock des associés. Les associés non inscrits peuvent **ravitailler** leur roster par les demandes (§ 4.2). Le marchand pacifique devient utile à la guerre.
- **Les récompenses vont au permanent, sans déséquilibrer** : des Sceaux pour chaque participant, un **trophée** (une pièce du Fondaco de compagnie), des points de **Lustre de compagnie** (l'échelle des compagnies) et le blason de la gagnante sur les villes tenues jusqu'à la Contesa suivante.

### 4.5 Le commerce entre joueurs : la réputation comme capital

Dans un monde sans reset, **la parole tenue** devient une richesse. On la rend visible :

- Des **contrats de fourniture** de longue durée (`partners.ts` existe) : par exemple, « 200 briques par semaine à Dandolo pendant un mois, à prix fixé ».
- Une **réputation de marchand** publique, calculée sur les contrats honorés et non honorés, et affichée sur la fiche. Elle se construit en mois et se détruit en un jour.
- Le **roulage** (IDEAS.md) : confier une cargaison à la mule d'un autre joueur.
- Les **parts de Maison** prennent leur sens : dans un monde persistant, une Maison cotée *dure*, les dividendes s'accumulent, et l'on peut parier sur un jeune talent.

### 4.6 La politique de Venise : des institutions qui durent

Sans reset, la politique peut enfin avoir une **mémoire**.

| Institution | Accès | Pouvoir |
| --- | --- | --- |
| **Le Podestà** d'une ville (existe) | La jauge quotidienne de Signoria | Le droit de porte et une avance d'une demi-heure. On garde le plafond de 3 villes. **Le plafond par bande est essentiel** (§ 7) |
| **Le Grand Conseil** | Tout Patrizio et au-dessus | Il vote les « œuvres publiques » de la foire du mois, c'est-à-dire laquelle des trois sera lancée |
| **Le Sénat** | Les 30 premiers du *cursus*, plus un siège par compagnie de premier rang | Il présente les candidats au Doge et vote la ville favorisée de l'ère |
| **Le Doge** | Élu chaque mois, sans réélection consécutive (la *contumacia*). Il ne peut pas se représenter avant 3 mois | Le mutateur et le décret du mois, son portrait à la connexion, sa ligne aux Annales |
| **Le Conseil des Dix** | Tiré au sort chaque mois parmi les Senatori actifs | Il peut annuler le décret du Doge du mois *suivant* (règles stables) et démasquer un espion |

Les **histoires** naissent de la combinaison : compagnies devenues **partis** à l'élection, programmes publics, trahisons à la Terraferme, Broglio, espions, parts. Tout cela est **déjà codé** ; la persistance leur donne une suite.

### 4.7 Les Annales de Venise

C'est une page publique, partageable, persistante. On y lit les Doges et leurs décrets, les guerres de compagnies et leurs vainqueurs, les Podestà les plus longs, les premières Maisons à atteindre le Levant, les palais bâtis. **Écrite par le serveur à partir des événements**, sans texte libre. C'est l'outil d'acquisition principal d'un monde ancien : « ce monde a une histoire, entrez-y ».

---

## 5. Le monde partagé : arriver, rattraper, partir, revenir

### 5.1 Arriver dans un monde ancien

Le risque n° 1 (Travian, OGame, Rise of Kingdoms). Six parades, à cumuler :

1. **La protection de bande.** Pendant les 30 premiers jours, et tant que son Rang reste dans la première bande, le nouveau ne peut être la cible ni d'un espion, ni d'une fausse rumeur, ni d'un front de la Terraferme lancé par un joueur d'une bande supérieure. Il ne paie pas le droit de porte d'un Podestà.
2. **La Terraferme par théâtres** (déjà dans IDEAS.md, E2-11) : une carte par bande, de 20 à 40 marchands. Le débutant affronte des débutants.
3. **Le rattrapage par le coût.** Les premiers niveaux d'atelier et de réseau deviennent moins chers à mesure que le monde vieillit, en fonction du niveau médian des actifs. Le haut de la progression n'est jamais rabaissé.
4. **Le vent en poupe** : sous la médiane de sa cohorte d'âge, le joueur gagne des points de Rang et de Carnet majorés. **Pas de rendement de production majoré**, pour ne pas fabriquer d'alts.
5. **L'apprentissage (le *garzone*).** Un nouveau peut se placer comme apprenti d'une Maison d'une compagnie qui a coché « accueille les nouveaux ». Le maître gagne des Sceaux et du Rang à chaque jalon de l'apprenti (atelier de niveau 5, première Sfida, premier Podestà). L'apprenti reçoit un **contrat de démarrage** : sa production achetée au prix de référence pendant 14 jours. C'est le modèle d'EVE University.
6. **Le premier mois reste une partie.** Les 30 premiers jours forment un **arc écrit** (la Lettre de Faraj, déjà écrite, et des objectifs vers la première compagnie, la première Terraferme, le premier contrat), avec sa finale : l'**entrée au Livre d'Or**.

### 5.2 Les mondes

Un seul monde par langue tant que possible : la liquidité du Rialto prime. On n'ouvre un monde jeune que sur un signal mesuré (plus de 4 mois pour qu'un nouveau atteigne la bande médiane, ou plus de 1 500 actifs) ; les mondes partagent le cursus et les cosmétiques, jamais l'économie. Pas de fusion de mondes sans données : elle casse les Annales et les marchés.

### 5.3 Les inactifs

Un monde persistant se remplit de maisons fantômes, comme les vieux serveurs de Travian.

| Absence | Effet |
| --- | --- |
| 3 jours | Le Podestà perd sa jauge normalement (elle décroît de 50 % par nuit) |
| 7 jours | Il quitte les rôles de compagnie (succession automatique) ; ses demandes d'aide sont retirées |
| 14 jours | **La Maison s'endort** : retirée des classements visibles, des appariements et des cartes. Elle ne produit plus au-delà d'une file pleine. Rien n'est perdu |
| 30 jours | Le palais du Grand Canal est **mis en location** : il reste à lui, mais l'emplacement est confié à un autre jusqu'au retour (le locataire a la vitrine, l'absent garde son bien) |
| Retour | Tout se réveille. « Le retour du marchand » (§ 3.2). L'emplacement est rendu dès qu'un emplacement de même rang se libère |

Rien ne se **pille** jamais pendant une absence.

### 5.4 La fin de jeu ouverte

Le joueur au sommet ne doit jamais se dire « j'ai fini ». Six boucles sans fin :

1. **La politique**, avec le Doge, le Sénat et le Conseil des Dix.
2. **La Contesa de première bande** : être la meilleure compagnie de Venise, chaque quinzaine.
3. **Le palais**, bâti étage par étage, à des coûts exponentiels de pure vanité.
4. **Les paliers les plus hauts** de la Condotta et de l'Expédition, avec un classement du monde par palier.
5. **La spéculation et la finance** : les parts, les contrats, la banque des compagnies.
6. **La transmission** : former des apprentis, fonder une compagnie fille, léguer un agent à un associé.

---

## 6. La monétisation honnête

Sans reset, la tentation de vendre de la vitesse grandit : les cristaux d'accélération sont le talon d'Achille d'Hades' Star.

**Règles.** On ne vend jamais de ducats, de ressources, de temps (accélérations), de chantier en plus, de file plus longue, de troupes ni de Sceaux. Aucun avantage dans les bandes, à la Terraferme ou à la Contesa. Les cosmétiques de *rang* (corno du Doge, façade de Procuratore) se méritent. Le **Rapport de la Banque** publie ce qui a été vendu.

| Offre | Contenu | Prix indicatif |
| --- | --- | --- |
| **Le Patronato** (abonnement) | Des outils d'information : historique des prix sur 90 jours, alertes de prix et de commandes, le tableau de bord étendu, des préréglages de file (le même geste en plus confortable, **pas** en plus long). Une façade ou une bannière par mois, à garder. Le « Patron » discret sur le blason | 4,99 € par mois |
| **Le Mécénat de compagnie** | Un associé offre le Patronato à 5 ou 10 associés pour un mois. L'acte se voit dans le fil et aux Annales de la compagnie (« Contarini a doté la compagnie ») | 14,99 € et 24,99 € |
| **Les cosmétiques** | Façades et étages décoratifs du palais, gondoles, bannières de compagnie, portraits de la dynastie, sceaux de lettre | 1,99 € à 9,99 € |
| **Les mondes privés** (V2) | Un monde dédié pour une communauté | Sur devis |

Le mécénat de compagnie est l'offre la plus saine du genre : l'argent **renforce le lien social** au lieu de creuser un écart.

---

## 7. Ce qu'on garde, transforme ou supprime

| Système actuel | Décision | Ce qu'il devient |
| --- | --- | --- |
| Saisons mensuelles avec remise à zéro | **Supprimé** | Le mois est un chapitre politique et une foire. L'ère, chaque trimestre, apporte du contenu |
| Terraferme hebdomadaire | **Gardée, renforcée** | Seule « partie » qui repart à zéro, chaque semaine. Théâtres par bande. Contesa une semaine sur deux. Elle nourrit le permanent par des Sceaux, des trophées et le Lustre |
| Classement mensuel des ventes nettes | **Transformé** | Un classement **par bande et par semaine**. Le patrimoine total n'est jamais un classement public : il ne montrerait que l'écrasement |
| Lustre et Sfida | **Gardés** | Le Lustre devient l'échelle de **performance dans sa bande**. La Sfida apparie dans la même bande. Le « deux paliers plus bas au changement de mois » devient une **décroissance douce par ère** : l'échelle est compétitive, pas la Maison |
| Dynastie et héritier | **Transformée** | La famille devient la collection d'**agents** (§ 2.1). Une génération par **année** de jeu, cérémonie qui ne retire rien : l'héritier hérite de tout, le patriarche devient un « Ancien » (une option permanente) |
| Atouts hebdomadaires | **Transformés** | Une **collection permanente de personnages** (le Banquier, l'Ingénieur, la Courtisane…), débloqués par des exploits. On en **équipe 3** à la fois, on change au lundi. |
| Lettre du jour | **Gardée, prolongée** | Un **feuilleton sans fin** en arcs de 30 jours, avec des drapeaux persistants : la veuve Contarini se souvient de vous six mois après |
| Missions de la Maison et Influence | **Fusionnées** | L'Influence devient une monnaie politique : voix, Broglio, candidature. Les missions passent dans le Carnet |
| Coffre, tâches, série, ballots, actes, Renommée, niveau, maîtrises, commandes de compagnie, Pass | **Supprimés ou fondus** | Dans le Carnet de la semaine (§ 3.2), l'Expédition, les ères, le *cursus*, les Atouts équipables, les demandes, le Patronato (§ 6). La guilde devient la Compagnia (§ 4) ; Doge, Broglio et Condotta sont gardés (§ 4) |
| Grand Canal | **Transformé** | Les 40 emplacements deviennent **de l'immobilier persistant** : on en achète un aux enchères de fin d'ère, on y bâtit, on le perd seulement par l'inactivité (§ 5.3) ou en le vendant. Hors des 40, son palais dans un sestiere, tout aussi bâtissable |
| Signoria et Podestà | **Gardés** | Plafond de 3 villes par Maison, et **1 ville par bande au-dessus de la troisième** dans les villes « de départ » : Mestre et Trévise restent disputables par les débutants |
| Parts de Maison | **Gardées, prolongées** | Plus de rachat obligatoire en fin de mois. Il faut une valorisation continue, à voir avec l'expert de l'économie |
| La Sera et l'incanto | **Gardés** | Le cœur synchrone. Un lot par bande, pour que le débutant gagne parfois une enchère |
| Fattore | **Gardé, promu** | Le premier agent de la famille. Il s'améliore (plus de départs, de commandes, de routes) : l'automatisation **méritée**, à la manière d'Hades' Star |

Bilan : d'une trentaine de systèmes à **une douzaine visibles**, chacun avec une raison de durer des années.

---

## 8. Les risques et leurs parades

| Risque | Parades |
| --- | --- |
| **L'écrasement des nouveaux** | Le contenu par bandes. Aucun pillage de ce qui est bâti. La protection de bande. Les théâtres de la Terraferme. Le rattrapage par le coût. L'apprentissage |
| **Les monopoles de vétérans** au Rialto et dans les villes | Un plafond de position par bien et par marchand. Le teneur de marché permanent. Le plafond de Podestà et les villes de départ réservées. Le calmiere du Doge. La Sera par bande |
| **L'inflation** sans purge | Des puits *désirables* : le palais, le Fondaco de compagnie, la guerre qui mange, les œuvres publiques. La **décime** (impôt historique vénitien) sur la trésorerie oisive au-delà d'un seuil élevé : elle finance les foires. |
| **L'ennui de la fin de jeu** | Une progression **sans plafond dur** au sommet (des étages de palais à coût exponentiel, de pure vanité). La politique. La Contesa de première bande. Les ères qui ouvrent du contenu. La transmission |
| **Le blob** : une méga-compagnie domine | 30 associés au plus. Deux alliés au plus à la Terraferme. La Contesa appariée par puissance. |
| **Les doubles comptes** qui nourrissent un compte principal | Les demandes au prix de référence, pas en dons. Pas d'échange pour un compte de moins de 3 jours. Les paires suspectes dans `/admin`. Des plafonds de transfert par jour |
| **L'épuisement des meneurs** de compagnie | La succession automatique. Les Consiglieri. La Contesa sur inscription, jamais imposée. |
| **Un monde qui se vide** | Les maisons PNJ comme tampon, les fantômes de la Sfida, les maisons endormies retirées des cartes. |
| **Le tapis roulant de contenu** | Un contenu **systémique** (joueurs, politique, guerres). Le calendrier historique écrit une fois pour quatre ans. La Lettre écrite par arcs |
| **La toxicité** dans un monde qui se souvient | Pas de texte libre hors des fils de compagnie et d'alliance modérés. Rumeurs jamais nominatives. Les nouveaux protégés |

---

## 9. L'ordre de mise en place

| Étape | Contenu | Pourquoi d'abord |
| --- | --- | --- |
| 1 | Fin du reset. Le Rang de Maison et ses bandes. Le Carnet de la semaine à la place des quotidiens. La file de nuit à 12 h. Les maisons endormies | Le socle : sans les bandes, tout le reste écrase les nouveaux |
| 2 | La Compagnia : taille, rôles, succession, demandes. La Condotta récompensée en Sceaux | Le lien social avant le contenu social |
| 3 | La Terraferme par théâtres de bande, puis la Contesa une semaine sur deux | La guerre de guildes sur le moteur existant |
| 4 | Les ères et les foires. Les Annales. Le Grand Canal en immobilier | Le live-ops et la fin de jeu |
| 5 | L'Expédition, les agents de la famille, le Sénat et le Conseil des Dix | Le contenu profond, une fois la population là |
| 6 | Le Patronato et le Mécénat de compagnie | Quand il y a quelque chose à aimer |

Mesures : rétention J1 à J180 ; part des actifs en compagnie (cible 70 % à J30) ; nouveaux attaqués par plus fort (cible 0) ; temps pour atteindre la bande médiane par cohorte (doit **baisser** avec l'âge du monde) ; masse monétaire et prix par ère ; compagnies mortes en 30 jours.

---

## Résumé (15 lignes)

1. La puissance grandit sans plafond, mais toute compétition se joue **par bandes de Rang de Maison**, à la manière d'Hades' Star. Le vétéran est une légende visible, jamais un prédateur du débutant.
2. **La Compagnia** (5 à 30 associés, rôles, succession automatique) devient le pilier, avec les **demandes d'entraide** à la Clash Royale, réglées au prix de référence.
3. Le contenu coopératif a trois formats : la **Condotta** (Red Star en direct, paliers 1 à 12, Sceaux), l'**Expédition** asynchrone de la Muda et le **Fondaco de compagnie** comme grand puits.
4. La guerre de guildes est la **Contesa**, sur le moteur de la Terraferme, une semaine sur deux, appariée par puissance du roster comme la White Star.
5. La Terraferme reste la seule partie hebdomadaire qui repart à zéro. Elle nourrit le permanent par des Sceaux, des trophées et le Lustre, jamais par du rendement.
6. Le rythme repose sur trois horloges (récolte, chantier de plusieurs jours, ambition), une file de nuit de 12 h et une tournée de 5 minutes avec un geste social.
7. Le **Carnet de la semaine** et « le retour du marchand » remplacent série, coffre et produits frais.
8. Le mois devient un chapitre (Doge, foire) et le trimestre une **ère historique** (1450 à 1453) : le calendrier de live-ops est déjà écrit par l'Histoire.
9. La politique gagne de la mémoire : Grand Conseil, Sénat, Doge sans réélection, Conseil des Dix, Annales publiques.
10. Les nouveaux sont protégés par bande pendant 30 jours, aidés par le rattrapage par le coût et l'**apprentissage** (garzone) récompensé chez le maître.
11. Les inactifs s'endorment (retirés des cartes à 14 jours, palais mis en location à 30 jours). Rien n'est jamais pillé pendant une absence.
12. Les transformations : Atouts en collection équipable, Dynastie en agents de la famille, Lettre en feuilleton sans fin, Grand Canal en immobilier persistant.
13. La monétisation passe par le Patronato (information et confort), le **Mécénat de compagnie** et les cosmétiques. Jamais de vitesse, de ressources ni de chantier en plus.

**Trois désaccords probables avec un expert de la progression et de l'économie :**

- **Courbe de puissance contre convergence.** Il voudra des rendements fortement décroissants pour limiter l'écart. Je préfère une puissance qui *se sent*, avec de grands chiffres, et je protège l'équité par l'appariement en bandes plutôt que par la compression de la courbe.
- **L'entraide et le permanent qui sort de l'arène.** Il verra les demandes de compagnie, les Sceaux de la Terraferme et les options du Fondaco comme des fuites et des transferts propices aux doubles comptes. Je les juge indispensables à l'obligation sociale, et j'accepte de les plafonner, pas de les supprimer.
- **Les puits par l'entretien contre les puits par le désir.** Il proposera probablement un entretien, de l'usure ou des coûts qui courent pendant l'absence pour tenir l'inflation. Je les refuse : ils punissent l'absent et tuent la rétention de long terme. Je préfère les puits volontaires (palais, Fondaco, guerre, œuvres publiques) et une décime sur la seule trésorerie oisive.
