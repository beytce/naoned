# Modèles 3D du prototype de carte (`?map=3d`)

Tous les modèles de ce dossier sont sous licence **CC0 1.0** (domaine public : usage personnel et commercial permis, sans attribution obligatoire). Nous créditons quand même leurs auteurs.

## `kaykit/` — KayKit « Medieval Hexagon Pack » 1.0

- Auteur : **Kay Lousberg** (https://www.kaylousberg.com), https://kaylousberg.itch.io/kaykit-medieval-hexagon
- Source : https://github.com/KayKit-Game-Assets/KayKit-Medieval-Hexagon-Pack-1.0 (`addons/kaykit_medieval_hexagon_pack/Assets/gltf/`)
- Licence : CC0 1.0, voir `kaykit/LICENSE.txt` (copie conforme)
- Fichiers copiés **tels quels** (`.gltf`, `.bin`, l'atlas `hexagons_medieval.png`). Le jeu ne lit pas l'atlas : il recolore chaque sommet selon la case de l'atlas visée par ses UV, dans la palette du « Plateau de nuit » (`apps/web/src/empire/map3d/recolor.ts`).

## `quaternius/` — Quaternius « Ultimate Animated Animals », l'âne

- Auteur : **Quaternius** (https://quaternius.com), https://www.patreon.com/quaternius
- Licence : CC0 1.0, voir `quaternius/LICENSE.txt` (le texte livré avec le pack)
- Provenance : quaternius.com est refusé par le réseau du conteneur de développement ; le fichier `Donkey.gltf` du pack a été pris sur une copie publique du pack sur GitHub (`laoniutoushx/TD-demo-2024-04-03`, identique octet pour octet à celle de `xxfrigorizxx/The-Legacy-Of-Seroka`, avec la licence). À revérifier contre l'archive officielle avant une mise en production.
- Transformation : converti en `.glb` avec gltf-transform, seules les animations `Walk` et `Idle` gardées, positions quantifiées (`KHR_mesh_quantization`). La géométrie et le squelette ne changent pas. 3,5 Mo → 225 Ko.

## Pas encore là

- Kenney « Hexagon Kit » (CC0) : kenney.nl est refusé par le réseau du conteneur. Les tuiles sont donc construites dans le code (prismes hexagonaux arrondis).
