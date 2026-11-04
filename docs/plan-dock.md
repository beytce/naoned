# Le dock : une scène, un dock, une décision (4 novembre 2026)

*Décision du porteur du 4 novembre 2026 : les menus (la Porta, l'amélioration des ateliers, les livraisons, la Remise) étaient « horribles » et la navigation pas fluide. Nouvelles propositions sur la planche Claude Design (privée, au compte du porteur) : https://claude.ai/artifact/29ZeubUiFjz6APJnLpncr8, validées telles quelles (« c'est parfait »), à intégrer en tenant compte de ce qui est déjà en 3D.*

## Le principe

- **Le lieu ne disparaît jamais.** En haut, la scène 3D existante (la carte et le domaine d'un fondaco, la Porta, la Remise des armes) ; elle réagit au choix fait en bas (l'atelier choisi cerclé de lapis, la route de livraison tracée en or, la caméra qui glisse vers le quai, les marches, la porte, l'étal ou le socle du véhicule).
- **Un dock, une décision.** En bas, le dock (`apps/web/src/dock.tsx`) : arrondi en haut, sa poignée, au plus 55 % de l'écran ; tiré vers le bas, Échap ou le bouton retour le ferment. Ce n'est pas une fenêtre : la scène au-dessus garde ses touchers.
- **Choisir, c'est toucher un objet** : des cartes (`ChoiceCard`), des alvéoles, des socles ; plus de liste déroulante ni de case à cocher.
- **Avant → après** (`CompareRows`) : une amélioration montre ce qu'elle rapporte avant ce qu'elle coûte ; le coût en jetons « j'ai / il faut » (`CostChips`), ce qui manque en cinabre.
- **Les voisins à un geste** : ‹ n/N › dans l'en-tête (`PlaceHeader`) passe à l'atelier, la ville ou le véhicule suivant.
- **Ce qui bloque devient un chemin** : une commande non couverte mène à l'atelier qui la produit ou au marché.
- **Une seule action en or** par vue du dock ; les étapes d'une décision en rail 1 · 2 · 3 (`StepRail`).

## Ce qui est fait

| Lot | Contenu | Fichiers |
| --- | --- | --- |
| 1 · Les pièces | `Dock`, `PlaceHeader`, `StepRail`, `ChoiceCard`, `CostChips`, `CompareRows`, `TimeRing`, `DockDoor`, `PlainGround` ; aides pures `siblingOf`, `costChips`, `compareTone`, `stepStates` | `src/dock.tsx`, `test/dock.test.tsx` |
| 2 · Ateliers | Le moteur dit le lot avant et après le niveau suivant (`upgrades[id].yieldBps`, `nextYieldBps`, d'après `lotYieldBps`). Un atelier touché ouvre son dock : la recette en petite machine, trois portes (Améliorer, Modules, Maître), une action d'or (récolter ou relancer), ‹ › vers ses voisins de l'anneau, « Déplacer ». Améliorer : avant → après (par lot, à l'heure) et jetons de coût. Modules : les places en alvéoles, les modules recherchés en cartes. Le domaine 3D cercle l'atelier choisi de lapis (`DomainScene.selected`), l'orbite SVG aussi. La liste « Tous les ateliers » ouvre ce dock. | `map/WorkshopDock.tsx`, `map3d/Board3D.tsx`, `Orbit.tsx`, `packages/engine/src/empire/view.ts` |
| 3 · La Porta | Le pied de la scène devient un dock en trois pas : l'équipage (les véhicules en cartes ; un véhicule resté à la Remise, choisi, part tout seul vers la Porta), le palier (ses cartes accordées aux marches 3D, ce qu'il rapporte, la Porta noire en porte à part), partir (seul, avec des marchands de son niveau, avec sa compagnie ; le code seulement sur demande). Le salon : les places, le compte à rebours, le code à partager. L'antiquaire, la montée de la Porta et le classement derrière des boutons ronds de l'en-tête. La caméra glisse vers ce que le dock décide. | `porta/PortaDock.tsx`, `porta/PortaScene.tsx`, `porta/colours.ts` |
| 4 · Livraisons | Le dock d'une ville : les commandes en caisses à cocher, ‹ › vers les villes qui ont des commandes, la route du véhicule tracée en or sur la carte avant le départ (`Fleet`, `planned`). Une caisse non couverte : ce qui manque en pastilles, l'atelier qui la produit (en or), le marché. Au départ, une note « en route · Suivre ». | `map/OrdersPanel.tsx`, `map/Fleet.tsx`, `EmpireGame.tsx` |
| 5 · La Remise | Le véhicule au centre (‹ › d'un socle à l'autre, la caméra suit), sa vie, sa vitesse, ses places ; une place touchée (dans le dock ou sur le socle) : les composants de son type en cartes, « Poser », « Retirer », l'amélioration du composant posé ; la boutique des modèles et des composants. | `porta/ArmsDock.tsx`, `porta/ArmsScene.tsx` |
| 6 · Sans WebGL | La Porta et la Remise gardent leur dock sur un fond simple (`PlainGround`) ; `PortaSheet` et `ArmsSheet` sont supprimées. | `EmpireGame.tsx` |

Aucune règle de jeu ne change : les actions sont celles d'avant (`empireUpgrade`, `empireFit`, `empireSendToPorta`, `empireDeliverCity`, `empireFitArm`…), seulement présentées autrement. Pas de passage au simulateur.

## Vérifier

```bash
pnpm typecheck && pnpm lint && pnpm test
pnpm --filter @comptoirs/web build
CHROMIUM=/opt/pw-browsers/chromium SIZES=390x844,320x568 pnpm --filter @comptoirs/web e2e:empire
CHROMIUM=/opt/pw-browsers/chromium node apps/web/e2e/porta.mjs
```

Les captures : `4-panneau` et `4b-atelier` (le dock d'atelier), `14-commandes` et `15-livrer` (la ville) ; pour la Porta, `1-armes`, `1b-equiper`, `1c-acheter`, `4-porta`, `4b-palier`, `4c-partir`, `4d-antiquaire`.

## Ce qui reste

- Les autres feuilles (Casa, marché, compagnie, famille) passeront au dock quand leurs écrans seront repensés pour CADRAGE-v3 (lot 9 de la refonte UX, suspendu).
- La caméra de la carte ne se déplace pas encore vers la ville choisie par ‹ › (la route tracée la montre).
