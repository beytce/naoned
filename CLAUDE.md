# Fondaco (ex-Comptoirs)

Jeu de commerce multijoueur 2D de niche, web/PWA (PC + mobile). Cadrage qui fait foi : docs/CADRAGE-v3.md (un empire marchand persistant, sans remise à zéro) ; docs/CADRAGE.md (v2) ne vaut plus que pour ses parties techniques. Nom de code du dépôt : naoned.

## Stack
- Monorepo pnpm : apps/web (React + Vite + Tailwind, PWA), apps/server (Node + Fastify), apps/simulator (bots en mémoire, sortie CSV), packages/engine (logique pure en TypeScript).
- PostgreSQL via Drizzle ORM, migrations versionnées.
- Tests : Vitest. Temps réel : WebSocket.
- Commandes : `pnpm dev` (`WORLD_KIND=empire pnpm dev` pour le monde persistant), `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm sim` (saisons mensuelles, rapport dans apps/simulator/out/report.md), `pnpm --filter @comptoirs/simulator empire` (simulateur de 24 mois par cohortes, rapport dans apps/simulator/out/empire.md), `pnpm --filter @comptoirs/web e2e:empire` (parcours de l'empire, après le build du web).
- Base locale : PGlite (`DATABASE_URL=pglite:…`) en dev et en test ; PostgreSQL en production. Nouvelle table → modifier apps/server/src/db/schema.ts puis `pnpm --filter @comptoirs/server db:generate --name <nom>`.
- Déploiement : un seul service Railway (Dockerfile), voir docs/deploiement.md.

## Règles non négociables
- Montants en entiers (bigint, en deniers), taux en points de base. Jamais de float.
- Tout mouvement de monnaie passe par ledger_entries (partie double) ; tout mouvement de stock passe par stock_movements.
- Toute table de la couche monde porte world_id ; le référentiel (resources, recipes) porte theme_id.
- La logique de jeu (production, marché, PNJ, villes, invariants) vit dans packages/engine, sans accès base : fonctions pures testées, utilisées à l'identique par le serveur et le simulateur.
- Production calculée paresseusement à la lecture, pas par le tick.
- Toute opération de marché = une transaction SQL unique, sérialisée par un verrou transactionnel par (world_id, resource).
- Paramètres d'équilibrage dans worlds.settings (JSON), jamais en dur.
- Le commerce est persistant, sans remise à zéro : seule la Terraferme a des saisons courtes, d'une semaine ; `worlds.ends_at` ne borne plus le commerce.

## Règles d'or (CADRAGE-v3 § 2, version Hades' Star du 1er novembre 2026, règles 3 et 4 retirées le 5 novembre)
Elles font foi pour toute mécanique, toute fonctionnalité et tout mode de jeu ; en cas de conflit, elles priment.
1. **Ton empire t'appartient.** Personne ne peut piller ni prendre ce que tu as bâti.
2. **Le risque vient des terres de Rome, jamais d'un autre joueur.** Un véhicule détruit au combat de la Porta rentre abîmé ; un véhicule encore à la Porta à sa fermeture est perdu ; la perte définitive à chaque combat n'existe qu'à la Porta noire, que le joueur choisit.
3. *(Supprimée le 5 novembre 2026, décision du porteur : l'absence peut coûter, un stock plein peut perdre, le joueur jette ce qu'il ne garde pas.)*
4. *(Supprimée le 5 novembre 2026, décision du porteur : ce que les perle peuvent acheter n'est plus borné par une règle d'or.)*
5. **Les hauts niveaux se gagnent en jouant.** Au-delà d'un certain niveau, les modules demandent des plans, qui viennent des reliques de la Porta.
6. **On affronte des joueurs de son niveau.** Combats, classements et appariements se font par bande de Puissance, calculée sur ce qui est bâti, jamais sur la caisse.
7. **Le jeu se joue en quelques minutes, plusieurs fois par jour, et la compagnie aide sans obliger.** Les modes en direct sont courts (une dizaine de minutes) ; aucun mode n'exige d'être présent pendant des jours.
8. **Tout se voit.** Toute fonctionnalité, tout mode de jeu est d'abord visuel : sur la carte, par des objets qu'on touche, des mouvements et des animations. Ni tableur ni jeu de texte : un chiffre ou une liste accompagnent l'image, jamais ne la remplacent.

## Façon de travailler
- Chaque système absorbe les anciens au lieu de s'y ajouter : une douzaine de systèmes visibles, pas trente.
- Commencer chaque tâche en mode plan, attendre validation avant de coder.
- Écrire les tests avant le code pour packages/engine. Les tests du moteur utilisent la fixture figée test/fixture.ts, jamais les paramètres de Venise.
- Un lot qui touche l'économie du commerce (production, commandes, stocks, prix) se valide au simulateur de 24 mois, toutes les graines, avec le test « bot glouton contre bot réfléchi » (décision du porteur du 5 novembre 2026, plan de profondeur v3) ; ailleurs, le simulateur reste un outil. Tout changement d'équilibrage se documente dans docs/calibration.md.
- Le socle de l'empire (CADRAGE-v3 § 13, étape 3) vit à côté du monde mensuel : moteur `packages/engine/src/empire/` (commandes `empire*`), routes `/api/empire`, écran `apps/web/src/empire/`. La bascule (`EMPIRE_FROM`) ne s'active en production que sur décision du porteur.
- La refonte claire (5 novembre 2026, validée par le porteur) : quatre lieux (Carte, Fondaco, Porta, Compagnie) dans une barre d'onglets, le Marché dans Venise, la Remise au quai, le profil derrière le médaillon ; plan, lots et état dans docs/plan-refonte-claire.md. Elle prime sur la Lagune, le Plateau et le dock pour la navigation.
- La profondeur (5 novembre 2026, retour du porteur) : la demande à la mesure de la Maison, les tournées, le magasin, les recettes en étoiles, l'extraction, la Porta à contres ; plan v3 dans docs/plan-profondeur-2026-11-05.md (v2 validée : docs/plan-profondeur-2026-11-05-v2.md ; rapports de l'équipe : docs/expertise-profondeur-2026-11-05/) ; v3 validée, en attente du « go » du porteur après la refonte visuelle, à laquelle chaque lot s'adapte.
- La Porta (le PvE des terres de Rome, CADRAGE-v3 § 12 quater) : détail dans docs/plan-porta.md ; moteur dans `packages/engine/src/empire/porta/`, serveur `apps/server/src/game/porta.ts`, écran `apps/web/src/empire/porta/`.
- Direction Jour et le verre (4 novembre 2026, remplace le « Plateau de nuit » pour la carte) : palette Jour par défaut, plateau pastel, cases « + », HUD en barre, surfaces en verre (`.glass*`) ; docs/design.md § Direction Jour et le verre.
- Le dock (« une scène, un dock, une décision », 4 novembre 2026) : tout menu de choix (ateliers, Porta, livraisons, Remise) en suit les pièces (`apps/web/src/dock.tsx`) ; détail et état dans docs/plan-dock.md.
- Le « Plateau de nuit » (direction de la carte, 2 novembre 2026) : état, architecture et suite dans docs/plateau-reprise.md ; moteur dans `apps/web/src/art/plateau/`, plan docs/plan-plateau.md.
- Petits commits, un par fonctionnalité.
- Hors périmètre MVP : noter dans IDEAS.md, ne pas coder.
- Refonte totale du 29 octobre 2026 (docs/refonte-2026-10-29/ : synthèse, arbitrages du porteur, notes d'expert) : toute mécanique suit CADRAGE-v3 et son chemin (§ 13), une étape à la fois, chacune avec son plan validé. Les gels et chantiers antérieurs (recommandations du 20 octobre, plan de rupture du 27 octobre) sont clos ; une idée hors du chemin va dans IDEAS.md.
- Règles stables dès qu'il y a des joueurs : à la Terraferme, un changement prend effet le lundi suivant ; au commerce, il s'annonce dans les notes du chapitre (le mois) avant de s'appliquer.
- Langue du code : anglais. Langue de l'interface : français (i18n prévu).
- Refonte UX du 28 octobre 2026 : lots 1 à 8 faits (docs/plan-refonte-ux.md), leurs acquis restent (barre à 5 onglets, feuilles, un seul or) ; le lot 9 est suspendu, ses écrans seront repensés pour CADRAGE-v3.
- Direction artistique « Lagune » (décision du porteur, 25 octobre 2026) : tout nouvel écran ou élément la suit (docs/design.md, § Direction Lagune ; maquettes de chaque page : docs/propositions-design-2026-10-25.md). Un lieu est un astre qu'on approche ; trois profondeurs (carte, lieu en orbite, feuille du bas) ; une seule action en or ; les marchandises par leur marque (`GoodsMark`).
