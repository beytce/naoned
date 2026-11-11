# Audit : un jeu qui dure, des joueurs qui reviennent, une communauté (11 novembre 2026)

*Demande du porteur : « Il faut que les joueurs créent un compte et gardent leur progression tout le temps […]. Refais un audit complet afin d'avoir un jeu de stratégie-gestion qui dure dans le temps, où les joueurs reviennent régulièrement et ont une vraie progression, tout en gardant le système actuel. J'ai l'ambition de créer une vraie communauté autour du jeu ; un chat devra s'ajouter. Je veux un système de bataille : le Hex est super pour garder des bouches et des détroits, mais pas assez exploité sur la carte […] ; il faudrait un autre système où les joueurs s'affrontent avec le développement qu'ils ont eu dans le jeu. Une partie du jeu se joue par période, une autre plus long terme où le joueur se développe grâce aux succès et victoires de la semaine. On peut accueillir des milliers de joueurs. Le concept des fils est génial, il ne faut pas y toucher. »*

**Décisions du porteur, le 11 novembre 2026** (§ 10) : D1 oui (Prestige plafonné), D2 l'assaut sur le port de l'autre, D3 des planches de 48 Maisons, D5 **un compte dès l'arrivée** (et non « jouer d'abord »). D4 et D6 restent à trancher. Plan de l'étape 1 : `docs/plan-compte.md`.

---

## 0. Ce qui ne bouge pas

Le porteur aime le concept actuel ; il reste le cœur du jeu, tel quel :

- **les fils** : tirer, tenir, reprendre, la patine, les bobines qui reviennent ;
- **les villes à demande commune**, avec leurs parts et le prix qui baisse pour tous ;
- **l'île** : cases, terrains, ateliers, voisinages, production jusqu'au plafond ;
- **la Passe** (le fil contre la chaîne, sur le Hex) pour forcer et tenir les bouches et les détroits ;
- **le rang, les trois lauriers, le Doge et le rival de la semaine** ;
- **l'aspect** : Porcellana, la toile de l'audit visuel, le logo.

Tout ce qui suit s'ajoute autour, sans changer ces règles.

---

## 1. Le diagnostic

### 1.1 Ce qui manque pour durer

| # | Gravité | Constat | Conséquence |
| --- | --- | --- | --- |
| 1 | bloquant | **Pas de compte sur la planche** : on joue en invité, avec un cookie. Un autre appareil donne une autre Maison. | Rien ne s'attache au joueur, il n'a rien à perdre en partant. |
| 2 | bloquant | **Tout vit dans la mémoire du serveur.** Chaque déploiement remet à zéro îles, caisses, fils et marée. Et ce n'est pas passé par le grand livre (`ledger_entries`), contre une règle non négociable du projet. | Aucune progression ne survit à une mise à jour. |
| 3 | bloquant | **Huit Maisons par serveur.** Au neuvième, on ne fait que regarder. | L'ambition de milliers de joueurs est impossible en l'état. |
| 4 | grave | **La progression s'épuise vite.** Une marée remplit un tiers de l'île (banc du 11 novembre) ; après l'île pleine, rien ne grandit. Les bobines (3 → 12), les pièces et le renom du cadrage (§ 13.1) ne sont pas faits. | Au bout de deux mois, plus rien à viser. |
| 5 | grave | **La Passe est sous-exploitée.** Trois passages pour toute la carte ; une fois forcé, on passe un jour sans y repenser. Le Hex sert une fois par semaine, pas tous les jours. | Le plus original du jeu se voit à peine. |
| 6 | grave | **Aucune bataille où compte ce qu'on a bâti.** La Passe est à armes égales (c'est voulu). Rien ne fait se mesurer deux développements. | Le joueur qui bâtit n'a nulle part où montrer ce qu'il a bâti. |
| 7 | grave | **Aucune vie commune** : pas de compagnie sur la planche, pas de discussion, pas de signes. Les fils de discussion modérés de l'ancien jeu ne sont pas branchés. | Pas de communauté possible. |
| 8 | à corriger | **Les semaines ne racontent rien.** Le rival et les lauriers sont là, mais aucun rendez-vous de la semaine n'engage tout le monde ensemble. | Pas de « dimanche soir » qu'on attend. |
| 9 | à corriger | **Deux jeux cohabitent** : la planche à la racine, l'ancien empire à `/ancien`, avec ses comptes, sa Terraferme, sa Porta, sa Bataille. | Dette à résorber : ce qui marche dans l'ancien doit être repris, le reste retiré. |

### 1.2 Ce qui est déjà là et se réutilise

| Pièce | Où | Ce qu'elle apporte |
| --- | --- | --- |
| Comptes, sessions, connexion par lien envoyé par mail | `apps/server/src/auth/`, tables `accounts`, `sessions`, `login_tokens` | Le compte, sans mot de passe |
| Grand livre et mouvements de stock | `ledger_entries`, `stock_movements` | La persistance de la caisse et des entrepôts, selon les règles du projet |
| Compagnies et leurs fils de discussion modérés | `companies`, `company_members`, `company_messages`, `chatRules.ts` (280 caractères, rythme, filtre, masqué après 3 signalements) | Le chat de compagnie, presque tel quel |
| Cote par bandes et appariement | `battleRatings`, `battleBand`, `battle_ratings` | L'appariement des batailles par niveau |
| Notifications, abonnements push | `notifications`, `push_subscriptions` | « Ton rival vient de te passer devant », « l'assaut commence » |
| Moteur de la Passe, solveur, vingt problèmes | `packages/engine/src/passe/` | Les duels, le Problème du jour, les détroits noirs |
| Monde persistant, invariants, administration | `world_states`, `world_commands`, `admin.ts` | Le socle des mondes persistants |

---

## 2. Ce que font les jeux qui durent

| Jeu | Ce qu'il fait bien | Ce qu'on prend | Ce qu'on refuse |
| --- | --- | --- | --- |
| **Clash of Clans** (guerres de clans) | La guerre de deux jours : chaque membre a deux attaques ; on attaque la base **telle que l'autre l'a bâtie**, défendue par l'ordinateur ; l'appariement se fait au « poids de guerre », calculé sur ce qui est bâti. | La bataille asynchrone contre ce que l'autre a bâti ; l'appariement par le développement ; trois étoiles par assaut. | Le pillage des ressources (règle 1). |
| **Hades' Star** | Les étoiles blanches : une semaine, deux corporations, l'ordinateur joue l'absent ; rien de perdu au-delà du vaisseau. | La semaine de corporation ; la perte jamais définitive. | Les journées de présence obligée. |
| **Rise of Kingdoms** (KvK) | Des saisons entre royaumes ; les serveurs se rencontrent. | Les mondes qui se rencontrent à la semaine. | La boule de neige des gros comptes. |
| **Chess.com** | Problème du jour, cote, ligues, « match nul proposé », clubs. | Le rendez-vous quotidien d'une minute ; la cote lisible. | — |
| **Travian, Grepolis** | Serveurs à milliers, alliances, diplomatie. | Les alliances qui ont un but commun. | Le pillage, la présence de jour comme de nuit. |
| **Anno, Factorio** | La chaîne de production qu'on optimise. | Déjà dans l'île ; on la prolonge vers l'Arsenal. | — |
| **Marvel Snap, Hearthstone** | Saisons courtes, collection qui ne se perd jamais. | La collection (pavillons, pierres, pièces) qui reste. | La vente de puissance. |

La leçon commune : **trois horloges** (le jour, la semaine, la vie du compte), **un rendez-vous par semaine qui engage les groupes**, **une collection qui ne se perd jamais**, et **un appariement qui met chacun face à des égaux**.

---

## 3. La proposition : trois horloges

| Horloge | Durée | Ce qu'on y fait | Ce qu'on y gagne |
| --- | --- | --- | --- |
| **Le jour** | Quelques minutes, deux à quatre fois par jour | Tirer et reprendre ses fils, bâtir l'île, le Problème du jour, une commande scellée, une sortie au Large | Ducats, marchandises, des sceaux brisés |
| **La semaine** | Du lundi au dimanche | **La Guerre de la semaine** (§ 6), le rival, la Muda (§ 7.2), le défi par le fil | **Du Prestige** et des pièces de collection |
| **La vie de la Maison** | Des mois, sans fin | Monter la Maison de niveau, étendre l'île, ouvrir l'Arsenal, armer la flotte, compléter la collection | Ce qui ne se perd jamais |

**La marée** (six semaines) reste la saison du rang : lauriers, Doge, ligues. Elle remet à zéro le rang, jamais la Maison.

**Le Prestige** est le pont entre la semaine et le long terme. On le gagne en jouant la semaine, il fait monter la Maison de niveau, et chaque niveau ouvre quelque chose.

---

## 4. Le compte et la Maison qui reste

### 4.1 Le compte

- **Un compte dès l'arrivée** (décision du porteur, D5) : l'adresse mail est demandée avant de jouer ; on reprend la connexion par lien de l'ancien jeu. La planche voilée reste visible derrière la fiche d'entrée.
- Plus tard : se connecter avec Google ou Apple, et plusieurs appareils.

### 4.2 La Maison, persistante

- **Tout en base** : la caisse au grand livre, les entrepôts en mouvements de stock, l'île, les fils, la flotte, la collection. Rien en mémoire seule.
- **Le profil** : le nom de la Maison, son pavillon (couleur et meuble, choisis), sa devise ; la **façade** montre ses pavillons pris, ses lauriers, ses pierres gravées.
- **Le Livre de la Maison** : son histoire, écrite par le jeu (« Marée 3 : Doge de la Lagune de Murano. Semaine 12 : trois sceaux à l'assaut de Ca' Dandolo »). C'est ce qu'on a peur de perdre, et ce qu'on montre.

---

## 5. L'échelle : des milliers de joueurs

La demande commune des villes ne tient que si une ville est servie par quelques dizaines de Maisons. On ne met donc pas mille joueurs sur une planche : **on multiplie les planches**, et on les fait se rencontrer.

| Niveau | Taille | Ce qui s'y passe |
| --- | --- | --- |
| **Le sestiere** | 12 Maisons voisines | Le rival, la discussion de voisinage, les villes proches |
| **La lagune** (une planche) | 4 sestieri, **48 Maisons**, une vingtaine de villes, une douzaine de passages | Les fils, les villes, les tours, les lauriers, le Doge |
| **Le monde** | Toutes les lagunes d'une même ligue | La Guerre de la semaine (appariement entre lagunes), les ligues |
| **La Sérénissime** | Une lagune sommet, que tous peuvent regarder | Les meilleures Maisons, chaque marée |

- **Une nouvelle lagune s'ouvre** quand les autres sont pleines ; les places vides sont tenues par l'ordinateur, qui les rend à un joueur qui arrive.
- **Une compagnie** est placée dans la même lagune.
- **La technique** : chaque lagune a son état en base, calculé paresseusement à la lecture, avec un verrou transactionnel par (monde, ville) pour la demande commune (règle du projet). Les joueurs reçoivent les changements par WebSocket, à la place de l'interrogation toutes les deux secondes. Un serveur tient des centaines de lagunes.

---

## 6. La nouvelle bataille : la Guerre de la semaine

*Le porteur : « un autre système où les joueurs s'affrontent en utilisant le développement qu'ils ont eu dans le jeu ».*

### 6.1 L'idée

**Chaque semaine, ta compagnie affronte une autre compagnie de même puissance. Vos îles sont le champ de bataille : on assaille le port de l'autre tel qu'il l'a bâti, avec la flotte qu'on a armée chez soi.**

- **Ce qu'on a bâti compte** : ta flotte sort de ton Arsenal, et ton port se défend avec les tours et les chaînes que tu y as posées.
- **Ce qui reste juste** : l'appariement se fait sur la Puissance (ce qui est bâti, jamais la caisse ; règle 6), et chaque joueur a le même nombre d'assauts.
- **Rien n'est pris** (règle 1) : un assaut brise des **sceaux**, il ne pille rien. Un navire coulé rentre abîmé et se répare (règle 2).

### 6.2 La flotte et l'Arsenal : le développement devient une force

- **L'Arsenal** est un nouvel atelier de l'île (troisième étage). Il transforme ce que tes autres ateliers produisent en navires. **Ta chaîne de production donne son caractère à ta flotte** :

| Navire | Fait de | Son rôle |
| --- | --- | --- |
| **Galère** | planches et cordages | Ligne de bataille, solide |
| **Brigantin** | planches et chanvre | Rapide, va chercher les tours de loin |
| **Brûlot** | bois et sel | Se sacrifie, brûle une chaîne ou une tour |
| **Galéasse** | planches, briques et cordages | Lourde, porte une bombarde, lente |
| **Nef d'escorte** | planches, pain et verre | Ravitaille, éclaire, répare au combat |

- Deux îles de même Puissance n'ont donc pas la même flotte : la Maison du verre et du bois n'arme pas comme celle de la brique.
- **Le port** se défend avec ce que tu as bâti sur ton quai : tours (briques), chaînes (cordages), batteries (verre et bronze), et les navires restés à l'ancre.
- **Un puits pour l'économie** : armer et réparer consomment des marchandises. Le cadrage l'attendait (§ 13.3 : au sommet, il faut absorber).
- **Les plafonds** (règle 3) : un Arsenal a un nombre de cales ; une flotte a un nombre de places, qui monte avec le niveau de la Maison.

### 6.3 Le déroulé de la semaine

| Jour | Ce qui se passe | Combien de temps |
| --- | --- | --- |
| **Lundi** | La compagnie s'inscrit (ou le joueur seul, dans une **flottille** de six formée par le jeu). Chacun **prépare son port** : où poser tours, chaînes et navires à l'ancre. | 5 minutes |
| **Mardi à samedi** | **Un assaut par jour et par joueur** (cinq dans la semaine). Un assaut dure **deux à trois minutes** : on choisit sa cible dans la carte de la guerre, on déploie sa flotte, on donne ses ordres ; le port adverse se défend seul, comme son maître l'a préparé. Jusqu'à **trois sceaux** par port. | 3 minutes par jour |
| **Dimanche** | La compagnie qui a brisé le plus de sceaux gagne. Le replay des plus beaux assauts est montré à tous, et la Gazette le raconte. | — |

- **L'assaut** se joue sur l'eau du port, en cases carrées de Porcellana, avec les vraies tuiles et les vrais bâtiments de l'île attaquée. On voit la galère entrer dans la bouche, le brûlot embraser la chaîne, la tour tomber en morceaux de porcelaine (règle 8).
- **Les bouches et les détroits gardent le Hex** : pour atteindre un port, la flotte passe parfois un détroit ; on le force par une Passe courte, comme aujourd'hui. C'est la jonction des deux systèmes.
- **Personne n'est obligé** : un joueur qui ne fait aucun assaut n'enlève rien à sa compagnie ; son port se défend seul (règle 7).

### 6.4 Pourquoi pas la Terraferme ou la Bataille de l'ancien jeu

- **La Terraferme** se joue en territoires, à trésor égal, et sur une carte à part : elle ne met pas en jeu l'île, et l'audit du 8 novembre a montré que l'argent y décidait trop.
- **La Bataille en direct** (15 minutes) est à armes strictement égales ; elle répond à un autre besoin.
- **La Guerre de la semaine** les absorbe : la carte de la guerre reprend les territoires et les fronts de la Terraferme, et l'appariement par bandes reprend celui de la Bataille. La Bataille en direct pourra revenir plus tard comme mode à part, si les joueurs la demandent.

---

## 7. Le Hex plus présent dans le commerce, sans être obligatoire

*Le porteur : « le joueur doit devoir plus l'utiliser pour développer son commerce, sans que ce soit pour autant essentiel ».*

### 7.1 Plus de passages, partout où passe une route

- **Une douzaine de tours par lagune**, au lieu de trois : chaque sestiere a sa bouche, la lagune ses ponts et ses canaux, le Large ses détroits. Les routes riches en traversent un ou deux.
- **Trois tailles de duel** : le petit pont (5 × 5, une minute), la bouche (7 × 7, comme aujourd'hui), le détroit noir (9 × 9, le plus dur).
- **Toujours un chemin sans duel** : chaque ville se rejoint aussi par un détour, plus long, où le fil rapporte moins (la patine monte moins vite, la bobine revient plus tard). Forcer est un **raccourci**, jamais une condition.

### 7.2 Quatre usages de plus pour la Passe

| Usage | Ce qui se passe | Ce qu'on y gagne |
| --- | --- | --- |
| **La commande scellée** | Une ville demande un lot au double du prix, mais il faut le faire passer par un détroit : on joue une position courte (« passe en trois coups »). Deux par jour. | Des ducats ; le Hex devient un geste quotidien de commerce. |
| **La Muda** (le convoi d'État de la semaine) | Le samedi, la Sérénissime affrète un convoi vers Alexandrie. Toute la lagune y verse des marchandises par ses fils, puis le convoi force trois détroits, joués par les volontaires. | Une part du retour à chaque contributeur, et un pavillon de la Muda : le grand rendez-vous commun. |
| **Les détroits noirs** | Au Large, des capitaines de plus en plus forts, chacun avec son style (le mur, les rives, la meute). | Des **reliques**, qui donnent des **plans** (règle 5 : les hauts niveaux se gagnent en jouant). |
| **La garde préparée** | Celui qui tient une tour place, à l'avance, les maillons de départ que son lieutenant jouera. | Ses heures de Garde ; une tour mieux tenue. |

---

## 8. La progression du joueur

### 8.1 Le niveau de la Maison et le Prestige

- **Le Prestige** se gagne à la semaine : sceaux brisés à la Guerre, victoire de la compagnie, rival battu, lauriers, Problème du jour réussi, Muda, détroits noirs.
- Il est **plafonné par semaine**. Jouer un peu chaque jour rapporte autant qu'y passer ses nuits (règle 7), et celui qui a manqué une semaine en rattrape une partie la suivante.
- Il fait monter la **Maison de niveau**, de 1 à 30, en cinq titres : *Bottega, Casa, Ca', Palazzo, Procuratie*. Le titre se voit sur la planche.

| Niveaux | Ce qui s'ouvre |
| --- | --- |
| 1 à 5 | L'île jusqu'à 16 cases, la quatrième bobine, la première tour, la compagnie |
| 6 à 10 | L'Arsenal, la galère et le brigantin, la cinquième bobine, les commandes scellées |
| 11 à 15 | Le troisième étage d'ateliers (bel ouvrage), la galéasse, les détroits noirs |
| 16 à 20 | Les plans (reliques des détroits noirs), la nef d'escorte, jusqu'à 9 bobines |
| 21 à 30 | Bâtiments de prestige, 12 bobines, les pièces rares de la Passe, la Sérénissime |

- **Ce que le niveau donne** : de la **capacité** et du **choix** (plus de cases, de bobines, de types de navires), jamais un multiplicateur de rendement. Les batailles restent justes grâce à l'appariement par bandes.

### 8.2 La collection, qui ne se perd jamais

- Pavillons pris (aux rivaux, aux capitaines), pierres gravées en fin de marée, coiffes de Doge, trophées de la Muda, navires nommés.
- Elle s'expose sur la façade et dans le Livre de la Maison. Elle ne donne aucun pouvoir.

### 8.3 Les buts à chaque horizon

| Horizon | Exemple de but que le jeu montre |
| --- | --- |
| Aujourd'hui | « Ta verrerie sera pleine dans 2 h : tire un fil vers Padoue. » |
| Cette semaine | « Encore un sceau pour la victoire de ta compagnie. Ton rival a 3 000 ducats d'avance à Trévise. » |
| Cette marée | « 4ᵉ au Négoce : le podium est à 12 %. » |
| Ce mois | « Niveau 10 dans 2 semaines : l'Arsenal s'ouvre. » |

---

## 9. La communauté

| Quoi | Comment | Quand |
| --- | --- | --- |
| **La compagnie sur la planche** | De 4 à 20 Maisons, une île commune et son phare (CADRAGE-v4 § 12). Rôles : doge de compagnie, capitaines, membres. Elle s'inscrit à la Guerre de la semaine. | Avec la Guerre |
| **La discussion de compagnie** | Les fils de discussion modérés de l'ancien jeu, repris tels quels (280 caractères, rythme, filtre, masqué après 3 signalements), avec des **signes sur la carte** (« j'attaque ce port », « tiens cette tour »). | Avec la compagnie |
| **La discussion du sestiere** | Les 12 voisins, même modération. Le lieu où on se connaît, se jalouse, se recrute. | Ensuite |
| **Les signes** | Saluer, défier, féliciter, d'un toucher sur une Maison. Aucun texte libre entre inconnus. | Tout de suite |
| **La Gazette du dimanche** | Un journal de la lagune écrit par le jeu : le Doge, les guerres, les rivaux, la plus belle Passe de la semaine. Une image à partager hors du jeu. | Avec la persistance |
| **Le Conseil de la marée** | Le Doge de la lagune choisit, parmi trois **décrets** proposés par le jeu, celui de la marée suivante (« le sel paie 10 % de plus à Raguse », « les ponts ferment la nuit »). Les membres du Conseil (les lauriers) votent. Une politique sans pillage. | Avec les ligues |
| **Le parrainage** | Une Maison de niveau 10 et plus parraine un nouveau ; l'un et l'autre gagnent un pavillon quand le filleul atteint le niveau 5. | Plus tard |
| **La loge** | Regarder en direct une Passe entre deux joueurs connus, la finale de la Guerre, la Muda. | Plus tard |
| **Hors du jeu** | Un serveur Discord officiel, la Gazette partagée, le replay des assauts. | Dès la bêta |

**La modération** : les outils de l'ancien jeu (filtre, signalements, administration) s'étendent au sestiere ; un âge minimum et des règles de conduite affichés avant le premier message.

---

## 10. Les décisions à prendre

| # | Question | Ma recommandation |
| --- | --- | --- |
| **D1** | Les victoires de la semaine font-elles grandir la Maison ? Le cadrage v4 (§ 10.6) disait « le rang ne donne jamais une bobine ». | **Oui, par le Prestige plafonné par semaine**, qui ouvre de la capacité et du choix, jamais un multiplicateur. Le rang lui-même ne donne toujours que des marques. Il faut amender le § 10.6 et la phrase de la règle 4 sur « la Contesa à armes égales » : l'égalité vient désormais de l'appariement par bandes (règle 6). |
| **D2** | Quelle forme pour la nouvelle bataille ? | **L'assaut asynchrone sur le port bâti par l'autre**, en guerre de compagnie d'une semaine (§ 6). Les autres formes possibles : une carte d'ordres quotidiens (plus lente à lire), ou un combat en direct de 15 minutes (exige d'être là). |
| **D3** | La taille d'une planche ? | **48 Maisons** (4 sestieri de 12) : assez pour que les villes soient disputées, assez peu pour qu'on se connaisse. |
| **D4** | L'ancien jeu ? | **Le garder à `/ancien` jusqu'à la bêta**, en reprendre les comptes, les compagnies et la discussion, puis le retirer. Ses joueurs gardent leur compte. |
| **D5** | Le compte : tout de suite, ou après dix minutes ? | Je recommandais « jouer d'abord » ; **le porteur a choisi le compte dès l'arrivée**. |
| **D6** | La discussion : jusqu'où ? | **Compagnie d'abord, sestiere ensuite** ; pas de discussion de monde entier avant d'avoir une modération éprouvée. |

---

## 11. Le plan des prochaines semaines

Chaque étape a son plan validé, ses tests d'abord, son passage au simulateur ; un commit par fonctionnalité ; fusion sur la branche principale à la fin de chaque étape, pour tester sur le site.

| Étape | Durée estimée | Ce qu'elle livre | Réussie quand |
| --- | --- | --- | --- |
| **1. Le compte et la Maison qui reste** | 4 à 6 jours | Connexion sur la planche (lien envoyé par mail, repris de l'ancien jeu) ; jouer en invité puis sauver ; la planche en base (grand livre, mouvements de stock, verrou par ville) ; un déploiement ne perd plus rien ; WebSocket à la place de l'interrogation | On redéploie, chacun retrouve sa Maison, ses fils et sa caisse au denier près |
| **2. Les lagunes de 48** | 4 à 5 jours | Une planche de 48 Maisons et ~20 villes (thème de Venise agrandi) ; ouverture automatique de nouvelles lagunes ; robots qui cèdent leur place ; le sestiere | Banc à 48 Maisons : aucune stratégie unique ne domine ; un serveur tient 100 lagunes au test de charge |
| **3. La progression de la Maison** | 4 à 5 jours | Le Prestige plafonné, les niveaux 1 à 30 et leurs titres, les bobines qui montent, le profil, la façade, le Livre de la Maison | Au simulateur, un joueur régulier atteint le niveau 10 en 4 à 6 semaines ; un joueur à 8 visites par jour ne va pas deux fois plus vite |
| **4. Le Hex dans le commerce** | 5 à 7 jours | Douze tours par lagune, les détours sans duel, les trois tailles de duel, les commandes scellées, le Problème du jour (R5), le défi par le fil (R6), la garde préparée | Un joueur moyen joue au moins une Passe par jour sans y être obligé ; le détour reste rentable |
| **5. L'Arsenal et la flotte** | 5 à 7 jours | L'atelier Arsenal, cinq navires, le port et ses défenses, la réparation ; la Puissance calculée sur ce qui est bâti | Deux îles de même Puissance ont des flottes différentes ; l'Arsenal absorbe la part visée des ducats au sommet |
| **6. La Guerre de la semaine** | 10 à 14 jours | Le moteur de l'assaut (pur, testé), l'IA de défense, la carte de la guerre, l'appariement par bandes entre lagunes, la flottille pour les joueurs seuls, l'écran d'assaut en Porcellana, le replay | Au banc, aucune composition de flotte ne gagne toujours ; un assaut tient en 3 minutes sur téléphone |
| **7. La compagnie et la discussion** | 5 à 7 jours | La compagnie sur la planche, son île et son phare, sa discussion (reprise de l'ancien jeu), les signes sur la carte ; puis la discussion du sestiere | Un membre paisible se sent utile ; aucun message non modéré |
| **8. La Muda, les détroits noirs, la Gazette** | 5 à 7 jours | Le convoi du samedi, les capitaines du Large et leurs reliques, les plans, la Gazette du dimanche | Une semaine complète jouée en test, avec un rendez-vous chaque jour |
| **9. La marée complète et les ligues** | 5 à 7 jours | La marée d'encre, la fin de marée, les pierres gravées, les ligues entre lagunes, le Conseil et ses décrets, la Sérénissime | Une marée entière jouée en test |
| **10. Les tutoriels et la bêta fermée** | 5 à 7 jours | Les tutoriels guidés de chaque lieu, le retrait de l'ancien jeu, une bêta avec de vrais joueurs | Moyenne d'au moins 7,5 sur 10 auprès des testeurs ; plus de 40 % reviennent la deuxième semaine |

**Au total : de 9 à 12 semaines** jusqu'à la bêta fermée. L'étape 1 est la seule qui ne peut pas attendre : sans elle, rien de ce qui suit ne se garde.

---

## 12. Ce qui n'est pas dans ce plan

Les modes de l'ancien jeu (Terraferme, Porta, ateliers de l'intérieur, Bataille en direct), sauf ce que la Guerre de la semaine en reprend ; la boutique (la bêta est sans perle, D3 du plan de publication) ; la discussion de monde entier ; l'application dans les magasins d'applications (la PWA suffit jusqu'à la bêta).
