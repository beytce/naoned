# Modèles 3D du prototype de carte (`?map=3d`)

Tous les modèles de ce dossier sont sous licence **CC0 1.0** (domaine public : usage personnel et commercial permis, sans attribution obligatoire). Nous créditons quand même leurs auteurs.

## `kaykit.glb` — KayKit « Medieval Hexagon Pack » 1.0

- Auteur : **Kay Lousberg** (https://www.kaylousberg.com), https://kaylousberg.itch.io/kaykit-medieval-hexagon
- Source : https://github.com/KayKit-Game-Assets/KayKit-Medieval-Hexagon-Pack-1.0 (`addons/kaykit_medieval_hexagon_pack/Assets/gltf/`)
- Licence : CC0 1.0, voir `kaykit-LICENSE.txt` (copie conforme)
- 21 modèles, copiés **tels quels** dans `apps/web/art-src/models/kaykit/` (`.gltf`, `.bin`, l'atlas `hexagons_medieval.png`, la licence) : sapins, rochers, montagnes, maisons, église, tour, marché, champ de blé, caisses ; et pour les ateliers du fondaco : forge, mine, scierie, moulin, coupe de bois.
- Le jeu sert un seul fichier, `kaykit.glb`, fait par `apps/web/scripts/pack-models.mjs` : chaque modèle sous un nœud nommé par sa clé (`apps/web/src/empire/map3d/models.json`), sans l'atlas (le jeu ne le lit pas), les sommets soudés et quantifiés (`KHR_mesh_quantization`, lu tel quel par three.js). Une requête au lieu de 44 ; 755 Ko (262 Ko compressé). Le jeu ne lit pas l'atlas : il recolore chaque sommet selon la case de l'atlas visée par ses UV, dans la palette du « Plateau de nuit » (`apps/web/src/empire/map3d/recolor.ts`).

## `quaternius/` — Quaternius « Ultimate Animated Animals », l'âne

- Auteur : **Quaternius** (https://quaternius.com), https://www.patreon.com/quaternius
- Licence : CC0 1.0, voir `quaternius/LICENSE.txt` (le texte livré avec le pack)
- Provenance : quaternius.com est refusé par le réseau du conteneur de développement ; le fichier `Donkey.gltf` du pack a été pris sur une copie publique du pack sur GitHub (`laoniutoushx/TD-demo-2024-04-03`, identique octet pour octet à celle de `xxfrigorizxx/The-Legacy-Of-Seroka`, avec la licence). À revérifier contre l'archive officielle avant une mise en production.
- Transformation : converti en `.glb` avec gltf-transform, seules les animations `Walk` et `Idle` gardées (rééchantillonnées), les données orphelines retirées. La géométrie et le squelette ne changent pas (la quantification des positions a été essayée puis écartée : elle cassait le skinning). 3,5 Mo → 300 Ko (100 Ko compressé).

## Pas encore là

- Kenney « Hexagon Kit » (CC0) : kenney.nl est refusé par le réseau du conteneur. Les tuiles sont donc construites dans le code (prismes hexagonaux arrondis).

## `minis.glb` — les figurines de la Porta (4 novembre 2026)

- **KayKit « Adventurers Character Pack » 1.0**, Kay Lousberg (https://www.kaylousberg.com), CC0 1.0. Source : https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0, commit `672074b73ba276876a19e8816ecdc5241817ab47` (`addons/kaykit_character_pack_adventures/Characters/gltf/` : Knight, Barbarian, Mage, Rogue, Rogue_Hooded). Licence : `kaykit-adventurers-LICENSE.txt` (copie conforme).
- **Quaternius « Ultimate Animated Animals »**, le cheval (`Horse.gltf`), CC0 1.0 : même provenance que l'âne ci-dessus (`laoniutoushx/TD-demo-2024-04-03`, `Asserts/Models/ulitimate animals/glTF/Horse.gltf`), à revérifier de même contre l'archive officielle.
- Les originaux (18 Mo) ne sont pas gardés dans le dépôt : les copier dans `apps/web/art-src/models/kaykit-adventurers/` et `apps/web/art-src/models/quaternius/`, puis `node apps/web/scripts/pack-minis.mjs`.
- Transformation : la texture de chaque personnage cuite dans les couleurs de ses sommets (la CSP du jeu refuse la texture d'un `.glb`), quatorze animations du squelette commun gardées une fois (attente, marche, course, coups, tirs, sort, parade, coup reçu, mort, acclamation, assis), les quatre du cheval renommées `Horse_…` ; puis allégé (`scripts/slim-minis.mjs`, audit du 4 novembre 2026 : les 1 625 canaux d'animation qui ne font que tenir un os au repos retirés, normales, couleurs et poids sur 8 bits, `KHR_mesh_quantization` lu par three.js sans WebAssembly, positions gardées en flottants pour le squelette) : 1,27 Mo (572 Ko compressé), au lieu de 2,2 Mo (860 Ko). Le jeu repeint les figurines selon leur camp (`apps/web/src/empire/map3d/minis.tsx`, `tint`).
