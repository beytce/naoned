# La compagnie et sa discussion : plan (étape 7 de l'audit du 11 novembre 2026)

*Proposé le 12 novembre 2026, à la suite de la Guerre de la semaine (`docs/plan-guerre.md`, fusionné). Audit : `docs/audit-progression-2026-11-11/00-audit.md` § 9 (la communauté) et § 6 (la guerre de compagnie) ; CADRAGE-v4 § 12 (la compagnie, le phare). Maquette : écran 4a (la compagnie, sa discussion et ses signes). **Validé le 12 novembre 2026** avec les quatre recommandations du § 7.*

## 1. Le problème à régler

Sur la planche, on joue seul : la Guerre se fait dans des flottilles formées par le jeu, aucun mot n'est échangé, et le joueur paisible, qui n'assaille pas, n'apporte rien aux autres. L'ancien jeu avait des compagnies et un fil de discussion modéré ; la planche ne les connaît pas.

Après cette étape :

- on fonde une **compagnie** ou on en rejoint une par un lien ; elle se voit sur la planche (son pavillon sur les Maisons de ses membres) ;
- elle a sa **discussion**, modérée comme celle de l'ancien jeu, et des **signes sur la carte** (« j'attaque ce port », « tiens cette tour ») ;
- elle **part en guerre ensemble** : ses membres forment ses flottilles, à la place de celles du jeu ;
- elle a son **phare**, que tous nourrissent de leurs marchandises : le membre paisible arme ceux qui se battent (CADRAGE-v4 § 12).

## 2. Ce que voit le joueur

| Où | Ce qu'il voit | Ce qu'il fait |
| --- | --- | --- |
| **La fiche de sa Maison** | « Fonder une compagnie » ou « Ta compagnie ». | Fonder (un nom, un pavillon), inviter par un lien. |
| **La compagnie** (écran 4a) | Ses membres, leur niveau, leur lagune ; le phare et son niveau ; la discussion ; les signes posés sur la carte. | Écrire, signaler un message, poser un signe. |
| **La planche** | Le pavillon de la compagnie sur les Maisons de ses membres ; les signes de la compagnie sur les tours et les ports. | Toucher une Maison : sa compagnie. |
| **La Guerre** | « Ta compagnie contre la compagnie X » ; les ports réservés par un signe. | Assaillir le port qu'on a réservé. |
| **Le phare** | Le phare de la compagnie qui monte, ce que chacun y a porté aujourd'hui (sans tableau par membre). | Porter des marchandises, plafonné par jour. |

## 3. Les règles

### 3.1 La compagnie

- On en fonde une, ou on la rejoint par un lien d'invitation ; une seule compagnie par compte. Les compagnies de l'ancien jeu sont reprises telles quelles, avec leurs membres et leur discussion (décision D4).
- **Taille** : jusqu'à 12 Maisons (§ 7). **Rôles** : le doge de compagnie (qui la fonde, ou que la compagnie désigne), les capitaines, les membres.
- Un nouveau joueur invité par un lien est assis, s'il y a de la place, dans la lagune de celui qui l'invite.

### 3.2 La discussion et les signes

- Les règles de l'ancien jeu, reprises telles quelles : 280 caractères, un message toutes les 10 secondes, 50 par jour, un filtre de mots, aucun lien ; un message que trois membres signalent est masqué ; l'administration peut masquer.
- **Les signes sur la carte**, sans texte libre : « j'attaque ce port », « tiens cette tour », « besoin de chanvre ». Posés sur une Maison, une tour ou une ville ; ils s'effacent à la fin de la semaine.

### 3.3 La guerre de compagnie

- Une compagnie part en guerre avec ses membres : une flottille de six par six membres, complétée par des Maisons de l'ordinateur ; elle rencontre une compagnie, ou une flottille formée par le jeu, de la même bande de Puissance.
- Les joueurs sans compagnie restent dans les flottilles formées par le jeu.

### 3.4 Le phare

- Chaque membre peut y porter des marchandises de son entrepôt, **plafonné par jour** ; aucun tableau par membre, seulement le phare qui monte.
- Le phare a cinq niveaux ; il ne donne **jamais un rendement** : il arme la Guerre (une place de port de plus par passe aux niveaux 2 et 4, la vue d'une ruse adverse par assaut au niveau 5).

## 4. La technique

- **Base** : les tables `companies`, `company_members`, `company_messages`, `company_message_reports` de l'ancien jeu, reprises ; une table des signes (`company_signs`) et une du phare (`company_beacons`).
- **Serveur** : les routes de l'ancien jeu reprises pour la planche (créer, rejoindre, quitter, inviter, discussion, signalement), les signes, le phare (le don quitte l'entrepôt par une commande de la planche, écrite au journal) ; la Guerre forme les flottilles des compagnies avant celles du jeu.
- **Moteur** : le phare (ses niveaux, son plafond par jour), la formation des flottilles d'une compagnie (`guerreForm` reçoit des groupes déjà faits). Tests d'abord.
- **Écran** : la fiche de la compagnie (écran 4a), le pavillon sur la planche, les signes, la discussion, le phare ; un tutoriel court à la première ouverture.

## 5. Les lots

| Lot | Contenu | Vérification |
| --- | --- | --- |
| K1 | **La compagnie sur la planche** : fonder, rejoindre par un lien, quitter, rôles ; le pavillon sur la planche ; l'invité assis dans la lagune de qui l'invite. | tests du serveur |
| K2 | **La discussion et les signes** : la discussion reprise, les signes sur la carte. | tests du serveur ; parcours à deux navigateurs |
| K3 | **La guerre de compagnie** : les flottilles des compagnies, la compagnie adverse, les ports réservés. | tests du moteur et du serveur |
| K4 | **Le phare** : les dons plafonnés, ses niveaux, ce qu'il arme. | tests du moteur ; au banc, un membre paisible qui porte au phare compte dans la guerre de sa compagnie |
| K5 | **L'écran** : la fiche de la compagnie (écran 4a), la discussion, les signes, le phare, le tutoriel. | parcours e2e à 390 px et sur ordinateur, captures |

Fusion sur la branche principale à la fin de K5.

## 6. Ce qui n'est pas dans cette étape

L'île commune dessinée sur la planche et le fil commun entre associés (plus tard), la Passe à deux contre deux, le classement des compagnies et les ligues (étape 9), la Gazette (étape 8).

## 7. Tranché (12 novembre 2026, le porteur suit les quatre recommandations)

1. **Jusqu'à 12 Maisons** (deux flottilles de six à la Guerre) ; les compagnies de l'ancien jeu sont reprises.
2. **Entre lagunes** : personne ne déménage ; le nouveau joueur arrivé par le lien d'un membre est assis dans sa lagune s'il y a de la place.
3. **Le phare arme la Guerre** : une place de port de plus par passe aux niveaux 2 et 4, la vue d'une ruse adverse par assaut au niveau 5. Jamais un rendement.
4. **La discussion du sestiere plus tard** ; entre inconnus, seulement des signes sans texte libre (saluer, féliciter, défier).

## 8. État

| Lot | État |
| --- | --- |
| K1 | à faire |
| K2 | à faire |
| K3 | à faire |
| K4 | à faire |
| K5 | à faire |
