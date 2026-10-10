# Comptoirs

Jeu de commerce multijoueur 2D de niche, web/PWA (PC + mobile). Cadrage complet : docs/CADRAGE.md. Nom de code du dépôt : naoned.

## Stack
- Monorepo pnpm : apps/web (React + Vite + Tailwind, PWA), apps/server (Node + Fastify), apps/simulator (bots en mémoire, sortie CSV), packages/engine (logique pure en TypeScript).
- PostgreSQL via Drizzle ORM, migrations versionnées.
- Tests : Vitest. Temps réel : WebSocket.
- Commandes : `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm sim` (simulation de saison, rapport dans apps/simulator/out/report.md).

## Règles non négociables
- Montants en entiers (bigint, en deniers), taux en points de base. Jamais de float.
- Tout mouvement de monnaie passe par ledger_entries (partie double) ; tout mouvement de stock passe par stock_movements.
- Toute table de la couche monde porte world_id ; le référentiel (resources, recipes) porte theme_id.
- La logique de jeu (production, marché, PNJ, villes, invariants) vit dans packages/engine, sans accès base : fonctions pures testées, utilisées à l'identique par le serveur et le simulateur.
- Production calculée paresseusement à la lecture, pas par le tick.
- Toute opération de marché = une transaction SQL unique, sérialisée par un verrou transactionnel par (world_id, resource).
- Paramètres d'équilibrage dans worlds.settings (JSON), jamais en dur.
- Aucun avantage payant ne modifie production, trésorerie, file de production ou nombre d'ordres.

## Façon de travailler
- Commencer chaque tâche en mode plan, attendre validation avant de coder.
- Écrire les tests avant le code pour packages/engine. Les tests du moteur utilisent la fixture figée test/fixture.ts, jamais les paramètres de Venise.
- Tout changement d'équilibrage se valide avec `pnpm sim` (toutes les graines conformes) et se documente dans docs/calibration.md.
- Petits commits, un par fonctionnalité.
- Hors périmètre MVP : noter dans IDEAS.md, ne pas coder.
- Langue du code : anglais. Langue de l'interface : français (i18n prévu).
