# Fondaco sans reset : le cœur de la progression persistante et l'économie

*Analyse de game design, 29 octobre 2026. Angle : la progression à long terme et l'économie. Rien n'est codé ; c'est une proposition pour le porteur.*

Lu pour cette analyse : `docs/CADRAGE.md` (décisions, boucle, économie), `docs/plan-progression.md`, `docs/audit-retention-2026-10-27.md`, `docs/plan-rupture.md`, `docs/plan-terraferme.md`, `docs/plan-familles.md`, `IDEAS.md`, `docs/calibration.md` (résultats et réglages), les réglages de Venise (`venice1450.settings.ts` : ateliers, manufactures, véhicules, villes, fondaci, Atouts, Lustre, Signoria) et la liste des modules du moteur et des écrans.

---

## 1. Le diagnostic en une page

Fondaco a un excellent moteur d'économie et des systèmes pensés pour **un mois**. Résultat, mesuré par le projet lui-même :

- **la croissance s'arrête vers le 5e jour** (revenu de la semaine III sur celui de la semaine I : 1,12 à 1,20 après la vague 1, pour une cible de 1,20). Le joueur atteint son régime de croisière et rejoue ensuite la même session ;
- **ce qui dure est décoratif** : Lustre, Renommée, Grand Canal, Dynastie avec un trait d'héritier, Influence qui n'achète qu'un nom doré ;
- **plus de trente systèmes**, chacun ajouté pour donner du sens à un mois qui en manque.

Le reset mensuel **interdisait** de construire grand : ateliers au niveau 5 (10 en manufacture), 4 véhicules, 7 villes. La demande du porteur fait passer d'un **jeu de partie** (OpenFront) à un **jeu d'empire** (Hades' Star, OGame, Eve). La question devient : **garder une courbe désirable pendant deux ans, sans que les anciens écrasent les nouveaux ni que la monnaie s'emballe**.

Ma thèse :

> **La Maison est un empire marchand qui s'étend sur la carte de la Méditerranée, de la lagune à Bruges. On grandit en profondeur (des ateliers, une Casa, une flotte) et en étendue (des fondaci dans des régions nouvelles), au rythme de chantiers qui s'allongent. La Terraferme reste une partie d'une semaine, à armes égales, où l'on va chercher de la gloire et quelques butins, jamais sa puissance.**

---

## 2. Ce qu'Hades' Star fait de génial, et ce qu'on en prend

| Mécanique d'Hades' Star | Pourquoi ça marche | Adaptation à Fondaco |
| --- | --- | --- |
| **Un empire qui s'étend visiblement** | On *voit* sa progression ; chaque planète est un astre à soi | La carte s'ouvre de la Vénétie à la Flandre ; chaque fondaco est une bannière, chaque route un trait où passent ses convois (la Lagune : « un lieu est un astre qu'on approche ») |
| **Un niveau maître plafonne tout** | Une jauge lisible, des déblocages groupés, des dépendances | **La Casa** (*casa-fondaco*) plafonne ateliers, bâtisseurs, navires, régions |
| **Des modules** à slots limités | Deux flottes de même niveau diffèrent | Navires et chariots à **modules** |
| **Des chantiers qui s'allongent**, en nombre limité | Quelque chose finit toujours demain : revenir est une curiosité | 2 à 4 **maestranze**, chantiers de 2 minutes à 7 jours |
| **Du contenu par palier** (Red Stars, White Stars) | Le vétéran ne chasse pas le débutant | **Ligues par Puissance** et **régions par palier** (le Levant, la Flandre pour les gros) |
| **Les artefacts des Red Stars nourrissent la recherche** | Le mode court sert l'empire sans le décider | **Les trophées de la Terraferme** raccourcissent un savoir ; jamais de rendement |
| **Le score d'Influence** pour l'appariement | La puissance, pas la richesse | **La Puissance** : somme pondérée des niveaux, pas les ducats en caisse |

On **ne prend pas** les cristaux payants qui accélèrent (le « pay to skip » d'Hades' Star), ni le pillage d'OGame et de Travian : **on ne détruit jamais la Maison d'un autre** hors de la Terraferme, qui repart chaque semaine.

---

## 3. La boucle de développement à long terme

### 3.1 Ce qui grandit : cinq axes, pas plus

Le défaut P6 de l'audit (trop de systèmes) s'aggraverait si l'on empilait un empire *en plus* de l'existant. Cinq axes, tous visibles, qui **absorbent** les systèmes actuels :

| Axe | Ce que c'est | Ce qu'il absorbe | Ce qu'on voit à l'écran |
| --- | --- | --- | --- |
| **1. La Casa** | Le palais-comptoir de la Maison, niveaux 1 à 20, jauge maîtresse | Le palazzo de prestige, le niveau permanent, le Grand Canal (le palais s'élève) | La façade sur le Grand Canal prend un étage, une loggia, un campanile |
| **2. Les botteghe** | Les ateliers, dans chaque région où la Maison a un fondaco, niveaux 1 à 20 (25 pour son Arte) | Les ateliers 1 à 5 et les manufactures 6 à 10 ; les chaînes de luxe | Les ateliers sur l'astre de chaque fondaco, qui changent de forme tous les cinq niveaux |
| **3. Le charroi et la flotte** | Des véhicules de huit types, de la mule à la galère de Flandre, avec des modules | Les véhicules améliorables, le fattore, la Muda | Les convois qui circulent sur ses routes, en direct |
| **4. Les fondaci et la carte** | L'implantation dans des régions nouvelles, par une charte puis un comptoir à bâtir | Les fondaci actuels, les privilèges de l'Influence (Levant, Lombardie, Frioul) | Le brouillard qui se lève sur une région, la bannière plantée |
| **5. Le sang et le savoir** | La famille (personnages placés dans les fondaci) et l'arbre des savoirs de la Scuola d'Abaco | La Dynastie, les Atouts, les maîtrises | La galerie des portraits, l'arbre qui se remplit |

Les trois premiers font la **profondeur**, le quatrième l'**étendue**, le cinquième l'**identité**.

### 3.2 Les horizons

| Horizon | Ce que fait le joueur | Ce qui le fait revenir |
| --- | --- | --- |
| **Session de 3 à 5 min** | Récolter, relancer, charger, lancer un chantier, un ordre | Le geste en or ; une place de chantier libérée |
| **Jour** | 3 à 5 sessions, la Sera de 20 h (incanto), la Lettre du matin | Un chantier qui finit cette nuit, un convoi qui rentre à 14 h, une enchère ce soir |
| **Semaine** | Une partie de Terraferme, une Sfida, un ou deux paliers de Casa (au début), un savoir | Le placement du lundi, un rival nommé, une galère qui revient jeudi |
| **Mois** | Une région ouverte, un nouveau type de véhicule, un palier de Casa, une chronique du mois | « Le mois prochain, j'ouvre la Dalmatie » |
| **6 mois** | L'Arte et son atelier unique au sommet, le Levant, une succession dans la famille | La première galère grosse armée de ses propres matériaux |
| **2 ans** | La Flandre, la Casa 20, une charge de Procurateur, le Doge | Une position unique et perdable ; les Grandes Œuvres du monde |

Règle de rythme : **à tout moment, trois objectifs visibles à moins d'une semaine, sur trois axes**, montrés par un écran « Prochains paliers » et vérifiés au simulateur.

---

## 4. Les axes et leurs courbes

### 4.1 L'unité de conception : les jours de revenu

Le revenu est multiplié par 100 en deux ans : on règle en **jours de revenu courant** et en **temps de chantier**. Au début l'argent manque (il faut jouer), au sommet le temps (il faut choisir). Revenu net du médian, ordres de grandeur (aujourd'hui ≈ 170 d par jour sur un mois) :

| Moment | J1 | S1 | M1 | M3 | M6 | A1 | A2 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Revenu net par jour (ducats) | 150 | 300 | 600 | 1 500 | 3 500 | 8 000 | 20 000 |

Cibles :

- le **prochain palier de Casa** coûte 2 à 7 jours de revenu courant, jamais plus de 10 ;
- un **atelier** se rembourse en moins d'un jour aux niveaux 1 à 5, en 2 à 5 jours aux niveaux 6 à 10, en 1 à 2 semaines de 11 à 15, en 3 à 5 semaines de 16 à 20. C'est le **rendement décroissant** qui freine naturellement les gros, sans plafond artificiel ;
- au sommet, **le temps** freine plus que l'argent : on a les ducats pour deux chantiers et la place pour un.

### 4.2 La Casa : la jauge maîtresse

| Niveau | Coût (ducats) | Matériaux | Chantier | Ce qu'il ouvre | Atteint vers (médian) |
| --- | --- | --- | --- | --- | --- |
| 1 | — | — | — | 4 places d'atelier en Vénétie, 2 mules, ateliers jusqu'au niveau 1 | J0 |
| 2 | 100 | 10 briques, 10 planches | 2 min | Ateliers niveau 2, 5e place | J1 |
| 3 | 200 | 20 + 20 | 10 min | Charrette ; le Rialto (ordres à cours limité) | J1 |
| 4 | 350 | 30 + 30 | 30 min | La Scuola d'Abaco (savoirs) | J3 |
| 5 | 600 | 40 + 40 | 1 h | **2e maestranza** ; burchio (bateau de la Brenta et du Pô) | S1 |
| 6 | 1 000 | 60 + 60 | 2 h | Charte de Lombardie | S2 |
| 7 | 1 600 | 80 + 80 | 4 h | **Choix de l'Arte** | S3 |
| 8 | 2 500 | 100 + 100 + verre | 8 h | **Stato da Mar ou Stato da Terra** ; Frioul et Istrie | M1 |
| 9 | 3 800 | + fer | 12 h | Marciliana (cabotage adriatique) ; Romagne et Marches | M1,5 |
| 10 | 5 500 | + chêne de Dalmatie | 18 h | L'Arsenal privé (navires) ; Dalmatie | M2,5 |
| 11 | 7 500 | | 1 j | Cocca | M3 |
| 12 | 10 000 | + marbre d'Istrie | 1,5 j | Allemagne (Fondaco dei Tedeschi) ou Grèce (Corfou, Candie) selon le Stato | M4 |
| 13 | 14 000 | | 2 j | Arte secondaire (mineure) | M5 |
| 14 | 20 000 | + soie | 2,5 j | Galea grossa ; le Levant (Alexandrie, Beyrouth) | M7 |
| 15 | 27 000 | | 3 j | **3e maestranza** ; l'autre branche du Stato | M9 |
| 16 | 36 000 | + alun | 3,5 j | Constantinople et la mer Noire | A1 |
| 17 | 50 000 | | 4 j | Charges de Procuratie (candidature) | A1,3 |
| 18 | 70 000 | + draps de Flandre | 5 j | Galère de Flandre ; Bruges et Londres | A1,6 |
| 19 | 95 000 | | 6 j | **4e maestranza** | A2 |
| 20 | 130 000 | + matériaux des quatre coins | 7 j | Couronne de la façade ; Maestria (niveaux infinis) | A2,5 |

Environ ×1,4 par niveau, comme le revenu. Les **matériaux** font le vrai travail : dès le niveau 8, chaque palier demande un bien d'une région qu'on n'a peut-être pas (le chêne de Dalmatie, acheté au Rialto). C'est la dépendance croisée d'Hades' Star traduite en commerce : **la Casa oblige à commercer avec les joueurs d'autres routes**.

### 4.3 Les botteghe : profondeur et rendement décroissant

- **Places** : 4 en Vénétie au départ, +1 aux niveaux 2, 5, 8 et 12 de la Casa ; chaque fondaco en donne 2 à 4 de plus dans sa région, avec le bonus des matières locales (l'actuel +30 %).
- **Niveau maximum** = niveau de la Casa (20 au plus ; 25 pour les ateliers de son Arte).
- **Production d'un lot** : Y(n) = n × (1 + 0,15 × (n − 1)) fois le lot de base. Niveau 5 : 8 ; niveau 10 : 23,5 ; niveau 20 : 77. (L'actuel +25 % par niveau donnerait 115 au niveau 20 : trop raide pour une demande qui doit suivre.)
- **Coût d'un niveau** : W(n) = coût de base × 1,3^(n − 1). Niveau 10 : ≈ 10,6 × la base ; niveau 20 : ≈ 146 × la base. Le coût croît plus vite que la production : le temps de remboursement s'allonge de lui-même.
- **Chantier** : le même barème que la Casa, décalé de deux niveaux (un atelier niveau 10 prend 12 h).
- **Changement de forme** tous les 5 niveaux (échoppe, bottega, manufacture, fabbrica) : un moment visuel.

**Les chaînes s'allongent** avec les régions, sans spaghetti : quatre étages (brut, travaillé, fini, grand ouvrage) ; le quatrième (une galère, un drap d'or, le sucre de Candie) demande des biens de deux régions au moins.

### 4.4 Le charroi et la flotte

| Véhicule | Ouvert à | Capacité | Trajets typiques | Slots de modules | Construit |
| --- | --- | --- | --- | --- | --- |
| Mule | J0 | 25 | Vénétie, 1 à 3 h | 0 | Acheté |
| Charrette | Casa 3 | 40 | Vénétie | 1 | Acheté |
| Chariot bâché | Casa 6 | 70 | Lombardie, 4 à 6 h | 1 | Atelier |
| Burchio | Casa 5 | 90 | Brenta, Pô, 2 à 5 h | 2 | Atelier |
| Marciliana | Casa 9 | 150 | Adriatique, 8 à 16 h | 2 | Arsenal privé |
| Cocca | Casa 11 | 300 | Dalmatie, Grèce, 1 à 2 j | 3 | Arsenal privé |
| Galea grossa | Casa 14 | 500 | Levant, 3 à 5 j | 4 | Arsenal privé, matériaux de quatre régions |
| Galère de Flandre | Casa 18 | 800 | Bruges, 10 à 14 j | 4 | Idem, plus draps |

**Modules** (un par slot, échangeables au port) : *Cale* (+25 % de capacité), *Attelage/Voilure* (+20 % de vitesse), *Escorte* (divise par deux le risque d'un voyage long), *Comptable* (+5 % de prime de commande groupée), *Pavillon* (+20 % de points de Signoria), *Assurance* (rembourse 80 % d'une perte, contre une prime détruite). Chaque module a trois niveaux. Deux galères de même niveau sont donc deux choix différents : une galère rapide, une galère sûre.

**Les voyages longs** portent l'anticipation de la semaine et du mois : une galère part avec la **Muda** d'État à date fixe (mardi et vendredi) et revient trois à cinq jours plus tard. Le risque (tempête, corsaires) est faible, affiché, assurable : 3 à 8 % d'une part de la cargaison, jamais le navire. Venise a inventé l'assurance maritime : un puits historique.

### 4.5 Les fondaci et la carte

L'ouverture d'une région se fait en trois gestes, qui sont trois « moments » :

1. **La charte** : un droit acheté en **Faveur** (la monnaie politique, voir 5.3) au palier de Casa requis ;
2. **le voyage d'ouverture** : une expédition de 4 h à 3 jours selon la distance, qu'on regarde avancer sur la carte ; à son arrivée, le brouillard se lève sur la région (cérémonie) ;
3. **le fondaco** : un comptoir à bâtir sur place (niveaux 1 à 10), qui donne des places d'atelier, un **carnet de commandes local** et la possibilité d'y placer un membre de sa famille.

| Région | Casa | Ce qu'elle apporte |
| --- | --- | --- |
| Vénétie (7 villes) | 1 | Le pain, les briques, les planches ; la chaîne de sa région |
| Lombardie (Brescia, Bergame, Crémone) | 6 | Fer, armes, futaine ; demande de sel et de verre |
| Frioul et Istrie (Udine, Capodistria, Pola) | 8 | Bois, marbre d'Istrie, vin |
| Romagne et Marches (Ravenne, Ancône) | 9 | Sel, blé ; port de relais |
| Dalmatie (Zara, Spalato, Raguse) | 10 | Chêne, poix, sel ; le chantier naval de l'Adriatique |
| Allemagne, par le Fondaco dei Tedeschi (Augsbourg, Nuremberg) | 12 (Terra) | Argent, cuivre ; demande d'épices et de verre |
| Grèce (Corfou, Modon, Candie) | 12 (Mar) | Sucre, vin de Malvoisie, coton |
| Levant (Alexandrie, Beyrouth) | 14 | Épices, soie, coton |
| Constantinople et la mer Noire (Tana) | 16 | Alun, fourrures, grain |
| Flandre et Angleterre (Bruges, Londres) | 18 | Laine anglaise, draps fins |

**Stato da Mar ou Stato da Terra** (Casa 8) est le premier grand choix exclusif : il fixe l'ordre d'ouverture ; l'autre branche s'ouvre à la Casa 15, chartes deux fois plus chères. Il crée deux populations qui ont besoin l'une de l'autre au Rialto : le terrien vend l'argent et le fer, le marin les épices et la soie.

**L'histoire du monde avance.** Un **chapitre** par trimestre avance le calendrier (1453 la chute de Constantinople, 1454 la paix de Lodi, 1463 la guerre turque…), change la carte pour tous et apporte du contenu, comme les extensions d'un MMO, sans effacer personne. Ceux qui ont un fondaco à Constantinople vivent 1453 intensément (évacuer, perdre le comptoir, être dédommagés en Faveur).

### 4.6 Le sang et le savoir : ce qui rend deux Maisons différentes

**L'Arte (Casa 7), exclusive.** On entre dans une des cinq corporations de Venise :

| Arte | Ce qu'elle permet | Atelier unique au sommet |
| --- | --- | --- |
| Lanaioli (laine) | Chaîne du drap jusqu'au niveau 25 ; commandes de draps des villes | La tintoria (drap écarlate) |
| Vetrai (Murano) | Verre et miroirs jusqu'au niveau 25 ; exportation vers l'Allemagne | La fornace de cristallo |
| Speziali | Épices préparées, sucre raffiné ; commandes des apothicaires | La spezieria grande (thériaque) |
| Arsenalotti | Navires et modules moins chers, Arsenal privé dès la Casa 9 ; vend des navires aux autres | Le squero (galères à 5 slots) |
| Banchieri | Lettres de change (transferts entre fondaci sans transport de ducats), prêts entre joueurs, frais de Rialto réduits | Le banco di scritta |

Changer d'Arte est possible, mais les ateliers d'Arte au-delà du niveau 15 retombent à 15 : un vrai renoncement, pas un clic. Au niveau 13 de la Casa, une **Arte mineure** donne la moitié des avantages d'une seconde.

**Les savoirs** (Scuola d'Abaco, Casa 4) : quatre branches d'une douzaine de nœuds, un savoir à la fois (deux à la Casa 12), de 30 minutes à 10 jours.

Branches : Abaco (file de production de 12 à 16 h, ordres en plus, marges par atelier), Navigation (portulans, −10 % de trajet en mer ; niveaux de modules), Arti (rendements par paliers de 5 %, recettes), Diplomazia (chartes moins chères, Signoria, voix au Sénat). Chaque branche se termine par un **choix exclusif** entre deux capstones (par exemple, en Navigation : « Convoi » +1 galère par Muda, ou « Corsaire repenti » risque divisé par trois). Tout l'arbre demanderait plus de trois ans : on choisit.

**La famille** fusionne Dynastie, Atouts et facteurs : les Maisons vénitiennes envoyaient fils, neveux et gendres tenir leurs fondaci.

- La Maison a des **membres** (le chef, ses enfants, des neveux, des gendres par mariage). Chacun a **un trait qui donne et retire** (le catalogue des Atouts actuel s'y prête tel quel : *gondoliere* +25 % de vitesse, −1 véhicule) et un rang qui monte avec ses années de service (trois rangs : le trait gagne en force, la contrepartie baisse).
- On en **place un par fondaco** : son trait vaut pour ce fondaco. La composition de la famille devient une décision de construction, comme les modules.
- **Une génération dure environ quatre mois réels.** À la succession, le chef se retire, un héritier prend la Maison et la Maison gagne un point d'**Héritage**, dépensé dans une courte liste de traits de lignée permanents (voir les commandes urgentes plus tôt, une place de famille en plus…). C'est un « prestige » sans reset : rien n'est perdu, quelque chose s'ajoute.
- Un enfant naît tous les 1 à 2 mois ; les gendres viennent d'un **mariage** avec une autre Maison (détail à l'expert social ; deux alliances à la fois au plus).

### 4.7 Éviter le mur, garder le sommet intéressant

**Le mur** se combat par quatre règles :

1. **Des axes en parallèle** : quand la Casa attend 5 jours, un module, un savoir et un atelier avancent (un objectif à moins de 24 h, toujours).
2. **Le temps plutôt que l'argent au sommet** : on attend un chantier choisi, on n'entasse pas des ducats.
3. **Les chantiers avancent la nuit** (le jeu dort pour les commandes, pas pour les maçons) : le chantier de 10 h lancé le soir fait revenir le matin.
4. **Les chapitres** trimestriels, d'abord pour le haut niveau.

**Le haut niveau** a besoin d'objectifs ouverts et de positions rares :

- **La Maestria** (après la Casa 20) : niveaux infinis par atelier, +1 % chacun, à coût géométrique ; un puits sans fond à la Melvor, trop plat pour creuser un écart.
- **Les Grandes Œuvres du monde** : la Basilique, l'Arsenal, le pont du Rialto, les Procuratie. Chantiers communs à niveaux infinis, auxquels on livre des marchandises (payées un peu au-dessus de la référence, puis détruites) ; leur niveau change le monde pour tous (un étal de plus au Rialto, une Muda de plus) et la plaque des donateurs se voit sur la carte. C'est le puits de marchandises des vétérans, et il profite aux nouveaux.
- **Les charges uniques et perdables** : Podestà (Vénétie, par jour), Console d'Alexandrie, Bailo de Constantinople, Capitano de la Muda de Flandre (par semaine), Procurateur (par trimestre), Doge (par semestre). Chacune se gagne par la Signoria de sa région, donc entre joueurs du palier qui y commercent. Le vétéran se bat pour le Bailo, pas pour le Podestà de Trévise.
- **Les parts de Maison** sans rachat forcé du dernier jour deviennent une vraie bourse (à la Eve) : investir dans une jeune Maison prometteuse est un jeu de vétéran qui **profite** au nouveau.

---

## 5. L'économie sans reset

### 5.1 Sources et puits

| Sources de ducats | Part visée au médian | Remarques |
| --- | --- | --- |
| Commandes des villes (carnet local des fondaci et tableau commun) | 70 % | Prix ancrés à la référence (la règle actuelle, 60 à 150 %) |
| Ventes à la Dogana | 10 % | Plafond et plancher : le régulateur des prix |
| Contrats de l'État (Doge, Muda, Grandes Œuvres) | 15 % | Prime fixe, budget par actif |
| Terraferme, Lettres | ≤ 5 % | Plafonnées |

| Puits | Part visée au médian (M3 et après) | Mécanisme |
| --- | --- | --- |
| Constructions (Casa, ateliers, fondaci, navires) | 55 % | Le gros puits, géométrique |
| Savoirs | 8 % | Ducats et papier |
| **Entretien** (salaires des fondaci et de la famille, radoub des navires) | 15 % | Croît plus vite que la taille : 3 % du revenu à la Casa 5, 20 à 25 % à la Casa 18. C'est le *rendement décroissant de l'empire* |
| Taxes : Rialto (3 %), gabelles des routes lointaines (5 à 10 %), péages | 12 % | La gabelle du Levant est l'impôt des riches |
| Assurances, primes de risque | 5 % | Détruites |
| Grandes Œuvres, Maestria, cosmétiques en ducats | le reste | Sans fond |

Je recommande de **réintroduire l'entretien** (retiré le 17 octobre) : dans un empire, c'est l'outil le plus propre contre l'accumulation ; il ne punit pas l'activité, il rend la taille coûteuse. Lisible (« Salaires du jour : −1 240 d »), jamais sous zéro : un fondaco impayé se met en sommeil, rien n'est détruit.

### 5.2 L'inflation

La masse monétaire par joueur **va** croître ; ce n'est grave que si **les prix suivent**. Gardes-fous :

- **Prix des villes ancrés à la référence** (déjà : bornés à 60–150 %).
- **La Dogana vend au plafond** (150 %) et achète au plancher : un vétéran ne fait pas flamber le blé, le nouveau qui achète est protégé.
- **Indice des prix** (80 à 130) comme indicateur principal ; le plafond « 2,5 × le capital » cède la place à un **ratio puits/sources par cohorte** : 0,6–0,8 avant trois mois, 0,9–1,0 au-delà.
- **Pas de stockage infini** : entrepôts à capacité, pain qui se gâte (−2 % par jour après 3 jours).

### 5.3 Deux monnaies, pas plus

- **Les ducats** : tout ce qui est économique. Persistants, au grand livre.
- **La Faveur** (l'Influence actuelle, renommée et refondue) : la monnaie politique de la République. Elle se gagne en **servant l'État** (livrer les commandes du Doge et de la Signoria, contribuer aux Grandes Œuvres, la Terraferme), jamais en vendant au Rialto, jamais contre de l'argent réel, jamais convertible. Elle achète les **chartes** de région, les voix au Sénat, l'accélération plafonnée d'un chantier (3 par jour au plus, coût croissant avec le temps restant), les charges. Les missions de la Maison deviennent des « commandes de la Signoria » de la semaine.

Les trophées de la Terraferme (voir 7) ne sont pas une monnaie : ce sont des objets rares, dépensés une fois.

### 5.4 Ce qui empêche les anciens d'écraser les nouveaux

Le point où un jeu persistant se gagne ou se perd. Sept mécanismes :

1. **Une demande privée par fondaco.** Un carnet local proportionnel au niveau du fondaco, que personne d'autre ne prend : le nouveau a toujours de quoi vendre. Le tableau commun reste pour la compétition.
2. **Des commandes à la taille du marchand.** Les petites commandes de Vénétie (moins de 30 unités) sont réservées aux Maisons de Casa ≤ 10 (« le Popolo protège ses boutiquiers »). Le vétéran n'en veut de toute façon pas : ses chariots portent 300.
3. **Le vétéran a besoin du nouveau.** Ses places d'atelier valent plus en étage 3 qu'en brut : il achète le blé et le sable des jeunes Maisons, qui gardent +20 % sur les bruts jusqu'à la Casa 8 (« contadini »). La leçon d'Eve : le nouveau est **utile** dès le premier jour.
4. **Le savoir circule** (rattrapage, à la manière de la diffusion des techniques dans Civilization). Ce que plus de la moitié des Maisons actives ont déjà coûte jusqu'à 50 % moins cher et se bâtit jusqu'à 60 % plus vite. Automatique, sans effet sur le sommet.
5. **Des ligues par Puissance.** La Sfida, les chroniques mensuelles, les classements de croissance et le Lustre se jouent par ligue (5 ligues, de « Bottega » à « Procuratia »). On est premier de sa ligue, on monte de ligue.
6. **Des régions par palier.** Les charges et le contenu de prestige des vétérans sont au Levant et en Flandre ; la Vénétie reste la région où le nouveau peut devenir Podestà.
7. **Rien ne détruit la Maison d'un autre.** La seule agression directe se joue sur la Terraferme, qui repart chaque semaine, ou par la Signoria et les parts.

### 5.5 Rejoindre un monde vieux d'un an

| Moment | Le nouveau en monde neuf | Le nouveau dans un monde d'un an |
| --- | --- | --- |
| Jour 1 | Casa 3, premières commandes | Pareil ; tableau protégé ; une Maison vétéran lui achète déjà du blé |
| Semaine 1 | Casa 5 | Casa 6 (le savoir circule) |
| Mois 1 | Casa 8, Lombardie | Casa 10, Dalmatie ; Podestà possible d'une petite ville |
| Mois 3 | Casa 11 | Casa 13, ligue 3 |
| Mois 6 | Casa 13 | Casa 15 : il rejoint le gros du monde |
| Au-delà | | Il ne rattrape pas le sommet, ce qui est juste, mais il **joue avec** lui |

Cible à vérifier au simulateur : un nouveau qui joue comme le médian atteint la Puissance médiane du monde en **4 à 6 mois**, et ne rattrape jamais les dix premiers par le seul rattrapage.

---

## 6. Ce qu'on garde, transforme ou supprime

| Système actuel | Décision | Ce qu'il devient |
| --- | --- | --- |
| **Saisons d'un mois, reset le 1er** | **Supprimé** pour le commerce | Un monde persistant, un calendrier qui avance par chapitres ; le mois reste un rendez-vous (chronique), pas un reset |
| Ateliers 1–5, manufactures 6–10, palazzo, chaînes de luxe, fondaci | Fusionnés | Botteghe 1–20, Casa, chaînes ouvertes par l'Arte et les régions, fondaci de région |
| Maîtrises (4) | Transformées | Les Arti (5, exclusives et persistantes) |
| **Atouts hebdomadaires** | Transformés | Les traits des membres de la famille, placés dans les fondaci |
| **Dynastie / héritier** | Gardée, ralentie, approfondie | Une génération tous les 4 mois, l'Héritage, la famille comme facteurs |
| Influence, privilèges, missions | Transformés | Faveur, chartes de région, commandes de la Signoria |
| **Classement mensuel des ventes nettes** | Supprimé en absolu | Puissance (permanente) ; chronique du mois par ligue (croissance, livraisons, Terraferme) |
| Lustre et Sfida | Gardés | Par ligue de Puissance ; le Lustre, seul, garde une saison de classement (un reset de rang, pas de développement) |
| Grand Canal (40 palais) | Gardé | Attribué par Puissance, chaque mois ; la façade raconte la Casa |
| Doge | Gardé, allongé | Élu pour six mois parmi les Procurateurs ; mandat d'un semestre, programme public |
| Signoria et Podestà | Gardés et étendus | Une charge par région (Podestà, Console, Bailo), entre joueurs du palier |
| Parts de Maison | Gardées | Sans rachat le dernier jour ; une vraie bourse des Maisons |
| Lettre du jour | Gardée | En arcs de plusieurs semaines, accrochés à la progression (l'arc de Faraj mène à Alexandrie) |
| Sera, incanto, Broglio | Gardés | L'incanto vend aussi des **places dans la Muda** ; les rumeurs portent sur les Mudas lointaines |
| Muda | Transformée | Les convois d'État où partent les galères des joueurs |
| Actes du mois ; mutateurs | Transformés | Événements et chapitres ; les mutateurs restent à la Terraferme |
| Bonus de retardataire (+50 % pendant 72 h) | Supprimé | Le savoir circule |
| Coffre du jour, tâches, ballots | Réduits | Les ballots de Faraj deviennent un lien avec le Levant ; le coffre ne punit jamais une absence |
| Pass Négociant | Gardé, même règle | Cosmétiques, informations, confort ; **jamais de temps ni de chantier en plus** |
| Entretien | **Réintroduit** | Le puits proportionnel à la taille |

---

## 7. La Terraferme en saisons courtes

Elle reste une **partie d'une semaine**, où un joueur brillant peut battre un empire d'un an. Principe : **l'empire paie l'entrée, la guerre rend de la gloire, jamais de la puissance.**

**À armes égales**, quel que soit le niveau de la Casa ; appariement par la **cote de la Terraferme** (l'Elo existe), pas par la Puissance.

**L'empire paie l'entrée** (R1 gardée : pain, briques, planches), avec un **plafond journalier égal pour tous** (la ration du Provveditore) ; les Maisons de Casa ≤ 6 reçoivent une ration de la République.

**Ce qu'elle rapporte au développement permanent**, plafonné à environ **10 à 15 % de la progression hebdomadaire d'un joueur médian** :

| Récompense | Effet permanent | Borne |
| --- | --- | --- |
| **Faveur** selon le rang de la semaine | Chartes, voix, accélérations | Environ 15 % de la Faveur de la semaine |
| **Trophées** (bannières prises, canons de Milan) | Un trophée raccourcit un savoir ou un chantier de 12 h | 2 par semaine au plus |
| **Branche « Condotta »**, ouverte par les trophées | *Sidegrades* de guerre (autre troupe, autre fort), jamais plus forts | — |
| **Salle d'armes**, écus sur la façade | Les bannières gagnées | Cosmétique |
| **Le Signore de la semaine** | Son décret vaut pour le monde la semaine suivante (bornes actuelles) | Un par semaine |
| **Le grade de la Condotta** | Titre permanent, visible partout | Honorifique |

Pas plus : sinon elle devient obligatoire et les vétérans organisés la farment contre les nouveaux (le travers des White Stars d'Hades' Star).

---

## 8. Les sensations : les moments de progression

Chaque moment a sa cérémonie, sobre et Lagune (un astre qui s'approche, une ligne d'or).

| Quand | Le moment | Ce qu'on voit |
| --- | --- | --- |
| J1, 10 min | La Casa passe au niveau 2 | La façade gagne un balcon ; trois nouveautés s'allument dans « Prochains paliers » |
| S2 | **La charte de Lombardie** | Le voyage d'ouverture traverse la carte ; le brouillard se lève sur Brescia |
| S3 | **L'entrée dans une Arte** | Le blason de l'Arte sur la façade, son atelier unique en silhouette, à atteindre |
| M1 | **Stato da Mar ou da Terra** | La carte se dézoome : l'Adriatique ou les Alpes apparaissent |
| M2 | Le premier navire construit de ses mains | Il sort de l'Arsenal privé et prend la mer |
| M4 | La première charge régionale | Le blason de la Maison sur la ville, la notification qui nomme le rival battu |
| M7 | **La galea grossa part pour Alexandrie** | Trois jours de voyage suivis sur la carte ; la Muda du vendredi, la rumeur d'un corsaire |
| M4–M6 | Une succession | La cérémonie de l'héritier, le premier point d'Héritage |
| Chaque trimestre | **Un chapitre** | 1453 : la chute de Constantinople, vécue ensemble |
| A1,6 | La galère de Flandre | La carte se dézoome une dernière fois : Bruges |
| A2 | Doge | Le portrait à la connexion de tous |

Ce qui **grandit à l'écran** en permanence, le vrai remède au « peu l'impression de se développer » :

1. **La carte** qui s'étend de la lagune à la Flandre, avec ses bannières et ses routes animées ;
2. **la façade** de la Casa sur le Grand Canal, qui monte d'étage en étage ;
3. **les convois** sur les routes : de deux mules à une flotte ;
4. **l'arbre** des savoirs et **la galerie** de la famille.

Et un seul chiffre, la Puissance, avec sa courbe depuis le premier jour (« Votre Maison a doublé en six semaines ») : le plus vieux moteur des incrémentaux, que Fondaco n'a jamais eu.

---

## 9. Mise en œuvre et mesure

**Ingénierie.** Chantiers calculés à la lecture comme la production, entretien au grand livre, régions et chartes dans `worlds.settings`, calendrier de chapitres dans les réglages ; `worlds.ends_at` ne borne plus le commerce, la Terraferme garde ses semaines.

**Simulateur.** Il faut un mode de 24 mois, cohortes arrivant aux mois 0, 3, 6 et 12 :

| Mesure | Cible |
| --- | --- |
| Temps jusqu'à la Casa n, par cohorte | Proche du tableau 4.2 ; les cohortes tardives 20 à 40 % plus vite |
| Objectif à moins de 24 h pour un médian | Toujours |
| Prochain palier de Casa en jours de revenu | 2 à 7 |
| Nouveau à la Puissance médiane | 4 à 6 mois |
| Indice des prix | 80 à 130 sur 24 mois |
| Ratio puits/sources | 0,6–0,8 (moins de 3 mois), 0,9–1,0 (au-delà) |
| Part de la Terraferme dans la progression | ≤ 15 % |
| Part des achats de bruts des vétérans faits aux jeunes Maisons | ≥ 30 % |

**Ordre de livraison.** 1) Casa, botteghe 1–20, maestranze, entretien (jouable seul en Vénétie). 2) Fondaci, Lombardie, chariot, burchio. 3) Arte et savoirs. 4) La mer : Dalmatie, Arsenal, navires à modules, Muda des joueurs. 5) La famille. 6) Le Levant et le premier chapitre. 7) La suite, un palier d'avance sur le premier joueur.

**Migration.** Un dernier reset à la bascule (Casa 1 pour tous) ; on garde le Lustre, l'Influence convertie en Faveur un pour un, la Renommée en cosmétique, les portraits de la Dynastie comme ancêtres.

**Risques.** (a) Le contenu court derrière les joueurs : chapitres décalés et Maestria. (b) L'entretien vécu comme punition : lisible, jamais destructeur. (c) Les mondes qui se vident : prévoir leur fusion (un chapitre « la peste »), pas leur fermeture. (d) Vendre du temps : le modèle du genre, à refuser ; c'est l'argument d'acquisition auprès des déçus d'OGame et de Travian.

---

## 10. Résumé

1. Cinq axes persistants (Casa 1–20, botteghe 1–20, flotte à modules, fondaci de dix régions, famille et savoirs) qui absorbent les systèmes actuels.
2. Coûts en jours de revenu (2 à 7 par palier), chantiers de 2 minutes à 7 jours, 2 à 4 maestranze, qui avancent la nuit.
3. Rendement décroissant et entretien convexe réintroduit : le frein des gros, sans plafond artificiel.
4. Stato da Mar ou da Terra, puis une Arte exclusive : deux Maisons différentes.
5. Des chapitres trimestriels qui font avancer l'histoire (1453…), sans reset.
6. Demande privée par fondaco, commandes réservées, vétéran acheteur des bruts, « le savoir circule », ligues par Puissance, charges par région.
7. Deux monnaies (ducats, Faveur), prix ancrés, ratio puits/sources par cohorte.
8. Terraferme hebdomadaire à armes égales, entrée payée par l'empire (rations plafonnées), au plus 10 à 15 % de la progression.
9. Un simulateur de 24 mois par cohortes avant toute calibration.

**Désaccords probables avec un expert rétention et social** : (1) chantiers et voyages longs plutôt que séries et peur de rater ; (2) un empire jouable seul, la guilde en amplificateur ; (3) ligues par Puissance et Terraferme plafonnée plutôt que domination absolue et récompenses de guerre fortes.
