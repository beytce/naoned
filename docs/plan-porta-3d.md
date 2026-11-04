# La Porta, la bataille et la Remise en diorama 3D (plan validé le 4 novembre 2026)

*Décisions du porteur du 4 novembre 2026, après le chantier de la carte (docs/plateau-reprise.md § 9) : la Porta et son mode PvE reprennent le design de la carte, avec des modèles « mini » assortis et des personnages animés. Ce document décrit l'écran ; les règles de la Porta restent celles de docs/plan-porta.md, inchangées (le moteur, les chiffres, le simulateur).*

## Décisions

| Sujet | Décision |
| --- | --- |
| La bataille | Diorama 3D de tuiles, même style et même caméra que la carte |
| Les personnages | KayKit « Adventurers » (CC0), du même auteur que les bâtiments, animés |
| Rome | Rouge cinabre et blanc papal |
| Vos véhicules | Équipage visible : un chevalier à cheval, un chariot tiré par l'âne avec son équipage |
| Les combats | Projectiles, chiffres de dégâts, effets des composants, morts et ruines |
| Les ordres | Toucher son véhicule, puis la destination |
| La caméra | Toute l'île au départ, pincer et déplacer, double toucher pour la vue d'ensemble |
| L'écran de la Porta | Une scène à part (le portail, les paliers en marches, la Porta noire, les véhicules à quai, l'antiquaire), un seul « Entrer » en or |
| La Remise | Un atelier 3D (véhicules sur socles, places de composants en socles colorés, cartes) |
| La sortie | Une scène de retour (les reliques rapportées, les véhicules perdus ou abîmés) |
| Le son | Plus tard (IDEAS.md) |

## Ce qui est fait

- **Les figurines** (`apps/web/src/empire/map3d/minis.tsx`, `roster.ts`, `figure.tsx`) : les cinq personnages KayKit et le cheval de Quaternius dans `public/models/minis.glb` (`scripts/pack-minis.mjs`, la texture cuite dans les sommets), repeints selon leur camp (`tint`), chaque rôle de la bataille son personnage, ses objets, sa taille, ses animations et sa monture. Une page d'essai : `?lab=minis` (`&act=walk`, `&focus=3`).
- **Les modèles des véhicules** dans la bataille (`PlayerUnit.model`, moteur et serveur) : chaque unité du joueur sait sa figurine.
- **La bataille** (`porta/Battle3D.tsx`, `porta/BattleDiorama.tsx`) : l'île tirée de la graine, ses villes et leurs coffres de reliques, la Porta de pierre, les figurines lissées entre deux battements (250 ms), tournées vers leur cible, leurs actes (marcher, frapper, encaisser, tomber) tirés des événements ; les projectiles, les dégâts au-dessus des cibles, les anneaux de vie, la bulle du pavois, la fumée, les anneaux de la trompette et du chirurgien, l'anneau de chargement, le feu de l'incendiaire, la nuit qui gagne la dernière minute. Le disque SVG reste pour un appareil sans WebGL.
- **La Porta** (`porta/PortaScene.tsx`) : le portail sur les terres de Rome, les paliers en marches, la Porta noire, les véhicules à quai en figurines, l'étal de l'antiquaire, « Entrer », le groupe, la scène de retour. Sans WebGL, le même dock sur un fond simple (docs/plan-dock.md).
- **La Remise** (`porta/ArmsScene.tsx`) : l'atelier des armes. Sans WebGL, le même dock sur un fond simple (docs/plan-dock.md).

## Ce qui reste

- Mesurer une bataille de palier 6 (une quarantaine de figurines) sur un téléphone moyen ; s'il le faut, des figurines sans animation de loin.
- Les sons et les vibrations (IDEAS.md).
