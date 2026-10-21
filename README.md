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
pnpm --filter @comptoirs/web build && pnpm --filter @comptoirs/web e2e  # la première session à 390×844 et 320×568
SERVER_LOG=server.log pnpm --filter @comptoirs/web e2e:tutorial  # le tutoriel jusqu'à la première livraison
```

Le test de mise en page (`apps/web/e2e/layout.mjs`, lancé par le CI après le build) démarre lui-même le serveur sur une base PGlite en mémoire qui sert l'application construite, son horloge partie un lundi matin à Paris (la trêve de la Terraferme en cours) et ses mules rapides ; il l'arrête toujours en sortant. Il joue la première session sur deux téléphones, 390×844 et 320×568 : connexion, nom, tout le guide de Lorenzo joué jusqu'à « Bravo » (objectif 6/6, récompense du Livre de compte encaissée : produire, récolter, livrer, le Rialto, le Livre de compte), une transformation lancée au moulin, la Terraferme pendant la trêve (note « Trêve » vérifiée), puis une semaine en équipes avec Milan contre le joueur et sa clôture (la vue de la semaine réécrite au passage : chaque ligne de la plaque vérifiée), les Avis. Après chaque étape, il échoue (`apps/web/e2e/assert.mjs`) si la page défile de côté, si deux blocs du HUD (`data-hud`) se recouvrent de plus de 2 px, si le HUD passe sur un nom ou un médaillon de la carte (`data-map-label`), si une cible tactile du HUD fait moins de 44 px, si la ligne d'identité est coupée ou le nom réduit à moins de dix lettres, si l'anneau de Lorenzo n'est pas posé sur ce qu'un doigt touche sous son centre (vérifié avant chaque toucher), ou si une pièce des effets reste à l'écran. Les captures vont dans `apps/web/e2e-shots` (artefact du CI en cas d'échec) ; `REPORT=1` liste tous les défauts sans s'arrêter au premier, `SIZES=320x568` ne joue qu'un format, `REPEAT=n` rejoue la session n fois, chacune sur un serveur neuf, et compte celles sans défaut (mesure de stabilité consignée dans `docs/e2e.md`). Les parcours suivants (tiroir, porte Affaires, code à 6 chiffres) s'ajoutent à ce script, pas dans un second.

Le test du tutoriel (`apps/web/e2e/tutorial.mjs`, à la main) tourne contre `pnpm dev` dont la sortie est enregistrée dans `server.log` (il y lit le lien de connexion). Il touche ce que Lorenzo entoure et échoue si la bulle cache sa cible ou si le guide ne montre plus rien. `CHROMIUM` donne le navigateur (sinon celui de Playwright), `SHOTS` un dossier où garder une capture par étape. À lancer après tout changement du guide, des feuilles ou du panneau.

Un scénario (exemple : `apps/simulator/scenarios/high-tax.json`) est un fichier JSON qui remplace des clés des paramètres de Venise 1450 (`packages/engine/src/themes/venice1450.settings.ts`), par exemple `{ "marketTaxBps": 500 }`.
