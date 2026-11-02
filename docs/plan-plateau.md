# Plan : le « Plateau de nuit » dans le jeu (2 novembre 2026)

*À valider par le porteur avant tout code. Source : la toile de design validée (« Plateau de nuit ») et son moteur de référence, `docs/direction-artistique-2026-11/plateau/` (Python → SVG).*

## Le principe

La carte de l'empire devient un plateau de tuiles hexagonales épaisses, low-poly, sous une seule lumière, posé sur le bleu nuit du jeu. On garde tout ce qui marche déjà : la grille du moteur (cases « q,r » de `venice1450.map.ts`, `HEX_SIZE`), la caméra (`useCamera`), les données (`EmpirePayload`), les feuilles, les règles (une action en or, tout se voit, rien sous 12 px, mouvement réduit respecté).

**Le choix technique** : une vue en 2,5D. Le sol de la carte reste dans le repère actuel, aplati en hauteur (facteur 0,58) dans la transformation de la caméra ; les volumes (tranches des tuiles, arbres, villes, bâtiments) sont dessinés debout par-dessus, à leur point projeté. Le pan et le zoom ne changent pas ; aucune 3D réelle, aucun canvas, aucune dépendance : du SVG calculé, mis en cache par case.

## Les lots (un commit par fonctionnalité, chacun vérifié dans le jeu)

1. **Le moteur de rendu, en TypeScript** — `apps/web/src/art/plateau/` : projection, ombrage (une lumière), primitives (boîte, prisme, cône, toit à deux pans), tuile hexagonale à deux strates, et le kit de modèles (sapin, rocher, montagne, maison, tour, fondaco, four, grange, champs, clôture, ponton, moulin, glaisière, bois, charrette, palais). Fonctions pures, déterministes (graine par case), testées (Vitest) : visibilité des faces, ordre de dessin, stabilité d'une case à l'autre.
2. **La carte** (`EmpireMap.tsx`) :
   - chaque case connue devient une tuile : vos terres sable-or, les terres vues gris-bleu, les cases de mer voisines en lagune translucide d'un seul tenant, l'inconnu en pointillés gris-bleu qui respirent ;
   - le décor de chaque case est tiré de sa région et de sa graine (forêts, montagnes au nord, champs, rochers, pontons sur les côtes) ;
   - les villes deviennent de petites villes low-poly à leur place, avec l'anneau de commandes à trois états (en cours lagune, pleine en or avec une onde, livrable maintenant avec une caisse) ; hors de portée, pas d'anneau ;
   - le fondaco (toit d'or, tour, fanion de niveau), la Remise, le Campo et la Porta deviennent des modèles ;
   - zones tactiles en hexagone (plus de chevauchement), noms posés sur la tranche des tuiles, pastille « lots prêts » au-dessus du fondaco, « + » doré sur les cases achetables voisines.
3. **Le fondaco de près** (`Orbit.tsx`) : le fondaco sur sa tuile, ses ateliers sur les tuiles autour (four, champs et moulin, glaisière, coupe de bois, scierie, case libre « Bâtir ici ») ; magasin affiché en haut ; « Tout récolter ».
4. **L'interface autour** :
   - bourses en haut à droite : ducat, perle, sceau et roue frappés, sur cuir bleu nuit surpiqué d'or (`Hud.tsx`) ;
   - bulles du bas épurées (`RoundButtons.tsx`) ;
   - Lorenzo pousse l'action prioritaire (récolter, puis livrer, puis bâtir) ;
   - marchandises frappées (`GoodsMark`) et véhicules en médailles de profil (`Fleet.tsx`) ;
   - animations : pièces qui montent à la livraison, bourse qui s'allume, fumée, vaguelettes, entrées d'écran.
5. **Les feuilles** : la ville (mini-anneau, stock sous chaque commande, ville suivante), la Remise façon chantier (cartes, plafond, achat en or), la Famille (le palais sur sa tuile).
6. **Finitions** : performance sur téléphone (budget de polygones, couches statiques mémoïsées, animations en CSS seulement), contrastes (`test/theme.test.ts`, `test/goods.test.ts` mis à jour), parcours `pnpm --filter @comptoirs/web e2e:empire`, `docs/design.md` réécrit sur la direction « Plateau de nuit » (elle remplace « Lagune » pour la carte ; les palettes de l'interface restent).

## Ce qui ne change pas

Le moteur de jeu (`packages/engine`), le serveur, les règles, les données : la refonte est visuelle. Aucun équilibrage touché.

## Risques

- **Performance** : une carte entière en polygones. Parade : dessin par case, mis en cache, seulement les cases à l'écran, niveau de détail réduit au dézoom (tuiles sans décor).
- **Lisibilité au dézoom** : en dessous d'une certaine échelle, les modèles cèdent la place à des repères simples (anneau et nom).
