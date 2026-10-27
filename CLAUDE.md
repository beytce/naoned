# Fondaco (ex-Comptoirs)

Jeu de commerce multijoueur 2D de niche, web/PWA (PC + mobile). Cadrage complet : docs/CADRAGE.md. Nom de code du dépôt : naoned.

## Stack
- Monorepo pnpm : apps/web (React + Vite + Tailwind, PWA), apps/server (Node + Fastify), apps/simulator (bots en mémoire, sortie CSV), packages/engine (logique pure en TypeScript).
- PostgreSQL via Drizzle ORM, migrations versionnées.
- Tests : Vitest. Temps réel : WebSocket.
- Commandes : `pnpm dev`, `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm sim` (simulation de saison, rapport dans apps/simulator/out/report.md).
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
- Avantages payants (Pass Négociant) légers, plafonnés et mesurés : jamais de ducats, de ressources, de vitesse de production ni de file plus longue ; utiles seulement à un joueur actif ; tous gagnables au classement ; à activité égale, écart de patrimoine ≤ 5 % vérifié par `pnpm sim --pass 0.2`, et un gratuit assidu devant un abonné occasionnel.
- Saisons = mois civils (heure de Paris) : `worlds.ends_at` fait foi, `settings.seasonDays` n'est que le mois nominal du simulateur.

## Façon de travailler
- Commencer chaque tâche en mode plan, attendre validation avant de coder.
- Écrire les tests avant le code pour packages/engine. Les tests du moteur utilisent la fixture figée test/fixture.ts, jamais les paramètres de Venise.
- Tout changement d'équilibrage se valide avec `pnpm sim` (toutes les graines conformes) et se documente dans docs/calibration.md.
- Petits commits, un par fonctionnalité.
- Hors périmètre MVP : noter dans IDEAS.md, ne pas coder.
- Gel des mécaniques levé le 20 octobre 2026 par le porteur (conception pure, pas encore de joueurs) pour le lot de recommandations de docs/recommandations-2026-10-20.md et la Terraferme proche d'OpenFront (docs/plan-terraferme.md) ; hors de ce lot, une nouvelle mécanique va toujours dans IDEAS.md.
- Gel levé aussi le 27 octobre 2026 pour les douze propositions de docs/audit-retention-2026-10-27.md (plafonds d'écart en cours de saison levés, l'égalité se garde au départ du mois). Pour reprendre ce chantier, lire d'abord docs/plan-rupture.md (état, étape suivante) et le tenir à jour à chaque commit.
- Règles stables pendant une saison (dès qu'il y a des joueurs) : un changement de règle prend effet au changement de mois et s'écrit dans les notes de saison (`fr.game.seasonNotes`, au pied de l'Aide).
- Langue du code : anglais. Langue de l'interface : français (i18n prévu).
- Direction artistique « Lagune » (décision du porteur, 25 octobre 2026) : tout nouvel écran ou élément la suit (docs/design.md, § Direction Lagune ; maquettes de chaque page : docs/propositions-design-2026-10-25.md). Un lieu est un astre qu'on approche ; trois profondeurs (carte, lieu en orbite, feuille du bas) ; une seule action en or ; les marchandises par leur marque (`GoodsMark`).
