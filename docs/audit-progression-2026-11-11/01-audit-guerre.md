# Audit de la Guerre de la semaine et de l'assaut (11 novembre 2026)

*Demande du porteur : « Fais un audit de ta proposition de système de guerre et d'assaut afin de t'assurer qu'il est amusant et donnera envie aux joueurs d'y participer. Il faut qu'il soit facilement compréhensible tout en gardant l'aspect tactique et stratégique. »*

Objet : le § 6 de `00-audit.md` et les écrans 3a à 3c de la maquette. **À valider.**

---

## 1. Ce qui tient

| Point | Pourquoi c'est bon |
| --- | --- |
| **On attaque ce que l'autre a bâti** | Le seul mode où le développement se mesure. C'est la promesse que le porteur demande, et la raison de bâtir. |
| **Asynchrone, un assaut par jour** | Tenable par des milliers de joueurs, compatible avec la règle 7 (quelques minutes, sans présence obligée). |
| **En compagnie, une semaine** | Un rendez-vous qui engage le groupe : la discussion a de quoi parler. |
| **Rien n'est pillé** | Règles 1 et 2 : on peut perdre une guerre sans rien perdre de sa Maison. |
| **L'appariement par bande** | Règle 6 : le gros compte ne gagne pas d'office. |

## 2. Ce qui ne marche pas encore

| # | Gravité | Constat | Effet sur le joueur |
| --- | --- | --- | --- |
| 1 | bloquant | **L'assaut n'a pas de règle.** « Déployer sa flotte, donner ses ordres » en 3 minutes sur l'eau du port, c'est un jeu de stratégie en temps réel sur un écran de téléphone : poser au doigt, viser une tour, rappeler un navire. | Le joueur ne comprend pas ce qu'il fait, s'agace du doigt trop gros, et perd sans savoir pourquoi. Ni tactique ni lisible. |
| 2 | bloquant | **Le défenseur ne joue pas.** Il prépare son port le lundi, puis attend. | La moitié de la guerre est passive : rien ne le fait revenir. |
| 3 | grave | **Les sceaux s'additionnent sur un port** (la maquette montre « 1 sceau sur 3 brisé »). Tout le monde frappera le port le plus faible jusqu'à ce qu'il tombe. | Aucune stratégie de groupe : on s'acharne, puis plus rien à prendre. |
| 4 | grave | **Deux mini-jeux à la suite** : forcer le détroit par la Passe, puis l'assaut. | Trop long, trop d'étapes : on renonce avant d'attaquer. |
| 5 | grave | **Rien ne s'apprend d'un assaut à l'autre.** L'issue dépend de la composition contre la défense : une fois la meilleure flotte trouvée, tout le monde la copie. | La « méta » s'installe en deux semaines : plus de surprise. |
| 6 | à corriger | **Cinq navires, quatre défenses, aucune règle dite** : le joueur ne sait pas ce que fait un brûlot avant de l'avoir perdu. | Courbe d'apprentissage sans échelons. |
| 7 | à corriger | **Aucun entraînement.** La première vraie bataille est la première fois. | Peur de mal faire devant sa compagnie. |
| 8 | à corriger | **Un assaut raté ne rapporte rien.** | Le joueur moyen se décourage. |
| 9 | à corriger | **Les compagnies de tailles différentes** (4 contre 20) ne sont pas réglées. | Guerres perdues d'avance. |

**Verdict : l'idée est bonne, l'assaut est à refaire.** Il faut un assaut qui se joue au doigt sans adresse, en quelques décisions nettes, et où l'on voit ce que l'adversaire va faire.

---

## 3. Quatre formes d'assaut comparées

| Forme | Compréhension | Tactique | Téléphone | Temps | Verdict |
| --- | --- | --- | --- | --- | --- |
| **Temps réel** (la proposition actuelle) | faible | moyenne, surtout d'adresse | mauvais | 3 min | refusé |
| **Bataille automatique** (on choisit sa flotte et on regarde) | excellente | faible : tout se décide avant | bon | 1 min | refusé : passif |
| **Tactique au tour par tour complète** (cases, déplacements, tirs) | moyenne | forte | moyen | 10 à 15 min | refusé : trop long pour tous les jours |
| **Trois passes, trois manches** (ci-dessous) | excellente | forte : placer, tenir le compte, deviner | bon : trois colonnes, un doigt | 2 à 3 min | **retenu** |

Références : les trois lieux de *Marvel Snap* et les trois couloirs de *Clash Royale* (lisibles d'un coup d'œil), les intentions annoncées d'*Into the Breach* (on voit ce que l'ennemi va faire, et toute la tactique est d'y répondre), les étoiles et le meilleur assaut de *Clash of Clans* (la stratégie de groupe).

---

## 4. La proposition révisée : l'assaut en trois passes

### 4.1 La règle en une phrase

> **Un port a trois passes. Tu as trois manches pour y lancer tes navires. Chaque tour qui tombe brise un sceau.**

Les trois passes sont les trois abords réels de l'île attaquée (la bouche, le canal du nord, le canal du sud), dessinés en Porcellana avec ses vrais bâtiments.

### 4.2 Une manche

1. **Le port annonce** : au-dessus de chaque passe, une icône dit ce que la défense fera cette manche (« la tour tire sur le premier navire », « la chaîne se lève », « la batterie frappe toute la passe »). Comme Rome qui annonce ses coups à la Porta.
2. **Tu poses** : tu fais glisser tes navires sur les passes. Chaque navire a deux chiffres, **force** et **coque**, et un seul mot-clé.
3. **La manche se joue** : dix secondes d'animation, passe après passe. Les dégâts s'affichent sur les tours, les navires touchés rentrent abîmés.

Trois manches, donc trois décisions de placement : **2 à 3 minutes**.

### 4.3 Les pièces, une règle chacune

| Navire | Force · coque | Son mot-clé |
| --- | --- | --- |
| **Galère** | 2 · 4 | *Solide* : la tour la vise en premier |
| **Brigantin** | 2 · 2 | *Rapide* : peut changer de passe entre deux manches |
| **Brûlot** | 0 · 1 | *Brûle* : détruit la chaîne ou un navire de sa passe, puis disparaît |
| **Galéasse** | 4 · 3 | *Bombarde* : double contre une tour, mais seulement à la 2ᵉ manche et après |
| **Nef d'escorte** | 0 · 3 | *Répare* : rend 1 de coque à chaque navire de sa passe |

| Défense | Son effet |
| --- | --- |
| **Tour** (6 à 10 de coque) | Tire 3 sur le premier navire de la passe. **Tombée, elle brise un sceau.** |
| **Chaîne** | Rien ne passe tant qu'elle tient ; un brûlot la brûle, deux galères la rompent en une manche. |
| **Batterie** | Frappe 1 sur chaque navire de la passe : contre les nuées de brigantins. |
| **Navires à l'ancre** | Comme les tiens, du côté du port. |

Le développement compte : ta flotte vient de ton Arsenal, ses navires montent de niveau (force et coque plus fortes). Le port de l'autre vient de ses briques, de ses cordages, de son verre.

### 4.4 La ruse du défenseur : ce qui garde le jeu vivant

- Le défenseur ne pose pas que des défenses visibles. Pour chaque passe, il choisit en secret **une ruse** parmi trois : *la chaîne qui se lève à la 2ᵉ manche*, *le brûlot caché* (brûle le premier navire), *les renforts* (deux navires à l'ancre arrivent à la 3ᵉ manche).
- Elle se révèle au moment où elle joue. **Celui qui a déjà assailli ce port la connaît** : son replay la montre à toute sa compagnie.
- **Le défenseur revient chaque jour** : il voit les replays des assauts subis (« Ca' Bembo a brûlé ta chaîne à la 1ʳᵉ manche ») et peut **déplacer ses défenses et changer ses ruses une fois par jour**. Une défense qui tient rapporte du Prestige (laurier de la Garde).

C'est ce qui empêche la méta de se figer : la même flotte ne bat pas deux fois la même ruse, et le défenseur s'adapte.

### 4.5 La stratégie de la semaine : le meilleur assaut compte

- **Sur chaque port, seul le meilleur assaut compte** (0 à 3 sceaux). Le total de la compagnie est la somme des meilleurs assauts. On ne gagne rien à frapper dix fois le même port.
- **Qui prend quel port** devient la vraie décision de groupe. La carte de la guerre montre, pour chaque port, ses sceaux déjà pris et qui « le réserve » (un signe : « je prends Dandolo »).
- **Éclairer** : un assaut raté n'est pas perdu. Son replay révèle les ruses du port pour les suivants.
- **Les détroits** : la carte compte deux ou trois détroits, tenus par l'une ou l'autre compagnie. Les forcer par la Passe est **facultatif** : un détroit tenu donne **le vent** aux assauts qui le traversent (tu vois aussi l'intention de la 3ᵉ manche dès la 1ʳᵉ). Le Hex aide, sans être une étape obligée.
- **Tailles égales** : le lundi, chaque compagnie aligne 5, 10, 15 ou 20 Maisons ; l'appariement se fait à taille égale et par bande de Puissance. Les autres membres peuvent soutenir : livrer des cordages, tenir un détroit, éclairer.

### 4.6 Apprendre sans peur, gagner même en perdant

- **Le port d'entraînement** (le Lido des corsaires) : un assaut sans enjeu, à toute heure, avec un tutoriel guidé de trois manches (décision du 8 novembre : chaque nouveau lieu a le sien).
- **Les corsaires** : hors guerre, trois ports corsaires par semaine, de difficulté croissante, pour le joueur seul.
- **Chaque tour entamée rapporte** : le Prestige compte les dégâts, pas seulement les sceaux. Un assaut à zéro sceau donne au moins un tiers de la récompense d'un sceau.
- **Rien de lourd après une défaite** : les navires coulés rentrent abîmés, la réparation coûte peu et prend moins d'une heure.

---

## 5. La grille de vérification

| Critère | Avant | Après | Comment on le vérifie |
| --- | --- | --- | --- |
| Compris en une phrase | non | oui (§ 4.1) | 5 testeurs l'expliquent après le tutoriel, sans aide |
| Une vraie décision à chaque manche | non | oui : placer, répondre à l'intention, garder le brûlot | Au banc, le meilleur placement gagne nettement plus qu'un placement au hasard |
| Pas de flotte unique gagnante | non vérifié | ruses + mots-clés en cycle | Au banc : aucune composition ne gagne plus de 55 % contre l'ensemble des défenses |
| Le défenseur revient | non | replays, ruses quotidiennes, Prestige de la Garde | Part des défenseurs qui changent leur port au moins deux fois par semaine |
| Stratégie de groupe | faible | meilleur assaut, réservations, éclairage, détroits | Dans les tests, les compagnies se répartissent les ports |
| Jouable au téléphone | non | trois colonnes, glisser une carte | Parcours e2e à 390 px, cibles de 44 px au moins |
| Durée | 3 min d'adresse | 2 à 3 min, trois décisions | Chrono au test |
| Envie de revenir | moyenne | replays, Gazette, revanche, Prestige même en perdant | Plus de 60 % des membres jouent au moins 3 assauts sur 5 |
| Équité | bande seule | bande + tailles égales + plafond de Prestige | Au simulateur, l'issue d'une guerre en bande égale est proche de 50 % |

**Cibles d'équilibrage** : environ 30 % des assauts à trois sceaux, une moyenne de 1,6 sceau par assaut, et une guerre qui se joue souvent à quelques sceaux près le samedi soir.

## 6. Ce que ça change au plan

L'étape 6 (« La Guerre de la semaine ») commence par **un moteur d'assaut pur et son banc** (pièces, manches, intentions, ruses), puis le port d'entraînement et son tutoriel, et seulement ensuite la guerre entre compagnies. Durée inchangée (10 à 14 jours), mais la guerre n'ouvre qu'une fois l'assaut validé au banc et par trois testeurs.

## 7. À trancher

1. **L'assaut en trois passes et trois manches** remplace l'assaut en temps réel. D'accord ?
2. **Les ruses du défenseur**, modifiables une fois par jour : d'accord, ou une seule fois le lundi, plus simple ?
3. **Le meilleur assaut compte** (et non l'addition des sceaux) : d'accord ?
