# Fondaco

*(anciennement Comptoirs)*

Jeu de commerce multijoueur 2D (web/PWA, PC et mobile), en saisons d'un mois civil (du 1er au dernier jour du mois, heure de Paris). Nom de code du dépôt : `naoned`.

- Cadrage : [docs/CADRAGE.md](docs/CADRAGE.md)
- Calibrage de l'économie : [docs/calibration.md](docs/calibration.md)
- Déploiement : [docs/deploiement.md](docs/deploiement.md)
- Règles de travail : [CLAUDE.md](CLAUDE.md) · Idées hors MVP : [IDEAS.md](IDEAS.md)

## Contenu

| Dossier | Rôle |
| --- | --- |
| `packages/engine` | Moteur de jeu pur (production, marché, PNJ, villes, chantiers, grand livre, invariants), sans accès base |
| `apps/simulator` | Simulateur : des bots jouent une saison avec le même moteur ; rapport automatique sur les cibles du cadrage |
| `apps/server` | API Fastify : connexion par lien magique, sessions, comptes ; PostgreSQL via Drizzle (migrations dans `apps/server/drizzle`) |
| `apps/web` | Application React + Vite + Tailwind, installable (PWA) |

## Commandes

Prérequis : Node 22 et pnpm 10.

```sh
pnpm install
pnpm dev         # serveur :3000 + web :5173 ; le lien de connexion s'affiche dans le terminal
pnpm test        # tests du moteur, du simulateur, du serveur et du web
pnpm typecheck
pnpm lint
pnpm sim         # 5 graines × 30 jours ; rapport dans apps/simulator/out/report.md
pnpm sim --players 40 --live   # le petit monde de la bêta : 40 maisons PNJ
pnpm sim --seeds 1 --scenario scenarios/high-tax.json   # chemin relatif à apps/simulator
```

Un scénario (exemple : `apps/simulator/scenarios/high-tax.json`) est un fichier JSON qui remplace des clés des paramètres de Venise 1450 (`packages/engine/src/themes/venice1450.settings.ts`), par exemple `{ "marketTaxBps": 500 }`.
