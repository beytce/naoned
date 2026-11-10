# Revue du cadrage v4 par cinq experts, et arbitrages (10 novembre 2026)

*Demande du porteur : « Donc il n'y a plus de PvE ? Je veux qu'il y ait une vraie rivalité entre les joueurs, que le joueur ait vraiment envie de devenir le meilleur (classement ?). Fais passer des agents experts dans leur domaine […] Toi, tu es le chef exigeant et acceptes ou rejettes leurs propositions. »*

*Cinq experts ont relu `docs/CADRAGE-v4.md` et la maquette, chacun dans son domaine : compétition et classements, PvE et tactique, économie et gestion, rétention et social, interface. Ce document résume leurs constats et donne les arbitrages. **Les propositions acceptées sont reportées dans `docs/CADRAGE-v4.md`**, qui reste à valider par le porteur.*

---

## 1. Réponse courte au porteur

**Si, il y a du PvE, mais le cadrage le laissait se vider.** Tous les passages commencent aux mains des corsaires ; une fois pris par les joueurs, il n'en restait plus. L'expert du PvE l'a montré, et il a raison. Le cadrage révisé lui rend un visage et une durée : des capitaines nommés à trois phases, des détroits noirs que personne ne peut tenir, une garde corsaire qui change chaque jour.

**Non, il n'y avait pas de vraie rivalité.** Les cinq experts le disent avec les mêmes mots : le cadrage créait de la gêne entre joueurs (des prix qui baissent, des tours), pas l'envie d'être le meilleur. Rien ne disait qui est premier, ni à quoi, ni devant qui. Le cadrage révisé a désormais un chapitre entier sur la rivalité.

## 2. Ce que les experts ont trouvé de plus grave

| # | Constat | Qui | Mon avis |
| --- | --- | --- | --- |
| 1 | **La Manœuvre se gagnait par une routine.** Les coups suivaient la tête du convoi : il suffisait d'avancer toujours de trois cases. La position des galères ne comptait pas. | PvE (preuve dans le code de la maquette) | **Exact.** C'était une faute de conception. Corrigé dans le cadrage et dans la maquette. |
| 2 | **Le renom est un classement d'ancienneté.** Il se cumule à vie : un nouveau ne peut jamais être premier. | Compétition, rétention, économie | **Exact.** |
| 3 | **Le fil est un simple curseur.** Gratuit, immédiat, réversible : celui qui se connecte huit fois par jour gagne, et il n'y a pas de stratégie longue. | Économie | **Exact.** C'est le défaut le plus profond du cœur de jeu. |
| 4 | **Le PvE s'épuise** en trois semaines et n'a ni visage ni récompense propre. | PvE | **Exact.** |
| 5 | **Les solutions circulent.** Une garde fixe et un jeu déterministe : résolue une fois, copiée partout. | PvE, compétition, rétention | **Exact.** |
| 6 | **Les comptes multiples** : un fil commun à prix libre est un virement ; perdre exprès donne la moitié d'une cargaison à un complice. | Économie, compétition | **Exact.** |
| 7 | **Le sommet est vide** : île pleine en quelques mois, puis plus rien où dépenser. | Rétention, économie | **Exact.** |
| 8 | **Le téléphone déborde** : pétales qui se chevauchent, cibles de 22 px, étiquettes coupées ; glisser un fil déplace aussi la carte. | Interface (sur la capture) | **Exact.** |
| 9 | **Le rouge ne veut plus rien dire** : il sert au fil, aux jauges, aux boutons, à l'échelle. | Interface | **Exact.** |
| 10 | **Les robots déguisés en joueurs** ruinent toute rivalité le jour où on le découvre. | Rétention, compétition | **Exact.** |

## 3. Les arbitrages

### 3.1 La rivalité

| Proposition | Décision | Pourquoi |
| --- | --- | --- |
| **Séparer le renom et le rang.** Le renom reste à vie et n'ouvre que l'apparat. Le **rang** repart de zéro à chaque marée. | **Acceptée** | C'est la condition de tout le reste : chacun peut être premier à chaque marée. |
| **Trois lauriers par marée** : le Négoce (profit par bobine, pas volume), la Manœuvre (une cote), la Garde (heures tenues, pondérées par le péril). **Le Doge** du monde est le mieux classé sur l'ensemble. | **Acceptée** | Trois façons d'être le meilleur, un titre unique pour le joueur complet. Pas un axe de plus. |
| **Coter les convois et les gardes**, comme des joueurs d'échecs. Forcer une garde mieux cotée rapporte plus. | **Acceptée** | Le défenseur absent devient un adversaire nommé. Les gains décroissent entre deux mêmes Maisons ; les robots sont hors cote. |
| **La Passe du jour** : chaque jour, un passage et un convoi imposés, les mêmes pour tous ; seul le premier essai compte ; résultats à minuit. | **Acceptée** (proposée par trois experts) | Deux minutes, égalité pure, un rendez-vous quotidien sans perdant dépouillé. |
| **Le rival de la semaine** : le jeu désigne une Maison humaine juste au-dessus de toi. Ses fils se distinguent ; le vainqueur accroche le pavillon du vaincu à sa façade pour une semaine. | **Acceptée** | La rivalité prend un nom, un écart et une échéance. Aucun message libre, jamais deux semaines de suite. |
| **Le défi par le fil** : tirer un fil vers l'île d'un rival propose un duel miroir (chacun force la garde de l'autre, même budget). On ne mise que du rang. | **Acceptée** | Le duel direct, avec le geste du jeu, sans présence simultanée. Refusable, une fois par paire et par semaine. |
| **Des mondes en ligues** : à la fin de la marée, le haut du classement monte d'un monde, jusqu'à un monde sommet, « la Sérénissime », que tous peuvent regarder. | **Acceptée, adoucie** | Un but à un an. On ne descend que d'un rang, jamais sous un palier déjà atteint. |
| **Le rang visible sur la planche** : la coiffe du Doge sur l'île du premier, les lauriers sur les façades, le classement par voisinage d'une douzaine d'îles (le sestiere) avant le monde. | **Acceptée** | Sans cela, le classement serait un menu déguisé. Le premier voisin est atteignable. |
| **Le cortège du Bucentaure** chaque dimanche vers les trois premiers. | **Reportée** après la bêta | Beau, mais c'est de la mise en scène : d'abord les règles. |
| **Un quatrième axe de classement, un Livre d'or par métier.** | **Rejetées** | Trois lauriers suffisent ; au-delà, plus personne ne lit. |
| **Récompenser le rang par des bobines, des pièces ou du rendement.** | **Interdit** (les experts le disent aussi) | Boule de neige. Le rang donne des titres, de l'apparat et le droit de nommer une tour. |

### 3.2 Le PvE et la Manœuvre

| Proposition | Décision | Pourquoi |
| --- | --- | --- |
| **Les coups partent de la garde**, selon un motif dessiné depuis chaque pièce ; les écueils coupent les lignes. | **Acceptée, déjà dans la maquette** | Sans cela, il n'y a pas de jeu : ni angle mort, ni approche, ni terrain. |
| **Une file qui se coupe** : une pièce détruite au milieu sépare l'arrière, qui attend que la tête repasse à côté. | **Acceptée** | « Penser à toute la file » devient vrai. |
| **Virer de bord** (la queue devient la tête). | **Rejetée pour l'instant** | Une règle de plus avant que le noyau soit prouvé. À revoir au prototype. |
| **Un terrain par passage** : le courant qui pousse, la brume qui cache, le haut-fond. | **Acceptée, un seul par passage** | Chaque détroit a son caractère, sans gonfler les règles. |
| **Des capitaines nommés**, boss à trois phases (une par sceau), une douzaine par marée, chacun avec un trophée propre. | **Acceptée** | C'est le visage et la montée du PvE. |
| **Des détroits noirs que nul ne peut tenir** : ils restent aux puissances ; les forcer repousse l'encre pour tout le monde. | **Acceptée** | Le PvE ne tarit plus, et il devient une œuvre commune. |
| **Les sorties des corsaires** contre les tours tenues, annoncées 24 heures avant. | **Acceptée** | Tenir une tour devient un jeu, et rien ne tombe sans prévenir. |
| **Une garde corsaire qui change chaque jour**, la même pour tous. | **Acceptée** | Les solutions ne circulent plus. Elle nourrit la Passe du jour. |
| **Un apprentissage en trois casse-têtes d'une cloche**, avec un trait qui relie chaque pièce de garde à ses cases. | **Acceptée** | Réponse directe au « je ne suis pas sûr de comprendre » du porteur. |
| **Trois marques de maîtrise par tour.** | **Rejetée** | Le porteur a déjà écarté cette idée le 10 novembre (les trois sceaux de bataille de la Porta). La Passe du jour donne la rejouabilité. |
| **Épaves et convois à intercepter.** | **Rejetées**, notées pour plus tard | Du contenu en plus, pas une réponse à un défaut. |
| **L'embuscade et le fanal** (les coups cachés que j'avais mis au cadrage). | **Je les retire** | L'expert a raison : ils contredisent la règle « tout coup est annoncé ». |
| **Vingt pièces de convoi dès le départ.** | **Ramené à six** | Prouver le noyau avant d'empiler. |

### 3.3 L'économie et la gestion

| Proposition | Décision | Pourquoi |
| --- | --- | --- |
| **Le fil se patine** : laissé en place, il gagne du débit chaque jour, jusqu'à un plafond. Le reprendre remet à zéro, et la bobine met le temps du trajet à revenir. | **Acceptée** | L'engagement pèse contre l'opportunisme ; l'hyperconnecté perd son avantage. La meilleure idée de la revue. |
| **La ville tissée** : quand toutes ses marchandises sont servies par des Maisons différentes, elle paie mieux tout le monde et grandit. Délaissée, elle rétrécit. | **Acceptée** | Les métiers dépendent les uns des autres, et les joueurs bâtissent un bien commun. |
| **La tresse** : au Large, un fil simple perd une part de ses cargaisons ; deux bobines tressées sur la même route n'en perdent pas, à demi-débit. | **Acceptée** | Un vrai curseur de risque, réglé par le geste lui-même. |
| **Des bobines teintes** : longue, grosse ou cirée, coûteuses à changer. | **Acceptée** | Une main de douze bobines à composer, et un puits de ducats pour le sommet. |
| **Le pavillon choisit la nouvelle** : le premier fournisseur choisit, entre deux, la prochaine demande de la ville. | **Acceptée** | Un pouvoir sans rendement, à défendre chaque semaine. Un seul pavillon actif par Maison. |
| **Serrer les transferts** : fil commun borné autour du prix du Rialto ; prise réduite au quart, nulle entre associés ; une part des péages détruite ; passage gratuit pour le seul fil engagé. | **Acceptée** | Les fermes de comptes ne sont plus rentables. Répond à ma question ouverte sur les prises. |
| **Le Rialto ne doit jamais vendre moins cher qu'une ville n'achète.** | **Acceptée** | Sinon c'est une pompe à ducats. |
| **Un carnet d'ordres, des contrats, un quatrième étage de chaîne.** | **Rejetés** (l'expert les déconseille lui-même) | La profondeur doit venir de la géométrie des fils, pas d'écrans. |

### 3.4 La durée et le social

| Proposition | Décision | Pourquoi |
| --- | --- | --- |
| **Trois dispositions de garde**, tirées tour à tour, et **la reprise** : chaque assaut laisse une perle qui rejoue la Manœuvre de l'attaquant. | **Acceptée** | La défense devient le métier du sommet ; une défaite devient une leçon. Une seule disposition au début. |
| **La marée laisse une marque** : un passage tenu jusqu'au bout grave une pierre sur ton île. | **Acceptée** | Ce qu'on perd à la marée devient un trophée. |
| **Le phare de compagnie** : chaque membre y tend un fil ; ce qu'il apporte bâtit un phare qui repousse l'encre et arme les gardes communes. | **Acceptée** | Le bâtisseur paisible nourrit les combattants. Apport plafonné, aucun tableau par membre. |
| **Avancer les compagnies** dans le chemin. | **Acceptée** | Elles passent juste après les passages. |
| **Les robots sous pavillon gris**, hors classement ; fusion des mondes de moins de trente joueurs. | **Acceptée** | La rivalité exige de savoir qui est humain. |
| **Un rival dès la dixième minute**, un premier passage forcé avant la vingtième. | **Acceptée** | La première heure doit montrer le vrai jeu. |
| **Une trêve de nuit** sur les tours ; ni série de connexion, ni récompense qui expire, ni alerte nocturne. | **Acceptée** | On ne perd rien en dormant. |
| **Une discussion libre entre rivaux.** | **Interdite** | Seuls des signes prédéfinis. |

### 3.5 L'interface

| Proposition | Décision | Pourquoi |
| --- | --- | --- |
| **Toucher puis toucher** par défaut sur téléphone : le quai, puis la ville ; la caméra recule pour cadrer les destinations. Le glisser reste. | **Acceptée** | Sur 390 px, le glisser se bat avec la carte et le doigt cache la cible. |
| **Un médaillon de la Maison**, fixe : un toucher ramène à ton île, un second ouvre la Maison (profil, réglages, aide). | **Acceptée** : première exception au « sans menu » | Sans lui, on se perd, et les réglages n'ont pas de lieu. |
| **Les perles typées et bornées** : cinq visibles, triées par urgence ; tirer le fil vers le haut ouvre la liste datée. | **Acceptée** : seconde exception | Un fil à trente perles serait un menu en pire. Le guide vit dans le projecteur, pas dans les perles. |
| **Les pétales contraints** : trois au plus, du côté libre, 48 px ; le cartouche en bas de l'écran sur téléphone. | **Acceptée** | — |
| **Le double toucher** pour changer de cran ; l'échelle sous le pouce. | **Acceptée** | — |
| **Coder par la forme** : ton fil en ruban large, le rival en pointillé, l'associé en tirets doubles. **Le rouge réservé** au fil et à l'action unique ; les jauges à l'encre. | **Acceptée** | Daltonisme, et la règle « le rouge, c'est toi » redevient vraie. |
| **La Manœuvre en plein cadre** : cases d'au moins 44 px, pictogrammes, trait de visée, la pièce menacée qui se fêle. | **Acceptée** | — |
| **La jauge d'une ville segmentée par fournisseur**, et une pastille de rang à côté des ducats. | **Acceptée** | Le rival et le classement se lisent sans rien ouvrir. |
| **Des gestes cachés** (appui long, deux doigts). | **Interdits** | Personne ne les trouve. |
| **Valider sur la maquette 2D de bureau.** | **Interdit** | Toute validation d'interface se fait à 390 px, d'une main, dans le rendu de Porcellana. |

## 4. Ce que ça change, en bref

1. **Le fil devient un engagement** : il se patine, il se tresse, les bobines se teignent.
2. **Le PvE a un visage et ne tarit plus** : capitaines à trois phases, détroits noirs communs, garde du jour, sorties annoncées.
3. **La Manœuvre a de vraies positions** : les coups partent de la garde.
4. **La rivalité a une échelle** : le rival de la semaine, le sestiere, le monde et ses trois lauriers, les ligues, la Sérénissime.
5. **L'interface assume deux exceptions** : le médaillon de la Maison et la liste des nouvelles.

## 5. Mes réserves de chef

- **Le jeu grossit.** La revue ajoute une quinzaine de règles. Aucune n'entre au prototype si elle n'est pas nécessaire à son étape : le chemin (§ 17 du cadrage) dit laquelle arrive quand.
- **La Manœuvre reste à prouver.** La correction la rend non triviale sur le papier ; seuls des robots et des joueurs diront si elle tient cent parties.
- **Les experts n'ont rien simulé.** Leurs chiffres (+5 % par jour, 15 % qui montent) sont des points de départ pour le simulateur, pas des réglages.
- **Aucune recherche extérieure neuve** dans cette revue : les experts se sont appuyés sur leur connaissance des jeux cités.
