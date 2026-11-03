# Illustrations à intégrer

Déposer ici les images générées, par famille : `buildings/`, `ships/`, `regions/`, `casa/`, `people/`, `world/`. Les noms et les textes à donner au générateur sont dans `docs/commandes-images.md`.

Puis, depuis la racine du dépôt : `node apps/web/scripts/art.mjs`. Le script écrit `apps/web/public/art/` et `apps/web/src/art/raster.ts` ; committer les trois.

`islands/` : les images de la direction « Îles de la nuit » (`docs/direction-artistique-2026-11.md`), déjà détourées (PNG transparent), en attente de leur intégration à la carte. Le script les ignore tant que la famille n'est pas branchée.

`models/kaykit/` : les modèles 3D KayKit « Medieval Hexagon Pack » (CC0, Kay Lousberg) de la carte 3D (`?map=3d`, `docs/plateau-reprise.md` § 7), copiés tels quels. Après un ajout (et sa clé dans `src/empire/map3d/models.json`) : `node apps/web/scripts/pack-models.mjs`, qui écrit `apps/web/public/models/kaykit.glb` ; committer les deux.
