# Panel de joueurs : le plan de la profondeur (5 novembre 2026)

*Exercice de jeu de rôle, demandé pour éprouver `docs/plan-profondeur-2026-11-05.md` (version 2, validée par le porteur, pas encore codée) avant le premier lot. Trois joueurs fictifs lisent le plan, l'audit du jour (`docs/audit-gameplay-2026-11-05.md`) et `docs/plan-porta.md`, et en parlent comme sur un Discord de joueurs. Leurs avis ne sont pas des décisions ; tout ce qui sort du chemin va dans `IDEAS.md` après tri par le porteur.*

**Les trois voix**

- **Margaux** (34 ans) : 2 000 h sur Factorio, Anno 1800 et Satisfactory. Elle cherche les ratios et les goulots, écrit des guides. Elle déteste les faux choix.
- **Tom** (27 ans) : Patrician IV, Port Royale 4, Offworld Trading Company, Against the Storm. Il aime les routes, le marché qui bouge, le risque. Il joue beaucoup sur mobile.
- **Inès** (41 ans) : joue dans le métro, 3 à 5 minutes plusieurs fois par jour. Hades' Star, Mini Metro, Pocket City, Townscaper, Slay the Spire. Elle aime la profondeur, pas les corvées ni les écrans chargés, et elle fuit les jeux qui punissent l'absence.

**Le point de départ, d'après l'audit.** Une session, c'est 3 à 8 touchers et 30 secondes de jeu. Le geste de la tournée au doigt est revenu, la carte passe à 31 villes. Mais tant que le stock couvre toutes les commandes, il n'y a rien à décider.

> **Tom** — Je lis l'audit et je me dis : 30 secondes, une tournée par session, le jeu choisit le véhicule… c'est un idle game avec une jolie carte. Le plan dit « il y a toujours plus de commandes que de quoi les servir ». Pour moi, c'est **la** phrase du document. Tout le reste en découle.
>
> **Margaux** — D'accord, mais attention : « plus de demande que d'offre », c'est la condition pour qu'il y ait un problème, pas encore un problème intéressant. Factorio n'est pas intéressant parce que la demande dépasse l'offre. Il l'est parce que chaque solution crée un nouveau goulot ailleurs. Le plan le dit (« chaque goulot en déplace un autre »). Je vais vérifier ligne par ligne si c'est vrai ou si c'est du « +x % » maquillé.
>
> **Inès** — Et moi je vais vérifier que tout ça tient en trois minutes entre Bastille et Nation. Sept mécaniques de production, une tournée en frise, une Porta à équipement typé… j'ai déjà peur du mot « tableur », et le plan l'écrit lui-même au § 2.8.

---

## 1. Le magasin du fondaco (§ 2.1)

**Ce qui les enthousiasme**

> **Inès** — L'étagère, et **glisser une pile vers la lagune avec un plouf**. Je veux ça tout de suite. C'est exactement le geste Townscaper : un toucher, un son, une conséquence visible. L'arc rouge brique autour du fondaco, je le lis sans lunettes dans un wagon bondé. Les caisses cerclées d'or pour ce qu'une commande réclame, parfait : je sais quoi ne pas jeter sans lire une liste.
>
> **Margaux** — L'encombrement par lot (marbre 3 places, soie ½), c'est la vraie bonne idée. La **densité de valeur par place** devient une statistique centrale : ducats par place-heure. Je ferai le tableau dès la première semaine, pardon Inès. Le magasin plein qui **arrête les ateliers** en amont, c'est du backpressure à la Factorio : un tapis plein bloque la machine. C'est enfin une contrainte qui se propage.
>
> **Tom** — Les entrepôts sur des cases du domaine, contre un atelier, c'est un vrai arbitrage. Et les périssables, j'adore : Patrician avec ses harengs qui comptent, ça donne du rythme.

**Ce qui les ennuierait**

> **Inès** — Les périssables, justement. Mon poisson pourrit pendant que je dors, je me réveille à un étal brun ? Ça, c'est punir l'absence. Je sais que la règle d'or 3 a été retirée, mais retirer une règle n'oblige pas à punir. Je veux bien que le poisson se gâte **en soute** ou **au quai pendant une tournée**, pas pendant ma nuit.
>
> **Tom** — Sans périssables, il n'y a pas de « vite, avant que ça pourrisse ». C'est le seul timer naturel du plan.
>
> **Inès** — Le sablier des commandes en est déjà un. Deux horloges qui tournent quand je ne suis pas là, c'est une de trop.
>
> **Margaux** — Ma crainte est ailleurs : le magasin plein qui arrête les ateliers, c'est très bien… si la file de nuit est absorbée comme promis. Sinon, je vais bêtement remplir à 99 % chaque nuit et vider au réveil. C'est une corvée, pas une décision.

**Ce qu'ils exploiteraient**

> **Margaux** — Quatre fuites dans la règle telle qu'écrite :
> 1. **Le camp comme entrepôt gratuit.** « Un camp d'extraction garde son tas sur place. » Donc le tas au camp ne compte pas au magasin. Je laisse le marbre à la carrière jusqu'à la commande, je ne le ramène que le jour J. Le plafond du fondaco ne vaut alors que pour ce qui sort des ateliers.
> 2. **La soute comme entrepôt.** Un chariot chargé qui reste à quai, c'est des places en plus. Avec cinq véhicules, j'ai un entrepôt roulant. Il faut dire si un véhicule à quai peut garder sa cargaison.
> 3. **Brader comme puits infini.** Si le prix de la Dogana dépasse le coût des intrants, je ne m'arrête jamais. Je produis à fond et je brade le trop-plein : le plafond ne mord plus. Le prix bradé doit rester **sous** la valeur des intrants, ou être plafonné par jour.
> 4. **Le transfert comme plafond partagé.** Deux fondaci, c'est deux magasins. Rien de grave, mais il faut que le transfert coûte vraiment un véhicule et du temps.
>
> **Tom** — J'ajoute la cinquième : **jeter est gratuit**. Si refaire coûte peu, jeter ne fait jamais mal, et la question « je garde le marbre ou je jette » n'a pas de poids. Le marbre doit être cher à ravoir. Ça tombe bien, c'est l'extraction.

**Ce dont ils parleraient sur le forum**

- « Ducats par place : la tier list des marchandises » (Margaux).
- « Entrepôt ou atelier sur la case 3 ? »
- « Le poisson salé vaut-il la place d'atelier ? »

**Ce qui manque**

- **Un historique de ce qu'on a jeté** : un petit tas de caisses au fond de la lagune, qui se voit à marée basse. C'est l'idée de Tom, Inès l'adore.
- **Une règle de garde** : « garder au moins N marbres » ou « ne jamais jeter les cerclés d'or ». Sans elle, le joueur absent ne peut rien prévoir.
- **La réponse claire** à « que fait l'atelier bloqué ». S'il s'arrête sans rien perdre, Inès est rassurée.

---

## 2. L'extraction (§ 2.2)

**Ce qui les enthousiasme**

> **Tom** — Enfin une géographie ! Les carrières du Véronais, les salines de Chioggia, les forêts du Cadore : la carte a des **raisons** d'aller quelque part. Et le tas qu'il faut aller chercher en véhicule, c'est du fret de retour qui a un sens. Port Royale 4 en rêvait.
>
> **Margaux** — Les **retours décroissants** sur le nombre d'ouvriers, c'est un vrai choix, à condition que la courbe se voie. Il y a un genou quelque part (5 ? 6 ?) : je le trouverai en deux jours, et il faut qu'il **dépende** de la richesse du filon et des outils, sinon c'est une constante. Le filon qui baisse et remonte lentement, c'est de la rotation de cultures : très bien.
>
> **Inès** — Glisser des figurines d'ouvriers du domaine vers la carrière, voir le petit convoi partir, la colline qui se creuse : oui. C'est du Hades' Star : j'envoie, je reviens plus tard, quelque chose a changé.

**Ce qui les ennuierait**

> **Inès** — Les **vivres qui se mangent chaque jour sur place**. « Faute de vivres, l'équipe ralentit puis rentre. » D'accord pour ralentir. Mais je ne veux pas être *obligée* de revenir ravitailler toutes les huit heures. Et l'équipe qui rentre seule, est-ce qu'elle ramène le tas ? Ou je perds tout ?
>
> **Margaux** — Les vivres, j'ai peur que ce soit un faux choix. Pain, poisson salé, vin : si le pain est le moins cher par jour d'équipe, tout le monde envoie du pain, point. Il faut que chaque vivre **fasse quelque chose de différent** : le vin accélère, le poisson salé dure plus longtemps, le pain est la base.
>
> **Tom** — La prospection me paraît plate : un éclaireur, une révélation, et c'est fini pour toujours. Dans Against the Storm, ouvrir une clairière est un **risque**. Ici, c'est un bouton.

**Ce qu'ils exploiteraient**

> **Margaux** — Avec des retours décroissants **par camp**, la meilleure stratégie est de **multiplier les petits camps** de trois ouvriers. Si les gisements sont nombreux, personne ne fera jamais un grand camp. Il faut soit un coût fixe par camp (le convoi, la cantine), soit peu de gisements par secteur.
>
> **Tom** — La rotation : j'exploite la carrière A jusqu'à 50 %, je passe à B, et A remonte. Si la remontée est assez rapide, deux carrières suffisent pour l'éternité. Ce n'est pas un exploit, c'est un build. Il faudra juste que ce soit lisible.
>
> **Margaux** — Et le plus gros : **le tas qui arrête le camp**. Je calibre ma tournée pour passer juste avant qu'il plafonne. Une fois le ratio trouvé (ouvriers ÷ fréquence de passage ÷ taille de soute), c'est réglé. Il faut que la richesse bouge assez pour que le ratio change.

**Ce dont ils parleraient sur le forum**

- « Le genou des carrières : combien d'ouvriers par filon. »
- « Carrière lointaine riche ou proche épuisée : le calcul. »
- « Quelle carte de gisements avez-vous ? » (si la carte est tirée par joueur).

**Ce qui manque**

- **Une seule courbe visible** : le rendement contre le nombre d'ouvriers, dessinée au moment où l'on glisse les figurines. La 6e figurine bêche moins vite, et on le voit.
- **Une prospection qui comporte un risque ou un choix**, par exemple trois secteurs proposés, on en ouvre un.
- **Ce qui arrive à l'équipe quand Inès est absente** : elle s'arrête, garde son tas, et attend. Rien ne doit se perdre.

---

## 3. Les ouvriers, les artisans et la table (§ 2.3)

C'est la partie qui les divise le plus.

> **Margaux** — C'est **le** cœur. Anno 1800 tient tout entier sur cette idée : tes gens consomment une partie de ce que tu produis, et monter en gamme demande de mieux les nourrir. La phrase « nourrir les siens consomme une part de sa production : ce n'est plus tout pour la vente » vaut tout le plan. Et les mêmes bras pour les ateliers et les expéditions, c'est l'arbitrage central, le plan a raison.
>
> **Inès** — C'est **la** partie qui me ferait partir. La table qui se vide quand je suis absente, et un domaine qui ralentit parce que je n'ai pas joué samedi. Le plan l'écrit lui-même : « C'est aussi celui où l'absence coûte le plus. » Pourquoi le choisir ?
>
> **Margaux** — Parce que sans consommation interne, rien ne sort de l'économie, et on revient au « on produit trop » du porteur.
>
> **Inès** — Alors que la table **ne se mange que quand on produit**. Si la production est calculée paresseusement et plafonnée à 12 h, le domaine travaille 12 h, mange 12 h, puis s'endort. Mes gens ne meurent pas, ne partent pas, ils dorment. Je reviens, je relance. Zéro punition, et la consommation existe quand même.
>
> **Margaux** — … ça me va. Je n'ai pas besoin qu'ils souffrent, j'ai besoin qu'ils mangent. Tant que la **table variée** donne un vrai bonus et attire du monde.
>
> **Tom** — Moi, ce qui m'ennuie, c'est la formation des artisans « avec du temps et des ducats » : c'est un minuteur de plus. Je préférerais qu'un ouvrier devienne artisan **en travaillant** sur la recette fine, comme l'expérience dans Against the Storm.

**Ce qui les ennuierait**

- **Inès** : voir des personnages qui vont des maisons aux ateliers, c'est joli une fois, puis du bruit. Elle veut une **vue calme** par défaut.
- **Margaux** : les postes « sans assez d'ouvriers, l'atelier tourne au ralenti ». Il faut dire **comment**. Linéaire ? Avec un seuil ? Si c'est linéaire, il n'y a pas de décision, on remplit tout le monde à moitié.
- **Tom** : glisser un ouvrier atelier par atelier, à l'unité, sur un téléphone, est une corvée dès 30 ouvriers. Il faut des **priorités** (cet atelier d'abord) plutôt qu'une affectation à la main.

**Ce qu'ils exploiteraient**

> **Margaux** — La boule de neige : une table variée attire des ouvriers jusqu'à la place des maisons. Donc la meilleure ouverture est **maisons + vin**, tôt, puis tout le reste. Si le vin est aussi la marchandise que Vérone paie le mieux, je garde 100 % de mon vin pour mes gens pendant la première semaine, je double ma population et je rattrape tout. Il faut que le bonus sature vite.
>
> **Tom** — La table minimale : pain seul, j'accepte le ralentissement si le vin vendu rapporte plus que la cadence perdue. Ça, ce n'est pas un exploit, c'est exactement le calcul qu'on veut faire faire au joueur. À condition que les deux réponses soient défendables selon le build.
>
> **Margaux** — Et l'artisan : si une recette fine paie trois fois plus, je forme tous mes ouvriers et je n'ai plus de manœuvres. Il faut que les artisans **ne fassent pas** le travail des manœuvres, ou le fassent mal (un verrier à la carrière, c'est du gâchis).

**Ce dont ils parleraient sur le forum**

- « Le ratio maisons/ateliers optimal à la Casa 6 » : le fil Anno classique.
- « Pain seul ou table variée ? » : le débat éternel.

**Ce qui manque**

- **Une règle explicite de non-punition** : la table ne se consomme que pendant la production ; vide, le domaine s'arrête, sans désertion.
- **Une seule jauge** pour la table, l'assiette et la cruche du plan, plutôt qu'un détail par denrée.

---

## 4. Les chaînes longues et les sous-produits (§ 2.4)

**Ce qui les enthousiasme**

> **Margaux** — Je relis le drap : laine, fil, teinture (guède, alun), tissage, foulage au moulin. Quatre étapes, un moulin qui exige la rivière. C'est un vrai graphe. Et **les sous-produits qui encombrent**, c'est le génie du plan : dans Satisfactory, l'eau usée t'oblige à boucler ou à tout bloquer. Ici, le calcin et la sciure prennent la place au magasin, donc il **faut** les valoriser ou les jeter. Le magasin et les chaînes se nourrissent l'un l'autre.
>
> **Tom** — Les deux ou trois recettes par atelier (simple et rapide contre fine qui demande un artisan) : c'est le compromis que j'aime. Et « j'achète l'alun au marché ou je monte une teinturerie ? », c'est du Patrician : produire ou acheter.
>
> **Inès** — La **vue des flux**, un toucher sur le médaillon qui trace le chemin de la marchandise sur le domaine avec les goulots en rouge : c'est ce qui rend tout le reste supportable. Sans elle, je décroche. Avec elle, je comprends en une seconde pourquoi mon drap n'avance pas.

**Ce qui les ennuierait**

> **Inès** — Quatre étapes pour un drap, c'est quatre ateliers à surveiller. Si chacun a son râtelier, ses postes, sa cour pleine de sciure… je ne vois plus le domaine.
>
> **Margaux** — C'est là qu'il faut le Factorio du pauvre : un atelier **suffit** à une étape si les ratios sont propres. Annoncer les ratios en entiers simples (1 laine → 2 fils ; 2 fils + 1 teinture → 1 drap) rend le jeu « solvable de tête ». Des ratios en 0,73 rendent le jeu « solvable au tableur ». Je préfère de loin les premiers, et je les ai déjà écrits dans mon guide.

**Ce qu'ils exploiteraient**

> **Margaux** — Les **boucles de sous-produits**. « Calcin → refondu. » Si le calcin refondu redonne du verre **sans** sable, j'ai une boucle à moitié gratuite : verre → calcin → verre. Il faut que la refonte demande du combustible, ou qu'elle ne donne que du verre commun. « Sciure → fours » : si la sciure remplace le charbon, la forge n'a plus besoin de mine. Ce n'est pas mal en soi, mais il faut que ça se voie et que la sciure ne suffise pas à tout.
>
> **Tom** — Le marché : si l'alun s'achète à prix fixe, la teinturerie ne vaut jamais le coup, ou toujours. Il faut un prix qui monte quand on en achète beaucoup. Sinon c'est un faux choix, Margaux te le dirait.
>
> **Margaux** — Je te le dis.

**Ce dont ils parleraient sur le forum**

- « Le diagramme complet du drap fin » : quelqu'un fera le graphe des recettes en une nuit.
- « Les sous-produits qui valent plus que le produit » : il y en aura un, il y en a toujours un.

**Ce qui manque**

- **Un livre des recettes visuel** (les marchandises en marques, reliées par des flèches) consultable hors du domaine, pour préparer ses plans dans le métro.
- **Le sens des ratios** : des entiers, affichés sur l'atelier en petites caisses (2 ▸ 1).

---

## 5. La qualité qui se propage (§ 2.5)

> **Margaux** — Trois niveaux, qui viennent des intrants **et** de l'artisan : très bien, c'est une deuxième dimension qui ne se réduit pas au débit. Les intrants de substitution (soude d'Alexandrie, chère, contre cendres de salicorne, gratuites) : le meilleur exemple du plan d'un **vrai** choix, pas d'un pourcentage.
>
> **Inès** — Le cerclage (aucun, argent, or), partout, je l'adore. Une seule couleur m'apprend tout. Pas de chiffre, pas de « qualité 73 ».
>
> **Tom** — Les commandes qui exigent du fin à deux ou trois fois le prix, c'est le carburant du commerce. Je ferai une route du luxe.

**Ce qui les ennuierait**

> **Margaux** — Si l'exquis paie toujours mieux par place, plus personne ne fait du commun. Il faut que le commun ait son marché : la table de ses gens, les bourgs, les contrats en volume (l'Arena veut 40 marbre, elle se moque qu'il soit blanc).
>
> **Inès** — Et que je n'aie jamais à trier mes caisses par qualité à la main. Le magasin range, je regarde.

**Ce qu'ils exploiteraient**

> **Tom** — **Tout en exquis, ne vendre qu'aux grandes villes.** Avec la soute en places, l'exquis est petit et cher : la meilleure densité de valeur du jeu. Le joueur qui a un filon de marbre blanc et deux maîtres sculpteurs écrase tout.
>
> **Margaux** — Et une ruse plus fine : si l'exquis s'obtient avec **un** intrant de qualité sur trois, et que la règle est « le meilleur l'emporte », je mets un seul intrant fin et je gagne la qualité. La règle doit être « le moins bon l'emporte », ou une moyenne affichée.

**Ce dont ils parleraient**

- « Soude ou salicorne : quand le verre exquis paie-t-il ? »
- « Le filon blanc de Carrare : où le trouver ? »

**Ce qui manque** : dire clairement **quel intrant décide** de la qualité, par une petite flèche sur l'écu de l'atelier.

---

## 6. Le plan du domaine : terroir, voisins, nuisances (§ 2.6)

> **Margaux** — Mon coup de cœur absolu. « L'ordre des ateliers le long de l'eau est une énigme à lui seul » : c'est la phrase qui fera écrire des guides. Une rivière avec un sens, une tannerie qui salit en aval, un moulin qui exige l'eau : c'est Anno avec les fermes et les rayons d'influence, mais orienté. Et l'aperçu vert/rouge en plaçant, parfait.
>
> **Inès** — La rivière qui se teinte en aval, les panaches de fumée, l'aperçu sur les cases : c'est Townscaper qui me répond. Je place, ça réagit. J'aime.
>
> **Tom** — Moi je suis plus tiède : c'est un jeu de construction de ville dans un jeu de commerce. Je joue Patrician pour les routes, pas pour l'urbanisme. Mais je reconnais que c'est visuel et que ça fera parler.

**Ce qui les ennuierait**

> **Margaux** — **Le domaine identique pour tous.** Si chaque joueur a la même rivière au même endroit, il existe un plan optimal, publié sur le forum en 48 h, et tout le monde le copie. L'énigme est résolue une fois pour toutes. Le terroir doit être **tiré par joueur** (une graine par Maison) : alors l'énigme est toujours neuve, et les guides parlent de principes, pas de cases.
>
> **Inès** — Et que déplacer un atelier ne coûte pas trop cher. Je me trompe, je veux réparer. Le plan dit « un chantier » : d'accord si c'est court, pas si c'est 6 h et des ducats.
>
> **Margaux** — Pas d'accord : si déplacer est gratuit, il n'y a pas d'engagement, donc pas d'énigme. Disons gratuit pendant la première heure après la pose, et un chantier ensuite.
>
> **Inès** — Ça me va.

**Ce qu'ils exploiteraient**

> **Margaux** — Avec la nuisance limitée à l'aval, la tannerie se met **tout en bas de la rivière**, toujours. Une seule réponse, donc pas de choix. Il faut une tension : la tannerie veut l'eau, mais aussi être près de l'abattoir (sous-produit : peaux), qui veut être près des maisons… C'est le triangle qui fait l'énigme.
>
> **Tom** — La fumée qui gêne les maisons : tu mets les maisons au vent, et c'est fini. Si le vent tourne avec les saisons (la bora l'hiver, le sirocco l'été), là ça devient intéressant.

**Ce dont ils parleraient** : « Mon domaine en photo », des captures partagées, des « avant/après » d'un ordre de rivière. C'est la partie la plus **montrable** du plan.

**Ce qui manque** : **un mode plan fantôme** (poser les ateliers en transparence sans payer) pour réfléchir avant d'engager. Voir l'idée de Margaux en § 15.

---

## 7. Les outils et la forge (§ 2.7)

> **Margaux** — Je suis déçue. « De meilleurs outils durent plus longtemps et vont plus vite » : c'est **littéralement** le « +x % de cadence » que le porteur ne voulait plus. Acier strictement meilleur que fer, c'est un faux choix. Et l'usure, c'est de l'entretien : de la maintenance, pas de la décision.
>
> **Inès** — Un râtelier par atelier qui ternit, puis se brise, sur une quinzaine d'ateliers : c'est la corvée parfaite. Je vais passer mes trois minutes à remplacer des pioches.
>
> **Tom** — Je défends quand même la boucle mine → forge → mine, c'est joli sur le papier. Mais il faut que les outils soient **différents**, pas meilleurs. Une scie rapide qui fait plus de sciure ; une pioche fine qui garde la qualité du filon mais avance lentement.
>
> **Margaux** — Ça, oui. Des outils à **effet de bord**, comme les objets d'Anno 1800 : +50 % de production, mais −1 attractivité ; ou plus de qualité, mais plus d'usure. Là, il y a un vrai choix.

**Ce qu'ils exploiteraient** : si l'acier dure trois fois plus longtemps pour deux fois le prix, il ne reste qu'une stratégie : tout en acier, dès qu'on peut. Et si l'usure ne compte que pendant la production, un atelier arrêté ne s'use pas, donc le stock d'outils se calcule une fois.

**Ce qui manque** : un **réapprovisionnement automatique** depuis le magasin (l'atelier prend son outil tout seul), et un seul signal visuel (« la forge manque de fer ») plutôt que quinze râteliers.

---

## 8. Les goûts des villes (§ 3.2, règle 1)

> **Tom** — Excellent. La demande qui **ne suit plus l'offre**, c'est ce qui fait un jeu de commerce. Vérone qui veut du vin et du marbre, que je les produise ou non : je dois **choisir mes villes** et bâtir pour elles. Patrician IV en entier.
>
> **Inès** — L'enseigne de la ville avec ses deux ou trois marques dessinées : je sais en un coup d'œil où aller. Très bien.
>
> **Margaux** — Je m'inquiète du « résolu ». Des goûts fixes, c'est une carte fixe : au bout d'une semaine, il y a « la route de Vérone », « la route de Padoue », et un guide les liste. Pour que ça reste discutable, il faut que les goûts **bougent un peu** : une ville sur trois change un goût par chapitre, annoncé dans les notes du mois (la règle de stabilité le permet).
>
> **Tom** — Ou mieux : que la ville **grandisse** quand on la sert, comme dans Port Royale 4. Une ville bien servie passe de bourg à ville, et ses goûts montent en gamme (du brut au fini). Le joueur **façonne** sa carte.

**Ce qu'ils exploiteraient** : tous les joueurs d'une même bande serviraient la même ville la plus riche. Rien de grave entre joueurs (pas de vol), sauf si les commandes sont partagées : il faut dire si les commandes d'une ville sont **à chacun** (comme les reliques de la Porta) ou communes. Inès veut qu'elles soient à chacun : pas de course.

**Ce dont ils parleraient** : « Les meilleures villes pour un build verre », « la route du sel de Chioggia ».

---

## 9. Les échéances (§ 3.2, règle 2)

> **Tom** — Les meilleures commandes sont les plus pressées : voilà le risque que j'aime. Livrer à temps paie plein, en retard moins, sablier vide, elle part. Simple et visuel.
>
> **Inès** — C'est la mécanique que j'accepte, **à une condition** : qu'une commande qui part ne me coûte rien d'autre que l'occasion manquée. Pas de réputation qui baisse, pas d'amende. Hades' Star fait ça : la livraison que tu ne fais pas ne te punit pas, elle ne te paie pas.
>
> **Margaux** — D'accord. Mais attention au sablier qui tourne pendant la nuit : si les meilleures commandes ont un sablier de 2 h, seuls les joueurs présents toute la journée y ont accès. Il faut que la pression soit **relative au trajet**, pas au réveil : un sablier de « trois fois le temps du trajet » est juste pour tout le monde.
>
> **Inès** — Ou que le sablier ne commence qu'**à la première vue** de la commande par le joueur. J'ouvre le jeu, je vois la commande, le temps part.
>
> **Tom** — Ça tue le jeu du « je me connecte au bon moment »… et c'est très bien.

**Ce qu'ils exploiteraient** : livrer systématiquement **en retard** si la perte est faible (« moins » : combien ?). Si le retard ne coûte que 10 %, toutes les tournées seront optimisées pour la soute, jamais pour l'heure. Il faut une courbe nette : plein, puis la moitié, puis plus rien.

---

## 10. Les contrats de ville (§ 3.2, règle 3)

> **Inès** — L'Arena de Vérone en échafaudages, qui **monte à chaque livraison** : c'est mon image préférée du plan. Un objectif partagé sur plusieurs sessions, visible sur la carte.
>
> **Tom** — Un gros paiement, un titre, un plan. Plusieurs véhicules, plusieurs tournées. Oui.
>
> **Margaux** — « 40 marbre, 20 bois, 10 fer en trois jours » : à 3 places le marbre, c'est 120 places de soute. Le contrat est une épreuve de **logistique**, pas de production. J'aime, si le joueur peut refuser. Un contrat imposé, c'est une corvée.

**Le désaccord**

> **Inès** — Trois jours, c'est « être présent pendant des jours », la règle d'or 7 l'interdit. Je propose que le contrat ne se perde pas : il reste ouvert jusqu'au bout, et c'est **la prime** qui baisse avec le temps.
>
> **Tom** — Alors ce n'est plus un risque.
>
> **Inès** — Le risque, c'est de ne pas toucher la prime pleine. Ça suffit.

**Ce qu'ils exploiteraient** : si le contrat paie en **plans**, il contourne la Porta (règle d'or 5 : les hauts niveaux se gagnent en jouant, par les reliques). Margaux le signale : les plans des contrats doivent être des plans **de négoce** (ateliers, entrepôts), pas ceux des composants.

**Ce qui manque** : un **contrat de Compagnie**, où plusieurs membres livrent le même chantier (l'Arena monte plus vite à plusieurs), sans rien se prendre. C'est le « la compagnie aide sans obliger » de la règle 7.

---

## 11. La tournée qui charge et décharge (§ 3.2, règles 4 et 5 ; § 3.3)

> **Tom** — C'est ce que j'attendais. Plus de retour à vide, la matière locale achetée en ville au retour, le tas du camp sur la route : la tournée devient un **problème de voyageur de commerce avec soute**. La frise sous la carte, avec la soute en grille qui se vide et se remplit d'arrêt en arrêt : le plus bel écran du plan.
>
> **Margaux** — La frise, c'est mon tableau de flux, mais dessiné. Je peux optimiser les places-kilomètres à vide. C'est mesurable, donc ça fera des guides. Et l'encombrement en soute (marbre 3, soie ½), cohérent avec le magasin : une seule règle, deux endroits.
>
> **Inès** — C'est là que je m'inquiète le plus. Je trace ma tournée du doigt, d'accord, c'est le geste de l'audit et il est revenu. Mais **à chaque session, recomposer six arrêts** ? Mini Metro me laisse tracer une ligne **une fois**, et je la modifie quand le réseau change. Ici, si je recompose tout à chaque fois, c'est une corvée au bout d'une semaine.

**Le grand débat : l'automatisation**

> **Tom** — Patrician IV a les routes automatiques : on règle acheter/vendre par ville, le convoi tourne seul. C'est le confort de mi-partie. Mais c'est aussi la mort de la décision si on l'ouvre trop tôt.
>
> **Margaux** — Je suis contre une automatisation complète : on retombe dans le « 30 secondes, rien à décider ».
>
> **Inès** — Pas complète. Une **tournée régulière** : je la trace une fois, je la nomme, et un toucher la relance. Si une commande de la ligne a disparu, l'arrêt devient gris et la soute se recalcule. Je garde la décision de **quand** la relancer et de la **modifier**.
>
> **Margaux** — Avec un coût : une tournée relancée paie un peu moins qu'une tournée composée (le capitaine prend sa part). La tournée à la main reste l'optimum, la régulière est le confort.
>
> **Tom** — Vendu. C'est mon idée du capitaine (§ 15).

**Ce qu'ils exploiteraient**

> **Tom** — L'**arbitrage de la matière locale** : j'achète le sel à Chioggia à bon prix et je le brade à la Dogana de Venise. Si le prix de brade dépasse le prix d'achat local, c'est une machine à ducats, sans production. Il faut que le prix local **monte quand on achète** et redescende lentement, et que brader paie toujours moins que n'importe quel achat.
>
> **Margaux** — Le `maxStops: 15` : une tournée de quinze arrêts qui fait tout le nord en une fois. Si le temps de trajet n'a pas de coût (vivres du convoi ? usure ?), la plus longue tournée possible est toujours la meilleure. Il faut un coût au temps, ou au moins que les commandes à sablier expirent en route.
>
> **Tom** — Et le transfert entre fondaci comme « arrêt gratuit » : je décharge mon trop-plein dans mon deuxième fondaco pour ne pas jeter. C'est un usage normal, pas un exploit, tant que la place y est comptée.

**Ce dont ils parleraient** : « La boucle parfaite Venise–Chioggia–Padoue », des captures de frises avec 0 place à vide, un concours de la tournée la plus rentable de la semaine.

**Ce qui manque**

- **Le temps de chaque tronçon** sur la frise, pour comparer deux ordres d'arrêts sans tout refaire.
- **Le bouton « inverser l'ordre »** de la tournée : c'est souvent la seule question.
- **La soute qu'on remplit à la main** : laisser une place libre pour le retour, au lieu que le jeu la remplisse à l'aller.

---

## 12. Les véhicules du terrain (§ 3.2, règle 6)

> **Tom** — Le burchio rapide sur l'eau mais prisonnier de l'eau, la mule qui passe les cols mais porte peu, la charrette reine en plaine : c'est un **vrai** choix de flotte, celui qui manquait. Offworld le fait avec les terrains : la même ressource, ailleurs, ne coûte pas pareil.
>
> **Margaux** — Il me faut juste les chiffres sur la route : le tronçon lent en pointillé, très bien, mais aussi le temps total pour chaque véhicule, côte à côte, au moment de choisir.
>
> **Inès** — Une icône de véhicule sur la route qui dit « ici je suis lent » : ça me suffit.

**Ce qu'ils exploiteraient** : une fois les terrains connus, chaque route a « son » véhicule, et la flotte optimale se calcule. Ce n'est pas grave tant que les gisements et les goûts des villes changent la carte des besoins.

---

## 13. La Porta : reconnaissance, contres, combattants, équipement (§ 4.2 à 4.4)

**Ce qui les enthousiasme**

> **Inès** — La **reconnaissance vert/ambre/rouge** avant d'entrer. Slay the Spire en entier : je vois les intentions, je prépare. Je compose mon équipage et chaque garnison s'allume. C'est la meilleure idée de toute la partie Porta, et elle est très lisible.
>
> **Margaux** — La table des contres est **fixe et simple**, et c'est bien. Cinq types de dégâts, cinq protections. Elle donne des tier lists : c'est sain, à condition que **la carte change** le meilleur build. Le pavesier qui bloque le perçant de face et se contourne par le flanc, c'est une mécanique de **placement**, pas de statistique. Excellent.
>
> **Tom** — La charge, avec la selle qui ploie : des plates sur un cavalier, c'est possible mais ce n'est plus un cavalier. C'est le meilleur garde-fou contre le build « tout le meilleur sur tout le monde ».

**Ce qui les ennuierait**

> **Inès** — **Dix minutes en direct.** Mon trajet dure huit minutes. Si je perds le réseau sous la Seine, mes véhicules restent sur la carte, et à la fermeture ils sont **perdus**. C'est la seule punition dure du jeu, et elle tombe sur la joueuse de métro. Je voudrais un palier court (4 à 5 minutes, deux villes) et une règle claire : déconnecté, mon équipage **rentre seul à la porte** au bout de 60 s.
>
> **Tom** — Si l'équipage rentre seul, on fera exprès de se déconnecter pour fuir.
>
> **Inès** — Il rentre **sans** la relique en chargement, et c'est une perte de temps. Personne ne le fera exprès.
>
> **Margaux** — Mon souci, c'est le nombre de pièces : quatre types de combattants, trois places typées chacun, sept accessoires, cinq niveaux par composant. Avant chaque bataille, je reconfigure ? Il faut des **équipements enregistrés** (« anti-pavois », « anti-cavalerie ») qu'on charge en un toucher, sinon personne ne change jamais de build et la reconnaissance ne sert à rien.
>
> **Inès** — Oui ! Trois tenues enregistrées par combattant, un toucher.

**Ce qu'ils exploiteraient**

> **Margaux** — J'ai lu `plan-porta.md`. Trois failles évidentes :
> 1. **La couleuvrine tire à 3 cases, l'arbalétrier de Rome à 2, et il est immobile** (vitesse 0). Je m'arrête à 2,9 cases et je l'abats sans rien prendre. Avec la colline (+1 de portée), j'ai 4 cases contre la bombarde à 3 : plus rien ne me touche. L'artilleur devient la réponse à tout ce qui est fixe. Il faut que les arbalétriers aient des **pavesiers devant** (le plan le dit : « derrière un mur »), ou une contre-batterie.
> 2. **Le réexamen de cible** de Rome (8 s pour le hallebardier, 20 s pour le Gonfalonier) : je sors de portée juste avant, il lâche, je reviens. Du kiting pur. C'est un savoir-faire, pas un bug, mais il doit être annoncé, sinon c'est le guide « comment tuer le Gonfalonier sans perte » qui fera la loi.
> 3. **Le chevau-léger préfère le transport** (+1 000 de menace) : j'utilise mon transport comme **appât** et je l'amène dans mes piquiers. Ça, c'est un très bon exploit : c'est la synergie que le plan veut.
>
> **Tom** — Et la fumée : en forêt, Rome ne voit qu'à une case. La fumée est inutile en forêt et indispensable en plaine, donc le choix dépend du terrain. C'est bien.
>
> **Inès** — Moi, j'exploiterais le palier le plus bas en boucle, si les reliques rapportent assez. Hades' Star a eu ce problème avec les RS bas.

**Le débat : combattants contre véhicules**

> **Tom** — Remplacer cavalier, chariot de guerre et grand chariot par des types de combattants, c'est plus clair. Mais ceux qui ont monté un grand chariot au niveau 5 vont hurler s'il devient « un piquier ».
>
> **Margaux** — Le plan dit « convertis ». Il faut que la conversion soit **favorable** et laisse choisir le type, sinon le forum brûle le jour du patch.

**Ce dont ils parleraient** : « Tier list des combattants au palier 4 », « le build anti-Gonfalonier », « la fumée sert-elle à quelque chose ? », « mes trois tenues ». C'est la partie la plus **discutable** du plan, au sens où l'on en discute.

**Ce qui manque**

- **L'intention de Rome visible pendant la bataille** (voir l'idée d'Inès, § 15) : le chevau-léger dessine sa flèche vers le transport trois secondes avant de charger.
- **Un relevé de fin de bataille** : qui a fait quels dégâts, à qui, en barres colorées par type de dégâts. C'est indispensable pour apprendre les contres.
- **Un champ d'essai** : un pavesier de bois à la Remise, sur lequel on teste son équipement sans payer d'entrée.

---

## 14. Le terrain de bataille (§ 4.5)

> **Margaux** — Forêts, collines, fleuve à gués : trois règles, et chacune change le placement. La colline qui donne une case de portée, couplée à la couleuvrine, il faudra la surveiller (voir plus haut). Mais c'est le bon nombre de règles.
>
> **Tom** — Le gué, c'est le meilleur : un goulot naturel, qu'on tient avec deux piquiers. On aura des cartes où tout se joue au gué.
>
> **Inès** — Si les arbres, les reliefs et l'eau se lisent sans légende, oui. Si je dois apprendre une table de terrain, non.

**Ce qu'ils exploiteraient** : les variantes de la semaine (le brouillard) combinées au terrain. Si le brouillard raccourcit la vision de Rome et que la forêt la réduit à une case, une semaine de brouillard rend la fumée inutile et la cavalerie reine. Ce n'est pas un problème : c'est **la méta de la semaine**, et ça fait parler.

---

## 15. Les palmarès

### Margaux

**Son top 5**
1. **Le plan du domaine et la rivière orientée** (§ 2.6), avec un terroir tiré par joueur.
2. **Les chaînes et les sous-produits qui encombrent** (§ 2.4) : le magasin et la production se tiennent.
3. **La tournée en frise, avec la soute en grille** (§ 3.3) : l'optimisation enfin mesurable.
4. **Les contres, la charge et la reconnaissance** (§ 4.3, 4.4).
5. **La qualité qui se propage, avec les intrants de substitution** (§ 2.5).

**Ses 3 coupes**
1. **Les outils et la forge, sous leur forme actuelle** (§ 2.7) : c'est du « +x % » et de l'entretien. À refaire en outils à effet de bord, ou à couper.
2. **La prospection** (§ 2.2) : un bouton qu'on presse une fois.
3. **Brader à la Dogana** (§ 2.1), tant que son prix n'est pas borné : c'est la fuite qui annule le plafond.

**Ses 3 idées**
1. **Les plans fantômes à partager** (d'après les *blueprints* de Factorio et le mode plan d'Anno 1800).
   - *La mécanique* : on pose les ateliers en transparence sur le domaine, sans payer ; le jeu calcule l'aperçu (vert/rouge, flux, goulots). Un plan s'exporte en un **code court** (6 à 8 caractères) qu'on colle sur le forum. Un autre joueur le charge en fantôme sur **son** terroir, et voit où il marche et où il casse.
   - *À l'écran* : un bouton crayon sur le domaine ; les tuiles fantômes en verre bleuté, l'eau qui se teinte en aperçu ; un cachet « plan de Margaux » sur le côté.
   - *Pourquoi* : c'est le moteur de communauté de Factorio. Avec un terroir par joueur, le plan copié ne marche jamais tel quel, donc on l'adapte et on en parle.
2. **Le registre des flux** (d'après les statistiques de production de Factorio).
   - *La mécanique* : pour chaque marchandise, sur 24 h, ce qui a été produit, consommé (table, recettes), livré, bradé et jeté.
   - *À l'écran* : des **rubans** qui coulent de gauche à droite, à la couleur de la marque, épais selon le volume ; un ruban qui tombe dans la lagune pour le jeté. Aucun tableau. Un toucher sur un ruban montre le chiffre.
   - *Pourquoi* : on ne peut pas optimiser ce qu'on ne mesure pas. Et le ruban qui finit à l'eau fait honte, sans texte.
3. **Les compagnons à double tranchant** (d'après les objets de la *Trade Union* d'Anno 1800).
   - *La mécanique* : un artisan (ou un maître) porte un **trait** avec un prix : « le verrier pressé » (+40 % de cadence, jamais d'exquis), « le vieux tisserand » (toujours fin, mais deux postes à lui seul), « le forgeron bavard » (ses outils durent deux fois plus, mais la fumée de sa forge s'étend). Ils remplacent les modules en « + % ».
   - *À l'écran* : une petite carte-portrait posée sur l'atelier, avec un avantage en or et un défaut en brique, dessinés en icônes.
   - *Pourquoi* : aucun trait n'est strictement meilleur. Le bon dépend du build, d'où les tier lists et les débats.

### Tom

**Son top 5**
1. **Les goûts des villes** (§ 3.2, 1), avec des villes qui grandissent quand on les sert.
2. **La tournée qui charge et décharge**, avec l'achat de la matière locale (§ 3.2, 4).
3. **Les échéances** (§ 3.2, 2) : le risque, la pression, les meilleures commandes pressées.
4. **L'extraction, avec le tas qu'on va chercher** (§ 2.2).
5. **Les véhicules du terrain** (§ 3.2, 6).

**Ses 3 coupes**
1. **La table des ouvriers** (§ 2.3) dans sa version détaillée : pain, viande, vin, assiette, cruche. Une jauge suffit.
2. **Les nuisances de fumée** (§ 2.6) : on met les maisons au vent et c'est fini. Garder la rivière, couper la fumée.
3. **L'usure des outils** (§ 2.7) : maintenance sans choix.

**Ses 3 idées**
1. **Le cours du Rialto** (d'après le marché partagé d'Offworld Trading Company).
   - *La mécanique* : le prix de vente de chaque marchandise à la Dogana bouge avec **ce que tout le monde y vend** dans la bande de Puissance, et remonte lentement. Personne ne prend rien à personne (règle d'or 1), mais si tout le monde fait du verre, le verre baisse. Le joueur malin fait ce que les autres ne font pas.
   - *À l'écran* : sur le quai de Venise, une **ligne de marée** par marchandise contre un pilier peint ; l'eau monte quand le prix baisse (« le verre est noyé cette semaine »). Un toucher montre la courbe de 7 jours.
   - *La réserve* : Margaux fait remarquer que c'est indirectement « un risque venu d'autres joueurs » (règle d'or 2). Tom répond que c'est un marché, pas une attaque. Au porteur de trancher ; à défaut, le cours ne bouge qu'avec les ventes **de ses propres** fondaci.
2. **Le capitaine de route** (d'après les convois automatiques de Patrician IV).
   - *La mécanique* : une tournée composée à la main **trois fois** peut être confiée à un capitaine. Il la refait sur un toucher, à 85 % du gain, et saute les arrêts devenus vides. On reprend la main quand on veut.
   - *À l'écran* : la tournée devient une **ligne colorée et nommée** sur la carte (« la boucle du sel »), avec un petit pavillon ; un toucher sur le pavillon la relance.
   - *Pourquoi* : c'est le confort mobile qui ne tue pas la décision, puisque la meilleure tournée reste celle qu'on compose.
3. **Les faveurs du chapitre** (d'après les *cornerstones* d'Against the Storm).
   - *La mécanique* : au début de chaque chapitre (le mois), on choisit **une faveur parmi trois**, tirées pour sa Maison : « les mules passent les cols sans ralentir », « le poisson ne se gâte pas en soute », « les commandes de Padoue paient +25 % mais leur sablier est moitié plus court ». Elle dure le chapitre.
   - *À l'écran* : trois sceaux de cire posés sur la table du fondaco, un à briser ; le sceau choisi reste accroché au médaillon.
   - *Pourquoi* : chaque mois, le build optimal change un peu. C'est le carburant des débats (« quelle faveur pour un build verre ? »).

### Inès

**Son top 5**
1. **Le magasin visuel** (§ 2.1) : l'étagère, l'arc, glisser vers la lagune.
2. **La reconnaissance vert/ambre/rouge de la Porta** (§ 4.3).
3. **Les contrats en chantier qui monte** (§ 3.2, 3).
4. **Les goûts des villes, dessinés sur l'enseigne** (§ 3.2, 1).
5. **La qualité en cerclage** (§ 2.5).

**Ses 3 coupes**
1. **La table qui se vide pendant l'absence** (§ 2.3). La consommation, oui ; la faim pendant le week-end, non.
2. **Les périssables hors soute** (§ 2.1) : le poisson qui pourrit pendant la nuit.
3. **L'usure des outils** (§ 2.7) : quinze râteliers à surveiller.

**Ses 3 idées**
1. **Les lignes** (d'après Mini Metro).
   - *La mécanique* : une tournée tracée reste sur la carte comme une **ligne** de couleur. On la modifie en tirant un arrêt hors de la ligne ou en en ajoutant un, comme une ligne de métro. Chaque lundi, on reçoit **un cadeau au choix entre deux** : un wagon de plus (soute +1) ou un pont (un raccourci sur un fleuve).
   - *À l'écran* : les lignes en couleurs pleines, simples, à la Mini Metro ; les véhicules en petits rectangles qui y glissent ; le cadeau du lundi en deux cartes à toucher.
   - *Pourquoi* : je garde la décision (le tracé, le cadeau), je perds la corvée. Tom et moi, on veut la même chose sous deux noms.
2. **Les intentions de Rome** (d'après Slay the Spire).
   - *La mécanique* : chaque unité de Rome montre ce qu'elle va faire **avant** de le faire : la flèche du chevau-léger vers le transport, le cercle de la bombarde là où elle va frapper, la torche de l'incendiaire vers la ville visée. C'est l'IA du `plan-porta.md` (§ 6.5), rendue visible au moment du réexamen.
   - *À l'écran* : une petite icône au-dessus de chaque figurine (une flèche, une cible, une flamme), et la trajectoire en pointillé rouge.
   - *Pourquoi* : sur un petit écran, je ne peux pas suivre huit unités. Je peux lire huit icônes. Le combat devient un puzzle, plus une course de réflexes.
3. **Le domaine qui s'embellit seul** (d'après Townscaper).
   - *La mécanique* : quand deux ateliers sont bien placés (voisins liés, terroir juste, pas de nuisance), le jeu ajoute **de lui-même** des détails : une arcade entre eux, un jardin, un pont de bois. Un domaine bien pensé est **visiblement beau**, un domaine mal pensé reste nu. Aucun chiffre.
   - *À l'écran* : les détails poussent en petite animation au moment où la synergie s'établit.
   - *Pourquoi* : la beauté devient un indicateur d'optimisation. Margaux le lit en chiffres, moi en arcades, et nos captures se ressemblent.

---

## 16. La synthèse commune

### Les points de consensus

1. **« Plus de commandes que de quoi les servir »** est le principe juste. Tout le reste ne vaut que s'il est vrai.
2. **Le magasin plafonné avec encombrement** est le bon premier lot. Il faut d'abord **fermer ses fuites** : le camp et la soute comme entrepôts gratuits, et le prix de brade, qui doit rester sous la valeur des intrants.
3. **Les goûts des villes** cassent « la demande suit l'offre ». Ils doivent **bouger un peu** (par chapitre, ou parce que la ville grandit), sinon la carte est résolue en une semaine.
4. **La tournée en frise, avec la soute en grille**, est le plus bel écran du plan, et la meilleure source de guides.
5. **La reconnaissance vert/ambre/rouge** de la Porta, et une table des contres fixe et simple : oui.
6. **Les outils et la forge, tels qu'écrits, sont à refaire** : ils réintroduisent le « +x % » et la maintenance. Soit des outils à effet de bord, soit on les coupe.
7. **L'absence ne doit punir que par l'occasion manquée** : la table ne se consomme que pendant la production ; une commande partie ne coûte rien de plus ; l'équipe d'extraction s'arrête sans rien perdre.
8. **Il manque des enregistrements** : tenues de combattants, tournées régulières (lignes, capitaine). Sans eux, le joueur mobile ne change jamais de build, et la profondeur reste théorique.

### Les désaccords

| Sujet | Margaux | Tom | Inès |
| --- | --- | --- | --- |
| La table des ouvriers | Le cœur du jeu | Une jauge suffit | D'accord si elle ne mange que pendant la production |
| Les périssables | Neutre | Le seul timer naturel, à garder | Seulement en soute, jamais pendant la nuit |
| L'automatisation des tournées | Contre, sauf avec un coût | Le capitaine à 85 % | Les lignes à la Mini Metro |
| Le plan du domaine | Coup de cœur, avec un terroir par joueur | Tiède : c'est de l'urbanisme | Oui, pour le visuel |
| La Porta en direct de 10 min | Bien | Bien | Trop longue pour le métro : un palier court, un retour seul à la déconnexion |
| Les chiffres | Une « vue ingénieur » à la demande | Les temps de trajet côte à côte | Aucun par défaut, un toucher pour les voir |
| Le cours partagé du Rialto | Contraire à la règle d'or 2 ? | Le sel du commerce | Indifférente |
| Le déplacement d'un atelier | Payant, sinon pas d'engagement | — | Gratuit au début (compromis : la première heure) |

### Ce qui rendrait le jeu « discutable » en communauté

Un jeu se discute quand **plusieurs réponses sont défendables**, que **la réponse dépend de la situation du joueur**, et que **les solutions se montrent**. Ce que le panel recommande, du plus fort au plus faible :

1. **Des tier lists qui bougent.** Les combattants et les équipements de la Porta, les marchandises par ducats par place, les faveurs du chapitre. Une table fixe (les contres) donne une base stable ; ce qui varie (la carte de bataille, la semaine, le chapitre) fait bouger le haut de la liste.
2. **Des guides de ratios en entiers.** Des recettes aux ratios simples (1 → 2, 2 + 1 → 1), le genou des carrières, le rapport maisons/ateliers. C'est le fonds des guides de Margaux.
3. **Des débats de builds.** « Pain seul ou table variée », « soude ou salicorne », « entrepôt ou atelier sur la case 3 », « exquis pour Venise ou blocs pour Padoue ». Chaque question du plan (« La question du joueur ») est un fil de forum en puissance, **si** aucune réponse ne domine toujours.
4. **Des choses à montrer.** Un domaine tiré par joueur, donc unique ; des plans fantômes partagés en code court ; des frises de tournée à 0 place vide ; le relevé de fin de bataille. Une capture qu'on poste, c'est une conversation.
5. **Des énigmes qui ne se résolvent pas une fois pour toutes.** Le terroir par joueur, les goûts qui glissent, la carte de bataille tirée de la graine. Sans cela, la communauté publie **la** solution en 48 heures, puis se tait.

**Le risque que les trois voient** : sept mécaniques de production et dix lots. Si chacune n'apporte pas **un** vrai choix, visible en une image et sans réponse dominante, le jeu devient le tableur que le plan craint lui-même au § 2.8, et Inès le quitte entre deux stations.
