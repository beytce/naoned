# L'île posée sur la planche : plan (étape 3 de CADRAGE-v4 § 17)

*Proposé le 11 novembre 2026, à la demande du porteur (« d'accord avec toi sur la suite avec l'île posée sur la planche ; on fera le classement et le rival par la suite »), **validé le même jour** avec les trois propositions du § 7 (production sans récolte jusqu'au plafond, une scène à part où les cases se retournent, les ateliers d'aujourd'hui). Les règles de fond sont celles de `docs/CADRAGE-v4.md` § 4.*

## 1. Le problème à régler

Sur la planche d'aujourd'hui, une Maison produit un chiffre fixe (« 12 verres par heure »). Toutes se ressemblent, et il n'y a rien à bâtir. L'île doit devenir **ce qui nourrit tes fils** : ce que tu bâtis, et où, décide de ce que tu peux vendre et en quelle quantité. Deux îles de même richesse ne doivent pas se ressembler.

## 2. Ce que le joueur fait sur son île

| Geste | Ce qui se passe | Ce qu'il décide |
| --- | --- | --- |
| **Acheter une case** | La case voisine tombe en place, comme aujourd'hui. Chacune a un **terrain** : rive, argile, forêt, pré, sable. | Vers quel terrain s'étendre. Le prix monte à chaque case. |
| **Poser un atelier** | En main, l'atelier montre sur chaque case libre **ce qu'il y rendrait** (« +50 % », « −20 % ») avant qu'on le pose. | Où le poser : le terrain qui lui va, à côté de son fournisseur. |
| **L'améliorer** | Trois niveaux visibles. Un chantier de quelques minutes à quelques heures, jamais plus de 24 h. | Quoi monter d'abord : la matière, ou ce qui la travaille. |
| **Le déplacer** | Contre un temps de chantier. | Corriger un mauvais placement sans regret définitif. |

Puis il retourne à la planche et tire ses fils avec ce que l'île produit.

## 3. Les règles

- **Les cases** : l'île commence avec 4 cases (le Fondaco et trois libres) et monte à 36 au plus. Les terrains sont tirés de la position de la Maison sur la planche : une île près du continent a de l'argile et de la forêt, une île au large a du sable et des rives.
- **Les ateliers** : les recettes de Venise d'aujourd'hui, sur trois étages.
  - *Matière* : carrière d'argile, camp de bûcherons, sablière, ferme, saline.
  - *Ouvrage* : briqueterie, scierie, verrerie, moulin, corderie.
  - *Bel ouvrage* : boulangerie, et un ouvrage par métier, plus tard.
- **Les voisinages**, trois règles seulement, toutes visibles avant de poser :
  - *le bon terrain* : +50 % (la carrière sur l'argile, la verrerie sur la rive) ;
  - *le fournisseur à côté* : +20 % quand l'atelier touche celui qui lui fournit sa matière ;
  - *la gêne* : −20 % pour un four (verrerie, briqueterie) à côté d'une ferme.
- **La production** suit la chaîne : la scierie prend le bois du camp dans l'entrepôt ; si le bois manque, elle attend sans rien perdre. Tout se calcule à la lecture.
- **L'entrepôt** a un plafond par marchandise ; plein, l'atelier s'arrête (règle 3 du cadrage v4 : rien ne s'accumule sans fin).
- **L'argent** : ce que les fils rapportent paie les cases, les ateliers et leurs niveaux. Le chiffre fixe d'aujourd'hui disparaît.
- **Les villes** demandent les marchandises des recettes (verre, planches, briques, sel, pain, cordages…), et non plus quatre biens génériques.
- **Les Maisons de l'ordinateur** bâtissent aussi leur île, chacune avec sa préférence (le verre, le bois, la terre). Elles se ressemblent donc moins entre elles.

## 4. À l'écran

- **Entrer dans son île** : toucher ta Maison sur la planche, puis « Entrer ». Les cases de la planche se retournent et l'île apparaît, comme la transition vers la Terraferme voulue le 8 novembre. On en sort par le même geste à l'envers.
- **L'île** se dessine avec les tuiles et les bâtiments de Porcellana tels qu'aujourd'hui (condition du porteur), avec la case libre « + » et la fiche au toucher.
- **L'entrepôt** se voit en caisses devant le quai et en jauges dans la fiche du Fondaco.
- **Sur la planche**, ta Maison reste une seule case ; ses voisines montrent ses ateliers en petit. Les îles des autres se reconnaissent ainsi de loin.

## 5. Les lots

| Lot | Contenu | Vérification |
| --- | --- | --- |
| I1 | **Le moteur de l'île** : cases et terrains, ateliers et niveaux, voisinages, production en chaîne à la lecture, entrepôt plafonné, coûts. Pur, tests d'abord (fixture). | tests du moteur |
| I2 | **L'île branchée sur la planche** : la production vient de l'île, les villes demandent les marchandises des recettes, l'argent des fils paie l'île ; chaque denier compté. | tests ; le banc de la planche |
| I3 | **Les Maisons de l'ordinateur bâtissent** ; le banc sur six semaines. | aucune stratégie unique ne domine ; deux îles de même richesse diffèrent ; `docs/calibration.md` |
| I4 | **L'écran de l'île** dans le laboratoire : acheter une case, poser avec le gain visible avant, améliorer, déplacer, l'entrepôt. | parcours e2e à 390 px |
| I5 | **Le passage planche ↔ île** : les cases qui se retournent, et les ateliers en petit autour de chaque Maison sur la planche. | captures |
| I6 | **En ligne** : l'île de chaque joueur tenue par le serveur, avec la planche. | tests du serveur ; parcours à deux navigateurs |

Chaque lot est poussé à sa fin ; je fusionnerai sur la branche principale quand l'île sera jouable en ligne (fin du lot I6), sauf si tu veux tester plus tôt.

## 6. Ce qui n'est pas dans cette étape

L'intérieur des ateliers (machines, ouvriers, usure), le métier de la Maison (Arte), les niveaux de la Maison, le classement et le rival de la semaine (prévus ensuite, à la demande du porteur).

## 7. À trancher

1. **La récolte** : la décision du 7 novembre (D4) veut qu'un atelier s'arrête et attende ta récolte. Sur la planche, ton geste est déjà le fil ; je propose que **la production aille seule à l'entrepôt jusqu'à son plafond**, sans récolte à la main. Plein, l'atelier s'arrête : on ne gagne donc pas sans revenir vider l'entrepôt par ses fils.
2. **Entrer dans l'île** : une scène à part avec les cases qui se retournent (proposé, plus sûr sur téléphone), ou un vrai zoom continu depuis la planche (plus beau, plus long à faire, à garder pour plus tard) ?
3. **Les ateliers et les recettes** : je reprends ceux d'aujourd'hui tels quels. D'accord ?

## 8. État (11 novembre 2026)

*Le 11 novembre, l'aspect suit la toile validée par le porteur (`docs/audit-visuel-2026-11-11/`, § « Ce qui est fait ») : le terrain qui se voit, les cases à acheter pâles, les gains en couleur, viser puis « Poser », l'entrepôt qui prévient.*

| Lot | État |
| --- | --- |
| I1 | fait : `packages/engine/src/ile/`, 11 tests |
| I2 | fait : l'île branchée sur la planche (production, bourse, chaque denier compté), 20 tests de la planche ; les villes demandent les marchandises des recettes, le Rialto achète les matières brutes |
| I3 | fait : les Maisons de l'ordinateur bâtissent selon leur plan, par tours ; banc dans `docs/calibration.md`, § L'île (une marée remplit un tiers de l'île, écart ×1,9) |
| I4 | fait : l'écran de l'île (`apps/web/src/porcellana/ile/`), parcours `e2e:ile` à 390 px et sur ordinateur |
| I5 | fait : les cases de l'île se retournent à l'entrée ; sur la planche, les ateliers de chaque île en petit autour de sa Maison. Pas de transition depuis la planche elle-même (la planche s'efface, l'île arrive) |
| I6 | fait : routes `/api/planche/ile/*`, parcours `e2e:ile` en ligne |

Reste : la Maison de la brique gagne moins que les autres (à reprendre au banc) ; pas d'essai sur un vrai téléphone ; la marée ne finit pas encore.
