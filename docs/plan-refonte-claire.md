# La refonte claire : quatre lieux, une décision à la fois (5 novembre 2026)

*Décision du porteur du 5 novembre 2026 : « l'interface, l'utilisation de la 3D, la navigation et les interactions entre les pages sont très mauvaises ; c'est brouillon, les informations et fonctionnalités sont dures à aller chercher ; on ne comprend pas pourquoi il y a 10/3 commandes ». Les livraisons et la Porta restent ; leur présentation change. Planche validée telle quelle (« je valide ») : https://claude.ai/artifact/Yc1eYk2rk1Nmd8HMaNXC8o (privée, au compte du porteur).*

## Le diagnostic

1. **Quatre directions empilées** en deux semaines (Lagune et ses astres, le Plateau de nuit, Jour et le verre, le dock), aucune n'ayant retiré la précédente.
2. **Une vingtaine d'entrées** : cinq boutons ronds, le médaillon de la Casa, deux compteurs muets (la Faveur en étoile, les véhicules en roue « 0/4 »), le bandeau de Lorenzo, les trois jalons, les feuilles Production, Remise, Armes, Antiquaire…
3. **Le « 10/3 »** : le plafond de commandes d'une ville de taille 5 est passé de 14 à 3 (commit 9eebba7) sans retirer les commandes déjà là. Corrigé dans le moteur : jamais plus de commandes que le plafond, les mieux payées restent.
4. **La Porta se joue sur le plateau de l'économie**, sans but lisible.
5. **Des tableurs** : le Marché, le Carnet, la Famille, le choix d'un atelier.

## La règle

- **Quatre lieux** dans une barre d'onglets au pied : **Carte · Fondaco · Porta · Compagnie**. Chacun est une scène et son dock ; rien d'autre n'a d'entrée propre.
- **Ce qui fusionne** : le Marché devient la Dogana, dans le dock de Venise ; la Remise et les Armes deviennent le quai du Fondaco ; la Famille, le personnel, les réglages et l'aide passent derrière le médaillon de la Casa (le profil) ; Lorenzo (après le tutoriel), les jalons et la pastille du Carnet deviennent **une seule carte « le mieux maintenant »** sur la Carte, avec une action.
- **Le HUD** : le médaillon de la Casa (son anneau vers la suivante), les ducats, la Faveur nommée ; rien d'autre.
- **Les commandes en caisses** : une ville montre ses commandes en caisses pleines ; « Livrer » en or quand un véhicule peut partir. Plus de « n/plafond ».
- **La Porta a son décor** (les terres de Rome au crépuscule), ses paliers en escalier avec ce qu'ils rapportent ; en combat, l'objectif toujours en haut (coffres, vague, temps).
- **Le Carnet en médailles.**

## Les lots

| Lot | Contenu | État |
| --- | --- | --- |
| 0 | Le moteur : les commandes jamais au-delà du plafond | fait |
| 1 | La barre des quatre lieux, le HUD réduit, la carte « le mieux maintenant », les pastilles en caisses, le profil derrière le médaillon (Famille, Dogana, Conseil) | fait ; la barre reste à poser sur la Porta et la Compagnie (lots 4 et 5) |
| 2 | La Carte : repères de ville lisibles, sans chevauchement (`map/declutter.ts`, les noms de région à l'encre du jour) ; la Dogana dans le dock de Venise (et derrière le médaillon) | fait |
| 3 | Le Fondaco : son pied (`map/Domain.tsx`, `DomainBar`) porte le chemin de la Casa suivante (`map/casaRoad.ts`), les portes Bâtir, Quai (la Remise, ou les véhicules de la Production tant qu'elle n'est pas posée) et Armes (Porta ouverte), une seule action d'or ; les déblocages de la Casa nommés | fait ; la Remise reste un lieu posé sur la carte (la déplacer au quai du domaine 3D : lot 6) |
| 4 | La Porta : son décor (les terres de Rome au crépuscule, `porta/colours.ts`, `ROME_DUSK`), les paliers en escalier, l'objectif du combat toujours en haut (`porta/goal.tsx`) | fait ; la Porta reste plein écran, sans la barre des lieux (on revient par la croix) |
| 5 | La Compagnie : le Carnet en médailles, une action d'or pour tout encaisser (`CompanyTab.tsx`) ; le profil derrière le médaillon (lot 1) | fait ; la Compagnie reste une feuille, sans la barre des lieux |
| 6 | Les ateliers dessinés en code dans la main du jeu (`map3d/props3d.tsx` : carrière, sablière, scierie, camp de bûcherons, ferme, moulin de la lagune, palais), les villes de la Porta en maisons du jeu autour d'une église romane | fait ; de KayKit ne restent que les sapins, rochers, montagnes, caisses et la tour de Rome (neutres) ; la grammaire de caméra reste à reprendre |

Aucune règle de jeu ne change hors du lot 0 (une correction) : pas de passage au simulateur.

## Vérifier

```bash
pnpm typecheck && pnpm lint && pnpm test
pnpm --filter @comptoirs/web build
CHROMIUM=/opt/pw-browsers/chromium SIZES=390x844,320x568 pnpm --filter @comptoirs/web e2e:empire
CHROMIUM=/opt/pw-browsers/chromium node apps/web/e2e/porta.mjs
```
